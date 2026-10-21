import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClinicalNote extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  doctorName: string;
  doctorSpecialty?: string;
  appointmentId?: mongoose.Types.ObjectId;
  fieldVisitId?: mongoose.Types.ObjectId;
  subjective?: string; // Patient-reported symptoms, chief complaint
  objective?: string;  // Examination findings, clinical observations
  assessment: string;  // Clinical impression / assessment
  plan: string;        // Management & treatment plan
  followUpInstructions?: string;
  followUpDate?: string; // YYYY-MM-DD
  isAuditVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicalNoteSchema = new Schema<IClinicalNote>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    doctorSpecialty: {
      type: String,
      trim: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    fieldVisitId: {
      type: Schema.Types.ObjectId,
      ref: 'FieldVisit',
    },
    subjective: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    objective: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    assessment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    plan: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    followUpInstructions: {
      type: String,
      trim: true,
      maxlength: 1500,
    },
    followUpDate: {
      type: String,
      trim: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Follow-up date must be YYYY-MM-DD'],
    },
    isAuditVerified: {
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

ClinicalNoteSchema.index({ patientId: 1, createdAt: -1 });
ClinicalNoteSchema.index({ doctorId: 1, createdAt: -1 });

export const ClinicalNote: Model<IClinicalNote> =
  mongoose.models.ClinicalNote || mongoose.model<IClinicalNote>('ClinicalNote', ClinicalNoteSchema);
