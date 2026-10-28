'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Truck,
  ArrowLeft,
  Smartphone,
  Download,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  Info,
  CheckCircle2,
  Wrench,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { ProductImage } from '@/components/ProductImage';
import { useCart } from '@/context/CartContext';
import { siteConfig } from '@/config/siteConfig';

export default function CheckoutPage() {
  const { items, pricing, totalItemCount } = useCart();
  const [copiedLink, setCopiedLink] = useState(false);
  const [attemptedLaunch, setAttemptedLaunch] = useState(false);

  // Deep Link construction for the Patient App
  const scheme = siteConfig.mobileApp?.scheme || 'vivoquest';
  const deepLinkUrl = `${scheme}://equipment?fromCart=true`;
  const apkDownloadUrl = siteConfig.mobileApp?.apkDownloadUrl || '#';
  const expoUrl = siteConfig.mobileApp?.expoUrl || '';

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

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <Smartphone size={32} />
          </div>
          <h1 className="text-xl font-bold text-navy mb-2">Your Shopping Cart is Empty</h1>
          <p className="text-xs text-muted-foreground mb-6">
            You must add at least one medical product or equipment rental before proceeding to the Patient App checkout.
          </p>
          <Button href="/products" variant="primary" size="md" leftIcon={<ArrowLeft size={16} />}>
            Browse Medical Store
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pb-20 pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb / Back Link */}
          <div className="mb-6">
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-navy transition-colors mb-2"
            >
              <ArrowLeft size={14} />
              <span>Back to Products</span>
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
                  Patient App Checkout &amp; Order Completion
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  VivoQuest coordinates clinical delivery, setup scheduling, and order tracking inside the Patient Mobile App.
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
                      Mobile-First Medical Care
                    </span>
                    <h2 className="text-xl font-black text-navy mt-1">
                      Complete Purchase in VivoQuest Patient App
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      To ensure clinical safety, prescription validation, and uninterrupted homecare tracking,
                      all medical equipment orders, payments, and clinician installation bookings are finalized in the
                      <strong> VivoQuest Patient Mobile App</strong>.
                    </p>
                  </div>
                </div>

                {/* Deep Link Buttons */}
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
                      download
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
                    <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-start gap-2">
                      <Info size={16} className="text-teal-700 shrink-0 mt-0.5" />
                      <p>
                        Attempting to launch <strong>VivoQuest Patient App</strong>... If the app did not open automatically,
                        please install the APK using the button above or scan the QR code below.
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
                      Open this checkout order directly on your mobile device
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Point your smartphone camera at this QR code to launch the VivoQuest Patient App and resume this cart seamlessly.
                    </p>
                  </div>
                </div>

                {/* 4-Step Patient App Workflow */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    How Mobile Patient Ordering Works
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-navy">Open or Install App</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Tap the button or scan the QR code to launch VivoQuest.
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
                          Log in with your patient phone number. Pending items resume automatically.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        3
                      </div>
                      <div>
                        <p className="font-bold text-navy">Confirm Setup &amp; Payment</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Select clinician installation slot and complete sandbox payment.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        4
                      </div>
                      <div>
                        <p className="font-bold text-navy">Real-Time App Tracking</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Track depot dispatch, technician arrival, and download GST invoices in app.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Safety / Clinical Commitment */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    <Lock size={14} className="text-amber-700" />
                    Why is Checkout Completed in the Patient App?
                  </p>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    VivoQuest delivers regulated durable medical equipment (oxygen concentrators, ICU beds, BiPAP units)
                    that require clinical calibration, biometric caregiver handovers, and in-home technician verification.
                    The Patient Mobile App provides a secure, auditable channel connecting you directly to our clinical field team.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Order Review Summary (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs sticky top-28">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-navy text-sm">Cart Items to Order</h3>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Itemized List */}
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.isRental}`} className="py-3 flex gap-3 text-xs">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 overflow-hidden border border-slate-200">
                        <ProductImage
                          src={item.images?.[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          category={item.category}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-navy line-clamp-1">{item.title}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span className={item.isRental ? 'text-teal-700 font-bold' : 'font-semibold'}>
                            {item.isRental ? `Rental (${item.rentalDurationMonths} mo)` : 'Purchase'}
                          </span>
                          {item.setupRequired && (
                            <>
                              <span>•</span>
                              <span className="text-purple-700 font-bold">Clinician Setup</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right font-extrabold text-navy">
                        ₹{item.itemSubtotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery Estimate */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <Truck size={16} className="text-emerald-600 shrink-0" />
                    <span className="font-semibold">Estimated Delivery:</span>
                  </div>
                  <span className="font-bold text-emerald-800">2–4 Business Days</span>
                </div>

                {/* Financial Summary */}
                <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cart Subtotal</span>
                    <span className="font-semibold text-navy">
                      ₹{pricing.subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Doorstep Delivery</span>
                    <span className="font-semibold text-navy">
                      {pricing.deliveryFee === 0 ? (
                        <span className="text-emerald-700 font-bold uppercase tracking-wider text-[11px]">
                          FREE
                        </span>
                      ) : (
                        `₹${pricing.deliveryFee.toLocaleString('en-IN')}`
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (12% Medical Equipment)</span>
                    <span className="font-semibold text-navy">
                      ₹{pricing.taxGst.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm font-bold text-navy pt-3 border-t border-slate-100">
                    <span>Estimated Total</span>
                    <span className="text-lg text-teal-800 font-black">
                      ₹{pricing.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Primary Button */}
                <button
                  onClick={handleOpenApp}
                  className="w-full py-3.5 px-4 rounded-2xl bg-navy hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Smartphone size={16} />
                  <span>Finalize in Patient App</span>
                </button>

                <p className="text-[11px] text-center text-muted-foreground">
                  Sandbox test mode active. No actual bank charges will be deducted.
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
