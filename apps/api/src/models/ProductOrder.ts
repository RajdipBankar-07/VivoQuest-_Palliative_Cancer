import mongoose, { Schema, Document, Model } from 'mongoose';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_dispatch'
  | 'dispatched'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'delivery_attempt_failed'
  | 'delivery_rescheduled'
  | 'returned_to_origin'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'cod' | 'refunded';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  title: string;
  category: string;
  quantity: number;
  unitPrice: number;
  regularPrice?: number;
  discountAmount?: number;
  isRental: boolean;
  rentalDurationMonths?: number;
  setupRequired: boolean;
  installationSelected?: boolean;
  installationCharge?: number;
  sourcingType?: 'own_stock' | 'supplier_direct';
  supplierId?: mongoose.Types.ObjectId;
  supplierName?: string;
  supplierStatus?: 'pending' | 'accepted' | 'rejected' | 'dispatched' | 'cancelled';
  carrierName?: string;
  trackingNumber?: string;
  supplierRejectionReason?: string;
  procurementCost?: number;
}

export interface ISupplierFulfillmentGroup {
  supplierId: mongoose.Types.ObjectId;
  supplierName?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'packed' | 'dispatched' | 'delivered';
  carrierName?: string;
  trackingNumber?: string;
  dispatchedAt?: Date;
  deliveredAt?: Date;
  rejectionReason?: string;
}

export interface ITrackingEvent {
  timestamp: Date;
  status: OrderStatus;
  message: string;
  location?: string;
  staffId?: mongoose.Types.ObjectId;
  staffName?: string;
  notes?: string;
  proofUrl?: string;
  failureReason?: string;
  recipientConfirmed?: boolean;
}

export interface IDeliveryEstimateUpdate {
  previousEstimate?: Date;
  newEstimate: Date;
  updatedBy: mongoose.Types.ObjectId;
  updatedByName: string;
  updatedByRole: string;
  reason: string;
  updatedAt: Date;
}

export interface IDeliveryOtpVerification {
  otpHash?: string;
  otpExpiresAt?: Date;
  attemptsCount: number;
  maxAttempts: number;
  lastRequestedAt?: Date;
  verifiedAt?: Date;
  verifiedByStaffId?: mongoose.Types.ObjectId;
  verifiedByStaffName?: string;
  verificationMethod?: 'otp' | 'manager_override';
  recipientName?: string;
  recipientRelationship?: string;
  deliveryCondition?: string;
  customerAcknowledgement?: boolean;
  overrideReason?: string;
  identityDocType?: string;
  identityDocLast4?: string;
  proofUrl?: string;
  notes?: string;
}

export interface IDeliveryExperienceRating {
  rating: number;
  punctualityRating?: number;
  communicationRating?: number;
  handlingRating?: number;
  feedback?: string;
  ratedAt: Date;
}

export interface IDeliveryRescheduleRequest {
  requestId: string;
  requestedDate: Date;
  timeSlot?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'alternative_proposed';
  requestedAt: Date;
  requestedByPatientId: mongoose.Types.ObjectId;
  reviewedByStaffId?: mongoose.Types.ObjectId;
  reviewedByStaffName?: string;
  reviewNotes?: string;
  alternativeOfferedDate?: Date;
  alternativeOfferedSlot?: string;
  resolvedAt?: Date;
}

export interface IReturnPickupDetails {
  scheduledDate?: Date;
  assignedStaffId?: mongoose.Types.ObjectId;
  assignedStaffName?: string;
  pickupStatus?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'attempt_failed';
  failureReason?: string;
  pickupProofUrl?: string;
  itemConditionChecklist?: Array<{ item: string; passed: boolean }>;
  customerHandoverConfirmed?: boolean;
  actualPickupAt?: Date;
}

export interface IReturnInspectionDetails {
  inspectedAt?: Date;
  inspectedBy?: string;
  result?: 'intact_healthy' | 'customer_damaged' | 'manufacturing_defect' | 'missing_accessories';
  notes?: string;
  photos?: string[];
}

