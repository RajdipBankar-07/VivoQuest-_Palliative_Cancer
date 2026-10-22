'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { adminApi, authApi } from '@/lib/api';

export default function CaregiverPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanType, setSelectedPlanType] = useState<'all' | 'monthly_subscription' | 'fixed_package'>('all');

  // Checkout / Subscribe Modal
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlans() {
      setLoading(true);
      try {
        const res = await adminApi.getCaregiverPlans();
        if (res && res.data) {
          setPlans(res.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load caregiver plans');
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSubscribing(true);
    setError(null);

    try {
      // Simulate Razorpay Mock Checkout
      await new Promise((resolve) => setTimeout(resolve, 800));

      setSubscriptionSuccess(
        `Subscription confirmed for ${selectedPlan.name}! A dedicated palliative care coordinator will call ${patientPhone} to confirm your assigned caregiver.`
      );
      setSelectedPlan(null);
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed');
    } finally {
      setSubscribing(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (selectedPlanType === 'all') return true;
    return p.planType === selectedPlanType;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-navy via-navy to-slate-900 text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="max-w-3xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-emerald-400 text-xs font-semibold backdrop-blur-md mb-6 border border-white/10">
              <ShieldCheck size={14} />
              <span>Certified Healthcare Professionals • Kitchen Table Care</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Compassionate Home Caregiver &amp; Nursing Subscriptions
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Dedicated palliative nurses and trained caregivers at your bedside. Daily vitals logging, symptom management, medication adherence, and real-time family updates via the VivoQuest Patient App.
            </p>

            {/* Filter Toggle */}
            <div className="mt-8 inline-flex p-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <button
                onClick={() => setSelectedPlanType('all')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
                  selectedPlanType === 'all' ? 'bg-white text-navy shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                All Care Plans
              </button>
              <button
                onClick={() => setSelectedPlanType('monthly_subscription')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
                  selectedPlanType === 'monthly_subscription'
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Monthly Subscriptions
              </button>
              <button
                onClick={() => setSelectedPlanType('fixed_package')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
                  selectedPlanType === 'fixed_package'
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Fixed Visit Packages
              </button>
            </div>
          </div>
        </section>

        {/* Success / Alert Banner */}
        {subscriptionSuccess && (
          <div className="max-w-4xl mx-auto px-4 mt-8">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>{subscriptionSuccess}</span>
              </div>
              <button
                onClick={() => setSubscriptionSuccess(null)}
                className="text-emerald-600 hover:text-emerald-800 font-bold ml-4"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Loading available palliative care plans...
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No caregiver plans currently published under this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPlans.map((plan) => {
                const isMonthly = plan.planType === 'monthly_subscription';

                return (
                  <div
                    key={plan._id}
                    className="bg-white rounded-3xl p-7 border border-border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
                  >
                    <div>
                      {/* Badge & Type */}
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            isMonthly
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {isMonthly ? 'Monthly Subscription' : 'Flexible Package'}
                        </span>

                        <span className="text-[11px] font-bold text-slate-400">
                          {plan.visitsPerMonth ? `${plan.visitsPerMonth} Visits/Mo` : `${plan.totalVisits} Total Visits`}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-xl font-bold text-navy group-hover:text-primary transition-colors">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        {plan.description}
                      </p>

                      {/* Pricing */}
                      <div className="mt-5 pb-5 border-b border-border">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-navy">
                            ₹{plan.price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {isMonthly ? '/ month' : ' / complete package'}
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                          <Check size={12} />
                          Includes verified caregiver match &amp; daily vitals reporting
                        </div>
                      </div>

                      {/* Features Included */}
                      <div className="mt-5 space-y-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          What is Included
                        </span>
                        {(plan.features || [
                          'Daily bed care & hygiene support',
                          'Vitals recording (BP, Pulse, SpO2, Temp)',
                          'Pain scale tracking & doctor escalation',
                          'Medication reminder and logging',
                          'Access to Patient Mobile App daily reports',
                        ]).map((f: string, fIdx: number) => (
                          <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-700">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-8 pt-4 border-t border-border">
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setPatientName('');
                          setPatientPhone('');
                          setAddress('');
                        }}
                        className="w-full py-3 rounded-2xl text-xs font-bold bg-navy hover:bg-navy-light text-white transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        <HeartPulse size={16} />
                        <span>Select Plan &amp; Assign Caregiver</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Trust & Safeguards Banner */}
        <section className="bg-white border-y border-border py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                <Stethoscope size={24} />
              </div>
              <div>
                <h4 className="font-bold text-navy text-sm">Background Verified Clinicians</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Every caregiver undergoes nursing certificate validation and police background verification.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <Activity size={24} />
              </div>
              <div>
                <h4 className="font-bold text-navy text-sm">Real-Time Mobile Daily Reports</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Observations, vitals graphs, and nursing notes synced seamlessly to the Patient Mobile App.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                <CreditCard size={24} />
              </div>
              <div>
                <h4 className="font-bold text-navy text-sm">Safe &amp; Transparent Billing</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Secure Razorpay payments with transparent monthly invoicing and zero hidden cancellation fees.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Checkout / Subscription Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-border animate-scale-up">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                  <HeartPulse size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy">Subscribe to Caregiver Plan</h3>
                  <p className="text-xs text-slate-500">{selectedPlan.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 my-5 border border-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Subscription Amount:</span>
                <span className="font-black text-navy text-sm">₹{selectedPlan.price.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan Allocation:</span>
                <span className="font-semibold text-slate-800">
                  {selectedPlan.visitsPerMonth ? `${selectedPlan.visitsPerMonth} Home Visits / Month` : `${selectedPlan.totalVisits} Home Visits`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Gateway:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Razorpay Sandbox (TEST)
                </span>
              </div>
            </div>

            <form onSubmit={handleSubscribeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Anand Kulkarni"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Primary Contact Phone (For Caregiver Coordination) *
                </label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="e.g. +91 98200 11000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Home Delivery &amp; Bedside Visit Address *
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Flat/House number, building, landmark, area, city, pincode..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Requested Care Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subscribing}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-navy hover:bg-navy-light transition disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {subscribing ? (
                    <span>Processing Sandbox Payment...</span>
                  ) : (
                    <>
                      <CreditCard size={14} />
                      <span>Confirm &amp; Subscribe (₹{selectedPlan.price.toLocaleString('en-IN')})</span>
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
