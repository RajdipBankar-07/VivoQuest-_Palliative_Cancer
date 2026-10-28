import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateUser, AuthRequest, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  getProfessionalProfileWithCredentials,
  updateProfessionalProfile,
  addProfessionalCredential,
  updateProfessionalCredential,
  deleteProfessionalCredential,
} from '../services/professionalProfileService.js';

const router = Router();

// Validation Schemas
const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  title: z.string().max(50).optional(),
  professionType: z
    .enum(['physician', 'physiotherapist', 'nurse', 'caregiver', 'phlebotomist', 'dietitian', 'chw', 'anm', 'technician'])
    .optional(),
  highestQualification: z.string().max(100).optional(),
  institution: z.string().max(150).optional(),
  specializations: z.array(z.string().trim()).optional(),
  yearsOfExperience: z.number().min(0).max(60).optional(),
  experienceSummary: z.string().max(2000).optional(),
  skills: z.array(z.string().trim()).optional(),
  registrationNumber: z.string().max(50).optional(),
  registrationCouncil: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  profileImageFileId: z.string().optional(),
});

const credentialSchema = z.object({
  documentType: z
    .enum([
      'medical_council_registration',
      'degree_certificate',
      'identity_proof_aadhaar_pan',
      'experience_letter',
      'clinical_reference',
      'training_certificate',
      'anm_diploma',
      'nursing_council_registration',
      'other_certification',
    ])
    .default('other_certification'),
  certificateTitle: z.string().min(2, 'Certificate title must be at least 2 characters').max(150),
  issuingAuthority: z.string().min(2, 'Issuing authority is required').max(150),
  issuingOrganization: z.string().max(150).optional(),
  credentialCategory: z.string().max(100).optional(),
  documentNumber: z.string().max(100).optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  uploadedFileId: z.string().optional(),
});

const updateCredentialSchema = credentialSchema.partial();

/**
 * GET /api/v1/professionals/me
 * Retrieves current professional profile, linked credentials, and completion metric.
 */
router.get(
  '/me',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await getProfessionalProfileWithCredentials(user._id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/professionals/me
 * Update permitted profile fields for the authenticated professional.
 */
router.put(
  '/me',
  authenticateUser,
  validateRequest({ body: updateProfileSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await updateProfessionalProfile(user._id, req.body, {
        id: user._id.toString(),
        role: user.role,
        fullName: user.fullName,
      });
      res.status(200).json({
        success: true,
        message: 'Professional profile updated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/professionals/me/credentials
 * Add a new certificate / credential entry (pending verification).
 */
router.post(
  '/me/credentials',
  authenticateUser,
  validateRequest({ body: credentialSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const credential = await addProfessionalCredential(user._id, req.body, {
        id: user._id.toString(),
        role: user.role,
        fullName: user.fullName,
      });
      res.status(201).json({
        success: true,
        message: 'Credential submitted successfully. Verification status: pending review.',
        data: credential,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/professionals/me/credentials/:credentialId
 * Update an existing credential entry.
 */
router.put(
  '/me/credentials/:credentialId',
  authenticateUser,
  validateRequest({ body: updateCredentialSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const credential = await updateProfessionalCredential(user._id, req.params.credentialId, req.body, {
        id: user._id.toString(),
        role: user.role,
        fullName: user.fullName,
      });
      res.status(200).json({
        success: true,
        message: 'Credential updated successfully. Verification status reset to pending review.',
        data: credential,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/professionals/me/credentials/:credentialId
 * Delete a credential entry.
 */
router.delete(
  '/me/credentials/:credentialId',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await deleteProfessionalCredential(user._id, req.params.credentialId, {
        id: user._id.toString(),
        role: user.role,
        fullName: user.fullName,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

export const professionalRoutes = router;
