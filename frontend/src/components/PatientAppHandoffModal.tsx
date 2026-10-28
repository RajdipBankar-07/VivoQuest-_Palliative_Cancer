'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  Clock,
  Wrench,
  Truck,
  Copy,
  Check,
  QrCode,
  Info,
} from 'lucide-react';
import { siteConfig } from '@/config/siteConfig';

export interface HandoffProductContext {
  id: string;
  sku?: string;
  title: string;
  price?: number;
  quantity?: number;
  isRental?: boolean;
  rentalDurationMonths?: number;
  installationSelected?: boolean;
}

interface PatientAppHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: HandoffProductContext | null;
  cartItemsCount?: number;
  totalAmount?: number;
}

export const PatientAppHandoffModal: React.FC<PatientAppHandoffModalProps> = ({
  isOpen,
  onClose,
  product,
  cartItemsCount,
  totalAmount,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [attemptedLaunch, setAttemptedLaunch] = useState(false);

  if (!isOpen) return null;

  // Build secure deep link (only public product references, no sensitive credentials)
  const scheme = siteConfig.mobileApp?.scheme || 'vivoquest';
  let deepLinkUrl = `${scheme}://equipment`;

  if (product?.id) {
    const params = new URLSearchParams();
    params.set('productId', product.id);
    if (product.quantity && product.quantity > 1) {
      params.set('quantity', String(product.quantity));
    }
    if (product.isRental) {
      params.set('isRental', 'true');
      if (product.rentalDurationMonths) {
        params.set('rentalMonths', String(product.rentalDurationMonths));
      }
    }
    if (product.installationSelected) {
      params.set('requireInstallation', 'true');
    }
    deepLinkUrl = `${scheme}://equipment?${params.toString()}`;
  } else if (cartItemsCount && cartItemsCount > 0) {
    deepLinkUrl = `${scheme}://equipment?fromCart=true`;
  }

  const handleOpenApp = () => {
    setAttemptedLaunch(true);
    if (typeof window !== 'undefined') {
      // Trigger deep link protocol
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

  const hasConfiguredPlayStore = Boolean(siteConfig.mobileApp?.playStoreUrl);
  const hasConfiguredAppStore = Boolean(siteConfig.mobileApp?.appStoreUrl);
  const apkDownloadUrl = siteConfig.mobileApp?.apkDownloadUrl || '#';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="handoff-modal-title"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-border animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shadow-xs shrink-0">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 mb-1">
                <ShieldCheck size={11} />
                <span>Patient Mobile App Ordering</span>
              </div>
              <h2 id="handoff-modal-title" className="text-lg font-black text-navy leading-tight">
                Order in VivoQuest Patient App
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selected Context Summary */}
        <div className="bg-slate-50 rounded-2xl p-4 my-5 border border-border text-xs space-y-2">
          {product ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Selected Medical Device
                  </span>
                  <p className="font-extrabold text-navy text-sm mt-0.5 line-clamp-1">{product.title}</p>
                </div>
                {product.price && (
                  <div className="text-right shrink-0">
                    <span className="font-black text-navy text-base">₹{(Number(product.price) || 0).toLocaleString('en-IN')}</span>
                    {product.isRental && (
                      <span className="text-[10px] text-teal-700 block font-semibold">Monthly Rental</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200 text-slate-600">
                <span>Quantity: <strong>{product.quantity || 1}</strong></span>
                {product.installationSelected && (
                  <>
                    <span>•</span>
                    <span className="text-blue-700 font-semibold flex items-center gap-1">
                      <Wrench size={11} /> Clinician Setup Requested
                    </span>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Your Equipment Cart
                </span>
                <p className="font-extrabold text-navy text-sm mt-0.5">
                  {cartItemsCount || 0} {cartItemsCount === 1 ? 'item' : 'items'} ready for checkout
                </p>
              </div>
              {totalAmount !== undefined && (
                <div className="text-right">
                  <span className="font-black text-primary text-base">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Policy Explanation Banner */}
        <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-blue-950 mb-5 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-blue-900">
            <Info size={14} className="shrink-0" />
            Why is checkout completed in the Patient App?
          </p>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Medical equipment requires patient health record linkage, clinician assembly verification, doorstep identity confirmation, and real-time order milestone tracking.
          </p>
        </div>

        {/* Primary Action: Open App */}
        <div className="space-y-3">
          <button
            onClick={handleOpenApp}
            className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-primary hover:bg-primary-hover text-white transition-all shadow-md flex items-center justify-center gap-2.5"
          >
            <Smartphone size={18} />
            <span>Open in VivoQuest Patient App</span>
            <ExternalLink size={16} />
          </button>

          {/* Fallback & Copy Deep Link */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-3 rounded-xl border border-border text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
            >
              {copiedLink ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-700">Deep Link Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="text-slate-500" />
                  <span>Copy App Link</span>
                </>
              )}
            </button>

            {hasConfiguredPlayStore ? (
              <a
                href={siteConfig.mobileApp?.playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl border border-border text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <Download size={14} className="text-slate-500" />
                <span>Google Play</span>
              </a>
            ) : (
              <a
                href={apkDownloadUrl}
                download
                className="py-2.5 px-3 rounded-xl border border-border text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
                title="Download verified Android package"
              >
                <Download size={14} className="text-slate-500" />
                <span>Download APK</span>
              </a>
            )}
          </div>
        </div>

        {/* Notice if app isn't installed */}
        {attemptedLaunch && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
            <strong>App not opening?</strong> Ensure the VivoQuest Patient App is installed on this device, or scan the QR code below on your mobile phone to open directly.
          </div>
        )}

        {/* QR Code / Desktop Handoff Box */}
        <div className="mt-5 pt-4 border-t border-border flex items-center gap-4">
          <div className="w-20 h-20 bg-slate-100 rounded-xl p-2 flex items-center justify-center border border-slate-200 shrink-0">
            {/* Visual SVG QR representation */}
            <svg viewBox="0 0 100 100" className="w-full h-full text-navy" fill="currentColor">
              {/* Outer corners */}
              <rect x="5" y="5" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="13" y="13" width="12" height="12" rx="2" />
              <rect x="67" y="5" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="75" y="13" width="12" height="12" rx="2" />
              <rect x="5" y="67" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="13" y="75" width="12" height="12" rx="2" />
              {/* Center matrix dots */}
              <rect x="42" y="12" width="6" height="6" />
              <rect x="52" y="22" width="6" height="6" />
              <rect x="42" y="42" width="16" height="16" rx="3" fill="#0D9488" />
              <rect x="22" y="46" width="6" height="6" />
              <rect x="72" y="46" width="6" height="6" />
              <rect x="42" y="72" width="6" height="6" />
              <rect x="62" y="68" width="6" height="6" />
              <rect x="78" y="78" width="6" height="6" />
            </svg>
          </div>
          <div className="text-xs text-slate-600">
            <p className="font-bold text-navy text-[12px] flex items-center gap-1">
              <QrCode size={13} className="text-teal-600" />
              Scan on your phone
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Point your phone camera to launch the VivoQuest Patient App and resume this equipment order instantly.
            </p>
          </div>
        </div>

        {/* 4-Step Patient Journey */}
        <div className="mt-5 pt-4 border-t border-border space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            How It Works in the Patient App
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 font-bold text-[9px] flex items-center justify-center shrink-0">1</span>
              <span>Open Patient App &amp; sign in with your mobile</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 font-bold text-[9px] flex items-center justify-center shrink-0">2</span>
              <span>Selected equipment is loaded automatically</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 font-bold text-[9px] flex items-center justify-center shrink-0">3</span>
              <span>Confirm delivery address &amp; sandbox payment</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 font-bold text-[9px] flex items-center justify-center shrink-0">4</span>
              <span>Track milestones &amp; schedule clinician setup</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

