import mongoose, { Schema, Document, Model } from 'mongoose';

export type SubscriptionStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'expired';

export interface ICaregiverSubscription extends Document {
  subscriptionNumber: string;
  patientId: mongoose.Types.ObjectId;
  patientName: string;
  patientPhone: string;
  planId: mongoose.Types.ObjectId;
  planTitle: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  assignedCaregiverId?: mongoose.Types.ObjectId;
  assignedCaregiverName?: string;
  assignedCaregiverPhone?: string;
  totalVisitsIncluded: number;
  visitsCompleted: number;
  visitsRemaining: number;
  pricing: {
    customerPrice: number;
    caregiverPayout: number;
    platformCommission: number;
    paymentStatus: 'paid' | 'pending' | 'refunded';
    paymentMethod?: string;
    razorpayPaymentId?: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  carePlanNotes?: string;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CaregiverSubscriptionSchema = new Schema<ICaregiverSubscription>(
  {
    subscriptionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
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
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'CaregiverPlan',
      required: true,
      index: true,
    },
    planTitle: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled', 'expired'],
      default: 'active',
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    assignedCaregiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedCaregiverName: {
      type: String,
      trim: true,
    },
    assignedCaregiverPhone: {
      type: String,
      trim: true,
    },
    totalVisitsIncluded: {
      type: Number,
      required: true,
      min: 1,
    },
    visitsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    visitsRemaining: {
      type: Number,
      required: true,
      min: 0,
    },
    pricing: {
      customerPrice: { type: Number, required: true, min: 0 },
      caregiverPayout: { type: Number, required: true, min: 0 },
      platformCommission: { type: Number, required: true, min: 0 },
      paymentStatus: {
        type: String,
        enum: ['paid', 'pending', 'refunded'],
        default: 'paid',
        index: true,
      },
      paymentMethod: { type: String, default: 'online' },
      razorpayPaymentId: { type: String },
    },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relation: { type: String, trim: true },
    },
    carePlanNotes: {
      type: String,
      trim: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
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

CaregiverSubscriptionSchema.index({ patientId: 1, status: 1 });
CaregiverSubscriptionSchema.index({ assignedCaregiverId: 1, status: 1 });

export const CaregiverSubscription: Model<ICaregiverSubscription> =
  mongoose.models.CaregiverSubscription ||
  mongoose.model<ICaregiverSubscription>('CaregiverSubscription', CaregiverSubscriptionSchema);
