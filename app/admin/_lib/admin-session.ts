// Signed-cookie admin session, used by Next.js middleware to gate /admin/*
// routes BEFORE Server Components render (and leak service-role data).
//
// Why: Supabase JS stores session in localStorage by default. Middleware (Edge
// Runtime) can't read localStorage. So we mint a separate signed cookie after
// validating the Supabase access token + admin allowlist. The cookie is purely
// a tripwire — every Server Action still independently validates the JWT.

import 'server-only';

const TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('ADMIN_SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY fallback) is not set');
  return s;
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64url(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function signAdminSession(email: string): Promise<{ value: string; maxAge: number }> {
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${encodeURIComponent(email)}|${expiresAt}`;
  const sig = await hmac(getSecret(), payload);
  return { value: `${payload}|${sig}`, maxAge: TTL_SECONDS };
}

export async function verifyAdminSession(cookie: string | undefined): Promise<string | null> {
  if (!cookie) return null;
  const parts = cookie.split('|');
  if (parts.length !== 3) return null;
  const [emailEnc, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const expectedSig = await hmac(getSecret(), `${emailEnc}|${expStr}`);
  if (!timingSafeEqual(sig, expectedSig)) return null;
  return decodeURIComponent(emailEnc);
}

export const ADMIN_COOKIE_NAME = 'og_admin';
