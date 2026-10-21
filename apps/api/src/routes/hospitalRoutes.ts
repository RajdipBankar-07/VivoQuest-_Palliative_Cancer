import { Router, Response } from 'express';
import { authenticateUser, requireRole, AuthRequest } from '../middleware/auth.js';
import {
  createHospitalReferral,
  getHospitalReferrals,
  getReferralById,
  updateReferralStatus,
  evaluateReferralCareBundle,
  assignProvidersToReferral,
  recordVisitSummary,
  getHospitalDashboardStats,
  getHospitalOrganizationProfile,
  seedHospitalDemoData,
} from '../services/hospitalReferralService.js';
import {
  getHospitalReferralCompletionSummary,
  acknowledgeHospitalCompletionSummary,
} from '../services/fieldOperationsService.js';
import { HospitalProfile } from '../models/HospitalProfile.js';
import { AppError } from '../middleware/errorHandler.js';

export const hospitalRoutes = Router();

// Ensure demo hospitals are seeded when routes are accessed
hospitalRoutes.use(async (_req, _res, next) => {
  try {
    await seedHospitalDemoData();
    next();
  } catch {
    next();
  }
});

/**
 * Public/Authenticated helper: Get home services and DME equipment catalog for referral intake
 * GET /api/v1/hospitals/services-catalog
 */
hospitalRoutes.get('/services-catalog', (_req, res) => {
  res.json({
    success: true,
    data: {
      services: [
        {
          serviceCode: 'NUR-01',
          name: 'Skilled Nursing & Wound Care',
          category: 'nursing',
          typicalDurationMinutes: 45,
          defaultFrequency: 'daily',
          description: 'Surgical wound dressing, stoma hygiene, catheterization, vitals charting, IV/IM injections',
        },
        {
          serviceCode: 'PHYSIO-01',
          name: 'Cardiopulmonary & Neuro Rehabilitation',
          category: 'therapy',
          typicalDurationMinutes: 45,
          defaultFrequency: 'alternate_days',
          description: 'Post-CABG chest physio, stroke motor retraining, gentle mobilization, sternal precautions',
        },
        {
          serviceCode: 'PALLIATIVE-01',
          name: 'Oncology Palliative & Pain Care',
          category: 'palliative',
          typicalDurationMinutes: 60,
          defaultFrequency: 'alternate_days',
          description: 'Multidisciplinary pain management, palliative counselor, symptom relief, caregiver training',
        },
        {
          serviceCode: 'PHLEB-01',
          name: 'Home Phlebotomy & Urgent Blood Panels',
          category: 'diagnostics',
          typicalDurationMinutes: 25,
          defaultFrequency: 'weekly',
          description: 'Fasting venous draw, CBC, Kidney/Liver panel, PT/INR, home delivery of vacuum-sealed samples',
        },
        {
          serviceCode: 'DIET-01',
          name: 'Clinical Dietetics & Enteral Nutrition',
          category: 'dietetics',
          typicalDurationMinutes: 30,
          defaultFrequency: 'weekly',
          description: 'Ryle tube feed formulation, diabetic renal meal plans, stoma-tolerant nutritional support',
        },
      ],
      equipment: [
        {
          itemType: 'oxygen_concentrator',
          name: '5 LPM Medical Oxygen Concentrator',
          urgency: 'immediate',
          defaultWeeks: 3,
          description: 'Continuous flow 93%±3% purity with dual humidifier bottle and O2 monitoring',
        },
        {
          itemType: 'bipap_cpap',
          name: 'BiPAP Auto ST Ventilatory Device',
          urgency: 'immediate',
          defaultWeeks: 4,
          description: 'Non-invasive nocturnal respiratory support with heated tubing and backup breath trigger',
        },
        {
          itemType: 'hospital_bed_motorized',
          name: '2-Function Motorized Hospital ICU Bed',
          urgency: 'urgent',
          defaultWeeks: 4,
          description: 'Remote-controlled backrest and knee rest incline with collapsible aluminum safety rails',
        },
        {
          itemType: 'air_mattress',
          name: 'Anti-Bedsore Alternating Pressure Air Mattress',
          urgency: 'urgent',
          defaultWeeks: 4,
          description: 'Bubble cell alternating pressure mattress with silent compressor pump for decubitus prevention',
        },
        {
          itemType: 'wheelchair',
          name: 'Reclining Commode Wheelchair with Headrest',
          urgency: 'routine',
          defaultWeeks: 4,
          description: 'Ergonomic high-back reclining wheelchair with removable commode pot and anti-tippers',
        },
        {
          itemType: 'suction_machine',
          name: 'High Vacuum Electric Suction Unit',
          urgency: 'urgent',
          defaultWeeks: 2,
          description: 'Tracheostomy and airway clearance suction machine with overflow safety filter',
        },
        {
          itemType: 'iv_stand',
          name: 'Stainless Steel Heavy-Base IV Infusion Stand',
          urgency: 'routine',
          defaultWeeks: 2,
          description: '4-hook mobile infusion pole with height adjustment',
        },
      ],
    },
  });
});

