import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  User,
  FieldVisit,
  CaregiverPlan,
  CaregiverSubscription,
  NotificationLog,
  AuditLog,
  Appointment,
} from '../src/models/index.js';
import { patientApi } from '../../mobile-patient/src/services/apiClient';
import { authStorage as patientAuthStorage } from '../../mobile-patient/src/services/authStorage';
import { caregiverApi } from '../../mobile-caregiver/src/services/apiClient';
import { authStorage as caregiverAuthStorage } from '../../mobile-caregiver/src/services/authStorage';

describe('VivoQuest — Phase 1: Subscription Activation, Admin Notification & Scheduling Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  const app = createApp();

  // Test accounts
  const patientPhone = '9876543001';
  let patientId: string;
  let patientToken: string;

  const patientBPhone = '9876543002';
  let patientBId: string;
  let patientBToken: string;

  const caregiverPhone = '9876543011';
  let caregiverId: string;
  let caregiverToken: string;

  const unassignedCaregiverPhone = '9876543012';
  let unassignedCaregiverId: string;
  let unassignedCaregiverToken: string;

  const doctorPhone = '9876543021';
  let doctorId: string;
  let doctorToken: string;

  const adminPhone = '9876543099';
  let adminId: string;
  let adminToken: string;

  // Plan & Subscriptions
  let testPlanId: string;
  let testPlanPackagePrice: number = 36000;
  let testPlanVisitsCount: number = 3;
  let activeSubscriptionId: string;
  let activeSubscriptionNumber: string;

  // Dates
  let tomorrowDateStr: string;
  let inTwoDaysStr: string;

  before(async () => {
    await connectDatabase();

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    tomorrowDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tomorrow);
    inTwoDaysStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(inTwoDays);

    // Clean up any test records from prior runs
    const testPhones = [
      patientPhone,
      patientBPhone,
      caregiverPhone,
      unassignedCaregiverPhone,
      doctorPhone,
      adminPhone,
    ];
    await User.deleteMany({ phone: { $in: testPhones } });
    await CaregiverPlan.deleteMany({ planCode: { $regex: '^TEST-PH1' } });
    await CaregiverSubscription.deleteMany({
      $or: [
        { patientPhone: { $in: testPhones } },
        { subscriptionNumber: { $regex: '^TEST-PH1' } },
        { planCode: 'TEST-PH1-PALLIATIVE' },
      ],
    });
    await FieldVisit.deleteMany({
      $or: [
        { 'patientDetails.phone': { $in: testPhones } },
        { providerPhone: { $in: testPhones } },
        { visitNumber: { $regex: '^TEST-PH1' } },
      ],
    });
    await NotificationLog.deleteMany({
      $or: [
        { recipientPhone: { $in: testPhones } },
        { 'metadata.patientPhone': { $in: testPhones } },
        { templateId: 'SUBSCRIPTION_ACTIVATED_TEST_MODE' },
      ],
    });
    await AuditLog.deleteMany({
      $or: [
        { action: 'CAREGIVER_SUBSCRIPTION_ACTIVATED_TEST_MODE' },
        { action: 'FIELD_VISIT_SCHEDULED' },
      ],
    });

    // 1. Register Patient A
    const resPatA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Test Patient Phase1',
        phone: patientPhone,
        email: 'patient.phase1@vivoquest.in',
        password: 'Password123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.strictEqual(resPatA.status, 201, `Patient A registration failed: ${JSON.stringify(resPatA.body)}`);
    patientId = resPatA.body.data?.user?.id || resPatA.body.data?.user?._id;
    patientToken = resPatA.body.data?.token;

    // 2. Register Patient B (Cross-patient testing)
    const resPatB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Test Patient B Phase1',
        phone: patientBPhone,
        email: 'patient.b.phase1@vivoquest.in',
        password: 'Password123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.strictEqual(resPatB.status, 201, `Patient B registration failed: ${JSON.stringify(resPatB.body)}`);
    patientBId = resPatB.body.data?.user?.id || resPatB.body.data?.user?._id;
    patientBToken = resPatB.body.data?.token;

    // 3. Register Assigned Caregiver (Nurse)
    const resCg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sister Margaret Phase1',
        phone: caregiverPhone,
        email: 'caregiver.phase1@vivoquest.in',
        password: 'Password123!',
        role: 'professional',
        consentAccepted: true,
      });
    assert.strictEqual(resCg.status, 201, `Caregiver registration failed: ${JSON.stringify(resCg.body)}`);
    caregiverId = resCg.body.data?.user?.id || resCg.body.data?.user?._id;
    caregiverToken = resCg.body.data?.token;

    // 4. Register Unassigned Caregiver
    const resUnCg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sister Evelyn Unassigned',
        phone: unassignedCaregiverPhone,
        email: 'unassigned.phase1@vivoquest.in',
        password: 'Password123!',
        role: 'professional',
        consentAccepted: true,
      });
    assert.strictEqual(resUnCg.status, 201, `Unassigned Caregiver registration failed: ${JSON.stringify(resUnCg.body)}`);
    unassignedCaregiverId = resUnCg.body.data?.user?.id || resUnCg.body.data?.user?._id;
    unassignedCaregiverToken = resUnCg.body.data?.token;

    // 5. Register Doctor
    const resDoc = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Dr. Ramesh Oncologist',
        phone: doctorPhone,
        email: 'doctor.phase1@vivoquest.in',
        password: 'Password123!',
        role: 'professional',
        consentAccepted: true,
      });
    assert.strictEqual(resDoc.status, 201, `Doctor registration failed: ${JSON.stringify(resDoc.body)}`);
    doctorId = resDoc.body.data?.user?.id || resDoc.body.data?.user?._id;
    doctorToken = resDoc.body.data?.token;

    // 6. Register Admin
    const resAdmin = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Admin Supervisor Phase1',
        phone: adminPhone,
        email: 'admin.phase1@vivoquest.in',
        password: 'Password123!',
        role: 'admin',
        consentAccepted: true,
      });
    assert.strictEqual(resAdmin.status, 201, `Admin registration failed: ${JSON.stringify(resAdmin.body)}`);
    adminId = resAdmin.body.data?.user?.id || resAdmin.body.data?.user?._id;
    adminToken = resAdmin.body.data?.token;

    // 7. Seed Canonical Care Plan for Phase 1
    const testPlan = await CaregiverPlan.create({
      planCode: 'TEST-PH1-PALLIATIVE',
      title: 'Palliative Bedside Care Package (Phase 1 Test)',
      planType: 'fixed_visit_package',
      category: 'palliative',
      durationDays: 30,
      totalVisitsIncluded: testPlanVisitsCount,
      hoursPerVisit: 8,
      customerPrice: testPlanPackagePrice,
      caregiverPayout: 25000,
      description: 'Comprehensive 8-hour shift bedside palliative nursing care with daily vitals.',
      features: ['Daily vitals check', 'Wound dressing assistance', 'Physician escalation'],
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(adminId),
    });
    testPlanId = (testPlan._id as any).toString();

    // Start ephemeral HTTP server for client SDK testing
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    // Clean up
    const testPhones = [
      patientPhone,
      patientBPhone,
      caregiverPhone,
      unassignedCaregiverPhone,
      doctorPhone,
      adminPhone,
    ];
    await User.deleteMany({ phone: { $in: testPhones } });
    await CaregiverPlan.deleteMany({ planCode: { $regex: '^TEST-PH1' } });
    await CaregiverSubscription.deleteMany({
      $or: [
        { patientPhone: { $in: testPhones } },
        { subscriptionNumber: { $regex: '^TEST-PH1' } },
        { planCode: 'TEST-PH1-PALLIATIVE' },
      ],
    });
    await FieldVisit.deleteMany({
      $or: [
        { 'patientDetails.phone': { $in: testPhones } },
        { providerPhone: { $in: testPhones } },
        { visitNumber: { $regex: '^TEST-PH1' } },
      ],
    });
    await NotificationLog.deleteMany({
      $or: [
        { recipientPhone: { $in: testPhones } },
        { 'metadata.patientPhone': { $in: testPhones } },
        { templateId: 'SUBSCRIPTION_ACTIVATED_TEST_MODE' },
      ],
    });
    await AuditLog.deleteMany({
      $or: [
        { action: 'CAREGIVER_SUBSCRIPTION_ACTIVATED_TEST_MODE' },
        { action: 'FIELD_VISIT_SCHEDULED' },
      ],
    });
    await disconnectDatabase();
  });

  // ===========================================================================
  // SECTION 1: Patient-Initiated Subscription Activation (TEST MODE)
  // ===========================================================================
  describe('1. Patient Subscription Self-Activation (TEST MODE)', () => {
    it('1.1 Should reject activation if unauthenticated', async () => {
      const res = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .send({ planId: testPlanId });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('1.2 Should reject activation with non-existent plan ID', async () => {
      const fakePlanId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ planId: fakePlanId });

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });

    it('1.3 Should activate subscription in TEST MODE and prevent client price manipulation', async () => {
      const res = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          planId: testPlanId,
          idempotencyKey: 'test-mode-idemp-123',
          // Client attempts to tamper with price, patient ID, and payment status:
          price: 1,
          customerPrice: 1,
          patientId: patientBId,
          paymentStatus: 'paid',
          carePlanNotes: 'Patient has high blood pressure, needs morning checks',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      const sub = res.body.data;

      assert.ok(sub.id || sub._id);
      activeSubscriptionId = (sub.id || sub._id).toString();
      activeSubscriptionNumber = sub.subscriptionNumber;

      // Ensure server-derived identity
      assert.strictEqual(sub.patientId.toString(), patientId);
      assert.strictEqual(sub.patientName, 'Test Patient Phase1');

      // Ensure server-enforced configured pricing, NOT client-tampered price
      assert.strictEqual(sub.pricing.customerPrice, testPlanPackagePrice);
      assert.notStrictEqual(sub.pricing.customerPrice, 1);

      // Verify explicit TEST MODE statuses
      assert.strictEqual(sub.pricing.paymentStatus, 'test_mode');
      assert.strictEqual(sub.pricing.paymentMethod, 'test_mode');
      assert.strictEqual(sub.status, 'active');
      assert.strictEqual(sub.visitsRemaining, testPlanVisitsCount);
      assert.strictEqual(sub.totalVisitsIncluded, testPlanVisitsCount);
    });

    it('1.4 Should enforce idempotency and prevent duplicate active subscriptions on rapid retries', async () => {
      const idempotencyKey = 'test-mode-idemp-123';

      const resRetry = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          planId: testPlanId,
          idempotencyKey,
        });

      // Should return 200 with the already existing subscription
      assert.strictEqual(resRetry.status, 200);
      assert.strictEqual(resRetry.body.success, true);
      assert.strictEqual(resRetry.body.data.subscriptionNumber, activeSubscriptionNumber);

      // Verify DB count: only 1 active subscription exists for Patient A
      const count = await CaregiverSubscription.countDocuments({
        patientId: new mongoose.Types.ObjectId(patientId),
        status: 'active',
      });
      assert.strictEqual(count, 1);
    });

    it('1.5 Should record immutable audit log with CAREGIVER_SUBSCRIPTION_ACTIVATED_TEST_MODE', async () => {
      const audit = await AuditLog.findOne({
        action: 'CAREGIVER_SUBSCRIPTION_ACTIVATED_TEST_MODE',
        targetId: activeSubscriptionNumber,
      });

      assert.ok(audit, 'AuditLog entry should exist for test-mode activation');
      assert.strictEqual(audit.actorId?.toString(), patientId);
      assert.strictEqual(audit.details?.subscriptionNumber, activeSubscriptionNumber);
      assert.strictEqual(audit.details?.paymentStatus, 'test_mode');
    });
  });

  // ===========================================================================
  // SECTION 2: Admin and Super Admin Notification
  // ===========================================================================
  describe('2. Admin In-App Notifications for Test-Mode Activations', () => {
    let notificationId: string;

    it('2.1 Should create persistent in-app notification for admin with TEST MODE details', async () => {
      const notif = await NotificationLog.findOne({
        templateId: 'SUBSCRIPTION_ACTIVATED_TEST_MODE',
        'metadata.subscriptionNumber': activeSubscriptionNumber,
      });

      assert.ok(notif, 'NotificationLog should exist for subscription activation');
      notificationId = (notif._id as any).toString();
      assert.strictEqual(notif.recipientRole, 'admin');
      assert.strictEqual(notif.channel, 'in_app');
      assert.strictEqual(notif.status, 'delivered');
      assert.strictEqual(notif.metadata?.paymentStatus, 'test_mode');
      assert.strictEqual(notif.metadata?.patientName, 'Test Patient Phase1');
    });

    it('2.2 Should allow Admin to retrieve notifications and view new subscription notification', async () => {
      const res = await request(app)
        .get('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));

      const found = res.body.data.find(
        (n: any) => n.templateId === 'SUBSCRIPTION_ACTIVATED_TEST_MODE' && n.metadata?.subscriptionNumber === activeSubscriptionNumber
      );
      assert.ok(found, 'Admin notifications list must contain the test-mode subscription notification');
      assert.strictEqual(found.metadata?.patientName, 'Test Patient Phase1');
    });

    it('2.3 Should reject non-admin users from accessing admin notifications', async () => {
      const res = await request(app)
        .get('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${patientToken}`);

      assert.strictEqual(res.status, 403);
    });

    it('2.4 Should allow Admin to mark notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.isRead, true);
      assert.ok(res.body.data.readAt);
    });
  });

  // ===========================================================================
  // SECTION 3: Admin Visit Scheduling Foundation
  // ===========================================================================
  describe('3. Visit Scheduling and Assignment Foundation', () => {
    let scheduledVisit1Id: string;
    let scheduledVisit1Number: string;

    it('3.1 Should reject visit scheduling by unauthorized patient role', async () => {
      const res = await request(app)
        .post('/api/v1/admin/visits/schedule')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          subscriptionId: activeSubscriptionId,
          scheduledDate: tomorrowDateStr,
          timeSlot: '09:00 - 11:00',
          visitType: 'clinical_care',
          providerId: caregiverId,
        });

      assert.strictEqual(res.status, 403);
    });

    it('3.2 Should reject doctor scheduling when doctor has no established patient relationship', async () => {
      const res = await request(app)
        .post('/api/v1/admin/visits/schedule')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          subscriptionId: activeSubscriptionId,
          scheduledDate: tomorrowDateStr,
          timeSlot: '09:00 - 11:00',
          visitType: 'clinical_care',
          providerId: caregiverId,
        });

      assert.strictEqual(res.status, 403);
      const errMsg = res.body.error?.message || res.body.message;
      assert.match(errMsg, /active care relationship/i);
    });

    it('3.3 Should reject scheduling for non-existent caregiver or invalid caregiver role', async () => {
      const res = await request(app)
        .post('/api/v1/admin/visits/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subscriptionId: activeSubscriptionId,
          scheduledDate: tomorrowDateStr,
          timeSlot: '09:00 - 11:00',
          visitType: 'clinical_care',
          providerId: patientBId, // patientB is not a caregiver
        });

      assert.strictEqual(res.status, 400);
      const errMsg = res.body.error?.message || res.body.message;
      assert.match(errMsg, /not an authorized caregiver/i);
    });

    it('3.4 Should allow authorized Admin to schedule and assign Visit 1', async () => {
      const res = await request(app)
        .post('/api/v1/admin/visits/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subscriptionId: activeSubscriptionId,
          scheduledDate: tomorrowDateStr,
          timeSlot: '09:00 - 11:00',
          visitType: 'clinical_care',
          providerId: caregiverId,
          instructions: 'Perform complete bedside vitals and wound check',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      const { visit, subscription } = res.body.data;

      assert.ok(visit);
      scheduledVisit1Id = (visit.id || visit._id).toString();
      scheduledVisit1Number = visit.visitNumber;

      assert.strictEqual(visit.providerId.toString(), caregiverId);
      assert.strictEqual(visit.providerName, 'Sister Margaret Phase1');
      assert.strictEqual(visit.patientId.toString(), patientId);
      assert.strictEqual(visit.scheduledDate, tomorrowDateStr);
      assert.strictEqual(visit.timeSlot, '09:00 - 11:00');
      assert.strictEqual(visit.status, 'assigned');
      assert.strictEqual(visit.patientDetails?.instructions, 'Perform complete bedside vitals and wound check');

      // Verify subscription linking
      assert.strictEqual(visit.subscriptionId.toString(), activeSubscriptionId);
      assert.strictEqual(visit.subscriptionNumber, activeSubscriptionNumber);

      // Verify subscription caregiver assignment and remaining visits
      assert.strictEqual(subscription.assignedCaregiverId.toString(), caregiverId);
      assert.strictEqual(subscription.visitsRemaining, testPlanVisitsCount);

      // Verify audit log creation
      const audit = await AuditLog.findOne({
        action: 'FIELD_VISIT_SCHEDULED',
        targetId: scheduledVisit1Number,
      });
      assert.ok(audit, 'AuditLog should record FIELD_VISIT_SCHEDULED');
      assert.strictEqual(audit.actorId?.toString(), adminId);
    });

    it('3.5 Should reject conflicting visit when the caregiver already has an active visit in that exact time slot', async () => {
      // Create a second subscription for patient B to attempt scheduling the same caregiver at the same slot
      const subB = await CaregiverSubscription.create({
        subscriptionNumber: 'TEST-PH1-SUB-B',
        patientId: new mongoose.Types.ObjectId(patientBId),
        patientName: 'Test Patient B Phase1',
        patientPhone: patientBPhone,
        planId: new mongoose.Types.ObjectId(testPlanId),
        planCode: 'TEST-PH1-PALLIATIVE',
        planTitle: 'Palliative Bedside Care Package',
        planType: 'fixed_visit_package',
        category: 'palliative',
        durationDays: 30,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        status: 'active',
        totalVisitsIncluded: 3,
        visitsCompleted: 0,
        visitsRemaining: 3,
        pricing: {
          customerPrice: testPlanPackagePrice,
          caregiverPayout: 25000,
          platformCommission: 11000,
          paymentStatus: 'test_mode',
          paymentMethod: 'test_mode',
        },
        createdBy: new mongoose.Types.ObjectId(adminId),
      });

      const resConflict = await request(app)
        .post('/api/v1/admin/visits/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subscriptionId: (subB._id as any).toString(),
          scheduledDate: tomorrowDateStr, // SAME DATE
          timeSlot: '09:00 - 11:00', // SAME TIME SLOT
          visitType: 'clinical_care',
          providerId: caregiverId, // SAME CAREGIVER
        });

      assert.strictEqual(resConflict.status, 409);
      assert.strictEqual(resConflict.body.success, false);
      const errConflict = resConflict.body.error?.message || resConflict.body.message;
      assert.match(errConflict, /already has active visit/i);
    });

    it('3.6 Should reject scheduling if subscription visit allowance is exhausted', async () => {
      try {
        await CaregiverSubscription.findByIdAndUpdate(activeSubscriptionId, {
          visitsRemaining: 0,
        });

        const resExhausted = await request(app)
          .post('/api/v1/admin/visits/schedule')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            subscriptionId: activeSubscriptionId,
            scheduledDate: inTwoDaysStr,
            timeSlot: '14:00 - 16:00',
            visitType: 'clinical_care',
            providerId: caregiverId,
          });

        assert.strictEqual(resExhausted.status, 400);
        const errMsg = resExhausted.body.error?.message || resExhausted.body.message;
        assert.match(errMsg, /No remaining visits/i);
      } finally {
        // Restore allowance for subsequent tests
        await CaregiverSubscription.findByIdAndUpdate(activeSubscriptionId, {
          visitsRemaining: 2,
        });
      }
    });

    it('3.7 Should reject scheduling for suspended, cancelled, or archived subscription', async () => {
      try {
        await CaregiverSubscription.findByIdAndUpdate(activeSubscriptionId, {
          status: 'suspended',
        });

        const resSuspended = await request(app)
          .post('/api/v1/admin/visits/schedule')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            subscriptionId: activeSubscriptionId,
            scheduledDate: inTwoDaysStr,
            timeSlot: '14:00 - 16:00',
            visitType: 'clinical_care',
            providerId: caregiverId,
          });

        assert.strictEqual(resSuspended.status, 400);
        const errMsg = resSuspended.body.error?.message || resSuspended.body.message;
        assert.match(errMsg, /suspended/i);
      } finally {
        // Restore status to active
        await CaregiverSubscription.findByIdAndUpdate(activeSubscriptionId, {
          status: 'active',
        });
      }
    });
  });

  // ===========================================================================
  // SECTION 4: Patient App Integration
  // ===========================================================================
  describe('4. Patient App Integration & Scoping', () => {
    it('4.1 Patient should retrieve active subscription and confirmed upcoming visit via API', async () => {
      // Test using patientApi SDK
      await patientAuthStorage.setToken(patientToken);

      const visitsSchedule = await patientApi.getVisits(baseUrl);
      assert.ok(visitsSchedule);
      assert.strictEqual(visitsSchedule.upcomingCount, 1);
      assert.strictEqual(visitsSchedule.upcoming.length, 1);

      const firstVisit = visitsSchedule.upcoming[0];
      assert.strictEqual(firstVisit.assignedCaregiver?.name, 'Sister Margaret Phase1');
      assert.strictEqual(firstVisit.timeSlot, '09:00 - 11:00');
      assert.strictEqual(firstVisit.instructions, 'Perform complete bedside vitals and wound check');

      const subs = await patientApi.getSubscriptions(baseUrl);
      assert.ok(subs.length >= 1);
      const activeSub = subs.find((s) => s.id === activeSubscriptionId);
      assert.ok(activeSub);
      assert.strictEqual(activeSub.status, 'active');
      assert.strictEqual(activeSub.pricing.paymentStatus, 'test_mode');
    });

    it('4.2 Patient B should NOT see Patient A visits or subscriptions (strict data isolation)', async () => {
      await patientAuthStorage.setToken(patientBToken);

      const visitsB = await patientApi.getVisits(baseUrl);
      assert.strictEqual(visitsB.upcomingCount, 0, 'Patient B must not see Patient A upcoming visits');

      const subsB = await patientApi.getSubscriptions(baseUrl);
      const foundSubA = subsB.find((s) => s.id === activeSubscriptionId);
      assert.strictEqual(foundSubA, undefined, 'Patient B must not see Patient A subscriptions');
    });
  });

  // ===========================================================================
  // SECTION 5: Caregiver App Integration
  // ===========================================================================
  describe('5. Caregiver App Integration & Scoping', () => {
    it('5.1 Assigned caregiver should see confirmed visit in their schedule', async () => {
      await caregiverAuthStorage.setToken(caregiverToken);

      const caregiverVisits = await caregiverApi.getAssignedVisits(undefined, baseUrl);
      assert.ok(Array.isArray(caregiverVisits));
      const found = caregiverVisits.find((v) => v.subscriptionNumber === activeSubscriptionNumber);

      assert.ok(found, 'Assigned caregiver must see the scheduled field visit');
      assert.strictEqual(found.patientDetails?.fullName, 'Test Patient Phase1');
      assert.strictEqual(found.timeSlot, '09:00 - 11:00');
      assert.strictEqual(found.status, 'assigned');
    });

    it('5.2 Unassigned caregiver should NOT see the visit', async () => {
      await caregiverAuthStorage.setToken(unassignedCaregiverToken);

      const unassignedVisits = await caregiverApi.getAssignedVisits(undefined, baseUrl);
      const found = unassignedVisits.find((v) => v.subscriptionNumber === activeSubscriptionNumber);

      assert.strictEqual(found, undefined, 'Unassigned caregiver must NOT see visit assigned to another nurse');
    });
  });
});
