'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Heart,
  Stethoscope,
  Video,
  UserCheck,
  Apple,
  ShieldCheck,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  MapPin,
  Sparkles,
  PhoneCall,
  FileCheck,
  Building,
  Users,
  Compass,
  Check,
  ChevronRight,
  Shield
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { SectionHeading } from '@/components/SectionHeading';
import { ServiceCard } from '@/components/ServiceCard';

export default function HomePage() {
  const [activeBenefitTab, setActiveBenefitTab] = useState<'patients' | 'professionals' | 'hospitals'>('patients');

  const servicesData = [
    {
      id: 'diagnostics',
      title: 'Home Diagnostics',
      description: 'NABL-accredited blood collection and sample testing at your kitchen table. A1C, lipid panels, liver function, and preventive health screenings.',
      icon: <Activity size={24} />,
      badge: 'NABL Certified Labs',
      features: ['Trained Phlebotomists', 'Cold-Chain Transport', 'Digital Reports in 24 Hrs'],
      colorTheme: 'blue' as const,
      href: '/services#diagnostics',
    },
    {
      id: 'teleconsultation',
      title: 'Teleconsultation',
      description: 'Connect via secure video consultation with verified general physicians and specialists for medical reviews, chronic disease follow-ups, and e-prescriptions.',
      icon: <Video size={24} />,
      badge: 'Registered Doctors',
      features: ['Multilingual Consults', 'Zero Travel Stress', 'Integrated Health Records'],
      colorTheme: 'blue' as const,
      href: '/services#teleconsultation',
    },
    {
      id: 'physiotherapy',
      title: 'Physiotherapy',
      description: 'Personalized in-home rehabilitation for orthopedic recovery, neurological conditions, post-operative mobility, and geriatric balance training.',
      icon: <UserCheck size={24} />,
      badge: 'Certified Physiotherapists',
      features: ['Post-Op Rehabilitation', 'Fall Risk Reduction', 'Custom Exercise Plans'],
      colorTheme: 'green' as const,
      href: '/services#physiotherapy',
    },
    {
      id: 'nutrition',
      title: 'Nutrition and Wellness',
      description: 'Culturally tailored Indian dietary planning and clinical nutritional therapy for diabetes management, renal care, hypertension, and post-discharge recovery.',
      icon: <Apple size={24} />,
      badge: 'Clinical Dietitians',
      features: ['Indian Plate Calibration', 'Metabolic Tracking', 'Family Meal Guidance'],
      colorTheme: 'green' as const,
      href: '/services#nutrition',
    },
    {
      id: 'preventive',
      title: 'Preventive Home Care',
      description: 'Comprehensive home safety reviews, Social Determinants of Health (SDoH) checklists, routine vitals monitoring, and empathetic caregiver support.',
      icon: <Heart size={24} />,
      badge: 'Community Health Workers',
      features: ['Home Fall Hazard Audits', 'Vitals Logging', 'Care Gap Prevention'],
      colorTheme: 'blue' as const,
      href: '/services#preventive',
    },
    {
      id: 'equipment',
      title: 'Medical Equipment',
      description: 'Direct delivery, doorstep installation, and clinical calibration of hospital beds, oxygen concentrators, CPAP machines, and assistive mobility devices.',
      icon: <Package size={24} />,
      badge: 'Delivery & Setup',
      features: ['Sanitized DME Units', 'Professional Setup Guide', 'Flexible Rental / Buy'],
      colorTheme: 'green' as const,
      href: '/services#equipment',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Request a Healthcare Service',
      description: 'Select home diagnostics, a therapy consult, or needed medical equipment through our intuitive web portal or via your hospital discharge trigger.',
      icon: <Calendar className="w-6 h-6 text-primary" />,
    },
    {
      step: '02',
      title: 'VivoQuest Coordinates the Request',
      description: 'Our proprietary bundling engine optimizes discrete care gaps, checking local equipment stock and creating a unified visit to eliminate repeated appointments.',
      icon: <Sparkles className="w-6 h-6 text-secondary" />,
    },
    {
      step: '03',
      title: 'Connect with a Qualified Provider',
      description: 'A licensed, background-checked professional (phlebotomist, therapist, or equipment technician) is dispatched directly to the patient home.',
      icon: <UserCheck className="w-6 h-6 text-primary" />,
    },
    {
      step: '04',
      title: 'Track Service Progress & Completion',
      description: 'Receive real-time arrival updates, verify specimen barcoding on-site, and access digital care summaries immediately following the home visit.',
      icon: <FileCheck className="w-6 h-6 text-secondary" />,
    },
  ];

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      <Navbar />

      {/* =========================================================================
          HERO SECTION
          ========================================================================= */}
      <section className="relative w-full pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-white via-background to-background border-b border-border/60 overflow-hidden">
        {/* Soft decorative radial gradients */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-light/50 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-secondary-light/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Hero Column */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-light text-primary border border-primary/20 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
                <ShieldCheck size={16} className="text-primary" />
                <span>India&apos;s AI-Enabled Preventive Care Marketplace</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-navy tracking-tight leading-[1.15] mb-6">
                Better Healthcare, <br />
                <span className="text-primary">Right at Home.</span>
              </h1>

              {/* Supporting Text */}
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-8 font-normal">
                Connect with healthcare professionals, preventive care services, and essential medical equipment through one coordinated platform.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-10">
                <Button
                  href="/services"
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight size={18} />}
                >
                  Find Care
                </Button>
                <Button
                  href="/professionals"
                  variant="outline"
                  size="lg"
                  leftIcon={<Heart size={18} className="text-secondary" />}
                >
                  Join as a Professional
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border/80 w-full max-w-lg">
                <div className="flex flex-col">
                  <span className="text-lg sm:text-xl font-bold text-navy">100% Verified</span>
                  <span className="text-xs text-muted-foreground">Certified Specialists</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg sm:text-xl font-bold text-navy">NABL Labs</span>
                  <span className="text-xs text-muted-foreground">Quality Cold-Chain</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg sm:text-xl font-bold text-navy">DPDP Ready</span>
                  <span className="text-xs text-muted-foreground">Encrypted PHI Storage</span>
                </div>
              </div>
            </div>

            {/* Right Hero Column: Coordinated Super-Visit Card Preview */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto w-full max-w-md bg-white rounded-3xl border border-border shadow-2xl p-6 sm:p-7">
                
                {/* Header Badge */}
                <div className="flex items-center justify-between pb-4 border-b border-border/70 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-navy">
                      Live Coordinated Dispatch
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-primary bg-primary-light px-2.5 py-0.5 rounded-full">
                    Super-Visit Bundle
                  </span>
                </div>

                {/* Patient Profile Snapshot */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-background border border-border/60 mb-5">
                  <div className="w-11 h-11 rounded-full bg-navy text-white flex items-center justify-center font-bold text-sm shrink-0">
                    SD
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-sm font-bold text-navy truncate">Mrs. Shanti Deshmukh</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin size={12} className="shrink-0 text-primary" />
                      <span>Kothrud, Pune • Post-Discharge Week 2</span>
                    </p>
                  </div>
                </div>

                {/* Bundled Tasks Stack */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                    <Activity size={18} className="text-primary mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-navy">HbA1c &amp; Lipid Panel Blood Draw</span>
                      <span className="text-[11px] text-muted-foreground">Certified Phlebotomist • Fasting sample</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <ShieldCheck size={18} className="text-secondary mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-navy">Home Safety &amp; Fall Risk Audit</span>
                      <span className="text-[11px] text-muted-foreground">SDoH Specialist • Bathroom checklist</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-border/80">
                    <Package size={18} className="text-navy mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-navy">Adult Foldable Walker Delivery</span>
                      <span className="text-[11px] text-muted-foreground">Doorstep assembly &amp; height calibration</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Status Callout */}
                <div className="flex items-center justify-between pt-4 border-t border-border/70 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Clock size={14} className="text-secondary" />
                    <span>Estimated Arrival: 10:15 AM</span>
                  </div>
                  <span className="font-bold text-secondary flex items-center gap-1">
                    <CheckCircle2 size={14} /> One Single Visit
                  </span>
                </div>
              </div>

              {/* Decorative Floating Metric Tag */}
              <div className="hidden sm:flex absolute -bottom-5 -left-6 bg-navy text-white px-4 py-3 rounded-2xl shadow-xl items-center gap-3 border border-white/10">
                <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-white shrink-0 font-bold">
                  ✓
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-tight">Zero Clinical Fragmentation</span>
                  <span className="text-[10px] text-white/70">Lab Draw + DME + Caregiver Support</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* =========================================================================
          HEALTHCARE SERVICES SECTION
          ========================================================================= */}
      <section id="services" className="w-full py-16 md:py-24 bg-white border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Healthcare Services"
            badgeIcon={<Stethoscope size={14} />}
            badgeColor="blue"
            title="Coordinated Healthcare Delivered to Your Home"
            subtitle="From preventive lab screenings to medical equipment rentals, VivoQuest connects you with verified healthcare professionals at your kitchen table."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {servicesData.map((svc) => (
              <ServiceCard
                key={svc.id}
                id={svc.id}
                title={svc.title}
                description={svc.description}
                icon={svc.icon}
                badge={svc.badge}
                features={svc.features}
                colorTheme={svc.colorTheme}
                href={svc.href}
              />
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Need a customized care package or specialized hospital discharge setup?
            </p>
            <Button href="/services" variant="outline" size="md" rightIcon={<ArrowRight size={16} />}>
              View All Services &amp; Packages
            </Button>
          </div>
        </div>
      </section>


      {/* =========================================================================
          HOW VIVOQUEST WORKS SECTION
          ========================================================================= */}
      <section id="how-it-works" className="w-full py-16 md:py-24 bg-background border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Seamless Coordination"
            badgeIcon={<Compass size={14} />}
            badgeColor="green"
            title="How VivoQuest Coordinates Your Home Healthcare"
            subtitle="A transparent, reliable 4-step workflow designed to replace chaotic phone calls with trusted, coordinated care delivery."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
            {workflowSteps.map((step, idx) => (
              <div
                key={step.step}
                className="relative flex flex-col p-6 sm:p-7 bg-white rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300"
              >
                {/* Step Number & Icon */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-background border border-border/80 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="text-2xl font-black text-border font-heading">
                    {step.step}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-navy mb-2.5">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>

                {/* Arrow indicator between steps (desktop only) */}
                {idx < workflowSteps.length - 1 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-border">
                    <ChevronRight size={22} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-white border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-light text-secondary flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <p className="text-xs sm:text-sm text-navy font-medium">
                <strong>No hidden visit charges:</strong> You receive an itemized service overview before any clinician is dispatched to your residence.
              </p>
            </div>
            <Button href="/services" variant="secondary" size="sm" className="shrink-0">
              Request Care Now
            </Button>
          </div>
        </div>
      </section>


      {/* =========================================================================
          BENEFITS SECTION (TABBED: PATIENTS / PROFESSIONALS / HOSPITALS)
          ========================================================================= */}
      <section className="w-full py-16 md:py-24 bg-white border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Ecosystem Value"
            badgeIcon={<Users size={14} />}
            badgeColor="blue"
            title="Benefits Designed for Every Healthcare Participant"
            subtitle="VivoQuest creates meaningful collaboration between families, independent clinicians, and care networks without clinical compromises."
          />

          {/* Interactive Role Switcher Tabs */}
          <div className="flex items-center justify-center mb-10">
            <div className="inline-flex p-1.5 rounded-2xl bg-background border border-border shadow-sm max-w-full overflow-x-auto">
              <button
                onClick={() => setActiveBenefitTab('patients')}
                className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 ${
                  activeBenefitTab === 'patients'
                    ? 'bg-primary text-white shadow-primary'
                    : 'text-navy hover:text-primary'
                }`}
              >
                Patients &amp; Families
              </button>
              <button
                onClick={() => setActiveBenefitTab('professionals')}
                className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 ${
                  activeBenefitTab === 'professionals'
                    ? 'bg-secondary text-white shadow-secondary'
                    : 'text-navy hover:text-secondary'
                }`}
              >
                Healthcare Professionals
              </button>
              <button
                onClick={() => setActiveBenefitTab('hospitals')}
                className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 ${
                  activeBenefitTab === 'hospitals'
                    ? 'bg-navy text-white shadow-md'
                    : 'text-navy hover:text-navy-dark'
                }`}
              >
                Hospitals &amp; Care Organizations
              </button>
            </div>
          </div>

          {/* Tab Content 1: Patients & Families */}
          {activeBenefitTab === 'patients' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 animate-in fade-in duration-300">
              <div className="p-6 rounded-2xl bg-background border border-border">
                <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center font-bold mb-4">
                  1
                </div>
                <h3 className="text-base font-bold text-navy mb-2">Unhurried Home Care</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Avoid exhausting travel, packed diagnostic waiting rooms, and infection risks. Receive personalized care in the safe comfort of home.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-background border border-border">
                <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center font-bold mb-4">
                  2
                </div>
                <h3 className="text-base font-bold text-navy mb-2">Caregiver Empowerment</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Family members receive step-by-step guidance on medication schedules, assistive mobility devices, and dietary adaptations.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-background border border-border">
                <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center font-bold mb-4">
                  3
                </div>
                <h3 className="text-base font-bold text-navy mb-2">Transparent Service Bundling</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Combine blood draws, physical therapy, and equipment delivery into a single visit—saving family time and reducing cumulative visit fees.
                </p>
              </div>
            </div>
          )}

          {/* Tab Content 2: Healthcare Professionals */}
          {activeBenefitTab === 'professionals' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 animate-in fade-in duration-300">
              <div className="p-6 rounded-2xl bg-background border border-border">
                <div className="w-10 h-10 rounded-xl bg-secondary-light text-secondary flex items-center justify-center font-bold mb-4">
                  1
                </div>
                <h3 className="text-base font-bold text-navy mb-2">Flexible Practice Independence</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Choose your working hours, travel radius, and preferred clinical service categories without clinic lease overhead or bureaucracy.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-background border border-border">
                <div className="w-10 h-10 rounded-xl bg-secondary-light text-secondary flex items-center justify-center font-bold mb-4">
                  2
                </div>
                <h3 className="text-base font-bold text-navy mb-2">Optimized Route Logistics</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our dispatch algorithms group neighborhood visits and nearby DME depot stops, cutting non-productive road travel time significantly.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-background border border-border">
                <div className="w-10 h-10 rounded-xl bg-secondary-light text-secondary flex items-center justify-center font-bold mb-4">
                  3
                </div>
                <h3 className="text-base font-bold text-navy mb-2">Direct Digital Workflow</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Complete checklists, scan specimen tubes, and capture patient sign-offs on our offline-capable mobile app with prompt disbursement rails.
                </p>
              </div>
            </div>
          )}

          {/* Tab Content 3: Hospitals & Care Organizations */}
          {activeBenefitTab === 'hospitals' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 animate-in fade-in duration-300">
              <div className="p-6 rounded-2xl bg-background border border-border">
                <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center font-bold mb-4">
                  1
                </div>
                <h3 className="text-base font-bold text-navy mb-2">Readmission Risk Reduction</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Extend your clinical oversight into the crucial first 30 days post-discharge with verified vitals checks, fall prevention, and lab follow-ups.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-background border border-border">
                <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center font-bold mb-4">
                  2
                </div>
                <h3 className="text-base font-bold text-navy mb-2">Automated EMR Ingestion</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Trigger home care requests directly via FHIR webhooks or batch CSV uploads, receiving structured care summaries directly back to your portal.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-background border border-border">
                <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center font-bold mb-4">
                  3
                </div>
                <h3 className="text-base font-bold text-navy mb-2">Care Gap Closure Verification</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Documented preventive closures for diabetic panels, blood pressure monitoring, and physical rehabilitation support health plan quality ratings.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>


      {/* =========================================================================
          COMPASSIONATE CARE SECTION (Inspired by Palcare India's palliative dignity)
          ========================================================================= */}
      <section className="w-full py-16 md:py-24 bg-gradient-to-r from-navy-dark via-navy to-navy-dark text-white relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 text-secondary-light flex items-center justify-center mx-auto mb-6 border border-white/15">
            <Heart size={28} />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-secondary-light mb-3 block">
            Compassionate Care Commitment
          </span>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-6 leading-tight">
            Preserving Patient Dignity, Supporting Every Caregiver
          </h2>

          <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-3xl mx-auto mb-10">
            Healthcare is deeply personal. Inspired by India&apos;s compassionate palliative traditions, VivoQuest was founded on the belief that vulnerable, elderly, or recuperating patients should never feel forgotten once discharged from hospital doors. We coordinate human hands alongside medical equipment to ensure comfort, active listening, and peace of mind for the entire family.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left border-t border-white/15 pt-8 max-w-3xl mx-auto">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white mb-1">Dignity First</span>
              <span className="text-xs text-white/70">Respectful, unhurried care at the kitchen table honoring individual patient autonomy.</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white mb-1">Family Support</span>
              <span className="text-xs text-white/70">Relieving caregiver anxiety with clear communication, training, and 24/7 coordination.</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white mb-1">Broad Accessibility</span>
              <span className="text-xs text-white/70">Designed for tier-1 cities and semi-urban communities with multilingual assistance.</span>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
          CALL-TO-ACTION (CTA) SECTION
          ========================================================================= */}
      <section className="w-full py-16 md:py-20 bg-background border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* Card 1: For Patients & Families */}
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-border shadow-card flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary-light px-3 py-1 rounded-full inline-block mb-4">
                  For Patients &amp; Families
                </span>
                <h3 className="text-2xl font-bold text-navy mb-3">
                  Need Preventive Care or Medical Equipment at Home?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Schedule blood draws, physiotherapist rehabilitation, dietetic consultations, or hospital bed delivery with verified specialists.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-border/60">
                <Button href="/services" variant="primary" size="md" rightIcon={<ArrowRight size={16} />}>
                  Explore Services
                </Button>
                <Button href="/contact" variant="ghost" size="md">
                  Speak to Care Coordinator
                </Button>
              </div>
            </div>

            {/* Card 2: For Professionals & DME Suppliers */}
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-border shadow-card flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-secondary bg-secondary-light px-3 py-1 rounded-full inline-block mb-4">
                  For Clinicians &amp; Depots
                </span>
                <h3 className="text-2xl font-bold text-navy mb-3">
                  Are You a Certified Healthcare Specialist or DME Supplier?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Join VivoQuest to expand your home visit earnings, receive AI-bundled neighborhood visits, and access digital dispatch tools.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-border/60">
                <Button href="/professionals" variant="secondary" size="md" rightIcon={<ArrowRight size={16} />}>
                  Join the Network
                </Button>
                <Button href="/register" variant="ghost" size="md">
                  View Verification Requirements
                </Button>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
