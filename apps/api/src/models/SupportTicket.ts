import mongoose, { Schema, Document, Model } from 'mongoose';

export type TicketCategory =
  | 'booking_exception'
  | 'clinical_escalation'
  | 'hospital_issue'
  | 'payment_dispute'
  | 'patient_safety'
  | 'technical';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export type TicketStatus = 'open' | 'investigating' | 'escalated' | 'resolved' | 'closed';

export interface ISupportTicket extends Document {
  ticketNumber: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  isEscalatedToSuperAdmin: boolean;
  reportedBy: {
    name: string;
    phone?: string;
    role?: string;
    userId?: mongoose.Types.ObjectId;
  };
  description: string;
  resolutionNotes?: string;
  resolvedBy?: {
    name: string;
    role: string;
    userId?: mongoose.Types.ObjectId;
    resolvedAt: Date;
  };
  assignedTo?: string;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'booking_exception',
        'clinical_escalation',
        'hospital_issue',
        'payment_dispute',
        'patient_safety',
        'technical',
      ],
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'escalated', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    isEscalatedToSuperAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    reportedBy: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, trim: true },
      role: { type: String, trim: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    resolvedBy: {
      name: { type: String, trim: true },
      role: { type: String, trim: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      resolvedAt: { type: Date },
    },
    assignedTo: {
      type: String,
      trim: true,
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

SupportTicketSchema.index({ status: 1, priority: 1 });
SupportTicketSchema.index({ isEscalatedToSuperAdmin: 1, status: 1 });

export const SupportTicket: Model<ISupportTicket> =
  mongoose.models.SupportTicket || mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
