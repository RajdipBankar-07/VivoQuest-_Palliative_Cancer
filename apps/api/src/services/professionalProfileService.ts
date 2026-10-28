import mongoose from 'mongoose';
import { User, IUser } from '../models/User.js';
import {
  HealthcareProfessionalProfile,
  IHealthcareProfessionalProfile,
  ProfessionType,
  ProfessionalVerificationStatus,
} from '../models/HealthcareProfessionalProfile.js';
import {
  ProfessionalCredentials,
  IProfessionalCredentials,
  CredentialDocumentType,
} from '../models/ProfessionalCredentials.js';
import { UploadedFile } from '../models/UploadedFile.js';
import { AuditLog } from '../models/AuditLog.js';
import { FieldVisit } from '../models/FieldVisit.js';
import { CaregiverSubscription } from '../models/CaregiverSubscription.js';
import { AppError } from '../middleware/errorHandler.js';

export interface ProfileCompletionReport {
  percentage: number;
  isComplete: boolean;
  completedFields: string[];
  missingFields: string[];
}

export interface UpdateProfessionalProfileDTO {
  fullName?: string;
  email?: string;
  title?: string;
  professionType?: ProfessionType;
  highestQualification?: string;
  institution?: string;
  specializations?: string[];
  yearsOfExperience?: number;
  experienceSummary?: string;
  skills?: string[];
  registrationNumber?: string;
  registrationCouncil?: string;
  bio?: string;
  profileImageFileId?: string;
}

export interface AddCredentialDTO {
  documentType: CredentialDocumentType;
  certificateTitle?: string;
  issuingAuthority: string;
  issuingOrganization?: string;
  credentialCategory?: string;
  documentNumber?: string;
  issueDate?: string | Date;
  expiryDate?: string | Date;
  uploadedFileId?: string;
}

export interface UpdateCredentialDTO {
  documentType?: CredentialDocumentType;
  certificateTitle?: string;
  issuingAuthority?: string;
  issuingOrganization?: string;
  credentialCategory?: string;
  documentNumber?: string;
  issueDate?: string | Date;
  expiryDate?: string | Date;
  uploadedFileId?: string;
}

export interface ReviewCredentialDTO {
  status: 'verified' | 'approved' | 'rejected' | 'pending';
  rejectionReason?: string;
  reviewNotes?: string;
}

/**
 * Calculates profile completion percentage based on basic info, professional qualifications,
 * and optional credentials.
 */
export const calculateProfileCompletion = (
  user: any,
  profile: any,
  credentials: any[] = []
): ProfileCompletionReport => {
  const completedFields: string[] = [];
  const missingFields: string[] = [];

  // Basic Information (30%)
  if (user?.fullName && user.fullName.trim().length >= 2) {
    completedFields.push('Full Name');
  } else {
    missingFields.push('Full Name');
  }

  if (user?.phone) {
    completedFields.push('Mobile Number');
  } else {
    missingFields.push('Mobile Number');
  }

  if (user?.email && user.email.includes('@')) {
    completedFields.push('Email Address');
  } else {
    missingFields.push('Email Address');
  }

  // Professional Core Details (40%)
  if (profile?.professionType) {
    completedFields.push('Professional Role');
  } else {
    missingFields.push('Professional Role');
  }

  if (profile?.highestQualification && profile.highestQualification.trim().length > 0) {
    completedFields.push('Highest Qualification');
  } else {
    missingFields.push('Highest Qualification');
  }

  if (profile?.institution && profile.institution.trim().length > 0) {
    completedFields.push('Institution / University');
  } else {
    missingFields.push('Institution / University');
  }

  if (Array.isArray(profile?.specializations) && profile.specializations.length > 0) {
    completedFields.push('Specialization');
  } else {
    missingFields.push('Specialization');
  }

  if (profile?.yearsOfExperience !== undefined && profile.yearsOfExperience >= 0) {
    completedFields.push('Years of Experience');
  } else {
    missingFields.push('Years of Experience');
  }

  // Enrichments (30%)
  if ((profile?.experienceSummary && profile.experienceSummary.trim().length > 0) || (profile?.bio && profile.bio.trim().length > 0)) {
    completedFields.push('Experience Summary');
  } else {
    missingFields.push('Experience Summary');
  }

  if (Array.isArray(profile?.skills) && profile.skills.length > 0) {
    completedFields.push('Skills');
  } else {
    missingFields.push('Skills');
  }

  if (Array.isArray(credentials) && credentials.length > 0) {
    completedFields.push('Certifications / Credentials');
  } else {
    missingFields.push('Certifications / Credentials');
  }

  const totalPossible = completedFields.length + missingFields.length;
  const percentage = Math.round((completedFields.length / totalPossible) * 100);

  return {
    percentage,
    isComplete: percentage >= 80,
    completedFields,
    missingFields,
  };
};

