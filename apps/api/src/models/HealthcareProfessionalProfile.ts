import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProfessionType = 
  | 'physician'
  | 'physiotherapist'
  | 'nurse'
  | 'caregiver'
  | 'phlebotomist'
  | 'dietitian'
  | 'chw'
  | 'anm'
  | 'technician';

export type ProfessionalVerificationStatus = 
  | 'unverified'
  | 'pending_review'
  | 'verified'
  | 'rejected';

export interface IHealthcareProfessionalProfile extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  professionType: ProfessionType;
  highestQualification?: string;
  institution?: string;
  specializations: string[];
  registrationNumber?: string;
  registrationCouncil?: string;
  yearsOfExperience: number;
  experienceSummary?: string;
  skills?: string[];
  serviceClusters: string[];
  verificationStatus: ProfessionalVerificationStatus;
  bio?: string;
  profileImageFileId?: mongoose.Types.ObjectId;
  rating: number;
  totalVisitsCompleted: number;
  isActiveForDispatch: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HealthcareProfessionalProfileSchema = new Schema<IHealthcareProfessionalProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Care Professional',
    },
    professionType: {
      type: String,
      required: true,
      enum: ['physician', 'physiotherapist', 'nurse', 'caregiver', 'phlebotomist', 'dietitian', 'chw', 'anm', 'technician'],
      index: true,
    },
    highestQualification: {
      type: String,
      trim: true,
    },
    institution: {
      type: String,
      trim: true,
    },
    specializations: [{ type: String, trim: true }],
    registrationNumber: {
      type: String,
      trim: true,
      default: 'N/A',
      index: true,
    },
    registrationCouncil: {
      type: String,
      trim: true,
      default: 'Not Applicable',
    },
    yearsOfExperience: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    experienceSummary: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    skills: [{ type: String, trim: true }],
    serviceClusters: [{ type: String, trim: true }],
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending_review', 'verified', 'rejected'],
      default: 'pending_review',
      index: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    profileImageFileId: {
      type: Schema.Types.ObjectId,
      ref: 'UploadedFile',
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    totalVisitsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActiveForDispatch: {
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

export const HealthcareProfessionalProfile: Model<IHealthcareProfessionalProfile> = 
  mongoose.models.HealthcareProfessionalProfile || 
  mongoose.model<IHealthcareProfessionalProfile>('HealthcareProfessionalProfile', HealthcareProfessionalProfileSchema);