/**
 * GET /api/v1/hospitals/profile
 * Get authenticated hospital organization profile
 */
hospitalRoutes.get(
  '/profile',
  authenticateUser,
  requireRole(['hospital', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userPayload!.userId;
      const role = req.userPayload!.role;
      const profile = await getHospitalOrganizationProfile(userId, role);
      res.json({
        success: true,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/hospitals/profile
 * Update authenticated hospital organization profile
 */
hospitalRoutes.put(
  '/profile',
  authenticateUser,
  requireRole(['hospital', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userPayload!.userId;
      const role = req.userPayload!.role;

      let profile = await HospitalProfile.findOne({ userId });
      if (!profile) {
        if (['admin', 'super_admin'].includes(role)) {
          profile = await HospitalProfile.findOne();
        }
      }

      if (!profile) {
        throw new AppError('Hospital profile not found to update', 404);
      }

      const {
        hospitalName,
        cluster,
        city,
        address,
        pincode,
        contactPhone,
        contactEmail,
        website,
        accreditations,
        departments,
        dischargeCoordinator,
        authorizedStaff,
      } = req.body;

      if (hospitalName) profile.hospitalName = hospitalName.trim();
      if (cluster) profile.cluster = cluster.trim();
      if (city) profile.city = city.trim();
      if (address) profile.address = address.trim();
      if (pincode) profile.pincode = pincode.trim();
      if (contactPhone) profile.contactPhone = contactPhone.trim();
      if (contactEmail) profile.contactEmail = contactEmail.trim().toLowerCase();
      if (website) profile.website = website.trim();
      if (Array.isArray(accreditations)) profile.accreditations = accreditations;
      if (Array.isArray(departments)) profile.departments = departments;
      if (dischargeCoordinator) profile.dischargeCoordinator = dischargeCoordinator;
      if (Array.isArray(authorizedStaff)) profile.authorizedStaff = authorizedStaff;

      await profile.save();

      res.json({
        success: true,
        message: 'Hospital organization profile updated successfully',
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/hospitals/dashboard/stats
 * Operational reports and metrics aggregated from actual MongoDB data
 */
hospitalRoutes.get(
  '/dashboard/stats',
  authenticateUser,
  requireRole(['hospital', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userPayload!.userId;
      const role = req.userPayload!.role;

      const stats = await getHospitalDashboardStats(userId, role);
      res.json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/hospitals/referrals
 * Create a new patient discharge referral
 */
hospitalRoutes.post(
  '/referrals',
  authenticateUser,
  requireRole(['hospital', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userPayload!.userId;
      const role = req.userPayload!.role;

      const referral = await createHospitalReferral(userId, role, req.body);
      res.status(201).json({
        success: true,
        message: 'Patient referral created successfully and queued for clinical triage',
        data: referral,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/hospitals/referrals
 * List hospital referrals with strict tenant isolation, search, and pagination
 */
hospitalRoutes.get(
  '/referrals',
  authenticateUser,
  requireRole(['hospital', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userPayload!.userId;
      const role = req.userPayload!.role;

      const { status, priority, search, department, page, limit } = req.query;

      const result = await getHospitalReferrals(userId, role, {
        status: status as string,
        priority: priority as string,
        search: search as string,
        department: department as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.json({
        success: true,
        count: result.referrals.length,
        pagination: result.pagination,
        data: result.referrals,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/hospitals/referrals/:id
 * Retrieve single referral detail (Strict 403 Tenant Isolation Check!)
 */
hospitalRoutes.get(
  '/referrals/:id',
  authenticateUser,
  requireRole(['hospital', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userPayload!.userId;
      const role = req.userPayload!.role;
      const referralId = req.params.id;

      const referral = await getReferralById(referralId, userId, role);
      res.json({
        success: true,
        data: referral,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/hospitals/referrals/:id/status
 * Transition referral status with audit trail and human-in-the-loop requirement
 */
hospitalRoutes.patch(
  '/referrals/:id/status',
  authenticateUser,
  requireRole(['hospital', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userPayload!.userId;
      const role = req.userPayload!.role;
      const referralId = req.params.id;

      const updated = await updateReferralStatus(referralId, userId, role, req.body);
      res.json({
        success: true,
        message: `Referral status successfully updated to '${updated.status}'`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/hospitals/referrals/:id/evaluate-bundle
 * AI-assisted or deterministic care bundle evaluation for a referral
 */
hospitalRoutes.post(
  '/referrals/:id/evaluate-bundle',
  authenticateUser,
  requireRole(['hospital', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userPayload!.userId;
      const role = req.userPayload!.role;
      const referralId = req.params.id;

      const updated = await evaluateReferralCareBundle(referralId, userId, role);
      res.json({
        success: true,
        message: 'Care bundle evaluated and attached to referral',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/hospitals/referrals/:id/assign-providers
 * Human-in-the-loop assignment of verified healthcare professionals
 */
hospitalRoutes.post(
  '/referrals/:id/assign-providers',
  authenticateUser,
  requireRole(['hospital', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userPayload!.userId;
      const role = req.userPayload!.role;
      const referralId = req.params.id;

      const updated = await assignProvidersToReferral(referralId, userId, role, req.body);
      res.json({
        success: true,
        message: 'Care providers assigned and referral transitioned',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/hospitals/referrals/:id/visits
 * Record authorized clinical visit documentation and observations
 */
hospitalRoutes.post(
  '/referrals/:id/visits',
  authenticateUser,
  requireRole(['professional', 'hospital', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userPayload!.userId;
      const role = req.userPayload!.role;
      const referralId = req.params.id;

      const updated = await recordVisitSummary(referralId, userId, role, req.body);
      res.json({
        success: true,
        message: 'Visit summary and documentation recorded successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/hospitals/referrals/:id/completion-summary
 * Retrieve closed-loop home care completion summary for hospital review
 */
hospitalRoutes.get(
  '/referrals/:id/completion-summary',
  authenticateUser,
  requireRole(['hospital', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userPayload!.userId;
      const role = req.userPayload!.role;
      const referralId = req.params.id;

      const summary = await getHospitalReferralCompletionSummary(referralId, userId, role);
      res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/hospitals/referrals/:id/acknowledge-summary
 * Formally acknowledge closed-loop home care summary by hospital staff
 */
hospitalRoutes.post(
  '/referrals/:id/acknowledge-summary',
  authenticateUser,
  requireRole(['hospital', 'admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.userPayload!.userId;
      const role = req.userPayload!.role;
      const referralId = req.params.id;

      const acknowledged = await acknowledgeHospitalCompletionSummary(referralId, userId, role, req.body);
      res.json({
        success: true,
        message: 'Closed-loop home care completion summary acknowledged successfully',
        data: acknowledged,
      });
    } catch (err) {
      next(err);
    }
  }
);

