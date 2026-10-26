import mongoose, { Schema, Document, Model } from 'mongoose';

export type RescheduleRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface IVisitRescheduleRequest extends Document {
  visitId: mongoose.Types.ObjectId;
  visitNumber: string;
  patientId: mongoose.Types.ObjectId;
  patientName: string;
  patientPhone: string;
  providerId: mongoose.Types.ObjectId;
  providerName: string;
  providerRole?: string;
  providerPhone?: string;
  requestedBy: mongoose.Types.ObjectId;
  requesterRole: string;
  requesterName: string;
  originalSchedule: {
    scheduledDate: string; // YYYY-MM-DD
    timeSlot: string; // e.g. "09:00 - 11:00"
  };
  requestedSchedule: {
    scheduledDate: string; // YYYY-MM-DD
    timeSlot: string; // e.g. "14:00 - 16:00"
  };
  reason: string;
  status: RescheduleRequestStatus;
  rejectionReason?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolverRole?: string;
  resolverName?: string;
  resolvedAt?: Date;
  statusHistory: Array<{
    status: RescheduleRequestStatus;
    changedBy: mongoose.Types.ObjectId;
    changedByRole: string;
    changedByName: string;
    timestamp: Date;
    reason?: string;
  }>;
  hiddenFromPatient?: boolean;
  hiddenFromPatientAt?: Date;
  hiddenFromCaregiver?: boolean;
  hiddenFromCaregiverAt?: Date;
  hiddenFromAdmin?: boolean;
  hiddenFromAdminAt?: Date;
  hiddenFromUserIds?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const VisitRescheduleRequestSchema = new Schema<IVisitRescheduleRequest>(
  {
    visitId: {
      type: Schema.Types.ObjectId,
      ref: 'FieldVisit',
      required: true,
      index: true,
    },
    visitNumber: {
      type: String,
      required: true,
      trim: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    patientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
    },
    providerRole: {
      type: String,
      trim: true,
    },
    providerPhone: {
      type: String,
      trim: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requesterRole: {
      type: String,
      required: true,
      trim: true,
    },
    requesterName: {
      type: String,
      required: true,
      trim: true,
    },
    originalSchedule: {
      scheduledDate: { type: String, required: true },
      timeSlot: { type: String, required: true },
    },
    requestedSchedule: {
      scheduledDate: { type: String, required: true },
      timeSlot: { type: String, required: true },
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, 'Reason must be at least 3 characters'],
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Rejection reason cannot exceed 1000 characters'],
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolverRole: {
      type: String,
      trim: true,
    },
    resolverName: {
      type: String,
      trim: true,
    },
    resolvedAt: {
      type: Date,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changedByRole: { type: String },
        changedByName: { type: String },
        timestamp: { type: Date, default: Date.now },
        reason: { type: String },
      },
    ],
    hiddenFromPatient: { type: Boolean, default: false },
    hiddenFromPatientAt: { type: Date },
    hiddenFromCaregiver: { type: Boolean, default: false },
    hiddenFromCaregiverAt: { type: Date },
    hiddenFromAdmin: { type: Boolean, default: false },
    hiddenFromAdminAt: { type: Date },
    hiddenFromUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
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

VisitRescheduleRequestSchema.index({ visitId: 1, status: 1 });
VisitRescheduleRequestSchema.index({ providerId: 1, status: 1 });
VisitRescheduleRequestSchema.index({ patientId: 1, status: 1 });

export const VisitRescheduleRequest: Model<IVisitRescheduleRequest> =
  mongoose.models.VisitRescheduleRequest ||
  mongoose.model<IVisitRescheduleRequest>('VisitRescheduleRequest', VisitRescheduleRequestSchema);
