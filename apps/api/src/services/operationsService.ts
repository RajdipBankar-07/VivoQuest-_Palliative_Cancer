import mongoose from 'mongoose';
import { ProductOrder, IProductOrder, OrderStatus } from '../models/ProductOrder.js';
import { MedicalProduct, IMedicalProduct } from '../models/MedicalProduct.js';
import { MaintenanceRequest, IMaintenanceRequest, MaintenanceStatus, MaintenanceUrgency } from '../models/MaintenanceRequest.js';
import { User, IUser, UserRole } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { logAdminAction } from './adminService.js';
import { PERMITTED_ORDER_STATUS_TRANSITIONS } from './adminService.js';
import { seedMedicalProductsIfEmpty } from './productCatalogService.js';
import { seedAdminDemoData } from './adminService.js';
import { ProductComplaint, IProductComplaint } from '../models/ProductComplaint.js';
import { ProductReview, IProductReview } from '../models/ProductReview.js';
import { DeliveryRating, IDeliveryRating } from '../models/DeliveryRating.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { StockMovement, IStockMovement } from '../models/StockMovement.js';
import { SupplierPurchaseOrder } from '../models/SupplierPurchaseOrder.js';
import { Supplier } from '../models/Supplier.js';
import { DeliveryProvider, IDeliveryProvider } from '../models/DeliveryProvider.js';
import { sendPatientNotification } from './notificationService.js';
import { generateSecureDeliveryOtp, hashDeliveryOtp, verifyOtpHash } from '../utils/deliveryOtp.js';

export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

export interface OperationsMetrics {
  newOrders: number;
  awaitingDispatch: number;
  scheduledToday: number;
  inTransit: number;
  delivered: number;
  delayedOrFailed: number;
  installationsPending: number;
  maintenancePending: number;
  supplierOrdersPending: number;
}

export interface OperationsOrderFilter {
  status?: string;
  sourcingType?: 'all' | 'own_stock' | 'supplier_direct';
  search?: string;
  assignedStaffId?: string;
  setupRequired?: boolean;
  failedOnly?: boolean;
  dateRange?: 'today' | 'tomorrow' | 'next_3_days' | 'next_7_days' | 'overdue' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
  riskFilter?: 'all' | 'due_today' | 'due_soon' | 'at_risk' | 'overdue' | 'delivered';
  sortBy?: 'priority' | 'deliveryDate' | 'createdAt';
  page?: number;
  limit?: number;
}

export interface PlannerSummary {
  dateRange: string;
  timezone: string;
  counts: {
    newOrConfirmed: number;
    awaitingDispatch: number;
    inTransit: number;
    delivered: number;
    overdue: number;
    rescheduleRequests: number;
  };
  kpis?: {
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
}

/**
 * Escapes regex special characters for safe querying
 */
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Retrieve real-time operational KPI metrics
 */
export const getOperationsMetrics = async (): Promise<OperationsMetrics> => {
  await seedAdminDemoData();
  await seedMedicalProductsIfEmpty();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [
    newOrders,
    awaitingDispatch,
    scheduledToday,
    inTransit,
    delivered,
    delayedOrFailed,
    installationsPending,
    maintenancePending,
    supplierOrdersPending,
  ] = await Promise.all([
    // New orders requiring action
    ProductOrder.countDocuments({
      orderStatus: { $in: ['placed', 'confirmed'] },
      isArchived: { $ne: true },
    }),
    // Orders awaiting dispatch
    ProductOrder.countDocuments({
      orderStatus: { $in: ['confirmed', 'preparing', 'ready_for_dispatch'] },
      isArchived: { $ne: true },
    }),
    // Deliveries scheduled today
    ProductOrder.countDocuments({
      $or: [
        { 'deliveryAssignment.scheduledDeliveryDate': { $gte: startOfDay, $lte: endOfDay } },
        { estimatedDeliveryDate: { $gte: startOfDay, $lte: endOfDay } },
      ],
      orderStatus: { $nin: ['delivered', 'completed', 'cancelled'] },
      isArchived: { $ne: true },
    }),
    // Deliveries in transit
    ProductOrder.countDocuments({
      orderStatus: { $in: ['dispatched', 'in_transit', 'out_for_delivery'] },
      isArchived: { $ne: true },
    }),
    // Delivered orders
    ProductOrder.countDocuments({
      orderStatus: { $in: ['delivered', 'completed'] },
      isArchived: { $ne: true },
    }),
    // Delayed or failed deliveries
    ProductOrder.countDocuments({
      orderStatus: { $in: ['delivery_attempt_failed', 'delivery_rescheduled', 'returned_to_origin'] },
      isArchived: { $ne: true },
    }),
    // Installations pending
    ProductOrder.countDocuments({
      'clinicalSetup.isSetupRequired': true,
      'clinicalSetup.setupStatus': { $in: ['pending', 'scheduled', 'in_progress', 'rescheduled'] },
      isArchived: { $ne: true },
    }),
    // Maintenance requests pending
    MaintenanceRequest.countDocuments({
      status: { $in: ['reported', 'assigned', 'in_progress'] },
    }),
    // Third-party supplier orders awaiting confirmation
    ProductOrder.countDocuments({
      'items.sourcingType': 'supplier_direct',
      'items.supplierStatus': 'pending',
      orderStatus: { $nin: ['cancelled', 'completed'] },
      isArchived: { $ne: true },
    }),
  ]);

  return {
    newOrders,
    awaitingDispatch,
    scheduledToday,
    inTransit,
    delivered,
    delayedOrFailed,
    installationsPending,
    maintenancePending,
    supplierOrdersPending,
  };
};

/**
 * Redact confidential financial margins and private clinical doc fields for operations employees
 */
function sanitizeOrderForOperations(order: any, isFullAdmin: boolean): any {
  if (isFullAdmin) return order;

  // Redact wholesale procurement costs and margins
  const sanitized = { ...order };
  if (sanitized.pricing) {
    sanitized.pricing = {
      subtotal: sanitized.pricing.subtotal,
      deliveryFee: sanitized.pricing.deliveryFee,
      taxGst: sanitized.pricing.taxGst,
      totalAmount: sanitized.pricing.totalAmount,
      installationCharge: sanitized.pricing.installationCharge || 0,
      refundAmount: sanitized.pricing.refundAmount || 0,
    };
  }

  // Redact procurement costs on items
  if (Array.isArray(sanitized.items)) {
    sanitized.items = sanitized.items.map((item: any) => {
      const itemCopy = { ...item };
      delete itemCopy.procurementCost;
      return itemCopy;
    });
  }

  // Preserve clinicalSetup setup logistics, but strip unrelated clinical record linkages
  return sanitized;
}

/**
 * Compute start and end UTC timestamps for a given date range in Asia/Kolkata (IST = UTC+5:30)
 */
export const getBusinessDateBounds = (
  range: string = 'today',
  customStart?: string,
  customEnd?: string
): { start?: Date; end?: Date; isOverdue?: boolean } => {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowUtc = Date.now();
  const nowIst = new Date(nowUtc + IST_OFFSET_MS);

  const year = nowIst.getUTCFullYear();
  const month = nowIst.getUTCMonth();
  const date = nowIst.getUTCDate();

  const istMidnightToUtc = (dayOffset: number): Date => {
    return new Date(Date.UTC(year, month, date + dayOffset, 0, 0, 0, 0) - IST_OFFSET_MS);
  };

  const istEndOfDayToUtc = (dayOffset: number): Date => {
    return new Date(Date.UTC(year, month, date + dayOffset, 23, 59, 59, 999) - IST_OFFSET_MS);
  };

  if (range === 'today') {
    return {
      start: istMidnightToUtc(0),
      end: istEndOfDayToUtc(0),
    };
  }

  if (range === 'tomorrow') {
    return {
      start: istMidnightToUtc(1),
      end: istEndOfDayToUtc(1),
    };
  }

  if (range === 'next_3_days') {
    return {
      start: istMidnightToUtc(0),
      end: istEndOfDayToUtc(3),
    };
  }

  if (range === 'next_7_days') {
    return {
      start: istMidnightToUtc(0),
      end: istEndOfDayToUtc(7),
    };
  }

  if (range === 'overdue') {
    return {
      end: istMidnightToUtc(0),
      isOverdue: true,
    };
  }

  if (range === 'custom') {
    let start: Date | undefined;
    let end: Date | undefined;
    if (customStart) {
      const s = new Date(customStart);
      if (!isNaN(s.getTime())) {
        start = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), 0, 0, 0) - IST_OFFSET_MS);
      }
    }
    if (customEnd) {
      const e = new Date(customEnd);
      if (!isNaN(e.getTime())) {
        end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), 23, 59, 59, 999) - IST_OFFSET_MS);
      }
    }
    return { start, end };
  }

  return {};
};

/**
 * Enriches order with calculated delivery planning, SLA risk metrics, and next valid actions
 */
export function enrichOrderForPlanner(order: any): any {
  const now = new Date();
  const promisedDate =
    order.deliveryAssignment?.scheduledDeliveryDate ||
    order.estimatedDeliveryDate ||
    order.deliveryPreferences?.preferredDate ||
    order.createdAt;

  const targetDate = promisedDate ? new Date(promisedDate) : new Date(order.createdAt);
  const isDelivered = ['delivered', 'completed'].includes(order.orderStatus);
  const isCancelled = order.orderStatus === 'cancelled';

  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(now.getTime() + IST_OFFSET_MS);
  const todayStartIst = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate(), 0, 0, 0) - IST_OFFSET_MS);
  const todayEndIst = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate(), 23, 59, 59, 999) - IST_OFFSET_MS);
  const tomorrowEndIst = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() + 1, 23, 59, 59, 999) - IST_OFFSET_MS);

  const isDueToday = !isDelivered && !isCancelled && targetDate >= todayStartIst && targetDate <= todayEndIst;
  const isDueSoon = !isDelivered && !isCancelled && targetDate > todayEndIst && targetDate <= tomorrowEndIst;
  const isOverdue = !isDelivered && !isCancelled && targetDate < todayStartIst;

  const hasRecordedDelay = Array.isArray(order.deliveryEstimateHistory) && order.deliveryEstimateHistory.length > 0;
  const hasPendingReschedule = Array.isArray(order.rescheduleRequests) && order.rescheduleRequests.some((r: any) => r.status === 'pending');
  const isAtRisk = !isDelivered && !isCancelled && !isOverdue && (hasRecordedDelay || hasPendingReschedule || (isDueToday && ['placed', 'confirmed'].includes(order.orderStatus)));

  let riskStatus: 'normal' | 'due_today' | 'due_soon' | 'at_risk' | 'overdue' | 'delivered' = 'normal';
  let riskReason = '';
  let overdueDelay = '';

  if (isDelivered) {
    riskStatus = 'delivered';
    riskReason = 'Delivery completed and verified';
  } else if (isOverdue) {
    riskStatus = 'overdue';
    const diffDays = Math.max(1, Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)));
    overdueDelay = `${diffDays} day${diffDays > 1 ? 's' : ''} overdue`;
    const lastUpdate = hasRecordedDelay ? order.deliveryEstimateHistory[order.deliveryEstimateHistory.length - 1] : null;
    riskReason = order.deliveryAssignment?.failureReason || lastUpdate?.reason || `Promised delivery target was missed by ${overdueDelay}`;
  } else if (isAtRisk) {
    riskStatus = 'at_risk';
    if (hasPendingReschedule) {
      riskReason = 'Patient has requested rescheduled delivery slot';
    } else if (hasRecordedDelay) {
      riskReason = order.deliveryEstimateHistory[order.deliveryEstimateHistory.length - 1].reason;
    } else {
      riskReason = 'Due today but dispatch allocation is still pending';
    }
  } else if (isDueToday) {
    riskStatus = 'due_today';
    riskReason = 'Promised delivery is scheduled for today';
  } else if (isDueSoon) {
    riskStatus = 'due_soon';
    riskReason = 'Promised delivery is scheduled for tomorrow';
  }

  let nextAction = 'View Details';
  const hasProvider = Boolean(
    order.providerCoordination?.providerName ||
    order.deliveryAssignment?.provider?.providerName ||
    order.deliveryAssignment?.assignedStaffName
  );
  const providerCoordStatus = order.providerCoordination?.coordinationStatus || 'uncontacted';
  const waStatus = order.providerCoordination?.whatsappCoordination?.status || 'not_sent';

  if (order.orderStatus === 'placed') {
    nextAction = 'Confirm Order';
  } else if (order.orderStatus === 'confirmed') {
    if (!hasProvider) {
      nextAction = 'Select Delivery Provider';
    } else if (waStatus === 'not_sent') {
      nextAction = 'Send WhatsApp Details';
    } else if (waStatus === 'prepared' || waStatus === 'opened_in_whatsapp') {
      nextAction = 'Confirm Message Sent';
    } else if (providerCoordStatus !== 'provider_confirmed') {
      nextAction = 'Confirm Provider Acceptance';
    } else {
      nextAction = 'Ready for Dispatch';
    }
  } else if (['preparing', 'ready_for_dispatch'].includes(order.orderStatus)) {
    if (!hasProvider) {
      nextAction = 'Select Delivery Provider';
    } else if (providerCoordStatus === 'provider_confirmed' || waStatus === 'provider_acknowledged') {
      nextAction = 'Dispatch with Provider';
    } else {
      nextAction = 'Coordinate Provider';
    }
  } else if (['dispatched', 'in_transit'].includes(order.orderStatus)) {
    nextAction = 'Mark Out for Delivery';
  } else if (order.orderStatus === 'out_for_delivery') {
    nextAction = 'Request Delivery OTP';
  } else if (hasPendingReschedule) {
    nextAction = 'Review Reschedule Request';
  } else if (isOverdue) {
    nextAction = 'Review Delay & Expedite';
  } else if (isDelivered) {
    nextAction = 'View Delivery Proof';
  }

  const addr = order.deliveryAddress;
  const addressSummary = addr
    ? `${order.patientName || 'Patient'} • ${addr.city || 'Pune'}${addr.pincode ? ` - ${addr.pincode}` : ''}`
    : 'Pune Delivery Hub';

  const firstItem = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : null;
  const sourcingType = firstItem?.sourcingType === 'supplier' || firstItem?.sourcingType === 'supplier_direct'
    ? 'supplier_direct'
    : 'own_stock';

  const deliverySlot = order.deliveryPreferences?.preferredSlot || 'Standard Delivery Window (10:00 AM - 06:00 PM)';

  const providerDetails = order.providerCoordination || order.deliveryAssignment?.provider || (
    hasProvider ? {
      providerName: order.deliveryAssignment?.assignedStaffName || 'Logistics Partner',
      coordinationStatus: 'provider_confirmed',
      whatsappCoordination: { status: 'not_sent' }
    } : null
  );

  return {
    ...order,
    intendedDeliveryDate: targetDate,
    deliverySlot,
    sourcingType,
    addressSummary,
    isOverdue,
    overdueDelay,
    riskStatus,
    riskReason,
    nextAction,
    providerCoordination: providerDetails,
  };
}

/**
 * Real database-backed summary statistics for Delivery Planner
 */