export interface IReturnResolutionDetails {
  type?: 'replacement' | 'refund' | 'repair' | 'rejected_no_action';
  refundAmount?: number;
  notes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface IReturnSupplierCoordination {
  supplierId?: mongoose.Types.ObjectId;
  supplierName?: string;
  supplierReturnStatus?: 'pending' | 'accepted' | 'rejected' | 'collected';
  supplierNotes?: string;
}

export type ProviderCoordinationStatus =
  | 'uncontacted'
  | 'ready_for_provider'
  | 'provider_contacted'
  | 'provider_confirmed'
  | 'provider_rejected'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'rescheduled';

export type WhatsAppActionStatus =
  | 'not_sent'
  | 'prepared'
  | 'opened_in_whatsapp'
  | 'sent_confirmed'
  | 'provider_acknowledged';

export interface IDeliveryProviderCoordination {
  providerId?: mongoose.Types.ObjectId;
  providerName: string;
  deliveryPersonName?: string;
  contactPhone: string;
  email?: string;
  serviceArea?: string;
  deliveryInstructions?: string;
  coordinationStatus: ProviderCoordinationStatus;
  lastContactedAt?: Date;
  confirmedAt?: Date;
  rejectionReason?: string;
  whatsappCoordination?: {
    status: WhatsAppActionStatus;
    lastPreparedAt?: Date;
    lastOpenedAt?: Date;
    confirmedSentAt?: Date;
    acknowledgedAt?: Date;
    waMessagePreview?: string;
    waDirectUrl?: string;
    recordedByUserId?: mongoose.Types.ObjectId;
    recordedByUserName?: string;
  };
  notes?: string;
}

export interface IProductOrder extends Document {
  orderNumber: string;
  invoiceNumber?: string;
  invoiceGeneratedAt?: Date;
  patientId: mongoose.Types.ObjectId;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  hospitalReferralId?: mongoose.Types.ObjectId;
  items: IOrderItem[];
  supplierFulfillments?: ISupplierFulfillmentGroup[];
  pricing: {
    subtotal: number;
    discountTotal?: number;
    deliveryFee: number;
    taxGst: number;
    installationCharge?: number;
    totalAmount: number;
    procurementCostTotal?: number;
    refundAmount?: number;
    gatewayFee?: number;
  };
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    contactPhone?: string;
    landmark?: string;
  };
  deliveryPreferences?: {
    preferredDate?: Date;
    preferredSlot?: string;
    accessInstructions?: string;
  };
  clinicalSetup: {
    isSetupRequired: boolean;
    assignedSpecialistId?: mongoose.Types.ObjectId;
    assignedSpecialistName?: string;
    setupStatus: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'rescheduled' | 'failed' | 'not_required';
    setupDate?: Date;
    timeSlot?: string;
    setupNotes?: string;
    checklistResults?: Array<{ item: string; checked: boolean }>;
    supportingDocUrl?: string;
    costBreakdown?: {
      labourCost?: number;
      transportCost?: number;
      partsCost?: number;
      otherApprovedCharges?: number;
      actualTotalCost?: number;
    };
    customerConfirmationConfirmed?: boolean;
    completedAt?: Date;
    completedByTechnicianName?: string;
  };
  deliveryAssignment?: {
    assignedStaffId?: mongoose.Types.ObjectId;
    assignedStaffName?: string;
    assignedAt?: Date;
    scheduledDeliveryDate?: Date;
    deliveryNotes?: string;
    proofOfDeliveryUrl?: string;
    actualDeliveredAt?: Date;
    failureReason?: string;
    otpVerification?: IDeliveryOtpVerification;
    provider?: IDeliveryProviderCoordination;
  };
  providerCoordination?: IDeliveryProviderCoordination;
  deliveryRating?: IDeliveryExperienceRating;
  rescheduleRequests?: IDeliveryRescheduleRequest[];
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'online' | 'cod' | 'insurance_claim';
  paymentDetails?: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paidAt?: Date;
    failureReason?: string;
    isTestMode?: boolean;
  };
  cancellation?: {
    isCancelled: boolean;
    cancelledAt?: Date;
    cancelledBy?: string;
    cancellationReason?: string;
    refundStatus?: 'none' | 'pending' | 'processed';
  };
  returnDetails?: {
    isReturnRequested: boolean;
    returnNumber?: string;
    returnStatus?:
      | 'none'
      | 'requested'
      | 'under_review'
      | 'approved'
      | 'rejected'
      | 'pickup_scheduled'
      | 'pickup_in_progress'
      | 'received_for_inspection'
      | 'resolution_pending'
      | 'resolved'
      | 'closed';
    returnReason?: string;
    evidencePhotos?: string[];
    rejectionReason?: string;
    requestedAt?: Date;
    reviewedBy?: string;
    reviewedAt?: Date;
    pickup?: IReturnPickupDetails;
    inspection?: IReturnInspectionDetails;
    resolution?: IReturnResolutionDetails;
    supplierCoordination?: IReturnSupplierCoordination;
  };
  installationPreferences?: {
    preferredDate?: Date;
    preferredSlot?: string;
    accessInstructions?: string;
  };
  idempotencyKey?: string;
  isStockDeducted?: boolean;
  stockDeductedAt?: Date;
  trackingUpdates: ITrackingEvent[];
  estimatedDeliveryDate?: Date;
  estimatedDeliveryDays?: string;
  deliveryEstimateHistory?: IDeliveryEstimateUpdate[];
  isDemo: boolean;
  isArchived?: boolean;
  archivedAt?: Date;
  archivedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'MedicalProduct', required: true },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    regularPrice: { type: Number, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    isRental: { type: Boolean, default: false },
    rentalDurationMonths: { type: Number, min: 1 },
    setupRequired: { type: Boolean, default: false },
    installationSelected: { type: Boolean, default: false },
    installationCharge: { type: Number, default: 0, min: 0 },
    sourcingType: { type: String, enum: ['own_stock', 'supplier_direct', 'own', 'supplier'], default: 'own_stock' },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName: { type: String },
    supplierStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'dispatched', 'cancelled'],
      default: 'pending',
    },
    carrierName: { type: String },
    trackingNumber: { type: String },
    supplierRejectionReason: { type: String },
    procurementCost: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const SupplierFulfillmentGroupSchema = new Schema<ISupplierFulfillmentGroup>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'packed', 'dispatched', 'delivered'],
      default: 'pending',
    },
    carrierName: { type: String },
    trackingNumber: { type: String },
    dispatchedAt: { type: Date },
    deliveredAt: { type: Date },
    rejectionReason: { type: String },
  },
  { _id: false }
);

