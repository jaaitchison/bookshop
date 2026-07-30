import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_SESSION_COOKIE, decodeAuthSession, hasSessionRole } from '@/src/lib/auth-session';

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith('/admin')
    || pathname.startsWith('/studio')
    || pathname.startsWith('/library')
    || pathname.startsWith('/checkout');
}

function getRequiredRole(pathname: string): 'reader' | 'writer' | 'admin' {
  if (pathname.startsWith('/admin')) {
    return 'admin';
  }

  if (pathname.startsWith('/studio')) {
    return 'writer';
  }

  return 'reader';
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  const session = decodeAuthSession(sessionCookie);

  if (!session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const requiredRole = getRequiredRole(pathname);
  if (!hasSessionRole(session, requiredRole)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/account';
    redirectUrl.searchParams.set('denied', requiredRole);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/studio/:path*', '/library/:path*', '/checkout/:path*'],
};
