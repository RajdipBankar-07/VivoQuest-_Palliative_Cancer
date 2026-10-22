import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
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
  DailyHealthUpdate,
} from '../src/models/index.js';

describe('Phase 3 — Milestone 3.1: Patient & Caregiver Core API Exposure and Server Authorization', () => {
  const app = createApp();

  // Test users
  let patientAToken: string;
  let patientAId: string;
  const patientAPhone = '9876540001';

  let patientBToken: string;
  let patientBId: string;
  const patientBPhone = '9876540002';

  let patientEmptyToken: string;
  let patientEmptyId: string;
  const patientEmptyPhone = '9876540003';

  let caregiverAToken: string;
  let caregiverAId: string;
  const caregiverAPhone = '9876540011';

  let caregiverBToken: string; // Unassigned caregiver
  let caregiverBId: string;
  const caregiverBPhone = '9876540012';

  let supplierToken: string; // Incorrect role
  let supplierId: string;
  const supplierPhone = '9876540021';

  let adminToken: string;
  let adminId: string;
  const adminPhone = '9876540099';

  // Test entities
  let testPlanId: string;
  let testSubAId: string;
  let testSubCancelledId: string;
  let testVisitAId: string;

  before(async () => {
    await connectDatabase();

    // Clean up test entities
    const phones = [
      patientAPhone,
      patientBPhone,
      patientEmptyPhone,
      caregiverAPhone,
      caregiverBPhone,
      supplierPhone,
      adminPhone,
    ];
    await User.deleteMany({ phone: { $in: phones } });
    await PatientProfile.deleteMany({});
    await CaregiverSubscription.deleteMany({ subscriptionNumber: { $regex: 'TEST-M31-SUB' } });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-M31-VST' } });
    await DailyHealthUpdate.deleteMany({ 'submittedBy.name': { $regex: 'Milestone 3.1' } });

    // 1. Register Patient A
    const resPatA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Anand Kulkarni (Patient A)',
        phone: patientAPhone,
        email: 'anand.kulkarni.m31@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatA.status, 201);
    patientAToken = resPatA.body.data.token;
    patientAId = resPatA.body.data.user.id;

    // Update PatientProfile for Patient A with full demographic data
    await PatientProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(patientAId) },
      {
        gender: 'male',
        bloodGroup: 'B+',
        address: {
          street: 'Flat 402, Sunshine Towers, Dadar West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400028',
          cluster: 'Mumbai South',
        },
        emergencyContact: {
          name: 'Sunita Kulkarni',
          relationship: 'Wife',
          phone: '9820044552',
        },
        chronicConditions: ['Stage IV NSCLC', 'Hypertension'],
        allergies: ['Penicillin'],
        primaryLanguage: 'Marathi',
      },
      { upsert: true, new: true }
    );

    // 2. Register Patient B
    const resPatB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Meenakshi Iyer (Patient B)',
        phone: patientBPhone,
        email: 'meenakshi.iyer.m31@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatB.status, 201);
    patientBToken = resPatB.body.data.token;
    patientBId = resPatB.body.data.user.id;

    // 3. Register Patient Empty (no subscriptions, no visits)
    const resPatEmpty = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Rajesh Empty (Patient Empty)',
        phone: patientEmptyPhone,
        email: 'rajesh.empty.m31@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatEmpty.status, 201);
    patientEmptyToken = resPatEmpty.body.data.token;
    patientEmptyId = resPatEmpty.body.data.user.id;

    // 4. Register Caregiver A (Assigned professional)
    const resCaregiverA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Nurse Kavita Shinde, RN',
        phone: caregiverAPhone,
        email: 'kavita.shinde.m31@vivoquest.in',
        role: 'professional',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resCaregiverA.status, 201);
    caregiverAToken = resCaregiverA.body.data.token;
    caregiverAId = resCaregiverA.body.data.user.id;

    // 5. Register Caregiver B (Unassigned professional)
    const resCaregiverB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sister Anita Unassigned, RN',
        phone: caregiverBPhone,
        email: 'anita.unassigned.m31@vivoquest.in',
        role: 'professional',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resCaregiverB.status, 201);
    caregiverBToken = resCaregiverB.body.data.token;
    caregiverBId = resCaregiverB.body.data.user.id;

    // 6. Register Supplier (Incorrect Role)
    const resSupplier = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Apex Med DME Supplier',
        phone: supplierPhone,
        email: 'apex.dme.m31@vivoquest.in',
        role: 'supplier',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resSupplier.status, 201);
    supplierToken = resSupplier.body.data.token;
    supplierId = resSupplier.body.data.user.id;

    // 7. Register Admin
    const resAdmin = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Milestone 3.1 Super Admin',
        phone: adminPhone,
        email: 'admin.m31@vivoquest.in',
        role: 'admin',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resAdmin.status, 201);
    adminToken = resAdmin.body.data.token;
    adminId = resAdmin.body.data.user.id;

    // Ensure a test caregiver plan exists
    let plan = await CaregiverPlan.findOne({ planCode: 'PLAN-PAL-MONTHLY' });
    if (!plan) {
      plan = await CaregiverPlan.create({
        planCode: 'PLAN-PAL-MONTHLY',
        title: 'Monthly Comprehensive Palliative Care Package',
        planType: 'monthly_subscription',
        category: 'palliative',
        durationDays: 30,
        totalVisitsIncluded: 30,
        hoursPerVisit: 8,
        customerPrice: 32000,
        caregiverPayout: 22000,
        description: 'Dedicated bedside nursing and vitals surveillance',
        features: ['Daily registered nurse visit', 'Bedside vitals tracking'],
        isActive: true,
        isPopular: true,
      });
    }
    testPlanId = plan._id.toString();

    // Create Active Subscription for Patient A with Caregiver A assigned
    const now = new Date();
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const subA = await CaregiverSubscription.create({
      subscriptionNumber: 'TEST-M31-SUB-001',
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientName: 'Anand Kulkarni (Patient A)',
      patientPhone: patientAPhone,
      planId: plan._id,
      planTitle: plan.title,
      status: 'active',
      startDate: now,
      endDate: thirtyDaysLater,
      assignedCaregiverId: new mongoose.Types.ObjectId(caregiverAId),
      assignedCaregiverName: 'Nurse Kavita Shinde, RN',
      assignedCaregiverPhone: caregiverAPhone,
      totalVisitsIncluded: 30,
      visitsCompleted: 8,
      visitsRemaining: 22,
      pricing: {
        customerPrice: 32000,
        caregiverPayout: 22000,
        platformCommission: 10000,
        paymentStatus: 'paid',
        paymentMethod: 'online',
        razorpayPaymentId: 'pay_test_m31_001',
      },
      emergencyContact: {
        name: 'Sunita Kulkarni',
        phone: '9820044552',
        relation: 'Wife',
      },
      carePlanNotes: 'Patient requires morning nebulization and continuous pain score assessment.',
      isDemo: true,
    });
    testSubAId = subA._id.toString();

    // Create Cancelled Subscription for Patient B (assigned to Caregiver A) to test inactive filtering
    const subCancelled = await CaregiverSubscription.create({
      subscriptionNumber: 'TEST-M31-SUB-CANCELLED',
      patientId: new mongoose.Types.ObjectId(patientBId),
      patientName: 'Meenakshi Iyer (Patient B)',
      patientPhone: patientBPhone,
      planId: plan._id,
      planTitle: plan.title,
      status: 'cancelled',
      startDate: new Date(Date.now() - 60 * 24 * 3600 * 1000),
      endDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
      assignedCaregiverId: new mongoose.Types.ObjectId(caregiverAId),
      assignedCaregiverName: 'Nurse Kavita Shinde, RN',
      assignedCaregiverPhone: caregiverAPhone,
      totalVisitsIncluded: 15,
      visitsCompleted: 5,
      visitsRemaining: 10,
      pricing: {
        customerPrice: 18000,
        caregiverPayout: 12000,
        platformCommission: 6000,
        paymentStatus: 'paid',
      },
      isDemo: true,
    });
    testSubCancelledId = subCancelled._id.toString();

    // Create a completed FieldVisit for Patient A with Caregiver A
    const visitA = await FieldVisit.create({
      visitNumber: 'TEST-M31-VST-001',
      visitType: 'clinical_care',
      status: 'completed',
      providerId: new mongoose.Types.ObjectId(caregiverAId),
      providerName: 'Nurse Kavita Shinde, RN',
      providerRole: 'Palliative Registered Nurse',
      providerPhone: caregiverAPhone,
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientDetails: {
        fullName: 'Anand Kulkarni (Patient A)',
        phone: patientAPhone,
        address: 'Flat 402, Sunshine Towers, Dadar West',
        city: 'Mumbai',
        pincode: '400028',
        cluster: 'Mumbai South',
      },
      scheduledDate: new Date().toISOString().slice(0, 10),
      timeSlot: '10:00 - 11:30',
      timestamps: {
        assignedAt: new Date(Date.now() - 7200000),
        acceptedAt: new Date(Date.now() - 5400000),
        enRouteAt: new Date(Date.now() - 3600000),
        arrivedAt: new Date(Date.now() - 2700000),
        startedAt: new Date(Date.now() - 2400000),
        completedAt: new Date(Date.now() - 600000),
      },
      clinicalDocumentation: {
        vitals: {
          bloodPressure: '122/78',
          pulse: 74,
          spO2: 97,
          temperature: '98.4',
          respiratoryRate: 18,
        },
        clinicalNotes: 'Nebulization completed. Morning pain score rated 2/10. No acute distress.',
        proceduresPerformed: ['Vitals Surveillance', 'Nebulizer Therapy', 'Positioning'],
        recommendations: 'Continue current bronchodilator regimen and monitor fluid balance.',
        signedAt: new Date(),
      },
      isDemo: true,
    });
    testVisitAId = visitA._id.toString();

    // Create a DailyHealthUpdate for Patient A
    await DailyHealthUpdate.create({
      patientId: new mongoose.Types.ObjectId(patientAId),
      submittedBy: {
        name: 'Milestone 3.1 Submitter',
        relationship: 'patient',
      },
      submittedAt: new Date(),
      symptoms: ['Mild cough', 'Fatigue'],
      notes: 'Morning breathlessness relieved post nebulizer.',
      vitals: {
        bloodPressure: '124/80',
        pulse: 76,
        spO2: 98,
        temperature: 98.4,
        glucose: 112,
        painScale: 2,
      },
      isClinicallyVerified: false,
      reviewStatus: 'new',
      riskIndicators: [],
    });
  });

  after(async () => {
    // Clean up test data
    const phones = [
      patientAPhone,
      patientBPhone,
      patientEmptyPhone,
      caregiverAPhone,
      caregiverBPhone,
      supplierPhone,
      adminPhone,
    ];
    await User.deleteMany({ phone: { $in: phones } });
    await PatientProfile.deleteMany({});
    await CaregiverSubscription.deleteMany({ subscriptionNumber: { $regex: 'TEST-M31-SUB' } });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-M31-VST' } });
    await DailyHealthUpdate.deleteMany({ 'submittedBy.name': { $regex: 'Milestone 3.1' } });
    await disconnectDatabase();
  });

  // ===========================================================================
  // 1. GET /api/v1/patients/caregiver-plans (Catalog & Security)
  // ===========================================================================
  describe('1. Caregiver Plans Catalog (GET /api/v1/patients/caregiver-plans)', () => {
    it('should allow public / unauthenticated access to active caregiver plans', async () => {
      const res = await request(app).get('/api/v1/patients/caregiver-plans');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
    });

    it('should strictly CONCEAL contractor caregiver payout margins from public catalog', async () => {
      const res = await request(app).get('/api/v1/patients/caregiver-plans');
      assert.strictEqual(res.status, 200);
      for (const plan of res.body.data) {
        assert.strictEqual(plan.caregiverPayout, undefined, 'caregiverPayout must never be exposed');
        assert.strictEqual(plan.platformCommission, undefined, 'platformCommission must never be exposed');
        assert.ok(plan.customerPrice !== undefined, 'customerPrice should be visible');
        assert.ok(plan.title !== undefined, 'title should be visible');
        assert.ok(plan.features !== undefined, 'features should be visible');
      }
    });

    it('should filter caregiver plans by category', async () => {
      const res = await request(app)
        .get('/api/v1/patients/caregiver-plans')
        .query({ category: 'palliative' });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.every((p: any) => p.category === 'palliative'));
    });
  });

  // ===========================================================================
  // 2. GET /api/v1/patients/me/subscriptions (Subscriptions & Balance Ledger)
  // ===========================================================================
  describe('2. Patient Subscriptions (GET /api/v1/patients/me/subscriptions)', () => {
    it('should allow authenticated patient to retrieve their own subscriptions and visit balance', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/subscriptions')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 1);
      const sub = res.body.data[0];
      assert.strictEqual(sub.subscriptionNumber, 'TEST-M31-SUB-001');
      assert.strictEqual(sub.status, 'active');
      assert.strictEqual(sub.visitsRemaining, 22);
      assert.strictEqual(sub.totalVisitsIncluded, 30);
      assert.strictEqual(sub.visitsCompleted, 8);
      assert.strictEqual(sub.assignedCaregiver.name, 'Nurse Kavita Shinde, RN');
      assert.strictEqual(sub.assignedCaregiver.phone, caregiverAPhone);
    });

    it('should strictly EXCLUDE caregiver payout and platform commission from subscription response', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/subscriptions')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      const sub = res.body.data[0];
      assert.strictEqual(sub.pricing.customerPrice, 32000);
      assert.strictEqual(sub.pricing.caregiverPayout, undefined, 'caregiverPayout must be stripped');
      assert.strictEqual(sub.pricing.platformCommission, undefined, 'platformCommission must be stripped');
    });

    it('should REJECT unauthenticated access with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/patients/me/subscriptions');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should FORBID unauthorized role (supplier) with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/subscriptions')
        .set('Authorization', `Bearer ${supplierToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('should enforce CROSS-PATIENT ISOLATION: Patient B cannot view Patient A subscription', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/subscriptions')
        .set('Authorization', `Bearer ${patientBToken}`);

      assert.strictEqual(res.status, 200);
      // Patient B has only their cancelled subscription, not Patient A's active one
      const subNumbers = res.body.data.map((s: any) => s.subscriptionNumber);
      assert.ok(!subNumbers.includes('TEST-M31-SUB-001'), "Patient B must never see Patient A's subscription");
    });

    it('should return EMPTY RESULTS (200 with count 0) when patient has no subscriptions', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/subscriptions')
        .set('Authorization', `Bearer ${patientEmptyToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 0);
      assert.deepStrictEqual(res.body.data, []);
    });
  });

  // ===========================================================================
  // 3. GET /api/v1/patients/me/care-reports (Reports & Bedside Vitals)
  // ===========================================================================
  describe('3. Patient Care Reports (GET /api/v1/patients/me/care-reports)', () => {
    it('should allow authenticated patient to retrieve clinical visit reports and bedside vitals', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/care-reports')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.count >= 2, 'Should include both field visit and daily update');
      assert.strictEqual(res.body.summary.fieldVisits, 1);
      assert.strictEqual(res.body.summary.dailyUpdates, 1);

      // Verify clinical field visit report details
      const visitReport = res.body.data.find((r: any) => r.sourceType === 'field_visit');
      assert.ok(visitReport, 'Must contain field visit report');
      assert.strictEqual(visitReport.providerOrSubmitterName, 'Nurse Kavita Shinde, RN');
      assert.strictEqual(visitReport.vitals.bloodPressure, '122/78');
      assert.strictEqual(visitReport.vitals.pulseRate, 74);
      assert.strictEqual(visitReport.vitals.oxygenSaturation, 97);
      assert.ok(visitReport.proceduresDone.includes('Nebulizer Therapy'));
    });

    it('should REJECT unauthenticated access with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/patients/me/care-reports');
      assert.strictEqual(res.status, 401);
    });

    it('should enforce CROSS-PATIENT ISOLATION: Patient B cannot view Patient A care reports', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/care-reports')
        .set('Authorization', `Bearer ${patientBToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 0);
      assert.deepStrictEqual(res.body.data, []);
    });

    it('should return EMPTY RESULTS (200 with count 0) when patient has no clinical reports', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/care-reports')
        .set('Authorization', `Bearer ${patientEmptyToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 0);
      assert.deepStrictEqual(res.body.data, []);
    });
  });

  // ===========================================================================
  // 4. Provider Assigned-Patients Listing (Both endpoints)
  // ===========================================================================
  describe('4. Caregiver Assigned Patients (GET /api/v1/visits/provider/assigned-patients & /api/v1/patients/assigned-to-me)', () => {
    it('should allow Caregiver A to retrieve patients actively assigned to them via /api/v1/visits/provider/assigned-patients', async () => {
      const res = await request(app)
        .get('/api/v1/visits/provider/assigned-patients')
        .set('Authorization', `Bearer ${caregiverAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 1, 'Should only return actively assigned Patient A by default');
      const patient = res.body.data[0];
      assert.strictEqual(patient.patientId, patientAId);
      assert.strictEqual(patient.fullName, 'Anand Kulkarni (Patient A)');
      assert.strictEqual(patient.phone, patientAPhone);
      assert.strictEqual(patient.assignmentType, 'both'); // Assigned via subscription AND visit
      assert.strictEqual(patient.activeSubscription.subscriptionNumber, 'TEST-M31-SUB-001');
      assert.strictEqual(patient.activeSubscription.visitsRemaining, 22);
      assert.strictEqual(patient.latestVisit.visitNumber, 'TEST-M31-VST-001');
    });

    it('should also work identically via patient-scoped alias /api/v1/patients/assigned-to-me', async () => {
      const res = await request(app)
        .get('/api/v1/patients/assigned-to-me')
        .set('Authorization', `Bearer ${caregiverAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(res.body.data[0].patientId, patientAId);
    });

    it('should strictly CONCEAL contractor payout and platform commission from assigned patient summary', async () => {
      const res = await request(app)
        .get('/api/v1/visits/provider/assigned-patients')
        .set('Authorization', `Bearer ${caregiverAToken}`);

      assert.strictEqual(res.status, 200);
      const patient = res.body.data[0];
      assert.strictEqual(patient.caregiverPayout, undefined);
      assert.strictEqual(patient.platformCommission, undefined);
      assert.strictEqual(patient.activeSubscription.caregiverPayout, undefined);
    });

    it('should REJECT unauthenticated caregiver with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/visits/provider/assigned-patients');
      assert.strictEqual(res.status, 401);
    });

    it('should FORBID patient role from calling caregiver assigned-patients endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/visits/provider/assigned-patients')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 403);
    });

    it('should return EMPTY RESULTS (200 with count 0) for unassigned Caregiver B', async () => {
      const res = await request(app)
        .get('/api/v1/visits/provider/assigned-patients')
        .set('Authorization', `Bearer ${caregiverBToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 0);
      assert.deepStrictEqual(res.body.data, []);
    });

    it('should handle INACTIVE ASSIGNMENTS: cancelled subscription excluded by default, included with includeInactive=true', async () => {
      // By default: Caregiver A only sees Patient A (active)
      const resDefault = await request(app)
        .get('/api/v1/visits/provider/assigned-patients')
        .set('Authorization', `Bearer ${caregiverAToken}`);
      assert.strictEqual(resDefault.status, 200);
      assert.strictEqual(resDefault.body.count, 1);
      assert.strictEqual(resDefault.body.data[0].patientId, patientAId);

      // With includeInactive=true: Caregiver A sees both Patient A (active) and Patient B (cancelled)
      const resAll = await request(app)
        .get('/api/v1/visits/provider/assigned-patients')
        .query({ includeInactive: 'true' })
        .set('Authorization', `Bearer ${caregiverAToken}`);
      assert.strictEqual(resAll.status, 200);
      assert.strictEqual(resAll.body.count, 2);
      const ids = resAll.body.data.map((p: any) => p.patientId);
      assert.ok(ids.includes(patientAId));
      assert.ok(ids.includes(patientBId));
    });
  });

  // ===========================================================================
  // 5. GET /api/v1/patients/:id (Strict Server-Side Authorization Guardrail)
  // ===========================================================================
  describe('5. Individual Patient Details Authorization Guardrail (GET /api/v1/patients/:id)', () => {
    it('should allow Patient A to access their OWN record (GET /api/v1/patients/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/patients/${patientAId}`)
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.patient.id, patientAId);
      assert.strictEqual(res.body.data.patient.fullName, 'Anand Kulkarni (Patient A)');
      assert.ok(res.body.data.patient.profile !== null);
      assert.strictEqual(res.body.data.patient.profile.bloodGroup, 'B+');
    });

    it('should FORBID Patient A from accessing Patient B record (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/patients/${patientBId}`)
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.message.includes('only their own records'));
    });

    it('should allow ASSIGNED Caregiver A to access Patient A record', async () => {
      const res = await request(app)
        .get(`/api/v1/patients/${patientAId}`)
        .set('Authorization', `Bearer ${caregiverAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.patient.id, patientAId);
      assert.strictEqual(res.body.data.activeSubscription.subscriptionNumber, 'TEST-M31-SUB-001');
    });

    it('should FORBID UNASSIGNED Caregiver B from accessing Patient A record (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/patients/${patientAId}`)
        .set('Authorization', `Bearer ${caregiverBToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.message.includes('No active caregiver assignment exists'));
    });

    it('should allow Admin to access any patient record', async () => {
      const res = await request(app)
        .get(`/api/v1/patients/${patientAId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.patient.id, patientAId);
    });

    it('should return 400 Bad Request for invalid patient ID format', async () => {
      const res = await request(app)
        .get('/api/v1/patients/invalid-id-format')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 400);
    });
  });
});
