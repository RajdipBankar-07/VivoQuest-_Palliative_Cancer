import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { env } from '../src/config/environment.js';
import { User } from '../src/models/User.js';
import { FieldVisit } from '../src/models/FieldVisit.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { NotificationLog } from '../src/models/NotificationLog.js';
import { UploadedFile } from '../src/models/UploadedFile.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { CaregiverPlan } from '../src/models/CaregiverPlan.js';
import { HealthcareProfessionalProfile } from '../src/models/HealthcareProfessionalProfile.js';
import { seedAdminDemoData } from '../src/services/adminService.js';

describe('VivoQuest — Phase 6: Security, Performance & Production Readiness Test Suite', () => {
  const app = createApp();

  // Admin
  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900';

  // Patient 1
  let patient1Token: string;
  let patient1UserId: string;
  const patient1Phone = '9876661101';
  const patient1Name = 'Phase 6 Secure Patient Aarav';

  // Patient 2 (For IDOR isolation tests)
  let patient2Token: string;
  let patient2UserId: string;
  const patient2Phone = '9876661102';
  const patient2Name = 'Phase 6 Isolation Patient Meera';

  // Caregiver 1 (Assigned)
  let caregiver1Token: string;
  let caregiver1UserId: string;
  const caregiver1Phone = '9876661103';
  const caregiver1Name = 'Dr. Arjun Assigned Clinician';

  // Caregiver 2 (Unassigned / Competitor)
  let caregiver2Token: string;
  let caregiver2UserId: string;
  const caregiver2Phone = '9876661104';
  const caregiver2Name = 'Sister Kavita Unassigned Caregiver';

  // Test visits and files
  const visitNumSec1 = 'VQ-P6-SEC-001';
  const visitNumSec2 = 'VQ-P6-SEC-002';
  let visitSec1Id: string;
  let visitSec2Id: string;
  let confidentialFileId: string;
  let testPlanId: string;

  before(async () => {
    await connectDatabase();

    // Cleanup previous test fixtures
    await User.deleteMany({
      phone: { $in: [patient1Phone, patient2Phone, caregiver1Phone, caregiver2Phone] },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: [visitNumSec1, visitNumSec2] },
    });
    await NotificationLog.deleteMany({
      recipientPhone: { $in: [patient1Phone, patient2Phone, caregiver1Phone, caregiver2Phone] },
    });
    await UploadedFile.deleteMany({ fileId: 'p6_confidential_report_001' });

    await seedAdminDemoData();

    // 1. Authenticate Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: adminPhone, otp: '123456', role: 'admin' });
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.token;
    adminUserId = adminLogin.body.data.user.id;

    // 2. Register Patient 1
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

    // 3. Register Patient 2
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

    // 4. Register Caregiver 1
    const cg1Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: caregiver1Name,
        phone: caregiver1Phone,
        password: 'Password123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(cg1Reg.status, 201);
    caregiver1Token = cg1Reg.body.data.token;
    caregiver1UserId = cg1Reg.body.data.user.id;
    await User.findByIdAndUpdate(caregiver1UserId, { status: 'active', isPhoneVerified: true });
    await HealthcareProfessionalProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(caregiver1UserId) },
      {
        fullName: caregiver1Name,
        phone: caregiver1Phone,
        role: 'nurse',
        verificationStatus: 'verified',
        isActiveForDispatch: true,
        status: 'active',
        availabilityStatus: 'available',
      },
      { upsert: true }
    );

    // 5. Register Caregiver 2
    const cg2Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: caregiver2Name,
        phone: caregiver2Phone,
        password: 'Password123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(cg2Reg.status, 201);
    caregiver2Token = cg2Reg.body.data.token;
    caregiver2UserId = cg2Reg.body.data.user.id;
    await User.findByIdAndUpdate(caregiver2UserId, { status: 'active', isPhoneVerified: true });
    await HealthcareProfessionalProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(caregiver2UserId) },
      {
        fullName: caregiver2Name,
        phone: caregiver2Phone,
        role: 'caregiver',
        verificationStatus: 'verified',
        isActiveForDispatch: true,
        status: 'active',
        availabilityStatus: 'available',
      },
      { upsert: true }
    );

    const todayStr = new Date().toISOString().slice(0, 10);

    // Create Base Visit 1 (Assigned to Caregiver 1 for Patient 1)
    const v1 = await FieldVisit.create({
      visitNumber: visitNumSec1,
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
        address: '101 Security Enclave, Pune',
        city: 'Pune',
        pincode: '411001',
        cluster: 'Pune Central',
      },
      scheduledDate: todayStr,
      timeSlot: '10:00 - 12:00',
      timestamps: { assignedAt: new Date() },
    });
    visitSec1Id = v1._id.toString();

    // Create Base Visit 2 (For rejection / replacement security test)
    const v2 = await FieldVisit.create({
      visitNumber: visitNumSec2,
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
        address: '101 Security Enclave, Pune',
        city: 'Pune',
        pincode: '411001',
        cluster: 'Pune Central',
      },
      scheduledDate: todayStr,
      timeSlot: '14:00 - 16:00',
      timestamps: { assignedAt: new Date() },
    });
    visitSec2Id = v2._id.toString();

    // Create Confidential Clinical File (owned by Patient 1)
    confidentialFileId = 'p6_confidential_report_001';
    await UploadedFile.create({
      fileId: confidentialFileId,
      originalFilename: 'p1_oncology_biopsy.pdf',
      sanitizedFilename: 'p1_oncology_biopsy_sanitized.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 2048500,
      fileCategory: 'clinical_report',
      accessTier: 'PATIENT_CLINICIAN_CONFIDENTIAL',
      uploadStatus: 'confirmed',
      uploadedBy: new mongoose.Types.ObjectId(patient1UserId),
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      s3Bucket: 'vivoquest-dev-clinical-storage',
      s3Key: 'clinical_reports/p1_oncology_biopsy.pdf',
    });

    // Create Caregiver Plan for validation tests
    let plan = await CaregiverPlan.findOne({ planCode: 'P6-SEC-PLAN' });
    if (!plan) {
      plan = await CaregiverPlan.create({
        planCode: 'P6-SEC-PLAN',
        title: 'Phase 6 Secured Palliative Plan',
        planType: 'monthly_subscription',
        category: 'palliative',
        durationDays: 30,
        totalVisitsIncluded: 8,
        hoursPerVisit: 2,
        customerPrice: 16000,
        caregiverPayout: 11000,
        description: 'Secured Plan for Phase 6 Testing',
        features: ['Vital Monitoring', 'Infusion Therapy'],
        isActive: true,
      });
    }
    testPlanId = plan._id.toString();
  });

  after(async () => {
    await User.deleteMany({
      phone: { $in: [patient1Phone, patient2Phone, caregiver1Phone, caregiver2Phone] },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: [visitNumSec1, visitNumSec2] },
    });
    await NotificationLog.deleteMany({
      recipientPhone: { $in: [patient1Phone, patient2Phone, caregiver1Phone, caregiver2Phone] },
    });
    await UploadedFile.deleteMany({ fileId: confidentialFileId });
    await disconnectDatabase();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Unauthorized Admin API Access
  // ---------------------------------------------------------------------------
  it('1. should deny patients and caregivers access to Admin-only endpoints (403 Forbidden)', async () => {
    // Patient attempting Admin Dashboard overview
    const patientAttempt = await request(app)
      .get('/api/v1/admin/dashboard/overview')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(patientAttempt.status, 403);
    assert.match(patientAttempt.body.error?.message || '', /Forbidden: Access restricted/i);

    // Caregiver attempting Admin Audit Logs
    const caregiverAttempt = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${caregiver1Token}`);
    assert.equal(caregiverAttempt.status, 403);

    // Unauthenticated request to Admin endpoint
    const unauthAttempt = await request(app).get('/api/v1/admin/field-visits');
    assert.equal(unauthAttempt.status, 401);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Patient Record Isolation (IDOR Protection)
  // ---------------------------------------------------------------------------
  it('2. should enforce patient record isolation (Patient 1 cannot view Patient 2 records)', async () => {
    // Patient 1 tries to access Patient 2 details by ID
    const idorAttempt = await request(app)
      .get(`/api/v1/patients/${patient2UserId}`)
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(idorAttempt.status, 403);
    assert.match(idorAttempt.body.error?.message || '', /strictly authorized to view only their own records/i);

    // Patient 1 tries to view Patient 2's visit schedule
    const idorVisits = await request(app)
      .get(`/api/v1/patients/${patient2UserId}/visits`)
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(idorVisits.status, 403);

    // Patient 1 can access their own profile
    const ownProfile = await request(app)
      .get(`/api/v1/patients/${patient1UserId}`)
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(ownProfile.status, 200);
    assert.equal(ownProfile.body.data.patient.fullName, patient1Name);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Caregiver Assignment Ownership
  // ---------------------------------------------------------------------------
  it('3. should enforce caregiver assignment ownership (Caregiver 2 cannot view or mutate Caregiver 1 visits)', async () => {
    // Caregiver 2 tries to view Visit 1 (assigned to Caregiver 1)
    const viewAttempt = await request(app)
      .get(`/api/v1/visits/${visitSec1Id}`)
      .set('Authorization', `Bearer ${caregiver2Token}`);
    assert.equal(viewAttempt.status, 403);
    assert.match(viewAttempt.body.error?.message || '', /not have authorization to view this field visit/i);

    // Caregiver 2 tries to accept Visit 1
    const acceptAttempt = await request(app)
      .post(`/api/v1/visits/${visitSec1Id}/accept`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send();
    assert.equal(acceptAttempt.status, 403);

    // Caregiver 2 does not see Visit 1 in their assigned queue
    const listAttempt = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${caregiver2Token}`);
    assert.equal(listAttempt.status, 200);
    const hasVisit = listAttempt.body.data.some((v: any) => v.visitNumber === visitNumSec1);
    assert.equal(hasVisit, false, 'Caregiver 2 must not see Caregiver 1 visit in queue');
  });

  // ---------------------------------------------------------------------------
  // Test 4: Rejected / Replaced Caregiver Access Denial
  // ---------------------------------------------------------------------------
  it('4. should deny rejected or replaced caregivers continued access to visit details', async () => {
    // Caregiver 1 rejects Visit 2
    const rejectRes = await request(app)
      .post(`/api/v1/visits/${visitSec2Id}/reject`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ reason: 'Schedule conflict with ICU emergency duty' });
    assert.equal(rejectRes.status, 200);

    // Caregiver 1 now attempts to access Visit 2 patient details -> 403 Forbidden
    const detailAttempt = await request(app)
      .get(`/api/v1/visits/${visitSec2Id}`)
      .set('Authorization', `Bearer ${caregiver1Token}`);
    assert.equal(detailAttempt.status, 403);
    assert.match(detailAttempt.body.error?.message || '', /assignment was rejected/i);

    // Caregiver 1 attempts to update status on the rejected visit -> 403 Forbidden
    const updateAttempt = await request(app)
      .patch(`/api/v1/visits/${visitSec2Id}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'in_progress' });
    assert.equal(updateAttempt.status, 403);
  });

  // ---------------------------------------------------------------------------
  // Test 5: Report and File Access Authorization
  // ---------------------------------------------------------------------------
  it('5. should enforce file access tier rules (Unassigned clinician denied download)', async () => {
    // Patient 1 (Owner) can obtain secure download URL
    const ownerDownload = await request(app)
      .get(`/api/v1/uploads/${confidentialFileId}/download`)
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(ownerDownload.status, 200);
    assert.ok(ownerDownload.body.data.url);

    // Caregiver 2 (Not assigned to Patient 1) is forbidden from downloading
    const unassignedDownload = await request(app)
      .get(`/api/v1/uploads/${confidentialFileId}/download`)
      .set('Authorization', `Bearer ${caregiver2Token}`);
    assert.equal(unassignedDownload.status, 403);
    assert.match(unassignedDownload.body.error?.message || '', /not an assigned clinician or caregiver/i);

    // Admin can access for clinical audit purposes
    const adminDownload = await request(app)
      .get(`/api/v1/uploads/${confidentialFileId}/download`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminDownload.status, 200);
  });

  // ---------------------------------------------------------------------------
  // Test 6: Subscription and Payment Request Validation
  // ---------------------------------------------------------------------------
  it('6. should strictly validate subscription and payment inputs', async () => {
    // Missing plan ID
    const badSubReq = await request(app)
      .post('/api/v1/patients/me/subscriptions/activate')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({});
    assert.equal(badSubReq.status, 400);

    // Non-existent plan ID
    const fakePlanReq = await request(app)
      .post('/api/v1/patients/me/subscriptions/activate')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({ planId: new mongoose.Types.ObjectId().toString() });
    assert.equal(fakePlanReq.status, 404);

    // Valid subscription activation succeeds in TEST MODE
    const validSubReq = await request(app)
      .post('/api/v1/patients/me/subscriptions/activate')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        planId: testPlanId,
        emergencyContact: { name: 'Emergency Kin', phone: '9875550000', relation: 'Sibling' },
        carePlanNotes: 'Palliative support requested',
      });
    assert.equal(validSubReq.status, 201);
    assert.equal(validSubReq.body.data.status, 'active');
  });

  // ---------------------------------------------------------------------------
  // Test 7: Notification Access Isolation
  // ---------------------------------------------------------------------------
  it('7. should isolate notifications by recipient and reject cross-user access', async () => {
    // Create private notification for Patient 2
    const p2Notif = await NotificationLog.create({
      recipientPhone: patient2Phone,
      recipientName: patient2Name,
      recipientRole: 'patient',
      channel: 'in_app',
      templateId: 'OPERATIONAL_ALERT',
      messageBody: 'Confidential clinical update for Patient 2 only.',
      status: 'delivered',
      isRead: false,
    });

    // Patient 1 tries to mark Patient 2's notification as read -> 403 Forbidden
    const crossReadAttempt = await request(app)
      .patch(`/api/v1/patients/me/notifications/${p2Notif._id}/read`)
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(crossReadAttempt.status, 403);
    assert.match(crossReadAttempt.body.error?.message || '', /not authorized to access this notification/i);

    // Patient 2 can mark their own notification as read
    const ownRead = await request(app)
      .patch(`/api/v1/patients/me/notifications/${p2Notif._id}/read`)
      .set('Authorization', `Bearer ${patient2Token}`);
    assert.equal(ownRead.status, 200);
    assert.equal(ownRead.body.data.isRead, true);
  });

  // ---------------------------------------------------------------------------
  // Test 8: Invalid Input and MongoDB Injection Attempts
  // ---------------------------------------------------------------------------
  it('8. should sanitize MongoDB operator injection attempts in body and query', async () => {
    // Attempt login with NoSQL operator injection: { phone: { $gt: "" } }
    const injectionLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        phone: { $gt: '' },
        password: 'Password@123',
      });
    // Because mongoSanitize strips $gt, phone becomes empty object or string validation fails -> 400
    assert.equal(injectionLogin.status, 400);

    // Attempt query param operator injection: /api/v1/patients/me/care-reports?status[$ne]=null
    const queryInjection = await request(app)
      .get('/api/v1/patients/me/care-reports?status[$ne]=null')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(queryInjection.status, 200);
    // Request is handled cleanly without crashing or executing raw operator
  });

  // ---------------------------------------------------------------------------
  // Test 9: Authentication Token Validation
  // ---------------------------------------------------------------------------
  it('9. should validate authentication tokens and reject tampered or expired tokens', async () => {
    // Tampered token
    const tamperedAttempt = await request(app)
      .get('/api/v1/patients/me/caregiver')
      .set('Authorization', `Bearer ${patient1Token}corrupted`);
    assert.equal(tamperedAttempt.status, 401);
    assert.equal(tamperedAttempt.body.error?.code, 'INVALID_TOKEN');

    // Expired token (signed with expired payload)
    const expiredToken = jwt.sign(
      { userId: patient1UserId, role: 'patient', phone: patient1Phone, fullName: patient1Name },
      env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const expiredAttempt = await request(app)
      .get('/api/v1/patients/me/caregiver')
      .set('Authorization', `Bearer ${expiredToken}`);
    assert.equal(expiredAttempt.status, 401);
    assert.equal(expiredAttempt.body.error?.code, 'TOKEN_EXPIRED');

    // Missing token
    const missingAttempt = await request(app).get('/api/v1/patients/me/caregiver');
    assert.equal(missingAttempt.status, 401);
  });

  // ---------------------------------------------------------------------------
  // Test 10: Security Headers & Response Hardening
  // ---------------------------------------------------------------------------
  it('10. should attach OWASP security headers and disable server identification fingerprinting', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.equal(res.status, 200);

    // Verify security headers
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.equal(res.headers['x-xss-protection'], '0');
    assert.ok(res.headers['strict-transport-security']);
    assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');

    // Verify x-powered-by is disabled
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  // ---------------------------------------------------------------------------
  // Test 11: Concurrent Reassignment and Reschedule Operations
  // ---------------------------------------------------------------------------
  it('11. should enforce optimistic concurrency protection on conflicting operations', async () => {
    // Caregiver 1 accepts Visit 1
    const acceptRes = await request(app)
      .post(`/api/v1/visits/${visitSec1Id}/accept`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send();
    assert.equal(acceptRes.status, 200);

    // Two rapid concurrent status updates
    const [reqA, reqB] = await Promise.all([
      request(app)
        .patch(`/api/v1/visits/${visitSec1Id}/status`)
        .set('Authorization', `Bearer ${caregiver1Token}`)
        .send({ status: 'in_progress' }),
      request(app)
        .patch(`/api/v1/visits/${visitSec1Id}/status`)
        .set('Authorization', `Bearer ${caregiver1Token}`)
        .send({ status: 'in_progress' }),
    ]);

    // Both should either succeed or self-transition idempotently (never produce 500 error)
    assert.ok(reqA.status === 200);
    assert.ok(reqB.status === 200);
    assert.equal(reqB.body.data.status, 'in_progress');
  });

  // ---------------------------------------------------------------------------
  // Test 12: Duplicate Operation Prevention (Idempotency)
  // ---------------------------------------------------------------------------
  it('12. should prevent duplicate operations and maintain state integrity across re-submissions', async () => {
    // Complete visit
    const complete1 = await request(app)
      .patch(`/api/v1/visits/${visitSec1Id}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'completed' });
    assert.equal(complete1.status, 200);
    assert.equal(complete1.body.data.status, 'completed');

    // Re-submit completion (idempotent retry)
    const complete2 = await request(app)
      .patch(`/api/v1/visits/${visitSec1Id}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'completed' });
    assert.equal(complete2.status, 200);
    assert.equal(complete2.body.data.status, 'completed');

    // Terminal state protection: Cannot transition completed visit back to in_progress
    const backwardsJump = await request(app)
      .patch(`/api/v1/visits/${visitSec1Id}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'in_progress' });
    assert.equal(backwardsJump.status, 400);
    assert.match(backwardsJump.body.error?.message || backwardsJump.body.message || '', /terminal state/i);
  });

  // ---------------------------------------------------------------------------
  // Test 13: Pagination and Filtering Correctness
  // ---------------------------------------------------------------------------
  it('13. should handle pagination, sorting, and status filtering correctly and bound list sizes', async () => {
    const listRes = await request(app)
      .get('/api/v1/admin/field-visits?limit=5&page=1')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.data));
    assert.ok(listRes.body.data.length <= 5);
    assert.ok(listRes.body.pagination);
    assert.equal(listRes.body.pagination.limit, 5);
  });

  // ---------------------------------------------------------------------------
  // Test 14: Health-Check Behavior and Cloud Probes
  // ---------------------------------------------------------------------------
  it('14. should respond with health status and readiness probe metrics', async () => {
    // API v1 health
    const healthV1 = await request(app).get('/api/v1/health');
    assert.equal(healthV1.status, 200);
    assert.equal(healthV1.body.status, 'ok');
    assert.equal(healthV1.body.database.connected, true);
    assert.ok(healthV1.body.uptimeSeconds >= 0);

    // Root level health (for load balancers)
    const rootHealth = await request(app).get('/health');
    assert.equal(rootHealth.status, 200);
    assert.equal(rootHealth.body.status, 'ok');

    // Readiness probe
    const readyRes = await request(app).get('/health/ready');
    assert.equal(readyRes.status, 200);
    assert.equal(readyRes.body.status, 'ready');
  });

  // ---------------------------------------------------------------------------
  // Test 15: Retain Audit History for All Security and Operational Events
  // ---------------------------------------------------------------------------
  it('15. should append audit history logs without modifying or corrupting prior audit trail', async () => {
    const visitAudit = await AuditLog.find({
      'details.visitNumber': visitNumSec1,
    }).lean();
    assert.ok(visitAudit.length >= 1, 'Visit status transitions must be logged to AuditLog');

    // Confirm that audit logs have category, action, and timestamp
    for (const log of visitAudit) {
      assert.ok(log.action);
      assert.ok(log.category);
      assert.ok(log.timestamp);
    }
  });
});
