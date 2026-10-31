import mongoose, { Schema, Document, Model } from 'mongoose';

export type DeliveryProviderStatus = 'active' | 'inactive';

export interface IDeliveryProvider extends Document {
  name: string;
  providerCode: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  serviceArea?: string;
  deliveryInstructions?: string;
  status: DeliveryProviderStatus;
  isDefault: boolean;
  rating: number;
  completedDeliveriesCount: number;
  activeOrdersCount: number;
  notes?: string;
  createdByStaffId?: mongoose.Types.ObjectId;
  createdByStaffName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryProviderSchema = new Schema<IDeliveryProvider>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    providerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    serviceArea: {
      type: String,
      trim: true,
      default: 'Pune Metropolitan Region',
    },
    deliveryInstructions: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5,
    },
    completedDeliveriesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeOrdersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdByStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdByStaffName: {
      type: String,
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

DeliveryProviderSchema.index({ name: 'text', contactPerson: 'text', serviceArea: 'text' });

export const DeliveryProvider: Model<IDeliveryProvider> =
  mongoose.models.DeliveryProvider ||
  mongoose.model<IDeliveryProvider>('DeliveryProvider', DeliveryProviderSchema);

