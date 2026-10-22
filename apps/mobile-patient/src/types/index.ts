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
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'expired';
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
