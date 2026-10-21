import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationChannel = 'sms' | 'whatsapp';

export type NotificationTemplateId =
  | 'APPOINTMENT_REMINDER'
  | 'PROVIDER_ASSIGNED'
  | 'CLINICIAN_EN_ROUTE'
  | 'CLINICIAN_ARRIVED'
  | 'VISIT_COMPLETED'
  | 'DME_SETUP_SCHEDULED'
  | 'CARE_LOOP_CLOSED';

export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'simulated';

export interface INotificationLog extends Document {
  recipientPhone: string;
  recipientName: string;
  recipientRole: 'patient' | 'caregiver' | 'professional' | 'hospital';
  channel: NotificationChannel;
  templateId: NotificationTemplateId;
  messageBody: string;
  consentChecked: boolean;
  status: NotificationStatus;
  provider: string; // e.g. 'simulated_gateway', 'gupshup', 'twilio'
  providerRef?: string;
  idempotencyKey?: string;
  retryCount: number;
  failureReason?: string;
  metadata?: {
    visitId?: string;
    visitNumber?: string;
    referralId?: string;
    orderId?: string;
    orderNumber?: string;
    appointmentId?: string;
    [key: string]: any;
  };
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
      enum: ['patient', 'caregiver', 'professional', 'hospital'],
      default: 'patient',
    },
    channel: {
      type: String,
      enum: ['sms', 'whatsapp'],
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
      ],
      required: true,
      index: true,
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
  }
);

NotificationLogSchema.index({ channel: 1, status: 1, createdAt: -1 });
NotificationLogSchema.index({ recipientPhone: 1, createdAt: -1 });

export const NotificationLog: Model<INotificationLog> =
  mongoose.models.NotificationLog || mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema);
