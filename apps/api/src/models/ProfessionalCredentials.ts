import mongoose, { Schema, Document, Model } from 'mongoose';

export type CredentialDocumentType = 
  | 'medical_council_registration'
  | 'degree_certificate'
  | 'identity_proof_aadhaar_pan'
  | 'experience_letter'
  | 'clinical_reference';

export interface IProfessionalCredentials extends Document {
  professionalId: mongoose.Types.ObjectId;
  documentType: CredentialDocumentType;
  documentNumber: string;
  issuingAuthority: string;
  issueDate?: Date;
  expiryDate?: Date;
  uploadedFileId: mongoose.Types.ObjectId;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProfessionalCredentialsSchema = new Schema<IProfessionalCredentials>(
  {
    professionalId: {
      type: Schema.Types.ObjectId,
      ref: 'HealthcareProfessionalProfile',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: [
        'medical_council_registration',
        'degree_certificate',
        'identity_proof_aadhaar_pan',
        'experience_letter',
        'clinical_reference',
      ],
      index: true,
    },
    documentNumber: {
      type: String,
      required: true,
      trim: true,
    },
    issuingAuthority: {
      type: String,
      required: true,
      trim: true,
    },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    uploadedFileId: {
      type: Schema.Types.ObjectId,
      ref: 'UploadedFile',
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    verifiedAt: { type: Date },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: { type: String, trim: true },
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

export const ProfessionalCredentials: Model<IProfessionalCredentials> = 
  mongoose.models.ProfessionalCredentials || 
  mongoose.model<IProfessionalCredentials>('ProfessionalCredentials', ProfessionalCredentialsSchema);
