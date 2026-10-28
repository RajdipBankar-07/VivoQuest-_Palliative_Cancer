import mongoose from 'mongoose';
import {
  FieldVisit,
  IFieldVisit,
  FieldVisitStatus,
  FieldVisitType,
  VisitExceptionType,
  IVisitVitals,
  IEquipmentVerificationItem,
} from '../models/FieldVisit.js';
import { User, IUser } from '../models/User.js';
import { HospitalReferral, IHospitalReferral } from '../models/HospitalReferral.js';
import { ProductOrder, IProductOrder } from '../models/ProductOrder.js';
import { AuditLog } from '../models/AuditLog.js';
import { CaregiverSubscription } from '../models/CaregiverSubscription.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { Appointment } from '../models/Appointment.js';
import { SyncOperation, ISyncOperation, SyncOperationType, SyncOperationStatus } from '../models/SyncOperation.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { sendPatientNotification } from './notificationService.js';
import { HealthcareProfessionalProfile } from '../models/HealthcareProfessionalProfile.js';
import { DoctorAvailability } from '../models/DoctorAvailability.js';
import { logAdminAction } from './adminService.js';
import { AppError } from '../middleware/errorHandler.js';
import { getPhoneVariants } from './patientService.js';

// -----------------------------------------------------------------------------
// Helper: Permitted Status Transitions State Machine
// -----------------------------------------------------------------------------
const PERMITTED_VISIT_TRANSITIONS: Record<FieldVisitStatus, FieldVisitStatus[]> = {
  assigned: ['accepted', 'rejected', 'cancelled', 'missed'],
  accepted: ['en_route', 'arrived', 'in_progress', 'cancelled', 'rejected', 'missed'],
  rejected: ['assigned', 'cancelled'],
  en_route: ['arrived', 'in_progress', 'cancelled', 'failed', 'missed'],
  arrived: ['in_progress', 'cancelled', 'failed', 'missed'],
  in_progress: ['completed', 'failed', 'cancelled', 'missed'],
  missed: ['assigned', 'cancelled'],
  failed: ['assigned', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const isValidVisitStatusTransition = (
  current: FieldVisitStatus,
  next: FieldVisitStatus
): boolean => {
  if (current === next) return true;
  const allowed = PERMITTED_VISIT_TRANSITIONS[current] || [];
  return allowed.includes(next);
};

// -----------------------------------------------------------------------------
// 1. Seed Demo Field Visits If Empty
// -----------------------------------------------------------------------------
export const seedDemoFieldVisitsIfEmpty = async () => {
  try {
    const count = await FieldVisit.countDocuments();
    if (count > 0) return;

    // Look up demo professionals
    const doctors = await User.find({ role: 'professional' }).limit(5);
    const hospitals = await User.find({ role: 'hospital' }).limit(2);
    const patients = await User.find({ role: 'patient' }).limit(3);

    const userDocA = await User.findOne({ phone: '9820011001' });
    const userNurseB = await User.findOne({ phone: { $in: ['9822441122', '9820011004'] } });
    const userPhysioC = await User.findOne({ phone: '9820011003' });
    const userTechD = await User.findOne({ phone: '9822119988' });

    const docA = userDocA || doctors[0] || {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Dr. Aditi Rao',
      phone: '9820011001',
    };
    const nurseB = userNurseB || doctors[1] || {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Sister Varsha Kulkarni, RN',
      phone: '9822441122',
    };
    const physioC = userPhysioC || doctors[2] || {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Priya Deshmukh, PT',
      phone: '9820011003',
    };
    const techD = userTechD || doctors[3] || {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Rohan Shinde (Bio-Engineer)',
      phone: '9822119988',
    };

    const hospA = hospitals[0] || {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Ruby Hall Clinic',
    };
    const patA = patients[0] || {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Mrs. Sunita Deshpande',
      phone: '9822154321',
    };

    // Find any existing referral and product order for cross-linking
    const existingRef = await HospitalReferral.findOne();
    const existingOrder = await ProductOrder.findOne();

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const demoVisits: Partial<IFieldVisit>[] = [
      // 1. Nursing Care & Stoma Inspection (Today, in-progress)
      {
        visitNumber: 'VQ-VST-202610-001',
        visitType: 'nursing_procedure',
        status: 'in_progress',
        providerId: (nurseB as any)._id,
        providerName: nurseB.fullName || 'Sister Varsha Kulkarni, RN',
        providerRole: 'Palliative Care Nurse',
        providerPhone: nurseB.phone || '9822441122',
        patientId: (patA as any)._id,
        patientDetails: {
          fullName: 'Mrs. Sunita Deshpande',
          phone: '9822154321',
          address: 'Flat 402, Shivajinagar Heights, FC Road',
          city: 'Pune',
          pincode: '411005',
          cluster: 'Pune Central',
          instructions: 'Call security intercom 402; elevator operational.',
          emergencyContact: 'Mr. Arvind Deshpande (Son) - 9822154329',
        },
        scheduledDate: todayStr,
        timeSlot: '09:30 - 11:00',
        timestamps: {
          assignedAt: new Date(Date.now() - 3600000 * 4),
          acceptedAt: new Date(Date.now() - 3600000 * 3),
          enRouteAt: new Date(Date.now() - 3600000 * 2),
          arrivedAt: new Date(Date.now() - 3600000 * 1),
          startedAt: new Date(Date.now() - 3600000 * 0.8),
        },
        hospitalReferralId: existingRef ? (existingRef._id as any) : undefined,
        hospitalId: (hospA as any)._id,
        hospitalName: hospA.fullName || 'Ruby Hall Clinic',
        clinicalDocumentation: {
          vitals: {
            bloodPressure: '124/82 mmHg',
            pulse: 78,
            spO2: 98,
            temperature: '98.4 F',
            respiratoryRate: 16,
          },
          clinicalNotes: 'Stoma site clean and well perfused. No signs of peristomal excoriation. Dressing replaced with hydrocolloid barrier.',
          proceduresPerformed: ['Stoma appliance change', 'Vitals examination', 'Surgical drain output charted (45ml serous)'],
          medicationsAdministered: ['Topical barrier film'],
          recommendations: 'Continue low-residue diet. Hydration target: 1.8L daily.',
          followUpDate: tomorrowStr,
        },
        statusHistory: [
          { status: 'assigned', changedByName: 'Operations Dispatch', timestamp: new Date(Date.now() - 3600000 * 4) },
          { status: 'accepted', changedByName: nurseB.fullName, timestamp: new Date(Date.now() - 3600000 * 3) },
          { status: 'en_route', changedByName: nurseB.fullName, timestamp: new Date(Date.now() - 3600000 * 2) },
          { status: 'arrived', changedByName: nurseB.fullName, timestamp: new Date(Date.now() - 3600000 * 1) },
          { status: 'in_progress', changedByName: nurseB.fullName, timestamp: new Date(Date.now() - 3600000 * 0.8) },
        ],
        isDemo: true,
      },

      // 2. Medical Equipment Installation & Functional Verification (Today, assigned)
      {
        visitNumber: 'VQ-VST-202610-002',
        visitType: 'equipment_installation',
        status: 'assigned',
        providerId: (techD as any)._id,
        providerName: techD.fullName || 'Rohan Shinde (Bio-Engineer)',
        providerRole: 'Biomedical Field Specialist',
        providerPhone: techD.phone || '9822119988',
        patientDetails: {
          fullName: 'Mr. Ramesh Kulkarni',
          phone: '9822098765',
          address: 'B-12, Mayur Colony, Kothrud',
          city: 'Pune',
          pincode: '411038',
          cluster: 'Pune West',
          instructions: 'Ground floor bungalow. Electrical point available near bedside.',
          emergencyContact: 'Mrs. Neha Kulkarni (Daughter) - 9822098766',
        },
        scheduledDate: todayStr,
        timeSlot: '14:00 - 15:30',
        timestamps: {
          assignedAt: new Date(Date.now() - 3600000 * 5),
        },
        productOrderId: existingOrder ? (existingOrder._id as any) : undefined,
        orderNumber: existingOrder ? existingOrder.orderNumber : 'ORD-202610-9041',
        installationVerification: {
          isEquipmentInstallation: true,
          equipmentItems: [
            {
              sku: 'RESP-BIPAP-AUTO-ST',
              name: 'ResMed Lumis 150 VPAP ST with HumidAir',
              serialNumber: 'SN-BIPAP-2026-8812',
              condition: 'functional_tested',
              checklistPassed: false,
            },
            {
              sku: 'BED-ELEC-5FUNC-ICU',
              name: '5-Function Motorized Hospital Bed',
              serialNumber: 'SN-BED-MOTOR-7721',
              condition: 'new',
              checklistPassed: false,
            },
          ],
          barcodeScanVerified: false,
          patientAcknowledged: false,
          consentObtained: false,
          installationNotes: 'Awaiting on-site delivery arrival and bedside installation.',
        },
        statusHistory: [
          { status: 'assigned', changedByName: 'Central Logistics Dispatch', timestamp: new Date(Date.now() - 3600000 * 5) },
        ],
        isDemo: true,
      },

      // 3. Physiotherapy & Mobility Rehabilitation (Yesterday, completed)
      {
        visitNumber: 'VQ-VST-202610-003',
        visitType: 'physiotherapy',
        status: 'completed',
        providerId: (physioC as any)._id,
        providerName: physioC.fullName || 'Priya Deshmukh, PT',
        providerRole: 'Neuro & Palliative Physiotherapist',
        providerPhone: physioC.phone || '9820011003',
        patientDetails: {
          fullName: 'Mr. Dinkar Patil',
          phone: '9822077665',
          address: 'Rowhouse 4, Kalyani Nagar',
          city: 'Pune',
          pincode: '411006',
          cluster: 'Pune East',
          instructions: 'Patient recovering from hip hemiarthroplasty.',
        },
        scheduledDate: yesterdayStr,
        timeSlot: '11:00 - 12:00',
        timestamps: {
          assignedAt: new Date(Date.now() - 86400000 - 3600000 * 4),
          acceptedAt: new Date(Date.now() - 86400000 - 3600000 * 3),
          enRouteAt: new Date(Date.now() - 86400000 - 3600000 * 2),
          arrivedAt: new Date(Date.now() - 86400000 - 3600000 * 1.5),
          startedAt: new Date(Date.now() - 86400000 - 3600000 * 1.3),
          completedAt: new Date(Date.now() - 86400000 - 3600000 * 0.3),
        },
        hospitalReferralId: existingRef ? (existingRef._id as any) : undefined,
        hospitalId: (hospA as any)._id,
        hospitalName: hospA.fullName || 'Ruby Hall Clinic',
        clinicalDocumentation: {
          vitals: {
            bloodPressure: '128/84 mmHg',
            pulse: 82,
            spO2: 97,
            temperature: '98.2 F',
            respiratoryRate: 18,
          },
          clinicalNotes: 'Isometric quadriceps sets, active-assisted heel slides, and supervised walker ambulation for 25 meters. No gait hesitation or dizziness.',
          proceduresPerformed: ['Bedside gait training', 'Range of motion assessment', 'Pain score documentation: 3/10'],
          recommendations: 'Daily walker ambulation with caregiver stand-by. Continue ankle pumps hourly.',
          followUpDate: tomorrowStr,
          signedAt: new Date(Date.now() - 86400000 - 3600000 * 0.3),
        },
        closedLoop: {
          isLinkedToReferral: true,
          summarySubmittedAt: new Date(Date.now() - 86400000),
        },
        statusHistory: [
          { status: 'assigned', changedByName: 'Auto Scheduler', timestamp: new Date(Date.now() - 86400000 - 3600000 * 4) },
          { status: 'accepted', changedByName: physioC.fullName, timestamp: new Date(Date.now() - 86400000 - 3600000 * 3) },
          { status: 'completed', changedByName: physioC.fullName, timestamp: new Date(Date.now() - 86400000 - 3600000 * 0.3) },
        ],
        isDemo: true,
      },

      // 4. Oncologist Home Consult (Tomorrow, accepted)
      {
        visitNumber: 'VQ-VST-202610-004',
        visitType: 'clinical_care',
        status: 'accepted',
        providerId: (docA as any)._id,
        providerName: docA.fullName || 'Dr. Aditi Rao',
        providerRole: 'Consultant Medical Oncologist',
        providerPhone: docA.phone || '9820011001',
        patientDetails: {
          fullName: 'Mrs. Sunita Deshpande',
          phone: '9822154321',
          address: 'Flat 402, Shivajinagar Heights, FC Road',
          city: 'Pune',
          pincode: '411005',
          cluster: 'Pune Central',
        },
        scheduledDate: tomorrowStr,
        timeSlot: '16:00 - 17:00',
        timestamps: {
          assignedAt: new Date(Date.now() - 3600000 * 12),
          acceptedAt: new Date(Date.now() - 3600000 * 6),
        },
        hospitalReferralId: existingRef ? (existingRef._id as any) : undefined,
        hospitalId: (hospA as any)._id,
        hospitalName: hospA.fullName || 'Ruby Hall Clinic',
        statusHistory: [
          { status: 'assigned', changedByName: 'Clinical Desk', timestamp: new Date(Date.now() - 3600000 * 12) },
          { status: 'accepted', changedByName: docA.fullName, timestamp: new Date(Date.now() - 3600000 * 6) },
        ],
        isDemo: true,
      },
    ];

    await FieldVisit.insertMany(demoVisits);
    console.log('[Seed] Demonstration Field Visits seeded successfully.');
  } catch (err: any) {
    console.warn('[Seed] Field visits seeding notice:', err.message);
  }
};

// -----------------------------------------------------------------------------
// 2. Provider Visits Listing & Authorization
// -----------------------------------------------------------------------------
export const listProviderFieldVisits = async (
  providerUserId: string,
  userRole: string,
  filters: {
    status?: string;
    date?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
) => {
  await seedDemoFieldVisitsIfEmpty();

  const query: any = {};

  // Provider isolation: non-admin can ONLY view visits assigned to them
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    const userDoc = await User.findById(providerUserId).lean();
    const phoneVariants = getPhoneVariants(userDoc?.phone);
    const providerOr: any[] = [{ providerId: new mongoose.Types.ObjectId(providerUserId) }];
    if (phoneVariants.length > 0) {
      providerOr.push({ providerPhone: { $in: phoneVariants } });
    }
    query.$or = providerOr;
    query.hiddenFromCaregiver = { $ne: true };
    // Non-admin caregivers cannot view visits they have rejected in their active queues
    query.status = { $ne: 'rejected' };
  } else if (filters.search && mongoose.Types.ObjectId.isValid(filters.search)) {
    query.providerId = new mongoose.Types.ObjectId(filters.search);
  }

  if (filters.status && filters.status !== 'all') {
    if (userRole !== 'admin' && userRole !== 'super_admin' && filters.status === 'rejected') {
      query.status = '__none__';
    } else {
      query.status = filters.status;
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (filters.date === 'today') {
    query.scheduledDate = todayStr;
  } else if (filters.date === 'upcoming') {
    query.scheduledDate = { $gte: todayStr };
    query.status = { $nin: ['completed', 'cancelled', 'rejected'] };
  } else if (filters.date === 'completed') {
    query.status = 'completed';
  } else if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
    query.scheduledDate = filters.date;
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 100));
  const skip = (page - 1) * limit;

  const [total, visits] = await Promise.all([
    FieldVisit.countDocuments(query),
    FieldVisit.find(query).sort({ scheduledDate: -1, timeSlot: -1 }).skip(skip).limit(limit),
  ]);

  // Enrich with canonical PatientProfile address where available
  const patientIds = Array.from(new Set(visits.map(v => v.patientId?.toString()).filter(Boolean))).map(id => new mongoose.Types.ObjectId(id!));
  if (patientIds.length > 0) {
    const profiles = await PatientProfile.find({ userId: { $in: patientIds } }).lean();
    const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));
    for (const v of visits) {
      if (v.patientId) {
        const prof: any = profileMap.get(v.patientId.toString());
        if (prof?.address) {
          if (!v.patientDetails.street && prof.address.street) v.patientDetails.street = prof.address.street;
          if (!v.patientDetails.state && prof.address.state) v.patientDetails.state = prof.address.state;
          const canonicalParts = [
            prof.address.street,
            prof.address.cluster,
            prof.address.city,
            prof.address.state,
            prof.address.pincode ? `PIN: ${prof.address.pincode}` : '',
          ].filter(Boolean);
          if (canonicalParts.length > 0 && (v.patientDetails.address === 'Patient Residence, Pune' || !v.patientDetails.address)) {
            v.patientDetails.address = canonicalParts.join(', ');
          }
        }
      }
    }
  }

  return {
    visits,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getFieldVisitById = async (
  visitId: string,
  user: { _id: mongoose.Types.ObjectId; role: string; phone?: string }
): Promise<IFieldVisit> => {
  const visit = await FieldVisit.findById(visitId);
  if (!visit) {
    throw new AppError(`Field visit '${visitId}' not found`, 404);
  }

  // Strict tenant / ownership isolation
  const userDoc = await User.findById(user._id).lean();
  const phoneVariants = getPhoneVariants(user.phone || (userDoc as any)?.phone);
  const isAssignedProvider =
    (visit.providerId && visit.providerId.toString() === user._id.toString()) ||
    (visit.providerPhone && phoneVariants.includes(visit.providerPhone));
  const isAdmin = ['admin', 'super_admin'].includes(user.role);
  const isLinkedHospital = visit.hospitalId && visit.hospitalId.toString() === user._id.toString();
  const isPatient =
    (visit.patientId && visit.patientId.toString() === user._id.toString()) ||
    (visit.patientDetails?.phone && phoneVariants.includes(visit.patientDetails.phone));

  if (!isAssignedProvider && !isAdmin && !isLinkedHospital && !isPatient) {
    throw new AppError('Forbidden: You do not have authorization to view this field visit', 403);
  }

  // Prevent rejected caregiver from continuing to see sensitive patient details through active-assignment APIs
  if (isAssignedProvider && (visit.status === 'rejected' || visit.assignmentStatus === 'rejected') && !isAdmin) {
    throw new AppError('Forbidden: This visit assignment was rejected. Patient details are no longer accessible.', 403);
  }

  // Canonical address enrichment
  if (visit.patientId) {
    const prof: any = await PatientProfile.findOne({ userId: visit.patientId }).lean();
    if (prof?.address) {
      if (!visit.patientDetails.street && prof.address.street) visit.patientDetails.street = prof.address.street;
      if (!visit.patientDetails.state && prof.address.state) visit.patientDetails.state = prof.address.state;
      const canonicalParts = [
        prof.address.street,
        prof.address.cluster,
        prof.address.city,
        prof.address.state,
        prof.address.pincode ? `PIN: ${prof.address.pincode}` : '',
      ].filter(Boolean);
      if (canonicalParts.length > 0 && (visit.patientDetails.address === 'Patient Residence, Pune' || !visit.patientDetails.address)) {
        visit.patientDetails.address = canonicalParts.join(', ');
      }
    }
  }

  return visit;
};

// -----------------------------------------------------------------------------
// 3. Provider Visit Status Progression (State Machine Validated)
// -----------------------------------------------------------------------------
export const updateFieldVisitStatus = async (
  visitId: string,
  newStatus: FieldVisitStatus,
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string; phone?: string },
  options?: { notes?: string; location?: string }
): Promise<IFieldVisit> => {
  // 1. Role Authorization Check: Patients cannot update field visit status
  if (user.role === 'patient') {
    throw new AppError('Forbidden: Patients cannot update field visit status', 403);
  }

  const visit = await getFieldVisitById(visitId, user);

  // 2. Caregiver Ownership Check
  const userDoc = await User.findById(user._id).lean();
  const phoneVariants = getPhoneVariants(user.phone || (userDoc as any)?.phone);
  const isAssignedProvider =
    (visit.providerId && visit.providerId.toString() === user._id.toString()) ||
    (visit.providerPhone && phoneVariants.includes(visit.providerPhone));
  const isAdmin = ['admin', 'super_admin'].includes(user.role);

  if (!isAssignedProvider && !isAdmin) {
    throw new AppError('Forbidden: Only the assigned caregiver or an administrator can update this visit status', 403);
  }

  // 3. Prevent rejected caregiver from performing transitions
  if ((visit.status === 'rejected' || visit.assignmentStatus === 'rejected') && !isAdmin) {
    throw new AppError('Forbidden: This visit assignment was rejected and cannot be modified by the caregiver', 403);
  }

  // 4. Idempotency Check: Return existing visit if status is already matching
  if (visit.status === newStatus) {
    return visit;
  }

  // 5. Terminal State Protection
  if (['completed', 'cancelled'].includes(visit.status)) {
    throw new AppError(`Cannot update visit: Status '${visit.status}' is a terminal state and cannot be modified`, 400);
  }

  // 6. Validate state-machine transition
  if (!isValidVisitStatusTransition(visit.status, newStatus)) {
    throw new AppError(
      `Invalid field visit status transition from '${visit.status}' to '${newStatus}'. Permitted: [${(
        PERMITTED_VISIT_TRANSITIONS[visit.status] || []
      ).join(', ')}]`,
      400
    );
  }

  // 7. Caregiver Acceptance Requirement before Starting or Completing Care
  if ((newStatus === 'in_progress' || newStatus === 'completed') && visit.assignmentStatus !== 'accepted') {
    throw new AppError('Cannot start or complete visit: Caregiver assignment must be accepted before starting care', 400);
  }

  const previousStatus = visit.status;
  const now = new Date();
  visit.status = newStatus;

  // Record specific operational timestamps
  if (newStatus === 'accepted') {
    visit.timestamps.acceptedAt = now;
    visit.assignmentStatus = 'accepted';
  } else if (newStatus === 'rejected') {
    visit.timestamps.rejectedAt = now;
    visit.assignmentStatus = 'rejected';
  } else if (newStatus === 'en_route') {
    visit.timestamps.enRouteAt = now;
  } else if (newStatus === 'arrived') {
    visit.timestamps.arrivedAt = now;
  } else if (newStatus === 'in_progress') {
    visit.timestamps.startedAt = now;
  } else if (newStatus === 'completed') {
    visit.timestamps.completedAt = now;
  } else if (newStatus === 'cancelled') {
    visit.timestamps.cancelledAt = now;
  } else if (newStatus === 'missed') {
    visit.timestamps.missedAt = now;
  }

  visit.statusHistory.push({
    status: newStatus,
    changedBy: user._id,
    changedByRole: user.role,
    changedByName: user.fullName,
    timestamp: now,
    notes: options?.notes || `Visit status transitioned to ${newStatus}`,
  });

  await visit.save();

  // Audit Log
  await AuditLog.create({
    action: `FIELD_VISIT_STATUS_${newStatus.toUpperCase()}`,
    category: 'field_operations',
    actorId: user._id,
    actorName: user.fullName,
    actorRole: user.role,
    targetType: 'FieldVisit',
    targetId: visit._id.toString(),
    details: {
      visitNumber: visit.visitNumber,
      previousStatus,
      newStatus,
      notes: options?.notes,
    },
    severity: newStatus === 'cancelled' || newStatus === 'failed' || newStatus === 'missed' ? 'warning' : 'info',
    timestamp: now,
  });

  // Trigger Notifications for milestone status updates
  if (visit.patientDetails?.phone) {
    try {
      if (newStatus === 'en_route') {
        await sendPatientNotification({
          recipientPhone: visit.patientDetails.phone,
          recipientName: visit.patientDetails.fullName,
          channel: 'sms',
          templateId: 'CLINICIAN_EN_ROUTE',
          templateParams: {
            patientName: visit.patientDetails.fullName,
            providerName: visit.providerName,
          },
          idempotencyKey: `notif_${visit._id}_en_route_sms`,
          metadata: { visitId: visit._id.toString(), visitNumber: visit.visitNumber },
        });
      } else if (newStatus === 'arrived') {
        await sendPatientNotification({
          recipientPhone: visit.patientDetails.phone,
          recipientName: visit.patientDetails.fullName,
          channel: 'sms',
          templateId: 'CLINICIAN_ARRIVED',
          templateParams: {
            patientName: visit.patientDetails.fullName,
            providerName: visit.providerName,
          },
          idempotencyKey: `notif_${visit._id}_arrived_sms`,
          metadata: { visitId: visit._id.toString(), visitNumber: visit.visitNumber },
        });
      } else if (newStatus === 'in_progress') {
        await sendPatientNotification({
          recipientPhone: visit.patientDetails.phone,
          recipientName: visit.patientDetails.fullName,
          channel: 'sms',
          templateId: 'VISIT_STARTED',
          templateParams: {
            patientName: visit.patientDetails.fullName,
            providerName: visit.providerName,
          },
          idempotencyKey: `notif_${visit._id}_started_sms`,
          metadata: { visitId: visit._id.toString(), visitNumber: visit.visitNumber },
        });
      } else if (newStatus === 'completed') {
        await sendPatientNotification({
          recipientPhone: visit.patientDetails.phone,
          recipientName: visit.patientDetails.fullName,
          channel: 'sms',
          templateId: 'VISIT_COMPLETED',
          templateParams: {
            patientName: visit.patientDetails.fullName,
            providerName: visit.providerName,
          },
          idempotencyKey: `notif_${visit._id}_completed_sms`,
          metadata: { visitId: visit._id.toString(), visitNumber: visit.visitNumber },
        });
      } else if (newStatus === 'cancelled') {
        await sendPatientNotification({
          recipientPhone: visit.patientDetails.phone,
          recipientName: visit.patientDetails.fullName,
          channel: 'sms',
          templateId: 'VISIT_CANCELLED',
          templateParams: {
            patientName: visit.patientDetails.fullName,
            date: visit.scheduledDate,
            reason: options?.notes || 'Operational reschedule or cancellation',
          },
          idempotencyKey: `notif_${visit._id}_cancelled_sms`,
          metadata: { visitId: visit._id.toString(), visitNumber: visit.visitNumber },
        });

        if (visit.providerPhone && isAdmin) {
          await sendPatientNotification({
            recipientPhone: visit.providerPhone,
            recipientName: visit.providerName,
            recipientRole: 'caregiver',
            channel: 'sms',
            templateId: 'VISIT_CANCELLED',
            templateParams: {
              patientName: visit.patientDetails.fullName,
              date: visit.scheduledDate,
              reason: options?.notes || 'Cancelled by administrative operations',
            },
            idempotencyKey: `notif_caregiver_${visit._id}_cancelled_sms`,
            metadata: { visitId: visit._id.toString(), visitNumber: visit.visitNumber },
          });
        }
      }
    } catch (notifErr: any) {
      console.warn('[updateFieldVisitStatus] Notification dispatch warning:', notifErr.message);
    }
  }

  return visit;
};

/**
 * Phase 3: Caregiver/Nurse Assignment Acceptance
 * Allows the assigned caregiver to accept a pending visit assignment.
 * - Enforces role authorization (patients cannot accept; only assigned caregiver or admin).
 * - Enforces active caregiver status.
 * - Enforces eligibility (cannot accept cancelled, completed, failed, or already rejected visits).
 * - Detects schedule conflicts with caregiver's other active visits.
 * - Idempotent: repeated acceptances return current accepted visit without duplication.
 * - Records decision timestamp, updates status to 'accepted', logs audit and dispatches notifications.
 */
export const acceptFieldVisitAssignment = async (
  visitId: string,
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string; phone?: string }
): Promise<IFieldVisit> => {
  if (!mongoose.Types.ObjectId.isValid(visitId)) {
    throw new AppError('Invalid field visit ID', 400);
  }

  // 1. Authorization check: Patients cannot accept caregiver assignments
  if (user.role === 'patient') {
    throw new AppError('Forbidden: Patients cannot accept or reject caregiver assignments', 403);
  }

  const visit = await FieldVisit.findById(visitId);
  if (!visit) {
    throw new AppError(`Field visit '${visitId}' not found`, 404);
  }

  const userDoc = await User.findById(user._id).lean();
  const phoneVariants = getPhoneVariants(user.phone || (userDoc as any)?.phone);
  const isAssignedProvider =
    (visit.providerId && visit.providerId.toString() === user._id.toString()) ||
    (visit.providerPhone && phoneVariants.includes(visit.providerPhone));
  const isAdmin = ['admin', 'super_admin'].includes(user.role);

  if (!isAssignedProvider && !isAdmin) {
    throw new AppError('Forbidden: You are not authorized to accept this visit because it is not assigned to you', 403);
  }

  // 2. Caregiver active status check
  if (userDoc && (userDoc as any).status !== 'active') {
    throw new AppError('Your caregiver account is inactive or pending verification. Only active caregivers can accept visits.', 403);
  }

  // 3. Idempotency: If already accepted by this caregiver, return existing accepted visit
  if (visit.status === 'accepted' && visit.assignmentStatus === 'accepted') {
    return visit;
  }

  // 4. Eligibility check: Cannot accept cancelled, completed, failed, or rejected visits
  if (visit.status === 'cancelled') {
    throw new AppError('Cannot accept a visit that has been cancelled', 400);
  }
  if (visit.status === 'completed') {
    throw new AppError('Cannot accept a visit that has already been completed', 400);
  }
  if (visit.status === 'failed') {
    throw new AppError('Cannot accept a visit that has failed. It must be reassigned first.', 400);
  }
  if (visit.status === 'rejected') {
    throw new AppError('Cannot accept an assignment that has already been rejected. A new valid assignment must be explicitly created by an administrator.', 400);
  }
  if (visit.status !== 'assigned') {
    throw new AppError(`Cannot accept visit in status '${visit.status}'. Only pending assignments can be accepted.`, 400);
  }

  // 5. Schedule Conflict Detection
  const targetProviderId = visit.providerId || user._id;
  const conflictVisit = await FieldVisit.findOne({
    providerId: targetProviderId,
    _id: { $ne: visit._id },
    scheduledDate: visit.scheduledDate,
    timeSlot: visit.timeSlot,
    status: { $in: ['accepted', 'en_route', 'arrived', 'in_progress'] },
  });

  if (conflictVisit) {
    throw new AppError(
      `Scheduling conflict: Caregiver already has an active visit (${conflictVisit.visitNumber}) scheduled on ${visit.scheduledDate} during ${visit.timeSlot}`,
      409
    );
  }

  // 6. Persist Acceptance
  const now = new Date();
  visit.status = 'accepted';
  visit.assignmentStatus = 'accepted';
  visit.replacementRequired = false;
  visit.timestamps.acceptedAt = now;
  visit.statusHistory.push({
    status: 'accepted',
    changedBy: user._id,
    changedByRole: user.role,
    changedByName: user.fullName,
    timestamp: now,
    notes: 'Caregiver accepted visit assignment',
  });

  await visit.save();

  // 7. Audit Log
  await AuditLog.create({
    action: 'FIELD_VISIT_ASSIGNMENT_ACCEPTED',
    category: 'field_operations',
    actorId: user._id,
    actorName: user.fullName,
    actorRole: user.role,
    targetType: 'FieldVisit',
    targetId: visit._id.toString(),
    details: {
      visitNumber: visit.visitNumber,
      providerId: visit.providerId,
      providerName: visit.providerName,
      scheduledDate: visit.scheduledDate,
      timeSlot: visit.timeSlot,
    },
    severity: 'info',
    timestamp: now,
  });

  // 8. Notifications
  try {
    if (visit.patientDetails?.phone) {
      await NotificationLog.create({
        recipientPhone: visit.patientDetails.phone,
        recipientName: visit.patientDetails.fullName,
        recipientRole: 'patient',
        channel: 'in_app',
        templateId: 'VISIT_ASSIGNMENT_ACCEPTED',
        messageBody: `Visit Confirmed: Caregiver ${visit.providerName} has accepted your home visit #${visit.visitNumber} scheduled for ${visit.scheduledDate} (${visit.timeSlot}).`,
        consentChecked: true,
        status: 'delivered',
        provider: 'in_app_system',
        idempotencyKey: `notif_accept_${visit._id}_${now.getTime()}`,
        isRead: false,
        metadata: {
          visitId: visit._id.toString(),
          visitNumber: visit.visitNumber,
          caregiverName: visit.providerName,
        },
      });
    }

    await NotificationLog.create({
      recipientPhone: 'ADMIN_DESK',
      recipientName: 'Clinical Desk Admin',
      recipientRole: 'admin',
      channel: 'in_app',
      templateId: 'VISIT_ASSIGNMENT_ACCEPTED',
      type: 'VISIT_ASSIGNMENT_ACCEPTED',
      relatedEntityType: 'FieldVisit',
      messageBody: `Caregiver Acceptance: ${visit.providerName} accepted visit #${visit.visitNumber} for patient ${visit.patientDetails?.fullName}.`,
      consentChecked: true,
      status: 'delivered',
      provider: 'in_app_system',
      idempotencyKey: `notif_admin_accept_${visit._id}_${now.getTime()}`,
      isRead: false,
      metadata: {
        visitId: visit._id.toString(),
        visitNumber: visit.visitNumber,
        caregiverName: visit.providerName,
      },
    });
  } catch (notifErr: any) {
    console.warn('[acceptFieldVisitAssignment] Notification notice:', notifErr.message);
  }

  return visit;
};