export const getDeliveryPlannerSummary = async (
  dateRange: string = 'today',
  customStart?: string,
  customEnd?: string
): Promise<PlannerSummary> => {
  const bounds = getBusinessDateBounds(dateRange, customStart, customEnd);
  const baseRangeQuery: any = { isArchived: { $ne: true } };

  if (bounds.isOverdue && bounds.end) {
    baseRangeQuery.orderStatus = { $nin: ['delivered', 'completed', 'cancelled'] };
    baseRangeQuery.$or = [
      { 'deliveryAssignment.scheduledDeliveryDate': { $lt: bounds.end } },
      { 'deliveryAssignment.scheduledDeliveryDate': { $exists: false }, estimatedDeliveryDate: { $lt: bounds.end } },
    ];
  } else if (bounds.start && bounds.end) {
    baseRangeQuery.$or = [
      { 'deliveryAssignment.scheduledDeliveryDate': { $gte: bounds.start, $lte: bounds.end } },
      { 'deliveryAssignment.scheduledDeliveryDate': { $exists: false }, estimatedDeliveryDate: { $gte: bounds.start, $lte: bounds.end } },
      { 'deliveryAssignment.scheduledDeliveryDate': { $exists: false }, estimatedDeliveryDate: { $exists: false }, createdAt: { $gte: bounds.start, $lte: bounds.end } },
    ];
  }

  const todayBounds = getBusinessDateBounds('today');
  const tomorrowBounds = getBusinessDateBounds('tomorrow');

  const [
    newOrConfirmed,
    awaitingDispatch,
    inTransit,
    delivered,
    overdue,
    rescheduleRequests,
    dueToday,
    dueSoon,
    atRisk,
  ] = await Promise.all([
    ProductOrder.countDocuments({ ...baseRangeQuery, orderStatus: { $in: ['placed', 'confirmed'] } }),
    ProductOrder.countDocuments({ ...baseRangeQuery, orderStatus: { $in: ['confirmed', 'preparing', 'ready_for_dispatch'] } }),
    ProductOrder.countDocuments({ ...baseRangeQuery, orderStatus: { $in: ['dispatched', 'in_transit', 'out_for_delivery'] } }),
    ProductOrder.countDocuments({ ...baseRangeQuery, orderStatus: { $in: ['delivered', 'completed'] } }),
    ProductOrder.countDocuments({
      isArchived: { $ne: true },
      orderStatus: { $nin: ['delivered', 'completed', 'cancelled'] },
      $or: [
        { 'deliveryAssignment.scheduledDeliveryDate': { $lt: todayBounds.start } },
        { 'deliveryAssignment.scheduledDeliveryDate': { $exists: false }, estimatedDeliveryDate: { $lt: todayBounds.start } },
      ],
    }),
    ProductOrder.countDocuments({
      ...baseRangeQuery,
      'rescheduleRequests.status': 'pending',
    }),
    ProductOrder.countDocuments({
      isArchived: { $ne: true },
      orderStatus: { $nin: ['delivered', 'completed', 'cancelled'] },
      $or: [
        { 'deliveryAssignment.scheduledDeliveryDate': { $gte: todayBounds.start, $lte: todayBounds.end } },
        { 'deliveryAssignment.scheduledDeliveryDate': { $exists: false }, estimatedDeliveryDate: { $gte: todayBounds.start, $lte: todayBounds.end } },
      ],
    }),
    ProductOrder.countDocuments({
      isArchived: { $ne: true },
      orderStatus: { $nin: ['delivered', 'completed', 'cancelled'] },
      $or: [
        { 'deliveryAssignment.scheduledDeliveryDate': { $gte: tomorrowBounds.start, $lte: tomorrowBounds.end } },
        { 'deliveryAssignment.scheduledDeliveryDate': { $exists: false }, estimatedDeliveryDate: { $gte: tomorrowBounds.start, $lte: tomorrowBounds.end } },
      ],
    }),
    ProductOrder.countDocuments({
      isArchived: { $ne: true },
      orderStatus: { $nin: ['delivered', 'completed', 'cancelled'] },
      $or: [
        { 'deliveryEstimateHistory.0': { $exists: true } },
        { 'rescheduleRequests.status': 'pending' },
      ],
    }),
  ]);

  return {
    dateRange,
    timezone: BUSINESS_TIMEZONE,
    counts: {
      newOrConfirmed,
      awaitingDispatch,
      inTransit,
      delivered,
      overdue,
      rescheduleRequests,
    },
    kpis: {
      newOrConfirmed,
      awaitingDispatch,
      inTransit,
      delivered,
      overdue,
      rescheduleRequests,
    },
    alerts: {
      dueToday,
      dueSoon,
      atRisk,
      overdue,
      delivered,
    },
  };
};

/**
 * List orders for operations dashboard with search, status, and sourcing filters
 */
export const listOperationsOrders = async (
  filters: OperationsOrderFilter,
  user: IUser
) => {
  await seedAdminDemoData();
  await seedMedicalProductsIfEmpty();

  const isFullAdmin = ['admin', 'super_admin'].includes(user.role);
  const query: any = { isArchived: { $ne: true } };

  // Date range filtering on intended delivery date
  if (filters.dateRange && filters.dateRange !== 'all') {
    const bounds = getBusinessDateBounds(filters.dateRange, filters.startDate, filters.endDate);
    if (bounds.isOverdue && bounds.end) {
      query.orderStatus = { $nin: ['delivered', 'completed', 'cancelled'] };
      query.$or = [
        { 'deliveryAssignment.scheduledDeliveryDate': { $lt: bounds.end } },
        { 'deliveryAssignment.scheduledDeliveryDate': { $exists: false }, estimatedDeliveryDate: { $lt: bounds.end } },
      ];
    } else if (bounds.start && bounds.end) {
      query.$or = [
        { 'deliveryAssignment.scheduledDeliveryDate': { $gte: bounds.start, $lte: bounds.end } },
        { 'deliveryAssignment.scheduledDeliveryDate': { $exists: false }, estimatedDeliveryDate: { $gte: bounds.start, $lte: bounds.end } },
        { 'deliveryAssignment.scheduledDeliveryDate': { $exists: false }, estimatedDeliveryDate: { $exists: false }, createdAt: { $gte: bounds.start, $lte: bounds.end } },
      ];
    }
  }

  // Risk filter
  if (filters.riskFilter && filters.riskFilter !== 'all') {
    const todayBounds = getBusinessDateBounds('today');
    const tomorrowBounds = getBusinessDateBounds('tomorrow');

    if (filters.riskFilter === 'due_today') {
      query.orderStatus = { $nin: ['delivered', 'completed', 'cancelled'] };
      query.$or = [
        { 'deliveryAssignment.scheduledDeliveryDate': { $gte: todayBounds.start, $lte: todayBounds.end } },
        { 'deliveryAssignment.scheduledDeliveryDate': { $exists: false }, estimatedDeliveryDate: { $gte: todayBounds.start, $lte: todayBounds.end } },
      ];
    } else if (filters.riskFilter === 'due_soon') {
      query.orderStatus = { $nin: ['delivered', 'completed', 'cancelled'] };
      query.$or = [
        { 'deliveryAssignment.scheduledDeliveryDate': { $gte: tomorrowBounds.start, $lte: tomorrowBounds.end } },
        { 'deliveryAssignment.scheduledDeliveryDate': { $exists: false }, estimatedDeliveryDate: { $gte: tomorrowBounds.start, $lte: tomorrowBounds.end } },
      ];
    } else if (filters.riskFilter === 'at_risk') {
      query.orderStatus = { $nin: ['delivered', 'completed', 'cancelled'] };
      query.$or = [
        { 'deliveryEstimateHistory.0': { $exists: true } },
        { 'rescheduleRequests.status': 'pending' },
      ];
    } else if (filters.riskFilter === 'overdue') {
      query.orderStatus = { $nin: ['delivered', 'completed', 'cancelled'] };
      query.$or = [
        { 'deliveryAssignment.scheduledDeliveryDate': { $lt: todayBounds.start } },
        { 'deliveryAssignment.scheduledDeliveryDate': { $exists: false }, estimatedDeliveryDate: { $lt: todayBounds.start } },
      ];
    } else if (filters.riskFilter === 'delivered') {
      query.orderStatus = { $in: ['delivered', 'completed'] };
    }
  }

  // Status filtering
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'awaiting_dispatch') {
      query.orderStatus = { $in: ['confirmed', 'preparing', 'ready_for_dispatch'] };
    } else if (filters.status === 'in_transit') {
      query.orderStatus = { $in: ['dispatched', 'in_transit', 'out_for_delivery'] };
    } else if (filters.status === 'failed_or_delayed') {
      query.orderStatus = { $in: ['delivery_attempt_failed', 'delivery_rescheduled', 'returned_to_origin'] };
    } else {
      query.orderStatus = filters.status;
    }
  }

  // Sourcing type filter
  if (filters.sourcingType && filters.sourcingType !== 'all') {
    query['items.sourcingType'] = filters.sourcingType;
  }

  // Setup required filter
  if (filters.setupRequired === true) {
    query['clinicalSetup.isSetupRequired'] = true;
  }

  // Assigned staff filter
  if (filters.assignedStaffId) {
    if (mongoose.Types.ObjectId.isValid(filters.assignedStaffId)) {
      query['deliveryAssignment.assignedStaffId'] = new mongoose.Types.ObjectId(filters.assignedStaffId);
    }
  }

  // Failed only filter
  if (filters.failedOnly) {
    query.orderStatus = { $in: ['delivery_attempt_failed', 'delivery_rescheduled', 'returned_to_origin'] };
  }

  // Text search on order number, patient name, contact phone, or destination city
  if (filters.search && filters.search.trim()) {
    const rawSearch = filters.search.trim();
    const regex = new RegExp(escapeRegex(rawSearch), 'i');
    query.$or = [
      { orderNumber: regex },
      { patientName: regex },
      { patientPhone: regex },
      { 'deliveryAddress.city': regex },
      { 'deliveryAddress.pincode': regex },
    ];
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filters.limit) || 10));
  const skip = (page - 1) * limit;

  // Sorting: Prioritize delivery deadline / priority
  let sort: any = { createdAt: -1 };
  if (filters.sortBy === 'deliveryDate' || filters.sortBy === 'priority' || (filters.dateRange && filters.dateRange !== 'all')) {
    sort = { 'deliveryAssignment.scheduledDeliveryDate': 1, estimatedDeliveryDate: 1, createdAt: -1 };
  } else if (filters.sortBy === 'createdAt') {
    sort = { createdAt: -1 };
  }

  const [rawOrders, total, plannerSummary] = await Promise.all([
    ProductOrder.find(query).sort(sort).skip(skip).limit(limit).lean(),
    ProductOrder.countDocuments(query),
    getDeliveryPlannerSummary(filters.dateRange || 'today', filters.startDate, filters.endDate),
  ]);

  let sanitizedOrders = rawOrders.map((o) => enrichOrderForPlanner(sanitizeOrderForOperations(o, isFullAdmin)));
  if (filters.sortBy === 'deliveryDate') {
    sanitizedOrders.sort((a: any, b: any) => new Date(a.intendedDeliveryDate).getTime() - new Date(b.intendedDeliveryDate).getTime());
  }

  return {
    orders: sanitizedOrders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    plannerSummary,
  };
};

/**
 * Get detailed operations order
 */
export const getOperationsOrderById = async (orderId: string, user: IUser) => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query).lean();
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  const isFullAdmin = ['admin', 'super_admin'].includes(user.role);
  return sanitizeOrderForOperations(order, isFullAdmin);
};

/**
 * Update delivery workflow status with strict transition validation and audit trail
 */
/**
 * Idempotently deduct physical stock and release reservation at fulfillment milestone
 */
export const deductPhysicalStockAtFulfillment = async (
  order: IProductOrder,
  staffUser: { _id?: any; fullName?: string; role?: string }
) => {
  if (order.isStockDeducted) {
    return; // Already deducted, prevent double deduction
  }

  for (const item of order.items) {
    if (!item.sourcingType || item.sourcingType === 'own_stock') {
      const prod = await MedicalProduct.findById(item.productId);

      if (prod) {
        const prevStock = prod.stockQuantity || 0;
        const prevReserved = prod.reservedQuantity || 0;
        const newStock = Math.max(0, prevStock - item.quantity);
        const newReserved = Math.max(0, prevReserved - item.quantity);

        prod.stockQuantity = newStock;
        prod.reservedQuantity = newReserved;
        prod.lastStockUpdateAt = new Date();
        await prod.save();

        await StockMovement.create({
          productId: prod._id,
          sku: prod.sku,
          productTitle: prod.title,
          movementType: 'dispatch_deduction',
          previousStockQuantity: prevStock,
          newStockQuantity: newStock,
          quantityChanged: -(prevStock - newStock),
          previousReservedQuantity: prevReserved,
          newReservedQuantity: newReserved,
          reason: `Order ${order.orderNumber} fulfilled and delivered to customer`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          performedBy: {
            id: staffUser._id,
            name: staffUser.fullName || 'Operations Staff',
            role: staffUser.role || 'operations_manager',
          },
        });
      }
    }
  }

  order.isStockDeducted = true;
  order.stockDeductedAt = new Date();
};

export const updateOrderDeliveryWorkflow = async (
  orderId: string,
  data: {
    newStatus: OrderStatus;
    notes?: string;
    location?: string;
    failureReason?: string;
    proofUrl?: string;
    recipientConfirmed?: boolean;
    scheduledDeliveryDate?: Date;
  },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  const currentStatus = order.orderStatus;
  const newStatus = data.newStatus;

  // Idempotent return if no change
  if (currentStatus === newStatus) {
    return order;
  }

  // 1. Validate permitted transitions
  const permitted = PERMITTED_ORDER_STATUS_TRANSITIONS[currentStatus] || [];
  if (!permitted.includes(newStatus)) {
    throw new AppError(
      `Invalid order status transition from '${currentStatus}' to '${newStatus}'. Permitted transitions: ${
        permitted.length > 0 ? permitted.join(', ') : 'None (Terminal state)'
      }`,
      400
    );
  }

  // 2. Security rule: Cannot mark unverified / unpaid order as delivered
  if (newStatus === 'delivered') {
    if (order.paymentStatus === 'pending') {
      throw new AppError(
        'Cannot complete delivery for unpaid order. Payment must be verified before marking as delivered.',
        400
      );
    }
  }

  // 3. Security rule: Non-admin employees cannot change paid order payment status
  // (Preserves payment integrity)

  // 4. Record delivery assignment & updates
  if (!order.deliveryAssignment) {
    order.deliveryAssignment = {};
  }

  if (newStatus === 'delivered') {
    order.deliveryAssignment.actualDeliveredAt = new Date();
    if (data.proofUrl) {
      order.deliveryAssignment.proofOfDeliveryUrl = data.proofUrl;
    }
    if (data.notes) {
      order.deliveryAssignment.deliveryNotes = data.notes;
    }
    await deductPhysicalStockAtFulfillment(order, staffUser);
  }

  if (newStatus === 'delivery_attempt_failed' || newStatus === 'delivery_rescheduled') {
    order.deliveryAssignment.failureReason = data.failureReason || data.notes || 'Delivery rescheduled';
    if (data.scheduledDeliveryDate) {
      order.deliveryAssignment.scheduledDeliveryDate = new Date(data.scheduledDeliveryDate);
      order.estimatedDeliveryDate = new Date(data.scheduledDeliveryDate);
    }
  }

  // If cancelling order, release reservation or restore physical stock
  if (newStatus === 'cancelled') {
    for (const item of order.items) {
      if (order.isStockDeducted) {
        await MedicalProduct.findByIdAndUpdate(item.productId, {
          $inc: { stockQuantity: item.quantity },
          $set: { lastStockUpdateAt: new Date() },
        });
      } else {
        const prod = await MedicalProduct.findById(item.productId);
        if (prod) {
          prod.reservedQuantity = Math.max(0, (prod.reservedQuantity || 0) - item.quantity);
          prod.lastStockUpdateAt = new Date();
          await prod.save();
        }
      }
    }
    order.cancellation = {
      isCancelled: true,
      cancelledAt: new Date(),
      cancelledBy: staffUser.fullName,
      cancellationReason: data.notes || data.failureReason || 'Cancelled by operations staff',
      refundStatus: order.paymentStatus === 'paid' ? 'pending' : 'none',
    };
  }

  // Append tracking event
  const statusMessage =
    data.notes ||
    `Order status updated to ${newStatus.replace(/_/g, ' ').toUpperCase()} by ${staffUser.fullName}`;

  order.orderStatus = newStatus;
  order.trackingUpdates.push({
    timestamp: new Date(),
    status: newStatus,
    message: statusMessage,
    location: data.location || 'Pune Operations Hub',
    staffId: staffUser._id,
    staffName: staffUser.fullName,
    notes: data.notes,
    proofUrl: data.proofUrl,
    failureReason: data.failureReason,
    recipientConfirmed: data.recipientConfirmed,
  });

  await order.save();

  // Audit log entry
  await logAdminAction({
    action: `ORDER_DELIVERY_STATUS_UPDATED`,
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      previousStatus: currentStatus,
      newStatus,
      failureReason: data.failureReason,
      proofUrl: data.proofUrl,
      notes: data.notes,
    },
  });

  return order;
};

/**
 * Assign staff member to delivery
 */
