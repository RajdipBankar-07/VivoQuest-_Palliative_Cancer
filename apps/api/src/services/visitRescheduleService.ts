import mongoose from 'mongoose';
import { FieldVisit, IFieldVisit } from '../models/FieldVisit.js';
import { VisitRescheduleRequest, IVisitRescheduleRequest, RescheduleRequestStatus } from '../models/VisitRescheduleRequest.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { AppError } from '../middleware/errorHandler.js';

export interface UserContext {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  phone: string;
  role: string;
}

// Helper to normalize phone number variations
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
 * Submit a visit rescheduling request for an eligible upcoming visit.
 * Strictly checks patient ownership, prevents duplicate pending requests,
 * and leaves the original FieldVisit schedule completely unchanged.
 */
export const submitRescheduleRequest = async (
  visitId: string,
  requestedDate: string,
  requestedTimeSlot: string,
  reason: string,
  user: UserContext
): Promise<IVisitRescheduleRequest> => {
  if (!mongoose.Types.ObjectId.isValid(visitId)) {
    throw new AppError('Invalid field visit identifier', 400);
  }

  const visit = await FieldVisit.findById(visitId);
  if (!visit) {
    throw new AppError('Field visit not found', 404);
  }

  // 1. Enforce Patient Authorization: only allowed for patient's own visits
  if (user.role === 'patient') {
    const userPhoneVariants = getPhoneVariants(user.phone);
    const visitPhone = visit.patientDetails?.phone || '';
    const phoneMatches = userPhoneVariants.includes(visitPhone);
    const idMatches = visit.patientId && visit.patientId.toString() === user._id.toString();

    if (!idMatches && !phoneMatches) {
      throw new AppError('Forbidden: Patients are strictly authorized to request rescheduling only for their own visits', 403);
    }
  }

  // 2. Prevent rescheduling completed, cancelled, or failed visits
  if (['completed', 'cancelled', 'failed'].includes(visit.status)) {
    throw new AppError(`Cannot reschedule a visit with status '${visit.status}'. Only active upcoming visits are eligible.`, 400);
  }

  // 3. Validate Requested Date (must be YYYY-MM-DD and in the future)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    throw new AppError('Requested date must be in YYYY-MM-DD format', 400);
  }

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  if (requestedDate < todayStr) {
    throw new AppError('Requested reschedule date must be in the future', 400);
  }

  // 4. Validate Requested Time Slot
  if (!requestedTimeSlot || !requestedTimeSlot.trim()) {
    throw new AppError('Requested time slot is required', 400);
  }

  // 5. Validate Reason
  if (!reason || reason.trim().length < 3) {
    throw new AppError('Please provide a reason for rescheduling (at least 3 characters)', 400);
  }

  // 6. Prevent Duplicate Pending Request for the Same Visit
  const existingPending = await VisitRescheduleRequest.findOne({
    visitId: visit._id,
    status: 'pending',
  });
  if (existingPending) {
    throw new AppError(
      'A pending rescheduling request already exists for this visit. Please wait for care coordinator review or cancel your current request before submitting a new one.',
      409
    );
  }

  // 7. Create Reschedule Request Record
  const newRequest = await VisitRescheduleRequest.create({
    visitId: visit._id,
    visitNumber: visit.visitNumber,
    patientId: visit.patientId || user._id,
    patientName: visit.patientDetails?.fullName || user.fullName,
    patientPhone: visit.patientDetails?.phone || user.phone,
    providerId: visit.providerId,
    providerName: visit.providerName,
    providerRole: visit.providerRole,
    providerPhone: visit.providerPhone,
    requestedBy: user._id,
    requesterRole: user.role,
    requesterName: user.fullName,
    originalSchedule: {
      scheduledDate: visit.scheduledDate,
      timeSlot: visit.timeSlot,
    },
    requestedSchedule: {
      scheduledDate: requestedDate,
      timeSlot: requestedTimeSlot.trim(),
    },
    reason: reason.trim(),
    status: 'pending',
    statusHistory: [
      {
        status: 'pending',
        changedBy: user._id,
        changedByRole: user.role,
        changedByName: user.fullName,
        timestamp: new Date(),
        reason: 'Initial patient rescheduling request submitted',
      },
    ],
  });

  // 8. Log Audit Event
  await AuditLog.create({
    action: 'VISIT_RESCHEDULE_REQUESTED',
    category: 'field_operations',
    actorId: user._id,
    actorName: user.fullName,
    actorRole: user.role,
    targetType: 'FieldVisit',
    targetId: visit.visitNumber,
    severity: 'info',
    timestamp: new Date(),
    details: {
      requestId: newRequest._id.toString(),
      visitId: visit._id.toString(),
      visitNumber: visit.visitNumber,
      originalSchedule: newRequest.originalSchedule,
      requestedSchedule: newRequest.requestedSchedule,
      reason: newRequest.reason,
    },
  }).catch((err) => {
    console.warn('[AuditLog] Failed to log reschedule request:', err.message);
  });

  // 9. Dispatch In-App Persistent Notifications (Deduplicated via idempotencyKey)
  try {
    const adminKey = `notif_resched_req_admin_${newRequest._id}`;
    await NotificationLog.findOneAndUpdate(
      { idempotencyKey: adminKey },
      {
        $setOnInsert: {
          recipientPhone: 'ADMIN_DESK',
          recipientName: 'VivoQuest Clinical Care Desk',
          recipientRole: 'admin',
          channel: 'in_app',
          templateId: 'VISIT_RESCHEDULE_REQUESTED',
          messageBody: `Reschedule Requested: Patient ${newRequest.patientName} (+91 ${newRequest.patientPhone}) requested rescheduling for visit ${visit.visitNumber} to ${requestedDate} (${requestedTimeSlot.trim()}). Reason: "${reason.trim()}".`,
          consentChecked: true,
          status: 'delivered',
          provider: 'in_app_system',
          idempotencyKey: adminKey,
          isRead: false,
          metadata: {
            requestId: newRequest._id.toString(),
            visitId: visit._id.toString(),
            visitNumber: visit.visitNumber,
            patientName: newRequest.patientName,
            patientPhone: newRequest.patientPhone,
            requestedDate,
            requestedTimeSlot: requestedTimeSlot.trim(),
            originalDate: visit.scheduledDate,
            originalTimeSlot: visit.timeSlot,
            reason: reason.trim(),
          },
        },
      },
      { upsert: true, new: true }
    );

    if (visit.providerPhone) {
      const cgKey = `notif_resched_req_cg_${newRequest._id}`;
      await NotificationLog.findOneAndUpdate(
        { idempotencyKey: cgKey },
        {
          $setOnInsert: {
            recipientPhone: visit.providerPhone,
            recipientName: visit.providerName || 'Assigned Caregiver',
            recipientRole: 'caregiver',
            channel: 'in_app',
            templateId: 'VISIT_RESCHEDULE_REQUESTED',
            messageBody: `Reschedule Requested: Visit ${visit.visitNumber} for ${newRequest.patientName} has a requested date change to ${requestedDate} (${requestedTimeSlot.trim()}).`,
            consentChecked: true,
            status: 'delivered',
            provider: 'in_app_system',
            idempotencyKey: cgKey,
            isRead: false,
            metadata: {
              requestId: newRequest._id.toString(),
              visitNumber: visit.visitNumber,
              requestedDate,
              requestedTimeSlot: requestedTimeSlot.trim(),
            },
          },
        },
        { upsert: true, new: true }
      );
    }
  } catch (notifErr: any) {
    console.warn('[NotificationLog] Failed to record reschedule request notification:', notifErr.message);
  }

  return newRequest;
};

