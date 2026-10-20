import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProfessionType = 
  | 'physician'
  | 'physiotherapist'
  | 'nurse'
  | 'phlebotomist'
  | 'dietitian'
  | 'chw'
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
  specializations: string[];
  registrationNumber: string;
  registrationCouncil: string;
  yearsOfExperience: number;
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
      default: 'Dr.',
    },
    professionType: {
      type: String,
      required: true,
      enum: ['physician', 'physiotherapist', 'nurse', 'phlebotomist', 'dietitian', 'chw', 'technician'],
      index: true,
    },
    specializations: [{ type: String, trim: true }],
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    registrationCouncil: {
      type: String,
      required: true,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
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
