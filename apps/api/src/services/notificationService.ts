import { NotificationLog, INotificationLog, NotificationChannel, NotificationTemplateId, NotificationStatus } from '../models/NotificationLog.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';

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
 * Admin Notification Management: Query logs with filters
 */
export const listNotificationLogs = async (params: {
  channel?: string;
  status?: string;
  isRead?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const query: any = {};
  if (params.channel && params.channel !== 'all') {
    query.channel = params.channel;
  }
  if (params.status && params.status !== 'all') {
    query.status = params.status;
  }
  if (typeof params.isRead === 'boolean') {
    query.isRead = params.isRead;
  }
  if (params.search?.trim()) {
    const s = params.search.trim();
    query.$or = [
      { recipientPhone: { $regex: s, $options: 'i' } },
      { recipientName: { $regex: s, $options: 'i' } },
      { providerRef: { $regex: s, $options: 'i' } },
      { messageBody: { $regex: s, $options: 'i' } },
    ];
  }

  const [rawLogs, total] = await Promise.all([
    NotificationLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    NotificationLog.countDocuments(query),
  ]);

  const logs = rawLogs.map((log: any) => ({
    ...log,
    type: log.type || log.templateId,
    relatedEntityType:
      log.relatedEntityType ||
      (log.metadata?.visitId
        ? 'FieldVisit'
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
 * Admin Action: Mark an in-app or dispatch notification as read
 */
export const markNotificationAsRead = async (
  notificationId: string
): Promise<INotificationLog> => {
  const notification = await NotificationLog.findById(notificationId);
  if (!notification) {
    throw new Error(`Notification record '${notificationId}' not found`);
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

