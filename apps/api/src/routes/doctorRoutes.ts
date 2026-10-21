import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authenticateUser, AuthRequest } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  getDoctorsDirectory,
  calculateDoctorSlots,
  seedDemoDoctorsIfEmpty,
} from '../services/doctorSchedulingService.js';
import { HealthcareProfessionalProfile } from '../models/HealthcareProfessionalProfile.js';
import { DoctorAvailability } from '../models/DoctorAvailability.js';
import { Appointment } from '../models/Appointment.js';
import { User } from '../models/User.js';
import { DailyHealthUpdate } from '../models/DailyHealthUpdate.js';
import { ClinicalNote } from '../models/ClinicalNote.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { FieldVisit } from '../models/FieldVisit.js';
import { UploadedFile } from '../models/UploadedFile.js';
import { AuditLog } from '../models/AuditLog.js';
import { evaluateClinicalRisk } from '../services/clinicalRiskService.js';

const router = Router();

const updateScheduleSchema = z.object({
  slotDurationMinutes: z.number().min(15).max(120).optional(),
  bufferMinutes: z.number().min(0).max(30).optional(),
  weeklySchedule: z
    .array(
      z.object({
        dayOfWeek: z.number().min(0).max(6),
        isWorkingDay: z.boolean(),
        shifts: z.array(
          z.object({
            startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm'),
            endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm'),
          })
        ),
      })
    )
    .optional(),
  breakTimes: z
    .array(
      z.object({
        startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm'),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm'),
        label: z.string().optional(),
      })
    )
    .optional(),
  blackoutDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  consultationModes: z.array(z.enum(['in_clinic', 'video', 'home_visit'])).optional(),
  fees: z
    .object({
      in_clinic: z.number().min(0).optional(),
      video: z.number().min(0).optional(),
      home_visit: z.number().min(0).optional(),
      currency: z.string().optional(),
    })
    .optional(),
  clinicAddress: z.string().optional(),
  city: z.string().optional(),
});

const createClinicalNoteSchema = z.object({
  subjective: z.string().max(3000).optional(),
  objective: z.string().max(3000).optional(),
  assessment: z.string().min(2, 'Assessment is required').max(3000),
  plan: z.string().min(2, 'Plan is required').max(3000),
  followUpInstructions: z.string().max(1500).optional(),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  appointmentId: z.string().optional(),
  fieldVisitId: z.string().optional(),
});

const reviewHealthUpdateSchema = z.object({
  reviewStatus: z.enum(['reviewed', 'follow_up_required']),
  clinicianNotes: z.string().min(2, 'Clinician notes must be at least 2 characters').max(2000),
  followUpAction: z.string().max(1000).optional(),
});

const updateFollowUpPlanSchema = z.object({
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  careTasks: z.array(z.string()).optional(),
  instructions: z.string().max(1000).optional(),
});

/**
 * Strict server-side verification: verifies whether a patient is assigned to the clinician
 * via a confirmed/active/past appointment or clinical field visit.
 */
async function isPatientAssignedToDoctor(
  patientId: mongoose.Types.ObjectId | string,
  doctorId: mongoose.Types.ObjectId | string
): Promise<boolean> {
  const [apt, visit] = await Promise.all([
    Appointment.exists({ patientId, doctorId }),
    FieldVisit.exists({ patientId, providerId: doctorId }),
  ]);
  return !!(apt || visit);
}