/**
 * Phase 3: Caregiver/Nurse Assignment Rejection
 * Allows the assigned caregiver to reject a pending visit assignment with mandatory reason.
 * - Enforces mandatory non-empty reason (min 3 chars).
 * - Enforces role authorization (patients cannot reject; only assigned caregiver or admin).
 * - Enforces eligibility (cannot reject completed/cancelled/in-progress visits).
 * - Idempotent: repeated rejections with same reason return existing rejected visit.
 * - Stores reason, caregiver identity, and timestamp.
 * - Notifies Admin with rejected visit details and reason.
 * - Does not alter visit schedule or delete record.
 * - Locks out rejected caregiver from sensitive patient details in active queries.
 */
export const rejectFieldVisitAssignment = async (
  visitId: string,
  reason: string,
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string; phone?: string }
): Promise<IFieldVisit> => {
  if (!mongoose.Types.ObjectId.isValid(visitId)) {
    throw new AppError('Invalid field visit ID', 400);
  }

  // 1. Mandatory rejection reason validation
  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    throw new AppError('Please provide a valid rejection reason (at least 3 characters)', 400);
  }
  const cleanReason = reason.trim();

  // 2. Authorization check: Patients cannot decide caregiver assignments
  if (user.role === 'patient') {
    throw new AppError('Forbidden: Patients cannot accept or reject caregiver assignments', 403);
  }

  const visit = await FieldVisit.findById(visitId);
  if (!visit) {
    throw new AppError(`Field visit '${visitId}' not found`, 404);
  }

  const userDoc = await User.findById(user._id).lean();
  const phoneVariants = getPhoneVariants(user.phone || (userDoc as any)?.phone);
  const isAssignedProvider =
    (visit.providerId && visit.providerId.toString() === user._id.toString()) ||
    (visit.providerPhone && phoneVariants.includes(visit.providerPhone));
  const isAdmin = ['admin', 'super_admin'].includes(user.role);

  if (!isAssignedProvider && !isAdmin) {
    throw new AppError('Forbidden: You are not authorized to reject this visit because it is not assigned to you', 403);
  }

  // 3. Idempotency: If already rejected by this caregiver, return existing rejected visit
  if (visit.status === 'rejected' && visit.assignmentStatus === 'rejected') {
    return visit;
  }

  // 4. Eligibility check: Cannot reject completed, cancelled, or in-progress visits
  if (visit.status === 'cancelled') {
    throw new AppError('Cannot reject a visit that has been cancelled', 400);
  }
  if (visit.status === 'completed') {
    throw new AppError('Cannot reject a visit that has already been completed', 400);
  }
  if (['en_route', 'arrived', 'in_progress'].includes(visit.status)) {
    throw new AppError(`Cannot reject a visit that is already ${visit.status.replace('_', ' ')}. Please report an exception instead.`, 400);
  }

  // 5. Persist Rejection
  const now = new Date();
  visit.status = 'rejected';
  visit.assignmentStatus = 'rejected';
  visit.replacementRequired = true;
  visit.timestamps.rejectedAt = now;
  visit.assignmentRejection = {
    reason: cleanReason,
    rejectedAt: now,
    rejectedBy: user._id,
    rejectedByName: user.fullName,
    rejectedByPhone: user.phone || (userDoc as any)?.phone,
  };
  visit.statusHistory.push({
    status: 'rejected',
    changedBy: user._id,
    changedByRole: user.role,
    changedByName: user.fullName,
    timestamp: now,
    reason: cleanReason,
    notes: `Caregiver rejected assignment: ${cleanReason}`,
  });

  await visit.save();

  // 6. Synchronize subscription caregiver if this caregiver was primary on subscription
  if (visit.subscriptionId) {
    try {
      await CaregiverSubscription.updateOne(
        { _id: visit.subscriptionId, assignedCaregiverId: user._id },
        {
          $unset: {
            assignedCaregiverId: 1,
            assignedCaregiverName: 1,
            assignedCaregiverPhone: 1,
          },
        }
      );
    } catch (subErr: any) {
      console.warn('[rejectFieldVisitAssignment] Subscription sync notice:', subErr.message);
    }
  }

  // 7. Audit Log
  await AuditLog.create({
    action: 'FIELD_VISIT_ASSIGNMENT_REJECTED',
    category: 'field_operations',
    actorId: user._id,
    actorName: user.fullName,
    actorRole: user.role,
    targetType: 'FieldVisit',
    targetId: visit._id.toString(),
    details: {
      visitNumber: visit.visitNumber,
      providerId: visit.providerId,
      providerName: visit.providerName,
      scheduledDate: visit.scheduledDate,
      timeSlot: visit.timeSlot,
      reason: cleanReason,
      replacementRequired: true,
    },
    severity: 'warning',
    timestamp: now,
  });

  // 8. Dispatch Authoritative Notification to Admin
  try {
    await NotificationLog.create({
      recipientPhone: 'ADMIN_DESK',
      recipientName: 'Clinical Operations Admin',
      recipientRole: 'admin',
      channel: 'in_app',
      templateId: 'VISIT_ASSIGNMENT_REJECTED',
      type: 'VISIT_ASSIGNMENT_REJECTED',
      relatedEntityType: 'FieldVisit',
      messageBody: `Assignment Rejected: Caregiver ${visit.providerName} rejected visit #${visit.visitNumber} for patient ${visit.patientDetails?.fullName}. Reason: "${cleanReason}". Immediate replacement caregiver assignment required.`,
      consentChecked: true,
      status: 'delivered',
      provider: 'in_app_system',
      idempotencyKey: `notif_admin_reject_${visit._id}_${now.getTime()}`,
      isRead: false,
      metadata: {
        visitId: visit._id.toString(),
        visitNumber: visit.visitNumber,
        providerId: visit.providerId.toString(),
        providerName: visit.providerName,
        patientName: visit.patientDetails?.fullName,
        scheduledDate: visit.scheduledDate,
        timeSlot: visit.timeSlot,
        reason: cleanReason,
        rejectedAt: now,
        replacementRequired: true,
      },
    });
  } catch (notifErr: any) {
    console.warn('[rejectFieldVisitAssignment] Notification notice:', notifErr.message);
  }

  return visit;
};

