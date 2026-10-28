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
import { HealthcareProfessionalProfile } from '../src/models/HealthcareProfessionalProfile.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { CaregiverPlan } from '../src/models/CaregiverPlan.js';
import { VisitRescheduleRequest } from '../src/models/VisitRescheduleRequest.js';
import { seedAdminDemoData } from '../src/services/adminService.js';
import { sweepAndDetectOverdueVisits } from '../src/services/fieldOperationsService.js';
import { sendPatientNotification } from '../src/services/notificationService.js';

describe('VivoQuest — Phase 5: Visit Lifecycle, Notifications & Operational Monitoring Test Suite', () => {
  const app = createApp();

  // Admin
  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900';

  // Patient 1
  let patient1Token: string;
  let patient1UserId: string;
  const patient1Phone = '9875551101';
  const patient1Name = 'Phase 5 Test Patient Ananya';

  // Patient 2 (For Notification Isolation)
  let patient2Token: string;
  let patient2UserId: string;
  const patient2Phone = '9875551102';
  const patient2Name = 'Phase 5 Isolation Patient Rohit';

  // Caregiver 1
  let caregiver1Token: string;
  let caregiver1UserId: string;
  const caregiver1Phone = '9875551103';
  const caregiver1Name = 'Dr. Priya Assigned Caregiver';

  // Caregiver 2
  let caregiver2Token: string;
  let caregiver2UserId: string;
  const caregiver2Phone = '9875551104';
  const caregiver2Name = 'Sister Neha Replacement Nurse';

  // Consent Refused Patient
  const consentRefusedPhone = '9875551105';
  const consentRefusedName = 'Consent Refused Patient';

  // Test Visits
  const visitNum1 = 'VQ-P5-VST-001';
  const visitNum2 = 'VQ-P5-VST-002';
  const visitNum3 = 'VQ-P5-VST-003';
  const visitNumMissed = 'VQ-P5-VST-MISSED';
  const visitNumResched = 'VQ-P5-VST-RESCHED';

  let visit1Id: string;
  let visit2Id: string;
  let visit3Id: string;
  let visitMissedId: string;
  let visitReschedId: string;

  before(async () => {
    await connectDatabase();

    // Clean up test fixtures
    await User.deleteMany({
      phone: {
        $in: [patient1Phone, patient2Phone, caregiver1Phone, caregiver2Phone, consentRefusedPhone],
      },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: [visitNum1, visitNum2, visitNum3, visitNumMissed, visitNumResched] },
    });
    await NotificationLog.deleteMany({
      recipientPhone: {
        $in: [patient1Phone, patient2Phone, caregiver1Phone, caregiver2Phone, consentRefusedPhone],
      },
    });
    await AuditLog.deleteMany({
      'details.visitNumber': { $in: [visitNum1, visitNum2, visitNum3, visitNumMissed, visitNumResched] },
    });
    await VisitRescheduleRequest.deleteMany({ reason: /Phase 5/i });

    await seedAdminDemoData();

    // 1. Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: adminPhone, otp: '123456', role: 'admin' });
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.token;
    adminUserId = adminLogin.body.data.user.id;

    // 2. Patient 1 registration
    const p1Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: patient1Name,
        phone: patient1Phone,
        password: 'Password123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(p1Reg.status, 201);
    patient1Token = p1Reg.body.data.token;
    patient1UserId = p1Reg.body.data.user.id;

    // 3. Patient 2 registration
    const p2Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: patient2Name,
        phone: patient2Phone,
        password: 'Password123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(p2Reg.status, 201);
    patient2Token = p2Reg.body.data.token;
    patient2UserId = p2Reg.body.data.user.id;

    // 4. Caregiver 1 registration
    const c1Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: caregiver1Name,
        phone: caregiver1Phone,
        password: 'Password123!',
        role: 'professional',
        consentAccepted: true,
      });
    assert.equal(c1Reg.status, 201);
    caregiver1Token = c1Reg.body.data.token;
    caregiver1UserId = c1Reg.body.data.user.id;

    // 5. Caregiver 2 registration
    const c2Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: caregiver2Name,
        phone: caregiver2Phone,
        password: 'Password123!',
        role: 'professional',
        consentAccepted: true,
      });
    assert.equal(c2Reg.status, 201);
    caregiver2Token = c2Reg.body.data.token;
    caregiver2UserId = c2Reg.body.data.user.id;

    // 6. Consent Refused User
    await User.create({
      fullName: consentRefusedName,
      phone: consentRefusedPhone,
      passwordHash: 'dummy',
      role: 'patient',
      dpdpConsent: {
        accepted: false,
        revokedAt: new Date(),
      },
    });

    // Seed Profile documents for caregivers
    await HealthcareProfessionalProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(caregiver1UserId) },
      {
        fullName: caregiver1Name,
        phone: caregiver1Phone,
        professionType: 'nurse',
        qualification: 'B.Sc Nursing',
        licenseNumber: 'MH-RN-2026-P5-1',
        isVerified: true,
        verificationStatus: 'verified',
        status: 'active',
        availabilityStatus: 'available',
      },
      { upsert: true }
    );

    await HealthcareProfessionalProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(caregiver2UserId) },
      {
        fullName: caregiver2Name,
        phone: caregiver2Phone,
        professionType: 'nurse',
        qualification: 'M.Sc Palliative Nursing',
        licenseNumber: 'MH-RN-2026-P5-2',
        isVerified: true,
        verificationStatus: 'verified',
        status: 'active',
        availabilityStatus: 'available',
      },
      { upsert: true }
    );

    const todayStr = new Date().toISOString().slice(0, 10);

    // Create Base Test Visit 1
    const v1 = await FieldVisit.create({
      visitNumber: visitNum1,
      visitType: 'clinical_care',
      status: 'assigned',
      assignmentStatus: 'pending',
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Registered Nurse',
      providerPhone: caregiver1Phone,
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientDetails: {
        fullName: patient1Name,
        phone: patient1Phone,
        address: 'Plot 10, Kalyani Nagar, Pune',
        city: 'Pune',
        pincode: '411006',
        cluster: 'Pune East',
      },
      scheduledDate: todayStr,
      timeSlot: '09:00 - 11:00',
      timestamps: { assignedAt: new Date() },
    });
    visit1Id = v1._id.toString();

    // Create Test Visit 2 (For rejection and replacement)
    const v2 = await FieldVisit.create({
      visitNumber: visitNum2,
      visitType: 'nursing_procedure',
      status: 'assigned',
      assignmentStatus: 'pending',
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Registered Nurse',
      providerPhone: caregiver1Phone,
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientDetails: {
        fullName: patient1Name,
        phone: patient1Phone,
        address: 'Plot 10, Kalyani Nagar, Pune',
        city: 'Pune',
        pincode: '411006',
        cluster: 'Pune East',
      },
      scheduledDate: todayStr,
      timeSlot: '14:00 - 16:00',
      timestamps: { assignedAt: new Date() },
    });
    visit2Id = v2._id.toString();

    // Create Test Visit 3 (For cancellation & terminal state test)
    const v3 = await FieldVisit.create({
      visitNumber: visitNum3,
      visitType: 'palliative_assessment',
      status: 'assigned',
      assignmentStatus: 'pending',
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Registered Nurse',
      providerPhone: caregiver1Phone,
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientDetails: {
        fullName: patient1Name,
        phone: patient1Phone,
        address: 'Plot 10, Kalyani Nagar, Pune',
        city: 'Pune',
        pincode: '411006',
        cluster: 'Pune East',
      },
      scheduledDate: todayStr,
      timeSlot: '16:30 - 18:00',
      timestamps: { assignedAt: new Date() },
    });
    visit3Id = v3._id.toString();

    // Create Overdue Visit (scheduled in the past)
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const vMissed = await FieldVisit.create({
      visitNumber: visitNumMissed,
      visitType: 'clinical_care',
      status: 'assigned',
      assignmentStatus: 'pending',
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Registered Nurse',
      providerPhone: caregiver1Phone,
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientDetails: {
        fullName: patient1Name,
        phone: patient1Phone,
        address: 'Plot 10, Kalyani Nagar, Pune',
        city: 'Pune',
        pincode: '411006',
        cluster: 'Pune East',
      },
      scheduledDate: yesterdayStr,
      timeSlot: '10:00 - 12:00',
      timestamps: { assignedAt: new Date(Date.now() - 86400000 * 2) },
    });
    visitMissedId = vMissed._id.toString();
  });

  after(async () => {
    // Cleanup
    await User.deleteMany({
      phone: {
        $in: [patient1Phone, patient2Phone, caregiver1Phone, caregiver2Phone, consentRefusedPhone],
      },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: [visitNum1, visitNum2, visitNum3, visitNumMissed, visitNumResched] },
    });
    await NotificationLog.deleteMany({
      recipientPhone: {
        $in: [patient1Phone, patient2Phone, caregiver1Phone, caregiver2Phone, consentRefusedPhone],
      },
    });
    await AuditLog.deleteMany({
      'details.visitNumber': { $in: [visitNum1, visitNum2, visitNum3, visitNumMissed, visitNumResched] },
    });
    await disconnectDatabase();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Valid Visit Lifecycle Transitions
  // ---------------------------------------------------------------------------
  it('1. should execute standard visit lifecycle: assigned -> accepted -> in_progress -> completed', async () => {
    // Caregiver accepts assignment
    const acceptRes = await request(app)
      .post(`/api/v1/visits/${visit1Id}/accept`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send();
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.status, 'accepted');
    assert.equal(acceptRes.body.data.assignmentStatus, 'accepted');

    // Caregiver starts visit (in_progress)
    const startRes = await request(app)
      .patch(`/api/v1/visits/${visit1Id}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'in_progress' });
    assert.equal(startRes.status, 200);
    assert.equal(startRes.body.data.status, 'in_progress');
    assert.ok(startRes.body.data.timestamps.startedAt);

    // Patient notification generated for visit start
    const startNotif = await NotificationLog.findOne({
      recipientPhone: patient1Phone,
      templateId: 'VISIT_STARTED',
    });
    assert.ok(startNotif, 'Patient should receive VISIT_STARTED notification');

    // Caregiver completes visit
    const completeRes = await request(app)
      .patch(`/api/v1/visits/${visit1Id}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'completed' });
    assert.equal(completeRes.status, 200);
    assert.equal(completeRes.body.data.status, 'completed');
    assert.ok(completeRes.body.data.timestamps.completedAt);

    // Patient notification generated for completion
    const completeNotif = await NotificationLog.findOne({
      recipientPhone: patient1Phone,
      templateId: 'VISIT_COMPLETED',
    });
    assert.ok(completeNotif, 'Patient should receive VISIT_COMPLETED notification');
  });

  // ---------------------------------------------------------------------------
  // Test 2: Unauthorized and Invalid Status Transitions
  // ---------------------------------------------------------------------------
  it('2. should reject unauthorized roles and invalid state machine transitions', async () => {
    // Patient attempts to change status -> 403 Forbidden
    const patientAttempt = await request(app)
      .patch(`/api/v1/visits/${visit2Id}/status`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({ status: 'in_progress' });
    assert.equal(patientAttempt.status, 403);

    // Caregiver attempts direct jump from assigned to completed without acceptance -> 400
    const invalidJump = await request(app)
      .patch(`/api/v1/visits/${visit2Id}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'completed' });
    assert.equal(invalidJump.status, 400);
    assert.match(invalidJump.body.error?.message || invalidJump.body.message || '', /accepted before/i);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Caregiver Ownership Checks
  // ---------------------------------------------------------------------------
  it('3. should enforce caregiver ownership (Caregiver 2 cannot alter Caregiver 1 visit)', async () => {
    // Caregiver 2 tries to accept Caregiver 1's visit -> 403
    const foreignAccept = await request(app)
      .post(`/api/v1/visits/${visit2Id}/accept`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send();
    assert.equal(foreignAccept.status, 403);

    // Caregiver 2 tries to start Caregiver 1's visit -> 403
    const foreignStart = await request(app)
      .patch(`/api/v1/visits/${visit2Id}/status`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send({ status: 'in_progress' });
    assert.equal(foreignStart.status, 403);
  });

  // ---------------------------------------------------------------------------
  // Test 4: Acceptance Before Confirmed Assignment
  // ---------------------------------------------------------------------------
  it('4. should prevent starting care before visit assignment is accepted', async () => {
    // Visit 2 is currently status: assigned, assignmentStatus: pending
    const prematureStart = await request(app)
      .patch(`/api/v1/visits/${visit2Id}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'in_progress' });
    assert.equal(prematureStart.status, 400);
    assert.match(prematureStart.body.error?.message || prematureStart.body.message || '', /must be accepted/i);
  });

  // ---------------------------------------------------------------------------
  // Test 5: Rejected Caregiver Exclusion
  // ---------------------------------------------------------------------------
  it('5. should handle caregiver rejection, flag replacement required, and exclude rejected caregiver', async () => {
    // Caregiver 1 rejects Visit 2 with mandatory reason
    const rejectRes = await request(app)
      .post(`/api/v1/visits/${visit2Id}/reject`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ reason: 'Emergency hospital call-in duty' });
    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.body.data.status, 'rejected');
    assert.equal(rejectRes.body.data.assignmentStatus, 'rejected');
    assert.equal(rejectRes.body.data.replacementRequired, true);

    // Rejected caregiver cannot now start the visit -> 403
    const rejectedStart = await request(app)
      .patch(`/api/v1/visits/${visit2Id}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'in_progress' });
    assert.equal(rejectedStart.status, 403);

    // Patient view does NOT show rejected caregiver as confirmed
    const patientView = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(patientView.status, 200);
    const v2DTO = [...patientView.body.data.upcoming, ...patientView.body.data.past].find(
      (v: any) => v.visitNumber === visitNum2
    );
    assert.ok(v2DTO);
    assert.equal(v2DTO.assignedCaregiver, null, 'Rejected caregiver must not appear confirmed in patient view');
  });

  // ---------------------------------------------------------------------------
  // Test 6: Replacement Assignment and Acceptance
  // ---------------------------------------------------------------------------
  it('6. should reassign rejected visit to replacement caregiver and require acceptance', async () => {
    // Admin reassigns Visit 2 to Caregiver 2
    const reassignRes = await request(app)
      .patch(`/api/v1/admin/field-visits/${visit2Id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: caregiver2UserId,
        providerName: caregiver2Name,
        providerPhone: caregiver2Phone,
        reason: 'Staff replacement due to prior staff emergency call-in',
      });
    assert.equal(reassignRes.status, 200);
    assert.equal(reassignRes.body.data.status, 'assigned');
    assert.equal(reassignRes.body.data.assignmentStatus, 'pending');
    assert.equal(reassignRes.body.data.replacementRequired, false);
    assert.equal(reassignRes.body.data.providerName, caregiver2Name);

    // Replacement Caregiver 2 must accept before starting
    const prematureStart = await request(app)
      .patch(`/api/v1/visits/${visit2Id}/status`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send({ status: 'in_progress' });
    assert.equal(prematureStart.status, 400);

    // Caregiver 2 accepts assignment
    const acceptRes = await request(app)
      .post(`/api/v1/visits/${visit2Id}/accept`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send();
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.status, 'accepted');
    assert.equal(acceptRes.body.data.assignmentStatus, 'accepted');

    // Caregiver 2 starts care successfully
    const startRes = await request(app)
      .patch(`/api/v1/visits/${visit2Id}/status`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send({ status: 'in_progress' });
    assert.equal(startRes.status, 200);
    assert.equal(startRes.body.data.status, 'in_progress');
  });

  // ---------------------------------------------------------------------------
  // Test 7: Start and Completion Idempotency
  // ---------------------------------------------------------------------------
  it('7. should guarantee start and completion idempotency without duplicate logs or errors', async () => {
    // Double start: calling in_progress on already in_progress visit returns current visit safely
    const firstStart = await request(app)
      .patch(`/api/v1/visits/${visit2Id}/status`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send({ status: 'in_progress' });
    assert.equal(firstStart.status, 200);

    const secondStart = await request(app)
      .patch(`/api/v1/visits/${visit2Id}/status`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send({ status: 'in_progress' });
    assert.equal(secondStart.status, 200);
    assert.equal(secondStart.body.data.status, 'in_progress');

    // Complete visit
    const complete1 = await request(app)
      .patch(`/api/v1/visits/${visit2Id}/status`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send({ status: 'completed' });
    assert.equal(complete1.status, 200);
    assert.equal(complete1.body.data.status, 'completed');

    // Double completion: calling completed again returns existing completed visit
    const complete2 = await request(app)
      .patch(`/api/v1/visits/${visit2Id}/status`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send({ status: 'completed' });
    assert.equal(complete2.status, 200);
    assert.equal(complete2.body.data.status, 'completed');
  });

  // ---------------------------------------------------------------------------
  // Test 8: Cancellation Terminal State and Reschedule Regressions
  // ---------------------------------------------------------------------------
  it('8. should enforce cancelled as a terminal state and preserve reschedule integrity', async () => {
    // Admin cancels Visit 3
    const cancelRes = await request(app)
      .patch(`/api/v1/visits/${visit3Id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', notes: 'Patient admitted to oncology inpatient unit' });
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'cancelled');

    // Cannot transition cancelled visit to in_progress or assigned -> 400
    const resumeAttempt = await request(app)
      .patch(`/api/v1/visits/${visit3Id}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'in_progress' });
    assert.equal(resumeAttempt.status, 400);
    assert.match(resumeAttempt.body.error?.message || resumeAttempt.body.message || '', /terminal state/i);
  });

  // ---------------------------------------------------------------------------
  // Test 9: Missed-Visit Eligibility and Duplicate Prevention
  // ---------------------------------------------------------------------------
  it('9. should safely detect overdue visits, mark as missed, and prevent duplicate transitions', async () => {
    // Visit visitNumMissed was scheduled yesterday and remains uncompleted
    const sweepResult = await sweepAndDetectOverdueVisits();
    assert.ok(sweepResult.totalEvaluated > 0);
    assert.ok(sweepResult.missedCount >= 1);

    const missedDoc = await FieldVisit.findById(visitMissedId);
    assert.equal(missedDoc?.status, 'missed');
    assert.ok(missedDoc?.timestamps.missedAt);

    // Audit log recorded
    const missedAudit = await AuditLog.findOne({
      targetId: visitMissedId,
      action: 'FIELD_VISIT_MARKED_MISSED',
    });
    assert.ok(missedAudit, 'Audit log should record FIELD_VISIT_MARKED_MISSED');

    // Repeated sweep should NOT re-mark already missed visit
    const secondSweep = await sweepAndDetectOverdueVisits();
    const reMissed = secondSweep.missedVisits.find((v) => v._id === visitMissedId);
    assert.equal(reMissed, undefined, 'Already missed visit should not be marked again');

    // Admin sweep endpoint returns 200
    const adminSweep = await request(app)
      .post('/api/v1/admin/field-visits/check-missed')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();
    assert.equal(adminSweep.status, 200);
    assert.equal(adminSweep.body.success, true);
  });

  // ---------------------------------------------------------------------------
  // Test 10: Notification Persistence and Retry Deduplication
  // ---------------------------------------------------------------------------
  it('10. should persist notifications to MongoDB and deduplicate dispatches via idempotency keys', async () => {
    const key = `test_idempotency_p5_${Date.now()}`;

    // First dispatch
    const notif1 = await sendPatientNotification({
      recipientPhone: patient1Phone,
      recipientName: patient1Name,
      channel: 'sms',
      templateId: 'VISIT_STARTED',
      templateParams: {
        patientName: patient1Name,
        providerName: caregiver1Name,
      },
      idempotencyKey: key,
    });
    assert.ok(notif1._id);

    // Duplicate dispatch with exact same key returns existing record
    const notif2 = await sendPatientNotification({
      recipientPhone: patient1Phone,
      recipientName: patient1Name,
      channel: 'sms',
      templateId: 'VISIT_STARTED',
      templateParams: {
        patientName: patient1Name,
        providerName: caregiver1Name,
      },
      idempotencyKey: key,
    });
    assert.equal(notif1._id.toString(), notif2._id.toString(), 'Duplicate dispatch should return existing record');

    const totalCount = await NotificationLog.countDocuments({ idempotencyKey: key });
    assert.equal(totalCount, 1, 'Only one record must exist in DB for unique idempotency key');
  });

  // ---------------------------------------------------------------------------
  // Test 11: Notification Recipient Isolation and Read Authorization
  // ---------------------------------------------------------------------------
  it('11. should isolate notifications by recipient and reject unauthorized read attempts', async () => {
    // Create distinct notification for Patient 2
    const p2Notif = await NotificationLog.create({
      recipientPhone: patient2Phone,
      recipientName: patient2Name,
      recipientRole: 'patient',
      channel: 'in_app',
      templateId: 'VISIT_STARTED',
      messageBody: 'Your healthcare visit has started.',
      consentChecked: true,
      status: 'delivered',
      provider: 'in_app_system',
      isRead: false,
    });

    // Patient 1 queries their notifications: must NOT see Patient 2's notification
    const p1Feed = await request(app)
      .get('/api/v1/patients/me/notifications')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(p1Feed.status, 200);
    const foundP2InP1 = p1Feed.body.data.notifications.some((n: any) => n._id === p2Notif._id.toString());
    assert.equal(foundP2InP1, false, 'Patient 1 must not see Patient 2 notifications');

    // Patient 1 attempts to mark Patient 2's notification as read -> 403 Forbidden
    const illegalMark = await request(app)
      .patch(`/api/v1/patients/me/notifications/${p2Notif._id}/read`)
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(illegalMark.status, 403);

    // Patient 2 marks their own notification as read -> 200 OK
    const legalMark = await request(app)
      .patch(`/api/v1/patients/me/notifications/${p2Notif._id}/read`)
      .set('Authorization', `Bearer ${patient2Token}`);
    assert.equal(legalMark.status, 200);
    assert.equal(legalMark.body.data.isRead, true);

    // Patient attempts to access admin notifications -> 403 Forbidden
    const patientAdminNotif = await request(app)
      .get('/api/v1/admin/notifications')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(patientAdminNotif.status, 403);
  });

  // ---------------------------------------------------------------------------
  // Test 12: Notification Failure Handling
  // ---------------------------------------------------------------------------
  it('12. should handle consent refusal gracefully without corrupting state or crashing', async () => {
    const consentFailNotif = await sendPatientNotification({
      recipientPhone: consentRefusedPhone,
      recipientName: consentRefusedName,
      channel: 'sms',
      templateId: 'VISIT_STARTED',
      templateParams: {
        patientName: consentRefusedName,
        providerName: caregiver1Name,
      },
    });
    assert.equal(consentFailNotif.status, 'failed');
    assert.match(consentFailNotif.failureReason || '', /consent/i);
  });

  // ---------------------------------------------------------------------------
  // Test 13: Admin Dashboard Status Consistency
  // ---------------------------------------------------------------------------
  it('13. should provide accurate operational stats in Admin Dashboard', async () => {
    const statsRes = await request(app)
      .get('/api/v1/admin/field-visits/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(statsRes.status, 200);
    assert.ok(statsRes.body.data.totalVisits >= 4);
    assert.ok(typeof statsRes.body.data.missedCount === 'number');
    assert.ok(typeof statsRes.body.data.completedCount === 'number');
    assert.ok(typeof statsRes.body.data.pendingAcceptanceCount === 'number');
    assert.ok(typeof statsRes.body.data.rejectedCount === 'number');
  });

  // ---------------------------------------------------------------------------
  // Test 14: Patient/Caregiver Data Consistency After Reload
  // ---------------------------------------------------------------------------
  it('14. should guarantee backend state is authoritative after reload', async () => {
    const v1Doc = await FieldVisit.findById(visit1Id).lean();
    assert.equal(v1Doc?.status, 'completed');

    const patientSchedule = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(patientSchedule.status, 200);
    const v1InPatient = patientSchedule.body.data.past.find((v: any) => v.visitNumber === visitNum1);
    assert.ok(v1InPatient);
    assert.equal(v1InPatient.status, 'completed');
  });

  // ---------------------------------------------------------------------------
  // Test 15: Audit History Correctness
  // ---------------------------------------------------------------------------
  it('15. should record complete audit history with actor, timestamp, and status changes', async () => {
    const logs = await AuditLog.find({ 'details.visitNumber': visitNum1 }).sort({ timestamp: 1 });
    assert.ok(logs.length >= 2);
    const hasStarted = logs.some((l) => l.action === 'FIELD_VISIT_STATUS_IN_PROGRESS');
    const hasCompleted = logs.some((l) => l.action === 'FIELD_VISIT_STATUS_COMPLETED');
    assert.ok(hasStarted, 'Audit log should include in_progress transition');
    assert.ok(hasCompleted, 'Audit log should include completed transition');
  });

  // ---------------------------------------------------------------------------
  // Test 16: Phase 1 Report Deletion and Retention Regression
  // ---------------------------------------------------------------------------
  it('16. [Phase 1 Regression] should retain clinical documentation after soft hide from patient', async () => {
    // Record clinical notes on visit 1
    const v1 = await FieldVisit.findById(visit1Id);
    assert.ok(v1);
    v1.clinicalDocumentation = {
      vitals: { bloodPressure: '120/80', pulse: 72, spO2: 99 },
      clinicalNotes: 'Phase 5 patient stable and resting comfortably.',
      signedAt: new Date(),
    } as any;
    await v1.save();

    // Patient hides visit
    const hideRes = await request(app)
      .delete(`/api/v1/patients/me/visits/${visit1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({ reason: 'Personal preference hide' });
    assert.equal(hideRes.status, 200);

    // Verify clinical doc is preserved in DB for clinical audit
    const reloaded = await FieldVisit.findById(visit1Id);
    assert.equal(reloaded?.clinicalDocumentation?.clinicalNotes, 'Phase 5 patient stable and resting comfortably.');
    assert.equal(reloaded?.hiddenFromPatient, true);
  });

  // ---------------------------------------------------------------------------
  // Test 17: Phase 2 Reschedule Workflow Regression
  // ---------------------------------------------------------------------------
  it('17. [Phase 2 Regression] should support patient reschedule requests without destroying visit history', async () => {
    // Create new visit for reschedule test
    const todayStr = new Date().toISOString().slice(0, 10);
    const vResched = await FieldVisit.create({
      visitNumber: visitNumResched,
      visitType: 'clinical_care',
      status: 'assigned',
      assignmentStatus: 'pending',
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Registered Nurse',
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientDetails: {
        fullName: patient1Name,
        phone: patient1Phone,
        address: 'Plot 10, Kalyani Nagar, Pune',
        city: 'Pune',
        pincode: '411006',
        cluster: 'Pune East',
      },
      scheduledDate: todayStr,
      timeSlot: '11:00 - 13:00',
      timestamps: { assignedAt: new Date() },
    });
    visitReschedId = vResched._id.toString();

    // Patient requests reschedule
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const reschedReq = await request(app)
      .post(`/api/v1/patients/me/visits/${visitReschedId}/reschedule`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        requestedDate: tomorrowStr,
        requestedTimeSlot: '15:00 - 17:00',
        reason: 'Phase 5 Family doctor consultation conflict',
      });
    assert.equal(reschedReq.status, 201);
    assert.equal(reschedReq.body.data.status, 'pending');
  });

  // ---------------------------------------------------------------------------
  // Test 18: Phase 3 Assignment Acceptance & Rejection Regression
  // ---------------------------------------------------------------------------
  it('18. [Phase 3 Regression] should enforce mandatory rejection reason and update status accurately', async () => {
    // Caregiver rejects with too short reason -> 400
    const shortReason = await request(app)
      .post(`/api/v1/visits/${visitReschedId}/reject`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ reason: 'no' });
    assert.equal(shortReason.status, 400);

    // Caregiver rejects with valid reason -> 200
    const validReject = await request(app)
      .post(`/api/v1/visits/${visitReschedId}/reject`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ reason: 'Phase 5 valid nurse clinical conflict' });
    assert.equal(validReject.status, 200);
    assert.equal(validReject.body.data.status, 'rejected');
  });

  // ---------------------------------------------------------------------------
  // Test 19: Phase 4 Reassignment and Concurrency Protection Regression
  // ---------------------------------------------------------------------------
  it('19. [Phase 4 Regression] should reassign caregiver safely and maintain concurrency integrity', async () => {
    const reassignRes = await request(app)
      .patch(`/api/v1/admin/field-visits/${visitReschedId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: caregiver2UserId,
        providerName: caregiver2Name,
        providerPhone: caregiver2Phone,
        reason: 'Phase 5 administrative reassignment',
      });
    assert.equal(reassignRes.status, 200);
    assert.equal(reassignRes.body.data.providerName, caregiver2Name);
  });

  // ---------------------------------------------------------------------------
  // Test 20: Subscription Lifecycle and Persistence Regression
  // ---------------------------------------------------------------------------
  it('20. [Subscription Lifecycle Regression] should maintain active subscription state and remaining visits', async () => {
    // Find or create a test subscription plan
    let plan = await CaregiverPlan.findOne({ planCode: 'P5-TEST-PLAN' });
    if (!plan) {
      plan = await CaregiverPlan.create({
        planCode: 'P5-TEST-PLAN',
        title: 'Phase 5 Comprehensive Care Plan',
        planType: 'monthly_subscription',
        category: 'palliative',
        durationDays: 30,
        totalVisitsIncluded: 10,
        hoursPerVisit: 2,
        customerPrice: 15000,
        caregiverPayout: 10000,
        description: 'Test plan for Phase 5 verification',
        features: ['Daily Nursing', 'Vitals Charting'],
        isActive: true,
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const sub = await CaregiverSubscription.create({
      subscriptionNumber: `VQ-SUB-P5-${Date.now()}`,
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientName: patient1Name,
      patientPhone: patient1Phone,
      planId: plan._id,
      planCode: plan.planCode,
      planTitle: plan.title,
      totalVisitsIncluded: 10,
      visitsCompleted: 2,
      visitsRemaining: 8,
      pricing: {
        customerPrice: 15000,
        caregiverPayout: 10000,
        platformCommission: 5000,
      },
      status: 'active',
      startDate: todayStr,
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      assignedCaregiverId: new mongoose.Types.ObjectId(caregiver2UserId),
      assignedCaregiverName: caregiver2Name,
      assignedCaregiverPhone: caregiver2Phone,
    });

    assert.equal(sub.status, 'active');
    assert.equal(sub.visitsRemaining, 8);

    // Patient queries their assigned caregiver from active subscription
    const caregiverRes = await request(app)
      .get('/api/v1/patients/me/caregiver')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(caregiverRes.status, 200);
    assert.ok(caregiverRes.body.data.assignedCaregiver);
    assert.equal(caregiverRes.body.data.assignedCaregiver.name, caregiver2Name);
    assert.equal(caregiverRes.body.data.assignedCaregiver.isConfirmed, true);

    // Cleanup subscription
    await CaregiverSubscription.deleteOne({ _id: sub._id });
  });
});
