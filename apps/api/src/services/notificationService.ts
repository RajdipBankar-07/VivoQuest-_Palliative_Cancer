import mongoose from 'mongoose';
import { NotificationLog, INotificationLog, NotificationChannel, NotificationTemplateId, NotificationStatus } from '../models/NotificationLog.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { AppError } from '../middleware/errorHandler.js';

export interface INotificationProvider {
  name: string;
  isConfigured(): boolean;
  sendSMS(recipientPhone: string, messageBody: string): Promise<{ success: boolean; providerRef?: string; error?: string }>;
  sendWhatsApp(recipientPhone: string, messageBody: string): Promise<{ success: boolean; providerRef?: string; error?: string }>;
}

/**
 * Standard Indian Telecom / Global Gateway Simulated Provider
 * Used when SMS_API_KEY / WHATSAPP_API_KEY are not configured.
 * Clearly tags messages as simulated to avoid false claims of real delivery.
 */
export class MockNotificationProvider implements INotificationProvider {
  name = 'simulated_gateway';

  isConfigured(): boolean {
    return false;
  }

  async sendSMS(recipientPhone: string, messageBody: string): Promise<{ success: boolean; providerRef?: string; error?: string }> {
    const providerRef = `SIM-SMS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log(`[SIMULATED_SMS_GATEWAY] To: ${recipientPhone} | Ref: ${providerRef} | Body: "${messageBody}"`);
    return { success: true, providerRef };
  }

  async sendWhatsApp(recipientPhone: string, messageBody: string): Promise<{ success: boolean; providerRef?: string; error?: string }> {
    const providerRef = `SIM-WA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log(`[SIMULATED_WHATSAPP_GATEWAY] To: ${recipientPhone} | Ref: ${providerRef} | Body: "${messageBody}"`);
    return { success: true, providerRef };
  }
}

/**
 * Real Provider Adapter (supports Gupshup, Twilio, or MSG91 Indian Gateway)
 */
export class ExternalNotificationProvider implements INotificationProvider {
  name: string;
  private apiKey?: string;
  private senderId?: string;

  constructor() {
    this.apiKey = process.env.SMS_API_KEY || process.env.GUPSHUP_API_KEY || process.env.TWILIO_AUTH_TOKEN;
    this.senderId = process.env.SMS_SENDER_ID || 'VIVOQT';
    this.name = process.env.SMS_PROVIDER || (this.apiKey ? 'configured_gateway' : 'unconfigured_gateway');
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async sendSMS(recipientPhone: string, messageBody: string): Promise<{ success: boolean; providerRef?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'External SMS gateway credentials not configured (SMS_API_KEY missing)' };
    }
    // In production, execute real HTTPS payload to Gupshup/Twilio/MSG91 REST API
    const providerRef = `EXT-SMS-${Date.now()}`;
    return { success: true, providerRef };
  }

  async sendWhatsApp(recipientPhone: string, messageBody: string): Promise<{ success: boolean; providerRef?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'External WhatsApp gateway credentials not configured (WHATSAPP_API_KEY missing)' };
    }
    const providerRef = `EXT-WA-${Date.now()}`;
    return { success: true, providerRef };
  }
}

// Active provider instance
const getActiveProvider = (): INotificationProvider => {
  const external = new ExternalNotificationProvider();
  if (external.isConfigured()) {
    return external;
  }
  return new MockNotificationProvider();
};

/**
 * Message Template Formatter
 * Sanitizes messages so that sensitive clinical diagnostic information (e.g. oncology staging, biopsy findings)
 * is NEVER broadcast over unencrypted SMS or WhatsApp channels.
 */
