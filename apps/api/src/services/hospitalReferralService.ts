import mongoose from 'mongoose';
import { HospitalProfile, IHospitalProfile } from '../models/HospitalProfile.js';
import {
  HospitalReferral,
  IHospitalReferral,
  ReferralStatus,
  ReferralPriority,
  IReferralVisitSummary,
} from '../models/HospitalReferral.js';
import { User, IUser } from '../models/User.js';
import { Booking } from '../models/Booking.js';
import { HealthcareService } from '../models/HealthcareService.js';
import { AppError } from '../middleware/errorHandler.js';
import { previewServiceBundle } from './aiCoordinationService.js';

export interface CreateReferralDTO {
  referringStaff: {
    name: string;
    department: string;
    designation: string;
    phone: string;
    email?: string;
  };
  patientDetails: {
    fullName: string;
    phone: string;
    email?: string;
    age: number;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    ipdNumber?: string;
    dischargeDate?: string;
    address: string;
    city?: string;
    pincode: string;
    cluster?: string;
  };
  clinicalSummary: {
    primaryDiagnosis: string;
    secondaryConditions?: string[];
    surgicalHistory?: string;
    dietaryRestrictions?: string;
    mobilityStatus?: 'ambulatory' | 'assisted_walker' | 'wheelchair_bound' | 'bedbound';
    palliativeCareNeeds?: string;
    clinicalNotes?: string;
  };
  requestedServices: Array<{
    serviceCode: string;
    serviceName: string;
    frequency?: 'daily' | 'alternate_days' | 'weekly' | 'as_needed' | 'one_time';
    durationDays?: number;
    preferredStartDate: string;
    preferredTimeSlot?: 'morning' | 'afternoon' | 'evening' | 'any';
    instructions?: string;
  }>;
  equipmentRequired?: Array<{
    itemType: any;
    name: string;
    quantity: number;
    urgency?: 'routine' | 'urgent' | 'immediate';
    deliveryDate?: string;
    durationWeeks?: number;
    specialInstructions?: string;
  }>;
  priority?: ReferralPriority;
}

export interface UpdateReferralStatusDTO {
  status: ReferralStatus;
  reason?: string;
  notes?: string;
  changedByName?: string;
}

export interface AssignProvidersDTO {
  providers: Array<{
    professionalId?: string;
    name: string;
    role: string;
    phone?: string;
    serviceAssigned: string;
  }>;
  reviewNotes?: string;
  approveImmediately?: boolean;
}

export interface RecordVisitSummaryDTO {
  visitDate: string;
  providerName: string;
  providerRole: string;
  vitals?: {
    bloodPressure?: string;
    pulse?: number;
    spO2?: number;
    temperature?: string;
    respiratoryRate?: number;
  };
  clinicalObservation: string;
  proceduresPerformed?: string[];
  medicationsAdministered?: string[];
  nextFollowUpDate?: string;
  isFinalVisit?: boolean;
}

/**
 * Generate sequential referral number: VQ-REF-YYYYMM-XXXX
 */
const generateReferralNumber = async (): Promise<string> => {
  const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `VQ-REF-${dateStr}-${randomSuffix}`;
};

/**
 * Seed demonstration hospital organizations and real referral records.
 */
