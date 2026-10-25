import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authenticateUser, optionalAuthenticateUser, requireRole, AuthRequest } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { DailyHealthUpdate } from '../models/DailyHealthUpdate.js';
import { Appointment } from '../models/Appointment.js';
import { evaluateClinicalRisk } from '../services/clinicalRiskService.js';
import {
  getPatientSubscriptions,
  getPublicCaregiverPlans,
  getPatientCareReports,
  getCaregiverAssignedPatients,
  getAuthorizedPatientDetails,
  getPatientAssignedCaregiver,
  getPatientVisitSchedule,
  verifyCaregiverPatientAssignment,
} from '../services/patientService.js';
import {
  submitRescheduleRequest,
  getPatientRescheduleRequests,
  cancelRescheduleRequest,
} from '../services/visitRescheduleService.js';
import { activatePatientSubscriptionTestMode } from '../services/caregiverPlanService.js';

const router = Router();


const createHealthUpdateSchema = z.object({
  patientId: z.string().optional(),
  submitterName: z.string().min(2, 'Submitter name must be at least 2 characters').max(100),
  relationship: z.enum(['patient', 'caregiver', 'family_member']).default('patient'),
  symptoms: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
  vitals: z
    .object({
      bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, 'Format must be Sys/Dia, e.g. 120/80').optional(),
      pulse: z.number().min(30).max(250).optional(),
      temperature: z.number().min(90).max(110).optional(),
      spO2: z.number().min(50).max(100).optional(),
      glucose: z.number().min(20).max(600).optional(),
      weight: z.number().min(10).max(300).optional(),
      painScale: z.number().min(1).max(10).optional(),
    })
    .optional(),
});

const rescheduleRequestSchema = z.object({
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Requested date must be in YYYY-MM-DD format'),
  requestedTimeSlot: z.string().min(1, 'Requested time slot is required').max(50),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(1000),
});

const activateSubscriptionSchema = z.object({
  planId: z.string().min(1, 'Care plan ID is required'),
  emergencyContact: z
    .object({
      name: z.string().min(1, 'Contact name is required').max(100),
      phone: z.string().min(5, 'Valid phone number is required').max(20),
      relation: z.string().max(50).optional(),
    })
    .optional(),
  carePlanNotes: z.string().max(1000).optional(),
  idempotencyKey: z.string().max(100).optional(),
});

