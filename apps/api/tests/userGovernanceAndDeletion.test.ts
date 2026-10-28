import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { PatientProfile } from '../src/models/PatientProfile.js';
import { HealthcareProfessionalProfile } from '../src/models/HealthcareProfessionalProfile.js';
import { ProfessionalCredentials } from '../src/models/ProfessionalCredentials.js';
import { AuditLog } from '../src/models/AuditLog.js';
import {
  getUserDetails,
  deleteUserPermanently,
  updateUserStatus,
} from '../src/services/adminService.js';

describe('Admin User Governance, Profile Inspection & Permanent Deletion', () => {
  let superAdmin: any;
  let standardAdmin: any;
  let testPatientUser: any;
  let testPatientProfile: any;
  let testNurseUser: any;
  let testNurseProfile: any;
  let testNurseCredentials: any;

  before(async () => {
    await connectDatabase();

    const randomDigits = Math.floor(10000000 + Math.random() * 80000000).toString(); // 8 digits

    // 1. Super Admin (9 + 1 + 8 digits = 10 digits)
    superAdmin = await User.create({
      phone: `91${randomDigits}`,
      fullName: 'Chief Super Admin',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'super_admin',
      isPhoneVerified: true,
      status: 'active',
      dpdpConsent: {
        accepted: true,
        consentedAt: new Date(),
        policyVersion: 'DPDP-2023-V1.0',
      },
    });

    // 2. Standard Admin (9 + 2 + 8 digits = 10 digits)
    standardAdmin = await User.create({
      phone: `92${randomDigits}`,
      fullName: 'Standard Ops Admin',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'admin',
      isPhoneVerified: true,
      status: 'active',
      dpdpConsent: {
        accepted: true,
        consentedAt: new Date(),
        policyVersion: 'DPDP-2023-V1.0',
      },
    });

    // 3. Test Patient User & Profile (9 + 3 + 8 digits = 10 digits)
    testPatientUser = await User.create({
      phone: `93${randomDigits}`,
      email: `ananya_${randomDigits}@example.com`,
      fullName: 'Smt. Ananya Deshmukh',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'patient',
      isPhoneVerified: true,
      status: 'active',
      dpdpConsent: {
        accepted: true,
        consentedAt: new Date(),
        policyVersion: 'DPDP-2023-V1.0',
      },
    });

    testPatientProfile = await PatientProfile.create({
      userId: testPatientUser._id,
      dateOfBirth: new Date('1958-04-12'),
      gender: 'female',
      bloodGroup: 'B+',
      allergies: ['Penicillin', 'Sulfa drugs'],
      chronicConditions: ['Stage IV Ovarian Carcinoma', 'Hypertension'],
      address: {
        street: 'Flat 402, Lotus Enclave, Baner Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411045',
        cluster: 'Pune-West-Baner',
      },
      emergencyContact: {
        name: 'Rohan Deshmukh (Son)',
        relationship: 'Son',
        phone: `99${randomDigits}`,
      },
    });

    // 4. Test Nurse User & Professional Profile & Credentials (9 + 4 + 8 digits = 10 digits)
    testNurseUser = await User.create({
      phone: `94${randomDigits}`,
      email: `priya_${randomDigits}@vivoquest.org`,
      fullName: 'Sister Priya Sharma',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'caregiver',
      isPhoneVerified: true,
      status: 'active',
      dpdpConsent: {
        accepted: true,
        consentedAt: new Date(),
        policyVersion: 'DPDP-2023-V1.0',
      },
    });

    testNurseProfile = await HealthcareProfessionalProfile.create({
      userId: testNurseUser._id,
      title: 'Senior Palliative Care Nurse',
      professionType: 'nurse',
      registrationNumber: `MNC-${randomDigits}`,
      registrationCouncil: 'Maharashtra Nursing Council',
      yearsOfExperience: 8,
      specializations: ['Palliative Oncology', 'Wound Debridement', 'Pain Management'],
      serviceClusters: ['Pune-Baner', 'Pune-Aundh'],
      verificationStatus: 'verified',
      rating: 4.9,
      totalVisitsCompleted: 42,
      isActiveForDispatch: true,
    });

    testNurseCredentials = await ProfessionalCredentials.create({
      professionalId: testNurseProfile._id,
      documentType: 'medical_council_registration',
      documentNumber: `MNC-${randomDigits}`,
      issuingAuthority: 'Maharashtra Nursing Council',
      uploadedFileId: new mongoose.Types.ObjectId(),
      verificationStatus: 'verified',
    });
  });

  after(async () => {
    // Cleanup any created artifacts
    if (superAdmin?._id) await User.findByIdAndDelete(superAdmin._id);
    if (standardAdmin?._id) await User.findByIdAndDelete(standardAdmin._id);
    if (testPatientUser?._id) {
      await User.findByIdAndDelete(testPatientUser._id);
      await PatientProfile.deleteMany({ userId: testPatientUser._id });
    }
    if (testNurseUser?._id) {
      await User.findByIdAndDelete(testNurseUser._id);
      await HealthcareProfessionalProfile.deleteMany({ userId: testNurseUser._id });
      await ProfessionalCredentials.deleteMany({
        $or: [{ professionalId: testNurseProfile?._id }, { userId: testNurseUser._id }],
      });
    }
    await AuditLog.deleteMany({
      action: { $in: ['user_deleted_permanently', 'user_status_updated'] },
    });
    await disconnectDatabase();
  });

  it('1. Successfully fetches complete patient profile details for admin modal inspection', async () => {
    const details = await getUserDetails(testPatientUser._id.toString());
    assert.ok(details, 'Should return user details');
    assert.equal(details.user.fullName, 'Smt. Ananya Deshmukh');
    assert.equal(details.user.role, 'patient');
    assert.ok(details.user.email.includes('ananya_'));
    assert.equal(details.user.dpdpConsent?.accepted, true, 'DPDP consent should be accepted');

    assert.ok(details.patientProfile, 'Should include patient profile');
    assert.equal(details.patientProfile.address.city, 'Pune');
    assert.equal(details.patientProfile.address.pincode, '411045');
    assert.equal(details.patientProfile.emergencyContact.name, 'Rohan Deshmukh (Son)');
    assert.deepEqual(details.patientProfile.chronicConditions, [
      'Stage IV Ovarian Carcinoma',
      'Hypertension',
    ]);
  });

  it('2. Successfully fetches complete healthcare professional profile details for admin modal inspection', async () => {
    const details = await getUserDetails(testNurseUser._id.toString());
    assert.ok(details, 'Should return user details');
    assert.equal(details.user.fullName, 'Sister Priya Sharma');
    assert.equal(details.user.role, 'caregiver');

    assert.ok(details.professionalProfile, 'Should include professional profile');
    assert.ok(details.professionalProfile.registrationNumber.startsWith('MNC-'));
    assert.equal(details.professionalProfile.registrationCouncil, 'Maharashtra Nursing Council');
    assert.equal(details.professionalProfile.yearsOfExperience, 8);
    assert.ok(details.professionalProfile.specializations.includes('Palliative Oncology'));
  });

  it('3. Can suspend/stop and reactivate user access with audit logging', async () => {
    // Suspend patient access
    const suspended = await updateUserStatus(
      testPatientUser._id.toString(),
      'suspended',
      standardAdmin
    );
    assert.equal(suspended.status, 'suspended');

    const freshPatient = await User.findById(testPatientUser._id);
    assert.equal(freshPatient?.status, 'suspended');

    // Reactivate patient access
    const reactivated = await updateUserStatus(
      testPatientUser._id.toString(),
      'active',
      standardAdmin
    );
    assert.equal(reactivated.status, 'active');
  });

  it('4. Rejects self-deletion safeguards', async () => {
    await assert.rejects(
      async () => {
        await deleteUserPermanently(standardAdmin._id.toString(), standardAdmin);
      },
      {
        message: 'Forbidden: You cannot delete your own administrator account.',
      }
    );
  });

  it('5. Rejects unauthorized deletion of super_admin by standard admin', async () => {
    await assert.rejects(
      async () => {
        await deleteUserPermanently(superAdmin._id.toString(), standardAdmin);
      },
      {
        message: 'Forbidden: Only a Super Admin can delete a Super Admin account.',
      }
    );
  });

  it('6. Permanently deletes patient user and cascades removal of patient profile to reclaim storage', async () => {
    const result = await deleteUserPermanently(testPatientUser._id.toString(), standardAdmin);
    assert.equal(result.success, true);
    assert.equal(result.deletedUserId, testPatientUser._id.toString());

    // Verify User document is deleted from MongoDB
    const checkUser = await User.findById(testPatientUser._id);
    assert.equal(checkUser, null, 'User should be null in MongoDB');

    // Verify PatientProfile document is deleted
    const checkProfile = await PatientProfile.findOne({ userId: testPatientUser._id });
    assert.equal(checkProfile, null, 'PatientProfile should be cascade deleted');

    // Verify AuditLog record was created
    const audit = await AuditLog.findOne({
      action: 'user_deleted_permanently',
      targetId: testPatientUser._id.toString(),
    });
    assert.ok(audit, 'Audit log must record permanent deletion');
    assert.equal(audit.actorId.toString(), standardAdmin._id.toString());
  });

  it('7. Permanently deletes healthcare professional user and cascades removal of profile & credentials', async () => {
    const result = await deleteUserPermanently(testNurseUser._id.toString(), standardAdmin);
    assert.equal(result.success, true);
    assert.equal(result.deletedUserId, testNurseUser._id.toString());

    // Verify User document is deleted
    const checkUser = await User.findById(testNurseUser._id);
    assert.equal(checkUser, null, 'Healthcare professional user should be deleted');

    // Verify HealthcareProfessionalProfile is deleted
    const checkProfile = await HealthcareProfessionalProfile.findOne({
      userId: testNurseUser._id,
    });
    assert.equal(checkProfile, null, 'Professional profile should be cascade deleted');

    // Verify ProfessionalCredentials is deleted
    const checkCreds = await ProfessionalCredentials.findOne({
      professionalId: testNurseProfile._id,
    });
    assert.equal(checkCreds, null, 'Professional credentials should be cascade deleted');
  });
});