/**
 * Gets or creates the persistent HealthcareProfessionalProfile for any professional/caregiver user.
 */
export const getOrCreateProfessionalProfile = async (
  userId: string | mongoose.Types.ObjectId,
  initialData?: Partial<IHealthcareProfessionalProfile>
): Promise<IHealthcareProfessionalProfile> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  let profile = await HealthcareProfessionalProfile.findOne({ userId: user._id });
  if (profile) {
    return profile;
  }

  // Role-appropriate title and professionType default
  let defaultRole: ProfessionType = 'caregiver';
  let defaultTitle = 'Caregiver';

  if (user.role === 'professional') {
    defaultRole = 'physician';
    defaultTitle = 'Dr.';
  } else if (user.role === 'caregiver') {
    defaultRole = 'caregiver';
    defaultTitle = 'Caregiver';
  }

  profile = await HealthcareProfessionalProfile.create({
    userId: user._id,
    title: initialData?.title || defaultTitle,
    professionType: initialData?.professionType || defaultRole,
    highestQualification: initialData?.highestQualification || '',
    institution: initialData?.institution || '',
    specializations: initialData?.specializations || [],
    registrationNumber: initialData?.registrationNumber || 'N/A',
    registrationCouncil: initialData?.registrationCouncil || 'Not Applicable',
    yearsOfExperience: initialData?.yearsOfExperience !== undefined ? initialData.yearsOfExperience : 1,
    experienceSummary: initialData?.experienceSummary || '',
    skills: initialData?.skills || [],
    serviceClusters: initialData?.serviceClusters || ['Pune'],
    verificationStatus: 'pending_review',
    bio: initialData?.bio || '',
    isActiveForDispatch: true,
  });

  return profile;
};

/**
 * Retrieves full professional profile, linked credentials, and completion metric.
 */
export const getProfessionalProfileWithCredentials = async (
  userId: string | mongoose.Types.ObjectId
) => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    throw new AppError('Professional user not found', 404);
  }

  const profile = await getOrCreateProfessionalProfile(user._id);

  const credentials = await ProfessionalCredentials.find({ professionalId: profile._id })
    .populate('uploadedFileId', 'fileId originalFileName mimeType fileSize accessTier uploadStatus')
    .sort({ createdAt: -1 })
    .lean();

  const completion = calculateProfileCompletion(user, profile, credentials);

  return {
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
    },
    profile,
    credentials,
    completion,
  };
};

/**
 * Updates professional profile.
 * Resets verification status to 'pending_review' if previously verified qualifications are edited.
 * Prevents unauthorized self-verification.
 */
