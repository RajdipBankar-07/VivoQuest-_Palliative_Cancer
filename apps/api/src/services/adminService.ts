import mongoose from 'mongoose';
import { User, IUser, UserRole } from '../models/User.js';
import { HealthcareProfessionalProfile } from '../models/HealthcareProfessionalProfile.js';
import { ProfessionalCredentials, IProfessionalCredentials } from '../models/ProfessionalCredentials.js';
import { HospitalProfile, IHospitalProfile } from '../models/HospitalProfile.js';
import { HospitalReferral } from '../models/HospitalReferral.js';
import { Booking } from '../models/Booking.js';
import { Appointment } from '../models/Appointment.js';
import { HealthcareService } from '../models/HealthcareService.js';
import { AuditLog, IAuditLog, AuditLogCategory, AuditLogSeverity } from '../models/AuditLog.js';
import { SupportTicket, ISupportTicket } from '../models/SupportTicket.js';
import { ProductOrder, IProductOrder, OrderStatus } from '../models/ProductOrder.js';
import { MedicalProduct } from '../models/MedicalProduct.js';
import { Supplier } from '../models/Supplier.js';
import { SupplierPurchaseOrder } from '../models/SupplierPurchaseOrder.js';
import { CaregiverPlan } from '../models/CaregiverPlan.js';
import { CaregiverSubscription } from '../models/CaregiverSubscription.js';
import { VisitRescheduleRequest } from '../models/VisitRescheduleRequest.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { FieldVisit } from '../models/FieldVisit.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashPassword } from './authService.js';
import { seedServicesIfEmpty } from './serviceCatalogService.js';
import { seedHospitalDemoData } from './hospitalReferralService.js';
import { seedMedicalProductsIfEmpty } from './productCatalogService.js';
import { seedSupplierDemoData } from './supplierService.js';
import { seedCaregiverPlansDemoData } from './caregiverPlanService.js';

export interface AuditLogDTO {
  action: string;
  category: AuditLogCategory;
  actorId?: string;
  actorName: string;
  actorRole: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  severity?: AuditLogSeverity;
  ipAddress?: string;
}

/**
 * Log sensitive administrative or platform governance action into immutable AuditLog collection.
 */
export const logAdminAction = async (dto: AuditLogDTO): Promise<IAuditLog> => {
  return AuditLog.create({
    action: dto.action,
    category: dto.category,
    actorId: dto.actorId && mongoose.Types.ObjectId.isValid(dto.actorId)
      ? new mongoose.Types.ObjectId(dto.actorId)
      : undefined,
    actorName: dto.actorName,
    actorRole: dto.actorRole,
    targetType: dto.targetType,
    targetId: dto.targetId,
    details: dto.details || {},
    severity: dto.severity || 'info',
    ipAddress: dto.ipAddress,
    timestamp: new Date(),
  });
};

/**
 * Seed demonstration accounts for Admin and Super-Admin, credentials, support tickets, and audit logs.
 */
export const seedAdminDemoData = async () => {
  try {
    await seedServicesIfEmpty();
    await seedHospitalDemoData();
    await seedSupplierDemoData();
    await seedCaregiverPlansDemoData();

    // 1. Seed Super Admin: Director of Platform Governance
    const superAdminPhone = '9899000001';
    let superAdmin = await User.findOne({ phone: superAdminPhone });
    if (!superAdmin) {
      const passwordHash = await hashPassword('SuperAdmin#2026');
      superAdmin = await User.create({
        fullName: 'Super Admin Director',
        phone: superAdminPhone,
        email: 'superadmin@vivoquest.in',
        role: 'super_admin',
        passwordHash,
        isPhoneVerified: true,
        isEmailVerified: true,
        status: 'active',
        dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
      });
      console.log('[Seed] Super-Admin account initialized (+91 98990 00001).');
    }

    // 2. Seed Operations Admin: Head of Clinical Operations
    const adminPhone = '9899009900';
    let opsAdmin = await User.findOne({ phone: adminPhone });
    if (!opsAdmin) {
      const passwordHash = await hashPassword('Admin#2026');
      opsAdmin = await User.create({
        fullName: 'Operations Admin Lead',
        phone: adminPhone,
        email: 'ops.lead@vivoquest.in',
        role: 'admin',
        passwordHash,
        isPhoneVerified: true,
        isEmailVerified: true,
        status: 'active',
        dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
      });
      console.log('[Seed] Admin account initialized (+91 98990 09900).');
    }

    // Ensure at least one HealthcareProfessionalProfile exists with a valid linked user
    const validUserIds = await User.distinct('_id');
    await HealthcareProfessionalProfile.deleteMany({ userId: { $nin: validUserIds } });

    let doctorProfile = await HealthcareProfessionalProfile.findOne();
    if (!doctorProfile) {
      let docUser = await User.findOne({ phone: '9820099887' });
      if (!docUser) {
        docUser = await User.create({
          fullName: 'Dr. Ramesh Iyer',
          phone: '9820099887',
          email: 'ramesh.iyer@example.com',
          role: 'professional',
          passwordHash: '$2a$10$EFiLRGZLOGPDyjV9YcuOx.yo1E5TxdiMW5zRrJOIocWxgTkYDGg06', // Password123!
          isPhoneVerified: true,
          dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
        });
      }
      doctorProfile = await HealthcareProfessionalProfile.create({
        userId: docUser._id,
        title: 'Dr.',
        professionType: 'physician',
        specializations: ['Neurology', 'Stroke Rehabilitation'],
        registrationNumber: 'MMC-2015-08129',
        registrationCouncil: 'Maharashtra Medical Council',
        yearsOfExperience: 11,
        serviceClusters: ['Pune Central', 'Kothrud'],
        verificationStatus: 'pending_review',
      });
    }

    // 3. Seed Professional Credentials with explicit states (pending, approved, rejected, expired)
    const existingCreds = await ProfessionalCredentials.countDocuments();
    if (existingCreds === 0 && doctorProfile) {

      const mockFileId = new mongoose.Types.ObjectId();

      // Credential 1: Pending Verification
      await ProfessionalCredentials.create({
        professionalId: doctorProfile._id,
        documentType: 'medical_council_registration',
        documentNumber: 'MMC-2015-08129',
        issuingAuthority: 'Maharashtra Medical Council (MMC)',
        issueDate: new Date('2015-08-15'),
        expiryDate: new Date('2030-08-15'),
        uploadedFileId: mockFileId,
        verificationStatus: 'pending',
      });

      // Credential 2: Approved / Verified
      await ProfessionalCredentials.create({
        professionalId: doctorProfile._id,
        documentType: 'degree_certificate',
        documentNumber: 'MBBS-MUHS-2014-9912',
        issuingAuthority: 'Maharashtra University of Health Sciences',
        issueDate: new Date('2014-06-20'),
        uploadedFileId: mockFileId,
        verificationStatus: 'approved',
        verifiedAt: new Date('2026-09-01'),
        verifiedBy: opsAdmin._id,
        reviewNotes: 'Verified against MUHS degree registry. Sealed copy verified.',
      });

      // Credential 3: Rejected
      await ProfessionalCredentials.create({
        professionalId: doctorProfile._id,
        documentType: 'identity_proof_aadhaar_pan',
        documentNumber: 'AADHAAR-XXXX-XXXX-9911',
        issuingAuthority: 'UIDAI',
        uploadedFileId: mockFileId,
        verificationStatus: 'rejected',
        verifiedAt: new Date('2026-09-05'),
        verifiedBy: opsAdmin._id,
        rejectionReason: 'Document image was blurry and unreadable; name did not match Medical Council registration.',
      });

      // Credential 4: Expired
      await ProfessionalCredentials.create({
        professionalId: doctorProfile._id,
        documentType: 'clinical_reference',
        documentNumber: 'REF-HOSP-2021-001',
        issuingAuthority: 'Ruby Hall Clinic Clinical Committee',
        issueDate: new Date('2021-01-10'),
        expiryDate: new Date('2026-01-10'), // Expired earlier this year
        uploadedFileId: mockFileId,
        verificationStatus: 'expired',
        reviewNotes: 'Clinical affiliation reference has expired. Renewal requested from hospital medical superintendent.',
      });

      console.log('[Seed] Demonstration credentials initialized across pending, approved, rejected, and expired states.');
    }

    // 4. Seed Support Tickets & Escalations
    const existingTickets = await SupportTicket.countDocuments();
    if (existingTickets === 0) {
      await SupportTicket.create([
        {
          ticketNumber: 'VQ-TKT-202610-001',
          title: 'Oxygen Concentrator Flow Issue - Emergency Delivery Needed',
          category: 'clinical_escalation',
          priority: 'critical',
          status: 'escalated',
          isEscalatedToSuperAdmin: true,
          reportedBy: {
            name: 'Sister Margaret (Ruby Hall Liaison)',
            phone: '9822011112',
            role: 'hospital',
          },
          description: 'Patient Arvind Joshi (Kothrud) reports 5 LPM concentrator warning beeps. Backup cylinder requested immediately.',
          resolutionNotes: 'Depot dispatched technician with replacement 10 LPM Philips Respironics unit.',
          assignedTo: 'Clinical Operations Lead',
          isDemo: true,
        },
        {
          ticketNumber: 'VQ-TKT-202610-002',
          title: 'Booking Reschedule Request - Delayed Patient Discharge',
          category: 'booking_exception',
          priority: 'medium',
          status: 'open',
          isEscalatedToSuperAdmin: false,
          reportedBy: {
            name: 'Sunita Deshpande (Caregiver)',
            phone: '9822154321',
            role: 'caregiver',
          },
          description: 'Patient hospital discharge delayed by 24 hours. Requesting home nurse visit date adjustment to tomorrow morning.',
          assignedTo: 'Dispatch Coordinator',
          isDemo: true,
        },
        {
          ticketNumber: 'VQ-TKT-202610-003',
          title: 'Hospital Account Access Reconciliation - Sahyadri Deccan',
          category: 'hospital_issue',
          priority: 'low',
          status: 'resolved',
          isEscalatedToSuperAdmin: false,
          reportedBy: {
            name: 'Dr. Ananya Kulkarni',
            phone: '9822022223',
            role: 'hospital',
          },
          description: 'Secondary discharge coordinator email needs to be linked to Sahyadri Super Speciality profile.',
          resolutionNotes: 'Updated authorizedStaff array with new discharge coordinator credentials.',
          resolvedBy: {
            name: 'Operations Admin Lead',
            role: 'admin',
            userId: opsAdmin._id,
            resolvedAt: new Date(),
          },
          isDemo: true,
        },
      ]);
      console.log('[Seed] Demonstration support tickets & escalated cases initialized.');
    }

    // 5. Seed Initial Audit Log Events
    const existingAudit = await AuditLog.countDocuments();
    if (existingAudit === 0) {
      await AuditLog.create([
        {
          action: 'platform_security_initialized',
          category: 'security_governance',
          actorName: 'Super Admin Director',
          actorRole: 'super_admin',
          targetType: 'system',
          details: { message: 'Security governance rules and tenant isolation guardrails verified.' },
          severity: 'info',
        },
        {
          action: 'credential_reviewed',
          category: 'credential_review',
          actorName: 'Operations Admin Lead',
          actorRole: 'admin',
          targetType: 'credential',
          targetId: 'MBBS-MUHS-2014-9912',
          details: { status: 'approved', notes: 'Degree certificate verified.' },
          severity: 'info',
        },
        {
          action: 'hospital_onboarded',
          category: 'hospital_management',
          actorName: 'Operations Admin Lead',
          actorRole: 'admin',
          targetType: 'hospital',
          targetId: 'Ruby Hall Clinic',
          details: { accreditations: ['NABH', 'NABL'] },
          severity: 'info',
        },
      ]);
    }
  } catch (err: any) {
    console.warn('[Seed] Admin demo seeding notice:', err.message);
  }
};

