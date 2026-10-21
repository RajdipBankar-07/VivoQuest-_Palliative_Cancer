'use client';

import React, { useState, useEffect } from 'react';
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
  FileCheck,
  Building2,
  Users,
  Compass,
  Check,
  ChevronRight,
  ChevronDown,
  Shield,
  Layers,
  Truck,
  HeartPulse,
  HelpCircle,
  ChevronUp
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { SectionHeading } from '@/components/SectionHeading';
import { productsApi } from '@/lib/api';

export default function HomePage() {
  // Service category filter state
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<'all' | 'clinical' | 'rehab' | 'dme'>('all');
  
  // Ecosystem partner tabs state
  const [activePartnerTab, setActivePartnerTab] = useState<'hospitals' | 'professionals' | 'labs' | 'dme' | 'payers'>('hospitals');

  // FAQ Accordion state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Live products from API
  const [products, setProducts] = useState<any[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Fallback DME products if API is empty or connecting
  const fallbackProducts = [
    {
      sku: 'DME-MOB-WALKER-02',
      title: 'Folding Lightweight Mobility Walker with 5" Front Wheels',
      category: 'mobility',
      badge: 'Post-Op Mobility & Rehab',
      description: 'Anodized aluminum dual-release folding mobility walker with front rubber wheels and rear glide caps.',
      price: 2499,
      rentalPriceMonthly: 600,
      isRentalAvailable: true,
      stockQuantity: 30,
    },
    {
      sku: 'DME-RESP-OXY-CONC-05',
      title: 'Medical Grade 5L High-Flow Oxygen Concentrator (93% ± 3%)',
      category: 'respiratory',
      badge: 'Continuous Oxygen Therapy',
      description: 'Quiet dual-sieve bed molecular oxygen concentrator with integrated digital purity monitor and alarms.',
      price: 44999,
      rentalPriceMonthly: 4500,
      isRentalAvailable: true,
      stockQuantity: 12,
    },
    {
      sku: 'DME-BED-ELEC-3F-01',
      title: '3-Function Motorized Hospital ICU Bed with Side Rails',
      category: 'icu_home_setup',
      badge: 'Specialized ICU Home Setup',
      description: 'Full electrical adjustment for backrest, knee elevation, and bed height with handheld wired pendant.',
      price: 58500,
      rentalPriceMonthly: 5500,
      isRentalAvailable: true,
      stockQuantity: 8,
    },
    {
      sku: 'DME-DIAG-BPMON-01',
      title: 'Clinical Digital Blood Pressure Monitor with Bluetooth',
      category: 'monitoring_diagnostics',
      badge: 'Hypertension Tracking',
      description: 'Oscillometric digital BP monitor with irregular heartbeat detector and WHO clinical pressure bar.',
      price: 2199,
      rentalPriceMonthly: 0,
      isRentalAvailable: false,
      stockQuantity: 45,
    },
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchFeaturedProducts = async () => {
      try {
        setIsProductsLoading(true);
        setProductsError(null);
        const res = await productsApi.getProducts({ limit: 4 });
        if (isMounted) {
          if (res && res.data && res.data.length > 0) {
            setProducts(res.data);
          } else {
            setProducts(fallbackProducts);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setProductsError(err?.message || 'Unable to connect to live catalog');
          setProducts(fallbackProducts);
        }
      } finally {
        if (isMounted) setIsProductsLoading(false);
      }
    };

    fetchFeaturedProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // 8 Services Marketplace Data
  const servicesData = [
    {
      id: 'diagnostics',
      category: 'clinical',
      title: 'Home Diagnostics & Phlebotomy',
      description: 'Certified blood sample collection at your kitchen table. HbA1c, lipid profiles, renal panels, and preventive health screenings with cold-chain lab transport.',
      icon: <Activity size={24} />,
      badge: 'Doorstep Blood Draw',
      features: ['Certified Phlebotomists', 'Cold-Chain Transport', 'Digital Reports in 24 Hrs'],
      colorTheme: 'blue' as const,
      href: '/services#diagnostics',
    },
    {
      id: 'teleconsultation',
      category: 'clinical',
      title: 'Doctor Consultations',
      description: 'Direct consultations with verified general physicians and palliative specialists via secure teleconsult or in-home visits for medication reviews and care plans.',
      icon: <Video size={24} />,
      badge: 'Registered Clinicians',
      features: ['Teleconsult or Home Visit', 'Digital Prescriptions', 'Integrated Clinical History'],
      colorTheme: 'blue' as const,
      href: '/doctors',
    },
    {
      id: 'physiotherapy',
      category: 'rehab',
      title: 'Physiotherapy & Rehabilitation',
      description: 'Personalized in-home rehabilitation for joint replacement recovery, neurological recovery, stroke rehab, and geriatric mobility stabilization.',
      icon: <UserCheck size={24} />,
      badge: 'Certified Physiotherapists',
      features: ['Post-Op Joint Recovery', 'Fall Risk Reduction', 'Custom Exercise Protocols'],
      colorTheme: 'green' as const,
      href: '/services#physiotherapy',
    },
    {
      id: 'nutrition',
      category: 'rehab',
      title: 'Nutrition & Dietitian Services',
      description: 'Culturally tailored Indian clinical diet planning for diabetes management, renal care, hypertension, and post-discharge metabolic recovery.',
      icon: <Apple size={24} />,
      badge: 'Clinical Dietitians',
      features: ['Indian Plate Calibration', 'Metabolic Tracking', 'Family Meal Guidance'],
      colorTheme: 'green' as const,
      href: '/services#nutrition',
    },
    {
      id: 'preventive',
      category: 'clinical',
      title: 'Social Care & Home Safety Assessments',
      description: 'Comprehensive 28-point home fall hazard audits, bathroom grab rail evaluations, routine vitals monitoring, and empathetic caregiver support.',
      icon: <Heart size={24} />,
      badge: 'SDoH Safety Audits',
      features: ['Fall Hazard Mitigation', 'Vitals Logging & Trends', 'Care Gap Prevention'],
      colorTheme: 'blue' as const,
      href: '/services#preventive',
    },
    {
      id: 'equipment',
      category: 'dme',
      title: 'Medical Equipment Rental & Purchase',
      description: 'Prompt delivery, doorstep assembly, and clinical calibration of hospital beds, oxygen concentrators, CPAP machines, and assistive mobility devices.',
      icon: <Package size={24} />,
      badge: 'Delivery & Setup',
      features: ['Sanitized DME Units', 'Doorstep Assembly Guide', 'Flexible Rental / Buy'],
      colorTheme: 'green' as const,
      href: '/products',
    },
    {
      id: 'post-discharge',
      category: 'clinical',
      title: 'Post-Discharge Home Care',
      description: 'Structured 30-day care bridge from hospital discharge to home stabilization, including wound dressings, medication adherence, and doctor updates.',
      icon: <FileCheck size={24} />,
      badge: '30-Day Care Bridge',
      features: ['Discharge Plan Alignment', 'Wound Dressings Review', 'Readmission Prevention'],
      colorTheme: 'blue' as const,
      href: '/services',
    },
    {
      id: 'preventive-followup',
      category: 'clinical',
      title: 'Follow-up & Preventive Care',
      description: 'Proactive routine health check-ins, periodic biometric monitoring, and closed-loop care reporting shared with your primary care physician.',
      icon: <HeartPulse size={24} />,
      badge: 'Continuous Monitoring',
      features: ['Biometric Trend Tracking', 'Care Team Reporting', 'Preventive Alerts'],
      colorTheme: 'green' as const,
      href: '/appointments',
    },
  ];

  const filteredServices = selectedServiceCategory === 'all'
    ? servicesData
    : servicesData.filter((s) => s.category === selectedServiceCategory);

  // 3-step workflow
  const workflowSteps = [
    {
      step: '01',
      title: 'Choose Your Care',
      description: 'Patients explore available services or request an appointment — from home diagnostics and physiotherapy to post-discharge support and medical equipment.',
      icon: <Calendar className="w-6 h-6 text-primary" />,
      color: 'blue' as const,
    },
    {
      step: '02',
      title: 'Coordinate Care',
      description: 'Appropriate professionals and required equipment are coordinated according to availability and eligibility — scheduled as a single optimized visit.',
      icon: <Layers className="w-6 h-6 text-secondary" />,
      color: 'green' as const,
    },
    {
      step: '03',
      title: 'Continue Care at Home',
      description: 'Care professionals record visit updates and authorized clinicians can review the reports — closing the loop between home and hospital.',
      icon: <FileCheck className="w-6 h-6 text-primary" />,
      color: 'blue' as const,
    },
  ];

  // Post-discharge journey milestones
  const journeyMilestones = [
    {
      phase: 'Phase 1',
      title: 'Hospital Discharge & Care Handoff',
      timeline: 'Day 0',
      description: 'Clinical discharge summary, medication reconciliation, and home care directives are ingested into the patient record.',
      tag: 'Live Platform Feature',
    },
    {
      phase: 'Phase 2',
      title: 'Equipment Delivery & Doorstep Setup',
      timeline: 'Day 0–1',
      description: 'Sanitized hospital bed, oxygen concentrator, or mobility walker delivered and calibrated before patient arrives home.',
      tag: 'Live Platform Feature',
    },
    {
      phase: 'Phase 3',
      title: 'Home Diagnostic Lab Checks',
      timeline: 'Day 2–3',
      description: 'Fasting blood draw (CBC, metabolic panel, INR) conducted at home with cold-chain transport, avoiding hospital trips.',
      tag: 'Live Platform Feature',
    },
    {
      phase: 'Phase 4',
      title: 'Physiotherapy & Nutrition Plan',
      timeline: 'Week 1–2',
      description: 'Twice-weekly mobility therapy and personalized Indian diet planning to accelerate strength and avoid fall risks.',
      tag: 'Live Platform Feature',
    },
    {
      phase: 'Phase 5',
      title: 'Daily Health Updates & Remote Review',
      timeline: 'Week 2–4',
      description: 'Family logs daily vitals via the portal. Assigned doctor reviews logs and flags recovery exceptions.',
      tag: 'Live Platform Feature',
    },
    {
      phase: 'Phase 6',
      title: 'Care Team Closed-Loop Report',
      timeline: 'Day 30',
      description: 'Verified clinical completion summary and biometric trends shared with the discharging hospital team.',
      tag: 'Live Platform Feature',
    },
  ];

  // FAQ items
  const faqItems = [
    {
      q: 'How do I book a home healthcare service or diagnostic visit?',
      a: 'You can book directly through our website by choosing Healthcare Services or Find a Doctor, selecting your required clinical care (such as phlebotomy, physiotherapy, or nursing assessment), and choosing a convenient date and time. An itemized service overview is confirmed before any clinician is dispatched.',
    },
    {
      q: 'What is a "Super-Visit Bundle" and how does it save time and money?',
      a: 'A Super-Visit Bundle is VivoQuest’s proprietary model that stacks multiple discrete home care needs—such as a fasting blood draw, a home fall hazard audit, and medical equipment setup—into a single coordinated visit. This eliminates multiple travel fees, reduces clinician road time, and avoids exhausting patients with repeated visits.',
    },
    {
      q: 'How does VivoQuest verify healthcare professionals and medical equipment?',
      a: 'Every independent clinician on VivoQuest (doctors, physiotherapists, phlebotomists, and dietitians) undergoes credential and licensing verification with state councils. All durable medical equipment (DME) is sanitized, calibrated, and inspected at local depots before dispatch.',
    },
    {
      q: 'Can I rent medical equipment instead of buying it outright?',
      a: 'Yes. VivoQuest offers flexible monthly rental subscriptions on major medical equipment including ICU hospital beds, oxygen concentrators, CPAP machines, and mobility walkers. Our technicians assemble and calibrate the equipment directly in your home.',
    },
    {
      q: 'How does VivoQuest coordinate with my hospital or treating doctor?',
      a: 'VivoQuest operates on a closed-loop reporting model. Following every home visit or diagnostic test, structured clinical summaries and laboratory results are uploaded to the secure platform and can be reviewed by your attending physician or hospital care coordinator.',
    },
    {
      q: 'Is my health data and medical record protected?',
      a: 'Yes. VivoQuest enforces strict role-based access control (RBAC). Only clinicians actively assigned to your care plan can access your clinical records. All sensitive patient records and audit histories are encrypted.',
    },
  ];

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      <Navbar />

      {/* =========================================================================
          HERO SECTION — Full-Width Background Image with Gradient Overlay
          ========================================================================= */}
      <section className="relative w-full overflow-hidden border-b border-border/60">
        {/* Background Image Container */}
        <div className="relative w-full min-h-[520px] sm:min-h-[580px] md:min-h-[640px] lg:min-h-[680px]">
          {/* Hero Background Image */}
          <img
            src="/hero-healthcare.png"
            alt="Compassionate healthcare professional caring for an elderly patient in a warm home setting"
            className="absolute inset-0 w-full h-full object-cover object-[78%_center] lg:object-right"
            loading="eager"
            fetchPriority="high"
          />

          {/* Navy Gradient Overlay — ensures 100% text readability on mobile and clean right-side clarity on desktop */}
          <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/85 to-navy/40 sm:from-navy/90 sm:via-navy/60 sm:to-transparent lg:from-navy/75 lg:via-navy/35 lg:to-transparent pointer-events-none" />
          {/* Bottom fade for smooth transition */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />

          {/* Hero Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="w-full sm:max-w-[85%] md:max-w-[70%] lg:max-w-[50%] xl:max-w-[46%] py-16 md:py-20 lg:py-24 flex flex-col items-start text-left">

              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white border border-white/25 text-xs sm:text-sm font-semibold mb-6 shadow-xs">
                <Sparkles size={15} className="text-secondary-light" />
                <span>AI-Enabled Home Healthcare Marketplace</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.1rem] font-extrabold text-white tracking-tight leading-[1.12] mb-5">
                Better Healthcare,{' '}
                <span className="text-secondary-light">Right at Home.</span>
              </h1>

              {/* Supporting Description */}
              <p className="text-sm sm:text-base md:text-lg text-white/90 leading-relaxed max-w-xl mb-8 font-normal">
                Connect with healthcare professionals, preventive diagnostic services, coordinated post-discharge care, and essential medical equipment through one connected platform.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-5">
                <Button
                  href="/services"
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight size={18} />}
                >
                  Find Care
                </Button>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2.5 text-base px-6 py-3.5 font-semibold rounded-xl border border-white/40 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white/60 transition-all duration-200 active:scale-[0.98]"
                >
                  <Stethoscope size={18} className="text-secondary-light shrink-0" />
                  Explore Healthcare Services
                </Link>
              </div>

              {/* Partner With VivoQuest Link */}
              <div className="mb-8">
                <Link
                  href="/professionals"
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/80 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/20"
                >
                  <Building2 size={16} className="text-secondary-light" />
                  <span>Partner With VivoQuest</span>
                  <ChevronRight size={14} className="text-white/50" />
                </Link>
              </div>

              {/* Trust Indicators Row */}
              <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/20 w-full max-w-lg">
                <div className="flex flex-col">
                  <span className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck size={17} className="text-secondary-light" /> Verified
                  </span>
                  <span className="text-[11px] text-white/65">Licensed Clinicians</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                    <Truck size={17} className="text-secondary-light" /> Cold-Chain
                  </span>
                  <span className="text-[11px] text-white/65">Lab Specimen Logistics</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                    <Package size={17} className="text-white" /> Doorstep DME
                  </span>
                  <span className="text-[11px] text-white/65">Setup &amp; Calibration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
          SERVICES MARKETPLACE (8 Core Services Grid with Filter Pills)
          ========================================================================= */}
      <section id="services" className="w-full py-16 md:py-24 bg-white border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Healthcare Services Marketplace"
            badgeIcon={<Stethoscope size={14} />}
            badgeColor="blue"
            title="Healthcare and Support, Connected."
            subtitle="From preventive diagnostics and physician consultations to physiotherapy, nutrition, post-discharge care, and medical equipment — access verified care at your kitchen table."
          />

          {/* Service Category Filter Pills */}
          <div className="flex items-center justify-center mb-10">
            <div className="inline-flex p-1.5 rounded-2xl bg-background border border-border shadow-xs max-w-full overflow-x-auto">
              <button
                onClick={() => setSelectedServiceCategory('all')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shrink-0 ${
                  selectedServiceCategory === 'all'
                    ? 'bg-primary text-white shadow-primary'
                    : 'text-navy hover:text-primary'
                }`}
              >
                All Services ({servicesData.length})
              </button>
              <button
                onClick={() => setSelectedServiceCategory('clinical')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shrink-0 ${
                  selectedServiceCategory === 'clinical'
                    ? 'bg-primary text-white shadow-primary'
                    : 'text-navy hover:text-primary'
                }`}
              >
                Clinical &amp; Diagnostics
              </button>
              <button
                onClick={() => setSelectedServiceCategory('rehab')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shrink-0 ${
                  selectedServiceCategory === 'rehab'
                    ? 'bg-secondary text-white shadow-secondary'
                    : 'text-navy hover:text-secondary'
                }`}
              >
                Rehabilitation &amp; Nutrition
              </button>
              <button
                onClick={() => setSelectedServiceCategory('dme')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shrink-0 ${
                  selectedServiceCategory === 'dme'
                    ? 'bg-navy text-white shadow-md'
                    : 'text-navy hover:text-navy-dark'
                }`}
              >
                Medical Equipment &amp; DME
              </button>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredServices.map((svc) => {
              const isBlue = svc.colorTheme === 'blue';
              return (
                <div
                  key={svc.id}
                  className="group relative flex flex-col justify-between p-6 bg-card rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
                >
                  <div>
                    {/* Top Row: Icon and Badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                          isBlue ? 'bg-primary-light text-primary' : 'bg-secondary-light text-secondary'
                        }`}
                      >
                        {svc.icon}
                      </div>
                      <span
                        className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          isBlue
                            ? 'bg-blue-50 text-primary border-blue-100'
                            : 'bg-emerald-50 text-secondary border-emerald-100'
                        }`}
                      >
                        {svc.badge}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-navy group-hover:text-primary transition-colors duration-200 mb-2">
                      {svc.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
                      {svc.description}
                    </p>

                    {/* Key Features */}
                    <ul className="space-y-1.5 mb-5 pt-3 border-t border-border/60">
                      {svc.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-navy/85 font-medium">
                          <Check size={14} className={isBlue ? 'text-primary shrink-0' : 'text-secondary shrink-0'} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Action Link */}
                  <Link
                    href={svc.href}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold pt-2 transition-colors ${
                      isBlue ? 'text-primary hover:text-primary-hover' : 'text-secondary hover:text-secondary-hover'
                    }`}
                  >
                    <span>Request Care</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Bottom Action */}
          <div className="mt-12 text-center">
            <Button href="/services" variant="outline" size="md" rightIcon={<ArrowRight size={16} />}>
              Explore Full Service Catalog &amp; Packages
            </Button>
          </div>
        </div>
      </section>


      {/* =========================================================================
          HOW VIVOQUEST WORKS (3-Step — Horizontal on Desktop, Vertical on Mobile)
          ========================================================================= */}
      <section id="how-it-works" className="w-full py-16 md:py-24 bg-background border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Simple Process"
            badgeIcon={<Compass size={14} />}
            badgeColor="green"
            title="How VivoQuest Works"
            subtitle="A simple, transparent three-step process that replaces chaotic multi-vendor coordination with reliable, connected home healthcare."
          />

          {/* 3-Step Layout — Horizontal on Desktop, Vertical on Mobile */}
          <div className="relative flex flex-col lg:flex-row items-stretch gap-6 lg:gap-0">
            {workflowSteps.map((step, idx) => {
              const isGreen = step.color === 'green';
              return (
                <React.Fragment key={step.step}>
                  <div className="flex-1 relative flex flex-col p-7 sm:p-8 bg-white rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 group">
                    {/* Step Number Badge */}
                    <div className="absolute top-5 right-5 text-4xl font-black text-slate-100 select-none leading-none">
                      {step.step}
                    </div>

                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-105 ${
                      isGreen ? 'bg-secondary-light text-secondary' : 'bg-primary-light text-primary'
                    }`}>
                      {step.icon}
                    </div>

                    <h3 className="text-xl font-bold text-navy mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {step.description}
                    </p>

                    {/* Step indicator */}
                    <div className={`mt-6 pt-4 border-t border-border/60 text-xs font-bold flex items-center gap-1.5 ${
                      isGreen ? 'text-secondary' : 'text-primary'
                    }`}>
                      <CheckCircle2 size={14} />
                      <span>Step {idx + 1} of 3</span>
                    </div>
                  </div>

                  {/* Connector arrow between steps (desktop only) */}
                  {idx < workflowSteps.length - 1 && (
                    <div className="hidden lg:flex items-center justify-center w-10 shrink-0 text-border">
                      <ArrowRight size={22} className="text-primary/30" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Transparent Itemized Pricing Callout */}
          <div className="mt-10 p-6 rounded-2xl bg-white border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-light text-secondary flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <p className="text-xs sm:text-sm text-navy font-medium">
                <strong>Itemized &amp; Transparent:</strong> You receive a clear, upfront breakdown before any clinician is dispatched to your residence.
              </p>
            </div>
            <Button href="/services" variant="secondary" size="sm" className="shrink-0">
              Request Care Now
            </Button>
          </div>
        </div>
      </section>


      {/* =========================================================================
          AI CARE COORDINATION (Business Differentiator & SaaS Architecture)
          ========================================================================= */}
      <section className="w-full py-16 md:py-24 bg-white border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Proprietary Coordination Engine"
            badgeIcon={<Sparkles size={14} />}
            badgeColor="blue"
            title="The Intelligence Powering Asset-Light Home Healthcare"
            subtitle="VivoQuest's coordination engine solves the hardest logistical challenge in home healthcare: delivering multidisciplinary care without expensive hospital overhead."
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: 6 Core Capabilities */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              <div className="p-5 rounded-2xl bg-background border border-border/80">
                <div className="w-9 h-9 rounded-lg bg-primary-light text-primary flex items-center justify-center mb-3">
                  <Layers size={18} />
                </div>
                <h4 className="text-sm font-bold text-navy mb-1.5">Clinical Task Bundling</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Groups phlebotomy draws, SDoH home safety checks, and mobility gear setups into unified Super-Visit Bundles to avoid multiple disjointed trips.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-background border border-border/80">
                <div className="w-9 h-9 rounded-lg bg-secondary-light text-secondary flex items-center justify-center mb-3">
                  <ShieldCheck size={18} />
                </div>
                <h4 className="text-sm font-bold text-navy mb-1.5">Skill &amp; Credential Matching</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Matches qualified phlebotomists, certified physiotherapists, and clinical dietitians based on verified state registrations and protocols.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-background border border-border/80">
                <div className="w-9 h-9 rounded-lg bg-primary-light text-primary flex items-center justify-center mb-3">
                  <MapPin size={18} />
                </div>
                <h4 className="text-sm font-bold text-navy mb-1.5">Geographical Clustering</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Optimizes neighborhood clusters across urban and semi-urban localities, minimizing non-productive road travel time for clinicians.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-background border border-border/80">
                <div className="w-9 h-9 rounded-lg bg-secondary-light text-secondary flex items-center justify-center mb-3">
                  <Package size={18} />
                </div>
                <h4 className="text-sm font-bold text-navy mb-1.5">DME Depot Coordination</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Verifies local inventory at authorized equipment depots before dispatching clinical teams, ensuring equipment arrives on time.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-background border border-border/80">
                <div className="w-9 h-9 rounded-lg bg-navy/10 text-navy flex items-center justify-center mb-3">
                  <Users size={18} />
                </div>
                <h4 className="text-sm font-bold text-navy mb-1.5">Multilingual Communication</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sends structured pre-visit preparation checklists and post-visit instructions in Marathi, Hindi, and English to reduce caregiver anxiety.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-background border border-border/80">
                <div className="w-9 h-9 rounded-lg bg-secondary-light text-secondary flex items-center justify-center mb-3">
                  <FileCheck size={18} />
                </div>
                <h4 className="text-sm font-bold text-navy mb-1.5">Closed-Loop Reporting</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Directly delivers structured digital summaries and lab results back to the patient’s primary doctor and hospital care coordinator.
                </p>
              </div>

            </div>

            {/* Right Column: SaaS Dashboard Simulation Card */}
            <div className="lg:col-span-5">
              <div className="bg-navy rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-white/10 relative overflow-hidden">
                {/* Subtle glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                {/* Console Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/15 mb-5 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                      AI Coordination Console
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-secondary-light bg-secondary/20 px-2 py-0.5 rounded border border-secondary/30">
                    Active Orchestration
                  </span>
                </div>

                {/* Active Case Snapshot */}
                <div className="p-4 rounded-xl bg-white/10 border border-white/10 mb-4 relative z-10">
                  <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                    <span>Protocol Trigger: Post-Surgical Discharge</span>
                    <span className="text-secondary-light font-bold">Priority High</span>
                  </div>
                  <div className="text-sm font-bold text-white mb-2">
                    Care Cluster: Pune-West (Kothrud / Deccan)
                  </div>
                  <div className="space-y-1.5 text-xs text-white/80">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Check size={13} className="text-secondary" /> Diagnostic Blood Panel
                      </span>
                      <span className="text-white/60">Cold-Chain Staged</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Check size={13} className="text-secondary" /> SDoH Fall Risk Audit
                      </span>
                      <span className="text-white/60">Assigned</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Check size={13} className="text-secondary" /> DME Walker Delivery
                      </span>
                      <span className="text-white/60">Kothrud Depot Stock</span>
                    </div>
                  </div>
                </div>

                {/* Match Efficiency Stats */}
                <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-white/60 uppercase font-semibold">Bundling Match</div>
                    <div className="text-lg font-extrabold text-secondary-light">98.4%</div>
                    <div className="text-[10px] text-white/50">3 Care Tasks Unified</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-white/60 uppercase font-semibold">Travel Saved</div>
                    <div className="text-lg font-extrabold text-white">42 Mins</div>
                    <div className="text-[10px] text-white/50">Zero Double Travel</div>
                  </div>
                </div>

                {/* Clinical Guardrail Disclaimer */}
                <div className="pt-3 border-t border-white/15 text-[11px] text-white/60 leading-normal relative z-10 flex items-start gap-2">
                  <Shield size={14} className="shrink-0 text-secondary mt-0.5" />
                  <span>
                    <strong>Clinical Transparency:</strong> VivoQuest optimizes logistical bundling and credential matching. Diagnostic orders and therapy regimens are established by attending licensed clinicians.
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* =========================================================================
          MEDICAL EQUIPMENT MARKETPLACE (Live API Data Integration)
          ========================================================================= */}
      <section className="w-full py-16 md:py-24 bg-background border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Medical Equipment Marketplace"
            badgeIcon={<Package size={14} />}
            badgeColor="green"
            title="Essential Medical Equipment for Safe Home Recovery"
            subtitle="Rent or buy sanitized hospital beds, oxygen concentrators, mobility aids, and vitals monitors with professional doorstep assembly."
          />

          {/* Categories Showcase Header */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10 text-xs font-semibold text-navy/70">
            <span className="px-3 py-1.5 rounded-full bg-white border border-border">Mobility Aids &amp; Wheelchairs</span>
            <span className="px-3 py-1.5 rounded-full bg-white border border-border">Respiratory &amp; Oxygen Therapy</span>
            <span className="px-3 py-1.5 rounded-full bg-white border border-border">Monitoring Devices &amp; Vitals</span>
            <span className="px-3 py-1.5 rounded-full bg-white border border-border">Specialized Beds &amp; ICU Setup</span>
            <span className="px-3 py-1.5 rounded-full bg-white border border-border">Clinical Nutrition &amp; Formulas</span>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {isProductsLoading ? (
              // Loading Skeletons
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="p-6 bg-white rounded-2xl border border-border shadow-card animate-pulse flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-slate-200 mb-4" />
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-full mb-4" />
                    <div className="h-6 bg-slate-100 rounded w-1/2 mb-4" />
                  </div>
                  <div className="h-8 bg-slate-200 rounded w-full" />
                </div>
              ))
            ) : (
              products.slice(0, 4).map((prod) => (
                <div
                  key={prod.sku || prod._id}
                  className="group flex flex-col justify-between p-6 bg-white rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
                >
                  <div>
                    {/* Top Tag & Stock */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-light px-2.5 py-0.5 rounded">
                        {prod.category?.replace(/_/g, ' ') || 'Medical Equipment'}
                      </span>
                      <span className="text-[11px] font-semibold text-secondary flex items-center gap-1">
                        <CheckCircle2 size={12} /> In Stock
                      </span>
                    </div>

                    {/* Product Name */}
                    <h3 className="text-base font-bold text-navy group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {prod.title}
                    </h3>

                    {/* Short Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                      {prod.description}
                    </p>

                    {/* Pricing Box */}
                    <div className="p-3 rounded-xl bg-background border border-border/80 mb-5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Purchase:</span>
                        <span className="text-sm font-extrabold text-navy">
                          ₹{Number(prod.price).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {prod.isRentalAvailable && prod.rentalPriceMonthly > 0 && (
                        <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-border/60">
                          <span className="text-xs text-secondary font-medium">Monthly Rental:</span>
                          <span className="text-xs font-bold text-secondary">
                            ₹{Number(prod.rentalPriceMonthly).toLocaleString('en-IN')} / mo
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <Link
                      href={`/products/${prod.sku || prod._id}`}
                      className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1"
                    >
                      <span>View Specifications</span>
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                    <span className="text-[10px] text-muted-foreground font-medium">Doorstep Setup</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* CTA to Explore Medical Store */}
          <div className="mt-12 text-center">
            <Button href="/products" variant="primary" size="md" rightIcon={<ArrowRight size={16} />}>
              Explore Medical Store Catalog
            </Button>
          </div>
        </div>
      </section>


      {/* =========================================================================
          POST-DISCHARGE PATIENT JOURNEY (30-Day Continuity Timeline)
          ========================================================================= */}
      <section className="w-full py-16 md:py-24 bg-white border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Hospital-to-Home Recovery"
            badgeIcon={<HeartPulse size={14} />}
            badgeColor="blue"
            title="Bridging the Critical 30 Days Post-Hospital Discharge"
            subtitle="Preventing avoidable readmissions through timely clinical support, home safety reviews, and proactive family caregiver guidance."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {journeyMilestones.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-background border border-border flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-primary bg-primary-light px-2.5 py-0.5 rounded-full">
                      {item.phase}
                    </span>
                    <span className="text-xs font-bold text-navy/70 flex items-center gap-1">
                      <Clock size={12} className="text-primary" /> {item.timeline}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-navy mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
                    {item.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-border/60 text-[11px] font-semibold text-secondary flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>{item.tag}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 rounded-2xl bg-blue-50/60 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                <Building2 size={20} />
              </div>
              <p className="text-xs sm:text-sm text-navy font-medium">
                <strong>Hospital Coordinators:</strong> Trigger post-discharge bundles directly through the Hospital Portal or upload clinical summaries to activate home recovery.
              </p>
            </div>
            <Button href="/hospital/dashboard" variant="outline" size="sm" className="shrink-0">
              Open Hospital Portal
            </Button>
          </div>
        </div>
      </section>


      {/* =========================================================================
          MARKETPLACE PARTNERS (B2B Value Propositions & Working CTAs)
          ========================================================================= */}
      <section className="w-full py-16 md:py-24 bg-background border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Ecosystem Collaboration"
            badgeIcon={<Users size={14} />}
            badgeColor="navy"
            title="Value Designed for Every Healthcare Participant"
            subtitle="VivoQuest creates meaningful collaboration between hospitals, independent clinicians, diagnostic labs, and medical equipment suppliers."
          />

          {/* Role Switcher Tabs */}
          <div className="flex items-center justify-center mb-10">
            <div className="inline-flex p-1.5 rounded-2xl bg-white border border-border shadow-xs max-w-full overflow-x-auto">
              <button
                onClick={() => setActivePartnerTab('hospitals')}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shrink-0 ${
                  activePartnerTab === 'hospitals'
                    ? 'bg-navy text-white shadow-md'
                    : 'text-navy hover:text-navy-dark'
                }`}
              >
                Hospitals &amp; Clinics
              </button>
              <button
                onClick={() => setActivePartnerTab('professionals')}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shrink-0 ${
                  activePartnerTab === 'professionals'
                    ? 'bg-secondary text-white shadow-secondary'
                    : 'text-navy hover:text-secondary'
                }`}
              >
                Healthcare Professionals
              </button>
              <button
                onClick={() => setActivePartnerTab('labs')}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shrink-0 ${
                  activePartnerTab === 'labs'
                    ? 'bg-primary text-white shadow-primary'
                    : 'text-navy hover:text-primary'
                }`}
              >
                Diagnostic Labs
              </button>
              <button
                onClick={() => setActivePartnerTab('dme')}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shrink-0 ${
                  activePartnerTab === 'dme'
                    ? 'bg-navy text-white shadow-md'
                    : 'text-navy hover:text-navy-dark'
                }`}
              >
                DME Equipment Depots
              </button>
              <button
                onClick={() => setActivePartnerTab('payers')}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shrink-0 ${
                  activePartnerTab === 'payers'
                    ? 'bg-primary text-white shadow-primary'
                    : 'text-navy hover:text-primary'
                }`}
              >
                Payers &amp; Networks
              </button>
            </div>
          </div>

          {/* Partner Tab Content */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-border shadow-card max-w-5xl mx-auto">
            {activePartnerTab === 'hospitals' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <span className="text-xs font-bold text-navy bg-navy/10 px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                    For Hospitals &amp; Acute Care Centers
                  </span>
                  <h3 className="text-2xl font-bold text-navy mb-3">
                    Extend Clinical Oversight into Patient Homes
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Mitigate 30-day readmissions, ensure post-discharge compliance, and receive structured digital summaries directly from home visits.
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-navy/85 mb-8">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-secondary shrink-0" />
                      <span>Single-click referral workflow for discharging patients</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-secondary shrink-0" />
                      <span>Verified care gap closures for lab tests and physiotherapy</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-secondary shrink-0" />
                      <span>Closed-loop clinical outcomes delivered to your hospital portal</span>
                    </li>
                  </ul>
                  <Button href="/hospital/dashboard" variant="primary" size="md" rightIcon={<ArrowRight size={16} />}>
                    Access Hospital Portal
                  </Button>
                </div>
                <div className="p-6 rounded-2xl bg-background border border-border/80">
                  <div className="text-xs font-bold text-navy uppercase tracking-wider mb-4">Readmission Safeguards</div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white border border-border text-xs">
                      <div className="font-bold text-navy">Day 3 Lab Draw</div>
                      <div className="text-muted-foreground">Electrolytes &amp; INR check delivered to clinician</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-border text-xs">
                      <div className="font-bold text-navy">Day 7 PT Gait Review</div>
                      <div className="text-muted-foreground">Fall hazard mitigation &amp; mobility checklist</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-border text-xs">
                      <div className="font-bold text-navy">Day 14 Medication Review</div>
                      <div className="text-muted-foreground">Prescription reconciliation by attending doctor</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePartnerTab === 'professionals' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <span className="text-xs font-bold text-secondary bg-secondary-light px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                    For Clinicians &amp; Specialists
                  </span>
                  <h3 className="text-2xl font-bold text-navy mb-3">
                    Grow Your Practice with Bundled Neighborhood Visits
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Enjoy practice independence, choose your travel radius, and maximize your earnings with pre-bundled neighborhood visits that eliminate dead travel time.
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-navy/85 mb-8">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-secondary shrink-0" />
                      <span>Flexible scheduling around your availability</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-secondary shrink-0" />
                      <span>Optimized geographic clusters to minimize road travel</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-secondary shrink-0" />
                      <span>Transparent and prompt disbursement directly to your account</span>
                    </li>
                  </ul>
                  <Button href="/professionals" variant="secondary" size="md" rightIcon={<ArrowRight size={16} />}>
                    Join the Professional Network
                  </Button>
                </div>
                <div className="p-6 rounded-2xl bg-background border border-border/80">
                  <div className="text-xs font-bold text-navy uppercase tracking-wider mb-4">Supported Specialties</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white border border-border font-medium text-navy">General Physicians</div>
                    <div className="p-3 rounded-xl bg-white border border-border font-medium text-navy">Physiotherapists</div>
                    <div className="p-3 rounded-xl bg-white border border-border font-medium text-navy">Certified Phlebotomists</div>
                    <div className="p-3 rounded-xl bg-white border border-border font-medium text-navy">Clinical Dietitians</div>
                    <div className="p-3 rounded-xl bg-white border border-border font-medium text-navy">Oncology Nurses</div>
                    <div className="p-3 rounded-xl bg-white border border-border font-medium text-navy">Community Health Workers</div>
                  </div>
                </div>
              </div>
            )}

            {activePartnerTab === 'labs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                    For Diagnostic Laboratories
                  </span>
                  <h3 className="text-2xl font-bold text-navy mb-3">
                    Scale Doorstep Phlebotomy with Cold-Chain Integrity
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Partner with VivoQuest to expand your doorstep sample collection reach. Our field app enforces barcoded specimen scanning and cold-chain temperature verification.
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-navy/85 mb-8">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-primary shrink-0" />
                      <span>Verified specimen barcoding at patient doorstep</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-primary shrink-0" />
                      <span>Standardized cold-chain transport logging</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-primary shrink-0" />
                      <span>Secure digital report delivery directly into patient EHR</span>
                    </li>
                  </ul>
                  <Button href="/contact" variant="primary" size="md" rightIcon={<ArrowRight size={16} />}>
                    Inquire About Lab Partnership
                  </Button>
                </div>
                <div className="p-6 rounded-2xl bg-background border border-border/80 text-xs">
                  <div className="font-bold text-navy mb-2">Diagnostic Capabilities</div>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Fasting blood glucose, HbA1c, lipid profiles, complete blood counts, renal function panels, thyroid profiles, and specialized oncological markers.
                  </p>
                  <div className="p-3 rounded-xl bg-white border border-border text-navy font-medium">
                    Barcode scanned on-site • Specimen refrigerated during transport
                  </div>
                </div>
              </div>
            )}

            {activePartnerTab === 'dme' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <span className="text-xs font-bold text-navy bg-navy/10 px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                    For Medical Equipment Depots
                  </span>
                  <h3 className="text-2xl font-bold text-navy mb-3">
                    Monetize Equipment Inventory via Rentals &amp; Purchases
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Connect your warehouse inventory to VivoQuest’s marketplace. Our dispatched clinicians and technicians assist with home delivery, assembly, and patient calibration.
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-navy/85 mb-8">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-secondary shrink-0" />
                      <span>High-demand rental subscriptions for beds and concentrators</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-secondary shrink-0" />
                      <span>Doorstep installation supported by trained field specialists</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-secondary shrink-0" />
                      <span>Automated recurring rental billing and return pickup logistics</span>
                    </li>
                  </ul>
                  <Button href="/contact" variant="outline" size="md" rightIcon={<ArrowRight size={16} />}>
                    Register Your DME Depot
                  </Button>
                </div>
                <div className="p-6 rounded-2xl bg-background border border-border/80 text-xs">
                  <div className="font-bold text-navy mb-2">High-Velocity Inventory</div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Motorized &amp; Manual Hospital Beds</li>
                    <li>• 5L &amp; 10L Medical Oxygen Concentrators</li>
                    <li>• BiPAP &amp; CPAP Non-Invasive Ventilators</li>
                    <li>• Wheelchairs, Commodes, &amp; Assistive Walkers</li>
                  </ul>
                </div>
              </div>
            )}

            {activePartnerTab === 'payers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                    For Payers &amp; Health Organizations
                  </span>
                  <h3 className="text-2xl font-bold text-navy mb-3">
                    Close Preventive Care Gaps &amp; Lower Episode Costs
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Achieve measurable care gap closures for diabetic screenings, hypertension monitoring, and fall prevention without expensive inpatient escalations.
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-navy/85 mb-8">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-primary shrink-0" />
                      <span>Verifiable preventive care gap closures at the kitchen table</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-primary shrink-0" />
                      <span>SDoH environmental audits reducing expensive fall-related admissions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-primary shrink-0" />
                      <span>Asset-light operational model tailored for Indian healthcare</span>
                    </li>
                  </ul>
                  <Button href="/contact" variant="primary" size="md" rightIcon={<ArrowRight size={16} />}>
                    Connect with Corporate Solutions
                  </Button>
                </div>
                <div className="p-6 rounded-2xl bg-background border border-border/80 text-xs">
                  <div className="font-bold text-navy mb-2">Measurable Impact</div>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    VivoQuest bundles prevent fragmented care journeys, improving patient satisfaction and reducing acute 30-day complications.
                  </p>
                  <div className="p-3 rounded-xl bg-white border border-border text-navy font-medium">
                    Audit-trailed clinical documentation with timestamps and clinician signatures
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>


      {/* =========================================================================
          PATIENT SAFETY, FAQ & ACCORDION
          ========================================================================= */}
      <section className="w-full py-16 md:py-24 bg-white border-b border-border/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Patient Safety Box */}
          <div className="p-6 rounded-2xl bg-background border border-border/80 mb-16">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Shield size={20} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-navy mb-1">
                  Patient Safety Guardrails &amp; Marketplace Model
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  VivoQuest is a technology coordination platform connecting patients with independent, licensed healthcare professionals and certified medical equipment suppliers. In acute medical emergencies, please dial <strong>112</strong> or <strong>108</strong> immediately. VivoQuest does not provide emergency ambulance services. All home visits and diagnostic procedures are coordinated under the clinical guidance of attending clinicians.
                </p>
              </div>
            </div>
          </div>

          <SectionHeading
            badge="Frequently Asked Questions"
            badgeIcon={<HelpCircle size={14} />}
            badgeColor="blue"
            title="Common Questions About Home Healthcare with VivoQuest"
            subtitle="Everything you need to know about booking, medical equipment rentals, provider verification, and hospital coordination."
          />

          {/* FAQ Accordion */}
          <div className="space-y-4">
            {faqItems.map((item, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-navy font-bold text-sm sm:text-base hover:text-primary transition-colors focus:outline-none"
                    aria-expanded={isExpanded}
                  >
                    <span>{item.q}</span>
                    <span className="shrink-0 ml-4 text-muted-foreground">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3 animate-in fade-in duration-200">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Final Call to Action Card */}
          <div className="mt-16 p-8 sm:p-10 rounded-3xl bg-navy text-white text-center relative overflow-hidden shadow-xl border border-white/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <h3 className="text-2xl sm:text-3xl font-extrabold mb-3 relative z-10">
              Ready to Experience Coordinated Healthcare at Home?
            </h3>
            <p className="text-sm text-white/75 max-w-2xl mx-auto mb-8 relative z-10 leading-relaxed">
              Connect with verified doctors, certified phlebotomists, physiotherapists, and medical equipment with single-visit coordination.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <Button href="/services" variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
                Explore Services &amp; Packages
              </Button>
              <Button href="/doctors" variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
                Find a Doctor
              </Button>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
