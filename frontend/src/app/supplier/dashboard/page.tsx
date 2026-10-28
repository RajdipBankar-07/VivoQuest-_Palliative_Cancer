'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Package,
  Truck,
  CreditCard,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Plus,
  Edit3,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Tag,
  Star,
  ShieldCheck,
  Send,
  X,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  TrendingUp,
  Info,
  Check,
  AlertCircle,
  Eye,
  Wrench,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { supplierPortalApi, authApi, ApiClientError } from '@/lib/api';

type SupplierTab = 'overview' | 'products' | 'orders' | 'settlements' | 'complaints';

export default function SupplierDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SupplierTab>('overview');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Profile State
  const [profile, setProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    pincode: '',
    address: '',
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      branch: '',
    },
  });

  // Global messages
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Products State
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [productStatus, setProductStatus] = useState('all');
  const [productPagination, setProductPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  // Add/Edit Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    sku: '',
    title: '',
    category: 'mobility',
    description: '',
    regularPrice: 2500,
    sellingPrice: 2200,
    discountPercentage: 12,
    stockQuantity: 15,
    procurementCost: 1500,
    hsnCode: '9021',
    gstRate: 12,
    installationEligible: false,
    installationServiceCharge: 0,
    installationDescription: '',
    estimatedDeliveryDays: '2-4 business days',
    status: 'active',
    images: ['/assets/images/products/equipment.jpg'],
    imageGallery: [{ url: '/assets/images/products/equipment.jpg', altText: 'Equipment view', isPrimary: true }],
    specifications: { Material: 'Medical-Grade Alloy', Warranty: '1 Year' },
  });

  // Orders Queue State
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPagination, setOrderPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  // Order Actions Modal
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<any | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchData, setDispatchData] = useState({
    carrierName: 'BlueDart Healthcare Express',
    trackingNumber: '',
    notes: 'Secure temperature-monitored package',
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Settlements State
  const [settlementData, setSettlementData] = useState<any>(null);
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false);

  // Complaints State
  const [complaints, setComplaints] = useState<any[]>([]);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [supplierResponseText, setSupplierResponseText] = useState('');

  // 1. Initial Auth & Profile Fetch
  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user) {
      setIsAuthorized(false);
      router.push('/sign-in?returnUrl=/supplier/dashboard');
      return;
    }
    setCurrentUser(user);
    setIsAuthorized(true);
    fetchProfile();
  }, []);

  // 2. Fetch Profile
  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    setError(null);
    try {
      const data = await supplierPortalApi.getProfile();
      setProfile(data);
      if (data) {
        setEditProfileForm({
          name: data.name || '',
          contactPerson: data.contactPerson || '',
          phone: data.phone || '',
          email: data.email || '',
          city: data.address?.city || '',
          state: data.address?.state || '',
          pincode: data.address?.pincode || '',
          address: data.address?.street || '',
          bankDetails: {
            accountHolderName: data.bankDetails?.accountHolderName || '',
            accountNumber: data.bankDetails?.accountNumber || '',
            ifscCode: data.bankDetails?.ifscCode || '',
            bankName: data.bankDetails?.bankName || '',
            branch: data.bankDetails?.branch || '',
          },
        });
      }
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 401) {
        authApi.logout();
        router.push('/sign-in?returnUrl=/supplier/dashboard');
        return;
      }
      setError(err.message || 'Failed to load supplier account. Ensure you have an active supplier role.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // 3. Tab Data Fetching
  useEffect(() => {
    if (!isAuthorized) return;
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'settlements') fetchSettlements();
    if (activeTab === 'complaints') fetchComplaints();
  }, [activeTab, productSearch, productCategory, productStatus, productPagination.page, orderStatusFilter, orderPagination.page, isAuthorized]);

  // Fetch Supplier's Products
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    setError(null);
    try {
      const res = await supplierPortalApi.getProducts({
        search: productSearch,
        category: productCategory,
        status: productStatus,
        page: productPagination.page,
        limit: productPagination.limit,
      });
      setProducts(res.data);
      setProductPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory catalog');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Fetch Supplier's Routed Orders
  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    setError(null);
    try {
      const res = await supplierPortalApi.getOrders({
        status: orderStatusFilter,
        page: orderPagination.page,
        limit: orderPagination.limit,
      });
      setOrders(res.data);
      setOrderPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch routed orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Fetch Settlements
  const fetchSettlements = async () => {
    setIsLoadingSettlements(true);
    setError(null);
    try {
      const data = await supplierPortalApi.getSettlements();
      setSettlementData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settlement statements');
    } finally {
      setIsLoadingSettlements(false);
    }
  };

  // Fetch Complaints
  const fetchComplaints = async () => {
    setIsLoadingComplaints(true);
    setError(null);
    try {
      const data = await supplierPortalApi.getComplaints();
      setComplaints(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch complaints');
    } finally {
      setIsLoadingComplaints(false);
    }
  };

  // Profile update handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await supplierPortalApi.updateProfile({
        name: editProfileForm.name,
        contactPerson: editProfileForm.contactPerson,
        phone: editProfileForm.phone,
        email: editProfileForm.email,
        address: {
          street: editProfileForm.address,
          city: editProfileForm.city,
          state: editProfileForm.state,
          pincode: editProfileForm.pincode,
        },
        bankDetails: editProfileForm.bankDetails,
      });
      setSuccessMsg('Supplier profile and remittance details updated successfully.');
      setShowEditProfileModal(false);
      fetchProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Create/Edit Product Modal
  const handleOpenProductModal = (prod?: any) => {
    if (prod) {
      setEditingProduct(prod);
      setProductForm({
        sku: prod.sku,
        title: prod.title,
        category: prod.category || 'mobility',
        description: prod.description || '',
        regularPrice: prod.regularPrice || prod.price,
        sellingPrice: prod.sellingPrice || prod.price,
        discountPercentage: prod.discountPercentage || 0,
        stockQuantity: prod.stockQuantity,
        procurementCost: prod.procurementCost || 0,
        hsnCode: prod.hsnCode || '9021',
        gstRate: prod.gstRate ?? 12,
        installationEligible: Boolean(prod.installationEligible),
        installationServiceCharge: prod.installationServiceCharge || 0,
        installationDescription: prod.installationDescription || '',
        estimatedDeliveryDays: prod.estimatedDeliveryDays || '2-4 business days',
        status: prod.status || 'active',
        images: prod.images && prod.images.length > 0 ? prod.images : ['/assets/images/products/equipment.jpg'],
        imageGallery: prod.imageGallery && prod.imageGallery.length > 0
          ? prod.imageGallery
          : [{ url: prod.images?.[0] || '/assets/images/products/equipment.jpg', altText: `${prod.title} image`, isPrimary: true }],
        specifications: prod.specifications || { Material: 'Medical-Grade Alloy', Warranty: '1 Year' },
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        sku: `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
        title: '',
        category: 'mobility',
        description: '',
        regularPrice: 3000,
        sellingPrice: 2700,
        discountPercentage: 10,
        stockQuantity: 20,
        procurementCost: 1800,
        hsnCode: '9021',
        gstRate: 12,
        installationEligible: false,
        installationServiceCharge: 0,
        installationDescription: '',
        estimatedDeliveryDays: '2-4 business days',
        status: 'active',
        images: ['/assets/images/products/equipment.jpg'],
        imageGallery: [{ url: '/assets/images/products/equipment.jpg', altText: 'Product Front View', isPrimary: true }],
        specifications: { Material: 'Medical-Grade Alloy', Warranty: '1 Year' },
      });
    }
    setShowProductModal(true);
  };

  // Save Product Handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProduct(true);
    setError(null);
    try {
      if (editingProduct) {
        await supplierPortalApi.updateProduct(editingProduct._id || editingProduct.id, productForm);
        setSuccessMsg(`Product "${productForm.title}" updated successfully.`);
      } else {
        await supplierPortalApi.createProduct(productForm);
        setSuccessMsg(`Product "${productForm.title}" submitted to catalog.`);
      }
      setShowProductModal(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Order Actions
  const handleAcceptOrder = async (orderId: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await supplierPortalApi.acceptOrder(orderId);
      setSuccessMsg(`Order confirmed and moved to dispatch queue.`);
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to accept order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForAction || !rejectionReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await supplierPortalApi.rejectOrder(selectedOrderForAction._id || selectedOrderForAction.id, rejectionReason.trim());
      setSuccessMsg(`Order marked as rejected. Platform operations notified.`);
      setShowRejectModal(false);
      setSelectedOrderForAction(null);
      setRejectionReason('');
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to reject order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForAction || !dispatchData.trackingNumber.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await supplierPortalApi.dispatchOrder(selectedOrderForAction._id || selectedOrderForAction.id, {
        carrierName: dispatchData.carrierName,
        trackingNumber: dispatchData.trackingNumber.trim(),
        notes: dispatchData.notes,
      });
      setSuccessMsg(`Order dispatched with tracking #${dispatchData.trackingNumber}. Customer notified.`);
      setShowDispatchModal(false);
      setSelectedOrderForAction(null);
      setDispatchData({ carrierName: 'BlueDart Healthcare Express', trackingNumber: '', notes: '' });
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch order');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Complaint Response
  const handleRespondToComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !supplierResponseText.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await supplierPortalApi.respondToComplaint(selectedComplaint._id || selectedComplaint.id, supplierResponseText.trim());
      setSuccessMsg(`Official response recorded for Complaint #${selectedComplaint.complaintNumber}.`);
      setShowRespondModal(false);
      setSelectedComplaint(null);
      setSupplierResponseText('');
      fetchComplaints();
    } catch (err: any) {
      setError(err.message || 'Failed to submit response');
    } finally {
      setActionLoading(false);
    }
  };

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <Navbar />
        <div className="max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm border border-border text-center space-y-4 my-20">
          <AlertTriangle size={48} className="mx-auto text-amber-500" />
          <h2 className="text-xl font-bold text-navy">Authentication Required</h2>
          <p className="text-sm text-slate-600">Please sign in with your verified supplier credentials to access the Supplier Fulfillment Portal.</p>
          <Link href="/sign-in?returnUrl=/supplier/dashboard">
            <Button className="w-full">Sign In to Portal</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Portal Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 font-extrabold text-2xl shadow-xs">
              <Building2 size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-navy tracking-tight">{profile?.name || 'Supplier Portal'}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  {profile?.status?.toUpperCase() || 'VERIFIED PARTNER'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Star size={12} className="fill-amber-400 text-amber-500" />
                  {profile?.rating || '4.8'} / 5.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                <span>GST: <strong className="text-slate-700">{profile?.taxId || '27AADCV9182K1Z9'}</strong></span>
                <span>•</span>
                <span>Commission Rate: <strong className="text-slate-700">{profile?.commissionRatePercentage ?? 10}%</strong></span>
                <span>•</span>
                <span>Settlement Cycle: <strong className="text-slate-700">{profile?.settlementCycleDays ?? 15} Days</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditProfileModal(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-border bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Edit3 size={14} /> Profile & Banking
            </button>
            <button
              onClick={() => handleOpenProductModal()}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus size={15} /> Add New Product
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-800 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900"><X size={16} /></button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900"><X size={16} /></button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'overview', label: 'Company Overview', icon: Building2 },
              { id: 'products', label: 'My Products & Inventory', icon: Package },
              { id: 'orders', label: 'Fulfillment Queue', icon: Truck },
              { id: 'settlements', label: 'Settlements & Payouts', icon: DollarSign },
              { id: 'complaints', label: 'Customer Complaints', icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SupplierTab)}
                  className={`flex items-center justify-center sm:justify-start gap-2.5 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-navy hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-teal-200' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Company Profile */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-border space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-navy text-base flex items-center gap-2">
                    <Building2 size={18} className="text-teal-600" /> Company Profile
                  </h3>
                  <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-bold">Verified</span>
                </div>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Legal Name</span>
                    <span className="font-bold text-slate-800">{profile?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Primary Contact</span>
                    <span className="font-semibold text-slate-700">{profile?.contactPerson || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Phone</span>
                    <span className="font-semibold text-slate-700">{profile?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Email</span>
                    <span className="font-semibold text-slate-700">{profile?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">City / State</span>
                    <span className="font-semibold text-slate-700">
                      {profile?.address?.city || 'Mumbai'}, {profile?.address?.state || 'Maharashtra'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Registered Office</span>
                    <span className="font-semibold text-slate-700 text-right max-w-[180px]">
                      {profile?.address?.street || 'Healthcare Hub, Andheri East, Mumbai'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Remittance & Banking Details */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-border space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-navy text-base flex items-center gap-2">
                    <CreditCard size={18} className="text-blue-600" /> Banking & Payouts
                  </h3>
                  <button onClick={() => setShowEditProfileModal(true)} className="text-xs text-blue-600 hover:underline font-bold">
                    Edit
                  </button>
                </div>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Beneficiary Name</span>
                    <span className="font-bold text-slate-800">{profile?.bankDetails?.accountHolderName || profile?.name || 'Verified Vendor'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Account Number</span>
                    <span className="font-mono font-bold text-slate-800">
                      {profile?.bankDetails?.accountNumber ? `•••• •••• ${profile.bankDetails.accountNumber.slice(-4)}` : '•••• •••• 8912'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Bank Name</span>
                    <span className="font-semibold text-slate-700">{profile?.bankDetails?.bankName || 'HDFC Bank Ltd'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">IFSC Code</span>
                    <span className="font-mono font-semibold text-slate-700">{profile?.bankDetails?.ifscCode || 'HDFC0001234'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Settlement Frequency</span>
                    <span className="font-semibold text-slate-700">Bi-Weekly (1st & 16th)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Payout Mode</span>
                    <span className="font-semibold text-emerald-700">NEFT / RTGS Automated</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Performance & SLA */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-border space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-navy text-base flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-600" /> Fulfillment SLA
                  </h3>
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Tier 1</span>
                </div>
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-500 mb-1">
                      <span>Order Acceptance Rate</span>
                      <strong className="text-emerald-700 font-bold">98.4%</strong>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '98.4%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-500 mb-1">
                      <span>On-Time Dispatch Rate</span>
                      <strong className="text-teal-700 font-bold">96.8%</strong>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full rounded-full" style={{ width: '96.8%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-500 mb-1">
                      <span>Complaint Defect Rate</span>
                      <strong className="text-slate-700 font-bold">0.4%</strong>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-slate-400 h-full rounded-full" style={{ width: '4%' }} />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                    Orders accepted within 4 hours are prioritized in patient marketplace searches.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PRODUCTS & INVENTORY */}
        {/* ========================================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search SKU or title..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border focus:outline-teal-600 bg-slate-50"
                  />
                </div>
                <select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-border focus:outline-teal-600 bg-slate-50 text-slate-700 font-medium"
                >
                  <option value="all">All Categories</option>
                  <option value="respiratory">Respiratory</option>
                  <option value="mobility">Mobility</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="orthopedic">Orthopedic</option>
                  <option value="sanitization">Sanitization</option>
                  <option value="palliative_care">Palliative Care</option>
                </select>
                <select
                  value={productStatus}
                  onChange={(e) => setProductStatus(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-border focus:outline-teal-600 bg-slate-50 text-slate-700 font-medium"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={fetchProducts}
                  className="p-2 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 text-slate-600"
                  title="Refresh Inventory"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  onClick={() => handleOpenProductModal()}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-xs"
                >
                  <Plus size={15} /> Add Product
                </button>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-border text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Product / SKU</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Regular / Selling Price</th>
                      <th className="py-3 px-4">Stock Level</th>
                      <th className="py-3 px-4">Installation Support</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoadingProducts ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
                          Loading supplier inventory...
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Package size={32} className="mx-auto mb-2 text-slate-300" />
                          No products found. Click "Add Product" to list healthcare equipment in the marketplace.
                        </td>
                      </tr>
                    ) : (
                      products.map((prod) => {
                        const isLowStock = prod.stockQuantity <= 5;
                        return (
                          <tr key={prod._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                  {prod.images?.[0] ? (
                                    <img src={prod.images[0]} alt={prod.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package size={18} className="text-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800">{prod.title}</div>
                                  <div className="text-[10px] font-mono text-slate-400">SKU: {prod.sku}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {prod.category?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800">₹{(prod.sellingPrice || prod.price).toLocaleString('en-IN')}</div>
                              {prod.regularPrice && prod.regularPrice > (prod.sellingPrice || prod.price) && (
                                <div className="text-[10px] text-slate-400 line-through">₹{prod.regularPrice.toLocaleString('en-IN')}</div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${
                                  prod.stockQuantity === 0
                                    ? 'bg-rose-100 text-rose-800'
                                    : isLowStock
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isLowStock && <AlertTriangle size={11} />}
                                {prod.stockQuantity} units
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {prod.installationEligible ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  <Wrench size={11} /> ₹{prod.installationServiceCharge || 0}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium">Standard Delivery</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  prod.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : prod.status === 'draft'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {prod.status?.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleOpenProductModal(prod)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-border bg-slate-50 hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1"
                              >
                                <Edit3 size={13} /> Edit
                              </button>
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

        {/* ========================================================================= */}
        {/* TAB 3: FULFILLMENT QUEUE */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-teal-600 bg-slate-50 text-slate-700 font-medium"
                >
                  <option value="all">All Routed Orders</option>
                  <option value="pending_acceptance">Pending Acceptance</option>
                  <option value="accepted">Accepted (Ready to Pack)</option>
                  <option value="dispatched">Dispatched / In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <button onClick={fetchOrders} className="p-2 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 text-slate-600">
                <RefreshCw size={15} />
              </button>
            </div>

            {/* Orders list */}
            <div className="space-y-3">
              {isLoadingOrders ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-border">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
                  Loading routed orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-border">
                  <Truck size={32} className="mx-auto mb-2 text-slate-300" />
                  No routed orders in this queue. When patients purchase your products, they will appear here for fulfillment.
                </div>
              ) : (
                orders.map((ord) => {
                  return (
                    <div key={ord._id} className="bg-white rounded-2xl p-5 shadow-sm border border-border space-y-4 hover:border-slate-300 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-navy text-sm">Order #{ord.orderNumber}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              ord.fulfillmentStatus === 'pending_acceptance'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                                : ord.fulfillmentStatus === 'accepted'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : ord.fulfillmentStatus === 'dispatched'
                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                : ord.fulfillmentStatus === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {ord.fulfillmentStatus?.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Ordered: <strong className="text-slate-600">{new Date(ord.createdAt).toLocaleDateString('en-IN')}</strong>
                        </div>
                      </div>

                      {/* Items assigned to this supplier */}
                      <div className="space-y-2">
                        {ord.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                            <div>
                              <div className="font-bold text-slate-800">{item.title}</div>
                              <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku} • Qty: {item.quantity}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-800">₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>
                              {item.installationSelected && (
                                <div className="text-[10px] font-bold text-blue-700 flex items-center gap-1 justify-end">
                                  <Wrench size={10} /> +₹{item.installationCharge || 0} Setup
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Destination City & Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                        <div className="text-slate-500 flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-400 shrink-0" />
                          <span>Delivery to: <strong>{ord.shippingAddress?.city || 'Mumbai'}, {ord.shippingAddress?.pincode || '400012'}</strong></span>
                        </div>

                        <div className="flex items-center gap-2">
                          {ord.fulfillmentStatus === 'pending_acceptance' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedOrderForAction(ord);
                                  setShowRejectModal(true);
                                }}
                                disabled={actionLoading}
                                className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold transition-colors"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleAcceptOrder(ord._id)}
                                disabled={actionLoading}
                                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-colors shadow-xs"
                              >
                                Accept Order
                              </button>
                            </>
                          )}

                          {ord.fulfillmentStatus === 'accepted' && (
                            <button
                              onClick={() => {
                                setSelectedOrderForAction(ord);
                                setShowDispatchModal(true);
                              }}
                              disabled={actionLoading}
                              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-xs flex items-center gap-1.5"
                            >
                              <Truck size={14} /> Dispatch Package
                            </button>
                          )}

                          {ord.fulfillmentStatus === 'dispatched' && (
                            <div className="text-xs text-teal-700 font-bold flex items-center gap-1">
                              <Truck size={14} /> Tracking: <span className="font-mono">{ord.trackingNumber || 'BD-8912401'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SETTLEMENTS & PAYOUTS */}
        {/* ========================================================================= */}
        {activeTab === 'settlements' && (
          <div className="space-y-6">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Gross Sales Volume</span>
                <div className="text-2xl font-extrabold text-navy mt-1">
                  ₹{(settlementData?.grossSalesVolume || 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Patient orders delivered</span>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Marketplace Commission</span>
                <div className="text-2xl font-extrabold text-rose-600 mt-1">
                  - ₹{(settlementData?.totalCommissionDeducted || 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Platform fee ({profile?.commissionRatePercentage ?? 10}%)</span>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Net Payout Payable</span>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                  ₹{(settlementData?.netPayoutPayable || 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">Ready for transfer</span>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Delivered Units</span>
                <div className="text-2xl font-extrabold text-slate-800 mt-1">
                  {settlementData?.totalDeliveredUnits || 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Successfully fulfilled</span>
              </div>
            </div>

            {/* Accounting Transparency Explanation */}
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs leading-relaxed flex items-start gap-3">
              <Info size={18} className="shrink-0 text-teal-600 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">Segregated Marketplace Settlement Transparency</strong>
                VivoQuest acts as the healthcare technology platform and marketplace facilitator. Customer invoice payments are processed in escrow. Net payouts represent gross product sales minus the agreed platform commission ({profile?.commissionRatePercentage ?? 10}%), remitted to your registered bank account on a {profile?.settlementCycleDays ?? 15}-day cycle.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CUSTOMER COMPLAINTS */}
        {/* ========================================================================= */}
        {activeTab === 'complaints' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-navy text-sm">Product Defect & Return Complaints</h3>
                <p className="text-xs text-slate-500">Customer feedback and replacement requests for your products</p>
              </div>
              <button onClick={fetchComplaints} className="p-2 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 text-slate-600">
                <RefreshCw size={15} />
              </button>
            </div>

            <div className="space-y-3">
              {isLoadingComplaints ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-border">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
                  Loading complaints...
                </div>
              ) : complaints.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-border">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                  No open complaints. Your catalog has excellent quality marks!
                </div>
              ) : (
                complaints.map((comp) => (
                  <div key={comp._id} className="bg-white rounded-2xl p-5 shadow-sm border border-border space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-navy text-sm">Complaint #{comp.complaintNumber}</span>
                        <span className="capitalize px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          {comp.category?.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {comp.status?.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        Logged on: {new Date(comp.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                      <strong className="block text-slate-500 text-[10px] uppercase mb-1">Customer Issue Description</strong>
                      {comp.description}
                    </div>

                    {comp.supplierResponse ? (
                      <div className="text-xs text-teal-900 bg-teal-50 p-3 rounded-xl border border-teal-200">
                        <strong className="block text-teal-700 text-[10px] uppercase mb-1">Your Submitted Response</strong>
                        {comp.supplierResponse}
                      </div>
                    ) : (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => {
                            setSelectedComplaint(comp);
                            setShowRespondModal(true);
                          }}
                          className="px-4 py-1.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-xs"
                        >
                          <Send size={13} /> Respond to Customer
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT PROFILE & BANKING */}
      {/* ========================================================================= */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-border space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-navy text-lg">Supplier Profile & Banking Setup</h3>
              <button onClick={() => setShowEditProfileModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Company / Legal Name</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.name}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.contactPerson}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Official Phone</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.phone}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={editProfileForm.email}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                  <CreditCard size={15} className="text-teal-600" /> Bank Remittance Information (Escrow Payouts)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      required
                      value={editProfileForm.bankDetails.accountHolderName}
                      onChange={(e) =>
                        setEditProfileForm({
                          ...editProfileForm,
                          bankDetails: { ...editProfileForm.bankDetails, accountHolderName: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Account Number</label>
                    <input
                      type="text"
                      required
                      value={editProfileForm.bankDetails.accountNumber}
                      onChange={(e) =>
                        setEditProfileForm({
                          ...editProfileForm,
                          bankDetails: { ...editProfileForm.bankDetails, accountNumber: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      required
                      value={editProfileForm.bankDetails.bankName}
                      onChange={(e) =>
                        setEditProfileForm({
                          ...editProfileForm,
                          bankDetails: { ...editProfileForm.bankDetails, bankName: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">IFSC Code</label>
                    <input
                      type="text"
                      required
                      value={editProfileForm.bankDetails.ifscCode}
                      onChange={(e) =>
                        setEditProfileForm({
                          ...editProfileForm,
                          bankDetails: { ...editProfileForm.bankDetails, ifscCode: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT PRODUCT */}
      {/* ========================================================================= */}
      {showProductModal && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-border space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-navy text-lg">
                {editingProduct ? 'Edit Marketplace Product' : 'Add Product to VivoQuest Marketplace'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Folding Aluminum Walker with Wheels"
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Medical-grade description, dimensions, clinical application..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Regular MRP (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={productForm.regularPrice}
                    onChange={(e) => {
                      const reg = Number(e.target.value);
                      const sel = productForm.sellingPrice;
                      const disc = reg > sel && reg > 0 ? Math.round(((reg - sel) / reg) * 100) : 0;
                      setProductForm({ ...productForm, regularPrice: reg, discountPercentage: disc });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={productForm.sellingPrice}
                    onChange={(e) => {
                      const sel = Number(e.target.value);
                      const reg = productForm.regularPrice;
                      const disc = reg > sel && reg > 0 ? Math.round(((reg - sel) / reg) * 100) : 0;
                      setProductForm({ ...productForm, sellingPrice: sel, discountPercentage: disc });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount (%)</label>
                  <input
                    type="number"
                    readOnly
                    value={productForm.discountPercentage}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 font-bold text-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Available Stock</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={productForm.stockQuantity}
                    onChange={(e) => setProductForm({ ...productForm, stockQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                  >
                    <option value="respiratory">Respiratory</option>
                    <option value="mobility">Mobility</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="orthopedic">Orthopedic</option>
                    <option value="sanitization">Sanitization</option>
                    <option value="palliative_care">Palliative Care</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={productForm.status}
                    onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Home Installation Options */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="instEligible"
                    checked={productForm.installationEligible}
                    onChange={(e) => setProductForm({ ...productForm, installationEligible: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <label htmlFor="instEligible" className="font-bold text-slate-800 text-xs">
                    Eligible for Home Installation & Demonstration Specialist Service
                  </label>
                </div>

                {productForm.installationEligible && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Installation Fee (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={productForm.installationServiceCharge}
                        onChange={(e) => setProductForm({ ...productForm, installationServiceCharge: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Service Scope</label>
                      <input
                        type="text"
                        placeholder="e.g. Bedside setup and oxygen regulator demo"
                        value={productForm.installationDescription}
                        onChange={(e) => setProductForm({ ...productForm, installationDescription: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Image Alt Text & Accessibility */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 text-xs block">Product Image & Alt Text</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Image URL</label>
                    <input
                      type="text"
                      value={productForm.imageGallery[0]?.url || '/assets/images/products/equipment.jpg'}
                      onChange={(e) => {
                        const updated = [...productForm.imageGallery];
                        updated[0] = { ...updated[0], url: e.target.value };
                        setProductForm({ ...productForm, imageGallery: updated, images: [e.target.value] });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Accessibility Alt Text</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Medical-grade folding walker side view"
                      value={productForm.imageGallery[0]?.altText || ''}
                      onChange={(e) => {
                        const updated = [...productForm.imageGallery];
                        updated[0] = { ...updated[0], altText: e.target.value };
                        setProductForm({ ...productForm, imageGallery: updated });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs"
                >
                  {isSavingProduct ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REJECT ORDER */}
      {/* ========================================================================= */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border space-y-4">
            <h3 className="font-bold text-navy text-base flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-600" /> Reject Routed Order #{selectedOrderForAction?.orderNumber}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Please specify the operational reason for rejection. Platform fulfillment operations will reroute or restock accordingly.
            </p>
            <form onSubmit={handleRejectOrder} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Rejection Reason</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Temporary factory stockout, delivery radius mismatch..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border focus:outline-rose-600"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DISPATCH ORDER */}
      {/* ========================================================================= */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border space-y-4">
            <h3 className="font-bold text-navy text-base flex items-center gap-2">
              <Truck size={18} className="text-teal-600" /> Dispatch Order #{selectedOrderForAction?.orderNumber}
            </h3>
            <form onSubmit={handleDispatchOrder} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Logistics / Courier Partner</label>
                <input
                  type="text"
                  required
                  value={dispatchData.carrierName}
                  onChange={(e) => setDispatchData({ ...dispatchData, carrierName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Airway Bill / Tracking Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BD-98214981"
                  value={dispatchData.trackingNumber}
                  onChange={(e) => setDispatchData({ ...dispatchData, trackingNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Dispatch Notes</label>
                <input
                  type="text"
                  value={dispatchData.notes}
                  onChange={(e) => setDispatchData({ ...dispatchData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {actionLoading ? 'Dispatching...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RESPOND TO COMPLAINT */}
      {/* ========================================================================= */}
      {showRespondModal && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border space-y-4">
            <h3 className="font-bold text-navy text-base flex items-center gap-2">
              <MessageSquare size={18} className="text-teal-600" /> Respond to Complaint #{selectedComplaint?.complaintNumber}
            </h3>
            <div className="p-3 bg-slate-50 rounded-xl text-slate-600 text-xs">
              {selectedComplaint?.description}
            </div>
            <form onSubmit={handleRespondToComplaint} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Official Supplier Response</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain remediation, replacement unit dispatch date, or technical guidance..."
                  value={supplierResponseText}
                  onChange={(e) => setSupplierResponseText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border focus:outline-teal-600"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRespondModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {actionLoading ? 'Sending...' : 'Submit Official Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