// -----------------------------------------------------------------------------
// 4. Clinical Documentation & Vitals Recording
// -----------------------------------------------------------------------------
export const recordFieldVisitClinicalDoc = async (
  visitId: string,
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string; phone?: string },
  docData: {
    vitals?: IVisitVitals;
    clinicalNotes?: string;
    proceduresPerformed?: string[];
    medicationsAdministered?: string[];
    recommendations?: string;
    followUpDate?: string;
    markAsCompleted?: boolean;
  }
): Promise<IFieldVisit> => {
  if (user.role === 'patient') {
    throw new AppError('Forbidden: Patients cannot record clinical documentation', 403);
  }

  const visit = await getFieldVisitById(visitId, user);

  // Ownership Check
  const userDoc = await User.findById(user._id).lean();
  const phoneVariants = getPhoneVariants(user.phone || (userDoc as any)?.phone);
  const isAssignedProvider =
    (visit.providerId && visit.providerId.toString() === user._id.toString()) ||
    (visit.providerPhone && phoneVariants.includes(visit.providerPhone));
  const isAdmin = ['admin', 'super_admin'].includes(user.role);

  if (!isAssignedProvider && !isAdmin) {
    throw new AppError('Forbidden: Only the assigned caregiver or an administrator can record clinical documentation', 403);
  }

  if (!docData.clinicalNotes?.trim() && !docData.vitals) {
    throw new AppError('Clinical observations or vital signs must be provided', 400);
  }

  // Acceptance Check before completing
  if (docData.markAsCompleted && visit.status !== 'completed' && visit.assignmentStatus !== 'accepted') {
    throw new AppError('Cannot complete visit: Caregiver assignment must be accepted before completing care', 400);
  }

  if (!visit.clinicalDocumentation) {
    visit.clinicalDocumentation = {
      proceduresPerformed: [],
      medicationsAdministered: [],
    } as any;
  }
  const doc = visit.clinicalDocumentation!;

  if (docData.vitals) {
    doc.vitals = docData.vitals;
  }
  if (docData.clinicalNotes) {
    doc.clinicalNotes = docData.clinicalNotes.trim();
  }
  if (docData.proceduresPerformed) {
    doc.proceduresPerformed = docData.proceduresPerformed;
  }
  if (docData.medicationsAdministered) {
    doc.medicationsAdministered = docData.medicationsAdministered;
  }
  if (docData.recommendations) {
    doc.recommendations = docData.recommendations.trim();
  }
  if (docData.followUpDate) {
    doc.followUpDate = docData.followUpDate;
  }
  doc.signedAt = new Date();

  // If requested and valid, mark visit as completed (allow from active accepted operational states)
  if (docData.markAsCompleted && visit.status !== 'completed' && ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(visit.status)) {
    const prevStatus = visit.status;
    const now = new Date();
    visit.status = 'completed';
    visit.timestamps.completedAt = now;
    visit.statusHistory.push({
      status: 'completed',
      changedBy: user._id,
      changedByRole: user.role,
      changedByName: user.fullName,
      timestamp: now,
      notes: 'Clinical documentation signed and visit completed.',
    });

    // Patient Notification for Completion
    if (visit.patientDetails?.phone) {
      sendPatientNotification({
        recipientPhone: visit.patientDetails.phone,
        recipientName: visit.patientDetails.fullName,
        channel: 'sms',
        templateId: 'VISIT_COMPLETED',
        templateParams: {
          patientName: visit.patientDetails.fullName,
          providerName: visit.providerName,
        },
        idempotencyKey: `notif_${visit._id}_completed_sms`,
        metadata: { visitId: visit._id.toString(), visitNumber: visit.visitNumber },
      }).catch((err) => console.warn('[Notification Error]', err.message));
    }

    // Audit Log
    await AuditLog.create({
      action: 'FIELD_VISIT_STATUS_COMPLETED',
      category: 'field_operations',
      actorId: user._id,
      actorName: user.fullName,
      actorRole: user.role,
      targetType: 'FieldVisit',
      targetId: visit._id.toString(),
      details: {
        visitNumber: visit.visitNumber,
        previousStatus: prevStatus,
        newStatus: 'completed',
        notes: 'Clinical documentation submitted and completed',
      },
      severity: 'info',
      timestamp: now,
    });
  }

  await visit.save();

  // If linked to a hospital referral, sync to HospitalReferral.visitSummaries
  if (visit.hospitalReferralId) {
    try {
      const referral = await HospitalReferral.findById(visit.hospitalReferralId);
      if (referral) {
        referral.visitSummaries.push({
          visitId: visit.visitNumber,
          visitDate: visit.scheduledDate,
          providerName: visit.providerName,
          providerRole: visit.providerRole,
          vitals: doc.vitals,
          clinicalObservation: doc.clinicalNotes || 'Clinical in-home visit conducted.',
          proceduresPerformed: doc.proceduresPerformed,
          medicationsAdministered: doc.medicationsAdministered,
          nextFollowUpDate: doc.followUpDate,
          signedAt: new Date(),
        });
        if (referral.status === 'approved') {
          referral.status = 'in_progress';
        }
        await referral.save();
      }
    } catch (syncErr: any) {
      console.warn('[FieldOperations] Referral visit sync notice:', syncErr.message);
    }
  }

  // Dispatch persistent in-app notifications to Admin and Patient
  try {
    const notifKey = `notif_clinical_doc_${visit._id}_${Date.now()}`;
    await NotificationLog.create({
      recipientPhone: 'ADMIN_DESK',
      recipientName: 'VivoQuest Clinical Care Desk',
      recipientRole: 'admin',
      channel: 'in_app',
      templateId: 'DAILY_CARE_REPORT_SUBMITTED',
      messageBody: `Daily Care Report submitted for visit ${visit.visitNumber} (${visit.patientDetails?.fullName}) by ${user.fullName}. Status: ${visit.status}.`,
      consentChecked: true,
      status: 'delivered',
      provider: 'in_app_system',
      idempotencyKey: notifKey,
      isRead: false,
      metadata: {
        visitId: visit._id.toString(),
        visitNumber: visit.visitNumber,
        patientName: visit.patientDetails?.fullName,
        providerName: user.fullName,
        signedAt: doc.signedAt,
      },
    });

    if (visit.patientDetails?.phone) {
      await NotificationLog.create({
        recipientPhone: visit.patientDetails.phone,
        recipientName: visit.patientDetails.fullName,
        recipientRole: 'patient',
        channel: 'in_app',
        templateId: 'DAILY_CARE_REPORT_SUBMITTED',
        messageBody: `New Daily Care Report available for your visit (${visit.visitNumber}) by clinician ${user.fullName}.`,
        consentChecked: true,
        status: 'delivered',
        provider: 'in_app_system',
        idempotencyKey: `notif_pat_report_${visit._id}_${Date.now()}`,
        isRead: false,
        metadata: {
          visitId: visit._id.toString(),
          visitNumber: visit.visitNumber,
          signedAt: doc.signedAt,
        },
      });
    }
  } catch (notifErr: any) {
    console.warn('[NotificationLog] Failed to record care report notification:', notifErr.message);
  }

  if (visit.status === 'completed' && visit.patientDetails?.phone) {
    sendPatientNotification({
      recipientPhone: visit.patientDetails.phone,
      recipientName: visit.patientDetails.fullName,
      channel: 'sms',
      templateId: 'VISIT_COMPLETED',
      templateParams: {
        patientName: visit.patientDetails.fullName,
        providerName: visit.providerName,
      },
      idempotencyKey: `notif_${visit._id}_completed_sms`,
      metadata: { visitId: visit._id.toString(), visitNumber: visit.visitNumber },
    }).catch((err) => console.warn('[Notification Error]', err.message));
  }

  return visit;
};

