/**
 * VivoQuest Caregiver Mobile App - Type Definitions
 * Maps to backend FieldVisit, User, and PatientProfile schemas
 */

export type UserRole =
  | 'patient'
  | 'caregiver'
  | 'professional'
  | 'hospital'
  | 'supplier'
  | 'admin'
  | 'super_admin';

export interface CaregiverSession {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: UserRole;
  status: 'active' | 'pending_verification' | 'suspended';
  isPhoneVerified: boolean;
  registrationNumber?: string;
  professionType?: string;
}

export type FieldVisitStatus =
  | 'assigned'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface VisitVitals {
  bloodPressure?: string;
  pulse?: number;
  spO2?: number;
  temperature?: string;
  respiratoryRate?: number;
  bloodGlucose?: number;
  painScale?: number;
}

export interface ClinicalDocumentation {
  vitals?: VisitVitals;
  clinicalNotes?: string;
  proceduresPerformed?: string[];
  medicationsAdministered?: string[];
  recommendations?: string;
  followUpDate?: string;
  signedAt?: string | Date;
}

export interface PatientDetails {
  fullName: string;
  phone: string;
  address: string;
  city?: string;
  pincode?: string;
  cluster?: string;
  instructions?: string;
  emergencyContact?: string;
}

export interface FieldVisit {
  id: string;
  visitNumber: string;
  visitType: string;
  status: FieldVisitStatus;
  providerId?: string;
  providerName?: string;
  providerRole?: string;
  providerPhone?: string;
  patientId?: string;
  patientDetails: PatientDetails;
  scheduledDate: string;
  timeSlot: string;
  clinicalDocumentation?: ClinicalDocumentation;
  timestamps: {
    assignedAt?: string | Date;
    acceptedAt?: string | Date;
    enRouteAt?: string | Date;
    arrivedAt?: string | Date;
    startedAt?: string | Date;
    completedAt?: string | Date;
    cancelledAt?: string | Date;
  };
}

export interface AssignedPatient {
  patientId: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: {
    street?: string;
    city: string;
    state?: string;
    pincode: string;
    cluster: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  chronicConditions?: string[];
  assignmentType: 'subscription' | 'field_visit' | 'both';
  activeSubscription?: {
    subscriptionNumber: string;
    planTitle: string;
    status: string;
    visitsRemaining: number;
    totalVisitsIncluded: number;
    endDate: string | Date;
  } | null;
  latestVisit?: {
    visitNumber: string;
    status: string;
    scheduledDate: string;
    timeSlot: string;
    visitType: string;
  } | null;
  assignedVisitsCount: number;
}

export interface VitalsInput {
  systolicBP?: string;
  diastolicBP?: string;
  pulse?: string;
  spO2?: string;
  temperature?: string;
  respiratoryRate?: string;
  bloodGlucose?: string;
  painScale?: string;
}

export interface ClinicalDocInput {
  vitals?: {
    bloodPressure?: string;
    pulse?: number;
    spO2?: number;
    temperature?: string;
    respiratoryRate?: number;
    bloodGlucose?: number;
    painScale?: number;
  };
  clinicalNotes: string;
  proceduresPerformed?: string[];
  medicationsAdministered?: string[];
  recommendations?: string;
  followUpDate?: string;
  markAsCompleted?: boolean;
}