// -----------------------------------------------------------------------------
// 1. POST /api/v1/patients/health-updates - Submit Daily Health Update
// -----------------------------------------------------------------------------
router.post(
  '/health-updates',
  authenticateUser,
  validateRequest({ body: createHealthUpdateSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { patientId: explicitPatientId, submitterName, relationship, symptoms = [], notes, vitals } = req.body;

      // Determine patient ID
      let patientId: mongoose.Types.ObjectId;
      if (explicitPatientId) {
        if (!mongoose.Types.ObjectId.isValid(explicitPatientId)) {
          throw new AppError('Invalid patient identifier', 400);
        }
        // If caller is patient, they can only submit for themselves
        if (user.role === 'patient' && explicitPatientId !== user._id.toString()) {
          throw new AppError('Patients can only submit daily updates for themselves', 403);
        }
        patientId = new mongoose.Types.ObjectId(explicitPatientId);
      } else {
        patientId = user._id as mongoose.Types.ObjectId;
      }

      // Find primary assigned doctor from latest appointment
      const latestAppointment = await Appointment.findOne({
        patientId,
        status: { $in: ['confirmed', 'in_progress', 'completed'] },
      }).sort({ appointmentDate: -1, createdAt: -1 });

      const assignedDoctorId = latestAppointment?.doctorId || undefined;

      // Evaluate explainable clinical risk indicators based on approved safety guidelines
      const riskAssessment = evaluateClinicalRisk(vitals, symptoms);

      const healthUpdate = await DailyHealthUpdate.create({
        patientId,
        assignedDoctorId,
        submittedBy: {
          userId: user._id,
          name: submitterName.trim(),
          relationship,
        },
        submittedAt: new Date(),
        symptoms: symptoms.map((s: string) => s.trim()).filter(Boolean),
        notes: notes?.trim(),
        vitals: vitals || undefined,
        isClinicallyVerified: false, // Strictly patient-reported until reviewed
        reviewStatus: 'new',
        riskIndicators: riskAssessment.indicators,
      });

      res.status(201).json({
        success: true,
        message: 'Daily health update submitted successfully. Your clinical care team has been notified.',
        data: healthUpdate,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 2. GET /api/v1/patients/health-updates/me - Patient Retrieves Own Updates
// -----------------------------------------------------------------------------
router.get('/health-updates/me', authenticateUser, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const updates = await DailyHealthUpdate.find({ patientId: user._id })
      .populate('reviewedBy', 'fullName')
      .sort({ submittedAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: updates.length,
      data: updates,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 3. GET /api/v1/patients/caregiver-plans - Active Caregiver Subscription Plans
// -----------------------------------------------------------------------------
router.get(
  '/caregiver-plans',
  optionalAuthenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { category, planType } = req.query;
      const plans = await getPublicCaregiverPlans({
        category: category as string,
        planType: planType as string,
      });

      res.status(200).json({
        success: true,
        count: plans.length,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 4. GET /api/v1/patients/me/subscriptions - Authenticated Patient Subscriptions
// -----------------------------------------------------------------------------
router.get(
  '/me/subscriptions',
  authenticateUser,
  requireRole(['patient', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { status } = req.query;
      const subscriptions = await getPatientSubscriptions(
        user._id.toString(),
        status as string,
        user.phone
      );

      res.status(200).json({
        success: true,
        count: subscriptions.length,
        data: subscriptions,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 4a. POST /api/v1/patients/me/subscriptions/activate - Patient Self-Activation (TEST MODE)
// -----------------------------------------------------------------------------
router.post(
  '/me/subscriptions/activate',
  authenticateUser,
  requireRole(['patient']),
  validateRequest({ body: activateSubscriptionSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { planId, emergencyContact, carePlanNotes, idempotencyKey } = req.body;

      const sub = await activatePatientSubscriptionTestMode(
        user._id.toString(),
        planId,
        {
          emergencyContact,
          carePlanNotes,
          idempotencyKey,
        }
      );

      const isReplay = (sub as any)._isIdempotentReplay === true;
      res.status(isReplay ? 200 : 201).json({
        success: true,
        message: isReplay
          ? 'Subscription is already active (idempotent request)'
          : 'Caregiver subscription activated successfully in TEST MODE',
        data: sub,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 5. GET /api/v1/patients/me/care-reports - Patient Care Reports & Bedside Vitals
// -----------------------------------------------------------------------------
router.get(
  '/me/care-reports',
  authenticateUser,
  requireRole(['patient', 'caregiver', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await getPatientCareReports(user._id.toString(), user.phone);

      res.status(200).json({
        success: true,
        count: result.count,
        summary: {
          fieldVisits: result.fieldVisitsCount,
          dailyUpdates: result.dailyUpdatesCount,
        },
        data: result.reports,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 6. GET /api/v1/patients/assigned-to-me - Caregiver Assigned Patients Listing
// -----------------------------------------------------------------------------
router.get(
  '/assigned-to-me',
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

// -----------------------------------------------------------------------------
// 7. GET /api/v1/patients/me/caregiver - Authenticated Patient Assigned Caregiver
// -----------------------------------------------------------------------------
router.get(
  '/me/caregiver',
  authenticateUser,
  requireRole(['patient', 'caregiver', 'professional', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await getPatientAssignedCaregiver(user._id.toString(), user.phone);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 8. GET /api/v1/patients/me/visits - Authenticated Patient Upcoming & Past Visits
// -----------------------------------------------------------------------------
router.get(
  '/me/visits',
  authenticateUser,
  requireRole(['patient', 'caregiver', 'professional', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await getPatientVisitSchedule(user._id.toString(), user.phone);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 8a. POST /api/v1/patients/me/visits/:visitId/reschedule - Submit Reschedule Request
// -----------------------------------------------------------------------------
router.post(
  '/me/visits/:visitId/reschedule',
  authenticateUser,
  requireRole(['patient', 'caregiver', 'professional', 'admin', 'super_admin']),
  validateRequest({ body: rescheduleRequestSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { visitId } = req.params;
      const { requestedDate, requestedTimeSlot, reason } = req.body;

      const result = await submitRescheduleRequest(
        visitId,
        requestedDate,
        requestedTimeSlot,
        reason,
        {
          _id: user._id,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
        }
      );

      res.status(201).json({
        success: true,
        message: 'Visit rescheduling request submitted successfully. Caregiver review is pending.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 8b. GET /api/v1/patients/me/reschedule-requests - List Patient's Reschedule Requests
// -----------------------------------------------------------------------------
router.get(
  '/me/reschedule-requests',
  authenticateUser,
  requireRole(['patient', 'caregiver', 'professional', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const requests = await getPatientRescheduleRequests(user._id.toString(), user.phone);

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

// -----------------------------------------------------------------------------
// 8c. POST /api/v1/patients/me/reschedule-requests/:requestId/cancel - Cancel Pending Request
// -----------------------------------------------------------------------------
router.post(
  '/me/reschedule-requests/:requestId/cancel',
  authenticateUser,
  requireRole(['patient', 'caregiver', 'professional', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { requestId } = req.params;

      const result = await cancelRescheduleRequest(requestId, {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
      });

      res.status(200).json({
        success: true,
        message: 'Rescheduling request cancelled successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 9. GET /api/v1/patients/:id/caregiver - Authorized Caregiver Lookup for Patient
// -----------------------------------------------------------------------------
router.get(
  '/:id/caregiver',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const targetPatientId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(targetPatientId)) {
        throw new AppError('Invalid patient identifier', 400);
      }

      // Enforce strict authorization
      if (user.role === 'patient') {
        if (targetPatientId !== user._id.toString()) {
          throw new AppError('Forbidden: Patients are strictly authorized to view only their own records', 403);
        }
      } else if (['professional', 'caregiver'].includes(user.role)) {
        const isAssigned = await verifyCaregiverPatientAssignment(user._id.toString(), targetPatientId);
        if (!isAssigned) {
          throw new AppError('Forbidden: You are not authorized to view this patient. No active caregiver assignment exists.', 403);
        }
      } else if (!['admin', 'super_admin'].includes(user.role)) {
        throw new AppError(`Forbidden: Access denied for role '${user.role}'`, 403);
      }

      const result = await getPatientAssignedCaregiver(targetPatientId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 10. GET /api/v1/patients/:id/visits - Authorized Visit Schedule Lookup for Patient
// -----------------------------------------------------------------------------
router.get(
  '/:id/visits',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const targetPatientId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(targetPatientId)) {
        throw new AppError('Invalid patient identifier', 400);
      }

      // Enforce strict authorization
      if (user.role === 'patient') {
        if (targetPatientId !== user._id.toString()) {
          throw new AppError('Forbidden: Patients are strictly authorized to view only their own records', 403);
        }
      } else if (['professional', 'caregiver'].includes(user.role)) {
        const isAssigned = await verifyCaregiverPatientAssignment(user._id.toString(), targetPatientId);
        if (!isAssigned) {
          throw new AppError('Forbidden: You are not authorized to view this patient. No active caregiver assignment exists.', 403);
        }
      } else if (!['admin', 'super_admin'].includes(user.role)) {
        throw new AppError(`Forbidden: Access denied for role '${user.role}'`, 403);
      }

      const result = await getPatientVisitSchedule(targetPatientId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 11. GET /api/v1/patients/:id - Authorized Patient Profile & Care Overview
// -----------------------------------------------------------------------------
router.get(
  '/:id',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await getAuthorizedPatientDetails(req.params.id, user);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const patientRoutes = router;

