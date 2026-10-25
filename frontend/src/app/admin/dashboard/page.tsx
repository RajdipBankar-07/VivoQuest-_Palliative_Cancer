'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Activity,
  FileCheck,
  Search,
  Filter,
  Plus,
  ArrowRight,
  RefreshCw,
  Sliders,
  Check,
  X,
  Lock,
  ChevronRight,
  ExternalLink,
  Phone,
  Mail,
  AlertCircle,
  HelpCircle,
  Stethoscope,
  HeartPulse,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Info,
  Package,
  Truck,
  Wrench,
  MapPin,
  CreditCard,
  Navigation,
  Database,
  MessageSquare,
  Send,
  Smartphone,
  Bell,
  Eye,
  Download,
  Edit3,
  Trash2,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { adminApi, authApi, ApiClientError } from '@/lib/api';
import { FinancialSummaryView } from './components/FinancialSummaryView';
import { SupplierManagementView } from './components/SupplierManagementView';
import { CaregiverSubscriptionsView } from './components/CaregiverSubscriptionsView';
import { DocumentExpiryAlertsView } from './components/DocumentExpiryAlertsView';
import { HealthcareProfessionalsView } from './components/HealthcareProfessionalsView';

type TabType =
  | 'overview'
  | 'finances'
  | 'suppliers'
  | 'subscriptions'
  | 'expiry_alerts'
  | 'professionals'
  | 'accounts'
  | 'credentials'
  | 'hospitals'
  | 'services'
  | 'exceptions'
  | 'support'
  | 'audits'
  | 'orders'
  | 'field_ops';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Overview Data
  const [overview, setOverview] = useState<any>(null);

  // Accounts Data
  const [users, setUsers] = useState<any[]>([]);
  const [usersPagination, setUsersPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  // Credentials Data
  const [credentials, setCredentials] = useState<any[]>([]);
  const [credPagination, setCredPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [credStatusFilter, setCredStatusFilter] = useState('all');
  const [credSearch, setCredSearch] = useState('');
  const [selectedCred, setSelectedCred] = useState<any>(null);
  const [credReviewStatus, setCredReviewStatus] = useState<'approved' | 'rejected' | 'expired'>('approved');
  const [credReviewNotes, setCredReviewNotes] = useState('');
  const [credReviewExpiry, setCredReviewExpiry] = useState('');

  // Hospitals Data
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalStatusFilter, setHospitalStatusFilter] = useState('all');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [newHospitalForm, setNewHospitalForm] = useState({
    hospitalName: '',
    registrationNumber: '',
    contactName: '',
    contactRole: 'Medical Superintendent',
    contactPhone: '',
    contactEmail: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400012',
    street: '',
    bedCapacity: 150,
    emergencyCoordination: true,
    accreditationLevel: 'NABH_ACCREDITED',
  });

  // Services Data
  const [services, setServices] = useState<any[]>([]);

  // Exceptions Data
  const [exceptions, setExceptions] = useState<any>({
    unassignedBookings: [],
    urgentPendingReferrals: [],
    stalledCases: [],
    totalExceptions: 0,
  });

  // Support Tickets Data
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketResolutionNotes, setTicketResolutionNotes] = useState('');
  const [ticketNewStatus, setTicketNewStatus] = useState('resolved');
  const [ticketEscalate, setTicketEscalate] = useState(false);

  // Audit Logs Data
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPagination, setAuditPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('all');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState('all');

  // Orders & Fulfillment Data
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersPagination, setOrdersPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('confirmed');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusLocation, setStatusLocation] = useState<string>('');
  const [showSpecialistModal, setShowSpecialistModal] = useState(false);
  const [specialistName, setSpecialistName] = useState<string>('');
  const [specialistDate, setSpecialistDate] = useState<string>('');
  const [specialistNotes, setSpecialistNotes] = useState<string>('');
  const [showTrackingEventModal, setShowTrackingEventModal] = useState(false);
  const [trackingEventStatus, setTrackingEventStatus] = useState<string>('dispatched');
  const [trackingEventMessage, setTrackingEventMessage] = useState<string>('');
  const [trackingEventLocation, setTrackingEventLocation] = useState<string>('');

  // Field Operations Supervision
  const [fieldVisits, setFieldVisits] = useState<any[]>([]);
  const [fieldVisitsPagination, setFieldVisitsPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [fieldStats, setFieldStats] = useState<any | null>(null);
  const [fieldStatusFilter, setFieldStatusFilter] = useState('all');
  const [fieldVisitTypeFilter, setFieldVisitTypeFilter] = useState('all');
  const [fieldDateFilter, setFieldDateFilter] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedVisitForAssign, setSelectedVisitForAssign] = useState<any | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignProviderId, setReassignProviderId] = useState('');
  const [reassignProviderName, setReassignProviderName] = useState('Dr. Priya Deshmukh');
  const [reassignProviderPhone, setReassignProviderPhone] = useState('9820011003');
  const [reassignReason, setReassignReason] = useState('Clinical route balancing and priority assignment');
  const [reassignScheduledDate, setReassignScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [reassignTimeSlot, setReassignTimeSlot] = useState('11:00 AM - 01:00 PM');
  const [availableCaregivers, setAvailableCaregivers] = useState<any[]>([]);

  // Phase 4 & Phase 7: Offline Edge Sync Operations & In-App / Gateway Notifications
  const [fieldOpsSubTab, setFieldOpsSubTab] = useState<'visits' | 'sync_logs' | 'notifications' | 'reschedules'>('visits');
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [syncStats, setSyncStats] = useState<any | null>(null);
  const [syncStatusFilter, setSyncStatusFilter] = useState('all');
  const [syncTypeFilter, setSyncTypeFilter] = useState('all');
  const [syncSearch, setSyncSearch] = useState('');
  const [syncPagination, setSyncPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [notifChannelFilter, setNotifChannelFilter] = useState('all');
  const [notifStatusFilter, setNotifStatusFilter] = useState('all');
  const [notifSearch, setNotifSearch] = useState('');
  const [notifPagination, setNotifPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  // Notifications Bell & Unread Drawer
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [showNotifDrawer, setShowNotifDrawer] = useState<boolean>(false);
  const [inAppNotifs, setInAppNotifs] = useState<any[]>([]);

  // Visit Rescheduling Supervision
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
  const [rescheduleStatusFilter, setRescheduleStatusFilter] = useState<string>('all');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [selectedRescheduleForReject, setSelectedRescheduleForReject] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Visit Clinical Documentation & Supervision Modals
  const [selectedVisitForReport, setSelectedVisitForReport] = useState<any | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showEditReportModal, setShowEditReportModal] = useState<boolean>(false);
  const [editReportNotes, setEditReportNotes] = useState<string>('');
  const [editReportVitals, setEditReportVitals] = useState<any>({});
  const [editReportReason, setEditReportReason] = useState<string>('');
  const [showDeleteReportModal, setShowDeleteReportModal] = useState<boolean>(false);
  const [deleteReportReason, setDeleteReportReason] = useState<string>('');

  // Phase 2: Order Refund & Hospital Verification States
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>('');

  const [showHospitalVerifyModal, setShowHospitalVerifyModal] = useState(false);
  const [selectedHospitalForVerify, setSelectedHospitalForVerify] = useState<any | null>(null);
  const [hospitalVerifyStatus, setHospitalVerifyStatus] = useState<'verified' | 'rejected' | 'pending'>('verified');
  const [hospitalVerifyNotes, setHospitalVerifyNotes] = useState('');
  const [hospitalLicenseExpiry, setHospitalLicenseExpiry] = useState('');

  const getPermittedTransitions = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case 'placed':
        return ['confirmed', 'cancelled'];
      case 'confirmed':
        return ['dispatched', 'cancelled'];
      case 'dispatched':
        return ['out_for_delivery', 'cancelled'];
      case 'out_for_delivery':
        return ['delivered', 'cancelled'];
      case 'delivered':
        return ['completed'];
      default:
        return [];
    }
  };

  // Verify auth session on mount
  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const storedUser = authApi.getStoredUser();
      const token = authApi.getToken();

      // Enforce verified administrator session
      if (!token || !storedUser || !['admin', 'super_admin'].includes(storedUser.role?.toLowerCase())) {
        authApi.logout();
        setIsAuthorized(false);
        setIsLoading(false);
        router.push('/admin/login?returnUrl=/admin/dashboard');
        return;
      }

      // Check client-side token expiration before issuing API requests
      if (authApi.isTokenExpired(token)) {
        authApi.logout();
        setIsAuthorized(false);
        setIsLoading(false);
        router.push('/admin/login?returnUrl=/admin/dashboard&session=expired');
        return;
      }

      setCurrentUser(storedUser);
      setIsAuthorized(true);

      // Verify session against backend with initial overview load
      await loadTabData('overview');

      // Only dispatch supplementary background requests once authentication is verified
      adminApi.getAdminFieldVisitStats().then(setFieldStats).catch(() => null);
      adminApi.getUnreadNotificationsCount().then((res) => setUnreadNotifCount(res.unreadCount || 0)).catch(() => null);
      adminApi.getNotificationLogs({ channel: 'in_app', limit: 20 }).then((res) => setInAppNotifs(res.data || [])).catch(() => null);
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 401) {
        authApi.logout();
        setIsAuthorized(false);
        router.push('/admin/login?returnUrl=/admin/dashboard&session=expired');
        return;
      }
      setError(err.message || 'Unable to authenticate admin session');
      setIsAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsersData = async (opts?: { page?: number; role?: string; status?: string; search?: string }) => {
    try {
      const page = opts?.page ?? usersPagination.page;
      const role = opts?.role ?? userRoleFilter;
      const status = opts?.status ?? userStatusFilter;
      const search = opts?.search ?? userSearch;

      const res = await adminApi.getUsers({
        role: role,
        status: status,
        search: search.trim() || undefined,
        page,
        limit: 10,
      });
      setUsers(res.data);
      setUsersPagination(res.pagination);
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 401) {
        authApi.logout();
        setIsAuthorized(false);
        router.push('/admin/login?returnUrl=/admin/dashboard&session=expired');
        return;
      }
      setError(err.message || 'Failed to load user accounts');
    }
  };

  const loadTabData = async (tab: TabType) => {
    setError(null);
    try {
      if (tab === 'overview') {
        const data = await adminApi.getOverview();
        setOverview(data);
      } else if (tab === 'field_ops') {
        const [visitsRes, statsRes, syncLogsRes, syncStatsRes, notifRes, reschedulesRes, caregiversRes, unreadRes, inAppRes] = await Promise.all([
          adminApi.getAdminFieldVisits({
            status: fieldStatusFilter === 'all' ? undefined : fieldStatusFilter,
            visitType: fieldVisitTypeFilter === 'all' ? undefined : fieldVisitTypeFilter,
            date: fieldDateFilter || undefined,
            search: fieldSearch.trim() || undefined,
            page: fieldVisitsPagination.page,
            limit: 10,
          }),
          adminApi.getAdminFieldVisitStats(),
          adminApi.getSyncLogs({
            status: syncStatusFilter === 'all' ? undefined : syncStatusFilter,
            operationType: syncTypeFilter === 'all' ? undefined : syncTypeFilter,
            search: syncSearch.trim() || undefined,
            page: syncPagination.page,
            limit: 10,
          }),
          adminApi.getSyncStats(),
          adminApi.getNotificationLogs({
            channel: notifChannelFilter === 'all' ? undefined : notifChannelFilter,
            status: notifStatusFilter === 'all' ? undefined : notifStatusFilter,
            search: notifSearch.trim() || undefined,
            page: notifPagination.page,
            limit: 10,
          }),
          adminApi.getRescheduleRequests(rescheduleStatusFilter === 'all' ? undefined : rescheduleStatusFilter).catch(() => ({ data: [] })),
          adminApi.getUsers({ role: 'professional', status: 'active', limit: 50 }).catch(() => ({ data: [] })),
          adminApi.getUnreadNotificationsCount().catch(() => ({ unreadCount: 0 })),
          adminApi.getNotificationLogs({ channel: 'in_app', limit: 20 }).catch(() => ({ data: [] })),
        ]);
        setFieldVisits(visitsRes.data);
        setFieldVisitsPagination(visitsRes.pagination);
        setFieldStats(statsRes);
        setSyncLogs(syncLogsRes.data);
        setSyncPagination(syncLogsRes.pagination);
        setSyncStats(syncStatsRes);
        setNotificationLogs(notifRes.data);
        setNotifPagination(notifRes.pagination);
        setRescheduleRequests(reschedulesRes.data || []);
        setAvailableCaregivers(caregiversRes.data || []);
        setUnreadNotifCount(unreadRes.unreadCount || 0);
        setInAppNotifs(inAppRes.data || []);
      } else if (tab === 'orders') {
        const res = await adminApi.getOrders({
          status: orderStatusFilter,
          paymentStatus: orderPaymentFilter,
          search: orderSearch.trim() || undefined,
          page: ordersPagination.page,
          limit: 10,
        });
        setOrders(res.data);
        setOrdersPagination(res.pagination);
      } else if (tab === 'accounts') {
        await loadUsersData();
      } else if (tab === 'credentials') {
        const res = await adminApi.getCredentials({
          status: credStatusFilter,
          search: credSearch.trim() || undefined,
          page: credPagination.page,
          limit: 10,
        });
        setCredentials(res.data);
        setCredPagination(res.pagination);
      } else if (tab === 'hospitals') {
        const data = await adminApi.getHospitals({
          status: hospitalStatusFilter,
          search: hospitalSearch.trim() || undefined,
        });
        setHospitals(data);
      } else if (tab === 'services') {
        const data = await adminApi.getServices();
        setServices(data);
      } else if (tab === 'exceptions') {
        const data = await adminApi.getExceptions();
        setExceptions(data);
      } else if (tab === 'support') {
        const data = await adminApi.getSupportTickets();
        setSupportTickets(data);
      } else if (tab === 'audits') {
        const res = await adminApi.getAuditLogs({
          category: auditCategoryFilter,
          severity: auditSeverityFilter,
          page: auditPagination.page,
          limit: 15,
        });
        setAuditLogs(res.data);
        setAuditPagination(res.pagination);
      }
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 401) {
        authApi.logout();
        setIsAuthorized(false);
        router.push('/admin/login?returnUrl=/admin/dashboard&session=expired');
        return;
      }
      setError(err.message || `Failed to load data for ${tab}`);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadTabData(activeTab);
    }
  }, [activeTab]);

  // Handle status update
  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await adminApi.updateOrderStatus(selectedOrder._id, {
        status: targetStatus,
        trackingMessage: statusMessage.trim() || undefined,
        location: statusLocation.trim() || undefined,
      });
      setSuccessMsg(`Order ${selectedOrder.orderNumber} transitioned to '${targetStatus}'`);
      setShowStatusModal(false);
      setSelectedOrder(null);
      setStatusMessage('');
      setStatusLocation('');
      await loadTabData('orders');
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle specialist assignment
  const handleAssignSpecialist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !specialistName.trim()) return;
    setActionLoading(true);
    try {
      await adminApi.assignInstallationSpecialist(selectedOrder._id, {
        specialistName: specialistName.trim(),
        setupDate: specialistDate || undefined,
        setupNotes: specialistNotes.trim() || undefined,
        setupStatus: 'scheduled',
      });
      setSuccessMsg(`Clinical technician '${specialistName}' assigned to order ${selectedOrder.orderNumber}`);
      setShowSpecialistModal(false);
      setSelectedOrder(null);
      setSpecialistName('');
      setSpecialistDate('');
      setSpecialistNotes('');
      await loadTabData('orders');
    } catch (err: any) {
      setError(err.message || 'Failed to assign clinical specialist');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle milestone log
  const handleAddTrackingEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !trackingEventMessage.trim()) return;
    setActionLoading(true);
    try {
      await adminApi.addOrderTrackingEvent(selectedOrder._id, {
        status: trackingEventStatus,
        message: trackingEventMessage.trim(),
        location: trackingEventLocation.trim() || undefined,
      });
      setSuccessMsg(`Fulfillment milestone logged for order ${selectedOrder.orderNumber}`);
      setShowTrackingEventModal(false);
      setSelectedOrder(null);
      setTrackingEventMessage('');
      setTrackingEventLocation('');
      await loadTabData('orders');
    } catch (err: any) {
      setError(err.message || 'Failed to record tracking milestone');
    } finally {
      setActionLoading(false);
    }
  };

  // Reassign Field Visit Provider
  const handleReassignVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitForAssign || !reassignProviderName.trim() || !reassignReason.trim()) return;

    setActionLoading(true);
    try {
      await adminApi.reassignFieldVisit(selectedVisitForAssign._id, {
        providerId: reassignProviderId || undefined,
        providerName: reassignProviderName.trim(),
        providerPhone: reassignProviderPhone.trim() || undefined,
        reason: reassignReason.trim(),
        scheduledDate: reassignScheduledDate || undefined,
        timeSlot: reassignTimeSlot || undefined,
      });
      setSuccessMsg(`Visit ${selectedVisitForAssign.visitNumber} successfully reassigned to ${reassignProviderName}`);
      setShowReassignModal(false);
      setSelectedVisitForAssign(null);
      await loadTabData('field_ops');
    } catch (err: any) {
      setError(err.message || 'Failed to reassign visit provider');
    } finally {
      setActionLoading(false);
    }
  };

  // Phase 4: Retry Failed Patient Notification
  const handleRetryNotification = async (id: string) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.retryNotification(id);
      setSuccessMsg(`Notification retry dispatched: Status is now '${res.data?.status}'`);
      await loadTabData('field_ops');
    } catch (err: any) {
      setError(err.message || 'Failed to retry notification dispatch');
    } finally {
      setActionLoading(false);
    }
  };

  // In-App Notifications: Mark as read
  const handleMarkNotificationRead = async (id: string, notif?: any) => {
    try {
      await adminApi.markNotificationRead(id);
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
      setInAppNotifs((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      if (notif) {
        if (notif.relatedEntityType === 'CaregiverSubscription' || notif.type === 'SUBSCRIPTION_ACTIVATED') {
          setActiveTab('subscriptions');
          setShowNotifDrawer(false);
        } else if (notif.relatedEntityType === 'VisitRescheduleRequest' || notif.type === 'VISIT_RESCHEDULE_REQUESTED') {
          setActiveTab('field_ops');
          setFieldOpsSubTab('reschedules');
          setShowNotifDrawer(false);
        } else if (notif.relatedEntityType === 'FieldVisit') {
          setActiveTab('field_ops');
          setFieldOpsSubTab('visits');
          setShowNotifDrawer(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark notification read');
    }
  };

  // In-App Notifications: Mark all as read
  const handleMarkAllNotificationsRead = async () => {
    try {
      await adminApi.markAllNotificationsRead();
      setUnreadNotifCount(0);
      setInAppNotifs((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setSuccessMsg('All notifications marked as read');
    } catch (err: any) {
      setError(err.message || 'Failed to mark all notifications read');
    }
  };

  // Reschedule Requests: Approve
  const handleApproveReschedule = async (id: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await adminApi.approveRescheduleRequest(id);
      setSuccessMsg(`Reschedule approved: Visit ${res.data?.visitNumber} updated successfully.`);
      await loadTabData('field_ops');
    } catch (err: any) {
      setError(err.message || 'Failed to approve reschedule request');
    } finally {
      setActionLoading(false);
    }
  };

  // Reschedule Requests: Reject
  const handleRejectRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRescheduleForReject || !rejectReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.rejectRescheduleRequest(selectedRescheduleForReject._id, rejectReason.trim());
      setSuccessMsg('Reschedule request rejected and patient notified.');
      setShowRejectModal(false);
      setSelectedRescheduleForReject(null);
      setRejectReason('');
      await loadTabData('field_ops');
    } catch (err: any) {
      setError(err.message || 'Failed to reject reschedule request');
    } finally {
      setActionLoading(false);
    }
  };

  // Clinical Report: Admin Edit with Audit & Version Archival
  const handleAdminEditReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitForReport || !editReportReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.adminEditVisitClinicalDoc(selectedVisitForReport._id, {
        clinicalNotes: editReportNotes,
        vitals: editReportVitals,
        editReason: editReportReason.trim(),
      });
      setSuccessMsg(`Clinical report for visit ${selectedVisitForReport.visitNumber} updated and archived to version history.`);
      setShowEditReportModal(false);
      setShowReportModal(false);
      await loadTabData('field_ops');
    } catch (err: any) {
      setError(err.message || 'Failed to edit clinical report');
    } finally {
      setActionLoading(false);
    }
  };

  // Clinical Report: Admin Soft Delete with Mandatory Audit Reason
  const handleAdminDeleteReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitForReport || !deleteReportReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.adminSoftDeleteVisitClinicalDoc(selectedVisitForReport._id, deleteReportReason.trim());
      setSuccessMsg(`Clinical report for visit ${selectedVisitForReport.visitNumber} soft-deleted. Audit record preserved.`);
      setShowDeleteReportModal(false);
      setShowReportModal(false);
      await loadTabData('field_ops');
    } catch (err: any) {
      setError(err.message || 'Failed to delete clinical report');
    } finally {
      setActionLoading(false);
    }
  };

  // Account Status Toggle
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Are you sure you want to change user status to '${nextStatus}'?`)) return;

    setActionLoading(true);
    try {
      await adminApi.updateUserStatus(userId, nextStatus);
      setSuccessMsg(`User status updated to '${nextStatus}'`);
      await loadTabData('accounts');
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  // Credential Review Submit
  const handleReviewCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCred) return;

    setActionLoading(true);
    try {
      await adminApi.reviewCredential(selectedCred._id, {
        status: credReviewStatus,
        notes: credReviewNotes,
        expiryDate: credReviewExpiry || undefined,
      });
      setSuccessMsg(`Credential for ${selectedCred.userId?.fullName || 'professional'} marked as ${credReviewStatus}`);
      setSelectedCred(null);
      setCredReviewNotes('');
      setCredReviewExpiry('');
      await loadTabData('credentials');
    } catch (err: any) {
      setError(err.message || 'Failed to review credential');
    } finally {
      setActionLoading(false);
    }
  };

  // Onboard Hospital Submit
  const handleOnboardHospitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await adminApi.onboardHospital({
        hospitalName: newHospitalForm.hospitalName,
        registrationNumber: newHospitalForm.registrationNumber,
        contactPerson: {
          name: newHospitalForm.contactName,
          role: newHospitalForm.contactRole,
          phone: newHospitalForm.contactPhone,
          email: newHospitalForm.contactEmail,
        },
        address: {
          city: newHospitalForm.city,
          state: newHospitalForm.state,
          pincode: newHospitalForm.pincode,
          street: newHospitalForm.street,
        },
        bedCapacity: Number(newHospitalForm.bedCapacity),
        emergencyCoordinationAvailable: newHospitalForm.emergencyCoordination,
        accreditationLevel: newHospitalForm.accreditationLevel,
        palliativeCareServicesOffered: ['Inpatient Palliative Ward', 'Home Transition Support', 'Pain Management Clinic'],
      });
      setSuccessMsg(`Hospital '${newHospitalForm.hospitalName}' onboarded successfully`);
      setShowOnboardModal(false);
      await loadTabData('hospitals');
    } catch (err: any) {
      setError(err.message || 'Failed to onboard hospital');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Hospital Active
  const handleToggleHospitalStatus = async (hospitalId: string, currentActive: boolean) => {
    setActionLoading(true);
    try {
      await adminApi.updateHospitalStatus(hospitalId, !currentActive);
      setSuccessMsg(`Hospital status updated`);
      await loadTabData('hospitals');
    } catch (err: any) {
      setError(err.message || 'Failed to update hospital status');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Service Availability
  const handleToggleServiceAvailability = async (serviceId: string, currentActive: boolean) => {
    setActionLoading(true);
    try {
      await adminApi.updateServiceAvailability(serviceId, !currentActive);
      setSuccessMsg(`Service availability updated`);
      await loadTabData('services');
    } catch (err: any) {
      setError(err.message || 'Failed to update service availability');
    } finally {
      setActionLoading(false);
    }
  };

  // Resolve or Escalate Support Ticket
  const handleUpdateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setActionLoading(true);
    try {
      await adminApi.updateSupportTicket(selectedTicket._id, {
        status: ticketNewStatus,
        resolutionNotes: ticketResolutionNotes,
        isEscalated: ticketEscalate,
      });
      setSuccessMsg(ticketEscalate ? 'Ticket escalated to Super Administrator' : 'Ticket status updated');
      setSelectedTicket(null);
      setTicketResolutionNotes('');
      setTicketEscalate(false);
      await loadTabData('support');
    } catch (err: any) {
      setError(err.message || 'Failed to update support ticket');
    } finally {
      setActionLoading(false);
    }
  };

  // Phase 2: Process Order Refund
  const handleProcessRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || refundAmount <= 0) return;
    setActionLoading(true);
    try {
      await adminApi.processOrderRefund(selectedOrder._id, refundAmount, refundReason);
      setSuccessMsg(`Refund of ₹${refundAmount.toLocaleString('en-IN')} processed successfully for order ${selectedOrder.orderNumber}`);
      setShowRefundModal(false);
      setShowOrderDetailModal(false);
      setRefundAmount(0);
      setRefundReason('');
      await loadTabData('orders');
    } catch (err: any) {
      setError(err.message || 'Failed to process order refund');
    } finally {
      setActionLoading(false);
    }
  };

  // Phase 2: Hospital Partner Verification
  const handleVerifyHospitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospitalForVerify) return;
    setActionLoading(true);
    try {
      await adminApi.verifyHospitalPartner(selectedHospitalForVerify._id, {
        status: hospitalVerifyStatus,
        notes: hospitalVerifyNotes.trim() || undefined,
        licenseExpiryDate: hospitalLicenseExpiry || undefined,
      });
      setSuccessMsg(`Hospital '${selectedHospitalForVerify.hospitalName}' verification updated to '${hospitalVerifyStatus}'`);
      setShowHospitalVerifyModal(false);
      setSelectedHospitalForVerify(null);
      setHospitalVerifyNotes('');
      setHospitalLicenseExpiry('');
      await loadTabData('hospitals');
    } catch (err: any) {
      setError(err.message || 'Failed to update hospital partner verification');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'verified':
      case 'active':
      case 'resolved':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} />
            {status.toUpperCase()}
          </span>
        );
      case 'pending':
      case 'pending_verification':
      case 'open':
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} />
            {status.toUpperCase()}
          </span>
        );
      case 'rejected':
      case 'suspended':
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <X size={12} />
            {status.toUpperCase()}
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle size={12} />
            EXPIRED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  if (!isLoading && isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-navy">
        <Navbar />
        <div className="flex-1 max-w-md mx-auto px-4 py-16 flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2">Administrative Clearance Required</h2>
          <p className="text-sm text-slate-500 mb-6">
            Access to the centralized operations dashboard requires verified administrative credentials.
          </p>
          <Link
            href="/admin/login?returnUrl=/admin/dashboard"
            className="w-full inline-flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-navy text-white hover:bg-navy-light transition-colors shadow-md shadow-navy/20"
          >
            Go to Admin Login
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-navy">
      <Navbar />

      {/* Top Operations Header */}
      <div className="bg-navy text-white border-b border-navy-light/40 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-primary text-white uppercase tracking-wider">
                Operations Console
              </span>
              <span className="text-xs text-slate-300">
                Phase 7 Platform Control
              </span>
              {currentUser?.role === 'super_admin' && (
                <Link
                  href="/super-admin/dashboard"
                  className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
                >
                  <Lock size={12} />
                  Switch to Super-Admin Governance →
                </Link>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              VivoQuest Admin Operations Dashboard
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Centralized platform operations: Bookings, referrals, accounts, credential verification, and hospital partners.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400">Authenticated Staff</div>
              <div className="text-sm font-semibold text-white">
                {currentUser?.fullName || 'Operations Admin'} ({currentUser?.role})
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTabData(activeTab)}
              disabled={isLoading || actionLoading}
              className="bg-navy-light/50 border-white/20 text-white hover:bg-white/10 flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Sync Data
            </Button>
            <button
              onClick={() => setShowNotifDrawer(true)}
              className="relative p-2 rounded-xl bg-navy-light/50 border border-white/20 text-white hover:bg-white/10 transition flex items-center justify-center"
              title="View In-App Alerts"
            >
              <Bell size={16} />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white border-2 border-navy animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sandbox & Demonstration Data Banner */}
      <div className="bg-primary-light/40 border-b border-primary/20 py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-navy/80 gap-2">
          <div className="flex items-center gap-2">
            <Info size={15} className="text-primary shrink-0" />
            <span>
              <strong>Real Backend Data Mode:</strong> Connected to Express &amp; MongoDB at{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-primary/20 font-mono text-[11px]">
                127.0.0.1:27017/vivoquest_db
              </code>
              . Demonstration accounts, test clinics, and sandbox referrals are explicitly tagged.
            </span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-slate-500 text-[11px]">
            <span>Security: Least-Privilege Enforced</span>
            <span>•</span>
            <span>Audit Logging Active</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Alerts / Error display */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Operation Notice</p>
                <p className="text-xs mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
              <X size={16} />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Success</p>
                <p className="text-xs mt-0.5 text-emerald-700">{successMsg}</p>
              </div>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab Navigation Navigation Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-1.5 mb-8 flex flex-wrap gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'finances', label: 'Finances & P&L', icon: CreditCard },
            { id: 'suppliers', label: 'Suppliers & Procurement', icon: Truck },
            { id: 'subscriptions', label: 'Caregiver Plans', icon: HeartPulse },
            { id: 'expiry_alerts', label: 'Expiry Alerts', icon: AlertTriangle, badge: overview?.pendingCredentialsCount, alert: overview?.pendingCredentialsCount > 0 },
            { id: 'professionals', label: 'Healthcare Staff', icon: Stethoscope },
            { id: 'orders', label: 'Orders & DME Fulfillment', icon: Package, badge: ordersPagination.total || undefined },
            { id: 'field_ops', label: 'Field Operations & DME', icon: Navigation, badge: fieldStats?.activeVisits || undefined },
            { id: 'accounts', label: 'Accounts & Users', icon: Users, badge: overview?.totalUsers },
            { id: 'credentials', label: 'Credential Reviews', icon: FileCheck, badge: overview?.pendingCredentialsCount, alert: overview?.pendingCredentialsCount > 0 },
            { id: 'hospitals', label: 'Hospital Partners', icon: Building2, badge: overview?.totalHospitals },
            { id: 'services', label: 'Service Catalog', icon: Layers },
            { id: 'exceptions', label: 'Exceptions & Triage', icon: AlertTriangle, badge: overview?.recentExceptions?.urgentPendingReferrals?.length },
            { id: 'support', label: 'Support & Tickets', icon: HelpCircle, badge: overview?.openSupportTicketsCount },
            { id: 'audits', label: 'Audit Trail', icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy hover:bg-slate-100'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-secondary' : 'text-slate-400'} />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.alert
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Phase 2: Central Commerce, Governance & Financial Tabs */}
        {activeTab === 'finances' && <FinancialSummaryView />}
        {activeTab === 'suppliers' && <SupplierManagementView />}
        {activeTab === 'subscriptions' && (
          <CaregiverSubscriptionsView
            onNavigateToAccounts={(searchQuery) => {
              setActiveTab('accounts');
              if (searchQuery) {
                setUserSearch(searchQuery);
                loadUsersData({ page: 1, search: searchQuery });
              } else {
                loadUsersData({ page: 1 });
              }
            }}
          />
        )}
        {activeTab === 'expiry_alerts' && (
          <DocumentExpiryAlertsView
            onNavigateToCredential={(credId) => {
              setSelectedCred({ _id: credId });
              setActiveTab('credentials');
            }}
          />
        )}
        {activeTab === 'professionals' && <HealthcareProfessionalsView />}

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Bookings</div>
                  <div className="text-2xl font-black text-navy mt-1">{overview?.totalBookings ?? '—'}</div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {overview?.activeBookings ?? 0} In-Flight / Confirmed
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
                  <Calendar size={24} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Hospital Referrals</div>
                  <div className="text-2xl font-black text-navy mt-1">{overview?.totalReferrals ?? '—'}</div>
                  <div className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {overview?.emergencyReferrals ?? 0} Emergency / High Priority
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Building2 size={24} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Credentials</div>
                  <div className="text-2xl font-black text-navy mt-1">{overview?.pendingCredentialsCount ?? '—'}</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    Awaiting verification review
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileCheck size={24} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Registered Accounts</div>
                  <div className="text-2xl font-black text-navy mt-1">{overview?.totalUsers ?? '—'}</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    {overview?.totalPatients ?? 0} Patients • {overview?.totalProfessionals ?? 0} Doctors
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-secondary flex items-center justify-center">
                  <Users size={24} />
                </div>
              </div>
            </div>

            {/* Two Column Grid: Operational Exceptions & Live Audit Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Exceptions Box */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={20} className="text-amber-500" />
                    <h2 className="text-lg font-bold text-navy">Priority Operational Exceptions</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('exceptions')}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    View All Triage <ArrowRight size={14} />
                  </button>
                </div>

                <div className="space-y-3">
                  {overview?.recentExceptions?.urgentPendingReferrals?.length > 0 ? (
                    overview.recentExceptions.urgentPendingReferrals.map((ref: any) => (
                      <div
                        key={ref._id}
                        className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                              Urgent Referral
                            </span>
                            <span className="text-xs font-bold text-navy">
                              {ref.referralId || ref._id.substring(0, 8)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Patient: <strong>{ref.patientName}</strong> • {ref.primaryDiagnosis}
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('exceptions')}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-border rounded-lg hover:bg-slate-50"
                        >
                          Triage
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                      No urgent hospital referral exceptions at this time.
                    </div>
                  )}

                  {overview?.recentExceptions?.unassignedBookings?.length > 0 && (
                    overview.recentExceptions.unassignedBookings.map((bk: any) => (
                      <div
                        key={bk._id}
                        className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-200 text-blue-900 uppercase">
                              Unassigned Booking
                            </span>
                            <span className="text-xs font-bold text-navy">
                              {bk.bookingReference || bk._id.substring(0, 8)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Service: <strong>{bk.serviceId?.name || 'Home Palliative Visit'}</strong> • Scheduled for {new Date(bk.scheduledDate).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('exceptions')}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-border rounded-lg hover:bg-slate-50"
                        >
                          Assign
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Live Audit Log Preview */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={20} className="text-indigo-600" />
                    <h2 className="text-lg font-bold text-navy">Recent Security &amp; Admin Audits</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('audits')}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Complete Log Stream <ArrowRight size={14} />
                  </button>
                </div>

                <div className="divide-y divide-border">
                  {overview?.recentAuditLogs?.length > 0 ? (
                    overview.recentAuditLogs.slice(0, 5).map((log: any) => (
                      <div key={log._id} className="py-3 flex items-start justify-between gap-3 text-xs">
                        <div>
                          <div className="font-semibold text-navy flex items-center gap-2">
                            <span>{log.action}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                              {log.category}
                            </span>
                          </div>
                          <p className="text-slate-500 mt-0.5">
                            By: {log.performedBy?.fullName || log.performedBy?.phone || 'System'} • Target: {log.targetType}
                          </p>
                        </div>
                        <div className="text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No audit events recorded recently.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: FIELD OPERATIONS & CLINICIAN VISITS SUPERVISION */}
        {/* ========================================================================= */}
        {activeTab === 'field_ops' && (
          <div className="space-y-8">
            {/* Field Ops Header */}
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-semibold mb-1">
                  <Navigation size={13} />
                  <span>Field Operations Control Center</span>
                </div>
                <h2 className="text-xl font-bold text-navy">Home Healthcare Visits &amp; DME Installation Supervision</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time provider dispatching, overdue and failed-visit exception handling, and medical equipment setup verification queue.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadTabData('field_ops')}
                  disabled={isLoading || actionLoading}
                  leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
                >
                  Refresh Field Queue
                </Button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Field Visits</div>
                <div className="text-2xl font-black text-navy mt-1">{fieldStats?.totalVisits ?? '—'}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Cumulative roster</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active In-Flight</div>
                <div className="text-2xl font-black text-primary mt-1">{fieldStats?.activeVisits ?? '—'}</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Assigned / En Route
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overdue Visits</div>
                <div className="text-2xl font-black text-amber-600 mt-1">{fieldStats?.overdueVisits ?? 0}</div>
                <div className="text-[10px] text-amber-600 font-semibold mt-0.5">SLA attention needed</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exceptions / Failed</div>
                <div className="text-2xl font-black text-rose-600 mt-1">{fieldStats?.failedVisits ?? 0}</div>
                <div className="text-[10px] text-rose-500 font-semibold mt-0.5">Requires reassignment</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed Today</div>
                <div className="text-2xl font-black text-secondary mt-1">{fieldStats?.completedVisits ?? 0}</div>
                <div className="text-[10px] text-secondary font-semibold mt-0.5">Documented &amp; signed</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DME Setups Verified</div>
                <div className="text-2xl font-black text-indigo-600 mt-1">{fieldStats?.equipmentInstallationsVerified ?? 0}</div>
                <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">Barcode / Serial logged</div>
              </div>
            </div>

            {/* Overdue Visits & Exceptions Alert Banner */}
            {(fieldStats?.failedVisits > 0 || fieldStats?.overdueVisits > 0) && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                  <span>Immediate Operational Attention Required: Overdue Visits &amp; Field Exceptions</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Field providers have reported patient-unavailable exceptions or visits have exceeded their scheduled time slot without completion. Review the queue below and reassign alternative clinicians or reschedule visit windows.
                </p>
              </div>
            )}

            {/* Phase 4 Sub-Navigation: Visits, Offline Sync Monitor, Patient Notifications */}
            <div className="bg-white rounded-2xl border border-border p-1.5 flex flex-wrap gap-1.5 shadow-sm">
              <button
                onClick={() => setFieldOpsSubTab('visits')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  fieldOpsSubTab === 'visits'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy hover:bg-slate-100'
                }`}
              >
                <Navigation size={15} />
                <span>Clinician Visits &amp; Dispatch ({fieldStats?.totalVisits ?? 0})</span>
              </button>

              <button
                onClick={() => setFieldOpsSubTab('sync_logs')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  fieldOpsSubTab === 'sync_logs'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy hover:bg-slate-100'
                }`}
              >
                <Database size={15} />
                <span>Offline Edge Sync Operations</span>
                {(syncStats?.conflicts > 0 || syncStats?.failed > 0) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {(syncStats?.conflicts || 0) + (syncStats?.failed || 0)} issues
                  </span>
                )}
              </button>

              <button
                onClick={() => setFieldOpsSubTab('notifications')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  fieldOpsSubTab === 'notifications'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy hover:bg-slate-100'
                }`}
              >
                <Smartphone size={15} />
                <span>Patient Notifications &amp; Gateway Dispatches</span>
                {notificationLogs.some((n) => n.status === 'failed') && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {notificationLogs.filter((n) => n.status === 'failed').length} failed
                  </span>
                )}
              </button>

              <button
                onClick={() => setFieldOpsSubTab('reschedules')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  fieldOpsSubTab === 'reschedules'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy hover:bg-slate-100'
                }`}
              >
                <Calendar size={15} />
                <span>Reschedule Requests</span>
                {rescheduleRequests.filter((r) => r.status === 'pending').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    {rescheduleRequests.filter((r) => r.status === 'pending').length} pending
                  </span>
                )}
              </button>
            </div>

            {fieldOpsSubTab === 'visits' && (
              /* Field Visits Queue Table with Filters */
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-navy">All Field Healthcare Visits ({fieldVisitsPagination.total})</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Filter by status, visit type, date, or search patient and clinician names.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search visit #, patient, provider..."
                      value={fieldSearch}
                      onChange={(e) => setFieldSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadTabData('field_ops')}
                      className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary w-48 sm:w-56"
                    />
                  </div>

                  <select
                    value={fieldStatusFilter}
                    onChange={(e) => {
                      setFieldStatusFilter(e.target.value);
                      setTimeout(() => loadTabData('field_ops'), 0);
                    }}
                    className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="assigned">Assigned</option>
                    <option value="accepted">Accepted</option>
                    <option value="en_route">En Route</option>
                    <option value="arrived">Arrived</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed / Exception</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <select
                    value={fieldVisitTypeFilter}
                    onChange={(e) => {
                      setFieldVisitTypeFilter(e.target.value);
                      setTimeout(() => loadTabData('field_ops'), 0);
                    }}
                    className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                  >
                    <option value="all">All Visit Types</option>
                    <option value="nursing_visit">Skilled Nursing</option>
                    <option value="equipment_setup">DME Equipment Setup</option>
                    <option value="physical_therapy">Physiotherapy</option>
                    <option value="physician_consult">Palliative Physician</option>
                    <option value="palliative_assessment">Clinical Assessment</option>
                  </select>

                  <input
                    type="date"
                    value={fieldDateFilter}
                    onChange={(e) => {
                      setFieldDateFilter(e.target.value);
                      setTimeout(() => loadTabData('field_ops'), 0);
                    }}
                    className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                  />

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadTabData('field_ops')}
                    disabled={isLoading}
                  >
                    Filter
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs divide-y divide-border">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Visit # &amp; Type</th>
                      <th className="py-3 px-4">Patient &amp; Location</th>
                      <th className="py-3 px-4">Assigned Clinician</th>
                      <th className="py-3 px-4">Schedule Slot</th>
                      <th className="py-3 px-4">Visit Status</th>
                      <th className="py-3 px-4">Clinical / DME Record</th>
                      <th className="py-3 px-4 text-right">Supervision Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {fieldVisits.length > 0 ? (
                      fieldVisits.map((v) => {
                        const isDme = v.visitType === 'equipment_setup';
                        const dmeVerified = v.installationVerification?.status === 'verified';
                        const hasVitals = v.clinicalDocumentation?.vitals;

                        return (
                          <tr key={v._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-primary bg-primary-light/60 px-2 py-0.5 rounded">
                                {v.visitNumber}
                              </span>
                              <div className="font-semibold text-navy mt-1 capitalize">
                                {v.visitType?.replace('_', ' ')}
                              </div>
                              {v.hospitalReferralId && (
                                <Link
                                  href={`/hospital/referrals/${v.hospitalReferralId}`}
                                  className="text-[11px] text-primary hover:underline flex items-center gap-0.5 mt-0.5"
                                >
                                  <span>Hospital Referral</span>
                                  <ExternalLink size={11} />
                                </Link>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-navy">{v.patientDetails?.fullName}</div>
                              <div className="text-[11px] text-slate-500">
                                {v.patientDetails?.age}y • {v.patientDetails?.gender} • +91 {v.patientDetails?.phone}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[160px] flex items-center gap-1 mt-0.5">
                                <MapPin size={11} className="shrink-0 text-slate-400" />
                                <span>{v.patientDetails?.city} - {v.patientDetails?.pincode}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-800">{v.providerName || 'Unassigned'}</div>
                              <div className="text-[11px] text-slate-500">{v.providerRole}</div>
                              {v.providerPhone && (
                                <div className="text-[11px] text-slate-400">+91 {v.providerPhone}</div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-medium text-navy">{v.scheduledDate}</div>
                              <div className="text-[11px] text-slate-400">{v.timeSlot}</div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                v.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : v.status === 'in_progress'
                                  ? 'bg-blue-100 text-primary animate-pulse'
                                  : v.status === 'failed' || v.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {v.status?.replace('_', ' ')}
                              </span>
                              {v.exceptionDetails?.reason && (
                                <div className="text-[10px] text-rose-600 mt-1 max-w-[130px] truncate" title={v.exceptionDetails.reason}>
                                  Ex: {v.exceptionDetails.reason}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              {isDme ? (
                                <div className="space-y-0.5">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    dmeVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {dmeVerified ? 'DME Verified' : 'Setup Pending'}
                                  </span>
                                  {v.installationVerification?.serialNumber && (
                                    <div className="font-mono text-[11px] text-navy">
                                      SN: {v.installationVerification.serialNumber}
                                    </div>
                                  )}
                                </div>
                              ) : v.clinicalDocumentation?.isDeleted ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800" title={v.clinicalDocumentation.deletionReason}>
                                    Report Soft-Deleted
                                  </span>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                    Reason: {v.clinicalDocumentation.deletionReason}
                                  </div>
                                </div>
                              ) : v.clinicalDocumentation?.signedAt ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 size={10} /> Report Signed
                                  </span>
                                  <div className="text-[11px] text-slate-600">
                                    BP: <strong className="text-navy">{v.clinicalDocumentation.vitals?.bloodPressure || '--'}</strong> • SpO2: <strong className="text-secondary">{v.clinicalDocumentation.vitals?.spO2 ? `${v.clinicalDocumentation.vitals.spO2}%` : '--'}</strong>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    By {v.clinicalDocumentation.signedBy?.name || 'Caregiver'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Pending visit documentation</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {v.clinicalDocumentation?.signedAt && !v.clinicalDocumentation?.isDeleted && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedVisitForReport(v);
                                        setShowReportModal(true);
                                      }}
                                      className="p-1.5 rounded-lg border border-border text-slate-600 hover:text-navy hover:bg-slate-100 transition"
                                      title="View Clinical Report & Audit"
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <a
                                      href={`/api/v1/visits/${v._id}/report/download?format=pdf`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg border border-border text-primary hover:bg-primary-light/50 transition flex items-center justify-center"
                                      title="Download PDF Report"
                                    >
                                      <Download size={14} />
                                    </a>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedVisitForAssign(v);
                                    setReassignProviderId(v.providerId || '');
                                    setReassignProviderName(v.providerName || 'Dr. Priya Deshmukh');
                                    setReassignProviderPhone(v.providerPhone || '9820011003');
                                    setReassignScheduledDate(v.scheduledDate || new Date().toISOString().slice(0, 10));
                                    setReassignTimeSlot(v.timeSlot || '11:00 AM - 01:00 PM');
                                    setShowReassignModal(true);
                                  }}
                                >
                                  Reassign
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Navigation size={32} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No field visits matched filters</p>
                          <p className="text-xs text-slate-400 mt-0.5">Try clearing filters or search terms.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {fieldVisitsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                  <span>
                    Showing page {fieldVisitsPagination.page} of {fieldVisitsPagination.totalPages} ({fieldVisitsPagination.total} visits)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={fieldVisitsPagination.page <= 1}
                      onClick={() => {
                        setFieldVisitsPagination((prev) => ({ ...prev, page: prev.page - 1 }));
                        setTimeout(() => loadTabData('field_ops'), 0);
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={fieldVisitsPagination.page >= fieldVisitsPagination.totalPages}
                      onClick={() => {
                        setFieldVisitsPagination((prev) => ({ ...prev, page: prev.page + 1 }));
                        setTimeout(() => loadTabData('field_ops'), 0);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* ========================================================================= */}
            {/* SUBTAB: VISIT RESCHEDULE REQUESTS SUPERVISION */}
            {/* ========================================================================= */}
            {fieldOpsSubTab === 'reschedules' && (
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-navy">
                      Patient Reschedule Requests ({rescheduleRequests.length})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review, approve, or reject patient visit rescheduling requests. Approvals validate caregiver availability and update the live schedule across all apps.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <select
                      value={rescheduleStatusFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRescheduleStatusFilter(val);
                        adminApi
                          .getRescheduleRequests(val === 'all' ? undefined : val)
                          .then((res) => setRescheduleRequests(res.data || []))
                          .catch(() => null);
                      }}
                      className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                    >
                      <option value="all">All Request Statuses</option>
                      <option value="pending">Pending Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadTabData('field_ops')}
                      disabled={isLoading}
                    >
                      Refresh
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs divide-y divide-border">
                    <thead className="bg-slate-50 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-3 px-4">Patient Details</th>
                        <th className="py-3 px-4">Visit Reference</th>
                        <th className="py-3 px-4">Assigned Caregiver</th>
                        <th className="py-3 px-4">Original Schedule</th>
                        <th className="py-3 px-4">Requested Schedule</th>
                        <th className="py-3 px-4">Reason for Request</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                      {rescheduleRequests.length > 0 ? (
                        rescheduleRequests.map((req) => {
                          const isPending = req.status === 'pending';
                          const isApproved = req.status === 'approved';
                          const isRejected = req.status === 'rejected';

                          return (
                            <tr key={req._id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-navy">{req.patientName || 'Patient'}</div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {req.patientPhone ? `+91 ${req.patientPhone}` : ''}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-bold text-primary bg-primary-light/60 px-2 py-0.5 rounded">
                                  {req.visitNumber || req.visitId}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-800">
                                  {req.caregiverName || 'Unassigned'}
                                </div>
                                {req.caregiverPhone && (
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    +91 {req.caregiverPhone}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-medium text-slate-700">{req.originalScheduledDate}</div>
                                <div className="text-[11px] text-slate-400">{req.originalTimeSlot}</div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-bold text-primary">{req.requestedDate}</div>
                                <div className="text-[11px] text-primary/80 font-medium">{req.requestedTimeSlot}</div>
                              </td>
                              <td className="py-3.5 px-4 max-w-xs">
                                <div className="text-slate-700 italic">"{req.reason}"</div>
                                {req.rejectionReason && (
                                  <div className="text-[10px] text-rose-600 mt-1 font-semibold">
                                    Rejection note: {req.rejectionReason}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    isApproved
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isPending
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {isPending ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleApproveReschedule(req._id)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1"
                                      title="Approve reschedule and synchronize schedule"
                                    >
                                      <CheckCircle2 size={12} />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedRescheduleForReject(req);
                                        setRejectReason('');
                                        setShowRejectModal(true);
                                      }}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-50 flex items-center gap-1"
                                      title="Reject reschedule and notify patient"
                                    >
                                      <X size={12} />
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Resolved</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-600">No Reschedule Requests Found</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              When patients request a new time or date from their mobile app, requests will appear here for clinical review.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUBTAB 2: OFFLINE EDGE SYNCHRONIZATION MONITOR */}
            {/* ========================================================================= */}
            {fieldOpsSubTab === 'sync_logs' && (
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-navy">Offline Edge Synchronization Logs ({syncPagination.total})</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monitor edge devices, reconcile client batch transactions, and track server status divergence.
                    </p>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search OpID, visit #, clinician..."
                        value={syncSearch}
                        onChange={(e) => setSyncSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadTabData('field_ops')}
                        className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary w-48 sm:w-56"
                      />
                    </div>

                    <select
                      value={syncStatusFilter}
                      onChange={(e) => {
                        setSyncStatusFilter(e.target.value);
                        setTimeout(() => loadTabData('field_ops'), 0);
                      }}
                      className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                    >
                      <option value="all">All Sync Statuses</option>
                      <option value="applied">Applied (Clean Sync)</option>
                      <option value="conflict">Conflict (Status Diverged)</option>
                      <option value="failed">Failed / Validation Error</option>
                    </select>

                    <select
                      value={syncTypeFilter}
                      onChange={(e) => {
                        setSyncTypeFilter(e.target.value);
                        setTimeout(() => loadTabData('field_ops'), 0);
                      }}
                      className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                    >
                      <option value="all">All Operation Types</option>
                      <option value="status_update">Status Update</option>
                      <option value="clinical_documentation">Clinical Documentation</option>
                      <option value="installation_verification">Installation Verification</option>
                      <option value="visit_exception">Visit Exception</option>
                    </select>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadTabData('field_ops')}
                      className="text-xs"
                    >
                      Filter
                    </Button>
                  </div>
                </div>

                {/* Sync Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Total Edge Syncs</div>
                    <div className="text-xl font-bold text-navy mt-0.5">{syncStats?.total ?? 0}</div>
                  </div>
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-emerald-700 font-bold uppercase">Applied Cleanly</div>
                    <div className="text-xl font-bold text-emerald-800 mt-0.5">{syncStats?.applied ?? 0}</div>
                  </div>
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-[10px] text-amber-700 font-bold uppercase">Conflicts Detected</div>
                    <div className="text-xl font-bold text-amber-800 mt-0.5">{syncStats?.conflicts ?? 0}</div>
                  </div>
                  <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                    <div className="text-[10px] text-rose-700 font-bold uppercase">Failed Sync Operations</div>
                    <div className="text-xl font-bold text-rose-800 mt-0.5">{syncStats?.failed ?? 0}</div>
                  </div>
                </div>

                {/* Sync Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase">
                        <th className="py-3 px-3">Synced At</th>
                        <th className="py-3 px-3">Operation ID</th>
                        <th className="py-3 px-3">Visit #</th>
                        <th className="py-3 px-3">Provider</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Sync Status</th>
                        <th className="py-3 px-3">Resolution &amp; Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {syncLogs.length > 0 ? (
                        syncLogs.map((log) => {
                          const isApplied = log.status === 'applied';
                          const isConflict = log.status === 'conflict';
                          const isFailed = log.status === 'failed';

                          return (
                            <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                                {new Date(log.syncedAt || log.createdAt).toLocaleDateString()} {new Date(log.syncedAt || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] font-semibold text-navy">
                                {log.clientOperationId}
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-primary">
                                {log.visitNumber}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-navy">{log.providerName}</div>
                                {log.providerPhone && (
                                  <div className="text-[11px] text-slate-400">{log.providerPhone}</div>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                                  {log.operationType?.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    isApplied
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isConflict
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {log.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 max-w-xs">
                                {isApplied && (
                                  <span className="text-emerald-700 font-medium">Applied to database without conflict</span>
                                )}
                                {isConflict && (
                                  <div className="text-amber-800">
                                    <div className="font-semibold">{log.conflictDetails?.reason || 'Status precondition mismatch'}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      Server was &apos;{log.conflictDetails?.serverStatus}&apos;, expected &apos;{log.conflictDetails?.expectedStatus}&apos;
                                    </div>
                                  </div>
                                )}
                                {isFailed && (
                                  <span className="text-rose-700 font-medium">{log.errorReason || 'Execution error'}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <Database size={32} className="mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-600">No offline sync operations recorded</p>
                            <p className="text-xs text-slate-400 mt-0.5">All clinician visits are currently in sync with the central database.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {syncPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-border">
                    <span>
                      Page {syncPagination.page} of {syncPagination.totalPages} ({syncPagination.total} sync operations)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={syncPagination.page <= 1}
                        onClick={() => {
                          setSyncPagination((prev) => ({ ...prev, page: prev.page - 1 }));
                          setTimeout(() => loadTabData('field_ops'), 0);
                        }}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={syncPagination.page >= syncPagination.totalPages}
                        onClick={() => {
                          setSyncPagination((prev) => ({ ...prev, page: prev.page + 1 }));
                          setTimeout(() => loadTabData('field_ops'), 0);
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUBTAB 3: PATIENT NOTIFICATIONS & CARRIER DISPATCHES */}
            {/* ========================================================================= */}
            {fieldOpsSubTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-navy">Patient &amp; Caregiver Notification Logs ({notifPagination.total})</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Carrier SMS and WhatsApp messaging dispatches. Sanitized logistical updates (no clinical diagnoses exposed).
                    </p>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search phone, recipient, text..."
                        value={notifSearch}
                        onChange={(e) => setNotifSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadTabData('field_ops')}
                        className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary w-48 sm:w-56"
                      />
                    </div>

                    <select
                      value={notifChannelFilter}
                      onChange={(e) => {
                        setNotifChannelFilter(e.target.value);
                        setTimeout(() => loadTabData('field_ops'), 0);
                      }}
                      className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                    >
                      <option value="all">All Channels</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="in_app">In-App Alerts</option>
                    </select>

                    <select
                      value={notifStatusFilter}
                      onChange={(e) => {
                        setNotifStatusFilter(e.target.value);
                        setTimeout(() => loadTabData('field_ops'), 0);
                      }}
                      className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                    >
                      <option value="all">All Statuses</option>
                      <option value="sent">Sent (Carrier Acknowledged)</option>
                      <option value="simulated">Simulated Gateway</option>
                      <option value="failed">Delivery Failed</option>
                    </select>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadTabData('field_ops')}
                      className="text-xs"
                    >
                      Filter
                    </Button>
                  </div>
                </div>

                {/* Notification Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase">
                        <th className="py-3 px-3">Dispatched</th>
                        <th className="py-3 px-3">Recipient</th>
                        <th className="py-3 px-3">Channel</th>
                        <th className="py-3 px-3">Template</th>
                        <th className="py-3 px-3">Message Body</th>
                        <th className="py-3 px-3">Gateway</th>
                        <th className="py-3 px-3">Delivery Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {notificationLogs.length > 0 ? (
                        notificationLogs.map((log) => {
                          const isSimulated = log.status === 'simulated' || log.provider === 'simulated_gateway';
                          const isFailed = log.status === 'failed';
                          const isSent = log.status === 'sent' || log.status === 'delivered';

                          return (
                            <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                                {new Date(log.sentAt || log.createdAt).toLocaleDateString()} {new Date(log.sentAt || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-navy">{log.recipientName}</div>
                                <div className="text-[11px] text-slate-500 font-mono">{log.recipientPhone}</div>
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    log.channel === 'whatsapp'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : log.channel === 'in_app'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {log.channel?.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono text-[10px] text-slate-600">
                                {log.templateId}
                              </td>
                              <td className="py-3 px-3 max-w-xs text-slate-700 truncate" title={log.messageBody}>
                                {log.messageBody}
                              </td>
                              <td className="py-3 px-3">
                                {isSimulated ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    Simulated Gateway
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                                    {log.provider}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {log.channel === 'in_app' ? (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      log.isRead
                                        ? 'bg-slate-100 text-slate-600'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {log.isRead ? 'Read' : 'Unread'}
                                  </span>
                                ) : (
                                  <>
                                    {isSent && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                        Delivered
                                      </span>
                                    )}
                                    {isSimulated && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                        Simulated
                                      </span>
                                    )}
                                    {isFailed && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800" title={log.failureReason}>
                                        Failed
                                      </span>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {log.channel === 'in_app' && !log.isRead && (
                                  <button
                                    onClick={() => handleMarkNotificationRead(log._id, log)}
                                    className="px-2.5 py-1 rounded text-xs font-semibold text-primary hover:bg-primary-light/50 transition mr-1.5"
                                  >
                                    Mark Read
                                  </button>
                                )}
                                {isFailed && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRetryNotification(log._id)}
                                    disabled={actionLoading}
                                    className="text-[11px] text-rose-700 hover:bg-rose-50 border-rose-300"
                                  >
                                    Retry
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            <Smartphone size={32} className="mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-600">No notifications sent yet</p>
                            <p className="text-xs text-slate-400 mt-0.5">Automated SMS and WhatsApp messages will appear here when appointments or visits progress.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {notifPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-border">
                    <span>
                      Page {notifPagination.page} of {notifPagination.totalPages} ({notifPagination.total} notifications)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={notifPagination.page <= 1}
                        onClick={() => {
                          setNotifPagination((prev) => ({ ...prev, page: prev.page - 1 }));
                          setTimeout(() => loadTabData('field_ops'), 0);
                        }}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={notifPagination.page >= notifPagination.totalPages}
                        onClick={() => {
                          setNotifPagination((prev) => ({ ...prev, page: prev.page + 1 }));
                          setTimeout(() => loadTabData('field_ops'), 0);
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ACCOUNTS MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'accounts' && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-navy">Patient &amp; Professional Accounts</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  View, filter, activate, or suspend platform user credentials with mandatory audit logging.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, phone (+91...), email, account ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadUsersData({ page: 1, search: userSearch })}
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary w-48 sm:w-64"
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserRoleFilter(val);
                    loadUsersData({ page: 1, role: val });
                  }}
                  className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                >
                  <option value="all">All Roles</option>
                  <option value="patient">Patients (Registered Mobile Users)</option>
                  <option value="caregiver">Family Caregivers</option>
                  <option value="professional">Professionals (Doctors/Nurses)</option>
                  <option value="hospital">Hospital Staff</option>
                  <option value="admin">Administrators</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserStatusFilter(val);
                    loadUsersData({ page: 1, status: val });
                  }}
                  className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending_verification">Pending Verification</option>
                </select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadUsersData({ page: 1 })}
                  disabled={isLoading}
                >
                  Filter
                </Button>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs divide-y divide-border">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Phone / Contact</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {users.length > 0 ? (
                    users.map((u) => {
                      const userId = u._id || u.id;
                      const isPatient = u.role === 'patient';
                      return (
                        <tr key={userId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-navy flex items-center gap-1.5">
                              {u.fullName}
                              {isPatient && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-medium">
                                  App Patient
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">{u.email || 'No email specified'}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {userId}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                              isPatient ? 'bg-primary-light/50 text-primary' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {u.role?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                            {u.phone}
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(u.status || (u.isActive === false ? 'suspended' : 'active'))}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPatient && (
                                <button
                                  onClick={() => setActiveTab('subscriptions')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-primary bg-primary-light/40 border border-primary/20 hover:bg-primary-light/70 transition-colors"
                                  title="View or activate Caregiver Plan in Caregiver Plans tab"
                                >
                                  Care Plan
                                </button>
                              )}
                              {u.role !== 'super_admin' && (
                                <button
                                  onClick={() =>
                                    handleToggleUserStatus(
                                      userId,
                                      u.status || (u.isActive === false ? 'suspended' : 'active')
                                    )
                                  }
                                  disabled={actionLoading}
                                  className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors ${
                                    u.status === 'suspended' || u.isActive === false
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                  }`}
                                >
                                  {u.status === 'suspended' || u.isActive === false ? 'Activate' : 'Suspend'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <p className="font-medium text-slate-600">No user accounts match the selected criteria.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Newly registered patients from the Patient Mobile App appear here under the &apos;Patients&apos; role filter.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {usersPagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>
                  Showing page {usersPagination.page} of {usersPagination.totalPages} ({usersPagination.total} total accounts)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={usersPagination.page <= 1}
                    onClick={() => {
                      loadUsersData({ page: usersPagination.page - 1 });
                    }}
                  >
                    <ChevronLeft size={14} /> Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={usersPagination.page >= usersPagination.totalPages}
                    onClick={() => {
                      loadUsersData({ page: usersPagination.page + 1 });
                    }}
                  >
                    Next <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PROFESSIONAL CREDENTIAL REVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'credentials' && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-navy">Professional Credential Reviews</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify medical council registrations, qualifications, and experience before activating doctors on the marketplace.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={credStatusFilter}
                  onChange={(e) => {
                    setCredStatusFilter(e.target.value);
                    setTimeout(() => loadTabData('credentials'), 0);
                  }}
                  className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                >
                  <option value="all">All Verification States</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>

                <Button size="sm" variant="outline" onClick={() => loadTabData('credentials')}>
                  Refresh Queue
                </Button>
              </div>
            </div>

            {/* Credentials Table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs divide-y divide-border">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Professional</th>
                    <th className="py-3 px-4">Council Reg Number</th>
                    <th className="py-3 px-4">Qualifications &amp; Degree</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4">Review State</th>
                    <th className="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {credentials.length > 0 ? (
                    credentials.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-navy">{c.userId?.fullName || 'Doctor / Specialist'}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{c.userId?.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                          {c.registrationNumber || 'Pending Submission'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-navy">{c.degree || 'MBBS / MD / BPT'}</div>
                          <div className="text-[11px] text-slate-500">{c.specialization?.join(', ') || 'General Palliative'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {c.yearsOfExperience ? `${c.yearsOfExperience} Years` : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(c.verificationStatus || 'pending')}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedCred(c);
                              setCredReviewStatus(
                                c.verificationStatus === 'pending' ? 'approved' : c.verificationStatus
                              );
                              setCredReviewNotes(c.reviewNotes || '');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-light text-primary hover:bg-primary hover:text-white transition-colors"
                          >
                            Review &amp; Transition
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No professional credential submissions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Credential Review Modal */}
            {selectedCred && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <h3 className="font-bold text-lg text-navy">
                      Credential Review: {selectedCred.userId?.fullName}
                    </h3>
                    <button onClick={() => setSelectedCred(null)} className="text-slate-400 hover:text-navy">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleReviewCredentialSubmit} className="space-y-4 pt-4">
                    <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5 border border-border">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Council Reg:</span>
                        <span className="font-mono font-semibold">{selectedCred.registrationNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Degree &amp; College:</span>
                        <span className="font-medium">{selectedCred.degree}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Status:</span>
                        <span>{getStatusBadge(selectedCred.verificationStatus)}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-navy mb-1.5">
                        Transition Verification State To:
                      </label>
                      <select
                        value={credReviewStatus}
                        onChange={(e) => setCredReviewStatus(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                      >
                        <option value="approved">Approved (Issue Badge &amp; Activate Scheduling)</option>
                        <option value="rejected">Rejected (Insufficient / Invalid Credentials)</option>
                        <option value="expired">Expired (License Expired / Annual Renewal Needed)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-navy mb-1.5">
                        Review Notes / Regulatory Audit Justification:
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="State reason for approval or rejection, verified council records, etc."
                        value={credReviewNotes}
                        onChange={(e) => setCredReviewNotes(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-navy mb-1.5">
                        License Expiry Date (Optional):
                      </label>
                      <input
                        type="date"
                        value={credReviewExpiry}
                        onChange={(e) => setCredReviewExpiry(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCred(null)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={actionLoading}>
                        {actionLoading ? 'Saving...' : 'Confirm Review Decision'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: HOSPITAL ORGANIZATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'hospitals' && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-navy">Partner Hospital Organizations</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Onboard health systems, institutional cancer centers, and palliative care departments.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => setShowOnboardModal(true)}
                  className="flex items-center gap-1.5"
                >
                  <Plus size={16} /> Onboard Hospital
                </Button>
              </div>
            </div>

            {/* Hospital Roster Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {hospitals.map((h) => (
                <div
                  key={h._id}
                  className="p-5 rounded-2xl border border-border bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-navy text-base">{h.hospitalName}</div>
                      {getStatusBadge(h.isActive === false ? 'inactive' : 'active')}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Building2 size={13} />
                      Reg: <span className="font-mono">{h.registrationNumber}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-2">
                      Location: {h.address?.city}, {h.address?.state} ({h.address?.pincode})
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Contact: <strong>{h.contactPerson?.name}</strong> ({h.contactPerson?.phone})
                    </div>
                    {h.accreditationLevel && (
                      <div className="mt-2.5 inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-primary">
                        {h.accreditationLevel}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Verification:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        h.verificationStatus === 'verified'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : h.verificationStatus === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {h.verificationStatus ? h.verificationStatus.toUpperCase() : 'PENDING VERIFICATION'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-500">
                      Beds: {h.bedCapacity || 100}+
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedHospitalForVerify(h);
                          setHospitalVerifyStatus(h.verificationStatus === 'verified' ? 'verified' : 'verified');
                          setHospitalVerifyNotes(h.verificationNotes || '');
                          setHospitalLicenseExpiry(h.licenseExpiryDate ? new Date(h.licenseExpiryDate).toISOString().slice(0, 10) : '');
                          setShowHospitalVerifyModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg font-semibold text-xs bg-navy text-white hover:bg-navy-light transition"
                      >
                        Verify / Review
                      </button>
                      <button
                        onClick={() => handleToggleHospitalStatus(h._id, h.isActive !== false)}
                        disabled={actionLoading}
                        className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                          h.isActive === false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {h.isActive === false ? 'Activate' : 'Suspend'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Onboard Hospital Modal */}
            {showOnboardModal && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <h3 className="font-bold text-lg text-navy">Onboard Hospital Partner</h3>
                    <button onClick={() => setShowOnboardModal(false)} className="text-slate-400 hover:text-navy">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleOnboardHospitalSubmit} className="space-y-4 pt-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-navy mb-1">Hospital Name *</label>
                        <input
                          type="text"
                          required
                          value={newHospitalForm.hospitalName}
                          onChange={(e) => setNewHospitalForm({ ...newHospitalForm, hospitalName: e.target.value })}
                          placeholder="e.g. Apollo Palliative & Oncology Care"
                          className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-navy mb-1">Registration / License Number *</label>
                        <input
                          type="text"
                          required
                          value={newHospitalForm.registrationNumber}
                          onChange={(e) => setNewHospitalForm({ ...newHospitalForm, registrationNumber: e.target.value })}
                          placeholder="e.g. HOSP-MUM-2026-99"
                          className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-navy mb-1">Contact Officer Name *</label>
                        <input
                          type="text"
                          required
                          value={newHospitalForm.contactName}
                          onChange={(e) => setNewHospitalForm({ ...newHospitalForm, contactName: e.target.value })}
                          placeholder="Dr. Rajesh Saxena"
                          className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-navy mb-1">Contact Phone *</label>
                        <input
                          type="text"
                          required
                          value={newHospitalForm.contactPhone}
                          onChange={(e) => setNewHospitalForm({ ...newHospitalForm, contactPhone: e.target.value })}
                          placeholder="9822011111"
                          className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-navy mb-1">Contact Email *</label>
                        <input
                          type="email"
                          required
                          value={newHospitalForm.contactEmail}
                          onChange={(e) => setNewHospitalForm({ ...newHospitalForm, contactEmail: e.target.value })}
                          placeholder="oncology@hospital.org"
                          className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-navy mb-1">Accreditation Level</label>
                        <select
                          value={newHospitalForm.accreditationLevel}
                          onChange={(e) => setNewHospitalForm({ ...newHospitalForm, accreditationLevel: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                        >
                          <option value="NABH_ACCREDITED">NABH Accredited</option>
                          <option value="JCI_ACCREDITED">JCI International</option>
                          <option value="STATE_GOVT_EMPANELLED">State Govt Empanelled</option>
                          <option value="COMMUNITY_CENTER">Community Care Center</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-navy mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={newHospitalForm.city}
                          onChange={(e) => setNewHospitalForm({ ...newHospitalForm, city: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-navy mb-1">State *</label>
                        <input
                          type="text"
                          required
                          value={newHospitalForm.state}
                          onChange={(e) => setNewHospitalForm({ ...newHospitalForm, state: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-navy mb-1">Pincode *</label>
                        <input
                          type="text"
                          required
                          value={newHospitalForm.pincode}
                          onChange={(e) => setNewHospitalForm({ ...newHospitalForm, pincode: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOnboardModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={actionLoading}>
                        {actionLoading ? 'Onboarding...' : 'Onboard Hospital Organization'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SERVICE CATALOG CONFIGURATION */}
        {/* ========================================================================= */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-navy">Healthcare Service Catalog Configuration</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable or disable palliative care services, configure home visit categories, and review pricing.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs divide-y divide-border">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">Service Code</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Base Fee (INR)</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Availability</th>
                    <th className="py-3 px-4 text-right">Toggle Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {services.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-navy">{s.name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{s.serviceCode}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 capitalize">
                          {s.category?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-navy">
                        ₹{s.pricing?.basePrice ?? s.price ?? 1200}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {s.durationMinutes ? `${s.durationMinutes} mins` : '60 mins'}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(s.isActive !== false ? 'active' : 'inactive')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleServiceAvailability(s._id, s.isActive !== false)}
                          disabled={actionLoading}
                          className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors ${
                            s.isActive !== false
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {s.isActive !== false ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: EXCEPTIONS & CARE COORDINATION */}
        {/* ========================================================================= */}
        {activeTab === 'exceptions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-xl font-bold text-navy mb-1">Operational Exception Triage Queue</h2>
              <p className="text-xs text-slate-500 mb-6">
                Direct intervention for unassigned patient visits, emergency hospital referrals, and care bundle delays.
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-navy flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} className="text-amber-500" />
                    Urgent Hospital Discharge Referrals Requiring Match (
                    {exceptions.urgentPendingReferrals?.length || 0})
                  </h3>

                  {exceptions.urgentPendingReferrals?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {exceptions.urgentPendingReferrals.map((r: any) => (
                        <div key={r._id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-navy text-sm">{r.patientName}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                              {r.urgency || 'HIGH'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600">
                            Hospital: <strong>{r.hospitalId?.hospitalName || 'Partner Cancer Institute'}</strong>
                          </div>
                          <div className="text-xs text-slate-600">
                            Diagnosis: {r.primaryDiagnosis} • Services: {r.requestedServices?.join(', ')}
                          </div>
                          <div className="pt-2 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">
                              Status: {r.status}
                            </span>
                            <Link
                              href="/hospital/dashboard"
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-navy text-white hover:bg-navy-light"
                            >
                              Open Referral Dossier
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No urgent hospital referrals awaiting matching.</p>
                  )}
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-bold text-navy flex items-center gap-2 mb-3">
                    <Clock size={16} className="text-primary" />
                    Unassigned Patient Home Bookings ({exceptions.unassignedBookings?.length || 0})
                  </h3>

                  {exceptions.unassignedBookings?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {exceptions.unassignedBookings.map((b: any) => (
                        <div key={b._id} className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-navy text-sm">
                              {b.bookingReference || b._id.substring(0, 8)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-200 text-blue-900 uppercase">
                              Unassigned
                            </span>
                          </div>
                          <div className="text-xs text-slate-600">
                            Service: <strong>{b.serviceId?.name || 'In-Home Visit'}</strong>
                          </div>
                          <div className="text-xs text-slate-600">
                            Date: {new Date(b.scheduledDate).toLocaleDateString()} at {b.timeSlot}
                          </div>
                          <div className="pt-2 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">
                              City: {b.deliveryAddress?.city || 'Mumbai'}
                            </span>
                            <button
                              onClick={() => alert(`Coordination routing dispatched for ${b.bookingReference}`)}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-hover"
                            >
                              Dispatch Specialist
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">All patient bookings have allocated medical professionals.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: SUPPORT TICKETS */}
        {/* ========================================================================= */}
        {activeTab === 'support' && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-navy">Operational Support Tickets</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resolve operational disputes or escalate safety/legal incidents to Super Administrators.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => loadTabData('support')}>
                Refresh Tickets
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs divide-y divide-border">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Ticket ID</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {supportTickets.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-navy">{t.ticketNumber}</td>
                      <td className="py-3.5 px-4 font-medium text-navy">{t.subject}</td>
                      <td className="py-3.5 px-4 uppercase text-[10px] text-slate-600 font-semibold">
                        {t.category}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.priority === 'CRITICAL' || t.priority === 'HIGH'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(t.status)}
                        {t.isEscalated && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-purple-100 text-purple-800 font-bold">
                            ESCALATED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedTicket(t);
                            setTicketNewStatus(t.status === 'open' ? 'in_progress' : t.status);
                            setTicketResolutionNotes(t.resolutionNotes || '');
                            setTicketEscalate(t.isEscalated || false);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-light text-primary hover:bg-primary hover:text-white transition-colors"
                        >
                          Triage &amp; Resolve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Support Ticket Modal */}
            {selectedTicket && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <h3 className="font-bold text-lg text-navy">
                      Triage Ticket: {selectedTicket.ticketNumber}
                    </h3>
                    <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-navy">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateTicketSubmit} className="space-y-4 pt-4 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-xl space-y-1 border border-border">
                      <div className="font-bold text-navy">{selectedTicket.subject}</div>
                      <p className="text-slate-600 mt-1">{selectedTicket.description}</p>
                    </div>

                    <div>
                      <label className="block font-semibold text-navy mb-1">Update Status:</label>
                      <select
                        value={ticketNewStatus}
                        onChange={(e) => setTicketNewStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                      >
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-navy mb-1">Resolution Notes:</label>
                      <textarea
                        rows={3}
                        required
                        value={ticketResolutionNotes}
                        onChange={(e) => setTicketResolutionNotes(e.target.value)}
                        placeholder="State clinical or operational resolution provided..."
                        className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="escalateCheckbox"
                        checked={ticketEscalate}
                        onChange={(e) => setTicketEscalate(e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <label htmlFor="escalateCheckbox" className="font-bold text-purple-900 cursor-pointer">
                        Escalate to Super Administrator (Leadership Governance)
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTicket(null)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={actionLoading}>
                        {actionLoading ? 'Updating...' : 'Save Ticket Resolution'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: AUDIT TRAIL */}
        {/* ========================================================================= */}
        {activeTab === 'audits' && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-navy">Platform Audit Log Stream</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable administrative action records for compliance with medical privacy and governance standards.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={auditCategoryFilter}
                  onChange={(e) => {
                    setAuditCategoryFilter(e.target.value);
                    setTimeout(() => loadTabData('audits'), 0);
                  }}
                  className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                >
                  <option value="all">All Categories</option>
                  <option value="USER_MANAGEMENT">User Management</option>
                  <option value="CREDENTIAL_REVIEW">Credential Reviews</option>
                  <option value="HOSPITAL_ONBOARDING">Hospital Onboarding</option>
                  <option value="SERVICE_CATALOG">Service Catalog</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>

                <select
                  value={auditSeverityFilter}
                  onChange={(e) => {
                    setAuditSeverityFilter(e.target.value);
                    setTimeout(() => loadTabData('audits'), 0);
                  }}
                  className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                >
                  <option value="all">All Severities</option>
                  <option value="INFO">Info</option>
                  <option value="WARNING">Warning</option>
                  <option value="CRITICAL">Critical</option>
                </select>

                <Button size="sm" variant="outline" onClick={() => loadTabData('audits')}>
                  Filter
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs divide-y divide-border">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white font-mono text-[11px]">
                  {auditLogs.map((l) => (
                    <tr key={l._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-navy">
                        {l.performedBy?.fullName || l.performedBy?.phone || 'System'}
                      </td>
                      <td className="py-3 px-4 font-bold text-primary">{l.action}</td>
                      <td className="py-3 px-4 text-slate-600">{l.category}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800'
                              : l.severity === 'WARNING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {l.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {JSON.stringify(l.details || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {auditPagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>
                  Showing page {auditPagination.page} of {auditPagination.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={auditPagination.page <= 1}
                    onClick={() => {
                      setAuditPagination((prev) => ({ ...prev, page: prev.page - 1 }));
                      setTimeout(() => loadTabData('audits'), 0);
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={auditPagination.page >= auditPagination.totalPages}
                    onClick={() => {
                      setAuditPagination((prev) => ({ ...prev, page: prev.page + 1 }));
                      setTimeout(() => loadTabData('audits'), 0);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: ORDERS & DME FULFILLMENT */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Header & Description */}
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                  <Package className="text-primary" size={22} />
                  Medical Product Orders &amp; DME Fulfillment
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Supervise patient medical device purchases and monthly rentals, advance order fulfillment statuses along permitted lifecycle paths, coordinate clinical technicians for home equipment installation, and inspect logistics milestones.
                </p>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by order #, patient name or phone..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadTabData('orders')}
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary w-52 sm:w-64"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => {
                    setOrderStatusFilter(e.target.value);
                    setTimeout(() => loadTabData('orders'), 0);
                  }}
                  className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white text-slate-700"
                >
                  <option value="all">All Order Statuses</option>
                  <option value="placed">Placed (New)</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={orderPaymentFilter}
                  onChange={(e) => {
                    setOrderPaymentFilter(e.target.value);
                    setTimeout(() => loadTabData('orders'), 0);
                  }}
                  className="px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white text-slate-700"
                >
                  <option value="all">All Payments</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadTabData('orders')}
                  disabled={isLoading}
                >
                  Filter
                </Button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Orders</div>
                  <div className="text-2xl font-black text-navy mt-1">{ordersPagination.total}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
                  <Package size={20} />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Placed / Pending</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {orders.filter((o) => o.orderStatus === 'placed').length}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock size={20} />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">In Transit</div>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    {orders.filter((o) => ['dispatched', 'out_for_delivery'].includes(o.orderStatus)).length}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Truck size={20} />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Clinician Setup Req.</div>
                  <div className="text-2xl font-black text-secondary mt-1">
                    {orders.filter((o) => o.installationPreferences?.required).length}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-secondary flex items-center justify-center">
                  <Wrench size={20} />
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
              <table className="w-full text-left text-xs divide-y divide-border">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Order # &amp; Date</th>
                    <th className="py-3 px-4">Patient / Recipient</th>
                    <th className="py-3 px-4">Items Summary</th>
                    <th className="py-3 px-4">Total &amp; Payment</th>
                    <th className="py-3 px-4">Fulfillment Status</th>
                    <th className="py-3 px-4">Clinical Setup</th>
                    <th className="py-3 px-4 text-right">Fulfillment Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {orders.length > 0 ? (
                    orders.map((o) => {
                      const hasRental = o.items?.some((i: any) => i.isRental);
                      const reqInstall = o.installationPreferences?.required;
                      const specialistAssigned = o.installationPreferences?.assignedSpecialistName;
                      const nextTransitions = getPermittedTransitions(o.orderStatus);

                      return (
                        <tr key={o._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-navy">{o.orderNumber}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(o.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            {hasRental && (
                              <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-semibold text-[10px]">
                                Monthly Rental
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">
                              {o.patientId?.fullName || o.shippingAddress?.fullName || 'Patient'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {o.patientId?.phone || o.shippingAddress?.phone}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                              {o.shippingAddress?.city}, {o.shippingAddress?.pincode}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="space-y-1">
                              {o.items?.slice(0, 2).map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-1.5 text-slate-700 truncate">
                                  <span className="font-semibold text-navy">{item.quantity}x</span>
                                  <span className="truncate">{item.name}</span>
                                  {item.isRental && (
                                    <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]">
                                      {item.rentalDurationMonths}m
                                    </span>
                                  )}
                                </div>
                              ))}
                              {o.items?.length > 2 && (
                                <div className="text-[10px] text-slate-400 font-medium">
                                  +{o.items.length - 2} more item(s)
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-navy">
                              ₹{o.totalAmount?.toLocaleString('en-IN')}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                  o.paymentStatus === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : o.paymentStatus === 'failed'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {o.paymentStatus?.toUpperCase()}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase">
                                {o.paymentMethod}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full font-semibold text-[11px] inline-flex items-center gap-1 ${
                                o.orderStatus === 'placed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : o.orderStatus === 'confirmed'
                                  ? 'bg-purple-100 text-purple-800'
                                  : o.orderStatus === 'dispatched'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : o.orderStatus === 'out_for_delivery'
                                  ? 'bg-amber-100 text-amber-800'
                                  : o.orderStatus === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : o.orderStatus === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {o.orderStatus?.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {reqInstall ? (
                              specialistAssigned ? (
                                <div>
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px] flex items-center gap-1 w-fit">
                                    <CheckCircle2 size={10} />
                                    {specialistAssigned}
                                  </span>
                                  {o.installationPreferences?.scheduledDate && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {new Date(o.installationPreferences.scheduledDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[10px] flex items-center gap-1 w-fit">
                                  <AlertTriangle size={10} />
                                  Needs Tech
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 text-[11px]">Not Required</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {nextTransitions.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOrder(o);
                                    setTargetStatus(nextTransitions[0]);
                                    setShowStatusModal(true);
                                  }}
                                  className="text-xs px-2.5 py-1 text-primary border-primary/30 hover:bg-primary-light/10"
                                >
                                  Update Status
                                </Button>
                              )}

                              {reqInstall && (
                                <button
                                  onClick={() => {
                                    setSelectedOrder(o);
                                    setSpecialistName(o.installationPreferences?.assignedSpecialistName || '');
                                    setSpecialistNotes(o.installationPreferences?.setupNotes || '');
                                    setShowSpecialistModal(true);
                                  }}
                                  title="Assign Healthcare Technician"
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-secondary hover:border-secondary transition-colors"
                                >
                                  <Wrench size={14} />
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedOrder(o);
                                  setTrackingEventStatus(o.orderStatus);
                                  setShowTrackingEventModal(true);
                                }}
                                title="Log Logistics Milestone"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-primary hover:border-primary transition-colors"
                              >
                                <Truck size={14} />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedOrder(o);
                                  setShowOrderDetailModal(true);
                                }}
                                title="Inspect Full Order"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-navy hover:border-navy transition-colors"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Package size={32} className="mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No medical product orders found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Try adjusting search filters or placed date range.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {ordersPagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>
                  Showing page {ordersPagination.page} of {ordersPagination.totalPages} ({ordersPagination.total} orders)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={ordersPagination.page <= 1}
                    onClick={() => {
                      setOrdersPagination((prev) => ({ ...prev, page: prev.page - 1 }));
                      setTimeout(() => loadTabData('orders'), 0);
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={ordersPagination.page >= ordersPagination.totalPages}
                    onClick={() => {
                      setOrdersPagination((prev) => ({ ...prev, page: prev.page + 1 }));
                      setTimeout(() => loadTabData('orders'), 0);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: ORDER STATUS TRANSITION (STATE-MACHINE ENFORCED) */}
        {/* ========================================================================= */}
        {showStatusModal && selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-navy text-lg">Update Fulfillment Status</h3>
                  <p className="text-xs text-slate-500">Order: {selectedOrder.orderNumber}</p>
                </div>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateOrderStatus} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Fulfillment Status
                  </label>
                  <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-700 uppercase">
                    {selectedOrder.orderStatus}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Permitted Target Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:border-primary focus:outline-none bg-white font-semibold capitalize"
                  >
                    {getPermittedTransitions(selectedOrder.orderStatus).map((st) => (
                      <option key={st} value={st}>
                        {st.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enforcing backend state machine rules: invalid transitions will be rejected with HTTP 400.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Milestone Message / Logistics Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Package packed at Regional Depot / Handed to BlueDart Express"
                    value={statusMessage}
                    onChange={(e) => setStatusMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Depot / Hub Location (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai Andheri Sorting Center"
                    value={statusLocation}
                    onChange={(e) => setStatusLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStatusModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={actionLoading || !targetStatus}
                    className="bg-navy hover:bg-navy-light text-white"
                  >
                    {actionLoading ? 'Transitioning...' : 'Confirm Transition'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: ASSIGN CLINICAL SPECIALIST */}
        {/* ========================================================================= */}
        {showSpecialistModal && selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-navy text-lg">Assign Installation Technician</h3>
                  <p className="text-xs text-slate-500">Order: {selectedOrder.orderNumber}</p>
                </div>
                <button
                  onClick={() => setShowSpecialistModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAssignSpecialist} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Healthcare Specialist Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma (Clinical Bio-Engineer)"
                    value={specialistName}
                    onChange={(e) => setSpecialistName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheduled Installation Date
                  </label>
                  <input
                    type="date"
                    value={specialistDate}
                    onChange={(e) => setSpecialistDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clinical Notes / Bedside Instructions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Special instructions regarding patient room, electrical points, or oxygen calibration..."
                    value={specialistNotes}
                    onChange={(e) => setSpecialistNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSpecialistModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={actionLoading || !specialistName.trim()}
                    className="bg-secondary hover:bg-secondary-dark text-white"
                  >
                    {actionLoading ? 'Assigning...' : 'Assign Technician'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: LOG LOGISTICS MILESTONE */}
        {/* ========================================================================= */}
        {showTrackingEventModal && selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-navy text-lg">Record Fulfillment Milestone</h3>
                  <p className="text-xs text-slate-500">Order: {selectedOrder.orderNumber}</p>
                </div>
                <button
                  onClick={() => setShowTrackingEventModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddTrackingEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Milestone Status Tag
                  </label>
                  <select
                    value={trackingEventStatus}
                    onChange={(e) => setTrackingEventStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:border-primary focus:outline-none bg-white font-semibold capitalize"
                  >
                    <option value="dispatched">Dispatched</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Milestone Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Shipment received at local courier facility, scanned for morning dispatch."
                    value={trackingEventMessage}
                    onChange={(e) => setTrackingEventMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Depot / City Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai Bandra Hub"
                    value={trackingEventLocation}
                    onChange={(e) => setTrackingEventLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTrackingEventModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={actionLoading || !trackingEventMessage.trim()}
                    className="bg-navy hover:bg-navy-light text-white"
                  >
                    {actionLoading ? 'Recording...' : 'Record Milestone'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: ORDER DETAILS INSPECTOR DRAWER */}
        {/* ========================================================================= */}
        {showOrderDetailModal && selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end">
            <div className="bg-white w-full max-w-xl h-full overflow-y-auto p-6 shadow-2xl border-l border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <span className="text-xs font-bold text-primary tracking-wider uppercase">Order Inspector</span>
                    <h3 className="font-extrabold text-navy text-xl mt-0.5">{selectedOrder.orderNumber}</h3>
                    <p className="text-xs text-slate-400">
                      Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowOrderDetailModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="py-4 space-y-6">
                  {/* Status & Payment summary */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium uppercase">Order Status</div>
                      <div className="font-bold text-navy text-sm mt-0.5 capitalize">
                        {selectedOrder.orderStatus?.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium uppercase">Payment Status</div>
                      <div className="font-bold text-slate-800 text-sm mt-0.5 uppercase flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            selectedOrder.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {selectedOrder.paymentStatus} ({selectedOrder.paymentMethod})
                      </div>
                      {(selectedOrder.refundAmount || 0) > 0 && (
                        <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                          Refunded: ₹{selectedOrder.refundAmount.toLocaleString('en-IN')}
                        </div>
                      )}
                      {(selectedOrder.paymentStatus === 'paid' || selectedOrder.paymentStatus === 'partially_refunded') && (
                        <button
                          onClick={() => {
                            const maxRefund = selectedOrder.totalAmount - (selectedOrder.refundAmount || 0);
                            setRefundAmount(maxRefund);
                            setRefundReason('');
                            setShowRefundModal(true);
                          }}
                          className="mt-2 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold transition flex items-center gap-1"
                        >
                          Process Refund
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items Breakdown */}
                  <div>
                    <h4 className="font-bold text-navy text-xs uppercase tracking-wider mb-2.5">
                      Ordered Products ({selectedOrder.items?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {selectedOrder.items?.map((it: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl border border-border bg-white"
                        >
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">{it.name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Quantity: {it.quantity} • Unit Price: ₹{it.unitPrice?.toLocaleString('en-IN')}
                            </div>
                            {it.isRental && (
                              <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-semibold text-[10px]">
                                Monthly Rental ({it.rentalDurationMonths} Month{it.rentalDurationMonths > 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-navy text-xs">
                            ₹{(it.unitPrice * it.quantity * (it.isRental ? it.rentalDurationMonths || 1 : 1)).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>₹{selectedOrder.subtotal?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Charges</span>
                      <span>₹{selectedOrder.deliveryCharge?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Applicable Tax (GST)</span>
                      <span>₹{selectedOrder.taxAmount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-navy pt-2 border-t border-slate-200 text-sm">
                      <span>Total Amount</span>
                      <span>₹{selectedOrder.totalAmount?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <h4 className="font-bold text-navy text-xs uppercase tracking-wider mb-2">
                      Shipping &amp; Delivery Address
                    </h4>
                    <div className="p-3 rounded-xl border border-border text-xs text-slate-700 space-y-0.5">
                      <div className="font-bold text-navy">{selectedOrder.shippingAddress?.fullName}</div>
                      <div>{selectedOrder.shippingAddress?.phone}</div>
                      <div>{selectedOrder.shippingAddress?.street}</div>
                      <div>
                        {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}
                      </div>
                    </div>
                  </div>

                  {/* Clinical Installation Info */}
                  {selectedOrder.installationPreferences?.required && (
                    <div>
                      <h4 className="font-bold text-navy text-xs uppercase tracking-wider mb-2">
                        Clinical Bedside Setup
                      </h4>
                      <div className="p-3 rounded-xl border border-teal-200 bg-teal-50/50 text-xs space-y-1">
                        <div className="font-semibold text-teal-900">
                          Technician:{' '}
                          {selectedOrder.installationPreferences.assignedSpecialistName || 'Pending Assignment'}
                        </div>
                        {selectedOrder.installationPreferences.scheduledDate && (
                          <div className="text-teal-700">
                            Scheduled:{' '}
                            {new Date(selectedOrder.installationPreferences.scheduledDate).toLocaleDateString()} (
                            {selectedOrder.installationPreferences.preferredSlot || 'Standard'})
                          </div>
                        )}
                        {selectedOrder.installationPreferences.setupNotes && (
                          <div className="text-teal-800 text-[11px] pt-1">
                            Notes: {selectedOrder.installationPreferences.setupNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tracking Timeline Log */}
                  <div>
                    <h4 className="font-bold text-navy text-xs uppercase tracking-wider mb-2">
                      Logistics Milestones &amp; Audit Trail
                    </h4>
                    <div className="space-y-2">
                      {selectedOrder.trackingUpdates?.length > 0 ? (
                        selectedOrder.trackingUpdates.map((ev: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-lg border border-border text-xs flex items-start gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                            <div>
                              <div className="font-semibold text-navy capitalize">
                                {ev.status?.replace('_', ' ')}
                              </div>
                              <p className="text-slate-600 mt-0.5">{ev.message}</p>
                              <div className="text-[10px] text-slate-400 mt-1">
                                {new Date(ev.timestamp).toLocaleString()} {ev.location ? `• ${ev.location}` : ''}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">No tracking milestones recorded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOrderDetailModal(false)}
                  className="w-full"
                >
                  Close Inspector
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: PROVIDER REASSIGNMENT & RESCHEDULING WITH AUDIT LOGGING */}
        {/* ========================================================================= */}
        {showReassignModal && selectedVisitForAssign && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border animate-in fade-in">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center">
                    <Navigation size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-navy">Reassign Field Visit Provider</h3>
                    <p className="text-xs text-slate-500">Visit {selectedVisitForAssign.visitNumber} ({selectedVisitForAssign.patientDetails?.fullName})</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReassignModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleReassignVisitSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Active Healthcare Professional / Caregiver *
                  </label>
                  <select
                    value={reassignProviderId}
                    onChange={(e) => {
                      const pId = e.target.value;
                      setReassignProviderId(pId);
                      const found = availableCaregivers.find((u) => (u._id || u.id) === pId);
                      if (found) {
                        setReassignProviderName(found.fullName);
                        setReassignProviderPhone(found.phone);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white mb-2"
                  >
                    <option value="">-- Choose from Registered Active Staff --</option>
                    {availableCaregivers.map((u) => (
                      <option key={u._id || u.id} value={u._id || u.id}>
                        {u.fullName} ({u.role?.toUpperCase()}) — +91 {u.phone}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Clinician Full Name *</label>
                      <input
                        type="text"
                        value={reassignProviderName}
                        onChange={(e) => setReassignProviderName(e.target.value)}
                        placeholder="e.g. Dr. Priya Deshmukh"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Mobile Contact *</label>
                      <input
                        type="text"
                        value={reassignProviderPhone}
                        onChange={(e) => setReassignProviderPhone(e.target.value)}
                        placeholder="e.g. 9820011003"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={reassignScheduledDate}
                      onChange={(e) => setReassignScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Time Slot
                    </label>
                    <select
                      value={reassignTimeSlot}
                      onChange={(e) => setReassignTimeSlot(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                    >
                      <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                      <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                      <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                      <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandatory Reassignment Reason (Recorded in Audit Log) *
                  </label>
                  <textarea
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    placeholder="e.g., Previous provider reported patient unavailable; reassigned for morning dressing change."
                    rows={3}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReassignModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={actionLoading}
                  >
                    Confirm Reassignment &amp; Audit
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: REJECT VISIT RESCHEDULE REQUEST */}
        {/* ========================================================================= */}
        {showRejectModal && selectedRescheduleForReject && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border animate-in fade-in">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                    <X size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-navy">Reject Reschedule Request</h3>
                    <p className="text-xs text-slate-500">Visit {selectedRescheduleForReject.visitNumber || selectedRescheduleForReject.visitId}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-border text-xs mb-4 space-y-1">
                <div><strong>Patient:</strong> {selectedRescheduleForReject.patientName}</div>
                <div><strong>Original:</strong> {selectedRescheduleForReject.originalScheduledDate} ({selectedRescheduleForReject.originalTimeSlot})</div>
                <div><strong>Requested:</strong> {selectedRescheduleForReject.requestedDate} ({selectedRescheduleForReject.requestedTimeSlot})</div>
                <div className="text-slate-500 italic">"Reason: {selectedRescheduleForReject.reason}"</div>
              </div>

              <form onSubmit={handleRejectRescheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandatory Reason for Rejection (Visible to Patient) *
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Caregiver unavailable in this sector at requested time. Original slot preserved."
                    rows={3}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRejectModal(false)}
                  >
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={actionLoading || !rejectReason.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition disabled:opacity-50"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CLINICAL CARE REPORT INSPECTOR & AUDIT */}
        {/* ========================================================================= */}
        {showReportModal && selectedVisitForReport && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-border animate-scale-up max-h-[90vh] flex flex-col">
              <div className="flex items-start justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-navy">Verified Bedside Care Report</h3>
                    <p className="text-xs text-slate-500">
                      Visit {selectedVisitForReport.visitNumber} • {selectedVisitForReport.patientDetails?.fullName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
                {/* Author & Timestamp */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-slate-500">Documented By: </span>
                    <strong className="text-navy">
                      {selectedVisitForReport.clinicalDocumentation?.signedBy?.name || selectedVisitForReport.providerName || 'Caregiver'}
                    </strong>{' '}
                    ({selectedVisitForReport.clinicalDocumentation?.signedBy?.role || selectedVisitForReport.providerRole || 'Nurse'})
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {selectedVisitForReport.clinicalDocumentation?.signedAt
                      ? new Date(selectedVisitForReport.clinicalDocumentation.signedAt).toLocaleString()
                      : '--'}
                  </div>
                </div>

                {/* Vitals Grid */}
                <div>
                  <h4 className="font-bold text-navy text-xs uppercase tracking-wider mb-2">
                    Surveillance Vitals
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-border">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Blood Pressure</div>
                      <div className="text-sm font-extrabold text-navy mt-0.5">
                        {selectedVisitForReport.clinicalDocumentation?.vitals?.bloodPressure || '--'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-border">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Pulse Rate</div>
                      <div className="text-sm font-extrabold text-navy mt-0.5">
                        {selectedVisitForReport.clinicalDocumentation?.vitals?.pulse ? `${selectedVisitForReport.clinicalDocumentation.vitals.pulse} bpm` : '--'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-border">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">SpO2 (Oxygen)</div>
                      <div className="text-sm font-extrabold text-secondary mt-0.5">
                        {selectedVisitForReport.clinicalDocumentation?.vitals?.spO2 ? `${selectedVisitForReport.clinicalDocumentation.vitals.spO2}%` : '--'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-border">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Temperature</div>
                      <div className="text-sm font-extrabold text-navy mt-0.5">
                        {selectedVisitForReport.clinicalDocumentation?.vitals?.temperature ? `${selectedVisitForReport.clinicalDocumentation.vitals.temperature}°F` : '--'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Procedures Performed */}
                {selectedVisitForReport.clinicalDocumentation?.tasksPerformed?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-navy text-xs uppercase tracking-wider mb-1.5">
                      Completed Interventions &amp; Procedures
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedVisitForReport.clinicalDocumentation.tasksPerformed.map((task: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                          ✓ {task}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observations & Clinical Notes */}
                <div>
                  <h4 className="font-bold text-navy text-xs uppercase tracking-wider mb-1.5">
                    Attending Clinician Observations
                  </h4>
                  <div className="p-3 bg-slate-50 rounded-xl border border-border text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selectedVisitForReport.clinicalDocumentation?.clinicalNotes || 'No specific notes recorded.'}
                  </div>
                </div>

                {/* Recommendations */}
                {selectedVisitForReport.clinicalDocumentation?.recommendations && (
                  <div>
                    <h4 className="font-bold text-navy text-xs uppercase tracking-wider mb-1.5">
                      Recommendations &amp; Follow-up
                    </h4>
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 leading-relaxed">
                      {selectedVisitForReport.clinicalDocumentation.recommendations}
                    </div>
                  </div>
                )}

                {/* Version History (Audit Trail) */}
                {selectedVisitForReport.clinicalDocumentation?.versionHistory?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-navy text-xs uppercase tracking-wider mb-1.5">
                      Clinical Document Revision History
                    </h4>
                    <div className="space-y-1.5">
                      {selectedVisitForReport.clinicalDocumentation.versionHistory.map((ver: any, vIdx: number) => (
                        <div key={vIdx} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs space-y-0.5">
                          <div className="flex justify-between font-semibold text-navy">
                            <span>Edited by {ver.editedBy?.name || 'Admin'} ({ver.editedBy?.role || 'Staff'})</span>
                            <span className="text-[11px] text-slate-400">{new Date(ver.editedAt).toLocaleString()}</span>
                          </div>
                          <div className="text-slate-600 italic">"Reason: {ver.reason}"</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/v1/visits/${selectedVisitForReport._id}/report/download?format=pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-dark transition flex items-center gap-1.5"
                  >
                    <Download size={14} />
                    Download PDF
                  </a>
                  <a
                    href={`/api/v1/visits/${selectedVisitForReport._id}/report/download?format=json`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1"
                  >
                    <Download size={13} />
                    JSON
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditReportNotes(selectedVisitForReport.clinicalDocumentation?.clinicalNotes || '');
                      setEditReportVitals(selectedVisitForReport.clinicalDocumentation?.vitals || {});
                      setEditReportReason('');
                      setShowEditReportModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition flex items-center gap-1.5"
                  >
                    <Edit3 size={13} />
                    Edit Report
                  </button>
                  <button
                    onClick={() => {
                      setDeleteReportReason('');
                      setShowDeleteReportModal(true);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    Soft Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: EDIT CLINICAL REPORT WITH AUDIT REASON */}
        {/* ========================================================================= */}
        {showEditReportModal && selectedVisitForReport && (
          <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border animate-in fade-in">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Edit3 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-navy">Edit Clinical Care Report</h3>
                    <p className="text-xs text-slate-500">Visit {selectedVisitForReport.visitNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditReportModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAdminEditReportSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 font-semibold mb-0.5">Blood Pressure</label>
                    <input
                      type="text"
                      value={editReportVitals?.bloodPressure || ''}
                      onChange={(e) => setEditReportVitals({ ...editReportVitals, bloodPressure: e.target.value })}
                      placeholder="120/80"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-semibold mb-0.5">SpO2 (%)</label>
                    <input
                      type="number"
                      value={editReportVitals?.spO2 || ''}
                      onChange={(e) => setEditReportVitals({ ...editReportVitals, spO2: Number(e.target.value) })}
                      placeholder="98"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clinical Notes &amp; Observations
                  </label>
                  <textarea
                    value={editReportNotes}
                    onChange={(e) => setEditReportNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandatory Reason for Amendment (Archived to Version History) *
                  </label>
                  <input
                    type="text"
                    value={editReportReason}
                    onChange={(e) => setEditReportReason(e.target.value)}
                    placeholder="e.g. Corrected transcription error in vitals."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEditReportModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={actionLoading}
                    disabled={!editReportReason.trim()}
                  >
                    Save Revision &amp; Audit
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: SOFT-DELETE CLINICAL REPORT */}
        {/* ========================================================================= */}
        {showDeleteReportModal && selectedVisitForReport && (
          <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border animate-in fade-in">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-navy">Soft-Delete Clinical Report</h3>
                    <p className="text-xs text-slate-500">Visit {selectedVisitForReport.visitNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteReportModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 mb-4 leading-relaxed">
                <strong>Audit Compliance Warning:</strong> This report will be flagged as soft-deleted and removed from patient/caregiver visibility, while the complete audit trail and deletion rationale are permanently logged for clinical governance.
              </div>

              <form onSubmit={handleAdminDeleteReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandatory Deletion Reason (Logged to Audit System) *
                  </label>
                  <textarea
                    value={deleteReportReason}
                    onChange={(e) => setDeleteReportReason(e.target.value)}
                    placeholder="e.g. Document was mistakenly submitted against wrong patient profile; re-entry required."
                    rows={3}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteReportModal(false)}
                  >
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={actionLoading || !deleteReportReason.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition disabled:opacity-50"
                  >
                    Confirm Soft Deletion
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DRAWER: IN-APP NOTIFICATIONS & ALERTS */}
        {/* ========================================================================= */}
        {showNotifDrawer && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
            <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-left border-l border-border">
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-navy text-white">
                <div className="flex items-center gap-2.5">
                  <Bell size={18} />
                  <h3 className="font-bold text-base">In-App Operations Alerts</h3>
                  {unreadNotifCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-500 text-white">
                      {unreadNotifCount} unread
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowNotifDrawer(false)}
                  className="text-white/70 hover:text-white p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {unreadNotifCount > 0 && (
                <div className="p-3 bg-slate-50 border-b border-border flex items-center justify-between">
                  <span className="text-xs text-slate-500">Unread notifications require review</span>
                  <button
                    onClick={handleMarkAllNotificationsRead}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Mark all as read
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {inAppNotifs.length > 0 ? (
                  inAppNotifs.map((notif) => {
                    const isUnread = !notif.isRead;
                    const isSubscription = notif.relatedEntityType === 'CaregiverSubscription' || notif.type === 'SUBSCRIPTION_ACTIVATED';
                    const isReschedule = notif.relatedEntityType === 'VisitRescheduleRequest' || notif.type?.includes('RESCHEDULE');

                    return (
                      <div
                        key={notif._id}
                        onClick={() => handleMarkNotificationRead(notif._id, notif)}
                        className={`p-4 hover:bg-slate-50/80 transition cursor-pointer flex items-start gap-3 ${
                          isUnread ? 'bg-primary-light/20' : ''
                        }`}
                      >
                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isUnread ? 'bg-primary' : 'bg-slate-300'}`} />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-navy">
                              {notif.type?.replace(/_/g, ' ') || 'Notification'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(notif.sentAt || notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 leading-snug">
                            {notif.messageBody}
                          </p>

                          <div className="flex items-center gap-2 pt-1">
                            {isSubscription && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                TEST MODE
                              </span>
                            )}
                            {isReschedule && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-primary">
                                Reschedule
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {new Date(notif.sentAt || notif.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-slate-400 p-4">
                    <Bell size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No In-App Alerts</p>
                    <p className="text-xs text-slate-400 mt-1">
                      New subscription activations, reschedule requests, and visit reports will appear here.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-border bg-slate-50 flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadTabData('field_ops')}
                  className="text-xs"
                >
                  <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setShowNotifDrawer(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* ========================================================================= */}
        {/* MODAL: ORDER REFUND PROCESSING */}
        {/* ========================================================================= */}
        {showRefundModal && selectedOrder && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-border animate-scale-up">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                    <CreditCard size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-navy">Process Order Refund</h3>
                    <p className="text-xs text-slate-500">Order: {selectedOrder.orderNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 mb-4 border border-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Order Amount:</span>
                  <span className="font-bold text-slate-900">₹{selectedOrder.totalAmount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Refunded:</span>
                  <span className="font-semibold text-rose-600">₹{(selectedOrder.refundAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Refund Available:</span>
                  <span className="font-bold text-emerald-600">
                    ₹{(selectedOrder.totalAmount - (selectedOrder.refundAmount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <form onSubmit={handleProcessRefundSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Refund Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedOrder.totalAmount - (selectedOrder.refundAmount || 0)}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Reason for Refund *
                  </label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Enter return reason, damaged item details, cancellation note..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowRefundModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || refundAmount <= 0}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Confirm &amp; Issue Refund
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: HOSPITAL PARTNER VERIFICATION */}
        {/* ========================================================================= */}
        {showHospitalVerifyModal && selectedHospitalForVerify && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-border animate-scale-up">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-navy">Verify Healthcare Partner</h3>
                    <p className="text-xs text-slate-500">{selectedHospitalForVerify.hospitalName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHospitalVerifyModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 mb-4 border border-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reg Number:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedHospitalForVerify.registrationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Accreditation:</span>
                  <span className="font-semibold text-slate-800">{selectedHospitalForVerify.accreditationLevel || 'NABH'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="text-slate-700">{selectedHospitalForVerify.address?.city}, {selectedHospitalForVerify.address?.state}</span>
                </div>
              </div>

              <form onSubmit={handleVerifyHospitalSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Verification Decision *
                  </label>
                  <select
                    value={hospitalVerifyStatus}
                    onChange={(e) => setHospitalVerifyStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                    required
                  >
                    <option value="verified">Verified &amp; Certified (Authentic partner)</option>
                    <option value="rejected">Rejected (Disqualified / Invalid licensing)</option>
                    <option value="pending">Pending Further Audit Documentation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    License / Accreditation Expiry Date
                  </label>
                  <input
                    type="date"
                    value={hospitalLicenseExpiry}
                    onChange={(e) => setHospitalLicenseExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Verification Notes &amp; Clinical Audit Reference
                  </label>
                  <textarea
                    value={hospitalVerifyNotes}
                    onChange={(e) => setHospitalVerifyNotes(e.target.value)}
                    placeholder="Enter director approval reference, NABH verification report ID..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowHospitalVerifyModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-navy hover:bg-navy-light transition disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Save Verification Decision
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