/**
 * Retrieve rescheduling requests for the authenticated patient.
 */
export const getPatientRescheduleRequests = async (
  patientUserId: string,
  patientPhone?: string
): Promise<IVisitRescheduleRequest[]> => {
  if (!mongoose.Types.ObjectId.isValid(patientUserId)) {
    throw new AppError('Invalid patient identifier', 400);
  }

  const patientObjId = new mongoose.Types.ObjectId(patientUserId);
  const phoneVariants = getPhoneVariants(patientPhone);

  const orConditions: any[] = [{ patientId: patientObjId }, { requestedBy: patientObjId }];
  if (phoneVariants.length > 0) {
    orConditions.push({ patientPhone: { $in: phoneVariants } });
  }

  return await VisitRescheduleRequest.find({ $or: orConditions })
    .sort({ createdAt: -1 })
    .lean() as any;
};

/**
 * Allow a patient to cancel their own pending rescheduling request.
 */
export const cancelRescheduleRequest = async (
  requestId: string,
  user: UserContext
): Promise<IVisitRescheduleRequest> => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new AppError('Invalid reschedule request identifier', 400);
  }

  const reqDoc = await VisitRescheduleRequest.findById(requestId);
  if (!reqDoc) {
    throw new AppError('Reschedule request not found', 404);
  }

  // Authorization check
  if (user.role === 'patient') {
    const isOwner =
      reqDoc.patientId.toString() === user._id.toString() ||
      reqDoc.requestedBy.toString() === user._id.toString();
    if (!isOwner) {
      throw new AppError('Forbidden: You can only cancel your own rescheduling requests', 403);
    }
  }

  if (reqDoc.status !== 'pending') {
    throw new AppError(`Cannot cancel a request that is already ${reqDoc.status}`, 400);
  }

  // Atomic conditional transition
  const updated = await VisitRescheduleRequest.findOneAndUpdate(
    { _id: reqDoc._id, status: 'pending' },
    {
      $set: { status: 'cancelled' },
      $push: {
        statusHistory: {
          status: 'cancelled',
          changedBy: user._id,
          changedByRole: user.role,
          changedByName: user.fullName,
          timestamp: new Date(),
          reason: 'Cancelled by patient',
        },
      },
    },
    { new: true }
  );

  if (!updated) {
    throw new AppError('Concurrency conflict: The request status was already changed by another action.', 409);
  }

  // Audit event
  await AuditLog.create({
    action: 'VISIT_RESCHEDULE_CANCELLED',
    category: 'field_operations',
    actorId: user._id,
    actorName: user.fullName,
    actorRole: user.role,
    targetType: 'FieldVisit',
    targetId: updated.visitNumber,
    severity: 'info',
    timestamp: new Date(),
    details: {
      requestId: updated._id.toString(),
      visitNumber: updated.visitNumber,
    },
  }).catch(() => {});

  return updated;
};

