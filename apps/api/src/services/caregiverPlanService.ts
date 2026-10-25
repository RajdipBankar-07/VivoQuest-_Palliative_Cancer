import mongoose from 'mongoose';
import { CaregiverPlan, ICaregiverPlan, PlanCategory, PlanType } from '../models/CaregiverPlan.js';
import { CaregiverSubscription, ICaregiverSubscription, SubscriptionStatus } from '../models/CaregiverSubscription.js';
import { User, IUser } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { logAdminAction, escapeRegex, extractPhoneSearchVariants } from './adminService.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Standard caregiver subscription audit event recorder.
 * Guarantees actor attribution strictly from server context and standard audit fields.
 */
export interface SubscriptionAuditDetails {
  eventType: string;
  subscriptionId?: string;
  subscriptionNumber?: string;
  patientId?: string;
  patientName?: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  notes?: string;
  correlationId?: string;
  previousCaregiverId?: string;
  previousCaregiverName?: string;
  newCaregiverId?: string;
  newCaregiverName?: string;
  visitsCompleted?: number;
  visitsRemaining?: number;
  totalVisitsIncluded?: number;
  planTitle?: string;
  customerPrice?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  [key: string]: any;
}

export const logSubscriptionAudit = async (params: {
  action: string;
  sub: ICaregiverSubscription;
  actorUser?: IUser;
  details: SubscriptionAuditDetails;
  severity?: 'info' | 'warning' | 'critical';
}): Promise<void> => {
  const actorId = params.actorUser?._id ? params.actorUser._id.toString() : undefined;
  const actorName = params.actorUser?.fullName || 'System / Service Engine';
  const actorRole = params.actorUser?.role || 'system';

  await logAdminAction({
    action: params.action,
    category: 'order_fulfillment',
    actorId,
    actorName,
    actorRole,
    targetType: 'CAREGIVER_SUBSCRIPTION',
    targetId: params.sub.subscriptionNumber,
    details: {
      subscriptionId: params.sub._id.toString(),
      subscriptionNumber: params.sub.subscriptionNumber,
      patientId: params.sub.patientId ? params.sub.patientId.toString() : params.details.patientId,
      patientName: params.sub.patientName || params.details.patientName,
      ...params.details,
    },
    severity: params.severity || 'info',
  });
};


export const seedCaregiverPlansDemoData = async () => {
  try {
    const existingPlans = await CaregiverPlan.countDocuments();
    if (existingPlans === 0) {
      const plan1 = await CaregiverPlan.create({
        planCode: 'PLAN-PAL-MONTHLY',
        title: 'Monthly 24/7 Comprehensive Palliative Care Support',
        planType: 'monthly_subscription',
        category: 'palliative',
        durationDays: 30,
        totalVisitsIncluded: 30,
        hoursPerVisit: 8,
        customerPrice: 36000,
        caregiverPayout: 25000,
        description:
          'Dedicated bedside palliative nurse and caregiver assistance including pain management observation, hygiene care, positioning, and regular vital signs logging.',
        features: [
          'Daily dedicated 8-hour palliative bedside nursing visit',
          'Continuous symptom and pain monitoring daily care log',
          'Emergency escalation to medical director / supervising physician',
          'Medication dispensing and dressing management assistance',
        ],
        isActive: true,
        isPopular: true,
      });

      const plan2 = await CaregiverPlan.create({
        planCode: 'PKG-POST-OP-14',
        title: '14-Day Post-Surgical Recovery & Wound Care Package',
        planType: 'fixed_visit_package',
        category: 'post_operative',
        durationDays: 14,
        totalVisitsIncluded: 14,
        hoursPerVisit: 2,
        customerPrice: 12500,
        caregiverPayout: 8500,
        description:
          'Post-discharge surgical dressing, catheter care, antibiotic IV/oral tracking, and early mobilization by licensed home nurse.',
        features: [
          'Daily sterile surgical wound dressing & drain inspection',
          'Vitals & infection surveillance reporting',
          'Mobility exercises and fall prevention protocol',
        ],
        isActive: true,
        isPopular: false,
      });

      const plan3 = await CaregiverPlan.create({
        planCode: 'PKG-ELDER-DAILY-10',
        title: 'Senior Daily Assistance & Mobility (10-Visit Pack)',
        planType: 'fixed_visit_package',
        category: 'elderly_care',
        durationDays: 30,
        totalVisitsIncluded: 10,
        hoursPerVisit: 4,
        customerPrice: 8000,
        caregiverPayout: 5500,
        description:
          'Flexible 10-visit care bundle for elderly relatives needing assisted bathing, transfer support, cognitive activities, and companionship.',
        features: [
          'Assisted bathing and hygiene maintenance',
          'Prescribed physical therapy assistance & walking aid support',
          'Family health portal report after every visit',
        ],
        isActive: true,
        isPopular: false,
      });

      console.log('[Seed] Demonstration caregiver plans & packages initialized.');

      // Seed 2 Demonstration Subscriptions with assigned caregivers
      const existingSubs = await CaregiverSubscription.countDocuments();
      if (existingSubs === 0) {
        // Find or create patient
        let patientUser = await User.findOne({ role: 'patient' });
        if (!patientUser) {
          patientUser = await User.create({
            fullName: 'Ramesh Kulkarni',
            phone: '9810011111',
            email: 'ramesh.kulkarni@example.com',
            role: 'patient',
            passwordHash: '$2a$10$wK1W8GqjV1dE8qfS9I4PueZ.qBwT6Y1oF.5yWfB3p1Z5F9jG3.P3m',
            isPhoneVerified: true,
            status: 'active',
            dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
          });
        }

        // Find or create caregiver
        let caregiverUser = await User.findOne({ phone: '9822441122' });
        if (!caregiverUser) {
          caregiverUser = await User.create({
            fullName: 'Sister Sunita Deshpande',
            phone: '9822441122',
            email: 'sunita.deshpande@vivoquest.in',
            role: 'professional',
            passwordHash: '$2a$10$wK1W8GqjV1dE8qfS9I4PueZ.qBwT6Y1oF.5yWfB3p1Z5F9jG3.P3m',
            isPhoneVerified: true,
            status: 'active',
            dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
          });
        }

        const now = new Date();
        const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 3600 * 1000);

        await CaregiverSubscription.create([
          {
            subscriptionNumber: 'SUB-202610-001',
            patientId: patientUser._id,
            patientName: patientUser.fullName,
            patientPhone: patientUser.phone,
            planId: plan1._id,
            planTitle: plan1.title,
            status: 'active',
            startDate: now,
            endDate: thirtyDaysLater,
            assignedCaregiverId: caregiverUser._id,
            assignedCaregiverName: caregiverUser.fullName,
            assignedCaregiverPhone: caregiverUser.phone,
            totalVisitsIncluded: 30,
            visitsCompleted: 6,
            visitsRemaining: 24,
            pricing: {
              customerPrice: 36000,
              caregiverPayout: 25000,
              platformCommission: 11000,
              paymentStatus: 'paid',
              paymentMethod: 'online',
              razorpayPaymentId: 'pay_demo_sub_001',
            },
            emergencyContact: {
              name: 'Anand Kulkarni (Son)',
              phone: '9822019911',
              relation: 'Son',
            },
            carePlanNotes: 'Palliative support: stage 4 lung neoplasm. Oxygen concentrator in room. Pain rating monitoring required.',
            isDemo: true,
          },
          {
            subscriptionNumber: 'SUB-202610-002',
            patientId: patientUser._id,
            patientName: 'Arvind Joshi',
            patientPhone: '9820011003',
            planId: plan2._id,
            planTitle: plan2.title,
            status: 'active',
            startDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
            endDate: new Date(Date.now() + 9 * 24 * 3600 * 1000),
            assignedCaregiverId: caregiverUser._id,
            assignedCaregiverName: caregiverUser.fullName,
            assignedCaregiverPhone: caregiverUser.phone,
            totalVisitsIncluded: 14,
            visitsCompleted: 5,
            visitsRemaining: 9,
            pricing: {
              customerPrice: 12500,
              caregiverPayout: 8500,
              platformCommission: 4000,
              paymentStatus: 'paid',
              paymentMethod: 'online',
              razorpayPaymentId: 'pay_demo_sub_002',
            },
            emergencyContact: {
              name: 'Pratibha Joshi (Wife)',
              phone: '9820011004',
              relation: 'Wife',
            },
            carePlanNotes: 'Post total hip arthroplasty. Surgical dressing inspection and gait retraining.',
            isDemo: true,
          },
        ]);
        console.log('[Seed] Demonstration caregiver subscriptions with assigned caregivers initialized.');
      }
    }
  } catch (err: any) {
    console.warn('[Seed] Caregiver plans seeding notice:', err.message);
  }
};