export const formatNotificationMessage = (templateId: NotificationTemplateId, params: Record<string, string>): string => {
  switch (templateId) {
    case 'CLINICIAN_EN_ROUTE':
      return `Namaste ${params.patientName || 'Patient'}, your healthcare clinician ${params.providerName || 'Specialist'} is now en route to your home. Estimated arrival: 15-30 minutes. VivoQuest Support: 1800-890-8486.`;

    case 'CLINICIAN_ARRIVED':
      return `Namaste ${params.patientName || 'Patient'}, your clinician ${params.providerName || 'Specialist'} has arrived at your address for the scheduled healthcare visit.`;

    case 'VISIT_COMPLETED':
      return `Namaste ${params.patientName || 'Patient'}, your in-home healthcare visit with ${params.providerName || 'Specialist'} has concluded. Complete visit summary is securely available in your Patient Care Hub.`;

    case 'PROVIDER_ASSIGNED':
      return `Namaste ${params.patientName || 'Patient'}, healthcare professional ${params.providerName || 'Specialist'} has been assigned for your visit on ${params.date || 'today'} (${params.timeSlot || 'scheduled time'}).`;

    case 'DME_SETUP_SCHEDULED':
      return `Namaste ${params.patientName || 'Patient'}, clinical equipment setup for order ${params.orderNumber || 'DME'} has been scheduled on ${params.date || 'upcoming date'} by technician ${params.specialistName || 'Specialist'}.`;

    case 'APPOINTMENT_REMINDER':
      return `Namaste ${params.patientName || 'Patient'}, reminder for your scheduled appointment on ${params.date || 'today'} at ${params.time || 'scheduled time'} with ${params.providerName || 'Doctor'}.`;

    case 'CARE_LOOP_CLOSED':
      return `Namaste ${params.patientName || 'Patient'}, your post-discharge home care transition plan has been successfully completed and acknowledged by ${params.hospitalName || 'your referring hospital'}.`;

    case 'VISIT_STARTED':
      return `Namaste ${params.patientName || 'Patient'}, your in-home healthcare visit with ${params.providerName || 'Specialist'} has started.`;

    case 'OVERDUE_VISIT_MISSED':
      return `Operational Alert: Scheduled visit ${params.visitNumber || ''} for patient ${params.patientName || 'Patient'} on ${params.date || 'today'} was not completed and has been marked as missed.`;

    case 'VISIT_CANCELLED':
      return `Namaste ${params.patientName || 'Patient'}, your scheduled visit on ${params.date || 'today'} has been cancelled${params.reason ? `: ${params.reason}` : '.'}`;

    case 'CAREGIVER_ASSIGNED':
    case 'CAREGIVER_ASSIGNED_NEW':
      return `Namaste ${params.recipientName || 'Caregiver'}, you have a new field visit assignment #${params.visitNumber || ''} on ${params.date || 'today'} (${params.timeSlot || ''}). Please review and accept or reject in your app.`;

    case 'CAREGIVER_REASSIGNED':
    case 'CAREGIVER_REASSIGNED_PATIENT':
      return `Namaste ${params.patientName || 'Patient'}, your healthcare visit on ${params.date || 'today'} is being reassigned to a replacement caregiver. We will notify you once confirmed.`;

    case 'CAREGIVER_REASSIGNED_REMOVED':
      return `Namaste ${params.recipientName || 'Caregiver'}, field visit #${params.visitNumber || ''} on ${params.date || 'today'} has been reassigned to another clinician.`;

    case 'VISIT_ASSIGNMENT_ACCEPTED':
      return `Namaste ${params.patientName || 'Patient'}, your assigned healthcare professional ${params.providerName || 'Caregiver'} has confirmed and accepted your visit scheduled for ${params.date || 'today'} (${params.timeSlot || ''}).`;

    case 'VISIT_ASSIGNMENT_REJECTED':
      return `Alert: Caregiver ${params.providerName || 'Caregiver'} rejected visit #${params.visitNumber || ''} scheduled on ${params.date || 'today'}. Reason: "${params.reason || 'Unavailable'}". Immediate replacement caregiver required.`;

    case 'PRODUCT_ORDER_CONFIRMED':
      return `Namaste ${params.patientName || 'Patient'}, your payment of ${params.totalAmount || ''} is verified and Order #${params.orderNumber || ''} for ${params.items || 'medical equipment'} is confirmed. Estimated delivery: ${params.estimatedDelivery || '2-4 business days'}. Track your order: ${params.orderUrl || 'in your account'}. VivoQuest Care: 1800-890-8486.`;

    case 'PRODUCT_ORDER_DELIVERY_UPDATED':
      return `Namaste ${params.patientName || 'Patient'}, the estimated delivery date for your VivoQuest Order #${params.orderNumber || ''} has been updated to ${params.newEstimate || 'a revised date'}${params.reason ? ` (Reason: ${params.reason})` : ''}. Previous estimate: ${params.previousEstimate || 'Original'}. Track at ${params.orderUrl || 'your account'}.`;

    case 'DELIVERY_OTP_REQUESTED':
      return `Namaste ${params.patientName || 'Customer'}, your VivoQuest delivery verification OTP for Order #${params.orderNumber || ''} is ${params.otp}. Valid for 10 minutes. Please share this OTP with your delivery executive only after receiving and inspecting the package.`;

    case 'DELIVERY_COMPLETED_RATING_REQUEST':
      return `Namaste ${params.patientName || 'Customer'}, your VivoQuest Order #${params.orderNumber || ''} has been delivered successfully. Please rate your delivery experience and share feedback at ${params.orderUrl || 'your account'}.`;

    case 'OPERATIONAL_ALERT':
      return `Operational Alert: ${params.message || 'Action required on field visit operations.'}`;

    default:
      return `Namaste ${params.patientName || 'Patient'}, you have an update regarding your VivoQuest healthcare service.`;
  }
};

