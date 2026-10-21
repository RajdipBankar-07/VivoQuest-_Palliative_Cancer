import mongoose from 'mongoose';
import { User, IUser } from '../models/User.js';
import { HealthcareProfessionalProfile, IHealthcareProfessionalProfile } from '../models/HealthcareProfessionalProfile.js';
import { DoctorAvailability, IDoctorAvailability, ConsultationMode } from '../models/DoctorAvailability.js';
import { Appointment, IAppointment } from '../models/Appointment.js';
import { AppError } from '../middleware/errorHandler.js';

export interface DoctorSlotItem {
  startTime: string; // "09:00"
  endTime: string;   // "09:30"
  isAvailable: boolean;
  reason?: 'available' | 'booked' | 'break' | 'past' | 'holiday' | 'outside_shift';
}

export interface DoctorSlotsResponse {
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  dayOfWeek: number;
  dayName: string;
  isWorkingDay: boolean;
  slotDurationMinutes: number;
  consultationModes: ConsultationMode[];
  fees: {
    in_clinic: number;
    video: number;
    home_visit: number;
    currency: string;
  };
  totalSlots: number;
  availableCount: number;
  slots: DoctorSlotItem[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Standard password hash for demo seeded doctors
 */
const DEMO_PASSWORD_HASH = '$2a$10$wK1W3uL.kG6N5o.z.60QeOq7w8x0Y.9.0QeOq7w8x0Y.9.0QeOq7';

/**
 * High-quality demonstration doctors representing VivoQuest palliative and chronic care
 */
export const SEED_DEMO_DOCTORS = [
  {
    fullName: 'Dr. Aditi Rao',
    phone: '9820011001',
    email: 'dr.aditi.rao@vivoquest.in',
    title: 'Dr.',
    professionType: 'physician' as const,
    specializations: ['Palliative Oncology', 'Symptom & Pain Management', 'Advanced Cancer Care'],
    registrationNumber: 'MMC-2012-08819',
    registrationCouncil: 'Maharashtra Medical Council',
    yearsOfExperience: 12,
    serviceClusters: ['Pune-Camp', 'Deccan', 'Shivajinagar'],
    verificationStatus: 'verified' as const,
    bio: 'Senior Consultant in Palliative Oncology. Dedicated to cancer pain management, compassionate end-of-life care, and home palliative consultations across Pune.',
    rating: 4.95,
    totalVisitsCompleted: 480,
    fees: { in_clinic: 900, video: 600, home_visit: 1500, currency: 'INR' },
    clinicAddress: 'VivoQuest Comprehensive Care Clinic, MG Road, Camp, Pune 411001',
    city: 'Pune',
  },
  {
    fullName: 'Dr. Sandeep Kulkarni',
    phone: '9820011002',
    email: 'dr.sandeep.k@vivoquest.in',
    title: 'Dr.',
    professionType: 'physician' as const,
    specializations: ['Palliative Medicine', 'Hospice Care', 'Geriatric Supportive Care'],
    registrationNumber: 'MMC-2015-04123',
    registrationCouncil: 'Maharashtra Medical Council',
    yearsOfExperience: 9,
    serviceClusters: ['Kothrud', 'Baner', 'Aundh'],
    verificationStatus: 'verified' as const,
    bio: 'Fellow in Palliative Medicine. Focuses on holistic comfort care, non-malignant chronic palliative medicine, and coordinated multidisciplinary home care.',
    rating: 4.9,
    totalVisitsCompleted: 350,
    fees: { in_clinic: 800, video: 500, home_visit: 1300, currency: 'INR' },
    clinicAddress: 'Kothrud Wellness Centre, Paud Road, Pune 411038',
    city: 'Pune',
  },
  {
    fullName: 'Priya Deshmukh, PT',
    phone: '9820011003',
    email: 'priya.pt@vivoquest.in',
    title: 'PT',
    professionType: 'physiotherapist' as const,
    specializations: ['Oncology Physiotherapy', 'Lymphedema Management', 'Geriatric Mobility'],
    registrationNumber: 'IAP-PT-9041',
    registrationCouncil: 'Indian Association of Physiotherapists',
    yearsOfExperience: 7,
    serviceClusters: ['Viman Nagar', 'Kalyani Nagar', 'Koregaon Park'],
    verificationStatus: 'verified' as const,
    bio: 'Certified Cancer Rehabilitation Physiotherapist. Specializes in gentle mobility exercises, post-surgical rehabilitation, and palliative pain relief techniques.',
    rating: 4.88,
    totalVisitsCompleted: 290,
    fees: { in_clinic: 700, video: 400, home_visit: 1100, currency: 'INR' },
    clinicAddress: 'East Pune Physical Rehab, Viman Nagar, Pune 411014',
    city: 'Pune',
  },
  {
    fullName: 'Sister Mary Fernandes',
    phone: '9820011004',
    email: 'mary.nurse@vivoquest.in',
    title: 'Sr.',
    professionType: 'nurse' as const,
    specializations: ['Palliative Oncology Nursing', 'Wound & Stoma Care', 'PICC / Infusion Management'],
    registrationNumber: 'MNC-RN-7721',
    registrationCouncil: 'Maharashtra Nursing Council',
    yearsOfExperience: 10,
    serviceClusters: ['Aundh', 'Pashan', 'Shivajinagar'],
    verificationStatus: 'verified' as const,
    bio: 'Palliative Care Specialist Nurse. Expert in home-based pain catheter maintenance, syringe drivers, pressure injury management, and family caregiver education.',
    rating: 4.96,
    totalVisitsCompleted: 520,
    fees: { in_clinic: 600, video: 350, home_visit: 900, currency: 'INR' },
    clinicAddress: 'Aundh Community Health Clinic, Pune 411007',
    city: 'Pune',
  },
  {
    fullName: 'Dr. Ananya Sen',
    phone: '9820011005',
    email: 'ananya.sen@vivoquest.in',
    title: 'Dr.',
    professionType: 'chw' as const,
    specializations: ['Psycho-Oncology Counseling', 'Grief & Bereavement Support', 'Caregiver Burnout Therapy'],
    registrationNumber: 'RCI-CR-5521',
    registrationCouncil: 'Rehabilitation Council of India',
    yearsOfExperience: 8,
    serviceClusters: ['Koregaon Park', 'Kalyani Nagar'],
    verificationStatus: 'verified' as const,
    bio: 'Clinical Psychologist specialized in psycho-oncology. Provides compassionate counseling for cancer patients, family coping sessions, and anticipatory grief support.',
    rating: 4.92,
    totalVisitsCompleted: 310,
    fees: { in_clinic: 850, video: 600, home_visit: 1200, currency: 'INR' },
    clinicAddress: 'Harmony Counseling Suite, North Main Road, Koregaon Park, Pune 411001',
    city: 'Pune',
  },
  {
    fullName: 'Rahul Mehta',
    phone: '9820011006',
    email: 'rahul.diet@vivoquest.in',
    title: 'Dt.',
    professionType: 'dietitian' as const,
    specializations: ['Clinical Oncology Nutrition', 'Enteral & Tube Feeding', 'Cachexia Management'],
    registrationNumber: 'IDA-NUT-3142',
    registrationCouncil: 'Indian Dietetic Association',
    yearsOfExperience: 6,
    serviceClusters: ['Hadapsar', 'Magarpatta', 'Kharadi'],
    verificationStatus: 'verified' as const,
    bio: 'Clinical Dietitian specializing in nutritional therapy for oncology patients. Formulates custom high-protein palatable diets for patients undergoing active therapy.',
    rating: 4.85,
    totalVisitsCompleted: 230,
    fees: { in_clinic: 650, video: 450, home_visit: 950, currency: 'INR' },
    clinicAddress: 'Magarpatta Clinical Wellness, Cybercity, Hadapsar, Pune 411028',
    city: 'Pune',
  },
];

import { hashPassword } from './authService.js';

/**
 * Seed demonstration healthcare specialists and initial availability schedules if not already present
 */
export const seedDemoDoctorsIfEmpty = async (): Promise<void> => {
  const demoHash = await hashPassword('Password#2026');

  for (const doc of SEED_DEMO_DOCTORS) {
    let user = await User.findOne({ phone: doc.phone });
    if (!user) {
      user = await User.create({
        fullName: doc.fullName,
        phone: doc.phone,
        email: doc.email,
        passwordHash: demoHash,
        role: 'professional',
        isPhoneVerified: true,
        isEmailVerified: true,
        status: 'active',
        dpdpConsent: {
          accepted: true,
          consentedAt: new Date(),
          policyVersion: 'DPDP-2023-V1.0',
        },
      });
    }

    let profile = await HealthcareProfessionalProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = await HealthcareProfessionalProfile.create({
        userId: user._id,
        title: doc.title,
        professionType: doc.professionType,
        specializations: doc.specializations,
        registrationNumber: doc.registrationNumber,
        registrationCouncil: doc.registrationCouncil,
        yearsOfExperience: doc.yearsOfExperience,
        serviceClusters: doc.serviceClusters,
        verificationStatus: doc.verificationStatus,
        bio: doc.bio,
        rating: doc.rating,
        totalVisitsCompleted: doc.totalVisitsCompleted,
        isActiveForDispatch: true,
      });
    }

    let availability = await DoctorAvailability.findOne({ doctorId: user._id });
    if (!availability) {
      await DoctorAvailability.create({
        doctorId: user._id,
        doctorProfileId: profile._id,
        slotDurationMinutes: 30,
        bufferMinutes: 5,
        weeklySchedule: [
          {
            dayOfWeek: 1, // Mon
            isWorkingDay: true,
            shifts: [
              { startTime: '09:00', endTime: '13:00' },
              { startTime: '14:00', endTime: '18:00' },
            ],
          },
          {
            dayOfWeek: 2, // Tue
            isWorkingDay: true,
            shifts: [
              { startTime: '09:00', endTime: '13:00' },
              { startTime: '14:00', endTime: '18:00' },
            ],
          },
          {
            dayOfWeek: 3, // Wed
            isWorkingDay: true,
            shifts: [
              { startTime: '09:00', endTime: '13:00' },
              { startTime: '14:00', endTime: '18:00' },
            ],
          },
          {
            dayOfWeek: 4, // Thu
            isWorkingDay: true,
            shifts: [
              { startTime: '09:00', endTime: '13:00' },
              { startTime: '14:00', endTime: '18:00' },
            ],
          },
          {
            dayOfWeek: 5, // Fri
            isWorkingDay: true,
            shifts: [
              { startTime: '09:00', endTime: '13:00' },
              { startTime: '14:00', endTime: '18:00' },
            ],
          },
          {
            dayOfWeek: 6, // Sat
            isWorkingDay: true,
            shifts: [{ startTime: '09:00', endTime: '14:00' }],
          },
          {
            dayOfWeek: 0, // Sun
            isWorkingDay: false,
            shifts: [],
          },
        ],
        breakTimes: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch Break' }],
        blackoutDates: [],
        consultationModes: ['in_clinic', 'video', 'home_visit'],
        fees: doc.fees,
        clinicAddress: doc.clinicAddress,
        city: doc.city,
        isActive: true,
      });
    }
  }

  console.log('[Seed] Demonstration healthcare professionals and schedules seeded successfully.');
};

/**
 * Helper to convert "HH:mm" string to minutes from midnight
 */
const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * Helper to convert minutes from midnight to "HH:mm"
 */
const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Calculates dynamically available appointment time slots for a given doctor and date
 */
export const calculateDoctorSlots = async (params: {
  doctorId: string;
  date: string; // YYYY-MM-DD
  consultationMode?: ConsultationMode;
}): Promise<DoctorSlotsResponse> => {
  const { doctorId, date, consultationMode } = params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError('Date must be in YYYY-MM-DD format', 400);
  }