/**
 * Retrieve pending rescheduling requests for authorized approver (caregiver or admin).
 * Caregivers receive requests strictly for their assigned patients/dispatches.
 */
export const getPendingRescheduleRequestsForApprover = async (
  approverId: string,
  approverRole: string,
  statusFilter = 'pending'
): Promise<IVisitRescheduleRequest[]> => {
  const query: any = {};
  if (statusFilter && statusFilter !== 'all') {
    query.status = statusFilter;
  }

  // Restrict caregiver to their assigned visits
  if (['professional', 'caregiver'].includes(approverRole)) {
    query.providerId = new mongoose.Types.ObjectId(approverId);
  } else if (!['admin', 'super_admin'].includes(approverRole)) {
    throw new AppError(`Forbidden: Role '${approverRole}' cannot review reschedule requests`, 403);
  }

  return await VisitRescheduleRequest.find(query).sort({ createdAt: 1 }).lean() as any;
};

/**
 * Approve a visit rescheduling request.
 * CRITICAL SCHEDULING AND CONCURRENCY CHECKS:
 * 1. Checks that the visit is still eligible.
 * 2. Checks caregiver availability and detects overlapping visits for the requested slot.
 * 3. Applies atomic update to request status and updates the FieldVisit schedule.
 * 4. Ensures idempotency and rollback safety.
 */
