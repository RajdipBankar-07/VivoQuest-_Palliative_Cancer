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
  X,
  Truck,
  HeartPulse,
  Tag,
  Star,
  Check,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { ProductImage } from '@/components/ProductImage';
import { PatientAppHandoffModal } from '@/components/PatientAppHandoffModal';
import { productsApi } from '@/lib/api';
import { useCart } from '@/context/CartContext';

const ITEMS_PER_PAGE = 12;

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rentalOnly, setRentalOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [installationOnly, setInstallationOnly] = useState(false);
  const [sourcingFilter, setSourcingFilter] = useState<'all' | 'own_stock' | 'supplier_direct'>('all');
  const [priceRange, setPriceRange] = useState<'all' | 'under_1k' | '1k_5k' | '5k_20k' | 'above_20k'>('all');
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rental vs Purchase mode selection per card (sku -> boolean)
  const [rentalSelections, setRentalSelections] = useState<Record<string, boolean>>({});
  const [addedSku, setAddedSku] = useState<string | null>(null);
  const [isHandoffOpen, setIsHandoffOpen] = useState(false);
  const [handoffProduct, setHandoffProduct] = useState<any>(null);

  const { addItem } = useCart();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const catRes = await productsApi.getCategories();
        if (catRes && Array.isArray(catRes)) {
          setCategories(catRes);
        }
      } catch {
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
        limit: 100,
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
    setCurrentPage(1);
  }, [selectedCategory, rentalOnly, inStockOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Client-side filtering & sorting
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Sourcing
    if (sourcingFilter === 'own_stock') {
      list = list.filter((p) => p.sourcingType === 'own_stock' || !p.sourcingType);
    } else if (sourcingFilter === 'supplier_direct') {
      list = list.filter((p) => p.sourcingType === 'supplier_direct');
    }

    // Installation
    if (installationOnly) {
      list = list.filter((p) => Boolean(p.installationEligible));
    }

    // Price range
    if (priceRange === 'under_1k') {
      list = list.filter((p) => (p.sellingPrice || p.price) < 1000);
    } else if (priceRange === '1k_5k') {
      list = list.filter((p) => {
        const pVal = p.sellingPrice || p.price;
        return pVal >= 1000 && pVal <= 5000;
      });
    } else if (priceRange === '5k_20k') {
      list = list.filter((p) => {
        const pVal = p.sellingPrice || p.price;
        return pVal > 5000 && pVal <= 20000;
      });
    } else if (priceRange === 'above_20k') {
      list = list.filter((p) => (p.sellingPrice || p.price) > 20000);
    }

    // Discount filter
    if (minDiscount > 0) {
      list = list.filter((p) => (p.discountPercentage || 0) >= minDiscount);
    }

    // Sorting
    if (sortBy === 'price_asc') {
      list.sort((a, b) => (a.sellingPrice || a.price) - (b.sellingPrice || b.price));
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => (b.sellingPrice || b.price) - (a.sellingPrice || a.price));
    } else if (sortBy === 'rating') {
      // Sort by verified real ratings only (unrated products pushed to bottom)
      list.sort((a, b) => {
        const aScore = (a.reviewCount && a.reviewCount > 0) ? (a.averageRating || 0) : 0;
        const bScore = (b.reviewCount && b.reviewCount > 0) ? (b.averageRating || 0) : 0;
        return bScore - aScore;
      });
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return list;
  }, [products, sourcingFilter, installationOnly, priceRange, minDiscount, sortBy]);

  // Pagination calculation
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (searchQuery.trim()) count++;
    if (rentalOnly) count++;
    if (inStockOnly) count++;
    if (installationOnly) count++;
    if (sourcingFilter !== 'all') count++;
    if (priceRange !== 'all') count++;
    if (minDiscount > 0) count++;
    if (sortBy !== 'featured') count++;
    return count;
  }, [selectedCategory, searchQuery, rentalOnly, inStockOnly, installationOnly, sourcingFilter, priceRange, minDiscount, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setRentalOnly(false);
    setInStockOnly(false);
    setInstallationOnly(false);
    setSourcingFilter('all');
    setPriceRange('all');
    setMinDiscount(0);
    setSortBy('featured');
    setCurrentPage(1);
  };

  const handleToggleRentalMode = (sku: string, isRental: boolean) => {
    setRentalSelections((prev) => ({ ...prev, [sku]: isRental }));
  };

  const handleAddToCart = async (product: any) => {
    const isRental = Boolean(rentalSelections[product.sku] && product.isRentalAvailable);
    await addItem(product, 1, isRental, isRental ? 1 : undefined);
    setAddedSku(product.sku);
    setTimeout(() => {
      setAddedSku((prev) => (prev === product.sku ? null : prev));
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* Amazon/Flipkart Inspired Hero Banner with VivoQuest Branding */}
        <section className="bg-gradient-to-r from-slate-900 via-navy to-slate-900 text-white py-10 md:py-14 border-b border-slate-800 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider mb-3 border border-teal-500/30">
                  <Sparkles size={14} />
                  <span>Clinical E-Commerce Storefront</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                  Premium Healthcare &amp; Medical Equipment
                </h1>
                <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
                  Hospital-grade DME, mobility aids, respiratory therapy, and clinical monitoring devices delivered to your doorstep with certified clinician installation.
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Truck size={14} className="text-teal-400" /> Free delivery over ₹2,000
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck size={14} className="text-teal-400" /> Biomedical Depot Tested
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Wrench size={14} className="text-teal-400" /> In-Home Technician Setup
                  </span>
                </div>
              </div>

              {/* Quick Trust Badges */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 max-w-sm space-y-2 text-xs">
                <p className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  VivoQuest Quality Guarantee
                </p>
                <p className="text-slate-300 leading-normal">
                  All equipment sterilized, calibrated, and compliant with Indian Medical Device Rules (MDR 2017).
                </p>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between font-bold text-emerald-400">
                  <span>Pune &amp; Surrounding Hubs</span>
                  <span>24-Hour Dispatch</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Storefront Layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Patient App Mobile Ordering Banner */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-teal-50 via-slate-50 to-teal-50 border border-teal-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Smartphone size={20} />
              </div>
              <div>
                <p className="font-extrabold text-sm text-navy flex items-center gap-2">
                  <span>Order Directly in the VivoQuest Patient App</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    App-First Ordering
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Browse products and technical specs here on the website. Completed purchases, clinician installation bookings, and live shipment tracking are fulfilled in the Patient Mobile App.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setHandoffProduct(null);
                setIsHandoffOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-navy hover:bg-slate-800 text-white font-extrabold text-xs shadow-sm transition flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-center cursor-pointer"
            >
              <Smartphone size={14} className="text-teal-400" />
              <span>Open in Patient App</span>
            </button>
          </div>

          {/* Search, Mobile Filter Toggle & Quick Sourcing Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Live Search */}
            <div className="relative flex-1 max-w-lg">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search equipment, SKU, oxygen, wheelchair, BP monitor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-teal-600 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Sourcing Tabs (All vs VivoQuest Depot vs Supplier Direct) */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold overflow-x-auto">
              <button
                onClick={() => { setSourcingFilter('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  sourcingFilter === 'all' ? 'bg-white text-navy shadow-xs' : 'text-slate-600 hover:text-navy'
                }`}
              >
                All Sources
              </button>
              <button
                onClick={() => { setSourcingFilter('own_stock'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  sourcingFilter === 'own_stock' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-navy'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                VivoQuest Depot (24h)
              </button>
              <button
                onClick={() => { setSourcingFilter('supplier_direct'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  sourcingFilter === 'supplier_direct' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-navy'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Supplier Direct
              </button>
            </div>

            {/* Sort Dropdown & Mobile Filter Button */}
            <div className="flex items-center gap-2.5 justify-between md:justify-end">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="md:hidden px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200"
              >
                <Filter size={15} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <span className="hidden sm:inline text-muted-foreground font-semibold">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-navy outline-none focus:border-teal-600 cursor-pointer"
                >
                  <option value="featured">Featured / Recommended</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Customer Rated</option>
                  <option value="newest">Newest Additions</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Desktop Left Sidebar Filters */}
            <aside className="hidden lg:block space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-navy text-sm flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-teal-600" /> Filter Equipment
                  </h3>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="text-xs font-bold text-teal-600 hover:underline"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Categories</label>
                  <div className="space-y-1">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                          selectedCategory === cat.id
                            ? 'bg-teal-50 text-teal-900 font-bold border-l-3 border-teal-600'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Price Range</label>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {[
                      { id: 'all', label: 'All Prices' },
                      { id: 'under_1k', label: 'Under ₹1,000' },
                      { id: '1k_5k', label: '₹1,000 to ₹5,000' },
                      { id: '5k_20k', label: '₹5,000 to ₹20,000' },
                      { id: 'above_20k', label: 'Over ₹20,000' },
                    ].map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 cursor-pointer font-medium hover:text-navy">
                        <input
                          type="radio"
                          name="priceRange"
                          checked={priceRange === opt.id}
                          onChange={() => { setPriceRange(opt.id as any); setCurrentPage(1); }}
                          className="text-teal-600 focus:ring-teal-500 rounded"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Discount Filter */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Discount &amp; Deals</label>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {[
                      { val: 0, label: 'All Deals' },
                      { val: 10, label: '10% Off or more' },
                      { val: 20, label: '20% Off or more' },
                      { val: 30, label: '30% Off or more' },
                    ].map((opt) => (
                      <label key={opt.val} className="flex items-center gap-2 cursor-pointer font-medium hover:text-navy">
                        <input
                          type="radio"
                          name="minDiscount"
                          checked={minDiscount === opt.val}
                          onChange={() => { setMinDiscount(opt.val); setCurrentPage(1); }}
                          className="text-teal-600 focus:ring-teal-500 rounded"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Service & Availability Toggles */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Services &amp; Stock</label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-navy">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => { setInStockOnly(e.target.checked); setCurrentPage(1); }}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold">In-Stock Equipment Only</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-navy">
                    <input
                      type="checkbox"
                      checked={installationOnly}
                      onChange={(e) => { setInstallationOnly(e.target.checked); setCurrentPage(1); }}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold">Clinician Installation Eligible</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-navy">
                    <input
                      type="checkbox"
                      checked={rentalOnly}
                      onChange={(e) => { setRentalOnly(e.target.checked); setCurrentPage(1); }}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold">Monthly Rental Available</span>
                  </label>
                </div>
              </div>
            </aside>

            {/* Mobile Filter Drawer */}
            {isMobileFilterOpen && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                <div
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                  onClick={() => setIsMobileFilterOpen(false)}
                />
                <div className="relative ml-auto w-full max-w-xs bg-white h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <h3 className="font-bold text-navy text-base flex items-center gap-2">
                        <SlidersHorizontal size={18} /> Filters
                      </h3>
                      <button
                        onClick={() => setIsMobileFilterOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Category selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-500">Categories</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-500">Price Range</label>
                      <select
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                      >
                        <option value="all">All Prices</option>
                        <option value="under_1k">Under ₹1,000</option>
                        <option value="1k_5k">₹1,000 to ₹5,000</option>
                        <option value="5k_20k">₹5,000 to ₹20,000</option>
                        <option value="above_20k">Over ₹20,000</option>
                      </select>
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-3 text-xs pt-2">
                      <label className="flex items-center gap-2 font-semibold">
                        <input
                          type="checkbox"
                          checked={inStockOnly}
                          onChange={(e) => setInStockOnly(e.target.checked)}
                          className="rounded text-teal-600"
                        />
                        <span>In Stock Only</span>
                      </label>
                      <label className="flex items-center gap-2 font-semibold">
                        <input
                          type="checkbox"
                          checked={installationOnly}
                          onChange={(e) => setInstallationOnly(e.target.checked)}
                          className="rounded text-teal-600"
                        />
                        <span>Installation Available</span>
                      </label>
                      <label className="flex items-center gap-2 font-semibold">
                        <input
                          type="checkbox"
                          checked={rentalOnly}
                          onChange={(e) => setRentalOnly(e.target.checked)}
                          className="rounded text-teal-600"
                        />
                        <span>Rental Available</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 flex gap-3">
                    <button
                      onClick={resetFilters}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setIsMobileFilterOpen(false)}
                      className="flex-1 py-2.5 bg-navy hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Product Grid Column */}
            <div className="lg:col-span-3 space-y-6">
              {/* Results count & Active Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <p className="font-semibold">
                  Showing <span className="text-navy font-bold">{totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span> of <span className="text-navy font-bold">{totalItems}</span> verified medical products
                </p>

                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
                  >
                    <span>Clear all {activeFilterCount} active filters</span>
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse">
                      <div className="aspect-[4/3] bg-slate-200 rounded-xl" />
                      <div className="w-1/3 h-4 bg-slate-200 rounded" />
                      <div className="w-3/4 h-5 bg-slate-200 rounded" />
                      <div className="w-1/2 h-6 bg-slate-200 rounded" />
                    </div>
                  ))}
                </div>
              )}

              {/* Error State */}
              {!isLoading && error && (
                <div className="bg-white rounded-3xl border border-red-200 p-8 text-center max-w-md mx-auto my-8">
                  <AlertCircle size={36} className="text-red-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-navy mb-1">Catalog Connection Issue</h3>
                  <p className="text-xs text-muted-foreground mb-4">{error}</p>
                  <Button variant="primary" size="sm" onClick={fetchProducts} leftIcon={<RefreshCw size={14} />}>
                    Retry Catalog
                  </Button>
                </div>
              )}

              {/* Empty Results State */}
              {!isLoading && !error && paginatedProducts.length === 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4 border border-teal-100">
                    <ShoppingBag size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-navy mb-1">No Matching Medical Equipment</h3>
                  <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                    We could not find any products matching your specific combination of filters or search query.
                  </p>
                  <Button variant="primary" size="sm" onClick={resetFilters}>
                    Reset All Filters
                  </Button>
                </div>
              )}

              {/* Product Cards Grid */}
              {!isLoading && !error && paginatedProducts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedProducts.map((product) => {
                    const isRentalSelected = Boolean(rentalSelections[product.sku] && product.isRentalAvailable);
                    const isOutOfStock = product.stockQuantity <= 0;
                    const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;
                    const hasDiscount = product.regularPrice && product.regularPrice > (product.sellingPrice || product.price);
                    const savingsAmount = hasDiscount ? (product.regularPrice - (product.sellingPrice || product.price)) : 0;
                    const isJustAdded = addedSku === product.sku;

                    return (
                      <div
                        key={product.sku}
                        className="group bg-white rounded-2xl border border-slate-200 hover:border-teal-500/50 hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden"
                      >
                        <div>
                          {/* Image Header with Responsive Container & Fallback */}
                          <div className="relative overflow-hidden border-b border-slate-100 bg-slate-50">
                            <Link href={`/products/${product._id || product.id || product.sku}`}>
                              <ProductImage
                                src={product.images && product.images[0] ? product.images[0] : undefined}
                                alt={product.title}
                                category={product.category}
                                aspectRatio="aspect-[4/3]"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </Link>

                            {/* Top Badges */}
                            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1 pointer-events-none">
                              {/* Sourcing Badge */}
                              {product.sourcingType === 'supplier_direct' ? (
                                <span className="px-2 py-0.5 rounded-full bg-blue-600/95 backdrop-blur-xs text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                                  Supplier Direct
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-teal-700/95 backdrop-blur-xs text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                                  VivoQuest Depot &bull; 24h
                                </span>
                              )}

                              {/* Discount Badge if valid */}
                              {product.discountPercentage > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                                  {product.discountPercentage}% OFF
                                </span>
                              )}
                            </div>

                            {/* Overlay Bottom Tags */}
                            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                              {product.setupRequiredByClinician ? (
                                <span className="bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Wrench size={10} className="text-teal-400" />
                                  <span>Setup Included</span>
                                </span>
                              ) : product.installationEligible ? (
                                <span className="bg-blue-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                                  <Wrench size={10} className="text-blue-300" />
                                  <span>Install +₹{product.installationServiceCharge || 0}</span>
                                </span>
                              ) : <span />}

                              {product.isDemo && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-white text-[9px] font-black uppercase tracking-wider">
                                  Demo
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Body Details */}
                          <div className="p-4 space-y-2">
                            {/* Category & Stock Row */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-500 uppercase tracking-wider">
                                {product.category?.replace('_', ' ')}
                              </span>

                              {isOutOfStock ? (
                                <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                  Out of Stock
                                </span>
                              ) : isLowStock ? (
                                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Only {product.stockQuantity} left
                                </span>
                              ) : (
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 size={11} />
                                  In Stock
                                </span>
                              )}
                            </div>

                            {/* Product Title */}
                            <Link
                              href={`/products/${product._id || product.id || product.sku}`}
                              className="block font-bold text-navy text-sm leading-snug hover:text-teal-700 transition-colors line-clamp-2"
                            >
                              {product.title}
                            </Link>

                            {/* SKU & Brand/Depot details */}
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="font-mono text-slate-500 font-semibold">{product.sku}</span>
                              {product.badge && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-teal-700 font-semibold truncate max-w-[150px]">
                                    {product.badge}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Real Ratings Only (Rule 6: Never display fake stars if reviewCount is 0) */}
                            {product.reviewCount && product.reviewCount > 0 ? (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                                <span className="flex items-center text-amber-500">
                                  <Star size={13} fill="currentColor" />
                                </span>
                                <span>{product.averageRating?.toFixed(1) || '5.0'}</span>
                                <span className="text-slate-400 font-normal">({product.reviewCount})</span>
                              </div>
                            ) : null}

                            {/* Concise Description */}
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>

                            {/* Estimated Delivery Note */}
                            <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                              <Truck size={12} className="text-teal-600" />
                              <span>Est. Delivery: 2-4 business days</span>
                            </div>

                            {/* Prescription Badge */}
                            {product.requiresPrescription && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <FileText size={11} className="text-amber-600 shrink-0" />
                                <span>Prescription required upon delivery</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Footer: Pricing & Action Buttons */}
                        <div className="p-4 pt-0">
                          {/* Purchase vs Monthly Rental Mode Switcher */}
                          {product.isRentalAvailable && (
                            <div className="mb-3 p-1 bg-slate-100 rounded-xl flex items-center text-xs">
                              <button
                                onClick={() => handleToggleRentalMode(product.sku, false)}
                                className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                                  !isRentalSelected
                                    ? 'bg-white text-navy shadow-xs'
                                    : 'text-slate-500 hover:text-navy'
                                }`}
                              >
                                Buy
                              </button>
                              <button
                                onClick={() => handleToggleRentalMode(product.sku, true)}
                                className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                                  isRentalSelected
                                    ? 'bg-white text-teal-700 shadow-xs'
                                    : 'text-slate-500 hover:text-navy'
                                }`}
                              >
                                Rent / mo
                              </button>
                            </div>
                          )}

                          {/* Pricing Display */}
                          <div className="mb-3">
                            {isRentalSelected ? (
                              <div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-xl font-extrabold text-teal-700">
                                    ₹{product.rentalPriceMonthly?.toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-semibold">/ month</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium">Refundable security deposit applies</p>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xl font-extrabold text-navy">
                                    ₹{(product.sellingPrice || product.price)?.toLocaleString('en-IN')}
                                  </span>
                                  {hasDiscount && (
                                    <span className="text-xs text-slate-400 line-through">
                                      ₹{product.regularPrice?.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </div>
                                {hasDiscount && (
                                  <p className="text-[11px] font-bold text-emerald-700 mt-0.5">
                                    Save ₹{savingsAmount.toLocaleString('en-IN')} ({product.discountPercentage}% off)
                                  </p>
                                )}
                                <span className="text-[10px] text-muted-foreground font-medium">Includes 12% GST</span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons: Add to Cart and View Details */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant={isOutOfStock ? 'outline' : isJustAdded ? 'secondary' : 'primary'}
                              size="sm"
                              className="flex-1 justify-center text-xs font-bold"
                              disabled={isOutOfStock}
                              onClick={() => handleAddToCart(product)}
                              leftIcon={
                                isJustAdded ? (
                                  <Check size={14} className="text-white" />
                                ) : (
                                  <ShoppingBag size={14} />
                                )
                              }
                            >
                              {isOutOfStock
                                ? 'Unavailable'
                                : isJustAdded
                                ? 'Added!'
                                : isRentalSelected
                                ? 'Add Rental'
                                : 'Add to Cart'}
                            </Button>

                            <Link
                              href={`/products/${product._id || product.id || product.sku}`}
                              className="px-3 py-2 rounded-xl border border-slate-200 hover:border-navy text-navy font-bold text-xs hover:bg-slate-50 transition"
                            >
                              Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {!isLoading && !error && totalPages > 1 && (
                <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    &larr; Previous
                  </button>

                  <div className="flex items-center gap-1 text-xs font-bold">
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                          className={`w-8 h-8 rounded-lg transition ${
                            currentPage === pageNum
                              ? 'bg-navy text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PatientAppHandoffModal
        isOpen={isHandoffOpen}
        onClose={() => setIsHandoffOpen(false)}
        product={handoffProduct}
      />

      <Footer />
    </div>
  );
}