  // Find user and profile
  const user = await User.findById(doctorId);
  if (!user) {
    throw new AppError('Doctor / healthcare professional not found', 404);
  }

  const profile = await HealthcareProfessionalProfile.findOne({ userId: doctorId });
  let availability = await DoctorAvailability.findOne({ doctorId });

  // If no availability document exists, initialize default
  if (!availability) {
    availability = await DoctorAvailability.create({
      doctorId: user._id,
      doctorProfileId: profile?._id,
      slotDurationMinutes: 30,
      bufferMinutes: 5,
      city: 'Pune',
    });
  }

  // Parse target date and day of week
  const [year, month, day] = date.split('-').map(Number);
  const targetDateObj = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = targetDateObj.getUTCDay(); // 0=Sun, 1=Mon...
  const dayName = DAY_NAMES[dayOfWeek];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const isTargetDatePast = date < todayStr;
  const isTargetDateToday = date === todayStr;
  const currentMinutesToday = now.getHours() * 60 + now.getMinutes();

  // Check blackout / holiday dates
  const isBlackout = availability.blackoutDates?.includes(date);

  // Check weekly schedule
  const dayConfig = availability.weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
  const isWorkingDay = !!dayConfig?.isWorkingDay && !isBlackout && !isTargetDatePast;

  const slotDuration = availability.slotDurationMinutes || 30;
  const slots: DoctorSlotItem[] = [];

