import mongoose from 'mongoose';
import { User, IUser } from '../models/User.js';
import { PatientProfile, IPatientProfile } from '../models/PatientProfile.js';
import { CaregiverSubscription, ICaregiverSubscription, SubscriptionStatus } from '../models/CaregiverSubscription.js';
import { CaregiverPlan, ICaregiverPlan } from '../models/CaregiverPlan.js';
import { FieldVisit, IFieldVisit } from '../models/FieldVisit.js';
import { DailyHealthUpdate, IDailyHealthUpdate } from '../models/DailyHealthUpdate.js';
import { AuditLog } from '../models/AuditLog.js';
import { seedCaregiverPlansDemoData } from './caregiverPlanService.js';
import { HealthcareProfessionalProfile } from '../models/HealthcareProfessionalProfile.js';
import { UploadedFile } from '../models/UploadedFile.js';
import { VisitRescheduleRequest } from '../models/VisitRescheduleRequest.js';
import { AppError } from '../middleware/errorHandler.js';

// -----------------------------------------------------------------------------
// DTOs for Patient & Caregiver Safe API Projections
// -----------------------------------------------------------------------------

export interface PatientSubscriptionDTO {
  id: string;
  subscriptionNumber: string;
  planId: string;
  planTitle: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  assignedCaregiver: {
    id: string;
    name: string;
    phone: string;
  } | null;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignedCaregiverDetailsDTO {
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
    validThrough?: Date;
    scheduledDate?: string;
    timeSlot?: string;
  };
  specializations?: string[];
  yearsOfExperience?: number;
  bio?: string;
  rating?: number;
}

export interface RescheduleRequestSummaryDTO {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedDate: string;
  requestedTimeSlot: string;
  reason: string;
  rejectionReason?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface PatientVisitDTO {
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
  rescheduleRequest?: RescheduleRequestSummaryDTO;
  instructions?: string;
  recommendations?: string;
  followUpDate?: string;
  completedAt?: Date;
  cancelledAt?: Date;
}

export interface PatientVisitsScheduleDTO {
  upcoming: PatientVisitDTO[];
  past: PatientVisitDTO[];
  upcomingCount: number;
  pastCount: number;
  totalCount: number;
}

export interface PublicCaregiverPlanDTO {
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

export interface CareReportSummaryDTO {
  id: string;
  sourceType: 'field_visit' | 'daily_health_update';
  date: Date | string;
  providerOrSubmitterName: string;
  providerRoleOrRelation: string;
  status: string;
  vitals?: {
    bloodPressure?: string;
    pulseRate?: number;
    oxygenSaturation?: number;
    temperature?: string | number;
    bloodGlucose?: string | number;
    weight?: number;
    painScale?: number;
    respiratoryRate?: number;
  };
  clinicalNotes?: string;
  proceduresDone?: string[];
  medicationsAdministered?: string[];
  recommendations?: string;
  comfortLevel?: string;
}

export interface AssignedPatientSummaryDTO {
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
    status: SubscriptionStatus;
    visitsRemaining: number;
    totalVisitsIncluded: number;
    endDate: Date;
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

// -----------------------------------------------------------------------------
// 1. Patient Subscriptions (Strict Cross-Patient Isolation)
// -----------------------------------------------------------------------------

// Helper to generate standard Indian mobile phone variants for robust database querying
const getPhoneVariants = (phone?: string): string[] => {
  if (!phone) return [];
  const cleanDigits = phone.replace(/\D/g, '');
  const variants = new Set<string>([phone.trim(), cleanDigits]);
  if (cleanDigits.length === 10) {
    variants.add(`+91${cleanDigits}`);
    variants.add(`+91 ${cleanDigits}`);
    variants.add(`91${cleanDigits}`);
  } else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
    const tenDigits = cleanDigits.slice(2);
    variants.add(tenDigits);
    variants.add(`+${cleanDigits}`);
    variants.add(`+91 ${tenDigits}`);
  }
  return Array.from(variants);
};

/**
 * Retrieve subscriptions belonging strictly to the authenticated patient.
 * Strips internal caregiver payouts and platform commissions.
 */
export const getPatientSubscriptions = async (
  patientUserId: string,
  statusFilter?: string,
  patientPhone?: string
): Promise<PatientSubscriptionDTO[]> => {
  if (!mongoose.Types.ObjectId.isValid(patientUserId)) {
    throw new AppError('Invalid patient identifier', 400);
  }

  // Ensure demo plans are seeded if system is in initial state
  await seedCaregiverPlansDemoData();

  const patientObjId = new mongoose.Types.ObjectId(patientUserId);
  const orConditions: any[] = [{ patientId: patientObjId }];

  if (patientPhone) {
    const variants = getPhoneVariants(patientPhone);
    if (variants.length > 0) {
      orConditions.push({ patientPhone: { $in: variants } });
    }
  }

  const query: any = { $or: orConditions };
  if (statusFilter && statusFilter !== 'all') {
    query.status = statusFilter;
  }

  const subs = await CaregiverSubscription.find(query).sort({ createdAt: -1 }).lean();

  return subs.map((sub: any) => ({
    id: sub._id.toString(),
    subscriptionNumber: sub.subscriptionNumber,
    planId: sub.planId ? sub.planId.toString() : '',
    planTitle: sub.planTitle,
    status: sub.status,
    startDate: sub.startDate,
    endDate: sub.endDate,
    assignedCaregiver: sub.assignedCaregiverId
      ? {
          id: sub.assignedCaregiverId.toString(),
          name: sub.assignedCaregiverName || 'Assigned Caregiver',
          phone: sub.assignedCaregiverPhone || '',
        }
      : null,
    totalVisitsIncluded: sub.totalVisitsIncluded,
    visitsCompleted: sub.visitsCompleted,
    visitsRemaining: sub.visitsRemaining,
    pricing: {
      customerPrice: sub.pricing?.customerPrice ?? 0,
      paymentStatus: sub.pricing?.paymentStatus ?? 'pending',
      paymentMethod: sub.pricing?.paymentMethod,
    },
    emergencyContact: sub.emergencyContact,
    carePlanNotes: sub.carePlanNotes,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  }));
};

// -----------------------------------------------------------------------------
// 2. Public / Patient Available Caregiver Plans Catalog
// -----------------------------------------------------------------------------

/**
 * Retrieve active caregiver plans and fixed-visit packages.
 * Strictly conceals contractor payout margins and financial spreads.
 */
export const getPublicCaregiverPlans = async (filters: {
  category?: string;
  planType?: string;
}): Promise<PublicCaregiverPlanDTO[]> => {
  await seedCaregiverPlansDemoData();

  const query: any = { isActive: true };
  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }
  if (filters.planType && filters.planType !== 'all') {
    query.planType = filters.planType;
  }

