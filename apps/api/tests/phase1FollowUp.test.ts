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
import { seedAdminDemoData } from '../src/services/adminService.js';
import { seedCaregiverPlansDemoData } from '../src/services/caregiverPlanService.js';

describe('VivoQuest — Phase 1 Follow-up: Keys, Completed Visit Hiding, and Report Persistence', () => {
  const app = createApp();

  // Test Users
  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900';

  let patient1Token: string;
  let patient1UserId: string;
  const patient1Phone = '9875550001';
  const patient1Name = 'FollowUp Patient One';

  let patient2Token: string;
  let patient2UserId: string;
  const patient2Phone = '9876660002';
  const patient2Name = 'FollowUp Patient Two';

  let caregiver1Token: string;
  let caregiver1UserId: string;
  const caregiver1Phone = '9877770003';
  const caregiver1Name = 'FollowUp Nurse Catherine';

  let caregiver2Token: string;
  let caregiver2UserId: string;
  const caregiver2Phone = '9878880004';
  const caregiver2Name = 'FollowUp Nurse David';

  // Test Visits
  let completedVisitP1Id: string;
  let activeVisitP1Id: string;
  let completedVisitP2Id: string;
  let testRescheduleReqId: string;

  before(async () => {
    await connectDatabase();

    // Clean up test data
    await User.deleteMany({
      phone: { $in: [patient1Phone, patient2Phone, caregiver1Phone, caregiver2Phone] },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: ['VQ-TEST-FU-001', 'VQ-TEST-FU-002', 'VQ-TEST-FU-003', 'VQ-TEST-FU-004'] },
    });
    await VisitRescheduleRequest.deleteMany({
      visitNumber: { $in: ['VQ-TEST-FU-001', 'VQ-TEST-FU-002', 'VQ-TEST-FU-003', 'VQ-TEST-FU-004'] },
    });

    await seedAdminDemoData();
    await seedCaregiverPlansDemoData();

    // 1. Admin Login
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: adminPhone, otp: '123456', role: 'admin' });
    assert.equal(adminLoginRes.status, 200, 'Admin login failed');
    adminToken = adminLoginRes.body.data.token;
    adminUserId = adminLoginRes.body.data.user.id;

    // 2. Patient 1 Registration
    const p1Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: patient1Name,
        phone: patient1Phone,
        password: 'TestPass123!',
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
        password: 'TestPass123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(p2Reg.status, 201);
    patient2Token = p2Reg.body.data.token;
    patient2UserId = p2Reg.body.data.user.id;

    // 4. Caregiver 1 Registration
    const c1Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: caregiver1Name,
        phone: caregiver1Phone,
        password: 'TestPass123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(c1Reg.status, 201);
    caregiver1Token = c1Reg.body.data.token;
    caregiver1UserId = c1Reg.body.data.user.id;

    // 5. Caregiver 2 Registration
    const c2Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: caregiver2Name,
        phone: caregiver2Phone,
        password: 'TestPass123!',
        role: 'caregiver',
        consentAccepted: true,
      });
    assert.equal(c2Reg.status, 201);
    caregiver2Token = c2Reg.body.data.token;
    caregiver2UserId = c2Reg.body.data.user.id;

    // Create Test Visits directly in MongoDB
    // Visit 1: Completed visit for Patient 1, assigned to Caregiver 1
    const v1 = await FieldVisit.create({
      visitNumber: 'VQ-TEST-FU-001',
      visitType: 'clinical_care',
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientDetails: {
        fullName: patient1Name,
        phone: patient1Phone,
        address: 'Bandra West, Mumbai',
        city: 'Mumbai',
        pincode: '400050',
      },
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerPhone: caregiver1Phone,
      providerRole: 'caregiver',
      scheduledDate: '2026-10-20',
      timeSlot: '10:00 AM - 11:30 AM',
      status: 'completed',
      clinicalDocumentation: {
        vitals: {
          bloodPressure: '120/80',
          pulse: 72,
          spO2: 99,
          temperature: '98.6',
        },
        clinicalNotes: 'Initial checkup completed. Patient stable.',
        proceduresPerformed: ['Vitals Assessment (BP, Pulse, SpO2, Temp)'],
        signedAt: new Date(),
      },
      timestamps: {
        assignedAt: new Date(),
        completedAt: new Date(),
      },
    });
    completedVisitP1Id = v1._id.toString();

    // Visit 2: Active (in_progress) visit for Patient 1, assigned to Caregiver 1
    const v2 = await FieldVisit.create({
      visitNumber: 'VQ-TEST-FU-002',
      visitType: 'clinical_care',
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientDetails: {
        fullName: patient1Name,
        phone: patient1Phone,
        address: 'Bandra West, Mumbai',
        city: 'Mumbai',
        pincode: '400050',
      },
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerPhone: caregiver1Phone,
      providerRole: 'caregiver',
      scheduledDate: '2026-10-27',
      timeSlot: '02:00 PM - 03:30 PM',
      status: 'in_progress',
      timestamps: {
        assignedAt: new Date(),
        startedAt: new Date(),
      },
    });
    activeVisitP1Id = v2._id.toString();

    // Visit 3: Completed visit for Patient 2, assigned to Caregiver 2
    const v3 = await FieldVisit.create({
      visitNumber: 'VQ-TEST-FU-003',
      visitType: 'clinical_care',
      patientId: new mongoose.Types.ObjectId(patient2UserId),
      patientDetails: {
        fullName: patient2Name,
        phone: patient2Phone,
        address: 'Andheri East, Mumbai',
        city: 'Mumbai',
        pincode: '400069',
      },
      providerId: new mongoose.Types.ObjectId(caregiver2UserId),
      providerName: caregiver2Name,
      providerPhone: caregiver2Phone,
      providerRole: 'caregiver',
      scheduledDate: '2026-10-21',
      timeSlot: '11:00 AM - 12:30 PM',
      status: 'completed',
      clinicalDocumentation: {
        vitals: {
          bloodPressure: '130/85',
          pulse: 78,
          spO2: 97,
        },
        clinicalNotes: 'Palliative comfort assessment done.',
        signedAt: new Date(),
      },
      timestamps: {
        assignedAt: new Date(),
        completedAt: new Date(),
      },
    });
    completedVisitP2Id = v3._id.toString();

    // Create a Reschedule Request for Caregiver 1
    const reschedReq = await VisitRescheduleRequest.create({
      visitId: v2._id,
      visitNumber: v2.visitNumber,
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientName: patient1Name,
      patientPhone: patient1Phone,
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'caregiver',
      requestedBy: new mongoose.Types.ObjectId(patient1UserId),
      requesterName: patient1Name,
      requesterRole: 'patient',
      originalSchedule: {
        scheduledDate: '2026-10-27',
        timeSlot: '02:00 PM - 03:30 PM',
      },
      requestedSchedule: {
        scheduledDate: '2026-10-28',
        timeSlot: '10:00 AM - 11:30 AM',
      },
      reason: 'Patient doctor appointment conflict',
      status: 'pending',
    });
    testRescheduleReqId = reschedReq._id.toString();
  });

  after(async () => {
    await User.deleteMany({
      phone: { $in: [patient1Phone, patient2Phone, caregiver1Phone, caregiver2Phone] },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: ['VQ-TEST-FU-001', 'VQ-TEST-FU-002', 'VQ-TEST-FU-003', 'VQ-TEST-FU-004'] },
    });
    await VisitRescheduleRequest.deleteMany({
      visitNumber: { $in: ['VQ-TEST-FU-001', 'VQ-TEST-FU-002', 'VQ-TEST-FU-003', 'VQ-TEST-FU-004'] },
    });
    await disconnectDatabase();
  });

  // =========================================================================
  // ISSUE 1: Stable IDs in Reschedule Requests and Visits for Caregiver App
  // =========================================================================
  it('Issue 1: Caregiver pending reschedule requests and visits return stable unique IDs', async () => {
    // 1. Check pending reschedule requests endpoint
    const reschedRes = await request(app)
      .get('/api/v1/visits/reschedule-requests?status=pending')
      .set('Authorization', `Bearer ${caregiver1Token}`);
    assert.equal(reschedRes.status, 200);
    assert.ok(Array.isArray(reschedRes.body.data));
    const reqFound = reschedRes.body.data.find((r: any) => r.visitNumber === 'VQ-TEST-FU-002');
    assert.ok(reqFound, 'Reschedule request should be returned');
    assert.ok(reqFound._id || reqFound.id, 'Reschedule request must have stable unique id');

    // 2. Check caregiver visits endpoint
    const visitsRes = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${caregiver1Token}`);
    assert.equal(visitsRes.status, 200);
    assert.ok(Array.isArray(visitsRes.body.data));
    for (const v of visitsRes.body.data) {
      assert.ok(v._id || v.id, 'Every visit must have a stable unique ID');
    }
  });

  // =========================================================================
  // ISSUE 2: Patient Can Hide Completed Visits
  // =========================================================================
  it('Issue 2A: Patient can hide their own completed visit from normal history', async () => {
    // Check initial past visits schedule
    const initialSchedule = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(initialSchedule.status, 200);
    const pastBefore = initialSchedule.body.data.past || [];
    const foundBefore = pastBefore.find((v: any) => v.id === completedVisitP1Id || v._id === completedVisitP1Id);
    assert.ok(foundBefore, 'Completed visit must be in past visits before hiding');

    // Hide completed visit
    const hideRes = await request(app)
      .delete(`/api/v1/patients/me/visits/${completedVisitP1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({ reason: 'Patient removed from visit history' });
    assert.equal(hideRes.status, 200);
    assert.equal(hideRes.body.success, true);
    assert.ok(hideRes.body.data.hiddenFromPatient);

    // Verify hidden from patient's past schedule
    const updatedSchedule = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(updatedSchedule.status, 200);
    const pastAfter = updatedSchedule.body.data.past || [];
    const foundAfter = pastAfter.find((v: any) => v.id === completedVisitP1Id || v._id === completedVisitP1Id);
    assert.equal(foundAfter, undefined, 'Completed visit must no longer appear in patient past visits');

    // Verify visit still exists in database with status completed and documentation preserved
    const dbVisit = await FieldVisit.findById(completedVisitP1Id);
    assert.ok(dbVisit, 'Visit must remain persisted in DB');
    assert.equal(dbVisit.status, 'completed', 'Visit status must remain completed');
    assert.equal(dbVisit.hiddenFromPatient, true);
    assert.ok(dbVisit.clinicalDocumentation?.vitals, 'Clinical vitals must remain intact');
    assert.equal(dbVisit.clinicalDocumentation?.clinicalNotes, 'Initial checkup completed. Patient stable.');

    // Verify audit log was created
    const audit = await AuditLog.findOne({
      targetType: 'FieldVisit',
      action: 'FIELD_VISIT_HIDDEN_BY_PATIENT',
      'details.visitId': completedVisitP1Id,
    });
    assert.ok(audit, 'AuditLog entry must be recorded for patient hiding visit');
  });

  it('Issue 2B: Patient cannot hide another patient’s completed visit (403 Forbidden)', async () => {
    const unauthRes = await request(app)
      .delete(`/api/v1/patients/me/visits/${completedVisitP2Id}`)
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(unauthRes.status, 403, 'Should reject with 403 when patient tries to hide another patient visit');
  });

  it('Issue 2C: Patient cannot hide an active / in_progress visit (400 Bad Request)', async () => {
    const activeRes = await request(app)
      .delete(`/api/v1/patients/me/visits/${activeVisitP1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(activeRes.status, 400, 'Should reject with 400 when trying to hide an active/in-progress visit');
    assert.match(activeRes.body.error?.message || activeRes.body.message || '', /completed/i);
  });

  // =========================================================================
  // ISSUE 3: Caregiver/Nurse Can Hide Completed Visits
  // =========================================================================
  it('Issue 3A: Caregiver can hide their assigned completed visit from normal view', async () => {
    // Caregiver 2 hides completedVisitP2Id
    const hideRes = await request(app)
      .delete(`/api/v1/visits/${completedVisitP2Id}/hide`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send({ reason: 'Completed visit shift concluded' });
    assert.equal(hideRes.status, 200);
    assert.equal(hideRes.body.success, true);
    assert.equal(hideRes.body.data.hiddenFromCaregiver, true);

    // Verify hidden from Caregiver 2's visit list
    const visitsRes = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${caregiver2Token}`);
    assert.equal(visitsRes.status, 200);
    const foundVisit = visitsRes.body.data.find(
      (v: any) => v.id === completedVisitP2Id || v._id === completedVisitP2Id
    );
    assert.equal(foundVisit, undefined, 'Hidden visit must not appear in caregiver active/past list');

    // Verify visit remains persisted in DB with completion status intact
    const dbVisit = await FieldVisit.findById(completedVisitP2Id);
    assert.ok(dbVisit);
    assert.equal(dbVisit.status, 'completed');
    assert.equal(dbVisit.hiddenFromCaregiver, true);
    assert.ok(dbVisit.clinicalDocumentation?.signedAt);

    // Verify audit log entry
    const audit = await AuditLog.findOne({
      targetType: 'FieldVisit',
      action: 'FIELD_VISIT_HIDDEN_BY_CAREGIVER',
      'details.visitId': completedVisitP2Id,
    });
    assert.ok(audit, 'AuditLog must record provider hiding visit');
  });

  it('Issue 3B: Caregiver cannot hide an unassigned visit (403 Forbidden)', async () => {
    // Caregiver 1 attempts to hide Caregiver 2's visit
    const unauthRes = await request(app)
      .delete(`/api/v1/visits/${completedVisitP2Id}/hide`)
      .set('Authorization', `Bearer ${caregiver1Token}`);
    assert.equal(unauthRes.status, 403, 'Should reject with 403 when unassigned caregiver tries to hide visit');
  });

  it('Issue 3C: Caregiver cannot hide an active / in_progress visit (400 Bad Request)', async () => {
    // Caregiver 1 attempts to hide activeVisitP1Id
    const activeRes = await request(app)
      .delete(`/api/v1/visits/${activeVisitP1Id}/hide`)
      .set('Authorization', `Bearer ${caregiver1Token}`);
    assert.equal(activeRes.status, 400, 'Should reject with 400 for non-completed visit');
    assert.match(activeRes.body.error?.message || activeRes.body.message || '', /completed/i);
  });

  // =========================================================================
  // ISSUE 4: Submitted Reports Persistence Across Caregiver Re-login
  // =========================================================================
  it('Issue 4: Submitted reports persist and are retrievable by authorized caregiver across re-login', async () => {
    // 1. Caregiver 1 submits documentation on activeVisitP1Id
    const submitRes = await request(app)
      .post(`/api/v1/visits/${activeVisitP1Id}/documentation`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({
        vitals: {
          bloodPressure: '125/82',
          pulse: 76,
          spO2: 98,
          temperature: '98.4',
          bloodGlucose: 105,
          painScale: 2,
          respiratoryRate: 18,
        },
        clinicalNotes: 'Follow-up vitals recorded bedside. Patient comfortable and pain well managed.',
        proceduresPerformed: [
          'Vitals Assessment (BP, Pulse, SpO2, Temp)',
          'Oral Medication Administration',
        ],
        recommendations: 'Continue current analgesia regimen.',
        markAsCompleted: true,
      });
    assert.equal(submitRes.status, 200, 'Documentation recording failed');
    assert.equal(submitRes.body.data.status, 'completed');
    assert.ok(submitRes.body.data.clinicalDocumentation?.signedAt);

    // Verify persisted directly in MongoDB
    const persisted = await FieldVisit.findById(activeVisitP1Id);
    assert.ok(persisted);
    assert.equal(persisted.status, 'completed');
    assert.equal(persisted.clinicalDocumentation?.vitals?.bloodPressure, '125/82');
    assert.equal(persisted.clinicalDocumentation?.vitals?.pulse, 76);
    assert.equal(persisted.clinicalDocumentation?.vitals?.spO2, 98);
    assert.equal(persisted.clinicalDocumentation?.proceduresPerformed?.length, 2);

    // 2. Simulate Logout and Re-login: Caregiver 1 signs in again to obtain a fresh token
    const reloginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: caregiver1Phone,
        password: 'TestPass123!',
        role: 'caregiver',
      });
    assert.equal(reloginRes.status, 200, 'Re-login failed');
    const freshCaregiverToken = reloginRes.body.data.token;
    assert.ok(freshCaregiverToken);

    // 3. Fetch visits using fresh session
    const freshVisitsRes = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${freshCaregiverToken}`);
    assert.equal(freshVisitsRes.status, 200);
    const retrievedVisit = freshVisitsRes.body.data.find(
      (v: any) => v.id === activeVisitP1Id || v._id === activeVisitP1Id
    );
    assert.ok(retrievedVisit, 'Submitted report visit must be present after re-login');
    assert.equal(retrievedVisit.status, 'completed');
    assert.ok(retrievedVisit.clinicalDocumentation, 'Clinical documentation must be attached');
    assert.equal(retrievedVisit.clinicalDocumentation.vitals.bloodPressure, '125/82');
    assert.equal(
      retrievedVisit.clinicalDocumentation.clinicalNotes,
      'Follow-up vitals recorded bedside. Patient comfortable and pain well managed.'
    );

    // 4. Verify Phase 1 rule: Even if patient hides report, caregiver still sees it
    const patientHideReport = await request(app)
      .delete(`/api/v1/patients/me/care-reports/${activeVisitP1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(patientHideReport.status, 200);

    // Caregiver still sees the report
    const checkAfterPatientHide = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${freshCaregiverToken}`);
    const stillPresentForCaregiver = checkAfterPatientHide.body.data.find(
      (v: any) => v.id === activeVisitP1Id || v._id === activeVisitP1Id
    );
    assert.ok(stillPresentForCaregiver, 'Patient hiding report must NOT hide it from authorized caregiver');
    assert.ok(stillPresentForCaregiver.clinicalDocumentation);

    // 5. Verify Caregiver-deleted report is excluded from normal report list
    const caregiverHideReport = await request(app)
      .delete(`/api/v1/visits/${activeVisitP1Id}/documentation`)
      .set('Authorization', `Bearer ${freshCaregiverToken}`)
      .send({ reason: 'Caregiver removed report' });
    assert.equal(caregiverHideReport.status, 200);

    const checkAfterCaregiverDelete = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${freshCaregiverToken}`);
    const foundDoc = checkAfterCaregiverDelete.body.data.find(
      (v: any) => v.id === activeVisitP1Id || v._id === activeVisitP1Id
    );
    // Either the documentation is stripped or marked hiddenFromCaregiver
    if (foundDoc && foundDoc.clinicalDocumentation) {
      assert.equal(foundDoc.clinicalDocumentation.hiddenFromCaregiver, true);
    }

    // 6. Report download functions for authorized non-deleted report
    const downloadRes = await request(app)
      .get(`/api/v1/visits/${completedVisitP1Id}/report/download?format=html`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(downloadRes.status, 200);
    assert.ok(downloadRes.text.includes('Official Clinical Care Report'));

    // And caregiver-deleted report returns 410
    const deletedDownloadRes = await request(app)
      .get(`/api/v1/visits/${activeVisitP1Id}/report/download`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(deletedDownloadRes.status, 410);
  });
});
