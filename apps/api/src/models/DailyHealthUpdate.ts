import mongoose, { Schema, Document, Model } from 'mongoose';

export type HealthUpdateReviewStatus = 'new' | 'reviewed' | 'follow_up_required';
export type SubmitterRelationship = 'patient' | 'caregiver' | 'family_member';

export interface IDailyVitals {
  bloodPressure?: string;   // e.g. "120/80"
  pulse?: number;           // beats per minute e.g. 78
  temperature?: number;     // Fahrenheit e.g. 98.6
  spO2?: number;            // percentage e.g. 98
  glucose?: number;         // mg/dL e.g. 110
  weight?: number;          // kg e.g. 65.4
  painScale?: number;       // 1 - 10
}

export interface IRiskIndicator {
  level: 'low' | 'medium' | 'high';
  reason: string;
  source: string;
  flaggedAt: Date;
}

export interface IDailyHealthUpdate extends Document {
  patientId: mongoose.Types.ObjectId;
  assignedDoctorId?: mongoose.Types.ObjectId;
  submittedBy: {
    userId?: mongoose.Types.ObjectId;
    name: string;
    relationship: SubmitterRelationship;
  };
  submittedAt: Date;
  symptoms: string[];
  notes?: string;
  vitals?: IDailyVitals;
  isClinicallyVerified: boolean; // Patient-reported measurements are NOT clinically verified
  reviewStatus: HealthUpdateReviewStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  clinicianNotes?: string;
  followUpAction?: string;
  riskIndicators: IRiskIndicator[];
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  deletedByRole?: string;
  deletedByName?: string;
  deletionReason?: string;
  hiddenFromPatient?: boolean;
  hiddenFromPatientAt?: Date;
  hiddenFromCaregiver?: boolean;
  hiddenFromCaregiverAt?: Date;
  hiddenFromUserIds?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const DailyVitalsSchema = new Schema<IDailyVitals>(
  {
    bloodPressure: { type: String, trim: true },
    pulse: { type: Number, min: 30, max: 250 },
    temperature: { type: Number, min: 90, max: 110 },
    spO2: { type: Number, min: 50, max: 100 },
    glucose: { type: Number, min: 20, max: 600 },
    weight: { type: Number, min: 10, max: 300 },
    painScale: { type: Number, min: 1, max: 10 },
  },
  { _id: false }
);

const RiskIndicatorSchema = new Schema<IRiskIndicator>(
  {
    level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    reason: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true },
    flaggedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DailyHealthUpdateSchema = new Schema<IDailyHealthUpdate>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedDoctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    submittedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true, trim: true },
      relationship: {
        type: String,
        enum: ['patient', 'caregiver', 'family_member'],
        default: 'patient',
      },
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    symptoms: [{ type: String, trim: true }],
    notes: { type: String, trim: true, maxlength: 2000 },
    vitals: { type: DailyVitalsSchema },
    isClinicallyVerified: {
      type: Boolean,
      default: false, // Strictly patient-reported until clinician verified
    },
    reviewStatus: {
      type: String,
      enum: ['new', 'reviewed', 'follow_up_required'],
      default: 'new',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    clinicianNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    followUpAction: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    riskIndicators: {
      type: [RiskIndicatorSchema],
      default: [],
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedByRole: { type: String },
    deletedByName: { type: String },
    deletionReason: { type: String, trim: true },
    hiddenFromPatient: { type: Boolean, default: false },
    hiddenFromPatientAt: { type: Date },
    hiddenFromCaregiver: { type: Boolean, default: false },
    hiddenFromCaregiverAt: { type: Date },
    hiddenFromUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
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

// High-speed indices for patient timeline & doctor review queue
DailyHealthUpdateSchema.index({ patientId: 1, submittedAt: -1 });
DailyHealthUpdateSchema.index({ assignedDoctorId: 1, reviewStatus: 1, submittedAt: -1 });

export const DailyHealthUpdate: Model<IDailyHealthUpdate> =
  mongoose.models.DailyHealthUpdate || mongoose.model<IDailyHealthUpdate>('DailyHealthUpdate', DailyHealthUpdateSchema);
