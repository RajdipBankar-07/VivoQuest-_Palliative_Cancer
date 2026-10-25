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
  HealthcareProfessionalProfile,
  VisitRescheduleRequest,
  AuditLog,
} from '../src/models/index.js';
import {
  patientApi,
} from '../../mobile-patient/src/services/apiClient';
import { authStorage } from '../../mobile-patient/src/services/authStorage';
import {
  caregiverApi,
} from '../../mobile-caregiver/src/services/apiClient';
import { authStorage as caregiverAuthStorage } from '../../mobile-caregiver/src/services/authStorage';

describe('VivoQuest — Patient App Phase 2 Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  const app = createApp();

  // Test accounts
  const patientAPhone = '9876542001';
  let patientAId: string;
  let patientAToken: string;

  const patientBPhone = '9876542002';
  let patientBId: string;
  let patientBToken: string;

  const caregiverPhone = '9876542011';
  let caregiverId: string;
  let caregiverToken: string;

  const unassignedCaregiverPhone = '9876542012';
  let unassignedCaregiverId: string;
  let unassignedCaregiverToken: string;

  const adminPhone = '9876542099';
  let adminId: string;
  let adminToken: string;

  // Dates
  let tomorrowDateStr: string;
  let inTwoDaysStr: string;
  let inThreeDaysStr: string;
  let yesterdayDateStr: string;

  // Dedicated test visits
  let visitAuthId: string;
  let visitCompletedId: string;
  let visitCancelledId: string;
  let visitPatientBId: string;

  let visitLifecycleId: string;
  let visitApprovalId: string;
  let visitRejectionId: string;
  let visitConflictId: string;
  let existingConflictSlotVisitId: string;
  let visitClientSdkId: string;

  before(async () => {
    await connectDatabase();

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    tomorrowDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tomorrow);
    inTwoDaysStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(inTwoDays);
    inThreeDaysStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(inThreeDays);
    yesterdayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(yesterday);

    // Clean up test records
    const testPhones = [
      patientAPhone,
      patientBPhone,
      caregiverPhone,
      unassignedCaregiverPhone,
      adminPhone,
    ];
    await User.deleteMany({
      $or: [{ phone: { $in: testPhones } }, { email: { $regex: 'p2@vivoquest\\.in' } }],
    });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-P2-VST' } });
    await VisitRescheduleRequest.deleteMany({ visitNumber: { $regex: 'TEST-P2-VST' } });
    await AuditLog.deleteMany({ targetId: { $regex: 'TEST-P2-VST' } });

    // 1. Register Assigned Caregiver (Nurse)
    const resCaregiver = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sister Anita Dsouza',
        phone: caregiverPhone,
        email: 'anita.p2@vivoquest.in',
        role: 'professional',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resCaregiver.status, 201);
    caregiverId = resCaregiver.body.data.user.id;
    caregiverToken = resCaregiver.body.data.token;

    await HealthcareProfessionalProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(caregiverId) },
      {
        title: 'Sister',
        professionType: 'nurse',
        specializations: ['Palliative Oncology Care', 'Wound Management'],
        registrationNumber: 'MNC-2023-9999',
        verificationStatus: 'verified',
      },
      { upsert: true, new: true }
    );

    // 2. Register Unassigned Caregiver
    const resUnassigned = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Caregiver Unassigned',
        phone: unassignedCaregiverPhone,
        email: 'unassigned.p2@vivoquest.in',
        role: 'caregiver',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resUnassigned.status, 201);
    unassignedCaregiverId = resUnassigned.body.data.user.id;
    unassignedCaregiverToken = resUnassigned.body.data.token;

    // 3. Register Admin User
    const resAdmin = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Admin Operations',
        phone: adminPhone,
        email: 'admin.p2@vivoquest.in',
        role: 'admin',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resAdmin.status, 201);
    adminId = resAdmin.body.data.user.id;
    adminToken = resAdmin.body.data.token;

    // 4. Register Patient A
    const resPatA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Rajesh Sharma',
        phone: patientAPhone,
        email: 'rajesh.p2@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatA.status, 201);
    patientAId = resPatA.body.data.user.id;
    patientAToken = resPatA.body.data.token;

    // 5. Register Patient B
    const resPatB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Suresh Patil',
        phone: patientBPhone,
        email: 'suresh.p2@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatB.status, 201);
    patientBId = resPatB.body.data.user.id;
    patientBToken = resPatB.body.data.token;

    // 6. Create Dedicated Visits for Clean Suite Isolation
    // Visit for Auth tests
    const vAuth = await FieldVisit.create({
      visitNumber: 'TEST-P2-VST-AUTH',
      subscriptionId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientDetails: {
        fullName: 'Rajesh Sharma',
        phone: patientAPhone,
        address: 'Flat 101, Galaxy Heights',
        city: 'Pune',
        pincode: '411016',
        cluster: 'Pune Central',
      },
      providerId: new mongoose.Types.ObjectId(caregiverId),
      providerName: 'Sister Anita Dsouza',
      providerRole: 'Palliative Care Specialist',
      providerPhone: caregiverPhone,
      scheduledDate: tomorrowDateStr,
      timeSlot: '09:00 AM - 11:00 AM',
      visitType: 'clinical_care',
      status: 'assigned',
      timestamps: { assignedAt: new Date() },
    });
    visitAuthId = vAuth._id.toString();

    // Visit Completed
    const vComp = await FieldVisit.create({
      visitNumber: 'TEST-P2-VST-COMPLETED',
      subscriptionId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientDetails: {
        fullName: 'Rajesh Sharma',
        phone: patientAPhone,
        address: 'Flat 101, Galaxy Heights',
        city: 'Pune',
        pincode: '411016',
        cluster: 'Pune Central',
      },
      providerId: new mongoose.Types.ObjectId(caregiverId),
      providerName: 'Sister Anita Dsouza',
      providerRole: 'Palliative Care Specialist',
      scheduledDate: yesterdayDateStr,
      timeSlot: '10:00 AM - 12:00 PM',
      visitType: 'clinical_care',
      status: 'completed',
      timestamps: { assignedAt: yesterday, completedAt: yesterday },
    });
    visitCompletedId = vComp._id.toString();

    // Visit Cancelled
    const vCanc = await FieldVisit.create({
      visitNumber: 'TEST-P2-VST-CANCELLED',
      subscriptionId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientDetails: {
        fullName: 'Rajesh Sharma',
        phone: patientAPhone,
        address: 'Flat 101, Galaxy Heights',
        city: 'Pune',
        pincode: '411016',
        cluster: 'Pune Central',
      },
      providerId: new mongoose.Types.ObjectId(caregiverId),
      providerName: 'Sister Anita Dsouza',
      providerRole: 'Palliative Care Specialist',
      scheduledDate: yesterdayDateStr,
      timeSlot: '02:00 PM - 04:00 PM',
      visitType: 'nursing_procedure',
      status: 'cancelled',
      timestamps: { assignedAt: yesterday, cancelledAt: yesterday },
    });
    visitCancelledId = vCanc._id.toString();

    // Visit Patient B
    const vPatB = await FieldVisit.create({
      visitNumber: 'TEST-P2-VST-PATIENT-B',
      subscriptionId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(patientBId),
      patientDetails: {
        fullName: 'Suresh Patil',
        phone: patientBPhone,
        address: 'Bungalow 4, Aundh',
        city: 'Pune',
        pincode: '411016',
        cluster: 'Pune West',
      },
      providerId: new mongoose.Types.ObjectId(caregiverId),
      providerName: 'Sister Anita Dsouza',
      providerRole: 'Palliative Care Specialist',
      scheduledDate: tomorrowDateStr,
      timeSlot: '02:00 PM - 04:00 PM',
      visitType: 'physiotherapy',
      status: 'assigned',
      timestamps: { assignedAt: new Date() },
    });
    visitPatientBId = vPatB._id.toString();

    // Visit for Lifecycle tests
    const vLife = await FieldVisit.create({
      visitNumber: 'TEST-P2-VST-LIFECYCLE',
      subscriptionId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientDetails: {
        fullName: 'Rajesh Sharma',
        phone: patientAPhone,
        address: 'Flat 101, Galaxy Heights',
        city: 'Pune',
        pincode: '411016',
        cluster: 'Pune Central',
      },
      providerId: new mongoose.Types.ObjectId(caregiverId),
      providerName: 'Sister Anita Dsouza',
      providerRole: 'Palliative Care Specialist',
      providerPhone: caregiverPhone,
      scheduledDate: tomorrowDateStr,
      timeSlot: '11:00 AM - 01:00 PM',
      visitType: 'clinical_care',
      status: 'assigned',
      timestamps: { assignedAt: new Date() },
    });
    visitLifecycleId = vLife._id.toString();

    // Visit for Approval tests
    const vAppr = await FieldVisit.create({
      visitNumber: 'TEST-P2-VST-APPROVAL',
      subscriptionId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientDetails: {
        fullName: 'Rajesh Sharma',
        phone: patientAPhone,
        address: 'Flat 101, Galaxy Heights',
        city: 'Pune',
        pincode: '411016',
        cluster: 'Pune Central',
      },
      providerId: new mongoose.Types.ObjectId(caregiverId),
      providerName: 'Sister Anita Dsouza',
      providerRole: 'Palliative Care Specialist',
      providerPhone: caregiverPhone,
      scheduledDate: tomorrowDateStr,
      timeSlot: '01:00 PM - 03:00 PM',
      visitType: 'clinical_care',
      status: 'assigned',
      timestamps: { assignedAt: new Date() },
    });
    visitApprovalId = vAppr._id.toString();

    // Visit for Rejection tests
    const vRej = await FieldVisit.create({
      visitNumber: 'TEST-P2-VST-REJECTION',
      subscriptionId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientDetails: {
        fullName: 'Rajesh Sharma',
        phone: patientAPhone,
        address: 'Flat 101, Galaxy Heights',
        city: 'Pune',
        pincode: '411016',
        cluster: 'Pune Central',
      },
      providerId: new mongoose.Types.ObjectId(caregiverId),
      providerName: 'Sister Anita Dsouza',
      providerRole: 'Palliative Care Specialist',
      providerPhone: caregiverPhone,
      scheduledDate: inTwoDaysStr,
      timeSlot: '09:00 AM - 11:00 AM',
      visitType: 'clinical_care',
      status: 'assigned',
      timestamps: { assignedAt: new Date() },
    });
    visitRejectionId = vRej._id.toString();

    // Visit for Conflict tests (Patient A)
    const vConf = await FieldVisit.create({
      visitNumber: 'TEST-P2-VST-CONFLICT-A',
      subscriptionId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientDetails: {
        fullName: 'Rajesh Sharma',
        phone: patientAPhone,
        address: 'Flat 101, Galaxy Heights',
        city: 'Pune',
        pincode: '411016',
        cluster: 'Pune Central',
      },
      providerId: new mongoose.Types.ObjectId(caregiverId),
      providerName: 'Sister Anita Dsouza',
      providerRole: 'Palliative Care Specialist',
      scheduledDate: tomorrowDateStr,
      timeSlot: '03:00 PM - 05:00 PM',
      visitType: 'clinical_care',
      status: 'assigned',
      timestamps: { assignedAt: new Date() },
    });
    visitConflictId = vConf._id.toString();

    // Existing active visit occupying inThreeDaysStr at 10:00 AM - 12:00 PM
    const vOcc = await FieldVisit.create({
      visitNumber: 'TEST-P2-VST-CONFLICT-OCCUPIED',
      subscriptionId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(patientBId),
      patientDetails: {
        fullName: 'Suresh Patil',
        phone: patientBPhone,
        address: 'Bungalow 4, Aundh',
        city: 'Pune',
        pincode: '411016',
        cluster: 'Pune West',
      },
      providerId: new mongoose.Types.ObjectId(caregiverId),
      providerName: 'Sister Anita Dsouza',
      providerRole: 'Palliative Care Specialist',
      scheduledDate: inThreeDaysStr,
      timeSlot: '10:00 AM - 12:00 PM',
      visitType: 'clinical_care',
      status: 'assigned',
      timestamps: { assignedAt: new Date() },
    });
    existingConflictSlotVisitId = vOcc._id.toString();

    // Visit for Client SDK tests
    const vSdk = await FieldVisit.create({
      visitNumber: 'TEST-P2-VST-CLIENT-SDK',
      subscriptionId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientDetails: {
        fullName: 'Rajesh Sharma',
        phone: patientAPhone,
        address: 'Flat 101, Galaxy Heights',
        city: 'Pune',
        pincode: '411016',
        cluster: 'Pune Central',
      },
      providerId: new mongoose.Types.ObjectId(caregiverId),
      providerName: 'Sister Anita Dsouza',
      providerRole: 'Palliative Care Specialist',
      providerPhone: caregiverPhone,
      scheduledDate: tomorrowDateStr,
      timeSlot: '05:00 PM - 07:00 PM',
      visitType: 'clinical_care',
      status: 'assigned',
      timestamps: { assignedAt: new Date() },
    });
    visitClientSdkId = vSdk._id.toString();

    // Start ephemeral HTTP server for live apiClient testing
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
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
      caregiverPhone,
      unassignedCaregiverPhone,
      adminPhone,
    ];
    await User.deleteMany({
      $or: [{ phone: { $in: testPhones } }, { email: { $regex: 'p2@vivoquest\\.in' } }],
    });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-P2-VST' } });
    await VisitRescheduleRequest.deleteMany({ visitNumber: { $regex: 'TEST-P2-VST' } });
    await AuditLog.deleteMany({ targetId: { $regex: 'TEST-P2-VST' } });
    await authStorage.clearSession();
    await caregiverAuthStorage.clearSession();
    await disconnectDatabase();
  });

  // ===========================================================================
  // 1. Patient Authorization & Payload Validation
  // ===========================================================================
  describe('1. Patient Authorization & Payload Validation', () => {
    it('rejects unauthenticated reschedule request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${visitAuthId}/reschedule`)
        .send({
          requestedDate: inTwoDaysStr,
          requestedTimeSlot: '01:00 PM - 03:00 PM',
          reason: 'Doctor appointment clash',
        });

      assert.strictEqual(res.status, 401);
    });

    it('rejects Patient A attempting to reschedule Patient B visit with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${visitPatientBId}/reschedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          requestedDate: inTwoDaysStr,
          requestedTimeSlot: '01:00 PM - 03:00 PM',
          reason: 'Unauthorized attempt',
        });

      assert.strictEqual(res.status, 403);
      const msg = res.body.error?.message || res.body.message || '';
      assert.match(msg, /Patients are strictly authorized to request rescheduling only for their own visits/i);
    });

    it('rejects rescheduling a completed visit with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${visitCompletedId}/reschedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          requestedDate: inTwoDaysStr,
          requestedTimeSlot: '01:00 PM - 03:00 PM',
          reason: 'Trying to reschedule completed visit',
        });

      assert.strictEqual(res.status, 400);
      const msg = res.body.error?.message || res.body.message || '';
      assert.match(msg, /Cannot reschedule a visit with status 'completed'/i);
    });

    it('rejects rescheduling a cancelled visit with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${visitCancelledId}/reschedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          requestedDate: inTwoDaysStr,
          requestedTimeSlot: '01:00 PM - 03:00 PM',
          reason: 'Trying to reschedule cancelled visit',
        });

      assert.strictEqual(res.status, 400);
      const msg = res.body.error?.message || res.body.message || '';
      assert.match(msg, /Cannot reschedule a visit with status 'cancelled'/i);
    });

    it('rejects a past requested date with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${visitAuthId}/reschedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          requestedDate: yesterdayDateStr,
          requestedTimeSlot: '01:00 PM - 03:00 PM',
          reason: 'Backdating not allowed',
        });

      assert.strictEqual(res.status, 400);
      const msg = res.body.error?.message || res.body.message || '';
      assert.match(msg, /Requested reschedule date must be in the future/i);
    });

    it('rejects an invalid date format (not YYYY-MM-DD) with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${visitAuthId}/reschedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          requestedDate: '25-10-2026',
          requestedTimeSlot: '01:00 PM - 03:00 PM',
          reason: 'Invalid date string',
        });

      assert.strictEqual(res.status, 400);
    });

    it('rejects missing or empty reason with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${visitAuthId}/reschedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          requestedDate: inTwoDaysStr,
          requestedTimeSlot: '01:00 PM - 03:00 PM',
          reason: '  ',
        });

      assert.strictEqual(res.status, 400);
    });
  });

  // ===========================================================================
  // 2. Request Lifecycle, Schedule Invariance & Cancellation
  // ===========================================================================
  describe('2. Request Lifecycle, Schedule Invariance & Cancellation', () => {
    let createdRequestId: string;

    it('submits reschedule request for own eligible visit and leaves original schedule unchanged', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${visitLifecycleId}/reschedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          requestedDate: inTwoDaysStr,
          requestedTimeSlot: '03:00 PM - 05:00 PM',
          reason: 'Attending specialist consultation in hospital morning hours',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'pending');
      assert.strictEqual(res.body.data.requestedSchedule.scheduledDate, inTwoDaysStr);
      assert.strictEqual(res.body.data.requestedSchedule.timeSlot, '03:00 PM - 05:00 PM');
      createdRequestId = res.body.data.id || res.body.data._id;

      // CRITICAL CHECK: Verify that original FieldVisit schedule has NOT changed
      const visit = await FieldVisit.findById(visitLifecycleId);
      assert.strictEqual(visit?.scheduledDate, tomorrowDateStr);
      assert.strictEqual(visit?.timeSlot, '11:00 AM - 01:00 PM');

      // Verify AuditLog record was created
      const audit = await AuditLog.findOne({
        action: 'VISIT_RESCHEDULE_REQUESTED',
        targetId: 'TEST-P2-VST-LIFECYCLE',
      });
      assert.ok(audit, 'AuditLog entry should exist for reschedule request');
    });

    it('prevents duplicate pending requests for the same visit with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${visitLifecycleId}/reschedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          requestedDate: inThreeDaysStr,
          requestedTimeSlot: '05:00 PM - 07:00 PM',
          reason: 'Second duplicate request attempt',
        });

      assert.strictEqual(res.status, 409);
      const msg = res.body.error?.message || res.body.message || '';
      assert.match(msg, /A pending rescheduling request already exists for this visit/i);
    });

    it('lists patient requests via GET /api/v1/patients/me/reschedule-requests', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/reschedule-requests')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      const found = res.body.data.find((r: any) => r.id === createdRequestId || r._id === createdRequestId);
      assert.ok(found, 'Created request must appear in patient requests list');
    });

    it('attaches pending rescheduleRequest DTO to upcoming visit in GET /api/v1/patients/me/visits', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/visits')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      const visit = res.body.data.upcoming.find((v: any) => v.id === visitLifecycleId);
      assert.ok(visit);
      assert.ok(visit.rescheduleRequest);
      assert.strictEqual(visit.rescheduleRequest.status, 'pending');
      assert.strictEqual(visit.rescheduleRequest.requestedDate, inTwoDaysStr);
      assert.strictEqual(visit.rescheduleRequest.requestedTimeSlot, '03:00 PM - 05:00 PM');
    });

    it('allows patient to cancel their own pending request', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/reschedule-requests/${createdRequestId}/cancel`)
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'cancelled');

      // Verify AuditLog record
      const audit = await AuditLog.findOne({
        action: 'VISIT_RESCHEDULE_CANCELLED',
        targetId: 'TEST-P2-VST-LIFECYCLE',
      });
      assert.ok(audit, 'AuditLog entry should exist for cancelled reschedule request');

      // Verify FieldVisit schedule remains completely unchanged
      const visit = await FieldVisit.findById(visitLifecycleId);
      assert.strictEqual(visit?.scheduledDate, tomorrowDateStr);
      assert.strictEqual(visit?.timeSlot, '11:00 AM - 01:00 PM');
    });

    it('cannot cancel a request that is already cancelled with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/reschedule-requests/${createdRequestId}/cancel`)
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 400);
      const msg = res.body.error?.message || res.body.message || '';
      assert.match(msg, /Cannot cancel a request that is already cancelled/i);
    });
  });

  // ===========================================================================
  // 3. Caregiver Approval Workflow, Authorization & Assignment Scope
  // ===========================================================================
  describe('3. Caregiver Approval Workflow & Assignment Scope', () => {
    let pendingApprovalRequestId: string;

    it('submits a pending request for visitApprovalId', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${visitApprovalId}/reschedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          requestedDate: inTwoDaysStr,
          requestedTimeSlot: '01:00 PM - 03:00 PM',
          reason: 'Family member available to support during this afternoon slot',
        });
      assert.strictEqual(res.status, 201);
      pendingApprovalRequestId = res.body.data.id || res.body.data._id;
    });

    it('allows assigned caregiver to view pending requests for their assigned patients', async () => {
      const res = await request(app)
        .get('/api/v1/visits/reschedule-requests')
        .set('Authorization', `Bearer ${caregiverToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const match = res.body.data.find((r: any) => r.id === pendingApprovalRequestId || r._id === pendingApprovalRequestId);
      assert.ok(match, 'Assigned caregiver should see request for their visit');
      assert.strictEqual(match.patientName, 'Rajesh Sharma');
      assert.strictEqual(match.requestedSchedule.scheduledDate, inTwoDaysStr);
    });

    it('unassigned caregiver receives empty list or does not see Patient A request', async () => {
      const res = await request(app)
        .get('/api/v1/visits/reschedule-requests')
        .set('Authorization', `Bearer ${unassignedCaregiverToken}`);

      assert.strictEqual(res.status, 200);
      const match = res.body.data.find((r: any) => r.id === pendingApprovalRequestId || r._id === pendingApprovalRequestId);
      assert.strictEqual(match, undefined, 'Unassigned caregiver must NOT see requests for visits not assigned to them');
    });

    it('rejects unassigned caregiver attempting to approve request with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/visits/reschedule-requests/${pendingApprovalRequestId}/approve`)
        .set('Authorization', `Bearer ${unassignedCaregiverToken}`);

      assert.strictEqual(res.status, 403);
      const msg = res.body.error?.message || res.body.message || '';
      assert.match(msg, /You are not authorized to approve rescheduling for a visit not assigned to you/i);
    });

    it('rejects patient attempting to approve request with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/visits/reschedule-requests/${pendingApprovalRequestId}/approve`)
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 403);
    });

    it('authorized assigned caregiver approves request: updates visit schedule and request status consistently', async () => {
      const res = await request(app)
        .post(`/api/v1/visits/reschedule-requests/${pendingApprovalRequestId}/approve`)
        .set('Authorization', `Bearer ${caregiverToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.request.status, 'approved');
      assert.strictEqual(res.body.data.visit.scheduledDate, inTwoDaysStr);
      assert.strictEqual(res.body.data.visit.timeSlot, '01:00 PM - 03:00 PM');

      // Verify DB record directly
      const updatedVisit = await FieldVisit.findById(visitApprovalId);
      assert.strictEqual(updatedVisit?.scheduledDate, inTwoDaysStr);
      assert.strictEqual(updatedVisit?.timeSlot, '01:00 PM - 03:00 PM');

      // Verify statusHistory in FieldVisit
      const lastHistory = updatedVisit?.statusHistory?.slice(-1)[0];
      assert.ok(lastHistory?.reason?.includes('Rescheduled from'));

      // Verify AuditLog record
      const audit = await AuditLog.findOne({
        action: 'VISIT_RESCHEDULE_APPROVED',
        targetId: 'TEST-P2-VST-APPROVAL',
      });
      assert.ok(audit, 'AuditLog entry should exist for approved reschedule request');
    });

    it('approval is idempotent: duplicate approval returns already approved request and does not duplicate changes', async () => {
      const res = await request(app)
        .post(`/api/v1/visits/reschedule-requests/${pendingApprovalRequestId}/approve`)
        .set('Authorization', `Bearer ${caregiverToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.request.status, 'approved');
      assert.strictEqual(res.body.data.visit.scheduledDate, inTwoDaysStr);
    });

    it('cannot reject an already approved request with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/visits/reschedule-requests/${pendingApprovalRequestId}/reject`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          rejectionReason: 'Cannot reject after approval',
        });

      assert.strictEqual(res.status, 400);
      const msg = res.body.error?.message || res.body.message || '';
      assert.match(msg, /Cannot reject a request that is currently 'approved'/i);
    });
  });

  // ===========================================================================
  // 4. Caregiver Rejection Workflow & Invariance
  // ===========================================================================
  describe('4. Caregiver Rejection Workflow & Invariance', () => {
    let rejectableRequestId: string;

    it('submits a pending request for visitRejectionId', async () => {
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${visitRejectionId}/reschedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          requestedDate: inThreeDaysStr,
          requestedTimeSlot: '04:00 PM - 06:00 PM',
          reason: 'Need evening visit due to visitor schedule',
        });
      assert.strictEqual(res.status, 201);
      rejectableRequestId = res.body.data.id || res.body.data._id;
    });

    it('rejects caregiver rejection attempt without a rejection reason with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/visits/reschedule-requests/${rejectableRequestId}/reject`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          rejectionReason: '   ',
        });

      assert.strictEqual(res.status, 400);
      const msg = res.body.error?.message || res.body.message || '';
      assert.match(msg, /Please provide a valid rejection reason/i);
    });

    it('rejects caregiver rejection attempt from an unassigned caregiver with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/visits/reschedule-requests/${rejectableRequestId}/reject`)
        .set('Authorization', `Bearer ${unassignedCaregiverToken}`)
        .send({
          rejectionReason: 'Not my visit to reject',
        });

      assert.strictEqual(res.status, 403);
    });

    it('authorized caregiver rejects request with mandatory reason: leaves visit schedule unchanged', async () => {
      const reasonText = 'Caregiver is attending an urgent oncology triage shift at Ruby Hall Clinic';
      const res = await request(app)
        .post(`/api/v1/visits/reschedule-requests/${rejectableRequestId}/reject`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          rejectionReason: reasonText,
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'rejected');
      assert.strictEqual(res.body.data.rejectionReason, reasonText);

      // Verify FieldVisit schedule was NOT modified
      const visit = await FieldVisit.findById(visitRejectionId);
      assert.strictEqual(visit?.scheduledDate, inTwoDaysStr);
      assert.strictEqual(visit?.timeSlot, '09:00 AM - 11:00 AM');

      // Verify AuditLog
      const audit = await AuditLog.findOne({
        action: 'VISIT_RESCHEDULE_REJECTED',
        targetId: 'TEST-P2-VST-REJECTION',
      });
      assert.ok(audit, 'AuditLog entry should exist for rejected reschedule request');
      assert.strictEqual(audit.details?.rejectionReason, reasonText);
    });

    it('patient visit list shows rejection banner with caregiver reason and allows new request', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/visits')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      const visit = res.body.data.upcoming.find((v: any) => v.id === visitRejectionId);
      assert.ok(visit);
      assert.ok(visit.rescheduleRequest);
      assert.strictEqual(visit.rescheduleRequest.status, 'rejected');
      assert.match(visit.rescheduleRequest.rejectionReason, /urgent oncology triage/);
    });
  });

  // ===========================================================================
  // 5. Scheduling Integrity & Conflict Protection
  // ===========================================================================
  describe('5. Scheduling Integrity & Conflict Protection', () => {
    let conflictRequestId: string;

    it('submits a reschedule request that requests an occupied caregiver slot', async () => {
      // existingConflictSlotVisitId is on inThreeDaysStr at 10:00 AM - 12:00 PM
      const res = await request(app)
        .post(`/api/v1/patients/me/visits/${visitConflictId}/reschedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          requestedDate: inThreeDaysStr,
          requestedTimeSlot: '10:00 AM - 12:00 PM',
          reason: 'Conflict testing slot request',
        });
      assert.strictEqual(res.status, 201);
      conflictRequestId = res.body.data.id || res.body.data._id;
    });

    it('rejects approval when caregiver has an overlapping active visit with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/visits/reschedule-requests/${conflictRequestId}/approve`)
        .set('Authorization', `Bearer ${caregiverToken}`);

      assert.strictEqual(res.status, 409);
      const msg = res.body.error?.message || res.body.message || '';
      assert.match(msg, /Scheduling conflict: Caregiver Sister Anita Dsouza already has an active visit/i);
      assert.match(msg, /TEST-P2-VST-CONFLICT-OCCUPIED/i);

      // Verify that the request remains in 'pending' status
      const reqDoc = await VisitRescheduleRequest.findById(conflictRequestId);
      assert.strictEqual(reqDoc?.status, 'pending');

      // Verify that the visit schedule was NOT changed
      const visit = await FieldVisit.findById(visitConflictId);
      assert.strictEqual(visit?.scheduledDate, tomorrowDateStr);
      assert.strictEqual(visit?.timeSlot, '03:00 PM - 05:00 PM');
    });

    it('re-checking availability allows approval once conflicting slot is freed', async () => {
      // Cancel the conflicting occupied visit to free the slot
      await FieldVisit.updateOne(
        { _id: new mongoose.Types.ObjectId(existingConflictSlotVisitId) },
        { $set: { status: 'cancelled' } }
      );

      // Now attempt approval again
      const res = await request(app)
        .post(`/api/v1/visits/reschedule-requests/${conflictRequestId}/approve`)
        .set('Authorization', `Bearer ${caregiverToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.request.status, 'approved');
      assert.strictEqual(res.body.data.visit.scheduledDate, inThreeDaysStr);
      assert.strictEqual(res.body.data.visit.timeSlot, '10:00 AM - 12:00 PM');
    });
  });

  // ===========================================================================
  // 6. Mobile Client SDK Integration
  // ===========================================================================
  describe('6. Mobile Client SDK Integration', () => {
    let clientRequestId: string;

    it('patientApi.requestVisitReschedule submits request via mobile client', async () => {
      await authStorage.setToken(patientAToken);
      const res = await patientApi.requestVisitReschedule(
        visitClientSdkId,
        inTwoDaysStr,
        '04:00 PM - 06:00 PM',
        'Submitted via Patient Mobile App SDK',
        baseUrl
      );

      assert.ok(res);
      assert.strictEqual(res.status, 'pending');
      assert.strictEqual(res.requestedSchedule.scheduledDate, inTwoDaysStr);
      clientRequestId = (res.id || (res as any)._id)?.toString();
    });

    it('caregiverApi.getPendingRescheduleRequests retrieves pending requests via caregiver client', async () => {
      await caregiverAuthStorage.setToken(caregiverToken);
      const requests = await caregiverApi.getPendingRescheduleRequests('pending', baseUrl);
      assert.ok(Array.isArray(requests));
      const match = requests.find((r: any) => r.visitId?.toString() === visitClientSdkId || r.id === clientRequestId || r._id?.toString() === clientRequestId);
      assert.ok(match, 'Pending request should be returned by caregiverApi');
      assert.strictEqual(match.patientName, 'Rajesh Sharma');
    });

    it('caregiverApi.approveRescheduleRequest approves the request via caregiver client', async () => {
      await caregiverAuthStorage.setToken(caregiverToken);
      const result = await caregiverApi.approveRescheduleRequest(clientRequestId, baseUrl);
      assert.ok(result);
      assert.strictEqual(result.request.status, 'approved');
      assert.strictEqual(result.visit.scheduledDate, inTwoDaysStr);
      assert.strictEqual(result.visit.timeSlot, '04:00 PM - 06:00 PM');
    });
  });

  // ===========================================================================
  // 7. Regression Verification
  // ===========================================================================
  describe('7. Regression Verification', () => {
    it('Phase 1 GET /api/v1/patients/me/caregiver continues to function seamlessly', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/caregiver')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.assignedCaregiver);
      assert.strictEqual(res.body.data.assignedCaregiver.name, 'Sister Anita Dsouza');
    });

    it('Phase 1 GET /api/v1/patients/me/visits continues to return categorized upcoming and past visits', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/visits')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.upcoming));
      assert.ok(Array.isArray(res.body.data.past));
      assert.ok(res.body.data.upcomingCount >= 1);
    });

    it('Public caregiver plans catalog continues to return active plans', async () => {
      const res = await request(app)
        .get('/api/v1/patients/caregiver-plans');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });
  });
});