/**
 * Generate downloadable clinical report for a field visit (HTML/PDF printable or JSON)
 */
export const generateFieldVisitReportDownload = async (
  visitId: string,
  user: { _id: mongoose.Types.ObjectId; role: string; fullName: string },
  format = 'html'
) => {
  const visit = await getFieldVisitById(visitId, user);

  if (!visit.clinicalDocumentation || (!visit.clinicalDocumentation.clinicalNotes && !visit.clinicalDocumentation.vitals)) {
    throw new AppError('No clinical care documentation recorded for this visit yet', 404);
  }

  if (visit.clinicalDocumentation.isDeleted) {
    throw new AppError('This clinical care report has been deleted/archived by administrative governance', 410);
  }

  const doc = visit.clinicalDocumentation;
  const p = visit.patientDetails;
  const vitals = doc.vitals || {};

  const reportData = {
    reportId: `RPT-${visit.visitNumber}`,
    visitId: visit._id.toString(),
    visitNumber: visit.visitNumber,
    visitType: visit.visitType,
    visitStatus: visit.status,
    scheduledDate: visit.scheduledDate,
    timeSlot: visit.timeSlot,
    author: {
      name: visit.providerName,
      role: visit.providerRole,
      phone: visit.providerPhone || 'N/A',
      signedAt: doc.signedAt || visit.timestamps.completedAt || new Date(),
    },
    patient: {
      fullName: p.fullName,
      phone: p.phone,
      address: p.address,
      street: p.street,
      city: p.city,
      state: p.state,
      pincode: p.pincode,
      emergencyContact: p.emergencyContact,
    },
    clinicalObservations: {
      vitals: {
        bloodPressure: vitals.bloodPressure || 'N/A',
        pulse: vitals.pulse !== undefined ? `${vitals.pulse} bpm` : 'N/A',
        spO2: vitals.spO2 !== undefined ? `${vitals.spO2}%` : 'N/A',
        temperature: vitals.temperature ? (String(vitals.temperature).includes('F') || String(vitals.temperature).includes('C') ? vitals.temperature : `${vitals.temperature} °F`) : 'N/A',
        respiratoryRate: vitals.respiratoryRate !== undefined ? `${vitals.respiratoryRate} /min` : 'N/A',
      },
      clinicalNotes: doc.clinicalNotes || 'No notes charted',
      proceduresPerformed: doc.proceduresPerformed || [],
      medicationsAdministered: doc.medicationsAdministered || [],
      recommendations: doc.recommendations || 'Continue prescribed supportive care',
      followUpDate: doc.followUpDate || 'As per care plan',
    },
    versionHistory: doc.versionHistory || [],
  };

  if (format === 'json') {
    return { format: 'json', data: reportData };
  }

  // Printable HTML Document for direct browser view, PDF save, or printing
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Clinical Care Report - ${visit.visitNumber}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; line-height: 1.5; padding: 20px; max-width: 800px; margin: 0 auto; background: #fff; }
    .header { border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 24px; font-weight: 800; color: #0f172a; }
    .brand span { color: #0284c7; }
    .report-badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; text-transform: uppercase; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
    .meta-item strong { color: #0f172a; }
    .section-title { font-size: 15px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .vitals-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 15px; }
    .vital-card { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }
    .vital-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    .vital-value { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .notes-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 13px; margin-bottom: 15px; white-space: pre-wrap; }
    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 15px; }
    .tag { background: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
    .signature-box { margin-top: 35px; border-top: 1px dashed #cbd5e1; padding-top: 12px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Vivo<span>Quest</span></div>
      <div style="font-size: 12px; color: #64748b;">Palliative & Clinical Home Healthcare Services</div>
    </div>
    <div style="text-align: right;">
      <span class="report-badge">Official Clinical Care Report</span>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Report Ref: ${reportData.reportId}</div>
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-item"><strong>Patient:</strong> ${reportData.patient.fullName} (+91 ${reportData.patient.phone})</div>
    <div class="meta-item"><strong>Visit Number:</strong> ${reportData.visitNumber} (${reportData.visitType})</div>
    <div class="meta-item"><strong>Scheduled Date:</strong> ${reportData.scheduledDate} (${reportData.timeSlot})</div>
    <div class="meta-item"><strong>Clinician:</strong> ${reportData.author.name} (${reportData.author.role})</div>
    <div class="meta-item" style="grid-column: span 2;"><strong>Patient Address:</strong> ${reportData.patient.address || 'Address on file'}</div>
  </div>

  <div class="section-title">Clinical Vital Signs Recorded</div>
  <div class="vitals-grid">
    <div class="vital-card">
      <div class="vital-label">Blood Pressure</div>
      <div class="vital-value">${reportData.clinicalObservations.vitals.bloodPressure}</div>
    </div>
    <div class="vital-card">
      <div class="vital-label">Pulse</div>
      <div class="vital-value">${reportData.clinicalObservations.vitals.pulse}</div>
    </div>
    <div class="vital-card">
      <div class="vital-label">Oxygen (SpO2)</div>
      <div class="vital-value">${reportData.clinicalObservations.vitals.spO2}</div>
    </div>
    <div class="vital-card">
      <div class="vital-label">Temperature</div>
      <div class="vital-value">${reportData.clinicalObservations.vitals.temperature}</div>
    </div>
    <div class="vital-card">
      <div class="vital-label">Respiration</div>
      <div class="vital-value">${reportData.clinicalObservations.vitals.respiratoryRate}</div>
    </div>
  </div>

  <div class="section-title">Clinical Observations & Bedside Notes</div>
  <div class="notes-box">${reportData.clinicalObservations.clinicalNotes}</div>

  ${reportData.clinicalObservations.proceduresPerformed.length > 0 ? `
  <div class="section-title">Procedures / Care Interventions Administered</div>
  <div class="tag-list">
    ${reportData.clinicalObservations.proceduresPerformed.map((proc: string) => `<span class="tag">✓ ${proc}</span>`).join('')}
  </div>` : ''}

  ${reportData.clinicalObservations.medicationsAdministered.length > 0 ? `
  <div class="section-title">Medications Administered</div>
  <div class="tag-list">
    ${reportData.clinicalObservations.medicationsAdministered.map((med: string) => `<span class="tag">💊 ${med}</span>`).join('')}
  </div>` : ''}

  <div class="section-title">Care Plan Recommendations & Follow-Up</div>
  <div class="notes-box">
    <strong>Recommendations:</strong> ${reportData.clinicalObservations.recommendations}<br>
    <strong>Recommended Next Follow-up:</strong> ${reportData.clinicalObservations.followUpDate}
  </div>

  <div class="signature-box">
    <div>
      <div>Digitally Signed By: <strong>${reportData.author.name}</strong> (${reportData.author.role})</div>
      <div>Contact: +91 ${reportData.author.phone}</div>
    </div>
    <div style="text-align: right;">
      <div>Timestamp: ${new Date(reportData.author.signedAt).toLocaleString('en-IN')}</div>
      <div style="font-size: 10px;">Audit-Verified Clinical Document</div>
    </div>
  </div>
</body>
</html>`;

  return { format: 'html', data: html, filename: `CareReport_${visit.visitNumber}.html`, report: reportData };
};

/**
 * Admin action to edit clinical documentation with mandatory reason and version history
 */
export const adminEditFieldVisitClinicalDoc = async (
  visitId: string,
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string },
  docData: {
    clinicalNotes?: string;
    vitals?: IVisitVitals;
    proceduresPerformed?: string[];
    medicationsAdministered?: string[];
    recommendations?: string;
    followUpDate?: string;
    editReason: string;
  }
) => {
  if (!['admin', 'super_admin'].includes(user.role)) {
    throw new AppError('Forbidden: Only administrators can amend clinical care reports', 403);
  }

  if (!docData.editReason || docData.editReason.trim().length < 3) {
    throw new AppError('A valid administrative reason for amending this clinical report is required (min 3 characters)', 400);
  }

  const visit = await FieldVisit.findById(visitId);
  if (!visit) {
    throw new AppError('Field visit not found', 404);
  }

  if (!visit.clinicalDocumentation) {
    visit.clinicalDocumentation = {
      proceduresPerformed: [],
      medicationsAdministered: [],
    } as any;
  }
  const doc = visit.clinicalDocumentation!;

  // Archive current version to versionHistory
  if (!doc.versionHistory) {
    doc.versionHistory = [];
  }
  doc.versionHistory.push({
    editedAt: new Date(),
    editedBy: user._id,
    editedByRole: user.role,
    editedByName: user.fullName,
    editReason: docData.editReason.trim(),
    previousVitals: doc.vitals ? JSON.parse(JSON.stringify(doc.vitals)) : undefined,
    previousNotes: doc.clinicalNotes,
    previousProcedures: doc.proceduresPerformed ? [...doc.proceduresPerformed] : [],
    previousMedications: doc.medicationsAdministered ? [...doc.medicationsAdministered] : [],
    previousRecommendations: doc.recommendations,
  });

  // Apply edits
  if (docData.vitals) doc.vitals = docData.vitals;
  if (docData.clinicalNotes) doc.clinicalNotes = docData.clinicalNotes.trim();
  if (docData.proceduresPerformed) doc.proceduresPerformed = docData.proceduresPerformed;
  if (docData.medicationsAdministered) doc.medicationsAdministered = docData.medicationsAdministered;
  if (docData.recommendations) doc.recommendations = docData.recommendations.trim();
  if (docData.followUpDate) doc.followUpDate = docData.followUpDate.trim();

  await visit.save();

  await AuditLog.create({
    action: 'CLINICAL_REPORT_EDITED',
    category: 'clinical_governance',
    actorId: user._id,
    actorName: user.fullName,
    actorRole: user.role,
    targetType: 'FieldVisit',
    targetId: visit.visitNumber,
    severity: 'warning',
    timestamp: new Date(),
    details: {
      visitId: visit._id.toString(),
      visitNumber: visit.visitNumber,
      editReason: docData.editReason.trim(),
      versionCount: doc.versionHistory.length,
    },
  });

  return visit;
};

/**
 * Admin action to soft-delete clinical documentation with mandatory audit reason
 */
export const adminSoftDeleteFieldVisitClinicalDoc = async (
  visitId: string,
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string },
  reason: string
) => {
  if (!['admin', 'super_admin'].includes(user.role)) {
    throw new AppError('Forbidden: Only administrators can delete clinical care records', 403);
  }

  if (!reason || reason.trim().length < 3) {
    throw new AppError('A valid administrative reason for deletion is required (min 3 characters)', 400);
  }

  const visit = await FieldVisit.findById(visitId);
  if (!visit) {
    throw new AppError('Field visit not found', 404);
  }

  if (!visit.clinicalDocumentation) {
    throw new AppError('No clinical documentation exists for this visit', 404);
  }

  visit.clinicalDocumentation.isDeleted = true;
  visit.clinicalDocumentation.deletedAt = new Date();
  visit.clinicalDocumentation.deletedBy = user._id;
  visit.clinicalDocumentation.deletedByRole = user.role;
  visit.clinicalDocumentation.deletedByName = user.fullName;
  visit.clinicalDocumentation.deletionReason = reason.trim();

  await visit.save();

  await AuditLog.create({
    action: 'CLINICAL_REPORT_SOFT_DELETED',
    category: 'clinical_governance',
    actorId: user._id,
    actorName: user.fullName,
    actorRole: user.role,
    targetType: 'FieldVisit',
    targetId: visit.visitNumber,
    severity: 'warning',
    timestamp: new Date(),
    details: {
      visitId: visit._id.toString(),
      visitNumber: visit.visitNumber,
      deletionReason: reason.trim(),
      deletedBy: user.fullName,
    },
  });

  return visit;
};

/**
 * Phase 1: Allow assigned caregiver to hide a visit entry from their own interface.
 * Critical Rule: Does NOT cancel, reschedule, or modify confirmed visit status or schedule.
 */
export const hideProviderFieldVisit = async (
  visitId: string,
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string },
  reason?: string
): Promise<{ success: boolean; message: string; visitId: string; visitUnchanged: boolean; hiddenFromCaregiver: boolean }> => {
  if (!mongoose.Types.ObjectId.isValid(visitId)) {
    throw new AppError('Invalid field visit identifier', 400);
  }

  const visit = await FieldVisit.findById(visitId);
  if (!visit) {
    throw new AppError('Field visit not found', 404);
  }

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    const userDoc = await User.findById(user._id).lean();
    const phoneVariants = getPhoneVariants((userDoc as any)?.phone);
    const isAssigned =
      (visit.providerId && visit.providerId.toString() === user._id.toString()) ||
      (visit.providerPhone && phoneVariants.includes(visit.providerPhone));
    if (!isAssigned) {
      throw new AppError('Forbidden: Caregivers can only hide entries for their assigned visits', 403);
    }

    if (!['completed', 'cancelled', 'failed'].includes(visit.status)) {
      throw new AppError('Only completed or past visits can be hidden from history', 400);
    }
  }

  visit.hiddenFromCaregiver = true;
  visit.hiddenFromCaregiverAt = new Date();
  await visit.save();

  await AuditLog.create({
    action: 'FIELD_VISIT_HIDDEN_BY_CAREGIVER',
    category: 'field_operations',
    actorId: user._id,
    actorName: user.fullName,
    actorRole: user.role,
    targetType: 'FieldVisit',
    targetId: visit.visitNumber,
    severity: 'info',
    timestamp: new Date(),
    details: {
      visitId: visit._id.toString(),
      visitNumber: visit.visitNumber,
      status: visit.status,
      scheduledDate: visit.scheduledDate,
      timeSlot: visit.timeSlot,
      visitScheduleUnchanged: true,
      reason: reason || 'Hidden by caregiver from list',
    },
  }).catch(() => {});

  return {
    success: true,
    message: 'Visit entry hidden from your caregiver interface. Confirmed visit schedule remains active.',
    visitId: visit._id.toString(),
    visitUnchanged: true,
    hiddenFromCaregiver: true,
  };
};

// -----------------------------------------------------------------------------
// 5. Visit Exception & Cancellation Reporting
// -----------------------------------------------------------------------------
export const reportFieldVisitException = async (
  visitId: string,
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string },
  exceptionData: {
    exceptionType: VisitExceptionType;
    reason: string;
    notes?: string;
    rescheduleDate?: string;
  }
): Promise<IFieldVisit> => {
  const visit = await getFieldVisitById(visitId, user);

  if (!exceptionData.reason?.trim()) {
    throw new AppError('A clear explanation for the visit exception is required', 400);
  }

  const now = new Date();
  visit.status = 'failed';
  visit.exceptionDetails = {
    hasException: true,
    exceptionType: exceptionData.exceptionType,
    reason: exceptionData.reason.trim(),
    reportedAt: now,
    notes: exceptionData.notes?.trim(),
  };

  visit.statusHistory.push({
    status: 'failed',
    changedBy: user._id,
    changedByRole: user.role,
    changedByName: user.fullName,
    timestamp: now,
    reason: `Exception: ${exceptionData.exceptionType} - ${exceptionData.reason}`,
    notes: exceptionData.notes,
  });

  await visit.save();

  // Audit Log
  await AuditLog.create({
    action: 'FIELD_VISIT_EXCEPTION_REPORTED',
    category: 'field_operations',
    actorId: user._id,
    actorName: user.fullName,
    actorRole: user.role,
    targetType: 'FieldVisit',
    targetId: visit._id.toString(),
    details: {
      visitNumber: visit.visitNumber,
      exceptionType: exceptionData.exceptionType,
      reason: exceptionData.reason,
      rescheduleDate: exceptionData.rescheduleDate,
    },
    severity: 'warning',
    timestamp: now,
  });

  return visit;
};

// -----------------------------------------------------------------------------
// 6. Medical Equipment Installation Verification
// -----------------------------------------------------------------------------
export const verifyEquipmentInstallation = async (
  visitId: string,
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string },
  verificationData: {
    equipmentItems: IEquipmentVerificationItem[];
    barcodeScanVerified: boolean;
    barcodeRawData?: string;
    patientAcknowledged: boolean;
    patientOrCaregiverName: string;
    consentObtained: boolean;
    evidenceNotes?: string;
    installationNotes?: string;
  }
): Promise<IFieldVisit> => {
  const visit = await getFieldVisitById(visitId, user);

  if (!verificationData.equipmentItems || verificationData.equipmentItems.length === 0) {
    throw new AppError('At least one medical equipment item must be verified with serial number', 400);
  }

  // Validate serial numbers and condition
  for (const item of verificationData.equipmentItems) {
    if (!item.serialNumber?.trim()) {
      throw new AppError(`Missing verified serial number for equipment '${item.name}'`, 400);
    }
  }

  if (!verificationData.patientAcknowledged || !verificationData.patientOrCaregiverName?.trim()) {
    throw new AppError('Patient or caregiver physical acknowledgement and name are required', 400);
  }

  const now = new Date();
  visit.installationVerification = {
    isEquipmentInstallation: true,
    equipmentItems: verificationData.equipmentItems,
    barcodeScanVerified: Boolean(verificationData.barcodeScanVerified),
    barcodeRawData: verificationData.barcodeRawData?.trim(),
    patientAcknowledged: true,
    patientOrCaregiverName: verificationData.patientOrCaregiverName.trim(),
    consentObtained: Boolean(verificationData.consentObtained),
    evidenceNotes: verificationData.evidenceNotes?.trim(),
    installationNotes: verificationData.installationNotes?.trim() || 'Equipment fully installed and verified on-site.',
  };

  visit.status = 'completed';
  visit.timestamps.completedAt = now;
  visit.statusHistory.push({
    status: 'completed',
    changedBy: user._id,
    changedByRole: user.role,
    changedByName: user.fullName,
    timestamp: now,
    notes: `Equipment verified on-site by ${user.fullName}. Acknowledged by ${verificationData.patientOrCaregiverName}`,
  });

  await visit.save();

  // If linked to ProductOrder, advance clinicalSetup to 'completed'
  if (visit.productOrderId) {
    try {
      const order = await ProductOrder.findById(visit.productOrderId);
      if (order) {
        order.clinicalSetup.setupStatus = 'completed';
        order.clinicalSetup.setupNotes = `Verified on-site by ${user.fullName}: ${verificationData.installationNotes || 'Installed'}`;
        order.trackingUpdates.push({
          timestamp: now,
          status: order.orderStatus,
          message: `DME Equipment installed & serial numbers verified by ${user.fullName}`,
          location: `${visit.patientDetails.city} Bedside`,
        });
        await order.save();
      }
    } catch (orderErr: any) {
      console.warn('[FieldOperations] ProductOrder sync notice:', orderErr.message);
    }
  }

  // Audit Log
  await AuditLog.create({
    action: 'EQUIPMENT_INSTALLATION_VERIFIED',
    category: 'field_operations',
    actorId: user._id,
    actorName: user.fullName,
    actorRole: user.role,
    targetType: 'FieldVisit',
    targetId: visit._id.toString(),
    details: {
      visitNumber: visit.visitNumber,
      orderNumber: visit.orderNumber,
      verifiedItemsCount: verificationData.equipmentItems.length,
      barcodeScanVerified: verificationData.barcodeScanVerified,
      acknowledgedBy: verificationData.patientOrCaregiverName,
    },
    severity: 'info',
    timestamp: now,
  });

  return visit;
};

export const failOrRescheduleInstallation = async (
  visitId: string,
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string },
  failData: {
    failedReason: string;
    escalatedToAdmin: boolean;
    rescheduledToDate?: string;
    notes?: string;
  }
): Promise<IFieldVisit> => {
  const visit = await getFieldVisitById(visitId, user);

  if (!failData.failedReason?.trim()) {
    throw new AppError('Reason for installation failure or rescheduling is required', 400);
  }

  const now = new Date();
  visit.status = 'failed';
  if (!visit.installationVerification) {
    visit.installationVerification = {
      isEquipmentInstallation: true,
      equipmentItems: [],
      barcodeScanVerified: false,
      patientAcknowledged: false,
      consentObtained: false,
    };
  }
  visit.installationVerification.failedReason = failData.failedReason.trim();
  visit.installationVerification.escalatedToAdmin = Boolean(failData.escalatedToAdmin);
  visit.installationVerification.rescheduledToDate = failData.rescheduledToDate;
  visit.installationVerification.installationNotes = failData.notes?.trim();

  visit.statusHistory.push({
    status: 'failed',
    changedBy: user._id,
    changedByRole: user.role,
    changedByName: user.fullName,
    timestamp: now,
    reason: `Installation Failure: ${failData.failedReason}`,
    notes: failData.notes,
  });

  await visit.save();

  // Audit Log
  await AuditLog.create({
    action: 'EQUIPMENT_INSTALLATION_FAILED_OR_ESCALATED',
    category: 'field_operations',
    actorId: user._id,
    actorName: user.fullName,
    actorRole: user.role,
    targetType: 'FieldVisit',
    targetId: visit._id.toString(),
    details: {
      visitNumber: visit.visitNumber,
      reason: failData.failedReason,
      escalated: failData.escalatedToAdmin,
      rescheduleDate: failData.rescheduledToDate,
    },
    severity: 'warning',
    timestamp: now,
  });

  return visit;
};

// -----------------------------------------------------------------------------
// 7. Hospital Closed-Loop Reporting
// -----------------------------------------------------------------------------
export const getHospitalReferralCompletionSummary = async (
  referralId: string,
  hospitalUserId: string,
  userRole: string
) => {
  const referral = await HospitalReferral.findById(referralId);
  if (!referral) {
    throw new AppError(`Hospital referral '${referralId}' not found`, 404);
  }

  // Hospital Tenant Isolation Check: Hospital A can NEVER see Hospital B
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    if (referral.hospitalId.toString() !== hospitalUserId.toString()) {
      throw new AppError('Forbidden: Access denied to other hospital tenant referrals', 403);
    }
  }

  // Fetch all field visits linked to this referral
  const linkedVisits = await FieldVisit.find({ hospitalReferralId: referral._id }).sort({ scheduledDate: 1 });

  const totalVisits = linkedVisits.length;
  const completedVisits = linkedVisits.filter((v) => v.status === 'completed');
  const failedOrCancelledVisits = linkedVisits.filter((v) => ['failed', 'cancelled'].includes(v.status));

  // Extract vitals progression
  const vitalsProgression = completedVisits
    .filter((v) => v.clinicalDocumentation?.vitals?.bloodPressure || v.clinicalDocumentation?.vitals?.spO2)
    .map((v) => ({
      visitNumber: v.visitNumber,
      date: v.scheduledDate,
      provider: v.providerName,
      vitals: v.clinicalDocumentation?.vitals,
    }));

  // Extract installed equipment
  const equipmentInstalled = linkedVisits
    .filter((v) => v.installationVerification?.isEquipmentInstallation && v.status === 'completed')
    .flatMap((v) => v.installationVerification?.equipmentItems || []);

  const isClosedLoopReady = referral.status === 'completed' || completedVisits.length >= Math.max(1, totalVisits);

  return {
    referral: {
      id: referral._id.toString(),
      referralNumber: referral.referralNumber,
      hospitalName: referral.hospitalName,
      status: referral.status,
      patientDetails: referral.patientDetails,
      clinicalSummary: referral.clinicalSummary,
      requestedServices: referral.requestedServices,
      equipmentRequired: referral.equipmentRequired,
      assignedProviders: referral.assignedProviders,
    },
    summaryMetrics: {
      totalVisitsScheduled: totalVisits,
      totalVisitsCompleted: completedVisits.length,
      totalExceptionsCount: failedOrCancelledVisits.length,
      isClosedLoopReady,
    },
    vitalsProgression,
    equipmentInstalled,
    completedVisitSummaries: referral.visitSummaries,
    closedLoopStatus: referral.status === 'completed' ? 'ready_or_acknowledged' : 'in_progress',
  };
};

export const acknowledgeHospitalCompletionSummary = async (
  referralId: string,
  hospitalUserId: string,
  userRole: string,
  acknowledgementData: {
    acknowledgedByName: string;
    notes?: string;
  }
) => {
  const referral = await HospitalReferral.findById(referralId);
  if (!referral) {
    throw new AppError(`Hospital referral '${referralId}' not found`, 404);
  }

  // Hospital Tenant Isolation Check
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    if (referral.hospitalId.toString() !== hospitalUserId.toString()) {
      throw new AppError('Forbidden: Access denied to other hospital tenant referrals', 403);
    }
  }

  if (!acknowledgementData.acknowledgedByName?.trim()) {
    throw new AppError('Acknowledging hospital doctor/staff name is required', 400);
  }

  const now = new Date();
  referral.status = 'completed';
  referral.statusHistory.push({
    status: 'completed',
    changedBy: new mongoose.Types.ObjectId(hospitalUserId),
    changedByRole: userRole,
    changedByName: acknowledgementData.acknowledgedByName.trim(),
    timestamp: now,
    reason: 'Closed-loop home healthcare summary reviewed and formally acknowledged by referring hospital.',
    notes: acknowledgementData.notes?.trim() || 'Hospital clinical team satisfied with home visit outcomes.',
  });

  await referral.save();

  // Update linked field visits
  await FieldVisit.updateMany(
    { hospitalReferralId: referral._id },
    {
      $set: {
        'closedLoop.summaryAcknowledgedAt': now,
        'closedLoop.summaryAcknowledgedBy': acknowledgementData.acknowledgedByName.trim(),
        'closedLoop.hospitalReviewNotes': acknowledgementData.notes?.trim(),
      },
    }
  );

  // Audit Log
  await AuditLog.create({
    action: 'HOSPITAL_CLOSED_LOOP_ACKNOWLEDGED',
    category: 'field_operations',
    actorId: new mongoose.Types.ObjectId(hospitalUserId),
    actorName: acknowledgementData.acknowledgedByName,
    actorRole: userRole,
    targetType: 'HospitalReferral',
    targetId: referral._id.toString(),
    details: {
      referralNumber: referral.referralNumber,
      hospitalName: referral.hospitalName,
      notes: acknowledgementData.notes,
    },
    severity: 'info',
    timestamp: now,
  });

  if (referral.patientDetails?.phone) {
    sendPatientNotification({
      recipientPhone: referral.patientDetails.phone,
      recipientName: referral.patientDetails.fullName,
      channel: 'sms',
      templateId: 'CARE_LOOP_CLOSED',
      templateParams: {
        patientName: referral.patientDetails.fullName,
        hospitalName: referral.hospitalName,
      },
      idempotencyKey: `notif_ref_${referral._id}_closed_sms`,
      metadata: { referralId: referral._id.toString(), referralNumber: referral.referralNumber },
    }).catch((err) => console.warn('[Notification Error]', err.message));
  }

  return referral;
};

// -----------------------------------------------------------------------------
// 8. Admin Field Operations Supervision
// -----------------------------------------------------------------------------
export const listAdminFieldVisits = async (filters: {
  status?: string;
  date?: string;
  dateScope?: 'today' | 'upcoming' | 'past' | 'all';
  providerId?: string;
  hospitalId?: string;
  visitType?: string;
  search?: string;
  page?: number;
  limit?: number;
  requiresClinicalDoc?: boolean;
}) => {
  await seedDemoFieldVisitsIfEmpty();

  const query: any = {
    isDeleted: { $ne: true },
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'replacement_required') {
      query.replacementRequired = true;
    } else if (filters.status === 'overdue') {
      query.scheduledDate = { $lt: todayStr };
      query.status = { $nin: ['completed', 'cancelled', 'missed'] };
    } else {
      query.status = filters.status;
    }
  }
  if (filters.visitType && filters.visitType !== 'all') {
    query.visitType = filters.visitType;
  }
  if (filters.providerId && mongoose.Types.ObjectId.isValid(filters.providerId)) {
    query.providerId = new mongoose.Types.ObjectId(filters.providerId);
  }
  if (filters.hospitalId && mongoose.Types.ObjectId.isValid(filters.hospitalId)) {
    query.hospitalId = new mongoose.Types.ObjectId(filters.hospitalId);
  }
  if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
    query.scheduledDate = filters.date;
  } else if (filters.dateScope === 'today') {
    query.scheduledDate = todayStr;
  } else if (filters.dateScope === 'upcoming') {
    query.scheduledDate = { $gt: todayStr };
  } else if (filters.dateScope === 'past') {
    query.scheduledDate = { $lt: todayStr };
  }
  if (filters.requiresClinicalDoc) {
    // Only visits that have active clinical documentation (not soft-deleted)
    query['clinicalDocumentation.signedAt'] = { $exists: true };
    query['clinicalDocumentation.isDeleted'] = { $ne: true };
  }
  if (filters.search?.trim()) {
    const s = filters.search.trim();
    query.$or = [
      { visitNumber: { $regex: s, $options: 'i' } },
      { 'patientDetails.fullName': { $regex: s, $options: 'i' } },
      { 'patientDetails.phone': { $regex: s, $options: 'i' } },
      { providerName: { $regex: s, $options: 'i' } },
      { orderNumber: { $regex: s, $options: 'i' } },
    ];
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [total, visits] = await Promise.all([
    FieldVisit.countDocuments(query),
    FieldVisit.find(query).sort({ scheduledDate: -1, createdAt: -1 }).skip(skip).limit(limit),
  ]);

  return {
    visits,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const deleteAdminFieldVisit = async (
  visitId: string,
  actor: { _id?: any; fullName?: string; role?: string },
  reason?: string
) => {
  if (!mongoose.Types.ObjectId.isValid(visitId)) {
    throw new AppError('Invalid field visit identifier', 400);
  }

  const visit = await FieldVisit.findById(visitId);
  if (!visit) {
    throw new AppError('Field visit not found', 404);
  }

  (visit as any).isDeleted = true;
  (visit as any).deletedAt = new Date();
  if (reason) {
    (visit as any).deletionReason = reason;
  }
  visit.hiddenFromCaregiver = true;
  await visit.save();

  await AuditLog.create({
    action: 'ADMIN_DELETE_FIELD_VISIT',
    category: 'field_operations',
    actorId: actor._id || new mongoose.Types.ObjectId(),
    actorName: actor.fullName || 'Admin Operations',
    actorRole: actor.role || 'admin',
    targetType: 'FieldVisit',
    targetId: visit.visitNumber,
    severity: 'warning',
    timestamp: new Date(),
    details: {
      visitId: visit._id.toString(),
      visitNumber: visit.visitNumber,
      status: visit.status,
      scheduledDate: visit.scheduledDate,
      reason: reason || 'Deleted/archived by admin from dispatch roster',
    },
  });

  return {
    success: true,
    message: `Field visit ${visit.visitNumber} was archived and removed from active dispatch`,
    visitId: visit._id.toString(),
    visitNumber: visit.visitNumber,
  };
};

export const getAdminFieldOperationsStats = async () => {
  await seedDemoFieldVisitsIfEmpty();

  const todayStr = new Date().toISOString().slice(0, 10);

  const [
    totalVisits,
    todayCount,
    inProgressCount,
    completedTodayCount,
    completedCount,
    overdueCount,
    exceptionsCount,
    pendingInstallationsCount,
    pendingAcceptanceCount,
    acceptedCount,
    rejectedCount,
    replacementRequiredCount,
    missedCount,
  ] = await Promise.all([
    FieldVisit.countDocuments(),
    FieldVisit.countDocuments({ scheduledDate: todayStr }),
    FieldVisit.countDocuments({ status: { $in: ['en_route', 'arrived', 'in_progress'] } }),
    FieldVisit.countDocuments({ scheduledDate: todayStr, status: 'completed' }),
    FieldVisit.countDocuments({ status: 'completed' }),
    FieldVisit.countDocuments({ scheduledDate: { $lt: todayStr }, status: { $nin: ['completed', 'cancelled', 'missed'] } }),
    FieldVisit.countDocuments({ status: 'failed' }),
    FieldVisit.countDocuments({ visitType: 'equipment_installation', status: { $ne: 'completed' } }),
    FieldVisit.countDocuments({ status: 'assigned' }),
    FieldVisit.countDocuments({ status: 'accepted' }),
    FieldVisit.countDocuments({ status: 'rejected' }),
    FieldVisit.countDocuments({ replacementRequired: true }),
    FieldVisit.countDocuments({ status: 'missed' }),
  ]);

  return {
    totalVisits,
    todayCount,
    inProgressCount,
    completedTodayCount,
    completedCount,
    overdueCount,
    exceptionsCount,
    pendingInstallationsCount,
    pendingAcceptanceCount,
    acceptedCount,
    rejectedCount,
    replacementRequiredCount,
    missedCount,
  };
};

/**
 * Phase 5: Missed Visit and Operational Monitoring Sweep
 * Safely identifies and transitions uncompleted visits whose scheduled date/time has passed.
 * - Inspects active visits (assigned, accepted, en_route, arrived, in_progress).
 * - Excludes terminal visits (completed, cancelled) and already missed visits.
 * - Idempotent: repeated sweeps prevent duplicate status transitions and notifications.
 * - Records audit log (FIELD_VISIT_MARKED_MISSED) and deterministic in-app operational notification.
 */
export const sweepAndDetectOverdueVisits = async (options?: {
  actor?: { _id?: any; fullName?: string; role?: string };
  referenceDate?: Date;
  dryRun?: boolean;
}): Promise<{
  totalEvaluated: number;
  missedCount: number;
  missedVisits: Array<{
    _id: string;
    visitNumber: string;
    scheduledDate: string;
    timeSlot: string;
    previousStatus: string;
  }>;
}> => {
  const refDate = options?.referenceDate || new Date();
  const todayStr = refDate.toISOString().slice(0, 10);
  const actor = options?.actor || {
    _id: new mongoose.Types.ObjectId(),
    fullName: 'Operational Monitoring Service',
    role: 'system',
  };

  // Find candidate active visits
  const activeVisits = await FieldVisit.find({
    status: { $in: ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'] },
  });

  const missedVisits: Array<{
    _id: string;
    visitNumber: string;
    scheduledDate: string;
    timeSlot: string;
    previousStatus: string;
  }> = [];

  for (const visit of activeVisits) {
    let isOverdue = false;

    if (visit.scheduledDate < todayStr) {
      isOverdue = true;
    } else if (visit.scheduledDate === todayStr) {
      // Evaluate timeSlot end time with 15-minute grace period
      const slotParts = (visit.timeSlot || '').split('-');
      const endTimeStr = slotParts.length > 1 ? slotParts[1].trim() : slotParts[0]?.trim();
      const match = (endTimeStr || '').match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
      if (match) {
        let hour = parseInt(match[1], 10);
        const min = parseInt(match[2], 10);
        const meridiem = match[3]?.toUpperCase();
        if (meridiem === 'PM' && hour < 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;

        const currentHour = refDate.getHours();
        const currentMin = refDate.getMinutes();
        const slotEndMinutes = hour * 60 + min;
        const currentMinutes = currentHour * 60 + currentMin;

        if (currentMinutes > slotEndMinutes + 15) {
          isOverdue = true;
        }
      }
    }

    if (isOverdue) {
      missedVisits.push({
        _id: visit._id.toString(),
        visitNumber: visit.visitNumber,
        scheduledDate: visit.scheduledDate,
        timeSlot: visit.timeSlot,
        previousStatus: visit.status,
      });

      if (!options?.dryRun) {
        const prevStatus = visit.status;
        const now = new Date();
        visit.status = 'missed';
        visit.timestamps.missedAt = now;
        visit.statusHistory.push({
          status: 'missed',
          changedBy: actor._id,
          changedByRole: actor.role || 'system',
          changedByName: actor.fullName || 'Operational Monitoring Service',
          timestamp: now,
          reason: 'Scheduled visit date and window elapsed without completion',
          notes: `Operational monitoring marked visit as missed (previously ${prevStatus})`,
        });

        await visit.save();

        // Audit Log
        await AuditLog.create({
          action: 'FIELD_VISIT_MARKED_MISSED',
          category: 'field_operations',
          actorId: actor._id,
          actorName: actor.fullName || 'Operational Monitoring Service',
          actorRole: actor.role || 'system',
          targetType: 'FieldVisit',
          targetId: visit._id.toString(),
          details: {
            visitNumber: visit.visitNumber,
            previousStatus: prevStatus,
            newStatus: 'missed',
            scheduledDate: visit.scheduledDate,
            timeSlot: visit.timeSlot,
            reason: 'Scheduled visit date and window elapsed without completion',
          },
          severity: 'warning',
          timestamp: now,
        });

        // Deterministic Admin / Operational Alert Notification
        const idempotencyKey = `notif_missed_${visit._id}_${visit.scheduledDate}`;
        try {
          const existingNotif = await NotificationLog.findOne({ idempotencyKey });
          if (!existingNotif) {
            await NotificationLog.create({
              recipientPhone: 'ADMIN_DESK',
              recipientName: 'Clinical Operations Admin',
              recipientRole: 'admin',
              channel: 'in_app',
              templateId: 'OVERDUE_VISIT_MISSED',
              type: 'OVERDUE_VISIT_MISSED',
              relatedEntityType: 'FieldVisit',
              messageBody: `Operational Alert: Visit #${visit.visitNumber} for patient ${visit.patientDetails?.fullName} scheduled on ${visit.scheduledDate} (${visit.timeSlot}) was not completed and has been marked as missed.`,
              consentChecked: true,
              status: 'delivered',
              provider: 'in_app_system',
              idempotencyKey,
              isRead: false,
              metadata: {
                visitId: visit._id.toString(),
                visitNumber: visit.visitNumber,
                previousStatus: prevStatus,
                scheduledDate: visit.scheduledDate,
                timeSlot: visit.timeSlot,
                missedAt: now,
              },
            });
          }
        } catch (notifErr: any) {
          console.warn('[sweepAndDetectOverdueVisits] Notification notice:', notifErr.message);
        }
      }
    }
  }

  return {
    totalEvaluated: activeVisits.length,
    missedCount: missedVisits.length,
    missedVisits,
  };
};