export const approveRescheduleRequest = async (
  requestId: string,
  user: UserContext
): Promise<{ request: IVisitRescheduleRequest; visit: IFieldVisit }> => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new AppError('Invalid reschedule request identifier', 400);
  }

  const reqDoc = await VisitRescheduleRequest.findById(requestId);
  if (!reqDoc) {
    throw new AppError('Reschedule request not found', 404);
  }

  // Authorization check: Only assigned caregiver or admin may approve
  if (user.role === 'patient') {
    throw new AppError('Forbidden: Patients cannot approve rescheduling requests', 403);
  }

  if (['professional', 'caregiver'].includes(user.role)) {
    if (reqDoc.providerId.toString() !== user._id.toString()) {
      throw new AppError('Forbidden: You are not authorized to approve rescheduling for a visit not assigned to you', 403);
    }
  } else if (!['admin', 'super_admin'].includes(user.role)) {
    throw new AppError(`Forbidden: Role '${user.role}' cannot approve reschedule requests`, 403);
  }

  // Idempotency check: if already approved, return current records
  if (reqDoc.status === 'approved') {
    const existingVisit = await FieldVisit.findById(reqDoc.visitId);
    return { request: reqDoc, visit: existingVisit! };
  }

  if (reqDoc.status !== 'pending') {
    throw new AppError(`Cannot approve a request that is currently '${reqDoc.status}'`, 400);
  }

  // 1. Revalidate Visit Eligibility
  const visit = await FieldVisit.findById(reqDoc.visitId);
  if (!visit) {
    throw new AppError('Associated field visit not found', 404);
  }

  if (['completed', 'cancelled', 'failed'].includes(visit.status)) {
    throw new AppError(`Cannot reschedule visit because it is already '${visit.status}'`, 400);
  }

  // 2. CONFLICT CHECK: Check for overlapping active visits for the assigned caregiver
  const conflictVisit = await FieldVisit.findOne({
    providerId: reqDoc.providerId,
    _id: { $ne: visit._id }, // Exclude the visit itself
    scheduledDate: reqDoc.requestedSchedule.scheduledDate,
    timeSlot: reqDoc.requestedSchedule.timeSlot,
    status: { $in: ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'] },
  });

  if (conflictVisit) {
    throw new AppError(
      `Scheduling conflict: Caregiver ${reqDoc.providerName} already has an active visit (${conflictVisit.visitNumber}) scheduled on ${reqDoc.requestedSchedule.scheduledDate} during ${reqDoc.requestedSchedule.timeSlot}. Rescheduling approval rejected.`,
      409
    );
  }

  // 3. Atomic Conditional Transition on the Request
  const updatedReq = await VisitRescheduleRequest.findOneAndUpdate(
    { _id: reqDoc._id, status: 'pending' },
    {
      $set: {
        status: 'approved',
        resolvedBy: user._id,
        resolverRole: user.role,
        resolverName: user.fullName,
        resolvedAt: new Date(),
      },
      $push: {
        statusHistory: {
          status: 'approved',
          changedBy: user._id,
          changedByRole: user.role,
          changedByName: user.fullName,
          timestamp: new Date(),
          reason: 'Rescheduling request approved by authorized care team',
        },
      },
    },
    { new: true }
  );

  if (!updatedReq) {
    throw new AppError('Concurrency conflict: This request was already updated or cancelled by another action.', 409);
  }

  // 4. Update the FieldVisit Schedule Atomically
  try {
    const updatedVisit = await FieldVisit.findOneAndUpdate(
      { _id: visit._id },
      {
        $set: {
          scheduledDate: reqDoc.requestedSchedule.scheduledDate,
          timeSlot: reqDoc.requestedSchedule.timeSlot,
        },
        $push: {
          statusHistory: {
            status: visit.status,
            changedBy: user._id,
            changedByRole: user.role,
            changedByName: user.fullName,
            timestamp: new Date(),
            reason: `Rescheduled from ${reqDoc.originalSchedule.scheduledDate} (${reqDoc.originalSchedule.timeSlot}) to ${reqDoc.requestedSchedule.scheduledDate} (${reqDoc.requestedSchedule.timeSlot})`,
            notes: reqDoc.reason,
          },
        },
      },
      { new: true }
    );

    // 5. Audit Log Event
    await AuditLog.create({
      action: 'VISIT_RESCHEDULE_APPROVED',
      category: 'field_operations',
      actorId: user._id,
      actorName: user.fullName,
      actorRole: user.role,
      targetType: 'FieldVisit',
      targetId: visit.visitNumber,
      severity: 'info',
      timestamp: new Date(),
      details: {
        requestId: updatedReq._id.toString(),
        visitNumber: visit.visitNumber,
        originalSchedule: reqDoc.originalSchedule,
        approvedSchedule: reqDoc.requestedSchedule,
        approvedBy: user.fullName,
      },
    }).catch(() => {});

    // 6. Dispatch Notifications to Patient and Caregiver
    try {
      const patientKey = `notif_resched_appr_pat_${updatedReq._id}`;
      await NotificationLog.findOneAndUpdate(
        { idempotencyKey: patientKey },
        {
          $setOnInsert: {
            recipientPhone: reqDoc.patientPhone,
            recipientName: reqDoc.patientName,
            recipientRole: 'patient',
            channel: 'in_app',
            templateId: 'VISIT_RESCHEDULE_APPROVED',
            messageBody: `Your reschedule request for visit ${visit.visitNumber} has been APPROVED! New confirmed appointment: ${reqDoc.requestedSchedule.scheduledDate} (${reqDoc.requestedSchedule.timeSlot}) with ${reqDoc.providerName}.`,
            consentChecked: true,
            status: 'delivered',
            provider: 'in_app_system',
            idempotencyKey: patientKey,
            isRead: false,
            metadata: {
              requestId: updatedReq._id.toString(),
              visitNumber: visit.visitNumber,
              newDate: reqDoc.requestedSchedule.scheduledDate,
              newTimeSlot: reqDoc.requestedSchedule.timeSlot,
              approvedBy: user.fullName,
            },
          },
        },
        { upsert: true, new: true }
      );

      if (reqDoc.providerPhone) {
        const cgKey = `notif_resched_appr_cg_${updatedReq._id}`;
        await NotificationLog.findOneAndUpdate(
          { idempotencyKey: cgKey },
          {
            $setOnInsert: {
              recipientPhone: reqDoc.providerPhone,
              recipientName: reqDoc.providerName,
              recipientRole: 'caregiver',
              channel: 'in_app',
              templateId: 'VISIT_RESCHEDULE_APPROVED',
              messageBody: `Schedule Updated: Visit ${visit.visitNumber} for ${reqDoc.patientName} has been rescheduled to ${reqDoc.requestedSchedule.scheduledDate} (${reqDoc.requestedSchedule.timeSlot}).`,
              consentChecked: true,
              status: 'delivered',
              provider: 'in_app_system',
              idempotencyKey: cgKey,
              isRead: false,
              metadata: {
                requestId: updatedReq._id.toString(),
                visitNumber: visit.visitNumber,
                newDate: reqDoc.requestedSchedule.scheduledDate,
                newTimeSlot: reqDoc.requestedSchedule.timeSlot,
              },
            },
          },
          { upsert: true, new: true }
        );
      }
    } catch (notifErr: any) {
      console.warn('[NotificationLog] Failed to record reschedule approval notification:', notifErr.message);
    }

    return { request: updatedReq, visit: updatedVisit! };
  } catch (err: any) {
    // Rollback compensation in standalone mongod if visit update fails
    await VisitRescheduleRequest.updateOne(
      { _id: reqDoc._id },
      {
        $set: { status: 'pending', resolvedBy: null, resolverRole: null, resolverName: null, resolvedAt: null },
        $pop: { statusHistory: 1 },
      }
    );
    throw new AppError(`Failed to update field visit schedule: ${err.message}`, 500);
  }
};