const TrackingEventSchema = new Schema<ITrackingEvent>(
  {
    timestamp: { type: Date, default: Date.now },
    status: { type: String, required: true },
    message: { type: String, required: true },
    location: { type: String },
    staffId: { type: Schema.Types.ObjectId, ref: 'User' },
    staffName: { type: String },
    notes: { type: String },
    proofUrl: { type: String },
    failureReason: { type: String },
    recipientConfirmed: { type: Boolean },
  },
  { _id: false }
);

const DeliveryProviderCoordinationSchema = new Schema<IDeliveryProviderCoordination>(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'DeliveryProvider' },
    providerName: { type: String, required: true, trim: true },
    deliveryPersonName: { type: String, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    serviceArea: { type: String, trim: true },
    deliveryInstructions: { type: String, trim: true },
    coordinationStatus: {
      type: String,
      enum: [
        'uncontacted',
        'ready_for_provider',
        'provider_contacted',
        'provider_confirmed',
        'provider_rejected',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed',
        'rescheduled',
      ],
      default: 'ready_for_provider',
    },
    lastContactedAt: { type: Date },
    confirmedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    whatsappCoordination: {
      status: {
        type: String,
        enum: ['not_sent', 'prepared', 'opened_in_whatsapp', 'sent_confirmed', 'provider_acknowledged'],
        default: 'not_sent',
      },
      lastPreparedAt: { type: Date },
      lastOpenedAt: { type: Date },
      confirmedSentAt: { type: Date },
      acknowledgedAt: { type: Date },
      waMessagePreview: { type: String },
      waDirectUrl: { type: String },
      recordedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
      recordedByUserName: { type: String },
    },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const ProductOrderSchema = new Schema<IProductOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      sparse: true,
      index: true,
    },
    invoiceGeneratedAt: {
      type: Date,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    patientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    patientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    hospitalReferralId: {
      type: Schema.Types.ObjectId,
      ref: 'HospitalReferral',
      index: true,
    },
    items: [OrderItemSchema],
    supplierFulfillments: [SupplierFulfillmentGroupSchema],
    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      discountTotal: { type: Number, default: 0, min: 0 },
      deliveryFee: { type: Number, required: true, default: 0 },
      taxGst: { type: Number, required: true, default: 0 },
      installationCharge: { type: Number, default: 0, min: 0 },
      totalAmount: { type: Number, required: true, min: 0 },
      procurementCostTotal: { type: Number, default: 0, min: 0 },
      refundAmount: { type: Number, default: 0, min: 0 },
      gatewayFee: { type: Number, default: 0, min: 0 },
    },
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true, default: 'Maharashtra' },
      pincode: { type: String, required: true },
      contactPhone: { type: String },
      landmark: { type: String },
    },
    deliveryPreferences: {
      preferredDate: { type: Date },
      preferredSlot: { type: String },
      accessInstructions: { type: String },
    },
    clinicalSetup: {
      isSetupRequired: { type: Boolean, default: false },
      assignedSpecialistId: { type: Schema.Types.ObjectId, ref: 'User' },
      assignedSpecialistName: { type: String },
      setupStatus: {
        type: String,
        enum: ['pending', 'scheduled', 'in_progress', 'completed', 'rescheduled', 'failed', 'not_required'],
        default: 'not_required',
      },
      setupDate: { type: Date },
      timeSlot: { type: String },
      setupNotes: { type: String },
      checklistResults: [
        {
          item: { type: String, required: true },
          checked: { type: Boolean, default: false },
        },
      ],
      supportingDocUrl: { type: String },
      costBreakdown: {
        labourCost: { type: Number, default: 0, min: 0 },
        transportCost: { type: Number, default: 0, min: 0 },
        partsCost: { type: Number, default: 0, min: 0 },
        otherApprovedCharges: { type: Number, default: 0, min: 0 },
        actualTotalCost: { type: Number, default: 0, min: 0 },
      },
      customerConfirmationConfirmed: { type: Boolean, default: false },
      completedAt: { type: Date },
      completedByTechnicianName: { type: String },
    },
    deliveryAssignment: {
      assignedStaffId: { type: Schema.Types.ObjectId, ref: 'User' },
      assignedStaffName: { type: String },
      assignedAt: { type: Date },
      scheduledDeliveryDate: { type: Date },
      deliveryNotes: { type: String },
      proofOfDeliveryUrl: { type: String },
      actualDeliveredAt: { type: Date },
      failureReason: { type: String },
      otpVerification: {
        otpHash: { type: String },
        otpExpiresAt: { type: Date },
        attemptsCount: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 5 },
        lastRequestedAt: { type: Date },
        verifiedAt: { type: Date },
        verifiedByStaffId: { type: Schema.Types.ObjectId, ref: 'User' },
        verifiedByStaffName: { type: String },
        verificationMethod: { type: String, enum: ['otp', 'manager_override'] },
        recipientName: { type: String },
        recipientRelationship: { type: String },
        deliveryCondition: { type: String },
        customerAcknowledgement: { type: Boolean, default: false },
        overrideReason: { type: String },
        identityDocType: { type: String },
        identityDocLast4: { type: String },
        proofUrl: { type: String },
        notes: { type: String },
      },
      provider: DeliveryProviderCoordinationSchema,
    },
    providerCoordination: DeliveryProviderCoordinationSchema,
    deliveryRating: {
      rating: { type: Number, min: 1, max: 5 },
      punctualityRating: { type: Number, min: 1, max: 5 },
      communicationRating: { type: Number, min: 1, max: 5 },
      handlingRating: { type: Number, min: 1, max: 5 },
      feedback: { type: String },
      ratedAt: { type: Date },
    },
    rescheduleRequests: [
      {
        requestId: { type: String, required: true },
        requestedDate: { type: Date, required: true },
        timeSlot: { type: String },
        reason: { type: String, required: true },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected', 'alternative_proposed'],
          default: 'pending',
        },
        requestedAt: { type: Date, default: Date.now },
        requestedByPatientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reviewedByStaffId: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewedByStaffName: { type: String },
        reviewNotes: { type: String },
        alternativeOfferedDate: { type: Date },
        alternativeOfferedSlot: { type: String },
        resolvedAt: { type: Date },
      },
    ],
    orderStatus: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'preparing',
        'ready_for_dispatch',
        'dispatched',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'completed',
        'delivery_attempt_failed',
        'delivery_rescheduled',
        'returned_to_origin',
        'cancelled',
      ],
      default: 'placed',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cod', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'cod', 'insurance_claim'],
      default: 'cod',
    },
    paymentDetails: {
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
      paidAt: { type: Date },
      failureReason: { type: String },
      isTestMode: { type: Boolean, default: false },
    },
    cancellation: {
      isCancelled: { type: Boolean, default: false },
      cancelledAt: { type: Date },
      cancelledBy: { type: String },
      cancellationReason: { type: String },
      refundStatus: { type: String, enum: ['none', 'pending', 'processed'], default: 'none' },
    },
    returnDetails: {
      isReturnRequested: { type: Boolean, default: false },
      returnNumber: { type: String, sparse: true },
      returnStatus: {
        type: String,
        enum: [
          'none',
          'requested',
          'under_review',
          'approved',
          'rejected',
          'pickup_scheduled',
          'pickup_in_progress',
          'received_for_inspection',
          'resolution_pending',
          'resolved',
          'closed',
        ],
        default: 'none',
      },
      returnReason: { type: String },
      evidencePhotos: [{ type: String }],
      rejectionReason: { type: String },
      requestedAt: { type: Date },
      reviewedBy: { type: String },
      reviewedAt: { type: Date },
      pickup: {
        scheduledDate: { type: Date },
        assignedStaffId: { type: Schema.Types.ObjectId, ref: 'User' },
        assignedStaffName: { type: String },
        pickupStatus: {
          type: String,
          enum: ['pending', 'assigned', 'in_progress', 'completed', 'attempt_failed'],
          default: 'pending',
        },
        failureReason: { type: String },
        pickupProofUrl: { type: String },
        itemConditionChecklist: [
          {
            item: { type: String, required: true },
            passed: { type: Boolean, default: false },
          },
        ],
        customerHandoverConfirmed: { type: Boolean, default: false },
        actualPickupAt: { type: Date },
      },
      inspection: {
        inspectedAt: { type: Date },
        inspectedBy: { type: String },
        result: {
          type: String,
          enum: ['intact_healthy', 'customer_damaged', 'manufacturing_defect', 'missing_accessories'],
        },
        notes: { type: String },
        photos: [{ type: String }],
      },
      resolution: {
        type: {
          type: String,
          enum: ['replacement', 'refund', 'repair', 'rejected_no_action'],
        },
        refundAmount: { type: Number, min: 0 },
        notes: { type: String },
        resolvedAt: { type: Date },
        resolvedBy: { type: String },
      },
      supplierCoordination: {
        supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
        supplierName: { type: String },
        supplierReturnStatus: {
          type: String,
          enum: ['pending', 'accepted', 'rejected', 'collected'],
          default: 'pending',
        },
        supplierNotes: { type: String },
      },
    },
    installationPreferences: {
      preferredDate: { type: Date },
      preferredSlot: { type: String },
      accessInstructions: { type: String },
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
    isStockDeducted: {
      type: Boolean,
      default: false,
    },
    stockDeductedAt: {
      type: Date,
    },
    trackingUpdates: [TrackingEventSchema],
    estimatedDeliveryDate: {
      type: Date,
      index: true,
    },
    estimatedDeliveryDays: {
      type: String,
      default: '2-4 business days',
    },
    deliveryEstimateHistory: [
      {
        previousEstimate: { type: Date },
        newEstimate: { type: Date, required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        updatedByName: { type: String, required: true },
        updatedByRole: { type: String, required: true },
        reason: { type: String, required: true, trim: true },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    isDemo: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: { type: Date },
    archivedBy: { type: String },
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

export const ProductOrder: Model<IProductOrder> =
  mongoose.models.ProductOrder ||
  mongoose.model<IProductOrder>('ProductOrder', ProductOrderSchema);