export const assignOrReassignFieldVisitProvider = async (
  visitId: string,
  newProviderId: string,
  operatorUser: { _id: mongoose.Types.ObjectId; fullName: string; role: string },
  notes?: string,
  scheduledDate?: string,
  timeSlot?: string,
  options?: { allowRejectedCaregiver?: boolean; forceReassign?: boolean }
): Promise<IFieldVisit> => {
  let visit = null;
  if (mongoose.Types.ObjectId.isValid(visitId)) {
    visit = await FieldVisit.findById(visitId);
  }
  if (!visit) {
    visit = await FieldVisit.findOne({ visitNumber: visitId });
  }
  if (!visit) {
    throw new AppError(`Field visit '${visitId}' not found`, 404);
  }

  // 1. Visit eligibility validation
  if (visit.status === 'cancelled') {
    throw new AppError('Cannot reassign a visit that has been cancelled', 400);
  }
  if (visit.status === 'completed' && !options?.forceReassign && !['admin', 'super_admin'].includes(operatorUser.role)) {
    throw new AppError('Cannot reassign a visit that has already been completed', 400);
  }

  // 2. Mandatory Reassignment Reason Validation
  if (!notes || typeof notes !== 'string' || notes.trim().length < 3) {
    throw new AppError('Mandatory reassignment reason is required (at least 3 characters)', 400);
  }
  const cleanReason = notes.trim();

  // 3. Provider validation
  if (!newProviderId || typeof newProviderId !== 'string' || !newProviderId.trim()) {
    throw new AppError("Valid 'providerId' of an authorized caregiver is required", 400);
  }

  let provider = null;
  if (mongoose.Types.ObjectId.isValid(newProviderId)) {
    provider = await User.findById(newProviderId);
  }
  if (!provider) {
    const cleanPhone = String(newProviderId).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length === 10) {
      provider = await User.findOne({ phone: cleanPhone });
    }
  }
  if (!provider) {
    throw new AppError(`Provider '${newProviderId}' not found`, 404);
  }

  if (provider.status !== 'active') {
    throw new AppError(`The selected caregiver is no longer available (${provider.fullName} is ${provider.status || 'inactive'}). Please select an active caregiver.`, 400);
  }

  if (!['caregiver', 'nurse', 'professional'].includes(provider.role)) {
    throw new AppError(`User '${provider.fullName}' has role '${provider.role}' and cannot be assigned as a field caregiver`, 400);
  }

  // Check HealthcareProfessionalProfile if present
  const profProfile = await HealthcareProfessionalProfile.findOne({ userId: provider._id }).lean();
  if (profProfile) {
    if (profProfile.isActiveForDispatch === false) {
      throw new AppError(`Caregiver ${provider.fullName} is currently marked as unavailable for dispatch. Please select an active caregiver.`, 400);
    }
    if (profProfile.verificationStatus === 'rejected') {
      throw new AppError(`Caregiver ${provider.fullName} credentials verification was rejected. Cannot assign this provider.`, 400);
    }
  }

  const targetDate = (scheduledDate && scheduledDate.trim()) || visit.scheduledDate;
  const targetTimeSlot = (timeSlot && timeSlot.trim()) || visit.timeSlot;

  // Check DoctorAvailability blackout dates if present
  const docAvail = await DoctorAvailability.findOne({ doctorId: provider._id }).lean();
  if (docAvail) {
    if (docAvail.isActive === false) {
      throw new AppError(`Caregiver ${provider.fullName} schedule is inactive. Please select another caregiver.`, 400);
    }
    if (docAvail.blackoutDates && docAvail.blackoutDates.includes(targetDate)) {
      throw new AppError(`Caregiver ${provider.fullName} is unavailable on ${targetDate} (Blackout date). Please select another caregiver.`, 400);
    }
  }

  // 4. Prevent assigning a caregiver who has already rejected the same assignment unless explicitly permitted
  const allowRejected = options?.allowRejectedCaregiver || options?.forceReassign;
  const alreadyRejected =
    (visit.assignmentRejection?.rejectedBy && visit.assignmentRejection.rejectedBy.toString() === provider._id.toString()) ||
    (visit.assignmentRejection?.rejectedByPhone && visit.assignmentRejection.rejectedByPhone === provider.phone) ||
    (visit.statusHistory &&
      visit.statusHistory.some(
        (h: any) => h.status === 'rejected' && h.changedBy && h.changedBy.toString() === provider._id.toString()
      ));

  if (alreadyRejected && !allowRejected) {
    throw new AppError(
      `Cannot assign caregiver ${provider.fullName} because they have already rejected this visit assignment. Please choose an alternate eligible caregiver.`,
      400
    );
  }

  // 5. Conflict check for target caregiver (normalizing AM/PM variations)
  const normalizeSlot = (s: string) => (s || '').replace(/\s*(AM|PM)\b/gi, '').trim().toLowerCase();
  const existingVisits = await FieldVisit.find({
    providerId: provider._id,
    _id: { $ne: visit._id },
    scheduledDate: targetDate,
    status: { $in: ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'] },
  });

  const conflictVisit = existingVisits.find((ev) => {
    if (ev.timeSlot === targetTimeSlot) return true;
    return normalizeSlot(ev.timeSlot) === normalizeSlot(targetTimeSlot);
  });

  if (conflictVisit) {
    throw new AppError(
      `This caregiver has a scheduling conflict: Caregiver ${provider.fullName} already has an active visit (${conflictVisit.visitNumber}) scheduled on ${targetDate} during ${conflictVisit.timeSlot}`,
      409
    );
  }

  const prevProviderId = visit.providerId;
  const prevProviderName = visit.providerName;
  const prevProviderPhone = visit.providerPhone;

  // 6. Concurrency-safe atomic state transition
  const now = new Date();
  const newHistoryEntry = {
    status: 'assigned',
    changedBy: operatorUser._id,
    changedByRole: operatorUser.role,
    changedByName: operatorUser.fullName,
    timestamp: now,
    reason: cleanReason,
    notes: `Reassigned from ${prevProviderName || 'Unassigned'} to ${provider.fullName}. Reason: ${cleanReason}`,
  };

  const currentVersion = visit.__v;
  const filter: any = { _id: visit._id };
  if (typeof currentVersion === 'number') {
    filter.__v = currentVersion;
  }

  const updatedVisit = await FieldVisit.findOneAndUpdate(
    filter,
    {
      $set: {
        providerId: provider._id,
        providerName: provider.fullName,
        providerPhone: provider.phone,
        providerRole: provider.role === 'caregiver' ? 'Palliative Caregiver' : 'Registered Nurse',
        scheduledDate: targetDate,
        timeSlot: targetTimeSlot,
        status: 'assigned',
        assignmentStatus: 'pending',
        replacementRequired: false,
        'timestamps.assignedAt': now,
      },
      $unset: {
        assignmentRejection: 1,
        'timestamps.acceptedAt': 1,
        'timestamps.rejectedAt': 1,
      },
      $push: {
        statusHistory: newHistoryEntry,
      },
      $inc: { __v: 1 },
    },
    { new: true }
  );

  if (!updatedVisit) {
    throw new AppError(
      'Concurrent reassignment conflict: This visit was updated concurrently by another administrative action. Please refresh the queue and retry.',
      409
    );
  }

  // Synchronize subscription primary caregiver if applicable
  if (updatedVisit.subscriptionId) {
    await CaregiverSubscription.updateOne(
      { _id: updatedVisit.subscriptionId },
      {
        $set: {
          assignedCaregiverId: provider._id,
          assignedCaregiverName: provider.fullName,
          assignedCaregiverPhone: provider.phone,
        },
      }
    ).catch(() => {});
  }

  // 7. Audit Log
  await AuditLog.create({
    action: 'FIELD_VISIT_PROVIDER_REASSIGNED',
    category: 'field_operations',
    actorId: operatorUser._id,
    actorName: operatorUser.fullName,
    actorRole: operatorUser.role,
    targetType: 'FieldVisit',
    targetId: updatedVisit._id.toString(),
    details: {
      visitId: updatedVisit._id.toString(),
      visitNumber: updatedVisit.visitNumber,
      previousProvider: prevProviderName,
      previousProviderId: prevProviderId ? prevProviderId.toString() : undefined,
      newProvider: provider.fullName,
      newProviderId: provider._id.toString(),
      proposedProviderId: provider._id.toString(),
      actingAdminId: operatorUser._id.toString(),
      reason: cleanReason,
      notes: cleanReason,
      outcome: 'success',
      scheduledDate: updatedVisit.scheduledDate,
      timeSlot: updatedVisit.timeSlot,
    },
    severity: 'info',
    timestamp: now,
  });

  // 8. Notifications
  try {
    // A. Notify previous caregiver (idempotent key)
    if (prevProviderId && prevProviderId.toString() !== provider._id.toString() && prevProviderPhone) {
      await NotificationLog.create({
        recipientPhone: prevProviderPhone,
        recipientName: prevProviderName || 'Caregiver',
        recipientRole: 'caregiver',
        channel: 'in_app',
        templateId: 'CAREGIVER_REASSIGNED_REMOVED',
        type: 'CAREGIVER_REASSIGNED_REMOVED',
        relatedEntityType: 'FieldVisit',
        messageBody: `Notice: Visit ${updatedVisit.visitNumber} scheduled for ${targetDate} (${targetTimeSlot}) has been reassigned to another clinician.`,
        consentChecked: true,
        status: 'delivered',
        provider: 'in_app_system',
        idempotencyKey: `notif_reassign_prev_${updatedVisit._id}_${prevProviderId}`,
        isRead: false,
        metadata: {
          visitId: updatedVisit._id.toString(),
          visitNumber: updatedVisit.visitNumber,
        },
      }).catch(() => {});
    }

    // B. Notify new caregiver
    if (provider.phone) {
      await NotificationLog.create({
        recipientPhone: provider.phone,
        recipientName: provider.fullName,
        recipientRole: 'caregiver',
        channel: 'in_app',
        templateId: 'CAREGIVER_ASSIGNED_NEW',
        type: 'CAREGIVER_ASSIGNED_NEW',
        relatedEntityType: 'FieldVisit',
        messageBody: `New Visit Assigned: You have been assigned to visit ${updatedVisit.visitNumber} for patient ${updatedVisit.patientDetails?.fullName} on ${targetDate} (${targetTimeSlot}). Action required: Please review and accept or decline.`,
        consentChecked: true,
        status: 'delivered',
        provider: 'in_app_system',
        idempotencyKey: `notif_reassign_new_${updatedVisit._id}_${provider._id}`,
        isRead: false,
        metadata: {
          visitId: updatedVisit._id.toString(),
          visitNumber: updatedVisit.visitNumber,
          targetDate,
          targetTimeSlot,
        },
      }).catch(() => {});
    }

    // C. Notify patient
    if (updatedVisit.patientDetails?.phone) {
      await NotificationLog.create({
        recipientPhone: updatedVisit.patientDetails.phone,
        recipientName: updatedVisit.patientDetails.fullName,
        recipientRole: 'patient',
        channel: 'in_app',
        templateId: 'CAREGIVER_REASSIGNED_PATIENT',
        type: 'CAREGIVER_REASSIGNED_PATIENT',
        relatedEntityType: 'FieldVisit',
        messageBody: `Caregiver Update: Your assigned caregiver for visit ${updatedVisit.visitNumber} on ${targetDate} is now ${provider.fullName} (${provider.phone ? `+91 ${provider.phone}` : ''}). Confirmation is currently in progress.`,
        consentChecked: true,
        status: 'delivered',
        provider: 'in_app_system',
        idempotencyKey: `notif_reassign_pat_${updatedVisit._id}_${provider._id}`,
        isRead: false,
        metadata: {
          visitId: updatedVisit._id.toString(),
          visitNumber: updatedVisit.visitNumber,
          caregiverName: provider.fullName,
          caregiverPhone: provider.phone,
        },
      }).catch(() => {});
    }

    // D. Notify Admin
    await NotificationLog.create({
      recipientPhone: 'ADMIN_DESK',
      recipientName: 'Clinical Operations Admin',
      recipientRole: 'admin',
      channel: 'in_app',
      templateId: 'CAREGIVER_REASSIGNED',
      type: 'CAREGIVER_REASSIGNED',
      relatedEntityType: 'FieldVisit',
      messageBody: `Reassignment Completed: Visit #${updatedVisit.visitNumber} for patient ${updatedVisit.patientDetails?.fullName} has been reassigned to ${provider.fullName} (Pending Caregiver Acceptance).`,
      consentChecked: true,
      status: 'delivered',
      provider: 'in_app_system',
      idempotencyKey: `notif_reassign_admin_${updatedVisit._id}_${provider._id}`,
      isRead: false,
      metadata: {
        visitId: updatedVisit._id.toString(),
        visitNumber: updatedVisit.visitNumber,
        providerId: provider._id.toString(),
        providerName: provider.fullName,
        status: 'assigned',
        assignmentStatus: 'pending',
      },
    }).catch(() => {});
  } catch (notifErr: any) {
    console.warn('[NotificationLog] Failed to record reassignment notifications:', notifErr.message);
  }

  return updatedVisit;
};

