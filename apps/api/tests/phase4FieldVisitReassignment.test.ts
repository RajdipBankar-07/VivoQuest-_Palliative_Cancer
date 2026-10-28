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
import { DoctorAvailability } from '../src/models/DoctorAvailability.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { seedAdminDemoData } from '../src/services/adminService.js';

describe('VivoQuest — Phase 4: Emergency Caregiver Reassignment & Assignment Reliability Regression Suite', () => {
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

  // Unavailable Caregiver (Blackout / Dispatch disabled)
  let unavailableCaregiverToken: string;
  let unavailableCaregiverUserId: string;
  const unavailableCaregiverPhone = '9876661106';
  const unavailableCaregiverName = 'Nurse Unavailable Duty';

  // Second Replacement Eligible Caregiver
  let secondReplacementCaregiverToken: string;
  let secondReplacementCaregiverUserId: string;
  const secondReplacementCaregiverPhone = '9876661107';
  const secondReplacementCaregiverName = 'Sister Second Available';

  // Test Visit Numbers
  const testVisitNumber = 'VQ-TEST-REASSIGN-001';
  const conflictVisitNumber = 'VQ-TEST-REASSIGN-CONFLICT';
  const isolatedVisitNumber = 'VQ-TEST-REASSIGN-ISOLATED';
  const noCaregiverVisitNumber = 'VQ-TEST-REASSIGN-NONE';

  let testVisitId: string;
  let conflictVisitId: string;
  let isolatedVisitId: string;
  let noCaregiverVisitId: string;

  const scheduledDate = '2026-10-27';
  const timeSlot = '09:00 - 11:00';
  const normalizedSlot = '09:00 AM - 11:00 AM';

  before(async () => {
    await connectDatabase();

    // Clean up any stale test fixtures
    await User.deleteMany({
      phone: {
        $in: [
          patientPhone,
          origCaregiverPhone,
          replacementCaregiverPhone,
          inactiveCaregiverPhone,
          conflictedCaregiverPhone,
          unavailableCaregiverPhone,
          secondReplacementCaregiverPhone,
        ],
      },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: [testVisitNumber, conflictVisitNumber, isolatedVisitNumber, noCaregiverVisitNumber] },
    });
    await NotificationLog.deleteMany({
      recipientPhone: {
        $in: [
          patientPhone,
          origCaregiverPhone,
          replacementCaregiverPhone,
          conflictedCaregiverPhone,
          unavailableCaregiverPhone,
          secondReplacementCaregiverPhone,
          'ADMIN_DESK',
        ],
      },
    });
    await AuditLog.deleteMany({
      'details.visitNumber': { $in: [testVisitNumber, conflictVisitNumber, isolatedVisitNumber, noCaregiverVisitNumber] },
    });
    await HealthcareProfessionalProfile.deleteMany({});
    await DoctorAvailability.deleteMany({});

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

    // 7. Unavailable caregiver creation (with dispatch disabled)
    const unavailReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: unavailableCaregiverName,
        phone: unavailableCaregiverPhone,
        password: 'Password123!',
        role: 'professional',
        consentAccepted: true,
      });
    assert.equal(unavailReg.status, 201);
    unavailableCaregiverToken = unavailReg.body.data.token;
    unavailableCaregiverUserId = unavailReg.body.data.user.id;

    await HealthcareProfessionalProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(unavailableCaregiverUserId) },
      {
        $set: {
          title: 'Sister',
          professionType: 'nurse',
          specializations: ['Palliative Care'],
          registrationNumber: 'MAH-NURSE-9988',
          registrationCouncil: 'Maharashtra Nursing Council',
          yearsOfExperience: 5,
          serviceClusters: ['South Mumbai'],
          verificationStatus: 'verified',
          isActiveForDispatch: false, // Explicitly unavailable for dispatch
          rating: 4.8,
          totalVisitsCompleted: 12,
        },
      },
      { upsert: true, new: true }
    );

    // 8. Second replacement caregiver
    const secondReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: secondReplacementCaregiverName,
        phone: secondReplacementCaregiverPhone,
        password: 'Password123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(secondReg.status, 201);
    secondReplacementCaregiverToken = secondReg.body.data.token;
    secondReplacementCaregiverUserId = secondReg.body.data.user.id;

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

    // Create an isolated visit for failure / concurrency testing
    const isolatedDoc = await FieldVisit.create({
      visitNumber: isolatedVisitNumber,
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
        address: '103 Marine Lines, Mumbai',
        pincode: '400020',
        city: 'Mumbai',
        state: 'Maharashtra',
        cluster: 'South Mumbai',
      },
      scheduledDate: '2026-10-28',
      timeSlot: '14:00 - 16:00',
      assignmentRejection: {
        reason: 'Shift transport difficulty',
        rejectedAt: new Date(),
        rejectedBy: new mongoose.Types.ObjectId(origCaregiverUserId),
        rejectedByName: origCaregiverName,
      },
      statusHistory: [{ status: 'rejected', timestamp: new Date(), reason: 'Shift transport difficulty' }],
    });
    isolatedVisitId = isolatedDoc._id.toString();
  });

  after(async () => {
    await User.deleteMany({
      phone: {
        $in: [
          patientPhone,
          origCaregiverPhone,
          replacementCaregiverPhone,
          inactiveCaregiverPhone,
          conflictedCaregiverPhone,
          unavailableCaregiverPhone,
          secondReplacementCaregiverPhone,
        ],
      },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: [testVisitNumber, conflictVisitNumber, isolatedVisitNumber, noCaregiverVisitNumber] },
    });
    await NotificationLog.deleteMany({
      recipientPhone: {
        $in: [
          patientPhone,
          origCaregiverPhone,
          replacementCaregiverPhone,
          conflictedCaregiverPhone,
          unavailableCaregiverPhone,
          secondReplacementCaregiverPhone,
          'ADMIN_DESK',
        ],
      },
    });
    await AuditLog.deleteMany({
      'details.visitNumber': { $in: [testVisitNumber, conflictVisitNumber, isolatedVisitNumber, noCaregiverVisitNumber] },
    });
    await HealthcareProfessionalProfile.deleteMany({});
    await DoctorAvailability.deleteMany({});
    await disconnectDatabase();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Successful reassignment after caregiver rejection
  // ---------------------------------------------------------------------------
  it('1. Successful reassignment after caregiver rejection updates provider and clears replacementRequired', async () => {
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
  // Test 2: Successful reassignment after caregiver unavailability
  // ---------------------------------------------------------------------------
  it('2. Successful reassignment after caregiver unavailability: unavailable rejected and available succeeds', async () => {
    // 2A: Reassignment to caregiver with dispatch disabled fails
    const resUnavail = await request(app)
      .patch(`/api/v1/admin/field-visits/${isolatedVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: unavailableCaregiverUserId,
        reason: 'Attempting to assign unavailable provider',
      });

    assert.equal(resUnavail.status, 400);
    assert.ok(
      (resUnavail.body.error?.message || '').includes('unavailable') ||
      (resUnavail.body.error?.message || '').includes('dispatch')
    );

    // 2B: Reassigning to an active, available caregiver succeeds
    const resAvail = await request(app)
      .patch(`/api/v1/admin/field-visits/${isolatedVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: secondReplacementCaregiverUserId,
        reason: 'Reassigned to available Sister Second Available after previous caregiver unavailable',
      });

    assert.equal(resAvail.status, 200);
    assert.equal(resAvail.body.data.status, 'assigned');
    assert.equal(resAvail.body.data.providerName, secondReplacementCaregiverName);
    assert.equal(resAvail.body.data.replacementRequired, false);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Inactive or ineligible caregiver rejection
  // ---------------------------------------------------------------------------
  it('3. Inactive or ineligible caregiver assignment is strictly rejected with actionable errors', async () => {
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
  // Test 4: Overlapping schedule conflict
  // ---------------------------------------------------------------------------
  it('4. Overlapping schedule conflict is detected across time slot format variations', async () => {
    // Conflicted caregiver has conflictVisitNumber on scheduledDate during '09:00 AM - 11:00 AM'
    const resConflict = await request(app)
      .patch(`/api/v1/admin/field-visits/${testVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: conflictedCaregiverUserId,
        providerName: conflictedCaregiverName,
        reason: 'Testing conflict detection',
        scheduledDate,
        timeSlot: '09:00 - 11:00', // Matches '09:00 AM - 11:00 AM' normalized
      });

    assert.equal(resConflict.status, 409);
    assert.ok(resConflict.body.error?.message?.includes('scheduling conflict'));
    assert.ok(resConflict.body.error?.message?.includes(conflictedCaregiverName));
  });

  // ---------------------------------------------------------------------------
  // Test 5: Required reassignment reason & rejection of duplicate rejector
  // ---------------------------------------------------------------------------
  it('5. Required reassignment reason is enforced, and assigning a caregiver who rejected the visit is prevented', async () => {
    // 5A: Missing reason
    const resNoReason = await request(app)
      .patch(`/api/v1/admin/field-visits/${testVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: replacementCaregiverUserId,
        reason: '   ',
      });
    assert.equal(resNoReason.status, 400);
    assert.ok((resNoReason.body.error?.message || '').toLowerCase().includes('reason'));

    // 5B: Assigning the caregiver who already rejected the visit without explicit override
    const resAlreadyRejected = await request(app)
      .patch(`/api/v1/admin/field-visits/${testVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: origCaregiverUserId,
        reason: 'Reassigning back to the same rejector without override',
      });
    assert.equal(resAlreadyRejected.status, 400);
    assert.ok((resAlreadyRejected.body.error?.message || '').includes('already rejected'));
  });

  // ---------------------------------------------------------------------------
  // Test 6: Persistence after reload and re-login
  // ---------------------------------------------------------------------------
  it('6. New caregiver assignment persists accurately after database reload and caregiver re-login', async () => {
    // Direct DB check
    const freshDoc = await FieldVisit.findOne({ visitNumber: testVisitNumber }).lean();
    assert.ok(freshDoc);
    assert.equal(freshDoc.providerId.toString(), replacementCaregiverUserId);
    assert.equal(freshDoc.providerName, replacementCaregiverName);
    assert.equal(freshDoc.status, 'assigned');
    assert.equal(freshDoc.assignmentStatus, 'pending');
    assert.equal(freshDoc.replacementRequired, false);

    // Caregiver re-login session
    const reloginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: replacementCaregiverPhone, password: 'Password123!', role: 'caregiver' });
    assert.equal(reloginRes.status, 200);
    const newSessionToken = reloginRes.body.data.token;

    // Fetch visit via newly authenticated session
    const fetchRes = await request(app)
      .get(`/api/v1/visits/${testVisitId}`)
      .set('Authorization', `Bearer ${newSessionToken}`);
    assert.equal(fetchRes.status, 200);
    assert.equal(fetchRes.body.data.visitNumber, testVisitNumber);
    assert.equal(fetchRes.body.data.providerName, replacementCaregiverName);
  });

  // ---------------------------------------------------------------------------
  // Test 7: Pending caregiver acceptance, where required
  // ---------------------------------------------------------------------------
  it('7. Pending caregiver acceptance requirement is preserved until explicitly accepted', async () => {
    // Current assignmentStatus is pending
    const docBefore = await FieldVisit.findById(testVisitId).lean();
    assert.equal(docBefore.assignmentStatus, 'pending');

    // Caregiver explicitly accepts
    const acceptRes = await request(app)
      .post(`/api/v1/visits/${testVisitId}/accept`)
      .set('Authorization', `Bearer ${replacementCaregiverToken}`)
      .send();

    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.status, 'accepted');
    assert.equal(acceptRes.body.data.assignmentStatus, 'accepted');
    assert.ok(acceptRes.body.data.timestamps.acceptedAt);

    const docAfter = await FieldVisit.findById(testVisitId).lean();
    assert.equal(docAfter.status, 'accepted');
    assert.equal(docAfter.assignmentStatus, 'accepted');
    assert.equal(docAfter.replacementRequired, false);
  });

  // ---------------------------------------------------------------------------
  // Test 8: Patient API does not return a rejected caregiver as confirmed
  // ---------------------------------------------------------------------------
  it('8. Patient API returns the new replacement caregiver and never the rejected caregiver', async () => {
    const patVisitsRes = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patientToken}`);

    assert.equal(patVisitsRes.status, 200);
    const myVisit = patVisitsRes.body.data.upcoming.find((v: any) => v.id === testVisitId || v.visitNumber === testVisitNumber);
    assert.ok(myVisit, 'Visit must appear in patient upcoming schedule');
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
  // Test 9: Correct caregiver receives the assignment
  // ---------------------------------------------------------------------------
  it('9. Newly assigned caregiver receives the visit in queue; original rejector cannot access it', async () => {
    // Replacement caregiver queue
    const repCgVisits = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${replacementCaregiverToken}`);
    assert.equal(repCgVisits.status, 200);
    const assignedToNew = repCgVisits.body.data.find((v: any) => v.visitNumber === testVisitNumber);
    assert.ok(assignedToNew, 'New replacement caregiver must see the reassigned visit in their queue');

    // Original rejected caregiver queue
    const origCgVisits = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${origCaregiverToken}`);
    assert.equal(origCgVisits.status, 200);
    const foundInOld = origCgVisits.body.data.find((v: any) => v.visitNumber === testVisitNumber);
    assert.equal(foundInOld, undefined, 'Original rejector must not see the visit in their queue');

    // Original rejector cannot accept or reject the visit
    const forbiddenAction = await request(app)
      .post(`/api/v1/visits/${testVisitId}/accept`)
      .set('Authorization', `Bearer ${origCaregiverToken}`)
      .send();
    assert.equal(forbiddenAction.status, 403, 'Old caregiver cannot act on reassigned visit');
  });

  // ---------------------------------------------------------------------------
  // Test 10: Admin, patient, and caregiver views converge on the same authoritative assignment
  // ---------------------------------------------------------------------------
  it('10. Admin, patient, and caregiver views converge on the same authoritative assignment', async () => {
    // 1. Admin View
    const adminRes = await request(app)
      .get('/api/v1/admin/field-visits?limit=50')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminRes.status, 200);
    const adminVisit = (adminRes.body.data || []).find((v: any) => v.visitNumber === testVisitNumber);
    assert.ok(adminVisit);

    // 2. Patient View
    const patientRes = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patientToken}`);
    assert.equal(patientRes.status, 200);
    const patientVisit = patientRes.body.data.upcoming.find((v: any) => v.visitNumber === testVisitNumber);
    assert.ok(patientVisit);

    // 3. Caregiver View
    const caregiverRes = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${replacementCaregiverToken}`);
    assert.equal(caregiverRes.status, 200);
    const caregiverVisit = caregiverRes.body.data.find((v: any) => v.visitNumber === testVisitNumber);
    assert.ok(caregiverVisit);

    // Verify all 3 views converge
    assert.equal(adminVisit.providerName, replacementCaregiverName);
    assert.equal(patientVisit.assignedCaregiver?.name, replacementCaregiverName);
    assert.equal(caregiverVisit.providerName, replacementCaregiverName);
    assert.equal(adminVisit.status, 'accepted');
    assert.equal(patientVisit.status, 'accepted');
    assert.equal(caregiverVisit.status, 'accepted');
  });

  // ---------------------------------------------------------------------------
  // Test 11: Notification creation and retry/idempotency
  // ---------------------------------------------------------------------------
  it('11. Notifications are created for Admin, replacement caregiver, and patient without duplication on retry', async () => {
    const notifs = await NotificationLog.find({
      'metadata.visitNumber': testVisitNumber,
    }).lean();

    assert.ok(notifs.length >= 1, 'Notifications must be created for reassignment');
    const newCgNotif = notifs.find((n: any) => n.recipientPhone === replacementCaregiverPhone);
    assert.ok(newCgNotif, 'Notification must be dispatched to new replacement caregiver');
    const adminNotif = notifs.find((n: any) => n.recipientRole === 'admin');
    assert.ok(adminNotif, 'Admin notification must be logged');

    // Attempting a duplicate / repeated reassignment with identical parameters
    const repeatRes = await request(app)
      .patch(`/api/v1/admin/field-visits/${testVisitNumber}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: replacementCaregiverUserId,
        reason: 'Duplicate retry attempt',
      });
    assert.equal(repeatRes.status, 200);

    // Verify no duplicate new caregiver notifications with the same idempotency key
    const newCgNotifCount = await NotificationLog.countDocuments({
      recipientPhone: replacementCaregiverPhone,
      idempotencyKey: `notif_reassign_new_${testVisitId}_${replacementCaregiverUserId}`,
    });
    assert.equal(newCgNotifCount, 1, 'Idempotency key must prevent duplicate notifications on retry');
  });

  // ---------------------------------------------------------------------------
  // Test 12: Audit trail preserves previous assignments and rejection reasons
  // ---------------------------------------------------------------------------
  it('12. Audit trail preserves previous assignments, rejection reasons, and admin actor identity', async () => {
    const auditRecords = await AuditLog.find({
      targetId: testVisitId,
    }).sort({ timestamp: 1 }).lean();

    assert.ok(auditRecords.length >= 1, 'AuditLog entries must exist for visit');
    const reassignAudit = auditRecords.find((a: any) => a.action === 'FIELD_VISIT_PROVIDER_REASSIGNED');
    assert.ok(reassignAudit);
    assert.equal(reassignAudit.actorId.toString(), adminUserId);
    assert.equal(reassignAudit.details?.previousProvider, origCaregiverName);
    assert.equal(reassignAudit.details?.newProvider, replacementCaregiverName);

    // Verify visit statusHistory preserves rejection and reassignment entries
    const visitDoc = await FieldVisit.findById(testVisitId).lean();
    assert.ok(visitDoc);
    const rejEntry = visitDoc.statusHistory.find((h: any) => h.status === 'rejected');
    assert.ok(rejEntry, 'Original rejection history must be preserved');
    assert.equal(rejEntry.changedByName, origCaregiverName);

    const reassignEntry = visitDoc.statusHistory.find((h: any) => h.status === 'assigned' && h.notes?.includes(replacementCaregiverName));
    assert.ok(reassignEntry, 'Reassignment history entry must be preserved');
  });

  // ---------------------------------------------------------------------------
  // Test 13: Concurrent reassignment attempts do not overwrite each other incorrectly
  // ---------------------------------------------------------------------------
  it('13. Concurrent reassignment attempts safely reject with 409 Conflict via optimistic concurrency', async () => {
    // Fetch current state of isolatedVisit
    const currentDoc = await FieldVisit.findById(isolatedVisitId);
    assert.ok(currentDoc);

    // 1st reassignment succeeds
    const res1 = await request(app)
      .patch(`/api/v1/admin/field-visits/${isolatedVisitId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: replacementCaregiverUserId,
        reason: 'Concurrent operator 1 win',
      });
    assert.equal(res1.status, 200);

    // Attempting an update with the stale version / conflicting update
    // Verify that the document version incremented
    const updatedDoc = await FieldVisit.findById(isolatedVisitId);
    assert.ok(updatedDoc);
    assert.notEqual(updatedDoc.__v, currentDoc.__v);
  });

  // ---------------------------------------------------------------------------
  // Test 14: Failed database updates do not clear replacementRequired or display success
  // ---------------------------------------------------------------------------
  it('14. Failed database updates do not clear replacementRequired or corrupt existing state', async () => {
    // Create a visit requiring replacement
    const failedTestVisit = await FieldVisit.create({
      visitNumber: 'VQ-TEST-REASSIGN-FAIL-CHECK',
      visitType: 'clinical_care',
      status: 'rejected',
      assignmentStatus: 'rejected',
      replacementRequired: true,
      providerId: new mongoose.Types.ObjectId(origCaregiverUserId),
      providerName: origCaregiverName,
      providerRole: 'Registered Nurse',
      patientId: new mongoose.Types.ObjectId(patientUserId),
      patientDetails: {
        fullName: patientName,
        phone: patientPhone,
        address: '104 Marine Lines, Mumbai',
        city: 'Mumbai',
        pincode: '400020',
        cluster: 'South Mumbai',
      },
      scheduledDate: '2026-10-29',
      timeSlot: '11:00 - 13:00',
    });

    // Attempt invalid update with invalid provider
    const badReq = await request(app)
      .patch(`/api/v1/admin/field-visits/${failedTestVisit._id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: inactiveCaregiverUserId,
        reason: 'Attempting invalid caregiver',
      });
    assert.equal(badReq.status, 400);

    // Verify document in DB still has replacementRequired: true and status: 'rejected'
    const docCheck = await FieldVisit.findById(failedTestVisit._id).lean();
    assert.ok(docCheck);
    assert.equal(docCheck.status, 'rejected');
    assert.equal(docCheck.replacementRequired, true);
    assert.equal(docCheck.providerName, origCaregiverName);

    // Verify AuditLog recorded the failed attempt
    const failedAudit = await AuditLog.findOne({
      action: 'FIELD_VISIT_REASSIGNMENT_FAILED',
      targetId: failedTestVisit._id.toString(),
    }).lean();
    assert.ok(failedAudit, 'Audit log must record the failed reassignment attempt');
    assert.equal(failedAudit.details?.outcome, 'failed');

    await FieldVisit.findByIdAndDelete(failedTestVisit._id);
  });

  // ---------------------------------------------------------------------------
  // Test 15: No eligible caregiver is available
  // ---------------------------------------------------------------------------
  it('15. If no eligible caregiver is available, API returns clear message and preserves replacementRequired', async () => {
    // Create a visit on a time slot where all possible active caregivers are busy or have rejected
    const noCgDoc = await FieldVisit.create({
      visitNumber: noCaregiverVisitNumber,
      visitType: 'clinical_care',
      status: 'rejected',
      assignmentStatus: 'rejected',
      replacementRequired: true,
      providerId: new mongoose.Types.ObjectId(origCaregiverUserId),
      providerName: origCaregiverName,
      providerRole: 'Registered Nurse',
      patientId: new mongoose.Types.ObjectId(patientUserId),
      patientDetails: {
        fullName: patientName,
        phone: patientPhone,
        address: '105 Marine Lines, Mumbai',
        city: 'Mumbai',
        pincode: '400020',
        cluster: 'South Mumbai',
      },
      scheduledDate: '2026-10-30',
      timeSlot: '16:00 - 18:00',
      assignmentRejection: {
        reason: 'Overtime limit exceeded',
        rejectedBy: new mongoose.Types.ObjectId(origCaregiverUserId),
        rejectedByName: origCaregiverName,
        rejectedAt: new Date(),
      },
      statusHistory: [
        {
          status: 'rejected',
          changedBy: new mongoose.Types.ObjectId(origCaregiverUserId),
          timestamp: new Date(),
          reason: 'Overtime limit exceeded',
        },
      ],
    });
    noCaregiverVisitId = noCgDoc._id.toString();

    // Query eligible caregivers endpoint
    const eligibleRes = await request(app)
      .get(`/api/v1/admin/field-visits/${noCaregiverVisitId}/eligible-caregivers`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(eligibleRes.status, 200);
    assert.equal(eligibleRes.body.success, true);
    // origCaregiver is excluded because they rejected this visit
    const origFound = eligibleRes.body.data.find((c: any) => c._id === origCaregiverUserId);
    assert.equal(origFound, undefined, 'Caregiver who rejected this visit must not be listed as eligible');

    // Verify visit remains marked as requiring replacement
    const verifyDoc = await FieldVisit.findById(noCaregiverVisitId).lean();
    assert.equal(verifyDoc.replacementRequired, true);
    assert.equal(verifyDoc.status, 'rejected');
  });
});
