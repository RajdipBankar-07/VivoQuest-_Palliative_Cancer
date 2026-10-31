import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDeliveryRating extends Document {
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  patientId: mongoose.Types.ObjectId;
  patientName: string;
  deliveryStaffId: mongoose.Types.ObjectId;
  deliveryStaffName: string;
  rating: number; // 1 to 5
  punctualityRating?: number; // 1 to 5
  communicationRating?: number; // 1 to 5
  handlingRating?: number; // 1 to 5
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryRatingSchema = new Schema<IDeliveryRating>(
  {
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
    deliveryStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deliveryStaffName: {
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
    punctualityRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    communicationRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    handlingRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: 1000,
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

// Enforce single delivery rating per patient per order
DeliveryRatingSchema.index({ orderId: 1, patientId: 1 }, { unique: true });

export const DeliveryRating: Model<IDeliveryRating> =
  mongoose.models.DeliveryRating ||
  mongoose.model<IDeliveryRating>('DeliveryRating', DeliveryRatingSchema);

