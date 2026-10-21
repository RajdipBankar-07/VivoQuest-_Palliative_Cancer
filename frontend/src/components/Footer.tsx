'use client';

import React from 'react';
import Link from 'next/link';
import {
  Activity,
  Shield,
  ArrowRight,
  ChevronRight,
  Compass,
  Stethoscope,
  HeartHandshake,
  Building2,
  AlertCircle
} from 'lucide-react';
import { siteConfig } from '@/config/siteConfig';

// Recognizable Brand SVG Icons
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12.031 2C6.496 2 2 6.48 2 12.01c0 1.99.584 3.864 1.602 5.452L2.05 22.05l4.755-1.516A9.97 9.97 0 0 0 12.03 22c5.534 0 10.03-4.48 10.03-10.01C22.062 6.48 17.565 2 12.031 2zm5.836 14.198c-.244.686-1.42 1.31-1.956 1.39-.517.078-1.18.11-1.916-.126-.447-.144-1.023-.335-1.764-.658-3.109-1.348-5.137-4.475-5.293-4.683-.156-.208-1.266-1.684-1.266-3.212 0-1.528.8-2.28 1.085-2.593.285-.313.623-.391.831-.391.208 0 .416.002.598.012.193.01.452-.073.707.54.265.637.904 2.203.984 2.364.08.161.134.35.026.564-.108.214-.162.348-.32.535-.157.187-.33.417-.472.56-.157.157-.32.327-.138.64.182.313.808 1.332 1.734 2.156 1.192 1.06 2.196 1.388 2.508 1.544.312.156.495.138.677-.07.182-.208.78-.908.988-1.22.208-.312.416-.26.694-.156.278.104 1.763.832 2.066.984.303.152.505.228.578.354.074.126.074.728-.17 1.414z" />
  </svg>
);

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedInIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  // Social media channels definitions
  const socialChannels = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      url: siteConfig.social.whatsapp,
      icon: <WhatsAppIcon />,
      hoverColor: 'hover:text-[#25D366] hover:bg-[#25D366]/15 hover:border-[#25D366]/30',
      ariaLabel: 'Official WhatsApp',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      url: siteConfig.social.instagram,
      icon: <InstagramIcon />,
      hoverColor: 'hover:text-[#E4405F] hover:bg-[#E4405F]/15 hover:border-[#E4405F]/30',
      ariaLabel: 'Official Instagram',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      url: siteConfig.social.facebook,
      icon: <FacebookIcon />,
      hoverColor: 'hover:text-[#1877F2] hover:bg-[#1877F2]/15 hover:border-[#1877F2]/30',
      ariaLabel: 'Official Facebook',
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      url: siteConfig.social.linkedin,
      icon: <LinkedInIcon />,
      hoverColor: 'hover:text-[#0A66C2] hover:bg-[#0A66C2]/15 hover:border-[#0A66C2]/30',
      ariaLabel: 'Official LinkedIn',
    },
  ];

  const activeSocials = socialChannels.filter((s) => Boolean(s.url && s.url.trim()));

  return (
    <footer
      className="w-full bg-[#17324D] text-white pt-10 pb-6 border-t border-white/10"
      role="contentinfo"
      aria-label="VivoQuest Site Footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main 5-Column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-6 lg:gap-6 pb-8 border-b border-white/10">
          
          {/* Column 1: Brand & Independent Marketplace (lg:col-span-4) */}
          <div className="col-span-2 md:col-span-4 lg:col-span-4 flex flex-col pr-0 lg:pr-6">
            <Link
              href="/"
              className="flex items-center gap-2 mb-2.5 group inline-flex w-fit focus-visible:outline-2 focus-visible:outline-[#1976D2] rounded-lg"
              aria-label="VivoQuest Homepage"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1976D2] flex items-center justify-center text-white shadow-primary transition-transform duration-200 group-hover:scale-105">
                <Activity size={18} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-white tracking-tight leading-none">
                  Vivo<span className="text-[#2E9E6F]">Quest</span>
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-300 mt-0.5">
                  {siteConfig.brand.tagline}
                </span>
              </div>
            </Link>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {siteConfig.brand.description}
            </p>

            {/* Compact Disclaimer Card */}
            <div className="p-2.5 rounded-xl bg-[#0E1F30]/75 border border-white/10 text-[11px] text-slate-300 leading-snug">
              <div className="flex items-start gap-2">
                <Shield size={14} className="shrink-0 text-[#2E9E6F] mt-0.5" />
                <span>
                  <strong className="text-white font-semibold">Independent Healthcare Marketplace:</strong> Technology platform connecting patients with independent licensed clinicians &amp; DME depots. Not affiliated with government health ministries.
                </span>
              </div>
            </div>

            {/* Social Media Row / Status */}
            <div className="mt-3 flex items-center gap-2">
              {activeSocials.length > 0 ? (
                activeSocials.map((social) => (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 transition-all duration-150 ${social.hoverColor}`}
                    aria-label={social.ariaLabel}
                  >
                    {social.icon}
                  </a>
                ))
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E9E6F] animate-pulse" />
                  <span>Social channels pending verification •</span>
                  <Link href="/contact" className="text-[#2E9E6F] hover:underline font-medium">
                    Contact Desk
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Explore (lg:col-span-2) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Compass size={13} className="text-[#1976D2]" />
              <span>Explore</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {siteConfig.links.explore.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 hover:text-white transition-colors duration-150"
                  >
                    <ChevronRight size={11} className="text-white/30 group-hover:text-[#2E9E6F] group-hover:translate-x-0.5 transition-all" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Services (lg:col-span-2) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Stethoscope size={13} className="text-[#2E9E6F]" />
              <span>Services</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {siteConfig.links.services.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 hover:text-white transition-colors duration-150"
                  >
                    <ChevronRight size={11} className="text-white/30 group-hover:text-[#2E9E6F] group-hover:translate-x-0.5 transition-all" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Join Network (lg:col-span-2) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <HeartHandshake size={13} className="text-[#1976D2]" />
              <span>Join Network</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {siteConfig.links.joinNetwork.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 hover:text-white transition-colors duration-150"
                  >
                    <ChevronRight size={11} className="text-white/30 group-hover:text-[#2E9E6F] group-hover:translate-x-0.5 transition-all" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: Visit & Contact (lg:col-span-2) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#2E9E6F]" />
                <span>Visit Us</span>
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {siteConfig.links.visit.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1 hover:text-white transition-colors duration-150"
                    >
                      <ChevronRight size={11} className="text-white/30 group-hover:text-[#2E9E6F] group-hover:translate-x-0.5 transition-all" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/contact"
              className="mt-3.5 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white font-semibold transition-all duration-150 text-[11px] shadow-sm w-fit"
            >
              <span>Contact Operations Desk</span>
              <ArrowRight size={11} />
            </Link>
          </div>

        </div>

        {/* Bottom Bar: Single Clean Compact Row */}
        <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1">
            <span>&copy; {currentYear} {siteConfig.brand.legalName}. All rights reserved.</span>
            <span className="hidden sm:inline text-white/20">•</span>
            <span className="text-amber-400/90 font-medium inline-flex items-center gap-1">
              <AlertCircle size={12} className="shrink-0" />
              Emergency: Dial 112 / 108
            </span>
          </div>

          <nav aria-label="Legal & Trust Links" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {siteConfig.links.legal.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="hover:text-white transition-colors duration-150"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

      </div>
    </footer>
  );
};
