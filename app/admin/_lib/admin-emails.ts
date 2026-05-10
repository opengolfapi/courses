// Server-only admin allowlist. NEVER import this from a `'use client'` file —
// it would ship in the browser bundle, exposing admin identity (the April 2026
// hostile-CTO audit explicitly flagged this pattern).

import 'server-only';

export const ADMIN_EMAILS: readonly string[] = ['info@geekur.com'];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