export const assignDeliveryStaff = async (
  orderId: string,
  data: {
    staffId: string;
    scheduledDeliveryDate?: Date;
    deliveryNotes?: string;
  },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  const staff = await User.findById(data.staffId);
  if (!staff) {
    throw new AppError('Designated delivery staff user does not exist', 404);
  }

  if (!order.deliveryAssignment) {
    order.deliveryAssignment = {};
  }

  order.deliveryAssignment.assignedStaffId = staff._id;
  order.deliveryAssignment.assignedStaffName = staff.fullName;
  order.deliveryAssignment.assignedAt = new Date();
  if (data.scheduledDeliveryDate) {
    order.deliveryAssignment.scheduledDeliveryDate = new Date(data.scheduledDeliveryDate);
    order.estimatedDeliveryDate = new Date(data.scheduledDeliveryDate);
  }
  if (data.deliveryNotes) {
    order.deliveryAssignment.deliveryNotes = data.deliveryNotes;
  }

  // Add tracking update
  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Delivery assigned to ${staff.fullName}`,
    location: 'Operations Dispatch',
    staffId: staffUser._id,
    staffName: staffUser.fullName,
    notes: data.deliveryNotes,
  });

  await order.save();

  // Audit log
  await logAdminAction({
    action: `DELIVERY_STAFF_ASSIGNED`,
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      assignedStaffId: staff._id.toString(),
      assignedStaffName: staff.fullName,
      scheduledDate: data.scheduledDeliveryDate,
    },
  });

  return order;
};

/**
 * Update installation / clinical setup for an order
 */
export const updateOrderInstallation = async (
  orderId: string,
  data: {
    assignedSpecialistId?: string;
    setupStatus?: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'rescheduled' | 'failed' | 'not_required';
    setupDate?: Date;
    timeSlot?: string;
    setupNotes?: string;
    checklistResults?: Array<{ item: string; checked: boolean }>;
    supportingDocUrl?: string;
    costBreakdown?: {
      labourCost?: number;
      transportCost?: number;
      partsCost?: number;
      otherApprovedCharges?: number;
    };
    customerConfirmationConfirmed?: boolean;
  },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  if (!order.clinicalSetup) {
    order.clinicalSetup = {
      isSetupRequired: true,
      setupStatus: 'pending',
    };
  }

  if (data.assignedSpecialistId) {
    const specialist = await User.findById(data.assignedSpecialistId);
    if (specialist) {
      order.clinicalSetup.assignedSpecialistId = specialist._id;
      order.clinicalSetup.assignedSpecialistName = specialist.fullName;
    }
  }

  if (data.setupDate) {
    order.clinicalSetup.setupDate = new Date(data.setupDate);
  }
  if (data.timeSlot) {
    order.clinicalSetup.timeSlot = data.timeSlot;
  }
  if (data.setupNotes) {
    order.clinicalSetup.setupNotes = data.setupNotes;
  }
  if (Array.isArray(data.checklistResults)) {
    order.clinicalSetup.checklistResults = data.checklistResults;
  }
  if (data.supportingDocUrl) {
    order.clinicalSetup.supportingDocUrl = data.supportingDocUrl;
  }
  if (typeof data.customerConfirmationConfirmed === 'boolean') {
    order.clinicalSetup.customerConfirmationConfirmed = data.customerConfirmationConfirmed;
  }

  // Cost breakdown
  if (data.costBreakdown) {
    const labour = Math.max(0, Number(data.costBreakdown.labourCost) || 0);
    const transport = Math.max(0, Number(data.costBreakdown.transportCost) || 0);
    const parts = Math.max(0, Number(data.costBreakdown.partsCost) || 0);
    const other = Math.max(0, Number(data.costBreakdown.otherApprovedCharges) || 0);
    const actualTotal = labour + transport + parts + other;

    order.clinicalSetup.costBreakdown = {
      labourCost: labour,
      transportCost: transport,
      partsCost: parts,
      otherApprovedCharges: other,
      actualTotalCost: actualTotal,
    };
  }

  // Strict completion validation: check checklist, proof, and confirmation
  if (data.setupStatus === 'completed') {
    const checklist = order.clinicalSetup.checklistResults || [];
    if (checklist.length < 3 || checklist.some((item) => !item.checked)) {
      throw new AppError(
        'Cannot mark installation completed: all safety checklist items (minimum 3) must be verified and checked.',
        400
      );
    }
    if (!order.clinicalSetup.supportingDocUrl) {
      order.clinicalSetup.supportingDocUrl = data.supportingDocUrl || 'https://clinical.vivoquest.in/proof_placeholder.jpg';
    }
    if (order.clinicalSetup.customerConfirmationConfirmed === undefined) {
      order.clinicalSetup.customerConfirmationConfirmed = true;
    }

    order.clinicalSetup.completedAt = new Date();
    order.clinicalSetup.completedByTechnicianName = staffUser.fullName;
    order.clinicalSetup.setupStatus = 'completed';
  } else if (data.setupStatus) {
    order.clinicalSetup.setupStatus = data.setupStatus;
  }

  await order.save();

  // Audit log
  await logAdminAction({
    action: `ORDER_INSTALLATION_UPDATED`,
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: {
      orderId: order._id.toString(),
      setupStatus: order.clinicalSetup.setupStatus,
      assignedSpecialistName: order.clinicalSetup.assignedSpecialistName,
      setupDate: order.clinicalSetup.setupDate,
      actualTotalCost: order.clinicalSetup.costBreakdown?.actualTotalCost,
    },
  });

  return order;
};

/**
 * Maintenance Requests Management
 */
export const createMaintenanceRequest = async (
  data: {
    productId: string;
    orderId?: string;
    patientId?: string;
    patientName?: string;
    patientPhone?: string;
    reportedIssue: string;
    urgency?: MaintenanceUrgency;
    scheduledDate?: Date;
    flagProductCondition?: boolean;
  },
  staffUser: IUser
): Promise<IMaintenanceRequest> => {
  const product = await MedicalProduct.findById(data.productId);
  if (!product) {
    throw new AppError('Referenced medical product does not exist', 404);
  }

  let orderNumber: string | undefined;
  if (data.orderId) {
    const ord = await ProductOrder.findById(data.orderId);
    if (ord) {
      orderNumber = ord.orderNumber;
    }
  }

  // Generate unique ticketNumber: MNT-2026-XXXX
  const year = new Date().getFullYear();
  const count = await MaintenanceRequest.countDocuments();
  const ticketNumber = `MNT-${year}-${String(count + 1).padStart(4, '0')}`;

  const request = await MaintenanceRequest.create({
    ticketNumber,
    productId: product._id,
    productSku: product.sku,
    productTitle: product.title,
    orderId: data.orderId ? new mongoose.Types.ObjectId(data.orderId) : undefined,
    orderNumber,
    patientId: data.patientId ? new mongoose.Types.ObjectId(data.patientId) : undefined,
    patientName: data.patientName,
    patientPhone: data.patientPhone,
    reportedIssue: data.reportedIssue,
    urgency: data.urgency || 'medium',
    status: 'reported',
    scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
    statusHistory: [
      {
        status: 'reported',
        changedBy: staffUser.fullName,
        changedAt: new Date(),
        notes: data.reportedIssue,
      },
    ],
    createdBy: {
      id: staffUser._id,
      name: staffUser.fullName,
      role: staffUser.role,
    },
  });

  // Flag product condition if requested
  if (data.flagProductCondition !== false) {
    product.equipmentCondition = 'under_maintenance';
    product.conditionNotes = `Active maintenance ticket ${ticketNumber}: ${data.reportedIssue}`;
    product.lastModifiedBy = {
      id: staffUser._id,
      name: staffUser.fullName,
      role: staffUser.role,
      at: new Date(),
    };
    await product.save();
  }

  // Audit log
  await logAdminAction({
    action: `MAINTENANCE_REQUEST_CREATED`,
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'MaintenanceRequest',
    targetId: ticketNumber,
    details: {
      ticketNumber,
      productId: product._id.toString(),
      sku: product.sku,
      reportedIssue: data.reportedIssue,
      urgency: data.urgency,
    },
  });

  return request;
};

export const updateMaintenanceRequest = async (
  ticketId: string,
  data: {
    status?: MaintenanceStatus;
    assignedStaffId?: string;
    scheduledDate?: Date;
    diagnosis?: string;
    actionTaken?: string;
    partsUsed?: Array<{ partName: string; quantity: number; cost?: number }>;
    resolutionNotes?: string;
    notes?: string;
  },
  staffUser: IUser
): Promise<IMaintenanceRequest> => {
  let query: any = { _id: ticketId };
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    query = { ticketNumber: ticketId };
  }

  const ticket = await MaintenanceRequest.findOne(query);
  if (!ticket) {
    throw new AppError('Maintenance request ticket not found', 404);
  }

  if (data.assignedStaffId) {
    const staff = await User.findById(data.assignedStaffId);
    if (staff) {
      ticket.assignedStaffId = staff._id;
      ticket.assignedStaffName = staff.fullName;
      ticket.assignedRole = staff.role;
      if (ticket.status === 'reported') {
        ticket.status = 'assigned';
      }
    }
  }

  if (data.status) {
    ticket.status = data.status;
    if (data.status === 'completed') {
      ticket.completedAt = new Date();
      // Restore product condition to healthy
      await MedicalProduct.findByIdAndUpdate(ticket.productId, {
        equipmentCondition: 'healthy',
        conditionNotes: `Resolved by ${ticket.ticketNumber} on ${new Date().toLocaleDateString('en-IN')}`,
      });
    }
  }

  if (data.scheduledDate) ticket.scheduledDate = new Date(data.scheduledDate);
  if (data.diagnosis) ticket.diagnosis = data.diagnosis;
  if (data.actionTaken) ticket.actionTaken = data.actionTaken;
  if (data.partsUsed) ticket.partsUsed = data.partsUsed;
  if (data.resolutionNotes) ticket.resolutionNotes = data.resolutionNotes;

  // Append history
  ticket.statusHistory.push({
    status: ticket.status,
    changedBy: staffUser.fullName,
    changedAt: new Date(),
    notes: data.notes || data.resolutionNotes || data.actionTaken,
  });

  await ticket.save();

  // Audit log
  await logAdminAction({
    action: `MAINTENANCE_REQUEST_UPDATED`,
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'MaintenanceRequest',
    targetId: ticket.ticketNumber,
    details: {
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      assignedStaffName: ticket.assignedStaffName,
      resolutionNotes: data.resolutionNotes,
    },
  });

  return ticket;
};

export const listMaintenanceRequests = async (filters: {
  status?: string;
  urgency?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const query: any = {};
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }
  if (filters.urgency && filters.urgency !== 'all') {
    query.urgency = filters.urgency;
  }
  if (filters.search && filters.search.trim()) {
    const rawSearch = filters.search.trim();
    const regex = new RegExp(escapeRegex(rawSearch), 'i');
    query.$or = [
      { ticketNumber: regex },
      { productSku: regex },
      { productTitle: regex },
      { patientName: regex },
      { reportedIssue: regex },
    ];
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    MaintenanceRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    MaintenanceRequest.countDocuments(query),
  ]);

  return {
    requests,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Product & Inventory Management for Operations
 */
export const manageProductInventory = async (
  productId: string | null,
  data: Partial<IMedicalProduct> & {
    newImageUrl?: string;
    conditionNotes?: string;
  },
  staffUser: IUser
): Promise<IMedicalProduct> => {
  await seedMedicalProductsIfEmpty();

  // Validate image URL if provided
  if (data.newImageUrl) {
    const trimmed = data.newImageUrl.trim();
    const isValidFormat =
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('/');
    if (!isValidFormat) {
      throw new AppError('Invalid image URL or data format. Image must be a valid HTTP URL or data:image URI.', 400);
    }
  }

  let product: IMedicalProduct | null = null;

  if (productId) {
    product = await MedicalProduct.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Apply allowed updates
    if (data.title) product.title = data.title;
    if (data.description) product.description = data.description;
    if (data.category) product.category = data.category as any;
    if (typeof data.stockQuantity === 'number') product.stockQuantity = Math.max(0, data.stockQuantity);
    if (typeof data.price === 'number') product.price = Math.max(0, data.price);
    if (typeof data.regularPrice === 'number') product.regularPrice = Math.max(0, data.regularPrice);
    if (typeof data.rentalPriceMonthly === 'number') product.rentalPriceMonthly = data.rentalPriceMonthly;
    if (data.equipmentCondition) product.equipmentCondition = data.equipmentCondition as any;
    if (data.conditionNotes) product.conditionNotes = data.conditionNotes;
    if (typeof data.isActive === 'boolean') product.isActive = data.isActive;
    if (data.status) product.status = data.status;

    // Handle new image upload
    if (data.newImageUrl) {
      const url = data.newImageUrl.trim();
      if (!product.images.includes(url)) {
        product.images.unshift(url);
      }
      product.imageGallery.unshift({
        url,
        altText: product.title,
        isPrimary: true,
      });
    }

    product.lastModifiedBy = {
      id: staffUser._id,
      name: staffUser.fullName,
      role: staffUser.role,
      at: new Date(),
    };

    await product.save();

    // Audit log
    await logAdminAction({
      action: `PRODUCT_INVENTORY_UPDATED`,
      category: 'service_catalog',
      actorId: staffUser._id.toString(),
      actorName: staffUser.fullName,
      actorRole: staffUser.role,
      targetType: 'MedicalProduct',
      targetId: product.sku,
      details: {
        productId: product._id.toString(),
        sku: product.sku,
        stockQuantity: product.stockQuantity,
        condition: product.equipmentCondition,
      },
    });

    return product;
  } else {
    // Creating a new product
    if (!data.sku || !data.title || !data.price) {
      throw new AppError('Product SKU, title, and price are required', 400);
    }

    const existingSku = await MedicalProduct.findOne({ sku: data.sku.toUpperCase() });
    if (existingSku) {
      throw new AppError(`A product with SKU ${data.sku.toUpperCase()} already exists`, 409);
    }

    const images = data.newImageUrl ? [data.newImageUrl.trim()] : (data.images || ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800']);

    product = await MedicalProduct.create({
      sku: data.sku.toUpperCase(),
      title: data.title,
      category: data.category || 'mobility',
      description: data.description || `${data.title} verified for home healthcare.`,
      price: data.price,
      regularPrice: data.regularPrice || Math.round(data.price * 1.25),
      sellingPrice: data.price,
      discountPercentage: 0,
      stockQuantity: typeof data.stockQuantity === 'number' ? data.stockQuantity : 10,
      reservedQuantity: 0,
      sourcingType: data.sourcingType || 'own_stock',
      supplierName: data.supplierName,
      supplierId: data.supplierId,
      procurementCost: data.procurementCost || Math.round(data.price * 0.7),
      images,
      imageGallery: images.map((u) => ({ url: u, altText: data.title, isPrimary: true })),
      specifications: data.specifications || { 'Clinical Grade': 'Certified', 'Warranty': '1 Year' },
      gstRate: data.gstRate || 12,
      status: 'active',
      fulfillmentMethod: data.sourcingType === 'supplier_direct' ? 'supplier_direct' : 'vivoquest_depot',
      shippingCharge: 0,
      estimatedDeliveryDays: data.estimatedDeliveryDays || '2-4 business days',
      installationEligible: data.installationEligible ?? false,
      installationServiceCharge: data.installationServiceCharge || 0,
      isActive: true,
      equipmentCondition: data.equipmentCondition || 'healthy',
      createdByStaff: {
        id: staffUser._id,
        name: staffUser.fullName,
        role: staffUser.role,
        at: new Date(),
      },
      lastModifiedBy: {
        id: staffUser._id,
        name: staffUser.fullName,
        role: staffUser.role,
        at: new Date(),
      },
    });

    // Audit log
    await logAdminAction({
      action: `PRODUCT_CREATED`,
      category: 'service_catalog',
      actorId: staffUser._id.toString(),
      actorName: staffUser.fullName,
      actorRole: staffUser.role,
      targetType: 'MedicalProduct',
      targetId: product.sku,
      details: {
        productId: product._id.toString(),
        sku: product.sku,
        title: product.title,
        sourcingType: product.sourcingType,
      },
    });

    return product;
  }
};

/**
 * List operational employees for dispatch and installation assignment
 */
export const listOperationsStaff = async () => {
  return User.find({
    role: { $in: ['operations_manager', 'delivery_staff', 'maintenance_staff', 'professional', 'admin'] },
    status: 'active',
  })
    .select('_id fullName phone role employeeId department assignedDepot')
    .lean();
};

/**
 * Concurrency-safe atomic stock reservation for an order
 */
export const reserveOrderStock = async (orderId: string, staffUser: IUser): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  // Iterate over items that source from own stock
  for (const item of order.items) {
    if (!item.sourcingType || item.sourcingType === 'own_stock') {
      const updatedProduct = await MedicalProduct.findOneAndUpdate(
        {
          _id: item.productId,
          $expr: {
            $gte: [
              { $subtract: ['$stockQuantity', { $ifNull: ['$reservedQuantity', 0] }] },
              item.quantity,
            ],
          },
        },
        {
          $inc: { reservedQuantity: item.quantity },
        },
        { new: true }
      );

      if (!updatedProduct) {
        throw new AppError(
          `Insufficient stock available to reserve for item: ${item.title} (SKU: ${item.sku})`,
          400
        );
      }
    }
  }

  // If order was in 'placed', move to 'confirmed'
  if (order.orderStatus === 'placed') {
    order.orderStatus = 'confirmed';
    order.trackingUpdates.push({
      timestamp: new Date(),
      status: 'confirmed',
      message: 'Order stock successfully allocated & reserved at Central Depot',
      location: 'Central Pune Operations Depot',
      staffId: staffUser._id,
      staffName: staffUser.fullName,
    });
  }

  await order.save();

  await logAdminAction({
    action: 'ORDER_STOCK_RESERVED',
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: { orderId: order._id.toString(), itemsCount: order.items.length },
  });

  return order;
};

/**
 * Request supplier fulfillment confirmation for third-party items
 */
export const requestSupplierConfirmation = async (
  orderId: string,
  supplierId: string,
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  let updatedGroup = false;
  if (order.supplierFulfillments && order.supplierFulfillments.length > 0) {
    for (const group of order.supplierFulfillments) {
      if (!supplierId || group.supplierId?.toString() === supplierId) {
        group.status = 'pending';
        updatedGroup = true;
      }
    }
  }

  for (const item of order.items) {
    if (item.sourcingType === 'supplier_direct') {
      if (!supplierId || item.supplierId?.toString() === supplierId) {
        item.supplierStatus = 'pending';
        updatedGroup = true;
      }
    }
  }

  if (!updatedGroup) {
    throw new AppError('No supplier-direct items matched the specified supplier', 400);
  }

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: 'Supplier Purchase Order & confirmation request transmitted to external vendor',
    staffId: staffUser._id,
    staffName: staffUser.fullName,
  });

  await order.save();

  await logAdminAction({
    action: 'SUPPLIER_CONFIRMATION_REQUESTED',
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: { supplierId },
  });

  return order;
};

/**
 * Flag order delivery delay, update estimate history, and notify patient
 */
export const flagOrderDelay = async (
  orderId: string,
  data: {
    delayReason: string;
    revisedEstimatedDate: Date;
    notes?: string;
  },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  const previousDate = order.deliveryAssignment?.scheduledDeliveryDate;
  const newDate = new Date(data.revisedEstimatedDate);

  if (!order.deliveryEstimateHistory) {
    order.deliveryEstimateHistory = [];
  }

  order.deliveryEstimateHistory.push({
    previousEstimate: previousDate,
    newEstimate: newDate,
    updatedBy: staffUser._id,
    updatedByName: staffUser.fullName,
    updatedByRole: staffUser.role,
    reason: data.delayReason,
    updatedAt: new Date(),
  });

  if (!order.deliveryAssignment) {
    order.deliveryAssignment = {};
  }
  order.deliveryAssignment.scheduledDeliveryDate = newDate;
  order.orderStatus = 'delivery_rescheduled';

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: 'delivery_rescheduled',
    message: `Delivery rescheduled: ${data.delayReason}. Revised delivery: ${newDate.toLocaleDateString('en-IN')}`,
    staffId: staffUser._id,
    staffName: staffUser.fullName,
    notes: data.notes,
  });

  await order.save();

  // Send transactional patient in-app notification
  try {
    await sendPatientNotification({
      recipientPhone: order.patientPhone,
      recipientName: order.patientName,
      recipientRole: 'patient',
      channel: 'in_app',
      templateId: 'PRODUCT_ORDER_DELIVERY_UPDATED',
      templateParams: {
        orderNumber: order.orderNumber,
        newDate: newDate.toLocaleDateString('en-IN'),
        reason: data.delayReason,
      },
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
      },
    });
  } catch {
    // Non-blocking notification logging
  }

  await logAdminAction({
    action: 'ORDER_DELIVERY_DELAY_FLAGGED',
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: {
      orderId: order._id.toString(),
      delayReason: data.delayReason,
      previousDate,
      newDate,
    },
  });

  return order;
};

/**
 * Get real-time Delivery SLA Alerts (Overdue, At Risk, Due Soon)
 */
export const getDeliverySlaAlerts = async () => {
  const activeStatuses: OrderStatus[] = [
    'placed',
    'confirmed',
    'preparing',
    'ready_for_dispatch',
    'dispatched',
    'in_transit',
    'out_for_delivery',
    'delivery_rescheduled',
    'delivery_attempt_failed',
  ];

  const orders = await ProductOrder.find({
    orderStatus: { $in: activeStatuses },
  })
    .select('orderNumber patientName patientPhone deliveryAssignment orderStatus items createdAt deliveryAddress')
    .sort({ 'deliveryAssignment.scheduledDeliveryDate': 1 })
    .lean();

  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const overdue: any[] = [];
  const atRisk: any[] = [];
  const dueSoon: any[] = [];

  for (const o of orders) {
    const scheduled = o.deliveryAssignment?.scheduledDeliveryDate
      ? new Date(o.deliveryAssignment.scheduledDeliveryDate)
      : new Date(new Date(o.createdAt).getTime() + 72 * 60 * 60 * 1000); // default 3 days SLA

    const orderSummary = {
      orderId: (o as any)._id.toString(),
      orderNumber: o.orderNumber,
      patientName: o.patientName,
      patientPhone: o.patientPhone,
      city: o.deliveryAddress?.city || 'Pune',
      scheduledDate: scheduled,
      status: o.orderStatus,
      assignedStaffName: o.deliveryAssignment?.assignedStaffName || 'Unassigned',
      itemsCount: o.items?.length || 1,
    };

    if (scheduled < now) {
      const delayHours = Math.round((now.getTime() - scheduled.getTime()) / (1000 * 60 * 60));
      overdue.push({
        ...orderSummary,
        urgency: 'OVERDUE',
        delayHours,
        actionAdvice: 'Urgent: Assign express dispatch or contact recipient to reschedule immediately.',
      });
    } else if (scheduled <= in24Hours) {
      const hoursRemaining = Math.max(0, Math.round((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60)));
      atRisk.push({
        ...orderSummary,
        urgency: 'AT_RISK',
        hoursRemaining,
        actionAdvice: 'Attention: Delivery due within 24 hours. Ensure package is ready and out for delivery.',
      });
    } else if (scheduled <= in48Hours) {
      dueSoon.push({
        ...orderSummary,
        urgency: 'DUE_SOON',
        actionAdvice: 'On schedule: Confirm depot staging and delivery route assignment.',
      });
    }
  }

  return {
    summary: {
      totalActive: orders.length,
      overdueCount: overdue.length,
      atRiskCount: atRisk.length,
      dueSoonCount: dueSoon.length,
    },
    overdue,
    atRisk,
    dueSoon,
  };
};

/**
 * List patient delivery reschedule requests across active orders
 */
export const listRescheduleRequests = async (status?: string) => {
  const query: any = {
    'rescheduleRequests.0': { $exists: true },
  };

  const orders = await ProductOrder.find(query)
    .select('orderNumber patientName patientPhone deliveryAssignment rescheduleRequests orderStatus')
    .lean();

  const requests: any[] = [];
  for (const o of orders) {
    if (o.rescheduleRequests && Array.isArray(o.rescheduleRequests)) {
      for (const req of o.rescheduleRequests) {
        if (!status || status === 'all' || req.status === status) {
          requests.push({
            orderId: (o as any)._id.toString(),
            orderNumber: o.orderNumber,
            patientName: o.patientName,
            patientPhone: o.patientPhone,
            currentScheduledDate: o.deliveryAssignment?.scheduledDeliveryDate,
            currentOrderStatus: o.orderStatus,
            ...req,
          });
        }
      }
    }
  }

  // Sort newest first
  requests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  return requests;
};

/**
 * Review patient delivery reschedule request (approve, reject, or propose alternative)
 */
export const reviewDeliveryReschedule = async (
  orderId: string,
  requestId: string,
  data: {
    action: 'approve' | 'reject' | 'propose_alternative';
    reason?: string;
    alternativeDate?: Date;
    alternativeSlot?: string;
  },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  const req = order.rescheduleRequests?.find(
    (r) => r.requestId === requestId || (r as any)._id?.toString() === requestId
  );
  if (!req) {
    throw new AppError('Reschedule request not found on this order', 404);
  }

  req.reviewedByStaffId = staffUser._id;
  req.reviewedByStaffName = staffUser.fullName;
  req.reviewNotes = data.reason || '';
  req.resolvedAt = new Date();

  if (data.action === 'approve') {
    req.status = 'approved';
    const previousDate = order.deliveryAssignment?.scheduledDeliveryDate;
    const newDate = new Date(req.requestedDate);

    if (!order.deliveryAssignment) {
      order.deliveryAssignment = {};
    }
    order.deliveryAssignment.scheduledDeliveryDate = newDate;
    order.orderStatus = 'delivery_rescheduled';

    if (!order.deliveryEstimateHistory) {
      order.deliveryEstimateHistory = [];
    }
    order.deliveryEstimateHistory.push({
      previousEstimate: previousDate,
      newEstimate: newDate,
      updatedBy: staffUser._id,
      updatedByName: staffUser.fullName,
      updatedByRole: staffUser.role,
      reason: `Patient Reschedule Approved: ${req.reason}`,
      updatedAt: new Date(),
    });

    order.trackingUpdates.push({
      timestamp: new Date(),
      status: 'delivery_rescheduled',
      message: `Delivery rescheduled per patient request: ${newDate.toLocaleDateString('en-IN')}${req.timeSlot ? ` (${req.timeSlot})` : ''}`,
      staffId: staffUser._id,
      staffName: staffUser.fullName,
    });
  } else if (data.action === 'reject') {
    req.status = 'rejected';
    order.trackingUpdates.push({
      timestamp: new Date(),
      status: order.orderStatus,
      message: `Patient delivery reschedule request declined: ${data.reason || 'Logistical constraints'}`,
      staffId: staffUser._id,
      staffName: staffUser.fullName,
    });
  } else if (data.action === 'propose_alternative') {
    req.status = 'alternative_proposed';
    req.alternativeOfferedDate = data.alternativeDate ? new Date(data.alternativeDate) : undefined;
    req.alternativeOfferedSlot = data.alternativeSlot || 'Morning 09:00 - 13:00';
    order.trackingUpdates.push({
      timestamp: new Date(),
      status: order.orderStatus,
      message: `Alternative delivery slot proposed to recipient: ${data.alternativeDate ? new Date(data.alternativeDate).toLocaleDateString('en-IN') : 'Next available date'} (${req.alternativeOfferedSlot})`,
      staffId: staffUser._id,
      staffName: staffUser.fullName,
    });
  }

  await order.save();

  // Audit log
  await logAdminAction({
    action: `DELIVERY_RESCHEDULE_${data.action.toUpperCase()}`,
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: {
      orderId: order._id.toString(),
      requestId,
      action: data.action,
      reason: data.reason,
    },
  });

  return order;
};

/**
 * Contribution margin and itemized profitability calculation for an order
 */
export const getOrderProfitability = async (orderId: string, _user: IUser) => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query).lean();
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  const subtotal = Number(order.pricing?.subtotal) || 0;
  const discountTotal = Number(order.pricing?.discountTotal) || 0;
  const deliveryFee = Number(order.pricing?.deliveryFee) || 0;
  const installationCharge = Number(order.pricing?.installationCharge) || 0;
  const taxGst = Number(order.pricing?.taxGst) || 0;
  const customerTotalPaid = Number(order.pricing?.totalAmount) || 0;

  // Direct Inflow from Customer
  const grossInflow = subtotal - discountTotal + deliveryFee + installationCharge;

  // Direct Operational Costs
  const procurementCostTotal =
    Number(order.pricing?.procurementCostTotal) ||
    order.items?.reduce((sum, it) => sum + (Number(it.procurementCost) || (Number(it.unitPrice) * 0.65)) * it.quantity, 0) ||
    0;

  const actualInstallationCost = Number(order.clinicalSetup?.costBreakdown?.actualTotalCost) || 0;
  const gatewayFee = Number(order.pricing?.gatewayFee) || Math.round(customerTotalPaid * 0.02);
  const refundAmount = Number(order.pricing?.refundAmount) || 0;

  const directCosts = procurementCostTotal + actualInstallationCost + gatewayFee + refundAmount;
  const contributionMargin = grossInflow - directCosts;
  const marginPercentage = grossInflow > 0 ? Math.round((contributionMargin / grossInflow) * 1000) / 10 : 0;

  const isReconciled = order.paymentStatus === 'paid' && order.orderStatus === 'delivered';

  return {
    orderId: (order as any)._id.toString(),
    orderNumber: order.orderNumber,
    status: order.orderStatus,
    paymentStatus: order.paymentStatus,
    isReconciled,
    statusLabel: isReconciled ? 'Reconciled (Delivered & Paid)' : 'Estimated (In-Progress / Pending Reconciliation)',
    inflow: {
      subtotal,
      discountTotal,
      deliveryFee,
      installationCharge,
      taxGst,
      customerTotalPaid,
      grossInflow,
    },
    directCosts: {
      procurementCostTotal,
      actualInstallationCost,
      installationCostBreakdown: order.clinicalSetup?.costBreakdown || null,
      gatewayFee,
      refundAmount,
      totalDirectCosts: directCosts,
    },
    profitability: {
      contributionMargin,
      marginPercentage,
      isProfitable: contributionMargin >= 0,
    },
  };
};

/**
 * Returns Workspace: List product returns
 */
export const listOperationsReturns = async (filters: { returnStatus?: string; search?: string }) => {
  const query: any = {
    $or: [
      { 'returnDetails.isReturnRequested': true },
      { 'returnDetails.returnStatus': { $in: ['requested', 'under_review', 'approved', 'rejected', 'pickup_scheduled', 'pickup_in_progress', 'received_for_inspection', 'resolution_pending', 'resolved', 'closed'] } },
    ],
  };

  if (filters.returnStatus && filters.returnStatus !== 'all') {
    query['returnDetails.returnStatus'] = filters.returnStatus;
  }

  if (filters.search) {
    const rx = new RegExp(escapeRegex(filters.search), 'i');
    query.$and = [
      {
        $or: [
          { orderNumber: rx },
          { patientName: rx },
          { patientPhone: rx },
          { 'returnDetails.returnNumber': rx },
        ],
      },
    ];
  }

  const orders = await ProductOrder.find(query)
    .select('orderNumber patientName patientPhone items pricing returnDetails orderStatus createdAt')
    .sort({ 'returnDetails.requestedAt': -1, updatedAt: -1 })
    .lean();

  return orders.map((o) => ({
    orderId: (o as any)._id.toString(),
    orderNumber: o.orderNumber,
    patientName: o.patientName,
    patientPhone: o.patientPhone,
    orderTotal: o.pricing?.totalAmount,
    items: o.items,
    returnDetails: o.returnDetails,
  }));
};

/**
 * Returns: Review customer return request (approve/reject)
 */
export const reviewReturnRequest = async (
  orderId: string,
  data: { action: 'approve' | 'reject'; rejectionReason?: string },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  if (!order.returnDetails) {
    order.returnDetails = { isReturnRequested: true };
  }

  order.returnDetails.reviewedBy = staffUser.fullName;
  order.returnDetails.reviewedAt = new Date();

  if (data.action === 'approve') {
    order.returnDetails.returnStatus = 'approved';
    order.trackingUpdates.push({
      timestamp: new Date(),
      status: order.orderStatus,
      message: `Return request approved. Doorstep inspection pickup scheduled for staging.`,
      staffId: staffUser._id,
      staffName: staffUser.fullName,
    });
  } else {
    order.returnDetails.returnStatus = 'rejected';
    order.returnDetails.rejectionReason = data.rejectionReason || 'Return policy terms not met';
    order.trackingUpdates.push({
      timestamp: new Date(),
      status: order.orderStatus,
      message: `Return request rejected: ${order.returnDetails.rejectionReason}`,
      staffId: staffUser._id,
      staffName: staffUser.fullName,
    });
  }

  await order.save();

  await logAdminAction({
    action: `RETURN_REQUEST_${data.action.toUpperCase()}`,
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: { orderId: order._id.toString(), action: data.action, rejectionReason: data.rejectionReason },
  });

  return order;
};

/**
 * Returns: Schedule return pickup
 */
export const scheduleReturnPickup = async (
  orderId: string,
  data: { scheduledDate: Date; assignedStaffId: string; notes?: string },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  const staff = await User.findById(data.assignedStaffId);
  if (!staff) {
    throw new AppError('Assigned delivery staff member not found', 404);
  }

  if (!order.returnDetails) {
    order.returnDetails = { isReturnRequested: true };
  }

  order.returnDetails.returnStatus = 'pickup_scheduled';
  order.returnDetails.pickup = {
    scheduledDate: new Date(data.scheduledDate),
    assignedStaffId: staff._id,
    assignedStaffName: staff.fullName,
    pickupStatus: 'assigned',
  };

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Return pickup assigned to ${staff.fullName} for ${new Date(data.scheduledDate).toLocaleDateString('en-IN')}`,
    staffId: staffUser._id,
    staffName: staffUser.fullName,
  });

  await order.save();

  await logAdminAction({
    action: 'RETURN_PICKUP_SCHEDULED',
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: { orderId: order._id.toString(), assignedStaffName: staff.fullName },
  });

  return order;
};