  const plans = await CaregiverPlan.find(query).sort({ customerPrice: 1 }).lean();

  return plans.map((plan: any) => ({
    id: plan._id.toString(),
    planCode: plan.planCode,
    title: plan.title,
    planType: plan.planType,
    category: plan.category,
    durationDays: plan.durationDays,
    totalVisitsIncluded: plan.totalVisitsIncluded,
    hoursPerVisit: plan.hoursPerVisit,
    customerPrice: plan.customerPrice,
    description: plan.description,
    features: plan.features || [],
    isActive: plan.isActive,
    isPopular: Boolean(plan.isPopular),
  }));
};

// -----------------------------------------------------------------------------
// 3. Patient Care Reports & Bedside Vitals History
// -----------------------------------------------------------------------------

/**
 * Retrieve verified bedside clinical reports and health updates for the authenticated patient.
 */
export const getPatientCareReports = async (
  patientUserId: string,
  patientPhone?: string
): Promise<{
  count: number;
  reports: CareReportSummaryDTO[];
  fieldVisitsCount: number;
  dailyUpdatesCount: number;
}> => {
  if (!mongoose.Types.ObjectId.isValid(patientUserId)) {
    throw new AppError('Invalid patient identifier', 400);
  }

  const patientObjId = new mongoose.Types.ObjectId(patientUserId);

  // 1. Completed or in-progress clinical visits conducted for this patient
  const visitQueryOr: any[] = [{ patientId: patientObjId }];
  if (patientPhone) {
    const variants = getPhoneVariants(patientPhone);
    if (variants.length > 0) {
      visitQueryOr.push({ 'patientDetails.phone': { $in: variants } });
    }
  }

  const visits = await FieldVisit.find({
    $or: visitQueryOr,
    $and: [
      {
        $or: [
          { status: { $in: ['in_progress', 'completed'] } },
          { 'clinicalDocumentation.signedAt': { $exists: true } },
        ],
      },
      {
        'clinicalDocumentation.isDeleted': { $ne: true },
      },
    ],
  })
    .sort({ scheduledDate: -1, 'timestamps.completedAt': -1 })
    .lean();

  // 2. Patient & Caregiver reported health updates
  const updates = await DailyHealthUpdate.find({ patientId: patientObjId })
    .sort({ submittedAt: -1 })
    .lean();

  const formattedReports: CareReportSummaryDTO[] = [];

  // Transform field visits
  for (const v of visits as any[]) {
    const doc = v.clinicalDocumentation;
    formattedReports.push({
      id: v._id.toString(),
      sourceType: 'field_visit',
      date: v.timestamps?.completedAt || v.timestamps?.startedAt || v.scheduledDate,
      providerOrSubmitterName: v.providerName,
      providerRoleOrRelation: v.providerRole || 'Clinical Specialist',
      status: v.status,
      vitals: doc?.vitals
        ? {
            bloodPressure: doc.vitals.bloodPressure,
            pulseRate: doc.vitals.pulse,
            oxygenSaturation: doc.vitals.spO2,
            temperature: doc.vitals.temperature,
            respiratoryRate: doc.vitals.respiratoryRate,
          }
        : undefined,
      clinicalNotes: doc?.clinicalNotes,
      proceduresDone: doc?.proceduresPerformed || [],
      medicationsAdministered: doc?.medicationsAdministered || [],
      recommendations: doc?.recommendations,
      comfortLevel: v.status === 'completed' ? 'Clinically Assessed & Completed' : 'Under Assessment',
    });
  }

  // Transform daily health updates
  for (const u of updates as any[]) {
    formattedReports.push({
      id: u._id.toString(),
      sourceType: 'daily_health_update',
      date: u.submittedAt,
      providerOrSubmitterName: u.submittedBy?.name || 'Patient',
      providerRoleOrRelation: u.submittedBy?.relationship || 'patient',
      status: u.reviewStatus,
      vitals: u.vitals
        ? {
            bloodPressure: u.vitals.bloodPressure,
            pulseRate: u.vitals.pulse,
            oxygenSaturation: u.vitals.spO2,
            temperature: u.vitals.temperature,
            bloodGlucose: u.vitals.glucose,
            weight: u.vitals.weight,
            painScale: u.vitals.painScale,
          }
        : undefined,
      clinicalNotes: u.clinicianNotes || u.notes,
      comfortLevel: u.isClinicallyVerified ? 'Clinically Reviewed' : 'Patient Self-Reported',
    });
  }

  // Sort combined reports chronologically descending
  formattedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    count: formattedReports.length,
    reports: formattedReports,
    fieldVisitsCount: visits.length,
    dailyUpdatesCount: updates.length,
  };
};

