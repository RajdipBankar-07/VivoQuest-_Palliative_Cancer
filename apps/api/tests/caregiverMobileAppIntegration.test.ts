import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  User,
  PatientProfile,
  CaregiverPlan,
  CaregiverSubscription,
  FieldVisit,
} from '../src/models/index.js';
import {
  caregiverApi,
  setOnUnauthorizedListener,
  SessionExpiredError,
  ApiError,
  getMobileApiBaseUrl,
  setCustomMobileApiBaseUrl,
} from '../../mobile-caregiver/src/services/apiClient.js';
import { authStorage } from '../../mobile-caregiver/src/services/authStorage.js';

describe('Milestone 3.3: Caregiver Mobile App Backend Integration Verification', () => {
  let server: http.Server;
  let baseUrl: string;
  const app = createApp();

  // Test accounts
  const caregiverAPhone = '9876540001';
  let caregiverAId: string;
  let caregiverAToken: string;

  const caregiverBPhone = '9876540002';
  let caregiverBId: string;
  let caregiverBToken: string;

  const patientPhone = '9876540011';
  let patientId: string;

  let testPlanId: string;
  let testSubscriptionId: string;
  let testVisitAId: string;
  let testVisitANumber: string;

  before(async () => {
    await connectDatabase();

    // 1. Clean up test users and records
    const testPhones = [caregiverAPhone, caregiverBPhone, patientPhone];
    await User.deleteMany({ phone: { $in: testPhones } });
    await CaregiverSubscription.deleteMany({ subscriptionNumber: { $regex: 'TEST-M33-SUB' } });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-M33-VST' } });
    await CaregiverPlan.deleteMany({ planCode: 'TEST-M33-PALLIATIVE' });

    // 2. Register Caregiver A (Nurse Priya)
    const resCgA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sister Priya Sharma, RN',
        phone: caregiverAPhone,
        email: 'priya.sharma.m33@vivoquest.in',
        role: 'professional',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resCgA.status, 201);
    caregiverAId = resCgA.body.data.user.id;

    // 3. Register Caregiver B (Nurse Kavita - isolated identity)
    const resCgB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Nurse Kavita Shinde',
        phone: caregiverBPhone,
        email: 'kavita.shinde.m33@vivoquest.in',
        role: 'caregiver',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resCgB.status, 201);
    caregiverBId = resCgB.body.data.user.id;

    // 4. Register Patient
    const resPat = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Dinkar Patil',
        phone: patientPhone,
        email: 'dinkar.patil.m33@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPat.status, 201);
    patientId = resPat.body.data.user.id;

    await PatientProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(patientId) },
      {
        gender: 'male',
        address: {
          street: 'Rowhouse 4, Kalyani Nagar',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411006',
          cluster: 'Pune East',
        },
        emergencyContact: {
          name: 'Sunita Patil',
          relationship: 'Daughter',
          phone: '9822077999',
        },
        chronicConditions: ['Stage IV NSCLC', 'Hypertension'],
      },
      { new: true }
    );

    // 5. Seed Caregiver Plan
    const plan = await CaregiverPlan.create({
      planCode: 'TEST-M33-PALLIATIVE',
      title: 'Milestone 3.3 Bedside Nursing Care',
      planType: 'monthly_subscription',
      category: 'palliative',
      durationDays: 30,
      totalVisitsIncluded: 10,
      hoursPerVisit: 4,
      customerPrice: 16000,
      caregiverPayout: 11500,
      features: [
        'Vitals surveillance',
        'Pain analgesia review',
        'Wound dressing',
      ],
      description: 'Palliative nursing protocol',
      isActive: true,
      isPopular: false,
    });
    testPlanId = plan._id.toString();

    // 6. Seed Active Subscription assigned to Caregiver A
    const sub = await CaregiverSubscription.create({
      subscriptionNumber: 'TEST-M33-SUB-001',
      patientId: new mongoose.Types.ObjectId(patientId),
      patientName: 'Dinkar Patil',
      patientPhone: patientPhone,
      planId: plan._id,
      planTitle: plan.title,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-11-01'),
      totalVisitsIncluded: 10,
      visitsCompleted: 2,
      visitsRemaining: 8,
      status: 'active',
      assignedCaregiverId: new mongoose.Types.ObjectId(caregiverAId),
      assignedCaregiverName: 'Sister Priya Sharma, RN',
      assignedCaregiverPhone: caregiverAPhone,
      pricing: {
        customerPrice: 16000,
        caregiverPayout: 11500,
        platformCommission: 4500,
        paymentStatus: 'paid',
        paymentMethod: 'sandbox_upi',
      },
    });
    testSubscriptionId = sub._id.toString();

    // 7. Seed Assigned Field Visit for Caregiver A
    testVisitANumber = 'TEST-M33-VST-001';
    const visit = await FieldVisit.create({
      visitNumber: testVisitANumber,
      visitType: 'clinical_care',
      status: 'assigned',
      providerId: new mongoose.Types.ObjectId(caregiverAId),
      providerName: 'Sister Priya Sharma, RN',
      providerRole: 'Palliative Care Registered Nurse',
      providerPhone: caregiverAPhone,
      patientId: new mongoose.Types.ObjectId(patientId),
      patientDetails: {
        fullName: 'Dinkar Patil',
        phone: patientPhone,
        address: 'Rowhouse 4, Kalyani Nagar',
        city: 'Pune',
        pincode: '411006',
        cluster: 'Pune East',
        instructions: 'Ring bell on side gate.',
        emergencyContact: 'Sunita Patil - 9822077999',
      },
      scheduledDate: new Date().toISOString().slice(0, 10),
      timeSlot: '10:00 - 11:30',
      timestamps: {
        assignedAt: new Date(),
      },
      statusHistory: [
        {
          status: 'assigned',
          changedBy: new mongoose.Types.ObjectId(caregiverAId),
          changedByName: 'Dispatch',
          timestamp: new Date(),
          notes: 'Visit assigned',
        },
      ],
    });
    testVisitAId = visit._id.toString();

    // 8. Start ephemeral HTTP server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    const testPhones = [caregiverAPhone, caregiverBPhone, patientPhone];
    await User.deleteMany({ phone: { $in: testPhones } });
    await PatientProfile.deleteMany({ 'emergencyContact.phone': '9822077999' });
    await CaregiverSubscription.deleteMany({ subscriptionNumber: { $regex: 'TEST-M33-SUB' } });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-M33-VST' } });
    await CaregiverPlan.deleteMany({ planCode: 'TEST-M33-PALLIATIVE' });
    await authStorage.clearSession();
    await disconnectDatabase();
  });

  // =========================================================================
  // 1. CAREGIVER AUTHENTICATION & SECURE TOKEN MANAGEMENT
  // =========================================================================
  describe('1. Caregiver Authentication & Token Management', () => {
    it('authenticates clinician with valid mobile and password against Express API', async () => {
      const loginRes = await caregiverApi.login(caregiverAPhone, 'Password123!', undefined, baseUrl);

      assert.ok(loginRes.token, 'Must return JWT token');
      assert.strictEqual(typeof loginRes.token, 'string');
      assert.ok(loginRes.user, 'Must return user profile');
      assert.strictEqual(loginRes.user.fullName, 'Sister Priya Sharma, RN');
      assert.strictEqual(loginRes.user.phone, caregiverAPhone);
      assert.strictEqual(loginRes.user.role, 'professional');
      assert.strictEqual(loginRes.user.status, 'active');

      caregiverAToken = loginRes.token;

      // Verify token and user are securely persisted in authStorage
      const savedToken = await authStorage.getToken();
      assert.strictEqual(savedToken, loginRes.token);

      const savedUser = await authStorage.getUser();
      assert.deepStrictEqual(savedUser, loginRes.user);
    });

    it('rejects patient account attempting to log in to caregiver app', async () => {
      await assert.rejects(
        async () => {
          await caregiverApi.login(patientPhone, 'Password123!', undefined, baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.status, 403);
          assert.strictEqual(err.code, 'FORBIDDEN_ROLE');
          assert.match(err.message, /strictly for registered Caregivers/i);
          return true;
        }
      );
    });

    it('rejects invalid password with 401 ApiError without exposing secrets', async () => {
      await assert.rejects(
        async () => {
          await caregiverApi.login(caregiverAPhone, 'WrongPassword123!', undefined, baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.status, 401);
          assert.match(err.message, /invalid credentials/i);
          return true;
        }
      );
    });

    it('rejects unknown phone number with 401/404 ApiError', async () => {
      await assert.rejects(
        async () => {
          await caregiverApi.login('9999911111', 'Password123!', undefined, baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.ok(err.status === 404 || err.status === 401);
          return true;
        }
      );
    });

    it('restores existing caregiver session from secure storage', async () => {
      // Re-login Caregiver A to ensure storage is populated
      await caregiverApi.login(caregiverAPhone, 'Password123!', undefined, baseUrl);

      const token = await authStorage.getToken();
      const user = await authStorage.getUser();
      assert.ok(token);
      assert.ok(user);
      assert.strictEqual(user.id, caregiverAId);
    });

    it('clears secure storage and user profile on logout', async () => {
      await caregiverApi.logout();
      const token = await authStorage.getToken();
      const user = await authStorage.getUser();
      assert.strictEqual(token, null, 'Token must be wiped');
      assert.strictEqual(user, null, 'User profile must be wiped');
    });

    it('identifies storage type and explicitly distinguishes hardware vs fallback', async () => {
      const type = await authStorage.getStorageType();
      assert.ok(
        type === 'hardware_secure_store' || type === 'in_memory_transient_fallback',
        'Storage type must be valid known enum'
      );
    });

    it('dynamically resolves mobile API base URL and respects custom override', () => {
      const defaultUrl = getMobileApiBaseUrl();
      assert.ok(defaultUrl.startsWith('http://'), 'Base URL must start with http://');
      assert.ok(defaultUrl.includes('/api/v1'), 'Base URL must include /api/v1');

      setCustomMobileApiBaseUrl('http://10.151.164.41:4000/api/v1');
      assert.strictEqual(getMobileApiBaseUrl(), 'http://10.151.164.41:4000/api/v1');

      setCustomMobileApiBaseUrl(null);
    });
  });

  // =========================================================================
  // 2. ASSIGNED PATIENTS & FIELD VISITS RETRIEVAL
  // =========================================================================
  describe('2. Assigned Patients & Field Visits Retrieval', () => {
    before(async () => {
      // Authenticate Caregiver A
      await caregiverApi.login(caregiverAPhone, 'Password123!', undefined, baseUrl);
    });

    it('retrieves assigned field visits strictly for authenticated clinician', async () => {
      const visits = await caregiverApi.getAssignedVisits(undefined, baseUrl);

      assert.ok(Array.isArray(visits));
      assert.ok(visits.length >= 1, 'Should find seeded assigned visit');

      const visit = visits.find((v) => v.visitNumber === testVisitANumber);
      assert.ok(visit, 'Must include seeded visit TEST-M33-VST-001');
      assert.strictEqual(visit.status, 'assigned');
      assert.strictEqual(visit.patientDetails.fullName, 'Dinkar Patil');
      assert.strictEqual(visit.patientDetails.phone, patientPhone);
      assert.strictEqual(visit.patientDetails.city, 'Pune');
      assert.strictEqual(visit.timeSlot, '10:00 - 11:30');
    });

    it('retrieves single visit details by ID', async () => {
      const visit = await caregiverApi.getVisitById(testVisitAId, baseUrl);

      assert.ok(visit);
      assert.strictEqual(visit.id, testVisitAId);
      assert.strictEqual(visit.visitNumber, testVisitANumber);
      assert.strictEqual(visit.patientDetails.fullName, 'Dinkar Patil');
    });

    it('retrieves assigned patients queue with active subscription details', async () => {
      const patients = await caregiverApi.getAssignedPatients(false, baseUrl);

      assert.ok(Array.isArray(patients));
      assert.ok(patients.length >= 1, 'Must find assigned patient');

      const pat = patients.find((p) => p.patientId === patientId);
      assert.ok(pat, 'Must find Dinkar Patil in assigned patient cohort');
      assert.strictEqual(pat.fullName, 'Dinkar Patil');
      assert.strictEqual(pat.phone, patientPhone);
      assert.ok(pat.activeSubscription, 'Must include active subscription');
      assert.strictEqual(pat.activeSubscription?.subscriptionNumber, 'TEST-M33-SUB-001');
      assert.strictEqual(pat.activeSubscription?.visitsRemaining, 8);
      assert.strictEqual(pat.activeSubscription?.totalVisitsIncluded, 10);

      // Verify sensitive platform fees / contractor payouts are not leaked
      assert.strictEqual((pat.activeSubscription as any).caregiverPayout, undefined);
      assert.strictEqual((pat.activeSubscription as any).platformCommission, undefined);
    });
  });

  // =========================================================================
  // 3. VISIT LIFECYCLE PROGRESSION & CLINICAL DOCUMENTATION
  // =========================================================================
  describe('3. Field Visit Lifecycle Progression & Care Report Submission', () => {
    it('advances visit status through permitted state machine lifecycle', async () => {
      // 1. assigned -> accepted
      const vAccepted = await caregiverApi.updateVisitStatus(testVisitAId, 'accepted', undefined, baseUrl);
      assert.strictEqual(vAccepted.status, 'accepted');

      // 2. accepted -> en_route
      const vEnRoute = await caregiverApi.updateVisitStatus(testVisitAId, 'en_route', undefined, baseUrl);
      assert.strictEqual(vEnRoute.status, 'en_route');

      // 3. en_route -> arrived
      const vArrived = await caregiverApi.updateVisitStatus(testVisitAId, 'arrived', undefined, baseUrl);
      assert.strictEqual(vArrived.status, 'arrived');

      // 4. arrived -> in_progress
      const vInProgress = await caregiverApi.updateVisitStatus(testVisitAId, 'in_progress', undefined, baseUrl);
      assert.strictEqual(vInProgress.status, 'in_progress');
    });

    it('rejects invalid status jump violating state machine rules', async () => {
      // in_progress cannot jump back to assigned directly
      await assert.rejects(
        async () => {
          await caregiverApi.updateVisitStatus(testVisitAId, 'assigned', undefined, baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.status, 400);
          assert.match(err.message, /invalid field visit status transition/i);
          return true;
        }
      );
    });

    it('submits structured clinical documentation, vitals, and completes visit', async () => {
      const updatedVisit = await caregiverApi.recordClinicalDocumentation(
        testVisitAId,
        {
          vitals: {
            bloodPressure: '124/82',
            pulse: 76,
            spO2: 98,
            temperature: '98.6',
            bloodGlucose: 112,
            painScale: 2,
            respiratoryRate: 18,
          },
          clinicalNotes:
            'Patient alert and comfortable in bed. Lung sounds clear bilaterally. Stoma clean with no erythema. Family educated on hydration.',
          proceduresPerformed: [
            'Vitals Assessment (BP, Pulse, SpO2, Temp)',
            'Stoma inspection and cleansing',
            'Pain analgesia review',
          ],
          recommendations: 'Continue current analgesia schedule; encourage light mobilization.',
          markAsCompleted: true,
        },
        baseUrl
      );

      assert.strictEqual(updatedVisit.status, 'completed', 'Visit must transition to completed');
      assert.ok(updatedVisit.clinicalDocumentation, 'Must contain clinical documentation');
      assert.strictEqual(updatedVisit.clinicalDocumentation?.vitals?.bloodPressure, '124/82');
      assert.strictEqual(updatedVisit.clinicalDocumentation?.vitals?.pulse, 76);
      assert.strictEqual(updatedVisit.clinicalDocumentation?.vitals?.spO2, 98);
      assert.ok(updatedVisit.clinicalDocumentation?.proceduresPerformed?.includes('Stoma inspection and cleansing'));
      assert.match(updatedVisit.clinicalDocumentation?.clinicalNotes || '', /Patient alert and comfortable/);
    });

    it('reflects submitted caregiver report in patient care reports API', async () => {
      // Patient logs in to check their care report
      const resPatLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: patientPhone,
          password: 'Password123!',
          role: 'patient',
        });
      assert.strictEqual(resPatLogin.status, 200);
      const patToken = resPatLogin.body.data.token;

      // Patient fetches care reports
      const resReports = await request(app)
        .get('/api/v1/patients/me/care-reports')
        .set('Authorization', `Bearer ${patToken}`);

      assert.strictEqual(resReports.status, 200);
      const reports = resReports.body.data;
      assert.ok(Array.isArray(reports));

      const submittedReport = reports.find((r: any) => r.providerOrSubmitterName === 'Sister Priya Sharma, RN');
      assert.ok(submittedReport, 'Patient must receive the report submitted by Sister Priya');
      assert.strictEqual(submittedReport.vitals?.bloodPressure, '124/82');
      assert.strictEqual(submittedReport.vitals?.pulseRate, 76);
      assert.strictEqual(submittedReport.vitals?.oxygenSaturation, 98);
      assert.match(submittedReport.clinicalNotes, /Patient alert and comfortable/);
    });
  });

  // =========================================================================
  // 4. CROSS-CAREGIVER ACCESS DENIAL & PATIENT DATA ISOLATION
  // =========================================================================
  describe('4. Cross-Caregiver Access Denial & Data Isolation (DPDP Act)', () => {
    before(async () => {
      // Authenticate Caregiver B (Nurse Kavita)
      const loginB = await caregiverApi.login(caregiverBPhone, 'Password123!', undefined, baseUrl);
      caregiverBToken = loginB.token;
    });

    it('strictly isolates assigned visits: Caregiver B cannot see Caregiver A visits', async () => {
      const visitsB = await caregiverApi.getAssignedVisits(undefined, baseUrl);

      // Caregiver B has zero visits assigned; must receive empty array, not Caregiver A visits
      assert.ok(Array.isArray(visitsB));
      assert.strictEqual(visitsB.length, 0, 'Caregiver B must not see Caregiver A visits');
    });

    it('strictly isolates assigned patients: Caregiver B cannot see Caregiver A patients', async () => {
      const patientsB = await caregiverApi.getAssignedPatients(false, baseUrl);

      assert.ok(Array.isArray(patientsB));
      assert.strictEqual(patientsB.length, 0, 'Caregiver B must not see Caregiver A assigned patients');
    });

    it('forbids Caregiver B from fetching Caregiver A visit by ID (403 Forbidden)', async () => {
      await assert.rejects(
        async () => {
          await caregiverApi.getVisitById(testVisitAId, baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.status, 403);
          assert.match(err.message, /forbidden/i);
          return true;
        }
      );
    });

    it('forbids Caregiver B from modifying Caregiver A visit status (403 Forbidden)', async () => {
      await assert.rejects(
        async () => {
          await caregiverApi.updateVisitStatus(testVisitAId, 'en_route', undefined, baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.status, 403);
          assert.match(err.message, /forbidden/i);
          return true;
        }
      );
    });

    it('forbids Caregiver B from submitting clinical documentation on Caregiver A visit (403 Forbidden)', async () => {
      await assert.rejects(
        async () => {
          await caregiverApi.recordClinicalDocumentation(
            testVisitAId,
            {
              clinicalNotes: 'Tampering attempt by unassigned caregiver',
              markAsCompleted: false,
            },
            baseUrl
          );
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.status, 403);
          assert.match(err.message, /forbidden/i);
          return true;
        }
      );
    });
  });

  // =========================================================================
  // 5. RELIABLE ERROR HANDLING & NETWORK RESILIENCE
  // =========================================================================
  describe('5. Reliable Error Handling & Network Resilience', () => {
    it('triggers onUnauthorizedListener and clears storage on 401 response', async () => {
      let listenerCalled = false;
      setOnUnauthorizedListener(() => {
        listenerCalled = true;
      });

      // Set invalid token
      await authStorage.setToken('invalid.bogus.jwt');

      await assert.rejects(
        async () => {
          await caregiverApi.getAssignedVisits(undefined, baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof SessionExpiredError);
          return true;
        }
      );

      assert.strictEqual(listenerCalled, true, '401 interceptor must notify listeners');
      const clearedToken = await authStorage.getToken();
      assert.strictEqual(clearedToken, null, 'Storage must be wiped on unauthorized');

      setOnUnauthorizedListener(null);
    });

    it('reports NETWORK_DISCONNECTED ApiError on unreachable server endpoint', async () => {
      const offlineUrl = 'http://127.0.0.1:49999/api/v1';

      await assert.rejects(
        async () => {
          await caregiverApi.login(caregiverAPhone, 'Password123!', undefined, offlineUrl);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.code, 'NETWORK_DISCONNECTED');
          assert.strictEqual(err.status, 0);
          assert.match(err.message, /Unable to connect to VivoQuest server/);
          return true;
        }
      );
    });
  });
});
