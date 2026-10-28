import mongoose, { Schema, Document, Model } from 'mongoose';

export type CredentialDocumentType = 
  | 'medical_council_registration'
  | 'degree_certificate'
  | 'identity_proof_aadhaar_pan'
  | 'experience_letter'
  | 'clinical_reference'
  | 'training_certificate'
  | 'anm_diploma'
  | 'nursing_council_registration'
  | 'other_certification';

export interface IProfessionalCredentials extends Document {
  professionalId: mongoose.Types.ObjectId;
  documentType: CredentialDocumentType;
  certificateTitle?: string;
  issuingAuthority: string;
  issuingOrganization?: string;
  credentialCategory?: string;
  documentNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  uploadedFileId?: mongoose.Types.ObjectId;
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'expired' | 'verified';
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  reviewNotes?: string;
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
        'training_certificate',
        'anm_diploma',
        'nursing_council_registration',
        'other_certification',
      ],
      default: 'other_certification',
      index: true,
    },
    certificateTitle: {
      type: String,
      trim: true,
    },
    documentNumber: {
      type: String,
      trim: true,
      default: 'N/A',
    },
    issuingAuthority: {
      type: String,
      required: true,
      trim: true,
      default: 'Authorized Institution',
    },
    issuingOrganization: {
      type: String,
      trim: true,
    },
    credentialCategory: {
      type: String,
      trim: true,
    },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    uploadedFileId: {
      type: Schema.Types.ObjectId,
      ref: 'UploadedFile',
      required: false,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired', 'verified'],
      default: 'pending',
      index: true,
    },
    verifiedAt: { type: Date },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: { type: String, trim: true },
    reviewNotes: { type: String, trim: true },
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