// -----------------------------------------------------------------------------
// 4. Caregiver-Patient Assignment Verification (Rock-solid Security Guardrail)
// -----------------------------------------------------------------------------

/**
 * Determine whether a caregiver/provider is actively assigned to a patient.
 * Verifies active/paused CaregiverSubscription OR non-cancelled FieldVisit.
 */
export const verifyCaregiverPatientAssignment = async (
  caregiverUserId: string,
  patientUserId: string
): Promise<boolean> => {
  if (!mongoose.Types.ObjectId.isValid(caregiverUserId) || !mongoose.Types.ObjectId.isValid(patientUserId)) {
    return false;
  }

  const caregiverObjId = new mongoose.Types.ObjectId(caregiverUserId);
  const patientObjId = new mongoose.Types.ObjectId(patientUserId);

  // Check 1: Active, paused, or suspended CaregiverSubscription
  const activeSubExists = await CaregiverSubscription.exists({
    assignedCaregiverId: caregiverObjId,
    patientId: patientObjId,
    status: { $in: ['active', 'paused', 'suspended'] },
    isArchived: { $ne: true },
  });
  if (activeSubExists) {
    return true;
  }

  // Check 2: Assigned or active FieldVisit
  const activeVisitExists = await FieldVisit.exists({
    providerId: caregiverObjId,
    patientId: patientObjId,
    status: { $nin: ['cancelled', 'failed'] },
  });
  if (activeVisitExists) {
    return true;
  }

  return false;
};

// -----------------------------------------------------------------------------
// 5. Provider-Scoped Assigned Patients
// -----------------------------------------------------------------------------

/**
 * Retrieve unique patients currently assigned to the authenticated provider.
 * Supports both subscription-based assignments and visit-based dispatches.
 */
