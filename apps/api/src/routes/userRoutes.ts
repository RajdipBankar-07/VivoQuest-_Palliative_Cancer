import { Router, Response, NextFunction } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { HealthcareProfessionalProfile } from '../models/HealthcareProfessionalProfile.js';

const router = Router();

router.get('/me', authenticateUser, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    let profile: any = null;

    if (user.role === 'patient') {
      profile = await PatientProfile.findOne({ userId: user._id });
    } else if (user.role === 'professional' || user.role === 'caregiver') {
      profile = await HealthcareProfessionalProfile.findOne({ userId: user._id });
      if (!profile && user.role === 'caregiver') {
        // Fallback for legacy caregiver accounts
        profile = await HealthcareProfessionalProfile.create({
          userId: user._id,
          title: 'Caregiver',
          professionType: 'caregiver',
          registrationNumber: 'N/A',
          registrationCouncil: 'Not Applicable',
          yearsOfExperience: 2,
          serviceClusters: ['Pune'],
          verificationStatus: 'pending_review',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
          role: user.role,
          status: user.status,
          isPhoneVerified: user.isPhoneVerified,
          isEmailVerified: user.isEmailVerified,
          dpdpConsent: user.dpdpConsent,
          createdAt: user.createdAt,
        },
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const userRoutes = router;
