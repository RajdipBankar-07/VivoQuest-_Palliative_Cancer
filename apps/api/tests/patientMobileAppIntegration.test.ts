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
  DailyHealthUpdate,
} from '../src/models/index.js';
import {
  patientApi,
  setOnUnauthorizedListener,
  SessionExpiredError,
  ApiError,
  getMobileApiBaseUrl,
  setCustomMobileApiBaseUrl,
} from '../../mobile-patient/src/services/apiClient';
import { authStorage } from '../../mobile-patient/src/services/authStorage';

describe('Milestone 3.2: Patient Mobile App Integration & Client Service Verification', () => {
  let server: http.Server;
  let baseUrl: string;
  const app = createApp();

  // Test accounts
  const patientAPhone = '9876530001';
  let patientAId: string;
  let patientAToken: string;

  const patientBPhone = '9876530002';
  let patientBId: string;

  const patientEmptyPhone = '9876530003';
  let patientEmptyId: string;

  const caregiverPhone = '9876530011';
  let caregiverId: string;

  let testPlanId: string;
  let testSubscriptionId: string;
  let testVisitId: string;

  before(async () => {
    await connectDatabase();

    // 1. Clean up test users and records
    const testPhones = [
      patientAPhone,
      patientBPhone,
      patientEmptyPhone,
      caregiverPhone,
      '9876530099',
      '9876530098',
      '9876530088',
    ];
    await User.deleteMany({ phone: { $in: testPhones } });
    await CaregiverSubscription.deleteMany({ subscriptionNumber: { $regex: 'TEST-M32-SUB' } });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-M32-VST' } });
    await DailyHealthUpdate.deleteMany({ 'submittedBy.name': { $regex: 'Milestone 3.2' } });

    // 2. Register Caregiver via Auth Register API
    const resCaregiver = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Nurse Priya Sharma',
        phone: caregiverPhone,
        email: 'priya.sharma.m32@vivoquest.in',
        role: 'professional',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resCaregiver.status, 201);
    caregiverId = resCaregiver.body.data.user.id;

    // 3. Register Patient A via Auth Register API
    const resPatA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Anand Kulkarni',
        phone: patientAPhone,
        email: 'anand.kulkarni.m32@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatA.status, 201);
    patientAId = resPatA.body.data.user.id;

    await PatientProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(patientAId) },
      {
        gender: 'male',
        address: {
          street: 'Flat 402, Sunshine Towers, Dadar West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400028',
        },
        emergencyContact: {
          name: 'Sunita Kulkarni',
          relationship: 'Wife',
          phone: '9820044552',
        },
      },
      { new: true }
    );

    // 4. Register Patient B (isolated identity)
    const resPatB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Meenakshi Iyer',
        phone: patientBPhone,
        email: 'meenakshi.iyer.m32@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatB.status, 201);
    patientBId = resPatB.body.data.user.id;

    // 5. Register Patient Empty (no subscriptions, no visits)
    const resPatEmpty = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Rajesh Empty',
        phone: patientEmptyPhone,
        email: 'rajesh.empty.m32@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatEmpty.status, 201);
    patientEmptyId = resPatEmpty.body.data.user.id;

    // 6. Seed active Caregiver Plan
    let plan = await CaregiverPlan.findOne({ planCode: 'TEST-M32-COMPREHENSIVE' });
    if (!plan) {
      plan = await CaregiverPlan.create({
        planCode: 'TEST-M32-COMPREHENSIVE',
        title: 'Milestone 3.2 Comprehensive Oncology Nursing Care',
        planType: 'monthly_subscription',
        category: 'palliative',
        durationDays: 30,
        totalVisitsIncluded: 12,
        hoursPerVisit: 4,
        customerPrice: 18500,
        caregiverPayout: 13000,
        features: [
          'Bi-weekly registered nurse visits',
          'Clinical vitals monitoring (BP, SpO2, Pulse)',
          'Pain management and palliative medication administration',
          '24/7 emergency nursing triage line',
        ],
        description: 'Dedicated palliative clinical support for homebound cancer patients.',
        isActive: true,
        isPopular: true,
      });
    }
    testPlanId = plan._id.toString();

    // 7. Seed Active Subscription for Patient A
    const sub = await CaregiverSubscription.create({
      subscriptionNumber: 'TEST-M32-SUB-001',
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientName: 'Anand Kulkarni',
      patientPhone: patientAPhone,
      planId: plan._id,
      planTitle: plan.title,
      startDate: new Date('2026-10-15'),
      endDate: new Date('2026-11-15'),
      totalVisitsIncluded: 12,
      visitsCompleted: 3,
      visitsRemaining: 9,
      status: 'active',
      assignedCaregiverId: new mongoose.Types.ObjectId(caregiverId),
      assignedCaregiverName: 'Nurse Priya Sharma',
      assignedCaregiverPhone: caregiverPhone,
      pricing: {
        customerPrice: 18500,
        caregiverPayout: 13000,
        platformCommission: 5500,
        paymentStatus: 'paid',
        paymentMethod: 'sandbox_upi',
      },
      carePlanNotes: 'Patient requires gentle vitals assessment and pain scale tracking.',
    });
    testSubscriptionId = sub._id.toString();

    // 8. Seed Bedside Field Visit with Vitals for Patient A
    const visit = await FieldVisit.create({
      visitNumber: 'TEST-M32-VST-001',
      visitType: 'clinical_care',
      status: 'completed',
      providerId: new mongoose.Types.ObjectId(caregiverId),
      providerName: 'Nurse Priya Sharma',
      providerRole: 'Palliative Registered Nurse',
      providerPhone: caregiverPhone,
      patientId: new mongoose.Types.ObjectId(patientAId),
      patientDetails: {
        fullName: 'Anand Kulkarni',
        phone: patientAPhone,
        address: 'Flat 402, Sunshine Towers, Dadar West',
        city: 'Mumbai',
        pincode: '400028',
        cluster: 'Mumbai South',
      },
      scheduledDate: new Date().toISOString().slice(0, 10),
      timeSlot: '10:00 - 11:30',
      timestamps: {
        assignedAt: new Date(Date.now() - 7200000),
        acceptedAt: new Date(Date.now() - 5400000),
        enRouteAt: new Date(Date.now() - 3600000),
        arrivedAt: new Date(Date.now() - 2700000),
        startedAt: new Date(Date.now() - 2400000),
        completedAt: new Date(Date.now() - 600000),
      },
      clinicalDocumentation: {
        vitals: {
          bloodPressure: '122/82',
          pulse: 74,
          spO2: 98,
          temperature: '98.4',
          respiratoryRate: 18,
        },
        proceduresPerformed: ['Catheter site cleansing', 'Oral analgesia review', 'SpO2 check'],
        clinicalNotes: 'Mild lower back pain managed with prescribed analgesics. Patient alert and stable.',
        recommendations: 'Encourage hydration, light mobilization, and rest.',
      },
    });
    testVisitId = visit._id.toString();

    // 9. Start live HTTP server on ephemeral port for real client-service execution
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
    // Clean up test records
    const testPhones = [
      patientAPhone,
      patientBPhone,
      patientEmptyPhone,
      caregiverPhone,
      '9876530099',
      '9876530098',
      '9876530088',
    ];
    await User.deleteMany({ phone: { $in: testPhones } });
    await PatientProfile.deleteMany({ 'emergencyContact.phone': '9820044552' });
    await CaregiverSubscription.deleteMany({ subscriptionNumber: { $regex: 'TEST-M32-SUB' } });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-M32-VST' } });
    await DailyHealthUpdate.deleteMany({ 'submittedBy.name': { $regex: 'Milestone 3.2' } });
    await CaregiverPlan.deleteMany({ planCode: 'TEST-M32-COMPREHENSIVE' });
    await authStorage.clearSession();
    await disconnectDatabase();
  });

  // =========================================================================
  // 1. REAL AUTHENTICATION & SECURE STORAGE
  // =========================================================================
  describe('1. Real Authentication Flow & Secure Token Management', () => {
    it('authenticates patient with valid mobile & password against live Express API', async () => {
      const loginResult = await patientApi.login(patientAPhone, 'Password123!', undefined, baseUrl);

      assert.ok(loginResult.token, 'Must return JWT token');
      assert.strictEqual(typeof loginResult.token, 'string');
      assert.ok(loginResult.user, 'Must return user profile');
      assert.strictEqual(loginResult.user.fullName, 'Anand Kulkarni');
      assert.strictEqual(loginResult.user.phone, patientAPhone);
      assert.strictEqual(loginResult.user.role, 'patient');
      assert.strictEqual(loginResult.user.status, 'active');

      patientAToken = loginResult.token;

      // Verify token and user are securely persisted in authStorage
      const savedToken = await authStorage.getToken();
      assert.strictEqual(savedToken, loginResult.token, 'authStorage must hold identical token');

      const savedUser = await authStorage.getUser();
      assert.deepStrictEqual(savedUser, loginResult.user, 'authStorage must hold identical user profile');
    });

    it('rejects invalid password with 401 ApiError without exposing secrets', async () => {
      await assert.rejects(
        async () => {
          await patientApi.login(patientAPhone, 'WrongPassword123!', undefined, baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.status, 401);
          assert.match(err.message, /invalid credentials/i);
          return true;
        }
      );
    });

    it('rejects unknown phone number with 404 ApiError and advises registration', async () => {
      await assert.rejects(
        async () => {
          await patientApi.login('9999900000', 'Password123!', undefined, baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.status, 404);
          assert.match(err.message, /no account found with this phone number or email/i);
          return true;
        }
      );
    });

    it('rejects unknown email with 404 ApiError and advises registration', async () => {
      await assert.rejects(
        async () => {
          await patientApi.login('unknown.patient@vivoquest.in', 'Password123!', undefined, baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.status, 404);
          assert.match(err.message, /no account found with this phone number or email/i);
          return true;
        }
      );
    });

    it('normalizes phone numbers seamlessly during patient login (with +91, spaces, 0, and dashes)', async () => {
      // Test +91 prefix
      const resPlus = await patientApi.login('+91' + patientAPhone, 'Password123!', undefined, baseUrl);
      assert.ok(resPlus.token);
      assert.strictEqual(resPlus.user.phone, patientAPhone);

      // Test +91 with spaces
      const resSpaces = await patientApi.login('+91 ' + patientAPhone.slice(0, 5) + ' ' + patientAPhone.slice(5), 'Password123!', undefined, baseUrl);
      assert.ok(resSpaces.token);
      assert.strictEqual(resSpaces.user.phone, patientAPhone);

      // Test leading 0
      const resZero = await patientApi.login('0' + patientAPhone, 'Password123!', undefined, baseUrl);
      assert.ok(resZero.token);
      assert.strictEqual(resZero.user.phone, patientAPhone);

      // Test whitespace padded
      const resTrim = await patientApi.login('  ' + patientAPhone + '  ', 'Password123!', undefined, baseUrl);
      assert.ok(resTrim.token);
      assert.strictEqual(resTrim.user.phone, patientAPhone);
    });

    it('accepts login request payload with phone property instead of identifier', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '+91 ' + patientAPhone,
          password: 'Password123!',
        });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.strictEqual(res.body.data.user.phone, patientAPhone);
      assert.strictEqual(res.body.data.user.role, 'patient');
    });

    it('normalizes phone numbers during registration without altering stored DB structure', async () => {
      const newPhone = '9876530099';
      await User.deleteOne({ phone: newPhone });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Suresh Patil',
          phone: '+91 ' + newPhone.slice(0, 5) + ' ' + newPhone.slice(5),
          password: 'Password123!',
          email: 'suresh.patil.test@vivoquest.in',
          consentAccepted: true,
        });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.user.phone, newPhone);

      // Verify canonical 10-digit storage in MongoDB directly
      const storedUser = await User.findOne({ phone: newPhone });
      assert.ok(storedUser, 'User document must be queryable via canonical 10-digit phone');
      assert.strictEqual(storedUser.phone, newPhone, 'Must store exactly 10 digits without +91 or spaces');
    });

    it('rejects duplicate registration with 409 Conflict', async () => {
      const duplicateRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Duplicate Patient',
          phone: '+91 98765 30099',
          password: 'Password123!',
          consentAccepted: true,
        });
      assert.strictEqual(duplicateRes.status, 409);
      assert.match(duplicateRes.body.error.message, /already exists/i);
    });

    it('provides working end-to-end patient registration flow via patientApi.register and immediately logs in', async () => {
      const regPhone = '9876530098';
      await User.deleteOne({ phone: regPhone });

      const regResult = await patientApi.register(
        {
          fullName: 'Sunita Deshmukh',
          phone: '+91 ' + regPhone,
          password: 'Password123!',
          email: 'sunita.deshmukh.reg@vivoquest.in',
          city: 'Pune',
          pincode: '411001',
          consentAccepted: true,
        },
        baseUrl
      );

      assert.ok(regResult.token, 'Must return JWT token upon patient registration');
      assert.strictEqual(regResult.user.fullName, 'Sunita Deshmukh');
      assert.strictEqual(regResult.user.phone, regPhone);
      assert.strictEqual(regResult.user.role, 'patient');
      assert.strictEqual(regResult.user.status, 'active');

      // Verify session stored in authStorage
      const savedToken = await authStorage.getToken();
      assert.strictEqual(savedToken, regResult.token);
      const savedUser = await authStorage.getUser();
      assert.deepStrictEqual(savedUser, regResult.user);
    });

    it('rejects unauthorized roles from logging into the Patient App with 403 ApiError', async () => {
      const hospitalPhone = '9876530088';
      await User.deleteOne({ phone: hospitalPhone });

      // Create a hospital administrator user
      const resHosp = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Ruby Hall Administrator',
          phone: hospitalPhone,
          password: 'Password123!',
          role: 'hospital',
          consentAccepted: true,
        });
      assert.strictEqual(resHosp.status, 201);

      // Attempt to sign in via patientApi client
      await assert.rejects(
        async () => {
          await patientApi.login(hospitalPhone, 'Password123!', undefined, baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.status, 403);
          assert.match(err.message, /not authorized for the patient app/i);
          return true;
        }
      );
    });

    it('confirms registered patient has patient role and is permitted to access patient endpoints', async () => {
      // Patient A signs in
      const patSession = await patientApi.login(patientAPhone, 'Password123!', undefined, baseUrl);
      assert.strictEqual(patSession.user.role, 'patient');

      // Patient accesses their subscriptions and care reports without rejection
      const subs = await patientApi.getSubscriptions(baseUrl);
      assert.ok(Array.isArray(subs));

      const reports = await patientApi.getCareReports(baseUrl);
      assert.ok(Array.isArray(reports));
    });

    it('restores existing session from secure storage', async () => {
      const token = await authStorage.getToken();
      const user = await authStorage.getUser();
      assert.ok(token);
      assert.ok(user);
      assert.strictEqual(user.id, patientAId);
    });

    it('clears secure storage and user profile on logout', async () => {
      await patientApi.logout();
      const token = await authStorage.getToken();
      const user = await authStorage.getUser();
      assert.strictEqual(token, null, 'Token must be wiped from storage');
      assert.strictEqual(user, null, 'User profile must be wiped from storage');
    });

    it('identifies storage type and explicitly distinguishes hardware vs fallback', async () => {
      const storageType = await authStorage.getStorageType();
      assert.ok(
        storageType === 'hardware_secure_store' || storageType === 'in_memory_transient_fallback',
        'Must return a valid known storage type'
      );
    });

    it('dynamically resolves mobile API base URL and respects custom override', () => {
      const defaultUrl = getMobileApiBaseUrl();
      assert.ok(defaultUrl.startsWith('http://'), 'Base URL must start with http://');
      assert.ok(defaultUrl.includes('/api/v1'), 'Base URL must include /api/v1');

      // Test custom override
      setCustomMobileApiBaseUrl('http://10.151.164.41:4000/api/v1');
      assert.strictEqual(getMobileApiBaseUrl(), 'http://10.151.164.41:4000/api/v1');

      // Reset override
      setCustomMobileApiBaseUrl(null);
    });
  });

  // =========================================================================
  // 2. CONNECT PATIENT DATA TO BACKEND & DATA MINIMIZATION
  // =========================================================================
  describe('2. Patient Data Integration & Sensitive Data Protection', () => {
    before(async () => {
      // Log in Patient A to populate token in storage
      await patientApi.login(patientAPhone, 'Password123!', undefined, baseUrl);
    });

    it('fetches real subscriptions with remaining visits, dates, and assigned caregiver', async () => {
      const subscriptions = await patientApi.getSubscriptions(baseUrl);

      assert.ok(Array.isArray(subscriptions));
      assert.strictEqual(subscriptions.length, 1);

      const sub = subscriptions[0];
      assert.strictEqual(sub.subscriptionNumber, 'TEST-M32-SUB-001');
      assert.strictEqual(sub.status, 'active');
      assert.strictEqual(sub.totalVisitsIncluded, 12);
      assert.strictEqual(sub.visitsCompleted, 3);
      assert.strictEqual(sub.visitsRemaining, 9);
      assert.ok(sub.assignedCaregiver);
      assert.strictEqual(sub.assignedCaregiver?.name, 'Nurse Priya Sharma');
      assert.strictEqual(sub.assignedCaregiver?.phone, caregiverPhone);
      assert.strictEqual(sub.pricing.customerPrice, 18500);

      // CRITICAL PRIVACY & MINIMIZATION REQUIREMENT:
      // Verify caregiverPayout and platformFee/commission are NOT exposed to patient
      assert.strictEqual((sub as any).caregiverPayout, undefined);
      assert.strictEqual((sub.pricing as any).caregiverPayout, undefined);
      assert.strictEqual((sub.pricing as any).platformCommission, undefined);
    });

    it('fetches verified clinical care reports with recorded vitals and notes', async () => {
      const reports = await patientApi.getCareReports(baseUrl);

      assert.ok(Array.isArray(reports));
      assert.ok(reports.length >= 1, 'Should return at least one bedside report');

      const report = reports[0];
      assert.strictEqual(report.sourceType, 'field_visit');
      assert.strictEqual(report.providerOrSubmitterName, 'Nurse Priya Sharma');
      assert.strictEqual(report.providerRoleOrRelation, 'Palliative Registered Nurse');
      assert.ok(report.vitals, 'Must include vitals object');
      assert.strictEqual(report.vitals?.bloodPressure, '122/82');
      assert.strictEqual(report.vitals?.pulseRate, 74);
      assert.strictEqual(report.vitals?.oxygenSaturation, 98);
      assert.strictEqual(report.vitals?.temperature, '98.4');
      assert.ok(Array.isArray(report.proceduresDone));
      assert.ok(report.proceduresDone.includes('SpO2 check'));
      assert.match(report.clinicalNotes || '', /Mild lower back pain/);
    });

    it('fetches active caregiver plans catalog with customer pricing and features', async () => {
      const plans = await patientApi.getCaregiverPlans(undefined, baseUrl);

      assert.ok(Array.isArray(plans));
      assert.ok(plans.length >= 1);

      const targetPlan = plans.find((p) => p.planCode === 'TEST-M32-COMPREHENSIVE');
      assert.ok(targetPlan, 'Must find seeded comprehensive plan');
      assert.strictEqual(targetPlan.customerPrice, 18500);
      assert.strictEqual(targetPlan.totalVisitsIncluded, 12);
      assert.strictEqual(targetPlan.hoursPerVisit, 4);
      assert.strictEqual(targetPlan.category, 'palliative');
      assert.ok(targetPlan.features.length >= 4);

      // Verify contractor payout is never leaked in catalog
      assert.strictEqual((targetPlan as any).caregiverPayout, undefined);
      assert.strictEqual((targetPlan as any).platformFee, undefined);
    });

    it('filters caregiver plans by category parameter', async () => {
      const palliativePlans = await patientApi.getCaregiverPlans('palliative', baseUrl);
      assert.ok(palliativePlans.every((p) => p.category === 'palliative'));
    });

    it('allows patient to submit daily health update and reflects it in care reports', async () => {
      await patientApi.login(patientAPhone, 'Password123!', undefined, baseUrl);

      const updateRes = await patientApi.submitHealthUpdate(
        {
          submitterName: 'Anand Kulkarni',
          relationship: 'patient',
          symptoms: ['Mild fatigue after morning walk'],
          notes: 'Feeling better than yesterday. Took morning medication.',
          vitals: {
            bloodPressure: '120/80',
            pulse: 74,
            temperature: 98.6,
            spO2: 99,
          },
        },
        baseUrl
      );

      assert.ok(updateRes);
      assert.strictEqual(updateRes.reviewStatus, 'new');

      // Now query care reports - must include the newly submitted update
      const reports = await patientApi.getCareReports(baseUrl);
      assert.ok(reports.length >= 2, 'Reports must contain both visit and daily health update');

      const healthUpdateReport = reports.find((r) => r.sourceType === 'daily_health_update');
      assert.ok(healthUpdateReport, 'Must contain self-reported health update');
      assert.strictEqual(healthUpdateReport.vitals?.bloodPressure, '120/80');
      assert.strictEqual(healthUpdateReport.vitals?.pulseRate, 74);
      assert.strictEqual(healthUpdateReport.vitals?.oxygenSaturation, 99);
      assert.strictEqual(healthUpdateReport.comfortLevel, 'Patient Self-Reported');
    });

    it('resolves subscription when matched via patient phone variant', async () => {
      // Create a subscription linked to patientB's phone (+91 format)
      const phoneLinkedSub = await CaregiverSubscription.create({
        subscriptionNumber: 'TEST-M32-SUB-PHONE-001',
        patientId: new mongoose.Types.ObjectId(), // Unlinked placeholder ID
        patientName: 'Kavita Patil',
        patientPhone: `+91 ${patientBPhone}`,
        planId: new mongoose.Types.ObjectId(testPlanId),
        planTitle: 'Monthly Palliative Nursing Support',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400 * 1000),
        assignedCaregiverId: new mongoose.Types.ObjectId(caregiverId),
        assignedCaregiverName: 'Nurse Priya Sharma',
        assignedCaregiverPhone: caregiverPhone,
        totalVisitsIncluded: 15,
        visitsCompleted: 2,
        visitsRemaining: 13,
        pricing: {
          customerPrice: 15000,
          caregiverPayout: 10000,
          platformCommission: 5000,
          paymentStatus: 'paid',
        },
        isDemo: true,
      });

      // Sign in as Patient B
      await patientApi.login(patientBPhone, 'Password123!', undefined, baseUrl);

      // Fetch subscriptions - must resolve phoneLinkedSub despite different patientId
      const subs = await patientApi.getSubscriptions(baseUrl);
      assert.ok(subs.length >= 1, 'Must find subscription matched via phone variant');
      const foundSub = subs.find((s) => s.subscriptionNumber === 'TEST-M32-SUB-PHONE-001');
      assert.ok(foundSub, 'Must find phone-linked subscription');
      assert.strictEqual(foundSub.assignedCaregiver?.name, 'Nurse Priya Sharma');
      assert.strictEqual(foundSub.visitsRemaining, 13);

      await CaregiverSubscription.deleteOne({ _id: phoneLinkedSub._id });
    });
  });

  // =========================================================================
  // 3. SERVER AUTHORIZATION & IDENTITY PROTECTION
  // =========================================================================
  describe('3. Server-Side Identity Isolation (DPDP Act Compliance)', () => {
    it('strictly confines patient endpoints to authenticated identity, preventing cross-tenant access', async () => {
      // Patient Empty logs in
      await patientApi.login(patientEmptyPhone, 'Password123!', undefined, baseUrl);

      // Patient Empty has no subscriptions; must receive empty array, not Patient A's records
      const emptySubs = await patientApi.getSubscriptions(baseUrl);
      assert.ok(Array.isArray(emptySubs));
      assert.strictEqual(emptySubs.length, 0, 'Patient Empty must not receive Patient A subscriptions');

      // Patient Empty has no care reports; must receive empty array
      const emptyReports = await patientApi.getCareReports(baseUrl);
      assert.ok(Array.isArray(emptyReports));
      assert.strictEqual(emptyReports.length, 0, 'Patient Empty must not receive Patient A care reports');
    });

    it('forbids unauthenticated access with 401 SessionExpiredError', async () => {
      await authStorage.clearSession();

      await assert.rejects(
        async () => {
          await patientApi.getSubscriptions(baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof SessionExpiredError);
          return true;
        }
      );
    });
  });

  // =========================================================================
  // 4. UI STATE RELIABILITY & SESSION EXPIRATION
  // =========================================================================
  describe('4. Reliable UI States, 401 Interception & Network Failures', () => {
    it('triggers onUnauthorizedListener and clears storage on 401 response', async () => {
      let listenerCalled = false;
      setOnUnauthorizedListener(() => {
        listenerCalled = true;
      });

      // Set an invalid/malformed token
      await authStorage.setToken('malformed.bogus.jwt');

      await assert.rejects(
        async () => {
          await patientApi.getSubscriptions(baseUrl);
        },
        (err: any) => {
          assert.ok(err instanceof SessionExpiredError);
          return true;
        }
      );

      assert.strictEqual(listenerCalled, true, '401 interceptor must notify listeners');
      const clearedToken = await authStorage.getToken();
      assert.strictEqual(clearedToken, null, 'Storage must be purged on unauthorized response');

      setOnUnauthorizedListener(null);
    });

    it('reports NETWORK_DISCONNECTED ApiError on unreachable server endpoint', async () => {
      // Intentionally point to an unused port to simulate offline server
      const offlineUrl = 'http://127.0.0.1:49999/api/v1';

      await assert.rejects(
        async () => {
          await patientApi.login(patientAPhone, 'Password123!', undefined, offlineUrl);
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