export const updateProfessionalProfile = async (
  userId: string | mongoose.Types.ObjectId,
  data: UpdateProfessionalProfileDTO,
  actor: { id: string; role: string; fullName: string }
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Security check: only profile owner or admin can update
  const isOwner = user._id.toString() === actor.id;
  const isAdmin = ['admin', 'super_admin'].includes(actor.role);

  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: You can only edit your own professional profile', 403);
  }

  // Check email uniqueness if changing email
  if (data.email && data.email.trim().toLowerCase() !== (user.email || '').toLowerCase()) {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
    if (existing) {
      throw new AppError('Email address is already in use by another account', 409);
    }
    user.email = cleanEmail;
    await user.save();
  }

  if (data.fullName && data.fullName.trim() && data.fullName.trim() !== user.fullName) {
    user.fullName = data.fullName.trim();
    await user.save();
  }

  const profile = await getOrCreateProfessionalProfile(user._id);

  // Check if verified data is being modified
  const verifiedWasActive = profile.verificationStatus === 'verified';
  const qualificationChanged =
    (data.highestQualification !== undefined && data.highestQualification !== profile.highestQualification) ||
    (data.professionType !== undefined && data.professionType !== profile.professionType) ||
    (data.registrationNumber !== undefined && data.registrationNumber !== profile.registrationNumber);

  if (verifiedWasActive && qualificationChanged && !isAdmin) {
    profile.verificationStatus = 'pending_review';
    await AuditLog.create({
      action: 'PROFESSIONAL_PROFILE_VERIFICATION_RESET',
      category: 'credential_review',
      actorId: user._id,
      actorName: actor.fullName,
      actorRole: actor.role,
      targetType: 'HealthcareProfessionalProfile',
      targetId: profile._id.toString(),
      severity: 'info',
      details: {
        reason: 'Key professional qualifications or registration details updated by professional',
        previousStatus: 'verified',
        newStatus: 'pending_review',
      },
    }).catch(() => {});
  }

  // Apply permitted updates
  if (data.title !== undefined) profile.title = data.title.trim();
  if (data.professionType !== undefined) profile.professionType = data.professionType;
  if (data.highestQualification !== undefined) profile.highestQualification = data.highestQualification.trim();
  if (data.institution !== undefined) profile.institution = data.institution.trim();
  if (data.specializations !== undefined) profile.specializations = data.specializations;
  if (data.yearsOfExperience !== undefined) profile.yearsOfExperience = Math.max(0, data.yearsOfExperience);
  if (data.experienceSummary !== undefined) profile.experienceSummary = data.experienceSummary.trim();
  if (data.skills !== undefined) profile.skills = data.skills;
  if (data.registrationNumber !== undefined) profile.registrationNumber = data.registrationNumber.trim();
  if (data.registrationCouncil !== undefined) profile.registrationCouncil = data.registrationCouncil.trim();
  if (data.bio !== undefined) profile.bio = data.bio.trim();
  if (data.profileImageFileId !== undefined) {
    if (data.profileImageFileId && mongoose.Types.ObjectId.isValid(data.profileImageFileId)) {
      profile.profileImageFileId = new mongoose.Types.ObjectId(data.profileImageFileId);
    } else {
      profile.profileImageFileId = undefined;
    }
  }

  await profile.save();

  await AuditLog.create({
    action: 'PROFESSIONAL_PROFILE_UPDATED',
    category: 'user_management',
    actorId: new mongoose.Types.ObjectId(actor.id),
    actorName: actor.fullName,
    actorRole: actor.role,
    targetType: 'HealthcareProfessionalProfile',
    targetId: profile._id.toString(),
    severity: 'info',
    details: {
      userId: user._id.toString(),
      verificationStatus: profile.verificationStatus,
    },
  }).catch(() => {});

  return getProfessionalProfileWithCredentials(user._id);
};

/**
 * Adds a new credential / certification entry for the professional.
 * Status defaults to 'pending' (cannot be self-verified).
 */
export const addProfessionalCredential = async (
  userId: string | mongoose.Types.ObjectId,
  data: AddCredentialDTO,
  actor: { id: string; role: string; fullName: string }
) => {
  const profile = await getOrCreateProfessionalProfile(userId);

  // Security check: only profile owner or admin can add credentials
  const isOwner = profile.userId.toString() === actor.id;
  const isAdmin = ['admin', 'super_admin'].includes(actor.role);
  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: You can only add credentials to your own profile', 403);
  }

  let uploadedFileObjId: mongoose.Types.ObjectId | undefined;
  if (data.uploadedFileId) {
    const file = await UploadedFile.findOne({
      $or: [
        { fileId: data.uploadedFileId },
        ...(mongoose.Types.ObjectId.isValid(data.uploadedFileId) ? [{ _id: data.uploadedFileId }] : []),
      ],
    });
    if (!file) {
      throw new AppError('Uploaded credential document not found', 404);
    }
    // Document must belong to the user or be confirmed
    if (file.uploadedBy.toString() !== profile.userId.toString() && !isAdmin) {
      throw new AppError('Forbidden: Cannot attach documents uploaded by another user', 403);
    }
    uploadedFileObjId = file._id;
  }

  const credential = await ProfessionalCredentials.create({
    professionalId: profile._id,
    documentType: data.documentType || 'other_certification',
    certificateTitle: data.certificateTitle?.trim() || 'Certificate',
    issuingAuthority: data.issuingAuthority?.trim() || data.issuingOrganization?.trim() || 'Authorized Body',
    issuingOrganization: data.issuingOrganization?.trim(),
    credentialCategory: data.credentialCategory?.trim(),
    documentNumber: data.documentNumber?.trim() || 'N/A',
    issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
    expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    uploadedFileId: uploadedFileObjId,
    verificationStatus: 'pending', // Strictly initialized to pending
  });

  await AuditLog.create({
    action: 'PROFESSIONAL_CREDENTIAL_SUBMITTED',
    category: 'credential_review',
    actorId: new mongoose.Types.ObjectId(actor.id),
    actorName: actor.fullName,
    actorRole: actor.role,
    targetType: 'ProfessionalCredentials',
    targetId: credential._id.toString(),
    severity: 'info',
    details: {
      professionalId: profile._id.toString(),
      documentType: credential.documentType,
      certificateTitle: credential.certificateTitle,
      hasUpload: Boolean(uploadedFileObjId),
    },
  }).catch(() => {});

  return credential;
};

