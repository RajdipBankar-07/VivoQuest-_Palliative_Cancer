import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  User,
  PatientProfile,
  CaregiverPlan,
  CaregiverSubscription,
  FieldVisit,
  HealthcareProfessionalProfile,
} from '../src/models/index.js';
import {
  patientApi,
  SessionExpiredError,
  ApiError,
} from '../../mobile-patient/src/services/apiClient';
import { authStorage } from '../../mobile-patient/src/services/authStorage';

describe('VivoQuest — Patient App Phase 1 Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  const app = createApp();

  // Test accounts
  const patientAPhone = '9876540001';
  let patientAId: string;
  let patientAToken: string;

  const patientBPhone = '9876540002';
  let patientBId: string;
  let patientBToken: string;

  const patientEmptyPhone = '9876540003';
  let patientEmptyId: string;
  let patientEmptyToken: string;

  const caregiverPhone = '9876540011';
  let caregiverId: string;

  const caregiverNoPhone = '9876540012';
  let caregiverNoPhoneId: string;

  let testPlanId: string;
  let testSubscriptionId: string;
  let tomorrowDateStr: string;
  let inThreeDaysStr: string;
  let yesterdayDateStr: string;

  before(async () => {
    await connectDatabase();

    // Compute dates in IST
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    tomorrowDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tomorrow);
    inThreeDaysStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(inThreeDays);
    yesterdayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(yesterday);

    // Clean up any existing test records
    const testPhones = [
      patientAPhone,
      patientBPhone,
      patientEmptyPhone,
      caregiverPhone,
      caregiverNoPhone,
      '9876540099',
    ];
    await User.deleteMany({
      $or: [{ phone: { $in: testPhones } }, { email: { $regex: 'p1@vivoquest\\.in' } }],
    });
    await HealthcareProfessionalProfile.deleteMany({ registrationNumber: 'MNC-2023-88992' });
    await CaregiverSubscription.deleteMany({ subscriptionNumber: { $regex: 'TEST-P1-SUB' } });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-P1-VST' } });

    // 1. Register Primary Caregiver (Nurse)
    const resCaregiver = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sister Anita Dsouza',
        phone: caregiverPhone,
        email: 'anita.dsouza.p1@vivoquest.in',
        role: 'professional',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resCaregiver.status, 201);
    caregiverId = resCaregiver.body.data.user.id;

    // Create/update healthcare professional profile for Nurse
    await HealthcareProfessionalProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(caregiverId) },
      {
        title: 'Sister',
        professionType: 'nurse',
        specializations: ['Palliative Oncology Care', 'Wound Management', 'Pain Monitoring'],
        registrationNumber: 'MNC-2023-88992',
        registrationCouncil: 'Maharashtra Nursing Council',
        yearsOfExperience: 7,
        serviceClusters: ['Pune Central', 'Pune West'],
        verificationStatus: 'verified',
        bio: 'Dedicated palliative oncology nurse specialized in holistic bedside comfort care.',
        rating: 4.9,
      },
      { upsert: true, new: true }
    );

    // 2. Register Caregiver with Missing Contact Details (for test 6)
    const resCgNoPhone = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Nurse Without Phone',
        phone: caregiverNoPhone,
        email: 'nophone.cg.p1@vivoquest.in',
        role: 'caregiver',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resCgNoPhone.status, 201);
    caregiverNoPhoneId = resCgNoPhone.body.data.user.id;

    // 3. Register Patient A
    const resPatA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Vikram Joshi',
        phone: patientAPhone,
        email: 'vikram.joshi.p1@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatA.status, 201);
    patientAId = resPatA.body.data.user.id;
    patientAToken = resPatA.body.data.token;

    await PatientProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(patientAId) },
      {
        gender: 'male',
        address: {
          street: 'Bungalow 7, Model Colony',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411016',
          cluster: 'Pune Central',
        },
        emergencyContact: {
          name: 'Radhika Joshi',
          relationship: 'Daughter',
          phone: '9822001122',
        },
      },
      { new: true }
    );

    // 4. Register Patient B (Isolated)
    const resPatB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Kavita Menon',
        phone: patientBPhone,
        email: 'kavita.menon.p1@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatB.status, 201);
    patientBId = resPatB.body.data.user.id;
    patientBToken = resPatB.body.data.token;

    // 5. Register Patient Empty (Unassigned, zero visits)
    const resPatEmpty = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Suresh Unassigned',
        phone: patientEmptyPhone,
        email: 'suresh.empty.p1@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatEmpty.status, 201);
    patientEmptyId = resPatEmpty.body.data.user.id;
    patientEmptyToken = resPatEmpty.body.data.token;

    // 6. Seed Plan
    const plan = await CaregiverPlan.findOneAndUpdate(
      { planCode: 'TEST-P1-PLAN' },
      {
        planCode: 'TEST-P1-PLAN',
        title: 'Phase 1 Comprehensive Palliative Nursing Plan',
        planType: 'monthly_subscription',
        category: 'palliative',
        durationDays: 30,
        totalVisitsIncluded: 10,
        hoursPerVisit: 4,
        customerPrice: 16000,
        caregiverPayout: 11000,
        features: ['Registered nurse visits', 'Pain management', 'Vitals logging'],
        description: 'Palliative nursing care for homebound patients.',
        isActive: true,
        isPopular: true,
      },
      { upsert: true, new: true }
    );
    testPlanId = plan._id.toString();

    // 7. Seed Active Subscription for Patient A with Assigned Nurse
    const sub = await CaregiverSubscription.create({
      subscriptionNumber: 'TEST-P1-SUB-001',
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientName: 'Vikram Joshi',
      patientPhone: patientAPhone,
      planId: plan._id,
      planTitle: plan.title,
      startDate: new Date('2026-10-20'),
      endDate: new Date('2026-11-20'),
      totalVisitsIncluded: 10,
      visitsCompleted: 2,
      visitsRemaining: 8,
      status: 'active',
      assignedCaregiverId: new mongoose.Types.ObjectId(caregiverId),
      assignedCaregiverName: 'Sister Anita Dsouza',
      assignedCaregiverPhone: caregiverPhone,
      pricing: {
        customerPrice: 16000,
        caregiverPayout: 11000,
        platformCommission: 5000,
        paymentStatus: 'paid',
        paymentMethod: 'sandbox_upi',
      },
      carePlanNotes: 'Patient requires gentle vitals assessment and pain tracking.',
    });
    testSubscriptionId = sub._id.toString();

    // 8. Start ephemeral HTTP server for live apiClient testing
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    const testPhones = [
      patientAPhone,
      patientBPhone,
      patientEmptyPhone,
      caregiverPhone,
      caregiverNoPhone,
    ];
    await User.deleteMany({
      $or: [{ phone: { $in: testPhones } }, { email: { $regex: 'p1@vivoquest\\.in' } }],
    });
    await PatientProfile.deleteMany({ 'address.pincode': '411016' });
    await HealthcareProfessionalProfile.deleteMany({ registrationNumber: 'MNC-2023-88992' });
    await CaregiverSubscription.deleteMany({ subscriptionNumber: { $regex: 'TEST-P1-SUB' } });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-P1-VST' } });
    await CaregiverPlan.deleteMany({ planCode: 'TEST-P1-PLAN' });
    await authStorage.clearSession();
    await disconnectDatabase();
  });

  // =========================================================================
  // REQUIREMENT 1: Authenticated Patient Views Own Assigned Caregiver
  // =========================================================================
  describe('1. Assigned Caregiver Details for Authenticated Patient', () => {
    it('returns assigned caregiver details via GET /api/v1/patients/me/caregiver', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/caregiver')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const data = res.body.data;

      assert.ok(data.assignedCaregiver, 'Must return assignedCaregiver object');
      assert.strictEqual(data.assignedCaregiver.name, 'Sister Anita Dsouza');
      assert.strictEqual(data.assignedCaregiver.phone, caregiverPhone);
      assert.strictEqual(data.assignedCaregiver.roleCategory, 'nurse');
      assert.ok(data.assignedCaregiver.role.includes('Nurse'), 'Role must reflect nursing background');
      assert.strictEqual(data.assignedCaregiver.assignmentStatus, 'active');
      assert.strictEqual(data.assignedCaregiver.assignmentSource, 'subscription');

      // Check service & shift info
      assert.ok(data.assignedCaregiver.serviceInfo, 'Must return serviceInfo');
      assert.strictEqual(
        data.assignedCaregiver.serviceInfo.planTitle,
        'Phase 1 Comprehensive Palliative Nursing Plan'
      );
      assert.strictEqual(data.assignedCaregiver.serviceInfo.hoursPerVisit, 4);
      assert.strictEqual(data.assignedCaregiver.serviceInfo.visitsRemaining, 8);
      assert.strictEqual(data.assignedCaregiver.serviceInfo.totalVisitsIncluded, 10);

      // Verify privacy: No passwordHash, contractor payout, or platform commission exposed
      assert.strictEqual(data.assignedCaregiver.passwordHash, undefined);
      assert.strictEqual(data.assignedCaregiver.caregiverPayout, undefined);
      assert.strictEqual(data.assignedCaregiver.platformCommission, undefined);
    });

    it('returns caregiver details via mobile client method patientApi.getAssignedCaregiver()', async () => {
      await authStorage.setToken(patientAToken);
      const caregiver = await patientApi.getAssignedCaregiver(baseUrl);

      assert.ok(caregiver, 'Client must return assigned caregiver');
      assert.strictEqual(caregiver.name, 'Sister Anita Dsouza');
      assert.strictEqual(caregiver.phone, caregiverPhone);
      assert.strictEqual(caregiver.roleCategory, 'nurse');
    });
  });

  // =========================================================================
  // REQUIREMENT 2: Patient Without Assignment Receives Correct Empty State
  // =========================================================================
  describe('2. Empty State for Patient Without Assigned Caregiver', () => {
    it('returns clear empty state when no caregiver is assigned', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/caregiver')
        .set('Authorization', `Bearer ${patientEmptyToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.assignedCaregiver, null);
      assert.strictEqual(res.body.data.message, 'No caregiver assigned yet.');
    });

    it('client method returns null for unassigned patient', async () => {
      await authStorage.setToken(patientEmptyToken);
      const caregiver = await patientApi.getAssignedCaregiver(baseUrl);
      assert.strictEqual(caregiver, null);
    });
  });

  // =========================================================================
  // REQUIREMENT 3: Patient Cannot Access Another Patient\'s Caregiver Details
  // =========================================================================
  describe('3. Strict Scoping & Cross-Patient Privacy Enforcement', () => {
    it('rejects Patient B attempting to access Patient A\'s caregiver with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/patients/${patientAId}/caregiver`)
        .set('Authorization', `Bearer ${patientBToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.message.includes('strictly authorized to view only their own records'));
    });

    it('Patient B calling /me/caregiver receives only their own empty status, not Patient A\'s nurse', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/caregiver')
        .set('Authorization', `Bearer ${patientBToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.assignedCaregiver, null);
    });
  });

  // =========================================================================
  // REQUIREMENT 4 & 5: Upcoming Visits Scoping, Chronology, and Classification
  // =========================================================================
  describe('4 & 5. Upcoming Visit Schedule Scoping, Sorting, and Classification', () => {
    before(async () => {
      // Seed visits for Patient A:
      // Visit A1: Tomorrow 10:00 (assigned) -> upcoming #1
      await FieldVisit.create({
        visitNumber: 'TEST-P1-VST-A1',
        visitType: 'clinical_care',
        status: 'assigned',
        providerId: new mongoose.Types.ObjectId(caregiverId),
        providerName: 'Sister Anita Dsouza',
        providerRole: 'Registered Nurse',
        providerPhone: caregiverPhone,
        patientId: new mongoose.Types.ObjectId(patientAId),
        patientDetails: {
          fullName: 'Vikram Joshi',
          phone: patientAPhone,
          address: 'Bungalow 7, Model Colony',
          city: 'Pune',
          pincode: '411016',
          cluster: 'Pune Central',
          instructions: 'Please have blood sugar log ready on bedside table.',
        },
        scheduledDate: tomorrowDateStr,
        timeSlot: '10:00 - 11:30',
        timestamps: { assignedAt: new Date() },
      });

      // Visit A2: In 3 days 14:00 (accepted) -> upcoming #2
      await FieldVisit.create({
        visitNumber: 'TEST-P1-VST-A2',
        visitType: 'physiotherapy',
        status: 'accepted',
        providerId: new mongoose.Types.ObjectId(caregiverId),
        providerName: 'Sister Anita Dsouza',
        providerRole: 'Registered Nurse',
        providerPhone: caregiverPhone,
        patientId: new mongoose.Types.ObjectId(patientAId),
        patientDetails: {
          fullName: 'Vikram Joshi',
          phone: patientAPhone,
          address: 'Bungalow 7, Model Colony',
          city: 'Pune',
          pincode: '411016',
          cluster: 'Pune Central',
        },
        scheduledDate: inThreeDaysStr,
        timeSlot: '14:00 - 15:00',
        timestamps: { assignedAt: new Date() },
      });

      // Visit A3: In 2 days (cancelled) -> MUST NOT appear in upcoming!
      await FieldVisit.create({
        visitNumber: 'TEST-P1-VST-A3-CANCELLED',
        visitType: 'nursing_procedure',
        status: 'cancelled',
        providerId: new mongoose.Types.ObjectId(caregiverId),
        providerName: 'Sister Anita Dsouza',
        providerRole: 'Registered Nurse',
        providerPhone: caregiverPhone,
        patientId: new mongoose.Types.ObjectId(patientAId),
        patientDetails: {
          fullName: 'Vikram Joshi',
          phone: patientAPhone,
          address: 'Bungalow 7, Model Colony',
          city: 'Pune',
          pincode: '411016',
          cluster: 'Pune Central',
        },
        scheduledDate: tomorrowDateStr,
        timeSlot: '16:00 - 17:00',
        timestamps: { assignedAt: new Date(), cancelledAt: new Date() },
      });

      // Visit A4: Yesterday (completed) -> past
      await FieldVisit.create({
        visitNumber: 'TEST-P1-VST-A4-PAST',
        visitType: 'clinical_care',
        status: 'completed',
        providerId: new mongoose.Types.ObjectId(caregiverId),
        providerName: 'Sister Anita Dsouza',
        providerRole: 'Registered Nurse',
        providerPhone: caregiverPhone,
        patientId: new mongoose.Types.ObjectId(patientAId),
        patientDetails: {
          fullName: 'Vikram Joshi',
          phone: patientAPhone,
          address: 'Bungalow 7, Model Colony',
          city: 'Pune',
          pincode: '411016',
          cluster: 'Pune Central',
        },
        scheduledDate: yesterdayDateStr,
        timeSlot: '09:00 - 10:30',
        timestamps: {
          assignedAt: new Date(Date.now() - 86400000),
          completedAt: new Date(Date.now() - 82800000),
        },
        clinicalDocumentation: {
          recommendations: 'Continue deep breathing exercises twice daily.',
        },
      });

      // Seed a visit for Patient B (must NOT be visible to Patient A)
      await FieldVisit.create({
        visitNumber: 'TEST-P1-VST-B-PRIVATE',
        visitType: 'palliative_assessment',
        status: 'assigned',
        providerId: new mongoose.Types.ObjectId(caregiverId),
        providerName: 'Sister Anita Dsouza',
        providerRole: 'Registered Nurse',
        patientId: new mongoose.Types.ObjectId(patientBId),
        patientDetails: {
          fullName: 'Kavita Menon',
          phone: patientBPhone,
          address: 'Flat 10, Kalyani Nagar',
          city: 'Pune',
          pincode: '411006',
          cluster: 'Pune East',
        },
        scheduledDate: tomorrowDateStr,
        timeSlot: '12:00 - 13:00',
        timestamps: { assignedAt: new Date() },
      });
    });

    it('returns only visits belonging to the authenticated patient and sorts upcoming chronologically', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/visits')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const { upcoming, past, upcomingCount, pastCount } = res.body.data;

      // Upcoming count must be 2 (A1 and A2)
      assert.strictEqual(upcomingCount, 2);
      assert.strictEqual(upcoming.length, 2);

      // Verify Chronological Sort (earliest first: A1 tomorrow, then A2 in 3 days)
      assert.strictEqual(upcoming[0].visitNumber, 'TEST-P1-VST-A1');
      assert.strictEqual(upcoming[0].scheduledDate, tomorrowDateStr);
      assert.strictEqual(upcoming[0].timeSlot, '10:00 - 11:30');
      assert.strictEqual(upcoming[0].serviceName, 'Clinical Nursing Care');
      assert.strictEqual(upcoming[0].assignedCaregiver.name, 'Sister Anita Dsouza');
      assert.strictEqual(upcoming[0].instructions, 'Please have blood sugar log ready on bedside table.');

      assert.strictEqual(upcoming[1].visitNumber, 'TEST-P1-VST-A2');
      assert.strictEqual(upcoming[1].scheduledDate, inThreeDaysStr);

      // Verify Cancelled visit is strictly excluded from upcoming
      const hasCancelledInUpcoming = upcoming.some((v: any) => v.visitNumber === 'TEST-P1-VST-A3-CANCELLED');
      assert.strictEqual(hasCancelledInUpcoming, false, 'Cancelled visit must NOT appear in upcoming visits');

      // Verify Cross-Patient Privacy: Patient B visit is NOT in Patient A response
      const hasPatientBVisit = upcoming.some((v: any) => v.visitNumber === 'TEST-P1-VST-B-PRIVATE');
      assert.strictEqual(hasPatientBVisit, false, 'Must never leak other patients visits');

      // Verify Past Visits classification
      assert.ok(pastCount >= 2);
      const pastVisitNumbers = past.map((v: any) => v.visitNumber);
      assert.ok(pastVisitNumbers.includes('TEST-P1-VST-A4-PAST'), 'Completed visit must appear in past visits');
      assert.ok(pastVisitNumbers.includes('TEST-P1-VST-A3-CANCELLED'), 'Cancelled visit must appear in past visits');
    });

    it('patientApi.getVisits() retrieves upcoming and past visits for authenticated patient', async () => {
      await authStorage.setToken(patientAToken);
      const schedule = await patientApi.getVisits(baseUrl);

      assert.ok(schedule);
      assert.strictEqual(schedule.upcomingCount, 2);
      assert.strictEqual(schedule.upcoming[0].visitNumber, 'TEST-P1-VST-A1');
      assert.strictEqual(schedule.upcoming[0].serviceName, 'Clinical Nursing Care');
    });

    it('returns empty schedule when patient has no upcoming visits', async () => {
      await authStorage.setToken(patientEmptyToken);
      const schedule = await patientApi.getVisits(baseUrl);

      assert.ok(schedule);
      assert.strictEqual(schedule.upcomingCount, 0);
      assert.strictEqual(schedule.upcoming.length, 0);
      assert.strictEqual(schedule.pastCount, 0);
    });
  });

  // =========================================================================
  // REQUIREMENT 6: Missing Caregiver Contact Details Handled Gracefully
  // =========================================================================
  describe('6. Graceful Handling of Missing Caregiver Contact Details', () => {
    let patientNoPhoneCgId: string;
    let patientNoPhoneCgToken: string;

    before(async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Patient No Phone Caregiver',
          phone: '9876540099',
          email: 'nophone.patient.p1@vivoquest.in',
          role: 'patient',
          password: 'Password123!',
          consentAccepted: true,
        });
      patientNoPhoneCgId = res.body.data.user.id;
      patientNoPhoneCgToken = res.body.data.token;

      // Clear caregiver phone to simulate missing phone on record
      await User.updateOne(
        { _id: new mongoose.Types.ObjectId(caregiverNoPhoneId) },
        { $set: { phone: '' } }
      );

      // Field visit where provider has NO phone number
      await FieldVisit.create({
        visitNumber: 'TEST-P1-VST-NOPHONE',
        visitType: 'clinical_care',
        status: 'assigned',
        providerId: new mongoose.Types.ObjectId(caregiverNoPhoneId),
        providerName: 'Nurse Without Phone',
        providerRole: 'Caregiver Specialist',
        providerPhone: '', // Empty contact number
        patientId: new mongoose.Types.ObjectId(patientNoPhoneCgId),
        patientDetails: {
          fullName: 'Patient No Phone Caregiver',
          phone: '9876540099',
          address: 'Camp Area',
          city: 'Pune',
          pincode: '411001',
          cluster: 'Pune Central',
        },
        scheduledDate: tomorrowDateStr,
        timeSlot: '11:00 - 12:00',
        timestamps: { assignedAt: new Date() },
      });
    });

    after(async () => {
      await User.deleteOne({ _id: patientNoPhoneCgId });
      await FieldVisit.deleteOne({ visitNumber: 'TEST-P1-VST-NOPHONE' });
    });

    it('handles empty caregiver phone gracefully without breaking response structure', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/caregiver')
        .set('Authorization', `Bearer ${patientNoPhoneCgToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.assignedCaregiver);
      assert.strictEqual(res.body.data.assignedCaregiver.name, 'Nurse Without Phone');
      assert.strictEqual(res.body.data.assignedCaregiver.phone, undefined);
    });

    it('handles empty provider phone in visit schedule gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/visits')
        .set('Authorization', `Bearer ${patientNoPhoneCgToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.upcomingCount, 1);
      assert.strictEqual(res.body.data.upcoming[0].assignedCaregiver.name, 'Nurse Without Phone');
      assert.strictEqual(res.body.data.upcoming[0].assignedCaregiver.phone, undefined);
    });
  });

  // =========================================================================
  // REQUIREMENT 7: Invalid Identifiers and Unauthorized Requests
  // =========================================================================
  describe('7. Security Validation: Unauthorized & Invalid Identifiers', () => {
    it('rejects unauthenticated request to /me/caregiver with 401', async () => {
      const res = await request(app).get('/api/v1/patients/me/caregiver');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('rejects unauthenticated request to /me/visits with 401', async () => {
      const res = await request(app).get('/api/v1/patients/me/visits');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('rejects invalid ObjectId on /:id/caregiver with 400', async () => {
      const res = await request(app)
        .get('/api/v1/patients/invalid-object-id/caregiver')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.message.includes('Invalid patient identifier'));
    });

    it('rejects invalid ObjectId on /:id/visits with 400', async () => {
      const res = await request(app)
        .get('/api/v1/patients/invalid-object-id/visits')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.message.includes('Invalid patient identifier'));
    });
  });

  // =========================================================================
  // REQUIREMENT 8: Client API Session Expired & Error Handling
  // =========================================================================
  describe('8. Client SDK Error Handling & Session Expiration', () => {
    it('throws SessionExpiredError when token is invalid or expired', async () => {
      await authStorage.setToken('invalid-or-expired-jwt-token');

      await assert.rejects(
        async () => {
          await patientApi.getAssignedCaregiver(baseUrl);
        },
        (err: any) => {
          return err instanceof SessionExpiredError;
        }
      );
    });
  });

  // =========================================================================
  // REQUIREMENT 9: Regression Verification
  // =========================================================================
  describe('9. Regression Verification: Existing Patient Subscriptions & Plans Remain Intact', () => {
    it('verifies patient subscriptions API continues to return active packages', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/subscriptions')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length >= 1);
      assert.strictEqual(res.body.data[0].subscriptionNumber, 'TEST-P1-SUB-001');
    });

    it('verifies caregiver plans catalog endpoint functions correctly', async () => {
      const res = await request(app).get('/api/v1/patients/caregiver-plans');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length >= 1);
    });
  });
});
