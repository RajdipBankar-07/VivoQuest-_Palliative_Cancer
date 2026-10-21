import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { PatientProfile } from '../src/models/PatientProfile.js';
import { Appointment } from '../src/models/Appointment.js';
import { DailyHealthUpdate } from '../src/models/DailyHealthUpdate.js';
import { ClinicalNote } from '../src/models/ClinicalNote.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { seedDemoDoctorsIfEmpty } from '../src/services/doctorSchedulingService.js';

describe('Doctor Dashboard Upgrade & Patient Care Management Test Suite', () => {
  const app = createApp();

  // Test credentials
  const patientAPhone = '9876550001';
  let patientAToken: string;
  let patientAId: string;

  const patientBPhone = '9876550002';
  let patientBToken: string;
  let patientBId: string;

  // Doctor A: Dr. Aditi Rao (Seeded)
  const doctorAPhone = '9820011001';
  let doctorAToken: string;
  let doctorAId: string;

  // Doctor B: Dr. Sandeep Kulkarni (Seeded)
  const doctorBPhone = '9820011002';
  let doctorBToken: string;
  let doctorBId: string;

  let createdHealthUpdateId: string;

  before(async () => {
    await connectDatabase();

    // Clean test state
    await User.deleteMany({ phone: { $in: [patientAPhone, patientBPhone] } });
    await Appointment.deleteMany({ 'patientDetails.phone': { $in: [patientAPhone, patientBPhone] } });

    await seedDemoDoctorsIfEmpty();

    // Log in Doctor A
    const docALogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: doctorAPhone,
        password: 'Password#2026',
        role: 'professional',
      });
    assert.equal(docALogin.status, 200);
    doctorAToken = docALogin.body.data.token;
    doctorAId = docALogin.body.data.user.id;

    // Log in Doctor B
    const docBLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: doctorBPhone,
        password: 'Password#2026',
        role: 'professional',
      });
    assert.equal(docBLogin.status, 200);
    doctorBToken = docBLogin.body.data.token;
    doctorBId = docBLogin.body.data.user.id;

    // Register Patient A
    const pARes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Rameshwar Patil',
        phone: patientAPhone,
        email: 'rameshwar.patil@test.in',
        password: 'Password#2026',
        role: 'patient',
        city: 'Pune',
        pincode: '411001',
        consentAccepted: true,
      });
    assert.equal(pARes.status, 201);
    patientAToken = pARes.body.data.token;
    patientAId = pARes.body.data.user.id;

    // Add chronic condition to Patient A's profile
    await PatientProfile.findOneAndUpdate(
      { userId: patientAId },
      {
        $set: {
          chronicConditions: ['Stage IV Non-Small Cell Lung Cancer', 'Hypertension'],
          allergies: ['Penicillin', 'Sulfa drugs'],
          bloodGroup: 'B+',
          dateOfBirth: new Date('1965-04-12'),
        },
      }
    );

    // Register Patient B
    const pBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sunita Deshmukh',
        phone: patientBPhone,
        email: 'sunita.deshmukh@test.in',
        password: 'Password#2026',
        role: 'patient',
        city: 'Pune',
        pincode: '411038',
        consentAccepted: true,
      });
    assert.equal(pBRes.status, 201);
    patientBToken = pBRes.body.data.token;
    patientBId = pBRes.body.data.user.id;

    // Create appointment assigning Patient A to Doctor A
    const today = new Date();
    const futureDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
    const dateStr = futureDate.toISOString().split('T')[0];

    await Appointment.create({
      appointmentNumber: 'VQ-APT-TEST-001',
      patientId: new mongoose.Types.ObjectId(patientAId),
      doctorId: new mongoose.Types.ObjectId(doctorAId),
      appointmentDate: dateStr,
      timeSlot: { startTime: '11:00', endTime: '11:30' },
      consultationMode: 'in_clinic',
      status: 'confirmed',
      patientDetails: {
        fullName: 'Rameshwar Patil',
        phone: patientAPhone,
        age: 61,
        gender: 'male',
      },
      clinicalReason: 'Palliative symptom assessment & pain management',
      location: { city: 'Pune', clinicName: 'VivoQuest Comprehensive Care Clinic' },
      pricing: { amount: 900, currency: 'INR', paymentStatus: 'paid' },
      isSeededDemo: false,
    });

    // Create appointment assigning Patient B to Doctor B
    await Appointment.create({
      appointmentNumber: 'VQ-APT-TEST-002',
      patientId: new mongoose.Types.ObjectId(patientBId),
      doctorId: new mongoose.Types.ObjectId(doctorBId),
      appointmentDate: dateStr,
      timeSlot: { startTime: '14:00', endTime: '14:30' },
      consultationMode: 'video',
      status: 'confirmed',
      patientDetails: {
        fullName: 'Sunita Deshmukh',
        phone: patientBPhone,
        age: 55,
        gender: 'female',
      },
      clinicalReason: 'Supportive palliative consult',
      location: { city: 'Pune' },
      pricing: { amount: 500, currency: 'INR', paymentStatus: 'pending' },
      isSeededDemo: false,
    });
  });

  after(async () => {
    // Clean up created records
    await DailyHealthUpdate.deleteMany({ patientId: { $in: [patientAId, patientBId] } });
    await ClinicalNote.deleteMany({ patientId: { $in: [patientAId, patientBId] } });
    await Appointment.deleteMany({ 'patientDetails.phone': { $in: [patientAPhone, patientBPhone] } });
    await User.deleteMany({ phone: { $in: [patientAPhone, patientBPhone] } });
    await disconnectDatabase();
  });

  describe('1. Doctor Profile & Dashboard Metrics', () => {
    it('should return authenticated doctor profile with verified specialty', async () => {
      const res = await request(app)
        .get('/api/v1/doctors/me/profile')
        .set('Authorization', `Bearer ${doctorAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.fullName, 'Dr. Aditi Rao');
      assert.ok(res.body.data.specializations.includes('Palliative Oncology'));
    });

    it('should return doctor dashboard stats with assigned patients count', async () => {
      const res = await request(app)
        .get('/api/v1/doctors/me/stats')
        .set('Authorization', `Bearer ${doctorAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(typeof res.body.data.assignedPatientsCount === 'number');
      assert.ok(res.body.data.assignedPatientsCount >= 1);
    });
  });

  describe('2. My Assigned Patients & Server-Side Doctor-Patient Isolation', () => {
    it('should list Patient A in Doctor A assigned patients list', async () => {
      const res = await request(app)
        .get('/api/v1/doctors/me/patients')
        .set('Authorization', `Bearer ${doctorAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const patientA = res.body.data.find((p: any) => p.id === patientAId);
      assert.ok(patientA, 'Doctor A must see Patient A in assigned patients');
      assert.equal(patientA.fullName, 'Rameshwar Patil');
      assert.ok(patientA.patientNumber.startsWith('VQ-PT-'));
      assert.equal(patientA.primaryCondition, 'Stage IV Non-Small Cell Lung Cancer');
    });

    it('should strictly FORBID Doctor A from seeing Patient B in assigned list', async () => {
      const res = await request(app)
        .get('/api/v1/doctors/me/patients')
        .set('Authorization', `Bearer ${doctorAToken}`);

      assert.equal(res.status, 200);
      const patientB = res.body.data.find((p: any) => p.id === patientBId);
      assert.equal(patientB, undefined, 'Doctor A must NEVER see Doctor B patient Sunita Deshmukh');
    });

    it('should support search by patient name', async () => {
      const res = await request(app)
        .get('/api/v1/doctors/me/patients?search=Rameshwar')
        .set('Authorization', `Bearer ${doctorAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.count, 1);
      assert.equal(res.body.data[0].fullName, 'Rameshwar Patil');
    });

    it('should return empty array for search with no matches', async () => {
      const res = await request(app)
        .get('/api/v1/doctors/me/patients?search=NonExistentPatientXYZ')
        .set('Authorization', `Bearer ${doctorAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.count, 0);
      assert.equal(res.body.data.length, 0);
    });
  });

  describe('3. Patient Clinical Dossier & Strict RBAC Protection', () => {
    it('should allow assigned Doctor A to access Patient A 7-tab clinical dossier', async () => {
      const res = await request(app)
        .get(`/api/v1/doctors/me/patients/${patientAId}`)
        .set('Authorization', `Bearer ${doctorAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const dossier = res.body.data;

      // Verify Tab A: Overview
      assert.equal(dossier.overview.fullName, 'Rameshwar Patil');
      assert.equal(dossier.overview.bloodGroup, 'B+');
      assert.ok(dossier.overview.assignedDoctor);

      // Verify Tab B: Medical History
      assert.ok(dossier.medicalHistory.verified.diagnoses.includes('Stage IV Non-Small Cell Lung Cancer'));
      assert.ok(dossier.medicalHistory.verified.allergies.includes('Penicillin'));

      // Verify Tab C: Daily Updates array exists
      assert.ok(Array.isArray(dossier.dailyUpdates));

      // Verify Tab D: Clinical Notes array exists
      assert.ok(Array.isArray(dossier.clinicalNotes));

      // Verify Tab E: Appointments & Visits
      assert.ok(Array.isArray(dossier.appointmentsAndVisits.appointments));
      assert.equal(dossier.appointmentsAndVisits.appointments[0].appointmentNumber, 'VQ-APT-TEST-001');

      // Verify Tab F: Documents
      assert.ok(Array.isArray(dossier.documents));

      // Verify Tab G: Follow-up Plan
      assert.ok(dossier.followUpPlan);
    });

    it('CRITICAL RBAC: should STRICTLY FORBID Doctor B from accessing Patient A dossier (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/doctors/me/patients/${patientAId}`)
        .set('Authorization', `Bearer ${doctorBToken}`);

      assert.equal(res.status, 403, 'Unauthorized Doctor B must receive 403 Forbidden');
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('not an authorized provider'));
    });

    it('should create an AuditLog entry when patient dossier is accessed', async () => {
      const auditLog = await AuditLog.findOne({
        action: 'PATIENT_DOSSIER_ACCESSED',
        targetId: patientAId,
      });

      assert.ok(auditLog, 'Audit log entry must be created on sensitive dossier access');
      assert.equal(auditLog.actorRole, 'professional');
    });
  });

  describe('4. Daily Patient Updates Workflow & Explainable Risk Flags', () => {
    it('should allow patient to submit daily update with vitals & symptoms', async () => {
      const res = await request(app)
        .post('/api/v1/patients/health-updates')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          submitterName: 'Rameshwar Patil',
          relationship: 'patient',
          symptoms: ['Mild persistent cough', 'shortness of breath on exertion'],
          notes: 'Feeling slightly fatigued in the evening. Taking prescribed inhaler.',
          vitals: {
            bloodPressure: '135/85',
            pulse: 88,
            temperature: 98.4,
            spO2: 91, // Triggers moderate hypoxemia threshold (< 92%)
            glucose: 115,
            painScale: 4,
          },
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.isClinicallyVerified, false, 'Must be false for patient-reported data');
      assert.equal(res.body.data.reviewStatus, 'new');

      createdHealthUpdateId = res.body.data.id;

      // Verify explainable clinical risk indicator was attached based on SpO2 91%
      const riskFlags = res.body.data.riskIndicators;
      assert.ok(riskFlags.length > 0);
      assert.ok(riskFlags.some((f: any) => f.reason.includes('91%')));
    });

    it('should allow assigned Doctor A to see submitted update in review queue', async () => {
      const res = await request(app)
        .get('/api/v1/doctors/me/health-updates?status=new')
        .set('Authorization', `Bearer ${doctorAToken}`);

      assert.equal(res.status, 200);
      const match = res.body.data.find((u: any) => u.id === createdHealthUpdateId);
      assert.ok(match, 'Doctor A must see unreviewed update in queue');
      assert.equal(match.vitals.spO2, 91);
    });

    it('should FORBID Doctor B from seeing Patient A update in review queue', async () => {
      const res = await request(app)
        .get('/api/v1/doctors/me/health-updates?status=new')
        .set('Authorization', `Bearer ${doctorBToken}`);

      assert.equal(res.status, 200);
      const match = res.body.data.find((u: any) => u.id === createdHealthUpdateId);
      assert.equal(match, undefined, 'Doctor B must not see updates from Doctor A patient');
    });

    it('should allow Doctor A to review update and record clinician notes', async () => {
      const res = await request(app)
        .patch(`/api/v1/doctors/me/health-updates/${createdHealthUpdateId}/review`)
        .set('Authorization', `Bearer ${doctorAToken}`)
        .send({
          reviewStatus: 'reviewed',
          clinicianNotes: 'Advised incentive spirometry and titrated home oxygen concentrator to 2L/min.',
          followUpAction: 'Field nurse visit scheduled for vital signs check tomorrow.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.reviewStatus, 'reviewed');
      assert.equal(res.body.data.clinicianNotes, 'Advised incentive spirometry and titrated home oxygen concentrator to 2L/min.');
      assert.ok(res.body.data.reviewedAt);
    });
  });

  describe('5. Doctor Clinical Notes & Follow-up Management', () => {
    it('should allow Doctor A to record an authorized clinical note with follow-up date', async () => {
      const res = await request(app)
        .post(`/api/v1/doctors/me/patients/${patientAId}/clinical-notes`)
        .set('Authorization', `Bearer ${doctorAToken}`)
        .send({
          subjective: 'Patient reports mild dyspnea on ambulation. Pain well controlled on current regimen.',
          objective: 'Chest clear bilaterally on auscultation. SpO2 94% on 2L oxygen.',
          assessment: 'Stable palliative symptom management for advanced NSCLC.',
          plan: 'Continue Fentanyl transdermal patch 25 mcg. Monitor daily peak flows.',
          followUpInstructions: 'Report immediately if SpO2 drops below 90% or breakthrough pain increases.',
          followUpDate: '2026-11-15',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.doctorName, 'Dr. Aditi Rao');
      assert.equal(res.body.data.followUpDate, '2026-11-15');
    });

    it('should FORBID unauthorized Doctor B from recording clinical notes for Patient A', async () => {
      const res = await request(app)
        .post(`/api/v1/doctors/me/patients/${patientAId}/clinical-notes`)
        .set('Authorization', `Bearer ${doctorBToken}`)
        .send({
          assessment: 'Unauthorized attempt to record note',
          plan: 'Will be rejected',
        });

      assert.equal(res.status, 403);
    });

    it('should allow Doctor A to update follow-up target plan', async () => {
      const res = await request(app)
        .post(`/api/v1/doctors/me/patients/${patientAId}/follow-up`)
        .set('Authorization', `Bearer ${doctorAToken}`)
        .send({
          followUpDate: '2026-11-20',
          careTasks: ['Check SpO2 twice daily', 'Field nurse stoma dressing change', 'Symptom log check'],
          instructions: 'Ensure caregiver records daily temperature and oxygen saturation.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.followUpDate, '2026-11-20');
      assert.equal(res.body.data.careTasks.length, 3);
    });
  });
});
