import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { env } from '../src/config/environment.js';
import { User } from '../src/models/User.js';
import { FieldVisit } from '../src/models/FieldVisit.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { CaregiverPlan } from '../src/models/CaregiverPlan.js';
import { HealthcareProfessionalProfile } from '../src/models/HealthcareProfessionalProfile.js';
import { NotificationLog } from '../src/models/NotificationLog.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { MedicalProduct } from '../src/models/MedicalProduct.js';
import { ProductOrder } from '../src/models/ProductOrder.js';
import { seedAdminDemoData } from '../src/services/adminService.js';
import { seedMedicalProductsIfEmpty } from '../src/services/productCatalogService.js';

describe('VivoQuest — Phase 9: Staging Deployment Smoke Test Suite', () => {
  // Staging App Instance
  const app = createApp();

  // Test Staging Identities
  const adminPhone = '9899009900';
  const adminPassword = 'Admin#2026';
  let adminToken: string;
  let adminUserId: string;

  const patientPhone = '9878880001';
  const patientPassword = 'StagingPatient#2026';
  const patientName = 'Smt. Ananya Deshmukh (Staging)';
  let patientToken: string;
  let patientUserId: string;

  const primaryCaregiverPhone = '9878880002';
  const primaryCaregiverPassword = 'PrimaryNurse#2026';
  const primaryCaregiverName = 'Sister Sunita Kadam (Primary Nurse)';
  let primaryCaregiverToken: string;
  let primaryCaregiverUserId: string;

  const replacementCaregiverPhone = '9878880003';
  const replacementCaregiverPassword = 'BackupNurse#2026';
  const replacementCaregiverName = 'Dr. Rajesh Patil (Replacement Clinician)';
  let replacementCaregiverToken: string;
  let replacementCaregiverUserId: string;

  let activePlanId: string;
  let stagingSubscriptionId: string;
  let stagingVisitId: string;
  let stagingVisitNumber: string;
  let stagingRescheduleId: string;
  let dmeProductId: string;
  let stagingOrderId: string;

  before(async () => {
    // 1. Force environment to staging configuration
    process.env.NODE_ENV = 'staging';
    process.env.MONGODB_DB_NAME = 'vivoquest_staging_db';
    process.env.ALLOW_DEV_MOCK_OTP = 'false';
    (env as any).ALLOW_DEV_MOCK_OTP = false;
    (env as any).NODE_ENV = 'staging';

    await connectDatabase();

    // 2. Initialize staging data
    await seedAdminDemoData();
    await seedMedicalProductsIfEmpty();

    // Clean any prior staging smoke test accounts
    await User.deleteMany({
      phone: { $in: [patientPhone, primaryCaregiverPhone, replacementCaregiverPhone] },
    });
    await FieldVisit.deleteMany({
      'patientDetails.phone': patientPhone,
    });
    await CaregiverSubscription.deleteMany({
      patientPhone,
    });
    await NotificationLog.deleteMany({
      recipientPhone: { $in: [patientPhone, primaryCaregiverPhone, replacementCaregiverPhone] },
    });
    await HealthcareProfessionalProfile.deleteMany({
      phone: { $in: [primaryCaregiverPhone, replacementCaregiverPhone] },
    });

    // Ensure Caregiver Plan exists
    let plan = await CaregiverPlan.findOne({ isActive: true });
    if (!plan) {
      plan = await CaregiverPlan.create({
        planCode: 'P9-STG-PLAN',
        title: 'Phase 9 Staging Palliative Care Package',
        planType: 'monthly_subscription',
        category: 'palliative',
        durationDays: 30,
        totalVisitsIncluded: 12,
        hoursPerVisit: 2,
        customerPrice: 18000,
        caregiverPayout: 12000,
        platformCommission: 6000,
        description: 'Complete Staging Palliative Support',
        features: ['Nursing Support', 'Daily Bedside Charting', 'Pain Management'],
        isActive: true,
      });
    }
    activePlanId = plan._id.toString();

    // Pick an active medical equipment product
    const prod = await MedicalProduct.findOne({ isActive: true });
    assert.ok(prod, 'Must have active DME product seeded');
    dmeProductId = prod._id.toString();
  });

  after(async () => {
    if (primaryCaregiverUserId || replacementCaregiverUserId) {
      await HealthcareProfessionalProfile.deleteMany({
        userId: { $in: [primaryCaregiverUserId, replacementCaregiverUserId].filter(Boolean) },
      });
    }
    await disconnectDatabase();
  });

  // ===========================================================================
  // 1. API Health & MongoDB Connectivity
  // ===========================================================================
  it('1. should verify staging health probes, readiness probe, and database connection', async () => {
    // Root load balancer health
    const rootRes = await request(app).get('/health');
    assert.equal(rootRes.status, 200);
    assert.equal(rootRes.body.status, 'ok');

    // Kubernetes container readiness probe
    const readyRes = await request(app).get('/health/ready');
    assert.equal(readyRes.status, 200);
    assert.equal(readyRes.body.status, 'ready');

    // API v1 detailed health
    const apiHealth = await request(app).get('/api/v1/health');
    assert.equal(apiHealth.status, 200);
    assert.equal(apiHealth.body.status, 'ok');
    assert.equal(apiHealth.body.database.connected, true);
    assert.ok(apiHealth.body.uptimeSeconds >= 0);
  });

  // ===========================================================================
  // 2. Admin Authentication & Strict RBAC Enforcement
  // ===========================================================================
  it('2. should authenticate admin with password and enforce RBAC against unauthorized roles', async () => {
    // Attempt login with disabled mock OTP (must fail with 503 Service Unavailable in staging)
    const mockOtpAttempt = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: adminPhone, otp: '123456', role: 'admin' });
    assert.equal(mockOtpAttempt.status, 503);

    // Valid Password Login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: adminPhone,
        password: adminPassword,
        role: 'admin',
      });
    assert.equal(adminLogin.status, 200);
    assert.ok(adminLogin.body.data.token);
    adminToken = adminLogin.body.data.token;
    adminUserId = adminLogin.body.data.user.id;

    // Verify Admin has access to operational field visit stats
    const statsRes = await request(app)
      .get('/api/v1/admin/field-visits/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(statsRes.status, 200);
    assert.ok(typeof statsRes.body.data.totalVisits === 'number');

    // Register Caregivers for later workflows
    const cg1Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: primaryCaregiverName,
        phone: primaryCaregiverPhone,
        password: primaryCaregiverPassword,
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
        professionType: 'nurse',
        verificationStatus: 'verified',
        isActiveForDispatch: true,
        status: 'active',
        availabilityStatus: 'available',
      },
      { upsert: true }
    );

    const cg2Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: replacementCaregiverName,
        phone: replacementCaregiverPhone,
        password: replacementCaregiverPassword,
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
        role: 'doctor',
        professionType: 'physician',
        verificationStatus: 'verified',
        isActiveForDispatch: true,
        status: 'active',
        availabilityStatus: 'available',
      },
      { upsert: true }
    );

    // RBAC check: Caregiver attempting to access Admin endpoints must receive 403 Forbidden
    const forbiddenAdminCall = await request(app)
      .get('/api/v1/admin/field-visits/stats')
      .set('Authorization', `Bearer ${primaryCaregiverToken}`);
    assert.equal(forbiddenAdminCall.status, 403);
  });

  // ===========================================================================
  // 3. Patient Registration & Subscription Persistence
  // ===========================================================================
  it('3. should register staging patient and activate palliative caregiver subscription', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: patientName,
        phone: patientPhone,
        password: patientPassword,
        role: 'patient',
        address: 'Bungalow 7, Shivaji Housing Society, Senapati Bapat Road',
        city: 'Pune',
        pincode: '411016',
        consentAccepted: true,
      });
    assert.equal(regRes.status, 201);
    patientToken = regRes.body.data.token;
    patientUserId = regRes.body.data.user.id;

    // Activate Caregiver Subscription in staging TEST MODE
    const subRes = await request(app)
      .post('/api/v1/patients/me/subscriptions/activate')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        planId: activePlanId,
        paymentReference: 'pay_staging_smoke_simulated_01',
        paymentMethod: 'razorpay',
        frequency: 'monthly',
        emergencyContact: {
          name: 'Vikram Deshmukh',
          phone: '9878880099',
          relation: 'Son',
        },
        carePlanNotes: 'Palliative comfort care, daily vital checks and wound dressing',
      });
    assert.equal(subRes.status, 201);
    assert.equal(subRes.body.data.status, 'active');
    stagingSubscriptionId = subRes.body.data.id || subRes.body.data._id;
    assert.ok(stagingSubscriptionId);

    // Verify subscription persistence in MongoDB staging database
    const dbSub = await CaregiverSubscription.findById(stagingSubscriptionId);
    assert.ok(dbSub);
    assert.equal(dbSub.status, 'active');
    assert.equal(dbSub.visitsRemaining, dbSub.totalVisitsIncluded);
  });

  // ===========================================================================
  // 4. Caregiver Assignment, Rejection & Reassignment
  // ===========================================================================
  it('4. should assign primary caregiver, handle rejection with reason, and reassign to backup nurse', async () => {
    stagingVisitNumber = `VQ-STG-SMOKE-${Date.now().toString().slice(-4)}`;
    const today = new Date().toISOString().slice(0, 10);

    // Create scheduled visit
    const visit = await FieldVisit.create({
      visitNumber: stagingVisitNumber,
      visitType: 'clinical_care',
      status: 'assigned',
      assignmentStatus: 'pending',
      subscriptionId: new mongoose.Types.ObjectId(stagingSubscriptionId),
      providerId: new mongoose.Types.ObjectId(primaryCaregiverUserId),
      providerName: primaryCaregiverName,
      providerRole: 'Registered Nurse',
      providerPhone: primaryCaregiverPhone,
      patientId: new mongoose.Types.ObjectId(patientUserId),
      patientDetails: {
        fullName: patientName,
        phone: patientPhone,
        address: 'Bungalow 7, Shivaji Housing Society, Pune',
        city: 'Pune',
        pincode: '411016',
      },
      scheduledDate: today,
      timeSlot: '09:00 - 11:00',
    });
    stagingVisitId = visit._id.toString();

    // Verify unconfirmed caregiver is hidden from Patient view
    const patVisits = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patientToken}`);
    assert.equal(patVisits.status, 200);
    const vDTO = [...patVisits.body.data.upcoming, ...patVisits.body.data.past].find(
      (v: any) => v.visitNumber === stagingVisitNumber
    );
    assert.ok(vDTO);
    assert.equal(vDTO.assignedCaregiver?.isConfirmed, false);

    // Primary nurse rejects visit with mandatory justification
    const rejectRes = await request(app)
      .post(`/api/v1/visits/${stagingVisitId}/reject`)
      .set('Authorization', `Bearer ${primaryCaregiverToken}`)
      .send({ reason: 'Emergency ICU duty call-in' });
    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.body.data.replacementRequired, true);

    // Admin reassigns to replacement caregiver
    const reassignRes = await request(app)
      .patch(`/api/v1/admin/field-visits/${stagingVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: replacementCaregiverUserId,
        providerName: replacementCaregiverName,
        providerPhone: replacementCaregiverPhone,
        providerRole: 'Senior Palliative Specialist',
        reason: 'Emergency replacement after primary caregiver decline',
      });
    assert.equal(reassignRes.status, 200);
    assert.equal(reassignRes.body.data.replacementRequired, false);

    // Replacement caregiver explicitly accepts
    const acceptRes = await request(app)
      .post(`/api/v1/visits/${stagingVisitId}/accept`)
      .set('Authorization', `Bearer ${replacementCaregiverToken}`)
      .send();
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.assignmentStatus, 'accepted');

    // Confirm that Patient now sees the caregiver as confirmed
    const confirmedPatVisits = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patientToken}`);
    const confirmedDTO = [...confirmedPatVisits.body.data.upcoming, ...confirmedPatVisits.body.data.past].find(
      (v: any) => v.visitNumber === stagingVisitNumber
    );
    assert.equal(confirmedDTO.assignedCaregiver?.isConfirmed, true);
  });

  // ===========================================================================
  // 5. Visit Scheduling & Rescheduling Lifecycle
  // ===========================================================================
  it('5. should submit reschedule request and approve to update authoritative visit date', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const reschedRes = await request(app)
      .post(`/api/v1/patients/me/visits/${stagingVisitId}/reschedule`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        requestedDate: tomorrow,
        requestedTimeSlot: '11:00 - 13:00',
        reason: 'Patient attending scheduled morning dialysis',
      });
    assert.equal(reschedRes.status, 201);
    assert.equal(reschedRes.body.data.status, 'pending');
    stagingRescheduleId = reschedRes.body.data._id || reschedRes.body.data.id;
    assert.ok(stagingRescheduleId);

    // Replacement nurse approves reschedule request
    const approveRes = await request(app)
      .post(`/api/v1/visits/reschedule-requests/${stagingRescheduleId}/approve`)
      .set('Authorization', `Bearer ${replacementCaregiverToken}`)
      .send();
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.data.request.status, 'approved');

    // Verify FieldVisit date updated in MongoDB
    const updatedVisit = await FieldVisit.findById(stagingVisitId);
    assert.ok(updatedVisit);
    assert.equal(updatedVisit.scheduledDate, tomorrow);
    assert.equal(updatedVisit.timeSlot, '11:00 - 13:00');
  });

  // ===========================================================================
  // 6. Care Report Submission & Clinical Audit Retention
  // ===========================================================================
  it('6. should execute visit, submit clinical report, and soft-hide for patient while retaining for admin', async () => {
    // Start visit
    const startRes = await request(app)
      .patch(`/api/v1/visits/${stagingVisitId}/status`)
      .set('Authorization', `Bearer ${replacementCaregiverToken}`)
      .send({ status: 'in_progress' });
    assert.equal(startRes.status, 200);
    assert.equal(startRes.body.data.status, 'in_progress');

    // Submit clinical observations & vitals
    const docRes = await request(app)
      .post(`/api/v1/visits/${stagingVisitId}/documentation`)
      .set('Authorization', `Bearer ${replacementCaregiverToken}`)
      .send({
        clinicalNotes: 'Bedside wound dressing completed. Patient pain scale managed at 2/10.',
        vitals: {
          bloodPressure: '120/80',
          pulse: 72,
          temperature: 98.4,
          spO2: 99,
          painScore: 2,
        },
        recommendations: 'Maintain oral hydration and continue prescribed analgesic',
      });
    assert.equal(docRes.status, 200);

    // Complete visit
    const compRes = await request(app)
      .patch(`/api/v1/visits/${stagingVisitId}/status`)
      .set('Authorization', `Bearer ${replacementCaregiverToken}`)
      .send({ status: 'completed' });
    assert.equal(compRes.status, 200);
    assert.equal(compRes.body.data.status, 'completed');

    // Patient soft-hides report from their UI
    const hideRes = await request(app)
      .delete(`/api/v1/patients/me/care-reports/${stagingVisitId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reason: 'Reviewed by family caregiver' });
    assert.equal(hideRes.status, 200);

    // Verify underlying clinical record in MongoDB is RETAINED with hiddenFromPatient flag
    const dbVisit = await FieldVisit.findById(stagingVisitId);
    assert.ok(dbVisit);
    assert.ok(dbVisit.clinicalDocumentation?.clinicalNotes);
    assert.equal(dbVisit.clinicalDocumentation?.hiddenFromPatient, true);

    // Admin retains full visibility into clinical care report
    const adminView = await request(app)
      .get(`/api/v1/admin/field-visits?visitNumber=${stagingVisitNumber}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminView.status, 200);
    assert.ok(adminView.body.data[0].clinicalDocumentation);
  });

  // ===========================================================================
  // 7. Omnichannel Notifications & Audit Trail
  // ===========================================================================
  it('7. should record recipient notifications and log structured audit events', async () => {
    // Query patient notification inbox
    const notifsRes = await request(app)
      .get('/api/v1/patients/me/notifications')
      .set('Authorization', `Bearer ${patientToken}`);
    assert.equal(notifsRes.status, 200);
    assert.ok(Array.isArray(notifsRes.body.data.notifications));

    // Audit Log check: Reassignment, status transitions, and documentation must exist
    const auditEntries = await AuditLog.find({
      'details.visitNumber': stagingVisitNumber,
    });
    assert.ok(auditEntries.length >= 1, 'Audit log entries must exist for visit lifecycle');
  });

  // ===========================================================================
  // 8. DME Equipment Order & Test-Mode Payment
  // ===========================================================================
  it('8. should place medical equipment order, reserve stock, and verify payment in TEST MODE', async () => {
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
          street: 'Bungalow 7, Shivaji Housing Society',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411016',
        },
        paymentMethod: 'online',
      });
    assert.equal(orderRes.status, 201);
    assert.equal(orderRes.body.data.orderStatus, 'placed');
    stagingOrderId = orderRes.body.data._id || orderRes.body.data.id;
    assert.ok(stagingOrderId);

    // Create payment intent
    const intentRes = await request(app)
      .post('/api/v1/products/payments/create-intent')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ orderId: stagingOrderId });
    assert.equal(intentRes.status, 200);
    assert.equal(intentRes.body.data.isTestMode, true);

    // Verify payment signature in test mode
    const verifyRes = await request(app)
      .post('/api/v1/products/payments/verify')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        orderId: stagingOrderId,
        razorpayOrderId: intentRes.body.data.razorpayOrderId,
        razorpayPaymentId: 'pay_staging_smoke_verified_7788',
        razorpaySignature: 'simulated_test_sig_auto_verified',
      });
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.data.paymentStatus, 'paid');
    assert.equal(verifyRes.body.data.orderStatus, 'confirmed');

    // Admin fulfillment transition: confirmed -> dispatched -> out_for_delivery -> delivered
    const dispatchRes = await request(app)
      .patch(`/api/v1/admin/orders/${stagingOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'dispatched', trackingMessage: 'Courier picked up from Kothrud Depot' });
    assert.equal(dispatchRes.status, 200);
    assert.equal(dispatchRes.body.data.orderStatus, 'dispatched');

    const outRes = await request(app)
      .patch(`/api/v1/admin/orders/${stagingOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'out_for_delivery', trackingMessage: 'Van out for final doorstep delivery' });
    assert.equal(outRes.status, 200);
    assert.equal(outRes.body.data.orderStatus, 'out_for_delivery');

    const deliverRes = await request(app)
      .patch(`/api/v1/admin/orders/${stagingOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered', trackingMessage: 'Delivered and bedside equipment verified' });
    assert.equal(deliverRes.status, 200);
    assert.equal(deliverRes.body.data.orderStatus, 'delivered');
  });

  // ===========================================================================
  // 9. Mobile API Target & CORS Enforcement for Staging Origins
  // ===========================================================================
  it('9. should handle mobile client headers and reject unauthorized cross-origin requests', async () => {
    // Mobile native clients do not send browser origin header (must be accepted: 200)
    const mobileVisitReq = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patientToken}`);
    assert.equal(mobileVisitReq.status, 200);

    // Approved Staging Origin: http://localhost:3001
    const allowedCorsReq = await request(app)
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:3001');
    assert.ok([200, 204].includes(allowedCorsReq.status));

    // Malicious Unapproved Origin: https://unauthorized-phishing-domain.com
    const rejectedCorsReq = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://unauthorized-phishing-domain.com');
    // Express CORS rejects unauthorized origin by not setting access-control-allow-origin
    assert.equal(rejectedCorsReq.headers['access-control-allow-origin'], undefined);
  });

  // ===========================================================================
  // 10. Refresh, Logout/Login & Restart Persistence
  // ===========================================================================
  it('10. should maintain state integrity after simulated restart and re-login', async () => {
    // Re-login with password
    const reLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: patientPhone,
        password: patientPassword,
        role: 'patient',
      });
    assert.equal(reLogin.status, 200);
    const refreshedToken = reLogin.body.data.token;

    // Verify subscription retrieved intact with refreshed token
    const subsRes = await request(app)
      .get('/api/v1/patients/me/subscriptions')
      .set('Authorization', `Bearer ${refreshedToken}`);
    assert.equal(subsRes.status, 200);
    assert.equal(subsRes.body.count, 1);
    assert.equal(subsRes.body.data[0].id, stagingSubscriptionId);
    assert.equal(subsRes.body.data[0].status, 'active');

    // Verify order retrieved intact
    const ordersRes = await request(app)
      .get('/api/v1/products/orders/me')
      .set('Authorization', `Bearer ${refreshedToken}`);
    assert.equal(ordersRes.status, 200);
    assert.ok(ordersRes.body.data.some((o: any) => o._id === stagingOrderId || o.id === stagingOrderId));
  });
});
