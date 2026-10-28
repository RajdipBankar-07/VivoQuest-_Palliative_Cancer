'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronRight,
  ShoppingBag,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Truck,
  Building2,
  Sparkles,
  Info,
  ArrowLeft,
  Share2,
  Heart,
  Plus,
  Minus,
  RefreshCw,
  Phone,
  Star,
  Check,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { ProductImage } from '@/components/ProductImage';
import { PatientAppHandoffModal } from '@/components/PatientAppHandoffModal';
import { productsApi } from '@/lib/api';
import { useCart } from '@/context/CartContext';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idOrSku = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Purchase vs Rental selection
  const [isRental, setIsRental] = useState(false);
  const [rentalMonths, setRentalMonths] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [installationSelected, setInstallationSelected] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isHandoffOpen, setIsHandoffOpen] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  const { addItem } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await productsApi.getProductById(idOrSku);
        if (data) {
          setProduct(data);
        } else {
          setError('Product not found in VivoQuest DME catalog');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch product details.');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        setIsLoadingReviews(true);
        const res = await productsApi.getProductReviews(idOrSku);
        if (res && res.data) {
          setReviews(res.data);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoadingReviews(false);
      }
    };

    if (idOrSku) {
      fetchProduct();
      fetchReviews();
    }
  }, [idOrSku]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-pulse space-y-6">
          <div className="w-1/4 h-5 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 aspect-square bg-slate-200 rounded-3xl" />
            <div className="lg:col-span-7 space-y-4">
              <div className="w-3/4 h-8 bg-slate-200 rounded" />
              <div className="w-1/3 h-6 bg-slate-200 rounded" />
              <div className="w-full h-32 bg-slate-200 rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-xl font-bold text-navy mb-2">Product Unavailable</h1>
          <p className="text-xs text-muted-foreground mb-6">
            {error || 'The requested medical equipment could not be found.'}
          </p>
          <Button href="/products" variant="primary" size="md" leftIcon={<ArrowLeft size={16} />}>
            Back to Medical Store
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;
  const unitSellingPrice = product.sellingPrice || product.price;
  const regularPrice = product.regularPrice || unitSellingPrice;
  const hasDiscount = regularPrice > unitSellingPrice;
  const discountPercent = product.discountPercentage || (hasDiscount ? Math.round(((regularPrice - unitSellingPrice) / regularPrice) * 100) : 0);
  const savingsPerUnit = hasDiscount ? (regularPrice - unitSellingPrice) : 0;

  const currentUnitPrice = isRental
    ? (product.rentalPriceMonthly || unitSellingPrice) * rentalMonths
    : unitSellingPrice;

  const totalItemPrice = currentUnitPrice * quantity;
  const gstAmount = Math.round(unitSellingPrice * 0.12);

  const imagesList = (product.images && product.images.length > 0)
    ? product.images
    : (product.imageGallery && product.imageGallery.length > 0)
    ? product.imageGallery.map((g: any) => g.url)
    : [];

  const handleAddToCart = async () => {
    await addItem(product, quantity, isRental, isRental ? rentalMonths : 1, installationSelected);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = async () => {
    await addItem(product, quantity, isRental, isRental ? rentalMonths : 1, installationSelected);
    setIsHandoffOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* Breadcrumb Bar */}
        <div className="bg-white border-b border-slate-200 py-3 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-teal-700 transition-colors">
                Home
              </Link>
              <ChevronRight size={14} />
              <Link href="/products" className="hover:text-teal-700 transition-colors">
                Medical Store
              </Link>
              <ChevronRight size={14} />
              <Link
                href={`/products?category=${product.category}`}
                className="hover:text-teal-700 transition-colors capitalize"
              >
                {product.category?.replace('_', ' ')}
              </Link>
              <ChevronRight size={14} />
              <span className="font-semibold text-navy truncate max-w-xs sm:max-w-md">
                {product.title}
              </span>
            </nav>
          </div>
        </div>

        {/* Product Details Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Image Gallery & Trust Badges (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Main Image Viewport with Fallback Component */}
              <div className="relative rounded-3xl bg-white border border-slate-200 p-2 shadow-sm overflow-hidden flex flex-col">
                <ProductImage
                  src={imagesList[selectedImageIndex]}
                  alt={product.title}
                  category={product.category}
                  aspectRatio="aspect-square"
                  className="w-full h-full object-contain p-2"
                  priority={true}
                />

                {/* Sourcing & Demo Badges Overlay */}
                <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2 pointer-events-none">
                  {product.sourcingType === 'supplier_direct' ? (
                    <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                      Supplier Direct &bull; Verified Partner
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-teal-700 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                      VivoQuest Central Depot &bull; 24h
                    </span>
                  )}

                  {product.isDemo && (
                    <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                      Demo Equipment
                    </span>
                  )}
                </div>
              </div>

              {/* Multiple Product Images Gallery Thumbnails */}
              {imagesList.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {imagesList.map((imgUrl: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-20 h-20 rounded-2xl border-2 overflow-hidden bg-white p-1 transition-all shrink-0 ${
                        selectedImageIndex === idx
                          ? 'border-teal-600 shadow-sm ring-2 ring-teal-600/20'
                          : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`${product.title} view ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Delivery Estimate & Regional Notice */}
              <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 text-teal-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-teal-800">
                  <Truck size={16} className="text-teal-600" />
                  <span>Estimated Regional Delivery</span>
                </div>
                <p className="text-[11px] leading-relaxed text-teal-800/90 font-medium">
                  <strong>Estimated delivery: 2-4 business days</strong> in Pune, Mumbai, and surrounding regions.
                  Delivery dates are estimates based on central depot stock and road logistics.
                </p>
              </div>

              {/* 7-Day Return & Warranty Policy */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-navy">
                  <RotateCcw size={16} className="text-teal-600" />
                  <span>Return &amp; Warranty Policy</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>7-day return window</strong> for unopened equipment. 1-year authorized manufacturer warranty included. Clinical equipment sanitized prior to dispatch.
                </p>
              </div>

              {/* Closed-Loop Safety Guarantee */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>VivoQuest Closed-Loop Safety Protocol</span>
                </div>
                <ul className="space-y-1 text-[11px] text-emerald-800/90 list-disc list-inside">
                  <li>Sanitized and calibrated at regional medical depots before dispatch.</li>
                  <li>Optional technician assembly and patient family tutorial.</li>
                  <li>Doorstep return if device does not match medical order.</li>
                </ul>
              </div>
            </div>

            {/* Right Column: Pricing, Specs, Review, Actions (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Header Title & SKU */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <span className="font-mono text-slate-500">{product.sku}</span>
                  {product.badge && (
                    <>
                      <span>&bull;</span>
                      <span className="text-teal-700 font-bold">{product.badge}</span>
                    </>
                  )}
                  {product.sourcingType === 'supplier_direct' ? (
                    <>
                      <span>&bull;</span>
                      <span className="text-blue-700 font-bold">Supplier Direct: {product.supplierName || 'Verified Partner'}</span>
                    </>
                  ) : (
                    <>
                      <span>&bull;</span>
                      <span className="text-teal-700 font-bold">VivoQuest Verified Depot</span>
                    </>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight leading-snug">
                  {product.title}
                </h1>

                {/* Real Ratings Only (Rule 6: Never display fake stars if reviewCount is 0) */}
                {product.reviewCount && product.reviewCount > 0 ? (
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-700 pt-1">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={16}
                          className={s <= Math.round(product.averageRating || 5) ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}
                        />
                      ))}
                    </div>
                    <span>{product.averageRating?.toFixed(1) || '5.0'} / 5.0</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({product.reviewCount} verified reviews)
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pt-1">
                    No customer reviews yet. Ratings are submitted exclusively following verified delivery.
                  </p>
                )}

                <p className="text-sm text-slate-600 leading-relaxed pt-1">
                  {product.description}
                </p>
              </div>

              {/* Stock Indicator */}
              <div className="flex items-center gap-3 py-2 border-y border-slate-200">
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                    <AlertTriangle size={14} />
                    Currently Out of Stock — Awaiting Depot Restock
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                    <Clock size={14} />
                    Only {product.stockQuantity} units left in regional depots
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 size={14} />
                    In Stock ({product.stockQuantity} units available for dispatch)
                  </span>
                )}
              </div>

              {/* Purchase vs Monthly Rental Selection Block */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Purchase &amp; Pricing Details
                  </span>
                  {product.isRentalAvailable && (
                    <span className="text-xs font-bold text-teal-700">
                      Flexible Patient Rental Available
                    </span>
                  )}
                </div>

                {/* Acquisition Mode Switcher */}
                {product.isRentalAvailable ? (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Outright Purchase Card */}
                    <button
                      type="button"
                      onClick={() => setIsRental(false)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        !isRental
                          ? 'border-teal-600 bg-teal-50/40 shadow-xs ring-2 ring-teal-600/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold text-navy mb-1">Outright Purchase</div>
                      <div className="text-2xl font-extrabold text-navy">
                        ₹{unitSellingPrice.toLocaleString('en-IN')}
                      </div>
                      {hasDiscount && (
                        <div className="text-xs text-slate-400 line-through mt-0.5">
                          ₹{regularPrice.toLocaleString('en-IN')}
                        </div>
                      )}
                    </button>

                    {/* Monthly Rental Card */}
                    <button
                      type="button"
                      onClick={() => setIsRental(true)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        isRental
                          ? 'border-teal-600 bg-teal-50/40 shadow-xs ring-2 ring-teal-600/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold text-teal-700 mb-1">Monthly Rental</div>
                      <div className="text-2xl font-extrabold text-teal-700">
                        ₹{(product.rentalPriceMonthly || unitSellingPrice).toLocaleString('en-IN')}
                        <span className="text-xs font-semibold text-muted-foreground"> / mo</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Refundable deposit applies</div>
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Outright Purchase Direct Price Banner */}
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-extrabold text-navy">
                        ₹{unitSellingPrice.toLocaleString('en-IN')}
                      </span>
                      {hasDiscount && (
                        <span className="text-base text-slate-400 line-through">
                          ₹{regularPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                      {discountPercent > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>

                    {hasDiscount && (
                      <p className="text-xs font-bold text-emerald-700 mt-1">
                        Total Savings: ₹{savingsPerUnit.toLocaleString('en-IN')} ({discountPercent}% discount)
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mt-1">
                      Inclusive of 12% GST (approx. ₹{gstAmount.toLocaleString('en-IN')}). Free delivery on orders over ₹2,000.
                    </p>
                  </div>
                )}

                {/* Rental Duration Selector */}
                {isRental && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-navy">Select Rental Duration</span>
                      <span className="font-extrabold text-teal-700">
                        {rentalMonths} {rentalMonths === 1 ? 'Month' : 'Months'} (₹{totalItemPrice.toLocaleString('en-IN')})
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {[1, 2, 3, 6].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setRentalMonths(m)}
                          className={`py-2 rounded-xl font-bold border transition-all ${
                            rentalMonths === m
                              ? 'bg-navy text-white border-navy shadow-xs'
                              : 'bg-white text-navy border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {m} {m === 1 ? 'Month' : 'Months'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity and Installation Controls */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-navy block">Select Quantity</span>
                      <span className="text-[10px] text-muted-foreground">Maximum available: {product.stockQuantity}</span>
                    </div>
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1 || isOutOfStock}
                        className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-navy disabled:opacity-30"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-12 text-center text-sm font-extrabold text-navy">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                        disabled={quantity >= product.stockQuantity || isOutOfStock}
                        className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-navy disabled:opacity-30"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Clinician Installation Option */}
                  {product.installationEligible && (
                    <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs space-y-1.5">
                      <label className="flex items-start gap-2.5 cursor-pointer font-bold text-navy">
                        <input
                          type="checkbox"
                          checked={installationSelected}
                          onChange={(e) => setInstallationSelected(e.target.checked)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span>Certified In-Home Clinician Setup &amp; Tutorial</span>
                            <span className="font-extrabold text-blue-800 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 text-[11px]">
                              +₹{product.installationServiceCharge || 0}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-normal mt-0.5 leading-relaxed">
                            {product.installationDescription || 'Our certified clinical specialist will assemble, test, and provide an operational demo for family caregivers.'}
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Action Buttons: Order in Patient App & Add to Cart */}
                  <div className="space-y-2.5 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        variant="primary"
                        size="lg"
                        className="justify-center text-sm font-bold shadow-md bg-navy hover:bg-slate-800 text-white flex items-center gap-2"
                        disabled={isOutOfStock}
                        onClick={handleBuyNow}
                        leftIcon={<Smartphone size={18} className="text-teal-400" />}
                        rightIcon={<ChevronRight size={16} />}
                      >
                        {isOutOfStock ? 'Out of Stock' : `Order in Patient App • ₹${totalItemPrice.toLocaleString('en-IN')}`}
                      </Button>

                      <Button
                        variant={isAdded ? 'secondary' : 'outline'}
                        size="lg"
                        className="justify-center text-sm font-bold bg-white"
                        disabled={isOutOfStock}
                        onClick={handleAddToCart}
                        leftIcon={isAdded ? <Check size={16} /> : <ShoppingBag size={16} />}
                      >
                        {isAdded ? 'Added to Cart!' : 'Add to Cart'}
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-[11px] text-teal-900 font-medium">
                      <Smartphone size={15} className="text-teal-700 shrink-0" />
                      <span>Medical equipment orders, payments, and technician setups are completed securely in the VivoQuest Patient Mobile App.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinician Setup Notification Box */}
              {product.setupRequiredByClinician && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start gap-3">
                  <Wrench size={20} className="text-purple-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      In-Home Clinician Setup &amp; Calibration Included
                    </p>
                    <p className="text-purple-800/90 leading-relaxed text-[11px]">
                      This equipment requires clinical assembly. A certified{' '}
                      <span className="font-bold capitalize">{product.recommendedSpecialistRole || 'specialist'}</span>{' '}
                      will be dispatched to your residence alongside equipment delivery to set up the device and instruct family caregivers.
                    </p>
                  </div>
                </div>
              )}

              {/* Specifications Table */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy">
                    Technical &amp; Medical Specifications
                  </h3>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                    {Object.entries(product.specifications).map(([key, val], idx) => (
                      <div key={key} className={`flex items-center justify-between p-3 ${idx % 2 === 0 ? 'bg-slate-50/60' : 'bg-white'}`}>
                        <span className="text-slate-500 font-semibold text-[11px]">{key}</span>
                        <span className="font-bold text-navy text-right">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regional Depot Availability */}
              {product.depots && product.depots.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-navy">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={16} className="text-teal-600" />
                      Regional Depot Inventory Breakdown
                    </span>
                    <span className="text-slate-500 font-semibold">{product.depots.length} Fulfillment Hubs</span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {product.depots.map((depot: any, idx: number) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-navy">{depot.depotName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {depot.city} — Pincode {depot.pincode}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                              depot.inStockCount > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {depot.inStockCount > 0 ? `${depot.inStockCount} Units` : 'Out of Stock'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Customer Reviews & Ratings */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-navy flex items-center gap-2">
                      <Star size={16} className="fill-amber-400 text-amber-500" />
                      Verified Patient &amp; Family Reviews
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ratings submitted exclusively by verified purchasers following delivery
                    </p>
                  </div>
                  {product.reviewCount && product.reviewCount > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={
                              star <= Math.round(product.averageRating || 5)
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-slate-300'
                            }
                          />
                        ))}
                      </div>
                      <span className="font-extrabold text-navy text-sm">
                        {product.averageRating?.toFixed(1) || '5.0'} / 5.0
                      </span>
                      <span className="text-xs text-muted-foreground">({product.reviewCount} reviews)</span>
                    </div>
                  ) : null}
                </div>

                {isLoadingReviews ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading verified reviews...</div>
                ) : reviews.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No customer reviews published yet. Be the first verified purchaser to leave a review after delivery!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 space-y-3">
                    {reviews.map((rev: any, idx: number) => (
                      <div key={idx} className="pt-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={13}
                                  className={star <= rev.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}
                                />
                              ))}
                            </div>
                            <span className="font-bold text-navy">{rev.title}</span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Verified Purchase
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(rev.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{rev.comment}</p>
                        {rev.supplierResponse && (
                          <div className="mt-2 p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-[11px]">
                            <strong className="block text-teal-800 font-bold mb-0.5">Official Supplier Response</strong>
                            {rev.supplierResponse}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PatientAppHandoffModal
        isOpen={isHandoffOpen}
        onClose={() => setIsHandoffOpen(false)}
        product={{
          id: product._id || product.id || product.sku,
          sku: product.sku,
          title: product.title,
          price: totalItemPrice,
          quantity,
          isRental,
          rentalDurationMonths: isRental ? rentalMonths : 1,
          installationSelected,
        }}
      />

      <Footer />
    </div>
  );
}