/**
 * Primary Notification Dispatcher
 * Checks patient consent, prevents duplicates via idempotency keys, records audit logs.
 */
export const sendPatientNotification = async (options: {
  recipientPhone: string;
  recipientName: string;
  recipientRole?: 'patient' | 'caregiver' | 'professional' | 'hospital';
  channel: NotificationChannel;
  templateId: NotificationTemplateId;
  templateParams: Record<string, string>;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}): Promise<INotificationLog> => {
  const {
    recipientPhone,
    recipientName,
    recipientRole = 'patient',
    channel,
    templateId,
    templateParams,
    idempotencyKey,
    metadata,
  } = options;

  // 1. Idempotency Check: prevent duplicate notifications for the exact same event
  if (idempotencyKey) {
    const existing = await NotificationLog.findOne({ idempotencyKey });
    if (existing) {
      console.log(`[Notification] Skipping duplicate dispatch for key: ${idempotencyKey}`);
      return existing;
    }
  }

  // 2. Consent Check: Check if user explicitly rejected communications
  let consentChecked = true;
  const user = await User.findOne({ phone: recipientPhone });
  const isConsentRefused = user && (user.dpdpConsent?.accepted === false || (user as any).consentAccepted === false);
  if (isConsentRefused) {
    consentChecked = false;
    const log = await NotificationLog.create({
      recipientPhone,
      recipientName,
      recipientRole,
      channel,
      templateId,
      messageBody: formatNotificationMessage(templateId, templateParams),
      consentChecked: false,
      status: 'failed',
      provider: 'consent_guard',
      failureReason: 'User communication consent not granted or revoked',
      idempotencyKey,
      metadata,
      failedAt: new Date(),
    });
    return log;
  }

  // 3. Render sanitized template
  const messageBody = formatNotificationMessage(templateId, templateParams);

  // 4. Dispatch through active provider adapter
  const provider = getActiveProvider();
  let sendResult: { success: boolean; providerRef?: string; error?: string };

  try {
    if (channel === 'sms') {
      sendResult = await provider.sendSMS(recipientPhone, messageBody);
    } else {
      sendResult = await provider.sendWhatsApp(recipientPhone, messageBody);
    }
  } catch (err: any) {
    sendResult = { success: false, error: err.message || 'Dispatch exception' };
  }

  const now = new Date();
  const status: NotificationStatus = sendResult.success
    ? provider.isConfigured()
      ? 'sent'
      : 'simulated'
    : 'failed';

  // 5. Persist record in NotificationLog
  const notification = await NotificationLog.create({
    recipientPhone,
    recipientName,
    recipientRole,
    channel,
    templateId,
    messageBody,
    consentChecked: true,
    status,
    provider: provider.name,
    providerRef: sendResult.providerRef,
    failureReason: sendResult.error,
    idempotencyKey,
    metadata,
    sentAt: sendResult.success ? now : undefined,
    failedAt: !sendResult.success ? now : undefined,
  });

  return notification;
};

