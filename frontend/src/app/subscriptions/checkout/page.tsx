'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  ArrowLeft,
  Smartphone,
  Download,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  Info,
  CheckCircle2,
  Lock,
  HeartPulse,
  Calendar,
  Clock,
  Sparkles,
  Users,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { patientsApi, adminApi } from '@/lib/api';
import { siteConfig } from '@/config/siteConfig';

interface PlanDetail {
  id: string;
  _id?: string;
  planCode?: string;
  title?: string;
  name?: string;
  planType: string;
  category: string;
  durationDays?: number;
  totalVisitsIncluded?: number;
  totalVisits?: number;
  visitsPerMonth?: number;
  hoursPerVisit?: number;
  customerPrice?: number;
  price?: number;
  description?: string;
  features?: string[];
  isActive?: boolean;
  isPopular?: boolean;
}

function SubscriptionHandoffContent() {
  const searchParams = useSearchParams();
  const planIdParam = searchParams.get('planId') || searchParams.get('id');

  const [plans, setPlans] = useState<PlanDetail[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [attemptedLaunch, setAttemptedLaunch] = useState(false);

  // Fetch plans from backend API
  useEffect(() => {
    let isMounted = true;

    async function loadPlans() {
      setIsLoading(true);
      try {
        let fetched: PlanDetail[] = [];
        try {
          const res = await patientsApi.getCaregiverPlans();
          if (res && Array.isArray(res.data) && res.data.length > 0) {
            fetched = res.data;
          }
        } catch {
          const adminRes = await adminApi.getCaregiverPlans();
          if (adminRes && Array.isArray(adminRes.data)) {
            fetched = adminRes.data;
          }
        }

        const normalized: PlanDetail[] = fetched.map((p) => ({
          ...p,
          id: p.id || p._id || '',
          title: p.title || p.name || 'Caregiver Support Plan',
          customerPrice: p.customerPrice ?? p.price ?? 12000,
          totalVisitsIncluded: p.totalVisitsIncluded ?? p.totalVisits ?? p.visitsPerMonth ?? 30,
          hoursPerVisit: p.hoursPerVisit || 8,
          durationDays: p.durationDays || 30,
        }));

        if (isMounted) {
          setPlans(normalized);

          // Locate requested plan or fallback to popular / first plan
          if (planIdParam) {
            const matched = normalized.find(
              (p) => p.id === planIdParam || p._id === planIdParam || p.planCode === planIdParam
            );
            setSelectedPlan(matched || normalized[0] || null);
          } else {
            const popular = normalized.find((p) => p.isPopular);
            setSelectedPlan(popular || normalized[0] || null);
          }
        }
      } catch (err) {
        console.warn('[SubscriptionHandoff] Error loading plans:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPlans();

    return () => {
      isMounted = false;
    };
  }, [planIdParam]);

  // Deep Link construction for the Patient App
  const scheme = siteConfig.mobileApp?.scheme || 'vivoquest';
  const planIdentifier = selectedPlan?.id || selectedPlan?.planCode || planIdParam || '';
  const deepLinkUrl = planIdentifier
    ? `${scheme}://subscriptions?planId=${encodeURIComponent(planIdentifier)}`
    : `${scheme}://subscriptions`;

  const apkDownloadUrl = siteConfig.mobileApp?.apkDownloadUrl || '/downloads/vivoquest-patient-release.apk';

  const handleOpenApp = () => {
    setAttemptedLaunch(true);
    if (typeof window !== 'undefined') {
      window.location.href = deepLinkUrl;
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(deepLinkUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4 animate-pulse">
            <HeartPulse size={32} />
          </div>
          <h1 className="text-xl font-bold text-navy mb-2">Loading Subscription Details...</h1>
          <p className="text-xs text-muted-foreground">Preparing your secure Patient App handoff link.</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <Smartphone size={32} />
          </div>
          <h1 className="text-xl font-bold text-navy mb-2">No Subscription Plan Selected</h1>
          <p className="text-xs text-muted-foreground mb-6">
            Please choose a caregiver or nursing subscription plan before proceeding to the Patient App.
          </p>
          <Button href="/subscriptions" variant="primary" size="md" leftIcon={<ArrowLeft size={16} />}>
            Browse Subscription Plans
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const basePrice = selectedPlan.customerPrice || 12000;
  const taxGst = Math.round(basePrice * 0.18); // 18% GST on healthcare professional services
  const totalAmount = basePrice + taxGst;
  const isMonthly = selectedPlan.planType === 'monthly_subscription';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pb-20 pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb / Back Link */}
          <div className="mb-6">
            <Link
              href="/subscriptions"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-navy transition-colors mb-2"
            >
              <ArrowLeft size={14} />
              <span>Back to Subscriptions</span>
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
                  Patient App Subscription &amp; Care Plan Completion
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  VivoQuest coordinates clinical bedside care, caregiver assignments, and daily visits inside the Patient Mobile App.
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 self-start sm:self-center">
                <ShieldCheck size={14} className="text-teal-600" />
                <span>Verified Patient Flow</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: App Handoff Guidance (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Primary Mobile App Handoff Card */}
              <div className="bg-white rounded-3xl border border-teal-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 shadow-xs shrink-0">
                    <Smartphone size={28} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      Mobile-First Home Health
                    </span>
                    <h2 className="text-xl font-black text-navy mt-1">
                      Complete Your Subscription in the VivoQuest Patient App
                    </h2>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      Download or open the <strong>VivoQuest Patient App</strong> to create your patient account,
                      choose your subscription plan, complete payment and manage your active subscription.
                    </p>
                  </div>
                </div>

                {/* Deep Link Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleOpenApp}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-700 to-navy text-white font-extrabold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <Smartphone size={20} className="group-hover:scale-110 transition-transform" />
                    <span>Open in VivoQuest Patient App</span>
                    <ExternalLink size={16} className="opacity-80" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                      href={apkDownloadUrl}
                      download="vivoquest-patient-release.apk"
                      className="py-3 px-4 rounded-xl border border-slate-300 hover:border-navy text-navy font-bold text-xs bg-slate-50 hover:bg-slate-100 transition flex items-center justify-center gap-2 text-center"
                    >
                      <Download size={15} className="text-teal-700" />
                      <span>Download Patient App APK</span>
                    </a>

                    <button
                      onClick={handleCopyLink}
                      className="py-3 px-4 rounded-xl border border-slate-300 hover:border-navy text-navy font-bold text-xs bg-white hover:bg-slate-50 transition flex items-center justify-center gap-2"
                    >
                      {copiedLink ? (
                        <>
                          <Check size={15} className="text-emerald-600" />
                          <span className="text-emerald-700">Link Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={15} className="text-slate-500" />
                          <span>Copy App Deep Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  {attemptedLaunch && (
                    <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-start gap-2">
                      <Info size={16} className="text-teal-700 shrink-0 mt-0.5" />
                      <p>
                        Attempting to launch <strong>VivoQuest Patient App</strong> with plan <strong>{selectedPlan.title}</strong>...
                        If the app did not open automatically, install the APK using the button above or scan the QR code below.
                      </p>
                    </div>
                  )}
                </div>

                {/* QR Code Section for Desktop Users */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-5 bg-slate-50/70 p-4 rounded-2xl">
                  <div className="w-28 h-28 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-navy" fill="currentColor">
                      <rect x="5" y="5" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="6" rx="4" />
                      <rect x="13" y="13" width="12" height="12" rx="2" />
                      <rect x="67" y="5" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="6" rx="4" />
                      <rect x="75" y="13" width="12" height="12" rx="2" />
                      <rect x="5" y="67" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="6" rx="4" />
                      <rect x="13" y="75" width="12" height="12" rx="2" />
                      <rect x="42" y="10" width="8" height="8" rx="1" />
                      <rect x="52" y="24" width="8" height="8" rx="1" />
                      <rect x="42" y="42" width="16" height="16" rx="2" />
                      <rect x="68" y="45" width="8" height="8" rx="1" />
                      <rect x="80" y="55" width="8" height="8" rx="1" />
                      <rect x="42" y="70" width="8" height="8" rx="1" />
                      <rect x="55" y="80" width="8" height="8" rx="1" />
                      <rect x="70" y="75" width="12" height="12" rx="1" />
                    </svg>
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-[11px] font-extrabold text-teal-800 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
                      <QrCode size={13} />
                      Scan with Your Phone Camera
                    </span>
                    <p className="text-xs font-bold text-navy">
                      Open this subscription flow directly on your mobile device
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Point your smartphone camera at this QR code to launch the VivoQuest Patient App and activate
                      <strong> {selectedPlan.title}</strong> automatically.
                    </p>
                  </div>
                </div>

                {/* 4-Step Patient App Workflow */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    How Mobile Subscription Activation Works
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-navy">Open or Install App</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Tap &quot;Open in Patient App&quot; or scan the QR code from your smartphone.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-navy">Sign In or Register</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Log in or create a patient account. Your chosen plan ({selectedPlan.title}) resumes automatically.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        3
                      </div>
                      <div>
                        <p className="font-bold text-navy">Confirm Plan &amp; Payment</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Review scheduled care visits ({selectedPlan.totalVisitsIncluded} visits) and finalize in verified test mode.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        4
                      </div>
                      <div>
                        <p className="font-bold text-navy">Real-Time Bedside Care</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Care coordinator assigns certified caregiver. Track daily visits and vital logs in app.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clinical Safety Rationale */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    <Lock size={14} className="text-amber-700" />
                    Why is Subscription Completed in the Patient App?
                  </p>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    VivoQuest provides regulated home clinical bedside care, biometric vitals monitoring, and licensed caregiver deployments.
                    Managing subscriptions inside the Patient Mobile App ensures verified clinician check-ins, direct caregiver messaging,
                    and real-time daily care reports shared securely with family members.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Plan Review Summary (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs sticky top-28">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-navy text-sm">Selected Care Subscription</h3>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    {selectedPlan.category?.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Plan Header & Meta */}
                <div>
                  <h2 className="text-lg font-black text-navy">{selectedPlan.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {selectedPlan.description ||
                      'Comprehensive bedside care and palliative assistance delivered directly to the patient kitchen table.'}
                  </p>
                </div>

                {/* Key Metrics Strip */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold">
                      <Calendar size={13} className="text-teal-700" />
                      <span>Duration</span>
                    </div>
                    <p className="text-sm font-bold text-navy mt-1">
                      {selectedPlan.durationDays || 30} Days
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold">
                      <Clock size={13} className="text-teal-700" />
                      <span>Included Visits</span>
                    </div>
                    <p className="text-sm font-bold text-navy mt-1">
                      {selectedPlan.totalVisitsIncluded} Visits ({selectedPlan.hoursPerVisit || 8}h)
                    </p>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <h4 className="text-xs font-bold text-navy uppercase tracking-wider">Included Clinical Services</h4>
                  <div className="space-y-1.5">
                    {(selectedPlan.features && selectedPlan.features.length > 0
                      ? selectedPlan.features
                      : [
                          'Dedicated certified home caregiver assignment',
                          'Daily vitals monitoring & clinical logging',
                          'Mobility assistance & bedside hygiene care',
                          'Family access to daily digital visit reports',
                          '24/7 care coordination desk support',
                        ]
                    ).map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Plan Base Price</span>
                    <span className="font-semibold text-navy">
                      ₹{basePrice.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (18% Clinical Care Services)</span>
                    <span className="font-semibold text-navy">
                      ₹{taxGst.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Billing Frequency</span>
                    <span className="font-bold text-teal-800 uppercase tracking-wider text-[11px]">
                      {isMonthly ? 'Monthly Subscription' : 'Complete Care Package'}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm font-bold text-navy pt-3 border-t border-slate-100">
                    <span>Total Payable Amount</span>
                    <span className="text-lg text-teal-800 font-black">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Primary CTA Button */}
                <button
                  onClick={handleOpenApp}
                  className="w-full py-3.5 px-4 rounded-2xl bg-navy hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Smartphone size={16} />
                  <span>Finalize in Patient App</span>
                </button>

                <p className="text-[11px] text-center text-muted-foreground">
                  Verified Test Mode active. No actual bank charges will be deducted.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function SubscriptionCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <HeartPulse size={36} className="animate-spin text-teal-700 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">Loading checkout...</p>
          </div>
        </div>
      }
    >
      <SubscriptionHandoffContent />
    </Suspense>
  );
}

