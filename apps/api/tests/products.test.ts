import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User, MedicalProduct, ProductOrder, AuditLog } from '../src/models/index.js';

describe('Medical Products & DME Commerce Test Suite', () => {
  const app = createApp();

  let patientAToken: string;
  let patientAUserId: string;
  const patientAPhone = '9877001122';

  let patientBToken: string;
  let patientBUserId: string;
  const patientBPhone = '9877001133';

  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9877009900';

  let testProductId: string;
  let testProductSku: string;
  let createdOrderId: string;
  let createdOrderNumber: string;

  before(async () => {
    await connectDatabase();

    // Clean up test-specific users and orders
    await User.deleteMany({ phone: { $in: [patientAPhone, patientBPhone, adminPhone] } });
    await ProductOrder.deleteMany({ patientPhone: { $in: [patientAPhone, patientBPhone] } });
    await MedicalProduct.updateMany({}, { $set: { reservedQuantity: 0 } });

    // Register Patient A
    const regARes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Test Patient Suman',
        phone: patientAPhone,
        email: 'suman.patient@vivoquest.in',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(regARes.status, 201);
    patientAToken = regARes.body.data.token;
    patientAUserId = regARes.body.data.user.id;

    // Register Patient B
    const regBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Test Patient Bipin',
        phone: patientBPhone,
        email: 'bipin.patient@vivoquest.in',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(regBRes.status, 201);
    patientBToken = regBRes.body.data.token;
    patientBUserId = regBRes.body.data.user.id;

    // Register Admin Staff
    const regAdminRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Fulfillment Lead Anjali',
        phone: adminPhone,
        email: 'anjali.admin@vivoquest.in',
        role: 'admin',
        consentAccepted: true,
      });
    assert.equal(regAdminRes.status, 201);
    adminToken = regAdminRes.body.data.token;
    adminUserId = regAdminRes.body.data.user.id;
  });

  after(async () => {
    await User.deleteMany({ phone: { $in: [patientAPhone, patientBPhone, adminPhone] } });
    await ProductOrder.deleteMany({ patientPhone: { $in: [patientAPhone, patientBPhone] } });
    await disconnectDatabase();
  });

  describe('1. Medical Product Catalog & Discovery', () => {
    it('should list medical products and auto-seed demo DME across required categories', async () => {
      const res = await request(app).get('/api/v1/products');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 8, 'Should have seeded at least 8 products across categories');

      testProductId = res.body.data[0].id || res.body.data[0]._id;
      testProductSku = res.body.data[0].sku;
    });

    it('should retrieve list of valid product categories covering all clinical domains', async () => {
      const res = await request(app).get('/api/v1/products/categories');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      const categories = res.body.data.map((c: any) => c.id);
      assert.ok(categories.includes('mobility'));
      assert.ok(categories.includes('respiratory'));
      assert.ok(categories.includes('monitoring_diagnostics'));
      assert.ok(categories.includes('icu_home_setup'));
      assert.ok(categories.includes('clinical_nutrition'));
      assert.ok(categories.includes('fall_prevention'));
    });

    it('should filter products by category (mobility)', async () => {
      const res = await request(app).get('/api/v1/products?category=mobility');

      assert.equal(res.status, 200);
      res.body.data.forEach((p: any) => {
        assert.equal(p.category, 'mobility');
      });
    });

    it('should filter products by rental availability', async () => {
      const res = await request(app).get('/api/v1/products?rentalOnly=true');

      assert.equal(res.status, 200);
      res.body.data.forEach((p: any) => {
        assert.equal(p.isRentalAvailable, true);
        assert.ok(typeof p.rentalPriceMonthly === 'number');
      });
    });

    it('should fetch product details by SKU', async () => {
      const res = await request(app).get(`/api/v1/products/${testProductSku}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.sku, testProductSku);
      assert.ok(res.body.data.price > 0);
    });
  });

  describe('2. Persistent Shopping Cart & Revalidation', () => {
    it('should validate cart items against backend prices and stock', async () => {
      const product = await MedicalProduct.findOne({ stockQuantity: { $gt: 5 } });
      assert.ok(product);

      // Try sending tampered unitPrice from client: backend must override with true price!
      const res = await request(app)
        .post('/api/v1/products/cart/validate')
        .send({
          items: [
            {
              productId: product._id.toString(),
              quantity: 2,
              unitPrice: 1, // Tampered price attempt
            },
          ],
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.items[0].unitPrice, product.price, 'Must use official product price');
      assert.equal(res.body.data.pricing.subtotal, product.price * 2);
      assert.ok(res.body.data.pricing.totalAmount > res.body.data.pricing.subtotal);
    });

    it('should save and sync persistent cart for signed-in patient', async () => {
      const product = await MedicalProduct.findOne({ isRentalAvailable: true });
      assert.ok(product);

      const res = await request(app)
        .put('/api/v1/products/cart')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          items: [
            {
              productId: product._id.toString(),
              quantity: 1,
              isRental: true,
              rentalDurationMonths: 3,
            },
          ],
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.items.length, 1);
      assert.equal(res.body.data.items[0].isRental, true);
      assert.equal(res.body.data.items[0].rentalDurationMonths, 3);
    });

    it('should retrieve persistent cart for signed-in patient', async () => {
      const res = await request(app)
        .get('/api/v1/products/cart')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.items.length >= 1);
      assert.ok(res.body.data.pricing.totalAmount > 0);
    });

    it('should adjust quantity when requested item exceeds available stock', async () => {
      const lowStockProduct = await MedicalProduct.findOne({ stockQuantity: { $gt: 0, $lt: 20 } });
      assert.ok(lowStockProduct);

      const res = await request(app)
        .post('/api/v1/products/cart/validate')
        .send({
          items: [
            {
              productId: lowStockProduct._id.toString(),
              quantity: 9999, // Exceeds stock
            },
          ],
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.items[0].quantity, lowStockProduct.stockQuantity);
      assert.ok(res.body.data.warnings.length > 0);
    });
  });

  describe('3. Order Placement, Stock Deduction & Duplicate Protection', () => {
    it('should reject order if requested quantity exceeds available stock', async () => {
      const product = await MedicalProduct.findOne({ stockQuantity: { $gt: 0 } });
      assert.ok(product);

      const res = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          items: [{ productId: product._id.toString(), quantity: product.stockQuantity + 50 }],
          deliveryAddress: {
            street: '123 Main St',
            city: 'Pune',
            pincode: '411038',
          },
        });

      assert.equal(res.status, 400);
      assert.match(res.body.error.message, /Insufficient stock/i);
    });

    it('should allow authenticated patient to place an order and deduct stock', async () => {
      const dmeProduct = await MedicalProduct.findOne({
        setupRequiredByClinician: true,
        stockQuantity: { $gt: 2 },
      });
      assert.ok(dmeProduct, 'Must have at least one product requiring setup');

      const initialStock = dmeProduct.stockQuantity;

      const idempotencyKey = `idemp-test-${Date.now()}`;
      const payload = {
        idempotencyKey,
        items: [
          {
            productId: dmeProduct._id.toString(),
            quantity: 2,
            isRental: dmeProduct.isRentalAvailable,
            rentalDurationMonths: dmeProduct.isRentalAvailable ? 2 : undefined,
          },
        ],
        deliveryAddress: {
          street: 'Flat 402, Mayur Residency, Kothrud',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411038',
          contactPhone: patientAPhone,
        },
        paymentMethod: 'online',
      };

      const res = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.orderNumber.startsWith('VQ-ORD-'));
      assert.equal(res.body.data.clinicalSetup.isSetupRequired, true);
      assert.equal(res.body.data.clinicalSetup.setupStatus, 'pending');
      assert.equal(res.body.data.paymentStatus, 'pending', 'Online orders must start as pending payment');

      createdOrderId = res.body.data._id || res.body.data.id;
      createdOrderNumber = res.body.data.orderNumber;

      // Verify stock was deducted and atomically reserved
      const updatedProduct = await MedicalProduct.findById(dmeProduct._id);
      assert.equal(updatedProduct?.stockQuantity, initialStock - 2, 'Stock must be decremented');
      assert.equal(updatedProduct?.reservedQuantity, 2, 'Reserved quantity must be incremented atomically');
    });

    it('should safely handle concurrent orders without overselling under contention', async () => {
      // Create a test product with exactly 3 in stock
      const limitedProduct = await MedicalProduct.create({
        sku: `CONCUR-TEST-${Date.now()}`,
        title: 'Limited Stock DME Device',
        category: 'mobility',
        description: 'Testing concurrency safety',
        price: 5000,
        stockQuantity: 3,
        reservedQuantity: 0,
        requiresPrescription: false,
        setupRequiredByClinician: false,
        isActive: true,
      });

      // Fire 5 concurrent requests each attempting to order 1 unit
      const promises = Array.from({ length: 5 }, (_, idx) =>
        request(app)
          .post('/api/v1/products/orders')
          .set('Authorization', `Bearer ${patientAToken}`)
          .send({
            idempotencyKey: `CONCUR-IDEM-${Date.now()}-${idx}`,
            items: [{ productId: limitedProduct._id.toString(), quantity: 1 }],
            deliveryAddress: {
              street: `${idx} Race Condition St`,
              city: 'Pune',
              pincode: '411038',
            },
          })
      );

      const results = await Promise.all(promises);
      const successfulOrders = results.filter((r) => r.status === 201);
      const rejectedOrders = results.filter((r) => r.status === 400);

      // Exactly 3 must succeed and exactly 2 must be rejected
      assert.equal(successfulOrders.length, 3, 'Exactly 3 orders can succeed for stock of 3');
      assert.equal(rejectedOrders.length, 2, 'Remaining 2 orders must be safely rejected');

      // Final stock must be exactly 0, reservedQuantity exactly 3 (never negative!)
      const finalProduct = await MedicalProduct.findById(limitedProduct._id);
      assert.equal(finalProduct?.stockQuantity, 0, 'Stock must reach 0 and never go negative');
      assert.equal(finalProduct?.reservedQuantity, 3, 'Reserved quantity must equal allocated units');
    });

    it('should return existing order when submitting duplicate idempotency key', async () => {
      const order = await ProductOrder.findById(createdOrderId);
      assert.ok(order);

      const payload = {
        idempotencyKey: order.idempotencyKey,
        items: [{ productId: order.items[0].productId.toString(), quantity: 1 }],
        deliveryAddress: order.deliveryAddress,
      };

      const res = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send(payload);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.orderNumber, order.orderNumber, 'Must return identical order');
    });

    it('should list orders for Patient A in GET /api/v1/products/orders/me', async () => {
      const res = await request(app)
        .get('/api/v1/products/orders/me')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
    });

    it('CRITICAL: should FORBID Patient B from viewing Patient A order (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/products/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${patientBToken}`);

      assert.equal(res.status, 403, 'Cross-patient order access must be forbidden');
    });
  });

  describe('4. Payment Integration & Cryptographic Verification', () => {
    it('should return payment gateway public config with test mode notice', async () => {
      const res = await request(app).get('/api/v1/products/payments/config');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok('isConfigured' in res.body.data);
      assert.ok('mode' in res.body.data);
      assert.ok(!res.body.data.secretKey, 'Must never expose secret key');
    });

    it('should create payment order intent for pending order', async () => {
      const res = await request(app)
        .post('/api/v1/products/payments/create-intent')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({ orderId: createdOrderId });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.razorpayOrderId.startsWith('rzp_'));
      assert.ok(res.body.data.amount > 0);
    });

    it('should verify payment signature and transition paymentStatus to paid', async () => {
      const orderBefore = await ProductOrder.findById(createdOrderId);
      assert.ok(orderBefore);

      const rzpOrderId = orderBefore.paymentDetails?.razorpayOrderId || `rzp_test_ord_${Date.now()}`;
      const rzpPaymentId = `pay_test_${Date.now()}`;
      const rzpSignature = `test_sig_${rzpOrderId}_${rzpPaymentId}`;

      const res = await request(app)
        .post('/api/v1/products/payments/verify')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          orderId: createdOrderId,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          razorpaySignature: rzpSignature,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.paymentStatus, 'paid');
      assert.equal(res.body.data.orderStatus, 'confirmed');

      // Verify audit log entry was created
      const audit = await AuditLog.findOne({
        action: 'PAYMENT_VERIFIED',
        targetId: orderBefore.orderNumber,
      });
      assert.ok(audit, 'Audit log must record payment verification');
    });

    it('should reject payment verification attempt by unauthorized patient (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/products/payments/verify')
        .set('Authorization', `Bearer ${patientBToken}`)
        .send({
          orderId: createdOrderId,
          razorpayOrderId: 'rzp_test',
          razorpayPaymentId: 'pay_test',
          razorpaySignature: 'sig_test',
        });

      assert.equal(res.status, 403);
    });
  });

  describe('5. Order Actions: Setup Scheduling, Cancellation & Return Rules', () => {
    it('should allow patient to schedule clinician setup slot', async () => {
      const setupDate = new Date(Date.now() + 86400000 * 2).toISOString();

      const res = await request(app)
        .patch(`/api/v1/products/orders/${createdOrderId}/setup-schedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          setupDate,
          setupSlot: 'Morning (9:00 AM - 1:00 PM)',
          setupNotes: 'Patient is wheelchair-bound, please ring ground floor bell.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.clinicalSetup.setupStatus, 'scheduled');
    });

    it('should reject patient return request if order is not delivered', async () => {
      const res = await request(app)
        .post(`/api/v1/products/orders/${createdOrderId}/return-request`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({ reason: 'Equipment not needed' });

      assert.equal(res.status, 400);
      assert.match(res.body.error.message, /only be requested for delivered/i);
    });

    it('should allow patient to cancel order in confirmed status and restore inventory', async () => {
      const order = await ProductOrder.findById(createdOrderId);
      assert.ok(order);
      const testItem = order.items[0];
      const prodBefore = await MedicalProduct.findById(testItem.productId);
      const stockBefore = prodBefore?.stockQuantity || 0;

      const res = await request(app)
        .post(`/api/v1/products/orders/${createdOrderId}/cancel`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({ reason: 'Doctor revised clinical prescription' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.orderStatus, 'cancelled');
      assert.equal(res.body.data.cancellation.isCancelled, true);

      // Verify stock was restored and reservation released
      const prodAfter = await MedicalProduct.findById(testItem.productId);
      assert.equal(prodAfter?.stockQuantity, stockBefore + testItem.quantity, 'Reserved stock restored');
      assert.equal(prodAfter?.reservedQuantity, 0, 'Reserved quantity must be released on cancellation');
    });

    it('should reject cancelling an already cancelled order', async () => {
      const res = await request(app)
        .post(`/api/v1/products/orders/${createdOrderId}/cancel`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({ reason: 'Try cancel again' });

      assert.equal(res.status, 400);
    });
  });

  describe('6. Staff Fulfillment & Permitted Status Transitions', () => {
    let fulfillmentOrderId: string;

    before(async () => {
      // Create a fresh order for fulfillment workflow
      const prod = await MedicalProduct.findOne({ stockQuantity: { $gt: 2 } });
      assert.ok(prod);

      const orderRes = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          items: [{ productId: prod._id.toString(), quantity: 1 }],
          deliveryAddress: { street: '456 Hill Rd', city: 'Mumbai', pincode: '400050' },
          paymentMethod: 'cod',
        });
      assert.equal(orderRes.status, 201);
      fulfillmentOrderId = orderRes.body.data._id || orderRes.body.data.id;
    });

    it('should allow authorized admin to list all platform orders', async () => {
      const res = await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
    });

    it('should forbid patient from accessing admin order management', async () => {
      const res = await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.equal(res.status, 403, 'Patients must be forbidden from admin orders');
    });

    it('should reject invalid status jump (placed -> delivered directly)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${fulfillmentOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'delivered' });

      assert.equal(res.status, 400);
      assert.match(res.body.error.message, /Invalid order status transition/i);
    });

    it('should advance order through valid lifecycle: placed -> confirmed -> dispatched -> out_for_delivery -> delivered -> completed', async () => {
      // 1. confirmed
      const res1 = await request(app)
        .patch(`/api/v1/admin/orders/${fulfillmentOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed', trackingMessage: 'Items packaged at Mumbai Hub' });
      assert.equal(res1.status, 200);
      assert.equal(res1.body.data.orderStatus, 'confirmed');

      // 2. dispatched
      const res2 = await request(app)
        .patch(`/api/v1/admin/orders/${fulfillmentOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'dispatched', trackingMessage: 'Courier picked up DME bundle' });
      assert.equal(res2.status, 200);
      assert.equal(res2.body.data.orderStatus, 'dispatched');

      // 3. out_for_delivery
      const res3 = await request(app)
        .patch(`/api/v1/admin/orders/${fulfillmentOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'out_for_delivery', trackingMessage: 'Driver out for home delivery' });
      assert.equal(res3.status, 200);
      assert.equal(res3.body.data.orderStatus, 'out_for_delivery');

      // 4. delivered (should also mark COD as paid)
      const res4 = await request(app)
        .patch(`/api/v1/admin/orders/${fulfillmentOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'delivered', trackingMessage: 'Delivered and inspected with patient' });
      assert.equal(res4.status, 200);
      assert.equal(res4.body.data.orderStatus, 'delivered');
      assert.equal(res4.body.data.paymentStatus, 'paid', 'COD payment marked paid on delivery');

      // 5. completed
      const res5 = await request(app)
        .patch(`/api/v1/admin/orders/${fulfillmentOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed', trackingMessage: 'Installation verified' });
      assert.equal(res5.status, 200);
      assert.equal(res5.body.data.orderStatus, 'completed');
    });

    it('should assign installation specialist from admin endpoint', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${fulfillmentOrderId}/setup`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          specialistName: 'Dr. Ramesh Joshi (Lead PT)',
          setupStatus: 'completed',
          setupNotes: 'Verified patient gait with walker.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.clinicalSetup.assignedSpecialistName, 'Dr. Ramesh Joshi (Lead PT)');
      assert.equal(res.body.data.clinicalSetup.setupStatus, 'completed');
    });

    it('should record delivery tracking event from admin endpoint', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/orders/${fulfillmentOrderId}/tracking`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'completed',
          message: 'Post-delivery telephone wellness check completed by clinic coordinator.',
          location: 'Central Patient Coordination Desk',
        });

      assert.equal(res.status, 200);
      const updates = res.body.data.trackingUpdates;
      assert.ok(updates.some((u: any) => u.message.includes('telephone wellness check')));
    });
  });
});
