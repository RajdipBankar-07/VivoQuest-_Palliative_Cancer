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
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
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

  const { addItem } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await productsApi.getProductById(idOrSku);
        if (data) {
          setProduct(data);
          // If rental available, default to purchase, but enable rental toggle
        } else {
          setError('Product not found in VivoQuest DME catalog');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch product details.');
      } finally {
        setIsLoading(false);
      }
    };

    if (idOrSku) {
      fetchProduct();
    }
  }, [idOrSku]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-pulse space-y-6">
          <div className="w-1/4 h-5 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="aspect-square bg-slate-200 rounded-3xl" />
            <div className="space-y-4">
              <div className="w-3/4 h-8 bg-slate-200 rounded" />
              <div className="w-1/3 h-6 bg-slate-200 rounded" />
              <div className="w-full h-24 bg-slate-200 rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
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

  const currentUnitPrice = isRental
    ? (product.rentalPriceMonthly || product.price) * rentalMonths
    : product.price;

  const totalItemPrice = currentUnitPrice * quantity;

  const handleAddToCart = async () => {
    await addItem(product, quantity, isRental, isRental ? rentalMonths : 1);
  };

  const handleBuyNow = async () => {
    await addItem(product, quantity, isRental, isRental ? rentalMonths : 1);
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* Breadcrumb Bar */}
        <div className="bg-white border-b border-border py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <ChevronRight size={14} />
              <Link href="/products" className="hover:text-primary transition-colors">
                Medical Store
              </Link>
              <ChevronRight size={14} />
              <Link
                href={`/products?category=${product.category}`}
                className="hover:text-primary transition-colors capitalize"
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
            {/* Left Column: Gallery & Trust Notices (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Main Image Frame */}
              <div className="relative aspect-square rounded-3xl bg-white border border-border p-4 shadow-sm overflow-hidden flex items-center justify-center">
                {product.images && product.images[selectedImageIndex] ? (
                  <img
                    src={product.images[selectedImageIndex]}
                    alt={product.title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center">
                    <ShoppingBag size={64} />
                    <span className="text-xs mt-2 font-semibold">VivoQuest Medical Equipment</span>
                  </div>
                )}

                {/* Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2 pointer-events-none">
                  <span className="px-3 py-1 rounded-full bg-navy text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                    {product.category?.replace('_', ' ')}
                  </span>
                  {product.isDemo && (
                    <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                      Demo Equipment
                    </span>
                  )}
                </div>
              </div>

              {/* Demo Equipment & Unverified Claim Notice */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <Info size={16} className="text-amber-600" />
                  <span>Demonstration &amp; Clinical Certification Notice</span>
                </div>
                <p className="leading-relaxed text-amber-800/90 text-[11px]">
                  This product is labeled for demonstration in the VivoQuest test environment.
                  Medical indications and rehabilitation claims must be re-evaluated by the attending
                  physician or home health specialist prior to deployment.
                </p>
              </div>

              {/* Closed-Loop Safety Guarantee */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>The VivoQuest Closed-Loop Safety Protocol</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-emerald-800/90 list-disc list-inside">
                  <li>Sanitized and calibrated at regional medical depots before dispatch.</li>
                  <li>In-person technician assembly and patient caregiver tutorial.</li>
                  <li>Free doorstep return if equipment fails clinical comfort assessment.</li>
                </ul>
              </div>
            </div>

            {/* Right Column: Pricing, Setup, Depot Stock, Actions (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Header Title & SKU */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <span>SKU: {product.sku}</span>
                  {product.badge && (
                    <>
                      <span>•</span>
                      <span className="text-secondary font-bold">★ {product.badge}</span>
                    </>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight leading-snug">
                  {product.title}
                </h1>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Stock Indicator */}
              <div className="flex items-center gap-3 py-2 border-y border-border">
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
                    In Stock ({product.stockQuantity} available across Pune &amp; Mumbai)
                  </span>
                )}
              </div>

              {/* Purchase vs Monthly Rental Selection Block */}
              <div className="bg-white rounded-2xl border border-border p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Acquisition Mode
                  </span>
                  {product.isRentalAvailable && (
                    <span className="text-xs font-bold text-secondary">
                      Flexible Patient Rental Available
                    </span>
                  )}
                </div>

                {/* Option Toggle */}
                {product.isRentalAvailable ? (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Purchase Card */}
                    <button
                      type="button"
                      onClick={() => setIsRental(false)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        !isRental
                          ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                          : 'border-border bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold text-navy mb-1">Outright Purchase</div>
                      <div className="text-2xl font-extrabold text-navy">
                        ₹{product.price.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 font-medium">
                        One-time payment • Lifetime ownership
                      </div>
                    </button>

                    {/* Rental Card */}
                    <button
                      type="button"
                      onClick={() => setIsRental(true)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        isRental
                          ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                          : 'border-border bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold text-primary mb-1">Monthly Rental</div>
                      <div className="text-2xl font-extrabold text-primary">
                        ₹{product.rentalPriceMonthly?.toLocaleString('en-IN')}
                        <span className="text-xs text-muted-foreground font-semibold"> / mo</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 font-medium">
                        Ideal for post-op rehab or palliative term
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-border">
                    <span className="text-xs font-semibold text-muted-foreground">Purchase Price</span>
                    <div className="text-3xl font-extrabold text-navy mt-1">
                      ₹{product.price.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}

                {/* Rental Duration Selector (If Rental chosen) */}
                {isRental && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-navy">Rental Term Duration</span>
                      <span className="font-extrabold text-primary">
                        {rentalMonths} {rentalMonths === 1 ? 'Month' : 'Months'} (₹
                        {totalItemPrice.toLocaleString('en-IN')})
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {[1, 2, 3, 6].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setRentalMonths(m)}
                          className={`py-2 rounded-lg font-bold border transition-all ${
                            rentalMonths === m
                              ? 'bg-primary text-white border-primary shadow-xs'
                              : 'bg-white text-navy border-border hover:bg-slate-50'
                          }`}
                        >
                          {m} {m === 1 ? 'Mo' : 'Mos'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity and Action Buttons */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy">Select Quantity</span>
                    <div className="flex items-center border border-border rounded-xl bg-slate-50">
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

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <Button
                      variant="primary"
                      size="lg"
                      className="justify-center text-sm font-bold shadow-md"
                      disabled={isOutOfStock}
                      onClick={handleBuyNow}
                      rightIcon={<ChevronRight size={16} />}
                    >
                      {isOutOfStock ? 'Out of Stock' : `Buy Now • ₹${totalItemPrice.toLocaleString('en-IN')}`}
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      className="justify-center text-sm font-bold bg-white"
                      disabled={isOutOfStock}
                      onClick={handleAddToCart}
                      leftIcon={<ShoppingBag size={16} />}
                    >
                      Add to Cart
                    </Button>
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
                      will be dispatched to your residence alongside the carrier to set up the device,
                      test vital parameters, and instruct family caregivers.
                    </p>
                  </div>
                </div>
              )}

              {/* Regional Depot Availability Accordion */}
              {product.depots && product.depots.length > 0 && (
                <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-navy">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={16} className="text-primary" />
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
                            className={`font-bold px-2 py-0.5 rounded text-[11px] ${
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

              {/* Specifications Table */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy">
                    Technical &amp; Medical Specifications
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {Object.entries(product.specifications).map(([key, val]) => (
                      <div key={key} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <dt className="text-muted-foreground font-semibold text-[11px]">{key}</dt>
                        <dd className="font-bold text-navy mt-0.5">{String(val)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