/**
 * List all caregiver subscription plans
 */
export const listCaregiverPlans = async (filters: {
  category?: string;
  planType?: string;
  isActive?: boolean;
}) => {
  await seedCaregiverPlansDemoData();

  const query: any = {};
  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }
  if (filters.planType && filters.planType !== 'all') {
    query.planType = filters.planType;
  }
  if (typeof filters.isActive === 'boolean') {
    query.isActive = filters.isActive;
  }

  return CaregiverPlan.find(query).sort({ customerPrice: 1 }).lean();
};

/**
 * Get caregiver plan by ID or code
 */
export const getCaregiverPlanById = async (idOrCode: string): Promise<ICaregiverPlan> => {
  let query: any = { _id: idOrCode };
  if (!mongoose.Types.ObjectId.isValid(idOrCode)) {
    query = { planCode: idOrCode.toUpperCase() };
  }

  const plan = await CaregiverPlan.findOne(query);
  if (!plan) {
    throw new AppError('Caregiver plan not found', 404);
  }
  return plan;
};

/**
 * Create a new caregiver subscription plan
 */
export const createCaregiverPlan = async (
  data: {
    title: string;
    planType: PlanType;
    category: PlanCategory;
    durationDays: number;
    totalVisitsIncluded: number;
    hoursPerVisit: number;
    customerPrice: number;
    caregiverPayout: number;
    description: string;
    features?: string[];
  },
  actorUser: IUser
): Promise<ICaregiverPlan> => {
  if (!data.title?.trim() || !data.customerPrice || !data.durationDays) {
    throw new AppError('Title, price, and duration are mandatory fields for a caregiver plan', 400);
  }

  const count = await CaregiverPlan.countDocuments();
  const planCode = `PLAN-${data.category.slice(0, 3).toUpperCase()}-${String(count + 1).padStart(3, '0')}`;

  const plan = await CaregiverPlan.create({
    planCode,
    title: data.title.trim(),
    planType: data.planType,
    category: data.category,
    durationDays: data.durationDays,
    totalVisitsIncluded: data.totalVisitsIncluded,
    hoursPerVisit: data.hoursPerVisit,
    customerPrice: data.customerPrice,
    caregiverPayout: data.caregiverPayout,
    description: data.description.trim(),
    features: data.features || [],
    isActive: true,
  });

  await logAdminAction({
    action: 'CAREGIVER_PLAN_CREATED',
    category: 'service_catalog' as any,
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'CAREGIVER_PLAN',
    targetId: plan.planCode,
    details: {
      title: plan.title,
      customerPrice: plan.customerPrice,
      caregiverPayout: plan.caregiverPayout,
    },
    severity: 'info',
  });

  return plan;
};

/**
 * List patient caregiver subscriptions with filters
 */
export const listCaregiverSubscriptions = async (filters: {
  status?: string;
  patientId?: string;
  caregiverId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  await seedCaregiverPlansDemoData();

  const query: any = {};
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'suspended' || filters.status === 'paused') {
      query.status = { $in: ['paused', 'suspended'] };
    } else if (filters.status === 'archived') {
      query.isArchived = true;
    } else {
      query.status = filters.status;
    }
  }
  if (filters.status !== 'archived') {
    query.isArchived = { $ne: true };
  }
  if (filters.patientId && mongoose.Types.ObjectId.isValid(filters.patientId)) {
    query.patientId = new mongoose.Types.ObjectId(filters.patientId);
  }
  if (filters.caregiverId && mongoose.Types.ObjectId.isValid(filters.caregiverId)) {
    query.assignedCaregiverId = new mongoose.Types.ObjectId(filters.caregiverId);
  }
  if (filters.search && filters.search.trim()) {
    const rawSearch = filters.search.trim();
    const searchRegex = new RegExp(escapeRegex(rawSearch), 'i');
    const orConditions: any[] = [
      { subscriptionNumber: searchRegex },
      { patientName: searchRegex },
      { patientPhone: searchRegex },
      { assignedCaregiverName: searchRegex },
      { planTitle: searchRegex },
    ];

    if (mongoose.Types.ObjectId.isValid(rawSearch)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(rawSearch) });
      orConditions.push({ patientId: new mongoose.Types.ObjectId(rawSearch) });
    }

    const phoneVariants = extractPhoneSearchVariants(rawSearch);
    for (const pv of phoneVariants) {
      orConditions.push(
        { patientPhone: new RegExp(escapeRegex(pv), 'i') },
        { assignedCaregiverPhone: new RegExp(escapeRegex(pv), 'i') }
      );
    }

    query.$or = orConditions;
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [subscriptions, total] = await Promise.all([
    CaregiverSubscription.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CaregiverSubscription.countDocuments(query),
  ]);

  const mappedSubscriptions = subscriptions.map((s: any) => ({
    ...s,
    id: s._id ? s._id.toString() : undefined,
  }));

  return {
    subscriptions: mappedSubscriptions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Helper to find caregiver subscription by Mongo ObjectId or Subscription Number (e.g. SUB-202610-001)
 */
const findSubscriptionDoc = async (idOrNumber: string): Promise<ICaregiverSubscription | null> => {
  if (!idOrNumber || typeof idOrNumber !== 'string') return null;
  const trimmed = idOrNumber.trim();
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const doc = await CaregiverSubscription.findById(trimmed);
    if (doc) return doc;
  }
  return await CaregiverSubscription.findOne({ subscriptionNumber: trimmed.toUpperCase() });
};

