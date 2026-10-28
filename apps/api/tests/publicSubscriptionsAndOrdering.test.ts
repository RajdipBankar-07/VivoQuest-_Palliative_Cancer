import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  User,
  MedicalProduct,
  ProductOrder,
  CaregiverPlan,
  CaregiverSubscription,
  Supplier,
} from '../src/models/index.js';
import { generateAuthToken } from '../src/services/authService.js';

describe('VivoQuest — Public Subscriptions, Medical Equipment Catalog & Patient Ordering Suite', () => {
  const app = createApp();

  // Test accounts
  const patientAPhone = '9876540011';
  let patientAId: string;
  let patientAToken: string;

  const patientBPhone = '9876540012';
  let patientBId: string;
  let patientBToken: string;

  const testPhones = [patientAPhone, patientBPhone];

  let testPlanMonthlyId: string;
  let testPlanPackageId: string;
  let testProductId: string;
  let placedOrderId: string;
  let placedOrderNumber: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();

    // Clean up test users & test plans
    await User.deleteMany({ phone: { $in: testPhones } });
    await CaregiverPlan.deleteMany({ planCode: { $in: ['PLAN-TEST-M1', 'PLAN-TEST-P1'] } });
    await CaregiverSubscription.deleteMany({ carePlanNotes: { $regex: 'TEST_SUITE' } });
    await MedicalProduct.deleteMany({ sku: 'PUB-TEST-BED-01' });

    // Create Patient A
    const patientA = await User.create({
      fullName: 'Ananya Sharma',
      phone: patientAPhone,
      email: 'ananya.test@example.com',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
      role: 'patient',
      authMode: 'mock_otp',
      isPhoneVerified: true,
      city: 'Pune',
      pincode: '411038',
      dpdpConsent: {
        consentGranted: true,
        consentTimestamp: new Date(),
        purpose: 'healthcare_services',
        version: '1.0',
      },
    });
    patientAId = patientA._id.toString();
    patientAToken = generateAuthToken(patientA);

    // Create Patient B
    const patientB = await User.create({
      fullName: 'Vikram Joshi',
      phone: patientBPhone,
      email: 'vikram.test@example.com',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
      role: 'patient',
      authMode: 'mock_otp',
      isPhoneVerified: true,
      city: 'Mumbai',
      pincode: '400001',
      dpdpConsent: {
        consentGranted: true,
        consentTimestamp: new Date(),
        purpose: 'healthcare_services',
        version: '1.0',
      },
    });
    patientBId = patientB._id.toString();
    patientBToken = generateAuthToken(patientB);

    // Seed test caregiver plans
    const planMonthly = await CaregiverPlan.create({
      planCode: 'PLAN-TEST-M1',
      title: 'Palliative Monthly Comfort Care',
      planType: 'monthly_subscription',
      category: 'palliative',
      durationDays: 30,
      totalVisitsIncluded: 30,
      hoursPerVisit: 8,
      customerPrice: 18500,
      caregiverPayout: 14000,
      description: 'Comprehensive 30-day palliative nursing support with daily vitals reporting.',
      features: [
        'Daily bedside nursing & vitals logging',
        'Pain and symptom monitoring',
        'Mobile app daily reports for family',
      ],
      isActive: true,
      isPopular: true,
    });
    testPlanMonthlyId = planMonthly._id.toString();

    const planPackage = await CaregiverPlan.create({
      planCode: 'PLAN-TEST-P1',
      title: 'Post-Surgery Recovery 10-Visit Block',
      planType: 'fixed_visit_package',
      category: 'post_operative',
      durationDays: 45,
      totalVisitsIncluded: 10,
      hoursPerVisit: 4,
      customerPrice: 7500,
      caregiverPayout: 5500,
      description: 'Flexible 10-visit wound care and rehabilitation package.',
      features: ['Wound dressing & surgical drain care', 'Mobility assistance'],
      isActive: true,
      isPopular: false,
    });
    testPlanPackageId = planPackage._id.toString();

    // Seed test medical product
    const product = await MedicalProduct.create({
      sku: 'PUB-TEST-BED-01',
      title: 'Motorized ICU Hospital Bed 3-Function',
      category: 'icu_home_setup',
      description: 'Full electric adjustable hospital bed for home palliative care.',
      price: 34999,
      regularPrice: 42000,
      sellingPrice: 34999,
      discountPercentage: 17,
      stockQuantity: 8,
      isRentalAvailable: true,
      rentalPriceMonthly: 3800,
      installationEligible: true,
      installationServiceCharge: 750,
      images: ['https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800'],
      isActive: true,
    });
    testProductId = product._id.toString();
  });

  after(async () => {
    // Clean up
    await User.deleteMany({ phone: { $in: testPhones } });
    await CaregiverPlan.deleteMany({ planCode: { $in: ['PLAN-TEST-M1', 'PLAN-TEST-P1'] } });
    await CaregiverSubscription.deleteMany({ carePlanNotes: { $regex: 'TEST_SUITE' } });
    await MedicalProduct.deleteMany({ sku: 'PUB-TEST-BED-01' });
    if (placedOrderId) {
      await ProductOrder.deleteOne({ _id: placedOrderId });
    }
    await disconnectDatabase();
  });

  // ===========================================================================
  // 1. PUBLIC SUBSCRIPTIONS CATALOG DISCOVERY (NO AUTH REQUIRED)
  // ===========================================================================
  describe('1. Public Caregiver Subscriptions Catalog', () => {
    it('allows guest visitors to fetch all active caregiver plans without auth token', async () => {
      const res = await request(app)
        .get('/api/v1/patients/caregiver-plans')
        .expect(200);

      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 2);

      const foundMonthly = res.body.data.find((p: any) => p.planCode === 'PLAN-TEST-M1');
      assert.ok(foundMonthly, 'Monthly plan should be listed in public catalog');
      assert.equal(foundMonthly.title, 'Palliative Monthly Comfort Care');
      assert.equal(foundMonthly.customerPrice, 18500);
      assert.equal(foundMonthly.totalVisitsIncluded, 30);
      assert.equal(foundMonthly.hoursPerVisit, 8);
    });

    it('filters public plans by planType=monthly_subscription', async () => {
      const res = await request(app)
        .get('/api/v1/patients/caregiver-plans?planType=monthly_subscription')
        .expect(200);

      assert.equal(res.body.success, true);
      res.body.data.forEach((p: any) => {
        assert.equal(p.planType, 'monthly_subscription');
      });
    });

    it('filters public plans by category=post_operative', async () => {
      const res = await request(app)
        .get('/api/v1/patients/caregiver-plans?category=post_operative')
        .expect(200);

      assert.equal(res.body.success, true);
      const foundPkg = res.body.data.find((p: any) => p.planCode === 'PLAN-TEST-P1');
      assert.ok(foundPkg);
      assert.equal(foundPkg.category, 'post_operative');
    });
  });

  // ===========================================================================
  // 2. PUBLIC MEDICAL EQUIPMENT BROWSING & CART REVALIDATION
  // ===========================================================================
  describe('2. Public Medical Storefront & Cart Calculations', () => {
    it('allows guest visitors to browse products without auth token', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .expect(200);

      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      const testBed = res.body.data.find((p: any) => p.sku === 'PUB-TEST-BED-01');
      assert.ok(testBed, 'Test hospital bed should be discoverable in public catalog');
      assert.equal(testBed.sellingPrice, 34860);
      assert.equal(testBed.stockQuantity, 8);
    });

    it('allows guest visitors to calculate cart subtotal & GST without auth token', async () => {
      const res = await request(app)
        .post('/api/v1/products/cart/validate')
        .send({
          items: [
            {
              productId: testProductId,
              quantity: 1,
              isRental: false,
              installationSelected: true,
            },
          ],
        })
        .expect(200);

      assert.equal(res.body.success, true);
      assert.ok(res.body.data);
    });
  });

  // ===========================================================================
  // 3. GUEST ACCESS RESTRICTIONS (GUARDRAILS)
  // ===========================================================================
  describe('3. Guest Guardrails & Authentication Requirements', () => {
    it('rejects unauthenticated subscription activation attempts with 401', async () => {
      const res = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .send({
          planId: testPlanMonthlyId,
          emergencyContact: {
            name: 'Ananya Sharma',
            phone: '9876540011',
            relation: 'Self',
          },
          carePlanNotes: 'TEST_SUITE guest unauthenticated',
        })
        .expect(401);

      assert.equal(res.body.success, false);
      assert.match(JSON.stringify(res.body), /Authentication|Missing Bearer token/i);
    });

    it('rejects unauthenticated equipment order placement attempts with 401', async () => {
      const res = await request(app)
        .post('/api/v1/products/orders')
        .send({
          items: [
            {
              productId: testProductId,
              quantity: 1,
              isRental: false,
            },
          ],
          deliveryAddress: {
            street: '12 Shivaji Nagar',
            city: 'Pune',
            pincode: '411005',
            contactPhone: '9876540011',
          },
          paymentMethod: 'online',
        })
        .expect(401);

      assert.equal(res.body.success, false);
    });
  });

  // ===========================================================================
  // 4. AUTHENTICATED PATIENT SUBSCRIPTION ACTIVATION & ISOLATION
  // ===========================================================================
  describe('4. Patient Subscription Purchase & Isolation', () => {
    const idempotencyKey = `idemp_sub_${Date.now()}`;

    it('successfully activates a caregiver subscription for authenticated Patient A', async () => {
      const res = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          planId: testPlanMonthlyId,
          emergencyContact: {
            name: 'Rohit Sharma',
            phone: '9876540099',
            relation: 'Brother',
          },
          carePlanNotes: 'TEST_SUITE Patient A bedside comfort requested',
          idempotencyKey,
        })
        .expect(201);

      assert.equal(res.body.success, true);
      assert.ok(res.body.data);
      assert.equal(res.body.data.status, 'active');
      assert.ok(res.body.data.subscriptionNumber.includes('SUB-'));
      assert.equal(res.body.data.totalVisitsIncluded, 30);
      assert.equal(res.body.data.visitsRemaining, 30);
    });

    it('handles idempotent subscription replay without creating duplicates', async () => {
      const res = await request(app)
        .post('/api/v1/patients/me/subscriptions/activate')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          planId: testPlanMonthlyId,
          emergencyContact: {
            name: 'Rohit Sharma',
            phone: '9876540099',
            relation: 'Brother',
          },
          carePlanNotes: 'TEST_SUITE Patient A bedside comfort requested',
          idempotencyKey, // Identical key
        })
        .expect(200);

      assert.equal(res.body.success, true);
      assert.match(res.body.message, /already active/i);
    });

    it('allows Patient A to query active subscriptions', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/subscriptions')
        .set('Authorization', `Bearer ${patientAToken}`)
        .expect(200);

      assert.equal(res.body.success, true);
      assert.ok(res.body.data.length >= 1);
      const sub = res.body.data.find((s: any) => s.planTitle.includes('Palliative Monthly Comfort'));
      assert.ok(sub);
      assert.equal(sub.status, 'active');
    });

    it('ensures Patient B cannot see Patient A subscriptions (tenant isolation)', async () => {
      const res = await request(app)
        .get('/api/v1/patients/me/subscriptions')
        .set('Authorization', `Bearer ${patientBToken}`)
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 0, 'Patient B should have zero subscriptions');
    });
  });

  // ===========================================================================
  // 5. AUTHENTICATED PATIENT EQUIPMENT ORDERING & SANDBOX PAYMENT
  // ===========================================================================
  describe('5. Patient Medical Equipment Purchase & Tracking', () => {
    it('allows Patient A to place an order for medical equipment', async () => {
      const res = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          items: [
            {
              productId: testProductId,
              quantity: 1,
              isRental: false,
              installationSelected: true,
            },
          ],
          deliveryAddress: {
            street: '15 Model Colony',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411016',
            contactPhone: patientAPhone,
          },
          paymentMethod: 'online',
          installationPreferences: {
            preferredDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
            preferredSlot: 'Morning (9:00 AM - 1:00 PM)',
            accessInstructions: 'Elevator available, 3rd floor',
          },
        })
        .expect(201);

      assert.equal(res.body.success, true);
      assert.ok(res.body.data);
      placedOrderId = res.body.data.id || res.body.data._id;
      placedOrderNumber = res.body.data.orderNumber;

      assert.ok(placedOrderNumber.includes('ORD-'));
      assert.equal(res.body.data.orderStatus, 'placed');
      assert.equal(res.body.data.paymentStatus, 'pending');
    });

    it('allows Patient A to verify sandbox payment and transition order to processing', async () => {
      const fakeRzpOrderId = `rzp_test_ord_${Date.now()}`;
      const fakeRzpPaymentId = `pay_sim_${Date.now()}`;
      const fakeRzpSignature = `test_sig_${fakeRzpOrderId}_${fakeRzpPaymentId}`;

      const res = await request(app)
        .post('/api/v1/products/payments/verify')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          orderId: placedOrderId,
          razorpayOrderId: fakeRzpOrderId,
          razorpayPaymentId: fakeRzpPaymentId,
          razorpaySignature: fakeRzpSignature,
        })
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.paymentStatus, 'paid');
    });

    it('allows Patient A to view their placed order in My Orders', async () => {
      const res = await request(app)
        .get('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .expect(200);

      assert.equal(res.body.success, true);
      const myOrder = res.body.data.find((o: any) => o.id === placedOrderId || o._id === placedOrderId || o.orderNumber === placedOrderNumber);
      assert.ok(myOrder, 'Order should be listed in Patient A order history');
      assert.equal(myOrder.paymentStatus, 'paid');
    });

    it('prevents Patient B from accessing Patient A order details (tenant isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/products/orders/${placedOrderId}`)
        .set('Authorization', `Bearer ${patientBToken}`);

      // Should return 403 Forbidden or 404 Not Found
      assert.ok(
        [403, 404].includes(res.status),
        `Expected 403 or 404 for cross-patient order access, got ${res.status}`
      );
    });
  });
});