// -----------------------------------------------------------------------------
// 1. GET /api/v1/doctors - Directory of Doctors & Healthcare Specialists
// -----------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, specialty, professionType, consultationMode, city } = req.query;

    const doctors = await getDoctorsDirectory({
      search: search as string,
      specialty: specialty as string,
      professionType: professionType as string,
      consultationMode: consultationMode as string,
      city: city as string,
    });

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 2. GET /api/v1/doctors/me/profile - Doctor Profile of Logged-in Clinician
// -----------------------------------------------------------------------------
router.get('/me/profile', authenticateUser, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    if (user.role !== 'professional' && user.role !== 'admin') {
      throw new AppError('Only verified healthcare professionals can access clinician profile', 403);
    }

    const profile = await HealthcareProfessionalProfile.findOne({ userId: user._id });
    const availability = await DoctorAvailability.findOne({ doctorId: user._id });

    res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        profileId: profile?._id.toString(),
        fullName: user.fullName,
        title: profile?.title || 'Dr.',
        professionType: profile?.professionType || 'physician',
        specializations: profile?.specializations || ['Palliative Care'],
        registrationNumber: profile?.registrationNumber || '',
        registrationCouncil: profile?.registrationCouncil || '',
        yearsOfExperience: profile?.yearsOfExperience || 0,
        serviceClusters: profile?.serviceClusters || ['Pune'],
        verificationStatus: profile?.verificationStatus || 'verified',
        bio: profile?.bio || '',
        rating: profile?.rating || 5.0,
        totalVisitsCompleted: profile?.totalVisitsCompleted || 0,
        consultationModes: availability?.consultationModes || ['in_clinic', 'video', 'home_visit'],
        fees: availability?.fees || { in_clinic: 800, video: 500, home_visit: 1200, currency: 'INR' },
        clinicAddress: availability?.clinicAddress || 'VivoQuest Clinical Center, Pune',
        city: availability?.city || 'Pune',
      },
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 3. GET /api/v1/doctors/dashboard/stats & /me/stats - Rich Clinician Metrics
// -----------------------------------------------------------------------------
const getDoctorStatsHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    if (user.role !== 'professional' && user.role !== 'admin') {
      throw new AppError('Only verified healthcare professionals can access doctor dashboard stats', 403);
    }

    const doctorId = user._id;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    // Get assigned patients
    const [patientIdsFromApts, patientIdsFromVisits] = await Promise.all([
      Appointment.distinct('patientId', { doctorId }),
      FieldVisit.distinct('patientId', { providerId: doctorId }),
    ]);

    const uniquePatientIds = Array.from(
      new Set([
        ...patientIdsFromApts.map((id: any) => id?.toString()),
        ...patientIdsFromVisits.filter(Boolean).map((id: any) => id?.toString()),
      ])
    )
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Parallel metrics execution
    const [
      todayCount,
      upcomingCount,
      completedCount,
      pendingCount,
      cancelledCount,
      unreviewedUpdatesCount,
      followUpNotes,
      availability,
    ] = await Promise.all([
      Appointment.countDocuments({
        doctorId,
        appointmentDate: todayStr,
        status: { $in: ['confirmed', 'in_progress', 'completed'] },
      }),
      Appointment.countDocuments({
        doctorId,
        appointmentDate: { $gte: todayStr },
        status: { $in: ['confirmed', 'in_progress'] },
      }),
      Appointment.countDocuments({
        doctorId,
        status: 'completed',
      }),
      Appointment.countDocuments({
        doctorId,
        status: 'pending',
      }),
      Appointment.countDocuments({
        doctorId,
        status: 'cancelled',
      }),
      DailyHealthUpdate.countDocuments({
        patientId: { $in: uniquePatientIds },
        reviewStatus: 'new',
      }),
      ClinicalNote.find({
        doctorId,
        followUpDate: { $exists: true, $ne: '' },
      }).sort({ createdAt: -1 }),
      DoctorAvailability.findOne({ doctorId }),
    ]);

    // Compute follow-ups due (within 7 days) and overdue (< todayStr)
    let followUpsDueCount = 0;
    let followUpsOverdueCount = 0;
    const processedPatients = new Set<string>();

    for (const note of followUpNotes) {
      const pId = note.patientId.toString();
      if (processedPatients.has(pId)) continue;
      processedPatients.add(pId);

      if (note.followUpDate) {
        if (note.followUpDate < todayStr) {
          followUpsOverdueCount++;
        } else {
          const diffDays = Math.floor(
            (new Date(note.followUpDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays >= 0 && diffDays <= 7) {
            followUpsDueCount++;
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        todayDate: todayStr,
        todayCount,
        upcomingCount,
        completedCount,
        pendingCount,
        cancelledCount,
        assignedPatientsCount: uniquePatientIds.length,
        requiringReviewCount: unreviewedUpdatesCount,
        followUpsDueCount,
        followUpsOverdueCount,
        slotDurationMinutes: availability?.slotDurationMinutes || 30,
        consultationModes: availability?.consultationModes || ['in_clinic', 'video', 'home_visit'],
      },
    });
  } catch (error) {
    next(error);
  }
};

router.get('/dashboard/stats', authenticateUser, getDoctorStatsHandler);
router.get('/me/stats', authenticateUser, getDoctorStatsHandler);

// -----------------------------------------------------------------------------
// 4. GET /api/v1/doctors/me/patients - Assigned Patients with Search & Risk Triage
// -----------------------------------------------------------------------------
router.get('/me/patients', authenticateUser, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    if (user.role !== 'professional' && user.role !== 'admin') {
      throw new AppError('Only verified healthcare professionals can access assigned patients list', 403);
    }

    const doctorId = user._id;
    const { search, condition, riskLevel, followUpStatus: followUpFilter, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));

    // 1. Gather all unique patients assigned to this doctor via appointments or field visits
    const [patientIdsFromApts, patientIdsFromVisits] = await Promise.all([
      Appointment.distinct('patientId', { doctorId }),
      FieldVisit.distinct('patientId', { providerId: doctorId }),
    ]);

    const uniquePatientIds = Array.from(
      new Set([
        ...patientIdsFromApts.map((id: any) => id?.toString()),
        ...patientIdsFromVisits.filter(Boolean).map((id: any) => id?.toString()),
      ])
    )
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (uniquePatientIds.length === 0) {
      res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        page: pageNum,
        totalPages: 0,
        data: [],
      });
      return;
    }

    // 2. Fetch patient user records
    let userQuery: Record<string, any> = { _id: { $in: uniquePatientIds } };
    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search.trim(), 'i');
      userQuery.$or = [{ fullName: searchRegex }, { phone: searchRegex }, { email: searchRegex }];
    }

    const patientUsers = await User.find(userQuery).lean();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    // 3. For each patient, fetch clinical dossier summary
    const patientsDetailed = await Promise.all(
      patientUsers.map(async (pUser) => {
        const [profile, latestUpdate, lastCompletedApt, nextScheduledApt, latestNote] = await Promise.all([
          PatientProfile.findOne({ userId: pUser._id }).lean(),
          DailyHealthUpdate.findOne({ patientId: pUser._id }).sort({ submittedAt: -1 }).lean(),
          Appointment.findOne({
            patientId: pUser._id,
            doctorId,
            status: 'completed',
          })
            .sort({ appointmentDate: -1 })
            .lean(),
          Appointment.findOne({
            patientId: pUser._id,
            doctorId,
            appointmentDate: { $gte: todayStr },
            status: { $in: ['confirmed', 'in_progress', 'pending'] },
          })
            .sort({ appointmentDate: 1 })
            .lean(),
          ClinicalNote.findOne({
            patientId: pUser._id,
            doctorId,
          })
            .sort({ createdAt: -1 })
            .lean(),
        ]);

        // Follow-up status calculation
        const followUpDueDate = latestNote?.followUpDate || null;
        let pFollowUpStatus: 'overdue' | 'due_soon' | 'up_to_date' | 'none' = 'none';
        let overdueDays = 0;

        if (followUpDueDate) {
          const dueDateObj = new Date(followUpDueDate);
          const diffTime = now.getTime() - dueDateObj.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            pFollowUpStatus = 'overdue';
            overdueDays = diffDays;
          } else if (diffDays >= -7) {
            pFollowUpStatus = 'due_soon';
          } else {
            pFollowUpStatus = 'up_to_date';
          }
        }

        // Explainable clinical risk assessment (Approved guidelines, not black-box AI)
        const riskAssessment = evaluateClinicalRisk(
          latestUpdate?.vitals,
          latestUpdate?.symptoms,
          overdueDays
        );

        // Age calculation
        let calculatedAge: number | undefined;
        if (profile?.dateOfBirth) {
          calculatedAge = Math.floor(
            (now.getTime() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          );
        }

        const patientCode = `VQ-PT-${pUser._id.toString().slice(-6).toUpperCase()}`;

        return {
          id: pUser._id.toString(),
          patientNumber: patientCode,
          fullName: pUser.fullName,
          phone: pUser.phone,
          email: pUser.email,
          age: calculatedAge,
          gender: profile?.gender,
          bloodGroup: profile?.bloodGroup,
          address: profile?.address,
          primaryCondition: profile?.chronicConditions?.[0] || 'Under Active Palliative Triage',
          chronicConditions: profile?.chronicConditions || [],
          allergies: profile?.allergies || [],
          latestUpdate: latestUpdate
            ? {
                id: latestUpdate._id.toString(),
                submittedAt: latestUpdate.submittedAt,
                submitter: latestUpdate.submittedBy,
                symptoms: latestUpdate.symptoms,
                vitals: latestUpdate.vitals,
                reviewStatus: latestUpdate.reviewStatus,
                isClinicallyVerified: latestUpdate.isClinicallyVerified,
              }
            : null,
          lastConsultation: lastCompletedApt
            ? {
                appointmentNumber: lastCompletedApt.appointmentNumber,
                date: lastCompletedApt.appointmentDate,
                mode: lastCompletedApt.consultationMode,
              }
            : null,
          nextAppointment: nextScheduledApt
            ? {
                appointmentNumber: nextScheduledApt.appointmentNumber,
                date: nextScheduledApt.appointmentDate,
                timeSlot: nextScheduledApt.timeSlot,
                mode: nextScheduledApt.consultationMode,
                status: nextScheduledApt.status,
              }
            : null,
          riskCategory: {
            level: riskAssessment.overallLevel,
            reason: riskAssessment.primaryReason,
            source: riskAssessment.source,
            timestamp: riskAssessment.timestamp,
          },
          followUp: {
            dueDate: followUpDueDate,
            status: pFollowUpStatus,
            overdueDays,
          },
          reviewStatus: latestUpdate?.reviewStatus || 'none',
        };
      })
    );

    // 4. Apply in-memory clinical filters
    let filteredList = patientsDetailed;

    if (condition && condition !== 'all' && typeof condition === 'string') {
      const condRegex = new RegExp(condition.trim(), 'i');
      filteredList = filteredList.filter(
        (p) =>
          condRegex.test(p.primaryCondition) ||
          p.chronicConditions.some((c) => condRegex.test(c))
      );
    }

    if (riskLevel && riskLevel !== 'all' && typeof riskLevel === 'string') {
      filteredList = filteredList.filter((p) => p.riskCategory.level === riskLevel);
    }

    if (followUpFilter && followUpFilter !== 'all' && typeof followUpFilter === 'string') {
      filteredList = filteredList.filter((p) => p.followUp.status === followUpFilter);
    }

    const total = filteredList.length;
    const totalPages = Math.ceil(total / limitNum);
    const paginated = filteredList.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.status(200).json({
      success: true,
      count: paginated.length,
      total,
      page: pageNum,
      totalPages,
      data: paginated,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 5. GET /api/v1/doctors/me/patients/:id - Full 7-Tab Patient Clinical Dossier
// -----------------------------------------------------------------------------
router.get('/me/patients/:id', authenticateUser, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    if (user.role !== 'professional' && user.role !== 'admin') {
      throw new AppError('Only verified healthcare professionals can access patient clinical dossiers', 403);
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid patient identifier', 400);
    }

    const patientObjectId = new mongoose.Types.ObjectId(id);
    const patientUser = await User.findById(patientObjectId);
    if (!patientUser) {
      throw new AppError(`Patient with ID '${id}' not found`, 404);
    }

    // STRICT SERVER-SIDE ACCESS CONTROL:
    // Only clinicians with a documented appointment, visit or administrative role may access
    const isAssigned = await isPatientAssignedToDoctor(patientObjectId, user._id);
    const isAdmin = ['admin', 'super_admin'].includes(user.role);

    if (!isAssigned && !isAdmin) {
      throw new AppError('Access denied: You are not an authorized provider for this patient', 403);
    }

    // Parallel fetch for complete dossier
    const [profile, appointments, fieldVisits, dailyUpdates, clinicalNotes, documents] = await Promise.all([
      PatientProfile.findOne({ userId: patientObjectId }).lean(),
      Appointment.find({ patientId: patientObjectId })
        .populate('doctorId', 'fullName')
        .sort({ appointmentDate: -1 })
        .lean(),
      FieldVisit.find({ patientId: patientObjectId })
        .sort({ scheduledDate: -1 })
        .lean(),
      DailyHealthUpdate.find({ patientId: patientObjectId })
        .populate('reviewedBy', 'fullName')
        .sort({ submittedAt: -1 })
        .lean(),
      ClinicalNote.find({ patientId: patientObjectId })
        .sort({ createdAt: -1 })
        .lean(),
      UploadedFile.find({
        uploadedBy: patientObjectId,
        fileCategory: { $in: ['clinical_report', 'prescription'] },
      })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    // Compute age
    let calculatedAge: number | undefined;
    if (profile?.dateOfBirth) {
      calculatedAge = Math.floor(
        (now.getTime() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
    }

    // Extract next appointment and last consultation
    const upcomingApt = appointments.find((a) => a.appointmentDate >= todayStr && a.status !== 'cancelled');
    const pastCompletedApt = appointments.find((a) => a.status === 'completed');

    // Follow-up status
    const latestNote = clinicalNotes[0];
    const followUpDueDate = latestNote?.followUpDate || null;
    let followUpStatus: 'overdue' | 'due_soon' | 'up_to_date' | 'none' = 'none';
    let overdueDays = 0;

    if (followUpDueDate) {
      const dueDateObj = new Date(followUpDueDate);
      const diffTime = now.getTime() - dueDateObj.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        followUpStatus = 'overdue';
        overdueDays = diffDays;
      } else if (diffDays >= -7) {
        followUpStatus = 'due_soon';
      } else {
        followUpStatus = 'up_to_date';
      }
    }

    // Extract verified medications from completed appointments
    const verifiedMedications: any[] = [];
    appointments.forEach((apt) => {
      if (apt.prescription?.medicines && apt.prescription.medicines.length > 0) {
        apt.prescription.medicines.forEach((med: any) => {
          verifiedMedications.push({
            ...med,
            prescribedBy: apt.doctorId ? (apt.doctorId as any).fullName : 'Clinician',
            prescribedDate: apt.appointmentDate,
            appointmentNumber: apt.appointmentNumber,
          });
        });
      }
    });

    // Patient-reported symptoms timeline (segregated from verified medical record)
    const patientReportedSymptoms: any[] = [];
    dailyUpdates.forEach((up) => {
      if (up.symptoms && up.symptoms.length > 0) {
        patientReportedSymptoms.push({
          submittedAt: up.submittedAt,
          submittedBy: up.submittedBy,
          symptoms: up.symptoms,
          notes: up.notes,
          isPatientReported: true,
        });
      }
    });

    // Explainable clinical risk
    const latestUpdate = dailyUpdates[0];
    const riskAssessment = evaluateClinicalRisk(
      latestUpdate?.vitals,
      latestUpdate?.symptoms,
      overdueDays
    );

    // Audit logging of sensitive clinical record access
    await AuditLog.create({
      action: 'PATIENT_DOSSIER_ACCESSED',
      category: 'security_governance',
      actorId: user._id,
      actorName: user.fullName,
      actorRole: user.role,
      targetType: 'patient_clinical_record',
      targetId: id,
      details: { patientName: patientUser.fullName },
      severity: 'info',
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      data: {
        // Tab A: Overview
        overview: {
          id: patientUser._id.toString(),
          patientNumber: `VQ-PT-${patientUser._id.toString().slice(-6).toUpperCase()}`,
          fullName: patientUser.fullName,
          phone: patientUser.phone,
          email: patientUser.email,
          age: calculatedAge,
          dateOfBirth: profile?.dateOfBirth,
          gender: profile?.gender,
          bloodGroup: profile?.bloodGroup,
          address: profile?.address,
          emergencyContact: profile?.emergencyContact,
          primaryLanguage: profile?.primaryLanguage || 'English / Hindi',
          assignedDoctor: {
            id: user._id.toString(),
            name: user.fullName,
            role: user.role,
          },
          currentCarePlan: latestNote?.plan || 'Personalized Palliative Home Care Plan',
          nextAppointment: upcomingApt
            ? {
                id: upcomingApt._id.toString(),
                appointmentNumber: upcomingApt.appointmentNumber,
                date: upcomingApt.appointmentDate,
                timeSlot: upcomingApt.timeSlot,
                consultationMode: upcomingApt.consultationMode,
                status: upcomingApt.status,
              }
            : null,
          lastConsultation: pastCompletedApt
            ? {
                appointmentNumber: pastCompletedApt.appointmentNumber,
                date: pastCompletedApt.appointmentDate,
                mode: pastCompletedApt.consultationMode,
              }
            : null,
        },

        // Tab B: Medical History (Verified vs Patient-Reported)
        medicalHistory: {
          verified: {
            diagnoses: profile?.chronicConditions || [],
            allergies: profile?.allergies || [],
            medications: verifiedMedications,
            previousConsultationsCount: appointments.filter((a) => a.status === 'completed').length,
          },
          patientReported: patientReportedSymptoms,
        },

        // Tab C: Daily Health Updates (Chronological timeline)
        dailyUpdates: dailyUpdates.map((u) => ({
          id: u._id.toString(),
          submittedAt: u.submittedAt,
          submitter: u.submittedBy,
          symptoms: u.symptoms || [],
          vitals: u.vitals || null,
          notes: u.notes,
          isClinicallyVerified: u.isClinicallyVerified, // Explicitly false until verified
          reviewStatus: u.reviewStatus,
          reviewedBy: u.reviewedBy,
          reviewedAt: u.reviewedAt,
          clinicianNotes: u.clinicianNotes,
          followUpAction: u.followUpAction,
          riskIndicators: u.riskIndicators || [],
        })),

        // Tab D: Clinical Notes (Doctor-authored)
        clinicalNotes: clinicalNotes.map((n) => ({
          id: n._id.toString(),
          doctorName: n.doctorName,
          doctorSpecialty: n.doctorSpecialty,
          subjective: n.subjective,
          objective: n.objective,
          assessment: n.assessment,
          plan: n.plan,
          followUpInstructions: n.followUpInstructions,
          followUpDate: n.followUpDate,
          createdAt: n.createdAt,
        })),

        // Tab E: Appointments & Visits
        appointmentsAndVisits: {
          appointments: appointments.map((a) => ({
            id: a._id.toString(),
            appointmentNumber: a.appointmentNumber,
            date: a.appointmentDate,
            timeSlot: a.timeSlot,
            consultationMode: a.consultationMode,
            status: a.status,
            clinicalReason: a.clinicalReason,
            doctorNotes: a.doctorNotes,
            prescription: a.prescription,
          })),
          fieldVisits: fieldVisits.map((v) => ({
            id: v._id.toString(),
            visitNumber: v.visitNumber,
            visitType: v.visitType,
            status: v.status,
            scheduledDate: v.scheduledDate,
            timeSlot: v.timeSlot,
            providerName: v.providerName,
            clinicalDocumentation: v.clinicalDocumentation,
          })),
        },

        // Tab F: Reports & Documents (Authorized uploads)
        documents: documents.map((doc) => ({
          id: doc._id.toString(),
          fileId: doc.fileId,
          originalFilename: doc.originalFilename,
          mimeType: doc.mimeType,
          fileSizeBytes: doc.fileSizeBytes,
          fileCategory: doc.fileCategory,
          createdAt: doc.createdAt,
        })),

        // Tab G: Follow-up Plan
        followUpPlan: {
          dueDate: followUpDueDate,
          status: followUpStatus,
          overdueDays,
          instructions: latestNote?.followUpInstructions || 'Continue scheduled medication and record daily updates.',
          nextScheduledBooking: upcomingApt
            ? {
                date: upcomingApt.appointmentDate,
                timeSlot: upcomingApt.timeSlot,
              }
            : null,
        },

        // Explainable Risk Assessment
        riskAssessment: {
          level: riskAssessment.overallLevel,
          requiresReview: riskAssessment.requiresReview,
          primaryReason: riskAssessment.primaryReason,
          source: riskAssessment.source,
          timestamp: riskAssessment.timestamp,
          indicators: riskAssessment.indicators,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 6. POST /api/v1/doctors/me/patients/:id/clinical-notes - Doctor Authors Note
// -----------------------------------------------------------------------------
router.post(
  '/me/patients/:id/clinical-notes',
  authenticateUser,
  validateRequest({ body: createClinicalNoteSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      if (user.role !== 'professional' && user.role !== 'admin') {
        throw new AppError('Only authorized healthcare professionals can author clinical notes', 403);
      }

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid patient identifier', 400);
      }

      const patientObjectId = new mongoose.Types.ObjectId(id);
      const isAssigned = await isPatientAssignedToDoctor(patientObjectId, user._id);
      if (!isAssigned && user.role !== 'admin') {
        throw new AppError('Access denied: You are not an authorized provider for this patient', 403);
      }

      const {
        subjective,
        objective,
        assessment,
        plan,
        followUpInstructions,
        followUpDate,
        appointmentId,
        fieldVisitId,
      } = req.body;

      const profile = await HealthcareProfessionalProfile.findOne({ userId: user._id });

      const note = await ClinicalNote.create({
        patientId: patientObjectId,
        doctorId: user._id,
        doctorName: user.fullName,
        doctorSpecialty: profile?.specializations?.[0] || 'Consultant Clinician',
        appointmentId: appointmentId && mongoose.Types.ObjectId.isValid(appointmentId) ? new mongoose.Types.ObjectId(appointmentId) : undefined,
        fieldVisitId: fieldVisitId && mongoose.Types.ObjectId.isValid(fieldVisitId) ? new mongoose.Types.ObjectId(fieldVisitId) : undefined,
        subjective,
        objective,
        assessment,
        plan,
        followUpInstructions,
        followUpDate,
        isAuditVerified: true,
      });

      // Audit log creation of sensitive clinical note
      await AuditLog.create({
        action: 'CLINICAL_NOTE_CREATED',
        category: 'security_governance',
        actorId: user._id,
        actorName: user.fullName,
        actorRole: user.role,
        targetType: 'clinical_note',
        targetId: note._id.toString(),
        details: { patientId: id },
        severity: 'info',
        timestamp: new Date(),
      });

      res.status(201).json({
        success: true,
        message: 'Clinical note recorded successfully',
        data: note,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 7. POST /api/v1/doctors/me/patients/:id/follow-up - Update Follow-up Plan
// -----------------------------------------------------------------------------
router.post(
  '/me/patients/:id/follow-up',
  authenticateUser,
  validateRequest({ body: updateFollowUpPlanSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      if (user.role !== 'professional' && user.role !== 'admin') {
        throw new AppError('Only authorized healthcare professionals can update patient follow-up plans', 403);
      }

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid patient identifier', 400);
      }

      const isAssigned = await isPatientAssignedToDoctor(id, user._id);
      if (!isAssigned && user.role !== 'admin') {
        throw new AppError('Access denied: You are not an authorized provider for this patient', 403);
      }

      const { followUpDate, careTasks = [], instructions } = req.body;

      const profile = await HealthcareProfessionalProfile.findOne({ userId: user._id });

      const note = await ClinicalNote.create({
        patientId: new mongoose.Types.ObjectId(id),
        doctorId: user._id,
        doctorName: user.fullName,
        doctorSpecialty: profile?.specializations?.[0] || 'Consultant Clinician',
        assessment: 'Care Plan & Follow-up Target Update',
        plan: `Follow-up scheduled for ${followUpDate}. Care tasks: ${careTasks.join(', ') || 'Routine daily monitoring'}.`,
        followUpInstructions: instructions || 'Maintain daily updates and adhere to clinical instructions.',
        followUpDate,
        isAuditVerified: true,
      });

      res.status(200).json({
        success: true,
        message: 'Follow-up plan updated successfully',
        data: {
          followUpDate,
          careTasks,
          noteId: note._id.toString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 8. GET /api/v1/doctors/me/health-updates - Doctor Review Queue for Updates
// -----------------------------------------------------------------------------
router.get('/me/health-updates', authenticateUser, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    if (user.role !== 'professional' && user.role !== 'admin') {
      throw new AppError('Only healthcare professionals can access health updates review queue', 403);
    }

    const { status = 'all' } = req.query;

    const [patientIdsFromApts, patientIdsFromVisits] = await Promise.all([
      Appointment.distinct('patientId', { doctorId: user._id }),
      FieldVisit.distinct('patientId', { providerId: user._id }),
    ]);

    const assignedPatientIds = Array.from(
      new Set([
        ...patientIdsFromApts.map((id: any) => id?.toString()),
        ...patientIdsFromVisits.filter(Boolean).map((id: any) => id?.toString()),
      ])
    )
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    let query: Record<string, any> = { patientId: { $in: assignedPatientIds } };
    if (status && status !== 'all') {
      query.reviewStatus = status;
    }

    const updates = await DailyHealthUpdate.find(query)
      .populate('patientId', 'fullName phone email')
      .populate('reviewedBy', 'fullName')
      .sort({ submittedAt: -1 })
      .limit(100);

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
// 9. PATCH /api/v1/doctors/me/health-updates/:id/review - Clinician Review Action
// -----------------------------------------------------------------------------
router.patch(
  '/me/health-updates/:id/review',
  authenticateUser,
  validateRequest({ body: reviewHealthUpdateSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      if (user.role !== 'professional' && user.role !== 'admin') {
        throw new AppError('Only healthcare professionals can review patient health updates', 403);
      }

      const { id } = req.params;
      const { reviewStatus, clinicianNotes, followUpAction } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid health update identifier', 400);
      }

      const update = await DailyHealthUpdate.findById(id);
      if (!update) {
        throw new AppError(`Daily health update '${id}' not found`, 404);
      }

      // Check doctor assignment to patient
      const isAssigned = await isPatientAssignedToDoctor(update.patientId, user._id);
      if (!isAssigned && user.role !== 'admin') {
        throw new AppError('Access denied: You are not assigned to this patient', 403);
      }

      update.reviewStatus = reviewStatus;
      update.clinicianNotes = clinicianNotes;
      if (followUpAction) update.followUpAction = followUpAction;
      update.reviewedBy = user._id as mongoose.Types.ObjectId;
      update.reviewedAt = new Date();

      await update.save();

      await AuditLog.create({
        action: 'PATIENT_HEALTH_UPDATE_REVIEWED',
        category: 'security_governance',
        actorId: user._id,
        actorName: user.fullName,
        actorRole: user.role,
        targetType: 'daily_health_update',
        targetId: id,
        details: { patientId: update.patientId.toString(), reviewStatus },
        severity: 'info',
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: `Health update marked as ${reviewStatus} with clinician documentation`,
        data: update,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 10. GET /api/v1/doctors/dashboard/appointments & /me/appointments - Schedule Queue
// -----------------------------------------------------------------------------
const getDoctorAppointmentsHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    if (user.role !== 'professional' && user.role !== 'admin') {
      throw new AppError('Only verified healthcare professionals can access doctor appointments schedule', 403);
    }

    const doctorId = user._id;
    const { view, date, status } = req.query;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    let query: Record<string, any> = { doctorId };

    if (view === 'today') {
      query.appointmentDate = todayStr;
    } else if (view === 'upcoming') {
      query.appointmentDate = { $gte: todayStr };
      query.status = { $in: ['confirmed', 'pending', 'in_progress', 'reschedule_requested'] };
    } else if (view === 'pending_requests' || view === 'pending') {
      query.status = 'pending';
    } else if (view === 'completed') {
      query.status = 'completed';
    } else if (date) {
      query.appointmentDate = date as string;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'fullName phone email')
      .sort({ appointmentDate: 1, 'timeSlot.startTime': 1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

router.get('/dashboard/appointments', authenticateUser, getDoctorAppointmentsHandler);
router.get('/me/appointments', authenticateUser, getDoctorAppointmentsHandler);

// -----------------------------------------------------------------------------
// 11. PUT /api/v1/doctors/schedule - Update Working Schedule & Availability
// -----------------------------------------------------------------------------
router.put(
  '/schedule',
  authenticateUser,
  validateRequest({ body: updateScheduleSchema }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      if (user.role !== 'professional' && user.role !== 'admin') {
        throw new AppError('Only healthcare professionals can update doctor availability schedule', 403);
      }

      let availability = await DoctorAvailability.findOne({ doctorId: user._id });

      if (!availability) {
        const profile = await HealthcareProfessionalProfile.findOne({ userId: user._id });
        availability = new DoctorAvailability({
          doctorId: user._id,
          doctorProfileId: profile?._id,
          city: 'Pune',
        });
      }

      const {
        slotDurationMinutes,
        bufferMinutes,
        weeklySchedule,
        breakTimes,
        blackoutDates,
        consultationModes,
        fees,
        clinicAddress,
        city,
      } = req.body;

      if (slotDurationMinutes !== undefined) availability.slotDurationMinutes = slotDurationMinutes;
      if (bufferMinutes !== undefined) availability.bufferMinutes = bufferMinutes;
      if (weeklySchedule !== undefined) availability.weeklySchedule = weeklySchedule;
      if (breakTimes !== undefined) availability.breakTimes = breakTimes;
      if (blackoutDates !== undefined) availability.blackoutDates = blackoutDates;
      if (consultationModes !== undefined) availability.consultationModes = consultationModes;
      if (fees !== undefined) availability.fees = { ...availability.fees, ...fees };
      if (clinicAddress !== undefined) availability.clinicAddress = clinicAddress;
      if (city !== undefined) availability.city = city;

      await availability.save();

      res.status(200).json({
        success: true,
        message: 'Doctor schedule and availability updated successfully',
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 12. GET /api/v1/doctors/:id - Single Doctor Details
// -----------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await seedDemoDoctorsIfEmpty();

    let user: any = null;
    let profile: any = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
      if (user) {
        profile = await HealthcareProfessionalProfile.findOne({ userId: user._id });
      }
      if (!profile) {
        profile = await HealthcareProfessionalProfile.findById(id).populate('userId');
        if (profile) {
          user = profile.userId;
        }
      }
    }

    if (!user || !profile) {
      throw new AppError(`Healthcare professional with ID '${id}' not found`, 404);
    }

    let availability = await DoctorAvailability.findOne({ doctorId: user._id });
    if (!availability) {
      availability = await DoctorAvailability.create({
        doctorId: user._id,
        doctorProfileId: profile._id,
        city: 'Pune',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        profileId: profile._id.toString(),
        fullName: user.fullName,
        title: profile.title || 'Dr.',
        professionType: profile.professionType,
        specializations: profile.specializations,
        registrationNumber: profile.registrationNumber,
        registrationCouncil: profile.registrationCouncil,
        yearsOfExperience: profile.yearsOfExperience,
        serviceClusters: profile.serviceClusters,
        verificationStatus: profile.verificationStatus,
        bio: profile.bio,
        rating: profile.rating,
        totalVisitsCompleted: profile.totalVisitsCompleted,
        consultationModes: availability.consultationModes,
        fees: availability.fees,
        clinicAddress: availability.clinicAddress,
        city: availability.city,
        slotDurationMinutes: availability.slotDurationMinutes,
        weeklySchedule: availability.weeklySchedule,
        breakTimes: availability.breakTimes,
        blackoutDates: availability.blackoutDates,
        isSeededDemo: user.phone?.startsWith('982001100'),
      },
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 13. GET /api/v1/doctors/:id/availability - Doctor Availability Rules
// -----------------------------------------------------------------------------
router.get('/:id/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    let availability = await DoctorAvailability.findOne({ doctorId: id });

    if (!availability) {
      const user = await User.findById(id);
      if (!user) throw new AppError('Doctor not found', 404);
      availability = await DoctorAvailability.create({
        doctorId: user._id,
        city: 'Pune',
      });
    }

    res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 14. GET /api/v1/doctors/:id/slots - Available Time Slots for Specific Date
// -----------------------------------------------------------------------------
router.get('/:id/slots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { date, mode } = req.query;

    if (!date || typeof date !== 'string') {
      throw new AppError('Query parameter "date" (YYYY-MM-DD) is required', 400);
    }

    const slotInfo = await calculateDoctorSlots({
      doctorId: id,
      date,
      consultationMode: mode as any,
    });

    res.status(200).json({
      success: true,
      data: slotInfo,
    });
  } catch (error) {
    next(error);
  }
});

export const doctorRoutes = router;
