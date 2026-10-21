import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { optionalAuthenticateUser, authenticateUser, AuthRequest } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { Appointment, IAppointment, AppointmentStatus } from '../models/Appointment.js';
import { DoctorAvailability } from '../models/DoctorAvailability.js';
import { HealthcareProfessionalProfile } from '../models/HealthcareProfessionalProfile.js';
import { User } from '../models/User.js';
import { calculateDoctorSlots } from '../services/doctorSchedulingService.js';

const router = Router();

const createAppointmentSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  timeSlot: z.object({
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:mm format'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be in HH:mm format'),
  }),
  consultationMode: z.enum(['in_clinic', 'video', 'home_visit']).default('in_clinic'),
  patientName: z.string().min(2, 'Patient name must be at least 2 characters').max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian phone number'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  age: z.number().min(0).max(130).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  clinicalReason: z.string().max(1000).optional(),
  serviceLocationAddress: z.string().optional(),
  serviceLocationCity: z.string().default('Pune'),
});

const rescheduleAppointmentSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'New date must be in YYYY-MM-DD format'),
  newTimeSlot: z.object({
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:mm format'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be in HH:mm format'),
  }),
  reason: z.string().max(500).optional(),
});

const cancelAppointmentSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason must be at least 3 characters').max(500),
});

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'in_progress', 'completed', 'declined', 'cancelled']),
  doctorNotes: z.string().max(2000).optional(),
  prescription: z
    .object({
      medicines: z
        .array(
          z.object({
            name: z.string().min(1),
            dosage: z.string().min(1),
            frequency: z.string().min(1),
            duration: z.string().min(1),
            instructions: z.string().optional(),
          })
        )
        .optional(),
      recommendations: z.string().optional(),
    })
    .optional(),
  reason: z.string().optional(),
});