/**
 * -----------------------------------------------------------------------------
 * ADMIN OPERATIONS (Allowed for 'admin' and 'super_admin')
 * -----------------------------------------------------------------------------
 */

/**
 * Retrieve comprehensive administrative dashboard overview.
 */
export const getAdminDashboardOverview = async () => {
  await seedAdminDemoData();

  const [
    totalUsers,
    patientCount,
    professionalCount,
    hospitalCount,
    adminCount,
    totalBookings,
    totalAppointments,
    totalReferrals,
    pendingCredentialsCount,
    activeHospitalsCount,
    openTicketsCount,
    recentAuditLogs,
    activeServicesCount,
    totalProductOrders,
    supplierCount,
    activeSubscriptionsCount,
    pendingRescheduleCount,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: { $in: ['patient', 'caregiver'] } }),
    User.countDocuments({ role: 'professional' }),
    User.countDocuments({ role: 'hospital' }),
    User.countDocuments({ role: { $in: ['admin', 'super_admin'] } }),
    Booking.countDocuments(),
    Appointment.countDocuments(),
    HospitalReferral.countDocuments(),
    ProfessionalCredentials.countDocuments({ verificationStatus: 'pending' }),
    HospitalProfile.countDocuments({ isActive: true }),
    SupportTicket.countDocuments({ status: { $in: ['open', 'investigating', 'escalated'] } }),
    AuditLog.find().sort({ timestamp: -1 }).limit(8).lean(),
    HealthcareService.countDocuments({ isActive: true }),
    ProductOrder.countDocuments(),
    Supplier.countDocuments(),
    CaregiverSubscription.countDocuments({ status: 'active' }),
    VisitRescheduleRequest.countDocuments({ status: 'pending' }),
  ]);

  const overviewMetrics = {
    totalUsers,
    patientCount,
    professionalCount,
    hospitalCount,
    adminCount,
    totalBookings,
    totalAppointments,
    totalReferrals,
    pendingCredentialsCount,
    activeHospitalsCount,
    openTicketsCount,
    activeServicesCount,
    totalProductOrders,
    supplierCount,
    activeSubscriptionsCount,
    pendingRescheduleCount,
  };

  return {
    ...overviewMetrics,
    overview: overviewMetrics,
    recentAuditLogs: recentAuditLogs.map((log: any) => ({
      id: log._id.toString(),
      action: log.action,
      category: log.category,
      actorName: log.actorName,
      actorRole: log.actorRole,
      targetType: log.targetType,
      targetId: log.targetId,
      severity: log.severity,
      timestamp: log.timestamp,
    })),
  };
};

// -----------------------------------------------------------------------------
// Search & Phone Query Normalization Helpers
// -----------------------------------------------------------------------------

export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const extractPhoneSearchVariants = (rawInput: string): string[] => {
  const digits = rawInput.replace(/\D/g, '');
  if (!digits || digits.length < 3) return [];
  const variants = new Set<string>([digits]);
  if (digits.length === 12 && digits.startsWith('91')) {
    variants.add(digits.slice(2)); // 10-digit without country code
  } else if (digits.length === 11 && digits.startsWith('0')) {
    variants.add(digits.slice(1)); // 10-digit without leading 0
  } else if (digits.length === 10) {
    variants.add(`+91${digits}`);
    variants.add(`+91 ${digits}`);
    variants.add(`91${digits}`);
  }
  return Array.from(variants);
};

