'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Wrench,
  CreditCard,
  Building2,
  Calendar,
  X,
  FileText,
  MapPin,
  ShieldCheck,
  RefreshCw,
  Phone,
  RotateCcw,
  Sparkles,
  Info,
  ShoppingBag,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { productsApi } from '@/lib/api';

export default function OrderTrackingDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const idOrNumber = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Doctor revised prescription');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Return Request Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('Patient recovered early / equipment unneeded');
  const [isReturning, setIsReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Setup Reschedule Modal State
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupDate, setSetupDate] = useState('');
  const [setupSlot, setSetupSlot] = useState('Morning (9:00 AM - 1:00 PM)');
  const [setupNotes, setSetupNotes] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await productsApi.getOrderById(idOrNumber);
      if (data) {
        setOrder(data);
        if (data.clinicalSetup?.setupDate) {
          setSetupDate(new Date(data.clinicalSetup.setupDate).toISOString().split('T')[0]);
        }
      } else {
        setError('Order not found');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve order tracking data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (idOrNumber) {
      fetchOrder();
    }
  }, [idOrNumber]);

  // Order Cancellation Handler
  const handleCancelOrder = async () => {
    try {
      setIsCancelling(true);
      setCancelError(null);
      const res = await productsApi.cancelOrder(order._id || order.orderNumber, cancelReason);
      if (res && res.data) {
        setOrder(res.data);
        setIsCancelModalOpen(false);
      }
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Return Request Handler
  const handleReturnRequest = async () => {
    try {
      setIsReturning(true);
      setReturnError(null);
      const res = await productsApi.requestReturn(order._id || order.orderNumber, returnReason);
      if (res && res.data) {
        setOrder(res.data);
        setIsReturnModalOpen(false);
      }
    } catch (err: any) {
      setReturnError(err.message || 'Failed to submit return request.');
    } finally {
      setIsReturning(false);
    }
  };

  // Clinician Setup Rescheduling Handler
  const handleRescheduleSetup = async () => {
    if (!setupDate) {
      setSetupError('Please select a preferred date for clinical setup');
      return;
    }

    try {
      setIsRescheduling(true);
      setSetupError(null);
      const res = await productsApi.scheduleClinicianSetup(order._id || order.orderNumber, {
        setupDate,
        setupSlot,
        setupNotes,
      });
      if (res && res.data) {
        setOrder(res.data);
        setIsSetupModalOpen(false);
      }
    } catch (err: any) {
      setSetupError(err.message || 'Failed to update setup appointment.');
    } finally {
      setIsRescheduling(false);
    }
  };

  // Payment Verification for Pending Online Orders
  const handleVerifyPayment = async () => {
    try {
      setIsVerifyingPayment(true);
      const rzpOrderId =
        order.paymentDetails?.razorpayOrderId || `rzp_test_ord_${order.orderNumber}_${Date.now()}`;
      const rzpPaymentId = `pay_sim_${Date.now()}`;
      const rzpSignature = `test_sig_${rzpOrderId}_${rzpPaymentId}`;

      const res = await productsApi.verifyPayment({
        orderId: order._id || order.orderNumber,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: rzpSignature,
      });

      if (res && res.data) {
        setOrder(res.data);
        setIsPaymentModalOpen(false);
      }
    } catch (err: any) {
      alert(err.message || 'Payment verification failed');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-pulse space-y-6">
          <div className="w-1/3 h-6 bg-slate-200 rounded" />
          <div className="w-full h-48 bg-slate-200 rounded-2xl" />
          <div className="w-full h-64 bg-slate-200 rounded-2xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <AlertTriangle size={36} className="text-red-500 mb-3" />
          <h1 className="text-xl font-bold text-navy mb-2">Order Not Found</h1>
          <p className="text-xs text-muted-foreground mb-6">
            {error || 'Unable to load order details. Please verify your order number.'}
          </p>
          <Button href="/orders" variant="primary" size="md" leftIcon={<ArrowLeft size={16} />}>
            Back to My Orders
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  // Defined Policy Conditions
  const isCancellable = ['placed', 'confirmed'].includes(order.orderStatus);
  const isDispatchedOrDelivered = ['dispatched', 'out_for_delivery', 'delivered', 'completed'].includes(
    order.orderStatus
  );
  const isReturnable = order.orderStatus === 'delivered' && !order.returnDetails?.isReturnRequested;
  const requiresSetup = order.clinicalSetup?.isSetupRequired;

  // Timeline Steps
  const timelineStages = [
    { key: 'placed', label: 'Order Placed' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'completed', label: 'Completed' },
  ];

  const getStageIndex = (status: string) => {
    if (status === 'cancelled') return -1;
    return timelineStages.findIndex((s) => s.key === status);
  };

  const currentStageIndex = getStageIndex(order.orderStatus);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 pb-20 pt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Link
                href="/orders"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-navy transition-colors mb-2"
              >
                <ArrowLeft size={14} />
                <span>Back to My Orders</span>
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
                  {order.orderNumber}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    order.orderStatus === 'delivered' || order.orderStatus === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.orderStatus === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {order.orderStatus?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ordered on {new Date(order.createdAt).toLocaleString('en-IN')}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {order.paymentStatus === 'pending' && order.orderStatus !== 'cancelled' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsPaymentModalOpen(true)}
                  leftIcon={<CreditCard size={14} />}
                >
                  Pay Online (₹{order.pricing?.totalAmount?.toLocaleString('en-IN')})
                </Button>
              )}

              {isCancellable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setIsCancelModalOpen(true)}
                >
                  Cancel Order
                </Button>
              )}

              {isReturnable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-700 border-amber-200 hover:bg-amber-50"
                  onClick={() => setIsReturnModalOpen(true)}
                  leftIcon={<RotateCcw size={14} />}
                >
                  Request Return
                </Button>
              )}
            </div>
          </div>

          {/* Cancellation Policy Banner when Direct Cancel is locked */}
          {isDispatchedOrDelivered && order.orderStatus !== 'cancelled' && (
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-slate-500 shrink-0" />
                <span>
                  <strong>Order Policy:</strong> Equipment is in transit or delivered. Direct cancellation is
                  locked to prevent delivery disruption. Returns may be requested upon inspection.
                </span>
              </div>
            </div>
          )}

          {/* Cancelled Alert Box */}
          {order.orderStatus === 'cancelled' && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-sm text-red-800">
                <AlertTriangle size={16} />
                Order Cancelled
              </p>
              <p>
                Reason:{' '}
                <span className="font-semibold">
                  {order.cancellation?.cancellationReason || 'Cancelled upon request'}
                </span>
              </p>
              {order.cancellation?.refundStatus !== 'none' && (
                <p className="text-[11px] text-red-700">
                  Refund Status: <span className="font-bold uppercase">{order.cancellation?.refundStatus}</span>{' '}
                  (Processed back to original payment method within 3 business days)
                </p>
              )}
            </div>
          )}

          {/* Interactive Status Timeline */}
          {order.orderStatus !== 'cancelled' && (
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-2">
                  <Truck size={16} className="text-primary" />
                  Order Fulfillment Status
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Simulated Carrier: Central DME Logistics Rails
                </span>
              </div>

              {/* Progress Stepper */}
              <div className="relative py-2">
                <div className="hidden sm:grid grid-cols-6 gap-2 text-center relative z-10">
                  {timelineStages.map((stage, idx) => {
                    const isPassed = currentStageIndex >= idx;
                    const isCurrent = currentStageIndex === idx;

                    return (
                      <div key={stage.key} className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isCurrent
                              ? 'bg-primary text-white ring-4 ring-primary/20 shadow-md'
                              : isPassed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {isPassed ? <CheckCircle2 size={16} /> : idx + 1}
                        </div>
                        <span
                          className={`text-xs mt-2 font-bold ${
                            isCurrent ? 'text-primary' : isPassed ? 'text-navy' : 'text-slate-400'
                          }`}
                        >
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Carrier Disclaimer */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/60 text-[11px] text-blue-900 flex items-start gap-2">
                <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Carrier Tracking Notice:</strong> Demonstrating logistics timeline using real persisted
                  events from the central depot database. Third-party carrier webhook integrations can be plugged in
                  for live telemetry.
                </span>
              </div>

              {/* Persisted Event Log */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Activity Timeline
                </h4>
                <div className="border-l-2 border-slate-200 ml-3 pl-4 space-y-4">
                  {order.trackingUpdates?.map((event: any, i: number) => (
                    <div key={i} className="relative text-xs">
                      <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-white" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-bold text-navy">{event.message}</span>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(event.timestamp).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {event.location && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-slate-400" />
                          <span>{event.location}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Clinician Setup & Calibration Card */}
          {requiresSetup && (
            <div className="bg-white rounded-2xl border border-purple-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy text-sm">In-Home Clinician Setup &amp; Calibration</h3>
                    <p className="text-[11px] text-purple-800">
                      Certified healthcare specialist is scheduled alongside equipment delivery
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
                  {order.clinicalSetup?.setupStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-muted-foreground font-semibold text-[11px]">Appointment Date</span>
                  <div className="font-bold text-navy text-sm mt-0.5">
                    {order.clinicalSetup?.setupDate
                      ? new Date(order.clinicalSetup.setupDate).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Pending Scheduling'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-muted-foreground font-semibold text-[11px]">Assigned Specialist</span>
                  <div className="font-bold text-navy text-sm mt-0.5">
                    {order.clinicalSetup?.assignedSpecialistName || 'Pending Triage Assignment'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-muted-foreground font-semibold text-[11px]">Installation Notes</span>
                  <div className="font-bold text-navy text-xs mt-0.5 line-clamp-2">
                    {order.clinicalSetup?.setupNotes || 'Standard calibrated in-home setup.'}
                  </div>
                </div>
              </div>

              {/* Patient Reschedule Option */}
              {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
                <div className="pt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSetupModalOpen(true)}
                    leftIcon={<Calendar size={14} />}
                  >
                    Reschedule Setup Appointment
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Itemized Order Breakdown & Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Items Table (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-border p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-navy text-sm border-b border-border pb-3">
                Itemized Medical Equipment ({order.items?.length})
              </h3>

              <div className="divide-y divide-slate-100">
                {order.items?.map((item: any, idx: number) => (
                  <div key={idx} className="py-3 flex gap-3 text-xs">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                      <ShoppingBag size={20} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy text-sm line-clamp-1">{item.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                        <span className="font-semibold uppercase text-slate-500">{item.sku}</span>
                        <span>•</span>
                        {item.isRental ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                            Monthly Rental ({item.rentalDurationMonths} mos)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                            Purchase
                          </span>
                        )}
                        {item.setupRequired && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200 flex items-center gap-0.5">
                            <Wrench size={10} /> Setup
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-navy text-sm">
                        ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.quantity} x ₹{item.unitPrice.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary & Delivery Address (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Financial Breakdown */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-3 text-xs">
                <h3 className="font-bold text-navy text-sm border-b border-border pb-3">
                  Payment Summary
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Equipment Subtotal</span>
                    <span className="font-bold text-navy">
                      ₹{order.pricing?.subtotal?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Doorstep Delivery</span>
                    <span className="font-bold text-navy">
                      {order.pricing?.deliveryFee === 0 ? (
                        <span className="text-secondary font-bold uppercase text-[11px]">FREE</span>
                      ) : (
                        `₹${order.pricing?.deliveryFee?.toLocaleString('en-IN')}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (12%)</span>
                    <span className="font-bold text-navy">
                      ₹{order.pricing?.taxGst?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-navy pt-2 border-t border-border">
                    <span>Total Amount</span>
                    <span className="text-base text-primary">
                      ₹{order.pricing?.totalAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-muted-foreground">Payment Method:</span>
                  <span className="font-bold text-navy uppercase">{order.paymentMethod}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-muted-foreground">Payment Status:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded ${
                      order.paymentStatus === 'paid'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {order.paymentStatus?.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-3 text-xs">
                <h3 className="font-bold text-navy text-sm border-b border-border pb-3 flex items-center gap-1.5">
                  <MapPin size={16} className="text-primary" />
                  Delivery Destination
                </h3>
                <div>
                  <p className="font-bold text-navy text-sm">{order.patientName}</p>
                  <p className="text-muted-foreground mt-1 leading-relaxed">
                    {order.deliveryAddress?.street}
                  </p>
                  <p className="text-muted-foreground">
                    {order.deliveryAddress?.city}, {order.deliveryAddress?.state} —{' '}
                    <span className="font-bold text-navy">{order.deliveryAddress?.pincode}</span>
                  </p>
                  <p className="text-muted-foreground mt-1 flex items-center gap-1">
                    <Phone size={12} /> {order.patientPhone}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Cancel Order Modal */}
      {isCancelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-600" />
                Cancel Medical Order
              </h3>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-navy"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Orders can only be cancelled while in placed or confirmed status before warehouse dispatch.
              Reserved inventory will be released immediately.
            </p>

            {cancelError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-navy mb-1">Reason for Cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border text-xs outline-none focus:border-primary"
              >
                <option value="Doctor revised prescription">Doctor revised prescription</option>
                <option value="Patient admitted to hospital">Patient admitted to hospital</option>
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Found alternative equipment">Found alternative equipment</option>
                <option value="Delivery timeframe too long">Delivery timeframe too long</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                className="flex-1 justify-center"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Keep Order
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white"
                disabled={isCancelling}
                onClick={handleCancelOrder}
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {isReturnModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <RotateCcw size={18} className="text-amber-600" />
                Request Equipment Return
              </h3>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="text-slate-400 hover:text-navy"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Returns are supported for non-consumable DME equipment within 7 days of delivery.
              A technician will visit to inspect device condition before pickup.
            </p>

            {returnError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {returnError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-navy mb-1">Return Reason</label>
              <textarea
                rows={3}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border text-xs outline-none focus:border-primary"
                placeholder="Describe reason for equipment return or rental end"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                className="flex-1 justify-center"
                onClick={() => setIsReturnModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1 justify-center bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isReturning}
                onClick={handleReturnRequest}
              >
                {isReturning ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Reschedule Modal */}
      {isSetupModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <Calendar size={18} className="text-purple-600" />
                Reschedule Setup Appointment
              </h3>
              <button
                onClick={() => setIsSetupModalOpen(false)}
                className="text-slate-400 hover:text-navy"
              >
                <X size={18} />
              </button>
            </div>

            {setupError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {setupError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-navy mb-1">Preferred Date</label>
                <input
                  type="date"
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  value={setupDate}
                  onChange={(e) => setSetupDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Preferred Time Slot</label>
                <select
                  value={setupSlot}
                  onChange={(e) => setSetupSlot(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-primary text-sm"
                >
                  <option value="Morning (9:00 AM - 1:00 PM)">Morning (9:00 AM - 1:00 PM)</option>
                  <option value="Afternoon (2:00 PM - 6:00 PM)">Afternoon (2:00 PM - 6:00 PM)</option>
                  <option value="Evening (6:00 PM - 8:30 PM)">Evening (6:00 PM - 8:30 PM)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Notes for Clinician</label>
                <textarea
                  rows={2}
                  value={setupNotes}
                  onChange={(e) => setSetupNotes(e.target.value)}
                  placeholder="e.g. Ring flat 402 bell, patient resting"
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                className="flex-1 justify-center"
                onClick={() => setIsSetupModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1 justify-center bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isRescheduling}
                onClick={handleRescheduleSetup}
              >
                {isRescheduling ? 'Saving...' : 'Confirm Appointment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Test Payment Modal */}
      {isPaymentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <CreditCard size={18} className="text-primary" />
                Pay for Order #{order.orderNumber}
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-navy"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-xs text-muted-foreground font-semibold">Total Amount Due</span>
              <div className="text-3xl font-extrabold text-navy mt-1">
                ₹{order.pricing?.totalAmount?.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
              <strong>Notice:</strong> Verified Sandbox Test Mode. Live Razorpay keys not configured.
              Clicking below simulates a cryptographic verification callback.
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md"
              disabled={isVerifyingPayment}
              onClick={handleVerifyPayment}
              leftIcon={<CheckCircle2 size={16} />}
            >
              {isVerifyingPayment ? 'Verifying...' : 'Simulate Successful Test Payment'}
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
