export interface UserSession {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
}

export interface CaregiverInfo {
  id: string;
  name: string;
  phone: string;
  role?: string;
}

export interface PatientSubscription {
  id: string;
  subscriptionNumber: string;
  planId: string;
  planTitle: string;
  planCode?: string;
  planType?: string;
  category?: string;
  durationDays?: number;
  hoursPerVisit?: number;
  features?: string[];
  planDescription?: string;
  plan?: SubscriptionPlan;
  status: 'active' | 'paused' | 'suspended' | 'completed' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  assignedCaregiver: CaregiverInfo | null;
  totalVisitsIncluded: number;
  visitsCompleted: number;
  visitsRemaining: number;
  pricing: {
    customerPrice: number;
    paymentStatus: string;
    paymentMethod?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  carePlanNotes?: string;
  createdAt: string;
}

export interface ClinicalVitals {
  bloodPressure?: string;
  pulseRate?: number;
  oxygenSaturation?: number;
  temperature?: string | number;
  bloodGlucose?: string | number;
  weight?: number;
  painScale?: number;
  respiratoryRate?: number;
}

export interface DailyCareReport {
  id: string;
  sourceType: 'field_visit' | 'daily_health_update';
  date: string;
  providerOrSubmitterName: string;
  providerRoleOrRelation: string;
  status: string;
  vitals?: ClinicalVitals;
  clinicalNotes?: string;
  proceduresDone: string[];
  medicationsAdministered?: string[];
  recommendations?: string;
  comfortLevel?: string;
}

export interface SubscriptionPlan {
  id: string;
  planCode: string;
  title: string;
  planType: string;
  category: string;
  durationDays: number;
  totalVisitsIncluded: number;
  hoursPerVisit: number;
  customerPrice: number;
  description: string;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
}

export interface AssignedCaregiverDetails {
  id: string;
  name: string;
  role: string;
  roleCategory: 'nurse' | 'anm' | 'caregiver' | 'physician' | 'physiotherapist' | 'other';
  phone?: string;
  isPhoneVerified: boolean;
  profilePhotoUrl?: string;
  assignmentStatus: 'active' | 'assigned';
  assignmentSource: 'subscription' | 'field_visit';
  serviceInfo?: {
    planTitle?: string;
    shiftInfo?: string;
    hoursPerVisit?: number;
    visitsRemaining?: number;
    totalVisitsIncluded?: number;
    validThrough?: string;
    scheduledDate?: string;
    timeSlot?: string;
  };
  specializations?: string[];
  yearsOfExperience?: number;
  highestQualification?: string;
  institution?: string;
  verificationStatus?: string;
  skills?: string[];
  verifiedCredentials?: Array<{
    title: string;
    issuingAuthority: string;
    category?: string;
  }>;
  bio?: string;
  rating?: number;
}

export type RescheduleRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface RescheduleRequestSummary {
  id: string;
  status: RescheduleRequestStatus;
  requestedDate: string;
  requestedTimeSlot: string;
  reason: string;
  rejectionReason?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface PatientVisit {
  id: string;
  visitNumber: string;
  scheduledDate: string; // YYYY-MM-DD
  timeSlot: string;
  visitType: string;
  serviceName: string;
  status: string;
  assignmentStatus?: string;
  replacementRequired?: boolean;
  statusLabel: string;
  assignedCaregiver: {
    id?: string;
    name: string;
    role: string;
    phone?: string;
  } | null;
  rescheduleRequest?: RescheduleRequestSummary;
  instructions?: string;
  recommendations?: string;
  followUpDate?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface PatientVisitsSchedule {
  upcoming: PatientVisit[];
  past: PatientVisit[];
  upcomingCount: number;
  pastCount: number;
  totalCount: number;
}

export interface VisitRescheduleRequest {
  id: string;
  visitId: string;
  visitNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  providerId: string;
  providerName: string;
  providerRole?: string;
  providerPhone?: string;
  requestedBy: string;
  requesterRole: string;
  requesterName: string;
  originalSchedule: {
    scheduledDate: string;
    timeSlot: string;
  };
  requestedSchedule: {
    scheduledDate: string;
    timeSlot: string;
  };
  reason: string;
  status: RescheduleRequestStatus;
  rejectionReason?: string;
  resolvedBy?: string;
  resolverRole?: string;
  resolverName?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Medical Equipment & Healthcare E-Commerce Types
// =============================================================================

export interface MedicalProductImage {
  url: string;
  altText?: string;
  isPrimary?: boolean;
}

export interface MedicalProductMobile {
  id: string;
  sku: string;
  title: string;
  category: string;
  badge?: string;
  description: string;
  price: number;
  regularPrice?: number;
  sellingPrice?: number;
  discountPercentage?: number;
  stockQuantity: number;
  sourcingType: 'own_stock' | 'supplier_direct' | 'own' | 'supplier';
  supplierName?: string;
  images: string[];
  imageGallery?: MedicalProductImage[];
  specifications?: Record<string, string>;
  installationEligible?: boolean;
  installationServiceCharge?: number;
  installationDescription?: string;
  estimatedDeliveryDays?: string;
  averageRating?: number;
  reviewCount?: number;
  isActive?: boolean;
}

export interface CartItemMobile {
  productId: string;
  product: MedicalProductMobile;
  quantity: number;
  installationSelected: boolean;
}

export interface CartPricingMobile {
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  installationCharge: number;
  taxGst: number;
  totalAmount: number;
}

export interface CartValidationResultMobile {
  items: Array<{
    productId: string;
    title: string;
    unitPrice: number;
    quantity: number;
    itemSubtotal: number;
    inStock: boolean;
    stockAvailable: number;
    installationEligible: boolean;
    installationSelected: boolean;
    installationServiceCharge: number;
    sourcingType?: string;
  }>;
  pricing: CartPricingMobile;
  canCheckout: boolean;
  issues: string[];
}

export type OrderStatusMobile =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'dispatched'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentStatusMobile = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItemMobile {
  id?: string;
  _id?: string;
  productId: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
  regularPrice?: number;
  discountAmount?: number;
  totalPrice: number;
  installationSelected?: boolean;
  installationServiceCharge?: number;
  images?: string[];
  product?: {
    images?: string[];
    [key: string]: any;
  };
  category?: string;
  isRental?: boolean;
  rentalDurationMonths?: number;
}

export interface OrderTrackingUpdateMobile {
  id?: string;
  _id?: string;
  timestamp: string;
  status: string;
  message: string;
  location?: string;
}

export interface DeliveryEstimateHistoryMobile {
  id?: string;
  _id?: string;
  updatedAt: string;
  previousDate?: string;
  newDate: string;
  updatedByRole: string;
  reason: string;
}

export interface ProductOrderMobile {
  id: string;
  _id?: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  items: OrderItemMobile[];
  pricing: CartPricingMobile;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    contactPhone?: string;
  };
  paymentMethod: string;
  paymentStatus: PaymentStatusMobile;
  orderStatus: OrderStatusMobile;
  estimatedDeliveryDate?: string;
  estimatedDeliveryDays?: string;
  deliveryEstimateHistory?: DeliveryEstimateHistoryMobile[];
  trackingUpdates: OrderTrackingUpdateMobile[];
  installation?: {
    requested: boolean;
    status: 'none' | 'pending_scheduling' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    scheduledDate?: string;
    timeSlot?: string;
    technicianName?: string;
    technicianPhone?: string;
    notes?: string;
  };
  paymentDetails?: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    paidAt?: string;
    isTestMode?: boolean;
  };
  invoiceNumber?: string;
  createdAt: string;
}


