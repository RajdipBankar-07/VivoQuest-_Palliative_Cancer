import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { optionalAuthenticateUser, authenticateUser, AuthRequest } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { Booking } from '../models/Booking.js';
import { HealthcareService } from '../models/HealthcareService.js';
import { User } from '../models/User.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createBookingSchema = z.object({
  patientName: z.string().min(2, 'Patient name must be at least 2 characters').max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian phone number'),
  serviceId: z.string().min(1, 'Service identifier is required'),
  city: z.string().default('Pune'),
  pincode: z.string().regex(/^\d{6}$/, 'Postal pincode must be exactly 6 digits'),
  address: z.string().optional(),
  cluster: z.string().optional(),
  preferredDate: z.string().optional(),
  clinicalNotes: z.string().max(1000).optional(),
});

router.post(
  '/',
  optionalAuthenticateUser,
  validateRequest({ body: createBookingSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {
        patientName,
        phone,
        serviceId: serviceIdentifier,
        city,
        pincode,
        address,
        cluster = city,
        preferredDate,
        clinicalNotes,
      } = req.body;

      const cleanPhone = phone.replace(/\D/g, '');

      // Resolve Healthcare Service by ObjectId, exact serviceCode, or partial code
      let service = null;
      if (mongoose.Types.ObjectId.isValid(serviceIdentifier)) {
        service = await HealthcareService.findById(serviceIdentifier);
      }
      if (!service) {
        service = await HealthcareService.findOne({ serviceCode: serviceIdentifier.toLowerCase() });
      }
      if (!service) {
        service = await HealthcareService.findOne({
          serviceCode: { $regex: serviceIdentifier.toLowerCase().replace(/[^a-z0-9]/g, ''), $options: 'i' },
        });
      }
      if (!service) {
        throw new AppError(`Healthcare service '${serviceIdentifier}' not found`, 404);
      }

      // Resolve Patient User ID (from auth or find/create guest user)
      let patientUserId: mongoose.Types.ObjectId;
      if (req.user) {
        patientUserId = req.user._id as mongoose.Types.ObjectId;
      } else {
        // Find existing user by phone or create shadow patient user
        let existingUser = await User.findOne({ phone: cleanPhone });
        if (!existingUser) {
          const defaultPasswordHash = '$2a$10$wK1W3uL.kG6N5o.z.60QeOq7w8x0Y.9.0QeOq7w8x0Y.9.0QeOq7'; // dummy bcrypt hash
          existingUser = await User.create({
            fullName: patientName,
            phone: cleanPhone,
            passwordHash: defaultPasswordHash,
            role: 'patient',
            isPhoneVerified: false,
            dpdpConsent: {
              accepted: true,
              consentedAt: new Date(),
              policyVersion: 'DPDP-2023-V1.0',
            },
          });
        }
        patientUserId = existingUser._id as mongoose.Types.ObjectId;
      }

      // Check linked patient profile
      const patientProfile = await PatientProfile.findOne({ userId: patientUserId });

      // Generate unique booking number: VQ-YYYYMM-XXXX
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const bookingNumber = `VQ-${dateStr}-${randomSuffix}`;

      const booking = await Booking.create({
        bookingNumber,
        patientId: patientUserId,
        patientProfileId: patientProfile?._id,
        serviceId: service._id,
        patientName: patientName.trim(),
        phone: cleanPhone,
        status: 'requested',
        preferredDate: preferredDate ? new Date(preferredDate) : undefined,
        serviceLocation: {
          address: address || 'Home Visit Address',
          city,
          pincode,
          cluster,
        },
        clinicalNotes,
        pricing: {
          estimatedAmount: service.price.baseAmount,
          currency: service.price.currency,
          paymentStatus: 'pending',
        },
        dispatchState: {
          triagedAt: new Date(),
        },
      });

      res.status(201).json({
        success: true,
        message: 'Healthcare service request created successfully',
        data: {
          bookingNumber: booking.bookingNumber,
          id: booking._id.toString(),
          patientName: booking.patientName,
          phone: booking.phone,
          service: {
            id: service._id.toString(),
            title: service.title,
            badge: service.badge,
            turnaround: service.turnaround,
          },
          status: booking.status,
          serviceLocation: booking.serviceLocation,
          preferredDate: booking.preferredDate,
          pricing: booking.pricing,
          createdAt: booking.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/me', authenticateUser, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    let query: any = {};

    if (user.role === 'patient' || user.role === 'caregiver') {
      query = {
        $or: [{ patientId: user._id }, { phone: user.phone }],
      };
    } else if (user.role === 'professional') {
      query = { assignedProfessionalId: user._id };
    } else if (user.role === 'admin') {
      query = {}; // admin can view all bookings
    } else {
      query = { patientId: user._id };
    }

    const bookings = await Booking.find(query)
      .populate('serviceId', 'title category badge price turnaround')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
});

export const bookingRoutes = router;