/**
 * Get caregiver subscription by ID or number
 */
export const getSubscriptionById = async (idOrNumber: string): Promise<ICaregiverSubscription> => {
  const sub = await findSubscriptionDoc(idOrNumber);
  if (!sub) {
    throw new AppError('Caregiver subscription not found', 404);
  }
  return sub;
};

/**
 * Assign or reassign caregiver to subscription
 */
export const assignCaregiverToSubscription = async (
  subscriptionId: string,
  caregiverUserId: string,
  notes?: string,
  actorUser?: IUser
): Promise<ICaregiverSubscription> => {
  const sub = await findSubscriptionDoc(subscriptionId);
  if (!sub) {
    throw new AppError('Subscription not found', 404);
  }

  if (sub.isArchived) {
    throw new AppError('Cannot assign caregiver: Subscription is archived', 400);
  }

  if (sub.status === 'cancelled') {
    throw new AppError('Cannot assign caregiver: Subscription is cancelled', 400);
  }

  if (sub.status === 'completed') {
    throw new AppError('Cannot assign caregiver: Subscription is already completed', 400);
  }

  const cgId = typeof caregiverUserId === 'string' ? caregiverUserId.trim() : '';
  if (!cgId || cgId === 'undefined' || cgId === 'null' || !mongoose.Types.ObjectId.isValid(cgId)) {
    throw new AppError('Valid caregiver account ID is required', 400);
  }

  const caregiver = await User.findById(cgId);
  if (!caregiver) {
    throw new AppError('Caregiver account not found', 404);
  }

  if (caregiver.status !== 'active') {
    throw new AppError('Caregiver account is not active', 400);
  }

  if (!['professional', 'caregiver', 'nurse'].includes(caregiver.role)) {
    throw new AppError('Selected user is not a caregiver or healthcare professional', 400);
  }

  // Capture previous assignment state for audit delta and rollback safety
  const previousCaregiverId = sub.assignedCaregiverId ? sub.assignedCaregiverId.toString() : undefined;
  const previousCaregiverName = sub.assignedCaregiverName;
  const previousCaregiverPhone = sub.assignedCaregiverPhone;
  const previousNotes = sub.carePlanNotes;

  sub.assignedCaregiverId = caregiver._id;
  sub.assignedCaregiverName = caregiver.fullName;
  sub.assignedCaregiverPhone = caregiver.phone;
  if (notes !== undefined && notes !== null) {
    sub.carePlanNotes = notes.trim();
  }

  await sub.save();

  try {
    await logSubscriptionAudit({
      action: 'CAREGIVER_ASSIGNED_TO_SUBSCRIPTION',
      sub,
      actorUser,
      details: {
        eventType: 'CAREGIVER_ASSIGNED_TO_SUBSCRIPTION',
        previousCaregiverId,
        previousCaregiverName: previousCaregiverName || 'Unassigned',
        newCaregiverId: caregiver._id.toString(),
        newCaregiverName: caregiver.fullName,
        notes: notes?.trim() || (previousCaregiverName ? 'Caregiver reassigned' : 'Initial caregiver assigned'),
      },
      severity: 'info',
    });
  } catch (auditErr: any) {
    // Consistency rollback: revert state change if audit recording fails
    const unsetObj: any = {};
    const setObj: any = {
      carePlanNotes: previousNotes,
    };
    if (previousCaregiverId) {
      setObj.assignedCaregiverId = new mongoose.Types.ObjectId(previousCaregiverId);
      setObj.assignedCaregiverName = previousCaregiverName;
      setObj.assignedCaregiverPhone = previousCaregiverPhone;
    } else {
      unsetObj.assignedCaregiverId = 1;
      unsetObj.assignedCaregiverName = 1;
      unsetObj.assignedCaregiverPhone = 1;
    }

    const updateDoc: any = { $set: setObj };
    if (Object.keys(unsetObj).length > 0) updateDoc.$unset = unsetObj;

    await CaregiverSubscription.findByIdAndUpdate(sub._id, updateDoc);
    throw new AppError(
      `Audit logging failed: ${auditErr.message}. Caregiver assignment rolled back to maintain compliance.`,
      500
    );
  }

  return sub;
};



/**
 * Activate a caregiver subscription for a patient
 */
