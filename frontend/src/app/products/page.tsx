'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Wrench,
  FileText,
  Clock,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  Info,
  MapPin,
  Truck,
  HeartPulse,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { productsApi } from '@/lib/api';
import { useCart } from '@/context/CartContext';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rentalOnly, setRentalOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rental vs Purchase mode selection per card (sku -> boolean)
  const [rentalSelections, setRentalSelections] = useState<Record<string, boolean>>({});

  const { addItem } = useCart();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const catRes = await productsApi.getCategories();
        if (catRes && Array.isArray(catRes)) {
          setCategories(catRes);
        }
      } catch {
        // Fallback categories
        setCategories([
          { id: 'all', label: 'All Products & Equipment' },
          { id: 'mobility', label: 'Mobility Aids & Wheelchairs' },
          { id: 'respiratory', label: 'Respiratory & Oxygen Therapy' },
          { id: 'monitoring_diagnostics', label: 'Monitoring Devices & Vitals' },
          { id: 'icu_home_setup', label: 'Specialized Beds & ICU Setup' },
          { id: 'clinical_nutrition', label: 'Clinical Nutrition & Formulas' },
          { id: 'fall_prevention', label: 'Fall Hazard Mitigation (SDoH)' },
          { id: 'wound_care', label: 'Post-Op Wound Dressings' },
        ]);
      }
    };

    loadCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await productsApi.getProducts({
        category: selectedCategory,
        search: searchQuery,
        rentalOnly,
        inStockOnly,
        limit: 50,
      });

      if (res && res.data) {
        setProducts(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load medical products catalog. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, rentalOnly, inStockOnly]);

  // Handle live search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Client-side sorting
  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === 'price_asc') {
      return list.sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price_desc') {
      return list.sort((a, b) => b.price - a.price);
    }
    return list;
  }, [products, sortBy]);

  const handleToggleRentalMode = (sku: string, isRental: boolean) => {
    setRentalSelections((prev) => ({ ...prev, [sku]: isRental }));
  };

  const handleAddToCart = async (product: any) => {
    const isRental = Boolean(rentalSelections[product.sku] && product.isRentalAvailable);
    await addItem(product, 1, isRental, isRental ? 1 : undefined);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-white via-slate-50 to-slate-100 border-b border-border py-10 md:py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles size={14} />
                <span>Certified DME &amp; Clinical Supplies</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-navy tracking-tight leading-tight">
                Hospital-Grade Equipment &amp; Diagnostics at Home
              </h1>
              <p className="mt-3 text-base sm:text-lg text-navy/70 leading-relaxed">
                Purchase or rent specialized medical equipment with verified closed-loop delivery.
                Technicians and clinicians dispatched alongside equipment for calibrated assembly.
              </p>

              {/* Trust Badges */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-navy/80">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-border shadow-xs">
                  <Truck size={15} className="text-secondary" />
                  <span>Free Delivery on Orders &ge; ₹2,000</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-border shadow-xs">
                  <ShieldCheck size={15} className="text-emerald-600" />
                  <span>Biomedical Safety Inspected</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-border shadow-xs">
                  <MapPin size={15} className="text-primary" />
                  <span>Pune &amp; Mumbai Regional Depots</span>
                </div>
              </div>
            </div>

            {/* Unverified Claims & Demo Equipment Notice */}
            <div className="mt-8 p-3.5 sm:p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-start gap-3 shadow-xs">
              <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  Clinical Disclaimer &amp; Demonstration Equipment Notice
                </p>
                <p className="text-blue-800/90 leading-relaxed">
                  Medical device claims and diagnostic collection procedures are certified for use only upon
                  physician prescription review and clinical triage. Demo equipment badges indicate demonstration
                  inventory; actual delivery requires prescription verification for clinical respiratory and hospital bed products.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Catalog Control Bar */}
        <section className="sticky top-[105px] z-30 bg-white/95 backdrop-blur-md border-b border-border py-4 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
            {/* Search and Filters Row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-lg">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search walkers, BiPAP, beds, vitals kits, dressings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-navy"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Toggles & Sort */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Rental toggle */}
                <button
                  onClick={() => setRentalOnly(!rentalOnly)}
                  className={`px-3 py-2 rounded-xl font-bold border transition-all ${
                    rentalOnly
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-white text-navy/80 border-border hover:bg-slate-50'
                  }`}
                >
                  Monthly Rentals
                </button>

                {/* In Stock toggle */}
                <button
                  onClick={() => setInStockOnly(!inStockOnly)}
                  className={`px-3 py-2 rounded-xl font-bold border transition-all ${
                    inStockOnly
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-navy/80 border-border hover:bg-slate-50'
                  }`}
                >
                  In Stock Only
                </button>

                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="px-3 py-2 rounded-xl font-semibold bg-white text-navy border border-border outline-none focus:border-primary pr-8 appearance-none cursor-pointer"
                  >
                    <option value="featured">Sort: Featured</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Category Pills Slider */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all duration-150 ${
                      isSelected
                        ? 'bg-navy text-white shadow-xs'
                        : 'bg-slate-100 text-navy/70 hover:bg-slate-200/80 hover:text-navy'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Main Product Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-border p-4 space-y-3 animate-pulse">
                  <div className="w-full h-48 bg-slate-200 rounded-xl" />
                  <div className="w-2/3 h-4 bg-slate-200 rounded" />
                  <div className="w-full h-3 bg-slate-100 rounded" />
                  <div className="w-1/2 h-5 bg-slate-200 rounded mt-4" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-md mx-auto my-12">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-base font-bold text-navy mb-1">Catalog Unavailable</h3>
              <p className="text-xs text-muted-foreground mb-4">{error}</p>
              <Button variant="primary" size="sm" onClick={fetchProducts} leftIcon={<RefreshCw size={14} />}>
                Retry Catalog
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && sortedProducts.length === 0 && (
            <div className="bg-white rounded-2xl border border-border p-12 text-center max-w-md mx-auto my-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag size={28} />
              </div>
              <h3 className="text-lg font-bold text-navy mb-1">No products match your filters</h3>
              <p className="text-xs text-muted-foreground mb-6">
                Try clearing your search term, switching categories, or clearing rental filters.
              </p>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setRentalOnly(false);
                  setInStockOnly(false);
                }}
              >
                Reset All Filters
              </Button>
            </div>
          )}

          {/* Products Grid */}
          {!isLoading && !error && sortedProducts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  Showing <span className="text-navy font-bold">{sortedProducts.length}</span> verified medical products
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedProducts.map((product) => {
                  const isRentalSelected = Boolean(rentalSelections[product.sku] && product.isRentalAvailable);
                  const isOutOfStock = product.stockQuantity <= 0;
                  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;

                  return (
                    <div
                      key={product.sku}
                      className="group bg-white rounded-2xl border border-border hover:border-primary/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden"
                    >
                      <div>
                        {/* Image Header with Badges */}
                        <div className="relative aspect-4/3 bg-slate-100 overflow-hidden flex items-center justify-center border-b border-border/60">
                          {product.images && product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="text-slate-300 flex flex-col items-center">
                              <ShoppingBag size={40} />
                              <span className="text-[10px] mt-1 font-semibold">VivoQuest DME</span>
                            </div>
                          )}

                          {/* Top Badges */}
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1 pointer-events-none">
                            <span className="px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[10px] font-extrabold uppercase tracking-wider text-navy shadow-xs border border-border/80">
                              {product.category?.replace('_', ' ')}
                            </span>

                            {product.isDemo && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                                Demo Equipment
                              </span>
                            )}
                          </div>

                          {/* Setup Included Overlay Tag */}
                          {product.setupRequiredByClinician && (
                            <div className="absolute bottom-2 left-2.5 bg-navy/85 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Wrench size={10} className="text-secondary-light" />
                              <span>Clinician Setup Included</span>
                            </div>
                          )}
                        </div>

                        {/* Body Details */}
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="font-semibold uppercase tracking-wider text-slate-500">
                              {product.sku}
                            </span>
                            {/* Stock Indicator */}
                            {isOutOfStock ? (
                              <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Low Stock ({product.stockQuantity} left)
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 size={11} />
                                In Stock ({product.stockQuantity})
                              </span>
                            )}
                          </div>

                          <Link
                            href={`/products/${product._id || product.id || product.sku}`}
                            className="block font-bold text-navy text-sm leading-snug hover:text-primary transition-colors line-clamp-2"
                          >
                            {product.title}
                          </Link>

                          {product.badge && (
                            <p className="text-[11px] font-bold text-secondary line-clamp-1">
                              ★ {product.badge}
                            </p>
                          )}

                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>

                          {product.requiresPrescription && (
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50/80 px-2 py-1 rounded-md border border-amber-200/60">
                              <FileText size={12} className="text-amber-600 shrink-0" />
                              <span>Prescription required upon delivery</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Pricing & Add to Cart */}
                      <div className="p-4 pt-0">
                        {/* Purchase vs Monthly Rental Switcher (if available) */}
                        {product.isRentalAvailable && (
                          <div className="mb-3 p-1 bg-slate-100 rounded-xl flex items-center text-xs">
                            <button
                              onClick={() => handleToggleRentalMode(product.sku, false)}
                              className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                                !isRentalSelected
                                  ? 'bg-white text-navy shadow-xs'
                                  : 'text-muted-foreground hover:text-navy'
                              }`}
                            >
                              Buy
                            </button>
                            <button
                              onClick={() => handleToggleRentalMode(product.sku, true)}
                              className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                                isRentalSelected
                                  ? 'bg-white text-primary shadow-xs'
                                  : 'text-muted-foreground hover:text-navy'
                              }`}
                            >
                              Rent / mo
                            </button>
                          </div>
                        )}

                        <div className="flex items-baseline justify-between mb-3">
                          <div>
                            {isRentalSelected ? (
                              <div>
                                <span className="text-xl font-extrabold text-primary">
                                  ₹{product.rentalPriceMonthly?.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold"> / month</span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-xl font-extrabold text-navy">
                                  ₹{product.price?.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-medium"> + 12% GST</span>
                              </div>
                            )}
                          </div>
                          <Link
                            href={`/products/${product._id || product.id || product.sku}`}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            Details &rarr;
                          </Link>
                        </div>

                        {/* Action Button */}
                        <Button
                          variant={isOutOfStock ? 'outline' : 'primary'}
                          size="sm"
                          className="w-full justify-center text-xs font-bold"
                          disabled={isOutOfStock}
                          onClick={() => handleAddToCart(product)}
                          leftIcon={<ShoppingBag size={14} />}
                        >
                          {isOutOfStock
                            ? 'Out of Stock'
                            : isRentalSelected
                            ? 'Add Rental to Cart'
                            : 'Add to Cart'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