// -----------------------------------------------------------------------------
// 1. POST /api/v1/appointments - Book a New Patient Appointment
// -----------------------------------------------------------------------------
router.post(
  '/',
  optionalAuthenticateUser,
  validateRequest({ body: createAppointmentSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {
        doctorId,
        appointmentDate,
        timeSlot,
        consultationMode,
        patientName,
        phone,
        email,
        age,
        gender,
        clinicalReason,
        serviceLocationAddress,
        serviceLocationCity = 'Pune',
      } = req.body;

      const cleanPhone = phone.replace(/\D/g, '');

      // 1. Check doctor existence
      if (!mongoose.Types.ObjectId.isValid(doctorId)) {
        throw new AppError('Invalid doctor identifier', 400);
      }

      const doctorUser = await User.findById(doctorId);
      if (!doctorUser) {
        throw new AppError('Doctor / Healthcare professional not found', 404);
      }

      const doctorProfile = await HealthcareProfessionalProfile.findOne({ userId: doctorUser._id });
      const doctorAvailability = await DoctorAvailability.findOne({ doctorId: doctorUser._id });

      // 2. Date validation (Cannot book past date)
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

      if (appointmentDate < todayStr) {
        throw new AppError('Cannot book an appointment for a past date', 400);
      }

      // If booking for today, verify start time has not passed
      if (appointmentDate === todayStr) {
        const [h, m] = timeSlot.startTime.split(':').map(Number);
        const slotMinutes = h * 60 + m;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        if (slotMinutes <= currentMinutes + 10) {
          throw new AppError('Selected time slot has already passed or is within the cutoff window. Please choose a future slot.', 400);
        }
      }

      // 3. Revalidate slot availability against doctor's schedule and existing bookings
      const slotData = await calculateDoctorSlots({
        doctorId,
        date: appointmentDate,
        consultationMode,
      });

      if (!slotData.isWorkingDay) {
        throw new AppError('Doctor is not available on this date (day off or holiday)', 400);
      }

      const matchingSlot = slotData.slots.find((s) => s.startTime === timeSlot.startTime);
      if (!matchingSlot) {
        throw new AppError(`Time slot ${timeSlot.startTime} is not part of doctor's working schedule on ${appointmentDate}`, 400);
      }

      if (!matchingSlot.isAvailable) {
        throw new AppError(
          matchingSlot.reason === 'booked'
            ? 'This time slot has already been reserved by another patient. Please choose another available slot.'
            : matchingSlot.reason === 'break'
            ? 'This time slot falls during doctor break hours.'
            : 'This time slot is unavailable.',
          409
        );
      }

      // 4. Resolve patient user
      let patientUserId: mongoose.Types.ObjectId;
      if (req.user) {
        patientUserId = req.user._id as mongoose.Types.ObjectId;
      } else {
        let existingUser = await User.findOne({ phone: cleanPhone });
        if (!existingUser) {
          existingUser = await User.create({
            fullName: patientName.trim(),
            phone: cleanPhone,
            email: email || undefined,
            passwordHash: '$2a$10$wK1W3uL.kG6N5o.z.60QeOq7w8x0Y.9.0QeOq7w8x0Y.9.0QeOq7',
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

      // 5. Determine consultation fee
      const feeAmount = doctorAvailability?.fees?.[consultationMode as keyof typeof doctorAvailability.fees] || 800;
      const currency = doctorAvailability?.fees?.currency || 'INR';

      // 6. Generate unique appointment number: VQ-APT-YYYYMM-XXXX
      const dateCode = appointmentDate.replace(/-/g, '').slice(0, 6);
      const randomCode = crypto.randomBytes(2).toString('hex').toUpperCase();
      const appointmentNumber = `VQ-APT-${dateCode}-${randomCode}`;

      // 7. Atomic reservation & Double-booking prevention
      // Compound unique index { doctorId, appointmentDate, 'timeSlot.startTime' } will throw duplicate error (11000) on concurrent collision
      let appointment: IAppointment;
      try {
        appointment = await Appointment.create({
          appointmentNumber,
          patientId: patientUserId,
          doctorId: doctorUser._id,
          doctorProfileId: doctorProfile?._id,
          appointmentDate,
          timeSlot: {
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
          },
          consultationMode,
          status: 'confirmed',
          statusHistory: [
            {
              status: 'confirmed',
              changedBy: patientUserId,
              changedByRole: req.user?.role || 'patient',
              timestamp: new Date(),
              reason: 'Initial appointment booking confirmed by patient',
            },
          ],
          patientDetails: {
            fullName: patientName.trim(),
            phone: cleanPhone,
            email: email || undefined,
            age: age || undefined,
            gender: gender || undefined,
          },
          clinicalReason: clinicalReason?.trim(),
          location: {
            address:
              consultationMode === 'home_visit'
                ? serviceLocationAddress || 'Patient Residence'
                : doctorAvailability?.clinicAddress || 'VivoQuest Clinical Center, Pune',
            city: serviceLocationCity,
            clinicName: consultationMode === 'in_clinic' ? 'VivoQuest Clinical Center' : undefined,
            telehealthMeetingUrl:
              consultationMode === 'video' ? `https://telehealth.vivoquest.in/room/apt-${appointmentNumber}` : undefined,
          },
          pricing: {
            amount: Number(feeAmount),
            currency,
            paymentStatus: 'pending',
          },
          isSeededDemo: doctorUser.phone?.startsWith('982001100') || false,
        });
      } catch (err: any) {
        if (err.code === 11000) {
          throw new AppError(
            'Concurrent reservation collision: This time slot was just booked by another patient. Please select another slot.',
            409
          );
        }
        throw err;
      }

      // Populate doctor and patient
      await appointment.populate('doctorId', 'fullName phone email');
      if (doctorProfile) {
        await appointment.populate('doctorProfileId');
      }

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 2. GET /api/v1/appointments/me - List Appointments for Logged-in User
// -----------------------------------------------------------------------------
router.get('/me', authenticateUser, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { filter, status } = req.query;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    let query: Record<string, any> = {};

    if (user.role === 'professional') {
      query.doctorId = user._id;
    } else if (['admin', 'super_admin'].includes(user.role)) {
      // admin and super_admin can view all
    } else {
      // Patient or caregiver: match patientId or phone
      query.$or = [{ patientId: user._id }, { 'patientDetails.phone': user.phone }];
    }

    if (filter === 'upcoming') {
      query.appointmentDate = { $gte: todayStr };
      query.status = { $in: ['confirmed', 'pending', 'in_progress', 'reschedule_requested'] };
    } else if (filter === 'past') {
      query.$or = [
        ...(query.$or ? query.$or : []),
        { appointmentDate: { $lt: todayStr } },
        { status: { $in: ['completed', 'cancelled', 'declined'] } },
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'fullName phone email')
      .populate('doctorProfileId')
      .populate('patientId', 'fullName phone email')
      .sort({ appointmentDate: -1, 'timeSlot.startTime': -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 3. GET /api/v1/appointments/:id - Single Appointment Detail with RBAC
// -----------------------------------------------------------------------------
router.get('/:id', authenticateUser, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid appointment identifier', 400);
    }

    const appointment = await Appointment.findById(id)
      .populate('doctorId', 'fullName phone email')
      .populate('doctorProfileId')
      .populate('patientId', 'fullName phone email');

    if (!appointment) {
      throw new AppError(`Appointment '${id}' not found`, 404);
    }

    // STRICT PATIENT OWNERSHIP & RBAC AUTHORIZATION:
    // A patient must NEVER be able to access another patient's appointment by changing ID in URL
    const isPatientOwner =
      appointment.patientId && appointment.patientId._id.toString() === user._id.toString();
    const isPatientPhoneMatch = appointment.patientDetails?.phone === user.phone;
    const isAssignedDoctor =
      appointment.doctorId && appointment.doctorId._id.toString() === user._id.toString();
    const isAdmin = ['admin', 'super_admin'].includes(user.role);

    if (!isPatientOwner && !isPatientPhoneMatch && !isAssignedDoctor && !isAdmin) {
      throw new AppError('Access denied: You are not authorized to view this appointment', 403);
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 4. PATCH /api/v1/appointments/:id/reschedule - Reschedule Appointment
// -----------------------------------------------------------------------------
router.patch(
  '/:id/reschedule',
  authenticateUser,
  validateRequest({ body: rescheduleAppointmentSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { newDate, newTimeSlot, reason } = req.body;
      const user = req.user!;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid appointment identifier', 400);
      }

      const appointment = await Appointment.findById(id);
      if (!appointment) {
        throw new AppError(`Appointment '${id}' not found`, 404);
      }

      // Authorization check
      const isPatientOwner = appointment.patientId.toString() === user._id.toString();
      const isPatientPhoneMatch = appointment.patientDetails?.phone === user.phone;
      const isAssignedDoctor = appointment.doctorId.toString() === user._id.toString();
      const isAdmin = ['admin', 'super_admin'].includes(user.role);

      if (!isPatientOwner && !isPatientPhoneMatch && !isAssignedDoctor && !isAdmin) {
        throw new AppError('Access denied: You are not authorized to reschedule this appointment', 403);
      }

      // Check current appointment status
      if (appointment.status === 'completed') {
        throw new AppError('Cannot reschedule an already completed appointment', 400);
      }
      if (appointment.status === 'cancelled') {
        throw new AppError('Cannot reschedule a cancelled appointment. Please book a new appointment.', 400);
      }

      // Check that newDate is in future
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      if (newDate < todayStr) {
        throw new AppError('Cannot reschedule to a past date', 400);
      }

      // Check doctor availability on new date/slot
      const slotData = await calculateDoctorSlots({
        doctorId: appointment.doctorId.toString(),
        date: newDate,
        consultationMode: appointment.consultationMode,
      });

      if (!slotData.isWorkingDay) {
        throw new AppError('Doctor is not available on the selected date (holiday or non-working day)', 400);
      }

      const targetSlot = slotData.slots.find((s) => s.startTime === newTimeSlot.startTime);
      if (!targetSlot) {
        throw new AppError(`Time slot ${newTimeSlot.startTime} is not part of doctor's working schedule on ${newDate}`, 400);
      }

      if (!targetSlot.isAvailable) {
        throw new AppError('The requested new time slot is not available. Please choose another slot.', 409);
      }

      const oldDate = appointment.appointmentDate;
      const oldSlot = `${appointment.timeSlot.startTime}-${appointment.timeSlot.endTime}`;

      // Update appointment
      appointment.appointmentDate = newDate;
      appointment.timeSlot = {
        startTime: newTimeSlot.startTime,
        endTime: newTimeSlot.endTime,
      };
      appointment.status = 'confirmed';
      appointment.statusHistory.push({
        status: 'confirmed',
        changedBy: user._id as mongoose.Types.ObjectId,
        changedByRole: user.role,
        timestamp: new Date(),
        reason: reason || `Rescheduled from ${oldDate} (${oldSlot}) to ${newDate} (${newTimeSlot.startTime}-${newTimeSlot.endTime})`,
      });

      await appointment.save();

      res.status(200).json({
        success: true,
        message: 'Appointment rescheduled successfully',
        data: appointment,
      });
    } catch (error: any) {
      if (error.code === 11000) {
        next(new AppError('The new time slot has just been reserved. Please select another slot.', 409));
        return;
      }
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 5. PATCH /api/v1/appointments/:id/cancel - Cancel Appointment
// -----------------------------------------------------------------------------
router.patch(
  '/:id/cancel',
  authenticateUser,
  validateRequest({ body: cancelAppointmentSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const user = req.user!;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid appointment identifier', 400);
      }

      const appointment = await Appointment.findById(id);
      if (!appointment) {
        throw new AppError(`Appointment '${id}' not found`, 404);
      }

      // Authorization check
      const isPatientOwner = appointment.patientId.toString() === user._id.toString();
      const isPatientPhoneMatch = appointment.patientDetails?.phone === user.phone;
      const isAssignedDoctor = appointment.doctorId.toString() === user._id.toString();
      const isAdmin = ['admin', 'super_admin'].includes(user.role);

      if (!isPatientOwner && !isPatientPhoneMatch && !isAssignedDoctor && !isAdmin) {
        throw new AppError('Access denied: You are not authorized to cancel this appointment', 403);
      }

      if (appointment.status === 'completed') {
        throw new AppError('Cannot cancel an already completed appointment', 400);
      }
      if (appointment.status === 'cancelled') {
        throw new AppError('Appointment is already cancelled', 400);
      }

      appointment.status = 'cancelled';
      appointment.cancellationReason = reason;
      appointment.statusHistory.push({
        status: 'cancelled',
        changedBy: user._id as mongoose.Types.ObjectId,
        changedByRole: user.role,
        timestamp: new Date(),
        reason,
      });

      await appointment.save();

      res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully. Slot has been freed.',
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 6. PATCH /api/v1/appointments/:id/status - Doctor Status & Clinical Notes Update
// -----------------------------------------------------------------------------
router.patch(
  '/:id/status',
  authenticateUser,
  validateRequest({ body: updateStatusSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, doctorNotes, prescription, reason } = req.body;
      const user = req.user!;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid appointment identifier', 400);
      }

      const appointment = await Appointment.findById(id);
      if (!appointment) {
        throw new AppError(`Appointment '${id}' not found`, 404);
      }

      // Only the assigned doctor or admin can perform status transitions
      const isAssignedDoctor = appointment.doctorId.toString() === user._id.toString();
      const isAdmin = ['admin', 'super_admin'].includes(user.role);

      if (!isAssignedDoctor && !isAdmin) {
        throw new AppError('Only the assigned doctor or clinical admin can update appointment status', 403);
      }

      // Valid transitions
      const current = appointment.status;
      const allowedTransitions: Record<string, string[]> = {
        pending: ['confirmed', 'declined', 'cancelled'],
        confirmed: ['in_progress', 'cancelled', 'completed'],
        in_progress: ['completed', 'cancelled'],
        reschedule_requested: ['confirmed', 'cancelled', 'declined'],
        completed: [],
        cancelled: [],
        declined: [],
      };

      if (!allowedTransitions[current]?.includes(status)) {
        throw new AppError(`Invalid status transition from '${current}' to '${status}'`, 400);
      }

      appointment.status = status as AppointmentStatus;

      if (doctorNotes !== undefined) {
        appointment.doctorNotes = doctorNotes;
      }

      if (prescription) {
        appointment.prescription = {
          medicines: prescription.medicines || [],
          recommendations: prescription.recommendations,
          issuedAt: new Date(),
        };
      }

      appointment.statusHistory.push({
        status,
        changedBy: user._id as mongoose.Types.ObjectId,
        changedByRole: user.role,
        timestamp: new Date(),
        reason: reason || `Status updated to ${status} by ${user.fullName}`,
      });

      await appointment.save();

      res.status(200).json({
        success: true,
        message: `Appointment status updated to '${status}' successfully`,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const appointmentRoutes = router;
