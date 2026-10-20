import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { registerUser, loginUser } from '../services/authService.js';

const router = Router();

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
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
  professionType: z.string().optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Mobile number or email is required'),
  password: z.string().optional(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits').optional(),
  role: z.string().optional(),
});

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
