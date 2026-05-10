'use server';

import { cookies } from 'next/headers';
import { requireAdmin } from './require-admin';
import { signAdminSession, ADMIN_COOKIE_NAME } from './admin-session';

// Called from /admin/callback after Supabase magic-link sign-in completes.
// Validates the access_token, asserts admin email, and sets the signed cookie
// that middleware reads to gate /admin/* SSR.
export async function grantAdminSession(accessToken: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const email = await requireAdmin(accessToken);
    const { value, maxAge } = await signAdminSession(email);
    const jar = await cookies();
    jar.set(ADMIN_COOKIE_NAME, value, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function revokeAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE_NAME);
}