/**
 * List platform accounts (patients, professionals, hospitals, admins) with search and filters.
 */
export const listPlatformUsers = async (filters: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  await seedAdminDemoData();

  const query: any = {};
  if (filters.role && filters.role !== 'all') {
    if (filters.role === 'hospital_staff') {
      query.role = 'hospital';
    } else {
      query.role = filters.role;
    }
  }
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }
  if (filters.search && filters.search.trim()) {
    const rawSearch = filters.search.trim();
    const searchRegex = new RegExp(escapeRegex(rawSearch), 'i');
    const orConditions: any[] = [
      { fullName: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
    ];

    if (mongoose.Types.ObjectId.isValid(rawSearch)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(rawSearch) });
    }

    const phoneVariants = extractPhoneSearchVariants(rawSearch);
    for (const pv of phoneVariants) {
      orConditions.push({ phone: new RegExp(escapeRegex(pv), 'i') });
    }

    query.$or = orConditions;
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(query),
  ]);

  // Privacy protection: Exclude password hashes (handled by schema) and format cleanly
  const sanitized = users.map((u: any) => ({
    id: u._id.toString(),
    _id: u._id.toString(),
    fullName: u.fullName,
    phone: u.phone,
    phoneMasked: `+91 ******${u.phone.slice(-4)}`,
    email: u.email,
    role: u.role,
    status: u.status,
    isPhoneVerified: u.isPhoneVerified,
    isEmailVerified: u.isEmailVerified,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }));

  return {
    users: sanitized,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update user account status (e.g. active, suspended, pending_verification) with audit log.
 */
export const updateUserStatus = async (
  userId: string,
  newStatus: 'active' | 'suspended' | 'pending_verification',
  actorUser: IUser
) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user ID', 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent regular admin from suspending super_admin
  if (user.role === 'super_admin' && actorUser.role !== 'super_admin') {
    throw new AppError('Forbidden: Only a Super Admin can modify a Super Admin account.', 403);
  }

  const previousStatus = user.status;
  user.status = newStatus;
  await user.save();

  await logAdminAction({
    action: 'user_status_changed',
    category: 'user_management',
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'user',
    targetId: user._id.toString(),
    details: {
      userFullName: user.fullName,
      phone: `******${user.phone.slice(-4)}`,
      previousStatus,
      newStatus,
    },
    severity: newStatus === 'suspended' ? 'warning' : 'info',
  });

  return {
    id: user._id.toString(),
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
  };
};

/**
 * Get comprehensive user profile details by ID for administrative inspection
 */
export const getUserDetails = async (userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user ID', 400);
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const baseUser = {
    id: user._id.toString(),
    _id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    isPhoneVerified: user.isPhoneVerified,
    isEmailVerified: user.isEmailVerified,
    dpdpConsent: user.dpdpConsent,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };

  let patientProfile = null;
  let professionalProfile = null;
  let subscriptions: any[] = [];
  let credentials: any[] = [];
  let visitsCount = 0;

  if (user.role === 'patient') {
    patientProfile = await PatientProfile.findOne({ userId: user._id }).lean();
    subscriptions = await CaregiverSubscription.find({ patientId: user._id }).lean();
    visitsCount = await FieldVisit.countDocuments({ patientId: user._id });
  } else if (['caregiver', 'professional'].includes(user.role)) {
    professionalProfile = await HealthcareProfessionalProfile.findOne({ userId: user._id }).lean();
    credentials = await ProfessionalCredentials.find({
      $or: [
        { userId: user._id },
        ...(professionalProfile ? [{ professionalId: professionalProfile._id }] : [])
      ]
    }).lean();
    visitsCount = await FieldVisit.countDocuments({ providerId: user._id });
  }

  const auditHistory = await AuditLog.find({ targetId: user._id.toString() })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return {
    user: baseUser,
    patientProfile,
    professionalProfile,
    subscriptions,
    credentials,
    visitsCount,
    auditHistory,
  };
};

/**
 * Permanently delete a user account and reclaim database storage space.
 * Enforces safeguards against deleting self or super_admins.
 */
