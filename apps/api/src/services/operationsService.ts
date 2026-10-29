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
  page?: number;
  limit?: number;
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
  const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const [rawOrders, total] = await Promise.all([
    ProductOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ProductOrder.countDocuments(query),
  ]);

  const sanitizedOrders = rawOrders.map((o) => sanitizeOrderForOperations(o, isFullAdmin));

  return {
    orders: sanitizedOrders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
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
  }

  if (newStatus === 'delivery_attempt_failed' || newStatus === 'delivery_rescheduled') {
    order.deliveryAssignment.failureReason = data.failureReason || data.notes || 'Delivery rescheduled';
    if (data.scheduledDeliveryDate) {
      order.deliveryAssignment.scheduledDeliveryDate = new Date(data.scheduledDeliveryDate);
      order.estimatedDeliveryDate = new Date(data.scheduledDeliveryDate);
    }
  }

  // If cancelling order, restore inventory
  if (newStatus === 'cancelled') {
    for (const item of order.items) {
      await MedicalProduct.findByIdAndUpdate(item.productId, {
        $inc: {
          stockQuantity: item.quantity,
          reservedQuantity: -item.quantity,
        },
      });
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

  if (data.setupStatus) {
    order.clinicalSetup.setupStatus = data.setupStatus;
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

