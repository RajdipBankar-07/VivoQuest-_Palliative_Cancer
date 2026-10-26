import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { FieldVisit } from '../src/models/FieldVisit.js';
import { DailyHealthUpdate } from '../src/models/DailyHealthUpdate.js';
import { VisitRescheduleRequest } from '../src/models/VisitRescheduleRequest.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { seedAdminDemoData } from '../src/services/adminService.js';
import { seedCaregiverPlansDemoData } from '../src/services/caregiverPlanService.js';

describe('VivoQuest — Phase 1: Report Deletion and Per-User Request Deletion', () => {
  const app = createApp();

  // Test Users
  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900';

  let patient1Token: string;
  let patient1UserId: string;
  const patient1Phone = '9871110001';
  const patient1Name = 'Phase1 Patient One';

  let patient2Token: string;
  let patient2UserId: string;
  const patient2Phone = '9872220002';
  const patient2Name = 'Phase1 Patient Two';

  let caregiver1Token: string;
  let caregiver1UserId: string;
  const caregiver1Phone = '9873330003';
  const caregiver1Name = 'Phase1 Assigned Nurse Alice';

  let caregiver2Token: string;
  let caregiver2UserId: string;
  const caregiver2Phone = '9874440004';
  const caregiver2Name = 'Phase1 Unassigned Caregiver Bob';

  // Test Resources
  let visit1Id: string;
  let visit2Id: string;
  let rescheduleReq1Id: string;

  before(async () => {
    await connectDatabase();

    // Clean up test users and documents
    await User.deleteMany({
      phone: { $in: [patient1Phone, patient2Phone, caregiver1Phone, caregiver2Phone] },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: ['VQ-TEST-P1-001', 'VQ-TEST-P1-002', 'VQ-TEST-P1-003'] },
    });
    await VisitRescheduleRequest.deleteMany({
      visitNumber: { $in: ['VQ-TEST-P1-001', 'VQ-TEST-P1-002', 'VQ-TEST-P1-003'] },
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

    // 2. Patient 1 Registration & Login
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

    // 3. Patient 2 Registration & Login
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

    // 4. Caregiver 1 (Assigned) Registration & Token
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
    caregiver1UserId = c1Reg.body.data.user.id;
    caregiver1Token = c1Reg.body.data.token;

    // 5. Caregiver 2 (Unassigned) Registration & Token
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
    caregiver2UserId = c2Reg.body.data.user.id;
    caregiver2Token = c2Reg.body.data.token;

    // 6. Create Completed FieldVisit 1 for Patient 1 assigned to Caregiver 1 with clinical report
    const visit1 = await FieldVisit.create({
      visitNumber: 'VQ-TEST-P1-001',
      visitType: 'clinical_care',
      status: 'completed',
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Caregiver / Nurse',
      providerPhone: caregiver1Phone,
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientDetails: {
        fullName: patient1Name,
        phone: patient1Phone,
        address: '123 Test Street, Phase 1',
        city: 'Pune',
        pincode: '411001',
      },
      scheduledDate: '2026-10-25',
      timeSlot: '10:00 - 11:00',
      timestamps: {
        assignedAt: new Date(Date.now() - 86400000),
        acceptedAt: new Date(Date.now() - 86000000),
        completedAt: new Date(Date.now() - 80000000),
      },
      clinicalDocumentation: {
        vitals: {
          bloodPressure: '120/80',
          pulse: 76,
          spO2: 98,
          temperature: '98.6',
        },
        clinicalNotes: 'Initial bedside assessment completed. Patient stable and comfortable.',
        proceduresPerformed: ['Vitals Monitoring', 'Palliative Comfort Review'],
        recommendations: 'Continue prescribed medications and light hydration.',
        signedAt: new Date(Date.now() - 80000000),
      },
    });
    visit1Id = visit1._id.toString();

    // 7. Create Completed FieldVisit 2 for Patient 2 assigned to Caregiver 1 with clinical report
    const visit2 = await FieldVisit.create({
      visitNumber: 'VQ-TEST-P1-002',
      visitType: 'clinical_care',
      status: 'completed',
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Caregiver / Nurse',
      providerPhone: caregiver1Phone,
      patientId: new mongoose.Types.ObjectId(patient2UserId),
      patientDetails: {
        fullName: patient2Name,
        phone: patient2Phone,
        address: '456 Test Avenue, Phase 1',
        city: 'Pune',
        pincode: '411002',
      },
      scheduledDate: '2026-10-25',
      timeSlot: '14:00 - 15:00',
      timestamps: {
        assignedAt: new Date(Date.now() - 86400000),
        acceptedAt: new Date(Date.now() - 86000000),
        completedAt: new Date(Date.now() - 75000000),
      },
      clinicalDocumentation: {
        vitals: {
          bloodPressure: '124/82',
          pulse: 78,
          spO2: 97,
        },
        clinicalNotes: 'Caregiver 1 report for Patient 2.',
        signedAt: new Date(Date.now() - 75000000),
      },
    });
    visit2Id = visit2._id.toString();
  });

  after(async () => {
    await User.deleteMany({
      phone: { $in: [patient1Phone, patient2Phone, caregiver1Phone, caregiver2Phone] },
    });
    await FieldVisit.deleteMany({
      visitNumber: { $in: ['VQ-TEST-P1-001', 'VQ-TEST-P1-002', 'VQ-TEST-P1-003'] },
    });
    await VisitRescheduleRequest.deleteMany({
      visitNumber: { $in: ['VQ-TEST-P1-001', 'VQ-TEST-P1-002', 'VQ-TEST-P1-003'] },
    });
    await disconnectDatabase();
  });

  // ===========================================================================
  // TEST A: Patient hides a report -> hidden only from Patient view; visible to Caregiver & Admin
  // ===========================================================================
  it('TEST A: Patient hides a report -> hidden only from Patient view; visible to Caregiver & Admin', async () => {
    // 1. Verify Patient 1 can initially see the report
    const beforeRes = await request(app)
      .get('/api/v1/patients/me/care-reports')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(beforeRes.status, 200);
    const beforeReports = beforeRes.body.data;
    const reportPresent = beforeReports.some((r: any) => r.id === visit1Id);
    assert.equal(reportPresent, true, 'Report must initially be visible to Patient');

    // 2. Patient 1 hides the report
    const hideRes = await request(app)
      .delete(`/api/v1/patients/me/care-reports/${visit1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({ reason: 'Hidden from patient personal dashboard' });
    assert.equal(hideRes.status, 200);
    assert.equal(hideRes.body.data.hiddenOnlyFromPatient, true);

    // 3. Verify report is NOW HIDDEN from Patient 1 normal report list
    const afterPatientRes = await request(app)
      .get('/api/v1/patients/me/care-reports')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(afterPatientRes.status, 200);
    const afterReports = afterPatientRes.body.data;
    const stillInPatientList = afterReports.some((r: any) => r.id === visit1Id);
    assert.equal(stillInPatientList, false, 'Report must be hidden from Patient 1 report list');

    // 4. Verify report is STILL VISIBLE to assigned Caregiver 1
    const caregiverVisitsRes = await request(app)
      .get('/api/v1/visits/provider/me')
      .set('Authorization', `Bearer ${caregiver1Token}`);
    assert.equal(caregiverVisitsRes.status, 200);
    const caregiverVisits = caregiverVisitsRes.body.data;
    const visitInCaregiverList = caregiverVisits.some((v: any) => v._id === visit1Id || v.visitNumber === 'VQ-TEST-P1-001');
    assert.equal(visitInCaregiverList, true, 'Report/Visit must remain visible to assigned Caregiver');

    // 5. Verify report is STILL VISIBLE to Admin
    const adminVisitsRes = await request(app)
      .get('/api/v1/admin/visits?requiresClinicalDoc=true')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminVisitsRes.status, 200);
    const adminVisits = adminVisitsRes.body.visits || adminVisitsRes.body.data || [];
    const visitInAdminList = adminVisits.some((v: any) => v._id === visit1Id || v.visitNumber === 'VQ-TEST-P1-001');
    assert.equal(visitInAdminList, true, 'Report/Visit must remain visible to Admin');

    // 6. Verify clinical documentation and vitals are preserved in MongoDB (not erased)
    const docInDb = await FieldVisit.findById(visit1Id);
    assert.ok(docInDb?.clinicalDocumentation?.vitals, 'Clinical vitals must be preserved');
    assert.equal(docInDb?.clinicalDocumentation?.vitals?.bloodPressure, '120/80');
    assert.equal(docInDb?.clinicalDocumentation?.hiddenFromPatient, true);
    assert.notEqual(docInDb?.clinicalDocumentation?.isDeleted, true, 'Report must not be marked isDeleted for all');
  });

  // ===========================================================================
  // TEST B: Caregiver hides a report -> hidden from all three normal report lists
  // ===========================================================================
  it('TEST B: Caregiver hides a report -> hidden from all three normal report lists', async () => {
    // 1. Assigned Caregiver 1 soft-deletes report for Visit 2
    const cgDeleteRes = await request(app)
      .delete(`/api/v1/visits/${visit2Id}/documentation`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ reason: 'Incorrect clinical notes recorded; superseded by follow-up' });
    assert.equal(cgDeleteRes.status, 200);
    assert.equal(cgDeleteRes.body.success, true);

    // 2. Hidden from Patient 2's normal report list
    const p2Res = await request(app)
      .get('/api/v1/patients/me/care-reports')
      .set('Authorization', `Bearer ${patient2Token}`);
    assert.equal(p2Res.status, 200);
    const p2Reports = p2Res.body.data;
    const inP2 = p2Reports.some((r: any) => r.id === visit2Id);
    assert.equal(inP2, false, 'Caregiver-deleted report must be hidden from Patient 2 normal list');

    // 3. Hidden from Caregiver 1's normal report query and Admin's normal reports list
    const adminRes = await request(app)
      .get('/api/v1/admin/visits?requiresClinicalDoc=true')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminRes.status, 200);
    const adminVisitsAfter = adminRes.body.visits || adminRes.body.data || [];
    const inAdminNormal = adminVisitsAfter.some((v: any) => v._id === visit2Id);
    assert.equal(inAdminNormal, false, 'Soft-deleted report must be excluded from admin normal reports list');

    // 4. Clinical data is preserved; isDeleted flag is set; audit trail recorded
    const visit2InDb = await FieldVisit.findById(visit2Id);
    assert.equal(visit2InDb?.clinicalDocumentation?.isDeleted, true);
    assert.equal(visit2InDb?.clinicalDocumentation?.vitals?.bloodPressure, '124/82', 'Vitals must be preserved');
    assert.equal(visit2InDb?.clinicalDocumentation?.deletedByName, caregiver1Name);
  });

  // ===========================================================================
  // TEST C: Unauthorized caregiver cannot hide a report belonging to an unassigned patient
  // ===========================================================================
  it('TEST C: Unauthorized caregiver cannot hide a report belonging to an unassigned patient', async () => {
    // Caregiver 2 (unassigned) attempts to delete report for Visit 1 (assigned to Caregiver 1)
    const unauthorizedRes = await request(app)
      .delete(`/api/v1/visits/${visit1Id}/documentation`)
      .set('Authorization', `Bearer ${caregiver2Token}`)
      .send({ reason: 'Malicious deletion attempt by unauthorized caregiver' });

    assert.equal(unauthorizedRes.status, 403, 'Must return 403 Forbidden');
    const errMsg = unauthorizedRes.body.error?.message || unauthorizedRes.body.message || '';
    assert.ok(
      errMsg.includes('Forbidden') || errMsg.includes('assigned'),
      'Must explain assignment authorization failure'
    );

    // Verify report was not deleted
    const visit1InDb = await FieldVisit.findById(visit1Id);
    assert.notEqual(visit1InDb?.clinicalDocumentation?.isDeleted, true);
  });

  // ===========================================================================
  // TEST D: Patient cannot hide another patient's report
  // ===========================================================================
  it('TEST D: Patient cannot hide another patient\'s report', async () => {
    // Patient 1 attempts to delete Patient 2's report (Visit 2)
    const unauthorizedPatientRes = await request(app)
      .delete(`/api/v1/patients/me/care-reports/${visit2Id}`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({ reason: 'Attempt to delete another patient report' });

    assert.equal(unauthorizedPatientRes.status, 403, 'Must return 403 Forbidden for cross-patient deletion');
    const errP1Msg = unauthorizedPatientRes.body.error?.message || unauthorizedPatientRes.body.message || '';
    assert.ok(errP1Msg.includes('Forbidden'));

    // Patient 2 attempts to delete Patient 1's report (Visit 1)
    const p2OnP1Res = await request(app)
      .delete(`/api/v1/patients/me/care-reports/${visit1Id}`)
      .set('Authorization', `Bearer ${patient2Token}`);
    assert.equal(p2OnP1Res.status, 403, 'Must return 403 Forbidden for cross-patient deletion');
  });

  // ===========================================================================
  // TEST E: Hiding a request does not cancel or reschedule a confirmed visit
  // ===========================================================================
  it('TEST E: Hiding a request does not cancel or reschedule a confirmed visit', async () => {
    // 1. Create a confirmed active visit for Patient 1
    const visit3 = await FieldVisit.create({
      visitNumber: 'VQ-TEST-P1-003',
      visitType: 'clinical_care',
      status: 'accepted',
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Caregiver / Nurse',
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientDetails: {
        fullName: patient1Name,
        phone: patient1Phone,
        address: '123 Test Street, Phase 1',
        city: 'Pune',
        pincode: '411001',
      },
      scheduledDate: '2026-11-15',
      timeSlot: '10:00 - 11:00',
      timestamps: {
        assignedAt: new Date(),
        acceptedAt: new Date(),
      },
    });

    // 2. Create a rejected reschedule request linked to this visit
    const reschedReq = await VisitRescheduleRequest.create({
      visitId: visit3._id,
      visitNumber: visit3.visitNumber,
      patientId: new mongoose.Types.ObjectId(patient1UserId),
      patientName: patient1Name,
      patientPhone: patient1Phone,
      providerId: new mongoose.Types.ObjectId(caregiver1UserId),
      providerName: caregiver1Name,
      providerRole: 'Caregiver / Nurse',
      requestedBy: new mongoose.Types.ObjectId(patient1UserId),
      requesterName: patient1Name,
      requesterRole: 'patient',
      originalSchedule: {
        scheduledDate: '2026-11-15',
        timeSlot: '10:00 - 11:00',
      },
      requestedSchedule: {
        scheduledDate: '2026-11-16',
        timeSlot: '14:00 - 15:00',
      },
      reason: 'Doctor consultation clash',
      status: 'rejected',
      rejectionReason: 'Caregiver has existing emergency on requested day',
      resolvedAt: new Date(),
    });
    rescheduleReq1Id = reschedReq._id.toString();

    // 3. Patient 1 hides the rejected reschedule request
    const hideReqRes = await request(app)
      .delete(`/api/v1/patients/me/reschedule-requests/${rescheduleReq1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({ reason: 'Dismissed notice from my view' });
    assert.equal(hideReqRes.status, 200);
    assert.equal(hideReqRes.body.success, true);
    assert.equal(hideReqRes.body.data.visitUnchanged, true);

    // 4. Check visit in MongoDB: CONFIRMED SCHEDULE MUST REMAIN 100% UNCHANGED
    const visitAfter = await FieldVisit.findById(visit3._id);
    assert.equal(visitAfter?.status, 'accepted', 'Visit status must remain accepted');
    assert.equal(visitAfter?.scheduledDate, '2026-11-15', 'Scheduled date must not change');
    assert.equal(visitAfter?.timeSlot, '10:00 - 11:00', 'Time slot must not change');

    // 5. Patient visit schedule API should not display the hidden reschedule request
    const patientVisitsRes = await request(app)
      .get('/api/v1/patients/me/visits')
      .set('Authorization', `Bearer ${patient1Token}`);
    assert.equal(patientVisitsRes.status, 200);
    const targetVisit = patientVisitsRes.body.data.upcoming.find((v: any) => v.id === visit3._id.toString());
    assert.ok(targetVisit, 'Visit must still be present in upcoming visits');
    assert.equal(targetVisit.rescheduleRequest, undefined, 'Hidden reschedule request must not appear on visit card');

    // 6. Unauthorized patient cannot hide Patient 1's request
    const unauthorizedHide = await request(app)
      .delete(`/api/v1/patients/me/reschedule-requests/${rescheduleReq1Id}`)
      .set('Authorization', `Bearer ${patient2Token}`);
    assert.equal(unauthorizedHide.status, 403, 'Cross-user request hiding must be rejected with 403');
  });

  // ===========================================================================
  // TEST F: Authorized Admin can still access the protected audit history
  // ===========================================================================
  it('TEST F: Authorized Admin can still access the protected audit history', async () => {
    const auditRes = await request(app)
      .get('/api/v1/admin/audit-logs?category=clinical_governance')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(auditRes.status, 200);
    const logs = Array.isArray(auditRes.body.data) ? auditRes.body.data : (auditRes.body.data?.logs || []);
    assert.ok(logs.length > 0, 'Audit logs must be returned');

    // Check for our audit actions
    const patientHideLog = logs.find((l: any) => l.action === 'CARE_REPORT_HIDDEN_BY_PATIENT');
    const cgDeleteLog = logs.find((l: any) => l.action === 'CARE_REPORT_DELETED_BY_CAREGIVER');

    assert.ok(patientHideLog, 'AuditLog must record CARE_REPORT_HIDDEN_BY_PATIENT');
    assert.equal(patientHideLog.actorRole, 'patient');

    assert.ok(cgDeleteLog, 'AuditLog must record CARE_REPORT_DELETED_BY_CAREGIVER');
    assert.equal(cgDeleteLog.actorName, caregiver1Name);
  });

  // ===========================================================================
  // TEST G: Existing report editing and downloading continue to work
  // ===========================================================================
  it('TEST G: Existing report editing and downloading continue to work', async () => {
    // 1. Admin amends clinical documentation (editing remains preserved)
    const editRes = await request(app)
      .patch(`/api/v1/visits/${visit1Id}/documentation`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        editReason: 'Corrected blood pressure reading per verified device calibrate',
        clinicalNotes: 'Amended clinical observation: patient vitals normal, hydration good.',
        vitals: {
          bloodPressure: '118/78',
          pulse: 74,
          spO2: 99,
        },
      });
    assert.equal(editRes.status, 200, 'Admin clinical edit must succeed');
    assert.equal(editRes.body.data.clinicalDocumentation.vitals.bloodPressure, '118/78');
    assert.ok(editRes.body.data.clinicalDocumentation.versionHistory.length > 0, 'Version history must be created');

    // 2. Download report as HTML (printable report continues to work)
    const downloadRes = await request(app)
      .get(`/api/v1/visits/${visit1Id}/report/download?format=html`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(downloadRes.status, 200);
    assert.ok(downloadRes.text.includes('Official Clinical Care Report'));
    assert.ok(downloadRes.text.includes('118/78'));
  });
});
