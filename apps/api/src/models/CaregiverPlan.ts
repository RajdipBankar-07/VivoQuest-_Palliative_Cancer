import mongoose, { Schema, Document, Model } from 'mongoose';

export type PlanType = 'monthly_subscription' | 'fixed_visit_package' | 'hourly_package';
export type PlanCategory = 'palliative' | 'post_operative' | 'elderly_care' | 'rehabilitation';

export interface ICaregiverPlan extends Document {
  planCode: string;
  title: string;
  planType: PlanType;
  category: PlanCategory;
  durationDays: number;
  totalVisitsIncluded: number;
  hoursPerVisit: number;
  customerPrice: number;
  caregiverPayout: number;
  description: string;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CaregiverPlanSchema = new Schema<ICaregiverPlan>(
  {
    planCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    planType: {
      type: String,
      enum: ['monthly_subscription', 'fixed_visit_package', 'hourly_package'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['palliative', 'post_operative', 'elderly_care', 'rehabilitation'],
      required: true,
      index: true,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    totalVisitsIncluded: {
      type: Number,
      required: true,
      min: 1,
    },
    hoursPerVisit: {
      type: Number,
      required: true,
      min: 1,
    },
    customerPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    caregiverPayout: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPopular: {
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

export const CaregiverPlan: Model<ICaregiverPlan> =
  mongoose.models.CaregiverPlan ||
  mongoose.model<ICaregiverPlan>('CaregiverPlan', CaregiverPlanSchema);