/**
 * Phase 4: Retrieve eligible caregivers for a specific field visit
 * Excludes caregivers who:
 * - Are not active or do not have an authorized role ('caregiver', 'nurse', 'professional')
 * - Have already rejected this specific visit
 * - Have an active overlapping visit on the same date and time slot
 * - Have dispatch disabled or unverified credentials
 * - Have scheduling blackout dates
 */
export const getEligibleCaregiversForVisit = async (
  visitId: string
): Promise<{
  visit: IFieldVisit;
  eligibleCaregivers: any[];
  count: number;
  message?: string;
}> => {
  let visit = null;
  if (mongoose.Types.ObjectId.isValid(visitId)) {
    visit = await FieldVisit.findById(visitId);
  }
  if (!visit) {
    visit = await FieldVisit.findOne({ visitNumber: visitId });
  }
  if (!visit) {
    throw new AppError(`Field visit '${visitId}' not found`, 404);
  }

  const targetDate = visit.scheduledDate;
  const targetTimeSlot = visit.timeSlot;
  const normalizeSlot = (s: string) => (s || '').replace(/\s*(AM|PM)\b/gi, '').trim().toLowerCase();

  // Find all active caregivers / nurses / professionals
  const allProviders = await User.find({
    role: { $in: ['caregiver', 'nurse', 'professional'] },
    status: 'active',
  }).select('_id fullName phone role status isPhoneVerified');

  // Identify caregivers who previously rejected this visit
  const rejectingUserIds = new Set<string>();
  if (visit.assignmentRejection?.rejectedBy) {
    rejectingUserIds.add(visit.assignmentRejection.rejectedBy.toString());
  }
  if (visit.statusHistory) {
    for (const h of visit.statusHistory) {
      if (h.status === 'rejected' && h.changedBy) {
        rejectingUserIds.add(h.changedBy.toString());
      }
    }
  }

  // Find busy providers with conflicting active visits on targetDate
  const busyVisits = await FieldVisit.find({
    scheduledDate: targetDate,
    _id: { $ne: visit._id },
    status: { $in: ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'] },
  }).select('providerId timeSlot visitNumber');

  const busyProviderIds = new Set<string>();
  for (const bv of busyVisits) {
    if (bv.providerId) {
      if (bv.timeSlot === targetTimeSlot || normalizeSlot(bv.timeSlot) === normalizeSlot(targetTimeSlot)) {
        busyProviderIds.add(bv.providerId.toString());
      }
    }
  }

  // Check profiles with dispatch disabled or rejected verification
  const disabledProfiles = await HealthcareProfessionalProfile.find({
    userId: { $in: allProviders.map((p) => p._id) },
    $or: [{ isActiveForDispatch: false }, { verificationStatus: 'rejected' }],
  }).select('userId');
  const disabledUserIds = new Set(disabledProfiles.map((p) => p.userId.toString()));

  // Check blackout dates from DoctorAvailability
  const doctorAvails = await DoctorAvailability.find({
    doctorId: { $in: allProviders.map((p) => p._id) },
    $or: [{ isActive: false }, { blackoutDates: targetDate }],
  }).select('doctorId');
  const blackoutDoctorIds = new Set(doctorAvails.map((d) => d.doctorId.toString()));

  const eligibleCaregivers = allProviders.filter((p) => {
    const pId = p._id.toString();
    if (rejectingUserIds.has(pId)) return false;
    if (busyProviderIds.has(pId)) return false;
    if (disabledUserIds.has(pId)) return false;
    if (blackoutDoctorIds.has(pId)) return false;
    return true;
  });

  return {
    visit,
    eligibleCaregivers,
    count: eligibleCaregivers.length,
    message:
      eligibleCaregivers.length === 0
        ? 'No eligible caregivers are currently available for this scheduled window. Visit remains marked as requiring replacement.'
        : undefined,
  };
};

// -----------------------------------------------------------------------------
// 9. Offline Field Synchronization Engine
// -----------------------------------------------------------------------------

export interface ISyncBatchItem {
  clientOperationId: string;
  visitId: string;
  operationType: SyncOperationType;
  clientTimestamp: string | Date;
  expectedStatus?: string;
  payload: any;
}

export interface ISyncBatchResultItem {
  clientOperationId: string;
  status: SyncOperationStatus;
  visitId?: string;
  visitNumber?: string;
  visitStatus?: string;
  errorReason?: string;
  conflictDetails?: {
    serverStatus?: string;
    expectedStatus?: string;
    reason?: string;
  };
}

/**
 * Atomically processes a batch of offline clinician operations upon reconnection.
 * Guarantees:
 * 1. Idempotency: Duplicate submissions return cached execution results.
 * 2. Conflict Detection: Detects status divergence on server (e.g. visit reassigned, cancelled, completed).
 * 3. Partial Failure Resilience: Valid operations succeed even if sibling operations encounter conflicts.
 * 4. Audit Logging: Preserves original offline client timestamps and sync timestamps.
 */
export const processSyncBatch = async (
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string; phone?: string },
  operations: ISyncBatchItem[]
): Promise<{
  success: boolean;
  summary: { total: number; applied: number; conflicts: number; failed: number };
  results: ISyncBatchResultItem[];
}> => {
  if (!operations || !Array.isArray(operations)) {
    throw new AppError("Invalid sync payload: 'operations' array is required", 400);
  }

  const results: ISyncBatchResultItem[] = [];
  let applied = 0;
  let conflicts = 0;
  let failed = 0;

  for (const item of operations) {
    if (!item.clientOperationId || !item.visitId || !item.operationType) {
      failed++;
      results.push({
        clientOperationId: item.clientOperationId || `invalid-${Date.now()}`,
        status: 'failed',
        errorReason: "Missing required fields: 'clientOperationId', 'visitId', and 'operationType' are required",
      });
      continue;
    }

    // 1. Idempotency Check: if this exact operation was already processed, return existing result
    const existingSyncOp = await SyncOperation.findOne({ clientOperationId: item.clientOperationId });
    if (existingSyncOp) {
      if (existingSyncOp.status === 'applied') applied++;
      else if (existingSyncOp.status === 'conflict') conflicts++;
      else failed++;

      results.push({
        clientOperationId: item.clientOperationId,
        status: existingSyncOp.status,
        visitId: existingSyncOp.visitId?.toString(),
        visitNumber: existingSyncOp.visitNumber,
        errorReason: existingSyncOp.errorReason,
        conflictDetails: existingSyncOp.conflictDetails,
      });
      continue;
    }

    // 2. Fetch target FieldVisit
    let visit;
    try {
      visit = await FieldVisit.findById(item.visitId);
    } catch {
      visit = null;
    }

    if (!visit) {
      failed++;
      const reason = `Field visit '${item.visitId}' not found on server`;
      try {
        await SyncOperation.create({
          clientOperationId: item.clientOperationId,
          providerId: user._id,
          providerName: user.fullName,
          providerPhone: user.phone,
          visitId: new mongoose.Types.ObjectId(item.visitId.length === 24 ? item.visitId : undefined),
          visitNumber: 'UNKNOWN',
          operationType: item.operationType,
          clientTimestamp: item.clientTimestamp ? new Date(item.clientTimestamp) : new Date(),
          status: 'failed',
          payload: item.payload,
          errorReason: reason,
        });
      } catch (logErr: any) {
        console.warn('[Sync Error Logging]', logErr.message);
      }

      results.push({
        clientOperationId: item.clientOperationId,
        status: 'failed',
        errorReason: reason,
      });
      continue;
    }

    // 3. Provider Assignment & Tenant Authorization Check
    const isAssigned = visit.providerId && visit.providerId.toString() === user._id.toString();
    const isAdmin = ['admin', 'super_admin'].includes(user.role);
    if (!isAssigned && !isAdmin) {
      failed++;
      const reason = `Forbidden: Field visit ${visit.visitNumber} is not assigned to ${user.fullName}`;
      await SyncOperation.create({
        clientOperationId: item.clientOperationId,
        providerId: user._id,
        providerName: user.fullName,
        providerPhone: user.phone,
        visitId: visit._id,
        visitNumber: visit.visitNumber,
        operationType: item.operationType,
        clientTimestamp: item.clientTimestamp ? new Date(item.clientTimestamp) : new Date(),
        status: 'failed',
        payload: item.payload,
        errorReason: reason,
      });

      results.push({
        clientOperationId: item.clientOperationId,
        status: 'failed',
        visitId: visit._id.toString(),
        visitNumber: visit.visitNumber,
        errorReason: reason,
      });
      continue;
    }

    // 4. Conflict Detection: Precondition status mismatch
    if (item.expectedStatus && visit.status !== item.expectedStatus) {
      conflicts++;
      const reason = `Conflict: Visit is currently '${visit.status}', but offline operation expected '${item.expectedStatus}'`;
      const conflictDetails = {
        serverStatus: visit.status,
        expectedStatus: item.expectedStatus,
        reason,
      };

      await SyncOperation.create({
        clientOperationId: item.clientOperationId,
        providerId: user._id,
        providerName: user.fullName,
        providerPhone: user.phone,
        visitId: visit._id,
        visitNumber: visit.visitNumber,
        operationType: item.operationType,
        clientTimestamp: item.clientTimestamp ? new Date(item.clientTimestamp) : new Date(),
        status: 'conflict',
        payload: item.payload,
        conflictDetails,
        errorReason: reason,
      });

      results.push({
        clientOperationId: item.clientOperationId,
        status: 'conflict',
        visitId: visit._id.toString(),
        visitNumber: visit.visitNumber,
        visitStatus: visit.status,
        conflictDetails,
        errorReason: reason,
      });
      continue;
    }

    // 5. Apply Operation
    try {
      let opResult: any;

      switch (item.operationType) {
        case 'status_update':
          opResult = await updateFieldVisitStatus(
            visit._id.toString(),
            item.payload.status,
            user,
            { notes: item.payload.notes ? `[Offline Sync] ${item.payload.notes}` : '[Offline Sync]' }
          );
          break;

        case 'clinical_documentation':
          opResult = await recordFieldVisitClinicalDoc(
            visit._id.toString(),
            user,
            {
              vitals: item.payload.vitals,
              clinicalNotes: item.payload.clinicalNotes,
              proceduresPerformed: item.payload.proceduresPerformed,
              medicationsAdministered: item.payload.medicationsAdministered,
              recommendations: item.payload.recommendations,
              followUpDate: item.payload.followUpDate,
              markAsCompleted: item.payload.markAsCompleted !== false,
            }
          );
          break;

        case 'installation_verification':
          opResult = await verifyEquipmentInstallation(
            visit._id.toString(),
            user,
            item.payload
          );
          break;

        case 'visit_exception':
          opResult = await reportFieldVisitException(
            visit._id.toString(),
            user,
            item.payload
          );
          break;

        default:
          throw new AppError(`Unsupported operationType: '${item.operationType}'`, 400);
      }

      applied++;
      await SyncOperation.create({
        clientOperationId: item.clientOperationId,
        providerId: user._id,
        providerName: user.fullName,
        providerPhone: user.phone,
        visitId: visit._id,
        visitNumber: visit.visitNumber,
        operationType: item.operationType,
        clientTimestamp: item.clientTimestamp ? new Date(item.clientTimestamp) : new Date(),
        syncedAt: new Date(),
        status: 'applied',
        payload: item.payload,
        result: { visitStatus: opResult.status, visitNumber: opResult.visitNumber },
      });

      results.push({
        clientOperationId: item.clientOperationId,
        status: 'applied',
        visitId: visit._id.toString(),
        visitNumber: visit.visitNumber,
        visitStatus: opResult.status,
      });
    } catch (opErr: any) {
      failed++;
      const reason = opErr.message || 'Operation execution failure';
      await SyncOperation.create({
        clientOperationId: item.clientOperationId,
        providerId: user._id,
        providerName: user.fullName,
        providerPhone: user.phone,
        visitId: visit._id,
        visitNumber: visit.visitNumber,
        operationType: item.operationType,
        clientTimestamp: item.clientTimestamp ? new Date(item.clientTimestamp) : new Date(),
        status: 'failed',
        payload: item.payload,
        errorReason: reason,
      });

      results.push({
        clientOperationId: item.clientOperationId,
        status: 'failed',
        visitId: visit._id.toString(),
        visitNumber: visit.visitNumber,
        errorReason: reason,
      });
    }
  }

  return {
    success: true,
    summary: {
      total: operations.length,
      applied,
      conflicts,
      failed,
    },
    results,
  };
};

