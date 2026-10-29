import mongoose, { Schema, Document, Model } from 'mongoose';

export type MaintenanceUrgency = 'low' | 'medium' | 'high' | 'critical';
export type MaintenanceStatus = 'reported' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface IMaintenancePart {
  partName: string;
  quantity: number;
  cost?: number;
}

export interface IMaintenanceHistoryItem {
  status: MaintenanceStatus;
  changedBy: string;
  changedAt: Date;
  notes?: string;
}

export interface IMaintenanceRequest extends Document {
  ticketNumber: string;
  productId: mongoose.Types.ObjectId;
  productSku: string;
  productTitle: string;
  orderId?: mongoose.Types.ObjectId;
  orderNumber?: string;
  patientId?: mongoose.Types.ObjectId;
  patientName?: string;
  patientPhone?: string;
  reportedIssue: string;
  urgency: MaintenanceUrgency;
  status: MaintenanceStatus;
  assignedStaffId?: mongoose.Types.ObjectId;
  assignedStaffName?: string;
  assignedRole?: string;
  scheduledDate?: Date;
  diagnosis?: string;
  actionTaken?: string;
  partsUsed?: IMaintenancePart[];
  resolutionNotes?: string;
  completedAt?: Date;
  statusHistory: IMaintenanceHistoryItem[];
  createdBy: {
    id: mongoose.Types.ObjectId;
    name: string;
    role: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MaintenancePartSchema = new Schema<IMaintenancePart>(
  {
    partName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    cost: { type: Number, min: 0 },
  },
  { _id: false }
);

const MaintenanceHistoryItemSchema = new Schema<IMaintenanceHistoryItem>(
  {
    status: { type: String, required: true },
    changedBy: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { _id: false }
);

const MaintenanceRequestSchema = new Schema<IMaintenanceRequest>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'MedicalProduct',
      required: true,
      index: true,
    },
    productSku: {
      type: String,
      required: true,
      trim: true,
    },
    productTitle: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductOrder',
      index: true,
    },
    orderNumber: {
      type: String,
      trim: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    patientName: {
      type: String,
      trim: true,
    },
    patientPhone: {
      type: String,
      trim: true,
    },
    reportedIssue: {
      type: String,
      required: true,
      trim: true,
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['reported', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'reported',
      index: true,
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedStaffName: {
      type: String,
      trim: true,
    },
    assignedRole: {
      type: String,
      trim: true,
    },
    scheduledDate: {
      type: Date,
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    actionTaken: {
      type: String,
      trim: true,
    },
    partsUsed: [MaintenancePartSchema],
    resolutionNotes: {
      type: String,
      trim: true,
    },
    completedAt: {
      type: Date,
    },
    statusHistory: [MaintenanceHistoryItemSchema],
    createdBy: {
      id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
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

export const MaintenanceRequest: Model<IMaintenanceRequest> =
  mongoose.models.MaintenanceRequest ||
  mongoose.model<IMaintenanceRequest>('MaintenanceRequest', MaintenanceRequestSchema);

