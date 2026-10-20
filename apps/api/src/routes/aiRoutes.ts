import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateUser, requireRole, AuthRequest } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  previewServiceBundle,
  findProviderCandidates,
  getDispatchReview,
  confirmDispatchAssignment,
} from '../services/aiCoordinationService.js';

const router = Router();

const bundlePreviewSchema = z.object({
  bookingIds: z.array(z.string()).optional(),
  tasks: z.array(z.any()).optional(),
  maxMinutes: z.number().min(30).max(240).optional(),
});

const candidateSearchSchema = z.object({
  bookingId: z.string().min(1, 'bookingId is required'),
});

const dispatchConfirmSchema = z.object({
  bookingId: z.string().min(1, 'bookingId is required'),
  professionalUserId: z.string().min(1, 'professionalUserId is required'),
  notes: z.string().max(500).optional(),
});

/**
 * Preview service bundle
 */
router.post(
  '/bundles/preview',
  authenticateUser,
  requireRole(['admin', 'hospital', 'professional']),
  validateRequest({ body: bundlePreviewSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await previewServiceBundle(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Find provider candidates
 */
router.post(
  '/matching/candidates',
  authenticateUser,
  requireRole(['admin', 'hospital', 'professional']),
  validateRequest({ body: candidateSearchSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await findProviderCandidates(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Review proposed dispatch
 */
router.get(
  '/dispatch/review/:bookingId',
  authenticateUser,
  requireRole(['admin', 'hospital', 'professional']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await getDispatchReview(req.params.bookingId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Confirm authorized assignment (Human-in-the-Loop)
 */
router.post(
  '/dispatch/confirm',
  authenticateUser,
  requireRole(['admin', 'hospital']),
  validateRequest({ body: dispatchConfirmSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await confirmDispatchAssignment({
        ...req.body,
        assignedByUserId: user._id.toString(),
      });
      res.status(200).json({
        success: true,
        message: 'Dispatch assignment confirmed and recorded.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const aiRoutes = router;
