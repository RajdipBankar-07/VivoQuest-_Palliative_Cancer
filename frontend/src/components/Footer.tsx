import React from 'react';
import Link from 'next/link';
import { Activity, Mail, Phone, MapPin, Shield, Heart, FileText } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-navy text-white pt-16 pb-10 border-t border-navy-light/40" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-navy-light/40">
          
          {/* Column 1: Brand & Compassionate Mission (2 spans on desktop) */}
          <div className="lg:col-span-2 flex flex-col pr-0 lg:pr-6">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group inline-flex w-fit">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-primary">
                <Activity size={20} strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-extrabold text-white tracking-tight">
                Vivo<span className="text-secondary">Quest</span>
              </span>
            </Link>

            <p className="text-sm text-white/75 leading-relaxed mb-6 max-w-md">
              VivoQuest coordinates preventive home diagnostics, qualified ancillary clinical care, and essential medical equipment for patients and families across India. We believe in human dignity, caregiver empowerment, and accessible care right at the kitchen table.
            </p>

            {/* Regulatory Disclaimer */}
            <div className="p-3.5 rounded-xl bg-navy-dark/60 border border-white/10 text-xs text-white/60 leading-normal mb-4">
              <p className="flex items-start gap-2">
                <Shield size={14} className="shrink-0 text-secondary mt-0.5" />
                <span>
                  <strong>Independent Healthcare Marketplace:</strong> VivoQuest is a technology coordination platform connecting patients with independent, licensed specialists and medical depots. Not affiliated with government health ministries.
                </span>
              </p>
            </div>
          </div>

          {/* Column 2: Healthcare Services */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Healthcare Services
            </h3>
            <ul className="space-y-2.5 text-sm text-white/75">
              <li>
                <Link href="/services#diagnostics" className="hover:text-secondary-light transition-colors">
                  Home Diagnostics &amp; Blood Draws
                </Link>
              </li>
              <li>
                <Link href="/services#teleconsultation" className="hover:text-secondary-light transition-colors">
                  Physician Teleconsultation
                </Link>
              </li>
              <li>
                <Link href="/services#physiotherapy" className="hover:text-secondary-light transition-colors">
                  Post-Discharge Physiotherapy
                </Link>
              </li>
              <li>
                <Link href="/services#nutrition" className="hover:text-secondary-light transition-colors">
                  Clinical Nutrition &amp; Dietetics
                </Link>
              </li>
              <li>
                <Link href="/services#preventive" className="hover:text-secondary-light transition-colors">
                  Preventive Home Health &amp; SDoH
                </Link>
              </li>
              <li>
                <Link href="/services#equipment" className="hover:text-secondary-light transition-colors">
                  Medical Equipment (DME) Delivery
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform & For Professionals */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Join the Network
            </h3>
            <ul className="space-y-2.5 text-sm text-white/75">
              <li>
                <Link href="/professionals" className="hover:text-secondary-light transition-colors">
                  For Phlebotomists &amp; CHWs
                </Link>
              </li>
              <li>
                <Link href="/professionals#therapists" className="hover:text-secondary-light transition-colors">
                  For Physiotherapists &amp; Dietitians
                </Link>
              </li>
              <li>
                <Link href="/professionals#depots" className="hover:text-secondary-light transition-colors">
                  For Medical Equipment Depots
                </Link>
              </li>
              <li>
                <Link href="/about#how-it-works" className="hover:text-secondary-light transition-colors">
                  Super-Visit Bundling Model
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-secondary-light transition-colors">
                  Professional Enrollment
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Coordination Support */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Coordination Office
            </h3>
            <ul className="space-y-3 text-xs text-white/75">
              <li className="flex items-start gap-2">
                <MapPin size={15} className="shrink-0 text-primary mt-0.5" />
                <span>
                  Healthcare Operations Hub,<br />
                  Pune &amp; Mumbai Regional Clusters,<br />
                  Maharashtra, India
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={15} className="shrink-0 text-secondary" />
                <span>
                  <span className="text-white/50 text-[10px] block">PROTOTYPE HELPLINE:</span>
                  +91 (020) 5550-CARE
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={15} className="shrink-0 text-primary" />
                <span>
                  <span className="text-white/50 text-[10px] block">INQUIRIES:</span>
                  care@vivoquest.example.com
                </span>
              </li>
            </ul>

            <div className="mt-4 pt-4 border-t border-navy-light/40">
              <p className="text-[11px] text-white/50">
                Data residency strictly in India (AWS Mumbai ap-south-1). DPDP Act (2023) aligned.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Compliance Links */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>
            &copy; {new Date().getFullYear()} VivoQuest Health Technologies Pvt. Ltd. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-5">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/services" className="hover:text-white transition-colors">Services</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/about#privacy" className="hover:text-white transition-colors">Privacy Notice</Link>
            <Link href="/about#terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/about#accessibility" className="hover:text-white transition-colors">Accessibility (WCAG 2.1 AA)</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