/**
 * Updates an existing credential entry.
 * Resets verification status to 'pending'.
 */
export const updateProfessionalCredential = async (
  userId: string | mongoose.Types.ObjectId,
  credentialId: string,
  data: UpdateCredentialDTO,
  actor: { id: string; role: string; fullName: string }
) => {
  const profile = await getOrCreateProfessionalProfile(userId);
  const credential = await ProfessionalCredentials.findById(credentialId);

  if (!credential) {
    throw new AppError('Credential not found', 404);
  }

  if (credential.professionalId.toString() !== profile._id.toString()) {
    throw new AppError('Forbidden: Credential does not belong to your profile', 403);
  }

  const isOwner = profile.userId.toString() === actor.id;
  const isAdmin = ['admin', 'super_admin'].includes(actor.role);
  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: You can only edit your own credentials', 403);
  }

  if (data.documentType !== undefined) credential.documentType = data.documentType;
  if (data.certificateTitle !== undefined) credential.certificateTitle = data.certificateTitle.trim();
  if (data.issuingAuthority !== undefined) credential.issuingAuthority = data.issuingAuthority.trim();
  if (data.issuingOrganization !== undefined) credential.issuingOrganization = data.issuingOrganization.trim();
  if (data.credentialCategory !== undefined) credential.credentialCategory = data.credentialCategory.trim();
  if (data.documentNumber !== undefined) credential.documentNumber = data.documentNumber.trim();
  if (data.issueDate !== undefined) credential.issueDate = data.issueDate ? new Date(data.issueDate) : undefined;
  if (data.expiryDate !== undefined) credential.expiryDate = data.expiryDate ? new Date(data.expiryDate) : undefined;

  if (data.uploadedFileId !== undefined) {
    if (data.uploadedFileId) {
      const file = await UploadedFile.findOne({
        $or: [
          { fileId: data.uploadedFileId },
          ...(mongoose.Types.ObjectId.isValid(data.uploadedFileId) ? [{ _id: data.uploadedFileId }] : []),
        ],
      });
      if (!file) throw new AppError('Uploaded credential document not found', 404);
      if (file.uploadedBy.toString() !== profile.userId.toString() && !isAdmin) {
        throw new AppError('Forbidden: Cannot attach documents uploaded by another user', 403);
      }
      credential.uploadedFileId = file._id;
    } else {
      credential.uploadedFileId = undefined;
    }
  }

  // Any edit by professional resets verification status to pending
  if (!isAdmin) {
    credential.verificationStatus = 'pending';
    credential.verifiedAt = undefined;
    credential.verifiedBy = undefined;
    credential.rejectionReason = undefined;
  }

  await credential.save();

  await AuditLog.create({
    action: 'PROFESSIONAL_CREDENTIAL_UPDATED',
    category: 'credential_review',
    actorId: new mongoose.Types.ObjectId(actor.id),
    actorName: actor.fullName,
    actorRole: actor.role,
    targetType: 'ProfessionalCredentials',
    targetId: credential._id.toString(),
    severity: 'info',
    details: {
      professionalId: profile._id.toString(),
      verificationStatus: credential.verificationStatus,
    },
  }).catch(() => {});

  return credential;
};

/**
 * Removes a credential entry.
 */
