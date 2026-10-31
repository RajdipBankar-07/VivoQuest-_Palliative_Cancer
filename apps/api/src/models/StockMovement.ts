import mongoose, { Schema, Document, Model } from 'mongoose';

export type StockMovementType =
  | 'initial_stock'
  | 'manual_adjustment'
  | 'order_reservation'
  | 'order_cancellation_release'
  | 'dispatch_deduction'
  | 'po_receipt'
  | 'damage_write_off'
  | 'audit_reconciliation'
  | 'supplier_confirmation_update';

export interface IStockMovement extends Document {
  productId: mongoose.Types.ObjectId;
  sku: string;
  productTitle: string;
  movementType: StockMovementType;
  previousStockQuantity: number;
  newStockQuantity: number;
  quantityChanged: number;
  previousReservedQuantity: number;
  newReservedQuantity: number;
  reason: string;
  orderId?: mongoose.Types.ObjectId;
  orderNumber?: string;
  purchaseOrderId?: mongoose.Types.ObjectId;
  poNumber?: string;
  performedBy: {
    id?: mongoose.Types.ObjectId;
    name: string;
    role: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'MedicalProduct',
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    productTitle: {
      type: String,
      required: true,
      trim: true,
    },
    movementType: {
      type: String,
      required: true,
      enum: [
        'initial_stock',
        'manual_adjustment',
        'order_reservation',
        'order_cancellation_release',
        'dispatch_deduction',
        'po_receipt',
        'damage_write_off',
        'audit_reconciliation',
        'supplier_confirmation_update',
      ],
      index: true,
    },
    previousStockQuantity: { type: Number, required: true },
    newStockQuantity: { type: Number, required: true },
    quantityChanged: { type: Number, required: true },
    previousReservedQuantity: { type: Number, default: 0 },
    newReservedQuantity: { type: Number, default: 0 },
    reason: { type: String, required: true, trim: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'ProductOrder' },
    orderNumber: { type: String, trim: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'SupplierPurchaseOrder' },
    poNumber: { type: String, trim: true },
    performedBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true },
      role: { type: String, required: true },
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

StockMovementSchema.index({ createdAt: -1 });

export const StockMovement: Model<IStockMovement> =
  mongoose.models.StockMovement ||
  mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);

