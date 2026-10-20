import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('vivo_token')?.value;
  const role = request.cookies.get('vivo_role')?.value;
  const tier = request.cookies.get('vivo_tier')?.value;
  
  const path = request.nextUrl.pathname;

  // =====================================================
  // Admin Login Page — PUBLIC (no auth required)
  // =====================================================
  if (path === '/admin/login') {
    // If already authenticated as SUPER_ADMIN, redirect to dashboard
    if (token && role === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
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
      if (role === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // =====================================================
  // Role-based gates
  // =====================================================

  // Only SUPER_ADMIN can access /admin (any sub-path)
  if (path.startsWith('/admin') && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }


  if (path.startsWith('/corporate-wellness') && role !== 'CORP_ADMIN' && role !== 'SUPER_ADMIN' && tier !== 'ENTERPRISE') {
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