export const deleteProfessionalCredential = async (
  userId: string | mongoose.Types.ObjectId,
  credentialId: string,
  actor: { id: string; role: string; fullName: string }
) => {
  const profile = await getOrCreateProfessionalProfile(userId);
  const credential = await ProfessionalCredentials.findById(credentialId);

  if (!credential) {
    throw new AppError('Credential not found', 404);
  }

  if (credential.professionalId.toString() !== profile._id.toString()) {
    throw new AppError('Forbidden: Credential does not belong to your profile', 403);
  }

  const isOwner = profile.userId.toString() === actor.id;
  const isAdmin = ['admin', 'super_admin'].includes(actor.role);
  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: You can only delete your own credentials', 403);
  }

  await ProfessionalCredentials.findByIdAndDelete(credential._id);

  await AuditLog.create({
    action: 'PROFESSIONAL_CREDENTIAL_DELETED',
    category: 'credential_review',
    actorId: new mongoose.Types.ObjectId(actor.id),
    actorName: actor.fullName,
    actorRole: actor.role,
    targetType: 'ProfessionalCredentials',
    targetId: credential._id.toString(),
    severity: 'warning',
    details: {
      professionalId: profile._id.toString(),
      certificateTitle: credential.certificateTitle,
      documentType: credential.documentType,
    },
  }).catch(() => {});

  return { success: true, message: 'Credential entry deleted successfully' };
};

/**
 * Authorized Admin Detail View for Healthcare Professional:
 * returns user details, qualifications, all credentials, active assignments, and audit history.
 */
