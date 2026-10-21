import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { HospitalProfile } from '../src/models/HospitalProfile.js';
import { HospitalReferral } from '../src/models/HospitalReferral.js';
import { seedHospitalDemoData } from '../src/services/hospitalReferralService.js';

describe('Phase 6 — Hospital Dashboard and Referral Management Test Suite', () => {
  const app = createApp();

  // Test accounts
  let hospitalAToken: string;
  let hospitalAUserId: string;
  const hospitalAPhone = '9822011111'; // Ruby Hall Clinic Pune

  let hospitalBToken: string;
  let hospitalBUserId: string;
  const hospitalBPhone = '9822022222'; // Sahyadri Super Speciality Hospital

  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009988';

  let patientToken: string;
  const patientPhone = '9877112233';

  let createdReferralAId: string;
  let createdReferralBId: string;

  before(async () => {
    await connectDatabase();

    // Clean up test-specific accounts
    await User.deleteMany({
      $or: [
        { phone: { $in: [adminPhone, patientPhone] } },
        { email: 'ops.hospital.test@vivoquest.in' },
      ],
    });

    // Seed demo hospital profiles and referrals
    await seedHospitalDemoData();

    // 1. Hospital A Login
    const loginARes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: hospitalAPhone,
        otp: '123456',
        role: 'hospital',
      });
    assert.equal(loginARes.status, 200, 'Hospital A login should succeed');
    hospitalAToken = loginARes.body.data.token;
    hospitalAUserId = loginARes.body.data.user.id;

    // 2. Hospital B Login
    const loginBRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: hospitalBPhone,
        otp: '123456',
        role: 'hospital',
      });
    assert.equal(loginBRes.status, 200, 'Hospital B login should succeed');
    hospitalBToken = loginBRes.body.data.token;
    hospitalBUserId = loginBRes.body.data.user.id;

    // 3. Register Admin User
    const regAdminRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Operations Lead Sharma',
        phone: adminPhone,
        email: 'ops.hospital.test@vivoquest.in',
        role: 'admin',
        consentAccepted: true,
      });
    assert.equal(regAdminRes.status, 201, 'Hospital suite admin registration should succeed');
    adminToken = regAdminRes.body.data.token;
    adminUserId = regAdminRes.body.data.user.id;

    // 4. Register Standard Patient User
    const regPatientRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Test Patient Vijay',
        phone: patientPhone,
        role: 'patient',
        consentAccepted: true,
      });
    patientToken = regPatientRes.body.data.token;
  });

  after(async () => {
    await User.deleteMany({ phone: { $in: [adminPhone, patientPhone] } });
    await disconnectDatabase();
  });

  describe('Hospital Overview & Profile (GET /api/v1/hospitals/profile)', () => {
    it('should retrieve hospital organization profile for authenticated hospital user', async () => {
      const res = await request(app)
        .get('/api/v1/hospitals/profile')
        .set('Authorization', `Bearer ${hospitalAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.hospitalName.includes('Ruby Hall'));
      assert.equal(res.body.data.registrationNumber, 'MH-PUN-HOSP-1959-0012');
      assert.ok(Array.isArray(res.body.data.departments));
      assert.ok(res.body.data.departments.includes('Oncology & Palliative Care'));
      assert.ok(res.body.data.accreditations.includes('NABH'));
      assert.ok(res.body.data.dischargeCoordinator.name);
    });

    it('should allow hospital staff to update profile contact information', async () => {
      const res = await request(app)
        .put('/api/v1/hospitals/profile')
        .set('Authorization', `Bearer ${hospitalAToken}`)
        .send({
          contactPhone: '020-66455199',
          website: 'https://rubyhall.com/palliative',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.contactPhone, '020-66455199');
      assert.equal(res.body.data.website, 'https://rubyhall.com/palliative');
    });
  });

  describe('Referral Creation (POST /api/v1/hospitals/referrals)', () => {
    it('should successfully create discharge referral with services, equipment, and generate VQ-REF code', async () => {
      const payload = {
        referringStaff: {
          name: 'Dr. Cyrus Poonawalla',
          department: 'Oncology',
          designation: 'Attending Medical Oncologist',
          phone: '9822011113',
          email: 'c.poonawalla@rubyhall.com',
        },
        patientDetails: {
          fullName: 'Suresh Narang',
          phone: '9822114477',
          email: 'suresh.narang@test.com',
          age: 62,
          gender: 'male',
          ipdNumber: 'RH-IPD-99021',
          dischargeDate: new Date().toISOString().slice(0, 10),
          address: 'Flat 12, Gulmohar Enclave, Camp',
          city: 'Pune',
          pincode: '411001',
          cluster: 'Pune Central',
        },
        clinicalSummary: {
          primaryDiagnosis: 'Post-gastrectomy palliative care with continuous enteral feeds',
          secondaryConditions: ['Cachexia', 'Hypokalemia'],
          mobilityStatus: 'bedbound',
          palliativeCareNeeds: 'Jejunostomy feeding, daily skin care, pain titration',
          clinicalNotes: 'Discharged after partial gastrectomy. Requires daily skilled nurse and suction unit.',
        },
        requestedServices: [
          {
            serviceCode: 'NUR-01',
            serviceName: 'Skilled Nursing & Enteral Nutrition',
            frequency: 'daily',
            durationDays: 14,
            preferredStartDate: new Date().toISOString().slice(0, 10),
            preferredTimeSlot: 'morning',
            instructions: 'Inspect feeding jejunostomy tube site daily and measure aspiration volumes',
          },
        ],
        equipmentRequired: [
          {
            itemType: 'suction_machine',
            name: 'High Vacuum Electric Suction Unit',
            quantity: 1,
            urgency: 'urgent',
            durationWeeks: 2,
          },
          {
            itemType: 'air_mattress',
            name: 'Anti-Bedsore Alternating Pressure Air Mattress',
            quantity: 1,
            urgency: 'urgent',
            durationWeeks: 2,
          },
        ],
        priority: 'urgent',
      };

      const res = await request(app)
        .post('/api/v1/hospitals/referrals')
        .set('Authorization', `Bearer ${hospitalAToken}`)
        .send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.referralNumber.startsWith('VQ-REF-'));
      assert.equal(res.body.data.status, 'submitted');
      assert.equal(res.body.data.patientDetails.fullName, 'Suresh Narang');
      assert.equal(res.body.data.requestedServices.length, 1);
      assert.equal(res.body.data.equipmentRequired.length, 2);
      assert.equal(res.body.data.statusHistory.length, 1);
      assert.equal(res.body.data.statusHistory[0].status, 'submitted');

      createdReferralAId = res.body.data.id || res.body.data._id;
    });

    it('should create a referral for Hospital B as well to verify tenant separation', async () => {
      const payload = {
        referringStaff: {
          name: 'Dr. Sachin Joshi',
          department: 'Pulmonology',
          designation: 'Consultant Pulmonologist',
          phone: '9822022224',
        },
        patientDetails: {
          fullName: 'Kavita Shinde',
          phone: '9822998877',
          age: 55,
          gender: 'female',
          address: 'Plot 44, Mayur Colony, Kothrud',
          city: 'Pune',
          pincode: '411038',
        },
        clinicalSummary: {
          primaryDiagnosis: 'Interstitial Lung Disease with exertional hypoxia',
          mobilityStatus: 'assisted_walker',
        },
        requestedServices: [
          {
            serviceCode: 'PHYSIO-01',
            serviceName: 'Pulmonary Rehabilitation',
            preferredStartDate: new Date().toISOString().slice(0, 10),
          },
        ],
        equipmentRequired: [
          {
            itemType: 'oxygen_concentrator',
            name: '5 LPM Oxygen Concentrator',
            quantity: 1,
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/hospitals/referrals')
        .set('Authorization', `Bearer ${hospitalBToken}`)
        .send(payload);

      assert.equal(res.status, 201);
      createdReferralBId = res.body.data.id || res.body.data._id;
    });

    it('should reject referral creation with missing patient demographics with 400', async () => {
      const res = await request(app)
        .post('/api/v1/hospitals/referrals')
        .set('Authorization', `Bearer ${hospitalAToken}`)
        .send({
          referringStaff: { name: 'Nurse Sneha', department: 'Palliative' },
          patientDetails: { fullName: 'No Phone Patient' }, // Missing phone, address, pincode
          clinicalSummary: { primaryDiagnosis: 'General recovery' },
          requestedServices: [{ serviceCode: 'NUR-01', serviceName: 'Nursing', preferredStartDate: '2026-10-21' }],
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('patient demographics'));
    });

    it('should reject referral with empty services and empty equipment with 400', async () => {
      const res = await request(app)
        .post('/api/v1/hospitals/referrals')
        .set('Authorization', `Bearer ${hospitalAToken}`)
        .send({
          referringStaff: { name: 'Dr. Cyrus', department: 'Oncology', phone: '9822011113' },
          patientDetails: {
            fullName: 'Valid Name',
            phone: '9822110099',
            address: 'Pune Address',
            pincode: '411001',
          },
          clinicalSummary: { primaryDiagnosis: 'Cancer recovery' },
          requestedServices: [],
          equipmentRequired: [],
        });

      assert.equal(res.status, 400);
      assert.ok(res.body.error.message.includes('service or medical equipment'));
    });
  });

  describe('Security & Organization Isolation (Critical Guardrail)', () => {
    it('CRITICAL: should FORBID Hospital B from viewing Hospital A referral by changing ID (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/hospitals/referrals/${createdReferralAId}`)
        .set('Authorization', `Bearer ${hospitalBToken}`); // Hospital B attempting to read Hospital A referral!

      assert.equal(res.status, 403, 'Cross-hospital access must return 403 Forbidden');
      assert.equal(res.body.success, false);
      assert.ok(
        res.body.error.message.toLowerCase().includes('another hospital') ||
        res.body.error.message.toLowerCase().includes('forbidden')
      );
    });

    it('CRITICAL: should FORBID Hospital B from updating status of Hospital A referral (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/hospitals/referrals/${createdReferralAId}/status`)
        .set('Authorization', `Bearer ${hospitalBToken}`) // Hospital B attempting to modify Hospital A referral!
        .send({
          status: 'triaged',
        });

      assert.equal(res.status, 403, 'Cross-hospital status update must return 403 Forbidden');
    });

    it('should isolate referral listings: Hospital A user only sees Hospital A referrals', async () => {
      const resA = await request(app)
        .get('/api/v1/hospitals/referrals')
        .set('Authorization', `Bearer ${hospitalAToken}`);

      assert.equal(resA.status, 200);
      assert.ok(resA.body.data.length > 0);
      resA.body.data.forEach((ref: any) => {
        assert.equal(ref.hospitalId, hospitalAUserId, 'Referral in Hospital A list must belong to Hospital A');
      });

      // Confirm createdReferralBId is NOT in Hospital A list
      const hasB = resA.body.data.some((r: any) => r.id === createdReferralBId);
      assert.equal(hasB, false, 'Hospital A list must not contain Hospital B referral');
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/hospitals/referrals');
      assert.equal(res.status, 401);
    });

    it('should reject patient user from accessing hospital dashboard with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/hospitals/referrals')
        .set('Authorization', `Bearer ${patientToken}`);

      assert.equal(res.status, 403);
    });
  });

  describe('Referral Lifecycle & Human Approval Workflow', () => {
    it('should allow authorized operations staff to triage the referral (submitted -> triaged)', async () => {
      const res = await request(app)
        .patch(`/api/v1/hospitals/referrals/${createdReferralAId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'triaged',
          notes: 'Care coordinator verified discharge prescription and verified cluster radius.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'triaged');
      assert.equal(res.body.data.statusHistory.length, 2);
    });

    it('should reject invalid status jump (e.g. triaged -> completed) with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/hospitals/referrals/${createdReferralAId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'completed',
        });

      assert.equal(res.status, 400);
      assert.ok(res.body.error.message.includes('Invalid status transition'));
    });

    it('should evaluate care bundle and attach proposed bundle to referral', async () => {
      const res = await request(app)
        .post(`/api/v1/hospitals/referrals/${createdReferralAId}/evaluate-bundle`)
        .set('Authorization', `Bearer ${hospitalAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'bundle_proposed');
      assert.ok(res.body.data.proposedCareBundle);
      assert.ok(res.body.data.proposedCareBundle.bundleName);
      assert.ok(res.body.data.proposedCareBundle.totalEstimatedCost > 0);
      assert.equal(res.body.data.proposedCareBundle.bundleDiscountPercentage, 15);
    });

    it('should perform human-in-the-loop provider assignment (bundle_proposed -> approved)', async () => {
      const res = await request(app)
        .post(`/api/v1/hospitals/referrals/${createdReferralAId}/assign-providers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          providers: [
            {
              name: 'Sister Varsha Kulkarni, RN',
              role: 'Skilled Wound & Stoma Nurse',
              phone: '9822441122',
              serviceAssigned: 'Skilled Nursing & Enteral Nutrition',
            },
            {
              name: 'Technician Akash Shinde',
              role: 'DME Depot Specialist',
              phone: '9822441133',
              serviceAssigned: 'Equipment Delivery & Setup',
            },
          ],
          reviewNotes: 'Verified professional availability in Pune Central cluster.',
          approveImmediately: true,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'approved');
      assert.equal(res.body.data.assignedProviders.length, 2);
    });

    it('should allow clinician to record in-home visit documentation and vitals', async () => {
      const res = await request(app)
        .post(`/api/v1/hospitals/referrals/${createdReferralAId}/visits`)
        .set('Authorization', `Bearer ${hospitalAToken}`)
        .send({
          visitDate: new Date().toISOString().slice(0, 10),
          providerName: 'Sister Varsha Kulkarni, RN',
          providerRole: 'Skilled Wound & Stoma Nurse',
          vitals: {
            bloodPressure: '122/80 mmHg',
            pulse: 78,
            spO2: 99,
            temperature: '98.6 F',
            respiratoryRate: 16,
          },
          clinicalObservation: 'First post-discharge home visit. Stoma dressing replaced. Patient tolerating enteral feeding well.',
          proceduresPerformed: ['Wound dressing', 'Vitals check', 'Enteral tube flush'],
          medicationsAdministered: ['Potassium chloride oral solution'],
          nextFollowUpDate: 'Tomorrow at 10:00 AM',
          isFinalVisit: false,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'in_progress');
      assert.equal(res.body.data.visitSummaries.length, 1);
      assert.equal(res.body.data.visitSummaries[0].vitals.spO2, 99);
    });

    it('should complete referral workflow and record final discharge transition', async () => {
      const res = await request(app)
        .post(`/api/v1/hospitals/referrals/${createdReferralAId}/visits`)
        .set('Authorization', `Bearer ${hospitalAToken}`)
        .send({
          visitDate: new Date().toISOString().slice(0, 10),
          providerName: 'Sister Varsha Kulkarni, RN',
          providerRole: 'Skilled Wound & Stoma Nurse',
          clinicalObservation: 'Discharge care goals met. Caregiver competent in enteral tube feeding. Stoma healed cleanly.',
          proceduresPerformed: ['Final transition assessment'],
          isFinalVisit: true,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'completed');
    });

    it('should reject a referral with a mandatory reason if requested', async () => {
      // Create a throwaway referral
      const ref = await HospitalReferral.create({
        referralNumber: `VQ-REF-REJ-${Date.now()}`,
        hospitalId: new mongoose.Types.ObjectId(hospitalAToken ? hospitalAUserId : undefined),
        hospitalName: 'Ruby Hall Clinic',
        referringStaff: { name: 'Nurse Sneha', department: 'Oncology', designation: 'Nurse', phone: '9822011114' },
        patientDetails: {
          fullName: 'Anil Thorat',
          phone: '9822556677',
          age: 50,
          address: 'Baramati (50km outside Pune)',
          city: 'Baramati',
          pincode: '413102',
          cluster: 'Rural',
        },
        clinicalSummary: { primaryDiagnosis: 'General palliative care' },
        requestedServices: [{ serviceCode: 'NUR-01', serviceName: 'Nursing', preferredStartDate: '2026-10-21' }],
        status: 'submitted',
      });

      // Reject without reason should fail
      const failRes = await request(app)
        .patch(`/api/v1/hospitals/referrals/${ref._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
        });
      assert.equal(failRes.status, 400);

      // Reject with reason should succeed
      const okRes = await request(app)
        .patch(`/api/v1/hospitals/referrals/${ref._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
          reason: 'Address is outside active service cluster (>40km from nearest DME depot)',
        });
      assert.equal(okRes.status, 200);
      assert.equal(okRes.body.data.status, 'rejected');
      assert.equal(okRes.body.data.cancellationOrRejectionReason, 'Address is outside active service cluster (>40km from nearest DME depot)');
    });
  });

  describe('Operational Reports & Stored Data Analytics (GET /api/v1/hospitals/dashboard/stats)', () => {
    it('should aggregate operational metrics based on real database records', async () => {
      const res = await request(app)
        .get('/api/v1/hospitals/dashboard/stats')
        .set('Authorization', `Bearer ${hospitalAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const data = res.body.data;

      assert.ok(data.overview.totalReferrals >= 3, 'Should reflect at least 3 seeded + created referrals');
      assert.ok(typeof data.overview.activeInHomeCare === 'number');
      assert.ok(typeof data.overview.pendingTriage === 'number');
      assert.ok(data.overview.completedEpisodes >= 1, 'At least one completed referral exists');
      assert.ok(data.overview.totalEquipmentDeployed >= 0);
      assert.ok(data.statusBreakdown);
      assert.ok(data.departmentBreakdown);
      assert.ok(data.serviceTypeBreakdown);
    });
  });
});
