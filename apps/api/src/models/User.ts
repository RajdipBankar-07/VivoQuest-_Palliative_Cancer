import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 
  | 'patient'
  | 'caregiver'
  | 'professional'
  | 'hospital'
  | 'supplier'
  | 'admin'
  | 'super_admin';

export interface IDpdpConsent {
  accepted: boolean;
  consentedAt: Date;
  ipAddress?: string;
  policyVersion: string;
}

export interface IUser extends Document {
  fullName: string;
  email?: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  status: 'active' | 'pending_verification' | 'suspended';
  dpdpConsent: IDpdpConsent;
  profilePictureFileId?: mongoose.Types.ObjectId;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DpdpConsentSchema = new Schema<IDpdpConsent>(
  {
    accepted: { type: Boolean, required: true, default: false },
    consentedAt: { type: Date, required: true, default: Date.now },
    ipAddress: { type: String, trim: true },
    policyVersion: { type: String, required: true, default: 'DPDP-2023-V1.0' },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      unique: true,
      index: true,
      match: [/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // CRITICAL: Excluded by default in queries to prevent accidental leakage
    },
    role: {
      type: String,
      required: [true, 'User role is required'],
      enum: {
        values: ['patient', 'caregiver', 'professional', 'hospital', 'supplier', 'admin', 'super_admin'],
        message: '{VALUE} is not a valid VivoQuest role',
      },
      lowercase: true,
      default: 'patient',
      index: true,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'pending_verification', 'suspended'],
      default: 'active',
      index: true,
    },
    dpdpConsent: {
      type: DpdpConsentSchema,
      required: true,
    },
    profilePictureFileId: {
      type: Schema.Types.ObjectId,
      ref: 'UploadedFile',
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash; // Safety belt
        return ret;
      },
    },
  }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
