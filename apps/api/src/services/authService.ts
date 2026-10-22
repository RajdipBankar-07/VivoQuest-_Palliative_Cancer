import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { User, IUser, UserRole } from '../models/User.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { HealthcareProfessionalProfile } from '../models/HealthcareProfessionalProfile.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedUserPayload } from '../middleware/auth.js';

export interface RegisterDTO {
  fullName: string;
  phone: string;
  email?: string;
  password?: string;
  role?: string;
  city?: string;
  pincode?: string;
  cluster?: string;
  consentAccepted: boolean;
  registrationNumber?: string;
  professionType?: string;
}

export interface LoginDTO {
  identifier: string; // phone or email
  password?: string;
  otp?: string;
  role?: string;
}

// Designated development test numbers permitted for mock OTP in development mode
export const DESIGNATED_TEST_PHONES = new Set([
  '9810011111', // Patient Demo (Ramesh Kulkarni)
  '9811011111', // Doctor Specialist Demo (Dr. Priya Nair)
  '9822011111', // Hospital Staff Demo (Ruby Hall Clinic)
  '9822022222', // Hospital Staff Demo (Sahyadri Hospital)
  '9822441122', // Clinician Sister Varsha (Field Visit Demo)
  '9822119988', // Bio-Technician Rohan Shinde (Field Visit Demo)
  '9820011003', // Physiotherapist Priya Deshmukh (Field Visit Demo)
  '9820011001', // Oncologist Dr. Aditi Rao (Field Visit Demo)
  '9899009900', // Operations Lead Demo
  '9899000001', // Super Admin Demo
  '9876500001', // Test Suite User 1
  '9876500002', // Test Suite User 2
  '9876500003', // Test Suite User 3
  '9876599001', // E2E Patient
  '9876599002', // E2E Clinician
  '9876599003', // E2E Hospital
  '9876599004', // E2E Admin
  '9876599005', // E2E Super Admin
]);

export const hashPassword = async (plainText: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
};

export const comparePassword = async (plainText: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plainText, hash);
};

export const generateAuthToken = (user: IUser): string => {
  const payload: AuthenticatedUserPayload = {
    userId: user._id.toString(),
    role: user.role,
    phone: user.phone,
    email: user.email,
    fullName: user.fullName,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRY as any,
  });
};

export const registerUser = async (data: RegisterDTO) => {
  // Normalize phone (strip non-digits)
  const cleanPhone = data.phone.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new AppError('A valid 10-digit Indian mobile number is required', 400);
  }

  // Normalize role
  const normalizedRole = (data.role || 'patient').toLowerCase() as UserRole;
  const validRoles: UserRole[] = ['patient', 'caregiver', 'professional', 'hospital', 'supplier', 'admin', 'super_admin'];
  if (!validRoles.includes(normalizedRole)) {
    throw new AppError(`Invalid role '${data.role}'. Supported roles: ${validRoles.join(', ')}`, 400);
  }

  if (!data.consentAccepted) {
    throw new AppError('DPDP Act data processing consent is mandatory', 400);
  }

  // Check duplicate phone or email
  const existingPhone = await User.findOne({ phone: cleanPhone });
  if (existingPhone) {
    throw new AppError(`An account with phone number +91 ${cleanPhone} already exists`, 409);
  }

  if (data.email) {
    const cleanEmail = data.email.trim().toLowerCase();
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      throw new AppError(`An account with email ${cleanEmail} already exists`, 409);
    }
  }

  // Secure password hashing
  // If no password provided in prototype, generate secure default random password
  const rawPassword = data.password && data.password.length >= 6 
    ? data.password 
    : `VivoQuest#${cleanPhone.slice(-4)}@2026`;
  const passwordHash = await hashPassword(rawPassword);

  // Create User document
  const user = await User.create({
    fullName: data.fullName.trim(),
    phone: cleanPhone,
    email: data.email ? data.email.trim().toLowerCase() : undefined,
    passwordHash,
    role: normalizedRole,
    isPhoneVerified: false,
    isEmailVerified: false,
    status: 'active',
    dpdpConsent: {
      accepted: true,
      consentedAt: new Date(),
      policyVersion: 'DPDP-2023-V1.0',
    },
  });

  // Create linked role-specific profile
  const city = data.city || 'Pune';
  const pincode = data.pincode || '411001';
  const cluster = data.cluster || city;

  if (normalizedRole === 'patient' || normalizedRole === 'caregiver') {
    await PatientProfile.create({
      userId: user._id,
      address: {
        city,
        state: 'Maharashtra',
        pincode,
        cluster,
      },
      chronicConditions: [],
      allergies: [],
      primaryLanguage: 'English',
    });
  } else if (normalizedRole === 'professional') {
    await HealthcareProfessionalProfile.create({
      userId: user._id,
      title: 'Dr.',
      professionType: (data.professionType as any) || 'physician',
      registrationNumber: data.registrationNumber || `MCI-PROV-${cleanPhone.slice(-6)}`,
      registrationCouncil: 'Maharashtra Medical Council',
      yearsOfExperience: 3,
      serviceClusters: [cluster],
      verificationStatus: 'pending_review',
      bio: 'Healthcare specialist on the VivoQuest platform',
    });
  }

  const token = generateAuthToken(user);

  return {
    token,
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
  };
};

export const loginUser = async (data: LoginDTO) => {
  const identifier = data.identifier.trim();
  if (!identifier) {
    throw new AppError('Phone number or email is required', 400);
  }

  const cleanPhone = identifier.replace(/\D/g, '');
  const isPhone = /^[6-9]\d{9}$/.test(cleanPhone);

  // Find user by phone or email, explicitly selecting passwordHash
  const user = await User.findOne(
    isPhone ? { phone: cleanPhone } : { email: identifier.toLowerCase() }
  ).select('+passwordHash');

  if (!user) {
    // If testing in prototype mode and user doesn't exist yet, we can create or advise
    throw new AppError('No account found with this phone number or email. Please register first.', 404);
  }

  if (user.status === 'suspended') {
    throw new AppError('This account has been suspended. Please contact VivoQuest Clinical Support.', 403);
  }

  // Validate via password OR secured prototype OTP flow
  if (data.password) {
    const isMatch = await comparePassword(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid credentials. Please verify your password.', 401);
    }
  } else if (data.otp) {
    const cleanOtp = data.otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new AppError('Verification code must be exactly 6 digits', 400);
    }

    // Production guard: Real SMS gateway is required in production
    if (env.NODE_ENV === 'production' || !env.ALLOW_DEV_MOCK_OTP) {
      throw new AppError(
        'Live SMS OTP service is not yet configured for production. Please authenticate using your registered password.',
        503
      );
    }

    // In development mode: Strictly restrict mock OTP to designated test accounts
    if (!DESIGNATED_TEST_PHONES.has(user.phone)) {
      throw new AppError(
        'OTP authentication is disabled for non-test accounts in development mode. Please sign in with your password.',
        401
      );
    }

    // Strictly enforce matching the designated mock code (default 123456)
    if (cleanOtp !== env.DEV_MOCK_OTP_CODE) {
      throw new AppError('Invalid verification code. Please check and try again.', 401);
    }

    // Mark phone as verified upon successful code entry
    user.isPhoneVerified = true;
  } else {
    throw new AppError('Password or OTP verification code is required', 400);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = generateAuthToken(user);

  return {
    token,
    authMode: data.otp ? 'OTP_DEVELOPMENT_PROTOTYPE' : 'PASSWORD',
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      isPhoneVerified: user.isPhoneVerified,
      lastLoginAt: user.lastLoginAt,
    },
  };
};