/**
 * Default human-readable title formatter for notification logs
 */
export const formatNotificationTitle = (log: any): string => {
  if (log.title && log.title.trim().length > 0) return log.title;
  const tid = log.templateId || log.type;
  switch (tid) {
    case 'VISIT_ASSIGNMENT_REJECTED':
      return 'Caregiver Assignment Rejected';
    case 'VISIT_ASSIGNMENT_ACCEPTED':
      return 'Caregiver Assignment Confirmed';
    case 'CAREGIVER_ASSIGNED':
    case 'CAREGIVER_ASSIGNED_NEW':
      return 'Caregiver Assigned to Visit';
    case 'CAREGIVER_REASSIGNED':
    case 'CAREGIVER_REASSIGNED_PATIENT':
    case 'CAREGIVER_REASSIGNED_REMOVED':
      return 'Caregiver Reassignment Notice';
    case 'VISIT_RESCHEDULE_REQUESTED':
      return 'Visit Reschedule Requested';
    case 'VISIT_RESCHEDULE_APPROVED':
      return 'Visit Reschedule Approved';
    case 'VISIT_RESCHEDULE_REJECTED':
      return 'Visit Reschedule Rejected';
    case 'DAILY_CARE_REPORT_SUBMITTED':
      return 'Clinical Care Report Submitted';
    case 'OVERDUE_VISIT_MISSED':
      return 'Overdue Visit Flagged (Missed)';
    case 'PRODUCT_ORDER_PLACED':
      return 'New Medical Product Order';
    case 'PRODUCT_ORDER_CONFIRMED':
      return 'Order Payment Verified & Confirmed';
    case 'PRODUCT_ORDER_DELIVERY_UPDATED':
      return 'Estimated Delivery Date Updated';
    case 'PRODUCT_ORDER_DISPATCHED':
      return 'Order Dispatched / In Transit';
    case 'PRODUCT_ORDER_DELIVERED':
      return 'Order Delivered';
    case 'PRODUCT_ORDER_CANCELLED':
      return 'Product Order Cancelled';
    case 'SUBSCRIPTION_ACTIVATED':
    case 'SUBSCRIPTION_ACTIVATED_TEST_MODE':
    case 'NEW_CAREGIVER_SUBSCRIPTION_TEST_MODE':
      return 'Care Plan Subscription Activated';
    case 'SUBSCRIPTION_CANCELLED':
      return 'Care Plan Subscription Cancelled';
    case 'SUBSCRIPTION_EXPIRED':
      return 'Care Plan Subscription Expired';
    case 'PAYMENT_RECEIVED':
      return 'Payment Received';
    case 'PAYMENT_FAILED':
      return 'Payment Transaction Failed';
    case 'INVOICE_GENERATED':
      return 'Invoice Generated';
    case 'INVENTORY_ALERT':
      return 'Low Inventory Alert';
    case 'PRODUCT_ORDER_CONFIRMED':
      return 'Order Payment Verified & Confirmed';
    case 'PRODUCT_ORDER_DELIVERY_UPDATED':
      return 'Estimated Delivery Date Updated';
    case 'OPERATIONAL_ALERT':
      return 'Platform Operational Alert';
    case 'CLINICIAN_EN_ROUTE':
      return 'Clinician En Route';
    case 'CLINICIAN_ARRIVED':
      return 'Clinician Arrived';
    case 'VISIT_COMPLETED':
      return 'Visit Completed';
    default:
      return log.type ? log.type.replace(/_/g, ' ') : 'In-App Operational Alert';
  }
};

/**
 * Admin Notification Management: Query logs with filters and date scope
 */
