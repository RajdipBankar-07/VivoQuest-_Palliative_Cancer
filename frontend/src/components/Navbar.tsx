'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Activity, ChevronRight, User, HeartHandshake, ShoppingBag } from 'lucide-react';
import { Button } from './Button';
import { useCart } from '@/context/CartContext';
import { authApi } from '@/lib/api';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasAdminSession, setHasAdminSession] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const pathname = usePathname();
  const { totalItemCount, openCart } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update authentication and admin state dynamically
  useEffect(() => {
    const updateAuthStatus = () => {
      const user = authApi.getStoredUser();
      const token = authApi.getToken();
      const isValid = Boolean(token && !authApi.isTokenExpired(token));
      setCurrentUser(isValid ? user : null);
      const isValidAdmin = Boolean(
        isValid &&
        user &&
        ['admin', 'super_admin'].includes(user.role?.toLowerCase())
      );
      setHasAdminSession(isValidAdmin);
    };

    updateAuthStatus();
    window.addEventListener('storage', updateAuthStatus);
    window.addEventListener('vivo_auth_change', updateAuthStatus);
    return () => {
      window.removeEventListener('storage', updateAuthStatus);
      window.removeEventListener('vivo_auth_change', updateAuthStatus);
    };
  }, [pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Medical Equipment', href: '/products' },
    { label: 'Subscriptions', href: '/subscriptions' },
    {
      label: 'Operations Portal',
      href: '/operations/dashboard',
    },
    {
      label: 'Admin Portal',
      href: hasAdminSession ? '/admin/dashboard' : '/admin/login?returnUrl=/admin/dashboard',
    },
  ];

  const isActive = (href: string) => {
    const baseHref = href.split('?')[0];
    if (baseHref === '/') return pathname === '/';
    if (baseHref.startsWith('/#')) return false;
    if (baseHref.startsWith('/operations')) return pathname.startsWith('/operations');
    if (baseHref.startsWith('/admin')) return pathname.startsWith('/admin');
    if (baseHref === '/subscriptions') return pathname.startsWith('/subscriptions') || pathname.startsWith('/caregiver-plans');
    return pathname.startsWith(baseHref);
  };

  return (
    <header className="sticky top-0 z-50 w-full transition-all duration-200">
      {/* Main Navigation Bar */}
      <nav
        className={`w-full transition-all duration-200 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-border py-3'
            : 'bg-white border-b border-border py-4'
        }`}
        aria-label="Main Navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Logo / Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-2 focus-visible:outline-primary rounded-lg"
            aria-label="VivoQuest Homepage"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white shadow-primary transition-transform duration-200 group-hover:scale-105">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-navy tracking-tight leading-none">
                Vivo<span className="text-secondary">Quest</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">
                Care at Kitchen Table
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links — Exactly 4 links, guaranteed single line on desktop/tablets */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 whitespace-nowrap ${
                    active
                      ? 'text-primary font-bold bg-primary-light'
                      : 'text-navy/80 hover:text-primary hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop Right Actions (>= md) */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {/* Cart Button */}
            <button
              onClick={openCart}
              className="relative p-2 rounded-xl text-navy/80 hover:text-primary hover:bg-slate-100 transition-colors flex items-center justify-center"
              aria-label="Open medical shopping cart"
            >
              <ShoppingBag size={20} />
              {totalItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in">
                  {totalItemCount}
                </span>
              )}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  href={
                    ['operations', 'operations_manager', 'product_manager'].includes(currentUser.role?.toLowerCase())
                      ? '/operations/dashboard'
                      : ['admin', 'super_admin'].includes(currentUser.role?.toLowerCase())
                      ? '/admin/dashboard'
                      : '/orders'
                  }
                  title="My Operations Account & Portal"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-navy hover:bg-slate-200/80 transition-colors border border-border"
                >
                  <User size={14} className="text-primary" />
                  <span className="max-w-[120px] truncate">{currentUser.fullName || 'My Account'}</span>
                </Link>
                <button
                  onClick={() => {
                    authApi.logout();
                    window.location.href = '/';
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors px-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-navy hover:text-primary transition-colors"
                >
                  <User size={16} />
                  <span>Sign In</span>
                </Link>

                <Button
                  href="/register"
                  variant="primary"
                  size="md"
                  rightIcon={<ChevronRight size={16} />}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Right Actions (< md) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={openCart}
              className="relative p-2 rounded-lg text-navy hover:bg-slate-100 transition-colors flex items-center justify-center"
              aria-label="Open medical shopping cart"
            >
              <ShoppingBag size={20} />
              {totalItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-white font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {totalItemCount}
                </span>
              )}
            </button>

            {currentUser ? (
              <Link
                href={
                  ['admin', 'super_admin'].includes(currentUser.role?.toLowerCase())
                    ? '/admin/dashboard'
                    : '/orders'
                }
                title="My Orders & Patient Account"
                className="text-xs font-semibold text-primary px-2.5 py-1.5 rounded-lg bg-primary-light truncate max-w-[100px]"
              >
                {currentUser.fullName ? currentUser.fullName.split(' ')[0] : 'Account'}
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary-light"
              >
                Sign In
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-navy hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Navigation Drawer (< md) */}
        {isOpen && (
          <div className="md:hidden w-full bg-white border-b border-border px-5 pt-3 pb-6 animate-in slide-in-from-top-2 duration-200 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col space-y-1.5">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-primary-light text-primary font-bold'
                        : 'text-navy hover:bg-background'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-border flex flex-col gap-2.5">
              {currentUser ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-border flex items-center justify-between">
                  <Link
                    href={
                      ['operations', 'operations_manager', 'product_manager'].includes(currentUser.role?.toLowerCase())
                        ? '/operations/dashboard'
                        : ['admin', 'super_admin'].includes(currentUser.role?.toLowerCase())
                        ? '/admin/dashboard'
                        : '/orders'
                    }
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 flex-1 mr-2"
                  >
                    <User size={16} className="text-primary flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-navy truncate">
                        {currentUser.fullName || 'My Account'}
                      </span>
                      {!['admin', 'super_admin'].includes(currentUser.role?.toLowerCase()) && (
                        <span className="text-[10px] font-semibold text-primary">
                          My Orders &amp; Tracking &rarr;
                        </span>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      authApi.logout();
                      window.location.href = '/';
                    }}
                    className="text-xs font-bold text-red-600 hover:underline px-2 py-1 flex-shrink-0"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <>
                  <Button
                    href="/register"
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => setIsOpen(false)}
                  >
                    Get Started
                  </Button>
                  <Button
                    href="/professionals"
                    variant="outline"
                    size="md"
                    className="w-full justify-center"
                    leftIcon={<HeartHandshake size={16} className="text-secondary" />}
                    onClick={() => setIsOpen(false)}
                  >
                    Join as Healthcare Professional
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
