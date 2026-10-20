import mongoose, { Schema, Document, Model } from 'mongoose';

export type ServiceCategory = 'diagnostics' | 'therapy' | 'equipment' | 'preventive' | 'nursing';

export interface IPriceSpec {
  baseAmount: number;
  currency: string;
  isNegotiable: boolean;
  unit: string; // e.g. 'per_visit', 'per_session', 'per_month'
}

export interface IHealthcareService extends Document {
  serviceCode: string;
  title: string;
  category: ServiceCategory;
  badge: string;
  description: string;
  turnaround: string;
  price: IPriceSpec;
  requirements: string[];
  includes: string[];
  requiredCredentials: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const PriceSpecSchema = new Schema<IPriceSpec>(
  {
    baseAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    isNegotiable: { type: Boolean, default: false },
    unit: { type: String, required: true, default: 'per_visit' },
  },
  { _id: false }
);

const HealthcareServiceSchema = new Schema<IHealthcareService>(
  {
    serviceCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['diagnostics', 'therapy', 'equipment', 'preventive', 'nursing'],
      index: true,
    },
    badge: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    turnaround: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: PriceSpecSchema,
      required: true,
    },
    requirements: [{ type: String, trim: true }],
    includes: [{ type: String, trim: true }],
    requiredCredentials: [{ type: String, trim: true }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
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

export const HealthcareService: Model<IHealthcareService> = 
  mongoose.models.HealthcareService || 
  mongoose.model<IHealthcareService>('HealthcareService', HealthcareServiceSchema);
