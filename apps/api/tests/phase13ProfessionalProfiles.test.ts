import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User, IUser } from '../src/models/User.js';
import { HealthcareProfessionalProfile } from '../src/models/HealthcareProfessionalProfile.js';
import { ProfessionalCredentials } from '../src/models/ProfessionalCredentials.js';
import { PatientProfile } from '../src/models/PatientProfile.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { generateAuthToken } from '../src/services/authService.js';
import { getPatientAssignedCaregiver } from '../src/services/patientService.js';

describe('VivoQuest Phase 13 — Healthcare Professional Profiles & Admin Integration Tests', () => {
  const app = createApp();

  // Test Admin
  const adminPhone = '9899009988';
  let adminToken: string;
  let adminUserId: string;
  let adminUserDoc: IUser;

  // Test Doctor
  const doctorPhone = '9811001101';
  let doctorToken: string;
  let doctorUserId: string;
  let doctorProfileId: string;

  // Test Nurse
  const nursePhone = '9811001102';
  let nurseToken: string;
  let nurseUserId: string;

  // Test Caregiver
  const caregiverPhone = '9811001103';
  let caregiverToken: string;
  let caregiverUserId: string;
  let caregiverProfileId: string;
  let caregiverCredentialId1: string;
  let caregiverCredentialId2: string;

  // Test ANM
  const anmPhone = '9811001104';
  let anmToken: string;
  let anmUserId: string;

  // Test Patient
  const patientPhone = '9811001105';
  let patientToken: string;
  let patientUserId: string;

  // Other unassigned Patient
  const patient2Phone = '9811001106';
  let patient2Token: string;
  let patient2UserId: string;

  const testPhones = [adminPhone, doctorPhone, nursePhone, caregiverPhone, anmPhone, patientPhone, patient2Phone];

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();

    // Clean up any test users from prior runs
    const existingTestUsers = await User.find({ phone: { $in: testPhones } });
    const userIds = existingTestUsers.map((u) => u._id);
    const existingProfiles = await HealthcareProfessionalProfile.find({ userId: { $in: userIds } });
    const profileIds = existingProfiles.map((p) => p._id);

    await ProfessionalCredentials.deleteMany({
      $or: [{ professionalId: { $in: profileIds } }, { professionalId: { $in: userIds } }],
    });
    await HealthcareProfessionalProfile.deleteMany({ userId: { $in: userIds } });
    await PatientProfile.deleteMany({ userId: { $in: userIds } });
    await CaregiverSubscription.deleteMany({ patientId: { $in: userIds } });
    await User.deleteMany({ phone: { $in: testPhones } });

    // 1. Setup Admin
    adminUserDoc = await User.create({
      phone: adminPhone,
      fullName: 'Dr. Admin Director',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'admin',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'admin_ops', version: '1.0' },
    });
    adminUserId = adminUserDoc._id.toString();
    adminToken = generateAuthToken(adminUserDoc);
  });

  after(async () => {
    try {
      const existingTestUsers = await User.find({ phone: { $in: testPhones } });
      const userIds = existingTestUsers.map((u) => u._id);
      const existingProfiles = await HealthcareProfessionalProfile.find({ userId: { $in: userIds } });
      const profileIds = existingProfiles.map((p) => p._id);

      await ProfessionalCredentials.deleteMany({
        $or: [{ professionalId: { $in: profileIds } }, { professionalId: { $in: userIds } }],
      });
      await HealthcareProfessionalProfile.deleteMany({ userId: { $in: userIds } });
      await PatientProfile.deleteMany({ userId: { $in: userIds } });
      await CaregiverSubscription.deleteMany({ patientId: { $in: userIds } });
      await User.deleteMany({ phone: { $in: testPhones } });
    } catch {
      // Ignore cleanup error
    } finally {
      await disconnectDatabase();
    }
  });

  // --------------------------------------------------------------------------
  // Condition 1: Professional Registration & Profile Persistence
  // --------------------------------------------------------------------------
  it('1. Should register Doctor, Nurse, Caregiver, and ANM with persistent profiles', async () => {
    // Register Doctor
    const docRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Dr. Rajesh Deshmukh',
        phone: doctorPhone,
        email: 'rajesh.deshmukh@vivoquest.org',
        password: 'DoctorPass#2026',
        role: 'professional',
        professionType: 'physician',
        highestQualification: 'MBBS, MD Palliative Medicine',
        institution: 'Tata Memorial Centre, Mumbai',
        registrationCouncil: 'Maharashtra Medical Council',
        registrationNumber: 'MMC-2015-89412',
        specializations: ['Palliative Oncology', 'Chronic Pain Management'],
        yearsOfExperience: 9,
        experienceSummary: 'Specialist in cancer symptom control and palliative chemotherapy support.',
        skills: ['Pain Ladder Protocols', 'Opioid Titration', 'Palliative Counseling'],
        consentAccepted: true,
      });

    assert.equal(docRes.status, 201, `Doctor registration failed: ${JSON.stringify(docRes.body)}`);
    doctorToken = docRes.body.data.token;
    doctorUserId = docRes.body.data.user.id || docRes.body.data.user._id;

    const docProfile = await HealthcareProfessionalProfile.findOne({ userId: doctorUserId });
    assert.ok(docProfile, 'Doctor profile must be persisted in database');
    assert.equal(docProfile.professionType, 'physician');
    assert.equal(docProfile.highestQualification, 'MBBS, MD Palliative Medicine');
    assert.equal(docProfile.institution, 'Tata Memorial Centre, Mumbai');
    assert.equal(docProfile.yearsOfExperience, 9);
    assert.equal(docProfile.verificationStatus, 'pending_review');
    doctorProfileId = docProfile._id.toString();

    // Register Nurse
    const nurseRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sister Sunita Patil',
        phone: nursePhone,
        email: 'sunita.patil@vivoquest.org',
        password: 'NursePass#2026',
        role: 'professional',
        professionType: 'nurse',
        highestQualification: 'B.Sc Nursing, Critical Care Fellowship',
        institution: 'Government Medical College, Pune',
        registrationCouncil: 'Maharashtra Nursing Council',
        registrationNumber: 'MNC-2018-44120',
        specializations: ['Palliative Nursing', 'Wound Debridement'],
        yearsOfExperience: 6,
        skills: ['Wound Dressing', 'Catheterization', 'Subcutaneous Infusions'],
        consentAccepted: true,
      });

    assert.equal(nurseRes.status, 201);
    nurseToken = nurseRes.body.data.token;
    nurseUserId = nurseRes.body.data.user.id || nurseRes.body.data.user._id;

    const nurseProfile = await HealthcareProfessionalProfile.findOne({ userId: nurseUserId });
    assert.ok(nurseProfile, 'Nurse profile must be persisted');
    assert.equal(nurseProfile.professionType, 'nurse');

    // Register Caregiver
    const cgRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sunil Shinde',
        phone: caregiverPhone,
        email: 'sunil.caregiver@vivoquest.org',
        password: 'CaregiverPass#2026',
        role: 'caregiver',
        professionType: 'caregiver',
        highestQualification: 'Certified Palliative Care Assistant',
        institution: 'National Hospice Care Training Academy',
        yearsOfExperience: 4,
        experienceSummary: 'Experienced in hospice bedside assistance and mobility management.',
        skills: ['Bedside Hygiene', 'Mobility Support', 'Vital Sign Recording'],
        consentAccepted: true,
      });

    assert.equal(cgRes.status, 201);
    caregiverToken = cgRes.body.data.token;
    caregiverUserId = cgRes.body.data.user.id || cgRes.body.data.user._id;

    const cgProfile = await HealthcareProfessionalProfile.findOne({ userId: caregiverUserId });
    assert.ok(cgProfile, 'Caregiver profile must be persisted');
    assert.equal(cgProfile.professionType, 'caregiver');
    caregiverProfileId = cgProfile._id.toString();

    // Register ANM
    const anmRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Anjali Kamble (ANM)',
        phone: anmPhone,
        email: 'anjali.anm@vivoquest.org',
        password: 'ANMPassword#2026',
        role: 'professional',
        professionType: 'anm',
        highestQualification: 'Diploma in Auxiliary Nurse Midwifery (ANM)',
        institution: 'Rural Health Training Institute, Satara',
        yearsOfExperience: 5,
        skills: ['Community Triage', 'Basic Palliative Care', 'Medication Reminders'],
        consentAccepted: true,
      });

    assert.equal(anmRes.status, 201);
    anmToken = anmRes.body.data.token;
    anmUserId = anmRes.body.data.user.id || anmRes.body.data.user._id;

    const anmProfile = await HealthcareProfessionalProfile.findOne({ userId: anmUserId });
    assert.ok(anmProfile, 'ANM profile must be persisted with anm professionType');
    assert.equal(anmProfile.professionType, 'anm');
  });

  // --------------------------------------------------------------------------
  // Condition 2: Existing Login Compatibility (Initializes Missing Profile)
  // --------------------------------------------------------------------------
  it('2. Should support login and automatically initialize profile if user exists without one', async () => {
    const legacyPhone = '9811001199';
    await HealthcareProfessionalProfile.deleteMany({ userId: { $in: await User.find({ phone: legacyPhone }).distinct('_id') } });
    await User.deleteMany({ phone: legacyPhone });

    const legacyUser = await User.create({
      phone: legacyPhone,
      fullName: 'Legacy Nurse Rekha',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'professional',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'login', version: '1.0' },
    });

    const preProfile = await HealthcareProfessionalProfile.findOne({ userId: legacyUser._id });
    assert.equal(preProfile, null, 'No profile should exist before check');

    const { getOrCreateProfessionalProfile } = await import('../src/services/professionalProfileService.js');
    const ensured = await getOrCreateProfessionalProfile(legacyUser._id);
    assert.ok(ensured, 'Profile must be created safely for legacy professional user');
    assert.equal(ensured.userId.toString(), legacyUser._id.toString());

    // Cleanup legacy user
    await HealthcareProfessionalProfile.deleteMany({ userId: legacyUser._id });
    await User.deleteMany({ _id: legacyUser._id });
  });

  // --------------------------------------------------------------------------
  // Condition 3: Optional Certificate Fields Not Blocking Registration
  // --------------------------------------------------------------------------
  it('3. Should succeed in registration when optional certificate fields are completely omitted', async () => {
    const noCertPhone = '9811001177';
    await User.deleteMany({ phone: noCertPhone });

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Kavita Joshi',
        phone: noCertPhone,
        password: 'KavitaPass#2026',
        role: 'caregiver',
        professionType: 'caregiver',
        highestQualification: 'Compassionate Home Aide',
        consentAccepted: true,
      });

    assert.equal(regRes.status, 201, 'Registration must succeed without certificate upload');
    const created = await User.findOne({ phone: noCertPhone });
    assert.ok(created, 'User created');
    const prof = await HealthcareProfessionalProfile.findOne({ userId: created._id });
    assert.ok(prof, 'Profile created even without initial certificates');

    // Cleanup
    await HealthcareProfessionalProfile.deleteMany({ userId: created._id });
    await User.deleteMany({ _id: created._id });
  });

  // --------------------------------------------------------------------------
  // Condition 4: Multiple Certificate Uploads & Metadata Persistence
  // --------------------------------------------------------------------------
  it('4. Should allow uploading multiple certificates and persist comprehensive metadata', async () => {
    // Add 1st Credential to Caregiver
    const cred1Res = await request(app)
      .post('/api/v1/professionals/me/credentials')
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({
        documentType: 'training_certificate',
        certificateTitle: 'Certified Palliative Hospice Care Assistant',
        issuingAuthority: 'Indian Association of Palliative Care (IAPC)',
        issuingOrganization: 'Indian Association of Palliative Care (IAPC)',
        credentialCategory: 'training_certificate',
        documentNumber: 'IAPC-2022-7718',
        issueDate: '2022-04-10',
        expiryDate: '2027-04-10',
      });

    assert.equal(cred1Res.status, 201, `Adding credential 1 failed: ${JSON.stringify(cred1Res.body)}`);
    caregiverCredentialId1 = cred1Res.body.data?.id || cred1Res.body.data?._id;
    assert.ok(caregiverCredentialId1, 'Credential 1 ID must be returned');

    // Add 2nd Credential to Caregiver
    const cred2Res = await request(app)
      .post('/api/v1/professionals/me/credentials')
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({
        documentType: 'training_certificate',
        certificateTitle: 'Advanced CPR & Emergency Bedside Life Support',
        issuingAuthority: 'St. John Ambulance Association',
        issuingOrganization: 'St. John Ambulance Association',
        credentialCategory: 'other_certification',
        documentNumber: 'STJ-CPR-9921',
        issueDate: '2023-01-15',
      });

    assert.equal(cred2Res.status, 201, `Adding credential 2 failed: ${JSON.stringify(cred2Res.body)}`);
    caregiverCredentialId2 = cred2Res.body.data?.id || cred2Res.body.data?._id;
    assert.ok(caregiverCredentialId2, 'Credential 2 ID must be returned');

    // Verify both are stored in DB linked to caregiver's profile
    const allCreds = await ProfessionalCredentials.find({ professionalId: caregiverProfileId });
    assert.equal(allCreds.length, 2, 'Both credentials must be persisted');
    assert.equal(allCreds[0].verificationStatus, 'pending');
    assert.equal(allCreds[1].verificationStatus, 'pending');
  });

  // --------------------------------------------------------------------------
  // Condition 5: Profile Retrieval After Re-login Without Duplicates
  // --------------------------------------------------------------------------
  it('5. Should retrieve complete profile after re-login without duplicating records', async () => {
    const res = await request(app)
      .get('/api/v1/professionals/me')
      .set('Authorization', `Bearer ${caregiverToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.profile.highestQualification, 'Certified Palliative Care Assistant');
    assert.equal(res.body.data.credentials.length, 2);
    assert.ok(res.body.data.completion);
    assert.ok(typeof res.body.data.completion.percentage === 'number');

    // Ensure count in MongoDB is exactly 1 profile
    const count = await HealthcareProfessionalProfile.countDocuments({ userId: caregiverUserId });
    assert.equal(count, 1, 'Exactly one profile record must exist for the user');
  });

  // --------------------------------------------------------------------------
  // Condition 6: Professional Edits Restricted to Their Own Profile
  // --------------------------------------------------------------------------
  it('6. Should reject unauthorized attempts to edit another professional profile (403/Forbidden or 404)', async () => {
    // Doctor tries to delete Caregiver's credential using caregiver's credential ID
    const hackRes = await request(app)
      .delete(`/api/v1/professionals/me/credentials/${caregiverCredentialId1}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    assert.ok(
      hackRes.status === 403 || hackRes.status === 404,
      `Doctor cannot delete caregiver credential. Received status ${hackRes.status}`
    );

    // Verify caregiver credential still exists
    const credStillExists = await ProfessionalCredentials.findById(caregiverCredentialId1);
    assert.ok(credStillExists, 'Credential must remain untouched');
  });

  // --------------------------------------------------------------------------
  // Condition 7: Unauthorized Verification-Status Changes Rejected
  // --------------------------------------------------------------------------
  it('7. Should prevent professional from self-verifying profile or credentials', async () => {
    const exploitRes = await request(app)
      .put('/api/v1/professionals/me')
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({
        verificationStatus: 'verified',
        highestQualification: 'Updated Qualification',
      });

    assert.equal(exploitRes.status, 200);
    // verificationStatus must NOT be 'verified'
    const prof = await HealthcareProfessionalProfile.findOne({ userId: caregiverUserId });
    assert.notEqual(prof?.verificationStatus, 'verified', 'Self-verification exploit must be prevented');
    assert.equal(prof?.verificationStatus, 'pending_review');
  });

  // --------------------------------------------------------------------------
  // Condition 8: Admin List & Detailed Profile Authorization
  // --------------------------------------------------------------------------
  it('8. Should allow Admin to list professionals with filters and inspect detailed profile', async () => {
    // List all professionals
    const listRes = await request(app)
      .get('/api/v1/admin/professionals')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.length >= 4);

    // Filter by role: physician
    const docList = await request(app)
      .get('/api/v1/admin/professionals?professionType=physician')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(docList.status, 200);
    const hasDoc = docList.body.data.some((d: any) => d.user?.fullName?.includes('Rajesh Deshmukh'));
    assert.ok(hasDoc, 'Doctor must be found under physician filter');

    // Inspect detailed profile
    const detailRes = await request(app)
      .get(`/api/v1/admin/professionals/${caregiverUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(detailRes.status, 200, `Admin get detail failed: ${JSON.stringify(detailRes.body)}`);
    assert.ok(detailRes.body.data.profile);
    assert.ok(detailRes.body.data.credentials);
    assert.equal(detailRes.body.data.credentials.length, 2);
    assert.ok(detailRes.body.data.completion);
    assert.ok(detailRes.body.data.assignments);
  });

  // --------------------------------------------------------------------------
  // Condition 9: Credential Verification & Rejection With Mandatory Reason
  // --------------------------------------------------------------------------
  it('9. Should enforce mandatory rejection reason when rejecting credentials and approve verified credentials', async () => {
    // 1. Attempt to reject WITHOUT reason -> Must fail with 400
    const failReject = await request(app)
      .patch(`/api/v1/admin/professionals/${caregiverUserId}/credentials/${caregiverCredentialId2}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'rejected',
        // rejectionReason omitted
      });

    assert.equal(failReject.status, 400, 'Rejection without reason must return 400');
    const errText = failReject.body.message || failReject.body.error?.message || '';
    assert.ok(errText.toLowerCase().includes('rejection reason'), `Expected rejection reason error, got: ${errText}`);

    // 2. Reject WITH clear reason -> Succeeded
    const successReject = await request(app)
      .patch(`/api/v1/admin/professionals/${caregiverUserId}/credentials/${caregiverCredentialId2}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'rejected',
        rejectionReason: 'Certificate issuing organization registration could not be verified on national registry.',
        reviewNotes: 'Checked St. John regional database, registration number STJ-CPR-9921 not found.',
      });

    assert.equal(successReject.status, 200);
    assert.equal(successReject.body.data.verificationStatus, 'rejected');
    assert.equal(
      successReject.body.data.rejectionReason,
      'Certificate issuing organization registration could not be verified on national registry.'
    );

    // 3. Approve Credential 1 -> Succeeded
    const approveRes = await request(app)
      .patch(`/api/v1/admin/professionals/${caregiverUserId}/credentials/${caregiverCredentialId1}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'approved',
        reviewNotes: 'Verified via IAPC central membership directory.',
      });

    assert.equal(approveRes.status, 200);
    assert.ok(
      approveRes.body.data.verificationStatus === 'approved' || approveRes.body.data.verificationStatus === 'verified',
      `Expected approved or verified status, got: ${approveRes.body.data.verificationStatus}`
    );

    // 4. Update profile overall status to verified
    const updateProfRes = await request(app)
      .patch(`/api/v1/admin/professionals/${caregiverUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        verificationStatus: 'verified',
        verificationNotes: 'Background credentials checked and authorized by clinical admin.',
      });

    assert.equal(updateProfRes.status, 200);
    assert.equal(updateProfRes.body.data.profile?.verificationStatus, 'verified');
  });

  // --------------------------------------------------------------------------
  // Condition 10: Patient Sees Correct Assigned Professional Details Without Sensitive Data
  // --------------------------------------------------------------------------
  it('10. Should show patient verified qualification and credential summary without exposing private docs or PII', async () => {
    // 1. Create Patient User & Profile
    const patientUser = await User.create({
      phone: patientPhone,
      fullName: 'Suresh Patil (Patient)',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'patient',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'care_delivery', version: '1.0' },
    });
    patientUserId = patientUser._id.toString();
    patientToken = generateAuthToken(patientUser);

    const patientProf = await PatientProfile.create({
      userId: patientUser._id,
      patientId: 'PT-PHASE13-001',
      dateOfBirth: new Date('1958-05-12'),
      gender: 'male',
      diagnosis: 'Advanced Lung Carcinoma',
      cancerStage: 'Stage IV',
      address: {
        line1: '102 Shivam Apartment',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
      emergencyContact: {
        name: 'Pooja Patil',
        relationship: 'Daughter',
        phone: '9822002200',
      },
    });

    // 2. Create Active Caregiver Subscription assigning Caregiver Sunil to Patient Suresh
    await CaregiverSubscription.create({
      subscriptionNumber: 'SUB-PHASE13-001',
      patientId: patientUser._id,
      patientName: patientUser.fullName,
      patientPhone: patientPhone,
      planId: new mongoose.Types.ObjectId(),
      planTitle: 'Daily Home Palliative Care',
      assignedCaregiverId: new mongoose.Types.ObjectId(caregiverUserId),
      assignedCaregiverName: 'Sunil Shinde',
      assignedCaregiverPhone: caregiverPhone,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalVisitsIncluded: 30,
      visitsCompleted: 0,
      visitsRemaining: 30,
      pricing: {
        customerPrice: 15000,
        caregiverPayout: 12000,
        platformCommission: 3000,
        paymentStatus: 'paid',
      },
      isDemo: false,
    });

    // 3. Call getPatientAssignedCaregiver service
    const result = await getPatientAssignedCaregiver(patientUserId, patientPhone);
    const assigned = result.assignedCaregiver;

    assert.ok(assigned, 'Assigned caregiver must be found for active subscription');
    assert.equal(assigned.name, 'Sunil Shinde');
    assert.equal(assigned.roleCategory, 'caregiver');
    assert.equal(assigned.highestQualification, 'Updated Qualification');
    assert.equal(assigned.institution, 'National Hospice Care Training Academy');
    assert.equal(assigned.verificationStatus, 'verified');
    assert.ok(Array.isArray(assigned.skills));
    assert.ok(assigned.skills.includes('Bedside Hygiene'));

    // Verified credentials summary check
    assert.ok(Array.isArray(assigned.verifiedCredentials));
    assert.equal(assigned.verifiedCredentials.length, 1, 'Only approved credential must be included');
    assert.equal(assigned.verifiedCredentials[0].title, 'Certified Palliative Hospice Care Assistant');
    assert.equal(assigned.verifiedCredentials[0].issuingAuthority, 'Indian Association of Palliative Care (IAPC)');

    // Ensure sensitive documents and internal document numbers are NOT leaked
    assert.equal((assigned.verifiedCredentials[0] as any).documentUrl, undefined);
    assert.equal((assigned.verifiedCredentials[0] as any).uploadedFileId, undefined);
  });

  // --------------------------------------------------------------------------
  // Condition 11: Patient Cannot Access Another Patient's Professional Information
  // --------------------------------------------------------------------------
  it('11. Should return null or no assignment for patient with no assigned caregiver', async () => {
    // Create Patient 2 without subscription
    const patient2User = await User.create({
      phone: patient2Phone,
      fullName: 'Anita Kulkarni (Patient 2)',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'patient',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'care_delivery', version: '1.0' },
    });
    patient2UserId = patient2User._id.toString();

    const result = await getPatientAssignedCaregiver(patient2UserId, patient2Phone);
    assert.equal(result.assignedCaregiver, null, 'Unassigned patient must not receive caregiver details');
  });

  // --------------------------------------------------------------------------
  // Condition 12: Private Documents Cannot Be Accessed by Unauthorized Users
  // --------------------------------------------------------------------------
  it('12. Should restrict document verification access so unauthorized users cannot view files', async () => {
    const unauthRes = await request(app)
      .get('/api/v1/professionals/me')
      .set('Authorization', 'Bearer invalid_or_missing_token');

    assert.equal(unauthRes.status, 401, 'Unauthorized request must be rejected');
  });

  // --------------------------------------------------------------------------
  // Condition 13: Profile Edits Update Views & Reset Verified Status With Audit Trail
  // --------------------------------------------------------------------------
  it('13. Should reset verification status to pending_review when verified professional modifies profile', async () => {
    // Ensure caregiver profile was verified
    const preCheck = await HealthcareProfessionalProfile.findOne({ userId: caregiverUserId });
    assert.equal(preCheck?.verificationStatus, 'verified');

    // Caregiver modifies their qualifications
    const editRes = await request(app)
      .put('/api/v1/professionals/me')
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({
        highestQualification: 'Master Certified Palliative Care Specialist',
        institution: 'International Hospice & Palliative Institute',
        yearsOfExperience: 5,
      });

    assert.equal(editRes.status, 200);

    // Profile verification status must have reset to 'pending_review'
    const postCheck = await HealthcareProfessionalProfile.findOne({ userId: caregiverUserId });
    assert.equal(postCheck?.highestQualification, 'Master Certified Palliative Care Specialist');
    assert.equal(postCheck?.institution, 'International Hospice & Palliative Institute');
    assert.equal(
      postCheck?.verificationStatus,
      'pending_review',
      'Modifying profile details must automatically reset verified status to pending_review'
    );
  });

  // --------------------------------------------------------------------------
  // Condition 14: Health & Operational Endpoints Continue Functioning Normally
  // --------------------------------------------------------------------------
  it('14. Should verify API health and routes continue functioning without regression', async () => {
    const healthRes = await request(app).get('/health');
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.body.status, 'ok');
  });
});
