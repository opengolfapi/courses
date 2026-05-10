'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../_lib/require-admin';

export type ApiKeyTier = 'keyed' | 'backer' | 'sponsor' | 'major_sponsor' | 'unlimited';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function bumpTier(
  keyId: string,
  email: string,
  currentTier: ApiKeyTier,
  newTier: ApiKeyTier,
  accessToken: string,
) {
  try {
    const adminEmail = await requireAdmin(accessToken);
    if (currentTier === newTier) {
      return { ok: false as const, error: 'Tier unchanged' };
    }
    const { error } = await adminSupabase.rpc('rpc_bump_api_key_tier', {
      p_email: email,
      p_tier: newTier,
      p_actor: `admin:${adminEmail}`,
      p_reason: 'manual admin bump',
    });
    if (error) throw new Error(`RPC: ${error.message}`);
    revalidatePath('/admin/members');
    return { ok: true as const };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('bumpTier FAILED', { keyId, email, currentTier, newTier, detail });
    return { ok: false as const, error: detail };
  }
}

export async function issueKey(
  email: string,
  name: string,
  tier: ApiKeyTier,
  accessToken: string,
): Promise<{ ok: true; key: string; prefix: string } | { ok: false; error: string }> {
  try {
    const adminEmail = await requireAdmin(accessToken);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      return { ok: false, error: 'Invalid email' };
    }

    const { data, error } = await adminSupabase.rpc('rpc_issue_api_key', {
      p_email: cleanEmail,
      p_name: name?.trim() || null,
    });
    if (error) throw new Error(`Issue RPC: ${error.message}`);

    const result = data as { success?: boolean; key?: string; prefix?: string; error?: string };
    if (result.error) return { ok: false, error: result.error };
    if (!result.key || !result.prefix) return { ok: false, error: 'Key generation failed' };

    if (tier !== 'keyed') {
      const { error: bumpError } = await adminSupabase.rpc('rpc_bump_api_key_tier', {
        p_email: cleanEmail,
        p_tier: tier,
        p_actor: `admin:${adminEmail}`,
        p_reason: 'admin issued key with elevated tier',
      });
      if (bumpError) throw new Error(`Bump RPC: ${bumpError.message}`);
    }

    revalidatePath('/admin/members');
    revalidatePath('/admin/dashboard');
    return { ok: true, key: result.key, prefix: result.prefix };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('issueKey FAILED', { email, tier, detail });
    return { ok: false, error: detail };
  }
}

export async function revokeKey(
  keyId: string,
  email: string,
  accessToken: string,
  reason: string,
) {
  try {
    const adminEmail = await requireAdmin(accessToken);
    const trimmed = (reason ?? '').trim();
    if (!trimmed) {
      return { ok: false as const, error: 'Revocation reason is required' };
    }
    const { error } = await adminSupabase.rpc('rpc_revoke_api_key', {
      p_key_id: keyId,
      p_actor: `admin:${adminEmail}`,
      p_reason: trimmed,
    });
    if (error) throw new Error(`RPC: ${error.message}`);
    revalidatePath('/admin/members');
    return { ok: true as const };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('revokeKey FAILED', { keyId, email, detail });
    return { ok: false as const, error: detail };
  }
}
