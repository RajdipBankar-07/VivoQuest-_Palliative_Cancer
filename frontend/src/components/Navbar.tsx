'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Activity, ChevronRight, User, HeartHandshake } from 'lucide-react';
import { Button } from './Button';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

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
    { label: 'Healthcare Services', href: '/services' },
    { label: 'AI Coordination', href: '/clinical' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'For Professionals', href: '/professionals' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/#')) return false;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full transition-all duration-200">
      {/* Top Trust Notice Banner */}
      <div className="bg-navy text-white text-xs py-1.5 px-4 sm:px-8 border-b border-navy-light/40 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2 text-white/90 truncate">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-medium">
              India&apos;s AI-Enabled Home Healthcare &amp; Preventive Diagnostics Marketplace
            </span>
            <span className="hidden md:inline text-white/40">•</span>
            <span className="hidden md:inline text-white/75">
              Verified Independent Specialists &amp; DME Depots
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-xs font-medium text-white/80">
            <Link href="/about#safety" className="hover:text-white transition-colors">
              Patient Safety Guardrails
            </Link>
            <span className="text-white/30">|</span>
            <span className="text-secondary-light font-semibold">
              Emergency: Dial 112 / 108
            </span>
          </div>
        </div>
      </div>

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
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-navy hover:text-primary transition-colors"
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
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
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

        {/* Mobile Navigation Drawer */}
        {isOpen && (
          <div className="md:hidden w-full bg-white border-b border-border px-5 pt-3 pb-6 animate-in slide-in-from-top-2 duration-200 shadow-xl">
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
