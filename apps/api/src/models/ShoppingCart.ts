import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  quantity: number;
  isRental: boolean;
  rentalDurationMonths?: number;
  addedAt: Date;
}

export interface IShoppingCart extends Document {
  patientId: mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'MedicalProduct',
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    isRental: {
      type: Boolean,
      default: false,
    },
    rentalDurationMonths: {
      type: Number,
      min: 1,
      max: 24,
      default: 1,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ShoppingCartSchema = new Schema<IShoppingCart>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: [CartItemSchema],
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

export const ShoppingCart: Model<IShoppingCart> =
  mongoose.models.ShoppingCart ||
  mongoose.model<IShoppingCart>('ShoppingCart', ShoppingCartSchema);
