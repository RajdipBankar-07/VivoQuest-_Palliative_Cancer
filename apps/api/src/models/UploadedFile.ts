import mongoose, { Schema, Document, Model } from 'mongoose';

export type FileCategory = 
  | 'profile_picture'
  | 'professional_profile_image'
  | 'equipment_product_image'
  | 'credential_document'
  | 'prescription'
  | 'clinical_report';

export type AccessTier = 
  | 'PUBLIC_READ'
  | 'AUTHENTICATED_READ'
  | 'RESTRICTED_VERIFICATION_ONLY'
  | 'PATIENT_CLINICIAN_CONFIDENTIAL';

export type UploadStatus = 'pending_upload' | 'confirmed' | 'deleted';

export interface IUploadedFile extends Document {
  fileId: string;
  s3Key: string;
  s3Bucket: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedBy: mongoose.Types.ObjectId;
  patientId?: mongoose.Types.ObjectId;
  fileCategory: FileCategory;
  accessTier: AccessTier;
  uploadStatus: UploadStatus;
  confirmedAt?: Date;
  kmsEncrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UploadedFileSchema = new Schema<IUploadedFile>(
  {
    fileId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    s3Key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    s3Bucket: {
      type: String,
      required: true,
      trim: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    fileSizeBytes: {
      type: Number,
      required: true,
      min: [1, 'File size must be greater than 0 bytes'],
      max: [20 * 1024 * 1024, 'Maximum allowed file size is 20MB'],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    fileCategory: {
      type: String,
      required: true,
      enum: [
        'profile_picture',
        'professional_profile_image',
        'equipment_product_image',
        'credential_document',
        'prescription',
        'clinical_report',
      ],
      index: true,
    },
    accessTier: {
      type: String,
      required: true,
      enum: [
        'PUBLIC_READ',
        'AUTHENTICATED_READ',
        'RESTRICTED_VERIFICATION_ONLY',
        'PATIENT_CLINICIAN_CONFIDENTIAL',
      ],
      index: true,
    },
    uploadStatus: {
      type: String,
      enum: ['pending_upload', 'confirmed', 'deleted'],
      default: 'pending_upload',
      index: true,
    },
    confirmedAt: { type: Date },
    kmsEncrypted: { type: Boolean, default: true },
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

export const UploadedFile: Model<IUploadedFile> = 
  mongoose.models.UploadedFile || mongoose.model<IUploadedFile>('UploadedFile', UploadedFileSchema);