export const getProfessionalDetailForAdmin = async (profileOrUserId: string) => {
  let profile: any = null;

  if (mongoose.Types.ObjectId.isValid(profileOrUserId)) {
    profile = await HealthcareProfessionalProfile.findById(profileOrUserId)
      .populate('userId', 'fullName phone email status lastLoginAt isPhoneVerified createdAt')
      .lean();

    if (!profile) {
      profile = await HealthcareProfessionalProfile.findOne({ userId: profileOrUserId })
        .populate('userId', 'fullName phone email status lastLoginAt isPhoneVerified createdAt')
        .lean();
    }
  }

  if (!profile) {
    throw new AppError('Healthcare professional profile not found', 404);
  }

  const userId = profile.userId?._id || profile.userId;

  // Retrieve credentials with file metadata
  const credentials = await ProfessionalCredentials.find({ professionalId: profile._id })
    .populate('uploadedFileId', 'fileId originalFileName mimeType fileSize accessTier uploadStatus')
    .sort({ createdAt: -1 })
    .lean();

  // Retrieve visit and assignment history
  const [totalVisits, completedVisits, activeSubscriptions] = await Promise.all([
    FieldVisit.countDocuments({ providerId: userId }),
    FieldVisit.countDocuments({ providerId: userId, status: 'completed' }),
    CaregiverSubscription.find({ assignedCaregiverId: userId, status: 'active' })
      .select('subscriptionNumber planTitle patientName startDate endDate')
      .limit(10)
      .lean(),
  ]);

  // Retrieve audit logs related to this professional profile and credentials
  const auditLogs = await AuditLog.find({
    $or: [
      { targetType: 'HealthcareProfessionalProfile', targetId: profile._id.toString() },
      { 'details.userId': userId?.toString() },
      { targetType: 'ProfessionalCredentials', 'details.professionalId': profile._id.toString() },
    ],
  })
    .sort({ timestamp: -1 })
    .limit(25)
    .lean();

  const completion = calculateProfileCompletion(profile.userId, profile, credentials);

  return {
    profile: {
      id: profile._id.toString(),
      userId: userId?.toString(),
      fullName: profile.userId?.fullName || 'Care Professional',
      phone: profile.userId?.phone,
      email: profile.userId?.email,
      status: profile.userId?.status || 'active',
      isPhoneVerified: Boolean(profile.userId?.isPhoneVerified),
      lastLoginAt: profile.userId?.lastLoginAt,
      title: profile.title,
      professionType: profile.professionType,
      highestQualification: profile.highestQualification,
      institution: profile.institution,
      specializations: profile.specializations || [],
      registrationNumber: profile.registrationNumber,
      registrationCouncil: profile.registrationCouncil,
      yearsOfExperience: profile.yearsOfExperience,
      experienceSummary: profile.experienceSummary,
      skills: profile.skills || [],
      serviceClusters: profile.serviceClusters || [],
      verificationStatus: profile.verificationStatus,
      bio: profile.bio,
      rating: profile.rating,
      totalVisitsCompleted: profile.totalVisitsCompleted,
      isActiveForDispatch: profile.isActiveForDispatch,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
    credentials,
    completion,
    assignments: {
      totalVisits,
      completedVisits,
      activeSubscriptions,
    },
    auditLogs,
  };
};

/**
 * Admin action to verify or reject a professional credential.
 * Requires mandatory reason when rejecting.
 */
export const reviewCredentialAdmin = async (
  credentialId: string,
  data: ReviewCredentialDTO,
  adminActor: { id: string; fullName: string; role: string }
) => {
  const credential = await ProfessionalCredentials.findById(credentialId);
  if (!credential) {
    throw new AppError('Credential not found', 404);
  }

  const isRejecting = data.status === 'rejected';
  if (isRejecting && (!data.rejectionReason || !data.rejectionReason.trim())) {
    throw new AppError('A valid rejection reason is mandatory when rejecting a credential', 400);
  }

  const normalizedStatus = data.status === 'approved' ? 'verified' : data.status;

  credential.verificationStatus = normalizedStatus as any;
  credential.verifiedBy = new mongoose.Types.ObjectId(adminActor.id);
  credential.verifiedAt = new Date();
  if (isRejecting) {
    credential.rejectionReason = data.rejectionReason!.trim();
  } else {
    credential.rejectionReason = undefined;
  }
  if (data.reviewNotes) {
    credential.reviewNotes = data.reviewNotes.trim();
  }

  await credential.save();

  // If verifying, check if professional profile can be upgraded to 'verified'
  const profile = await HealthcareProfessionalProfile.findById(credential.professionalId);
  if (profile && normalizedStatus === 'verified' && profile.verificationStatus === 'pending_review') {
    profile.verificationStatus = 'verified';
    await profile.save();
  }

  await AuditLog.create({
    action: `CREDENTIAL_${normalizedStatus.toUpperCase()}`,
    category: 'credential_review',
    actorId: new mongoose.Types.ObjectId(adminActor.id),
    actorName: adminActor.fullName,
    actorRole: adminActor.role,
    targetType: 'ProfessionalCredentials',
    targetId: credential._id.toString(),
    severity: isRejecting ? 'warning' : 'info',
    details: {
      credentialId: credential._id.toString(),
      professionalId: credential.professionalId.toString(),
      status: normalizedStatus,
      rejectionReason: credential.rejectionReason,
      reviewNotes: credential.reviewNotes,
    },
  }).catch(() => {});

  return credential;
};

/**
 * Admin action to update professional profile details or overall verification status.
 */
export const updateProfessionalAdmin = async (
  profileOrUserId: string,
  data: Partial<UpdateProfessionalProfileDTO> & { verificationStatus?: ProfessionalVerificationStatus; isActiveForDispatch?: boolean },
  adminActor: { id: string; fullName: string; role: string }
) => {
  let profile: any = null;
  if (mongoose.Types.ObjectId.isValid(profileOrUserId)) {
    profile = await HealthcareProfessionalProfile.findById(profileOrUserId);
    if (!profile) {
      profile = await HealthcareProfessionalProfile.findOne({ userId: profileOrUserId });
    }
  }

  if (!profile) {
    throw new AppError('Healthcare professional profile not found', 404);
  }

  const previousStatus = profile.verificationStatus;

  if (data.title !== undefined) profile.title = data.title;
  if (data.professionType !== undefined) profile.professionType = data.professionType;
  if (data.highestQualification !== undefined) profile.highestQualification = data.highestQualification;
  if (data.institution !== undefined) profile.institution = data.institution;
  if (data.specializations !== undefined) profile.specializations = data.specializations;
  if (data.yearsOfExperience !== undefined) profile.yearsOfExperience = data.yearsOfExperience;
  if (data.experienceSummary !== undefined) profile.experienceSummary = data.experienceSummary;
  if (data.skills !== undefined) profile.skills = data.skills;
  if (data.registrationNumber !== undefined) profile.registrationNumber = data.registrationNumber;
  if (data.registrationCouncil !== undefined) profile.registrationCouncil = data.registrationCouncil;
  if (data.bio !== undefined) profile.bio = data.bio;
  if (data.isActiveForDispatch !== undefined) profile.isActiveForDispatch = data.isActiveForDispatch;
  if (data.verificationStatus !== undefined) profile.verificationStatus = data.verificationStatus;

  await profile.save();

  await AuditLog.create({
    action: 'ADMIN_UPDATED_HEALTHCARE_PROFESSIONAL',
    category: 'user_management',
    actorId: new mongoose.Types.ObjectId(adminActor.id),
    actorName: adminActor.fullName,
    actorRole: adminActor.role,
    targetType: 'HealthcareProfessionalProfile',
    targetId: profile._id.toString(),
    severity: 'info',
    details: {
      previousStatus,
      newStatus: profile.verificationStatus,
      updates: data,
    },
  }).catch(() => {});

  return getProfessionalDetailForAdmin(profile._id.toString());
};
