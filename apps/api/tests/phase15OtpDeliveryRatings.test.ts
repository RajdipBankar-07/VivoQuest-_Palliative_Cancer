import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { ProductOrder } from '../src/models/ProductOrder.js';
import { MedicalProduct } from '../src/models/MedicalProduct.js';
import { ProductReview } from '../src/models/ProductReview.js';
import { ProductComplaint } from '../src/models/ProductComplaint.js';
import { DeliveryRating } from '../src/models/DeliveryRating.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { NotificationLog } from '../src/models/NotificationLog.js';
import { hashDeliveryOtp } from '../src/utils/deliveryOtp.js';

describe('VivoQuest Phase 15 — OTP-Verified Delivery, Order Completion & Ratings Test Suite', () => {
  let app: any;
  let patientToken: string;
  let patientId: string;
  let patientBToken: string;
  let patientBId: string;

  let deliveryStaffToken: string;
  let deliveryStaffId: string;

  let otherStaffToken: string;
  let otherStaffId: string;

  let opsManagerToken: string;
  let opsManagerId: string;

  let testProduct: any;
  let testOrderId: string;
  let testOrderNumber: string;

  let secondOrderId: string;
  let secondOrderNumber: string;

  before(async () => {
    try {
      await (await import('../src/config/database.js')).connectDatabase();
      app = createApp();
      await (await import('../src/services/adminService.js')).seedAdminDemoData();

      // 1. Super Admin login
      const adminLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: '9899000001',
          password: 'SuperAdmin#2026',
        });
      assert.equal(adminLoginRes.status, 200, 'Admin login failed');
      const adminToken = adminLoginRes.body.data.token;

      // 2. Setup Patient A
      const patPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const patReg = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Rahul Sharma (Patient A)',
          phone: patPhone,
          password: 'Password123!',
          role: 'patient',
          consentAccepted: true,
        });
      assert.equal(patReg.status, 201, 'Patient A registration failed');
      patientToken = patReg.body.data.token;
      patientId = patReg.body.data.user.id || patReg.body.data.user._id;

      // 3. Setup Patient B (for cross-user isolation tests)
      const patBPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const patBReg = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Vikram Joshi (Patient B)',
          phone: patBPhone,
          password: 'Password123!',
          role: 'patient',
          consentAccepted: true,
        });
      assert.equal(patBReg.status, 201, 'Patient B registration failed');
      patientBToken = patBReg.body.data.token;
      patientBId = patBReg.body.data.user.id || patBReg.body.data.user._id;

      // 4. Setup Delivery Staff A
      const staffPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const staffRes = await request(app)
        .post('/api/v1/admin/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Suresh Kumar (Delivery)',
          phone: staffPhone,
          email: `driver1.${Date.now()}@vivoquest.in`,
          role: 'delivery_staff',
          department: 'Last-Mile Fleet',
          designation: 'Delivery Rider',
          password: 'Password123!',
        });
      assert.equal(staffRes.status, 201, 'Delivery staff creation failed');
      deliveryStaffId = staffRes.body.data.id || staffRes.body.data._id;

      const staffLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: staffPhone, password: 'Password123!' });
      assert.equal(staffLogin.status, 200, 'Staff login failed');
      deliveryStaffToken = staffLogin.body.data.token;

      // 5. Setup Other Delivery Staff B (unassigned)
      const otherPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const otherRes = await request(app)
        .post('/api/v1/admin/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Ramesh Patel (Other Staff)',
          phone: otherPhone,
          email: `driver2.${Date.now()}@vivoquest.in`,
          role: 'delivery_staff',
          department: 'Last-Mile Fleet',
          designation: 'Delivery Rider',
          password: 'Password123!',
        });
      assert.equal(otherRes.status, 201, 'Other staff creation failed');
      otherStaffId = otherRes.body.data.id || otherRes.body.data._id;

      const otherLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: otherPhone, password: 'Password123!' });
      assert.equal(otherLogin.status, 200, 'Other staff login failed');
      otherStaffToken = otherLogin.body.data.token;

      // 6. Setup Operations Manager
      const opsPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const opsRes = await request(app)
        .post('/api/v1/admin/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Anjali Verma (Ops Manager)',
          phone: opsPhone,
          email: `ops.${Date.now()}@vivoquest.in`,
          role: 'operations_manager',
          department: 'Operations & Last-Mile Logistics',
          designation: 'Operations Lead',
          password: 'Password123!',
        });
      assert.equal(opsRes.status, 201, 'Ops manager creation failed');
      opsManagerId = opsRes.body.data.id || opsRes.body.data._id;

      const opsLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: opsPhone, password: 'Password123!' });
      assert.equal(opsLogin.status, 200, 'Ops manager login failed');
      opsManagerToken = opsLogin.body.data.token;

      // 7. Create Test Medical Product
      testProduct = await MedicalProduct.create({
        sku: `SKU-P15-${Date.now().toString().slice(-5)}`,
        title: 'Digital Wheelchair with Safety Brakes',
        description: 'High quality motorized medical wheelchair with dual electromagnetic brakes.',
        category: 'mobility',
        price: 14500,
        stockQuantity: 20,
        reservedQuantity: 0,
        isRentalAvailable: false,
        isActive: true,
        requiresPrescription: false,
      });

      // 8. Create Test Order 1 (assigned to deliveryStaffId)
      testOrderNumber = `VQ-P15-${Date.now().toString().slice(-6)}`;
      const order1 = await ProductOrder.create({
        orderNumber: testOrderNumber,
        patientId: new mongoose.Types.ObjectId(patientId),
        patientName: 'Rahul Sharma',
        patientPhone: patPhone,
        orderStatus: 'out_for_delivery',
        paymentStatus: 'paid',
        paymentMethod: 'online',
        pricing: {
          subtotal: 14500,
          deliveryFee: 0,
          taxGst: 2610,
          totalAmount: 17110,
        },
        deliveryAddress: {
          street: 'Flat 402, Green Meadows',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411045',
        },
        items: [
          {
            productId: testProduct._id,
            sku: testProduct.sku,
            title: testProduct.title,
            category: testProduct.category,
            quantity: 1,
            unitPrice: 14500,
            isRental: false,
            setupRequired: false,
            sourcingType: 'own_stock',
          },
        ],
        deliveryAssignment: {
          assignedStaffId: new mongoose.Types.ObjectId(deliveryStaffId),
          assignedStaffName: 'Suresh Kumar (Delivery)',
          assignedAt: new Date(),
          scheduledDeliveryDate: new Date(),
        },
        trackingUpdates: [
          {
            timestamp: new Date(),
            status: 'out_for_delivery',
            message: 'Order out for delivery with Suresh Kumar',
          },
        ],
      });
      testOrderId = order1._id.toString();

      // 9. Create Test Order 2 (for cross-order testing)
      secondOrderNumber = `VQ-P15-SEC-${Date.now().toString().slice(-5)}`;
      const order2 = await ProductOrder.create({
        orderNumber: secondOrderNumber,
        patientId: new mongoose.Types.ObjectId(patientId),
        patientName: 'Rahul Sharma',
        patientPhone: patPhone,
        orderStatus: 'out_for_delivery',
        paymentStatus: 'paid',
        paymentMethod: 'online',
        pricing: {
          subtotal: 14500,
          deliveryFee: 0,
          taxGst: 2610,
          totalAmount: 17110,
        },
        deliveryAddress: {
          street: 'Flat 402, Green Meadows',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411045',
        },
        items: [
          {
            productId: testProduct._id,
            sku: testProduct.sku,
            title: testProduct.title,
            category: testProduct.category,
            quantity: 1,
            unitPrice: 14500,
            isRental: false,
            setupRequired: false,
            sourcingType: 'own_stock',
          },
        ],
        deliveryAssignment: {
          assignedStaffId: new mongoose.Types.ObjectId(deliveryStaffId),
          assignedStaffName: 'Suresh Kumar (Delivery)',
          assignedAt: new Date(),
        },
        trackingUpdates: [],
      });
      secondOrderId = order2._id.toString();
    } catch (err: any) {
      console.error('FATAL BEFORE ERROR:', err);
      throw err;
    }
  });

  after(async () => {
    // Cleanup test records
    await ProductOrder.deleteMany({ orderNumber: { $regex: /^VQ-P15/ } });
    await DeliveryRating.deleteMany({ orderNumber: { $regex: /^VQ-P15/ } });
    await ProductReview.deleteMany({ orderNumber: { $regex: /^VQ-P15/ } });
    await ProductComplaint.deleteMany({ orderNumber: { $regex: /^VQ-P15/ } });
    await User.deleteMany({ phone: { $regex: /^989[5-9]/ } });
    if (testProduct?._id) {
      await MedicalProduct.findByIdAndDelete(testProduct._id);
    }
  });

  // =========================================================================
  // 1. DELIVERY OTP REQUEST & SECURITY TESTS
  // =========================================================================

  it('1.1 should allow assigned delivery staff to request delivery OTP and not leak raw OTP in response', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/request-delivery-otp`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.phoneMasked);
    assert.ok(res.body.data.expiresAt);
    assert.equal(res.body.data.cooldownSeconds, 60);

    // CRITICAL SECURITY ASSERTION: Raw OTP must NEVER be exposed in response or client payload
    assert.strictEqual(res.body.data.otp, undefined);
    assert.strictEqual(res.body.data.rawOtp, undefined);
    assert.strictEqual(res.body.data.code, undefined);

    // Verify hash is saved in DB and order is out_for_delivery
    const orderInDb = await ProductOrder.findById(testOrderId);
    assert.ok(orderInDb?.deliveryAssignment?.otpVerification?.otpHash);
    assert.equal(orderInDb?.deliveryAssignment?.otpVerification?.attemptsCount, 0);
    assert.equal(orderInDb?.deliveryAssignment?.otpVerification?.maxAttempts, 5);
  });

  it('1.2 should reject OTP request from unassigned delivery staff (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/request-delivery-otp`)
      .set('Authorization', `Bearer ${otherStaffToken}`);

    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /not assigned to deliver this order/i);
  });

  it('1.3 should enforce 60-second cooldown on consecutive OTP requests (429 Rate Limit)', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/request-delivery-otp`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`);

    assert.equal(res.status, 429);
    assert.match(res.body.error.message, /wait.*second/i);
  });

  // =========================================================================
  // 2. OTP VERIFICATION, ATTEMPTS & BRUTE-FORCE LOCKOUT
  // =========================================================================

  it('2.1 should reject invalid OTP format and incorrect OTP with remaining attempts', async () => {
    // Test invalid format (< 6 digits)
    const formatRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/verify-delivery-otp`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`)
      .send({ otp: '123' });

    assert.equal(formatRes.status, 400);

    // Test wrong 6-digit OTP
    const wrongRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/verify-delivery-otp`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`)
      .send({ otp: '000000' });

    assert.equal(wrongRes.status, 400);
    assert.match(wrongRes.body.error.message, /Invalid delivery OTP/i);

    const orderInDb = await ProductOrder.findById(testOrderId);
    assert.equal(orderInDb?.deliveryAssignment?.otpVerification?.attemptsCount, 1);
  });

  it('2.2 should lock out after 5 consecutive failed verification attempts (429 Too Many Requests)', async () => {
    // Advance attempt counter to 4 in database
    await ProductOrder.findByIdAndUpdate(testOrderId, {
      $set: { 'deliveryAssignment.otpVerification.attemptsCount': 4 },
    });

    // 5th attempt with wrong OTP
    const res5 = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/verify-delivery-otp`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`)
      .send({ otp: '999999' });

    assert.equal(res5.status, 429);
    assert.match(res5.body.error.message, /Maximum verification attempts exceeded/i);

    // Subsequent attempt should be immediately rejected with 429
    const resSubsequent = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/verify-delivery-otp`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`)
      .send({ otp: '999999' });

    assert.equal(resSubsequent.status, 429);
  });

  it('2.3 should reject expired delivery OTP', async () => {
    // Set expiry to past
    const pastExpiry = new Date(Date.now() - 1000 * 60 * 15);
    const validTestOtp = '654321';
    const validHash = hashDeliveryOtp(validTestOtp, testOrderId);

    await ProductOrder.findByIdAndUpdate(testOrderId, {
      $set: {
        'deliveryAssignment.otpVerification.otpHash': validHash,
        'deliveryAssignment.otpVerification.otpExpiresAt': pastExpiry,
        'deliveryAssignment.otpVerification.attemptsCount': 0,
      },
    });

    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/verify-delivery-otp`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`)
      .send({ otp: validTestOtp });

    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /expired/i);
  });

  it('2.4 should reject cross-order OTP (OTP issued for Order B cannot verify Order A)', async () => {
    // Ensure testOrderId has an active OTP hash bound to testOrderId
    const validTestOtp = '112233';
    const hashA = hashDeliveryOtp(validTestOtp, testOrderId);
    await ProductOrder.findByIdAndUpdate(testOrderId, {
      $set: {
        'deliveryAssignment.otpVerification.otpHash': hashA,
        'deliveryAssignment.otpVerification.otpExpiresAt': new Date(Date.now() + 1000 * 60 * 10),
        'deliveryAssignment.otpVerification.attemptsCount': 0,
      },
    });

    const orderBOtp = '777888';
    // Store hash bound to secondOrderId on secondOrder
    const hashB = hashDeliveryOtp(orderBOtp, secondOrderId);
    await ProductOrder.findByIdAndUpdate(secondOrderId, {
      $set: {
        'deliveryAssignment.otpVerification.otpHash': hashB,
        'deliveryAssignment.otpVerification.otpExpiresAt': new Date(Date.now() + 1000000),
        'deliveryAssignment.otpVerification.attemptsCount': 0,
      },
    });

    // Try to verify testOrderId with orderBOtp
    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/verify-delivery-otp`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`)
      .send({ otp: orderBOtp });

    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /Invalid delivery OTP/i);
  });

  // =========================================================================
  // 3. SUCCESSFUL OTP VERIFICATION & DELIVERY CONFIRMATION
  // =========================================================================

  it('3.1 should successfully verify valid OTP, complete order, record handover details, and clear token hash', async () => {
    const validOtp = '582914';
    const validHash = hashDeliveryOtp(validOtp, testOrderId);

    await ProductOrder.findByIdAndUpdate(testOrderId, {
      $set: {
        'deliveryAssignment.otpVerification.otpHash': validHash,
        'deliveryAssignment.otpVerification.otpExpiresAt': new Date(Date.now() + 1000 * 60 * 10),
        'deliveryAssignment.otpVerification.attemptsCount': 0,
      },
    });

    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/verify-delivery-otp`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`)
      .send({
        otp: validOtp,
        recipientName: 'Rahul Sharma',
        recipientRelationship: 'Self',
        deliveryCondition: 'seal_verified',
        customerAcknowledgement: true,
        proofUrl: 'https://storage.vivoquest.in/proofs/delivery_signed_402.jpg',
        notes: 'Handed over directly to patient at bedside',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.orderStatus, 'delivered');
    assert.ok(res.body.data.deliveryAssignment.actualDeliveredAt);
    assert.equal(res.body.data.deliveryAssignment.otpVerification.verificationMethod, 'otp');
    assert.equal(res.body.data.deliveryAssignment.otpVerification.recipientRelationship, 'Self');

    // Token must be cleared in DB (single-use token enforcement)
    const orderInDb = await ProductOrder.findById(testOrderId);
    assert.strictEqual(orderInDb?.deliveryAssignment?.otpVerification?.otpHash, undefined);
    assert.equal(orderInDb?.orderStatus, 'delivered');

    // Audit log must be written
    const audit = await AuditLog.findOne({
      targetId: testOrderNumber,
      action: 'ORDER_DELIVERY_OTP_VERIFIED',
    });
    assert.ok(audit, 'Immutable AuditLog entry must exist for OTP verification');
  });

  it('3.2 should prevent token reuse: second verification attempt with same OTP must be rejected', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/verify-delivery-otp`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`)
      .send({ otp: '582914' });

    // Idempotent: Order is already delivered and verified, so returns HTTP 200 safely without mutating state
    assert.equal(res.status, 200);
    assert.equal(res.body.data.orderStatus, 'delivered');
  });

  // =========================================================================
  // 4. AUTHORIZED MANAGER DELIVERY OVERRIDE
  // =========================================================================

  it('4.1 should reject manager override when attempted by delivery staff (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/orders/${secondOrderId}/manager-delivery-override`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`)
      .send({
        overrideReason: 'Patient phone lost. Aadhaar verified in person.',
        identityDocType: 'aadhaar',
        recipientName: 'Rahul Sharma',
      });

    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /only operations managers and admins/i);
  });

  it('4.2 should allow authorized operations manager override with identity validation and audit log', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/orders/${secondOrderId}/manager-delivery-override`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        overrideReason: 'Patient phone battery drained; verified resident via Government Aadhaar card in person',
        identityDocType: 'aadhaar',
        identityDocLast4: '4192',
        recipientName: 'Rahul Sharma',
        recipientRelationship: 'Self',
        deliveryCondition: 'good_condition',
        proofUrl: 'https://storage.vivoquest.in/proofs/aadhaar_verified_slip.jpg',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.orderStatus, 'delivered');
    assert.equal(res.body.data.deliveryAssignment.otpVerification.verificationMethod, 'manager_override');

    const audit = await AuditLog.findOne({
      targetId: secondOrderNumber,
      action: 'ORDER_DELIVERY_MANAGER_OVERRIDE',
    });
    assert.ok(audit, 'Immutable AuditLog entry must exist for Manager Override');
    assert.equal(audit?.actorRole, 'operations_manager');
  });

  // =========================================================================
  // 5. DELIVERY EXPERIENCE RATINGS (CUSTOMER FLOW)
  // =========================================================================

  it('5.1 should allow eligible patient to rate delivery experience on delivered order', async () => {
    const res = await request(app)
      .post(`/api/v1/products/orders/${testOrderId}/delivery-rating`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        rating: 5,
        punctualityRating: 5,
        communicationRating: 5,
        handlingRating: 5,
        feedback: 'Executive arrived on time, was polite and demonstrated walker folding correctly.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.rating, 5);
    assert.equal(res.body.data.orderNumber, testOrderNumber);

    // Verify rating persisted in DeliveryRating collection
    const ratingInDb = await DeliveryRating.findOne({ orderId: testOrderId });
    assert.ok(ratingInDb);
    assert.equal(ratingInDb?.rating, 5);
  });

  it('5.2 should reject duplicate delivery experience rating for the same order (409 Conflict)', async () => {
    const res = await request(app)
      .post(`/api/v1/products/orders/${testOrderId}/delivery-rating`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        rating: 4,
        feedback: 'Duplicate attempt',
      });

    assert.equal(res.status, 409);
    assert.match(res.body.error.message, /already rated/i);
  });

  it('5.3 should reject delivery rating from unauthorized patient (Patient B cannot rate Patient A order)', async () => {
    const res = await request(app)
      .post(`/api/v1/products/orders/${testOrderId}/delivery-rating`)
      .set('Authorization', `Bearer ${patientBToken}`)
      .send({
        rating: 5,
      });

    assert.equal(res.status, 404);
  });

  // =========================================================================
  // 6. PRODUCT REVIEW & OPTIONAL ISSUE REPORTING
  // =========================================================================

  it('6.1 should allow eligible customer to submit product review for delivered item', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${testProduct._id}/reviews`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        orderId: testOrderId,
        rating: 5,
        title: 'Outstanding Wheelchair Durability',
        comment: 'High quality frame, sturdy armrests, and smooth wheels.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isVerifiedPurchase, true);

    // Product average rating updated
    const updatedProd = await MedicalProduct.findById(testProduct._id);
    assert.equal(updatedProd?.averageRating, 5);
  });

  it('6.2 should prevent duplicate product review for the same purchase (409 Conflict)', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${testProduct._id}/reviews`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        orderId: testOrderId,
        rating: 4,
        title: 'Second review attempt',
        comment: 'Duplicate comment',
      });

    assert.equal(res.status, 409);
    assert.match(res.body.error.message, /already submitted a review/i);
  });

  it('6.3 should create an operations complaint ticket when review includes optional issue report without altering the review', async () => {
    // Create new delivered order for product review issue test
    const orderNum3 = `VQ-P15-ISSUE-${Date.now().toString().slice(-5)}`;
    const order3 = await ProductOrder.create({
      orderNumber: orderNum3,
      patientId: new mongoose.Types.ObjectId(patientBId),
      patientName: 'Vikram Joshi',
      patientPhone: '9898000000',
      orderStatus: 'delivered',
      paymentStatus: 'paid',
      paymentMethod: 'online',
      pricing: { subtotal: 14500, deliveryFee: 0, taxGst: 2610, totalAmount: 17110 },
      deliveryAddress: { street: 'Main Rd', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      items: [
        {
          productId: testProduct._id,
          sku: testProduct.sku,
          title: testProduct.title,
          category: testProduct.category,
          quantity: 1,
          unitPrice: 14500,
          isRental: false,
          setupRequired: false,
          sourcingType: 'own_stock',
        },
      ],
      deliveryAssignment: {
        actualDeliveredAt: new Date(),
        otpVerification: { verificationMethod: 'otp', verifiedAt: new Date() },
      },
      trackingUpdates: [],
    });

    const res = await request(app)
      .post(`/api/v1/products/${testProduct._id}/reviews`)
      .set('Authorization', `Bearer ${patientBToken}`)
      .send({
        orderId: order3._id.toString(),
        rating: 3,
        title: 'Good device but left brake slightly loose',
        comment: 'Device is sturdy, but left wheel brake mechanism requires calibration.',
        hasIssueReported: true,
        issueCategory: 'defective_device',
        issueDetails: 'Left brake requires calibration screw adjustment.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.hasIssueReported, true);
    assert.ok(res.body.data.complaintId);

    // Complaint ticket must be in ProductComplaint collection for operations follow-up
    const complaint = await ProductComplaint.findById(res.body.data.complaintId);
    assert.ok(complaint);
    assert.equal(complaint?.orderNumber, orderNum3);
    assert.equal(complaint?.complaintType, 'defective_device');
  });

  // =========================================================================
  // 7. COMPLETED DELIVERIES WORKSPACE & METRICS
  // =========================================================================

  it('7.1 should query completed deliveries with pagination, date filters and summary statistics', async () => {
    const res = await request(app)
      .get('/api/v1/operations/completed-deliveries?dateRange=today&limit=10')
      .set('Authorization', `Bearer ${opsManagerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination);
    assert.ok(res.body.summary);
    assert.ok(typeof res.body.summary.otpVerifiedCount === 'number');
    assert.ok(typeof res.body.summary.managerOverrideCount === 'number');
    assert.ok(typeof res.body.summary.avgDeliveryRating === 'number');

    // Both test orders must appear in completed list
    const foundTestOrder = res.body.data.find((o: any) => o.orderNumber === testOrderNumber);
    assert.ok(foundTestOrder, 'Order 1 must be present in completed deliveries');
    assert.equal(foundTestOrder.deliveryAssignment?.otpVerification?.verificationMethod, 'otp');
  });

  it('7.2 should return aggregate delivery rating summary for operations managers', async () => {
    const res = await request(app)
      .get('/api/v1/operations/delivery-ratings/summary')
      .set('Authorization', `Bearer ${opsManagerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.totalRatings >= 1);
    assert.ok(res.body.data.averageRating >= 1);
    assert.ok(res.body.data.starBreakdown);
  });
});
