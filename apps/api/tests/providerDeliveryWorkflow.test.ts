import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { ProductOrder } from '../src/models/ProductOrder.js';
import { DeliveryProvider } from '../src/models/DeliveryProvider.js';
import { connectDatabase } from '../src/config/database.js';
import { seedAdminDemoData } from '../src/services/adminService.js';
import { seedDefaultDeliveryProviders } from '../src/services/operationsService.js';
import { hashDeliveryOtp } from '../src/utils/deliveryOtp.js';

describe('VivoQuest — Provider-Based Delivery & WhatsApp Coordination Test Suite', () => {
  let app: any;
  let salesManagerToken: string;
  let opsManagerToken: string;
  let unauthorizedPatientToken: string;
  let testOrderId: string;
  let testOrderNumber: string;

  before(async () => {
    try {
      await connectDatabase();
      app = createApp();
      await seedAdminDemoData();
      await seedDefaultDeliveryProviders();

      console.log('--- SEEDING DONE ---');

      // 1. Login as Admin / Operations Manager
      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: '9899000001',
          password: 'SuperAdmin#2026',
        });
      console.log('ADMIN LOGIN STATUS:', adminLogin.status, adminLogin.body);
      assert.equal(adminLogin.status, 200);
      opsManagerToken = adminLogin.body.data.token;

      // 2. Create or ensure a sales_manager user
      const salesPhone = '9899119999';
      let salesUser = await User.findOne({ phone: salesPhone });
      if (!salesUser) {
        const passwordHash = await bcrypt.hash('SalesManager#2026', 10);
        salesUser = await User.create({
          fullName: 'Rohit Sharma (Sales Manager)',
          email: 'sales.manager@vivoquest.in',
          phone: salesPhone,
          passwordHash,
          role: 'sales_manager',
          department: 'Sales & Logistics',
          employeeId: 'EMP-SALES-001',
          status: 'active',
          isPhoneVerified: true,
          isEmailVerified: true,
          dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
        });
      }
      console.log('SALES USER READY');
      const salesLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: salesPhone,
          password: 'SalesManager#2026',
        });
      console.log('SALES LOGIN STATUS:', salesLogin.status, salesLogin.body);
      assert.equal(salesLogin.status, 200);
      salesManagerToken = salesLogin.body.data.token;

      // 3. Create a patient user for unauthorized checks
      const patientPhone = '9876599999';
      await User.deleteOne({ phone: patientPhone });
      const patientPasswordHash = await bcrypt.hash('Patient#2026', 10);
      const patientUser = await User.create({
        fullName: 'Patient User',
        email: 'patient.user.test@test.in',
        phone: patientPhone,
        passwordHash: patientPasswordHash,
        role: 'patient',
        status: 'active',
        isPhoneVerified: true,
        dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
      });
      console.log('PATIENT USER READY');
      const patientLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: patientPhone,
          password: 'Patient#2026',
        });
      console.log('PATIENT LOGIN STATUS:', patientLogin.status, patientLogin.body);
      assert.equal(patientLogin.status, 200);
      unauthorizedPatientToken = patientLogin.body.data.token;

      // 4. Create an initial product order in 'placed' status (simulating fresh checkout)
      testOrderNumber = `VQ-TEST-SALES-${Date.now()}`;
      const testOrder = await ProductOrder.create({
        orderNumber: testOrderNumber,
        patientId: patientUser._id,
        patientName: 'Anjali Deshpande',
        patientPhone: '9822334455',
        deliveryAddress: {
          street: 'Flat 402, Sunshine Heights, Baner Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411045',
          contactPhone: '9822334455',
          landmark: 'Opposite Westend Mall',
        },
        deliveryPreferences: {
          preferredSlot: 'Morning Slot (09:00 AM - 01:00 PM)',
          accessInstructions: 'Ring doorbell twice. Patient on 4th floor with elevator access.',
        },
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            sku: 'VQ-MOB-001',
            title: 'Foldable Lightweight Wheelchair with Ergonomic Handbrakes',
            category: 'Mobility Equipment',
            quantity: 1,
            unitPrice: 12500,
            regularPrice: 15000,
            sourcingType: 'own_stock',
          },
        ],
        pricing: {
          subtotal: 12500,
          deliveryFee: 0,
          taxGst: 1500,
          totalAmount: 14000,
        },
        orderStatus: 'placed',
        paymentStatus: 'paid',
        paymentMethod: 'online',
      });
      testOrderId = testOrder._id.toString();
      console.log('ORDER READY:', testOrderId);
    } catch (err) {
      console.error('ERROR IN BEFORE HOOK:', err);
      throw err;
    }
  });

  it('1. GET /api/v1/operations/delivery-providers — lists seeded default logistics partners', async () => {
    const res = await request(app)
      .get('/api/v1/operations/delivery-providers')
      .set('Authorization', `Bearer ${salesManagerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);

    const names = res.body.data.map((p: any) => p.name);
    assert.ok(names.includes('Blue Dart Express'));
    assert.ok(names.includes('Delhivery Healthcare Logistics'));
    assert.ok(names.includes('Dunzo Direct Local Express'));
  });

  it('2. POST /api/v1/operations/delivery-providers — creates custom logistics partner', async () => {
    const res = await request(app)
      .post('/api/v1/operations/delivery-providers')
      .set('Authorization', `Bearer ${salesManagerToken}`)
      .send({
        name: 'Express Care Couriers Pune',
        contactPerson: 'Milind Kulkarni',
        phone: '+919877001122',
        serviceArea: 'Aundh, Baner, Kothrud',
        deliveryInstructions: 'Special care for fragile hospital mobility aids',
        status: 'active',
        isDefault: false,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Express Care Couriers Pune');
    assert.equal(res.body.data.phone, '+919877001122');
  });

  it('3. GET /api/v1/operations/orders — order appears immediately without requiring staff assignment', async () => {
    const res = await request(app)
      .get(`/api/v1/operations/orders?search=${testOrderNumber}&dateRange=all`)
      .set('Authorization', `Bearer ${salesManagerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.length >= 1);
    const order = res.body.data[0];
    assert.equal(order.orderNumber, testOrderNumber);
    assert.equal(order.orderStatus, 'placed');
    assert.equal(order.nextAction, 'Confirm Order');
  });

  it('4. POST /api/v1/operations/orders/:id/coordinate-provider — Sales Manager coordinates external provider', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/coordinate-provider`)
      .set('Authorization', `Bearer ${salesManagerToken}`)
      .send({
        providerName: 'Blue Dart Express',
        deliveryPersonName: 'Ramesh Shinde (Route Coordinator)',
        contactPhone: '+91 98220 12345',
        email: 'pune.ops@bluedart.com',
        serviceArea: 'Pune Metropolitan Region',
        deliveryInstructions: 'Fragile mobility wheelchair. Tamper-evident seal inspection required.',
        coordinationStatus: 'provider_confirmed',
        saveToLibrary: true,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const updated = res.body.data;
    assert.equal(updated.orderStatus, 'ready_for_dispatch');
    assert.equal(updated.providerCoordination.providerName, 'Blue Dart Express');
    assert.equal(updated.providerCoordination.deliveryPersonName, 'Ramesh Shinde (Route Coordinator)');
    assert.equal(updated.providerCoordination.contactPhone, '+91 98220 12345');
    assert.equal(updated.providerCoordination.coordinationStatus, 'provider_confirmed');
  });

  it('5. POST /api/v1/operations/orders/:id/whatsapp-preview — generates sanitized WhatsApp message with wa.me deep link', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/whatsapp-preview`)
      .set('Authorization', `Bearer ${salesManagerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;
    assert.equal(data.orderNumber, testOrderNumber);
    assert.equal(data.providerName, 'Blue Dart Express');
    assert.equal(data.providerPhone, '919822012345');
    assert.ok(data.waDirectUrl.startsWith('https://wa.me/919822012345?text='));

    // Verify non-sensitive message content
    assert.ok(data.message.includes(testOrderNumber));
    assert.ok(data.message.includes('Foldable Lightweight Wheelchair'));
    assert.ok(data.message.includes('Anjali Deshpande'));
    assert.ok(data.message.includes('Sunshine Heights, Baner Road'));

    // Verify redaction of medical records and payment secrets
    assert.ok(!data.message.includes('diagnosis'));
    assert.ok(!data.message.includes('prescription'));
    assert.ok(!data.message.includes('card'));
  });

  it('6. POST /api/v1/operations/orders/:id/whatsapp-action — records opened, sent, and acknowledged states', async () => {
    // Action A: opened_in_whatsapp
    const openRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/whatsapp-action`)
      .set('Authorization', `Bearer ${salesManagerToken}`)
      .send({ action: 'opened_in_whatsapp' });
    assert.equal(openRes.status, 200);
    assert.equal(openRes.body.data.providerCoordination.whatsappCoordination.status, 'opened_in_whatsapp');

    // Action B: sent_confirmed
    const sentRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/whatsapp-action`)
      .set('Authorization', `Bearer ${salesManagerToken}`)
      .send({ action: 'sent_confirmed', notes: 'Sent to driver Ramesh on route' });
    assert.equal(sentRes.status, 200);
    assert.equal(sentRes.body.data.providerCoordination.whatsappCoordination.status, 'sent_confirmed');
    assert.equal(sentRes.body.data.providerCoordination.coordinationStatus, 'provider_contacted');

    // Action C: provider_acknowledged
    const ackRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/whatsapp-action`)
      .set('Authorization', `Bearer ${salesManagerToken}`)
      .send({ action: 'provider_acknowledged', notes: 'Driver confirmed pickup for 11 AM' });
    assert.equal(ackRes.status, 200);
    assert.equal(ackRes.body.data.providerCoordination.whatsappCoordination.status, 'provider_acknowledged');
    assert.equal(ackRes.body.data.providerCoordination.coordinationStatus, 'provider_confirmed');
  });

  it('7. Order delivery lifecycle progression and OTP verification without requiring internal staff assignment', async () => {
    try {
      // Step 1: Advance to dispatched
      const dispatchRes = await request(app)
        .patch(`/api/v1/operations/orders/${testOrderId}/delivery-status`)
        .set('Authorization', `Bearer ${opsManagerToken}`)
        .send({ newStatus: 'dispatched', notes: 'Handed over to Blue Dart Express' });
      assert.equal(dispatchRes.status, 200);
      assert.equal(dispatchRes.body.data.orderStatus, 'dispatched');

      // Step 2: Advance to out_for_delivery
      const ofdRes = await request(app)
        .patch(`/api/v1/operations/orders/${testOrderId}/delivery-status`)
        .set('Authorization', `Bearer ${opsManagerToken}`)
        .send({ newStatus: 'out_for_delivery', notes: 'Driver Ramesh out for delivery' });
      assert.equal(ofdRes.status, 200);
      assert.equal(ofdRes.body.data.orderStatus, 'out_for_delivery');

      // Step 3: Request delivery OTP (permitted with provider coordination)
      const otpRes = await request(app)
        .post(`/api/v1/operations/orders/${testOrderId}/request-delivery-otp`)
        .set('Authorization', `Bearer ${salesManagerToken}`);
      console.log('OTP REQUEST RES:', otpRes.status, otpRes.body);
      assert.equal(otpRes.status, 200);
      assert.equal(otpRes.body.success, true);
      assert.ok((otpRes.body.data?.cooldownSeconds || otpRes.body.cooldownSeconds) > 0);

      // Set a known valid OTP hash for deterministic verification in test
      const validTestOtp = '582914';
      const validHash = hashDeliveryOtp(validTestOtp, testOrderId);
      await ProductOrder.findByIdAndUpdate(testOrderId, {
        $set: {
          'deliveryAssignment.otpVerification.otpHash': validHash,
          'deliveryAssignment.otpVerification.otpExpiresAt': new Date(Date.now() + 1000 * 60 * 10),
          'deliveryAssignment.otpVerification.attemptsCount': 0,
        },
      });

      // Step 4: Verify delivery OTP with customer doorstep handover
      const verifyRes = await request(app)
        .post(`/api/v1/operations/orders/${testOrderId}/verify-delivery-otp`)
        .set('Authorization', `Bearer ${salesManagerToken}`)
        .send({
          otp: validTestOtp,
          recipientName: 'Anjali Deshpande',
          recipientRelationship: 'Self',
          customerAcknowledgement: true,
          deliveryCondition: 'good_condition',
        });
      console.log('OTP VERIFY RES:', verifyRes.status, verifyRes.body);
      assert.equal(verifyRes.status, 200);
      assert.equal(verifyRes.body.success, true);
      assert.equal(verifyRes.body.data.orderStatus, 'delivered');
    } catch (err) {
      console.error('ERROR IN TEST 7:', err);
      throw err;
    }
  });

  it('8. Security: unauthorized role (patient) cannot coordinate delivery providers', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/coordinate-provider`)
      .set('Authorization', `Bearer ${unauthorizedPatientToken}`)
      .send({
        providerName: 'Unauthorized Courier',
        contactPhone: '+919876543210',
      });

    assert.equal(res.status, 403);
  });
});
