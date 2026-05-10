'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'OpenGolfAPI <hello@opengolfapi.org>';

async function getClientIp(): Promise<string> {
  // Vercel sets x-forwarded-for; the first hop is the real client IP.
  // x-real-ip is also forwarded by Vercel.
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return h.get('x-real-ip') ?? 'unknown';
}

export async function issueApiKey(email: string, name: string): Promise<{ key?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return { error: 'Please enter a valid email address.' };
  }

  // Per-IP throttle: max 3 signups/hour. Service-role only RPC.
  const ip = await getClientIp();
  const { data: limited, error: rlError } = await adminSupabase.rpc('rpc_check_signup_rate_limit', { p_ip: ip });
  if (rlError) {
    console.error('rate limit check failed', rlError.message);
    // Fail open on rate limit RPC error — better to allow a legit signup than block all signups.
  } else if (limited === true) {
    return { error: 'Too many signups from your network. Please try again in an hour, or email hello@opengolfapi.org.' };
  }

  const { data, error } = await adminSupabase.rpc('rpc_issue_api_key', {
    p_email: cleanEmail,
    p_name: name?.trim() || null,
  });

  if (error) return { error: `Could not issue key: ${error.message}` };

  const result = data as { success?: boolean; key?: string; error?: string };
  if (result.error) return { error: result.error };
  if (!result.key) return { error: 'Key generation failed unexpectedly.' };

  // Fire-and-forget email. If Resend fails, the user already has the key shown on screen.
  if (RESEND_API_KEY) {
    void sendKeyEmail(cleanEmail, result.key, name).catch((e) => {
      console.error('api-key email send failed', { err: e instanceof Error ? e.message : String(e) });
    });
  }

  return { key: result.key };
}

async function sendKeyEmail(email: string, key: string, name?: string): Promise<void> {
  const greeting = name ? `Hi ${name.split(' ')[0]},` : 'Hi,';
  const html = `<!DOCTYPE html>
<html><body style="font-family: -apple-system, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1F2421;">
  <p>${greeting}</p>
  <p>Your OpenGolfAPI key is ready. Save this somewhere — we don&apos;t store the original, so we can&apos;t show it again.</p>
  <pre style="background: #1F2421; color: #F5F1E8; padding: 16px; border-radius: 6px; font-size: 13px; overflow-x: auto;">${key}</pre>
  <p><strong>Daily limit:</strong> 10,000 requests.</p>
  <p><strong>Usage:</strong></p>
  <pre style="background: #ECE5D2; color: #1F2421; padding: 16px; border-radius: 6px; font-size: 12px; overflow-x: auto;">curl -H "Authorization: Bearer ${key}" \\
  "https://api.opengolfapi.org/v1/courses?state=CA"</pre>
  <p>We&apos;ll email you only when there&apos;s a breaking change to the API. No marketing.</p>
  <p>If you didn&apos;t request this key, ignore this message — and let us know at hello@opengolfapi.org.</p>
  <p style="color: #6B7470; font-size: 12px; margin-top: 32px;">— OpenGolfAPI · opengolfapi.org</p>
</body></html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your OpenGolfAPI key',
      html,
    }),
  });
}
