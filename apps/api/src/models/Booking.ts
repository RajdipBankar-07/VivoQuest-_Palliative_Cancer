import mongoose, { Schema, Document, Model } from 'mongoose';

export type BookingStatus = 
  | 'requested'
  | 'triaged'
  | 'matched'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'refunded';

export interface IBookingLocation {
  address?: string;
  city: string;
  pincode: string;
  cluster: string;
  coordinates?: [number, number];
}

export interface IBookingPricing {
  estimatedAmount: number;
  finalAmount?: number;
  currency: string;
  paymentStatus: PaymentStatus;
}

export interface IBookingDispatchState {
  triagedAt?: Date;
  matchedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  notes?: string;
}

export interface IBooking extends Document {
  bookingNumber: string;
  patientId: mongoose.Types.ObjectId;
  patientProfileId?: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  assignedProfessionalId?: mongoose.Types.ObjectId;
  patientName: string;
  phone: string;
  status: BookingStatus;
  preferredDate?: Date;
  scheduledDate?: Date;
  serviceLocation: IBookingLocation;
  clinicalNotes?: string;
  pricing: IBookingPricing;
  prescriptionFileId?: mongoose.Types.ObjectId;
  dispatchState: IBookingDispatchState;
  createdAt: Date;
  updatedAt: Date;
}

const BookingLocationSchema = new Schema<IBookingLocation>(
  {
    address: { type: String, trim: true },
    city: { type: String, required: true, trim: true, default: 'Pune' },
    pincode: { 
      type: String, 
      required: true, 
      trim: true, 
      match: [/^\d{6}$/, 'Must be a 6-digit Indian PIN code'] 
    },
    cluster: { type: String, required: true, trim: true, default: 'Pune' },
    coordinates: {
      type: [Number],
      index: '2dsphere',
    },
  },
  { _id: false }
);

const BookingPricingSchema = new Schema<IBookingPricing>(
  {
    estimatedAmount: { type: Number, required: true, min: 0 },
    finalAmount: { type: Number, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'authorized', 'paid', 'refunded'],
      default: 'pending',
    },
  },
  { _id: false }
);

const BookingDispatchStateSchema = new Schema<IBookingDispatchState>(
  {
    triagedAt: { type: Date },
    matchedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const BookingSchema = new Schema<IBooking>(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'PatientProfile',
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'HealthcareService',
      required: true,
      index: true,
    },
    assignedProfessionalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian phone number'],
    },
    status: {
      type: String,
      enum: ['requested', 'triaged', 'matched', 'in_progress', 'completed', 'cancelled'],
      default: 'requested',
      index: true,
    },
    preferredDate: { type: Date },
    scheduledDate: { type: Date },
    serviceLocation: {
      type: BookingLocationSchema,
      required: true,
    },
    clinicalNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    pricing: {
      type: BookingPricingSchema,
      required: true,
    },
    prescriptionFileId: {
      type: Schema.Types.ObjectId,
      ref: 'UploadedFile',
    },
    dispatchState: {
      type: BookingDispatchStateSchema,
      default: () => ({}),
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

export const Booking: Model<IBooking> = 
  mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);
