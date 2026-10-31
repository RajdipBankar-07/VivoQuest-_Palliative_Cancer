import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationChannel = 'sms' | 'whatsapp' | 'in_app';

export type NotificationTemplateId =
  | 'APPOINTMENT_REMINDER'
  | 'PROVIDER_ASSIGNED'
  | 'CLINICIAN_EN_ROUTE'
  | 'CLINICIAN_ARRIVED'
  | 'VISIT_COMPLETED'
  | 'DME_SETUP_SCHEDULED'
  | 'CARE_LOOP_CLOSED'
  | 'SUBSCRIPTION_ACTIVATED_TEST_MODE'
  | 'NEW_CAREGIVER_SUBSCRIPTION_TEST_MODE'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'VISIT_RESCHEDULE_REQUESTED'
  | 'VISIT_RESCHEDULE_APPROVED'
  | 'VISIT_RESCHEDULE_REJECTED'
  | 'DAILY_CARE_REPORT_SUBMITTED'
  | 'CAREGIVER_ASSIGNED'
  | 'CAREGIVER_ASSIGNED_NEW'
  | 'CAREGIVER_REASSIGNED'
  | 'CAREGIVER_REASSIGNED_PATIENT'
  | 'CAREGIVER_REASSIGNED_REMOVED'
  | 'FIELD_VISIT_SCHEDULED'
  | 'VISIT_ASSIGNMENT_ACCEPTED'
  | 'VISIT_ASSIGNMENT_REJECTED'
  | 'VISIT_STARTED'
  | 'OVERDUE_VISIT_MISSED'
  | 'VISIT_CANCELLED'
  | 'PRODUCT_ORDER_PLACED'
  | 'PRODUCT_ORDER_CONFIRMED'
  | 'PRODUCT_ORDER_DELIVERY_UPDATED'
  | 'PRODUCT_ORDER_DISPATCHED'
  | 'PRODUCT_ORDER_DELIVERED'
  | 'DELIVERY_OTP_REQUESTED'
  | 'DELIVERY_COMPLETED_RATING_REQUEST'
  | 'PRODUCT_ORDER_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'INVOICE_GENERATED'
  | 'INVENTORY_ALERT'
  | 'OPERATIONAL_ALERT';

export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'simulated';