export const activateCaregiverSubscription = async (
  data: {
    patientId: string;
    planId: string;
    emergencyContact?: { name: string; phone: string; relation: string };
    assignedCaregiverId?: string;
    carePlanNotes?: string;
    paymentMethod?: string;
    razorpayPaymentId?: string;
  },
  actorUser?: IUser
): Promise<ICaregiverSubscription> => {
  // 1. Validate Patient ID
  if (!data.patientId || typeof data.patientId !== 'string' || !mongoose.Types.ObjectId.isValid(data.patientId.trim())) {
    throw new AppError('Valid patient ID is required for subscription activation', 400);
  }

  const patient = await User.findById(data.patientId.trim());
  if (!patient) {
    throw new AppError('Patient account not found', 404);
  }

  if (patient.role !== 'patient') {
    throw new AppError('Selected account is not a registered patient', 400);
  }

  if (patient.status !== 'active') {
    throw new AppError('Patient account is suspended or inactive', 400);
  }

  // 2. Validate Care Plan ID
  if (!data.planId || typeof data.planId !== 'string' || !mongoose.Types.ObjectId.isValid(data.planId.trim())) {
    throw new AppError('Valid care plan package ID is required', 400);
  }

  const plan = await CaregiverPlan.findById(data.planId.trim());
  if (!plan || !plan.isActive) {
    throw new AppError('Care plan not found or inactive', 404);
  }

  // 3. Make subscription activation safe against duplicate requests & replay attacks
  if (data.razorpayPaymentId) {
    const existingPaymentSub = await CaregiverSubscription.findOne({
      'pricing.razorpayPaymentId': data.razorpayPaymentId.trim(),
    });
    if (existingPaymentSub) {
      throw new AppError('A subscription has already been activated with this payment transaction ID', 409);
    }
  }

  // Prevent duplicate activation of the same care plan for the same patient
  const duplicateSub = await CaregiverSubscription.findOne({
    patientId: patient._id,
    planId: plan._id,
    status: 'active',
  });
  if (duplicateSub) {
    throw new AppError(
      `Duplicate subscription activation: Patient already has an active subscription (${duplicateSub.subscriptionNumber} — ${duplicateSub.planTitle}) for this care plan.`,
      409
    );
  }

  // Prevent rapid duplicate submissions for the same patient and plan (e.g. double-clicking activate button)
  const recentDuplicate = await CaregiverSubscription.findOne({
    patientId: patient._id,
    planId: plan._id,
    createdAt: { $gte: new Date(Date.now() - 5000) },
  });
  if (recentDuplicate) {
    throw new AppError(
      `Duplicate subscription activation detected for this patient. Subscription ${recentDuplicate.subscriptionNumber} was just processed.`,
      409
    );
  }

  // 4. Validate Assigned Caregiver if specified
  let caregiverUser: any = null;
  const rawCgId = typeof data.assignedCaregiverId === 'string' ? data.assignedCaregiverId.trim() : '';
  if (rawCgId && rawCgId !== 'undefined' && rawCgId !== 'null') {
    if (!mongoose.Types.ObjectId.isValid(rawCgId)) {
      throw new AppError('Invalid caregiver account ID provided', 400);
    }
    caregiverUser = await User.findById(rawCgId);
    if (!caregiverUser) {
      throw new AppError('Assigned caregiver account not found', 404);
    }
    if (caregiverUser.status !== 'active') {
      throw new AppError('Assigned caregiver account is not active', 400);
    }
    if (!['professional', 'caregiver', 'nurse'].includes(caregiverUser.role)) {
      throw new AppError('Selected user is not a licensed caregiver or healthcare professional', 400);
    }
  }

  // 5. Calculate Subscription Dates and Visits
  const durationDays = plan.planType === 'monthly_subscription' ? 30 : (plan.durationDays || 60);
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 3600 * 1000);
  const visits = plan.totalVisitsIncluded || 10;

  // 6. Generate collision-safe sequential subscription number
  const monthPrefix = `SUB-${new Date().toISOString().slice(0, 7).replace('-', '')}`;
  const lastSub = await CaregiverSubscription.findOne({
    subscriptionNumber: new RegExp(`^${monthPrefix}-\\d+`),
  })
    .sort({ subscriptionNumber: -1 })
    .lean();

  let nextSeq = 1;
  if (lastSub && lastSub.subscriptionNumber) {
    const parts = lastSub.subscriptionNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  let subscriptionNumber = `${monthPrefix}-${String(nextSeq).padStart(3, '0')}`;
  while (await CaregiverSubscription.exists({ subscriptionNumber })) {
    nextSeq += 1;
    subscriptionNumber = `${monthPrefix}-${String(nextSeq).padStart(3, '0')}`;
  }

  // 7. Sanitize Emergency Contact
  let emergencyContact: { name: string; phone: string; relation: string } | undefined;
  if (data.emergencyContact && data.emergencyContact.name?.trim()) {
    emergencyContact = {
      name: data.emergencyContact.name.trim(),
      phone: (data.emergencyContact.phone || '').trim(),
      relation: (data.emergencyContact.relation || '').trim(),
    };
  }

  // 8. Create Subscription in MongoDB with concurrency guard
  let sub: ICaregiverSubscription;
  try {
    sub = await CaregiverSubscription.create({
      subscriptionNumber,
      patientId: patient._id,
      patientName: patient.fullName,
      patientPhone: patient.phone,
      planId: plan._id,
      planTitle: plan.title,
      status: 'active',
      startDate,
      endDate,
      assignedCaregiverId: caregiverUser?._id,
      assignedCaregiverName: caregiverUser?.fullName,
      assignedCaregiverPhone: caregiverUser?.phone,
      totalVisitsIncluded: visits,
      visitsCompleted: 0,
      visitsRemaining: visits,
      pricing: {
        customerPrice: plan.customerPrice,
        caregiverPayout: plan.caregiverPayout,
        platformCommission: Math.max(0, plan.customerPrice - plan.caregiverPayout),
        paymentStatus: 'paid',
        paymentMethod: data.paymentMethod || 'online',
        razorpayPaymentId: data.razorpayPaymentId || `pay_sub_${Date.now()}`,
      },
      emergencyContact,
      carePlanNotes: data.carePlanNotes ? data.carePlanNotes.trim() : undefined,
      isDemo: false,
    });
  } catch (err: any) {
    if (err.code === 11000) {
      const activeSub = await CaregiverSubscription.findOne({
        patientId: patient._id,
        status: 'active',
      }).sort({ createdAt: -1 });
      if (activeSub) {
        if (activeSub.planId.toString() === plan._id.toString()) {
          (activeSub as any)._isIdempotentReplay = true;
          return activeSub;
        }
        throw new AppError(
          `Patient already has an active subscription (${activeSub.subscriptionNumber} — ${activeSub.planTitle}). Please cancel, pause, or complete the active subscription before activating a new one.`,
          409
        );
      }
    }
    throw err;
  }

  try {
    await logSubscriptionAudit({
      action: 'CAREGIVER_SUBSCRIPTION_ACTIVATED',
      sub,
      actorUser,
      details: {
        eventType: 'CAREGIVER_SUBSCRIPTION_ACTIVATED',
        planTitle: plan.title,
        patientId: patient._id.toString(),
        patientName: patient.fullName,
        visitsIncluded: visits,
        customerPrice: plan.customerPrice,
        paymentStatus: sub.pricing?.paymentStatus || 'paid',
        paymentMethod: sub.pricing?.paymentMethod || 'online',
        correlationId: data.razorpayPaymentId || sub.pricing?.razorpayPaymentId,
        notes: data.carePlanNotes?.trim() || 'Initial subscription activation',
      },
      severity: 'info',
    });
  } catch (auditErr: any) {
    // Consistency rollback: unroll subscription creation if audit fails
    await CaregiverSubscription.findByIdAndDelete(sub._id);
    throw new AppError(
      `Audit logging failed: ${auditErr.message}. Subscription activation rolled back to maintain compliance.`,
      500
    );
  }

  // Dispatch In-App Persistent Notification to Admin
  try {
    const adminNotifIdempotency = `notif_sub_active_${sub.subscriptionNumber}`;
    const existingNotif = await NotificationLog.findOne({ idempotencyKey: adminNotifIdempotency });
    if (!existingNotif) {
      await NotificationLog.create({
        recipientPhone: 'ADMIN_DESK',
        recipientName: 'VivoQuest Clinical Care Desk',
        recipientRole: 'admin',
        channel: 'in_app',
        templateId: 'SUBSCRIPTION_ACTIVATED_TEST_MODE',
        messageBody: `New Care Plan Subscription Activated: Plan "${plan.title}" for patient ${patient.fullName} (+91 ${patient.phone}). Subscription #${sub.subscriptionNumber}. Included Visits: ${visits}. Status: Active.`,
        consentChecked: true,
        status: 'delivered',
        provider: 'in_app_system',
        idempotencyKey: adminNotifIdempotency,
        isRead: false,
        metadata: {
          subscriptionId: sub._id.toString(),
          subscriptionNumber: sub.subscriptionNumber,
          patientId: patient._id.toString(),
          patientName: patient.fullName,
          patientPhone: patient.phone,
          planId: plan._id.toString(),
          planTitle: plan.title,
          paymentStatus: sub.pricing?.paymentStatus || 'paid',
          customerPrice: plan.customerPrice,
          totalVisitsIncluded: visits,
          activatedAt: new Date().toISOString(),
        },
      });
    }
  } catch (notifErr: any) {
    console.warn('[Notification] Failed to create in-app notification for admin subscription activation:', notifErr.message);
  }

  return sub;
};