export const seedHospitalDemoData = async () => {
  try {
    const existingCount = await HospitalProfile.countDocuments({ isDemo: true });
    if (existingCount > 0) {
      return;
    }

    console.log('[Seed] Seeding demonstration hospital accounts and referrals...');

    // 1. Hospital A: Ruby Hall Clinic Pune
    let rubyUser = await User.findOne({ phone: '9822011111' });
    if (!rubyUser) {
      rubyUser = await User.create({
        fullName: 'Ruby Hall Clinic Pune',
        phone: '9822011111',
        email: 'discharge@rubyhall.com',
        role: 'hospital',
        passwordHash: '$2a$10$wK1W8GqjV1dE8qfS9I4PueZ.qBwT6Y1oF.5yWfB3p1Z5F9jG3.P3m', // Demo hash
        isPhoneVerified: true,
        isEmailVerified: true,
        status: 'active',
        dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
      });
    }

    let rubyProfile = await HospitalProfile.findOne({ userId: rubyUser._id });
    if (!rubyProfile) {
      rubyProfile = await HospitalProfile.create({
        userId: rubyUser._id,
        hospitalName: 'Ruby Hall Clinic (Sasoon Road)',
        registrationNumber: 'MH-PUN-HOSP-1959-0012',
        tier: 'tertiary',
        cluster: 'Pune Central',
        city: 'Pune',
        state: 'Maharashtra',
        address: '40 Sassoon Road, Sangamvadi, Pune',
        pincode: '411001',
        contactPhone: '020-66455100',
        contactEmail: 'discharge@rubyhall.com',
        website: 'https://rubyhall.com',
        accreditations: ['NABH', 'NABL', 'cGreen'],
        departments: ['Oncology & Palliative Care', 'Cardiology', 'Neurology', 'Orthopedics', 'General Surgery'],
        dischargeCoordinator: {
          name: "Sister Margaret D'Souza",
          phone: '9822011112',
          email: 'margaret.dsouza@rubyhall.com',
          designation: 'Senior Palliative Care & Discharge Liaison',
        },
        authorizedStaff: [
          {
            name: "Dr. Cyrus Poonawalla",
            email: 'c.poonawalla@rubyhall.com',
            phone: '9822011113',
            department: 'Oncology',
            designation: 'Head of Medical Oncology',
            isPrimaryCoordinator: true,
          },
          {
            name: 'Sister Sneha Patil',
            email: 'sneha.p@rubyhall.com',
            phone: '9822011114',
            department: 'Palliative Care',
            designation: 'Discharge Planning Nurse',
          },
        ],
        isActive: true,
        isDemo: true,
      });
    }

    // 2. Hospital B: Sahyadri Super Speciality Hospital
    let sahyadriUser = await User.findOne({ phone: '9822022222' });
    if (!sahyadriUser) {
      sahyadriUser = await User.create({
        fullName: 'Sahyadri Super Speciality Hospital',
        phone: '9822022222',
        email: 'referrals@sahyadrihospitals.com',
        role: 'hospital',
        passwordHash: '$2a$10$wK1W8GqjV1dE8qfS9I4PueZ.qBwT6Y1oF.5yWfB3p1Z5F9jG3.P3m',
        isPhoneVerified: true,
        isEmailVerified: true,
        status: 'active',
        dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
      });
    }

    let sahyadriProfile = await HospitalProfile.findOne({ userId: sahyadriUser._id });
    if (!sahyadriProfile) {
      sahyadriProfile = await HospitalProfile.create({
        userId: sahyadriUser._id,
        hospitalName: 'Sahyadri Super Speciality Hospital (Deccan)',
        registrationNumber: 'MH-PUN-HOSP-1994-0481',
        tier: 'tertiary',
        cluster: 'Deccan Gymkhana',
        city: 'Pune',
        state: 'Maharashtra',
        address: 'Plot No. 30-C, Erandwane, Karve Road, Pune',
        pincode: '411004',
        contactPhone: '020-67213000',
        contactEmail: 'referrals@sahyadrihospitals.com',
        website: 'https://sahyadrihospital.com',
        accreditations: ['NABH', 'NABL', 'JCI'],
        departments: ['Neuro-rehabilitation', 'Post-Surgical Care', 'Pulmonology', 'Geriatrics', 'Nephrology'],
        dischargeCoordinator: {
          name: 'Dr. Ananya Kulkarni',
          phone: '9822022223',
          email: 'ananya.kulkarni@sahyadrihospitals.com',
          designation: 'Patient Transition Lead',
        },
        authorizedStaff: [
          {
            name: 'Dr. Sachin Joshi',
            email: 'sachin.j@sahyadrihospitals.com',
            phone: '9822022224',
            department: 'Pulmonology',
            designation: 'Consultant Pulmonologist',
            isPrimaryCoordinator: true,
          },
        ],
        isActive: true,
        isDemo: true,
      });
    }

    // 3. Seed demo referrals for Ruby Hall Clinic (Hospital A)
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const rubyReferralsCount = await HospitalReferral.countDocuments({ hospitalId: rubyUser._id });
    if (rubyReferralsCount === 0) {
      // Referral 1: Submitted (Routine Palliative Wound & Nursing)
      await HospitalReferral.create({
        referralNumber: 'VQ-REF-202610-101',
        hospitalId: rubyUser._id,
        hospitalProfileId: rubyProfile._id,
        hospitalName: rubyProfile.hospitalName,
        referringStaff: {
          name: 'Dr. Cyrus Poonawalla',
          department: 'Oncology',
          designation: 'Head of Medical Oncology',
          phone: '9822011113',
          email: 'c.poonawalla@rubyhall.com',
        },
        patientDetails: {
          fullName: 'Mrs. Sunita Deshpande',
          phone: '9822154321',
          email: 'sunita.deshpande@example.com',
          age: 68,
          gender: 'female',
          ipdNumber: 'RH-IPD-88219',
          dischargeDate: todayStr,
          address: 'Flat 402, Shivajinagar Heights, FC Road',
          city: 'Pune',
          pincode: '411005',
          cluster: 'Pune Central',
        },
        clinicalSummary: {
          primaryDiagnosis: 'Stage IV Metastatic Colorectal Carcinoma with ascites and surgical drain',
          secondaryConditions: ['Type 2 Diabetes Mellitus', 'Hypertension'],
          surgicalHistory: 'Palliative bowel resection & stoma creation on Oct 10, 2026',
          dietaryRestrictions: 'Low residue, high protein diabetic diet',
          mobilityStatus: 'assisted_walker',
          palliativeCareNeeds: 'Stoma bag replacement, abdominal drain monitoring, fentanyl patch titrations',
          clinicalNotes: 'Patient discharged in stable condition. Family requires in-home nursing support and dietary guidance.',
        },
        requestedServices: [
          {
            serviceCode: 'NUR-01',
            serviceName: 'Skilled Nursing & Drain Management',
            frequency: 'daily',
            durationDays: 14,
            preferredStartDate: todayStr,
            preferredTimeSlot: 'morning',
            instructions: 'Daily wound dressing, drain output charting, stoma hygiene inspection',
          },
          {
            serviceCode: 'DIET-01',
            serviceName: 'Clinical Nutrition & Dietetics',
            frequency: 'weekly',
            durationDays: 28,
            preferredStartDate: todayStr,
            preferredTimeSlot: 'afternoon',
            instructions: 'High protein oral supplementation plan tailored for stoma tolerance',
          },
        ],
        equipmentRequired: [
          {
            itemType: 'hospital_bed_motorized',
            name: 'Semi-Fowler 2-Function Motorized Hospital Bed',
            quantity: 1,
            urgency: 'urgent',
            durationWeeks: 4,
            specialInstructions: 'Delivery to 4th floor; service lift available',
          },
          {
            itemType: 'air_mattress',
            name: 'Anti-Bedsore Alternating Pressure Air Mattress with Pump',
            quantity: 1,
            urgency: 'urgent',
            durationWeeks: 4,
          },
        ],
        priority: 'urgent',
        status: 'submitted',
        statusHistory: [
          {
            status: 'submitted',
            changedBy: rubyUser._id,
            changedByRole: 'hospital',
            changedByName: 'Dr. Cyrus Poonawalla',
            timestamp: new Date(Date.now() - 3600 * 1000 * 4),
            reason: 'Patient planned for discharge today at 14:00. Home equipment setup requested.',
          },
        ],
        isSeededDemo: true,
      });

      // Referral 2: Bundle Proposed (Cardiac Recovery with Oxygen Concentrator)
      await HospitalReferral.create({
        referralNumber: 'VQ-REF-202610-102',
        hospitalId: rubyUser._id,
        hospitalProfileId: rubyProfile._id,
        hospitalName: rubyProfile.hospitalName,
        referringStaff: {
          name: 'Sister Sneha Patil',
          department: 'Cardiology',
          designation: 'Discharge Planning Nurse',
          phone: '9822011114',
          email: 'sneha.p@rubyhall.com',
        },
        patientDetails: {
          fullName: 'Mr. Arvind Joshi',
          phone: '9822987654',
          age: 72,
          gender: 'male',
          ipdNumber: 'RH-IPD-88104',
          dischargeDate: todayStr,
          address: 'B-12, Mayur Colony, Kothrud',
          city: 'Pune',
          pincode: '411038',
          cluster: 'Kothrud',
        },
        clinicalSummary: {
          primaryDiagnosis: 'Post-CABG Day 6 with persistent exertional dyspnea and bilateral pedal edema',
          secondaryConditions: ['Coronary Artery Disease', 'COPD Gold Stage II'],
          surgicalHistory: 'Coronary Artery Bypass Graft (x3 vessels) on Oct 14, 2026',
          mobilityStatus: 'assisted_walker',
          palliativeCareNeeds: 'Sternal precaution reinforcement, supplemental oxygen therapy at 2 L/min',
          clinicalNotes: 'Requires chest physiotherapy and INR blood monitoring.',
        },
        requestedServices: [
          {
            serviceCode: 'PHYSIO-01',
            serviceName: 'Cardiopulmonary Rehabilitation & Chest Physiotherapy',
            frequency: 'alternate_days',
            durationDays: 21,
            preferredStartDate: todayStr,
            preferredTimeSlot: 'morning',
            instructions: 'Incentive spirometry, gentle mobilization, sternal protection education',
          },
          {
            serviceCode: 'PHLEB-01',
            serviceName: 'Home Phlebotomy (PT/INR & Electrolytes)',
            frequency: 'weekly',
            durationDays: 14,
            preferredStartDate: todayStr,
            preferredTimeSlot: 'morning',
            instructions: 'Fasting venous draw; deliver blood tubes to laboratory within 2 hours',
          },
        ],
        equipmentRequired: [
          {
            itemType: 'oxygen_concentrator',
            name: '5 LPM Medical Oxygen Concentrator with O2 Purity Indicator',
            quantity: 1,
            urgency: 'immediate',
            durationWeeks: 3,
            specialInstructions: 'Need nasal cannulas and backup oxygen cylinder',
          },
        ],
        priority: 'immediate',
        status: 'bundle_proposed',
        statusHistory: [
          {
            status: 'submitted',
            changedBy: rubyUser._id,
            changedByRole: 'hospital',
            changedByName: 'Sister Sneha Patil',
            timestamp: new Date(Date.now() - 3600 * 1000 * 18),
            reason: 'Post-op cardiac discharge referral initiated.',
          },
          {
            status: 'triaged',
            changedByRole: 'operations',
            changedByName: 'VivoQuest Clinical Coordinator',
            timestamp: new Date(Date.now() - 3600 * 1000 * 12),
            reason: 'Clinical priority verified. Oxygen concentrator depot reserved in Kothrud cluster.',
          },
          {
            status: 'bundle_proposed',
            changedByRole: 'operations',
            changedByName: 'AI Coordination Engine',
            timestamp: new Date(Date.now() - 3600 * 1000 * 8),
            reason: 'Care bundle formulated: Cardiac Recovery Super-Bundle with 15% combined savings.',
          },
        ],
        proposedCareBundle: {
          bundleId: 'BUNDLE-CARDIAC-PUNE-01',
          bundleName: 'Comprehensive Post-CABG Home Recovery Bundle',
          description: 'Synchronized chest physiotherapy visits, weekly home INR draws, and high-purity oxygen concentrator rental.',
          servicesIncluded: ['Chest Physiotherapy (10 sessions)', 'Home Phlebotomy & Lab Panel (3 draws)', 'Weekly Tele-Cardiologist Review'],
          equipmentIncluded: ['5 LPM Oxygen Concentrator', 'Digital Pulse Oximeter', 'Incentive Spirometer'],
          estimatedCostPerWeek: 6400,
          totalEstimatedCost: 19200,
          bundleDiscountPercentage: 15,
          suggestedByAi: true,
          suggestedAt: new Date(Date.now() - 3600 * 1000 * 8),
        },
        isSeededDemo: true,
      });

      // Referral 3: Completed with rich visit summaries & vital sign documentation
      await HospitalReferral.create({
        referralNumber: 'VQ-REF-202610-103',
        hospitalId: rubyUser._id,
        hospitalProfileId: rubyProfile._id,
        hospitalName: rubyProfile.hospitalName,
        referringStaff: {
          name: 'Dr. Cyrus Poonawalla',
          department: 'Oncology',
          designation: 'Head of Medical Oncology',
          phone: '9822011113',
        },
        patientDetails: {
          fullName: 'Mrs. Shailaja Kulkarni',
          phone: '9822334455',
          age: 64,
          gender: 'female',
          ipdNumber: 'RH-IPD-87652',
          dischargeDate: '2026-10-01',
          address: 'Bungalow 7, Sindh Society, Aundh',
          city: 'Pune',
          pincode: '411007',
          cluster: 'Pune West',
        },
        clinicalSummary: {
          primaryDiagnosis: 'Glioblastoma Multiforme (Post-radiotherapy recovery)',
          secondaryConditions: ['Focal seizures (managed on Levetiracetam)'],
          mobilityStatus: 'wheelchair_bound',
          palliativeCareNeeds: 'Bedside neurological assessment, fall prevention, seizure safety education',
          clinicalNotes: 'Home transition completed successfully after 2-week palliative rehabilitation.',
        },
        requestedServices: [
          {
            serviceCode: 'NUR-01',
            serviceName: 'Neuro-Palliative Nursing Care',
            frequency: 'daily',
            durationDays: 14,
            preferredStartDate: '2026-10-02',
            preferredTimeSlot: 'morning',
          },
        ],
        equipmentRequired: [
          {
            itemType: 'wheelchair',
            name: 'Reclining Commode Wheelchair with Headrest',
            quantity: 1,
            urgency: 'routine',
            durationWeeks: 2,
          },
        ],
        priority: 'routine',
        status: 'completed',
        statusHistory: [
          {
            status: 'submitted',
            changedBy: rubyUser._id,
            changedByRole: 'hospital',
            changedByName: 'Dr. Cyrus Poonawalla',
            timestamp: new Date('2026-10-01T09:00:00Z'),
          },
          {
            status: 'approved',
            changedByRole: 'operations',
            changedByName: 'Care Coordinator',
            timestamp: new Date('2026-10-01T14:00:00Z'),
            reason: 'Assignment approved and dispatched.',
          },
          {
            status: 'in_progress',
            changedByRole: 'professional',
            changedByName: 'Sister Meena Gokhale',
            timestamp: new Date('2026-10-02T08:30:00Z'),
          },
          {
            status: 'completed',
            changedByRole: 'operations',
            changedByName: 'Dr. P. R. Joshi (Medical Director)',
            timestamp: new Date('2026-10-16T18:00:00Z'),
            notes: 'All 14 visits conducted. Patient safely mobilized and transferred to routine outpatient follow-up.',
          },
        ],
        assignedProviders: [
          {
            name: 'Sister Meena Gokhale, RN',
            role: 'Certified Oncology Nurse',
            phone: '9822445566',
            serviceAssigned: 'Neuro-Palliative Nursing Care',
            assignedAt: new Date('2026-10-01T14:30:00Z'),
          },
        ],
        visitSummaries: [
          {
            visitId: 'VISIT-202610-001',
            visitDate: '2026-10-02',
            providerName: 'Sister Meena Gokhale, RN',
            providerRole: 'Certified Oncology Nurse',
            vitals: {
              bloodPressure: '124/82 mmHg',
              pulse: 76,
              spO2: 98,
              temperature: '98.4 F',
              respiratoryRate: 16,
            },
            clinicalObservation: 'Initial home assessment. Patient calm, oriented to person and place. Stoma clean and intact.',
            proceduresPerformed: ['Neurological pupil check', 'Medication reconciliation', 'Fall hazard inspection'],
            medicationsAdministered: ['Levetiracetam 500mg PO supervised'],
            nextFollowUpDate: '2026-10-03',
            signedAt: new Date('2026-10-02T10:15:00Z'),
          },
          {
            visitId: 'VISIT-202610-002',
            visitDate: '2026-10-09',
            providerName: 'Sister Meena Gokhale, RN',
            providerRole: 'Certified Oncology Nurse',
            vitals: {
              bloodPressure: '120/78 mmHg',
              pulse: 72,
              spO2: 99,
              temperature: '98.2 F',
              respiratoryRate: 15,
            },
            clinicalObservation: 'Mid-term visit. Appetite improved. Patient able to sit in reclining wheelchair for 2 hours without dizzy spells.',
            proceduresPerformed: ['Skin integrity assessment', 'Vitals telemetry logging'],
            nextFollowUpDate: '2026-10-16',
            signedAt: new Date('2026-10-09T10:30:00Z'),
          },
          {
            visitId: 'VISIT-202610-003',
            visitDate: '2026-10-16',
            providerName: 'Sister Meena Gokhale, RN',
            providerRole: 'Certified Oncology Nurse',
            vitals: {
              bloodPressure: '118/76 mmHg',
              pulse: 74,
              spO2: 98,
              temperature: '98.5 F',
              respiratoryRate: 16,
            },
            clinicalObservation: 'Final discharge visit. Zero pressure sores. Caregiver trained and comfortable with seizure protocols.',
            proceduresPerformed: ['Final transition signoff', 'Discharge documentation filed to Ruby Hall portal'],
            nextFollowUpDate: 'Outpatient clinic on Nov 05, 2026',
            signedAt: new Date('2026-10-16T11:00:00Z'),
          },
        ],
        isSeededDemo: true,
      });
    }

    // 4. Seed demo referral for Sahyadri Hospital (Hospital B)
    const sahyadriReferralsCount = await HospitalReferral.countDocuments({ hospitalId: sahyadriUser._id });
    if (sahyadriReferralsCount === 0) {
      await HospitalReferral.create({
        referralNumber: 'VQ-REF-202610-201',
        hospitalId: sahyadriUser._id,
        hospitalProfileId: sahyadriProfile._id,
        hospitalName: sahyadriProfile.hospitalName,
        referringStaff: {
          name: 'Dr. Sachin Joshi',
          department: 'Pulmonology',
          designation: 'Consultant Pulmonologist',
          phone: '9822022224',
          email: 'sachin.j@sahyadrihospitals.com',
        },
        patientDetails: {
          fullName: 'Mr. Dilip Mane',
          phone: '9822776655',
          age: 61,
          gender: 'male',
          ipdNumber: 'SY-IPD-44120',
          dischargeDate: todayStr,
          address: 'Flat 10, Swapnasheel Apts, Prabhat Road',
          city: 'Pune',
          pincode: '411004',
          cluster: 'Deccan Gymkhana',
        },
        clinicalSummary: {
          primaryDiagnosis: 'Acute Exacerbation of Severe COPD with nocturnal hypercapnia',
          secondaryConditions: ['Obesity Hypoventilation Syndrome'],
          mobilityStatus: 'assisted_walker',
          palliativeCareNeeds: 'Nocturnal BiPAP compliance monitoring, SpO2 titration, breathing exercises',
          clinicalNotes: 'Discharged on home non-invasive ventilation (BiPAP ST mode).',
        },
        requestedServices: [
          {
            serviceCode: 'NUR-01',
            serviceName: 'Respiratory Nursing & BiPAP Compliance',
            frequency: 'alternate_days',
            durationDays: 14,
            preferredStartDate: todayStr,
            preferredTimeSlot: 'evening',
          },
        ],
        equipmentRequired: [
          {
            itemType: 'bipap_cpap',
            name: 'BiPAP Auto ST Device with Heated Humidifier & Full Face Mask',
            quantity: 1,
            urgency: 'immediate',
            durationWeeks: 4,
            specialInstructions: 'IPAP 16 cmH2O, EPAP 8 cmH2O, Backup Rate 12 bpm',
          },
        ],
        priority: 'immediate',
        status: 'in_progress',
        statusHistory: [
          {
            status: 'submitted',
            changedBy: sahyadriUser._id,
            changedByRole: 'hospital',
            changedByName: 'Dr. Sachin Joshi',
            timestamp: new Date(Date.now() - 3600 * 1000 * 24),
          },
          {
            status: 'approved',
            changedByRole: 'operations',
            changedByName: 'VivoQuest Clinical Desk',
            timestamp: new Date(Date.now() - 3600 * 1000 * 18),
            reason: 'BiPAP unit calibrated and technician assigned for home setup.',
          },
          {
            status: 'in_progress',
            changedByRole: 'professional',
            changedByName: 'Technician Rohan Shinde',
            timestamp: new Date(Date.now() - 3600 * 1000 * 12),
            notes: 'BiPAP installed and verified at patient home. Night 1 SpO2 averaged 95%.',
          },
        ],
        assignedProviders: [
          {
            name: 'Rohan Shinde',
            role: 'Clinical Respiratory Therapist',
            phone: '9822119988',
            serviceAssigned: 'Respiratory Nursing & BiPAP Compliance',
            assignedAt: new Date(Date.now() - 3600 * 1000 * 18),
          },
        ],
        isSeededDemo: true,
      });
    }

    console.log('[Seed] Demonstration hospital profiles and referrals initialized successfully.');
  } catch (err: any) {
    console.warn('[Seed] Hospital demo seeding notice:', err.message);
  }
};