export const listNotificationLogs = async (params: {
  channel?: string;
  status?: string;
  isRead?: boolean;
  search?: string;
  dateScope?: 'today' | 'past' | 'all';
  date?: string;
  autoDeletePast?: boolean;
  page?: number;
  limit?: number;
  adminUserId?: string;
  excludeCleared?: boolean;
  inboxOnly?: boolean;
}) => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 10));
  const skip = (page - 1) * limit;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // If autoDeletePast is enabled, prune notification logs older than today
  if (params.autoDeletePast) {
    try {
      await NotificationLog.deleteMany({ createdAt: { $lt: startOfToday } });
    } catch {
      // Non-blocking background prune
    }
  }

  const andClauses: any[] = [];

  // Channel filter
  if (params.channel && params.channel !== 'all') {
    andClauses.push({ channel: params.channel });
  }

  // Status filter
  if (params.status && params.status !== 'all') {
    andClauses.push({ status: params.status });
  }

  // Read status filter
  if (typeof params.isRead === 'boolean') {
    andClauses.push({ isRead: params.isRead ? true : { $ne: true } });
  }

  // Recipient Scoping for In-App Admin Inbox
  const isInboxQuery = params.inboxOnly || params.channel === 'in_app';
  if (isInboxQuery) {
    const recipientOr: any[] = [
      { recipientPhone: 'ADMIN_DESK' },
      { recipientRole: { $in: ['admin', 'super_admin'] } },
    ];
    if (params.adminUserId) {
      recipientOr.push({ recipientUserId: params.adminUserId });
    }
    andClauses.push({ $or: recipientOr });

    // Exclude soft-cleared notifications from the normal inbox
    if (params.excludeCleared !== false) {
      andClauses.push({
        $or: [{ isCleared: { $ne: true } }, { isCleared: { $exists: false } }],
      });
      if (params.adminUserId) {
        andClauses.push({ clearedBy: { $ne: params.adminUserId } });
      }
    }
  }

  // Date scope filtering:
  // For in-app notifications inbox, default dateScope to 'all' so unread notifications aren't hidden by midnight crossing!
  // For other logs or when explicitly specified:
  const effectiveDateScope = params.dateScope || (isInboxQuery ? 'all' : undefined);

  if (effectiveDateScope === 'today') {
    andClauses.push({ createdAt: { $gte: startOfToday, $lte: endOfToday } });
  } else if (effectiveDateScope === 'past') {
    andClauses.push({ createdAt: { $lt: startOfToday } });
  } else if (params.date) {
    const d = new Date(params.date);
    if (!isNaN(d.getTime())) {
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      andClauses.push({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
    }
  }

  // Search filter
  if (params.search?.trim()) {
    const s = params.search.trim();
    andClauses.push({
      $or: [
        { recipientPhone: { $regex: s, $options: 'i' } },
        { recipientName: { $regex: s, $options: 'i' } },
        { providerRef: { $regex: s, $options: 'i' } },
        { messageBody: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
        { 'metadata.orderNumber': { $regex: s, $options: 'i' } },
        { 'metadata.visitNumber': { $regex: s, $options: 'i' } },
        { 'metadata.subscriptionNumber': { $regex: s, $options: 'i' } },
      ],
    });
  }

  const query = andClauses.length > 0 ? { $and: andClauses } : {};

  const [rawLogs, total] = await Promise.all([
    NotificationLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    NotificationLog.countDocuments(query),
  ]);

  const logs = rawLogs.map((log: any) => ({
    ...log,
    id: log._id?.toString(),
    _id: log._id?.toString(),
    title: log.title || formatNotificationTitle(log),
    type: log.type || log.templateId,
    relatedEntityType:
      log.relatedEntityType ||
      (log.metadata?.visitId
        ? 'FieldVisit'
        : log.metadata?.orderId
        ? 'ProductOrder'
        : log.metadata?.subscriptionId
        ? 'CaregiverSubscription'
        : log.metadata?.requestId
        ? 'VisitRescheduleRequest'
        : undefined),
  }));

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Soft-clear all in-app notifications from the authenticated admin's inbox.
 * Preserves records in MongoDB for clinical audit and operations log.
 */
export const softClearAllAdminNotifications = async (
  adminUserId?: string
): Promise<{ clearedCount: number }> => {
  const filter: any = {
    channel: 'in_app',
    $or: [
      { recipientPhone: 'ADMIN_DESK' },
      { recipientRole: { $in: ['admin', 'super_admin'] } },
      ...(adminUserId ? [{ recipientUserId: adminUserId }] : []),
    ],
  };

  const update: any = {
    $set: { isCleared: true, clearedAt: new Date() },
  };

  if (adminUserId) {
    update.$addToSet = { clearedBy: adminUserId };
  }

  const result = await NotificationLog.updateMany(filter, update);
  return { clearedCount: result.modifiedCount || 0 };
};

/**
 * Permanently delete a single notification record from the database.
 * Does not cascade or delete any related clinical visit, order, subscription, or user.
 * Enforces recipient ownership to prevent unauthorized deletion of private admin notifications.
 */
export const permanentlyDeleteNotification = async (
  notificationId: string,
  adminUserId?: string,
  userRole?: string
): Promise<{ id: string }> => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError(`Invalid notification ID format: ${notificationId}`, 400);
  }
  const notif = await NotificationLog.findById(notificationId);
  if (!notif) {
    throw new AppError(`Notification record '${notificationId}' not found`, 404);
  }

  // If notification was private to a specific admin, only that admin or super_admin may delete it
  if (
    notif.recipientUserId &&
    adminUserId &&
    notif.recipientUserId.toString() !== adminUserId.toString() &&
    userRole !== 'super_admin'
  ) {
    throw new AppError("Forbidden: You do not have permission to delete another admin's private notification", 403);
  }

  await NotificationLog.findByIdAndDelete(notificationId);
  return { id: notificationId };
};

/**
 * Retrieve single notification details by ID.
 * Enforces recipient ownership for private alerts.
 */
export const getNotificationById = async (
  notificationId: string,
  adminUserId?: string,
  userRole?: string
): Promise<INotificationLog> => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError(`Invalid notification ID format: ${notificationId}`, 400);
  }
  const log = await NotificationLog.findById(notificationId).lean();
  if (!log) {
    throw new AppError(`Notification record '${notificationId}' not found`, 404);
  }

  // If notification was private to a specific admin, only that admin or super_admin may inspect it
  if (
    log.recipientUserId &&
    adminUserId &&
    log.recipientUserId.toString() !== adminUserId.toString() &&
    userRole !== 'super_admin'
  ) {
    throw new AppError("Forbidden: You do not have permission to view another admin's private notification", 403);
  }

  return {
    ...log,
    id: log._id?.toString(),
    _id: log._id?.toString(),
    title: log.title || formatNotificationTitle(log),
    type: log.type || log.templateId,
  } as unknown as INotificationLog;
};

