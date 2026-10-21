import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkingShift {
  startTime: string; // "09:00"
  endTime: string;   // "13:00"
}

export interface IDaySchedule {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  isWorkingDay: boolean;
  shifts: IWorkingShift[];
}

export interface IBreakTime {
  startTime: string; // "13:00"
  endTime: string;   // "14:00"
  label?: string;    // "Lunch Break"
}

export interface IConsultationFees {
  in_clinic: number;
  video: number;
  home_visit: number;
  currency: string;
}

export type ConsultationMode = 'in_clinic' | 'video' | 'home_visit';

export interface IDoctorAvailability extends Document {
  doctorId: mongoose.Types.ObjectId; // User ObjectId
  doctorProfileId?: mongoose.Types.ObjectId; // HealthcareProfessionalProfile ObjectId
  slotDurationMinutes: number; // e.g. 30
  bufferMinutes: number; // e.g. 5
  weeklySchedule: IDaySchedule[];
  breakTimes: IBreakTime[];
  blackoutDates: string[]; // ['2026-11-01', '2026-11-02']
  consultationModes: ConsultationMode[];
  fees: IConsultationFees;
  clinicAddress?: string;
  city: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkingShiftSchema = new Schema<IWorkingShift>(
  {
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const DayScheduleSchema = new Schema<IDaySchedule>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    isWorkingDay: { type: Boolean, required: true, default: true },
    shifts: { type: [WorkingShiftSchema], default: [] },
  },
  { _id: false }
);

const BreakTimeSchema = new Schema<IBreakTime>(
  {
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    label: { type: String, trim: true, default: 'Break' },
  },
  { _id: false }
);

const ConsultationFeesSchema = new Schema<IConsultationFees>(
  {
    in_clinic: { type: Number, default: 800, min: 0 },
    video: { type: Number, default: 500, min: 0 },
    home_visit: { type: Number, default: 1200, min: 0 },
    currency: { type: String, default: 'INR', trim: true },
  },
  { _id: false }
);

const DoctorAvailabilitySchema = new Schema<IDoctorAvailability>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    doctorProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'HealthcareProfessionalProfile',
      index: true,
    },
    slotDurationMinutes: {
      type: Number,
      required: true,
      default: 30,
      min: 15,
      max: 120,
    },
    bufferMinutes: {
      type: Number,
      default: 5,
      min: 0,
      max: 30,
    },
    weeklySchedule: {
      type: [DayScheduleSchema],
      default: () => [
        { dayOfWeek: 1, isWorkingDay: true, shifts: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '18:00' }] },
        { dayOfWeek: 2, isWorkingDay: true, shifts: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '18:00' }] },
        { dayOfWeek: 3, isWorkingDay: true, shifts: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '18:00' }] },
        { dayOfWeek: 4, isWorkingDay: true, shifts: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '18:00' }] },
        { dayOfWeek: 5, isWorkingDay: true, shifts: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '18:00' }] },
        { dayOfWeek: 6, isWorkingDay: true, shifts: [{ startTime: '09:00', endTime: '14:00' }] },
        { dayOfWeek: 0, isWorkingDay: false, shifts: [] }, // Sunday off
      ],
    },
    breakTimes: {
      type: [BreakTimeSchema],
      default: () => [
        { startTime: '13:00', endTime: '14:00', label: 'Lunch Break' },
      ],
    },
    blackoutDates: {
      type: [String], // Array of 'YYYY-MM-DD'
      default: [],
    },
    consultationModes: {
      type: [String],
      enum: ['in_clinic', 'video', 'home_visit'],
      default: ['in_clinic', 'video', 'home_visit'],
    },
    fees: {
      type: ConsultationFeesSchema,
      default: () => ({
        in_clinic: 800,
        video: 500,
        home_visit: 1200,
        currency: 'INR',
      }),
    },
    clinicAddress: {
      type: String,
      trim: true,
      default: 'VivoQuest Clinical Center, FC Road, Pune',
    },
    city: {
      type: String,
      trim: true,
      default: 'Pune',
    },
    isActive: {
      type: Boolean,
      default: true,
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

export const DoctorAvailability: Model<IDoctorAvailability> =
  mongoose.models.DoctorAvailability ||
  mongoose.model<IDoctorAvailability>('DoctorAvailability', DoctorAvailabilitySchema);
