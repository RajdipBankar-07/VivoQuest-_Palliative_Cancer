import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticateUser, AuthRequest, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  listProviderFieldVisits,
  getFieldVisitById,
  updateFieldVisitStatus,
  recordFieldVisitClinicalDoc,
  reportFieldVisitException,
  verifyEquipmentInstallation,
  failOrRescheduleInstallation,
  processSyncBatch,
} from '../services/fieldOperationsService.js';
import { FieldVisitStatus, VisitExceptionType } from '../models/FieldVisit.js';

const router = Router();

/**
 * GET /api/v1/visits/provider/me
 * Retrieve assigned field visits for the authenticated healthcare provider
 */
router.get(
  '/provider/me',
  authenticateUser,
  requireRole(['professional', 'admin', 'super_admin']),
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
  requireRole(['professional', 'admin', 'super_admin']),
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
 * POST /api/v1/visits/:id/documentation
 * Record structured clinical observations, vitals, procedures, and recommendations
 */
router.post(
  '/:id/documentation',
  authenticateUser,
  requireRole(['professional', 'admin', 'super_admin']),
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
 * POST /api/v1/visits/:id/exception
 * Report visit exception (patient unavailable, care refused, access blocked)
 */
router.post(
  '/:id/exception',
  authenticateUser,
  requireRole(['professional', 'admin', 'super_admin']),
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
  requireRole(['professional', 'admin', 'super_admin']),
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

export const fieldVisitRoutes = router;

