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
import { logAdminAction } from './adminService.js';
import { AppError } from '../middleware/errorHandler.js';

// -----------------------------------------------------------------------------
// Helper: Permitted Status Transitions State Machine
// -----------------------------------------------------------------------------
const PERMITTED_VISIT_TRANSITIONS: Record<FieldVisitStatus, FieldVisitStatus[]> = {
  assigned: ['accepted', 'cancelled'],
  accepted: ['en_route', 'cancelled'],
  en_route: ['arrived', 'cancelled', 'failed'],
  arrived: ['in_progress', 'cancelled', 'failed'],
  in_progress: ['completed', 'failed', 'cancelled'],
  completed: [],
  cancelled: [],
  failed: ['assigned'], // Re-assigning or retrying a failed visit
};

export const isValidVisitStatusTransition = (
  current: FieldVisitStatus,
  next: FieldVisitStatus
): boolean => {
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

    const docA = doctors[0] || {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Dr. Aditi Rao',
      phone: '9820011001',
    };
    const nurseB = doctors[1] || {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Sister Varsha Kulkarni, RN',
      phone: '9822441122',
    };
    const physioC = doctors[2] || {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Priya Deshmukh, PT',
      phone: '9820011003',
    };
    const techD = doctors[3] || {
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
    query.providerId = new mongoose.Types.ObjectId(providerUserId);
  } else if (filters.search && mongoose.Types.ObjectId.isValid(filters.search)) {
    query.providerId = new mongoose.Types.ObjectId(filters.search);
  }

  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (filters.date === 'today') {
    query.scheduledDate = todayStr;
  } else if (filters.date === 'upcoming') {
    query.scheduledDate = { $gte: todayStr };
    query.status = { $nin: ['completed', 'cancelled'] };
  } else if (filters.date === 'completed') {
    query.status = 'completed';
  } else if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
    query.scheduledDate = filters.date;
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(50, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [total, visits] = await Promise.all([
    FieldVisit.countDocuments(query),
    FieldVisit.find(query).sort({ scheduledDate: 1, timeSlot: 1 }).skip(skip).limit(limit),
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
  user: { _id: mongoose.Types.ObjectId; role: string }
): Promise<IFieldVisit> => {
  const visit = await FieldVisit.findById(visitId);
  if (!visit) {
    throw new AppError(`Field visit '${visitId}' not found`, 404);
  }

  // Strict tenant / ownership isolation
  const isAssignedProvider = visit.providerId.toString() === user._id.toString();
  const isAdmin = ['admin', 'super_admin'].includes(user.role);
  const isLinkedHospital = visit.hospitalId && visit.hospitalId.toString() === user._id.toString();
  const isPatient = visit.patientId && visit.patientId.toString() === user._id.toString();

  if (!isAssignedProvider && !isAdmin && !isLinkedHospital && !isPatient) {
    throw new AppError('Forbidden: You do not have authorization to view this field visit', 403);
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
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string },
  options?: { notes?: string; location?: string }
): Promise<IFieldVisit> => {
  const visit = await getFieldVisitById(visitId, user);

  // Validate state-machine transition
  if (!isValidVisitStatusTransition(visit.status, newStatus)) {
    throw new AppError(
      `Invalid field visit status transition from '${visit.status}' to '${newStatus}'. Permitted: [${(
        PERMITTED_VISIT_TRANSITIONS[visit.status] || []
      ).join(', ')}]`,
      400
    );
  }

  const now = new Date();
  visit.status = newStatus;

  // Record specific operational timestamps
  if (newStatus === 'accepted') {
    visit.timestamps.acceptedAt = now;
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
      previousStatus: visit.status,
      newStatus,
      notes: options?.notes,
    },
    severity: newStatus === 'cancelled' || newStatus === 'failed' ? 'warning' : 'info',
    timestamp: now,
  });

  // Trigger Patient Notifications for milestone status updates
  if (visit.patientDetails?.phone) {
    if (newStatus === 'en_route') {
      sendPatientNotification({
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
      }).catch((err) => console.warn('[Notification Error]', err.message));
    } else if (newStatus === 'arrived') {
      sendPatientNotification({
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
      }).catch((err) => console.warn('[Notification Error]', err.message));
    } else if (newStatus === 'completed') {
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
  }

  return visit;
};

// -----------------------------------------------------------------------------
// 4. Clinical Documentation & Vitals Recording
// -----------------------------------------------------------------------------
export const recordFieldVisitClinicalDoc = async (
  visitId: string,
  user: { _id: mongoose.Types.ObjectId; fullName: string; role: string },
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
  const visit = await getFieldVisitById(visitId, user);

  if (!docData.clinicalNotes?.trim() && !docData.vitals) {
    throw new AppError('Clinical observations or vital signs must be provided', 400);
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

  // If requested and valid, mark visit as completed (allow from any active operational state)
  if (docData.markAsCompleted && ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(visit.status)) {
    visit.status = 'completed';
    visit.timestamps.completedAt = new Date();
    visit.statusHistory.push({
      status: 'completed',
      changedBy: user._id,
      changedByRole: user.role,
      changedByName: user.fullName,
      timestamp: new Date(),
      notes: 'Clinical documentation signed and visit completed.',
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
  providerId?: string;
  hospitalId?: string;
  visitType?: string;
  search?: string;
  page?: number;
  limit?: number;
  requiresClinicalDoc?: boolean;
}) => {
  await seedDemoFieldVisitsIfEmpty();

  const query: any = {};

  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
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
  }
  if (filters.requiresClinicalDoc) {
    // Only visits that have at least one clinical documentation field populated
    query['clinicalDocumentation.signedAt'] = { $exists: true };
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


export const getAdminFieldOperationsStats = async () => {
  await seedDemoFieldVisitsIfEmpty();

  const todayStr = new Date().toISOString().slice(0, 10);

  const [
    totalVisits,
    todayCount,
    inProgressCount,
    completedTodayCount,
    overdueCount,
    exceptionsCount,
    pendingInstallationsCount,
  ] = await Promise.all([
    FieldVisit.countDocuments(),
    FieldVisit.countDocuments({ scheduledDate: todayStr }),
    FieldVisit.countDocuments({ status: { $in: ['en_route', 'arrived', 'in_progress'] } }),
    FieldVisit.countDocuments({ scheduledDate: todayStr, status: 'completed' }),
    FieldVisit.countDocuments({ scheduledDate: { $lt: todayStr }, status: { $nin: ['completed', 'cancelled'] } }),
    FieldVisit.countDocuments({ status: 'failed' }),
    FieldVisit.countDocuments({ visitType: 'equipment_installation', status: { $ne: 'completed' } }),
  ]);

  return {
    totalVisits,
    todayCount,
    inProgressCount,
    completedTodayCount,
    overdueCount,
    exceptionsCount,
    pendingInstallationsCount,
  };
};

export const assignOrReassignFieldVisitProvider = async (
  visitId: string,
  newProviderId: string,
  operatorUser: { _id: mongoose.Types.ObjectId; fullName: string; role: string },
  notes?: string,
  scheduledDate?: string,
  timeSlot?: string
): Promise<IFieldVisit> => {
  const visit = await FieldVisit.findById(visitId);
  if (!visit) {
    throw new AppError(`Field visit '${visitId}' not found`, 404);
  }

  if (visit.status === 'cancelled') {
    throw new AppError('Cannot reassign a visit that has been cancelled', 400);
  }

  const provider = await User.findById(newProviderId);
  if (!provider) {
    throw new AppError(`Provider '${newProviderId}' not found`, 404);
  }

  if (provider.status !== 'active') {
    throw new AppError(`Selected caregiver '${provider.fullName}' is ${provider.status || 'inactive'}. Please select an active caregiver.`, 400);
  }

  if (!['caregiver', 'nurse', 'professional'].includes(provider.role)) {
    throw new AppError(`User '${provider.fullName}' has role '${provider.role}' and cannot be assigned as a field caregiver`, 400);
  }

  const targetDate = (scheduledDate && scheduledDate.trim()) || visit.scheduledDate;
  const targetTimeSlot = (timeSlot && timeSlot.trim()) || visit.timeSlot;

  // Conflict check for target caregiver
  const conflictVisit = await FieldVisit.findOne({
    providerId: provider._id,
    _id: { $ne: visit._id },
    scheduledDate: targetDate,
    timeSlot: targetTimeSlot,
    status: { $in: ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'] },
  });

  if (conflictVisit) {
    throw new AppError(
      `Scheduling conflict: Caregiver ${provider.fullName} already has an active visit (${conflictVisit.visitNumber}) scheduled on ${targetDate} during ${targetTimeSlot}`,
      409
    );
  }

  const prevProviderId = visit.providerId;
  const prevProviderName = visit.providerName;
  const prevProviderPhone = visit.providerPhone;

  visit.providerId = provider._id;
  visit.providerName = provider.fullName;
  visit.providerPhone = provider.phone;
  visit.providerRole = provider.role === 'caregiver' ? 'Palliative Caregiver' : 'Registered Nurse';
  if (scheduledDate) visit.scheduledDate = scheduledDate.trim();
  if (timeSlot) visit.timeSlot = timeSlot.trim();

  // Reset status to 'assigned' if it was cancelled or failed
  if (['failed', 'cancelled'].includes(visit.status)) {
    visit.status = 'assigned';
  }

  const now = new Date();
  visit.statusHistory.push({
    status: visit.status,
    changedBy: operatorUser._id,
    changedByRole: operatorUser.role,
    changedByName: operatorUser.fullName,
    timestamp: now,
    notes: `Reassigned from ${prevProviderName} to ${provider.fullName}. Note: ${notes || 'Staff re-allocation'}`,
  });

  await visit.save();

  // Synchronize subscription primary caregiver if applicable
  if (visit.subscriptionId) {
    await CaregiverSubscription.updateOne(
      { _id: visit.subscriptionId },
      {
        $set: {
          assignedCaregiverId: provider._id,
          assignedCaregiverName: provider.fullName,
          assignedCaregiverPhone: provider.phone,
        },
      }
    ).catch(() => {});
  }

  // Audit Log
  await AuditLog.create({
    action: 'FIELD_VISIT_PROVIDER_REASSIGNED',
    category: 'field_operations',
    actorId: operatorUser._id,
    actorName: operatorUser.fullName,
    actorRole: operatorUser.role,
    targetType: 'FieldVisit',
    targetId: visit._id.toString(),
    details: {
      visitNumber: visit.visitNumber,
      previousProvider: prevProviderName,
      newProvider: provider.fullName,
      notes,
    },
    severity: 'info',
    timestamp: now,
  });

  // Notifications
  try {
    if (prevProviderId && prevProviderId.toString() !== provider._id.toString() && prevProviderPhone) {
      await NotificationLog.create({
        recipientPhone: prevProviderPhone,
        recipientName: prevProviderName || 'Caregiver',
        recipientRole: 'caregiver',
        channel: 'in_app',
        templateId: 'CAREGIVER_REASSIGNED_REMOVED',
        messageBody: `Notice: Visit ${visit.visitNumber} scheduled for ${targetDate} (${targetTimeSlot}) has been reassigned to another clinician.`,
        consentChecked: true,
        status: 'delivered',
        provider: 'in_app_system',
        idempotencyKey: `notif_reassign_prev_${visit._id}_${Date.now()}`,
        isRead: false,
        metadata: {
          visitId: visit._id.toString(),
          visitNumber: visit.visitNumber,
        },
      });
    }

    if (provider.phone) {
      await NotificationLog.create({
        recipientPhone: provider.phone,
        recipientName: provider.fullName,
        recipientRole: 'caregiver',
        channel: 'in_app',
        templateId: 'CAREGIVER_ASSIGNED_NEW',
        messageBody: `New Visit Assigned: You have been assigned to visit ${visit.visitNumber} for patient ${visit.patientDetails?.fullName} on ${targetDate} (${targetTimeSlot}).`,
        consentChecked: true,
        status: 'delivered',
        provider: 'in_app_system',
        idempotencyKey: `notif_reassign_new_${visit._id}_${provider._id}`,
        isRead: false,
        metadata: {
          visitId: visit._id.toString(),
          visitNumber: visit.visitNumber,
          targetDate,
          targetTimeSlot,
        },
      });
    }

    if (visit.patientDetails?.phone) {
      await NotificationLog.create({
        recipientPhone: visit.patientDetails.phone,
        recipientName: visit.patientDetails.fullName,
        recipientRole: 'patient',
        channel: 'in_app',
        templateId: 'CAREGIVER_REASSIGNED_PATIENT',
        messageBody: `Caregiver Update: Your assigned caregiver for visit ${visit.visitNumber} on ${targetDate} is now ${provider.fullName} (${provider.phone ? `+91 ${provider.phone}` : ''}).`,
        consentChecked: true,
        status: 'delivered',
        provider: 'in_app_system',
        idempotencyKey: `notif_reassign_pat_${visit._id}_${provider._id}`,
        isRead: false,
        metadata: {
          visitId: visit._id.toString(),
          visitNumber: visit.visitNumber,
          caregiverName: provider.fullName,
          caregiverPhone: provider.phone,
        },
      });
    }
  } catch (notifErr: any) {
    console.warn('[NotificationLog] Failed to record reassignment notifications:', notifErr.message);
  }

  return visit;
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

  return { visit, subscription: sub };
};