export interface INotificationLog extends Document {
  recipientPhone: string;
  recipientName: string;
  recipientRole: 'patient' | 'caregiver' | 'professional' | 'hospital' | 'admin' | 'super_admin' | 'operations' | 'operations_manager';
  recipientUserId?: string;
  channel: NotificationChannel;
  templateId: NotificationTemplateId;
  title?: string;
  messageBody: string;
  consentChecked: boolean;
  status: NotificationStatus;
  provider: string; // e.g. 'simulated_gateway', 'gupshup', 'twilio', 'in_app_system'
  providerRef?: string;
  idempotencyKey?: string;
  retryCount: number;
  failureReason?: string;
  metadata?: {
    subscriptionId?: string;
    subscriptionNumber?: string;
    visitId?: string;
    visitNumber?: string;
    referralId?: string;
    orderId?: string;
    orderNumber?: string;
    appointmentId?: string;
    requestId?: string;
    patientId?: string;
    patientName?: string;
    patientPhone?: string;
    caregiverId?: string;
    caregiverName?: string;
    caregiverPhone?: string;
    city?: string;
    totalAmount?: number;
    [key: string]: any;
  };
  type?: string;
  relatedEntityType?: string;
  actionUrl?: string;
  isRead?: boolean;
  readAt?: Date;
  isCleared?: boolean;
  clearedAt?: Date;
  clearedBy?: string[];
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    recipientPhone: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    recipientRole: {
      type: String,
      enum: ['patient', 'caregiver', 'professional', 'hospital', 'admin', 'super_admin', 'operations', 'operations_manager'],
      default: 'patient',
      index: true,
    },
    recipientUserId: {
      type: String,
      trim: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['sms', 'whatsapp', 'in_app'],
      required: true,
      index: true,
    },
    templateId: {
      type: String,
      enum: [
        'APPOINTMENT_REMINDER',
        'PROVIDER_ASSIGNED',
        'CLINICIAN_EN_ROUTE',
        'CLINICIAN_ARRIVED',
        'VISIT_COMPLETED',
        'DME_SETUP_SCHEDULED',
        'CARE_LOOP_CLOSED',
        'SUBSCRIPTION_ACTIVATED_TEST_MODE',
        'NEW_CAREGIVER_SUBSCRIPTION_TEST_MODE',
        'SUBSCRIPTION_ACTIVATED',
        'SUBSCRIPTION_CANCELLED',
        'SUBSCRIPTION_EXPIRED',
        'VISIT_RESCHEDULE_REQUESTED',
        'VISIT_RESCHEDULE_APPROVED',
        'VISIT_RESCHEDULE_REJECTED',
        'DAILY_CARE_REPORT_SUBMITTED',
        'CAREGIVER_ASSIGNED',
        'CAREGIVER_ASSIGNED_NEW',
        'CAREGIVER_REASSIGNED',
        'CAREGIVER_REASSIGNED_PATIENT',
        'CAREGIVER_REASSIGNED_REMOVED',
        'FIELD_VISIT_SCHEDULED',
        'VISIT_ASSIGNMENT_ACCEPTED',
        'VISIT_ASSIGNMENT_REJECTED',
        'VISIT_STARTED',
        'OVERDUE_VISIT_MISSED',
        'VISIT_CANCELLED',
        'PRODUCT_ORDER_PLACED',
        'PRODUCT_ORDER_CONFIRMED',
        'PRODUCT_ORDER_DELIVERY_UPDATED',
        'PRODUCT_ORDER_DISPATCHED',
        'PRODUCT_ORDER_DELIVERED',
        'DELIVERY_OTP_REQUESTED',
        'DELIVERY_COMPLETED_RATING_REQUEST',
        'PRODUCT_ORDER_CANCELLED',
        'PAYMENT_RECEIVED',
        'PAYMENT_FAILED',
        'INVOICE_GENERATED',
        'INVENTORY_ALERT',
        'OPERATIONAL_ALERT',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
    },
    messageBody: {
      type: String,
      required: true,
    },
    consentChecked: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed', 'simulated'],
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      default: 'simulated_gateway',
    },
    providerRef: {
      type: String,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    failureReason: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    type: {
      type: String,
      trim: true,
      index: true,
    },
    relatedEntityType: {
      type: String,
      trim: true,
      index: true,
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    isCleared: {
      type: Boolean,
      default: false,
      index: true,
    },
    clearedAt: {
      type: Date,
    },
    clearedBy: [
      {
        type: String,
      },
    ],
    sentAt: {
      type: Date,
      default: Date.now,
    },
    deliveredAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : '';
        if (ret._id) {
          ret._id = ret._id.toString();
        }
        delete ret.__v;
        return ret;
      },
    },
  }
);

NotificationLogSchema.index({ channel: 1, status: 1, createdAt: -1 });
NotificationLogSchema.index({ recipientPhone: 1, createdAt: -1 });
NotificationLogSchema.index({ recipientPhone: 1, isRead: 1 });
NotificationLogSchema.index({ recipientRole: 1, isRead: 1, createdAt: -1 });
NotificationLogSchema.index({ channel: 1, isRead: 1, isCleared: 1, createdAt: -1 });
NotificationLogSchema.index({ 'metadata.visitId': 1, templateId: 1 });
NotificationLogSchema.index({ 'metadata.orderId': 1, templateId: 1 });
NotificationLogSchema.index({ 'metadata.subscriptionId': 1, templateId: 1 });
NotificationLogSchema.index({ clearedBy: 1 });

export const NotificationLog: Model<INotificationLog> =
  mongoose.models.NotificationLog || mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema);