/**
 * Patient-initiated Caregiver Subscription Activation in explicit TEST MODE.
 * - Strictly derives patient identity from the authenticated server-side context.
 * - Validates plan availability and takes real configured price directly from DB plan.
 * - Idempotent against rapid double-clicks or retries.
 * - Sets paymentStatus to 'test_mode' and paymentMethod to 'test_mode'.
 * - Records compliant audit log entry.
 * - Dispatches persistent in-app notification to Admin and Super Admin.
 */
export const activatePatientSubscriptionTestMode = async (
  patientUserId: string,
  planId: string,
  options?: {
    emergencyContact?: { name: string; phone: string; relation: string };
    carePlanNotes?: string;
    idempotencyKey?: string;
  }
): Promise<ICaregiverSubscription> => {
  // 1. Validate Patient
  if (!patientUserId || !mongoose.Types.ObjectId.isValid(patientUserId)) {
    throw new AppError('Valid authenticated patient ID is required', 400);
  }

  const patient = await User.findById(patientUserId);
  if (!patient) {
    throw new AppError('Patient account not found', 404);
  }

  if (patient.role !== 'patient') {
    throw new AppError('Only registered patients can activate a caregiver subscription', 403);
  }

  if (patient.status !== 'active') {
    throw new AppError('Patient account is suspended or inactive', 400);
  }

  // 2. Validate Care Plan
  if (!planId || typeof planId !== 'string' || !mongoose.Types.ObjectId.isValid(planId.trim())) {
    throw new AppError('Valid care plan package ID is required', 400);
  }

  const plan = await CaregiverPlan.findById(planId.trim());
  if (!plan || !plan.isActive) {
    throw new AppError('Care plan not found or currently inactive', 404);
  }

  // 3. Idempotency Check & Duplicate Prevention
  // Priority 1: If client provided idempotency key, check if already recorded
  if (options?.idempotencyKey) {
    const existingKeySub = await CaregiverSubscription.findOne({
      patientId: patient._id,
      'pricing.razorpayPaymentId': `test_mode_${options.idempotencyKey.trim()}`,
    });
    if (existingKeySub) {
      (existingKeySub as any)._isIdempotentReplay = true;
      return existingKeySub;
    }
  }

  // Priority 2: Check if patient already has ANY active subscription (business rule: one at a time)
  // Return existing as idempotent replay if same plan; reject if different plan.
  const existingActiveSub = await CaregiverSubscription.findOne({
    patientId: patient._id,
    status: 'active',
  }).sort({ createdAt: -1 });

  if (existingActiveSub) {
    // If it's the same plan, treat as idempotent replay (safe for retries/double-clicks)
    if (existingActiveSub.planId.toString() === plan._id.toString()) {
      (existingActiveSub as any)._isIdempotentReplay = true;
      return existingActiveSub;
    }
    // Different plan: patient already has an active subscription — reject clearly
    throw new AppError(
      `You already have an active subscription (${existingActiveSub.subscriptionNumber} — ${existingActiveSub.planTitle}). Please cancel or complete the existing subscription before activating a new one.`,
      409
    );
  }

  // Priority 3: Race-condition guard — recent duplicate within 30 seconds (e.g. concurrent requests)
  const recentDuplicate = await CaregiverSubscription.findOne({
    patientId: patient._id,
    createdAt: { $gte: new Date(Date.now() - 30000) },
  });
  if (recentDuplicate) {
    (recentDuplicate as any)._isIdempotentReplay = true;
    return recentDuplicate;
  }

  // 4. Calculate Subscription Details
  const durationDays = plan.planType === 'monthly_subscription' ? 30 : (plan.durationDays || 60);
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 3600 * 1000);
  const visits = plan.totalVisitsIncluded || 10;

  // 5. Generate Collision-Safe Sequential Subscription Number
  const monthPrefix = `SUB-${new Date().toISOString().slice(0, 7).replace('-', '')}`;
  const lastSub = await CaregiverSubscription.findOne({
    subscriptionNumber: new RegExp(`^${monthPrefix}-\\d+`),
  })
    .sort({ subscriptionNumber: -1 })
    .lean();

  let nextSeq = 1;
  if (lastSub && lastSub.subscriptionNumber) {
    const parts = lastSub.subscriptionNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  let subscriptionNumber = `${monthPrefix}-${String(nextSeq).padStart(3, '0')}`;
  while (await CaregiverSubscription.exists({ subscriptionNumber })) {
    nextSeq += 1;
    subscriptionNumber = `${monthPrefix}-${String(nextSeq).padStart(3, '0')}`;
  }

  // 6. Sanitize Emergency Contact
  let emergencyContact: { name: string; phone: string; relation: string } | undefined;
  if (options?.emergencyContact && options.emergencyContact.name?.trim()) {
    emergencyContact = {
      name: options.emergencyContact.name.trim(),
      phone: (options.emergencyContact.phone || '').trim(),
      relation: (options.emergencyContact.relation || '').trim(),
    };
  }

  const paymentRef = options?.idempotencyKey
    ? `test_mode_${options.idempotencyKey.trim()}`
    : `test_mode_${Date.now()}`;

  // 7. Create Subscription with server-side atomic guard against concurrent requests
  let sub: ICaregiverSubscription;
  try {
    sub = await CaregiverSubscription.create({
      subscriptionNumber,
      patientId: patient._id,
      patientName: patient.fullName,
      patientPhone: patient.phone,
      planId: plan._id,
      planTitle: plan.title,
      status: 'active',
      startDate,
      endDate,
      totalVisitsIncluded: visits,
      visitsCompleted: 0,
      visitsRemaining: visits,
      pricing: {
        customerPrice: plan.customerPrice,
        caregiverPayout: plan.caregiverPayout,
        platformCommission: Math.max(0, plan.customerPrice - plan.caregiverPayout),
        paymentStatus: 'test_mode',
        paymentMethod: 'test_mode',
        razorpayPaymentId: paymentRef,
      },
      emergencyContact,
      carePlanNotes: options?.carePlanNotes?.trim() || 'Self-activated via Patient App (TEST MODE)',
      isDemo: false,
    });
  } catch (err: any) {
    if (err.code === 11000) {
      // Concurrency race: an active subscription was created concurrently
      const activeSub = await CaregiverSubscription.findOne({
        patientId: patient._id,
        status: 'active',
      }).sort({ createdAt: -1 });
      if (activeSub) {
        if (activeSub.planId.toString() === plan._id.toString()) {
          (activeSub as any)._isIdempotentReplay = true;
          return activeSub;
        }
        throw new AppError(
          `You already have an active subscription (${activeSub.subscriptionNumber} — ${activeSub.planTitle}). Please cancel or complete the existing subscription before activating a new one.`,
          409
        );
      }
    }
    throw err;
  }

  // 8. Log Compliant Audit Trail
  try {
    await logSubscriptionAudit({
      action: 'CAREGIVER_SUBSCRIPTION_ACTIVATED_TEST_MODE',
      sub,
      actorUser: patient,
      details: {
        eventType: 'CAREGIVER_SUBSCRIPTION_ACTIVATED_TEST_MODE',
        activationMode: 'TEST_MODE',
        planTitle: plan.title,
        patientId: patient._id.toString(),
        patientName: patient.fullName,
        visitsIncluded: visits,
        customerPrice: plan.customerPrice,
        paymentStatus: 'test_mode',
        paymentMethod: 'test_mode',
        correlationId: paymentRef,
        notes: options?.carePlanNotes?.trim() || 'Patient self-activation in verified TEST MODE',
      },
      severity: 'info',
    });
  } catch (auditErr: any) {
    await CaregiverSubscription.findByIdAndDelete(sub._id);
    throw new AppError(
      `Audit logging failed: ${auditErr.message}. Subscription activation rolled back to maintain compliance.`,
      500
    );
  }

  // 9. Dispatch In-App Persistent Notification to Admin / Super Admin (Safe reconciliation)
  try {
    const adminNotifIdempotency = `notif_sub_active_${sub.subscriptionNumber}`;
    const existingNotif = await NotificationLog.findOne({ idempotencyKey: adminNotifIdempotency });
    if (!existingNotif) {
      await NotificationLog.create({
        recipientPhone: 'ADMIN_DESK',
        recipientName: 'VivoQuest Clinical Care Desk',
        recipientRole: 'admin',
        channel: 'in_app',
        templateId: 'SUBSCRIPTION_ACTIVATED_TEST_MODE',
        messageBody: `[TEST MODE] New Care Plan Subscription Activated: Plan "${plan.title}" activated by patient ${patient.fullName} (+91 ${patient.phone}). Subscription #${sub.subscriptionNumber}. Included Visits: ${visits}. Status: Active (Test Mode). Action required: Review subscription and schedule bedside visits.`,
        consentChecked: true,
        status: 'delivered',
        provider: 'in_app_system',
        idempotencyKey: adminNotifIdempotency,
        isRead: false,
        metadata: {
          subscriptionId: sub._id.toString(),
          subscriptionNumber: sub.subscriptionNumber,
          patientId: patient._id.toString(),
          patientName: patient.fullName,
          patientPhone: patient.phone,
          planId: plan._id.toString(),
          planTitle: plan.title,
          activationMode: 'TEST_MODE',
          paymentStatus: 'test_mode',
          customerPrice: plan.customerPrice,
          totalVisitsIncluded: visits,
          activatedAt: new Date().toISOString(),
        },
      });
    }
  } catch (notifErr: any) {
    console.warn('[Notification] Failed to create in-app notification for patient self-activation:', notifErr.message);
  }

  return sub;
};


