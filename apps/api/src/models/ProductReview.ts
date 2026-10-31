import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReviewStatus = 'published' | 'pending' | 'rejected';

export interface ISupplierResponse {
  response: string;
  respondedAt: Date;
  respondedByName?: string;
}

export interface IProductReview extends Document {
  productId: mongoose.Types.ObjectId;
  productSku: string;
  productTitle: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationNotes?: string;
  supplierResponse?: ISupplierResponse;
  hasIssueReported?: boolean;
  issueCategory?: string;
  issueDetails?: string;
  complaintId?: mongoose.Types.ObjectId;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierResponseSchema = new Schema<ISupplierResponse>(
  {
    response: { type: String, required: true, trim: true },
    respondedAt: { type: Date, default: Date.now },
    respondedByName: { type: String, trim: true },
  },
  { _id: false }
);

const ProductReviewSchema = new Schema<IProductReview>(
  {
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
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Review title is required'],
      trim: true,
      maxlength: 120,
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: 2000,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['published', 'pending', 'rejected'],
      default: 'published',
      index: true,
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: {
      type: Date,
    },
    moderationNotes: {
      type: String,
      trim: true,
    },
    supplierResponse: {
      type: SupplierResponseSchema,
    },
    hasIssueReported: {
      type: Boolean,
      default: false,
    },
    issueCategory: {
      type: String,
      trim: true,
    },
    issueDetails: {
      type: String,
      trim: true,
    },
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductComplaint',
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

// One verified review per user per order per product
ProductReviewSchema.index({ userId: 1, orderId: 1, productId: 1 }, { unique: true });

export const ProductReview: Model<IProductReview> =
  mongoose.models.ProductReview ||
  mongoose.model<IProductReview>('ProductReview', ProductReviewSchema);