/**
 * Reject a visit rescheduling request with mandatory reason.
 * Leaves the original FieldVisit schedule completely unchanged.
 */
export const rejectRescheduleRequest = async (
  requestId: string,
  rejectionReason: string,
  user: UserContext
): Promise<IVisitRescheduleRequest> => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new AppError('Invalid reschedule request identifier', 400);
  }

  if (!rejectionReason || !rejectionReason.trim()) {
    throw new AppError('Please provide a reason for rejecting the rescheduling request', 400);
  }

  const reqDoc = await VisitRescheduleRequest.findById(requestId);
  if (!reqDoc) {
    throw new AppError('Reschedule request not found', 404);
  }

  // Authorization check
  if (user.role === 'patient') {
    throw new AppError('Forbidden: Patients cannot reject rescheduling requests', 403);
  }

  if (['professional', 'caregiver'].includes(user.role)) {
    if (reqDoc.providerId.toString() !== user._id.toString()) {
      throw new AppError('Forbidden: You are not authorized to review a request for a visit not assigned to you', 403);
    }
  } else if (!['admin', 'super_admin'].includes(user.role)) {
    throw new AppError(`Forbidden: Role '${user.role}' cannot review reschedule requests`, 403);
  }

  if (reqDoc.status !== 'pending') {
    throw new AppError(`Cannot reject a request that is currently '${reqDoc.status}'`, 400);
  }

  // Atomic conditional transition
  const updatedReq = await VisitRescheduleRequest.findOneAndUpdate(
    { _id: reqDoc._id, status: 'pending' },
    {
      $set: {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        resolvedBy: user._id,
        resolverRole: user.role,
        resolverName: user.fullName,
        resolvedAt: new Date(),
      },
      $push: {
        statusHistory: {
          status: 'rejected',
          changedBy: user._id,
          changedByRole: user.role,
          changedByName: user.fullName,
          timestamp: new Date(),
          reason: `Rejected: ${rejectionReason.trim()}`,
        },
      },
    },
    { new: true }
  );

  if (!updatedReq) {
    throw new AppError('Concurrency conflict: This request was already updated or cancelled by another action.', 409);
  }

  // Log Audit Event
  await AuditLog.create({
    action: 'VISIT_RESCHEDULE_REJECTED',
    category: 'field_operations',
    actorId: user._id,
    actorName: user.fullName,
    actorRole: user.role,
    targetType: 'FieldVisit',
    targetId: reqDoc.visitNumber,
    severity: 'info',
    timestamp: new Date(),
    details: {
      requestId: updatedReq._id.toString(),
      visitNumber: reqDoc.visitNumber,
      rejectionReason: rejectionReason.trim(),
      rejectedBy: user.fullName,
    },
  }).catch(() => {});

  // Dispatch Notification to Patient
  try {
    const patientKey = `notif_resched_rej_pat_${updatedReq._id}`;
    await NotificationLog.findOneAndUpdate(
      { idempotencyKey: patientKey },
      {
        $setOnInsert: {
          recipientPhone: reqDoc.patientPhone,
          recipientName: reqDoc.patientName,
          recipientRole: 'patient',
          channel: 'in_app',
          templateId: 'VISIT_RESCHEDULE_REJECTED',
          messageBody: `Your reschedule request for visit ${reqDoc.visitNumber} was not approved: "${rejectionReason.trim()}". Your original confirmed appointment (${reqDoc.originalSchedule.scheduledDate}, ${reqDoc.originalSchedule.timeSlot}) remains active.`,
          consentChecked: true,
          status: 'delivered',
          provider: 'in_app_system',
          idempotencyKey: patientKey,
          isRead: false,
          metadata: {
            requestId: updatedReq._id.toString(),
            visitNumber: reqDoc.visitNumber,
            rejectionReason: rejectionReason.trim(),
            rejectedBy: user.fullName,
          },
        },
      },
      { upsert: true, new: true }
    );
  } catch (notifErr: any) {
    console.warn('[NotificationLog] Failed to record reschedule rejection notification:', notifErr.message);
  }

  return updatedReq;
};