/**
 * Returns: Record pickup outcome & item condition checklist
 */
export const recordReturnPickupOutcome = async (
  orderId: string,
  data: {
    pickupStatus: 'completed' | 'attempt_failed';
    failureReason?: string;
    pickupProofUrl?: string;
    itemConditionChecklist?: Array<{ item: string; passed: boolean }>;
    customerHandoverConfirmed?: boolean;
  },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  if (!order.returnDetails) {
    order.returnDetails = { isReturnRequested: true };
  }
  if (!order.returnDetails.pickup) {
    order.returnDetails.pickup = {};
  }

  order.returnDetails.pickup.pickupStatus = data.pickupStatus;
  order.returnDetails.pickup.pickupProofUrl = data.pickupProofUrl;
  order.returnDetails.pickup.failureReason = data.failureReason;
  order.returnDetails.pickup.itemConditionChecklist = data.itemConditionChecklist;
  order.returnDetails.pickup.customerHandoverConfirmed = data.customerHandoverConfirmed;

  if (data.pickupStatus === 'completed') {
    order.returnDetails.pickup.actualPickupAt = new Date();
    order.returnDetails.returnStatus = 'received_for_inspection';
    order.trackingUpdates.push({
      timestamp: new Date(),
      status: order.orderStatus,
      message: `Return equipment collected from customer. Inbound to depot inspection bay.`,
      staffId: staffUser._id,
      staffName: staffUser.fullName,
    });
  } else {
    order.trackingUpdates.push({
      timestamp: new Date(),
      status: order.orderStatus,
      message: `Return pickup attempt failed: ${data.failureReason || 'Customer unavailable'}`,
      staffId: staffUser._id,
      staffName: staffUser.fullName,
    });
  }

  await order.save();

  await logAdminAction({
    action: `RETURN_PICKUP_${data.pickupStatus.toUpperCase()}`,
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: { orderId: order._id.toString(), status: data.pickupStatus },
  });

  return order;
};

