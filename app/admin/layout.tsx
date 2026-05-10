// Server-side admin gate runs in middleware.ts. This layout is now a passthrough
// — it used to do client-side auth, but client-side auth is not auth (April 2026
// hostile-CTO finding). Middleware checks the signed `og_admin` cookie before any
// Server Component renders, so the layout has nothing to enforce.

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
