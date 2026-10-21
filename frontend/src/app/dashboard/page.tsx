'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  Calendar,
  Clock,
  MapPin,
  Package,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Building2,
  Phone,
  RefreshCw,
  ShoppingBag,
  Truck,
  Plus,
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  X,
  FileText,
  UserCheck,
  HeartPulse,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { appointmentsApi, productsApi, authApi, patientsApi, ApiClientError } from '@/lib/api';

export default function PatientDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [healthUpdates, setHealthUpdates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'care_plan' | 'products' | 'orders' | 'health_log'>('care_plan');

  // Daily health update state
  const [spO2Input, setSpO2Input] = useState<string>('97');
  const [bpInput, setBpInput] = useState<string>('120/80');
  const [pulseInput, setPulseInput] = useState<string>('76');
  const [tempInput, setTempInput] = useState<string>('98.4');
  const [painInput, setPainInput] = useState<string>('2');
  const [symptomsInput, setSymptomsInput] = useState<string>('Mild joint stiffness in morning');
  const [notesInput, setNotesInput] = useState<string>('Feeling comfortable after physical therapy exercises.');
  const [isSubmittingHealthUpdate, setIsSubmittingHealthUpdate] = useState(false);
  const [healthUpdateSuccessMsg, setHealthUpdateSuccessMsg] = useState<string | null>(null);

  // Order modal state
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<any | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderIsRental, setOrderIsRental] = useState(false);
  const [orderStreet, setOrderStreet] = useState('Flat 402, Mayur Residency, Kothrud');
  const [orderCity, setOrderCity] = useState('Pune');
  const [orderPincode, setOrderPincode] = useState('411038');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  const loadPatientData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let storedUser = authApi.getStoredUser();
      let token = authApi.getToken();

      // Auto-authenticate as demo patient if no session
      if (!token || !storedUser) {
        const loginRes = await authApi.login({
          identifier: '9810011111', // Seeded Patient Ramesh Kulkarni
          otp: '123456',
          role: 'patient',
        });
        storedUser = loginRes.user;
      }

      setCurrentUser(storedUser);

      // Load appointments, products, patient orders, and health updates in parallel
      const [aptsData, prodsData, ordersData, updatesData] = await Promise.all([
        appointmentsApi.getMyAppointments().catch(() => []),
        productsApi.getProducts({ limit: 6 }).catch(() => ({ data: [] })),
        productsApi.getMyOrders().catch(() => []),
        patientsApi.getMyHealthUpdates().catch(() => []),
      ]);

      setAppointments(aptsData || []);
      setRecommendedProducts(prodsData?.data || []);
      setRecentOrders(ordersData || []);
      setHealthUpdates(updatesData || []);
    } catch (err: any) {
      console.error('Failed to load patient dashboard:', err);
      setError(err.message || 'Unable to connect to healthcare services');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, []);

  const handlePlaceOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForOrder) return;

    setOrderSubmitting(true);
    setError(null);
    try {
      await productsApi.placeOrder({
        items: [
          {
            productId: selectedProductForOrder.id || selectedProductForOrder._id,
            quantity: orderQuantity,
            isRental: orderIsRental,
            rentalDurationMonths: orderIsRental ? 1 : undefined,
          },
        ],
        deliveryAddress: {
          street: orderStreet,
          city: orderCity,
          pincode: orderPincode,
          contactPhone: currentUser?.phone || '9810011111',
        },
        paymentMethod: 'cod',
      });

      setOrderSuccessMsg(
        `Order placed for ${selectedProductForOrder.title}. Dispatched from nearest local depot!`
      );
      setSelectedProductForOrder(null);
      // Refresh orders
      const updatedOrders = await productsApi.getMyOrders().catch(() => []);
      setRecentOrders(updatedOrders);
      setActiveTab('orders');
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleHealthUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingHealthUpdate(true);
    setHealthUpdateSuccessMsg(null);
    try {
      await patientsApi.submitHealthUpdate({
        submitterName: currentUser?.fullName || 'Patient',
        relationship: 'patient',
        symptoms: symptomsInput ? symptomsInput.split(',').map((s) => s.trim()).filter(Boolean) : [],
        notes: notesInput.trim() || undefined,
        vitals: {
          spO2: spO2Input ? Number(spO2Input) : undefined,
          bloodPressure: bpInput.trim() || undefined,
          pulse: pulseInput ? Number(pulseInput) : undefined,
          temperature: tempInput ? Number(tempInput) : undefined,
          painScale: painInput ? Number(painInput) : undefined,
        },
      });
      setHealthUpdateSuccessMsg('Daily vitals and symptoms recorded successfully. Your clinical care team has been notified.');
      const updated = await patientsApi.getMyHealthUpdates().catch(() => []);
      setHealthUpdates(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to submit health log');
    } finally {
      setIsSubmittingHealthUpdate(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} />
            DELIVERED
          </span>
        );
      case 'out_for_delivery':
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-primary border border-blue-200">
            <Truck size={12} />
            IN TRANSIT
          </span>
        );
      case 'placed':
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} />
            PROCESSING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-navy">
      <Navbar />

      {/* Hero / Patient Care Status Banner */}
      <div className="bg-navy text-white py-8 px-4 sm:px-6 lg:px-8 border-b border-navy-light/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-secondary text-white uppercase tracking-wider">
                Post-Discharge Care Portal
              </span>
              <span className="text-xs text-slate-300">Closed-Loop Home Care &amp; DME</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {currentUser?.fullName || 'Ramesh Kulkarni'}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Track your home visits, follow-up specialist consultations, and order hospital-recommended medical equipment right to your kitchen table.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/appointments"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition-colors flex items-center gap-2 shadow-sm"
            >
              <Calendar size={15} />
              Book Care Appointment
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPatientData}
              disabled={isLoading}
              className="bg-navy-light/50 border-white/20 text-white hover:bg-white/10 flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Sync Dossier
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Notice Alerts */}
        {orderSuccessMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Order Placed Successfully</p>
                <p className="text-xs mt-0.5 text-emerald-700">{orderSuccessMsg}</p>
              </div>
            </div>
            <button onClick={() => setOrderSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800">
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">System Notice</p>
                <p className="text-xs mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Quick KPI Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Scheduled Visits</div>
              <div className="text-2xl font-black text-navy mt-1">
                {appointments.filter((a) => ['confirmed', 'in_progress', 'pending'].includes(a.status)).length}
              </div>
              <div className="text-xs text-primary font-semibold mt-1">Confirmed appointments</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
              <Calendar size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">DME &amp; Product Orders</div>
              <div className="text-2xl font-black text-navy mt-1">{recentOrders.length}</div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">Medical supplies active</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-secondary flex items-center justify-center">
              <Package size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fall Risk Status</div>
              <div className="text-2xl font-black text-navy mt-1">AUDITED</div>
              <div className="text-xs text-amber-600 font-semibold mt-1">Shower grab bar recommended</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Originating Hospital</div>
              <div className="text-base font-bold text-navy mt-1 truncate max-w-[150px]">
                Ruby Hall Clinic
              </div>
              <div className="text-xs text-slate-500 mt-1">Oncology Discharge Lead</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 size={24} />
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-1.5 mb-8 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('care_plan')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'care_plan'
                ? 'bg-navy text-white shadow-sm'
                : 'text-slate-600 hover:text-navy hover:bg-slate-100'
            }`}
          >
            <Activity size={16} />
            <span>Care Plan &amp; Visits</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-white/20">
              {appointments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'products'
                ? 'bg-navy text-white shadow-sm'
                : 'text-slate-600 hover:text-navy hover:bg-slate-100'
            }`}
          >
            <ShoppingBag size={16} />
            <span>Medical Equipment &amp; Products</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Catalog Active
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'orders'
                ? 'bg-navy text-white shadow-sm'
                : 'text-slate-600 hover:text-navy hover:bg-slate-100'
            }`}
          >
            <Truck size={16} />
            <span>Order History &amp; Setup Tracking</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-primary">
              {recentOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('health_log')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'health_log'
                ? 'bg-navy text-white shadow-sm'
                : 'text-slate-600 hover:text-navy hover:bg-slate-100'
            }`}
          >
            <HeartPulse size={16} />
            <span>Daily Vitals &amp; Health Log</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
              {healthUpdates.length}
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: CARE PLAN & APPOINTMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'care_plan' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-navy">Scheduled Home &amp; Specialist Appointments</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your post-discharge multidisciplinary visits (physiotherapy, vitals review, teleconsultation).
                  </p>
                </div>
                <Link
                  href="/appointments"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  Manage All Appointments <ArrowRight size={14} />
                </Link>
              </div>

              {appointments.length > 0 ? (
                <div className="divide-y divide-border">
                  {appointments.slice(0, 5).map((apt) => (
                    <div key={apt._id || apt.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
                          <Stethoscope size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-navy text-sm">
                            {apt.serviceId?.name || apt.specialty || 'Post-Discharge Review'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar size={13} />
                              {new Date(apt.appointmentDate || apt.scheduledDate).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={13} />
                              {apt.timeSlot || '10:00 AM'}
                            </span>
                            {apt.doctorId?.fullName && (
                              <span>Doctor: <strong>{apt.doctorId.fullName}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                          {apt.status}
                        </span>
                        <Link
                          href={`/appointments/${apt._id || apt.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-light text-primary hover:bg-primary hover:text-white transition-colors"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
                  No upcoming appointments scheduled yet.
                  <div className="mt-3">
                    <Link
                      href="/doctors"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-hover"
                    >
                      Find a Doctor Specialist →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MEDICAL PRODUCTS & DME CATALOG */}
        {/* ========================================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-navy">Medical Products &amp; DME Home Equipment</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Order or rent hospital-grade equipment with closed-loop setup by certified technicians right at your kitchen table.
                  </p>
                </div>
                <div className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  ✓ Pre-screened for SDoH &amp; Readmission Prevention
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedProducts.map((p) => (
                  <div
                    key={p._id || p.id}
                    className="p-5 rounded-2xl border border-border bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div>
                      {p.badge && (
                        <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-primary uppercase mb-2">
                          {p.badge}
                        </span>
                      )}
                      <h3 className="font-bold text-navy text-sm">{p.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-border/80 flex items-baseline justify-between">
                        <div>
                          <div className="text-base font-black text-navy">₹{p.price}</div>
                          {p.isRentalAvailable && p.rentalPriceMonthly && (
                            <div className="text-[11px] text-slate-500">
                              or rent for ₹{p.rentalPriceMonthly}/month
                            </div>
                          )}
                        </div>

                        {p.setupRequiredByClinician && (
                          <span className="text-[10px] font-semibold text-secondary bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            Includes Home Setup
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedProductForOrder(p);
                        setOrderIsRental(false);
                        setOrderQuantity(1);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-navy hover:bg-navy-light text-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag size={14} />
                      Order / Rent to Home
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Placement Modal */}
            {selectedProductForOrder && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <h3 className="font-bold text-lg text-navy">
                      Order: {selectedProductForOrder.title}
                    </h3>
                    <button onClick={() => setSelectedProductForOrder(null)} className="text-slate-400 hover:text-navy">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handlePlaceOrderSubmit} className="space-y-4 pt-4 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-border space-y-1">
                      <div className="flex justify-between font-bold text-navy">
                        <span>SKU: {selectedProductForOrder.sku}</span>
                        <span>Price: ₹{selectedProductForOrder.price}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{selectedProductForOrder.description}</p>
                      {selectedProductForOrder.setupRequiredByClinician && (
                        <div className="mt-2 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          A certified {selectedProductForOrder.recommendedSpecialistRole || 'technician'} will be dispatched to set up and calibrate this equipment at your kitchen table.
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-navy mb-1">Quantity:</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={orderQuantity}
                          onChange={(e) => setOrderQuantity(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                        />
                      </div>
                      {selectedProductForOrder.isRentalAvailable && (
                        <div>
                          <label className="block font-semibold text-navy mb-1">Acquisition Model:</label>
                          <select
                            value={orderIsRental ? 'rent' : 'buy'}
                            onChange={(e) => setOrderIsRental(e.target.value === 'rent')}
                            className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                          >
                            <option value="buy">Purchase (₹{selectedProductForOrder.price})</option>
                            <option value="rent">Monthly Rental (₹{selectedProductForOrder.rentalPriceMonthly}/mo)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-navy mb-1">Delivery Street Address:</label>
                      <input
                        type="text"
                        required
                        value={orderStreet}
                        onChange={(e) => setOrderStreet(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-navy mb-1">City:</label>
                        <input
                          type="text"
                          required
                          value={orderCity}
                          onChange={(e) => setOrderCity(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-navy mb-1">Pincode:</label>
                        <input
                          type="text"
                          required
                          value={orderPincode}
                          onChange={(e) => setOrderPincode(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProductForOrder(null)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={orderSubmitting}>
                        {orderSubmitting ? 'Placing Order...' : 'Confirm Delivery Order'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ORDER HISTORY & SETUP TRACKING */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-navy">Your Medical Product Orders &amp; Delivery Tracking</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time status of hospital-coordinated equipment dispatches and in-home setup.
                  </p>
                </div>
              </div>

              {recentOrders.length > 0 ? (
                <div className="divide-y divide-border">
                  {recentOrders.map((ord) => (
                    <div key={ord._id || ord.id} className="py-4 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-navy text-sm">
                            {ord.orderNumber}
                          </span>
                          {getOrderStatusBadge(ord.orderStatus)}
                          {ord.clinicalSetup?.isSetupRequired && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                              Setup: {ord.clinicalSetup.setupStatus.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-navy">
                          Total: ₹{ord.pricing?.totalAmount ?? 0}
                        </div>
                      </div>

                      <div className="text-xs text-slate-600">
                        Items:{' '}
                        <strong>
                          {ord.items?.map((i: any) => `${i.title} (x${i.quantity})`).join(', ')}
                        </strong>
                      </div>

                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                        <span>Delivery to: {ord.deliveryAddress?.city} ({ord.deliveryAddress?.pincode})</span>
                        <span>•</span>
                        <span>Placed on: {new Date(ord.createdAt).toLocaleDateString()}</span>
                      </div>

                      {ord.clinicalSetup?.setupNotes && (
                        <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-border text-slate-700">
                          <strong>Clinician Setup Directive:</strong> {ord.clinicalSetup.setupNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Package size={32} className="mx-auto text-slate-300 mb-2" />
                  No medical equipment or product orders placed yet.
                  <div className="mt-3">
                    <button
                      onClick={() => setActiveTab('products')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-navy text-white hover:bg-navy-light"
                    >
                      Browse Medical Products →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DAILY VITALS & HEALTH LOG */}
        {/* ========================================================================= */}
        {activeTab === 'health_log' && (
          <div className="space-y-6">
            {healthUpdateSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{healthUpdateSuccessMsg}</span>
                </div>
                <button onClick={() => setHealthUpdateSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Form to submit daily vitals */}
              <div className="lg:col-span-1 bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <HeartPulse size={20} className="text-primary" />
                  <div>
                    <h3 className="text-base font-bold text-navy">Record Daily Vitals</h3>
                    <p className="text-[11px] text-slate-500">Submit symptoms &amp; health updates</p>
                  </div>
                </div>

                <form onSubmit={handleHealthUpdateSubmit} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">SpO2 (%)</label>
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={spO2Input}
                        onChange={(e) => setSpO2Input(e.target.value)}
                        placeholder="e.g. 98"
                        className="w-full p-2 rounded-xl border border-border text-xs focus:outline-hidden focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Blood Pressure</label>
                      <input
                        type="text"
                        value={bpInput}
                        onChange={(e) => setBpInput(e.target.value)}
                        placeholder="e.g. 120/80"
                        className="w-full p-2 rounded-xl border border-border text-xs focus:outline-hidden focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pulse (bpm)</label>
                      <input
                        type="number"
                        value={pulseInput}
                        onChange={(e) => setPulseInput(e.target.value)}
                        placeholder="75"
                        className="w-full p-2 rounded-xl border border-border text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Temp (°F)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={tempInput}
                        onChange={(e) => setTempInput(e.target.value)}
                        placeholder="98.4"
                        className="w-full p-2 rounded-xl border border-border text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pain (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={painInput}
                        onChange={(e) => setPainInput(e.target.value)}
                        placeholder="2"
                        className="w-full p-2 rounded-xl border border-border text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Symptoms (Comma-separated)</label>
                    <input
                      type="text"
                      value={symptomsInput}
                      onChange={(e) => setSymptomsInput(e.target.value)}
                      placeholder="e.g. Mild breathlessness, fatigue"
                      className="w-full p-2 rounded-xl border border-border text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Care Notes</label>
                    <textarea
                      rows={2}
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      placeholder="Any notes for your assigned specialist..."
                      className="w-full p-2 rounded-xl border border-border text-xs"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    Patient-reported measurements are not clinically verified until reviewed by your assigned clinician. For emergencies, dial 112 / 108.
                  </p>

                  <button
                    type="submit"
                    disabled={isSubmittingHealthUpdate}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {isSubmittingHealthUpdate ? 'Submitting...' : 'Submit Daily Health Update'}
                  </button>
                </form>
              </div>

              {/* Right Column: Timeline of submissions and clinician reviews */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-base font-bold text-navy">Health Logs &amp; Clinician Feedback</h3>
                  <span className="text-xs text-slate-500">{healthUpdates.length} updates logged</span>
                </div>

                {healthUpdates.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    <HeartPulse size={32} className="mx-auto text-slate-300 mb-2" />
                    No daily health updates recorded yet. Submit your first update using the form on the left.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {healthUpdates.map((u: any) => (
                      <div key={u.id || u._id} className="p-4 rounded-xl bg-slate-50 border border-border text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy">
                            {new Date(u.submittedAt).toLocaleDateString()} at{' '}
                            {new Date(u.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.reviewStatus === 'reviewed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.reviewStatus === 'follow_up_required'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {u.reviewStatus === 'new' ? 'Pending Clinician Review' : u.reviewStatus?.replace('_', ' ')}
                          </span>
                        </div>

                        {u.vitals && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-700">
                            {u.vitals.spO2 && (
                              <span className="px-2 py-0.5 rounded bg-white border border-border">
                                SpO2: {u.vitals.spO2}%
                              </span>
                            )}
                            {u.vitals.bloodPressure && (
                              <span className="px-2 py-0.5 rounded bg-white border border-border">
                                BP: {u.vitals.bloodPressure}
                              </span>
                            )}
                            {u.vitals.pulse && (
                              <span className="px-2 py-0.5 rounded bg-white border border-border">
                                Pulse: {u.vitals.pulse} bpm
                              </span>
                            )}
                            {u.vitals.temperature && (
                              <span className="px-2 py-0.5 rounded bg-white border border-border">
                                Temp: {u.vitals.temperature}°F
                              </span>
                            )}
                            {u.vitals.painScale && (
                              <span className="px-2 py-0.5 rounded bg-white border border-border">
                                Pain: {u.vitals.painScale}/10
                              </span>
                            )}
                          </div>
                        )}

                        {u.symptoms?.length > 0 && (
                          <div className="text-slate-600">
                            <strong>Symptoms:</strong> {u.symptoms.join(', ')}
                          </div>
                        )}

                        {u.notes && (
                          <div className="text-slate-500 italic">
                            "{u.notes}"
                          </div>
                        )}

                        {u.clinicianNotes && (
                          <div className="mt-2 p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-xs">
                            <strong className="text-primary block mb-0.5">
                              Clinician Advice ({u.reviewedBy?.fullName || 'Assigned Specialist'}):
                            </strong>
                            <p className="text-slate-700">{u.clinicianNotes}</p>
                            {u.followUpAction && (
                              <p className="text-emerald-800 font-semibold mt-1">Action: {u.followUpAction}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