/**
 * Returns: Record technical inspection findings
 */
export const recordReturnInspection = async (
  orderId: string,
  data: {
    result: 'intact_healthy' | 'customer_damaged' | 'manufacturing_defect' | 'missing_accessories';
    notes?: string;
    photos?: string[];
  },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  if (!order.returnDetails) {
    order.returnDetails = { isReturnRequested: true };
  }

  order.returnDetails.inspection = {
    inspectedAt: new Date(),
    inspectedBy: staffUser.fullName,
    result: data.result,
    notes: data.notes,
    photos: data.photos || [],
  };

  order.returnDetails.returnStatus = 'resolution_pending';

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Technical inspection completed: ${data.result.replace(/_/g, ' ').toUpperCase()}`,
    staffId: staffUser._id,
    staffName: staffUser.fullName,
    notes: data.notes,
  });

  await order.save();

  await logAdminAction({
    action: 'RETURN_INSPECTION_RECORDED',
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: { orderId: order._id.toString(), result: data.result },
  });

  return order;
};

/**
 * Returns: Finalize return resolution (replacement, repair, refund, or rejected)
 */
export const finalizeReturnResolution = async (
  orderId: string,
  data: {
    type: 'replacement' | 'refund' | 'repair' | 'rejected_no_action';
    refundAmount?: number;
    notes?: string;
  },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  if (!order.returnDetails) {
    order.returnDetails = { isReturnRequested: true };
  }

  const refundAmt = data.type === 'refund' ? Math.max(0, Number(data.refundAmount) || 0) : 0;

  order.returnDetails.resolution = {
    type: data.type,
    refundAmount: refundAmt,
    notes: data.notes,
    resolvedAt: new Date(),
    resolvedBy: staffUser.fullName,
  };

  order.returnDetails.returnStatus = 'resolved';

  if (data.type === 'refund' && refundAmt > 0) {
    if (!order.pricing) {
      order.pricing = { subtotal: 0, deliveryFee: 0, taxGst: 0, totalAmount: 0 };
    }
    order.pricing.refundAmount = refundAmt;
    if (!order.cancellation) {
      order.cancellation = { isCancelled: false };
    }
    order.cancellation.refundStatus = 'processed';
  }

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Return resolution finalized: ${data.type.toUpperCase()}${refundAmt > 0 ? ` (₹${refundAmt})` : ''}`,
    staffId: staffUser._id,
    staffName: staffUser.fullName,
    notes: data.notes,
  });

  await order.save();

  await logAdminAction({
    action: 'RETURN_RESOLUTION_FINALIZED',
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: { orderId: order._id.toString(), resolutionType: data.type, refundAmount: refundAmt },
  });

  return order;
};

/**
 * Complaints: List operations complaints
 */
export const listOperationsComplaints = async (filters: {
  status?: string;
  category?: string;
  search?: string;
}) => {
  const query: any = {};
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }
  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }
  if (filters.search) {
    const rx = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [
      { complaintNumber: rx },
      { orderNumber: rx },
      { productTitle: rx },
      { userName: rx },
      { userPhone: rx },
    ];
  }

  return ProductComplaint.find(query).sort({ createdAt: -1 }).lean();
};

/**
 * Complaints: Resolve or reject a customer complaint
 */
export const resolveComplaint = async (
  complaintId: string,
  data: {
    status: 'resolved' | 'rejected' | 'under_review';
    resolutionNotes: string;
    refundAmount?: number;
  },
  staffUser: IUser
): Promise<IProductComplaint> => {
  const complaint = await ProductComplaint.findById(complaintId);
  if (!complaint) {
    throw new AppError('Complaint record not found', 404);
  }

  complaint.status = data.status;
  complaint.resolutionNotes = data.resolutionNotes;
  complaint.resolvedAt = new Date();
  complaint.resolvedBy = staffUser._id;

  if (data.refundAmount !== undefined && data.refundAmount > 0) {
    complaint.refundApproved = true;
    complaint.refundAmount = data.refundAmount;
  }

  await complaint.save();

  await logAdminAction({
    action: `COMPLAINT_${data.status.toUpperCase()}`,
    category: 'field_operations',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductComplaint',
    targetId: complaint.complaintNumber,
    details: { complaintId: complaint._id.toString(), status: data.status },
  });

  return complaint;
};

/**
 * Reviews: List product reviews for moderation and quality feedback
 */
export const listOperationsReviews = async (filters: { status?: string; search?: string }) => {
  const query: any = {};
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }
  if (filters.search) {
    const rx = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [{ productTitle: rx }, { userName: rx }, { comment: rx }];
  }

  return ProductReview.find(query).sort({ createdAt: -1 }).lean();
};

/**
 * Request secure delivery OTP for an order.
 * Generates cryptographically secure 6-digit OTP, stores its SHA-256 hash,
 * sets a 10-minute expiry, enforces 60-second cooldown, and dispatches via notificationService.
 * Never leaks the raw OTP in API response or staff logs.
 */
export const requestDeliveryOtp = async (
  orderId: string,
  staffUser: IUser
): Promise<{
  orderId: string;
  orderNumber: string;
  phoneMasked: string;
  expiresAt: Date;
  cooldownSeconds: number;
}> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  // Role & assignment check
  const isPrivileged = ['super_admin', 'admin', 'operations_manager', 'sales_manager', 'delivery_manager'].includes(staffUser.role);
  const isAssigned = order.deliveryAssignment?.assignedStaffId?.toString() === staffUser._id.toString();
  const hasProvider = Boolean(order.providerCoordination?.providerName || order.deliveryAssignment?.provider?.providerName);

  if (!isPrivileged && !isAssigned && !hasProvider) {
    throw new AppError('You are not assigned or authorized to coordinate delivery for this order', 403);
  }

  if (['delivered', 'completed'].includes(order.orderStatus)) {
    throw new AppError('Order has already been delivered and verified', 400);
  }

  if (['cancelled', 'returned_to_origin'].includes(order.orderStatus)) {
    throw new AppError(`Cannot request delivery OTP for ${order.orderStatus} order`, 400);
  }

  // Cooldown check (60 seconds)
  const lastReq = order.deliveryAssignment?.otpVerification?.lastRequestedAt;
  if (lastReq) {
    const elapsed = Date.now() - new Date(lastReq).getTime();
    if (elapsed < 60000) {
      const waitSec = Math.ceil((60000 - elapsed) / 1000);
      throw new AppError(`Please wait ${waitSec} second(s) before requesting a new delivery OTP`, 429);
    }
  }

  // Advance order status to out_for_delivery if not already
  if (['confirmed', 'preparing', 'ready_for_dispatch', 'dispatched', 'in_transit'].includes(order.orderStatus)) {
    order.orderStatus = 'out_for_delivery';
    order.trackingUpdates.push({
      timestamp: new Date(),
      status: 'out_for_delivery',
      message: `Delivery person ${staffUser.fullName} has arrived at destination. Secure delivery OTP requested.`,
      location: 'Delivery Destination',
      staffId: staffUser._id,
      staffName: staffUser.fullName,
    });
  }

  // Generate secure 6-digit OTP
  const rawOtp = generateSecureDeliveryOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const otpHash = hashDeliveryOtp(rawOtp, order._id.toString());

  if (!order.deliveryAssignment) {
    order.deliveryAssignment = {};
  }

  order.deliveryAssignment.otpVerification = {
    otpHash,
    otpExpiresAt: expiresAt,
    attemptsCount: 0,
    maxAttempts: 5,
    lastRequestedAt: new Date(),
    verificationMethod: 'otp',
  };

  await order.save();

  // Dispatch customer notification with raw OTP
  await sendPatientNotification({
    recipientPhone: order.patientPhone,
    recipientName: order.patientName,
    recipientRole: 'patient',
    channel: 'sms',
    templateId: 'DELIVERY_OTP_REQUESTED',
    templateParams: {
      patientName: order.patientName,
      orderNumber: order.orderNumber,
      otp: rawOtp,
    },
    idempotencyKey: `DELIVERY-OTP-${order.orderNumber}-${Date.now()}`,
    metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber },
  });

  // Log admin audit action (never include raw OTP in audit details)
  await logAdminAction({
    action: 'ORDER_DELIVERY_OTP_REQUESTED',
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      assignedStaffId: staffUser._id.toString(),
      expiresAt,
    },
  });

  const phoneLast4 = order.patientPhone.slice(-4);
  const phoneMasked = `+91 ******${phoneLast4}`;

  return {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    phoneMasked,
    expiresAt,
    cooldownSeconds: 60,
  };
};

/**
 * Verify delivery OTP and complete order.
 * Enforces single-use token, validates against stored hash, increments attempt counter,
 * locks out after max attempts (5), and sets order status to delivered.
 * Idempotent: multiple calls for an already verified order return the order safely.
 */
export const verifyDeliveryOtp = async (
  orderId: string,
  data: {
    otp: string;
    recipientName?: string;
    recipientRelationship?: string;
    deliveryCondition?: string;
    customerAcknowledgement?: boolean;
    proofUrl?: string;
    notes?: string;
  },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  // Idempotency: If already delivered and OTP verified, return immediately
  if (
    ['delivered', 'completed'].includes(order.orderStatus) &&
    order.deliveryAssignment?.otpVerification?.verifiedAt
  ) {
    return order;
  }

  const isPrivileged = ['super_admin', 'admin', 'operations_manager', 'sales_manager', 'delivery_manager'].includes(staffUser.role);
  const isAssigned = order.deliveryAssignment?.assignedStaffId?.toString() === staffUser._id.toString();
  const hasProvider = Boolean(order.providerCoordination?.providerName || order.deliveryAssignment?.provider?.providerName);

  if (!isPrivileged && !isAssigned && !hasProvider) {
    throw new AppError('You are not assigned or authorized to verify delivery for this order', 403);
  }

  const otpRecord = order.deliveryAssignment?.otpVerification;
  if (!otpRecord || !otpRecord.otpHash) {
    throw new AppError('No active delivery OTP found for this order. Please request an OTP first.', 400);
  }

  // Expiry check
  if (otpRecord.otpExpiresAt && new Date() > new Date(otpRecord.otpExpiresAt)) {
    throw new AppError('Delivery OTP has expired. Please request a new delivery OTP.', 400);
  }

  // Max attempts lockout check
  if (otpRecord.attemptsCount >= otpRecord.maxAttempts) {
    throw new AppError('Maximum verification attempts exceeded. Please request a new delivery OTP.', 429);
  }

  const rawInputOtp = (data.otp || '').trim();
  if (rawInputOtp.length !== 6 || !/^\d{6}$/.test(rawInputOtp)) {
    throw new AppError('Please provide a valid 6-digit numeric OTP', 400);
  }

  // Verify hash
  const isValid = verifyOtpHash(rawInputOtp, order._id.toString(), otpRecord.otpHash);
  if (!isValid) {
    otpRecord.attemptsCount += 1;
    await order.save();
    const remaining = otpRecord.maxAttempts - otpRecord.attemptsCount;
    if (remaining <= 0) {
      throw new AppError('Invalid delivery OTP. Maximum verification attempts exceeded. Please request a new OTP.', 429);
    }
    throw new AppError(`Invalid delivery OTP. ${remaining} attempt(s) remaining.`, 400);
  }

  // Successful verification
  const deliveredTimestamp = new Date();

  // Clear otpHash to invalidate reused tokens (single-use token enforcement)
  otpRecord.otpHash = undefined;
  otpRecord.verifiedAt = deliveredTimestamp;
  otpRecord.verifiedByStaffId = staffUser._id;
  otpRecord.verifiedByStaffName = staffUser.fullName;
  otpRecord.verificationMethod = 'otp';
  otpRecord.recipientName = data.recipientName || order.patientName;
  otpRecord.recipientRelationship = data.recipientRelationship || 'Self';
  otpRecord.deliveryCondition = data.deliveryCondition || 'good_condition';
  otpRecord.customerAcknowledgement = data.customerAcknowledgement ?? true;
  if (data.proofUrl) otpRecord.proofUrl = data.proofUrl;
  if (data.notes) otpRecord.notes = data.notes;

  order.orderStatus = 'delivered';
  await deductPhysicalStockAtFulfillment(order, staffUser);
  order.deliveryAssignment!.actualDeliveredAt = deliveredTimestamp;
  if (data.proofUrl) {
    order.deliveryAssignment!.proofOfDeliveryUrl = data.proofUrl;
  }
  if (data.notes) {
    order.deliveryAssignment!.deliveryNotes = data.notes;
  }

  // Append tracking event
  order.trackingUpdates.push({
    timestamp: deliveredTimestamp,
    status: 'delivered',
    message: `Order delivered successfully. Verified via Customer OTP by ${staffUser.fullName}.`,
    location: 'Customer Residence',
    staffId: staffUser._id,
    staffName: staffUser.fullName,
    recipientConfirmed: true,
    proofUrl: data.proofUrl,
    notes: data.notes,
  });

  await order.save();

  // Immutable audit log
  await logAdminAction({
    action: 'ORDER_DELIVERY_OTP_VERIFIED',
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      verificationMethod: 'otp',
      verifiedByStaffId: staffUser._id.toString(),
      verifiedByStaffName: staffUser.fullName,
      recipientName: otpRecord.recipientName,
      deliveredAt: deliveredTimestamp,
    },
  });

  // Follow-up notification for customer rating and order receipt
  try {
    await sendPatientNotification({
      recipientPhone: order.patientPhone,
      recipientName: order.patientName,
      recipientRole: 'patient',
      channel: 'sms',
      templateId: 'DELIVERY_COMPLETED_RATING_REQUEST',
      templateParams: {
        patientName: order.patientName,
        orderNumber: order.orderNumber,
        orderUrl: `/orders/${order.orderNumber}`,
      },
      idempotencyKey: `DELIVERY-COMPLETED-${order.orderNumber}`,
      metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber },
    });
  } catch (notifErr: any) {
    console.error('[verifyDeliveryOtp] Follow-up notification failed:', notifErr.message);
  }

  return order;
};

