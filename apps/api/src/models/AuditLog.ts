import mongoose, { Schema, Document, Model } from 'mongoose';

export type AuditLogCategory =
  | 'user_management'
  | 'credential_review'
  | 'hospital_management'
  | 'supplier_management'
  | 'service_catalog'
  | 'booking_referral'
  | 'order_fulfillment'
  | 'field_operations'
  | 'security_governance'
  | 'system';

export type AuditLogSeverity = 'info' | 'warning' | 'critical';

export interface IAuditLog extends Document {
  action: string;
  category: AuditLogCategory;
  actorId?: mongoose.Types.ObjectId;
  actorName: string;
  actorRole: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  severity: AuditLogSeverity;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'user_management',
        'credential_review',
        'hospital_management',
        'supplier_management',
        'service_catalog',
        'booking_referral',
        'order_fulfillment',
        'field_operations',
        'security_governance',
        'system',
      ],
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
    },
    actorRole: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    targetId: {
      type: String,
      trim: true,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// High-speed compound queries for security exploration
AuditLogSchema.index({ category: 1, timestamp: -1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });
AuditLogSchema.index({ actorRole: 1, timestamp: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
