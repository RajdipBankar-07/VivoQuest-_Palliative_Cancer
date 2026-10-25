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
import { VisitRescheduleRequest } from '../src/models/VisitRescheduleRequest.js';
import { NotificationLog } from '../src/models/NotificationLog.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { seedAdminDemoData } from '../src/services/adminService.js';

describe('VivoQuest — End-to-End Workflow Bug Fix and Synchronization Test Suite', { concurrency: 1 }, () => {
  const app = createApp();

  // Test accounts
  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900';

  let patientToken: string;
  let patientUserId: string;
  const patientPhone = '9811223344';

  let caregiver1Token: string;
  let caregiver1Id: string;
  const caregiver1Phone = '9833112201';

  let caregiver2Token: string;
  let caregiver2Id: string;
  const caregiver2Phone = '9833112202';

  let planId: string;
  let activeSubscriptionId: string;
  let scheduledVisitId: string;
  let rescheduleRequestId: string;

  before(async () => {
    await connectDatabase();

    // Clean up test data
    await User.deleteMany({ phone: { $in: [patientPhone, caregiver1Phone, caregiver2Phone] } });
    await PatientProfile.deleteMany({ 'contact.phone': patientPhone });
    await CaregiverSubscription.deleteMany({ patientPhone });
    await NotificationLog.deleteMany({
      $or: [
        { recipientPhone: { $in: [patientPhone, caregiver1Phone, caregiver2Phone, 'ADMIN_DESK'] } },
        {
          templateId: {
            $in: [
              'SUBSCRIPTION_ACTIVATED_TEST_MODE',
              'NEW_CAREGIVER_SUBSCRIPTION_TEST_MODE',
              'VISIT_RESCHEDULE_REQUESTED',
              'VISIT_RESCHEDULE_APPROVED',
              'VISIT_RESCHEDULE_REJECTED',
              'DAILY_CARE_REPORT_SUBMITTED',
              'CAREGIVER_ASSIGNED',
              'CAREGIVER_ASSIGNED_NEW',
              'CAREGIVER_REASSIGNED',
              'CAREGIVER_REASSIGNED_REMOVED',
            ],
          },
        },
      ],
    });

    await seedAdminDemoData();

    // 1. Admin login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: adminPhone, otp: '123456', role: 'admin' });
    assert.equal(adminRes.status, 200, 'Admin login must succeed');
    adminToken = adminRes.body.data.token;
    adminUserId = adminRes.body.data.user.id;

    // 2. Register Patient
    const patientReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sync E2E Patient',
        phone: patientPhone,
        email: 'patient.sync@vivoquest.in',
        password: 'Password123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(patientReg.status, 201, `Patient registration failed: ${JSON.stringify(patientReg.body)}`);
    patientToken = patientReg.body.data.token;
    patientUserId = patientReg.body.data.user.id || patientReg.body.data.user._id;

    // Update canonical PatientProfile with complete address
    await PatientProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(patientUserId) },
      {
        $set: {
          gender: 'female',
          dateOfBirth: new Date('1965-04-12'),
          address: {
            street: 'Flat 402, Lotus Residency, Baner Road',
            cluster: 'Baner West',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411045',
          },
        },
      },
      { upsert: true }
    );

    // 3. Register Caregiver 1 (Nurse Sister Margaret)
    const cg1Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sister Margaret Sync',
        phone: caregiver1Phone,
        email: 'nurse.margaret.sync@vivoquest.in',
        password: 'Password123!',
        role: 'professional',
        professionalType: 'nurse',
        consentAccepted: true,
      });
    assert.equal(cg1Reg.status, 201, `Caregiver 1 registration failed: ${JSON.stringify(cg1Reg.body)}`);
    caregiver1Token = cg1Reg.body.data.token;
    caregiver1Id = cg1Reg.body.data.user.id || cg1Reg.body.data.user._id;
    await User.findByIdAndUpdate(caregiver1Id, { isVerified: true, verificationStatus: 'verified', status: 'active' });

    // 4. Register Caregiver 2 (Nurse Brother Thomas)
    const cg2Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Brother Thomas Sync',
        phone: caregiver2Phone,
        email: 'nurse.thomas.sync@vivoquest.in',
        password: 'Password123!',
        role: 'professional',
        professionalType: 'nurse',
        consentAccepted: true,
      });
    assert.equal(cg2Reg.status, 201, `Caregiver 2 registration failed: ${JSON.stringify(cg2Reg.body)}`);
    caregiver2Token = cg2Reg.body.data.token;
    caregiver2Id = cg2Reg.body.data.user.id || cg2Reg.body.data.user._id;
    await User.findByIdAndUpdate(caregiver2Id, { isVerified: true, verificationStatus: 'verified', status: 'active' });

    // 5. Seed or retrieve active caregiver plan
    let plan = await CaregiverPlan.findOne({ isActive: true });
    if (!plan) {
      plan = await CaregiverPlan.create({
        planCode: 'TEST-SYNC-E2E-PLAN',
        title: 'Sync E2E Palliative Care Package',
        planType: 'fixed_visit_package',
        category: 'palliative',
        durationDays: 30,
        totalVisitsIncluded: 5,
        hoursPerVisit: 4,
        customerPrice: 15000,
        caregiverPayout: 11000,
        description: 'Comprehensive palliative nursing care package for sync e2e testing.',
        features: ['Vitals Surveillance', 'Dressing Care'],
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(adminUserId),
      });
    }
    planId = plan._id.toString();
  });

  after(async () => {
    // Cleanup
    await User.deleteMany({ phone: { $in: [patientPhone, caregiver1Phone, caregiver2Phone] } });
    await PatientProfile.deleteMany({ 'contact.phone': patientPhone });
    await CaregiverSubscription.deleteMany({ patientPhone });
    await FieldVisit.deleteMany({ 'patientDetails.phone': patientPhone });
    await disconnectDatabase();
  });

  // ===========================================================================
  // ISSUE 1 & ISSUE 2: Subscription Idempotency, Concurrency, and Admin Notification
  // ===========================================================================
  const idempotencyKey = `idemp_test_sync_${Date.now()}`;

    it('1.1 Should activate subscription in TEST MODE and return 201', async () => {
      const res = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          planId,
          idempotencyKey,
          testPaymentRef: 'TEST_SYNC_PAY_01',
          paymentMethod: 'UPI',
        });

      assert.equal(res.status, 201, 'First activation request must succeed');
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'active');
      assert.equal(res.body.data.pricing?.paymentStatus, 'test_mode');
      activeSubscriptionId = (res.body.data.id || res.body.data._id).toString();
    });

    it('1.2 Should idempotently return existing subscription on double-click / rapid retry without duplicate creation', async () => {
      const res = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          planId,
          idempotencyKey, // Identical key simulating double-click
          testPaymentRef: 'TEST_SYNC_PAY_01',
          paymentMethod: 'UPI',
        });

      assert.equal(res.status, 200, 'Replay request must return 200 OK');
      assert.equal(res.body.success, true);
      assert.equal((res.body.data.id || res.body.data._id).toString(), activeSubscriptionId, 'Must return the same subscription');

      // Database verification: strictly only 1 active subscription exists for this patient
      const subsCount = await CaregiverSubscription.countDocuments({
        patientPhone,
        status: 'active',
      });
      assert.equal(subsCount, 1, 'Exactly one active subscription record must exist');
    });

    it('1.3 Should reject activating another subscription when patient already has an active subscription', async () => {
      const plan2 = await CaregiverPlan.create({
        planCode: `TEST-SYNC-E2E-PLAN-2-${Date.now()}`,
        title: 'Alternative Care Plan',
        planType: 'fixed_visit_package',
        category: 'elderly_care',
        durationDays: 14,
        totalVisitsIncluded: 3,
        hoursPerVisit: 4,
        customerPrice: 6000,
        caregiverPayout: 4000,
        description: 'Alternative plan',
        features: ['Assisted mobility'],
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(adminUserId),
      });

      const res = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          planId: plan2._id.toString(),
          idempotencyKey: `diff_plan_${Date.now()}`,
          testPaymentRef: 'TEST_SYNC_PAY_02',
          paymentMethod: 'UPI',
        });

      assert.equal(res.status, 409, 'Should reject with 409 Conflict');
      assert.match(res.body.error.message, /already have an active subscription/i);
    });

    it('2.1 Should create persistent in-app notification for Admin with TEST MODE payment status', async () => {
      const notifs = await NotificationLog.find({
        recipientPhone: 'ADMIN_DESK',
        templateId: 'SUBSCRIPTION_ACTIVATED_TEST_MODE',
      }).sort({ createdAt: -1 });

      assert.ok(notifs.length >= 1, 'In-app notification for admin must exist');
      const latestNotif = notifs[0];
      assert.equal(latestNotif.channel, 'in_app');
      assert.equal(latestNotif.status, 'delivered');
      assert.equal(latestNotif.isRead, false);
      assert.match(latestNotif.messageBody, /TEST MODE/);
      assert.match(latestNotif.messageBody, /Sync E2E Patient/);
    });

    it('2.2 Admin should view unread notification count and mark notifications as read', async () => {
      const countRes = await request(app)
        .get('/api/v1/admin/notifications/unread-count')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(countRes.status, 200);
      assert.ok(countRes.body.data.unreadCount >= 1, 'Unread count should be at least 1');

      const markRes = await request(app)
        .patch('/api/v1/admin/notifications/mark-all-read')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(markRes.status, 200);
      assert.equal(markRes.body.success, true);

      // Verify unread count is now 0
      const countAfter = await request(app)
        .get('/api/v1/admin/notifications/unread-count')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(countAfter.body.data.unreadCount, 0, 'Unread count should be 0 after mark-all-read');
    });

  // ===========================================================================
  // ISSUE 3: Reschedule Requests Visibility, Conflict Detection, Rejection & Approval
  // ===========================================================================
    it('3.0 Admin schedules initial visit for patient and Caregiver 1', async () => {
      // Schedule an initial visit assigned to Caregiver 1
      const schedRes = await request(app)
        .post('/api/v1/admin/visits/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subscriptionId: activeSubscriptionId,
          scheduledDate: '2026-11-10',
          timeSlot: '09:00 - 11:00',
          visitType: 'clinical_care',
          providerId: caregiver1Id,
          instructions: 'Initial bedside palliative surveillance',
        });

      assert.equal(schedRes.status, 201, `Visit scheduling failed: ${JSON.stringify(schedRes.body)}`);
      scheduledVisitId = (schedRes.body.data.visit._id || schedRes.body.data.visit.id).toString();
    });

    it('3.1 Patient submits reschedule request, creating persistent record', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${scheduledVisitId}/reschedule`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          requestedDate: '2026-11-12',
          requestedTimeSlot: '14:00 - 16:00',
          reason: 'Patient doctor appointment conflict on original morning',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'pending');
      rescheduleRequestId = (res.body.data.id || res.body.data._id).toString();

      // Verify reschedule request record created and original visit schedule preserved
      const reqDoc = await VisitRescheduleRequest.findById(rescheduleRequestId);
      assert.ok(reqDoc);
      assert.equal(reqDoc.status, 'pending');
      assert.equal(reqDoc.requestedSchedule.scheduledDate, '2026-11-12');
      const visit = await FieldVisit.findById(scheduledVisitId);
      assert.equal(visit?.scheduledDate, '2026-11-10');
      assert.equal(visit?.status, 'assigned');
    });

    it('3.2 Admin should see pending reschedule request via GET /api/v1/admin/reschedule-requests', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reschedule-requests?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const targetReq = res.body.data.find((r: any) => (r.id || r._id).toString() === rescheduleRequestId);
      assert.ok(targetReq, 'Pending reschedule request must appear in Admin listing');
      assert.equal(targetReq.requestedSchedule?.scheduledDate || targetReq.requestedDate, '2026-11-12');
      assert.equal(targetReq.requestedSchedule?.timeSlot || targetReq.requestedTimeSlot, '14:00 - 16:00');
    });

    it('3.3 Admin rejecting reschedule request requires valid reason and preserves original schedule', async () => {
      // Reject without valid reason should fail
      const badReject = await request(app)
        .post(`/api/v1/admin/reschedule-requests/${rescheduleRequestId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: ' ' });
      assert.equal(badReject.status, 400);

      // Valid rejection
      const goodReject = await request(app)
        .post(`/api/v1/admin/reschedule-requests/${rescheduleRequestId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: 'Caregiver has pre-scheduled hospital rounds at that time' });
      assert.equal(goodReject.status, 200);
      assert.equal(goodReject.body.data.status, 'rejected');

      const reloaded = await VisitRescheduleRequest.findById(rescheduleRequestId);
      assert.equal(reloaded?.status, 'rejected');
      assert.equal(reloaded?.rejectionReason, 'Caregiver has pre-scheduled hospital rounds at that time');

      // Original visit schedule remains confirmed
      const visit = await FieldVisit.findById(scheduledVisitId);
      assert.equal(visit?.scheduledDate, '2026-11-10');
      assert.equal(visit?.timeSlot, '09:00 - 11:00');
    });

    it('3.4 Patient submits revised reschedule request and Admin approves, updating FieldVisit schedule', async () => {
      const patRes = await request(app)
        .post(`/api/v1/patients/me/visits/${scheduledVisitId}/reschedule`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          requestedDate: '2026-11-14',
          requestedTimeSlot: '14:00 - 16:00',
          reason: 'Alternative afternoon slot requested by family',
        });
      assert.equal(patRes.status, 201);
      const approvedReqId = (patRes.body.data.id || patRes.body.data._id).toString();

      const res = await request(app)
        .post(`/api/v1/admin/reschedule-requests/${approvedReqId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify FieldVisit date and time were synchronized
      const updatedVisit = await FieldVisit.findById(scheduledVisitId);
      assert.equal(updatedVisit?.scheduledDate, '2026-11-14');
      assert.equal(updatedVisit?.timeSlot, '14:00 - 16:00');
      const reqAfterApprove = await VisitRescheduleRequest.findById(approvedReqId);
      assert.equal(reqAfterApprove?.status, 'approved');

      // Verify in-app notifications dispatched
      const patientNotif = await NotificationLog.findOne({
        recipientPhone: patientPhone,
        templateId: 'VISIT_RESCHEDULE_APPROVED',
      });
      assert.ok(patientNotif, 'Patient should receive RESCHEDULE_APPROVED notification');
    });

  // ===========================================================================
  // ISSUE 4: Correct Patient Address in Caregiver/Nurse App
  // ===========================================================================
    it('4.1 Caregiver 1 retrieves assigned visit and sees complete canonical address without fake placeholder', async () => {
      const res = await request(app)
        .get(`/api/v1/visits/${scheduledVisitId}`)
        .set('Authorization', `Bearer ${caregiver1Token}`);

      assert.equal(res.status, 200);
      const visit = res.body.data;
      assert.ok(visit.patientDetails, 'patientDetails must be populated');
      assert.equal(visit.patientDetails.street, 'Flat 402, Lotus Residency, Baner Road');
      assert.equal(visit.patientDetails.city, 'Pune');
      assert.equal(visit.patientDetails.state, 'Maharashtra');
      assert.equal(visit.patientDetails.pincode, '411045');

      // Canonical address string must not contain hardcoded "Patient Residence, Pune"
      assert.notEqual(visit.patientDetails.address, 'Patient Residence, Pune');
      assert.match(visit.patientDetails.address, /Lotus Residency/);
    });

    it('4.2 Unassigned Caregiver 2 cannot view visit address (authorization guard)', async () => {
      const res = await request(app)
        .get(`/api/v1/visits/${scheduledVisitId}`)
        .set('Authorization', `Bearer ${caregiver2Token}`);

      assert.equal(res.status, 403, 'Unassigned caregiver must be forbidden from accessing visit');
    });

  // ===========================================================================
  // ISSUE 5, 6, 7 & 9: Daily Care Report Persistence, Download, Admin Edit & Soft-Delete
  // ===========================================================================
    it('5.1 Assigned caregiver submits daily care report with vitals and observations', async () => {
      const docPayload = {
        clinicalNotes: 'Patient was comfortable. Wound dressing was renewed with sterile technique.',
        vitals: {
          bloodPressure: '125/82',
          pulse: 74,
          spO2: 98,
          temperature: 98.4,
          respiratoryRate: 16,
        },
        proceduresPerformed: ['Wound care and aseptic dressing', 'Vital signs surveillance'],
        medicationsAdministered: ['Paracetamol 500mg IV'],
        recommendations: 'Maintain leg elevation and check temperature again at evening.',
        markAsCompleted: true,
      };

      const res = await request(app)
        .post(`/api/v1/visits/${scheduledVisitId}/documentation`)
        .set('Authorization', `Bearer ${caregiver1Token}`)
        .send(docPayload);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'completed');
      assert.ok(res.body.data.clinicalDocumentation.signedAt);
      assert.equal(res.body.data.clinicalDocumentation.vitals.bloodPressure, '125/82');

      // Verify in-app notifications were logged for Admin and Patient
      const adminNotif = await NotificationLog.findOne({
        recipientPhone: 'ADMIN_DESK',
        templateId: 'DAILY_CARE_REPORT_SUBMITTED',
      });
      assert.ok(adminNotif, 'Admin desk should receive in-app notification of care report');
    });

    it('5.2 Patient can retrieve signed care report via /api/v1/patients/me/care-reports', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/care-reports')
        .set('Authorization', `Bearer ${patientToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data && res.body.data.length >= 1, 'Care report must appear in patient care reports');
      const report = res.body.data.find((r: any) => r.id === scheduledVisitId);
      assert.ok(report, 'Report for scheduled visit must exist');
      assert.equal(report.vitals?.bloodPressure, '125/82');
    });

    it('6.1 Download report in HTML format for printing / PDF view', async () => {
      const res = await request(app)
        .get(`/api/v1/visits/${scheduledVisitId}/report/download?format=html`)
        .set('Authorization', `Bearer ${patientToken}`);

      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /text\/html/);
      assert.match(res.text, /Official Clinical Care Report/);
      assert.match(res.text, /125\/82/);
      assert.match(res.text, /Wound care and aseptic dressing/);
    });

    it('6.2 Download report in structured JSON format', async () => {
      const res = await request(app)
        .get(`/api/v1/visits/${scheduledVisitId}/report/download?format=json`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.clinicalObservations.vitals.bloodPressure, '125/82');
    });

    it('9.1 Authorized Admin amends report with mandatory reason; versionHistory is preserved', async () => {
      const res = await request(app)
        .patch(`/api/v1/visits/${scheduledVisitId}/documentation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clinicalNotes: 'Patient was comfortable. Dressing renewed. Corrected BP notation after bedside re-check.',
          vitals: {
            bloodPressure: '120/80',
            pulse: 72,
            spO2: 99,
            temperature: 98.4,
            respiratoryRate: 16,
          },
          editReason: 'Bedside re-check recorded by supervising physician Dr. Sharma',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify versionHistory captured the previous BP '125/82'
      const updatedVisit = await FieldVisit.findById(scheduledVisitId);
      const vHistory = updatedVisit?.clinicalDocumentation?.versionHistory;
      assert.ok(vHistory && vHistory.length >= 1, 'Version history must be present');
      assert.equal(vHistory[0].previousVitals?.bloodPressure, '125/82');
      assert.equal(vHistory[0].editReason, 'Bedside re-check recorded by supervising physician Dr. Sharma');
      assert.equal(updatedVisit?.clinicalDocumentation?.vitals?.bloodPressure, '120/80');
    });

    it('6.3 Admin soft-deletes report with reason; report is excluded from patient view but preserved in DB', async () => {
      const res = await request(app)
        .delete(`/api/v1/visits/${scheduledVisitId}/documentation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Duplicate clinical documentation recorded by error' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // FieldVisit document in MongoDB has isDeleted = true and deletionReason preserved
      const visit = await FieldVisit.findById(scheduledVisitId);
      assert.equal(visit?.clinicalDocumentation?.isDeleted, true);
      assert.equal(visit?.clinicalDocumentation?.deletionReason, 'Duplicate clinical documentation recorded by error');

      // Patient care reports excludes soft-deleted clinicalDocumentation
      const patientReportsRes = await request(app)
        .get('/api/v1/patients/me/care-reports')
        .set('Authorization', `Bearer ${patientToken}`);
      const reports = patientReportsRes.body.data || [];
      const patReport = reports.find((r: any) => r.id === scheduledVisitId);
      assert.equal(patReport, undefined, 'Soft-deleted clinical doc must not appear in patient careReports');

      // Download endpoint rejects deleted report with 410 Gone
      const dlRes = await request(app)
        .get(`/api/v1/visits/${scheduledVisitId}/report/download?format=json`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(dlRes.status, 410);
    });

  // ===========================================================================
  // ISSUE 8: Admin Caregiver Reassignment and Availability Validation
  // ===========================================================================
  let reassignVisitId: string;

    it('8.0 Admin schedules visit for Caregiver 1 to test subsequent reassignment', async () => {
      // Create a new scheduled visit for Caregiver 1
      const res = await request(app)
        .post('/api/v1/admin/visits/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subscriptionId: activeSubscriptionId,
          scheduledDate: '2026-11-20',
          timeSlot: '11:00 - 13:00',
          visitType: 'clinical_care',
          providerId: caregiver1Id,
          instructions: 'Palliative nursing support',
        });
      assert.equal(res.status, 201, `Reassignment visit scheduling failed: ${JSON.stringify(res.body)}`);
      reassignVisitId = (res.body.data.visit._id || res.body.data.visit.id).toString();
    });

    it('8.1 Reassignment fails if new caregiver does not exist or has inactive status', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/api/v1/admin/visits/${reassignVisitId}/reassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newProviderId: fakeId,
          reason: 'Testing non-existent caregiver',
        });

      assert.equal(res.status, 404);
    });

    it('8.2 Successfully reassigns visit from Caregiver 1 to Caregiver 2', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/visits/${reassignVisitId}/reassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newProviderId: caregiver2Id,
          reason: 'Caregiver 1 reassigned to urgent emergency post',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.providerId.toString(), caregiver2Id);

      // Verify assignment history preserved on visit
      const visit = await FieldVisit.findById(reassignVisitId);
      assert.equal(visit?.providerId?.toString(), caregiver2Id);
      assert.ok(visit?.statusHistory && visit.statusHistory.length >= 1);
      assert.match(visit.statusHistory[visit.statusHistory.length - 1].notes || '', /Reassigned from/);

      // Verify Caregiver 2 now sees the visit, Caregiver 1 does NOT see it
      const cg2Visits = await request(app)
        .get('/api/v1/visits/provider/me')
        .set('Authorization', `Bearer ${caregiver2Token}`);
      assert.ok(cg2Visits.body.data.some((v: any) => (v._id || v.id).toString() === reassignVisitId), 'Caregiver 2 must see reassigned visit');

      const cg1Visits = await request(app)
        .get('/api/v1/visits/provider/me')
        .set('Authorization', `Bearer ${caregiver1Token}`);
      assert.ok(!cg1Visits.body.data.some((v: any) => (v._id || v.id).toString() === reassignVisitId), 'Caregiver 1 must not see reassigned visit');
    });
});