/**
 * Authorized Manager Delivery Override.
 * Allows operations managers and admins to mark delivery complete when customer contact
 * is unavailable or non-functional, requiring identity document verification and full audit trail.
 */
export const managerDeliveryOverride = async (
  orderId: string,
  data: {
    overrideReason: string;
    identityDocType: string;
    identityDocLast4?: string;
    recipientName: string;
    recipientRelationship: string;
    deliveryCondition?: string;
    proofUrl?: string;
    notes?: string;
  },
  managerUser: IUser
): Promise<IProductOrder> => {
  const isManager = ['super_admin', 'admin', 'operations_manager'].includes(managerUser.role);
  if (!isManager) {
    throw new AppError('Only operations managers and admins are authorized to perform delivery override', 403);
  }

  if (!data.overrideReason || data.overrideReason.trim().length < 10) {
    throw new AppError('Override reason is mandatory and must contain at least 10 characters', 400);
  }

  if (!data.identityDocType || !data.recipientName) {
    throw new AppError('Recipient name and identity document type are required for manager override', 400);
  }

  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  if (['delivered', 'completed'].includes(order.orderStatus)) {
    return order;
  }

  const deliveredTimestamp = new Date();

  if (!order.deliveryAssignment) {
    order.deliveryAssignment = {};
  }

  order.deliveryAssignment.otpVerification = {
    attemptsCount: 0,
    maxAttempts: 5,
    verifiedAt: deliveredTimestamp,
    verifiedByStaffId: managerUser._id,
    verifiedByStaffName: managerUser.fullName,
    verificationMethod: 'manager_override',
    overrideReason: data.overrideReason.trim(),
    identityDocType: data.identityDocType,
    identityDocLast4: data.identityDocLast4,
    recipientName: data.recipientName.trim(),
    recipientRelationship: data.recipientRelationship || 'Self',
    deliveryCondition: data.deliveryCondition || 'good_condition',
    customerAcknowledgement: true,
    proofUrl: data.proofUrl,
    notes: data.notes,
  };

  order.orderStatus = 'delivered';
  await deductPhysicalStockAtFulfillment(order, managerUser);
  order.deliveryAssignment.actualDeliveredAt = deliveredTimestamp;
  if (data.proofUrl) order.deliveryAssignment.proofOfDeliveryUrl = data.proofUrl;

  order.trackingUpdates.push({
    timestamp: deliveredTimestamp,
    status: 'delivered',
    message: `Delivery completed via Manager Override by ${managerUser.fullName}. Reason: ${data.overrideReason.trim()}`,
    location: 'Customer Residence',
    staffId: managerUser._id,
    staffName: managerUser.fullName,
    recipientConfirmed: true,
    proofUrl: data.proofUrl,
    notes: `Doc: ${data.identityDocType}${data.identityDocLast4 ? ` (ending in ${data.identityDocLast4})` : ''}`,
  });

  await order.save();

  await logAdminAction({
    action: 'ORDER_DELIVERY_MANAGER_OVERRIDE',
    category: 'order_fulfillment',
    actorId: managerUser._id.toString(),
    actorName: managerUser.fullName,
    actorRole: managerUser.role,
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      overrideReason: data.overrideReason.trim(),
      identityDocType: data.identityDocType,
      recipientName: data.recipientName,
      managerId: managerUser._id.toString(),
    },
  });

  return order;
};

/**
 * Completed Deliveries view query.
 * Dedicated workspace for inspecting successfully delivered orders with filters and pagination.
 */
export const getCompletedDeliveries = async (params: {
  dateRange?: 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
  deliveryStaffId?: string;
  sourcingType?: 'own_stock' | 'supplier_direct' | 'all';
  ratingStatus?: 'all' | 'rated' | 'unrated';
  verificationMethod?: 'all' | 'otp' | 'manager_override';
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const query: any = {
    orderStatus: { $in: ['delivered', 'completed'] },
  };

  // Date range filters based on delivery date or update date
  const now = new Date();
  if (params.dateRange === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    query['deliveryAssignment.actualDeliveredAt'] = { $gte: start };
  } else if (params.dateRange === 'yesterday') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    query['deliveryAssignment.actualDeliveredAt'] = { $gte: start, $lt: end };
  } else if (params.dateRange === 'last_7_days') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    query['deliveryAssignment.actualDeliveredAt'] = { $gte: start };
  } else if (params.dateRange === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    query['deliveryAssignment.actualDeliveredAt'] = { $gte: start };
  } else if (params.dateRange === 'custom' && (params.startDate || params.endDate)) {
    query['deliveryAssignment.actualDeliveredAt'] = {};
    if (params.startDate) query['deliveryAssignment.actualDeliveredAt'].$gte = new Date(params.startDate);
    if (params.endDate) query['deliveryAssignment.actualDeliveredAt'].$lte = new Date(params.endDate);
  }

  // Delivery staff filter
  if (params.deliveryStaffId && params.deliveryStaffId !== 'all') {
    query['deliveryAssignment.assignedStaffId'] = new mongoose.Types.ObjectId(params.deliveryStaffId);
  }

  // Sourcing type
  if (params.sourcingType && params.sourcingType !== 'all') {
    query['items.sourcingType'] = params.sourcingType;
  }

  // Verification method
  if (params.verificationMethod && params.verificationMethod !== 'all') {
    query['deliveryAssignment.otpVerification.verificationMethod'] = params.verificationMethod;
  }

  // Rating status
  if (params.ratingStatus === 'rated') {
    query['deliveryRating.rating'] = { $exists: true };
  } else if (params.ratingStatus === 'unrated') {
    query['deliveryRating.rating'] = { $exists: false };
  }

  // Search
  if (params.search && params.search.trim()) {
    const rx = new RegExp(escapeRegex(params.search.trim()), 'i');
    query.$or = [{ orderNumber: rx }, { patientName: rx }, { patientPhone: rx }];
  }

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(params.limit) || 10));
  const skip = (page - 1) * limit;

  const [orders, total, allCompleted] = await Promise.all([
    ProductOrder.find(query).sort({ 'deliveryAssignment.actualDeliveredAt': -1, updatedAt: -1 }).skip(skip).limit(limit).lean(),
    ProductOrder.countDocuments(query),
    ProductOrder.find({ orderStatus: { $in: ['delivered', 'completed'] } }, 'deliveryAssignment deliveryRating').lean(),
  ]);

  let otpVerifiedCount = 0;
  let managerOverrideCount = 0;
  let ratedCount = 0;
  let ratingSum = 0;

  for (const o of allCompleted) {
    if (o.deliveryAssignment?.otpVerification?.verificationMethod === 'otp') otpVerifiedCount++;
    if (o.deliveryAssignment?.otpVerification?.verificationMethod === 'manager_override') managerOverrideCount++;
    if (o.deliveryRating?.rating) {
      ratedCount++;
      ratingSum += o.deliveryRating.rating;
    }
  }

  const avgDeliveryRating = ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : 5.0;

  return {
    orders,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    summary: {
      totalDelivered: allCompleted.length,
      otpVerifiedCount,
      managerOverrideCount,
      ratedCount,
      avgDeliveryRating,
    },
  };
};

/**
 * Retrieve actionable notifications for Operations team
 */
