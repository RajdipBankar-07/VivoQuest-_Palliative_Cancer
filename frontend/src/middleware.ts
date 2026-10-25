import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    const payload = JSON.parse(jsonStr);
    if (payload.exp && typeof payload.exp === 'number') {
      return Date.now() >= payload.exp * 1000 - 5000;
    }
    return false;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const rawToken = request.cookies.get('vivo_token')?.value;
  const role = request.cookies.get('vivo_role')?.value;
  const tier = request.cookies.get('vivo_tier')?.value;
  
  const path = request.nextUrl.pathname;

  const isExpired = Boolean(rawToken && isJwtExpired(rawToken));
  const token = rawToken && !isExpired ? rawToken : null;
  const isAdmin = Boolean(token && role && ['admin', 'super_admin', 'SUPER_ADMIN'].includes(role));

  // =====================================================
  // Admin Login Page — PUBLIC (no auth required)
  // Always permit direct access to render login form; never loop-redirect
  // =====================================================
  if (path === '/admin/login') {
    return NextResponse.next();
  }

  // =====================================================
  // Protected paths — require authentication
  // =====================================================
  const protectedPaths = [
    '/dashboard',
    '/corporate-wellness',
    '/creator',
    '/admin',
    '/journey',
    '/vivoai',
    '/community',
    '/reports',
    '/profile',
    '/settings',
    '/onboarding', // Onboarding now requires authentication (completed signup)
  ];

  const isProtected = protectedPaths.some(p => path.startsWith(p));

  if (isProtected && !token) {
    if (path.startsWith('/admin')) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('returnUrl', path);
      if (isExpired) {
        loginUrl.searchParams.set('session', 'expired');
      }
      const response = NextResponse.redirect(loginUrl);
      if (isExpired) {
        response.cookies.delete('vivo_token');
        response.cookies.delete('vivo_role');
      }
      return response;
    }
    // All regular unauthenticated users must login
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // =====================================================
  // Public paths — redirect authenticated users away
  // =====================================================
  if (path.startsWith('/auth/login') || path.startsWith('/auth/signup') || path.startsWith('/auth/forgot-password')) {
    if (token) {
      if (isAdmin) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // =====================================================
  // Role-based gates
  // =====================================================

  // Only admin and super_admin can access /admin (any sub-path)
  if (path.startsWith('/admin')) {
    if (!isAdmin) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('returnUrl', path);
      if (isExpired) {
        loginUrl.searchParams.set('session', 'expired');
      }
      const response = NextResponse.redirect(loginUrl);
      if (isExpired) {
        response.cookies.delete('vivo_token');
        response.cookies.delete('vivo_role');
      }
      return response;
    }
    if (path === '/admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  if (path.startsWith('/corporate-wellness') && role !== 'CORP_ADMIN' && !isAdmin && tier !== 'ENTERPRISE') {
    return NextResponse.redirect(new URL('/subscription', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/corporate-wellness/:path*',
    '/creator/:path*',
    '/admin/:path*',
    '/admin/login',
    '/journey/:path*',
    '/vivoai/:path*',
    '/community/:path*',
    '/reports/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/subscription/:path*',
  ],
};