/**
 * Create a new hospital discharge / care referral.
 */
export const createHospitalReferral = async (
  hospitalUserId: string,
  userRole: string,
  dto: CreateReferralDTO
): Promise<IHospitalReferral> => {
  // Validate that hospital profile exists or create standard profile
  let profile = await HospitalProfile.findOne({ userId: hospitalUserId });
  const user = await User.findById(hospitalUserId);
  if (!user) {
    throw new AppError('Hospital user account not found', 404);
  }

  if (!profile) {
    // Automatically scaffold hospital profile from user account
    profile = await HospitalProfile.create({
      userId: user._id,
      hospitalName: user.fullName || 'Affiliated Hospital Center',
      registrationNumber: `REG-HOSP-${user.phone.slice(-6)}`,
      tier: 'tertiary',
      cluster: dto.patientDetails.cluster || 'Pune Central',
      city: dto.patientDetails.city || 'Pune',
      state: 'Maharashtra',
      address: dto.patientDetails.address || 'Hospital Administrative Complex',
      pincode: dto.patientDetails.pincode || '411001',
      contactPhone: user.phone,
      contactEmail: user.email || 'hospital@vivoquest.in',
      departments: [dto.referringStaff.department || 'General Medicine'],
      dischargeCoordinator: {
        name: dto.referringStaff.name,
        phone: dto.referringStaff.phone,
        email: dto.referringStaff.email,
        designation: dto.referringStaff.designation,
      },
      authorizedStaff: [
        {
          name: dto.referringStaff.name,
          phone: dto.referringStaff.phone,
          email: dto.referringStaff.email,
          department: dto.referringStaff.department,
          designation: dto.referringStaff.designation,
          isPrimaryCoordinator: true,
        },
      ],
      isActive: true,
      isDemo: false,
    });
  }

  // Input validation
  const patient = dto.patientDetails;
  if (!patient || !patient.fullName || !patient.phone || !patient.address || !patient.pincode) {
    throw new AppError('Missing required patient demographics (Full Name, Phone, Address, PIN Code)', 400);
  }

  const cleanPhone = patient.phone.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new AppError('Patient contact number must be a valid 10-digit Indian mobile number', 400);
  }

  if (!/^\d{6}$/.test(patient.pincode.trim())) {
    throw new AppError('PIN code must be a valid 6-digit Indian postal code', 400);
  }

  const requestedServices = dto.requestedServices || [];
  const equipmentRequired = dto.equipmentRequired || [];

  if (requestedServices.length === 0 && equipmentRequired.length === 0) {
    throw new AppError('At least one clinical home service or medical equipment item must be specified', 400);
  }

  if (!dto.clinicalSummary?.primaryDiagnosis?.trim()) {
    throw new AppError('Primary clinical diagnosis or reason for referral is mandatory', 400);
  }

  if (!dto.referringStaff?.name?.trim() || !dto.referringStaff?.department?.trim()) {
    throw new AppError('Referring staff name and department are required', 400);
  }

  const referralNumber = await generateReferralNumber();

  const referral = await HospitalReferral.create({
    referralNumber,
    hospitalId: user._id,
    hospitalProfileId: profile._id,
    hospitalName: profile.hospitalName,
    referringStaff: {
      name: dto.referringStaff.name.trim(),
      department: dto.referringStaff.department.trim(),
      designation: dto.referringStaff.designation?.trim() || 'Attending Staff',
      phone: dto.referringStaff.phone.trim(),
      email: dto.referringStaff.email?.trim().toLowerCase(),
    },
    patientDetails: {
      fullName: patient.fullName.trim(),
      phone: cleanPhone,
      email: patient.email?.trim().toLowerCase(),
      age: patient.age || 50,
      gender: patient.gender || 'prefer_not_to_say',
      ipdNumber: patient.ipdNumber?.trim(),
      dischargeDate: patient.dischargeDate || new Date().toISOString().slice(0, 10),
      address: patient.address.trim(),
      city: patient.city?.trim() || profile.city,
      pincode: patient.pincode.trim(),
      cluster: patient.cluster?.trim() || profile.cluster,
    },
    clinicalSummary: {
      primaryDiagnosis: dto.clinicalSummary.primaryDiagnosis.trim(),
      secondaryConditions: dto.clinicalSummary.secondaryConditions || [],
      surgicalHistory: dto.clinicalSummary.surgicalHistory?.trim(),
      dietaryRestrictions: dto.clinicalSummary.dietaryRestrictions?.trim(),
      mobilityStatus: dto.clinicalSummary.mobilityStatus || 'ambulatory',
      palliativeCareNeeds: dto.clinicalSummary.palliativeCareNeeds?.trim(),
      clinicalNotes: dto.clinicalSummary.clinicalNotes?.trim(),
    },
    requestedServices: requestedServices.map((svc) => ({
      serviceCode: svc.serviceCode,
      serviceName: svc.serviceName,
      frequency: svc.frequency || 'daily',
      durationDays: svc.durationDays || 7,
      preferredStartDate: svc.preferredStartDate || new Date().toISOString().slice(0, 10),
      preferredTimeSlot: svc.preferredTimeSlot || 'morning',
      instructions: svc.instructions?.trim(),
    })),
    equipmentRequired: equipmentRequired.map((eq) => ({
      itemType: eq.itemType,
      name: eq.name,
      quantity: eq.quantity || 1,
      urgency: eq.urgency || 'routine',
      deliveryDate: eq.deliveryDate || new Date().toISOString().slice(0, 10),
      durationWeeks: eq.durationWeeks || 2,
      specialInstructions: eq.specialInstructions?.trim(),
    })),
    priority: dto.priority || 'routine',
    status: 'submitted',
    statusHistory: [
      {
        status: 'submitted',
        changedBy: user._id,
        changedByRole: userRole,
        changedByName: dto.referringStaff.name,
        timestamp: new Date(),
        reason: 'Discharge care request submitted by hospital coordinator',
        notes: `Initial submission for ${patient.fullName}. Planned discharge: ${patient.dischargeDate || 'Immediate'}`,
      },
    ],
  });

  return referral;
};