  if (isWorkingDay && dayConfig?.shifts?.length) {
    // Fetch active booked appointments for this doctor on this date
    const bookedAppointments = await Appointment.find({
      doctorId,
      appointmentDate: date,
      status: { $in: ['pending', 'confirmed', 'in_progress', 'reschedule_requested'] },
    });

    const bookedStartTimes = new Set(bookedAppointments.map((a) => a.timeSlot.startTime));

    // Generate slots for each shift
    for (const shift of dayConfig.shifts) {
      const shiftStartMins = timeToMinutes(shift.startTime);
      const shiftEndMins = timeToMinutes(shift.endTime);

      let currentMins = shiftStartMins;
      while (currentMins + slotDuration <= shiftEndMins) {
        const slotStartStr = minutesToTime(currentMins);
        const slotEndStr = minutesToTime(currentMins + slotDuration);

        // Check if overlaps with break time
        const isInBreak = availability.breakTimes.some((b) => {
          const bStart = timeToMinutes(b.startTime);
          const bEnd = timeToMinutes(b.endTime);
          return currentMins >= bStart && currentMins < bEnd;
        });

        // Check if past
        const isPast = isTargetDateToday && currentMins <= currentMinutesToday + 15; // 15-min booking lead time

        // Check if booked
        const isBooked = bookedStartTimes.has(slotStartStr);

        let isAvailable = true;
        let reason: DoctorSlotItem['reason'] = 'available';

        if (isInBreak) {
          isAvailable = false;
          reason = 'break';
        } else if (isPast) {
          isAvailable = false;
          reason = 'past';
        } else if (isBooked) {
          isAvailable = false;
          reason = 'booked';
        }

        slots.push({
          startTime: slotStartStr,
          endTime: slotEndStr,
          isAvailable,
          reason,
        });

        currentMins += slotDuration;
      }
    }
  }

