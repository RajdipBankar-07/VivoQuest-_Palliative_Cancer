import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { PatientProfile } from '../src/models/PatientProfile.js';
import { CaregiverPlan } from '../src/models/CaregiverPlan.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { FieldVisit } from '../src/models/FieldVisit.js';
import { DailyHealthUpdate } from '../src/models/DailyHealthUpdate.js';
import { seedAdminDemoData } from '../src/services/adminService.js';
import { activateCaregiverSubscription, suspendCaregiverSubscription } from '../src/services/caregiverPlanService.js';

describe('Milestone C — Patient Profile & Full Patient Details Test Suite', () => {
  const app = createApp();

  let adminToken: string;
  let adminUserId: string;
  let adminFullName: string;
  const adminPhone = '9899009900';

  let superAdminToken: string;
  const superAdminPhone = '9899000001';

  let patientToken: string;
  let patientUserId: string;
  const patientPhone = '9877006611';

  let unsubscribedPatientToken: string;
  let unsubscribedPatientId: string;
  const unsubscribedPhone = '9877006622';

  let isolatedPatientId: string;
  const isolatedPhone = '9877006633';

  let caregiverUserId: string;
  let caregiverName: string;
  const caregiverPhone = '9822441122';

  let planId: string;
  let testSubscriptionId: string;
  let testSubscriptionNumber: string;

  before(async () => {
    await connectDatabase();

    // Clean up test data
    await User.deleteMany({ phone: { $in: [patientPhone, unsubscribedPhone, isolatedPhone] } });
    await CaregiverSubscription.deleteMany({ patientPhone: { $in: [patientPhone, unsubscribedPhone, isolatedPhone] } });
    await FieldVisit.deleteMany({ 'patientDetails.phone': { $in: [patientPhone, unsubscribedPhone, isolatedPhone] } });
    await DailyHealthUpdate.deleteMany({ patientPhone: { $in: [patientPhone, unsubscribedPhone, isolatedPhone] } });

    await seedAdminDemoData();

    // 1. Admin login
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: adminPhone,
        otp: '123456',
        role: 'admin',
      });
    assert.equal(adminLoginRes.status, 200, 'Admin login should succeed');
    adminToken = adminLoginRes.body.data.token;
    adminUserId = adminLoginRes.body.data.user.id;
    adminFullName = adminLoginRes.body.data.user.fullName;

    // 2. Super Admin login
    const superAdminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: superAdminPhone,
        otp: '123456',
        role: 'super_admin',
      });
    assert.equal(superAdminLoginRes.status, 200, 'Super admin login should succeed');
    superAdminToken = superAdminLoginRes.body.data.token;

    // 3. Create Patient 1 (With Active Subscription, Profile, Visits, Vitals)
    const regPatientRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Rahul Sharma',
        phone: patientPhone,
        email: 'rahul.sharma.test@vivoquest.internal',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(regPatientRes.status, 201, 'Patient registration should succeed');
    patientToken = regPatientRes.body.data.token;
    patientUserId = regPatientRes.body.data.user.id;

    // Update Patient 1 Profile with rich test demographics
    await PatientProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(patientUserId) },
      {
        userId: new mongoose.Types.ObjectId(patientUserId),
        gender: 'male',
        dateOfBirth: new Date('1972-04-15'),
        bloodGroup: 'B+',
        primaryLanguage: 'Hindi',
        address: {
          street: '402, Lotus Towers, Baner Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411045',
          cluster: 'Pune',
        },
        emergencyContact: {
          name: 'Sunita Sharma',
          phone: '9877006699',
          relationship: 'Spouse',
        },
        chronicConditions: ['Type 2 Diabetes', 'Stage 3 Palliative Oncology'],
        allergies: ['Penicillin', 'Sulfa drugs'],
      },
      { upsert: true, new: true }
    );

    // 4. Create Patient 2 (Valid patient with Profile, but ZERO Subscriptions)
    const regUnsubRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Ananya Deshmukh',
        phone: unsubscribedPhone,
        email: 'ananya.deshmukh.test@vivoquest.internal',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(regUnsubRes.status, 201, 'Unsubscribed patient registration should succeed');
    unsubscribedPatientToken = regUnsubRes.body.data.token;
    unsubscribedPatientId = regUnsubRes.body.data.user.id;

    await PatientProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(unsubscribedPatientId) },
      {
        userId: new mongoose.Types.ObjectId(unsubscribedPatientId),
        gender: 'female',
        dateOfBirth: new Date('1988-08-20'),
        bloodGroup: 'O+',
        primaryLanguage: 'Marathi',
        address: {
          street: '12, Shanti Kunj, Aundh',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411007',
          cluster: 'Pune',
        },
        emergencyContact: {
          name: 'Rohan Deshmukh',
          phone: '9877006688',
          relationship: 'Brother',
        },
        chronicConditions: ['Mild Asthma'],
        allergies: [],
      },
      { upsert: true, new: true }
    );

    // 5. Create Patient 3 (Data Isolation Test Patient)
    const regIsolatedRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Vikram Joshi',
        phone: isolatedPhone,
        email: 'vikram.joshi.test@vivoquest.internal',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(regIsolatedRes.status, 201, 'Isolated patient registration should succeed');
    isolatedPatientId = regIsolatedRes.body.data.user.id;

    // 6. Caregiver User
    let cg = await User.findOne({ phone: caregiverPhone });
    if (!cg) {
      cg = await User.create({
        fullName: 'Sister Anita DSilva',
        phone: caregiverPhone,
        email: 'anita.caregiver@vivoquest.internal',
        role: 'caregiver',
        passwordHash: '$2a$10$wK1W8GqjV1dE8qfS9I4PueZ.qBwT6Y1oF.5yWfB3p1Z5F9jG3.P3m',
        isPhoneVerified: true,
        status: 'active',
        dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
      });
    }
    caregiverUserId = cg._id.toString();
    caregiverName = cg.fullName;

    // 7. Plan
    const plan = await CaregiverPlan.findOne({ isActive: true });
    assert.ok(plan, 'An active caregiver plan must exist');
    planId = plan!._id.toString();

    // 8. Activate subscription for Patient 1
    const sub = await activateCaregiverSubscription({
      patientId: patientUserId,
      planId,
      assignedCaregiverId: caregiverUserId,
      carePlanNotes: 'Palliative comfort care, daily vitals, and subcutaneous analgesia monitoring',
      emergencyContact: {
        name: 'Sunita Sharma',
        phone: '9877006699',
        relation: 'Spouse',
      },
      activatedBy: new mongoose.Types.ObjectId(adminUserId),
      actorName: adminFullName,
      actorRole: 'admin',
    });
    testSubscriptionId = sub.id;
    testSubscriptionNumber = sub.subscriptionNumber;

    // 9. Add Field Visits (Upcoming & Completed) for Patient 1
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    await FieldVisit.create([
      {
        visitNumber: `VIS-TEST-UPCOMING`,
        patientId: new mongoose.Types.ObjectId(patientUserId),
        patientDetails: {
          fullName: 'Rahul Sharma',
          phone: patientPhone,
          address: '402, Lotus Towers, Baner Road',
          city: 'Pune',
          pincode: '411045',
          cluster: 'Pune',
        },
        providerId: new mongoose.Types.ObjectId(caregiverUserId),
        providerName: caregiverName,
        providerRole: 'Bedside Caregiver',
        providerPhone: caregiverPhone,
        visitType: 'clinical_care',
        status: 'assigned',
        scheduledDate: tomorrowStr,
        timeSlot: '09:00 AM - 05:00 PM',
        timestamps: { assignedAt: new Date() },
      },
      {
        visitNumber: `VIS-TEST-PAST`,
        patientId: new mongoose.Types.ObjectId(patientUserId),
        patientDetails: {
          fullName: 'Rahul Sharma',
          phone: patientPhone,
          address: '402, Lotus Towers, Baner Road',
          city: 'Pune',
          pincode: '411045',
          cluster: 'Pune',
        },
        providerId: new mongoose.Types.ObjectId(caregiverUserId),
        providerName: caregiverName,
        providerRole: 'Bedside Caregiver',
        providerPhone: caregiverPhone,
        visitType: 'clinical_care',
        status: 'completed',
        scheduledDate: yesterdayStr,
        timeSlot: '09:00 AM - 05:00 PM',
        timestamps: { assignedAt: new Date(), completedAt: new Date() },
        clinicalDocumentation: {
          clinicalNotes: 'Patient comfortable, vitals stable, zero acute distress reported.',
          vitals: {
            bloodPressure: '120/80',
            pulse: 74,
            temperature: '98.6',
            spO2: 99,
          },
        },
      },
    ]);

    // 10. Add Daily Health Update (Clinical Vitals Observation)
    await DailyHealthUpdate.create({
      patientId: new mongoose.Types.ObjectId(patientUserId),
      submittedBy: {
        userId: new mongoose.Types.ObjectId(caregiverUserId),
        name: 'Sister Anita DSilva',
        relationship: 'caregiver',
      },
      submittedAt: new Date(),
      vitals: {
        bloodPressure: '122/82',
        pulse: 76,
        spO2: 98,
        temperature: 98.4,
        glucose: 110,
        painScale: 2,
      },
      symptoms: ['Mild fatigue'],
      notes: 'Appetite satisfactory, slept well, medication administered as prescribed.',
      reviewStatus: 'reviewed',
      isClinicallyVerified: true,
      riskIndicators: [],
    });

    // 11. Activate a subscription for Isolated Patient 3 to test isolation
    await activateCaregiverSubscription({
      patientId: isolatedPatientId,
      planId,
      carePlanNotes: 'Isolated patient plan notes',
      activatedBy: new mongoose.Types.ObjectId(adminUserId),
      actorName: adminFullName,
      actorRole: 'admin',
    });
  });

  after(async () => {
    // Cleanup
    await User.deleteMany({ phone: { $in: [patientPhone, unsubscribedPhone, isolatedPhone] } });
    await CaregiverSubscription.deleteMany({ patientPhone: { $in: [patientPhone, unsubscribedPhone, isolatedPhone] } });
    await FieldVisit.deleteMany({ 'patientDetails.phone': { $in: [patientPhone, unsubscribedPhone, isolatedPhone] } });
    await DailyHealthUpdate.deleteMany({ patientPhone: { $in: [patientPhone, unsubscribedPhone, isolatedPhone] } });
    await disconnectDatabase();
  });

  // ===========================================================================
  // 1. Authorization & Role Checks
  // ===========================================================================
  describe('1. Security & RBAC Enforcement on GET /api/v1/admin/patients/:id', () => {
    it('allows authorized Admin to access complete patient profile', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/patients/${patientUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200, 'Admin request must return 200 OK');
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.patient, 'Response must include patient account data');
      assert.equal(res.body.data.patient.id, patientUserId);
      assert.equal(res.body.data.patient.fullName, 'Rahul Sharma');
    });

    it('allows Super Admin to access complete patient profile', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/patients/${patientUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200, 'Super Admin request must return 200 OK');
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.patient.id, patientUserId);
    });

    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get(`/api/v1/admin/patients/${patientUserId}`);
      assert.equal(res.status, 401, 'Unauthenticated request must be rejected with 401');
    });

    it('rejects non-admin patient role with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/patients/${patientUserId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      assert.equal(res.status, 403, 'Patient trying to access admin endpoint must receive 403 Forbidden');
    });

    it('returns 400 Bad Request for malformed patient ObjectId', async () => {
      const res = await request(app)
        .get('/api/v1/admin/patients/invalid-patient-id-123')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400, 'Invalid ObjectId must return 400 Bad Request');
      const msg = res.body.error?.message || res.body.message || '';
      assert.match(msg, /invalid.*patient/i);
    });

    it('returns 404 Not Found for non-existent patient ObjectId', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/admin/patients/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 404, 'Non-existent patient must return 404 Not Found');
      const msg = res.body.error?.message || res.body.message || '';
      assert.match(msg, /not found/i);
    });
  });

  // ===========================================================================
  // 2. Patient Account & Verified Profile Coverage
  // ===========================================================================
  describe('2. Patient Account Information & Demographics (Section A)', () => {
    it('returns full account details without exposing secrets or passwords', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/patients/${patientUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const { patient } = res.body.data;

      assert.equal(patient.fullName, 'Rahul Sharma');
      assert.equal(patient.phone, patientPhone);
      assert.equal(patient.status, 'active');
      assert.equal(patient.role, 'patient');
      assert.ok(patient.memberSince, 'memberSince timestamp must be present');

      // Security check: must NEVER expose passwords, password hashes, or internal tokens
      assert.equal(patient.passwordHash, undefined);
      assert.equal(patient.password, undefined);
      assert.equal(patient.otp, undefined);
    });

    it('returns verified clinical demographics, address, and emergency contact', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/patients/${patientUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const { profile } = res.body.data.patient;

      assert.ok(profile, 'Verified profile data must exist');
      assert.equal(profile.gender, 'male');
      assert.equal(profile.bloodGroup, 'B+');
      assert.equal(profile.primaryLanguage, 'Hindi');
      assert.equal(profile.address.city, 'Pune');
      assert.equal(profile.address.state, 'Maharashtra');
      assert.equal(profile.emergencyContact.name, 'Sunita Sharma');
      assert.equal(profile.emergencyContact.relationship || profile.emergencyContact.relation, 'Spouse');
      assert.equal(profile.emergencyContact.phone, '9877006699');

      assert.deepEqual(profile.chronicConditions, ['Type 2 Diabetes', 'Stage 3 Palliative Oncology']);
      assert.deepEqual(profile.allergies, ['Penicillin', 'Sulfa drugs']);
    });
  });

  // ===========================================================================
  // 3. Subscriptions Overview & Lifecycle Actions (Section B)
  // ===========================================================================
  describe('3. Subscription Overview & Audit Linkage (Section B)', () => {
    it('returns all active and historical subscriptions with correct balance and pricing', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/patients/${patientUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const { subscriptions, activeSubscription, subscriptionsCount } = res.body.data;

      assert.equal(subscriptionsCount, 1);
      assert.ok(activeSubscription, 'Patient 1 must have an active subscription');
      assert.equal(activeSubscription.subscriptionNumber, testSubscriptionNumber);
      assert.equal(activeSubscription.status, 'active');
      assert.equal(activeSubscription.visitsRemaining, 30);
      assert.equal(activeSubscription.totalVisitsIncluded, 30);
      assert.equal(activeSubscription.visitsCompleted, 0);

      // Verify pricing summary
      assert.ok(activeSubscription.pricing.customerPrice > 0);
      assert.equal(activeSubscription.pricing.paymentStatus, 'paid');

      // Security check: internal contractor payout and margins should NOT be leaked
      assert.equal(activeSubscription.pricing.caregiverPayout, undefined);
      assert.equal(activeSubscription.pricing.platformCommission, undefined);
    });

    it('includes suspension history when subscription is suspended', async () => {
      // Suspend subscription via HTTP endpoint
      const suspendRes = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubscriptionId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Temporary hospitalization for scheduled chemotherapy' });

      assert.equal(suspendRes.status, 200, 'Suspension request should succeed');

      const res = await request(app)
        .get(`/api/v1/admin/patients/${patientUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const targetSub = res.body.data.subscriptions.find((s: any) => s.id === testSubscriptionId);
      assert.ok(targetSub);
      assert.equal(targetSub.status, 'suspended');
      assert.equal(targetSub.suspensionReason, 'Temporary hospitalization for scheduled chemotherapy');
      assert.ok(targetSub.suspendedAt);
    });
  });

  // ===========================================================================
  // 4. Caregiver & Visits Association (Section C)
  // ===========================================================================
  describe('4. Caregiver and Field Visits (Section C)', () => {
    it('returns assigned caregiver contact and separates upcoming vs past visits', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/patients/${patientUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const { assignedCaregiver, visits } = res.body.data;

      assert.ok(assignedCaregiver, 'Assigned caregiver must be populated');
      assert.equal(assignedCaregiver.name, caregiverName);
      assert.equal(assignedCaregiver.phone, caregiverPhone);

      // Verify visits
      assert.equal(visits.totalCount, 2);
      assert.equal(visits.upcoming.length, 1);
      assert.equal(visits.past.length, 1);

      assert.equal(visits.upcoming[0].visitNumber, 'VIS-TEST-UPCOMING');
      assert.equal(visits.upcoming[0].status, 'assigned');
      assert.equal(visits.upcoming[0].provider.name, caregiverName);

      assert.equal(visits.past[0].visitNumber, 'VIS-TEST-PAST');
      assert.equal(visits.past[0].status, 'completed');
    });
  });

  // ===========================================================================
  // 5. Protected Clinical Reports and Vitals (Section D)
  // ===========================================================================
  describe('5. Protected Care Reports & Vitals (Section D)', () => {
    it('returns clinical reports and latest vitals to authorized administrators', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/patients/${patientUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const { careReports } = res.body.data;

      assert.ok(careReports);
      assert.ok(careReports.totalCount >= 1);
      assert.ok(careReports.latestVitals, 'Latest vitals must be extracted');

      assert.equal(careReports.latestVitals.bloodPressure, '122/82');
      assert.equal(careReports.latestVitals.pulseRate, 76);
      assert.equal(careReports.latestVitals.oxygenSaturation, 98);
      assert.equal(careReports.latestVitals.temperature, 98.4);
      assert.equal(careReports.latestVitals.bloodGlucose, 110);
      assert.equal(careReports.latestVitals.painScale, 2);
    });
  });

  // ===========================================================================
  // 6. Patient Without Subscription (Requirement 4)
  // ===========================================================================
  describe('6. Patient Discovery Independent from Subscriptions (Requirement 4)', () => {
    it('returns complete profile for registered patient with ZERO subscriptions', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/patients/${unsubscribedPatientId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200, 'Unsubscribed patient must return 200 OK');
      assert.equal(res.body.success, true);

      const data = res.body.data;
      assert.equal(data.patient.id, unsubscribedPatientId);
      assert.equal(data.patient.fullName, 'Ananya Deshmukh');
      assert.equal(data.patient.phone, unsubscribedPhone);
      assert.equal(data.patient.profile.gender, 'female');
      assert.equal(data.patient.profile.bloodGroup, 'O+');

      // Verify empty subscriptions state
      assert.equal(data.subscriptionsCount, 0);
      assert.deepEqual(data.subscriptions, []);
      assert.equal(data.activeSubscription, null);
      assert.equal(data.assignedCaregiver, null);
      assert.equal(data.visits.totalCount, 0);
      assert.equal(data.careReports.totalCount, 0);
    });
  });

  // ===========================================================================
  // 7. Cross-Patient Isolation & Security Boundary
  // ===========================================================================
  describe('7. Cross-Patient Data Isolation Boundary', () => {
    it('strictly isolates subscriptions and visits between different patients', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/patients/${isolatedPatientId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = res.body.data;

      assert.equal(data.patient.id, isolatedPatientId);
      assert.equal(data.patient.fullName, 'Vikram Joshi');

      // Subscriptions must belong ONLY to Patient 3, not Patient 1
      assert.equal(data.subscriptionsCount, 1);
      assert.notEqual(data.subscriptions[0].id, testSubscriptionId);
      assert.equal(data.subscriptions[0].carePlanNotes, 'Isolated patient plan notes');

      // Patient 3 has zero visits, so Patient 1 visits must NOT leak into Patient 3
      assert.equal(data.visits.totalCount, 0);
    });
  });
});
