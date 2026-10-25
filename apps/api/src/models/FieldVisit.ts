import mongoose, { Schema, Document, Model } from 'mongoose';

export type FieldVisitType =
  | 'clinical_care'
  | 'nursing_procedure'
  | 'physiotherapy'
  | 'palliative_assessment'
  | 'equipment_installation';

export type FieldVisitStatus =
  | 'assigned'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type VisitExceptionType =
  | 'patient_unavailable'
  | 'refused_care'
  | 'access_blocked'
  | 'clinical_escalation'
  | 'equipment_defect'
  | 'other';

export interface IVisitVitals {
  bloodPressure?: string;
  pulse?: number;
  spO2?: number;
  temperature?: string;
  respiratoryRate?: number;
}

export interface IEquipmentVerificationItem {
  sku: string;
  name: string;
  serialNumber: string;
  condition: 'new' | 'good' | 'damaged' | 'functional_tested';
  checklistPassed: boolean;
}

export interface IFieldVisit extends Document {
  visitNumber: string;
  visitType: FieldVisitType;
  status: FieldVisitStatus;
  providerId: mongoose.Types.ObjectId;
  providerName: string;
  providerRole: string;
  providerPhone?: string;
  patientId?: mongoose.Types.ObjectId;
  patientDetails: {
    fullName: string;
    phone: string;
    address: string;
    street?: string;
    city: string;
    state?: string;
    pincode: string;
    cluster: string;
    instructions?: string;
    emergencyContact?: string;
  };
  scheduledDate: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:00 - 11:00"
  timestamps: {
    assignedAt: Date;
    acceptedAt?: Date;
    enRouteAt?: Date;
    arrivedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
  };
  subscriptionId?: mongoose.Types.ObjectId;
  subscriptionNumber?: string;
  hospitalReferralId?: mongoose.Types.ObjectId;
  hospitalId?: mongoose.Types.ObjectId;
  hospitalName?: string;
  productOrderId?: mongoose.Types.ObjectId;
  orderNumber?: string;
  clinicalDocumentation?: {
    vitals?: IVisitVitals;
    clinicalNotes?: string;
    proceduresPerformed?: string[];
    medicationsAdministered?: string[];
    recommendations?: string;
    followUpDate?: string;
    signedAt?: Date;
    isDeleted?: boolean;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;
    deletedByRole?: string;
    deletedByName?: string;
    deletionReason?: string;
    versionHistory?: Array<{
      editedAt: Date;
      editedBy: mongoose.Types.ObjectId;
      editedByRole: string;
      editedByName: string;
      editReason: string;
      previousVitals?: IVisitVitals;
      previousNotes?: string;
      previousProcedures?: string[];
      previousMedications?: string[];
      previousRecommendations?: string;
    }>;
  };
  installationVerification?: {
    isEquipmentInstallation: boolean;
    equipmentItems: IEquipmentVerificationItem[];
    barcodeScanVerified: boolean;
    barcodeRawData?: string;
    patientAcknowledged: boolean;
    patientOrCaregiverName?: string;
    consentObtained: boolean;
    evidenceNotes?: string;
    installationNotes?: string;
    failedReason?: string;
    escalatedToAdmin?: boolean;
    rescheduledToDate?: string;
  };
  exceptionDetails?: {
    hasException: boolean;
    exceptionType?: VisitExceptionType;
    reason?: string;
    reportedAt?: Date;
    notes?: string;
  };
  closedLoop?: {
    isLinkedToReferral: boolean;
    summarySubmittedAt?: Date;
    summaryAcknowledgedAt?: Date;
    summaryAcknowledgedBy?: string;
    hospitalReviewNotes?: string;
  };
  statusHistory: Array<{
    status: FieldVisitStatus | string;
    changedBy?: mongoose.Types.ObjectId;
    changedByRole?: string;
    changedByName?: string;
    timestamp: Date;
    reason?: string;
    notes?: string;
  }>;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentVerificationItemSchema = new Schema<IEquipmentVerificationItem>(
  {
    sku: { type: String, required: true },
    name: { type: String, required: true },
    serialNumber: { type: String, required: true, trim: true },
    condition: {
      type: String,
      enum: ['new', 'good', 'damaged', 'functional_tested'],
      default: 'functional_tested',
    },
    checklistPassed: { type: Boolean, default: true },
  },
  { _id: false }
);

const FieldVisitSchema = new Schema<IFieldVisit>(
  {
    visitNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    visitType: {
      type: String,
      enum: [
        'clinical_care',
        'nursing_procedure',
        'physiotherapy',
        'palliative_assessment',
        'equipment_installation',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'assigned',
        'accepted',
        'en_route',
        'arrived',
        'in_progress',
        'completed',
        'cancelled',
        'failed',
      ],
      default: 'assigned',
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    providerName: { type: String, required: true, trim: true },
    providerRole: { type: String, required: true, trim: true },
    providerPhone: { type: String, trim: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User' },
    patientDetails: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      street: { type: String, trim: true },
      city: { type: String, required: true, trim: true, default: 'Pune' },
      state: { type: String, trim: true, default: 'Maharashtra' },
      pincode: { type: String, required: true, trim: true },
      cluster: { type: String, required: true, trim: true, default: 'Pune Central' },
      instructions: { type: String, trim: true },
      emergencyContact: { type: String, trim: true },
    },
    scheduledDate: { type: String, required: true, index: true }, // YYYY-MM-DD
    timeSlot: { type: String, required: true, default: '09:00 - 11:00' },
    timestamps: {
      assignedAt: { type: Date, default: Date.now },
      acceptedAt: { type: Date },
      enRouteAt: { type: Date },
      arrivedAt: { type: Date },
      startedAt: { type: Date },
      completedAt: { type: Date },
      cancelledAt: { type: Date },
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'CaregiverSubscription',
      index: true,
    },
    subscriptionNumber: {
      type: String,
      trim: true,
      index: true,
    },
    hospitalReferralId: {
      type: Schema.Types.ObjectId,
      ref: 'HospitalReferral',
      index: true,
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    hospitalName: { type: String, trim: true },
    productOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductOrder',
      index: true,
    },
    orderNumber: { type: String, trim: true },
    clinicalDocumentation: {
      vitals: {
        bloodPressure: { type: String },
        pulse: { type: Number },
        spO2: { type: Number },
        temperature: { type: String },
        respiratoryRate: { type: Number },
      },
      clinicalNotes: { type: String, trim: true },
      proceduresPerformed: { type: [String], default: [] },
      medicationsAdministered: { type: [String], default: [] },
      recommendations: { type: String, trim: true },
      followUpDate: { type: String, trim: true },
      signedAt: { type: Date },
      isDeleted: { type: Boolean, default: false },
      deletedAt: { type: Date },
      deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      deletedByRole: { type: String },
      deletedByName: { type: String },
      deletionReason: { type: String, trim: true },
      versionHistory: [
        {
          editedAt: { type: Date, default: Date.now },
          editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
          editedByRole: { type: String },
          editedByName: { type: String },
          editReason: { type: String, trim: true },
          previousVitals: { type: Schema.Types.Mixed },
          previousNotes: { type: String },
          previousProcedures: { type: [String] },
          previousMedications: { type: [String] },
          previousRecommendations: { type: String },
        },
      ],
    },
    installationVerification: {
      isEquipmentInstallation: { type: Boolean, default: false },
      equipmentItems: [EquipmentVerificationItemSchema],
      barcodeScanVerified: { type: Boolean, default: false },
      barcodeRawData: { type: String },
      patientAcknowledged: { type: Boolean, default: false },
      patientOrCaregiverName: { type: String, trim: true },
      consentObtained: { type: Boolean, default: false },
      evidenceNotes: { type: String, trim: true },
      installationNotes: { type: String, trim: true },
      failedReason: { type: String, trim: true },
      escalatedToAdmin: { type: Boolean, default: false },
      rescheduledToDate: { type: String, trim: true },
    },
    exceptionDetails: {
      hasException: { type: Boolean, default: false },
      exceptionType: {
        type: String,
        enum: [
          'patient_unavailable',
          'refused_care',
          'access_blocked',
          'clinical_escalation',
          'equipment_defect',
          'other',
        ],
      },
      reason: { type: String, trim: true },
      reportedAt: { type: Date },
      notes: { type: String, trim: true },
    },
    closedLoop: {
      isLinkedToReferral: { type: Boolean, default: false },
      summarySubmittedAt: { type: Date },
      summaryAcknowledgedAt: { type: Date },
      summaryAcknowledgedBy: { type: String, trim: true },
      hospitalReviewNotes: { type: String, trim: true },
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changedByRole: { type: String },
        changedByName: { type: String },
        timestamp: { type: Date, default: Date.now },
        reason: { type: String },
        notes: { type: String },
      },
    ],
    isDemo: { type: Boolean, default: false },
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

// Compound index for provider daily queries
FieldVisitSchema.index({ providerId: 1, scheduledDate: 1, status: 1 });
FieldVisitSchema.index({ hospitalReferralId: 1, status: 1 });
FieldVisitSchema.index({ productOrderId: 1, status: 1 });
FieldVisitSchema.index({ subscriptionId: 1, status: 1 });

export const FieldVisit: Model<IFieldVisit> =
  mongoose.models.FieldVisit || mongoose.model<IFieldVisit>('FieldVisit', FieldVisitSchema);
