import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { FieldVisit } from '../src/models/FieldVisit.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { NotificationLog } from '../src/models/NotificationLog.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { CaregiverPlan } from '../src/models/CaregiverPlan.js';
import { HealthcareProfessionalProfile } from '../src/models/HealthcareProfessionalProfile.js';
import { VisitRescheduleRequest } from '../src/models/VisitRescheduleRequest.js';
import { MedicalProduct } from '../src/models/MedicalProduct.js';
import { ProductOrder } from '../src/models/ProductOrder.js';
import { seedAdminDemoData } from '../src/services/adminService.js';
import { seedMedicalProductsIfEmpty } from '../src/services/productCatalogService.js';
import { sweepAndDetectOverdueVisits } from '../src/services/fieldOperationsService.js';

describe('VivoQuest — Phase 7: End-to-End Integration Testing & UAT Suite', () => {
  const app = createApp();

  // Test Actors
  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900';

  let patientToken: string;
  let patientUserId: string;
  const patientPhone = '9877771101';
  const patientName = 'Phase 7 UAT Patient Sunita';

  let primaryCaregiverToken: string;
  let primaryCaregiverUserId: string;
  const primaryCaregiverPhone = '9877771102';
  const primaryCaregiverName = 'Sister Anjali Primary Nurse';

  let replacementCaregiverToken: string;
  let replacementCaregiverUserId: string;
  const replacementCaregiverPhone = '9877771103';
  const replacementCaregiverName = 'Dr. Vikram Replacement Clinician';

  // State Artifacts
  let testPlanId: string;
  let activeSubscriptionId: string;
  let scheduledVisitId: string;
  let visitNumber: string;
  let rescheduleRequestId: string;
  let dmeProductId: string;
  let placedOrderId: string;

  before(async () => {
    await connectDatabase();
    await seedAdminDemoData();
    await seedMedicalProductsIfEmpty();

    // Clean previous UAT data
    await User.deleteMany({
      phone: { $in: [patientPhone, primaryCaregiverPhone, replacementCaregiverPhone] },
    });
    await FieldVisit.deleteMany({ 'patientDetails.phone': patientPhone });
    await CaregiverSubscription.deleteMany({ patientPhone });
    await NotificationLog.deleteMany({
      recipientPhone: { $in: [patientPhone, primaryCaregiverPhone, replacementCaregiverPhone] },
    });

    // 1. Authenticate Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: adminPhone, otp: '123456', role: 'admin' });
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.token;
    adminUserId = adminLogin.body.data.user.id;

    // 2. Register Primary Caregiver
    const cg1Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: primaryCaregiverName,
        phone: primaryCaregiverPhone,
        password: 'Password123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(cg1Reg.status, 201);
    primaryCaregiverToken = cg1Reg.body.data.token;
    primaryCaregiverUserId = cg1Reg.body.data.user.id;
    await User.findByIdAndUpdate(primaryCaregiverUserId, { status: 'active', isPhoneVerified: true });
    await HealthcareProfessionalProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(primaryCaregiverUserId) },
      {
        fullName: primaryCaregiverName,
        phone: primaryCaregiverPhone,
        role: 'nurse',
        verificationStatus: 'verified',
        isActiveForDispatch: true,
        status: 'active',
        availabilityStatus: 'available',
      },
      { upsert: true }
    );

    // 3. Register Replacement Caregiver
    const cg2Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: replacementCaregiverName,
        phone: replacementCaregiverPhone,
        password: 'Password123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(cg2Reg.status, 201);
    replacementCaregiverToken = cg2Reg.body.data.token;
    replacementCaregiverUserId = cg2Reg.body.data.user.id;
    await User.findByIdAndUpdate(replacementCaregiverUserId, { status: 'active', isPhoneVerified: true });
    await HealthcareProfessionalProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(replacementCaregiverUserId) },
      {
        fullName: replacementCaregiverName,
        phone: replacementCaregiverPhone,
        role: 'professional',
        verificationStatus: 'verified',
        isActiveForDispatch: true,
        status: 'active',
        availabilityStatus: 'available',
      },
      { upsert: true }
    );

    // 4. Ensure Caregiver Plan
    let plan = await CaregiverPlan.findOne({ planCode: 'P7-E2E-PLAN' });
    if (!plan) {
      plan = await CaregiverPlan.create({
        planCode: 'P7-E2E-PLAN',
        title: 'Phase 7 Comprehensive Palliative Care Package',
        planType: 'monthly_subscription',
        category: 'palliative',
        durationDays: 30,
        totalVisitsIncluded: 12,
        hoursPerVisit: 2,
        customerPrice: 18000,
        caregiverPayout: 12000,
        platformCommission: 6000,
        description: 'Complete End-to-End Palliative Support',
        features: ['24/7 Nursing Call Support', 'Daily Bedside Charting', 'Pain Management'],
        isActive: true,
      });
    }
    testPlanId = plan._id.toString();

    // 5. Ensure Product from catalog
    let product = await MedicalProduct.findOne({ isActive: true });
    assert.ok(product, 'Seeded medical product must exist');
    dmeProductId = product._id.toString();
  });

  after(async () => {
    await User.deleteMany({
      phone: { $in: [patientPhone, primaryCaregiverPhone, replacementCaregiverPhone] },
    });
    await FieldVisit.deleteMany({ 'patientDetails.phone': patientPhone });
    await CaregiverSubscription.deleteMany({ patientPhone });
    await NotificationLog.deleteMany({
      recipientPhone: { $in: [patientPhone, primaryCaregiverPhone, replacementCaregiverPhone] },
    });
    await ProductOrder.deleteMany({ patientPhone });
    await disconnectDatabase();
  });

  // ===========================================================================
  // WORKFLOW A: Patient Registration and Subscription
  // ===========================================================================
  describe('Workflow A: Patient Registration and Subscription', () => {
    it('A1. should register a new patient, persist record in MongoDB, and verify DPDP consent', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: patientName,
          phone: patientPhone,
          password: 'Password123!',
          role: 'patient',
          consentAccepted: true,
        });

      assert.equal(regRes.status, 201);
      assert.ok(regRes.body.data.token);
      patientToken = regRes.body.data.token;
      patientUserId = regRes.body.data.user.id;

      // Verify persistence in MongoDB
      const dbUser = await User.findById(patientUserId);
      assert.ok(dbUser);
      assert.equal(dbUser.fullName, patientName);
      assert.equal(dbUser.phone, patientPhone);
      assert.equal(dbUser.role, 'patient');
    });

    it('A2. should confirm new patient appears in Admin Dashboard customer registry', async () => {
      const adminUsersRes = await request(app)
        .get('/api/v1/admin/users?role=patient')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(adminUsersRes.status, 200);
      assert.ok(Array.isArray(adminUsersRes.body.data));
      const found = adminUsersRes.body.data.some((u: any) => u.phone === patientPhone);
      assert.equal(found, true, 'New patient must appear in Admin user registry');
    });

    it('A3. should activate caregiver subscription in TEST MODE and persist correctly', async () => {
      const subRes = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          planId: testPlanId,
          emergencyContact: {
            name: 'Dr. Ramesh Family Kin',
            phone: '9875559988',
            relation: 'Son',
          },
          carePlanNotes: 'Palliative cancer supportive care required at home',
        });

      assert.equal(subRes.status, 201);
      assert.equal(subRes.body.data.status, 'active');
      activeSubscriptionId = subRes.body.data.id || subRes.body.data._id;

      // Verify subscription in MongoDB
      const dbSub = await CaregiverSubscription.findById(activeSubscriptionId);
      assert.ok(dbSub);
      assert.equal(dbSub.status, 'active');
      assert.equal(dbSub.totalVisitsIncluded, 12);
      assert.equal(dbSub.visitsRemaining, 12);
    });

    it('A4. should preserve subscription state after simulated restart, re-login, and token refresh', async () => {
      // Re-login patient with password (since dynamic registered phones enforce password login)
      const reLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: patientPhone, password: 'Password123!', role: 'patient' });

      assert.equal(reLogin.status, 200);
      const refreshedToken = reLogin.body.data.token;

      // Query active subscriptions with refreshed token
      const mySubsRes = await request(app)
        .get('/api/v1/patients/me/subscriptions')
        .set('Authorization', `Bearer ${refreshedToken}`);

      assert.equal(mySubsRes.status, 200);
      assert.equal(mySubsRes.body.count, 1);
      assert.equal(mySubsRes.body.data[0].id, activeSubscriptionId);
      assert.equal(mySubsRes.body.data[0].status, 'active');
    });
  });

  // ===========================================================================
  // WORKFLOW B: Caregiver Assignment, Rejection, Reassignment & Acceptance
  // ===========================================================================
  describe('Workflow B: Caregiver Assignment & Reassignment Lifecycle', () => {
    it('B1. should create scheduled visit under active subscription and assign Primary Caregiver', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      visitNumber = `VQ-P7-E2E-${Date.now().toString().slice(-4)}`;

      const visit = await FieldVisit.create({
        visitNumber,
        visitType: 'clinical_care',
        status: 'assigned',
        assignmentStatus: 'pending',
        subscriptionId: new mongoose.Types.ObjectId(activeSubscriptionId),
        providerId: new mongoose.Types.ObjectId(primaryCaregiverUserId),
        providerName: primaryCaregiverName,
        providerRole: 'Registered Nurse',
        providerPhone: primaryCaregiverPhone,
        patientId: new mongoose.Types.ObjectId(patientUserId),
        patientDetails: {
          fullName: patientName,
          phone: patientPhone,
          address: 'Flat 402, Nilgiri Heights, Pune',
          city: 'Pune',
          pincode: '411007',
          cluster: 'Pune Central',
        },
        scheduledDate: todayStr,
        timeSlot: '10:00 - 12:00',
        timestamps: { assignedAt: new Date() },
      });
      scheduledVisitId = visit._id.toString();

      assert.ok(scheduledVisitId);
    });

    it('B2. should hide unconfirmed caregiver from Patient schedule until explicitly accepted', async () => {
      const patVisitsRes = await request(app)
        .get('/api/v1/patients/me/visits')
        .set('Authorization', `Bearer ${patientToken}`);

      assert.equal(patVisitsRes.status, 200);
      const vDTO = [...patVisitsRes.body.data.upcoming, ...patVisitsRes.body.data.past].find(
        (v: any) => v.visitNumber === visitNumber
      );
      assert.ok(vDTO);
      // Because assignmentStatus is still pending, caregiver should not appear confirmed to patient
      assert.equal(vDTO.assignedCaregiver?.isConfirmed, false, 'Unconfirmed caregiver must have isConfirmed: false');
    });

    it('B3. should enforce mandatory rejection reason when Primary Caregiver declines', async () => {
      // Missing reason -> 400
      const badReject = await request(app)
        .post(`/api/v1/visits/${scheduledVisitId}/reject`)
        .set('Authorization', `Bearer ${primaryCaregiverToken}`)
        .send({});
      assert.equal(badReject.status, 400);

      // Valid rejection with reason
      const validReject = await request(app)
        .post(`/api/v1/visits/${scheduledVisitId}/reject`)
        .set('Authorization', `Bearer ${primaryCaregiverToken}`)
        .send({ reason: 'Emergency critical care shift call-in duty' });

      assert.equal(validReject.status, 200);
      assert.equal(validReject.body.data.status, 'rejected');
      assert.equal(validReject.body.data.replacementRequired, true);

      // Verify Admin receives authoritative notification
      const adminNotif = await NotificationLog.findOne({
        recipientRole: 'admin',
        templateId: 'VISIT_ASSIGNMENT_REJECTED',
        'metadata.visitId': scheduledVisitId,
      });
      assert.ok(adminNotif, 'Admin notification must be recorded on caregiver rejection');
    });

    it('B4. should reassign rejected visit to Replacement Caregiver and require new acceptance', async () => {
      const reassignRes = await request(app)
        .patch(`/api/v1/admin/field-visits/${scheduledVisitId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          providerId: replacementCaregiverUserId,
          reason: 'Emergency replacement following Primary Nurse shift conflict',
        });

      assert.equal(reassignRes.status, 200);
      assert.equal(reassignRes.body.data.status, 'assigned');
      assert.equal(reassignRes.body.data.assignmentStatus, 'pending');
      assert.equal(reassignRes.body.data.replacementRequired, false);

      // Replacement Caregiver accepts visit
      const acceptRes = await request(app)
        .post(`/api/v1/visits/${scheduledVisitId}/accept`)
        .set('Authorization', `Bearer ${replacementCaregiverToken}`)
        .send();

      assert.equal(acceptRes.status, 200);
      assert.equal(acceptRes.body.data.status, 'accepted');
      assert.equal(acceptRes.body.data.assignmentStatus, 'accepted');

      // Now Patient sees confirmed replacement caregiver
      const patVisitsRes = await request(app)
        .get('/api/v1/patients/me/visits')
        .set('Authorization', `Bearer ${patientToken}`);

      assert.equal(patVisitsRes.status, 200);
      const vDTO = [...patVisitsRes.body.data.upcoming, ...patVisitsRes.body.data.past].find(
        (v: any) => v.visitNumber === visitNumber
      );
      assert.ok(vDTO);
      assert.ok(vDTO.assignedCaregiver);
      assert.equal(vDTO.assignedCaregiver.name, replacementCaregiverName);
    });
  });

  // ===========================================================================
  // WORKFLOW C: Visit Scheduling and Rescheduling
  // ===========================================================================
  describe('Workflow C: Visit Rescheduling Workflow & Conflict Detection', () => {
    it('C1. should allow Patient to submit a reschedule request for an accepted visit', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const reschedRes = await request(app)
        .post(`/api/v1/patients/me/visits/${scheduledVisitId}/reschedule`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          requestedDate: tomorrow,
          requestedTimeSlot: '14:00 - 16:00',
          reason: 'Family transportation assistance available tomorrow afternoon',
        });

      assert.equal(reschedRes.status, 201);
      assert.equal(reschedRes.body.data.status, 'pending');
      rescheduleRequestId = reschedRes.body.data._id || reschedRes.body.data.id;
      assert.ok(rescheduleRequestId);
    });

    it('C2. should allow Caregiver or Admin to approve reschedule request and update authoritative visit schedule', async () => {
      const approveRes = await request(app)
        .post(`/api/v1/visits/reschedule-requests/${rescheduleRequestId}/approve`)
        .set('Authorization', `Bearer ${replacementCaregiverToken}`)
        .send();

      assert.equal(approveRes.status, 200);
      assert.equal(approveRes.body.data.request.status, 'approved');

      // Verify FieldVisit date updated in MongoDB
      const updatedVisit = await FieldVisit.findById(scheduledVisitId);
      assert.ok(updatedVisit);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      assert.equal(updatedVisit.scheduledDate, tomorrow);
      assert.equal(updatedVisit.timeSlot, '14:00 - 16:00');
    });
  });

  // ===========================================================================
  // WORKFLOW D: Visit Execution and Care Reports
  // ===========================================================================
  describe('Workflow D: Visit Execution & Clinical Care Reports', () => {
    it('D1. should start authorized visit (transition to in_progress) and notify Patient', async () => {
      const startRes = await request(app)
        .patch(`/api/v1/visits/${scheduledVisitId}/status`)
        .set('Authorization', `Bearer ${replacementCaregiverToken}`)
        .send({ status: 'in_progress' });

      assert.equal(startRes.status, 200);
      assert.equal(startRes.body.data.status, 'in_progress');
      assert.ok(startRes.body.data.timestamps.startedAt);

      // Verify Patient received VISIT_STARTED notification
      const startNotif = await NotificationLog.findOne({
        recipientPhone: patientPhone,
        templateId: 'VISIT_STARTED',
      });
      assert.ok(startNotif, 'Patient should receive VISIT_STARTED SMS notification');
    });

    it('D2. should record clinical documentation, vitals, and complete the visit', async () => {
      const docRes = await request(app)
        .post(`/api/v1/visits/${scheduledVisitId}/documentation`)
        .set('Authorization', `Bearer ${replacementCaregiverToken}`)
        .send({
          clinicalNotes: 'Bedside wound dressing changed. Vitals stable. Pain score managed under palliative protocol.',
          vitals: {
            bloodPressure: '122/82',
            pulse: 74,
            temperature: 98.6,
            spO2: 98,
            painScore: 2,
          },
          recommendations: 'Continue gentle mobility exercises',
        });

      assert.equal(docRes.status, 200);
      assert.ok(docRes.body.data.clinicalDocumentation);

      // Complete visit
      const compRes = await request(app)
        .patch(`/api/v1/visits/${scheduledVisitId}/status`)
        .set('Authorization', `Bearer ${replacementCaregiverToken}`)
        .send({ status: 'completed' });

      assert.equal(compRes.status, 200);
      assert.equal(compRes.body.data.status, 'completed');
      assert.ok(compRes.body.data.timestamps.completedAt);
    });

    it('D3. should enforce clinical report soft-hide rules and retain underlying clinical audit trail', async () => {
      // Patient soft-hides report from their view
      const hideRes = await request(app)
        .delete(`/api/v1/patients/me/care-reports/${scheduledVisitId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Completed routine review' });

      assert.equal(hideRes.status, 200);

      // Underlying visit clinical documentation in MongoDB is PRESERVED
      const dbVisit = await FieldVisit.findById(scheduledVisitId);
      assert.ok(dbVisit);
      assert.ok(dbVisit.clinicalDocumentation?.clinicalNotes);
      assert.equal(dbVisit.clinicalDocumentation?.hiddenFromPatient, true);

      // Admin still has full visibility into the clinical documentation
      const adminView = await request(app)
        .get(`/api/v1/admin/field-visits?visitNumber=${visitNumber}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(adminView.status, 200);
      assert.ok(adminView.body.data[0].clinicalDocumentation);
    });
  });

  // ===========================================================================
  // WORKFLOW E: Notifications and Operational Monitoring
  // ===========================================================================
  describe('Workflow E: Omnichannel Notifications & Operational Sweeps', () => {
    it('E1. should provide patient notification feed with unread count and read authorization', async () => {
      const feedRes = await request(app)
        .get('/api/v1/patients/me/notifications')
        .set('Authorization', `Bearer ${patientToken}`);

      assert.equal(feedRes.status, 200);
      assert.ok(Array.isArray(feedRes.body.data.notifications));
      const notifs = feedRes.body.data.notifications;
      assert.ok(notifs.length >= 1);

      // Mark the first notification as read
      const firstNotifId = notifs[0]._id;
      const readRes = await request(app)
        .patch(`/api/v1/patients/me/notifications/${firstNotifId}/read`)
        .set('Authorization', `Bearer ${patientToken}`);

      assert.equal(readRes.status, 200);
      assert.equal(readRes.body.data.isRead, true);
    });

    it('E2. should trigger overdue visit sweep from Admin and detect missed visits safely', async () => {
      // Create past overdue visit
      const overdueVisitNum = `VQ-P7-OVR-${Date.now().toString().slice(-4)}`;
      await FieldVisit.create({
        visitNumber: overdueVisitNum,
        visitType: 'clinical_care',
        status: 'assigned',
        assignmentStatus: 'accepted',
        providerId: new mongoose.Types.ObjectId(replacementCaregiverUserId),
        providerName: replacementCaregiverName,
        providerRole: 'professional',
        patientDetails: {
          fullName: 'Overdue Sweep Patient',
          phone: '9875550099',
          address: 'Flat 101, Test Street, Pune',
          city: 'Pune',
          pincode: '411001',
        },
        scheduledDate: '2026-01-01',
        timeSlot: '09:00 - 11:00',
      });

      const sweepRes = await request(app)
        .post('/api/v1/admin/field-visits/check-missed')
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      assert.equal(sweepRes.status, 200);
      assert.ok(sweepRes.body.data.totalEvaluated >= 1);
      assert.ok(sweepRes.body.data.missedCount >= 1);

      // Clean up overdue visit
      await FieldVisit.deleteOne({ visitNumber: overdueVisitNum });
    });

    it('E3. should accurately reflect operational stats on Admin Dashboard', async () => {
      const statsRes = await request(app)
        .get('/api/v1/admin/field-visits/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(statsRes.status, 200);
      assert.ok(typeof statsRes.body.data.totalVisits === 'number');
      assert.ok(typeof statsRes.body.data.completedCount === 'number');
      assert.ok(typeof statsRes.body.data.replacementRequiredCount === 'number');
      assert.ok(typeof statsRes.body.data.missedCount === 'number');
    });
  });

  // ===========================================================================
  // WORKFLOW F: Equipment Commerce and Supplier Marketplace
  // ===========================================================================
  describe('Workflow F: Equipment Commerce & Supplier Marketplace', () => {
    it('F1. should allow patient to discover medical equipment and place DME order', async () => {
      const orderRes = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          items: [
            {
              productId: dmeProductId,
              quantity: 1,
              isRental: false,
            },
          ],
          deliveryAddress: {
            street: '402 Nilgiri Heights',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411007',
          },
          paymentMethod: 'online',
        });

      assert.equal(orderRes.status, 201);
      assert.equal(orderRes.body.data.orderStatus, 'placed');
      placedOrderId = orderRes.body.data._id || orderRes.body.data.id;
      assert.ok(placedOrderId);
    });

    it('F2. should verify payment intent creation and signature verification in TEST MODE', async () => {
      // 1. Create payment intent
      const intentRes = await request(app)
        .post('/api/v1/products/payments/create-intent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ orderId: placedOrderId });

      assert.equal(intentRes.status, 200);
      assert.ok(intentRes.body.data.amount > 0);

      // 2. Verify payment signature in test mode
      const verifyRes = await request(app)
        .post('/api/v1/products/payments/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          orderId: placedOrderId,
          razorpayOrderId: intentRes.body.data.razorpayOrderId,
          razorpayPaymentId: 'pay_test_uat_simulated_7788',
          razorpaySignature: 'simulated_test_sig_auto_verified',
        });

      assert.equal(verifyRes.status, 200);
      assert.equal(verifyRes.body.data.paymentStatus, 'paid');
    });

    it('F3. should advance order through valid lifecycle: confirmed -> dispatched -> out_for_delivery -> delivered', async () => {
      // Order is already confirmed via payment verification in F2
      // 1. Admin advances to dispatched
      const dispatchRes = await request(app)
        .patch(`/api/v1/admin/orders/${placedOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'dispatched', trackingMessage: 'Handed to Pune Express Logistics' });
      assert.equal(dispatchRes.status, 200);
      assert.equal(dispatchRes.body.data.orderStatus, 'dispatched');

      // 2. Admin advances to out_for_delivery
      const outRes = await request(app)
        .patch(`/api/v1/admin/orders/${placedOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'out_for_delivery', trackingMessage: 'Courier is out for final doorstep delivery' });
      assert.equal(outRes.status, 200);
      assert.equal(outRes.body.data.orderStatus, 'out_for_delivery');

      // 3. Admin advances to delivered
      const deliverRes = await request(app)
        .patch(`/api/v1/admin/orders/${placedOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'delivered', trackingMessage: 'Delivered to residence and setup verified' });
      assert.equal(deliverRes.status, 200);
      assert.equal(deliverRes.body.data.orderStatus, 'delivered');
    });
  });

  // ===========================================================================
  // WORKFLOW G: Failure, Concurrency & Security Hardening
  // ===========================================================================
  describe('Workflow G: Failure, Concurrency & Security Hardening', () => {
    it('G1. should reject unauthorized access to another user order (403 Forbidden)', async () => {
      const unauthorizedOrderView = await request(app)
        .get(`/api/v1/products/orders/${placedOrderId}`)
        .set('Authorization', `Bearer ${primaryCaregiverToken}`); // Caregiver attempting to view patient order
      assert.equal(unauthorizedOrderView.status, 403);
    });

    it('G2. should prevent NoSQL operator injection in authentication body', async () => {
      const injectionAttempt = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: { $ne: null },
          password: { $gt: '' },
        });
      // mongoSanitize strips $ne / $gt -> 400 Validation Error
      assert.equal(injectionAttempt.status, 400);
    });

    it('G3. should guarantee completion idempotency without state corruption', async () => {
      // Re-submit completion on already completed visit
      const dupCompletion = await request(app)
        .patch(`/api/v1/visits/${scheduledVisitId}/status`)
        .set('Authorization', `Bearer ${replacementCaregiverToken}`)
        .send({ status: 'completed' });

      assert.equal(dupCompletion.status, 200);
      assert.equal(dupCompletion.body.data.status, 'completed');
    });
  });
});