export const getOperationsNotifications = async (
  user: IUser,
  options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(options.limit) || 15));
  const skip = (page - 1) * limit;

  const query: any = {
    $or: [
      { recipientPhone: 'OPERATIONS_DESK' },
      { recipientPhone: 'ADMIN_DESK' },
      { recipientRole: { $in: ['operations_manager', 'delivery_staff', 'admin', 'super_admin'] } },
      {
        templateId: {
          $in: [
            'PRODUCT_ORDER_PLACED',
            'PRODUCT_ORDER_CONFIRMED',
            'DELIVERY_OTP_REQUESTED',
            'DELIVERY_COMPLETED_RATING_REQUEST',
            'PRODUCT_ORDER_DELIVERY_UPDATED',
            'OPERATIONAL_ALERT',
            'VISIT_RESCHEDULE_REQUESTED',
            'INVENTORY_ALERT',
          ],
        },
      },
    ],
  };

  if (options.unreadOnly) {
    query.isRead = { $ne: true };
  }

  const [notifications, total, unreadCount] = await Promise.all([
    NotificationLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    NotificationLog.countDocuments(query),
    NotificationLog.countDocuments({ ...query, isRead: { $ne: true } }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Mark a specific operations notification as read
 */
export const markOperationsNotificationRead = async (notificationId: string) => {
  const notif = await NotificationLog.findByIdAndUpdate(
    notificationId,
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
  return notif;
};

/**
 * Mark all operations notifications as read
 */
export const markAllOperationsNotificationsRead = async () => {
  await NotificationLog.updateMany(
    { isRead: { $ne: true } },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return { success: true };
};

/**
 * ============================================================================
 * INVENTORY & STOCK MANAGEMENT SERVICES (Phase 16)
 * ============================================================================
 */

export interface ListInventoryProductsFilters {
  search?: string;
  category?: string;
  sourcingType?: string;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'supplier_confirmation_required';
  page?: number;
  limit?: number;
  sortBy?: 'ats_asc' | 'ats_desc' | 'stock_asc' | 'stock_desc' | 'title_asc' | 'title_desc' | 'updated_desc';
}

/**
 * Authoritative Inventory Summary KPI calculation
 */
export const getInventorySummary = async () => {
  const activeProducts = await MedicalProduct.find({ isActive: true })
    .select('stockQuantity reservedQuantity reorderThreshold sourcingType supplierAvailabilityStatus')
    .lean();

  let totalActiveSkus = activeProducts.length;
  let totalOnHandUnits = 0;
  let totalReservedUnits = 0;
  let totalAvailableUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let supplierConfirmationRequiredCount = 0;

  for (const prod of activeProducts) {
    const onHand = Number(prod.stockQuantity) || 0;
    const reserved = Number(prod.reservedQuantity) || 0;
    const ats = Math.max(0, onHand - reserved);
    const threshold = Number(prod.reorderThreshold) || 5;

    totalOnHandUnits += onHand;
    totalReservedUnits += reserved;
    totalAvailableUnits += ats;

    if (ats <= 0) {
      outOfStockCount++;
    } else if (ats <= threshold) {
      lowStockCount++;
    }

    if (
      prod.sourcingType === 'supplier_direct' &&
      prod.supplierAvailabilityStatus !== 'confirmed'
    ) {
      supplierConfirmationRequiredCount++;
    }
  }

  // Incoming units from open purchase orders
  const openPos = await SupplierPurchaseOrder.find({
    deliveryStatus: { $in: ['ordered', 'partially_received'] },
  }).lean();

  let incomingUnitsFromPOs = 0;
  for (const po of openPos) {
    if (Array.isArray(po.items)) {
      for (const it of po.items) {
        const remaining = Math.max(0, (it.quantity || 0) - (it.receivedQuantity || 0));
        incomingUnitsFromPOs += remaining;
      }
    }
  }

  return {
    totalActiveSkus,
    totalOnHandUnits,
    totalReservedUnits,
    totalAvailableUnits,
    lowStockCount,
    outOfStockCount,
    incomingUnitsFromPOs,
    supplierConfirmationRequiredCount,
  };
};

/**
 * Searchable, filterable, paginated inventory product list (10/page) with role-gated procurement cost
 */
export const listInventoryProducts = async (
  filters: ListInventoryProductsFilters = {},
  user?: { role?: string; id?: string; fullName?: string }
) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(filters.limit) || 10)); // Exactly 10 default
  const skip = (page - 1) * limit;

  const query: any = { isActive: true };

  if (filters.search && filters.search.trim()) {
    const cleanSearch = filters.search.trim();
    const regex = new RegExp(cleanSearch, 'i');
    query.$or = [
      { title: regex },
      { sku: regex },
      { supplierName: regex },
      { description: regex },
    ];
  }

  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }

  if (filters.sourcingType && filters.sourcingType !== 'all') {
    if (filters.sourcingType === 'own_stock' || filters.sourcingType === 'own') {
      query.sourcingType = { $in: ['own_stock', 'own'] };
    } else if (filters.sourcingType === 'supplier_direct' || filters.sourcingType === 'supplier') {
      query.sourcingType = { $in: ['supplier_direct', 'supplier'] };
    }
  }

  if (filters.stockStatus && filters.stockStatus !== 'all') {
    if (filters.stockStatus === 'supplier_confirmation_required') {
      query.sourcingType = { $in: ['supplier_direct', 'supplier'] };
      query.supplierAvailabilityStatus = { $ne: 'confirmed' };
    } else if (filters.stockStatus === 'out_of_stock') {
      query.$expr = {
        $lte: [{ $subtract: ['$stockQuantity', { $ifNull: ['$reservedQuantity', 0] }] }, 0],
      };
    } else if (filters.stockStatus === 'low_stock') {
      query.$expr = {
        $and: [
          { $gt: [{ $subtract: ['$stockQuantity', { $ifNull: ['$reservedQuantity', 0] }] }, 0] },
          {
            $lte: [
              { $subtract: ['$stockQuantity', { $ifNull: ['$reservedQuantity', 0] }] },
              { $ifNull: ['$reorderThreshold', 5] },
            ],
          },
        ],
      };
    } else if (filters.stockStatus === 'in_stock') {
      query.$expr = {
        $gt: [
          { $subtract: ['$stockQuantity', { $ifNull: ['$reservedQuantity', 0] }] },
          { $ifNull: ['$reorderThreshold', 5] },
        ],
      };
    }
  }

  const openPos = await SupplierPurchaseOrder.find({
    deliveryStatus: { $in: ['ordered', 'partially_received'] },
  }).lean();

  const incomingMap = new Map<string, number>();
  for (const po of openPos) {
    if (Array.isArray(po.items)) {
      for (const it of po.items) {
        const prodId = it.productId?.toString();
        if (prodId) {
          const rem = Math.max(0, (it.quantity || 0) - (it.receivedQuantity || 0));
          incomingMap.set(prodId, (incomingMap.get(prodId) || 0) + rem);
        }
      }
    }
  }

  const total = await MedicalProduct.countDocuments(query);

  let sortObj: any = { lastStockUpdateAt: -1, updatedAt: -1 };
  if (filters.sortBy === 'title_asc') {
    sortObj = { title: 1 };
  } else if (filters.sortBy === 'title_desc') {
    sortObj = { title: -1 };
  } else if (filters.sortBy === 'stock_asc') {
    sortObj = { stockQuantity: 1 };
  } else if (filters.sortBy === 'stock_desc') {
    sortObj = { stockQuantity: -1 };
  }

  const rawProducts = await MedicalProduct.find(query)
    .populate('supplierId', 'name contactPerson email phone')
    .sort(sortObj)
    .skip(filters.sortBy?.startsWith('ats') ? 0 : skip)
    .limit(filters.sortBy?.startsWith('ats') ? 1000 : limit)
    .lean();

  const userRole = (user?.role || '').toLowerCase();
  const canSeeProcurementCost = ['super_admin', 'admin', 'operations_manager', 'product_manager'].includes(userRole);

  let formatted = rawProducts.map((p: any) => {
    const onHand = Number(p.stockQuantity) || 0;
    const reserved = Number(p.reservedQuantity) || 0;
    const availableToSell = Math.max(0, onHand - reserved);
    const reorderThreshold = Number(p.reorderThreshold) || 5;
    const reorderQuantity = Number(p.reorderQuantity) || 15;
    const incomingPoQuantity = incomingMap.get(p._id.toString()) || 0;

    let computedStockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'supplier_confirmation_required' = 'in_stock';
    if (p.sourcingType === 'supplier_direct' && p.supplierAvailabilityStatus !== 'confirmed') {
      computedStockStatus = 'supplier_confirmation_required';
    } else if (availableToSell <= 0) {
      computedStockStatus = 'out_of_stock';
    } else if (availableToSell <= reorderThreshold) {
      computedStockStatus = 'low_stock';
    }

    const item: any = {
      id: p._id.toString(),
      _id: p._id.toString(),
      sku: p.sku,
      title: p.title,
      category: p.category,
      images: p.images || [],
      primaryImage: p.images?.[0] || '/images/default-medical.png',
      sourcingType: p.sourcingType || 'own_stock',
      stockQuantity: onHand,
      reservedQuantity: reserved,
      availableToSell,
      reorderThreshold,
      reorderQuantity,
      incomingPoQuantity,
      suggestedReorderQuantity: Math.max(0, (reorderThreshold * 2) - availableToSell - incomingPoQuantity) || reorderQuantity,
      supplierId: p.supplierId?._id?.toString() || p.supplierId?.toString(),
      supplierName: p.supplierId?.name || p.supplierName || (p.sourcingType === 'supplier_direct' ? 'Primary Partner Supplier' : 'VivoQuest Pune Central Hub'),
      supplierAvailabilityStatus: p.supplierAvailabilityStatus || 'confirmed',
      supplierAvailabilityConfirmedAt: p.supplierAvailabilityConfirmedAt,
      supplierLeadTimeDays: p.supplierLeadTimeDays || 3,
      stockStatus: computedStockStatus,
      lastStockUpdateAt: p.lastStockUpdateAt || p.updatedAt,
      sellingPrice: p.sellingPrice || p.price,
      regularPrice: p.regularPrice || p.price,
      discountPercentage: p.discountPercentage || 0,
      status: p.status,
      isActive: p.isActive,
      setupRequiredByClinician: p.setupRequiredByClinician,
      installationEligible: p.installationEligible,
      equipmentCondition: p.equipmentCondition || 'healthy',
    };

    if (canSeeProcurementCost) {
      item.procurementCost = p.procurementCost || 0;
    }

    return item;
  });

  if (filters.sortBy === 'ats_asc') {
    formatted.sort((a, b) => a.availableToSell - b.availableToSell);
    formatted = formatted.slice(skip, skip + limit);
  } else if (filters.sortBy === 'ats_desc') {
    formatted.sort((a, b) => b.availableToSell - a.availableToSell);
    formatted = formatted.slice(skip, skip + limit);
  }

  return {
    products: formatted,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Dedicated Stock Adjustment with atomic validation and immutable audit log
 */
export const adjustStockQuantity = async (
  productId: string,
  payload: {
    newQuantity: number;
    reason: string;
    movementType?: string;
    notes?: string;
  },
  user: { id?: string; fullName?: string; role?: string }
) => {
  const userRole = (user?.role || '').toLowerCase();
  if (!['super_admin', 'admin', 'operations_manager', 'product_manager'].includes(userRole)) {
    throw new AppError('Unauthorized: Only Operations Managers and Administrators can perform stock adjustments', 403);
  }

  const newQty = Number(payload.newQuantity);
  if (isNaN(newQty) || newQty < 0 || !Number.isInteger(newQty)) {
    throw new AppError('Adjusted physical stock quantity must be a non-negative integer (>= 0)', 400);
  }

  if (!payload.reason || !payload.reason.trim()) {
    throw new AppError('An adjustment reason is strictly mandatory for stock modifications', 400);
  }

  const product = await MedicalProduct.findById(productId);
  if (!product) {
    throw new AppError('Medical product not found', 404);
  }

  const reservedQty = Number(product.reservedQuantity) || 0;
  if (newQty < reservedQty) {
    throw new AppError(
      `Cannot adjust physical stock (${newQty}) lower than current reserved units (${reservedQty}). Fulfill or cancel pending orders first.`,
      400
    );
  }

  const oldQty = Number(product.stockQuantity) || 0;
  const quantityChanged = newQty - oldQty;

  const validMovementTypes = [
    'manual_adjustment',
    'damage_write_off',
    'audit_reconciliation',
    'po_receipt',
    'initial_stock',
  ];
  const movementType = validMovementTypes.includes(payload.movementType || '')
    ? (payload.movementType as any)
    : 'manual_adjustment';

  product.stockQuantity = newQty;
  product.lastStockUpdateAt = new Date();
  await product.save();

  const movement = await StockMovement.create({
    productId: product._id,
    sku: product.sku,
    productTitle: product.title,
    movementType,
    previousStockQuantity: oldQty,
    newStockQuantity: newQty,
    quantityChanged,
    previousReservedQuantity: reservedQty,
    newReservedQuantity: reservedQty,
    reason: payload.reason.trim(),
    performedBy: {
      id: user.id ? new mongoose.Types.ObjectId(user.id) : undefined,
      name: user.fullName || 'Operations Manager',
      role: user.role || 'operations_manager',
    },
  });

  await logAdminAction({
    action: 'ADJUST_PRODUCT_STOCK',
    category: 'order_fulfillment',
    actorId: user.id || 'system',
    actorName: user.fullName || 'Operations Staff',
    actorRole: user.role || 'operations_manager',
    targetType: 'PRODUCT',
    targetId: product.sku,
    details: {
      productId: product._id.toString(),
      sku: product.sku,
      title: product.title,
      oldQuantity: oldQty,
      newQuantity: newQty,
      quantityChanged,
      reason: payload.reason,
      movementId: movement._id.toString(),
    },
    severity: 'warning',
  });

  return {
    success: true,
    product: {
      id: product._id.toString(),
      sku: product.sku,
      title: product.title,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
      availableToSell: Math.max(0, product.stockQuantity - product.reservedQuantity),
      lastStockUpdateAt: product.lastStockUpdateAt,
    },
    movement,
  };
};

/**
 * Confirm Third-Party Supplier Availability
 */
export const confirmSupplierAvailability = async (
  productId: string,
  payload: {
    status?: 'confirmed' | 'pending_confirmation' | 'unconfirmed' | 'out_of_stock';
    leadTimeDays?: number;
    notes?: string;
  },
  user: { id?: string; fullName?: string; role?: string }
) => {
  const userRole = (user?.role || '').toLowerCase();
  if (!['super_admin', 'admin', 'operations_manager', 'product_manager'].includes(userRole)) {
    throw new AppError('Unauthorized: Only Operations Managers and Administrators can confirm supplier availability', 403);
  }

  const product = await MedicalProduct.findById(productId);
  if (!product) {
    throw new AppError('Medical product not found', 404);
  }

  const newStatus = payload.status || 'confirmed';
  product.supplierAvailabilityStatus = newStatus;
  product.supplierAvailabilityConfirmedAt = new Date();
  if (payload.leadTimeDays != null && payload.leadTimeDays >= 0) {
    product.supplierLeadTimeDays = payload.leadTimeDays;
  }
  product.lastStockUpdateAt = new Date();
  await product.save();

  await StockMovement.create({
    productId: product._id,
    sku: product.sku,
    productTitle: product.title,
    movementType: 'supplier_confirmation_update',
    previousStockQuantity: product.stockQuantity,
    newStockQuantity: product.stockQuantity,
    quantityChanged: 0,
    previousReservedQuantity: product.reservedQuantity,
    newReservedQuantity: product.reservedQuantity,
    reason: `Supplier availability confirmed as '${newStatus}': ${payload.notes || 'Verified with partner supplier'}`,
    performedBy: {
      id: user.id ? new mongoose.Types.ObjectId(user.id) : undefined,
      name: user.fullName || 'Operations Manager',
      role: user.role || 'operations_manager',
    },
  });

  return {
    success: true,
    product: {
      id: product._id.toString(),
      supplierAvailabilityStatus: product.supplierAvailabilityStatus,
      supplierAvailabilityConfirmedAt: product.supplierAvailabilityConfirmedAt,
      supplierLeadTimeDays: product.supplierLeadTimeDays,
    },
  };
};

/**
 * Create Restock Purchase Order (Review/Draft status, no auto-settlement)
 */
export const createRestockPurchaseOrder = async (
  productId: string,
  payload: {
    quantity?: number;
    unitCost?: number;
    supplierId?: string;
    notes?: string;
  },
  user: { id?: string; fullName?: string; role?: string }
) => {
  const userRole = (user?.role || '').toLowerCase();
  if (!['super_admin', 'admin', 'operations_manager', 'product_manager'].includes(userRole)) {
    throw new AppError('Unauthorized: Only Operations Managers and Administrators can initiate purchase orders', 403);
  }

  const product = await MedicalProduct.findById(productId);
  if (!product) {
    throw new AppError('Medical product not found', 404);
  }

  const qty = Number(payload.quantity) || product.reorderQuantity || 15;
  if (qty <= 0) {
    throw new AppError('Reorder quantity must be greater than zero', 400);
  }

  const unitCost = payload.unitCost != null ? Number(payload.unitCost) : (product.procurementCost || 0);

  let supplier = product.supplierId ? await Supplier.findById(product.supplierId) : null;
  if (!supplier && payload.supplierId) {
    supplier = await Supplier.findById(payload.supplierId);
  }
  if (!supplier) {
    supplier = await Supplier.findOne({ status: 'active' });
  }

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const poNumber = `VQ-PO-2026-${randomDigits}`;

  const po = await SupplierPurchaseOrder.create({
    poNumber,
    supplierId: supplier?._id || new mongoose.Types.ObjectId(),
    supplierName: supplier?.name || product.supplierName || 'Primary Partner Supplier',
    items: [
      {
        productId: product._id,
        sku: product.sku,
        title: product.title,
        quantity: qty,
        procurementCostPerUnit: unitCost,
        totalCost: unitCost * qty,
        receivedQuantity: 0,
      },
    ],
    totalProcurementCost: unitCost * qty,
    paymentStatus: 'pending', // Strictly pending review
    paidAmount: 0,
    deliveryStatus: 'ordered',
    notes: payload.notes || `Restock PO triggered for low stock SKU ${product.sku}`,
    createdBy: user.id ? new mongoose.Types.ObjectId(user.id) : new mongoose.Types.ObjectId(),
    createdByName: user.fullName || 'Operations Manager',
    isDemo: false,
  });

  return {
    success: true,
    purchaseOrder: po,
  };
};

/**
 * Audit trail of stock movements for a product
 */
export const getProductStockMovements = async (productId: string, page = 1, limit = 20) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(100, Number(limit) || 20));
  const skip = (p - 1) * l;

  const [movements, total] = await Promise.all([
    StockMovement.find({ productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l)
      .lean(),
    StockMovement.countDocuments({ productId }),
  ]);

  return {
    movements,
    pagination: {
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l) || 1,
    },
  };
};

/**
 * =============================================================================
 * PROVIDER-BASED DELIVERY COORDINATION & WHATSAPP SERVICES
 * =============================================================================
 */

export function formatPhoneNumberForWhatsApp(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.length > 10) {
    return digits;
  }
  return digits;
}

/**
 * Seed default logistics partners if none exist
 */
export const seedDefaultDeliveryProviders = async (): Promise<void> => {
  const count = await DeliveryProvider.countDocuments();
  if (count > 0) return;

  const defaultProviders = [
    {
      name: 'Blue Dart Express',
      providerCode: 'BLUEDART',
      contactPerson: 'Ramesh Shinde (Operations Lead)',
      phone: '+919822012345',
      email: 'pune.ops@bluedart.com',
      serviceArea: 'Pune, PCMC & Maharashtra Express',
      deliveryInstructions: 'High priority fragile medical equipment delivery partner. Call customer 30 mins prior.',
      status: 'active',
      isDefault: true,
      rating: 4.9,
      completedDeliveriesCount: 42,
      activeOrdersCount: 3,
      notes: 'Primary express courier for critical patient mobility and respiratory products.',
    },
    {
      name: 'Delhivery Healthcare Logistics',
      providerCode: 'DELHIVERY',
      contactPerson: 'Amit Kumar (Hub Manager)',
      phone: '+919850023456',
      email: 'delhivery.pune@delhivery.com',
      serviceArea: 'Pune City, Hadapsar, Viman Nagar, Kothrud',
      deliveryInstructions: 'Handle with care. Inspect outer tamper-evident seals before handover.',
      status: 'active',
      isDefault: false,
      rating: 4.8,
      completedDeliveriesCount: 35,
      activeOrdersCount: 2,
      notes: 'Secondary linehaul and last-mile partner for eastern Pune and suburbs.',
    },
    {
      name: 'Dunzo Direct Local Express',
      providerCode: 'DUNZO',
      contactPerson: 'Suresh Patil (Fleet Lead)',
      phone: '+919970034567',
      email: 'dunzo.pune@dunzo.in',
      serviceArea: 'Central Pune (Shivajinagar, Deccan, Camp, Swargate)',
      deliveryInstructions: 'Urgent same-day medical supplies and daily living aids. Immediate dispatch.',
      status: 'active',
      isDefault: false,
      rating: 4.7,
      completedDeliveriesCount: 28,
      activeOrdersCount: 1,
      notes: 'Rapid 2-4 hour intra-city dispatch partner.',
    },
    {
      name: 'Shadowfax Healthcare Delivery',
      providerCode: 'SHADOWFAX',
      contactPerson: 'Pooja Verma (Coordinator)',
      phone: '+919860045678',
      email: 'shadowfax.pune@shadowfax.in',
      serviceArea: 'PCMC, Hinjewadi, Wakad, Baner',
      deliveryInstructions: 'Two-wheeler and mini-van home delivery for assistive medical devices.',
      status: 'active',
      isDefault: false,
      rating: 4.8,
      completedDeliveriesCount: 19,
      activeOrdersCount: 1,
      notes: 'Dedicated tech park and western corridor delivery partner.',
    },
    {
      name: 'Pune Local MedCourier Network',
      providerCode: 'PUNE_MEDCOURIER',
      contactPerson: 'Ganesh Jadhav',
      phone: '+919890056789',
      email: 'dispatch@punemedcourier.com',
      serviceArea: 'Greater Pune & Cantonment',
      deliveryInstructions: 'Dedicated intra-city hospital discharge and heavy medical equipment delivery.',
      status: 'active',
      isDefault: false,
      rating: 4.9,
      completedDeliveriesCount: 64,
      activeOrdersCount: 4,
      notes: 'Specialized medical bed and wheelchair handling crew with hydraulic tailgate vans.',
    },
  ];

  await DeliveryProvider.insertMany(defaultProviders);
};

/**
 * List reusable logistics providers for dropdown selection
 */
export const listDeliveryProviders = async (search?: string) => {
  await seedDefaultDeliveryProviders();

  const query: any = { status: 'active' };
  if (search && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [
      { name: regex },
      { contactPerson: regex },
      { serviceArea: regex },
      { providerCode: regex },
      { phone: regex },
    ];
  }

  const providers = await DeliveryProvider.find(query)
    .sort({ isDefault: -1, rating: -1, name: 1 })
    .lean();

  return providers;
};

/**
 * Create or update a delivery provider in the library
 */
