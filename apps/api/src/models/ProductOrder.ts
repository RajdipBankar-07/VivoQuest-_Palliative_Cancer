import mongoose, { Schema, Document, Model } from 'mongoose';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'cod' | 'refunded';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  title: string;
  category: string;
  quantity: number;
  unitPrice: number;
  isRental: boolean;
  rentalDurationMonths?: number;
  setupRequired: boolean;
}

export interface ITrackingEvent {
  timestamp: Date;
  status: OrderStatus;
  message: string;
  location?: string;
}

export interface IProductOrder extends Document {
  orderNumber: string;
  patientId: mongoose.Types.ObjectId;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  hospitalReferralId?: mongoose.Types.ObjectId;
  items: IOrderItem[];
  pricing: {
    subtotal: number;
    deliveryFee: number;
    taxGst: number;
    totalAmount: number;
  };
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    contactPhone?: string;
  };
  clinicalSetup: {
    isSetupRequired: boolean;
    assignedSpecialistId?: mongoose.Types.ObjectId;
    assignedSpecialistName?: string;
    setupStatus: 'pending' | 'scheduled' | 'completed' | 'not_required';
    setupDate?: Date;
    setupNotes?: string;
  };
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'online' | 'cod' | 'insurance_claim';
  paymentDetails?: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paidAt?: Date;
    failureReason?: string;
    isTestMode?: boolean;
  };
  cancellation?: {
    isCancelled: boolean;
    cancelledAt?: Date;
    cancelledBy?: string;
    cancellationReason?: string;
    refundStatus?: 'none' | 'pending' | 'processed';
  };
  returnDetails?: {
    isReturnRequested: boolean;
    returnStatus?: 'none' | 'requested' | 'approved' | 'rejected' | 'collected';
    returnReason?: string;
    requestedAt?: Date;
  };
  installationPreferences?: {
    preferredDate?: Date;
    preferredSlot?: string;
    accessInstructions?: string;
  };
  idempotencyKey?: string;
  trackingUpdates: ITrackingEvent[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'MedicalProduct', required: true },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    isRental: { type: Boolean, default: false },
    rentalDurationMonths: { type: Number, min: 1 },
    setupRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

const TrackingEventSchema = new Schema<ITrackingEvent>(
  {
    timestamp: { type: Date, default: Date.now },
    status: { type: String, required: true },
    message: { type: String, required: true },
    location: { type: String },
  },
  { _id: false }
);

const ProductOrderSchema = new Schema<IProductOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
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
    patientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    hospitalReferralId: {
      type: Schema.Types.ObjectId,
      ref: 'HospitalReferral',
      index: true,
    },
    items: [OrderItemSchema],
    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      deliveryFee: { type: Number, required: true, default: 0 },
      taxGst: { type: Number, required: true, default: 0 },
      totalAmount: { type: Number, required: true, min: 0 },
    },
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true, default: 'Maharashtra' },
      pincode: { type: String, required: true },
      contactPhone: { type: String },
    },
    clinicalSetup: {
      isSetupRequired: { type: Boolean, default: false },
      assignedSpecialistId: { type: Schema.Types.ObjectId, ref: 'User' },
      assignedSpecialistName: { type: String },
      setupStatus: {
        type: String,
        enum: ['pending', 'scheduled', 'completed', 'not_required'],
        default: 'not_required',
      },
      setupDate: { type: Date },
      setupNotes: { type: String },
    },
    orderStatus: {
      type: String,
      enum: ['placed', 'confirmed', 'dispatched', 'out_for_delivery', 'delivered', 'completed', 'cancelled'],
      default: 'placed',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cod', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'cod', 'insurance_claim'],
      default: 'cod',
    },
    paymentDetails: {
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
      paidAt: { type: Date },
      failureReason: { type: String },
      isTestMode: { type: Boolean, default: false },
    },
    cancellation: {
      isCancelled: { type: Boolean, default: false },
      cancelledAt: { type: Date },
      cancelledBy: { type: String },
      cancellationReason: { type: String },
      refundStatus: { type: String, enum: ['none', 'pending', 'processed'], default: 'none' },
    },
    returnDetails: {
      isReturnRequested: { type: Boolean, default: false },
      returnStatus: { type: String, enum: ['none', 'requested', 'approved', 'rejected', 'collected'], default: 'none' },
      returnReason: { type: String },
      requestedAt: { type: Date },
    },
    installationPreferences: {
      preferredDate: { type: Date },
      preferredSlot: { type: String },
      accessInstructions: { type: String },
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
    trackingUpdates: [TrackingEventSchema],
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

export const ProductOrder: Model<IProductOrder> =
  mongoose.models.ProductOrder ||
  mongoose.model<IProductOrder>('ProductOrder', ProductOrderSchema);