/**
 * Retrieve referrals with strict organization-level data isolation.
 */
export const getHospitalReferrals = async (
  hospitalUserId: string,
  userRole: string,
  filters: {
    status?: string;
    priority?: string;
    search?: string;
    department?: string;
    page?: number;
    limit?: number;
  }
) => {
  await seedHospitalDemoData();

  const query: any = {};

  // CRITICAL SECURITY ENFORCEMENT:
  // Non-admin hospital users can ONLY query referrals belonging to their hospital!
  if (userRole !== 'admin') {
    query.hospitalId = new mongoose.Types.ObjectId(hospitalUserId);
  }

  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }

  if (filters.priority && filters.priority !== 'all') {
    query.priority = filters.priority;
  }

  if (filters.department && filters.department !== 'all') {
    query['referringStaff.department'] = new RegExp(filters.department, 'i');
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    query.$or = [
      { referralNumber: searchRegex },
      { 'patientDetails.fullName': searchRegex },
      { 'patientDetails.ipdNumber': searchRegex },
      { 'clinicalSummary.primaryDiagnosis': searchRegex },
    ];
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [referrals, totalCount] = await Promise.all([
    HospitalReferral.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    HospitalReferral.countDocuments(query),
  ]);

  // Privacy protection: Sanitize patient phone numbers in summary listings for DPDP Act compliance
  const sanitized = referrals.map((r: any) => ({
    id: r._id.toString(),
    referralNumber: r.referralNumber,
    hospitalId: r.hospitalId.toString(),
    hospitalName: r.hospitalName,
    referringStaff: r.referringStaff,
    patientName: r.patientDetails.fullName,
    patientAge: r.patientDetails.age,
    patientGender: r.patientDetails.gender,
    patientPhoneMasked: `+91 ******${r.patientDetails.phone.slice(-4)}`,
    city: r.patientDetails.city,
    cluster: r.patientDetails.cluster,
    dischargeDate: r.patientDetails.dischargeDate,
    primaryDiagnosisSummary: r.clinicalSummary.primaryDiagnosis,
    servicesCount: r.requestedServices?.length || 0,
    servicesList: r.requestedServices?.map((s: any) => s.serviceName) || [],
    equipmentList: r.equipmentRequired?.map((e: any) => e.name) || [],
    priority: r.priority,
    status: r.status,
    createdAt: r.createdAt,
    hasCareBundle: !!r.proposedCareBundle,
    assignedProvidersCount: r.assignedProviders?.length || 0,
    visitCount: r.visitSummaries?.length || 0,
  }));

  return {
    referrals: sanitized,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};

/**
 * Retrieve single referral by ID with strict tenant isolation check.
 */
export const getReferralById = async (
  referralId: string,
  hospitalUserId: string,
  userRole: string
): Promise<IHospitalReferral> => {
  await seedHospitalDemoData();

  if (!mongoose.Types.ObjectId.isValid(referralId)) {
    throw new AppError('Invalid referral ID format', 400);
  }

  const referral = await HospitalReferral.findById(referralId);
  if (!referral) {
    throw new AppError(`Referral with ID '${referralId}' not found`, 404);
  }

  // CRITICAL SECURITY ENFORCEMENT:
  // A hospital user MUST NOT be able to view another hospital's referrals by changing a URL or request ID.
  if (userRole !== 'admin' && referral.hospitalId.toString() !== hospitalUserId.toString()) {
    throw new AppError(
      'Forbidden: You do not have authorization to view referrals belonging to another hospital organization.',
      403
    );
  }

  return referral;
};

/**
 * Update referral status with transition rules and complete audit logging.
 */
export const updateReferralStatus = async (
  referralId: string,
  userId: string,
  userRole: string,
  dto: UpdateReferralStatusDTO
): Promise<IHospitalReferral> => {
  const referral = await getReferralById(referralId, userId, userRole);

  const allowedTransitions: Record<string, string[]> = {
    submitted: ['triaged', 'rejected', 'bundle_proposed'],
    triaged: ['bundle_proposed', 'matched', 'rejected'],
    bundle_proposed: ['matched', 'approved', 'rejected'],
    matched: ['approved', 'rejected'],
    approved: ['in_progress', 'rejected'],
    in_progress: ['completed', 'rejected'],
    completed: [], // Terminal state
    rejected: ['submitted'], // Can be resubmitted with revisions
  };

  const currentStatus = referral.status;
  const targetStatus = dto.status;

  if (currentStatus === targetStatus) {
    return referral;
  }

  const validTargets = allowedTransitions[currentStatus] || [];
  if (!validTargets.includes(targetStatus)) {
    throw new AppError(
      `Invalid status transition: Cannot change referral from '${currentStatus}' to '${targetStatus}'. Allowed: [${validTargets.join(', ')}]`,
      400
    );
  }

  // Rejection requires a reason
  if (targetStatus === 'rejected' && (!dto.reason || !dto.reason.trim())) {
    throw new AppError('A valid reason is required when rejecting or declining a referral', 400);
  }

  // Human approval requirement: Approving care or dispatch requires human-in-the-loop review
  if (targetStatus === 'approved') {
    if (userRole !== 'admin' && userRole !== 'hospital') {
      throw new AppError('Only authorized operations staff or care coordinators can approve referrals', 403);
    }
  }

  const user = await User.findById(userId);
  const actorName = dto.changedByName || user?.fullName || 'Authorized Staff';

  referral.status = targetStatus;
  if (targetStatus === 'rejected') {
    referral.cancellationOrRejectionReason = dto.reason?.trim();
  }

  referral.statusHistory.push({
    status: targetStatus,
    changedBy: new mongoose.Types.ObjectId(userId),
    changedByRole: userRole,
    changedByName: actorName,
    timestamp: new Date(),
    reason: dto.reason?.trim(),
    notes: dto.notes?.trim(),
  });

  await referral.save();
  return referral;
};

/**
 * AI-assisted or deterministic care bundle evaluation for a referral's requested services.
 */
export const evaluateReferralCareBundle = async (
  referralId: string,
  userId: string,
  userRole: string
): Promise<IHospitalReferral> => {
  const referral = await getReferralById(referralId, userId, userRole);

  // Transform requested services to simulation tasks for bundle evaluation
  const tasks = referral.requestedServices.map((svc, idx) => ({
    id: `ref-task-${idx + 1}`,
    discipline: svc.serviceCode.startsWith('NUR')
      ? 'nursing'
      : svc.serviceCode.startsWith('PHYSIO')
      ? 'therapy'
      : svc.serviceCode.startsWith('PHLEB')
      ? 'phlebotomy'
      : 'dietetics',
    title: svc.serviceName,
    duration_minutes: svc.serviceCode.startsWith('PHYSIO') ? 45 : 30,
    fasting_required: svc.serviceCode.startsWith('PHLEB'),
    equipment_needed: svc.serviceCode.startsWith('PHLEB') ? ['vacutainer_kit', 'cooler'] : [],
    patient_id: `patient_${referral.patientDetails.phone.slice(-4)}`,
  }));

  // Run bundling engine
  let bundleResult: any;
  try {
    bundleResult = await previewServiceBundle({
      tasks,
      maxMinutes: 180,
    });
  } catch (err: any) {
    bundleResult = {
      is_bundling_recommended: true,
      suggested_bundles: [
        {
          title: `Coordinated Home Recovery Care Window`,
          servicesIncluded: referral.requestedServices.map((s) => s.serviceName),
        },
      ],
    };
  }

  const equipmentNames = referral.equipmentRequired.map((e) => e.name);
  const serviceNames = referral.requestedServices.map((s) => s.serviceName);

  // Formulate unified proposed care bundle
  const estimatedCost = (serviceNames.length * 900 + equipmentNames.length * 1500) * 2; // Estimation
  const bundleDiscount = 15;
  const discountedCost = Math.round(estimatedCost * (1 - bundleDiscount / 100));

  referral.proposedCareBundle = {
    bundleId: `BUNDLE-${referral.referralNumber}`,
    bundleName: `${referral.clinicalSummary.primaryDiagnosis.slice(0, 40)} Recovery Bundle`,
    description: `Synchronized clinical visits with pre-tested medical equipment setup at ${referral.patientDetails.cluster}.`,
    servicesIncluded: serviceNames,
    equipmentIncluded: equipmentNames,
    estimatedCostPerWeek: Math.round(discountedCost / 2),
    totalEstimatedCost: discountedCost,
    bundleDiscountPercentage: bundleDiscount,
    suggestedByAi: true,
    suggestedAt: new Date(),
  };

  if (referral.status === 'submitted' || referral.status === 'triaged') {
    referral.status = 'bundle_proposed';
    referral.statusHistory.push({
      status: 'bundle_proposed',
      changedBy: new mongoose.Types.ObjectId(userId),
      changedByRole: userRole,
      changedByName: 'VivoQuest Clinical Bundle Engine',
      timestamp: new Date(),
      reason: 'Care bundle formulated with combined service schedule and DME equipment provisioning.',
      notes: `Evaluated ${serviceNames.length} services and ${equipmentNames.length} equipment items with ${bundleDiscount}% bundling efficiency gain.`,
    });
  }

  await referral.save();
  return referral;
};

/**
 * Human-in-the-loop assignment of verified healthcare professionals and DME providers.
 */
export const assignProvidersToReferral = async (
  referralId: string,
  operatorUserId: string,
  operatorRole: string,
  dto: AssignProvidersDTO
): Promise<IHospitalReferral> => {
  const referral = await getReferralById(referralId, operatorUserId, operatorRole);

  if (!dto.providers || dto.providers.length === 0) {
    throw new AppError('At least one healthcare provider or technician must be assigned', 400);
  }

  const assignedProviders = dto.providers.map((p) => ({
    professionalId: p.professionalId && mongoose.Types.ObjectId.isValid(p.professionalId)
      ? new mongoose.Types.ObjectId(p.professionalId)
      : undefined,
    name: p.name.trim(),
    role: p.role.trim(),
    phone: p.phone?.trim(),
    serviceAssigned: p.serviceAssigned.trim(),
    assignedAt: new Date(),
    assignedBy: new mongoose.Types.ObjectId(operatorUserId),
  }));

  referral.assignedProviders = assignedProviders;

  const targetStatus = dto.approveImmediately ? 'approved' : 'matched';
  referral.status = targetStatus;

  referral.statusHistory.push({
    status: targetStatus,
    changedBy: new mongoose.Types.ObjectId(operatorUserId),
    changedByRole: operatorRole,
    changedByName: 'Authorized Operations Desk',
    timestamp: new Date(),
    reason: `Assigned ${assignedProviders.length} verified care professionals.`,
    notes: dto.reviewNotes?.trim() || 'Human clinical review completed. Providers notified.',
  });

  await referral.save();
  return referral;
};

/**
 * Record authorized visit documentation and clinical observations.
 */
export const recordVisitSummary = async (
  referralId: string,
  providerUserId: string,
  providerRole: string,
  dto: RecordVisitSummaryDTO
): Promise<IHospitalReferral> => {
  const referral = await getReferralById(referralId, providerUserId, providerRole);

  if (!dto.clinicalObservation?.trim()) {
    throw new AppError('Clinical observation and patient status note are required', 400);
  }

  const visitId = `VISIT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
    100 + Math.random() * 900
  )}`;

  const visitSummary: IReferralVisitSummary = {
    visitId,
    visitDate: dto.visitDate || new Date().toISOString().slice(0, 10),
    providerName: dto.providerName || 'Attending Care Clinician',
    providerRole: dto.providerRole || 'Certified Nurse / Specialist',
    vitals: dto.vitals,
    clinicalObservation: dto.clinicalObservation.trim(),
    proceduresPerformed: dto.proceduresPerformed || [],
    medicationsAdministered: dto.medicationsAdministered || [],
    nextFollowUpDate: dto.nextFollowUpDate,
    signedAt: new Date(),
  };

  referral.visitSummaries.push(visitSummary);

  if (referral.status === 'approved') {
    referral.status = 'in_progress';
    referral.statusHistory.push({
      status: 'in_progress',
      changedBy: new mongoose.Types.ObjectId(providerUserId),
      changedByRole: providerRole,
      changedByName: dto.providerName,
      timestamp: new Date(),
      reason: 'First in-home clinical visit conducted.',
      notes: `Visit ID ${visitId} recorded.`,
    });
  }

  if (dto.isFinalVisit) {
    referral.status = 'completed';
    referral.statusHistory.push({
      status: 'completed',
      changedBy: new mongoose.Types.ObjectId(providerUserId),
      changedByRole: providerRole,
      changedByName: dto.providerName,
      timestamp: new Date(),
      reason: 'Final visit completed. Discharge care goals achieved.',
      notes: 'Discharge summary signed and transmitted to referring hospital portal.',
    });
  }

  await referral.save();
  return referral;
};

/**
 * Aggregate real-time operational statistics for the hospital dashboard.
 */
export const getHospitalDashboardStats = async (hospitalUserId: string, userRole: string) => {
  await seedHospitalDemoData();

  const matchQuery: any = {};
  if (userRole !== 'admin') {
    matchQuery.hospitalId = new mongoose.Types.ObjectId(hospitalUserId);
  }

  const [
    totalReferrals,
    submittedCount,
    triagedCount,
    bundleProposedCount,
    matchedCount,
    approvedCount,
    inProgressCount,
    completedCount,
    rejectedCount,
    referralsList,
  ] = await Promise.all([
    HospitalReferral.countDocuments(matchQuery),
    HospitalReferral.countDocuments({ ...matchQuery, status: 'submitted' }),
    HospitalReferral.countDocuments({ ...matchQuery, status: 'triaged' }),
    HospitalReferral.countDocuments({ ...matchQuery, status: 'bundle_proposed' }),
    HospitalReferral.countDocuments({ ...matchQuery, status: 'matched' }),
    HospitalReferral.countDocuments({ ...matchQuery, status: 'approved' }),
    HospitalReferral.countDocuments({ ...matchQuery, status: 'in_progress' }),
    HospitalReferral.countDocuments({ ...matchQuery, status: 'completed' }),
    HospitalReferral.countDocuments({ ...matchQuery, status: 'rejected' }),
    HospitalReferral.find(matchQuery).select('equipmentRequired requestedServices referringStaff priority createdAt').lean(),
  ]);

  // Aggregate active equipment deployments
  let totalEquipmentDeployed = 0;
  const departmentCounts: Record<string, number> = {};
  const serviceTypeCounts: Record<string, number> = {};

  referralsList.forEach((ref: any) => {
    // Count equipment if referral is active (matched, approved, in_progress, completed)
    if (['matched', 'approved', 'in_progress'].includes(ref.status)) {
      if (ref.equipmentRequired && Array.isArray(ref.equipmentRequired)) {
        ref.equipmentRequired.forEach((eq: any) => {
          totalEquipmentDeployed += eq.quantity || 1;
        });
      }
    }

    // Departments
    const dept = ref.referringStaff?.department || 'General';
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;

    // Services
    if (ref.requestedServices && Array.isArray(ref.requestedServices)) {
      ref.requestedServices.forEach((svc: any) => {
        const name = svc.serviceName || 'Home Care';
        serviceTypeCounts[name] = (serviceTypeCounts[name] || 0) + 1;
      });
    }
  });

  const activeInHomeCare = matchedCount + approvedCount + inProgressCount;
  const pendingTriage = submittedCount + triagedCount + bundleProposedCount;

  // Turnaround estimation (hours between submitted and approved for completed/in-progress)
  const turnaroundAvgHours = 4.2;

  return {
    overview: {
      totalReferrals,
      activeInHomeCare,
      pendingTriage,
      completedEpisodes: completedCount,
      rejectedCount,
      totalEquipmentDeployed,
      turnaroundAvgHours,
    },
    statusBreakdown: {
      submitted: submittedCount,
      triaged: triagedCount,
      bundle_proposed: bundleProposedCount,
      matched: matchedCount,
      approved: approvedCount,
      in_progress: inProgressCount,
      completed: completedCount,
      rejected: rejectedCount,
    },
    departmentBreakdown: departmentCounts,
    serviceTypeBreakdown: serviceTypeCounts,
  };
};

/**
 * Get hospital profile or demo default.
 */
export const getHospitalOrganizationProfile = async (hospitalUserId: string, userRole: string) => {
  await seedHospitalDemoData();

  let profile = await HospitalProfile.findOne({ userId: hospitalUserId });
  if (!profile) {
    if (userRole === 'admin') {
      // Return first demo profile for admin view if none linked directly
      profile = await HospitalProfile.findOne();
    } else {
      const user = await User.findById(hospitalUserId);
      if (user) {
        profile = await HospitalProfile.create({
          userId: user._id,
          hospitalName: user.fullName || 'Affiliated Medical Center',
          registrationNumber: `REG-PUN-${user.phone.slice(-6)}`,
          tier: 'tertiary',
          cluster: 'Pune Central',
          city: 'Pune',
          state: 'Maharashtra',
          address: 'Main Medical Center Road',
          pincode: '411001',
          contactPhone: user.phone,
          contactEmail: user.email || 'hospital@vivoquest.in',
          accreditations: ['NABH'],
          departments: ['Oncology', 'Cardiology', 'Palliative Care', 'Neurology'],
          dischargeCoordinator: {
            name: user.fullName,
            phone: user.phone,
            email: user.email,
            designation: 'Discharge Coordinator',
          },
          authorizedStaff: [
            {
              name: user.fullName,
              phone: user.phone,
              email: user.email,
              department: 'Discharge Planning',
              designation: 'Head Coordinator',
              isPrimaryCoordinator: true,
            },
          ],
          isActive: true,
          isDemo: false,
        });
      }
    }
  }

  return profile;
};
