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
import { seedAdminDemoData } from '../src/services/adminService.js';

describe('VivoQuest — Phase 4: Field Visit Caregiver Reassignment Regression Suite', () => {
  const app = createApp();

  // Test Admin
  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900';

  // Test Patient
  let patientToken: string;
  let patientUserId: string;
  const patientPhone = '9876661101';
  const patientName = 'Reassign Test Patient Raj';

  // Original Caregiver (who rejects)
  let origCaregiverToken: string;
  let origCaregiverUserId: string;
  const origCaregiverPhone = '9876661102';
  const origCaregiverName = 'Dr. Original Rejector';

  // Replacement Eligible Caregiver
  let replacementCaregiverToken: string;
  let replacementCaregiverUserId: string;
  const replacementCaregiverPhone = '9876661103';
  const replacementCaregiverName = 'Sister Replacement Nurse';

  // Inactive Caregiver
  let inactiveCaregiverUserId: string;
  const inactiveCaregiverPhone = '9876661104';
  const inactiveCaregiverName = 'Nurse Inactive One';

  // Conflicted Caregiver
  let conflictedCaregiverToken: string;
  let conflictedCaregiverUserId: string;
  const conflictedCaregiverPhone = '9876661105';
  const conflictedCaregiverName = 'Nurse Busy Schedule';

  // Test Visit Numbers
  const testVisitNumber = 'VQ-TEST-REASSIGN-001';
  const conflictVisitNumber = 'VQ-TEST-REASSIGN-CONFLICT';
  let testVisitId: string;
  let conflictVisitId: string;

  const scheduledDate = '2026-10-27';
  const timeSlot = '09:00 - 11:00';
  const normalizedSlot = '09:00 AM - 11:00 AM';

  before(async () => {
    await connectDatabase();

    // Clean up any stale test fixtures
    await User.deleteMany({
      phone: { $in: [patientPhone, origCaregiverPhone, replacementCaregiverPhone, inactiveCaregiverPhone, conflictedCaregiverPhone] },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: [testVisitNumber, conflictVisitNumber] },
    });
    await NotificationLog.deleteMany({
      recipientPhone: { $in: [patientPhone, origCaregiverPhone, replacementCaregiverPhone, conflictedCaregiverPhone] },
    });
    await AuditLog.deleteMany({
      'details.visitNumber': { $in: [testVisitNumber, conflictVisitNumber] },
    });

    await seedAdminDemoData();

    // 1. Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: adminPhone, otp: '123456', role: 'admin' });
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.token;
    adminUserId = adminLogin.body.data.user.id;

    // 2. Patient registration
    const patReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: patientName,
        phone: patientPhone,
        password: 'Password123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(patReg.status, 201);
    patientToken = patReg.body.data.token;
    patientUserId = patReg.body.data.user.id;

    // 3. Original caregiver registration
    const origReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: origCaregiverName,
        phone: origCaregiverPhone,
        password: 'Password123!',
        role: 'professional',
        consentAccepted: true,
      });
    assert.equal(origReg.status, 201);
    origCaregiverToken = origReg.body.data.token;
    origCaregiverUserId = origReg.body.data.user.id;

    // 4. Replacement caregiver registration
    const repReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: replacementCaregiverName,
        phone: replacementCaregiverPhone,
        password: 'Password123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(repReg.status, 201);
    replacementCaregiverToken = repReg.body.data.token;
    replacementCaregiverUserId = repReg.body.data.user.id;

    // 5. Inactive caregiver creation via register then suspend
    const inactReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: inactiveCaregiverName,
        phone: inactiveCaregiverPhone,
        password: 'Password123!',
        role: 'professional',
        consentAccepted: true,
      });
    assert.equal(inactReg.status, 201);
    inactiveCaregiverUserId = inactReg.body.data.user.id;
    await User.findByIdAndUpdate(inactiveCaregiverUserId, { status: 'suspended' });

    // 6. Conflicted caregiver creation
    const confReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: conflictedCaregiverName,
        phone: conflictedCaregiverPhone,
        password: 'Password123!',
        role: 'professional',
        consentAccepted: true,
      });
    assert.equal(confReg.status, 201);
    conflictedCaregiverToken = confReg.body.data.token;
    conflictedCaregiverUserId = confReg.body.data.user.id;

    // Create an active visit for the conflicted caregiver at the same date and slot
    const confVisitDoc = await FieldVisit.create({
      visitNumber: conflictVisitNumber,
      visitType: 'clinical_care',
      status: 'assigned',
      assignmentStatus: 'pending',
      providerId: new mongoose.Types.ObjectId(conflictedCaregiverUserId),
      providerName: conflictedCaregiverName,
      providerPhone: conflictedCaregiverPhone,
      providerRole: 'Registered Nurse',
      patientId: new mongoose.Types.ObjectId(patientUserId),
      patientDetails: {
        fullName: patientName,
        phone: patientPhone,
        address: '101 Marine Lines, Mumbai',
        pincode: '400020',
        city: 'Mumbai',
        state: 'Maharashtra',
        cluster: 'South Mumbai',
      },
      scheduledDate,
      timeSlot: normalizedSlot, // '09:00 AM - 11:00 AM'
    });
    conflictVisitId = confVisitDoc._id.toString();

    // Create the test visit in 'rejected' state with replacementRequired: true
    const testVisitDoc = await FieldVisit.create({
      visitNumber: testVisitNumber,
      visitType: 'clinical_care',
      status: 'rejected',
      assignmentStatus: 'rejected',
      replacementRequired: true,
      providerId: new mongoose.Types.ObjectId(origCaregiverUserId),
      providerName: origCaregiverName,
      providerPhone: origCaregiverPhone,
      providerRole: 'Registered Nurse',
      patientId: new mongoose.Types.ObjectId(patientUserId),
      patientDetails: {
        fullName: patientName,
        phone: patientPhone,
        address: '102 Marine Lines, Mumbai',
        pincode: '400020',
        city: 'Mumbai',
        state: 'Maharashtra',
        cluster: 'South Mumbai',
      },
      scheduledDate,
      timeSlot, // '09:00 - 11:00'
      assignmentRejection: {
        reason: 'Clinician emergency on call',
        rejectedAt: new Date(),
        rejectedBy: new mongoose.Types.ObjectId(origCaregiverUserId),
        rejectedByName: origCaregiverName,
        rejectedByPhone: origCaregiverPhone,
      },
      statusHistory: [
        {
          status: 'assigned',
          changedByName: 'Admin',
          timestamp: new Date(Date.now() - 3600000),
          notes: 'Initial assignment',
        },
        {
          status: 'rejected',
          changedBy: new mongoose.Types.ObjectId(origCaregiverUserId),
          changedByName: origCaregiverName,
          timestamp: new Date(),
          reason: 'Clinician emergency on call',
          notes: 'Caregiver rejected assignment: Clinician emergency on call',
        },
      ],
    });
    testVisitId = testVisitDoc._id.toString();
  });

  after(async () => {
    await User.deleteMany({
      phone: { $in: [patientPhone, origCaregiverPhone, replacementCaregiverPhone, inactiveCaregiverPhone, conflictedCaregiverPhone] },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: [testVisitNumber, conflictVisitNumber] },
    });
    await NotificationLog.deleteMany({
      recipientPhone: { $in: [patientPhone, origCaregiverPhone, replacementCaregiverPhone, conflictedCaregiverPhone] },
    });
    await AuditLog.deleteMany({
      'details.visitNumber': { $in: [testVisitNumber, conflictVisitNumber] },
    });
    await disconnectDatabase();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Rejected assignment can be reassigned to an eligible caregiver
  // ---------------------------------------------------------------------------
  it('1. Rejected assignment can be reassigned to an eligible caregiver by ID or visitNumber', async () => {
    // Also tests support for visitNumber lookup
    const res = await request(app)
      .patch(`/api/v1/admin/field-visits/${testVisitNumber}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: replacementCaregiverUserId,
        providerName: replacementCaregiverName,
        providerPhone: replacementCaregiverPhone,
        reason: 'Sister Replacement Nurse assigned following previous caregiver decline',
        scheduledDate,
        timeSlot: normalizedSlot,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.visitNumber, testVisitNumber);
    assert.equal(res.body.data.status, 'assigned');
    assert.equal(res.body.data.assignmentStatus, 'pending');
    assert.equal(res.body.data.replacementRequired, false);
    assert.equal(res.body.data.providerName, replacementCaregiverName);
    assert.equal(res.body.data.providerPhone, replacementCaregiverPhone);
  });

  // ---------------------------------------------------------------------------
  // Test 2: New caregiver assignment persists after reload
  // ---------------------------------------------------------------------------
  it('2. New caregiver assignment persists accurately in the database across fresh queries', async () => {
    const freshDoc = await FieldVisit.findOne({ visitNumber: testVisitNumber }).lean();
    assert.ok(freshDoc);
    assert.equal(freshDoc.providerId.toString(), replacementCaregiverUserId);
    assert.equal(freshDoc.providerName, replacementCaregiverName);
    assert.equal(freshDoc.providerPhone, replacementCaregiverPhone);
    assert.equal(freshDoc.status, 'assigned');
    assert.equal(freshDoc.assignmentStatus, 'pending');
    assert.equal(freshDoc.replacementRequired, false);
    assert.equal(freshDoc.assignmentRejection, undefined);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Invalid or unavailable caregiver is rejected with actionable error
  // ---------------------------------------------------------------------------
  it('3. Reassignment to an inactive or non-existent caregiver is rejected with actionable error', async () => {
    // 3A: Non-existent provider ID
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const resNonExistent = await request(app)
      .patch(`/api/v1/admin/field-visits/${testVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: nonExistentId,
        reason: 'Testing nonexistent provider',
      });
    assert.equal(resNonExistent.status, 404);
    assert.ok(resNonExistent.body.error?.message?.includes('not found'));

    // 3B: Inactive / Suspended provider
    const resInactive = await request(app)
      .patch(`/api/v1/admin/field-visits/${testVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: inactiveCaregiverUserId,
        providerName: inactiveCaregiverName,
        reason: 'Testing inactive provider',
      });
    assert.equal(resInactive.status, 400);
    assert.ok(resInactive.body.error?.message?.includes('no longer available'));

    // 3C: User with role 'patient' cannot be assigned
    const resPatientRole = await request(app)
      .patch(`/api/v1/admin/field-visits/${testVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: patientUserId,
        providerName: patientName,
        reason: 'Testing patient role assignment',
      });
    assert.equal(resPatientRole.status, 400);
    assert.ok(resPatientRole.body.error?.message?.includes('cannot be assigned as a field caregiver'));
  });

  // ---------------------------------------------------------------------------
  // Test 4: Scheduling conflicts are detected across format variations
  // ---------------------------------------------------------------------------
  it('4. Scheduling conflicts are detected when replacement caregiver has an active slot', async () => {
    // Conflicted caregiver already has conflictVisitNumber on scheduledDate during '09:00 AM - 11:00 AM'
    // Attempting to reassign testVisitId to conflictedCaregiver on same date & slot should return 409
    const resConflict = await request(app)
      .patch(`/api/v1/admin/field-visits/${testVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: conflictedCaregiverUserId,
        providerName: conflictedCaregiverName,
        reason: 'Testing conflict detection',
        scheduledDate,
        timeSlot: '09:00 - 11:00', // matches '09:00 AM - 11:00 AM' normalized
      });

    assert.equal(resConflict.status, 409);
    assert.ok(resConflict.body.error?.message?.includes('scheduling conflict'));
    assert.ok(resConflict.body.error?.message?.includes(conflictedCaregiverName));
  });

  // ---------------------------------------------------------------------------
  // Test 5: Reassignment reason and audit history persist
  // ---------------------------------------------------------------------------
  it('5. Reassignment reason, previous provider, new provider, and admin actor persist in AuditLog', async () => {
    const auditRecord = await AuditLog.findOne({
      action: 'FIELD_VISIT_PROVIDER_REASSIGNED',
      'details.visitNumber': testVisitNumber,
    }).sort({ timestamp: -1 }).lean();

    assert.ok(auditRecord, 'AuditLog entry must be recorded');
    assert.equal(auditRecord.actorId.toString(), adminUserId);
    assert.equal(auditRecord.targetType, 'FieldVisit');
    assert.equal(auditRecord.targetId, testVisitId);
    assert.equal(auditRecord.details?.previousProvider, origCaregiverName);
    assert.equal(auditRecord.details?.newProvider, replacementCaregiverName);
    assert.ok(auditRecord.details?.reason?.includes('Sister Replacement Nurse'));

    // Check statusHistory preserves previous rejection entry and adds new assigned entry
    const visitDoc = await FieldVisit.findById(testVisitId).lean();
    assert.ok(visitDoc);
    const rejEntry = visitDoc.statusHistory.find((h: any) => h.status === 'rejected');
    assert.ok(rejEntry, 'Original rejection history entry must be preserved');
    assert.equal(rejEntry.changedByName, origCaregiverName);

    const reassignEntry = visitDoc.statusHistory[visitDoc.statusHistory.length - 1];
    assert.equal(reassignEntry.status, 'assigned');
    assert.ok(reassignEntry.notes?.includes(replacementCaregiverName));
  });

  // ---------------------------------------------------------------------------
  // Test 6: replacementRequired clears only after successful reassignment
  // ---------------------------------------------------------------------------
  it('6. replacementRequired clears only upon successful reassignment and remains preserved on failure', async () => {
    // Current state is successfully reassigned: replacementRequired must be false
    const currentDoc = await FieldVisit.findById(testVisitId).lean();
    assert.equal(currentDoc.replacementRequired, false);

    // If an invalid reassign attempt is made, it fails and does not alter the valid state
    const failedAttempt = await request(app)
      .patch(`/api/v1/admin/field-visits/${testVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: inactiveCaregiverUserId,
        reason: 'Attempting invalid update',
      });
    assert.equal(failedAttempt.status, 400);

    const checkDoc = await FieldVisit.findById(testVisitId).lean();
    assert.equal(checkDoc.providerName, replacementCaregiverName, 'Provider must not be corrupted by failed call');
    assert.equal(checkDoc.replacementRequired, false);
  });

  // ---------------------------------------------------------------------------
  // Test 7: Patient API returns new caregiver and not the rejected caregiver
  // ---------------------------------------------------------------------------
  it('7. Patient API returns the new replacement caregiver and not the rejected caregiver', async () => {
    const patVisitsRes = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patientToken}`);

    assert.equal(patVisitsRes.status, 200);
    const myVisit = patVisitsRes.body.data.upcoming.find((v: any) => v.id === testVisitId || v.visitNumber === testVisitNumber);
    assert.ok(myVisit, 'Visit must appear in patient upcoming visits');
    assert.equal(myVisit.assignedCaregiver?.name, replacementCaregiverName);
    assert.notEqual(myVisit.assignedCaregiver?.name, origCaregiverName);

    const patCgRes = await request(app)
      .get('/api/v1/patients/me/caregiver')
      .set('Authorization', `Bearer ${patientToken}`);
    assert.equal(patCgRes.status, 200);
    if (patCgRes.body.data.assignedCaregiver) {
      assert.notEqual(patCgRes.body.data.assignedCaregiver.name, origCaregiverName);
    }
  });

  // ---------------------------------------------------------------------------
  // Test 8: New caregiver can see the assigned visit in their active queue
  // ---------------------------------------------------------------------------
  it('8. New caregiver sees the assigned visit; rejected caregiver no longer sees it', async () => {
    // New caregiver queue
    const repCgVisits = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${replacementCaregiverToken}`);
    assert.equal(repCgVisits.status, 200);
    const assignedToNew = repCgVisits.body.data.find((v: any) => v.visitNumber === testVisitNumber);
    assert.ok(assignedToNew, 'New replacement caregiver must see the reassigned visit in their queue');
    assert.equal(assignedToNew.status, 'assigned');

    // Original rejected caregiver queue
    const origCgVisits = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${origCaregiverToken}`);
    assert.equal(origCgVisits.status, 200);
    const foundInOld = origCgVisits.body.data.find((v: any) => v.visitNumber === testVisitNumber);
    assert.equal(foundInOld, undefined, 'Original rejector must not see the visit in their queue');
  });

  // ---------------------------------------------------------------------------
  // Test 9: Admin sees the updated assignment and notification state
  // ---------------------------------------------------------------------------
  it('9. Admin sees the updated assignment in dashboard and notifications are logged', async () => {
    const adminVisits = await request(app)
      .get('/api/v1/admin/field-visits?limit=50')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminVisits.status, 200);
    const docInAdmin = (adminVisits.body.data || []).find((v: any) => v.visitNumber === testVisitNumber);
    assert.ok(docInAdmin);
    assert.equal(docInAdmin.providerName, replacementCaregiverName);
    assert.equal(docInAdmin.status, 'assigned');
    assert.equal(docInAdmin.replacementRequired, false);

    // Notifications logged
    const notifs = await NotificationLog.find({
      'metadata.visitNumber': testVisitNumber,
    }).lean();
    assert.ok(notifs.length >= 1, 'Notifications must be created for reassignment');
    const newCgNotif = notifs.find((n: any) => n.recipientPhone === replacementCaregiverPhone);
    assert.ok(newCgNotif, 'Notification must be dispatched to new replacement caregiver');
  });

  // ---------------------------------------------------------------------------
  // Test 10: Failed reassignment does not corrupt previous state
  // ---------------------------------------------------------------------------
  it('10. Failed reassignment preserves existing visit state without corrupting data', async () => {
    const beforeState = await FieldVisit.findById(testVisitId).lean();

    const badReq = await request(app)
      .patch(`/api/v1/admin/field-visits/${testVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        // Empty provider
        providerId: '',
        reason: '',
      });
    assert.equal(badReq.status, 400);

    const afterState = await FieldVisit.findById(testVisitId).lean();
    assert.equal(afterState.providerId.toString(), beforeState.providerId.toString());
    assert.equal(afterState.providerName, beforeState.providerName);
    assert.equal(afterState.status, beforeState.status);
    assert.equal(afterState.replacementRequired, beforeState.replacementRequired);
  });
});
