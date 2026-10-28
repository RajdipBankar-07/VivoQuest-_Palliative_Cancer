import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { MedicalProduct } from '../src/models/MedicalProduct.js';
import { ProductOrder } from '../src/models/ProductOrder.js';

describe('VivoQuest — Patient Mobile App–First Medical Equipment Ordering Flow', () => {
  let app: any;
  let testPatientToken: string;
  let testPatientId: string;
  let otherPatientToken: string;
  let otherPatientId: string;
  let testProduct: any;

  const phonePatientA = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const phonePatientB = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  before(async () => {
    await connectDatabase();
    app = createApp();

    // Register Patient A
    const regResA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Meera Kulkarni',
        phone: phonePatientA,
        password: 'Password123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(regResA.status, 201);
    testPatientToken = regResA.body.data.token;
    testPatientId = regResA.body.data.user.id || regResA.body.data.user._id;

    // Register Patient B (for tenant isolation tests)
    const regResB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Suresh Patil',
        phone: phonePatientB,
        password: 'Password123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(regResB.status, 201);
    otherPatientToken = regResB.body.data.token;
    otherPatientId = regResB.body.data.user.id || regResB.body.data.user._id;

    // Ensure at least one test medical product exists
    testProduct = await MedicalProduct.findOne({ isActive: true, stockQuantity: { $gt: 5 } });
    if (!testProduct) {
      testProduct = await MedicalProduct.create({
        sku: 'VQ-TEST-OXY-01',
        title: 'VivoQuest High-Flow 10L Oxygen Concentrator',
        category: 'respiratory',
        price: 45000,
        sellingPrice: 38500,
        regularPrice: 45000,
        discountPercentage: 14,
        stockQuantity: 15,
        reservedQuantity: 0,
        isRentalAvailable: true,
        rentalPriceMonthly: 4500,
        rentalDeposit: 8000,
        installationEligible: true,
        installationServiceCharge: 750,
        setupRequiredByClinician: true,
        recommendedSpecialistRole: 'respiratory_therapist',
        isActive: true,
      });
    }
  });

  after(async () => {
    await disconnectDatabase();
  });

  describe('1. Public Website Product Discovery Guardrails', () => {
    it('allows guest visitors to fetch catalog products without authentication', async () => {
      const res = await request(app).get('/api/v1/products');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
    });

    it('allows guest visitors to retrieve product specifications by ID without authentication', async () => {
      const res = await request(app).get(`/api/v1/products/${testProduct._id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.title, testProduct.title);
      assert.ok(res.body.data.sellingPrice > 0);
    });

    it('allows guest visitors to validate cart pricing & 12% GST without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/products/cart/validate')
        .send({
          items: [
            {
              productId: testProduct._id.toString(),
              quantity: 1,
              isRental: false,
              installationSelected: true,
            },
          ],
        });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.pricing.subtotal > 0);
      assert.ok(res.body.data.pricing.taxGst > 0);
    });

    it('strictly forbids unauthenticated order placement with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/products/orders')
        .send({
          items: [
            {
              productId: testProduct._id.toString(),
              quantity: 1,
            },
          ],
          deliveryAddress: {
            street: '123 MG Road',
            city: 'Pune',
            pincode: '411001',
            contactPhone: phonePatientA,
          },
        });
      assert.equal(res.status, 401);
    });
  });

  describe('2. Patient Mobile App Order Lifecycle & Verification', () => {
    let placedOrderId: string;
    let placedOrderNumber: string;

    it('allows authenticated Patient App client to place medical equipment order', async () => {
      const res = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${testPatientToken}`)
        .send({
          idempotencyKey: `idem_appfirst_${Date.now()}`,
          items: [
            {
              productId: testProduct._id.toString(),
              quantity: 1,
              isRental: false,
              installationSelected: true,
            },
          ],
          deliveryAddress: {
            street: 'Flat 401, Sapphire Towers, Baner',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411045',
            contactPhone: phonePatientA,
          },
          paymentMethod: 'online',
          installationPreferences: {
            preferredDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
            preferredSlot: 'Morning (9:00 AM - 1:00 PM)',
            accessInstructions: 'Elevator available, 4th floor.',
          },
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.data);
      placedOrderId = res.body.data.id || res.body.data._id;
      placedOrderNumber = res.body.data.orderNumber;
      assert.equal(res.body.data.orderStatus, 'placed');
    });

    it('generates sandbox payment intent for Patient App client', async () => {
      const res = await request(app)
        .post('/api/v1/products/payments/create-intent')
        .set('Authorization', `Bearer ${testPatientToken}`)
        .send({ orderId: placedOrderId });

      assert.equal(res.status, 200);
      assert.ok(res.body.data.razorpayOrderId);
      assert.ok(res.body.data.amount > 0);
    });

    it('verifies sandbox payment and transitions order to confirmed status', async () => {
      const rzpOrderId = `rzp_test_ord_${placedOrderNumber}_${Date.now()}`;
      const rzpPaymentId = `pay_sim_${Date.now()}_9921`;
      const rzpSignature = `test_sig_${rzpOrderId}_${rzpPaymentId}`;

      const res = await request(app)
        .post('/api/v1/products/payments/verify')
        .set('Authorization', `Bearer ${testPatientToken}`)
        .send({
          orderId: placedOrderId,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          razorpaySignature: rzpSignature,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.paymentStatus, 'paid');
    });

    it('allows Patient A to track their order milestones in the Patient App', async () => {
      const res = await request(app)
        .get(`/api/v1/products/orders/${placedOrderId}`)
        .set('Authorization', `Bearer ${testPatientToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.patientId.toString(), testPatientId.toString());
      assert.ok(Array.isArray(res.body.data.trackingUpdates));
      assert.ok(res.body.data.trackingUpdates.length >= 1);
    });

    it('strictly prevents Patient B from accessing Patient A order (tenant isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/products/orders/${placedOrderId}`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      assert.equal(res.status, 403);
    });
  });
});
