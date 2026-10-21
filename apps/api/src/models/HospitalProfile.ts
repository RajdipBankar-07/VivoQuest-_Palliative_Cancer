import mongoose, { Schema, Document, Model } from 'mongoose';

export type HospitalTier = 'tertiary' | 'quaternary' | 'secondary' | 'multi_speciality';

export interface IHospitalStaffMember {
  name: string;
  email?: string;
  phone: string;
  department: string;
  designation: string;
  isPrimaryCoordinator?: boolean;
}

export interface IDischargeCoordinator {
  name: string;
  phone: string;
  email?: string;
  designation?: string;
}

export interface IHospitalProfile extends Document {
  userId: mongoose.Types.ObjectId; // User account with role 'hospital'
  hospitalName: string;
  registrationNumber: string;
  tier: HospitalTier;
  cluster: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  contactPhone: string;
  contactEmail: string;
  website?: string;
  accreditations: string[]; // e.g. ["NABH", "NABL", "JCI"]
  departments: string[];   // e.g. ["Oncology", "Cardiology", "Palliative Care", "Neurology", "Orthopedics"]
  dischargeCoordinator: IDischargeCoordinator;
  authorizedStaff: IHospitalStaffMember[];
  isActive: boolean;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalStaffMemberSchema = new Schema<IHospitalStaffMember>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    isPrimaryCoordinator: { type: Boolean, default: false },
  },
  { _id: false }
);

const DischargeCoordinatorSchema = new Schema<IDischargeCoordinator>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    designation: { type: String, trim: true, default: 'Chief Care Coordinator' },
  },
  { _id: false }
);

const HospitalProfileSchema = new Schema<IHospitalProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    hospitalName: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Hospital registration number is required'],
      trim: true,
      unique: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['tertiary', 'quaternary', 'secondary', 'multi_speciality'],
      default: 'tertiary',
    },
    cluster: {
      type: String,
      required: true,
      trim: true,
      default: 'Pune Central',
      index: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      default: 'Pune',
    },
    state: {
      type: String,
      required: true,
      trim: true,
      default: 'Maharashtra',
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{6}$/, 'Must be a valid 6-digit Indian PIN code'],
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    website: {
      type: String,
      trim: true,
    },
    accreditations: {
      type: [String],
      default: ['NABH'],
    },
    departments: {
      type: [String],
      default: ['Oncology', 'Cardiology', 'Palliative Care', 'Neurology', 'Orthopedics'],
    },
    dischargeCoordinator: {
      type: DischargeCoordinatorSchema,
      required: true,
    },
    authorizedStaff: {
      type: [HospitalStaffMemberSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDemo: {
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

export const HospitalProfile: Model<IHospitalProfile> =
  mongoose.models.HospitalProfile ||
  mongoose.model<IHospitalProfile>('HospitalProfile', HospitalProfileSchema);