export const getCaregiverAssignedPatients = async (
  caregiverUserId: string,
  userRole: string,
  options?: { includeInactive?: boolean }
): Promise<{ count: number; patients: AssignedPatientSummaryDTO[] }> => {
  if (!mongoose.Types.ObjectId.isValid(caregiverUserId)) {
    throw new AppError('Invalid provider identifier', 400);
  }

  const caregiverObjId = new mongoose.Types.ObjectId(caregiverUserId);
  const isAdmin = ['admin', 'super_admin'].includes(userRole);

  // Subscriptions query
  const subQuery: any = isAdmin ? {} : { assignedCaregiverId: caregiverObjId };
  if (!options?.includeInactive) {
    subQuery.status = { $in: ['active', 'paused', 'suspended'] };
    subQuery.isArchived = { $ne: true };
  }

  // Field visits query
  const visitQuery: any = isAdmin ? {} : { providerId: caregiverObjId };
  if (!options?.includeInactive) {
    visitQuery.status = { $nin: ['cancelled', 'failed'] };
  }

  const [subscriptions, visits] = await Promise.all([
    CaregiverSubscription.find(subQuery).sort({ createdAt: -1 }).lean(),
    FieldVisit.find(visitQuery).sort({ scheduledDate: -1, createdAt: -1 }).lean(),
  ]);

  // Aggregate unique patient IDs
  const patientMap = new Map<
    string,
    {
      patientId: string;
      patientName: string;
      patientPhone: string;
      subscription?: any;
      visits: any[];
      hasSubscription: boolean;
      hasVisit: boolean;
    }
  >();

  // Ingest from subscriptions
  for (const s of subscriptions as any[]) {
    const pid = s.patientId?.toString();
    if (!pid) continue;

    if (!patientMap.has(pid)) {
      patientMap.set(pid, {
        patientId: pid,
        patientName: s.patientName,
        patientPhone: s.patientPhone,
        subscription: s,
        visits: [],
        hasSubscription: true,
        hasVisit: false,
      });
    } else {
      const entry = patientMap.get(pid)!;
      entry.hasSubscription = true;
      if (!entry.subscription || s.status === 'active') {
        entry.subscription = s;
      }
    }
  }

  // Ingest from field visits
  for (const v of visits as any[]) {
    const pid = v.patientId?.toString();
    if (!pid) continue;

    if (!patientMap.has(pid)) {
      patientMap.set(pid, {
        patientId: pid,
        patientName: v.patientDetails?.fullName || 'Assigned Patient',
        patientPhone: v.patientDetails?.phone || '',
        visits: [v],
        hasSubscription: false,
        hasVisit: true,
      });
    } else {
      const entry = patientMap.get(pid)!;
      entry.hasVisit = true;
      entry.visits.push(v);
    }
  }

  if (patientMap.size === 0) {
    return { count: 0, patients: [] };
  }

  // Fetch full User and PatientProfile details for the unique patients
  const patientIds = Array.from(patientMap.keys()).map((id) => new mongoose.Types.ObjectId(id));
  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: patientIds } }).lean(),
    PatientProfile.find({ userId: { $in: patientIds } }).lean(),
  ]);

  const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
  const profileMap = new Map(profiles.map((p: any) => [p.userId.toString(), p]));

  const assignedPatients: AssignedPatientSummaryDTO[] = [];

  for (const [pid, data] of patientMap.entries()) {
    const userDoc: any = userMap.get(pid);
    const profileDoc: any = profileMap.get(pid);

    const fullName = userDoc?.fullName || data.patientName;
    const phone = userDoc?.phone || data.patientPhone;
    const email = userDoc?.email;

    const assignmentType =
      data.hasSubscription && data.hasVisit
        ? 'both'
        : data.hasSubscription
        ? 'subscription'
        : 'field_visit';

    // Latest visit summary
    const latestV = data.visits[0];
    const latestVisit = latestV
      ? {
          visitNumber: latestV.visitNumber,
          status: latestV.status,
          scheduledDate: latestV.scheduledDate,
          timeSlot: latestV.timeSlot,
          visitType: latestV.visitType,
        }
      : null;

    // Active subscription summary
    const sub = data.subscription;
    const activeSubscription = sub
      ? {
          subscriptionNumber: sub.subscriptionNumber,
          planTitle: sub.planTitle,
          status: sub.status,
          visitsRemaining: sub.visitsRemaining,
          totalVisitsIncluded: sub.totalVisitsIncluded,
          endDate: sub.endDate,
        }
      : null;

    assignedPatients.push({
      patientId: pid,
      fullName,
      phone,
      email,
      address: profileDoc?.address
        ? {
            street: profileDoc.address.street,
            city: profileDoc.address.city,
            state: profileDoc.address.state,
            pincode: profileDoc.address.pincode,
            cluster: profileDoc.address.cluster,
          }
        : latestV?.patientDetails
        ? {
            city: latestV.patientDetails.city,
            pincode: latestV.patientDetails.pincode,
            cluster: latestV.patientDetails.cluster,
          }
        : undefined,
      emergencyContact: profileDoc?.emergencyContact
        ? {
            name: profileDoc.emergencyContact.name,
            phone: profileDoc.emergencyContact.phone,
            relation: profileDoc.emergencyContact.relationship,
          }
        : sub?.emergencyContact
        ? {
            name: sub.emergencyContact.name,
            phone: sub.emergencyContact.phone,
            relation: sub.emergencyContact.relation,
          }
        : undefined,
      chronicConditions: profileDoc?.chronicConditions || [],
      assignmentType,
      activeSubscription,
      latestVisit,
      assignedVisitsCount: data.visits.length,
    });
  }

  return {
    count: assignedPatients.length,
    patients: assignedPatients,
  };
};

// -----------------------------------------------------------------------------
// 6. Authorized Patient Details Access (Strict Role & Assignment RBAC)
// -----------------------------------------------------------------------------

/**
 * Retrieve patient profile and care overview with server-side authorization:
 * - Patient may access ONLY their own profile.
 * - Caregiver / Professional may access ONLY patients actively assigned to them.
 * - Admin / Super Admin may access any patient profile.
 * Conceals sensitive passwords, contractor payouts, and internal admin logs.
 */
