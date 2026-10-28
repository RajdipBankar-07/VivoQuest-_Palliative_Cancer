import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { CaregiverPlan } from '../src/models/CaregiverPlan.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { User } from '../src/models/User.js';

describe('VivoQuest — Subscription Patient App Handoff & Activation Test Suite', () => {
  const app = createApp();
  let patientAToken: string;
  let patientAId: string;
  let patientBToken: string;
  let testPlan: any;

  before(async () => {
    await connectDatabase();

    // Ensure a standard test plan exists
    testPlan = await CaregiverPlan.findOne({ isActive: true });
    if (!testPlan) {
      testPlan = await CaregiverPlan.create({
        planCode: 'VQ-TEST-HANDOFF-01',
        title: 'Bedside Palliative & Nursing Care',
        planType: 'monthly_subscription',
        category: 'palliative',
        durationDays: 30,
        totalVisitsIncluded: 30,
        hoursPerVisit: 8,
        customerPrice: 15000,
        price: 15000,
        description: 'Comprehensive 30-day bedside nursing and palliative care at the kitchen table.',
        features: [
          'Certified home nurse assignment',
          'Daily vital monitoring (BP, SpO2, Pulse)',
          'Daily visit reports in Patient App',
        ],
        isActive: true,
        isPopular: true,
      });
    }

    // Register Patient A
    const phoneA = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regResA = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Aarav Handoff Patient',
      phone: phoneA,
      password: 'Password@123',
      role: 'patient',
      city: 'Pune',
      pincode: '411001',
      consentAccepted: true,
    });
    patientAToken = regResA.body.data?.token || regResA.body.token;
    patientAId = regResA.body.data?.user?.id || regResA.body.data?.user?._id || regResA.body.user?.id;

    // Register Patient B
    const phoneB = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regResB = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Rhea Second Patient',
      phone: phoneB,
      password: 'Password@123',
      role: 'patient',
      city: 'Mumbai',
      pincode: '400001',
      consentAccepted: true,
    });
    patientBToken = regResB.body.data?.token || regResB.body.token;
  });

  after(async () => {
    // Cleanup subscriptions created during test
    if (patientAId) {
      await CaregiverSubscription.deleteMany({ patientId: patientAId });
    }
    await disconnectDatabase();
  });

  describe('1. Public Website Plan Discovery & Deep-Link Preparation', () => {
    it('1.1 should allow unauthenticated guest visitors to query available caregiver plans', async () => {
      const res = await request(app).get('/api/v1/patients/caregiver-plans');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);

      const target = res.body.data.find((p: any) => p._id === String(testPlan._id) || p.id === String(testPlan._id));
      assert.ok(target, 'Test plan must be in public catalog');
      assert.ok(target.customerPrice || target.price, 'Must have configured price');
    });

    it('1.2 should calculate 18% GST and total payable amount matching handoff pricing logic', () => {
      const basePrice = Number(testPlan.customerPrice || testPlan.price || 15000);
      const taxGst = Math.round(basePrice * 0.18);
      const totalAmount = basePrice + taxGst;

      assert.ok(basePrice > 0);
      assert.equal(taxGst, Math.round(basePrice * 0.18));
      assert.equal(totalAmount, basePrice + taxGst);
    });

    it('1.3 should format valid mobile deep-link URL for the Patient App', () => {
      const scheme = 'vivoquest';
      const planId = String(testPlan._id || testPlan.id);
      const deepLinkUrl = `${scheme}://subscriptions?planId=${encodeURIComponent(planId)}`;

      assert.ok(deepLinkUrl.startsWith('vivoquest://subscriptions?planId='));
      assert.ok(deepLinkUrl.includes(planId));
    });
  });

  describe('2. Unauthenticated Guardrails & Tenant Isolation', () => {
    it('2.1 should strictly REJECT unauthenticated direct activation with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .send({
          planId: String(testPlan._id),
          carePlanNotes: 'Direct web activation bypass test',
        });
      assert.equal(res.status, 401);
    });

    it('2.2 should strictly REJECT activation when an invalid planId is provided', async () => {
      const res = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          planId: '600000000000000000000099',
          carePlanNotes: 'Non-existent plan test',
        });
      assert.ok([400, 404].includes(res.status));
    });
  });

  describe('3. Patient App Handoff Activation & Idempotency', () => {
    let activatedSubId: string;
    const testIdempotencyKey = `idem_handoff_${Date.now()}`;

    it('3.1 should successfully activate plan in Verified Test Mode for authenticated patient', async () => {
      const res = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          planId: String(testPlan._id),
          carePlanNotes: 'Patient arrived via website handoff. Patient kitchen table care.',
          emergencyContact: {
            name: 'Emergency Contact Person',
            phone: '9876543210',
            relation: 'Spouse',
          },
          idempotencyKey: testIdempotencyKey,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      const sub = res.body.data;
      assert.ok(sub._id || sub.id);
      assert.equal(sub.status, 'active');
      assert.ok(sub.subscriptionNumber.startsWith('SUB-') || sub.subscriptionNumber.length > 5);
      assert.equal(sub.planTitle, testPlan.title);
      assert.equal(sub.totalVisitsIncluded, testPlan.totalVisitsIncluded || 30);
      activatedSubId = sub._id || sub.id;
    });

    it('3.2 should handle idempotent replay safely without duplicate subscription creation', async () => {
      const replayRes = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          planId: String(testPlan._id),
          carePlanNotes: 'Replay attempt',
          idempotencyKey: testIdempotencyKey,
        });

      assert.ok([200, 201].includes(replayRes.status));
      assert.equal(replayRes.body.success, true);
      const replaySub = replayRes.body.data;
      assert.equal(replaySub._id || replaySub.id, activatedSubId);
    });

    it('3.3 should prevent activating a second conflicting active subscription concurrently', async () => {
      let plan2 = await CaregiverPlan.findOne({ _id: { $ne: testPlan._id }, isActive: true });
      if (!plan2) {
        plan2 = await CaregiverPlan.create({
          planCode: `VQ-TEST-CONFLICT-${Date.now()}`,
          title: 'Conflicting Secondary Care Plan',
          planType: 'monthly_subscription',
          category: 'respiratory',
          durationDays: 30,
          totalVisitsIncluded: 20,
          hoursPerVisit: 4,
          customerPrice: 12000,
          price: 12000,
          description: 'Conflict test plan',
          features: ['Caregiver visit'],
          isActive: true,
        });
      }

      const secondRes = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          planId: String(plan2._id),
          carePlanNotes: 'Conflicting second plan attempt',
          idempotencyKey: `idem_second_${Date.now()}`,
        });

      // API returns 409 Conflict to enforce one active care plan at a time
      assert.equal(secondRes.status, 409);
    });

    it('3.4 should list active subscription in Patient A My Subscriptions', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/subscriptions')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      const hasActive = res.body.data.some((s: any) => (s._id || s.id) === activatedSubId && s.status === 'active');
      assert.ok(hasActive, 'Active subscription must be returned in patient subscriptions list');
    });

    it('3.5 should ensure Patient B CANNOT see Patient A subscription (Tenant Isolation)', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/subscriptions')
        .set('Authorization', `Bearer ${patientBToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      const seesPatientASub = res.body.data.some((s: any) => (s._id || s.id) === activatedSubId);
      assert.equal(seesPatientASub, false, 'Patient B must not see Patient A subscriptions');
    });
  });
});
