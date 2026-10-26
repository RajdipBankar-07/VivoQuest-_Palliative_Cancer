import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticateUser, AuthRequest, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  listProviderFieldVisits,
  getFieldVisitById,
  updateFieldVisitStatus,
  acceptFieldVisitAssignment,
  rejectFieldVisitAssignment,
  recordFieldVisitClinicalDoc,
  generateFieldVisitReportDownload,
  adminEditFieldVisitClinicalDoc,
  adminSoftDeleteFieldVisitClinicalDoc,
  reportFieldVisitException,
  verifyEquipmentInstallation,
  failOrRescheduleInstallation,
  processSyncBatch,
  scheduleVisitForSubscription,
  hideProviderFieldVisit,
} from '../services/fieldOperationsService.js';
import { getCaregiverAssignedPatients, deleteOrHideCareReport } from '../services/patientService.js';
import {
  getPendingRescheduleRequestsForApprover,
  approveRescheduleRequest,
  rejectRescheduleRequest,
  hideRescheduleRequest,
} from '../services/visitRescheduleService.js';
import { FieldVisitStatus, VisitExceptionType } from '../models/FieldVisit.js';

const router = Router();

/**
 * GET /api/v1/visits/provider/me
 * Retrieve assigned field visits for the authenticated healthcare provider
 */
