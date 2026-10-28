import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { registerUser, loginUser, normalizePhoneNumber } from '../services/authService.js';

const router = Router();

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().transform((val) => normalizePhoneNumber(val)).pipe(
    z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number')
  ),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['patient', 'caregiver', 'professional', 'hospital', 'supplier', 'admin']).optional(),
  city: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Postal pincode must be exactly 6 digits').optional(),
  cluster: z.string().optional(),
  consentAccepted: z.boolean().refine((val) => val === true, {
    message: 'DPDP Act compliance consent must be acknowledged',
  }),
  registrationNumber: z.string().optional(),
  registrationCouncil: z.string().optional(),
  professionType: z.string().optional(),
  highestQualification: z.string().optional(),
  institution: z.string().optional(),
  specialization: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  yearsOfExperience: z.number().optional(),
  experienceSummary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  bio: z.string().optional(),
  credentials: z
    .array(
      z.object({
        documentType: z.string().optional(),
        certificateTitle: z.string().optional(),
        issuingAuthority: z.string().optional(),
        issuingOrganization: z.string().optional(),
        credentialCategory: z.string().optional(),
        documentNumber: z.string().optional(),
        issueDate: z.string().optional(),
        expiryDate: z.string().optional(),
        uploadedFileId: z.string().optional(),
      })
    )
    .optional(),
});

const loginSchema = z.object({
  identifier: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits').optional(),
  role: z.string().optional(),
}).refine(
  (data) => Boolean((data.identifier && data.identifier.trim()) || (data.phone && data.phone.trim()) || (data.email && data.email.trim())),
  { message: 'Mobile number or email is required', path: ['identifier'] }
);

router.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await registerUser(req.body);
      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await loginUser(req.body);
      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const authRoutes = router;