  const availableCount = slots.filter((s) => s.isAvailable).length;

  return {
    doctorId: user._id.toString(),
    doctorName: user.fullName,
    specialty: profile?.specializations?.[0] || 'Palliative Medicine',
    date,
    dayOfWeek,
    dayName,
    isWorkingDay: isWorkingDay && slots.length > 0,
    slotDurationMinutes: slotDuration,
    consultationModes: availability.consultationModes,
    fees: availability.fees,
    totalSlots: slots.length,
    availableCount,
    slots,
  };
};

/**
 * Retrieves the directory of verified doctors with filters
 */
export const getDoctorsDirectory = async (filters: {
  search?: string;
  specialty?: string;
  professionType?: string;
  consultationMode?: string;
  city?: string;
}) => {
  await seedDemoDoctorsIfEmpty();

  const query: Record<string, any> = {
    isActiveForDispatch: true,
  };

  if (filters.professionType && filters.professionType !== 'all') {
    query.professionType = filters.professionType;
  }

  if (filters.specialty && filters.specialty !== 'all') {
    query.specializations = { $regex: filters.specialty, $options: 'i' };
  }

  if (filters.city && filters.city !== 'all') {
    query.serviceClusters = { $regex: filters.city, $options: 'i' };
  }

  const profiles = await HealthcareProfessionalProfile.find(query).populate('userId');

  const doctorList = [];

  for (const prof of profiles) {
    const userDoc = prof.userId as any;
    if (!userDoc) continue;

    // Search filter across name, bio, and specializations
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const nameMatch = userDoc.fullName?.toLowerCase().includes(searchLower);
      const bioMatch = prof.bio?.toLowerCase().includes(searchLower);
      const specMatch = prof.specializations?.some((s) => s.toLowerCase().includes(searchLower));
      if (!nameMatch && !bioMatch && !specMatch) {
        continue;
      }
    }

    // Availability & Fees
    const availability = await DoctorAvailability.findOne({ doctorId: userDoc._id });

    // Mode filter
    if (filters.consultationMode && filters.consultationMode !== 'all') {
      if (!availability?.consultationModes?.includes(filters.consultationMode as ConsultationMode)) {
        continue;
      }
    }

    const isSeededDemo = userDoc.phone?.startsWith('982001100');

    doctorList.push({
      id: userDoc._id.toString(),
      profileId: prof._id.toString(),
      fullName: userDoc.fullName,
      title: prof.title || 'Dr.',
      professionType: prof.professionType,
      specializations: prof.specializations,
      registrationNumber: prof.registrationNumber,
      registrationCouncil: prof.registrationCouncil,
      yearsOfExperience: prof.yearsOfExperience,
      serviceClusters: prof.serviceClusters,
      verificationStatus: prof.verificationStatus,
      bio: prof.bio,
      rating: prof.rating || 5.0,
      totalVisitsCompleted: prof.totalVisitsCompleted || 0,
      consultationModes: availability?.consultationModes || ['in_clinic', 'video', 'home_visit'],
      fees: availability?.fees || { in_clinic: 800, video: 500, home_visit: 1200, currency: 'INR' },
      clinicAddress: availability?.clinicAddress || 'VivoQuest Clinical Center, Pune',
      city: availability?.city || 'Pune',
      slotDurationMinutes: availability?.slotDurationMinutes || 30,
      isSeededDemo,
    });
  }

  return doctorList;
};