/**
 * Admin Operational Supervision: Sync Operations List
 */
export const listSyncOperations = async (params: {
  status?: string;
  operationType?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const query: any = {};
  if (params.status && params.status !== 'all') {
    query.status = params.status;
  }
  if (params.operationType && params.operationType !== 'all') {
    query.operationType = params.operationType;
  }
  if (params.search?.trim()) {
    const s = params.search.trim();
    query.$or = [
      { clientOperationId: { $regex: s, $options: 'i' } },
      { visitNumber: { $regex: s, $options: 'i' } },
      { providerName: { $regex: s, $options: 'i' } },
    ];
  }

  const [operations, total] = await Promise.all([
    SyncOperation.find(query).sort({ syncedAt: -1 }).skip(skip).limit(limit).lean(),
    SyncOperation.countDocuments(query),
  ]);

  return {
    operations,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getSyncStats = async () => {
  const [total, applied, conflicts, failed] = await Promise.all([
    SyncOperation.countDocuments(),
    SyncOperation.countDocuments({ status: 'applied' }),
    SyncOperation.countDocuments({ status: 'conflict' }),
    SyncOperation.countDocuments({ status: 'failed' }),
  ]);

  return {
    total,
    applied,
    conflicts,
    failed,
  };
};

/**
 * Schedule a confirmed bedside field visit against an active caregiver subscription.
 * - Authorized roles: Admin, Super Admin, or Doctor with active patient relationship.
 * - Revalidates subscription eligibility and visit balance.
 * - Rechecks caregiver availability and rejects overlapping conflict visits (409).
 * - Enforces idempotency against duplicate form submissions.
 * - Generates collision-safe visit number and links visit to subscription.
 * - Emits audit logs and patient dispatch notification.
 */
export const scheduleVisitForSubscription = async (
  params: {
    subscriptionId: string;
    scheduledDate: string;
    timeSlot: string;
    visitType: FieldVisitType;
    providerId: string;
    instructions?: string;
    idempotencyKey?: string;
  },
  actorUser: IUser
): Promise<{ visit: IFieldVisit; subscription: any }> => {
  // 1. Validate Actor Authorization
  const isSuperOrAdmin = ['admin', 'super_admin'].includes(actorUser.role);
  const isDoctor = actorUser.role === 'professional';

  if (!isSuperOrAdmin && !isDoctor) {
    throw new AppError('Forbidden: You are not authorized to schedule visits', 403);
  }

  // 2. Validate & Load Caregiver Subscription
  if (!params.subscriptionId || typeof params.subscriptionId !== 'string') {
    throw new AppError('Valid subscription identifier is required', 400);
  }

  const sub = mongoose.Types.ObjectId.isValid(params.subscriptionId.trim())
    ? await CaregiverSubscription.findById(params.subscriptionId.trim())
    : await CaregiverSubscription.findOne({ subscriptionNumber: params.subscriptionId.trim().toUpperCase() });

  if (!sub) {
    throw new AppError('Caregiver subscription not found', 404);
  }

  // Doctor relationship check
  if (isDoctor && !isSuperOrAdmin) {
    const [hasAppointment, hasVisit] = await Promise.all([
      Appointment.exists({ patientId: sub.patientId, doctorId: actorUser._id }),
      FieldVisit.exists({ patientId: sub.patientId, providerId: actorUser._id }),
    ]);
    if (!hasAppointment && !hasVisit) {
      throw new AppError(
        'Doctors can only schedule visits for patients with whom they have an active care relationship',
        403
      );
    }
  }

  // Subscription status check
  if (sub.isArchived) {
    throw new AppError('Cannot schedule visits for an archived subscription', 400);
  }

  if (sub.status === 'paused' || sub.status === 'suspended') {
    throw new AppError(
      'Cannot schedule visits: Subscription is currently suspended. Please resume subscription first.',
      400
    );
  }

  if (sub.status === 'cancelled') {
    throw new AppError('Cannot schedule visits for a cancelled subscription', 400);
  }

  if (sub.status === 'completed') {
    throw new AppError('Cannot schedule visits for a completed subscription', 400);
  }

  if (sub.status === 'expired' || (sub.endDate && new Date() > sub.endDate)) {
    throw new AppError('Cannot schedule visits for an expired subscription', 400);
  }

  // Visit allowance check
  if (sub.visitsRemaining <= 0) {
    throw new AppError('No remaining visits in this subscription package', 400);
  }

  const scheduledActiveCount = await FieldVisit.countDocuments({
    subscriptionId: sub._id,
    status: { $nin: ['cancelled', 'failed'] },
  });

  if (scheduledActiveCount >= sub.totalVisitsIncluded) {
    throw new AppError(
      `All ${sub.totalVisitsIncluded} visits included in this subscription package have already been scheduled`,
      400
    );
  }

  // 3. Date & Time Slot Validation
  if (!params.scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(params.scheduledDate.trim())) {
    throw new AppError('Scheduled date must be in YYYY-MM-DD format', 400);
  }

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  if (params.scheduledDate.trim() < todayStr) {
    throw new AppError('Scheduled visit date cannot be in the past', 400);
  }

  if (!params.timeSlot || typeof params.timeSlot !== 'string' || !params.timeSlot.trim()) {
    throw new AppError('Time slot is required', 400);
  }

  const validVisitTypes: FieldVisitType[] = [
    'clinical_care',
    'nursing_procedure',
    'physiotherapy',
    'palliative_assessment',
    'equipment_installation',
  ];
  if (!params.visitType || !validVisitTypes.includes(params.visitType)) {
    throw new AppError(
      `Invalid visit type '${params.visitType}'. Supported types: ${validVisitTypes.join(', ')}`,
      400
    );
  }

  // 4. Caregiver Validation & Conflict Detection
  if (!params.providerId || typeof params.providerId !== 'string' || !mongoose.Types.ObjectId.isValid(params.providerId.trim())) {
    throw new AppError('Valid caregiver account ID is required', 400);
  }

  const caregiver = await User.findById(params.providerId.trim());
  if (!caregiver) {
    throw new AppError('Assigned caregiver account not found', 404);
  }

  if (caregiver.status !== 'active') {
    throw new AppError('Assigned caregiver account is not active', 400);
  }

  if (!['professional', 'caregiver'].includes(caregiver.role)) {
    throw new AppError('Selected user is not an authorized caregiver, nurse, or healthcare professional', 400);
  }

  // Conflict Check: Caregiver cannot have two active visits at the exact same date & time slot
  const conflictVisit = await FieldVisit.findOne({
    providerId: caregiver._id,
    scheduledDate: params.scheduledDate.trim(),
    timeSlot: params.timeSlot.trim(),
    status: { $in: ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'] },
  });

  if (conflictVisit) {
    throw new AppError(
      `Scheduling conflict: Caregiver ${caregiver.fullName} already has active visit #${conflictVisit.visitNumber} on ${params.scheduledDate} at ${params.timeSlot}`,
      409
    );
  }

  // Duplicate Check: Same subscription cannot have two active visits scheduled at the exact same slot
  const duplicateVisit = await FieldVisit.findOne({
    subscriptionId: sub._id,
    scheduledDate: params.scheduledDate.trim(),
    timeSlot: params.timeSlot.trim(),
    status: { $nin: ['cancelled', 'failed'] },
  });

  if (duplicateVisit) {
    throw new AppError(
      `A visit is already scheduled for this subscription on ${params.scheduledDate} at ${params.timeSlot} (Visit #${duplicateVisit.visitNumber})`,
      409
    );
  }

  // 5. Collision-Safe Sequential Visit Number Generation
  const monthPrefix = `VQ-VST-${new Date().toISOString().slice(0, 7).replace('-', '')}`;
  const lastVisit = await FieldVisit.findOne({
    visitNumber: new RegExp(`^${monthPrefix}-\\d+`),
  })
    .sort({ visitNumber: -1 })
    .lean();

  let nextSeq = 1;
  if (lastVisit && lastVisit.visitNumber) {
    const parts = lastVisit.visitNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  let visitNumber = `${monthPrefix}-${String(nextSeq).padStart(3, '0')}`;
  while (await FieldVisit.exists({ visitNumber })) {
    nextSeq += 1;
    visitNumber = `${monthPrefix}-${String(nextSeq).padStart(3, '0')}`;
  }

  // 6. Enrich Patient Address & Contact Information from Canonical Profile
  const patientProfile: any = await PatientProfile.findOne({ userId: sub.patientId }).lean();
  let street = '';
  let city = '';
  let state = '';
  let pincode = '';
  let cluster = '';

  if (patientProfile?.address && typeof patientProfile.address === 'object') {
    street = patientProfile.address.street || '';
    city = patientProfile.address.city || '';
    state = patientProfile.address.state || '';
    pincode = patientProfile.address.pincode || '';
    cluster = patientProfile.address.cluster || '';
  } else if (typeof patientProfile?.address === 'string') {
    street = patientProfile.address;
  }

  const canonicalAddressParts = [
    street,
    cluster,
    city,
    state,
    pincode ? `PIN: ${pincode}` : '',
  ].filter(Boolean);

  const fullAddress = canonicalAddressParts.length > 0 ? canonicalAddressParts.join(', ') : 'Address not available';
  const emergencyStr = sub.emergencyContact
    ? `${sub.emergencyContact.name} (${sub.emergencyContact.phone})`
    : patientProfile?.emergencyContact
    ? `${patientProfile.emergencyContact.name} (${patientProfile.emergencyContact.phone})`
    : undefined;

  // 7. Create FieldVisit Document
  const visit = await FieldVisit.create({
    visitNumber,
    visitType: params.visitType,
    status: 'assigned',
    assignmentStatus: 'pending',
    providerId: caregiver._id,
    providerName: caregiver.fullName,
    providerRole: caregiver.role === 'caregiver' ? 'Palliative Caregiver' : 'Registered Nurse',
    providerPhone: caregiver.phone,
    patientId: sub.patientId,
    patientDetails: {
      fullName: sub.patientName,
      phone: sub.patientPhone,
      address: fullAddress,
      street: street || undefined,
      city: city || 'Pune',
      state: state || 'Maharashtra',
      pincode: pincode || '',
      cluster: cluster || 'Pune Central',
      instructions: params.instructions?.trim() || undefined,
      emergencyContact: emergencyStr,
    },
    scheduledDate: params.scheduledDate.trim(),
    timeSlot: params.timeSlot.trim(),
    subscriptionId: sub._id,
    subscriptionNumber: sub.subscriptionNumber,
    timestamps: {
      assignedAt: new Date(),
    },
    statusHistory: [
      {
        status: 'assigned',
        changedBy: actorUser._id,
        changedByRole: actorUser.role,
        changedByName: actorUser.fullName,
        timestamp: new Date(),
        reason: `Visit scheduled under subscription #${sub.subscriptionNumber}`,
        notes: params.instructions?.trim() || undefined,
      },
    ],
    isDemo: false,
  });

  // 8. Update Subscription Assigned Caregiver if not set
  if (!sub.assignedCaregiverId) {
    sub.assignedCaregiverId = caregiver._id;
    sub.assignedCaregiverName = caregiver.fullName;
    sub.assignedCaregiverPhone = caregiver.phone;
    await sub.save();
  }

  // 9. Compliant Audit Trail Logging
  try {
    await logAdminAction({
      action: 'FIELD_VISIT_SCHEDULED',
      category: 'field_operations',
      actorId: actorUser._id.toString(),
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      targetType: 'FieldVisit',
      targetId: visit.visitNumber,
      details: {
        visitId: visit._id.toString(),
        visitNumber: visit.visitNumber,
        subscriptionId: sub._id.toString(),
        subscriptionNumber: sub.subscriptionNumber,
        patientId: sub.patientId.toString(),
        patientName: sub.patientName,
        caregiverId: caregiver._id.toString(),
        caregiverName: caregiver.fullName,
        scheduledDate: params.scheduledDate.trim(),
        timeSlot: params.timeSlot.trim(),
        visitType: params.visitType,
        instructions: params.instructions?.trim() || undefined,
      },
      severity: 'info',
    });
  } catch (auditErr: any) {
    // Rollback visit creation if audit logging fails
    await FieldVisit.findByIdAndDelete(visit._id);
    throw new AppError(
      `Audit logging failed: ${auditErr.message}. Visit scheduling rolled back to maintain compliance.`,
      500
    );
  }

  // 10. Dispatch Patient Notification
  try {
    await sendPatientNotification({
      recipientPhone: sub.patientPhone,
      recipientName: sub.patientName,
      recipientRole: 'patient',
      channel: 'in_app',
      templateId: 'PROVIDER_ASSIGNED',
      templateParams: {
        patientName: sub.patientName,
        providerName: caregiver.fullName,
        date: params.scheduledDate.trim(),
        timeSlot: params.timeSlot.trim(),
      },
      idempotencyKey: `notif_visit_sched_${visit.visitNumber}`,
      metadata: {
        visitId: visit._id.toString(),
        visitNumber: visit.visitNumber,
        subscriptionNumber: sub.subscriptionNumber,
      },
    });
  } catch (notifErr) {
    console.warn('[VisitSchedule] Patient notification warning:', notifErr);
  }

  // 11. Dispatch Caregiver Assignment Notification (Pending Acceptance)
  try {
    if (caregiver.phone) {
      await NotificationLog.create({
        recipientPhone: caregiver.phone,
        recipientName: caregiver.fullName,
        recipientRole: 'caregiver',
        channel: 'in_app',
        templateId: 'CAREGIVER_ASSIGNED_NEW',
        messageBody: `New Visit Assigned: You have been assigned to visit ${visit.visitNumber} for patient ${visit.patientDetails?.fullName} on ${visit.scheduledDate} (${visit.timeSlot}). Please review and accept or reject.`,
        consentChecked: true,
        status: 'delivered',
        provider: 'in_app_system',
        idempotencyKey: `notif_visit_sched_caregiver_${visit.visitNumber}`,
        isRead: false,
        metadata: {
          visitId: visit._id.toString(),
          visitNumber: visit.visitNumber,
          targetDate: visit.scheduledDate,
          targetTimeSlot: visit.timeSlot,
        },
      });
    }
  } catch (cgNotifErr: any) {
    console.warn('[VisitSchedule] Caregiver notification warning:', cgNotifErr?.message);
  }

  return { visit, subscription: sub };
};


