import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip middleware for static assets, public images, and internal Next.js requests
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Check for session tokens across standard Supabase cookie names
  const hasDirectCookie = Boolean(
    request.cookies.get('sb-access-token')?.value ||
      request.cookies.get('app_session_token')?.value ||
      request.cookies.get('supabase-auth-token')?.value
  );

  const hasSbChunkedCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));

  const isAuthenticated = hasDirectCookie || hasSbChunkedCookie;

  // 3. Admin Protected Routes
  if (pathname.startsWith('/admin')) {
    const isPublicAdminRoute = pathname === '/admin/login' || pathname === '/admin/unauthorized';

    if (!isPublicAdminRoute && !isAuthenticated) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // 4. Customer Account Protected Routes
  if (pathname.startsWith('/account')) {
    if (!isAuthenticated) {
      const authUrl = new URL('/auth', request.url);
      authUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(authUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*'],
};
