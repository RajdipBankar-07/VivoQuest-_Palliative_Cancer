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

export interface IProductImage {
  url: string;
  altText?: string;
  isPrimary?: boolean;
}

export type ProductStatus = 'active' | 'draft' | 'archived' | 'out_of_stock';
export type ProductSourcingType = 'own_stock' | 'supplier_direct' | 'own' | 'supplier';

export interface IMedicalProduct extends Document {
  sku: string;
  title: string;
  category: ProductCategory;
  badge?: string;
  description: string;
  price: number;
  regularPrice: number;
  sellingPrice: number;
  discountPercentage: number;
  rentalPriceMonthly?: number;
  isRentalAvailable: boolean;
  requiresPrescription: boolean;
  setupRequiredByClinician: boolean; // Closed-loop advantage: clinician dispatched alongside equipment
  recommendedSpecialistRole?: string;
  stockQuantity: number;
  reservedQuantity: number;
  sourcingType: 'own_stock' | 'supplier_direct';
  supplierId?: mongoose.Types.ObjectId;
  supplierName?: string;
  procurementCost: number;
  images: string[];
  imageGallery: IProductImage[];
  specifications: Record<string, string>;
  hsnCode?: string;
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  status: ProductStatus;
  fulfillmentMethod: 'vivoquest_depot' | 'supplier_direct';
  shippingCharge: number;
  estimatedDeliveryDays: string;
  installationEligible: boolean;
  installationServiceCharge: number;
  installationDescription?: string;
  averageRating: number;
  reviewCount: number;
  depots: IDepotStock[];
  equipmentCondition?: 'healthy' | 'damaged' | 'under_maintenance' | 'returned_for_inspection';
  conditionNotes?: string;
  lastModifiedBy?: { id: mongoose.Types.ObjectId; name: string; role: string; at: Date };
  createdByStaff?: { id: mongoose.Types.ObjectId; name: string; role: string; at: Date };
  isActive: boolean;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    altText: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

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
    regularPrice: {
      type: Number,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
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
    reservedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    sourcingType: {
      type: String,
      enum: ['own_stock', 'supplier_direct', 'own', 'supplier'],
      default: 'own_stock',
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      index: true,
    },
    supplierName: {
      type: String,
      trim: true,
    },
    procurementCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    images: [{ type: String }],
    imageGallery: [ProductImageSchema],
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
      enum: [0, 5, 12, 18, 28],
      default: 12, // Standard medical equipment GST in India
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'archived', 'out_of_stock'],
      default: 'active',
      index: true,
    },
    fulfillmentMethod: {
      type: String,
      enum: ['vivoquest_depot', 'supplier_direct'],
      default: 'vivoquest_depot',
    },
    shippingCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    estimatedDeliveryDays: {
      type: String,
      default: '2-4 business days',
    },
    installationEligible: {
      type: Boolean,
      default: false,
      index: true,
    },
    installationServiceCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    installationDescription: {
      type: String,
      trim: true,
    },
    averageRating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    depots: [DepotStockSchema],
    equipmentCondition: {
      type: String,
      enum: ['healthy', 'damaged', 'under_maintenance', 'returned_for_inspection'],
      default: 'healthy',
      index: true,
    },
    conditionNotes: {
      type: String,
      trim: true,
    },
    lastModifiedBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      role: { type: String },
      at: { type: Date },
    },
    createdByStaff: {
      id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      role: { type: String },
      at: { type: Date },
    },
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
      virtuals: true,
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Pre-save normalization and server-side pricing derivations
MedicalProductSchema.pre<IMedicalProduct>('save', function (next) {
  // 1. Sourcing type normalization
  if ((this.sourcingType as any) === 'own') {
    this.sourcingType = 'own_stock';
  } else if ((this.sourcingType as any) === 'supplier') {
    this.sourcingType = 'supplier_direct';
  }

  if (this.sourcingType === 'own_stock') {
    this.fulfillmentMethod = 'vivoquest_depot';
  } else if (this.sourcingType === 'supplier_direct') {
    this.fulfillmentMethod = 'supplier_direct';
  }

  // 2. Regular price & Selling price validation & derivation
  if (this.regularPrice == null || isNaN(this.regularPrice) || this.regularPrice <= 0) {
    this.regularPrice = this.price || 0;
  }

  if (this.discountPercentage != null && this.discountPercentage > 0) {
    // Derive selling price safely on backend
    const discountFactor = (100 - Math.min(100, Math.max(0, this.discountPercentage))) / 100;
    this.sellingPrice = Math.max(0, Math.round(this.regularPrice * discountFactor));
  } else if (this.sellingPrice != null && this.sellingPrice > 0) {
    if (this.sellingPrice > this.regularPrice) {
      this.regularPrice = this.sellingPrice;
      this.discountPercentage = 0;
    } else {
      this.discountPercentage = this.regularPrice > 0
        ? Math.round(((this.regularPrice - this.sellingPrice) / this.regularPrice) * 100)
        : 0;
    }
  } else {
    this.sellingPrice = this.regularPrice;
    this.discountPercentage = 0;
  }

  this.price = this.sellingPrice;

  // 3. Image gallery synchronization
  if (this.images && this.images.length > 0 && (!this.imageGallery || this.imageGallery.length === 0)) {
    this.imageGallery = this.images.map((img, idx) => ({
      url: img,
      altText: `${this.title} - View ${idx + 1}`,
      isPrimary: idx === 0,
    }));
  } else if (this.imageGallery && this.imageGallery.length > 0 && (!this.images || this.images.length === 0)) {
    this.images = this.imageGallery.map((ig) => ig.url);
  }

  // 4. Status synchronization with stock and isActive
  if (!this.isActive && this.status !== 'archived') {
    this.status = 'archived';
  } else if (this.isActive) {
    if (this.stockQuantity <= 0 && this.status === 'active') {
      this.status = 'out_of_stock';
    } else if (this.stockQuantity > 0 && this.status === 'out_of_stock') {
      this.status = 'active';
    }
  }

  next();
});

// Compound text search index for title and description
MedicalProductSchema.index({ title: 'text', description: 'text', sku: 'text' });
MedicalProductSchema.index({ 'depots.location': '2dsphere' });

export const MedicalProduct: Model<IMedicalProduct> =
  mongoose.models.MedicalProduct ||
  mongoose.model<IMedicalProduct>('MedicalProduct', MedicalProductSchema);

