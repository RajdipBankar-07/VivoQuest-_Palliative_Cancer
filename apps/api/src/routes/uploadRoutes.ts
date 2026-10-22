import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateUser, AuthRequest } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';
import { createUploadIntent, confirmUpload, getSecureDownloadUrl } from '../services/storageService.js';
import { FileCategory } from '../models/UploadedFile.js';

const router = Router();

const presignedUploadSchema = z.object({
  filename: z.string().min(1, 'Original filename is required').max(255),
  mimeType: z.string().min(1, 'MIME type is required'),
  fileSizeBytes: z.number().positive('File size must be positive bytes'),
  fileCategory: z.enum([
    'profile_picture',
    'professional_profile_image',
    'equipment_product_image',
    'credential_document',
    'prescription',
    'clinical_report',
  ]),
  patientId: z.string().optional(),
});

const confirmUploadSchema = z.object({
  fileId: z.string().min(1, 'fileId is required'),
});

router.post(
  '/presigned',
  authenticateUser,
  uploadRateLimiter,
  validateRequest({ body: presignedUploadSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await createUploadIntent({
        ...req.body,
        fileCategory: req.body.fileCategory as FileCategory,
        userId: user._id.toString(),
      });

      res.status(200).json({
        success: true,
        message: 'Upload intent authorized. Direct object storage URL generated.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/confirm',
  authenticateUser,
  validateRequest({ body: confirmUploadSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const confirmedFile = await confirmUpload(req.body.fileId, user._id.toString());

      res.status(200).json({
        success: true,
        message: 'File upload confirmed and verified in metadata ledger',
        data: confirmedFile,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:fileId/download',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await getSecureDownloadUrl(req.params.fileId, user._id.toString(), user.role);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const uploadRoutes = router;
