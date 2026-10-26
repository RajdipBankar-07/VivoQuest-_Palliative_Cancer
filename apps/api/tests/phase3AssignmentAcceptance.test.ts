import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { FieldVisit } from '../src/models/FieldVisit.js';
import { VisitRescheduleRequest } from '../src/models/VisitRescheduleRequest.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { NotificationLog } from '../src/models/NotificationLog.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { seedAdminDemoData } from '../src/services/adminService.js';
import { seedCaregiverPlansDemoData } from '../src/services/caregiverPlanService.js';

describe('VivoQuest — Phase 3: Caregiver/Nurse Assignment Acceptance and Rejection', () => {
  const app = createApp();

  // Test Users
  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900';

  let patientToken: string;
  let patientUserId: string;
  const patientPhone = '9875557701';
  const patientName = 'Phase3 Patient John';

  let caregiver1Token: string;
  let caregiver1UserId: string;
  const caregiver1Phone = '9875557702';
  const caregiver1Name = 'Phase3 Nurse Alice';

  let caregiver2Token: string;
  let caregiver2UserId: string;
  const caregiver2Phone = '9875557703';
  const caregiver2Name = 'Phase3 Nurse Bob';

  let unassignedCaregiverToken: string;
  let unassignedCaregiverUserId: string;
  const unassignedCaregiverPhone = '9875557704';
  const unassignedCaregiverName = 'Phase3 Nurse Charlie';

  // Test Visits
  let visit1Id: string;
  const visit1Number = 'VQ-TEST-P3-001';

  let visit2Id: string;
  const visit2Number = 'VQ-TEST-P3-002';

  let visit3Id: string;
  const visit3Number = 'VQ-TEST-P3-003';

  let conflictVisitId: string;
  const conflictVisitNumber = 'VQ-TEST-P3-004';

  const testDate = '2026-11-20';
  const testSlot = '10:00 - 12:00';

  before(async () => {
    await connectDatabase();

    // Clean up test data
    await User.deleteMany({
      phone: { $in: [patientPhone, caregiver1Phone, caregiver2Phone, unassignedCaregiverPhone] },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: [visit1Number, visit2Number, visit3Number, conflictVisitNumber] },
    });
    await NotificationLog.deleteMany({
      recipientPhone: { $in: [caregiver1Phone, caregiver2Phone, patientPhone] },
    });

    await seedAdminDemoData();
    await seedCaregiverPlansDemoData();

    // 1. Admin Login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: adminPhone, otp: '123456', role: 'admin' });
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.token;
    adminUserId = adminLogin.body.data.user.id;

    // 2. Patient Registration
    const patReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: patientName,
        phone: patientPhone,
        password: 'TestPassword123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(patReg.status, 201);
    patientToken = patReg.body.data.token;
    patientUserId = patReg.body.data.user.id;

    // 3. Caregiver 1 Registration
    const cg1Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: caregiver1Name,
        phone: caregiver1Phone,
        password: 'TestPassword123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(cg1Reg.status, 201);
    caregiver1Token = cg1Reg.body.data.token;
    caregiver1UserId = cg1Reg.body.data.user.id;
    // Ensure caregiver 1 is active
    await User.findByIdAndUpdate(caregiver1UserId, { status: 'active', isPhoneVerified: true });

    // 4. Caregiver 2 Registration
    const cg2Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: caregiver2Name,
        phone: caregiver2Phone,
        password: 'TestPassword123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(cg2Reg.status, 201);
    caregiver2Token = cg2Reg.body.data.token;
    caregiver2UserId = cg2Reg.body.data.user.id;
    // Ensure caregiver 2 is active
    await User.findByIdAndUpdate(caregiver2UserId, { status: 'active', isPhoneVerified: true });

    // 5. Unassigned Caregiver Registration
    const unassignedReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: unassignedCaregiverName,
        phone: unassignedCaregiverPhone,
        password: 'TestPassword123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(unassignedReg.status, 201);
    unassignedCaregiverToken = unassignedReg.body.data.token;
    unassignedCaregiverUserId = unassignedReg.body.data.user.id;
    await User.findByIdAndUpdate(unassignedCaregiverUserId, { status: 'active', isPhoneVerified: true });

    // Seed test visits
    const v1 = await FieldVisit.create({
      visitNumber: visit1Number,
      visitType: 'clinical_care',
      status: 'assigned',
      assignmentStatus: 'pending',
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Palliative Caregiver',
      providerPhone: caregiver1Phone,
      patientId: new mongoose.Types.ObjectId(patientUserId),
      patientDetails: {
        fullName: patientName,
        phone: patientPhone,
        address: 'Flat 402, Shivajinagar, Pune',
        city: 'Pune',
        pincode: '411005',
        cluster: 'Pune Central',
        instructions: 'Post-chemo vitals and pain assessment',
      },
      scheduledDate: testDate,
      timeSlot: testSlot,
      timestamps: {
        assignedAt: new Date(),
      },
      statusHistory: [
        {
          status: 'assigned',
          changedByName: 'Admin Desk',
          timestamp: new Date(),
          notes: 'Initial assignment',
        },
      ],
      isDemo: false,
    });
    visit1Id = v1._id.toString();

    const v2 = await FieldVisit.create({
      visitNumber: visit2Number,
      visitType: 'clinical_care',
      status: 'assigned',
      assignmentStatus: 'pending',
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Palliative Caregiver',
      providerPhone: caregiver1Phone,
      patientId: new mongoose.Types.ObjectId(patientUserId),
      patientDetails: {
        fullName: patientName,
        phone: patientPhone,
        address: 'Flat 402, Shivajinagar, Pune',
        city: 'Pune',
        pincode: '411005',
        cluster: 'Pune Central',
        instructions: 'Routine dressing and nursing procedure',
      },
      scheduledDate: '2026-11-21',
      timeSlot: '14:00 - 16:00',
      timestamps: {
        assignedAt: new Date(),
      },
      statusHistory: [
        {
          status: 'assigned',
          changedByName: 'Admin Desk',
          timestamp: new Date(),
          notes: 'Initial assignment',
        },
      ],
      isDemo: false,
    });
    visit2Id = v2._id.toString();

    const v3 = await FieldVisit.create({
      visitNumber: visit3Number,
      visitType: 'clinical_care',
      status: 'assigned',
      assignmentStatus: 'pending',
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Palliative Caregiver',
      providerPhone: caregiver1Phone,
      patientId: new mongoose.Types.ObjectId(patientUserId),
      patientDetails: {
        fullName: patientName,
        phone: patientPhone,
        address: 'Flat 402, Shivajinagar, Pune',
        city: 'Pune',
        pincode: '411005',
        cluster: 'Pune Central',
        instructions: 'Palliative evaluation',
      },
      scheduledDate: '2026-11-22',
      timeSlot: '09:00 - 11:00',
      timestamps: {
        assignedAt: new Date(),
      },
      statusHistory: [
        {
          status: 'assigned',
          changedByName: 'Admin Desk',
          timestamp: new Date(),
        },
      ],
      isDemo: false,
    });
    visit3Id = v3._id.toString();
  });

  after(async () => {
    await User.deleteMany({
      phone: { $in: [patientPhone, caregiver1Phone, caregiver2Phone, unassignedCaregiverPhone] },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: [visit1Number, visit2Number, visit3Number, conflictVisitNumber] },
    });
    await NotificationLog.deleteMany({
      recipientPhone: { $in: [caregiver1Phone, caregiver2Phone, patientPhone] },
    });
    await disconnectDatabase();
  });

  // ===========================================================================
  // Step 6 Test A: Admin assigns caregiver → assignment persists & caregiver notified
  // ===========================================================================
  it('A. Admin assigns a caregiver → assignment persists and correct caregiver is notified', async () => {
    // Admin reassigns visit3 to caregiver2
    const res = await request(app)
      .patch(`/api/v1/admin/field-visits/${visit3Id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: caregiver2UserId,
        reason: 'Staff balancing by Clinical Desk',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'assigned');
    assert.equal(res.body.data.assignmentStatus, 'pending');
    assert.equal(res.body.data.providerName, caregiver2Name);

    // Verify caregiver2 receives notification
    const notification = await NotificationLog.findOne({
      recipientPhone: caregiver2Phone,
      templateId: 'CAREGIVER_ASSIGNED_NEW',
    }).lean();

    assert.ok(notification, 'Caregiver 2 should receive an assignment notification');
    assert.ok(notification.messageBody.includes(visit3Number));
  });

  // ===========================================================================
  // Step 6 Test B: Assigned caregiver accepts → status & timestamp persist across login
  // ===========================================================================
  it('B. Assigned caregiver accepts → status and decision timestamp persist after app restart/re-login', async () => {
    // Caregiver 1 accepts visit 1
    const res = await request(app)
      .post(`/api/v1/visits/${visit1Id}/accept`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send();

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'accepted');
    assert.equal(res.body.data.assignmentStatus, 'accepted');
    assert.ok(res.body.data.timestamps.acceptedAt, 'acceptedAt timestamp must be recorded');

    // Simulate caregiver re-login / session refresh
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: caregiver1Phone, password: 'TestPassword123!', role: 'caregiver' });
    assert.equal(loginRes.status, 200);
    const newSessionToken = loginRes.body.data.token;

    // Fetch the visit with the new token
    const fetchRes = await request(app)
      .get(`/api/v1/visits/${visit1Id}`)
      .set('Authorization', `Bearer ${newSessionToken}`);

    assert.equal(fetchRes.status, 200);
    assert.equal(fetchRes.body.data.status, 'accepted');
    assert.equal(fetchRes.body.data.assignmentStatus, 'accepted');
    assert.ok(fetchRes.body.data.timestamps.acceptedAt);

    // Verify AuditLog
    const audit = await AuditLog.findOne({
      targetId: visit1Id,
      action: 'FIELD_VISIT_ASSIGNMENT_ACCEPTED',
    }).lean();
    assert.ok(audit, 'Audit log entry must be created for assignment acceptance');
    assert.equal(audit.category, 'field_operations');

    // Verify patient notification
    const patNotif = await NotificationLog.findOne({
      recipientPhone: patientPhone,
      templateId: 'VISIT_ASSIGNMENT_ACCEPTED',
    }).lean();
    assert.ok(patNotif, 'Patient must be notified of visit acceptance');
  });

  // ===========================================================================
  // Step 6 Test C: Rejection without a reason → validation error
  // ===========================================================================
  it('C. Assigned caregiver rejects without a reason → request is rejected with validation error', async () => {
    // Caregiver 1 attempts to reject visit 2 without a reason
    const resNoBody = await request(app)
      .post(`/api/v1/visits/${visit2Id}/reject`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({});

    assert.equal(resNoBody.status, 400);
    assert.ok(
      (resNoBody.body.error?.message || resNoBody.body.message || '').includes('reason'),
      'Should mention reason is required'
    );

    // Empty whitespace reason
    const resWhitespace = await request(app)
      .post(`/api/v1/visits/${visit2Id}/reject`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ reason: '   ' });

    assert.equal(resWhitespace.status, 400);
    assert.ok(
      (resWhitespace.body.error?.message || resWhitespace.body.message || '').includes('reason'),
      'Whitespace-only reason must fail validation'
    );
  });

  // ===========================================================================
  // Step 6 Test D: Rejection with a reason → Admin receives reason & notification
  // ===========================================================================
  it('D. Assigned caregiver rejects with a reason → Admin receives the reason and notification', async () => {
    const rejectionReason = 'Shift overlap with hospital intensive care duty';

    const res = await request(app)
      .post(`/api/v1/visits/${visit2Id}/reject`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ reason: rejectionReason });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'rejected');
    assert.equal(res.body.data.assignmentStatus, 'rejected');
    assert.equal(res.body.data.assignmentRejection.reason, rejectionReason);
    assert.ok(res.body.data.assignmentRejection.rejectedAt);

    // Verify Admin receives notification in DB
    const adminNotif = await NotificationLog.findOne({
      recipientRole: 'admin',
      templateId: 'VISIT_ASSIGNMENT_REJECTED',
      'metadata.visitId': visit2Id,
    }).lean();

    assert.ok(adminNotif, 'Admin notification must be logged');
    assert.ok(adminNotif.messageBody.includes(rejectionReason));
    assert.ok(adminNotif.messageBody.includes(visit2Number));

    // Verify Admin notification API returns the rejection notification with type and details
    const adminNotifsRes = await request(app)
      .get('/api/v1/admin/notifications?unread=true')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(adminNotifsRes.status, 200);
    const notificationsList = adminNotifsRes.body.data;
    const apiNotif = notificationsList.find(
      (n: any) => n.metadata?.visitId === visit2Id || n.messageBody?.includes(visit2Number)
    );
    assert.ok(apiNotif, 'Admin notifications API must return the rejection notification');
    assert.equal(apiNotif.type, 'VISIT_ASSIGNMENT_REJECTED');
    assert.equal(apiNotif.relatedEntityType, 'FieldVisit');
    assert.ok(apiNotif.messageBody.includes(rejectionReason));
    assert.ok(apiNotif.messageBody.includes(caregiver1Name));
    assert.ok(apiNotif.messageBody.includes(patientName));

    // Verify Admin unread notification count API
    const unreadCountRes = await request(app)
      .get('/api/v1/admin/notifications/unread-count')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(unreadCountRes.status, 200);
    assert.ok(unreadCountRes.body.data.unreadCount >= 1, 'Unread notification count must be at least 1');

    // Verify Admin Dashboard view of field visits displays rejected visit & stats
    const adminVisitsRes = await request(app)
      .get(`/api/v1/admin/field-visits?status=rejected`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(adminVisitsRes.status, 200);
    const rejectedVisits = adminVisitsRes.body.data || adminVisitsRes.body.visits;
    const found = rejectedVisits.find((v: any) => v.visitNumber === visit2Number);
    assert.ok(found, 'Rejected visit must appear in admin field visits filter');
    assert.equal(found.assignmentRejection?.reason, rejectionReason);
    assert.equal(found.replacementRequired, true, 'replacementRequired flag must be true');

    // Check admin stats counter
    const statsRes = await request(app)
      .get('/api/v1/admin/field-visits/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(statsRes.status, 200);
    assert.ok(statsRes.body.data.rejectedCount >= 1, 'rejectedCount stat must be >= 1');
  });

  // ===========================================================================
  // Step 6 Test E: Unassigned caregiver & patient authorization protection
  // ===========================================================================
  it('E. An unassigned caregiver cannot accept/reject or view private details', async () => {
    // 1. Unassigned caregiver tries to accept visit 3 (which was assigned to caregiver2)
    const acceptRes = await request(app)
      .post(`/api/v1/visits/${visit3Id}/accept`)
      .set('Authorization', `Bearer ${unassignedCaregiverToken}`)
      .send();

    assert.equal(acceptRes.status, 403, 'Unassigned caregiver cannot accept someone else’s visit');

    // 2. Unassigned caregiver tries to reject visit 3
    const rejectRes = await request(app)
      .post(`/api/v1/visits/${visit3Id}/reject`)
      .set('Authorization', `Bearer ${unassignedCaregiverToken}`)
      .send({ reason: 'Not my visit but trying to reject' });

    assert.equal(rejectRes.status, 403, 'Unassigned caregiver cannot reject someone else’s visit');

    // 3. Rejected caregiver 1 tries to access visit 2 private details
    const getRes = await request(app)
      .get(`/api/v1/visits/${visit2Id}`)
      .set('Authorization', `Bearer ${caregiver1Token}`);

    assert.equal(getRes.status, 403, 'Rejected caregiver cannot access private patient details of rejected visit');

    // 4. Patient tries to accept/reject caregiver assignment
    const patientAcceptRes = await request(app)
      .post(`/api/v1/visits/${visit3Id}/accept`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send();

    assert.equal(patientAcceptRes.status, 403, 'Patient cannot accept caregiver assignments');
  });

  // ===========================================================================
  // Step 6 Test F: Replaced caregiver cannot act on the old assignment
  // ===========================================================================
  it('F. A caregiver who has been replaced cannot act on the old assignment', async () => {
    // Caregiver 1 was originally assigned to visit 3, but Admin reassigned it to Caregiver 2 in Test A
    const oldCgAccept = await request(app)
      .post(`/api/v1/visits/${visit3Id}/accept`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send();

    assert.equal(oldCgAccept.status, 403, 'Replaced caregiver cannot accept old visit');

    const oldCgReject = await request(app)
      .post(`/api/v1/visits/${visit3Id}/reject`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ reason: 'I was replaced but trying to reject' });

    assert.equal(oldCgReject.status, 403, 'Replaced caregiver cannot reject old visit');

    // The new caregiver 2 CAN accept
    const newCgAccept = await request(app)
      .post(`/api/v1/visits/${visit3Id}/accept`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send();

    assert.equal(newCgAccept.status, 200, 'Current caregiver 2 can accept the reassigned visit');
    assert.equal(newCgAccept.body.data.status, 'accepted');
  });

  // ===========================================================================
  // Step 6 Test G: Repeated or concurrent accept/reject requests are idempotent
  // ===========================================================================
  it('G. Repeated or concurrent accept/reject requests cannot create conflicting outcomes (Idempotency)', async () => {
    // Visit 1 is already accepted by Caregiver 1. Repeated accept returns 200 with current visit
    const repeatAccept = await request(app)
      .post(`/api/v1/visits/${visit1Id}/accept`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send();

    assert.equal(repeatAccept.status, 200);
    assert.equal(repeatAccept.body.data.status, 'accepted');

    // Visit 2 is already rejected. Repeated reject returns 200 with current state
    const repeatReject = await request(app)
      .post(`/api/v1/visits/${visit2Id}/reject`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ reason: 'Duplicate rejection attempt' });

    assert.equal(repeatReject.status, 200);
    assert.equal(repeatReject.body.data.status, 'rejected');

    // Rejected visit cannot later be accepted without explicit new assignment
    const acceptRejected = await request(app)
      .post(`/api/v1/visits/${visit2Id}/accept`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send();

    assert.equal(acceptRejected.status, 400, 'Cannot accept an assignment that was rejected without new reassignment');
  });

  // ===========================================================================
  // Step 6 Test H: Schedule Conflict Detection prevents overlapping assignments
  // ===========================================================================
  it('H. Invalid overlapping assignments are prevented (Conflict Detection)', async () => {
    // Caregiver 1 has already accepted visit 1 scheduled on testDate at testSlot ('10:00 - 12:00')
    // Create a new pending visit assigned to Caregiver 1 on the exact same date & time slot
    const conflictingVisit = await FieldVisit.create({
      visitNumber: conflictVisitNumber,
      visitType: 'clinical_care',
      status: 'assigned',
      assignmentStatus: 'pending',
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Palliative Caregiver',
      providerPhone: caregiver1Phone,
      patientId: new mongoose.Types.ObjectId(patientUserId),
      patientDetails: {
        fullName: patientName,
        phone: patientPhone,
        address: 'Cluster 2, Pune',
        city: 'Pune',
        pincode: '411005',
        cluster: 'Pune Central',
      },
      scheduledDate: testDate,
      timeSlot: testSlot,
      timestamps: {
        assignedAt: new Date(),
      },
      statusHistory: [{ status: 'assigned', timestamp: new Date() }],
      isDemo: false,
    });
    conflictVisitId = conflictingVisit._id.toString();

    // Caregiver 1 attempts to accept this conflicting visit
    const conflictAccept = await request(app)
      .post(`/api/v1/visits/${conflictVisitId}/accept`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send();

    assert.equal(conflictAccept.status, 409, 'Must prevent accepting an overlapping appointment (409 Conflict)');
    assert.ok(
      (conflictAccept.body.error?.message || conflictAccept.body.message || '').includes('conflict'),
      'Error message must indicate scheduling conflict'
    );
  });

  // ===========================================================================
  // Step 6 Test I: Patient schedule displays authoritative backend state
  // ===========================================================================
  it('I. Patient schedule displays authoritative backend state for accepted and rejected visits', async () => {
    const patientVisitsRes = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patientToken}`);

    assert.equal(patientVisitsRes.status, 200);
    const schedule = patientVisitsRes.body.data;
    assert.ok(schedule.upcoming, 'Upcoming visits schedule should be returned');

    // Visit 1 was accepted: should show statusLabel containing 'Accepted' and assignedCaregiver Alice
    const acceptedVisit = schedule.upcoming.find((v: any) => v.id === visit1Id);
    assert.ok(acceptedVisit, 'Accepted visit should appear in upcoming schedule');
    assert.equal(acceptedVisit.status, 'accepted');
    assert.ok(acceptedVisit.statusLabel.includes('Accepted'));
    assert.ok(acceptedVisit.assignedCaregiver, 'Accepted visit must include assigned caregiver');
    assert.equal(acceptedVisit.assignedCaregiver.name, caregiver1Name);

    // Visit 2 was rejected: assignedCaregiver MUST be null, status must be 'rejected'
    const rejectedVisit = schedule.upcoming.find((v: any) => v.id === visit2Id);
    assert.ok(rejectedVisit, 'Rejected visit should remain in upcoming schedule awaiting replacement');
    assert.equal(rejectedVisit.status, 'rejected');
    assert.equal(rejectedVisit.assignedCaregiver, null, 'Rejected caregiver must NOT be returned in assignedCaregiver');
    assert.ok(rejectedVisit.statusLabel.includes('Reassignment'));

    // Check that patient caregiver endpoint (/patients/me/caregiver) does not return rejected caregiver as active
    // when only rejected visits exist for that patient
    const rejPatReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Rejected-Only Patient',
        phone: '9875557799',
        password: 'TestPassword123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(rejPatReg.status, 201);
    const rejPatToken = rejPatReg.body.data.token;
    const rejPatId = rejPatReg.body.data.user.id;

    const rejVisit = await FieldVisit.create({
      visitNumber: 'VQ-TEST-REJ-ONLY',
      visitType: 'clinical_care',
      status: 'rejected',
      assignmentStatus: 'rejected',
      replacementRequired: true,
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Palliative Caregiver',
      providerPhone: caregiver1Phone,
      patientId: new mongoose.Types.ObjectId(rejPatId),
      patientDetails: {
        fullName: 'Rejected-Only Patient',
        phone: '9875557799',
        address: 'Pune Test Address',
        city: 'Pune',
        pincode: '411005',
        cluster: 'Pune Central',
      },
      scheduledDate: testDate,
      timeSlot: testSlot,
      timestamps: { assignedAt: new Date(), rejectedAt: new Date() },
    });

    const rejPatCgRes = await request(app)
      .get('/api/v1/patients/me/caregiver')
      .set('Authorization', `Bearer ${rejPatToken}`);
    assert.equal(rejPatCgRes.status, 200);
    assert.equal(rejPatCgRes.body.data.assignedCaregiver, null, 'Rejected-only patient must receive null assignedCaregiver');

    // Clean up temporary patient
    await User.findByIdAndDelete(rejPatId);
    await FieldVisit.findByIdAndDelete(rejVisit._id);

    // Verify underlying booking and audit trail remain preserved
    const underlyingVisit = await FieldVisit.findById(visit2Id).lean();
    assert.ok(underlyingVisit, 'Visit document must be preserved');
    assert.equal(underlyingVisit.patientDetails.fullName, patientName);
    assert.equal(underlyingVisit.patientDetails.address, 'Flat 402, Shivajinagar, Pune');

    const rejectionAudit = await AuditLog.findOne({
      targetId: visit2Id,
      action: 'FIELD_VISIT_ASSIGNMENT_REJECTED',
    }).lean();
    assert.ok(rejectionAudit, 'Audit log entry must be created for assignment rejection');
    assert.equal(rejectionAudit.actorName, caregiver1Name);
  });

  // ===========================================================================
  // Step 6 Test J: Reassigning an eligible replacement caregiver restores views
  // ===========================================================================
  it('J. Reassigning an eligible replacement caregiver restores the correct Patient and Admin schedule views', async () => {
    // 1. Admin reassigns rejected visit 2 to caregiver 2
    const reassignRes = await request(app)
      .patch(`/api/v1/admin/field-visits/${visit2Id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: caregiver2UserId,
        providerName: caregiver2Name,
        providerPhone: caregiver2Phone,
        reason: 'Replacement for rejected caregiver',
      });

    assert.equal(reassignRes.status, 200);
    assert.equal(reassignRes.body.data.status, 'assigned');
    assert.equal(reassignRes.body.data.assignmentStatus, 'pending');
    assert.equal(reassignRes.body.data.providerName, caregiver2Name);
    assert.equal(reassignRes.body.data.replacementRequired, false);

    // 2. Caregiver 2 accepts the replacement assignment
    const acceptRes = await request(app)
      .post(`/api/v1/visits/${visit2Id}/accept`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send();

    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.status, 'accepted');
    assert.equal(acceptRes.body.data.assignmentStatus, 'accepted');

    // 3. Patient upcoming visits API now returns caregiver 2 as confirmed assignedCaregiver
    const patRes = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patientToken}`);

    assert.equal(patRes.status, 200);
    const restoredVisit = patRes.body.data.upcoming.find((v: any) => v.id === visit2Id);
    assert.ok(restoredVisit, 'Restored visit should appear in patient upcoming schedule');
    assert.equal(restoredVisit.status, 'accepted');
    assert.ok(restoredVisit.assignedCaregiver, 'Assigned caregiver must be restored once accepted');
    assert.equal(restoredVisit.assignedCaregiver.name, caregiver2Name);
    assert.equal(restoredVisit.assignedCaregiver.phone, caregiver2Phone);

    // 4. Admin field visits reflects accepted status with caregiver 2
    const adminVisits = await request(app)
      .get(`/api/v1/admin/field-visits?status=accepted&limit=100`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(adminVisits.status, 200);
    const acceptedInAdmin = (adminVisits.body.data || adminVisits.body.visits).find(
      (v: any) => v._id === visit2Id || v.id === visit2Id || v.visitNumber === visit2Number
    );
    assert.ok(acceptedInAdmin, 'Visit must appear under accepted visits in Admin dashboard');
    assert.equal(acceptedInAdmin.providerName, caregiver2Name);
    assert.equal(Boolean(acceptedInAdmin.replacementRequired), false);
  });
});
