'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  HeartPulse,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  UserCheck,
  Activity,
  FileText,
  AlertCircle,
  ArrowRight,
  PhoneCall,
  Check,
  CreditCard,
  X,
  Stethoscope,
  ChevronRight,
  HelpCircle,
  Award,
  Users,
  Smartphone,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { patientsApi, adminApi, authApi } from '@/lib/api';

interface PlanItem {
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

function SubscriptionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlanId = searchParams.get('planId');

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'monthly' | 'package' | 'palliative'>('all');

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Subscribe Confirmation Modal State
  const [activePlan, setActivePlan] = useState<PlanItem | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load plans & check authentication
  useEffect(() => {
    let isMounted = true;

    async function fetchPlans() {
      setLoading(true);
      setError(null);
      try {
        // Try public patient route first
        let fetched: PlanItem[] = [];
        try {
          const res = await patientsApi.getCaregiverPlans();
          if (res && Array.isArray(res.data) && res.data.length > 0) {
            fetched = res.data;
          }
        } catch {
          // Fallback to admin/public catalog endpoint
          const adminRes = await adminApi.getCaregiverPlans();
          if (adminRes && Array.isArray(adminRes.data)) {
            fetched = adminRes.data;
          }
        }

        // Standardize plan data fields
        const normalized = fetched.map((p) => ({
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

          // If planId was passed in URL, forward to patient app handoff checkout
          if (initialPlanId) {
            router.push(`/subscriptions/checkout?planId=${encodeURIComponent(initialPlanId)}`);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to load active subscription plans');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchPlans();

    return () => {
      isMounted = false;
    };
  }, [initialPlanId, router]);

  // Handle plan selection -> Route to dedicated Patient App Handoff Checkout
  const handleSelectPlan = (plan: PlanItem) => {
    const planId = plan.id || plan._id || '';
    router.push(`/subscriptions/checkout?planId=${encodeURIComponent(planId)}`);
  };

  // Submit subscription activation
  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan) return;

    setSubmitting(true);
    setError(null);

    try {
      const planId = activePlan.id || activePlan._id;
      if (!planId) throw new Error('Invalid plan selection');

      const res = await patientsApi.activateSubscription({
        planId,
        emergencyContact: {
          name: patientName.trim(),
          phone: patientPhone.trim(),
          relation: 'Self/Family Contact',
        },
        carePlanNotes: `Delivery & Visit Address: ${address.trim()}. Requested Start Date: ${startDate}. ${notes.trim()}`,
        idempotencyKey: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      });

      const subData = res.data;
      setSuccessMessage(
        `Subscription confirmed for ${activePlan.title}! Reference: ${
          subData?.subscriptionNumber || 'SUB-ACTIVE'
        }. A dedicated caregiver will be assigned and synced with your Patient Mobile App.`
      );
      setActivePlan(null);
    } catch (err: any) {
      setError(err.message || 'Subscription activation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter plans
  const filteredPlans = plans.filter((p) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'monthly') return p.planType === 'monthly_subscription';
    if (selectedFilter === 'package') return p.planType === 'fixed_visit_package' || p.planType === 'fixed_package';
    if (selectedFilter === 'palliative') return p.category === 'palliative';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-[#10243E] via-[#17324D] to-[#1E3A5F] text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]" />
          
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-emerald-400 text-xs font-semibold backdrop-blur-md mb-6 border border-white/10">
              <ShieldCheck size={16} />
              <span>Verified Home Healthcare Clinicians • Kitchen Table Care</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Flexible Home Caregiver &amp; Nursing Subscriptions
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed">
              Compassionate bedside palliative care, licensed nursing visits, daily vital tracking, and real-time family updates via the VivoQuest Patient Mobile App.
            </p>

            {/* Filter Toggle Buttons */}
            <div className="mt-9 inline-flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 max-w-full">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  selectedFilter === 'all' ? 'bg-white text-navy shadow-md' : 'text-slate-200 hover:text-white'
                }`}
              >
                All Care Plans
              </button>
              <button
                onClick={() => setSelectedFilter('monthly')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  selectedFilter === 'monthly' ? 'bg-white text-navy shadow-md' : 'text-slate-200 hover:text-white'
                }`}
              >
                Monthly Subscriptions
              </button>
              <button
                onClick={() => setSelectedFilter('package')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  selectedFilter === 'package' ? 'bg-white text-navy shadow-md' : 'text-slate-200 hover:text-white'
                }`}
              >
                Fixed Visit Packages
              </button>
              <button
                onClick={() => setSelectedFilter('palliative')}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  selectedFilter === 'palliative' ? 'bg-white text-navy shadow-md' : 'text-slate-200 hover:text-white'
                }`}
              >
                Palliative Focus
              </button>
            </div>
          </div>
        </section>

        {/* Global Success / Error Banners */}
        {successMessage && (
          <div className="max-w-5xl mx-auto px-4 mt-8">
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">{successMessage}</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    View active plan metrics and scheduled visits anytime in{' '}
                    <Link href="/orders" className="underline font-bold hover:text-emerald-900">
                      My Orders &amp; Subscriptions
                    </Link>
                    .
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 p-1"
                aria-label="Dismiss message"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-5xl mx-auto px-4 mt-8">
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-sm font-medium flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 p-1">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Plans Grid Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy">
              Transparent, Quality-Assured Care Packages
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              No hidden admission fees or surprise charges. Switch or cancel monthly renewals anytime with 48 hours notice.
            </p>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-semibold text-slate-500">Loading verified caregiver plans...</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-border p-8 max-w-xl mx-auto">
              <HeartPulse size={40} className="text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-navy">No Caregiver Plans in this Category</h3>
              <p className="text-xs text-slate-500 mt-1">Please select &quot;All Care Plans&quot; to browse all available home health subscriptions.</p>
              <button
                onClick={() => setSelectedFilter('all')}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover transition"
              >
                View All Plans
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPlans.map((plan) => {
                const isMonthly = plan.planType === 'monthly_subscription';
                const isPopular = Boolean(plan.isPopular);

                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-3xl p-7 border transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1.5 ${
                      isPopular
                        ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                        : 'border-border shadow-sm hover:shadow-xl'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            isMonthly
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {isMonthly ? 'Monthly Care' : 'Flexible Block'}
                        </span>

                        {isPopular && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                            <Sparkles size={11} className="text-amber-600" />
                            Most Popular
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-black text-navy group-hover:text-primary transition-colors">
                        {plan.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        {plan.description ||
                          'Professional bedside home nursing, symptom management, medication adherence, and daily family reporting.'}
                      </p>

                      {/* Pricing Block */}
                      <div className="mt-5 pb-5 border-b border-border">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl sm:text-4xl font-black text-navy tracking-tight">
                            ₹{(Number(plan.customerPrice || plan.price || 0)).toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {isMonthly ? '/ 30 days' : '/ package'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-3 text-xs text-slate-600">
                          <div className="flex items-center gap-1 font-medium">
                            <Calendar size={14} className="text-primary" />
                            <span>{plan.totalVisitsIncluded} visits included</span>
                          </div>
                          <span className="text-slate-300">•</span>
                          <div className="flex items-center gap-1 font-medium">
                            <Clock size={14} className="text-primary" />
                            <span>{plan.hoursPerVisit} hrs / visit</span>
                          </div>
                        </div>
                      </div>

                      {/* Inclusions */}
                      <div className="mt-5 space-y-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Included Clinical Scope
                        </span>
                        {(plan.features && plan.features.length > 0
                          ? plan.features
                          : [
                              'Certified bedside nurse / trained caregiver',
                              'Daily vitals monitoring (BP, SpO2, Pulse, Temp)',
                              'Medication reminder & schedule adherence',
                              'Hygiene, mobility, and bed positioning assistance',
                              'Real-time daily reports via Patient Mobile App',
                              'Escalation to treating physician when needed',
                            ]
                        ).map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                            <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-snug">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-8 pt-5 border-t border-border">
                      <button
                        onClick={() => handleSelectPlan(plan)}
                        className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                          isPopular
                            ? 'bg-primary hover:bg-primary-hover text-white shadow-primary'
                            : 'bg-navy hover:bg-navy-light text-white'
                        }`}
                      >
                        <HeartPulse size={16} />
                        <span>Choose Plan &amp; Finalize in App &rarr;</span>
                      </button>
                      <p className="text-[11px] text-center text-slate-400 mt-2">
                        Mobile-first patient onboarding • Verified test mode
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Feature Comparison Matrix */}
        <section className="bg-white border-y border-border py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-navy">
                Plan Inclusions &amp; Safeguards Comparison
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                Every VivoQuest care subscription is backed by independent clinical governance and verified background checks.
              </p>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-border shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-navy">
                    <th className="py-4 px-5 font-bold uppercase text-[11px] tracking-wider w-1/3">Core Feature</th>
                    <th className="py-4 px-5 font-bold uppercase text-[11px] tracking-wider text-center">Basic Support</th>
                    <th className="py-4 px-5 font-bold uppercase text-[11px] tracking-wider text-center bg-primary-light text-primary">
                      Comprehensive Palliative
                    </th>
                    <th className="py-4 px-5 font-bold uppercase text-[11px] tracking-wider text-center">Intensive Nursing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-slate-700">
                  <tr>
                    <td className="py-3.5 px-5 font-medium">Police &amp; Nursing Qualification Verified Clinician</td>
                    <td className="py-3.5 px-5 text-center"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="py-3.5 px-5 text-center bg-primary-light/30"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="py-3.5 px-5 text-center"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-medium">Daily Bedside Vitals Logging (BP, Sugar, SpO2, Temp)</td>
                    <td className="py-3.5 px-5 text-center"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="py-3.5 px-5 text-center bg-primary-light/30"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="py-3.5 px-5 text-center"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-medium">Real-Time Mobile App Reports for Family</td>
                    <td className="py-3.5 px-5 text-center"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="py-3.5 px-5 text-center bg-primary-light/30"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="py-3.5 px-5 text-center"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-medium">Pain &amp; Symptom Severity Scale Tracking</td>
                    <td className="py-3.5 px-5 text-center text-slate-300">—</td>
                    <td className="py-3.5 px-5 text-center bg-primary-light/30"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="py-3.5 px-5 text-center"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-medium">Doctor Teleconsult Escalation &amp; Prescriptions</td>
                    <td className="py-3.5 px-5 text-center text-slate-300">—</td>
                    <td className="py-3.5 px-5 text-center bg-primary-light/30"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="py-3.5 px-5 text-center"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-medium">Dedicated Clinical Care Coordinator</td>
                    <td className="py-3.5 px-5 text-center text-slate-300">—</td>
                    <td className="py-3.5 px-5 text-center bg-primary-light/30"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="py-3.5 px-5 text-center"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-medium">Medical Equipment (DME) Delivery Coordination</td>
                    <td className="py-3.5 px-5 text-center"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="py-3.5 px-5 text-center bg-primary-light/30"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="py-3.5 px-5 text-center"><Check size={16} className="text-emerald-500 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Patient Onboarding Journey</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy mt-1">
              How Your Home Care Subscription Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-border text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-black text-base mx-auto mb-4 border border-teal-100">
                1
              </div>
              <h3 className="font-bold text-sm text-navy">Choose Your Care Plan</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Select monthly care or flexible visit blocks tailored to your loved one&apos;s daily requirements.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-border text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-base mx-auto mb-4 border border-blue-100">
                2
              </div>
              <h3 className="font-bold text-sm text-navy">Clinical Intake &amp; Match</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Our clinical desk reviews mobility, medical notes, and assigns a verified caregiver within 24 hours.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-border text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-base mx-auto mb-4 border border-indigo-100">
                3
              </div>
              <h3 className="font-bold text-sm text-navy">Bedside Visits &amp; Care</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Caregiver arrives on schedule for routine vitals charting, hygiene, mobility, and medication reminders.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-border text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-base mx-auto mb-4 border border-emerald-100">
                4
              </div>
              <h3 className="font-bold text-sm text-navy">Mobile Real-Time Reports</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Family members view daily nursing notes and vitals trends in real time on the Patient Mobile App.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="bg-slate-100/70 py-16 px-4 sm:px-6 lg:px-8 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-extrabold text-navy">Frequently Asked Questions</h2>
              <p className="text-xs text-slate-500 mt-1">Everything you need to know before subscribing</p>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs">
                <h3 className="font-bold text-sm text-navy">How quickly can care begin once I subscribe?</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Care typically begins within 24 to 48 hours following a brief clinical intake call with our operations desk to understand your patient&apos;s specific needs and mobility conditions.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs">
                <h3 className="font-bold text-sm text-navy">Can I pause or reschedule scheduled caregiver visits?</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Yes. You can manage, reschedule, or temporarily pause visits directly via the VivoQuest Patient Mobile App or by contacting our 24/7 care desk with 24 hours notice.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs">
                <h3 className="font-bold text-sm text-navy">How do family members access daily vitals and reports?</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Every caregiver logs visit details and vitals directly into the system. Families log in to the VivoQuest Patient App to see visit check-ins, vitals history graphs, and clinical observations.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs">
                <h3 className="font-bold text-sm text-navy">Is payment secure?</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  All online payments are processed through Razorpay Sandbox with full test isolation, transparent invoicing, and zero automatic rollover lock-ins.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Subscription Confirmation Modal */}
      {activePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-border animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                  <HeartPulse size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-navy">Confirm Subscription</h3>
                  <p className="text-xs text-slate-500">{activePlan.title}</p>
                </div>
              </div>
              <button
                onClick={() => setActivePlan(null)}
                className="text-slate-400 hover:text-slate-600 p-1 transition"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Price & Summary Box */}
            <div className="bg-slate-50 rounded-2xl p-4 my-5 border border-border text-xs space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500">Plan Amount:</span>
                <span className="font-black text-navy text-base">
                  ₹{(Number(activePlan.customerPrice || activePlan.price || 0)).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Included Visits:</span>
                <span className="font-semibold text-slate-800">
                  {activePlan.totalVisitsIncluded} Home Visits ({activePlan.hoursPerVisit} hrs/visit)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Gateway:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                  Razorpay Sandbox (TEST MODE)
                </span>
              </div>
            </div>

            <form onSubmit={handleSubscribeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Patient Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Emergency / Family Contact Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="e.g. +91 98200 12345"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Home Bedside Visit Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Flat/House number, building name, street, area, city, pincode..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Requested Care Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Care Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Bedridden, diabetic"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-5">
                <button
                  type="button"
                  onClick={() => setActivePlan(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover transition disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"
                >
                  {submitting ? (
                    <span>Activating Subscription...</span>
                  ) : (
                    <>
                      <CreditCard size={14} />
                      <span>Confirm &amp; Subscribe (₹{(Number(activePlan.customerPrice || activePlan.price || 0)).toLocaleString('en-IN')})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-semibold text-slate-500">Loading subscriptions...</div>}>
      <SubscriptionsContent />
    </Suspense>
  );
}
