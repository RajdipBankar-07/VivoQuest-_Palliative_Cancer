'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Activity, ChevronRight, User, HeartHandshake, ShoppingBag } from 'lucide-react';
import { Button } from './Button';
import { useCart } from '@/context/CartContext';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { totalItemCount, openCart } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Medical Store', href: '/products' },
    { label: 'My Orders', href: '/orders' },
    { label: 'Find a Doctor', href: '/doctors' },
    { label: 'Appointments', href: '/appointments' },
    { label: 'Healthcare Services', href: '/services' },
    { label: 'AI Coordination', href: '/clinical' },
    { label: 'Doctor Portal', href: '/doctor/dashboard' },
    { label: 'Hospital Portal', href: '/hospital/dashboard' },
    { label: 'Admin Portal', href: '/admin/dashboard' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/#')) return false;
    return pathname.startsWith(href);
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

          {/* Desktop Navigation Links */}
          <div className="hidden xl:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    active
                      ? 'text-primary font-semibold bg-primary-light'
                      : 'text-navy/80 hover:text-primary hover:bg-background'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
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

            {/* Tablet Menu Toggle (md to xl screens) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="xl:hidden p-2 rounded-xl text-navy hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary ml-1"
              aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
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

            <Link
              href="/sign-in"
              className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary-light"
            >
              Sign In
            </Link>
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

        {/* Mobile & Tablet Navigation Drawer */}
        {isOpen && (
          <div className="xl:hidden w-full bg-white border-b border-border px-5 pt-3 pb-6 animate-in slide-in-from-top-2 duration-200 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col space-y-1.5">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary-light text-primary font-semibold'
                        : 'text-navy hover:bg-background'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-border flex flex-col gap-2.5">
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
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
