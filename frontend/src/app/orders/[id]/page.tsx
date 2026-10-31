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
  Star,
  Send,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { ProductImage } from '@/components/ProductImage';
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

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewHasIssue, setReviewHasIssue] = useState(false);
  const [reviewIssueCategory, setReviewIssueCategory] = useState('defective_device');
  const [reviewIssueDetails, setReviewIssueDetails] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Delivery Experience Rating Modal State
  const [isDeliveryRatingModalOpen, setIsDeliveryRatingModalOpen] = useState(false);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [handlingRating, setHandlingRating] = useState(5);
  const [deliveryFeedback, setDeliveryFeedback] = useState('');
  const [isSubmittingDeliveryRating, setIsSubmittingDeliveryRating] = useState(false);
  const [deliveryRatingSuccessMsg, setDeliveryRatingSuccessMsg] = useState<string | null>(null);
  const [deliveryRatingError, setDeliveryRatingError] = useState<string | null>(null);

  // Complaint Modal State
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [complaintProductId, setComplaintProductId] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('defective_device');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintRefundRequested, setComplaintRefundRequested] = useState(false);
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [complaintSuccessMsg, setComplaintSuccessMsg] = useState<string | null>(null);
  const [complaintError, setComplaintError] = useState<string | null>(null);

  // Delivery Reschedule Modal State
  const [isDeliveryRescheduleModalOpen, setIsDeliveryRescheduleModalOpen] = useState(false);
  const [deliveryRescheduleDate, setDeliveryRescheduleDate] = useState('');
  const [deliveryRescheduleSlot, setDeliveryRescheduleSlot] = useState('Morning 09:00 - 13:00');
  const [deliveryRescheduleReason, setDeliveryRescheduleReason] = useState('Family member available only on requested date');
  const [isSubmittingDeliveryReschedule, setIsSubmittingDeliveryReschedule] = useState(false);
  const [deliveryRescheduleSuccessMsg, setDeliveryRescheduleSuccessMsg] = useState<string | null>(null);
  const [deliveryRescheduleError, setDeliveryRescheduleError] = useState<string | null>(null);

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

  // Submit Product Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewProductId || !reviewComment.trim()) return;
    try {
      setIsSubmittingReview(true);
      setReviewError(null);
      await productsApi.submitProductReview(reviewProductId, {
        orderId: order._id || order.orderNumber,
        rating: reviewRating,
        title: reviewTitle.trim() || 'Verified Purchase Review',
        comment: reviewComment.trim(),
        hasIssueReported: reviewHasIssue,
        issueCategory: reviewHasIssue ? reviewIssueCategory : undefined,
        issueDetails: reviewHasIssue ? reviewIssueDetails.trim() : undefined,
      });
      setReviewSuccessMsg('Thank you! Your verified purchase review has been submitted for moderation.');
      setTimeout(() => {
        setIsReviewModalOpen(false);
        setReviewTitle('');
        setReviewComment('');
        setReviewSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review. Reviews can only be submitted for delivered purchases.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Submit Delivery Experience Rating
  const handleSubmitDeliveryRating = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingDeliveryRating(true);
      setDeliveryRatingError(null);
      const res = await productsApi.submitDeliveryRating(order._id || order.orderNumber, {
        rating: deliveryRating,
        punctualityRating,
        communicationRating,
        handlingRating,
        feedback: deliveryFeedback.trim(),
      });
      if (res && res.data) {
        setDeliveryRatingSuccessMsg('Thank you! Your delivery experience rating has been recorded.');
        setOrder((prev: any) => ({
          ...prev,
          deliveryRating: {
            rating: deliveryRating,
            punctualityRating,
            communicationRating,
            handlingRating,
            feedback: deliveryFeedback.trim(),
            ratedAt: new Date().toISOString(),
          },
        }));
        setTimeout(() => {
          setIsDeliveryRatingModalOpen(false);
          setDeliveryRatingSuccessMsg(null);
        }, 1800);
      }
    } catch (err: any) {
      setDeliveryRatingError(err.message || 'Failed to submit delivery rating.');
    } finally {
      setIsSubmittingDeliveryRating(false);
    }
  };

  // Submit Order Complaint / Return
  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintProductId || !complaintDescription.trim()) return;
    try {
      setIsSubmittingComplaint(true);
      setComplaintError(null);
      await productsApi.submitOrderComplaint(order._id || order.orderNumber, {
        productId: complaintProductId,
        category: complaintCategory,
        description: complaintDescription.trim(),
        refundRequested: complaintRefundRequested,
      });
      setComplaintSuccessMsg('Your complaint has been submitted. Our healthcare operations and supplier have been notified.');
      setTimeout(() => {
        setIsComplaintModalOpen(false);
        setComplaintDescription('');
        setComplaintSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setComplaintError(err.message || 'Failed to submit complaint.');
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // Submit Patient Delivery Reschedule Request
  const handleDeliveryRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryRescheduleDate || !deliveryRescheduleReason.trim()) return;
    try {
      setIsSubmittingDeliveryReschedule(true);
      setDeliveryRescheduleError(null);
      await productsApi.requestDeliveryReschedule(order._id || order.orderNumber, {
        requestedDate: deliveryRescheduleDate,
        timeSlot: deliveryRescheduleSlot,
        reason: deliveryRescheduleReason.trim(),
      });
      setDeliveryRescheduleSuccessMsg(
        'Delivery reschedule request submitted. The operations dispatch team will review and confirm your new slot.'
      );
      setTimeout(() => {
        setIsDeliveryRescheduleModalOpen(false);
        setDeliveryRescheduleSuccessMsg(null);
        fetchOrder();
      }, 2000);
    } catch (err: any) {
      setDeliveryRescheduleError(err.message || 'Failed to submit reschedule request.');
    } finally {
      setIsSubmittingDeliveryReschedule(false);
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
        {/* Delivery Reschedule Modal */}
      {isDeliveryRescheduleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <Calendar size={18} className="text-teal-600" />
                Reschedule Delivery Date
              </h3>
              <button
                onClick={() => setIsDeliveryRescheduleModalOpen(false)}
                className="text-slate-400 hover:text-navy"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose your preferred date and time slot for medical equipment delivery. Our operations team will align dispatch to match your schedule.
            </p>

            {deliveryRescheduleSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                {deliveryRescheduleSuccessMsg}
              </div>
            )}

            {deliveryRescheduleError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {deliveryRescheduleError}
              </div>
            )}

            <form onSubmit={handleDeliveryRescheduleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-navy mb-1">Preferred Delivery Date</label>
                <input
                  type="date"
                  required
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                  value={deliveryRescheduleDate}
                  onChange={(e) => setDeliveryRescheduleDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs outline-none focus:border-teal-600 font-semibold text-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Preferred Time Window</label>
                <select
                  value={deliveryRescheduleSlot}
                  onChange={(e) => setDeliveryRescheduleSlot(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs outline-none focus:border-teal-600 font-semibold text-slate-700"
                >
                  <option value="Morning 09:00 - 13:00">Morning (09:00 AM - 01:00 PM)</option>
                  <option value="Afternoon 13:00 - 17:00">Afternoon (01:00 PM - 05:00 PM)</option>
                  <option value="Evening 17:00 - 21:00">Evening (05:00 PM - 09:00 PM)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Reason for Rescheduling</label>
                <input
                  type="text"
                  required
                  value={deliveryRescheduleReason}
                  onChange={(e) => setDeliveryRescheduleReason(e.target.value)}
                  placeholder="e.g. Attending doctor consultation on original date"
                  className="w-full p-2.5 rounded-xl border border-border text-xs outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="flex-1 justify-center"
                  onClick={() => setIsDeliveryRescheduleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1 justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold"
                  disabled={isSubmittingDeliveryReschedule}
                >
                  {isSubmittingDeliveryReschedule ? 'Submitting...' : 'Confirm Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        {/* Delivery Reschedule Modal */}
      {isDeliveryRescheduleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <Calendar size={18} className="text-teal-600" />
                Reschedule Delivery Date
              </h3>
              <button
                onClick={() => setIsDeliveryRescheduleModalOpen(false)}
                className="text-slate-400 hover:text-navy"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose your preferred date and time slot for medical equipment delivery. Our operations team will align dispatch to match your schedule.
            </p>

            {deliveryRescheduleSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                {deliveryRescheduleSuccessMsg}
              </div>
            )}

            {deliveryRescheduleError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {deliveryRescheduleError}
              </div>
            )}

            <form onSubmit={handleDeliveryRescheduleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-navy mb-1">Preferred Delivery Date</label>
                <input
                  type="date"
                  required
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                  value={deliveryRescheduleDate}
                  onChange={(e) => setDeliveryRescheduleDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs outline-none focus:border-teal-600 font-semibold text-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Preferred Time Window</label>
                <select
                  value={deliveryRescheduleSlot}
                  onChange={(e) => setDeliveryRescheduleSlot(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs outline-none focus:border-teal-600 font-semibold text-slate-700"
                >
                  <option value="Morning 09:00 - 13:00">Morning (09:00 AM - 01:00 PM)</option>
                  <option value="Afternoon 13:00 - 17:00">Afternoon (01:00 PM - 05:00 PM)</option>
                  <option value="Evening 17:00 - 21:00">Evening (05:00 PM - 09:00 PM)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Reason for Rescheduling</label>
                <input
                  type="text"
                  required
                  value={deliveryRescheduleReason}
                  onChange={(e) => setDeliveryRescheduleReason(e.target.value)}
                  placeholder="e.g. Attending doctor consultation on original date"
                  className="w-full p-2.5 rounded-xl border border-border text-xs outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="flex-1 justify-center"
                  onClick={() => setIsDeliveryRescheduleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1 justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold"
                  disabled={isSubmittingDeliveryReschedule}
                >
                  {isSubmittingDeliveryReschedule ? 'Submitting...' : 'Confirm Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
  const isDeliveryReschedulable =
    ['placed', 'confirmed', 'preparing', 'ready_for_dispatch', 'dispatched', 'in_transit', 'delivery_rescheduled'].includes(
      order.orderStatus
    ) && order.orderStatus !== 'cancelled';
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

              {['placed', 'confirmed', 'preparing', 'ready_for_dispatch', 'dispatched', 'in_transit', 'delivery_rescheduled'].includes(order.orderStatus) && order.orderStatus !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-teal-700 border-teal-200 hover:bg-teal-50"
                  onClick={() => {
                    setDeliveryRescheduleDate(
                      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                    );
                    setIsDeliveryRescheduleModalOpen(true);
                  }}
                  leftIcon={<Calendar size={14} />}
                >
                  Reschedule Delivery
                </Button>
              )}

              {isDeliveryReschedulable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-teal-700 border-teal-200 hover:bg-teal-50"
                  onClick={() => {
                    setDeliveryRescheduleDate(
                      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                    );
                    setIsDeliveryRescheduleModalOpen(true);
                  }}
                  leftIcon={<Calendar size={14} />}
                >
                  Reschedule Delivery
                </Button>
              )}

              {(order.orderStatus === 'delivered' || order.orderStatus === 'completed') && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-700 border-amber-200 hover:bg-amber-50 font-bold"
                    onClick={() => {
                      if (order.items?.[0]) setReviewProductId(order.items[0].productId || order.items[0]._id);
                      setIsReviewModalOpen(true);
                    }}
                    leftIcon={<Star size={14} className="fill-amber-400 text-amber-500" />}
                  >
                    Write a Review
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-rose-700 border-rose-200 hover:bg-rose-50 font-bold"
                    onClick={() => {
                      if (order.items?.[0]) setComplaintProductId(order.items[0].productId || order.items[0]._id);
                      setIsComplaintModalOpen(true);
                    }}
                    leftIcon={<AlertTriangle size={14} />}
                  >
                    Report Defect / Issue
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Flipkart-Style Verified Order Delivered Completion Card */}
          {(order.orderStatus === 'delivered' || order.orderStatus === 'completed') && (
            <div className="bg-white rounded-3xl border-2 border-emerald-500/30 p-6 sm:p-8 shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/20">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
                        Order Delivered Successfully
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck size={13} />
                        {order.deliveryAssignment?.otpVerification?.verificationMethod === 'manager_override'
                          ? 'Support Verified'
                          : 'OTP Verified'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      Delivered on{' '}
                      <span className="font-bold text-navy">
                        {new Date(
                          order.deliveryAssignment?.actualDeliveredAt ||
                          order.deliveryAssignment?.otpVerification?.verifiedAt ||
                          order.updatedAt
                        ).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {order.deliveryAssignment?.otpVerification?.recipientName && (
                        <>
                          {' '}• Handed over to{' '}
                          <span className="font-bold text-navy">
                            {order.deliveryAssignment.otpVerification.recipientName}
                            {order.deliveryAssignment.otpVerification.recipientRelationship
                              ? ` (${order.deliveryAssignment.otpVerification.recipientRelationship})`
                              : ''}
                          </span>
                        </>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                      <span>
                        Package Condition:{' '}
                        <strong className="text-emerald-700 capitalize">
                          {(order.deliveryAssignment?.otpVerification?.deliveryCondition || 'good_condition').replace('_', ' ')}
                        </strong>
                      </span>
                      {order.clinicalSetup?.isSetupRequired && (
                        <span>
                          • Clinical Setup:{' '}
                          <strong className="text-teal-700 capitalize">
                            {(order.clinicalSetup.setupStatus || 'pending').replace('_', ' ')}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                  <button
                    onClick={() => setIsDeliveryRatingModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Star size={16} className="fill-white" />
                    <span>
                      {order.deliveryRating ? `Delivery Rated (${order.deliveryRating.rating}★)` : 'Rate Delivery Experience'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      if (order.items?.[0]) setReviewProductId(order.items[0].productId || order.items[0]._id);
                      setIsReviewModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-navy hover:bg-navy-dark text-white shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Sparkles size={16} />
                    <span>Rate Purchased Product</span>
                  </button>
                </div>
              </div>
            </div>
          )}

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

          {/* Estimated Delivery Information Card */}
          {order.orderStatus !== 'cancelled' && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50/70 rounded-2xl border border-emerald-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Calendar size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Estimated Delivery Arrival
                  </span>
                  <h3 className="text-xl font-extrabold text-navy">
                    {order.estimatedDeliveryDate
                      ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '2–4 Business Days'}
                  </h3>
                  <p className="text-xs text-emerald-950/80 mt-0.5">
                    Target fulfillment schedule calculated by central DME depot. Dates are estimated rather than carrier-guaranteed.
                  </p>
                </div>
              </div>

              {order.deliveryEstimateHistory && order.deliveryEstimateHistory.length > 0 && (
                <div className="px-3.5 py-2 rounded-xl bg-white/90 border border-emerald-300 text-xs text-emerald-950 shrink-0">
                  <span className="font-bold flex items-center gap-1 text-[11px] text-emerald-900">
                    <Clock size={12} className="text-emerald-700" />
                    Delivery Estimate Updated ({order.deliveryEstimateHistory.length}x)
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5 max-w-xs truncate">
                    Reason: {order.deliveryEstimateHistory[order.deliveryEstimateHistory.length - 1].reason}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Delivery Estimate Revision History Log */}
          {order.deliveryEstimateHistory && order.deliveryEstimateHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-border p-5 space-y-3 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-1.5">
                <Clock size={14} className="text-primary" />
                Delivery Estimate Revision History
              </h4>
              <div className="divide-y divide-slate-100 text-xs">
                {order.deliveryEstimateHistory.map((rev: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-700">
                    <div>
                      <span className="font-semibold text-navy">
                        {rev.previousEstimate ? new Date(rev.previousEstimate).toLocaleDateString('en-IN') : 'Initial Target'}
                        {' → '}
                        <strong className="text-emerald-700">{new Date(rev.newEstimate).toLocaleDateString('en-IN')}</strong>
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Reason: <em>&ldquo;{rev.reason}&rdquo;</em> &bull; Updated by {rev.updatedByName || 'Operations Staff'} ({rev.updatedByRole})
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(rev.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
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
                    <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                      <ProductImage
                        src={item.image || item.images?.[0]}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        category={item.category}
                      />
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

                  {Boolean(order.pricing?.discountTotal && order.pricing.discountTotal > 0) && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Marketplace Discount</span>
                      <span className="font-bold">-₹{order.pricing.discountTotal.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {Boolean(order.pricing?.installationCharge && order.pricing.installationCharge > 0) && (
                    <div className="flex justify-between text-blue-700 font-medium">
                      <span className="flex items-center gap-1">
                        <Wrench size={12} />
                        Home Specialist Installation
                      </span>
                      <span className="font-bold">₹{order.pricing.installationCharge.toLocaleString('en-IN')}</span>
                    </div>
                  )}

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

                {/* Tax Invoice Details & Download */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy flex items-center gap-1.5 text-[11px]">
                      <FileText size={13} className="text-primary" />
                      Tax Invoice
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      GST Active
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    HSN: 9021/9018 &bull; Applicable 12% GST breakdown itemized for insurance claims.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full mt-1 py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-200 text-navy font-bold text-xs hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileText size={13} />
                    Print / Download Invoice
                  </button>
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

      {/* Write Product Review Modal */}
      {isReviewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <Star size={18} className="fill-amber-400 text-amber-500" />
                Write Product Review
              </h3>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-navy">
                <X size={18} />
              </button>
            </div>

            {reviewSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                {reviewSuccessMsg}
              </div>
            )}

            {reviewError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-navy mb-1">Select Item to Review</label>
                <select
                  value={reviewProductId}
                  onChange={(e) => setReviewProductId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-primary text-xs"
                >
                  {order.items?.map((item: any, idx: number) => (
                    <option key={idx} value={item.productId || item._id}>
                      {item.title} ({item.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Your Rating</label>
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        size={24}
                        className={
                          star <= reviewRating
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-300'
                        }
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-sm text-slate-700">{reviewRating} / 5</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Headline / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Excellent build quality and smooth setup"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Review Details</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Share details about durability, comfort, caregiver handling, or packaging..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-primary"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={reviewHasIssue}
                    onChange={(e) => setReviewHasIssue(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Report a Product Issue or Defect with this Review</span>
                </label>
                {reviewHasIssue && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block font-semibold text-slate-700 text-[11px] mb-1">Issue Category</label>
                      <select
                        value={reviewIssueCategory}
                        onChange={(e) => setReviewIssueCategory(e.target.value)}
                        className="w-full p-2 rounded-xl border border-border text-xs outline-none focus:border-amber-600"
                      >
                        <option value="defective_device">Defective or Malfunctioning Device</option>
                        <option value="shipping_damage">Damaged in Transit / Dented</option>
                        <option value="missing_accessories">Missing Components or Cable</option>
                        <option value="wrong_item">Wrong Specification Delivered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 text-[11px] mb-1">Issue Description</label>
                      <textarea
                        rows={2}
                        placeholder="Briefly describe the defect for operations team review..."
                        value={reviewIssueDetails}
                        onChange={(e) => setReviewIssueDetails(e.target.value)}
                        className="w-full p-2 rounded-xl border border-border text-xs outline-none focus:border-amber-600"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      An operations support ticket will automatically be created so staff can follow up without altering your honest public review.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="flex-1 justify-center"
                  onClick={() => setIsReviewModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1 justify-center bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Experience Rating Modal */}
      {isDeliveryRatingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <Truck size={18} className="text-amber-500" />
                Rate Your Delivery Experience
              </h3>
              <button
                onClick={() => setIsDeliveryRatingModalOpen(false)}
                className="text-slate-400 hover:text-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Help us evaluate our last-mile medical equipment delivery executive for Order #{order.orderNumber}.
            </p>

            {deliveryRatingSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                {deliveryRatingSuccessMsg}
              </div>
            )}

            {deliveryRatingError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {deliveryRatingError}
              </div>
            )}

            <form onSubmit={handleSubmitDeliveryRating} className="space-y-4 text-xs">
              {/* Overall Star Rating */}
              <div>
                <label className="block font-bold text-navy mb-1.5">Overall Delivery Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setDeliveryRating(star)}
                      className="p-1 hover:scale-110 transition cursor-pointer"
                    >
                      <Star
                        size={24}
                        className={
                          star <= deliveryRating
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-300'
                        }
                      />
                    </button>
                  ))}
                  <span className="font-extrabold text-navy text-sm ml-2">{deliveryRating} / 5</span>
                </div>
              </div>

              {/* Punctuality Rating */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 text-[11px] mb-1">Punctuality</label>
                  <select
                    value={punctualityRating}
                    onChange={(e) => setPunctualityRating(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-border text-xs outline-none focus:border-amber-500"
                  >
                    {[5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>{s} Stars</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 text-[11px] mb-1">Communication</label>
                  <select
                    value={communicationRating}
                    onChange={(e) => setCommunicationRating(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-border text-xs outline-none focus:border-amber-500"
                  >
                    {[5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>{s} Stars</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 text-[11px] mb-1">Package Handling</label>
                  <select
                    value={handlingRating}
                    onChange={(e) => setHandlingRating(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-border text-xs outline-none focus:border-amber-500"
                  >
                    {[5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>{s} Stars</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Feedback text */}
              <div>
                <label className="block font-bold text-navy mb-1">Feedback Comments (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Share details on promptness, polite behavior, or delivery handling..."
                  value={deliveryFeedback}
                  onChange={(e) => setDeliveryFeedback(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-amber-500 text-xs text-slate-700"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="flex-1 justify-center"
                  onClick={() => setIsDeliveryRatingModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1 justify-center bg-amber-500 hover:bg-amber-600 text-white font-bold"
                  disabled={isSubmittingDeliveryRating}
                >
                  {isSubmittingDeliveryRating ? 'Submitting...' : 'Submit Rating'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Product Complaint / Return Modal */}
      {isComplaintModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" />
                Report Defect or Quality Complaint
              </h3>
              <button onClick={() => setIsComplaintModalOpen(false)} className="text-slate-400 hover:text-navy">
                <X size={18} />
              </button>
            </div>

            {complaintSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                {complaintSuccessMsg}
              </div>
            )}

            {complaintError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {complaintError}
              </div>
            )}

            <form onSubmit={handleSubmitComplaint} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-navy mb-1">Affected Item</label>
                <select
                  value={complaintProductId}
                  onChange={(e) => setComplaintProductId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-primary text-xs"
                >
                  {order.items?.map((item: any, idx: number) => (
                    <option key={idx} value={item.productId || item._id}>
                      {item.title} ({item.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Complaint Category</label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-primary text-xs"
                >
                  <option value="defective_device">Defective or Malfunctioning Device</option>
                  <option value="wrong_item">Received Wrong Item or Specification</option>
                  <option value="missing_accessories">Missing Components / Manual / Power Cable</option>
                  <option value="shipping_damage">Damaged in Transit / Crushed Packaging</option>
                  <option value="installation_issue">Installation or Demonstration Deficiency</option>
                  <option value="other">Other Healthcare Service Concern</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Issue Description</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please describe what happened, any error codes, or physical defects..."
                  value={complaintDescription}
                  onChange={(e) => setComplaintDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-primary"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={complaintRefundRequested}
                    onChange={(e) => setComplaintRefundRequested(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span>Request Return &amp; Refund Approval</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  If approved by platform operations, the refund will be remitted to your original payment method.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="flex-1 justify-center"
                  onClick={() => setIsComplaintModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  disabled={isSubmittingComplaint}
                >
                  {isSubmittingComplaint ? 'Submitting...' : 'File Official Complaint'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Reschedule Modal */}
      {isDeliveryRescheduleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <Calendar size={18} className="text-teal-600" />
                Reschedule Delivery Date
              </h3>
              <button
                onClick={() => setIsDeliveryRescheduleModalOpen(false)}
                className="text-slate-400 hover:text-navy"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose your preferred date and time slot for medical equipment delivery. Our operations team will align dispatch to match your schedule.
            </p>

            {deliveryRescheduleSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                {deliveryRescheduleSuccessMsg}
              </div>
            )}

            {deliveryRescheduleError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {deliveryRescheduleError}
              </div>
            )}

            <form onSubmit={handleDeliveryRescheduleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-navy mb-1">Preferred Delivery Date</label>
                <input
                  type="date"
                  required
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                  value={deliveryRescheduleDate}
                  onChange={(e) => setDeliveryRescheduleDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs outline-none focus:border-teal-600 font-semibold text-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Preferred Time Window</label>
                <select
                  value={deliveryRescheduleSlot}
                  onChange={(e) => setDeliveryRescheduleSlot(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs outline-none focus:border-teal-600 font-semibold text-slate-700"
                >
                  <option value="Morning 09:00 - 13:00">Morning (09:00 AM - 01:00 PM)</option>
                  <option value="Afternoon 13:00 - 17:00">Afternoon (01:00 PM - 05:00 PM)</option>
                  <option value="Evening 17:00 - 21:00">Evening (05:00 PM - 09:00 PM)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-navy mb-1">Reason for Rescheduling</label>
                <input
                  type="text"
                  required
                  value={deliveryRescheduleReason}
                  onChange={(e) => setDeliveryRescheduleReason(e.target.value)}
                  placeholder="e.g. Attending doctor consultation on original date"
                  className="w-full p-2.5 rounded-xl border border-border text-xs outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="flex-1 justify-center"
                  onClick={() => setIsDeliveryRescheduleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1 justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold"
                  disabled={isSubmittingDeliveryReschedule}
                >
                  {isSubmittingDeliveryReschedule ? 'Submitting...' : 'Confirm Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

