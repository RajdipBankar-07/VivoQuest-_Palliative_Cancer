import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReferralPriority = 'routine' | 'urgent' | 'immediate';

export type ReferralStatus =
  | 'submitted'
  | 'triaged'
  | 'bundle_proposed'
  | 'matched'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'rejected';

export type PatientMobilityStatus = 'ambulatory' | 'assisted_walker' | 'wheelchair_bound' | 'bedbound';

export interface IReferringStaff {
  name: string;
  department: string;
  designation: string;
  phone: string;
  email?: string;
}

export interface IReferralPatientDetails {
  fullName: string;
  phone: string;
  email?: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  ipdNumber?: string;
  dischargeDate?: string; // YYYY-MM-DD
  address: string;
  city: string;
  pincode: string;
  cluster: string;
}

export interface IReferralClinicalSummary {
  primaryDiagnosis: string;
  secondaryConditions?: string[];
  surgicalHistory?: string;
  dietaryRestrictions?: string;
  mobilityStatus: PatientMobilityStatus;
  palliativeCareNeeds?: string;
  clinicalNotes?: string;
  prescriptionFileId?: mongoose.Types.ObjectId;
}

export interface IReferralRequestedService {
  serviceCode: string; // e.g. "NUR-01", "PHYSIO-01", "PHLEB-01", "PALLIATIVE-01", "DIET-01"
  serviceName: string;
  frequency: 'daily' | 'alternate_days' | 'weekly' | 'as_needed' | 'one_time';
  durationDays: number;
  preferredStartDate: string; // YYYY-MM-DD
  preferredTimeSlot?: 'morning' | 'afternoon' | 'evening' | 'any';
  instructions?: string;
}

export interface IReferralEquipmentItem {
  itemType:
    | 'oxygen_concentrator'
    | 'bipap_cpap'
    | 'hospital_bed_motorized'
    | 'hospital_bed_manual'
    | 'wheelchair'
    | 'suction_machine'
    | 'iv_stand'
    | 'dvt_pump'
    | 'air_mattress'
    | 'other';
  name: string;
  quantity: number;
  urgency: 'routine' | 'urgent' | 'immediate';
  deliveryDate?: string; // YYYY-MM-DD
  durationWeeks?: number;
  specialInstructions?: string;
}

export interface IReferralStatusHistory {
  status: ReferralStatus | string;
  changedBy?: mongoose.Types.ObjectId;
  changedByRole?: string;
  changedByName?: string;
  timestamp: Date;
  reason?: string;
  notes?: string;
}

export interface IProposedCareBundle {
  bundleId?: string;
  bundleName: string;
  description?: string;
  servicesIncluded: string[];
  equipmentIncluded: string[];
  estimatedCostPerWeek?: number;
  totalEstimatedCost?: number;
  bundleDiscountPercentage?: number;
  suggestedByAi: boolean;
  suggestedAt: Date;
}

export interface IAssignedProvider {
  professionalId?: mongoose.Types.ObjectId;
  name: string;
  role: string;
  phone?: string;
  serviceAssigned: string;
  assignedAt: Date;
  assignedBy?: mongoose.Types.ObjectId;
}

export interface IReferralVisitVitals {
  bloodPressure?: string;
  pulse?: number;
  spO2?: number;
  temperature?: string;
  respiratoryRate?: number;
}

export interface IReferralVisitSummary {
  visitId: string;
  visitDate: string; // YYYY-MM-DD
  providerName: string;
  providerRole: string;
  vitals?: IReferralVisitVitals;
  clinicalObservation: string;
  proceduresPerformed?: string[];
  medicationsAdministered?: string[];
  nextFollowUpDate?: string;
  signedAt: Date;
}

export interface IHospitalReferral extends Document {
  referralNumber: string;
  hospitalId: mongoose.Types.ObjectId; // User account with role 'hospital'
  hospitalProfileId?: mongoose.Types.ObjectId;
  hospitalName: string;
  referringStaff: IReferringStaff;
  patientDetails: IReferralPatientDetails;
  clinicalSummary: IReferralClinicalSummary;
  requestedServices: IReferralRequestedService[];
  equipmentRequired: IReferralEquipmentItem[];
  priority: ReferralPriority;
  status: ReferralStatus;
  statusHistory: IReferralStatusHistory[];
  proposedCareBundle?: IProposedCareBundle;
  assignedReviewer?: {
    userId?: mongoose.Types.ObjectId;
    name?: string;
    role?: string;
    reviewedAt?: Date;
    reviewNotes?: string;
  };
  assignedProviders: IAssignedProvider[];
  linkedBookingIds: mongoose.Types.ObjectId[];
  visitSummaries: IReferralVisitSummary[];
  cancellationOrRejectionReason?: string;
  isSeededDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReferringStaffSchema = new Schema<IReferringStaff>(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);

const ReferralPatientDetailsSchema = new Schema<IReferralPatientDetails>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian phone number'],
    },
    email: { type: String, trim: true, lowercase: true },
    age: { type: Number, required: true, min: 0, max: 130 },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      required: true,
      default: 'prefer_not_to_say',
    },
    ipdNumber: { type: String, trim: true },
    dischargeDate: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, default: 'Pune' },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{6}$/, 'Must be a 6-digit Indian PIN code'],
    },
    cluster: { type: String, required: true, trim: true, default: 'Pune' },
  },
  { _id: false }
);

