import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProductCategory =
  | 'mobility'
  | 'fall_prevention'
  | 'respiratory'
  | 'monitoring_diagnostics'
  | 'wound_care'
  | 'clinical_nutrition'
  | 'icu_home_setup';

export interface IDepotStock {
  depotName: string;
  city: string;
  pincode: string;
  inStockCount: number;
  contactPhone?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface IMedicalProduct extends Document {
  sku: string;
  title: string;
  category: ProductCategory;
  badge?: string;
  description: string;
  price: number;
  rentalPriceMonthly?: number;
  isRentalAvailable: boolean;
  requiresPrescription: boolean;
  setupRequiredByClinician: boolean; // Closed-loop advantage: clinician dispatched alongside equipment
  recommendedSpecialistRole?: string;
  stockQuantity: number;
  images: string[];
  specifications: Record<string, string>;
  hsnCode?: string;
  gstRate: number; // e.g. 5, 12, 18
  depots: IDepotStock[];
  isActive: boolean;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepotStockSchema = new Schema<IDepotStock>(
  {
    depotName: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, required: true },
    inStockCount: { type: Number, default: 10, min: 0 },
    contactPhone: { type: String },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [73.8567, 18.5204], // Pune default [lng, lat]
      },
    },
  },
  { _id: false }
);

const MedicalProductSchema = new Schema<IMedicalProduct>(
  {
    sku: {
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
    category: {
      type: String,
      required: true,
      enum: [
        'mobility',
        'fall_prevention',
        'respiratory',
        'monitoring_diagnostics',
        'wound_care',
        'clinical_nutrition',
        'icu_home_setup',
      ],
      index: true,
    },
    badge: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    rentalPriceMonthly: {
      type: Number,
      min: 0,
    },
    isRentalAvailable: {
      type: Boolean,
      default: false,
    },
    requiresPrescription: {
      type: Boolean,
      default: false,
    },
    setupRequiredByClinician: {
      type: Boolean,
      default: false,
      index: true,
    },
    recommendedSpecialistRole: {
      type: String,
      trim: true,
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 10,
      min: 0,
    },
    images: [{ type: String }],
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    gstRate: {
      type: Number,
      default: 12, // 12% standard medical device GST in India
    },
    depots: [DepotStockSchema],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

// Compound text search index for title and description
MedicalProductSchema.index({ title: 'text', description: 'text', sku: 'text' });
MedicalProductSchema.index({ 'depots.location': '2dsphere' });

export const MedicalProduct: Model<IMedicalProduct> =
  mongoose.models.MedicalProduct ||
  mongoose.model<IMedicalProduct>('MedicalProduct', MedicalProductSchema);
