'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Truck,
  Boxes,
  PackageCheck,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  Building2,
  Phone,
  MapPin,
  ExternalLink,
  RefreshCw,
  LogOut,
  X,
  FileText,
  Camera,
  Check,
  ChevronRight,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Eye,
  CheckSquare,
} from 'lucide-react';
import { operationsApi, authApi } from '@/lib/api';

type OperationsTab = 'orders' | 'products' | 'deliveries' | 'maintenance';

export default function OperationsDashboardPage() {
  const router = useRouter();

  // Employee Profile & Auth
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<OperationsTab>('orders');

  // KPI Metrics
  const [metrics, setMetrics] = useState({
    newOrders: 0,
    awaitingDispatch: 0,
    scheduledToday: 0,
    inTransit: 0,
    delivered: 0,
    delayedOrFailed: 0,
    installationsPending: 0,
    maintenancePending: 0,
    supplierOrdersPending: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSourcingFilter, setOrderSourcingFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  // Delivery Workflow Modal
  const [workflowStatus, setWorkflowStatus] = useState('');
  const [workflowNotes, setWorkflowNotes] = useState('');
  const [workflowLocation, setWorkflowLocation] = useState('Central Pune Operations Depot');
  const [workflowFailureReason, setWorkflowFailureReason] = useState('');
  const [workflowProofUrl, setWorkflowProofUrl] = useState('');
  const [workflowRescheduleDate, setWorkflowRescheduleDate] = useState('');
  const [workflowSubmitting, setWorkflowSubmitting] = useState(false);

  // Delivery Assignment
  const [staffList, setStaffList] = useState<any[]>([]);
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [assignDeliveryDate, setAssignDeliveryDate] = useState('');
  const [assignDeliveryNotes, setAssignDeliveryNotes] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Installation Task
  const [installationSpecialistId, setInstallationSpecialistId] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [installationSlot, setInstallationSlot] = useState('10:00 AM - 12:00 PM');
  const [installationStatus, setInstallationStatus] = useState('scheduled');
  const [installationNotes, setInstallationNotes] = useState('');
  const [installationSubmitting, setInstallationSubmitting] = useState(false);

  // Products State
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSourcingFilter, setProductSourcingFilter] = useState('all');
  const [productConditionFilter, setProductConditionFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    sku: '',
    title: '',
    category: 'mobility',
    description: '',
    price: 1500,
    regularPrice: 2000,
    stockQuantity: 10,
    sourcingType: 'own_stock',
    supplierName: '',
    condition: 'healthy',
    conditionNotes: '',
    imageUrl: '',
    installationEligible: false,
  });
  const [productSubmitting, setProductSubmitting] = useState(false);

  // Maintenance State
  const [maintenanceTickets, setMaintenanceTickets] = useState<any[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState('all');
  const [maintenanceSearch, setMaintenanceSearch] = useState('');
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketActionModalOpen, setTicketActionModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    productId: '',
    reportedIssue: '',
    urgency: 'medium',
    patientName: '',
    patientPhone: '',
    orderId: '',
  });
  const [ticketResolution, setTicketResolution] = useState({
    status: 'in_progress',
    diagnosis: '',
    actionTaken: '',
    partsUsed: '',
    resolutionNotes: '',
  });
  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);

  // Feedback notifications
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setBannerSuccess(msg);
    setTimeout(() => setBannerSuccess(null), 5000);
  };

  const showError = (msg: string) => {
    setBannerError(msg);
    setTimeout(() => setBannerError(null), 7000);
  };

  // 1. Initial Auth Check
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await operationsApi.getMe();
        if (res && res.data) {
          setCurrentUser(res.data);
        }
      } catch (err: any) {
        router.push('/operations/login');
      } finally {
        setAuthLoading(false);
      }
    }
    loadUser();
  }, [router]);

  // 2. Load Metrics
  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = await operationsApi.getMetrics();
      if (res && res.data) {
        setMetrics(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load metrics:', err);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // 3. Load Orders
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await operationsApi.getOrders({
        status: orderStatusFilter,
        sourcingType: orderSourcingFilter,
        search: orderSearch,
        limit: 50,
      });
      if (res && res.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      showError(err.message || 'Error loading orders');
    } finally {
      setOrdersLoading(false);
    }
  }, [orderStatusFilter, orderSourcingFilter, orderSearch]);

  // 4. Load Products
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await operationsApi.getProducts({
        sourcingType: productSourcingFilter,
        condition: productConditionFilter,
        search: productSearch,
        limit: 50,
      });
      if (res && res.data) {
        setProducts(res.data);
      }
    } catch (err: any) {
      showError(err.message || 'Error loading products');
    } finally {
      setProductsLoading(false);
    }
  }, [productSourcingFilter, productConditionFilter, productSearch]);

  // 5. Load Maintenance
  const loadMaintenance = useCallback(async () => {
    setMaintenanceLoading(true);
    try {
      const res = await operationsApi.getMaintenanceRequests({
        status: maintenanceStatusFilter,
        search: maintenanceSearch,
        limit: 50,
      });
      if (res && res.data) {
        setMaintenanceTickets(res.data);
      }
    } catch (err: any) {
      showError(err.message || 'Error loading maintenance tickets');
    } finally {
      setMaintenanceLoading(false);
    }
  }, [maintenanceStatusFilter, maintenanceSearch]);

  // 6. Load Staff for assignment
  const loadStaff = useCallback(async () => {
    try {
      const res = await operationsApi.getDeliveryStaff();
      if (res && res.data) {
        setStaffList(res.data);
      }
    } catch (err: any) {
      console.warn('Could not load delivery staff list:', err);
    }
  }, []);

  // Initial tab-dependent data fetch
  useEffect(() => {
    if (!authLoading && currentUser) {
      loadMetrics();
      loadStaff();
    }
  }, [authLoading, currentUser, loadMetrics, loadStaff]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      if (activeTab === 'orders' || activeTab === 'deliveries') {
        loadOrders();
      } else if (activeTab === 'products') {
        loadProducts();
      } else if (activeTab === 'maintenance') {
        loadMaintenance();
      }
    }
  }, [activeTab, authLoading, currentUser, loadOrders, loadProducts, loadMaintenance]);

  // Logout
  const handleLogout = () => {
    authApi.logout();
    router.push('/operations/login');
  };

  // Card filter triggers
  const handleKpiCardClick = (targetTab: OperationsTab, statusFilter?: string) => {
    setActiveTab(targetTab);
    if (statusFilter) {
      if (targetTab === 'orders' || targetTab === 'deliveries') {
        setOrderStatusFilter(statusFilter);
      } else if (targetTab === 'maintenance') {
        setMaintenanceStatusFilter(statusFilter);
      }
    }
  };

  // Order Details Modal
  const handleOpenOrder = (order: any) => {
    setSelectedOrder(order);
    setWorkflowStatus('');
    setWorkflowNotes('');
    setWorkflowFailureReason('');
    setWorkflowProofUrl('');
    setWorkflowRescheduleDate('');
    setAssignedStaffId(order.deliveryAssignment?.assignedStaffId || '');
    setAssignDeliveryDate(order.deliveryAssignment?.scheduledDeliveryDate ? new Date(order.deliveryAssignment.scheduledDeliveryDate).toISOString().slice(0, 10) : '');
    setInstallationSpecialistId(order.clinicalSetup?.assignedSpecialistId || '');
    setInstallationDate(order.clinicalSetup?.scheduledDate ? new Date(order.clinicalSetup.scheduledDate).toISOString().slice(0, 10) : '');
    setInstallationSlot(order.clinicalSetup?.slot || '10:00 AM - 12:00 PM');
    setInstallationStatus(order.clinicalSetup?.setupStatus || 'scheduled');
    setOrderModalOpen(true);
  };

  // Handle Delivery Status Transition
  const handleDeliveryStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !workflowStatus) return;

    setWorkflowSubmitting(true);
    try {
      await operationsApi.updateOrderStatus(selectedOrder.id || selectedOrder._id, {
        targetStatus: workflowStatus,
        notes: workflowNotes || undefined,
        hubLocation: workflowLocation || undefined,
        reason: workflowFailureReason || undefined,
        proofOfDeliveryUrl: workflowProofUrl || undefined,
        rescheduledDate: workflowRescheduleDate || undefined,
      });

      showSuccess(`Order ${selectedOrder.orderNumber} transitioned to '${workflowStatus}'`);
      setOrderModalOpen(false);
      loadOrders();
      loadMetrics();
    } catch (err: any) {
      showError(err.message || 'Status transition failed');
    } finally {
      setWorkflowSubmitting(false);
    }
  };

  // Handle Delivery Staff Assignment
  const handleAssignDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !assignedStaffId) return;

    setAssignSubmitting(true);
    try {
      const staffObj = staffList.find((s) => s._id === assignedStaffId);
      await operationsApi.assignDeliveryStaff(selectedOrder.id || selectedOrder._id, {
        staffId: assignedStaffId,
        staffName: staffObj ? staffObj.fullName : 'Field Specialist',
        scheduledDeliveryDate: assignDeliveryDate || undefined,
        assignmentNotes: assignDeliveryNotes || undefined,
      });

      showSuccess(`Assigned ${staffObj?.fullName || 'Specialist'} to order ${selectedOrder.orderNumber}`);
      loadOrders();
      loadMetrics();
    } catch (err: any) {
      showError(err.message || 'Assignment failed');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Handle Installation Setup Task
  const handleInstallationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setInstallationSubmitting(true);
    try {
      const specialistObj = staffList.find((s) => s._id === installationSpecialistId);
      await operationsApi.scheduleClinicalSetup(selectedOrder.id || selectedOrder._id, {
        assignedSpecialistId: installationSpecialistId || undefined,
        assignedSpecialistName: specialistObj ? specialistObj.fullName : undefined,
        scheduledDate: installationDate || undefined,
        slot: installationSlot,
        setupStatus: installationStatus,
        setupNotes: installationNotes || undefined,
      });

      showSuccess(`Clinical setup updated for order ${selectedOrder.orderNumber}`);
      loadOrders();
      loadMetrics();
    } catch (err: any) {
      showError(err.message || 'Failed to update installation task');
    } finally {
      setInstallationSubmitting(false);
    }
  };

  // Product Inventory Add/Edit
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      sku: `DME-EQP-${Math.floor(1000 + Math.random() * 9000)}`,
      title: '',
      category: 'mobility',
      description: '',
      price: 1500,
      regularPrice: 2000,
      stockQuantity: 10,
      sourcingType: 'own_stock',
      supplierName: '',
      condition: 'healthy',
      conditionNotes: '',
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
      installationEligible: false,
    });
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setProductForm({
      sku: prod.sku,
      title: prod.title,
      category: prod.category || 'mobility',
      description: prod.description || '',
      price: prod.price || 0,
      regularPrice: prod.regularPrice || 0,
      stockQuantity: prod.stockQuantity || 0,
      sourcingType: prod.sourcingType || 'own_stock',
      supplierName: prod.supplierName || '',
      condition: prod.equipmentCondition || 'healthy',
      conditionNotes: prod.conditionNotes || '',
      imageUrl: prod.images?.[0] || '',
      installationEligible: Boolean(prod.installationEligible),
    });
    setProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductSubmitting(true);

    try {
      if (editingProduct) {
        await operationsApi.updateProduct(editingProduct.id || editingProduct._id, {
          title: productForm.title,
          description: productForm.description,
          price: Number(productForm.price),
          regularPrice: Number(productForm.regularPrice),
          stockQuantity: Number(productForm.stockQuantity),
          equipmentCondition: productForm.condition,
          conditionNotes: productForm.conditionNotes,
          newImageUrl: productForm.imageUrl || undefined,
          installationEligible: productForm.installationEligible,
        });
        showSuccess(`Product ${productForm.sku} updated successfully`);
      } else {
        await operationsApi.createProduct({
          sku: productForm.sku,
          title: productForm.title,
          category: productForm.category,
          description: productForm.description,
          price: Number(productForm.price),
          regularPrice: Number(productForm.regularPrice),
          stockQuantity: Number(productForm.stockQuantity),
          sourcingType: productForm.sourcingType,
          supplierName: productForm.sourcingType === 'supplier_direct' ? productForm.supplierName : undefined,
          equipmentCondition: productForm.condition,
          newImageUrl: productForm.imageUrl,
          installationEligible: productForm.installationEligible,
        });
        showSuccess(`Product ${productForm.sku} added to catalog`);
      }

      setProductModalOpen(false);
      loadProducts();
    } catch (err: any) {
      showError(err.message || 'Failed to save product');
    } finally {
      setProductSubmitting(false);
    }
  };

  // Quick Condition Flagging
  const handleQuickConditionChange = async (prodId: string, condition: string) => {
    try {
      await operationsApi.updateProductCondition(prodId, { condition });
      showSuccess(`Product condition updated to '${condition}'`);
      loadProducts();
    } catch (err: any) {
      showError(err.message || 'Failed to update equipment condition');
    }
  };

  // Maintenance Submit
  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaintenanceSubmitting(true);

    try {
      const res = await operationsApi.createMaintenanceRequest({
        productId: maintenanceForm.productId,
        reportedIssue: maintenanceForm.reportedIssue,
        urgency: maintenanceForm.urgency,
        patientName: maintenanceForm.patientName || undefined,
        patientPhone: maintenanceForm.patientPhone || undefined,
        orderId: maintenanceForm.orderId || undefined,
      });

      showSuccess(`Maintenance request ${res.data.ticketNumber} created!`);
      setMaintenanceModalOpen(false);
      loadMaintenance();
      loadMetrics();
    } catch (err: any) {
      showError(err.message || 'Failed to log maintenance request');
    } finally {
      setMaintenanceSubmitting(false);
    }
  };

  const handleOpenTicketAction = (ticket: any) => {
    setSelectedTicket(ticket);
    setTicketResolution({
      status: ticket.status || 'in_progress',
      diagnosis: ticket.diagnosis || '',
      actionTaken: ticket.actionTaken || '',
      partsUsed: ticket.partsUsed?.map((p: any) => `${p.partName} (${p.quantity})`).join(', ') || '',
      resolutionNotes: ticket.resolutionNotes || '',
    });
    setTicketActionModalOpen(true);
  };

  const handleTicketResolutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setMaintenanceSubmitting(true);
    try {
      await operationsApi.updateMaintenanceRequest(selectedTicket.id || selectedTicket._id, {
        status: ticketResolution.status,
        diagnosis: ticketResolution.diagnosis,
        actionTaken: ticketResolution.actionTaken,
        resolutionNotes: ticketResolution.resolutionNotes,
      });

      showSuccess(`Maintenance ticket ${selectedTicket.ticketNumber} updated to '${ticketResolution.status}'`);
      setTicketActionModalOpen(false);
      loadMaintenance();
      loadMetrics();
    } catch (err: any) {
      showError(err.message || 'Failed to update maintenance ticket');
    } finally {
      setMaintenanceSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-teal-700 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Truck size={36} className="animate-pulse text-teal-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Initializing Operations Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Top Header Bar */}
      <header className="bg-white border-b border-border sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-xs">
              <Truck size={22} />
            </div>
            <div>
              <div className="text-base font-black text-navy flex items-center gap-2">
                VivoQuest{' '}
                <span className="text-teal-800 font-mono text-[10px] px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 font-bold uppercase">
                  Sales, Inventory &amp; Last-Mile Delivery Portal
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {currentUser?.assignedDepot || 'Central Pune Hub'} • {currentUser?.department || 'Operations & Dispatch'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Employee Online Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-navy">{currentUser?.fullName}</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-bold">
              {currentUser?.role?.replace(/_/g, ' ')}
            </span>
          </div>

          <button
            onClick={() => {
              loadMetrics();
              if (activeTab === 'orders' || activeTab === 'deliveries') loadOrders();
              if (activeTab === 'products') loadProducts();
              if (activeTab === 'maintenance') loadMaintenance();
            }}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-border text-slate-700 hover:text-navy transition shadow-2xs"
            title="Refresh Real-Time Data"
          >
            <RefreshCw size={15} />
          </button>

          <Link
            href="/admin/dashboard"
            className="px-3.5 py-1.5 rounded-xl bg-navy hover:bg-navy-light text-white text-xs font-bold transition shadow-xs hidden md:inline-flex items-center gap-1.5"
          >
            <span>Admin Portal</span>
            <ExternalLink size={12} />
          </Link>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Secondary Operational Status Sub-Header */}
      <div className="bg-white/80 border-b border-border/80 px-4 sm:px-6 lg:px-8 py-2 text-xs flex items-center justify-between text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-navy">Platform Operational Status:</span>
          <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[11px] flex items-center gap-1">
            <CheckCircle2 size={11} className="text-emerald-600" />
            <span>Real-Time Last-Mile &amp; Inventory Engine: Active</span>
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-slate-500 text-[11px]">
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-teal-600" />
            <span>Active Depot: {currentUser?.assignedDepot || 'Central Pune Depot'}</span>
          </span>
          <span>•</span>
          <span>Role-Based Clearance Enforced</span>
          <span>•</span>
          <span>DPDP Act Compliance</span>
        </div>
      </div>

      {/* Notification Toast */}
      {bannerSuccess && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs shadow-2xl flex items-center gap-3 animate-slide-up">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">{bannerSuccess}</span>
        </div>
      )}
      {bannerError && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs shadow-2xl flex items-center gap-3 animate-shake">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span className="font-semibold">{bannerError}</span>
        </div>
      )}

      {/* Main Command Center Container */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Section: 9 Summary KPI Command Cards */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Boxes size={15} className="text-teal-600" />
              <span>Real-Time Operations Command Center</span>
            </h2>
            <span className="text-[11px] text-slate-400">Click any card to filter its queue</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Card 1: New Orders */}
            <div
              onClick={() => handleKpiCardClick('orders', 'placed')}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-border hover:border-blue-300 hover:shadow-md cursor-pointer transition group shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">New Orders</span>
                <Clock size={15} className="text-blue-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.newOrders}</div>
              <div className="text-[10px] text-blue-700 font-bold mt-1">Requires Confirmation &rarr;</div>
            </div>

            {/* Card 2: Awaiting Dispatch */}
            <div
              onClick={() => handleKpiCardClick('orders', 'awaiting_dispatch')}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-border hover:border-amber-300 hover:shadow-md cursor-pointer transition group shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">Awaiting Dispatch</span>
                <Boxes size={15} className="text-amber-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.awaitingDispatch}</div>
              <div className="text-[10px] text-amber-700 font-bold mt-1">Pack &amp; Stage &rarr;</div>
            </div>

            {/* Card 3: Scheduled Today */}
            <div
              onClick={() => handleKpiCardClick('deliveries', 'today')}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-border hover:border-teal-300 hover:shadow-md cursor-pointer transition group shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">Scheduled Today</span>
                <Calendar size={15} className="text-teal-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.scheduledToday}</div>
              <div className="text-[10px] text-teal-700 font-bold mt-1">Last-mile Route &rarr;</div>
            </div>

            {/* Card 4: In Transit */}
            <div
              onClick={() => handleKpiCardClick('deliveries', 'in_transit')}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-border hover:border-cyan-300 hover:shadow-md cursor-pointer transition group shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">In Transit</span>
                <Truck size={15} className="text-cyan-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.inTransit}</div>
              <div className="text-[10px] text-cyan-700 font-bold mt-1">On Road Tracking &rarr;</div>
            </div>

            {/* Card 5: Delivered */}
            <div
              onClick={() => handleKpiCardClick('orders', 'delivered')}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-border hover:border-emerald-300 hover:shadow-md cursor-pointer transition group shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">Delivered</span>
                <CheckCircle2 size={15} className="text-emerald-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.delivered}</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">Successful Drops &rarr;</div>
            </div>

            {/* Card 6: Delayed / Failed */}
            <div
              onClick={() => handleKpiCardClick('deliveries', 'failed_or_delayed')}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-border hover:border-rose-300 hover:shadow-md cursor-pointer transition group shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">Failed / Delayed</span>
                <AlertTriangle size={15} className="text-rose-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-2xl font-black text-rose-700">{metrics.delayedOrFailed}</div>
              <div className="text-[10px] text-rose-700 font-bold mt-1">Reschedule Urgent &rarr;</div>
            </div>

            {/* Card 7: Installations Pending */}
            <div
              onClick={() => handleKpiCardClick('orders', 'installations')}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-border hover:border-purple-300 hover:shadow-md cursor-pointer transition group shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">Setup Pending</span>
                <UserCheck size={15} className="text-purple-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.installationsPending}</div>
              <div className="text-[10px] text-purple-700 font-bold mt-1">Assign Clinician &rarr;</div>
            </div>

            {/* Card 8: Maintenance Pending */}
            <div
              onClick={() => handleKpiCardClick('maintenance', 'reported')}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-border hover:border-amber-300 hover:shadow-md cursor-pointer transition group shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">Maintenance</span>
                <Wrench size={15} className="text-amber-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.maintenancePending}</div>
              <div className="text-[10px] text-amber-700 font-bold mt-1">Open Tickets &rarr;</div>
            </div>

            {/* Card 9: Supplier Orders Pending */}
            <div
              onClick={() => {
                setActiveTab('orders');
                setOrderSourcingFilter('supplier_direct');
              }}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-border hover:border-indigo-300 hover:shadow-md cursor-pointer transition group col-span-2 sm:col-span-1 shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">Supplier Pending</span>
                <Building2 size={15} className="text-indigo-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.supplierOrdersPending}</div>
              <div className="text-[10px] text-indigo-700 font-bold mt-1">Awaiting PO Accept &rarr;</div>
            </div>
          </div>
        </section>

        {/* Primary Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs ${
              activeTab === 'orders'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-border'
            }`}
          >
            <Boxes size={15} />
            <span>Orders &amp; Fulfilment</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs ${
              activeTab === 'products'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-border'
            }`}
          >
            <PackageCheck size={15} />
            <span>Product &amp; Inventory</span>
          </button>

          <button
            onClick={() => setActiveTab('deliveries')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs ${
              activeTab === 'deliveries'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-border'
            }`}
          >
            <Truck size={15} />
            <span>Last-Mile Delivery Queue</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs ${
              activeTab === 'maintenance'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-border'
            }`}
          >
            <Wrench size={15} />
            <span>Installation &amp; Maintenance</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: ORDERS & FULFILMENT WORKSPACE
        ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-border shadow-2xs flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[220px]">
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search order #, patient, phone, city..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-border text-navy placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white"
                  />
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                </div>

                {/* Status Filter */}
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs text-navy focus:outline-none font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="placed">Placed (New)</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready_for_dispatch">Ready for Dispatch</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="delivery_attempt_failed">Delivery Attempt Failed</option>
                  <option value="delivery_rescheduled">Delivery Rescheduled</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {/* Sourcing Filter */}
                <select
                  value={orderSourcingFilter}
                  onChange={(e) => setOrderSourcingFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs text-navy focus:outline-none font-medium"
                >
                  <option value="all">All Sourcing Types</option>
                  <option value="own_stock">VivoQuest Depot Owned</option>
                  <option value="supplier_direct">Supplier Direct Marketplace</option>
                </select>
              </div>

              <div className="text-xs text-slate-500">
                Found <span className="font-bold text-navy">{orders.length}</span> order(s)
              </div>
            </div>

            {/* Orders Table */}
            {ordersLoading ? (
              <div className="py-20 text-center text-slate-400 text-xs">Loading operational orders queue...</div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs bg-white rounded-2xl border border-border">
                No orders match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border shadow-2xs bg-white">
                <table className="w-full text-left text-xs text-slate-700 bg-white">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Order # &amp; Date</th>
                      <th className="py-3 px-4">Patient / Recipient</th>
                      <th className="py-3 px-4">Items &amp; Sourcing</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Delivery Staff</th>
                      <th className="py-3 px-4">Setup</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {orders.map((o) => {
                      const isOwned = o.items?.some((it: any) => it.sourcingType !== 'supplier_direct');
                      const isSupplier = o.items?.some((it: any) => it.sourcingType === 'supplier_direct');

                      return (
                        <tr key={o.id || o._id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-navy font-mono">{o.orderNumber}</div>
                            <div className="text-[10px] text-slate-500">
                              {new Date(o.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-navy">{o.patientName}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Phone size={10} />
                              <span>{o.patientPhone}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} />
                              <span>{o.deliveryAddress?.city}, {o.deliveryAddress?.pincode}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-800 font-medium truncate max-w-[180px]">
                              {o.items?.map((it: any) => `${it.title} (x${it.quantity})`).join(', ')}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              {isOwned && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200">
                                  VivoQuest Depot
                                </span>
                              )}
                              {isSupplier && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-50 text-purple-800 border border-purple-200">
                                  Supplier Direct
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                o.paymentStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : o.paymentStatus === 'cod'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {o.paymentStatus}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono font-semibold">
                              ₹{(o.pricing?.totalAmount || 0).toLocaleString('en-IN')}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {o.deliveryAssignment?.assignedStaffName ? (
                              <div className="text-teal-800 font-bold">
                                {o.deliveryAssignment.assignedStaffName}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {o.clinicalSetup?.isSetupRequired ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  o.clinicalSetup.setupStatus === 'completed'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-purple-50 text-purple-800 border border-purple-200'
                                }`}
                              >
                                {o.clinicalSetup.setupStatus}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">None</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                o.orderStatus === 'delivered'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : o.orderStatus === 'dispatched' || o.orderStatus === 'in_transit' || o.orderStatus === 'out_for_delivery'
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : o.orderStatus === 'delivery_attempt_failed' || o.orderStatus === 'delivery_rescheduled'
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : 'bg-teal-50 text-teal-800 border border-teal-200'
                              }`}
                            >
                              {o.orderStatus?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenOrder(o)}
                              className="px-3 py-1.5 rounded-xl bg-navy hover:bg-navy-light text-white text-xs font-bold transition inline-flex items-center gap-1 shadow-2xs"
                            >
                              <span>Manage</span>
                              <ChevronRight size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: PRODUCT & INVENTORY MANAGEMENT
        ========================================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-border shadow-2xs flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[220px]">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search SKU, title, category..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-border text-navy placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white"
                  />
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                </div>

                <select
                  value={productSourcingFilter}
                  onChange={(e) => setProductSourcingFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs text-navy focus:outline-none font-medium"
                >
                  <option value="all">All Sourcing</option>
                  <option value="own_stock">VivoQuest Depot Owned</option>
                  <option value="supplier_direct">Supplier Direct Marketplace</option>
                </select>

                <select
                  value={productConditionFilter}
                  onChange={(e) => setProductConditionFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs text-navy focus:outline-none font-medium"
                >
                  <option value="all">All Conditions</option>
                  <option value="healthy">Healthy &amp; Certified</option>
                  <option value="damaged">Damaged</option>
                  <option value="under_maintenance">Under Maintenance</option>
                  <option value="returned_for_inspection">Returned for Inspection</option>
                </select>
              </div>

              <button
                onClick={handleOpenAddProduct}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={15} />
                <span>Add Product</span>
              </button>
            </div>

            {/* Products Grid */}
            {productsLoading ? (
              <div className="py-20 text-center text-slate-400 text-xs">Loading medical inventory...</div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs bg-white rounded-2xl border border-border">
                No products found matching filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((p) => {
                  const img = p.images?.[0] || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800';

                  return (
                    <div
                      key={p.id || p._id}
                      className="bg-white rounded-2xl p-5 border border-border hover:border-teal-400 hover:shadow-md transition flex flex-col justify-between group shadow-2xs"
                    >
                      <div>
                        {/* Image & Badges */}
                        <div className="relative w-full h-40 bg-slate-100 rounded-xl overflow-hidden mb-3.5 border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                                p.sourcingType === 'own_stock'
                                  ? 'bg-teal-900/90 text-teal-100 border border-teal-700'
                                  : 'bg-purple-900/90 text-purple-100 border border-purple-700'
                              }`}
                            >
                              {p.sourcingType === 'own_stock' ? 'VivoQuest Owned' : 'Supplier Direct'}
                            </span>
                          </div>

                          <div className="absolute top-2 right-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                                p.equipmentCondition === 'healthy'
                                  ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-700'
                                  : p.equipmentCondition === 'under_maintenance'
                                  ? 'bg-amber-900/90 text-amber-100 border border-amber-700'
                                  : 'bg-rose-900/90 text-rose-100 border border-rose-700'
                              }`}
                            >
                              {p.equipmentCondition || 'healthy'}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="text-[10px] font-mono text-teal-700 font-bold uppercase tracking-wider">{p.sku}</div>
                        <h3 className="font-bold text-navy text-sm mt-0.5 line-clamp-1">{p.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>

                        {/* Stock & Pricing */}
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Available Stock</span>
                            <span className={`font-black text-sm ${p.stockQuantity < 5 ? 'text-amber-600' : 'text-emerald-700'}`}>
                              {p.stockQuantity} units
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">Retail Price</span>
                            <span className="font-black text-sm text-navy">₹{(p.price || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Condition & Edit Actions */}
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                        <select
                          value={p.equipmentCondition || 'healthy'}
                          onChange={(e) => handleQuickConditionChange(p.id || p._id, e.target.value)}
                          className="px-2 py-1 rounded-lg bg-slate-50 border border-border text-[10px] text-slate-700 font-semibold focus:outline-none"
                        >
                          <option value="healthy">Healthy</option>
                          <option value="damaged">Damaged</option>
                          <option value="under_maintenance">Maintenance</option>
                          <option value="returned_for_inspection">Inspection</option>
                        </select>

                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-navy text-xs font-semibold transition"
                        >
                          Edit Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: LAST-MILE DELIVERY QUEUE (DISPATCH FOCUS)
        ========================================================================= */}
        {activeTab === 'deliveries' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-border shadow-2xs flex flex-wrap gap-3 items-center justify-between">
              <div>
                <h3 className="font-bold text-navy text-sm">Last-Mile Field Delivery Pipeline</h3>
                <p className="text-xs text-slate-500">
                  Real-time status updates: Order Confirmed &rarr; Preparing &rarr; Ready &rarr; Dispatched &rarr; In Transit &rarr; Out for Delivery &rarr; Delivered.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs text-navy focus:outline-none font-medium"
                >
                  <option value="all">All Active Stages</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready_for_dispatch">Ready for Dispatch</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="delivery_attempt_failed">Failed Attempts</option>
                  <option value="delivery_rescheduled">Rescheduled</option>
                </select>
              </div>
            </div>

            {/* Delivery Queue Cards */}
            {ordersLoading ? (
              <div className="py-20 text-center text-slate-400 text-xs">Loading delivery queue...</div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs bg-white rounded-2xl border border-border">
                No active delivery shipments matching stage.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((o) => (
                  <div
                    key={o.id || o._id}
                    className="p-5 rounded-2xl bg-white border border-border hover:border-teal-400 hover:shadow-md transition flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-black text-navy">{o.orderNumber}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            o.orderStatus === 'delivered'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : o.orderStatus === 'dispatched' || o.orderStatus === 'in_transit' || o.orderStatus === 'out_for_delivery'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : o.orderStatus === 'delivery_attempt_failed' || o.orderStatus === 'delivery_rescheduled'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-teal-50 text-teal-800 border border-teal-200'
                          }`}
                        >
                          {o.orderStatus?.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div className="flex items-center gap-2">
                          <UserCheck size={14} className="text-slate-400" />
                          <span className="font-bold text-navy">{o.patientName}</span>
                          <span className="text-slate-500 font-mono text-[11px]">• {o.patientPhone}</span>
                        </div>
                        <div className="flex items-start gap-2 text-slate-600">
                          <MapPin size={14} className="shrink-0 mt-0.5 text-slate-400" />
                          <span>{o.deliveryAddress?.street}, {o.deliveryAddress?.city} - {o.deliveryAddress?.pincode}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                          <Truck size={14} className="text-teal-600" />
                          <span>Assigned Agent: <strong className="text-navy">{o.deliveryAssignment?.assignedStaffName || 'Not Assigned Yet'}</strong></span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-border text-xs">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Package Contents</span>
                        <div className="text-slate-800 text-xs font-medium">
                          {o.items?.map((it: any) => `${it.title} (x${it.quantity})`).join(', ')}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      <div className="text-[11px] text-slate-500">
                        Payment: <strong className="text-emerald-700 uppercase">{o.paymentStatus}</strong>
                      </div>

                      <button
                        onClick={() => handleOpenOrder(o)}
                        className="px-4 py-1.5 rounded-xl bg-navy hover:bg-navy-light text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <RefreshCw size={13} />
                        <span>Update Progress</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: INSTALLATION & MAINTENANCE WORKSPACE
        ========================================================================= */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-border shadow-2xs flex flex-wrap gap-3 items-center justify-between">
              <div>
                <h3 className="font-bold text-navy text-sm">Biomedical Maintenance &amp; Equipment Health</h3>
                <p className="text-xs text-slate-500">
                  Track diagnosis, repair actions, replacement parts, and equipment recovery status.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={maintenanceStatusFilter}
                  onChange={(e) => setMaintenanceStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs text-navy focus:outline-none font-medium"
                >
                  <option value="all">All Ticket Statuses</option>
                  <option value="reported">Reported</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed (Healthy)</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <button
                  onClick={() => setMaintenanceModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={15} />
                  <span>Log Maintenance Ticket</span>
                </button>
              </div>
            </div>

            {/* Maintenance Tickets Table */}
            {maintenanceLoading ? (
              <div className="py-20 text-center text-slate-400 text-xs">Loading maintenance queue...</div>
            ) : maintenanceTickets.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs bg-white rounded-2xl border border-border">
                No maintenance tickets currently active.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border shadow-2xs bg-white">
                <table className="w-full text-left text-xs text-slate-700 bg-white">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Ticket # &amp; Date</th>
                      <th className="py-3 px-4">Equipment / SKU</th>
                      <th className="py-3 px-4">Reported Issue</th>
                      <th className="py-3 px-4">Urgency</th>
                      <th className="py-3 px-4">Technician</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {maintenanceTickets.map((t) => (
                      <tr key={t.id || t._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-navy font-mono">{t.ticketNumber}</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(t.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-navy">{t.productTitle}</div>
                          <div className="text-[10px] font-mono text-teal-700">{t.productSku}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800 max-w-[220px] line-clamp-2">{t.reportedIssue}</div>
                          {t.patientName && (
                            <div className="text-[10px] text-slate-500 mt-0.5">Patient: {t.patientName}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              t.urgency === 'critical'
                                ? 'bg-rose-50 text-rose-800 border border-rose-200 animate-pulse'
                                : t.urgency === 'high'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {t.urgency}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {t.assignedStaffName ? (
                            <span className="text-teal-800 font-bold">{t.assignedStaffName}</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              t.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : t.status === 'in_progress'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenTicketAction(t)}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition inline-flex items-center gap-1"
                          >
                            <Wrench size={13} />
                            <span>Diagnose</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          DRAWER / MODAL: ORDER FULFILMENT & DELIVERY LIFECYCLE
      ========================================================================= */}
      {orderModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <span className="text-[10px] font-mono text-teal-700 uppercase tracking-wider font-bold block">
                  ORDER FULFILMENT COMMAND
                </span>
                <h3 className="text-xl font-black text-navy flex items-center gap-2 mt-0.5">
                  <span>{selectedOrder.orderNumber}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      selectedOrder.orderStatus === 'delivered'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-teal-50 text-teal-800 border border-teal-200'
                    }`}
                  >
                    {selectedOrder.orderStatus?.replace(/_/g, ' ')}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setOrderModalOpen(false)}
                className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-navy transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 mt-5">
              {/* Recipient & Address Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-border text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Recipient</span>
                  <div className="font-bold text-navy mt-0.5">{selectedOrder.patientName}</div>
                  <div className="text-slate-500 font-mono mt-0.5">{selectedOrder.patientPhone}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Delivery Destination</span>
                  <div className="text-slate-700 mt-0.5 leading-relaxed font-medium">
                    {selectedOrder.deliveryAddress?.street}, {selectedOrder.deliveryAddress?.city} - {selectedOrder.deliveryAddress?.pincode}
                  </div>
                </div>
              </div>

              {/* 1. Workflow Status Transition Form */}
              <form onSubmit={handleDeliveryStatusSubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                    <Truck size={14} className="text-teal-700" />
                    <span>Advance Delivery Stage</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-semibold">Current: {selectedOrder.orderStatus}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">New Workflow Stage *</label>
                    <select
                      value={workflowStatus}
                      onChange={(e) => setWorkflowStatus(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white border border-border text-navy text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    >
                      <option value="">Select Target Status...</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready_for_dispatch">Ready for Dispatch</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="in_transit">In Transit</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered (Successful Drop)</option>
                      <option value="delivery_attempt_failed">Delivery Attempt Failed</option>
                      <option value="delivery_rescheduled">Delivery Rescheduled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Hub Location</label>
                    <input
                      type="text"
                      value={workflowLocation}
                      onChange={(e) => setWorkflowLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-border text-navy text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Conditional Failure / Reschedule inputs */}
                {(workflowStatus === 'delivery_attempt_failed' || workflowStatus === 'delivery_rescheduled') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-rose-800 mb-1">Exception Reason *</label>
                      <input
                        type="text"
                        value={workflowFailureReason}
                        onChange={(e) => setWorkflowFailureReason(e.target.value)}
                        placeholder="e.g. Patient residence locked, contact unreachable"
                        required
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-navy text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-rose-800 mb-1">Rescheduled Date</label>
                      <input
                        type="date"
                        value={workflowRescheduleDate}
                        onChange={(e) => setWorkflowRescheduleDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-navy text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Proof of delivery */}
                {workflowStatus === 'delivered' && (
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-800 mb-1">Proof of Delivery URL / Doc Ref</label>
                    <input
                      type="text"
                      value={workflowProofUrl}
                      onChange={(e) => setWorkflowProofUrl(e.target.value)}
                      placeholder="e.g. https://vivoquest.in/proofs/POD-2026-XXXX.jpg"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-navy text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Notes &amp; Audit Remarks</label>
                  <input
                    type="text"
                    value={workflowNotes}
                    onChange={(e) => setWorkflowNotes(e.target.value)}
                    placeholder="e.g. Scanned at Central Depot, loaded on van #4"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-border text-navy text-xs focus:outline-none"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={workflowSubmitting || !workflowStatus}
                    className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-light text-white font-bold text-xs transition disabled:opacity-50 shadow-2xs"
                  >
                    {workflowSubmitting ? 'Recording Transition...' : 'Apply Status Transition'}
                  </button>
                </div>
              </form>

              {/* 2. Assign Delivery Staff */}
              <form onSubmit={handleAssignDeliverySubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={14} className="text-teal-700" />
                  <span>Assign Delivery Specialist</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Field Specialist</label>
                    <select
                      value={assignedStaffId}
                      onChange={(e) => setAssignedStaffId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white border border-border text-navy text-xs focus:outline-none font-medium"
                    >
                      <option value="">Select Employee...</option>
                      {staffList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.fullName} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Scheduled Delivery Date</label>
                    <input
                      type="date"
                      value={assignDeliveryDate}
                      onChange={(e) => setAssignDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-border text-navy text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={assignSubmitting || !assignedStaffId}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition disabled:opacity-50 shadow-2xs"
                  >
                    {assignSubmitting ? 'Assigning...' : 'Assign Staff'}
                  </button>
                </div>
              </form>

              {/* 3. Clinical Setup Section (If setup required) */}
              {selectedOrder.clinicalSetup?.isSetupRequired && (
                <form onSubmit={handleInstallationSubmit} className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-3.5">
                  <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench size={14} className="text-purple-700" />
                    <span>Clinical Setup &amp; Installation</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Assigned Clinician</label>
                      <select
                        value={installationSpecialistId}
                        onChange={(e) => setInstallationSpecialistId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-border text-navy text-xs focus:outline-none"
                      >
                        <option value="">Select Specialist...</option>
                        {staffList.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.fullName} ({s.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Setup Status</label>
                      <select
                        value={installationStatus}
                        onChange={(e) => setInstallationStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-border text-navy text-xs focus:outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Slot</label>
                      <select
                        value={installationSlot}
                        onChange={(e) => setInstallationSlot(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-border text-navy text-xs focus:outline-none"
                      >
                        <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                        <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                        <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                        <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={installationSubmitting}
                      className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition disabled:opacity-50 shadow-2xs"
                    >
                      {installationSubmitting ? 'Updating...' : 'Update Setup Task'}
                    </button>
                  </div>
                </form>
              )}

              {/* 4. Tracking History Milestones */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-border text-xs">
                <h4 className="text-xs font-bold text-navy uppercase tracking-wider mb-3">
                  Tracking Event History ({selectedOrder.trackingUpdates?.length || 0})
                </h4>
                <div className="space-y-3">
                  {selectedOrder.trackingUpdates?.map((ev: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs">
                      <div className="w-2 h-2 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="font-bold text-navy">{ev.message}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {new Date(ev.timestamp).toLocaleString('en-IN')} {ev.location ? `• ${ev.location}` : ''} {ev.staffName ? `• by ${ev.staffName}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT PRODUCT
      ========================================================================= */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <h3 className="text-lg font-black text-navy">
                {editingProduct ? `Edit ${editingProduct.sku}` : 'Add Medical Equipment'}
              </h3>
              <button
                onClick={() => setProductModalOpen(false)}
                className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-navy transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-navy mb-1">SKU *</label>
                <input
                  type="text"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  disabled={Boolean(editingProduct)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy font-mono text-xs disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1">Product Title *</label>
                <input
                  type="text"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  required
                  placeholder="e.g. Deluxe Bariatric Homecare Wheelchair"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs font-medium"
                  >
                    <option value="mobility">Mobility</option>
                    <option value="fall_prevention">Fall Prevention</option>
                    <option value="respiratory">Respiratory</option>
                    <option value="monitoring_diagnostics">Monitoring &amp; Diagnostics</option>
                    <option value="wound_care">Wound Care</option>
                    <option value="icu_home_setup">ICU Home Setup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Sourcing Type</label>
                  <select
                    value={productForm.sourcingType}
                    onChange={(e) => setProductForm({ ...productForm, sourcingType: e.target.value })}
                    disabled={Boolean(editingProduct)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs disabled:opacity-50 font-medium"
                  >
                    <option value="own_stock">VivoQuest Depot Owned</option>
                    <option value="supplier_direct">Supplier Direct Marketplace</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Retail Price (₹) *</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    required
                    min={0}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    value={productForm.stockQuantity}
                    onChange={(e) => setProductForm({ ...productForm, stockQuantity: Number(e.target.value) })}
                    required
                    min={0}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1">Product Image URL / Data URI</label>
                <input
                  type="text"
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  placeholder="https://... or /assets/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1">Equipment Condition</label>
                <select
                  value={productForm.condition}
                  onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs font-medium"
                >
                  <option value="healthy">Healthy &amp; Certified</option>
                  <option value="damaged">Damaged</option>
                  <option value="under_maintenance">Under Maintenance</option>
                  <option value="returned_for_inspection">Returned for Inspection</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={productSubmitting}
                  className="px-5 py-2 rounded-xl bg-navy hover:bg-navy-light text-white font-bold text-xs transition disabled:opacity-50 shadow-2xs"
                >
                  {productSubmitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: LOG MAINTENANCE TICKET
      ========================================================================= */}
      {maintenanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-border">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <h3 className="text-lg font-black text-navy flex items-center gap-2">
                <Wrench size={18} className="text-amber-600" />
                <span>Log Maintenance Ticket</span>
              </h3>
              <button
                onClick={() => setMaintenanceModalOpen(false)}
                className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-navy transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMaintenanceSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-navy mb-1">Select Equipment *</label>
                <select
                  value={maintenanceForm.productId}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, productId: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs font-medium"
                >
                  <option value="">Choose product...</option>
                  {products.map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>
                      {p.sku} - {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1">Reported Issue *</label>
                <textarea
                  value={maintenanceForm.reportedIssue}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, reportedIssue: e.target.value })}
                  required
                  rows={3}
                  placeholder="Describe failure, mechanical breakdown, error code, or missing part..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Urgency</label>
                  <select
                    value={maintenanceForm.urgency}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, urgency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs font-medium"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={maintenanceForm.patientName}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, patientName: e.target.value })}
                    placeholder="e.g. Ramesh K"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setMaintenanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={maintenanceSubmitting || !maintenanceForm.productId}
                  className="px-5 py-2 rounded-xl bg-navy hover:bg-navy-light text-white font-bold text-xs transition disabled:opacity-50 shadow-2xs"
                >
                  {maintenanceSubmitting ? 'Logging...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DIAGNOSE / RESOLVE MAINTENANCE TICKET
      ========================================================================= */}
      {ticketActionModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-border">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <span className="text-[10px] font-mono text-amber-700 font-bold uppercase tracking-wider block">
                  TICKET DIAGNOSIS
                </span>
                <h3 className="text-lg font-black text-navy mt-0.5">
                  {selectedTicket.ticketNumber} • {selectedTicket.productSku}
                </h3>
              </div>
              <button
                onClick={() => setTicketActionModalOpen(false)}
                className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-navy transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTicketResolutionSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-navy mb-1">Status</label>
                <select
                  value={ticketResolution.status}
                  onChange={(e) => setTicketResolution({ ...ticketResolution, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs font-medium"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed (Mark Equipment Healthy)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1">Technical Diagnosis</label>
                <textarea
                  value={ticketResolution.diagnosis}
                  onChange={(e) => setTicketResolution({ ...ticketResolution, diagnosis: e.target.value })}
                  rows={2}
                  placeholder="Diagnostic findings, motor test, oxygen sensor reading..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1">Action Taken &amp; Replacement Parts</label>
                <textarea
                  value={ticketResolution.actionTaken}
                  onChange={(e) => setTicketResolution({ ...ticketResolution, actionTaken: e.target.value })}
                  rows={2}
                  placeholder="Repaired valve seal, recalibrated pressure regulator..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-border text-navy text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setTicketActionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={maintenanceSubmitting}
                  className="px-5 py-2 rounded-xl bg-navy hover:bg-navy-light text-white font-bold text-xs transition disabled:opacity-50 shadow-2xs"
                >
                  {maintenanceSubmitting ? 'Saving...' : 'Update Maintenance Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
