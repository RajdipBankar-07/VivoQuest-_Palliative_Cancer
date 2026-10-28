import mongoose, { Schema, Document, Model } from 'mongoose';

export type ComplaintCategory =
  | 'damaged_item'
  | 'wrong_item'
  | 'missing_item'
  | 'installation_issue'
  | 'quality_defect'
  | 'late_delivery'
  | 'other';

export type ComplaintStatus =
  | 'open'
  | 'under_review'
  | 'supplier_contacted'
  | 'resolved'
  | 'rejected';

export interface IProductComplaint extends Document {
  complaintNumber: string;
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  productId: mongoose.Types.ObjectId;
  productSku: string;
  productTitle: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userPhone: string;
  userEmail?: string;
  supplierId?: mongoose.Types.ObjectId;
  supplierName?: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  resolutionNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  refundRequested: boolean;
  refundApproved: boolean;
  refundAmount?: number;
  supplierResponse?: {
    response: string;
    respondedAt: Date;
    respondedByName?: string;
  };
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductComplaintSchema = new Schema<IProductComplaint>(
  {
    complaintNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductOrder',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'MedicalProduct',
      required: true,
      index: true,
    },
    productSku: {
      type: String,
      required: true,
      trim: true,
    },
    productTitle: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userPhone: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
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
    category: {
      type: String,
      required: true,
      enum: [
        'damaged_item',
        'wrong_item',
        'missing_item',
        'installation_issue',
        'quality_defect',
        'late_delivery',
        'other',
      ],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: ['open', 'under_review', 'supplier_contacted', 'resolved', 'rejected'],
      default: 'open',
      index: true,
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    refundRequested: {
      type: Boolean,
      default: false,
    },
    refundApproved: {
      type: Boolean,
      default: false,
    },
    refundAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    supplierResponse: {
      response: { type: String, trim: true },
      respondedAt: { type: Date },
      respondedByName: { type: String, trim: true },
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

export const ProductComplaint: Model<IProductComplaint> =
  mongoose.models.ProductComplaint ||
  mongoose.model<IProductComplaint>('ProductComplaint', ProductComplaintSchema);