router.get(
  '/provider/me',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { status, date, search, page, limit } = req.query;

      const result = await listProviderFieldVisits(user._id.toString(), user.role, {
        status: status as string,
        date: date as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.status(200).json({
        success: true,
        count: result.visits.length,
        pagination: result.pagination,
        data: result.visits,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/visits/provider/assigned-patients
 * Retrieve list of distinct patients actively assigned to the authenticated provider
 */
router.get(
  '/provider/assigned-patients',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const includeInactive = req.query.includeInactive === 'true';

      const result = await getCaregiverAssignedPatients(user._id.toString(), user.role, {
        includeInactive,
      });

      res.status(200).json({
        success: true,
        count: result.count,
        data: result.patients,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/visits/reschedule-requests
 * Retrieve pending reschedule requests for the authenticated caregiver/approver
 */
router.get(
  '/reschedule-requests',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const statusFilter = (req.query.status as string) || 'pending';
      const requests = await getPendingRescheduleRequestsForApprover(
        user._id.toString(),
        user.role,
        statusFilter
      );

      res.status(200).json({
        success: true,
        count: requests.length,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/visits/reschedule-requests/:requestId/approve
 * Approve a visit rescheduling request with scheduling conflict check
 */
router.post(
  '/reschedule-requests/:requestId/approve',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { requestId } = req.params;

      const result = await approveRescheduleRequest(requestId, {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
      });

      res.status(200).json({
        success: true,
        message: 'Rescheduling request approved successfully and field visit schedule updated.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/visits/reschedule-requests/:requestId/reject
 * Reject a visit rescheduling request with mandatory rejection reason
 */
router.post(
  '/reschedule-requests/:requestId/reject',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { requestId } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length < 3) {
        throw new AppError('Please provide a valid rejection reason (at least 3 characters)', 400);
      }

      const result = await rejectRescheduleRequest(requestId, rejectionReason.trim(), {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
      });

      res.status(200).json({
        success: true,
        message: 'Rescheduling request rejected. Original visit schedule remains unchanged.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/visits/:id
 * Retrieve single field visit with strict access control
 */
router.get(
  '/:id',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new AppError('Invalid field visit ID', 400);
      }
      const visit = await getFieldVisitById(req.params.id, user);

      res.status(200).json({
        success: true,
        data: visit,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/visits/:id/status
 * Advance visit fulfillment status along permitted lifecycle:
 * assigned -> accepted -> en_route -> arrived -> in_progress -> completed
 */
router.patch(
  '/:id/status',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { status, notes, location } = req.body;

      if (!status) {
        throw new AppError("Field 'status' is required", 400);
      }

      const updated = await updateFieldVisitStatus(
        req.params.id,
        status as FieldVisitStatus,
        user,
        { notes, location }
      );

      res.status(200).json({
        success: true,
        message: `Field visit transitioned to '${status}' successfully`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/visits/:id/accept
 * Caregiver accepts assigned field visit
 */
router.post(
  '/:id/accept',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const updated = await acceptFieldVisitAssignment(req.params.id, {
        _id: user._id,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
      });

      res.status(200).json({
        success: true,
        message: 'Field visit assignment accepted successfully.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/visits/:id/reject
 * Caregiver rejects assigned field visit with mandatory reason
 */
router.post(
  '/:id/reject',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const reason = req.body.reason || req.body.rejectionReason;

      const updated = await rejectFieldVisitAssignment(req.params.id, reason, {
        _id: user._id,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
      });

      res.status(200).json({
        success: true,
        message: 'Field visit assignment rejected. Operational desk notified.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/visits/:id/documentation
 * Record structured clinical observations, vitals, procedures, and recommendations
 */
router.post(
  '/:id/documentation',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const {
        vitals,
        clinicalNotes,
        proceduresPerformed,
        medicationsAdministered,
        recommendations,
        followUpDate,
        markAsCompleted,
      } = req.body;

      const updated = await recordFieldVisitClinicalDoc(req.params.id, user, {
        vitals,
        clinicalNotes,
        proceduresPerformed,
        medicationsAdministered,
        recommendations,
        followUpDate,
        markAsCompleted: Boolean(markAsCompleted),
      });

      res.status(200).json({
        success: true,
        message: 'Clinical visit documentation and vitals recorded successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/visits/:id/report/download
 * Download or view printable clinical care report (HTML/PDF printable or JSON)
 */
router.get(
  '/:id/report/download',
  authenticateUser,
  requireRole(['patient', 'caregiver', 'professional', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const format = (req.query.format as string) || (req.headers.accept?.includes('application/json') ? 'json' : 'html');
      const result = await generateFieldVisitReportDownload(req.params.id, {
        _id: user._id,
        role: user.role,
        fullName: user.fullName,
      }, format);

      if (result.format === 'html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${result.filename}"`);
        res.send(result.data);
      } else {
        res.status(200).json({
          success: true,
          data: result.data,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/visits/:id/documentation
 * Admin edit clinical documentation with mandatory reason and version history
 */
router.patch(
  '/:id/documentation',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const editReason = req.body.editReason || req.body.reason;
      const { clinicalNotes, vitals, proceduresPerformed, medicationsAdministered, recommendations, followUpDate } = req.body;
      const updated = await adminEditFieldVisitClinicalDoc(req.params.id, {
        _id: user._id,
        role: user.role,
        fullName: user.fullName,
      }, {
        editReason,
        clinicalNotes,
        vitals,
        proceduresPerformed,
        medicationsAdministered,
        recommendations,
        followUpDate,
      });

      res.status(200).json({
        success: true,
        message: 'Clinical visit documentation amended with audit trail',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/visits/:id/documentation
 * Caregiver/Admin soft-delete clinical documentation with mandatory audit reason.
 * Enforces role and assignment authorization.
 */
router.delete(
  '/:id/documentation',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { reason } = req.body;
      const result = await deleteOrHideCareReport(req.params.id, user, reason);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/visits/:id/report
 * Caregiver/Admin soft-delete clinical care report
 */
router.delete(
  '/:id/report',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { reason } = req.body;
      const result = await deleteOrHideCareReport(req.params.id, user, reason);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/visits/reports/:reportId
 * Caregiver/Admin soft-delete clinical care report by report identifier
 */
router.delete(
  '/reports/:reportId',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { reason } = req.body;
      const result = await deleteOrHideCareReport(req.params.reportId, user, reason);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/visits/:id/hide
 * Hide a visit entry from caregiver's assigned view without cancelling or modifying the schedule
 */
router.delete(
  '/:id/hide',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { reason } = req.body;
      const result = await hideProviderFieldVisit(req.params.id, user, reason);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/visits/reschedule-requests/:requestId
 * Hide reschedule request from caregiver/admin view
 */
router.delete(
  '/reschedule-requests/:requestId',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { reason } = req.body;
      const result = await hideRescheduleRequest(
        req.params.requestId,
        {
          _id: user._id,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
        },
        reason
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/visits/:id/exception
 * Report visit exception (patient unavailable, care refused, access blocked)
 */
router.post(
  '/:id/exception',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { exceptionType, reason, notes, rescheduleDate } = req.body;

      if (!exceptionType || !reason) {
        throw new AppError("Fields 'exceptionType' and 'reason' are required", 400);
      }

      const updated = await reportFieldVisitException(req.params.id, user, {
        exceptionType: exceptionType as VisitExceptionType,
        reason,
        notes,
        rescheduleDate,
      });

      res.status(200).json({
        success: true,
        message: `Visit exception '${exceptionType}' recorded and escalated`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/visits/:id/installation-verify
 * Complete medical equipment verification, checklist, and serial number verification
 */
router.post(
  '/:id/installation-verify',
  authenticateUser,
  requireRole(['professional', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const {
        equipmentItems,
        barcodeScanVerified,
        barcodeRawData,
        patientAcknowledged,
        patientOrCaregiverName,
        consentObtained,
        evidenceNotes,
        installationNotes,
      } = req.body;

      const updated = await verifyEquipmentInstallation(req.params.id, user, {
        equipmentItems,
        barcodeScanVerified: Boolean(barcodeScanVerified),
        barcodeRawData,
        patientAcknowledged: Boolean(patientAcknowledged),
        patientOrCaregiverName,
        consentObtained: Boolean(consentObtained),
        evidenceNotes,
        installationNotes,
      });

      res.status(200).json({
        success: true,
        message: 'Medical equipment installation and serial numbers verified on-site',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/visits/:id/installation-fail
 * Report failed equipment installation or request rescheduling
 */
router.post(
  '/:id/installation-fail',
  authenticateUser,
  requireRole(['professional', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { failedReason, escalatedToAdmin, rescheduledToDate, notes } = req.body;

      if (!failedReason) {
        throw new AppError("Field 'failedReason' is required", 400);
      }

      const updated = await failOrRescheduleInstallation(req.params.id, user, {
        failedReason,
        escalatedToAdmin: Boolean(escalatedToAdmin),
        rescheduledToDate,
        notes,
      });

      res.status(200).json({
        success: true,
        message: 'Installation failure recorded and escalated for administrative rescheduling',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/visits/sync
 * Secure batch sync endpoint for offline clinician documentation, vitals, and checklists
 */
router.post(
  '/sync',
  authenticateUser,
  requireRole(['professional', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { operations } = req.body;

      if (!Array.isArray(operations) || operations.length === 0) {
        throw new AppError("Request body must contain an 'operations' array with at least one item", 400);
      }

      const result = await processSyncBatch(user, operations);

      res.status(200).json({
        success: true,
        message: `Offline sync processed: ${result.summary.applied} applied, ${result.summary.conflicts} conflicts, ${result.summary.failed} failed`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/visits/schedule
 * Schedule and confirm an authorized field visit for an active caregiver subscription
 */
router.post(
  '/schedule',
  authenticateUser,
  requireRole(['admin', 'super_admin', 'professional']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { subscriptionId, scheduledDate, timeSlot, visitType, providerId, instructions, idempotencyKey } = req.body;
      const result = await scheduleVisitForSubscription(
        {
          subscriptionId,
          scheduledDate,
          timeSlot,
          visitType,
          providerId,
          instructions,
          idempotencyKey,
        },
        req.user!
      );

      res.status(201).json({
        success: true,
        message: 'Visit scheduled and confirmed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const fieldVisitRoutes = router;

