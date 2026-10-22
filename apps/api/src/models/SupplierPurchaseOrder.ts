import mongoose, { Schema, Document, Model } from 'mongoose';

export type POPaymentStatus = 'pending' | 'partially_settled' | 'settled';
export type PODeliveryStatus = 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface IPOItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  title: string;
  quantity: number;
  procurementCostPerUnit: number;
  totalCost: number;
  receivedQuantity: number;
}

export interface ISupplierPurchaseOrder extends Document {
  poNumber: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  items: IPOItem[];
  totalProcurementCost: number;
  paymentStatus: POPaymentStatus;
  paidAmount: number;
  paymentDueDate?: Date;
  deliveryStatus: PODeliveryStatus;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const POItemSchema = new Schema<IPOItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'MedicalProduct', required: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    procurementCostPerUnit: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const SupplierPurchaseOrderSchema = new Schema<ISupplierPurchaseOrder>(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [POItemSchema],
      required: true,
      validate: [(val: IPOItem[]) => val.length > 0, 'Purchase order must have at least one item'],
    },
    totalProcurementCost: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partially_settled', 'settled'],
      default: 'pending',
      index: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentDueDate: {
      type: Date,
    },
    deliveryStatus: {
      type: String,
      enum: ['ordered', 'partially_received', 'received', 'cancelled'],
      default: 'ordered',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByName: {
      type: String,
      required: true,
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

export const SupplierPurchaseOrder: Model<ISupplierPurchaseOrder> =
  mongoose.models.SupplierPurchaseOrder ||
  mongoose.model<ISupplierPurchaseOrder>('SupplierPurchaseOrder', SupplierPurchaseOrderSchema);
