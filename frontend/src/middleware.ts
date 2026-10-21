import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('vivo_token')?.value;
  const role = request.cookies.get('vivo_role')?.value;
  const tier = request.cookies.get('vivo_tier')?.value;
  
  const path = request.nextUrl.pathname;

  const isAdmin = Boolean(role && ['admin', 'super_admin', 'SUPER_ADMIN'].includes(role));

  // =====================================================
  // Admin Login Page — PUBLIC (no auth required)
  // =====================================================
  if (path === '/admin/login') {
    // If already authenticated as admin or super_admin, redirect to dashboard
    if (token && isAdmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
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
      return NextResponse.redirect(new URL('/admin/login', request.url));
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
      return NextResponse.redirect(new URL('/admin/login', request.url));
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