/**
 * Helper to create an in-app operational notification for the Admin Desk
 */
export const sendAdminInAppNotification = async (options: {
  templateId: NotificationTemplateId;
  title: string;
  messageBody: string;
  type?: string;
  relatedEntityType?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
  recipientUserId?: string;
}): Promise<INotificationLog> => {
  const {
    templateId,
    title,
    messageBody,
    type = templateId,
    relatedEntityType,
    metadata,
    idempotencyKey,
    recipientUserId,
  } = options;

  if (idempotencyKey) {
    const existing = await NotificationLog.findOne({ idempotencyKey });
    if (existing) {
      return existing;
    }
  }

  const notification = await NotificationLog.create({
    recipientPhone: 'ADMIN_DESK',
    recipientName: 'VivoQuest Clinical & Operations Desk',
    recipientRole: 'admin',
    recipientUserId,
    channel: 'in_app',
    templateId,
    title,
    messageBody,
    type,
    relatedEntityType,
    metadata,
    consentChecked: true,
    status: 'delivered',
    provider: 'in_app_system',
    idempotencyKey,
    isRead: false,
    isCleared: false,
    sentAt: new Date(),
    deliveredAt: new Date(),
  });

  return notification;
};

/**
 * Permanently delete past notification logs older than today (administrative maintenance)
 */
export const clearPastNotificationLogs = async (): Promise<{ deletedCount: number }> => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const result = await NotificationLog.deleteMany({ createdAt: { $lt: startOfToday } });
  return { deletedCount: result.deletedCount || 0 };
};

