'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Wrench,
  Clock,
  Sparkles,
  HelpCircle,
  Building2,
  Calendar,
  X,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { productsApi } from '@/lib/api';
import { useCart } from '@/context/CartContext';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, pricing, clearCart, revalidateCart, totalItemCount } = useCart();

  // Client-side idempotency key generated once per checkout session
  const [idempotencyKey] = useState(() => `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  // Patient / Delivery Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    street: '',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411038',
    hospitalReferralId: '',
    paymentMethod: 'online' as 'online' | 'cod' | 'insurance_claim',
    preferredSetupDate: '',
    preferredSetupSlot: 'Morning (9:00 AM - 1:00 PM)',
    accessInstructions: '',
    termsAgreed: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Payment Gateway Modal State
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [activePaymentOrder, setActivePaymentOrder] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Check if any items require clinician setup
  const requiresClinicianSetup = items.some((item) => item.setupRequired);

  // Pre-fill user data if signed in
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('vivo_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setFormData((prev) => ({
            ...prev,
            fullName: user.fullName || '',
            phone: user.phone || '',
            email: user.email || '',
          }));
        } catch {
          // ignore
        }
      }

      // Fetch payment gateway configuration
      productsApi
        .getPaymentConfig()
        .then((cfg) => setPaymentConfig(cfg))
        .catch(() => null);
    }
  }, []);

  // Form input validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full patient name is required';
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errors.phone = 'Enter a valid 10-digit Indian mobile number';
    }

    if (!formData.street.trim()) {
      errors.street = 'Delivery address street/building is required';
    }

    if (!formData.city.trim()) {
      errors.city = 'Delivery city is required';
    }

    const cleanPincode = formData.pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      errors.pincode = 'Enter a valid 6-digit postal code (e.g. 411038)';
    }

    if (requiresClinicianSetup && !formData.preferredSetupDate) {
      errors.preferredSetupDate = 'Please select a preferred date for clinical installation';
    }

    if (!formData.termsAgreed) {
      errors.termsAgreed = 'You must agree to the equipment terms and clinical conditions';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      window.scrollTo({ top: 200, behavior: 'smooth' });
      return;
    }

    if (items.length === 0) {
      setSubmitError('Your cart is empty. Please add medical equipment to proceed.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Revalidate cart items before final submission
      await revalidateCart();

      const orderPayload = {
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          isRental: i.isRental,
          rentalDurationMonths: i.isRental ? i.rentalDurationMonths : undefined,
        })),
        deliveryAddress: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          contactPhone: formData.phone.trim(),
        },
        paymentMethod: formData.paymentMethod,
        hospitalReferralId: formData.hospitalReferralId.trim() || undefined,
        idempotencyKey,
        installationPreferences: requiresClinicianSetup
          ? {
              preferredDate: formData.preferredSetupDate,
              preferredSlot: formData.preferredSetupSlot,
              accessInstructions: formData.accessInstructions,
            }
          : undefined,
      };

      const res = await productsApi.placeOrder(orderPayload);

      if (res && res.data) {
        const placedOrder = res.data;

        // If online payment chosen: initiate payment intent
        if (formData.paymentMethod === 'online') {
          setActivePaymentOrder(placedOrder);
          setIsPaymentModalOpen(true);
        } else {
          // COD or Insurance: Order placed directly, clear cart and navigate
          await clearCart();
          router.push(`/orders/${placedOrder.orderNumber || placedOrder._id}?success=true`);
        }
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit order. Please check item availability and address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Payment Verification Handler for Test Mode / Gateway
  const handleVerifyTestPayment = async () => {
    if (!activePaymentOrder) return;

    try {
      setIsVerifyingPayment(true);
      setPaymentError(null);

      const rzpOrderId =
        activePaymentOrder.paymentDetails?.razorpayOrderId ||
        `rzp_test_ord_${activePaymentOrder.orderNumber}_${Date.now()}`;
      const rzpPaymentId = `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const rzpSignature = `test_sig_${rzpOrderId}_${rzpPaymentId}`;

      const res = await productsApi.verifyPayment({
        orderId: activePaymentOrder._id || activePaymentOrder.id,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: rzpSignature,
      });

      if (res && res.data) {
        await clearCart();
        setIsPaymentModalOpen(false);
        router.push(`/orders/${activePaymentOrder.orderNumber || activePaymentOrder._id}?payment=confirmed`);
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Payment verification failed. Please try again.');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  if (items.length === 0 && !isPaymentModalOpen) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-xl font-bold text-navy mb-2">Your Shopping Cart is Empty</h1>
          <p className="text-xs text-muted-foreground mb-6">
            You must add at least one medical product or equipment rental before checking out.
          </p>
          <Button href="/products" variant="primary" size="md" leftIcon={<ArrowLeft size={16} />}>
            Return to Medical Store
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 pb-20 pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-navy transition-colors mb-2"
            >
              <ArrowLeft size={14} />
              <span>Back to Products</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
              Medical Equipment Checkout
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Complete patient delivery details, installation schedule, and secure payment.
            </p>
          </div>

          {submitError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Order Submission Notice</p>
                <p className="mt-0.5">{submitError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Form Section (7 cols) */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSubmitOrder} className="space-y-6">
                {/* 1. Patient & Delivery Information */}
                <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-sm font-bold text-navy border-b border-border pb-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-extrabold">
                      1
                    </div>
                    <span>Patient Demographics &amp; Delivery Address</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-navy mb-1">
                        Patient / Recipient Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Suman Deshmukh"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm ${
                          formErrors.fullName ? 'border-red-500 bg-red-50/20' : 'border-border focus:border-primary'
                        }`}
                      />
                      {formErrors.fullName && (
                        <p className="text-[11px] text-red-600 mt-1 font-semibold">{formErrors.fullName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold text-navy mb-1">
                        Contact Mobile Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm ${
                          formErrors.phone ? 'border-red-500 bg-red-50/20' : 'border-border focus:border-primary'
                        }`}
                      />
                      {formErrors.phone && (
                        <p className="text-[11px] text-red-600 mt-1 font-semibold">{formErrors.phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold text-navy mb-1">Email Address (Optional)</label>
                      <input
                        type="email"
                        placeholder="For digital invoice & tracking"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border focus:border-primary outline-none text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-navy mb-1">
                        Street Address &amp; Apartment <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Flat / Floor / Society, Street, Landmark"
                        value={formData.street}
                        onChange={(e) => handleInputChange('street', e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm ${
                          formErrors.street ? 'border-red-500 bg-red-50/20' : 'border-border focus:border-primary'
                        }`}
                      />
                      {formErrors.street && (
                        <p className="text-[11px] text-red-600 mt-1 font-semibold">{formErrors.street}</p>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold text-navy mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border focus:border-primary outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-navy mb-1">
                        Pincode <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="6-digit Indian PIN (e.g. 411038)"
                        value={formData.pincode}
                        onChange={(e) => handleInputChange('pincode', e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm ${
                          formErrors.pincode ? 'border-red-500 bg-red-50/20' : 'border-border focus:border-primary'
                        }`}
                      />
                      {formErrors.pincode && (
                        <p className="text-[11px] text-red-600 mt-1 font-semibold">{formErrors.pincode}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-navy mb-1">
                        Hospital Referral Code (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VQ-REF-2026-8812 (If referred by hospital discharge coordinator)"
                        value={formData.hospitalReferralId}
                        onChange={(e) => handleInputChange('hospitalReferralId', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border focus:border-primary outline-none text-sm uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Clinician Installation Slot Preference (If setup required) */}
                {requiresClinicianSetup && (
                  <div className="bg-white rounded-2xl border border-purple-200 p-6 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 text-sm font-bold text-navy border-b border-purple-100 pb-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-extrabold">
                        2
                      </div>
                      <span className="text-purple-950">In-Home Clinical Setup Scheduling</span>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-xl text-purple-900 text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <Wrench size={14} className="text-purple-700" />
                        Closed-Loop Installation Requirement
                      </p>
                      <p className="text-[11px] text-purple-800/90 leading-relaxed">
                        One or more items in your cart (e.g. hospital bed, BiPAP, grab bars) require
                        professional calibration. Select your preferred appointment slot:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-navy mb-1">
                          Preferred Setup Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                          value={formData.preferredSetupDate}
                          onChange={(e) => handleInputChange('preferredSetupDate', e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm ${
                            formErrors.preferredSetupDate
                              ? 'border-red-500 bg-red-50/20'
                              : 'border-border focus:border-primary'
                          }`}
                        />
                        {formErrors.preferredSetupDate && (
                          <p className="text-[11px] text-red-600 mt-1 font-semibold">
                            {formErrors.preferredSetupDate}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block font-bold text-navy mb-1">Time Slot Preference</label>
                        <select
                          value={formData.preferredSetupSlot}
                          onChange={(e) => handleInputChange('preferredSetupSlot', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border focus:border-primary outline-none text-sm"
                        >
                          <option value="Morning (9:00 AM - 1:00 PM)">Morning (9:00 AM - 1:00 PM)</option>
                          <option value="Afternoon (2:00 PM - 6:00 PM)">Afternoon (2:00 PM - 6:00 PM)</option>
                          <option value="Evening (6:00 PM - 8:30 PM)">Evening (6:00 PM - 8:30 PM)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-bold text-navy mb-1">
                          Access &amp; Patient Mobility Instructions
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Elevator available, patient is bedridden in second bedroom, please call before entering."
                          value={formData.accessInstructions}
                          onChange={(e) => handleInputChange('accessInstructions', e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-border focus:border-primary outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Payment Method Selection */}
                <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-sm font-bold text-navy border-b border-border pb-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-extrabold">
                      {requiresClinicianSetup ? 3 : 2}
                    </div>
                    <span>Select Payment Method</span>
                  </div>

                  <div className="space-y-3">
                    {/* Online Gateway Option */}
                    <label
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        formData.paymentMethod === 'online'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="online"
                        checked={formData.paymentMethod === 'online'}
                        onChange={() => handleInputChange('paymentMethod', 'online')}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy text-sm flex items-center gap-2">
                            <CreditCard size={18} className="text-primary" />
                            UPI, Cards &amp; NetBanking (Razorpay)
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            Instant Confirmation
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Secure online payment via UPI, Credit/Debit Cards, or NetBanking.
                        </p>
                        {paymentConfig?.mode === 'test_sandbox' && (
                          <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                            <strong>Notice:</strong> Razorpay running in Test Sandbox Mode. Real payment will not be charged.
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Cash on Delivery Option */}
                    <label
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        formData.paymentMethod === 'cod'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={formData.paymentMethod === 'cod'}
                        onChange={() => handleInputChange('paymentMethod', 'cod')}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy text-sm flex items-center gap-2">
                            <Banknote size={18} className="text-emerald-600" />
                            Cash on Delivery / Pay on Inspection
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            Doorstep UPI / Cash
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Inspect the equipment and calibration with the technician before handing over payment.
                        </p>
                      </div>
                    </label>

                    {/* Insurance Claim Option */}
                    <label
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        formData.paymentMethod === 'insurance_claim'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="insurance_claim"
                        checked={formData.paymentMethod === 'insurance_claim'}
                        onChange={() => handleInputChange('paymentMethod', 'insurance_claim')}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-navy text-sm flex items-center gap-2">
                          <FileText size={18} className="text-secondary" />
                          Health Insurance Claim / Payer Reimbursement
                        </span>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Itemized GST invoice, HSN classification, and clinician notes will be provided for reimbursement filing.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 4. Terms and Agreement */}
                <div className="p-4 rounded-2xl bg-white border border-border text-xs space-y-3 shadow-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.termsAgreed}
                      onChange={(e) => handleInputChange('termsAgreed', e.target.checked)}
                      className="mt-0.5 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-muted-foreground leading-relaxed">
                      I agree to the VivoQuest medical equipment terms: Equipment rentals require safe usage
                      and return upon recovery. Prescriptions must be shown for respiratory ventilators.
                    </span>
                  </label>
                  {formErrors.termsAgreed && (
                    <p className="text-[11px] text-red-600 font-semibold">{formErrors.termsAgreed}</p>
                  )}
                </div>

                {/* Final Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full justify-center text-sm font-bold shadow-lg"
                  disabled={isSubmitting}
                  rightIcon={<ArrowRight size={16} />}
                >
                  {isSubmitting
                    ? 'Validating & Placing Order...'
                    : formData.paymentMethod === 'online'
                    ? `Proceed to Payment (₹${pricing.totalAmount.toLocaleString('en-IN')})`
                    : `Confirm Order (₹${pricing.totalAmount.toLocaleString('en-IN')})`}
                </Button>
              </form>
            </div>

            {/* Order Review Sidebar (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-border p-5 space-y-4 shadow-sm sticky top-28">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-bold text-navy text-sm">Order Review</h3>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Itemized List */}
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.isRental}`} className="py-3 flex gap-3 text-xs">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden border border-border">
                        {item.images && item.images[0] ? (
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ShieldCheck size={16} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-navy line-clamp-1">{item.title}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span className={item.isRental ? 'text-primary font-bold' : 'font-semibold'}>
                            {item.isRental ? `Rental (${item.rentalDurationMonths} mo)` : 'Purchase'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-extrabold text-navy">
                        ₹{item.itemSubtotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="border-t border-border pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-bold text-navy">₹{pricing.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Truck size={14} className="text-secondary" />
                      Delivery Charges
                    </span>
                    <span className="font-bold text-navy">
                      {pricing.deliveryFee === 0 ? (
                        <span className="text-secondary font-bold uppercase text-[11px]">FREE</span>
                      ) : (
                        `₹${pricing.deliveryFee.toLocaleString('en-IN')}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (12% Medical Rate)</span>
                    <span className="font-bold text-navy">₹{pricing.taxGst.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-sm font-extrabold text-navy pt-2 border-t border-border">
                    <span>Total Amount</span>
                    <span className="text-base text-primary">₹{pricing.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Closed-loop delivery promise */}
                <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-muted-foreground space-y-1.5 border border-slate-200">
                  <div className="flex items-center gap-1.5 font-bold text-navy">
                    <Lock size={13} className="text-secondary" />
                    <span>Server-Side Order Security</span>
                  </div>
                  <p>
                    All product prices, tax, and stock availability are strictly verified on the VivoQuest
                    server before fulfillment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Razorpay / Sandbox Test Payment Gateway Modal */}
      {isPaymentModalOpen && activePaymentOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-border">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-navy to-navy-light text-white p-6 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <CreditCard size={18} />
                  </div>
                  <span className="text-sm font-bold tracking-tight">VivoQuest Payment Gateway</span>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4">
                <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold">
                  Order Total Payable
                </span>
                <div className="text-3xl font-extrabold text-white">
                  ₹{activePaymentOrder.pricing?.totalAmount?.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-white/80 mt-0.5">
                  Order #{activePaymentOrder.orderNumber}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Sandbox Alert Banner */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <Sparkles size={14} className="text-amber-600" />
                  <span>Razorpay Verified Sandbox Environment</span>
                </div>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  Live production Razorpay credentials are not configured in environment variables.
                  This modal provides a certified test verification workflow. Real bank accounts will not be charged.
                </p>
              </div>

              {paymentError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  {paymentError}
                </div>
              )}

              {/* Simulation Details */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Merchant:</span>
                  <span className="font-bold text-navy">VivoQuest Healthcare Pvt Ltd</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Gateway Mode:</span>
                  <span className="font-bold text-primary">Test Mode / Sandbox</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Recipient:</span>
                  <span className="font-bold text-navy">{activePaymentOrder.patientName}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center text-sm font-bold shadow-md bg-emerald-600 hover:bg-emerald-700"
                  disabled={isVerifyingPayment}
                  onClick={handleVerifyTestPayment}
                  leftIcon={<CheckCircle2 size={16} />}
                >
                  {isVerifyingPayment
                    ? 'Verifying Server Signature...'
                    : 'Simulate Successful Test Payment'}
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  className="w-full justify-center text-xs font-semibold text-slate-600"
                  disabled={isVerifyingPayment}
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    router.push(`/orders/${activePaymentOrder.orderNumber}?payment=pending`);
                  }}
                >
                  Pay Later / Switch to Doorstep COD
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
