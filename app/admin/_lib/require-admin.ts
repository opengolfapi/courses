// Shared admin auth helper. Verifies the access token (from the client's
// Supabase session) server-side and asserts the email is whitelisted.
//
// Returns the verified admin email so callers can attribute mutations
// (e.g. as p_actor on RPCs).

import { createClient } from '@supabase/supabase-js';
import { isAdminEmail } from './admin-emails';

export async function requireAdmin(token: string | undefined): Promise<string> {
  if (!token) throw new Error('Not authenticated (no token from client)');
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error } = await anonClient.auth.getUser(token);
  if (error) throw new Error(`Auth check failed: ${error.message}`);
  if (!user) throw new Error('Not authenticated (getUser returned no user)');
  const email = (user.email || '').toLowerCase();
  if (!isAdminEmail(email)) {
    throw new Error(`Not authorized: ${email}`);
  }
  return email;
}