/**
 * Suspend a caregiver subscription
 */
export const suspendCaregiverSubscription = async (
  subscriptionId: string,
  reason: string,
  actorUser: IUser
): Promise<ICaregiverSubscription> => {
  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    throw new AppError('Suspension reason is required and must be at least 3 characters', 400);
  }

  const sub = await findSubscriptionDoc(subscriptionId);
  if (!sub) {
    throw new AppError('Subscription not found', 404);
  }

  if (sub.isArchived) {
    throw new AppError('Cannot suspend an archived subscription', 400);
  }

  if (sub.status === 'paused' || sub.status === 'suspended') {
    throw new AppError('Subscription is already suspended', 400);
  }

  if (sub.status === 'cancelled') {
    throw new AppError('Cannot suspend a cancelled subscription', 400);
  }

  if (sub.status === 'completed') {
    throw new AppError('Cannot suspend a completed subscription', 400);
  }

  if (sub.status === 'expired') {
    throw new AppError('Cannot suspend an expired subscription', 400);
  }

  const previousStatus = sub.status;
  const previousNotes = sub.carePlanNotes;
  const previousSuspendedAt = sub.suspendedAt;
  const previousSuspendedBy = sub.suspendedBy;
  const previousSuspensionReason = sub.suspensionReason;

  sub.status = 'suspended';
  sub.suspendedAt = new Date();
  sub.suspendedBy = actorUser._id;
  sub.suspensionReason = reason.trim();
  sub.carePlanNotes = sub.carePlanNotes
    ? `${sub.carePlanNotes} | Suspended: ${reason.trim()}`
    : `Suspended: ${reason.trim()}`;

  await sub.save();

  try {
    await logSubscriptionAudit({
      action: 'CAREGIVER_SUBSCRIPTION_SUSPENDED',
      sub,
      actorUser,
      details: {
        eventType: 'CAREGIVER_SUBSCRIPTION_SUSPENDED',
        previousStatus,
        newStatus: 'suspended',
        reason: reason.trim(),
        visitsRemaining: sub.visitsRemaining,
      },
      severity: 'warning',
    });
  } catch (auditErr: any) {
    // Consistency rollback: revert state change if audit recording fails
    const unsetObj: any = {};
    const setObj: any = {
      status: previousStatus,
      carePlanNotes: previousNotes,
    };
    if (previousSuspendedAt) setObj.suspendedAt = previousSuspendedAt;
    else unsetObj.suspendedAt = 1;

    if (previousSuspendedBy) setObj.suspendedBy = previousSuspendedBy;
    else unsetObj.suspendedBy = 1;

    if (previousSuspensionReason) setObj.suspensionReason = previousSuspensionReason;
    else unsetObj.suspensionReason = 1;

    const updateDoc: any = { $set: setObj };
    if (Object.keys(unsetObj).length > 0) updateDoc.$unset = unsetObj;

    await CaregiverSubscription.findByIdAndUpdate(sub._id, updateDoc);
    throw new AppError(
      `Audit logging failed: ${auditErr.message}. Subscription suspension rolled back to maintain compliance.`,
      500
    );
  }


  return sub;
};

/**
 * Resume a suspended caregiver subscription
 */
