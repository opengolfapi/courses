import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminSession, ADMIN_COOKIE_NAME } from '@/app/admin/_lib/admin-session';

// Gate /admin/* at the edge BEFORE Server Components render. Without this,
// Server Components rendering with the service-role client would leak member
// data, audit logs, and pending edits to anyone who hits the URL.
//
// /admin/login and /admin/callback are explicitly public (they handle auth).

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname === '/admin/login' || pathname === '/admin/callback') {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const email = await verifyAdminSession(cookie);
  if (!email) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