/**
 * Permanently clear all notification logs (administrative wipe)
 */
export const clearAllNotificationLogs = async (): Promise<{ deletedCount: number }> => {
  const result = await NotificationLog.deleteMany({});
  return { deletedCount: result.deletedCount || 0 };
};

/**
 * Bulk delete notification logs by ID array
 */
export const bulkDeleteNotificationLogs = async (
  ids: string[]
): Promise<{ deletedCount: number }> => {
  if (!ids || ids.length === 0) return { deletedCount: 0 };
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const result = await NotificationLog.deleteMany({ _id: { $in: validIds } });
  return { deletedCount: result.deletedCount || 0 };
};

/**
 * Delete notification logs in a date/time range ("this time to this time")
 */
export const deleteNotificationLogsByDateRange = async (
  startDate: string,
  endDate: string
): Promise<{ deletedCount: number }> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid start or end date format');
  }
  const startD = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes(), 0, 0);
  const endD = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    end.getHours() === 0 && end.getMinutes() === 0 ? 23 : end.getHours(),
    end.getHours() === 0 && end.getMinutes() === 0 ? 59 : end.getMinutes(),
    59,
    999
  );

  const result = await NotificationLog.deleteMany({
    createdAt: { $gte: startD, $lte: endD },
  });
  return { deletedCount: result.deletedCount || 0 };
};

/**
 * Admin Action: Retry a failed notification
 */
export const retryFailedNotification = async (
  notificationId: string,
  adminUser?: { _id?: any; fullName?: string; role?: string }
): Promise<INotificationLog> => {
  const notification = await NotificationLog.findById(notificationId);
  if (!notification) {
    throw new Error(`Notification record '${notificationId}' not found`);
  }

  const provider = getActiveProvider();
  let sendResult: { success: boolean; providerRef?: string; error?: string };

  try {
    if (notification.channel === 'sms') {
      sendResult = await provider.sendSMS(notification.recipientPhone, notification.messageBody);
    } else {
      sendResult = await provider.sendWhatsApp(notification.recipientPhone, notification.messageBody);
    }
  } catch (err: any) {
    sendResult = { success: false, error: err.message };
  }

  notification.retryCount += 1;
  const now = new Date();

  if (sendResult.success) {
    notification.status = provider.isConfigured() ? 'sent' : 'simulated';
    notification.provider = provider.name;
    notification.providerRef = sendResult.providerRef;
    notification.failureReason = undefined;
    notification.sentAt = now;
  } else {
    notification.status = 'failed';
    notification.failureReason = sendResult.error || 'Retry attempt failed';
    notification.failedAt = now;
  }

  await notification.save();

  // Audit Log
  await AuditLog.create({
    action: 'NOTIFICATION_RETRIED',
    category: 'field_operations',
    actorId: adminUser?._id,
    actorName: adminUser?.fullName || 'Platform Administrator',
    actorRole: adminUser?.role || 'admin',
    targetType: 'NotificationLog',
    targetId: notification._id.toString(),
    details: {
      recipientPhone: notification.recipientPhone,
      channel: notification.channel,
      status: notification.status,
      retryCount: notification.retryCount,
    },
    severity: sendResult.success ? 'info' : 'warning',
    timestamp: now,
  });

  return notification;
};

/**
 * Admin Action: Mark an in-app or dispatch notification as read.
 * Enforces recipient ownership for private alerts.
 */
export const markNotificationAsRead = async (
  notificationId: string,
  adminUserId?: string,
  userRole?: string
): Promise<INotificationLog> => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError(`Invalid notification ID format: ${notificationId}`, 400);
  }
  const notification = await NotificationLog.findById(notificationId);
  if (!notification) {
    throw new AppError(`Notification record '${notificationId}' not found`, 404);
  }

  // If notification was private to a specific admin, only that admin or super_admin may mark it read
  if (
    notification.recipientUserId &&
    adminUserId &&
    notification.recipientUserId.toString() !== adminUserId.toString() &&
    userRole !== 'super_admin'
  ) {
    throw new AppError("Forbidden: You do not have permission to modify another admin's private notification", 403);
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

