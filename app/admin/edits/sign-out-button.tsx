'use client';

import { supabase } from '@/lib/supabase';
import { revokeAdminSession } from '../_lib/grant-admin-session';

export function SignOutButton() {
  async function handleSignOut() {
    await Promise.all([
      supabase.auth.signOut(),
      revokeAdminSession(),
    ]);
    window.location.href = '/admin/login';
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-1 rounded-full transition-colors"
    >
      Sign out
    </button>
  );
}
