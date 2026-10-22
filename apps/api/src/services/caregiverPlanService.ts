import mongoose from 'mongoose';
import { CaregiverPlan, ICaregiverPlan, PlanCategory, PlanType } from '../models/CaregiverPlan.js';
import { CaregiverSubscription, ICaregiverSubscription, SubscriptionStatus } from '../models/CaregiverSubscription.js';
import { User, IUser } from '../models/User.js';
import { logAdminAction } from './adminService.js';
import { AppError } from '../middleware/errorHandler.js';

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
    query.status = filters.status;
  }
  if (filters.patientId && mongoose.Types.ObjectId.isValid(filters.patientId)) {
    query.patientId = new mongoose.Types.ObjectId(filters.patientId);
  }
  if (filters.caregiverId && mongoose.Types.ObjectId.isValid(filters.caregiverId)) {
    query.assignedCaregiverId = new mongoose.Types.ObjectId(filters.caregiverId);
  }
  if (filters.search && filters.search.trim()) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    query.$or = [
      { subscriptionNumber: searchRegex },
      { patientName: searchRegex },
      { patientPhone: searchRegex },
      { assignedCaregiverName: searchRegex },
      { planTitle: searchRegex },
    ];
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [subscriptions, total] = await Promise.all([
    CaregiverSubscription.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CaregiverSubscription.countDocuments(query),
  ]);

  return {
    subscriptions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get caregiver subscription by ID or number
 */
export const getSubscriptionById = async (idOrNumber: string): Promise<ICaregiverSubscription> => {
  let query: any = { _id: idOrNumber };
  if (!mongoose.Types.ObjectId.isValid(idOrNumber)) {
    query = { subscriptionNumber: idOrNumber.toUpperCase() };
  }

  const sub = await CaregiverSubscription.findOne(query);
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
  const sub = await CaregiverSubscription.findById(subscriptionId);
  if (!sub) {
    throw new AppError('Subscription not found', 404);
  }

  const caregiver = await User.findById(caregiverUserId);
  if (!caregiver) {
    throw new AppError('Caregiver account not found', 404);
  }

  sub.assignedCaregiverId = caregiver._id;
  sub.assignedCaregiverName = caregiver.fullName;
  sub.assignedCaregiverPhone = caregiver.phone;
  if (notes) {
    sub.carePlanNotes = notes.trim();
  }

  await sub.save();

  if (actorUser) {
    await logAdminAction({
      action: 'CAREGIVER_ASSIGNED_TO_SUBSCRIPTION',
      category: 'order_fulfillment' as any,
      actorId: actorUser._id.toString(),
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      targetType: 'CAREGIVER_SUBSCRIPTION',
      targetId: sub.subscriptionNumber,
      details: {
        caregiverName: caregiver.fullName,
        patientName: sub.patientName,
      },
      severity: 'info',
    });
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
  const patient = await User.findById(data.patientId);
  if (!patient) {
    throw new AppError('Patient account not found', 404);
  }

  const plan = await CaregiverPlan.findById(data.planId);
  if (!plan || !plan.isActive) {
    throw new AppError('Care plan not found or inactive', 404);
  }

  let caregiverUser: any = null;
  if (data.assignedCaregiverId) {
    caregiverUser = await User.findById(data.assignedCaregiverId);
  }

  const durationDays = plan.planType === 'monthly_subscription' ? 30 : (plan.durationDays || 60);
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 3600 * 1000);
  const visits = plan.totalVisitsIncluded || 10;

  const count = await CaregiverSubscription.countDocuments();
  const subscriptionNumber = `SUB-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(count + 1).padStart(3, '0')}`;

  const sub = await CaregiverSubscription.create({
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
    emergencyContact: data.emergencyContact,
    carePlanNotes: data.carePlanNotes,
    isDemo: false,
  });

  if (actorUser) {
    await logAdminAction({
      action: 'CAREGIVER_SUBSCRIPTION_ACTIVATED',
      category: 'order_fulfillment' as any,
      actorId: actorUser._id.toString(),
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      targetType: 'CAREGIVER_SUBSCRIPTION',
      targetId: sub.subscriptionNumber,
      details: {
        planTitle: plan.title,
        patientName: patient.fullName,
        visitsIncluded: visits,
      },
      severity: 'info',
    });
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
  const sub = await CaregiverSubscription.findById(subscriptionId);
  if (!sub) {
    throw new AppError('Subscription not found', 404);
  }

  if (sub.status === 'cancelled') {
    throw new AppError('Subscription is already cancelled', 400);
  }

  sub.status = 'cancelled';
  sub.carePlanNotes = sub.carePlanNotes ? `${sub.carePlanNotes} | Cancelled: ${reason}` : `Cancelled: ${reason}`;
  await sub.save();

  if (actorUser) {
    await logAdminAction({
      action: 'CAREGIVER_SUBSCRIPTION_CANCELLED',
      category: 'order_fulfillment' as any,
      actorId: actorUser._id.toString(),
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      targetType: 'CAREGIVER_SUBSCRIPTION',
      targetId: sub.subscriptionNumber,
      details: {
        reason,
        remainingVisits: sub.visitsRemaining,
      },
      severity: 'warning',
    });
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
  const sub = await CaregiverSubscription.findById(subscriptionId);
  if (!sub) {
    throw new AppError('Subscription not found', 404);
  }

  if (sub.status === 'cancelled') {
    throw new AppError('Cannot record visit: Subscription is cancelled', 400);
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

  sub.visitsCompleted += 1;
  sub.visitsRemaining -= 1;

  if (visitIdempotencyKey) {
    sub.carePlanNotes = sub.carePlanNotes ? `${sub.carePlanNotes} [KEY:${visitIdempotencyKey}]` : `[KEY:${visitIdempotencyKey}]`;
  }

  if (sub.visitsRemaining === 0) {
    sub.status = 'completed';
  }

  await sub.save();

  if (actorUser) {
    await logAdminAction({
      action: 'SUBSCRIPTION_VISIT_RECORDED',
      category: 'order_fulfillment' as any,
      actorId: actorUser._id.toString(),
      actorName: actorUser.fullName,
      actorRole: actorUser.role,
      targetType: 'CAREGIVER_SUBSCRIPTION',
      targetId: sub.subscriptionNumber,
      details: {
        visitsCompleted: sub.visitsCompleted,
        visitsRemaining: sub.visitsRemaining,
        notes: visitNotes,
      },
      severity: 'info',
    });
  }

  return sub;
};