export const getAuthorizedPatientDetails = async (
  patientId: string,
  requestingUser: { _id: mongoose.Types.ObjectId; role: string }
) => {
  if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
    throw new AppError('Invalid patient identifier', 400);
  }

  const patientObjId = new mongoose.Types.ObjectId(patientId);

  // 1. Enforce Server-Side Authorization
  if (requestingUser.role === 'patient') {
    if (requestingUser._id.toString() !== patientId) {
      throw new AppError('Forbidden: Patients are strictly authorized to view only their own records', 403);
    }
  } else if (['professional', 'caregiver'].includes(requestingUser.role)) {
    const isAssigned = await verifyCaregiverPatientAssignment(
      requestingUser._id.toString(),
      patientId
    );
    if (!isAssigned) {
      throw new AppError(
        'Forbidden: You are not authorized to view this patient. No active caregiver assignment exists.',
        403
      );
    }
  } else if (!['admin', 'super_admin'].includes(requestingUser.role)) {
    throw new AppError(`Forbidden: Access denied for role '${requestingUser.role}'`, 403);
  }

  // 2. Query Patient User Record
  const patientUser: any = await User.findById(patientObjId)
    .select('fullName email phone role status isPhoneVerified isEmailVerified lastLoginAt createdAt')
    .lean();

  if (!patientUser) {
    throw new AppError('Patient account not found', 404);
  }

  const phoneVariants = getPhoneVariants(patientUser.phone);

  // 3. Query All Subscriptions, Field Visits, Reports, and Profile in Parallel
  const subOr: any[] = [{ patientId: patientObjId }];
  if (phoneVariants.length > 0) {
    subOr.push({ patientPhone: { $in: phoneVariants } });
  }

  const visitOr: any[] = [{ patientId: patientObjId }];
  if (phoneVariants.length > 0) {
    visitOr.push({ 'patientDetails.phone': { $in: phoneVariants } });
  }

  const [patientProfile, rawSubscriptions, rawVisits, careReports] = await Promise.all([
    PatientProfile.findOne({ userId: patientObjId }).lean(),
    CaregiverSubscription.find({ $or: subOr }).sort({ createdAt: -1 }).lean(),
    FieldVisit.find({ $or: visitOr }).sort({ scheduledDate: -1, 'timestamps.assignedAt': -1 }).lean(),
    getPatientCareReports(patientId, patientUser.phone),
  ]);

  // 4. Map Subscriptions (Full overview for current and past)
  const mappedSubscriptions = rawSubscriptions.map((sub: any) => ({
    id: sub._id.toString(),
    subscriptionNumber: sub.subscriptionNumber,
    planId: sub.planId ? sub.planId.toString() : '',
    planTitle: sub.planTitle,
    status: sub.status,
    isArchived: Boolean(sub.isArchived),
    startDate: sub.startDate,
    endDate: sub.endDate,
    totalVisitsIncluded: sub.totalVisitsIncluded,
    visitsCompleted: sub.visitsCompleted,
    visitsRemaining: sub.visitsRemaining,
    assignedCaregiver: sub.assignedCaregiverId
      ? {
          id: sub.assignedCaregiverId.toString(),
          name: sub.assignedCaregiverName || 'Assigned Caregiver',
          phone: sub.assignedCaregiverPhone || '',
        }
      : null,
    pricing: {
      customerPrice: sub.pricing?.customerPrice ?? 0,
      paymentStatus: sub.pricing?.paymentStatus ?? 'pending',
      paymentMethod: sub.pricing?.paymentMethod || 'online',
      razorpayPaymentId: sub.pricing?.razorpayPaymentId,
    },
    emergencyContact: sub.emergencyContact,
    carePlanNotes: sub.carePlanNotes,
    suspendedAt: sub.suspendedAt,
    suspensionReason: sub.suspensionReason,
    cancelledAt: sub.cancelledAt,
    cancellationReason: sub.cancellationReason,
    archivedAt: sub.archivedAt,
    archiveReason: sub.archiveReason,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  }));

  const activeSubscription = mappedSubscriptions.find((s) => s.status === 'active' && !s.isArchived) || null;

  // 5. Categorize Visits (Upcoming and Previous)
  const todayStr = new Date().toISOString().slice(0, 10);
  const mappedVisits = rawVisits.map((v: any) => ({
    id: v._id.toString(),
    visitNumber: v.visitNumber,
    visitType: v.visitType,
    status: v.status,
    scheduledDate: v.scheduledDate,
    timeSlot: v.timeSlot,
    provider: v.providerId
      ? {
          id: v.providerId.toString(),
          name: v.providerName,
          role: v.providerRole || 'Clinical Specialist',
          phone: v.providerPhone || '',
        }
      : null,
    clinicalDocumentation: ['admin', 'super_admin', 'doctor', 'caregiver', 'nurse', 'patient'].includes(requestingUser.role) && !v.clinicalDocumentation?.isDeleted
      ? v.clinicalDocumentation
      : undefined,
    timestamps: v.timestamps,
  }));

  const upcomingVisits = mappedVisits
    .filter((v: any) =>
      ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(v.status) ||
      (v.status !== 'cancelled' && v.scheduledDate >= todayStr)
    )
    .sort((a: any, b: any) => a.scheduledDate.localeCompare(b.scheduledDate));

  const pastVisits = mappedVisits
    .filter((v: any) =>
      ['completed', 'cancelled', 'failed'].includes(v.status) || v.scheduledDate < todayStr
    )
    .sort((a: any, b: any) => b.scheduledDate.localeCompare(a.scheduledDate));

  // 6. Resolve Primary Assigned Caregiver (No personal details if unassigned)
  let assignedCaregiver: { id: string; name: string; role: string; phone: string } | null = null;
  if (activeSubscription?.assignedCaregiver) {
    assignedCaregiver = {
      id: activeSubscription.assignedCaregiver.id,
      name: activeSubscription.assignedCaregiver.name,
      role: 'Primary Bedside Caregiver',
      phone: activeSubscription.assignedCaregiver.phone,
    };
  } else {
    const assignedUpcoming = upcomingVisits.find((v: any) => v.provider);
    if (assignedUpcoming?.provider) {
      assignedCaregiver = {
        id: assignedUpcoming.provider.id,
        name: assignedUpcoming.provider.name,
        role: assignedUpcoming.provider.role,
        phone: assignedUpcoming.provider.phone,
      };
    }
  }

  // 7. Retrieve Recent Administrative Audit Logs
  const subNumbers = mappedSubscriptions.map((s) => s.subscriptionNumber).filter(Boolean);
  const auditOr: any[] = [
    { targetId: patientObjId.toString() },
    { 'details.patientId': patientObjId.toString() },
  ];
  if (subNumbers.length > 0) {
    auditOr.push({ targetId: { $in: subNumbers } });
    auditOr.push({ 'details.subscriptionNumber': { $in: subNumbers } });
  }

  const rawAuditLogs = await AuditLog.find({ $or: auditOr })
    .sort({ timestamp: -1, createdAt: -1 })
    .limit(10)
    .lean();

  const recentActivity = rawAuditLogs.map((log: any) => ({
    id: log._id.toString(),
    action: log.action,
    category: log.category,
    actorName: log.actorName,
    actorRole: log.actorRole,
    severity: log.severity,
    timestamp: log.timestamp || log.createdAt,
    details: log.details || {},
  }));

  // Add initial account registration activity if not already in audit log
  if (!recentActivity.some((a) => a.action === 'USER_REGISTERED' || a.action === 'PATIENT_ACCOUNT_REGISTERED')) {
    recentActivity.push({
      id: `act_${patientUser._id}_reg`,
      action: 'PATIENT_ACCOUNT_REGISTERED',
      category: 'user_management',
      actorName: patientUser.fullName,
      actorRole: 'patient',
      severity: 'info',
      timestamp: patientUser.createdAt,
      details: {
        registrationMethod: 'Mobile OTP Verification',
        phone: patientUser.phone,
      },
    });
  }

  return {
    patient: {
      id: patientUser._id.toString(),
      fullName: patientUser.fullName,
      phone: patientUser.phone,
      email: patientUser.email,
      role: patientUser.role,
      status: patientUser.status,
      isPhoneVerified: Boolean(patientUser.isPhoneVerified),
      isEmailVerified: Boolean(patientUser.isEmailVerified),
      memberSince: patientUser.createdAt,
      lastLoginAt: patientUser.lastLoginAt,
      profile: patientProfile
        ? {
            gender: (patientProfile as any).gender,
            bloodGroup: (patientProfile as any).bloodGroup,
            dateOfBirth: (patientProfile as any).dateOfBirth,
            address: (patientProfile as any).address,
            emergencyContact: (patientProfile as any).emergencyContact,
            chronicConditions: (patientProfile as any).chronicConditions || [],
            allergies: (patientProfile as any).allergies || [],
            primaryLanguage: (patientProfile as any).primaryLanguage,
          }
        : null,
    },
    subscriptions: mappedSubscriptions,
    activeSubscription,
    subscriptionsCount: mappedSubscriptions.length,
    assignedCaregiver,
    visits: {
      upcoming: upcomingVisits,
      past: pastVisits,
      totalCount: mappedVisits.length,
    },
    careReports: {
      reports: careReports.reports,
      totalCount: careReports.count,
      fieldVisitsCount: careReports.fieldVisitsCount,
      dailyUpdatesCount: careReports.dailyUpdatesCount,
      latestVitals: careReports.reports.find((r) => r.vitals)?.vitals || null,
    },
    recentReports: careReports.reports.slice(0, 5),
    totalReportsCount: careReports.count,
    recentActivity,
  };
};

