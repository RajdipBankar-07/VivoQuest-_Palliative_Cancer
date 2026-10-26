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
import { seedAdminDemoData } from '../src/services/adminService.js';
import { seedCaregiverPlansDemoData } from '../src/services/caregiverPlanService.js';

describe('VivoQuest — Phase 2: Complete Reschedule Requests Workflow', () => {
  const app = createApp();

  // Test Users
  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900';

  let patient1Token: string;
  let patient1UserId: string;
  const patient1Phone = '9875551111';
  const patient1Name = 'Phase2 Patient One';

  let patient2Token: string;
  let patient2UserId: string;
  const patient2Phone = '9875552222';
  const patient2Name = 'Phase2 Patient Two';

  let caregiverAssignedToken: string;
  let caregiverAssignedUserId: string;
  const caregiverAssignedPhone = '9875553333';
  const caregiverAssignedName = 'Phase2 Nurse Florence';

  let caregiverOtherToken: string;
  let caregiverOtherUserId: string;
  const caregiverOtherPhone = '9875554444';
  const caregiverOtherName = 'Phase2 Nurse Unassigned';

  // Test Resources
  let activeVisit1Id: string;
  let activeVisit1Number = 'VQ-TEST-P2-001';

  let activeVisit2Id: string;
  let activeVisit2Number = 'VQ-TEST-P2-002';

  let completedVisitId: string;
  let completedVisitNumber = 'VQ-TEST-P2-003';

  let createdRequestId: string;

  before(async () => {
    await connectDatabase();

    // Clean up test data
    await User.deleteMany({
      phone: { $in: [patient1Phone, patient2Phone, caregiverAssignedPhone, caregiverOtherPhone] },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: [activeVisit1Number, activeVisit2Number, completedVisitNumber] },
    });
    await VisitRescheduleRequest.deleteMany({
      visitNumber: { $in: [activeVisit1Number, activeVisit2Number, completedVisitNumber] },
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

    // 2. Patient 1 Registration & Login
    const p1Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: patient1Name,
        phone: patient1Phone,
        password: 'TestPassword123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(p1Reg.status, 201);
    patient1Token = p1Reg.body.data.token;
    patient1UserId = p1Reg.body.data.user.id;

    // 3. Patient 2 Registration
    const p2Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: patient2Name,
        phone: patient2Phone,
        password: 'TestPassword123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(p2Reg.status, 201);
    patient2Token = p2Reg.body.data.token;
    patient2UserId = p2Reg.body.data.user.id;

    // 4. Assigned Caregiver Registration & Login
    const cgAssigned = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: caregiverAssignedName,
        phone: caregiverAssignedPhone,
        password: 'TestPassword123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(cgAssigned.status, 201);
    caregiverAssignedToken = cgAssigned.body.data.token;
    caregiverAssignedUserId = cgAssigned.body.data.user.id;

    // 5. Unassigned Caregiver Registration & Login
    const cgOther = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: caregiverOtherName,
        phone: caregiverOtherPhone,
        password: 'TestPassword123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(cgOther.status, 201);
    caregiverOtherToken = cgOther.body.data.token;
    caregiverOtherUserId = cgOther.body.data.user.id;

    // Create Test Visits in MongoDB
    // Visit 1: Active upcoming visit for Patient 1 assigned to Nurse Florence
    const v1 = await FieldVisit.create({
      visitNumber: activeVisit1Number,
      visitType: 'clinical_care',
      status: 'assigned',
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientDetails: {
        fullName: patient1Name,
        phone: patient1Phone,
        address: 'Bandra West, Mumbai',
        city: 'Mumbai',
        pincode: '400050',
      },
      providerId: new mongoose.Types.ObjectId(caregiverAssignedUserId),
      providerName: caregiverAssignedName,
      providerRole: 'caregiver',
      providerPhone: caregiverAssignedPhone,
      scheduledDate: '2026-11-10',
      timeSlot: '09:00 - 11:00',
      timestamps: {
        assignedAt: new Date(),
      },
    });
    activeVisit1Id = v1._id.toString();

    // Visit 2: Another active visit for Patient 2 assigned to Nurse Florence (used for conflict test)
    const v2 = await FieldVisit.create({
      visitNumber: activeVisit2Number,
      visitType: 'clinical_care',
      status: 'assigned',
      patientId: new mongoose.Types.ObjectId(patient2UserId),
      patientDetails: {
        fullName: patient2Name,
        phone: patient2Phone,
        address: 'Andheri East, Mumbai',
        city: 'Mumbai',
        pincode: '400069',
      },
      providerId: new mongoose.Types.ObjectId(caregiverAssignedUserId),
      providerName: caregiverAssignedName,
      providerRole: 'caregiver',
      providerPhone: caregiverAssignedPhone,
      scheduledDate: '2026-11-12',
      timeSlot: '14:00 - 16:00',
      timestamps: {
        assignedAt: new Date(),
      },
    });
    activeVisit2Id = v2._id.toString();

    // Visit 3: Completed visit (ineligible for reschedule)
    const v3 = await FieldVisit.create({
      visitNumber: completedVisitNumber,
      visitType: 'clinical_care',
      status: 'completed',
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientDetails: {
        fullName: patient1Name,
        phone: patient1Phone,
        address: 'Bandra West, Mumbai',
        city: 'Mumbai',
        pincode: '400050',
      },
      providerId: new mongoose.Types.ObjectId(caregiverAssignedUserId),
      providerName: caregiverAssignedName,
      providerRole: 'caregiver',
      providerPhone: caregiverAssignedPhone,
      scheduledDate: '2026-10-15',
      timeSlot: '10:00 - 12:00',
      timestamps: {
        assignedAt: new Date(),
        completedAt: new Date(),
      },
    });
    completedVisitId = v3._id.toString();
  });

  after(async () => {
    await User.deleteMany({
      phone: { $in: [patient1Phone, patient2Phone, caregiverAssignedPhone, caregiverOtherPhone] },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: [activeVisit1Number, activeVisit2Number, completedVisitNumber] },
    });
    await VisitRescheduleRequest.deleteMany({
      visitNumber: { $in: [activeVisit1Number, activeVisit2Number, completedVisitNumber] },
    });
    await disconnectDatabase();
  });

  // =========================================================================
  // TEST A: Patient submits a request and it appears in Admin Dashboard
  // =========================================================================
  it('A. Patient submits a request and it appears in Admin Dashboard', async () => {
    const subRes = await request(app)
      .post(`/api/v1/patients/me/visits/${activeVisit1Id}/reschedule`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        requestedDate: '2026-11-11',
        requestedTimeSlot: '11:00 - 13:00',
        reason: 'Family wedding on original date; requesting next day morning',
      });

    assert.equal(subRes.status, 201, 'Patient reschedule request submission must succeed');
    assert.equal(subRes.body.success, true);
    assert.equal(subRes.body.data.status, 'pending');
    assert.equal(subRes.body.data.requestedSchedule.scheduledDate, '2026-11-11');
    assert.equal(subRes.body.data.requestedSchedule.timeSlot, '11:00 - 13:00');
    createdRequestId = subRes.body.data._id || subRes.body.data.id;

    // Check that it appears in Admin Dashboard API
    const adminRes = await request(app)
      .get('/api/v1/admin/reschedule-requests?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(adminRes.status, 200);
    const foundInAdmin = adminRes.body.data.find(
      (r: any) => r._id === createdRequestId || r.id === createdRequestId
    );
    assert.ok(foundInAdmin, 'Submitted request must appear in Admin Dashboard pending list');
    assert.equal(foundInAdmin.patientName, patient1Name);
    assert.equal(foundInAdmin.visitNumber, activeVisit1Number);
    assert.equal(foundInAdmin.providerName, caregiverAssignedName);

    // Verify overview counter includes pending request
    const overviewRes = await request(app)
      .get('/api/v1/admin/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(overviewRes.status, 200);
    assert.ok(overviewRes.body.data.pendingRescheduleCount >= 1, 'Overview must track pendingRescheduleCount');
  });

  // =========================================================================
  // TEST B: The assigned caregiver can review the request
  // =========================================================================
  it('B. The assigned caregiver can review the request', async () => {
    const cgRes = await request(app)
      .get('/api/v1/visits/reschedule-requests?status=pending')
      .set('Authorization', `Bearer ${caregiverAssignedToken}`);

    assert.equal(cgRes.status, 200);
    assert.ok(Array.isArray(cgRes.body.data));
    const foundByCaregiver = cgRes.body.data.find(
      (r: any) => r._id === createdRequestId || r.id === createdRequestId
    );
    assert.ok(foundByCaregiver, 'Assigned caregiver must see the pending reschedule request');
    assert.equal(foundByCaregiver.visitNumber, activeVisit1Number);
  });

  // =========================================================================
  // TEST C: Unauthorized caregiver cannot review another caregiver's request
  // =========================================================================
  it('C. Unauthorized caregiver cannot review another caregiver’s request (403 Forbidden)', async () => {
    // Caregiver Other tries to approve
    const unauthApprove = await request(app)
      .post(`/api/v1/visits/reschedule-requests/${createdRequestId}/approve`)
      .set('Authorization', `Bearer ${caregiverOtherToken}`);
    assert.equal(unauthApprove.status, 403, 'Unauthorized caregiver must be rejected with 403');

    // Caregiver Other tries to reject
    const unauthReject = await request(app)
      .post(`/api/v1/visits/reschedule-requests/${createdRequestId}/reject`)
      .set('Authorization', `Bearer ${caregiverOtherToken}`)
      .send({ rejectionReason: 'Caregiver unavailable' });
    assert.equal(unauthReject.status, 403, 'Unauthorized caregiver must be rejected with 403');
  });

  // =========================================================================
  // TEST G: Overlapping caregiver assignments prevent invalid approval
  // =========================================================================
  it('G. Overlapping caregiver assignments prevent invalid approval (409 Conflict)', async () => {
    // Try to reschedule Visit 1 to 2026-11-12 at 14:00 - 16:00
    // But Nurse Florence is ALREADY assigned to Visit 2 on that date & slot!
    const conflictReq = await VisitRescheduleRequest.create({
      visitId: new mongoose.Types.ObjectId(activeVisit1Id),
      visitNumber: activeVisit1Number,
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientName: patient1Name,
      patientPhone: patient1Phone,
      providerId: new mongoose.Types.ObjectId(caregiverAssignedUserId),
      providerName: caregiverAssignedName,
      providerRole: 'caregiver',
      providerPhone: caregiverAssignedPhone,
      requestedBy: new mongoose.Types.ObjectId(patient1UserId),
      requesterName: patient1Name,
      requesterRole: 'patient',
      originalSchedule: {
        scheduledDate: '2026-11-10',
        timeSlot: '09:00 - 11:00',
      },
      requestedSchedule: {
        scheduledDate: '2026-11-12', // Conflict with Visit 2!
        timeSlot: '14:00 - 16:00',
      },
      reason: 'Testing conflict detection',
      status: 'pending',
    });

    const conflictApprove = await request(app)
      .post(`/api/v1/admin/reschedule-requests/${conflictReq._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(conflictApprove.status, 409, 'Must reject approval with 409 when slot conflicts');
    assert.match(conflictApprove.body.error?.message || conflictApprove.body.message || '', /conflict/i);

    // Verify original schedule remained completely unchanged
    const visitStillUnchanged = await FieldVisit.findById(activeVisit1Id);
    assert.equal(visitStillUnchanged?.scheduledDate, '2026-11-10');
    assert.equal(visitStillUnchanged?.timeSlot, '09:00 - 11:00');

    // Clean up temporary conflict request
    await VisitRescheduleRequest.findByIdAndDelete(conflictReq._id);
  });

  // =========================================================================
  // TEST D: Admin approves a valid request and new schedule appears consistently
  // =========================================================================
  it('D. Admin approves a valid request and the new schedule appears consistently across interfaces', async () => {
    const approveRes = await request(app)
      .post(`/api/v1/admin/reschedule-requests/${createdRequestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(approveRes.status, 200, 'Admin approval must succeed');
    assert.equal(approveRes.body.data.request.status, 'approved');
    assert.equal(approveRes.body.data.visit.scheduledDate, '2026-11-11');
    assert.equal(approveRes.body.data.visit.timeSlot, '11:00 - 13:00');

    // 1. Authoritative Database Record
    const dbVisit = await FieldVisit.findById(activeVisit1Id);
    assert.equal(dbVisit?.scheduledDate, '2026-11-11');
    assert.equal(dbVisit?.timeSlot, '11:00 - 13:00');

    // 2. Patient App Schedule View
    const patientSchedule = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(patientSchedule.status, 200);
    const patientVisit = (patientSchedule.body.data.upcoming || []).find(
      (v: any) => v.visitNumber === activeVisit1Number
    );
    assert.ok(patientVisit, 'Updated visit must appear in patient upcoming schedule');
    assert.equal(patientVisit.scheduledDate, '2026-11-11');
    assert.equal(patientVisit.timeSlot, '11:00 - 13:00');

    // 3. Caregiver App Schedule View
    const caregiverVisits = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${caregiverAssignedToken}`);
    assert.equal(caregiverVisits.status, 200);
    const caregiverVisit = (caregiverVisits.body.data || []).find(
      (v: any) => v.visitNumber === activeVisit1Number
    );
    assert.ok(caregiverVisit, 'Updated visit must appear in caregiver visit schedule');
    assert.equal(caregiverVisit.scheduledDate, '2026-11-11');
    assert.equal(caregiverVisit.timeSlot, '11:00 - 13:00');

    // 4. Admin Dashboard Visits List
    const adminVisits = await request(app)
      .get('/api/v1/admin/visits')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminVisits.status, 200);
    const adminVisit = (adminVisits.body.data || adminVisits.body.visits || []).find(
      (v: any) => v.visitNumber === activeVisit1Number
    );
    assert.ok(adminVisit, 'Updated visit must appear in admin visits list');
    assert.equal(adminVisit.scheduledDate, '2026-11-11');
    assert.equal(adminVisit.timeSlot, '11:00 - 13:00');

    // 5. In-App Notifications dispatched to Patient, Caregiver, and Admin
    const patNotif = await NotificationLog.findOne({
      recipientPhone: patient1Phone,
      templateId: 'VISIT_RESCHEDULE_APPROVED',
    });
    assert.ok(patNotif, 'Patient must receive approval notification');

    const cgNotif = await NotificationLog.findOne({
      recipientPhone: caregiverAssignedPhone,
      templateId: 'VISIT_RESCHEDULE_APPROVED',
    });
    assert.ok(cgNotif, 'Caregiver must receive approval notification');

    const adminNotif = await NotificationLog.findOne({
      recipientRole: 'admin',
      templateId: 'VISIT_RESCHEDULE_APPROVED',
    });
    assert.ok(adminNotif, 'Admin desk must receive approval notification');
  });

  // =========================================================================
  // TEST H: Duplicate/concurrent approval attempts cannot produce conflicting schedules
  // =========================================================================
  it('H. Duplicate/concurrent approval attempts cannot produce conflicting schedules (Idempotency)', async () => {
    // Calling approve again on already approved request returns 200 idempotently
    const duplicateApprove = await request(app)
      .post(`/api/v1/admin/reschedule-requests/${createdRequestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(duplicateApprove.status, 200, 'Second approval must return 200 idempotently');
    assert.equal(duplicateApprove.body.data.request.status, 'approved');
    assert.equal(duplicateApprove.body.data.visit.scheduledDate, '2026-11-11');
  });

  // =========================================================================
  // TEST E & F: Rejecting a request preserves original schedule & records audit history
  // =========================================================================
  it('E & F. Rejecting a request preserves original schedule and records rejection reason, reviewer, timestamp, and audit history', async () => {
    // 1. Submit a second reschedule request on Visit 2
    const sub2 = await request(app)
      .post(`/api/v1/patients/me/visits/${activeVisit2Id}/reschedule`)
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        requestedDate: '2026-11-18',
        requestedTimeSlot: '10:00 - 12:00',
        reason: 'Personal engagement conflict',
      });
    assert.equal(sub2.status, 201);
    const req2Id = sub2.body.data._id || sub2.body.data.id;

    // 2. Reject request with mandatory reason
    const rejectionReason = 'Nurse team fully committed with hospital palliative rounds on requested morning';
    const rejectRes = await request(app)
      .post(`/api/v1/admin/reschedule-requests/${req2Id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejectionReason });

    assert.equal(rejectRes.status, 200, 'Rejection must succeed');
    assert.equal(rejectRes.body.data.status, 'rejected');
    assert.equal(rejectRes.body.data.rejectionReason, rejectionReason);
    assert.ok(rejectRes.body.data.resolvedAt, 'Resolved timestamp must be present');
    assert.equal(rejectRes.body.data.resolverRole, 'admin');

    // 3. Verify Visit 2 schedule was PRESERVED unchanged
    const visit2After = await FieldVisit.findById(activeVisit2Id);
    assert.equal(visit2After?.scheduledDate, '2026-11-12', 'Original date must be preserved');
    assert.equal(visit2After?.timeSlot, '14:00 - 16:00', 'Original time slot must be preserved');

    // 4. Verify AuditLog
    const rejectAudit = await AuditLog.findOne({
      action: 'VISIT_RESCHEDULE_REJECTED',
      targetId: activeVisit2Number,
    });
    assert.ok(rejectAudit, 'AuditLog must record VISIT_RESCHEDULE_REJECTED');
    assert.equal(rejectAudit?.details?.rejectionReason, rejectionReason);

    // 5. Verify Patient Notification
    const rejectNotif = await NotificationLog.findOne({
      recipientPhone: patient2Phone,
      templateId: 'VISIT_RESCHEDULE_REJECTED',
    });
    assert.ok(rejectNotif, 'Patient must receive rejection notification');
    assert.match(rejectNotif?.messageBody || '', /remains active/i);

    // 6. Idempotent check: calling reject again returns current document
    const secondReject = await request(app)
      .post(`/api/v1/admin/reschedule-requests/${req2Id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejectionReason: 'Another reason' });
    assert.equal(secondReject.status, 200, 'Subsequent reject call must be idempotent');
  });

  // =========================================================================
  // TEST I: Ineligible visit (completed/cancelled) cannot be rescheduled
  // =========================================================================
  it('I. A completed, cancelled, or otherwise ineligible visit cannot be rescheduled (400 Bad Request)', async () => {
    const ineligibleRes = await request(app)
      .post(`/api/v1/patients/me/visits/${completedVisitId}/reschedule`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        requestedDate: '2026-11-20',
        requestedTimeSlot: '10:00 - 12:00',
        reason: 'Attempting to reschedule completed visit',
      });

    assert.equal(ineligibleRes.status, 400, 'Must reject rescheduling completed visit with 400');
    assert.match(ineligibleRes.body.error?.message || ineligibleRes.body.message || '', /completed/i);
  });

  // =========================================================================
  // TEST J: Hiding a request does not change its operational status or visit schedule
  // =========================================================================
  it('J. Hiding a request does not change its operational status or visit schedule', async () => {
    // Patient 1 hides createdRequestId (which is approved)
    const hideRes = await request(app)
      .delete(`/api/v1/patients/me/reschedule-requests/${createdRequestId}`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({ reason: 'Cleaned from my view' });

    assert.equal(hideRes.status, 200);
    assert.equal(hideRes.body.data.visitUnchanged, true);

    // Verify request status in DB is STILL approved (not modified or deleted)
    const reqInDb = await VisitRescheduleRequest.findById(createdRequestId);
    assert.ok(reqInDb);
    assert.equal(reqInDb.status, 'approved');
    assert.equal(reqInDb.hiddenFromPatient, true);

    // Verify visit schedule in DB remains intact
    const visitInDb = await FieldVisit.findById(activeVisit1Id);
    assert.equal(visitInDb?.scheduledDate, '2026-11-11');
    assert.equal(visitInDb?.timeSlot, '11:00 - 13:00');

    // Verify Admin Dashboard STILL has access to the request
    const adminCheck = await request(app)
      .get('/api/v1/admin/reschedule-requests?status=approved')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminCheck.status, 200);
    const stillInAdmin = adminCheck.body.data.find(
      (r: any) => r._id === createdRequestId || r.id === createdRequestId
    );
    assert.ok(stillInAdmin, 'Patient-hidden request must remain visible in Admin Dashboard');
  });
});
