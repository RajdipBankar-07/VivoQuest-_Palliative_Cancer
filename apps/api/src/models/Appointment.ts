import mongoose, { Schema, Document, Model } from 'mongoose';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'declined'
  | 'reschedule_requested';

export type AppointmentConsultationMode = 'in_clinic' | 'video' | 'home_visit';

export interface IAppointmentTimeSlot {
  startTime: string; // e.g. "09:30"
  endTime: string;   // e.g. "10:00"
}

export interface IStatusHistoryEntry {
  status: AppointmentStatus | string;
  changedBy?: mongoose.Types.ObjectId;
  changedByRole?: string;
  timestamp: Date;
  reason?: string;
  notes?: string;
}

export interface IPatientDetails {
  fullName: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
}

export interface IPrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface IPrescription {
  medicines: IPrescriptionMedicine[];
  recommendations?: string;
  issuedAt?: Date;
}

export interface IAppointmentLocation {
  address?: string;
  city: string;
  clinicName?: string;
  telehealthMeetingUrl?: string;
}

export interface IAppointmentPricing {
  amount: number;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'waived';
}

export interface IAppointment extends Document {
  appointmentNumber: string;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  doctorProfileId?: mongoose.Types.ObjectId;
  serviceId?: mongoose.Types.ObjectId;
  appointmentDate: string; // "YYYY-MM-DD"
  timeSlot: IAppointmentTimeSlot;
  consultationMode: AppointmentConsultationMode;
  status: AppointmentStatus;
  statusHistory: IStatusHistoryEntry[];
  patientDetails: IPatientDetails;
  clinicalReason?: string;
  doctorNotes?: string;
  prescription?: IPrescription;
  location: IAppointmentLocation;
  pricing: IAppointmentPricing;
  cancellationReason?: string;
  rescheduledFrom?: mongoose.Types.ObjectId;
  isSeededDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentTimeSlotSchema = new Schema<IAppointmentTimeSlot>(
  {
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const StatusHistoryEntrySchema = new Schema<IStatusHistoryEntry>(
  {
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changedByRole: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const PatientDetailsSchema = new Schema<IPatientDetails>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian phone number'],
    },
    email: { type: String, trim: true, lowercase: true },
    age: { type: Number, min: 0, max: 130 },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  },
  { _id: false }
);

const PrescriptionMedicineSchema = new Schema<IPrescriptionMedicine>(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    instructions: { type: String, trim: true },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema<IPrescription>(
  {
    medicines: { type: [PrescriptionMedicineSchema], default: [] },
    recommendations: { type: String, trim: true },
    issuedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AppointmentLocationSchema = new Schema<IAppointmentLocation>(
  {
    address: { type: String, trim: true },
    city: { type: String, required: true, default: 'Pune' },
    clinicName: { type: String, trim: true, default: 'VivoQuest Clinical Center' },
    telehealthMeetingUrl: { type: String, trim: true },
  },
  { _id: false }
);

const AppointmentPricingSchema = new Schema<IAppointmentPricing>(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'waived'],
      default: 'pending',
    },
  },
  { _id: false }
);

const AppointmentSchema = new Schema<IAppointment>(
  {
    appointmentNumber: {
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
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'HealthcareProfessionalProfile',
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'HealthcareService',
    },
    appointmentDate: {
      type: String,
      required: true,
      index: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Appointment date must be in YYYY-MM-DD format'],
    },
    timeSlot: {
      type: AppointmentTimeSlotSchema,
      required: true,
    },
    consultationMode: {
      type: String,
      enum: ['in_clinic', 'video', 'home_visit'],
      required: true,
      default: 'in_clinic',
    },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'declined',
        'reschedule_requested',
      ],
      default: 'confirmed',
      index: true,
    },
    statusHistory: {
      type: [StatusHistoryEntrySchema],
      default: () => [],
    },
    patientDetails: {
      type: PatientDetailsSchema,
      required: true,
    },
    clinicalReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    doctorNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    prescription: {
      type: PrescriptionSchema,
    },
    location: {
      type: AppointmentLocationSchema,
      required: true,
    },
    pricing: {
      type: AppointmentPricingSchema,
      required: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    rescheduledFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    isSeededDemo: {
      type: Boolean,
      default: false,
      index: true,
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

// CRITICAL UNIQUE COMPOUND INDEX FOR DOUBLE-BOOKING PREVENTION:
// Guarantees at database level that the same doctor cannot have two active appointments at the same date and start time.
AppointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, 'timeSlot.startTime': 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'confirmed', 'in_progress', 'reschedule_requested'] },
    },
  }
);

// Compound query index for patient appointment history
AppointmentSchema.index({ patientId: 1, appointmentDate: -1 });

// Compound query index for doctor calendar / dashboard
AppointmentSchema.index({ doctorId: 1, appointmentDate: 1, status: 1 });

export const Appointment: Model<IAppointment> =
  mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema);
