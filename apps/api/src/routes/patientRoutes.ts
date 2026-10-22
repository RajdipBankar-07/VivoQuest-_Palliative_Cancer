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
} from '../services/patientService.js';

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

      const subscriptions = await getPatientSubscriptions(user._id.toString(), status as string);

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
// 7. GET /api/v1/patients/:id - Authorized Patient Profile & Care Overview
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

