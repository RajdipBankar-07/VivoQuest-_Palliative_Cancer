'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Trash2,
  RefreshCw,
  Star,
  MessageSquare,
  Wrench,
  DollarSign,
  Truck,
  Building2,
  ExternalLink,
  ShieldCheck,
  Calendar,
  X,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  TrendingUp,
  Tag,
  Eye,
  Check,
  AlertCircle,
} from 'lucide-react';
import { adminMarketplaceApi, adminApi } from '@/lib/api';

export function ProductsMarketplaceView() {
  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'catalog' | 'orders' | 'installations' | 'reviews' | 'complaints'>('metrics');

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Orders & Delivery Management State
  const [marketplaceOrders, setMarketplaceOrders] = useState<any[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [updatingDeliveryOrder, setUpdatingDeliveryOrder] = useState<any | null>(null);
  const [newEstimatedDate, setNewEstimatedDate] = useState('');
  const [deliveryChangeReason, setDeliveryChangeReason] = useState('');
  const [isUpdatingDelivery, setIsUpdatingDelivery] = useState(false);
  const [deliveryUpdateError, setDeliveryUpdateError] = useState<string | null>(null);

  // Metrics State
  const [metrics, setMetrics] = useState<any>(null);

  // Catalog State
  const [products, setProducts] = useState<any[]>([]);
  const [catalogPagination, setCatalogPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourcingFilter, setSourcingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    title: '',
    category: 'mobility',
    badge: '',
    description: '',
    regularPrice: 0,
    sellingPrice: 0,
    discountPercentage: 0,
    stockQuantity: 10,
    sourcingType: 'own_stock',
    supplierId: '',
    procurementCost: 0,
    hsnCode: '9021',
    gstRate: 12,
    installationEligible: false,
    installationServiceCharge: 0,
    installationDescription: '',
    estimatedDeliveryDays: '2-4 business days',
    status: 'active',
    images: ['/assets/images/products/equipment.jpg'],
    imageGallery: [{ url: '/assets/images/products/equipment.jpg', altText: 'Product Front View', isPrimary: true }],
    specifications: { Frame: 'Anodized Aluminum', MaxWeight: '120 kg' } as Record<string, string>,
  });
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Suppliers List (for dropdown selector)
  const [suppliersList, setSuppliersList] = useState<any[]>([]);

  // Archive Confirmation Modal
  const [archiveTarget, setArchiveTarget] = useState<any | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Installations State
  const [installations, setInstallations] = useState<any[]>([]);
  const [installationFilter, setInstallationFilter] = useState('all');
  const [assigningOrder, setAssigningOrder] = useState<any | null>(null);
  const [specialistName, setSpecialistName] = useState('');
  const [setupDate, setSetupDate] = useState('');
  const [setupNotes, setSetupNotes] = useState('');

  // Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState('all');

  // Complaints State
  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('all');
  const [resolvingComplaint, setResolvingComplaint] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [refundApproved, setRefundApproved] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);

  // Fetch Metrics
  const fetchMetrics = async () => {
    try {
      const data = await adminMarketplaceApi.getMetrics();
      setMetrics(data);
    } catch (err: any) {
      console.warn('Failed to load marketplace metrics:', err.message);
    }
  };

  // Fetch Catalog
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await adminMarketplaceApi.getProducts({
        search: searchQuery,
        category: categoryFilter,
        sourcingType: sourcingFilter,
        status: statusFilter,
        lowStockOnly,
        page: catalogPagination.page,
        limit: catalogPagination.limit,
      });
      setProducts(res.data);
      setCatalogPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Installations
  const fetchInstallations = async () => {
    try {
      const res = await adminMarketplaceApi.getInstallations({
        setupStatus: installationFilter,
        page: 1,
        limit: 50,
      });
      setInstallations(res.data);
    } catch (err: any) {
      console.warn('Failed to load installations:', err.message);
    }
  };

  // Fetch Reviews
  const fetchReviews = async () => {
    try {
      const res = await adminMarketplaceApi.getReviews({
        status: reviewStatusFilter,
        page: 1,
        limit: 50,
      });
      setReviews(res.data);
    } catch (err: any) {
      console.warn('Failed to load reviews:', err.message);
    }
  };

  // Fetch Complaints
  const fetchComplaints = async () => {
    try {
      const res = await adminMarketplaceApi.getComplaints({
        status: complaintStatusFilter,
        page: 1,
        limit: 50,
      });
      setComplaints(res.data);
    } catch (err: any) {
      console.warn('Failed to load complaints:', err.message);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await adminApi.getSuppliers({ limit: 100 });
      setSuppliersList(res.data || []);
    } catch {
      // Fallback
    }
  };

  // Fetch Marketplace Orders
  const fetchMarketplaceOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await adminMarketplaceApi.getOrders({
        status: orderStatusFilter !== 'all' ? orderStatusFilter : undefined,
        search: orderSearchQuery.trim() || undefined,
        limit: 50,
      });
      setMarketplaceOrders(res.data || []);
    } catch (err: any) {
      console.warn('Failed to load marketplace orders:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'catalog') fetchProducts();
    if (activeSubTab === 'orders') fetchMarketplaceOrders();
    if (activeSubTab === 'installations') fetchInstallations();
    if (activeSubTab === 'reviews') fetchReviews();
    if (activeSubTab === 'complaints') fetchComplaints();
    if (activeSubTab === 'metrics') fetchMetrics();
  }, [
    activeSubTab,
    searchQuery,
    categoryFilter,
    sourcingFilter,
    statusFilter,
    lowStockOnly,
    orderStatusFilter,
    orderSearchQuery,
    installationFilter,
    reviewStatusFilter,
    complaintStatusFilter,
    catalogPagination.page,
  ]);

  // Open Modal for Create or Edit
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      sku: `DME-${Math.floor(1000 + Math.random() * 9000)}`,
      title: '',
      category: 'mobility',
      badge: '',
      description: '',
      regularPrice: 2000,
      sellingPrice: 1800,
      discountPercentage: 10,
      stockQuantity: 15,
      sourcingType: 'own_stock',
      supplierId: '',
      procurementCost: 1200,
      hsnCode: '9021',
      gstRate: 12,
      installationEligible: false,
      installationServiceCharge: 0,
      installationDescription: '',
      estimatedDeliveryDays: '2-4 business days',
      status: 'active',
      images: ['/assets/images/products/walker.jpg'],
      imageGallery: [{ url: '/assets/images/products/walker.jpg', altText: 'Front View', isPrimary: true }],
      specifications: { Material: 'Medical Grade Aluminum', WeightLimit: '120 kg' },
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: any) => {
    setEditingProduct(prod);
    setFormData({
      sku: prod.sku,
      title: prod.title,
      category: prod.category,
      badge: prod.badge || '',
      description: prod.description || '',
      regularPrice: prod.regularPrice || prod.price,
      sellingPrice: prod.sellingPrice || prod.price,
      discountPercentage: prod.discountPercentage || 0,
      stockQuantity: prod.stockQuantity,
      sourcingType: prod.sourcingType || 'own_stock',
      supplierId: prod.supplierId || '',
      procurementCost: prod.procurementCost || 0,
      hsnCode: prod.hsnCode || '9021',
      gstRate: prod.gstRate ?? 12,
      installationEligible: Boolean(prod.installationEligible),
      installationServiceCharge: prod.installationServiceCharge || 0,
      installationDescription: prod.installationDescription || '',
      estimatedDeliveryDays: prod.estimatedDeliveryDays || '2-4 business days',
      status: prod.status || 'active',
      images: prod.images && prod.images.length > 0 ? prod.images : ['/assets/images/products/walker.jpg'],
      imageGallery: prod.imageGallery && prod.imageGallery.length > 0
        ? prod.imageGallery
        : [{ url: prod.images?.[0] || '/assets/images/products/walker.jpg', altText: `${prod.title} view`, isPrimary: true }],
      specifications: prod.specifications || {},
    });
    setIsModalOpen(true);
  };

  // Submit Create or Edit Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProduct(true);
      setError(null);

      if (editingProduct) {
        await adminMarketplaceApi.updateProduct(editingProduct._id || editingProduct.id, formData);
        setSuccessMsg(`Product "${formData.title}" updated successfully.`);
      } else {
        await adminMarketplaceApi.createProduct(formData);
        setSuccessMsg(`Product "${formData.title}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchProducts();
      fetchMetrics();
    } catch (err: any) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Delete Product Handler (Permanent if 0 orders, safe archive if orders exist)
  const handleDeleteProduct = async () => {
    if (!archiveTarget) return;
    try {
      setIsArchiving(true);
      const res = await adminMarketplaceApi.deleteProduct(archiveTarget._id || archiveTarget.id);
      setSuccessMsg(res.message || `Product "${archiveTarget.title}" processed successfully.`);
      setArchiveTarget(null);
      fetchProducts();
      fetchMetrics();
    } catch (err: any) {
      setError(err.message || 'Failed to delete product.');
    } finally {
      setIsArchiving(false);
    }
  };

  // Moderate Review Handler
  const handleModerateReview = async (reviewId: string, newStatus: 'published' | 'rejected') => {
    try {
      await adminMarketplaceApi.moderateReview(reviewId, newStatus);
      setSuccessMsg(`Review marked as ${newStatus}.`);
      fetchReviews();
      fetchMetrics();
    } catch (err: any) {
      setError(err.message || 'Failed to moderate review.');
    }
  };

  // Assign Installation Specialist
  const handleAssignSpecialist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrder) return;
    try {
      await adminMarketplaceApi.assignInstallationSpecialist(assigningOrder._id || assigningOrder.orderNumber, {
        specialistName,
        setupDate,
        setupNotes,
        setupStatus: 'scheduled',
      });
      setSuccessMsg(`Installation specialist assigned to order ${assigningOrder.orderNumber}.`);
      setAssigningOrder(null);
      fetchInstallations();
    } catch (err: any) {
      setError(err.message || 'Failed to assign specialist.');
    }
  };

  // Resolve Complaint Handler
  const handleResolveComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingComplaint) return;
    try {
      await adminMarketplaceApi.resolveComplaint(resolvingComplaint._id || resolvingComplaint.id, {
        resolutionNotes,
        refundApproved,
        refundAmount: Number(refundAmount),
      });
      setSuccessMsg(`Complaint #${resolvingComplaint.complaintNumber} marked as resolved.`);
      setResolvingComplaint(null);
      fetchComplaints();
      fetchMetrics();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve complaint.');
    }
  };

  // Update Delivery Estimate Handler
  const handleSaveDeliveryEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingDeliveryOrder || !newEstimatedDate || !deliveryChangeReason.trim()) return;
    try {
      setIsUpdatingDelivery(true);
      setDeliveryUpdateError(null);
      await adminMarketplaceApi.updateDeliveryEstimate(
        updatingDeliveryOrder._id || updatingDeliveryOrder.orderNumber,
        {
          estimatedDeliveryDate: newEstimatedDate,
          reason: deliveryChangeReason.trim(),
        }
      );
      setSuccessMsg(`Estimated delivery date for order #${updatingDeliveryOrder.orderNumber} successfully updated.`);
      setUpdatingDeliveryOrder(null);
      setNewEstimatedDate('');
      setDeliveryChangeReason('');
      fetchMarketplaceOrders();
    } catch (err: any) {
      setDeliveryUpdateError(err.message || 'Failed to update delivery estimate.');
    } finally {
      setIsUpdatingDelivery(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                Phase 14 Commerce Architecture
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                Multi-Source DME Marketplace
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Products & Healthcare Marketplace Management
            </h1>
            <p className="text-blue-200 text-sm mt-1 max-w-2xl">
              Unified administration of VivoQuest-owned depot stock, third-party supplier fulfillment, home installation specialists, reviews, returns, and separated gross billing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchMetrics();
                if (activeSubTab === 'catalog') fetchProducts();
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition"
            >
              <Plus size={18} /> Add New Product
            </button>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={18} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('metrics')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
            activeSubTab === 'metrics'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp size={16} /> Financials & Marketplace Metrics
        </button>
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
            activeSubTab === 'catalog'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package size={16} /> Product Catalog & Inventory
          {metrics?.catalogAndInventory?.lowStockAlertCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white font-bold">
              {metrics.catalogAndInventory.lowStockAlertCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
            activeSubTab === 'orders'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck size={16} /> Orders &amp; Deliveries
        </button>
        <button
          onClick={() => setActiveSubTab('installations')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
            activeSubTab === 'installations'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wrench size={16} /> Home Installation Specialists
        </button>
        <button
          onClick={() => setActiveSubTab('reviews')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
            activeSubTab === 'reviews'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Star size={16} /> Ratings & Reviews
        </button>
        <button
          onClick={() => setActiveSubTab('complaints')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
            activeSubTab === 'complaints'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare size={16} /> Complaints & Returns
          {metrics?.qualityAndCustomerCare?.complaints?.open > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-rose-500 text-white font-bold">
              {metrics.qualityAndCustomerCare.complaints.open}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: METRICS & FINANCIALS */}
      {activeSubTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Own Sales */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Own Products Gross</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Building2 size={16} />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900">
                ₹{metrics?.sales?.ownProductSalesGross?.toLocaleString('en-IN') || 0}
              </p>
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <span className="font-semibold text-blue-600">{metrics?.sales?.unitsSold?.ownUnits || 0} units</span> fulfilled from central depot
              </div>
            </div>

            {/* Supplier Sales */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Supplier Direct Gross</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Truck size={16} />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900">
                ₹{metrics?.sales?.supplierProductSalesGross?.toLocaleString('en-IN') || 0}
              </p>
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <span className="font-semibold text-purple-600">{metrics?.sales?.unitsSold?.supplierUnits || 0} units</span> routed to 3rd-party vendors
              </div>
            </div>

            {/* Installation Revenue */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Installation Service</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Wrench size={16} />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900">
                ₹{metrics?.sales?.installationServicesRevenue?.toLocaleString('en-IN') || 0}
              </p>
              <div className="mt-2 text-xs text-slate-500">
                Separate specialist technician line-items
              </div>
            </div>

            {/* Total Gross Volume */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Total Marketplace Sales</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <DollarSign size={16} />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900">
                ₹{metrics?.sales?.grossProductSalesRevenue?.toLocaleString('en-IN') || 0}
              </p>
              <div className="mt-2 text-xs text-slate-500">
                Gross sales volume (not net profit)
              </div>
            </div>
          </div>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Inventory Availability */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Layers className="text-blue-600" size={18} /> Inventory Availability
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Total Active Products</span>
                  <span className="font-bold text-slate-900">{metrics?.catalogAndInventory?.totalActiveProducts || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">VivoQuest Depot Items</span>
                  <span className="font-bold text-blue-600">{metrics?.catalogAndInventory?.ownProductsCount || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Supplier Direct Items</span>
                  <span className="font-bold text-purple-600">{metrics?.catalogAndInventory?.supplierProductsCount || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5">
                  <span className="text-slate-600">Depot Physical Units</span>
                  <span className="font-bold text-emerald-600">{metrics?.catalogAndInventory?.ownInventoryTotalStock || 0} units</span>
                </div>
              </div>
            </div>

            {/* Quality & Ratings */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" size={18} /> Quality & Complaints
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Average Product Rating</span>
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    {metrics?.qualityAndCustomerCare?.averageReviewRating || 5.0} / 5.0
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Verified Reviews</span>
                  <span className="font-bold text-slate-900">{metrics?.qualityAndCustomerCare?.publishedReviewsCount || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Active Complaints</span>
                  <span className="font-bold text-rose-600">
                    {metrics?.qualityAndCustomerCare?.complaints?.open || 0} Open
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5">
                  <span className="text-slate-600">Resolved Complaints</span>
                  <span className="font-bold text-emerald-600">
                    {metrics?.qualityAndCustomerCare?.complaints?.resolved || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Supplier Liabilities */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Truck className="text-purple-600" size={18} /> Supplier Settlements
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Procurement POs Settled</span>
                  <span className="font-bold text-emerald-600">
                    ₹{metrics?.supplierSettlements?.supplierPayablesSettled?.toLocaleString('en-IN') || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Pending Supplier Payables</span>
                  <span className="font-bold text-amber-600">
                    ₹{metrics?.supplierSettlements?.supplierPayablesPending?.toLocaleString('en-IN') || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Refunds Processed</span>
                  <span className="font-bold text-rose-600">
                    ₹{metrics?.orders?.totalRefundsProcessed?.toLocaleString('en-IN') || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1.5">
                  <span className="text-slate-600">Total Purchase Orders</span>
                  <span className="font-bold text-slate-900">{metrics?.supplierSettlements?.totalPurchaseOrders || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

            {/* TAB 2: PRODUCT CATALOG */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by SKU, title, supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="mobility">Mobility</option>
                <option value="respiratory">Respiratory</option>
                <option value="monitoring_diagnostics">Monitoring</option>
                <option value="icu_home_setup">ICU Home Setup</option>
                <option value="fall_prevention">Fall Prevention</option>
                <option value="wound_care">Wound Care</option>
              </select>

              <select
                value={sourcingFilter}
                onChange={(e) => setSourcingFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sources</option>
                <option value="own">VivoQuest Owned</option>
                <option value="supplier">Supplier Direct</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="flex items-center gap-1 text-amber-700 font-bold">
                <AlertTriangle size={15} /> Low Stock Alert (&lt; 10)
              </span>
            </label>
          </div>

          {/* Catalog Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Product / SKU</th>
                    <th className="px-6 py-4">Source & Vendor</th>
                    <th className="px-6 py-4">Regular / Selling Price</th>
                    <th className="px-6 py-4">Stock & Availability</th>
                    <th className="px-6 py-4">Installation</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 animate-pulse">
                        Loading marketplace products...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No medical products found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    products.map((prod) => (
                      <tr key={prod.id || prod._id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{prod.title}</div>
                          <div className="text-xs font-mono text-slate-500 mt-0.5">{prod.sku}</div>
                          <div className="text-xs text-slate-400 capitalize">{prod.category.replace('_', ' ')}</div>
                        </td>
                        <td className="px-6 py-4">
                          {prod.sourcingType === 'supplier_direct' || prod.sourcingType === 'supplier' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                                <Truck size={12} /> Supplier Direct
                              </span>
                              <div className="text-xs text-slate-600 mt-1 font-medium">{prod.supplierName || 'Third-Party Vendor'}</div>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                <Building2 size={12} /> VivoQuest Depot
                              </span>
                              <div className="text-xs text-slate-500 mt-1">Direct Inventory</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">₹{(prod.sellingPrice || prod.price).toLocaleString('en-IN')}</div>
                          {(prod.discountPercentage || 0) > 0 && (
                            <div className="text-xs text-slate-400 line-through">
                              ₹{(prod.regularPrice || prod.price).toLocaleString('en-IN')}
                              <span className="ml-1 text-emerald-600 font-bold not-line-through">
                                -{prod.discountPercentage}%
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-black ${
                                prod.stockQuantity <= 0
                                  ? 'text-rose-600'
                                  : prod.stockQuantity < 10
                                  ? 'text-amber-600'
                                  : 'text-slate-800'
                              }`}
                            >
                              {prod.stockQuantity}
                            </span>
                            <span className="text-xs text-slate-400">units</span>
                            {prod.stockQuantity < 10 && prod.stockQuantity > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-700">
                                Low Stock
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {prod.installationEligible ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <Wrench size={12} /> Available
                              </span>
                              <div className="text-xs font-semibold text-slate-700 mt-1">
                                +₹{(prod.installationServiceCharge || 0).toLocaleString('en-IN')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No installation</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                              prod.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : prod.status === 'out_of_stock'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : prod.status === 'archived'
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {prod.status || (prod.isActive ? 'active' : 'archived')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditModal(prod)}
                              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit product"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => setArchiveTarget(prod)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete product (Permanent if no orders, or safe archive)"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {catalogPagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Showing Page {catalogPagination.page} of {catalogPagination.totalPages} ({catalogPagination.total} total items)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={catalogPagination.page <= 1}
                    onClick={() => setCatalogPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={catalogPagination.page >= catalogPagination.totalPages}
                    onClick={() => setCatalogPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: ORDERS & DELIVERY MANAGEMENT */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by order #, patient name, phone..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Fulfillment Statuses</option>
                <option value="placed">Placed</option>
                <option value="confirmed">Confirmed</option>
                <option value="dispatched">Dispatched</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <button
              onClick={fetchMarketplaceOrders}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
            >
              <RefreshCw size={14} /> Refresh Orders
            </button>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Order Reference</th>
                    <th className="px-6 py-4">Patient / Recipient</th>
                    <th className="px-6 py-4">Equipment Items</th>
                    <th className="px-6 py-4">Payment &amp; Total</th>
                    <th className="px-6 py-4">Fulfillment Status</th>
                    <th className="px-6 py-4">Est. Delivery Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {marketplaceOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No marketplace equipment orders found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    marketplaceOrders.map((ord: any) => {
                      const hasHistory = ord.deliveryEstimateHistory && ord.deliveryEstimateHistory.length > 0;
                      return (
                        <tr key={ord.orderNumber} className="hover:bg-slate-50/80 transition">
                          <td className="px-6 py-4 font-bold text-slate-900">
                            <div>{ord.orderNumber}</div>
                            <span className="text-[11px] font-normal text-slate-400">
                              {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{ord.patientName}</div>
                            <div className="text-xs text-slate-500">{ord.patientPhone}</div>
                            <div className="text-[11px] text-slate-400">{ord.deliveryAddress?.city}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {ord.items?.slice(0, 2).map((item: any, idx: number) => (
                                <div key={idx} className="text-xs text-slate-700 flex items-center gap-1">
                                  <span className="font-semibold">{item.quantity}x</span>
                                  <span className="truncate max-w-[180px]">{item.title}</span>
                                </div>
                              ))}
                              {ord.items?.length > 2 && (
                                <span className="text-[10px] text-blue-600 font-bold block">
                                  +{ord.items.length - 2} more items
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-extrabold text-slate-900">
                              ₹{ord.pricing?.totalAmount?.toLocaleString('en-IN')}
                            </div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${
                                ord.paymentStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                                ord.orderStatus === 'delivered' || ord.orderStatus === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.orderStatus === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {ord.orderStatus?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              <Calendar size={13} className="text-emerald-600 shrink-0" />
                              {ord.estimatedDeliveryDate
                                ? new Date(ord.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'Pending'}
                            </div>
                            {hasHistory && (
                              <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 block mt-1 w-max">
                                Revised ({ord.deliveryEstimateHistory.length}x)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {ord.orderStatus !== 'delivered' && ord.orderStatus !== 'cancelled' && (
                              <button
                                onClick={() => {
                                  setUpdatingDeliveryOrder(ord);
                                  setDeliveryUpdateError(null);
                                  setNewEstimatedDate(
                                    ord.estimatedDeliveryDate
                                      ? new Date(ord.estimatedDeliveryDate).toISOString().split('T')[0]
                                      : ''
                                  );
                                  setDeliveryChangeReason('');
                                }}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto"
                              >
                                <Calendar size={13} />
                                Edit Date
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INSTALLATIONS */}
      {activeSubTab === 'installations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="text-blue-600" size={18} /> Home Installation Service Queue
            </h2>
            <select
              value={installationFilter}
              onChange={(e) => setInstallationFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
            >
              <option value="all">All Setup Statuses</option>
              <option value="pending">Pending Technician Assignment</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {installations.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
                No orders currently in the installation queue.
              </div>
            ) : (
              installations.map((ord) => (
                <div key={ord._id || ord.orderNumber} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-600">{ord.orderNumber}</span>
                        <h4 className="text-base font-bold text-slate-900 mt-0.5">{ord.patientName}</h4>
                        <p className="text-xs text-slate-500">{ord.deliveryAddress?.city}, PIN {ord.deliveryAddress?.pincode}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                          ord.clinicalSetup?.setupStatus === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : ord.clinicalSetup?.setupStatus === 'scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {ord.clinicalSetup?.setupStatus || 'Pending'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl mb-4 text-xs space-y-1">
                      <div className="font-bold text-slate-700">Equipment Requiring Installation:</div>
                      {ord.items?.map((it: any, idx: number) => (
                        <div key={idx} className="text-slate-600 flex justify-between">
                          <span>{it.title}</span>
                          <span className="font-semibold">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {ord.clinicalSetup?.assignedSpecialistName && (
                      <div className="text-xs text-slate-600 mb-2">
                        <span className="font-semibold">Assigned Specialist:</span> {ord.clinicalSetup.assignedSpecialistName}
                      </div>
                    )}

                    {ord.clinicalSetup?.setupDate && (
                      <div className="text-xs text-slate-600 mb-4 flex items-center gap-1">
                        <Calendar size={13} className="text-blue-500" />
                        <span>Scheduled for: {new Date(ord.clinicalSetup.setupDate).toLocaleDateString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setAssigningOrder(ord);
                      setSpecialistName(ord.clinicalSetup?.assignedSpecialistName || 'Pravin Shinde (DME Technician)');
                      setSetupDate(
                        ord.clinicalSetup?.setupDate
                          ? new Date(ord.clinicalSetup.setupDate).toISOString().split('T')[0]
                          : new Date().toISOString().split('T')[0]
                      );
                      setSetupNotes(ord.clinicalSetup?.setupNotes || 'Unpack, assemble bed frame, and calibrate sensor pressure.');
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <Wrench size={14} /> Assign / Reschedule Technician
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

            {/* TAB 4: RATINGS & REVIEWS MODERATION */}
      {activeSubTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Star className="text-amber-500 fill-amber-500" size={18} /> Verified Customer Reviews Moderation
            </h2>
            <select
              value={reviewStatusFilter}
              onChange={(e) => setReviewStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
            >
              <option value="all">All Reviews</option>
              <option value="published">Published</option>
              <option value="pending">Pending Moderation</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {reviews.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No customer product reviews found for this status.
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev._id || rev.id} className="p-6 hover:bg-slate-50/50 transition flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{rev.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Check size={10} /> Verified Purchase
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 max-w-3xl leading-relaxed">{rev.comment}</p>

                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span>By <strong className="text-slate-700">{rev.userName}</strong></span>
                      <span>Product: <strong className="text-slate-700">{rev.productTitle}</strong> ({rev.productSku})</span>
                      <span>Order #{rev.orderNumber}</span>
                      <span>{new Date(rev.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    {rev.status !== 'published' && (
                      <button
                        onClick={() => handleModerateReview(rev._id || rev.id, 'published')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Check size={13} /> Approve
                      </button>
                    )}
                    {rev.status !== 'rejected' && (
                      <button
                        onClick={() => handleModerateReview(rev._id || rev.id, 'rejected')}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <X size={13} /> Reject
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

            {/* TAB 5: COMPLAINTS & RETURNS */}
      {activeSubTab === 'complaints' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="text-rose-600" size={18} /> Customer Complaints & Defect Escalations
            </h2>
            <select
              value={complaintStatusFilter}
              onChange={(e) => setComplaintStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
            >
              <option value="all">All Complaints</option>
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="supplier_contacted">Supplier Contacted</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {complaints.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No complaints filed matching the filter criteria.
              </div>
            ) : (
              complaints.map((comp) => (
                <div key={comp._id || comp.id} className="p-6 hover:bg-slate-50/50 transition flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-rose-600">{comp.complaintNumber}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700">
                        {comp.category?.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                          comp.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : comp.status === 'supplier_contacted'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {comp.status?.replace('_', ' ')}
                      </span>
                      {comp.refundRequested && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          Refund Requested
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-800 leading-relaxed max-w-3xl">{comp.description}</p>

                    <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
                      <span>Patient: <strong>{comp.userName}</strong> (+91 {comp.userPhone})</span>
                      <span>Item: <strong>{comp.productTitle}</strong></span>
                      <span>Order #{comp.orderNumber}</span>
                      {comp.supplierName && <span>Supplier: <strong className="text-purple-700">{comp.supplierName}</strong></span>}
                    </div>

                    {comp.supplierResponse?.response && (
                      <div className="mt-2 p-3 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 max-w-2xl">
                        <span className="font-bold">Supplier Response ({new Date(comp.supplierResponse.respondedAt).toLocaleDateString('en-IN')}):</span>{' '}
                        {comp.supplierResponse.response}
                      </div>
                    )}

                    {comp.resolutionNotes && (
                      <div className="mt-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 max-w-2xl">
                        <span className="font-bold">Admin Resolution:</span> {comp.resolutionNotes}
                        {comp.refundApproved && <span className="ml-2 font-bold text-emerald-700">(Refund Approved: ₹{comp.refundAmount})</span>}
                      </div>
                    )}
                  </div>

                  {comp.status !== 'resolved' && (
                    <button
                      onClick={() => {
                        setResolvingComplaint(comp);
                        setResolutionNotes('Inspection verified. Replacement part dispatched and patient contacted.');
                        setRefundApproved(comp.refundRequested);
                        setRefundAmount(500);
                      }}
                      className="self-start md:self-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={15} /> Resolve Complaint
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

            {/* CREATE / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {editingProduct ? 'Edit Medical Product' : 'Add New Product to Catalog'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phase 14 unified product configuration, discounts, supplier linking, and home installation.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Folding Mobility Walker with Wheels"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SKU (Unique Identifier) *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    disabled={Boolean(editingProduct)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mobility">Mobility</option>
                    <option value="fall_prevention">Fall Prevention</option>
                    <option value="respiratory">Respiratory</option>
                    <option value="monitoring_diagnostics">Monitoring</option>
                    <option value="wound_care">Wound Care</option>
                    <option value="clinical_nutrition">Clinical Nutrition</option>
                    <option value="icu_home_setup">ICU Home Setup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ownership / Source *</label>
                  <select
                    value={formData.sourcingType}
                    onChange={(e) => setFormData({ ...formData, sourcingType: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="own_stock">VivoQuest Owned Depot Stock</option>
                    <option value="supplier_direct">Third-Party Supplier Direct</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Supplier Association</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    disabled={formData.sourcingType === 'own_stock'}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliersList.map((sup) => (
                      <option key={sup._id || sup.id} value={sup._id || sup.id}>
                        {sup.name} ({sup.supplierCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Discounts */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={14} className="text-blue-600" /> Pricing & Discounts (Backend Derived)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Regular Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.regularPrice}
                      onChange={(e) => {
                        const reg = Number(e.target.value);
                        const disc = formData.discountPercentage;
                        const sell = Math.round(reg * (1 - disc / 100));
                        setFormData({ ...formData, regularPrice: reg, sellingPrice: sell });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Discount (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.discountPercentage}
                      onChange={(e) => {
                        const disc = Number(e.target.value);
                        const sell = Math.round(formData.regularPrice * (1 - disc / 100));
                        setFormData({ ...formData, discountPercentage: disc, sellingPrice: sell });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.sellingPrice}
                      onChange={(e) => {
                        const sell = Number(e.target.value);
                        const disc = formData.regularPrice > 0
                          ? Math.round(((formData.regularPrice - sell) / formData.regularPrice) * 100)
                          : 0;
                        setFormData({ ...formData, sellingPrice: sell, discountPercentage: Math.max(0, disc) });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.stockQuantity}
                      onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Home Installation */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench size={14} className="text-emerald-600" /> Optional Home Installation Service
                    </h4>
                    <p className="text-xs text-slate-500">Allow customers to add specialist assembly at checkout</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.installationEligible}
                    onChange={(e) => setFormData({ ...formData, installationEligible: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {formData.installationEligible && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Installation Charge (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.installationServiceCharge}
                        onChange={(e) => setFormData({ ...formData, installationServiceCharge: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Service Description</label>
                      <input
                        type="text"
                        value={formData.installationDescription}
                        onChange={(e) => setFormData({ ...formData, installationDescription: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                        placeholder="e.g. Certified technician in-home calibration"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Clinical purpose, indications, material specifications..."
                />
              </div>

              {/* Primary Image & Alt Text */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Image URL</label>
                  <input
                    type="text"
                    value={formData.images[0] || ''}
                    onChange={(e) => {
                      const url = e.target.value;
                      setFormData({
                        ...formData,
                        images: [url],
                        imageGallery: [{ url, altText: formData.imageGallery[0]?.altText || `${formData.title} image`, isPrimary: true }],
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                    placeholder="/assets/images/products/item.jpg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Image Alt Text (Accessibility)</label>
                  <input
                    type="text"
                    value={formData.imageGallery[0]?.altText || ''}
                    onChange={(e) => {
                      const altText = e.target.value;
                      const gallery = [...formData.imageGallery];
                      if (gallery[0]) gallery[0].altText = altText;
                      setFormData({ ...formData, imageGallery: gallery });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    placeholder="e.g. Front view of adjustable walker"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
                >
                  {isSavingProduct ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* PERMANENT DELETE / ARCHIVE CONFIRMATION MODAL */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Medical Product?</h3>
                <span className="text-[11px] font-mono text-slate-400">ID: {archiveTarget._id || archiveTarget.id}</span>
              </div>
            </div>
            
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{archiveTarget.title}</p>
              <p className="text-slate-600 font-mono">SKU: {archiveTarget.sku}</p>
              <p className="text-slate-500">Category: {archiveTarget.category} • Price: ₹{(archiveTarget.price || 0).toLocaleString('en-IN')}</p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>⚠️</span> Warning: Irreversible Action
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                If this product has no order history, it will be <strong>permanently deleted</strong> from the database. If it has historical customer orders or financial references, it will be <strong>safely archived</strong> from the public store to preserve accounting audit records.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setArchiveTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                disabled={isArchiving}
                onClick={handleDeleteProduct}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {isArchiving ? 'Processing...' : 'Yes, Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

            {/* ASSIGN SPECIALIST MODAL */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="text-blue-600" size={18} /> Assign Installation Specialist
              </h3>
              <button onClick={() => setAssigningOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAssignSpecialist} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Specialist / Technician Name *</label>
                <input
                  type="text"
                  required
                  value={specialistName}
                  onChange={(e) => setSpecialistName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Appointment Date *</label>
                <input
                  type="date"
                  required
                  value={setupDate}
                  onChange={(e) => setSetupDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Specialist Notes</label>
                <textarea
                  rows={2}
                  value={setupNotes}
                  onChange={(e) => setSetupNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningOrder(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* RESOLVE COMPLAINT MODAL */}
      {resolvingComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" size={18} /> Resolve Complaint #{resolvingComplaint.complaintNumber}
              </h3>
              <button onClick={() => setResolvingComplaint(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleResolveComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Resolution Summary *</label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  placeholder="Explain actions taken with customer/supplier..."
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundApproved}
                    onChange={(e) => setRefundApproved(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  Approve Customer Refund
                </label>
                {refundApproved && (
                  <div>
                    <label className="block text-2xs font-semibold text-slate-600 mb-1">Refund Amount (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingComplaint(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  Confirm & Resolve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE DELIVERY ESTIMATE MODAL */}
      {updatingDeliveryOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Calendar size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Update Delivery Estimate</h3>
                  <p className="text-[11px] text-slate-400">Order #{updatingDeliveryOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setUpdatingDeliveryOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {deliveryUpdateError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-red-600" />
                <span>{deliveryUpdateError}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-900">{updatingDeliveryOrder.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Estimate:</span>
                <span className="font-bold text-emerald-700">
                  {updatingDeliveryOrder.estimatedDeliveryDate
                    ? new Date(updatingDeliveryOrder.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Not Specified'}
                </span>
              </div>
            </div>

            {/* Past Revisions if any */}
            {updatingDeliveryOrder.deliveryEstimateHistory && updatingDeliveryOrder.deliveryEstimateHistory.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Previous Updates
                </span>
                {updatingDeliveryOrder.deliveryEstimateHistory.map((h: any, i: number) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-50 text-[11px] border border-slate-200/60">
                    <div className="flex justify-between text-slate-700 font-semibold">
                      <span>{h.previousEstimate ? new Date(h.previousEstimate).toLocaleDateString('en-IN') : 'Original'} → {new Date(h.newEstimate).toLocaleDateString('en-IN')}</span>
                      <span className="text-slate-400 text-[10px]">{new Date(h.updatedAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <p className="text-slate-500 mt-0.5">Reason: {h.reason}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSaveDeliveryEstimate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  New Target Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newEstimatedDate}
                  onChange={(e) => setNewEstimatedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason for Adjustment <span className="text-red-500">* (Min 3 characters)</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Specialized biomedical calibration required prior to dispatch..."
                  value={deliveryChangeReason}
                  onChange={(e) => setDeliveryChangeReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  This reason will be logged in the immutable audit trail and sent to the patient.
                </span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUpdatingDeliveryOrder(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingDelivery}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 shadow-md shadow-blue-500/20"
                >
                  {isUpdatingDelivery ? 'Saving...' : 'Save & Notify Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