// -----------------------------------------------------------------------------
// 7. Patient App Phase 1: Assigned Caregiver & Visit Schedule
// -----------------------------------------------------------------------------

export const formatVisitTypeName = (type: string): string => {
  switch (type) {
    case 'clinical_care':
      return 'Clinical Nursing Care';
    case 'nursing_procedure':
      return 'Nursing Procedure & Dressing';
    case 'physiotherapy':
      return 'Home Physiotherapy Session';
    case 'palliative_assessment':
      return 'Palliative Assessment & Vitals Review';
    case 'equipment_installation':
      return 'Medical Equipment Installation';
    default:
      return 'Home Health Visit';
  }
};

export const formatVisitStatusLabel = (status: string): string => {
  switch (status) {
    case 'assigned':
      return 'Caregiver Assigned';
    case 'accepted':
      return 'Visit Confirmed';
    case 'en_route':
      return 'Caregiver En Route';
    case 'arrived':
      return 'Caregiver Arrived';
    case 'in_progress':
      return 'Care in Progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'failed':
      return 'Incomplete / Exception';
    default:
      return status;
  }
};

/**
 * Retrieve current assigned caregiver details for an authenticated patient.
 * Resolves from active CaregiverSubscription or upcoming active FieldVisit.
 * Strictly scopes to authenticated patient.
 */
