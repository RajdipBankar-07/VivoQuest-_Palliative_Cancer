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
  RotateCcw,
  Star,
  DollarSign,
  UploadCloud,
  ShieldCheck,
  MessageSquare,
  Info,
  Bell,
  ChevronLeft,
  CalendarDays,
} from 'lucide-react';
import { operationsApi, authApi } from '@/lib/api';

type OperationsTab = 'orders' | 'completed' | 'products' | 'installation' | 'returns';

export default function OperationsDashboardPage() {
  const router = useRouter();

  // Employee Profile & Auth
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active Primary Workspace Tab
  const [activeTab, setActiveTab] = useState<OperationsTab>('orders');

  // Completed Deliveries State
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedSummary, setCompletedSummary] = useState({
    totalDelivered: 0,
    otpVerifiedCount: 0,
    managerOverrideCount: 0,
    ratedCount: 0,
    avgDeliveryRating: 5.0,
  });
  const [completedDateRange, setCompletedDateRange] = useState<string>('all');
  const [completedStartDate, setCompletedStartDate] = useState<string>('');
  const [completedEndDate, setCompletedEndDate] = useState<string>('');
  const [completedStaffFilter, setCompletedStaffFilter] = useState<string>('all');
  const [completedSourcingFilter, setCompletedSourcingFilter] = useState<string>('all');
  const [completedRatingFilter, setCompletedRatingFilter] = useState<string>('all');
  const [completedVerificationFilter, setCompletedVerificationFilter] = useState<string>('all');
  const [completedSearch, setCompletedSearch] = useState<string>('');
  const [completedPage, setCompletedPage] = useState<number>(1);
  const [completedTotalPages, setCompletedTotalPages] = useState<number>(1);
  const [completedTotalCount, setCompletedTotalCount] = useState<number>(0);
  const [viewCompletedOrderModal, setViewCompletedOrderModal] = useState<any>(null);

  // Delivery OTP Verification State
  const [deliveryOtpCode, setDeliveryOtpCode] = useState<string>('');
  const [otpRecipientName, setOtpRecipientName] = useState<string>('');
  const [otpRecipientRel, setOtpRecipientRel] = useState<string>('Self');
  const [otpCondition, setOtpCondition] = useState<string>('good_condition');
  const [otpCustomerAck, setOtpCustomerAck] = useState<boolean>(true);
  const [otpCooldownTimer, setOtpCooldownTimer] = useState<number>(0);
  const [otpRequestLoading, setOtpRequestLoading] = useState<boolean>(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState<boolean>(false);
  const [isManagerOverrideOpen, setIsManagerOverrideOpen] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideDocType, setOverrideDocType] = useState<string>('aadhaar');
  const [overrideDocLast4, setOverrideDocLast4] = useState<string>('');

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

  // SLA & Overdue Monitor
  const [slaAlerts, setSlaAlerts] = useState<any>(null);
  const [slaLoading, setSlaLoading] = useState(false);
  const [slaFilter, setSlaFilter] = useState<'all' | 'overdue' | 'at_risk' | 'due_soon'>('all');

  // Patient Reschedule Queue
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [selectedReschedule, setSelectedReschedule] = useState<any>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleAction, setRescheduleAction] = useState<'approve' | 'reject' | 'propose_alternative'>('approve');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleAltDate, setRescheduleAltDate] = useState('');
  const [rescheduleAltSlot, setRescheduleAltSlot] = useState('Morning 09:00 - 13:00');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSourcingFilter, setOrderSourcingFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  // Daily Delivery Planner State (Asia/Kolkata Business Timezone)
  const [plannerDateRange, setPlannerDateRange] = useState<string>('today');
  const [plannerCustomStart, setPlannerCustomStart] = useState<string>('');
  const [plannerCustomEnd, setPlannerCustomEnd] = useState<string>('');
  const [plannerRiskFilter, setPlannerRiskFilter] = useState<string>('all');
  const [plannerSortBy, setPlannerSortBy] = useState<string>('deliveryDate');
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderTotalPages, setOrderTotalPages] = useState<number>(1);
  const [orderTotalCount, setOrderTotalCount] = useState<number>(0);
  const [plannerSummary, setPlannerSummary] = useState<{
    dateRange: string;
    timezone: string;
    kpis: {
      newOrConfirmed: number;
      awaitingDispatch: number;
      inTransit: number;
      delivered: number;
      overdue: number;
      rescheduleRequests: number;
    };
    alerts: {
      dueToday: number;
      dueSoon: number;
      atRisk: number;
      overdue: number;
      delivered: number;
    };
  } | null>(null);

  // Operational Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [notificationsLoading, setNotificationsLoading] = useState<boolean>(false);

  // Delivery Workflow Modal
  const [workflowStatus, setWorkflowStatus] = useState('');
  const [workflowNotes, setWorkflowNotes] = useState('');
  const [workflowLocation, setWorkflowLocation] = useState('Central Pune Operations Depot');
  const [workflowFailureReason, setWorkflowFailureReason] = useState('');
  const [workflowProofUrl, setWorkflowProofUrl] = useState('');
  const [workflowRescheduleDate, setWorkflowRescheduleDate] = useState('');
  const [workflowSubmitting, setWorkflowSubmitting] = useState(false);

  // Delivery Assignment & Provider Coordination
  const [staffList, setStaffList] = useState<any[]>([]);
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [assignDeliveryDate, setAssignDeliveryDate] = useState('');
  const [assignDeliveryNotes, setAssignDeliveryNotes] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // External Delivery Provider Coordination
  const [isCoordinateProviderOpen, setIsCoordinateProviderOpen] = useState(false);
  const [deliveryProviders, setDeliveryProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [providerName, setProviderName] = useState('Blue Dart Express');
  const [deliveryPersonName, setDeliveryPersonName] = useState('Ramesh Shinde (Operations Lead)');
  const [contactPhone, setContactPhone] = useState('+919822012345');
  const [providerEmail, setProviderEmail] = useState('pune.ops@bluedart.com');
  const [serviceArea, setServiceArea] = useState('Pune, PCMC & Maharashtra Express');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [providerScheduledDate, setProviderScheduledDate] = useState('');
  const [coordinationStatus, setCoordinationStatus] = useState('provider_confirmed');
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [coordinationNotes, setCoordinationNotes] = useState('');
  const [coordinationSubmitting, setCoordinationSubmitting] = useState(false);

  // WhatsApp Coordination Modal state
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppPreviewData, setWhatsAppPreviewData] = useState<any>(null);
  const [whatsAppNotes, setWhatsAppNotes] = useState('');
  const [whatsAppActionSubmitting, setWhatsAppActionSubmitting] = useState(false);

  // Delay Flagging Modal
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [delayReason, setDelayReason] = useState('');
  const [delayDate, setDelayDate] = useState('');
  const [delayNotes, setDelayNotes] = useState('');
  const [delaySubmitting, setDelaySubmitting] = useState(false);

  // Profitability Drawer
  const [profitabilityModalOpen, setProfitabilityModalOpen] = useState(false);
  const [profitabilityData, setProfitabilityData] = useState<any>(null);
  const [profitabilityLoading, setProfitabilityLoading] = useState(false);

  // Installation Task Modal & State
  const [installationModalOpen, setInstallationModalOpen] = useState(false);
  const [installationSpecialistId, setInstallationSpecialistId] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [installationSlot, setInstallationSlot] = useState('10:00 AM - 12:00 PM');
  const [installationStatus, setInstallationStatus] = useState('scheduled');
  const [installationNotes, setInstallationNotes] = useState('');
  const [installationSubmitting, setInstallationSubmitting] = useState(false);
  const [installationSupportingDoc, setInstallationSupportingDoc] = useState('');
  const [installationHandoverConfirmed, setInstallationHandoverConfirmed] = useState(false);
  const [installationChecklist, setInstallationChecklist] = useState([
    { item: 'Unpacking and physical chassis inspection completed without defects', checked: true },
    { item: 'Electrical grounding, power line & battery calibration verified', checked: true },
    { item: 'Patient and primary caregiver trained on operation and emergency protocols', checked: true },
  ]);
  const [costBreakdown, setCostBreakdown] = useState({
    labourCost: 450,
    transportCost: 200,
    partsCost: 0,
    otherApprovedCharges: 0,
  });

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
    condition: 'brand_new',
    conditionNotes: '',
    images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'],
    primaryImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
    installationEligible: false,
    newImageUrlInput: '',
  });
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productActiveSubTab, setProductActiveSubTab] = useState<'catalog' | 'reviews' | 'complaints'>('catalog');

  // ===========================================================================
  // Phase 16: Inventory & Stock Management State
  // ===========================================================================
  const [inventorySummary, setInventorySummary] = useState({
    totalActiveSkus: 0,
    totalOnHandUnits: 0,
    totalReservedUnits: 0,
    totalAvailableUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    incomingUnitsFromPOs: 0,
    supplierConfirmationRequiredCount: 0,
  });
  const [inventorySummaryLoading, setInventorySummaryLoading] = useState(false);
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
  const [inventoryProductsLoading, setInventoryProductsLoading] = useState(false);
  const [inventoryPage, setInventoryPage] = useState<number>(1);
  const [inventoryTotalPages, setInventoryTotalPages] = useState<number>(1);
  const [inventoryTotalCount, setInventoryTotalCount] = useState<number>(0);
  const [inventorySearch, setInventorySearch] = useState<string>('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('all');
  const [inventorySourcingFilter, setInventorySourcingFilter] = useState<string>('all');
  const [inventoryStockStatusFilter, setInventoryStockStatusFilter] = useState<string>('all');
  const [inventorySortBy, setInventorySortBy] = useState<string>('updated_desc');

  // Stock Adjustment Modal
  const [adjustStockModalOpen, setAdjustStockModalOpen] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<any>(null);
  const [adjustNewQuantity, setAdjustNewQuantity] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical Cycle Count Reconciliation');
  const [adjustMovementType, setAdjustMovementType] = useState<string>('audit_reconciliation');
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Supplier Availability Modal
  const [supplierConfirmModalOpen, setSupplierConfirmModalOpen] = useState(false);
  const [supplierConfirmProduct, setSupplierConfirmProduct] = useState<any>(null);
  const [supplierConfirmStatus, setSupplierConfirmStatus] = useState<string>('confirmed');
  const [supplierLeadTimeDays, setSupplierLeadTimeDays] = useState<number>(3);
  const [supplierConfirmNotes, setSupplierConfirmNotes] = useState<string>('');
  const [supplierConfirmSubmitting, setSupplierConfirmSubmitting] = useState(false);

  // Reorder Purchase Order Modal
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderTargetProduct, setReorderTargetProduct] = useState<any>(null);
  const [reorderQuantity, setReorderQuantity] = useState<number>(15);
  const [reorderUnitCost, setReorderUnitCost] = useState<number>(0);
  const [reorderNotes, setReorderNotes] = useState<string>('');
  const [reorderSubmitting, setReorderSubmitting] = useState(false);

  // Stock Movement History Drawer
  const [movementsDrawerOpen, setMovementsDrawerOpen] = useState(false);
  const [movementsProduct, setMovementsProduct] = useState<any>(null);
  const [movementsList, setMovementsList] = useState<any[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  // Customer Reviews & Feedback
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Customer Complaints & Damage Reports
  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintResolutionNotes, setComplaintResolutionNotes] = useState('');
  const [complaintResolutionStatus, setComplaintResolutionStatus] = useState<'resolved' | 'rejected'>('resolved');
  const [complaintRefundAmount, setComplaintRefundAmount] = useState(0);
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);

  // Biomedical Maintenance State
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

  // Returns Workspace State
  const [returns, setReturns] = useState<any[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnsFilter, setReturnsFilter] = useState('all');
  const [returnsSearch, setReturnsSearch] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnActionType, setReturnActionType] = useState<'review' | 'schedule_pickup' | 'pickup_outcome' | 'inspection' | 'resolution'>('review');
  const [returnReviewAction, setReturnReviewAction] = useState<'approve' | 'reject'>('approve');
  const [returnRejectionReason, setReturnRejectionReason] = useState('');
  const [returnPickupDate, setReturnPickupDate] = useState('');
  const [returnPickupStaffId, setReturnPickupStaffId] = useState('');
  const [returnPickupProofUrl, setReturnPickupProofUrl] = useState('');
  const [returnPickupStatus, setReturnPickupStatus] = useState<'completed' | 'attempt_failed'>('completed');
  const [returnInspectionResult, setReturnInspectionResult] = useState<'intact_healthy' | 'customer_damaged' | 'manufacturing_defect' | 'missing_accessories'>('intact_healthy');
  const [returnInspectionNotes, setReturnInspectionNotes] = useState('');
  const [returnResolutionType, setReturnResolutionType] = useState<'replacement' | 'refund' | 'repair' | 'rejected_no_action'>('replacement');
  const [returnRefundAmount, setReturnRefundAmount] = useState(0);
  const [returnSubmitting, setReturnSubmitting] = useState(false);

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

  // 1. Initial Load & Auth Check
  useEffect(() => {
    async function initOps() {
      setAuthLoading(true);
      try {
        const user = authApi.getCurrentUser();
        if (!user) {
          router.push('/operations/login');
          return;
        }

        const allowedRoles = [
          'operations_manager',
          'delivery_staff',
          'sales_manager',
          'maintenance_staff',
          'admin',
          'super_admin',
        ];

        if (!allowedRoles.includes(user.role)) {
          showError('Access Denied: Only authorized operations staff may access this workspace.');
          router.push('/operations/login');
          return;
        }

        setCurrentUser(user);

        // Fetch staff list
        try {
          const staffRes = await operationsApi.getStaff();
          if (staffRes && Array.isArray(staffRes.data)) {
            setStaffList(staffRes.data);
          }
        } catch {
          // fallback
        }

        // Fetch reusable delivery providers
        try {
          const provRes = await operationsApi.getDeliveryProviders();
          if (provRes && Array.isArray(provRes.data)) {
            setDeliveryProviders(provRes.data);
          }
        } catch {
          // fallback
        }
      } catch (err: any) {
        showError(err.message || 'Error validating operational credentials');
        router.push('/operations/login');
      } finally {
        setAuthLoading(false);
      }
    }

    initOps();
  }, [router]);

  // 2. Load Metrics
  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = await operationsApi.getMetrics();
      if (res && res.data) {
        setMetrics(res.data);
      }
    } catch {
      // Non-blocking
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // 3. Load SLA Alerts
  const loadSlaAlerts = useCallback(async () => {
    setSlaLoading(true);
    try {
      const res = await operationsApi.getSlaAlerts();
      if (res && res.data) {
        setSlaAlerts(res.data);
      }
    } catch {
      // Non-blocking
    } finally {
      setSlaLoading(false);
    }
  }, []);

  // 4. Load Reschedule Requests
  const loadRescheduleRequests = useCallback(async () => {
    setRescheduleLoading(true);
    try {
      const res = await operationsApi.getRescheduleRequests('all');
      if (res && Array.isArray(res.data)) {
        setRescheduleRequests(res.data);
      }
    } catch {
      // Non-blocking
    } finally {
      setRescheduleLoading(false);
    }
  }, []);

  // Load Completed Deliveries
  const loadCompletedDeliveries = useCallback(async () => {
    setCompletedLoading(true);
    try {
      const res = await operationsApi.getCompletedDeliveries({
        dateRange: completedDateRange,
        startDate: completedStartDate || undefined,
        endDate: completedEndDate || undefined,
        deliveryStaffId: completedStaffFilter,
        sourcingType: completedSourcingFilter,
        ratingStatus: completedRatingFilter,
        verificationMethod: completedVerificationFilter,
        search: completedSearch,
        page: completedPage,
        limit: 10,
      });
      if (res && res.data) {
        setCompletedOrders(res.data);
        if (res.summary) setCompletedSummary(res.summary);
        if (res.pagination) {
          setCompletedTotalPages(res.pagination.totalPages);
          setCompletedTotalCount(res.pagination.total);
        }
      }
    } catch (err: any) {
      showError(err.message || 'Error loading completed deliveries');
    } finally {
      setCompletedLoading(false);
    }
  }, [
    completedDateRange,
    completedStartDate,
    completedEndDate,
    completedStaffFilter,
    completedSourcingFilter,
    completedRatingFilter,
    completedVerificationFilter,
    completedSearch,
    completedPage,
  ]);

  useEffect(() => {
    if (activeTab === 'completed') {
      loadCompletedDeliveries();
    }
  }, [activeTab, loadCompletedDeliveries]);

  // Request Delivery OTP Handler
  const handleRequestOtp = async () => {
    if (!selectedOrder) return;
    setOtpRequestLoading(true);
    try {
      const res = await operationsApi.requestDeliveryOtp(selectedOrder.id || selectedOrder._id);
      showSuccess(res.message || 'Delivery OTP sent to customer');
      setOtpCooldownTimer(60);
      const timer = setInterval(() => {
        setOtpCooldownTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      loadOrders();
    } catch (err: any) {
      showError(err.message || 'Failed to request delivery OTP');
    } finally {
      setOtpRequestLoading(false);
    }
  };

  // Verify Delivery OTP Handler
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !deliveryOtpCode.trim()) return;
    setOtpVerifyLoading(true);
    try {
      const res = await operationsApi.verifyDeliveryOtp(selectedOrder.id || selectedOrder._id, {
        otp: deliveryOtpCode.trim(),
        recipientName: otpRecipientName || selectedOrder.patientName,
        recipientRelationship: otpRecipientRel,
        deliveryCondition: otpCondition,
        customerAcknowledgement: otpCustomerAck,
        proofUrl: workflowProofUrl || undefined,
        notes: workflowNotes || undefined,
      });
      showSuccess('Delivery verified via OTP and order marked completed!');
      setOrderModalOpen(false);
      setSelectedOrder(null);
      setDeliveryOtpCode('');
      loadOrders();
      loadMetrics();
      loadCompletedDeliveries();
    } catch (err: any) {
      showError(err.message || 'Invalid delivery OTP');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  // Manager Override Handler
  const handleManagerOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !overrideReason.trim()) return;
    setOtpVerifyLoading(true);
    try {
      const res = await operationsApi.managerDeliveryOverride(selectedOrder.id || selectedOrder._id, {
        overrideReason: overrideReason.trim(),
        identityDocType: overrideDocType,
        identityDocLast4: overrideDocLast4.trim() || undefined,
        recipientName: otpRecipientName || selectedOrder.patientName,
        recipientRelationship: otpRecipientRel,
        deliveryCondition: otpCondition,
        proofUrl: workflowProofUrl || undefined,
        notes: workflowNotes || undefined,
      });
      showSuccess('Order marked delivered via authorized manager override!');
      setOrderModalOpen(false);
      setSelectedOrder(null);
      setIsManagerOverrideOpen(false);
      setOverrideReason('');
      loadOrders();
      loadMetrics();
      loadCompletedDeliveries();
    } catch (err: any) {
      showError(err.message || 'Manager override failed');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  // 5. Load Orders with Planner & IST Filtering
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await operationsApi.getOrders({
        status: orderStatusFilter,
        sourcingType: orderSourcingFilter,
        search: orderSearch,
        dateRange: plannerDateRange,
        startDate: plannerCustomStart || undefined,
        endDate: plannerCustomEnd || undefined,
        riskFilter: plannerRiskFilter,
        sortBy: plannerSortBy,
        page: orderPage,
        limit: 10,
      });
      if (res && res.data) {
        setOrders(res.data);
        if (res.pagination) {
          setOrderTotalPages(res.pagination.totalPages || 1);
          setOrderTotalCount(res.pagination.total || 0);
        }
        if (res.plannerSummary) {
          setPlannerSummary(res.plannerSummary);
        }
      }
    } catch (err: any) {
      showError(err.message || 'Error loading orders');
    } finally {
      setOrdersLoading(false);
    }
  }, [
    orderStatusFilter,
    orderSourcingFilter,
    orderSearch,
    plannerDateRange,
    plannerCustomStart,
    plannerCustomEnd,
    plannerRiskFilter,
    plannerSortBy,
    orderPage,
  ]);

  // Operational Notifications
  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const res = await operationsApi.getNotifications({ limit: 20 });
      if (res && res.data) {
        setNotifications(res.data);
        setUnreadNotificationCount(res.unreadCount || 0);
      }
    } catch {
      // Non-blocking
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await operationsApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, status: 'read', readAt: new Date().toISOString() } : n))
      );
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Non-blocking
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await operationsApi.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'read', readAt: new Date().toISOString() }))
      );
      setUnreadNotificationCount(0);
      showSuccess('All operational notifications marked as read');
    } catch (err: any) {
      showError(err.message || 'Failed to mark notifications read');
    }
  };

  // 6. Load Products
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

  // 7. Load Reviews & Complaints
  const loadReviewsAndComplaints = useCallback(async () => {
    setReviewsLoading(true);
    setComplaintsLoading(true);
    try {
      const [revRes, compRes] = await Promise.allSettled([
        operationsApi.getReviews(),
        operationsApi.getComplaints(),
      ]);
      if (revRes.status === 'fulfilled' && revRes.value?.data) {
        setReviews(revRes.value.data);
      }
      if (compRes.status === 'fulfilled' && compRes.value?.data) {
        setComplaints(compRes.value.data);
      }
    } catch {
      // Non-blocking
    } finally {
      setReviewsLoading(false);
      setComplaintsLoading(false);
    }
  }, []);

  // 8. Load Maintenance
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

  // 9. Load Returns
  const loadReturns = useCallback(async () => {
    setReturnsLoading(true);
    try {
      const res = await operationsApi.getReturns({
        returnStatus: returnsFilter,
        search: returnsSearch,
      });
      if (res && Array.isArray(res.data)) {
        setReturns(res.data);
      }
    } catch (err: any) {
      showError(err.message || 'Error loading returns');
    } finally {
      setReturnsLoading(false);
    }
  }, [returnsFilter, returnsSearch]);

  // ===========================================================================
  // Phase 16: Inventory & Stock Management Handlers
  // ===========================================================================
  const loadInventorySummary = useCallback(async () => {
    setInventorySummaryLoading(true);
    try {
      const res = await operationsApi.getInventorySummary();
      if (res && res.data) {
        setInventorySummary(res.data);
      }
    } catch {
      // Non-blocking
    } finally {
      setInventorySummaryLoading(false);
    }
  }, []);

  const loadInventoryProducts = useCallback(async () => {
    setInventoryProductsLoading(true);
    try {
      const res = await operationsApi.getInventoryProducts({
        search: inventorySearch || undefined,
        category: inventoryCategoryFilter !== 'all' ? inventoryCategoryFilter : undefined,
        sourcingType: inventorySourcingFilter !== 'all' ? inventorySourcingFilter : undefined,
        stockStatus: inventoryStockStatusFilter !== 'all' ? inventoryStockStatusFilter : undefined,
        page: inventoryPage,
        limit: 10,
        sortBy: inventorySortBy,
      });
      if (res && res.data) {
        setInventoryProducts(res.data);
        if (res.pagination) {
          setInventoryTotalPages(res.pagination.totalPages || 1);
          setInventoryTotalCount(res.pagination.total || 0);
        }
      }
    } catch (err: any) {
      showError(err.message || 'Error loading inventory products');
    } finally {
      setInventoryProductsLoading(false);
    }
  }, [
    inventorySearch,
    inventoryCategoryFilter,
    inventorySourcingFilter,
    inventoryStockStatusFilter,
    inventoryPage,
    inventorySortBy,
  ]);

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetProduct) return;
    setAdjustSubmitting(true);
    try {
      const res = await operationsApi.adjustStock(adjustTargetProduct.id || adjustTargetProduct._id, {
        newQuantity: Number(adjustNewQuantity),
        reason: adjustReason.trim(),
        movementType: adjustMovementType,
        notes: adjustNotes.trim() || undefined,
      });
      showSuccess(res.message || 'Stock adjusted successfully');
      setAdjustStockModalOpen(false);
      setAdjustTargetProduct(null);
      setAdjustNotes('');
      loadInventorySummary();
      loadInventoryProducts();
      loadMetrics();
    } catch (err: any) {
      showError(err.message || 'Failed to adjust stock');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleConfirmSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierConfirmProduct) return;
    setSupplierConfirmSubmitting(true);
    try {
      const res = await operationsApi.confirmSupplierAvailability(
        supplierConfirmProduct.id || supplierConfirmProduct._id,
        {
          status: supplierConfirmStatus,
          leadTimeDays: Number(supplierLeadTimeDays),
          notes: supplierConfirmNotes.trim() || undefined,
        }
      );
      showSuccess(res.message || 'Supplier availability updated successfully');
      setSupplierConfirmModalOpen(false);
      setSupplierConfirmProduct(null);
      setSupplierConfirmNotes('');
      loadInventorySummary();
      loadInventoryProducts();
    } catch (err: any) {
      showError(err.message || 'Failed to update supplier availability');
    } finally {
      setSupplierConfirmSubmitting(false);
    }
  };

  const handleReorderPOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderTargetProduct) return;
    setReorderSubmitting(true);
    try {
      const res = await operationsApi.createRestockPO(reorderTargetProduct.id || reorderTargetProduct._id, {
        quantity: Number(reorderQuantity),
        unitCost: Number(reorderUnitCost),
        supplierId: reorderTargetProduct.supplierId,
        notes: reorderNotes.trim() || undefined,
      });
      showSuccess(res.message || 'Restock Purchase Order created for review');
      setReorderModalOpen(false);
      setReorderTargetProduct(null);
      setReorderNotes('');
      loadInventorySummary();
      loadInventoryProducts();
    } catch (err: any) {
      showError(err.message || 'Failed to create restock purchase order');
    } finally {
      setReorderSubmitting(false);
    }
  };

  const handleOpenMovementsDrawer = async (product: any) => {
    setMovementsProduct(product);
    setMovementsDrawerOpen(true);
    setMovementsLoading(true);
    try {
      const res = await operationsApi.getStockMovements(product.id || product._id, { page: 1, limit: 30 });
      if (res && res.data) {
        setMovementsList(res.data);
      }
    } catch (err: any) {
      showError(err.message || 'Error loading stock movements');
    } finally {
      setMovementsLoading(false);
    }
  };

  // Trigger loads on tab change
  useEffect(() => {
    if (!currentUser) return;
    loadMetrics();
    loadNotifications();
    if (activeTab === 'orders') {
      loadOrders();
      loadSlaAlerts();
      loadRescheduleRequests();
    } else if (activeTab === 'products') {
      loadInventorySummary();
      loadInventoryProducts();
      loadProducts();
      loadReviewsAndComplaints();
    } else if (activeTab === 'installation') {
      loadOrders();
      loadMaintenance();
    } else if (activeTab === 'returns') {
      loadReturns();
      loadReviewsAndComplaints();
    }
  }, [
    currentUser,
    activeTab,
    loadMetrics,
    loadOrders,
    loadSlaAlerts,
    loadRescheduleRequests,
    loadProducts,
    loadReviewsAndComplaints,
    loadMaintenance,
    loadReturns,
  ]);

  // Sign out handler
  const handleLogout = () => {
    authApi.logout();
    router.push('/operations/login');
  };

  // Reserve Stock Action
  const handleReserveStock = async (orderId: string) => {
    try {
      await operationsApi.reserveStock(orderId);
      showSuccess('Depot inventory successfully locked and reserved for this order.');
      loadOrders();
      loadMetrics();
    } catch (err: any) {
      showError(err.message || 'Failed to reserve stock');
    }
  };

  // Supplier Confirmation Action
  const handleSupplierConfirmation = async (orderId: string, supplierId?: string) => {
    try {
      await operationsApi.requestSupplierConfirmation(orderId, supplierId);
      showSuccess('Purchase order and confirmation request transmitted to external vendor.');
      loadOrders();
    } catch (err: any) {
      showError(err.message || 'Failed to request supplier confirmation');
    }
  };

  // Flag Delay Action
  const handleFlagDelaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !delayReason || !delayDate) return;

    setDelaySubmitting(true);
    try {
      await operationsApi.flagDelay(selectedOrder.id || selectedOrder._id, {
        delayReason,
        revisedEstimatedDate: delayDate,
        notes: delayNotes,
      });
      showSuccess(`Delivery delay recorded. In-app update sent to ${selectedOrder.patientName}.`);
      setDelayModalOpen(false);
      setDelayReason('');
      setDelayDate('');
      setDelayNotes('');
      loadOrders();
      loadMetrics();
      loadSlaAlerts();
    } catch (err: any) {
      showError(err.message || 'Failed to flag delivery delay');
    } finally {
      setDelaySubmitting(false);
    }
  };

  // View Profitability Action
  const handleViewProfitability = async (order: any) => {
    setSelectedOrder(order);
    setProfitabilityModalOpen(true);
    setProfitabilityLoading(true);
    try {
      const res = await operationsApi.getOrderProfitability(order.id || order._id);
      if (res && res.data) {
        setProfitabilityData(res.data);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load order profitability');
    } finally {
      setProfitabilityLoading(false);
    }
  };

  // Review Patient Reschedule Action
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReschedule) return;

    setRescheduleSubmitting(true);
    try {
      await operationsApi.reviewReschedule(selectedReschedule.orderId, {
        requestId: selectedReschedule.requestId,
        action: rescheduleAction,
        reason: rescheduleReason,
        alternativeDate: rescheduleAltDate || undefined,
        alternativeSlot: rescheduleAltSlot,
      });
      showSuccess(`Reschedule request marked as ${rescheduleAction}.`);
      setRescheduleModalOpen(false);
      setSelectedReschedule(null);
      loadRescheduleRequests();
      loadOrders();
      loadSlaAlerts();
    } catch (err: any) {
      showError(err.message || 'Failed to process reschedule review');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // Delivery Milestone Workflow Submit
  const handleWorkflowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !workflowStatus) return;

    setWorkflowSubmitting(true);
    try {
      await operationsApi.updateDeliveryStatus(selectedOrder.id || selectedOrder._id, {
        newStatus: workflowStatus,
        notes: workflowNotes,
        location: workflowLocation,
        failureReason: workflowFailureReason,
        proofUrl: workflowProofUrl,
        scheduledDeliveryDate: workflowRescheduleDate || undefined,
      });

      showSuccess(`Order ${selectedOrder.orderNumber} updated to ${workflowStatus.replace(/_/g, ' ').toUpperCase()}`);
      setOrderModalOpen(false);
      setSelectedOrder(null);
      loadOrders();
      loadMetrics();
      loadSlaAlerts();
    } catch (err: any) {
      showError(err.message || 'Failed to update order delivery milestone');
    } finally {
      setWorkflowSubmitting(false);
    }
  };

  // Assign Delivery Staff
  const handleAssignDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !assignedStaffId) return;

    setAssignSubmitting(true);
    try {
      await operationsApi.assignDelivery(selectedOrder.id || selectedOrder._id, {
        staffId: assignedStaffId,
        scheduledDeliveryDate: assignDeliveryDate || undefined,
        deliveryNotes: assignDeliveryNotes,
      });

      showSuccess(`Order ${selectedOrder.orderNumber} assigned for dispatch.`);
      setOrderModalOpen(false);
      loadOrders();
      loadMetrics();
    } catch (err: any) {
      showError(err.message || 'Failed to assign delivery staff');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // External Delivery Provider Coordination Handlers
  const openCoordinateProviderModal = (order: any) => {
    setSelectedOrder(order);
    const coord = order.providerCoordination || order.deliveryAssignment?.provider;
    if (coord && coord.providerName) {
      setSelectedProviderId(coord.providerId || '');
      setProviderName(coord.providerName);
      setDeliveryPersonName(coord.deliveryPersonName || '');
      setContactPhone(coord.contactPhone || '');
      setProviderEmail(coord.email || '');
      setServiceArea(coord.serviceArea || 'Pune Metropolitan Region');
      setDeliveryInstructions(coord.deliveryInstructions || '');
      setCoordinationStatus(coord.coordinationStatus || 'provider_confirmed');
    } else {
      const def = deliveryProviders.find((p) => p.isDefault) || deliveryProviders[0];
      if (def) {
        setSelectedProviderId(def.id || def._id || '');
        setProviderName(def.name);
        setDeliveryPersonName(def.contactPerson || '');
        setContactPhone(def.phone || '');
        setProviderEmail(def.email || '');
        setServiceArea(def.serviceArea || 'Pune Metropolitan Region');
        setDeliveryInstructions(def.deliveryInstructions || '');
      } else {
        setSelectedProviderId('');
        setProviderName('Blue Dart Express');
        setDeliveryPersonName('Ramesh Shinde (Operations Lead)');
        setContactPhone('+919822012345');
        setProviderEmail('pune.ops@bluedart.com');
        setServiceArea('Pune, PCMC & Maharashtra Express');
        setDeliveryInstructions('High priority fragile medical equipment delivery partner. Call customer 30 mins prior.');
      }
      setCoordinationStatus('provider_confirmed');
    }

    const schedDate = order.deliveryAssignment?.scheduledDeliveryDate || order.estimatedDeliveryDate;
    setProviderScheduledDate(schedDate ? new Date(schedDate).toISOString().slice(0, 10) : '');
    setCoordinationNotes('');
    setSaveToLibrary(true);
    setIsCoordinateProviderOpen(true);
  };

  const handleProviderSelectChange = (pId: string) => {
    setSelectedProviderId(pId);
    if (!pId) return;
    const found = deliveryProviders.find((p) => (p.id || p._id) === pId);
    if (found) {
      setProviderName(found.name);
      setDeliveryPersonName(found.contactPerson || '');
      setContactPhone(found.phone || '');
      setProviderEmail(found.email || '');
      setServiceArea(found.serviceArea || 'Pune Metropolitan Region');
      setDeliveryInstructions(found.deliveryInstructions || '');
    }
  };

  const handleCoordinateProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!providerName.trim() || !contactPhone.trim()) {
      showError('Delivery partner name and contact phone are required.');
      return;
    }

    setCoordinationSubmitting(true);
    try {
      await operationsApi.coordinateOrderProvider(selectedOrder.id || selectedOrder._id, {
        providerId: selectedProviderId || undefined,
        providerName,
        deliveryPersonName,
        contactPhone,
        email: providerEmail || undefined,
        serviceArea,
        deliveryInstructions,
        scheduledDeliveryDate: providerScheduledDate || undefined,
        coordinationStatus,
        saveToLibrary,
        notes: coordinationNotes,
      });

      showSuccess(`Delivery partner ${providerName} coordinated for order #${selectedOrder.orderNumber}.`);
      setIsCoordinateProviderOpen(false);
      loadOrders();
      loadMetrics();

      try {
        const provRes = await operationsApi.getDeliveryProviders();
        if (provRes && Array.isArray(provRes.data)) {
          setDeliveryProviders(provRes.data);
        }
      } catch {
        // ignore
      }
    } catch (err: any) {
      showError(err.message || 'Failed to coordinate delivery partner');
    } finally {
      setCoordinationSubmitting(false);
    }
  };

  const openWhatsAppModal = async (order: any) => {
    setSelectedOrder(order);
    try {
      setWhatsAppActionSubmitting(true);
      const res = await operationsApi.previewWhatsAppDelivery(order.id || order._id);
      if (res && res.data) {
        setWhatsAppPreviewData(res.data);
        setWhatsAppNotes('');
        setIsWhatsAppModalOpen(true);
      }
    } catch (err: any) {
      showError(err.message || 'Unable to prepare WhatsApp message. Please assign a delivery partner first.');
    } finally {
      setWhatsAppActionSubmitting(false);
    }
  };

  const handleRecordWhatsAppAction = async (action: 'opened_in_whatsapp' | 'sent_confirmed' | 'provider_acknowledged') => {
    if (!selectedOrder) return;
    setWhatsAppActionSubmitting(true);
    try {
      await operationsApi.recordWhatsAppAction(selectedOrder.id || selectedOrder._id, {
        action,
        notes: whatsAppNotes || undefined,
      });
      showSuccess(`WhatsApp status updated: ${action.replace(/_/g, ' ').toUpperCase()}`);
      if (action === 'provider_acknowledged') {
        setIsWhatsAppModalOpen(false);
      } else {
        const res = await operationsApi.previewWhatsAppDelivery(selectedOrder.id || selectedOrder._id);
        if (res && res.data) {
          setWhatsAppPreviewData(res.data);
        }
      }
      loadOrders();
      loadMetrics();
    } catch (err: any) {
      showError(err.message || 'Failed to update WhatsApp action state');
    } finally {
      setWhatsAppActionSubmitting(false);
    }
  };

  // Clinical Setup Installation Submit
  const handleInstallationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setInstallationSubmitting(true);
    try {
      await operationsApi.updateInstallation(selectedOrder.id || selectedOrder._id, {
        assignedSpecialistId: installationSpecialistId || undefined,
        setupStatus: installationStatus,
        setupDate: installationDate || undefined,
        timeSlot: installationSlot,
        setupNotes: installationNotes,
        checklistResults: installationChecklist,
        supportingDocUrl: installationSupportingDoc,
        costBreakdown,
        customerConfirmationConfirmed: installationHandoverConfirmed,
      });

      showSuccess(`Clinical setup for ${selectedOrder.orderNumber} updated.`);
      setInstallationModalOpen(false);
      loadOrders();
      loadMetrics();
    } catch (err: any) {
      showError(err.message || 'Failed to update installation task');
    } finally {
      setInstallationSubmitting(false);
    }
  };

  // Product Add / Edit Submit
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductSubmitting(true);
    try {
      await operationsApi.manageInventory({
        productId: editingProduct?.id || editingProduct?._id,
        sku: productForm.sku,
        title: productForm.title,
        category: productForm.category,
        description: productForm.description,
        price: Number(productForm.price),
        regularPrice: Number(productForm.regularPrice),
        stockQuantity: Number(productForm.stockQuantity),
        sourcingType: productForm.sourcingType as any,
        supplierName: productForm.supplierName,
        condition: productForm.condition as any,
        conditionNotes: productForm.conditionNotes,
        images: productForm.images,
        primaryImage: productForm.primaryImage || productForm.images[0],
        installationEligible: productForm.installationEligible,
      });

      showSuccess(`Medical product "${productForm.title}" saved.`);
      setProductModalOpen(false);
      setEditingProduct(null);
      loadProducts();
    } catch (err: any) {
      showError(err.message || 'Failed to save product');
    } finally {
      setProductSubmitting(false);
    }
  };

  // Returns Action Submit
  const handleReturnActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setReturnSubmitting(true);
    try {
      const orderId = selectedReturn.orderId || selectedReturn.id || selectedReturn._id;

      if (returnActionType === 'review') {
        await operationsApi.reviewReturn(orderId, {
          action: returnReviewAction,
          rejectionReason: returnRejectionReason,
        });
        showSuccess(`Return request ${returnReviewAction}ed.`);
      } else if (returnActionType === 'schedule_pickup') {
        await operationsApi.scheduleReturnPickup(orderId, {
          scheduledDate: returnPickupDate,
          assignedStaffId: returnPickupStaffId,
        });
        showSuccess('Doorstep return inspection pickup scheduled.');
      } else if (returnActionType === 'pickup_outcome') {
        await operationsApi.recordPickupOutcome(orderId, {
          pickupStatus: returnPickupStatus,
          pickupProofUrl: returnPickupProofUrl,
          customerHandoverConfirmed: true,
          itemConditionChecklist: [
            { item: 'Physical device unit present with serial tag', passed: true },
            { item: 'Power cables and bundled accessories returned intact', passed: true },
          ],
        });
        showSuccess('Handover outcome recorded.');
      } else if (returnActionType === 'inspection') {
        await operationsApi.recordReturnInspection(orderId, {
          result: returnInspectionResult,
          notes: returnInspectionNotes,
        });
        showSuccess('Technical inspection findings recorded.');
      } else if (returnActionType === 'resolution') {
        await operationsApi.finalizeReturnResolution(orderId, {
          type: returnResolutionType,
          refundAmount: returnRefundAmount,
        });
        showSuccess(`Return resolution finalized as ${returnResolutionType.toUpperCase()}.`);
      }

      setReturnModalOpen(false);
      setSelectedReturn(null);
      loadReturns();
    } catch (err: any) {
      showError(err.message || 'Failed to execute return workflow action');
    } finally {
      setReturnSubmitting(false);
    }
  };

  // Resolve Customer Complaint
  const handleComplaintResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setComplaintSubmitting(true);
    try {
      await operationsApi.resolveComplaint(selectedComplaint.id || selectedComplaint._id, {
        status: complaintResolutionStatus,
        resolutionNotes: complaintResolutionNotes,
        refundAmount: complaintRefundAmount > 0 ? complaintRefundAmount : undefined,
      });

      showSuccess(`Complaint ${selectedComplaint.complaintNumber} updated to ${complaintResolutionStatus}.`);
      setComplaintModalOpen(false);
      setSelectedComplaint(null);
      loadReviewsAndComplaints();
    } catch (err: any) {
      showError(err.message || 'Failed to update complaint status');
    } finally {
      setComplaintSubmitting(false);
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
                <span className="hidden sm:inline-block text-teal-800 font-mono text-[10px] px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 font-bold uppercase">
                  Sales, Inventory &amp; Last-Mile Delivery Portal
                </span>
                <span className="sm:hidden text-teal-800 font-mono text-[10px] px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 font-bold uppercase">
                  Ops Portal
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

          {/* Operational Notifications Bell & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                if (!notificationsOpen) {
                  loadNotifications();
                }
              }}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-border text-slate-700 hover:text-navy transition shadow-2xs relative"
              title="Operational Alerts & Activity"
            >
              <Bell size={15} />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white min-w-[18px] text-center shadow-xs animate-pulse">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notificationsOpen && (
              <div className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-2xl border border-border shadow-2xl z-50 overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-teal-600" />
                    <span className="font-bold text-xs text-navy uppercase tracking-wider">
                      Operations Alerts
                    </span>
                    {unreadNotificationCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                        {unreadNotificationCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadNotificationCount > 0 && (
                      <button
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[10px] text-teal-700 hover:text-teal-900 font-bold hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-border">
                  {notificationsLoading ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      <RefreshCw size={18} className="animate-spin mx-auto text-teal-600 mb-2" />
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No operational notifications at this time.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`p-3 text-xs transition flex items-start gap-2.5 ${
                          n.status !== 'read' ? 'bg-teal-50/40 hover:bg-teal-50/70' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="mt-1 shrink-0">
                          {n.status !== 'read' ? (
                            <div className="w-2 h-2 rounded-full bg-teal-600" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {n.subject && (
                            <div className="font-bold text-navy text-[11px] truncate">{n.subject}</div>
                          )}
                          <div className="text-slate-700 text-[11px] mt-0.5 leading-snug">{n.content}</div>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                            <span>{new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            <div className="flex items-center gap-2">
                              {n.metadata?.orderId && (
                                <button
                                  onClick={() => {
                                    setNotificationsOpen(false);
                                    const targetOrder = orders.find(
                                      (ord) => (ord.id || ord._id) === n.metadata.orderId
                                    );
                                    if (targetOrder) {
                                      setSelectedOrder(targetOrder);
                                      setOrderModalOpen(true);
                                    } else {
                                      setOrderSearch(n.metadata.orderNumber || n.metadata.orderId);
                                      setPlannerDateRange('all');
                                    }
                                  }}
                                  className="text-teal-700 hover:text-teal-900 font-bold hover:underline"
                                >
                                  Open Order &rarr;
                                </button>
                              )}
                              {n.status !== 'read' && (
                                <button
                                  onClick={() => handleMarkNotificationRead(n._id)}
                                  className="text-slate-500 hover:text-navy font-semibold hover:underline"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              loadMetrics();
              loadNotifications();
              if (activeTab === 'orders') {
                loadOrders();
                loadSlaAlerts();
                loadRescheduleRequests();
              } else if (activeTab === 'products') {
                loadProducts();
                loadReviewsAndComplaints();
              } else if (activeTab === 'installation') {
                loadOrders();
                loadMaintenance();
              } else if (activeTab === 'returns') {
                loadReturns();
              }
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
        
        {/* Section: KPI Command Cards */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Boxes size={15} className="text-teal-600" />
              <span>Operations KPI Metrics</span>
            </h2>
            <span className="text-[11px] text-slate-400">Real-time database statistics</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-border hover:border-blue-300 transition shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">New Orders</span>
                <Clock size={15} className="text-blue-600" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.newOrders}</div>
              <div className="text-[10px] text-blue-700 font-bold mt-1">Requires Allocation</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-border hover:border-amber-300 transition shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">Awaiting Dispatch</span>
                <Boxes size={15} className="text-amber-600" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.awaitingDispatch}</div>
              <div className="text-[10px] text-amber-700 font-bold mt-1">Ready for Staging</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-border hover:border-cyan-300 transition shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">In Transit</span>
                <Truck size={15} className="text-cyan-600" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.inTransit}</div>
              <div className="text-[10px] text-cyan-700 font-bold mt-1">On Road Route</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-border hover:border-emerald-300 transition shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">Delivered</span>
                <CheckCircle2 size={15} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.delivered}</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">Successful Drops</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-border hover:border-purple-300 transition shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">Setup Pending</span>
                <Wrench size={15} className="text-purple-600" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.installationsPending}</div>
              <div className="text-[10px] text-purple-700 font-bold mt-1">Biomedical Staging</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-border hover:border-indigo-300 transition shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold">Supplier Orders</span>
                <Building2 size={15} className="text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-navy">{metrics.supplierOrdersPending}</div>
              <div className="text-[10px] text-indigo-700 font-bold mt-1">Direct Vendor POs</div>
            </div>
          </div>
        </section>

        {/* Primary 4 Workspaces Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs shrink-0 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-border'
            }`}
          >
            <Boxes size={15} />
            <span>1. Orders &amp; Delivery</span>
            {slaAlerts?.summary?.overdueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black">
                {slaAlerts.summary.overdueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('completed');
              setCompletedPage(1);
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs shrink-0 whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-border'
            }`}
          >
            <CheckCircle2 size={15} className={activeTab === 'completed' ? 'text-white' : 'text-emerald-600'} />
            <span>2. Completed Deliveries</span>
            {metrics.delivered > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
                {metrics.delivered}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs shrink-0 whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-border'
            }`}
          >
            <PackageCheck size={15} />
            <span>3. Products &amp; Inventory</span>
          </button>

          <button
            onClick={() => setActiveTab('installation')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs shrink-0 whitespace-nowrap ${
              activeTab === 'installation'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-border'
            }`}
          >
            <Wrench size={15} />
            <span>4. Installation &amp; Maintenance</span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs shrink-0 whitespace-nowrap ${
              activeTab === 'returns'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-border'
            }`}
          >
            <RotateCcw size={15} />
            <span>5. Returns &amp; Complaints</span>
            {complaints.filter((c) => c.status === 'open').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-black">
                {complaints.filter((c) => c.status === 'open').length}
              </span>
            )}
          </button>
        </div>

        {/* =========================================================================
            WORKSPACE 1: ORDERS & DELIVERY (DAILY DELIVERY PLANNER)
        ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            
            {/* 1. Daily Delivery Planner Bar */}
            <div className="bg-white rounded-2xl p-5 border border-border shadow-2xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-navy uppercase tracking-wider">
                        Daily Delivery Planner
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                        <Clock size={11} className="text-teal-600" />
                        Asia/Kolkata (IST, UTC+05:30)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Intended delivery schedule filtering based on promised slot deadlines &amp; route staging
                    </p>
                  </div>
                </div>

                {/* Date Range Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'tomorrow', label: 'Tomorrow' },
                    { id: 'next_3_days', label: 'Next 3 Days' },
                    { id: 'next_7_days', label: 'Next 7 Days' },
                    { id: 'overdue', label: 'Overdue' },
                    { id: 'custom', label: 'Custom' },
                    { id: 'all', label: 'All Orders' },
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => {
                        setPlannerDateRange(pill.id);
                        setOrderPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        plannerDateRange === pill.id
                          ? 'bg-navy text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-border'
                      }`}
                    >
                      {pill.id === 'overdue' && (
                        <AlertTriangle size={12} className={plannerDateRange === pill.id ? 'text-rose-300' : 'text-rose-600'} />
                      )}
                      <span>{pill.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range Picker */}
              {plannerDateRange === 'custom' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-border flex flex-wrap items-center gap-3 text-xs animate-slide-up">
                  <span className="font-semibold text-slate-700">Custom IST Delivery Window:</span>
                  <div className="flex items-center gap-2">
                    <label className="text-slate-500 text-[11px]">From:</label>
                    <input
                      type="date"
                      value={plannerCustomStart}
                      onChange={(e) => setPlannerCustomStart(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-border text-xs text-navy font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-slate-500 text-[11px]">To:</label>
                    <input
                      type="date"
                      value={plannerCustomEnd}
                      onChange={(e) => setPlannerCustomEnd(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-border text-xs text-navy font-medium"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setOrderPage(1);
                      loadOrders();
                    }}
                    className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                  >
                    Apply Window
                  </button>
                  {(plannerCustomStart || plannerCustomEnd) && (
                    <button
                      onClick={() => {
                        setPlannerCustomStart('');
                        setPlannerCustomEnd('');
                        setOrderPage(1);
                      }}
                      className="text-slate-500 hover:text-navy text-xs underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* 6 Real Database KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOrderStatusFilter((prev) => (prev === 'confirmed' ? 'all' : 'confirmed'));
                    setOrderPage(1);
                  }}
                  className={`p-3.5 rounded-xl text-left border transition cursor-pointer ${
                    orderStatusFilter === 'confirmed'
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/20'
                      : 'bg-white hover:bg-slate-50/80 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold">New / Confirmed</span>
                    <Clock size={14} className="text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-navy">
                    {plannerSummary?.kpis?.newOrConfirmed ?? 0}
                  </div>
                  <div className="text-[10px] text-blue-700 font-bold mt-0.5">Allocation Pending</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrderStatusFilter((prev) => (prev === 'ready_for_dispatch' ? 'all' : 'ready_for_dispatch'));
                    setOrderPage(1);
                  }}
                  className={`p-3.5 rounded-xl text-left border transition cursor-pointer ${
                    orderStatusFilter === 'ready_for_dispatch'
                      ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20'
                      : 'bg-white hover:bg-slate-50/80 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold">Awaiting Dispatch</span>
                    <Boxes size={14} className="text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-navy">
                    {plannerSummary?.kpis?.awaitingDispatch ?? 0}
                  </div>
                  <div className="text-[10px] text-amber-700 font-bold mt-0.5">Ready for Staging</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrderStatusFilter((prev) => (prev === 'in_transit' ? 'all' : 'in_transit'));
                    setOrderPage(1);
                  }}
                  className={`p-3.5 rounded-xl text-left border transition cursor-pointer ${
                    orderStatusFilter === 'in_transit'
                      ? 'bg-cyan-50/70 border-cyan-400 ring-2 ring-cyan-400/20'
                      : 'bg-white hover:bg-slate-50/80 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold">In Transit</span>
                    <Truck size={14} className="text-cyan-600" />
                  </div>
                  <div className="text-2xl font-black text-navy">
                    {plannerSummary?.kpis?.inTransit ?? 0}
                  </div>
                  <div className="text-[10px] text-cyan-700 font-bold mt-0.5">On Road Tracking</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrderStatusFilter((prev) => (prev === 'delivered' ? 'all' : 'delivered'));
                    setOrderPage(1);
                  }}
                  className={`p-3.5 rounded-xl text-left border transition cursor-pointer ${
                    orderStatusFilter === 'delivered'
                      ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/20'
                      : 'bg-white hover:bg-slate-50/80 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold">Delivered</span>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-navy">
                    {plannerSummary?.kpis?.delivered ?? 0}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-0.5">Completed Drops</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlannerRiskFilter((prev) => (prev === 'overdue' ? 'all' : 'overdue'));
                    setOrderPage(1);
                  }}
                  className={`p-3.5 rounded-xl text-left border transition cursor-pointer ${
                    plannerRiskFilter === 'overdue'
                      ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-400/20'
                      : 'bg-white hover:bg-slate-50/80 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-rose-800">Overdue</span>
                    <AlertTriangle size={14} className="text-rose-600" />
                  </div>
                  <div className="text-2xl font-black text-rose-700">
                    {plannerSummary?.kpis?.overdue ?? 0}
                  </div>
                  <div className="text-[10px] text-rose-600 font-bold mt-0.5">Deadline Missed</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlannerRiskFilter((prev) => (prev === 'at_risk' ? 'all' : 'at_risk'));
                    setOrderPage(1);
                  }}
                  className={`p-3.5 rounded-xl text-left border transition cursor-pointer ${
                    plannerRiskFilter === 'at_risk'
                      ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-400/20'
                      : 'bg-white hover:bg-slate-50/80 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-purple-800">Reschedules</span>
                    <Calendar size={14} className="text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-700">
                    {plannerSummary?.kpis?.rescheduleRequests ?? 0}
                  </div>
                  <div className="text-[10px] text-purple-700 font-bold mt-0.5">Action Needed</div>
                </button>
              </div>

              {/* 4 Quick Alert Monitoring Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                    Quick Alerts:
                  </span>

                  <button
                    onClick={() => {
                      setPlannerRiskFilter((prev) => (prev === 'due_today' ? 'all' : 'due_today'));
                      setOrderPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      plannerRiskFilter === 'due_today'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <span>Due Today ({plannerSummary?.alerts?.dueToday ?? 0})</span>
                  </button>

                  <button
                    onClick={() => {
                      setPlannerRiskFilter((prev) => (prev === 'due_soon' ? 'all' : 'due_soon'));
                      setOrderPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      plannerRiskFilter === 'due_soon'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    <span>Due Soon ({plannerSummary?.alerts?.dueSoon ?? 0})</span>
                  </button>

                  <button
                    onClick={() => {
                      setPlannerRiskFilter((prev) => (prev === 'at_risk' ? 'all' : 'at_risk'));
                      setOrderPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      plannerRiskFilter === 'at_risk'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <span>At Risk ({plannerSummary?.alerts?.atRisk ?? 0})</span>
                  </button>

                  <button
                    onClick={() => {
                      setPlannerRiskFilter((prev) => (prev === 'overdue' ? 'all' : 'overdue'));
                      setOrderPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      plannerRiskFilter === 'overdue'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <span>Overdue ({plannerSummary?.alerts?.overdue ?? 0})</span>
                  </button>
                </div>

                {plannerRiskFilter !== 'all' && (
                  <button
                    onClick={() => {
                      setPlannerRiskFilter('all');
                      setOrderPage(1);
                    }}
                    className="text-xs text-rose-700 hover:text-rose-900 font-bold hover:underline flex items-center gap-1"
                  >
                    <X size={12} /> Clear alert filter
                  </button>
                )}
              </div>
            </div>

            {/* 2. Patient Reschedule Request Queue */}
            {rescheduleRequests.length > 0 && (
              <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                    <Calendar size={16} className="text-amber-700" />
                    <span>Patient-Initiated Delivery Reschedule Requests ({rescheduleRequests.filter((r) => r.status === 'pending').length} Pending)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {rescheduleRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-3 bg-white rounded-xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-navy">{req.orderNumber}</span>
                          <span className="font-semibold text-slate-700">{req.patientName}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              req.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : req.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : req.status === 'alternative_proposed'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Requested Date: <strong className="text-navy">{new Date(req.requestedDate).toLocaleDateString('en-IN')}</strong> ({req.timeSlot}) • Reason: &ldquo;{req.reason}&rdquo;
                        </div>
                      </div>

                      {req.status === 'pending' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedReschedule(req);
                              setRescheduleAction('approve');
                              setRescheduleModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReschedule(req);
                              setRescheduleAction('propose_alternative');
                              setRescheduleModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                          >
                            Propose Slot
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReschedule(req);
                              setRescheduleAction('reject');
                              setRescheduleModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Filter Bar & Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-border shadow-2xs">
              <div className="flex-1 relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search order #, patient name, contact number, city..."
                  value={orderSearch}
                  onChange={(e) => {
                    setOrderSearch(e.target.value);
                    setOrderPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-border text-xs focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => {
                    setOrderStatusFilter(e.target.value);
                    setOrderPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="placed">Placed (Requires Allocation)</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="ready_for_dispatch">Ready for Dispatch</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="delivery_rescheduled">Rescheduled</option>
                </select>

                <select
                  value={orderSourcingFilter}
                  onChange={(e) => {
                    setOrderSourcingFilter(e.target.value);
                    setOrderPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700"
                >
                  <option value="all">All Sourcing</option>
                  <option value="own_stock">VivoQuest Depot Inventory</option>
                  <option value="supplier_direct">Supplier Direct Vendor</option>
                </select>

                <select
                  value={plannerSortBy}
                  onChange={(e) => {
                    setPlannerSortBy(e.target.value);
                    setOrderPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700"
                >
                  <option value="deliveryDate">Earliest Delivery First</option>
                  <option value="priority">Highest Priority First</option>
                  <option value="created_desc">Newest Created First</option>
                </select>

                {(orderSearch || orderStatusFilter !== 'all' || orderSourcingFilter !== 'all' || plannerRiskFilter !== 'all' || plannerDateRange !== 'today') && (
                  <button
                    onClick={() => {
                      setOrderSearch('');
                      setOrderStatusFilter('all');
                      setOrderSourcingFilter('all');
                      setPlannerRiskFilter('all');
                      setPlannerDateRange('today');
                      setOrderPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition"
                  >
                    Reset
                  </button>
                )}

                <div className="text-xs font-bold text-slate-500 whitespace-nowrap ml-1">
                  Found <span className="text-navy">{orderTotalCount}</span> order(s)
                </div>
              </div>
            </div>

            {/* 4. Unified Daily Order Queue Table (10 Columns) */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-border text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-3.5">Order # &amp; Date</th>
                      <th className="py-3 px-3.5">Product &amp; Qty</th>
                      <th className="py-3 px-3.5">Sourcing</th>
                      <th className="py-3 px-3.5">Patient &amp; Address</th>
                      <th className="py-3 px-3.5">Promised Date &amp; Slot</th>
                      <th className="py-3 px-3.5">Delivery Provider</th>
                      <th className="py-3 px-3.5">Payment</th>
                      <th className="py-3 px-3.5">Milestone</th>
                      <th className="py-3 px-3.5">Risk &amp; Overdue</th>
                      <th className="py-3 px-3.5 text-right">Next Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ordersLoading ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          <RefreshCw size={24} className="animate-spin mx-auto text-teal-600 mb-2" />
                          <span>Loading daily order queue...</span>
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          No orders matched the selected date range and filter criteria.
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => {
                        const targetDelivery = o.intendedDeliveryDate || o.deliveryAssignment?.scheduledDeliveryDate || o.estimatedDeliveryDate;
                        return (
                          <tr key={o.id || o._id} className="hover:bg-slate-50/70 transition">
                            {/* 1. Order # & Date */}
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <div className="font-bold text-navy font-mono">{o.orderNumber}</div>
                              <div className="text-[10px] text-slate-500">
                                {new Date(o.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </div>
                            </td>

                            {/* 2. Product & Quantity */}
                            <td className="py-3 px-3.5">
                              <div className="max-w-[200px]">
                                {Array.isArray(o.items) && o.items.length > 0 ? (
                                  o.items.map((it: any, idx: number) => (
                                    <div key={idx} className="truncate text-slate-800 font-medium">
                                      {it.quantity}x {it.title}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic">No items listed</span>
                                )}
                              </div>
                            </td>

                            {/* 3. Sourcing */}
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  o.sourcingType === 'supplier_direct' || o.items?.some((it: any) => it.sourcingType === 'supplier_direct')
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-teal-50 text-teal-700 border border-teal-200'
                                }`}
                              >
                                {o.sourcingType === 'supplier_direct' || o.items?.some((it: any) => it.sourcingType === 'supplier_direct')
                                  ? 'Supplier Direct'
                                  : 'VivoQuest Depot'}
                              </span>
                            </td>

                            {/* 4. Patient & Address */}
                            <td className="py-3 px-3.5">
                              <div className="font-bold text-navy">{o.patientName}</div>
                              <div className="text-[10px] text-slate-500">{o.patientPhone}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[170px]" title={o.addressSummary}>
                                {o.addressSummary || o.deliveryAddress?.city || 'Pune Hub'}
                              </div>
                            </td>

                            {/* 5. Promised Date & Slot */}
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {targetDelivery ? (
                                <div>
                                  <div className="font-bold text-navy flex items-center gap-1">
                                    <span>{new Date(targetDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                    {o.riskStatus === 'due_today' && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-800 uppercase">
                                        Today
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[130px]">
                                    {o.deliverySlot || o.deliveryPreferences?.preferredSlot || 'Standard Slot'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Unscheduled</span>
                              )}
                            </td>

                            {/* 6. Delivery Provider & WhatsApp Status */}
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {o.providerCoordination?.providerName || o.deliveryAssignment?.provider?.providerName ? (
                                <div>
                                  <div className="font-bold text-navy flex items-center gap-1.5">
                                    <Truck size={13} className="text-teal-600 shrink-0" />
                                    <span className="truncate max-w-[130px]" title={o.providerCoordination?.providerName || o.deliveryAssignment?.provider?.providerName}>
                                      {o.providerCoordination?.providerName || o.deliveryAssignment?.provider?.providerName}
                                    </span>
                                  </div>
                                  {(o.providerCoordination?.deliveryPersonName || o.providerCoordination?.contactPhone) && (
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                      <span>{o.providerCoordination.deliveryPersonName || 'Coordinator'}</span>
                                      <span className="text-slate-300">•</span>
                                      <span className="font-mono">{o.providerCoordination.contactPhone}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 mt-1">
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                        o.providerCoordination?.coordinationStatus === 'provider_confirmed'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : o.providerCoordination?.coordinationStatus === 'provider_contacted'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {o.providerCoordination?.coordinationStatus?.replace(/_/g, ' ') || 'Confirmed'}
                                    </span>
                                    {o.providerCoordination?.whatsappCoordination?.status && o.providerCoordination.whatsappCoordination.status !== 'not_sent' && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">
                                        WA: {o.providerCoordination.whatsappCoordination.status.replace(/_/g, ' ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openCoordinateProviderModal(o)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-[11px] font-bold transition border border-teal-200 cursor-pointer"
                                >
                                  <Plus size={12} />
                                  <span>Select Provider</span>
                                </button>
                              )}
                            </td>

                            {/* 7. Payment */}
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <div className="font-black text-navy">₹{o.pricing?.totalAmount?.toLocaleString('en-IN')}</div>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  o.paymentStatus === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {o.paymentStatus}
                              </span>
                            </td>

                            {/* 8. Milestone */}
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  o.orderStatus === 'delivered'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : o.orderStatus === 'dispatched' || o.orderStatus === 'in_transit'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : o.orderStatus === 'ready_for_dispatch'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : o.orderStatus === 'delivery_rescheduled'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {o.orderStatus?.replace(/_/g, ' ')}
                              </span>
                            </td>

                            {/* 9. Risk & Overdue Reason */}
                            <td className="py-3 px-3.5">
                              {o.isOverdue ? (
                                <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold leading-tight">
                                  <div>⚠️ {o.overdueDelay || 'Overdue'}</div>
                                  {o.riskReason && (
                                    <div className="font-normal text-rose-600 text-[9px] mt-0.5 truncate max-w-[130px]" title={o.riskReason}>
                                      {o.riskReason}
                                    </div>
                                  )}
                                </div>
                              ) : o.riskStatus === 'at_risk' ? (
                                <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold leading-tight">
                                  <div>⚠️ At Risk</div>
                                  {o.riskReason && (
                                    <div className="font-normal text-amber-600 text-[9px] mt-0.5 truncate max-w-[130px]" title={o.riskReason}>
                                      {o.riskReason}
                                    </div>
                                  )}
                                </div>
                              ) : o.riskStatus === 'due_today' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  Due Today
                                </span>
                              ) : o.riskStatus === 'delivered' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Delivered
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                  On Track
                                </span>
                              )}
                            </td>

                            {/* 10. Next Action */}
                            <td className="py-3 px-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {(o.providerCoordination?.providerName || o.deliveryAssignment?.provider?.providerName) && (
                                  <button
                                    title="Send Delivery Details on WhatsApp"
                                    onClick={() => openWhatsAppModal(o)}
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                                  >
                                    <MessageSquare size={13} />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (
                                      o.nextAction === 'Select Delivery Provider' ||
                                      o.nextAction === 'Confirm Provider Acceptance' ||
                                      o.nextAction === 'Coordinate Provider'
                                    ) {
                                      openCoordinateProviderModal(o);
                                    } else if (
                                      o.nextAction === 'Send WhatsApp Details' ||
                                      o.nextAction === 'Confirm Message Sent'
                                    ) {
                                      openWhatsAppModal(o);
                                    } else {
                                      setSelectedOrder(o);
                                      setWorkflowStatus(o.orderStatus);
                                      setWorkflowNotes('');
                                      setWorkflowProofUrl('');
                                      setOrderModalOpen(true);
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-navy hover:bg-navy-light text-white font-bold text-[11px] transition shadow-2xs cursor-pointer"
                                >
                                  {o.nextAction || 'Manage >'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-3.5 bg-slate-50/80 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 font-medium">
                  Showing page <strong className="text-navy">{orderPage}</strong> of{' '}
                  <strong className="text-navy">{orderTotalPages}</strong> ({orderTotalCount} total orders) • 10 records per page
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={orderPage <= 1}
                    onClick={() => setOrderPage((prev) => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 rounded-xl bg-white border border-border text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 shadow-2xs"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>

                  <span className="px-3 py-1.5 rounded-xl bg-slate-200/70 font-mono font-bold text-navy text-xs">
                    {orderPage} / {orderTotalPages}
                  </span>

                  <button
                    disabled={orderPage >= orderTotalPages}
                    onClick={() => setOrderPage((prev) => Math.min(orderTotalPages, prev + 1))}
                    className="px-3 py-1.5 rounded-xl bg-white border border-border text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 shadow-2xs"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            WORKSPACE 2: COMPLETED DELIVERIES (OTP-VERIFIED & DELIVERED ARCHIVE)
        ========================================================================= */}
        {activeTab === 'completed' && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="bg-white rounded-2xl border border-border p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Delivered</span>
                <span className="text-2xl font-black text-navy mt-1 block">{completedSummary.totalDelivered}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Delivered medical equipment</span>
              </div>

              <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                  <ShieldCheck size={13} />
                  <span>OTP Verified</span>
                </span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">{completedSummary.otpVerifiedCount}</span>
                <span className="text-[10px] text-emerald-600 mt-0.5 block">Single-use PIN verified</span>
              </div>

              <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/20 p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
                  <FileText size={13} />
                  <span>Manager Override</span>
                </span>
                <span className="text-2xl font-black text-amber-700 mt-1 block">{completedSummary.managerOverrideCount}</span>
                <span className="text-[10px] text-amber-600 mt-0.5 block">Identity doc verified</span>
              </div>

              <div className="bg-white rounded-2xl border border-border p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Rated Deliveries</span>
                <span className="text-2xl font-black text-navy mt-1 block">{completedSummary.ratedCount}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Customer rated orders</span>
              </div>

              <div className="bg-white rounded-2xl border border-amber-300 bg-amber-50/30 p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
                  <Star size={13} className="fill-amber-400 text-amber-500" />
                  <span>Avg Delivery Score</span>
                </span>
                <span className="text-2xl font-black text-amber-700 mt-1 block">{completedSummary.avgDeliveryRating} / 5.0</span>
                <span className="text-[10px] text-amber-700 mt-0.5 block">Last-mile service score</span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-border shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Order #, Patient Name, or Contact Phone..."
                    value={completedSearch}
                    onChange={(e) => {
                      setCompletedSearch(e.target.value);
                      setCompletedPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-border text-xs outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={completedDateRange}
                    onChange={(e) => {
                      setCompletedDateRange(e.target.value);
                      setCompletedPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last_7_days">Last 7 Days</option>
                    <option value="this_month">This Month</option>
                    <option value="custom">Custom Range...</option>
                  </select>

                  <select
                    value={completedSourcingFilter}
                    onChange={(e) => {
                      setCompletedSourcingFilter(e.target.value);
                      setCompletedPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">All Sourcing</option>
                    <option value="own_stock">VivoQuest Depot</option>
                    <option value="supplier_direct">Supplier Direct</option>
                  </select>

                  <select
                    value={completedRatingFilter}
                    onChange={(e) => {
                      setCompletedRatingFilter(e.target.value);
                      setCompletedPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">All Ratings</option>
                    <option value="rated">Customer Rated</option>
                    <option value="unrated">Unrated</option>
                  </select>

                  <select
                    value={completedVerificationFilter}
                    onChange={(e) => {
                      setCompletedVerificationFilter(e.target.value);
                      setCompletedPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">All Verifications</option>
                    <option value="otp">OTP Verified Only</option>
                    <option value="manager_override">Manager Override Only</option>
                  </select>

                  <button
                    onClick={loadCompletedDeliveries}
                    className="p-2 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                    title="Refresh Completed Deliveries"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              </div>

              {completedDateRange === 'custom' && (
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-600">From:</span>
                    <input
                      type="date"
                      value={completedStartDate}
                      onChange={(e) => {
                        setCompletedStartDate(e.target.value);
                        setCompletedPage(1);
                      }}
                      className="p-1.5 rounded-lg border border-border bg-slate-50"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-600">To:</span>
                    <input
                      type="date"
                      value={completedEndDate}
                      onChange={(e) => {
                        setCompletedEndDate(e.target.value);
                        setCompletedPage(1);
                      }}
                      className="p-1.5 rounded-lg border border-border bg-slate-50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Completed Deliveries Table */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-border text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">Order # &amp; Date</th>
                      <th className="py-3.5 px-4">Patient / Destination</th>
                      <th className="py-3.5 px-4">Delivered At</th>
                      <th className="py-3.5 px-4">Delivery Partner</th>
                      <th className="py-3.5 px-4">Verification</th>
                      <th className="py-3.5 px-4">Ratings</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {completedLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
                          <span>Loading completed deliveries archive...</span>
                        </td>
                      </tr>
                    ) : completedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <CheckCircle2 size={32} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No completed deliveries found matching filters.</p>
                        </td>
                      </tr>
                    ) : (
                      completedOrders.map((o: any) => {
                        const verifiedMethod = o.deliveryAssignment?.otpVerification?.verificationMethod;
                        const hasDeliveryRating = o.deliveryRating?.rating;
                        const isSupplierDirect = o.items?.some((i: any) => i.sourcingType === 'supplier_direct');

                        return (
                          <tr key={o._id || o.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4">
                              <span className="font-bold text-navy font-mono">{o.orderNumber}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isSupplierDirect
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : 'bg-teal-50 text-teal-700 border border-teal-200'
                                  }`}
                                >
                                  {isSupplierDirect ? 'Supplier Direct' : 'VivoQuest Depot'}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-800 block">{o.patientName}</span>
                              <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                                {o.deliveryAddress?.city}, {o.deliveryAddress?.pincode}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-600">
                              <span className="font-bold text-slate-800 block">
                                {o.deliveryAssignment?.actualDeliveredAt
                                  ? new Date(o.deliveryAssignment.actualDeliveredAt).toLocaleDateString('en-IN')
                                  : new Date(o.updatedAt).toLocaleDateString('en-IN')}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {o.deliveryAssignment?.actualDeliveredAt
                                  ? new Date(o.deliveryAssignment.actualDeliveredAt).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-700 font-medium">
                              {o.deliveryAssignment?.provider?.providerName ||
                                o.providerCoordination?.providerName ||
                                o.deliveryAssignment?.assignedStaffName ||
                                'Logistics Partner'}
                            </td>

                            <td className="py-3 px-4">
                              {verifiedMethod === 'otp' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                                  <ShieldCheck size={12} />
                                  <span>OTP Verified</span>
                                </span>
                              ) : verifiedMethod === 'manager_override' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800">
                                  <FileText size={12} />
                                  <span>Manager Override</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                  <span>Residence Handover</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {hasDeliveryRating ? (
                                <div className="flex items-center gap-1 text-amber-600 font-extrabold text-xs">
                                  <Star size={13} className="fill-amber-400 text-amber-500" />
                                  <span>{o.deliveryRating.rating}★</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Not rated</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setViewCompletedOrderModal(o)}
                                className="px-3 py-1.5 rounded-lg border border-border hover:bg-slate-100 font-bold text-navy text-[11px] transition cursor-pointer"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {completedTotalPages > 1 && (
                <div className="p-3.5 border-t border-border flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Showing {Math.min((completedPage - 1) * 10 + 1, completedTotalCount)} to{' '}
                    {Math.min(completedPage * 10, completedTotalCount)} of {completedTotalCount} completed deliveries
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={completedPage <= 1}
                      onClick={() => setCompletedPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded-lg border border-border bg-slate-50 disabled:opacity-40 hover:bg-slate-100 font-bold cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="font-bold text-navy px-2">
                      Page {completedPage} of {completedTotalPages}
                    </span>
                    <button
                      disabled={completedPage >= completedTotalPages}
                      onClick={() => setCompletedPage((p) => Math.min(completedTotalPages, p + 1))}
                      className="px-3 py-1 rounded-lg border border-border bg-slate-50 disabled:opacity-40 hover:bg-slate-100 font-bold cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            WORKSPACE 3: PRODUCTS & INVENTORY
        ========================================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            
            {/* Sub-Tabs: Stock Catalog vs Customer Reviews vs Damage Reports */}
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <button
                onClick={() => setProductActiveSubTab('catalog')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  productActiveSubTab === 'catalog'
                    ? 'bg-navy text-white'
                    : 'bg-white text-slate-700 border border-border'
                }`}
              >
                Stock Catalog &amp; Conditions
              </button>
              <button
                onClick={() => setProductActiveSubTab('reviews')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  productActiveSubTab === 'reviews'
                    ? 'bg-navy text-white'
                    : 'bg-white text-slate-700 border border-border'
                }`}
              >
                <Star size={13} className="text-amber-500 fill-amber-500" />
                <span>Customer Reviews ({reviews.length})</span>
              </button>
              <button
                onClick={() => setProductActiveSubTab('complaints')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  productActiveSubTab === 'complaints'
                    ? 'bg-navy text-white'
                    : 'bg-white text-slate-700 border border-border'
                }`}
              >
                <ShieldAlert size={13} className="text-rose-500" />
                <span>Damage Reports &amp; Complaints ({complaints.length})</span>
              </button>
            </div>

            {productActiveSubTab === 'catalog' && (
              <div className="space-y-5">
                {/* 1. Authoritative Inventory KPI Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-border shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Active SKUs</span>
                      <Boxes size={16} className="text-teal-600" />
                    </div>
                    <div className="text-2xl font-black text-navy mt-1">
                      {inventorySummaryLoading ? '...' : inventorySummary.totalActiveSkus}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">Tracked in Catalog</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-border shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Physical Units</span>
                      <PackageCheck size={16} className="text-teal-700" />
                    </div>
                    <div className="text-2xl font-black text-navy mt-1">
                      {inventorySummaryLoading ? '...' : inventorySummary.totalOnHandUnits}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">On-Hand in Depot</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-border shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Reserved Units</span>
                      <Clock size={16} className="text-amber-600" />
                    </div>
                    <div className="text-2xl font-black text-amber-700 mt-1">
                      {inventorySummaryLoading ? '...' : inventorySummary.totalReservedUnits}
                    </div>
                    <span className="text-[10px] text-amber-600/80 font-semibold">Pending Checkout / Dispatch</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-teal-200 bg-teal-50/30 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-teal-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Available (ATS)</span>
                      <CheckCircle2 size={16} className="text-teal-600" />
                    </div>
                    <div className="text-2xl font-black text-teal-700 mt-1">
                      {inventorySummaryLoading ? '...' : inventorySummary.totalAvailableUnits}
                    </div>
                    <span className="text-[10px] text-teal-700/80 font-bold">Ready to Sell</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-border shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Low Stock</span>
                      <AlertTriangle size={16} className="text-amber-500" />
                    </div>
                    <div className="text-2xl font-black text-amber-600 mt-1">
                      {inventorySummaryLoading ? '...' : inventorySummary.lowStockCount}
                    </div>
                    <span className="text-[10px] text-amber-600 font-semibold">At or Below Threshold</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-border shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Out of Stock</span>
                      <ShieldAlert size={16} className="text-rose-500" />
                    </div>
                    <div className="text-2xl font-black text-rose-600 mt-1">
                      {inventorySummaryLoading ? '...' : inventorySummary.outOfStockCount}
                    </div>
                    <span className="text-[10px] text-rose-600 font-semibold">ATS = 0</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-border shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Incoming POs</span>
                      <Truck size={16} className="text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-blue-700 mt-1">
                      {inventorySummaryLoading ? '...' : inventorySummary.incomingUnitsFromPOs}
                    </div>
                    <span className="text-[10px] text-blue-600/80 font-semibold">Units in Open POs</span>
                  </div>
                </div>

                {/* 2. Low-Stock & Out-of-Stock Urgent Action Alerts */}
                {(inventorySummary.lowStockCount > 0 || inventorySummary.outOfStockCount > 0) && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                        <span>
                          Inventory Replenishment Alert &mdash; {inventorySummary.lowStockCount} Low-Stock &amp;{' '}
                          {inventorySummary.outOfStockCount} Out-of-Stock SKUs Detected
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-amber-800">
                        Suggested purchase orders calculated from safety thresholds
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {inventoryProducts
                        .filter((p) => p.stockStatus === 'low_stock' || p.stockStatus === 'out_of_stock')
                        .slice(0, 3)
                        .map((lp) => (
                          <div
                            key={`alert-${lp.id || lp._id}`}
                            className="bg-white p-3 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold text-slate-400">{lp.sku}</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                    lp.stockStatus === 'out_of_stock'
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {lp.stockStatus === 'out_of_stock' ? '0 ATS' : `${lp.availableToSell} Left`}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-navy truncate mt-0.5">{lp.title}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Target Qty: {lp.reorderQuantity || 15} | Threshold: {lp.reorderThreshold || 5}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setReorderTargetProduct(lp);
                                setReorderQuantity(lp.suggestedReorderQuantity || lp.reorderQuantity || 15);
                                setReorderUnitCost(lp.procurementCost || 0);
                                setReorderNotes(`Replenishment for ${lp.sku} (${lp.stockStatus})`);
                                setReorderModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] whitespace-nowrap shrink-0 transition shadow-xs cursor-pointer"
                            >
                              Reorder PO
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 3. Toolbar & Filters */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-border shadow-2xs">
                  {/* Search */}
                  <div className="flex-1 relative min-w-[220px]">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search SKU, product title, supplier name..."
                      value={inventorySearch}
                      onChange={(e) => {
                        setInventorySearch(e.target.value);
                        setInventoryPage(1);
                      }}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-border text-xs focus:outline-none focus:border-teal-500 font-medium"
                    />
                  </div>

                  {/* Filters & Sorting */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Sourcing Filter */}
                    <select
                      value={inventorySourcingFilter}
                      onChange={(e) => {
                        setInventorySourcingFilter(e.target.value);
                        setInventoryPage(1);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">All Sourcing Types</option>
                      <option value="own_stock">VivoQuest Depot Stock</option>
                      <option value="supplier_direct">Supplier Direct Fulfillment</option>
                    </select>

                    {/* Stock Status Filter */}
                    <select
                      value={inventoryStockStatusFilter}
                      onChange={(e) => {
                        setInventoryStockStatusFilter(e.target.value);
                        setInventoryPage(1);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">All Stock Levels</option>
                      <option value="in_stock">In Stock (Healthy)</option>
                      <option value="low_stock">Low Stock (At/Below Threshold)</option>
                      <option value="out_of_stock">Out of Stock (ATS = 0)</option>
                      <option value="supplier_confirmation_required">Supplier Confirmation Required</option>
                    </select>

                    {/* Category Filter */}
                    <select
                      value={inventoryCategoryFilter}
                      onChange={(e) => {
                        setInventoryCategoryFilter(e.target.value);
                        setInventoryPage(1);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">All Categories</option>
                      <option value="mobility">Mobility</option>
                      <option value="respiratory">Respiratory</option>
                      <option value="monitoring_diagnostics">Monitoring</option>
                      <option value="fall_prevention">Fall Prevention</option>
                      <option value="icu_home_setup">ICU Setup</option>
                      <option value="wound_care">Wound Care</option>
                      <option value="clinical_nutrition">Nutrition</option>
                    </select>

                    {/* Sort By */}
                    <select
                      value={inventorySortBy}
                      onChange={(e) => {
                        setInventorySortBy(e.target.value);
                        setInventoryPage(1);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="updated_desc">Sort: Last Updated (Newest)</option>
                      <option value="ats_asc">Sort: Available Stock (Low to High)</option>
                      <option value="ats_desc">Sort: Available Stock (High to Low)</option>
                      <option value="stock_desc">Sort: Physical Stock (High to Low)</option>
                      <option value="title_asc">Sort: Product Title (A-Z)</option>
                    </select>

                    {/* Add Product Button */}
                    <button
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm({
                          sku: `MED-${Date.now().toString().slice(-4)}`,
                          title: '',
                          category: 'mobility',
                          description: '',
                          price: 2500,
                          regularPrice: 3000,
                          stockQuantity: 10,
                          sourcingType: 'own_stock',
                          supplierName: '',
                          condition: 'brand_new',
                          conditionNotes: '',
                          images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'],
                          primaryImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
                          installationEligible: false,
                          newImageUrlInput: '',
                        });
                        setProductModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                    >
                      <Plus size={15} />
                      <span>Add Product</span>
                    </button>
                  </div>
                </div>

                {/* 4. Product Stock Table (10 items per page) */}
                <div className="bg-white rounded-2xl border border-border shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-border text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-3.5">SKU &amp; Product</th>
                          <th className="py-3 px-3">Sourcing</th>
                          <th className="py-3 px-2.5 text-center">On-Hand</th>
                          <th className="py-3 px-2.5 text-center">Reserved</th>
                          <th className="py-3 px-3 text-center bg-teal-50/50 text-teal-800">Available (ATS)</th>
                          <th className="py-3 px-2.5 text-center">Reorder Thresh.</th>
                          <th className="py-3 px-2.5 text-center">Incoming POs</th>
                          <th className="py-3 px-3">Supplier &amp; Restock</th>
                          <th className="py-3 px-3">Stock Status</th>
                          <th className="py-3 px-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {inventoryProductsLoading ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center text-slate-400">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <RefreshCw size={20} className="animate-spin text-teal-600" />
                                <span>Loading Authoritative Inventory Catalog...</span>
                              </div>
                            </td>
                          </tr>
                        ) : inventoryProducts.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center text-slate-400">
                              No products matched your search or stock level filters.
                            </td>
                          </tr>
                        ) : (
                          inventoryProducts.map((p) => {
                            const isSupplierDirect = p.sourcingType === 'supplier_direct' || p.sourcingType === 'supplier';
                            const primaryImg = p.images?.[0] || p.primaryImage || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80';
                            return (
                              <tr key={p.id || p._id} className="hover:bg-slate-50/70 transition">
                                {/* 1. SKU & Product */}
                                <td className="py-3 px-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-border">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={primaryImg} alt={p.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0 max-w-[200px]">
                                      <div className="font-mono text-[10px] font-bold text-slate-400">{p.sku}</div>
                                      <div className="font-bold text-navy truncate" title={p.title}>{p.title}</div>
                                      <div className="text-[10px] text-slate-500 capitalize">{p.category?.replace(/_/g, ' ')}</div>
                                    </div>
                                  </div>
                                </td>

                                {/* 2. Sourcing Type */}
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      isSupplierDirect
                                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                        : 'bg-teal-50 text-teal-700 border border-teal-200'
                                    }`}
                                  >
                                    {isSupplierDirect ? 'Supplier Direct' : 'VivoQuest Depot'}
                                  </span>
                                </td>

                                {/* 3. Physical On-Hand Stock */}
                                <td className="py-3 px-2.5 text-center font-bold text-slate-700 whitespace-nowrap">
                                  {p.stockQuantity}
                                </td>

                                {/* 4. Reserved Stock */}
                                <td className="py-3 px-2.5 text-center whitespace-nowrap">
                                  <span className={`font-bold ${p.reservedQuantity > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                                    {p.reservedQuantity || 0}
                                  </span>
                                </td>

                                {/* 5. Available to Sell (ATS) */}
                                <td className="py-3 px-3 text-center whitespace-nowrap bg-teal-50/40 font-black">
                                  <span
                                    className={`text-sm ${
                                      p.availableToSell <= 0
                                        ? 'text-rose-600'
                                        : p.availableToSell <= (p.reorderThreshold || 5)
                                        ? 'text-amber-600'
                                        : 'text-teal-700'
                                    }`}
                                  >
                                    {p.availableToSell}
                                  </span>
                                </td>

                                {/* 6. Reorder Threshold & Preferred Reorder Qty */}
                                <td className="py-3 px-2.5 text-center text-slate-600 whitespace-nowrap">
                                  <span className="font-semibold">{p.reorderThreshold || 5}</span>
                                  <span className="text-[10px] text-slate-400 ml-1">/ {p.reorderQuantity || 15}</span>
                                </td>

                                {/* 7. Incoming Stock from POs */}
                                <td className="py-3 px-2.5 text-center whitespace-nowrap">
                                  {p.incomingPoQuantity > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                                      +{p.incomingPoQuantity} PO
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">&mdash;</span>
                                  )}
                                </td>

                                {/* 8. Supplier & Restock Lead Time */}
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <div className="font-bold text-slate-700 truncate max-w-[130px]">
                                    {p.supplierName}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Lead: {p.supplierLeadTimeDays || 3} days
                                  </div>
                                </td>

                                {/* 9. Stock Status Badge */}
                                <td className="py-3 px-3 whitespace-nowrap">
                                  {p.stockStatus === 'supplier_confirmation_required' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                                      Confirm Supplier
                                    </span>
                                  ) : p.stockStatus === 'out_of_stock' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">
                                      Out of Stock
                                    </span>
                                  ) : p.stockStatus === 'low_stock' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                      Low Stock
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      In Stock
                                    </span>
                                  )}
                                  <div className="text-[9px] text-slate-400 mt-0.5">
                                    {p.lastStockUpdateAt
                                      ? new Date(p.lastStockUpdateAt).toLocaleDateString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                        })
                                      : 'Recently'}
                                  </div>
                                </td>

                                {/* 10. Actions */}
                                <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Adjust Stock Action */}
                                    <button
                                      title="Adjust Physical Stock Count"
                                      onClick={() => {
                                        setAdjustTargetProduct(p);
                                        setAdjustNewQuantity(p.stockQuantity);
                                        setAdjustReason('Physical Cycle Count Reconciliation');
                                        setAdjustMovementType('audit_reconciliation');
                                        setAdjustNotes('');
                                        setAdjustStockModalOpen(true);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-[11px] border border-teal-200 transition cursor-pointer"
                                    >
                                      Adjust Stock
                                    </button>

                                    {/* Reorder PO Action */}
                                    <button
                                      title="Create Restock Purchase Order"
                                      onClick={() => {
                                        setReorderTargetProduct(p);
                                        setReorderQuantity(p.suggestedReorderQuantity || p.reorderQuantity || 15);
                                        setReorderUnitCost(p.procurementCost || 0);
                                        setReorderNotes(`Restock PO for SKU ${p.sku}`);
                                        setReorderModalOpen(true);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px] border border-blue-200 transition cursor-pointer"
                                    >
                                      Reorder PO
                                    </button>

                                    {/* Supplier Confirmation (if supplier direct) */}
                                    {isSupplierDirect && (
                                      <button
                                        title="Confirm Supplier Reported Stock Availability"
                                        onClick={() => {
                                          setSupplierConfirmProduct(p);
                                          setSupplierConfirmStatus(p.supplierAvailabilityStatus || 'confirmed');
                                          setSupplierLeadTimeDays(p.supplierLeadTimeDays || 3);
                                          setSupplierConfirmNotes('');
                                          setSupplierConfirmModalOpen(true);
                                        }}
                                        className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-[11px] border border-purple-200 transition cursor-pointer"
                                      >
                                        Supplier
                                      </button>
                                    )}

                                    {/* Stock Movement History */}
                                    <button
                                      title="View Immutable Stock Movements Audit Trail"
                                      onClick={() => handleOpenMovementsDrawer(p)}
                                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-navy transition cursor-pointer"
                                    >
                                      <FileText size={15} />
                                    </button>

                                    {/* Edit Specs */}
                                    <button
                                      title="Edit Product Details & Specs"
                                      onClick={() => {
                                        setEditingProduct(p);
                                        setProductForm({
                                          sku: p.sku,
                                          title: p.title,
                                          category: p.category,
                                          description: p.description || '',
                                          price: p.price,
                                          regularPrice: p.regularPrice || p.price,
                                          stockQuantity: p.stockQuantity,
                                          sourcingType: p.sourcingType || 'own_stock',
                                          supplierName: p.supplierName || '',
                                          condition: p.condition || 'brand_new',
                                          conditionNotes: p.conditionNotes || '',
                                          images: p.images && p.images.length > 0 ? p.images : [primaryImg],
                                          primaryImage: primaryImg,
                                          installationEligible: p.installationEligible || false,
                                          newImageUrlInput: '',
                                        });
                                        setProductModalOpen(true);
                                      }}
                                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-navy transition cursor-pointer"
                                    >
                                      <Wrench size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Bar (10 products per page) */}
                  <div className="p-3.5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50/50">
                    <span>
                      Showing {inventoryProducts.length > 0 ? (inventoryPage - 1) * 10 + 1 : 0} to{' '}
                      {Math.min(inventoryPage * 10, inventoryTotalCount)} of {inventoryTotalCount} products (10 per page)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={inventoryPage <= 1}
                        onClick={() => setInventoryPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1 rounded-lg border border-border bg-white disabled:opacity-40 hover:bg-slate-100 font-bold cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="font-bold text-navy px-2">
                        Page {inventoryPage} of {inventoryTotalPages}
                      </span>
                      <button
                        disabled={inventoryPage >= inventoryTotalPages}
                        onClick={() => setInventoryPage((p) => Math.min(inventoryTotalPages, p + 1))}
                        className="px-3 py-1 rounded-lg border border-border bg-white disabled:opacity-40 hover:bg-slate-100 font-bold cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Reviews Sub-tab */}
            {productActiveSubTab === 'reviews' && (
              <div className="bg-white rounded-2xl border border-border p-4">
                <h3 className="font-bold text-navy text-sm mb-3">Customer Product Ratings &amp; Experience</h3>
                {reviews.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">No customer reviews recorded yet.</div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r: any) => (
                      <div key={r.id || r._id} className="p-3 rounded-xl bg-slate-50 border border-border text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy">{r.productTitle}</span>
                          <div className="flex items-center text-amber-500">
                            {Array.from({ length: r.rating || 5 }).map((_, i) => (
                              <Star key={i} size={12} className="fill-amber-500" />
                            ))}
                          </div>
                        </div>
                        <div className="text-slate-600 mt-1 italic">&ldquo;{r.comment}&rdquo;</div>
                        <div className="text-[10px] text-slate-400 mt-1">By {r.userName} • Order {r.orderNumber}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Customer Complaints Sub-tab */}
            {productActiveSubTab === 'complaints' && (
              <div className="bg-white rounded-2xl border border-border p-4">
                <h3 className="font-bold text-navy text-sm mb-3">Customer Damage Reports &amp; Quality Complaints</h3>
                {complaints.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">No active complaints recorded.</div>
                ) : (
                  <div className="space-y-3">
                    {complaints.map((c: any) => (
                      <div key={c.id || c._id} className="p-4 rounded-xl bg-slate-50 border border-border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-navy font-mono">{c.complaintNumber}</span>
                            <span className="font-semibold text-slate-700">{c.productTitle}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                              {c.category?.replace(/_/g, ' ')}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700">
                              Status: {c.status}
                            </span>
                          </div>
                          <div className="text-slate-600 mt-1">{c.description}</div>
                          <div className="text-[10px] text-slate-400 mt-1">Reported by {c.userName} ({c.userPhone}) • Order {c.orderNumber}</div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedComplaint(c);
                            setComplaintResolutionNotes(c.resolutionNotes || '');
                            setComplaintResolutionStatus(c.status === 'open' ? 'resolved' : c.status);
                            setComplaintRefundAmount(c.refundAmount || 0);
                            setComplaintModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-navy hover:bg-navy-light text-white font-bold text-xs shrink-0"
                        >
                          Investigate &amp; Resolve
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            WORKSPACE 3: INSTALLATION & MAINTENANCE
        ========================================================================= */}
        {activeTab === 'installation' && (
          <div className="space-y-6">
            
            {/* Clinical Setup Orders Queue */}
            <div className="bg-white rounded-2xl border border-border p-4 shadow-2xs">
              <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2">
                <Wrench size={16} className="text-teal-600" />
                <span>Clinical Equipment Setup &amp; In-Home Installation Queue</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-border text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Order #</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Installation Status</th>
                      <th className="py-2.5 px-3">Assigned Technician</th>
                      <th className="py-2.5 px-3">Setup Date</th>
                      <th className="py-2.5 px-3">Actual Cost</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders
                      .filter((o) => o.clinicalSetup?.isSetupRequired)
                      .map((o) => (
                        <tr key={o.id || o._id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-mono font-bold text-navy">{o.orderNumber}</td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{o.patientName}</div>
                            <div className="text-[10px] text-slate-500">{o.patientPhone}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                o.clinicalSetup?.setupStatus === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {o.clinicalSetup?.setupStatus || 'Pending'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {o.clinicalSetup?.assignedSpecialistName || <span className="text-slate-400 italic">Unassigned</span>}
                          </td>
                          <td className="py-3 px-3">
                            {o.clinicalSetup?.setupDate ? new Date(o.clinicalSetup.setupDate).toLocaleDateString('en-IN') : 'TBD'}
                          </td>
                          <td className="py-3 px-3 font-bold text-navy">
                            ₹{o.clinicalSetup?.costBreakdown?.actualTotalCost || 0}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(o);
                                setInstallationStatus(o.clinicalSetup?.setupStatus || 'scheduled');
                                setInstallationSpecialistId(o.clinicalSetup?.assignedSpecialistId || '');
                                setInstallationDate(
                                  o.clinicalSetup?.setupDate
                                    ? new Date(o.clinicalSetup.setupDate).toISOString().slice(0, 10)
                                    : new Date().toISOString().slice(0, 10)
                                );
                                setInstallationSlot(o.clinicalSetup?.timeSlot || '10:00 AM - 12:00 PM');
                                setInstallationNotes(o.clinicalSetup?.setupNotes || '');
                                setInstallationSupportingDoc(o.clinicalSetup?.supportingDocUrl || 'https://clinical-docs.vivoquest.in/proof_placeholder.jpg');
                                setInstallationHandoverConfirmed(o.clinicalSetup?.customerConfirmationConfirmed || false);
                                if (o.clinicalSetup?.costBreakdown) {
                                  setCostBreakdown(o.clinicalSetup.costBreakdown);
                                }
                                setInstallationModalOpen(true);
                              }}
                              className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                            >
                              Setup &amp; Costing
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Maintenance Tickets Queue */}
            <div className="bg-white rounded-2xl border border-border p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                  <ShieldCheck size={16} className="text-purple-600" />
                  <span>Biomedical Engineering &amp; Preventive Maintenance</span>
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-border text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Ticket #</th>
                      <th className="py-2.5 px-3">Patient &amp; Issue</th>
                      <th className="py-2.5 px-3">Urgency</th>
                      <th className="py-2.5 px-3">Technician</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {maintenanceTickets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No open biomedical maintenance tickets.
                        </td>
                      </tr>
                    ) : (
                      maintenanceTickets.map((t) => (
                        <tr key={t.id || t._id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-mono font-bold text-navy">{t.ticketNumber}</td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{t.patientName}</div>
                            <div className="text-[10px] text-slate-500">{t.reportedIssue}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700">
                              {t.urgency}
                            </span>
                          </td>
                          <td className="py-3 px-3">{t.assignedStaffName || 'Unassigned'}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-50 text-teal-700">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            WORKSPACE 4: RETURNS & COMPLAINTS
        ========================================================================= */}
        {activeTab === 'returns' && (
          <div className="space-y-6">
            
            {/* Returns Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-border shadow-2xs">
              <div className="flex-1 relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by order #, patient name, return ID..."
                  value={returnsSearch}
                  onChange={(e) => setReturnsSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-border text-xs focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>

              <select
                value={returnsFilter}
                onChange={(e) => setReturnsFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700"
              >
                <option value="all">All Return Statuses</option>
                <option value="requested">Requested by Patient</option>
                <option value="approved">Approved (Staging Pickup)</option>
                <option value="pickup_scheduled">Pickup Scheduled</option>
                <option value="received_for_inspection">Received for Technical Inspection</option>
                <option value="resolution_pending">Resolution Pending</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Returns List */}
            <div className="bg-white rounded-2xl border border-border p-4 shadow-2xs">
              <h3 className="font-bold text-navy text-sm mb-3 flex items-center gap-2">
                <RotateCcw size={16} className="text-teal-600" />
                <span>Returns Lifecycle &amp; Reverse Logistics Bay</span>
              </h3>

              {returnsLoading ? (
                <div className="py-12 text-center text-slate-400">Loading returns...</div>
              ) : returns.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No return requests found.</div>
              ) : (
                <div className="space-y-3">
                  {returns.map((ret: any) => (
                    <div
                      key={ret.orderId}
                      className="p-4 rounded-xl bg-slate-50 border border-border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-navy">{ret.orderNumber}</span>
                          <span className="font-semibold text-slate-700">{ret.patientName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200">
                            {ret.returnDetails?.returnStatus || 'Requested'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          Reason: &ldquo;{ret.returnDetails?.returnReason || 'Customer requested return'}&rdquo;
                        </div>
                        {ret.returnDetails?.pickup?.scheduledDate && (
                          <div className="text-[10px] text-teal-700 mt-0.5">
                            Pickup Assigned: {new Date(ret.returnDetails.pickup.scheduledDate).toLocaleDateString('en-IN')} ({ret.returnDetails.pickup.assignedStaffName})
                          </div>
                        )}
                        {ret.returnDetails?.inspection?.result && (
                          <div className="text-[10px] text-purple-700 mt-0.5 font-bold">
                            Inspection Result: {ret.returnDetails.inspection.result.replace(/_/g, ' ').toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Step 1: Review */}
                        {ret.returnDetails?.returnStatus === 'requested' && (
                          <button
                            onClick={() => {
                              setSelectedReturn(ret);
                              setReturnActionType('review');
                              setReturnReviewAction('approve');
                              setReturnModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                          >
                            Review &amp; Approve
                          </button>
                        )}

                        {/* Step 2: Schedule Pickup */}
                        {(ret.returnDetails?.returnStatus === 'approved' || !ret.returnDetails?.pickup?.scheduledDate) && (
                          <button
                            onClick={() => {
                              setSelectedReturn(ret);
                              setReturnActionType('schedule_pickup');
                              setReturnPickupDate(new Date().toISOString().slice(0, 10));
                              setReturnPickupStaffId(staffList[0]?._id || '');
                              setReturnModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                          >
                            Assign Pickup
                          </button>
                        )}

                        {/* Step 3: Record Handover */}
                        {ret.returnDetails?.returnStatus === 'pickup_scheduled' && (
                          <button
                            onClick={() => {
                              setSelectedReturn(ret);
                              setReturnActionType('pickup_outcome');
                              setReturnPickupProofUrl('https://reverse-logistics.vivoquest.in/pickup_proof.jpg');
                              setReturnModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                          >
                            Record Handover
                          </button>
                        )}

                        {/* Step 4: Technical Inspection */}
                        {ret.returnDetails?.returnStatus === 'received_for_inspection' && (
                          <button
                            onClick={() => {
                              setSelectedReturn(ret);
                              setReturnActionType('inspection');
                              setReturnInspectionResult('intact_healthy');
                              setReturnInspectionNotes('');
                              setReturnModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                          >
                            Perform Inspection
                          </button>
                        )}

                        {/* Step 5: Final Resolution */}
                        {ret.returnDetails?.returnStatus === 'resolution_pending' && (
                          <button
                            onClick={() => {
                              setSelectedReturn(ret);
                              setReturnActionType('resolution');
                              setReturnResolutionType('replacement');
                              setReturnRefundAmount(ret.orderTotal || 0);
                              setReturnModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                          >
                            Finalize Resolution
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* =========================================================================
          MODALS & DRAWERS
      ========================================================================= */}

      {/* 1. Manage Delivery & Dispatch Modal */}
      {orderModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-navy text-sm">Manage Dispatch &amp; Milestone</h3>
                <span className="font-mono text-xs text-slate-500">Order {selectedOrder.orderNumber}</span>
              </div>
              <button onClick={() => setOrderModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* Delivery Provider Coordination Card */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-border flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Logistics Partner</span>
                <span className="font-bold text-navy flex items-center gap-1.5 mt-0.5">
                  <Truck size={14} className="text-teal-600" />
                  <span>
                    {selectedOrder.providerCoordination?.providerName ||
                      selectedOrder.deliveryAssignment?.provider?.providerName ||
                      'No Provider Assigned Yet'}
                  </span>
                </span>
                {(selectedOrder.providerCoordination?.contactPhone || selectedOrder.deliveryAssignment?.provider?.contactPhone) && (
                  <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                    {selectedOrder.providerCoordination?.deliveryPersonName ? `${selectedOrder.providerCoordination.deliveryPersonName} • ` : ''}
                    {selectedOrder.providerCoordination?.contactPhone || selectedOrder.deliveryAssignment?.provider?.contactPhone}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {(selectedOrder.providerCoordination?.providerName || selectedOrder.deliveryAssignment?.provider?.providerName) && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderModalOpen(false);
                      openWhatsAppModal(selectedOrder);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                  >
                    <MessageSquare size={12} />
                    <span>WhatsApp</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOrderModalOpen(false);
                    openCoordinateProviderModal(selectedOrder);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold text-[11px] cursor-pointer transition"
                >
                  {selectedOrder.providerCoordination?.providerName || selectedOrder.deliveryAssignment?.provider?.providerName ? 'Edit Provider' : 'Select Provider'}
                </button>
              </div>
            </div>

            {workflowStatus === 'delivered' ? (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <span>Flipkart-Style Secure Delivery OTP Verification</span>
                    </span>
                    <button
                      type="button"
                      disabled={otpRequestLoading || otpCooldownTimer > 0}
                      onClick={handleRequestOtp}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] disabled:opacity-50 cursor-pointer"
                    >
                      {otpRequestLoading
                        ? 'Sending...'
                        : otpCooldownTimer > 0
                        ? `Resend in ${otpCooldownTimer}s`
                        : 'Send OTP to Customer'}
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    A single-use 6-digit OTP will be dispatched to the customer's phone ({selectedOrder.patientPhone ? `+91 ******${selectedOrder.patientPhone.slice(-4)}` : 'on file'}). Ask the customer for the code upon physical package handover.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtpSubmit} className="space-y-3">
                  <div>
                    <label className="font-bold text-navy block mb-1">Enter 6-Digit Delivery OTP *</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 482915"
                      value={deliveryOtpCode}
                      onChange={(e) => setDeliveryOtpCode(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-border font-mono text-center text-lg tracking-widest font-black text-navy outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-navy block mb-1">Recipient Name</label>
                      <input
                        type="text"
                        placeholder={selectedOrder.patientName}
                        value={otpRecipientName}
                        onChange={(e) => setOtpRecipientName(e.target.value)}
                        className="w-full p-2 rounded-xl border border-border"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-navy block mb-1">Relationship</label>
                      <select
                        value={otpRecipientRel}
                        onChange={(e) => setOtpRecipientRel(e.target.value)}
                        className="w-full p-2 rounded-xl border border-border"
                      >
                        <option value="Self">Self (Patient)</option>
                        <option value="Family Member">Family Member</option>
                        <option value="Caregiver">Caregiver / Nurse</option>
                        <option value="Other">Other Representative</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-navy block mb-1">Package Condition</label>
                    <select
                      value={otpCondition}
                      onChange={(e) => setOtpCondition(e.target.value)}
                      className="w-full p-2 rounded-xl border border-border"
                    >
                      <option value="good_condition">Intact &amp; Good Condition</option>
                      <option value="seal_verified">Tamper-Proof Seal Verified</option>
                      <option value="box_damaged">Packaging Dented / Reported</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-navy block mb-1">Proof of Delivery URL (Optional)</label>
                    <input
                      type="text"
                      value={workflowProofUrl}
                      onChange={(e) => setWorkflowProofUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2 rounded-xl bg-slate-50 border border-border font-mono text-[11px]"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-border">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={otpCustomerAck}
                        onChange={(e) => setOtpCustomerAck(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Customer inspected package and acknowledged receipt</span>
                    </label>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    {['operations_manager', 'admin', 'super_admin'].includes(currentUser?.role) && (
                      <button
                        type="button"
                        onClick={() => setIsManagerOverrideOpen(!isManagerOverrideOpen)}
                        className="text-amber-700 hover:underline font-bold text-[11px] cursor-pointer"
                      >
                        {isManagerOverrideOpen ? 'Close Override Form' : 'Customer Phone Dead? (Manager Override)'}
                      </button>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setOrderModalOpen(false)}
                        className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={otpVerifyLoading || deliveryOtpCode.length !== 6}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {otpVerifyLoading ? 'Verifying OTP...' : 'Verify OTP & Complete Delivery'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Manager Override Form */}
                {isManagerOverrideOpen && ['operations_manager', 'admin', 'super_admin'].includes(currentUser?.role) && (
                  <form onSubmit={handleManagerOverrideSubmit} className="p-3.5 bg-amber-50 rounded-2xl border border-amber-300 space-y-3 mt-3">
                    <span className="font-bold text-amber-900 block text-xs flex items-center gap-1.5">
                      <AlertTriangle size={15} className="text-amber-600" />
                      <span>Authorized Operations Manager Delivery Override</span>
                    </span>
                    <p className="text-[11px] text-amber-800">
                      Used only when customer phone is unavailable or malfunctioning. Physical government ID verification and full audit trail are mandatory.
                    </p>

                    <div>
                      <label className="font-bold text-amber-950 block mb-1">Reason for Bypassing OTP *</label>
                      <input
                        type="text"
                        required
                        minLength={10}
                        placeholder="e.g. Patient phone dead; in-person Aadhaar verified at residence"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="w-full p-2 rounded-xl border border-amber-300 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-amber-950 block mb-1">Identity Document *</label>
                        <select
                          value={overrideDocType}
                          onChange={(e) => setOverrideDocType(e.target.value)}
                          className="w-full p-2 rounded-xl border border-amber-300 bg-white"
                        >
                          <option value="aadhaar">Aadhaar Card</option>
                          <option value="driving_license">Driving License</option>
                          <option value="voter_id">Voter ID</option>
                          <option value="passport">Passport</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-amber-950 block mb-1">ID Last 4 Digits</label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="e.g. 5182"
                          value={overrideDocLast4}
                          onChange={(e) => setOverrideDocLast4(e.target.value)}
                          className="w-full p-2 rounded-xl border border-amber-300 bg-white"
                        >
                        </input>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={otpVerifyLoading || overrideReason.trim().length < 10}
                      className="w-full py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      {otpVerifyLoading ? 'Processing Override...' : 'Confirm Manager Override & Complete Delivery'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
            <form onSubmit={handleWorkflowSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-navy block mb-1">Target Milestone Status</label>
                <select
                  value={workflowStatus}
                  onChange={(e) => setWorkflowStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="ready_for_dispatch">Ready for Dispatch (Staged)</option>
                  <option value="dispatched">Dispatched from Hub</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered Successfully</option>
                  <option value="delivery_attempt_failed">Delivery Attempt Failed</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Operational Notes / Milestone Details</label>
                <textarea
                  rows={2}
                  value={workflowNotes}
                  onChange={(e) => setWorkflowNotes(e.target.value)}
                  placeholder="e.g. Package loaded into Pune West route van"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border"
                />
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Proof of Delivery URL (Optional)</label>
                <input
                  type="text"
                  value={workflowProofUrl}
                  onChange={(e) => setWorkflowProofUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 rounded-xl bg-slate-50 border border-border font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={workflowSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {workflowSubmitting ? 'Saving...' : 'Update Milestone'}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* 2. Flag Delay Modal */}
      {delayModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-navy text-sm">Flag Order Delivery Delay</h3>
              <button onClick={() => setDelayModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFlagDelaySubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-navy block mb-1">Mandatory Delay Reason</label>
                <select
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700"
                >
                  <option value="">Select reason...</option>
                  <option value="Severe weather / monsoon road obstruction">Severe weather / road obstruction</option>
                  <option value="Biomedical recalibration and quality validation in depot">Biomedical recalibration in depot</option>
                  <option value="Customer requested alternate delivery timing">Customer requested alternate timing</option>
                  <option value="Supplier component delayed in transit">Supplier component delayed in transit</option>
                  <option value="Address verification / access restrictions">Address verification / access restrictions</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Revised Estimated Delivery Date</label>
                <input
                  type="date"
                  value={delayDate}
                  onChange={(e) => setDelayDate(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border"
                />
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={delayNotes}
                  onChange={(e) => setDelayNotes(e.target.value)}
                  placeholder="Notes for logistics logs"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border"
                />
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDelayModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={delaySubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  {delaySubmitting ? 'Flagging...' : 'Confirm & Notify Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Reschedule Review Modal */}
      {rescheduleModalOpen && selectedReschedule && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-navy text-sm">Review Patient Reschedule Request</h3>
              <button onClick={() => setRescheduleModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-border">
                <div className="text-slate-500 font-bold text-[11px]">Requested Delivery Date:</div>
                <div className="text-navy font-black text-sm">
                  {new Date(selectedReschedule.requestedDate).toLocaleDateString('en-IN')} ({selectedReschedule.timeSlot})
                </div>
                <div className="text-slate-600 mt-1 italic">&ldquo;{selectedReschedule.reason}&rdquo;</div>
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Operations Decision</label>
                <select
                  value={rescheduleAction}
                  onChange={(e: any) => setRescheduleAction(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700"
                >
                  <option value="approve">Approve Requested Date &amp; Slot</option>
                  <option value="propose_alternative">Propose Alternative Time Window</option>
                  <option value="reject">Decline / Cancel Reschedule</option>
                </select>
              </div>

              {rescheduleAction === 'propose_alternative' && (
                <>
                  <div>
                    <label className="font-bold text-navy block mb-1">Alternative Offered Date</label>
                    <input
                      type="date"
                      value={rescheduleAltDate}
                      onChange={(e) => setRescheduleAltDate(e.target.value)}
                      required
                      className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-navy block mb-1">Alternative Slot</label>
                    <input
                      type="text"
                      value={rescheduleAltSlot}
                      onChange={(e) => setRescheduleAltSlot(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="font-bold text-navy block mb-1">Review Notes / Response</label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Notes sent to patient tracking"
                  className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                />
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {rescheduleSubmitting ? 'Saving...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Contribution Margin Profitability Drawer */}
      {profitabilityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-navy text-sm">Order Financial Contribution Margin</h3>
                <span className="font-mono text-xs text-slate-500">
                  {profitabilityData?.orderNumber || selectedOrder?.orderNumber}
                </span>
              </div>
              <button onClick={() => setProfitabilityModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {profitabilityLoading ? (
              <div className="py-12 text-center text-slate-400">Computing real-time margin breakdown...</div>
            ) : profitabilityData ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-border">
                  <span className="font-bold text-slate-600">Reconciliation Status:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      profitabilityData.isReconciled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {profitabilityData.statusLabel}
                  </span>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <div className="font-bold text-navy uppercase tracking-wider text-[11px]">Gross Inflow</div>
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{profitabilityData.inflow?.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee:</span>
                    <span>₹{profitabilityData.inflow?.deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Installation Charge:</span>
                    <span>₹{profitabilityData.inflow?.installationCharge}</span>
                  </div>
                  <div className="flex justify-between font-bold text-navy pt-1 border-t border-slate-100">
                    <span>Total Customer Inflow:</span>
                    <span>₹{profitabilityData.inflow?.grossInflow}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <div className="font-bold text-navy uppercase tracking-wider text-[11px]">Direct Operational Costs</div>
                  <div className="flex justify-between text-slate-600">
                    <span>Procurement COGS:</span>
                    <span>₹{profitabilityData.directCosts?.procurementCostTotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Actual Installation Cost:</span>
                    <span>₹{profitabilityData.directCosts?.actualInstallationCost}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Payment Gateway Fee (~2%):</span>
                    <span>₹{profitabilityData.directCosts?.gatewayFee}</span>
                  </div>
                  <div className="flex justify-between font-bold text-navy pt-1 border-t border-slate-100">
                    <span>Total Direct Costs:</span>
                    <span>₹{profitabilityData.directCosts?.totalDirectCosts}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-teal-900 text-xs">Net Contribution Margin</div>
                    <div className="text-[10px] text-teal-700">Gross Inflow minus Direct COGS &amp; Delivery</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-teal-900">
                      ₹{profitabilityData.profitability?.contributionMargin}
                    </div>
                    <div className="text-xs font-bold text-teal-800">
                      {profitabilityData.profitability?.marginPercentage}%
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 5. Clinical Installation & Safety Checklist Modal */}
      {installationModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-navy text-sm">Clinical Equipment Setup &amp; Costing</h3>
                <span className="font-mono text-xs text-slate-500">Order {selectedOrder.orderNumber}</span>
              </div>
              <button onClick={() => setInstallationModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInstallationSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-navy block mb-1">Assigned Biomedical Specialist</label>
                <select
                  value={installationSpecialistId}
                  onChange={(e) => setInstallationSpecialistId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700"
                >
                  <option value="">Select clinician / technician...</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.fullName} ({s.role?.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-navy block mb-1">Scheduled Setup Date</label>
                  <input
                    type="date"
                    value={installationDate}
                    onChange={(e) => setInstallationDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                  />
                </div>
                <div>
                  <label className="font-bold text-navy block mb-1">Target Status</label>
                  <select
                    value={installationStatus}
                    onChange={(e) => setInstallationStatus(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed (Requires Verification)</option>
                    <option value="rescheduled">Rescheduled</option>
                  </select>
                </div>
              </div>

              {/* 4-Part Costing Breakdown */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-border space-y-2">
                <div className="font-bold text-navy text-[11px] uppercase tracking-wider">
                  Actual Installation Cost Breakdown (₹)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block">Labour Cost (₹)</label>
                    <input
                      type="number"
                      value={costBreakdown.labourCost}
                      onChange={(e) => setCostBreakdown({ ...costBreakdown, labourCost: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg bg-white border border-border"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block">Transport Cost (₹)</label>
                    <input
                      type="number"
                      value={costBreakdown.transportCost}
                      onChange={(e) => setCostBreakdown({ ...costBreakdown, transportCost: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg bg-white border border-border"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block">Parts / Consumables (₹)</label>
                    <input
                      type="number"
                      value={costBreakdown.partsCost}
                      onChange={(e) => setCostBreakdown({ ...costBreakdown, partsCost: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg bg-white border border-border"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block">Other Approved (₹)</label>
                    <input
                      type="number"
                      value={costBreakdown.otherApprovedCharges}
                      onChange={(e) => setCostBreakdown({ ...costBreakdown, otherApprovedCharges: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg bg-white border border-border"
                    />
                  </div>
                </div>
                <div className="flex justify-between font-bold text-navy pt-2 border-t border-slate-200">
                  <span>Actual Total Cost:</span>
                  <span>
                    ₹{costBreakdown.labourCost + costBreakdown.transportCost + costBreakdown.partsCost + costBreakdown.otherApprovedCharges}
                  </span>
                </div>
              </div>

              {/* Safety Checklist Validation */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-border space-y-2">
                <div className="font-bold text-navy text-[11px] uppercase tracking-wider">
                  Mandatory Clinical Safety Checklist
                </div>
                {installationChecklist.map((item, idx) => (
                  <label key={idx} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => {
                        const next = [...installationChecklist];
                        next[idx].checked = e.target.checked;
                        setInstallationChecklist(next);
                      }}
                      className="mt-0.5"
                    />
                    <span className="text-slate-700 leading-snug">{item.item}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Supporting Calibration / Report Document URL</label>
                <input
                  type="text"
                  value={installationSupportingDoc}
                  onChange={(e) => setInstallationSupportingDoc(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-border font-mono text-[11px]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-teal-50/70 border border-teal-200">
                <input
                  type="checkbox"
                  checked={installationHandoverConfirmed}
                  onChange={(e) => setInstallationHandoverConfirmed(e.target.checked)}
                />
                <span className="font-bold text-teal-900">
                  Customer &amp; Clinical Lead signed in-person handover confirmation
                </span>
              </label>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInstallationModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={installationSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {installationSubmitting ? 'Saving...' : 'Save Installation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Product Add / Edit Modal with Multi-Image */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-navy text-sm">
                {editingProduct ? 'Edit Product Specs & Imagery' : 'Add New Medical Equipment Product'}
              </h3>
              <button onClick={() => setProductModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-navy block mb-1">SKU</label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    required
                    className="w-full p-2 rounded-xl bg-slate-50 border border-border font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-navy block mb-1">Equipment Condition</label>
                  <select
                    value={productForm.condition}
                    onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700"
                  >
                    <option value="brand_new">Brand New</option>
                    <option value="clinical_refurbished">Clinical Refurbished</option>
                    <option value="demo_unit">Demo Unit</option>
                    <option value="certified_preowned">Certified Pre-owned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Product Title</label>
                <input
                  type="text"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  required
                  className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-navy block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    required
                    className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                  />
                </div>
                <div>
                  <label className="font-bold text-navy block mb-1">Regular Price (₹)</label>
                  <input
                    type="number"
                    value={productForm.regularPrice}
                    onChange={(e) => setProductForm({ ...productForm, regularPrice: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                  />
                </div>
                <div>
                  <label className="font-bold text-navy block mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={productForm.stockQuantity}
                    onChange={(e) => setProductForm({ ...productForm, stockQuantity: Number(e.target.value) })}
                    required
                    className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-navy block mb-1">Sourcing Type</label>
                  <select
                    value={productForm.sourcingType}
                    onChange={(e) => setProductForm({ ...productForm, sourcingType: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700"
                  >
                    <option value="own_stock">VivoQuest Depot Inventory</option>
                    <option value="supplier_direct">Supplier Direct Vendor</option>
                  </select>
                </div>
                {productForm.sourcingType === 'supplier_direct' && (
                  <div>
                    <label className="font-bold text-navy block mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={productForm.supplierName}
                      onChange={(e) => setProductForm({ ...productForm, supplierName: e.target.value })}
                      placeholder="e.g. Apex Medical Supply"
                      className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                    />
                  </div>
                )}
              </div>

              {/* Multi-Image Management */}
              <div>
                <label className="font-bold text-navy block mb-1">Product Images ({productForm.images.length})</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Enter image URL..."
                    value={productForm.newImageUrlInput}
                    onChange={(e) => setProductForm({ ...productForm, newImageUrlInput: e.target.value })}
                    className="flex-1 p-2 rounded-xl bg-slate-50 border border-border font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!productForm.newImageUrlInput) return;
                      setProductForm({
                        ...productForm,
                        images: [...productForm.images, productForm.newImageUrlInput],
                        newImageUrlInput: '',
                      });
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy font-bold"
                  >
                    Add Image
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {productForm.images.map((img, idx) => (
                    <div
                      key={idx}
                      className={`relative h-16 rounded-lg overflow-hidden border ${
                        productForm.primaryImage === img ? 'border-teal-500 ring-2 ring-teal-200' : 'border-border'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProductForm({ ...productForm, primaryImage: img })}
                        className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] py-0.5 text-center font-bold"
                      >
                        {productForm.primaryImage === img ? 'Primary' : 'Make Primary'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={productSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {productSubmitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Returns Workflow Action Modal */}
      {returnModalOpen && selectedReturn && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-navy text-sm">
                Reverse Logistics Action: {returnActionType.replace(/_/g, ' ').toUpperCase()}
              </h3>
              <button onClick={() => setReturnModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReturnActionSubmit} className="space-y-3 text-xs">
              {/* Review */}
              {returnActionType === 'review' && (
                <>
                  <div>
                    <label className="font-bold text-navy block mb-1">Return Decision</label>
                    <select
                      value={returnReviewAction}
                      onChange={(e: any) => setReturnReviewAction(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700"
                    >
                      <option value="approve">Approve Doorstep Inspection &amp; Pickup</option>
                      <option value="reject">Reject (Outside Return Window / Policy)</option>
                    </select>
                  </div>
                  {returnReviewAction === 'reject' && (
                    <div>
                      <label className="font-bold text-navy block mb-1">Rejection Reason</label>
                      <input
                        type="text"
                        value={returnRejectionReason}
                        onChange={(e) => setReturnRejectionReason(e.target.value)}
                        placeholder="e.g. Hygiene seal broken on non-returnable equipment"
                        className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Schedule Pickup */}
              {returnActionType === 'schedule_pickup' && (
                <>
                  <div>
                    <label className="font-bold text-navy block mb-1">Pickup Date</label>
                    <input
                      type="date"
                      value={returnPickupDate}
                      onChange={(e) => setReturnPickupDate(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-border"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-navy block mb-1">Assigned Logistics Driver</label>
                    <select
                      value={returnPickupStaffId}
                      onChange={(e) => setReturnPickupStaffId(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700"
                    >
                      {staffList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.fullName} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Technical Inspection */}
              {returnActionType === 'inspection' && (
                <>
                  <div>
                    <label className="font-bold text-navy block mb-1">Inspection Finding</label>
                    <select
                      value={returnInspectionResult}
                      onChange={(e: any) => setReturnInspectionResult(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700"
                    >
                      <option value="intact_healthy">Device Intact &amp; Restockable</option>
                      <option value="manufacturing_defect">Manufacturing Defect (Supplier Claim)</option>
                      <option value="customer_damaged">Customer Physical Damage (Non-refundable)</option>
                      <option value="missing_accessories">Missing Power Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-navy block mb-1">Diagnostic Notes</label>
                    <textarea
                      rows={2}
                      value={returnInspectionNotes}
                      onChange={(e) => setReturnInspectionNotes(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                    />
                  </div>
                </>
              )}

              {/* Resolution */}
              {returnActionType === 'resolution' && (
                <>
                  <div>
                    <label className="font-bold text-navy block mb-1">Final Resolution</label>
                    <select
                      value={returnResolutionType}
                      onChange={(e: any) => setReturnResolutionType(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700"
                    >
                      <option value="replacement">Dispatch Replacement Device</option>
                      <option value="refund">Issue Refund Amount</option>
                      <option value="repair">Biomedical Repair &amp; Return</option>
                      <option value="rejected_no_action">Close Without Refund</option>
                    </select>
                  </div>
                  {returnResolutionType === 'refund' && (
                    <div>
                      <label className="font-bold text-navy block mb-1">Refund Amount (₹)</label>
                      <input
                        type="number"
                        value={returnRefundAmount}
                        onChange={(e) => setReturnRefundAmount(Number(e.target.value))}
                        className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {returnSubmitting ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completed Order Details Modal */}
      {viewCompletedOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-navy text-base">Completed Delivery Summary</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                    Delivered
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-500 font-bold">
                  Order #{viewCompletedOrderModal.orderNumber}
                </span>
              </div>
              <button
                onClick={() => setViewCompletedOrderModal(null)}
                className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-border">
              <div>
                <span className="text-slate-500 font-bold block mb-1">Customer / Recipient</span>
                <span className="font-extrabold text-navy block text-sm">{viewCompletedOrderModal.patientName}</span>
                <span className="text-slate-600 block">{viewCompletedOrderModal.patientPhone}</span>
                <span className="text-slate-500 block mt-1">
                  {viewCompletedOrderModal.deliveryAddress?.street}, {viewCompletedOrderModal.deliveryAddress?.city} - {viewCompletedOrderModal.deliveryAddress?.pincode}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Delivery Verification Proof</span>
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-500">Method: </span>
                    <strong className="text-navy uppercase font-mono">
                      {viewCompletedOrderModal.deliveryAssignment?.otpVerification?.verificationMethod || 'Standard Handover'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Recipient Handover: </span>
                    <strong className="text-navy">
                      {viewCompletedOrderModal.deliveryAssignment?.otpVerification?.recipientName || viewCompletedOrderModal.patientName}{' '}
                      ({viewCompletedOrderModal.deliveryAssignment?.otpVerification?.recipientRelationship || 'Self'})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Package Condition: </span>
                    <strong className="text-emerald-700 capitalize">
                      {(viewCompletedOrderModal.deliveryAssignment?.otpVerification?.deliveryCondition || 'good_condition').replace('_', ' ')}
                    </strong>
                  </div>
                  {viewCompletedOrderModal.deliveryAssignment?.otpVerification?.overrideReason && (
                    <div className="text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                      <strong>Manager Override Reason:</strong>{' '}
                      {viewCompletedOrderModal.deliveryAssignment.otpVerification.overrideReason}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {viewCompletedOrderModal.deliveryRating && (
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                  <Star size={14} className="fill-amber-400 text-amber-500" />
                  <span>Customer Delivery Experience Rating: {viewCompletedOrderModal.deliveryRating.rating} / 5 Stars</span>
                </span>
                {viewCompletedOrderModal.deliveryRating.feedback && (
                  <p className="text-slate-700 italic pl-5">
                    "{viewCompletedOrderModal.deliveryRating.feedback}"
                  </p>
                )}
              </div>
            )}

            <div>
              <span className="font-bold text-navy text-xs block mb-2">Delivered Medical Products</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {viewCompletedOrderModal.items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-border flex items-center justify-between text-xs bg-white"
                  >
                    <div>
                      <span className="font-bold text-navy">{item.title}</span>
                      <span className="text-slate-400 text-[11px] block font-mono">{item.sku}</span>
                    </div>
                    <span className="font-extrabold text-navy">Qty: {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="font-bold text-navy text-xs block mb-2">Immutable Delivery Audit Events</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {viewCompletedOrderModal.trackingUpdates?.map((t: any, idx: number) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between">
                      <strong className="text-navy uppercase">{t.status}</strong>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(t.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-slate-600">{t.message}</p>
                    {t.staffName && (
                      <span className="text-[10px] text-teal-700 font-semibold block">By: {t.staffName}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewCompletedOrderModal(null)}
                className="px-4 py-2 rounded-xl bg-navy text-white text-xs font-bold hover:bg-navy-dark transition cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Resolve Complaint Modal */}
      {complaintModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-navy text-sm">Investigate Customer Complaint</h3>
              <button onClick={() => setComplaintModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleComplaintResolveSubmit} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-border">
                <div className="font-bold text-navy">{selectedComplaint.productTitle}</div>
                <div className="text-slate-600 mt-1 italic">&ldquo;{selectedComplaint.description}&rdquo;</div>
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Resolution Status</label>
                <select
                  value={complaintResolutionStatus}
                  onChange={(e: any) => setComplaintResolutionStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700"
                >
                  <option value="resolved">Resolved &amp; Closed</option>
                  <option value="rejected">Rejected (Not Found)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Investigation Notes &amp; Remediation</label>
                <textarea
                  rows={3}
                  value={complaintResolutionNotes}
                  onChange={(e) => setComplaintResolutionNotes(e.target.value)}
                  required
                  placeholder="Explain findings and resolution taken..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border"
                />
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Approved Refund Amount (₹, optional)</label>
                <input
                  type="number"
                  value={complaintRefundAmount}
                  onChange={(e) => setComplaintRefundAmount(Number(e.target.value))}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-border"
                />
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setComplaintModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={complaintSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {complaintSubmitting ? 'Saving...' : 'Save Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PHASE 16 INVENTORY MODALS & AUDIT DRAWERS
      ========================================================================= */}

      {/* 1. Dedicated Auditable Stock Adjustment Modal */}
      {adjustStockModalOpen && adjustTargetProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-navy text-sm">Auditable Physical Stock Adjustment</h3>
                <span className="font-mono text-xs text-slate-500">
                  {adjustTargetProduct.sku} &mdash; {adjustTargetProduct.title}
                </span>
              </div>
              <button
                onClick={() => setAdjustStockModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Metrics Overview */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 border border-border text-center text-xs">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Current On-Hand</span>
                <span className="font-black text-navy text-base">{adjustTargetProduct.stockQuantity}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Reserved Units</span>
                <span className="font-black text-amber-700 text-base">{adjustTargetProduct.reservedQuantity || 0}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Current ATS</span>
                <span className="font-black text-teal-700 text-base">{adjustTargetProduct.availableToSell}</span>
              </div>
            </div>

            <form onSubmit={handleAdjustStockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-navy block mb-1">
                  New Physical On-Hand Quantity * (Must be &ge; {adjustTargetProduct.reservedQuantity || 0} Reserved Units)
                </label>
                <input
                  type="number"
                  min={adjustTargetProduct.reservedQuantity || 0}
                  required
                  value={adjustNewQuantity}
                  onChange={(e) => setAdjustNewQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full p-2.5 rounded-xl border border-border font-mono font-bold text-base text-navy outline-none focus:border-teal-500"
                />
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className="text-slate-500">
                    Net Quantity Delta:{' '}
                    <strong
                      className={
                        adjustNewQuantity - adjustTargetProduct.stockQuantity >= 0
                          ? 'text-teal-700'
                          : 'text-rose-600'
                      }
                    >
                      {adjustNewQuantity - adjustTargetProduct.stockQuantity >= 0 ? '+' : ''}
                      {adjustNewQuantity - adjustTargetProduct.stockQuantity} units
                    </strong>
                  </span>
                  <span className="text-slate-500">
                    New Available (ATS):{' '}
                    <strong className="text-teal-700">
                      {Math.max(0, adjustNewQuantity - (adjustTargetProduct.reservedQuantity || 0))} units
                    </strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Stock Movement Classification *</label>
                <select
                  value={adjustMovementType}
                  onChange={(e) => setAdjustMovementType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700 outline-none"
                >
                  <option value="audit_reconciliation">Audit Reconciliation (Physical Count Correction)</option>
                  <option value="damage_write_off">Damaged / Expired Goods Write-off</option>
                  <option value="po_receipt">Supplier Replenishment Direct Intake</option>
                  <option value="manual_adjustment">Manual Management Override</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Mandatory Adjustment Reason &amp; Auditor Notes *</label>
                <textarea
                  rows={2}
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical inventory cycle count completed. Verified 2 damaged boxes removed..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border text-navy outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustStockModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {adjustSubmitting ? 'Recording Audit Movement...' : 'Save Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Third-Party Supplier Availability Confirmation Modal */}
      {supplierConfirmModalOpen && supplierConfirmProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-navy text-sm">Confirm Supplier Availability</h3>
                <span className="font-mono text-xs text-slate-500">
                  {supplierConfirmProduct.sku} &mdash; {supplierConfirmProduct.supplierName}
                </span>
              </div>
              <button
                onClick={() => setSupplierConfirmModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmSupplierSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-navy block mb-1">Supplier Stock Confirmation Status *</label>
                <select
                  value={supplierConfirmStatus}
                  onChange={(e) => setSupplierConfirmStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border font-semibold text-slate-700 outline-none"
                >
                  <option value="confirmed">Confirmed Available (Stock Ready at Vendor)</option>
                  <option value="pending_confirmation">Pending Supplier Callback / Inquiry</option>
                  <option value="out_of_stock">Supplier Reports Out of Stock</option>
                  <option value="unconfirmed">Unconfirmed / Stale Verification</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Restock Lead Time (Days) *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={supplierLeadTimeDays}
                  onChange={(e) => setSupplierLeadTimeDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full p-2.5 rounded-xl border border-border font-mono font-bold text-navy outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Verification Notes</label>
                <textarea
                  rows={2}
                  value={supplierConfirmNotes}
                  onChange={(e) => setSupplierConfirmNotes(e.target.value)}
                  placeholder="e.g. Spoke with vendor representative via phone. 25 units available in regional depot..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border text-navy outline-none"
                />
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSupplierConfirmModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={supplierConfirmSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {supplierConfirmSubmitting ? 'Confirming...' : 'Update Supplier Availability'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Restock Purchase Order Creation Modal (Draft/Review) */}
      {reorderModalOpen && reorderTargetProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-navy text-sm">Create Restock Purchase Order</h3>
                <span className="font-mono text-xs text-slate-500">
                  {reorderTargetProduct.sku} &mdash; {reorderTargetProduct.title}
                </span>
              </div>
              <button
                onClick={() => setReorderModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Product & Supplier Context */}
            <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-xs space-y-1">
              <div className="flex items-center justify-between text-blue-950 font-bold">
                <span>Associated Supplier: {reorderTargetProduct.supplierName}</span>
                <span>Current ATS: {reorderTargetProduct.availableToSell} units</span>
              </div>
              <p className="text-[11px] text-blue-800">
                Safety Threshold: {reorderTargetProduct.reorderThreshold || 5} units | Preferred Batch:{' '}
                {reorderTargetProduct.reorderQuantity || 15} units
              </p>
            </div>

            <form onSubmit={handleReorderPOSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-navy block mb-1">Reorder Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={reorderQuantity}
                    onChange={(e) => setReorderQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full p-2.5 rounded-xl border border-border font-mono font-bold text-navy outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-navy block mb-1">Unit Procurement Cost (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={reorderUnitCost}
                    onChange={(e) => setReorderUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full p-2.5 rounded-xl border border-border font-mono font-bold text-navy outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-border flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Total Estimated PO Commitment:</span>
                <span className="font-mono font-black text-navy text-sm">
                  ₹{(reorderQuantity * reorderUnitCost).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">PO Notes / Special Instructions</label>
                <textarea
                  rows={2}
                  value={reorderNotes}
                  onChange={(e) => setReorderNotes(e.target.value)}
                  placeholder="e.g. Urgent restock due to seasonal surge in mobility demand..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-border text-navy outline-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100 text-[11px] text-slate-500">
                <strong>Safety Governance:</strong> This initiates a Review Draft Purchase Order in the Operations register. It does not charge or disburse funds automatically.
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReorderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reorderSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {reorderSubmitting ? 'Creating Draft PO...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Immutable Stock Movements History Drawer */}
      {movementsDrawerOpen && movementsProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="bg-white max-w-xl w-full h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div>
                  <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                    <FileText size={16} className="text-teal-600" />
                    <span>Stock Movement Audit Trail</span>
                  </h3>
                  <span className="font-mono text-xs text-slate-500">
                    {movementsProduct.sku} &mdash; {movementsProduct.title}
                  </span>
                </div>
                <button
                  onClick={() => setMovementsDrawerOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Current Balances Header */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 border border-border text-center text-xs mb-4">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Physical On-Hand</span>
                  <span className="font-black text-navy text-base">{movementsProduct.stockQuantity}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Reserved</span>
                  <span className="font-black text-amber-700 text-base">{movementsProduct.reservedQuantity || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Available (ATS)</span>
                  <span className="font-black text-teal-700 text-base">{movementsProduct.availableToSell}</span>
                </div>
              </div>

              {/* Movement History Stream */}
              <div className="space-y-3">
                {movementsLoading ? (
                  <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                    <RefreshCw size={18} className="animate-spin text-teal-600" />
                    <span>Loading immutable stock movement log...</span>
                  </div>
                ) : movementsList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No historical stock adjustments or reservation movements recorded for this SKU yet.
                  </div>
                ) : (
                  movementsList.map((m: any) => (
                    <div
                      key={m._id || m.id}
                      className="p-3.5 rounded-2xl bg-white border border-border shadow-2xs space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-slate-100 text-navy border border-border">
                          {m.movementType?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-600">
                          Stock Quantity:{' '}
                          <span className="font-mono text-slate-500">{m.previousStockQuantity}</span> &rarr;{' '}
                          <span className="font-mono font-bold text-navy">{m.newStockQuantity}</span>
                        </span>
                        <span
                          className={`font-black font-mono text-xs ${
                            m.quantityChanged > 0
                              ? 'text-teal-700'
                              : m.quantityChanged < 0
                              ? 'text-rose-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {m.quantityChanged > 0 ? `+${m.quantityChanged}` : m.quantityChanged} units
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-xl mt-1">
                        &ldquo;{m.reason}&rdquo;
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                        <span>
                          Actor: <strong>{m.performedBy?.name || 'Staff User'}</strong> (
                          {m.performedBy?.role || 'operations'})
                        </span>
                        {m.orderNumber && (
                          <span className="font-mono text-primary font-bold">Order: {m.orderNumber}</span>
                        )}
                        {m.poNumber && <span className="font-mono text-blue-700 font-bold">PO: {m.poNumber}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-4">
              <button
                onClick={() => setMovementsDrawerOpen(false)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close Audit Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Coordinate External Delivery Provider Modal */}
      {isCoordinateProviderOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                  <Truck size={17} className="text-teal-600" />
                  <span>Coordinate External Delivery Provider</span>
                </h3>
                <span className="font-mono text-xs text-slate-500">
                  Order #{selectedOrder.orderNumber} &mdash; {selectedOrder.patientName}
                </span>
              </div>
              <button
                onClick={() => setIsCoordinateProviderOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Provider Library Selection */}
            {deliveryProviders.length > 0 && (
              <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-xs space-y-1.5">
                <label className="font-bold text-teal-950 block">Select from Preferred Provider Library</label>
                <select
                  value={selectedProviderId}
                  onChange={(e) => handleProviderSelectChange(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white border border-teal-300 font-medium text-slate-800"
                >
                  <option value="">-- Choose Preferred Logistics Partner --</option>
                  {deliveryProviders.map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>
                      {p.name} {p.contactPerson ? `(${p.contactPerson})` : ''} - {p.phone}
                    </option>
                  ))}
                  <option value="">+ Custom / One-Off Courier Partner</option>
                </select>
              </div>
            )}

            <form onSubmit={handleCoordinateProviderSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-navy block mb-1">Provider Company / Service *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Blue Dart Express"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-navy block mb-1">Coordinator / Driver Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Shinde"
                    value={deliveryPersonName}
                    onChange={(e) => setDeliveryPersonName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-navy block mb-1">Contact Phone (for WhatsApp) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98220 12345"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-navy block mb-1">Contact Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. dispatch@partner.com"
                    value={providerEmail}
                    onChange={(e) => setProviderEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-navy block mb-1">Service Area / City</label>
                  <input
                    type="text"
                    placeholder="e.g. Pune Metropolitan Region"
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-navy block mb-1">Scheduled Delivery Date</label>
                  <input
                    type="date"
                    value={providerScheduledDate}
                    onChange={(e) => setProviderScheduledDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-navy block mb-1">Special Handling &amp; Delivery Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Fragile assistive equipment. Inspect outer seals. Call recipient 30 mins prior to arrival."
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-navy block mb-1">Coordination Status</label>
                  <select
                    value={coordinationStatus}
                    onChange={(e) => setCoordinationStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border font-semibold text-slate-800"
                  >
                    <option value="provider_confirmed">Confirmed (Ready for Dispatch)</option>
                    <option value="provider_contacted">Contacted (Awaiting Acceptance)</option>
                    <option value="ready_for_provider">Ready for Provider Handover</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={saveToLibrary}
                      onChange={(e) => setSaveToLibrary(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Save in Reusable Library</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCoordinateProviderOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={coordinationSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{coordinationSubmitting ? 'Coordinating...' : 'Save & Confirm Provider'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. WhatsApp Delivery Coordination Modal */}
      {isWhatsAppModalOpen && selectedOrder && whatsAppPreviewData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                    W
                  </span>
                  <span>WhatsApp Delivery Coordination</span>
                </h3>
                <span className="font-mono text-xs text-slate-500">
                  Order #{whatsAppPreviewData.orderNumber} &mdash; Partner: {whatsAppPreviewData.providerName} ({whatsAppPreviewData.providerPhone})
                </span>
              </div>
              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Privacy Compliance Banner */}
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-900 leading-relaxed">
                <strong>HIPAA &amp; DISHA Compliant Message:</strong> Medical diagnoses, clinical doctor notes, and financial payment secrets are strictly redacted. Only order identifiers, equipment titles, delivery destination, and delivery instructions are included.
              </div>
            </div>

            {/* Message Preview Block */}
            <div>
              <label className="font-bold text-navy block text-xs mb-1">Generated WhatsApp Message Preview</label>
              <div className="p-3.5 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-[11px] whitespace-pre-wrap max-h-56 overflow-y-auto border border-slate-800 leading-relaxed">
                {whatsAppPreviewData.message}
              </div>
            </div>

            {/* Coordination Actions */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <a
                  href={whatsAppPreviewData.waDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleRecordWhatsAppAction('opened_in_whatsapp')}
                  className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <MessageSquare size={14} />
                  <span>Open in WhatsApp (wa.me)</span>
                  <ExternalLink size={12} />
                </a>

                <button
                  type="button"
                  disabled={whatsAppActionSubmitting}
                  onClick={() => handleRecordWhatsAppAction('sent_confirmed')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Check size={13} />
                  <span>Mark Details Sent</span>
                </button>

                <button
                  type="button"
                  disabled={whatsAppActionSubmitting}
                  onClick={() => handleRecordWhatsAppAction('provider_acknowledged')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <PackageCheck size={14} />
                  <span>Provider Acknowledged</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Current Status: <strong className="text-navy uppercase">{whatsAppPreviewData.whatsappStatus}</strong></span>
                <button
                  type="button"
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  className="text-slate-500 hover:text-navy font-bold cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
