import { HealthcareService, IHealthcareService, ServiceCategory } from '../models/HealthcareService.js';

export const SEED_HEALTHCARE_SERVICES = [
  {
    serviceCode: 'home-diagnostics',
    title: 'Home Diagnostics & Phlebotomy',
    category: 'diagnostics' as ServiceCategory,
    badge: 'NABL Accredited Labs',
    description: 'Certified phlebotomist visit to collect blood, urine, or swab samples at home. Strict cold-chain vial transport to NABL-accredited diagnostic labs.',
    turnaround: 'Digital reports in 12–24 hours via SMS & WhatsApp',
    price: {
      baseAmount: 499,
      currency: 'INR',
      isNegotiable: false,
      unit: 'per_sample_collection',
    },
    requirements: ['Overnight fasting required for lipid & glucose panels', 'Prescription optional for wellness tests'],
    includes: ['HbA1c Blood Glucose', 'Lipid Profile', 'Kidney & Liver Function (KFT/LFT)', 'Thyroid Panel (TSH)', 'Complete Blood Count (CBC)'],
    requiredCredentials: ['Certified Phlebotomy Technician', 'NABL Lab Affiliation'],
    isActive: true,
    sortOrder: 1,
  },
  {
    serviceCode: 'teleconsultation',
    title: 'Physician & Specialist Teleconsultation',
    category: 'therapy' as ServiceCategory,
    badge: 'Registered Medical Council Doctors',
    description: 'High-definition video consultations with certified internal medicine physicians, geriatricians, and endocrinologists. Follow-up reviews and verified e-prescriptions.',
    turnaround: 'Instant or scheduled 30-minute consultation slots',
    price: {
      baseAmount: 500,
      currency: 'INR',
      isNegotiable: false,
      unit: 'per_consultation',
    },
    requirements: ['Prior discharge summary or lab records recommended', 'Smartphone or browser with camera'],
    includes: ['Comprehensive Symptom Review', 'Medication Reconciliation', 'Digital e-Prescription', 'Lab Test Guidance'],
    requiredCredentials: ['MBBS/MD with NMC / State Council Registration'],
    isActive: true,
    sortOrder: 2,
  },
  {
    serviceCode: 'physiotherapy',
    title: 'In-Home Physiotherapy & Rehabilitation',
    category: 'therapy' as ServiceCategory,
    badge: 'Certified Physiotherapists',
    description: 'One-on-one physiotherapy sessions at home for post-stroke recovery, joint replacements (knee/hip), fracture recovery, geriatric mobility, and chest physiotherapy.',
    turnaround: 'Daily or alternate-day home sessions (45–60 mins)',
    price: {
      baseAmount: 800,
      currency: 'INR',
      isNegotiable: false,
      unit: 'per_session',
    },
    requirements: ['Orthopedic or physician referral if post-surgical', 'Adequate floor space at home'],
    includes: ['Range of Motion Exercises', 'Gait & Balance Training', 'Pain Management Protocols', 'Caregiver Assisted Mobility Techniques'],
    requiredCredentials: ['BPT / MPT Degree with State IAP Registration'],
    isActive: true,
    sortOrder: 3,
  },
  {
    serviceCode: 'nutrition-wellness',
    title: 'Clinical Nutrition & Dietetics',
    category: 'therapy' as ServiceCategory,
    badge: 'Qualified Clinical Dietitians',
    description: 'Personalized nutritional management tailored to Indian diets and chronic metabolic conditions (Type 2 diabetes, chronic kidney disease, hypertension, cardiovascular recovery).',
    turnaround: 'Detailed meal plan delivery in 24 hours post-consult',
    price: {
      baseAmount: 750,
      currency: 'INR',
      isNegotiable: false,
      unit: 'per_diet_chart',
    },
    requirements: ['Recent lipid and glucose panels helpful', 'Inventory of typical household meal preferences'],
    includes: ['Indian Plate Carb Calibration', 'Renal / Cardiac Sodium Restrictions', 'Nutritional Supplements Advice', 'Weekly WhatsApp Progress Check-ins'],
    requiredCredentials: ['M.Sc Clinical Nutrition & Dietetics', 'IDA Registration'],
    isActive: true,
    sortOrder: 4,
  },
  {
    serviceCode: 'preventive-home-care',
    title: 'Preventive Home Care & SDoH Audits',
    category: 'preventive' as ServiceCategory,
    badge: 'Community Health Workers',
    description: 'Holistic in-home health evaluations assessing vital signs, bathroom fall hazards, food security, medication adherence, and caregiver strain.',
    turnaround: 'Comprehensive home safety scorecard within 2 hours of visit',
    price: {
      baseAmount: 350,
      currency: 'INR',
      isNegotiable: false,
      unit: 'per_audit_visit',
    },
    requirements: ['Caregiver presence requested during the audit', 'Access to patient living spaces for safety check'],
    includes: ['Vitals Check (BP, Pulse Oximeter, Temperature)', 'Bathroom & Floor Fall Hazard Audit', 'Medication Inventory Review', 'Emergency Contact Verification'],
    requiredCredentials: ['Certified Community Health Worker / Auxiliary Nurse Midwife'],
    isActive: true,
    sortOrder: 5,
  },
  {
    serviceCode: 'medical-equipment',
    title: 'Durable Medical Equipment (DME) Delivery',
    category: 'equipment' as ServiceCategory,
    badge: 'Doorstep Setup & Calibration',
    description: 'Rapid home delivery, assembly, and sanitization of hospital beds, oxygen concentrators, CPAP/BiPAP units, suction machines, wheelchairs, and foldable walkers.',
    turnaround: 'Same-day or next-day delivery in metro clusters',
    price: {
      baseAmount: 1200,
      currency: 'INR',
      isNegotiable: true,
      unit: 'monthly_rental_starting',
    },
    requirements: ['Prescription required for oxygen & BiPAP devices', 'Available power outlet for electrical equipment'],
    includes: ['Doorstep Assembly & Testing', 'Family Safety Operation Training', 'Sterilization Certificate', '24/7 Equipment Breakdown Support'],
    requiredCredentials: ['Verified Medical Device Distributor License', 'ISO Calibration Certificate'],
    isActive: true,
    sortOrder: 6,
  },
];

export const seedServicesIfEmpty = async (): Promise<void> => {
  try {
    const count = await HealthcareService.countDocuments();
    if (count === 0) {
      console.log('[Seed] Seeding default VivoQuest healthcare services...');
      await HealthcareService.insertMany(SEED_HEALTHCARE_SERVICES);
      console.log('[Seed] Successfully seeded 6 healthcare services.');
    }
  } catch (error: any) {
    console.error('[Seed] Error checking or seeding healthcare services:', error.message);
  }
};

export const getServices = async (filter?: {
  category?: string;
  search?: string;
  isActive?: boolean;
}): Promise<IHealthcareService[]> => {
  const query: any = {};

  if (filter?.isActive !== undefined) {
    query.isActive = filter.isActive;
  } else {
    query.isActive = true;
  }

  if (filter?.category && filter.category !== 'all') {
    query.category = filter.category;
  }

  if (filter?.search) {
    const searchRegex = new RegExp(filter.search, 'i');
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { includes: searchRegex },
      { badge: searchRegex },
    ];
  }

  return HealthcareService.find(query).sort({ sortOrder: 1 });
};