const ReferralClinicalSummarySchema = new Schema<IReferralClinicalSummary>(
  {
    primaryDiagnosis: { type: String, required: true, trim: true },
    secondaryConditions: { type: [String], default: [] },
    surgicalHistory: { type: String, trim: true },
    dietaryRestrictions: { type: String, trim: true },
    mobilityStatus: {
      type: String,
      enum: ['ambulatory', 'assisted_walker', 'wheelchair_bound', 'bedbound'],
      default: 'ambulatory',
    },
    palliativeCareNeeds: { type: String, trim: true },
    clinicalNotes: { type: String, trim: true, maxlength: 3000 },
    prescriptionFileId: { type: Schema.Types.ObjectId, ref: 'UploadedFile' },
  },
  { _id: false }
);

const ReferralRequestedServiceSchema = new Schema<IReferralRequestedService>(
  {
    serviceCode: { type: String, required: true, trim: true },
    serviceName: { type: String, required: true, trim: true },
    frequency: {
      type: String,
      enum: ['daily', 'alternate_days', 'weekly', 'as_needed', 'one_time'],
      default: 'daily',
    },
    durationDays: { type: Number, required: true, default: 7 },
    preferredStartDate: { type: String, required: true, trim: true },
    preferredTimeSlot: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'any'],
      default: 'morning',
    },
    instructions: { type: String, trim: true },
  },
  { _id: false }
);

const ReferralEquipmentItemSchema = new Schema<IReferralEquipmentItem>(
  {
    itemType: {
      type: String,
      enum: [
        'oxygen_concentrator',
        'bipap_cpap',
        'hospital_bed_motorized',
        'hospital_bed_manual',
        'wheelchair',
        'suction_machine',
        'iv_stand',
        'dvt_pump',
        'air_mattress',
        'other',
      ],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'immediate'],
      default: 'routine',
    },
    deliveryDate: { type: String, trim: true },
    durationWeeks: { type: Number, default: 2, min: 1 },
    specialInstructions: { type: String, trim: true },
  },
  { _id: false }
);

const ReferralStatusHistorySchema = new Schema<IReferralStatusHistory>(
  {
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changedByRole: { type: String, trim: true },
    changedByName: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const ProposedCareBundleSchema = new Schema<IProposedCareBundle>(
  {
    bundleId: { type: String, trim: true },
    bundleName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    servicesIncluded: { type: [String], default: [] },
    equipmentIncluded: { type: [String], default: [] },
    estimatedCostPerWeek: { type: Number },
    totalEstimatedCost: { type: Number },
    bundleDiscountPercentage: { type: Number, default: 15 },
    suggestedByAi: { type: Boolean, default: true },
    suggestedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AssignedProviderSchema = new Schema<IAssignedProvider>(
  {
    professionalId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    serviceAssigned: { type: String, required: true, trim: true },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const ReferralVisitVitalsSchema = new Schema<IReferralVisitVitals>(
  {
    bloodPressure: { type: String, trim: true },
    pulse: { type: Number },
    spO2: { type: Number },
    temperature: { type: String, trim: true },
    respiratoryRate: { type: Number },
  },
  { _id: false }
);

const ReferralVisitSummarySchema = new Schema<IReferralVisitSummary>(
  {
    visitId: { type: String, required: true, trim: true },
    visitDate: { type: String, required: true, trim: true },
    providerName: { type: String, required: true, trim: true },
    providerRole: { type: String, required: true, trim: true },
    vitals: { type: ReferralVisitVitalsSchema },
    clinicalObservation: { type: String, required: true, trim: true },
    proceduresPerformed: { type: [String], default: [] },
    medicationsAdministered: { type: [String], default: [] },
    nextFollowUpDate: { type: String, trim: true },
    signedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const HospitalReferralSchema = new Schema<IHospitalReferral>(
  {
    referralNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hospitalProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'HospitalProfile',
      index: true,
    },
    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },
    referringStaff: {
      type: ReferringStaffSchema,
      required: true,
    },
    patientDetails: {
      type: ReferralPatientDetailsSchema,
      required: true,
    },
    clinicalSummary: {
      type: ReferralClinicalSummarySchema,
      required: true,
    },
    requestedServices: {
      type: [ReferralRequestedServiceSchema],
      default: [],
    },
    equipmentRequired: {
      type: [ReferralEquipmentItemSchema],
      default: [],
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'immediate'],
      default: 'routine',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'submitted',
        'triaged',
        'bundle_proposed',
        'matched',
        'approved',
        'in_progress',
        'completed',
        'rejected',
      ],
      default: 'submitted',
      index: true,
    },
    statusHistory: {
      type: [ReferralStatusHistorySchema],
      default: () => [],
    },
    proposedCareBundle: {
      type: ProposedCareBundleSchema,
    },
    assignedReviewer: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, trim: true },
      role: { type: String, trim: true },
      reviewedAt: { type: Date },
      reviewNotes: { type: String, trim: true },
    },
    assignedProviders: {
      type: [AssignedProviderSchema],
      default: () => [],
    },
    linkedBookingIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Booking',
      },
    ],
    visitSummaries: {
      type: [ReferralVisitSummarySchema],
      default: () => [],
    },
    cancellationOrRejectionReason: {
      type: String,
      trim: true,
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

// Indexes for high-performance organization-level queries & status filtering
HospitalReferralSchema.index({ hospitalId: 1, status: 1, createdAt: -1 });
HospitalReferralSchema.index({ status: 1, priority: 1 });
HospitalReferralSchema.index({ 'patientDetails.phone': 1 });

export const HospitalReferral: Model<IHospitalReferral> =
  mongoose.models.HospitalReferral ||
  mongoose.model<IHospitalReferral>('HospitalReferral', HospitalReferralSchema);