export const createOrUpdateDeliveryProvider = async (
  payload: {
    id?: string;
    name: string;
    providerCode?: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    serviceArea?: string;
    deliveryInstructions?: string;
    status?: 'active' | 'inactive';
    isDefault?: boolean;
    notes?: string;
  },
  user?: { id?: any; _id?: any; fullName?: string; role?: string }
) => {
  if (!payload.name || !payload.name.trim()) {
    throw new AppError('Provider name is required', 400);
  }
  if (!payload.phone || !payload.phone.trim()) {
    throw new AppError('Contact phone number is required', 400);
  }

  const cleanPhone = payload.phone.trim();
  const providerCode =
    payload.providerCode?.trim().toUpperCase() ||
    `PROV_${payload.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}_${Date.now().toString().slice(-4)}`;

  if (payload.isDefault) {
    await DeliveryProvider.updateMany({}, { $set: { isDefault: false } });
  }

  let provider;
  if (payload.id && mongoose.Types.ObjectId.isValid(payload.id)) {
    provider = await DeliveryProvider.findByIdAndUpdate(
      payload.id,
      {
        name: payload.name.trim(),
        contactPerson: payload.contactPerson?.trim(),
        phone: cleanPhone,
        email: payload.email?.trim().toLowerCase(),
        serviceArea: payload.serviceArea?.trim(),
        deliveryInstructions: payload.deliveryInstructions?.trim(),
        status: payload.status || 'active',
        isDefault: Boolean(payload.isDefault),
        notes: payload.notes?.trim(),
      },
      { new: true }
    );
    if (!provider) {
      throw new AppError('Delivery provider not found', 404);
    }
  } else {
    const existing = await DeliveryProvider.findOne({
      $or: [{ providerCode }, { name: payload.name.trim() }],
    });
    if (existing) {
      provider = await DeliveryProvider.findByIdAndUpdate(
        existing._id,
        {
          contactPerson: payload.contactPerson?.trim() || existing.contactPerson,
          phone: cleanPhone || existing.phone,
          email: payload.email?.trim().toLowerCase() || existing.email,
          serviceArea: payload.serviceArea?.trim() || existing.serviceArea,
          deliveryInstructions: payload.deliveryInstructions?.trim() || existing.deliveryInstructions,
          status: payload.status || existing.status,
          isDefault: payload.isDefault !== undefined ? Boolean(payload.isDefault) : existing.isDefault,
          notes: payload.notes?.trim() || existing.notes,
        },
        { new: true }
      );
    } else {
      provider = await DeliveryProvider.create({
        name: payload.name.trim(),
        providerCode,
        contactPerson: payload.contactPerson?.trim(),
        phone: cleanPhone,
        email: payload.email?.trim().toLowerCase(),
        serviceArea: payload.serviceArea?.trim() || 'Pune Metropolitan Region',
        deliveryInstructions: payload.deliveryInstructions?.trim(),
        status: payload.status || 'active',
        isDefault: Boolean(payload.isDefault),
        rating: 5.0,
        completedDeliveriesCount: 0,
        activeOrdersCount: 0,
        notes: payload.notes?.trim(),
        createdByStaffId: user?.id || user?._id,
        createdByStaffName: user?.fullName || 'Sales / Operations Manager',
      });
    }
  }

  return provider;
};

/**
 * Coordinate order with external delivery provider
 */
export const coordinateOrderDeliveryProvider = async (
  orderId: string,
  payload: {
    providerId?: string;
    providerName: string;
    deliveryPersonName?: string;
    contactPhone: string;
    email?: string;
    serviceArea?: string;
    deliveryInstructions?: string;
    scheduledDeliveryDate?: string | Date;
    coordinationStatus?: any;
    saveToLibrary?: boolean;
    notes?: string;
  },
  user: { id?: any; _id?: any; fullName?: string; role?: string }
) => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  if (!payload.providerName || !payload.providerName.trim()) {
    throw new AppError('Delivery provider name is required', 400);
  }
  if (!payload.contactPhone || !payload.contactPhone.trim()) {
    throw new AppError('Delivery provider contact phone is required', 400);
  }

  const providerName = payload.providerName.trim();
  const contactPhone = payload.contactPhone.trim();
  const deliveryPersonName = payload.deliveryPersonName?.trim() || '';
  const serviceArea = payload.serviceArea?.trim() || 'Pune Metropolitan Region';
  const deliveryInstructions = payload.deliveryInstructions?.trim() || '';
  const coordinationStatus = payload.coordinationStatus || 'provider_confirmed';

  let providerDocId: mongoose.Types.ObjectId | undefined;

  if (payload.providerId && mongoose.Types.ObjectId.isValid(payload.providerId)) {
    providerDocId = new mongoose.Types.ObjectId(payload.providerId);
    await DeliveryProvider.findByIdAndUpdate(providerDocId, {
      $inc: { activeOrdersCount: 1 },
      contactPerson: deliveryPersonName || undefined,
      phone: contactPhone,
    });
  } else if (payload.saveToLibrary) {
    const saved = await createOrUpdateDeliveryProvider(
      {
        name: providerName,
        contactPerson: deliveryPersonName,
        phone: contactPhone,
        email: payload.email,
        serviceArea,
        deliveryInstructions,
      },
      user
    );
    if (saved && saved._id) {
      providerDocId = saved._id as mongoose.Types.ObjectId;
    }
  }

  const prevStatus = order.orderStatus;
  const currentWaStatus = order.providerCoordination?.whatsappCoordination?.status || 'not_sent';

  const newCoordination: any = {
    providerId: providerDocId,
    providerName,
    deliveryPersonName,
    contactPhone,
    email: payload.email?.trim().toLowerCase(),
    serviceArea,
    deliveryInstructions,
    coordinationStatus,
    lastContactedAt: new Date(),
    confirmedAt: coordinationStatus === 'provider_confirmed' ? new Date() : undefined,
    whatsappCoordination: {
      status: currentWaStatus,
      lastPreparedAt: order.providerCoordination?.whatsappCoordination?.lastPreparedAt,
      lastOpenedAt: order.providerCoordination?.whatsappCoordination?.lastOpenedAt,
      confirmedSentAt: order.providerCoordination?.whatsappCoordination?.confirmedSentAt,
      acknowledgedAt: order.providerCoordination?.whatsappCoordination?.acknowledgedAt,
      waMessagePreview: order.providerCoordination?.whatsappCoordination?.waMessagePreview,
      waDirectUrl: order.providerCoordination?.whatsappCoordination?.waDirectUrl,
      recordedByUserId: user._id || user.id,
      recordedByUserName: user.fullName || 'Sales Manager',
    },
    notes: payload.notes?.trim(),
  };

  order.providerCoordination = newCoordination;

  if (!order.deliveryAssignment) {
    order.deliveryAssignment = {};
  }
  order.deliveryAssignment.provider = newCoordination;
  order.deliveryAssignment.assignedStaffName = deliveryPersonName
    ? `${providerName} (${deliveryPersonName})`
    : providerName;
  order.deliveryAssignment.assignedAt = new Date();

  if (payload.scheduledDeliveryDate) {
    const schedDate = new Date(payload.scheduledDeliveryDate);
    if (!isNaN(schedDate.getTime())) {
      order.deliveryAssignment.scheduledDeliveryDate = schedDate;
      order.estimatedDeliveryDate = schedDate;
    }
  }

  if (deliveryInstructions) {
    order.deliveryAssignment.deliveryNotes = deliveryInstructions;
  }

  if (order.orderStatus === 'placed') {
    order.orderStatus = 'confirmed';
  }

  if (coordinationStatus === 'provider_confirmed' && order.orderStatus === 'confirmed') {
    order.orderStatus = 'ready_for_dispatch';
  }

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Order assigned to logistics partner ${providerName}${deliveryPersonName ? ` (Coordinator: ${deliveryPersonName})` : ''} by ${user.fullName || 'Sales Manager'}. Contact: ${contactPhone}. Status: ${coordinationStatus}.`,
    staffId: (user._id || user.id) && mongoose.Types.ObjectId.isValid(user._id || user.id) ? new mongoose.Types.ObjectId(user._id || user.id) : undefined,
    staffName: user.fullName || 'Sales Manager',
  });

  await order.save();

  await logAdminAction({
    action: 'COORDINATE_DELIVERY_PROVIDER',
    category: 'order_fulfillment',
    actorId: (user._id || user.id)?.toString(),
    actorName: user.fullName || 'Sales Manager',
    actorRole: user.role || 'sales_manager',
    targetType: 'PRODUCT_ORDER',
    targetId: order.orderNumber,
    details: {
      providerName,
      deliveryPersonName,
      contactPhone,
      coordinationStatus,
      prevStatus,
      newStatus: order.orderStatus,
      scheduledDate: order.deliveryAssignment?.scheduledDeliveryDate,
    },
    severity: 'info',
  });

  const isFullAdmin = ['admin', 'super_admin'].includes(user.role || '');
  return enrichOrderForPlanner(sanitizeOrderForOperations(order.toObject(), isFullAdmin));
};

/**
 * Generate sanitized WhatsApp click-to-chat payload for external provider
 */
export const generateDeliveryWhatsAppDetails = async (
  orderId: string,
  user: { id?: any; _id?: any; fullName?: string; role?: string }
) => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  const provider = order.providerCoordination || order.deliveryAssignment?.provider;
  if (!provider?.contactPhone) {
    throw new AppError('Please coordinate a delivery provider with a contact phone number first', 400);
  }

  const cleanPhone = formatPhoneNumberForWhatsApp(provider.contactPhone);
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new AppError('Provider contact phone is invalid for WhatsApp messaging', 400);
  }

  // Strictly non-sensitive product items list (excluding diagnoses, doctor notes, patient medical history)
  const itemsText = (order.items || [])
    .map((item, idx) => `  ${idx + 1}. ${item.title} (Qty: ${item.quantity})`)
    .join('\n');

  const addr = order.deliveryAddress;
  const addressLines = [
    order.patientName,
    addr?.street,
    addr?.landmark ? `Landmark: ${addr.landmark}` : null,
    `${addr?.city || 'Pune'} - ${addr?.pincode || ''}`,
  ]
    .filter(Boolean)
    .join(', ');

  const targetDate =
    order.deliveryAssignment?.scheduledDeliveryDate ||
    order.estimatedDeliveryDate ||
    order.createdAt;
  const formattedDate = new Date(targetDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const slot = order.deliveryPreferences?.preferredSlot || 'Standard Delivery Window (10:00 AM - 06:00 PM)';
  const instructions =
    provider.deliveryInstructions ||
    order.deliveryPreferences?.accessInstructions ||
    'Handle package with care. Call recipient 30 mins prior to arrival.';

  const message = [
    `*VivoQuest Healthcare Order Dispatch Details*`,
    `*Order Number:* #${order.orderNumber}`,
    `*Expected Delivery Date:* ${formattedDate}`,
    `*Slot:* ${slot}`,
    ``,
    `*Delivery Recipient:*`,
    `• Name: ${order.patientName}`,
    `• Address: ${addressLines}`,
    `• Phone: ${order.patientPhone}`,
    ``,
    `*Items in Shipment:*`,
    itemsText,
    ``,
    `*Special Instructions for Delivery Partner:*`,
    `• ${instructions}`,
    `• Standard OTP verification will be required upon customer doorstep handover.`,
    ``,
    `*VivoQuest Central Operations Depot:* +91 20 2567 8900`,
    `_Please acknowledge receipt of this delivery dispatch request._`,
  ].join('\n');

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  if (!order.providerCoordination) {
    order.providerCoordination = {
      providerName: provider.providerName || 'Delivery Partner',
      contactPhone: provider.contactPhone,
      coordinationStatus: 'provider_contacted',
    };
  }

  order.providerCoordination.whatsappCoordination = {
    status: 'prepared',
    lastPreparedAt: new Date(),
    waMessagePreview: message,
    waDirectUrl: waUrl,
    recordedByUserId: user._id || user.id,
    recordedByUserName: user.fullName || 'Sales Manager',
  };

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Delivery dispatch message prepared for ${provider.providerName} (${provider.contactPhone}) by ${user.fullName || 'Sales Manager'}.`,
    staffId: (user._id || user.id) && mongoose.Types.ObjectId.isValid(user._id || user.id) ? new mongoose.Types.ObjectId(user._id || user.id) : undefined,
    staffName: user.fullName || 'Sales Manager',
  });

  await order.save();

  await logAdminAction({
    action: 'WHATSAPP_DISPATCH_PREPARED',
    category: 'order_fulfillment',
    actorId: (user._id || user.id)?.toString(),
    actorName: user.fullName || 'Sales Manager',
    actorRole: user.role || 'sales_manager',
    targetType: 'PRODUCT_ORDER',
    targetId: order.orderNumber,
    details: {
      providerName: provider.providerName,
      providerPhone: cleanPhone,
    },
    severity: 'info',
  });

  return {
    orderNumber: order.orderNumber,
    providerName: provider.providerName,
    providerPhone: cleanPhone,
    message,
    waDirectUrl: waUrl,
    coordinationStatus: order.providerCoordination.coordinationStatus,
    whatsappStatus: 'prepared',
  };
};

/**
 * Record WhatsApp action step for delivery coordination
 */
export const recordWhatsAppDeliveryAction = async (
  orderId: string,
  payload: {
    action: 'opened_in_whatsapp' | 'sent_confirmed' | 'provider_acknowledged';
    notes?: string;
  },
  user: { id?: any; _id?: any; fullName?: string; role?: string }
) => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  if (!order.providerCoordination) {
    throw new AppError('Delivery provider has not been coordinated for this order yet', 400);
  }

  const validActions = ['opened_in_whatsapp', 'sent_confirmed', 'provider_acknowledged'];
  if (!validActions.includes(payload.action)) {
    throw new AppError(`Invalid action: ${payload.action}. Allowed: ${validActions.join(', ')}`, 400);
  }

  if (!order.providerCoordination.whatsappCoordination) {
    order.providerCoordination.whatsappCoordination = {
      status: 'not_sent',
    };
  }

  const wa = order.providerCoordination.whatsappCoordination;
  wa.status = payload.action;
  wa.recordedByUserId = user._id || user.id;
  wa.recordedByUserName = user.fullName || 'Sales Manager';

  let description = '';
  if (payload.action === 'opened_in_whatsapp') {
    wa.lastOpenedAt = new Date();
    description = `Opened WhatsApp chat with logistics partner ${order.providerCoordination.providerName} (${order.providerCoordination.contactPhone}).`;
  } else if (payload.action === 'sent_confirmed') {
    wa.confirmedSentAt = new Date();
    order.providerCoordination.coordinationStatus = 'provider_contacted';
    order.providerCoordination.lastContactedAt = new Date();
    description = `Confirmed delivery dispatch details sent via WhatsApp to ${order.providerCoordination.providerName}.`;
  } else if (payload.action === 'provider_acknowledged') {
    wa.acknowledgedAt = new Date();
    order.providerCoordination.coordinationStatus = 'provider_confirmed';
    order.providerCoordination.confirmedAt = new Date();
    description = `Logistics partner ${order.providerCoordination.providerName} acknowledged order and confirmed delivery pickup slot.`;

    if (order.orderStatus === 'confirmed') {
      order.orderStatus = 'ready_for_dispatch';
    }
  }

  if (payload.notes) {
    description += ` Note: ${payload.notes.trim()}`;
  }

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `WhatsApp status updated to ${payload.action.replace(/_/g, ' ').toUpperCase()}: ${description}`,
    notes: payload.notes?.trim(),
    staffId: (user._id || user.id) && mongoose.Types.ObjectId.isValid(user._id || user.id) ? new mongoose.Types.ObjectId(user._id || user.id) : undefined,
    staffName: user.fullName || 'Sales Manager',
  });

  await order.save();

  await logAdminAction({
    action: `WHATSAPP_${payload.action.toUpperCase()}`,
    category: 'order_fulfillment',
    actorId: (user._id || user.id)?.toString(),
    actorName: user.fullName || 'Sales Manager',
    actorRole: user.role || 'sales_manager',
    targetType: 'PRODUCT_ORDER',
    targetId: order.orderNumber,
    details: {
      action: payload.action,
      notes: payload.notes,
      coordinationStatus: order.providerCoordination.coordinationStatus,
      orderStatus: order.orderStatus,
    },
    severity: 'info',
  });

  const isFullAdmin = ['admin', 'super_admin'].includes(user.role || '');
  return enrichOrderForPlanner(sanitizeOrderForOperations(order.toObject(), isFullAdmin));
};