export const resumeCaregiverSubscription = async (
  subscriptionId: string,
  reason?: string,
  actorUser?: IUser
): Promise<ICaregiverSubscription> => {
  const sub = await findSubscriptionDoc(subscriptionId);
  if (!sub) {
    throw new AppError('Subscription not found', 404);
  }

  if (sub.isArchived) {
    throw new AppError('Cannot resume an archived subscription', 400);
  }

  if (sub.status !== 'paused' && sub.status !== 'suspended') {
    throw new AppError(`Cannot resume: Subscription is not currently suspended (current status: ${sub.status})`, 400);
  }

  if (sub.visitsRemaining <= 0) {
    throw new AppError('Cannot resume: Subscription has no remaining visits', 400);
  }

  const previousStatus = sub.status;
  const previousNotes = sub.carePlanNotes;
  const previousResumedAt = sub.resumedAt;
  const previousResumedBy = sub.resumedBy;
  const previousResumeReason = sub.resumeReason;

  sub.status = 'active';
  sub.resumedAt = new Date();
  if (actorUser) {
    sub.resumedBy = actorUser._id;
  }
  if (reason && reason.trim()) {
    sub.resumeReason = reason.trim();
    sub.carePlanNotes = sub.carePlanNotes
      ? `${sub.carePlanNotes} | Resumed: ${reason.trim()}`
      : `Resumed: ${reason.trim()}`;
  }

  await sub.save();

  try {
    await logSubscriptionAudit({
      action: 'CAREGIVER_SUBSCRIPTION_RESUMED',
      sub,
      actorUser,
      details: {
        eventType: 'CAREGIVER_SUBSCRIPTION_RESUMED',
        previousStatus,
        newStatus: 'active',
        reason: reason?.trim() || 'Resumed by admin',
        visitsRemaining: sub.visitsRemaining,
      },
      severity: 'info',
    });
  } catch (auditErr: any) {
    // Consistency rollback: revert state change if audit recording fails
    const unsetObj: any = {};
    const setObj: any = {
      status: previousStatus,
      carePlanNotes: previousNotes,
    };
    if (previousResumedAt) setObj.resumedAt = previousResumedAt;
    else unsetObj.resumedAt = 1;

    if (previousResumedBy) setObj.resumedBy = previousResumedBy;
    else unsetObj.resumedBy = 1;

    if (previousResumeReason) setObj.resumeReason = previousResumeReason;
    else unsetObj.resumeReason = 1;

    const updateDoc: any = { $set: setObj };
    if (Object.keys(unsetObj).length > 0) updateDoc.$unset = unsetObj;

    await CaregiverSubscription.findByIdAndUpdate(sub._id, updateDoc);
    throw new AppError(
      `Audit logging failed: ${auditErr.message}. Subscription resume rolled back to maintain compliance.`,
      500
    );
  }


  return sub;
};


/**
 * Cancel a caregiver subscription
 */
export const cancelCaregiverSubscription = async (
  subscriptionId: string,
  reason: string,
  actorUser?: IUser
): Promise<ICaregiverSubscription> => {
  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    throw new AppError('Cancellation reason is required and must be at least 3 characters', 400);
  }

  const sub = await findSubscriptionDoc(subscriptionId);
  if (!sub) {
    throw new AppError('Subscription not found', 404);
  }

  if (sub.isArchived) {
    throw new AppError('Cannot cancel an archived subscription', 400);
  }

  if (sub.status === 'cancelled') {
    throw new AppError('Subscription is already cancelled', 400);
  }

  if (sub.status === 'completed') {
    throw new AppError('Cannot cancel a completed subscription', 400);
  }

  const previousStatus = sub.status;
  const previousNotes = sub.carePlanNotes;
  const previousCancelledAt = sub.cancelledAt;
  const previousCancelledBy = sub.cancelledBy;
  const previousCancellationReason = sub.cancellationReason;

  sub.status = 'cancelled';
  sub.cancelledAt = new Date();
  if (actorUser) {
    sub.cancelledBy = actorUser._id;
  }
  sub.cancellationReason = reason.trim();
  sub.carePlanNotes = sub.carePlanNotes ? `${sub.carePlanNotes} | Cancelled: ${reason.trim()}` : `Cancelled: ${reason.trim()}`;
  await sub.save();

  try {
    await logSubscriptionAudit({
      action: 'CAREGIVER_SUBSCRIPTION_CANCELLED',
      sub,
      actorUser,
      details: {
        eventType: 'CAREGIVER_SUBSCRIPTION_CANCELLED',
        previousStatus,
        newStatus: 'cancelled',
        reason: reason.trim(),
        visitsRemaining: sub.visitsRemaining,
        paymentStatus: sub.pricing?.paymentStatus || 'paid',
      },
      severity: 'warning',
    });
  } catch (auditErr: any) {
    // Consistency rollback: revert state change if audit recording fails
    const unsetObj: any = {};
    const setObj: any = {
      status: previousStatus,
      carePlanNotes: previousNotes,
    };
    if (previousCancelledAt) setObj.cancelledAt = previousCancelledAt;
    else unsetObj.cancelledAt = 1;

    if (previousCancelledBy) setObj.cancelledBy = previousCancelledBy;
    else unsetObj.cancelledBy = 1;

    if (previousCancellationReason) setObj.cancellationReason = previousCancellationReason;
    else unsetObj.cancellationReason = 1;

    const updateDoc: any = { $set: setObj };
    if (Object.keys(unsetObj).length > 0) updateDoc.$unset = unsetObj;

    await CaregiverSubscription.findByIdAndUpdate(sub._id, updateDoc);
    throw new AppError(
      `Audit logging failed: ${auditErr.message}. Subscription cancellation rolled back to maintain compliance.`,
      500
    );
  }

  return sub;
};

/**
 * Archive a caregiver subscription (soft-delete compliance workflow)
 */
export const archiveCaregiverSubscription = async (
  subscriptionId: string,
  reason: string,
  actorUser: IUser
): Promise<ICaregiverSubscription> => {
  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    throw new AppError('Archive reason is required and must be at least 3 characters', 400);
  }

  const sub = await findSubscriptionDoc(subscriptionId);
  if (!sub) {
    throw new AppError('Subscription not found', 404);
  }

  if (sub.isArchived) {
    throw new AppError('Subscription is already archived', 400);
  }

  // Retention rule: Active or suspended care packages cannot be archived until formally cancelled or completed
  if (sub.status === 'active' || sub.status === 'paused' || sub.status === 'suspended') {
    throw new AppError(
      'Cannot archive an active or suspended subscription. Please cancel or complete the subscription first before archiving.',
      400
    );
  }

  // Prevent archiving unfulfilled paid subscriptions without cancellation
  if (sub.pricing?.paymentStatus === 'paid' && sub.visitsRemaining > 0 && sub.status !== 'cancelled') {
    throw new AppError(
      'Cannot archive subscription with unfulfilled paid visits unless it is cancelled first.',
      400
    );
  }

  const previousIsArchived = sub.isArchived;
  const previousArchivedAt = sub.archivedAt;
  const previousArchivedBy = sub.archivedBy;
  const previousArchiveReason = sub.archiveReason;

  sub.isArchived = true;
  sub.archivedAt = new Date();
  sub.archivedBy = actorUser._id;
  sub.archiveReason = reason.trim();

  await sub.save();

  try {
    await logSubscriptionAudit({
      action: 'CAREGIVER_SUBSCRIPTION_ARCHIVED',
      sub,
      actorUser,
      details: {
        eventType: 'CAREGIVER_SUBSCRIPTION_ARCHIVED',
        previousStatus: sub.status,
        newStatus: 'archived',
        reason: reason.trim(),
        visitsRemaining: sub.visitsRemaining,
      },
      severity: 'warning',
    });
  } catch (auditErr: any) {
    // Consistency rollback: revert state change if audit recording fails
    const unsetObj: any = {};
    const setObj: any = {
      isArchived: previousIsArchived,
    };
    if (previousArchivedAt) setObj.archivedAt = previousArchivedAt;
    else unsetObj.archivedAt = 1;

    if (previousArchivedBy) setObj.archivedBy = previousArchivedBy;
    else unsetObj.archivedBy = 1;

    if (previousArchiveReason) setObj.archiveReason = previousArchiveReason;
    else unsetObj.archiveReason = 1;

    const updateDoc: any = { $set: setObj };
    if (Object.keys(unsetObj).length > 0) updateDoc.$unset = unsetObj;

    await CaregiverSubscription.findByIdAndUpdate(sub._id, updateDoc);
    throw new AppError(
      `Audit logging failed: ${auditErr.message}. Subscription archive rolled back to maintain compliance.`,
      500
    );
  }


  return sub;
};