export const getPatientAssignedCaregiver = async (
  patientUserId: string,
  patientPhone?: string
): Promise<{ assignedCaregiver: AssignedCaregiverDetailsDTO | null; message?: string }> => {
  if (!mongoose.Types.ObjectId.isValid(patientUserId)) {
    throw new AppError('Invalid patient identifier', 400);
  }

  const patientObjId = new mongoose.Types.ObjectId(patientUserId);
  const phoneVariants = getPhoneVariants(patientPhone);

  // 1. Check for Active CaregiverSubscription with Assigned Caregiver
  const subOr: any[] = [{ patientId: patientObjId }];
  if (phoneVariants.length > 0) {
    subOr.push({ patientPhone: { $in: phoneVariants } });
  }

  const activeSub = await CaregiverSubscription.findOne({
    $or: subOr,
    status: { $in: ['active', 'paused'] },
    isArchived: { $ne: true },
    assignedCaregiverId: { $exists: true, $ne: null },
  })
    .sort({ createdAt: -1 })
    .lean();

  let caregiverId: mongoose.Types.ObjectId | null = null;
  let assignmentStatus: 'active' | 'assigned' = 'active';
  let assignmentSource: 'subscription' | 'field_visit' = 'subscription';
  let serviceInfo: AssignedCaregiverDetailsDTO['serviceInfo'] | undefined;
  let fallbackName = '';
  let fallbackPhone = '';
  let fallbackRole = '';

  if (activeSub && activeSub.assignedCaregiverId) {
    caregiverId = activeSub.assignedCaregiverId as mongoose.Types.ObjectId;
    fallbackName = activeSub.assignedCaregiverName || 'Assigned Caregiver';
    fallbackPhone = activeSub.assignedCaregiverPhone || '';
    fallbackRole = 'Primary Bedside Nurse';

    // Lookup plan to get hoursPerVisit if available
    let hoursPerVisit: number | undefined;
    if (activeSub.planId) {
      const planDoc = await CaregiverPlan.findById(activeSub.planId).lean();
      hoursPerVisit = planDoc?.hoursPerVisit;
    }

    serviceInfo = {
      planTitle: activeSub.planTitle,
      shiftInfo: hoursPerVisit ? `${hoursPerVisit} hours per visit` : 'Daily Home Visit',
      hoursPerVisit,
      visitsRemaining: activeSub.visitsRemaining,
      totalVisitsIncluded: activeSub.totalVisitsIncluded,
      validThrough: activeSub.endDate,
    };
  } else {
    // 2. Fallback: Check upcoming active FieldVisit
    const visitOr: any[] = [{ patientId: patientObjId }];
    if (phoneVariants.length > 0) {
      visitOr.push({ 'patientDetails.phone': { $in: phoneVariants } });
    }

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    const upcomingVisit = await FieldVisit.findOne({
      $or: visitOr,
      status: { $in: ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'] },
      scheduledDate: { $gte: todayStr },
      providerId: { $exists: true, $ne: null },
    })
      .sort({ scheduledDate: 1, timeSlot: 1 })
      .lean();

    if (upcomingVisit && upcomingVisit.providerId) {
      caregiverId = upcomingVisit.providerId as mongoose.Types.ObjectId;
      assignmentStatus = 'assigned';
      assignmentSource = 'field_visit';
      fallbackName = upcomingVisit.providerName || 'Assigned Clinician';
      fallbackPhone = upcomingVisit.providerPhone || '';
      fallbackRole = upcomingVisit.providerRole || 'Clinical Specialist';

      serviceInfo = {
        planTitle: formatVisitTypeName(upcomingVisit.visitType),
        shiftInfo: `Scheduled: ${upcomingVisit.timeSlot}`,
        scheduledDate: upcomingVisit.scheduledDate,
        timeSlot: upcomingVisit.timeSlot,
      };
    }
  }

  if (!caregiverId) {
    return {
      assignedCaregiver: null,
      message: 'No caregiver assigned yet.',
    };
  }

  // 3. Enrich Caregiver Data from User and HealthcareProfessionalProfile
  const [caregiverUser, profProfile] = await Promise.all([
    User.findById(caregiverId).select('fullName phone isPhoneVerified profilePictureFileId status').lean(),
    HealthcareProfessionalProfile.findOne({ userId: caregiverId }).lean(),
  ]);

  const fullName = caregiverUser?.fullName || fallbackName;
  const rawPhone = (caregiverUser?.phone || fallbackPhone || '').trim();
  const phone = rawPhone || undefined;
  const isPhoneVerified = Boolean(caregiverUser?.isPhoneVerified);

  // Role resolution
  let role = fallbackRole;
  let roleCategory: AssignedCaregiverDetailsDTO['roleCategory'] = 'caregiver';

  if (profProfile?.professionType) {
    const pt = profProfile.professionType;
    if (pt === 'nurse') {
      role = profProfile.title ? `${profProfile.title} (Registered Nurse)` : 'Registered Nurse';
      roleCategory = 'nurse';
    } else if (pt === 'caregiver') {
      role = 'Palliative Caregiver';
      roleCategory = 'caregiver';
    } else if (pt === 'chw') {
      role = 'Auxiliary Nurse Midwife (ANM)';
      roleCategory = 'anm';
    } else if (pt === 'physiotherapist') {
      role = 'Licensed Physiotherapist';
      roleCategory = 'physiotherapist';
    } else if (pt === 'physician') {
      role = 'Attending Palliative Physician';
      roleCategory = 'physician';
    } else {
      role = fallbackRole || 'Caregiver';
      roleCategory = 'other';
    }
  } else if (fallbackRole.toLowerCase().includes('nurse')) {
    roleCategory = 'nurse';
    role = fallbackRole;
  } else if (fallbackRole.toLowerCase().includes('anm')) {
    roleCategory = 'anm';
    role = fallbackRole;
  }

  // Profile image resolution (only if an existing supported image file is confirmed)
  let profilePhotoUrl: string | undefined;
  const imageFileId = caregiverUser?.profilePictureFileId || profProfile?.profileImageFileId;
  if (imageFileId) {
    const fileDoc = await UploadedFile.findById(imageFileId).lean();
    if (fileDoc && fileDoc.uploadStatus === 'confirmed') {
      profilePhotoUrl = `/api/v1/files/${fileDoc.fileId}`;
    }
  }

  return {
    assignedCaregiver: {
      id: caregiverId.toString(),
      name: fullName,
      role,
      roleCategory,
      phone,
      isPhoneVerified,
      profilePhotoUrl,
      assignmentStatus,
      assignmentSource,
      serviceInfo,
      specializations: profProfile?.specializations || [],
      yearsOfExperience: profProfile?.yearsOfExperience,
      bio: profProfile?.bio,
      rating: profProfile?.rating,
    },
  };
};

/**
 * Retrieve upcoming and past visit schedule for an authenticated patient.
 * Strictly separates upcoming active visits from completed/cancelled visits.
 * Sorts upcoming visits chronologically (ascending).
 * Never displays cancelled visits as upcoming active visits.
 */
export const getPatientVisitSchedule = async (
  patientUserId: string,
  patientPhone?: string
): Promise<PatientVisitsScheduleDTO> => {
  if (!mongoose.Types.ObjectId.isValid(patientUserId)) {
    throw new AppError('Invalid patient identifier', 400);
  }

  const patientObjId = new mongoose.Types.ObjectId(patientUserId);
  const phoneVariants = getPhoneVariants(patientPhone);

  const visitOr: any[] = [{ patientId: patientObjId }];
  if (phoneVariants.length > 0) {
    visitOr.push({ 'patientDetails.phone': { $in: phoneVariants } });
  }

  const rawVisits = await FieldVisit.find({ $or: visitOr })
    .sort({ scheduledDate: -1, 'timestamps.assignedAt': -1 })
    .lean();

  const visitIds = rawVisits.map((v: any) => v._id);
  const rescheduleRequests = await VisitRescheduleRequest.find({
    visitId: { $in: visitIds },
  })
    .sort({ createdAt: -1 })
    .lean();

  const requestsByVisitId = new Map<string, any>();
  for (const req of rescheduleRequests as any[]) {
    const vId = req.visitId.toString();
    if (!requestsByVisitId.has(vId)) {
      requestsByVisitId.set(vId, req);
    }
  }

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const mappedVisits: PatientVisitDTO[] = rawVisits.map((v: any) => {
    const providerPhone = (v.providerPhone || '').trim();
    const req = requestsByVisitId.get(v._id.toString());
    const rescheduleRequest: RescheduleRequestSummaryDTO | undefined = req
      ? {
          id: req._id.toString(),
          status: req.status,
          requestedDate: req.requestedSchedule.scheduledDate,
          requestedTimeSlot: req.requestedSchedule.timeSlot,
          reason: req.reason,
          rejectionReason: req.rejectionReason,
          createdAt: req.createdAt,
          resolvedAt: req.resolvedAt,
        }
      : undefined;

    return {
      id: v._id.toString(),
      visitNumber: v.visitNumber,
      scheduledDate: v.scheduledDate,
      timeSlot: v.timeSlot,
      visitType: v.visitType,
      serviceName: formatVisitTypeName(v.visitType),
      status: v.status,
      statusLabel: formatVisitStatusLabel(v.status),
      assignedCaregiver: v.providerId
        ? {
            id: v.providerId.toString(),
            name: v.providerName || 'Caregiver',
            role: v.providerRole || 'Clinical Specialist',
            phone: providerPhone || undefined,
          }
        : null,
      rescheduleRequest,
      instructions: v.patientDetails?.instructions || v.installationVerification?.installationNotes || undefined,
      recommendations: v.clinicalDocumentation?.recommendations || undefined,
      followUpDate: v.clinicalDocumentation?.followUpDate || undefined,
      completedAt: v.timestamps?.completedAt,
      cancelledAt: v.timestamps?.cancelledAt,
    };
  });

  // Upcoming visits: NOT cancelled, NOT completed, NOT failed, scheduled for today or future
  // Or if currently active on site (en_route, arrived, in_progress)
  const upcoming = mappedVisits
    .filter(
      (v) =>
        v.status !== 'cancelled' &&
        v.status !== 'completed' &&
        v.status !== 'failed' &&
        (v.scheduledDate >= todayStr || ['en_route', 'arrived', 'in_progress'].includes(v.status))
    )
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.timeSlot.localeCompare(b.timeSlot));

  // Past visits: completed, cancelled, failed, or historical past dates
  const past = mappedVisits
    .filter(
      (v) =>
        v.status === 'completed' ||
        v.status === 'cancelled' ||
        v.status === 'failed' ||
        (v.scheduledDate < todayStr && !['en_route', 'arrived', 'in_progress'].includes(v.status))
    )
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || b.timeSlot.localeCompare(a.timeSlot));

  return {
    upcoming,
    past,
    upcomingCount: upcoming.length,
    pastCount: past.length,
    totalCount: mappedVisits.length,
  };
};
