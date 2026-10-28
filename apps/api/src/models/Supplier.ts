import mongoose, { Schema, Document, Model } from 'mongoose';

export type SupplierSourcingType = 'own_stock' | 'supplier_direct' | 'hybrid';
export type SupplierVerificationStatus = 'pending_review' | 'verified' | 'rejected';

export interface ISupplierBankDetails {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface ISupplier extends Document {
  supplierCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  pan: string;
  bankDetails: ISupplierBankDetails;
  sourcingType: SupplierSourcingType;
  verificationStatus: SupplierVerificationStatus;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  verificationNotes?: string;
  rating: number;
  userId?: mongoose.Types.ObjectId; // User account credential binding for Supplier Portal
  commissionRatePercentage: number;
  settlementCycleDays: number;
  isActive: boolean;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierBankDetailsSchema = new Schema<ISupplierBankDetails>(
  {
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    ifsc: { type: String, required: true, trim: true, uppercase: true },
    bankName: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const SupplierSchema = new Schema<ISupplier>(
  {
    supplierCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      index: true,
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Supplier contact phone is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Supplier contact email is required'],
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      default: 'Pune',
    },
    state: {
      type: String,
      required: true,
      trim: true,
      default: 'Maharashtra',
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{6}$/, 'Must be a valid 6-digit Indian PIN code'],
    },
    gstin: {
      type: String,
      required: [true, 'GSTIN is required for tax and commercial compliance'],
      trim: true,
      uppercase: true,
      index: true,
    },
    pan: {
      type: String,
      required: [true, 'PAN is required'],
      trim: true,
      uppercase: true,
    },
    bankDetails: {
      type: SupplierBankDetailsSchema,
      required: true,
    },
    sourcingType: {
      type: String,
      enum: ['own_stock', 'supplier_direct', 'hybrid'],
      default: 'own_stock',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending_review', 'verified', 'rejected'],
      default: 'pending_review',
      index: true,
    },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verificationNotes: { type: String, trim: true },
    rating: { type: Number, default: 5.0, min: 1.0, max: 5.0 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    commissionRatePercentage: { type: Number, default: 10, min: 0, max: 100 },
    settlementCycleDays: { type: Number, default: 15, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
    isDemo: { type: Boolean, default: false },
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

SupplierSchema.index({ name: 'text', contactPerson: 'text', supplierCode: 'text' });

export const Supplier: Model<ISupplier> =
  mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);