/**
 * Record a completed care visit against a subscription balance
 */
export const recordSubscriptionVisit = async (
  subscriptionId: string,
  visitNotes?: string,
  actorUser?: IUser,
  visitIdempotencyKey?: string
): Promise<ICaregiverSubscription> => {
  const sub = await findSubscriptionDoc(subscriptionId);
  if (!sub) {
    throw new AppError('Subscription not found', 404);
  }

  if (sub.isArchived) {
    throw new AppError('Cannot record visit: Subscription is archived', 400);
  }

  if (sub.status === 'paused' || sub.status === 'suspended') {
    throw new AppError(
      'Cannot record visit: Subscription is currently suspended. Please resume the subscription before recording visits.',
      400
    );
  }

  if (sub.status === 'cancelled') {
    throw new AppError('Cannot record visit: Subscription is cancelled', 400);
  }

  if (sub.status === 'completed') {
    throw new AppError('Cannot record visit: Subscription is already completed', 400);
  }

  if (sub.status === 'expired' || new Date() > sub.endDate) {
    sub.status = 'expired';
    await sub.save();
    throw new AppError('Cannot record visit: Subscription has expired', 400);
  }

  if (sub.visitsRemaining <= 0) {
    throw new AppError('No remaining visits in this subscription package', 400);
  }

  // Duplicate visit protection: check if a visit was recorded with this idempotency key
  if (visitIdempotencyKey && sub.carePlanNotes?.includes(`[KEY:${visitIdempotencyKey}]`)) {
    return sub; // Idempotent return without duplicate decrement
  }

  const previousVisitsCompleted = sub.visitsCompleted;
  const previousVisitsRemaining = sub.visitsRemaining;
  const previousStatus = sub.status;
  const previousNotes = sub.carePlanNotes;

  sub.visitsCompleted += 1;
  sub.visitsRemaining -= 1;

  if (visitIdempotencyKey) {
    sub.carePlanNotes = sub.carePlanNotes ? `${sub.carePlanNotes} [KEY:${visitIdempotencyKey}]` : `[KEY:${visitIdempotencyKey}]`;
  }

  if (sub.visitsRemaining === 0) {
    sub.status = 'completed';
  }

  await sub.save();

  try {
    await logSubscriptionAudit({
      action: 'SUBSCRIPTION_VISIT_RECORDED',
      sub,
      actorUser,
      details: {
        eventType: 'SUBSCRIPTION_VISIT_RECORDED',
        previousStatus,
        newStatus: sub.status,
        previousVisitsRemaining,
        visitsCompleted: sub.visitsCompleted,
        visitsRemaining: sub.visitsRemaining,
        totalVisitsIncluded: sub.totalVisitsIncluded,
        notes: visitNotes || 'Care visit recorded',
        correlationId: visitIdempotencyKey,
      },
      severity: 'info',
    });
  } catch (auditErr: any) {
    // Consistency rollback: revert state change if audit recording fails
    await CaregiverSubscription.findByIdAndUpdate(sub._id, {
      visitsCompleted: previousVisitsCompleted,
      visitsRemaining: previousVisitsRemaining,
      status: previousStatus,
      carePlanNotes: previousNotes,
    });
    throw new AppError(
      `Audit logging failed: ${auditErr.message}. Visit recording rolled back to maintain compliance.`,
      500
    );
  }

  return sub;
};

/**
 * Retrieve authorized chronological audit history for a specific caregiver subscription.
 * Strictly scoped to the requested subscription, sorted in descending chronological order.
 */
export const getSubscriptionAuditHistory = async (
  subscriptionIdOrNumber: string,
  options: { page?: number; limit?: number } = {}
) => {
  const sub = await findSubscriptionDoc(subscriptionIdOrNumber);
  if (!sub) {
    throw new AppError('Subscription not found', 404);
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const query = {
    targetType: 'CAREGIVER_SUBSCRIPTION',
    $or: [
      { targetId: sub.subscriptionNumber },
      { targetId: sub._id.toString() },
      { 'details.subscriptionNumber': sub.subscriptionNumber },
      { 'details.subscriptionId': sub._id.toString() },
    ],
  };

  const [total, rawLogs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query)
      .sort({ timestamp: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const events = rawLogs.map((log: any) => ({
    id: log._id.toString(),
    action: log.action,
    category: log.category,
    actorId: log.actorId ? log.actorId.toString() : undefined,
    actorName: log.actorName,
    actorRole: log.actorRole,
    targetType: log.targetType,
    targetId: log.targetId,
    severity: log.severity,
    timestamp: log.timestamp || log.createdAt,
    details: {
      ...(log.details || {}),
      eventType: log.details?.eventType || log.action,
      subscriptionId: log.details?.subscriptionId || sub._id.toString(),
      subscriptionNumber: log.details?.subscriptionNumber || sub.subscriptionNumber,
      patientId: log.details?.patientId || (sub.patientId ? sub.patientId.toString() : undefined),
      patientName: log.details?.patientName || sub.patientName,

      previousStatus: log.details?.previousStatus,
      newStatus: log.details?.newStatus,
      reason: log.details?.reason || log.details?.notes,
      notes: log.details?.notes,
      correlationId: log.details?.correlationId,
      visitsCompleted: log.details?.visitsCompleted,
      visitsRemaining: log.details?.visitsRemaining,
      totalVisitsIncluded: log.details?.totalVisitsIncluded,
      caregiverName: log.details?.caregiverName || log.details?.newCaregiverName,
      previousCaregiverName: log.details?.previousCaregiverName,
      newCaregiverName: log.details?.newCaregiverName,
      planTitle: log.details?.planTitle,
      paymentStatus: log.details?.paymentStatus,
      paymentMethod: log.details?.paymentMethod,
    },
  }));

  return {
    subscription: {
      id: sub._id.toString(),
      subscriptionNumber: sub.subscriptionNumber,
      patientId: sub.patientId.toString(),
      patientName: sub.patientName,
      patientPhone: sub.patientPhone,
      planTitle: sub.planTitle,
      status: sub.status,
      isArchived: Boolean(sub.isArchived),
      visitsRemaining: sub.visitsRemaining,
      totalVisitsIncluded: sub.totalVisitsIncluded,
      visitsCompleted: sub.visitsCompleted,
      startDate: sub.startDate,
      endDate: sub.endDate,
    },
    events,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

