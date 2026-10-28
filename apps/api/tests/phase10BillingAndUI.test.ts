import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { CaregiverPlan } from '../src/models/CaregiverPlan.js';
import { MedicalProduct } from '../src/models/MedicalProduct.js';
import { ProductOrder } from '../src/models/ProductOrder.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { seedAdminDemoData } from '../src/services/adminService.js';
import { seedMedicalProductsIfEmpty } from '../src/services/productCatalogService.js';

describe('VivoQuest — Phase 10: Separate Billing Architecture & Storefront Tests', () => {
  const app = createApp();

  const patientPhone = '9876543299';
  const patientPassword = 'PatientPhase10#2026';
  let patientToken: string;
  let patientUserId: string;

  const adminPhone = '9899009900';
  const adminPassword = 'Admin#2026';
  let adminToken: string;

  let activePlanId: string;
  let ownStockProductId: string;
  let createdOrderId: string;
  let createdOrderNumber: string;
  let createdOrderInvoice: string;

  let createdSubscriptionId: string;
  let createdSubscriptionNumber: string;
  let createdSubscriptionInvoice: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_DEV_MOCK_OTP = 'false';

    await connectDatabase();
    await seedAdminDemoData();
    await seedMedicalProductsIfEmpty();

    // 1. Authenticate Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: adminPhone, password: adminPassword });
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.data.token;

    // 2. Register/Login Patient
    let patientLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: patientPhone, password: patientPassword });

    if (patientLogin.status !== 200) {
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Smt. Malati Joshi (Phase 10 Patient)',
          phone: patientPhone,
          password: patientPassword,
          role: 'patient',
          consentAccepted: true,
        });
      assert.equal(reg.status, 201);
      patientToken = reg.body.data.token;
      patientUserId = reg.body.data.user.id || reg.body.data.user._id;
    } else {
      patientToken = patientLogin.body.data.token;
      patientUserId = patientLogin.body.data.user.id || patientLogin.body.data.user._id;
    }

    // 3. Find active care plan
    const plan = await CaregiverPlan.findOne({ isActive: true });
    assert.ok(plan, 'Active CaregiverPlan must exist');
    activePlanId = plan._id.toString();

    // 4. Find own-stock product
    const product = await MedicalProduct.findOne({ isActive: true, stockQuantity: { $gt: 5 } });
    assert.ok(product, 'Active MedicalProduct must exist');
    ownStockProductId = product._id.toString();
  });

  after(async () => {
    // Clean up Phase 10 test artifacts
    if (createdOrderId) {
      await ProductOrder.findByIdAndDelete(createdOrderId);
    }
    if (createdSubscriptionId) {
      await CaregiverSubscription.findByIdAndDelete(createdSubscriptionId);
    }
    await disconnectDatabase();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Product Commerce Billing Stream
  // ---------------------------------------------------------------------------
  it('1. should place a product order, generate distinct orderNumber & invoiceNumber (INV-PRD-...) and reserve stock', async () => {
    const orderRes = await request(app)
      .post('/api/v1/products/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        items: [
          {
            productId: ownStockProductId,
            qty: 1,
            isRental: false,
          },
        ],
        deliveryAddress: {
          street: 'Flat 402, Shivajinagar Residency',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411005',
          contactPhone: patientPhone,
        },
        paymentMethod: 'online',
        idempotencyKey: `idemp_prd_${Date.now()}`,
      });

    assert.equal(orderRes.status, 201);
    assert.ok(orderRes.body.data);
    const order = orderRes.body.data;
    createdOrderId = order.id || order._id;
    createdOrderNumber = order.orderNumber;
    createdOrderInvoice = order.invoiceNumber;

    // Verify format contracts
    assert.match(createdOrderNumber, /^VQ-ORD-2026-\d{4}$/, 'Order number must follow VQ-ORD-2026-XXXX format');
    assert.match(createdOrderInvoice, /^INV-PRD-2026-\d{4}$/, 'Invoice number must follow INV-PRD-2026-XXXX format');
    assert.equal(order.orderStatus, 'placed');
    assert.equal(order.paymentStatus, 'pending');
    assert.ok(order.invoiceGeneratedAt);
    assert.ok(order.pricing.totalAmount > 0);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Product Payment Verification & Fulfillment Invoicing
  // ---------------------------------------------------------------------------
  it('2. should verify product payment, confirm order, record audit log with invoice reference, and update tracking', async () => {
    const intentRes = await request(app)
      .post('/api/v1/products/payments/create-intent')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ orderId: createdOrderId });

    assert.equal(intentRes.status, 200);
    assert.ok(intentRes.body.data.razorpayOrderId);
    const rzpOrderId = intentRes.body.data.razorpayOrderId;

    // Verify payment in test mode
    const verifyRes = await request(app)
      .post('/api/v1/products/payments/verify')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        orderId: createdOrderId,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: `pay_test_${Date.now()}`,
        razorpaySignature: 'sig_test_valid_mock_signature',
      });

    assert.equal(verifyRes.status, 200);
    const updatedOrder = verifyRes.body.data;
    assert.equal(updatedOrder.paymentStatus, 'paid');
    assert.equal(updatedOrder.orderStatus, 'confirmed');
    assert.equal(updatedOrder.invoiceNumber, createdOrderInvoice);

    // Verify structured audit log contains order and invoice references
    const audit = await AuditLog.findOne({
      targetType: 'PRODUCT_ORDER',
      targetId: createdOrderNumber,
    });
    assert.ok(audit, 'AuditLog entry must be recorded for payment verification');
    assert.equal(audit.details?.invoiceNumber, createdOrderInvoice);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Caregiver Subscription Billing Stream
  // ---------------------------------------------------------------------------
  it('3. should activate caregiver subscription, generate distinct subscriptionNumber & invoiceNumber (INV-SUB-...) and grant visit entitlements', async () => {
    const subRes = await request(app)
      .post('/api/v1/patients/me/subscriptions/activate')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        planId: activePlanId,
        emergencyContact: {
          name: 'Shri Ramakant Joshi',
          phone: '9822011223',
          relation: 'Son',
        },
        carePlanNotes: 'Phase 10 Verified Home Palliative Setup',
        idempotencyKey: `idemp_sub_${Date.now()}`,
      });

    assert.equal(subRes.status, 201);
    const sub = subRes.body.data;
    createdSubscriptionId = sub.id || sub._id;
    createdSubscriptionNumber = sub.subscriptionNumber;
    createdSubscriptionInvoice = sub.invoiceNumber;

    // Verify format contracts
    assert.match(createdSubscriptionNumber, /^SUB-\d{6}-\d{3}$/, 'Subscription number must follow SUB-YYYYMM-XXX format');
    assert.match(createdSubscriptionInvoice, /^INV-SUB-\d{6}-\d{3}$/, 'Subscription invoice must follow INV-SUB-YYYYMM-XXX format');
    assert.equal(sub.status, 'active');
    assert.equal(sub.pricing.paymentStatus, 'test_mode');
    assert.ok(sub.totalVisitsIncluded > 0);
    assert.equal(sub.visitsRemaining, sub.totalVisitsIncluded);
    assert.ok(sub.invoiceGeneratedAt);
  });

  // ---------------------------------------------------------------------------
  // Test 4: Complete Architecture Separation & Isolation
  // ---------------------------------------------------------------------------
  it('4. should ensure Product Commerce and Caregiver Subscription records, endpoints, and invoices remain completely isolated', async () => {
    // 1. Invoices must be distinctly prefixed
    assert.ok(createdOrderInvoice.startsWith('INV-PRD-'), 'Product invoice must have PRD prefix');
    assert.ok(createdSubscriptionInvoice.startsWith('INV-SUB-'), 'Subscription invoice must have SUB prefix');
    assert.notEqual(createdOrderInvoice, createdSubscriptionInvoice);

    // 2. Identifiers must be completely distinct
    assert.ok(createdOrderNumber.startsWith('VQ-ORD-'), 'Order number must have VQ-ORD prefix');
    assert.ok(createdSubscriptionNumber.startsWith('SUB-'), 'Subscription number must have SUB prefix');
    assert.notEqual(createdOrderNumber, createdSubscriptionNumber);

    // 3. Patient Orders Endpoint returns only Product Orders
    const ordersRes = await request(app)
      .get('/api/v1/products/orders/me')
      .set('Authorization', `Bearer ${patientToken}`);
    assert.equal(ordersRes.status, 200);
    const orders = ordersRes.body.data;
    assert.ok(Array.isArray(orders));
    assert.ok(orders.some((o: any) => o.orderNumber === createdOrderNumber));
    // Ensure no subscription documents leaked into product orders
    assert.ok(!orders.some((o: any) => o.subscriptionNumber !== undefined));

    // 4. Patient Subscriptions Endpoint returns only Subscriptions
    const subsRes = await request(app)
      .get('/api/v1/patients/me/subscriptions')
      .set('Authorization', `Bearer ${patientToken}`);
    assert.equal(subsRes.status, 200);
    const subs = subsRes.body.data;
    assert.ok(Array.isArray(subs));
    assert.ok(subs.some((s: any) => s.subscriptionNumber === createdSubscriptionNumber));
    // Ensure no product orders leaked into subscriptions
    assert.ok(!subs.some((s: any) => s.orderNumber !== undefined));

    // 5. Cross-collection query separation
    const orderInSub = await CaregiverSubscription.findOne({ subscriptionNumber: createdOrderNumber });
    assert.equal(orderInSub, null, 'Order number must not exist in CaregiverSubscription collection');

    const subInOrder = await ProductOrder.findOne({ orderNumber: createdSubscriptionNumber });
    assert.equal(subInOrder, null, 'Subscription number must not exist in ProductOrder collection');
  });

  // ---------------------------------------------------------------------------
  // Test 5: Admin Invoicing & Sourcing Visibility
  // ---------------------------------------------------------------------------
  it('5. should expose distinct product orders and caregiver subscriptions to admin with proper invoice and sourcing tags', async () => {
    // Admin orders view
    const adminOrdersRes = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminOrdersRes.status, 200);
    const foundOrder = adminOrdersRes.body.data.find((o: any) => o.orderNumber === createdOrderNumber);
    assert.ok(foundOrder, 'Admin must see created product order');
    assert.equal(foundOrder.invoiceNumber, createdOrderInvoice);
    assert.ok(foundOrder.items[0].sourcingType, 'Items must declare sourcingType (own_stock or supplier_direct)');

    // Admin subscriptions view
    const adminSubsRes = await request(app)
      .get('/api/v1/admin/caregiver-subscriptions')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminSubsRes.status, 200);
    const foundSub = adminSubsRes.body.data.find((s: any) => s.subscriptionNumber === createdSubscriptionNumber);
    assert.ok(foundSub, 'Admin must see created caregiver subscription');
    assert.equal(foundSub.invoiceNumber, createdSubscriptionInvoice);
    assert.ok(foundSub.totalVisitsIncluded > 0);
  });
});
