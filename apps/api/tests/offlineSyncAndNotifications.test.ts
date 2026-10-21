import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  User,
  FieldVisit,
  HospitalReferral,
  SyncOperation,
  NotificationLog,
  AuditLog,
} from '../src/models/index.js';
import {
  sendPatientNotification,
  formatNotificationMessage,
} from '../src/services/notificationService.js';

describe('Phase 4 — Offline Field Operations, Secure Sync & Patient Notifications Test Suite', () => {
  const app = createApp();

  let clinicianAToken: string;
  let clinicianAUserId: string;
  const clinicianAPhone = '9876543301';

  let clinicianBToken: string;
  let clinicianBUserId: string;
  const clinicianBPhone = '9876543302';

  let patientToken: string;
  let patientUserId: string;
  const patientPhone = '9876543303';

  let noConsentPatientToken: string;
  let noConsentPatientUserId: string;
  const noConsentPatientPhone = '9876543304';

  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9876543309';

  let testReferralId: string;
  let testVisitId: string;
  let testVisitNumber = 'TEST-VISIT-SYNC-01';

  before(async () => {
    await connectDatabase();

    // Clean up test entities
    await User.deleteMany({
      $or: [
        { phone: { $in: [clinicianAPhone, clinicianBPhone, patientPhone, noConsentPatientPhone, adminPhone] } },
        { email: { $in: ['anita.sync4@vivoquest.in', 'suresh.sync4@vivoquest.in', 'ramesh.sync4@gmail.com', 'meena.sync4@gmail.com', 'ops.lead.sync4@vivoquest.in'] } },
      ],
    });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-VISIT-SYNC' } });
    await HospitalReferral.deleteMany({ referralNumber: { $regex: 'TEST-REF-SYNC' } });
    await SyncOperation.deleteMany({ clientOperationId: { $regex: 'TEST-OP' } });
    await NotificationLog.deleteMany({
      recipientPhone: { $in: [clinicianAPhone, patientPhone, noConsentPatientPhone] },
    });

    // 1. Register Clinician A
    const regClinA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sister Anita Deshmukh, RN',
        phone: clinicianAPhone,
        email: 'anita.sync4@vivoquest.in',
        password: 'Password#2026',
        role: 'professional',
        consentAccepted: true,
      });
    assert.strictEqual(regClinA.status, 201);
    clinicianAToken = regClinA.body.data.token;
    clinicianAUserId = regClinA.body.data.user.id || regClinA.body.data.user._id;

    // 2. Register Clinician B (Unauthorized for Clinician A visits)
    const regClinB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Dr. Suresh Patil',
        phone: clinicianBPhone,
        email: 'suresh.sync4@vivoquest.in',
        password: 'Password#2026',
        role: 'professional',
        consentAccepted: true,
      });
    assert.strictEqual(regClinB.status, 201);
    clinicianBToken = regClinB.body.data.token;
    clinicianBUserId = regClinB.body.data.user.id || regClinB.body.data.user._id;

    // 3. Register Patient (Consented)
    const regPat = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Ramesh Kulkarni',
        phone: patientPhone,
        email: 'ramesh.sync4@gmail.com',
        password: 'Password#2026',
        role: 'patient',
        consentAccepted: true,
      });
    assert.strictEqual(regPat.status, 201);
    patientToken = regPat.body.data.token;
    patientUserId = regPat.body.data.user.id || regPat.body.data.user._id;

    // 4. Register Patient and then revoke communication consent
    const regNoConsent = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Meena Sharma',
        phone: noConsentPatientPhone,
        email: 'meena.sync4@gmail.com',
        password: 'Password#2026',
        role: 'patient',
        consentAccepted: true,
      });
    assert.strictEqual(regNoConsent.status, 201);
    noConsentPatientToken = regNoConsent.body.data.token;
    noConsentPatientUserId = regNoConsent.body.data.user.id || regNoConsent.body.data.user._id;
    // Patient revokes communication consent:
    await User.findByIdAndUpdate(noConsentPatientUserId, {
      'dpdpConsent.accepted': false,
      consentAccepted: false,
    });

    // 5. Register Admin
    const regAdmin = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Operational Lead Admin',
        phone: adminPhone,
        email: 'ops.lead.sync4@vivoquest.in',
        password: 'Password#2026',
        role: 'admin',
        consentAccepted: true,
      });
    assert.strictEqual(regAdmin.status, 201);
    adminToken = regAdmin.body.data.token;
    adminUserId = regAdmin.body.data.user.id || regAdmin.body.data.user._id;

    // 6. Create Base Referral
    const ref = await HospitalReferral.create({
      referralNumber: 'TEST-REF-SYNC-01',
      hospitalId: new mongoose.Types.ObjectId(),
      hospitalName: 'Tata Memorial Hospital Sync Hub',
      referringStaff: {
        name: 'Dr. Rajiv Menon',
        department: 'Oncology',
        designation: 'Senior Registrar',
        phone: '9820011099',
      },
      patientDetails: {
        fullName: 'Ramesh Kulkarni',
        age: 62,
        gender: 'male',
        phone: patientPhone,
        address: 'Flat 402, Shivajinagar',
        city: 'Pune',
        pincode: '411005',
        cluster: 'Pune Central',
      },
      clinicalSummary: {
        primaryDiagnosis: 'Advanced Lung Neoplasm',
        mobilityStatus: 'assisted_walker',
        clinicalNotes: 'Palliative dressing change',
      },
      requestedServices: [
        {
          serviceCode: 'NUR-01',
          serviceName: 'Skilled Nursing & Wound Care',
          frequency: 'daily',
          durationDays: 7,
          preferredStartDate: new Date(),
        },
      ],
      status: 'approved',
      assignedProviders: [
        {
          providerId: new mongoose.Types.ObjectId(clinicianAUserId),
          name: 'Sister Anita Deshmukh, RN',
          role: 'nurse',
          phone: clinicianAPhone,
          serviceAssigned: 'Skilled Nursing',
          assignedAt: new Date(),
        },
      ],
      auditTrail: [
        {
          action: 'CREATED_TEST',
          performedBy: new mongoose.Types.ObjectId(adminUserId),
          role: 'admin',
          timestamp: new Date(),
        },
      ],
    });
    testReferralId = ref._id.toString();

    // 7. Create Test Field Visit assigned to Clinician A
    const visit = await FieldVisit.create({
      visitNumber: testVisitNumber,
      referralId: ref._id,
      patientDetails: {
        fullName: 'Ramesh Kulkarni',
        phone: patientPhone,
        address: 'Flat 402, Shivajinagar',
        city: 'Pune',
        pincode: '411005',
        cluster: 'Pune Central',
      },
      providerId: new mongoose.Types.ObjectId(clinicianAUserId),
      providerName: 'Sister Anita Deshmukh, RN',
      providerRole: 'nurse',
      providerPhone: clinicianAPhone,
      visitType: 'nursing_procedure',
      clinicalInstructions: 'Administer analgesics, measure vital signs, inspect dressing.',
      status: 'assigned',
      scheduledDate: new Date().toISOString().slice(0, 10),
      timeSlot: '10:00 AM - 12:00 PM',
      statusHistory: [
        {
          status: 'assigned',
          changedBy: new mongoose.Types.ObjectId(adminUserId),
          changedByRole: 'admin',
          changedByName: 'Admin',
          timestamp: new Date(),
        },
      ],
    });
    testVisitId = visit._id.toString();
  });

  after(async () => {
    // Cleanup
    await User.deleteMany({
      $or: [
        { phone: { $in: [clinicianAPhone, clinicianBPhone, patientPhone, noConsentPatientPhone, adminPhone] } },
        { email: { $in: ['anita.sync4@vivoquest.in', 'suresh.sync4@vivoquest.in', 'ramesh.sync4@gmail.com', 'meena.sync4@gmail.com', 'ops.lead.sync4@vivoquest.in'] } },
      ],
    });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-VISIT-SYNC' } });
    await HospitalReferral.deleteMany({ referralNumber: { $regex: 'TEST-REF-SYNC' } });
    await SyncOperation.deleteMany({ clientOperationId: { $regex: 'TEST-OP' } });
    await NotificationLog.deleteMany({
      recipientPhone: { $in: [clinicianAPhone, patientPhone, noConsentPatientPhone] },
    });
    await disconnectDatabase();
  });

  // ===========================================================================
  // 1. OFFLINE BATCH SYNC ENDPOINT & IDEMPOTENCY
  // ===========================================================================
  describe('1. Server-Side Offline Batch Sync (POST /api/v1/visits/sync)', () => {
    it('should reject sync submission if operations array is missing or empty (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/visits/sync')
        .set('Authorization', `Bearer ${clinicianAToken}`)
        .send({ operations: [] });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error.message, /operations/i);
    });

    it('should reject unauthenticated sync request (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/visits/sync')
        .send({
          operations: [
            {
              clientOperationId: 'TEST-OP-UNAUTH-01',
              visitId: testVisitId,
              operationType: 'status_update',
              clientTimestamp: new Date().toISOString(),
              payload: { status: 'arrived' },
            },
          ],
        });

      assert.strictEqual(res.status, 401);
    });

    it('should forbid Clinician B from syncing documentation on a visit assigned to Clinician A', async () => {
      const opId = `TEST-OP-FORBID-${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/visits/sync')
        .set('Authorization', `Bearer ${clinicianBToken}`)
        .send({
          operations: [
            {
              clientOperationId: opId,
              visitId: testVisitId,
              visitNumber: testVisitNumber,
              operationType: 'clinical_documentation',
              clientTimestamp: new Date().toISOString(),
              payload: {
                clinicalNotes: 'Unauthorized notes attempt',
              },
            },
          ],
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.summary.failed, 1);
      assert.strictEqual(res.body.data.results[0].status, 'failed');
      assert.match(res.body.data.results[0].errorReason, /forbidden|not assigned|not authorized/i);
    });

    it('should successfully apply offline status update and clinical documentation batch', async () => {
      const opIdStatus = `TEST-OP-APPLY-STAT-${Date.now()}`;
      const opIdDoc = `TEST-OP-APPLY-DOC-${Date.now()}`;

      // Transition assigned -> in_progress
      await FieldVisit.findByIdAndUpdate(testVisitId, { status: 'in_progress' });

      const res = await request(app)
        .post('/api/v1/visits/sync')
        .set('Authorization', `Bearer ${clinicianAToken}`)
        .send({
          operations: [
            {
              clientOperationId: opIdDoc,
              visitId: testVisitId,
              visitNumber: testVisitNumber,
              operationType: 'clinical_documentation',
              expectedStatus: 'in_progress',
              clientTimestamp: new Date().toISOString(),
              payload: {
                vitals: {
                  bloodPressure: '122/80 mmHg',
                  pulse: 76,
                  spO2: 98,
                  temperature: '98.4 F',
                },
                clinicalNotes: 'Wound dressing renewed, patient comfortable.',
                proceduresPerformed: ['Wound debridement', 'Dressing change'],
                recommendations: 'Continue current analgesic regimen.',
                markAsCompleted: true,
              },
            },
          ],
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.summary.applied, 1);
      assert.strictEqual(res.body.data.results[0].status, 'applied');

      // Verify that database reflects the synced clinical notes and completed status
      const updatedVisit = await FieldVisit.findById(testVisitId);
      assert.strictEqual(updatedVisit?.status, 'completed');
      assert.strictEqual(updatedVisit?.clinicalDocumentation?.vitals?.bloodPressure, '122/80 mmHg');
      assert.strictEqual(updatedVisit?.clinicalDocumentation?.vitals?.pulse, 76);
      assert.strictEqual(updatedVisit?.clinicalDocumentation?.clinicalNotes, 'Wound dressing renewed, patient comfortable.');

      // Verify SyncOperation record in database
      const syncRecord = await SyncOperation.findOne({ clientOperationId: opIdDoc });
      assert.ok(syncRecord);
      assert.strictEqual(syncRecord.status, 'applied');
      assert.strictEqual(syncRecord.providerName, 'Sister Anita Deshmukh, RN');
    });

    it('should be IDEMPOTENT: repeated sync submission with the same clientOperationId returns cached applied result without double-updating', async () => {
      const opId = `TEST-OP-IDEMPOTENT-${Date.now()}`;

      const visitIdem = await FieldVisit.create({
        visitNumber: `TEST-VISIT-SYNC-IDEM-${Date.now()}`,
        referralId: new mongoose.Types.ObjectId(testReferralId),
        patientDetails: {
          fullName: 'Ramesh Kulkarni',
          phone: patientPhone,
          address: 'Flat 402, Shivajinagar',
          city: 'Pune',
          pincode: '411005',
          cluster: 'Pune Central',
        },
        providerId: new mongoose.Types.ObjectId(clinicianAUserId),
        providerName: 'Sister Anita Deshmukh, RN',
        providerRole: 'nurse',
        providerPhone: clinicianAPhone,
        visitType: 'nursing_procedure',
        status: 'in_progress',
        scheduledDate: new Date().toISOString().slice(0, 10),
        timeSlot: '11:00 AM - 01:00 PM',
      });

      // First submission
      const firstRes = await request(app)
        .post('/api/v1/visits/sync')
        .set('Authorization', `Bearer ${clinicianAToken}`)
        .send({
          operations: [
            {
              clientOperationId: opId,
              visitId: visitIdem._id.toString(),
              visitNumber: visitIdem.visitNumber,
              operationType: 'clinical_documentation',
              clientTimestamp: new Date().toISOString(),
              payload: {
                clinicalNotes: 'Idempotency check note',
                markAsCompleted: false,
              },
            },
          ],
        });

      assert.strictEqual(firstRes.status, 200);
      assert.strictEqual(firstRes.body.data.summary.applied, 1);

      // Count operations in DB
      const countBefore = await SyncOperation.countDocuments({ clientOperationId: opId });
      assert.strictEqual(countBefore, 1);

      // Re-submit identical batch with identical clientOperationId
      const duplicateRes = await request(app)
        .post('/api/v1/visits/sync')
        .set('Authorization', `Bearer ${clinicianAToken}`)
        .send({
          operations: [
            {
              clientOperationId: opId,
              visitId: visitIdem._id.toString(),
              visitNumber: visitIdem.visitNumber,
              operationType: 'clinical_documentation',
              clientTimestamp: new Date().toISOString(),
              payload: {
                clinicalNotes: 'Idempotency check note',
                markAsCompleted: false,
              },
            },
          ],
        });

      assert.strictEqual(duplicateRes.status, 200);
      assert.strictEqual(duplicateRes.body.data.summary.applied, 1);
      assert.strictEqual(duplicateRes.body.data.results[0].status, 'applied');

      // Ensure no duplicate record was created
      const countAfter = await SyncOperation.countDocuments({ clientOperationId: opId });
      assert.strictEqual(countAfter, 1);
    });

    it('should detect PRECONDITION CONFLICT when visit status on server diverges from client expectedStatus', async () => {
      const opId = `TEST-OP-CONFLICT-${Date.now()}`;

      // Server visit is now 'completed' from previous tests
      // Client submits an offline action recorded under assumption the visit was 'assigned'
      const conflictRes = await request(app)
        .post('/api/v1/visits/sync')
        .set('Authorization', `Bearer ${clinicianAToken}`)
        .send({
          operations: [
            {
              clientOperationId: opId,
              visitId: testVisitId,
              visitNumber: testVisitNumber,
              operationType: 'status_update',
              expectedStatus: 'assigned', // Divergence! Server is currently 'completed'
              clientTimestamp: new Date().toISOString(),
              payload: {
                status: 'en_route',
              },
            },
          ],
        });

      assert.strictEqual(conflictRes.status, 200);
      assert.strictEqual(conflictRes.body.data.summary.conflicts, 1);
      assert.strictEqual(conflictRes.body.data.results[0].status, 'conflict');
      assert.strictEqual(conflictRes.body.data.results[0].conflictDetails.serverStatus, 'completed');
      assert.strictEqual(conflictRes.body.data.results[0].conflictDetails.expectedStatus, 'assigned');

      // Verify that visit status on server was NOT corrupted by stale client update
      const visit = await FieldVisit.findById(testVisitId);
      assert.strictEqual(visit?.status, 'completed');

      // Verify SyncOperation is marked as 'conflict'
      const syncRecord = await SyncOperation.findOne({ clientOperationId: opId });
      assert.ok(syncRecord);
      assert.strictEqual(syncRecord.status, 'conflict');
    });

    it('should handle partial batch execution: applied operations succeed while conflicting ones are tagged without aborting batch', async () => {
      // Create a fresh second visit for testing partial batch
      const visit2 = await FieldVisit.create({
        visitNumber: 'TEST-VISIT-SYNC-PARTIAL-02',
        referralId: new mongoose.Types.ObjectId(testReferralId),
        patientDetails: {
          fullName: 'Ramesh Kulkarni',
          phone: patientPhone,
          address: 'Flat 402, Shivajinagar',
          city: 'Pune',
          pincode: '411005',
          cluster: 'Pune Central',
        },
        providerId: new mongoose.Types.ObjectId(clinicianAUserId),
        providerName: 'Sister Anita Deshmukh, RN',
        providerRole: 'nurse',
        providerPhone: clinicianAPhone,
        visitType: 'nursing_procedure',
        status: 'en_route',
        scheduledDate: new Date().toISOString().slice(0, 10),
        timeSlot: '02:00 PM - 04:00 PM',
      });

      const opIdConflict = `TEST-OP-MIXED-CONF-${Date.now()}`;
      const opIdValid = `TEST-OP-MIXED-VALID-${Date.now()}`;

      const res = await request(app)
        .post('/api/v1/visits/sync')
        .set('Authorization', `Bearer ${clinicianAToken}`)
        .send({
          operations: [
            // 1. Conflicting operation on Visit 1
            {
              clientOperationId: opIdConflict,
              visitId: testVisitId,
              visitNumber: testVisitNumber,
              operationType: 'status_update',
              expectedStatus: 'assigned', // Expected assigned, but server is completed -> conflict
              clientTimestamp: new Date().toISOString(),
              payload: { status: 'en_route' },
            },
            // 2. Valid operation on Visit 2
            {
              clientOperationId: opIdValid,
              visitId: visit2._id.toString(),
              visitNumber: visit2.visitNumber,
              operationType: 'status_update',
              expectedStatus: 'en_route', // Matches server
              clientTimestamp: new Date().toISOString(),
              payload: { status: 'arrived' },
            },
          ],
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.summary.conflicts, 1);
      assert.strictEqual(res.body.data.summary.applied, 1);

      // Verify Visit 2 transitioned to 'arrived'
      const updatedVisit2 = await FieldVisit.findById(visit2._id);
      assert.strictEqual(updatedVisit2?.status, 'arrived');
    });
  });

  // ===========================================================================
  // 2. PATIENT NOTIFICATIONS & SENSITIVE DATA PRIVACY
  // ===========================================================================
  describe('2. Patient Notifications & Logistical Template Sanitization', () => {
    it('should format message templates without exposing clinical diagnoses or staging', () => {
      const msgEnRoute = formatNotificationMessage('CLINICIAN_EN_ROUTE', {
        patientName: 'Ramesh',
        providerName: 'Sister Anita',
      });
      assert.match(msgEnRoute, /Sister Anita is now en route/i);
      assert.doesNotMatch(msgEnRoute, /cancer|oncology|stage iv|neoplasm|biopsy/i);

      const msgCompleted = formatNotificationMessage('VISIT_COMPLETED', {
        patientName: 'Ramesh',
        providerName: 'Sister Anita',
      });
      assert.match(msgCompleted, /visit summary is securely available in your Patient Care Hub/i);
      assert.doesNotMatch(msgCompleted, /cancer|terminal|chemo/i);
    });

    it('should dispatch simulated notification when external SMS credentials are unconfigured and clearly tag it', async () => {
      const notif = await sendPatientNotification({
        recipientPhone: patientPhone,
        recipientName: 'Ramesh Kulkarni',
        channel: 'sms',
        templateId: 'CLINICIAN_EN_ROUTE',
        templateParams: {
          patientName: 'Ramesh',
          providerName: 'Sister Anita',
        },
        idempotencyKey: `NOTIF-IDEM-SIM-${Date.now()}`,
      });

      assert.ok(notif);
      assert.strictEqual(notif.status, 'simulated');
      assert.strictEqual(notif.provider, 'simulated_gateway');
      assert.match(notif.providerRef!, /^SIM-SMS-/);
      assert.strictEqual(notif.consentChecked, true);
    });

    it('should prevent duplicate notifications with the exact same idempotencyKey', async () => {
      const idempotencyKey = `NOTIF-UNIQUE-KEY-${Date.now()}`;

      const first = await sendPatientNotification({
        recipientPhone: patientPhone,
        recipientName: 'Ramesh Kulkarni',
        channel: 'whatsapp',
        templateId: 'VISIT_COMPLETED',
        templateParams: {
          patientName: 'Ramesh',
          providerName: 'Sister Anita',
        },
        idempotencyKey,
      });

      const second = await sendPatientNotification({
        recipientPhone: patientPhone,
        recipientName: 'Ramesh Kulkarni',
        channel: 'whatsapp',
        templateId: 'VISIT_COMPLETED',
        templateParams: {
          patientName: 'Ramesh',
          providerName: 'Sister Anita',
        },
        idempotencyKey,
      });

      assert.strictEqual(first._id.toString(), second._id.toString());
      const count = await NotificationLog.countDocuments({ idempotencyKey });
      assert.strictEqual(count, 1);
    });

    it('should BLOCK and fail notification when patient has revoked communication consent (consentAccepted: false)', async () => {
      const notif = await sendPatientNotification({
        recipientPhone: noConsentPatientPhone,
        recipientName: 'Meena Sharma',
        channel: 'sms',
        templateId: 'APPOINTMENT_REMINDER',
        templateParams: {
          patientName: 'Meena',
          date: 'Tomorrow',
          time: '11:00 AM',
          providerName: 'Dr. Rao',
        },
        idempotencyKey: `NOTIF-NOCONSENT-${Date.now()}`,
      });

      assert.strictEqual(notif.consentChecked, false);
      assert.strictEqual(notif.status, 'failed');
      assert.strictEqual(notif.provider, 'consent_guard');
      assert.match(notif.failureReason!, /consent not granted/i);
    });
  });

  // ===========================================================================
  // 3. ADMIN OPERATIONAL MONITORING & RETRY CONTROLS
  // ===========================================================================
  describe('3. Admin Monitoring & Role-Based Access Controls', () => {
    it('should allow authorized admin to query sync operations logs and stats', async () => {
      const resLogs = await request(app)
        .get('/api/v1/admin/sync-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(resLogs.status, 200);
      assert.strictEqual(resLogs.body.success, true);
      assert.ok(Array.isArray(resLogs.body.data));
      assert.ok(resLogs.body.count >= 1);

      const resStats = await request(app)
        .get('/api/v1/admin/sync-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(resStats.status, 200);
      assert.strictEqual(resStats.body.success, true);
      assert.ok(resStats.body.data.total >= 1);
      assert.ok(resStats.body.data.applied >= 1);
      assert.ok(resStats.body.data.conflicts >= 1);
    });

    it('should allow authorized admin to query notification logs with filtering', async () => {
      const res = await request(app)
        .get('/api/v1/admin/notifications?channel=sms')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    it('should allow admin to manually retry a failed notification record', async () => {
      // Find the notification blocked by consent or failed
      const failedNotif = await NotificationLog.findOne({ status: 'failed' });
      assert.ok(failedNotif, 'Should have at least one failed notification from consent test');

      const retryRes = await request(app)
        .post(`/api/v1/admin/notifications/${failedNotif._id}/retry`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(retryRes.status, 200);
      assert.strictEqual(retryRes.body.success, true);
      assert.ok(retryRes.body.data.retryCount >= 1);

      // Verify Audit Log recorded the retry
      const audit = await AuditLog.findOne({
        action: 'NOTIFICATION_RETRIED',
        targetId: failedNotif._id.toString(),
      });
      assert.ok(audit);
    });

    it('should strictly FORBID patients from querying admin sync logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sync-logs')
        .set('Authorization', `Bearer ${patientToken}`);

      assert.strictEqual(res.status, 403);
    });

    it('should strictly FORBID patients from querying admin notification logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${patientToken}`);

      assert.strictEqual(res.status, 403);
    });
  });
});
