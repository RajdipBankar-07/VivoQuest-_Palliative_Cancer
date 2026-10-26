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

