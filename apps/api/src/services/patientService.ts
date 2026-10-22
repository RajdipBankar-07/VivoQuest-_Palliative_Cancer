import mongoose from 'mongoose';
import { User, IUser } from '../models/User.js';
import { PatientProfile, IPatientProfile } from '../models/PatientProfile.js';
import { CaregiverSubscription, ICaregiverSubscription, SubscriptionStatus } from '../models/CaregiverSubscription.js';
import { CaregiverPlan, ICaregiverPlan } from '../models/CaregiverPlan.js';
import { FieldVisit, IFieldVisit } from '../models/FieldVisit.js';
import { DailyHealthUpdate, IDailyHealthUpdate } from '../models/DailyHealthUpdate.js';
import { seedCaregiverPlansDemoData } from './caregiverPlanService.js';
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

/**
 * Retrieve subscriptions belonging strictly to the authenticated patient.
 * Strips internal caregiver payouts and platform commissions.
 */
export const getPatientSubscriptions = async (
  patientUserId: string,
  statusFilter?: string
): Promise<PatientSubscriptionDTO[]> => {
  if (!mongoose.Types.ObjectId.isValid(patientUserId)) {
    throw new AppError('Invalid patient identifier', 400);
  }

  // Ensure demo plans are seeded if system is in initial state
  await seedCaregiverPlansDemoData();

  const query: any = { patientId: new mongoose.Types.ObjectId(patientUserId) };
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
    visitQueryOr.push({ 'patientDetails.phone': patientPhone });
  }

  const visits = await FieldVisit.find({
    $or: visitQueryOr,
    status: { $in: ['in_progress', 'completed'] },
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

  // Check 1: Active or paused CaregiverSubscription
  const activeSubExists = await CaregiverSubscription.exists({
    assignedCaregiverId: caregiverObjId,
    patientId: patientObjId,
    status: { $in: ['active', 'paused'] },
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
    subQuery.status = { $in: ['active', 'paused'] };
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
  if (!mongoose.Types.ObjectId.isValid(patientId)) {
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

  // 2. Query Patient Data
  const [patientUser, patientProfile, subscriptions, careReports] = await Promise.all([
    User.findById(patientObjId).select('fullName email phone role status createdAt').lean(),
    PatientProfile.findOne({ userId: patientObjId }).lean(),
    getPatientSubscriptions(patientId),
    getPatientCareReports(patientId),
  ]);

  if (!patientUser) {
    throw new AppError('Patient account not found', 404);
  }

  return {
    patient: {
      id: patientUser._id.toString(),
      fullName: (patientUser as any).fullName,
      phone: (patientUser as any).phone,
      email: (patientUser as any).email,
      status: (patientUser as any).status,
      memberSince: (patientUser as any).createdAt,
      profile: patientProfile
        ? {
            gender: (patientProfile as any).gender,
            bloodGroup: (patientProfile as any).bloodGroup,
            address: (patientProfile as any).address,
            emergencyContact: (patientProfile as any).emergencyContact,
            chronicConditions: (patientProfile as any).chronicConditions || [],
            allergies: (patientProfile as any).allergies || [],
            primaryLanguage: (patientProfile as any).primaryLanguage,
          }
        : null,
    },
    activeSubscription: subscriptions.find((s) => s.status === 'active') || null,
    subscriptionsCount: subscriptions.length,
    recentReports: careReports.reports.slice(0, 5),
    totalReportsCount: careReports.count,
  };
};
