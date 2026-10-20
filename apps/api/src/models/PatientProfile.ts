import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPatientAddress {
  street?: string;
  city: string;
  state: string;
  pincode: string;
  cluster: string;
  coordinates?: [number, number]; // [longitude, latitude] for GIS dispatch
}

export interface IEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface IPatientProfile extends Document {
  userId: mongoose.Types.ObjectId;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bloodGroup?: string;
  address: IPatientAddress;
  emergencyContact?: IEmergencyContact;
  chronicConditions: string[];
  allergies: string[];
  primaryLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}

const PatientAddressSchema = new Schema<IPatientAddress>(
  {
    street: { type: String, trim: true },
    city: { type: String, required: true, trim: true, default: 'Pune' },
    state: { type: String, required: true, trim: true, default: 'Maharashtra' },
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

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    phone: { 
      type: String, 
      required: true, 
      trim: true, 
      match: [/^[6-9]\d{9}$/, 'Must be a 10-digit Indian phone number'] 
    },
  },
  { _id: false }
);

const PatientProfileSchema = new Schema<IPatientProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    address: {
      type: PatientAddressSchema,
      required: true,
    },
    emergencyContact: {
      type: EmergencyContactSchema,
    },
    chronicConditions: [{ type: String, trim: true }],
    allergies: [{ type: String, trim: true }],
    primaryLanguage: { type: String, default: 'English', trim: true },
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

export const PatientProfile: Model<IPatientProfile> = 
  mongoose.models.PatientProfile || mongoose.model<IPatientProfile>('PatientProfile', PatientProfileSchema);