export const deleteUserPermanently = async (userId: string, actorUser: IUser) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user ID', 400);
  }

  if (actorUser._id.toString() === userId) {
    throw new AppError('Forbidden: You cannot delete your own administrator account.', 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent non-super_admin from deleting super_admin
  if (user.role === 'super_admin' && actorUser.role !== 'super_admin') {
    throw new AppError('Forbidden: Only a Super Admin can delete a Super Admin account.', 403);
  }

  const targetRole = user.role;
  const targetName = user.fullName;
  const targetPhone = user.phone;

  // 1. Delete associated profiles and records to prevent orphaned documents
  const profProfiles = await HealthcareProfessionalProfile.find({ userId: user._id }).select('_id');
  const profProfileIds = profProfiles.map((p) => p._id);

  const [patientProfileResult, profProfileResult, credsResult] = await Promise.all([
    PatientProfile.deleteMany({ userId: user._id }),
    HealthcareProfessionalProfile.deleteMany({ userId: user._id }),
    ProfessionalCredentials.deleteMany({
      $or: [
        { userId: user._id },
        { professionalId: user._id },
        { professionalId: { $in: profProfileIds } },
      ],
    }),
  ]);

  // 2. Delete primary user record
  await User.findByIdAndDelete(userId);

  // 3. Log sensitive deletion audit record
  await logAdminAction({
    action: 'user_deleted_permanently',
    category: 'user_management',
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'user',
    targetId: userId,
    details: {
      deletedUserFullName: targetName,
      deletedUserPhone: `******${targetPhone.slice(-4)}`,
      deletedUserRole: targetRole,
      patientProfilesRemoved: patientProfileResult.deletedCount,
      professionalProfilesRemoved: profProfileResult.deletedCount,
      credentialsRemoved: credsResult.deletedCount,
      reason: 'Administrative permanent storage purge and account deletion',
    },
    severity: 'warning',
  });

  return {
    success: true,
    message: `User account '${targetName}' (${targetRole}) permanently deleted and storage reclaimed.`,
    deletedUserId: userId,
  };
};

/**
 * List professional credentials pending or completed verification.
 */
export const listProfessionalCredentials = async (filters: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  await seedAdminDemoData();

  const query: any = {};
  if (filters.status && filters.status !== 'all') {
    query.verificationStatus = filters.status;
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [credentials, total] = await Promise.all([
    ProfessionalCredentials.find(query)
      .populate({
        path: 'professionalId',
        select: 'title professionType registrationNumber registrationCouncil serviceClusters',
        populate: {
          path: 'userId',
          select: 'fullName phone email status',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProfessionalCredentials.countDocuments(query),
  ]);

  return {
    credentials: credentials.map((c: any) => ({
      id: c._id.toString(),
      documentType: c.documentType,
      documentNumber: c.documentNumber,
      issuingAuthority: c.issuingAuthority,
      issueDate: c.issueDate,
      expiryDate: c.expiryDate,
      verificationStatus: c.verificationStatus,
      verifiedAt: c.verifiedAt,
      rejectionReason: c.rejectionReason,
      reviewNotes: c.reviewNotes,
      professional: c.professionalId
        ? {
            title: c.professionalId.title,
            fullName: c.professionalId.userId?.fullName || 'Clinician',
            phoneMasked: c.professionalId.userId?.phone
              ? `+91 ******${c.professionalId.userId.phone.slice(-4)}`
              : undefined,
            professionType: c.professionalId.professionType,
            registrationNumber: c.professionalId.registrationNumber,
            registrationCouncil: c.professionalId.registrationCouncil,
            clusters: c.professionalId.serviceClusters,
          }
        : null,
      createdAt: c.createdAt,
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Review a professional credential (approve, reject, or mark expired) with audit log.
 */
export const reviewProfessionalCredential = async (
  credentialId: string,
  newStatus: 'pending' | 'approved' | 'rejected' | 'expired' | 'verified',
  actorUser: IUser,
  dto: {
    notes?: string;
    reason?: string;
    expiryDate?: string;
  }
) => {
  if (!mongoose.Types.ObjectId.isValid(credentialId)) {
    throw new AppError('Invalid credential ID format', 400);
  }

  const credential = await ProfessionalCredentials.findById(credentialId).populate('professionalId');
  if (!credential) {
    throw new AppError('Professional credential record not found', 404);
  }

  const validStatuses = ['pending', 'approved', 'rejected', 'expired', 'verified'];
  if (!validStatuses.includes(newStatus)) {
    throw new AppError(`Invalid status '${newStatus}'. Allowed: [${validStatuses.join(', ')}]`, 400);
  }

  if (newStatus === 'rejected' && (!dto.reason || !dto.reason.trim())) {
    throw new AppError('A valid reason is required when rejecting professional credentials', 400);
  }

  credential.verificationStatus = newStatus;
  credential.verifiedAt = new Date();
  credential.verifiedBy = actorUser._id;
  if (dto.notes) credential.reviewNotes = dto.notes.trim();
  if (dto.reason) credential.rejectionReason = dto.reason.trim();
  if (dto.expiryDate) credential.expiryDate = new Date(dto.expiryDate);

  await credential.save();

  // If approved or verified, update the professional's overall profile verification status
  if (['approved', 'verified'].includes(newStatus) && credential.professionalId) {
    const profProfile = await HealthcareProfessionalProfile.findById(credential.professionalId);
    if (profProfile) {
      profProfile.verificationStatus = 'verified';
      profProfile.isActiveForDispatch = true;
      await profProfile.save();
    }
  }

  await logAdminAction({
    action: 'credential_reviewed',
    category: 'credential_review',
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'credential',
    targetId: credential._id.toString(),
    details: {
      documentType: credential.documentType,
      documentNumber: credential.documentNumber,
      newStatus,
      reviewNotes: dto.notes,
      rejectionReason: dto.reason,
    },
    severity: newStatus === 'rejected' ? 'warning' : 'info',
  });

  return credential;
};

/**
 * List hospital organizations with referral counts.
 */
export const listHospitalOrganizations = async (filters: { search?: string; status?: string }) => {
  await seedAdminDemoData();

  const query: any = {};
  if (filters.status && filters.status !== 'all') {
    query.isActive = filters.status === 'active';
  }
  if (filters.search && filters.search.trim()) {
    const searchRegex = new RegExp(escapeRegex(filters.search.trim()), 'i');
    query.$or = [{ hospitalName: searchRegex }, { registrationNumber: searchRegex }, { cluster: searchRegex }];
  }

  const hospitals = await HospitalProfile.find(query).sort({ createdAt: -1 }).lean();

  const enriched = await Promise.all(
    hospitals.map(async (h: any) => {
      const referralCount = await HospitalReferral.countDocuments({ hospitalId: h.userId });
      return {
        id: h._id.toString(),
        userId: h.userId.toString(),
        hospitalName: h.hospitalName,
        registrationNumber: h.registrationNumber,
        tier: h.tier,
        cluster: h.cluster,
        city: h.city,
        contactPhone: h.contactPhone,
        contactEmail: h.contactEmail,
        accreditations: h.accreditations,
        departments: h.departments,
        dischargeCoordinator: h.dischargeCoordinator,
        isActive: h.isActive,
        isDemo: h.isDemo,
        referralCount,
        createdAt: h.createdAt,
      };
    })
  );

  return enriched;
};

/**
 * Onboard a new hospital partner organization.
 */
export const onboardHospitalOrganization = async (
  data: {
    hospitalName: string;
    registrationNumber: string;
    tier?: string;
    cluster: string;
    city?: string;
    address: string;
    pincode: string;
    contactPhone: string;
    contactEmail: string;
    accreditations?: string[];
    departments?: string[];
    dischargeCoordinator: {
      name: string;
      phone: string;
      email?: string;
      designation?: string;
    };
  },
  actorUser: IUser
) => {
  if (!data.hospitalName?.trim() || !data.registrationNumber?.trim() || !data.contactPhone?.trim()) {
    throw new AppError('Hospital name, registration number, and contact phone are required', 400);
  }

  const cleanPhone = data.contactPhone.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new AppError('Hospital contact phone must be a valid 10-digit Indian number', 400);
  }

  // Check duplicate phone or registration number
  const existingUser = await User.findOne({ phone: cleanPhone });
  if (existingUser) {
    throw new AppError(`An account with phone number +91 ${cleanPhone} already exists`, 409);
  }

  const existingReg = await HospitalProfile.findOne({ registrationNumber: data.registrationNumber.trim() });
  if (existingReg) {
    throw new AppError(`A hospital with registration number '${data.registrationNumber}' already exists`, 409);
  }

  // Create linked hospital User account
  const defaultPassword = `Hospital#${cleanPhone.slice(-4)}@2026`;
  const passwordHash = await hashPassword(defaultPassword);

  const hospitalUser = await User.create({
    fullName: data.hospitalName.trim(),
    phone: cleanPhone,
    email: data.contactEmail?.trim().toLowerCase(),
    role: 'hospital',
    passwordHash,
    isPhoneVerified: true,
    isEmailVerified: true,
    status: 'active',
    dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
  });

  // Create HospitalProfile
  const profile = await HospitalProfile.create({
    userId: hospitalUser._id,
    hospitalName: data.hospitalName.trim(),
    registrationNumber: data.registrationNumber.trim(),
    tier: (data.tier as any) || 'tertiary',
    cluster: data.cluster.trim(),
    city: data.city || 'Pune',
    state: 'Maharashtra',
    address: data.address.trim(),
    pincode: data.pincode.trim(),
    contactPhone: cleanPhone,
    contactEmail: data.contactEmail?.trim().toLowerCase() || 'hospital@vivoquest.in',
    accreditations: data.accreditations || ['NABH'],
    departments: data.departments || ['Oncology', 'Cardiology', 'Palliative Care'],
    dischargeCoordinator: data.dischargeCoordinator,
    authorizedStaff: [
      {
        name: data.dischargeCoordinator.name,
        phone: data.dischargeCoordinator.phone,
        email: data.dischargeCoordinator.email,
        department: 'Discharge Planning',
        designation: data.dischargeCoordinator.designation || 'Liaison Lead',
        isPrimaryCoordinator: true,
      },
    ],
    isActive: true,
    isDemo: false,
  });

  await logAdminAction({
    action: 'hospital_onboarded',
    category: 'hospital_management',
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'hospital',
    targetId: profile._id.toString(),
    details: {
      hospitalName: profile.hospitalName,
      registrationNumber: profile.registrationNumber,
      cluster: profile.cluster,
    },
    severity: 'info',
  });

  return profile;
};

/**
 * Toggle hospital organization status (active / suspended).
 */
export const updateHospitalOrganizationStatus = async (
  hospitalId: string,
  isActive: boolean,
  actorUser: IUser
) => {
  if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
    throw new AppError('Invalid hospital ID', 400);
  }

  const profile = await HospitalProfile.findById(hospitalId);
  if (!profile) {
    throw new AppError('Hospital profile not found', 404);
  }

  profile.isActive = isActive;
  await profile.save();

  // Also update linked User account
  await User.findByIdAndUpdate(profile.userId, {
    status: isActive ? 'active' : 'suspended',
  });

  await logAdminAction({
    action: 'hospital_status_changed',
    category: 'hospital_management',
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'hospital',
    targetId: profile._id.toString(),
    details: {
      hospitalName: profile.hospitalName,
      isActive,
    },
    severity: isActive ? 'info' : 'warning',
  });

  return profile;
};

/**
 * List catalog services and toggle availability.
 */
export const listCatalogServicesAdmin = async () => {
  await seedServicesIfEmpty();
  return HealthcareService.find().sort({ sortOrder: 1, createdAt: 1 });
};

export const updateServiceAvailabilityAdmin = async (
  serviceId: string,
  isActive: boolean,
  actorUser: IUser
) => {
  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    throw new AppError('Invalid service ID', 400);
  }

  const service = await HealthcareService.findById(serviceId);
  if (!service) {
    throw new AppError('Healthcare service not found', 404);
  }

  service.isActive = isActive;
  await service.save();

  await logAdminAction({
    action: 'service_availability_toggled',
    category: 'service_catalog',
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'service',
    targetId: service._id.toString(),
    details: {
      serviceCode: service.serviceCode,
      title: service.title,
      isActive,
    },
    severity: 'info',
  });

  return service;
};

/**
 * List booking and referral exceptions requiring operational intervention.
 */
export const listOperationalExceptions = async () => {
  await seedAdminDemoData();

  const [bookingExceptions, referralExceptions] = await Promise.all([
    Booking.find({
      status: { $in: ['requested', 'cancelled'] },
    })
      .populate('serviceId')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
    HospitalReferral.find({
      status: { $in: ['submitted', 'rejected'] },
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
  ]);

  return {
    bookingExceptions: bookingExceptions.map((b: any) => ({
      id: b._id.toString(),
      bookingNumber: b.bookingNumber,
      patientName: b.patientName,
      phoneMasked: `+91 ******${b.phone.slice(-4)}`,
      serviceTitle: b.serviceId?.title || 'Home Care Service',
      status: b.status,
      cluster: b.serviceLocation?.cluster,
      createdAt: b.createdAt,
    })),
    referralExceptions: referralExceptions.map((r: any) => ({
      id: r._id.toString(),
      referralNumber: r.referralNumber,
      hospitalName: r.hospitalName,
      patientName: r.patientDetails.fullName,
      priority: r.priority,
      status: r.status,
      cancellationReason: r.cancellationOrRejectionReason,
      createdAt: r.createdAt,
    })),
  };
};

/**
 * List support tickets.
 */
export const listSupportTickets = async (filters: { status?: string; priority?: string }) => {
  await seedAdminDemoData();

  const query: any = {};
  if (filters.status && filters.status !== 'all') query.status = filters.status;
  if (filters.priority && filters.priority !== 'all') query.priority = filters.priority;

  return SupportTicket.find(query).sort({ priority: -1, createdAt: -1 });
};

/**
 * Update support ticket status / resolution notes.
 */
export const updateSupportTicketAdmin = async (
  ticketId: string,
  update: {
    status?: any;
    resolutionNotes?: string;
    isEscalatedToSuperAdmin?: boolean;
  },
  actorUser: IUser
) => {
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw new AppError('Invalid ticket ID', 400);
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Support ticket not found', 404);
  }

  if (update.status) ticket.status = update.status;
  if (update.resolutionNotes) ticket.resolutionNotes = update.resolutionNotes.trim();
  if (typeof update.isEscalatedToSuperAdmin === 'boolean') {
    ticket.isEscalatedToSuperAdmin = update.isEscalatedToSuperAdmin;
  }

  if (['resolved', 'closed'].includes(ticket.status)) {
    ticket.resolvedBy = {
      name: actorUser.fullName,
      role: actorUser.role,
      userId: actorUser._id,
      resolvedAt: new Date(),
    };
  }

  await ticket.save();

  await logAdminAction({
    action: 'support_ticket_updated',
    category: 'system',
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'support_ticket',
    targetId: ticket._id.toString(),
    details: {
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      isEscalatedToSuperAdmin: ticket.isEscalatedToSuperAdmin,
    },
    severity: ticket.isEscalatedToSuperAdmin ? 'warning' : 'info',
  });

  return ticket;
};

/**
 * List platform audit logs with category and severity filters.
 */
export const listAuditLogs = async (filters: {
  category?: string;
  severity?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  await seedAdminDemoData();

  const query: any = {};
  if (filters.category && filters.category !== 'all') query.category = filters.category;
  if (filters.severity && filters.severity !== 'all') query.severity = filters.severity;
  if (filters.search && filters.search.trim()) {
    const searchRegex = new RegExp(escapeRegex(filters.search.trim()), 'i');
    query.$or = [{ action: searchRegex }, { actorName: searchRegex }, { targetType: searchRegex }];
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 25));
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs: logs.map((l: any) => ({
      id: l._id.toString(),
      action: l.action,
      category: l.category,
      actorName: l.actorName,
      actorRole: l.actorRole,
      targetType: l.targetType,
      targetId: l.targetId,
      details: l.details,
      severity: l.severity,
      timestamp: l.timestamp,
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * -----------------------------------------------------------------------------
 * SUPER-ADMIN OPERATIONS (STRICTLY 'super_admin' ROLE ONLY)
 * -----------------------------------------------------------------------------
 */

/**
 * Platform-wide governance overview.
 */
export const getSuperAdminGovernanceOverview = async () => {
  await seedAdminDemoData();

  const [
    totalUsers,
    totalAdmins,
    totalSuperAdmins,
    auditTotal,
    auditWarnings,
    auditCritical,
    escalatedCasesCount,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'super_admin' }),
    AuditLog.countDocuments(),
    AuditLog.countDocuments({ severity: 'warning' }),
    AuditLog.countDocuments({ severity: 'critical' }),
    SupportTicket.countDocuments({ isEscalatedToSuperAdmin: true, status: { $ne: 'resolved' } }),
  ]);

  return {
    governance: {
      totalUsers,
      totalAdmins,
      totalSuperAdmins,
      auditTotal,
      auditWarnings,
      auditCritical,
      escalatedCasesCount,
      platformStatus: 'nominal_operational',
      uptimeHours: 342,
    },
  };
};

/**
 * List administrative staff accounts.
 */
export const listAdminStaffAccounts = async () => {
  await seedAdminDemoData();
  return User.find({ role: { $in: ['admin', 'super_admin'] } }).sort({ role: 1, createdAt: -1 });
};

/**
 * Create a new privileged administrative account.
 */
export const createAdminAccount = async (
  data: {
    fullName: string;
    phone: string;
    email?: string;
    role: 'admin' | 'super_admin';
    password?: string;
  },
  actorUser: IUser
) => {
  if (!data.fullName?.trim() || !data.phone?.trim()) {
    throw new AppError('Full name and mobile number are required', 400);
  }

  const cleanPhone = data.phone.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new AppError('Mobile number must be a valid 10-digit Indian number', 400);
  }

  if (!['admin', 'super_admin'].includes(data.role)) {
    throw new AppError("Privileged role must be 'admin' or 'super_admin'", 400);
  }

  const existing = await User.findOne({ phone: cleanPhone });
  if (existing) {
    throw new AppError(`An account with phone number +91 ${cleanPhone} already exists`, 409);
  }

  const rawPassword = data.password && data.password.length >= 6
    ? data.password
    : `Privileged#${cleanPhone.slice(-4)}@2026`;
  const passwordHash = await hashPassword(rawPassword);

  const newUser = await User.create({
    fullName: data.fullName.trim(),
    phone: cleanPhone,
    email: data.email?.trim().toLowerCase(),
    role: data.role,
    passwordHash,
    isPhoneVerified: true,
    isEmailVerified: true,
    status: 'active',
    dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
  });

  await logAdminAction({
    action: 'admin_account_created',
    category: 'security_governance',
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'user',
    targetId: newUser._id.toString(),
    details: {
      fullName: newUser.fullName,
      role: newUser.role,
      phone: `******${newUser.phone.slice(-4)}`,
    },
    severity: newUser.role === 'super_admin' ? 'critical' : 'warning',
  });

  return {
    id: newUser._id.toString(),
    fullName: newUser.fullName,
    phone: newUser.phone,
    email: newUser.email,
    role: newUser.role,
    status: newUser.status,
    createdAt: newUser.createdAt,
  };
};

/**
 * Modify user role (e.g. promoting admin to super_admin or demoting).
 */
export const updateAdminRole = async (
  targetUserId: string,
  newRole: UserRole,
  actorUser: IUser
) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new AppError('Invalid target user ID', 400);
  }

  const target = await User.findById(targetUserId);
  if (!target) {
    throw new AppError('Target user not found', 404);
  }

  const previousRole = target.role;
  target.role = newRole;
  await target.save();

  await logAdminAction({
    action: 'admin_role_updated',
    category: 'security_governance',
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'user',
    targetId: target._id.toString(),
    details: {
      targetFullName: target.fullName,
      previousRole,
      newRole,
    },
    severity: 'critical',
  });

  return target;
};

/**
 * Integration telemetry and platform system health probe.
 */
export const getSystemHealthAndIntegrations = async () => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected_healthy',
    2: 'connecting',
    3: 'disconnecting',
  };

  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  let aiHealth = 'offline_deterministic_fallback_active';
  try {
    const res = await fetch(`${AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) aiHealth = 'online_optimal';
  } catch {
    // Expected in test/offline environments
  }

  return {
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      mongodb: {
        status: dbStatusMap[dbState] || 'unknown',
        databaseName: mongoose.connection.name || 'vivoquest_db',
        host: mongoose.connection.host || '127.0.0.1',
      },
      aiCoordinationGateway: {
        status: aiHealth,
        serviceUrl: AI_SERVICE_URL,
        fallbackEngine: 'deterministic_local_synergy_active',
      },
      objectStorage: {
        provider: 'AWS_S3_MOCK_STORAGE',
        bucket: process.env.S3_BUCKET_NAME || 'vivoquest-clinical-documents-dev',
        mode: 'presigned_url_authorized',
      },
      smsGateway: {
        provider: 'DEVELOPMENT_PROTOTYPE_MODE',
        otpPolicy: '6_digit_verified_development_code',
      },
    },
  };
};

/**
 * List escalated operational cases.
 */
export const listSuperAdminEscalations = async () => {
  await seedAdminDemoData();
  return SupportTicket.find({ isEscalatedToSuperAdmin: true }).sort({ createdAt: -1 });
};

// =============================================================================
// STAFF ORDER FULFILLMENT & LIFECYCLE MANAGEMENT
// =============================================================================

const PERMITTED_ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['dispatched', 'cancelled'],
  dispatched: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

/**
 * List product orders with status, payment, and search filters for authorized staff
 */
export const listProductOrdersAdmin = async (filters: {
  status?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  await seedMedicalProductsIfEmpty();

  const query: any = {};

  if (filters.status && filters.status !== 'all') {
    query.orderStatus = filters.status;
  }

  if (filters.paymentStatus && filters.paymentStatus !== 'all') {
    query.paymentStatus = filters.paymentStatus;
  }

  if (filters.search && filters.search.trim()) {
    const rawSearch = filters.search.trim();
    const searchRegex = new RegExp(escapeRegex(rawSearch), 'i');
    const orConditions: any[] = [
      { orderNumber: searchRegex },
      { patientName: searchRegex },
      { patientPhone: searchRegex },
      { 'deliveryAddress.city': searchRegex },
    ];

    const phoneVariants = extractPhoneSearchVariants(rawSearch);
    for (const pv of phoneVariants) {
      orConditions.push({ patientPhone: new RegExp(escapeRegex(pv), 'i') });
    }

    query.$or = orConditions;
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    ProductOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ProductOrder.countDocuments(query),
  ]);

  return {
    orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get detailed product order by ID or order number for staff review
 */
export const getOrderDetailsAdmin = async (orderId: string): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query).lean();
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  return order as unknown as IProductOrder;
};

/**
 * Update order fulfillment status with state-machine transition validation and audit logging
 */
export const updateOrderStatusAdmin = async (
  orderId: string,
  newStatus: OrderStatus,
  trackingMessage: string | undefined,
  location: string | undefined,
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  const currentStatus = order.orderStatus;
  if (currentStatus === newStatus) {
    return order; // No-op idempotent return
  }

  // Validate state-machine transition
  const allowed = PERMITTED_ORDER_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Invalid order status transition from '${currentStatus}' to '${newStatus}'. Permitted transitions: ${
        allowed.length > 0 ? allowed.join(', ') : 'None (Terminal state)'
      }`,
      400
    );
  }

  // If transitioning to cancelled, safely restore stock and release reservation
  if (newStatus === 'cancelled') {
    for (const item of order.items) {
      await MedicalProduct.findByIdAndUpdate(item.productId, {
        $inc: {
          stockQuantity: item.quantity,
          reservedQuantity: -item.quantity,
        },
      });
      await MedicalProduct.findOneAndUpdate(
        { _id: item.productId, 'depots.0': { $exists: true } },
        { $inc: { 'depots.0.inStockCount': item.quantity } }
      );
    }
    order.cancellation = {
      isCancelled: true,
      cancelledAt: new Date(),
      cancelledBy: staffUser.fullName,
      cancellationReason: trackingMessage || 'Cancelled by operations administrator',
      refundStatus: order.paymentStatus === 'paid' ? 'pending' : 'none',
    };
  }

  // If transitioning from placed/confirmed to dispatched/delivered/completed, release reservation
  if (['dispatched', 'delivered', 'completed'].includes(newStatus) && ['placed', 'confirmed'].includes(currentStatus)) {
    for (const item of order.items) {
      await MedicalProduct.findByIdAndUpdate(item.productId, {
        $inc: { reservedQuantity: -item.quantity },
      });
    }
  }

  // If delivered and payment was COD, mark payment as paid
  if (newStatus === 'delivered' && order.paymentMethod === 'cod') {
    order.paymentStatus = 'paid';
  }

  order.orderStatus = newStatus;

  const defaultMessages: Record<OrderStatus, string> = {
    placed: 'Order placed and logged in central fulfillment registry.',
    confirmed: 'Order confirmed by operations team. Items allocated from depot.',
    dispatched: 'Equipment dispatched from regional DME logistics depot.',
    out_for_delivery: 'Out for final delivery to patient home address.',
    delivered: 'Equipment successfully delivered to patient residence.',
    completed: 'Order and closed-loop clinical installation fully completed.',
    cancelled: `Order cancelled by operations staff: ${trackingMessage || 'Staff action'}`,
  };

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: newStatus,
    message: trackingMessage || defaultMessages[newStatus],
    location: location || `${order.deliveryAddress.city} Regional Hub`,
  });

  await order.save();

  // Immutable audit log
  await logAdminAction({
    action: 'UPDATE_ORDER_STATUS',
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'PRODUCT_ORDER',
    targetId: order.orderNumber,
    details: {
      orderId: order._id,
      previousStatus: currentStatus,
      newStatus,
      message: trackingMessage,
    },
    severity: newStatus === 'cancelled' ? 'warning' : 'info',
  });

  return order;
};

/**
 * Assign healthcare specialist for clinical setup and installation
 */
export const assignInstallationSpecialistAdmin = async (
  orderId: string,
  payload: {
    specialistId?: string;
    specialistName: string;
    setupDate?: string;
    setupNotes?: string;
    setupStatus?: 'pending' | 'scheduled' | 'completed';
  },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  order.clinicalSetup.assignedSpecialistName = payload.specialistName;
  if (payload.specialistId && mongoose.Types.ObjectId.isValid(payload.specialistId)) {
    order.clinicalSetup.assignedSpecialistId = new mongoose.Types.ObjectId(payload.specialistId);
  }
  if (payload.setupStatus) {
    order.clinicalSetup.setupStatus = payload.setupStatus;
  }
  if (payload.setupDate) {
    order.clinicalSetup.setupDate = new Date(payload.setupDate);
  }
  if (payload.setupNotes) {
    order.clinicalSetup.setupNotes = payload.setupNotes;
  }

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Clinical setup assigned to ${payload.specialistName}. Status: ${
      order.clinicalSetup.setupStatus
    }. Notes: ${payload.setupNotes || 'Standard installation schedule.'}`,
    location: 'Clinical Operations',
  });

  await order.save();

  await logAdminAction({
    action: 'ASSIGN_CLINICIAN_SETUP',
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'PRODUCT_ORDER',
    targetId: order.orderNumber,
    details: {
      specialistName: payload.specialistName,
      setupStatus: order.clinicalSetup.setupStatus,
      setupDate: order.clinicalSetup.setupDate,
    },
    severity: 'info',
  });

  return order;
};

/**
 * Record custom delivery or installation event
 */
export const addOrderTrackingEventAdmin = async (
  orderId: string,
  payload: {
    status: OrderStatus;
    message: string;
    location?: string;
  },
  staffUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: payload.status || order.orderStatus,
    message: payload.message,
    location: payload.location || `${order.deliveryAddress.city} Depot`,
  });

  await order.save();

  await logAdminAction({
    action: 'RECORD_DELIVERY_EVENT',
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'PRODUCT_ORDER',
    targetId: order.orderNumber,
    details: payload,
    severity: 'info',
  });

  return order;
};

// =============================================================================
// FINANCIAL ACCURACY & REPORTING (CALCULATED ON THE SERVER)
// =============================================================================

/**
 * Authoritative financial overview calculated entirely on the server.
 * Accurately separates customer sales revenue, equipment procurement costs,
 * caregiver payout liabilities, supplier payables, refunds, and gateway fees.
 * Sourcing/procurement cost is NEVER counted as sales revenue.
 */
export const getFinancialSummaryAdmin = async () => {
  await seedAdminDemoData();

  // 1. Customer product sales & equipment procurement cost
  const paidOrders = await ProductOrder.find({
    paymentStatus: { $in: ['paid', 'cod'] },
    orderStatus: { $ne: 'cancelled' },
  }).lean();

  let productSalesRevenue = 0;
  let equipmentProcurementCostFromOrders = 0;
  let onlinePaymentTotal = 0;
  let refundsProcessed = 0;

  for (const order of paidOrders) {
    productSalesRevenue += order.pricing?.totalAmount || 0;
    equipmentProcurementCostFromOrders += order.pricing?.procurementCostTotal || 0;
    if (order.paymentMethod === 'online') {
      onlinePaymentTotal += order.pricing?.totalAmount || 0;
    }
  }

  // Also tally refunds on cancelled / refunded orders
  const refundedOrders = await ProductOrder.find({
    $or: [{ paymentStatus: 'refunded' }, { 'cancellation.refundStatus': 'processed' }],
  }).lean();
  for (const ro of refundedOrders) {
    refundsProcessed += ro.pricing?.refundAmount || ro.pricing?.totalAmount || 0;
  }

  // 2. Caregiver subscriptions revenue & caregiver payout liabilities
  const activeSubs = await CaregiverSubscription.find({
    'pricing.paymentStatus': 'paid',
  }).lean();

  let caregiverSubscriptionRevenue = 0;
  let caregiverPayoutLiabilities = 0;

  for (const sub of activeSubs) {
    caregiverSubscriptionRevenue += sub.pricing?.customerPrice || 0;
    caregiverPayoutLiabilities += sub.pricing?.caregiverPayout || 0;
    onlinePaymentTotal += sub.pricing?.customerPrice || 0;
  }

  // 3. Supplier Purchase Orders (Procurement Cost & Payables)
  const pos = await SupplierPurchaseOrder.find().lean();
  let supplierPayablesPending = 0;
  let supplierPayablesSettled = 0;

  for (const po of pos) {
    supplierPayablesSettled += po.paidAmount || 0;
    const pending = Math.max(0, (po.totalProcurementCost || 0) - (po.paidAmount || 0));
    supplierPayablesPending += pending;
  }

  // Total procurement cost incurred = equipment procurement from direct customer orders + delivered supplier inventory
  const totalProcurementCosts = equipmentProcurementCostFromOrders + supplierPayablesSettled;

  // 4. Gateway Fees: standard 2% on online card/UPI payments
  const paymentGatewayFees = Math.round(onlinePaymentTotal * 0.02);

  // 5. Customer Sales Revenue
  const totalGrossSalesRevenue = productSalesRevenue + caregiverSubscriptionRevenue;

  // 6. Estimated Gross Profit = Gross Sales - Procurement Costs - Caregiver Payouts - Refunds - Gateway Fees
  const estimatedGrossProfit =
    totalGrossSalesRevenue -
    totalProcurementCosts -
    caregiverPayoutLiabilities -
    refundsProcessed -
    paymentGatewayFees;

  return {
    revenue: {
      totalGrossSalesRevenue,
      productSalesRevenue,
      caregiverSubscriptionRevenue,
    },
    costsAndLiabilities: {
      equipmentProcurementCost: totalProcurementCosts,
      caregiverPayoutLiabilities,
      supplierPayablesPending,
      supplierPayablesSettled,
      refundsProcessed,
      paymentGatewayFees,
    },
    profitability: {
      estimatedGrossProfit,
      grossProfitMarginPct:
        totalGrossSalesRevenue > 0
          ? Number(((estimatedGrossProfit / totalGrossSalesRevenue) * 100).toFixed(1))
          : 0,
    },
    settlementBreakdown: {
      onlinePaymentVolume: onlinePaymentTotal,
      paidOrderCount: paidOrders.length,
      activeSubscriptionCount: activeSubs.length,
      supplierPOCount: pos.length,
    },
  };
};

/**
 * Safely process customer return or cancellation refund with state validation and audit log
 */
export const processOrderRefundAdmin = async (
  orderId: string,
  refundAmount: number,
  reason: string,
  actorUser: IUser
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  if (refundAmount <= 0 || refundAmount > order.pricing.totalAmount) {
    throw new AppError(`Refund amount must be between ₹1 and ₹${order.pricing.totalAmount}`, 400);
  }

  order.paymentStatus = 'refunded';
  order.pricing.refundAmount = refundAmount;
  if (!order.cancellation) {
    order.cancellation = {
      isCancelled: true,
      cancelledAt: new Date(),
      cancelledBy: actorUser.fullName,
      cancellationReason: reason,
      refundStatus: 'processed',
    };
  } else {
    order.cancellation.refundStatus = 'processed';
    order.cancellation.cancelledBy = actorUser.fullName;
  }

  const refundId = `RFND-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Refund of ₹${refundAmount} processed successfully (Ref: ${refundId}). Reason: ${reason}`,
    location: 'Finance & Accounts',
  });

  await order.save();

  await logAdminAction({
    action: 'ORDER_REFUND_PROCESSED',
    category: 'order_fulfillment',
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'PRODUCT_ORDER',
    targetId: order.orderNumber,
    details: {
      refundAmount,
      refundId,
      reason,
      patientPhone: order.patientPhone,
    },
    severity: 'warning',
  });

  return order;
};

/**
 * Scan professional credentials and hospital partner registrations for expiry alerts
 */
export const listDocumentExpiryAlertsAdmin = async () => {
  await seedAdminDemoData();

  const now = new Date();
  const sixtyDaysAhead = new Date(Date.now() + 60 * 24 * 3600 * 1000);

  // 1. Professional credentials expiring soon or expired
  const expiringCredentials = await ProfessionalCredentials.find({
    expiryDate: { $lte: sixtyDaysAhead },
  })
    .populate({
      path: 'professionalId',
      select: 'title professionType registrationNumber',
      populate: { path: 'userId', select: 'fullName phone email' },
    })
    .sort({ expiryDate: 1 })
    .lean();

  const credentialAlerts = expiringCredentials.map((c: any) => {
    const isExpired = c.expiryDate && new Date(c.expiryDate) <= now;
    const daysRemaining = c.expiryDate
      ? Math.ceil((new Date(c.expiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24))
      : 0;

    return {
      id: c._id.toString(),
      entityType: 'professional_credential',
      documentType: c.documentType,
      documentNumber: c.documentNumber,
      issuingAuthority: c.issuingAuthority,
      expiryDate: c.expiryDate,
      daysRemaining,
      status: isExpired ? 'expired' : 'expiring_soon',
      professionalName: c.professionalId?.userId?.fullName || 'Clinician',
      professionType: c.professionalId?.professionType || 'physician',
      contactPhone: c.professionalId?.userId?.phone ? `+91 ******${c.professionalId.userId.phone.slice(-4)}` : undefined,
    };
  });

  return {
    alerts: credentialAlerts,
    summary: {
      totalAlerts: credentialAlerts.length,
      expiredCount: credentialAlerts.filter((a: any) => a.status === 'expired').length,
      expiringSoonCount: credentialAlerts.filter((a: any) => a.status === 'expiring_soon').length,
    },
  };
};

/**
 * Review hospital organization verification status and license expiry
 */
export const reviewHospitalOrganizationVerification = async (
  hospitalId: string,
  newStatus: 'pending' | 'verified' | 'rejected',
  notes: string,
  licenseExpiryDate: string | undefined,
  actorUser: IUser
): Promise<IHospitalProfile> => {
  if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
    throw new AppError('Invalid hospital ID', 400);
  }

  const profile = await HospitalProfile.findById(hospitalId);
  if (!profile) {
    throw new AppError('Hospital profile not found', 404);
  }

  profile.verificationStatus = newStatus;
  profile.verifiedAt = new Date();
  profile.verifiedBy = actorUser._id;
  profile.verificationNotes = notes.trim();
  if (licenseExpiryDate) {
    profile.licenseExpiryDate = new Date(licenseExpiryDate);
  }

  await profile.save();

  await logAdminAction({
    action: 'HOSPITAL_VERIFICATION_REVIEWED',
    category: 'hospital_management',
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'hospital',
    targetId: profile.registrationNumber,
    details: {
      hospitalName: profile.hospitalName,
      newStatus,
      notes,
      licenseExpiryDate,
    },
    severity: newStatus === 'rejected' ? 'warning' : 'info',
  });

  return profile;
};

/**
 * List doctors, nurses, and caregivers with verification credentials and statistics
 */
export const listHealthcareProfessionalsAdmin = async (filters: {
  professionType?: string;
  verificationStatus?: string;
  search?: string;
  minExperience?: number;
  maxExperience?: number;
  page?: number;
  limit?: number;
}) => {
  await seedAdminDemoData();

  const query: any = {};
  if (filters.professionType && filters.professionType !== 'all') {
    query.professionType = filters.professionType;
  }
  if (filters.verificationStatus && filters.verificationStatus !== 'all') {
    query.verificationStatus = filters.verificationStatus;
  }
  if (filters.minExperience !== undefined || filters.maxExperience !== undefined) {
    query.yearsOfExperience = {};
    if (filters.minExperience !== undefined) query.yearsOfExperience.$gte = filters.minExperience;
    if (filters.maxExperience !== undefined) query.yearsOfExperience.$lte = filters.maxExperience;
  }

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    const matchingUsers = await User.find({
      $or: [
        { fullName: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ],
    }).select('_id');
    const userIds = matchingUsers.map((u) => u._id);

    query.$or = [
      { userId: { $in: userIds } },
      { highestQualification: { $regex: term, $options: 'i' } },
      { institution: { $regex: term, $options: 'i' } },
      { registrationNumber: { $regex: term, $options: 'i' } },
      { specializations: { $in: [new RegExp(term, 'i')] } },
      { skills: { $in: [new RegExp(term, 'i')] } },
    ];
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [profiles, total] = await Promise.all([
    HealthcareProfessionalProfile.find(query)
      .populate('userId', 'fullName phone email status lastLoginAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    HealthcareProfessionalProfile.countDocuments(query),
  ]);

  const enriched = await Promise.all(
    profiles.map(async (p: any) => {
      const credentialsCount = await ProfessionalCredentials.countDocuments({
        professionalId: p._id,
      });
      const pendingCredentialsCount = await ProfessionalCredentials.countDocuments({
        professionalId: p._id,
        verificationStatus: 'pending',
      });

      return {
        id: p._id.toString(),
        userId: p.userId?._id?.toString(),
        user: p.userId
          ? {
              id: p.userId._id.toString(),
              fullName: p.userId.fullName,
              phone: p.userId.phone,
              email: p.userId.email,
              status: p.userId.status,
              lastLoginAt: p.userId.lastLoginAt,
            }
          : undefined,
        fullName: p.userId?.fullName || 'Care Professional',
        phone: p.userId?.phone,
        phoneMasked: p.userId?.phone ? `+91 ******${p.userId.phone.slice(-4)}` : undefined,
        email: p.userId?.email,
        status: p.userId?.status || 'active',
        title: p.title,
        professionType: p.professionType,
        highestQualification: p.highestQualification,
        institution: p.institution,
        specializations: p.specializations || [],
        registrationNumber: p.registrationNumber,
        registrationCouncil: p.registrationCouncil,
        yearsOfExperience: p.yearsOfExperience,
        experienceSummary: p.experienceSummary,
        skills: p.skills || [],
        serviceClusters: p.serviceClusters || [],
        verificationStatus: p.verificationStatus,
        rating: p.rating,
        totalVisitsCompleted: p.totalVisitsCompleted,
        isActiveForDispatch: p.isActiveForDispatch,
        credentialsCount,
        pendingCredentialsCount,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    })
  );

  const validEnriched = enriched.filter((p: any) => Boolean(p.userId));

  return {
    professionals: validEnriched,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};


