import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { MedicalProduct } from '../src/models/MedicalProduct.js';
import { Supplier } from '../src/models/Supplier.js';
import { SupplierPurchaseOrder } from '../src/models/SupplierPurchaseOrder.js';
import { CaregiverPlan } from '../src/models/CaregiverPlan.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { ProductOrder } from '../src/models/ProductOrder.js';
import { seedAdminDemoData } from '../src/services/adminService.js';
import { seedMedicalProductsIfEmpty } from '../src/services/productCatalogService.js';

describe('Phase 2 — Supplier Commerce, Caregiver Subscriptions & Admin Governance Suite', () => {
  const app = createApp();

  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900'; // Operations Admin Lead

  let patientToken: string;
  let patientUserId: string;
  const patientPhone = '9810011111'; // Ramesh Kulkarni

  let caregiverToken: string;
  let caregiverUserId: string;
  const caregiverPhone = '9822441122'; // Sister Sunita Deshpande

  let testSupplierId: string;
  let testPOId: string;
  let testPlanId: string;
  let testSubscriptionId: string;
  let activatedSubId: string;
  let testProductId: string;
  let testOrderId: string;

  before(async () => {
    await connectDatabase();
    await seedAdminDemoData();
    await seedMedicalProductsIfEmpty();

    // Ensure patient account exists
    let patient = await User.findOne({ phone: patientPhone });
    if (!patient) {
      await User.create({
        fullName: 'Ramesh Kulkarni',
        phone: patientPhone,
        email: 'ramesh.kulkarni@example.com',
        role: 'patient',
        passwordHash: '$2a$10$wK1W8GqjV1dE8qfS9I4PueZ.qBwT6Y1oF.5yWfB3p1Z5F9jG3.P3m',
        isPhoneVerified: true,
        status: 'active',
        dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
      });
    }

    // Ensure caregiver account exists
    let caregiver = await User.findOne({ phone: caregiverPhone });
    if (!caregiver) {
      await User.create({
        fullName: 'Sister Sunita Deshpande',
        phone: caregiverPhone,
        email: 'sunita.deshpande@vivoquest.in',
        role: 'professional',
        passwordHash: '$2a$10$wK1W8GqjV1dE8qfS9I4PueZ.qBwT6Y1oF.5yWfB3p1Z5F9jG3.P3m',
        isPhoneVerified: true,
        status: 'active',
        dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
      });
    }

    // Also ensure at least one active CaregiverSubscription exists
    let activeSub = await CaregiverSubscription.findOne({ status: 'active', visitsRemaining: { $gt: 5 } });
    if (!activeSub) {
      const plan = await CaregiverPlan.findOne();
      const patientDoc = await User.findOne({ phone: patientPhone });
      const caregiverDoc = await User.findOne({ phone: caregiverPhone });
      if (plan && patientDoc && caregiverDoc) {
        await CaregiverSubscription.create({
          subscriptionNumber: `SUB-TEST-${Date.now()}`,
          patientId: patientDoc._id,
          patientName: patientDoc.fullName,
          patientPhone: patientDoc.phone,
          planId: plan._id,
          planTitle: plan.title,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          assignedCaregiverId: caregiverDoc._id,
          assignedCaregiverName: caregiverDoc.fullName,
          assignedCaregiverPhone: caregiverDoc.phone,
          totalVisitsIncluded: 30,
          visitsCompleted: 6,
          visitsRemaining: 24,
          pricing: {
            customerPrice: 36000,
            caregiverPayout: 25000,
            platformCommission: 11000,
            paymentStatus: 'paid',
            paymentMethod: 'online',
          },
          isDemo: true,
        });
      }
    }

    // 1. Admin login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: adminPhone, otp: '123456', role: 'admin' });
    assert.equal(adminRes.status, 200, 'Admin login should succeed');
    adminToken = adminRes.body.data.token;
    adminUserId = adminRes.body.data.user.id;

    // 2. Patient login
    const patientRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: patientPhone, otp: '123456', role: 'patient' });
    assert.equal(patientRes.status, 200, 'Patient login should succeed');
    patientToken = patientRes.body.data.token;
    patientUserId = patientRes.body.data.user.id;

    // 3. Caregiver login
    const caregiverRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: caregiverPhone, otp: '123456', role: 'professional' });
    assert.equal(caregiverRes.status, 200, 'Caregiver login should succeed');
    caregiverToken = caregiverRes.body.data.token;
    caregiverUserId = caregiverRes.body.data.user.id;
  });

  after(async () => {
    await disconnectDatabase();
  });

  // ---------------------------------------------------------------------------
  // 1. SUPPLIER COMMERCE & ONBOARDING
  // ---------------------------------------------------------------------------
  it('GET /api/v1/admin/suppliers — lists suppliers with verification statuses', async () => {
    const res = await request(app)
      .get('/api/v1/admin/suppliers')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 2, 'Should return seeded suppliers');

    const first = res.body.data[0];
    assert.ok(first.supplierCode);
    assert.ok(first.name);
    assert.ok(first.gstin);
    testSupplierId = first.id || first._id?.toString();
  });

  it('POST /api/v1/admin/suppliers — onboards new medical equipment vendor in pending review state', async () => {
    const newVendorPhone = '9822099777';
    await Supplier.deleteMany({
      $or: [{ phone: newVendorPhone }, { gstin: '27AABCS1234D1Z8' }],
    });

    const payload = {
      name: 'Sahyadri MedTech Solutions',
      contactPerson: 'Milind Ranade',
      phone: newVendorPhone,
      email: 'sales@sahyadrimedtech.in',
      address: 'Shop 4, Deccan Gymkhana',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411004',
      gstin: '27AABCS1234D1Z8',
      pan: 'AABCS1234D',
      bankDetails: {
        accountName: 'Sahyadri MedTech Solutions Pvt Ltd',
        accountNumber: '112233445566',
        ifsc: 'SBIN0001234',
        bankName: 'State Bank of India',
      },
      sourcingType: 'own_stock',
    };

    const res = await request(app)
      .post('/api/v1/admin/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.verificationStatus, 'pending_review');
    assert.equal(res.body.data.name, 'Sahyadri MedTech Solutions');
    testSupplierId = res.body.data.id || res.body.data._id?.toString();
  });

  it('POST /api/v1/admin/suppliers/:id/verify — admin verifies supplier with review notes', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/suppliers/${testSupplierId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'verified',
        notes: 'GSTIN, drug license, and quality certifications verified against state portal.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.verificationStatus, 'verified');
    assert.ok(res.body.data.verifiedAt);
  });

  // ---------------------------------------------------------------------------
  // 2. SUPPLIER PURCHASE ORDERS & INVENTORY REPLENISHMENT
  // ---------------------------------------------------------------------------
  it('GET /api/v1/admin/purchase-orders — lists procurement orders', async () => {
    const res = await request(app)
      .get('/api/v1/admin/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1, 'Should return seeded purchase orders');
  });

  it('POST /api/v1/admin/purchase-orders — creates procurement order with item costs', async () => {
    const product = await MedicalProduct.findOne({ isActive: true });
    assert.ok(product, 'A medical product must exist');
    testProductId = (product._id as any).toString();

    const payload = {
      supplierId: testSupplierId,
      items: [
        {
          productId: testProductId,
          quantity: 5,
          procurementCostPerUnit: 1200,
        },
      ],
      notes: 'Initial restock batch for testing',
      paymentDueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
    };

    const res = await request(app)
      .post('/api/v1/admin/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.totalProcurementCost, 6000);
    assert.equal(res.body.data.paymentStatus, 'pending');
    assert.equal(res.body.data.deliveryStatus, 'ordered');
    testPOId = res.body.data.id || res.body.data._id;
  });

  it('PUT /api/v1/admin/purchase-orders/:id — receiving PO replenishes product inventory', async () => {
    const productBefore = await MedicalProduct.findById(testProductId);
    const initialStock = productBefore?.stockQuantity || 0;

    const res = await request(app)
      .put(`/api/v1/admin/purchase-orders/${testPOId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deliveryStatus: 'received',
        paidAmount: 6000,
        paymentStatus: 'settled',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.deliveryStatus, 'received');
    assert.equal(res.body.data.paymentStatus, 'settled');

    // Verify stock incremented by 5
    const productAfter = await MedicalProduct.findById(testProductId);
    assert.equal(productAfter?.stockQuantity, initialStock + 5, 'Stock quantity should be incremented upon receiving PO');
  });

  // ---------------------------------------------------------------------------
  // 3. CAREGIVER SUBSCRIPTIONS & VISIT PACKAGES
  // ---------------------------------------------------------------------------
  it('GET /api/v1/admin/caregiver-plans — lists available care plans and packages', async () => {
    const res = await request(app)
      .get('/api/v1/admin/caregiver-plans')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 2, 'Should return seeded care plans');

    testPlanId = res.body.data[0]._id || res.body.data[0].id;
  });

  it('POST /api/v1/admin/caregiver-plans — creates new monthly palliative package', async () => {
    const payload = {
      title: 'Palliative Comfort & Respite Care (20-Visit Package)',
      planType: 'fixed_visit_package',
      category: 'palliative',
      durationDays: 30,
      totalVisitsIncluded: 20,
      hoursPerVisit: 4,
      customerPrice: 18000,
      caregiverPayout: 12000,
      description: 'Comprehensive symptom surveillance and bedside comfort bundle.',
      features: ['20 home nurse visits', 'Daily vitals recording', 'Family portal sync'],
    };

    const res = await request(app)
      .post('/api/v1/admin/caregiver-plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.customerPrice, 18000);
    assert.equal(res.body.data.caregiverPayout, 12000);
  });

  it('GET /api/v1/admin/caregiver-subscriptions — lists patient subscriptions with visits balance', async () => {
    const res = await request(app)
      .get('/api/v1/admin/caregiver-subscriptions')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1, 'Should return active subscriptions');

    const sub = res.body.data.find((s: any) => s.status === 'active' && s.visitsRemaining > 5) || res.body.data[0];
    assert.ok(sub.subscriptionNumber);
    assert.ok(typeof sub.visitsRemaining === 'number');
    testSubscriptionId = sub._id || sub.id;
  });

  it('POST /api/v1/admin/caregiver-subscriptions/:id/assign — assigns caregiver to subscription', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/caregiver-subscriptions/${testSubscriptionId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        caregiverUserId,
        notes: 'Assigned Sister Sunita Deshpande for daily palliative care shifts.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.assignedCaregiverName, 'Sister Sunita Deshpande');
  });

  it('POST /api/v1/admin/caregiver-subscriptions/:id/record-visit — decrements remaining visits balance', async () => {
    const subBefore = await CaregiverSubscription.findById(testSubscriptionId);
    const remainingBefore = subBefore?.visitsRemaining || 0;
    const completedBefore = subBefore?.visitsCompleted || 0;

    const res = await request(app)
      .post(`/api/v1/admin/caregiver-subscriptions/${testSubscriptionId}/record-visit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        notes: 'Administered nebulization and completed wound dressing. Patient stable.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.visitsCompleted, completedBefore + 1);
    assert.equal(res.body.data.visitsRemaining, remainingBefore - 1);
  });

  it('POST /api/v1/admin/caregiver-subscriptions/activate — creates and activates a new patient caregiver subscription', async () => {
    const res = await request(app)
      .post('/api/v1/admin/caregiver-subscriptions/activate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: patientUserId,
        planId: testPlanId,
        assignedCaregiverId: caregiverUserId,
        emergencyContact: {
          name: 'Sunita Kulkarni',
          phone: '9820044552',
          relation: 'Wife',
        },
        carePlanNotes: 'Palliative respiratory support protocol.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'active');
    assert.ok(res.body.data.visitsRemaining > 0);
    activatedSubId = res.body.data._id || res.body.data.id;
  });

  it('POST /api/v1/admin/caregiver-subscriptions/:id/record-visit — enforces duplicate visit protection with idempotency key', async () => {
    const key = `VISIT-IDEMP-${Date.now()}`;
    const res1 = await request(app)
      .post(`/api/v1/admin/caregiver-subscriptions/${testSubscriptionId}/record-visit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'First visit log', visitIdempotencyKey: key });

    assert.equal(res1.status, 200);
    const visitsCompleted = res1.body.data.visitsCompleted;

    // Immediate duplicate replay with same key must not decrement twice
    const res2 = await request(app)
      .post(`/api/v1/admin/caregiver-subscriptions/${testSubscriptionId}/record-visit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Duplicate replay', visitIdempotencyKey: key });

    assert.equal(res2.status, 200);
    assert.equal(res2.body.data.visitsCompleted, visitsCompleted, 'Duplicate visit submission must not decrement balance twice');
  });

  it('POST /api/v1/admin/caregiver-subscriptions/:id/cancel — cancels subscription and forbids further visit deductions', async () => {
    const targetSubId = activatedSubId || testSubscriptionId;
    const resCancel = await request(app)
      .post(`/api/v1/admin/caregiver-subscriptions/${targetSubId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Patient admitted to inpatient hospice ward' });

    assert.equal(resCancel.status, 200);
    assert.equal(resCancel.body.data.status, 'cancelled');

    // Attempting to record visit against cancelled subscription must be rejected with 400
    const resForbiddenVisit = await request(app)
      .post(`/api/v1/admin/caregiver-subscriptions/${targetSubId}/record-visit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Post-cancellation attempt' });

    assert.equal(resForbiddenVisit.status, 400);
    const errText = resForbiddenVisit.body.error?.message || resForbiddenVisit.body.error || resForbiddenVisit.body.message;
    assert.match(errText, /cancelled/i);
  });

  // ---------------------------------------------------------------------------
  // 4. FINANCIAL ACCURACY (CALCULATED ON THE SERVER)
  // ---------------------------------------------------------------------------
  it('GET /api/v1/admin/finances/summary — calculates sales revenue, procurement cost, liabilities, and gross profit accurately', async () => {
    const res = await request(app)
      .get('/api/v1/admin/finances/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const { revenue, costsAndLiabilities, profitability } = res.body.data;

    // 1. Customer sales revenue must equal product sales + subscription revenue
    assert.equal(
      revenue.totalGrossSalesRevenue,
      revenue.productSalesRevenue + revenue.caregiverSubscriptionRevenue,
      'Total gross sales revenue must be the exact sum of product sales and caregiver subscriptions'
    );

    // 2. Sourcing / procurement costs must be strictly separate liabilities and NEVER counted as sales revenue
    assert.ok(
      typeof costsAndLiabilities.equipmentProcurementCost === 'number',
      'Equipment procurement cost must be tracked'
    );
    assert.ok(
      typeof costsAndLiabilities.caregiverPayoutLiabilities === 'number',
      'Caregiver payout liabilities must be tracked'
    );
    assert.ok(
      typeof costsAndLiabilities.supplierPayablesPending === 'number',
      'Pending supplier liabilities must be tracked'
    );
    assert.ok(
      typeof costsAndLiabilities.refundsProcessed === 'number',
      'Refunds must be tracked'
    );

    // 3. Profit calculation must match: revenue - procurement - caregiver payouts - refunds - gateway fees
    const expectedGrossProfit =
      revenue.totalGrossSalesRevenue -
      costsAndLiabilities.equipmentProcurementCost -
      costsAndLiabilities.caregiverPayoutLiabilities -
      costsAndLiabilities.refundsProcessed -
      costsAndLiabilities.paymentGatewayFees;

    assert.equal(
      profitability.estimatedGrossProfit,
      expectedGrossProfit,
      'Estimated gross profit must accurately subtract costs, caregiver payouts, refunds, and gateway fees from sales revenue'
    );
  });

  // ---------------------------------------------------------------------------
  // 5. DOCUMENT EXPIRY ALERTS & CLINICIAN DIRECTORY
  // ---------------------------------------------------------------------------
  it('GET /api/v1/admin/credentials/expiry-alerts — returns credential expiration surveillance alerts', async () => {
    const res = await request(app)
      .get('/api/v1/admin/credentials/expiry-alerts')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.alerts));
    assert.ok(typeof res.body.data.summary.totalAlerts === 'number');
    assert.ok(typeof res.body.data.summary.expiredCount === 'number');
  });

  it('GET /api/v1/admin/professionals — lists doctors, nurses, and caregivers with credential stats', async () => {
    const res = await request(app)
      .get('/api/v1/admin/professionals')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);

    const prof = res.body.data[0];
    assert.ok(prof.fullName);
    assert.ok(prof.professionType);
    assert.ok(typeof prof.credentialsCount === 'number');
  });

  // ---------------------------------------------------------------------------
  // 6. ORDER REFUND PROCESSING
  // ---------------------------------------------------------------------------
  it('POST /api/v1/admin/orders/:id/refund — processes return refund and updates financial status', async () => {
    // Find or create an order to refund
    let order = await ProductOrder.findOne();
    if (!order) {
      order = await ProductOrder.create({
        orderNumber: 'VQ-ORD-REFUND-001',
        patientId: new mongoose.Types.ObjectId(patientUserId),
        patientName: 'Ramesh Kulkarni',
        patientPhone: patientPhone,
        items: [
          {
            productId: new mongoose.Types.ObjectId(testProductId),
            sku: 'DME-TEST-01',
            title: 'Test Unit',
            category: 'mobility',
            quantity: 1,
            unitPrice: 2000,
            isRental: false,
            setupRequired: false,
          },
        ],
        pricing: {
          subtotal: 2000,
          deliveryFee: 0,
          taxGst: 240,
          totalAmount: 2240,
        },
        deliveryAddress: {
          street: '123 MG Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
        },
        clinicalSetup: { isSetupRequired: false, setupStatus: 'not_required' },
        orderStatus: 'delivered',
        paymentStatus: 'paid',
        paymentMethod: 'online',
        isDemo: true,
      });
    }

    testOrderId = (order._id as any).toString();
    const refundAmt = Math.min(order.pricing.totalAmount, 2240);

    const res = await request(app)
      .post(`/api/v1/admin/orders/${testOrderId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        refundAmount: refundAmt,
        reason: 'Equipment returned due to patient hospital readmission.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.paymentStatus, 'refunded');
    assert.equal(res.body.data.pricing.refundAmount, refundAmt);
  });
});
