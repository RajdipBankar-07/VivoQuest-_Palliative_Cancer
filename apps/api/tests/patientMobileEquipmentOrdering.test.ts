import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  User,
  MedicalProduct,
  ProductOrder,
  Supplier,
  AuditLog,
  NotificationLog,
} from '../src/models/index.js';
import {
  patientApi,
  setCustomMobileApiBaseUrl,
  ApiError,
} from '../../mobile-patient/src/services/apiClient';
import { authStorage } from '../../mobile-patient/src/services/authStorage';
import { generateAuthToken } from '../src/services/authService.js';

describe('VivoQuest — Patient Mobile App: Medical Equipment Storefront, Cart, Sandbox Checkout, Tracking & Clinician Setup', () => {
  let server: http.Server;
  let baseUrl: string;
  const app = createApp();

  // Test accounts
  const patientAPhone = '9876540001';
  let patientAId: string;
  let patientAToken: string;

  const patientBPhone = '9876540002';
  let patientBId: string;
  let patientBToken: string;

  const adminPhone = '9876540009';
  let adminId: string;
  let adminToken: string;

  const testPhones = [patientAPhone, patientBPhone, adminPhone];
  const testSkuPrefix = 'MOB-EQ-';

  let productWheelchairId: string;
  let productWheelchairSku: string;
  let productOxygenId: string;
  let productOxygenSku: string;
  let productSupplierId: string;
  let productSupplierSku: string;

  let createdOrderId: string;
  let createdOrderNumber: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();

    // 1. Clean up prior artifacts
    await User.deleteMany({ phone: { $in: testPhones } });
    await Supplier.deleteMany({ supplierCode: 'SUP-MOB-01' });
    await MedicalProduct.deleteMany({ sku: { $regex: `^${testSkuPrefix}` } });
    await ProductOrder.deleteMany({ patientPhone: { $in: testPhones } });
    await NotificationLog.deleteMany({ recipientPhone: { $in: testPhones } });

    // 2. Create Admin
    const adminUser = await User.create({
      fullName: 'Dr. System Administrator',
      phone: adminPhone,
      email: 'admin.mob@vivoquest.in',
      role: 'admin',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      isPhoneVerified: true,
      isVerified: true,
      isActive: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'admin_ops', version: '1.0' },
    });
    adminId = adminUser._id.toString();
    adminToken = generateAuthToken(adminUser);

    // 3. Register Patient A
    const resPatA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Rajesh Sharma',
        phone: patientAPhone,
        email: 'rajesh.sharma.mob@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatA.status, 201);
    patientAId = resPatA.body.data.user.id;
    patientAToken = resPatA.body.data.token;

    // 4. Register Patient B (Identity isolation)
    const resPatB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sunita Patil',
        phone: patientBPhone,
        email: 'sunita.patil.mob@vivoquest.in',
        role: 'patient',
        password: 'Password123!',
        consentAccepted: true,
      });
    assert.strictEqual(resPatB.status, 201);
    patientBId = resPatB.body.data.user.id;
    patientBToken = resPatB.body.data.token;

    // 5. Seed Supplier
    const supplier = await Supplier.create({
      name: 'MedTech Direct Solutions Ltd',
      supplierCode: 'SUP-MOB-01',
      contactPerson: 'Suresh Rao',
      email: 'contact@medtechdirect.in',
      phone: '9822001199',
      address: 'Phase 2, Hinjewadi IT Park',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411057',
      gstin: '27AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      bankDetails: {
        accountName: 'MedTech Direct Solutions Ltd',
        accountNumber: '998877665544',
        ifsc: 'HDFC0001234',
        bankName: 'HDFC Bank Pune',
      },
      sourcingType: 'supplier_direct',
      verificationStatus: 'verified',
      status: 'active',
      isVerified: true,
      isActive: true,
    });

    // 6. Seed Medical Products
    productWheelchairSku = `${testSkuPrefix}WHL-01`;
    const prodWheelchair = await MedicalProduct.create({
      sku: productWheelchairSku,
      title: 'VivoQuest ErgoFold Lightweight Wheelchair',
      description: 'Hospital-grade foldable wheelchair with dual braking and ergonomic cushion.',
      category: 'mobility',
      brand: 'VivoQuest Care',
      price: 6500,
      regularPrice: 8500,
      sellingPrice: 6500,
      stockQuantity: 15,
      reservedQuantity: 0,
      sourcingType: 'own_stock',
      installationEligible: true,
      installationServiceCharge: 250,
      installationDescription: 'Certified clinical technician unboxes, inspects, and adjusts footrests and brakes.',
      estimatedDeliveryDays: '2-3 business days',
      images: ['https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800'],
      specifications: {
        'Frame Material': 'Aerospace Aluminum Alloy',
        'Weight Capacity': '125 kg',
        'Seat Width': '46 cm',
      },
      isActive: true,
    });
    productWheelchairId = prodWheelchair._id.toString();

    productOxygenSku = `${testSkuPrefix}OXY-01`;
    const prodOxygen = await MedicalProduct.create({
      sku: productOxygenSku,
      title: 'Philips EverFlo 5L Home Oxygen Concentrator',
      description: 'Ultra-quiet stationary continuous flow oxygen concentrator with integrated OPI sensor.',
      category: 'respiratory',
      brand: 'Philips Respironics',
      price: 48000,
      regularPrice: 55000,
      sellingPrice: 48000,
      stockQuantity: 8,
      reservedQuantity: 0,
      sourcingType: 'own_stock',
      installationEligible: true,
      installationServiceCharge: 500,
      installationDescription: 'Respiratory therapist demonstrates flow calibration, cannula setup, and safety guidelines.',
      estimatedDeliveryDays: '1-2 business days',
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800'],
      specifications: {
        'Flow Rate': '0.5 to 5 LPM',
        'Purity': '93% +/- 3%',
        'Noise Level': '45 dBA',
      },
      isActive: true,
    });
    productOxygenId = prodOxygen._id.toString();

    productSupplierSku = `${testSkuPrefix}SUP-01`;
    const prodSupplier = await MedicalProduct.create({
      sku: productSupplierSku,
      title: 'AccuCheck Instant Blood Glucose Monitoring Kit',
      description: 'Supplier-direct wireless glucometer kit with 50 test strips and lancing device.',
      category: 'monitoring_diagnostics',
      brand: 'Roche Diabetes Care',
      price: 1450,
      regularPrice: 1800,
      sellingPrice: 1450,
      stockQuantity: 30,
      reservedQuantity: 0,
      sourcingType: 'supplier_direct',
      supplierId: supplier._id,
      supplierName: 'MedTech Direct Solutions Ltd',
      installationEligible: false,
      estimatedDeliveryDays: '3-4 business days',
      images: ['https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800'],
      isActive: true,
    });
    productSupplierId = prodSupplier._id.toString();

    // 7. Start HTTP server on dynamic port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}/api/v1`;
        setCustomMobileApiBaseUrl(baseUrl);
        resolve();
      });
    });

    // 8. Log in Patient A via authStorage for client service calls
    await authStorage.setToken(patientAToken);
    await authStorage.setUser({
      id: patientAId,
      fullName: 'Rajesh Sharma',
      phone: patientAPhone,
      role: 'patient',
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await User.deleteMany({ phone: { $in: testPhones } });
    await Supplier.deleteMany({ supplierCode: 'SUP-MOB-01' });
    await MedicalProduct.deleteMany({ sku: { $regex: `^${testSkuPrefix}` } });
    await ProductOrder.deleteMany({ patientPhone: { $in: testPhones } });
    await NotificationLog.deleteMany({ recipientPhone: { $in: testPhones } });
    await authStorage.clearSession();
    await disconnectDatabase();
  });

  // ===========================================================================
  // Part 1: Product Catalog & Filtering via patientApi
  // ===========================================================================
  describe('1. Medical Equipment Storefront Catalog & Filters', () => {
    it('retrieves medical products list with pagination and real pricing', async () => {
      const res = await patientApi.getMedicalProducts();
      assert.ok(res.products.length >= 3, 'Should return at least our 3 seeded products');
      assert.ok(res.count >= 3, 'Count should match total active products');

      const item = res.products.find((p) => p.sku === productWheelchairSku);
      assert.ok(item, 'Should find wheelchair product');
      assert.strictEqual(item.title, 'VivoQuest ErgoFold Lightweight Wheelchair');
      assert.strictEqual(item.sellingPrice, 6500);
      assert.strictEqual(item.regularPrice, 8500);
      assert.strictEqual(item.discountPercentage, 24);
      assert.strictEqual(item.installationEligible, true);
    });

    it('filters products by category (mobility vs respiratory)', async () => {
      const mobilityRes = await patientApi.getMedicalProducts({ category: 'mobility' });
      assert.ok(mobilityRes.products.every((p) => p.category === 'mobility'));
      assert.ok(mobilityRes.products.some((p) => p.sku === productWheelchairSku));

      const respiratoryRes = await patientApi.getMedicalProducts({ category: 'respiratory' });
      assert.ok(respiratoryRes.products.every((p) => p.category === 'respiratory'));
      assert.ok(respiratoryRes.products.some((p) => p.sku === productOxygenSku));
    });

    it('filters products by sourcing type (own_stock vs supplier_direct)', async () => {
      const depotRes = await patientApi.getMedicalProducts({ sourcingType: 'own_stock' });
      assert.ok(depotRes.products.some((p) => p.sku === productWheelchairSku));

      const supplierRes = await patientApi.getMedicalProducts({ sourcingType: 'supplier_direct' });
      assert.ok(supplierRes.products.some((p) => p.sku === productSupplierSku));
    });

    it('searches products by keyword query', async () => {
      const searchRes = await patientApi.getMedicalProducts({ search: 'Concentrator' });
      assert.ok(searchRes.products.length >= 1);
      assert.ok(searchRes.products.some((p) => p.sku === productOxygenSku));
    });

    it('sorts products by price ascending and descending', async () => {
      const ascRes = await patientApi.getMedicalProducts({ sort: 'price_asc' });
      for (let i = 0; i < ascRes.products.length - 1; i++) {
        const curr = ascRes.products[i].sellingPrice || ascRes.products[i].price;
        const next = ascRes.products[i + 1].sellingPrice || ascRes.products[i + 1].price;
        assert.ok(curr <= next, `Price ${curr} should be <= ${next}`);
      }
    });

    it('retrieves detailed product info by ID including technical specs', async () => {
      const details = await patientApi.getMedicalProductById(productWheelchairId);
      assert.strictEqual(details.id, productWheelchairId);
      assert.strictEqual(details.sku, productWheelchairSku);
      assert.ok(details.specifications);
      assert.strictEqual(details.specifications['Frame Material'], 'Aerospace Aluminum Alloy');
      assert.strictEqual(details.specifications['Weight Capacity'], '125 kg');
    });
  });

  // ===========================================================================
  // Part 2: Cart Operations & Server-Side Price/Stock Validation
  // ===========================================================================
  describe('2. Patient Cart Management & Server-Side Validation', () => {
    it('persists and retrieves patient cart via API client', async () => {
      await patientApi.saveCart([
        {
          productId: productWheelchairId,
          quantity: 1,
          installationSelected: true,
        },
      ]);
      const saved = await patientApi.getCart();
      assert.ok(saved && Array.isArray(saved.items), 'Saved cart should have items array');
      assert.strictEqual(saved.items.length, 1);
      assert.strictEqual(saved.items[0].productId, productWheelchairId);
    });

    it('validates cart with server, calculating subtotal, 12% GST, installation & delivery fees', async () => {
      const validation = await patientApi.validateCart([
        {
          productId: productWheelchairId,
          quantity: 1,
          installationSelected: true,
        },
        {
          productId: productSupplierId,
          quantity: 1,
          installationSelected: false,
        },
      ]);

      assert.strictEqual(validation.hasUnavailableItems, false);
      assert.strictEqual(validation.items.length, 2);

      // Pricing arithmetic checks:
      // Item 1: 6500 * 1 = 6500
      // Item 2: 1450 * 1 = 1450
      // Subtotal = 7950
      assert.strictEqual(validation.pricing.subtotal, 7950);
      // Delivery fee is 0 because subtotal >= 2000
      assert.strictEqual(validation.pricing.deliveryFee, 0);
      // Installation charge for Item 1 = 250
      assert.strictEqual(validation.pricing.installationCharge, 250);
      // 12% GST on items subtotal (7950 * 0.12) = 954
      assert.strictEqual(validation.pricing.taxGst, 954);
      // Total = 7950 + 0 + 250 + 954 = 9154
      assert.strictEqual(validation.pricing.totalAmount, 9154);
    });

    it('flags items exceeding available inventory in cart validation', async () => {
      const validation = await patientApi.validateCart([
        {
          productId: productWheelchairId,
          quantity: 9999, // Exceeds stock of 15
          installationSelected: false,
        },
      ]);

      assert.ok(
        validation.warnings.some((w) => w.includes('adjusted to maximum available stock')),
        'Cart validation must warn when requested quantity exceeds available stock'
      );
    });
  });

  // ===========================================================================
  // Part 3: Order Placement & Inventory Reservation
  // ===========================================================================
  describe('3. Order Creation & Inventory Reservation Workflow', () => {
    it('creates product order, transitions stock to reservedQuantity, and logs initial milestone', async () => {
      const beforeProduct = await MedicalProduct.findById(productWheelchairId);
      assert.ok(beforeProduct);
      const initialStock = beforeProduct.stockQuantity;
      const initialReserved = beforeProduct.reservedQuantity;

      const orderData = {
        items: [
          {
            productId: productWheelchairId,
            quantity: 1,
            installationSelected: true,
          },
        ],
        deliveryAddress: {
          street: '101 FC Road, Model Colony',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411004',
          contactPhone: patientAPhone,
        },
        paymentMethod: 'online',
        specialInstructions: 'Please ring bell and leave with security if unavailable.',
      };

      const order = await patientApi.createOrder(orderData);
      createdOrderId = order.id || (order as any)._id;
      createdOrderNumber = order.orderNumber;

      assert.ok(createdOrderId, 'Order must have an ID');
      assert.ok(order.orderNumber.includes('ORD-'), 'Order number format should include ORD-');
      assert.strictEqual(order.orderStatus, 'placed');
      assert.strictEqual(order.paymentStatus, 'pending');
      assert.strictEqual(order.items.length, 1);
      assert.strictEqual(order.items[0].installationSelected, true);

      // Verify stock reservation in database
      const afterProduct = await MedicalProduct.findById(productWheelchairId);
      assert.ok(afterProduct);
      assert.strictEqual(afterProduct.stockQuantity, initialStock - 1, 'stockQuantity should decrement by 1');
      assert.strictEqual(afterProduct.reservedQuantity, initialReserved + 1, 'reservedQuantity should increment by 1');

      // Verify initial tracking update was logged
      assert.ok(order.trackingUpdates.length >= 1);
      assert.strictEqual(order.trackingUpdates[0].status, 'placed');

      // Verify estimated delivery date
      assert.ok(order.estimatedDeliveryDate);
    });
  });

  // ===========================================================================
  // Part 4: Sandbox Payment Verification (Razorpay Test Mode)
  // ===========================================================================
  describe('4. Test-Mode Payment Intent & Signature Verification', () => {
    it('provides payment config confirming test sandbox mode and key ID', async () => {
      const config = await patientApi.getPaymentConfig();
      assert.ok(config.keyId, 'Must return Razorpay key ID');
      assert.ok(config.mode.includes('test') || config.mode.includes('sandbox'));
    });

    it('creates payment intent for created order', async () => {
      const intent = await patientApi.createPaymentIntent(createdOrderId);
      assert.strictEqual(intent.orderId, createdOrderId);
      assert.ok(intent.razorpayOrderId.startsWith('rzp_test_ord_'));
      assert.strictEqual(intent.currency, 'INR');
      assert.ok(intent.amount > 0);
    });

    it('rejects tampered payment signature with 400 Bad Request', async () => {
      await assert.rejects(
        async () => {
          await patientApi.verifyPayment({
            orderId: createdOrderId,
            razorpayPaymentId: 'pay_test_tampered_123',
            razorpayOrderId: 'order_test_tampered_456',
            razorpaySignature: 'invalid_tampered_signature',
          });
        },
        (err: any) => {
          return err instanceof ApiError && err.status === 400;
        }
      );

      // Verify order is still pending in DB
      const order = await ProductOrder.findById(createdOrderId);
      assert.strictEqual(order?.paymentStatus, 'pending');
      assert.strictEqual(order?.orderStatus, 'placed');
    });

    it('accepts valid sandbox test payment, transitions order to confirmed, and dispatches notification', async () => {
      const verifiedOrder = await patientApi.verifyPayment({
        orderId: createdOrderId,
        razorpayPaymentId: 'pay_test_sandbox_success_999',
        razorpayOrderId: 'order_sandbox_' + createdOrderId.slice(-8),
        razorpaySignature: 'sandbox_test_signature_valid',
      });

      assert.strictEqual(verifiedOrder.orderStatus, 'confirmed');
      assert.strictEqual(verifiedOrder.paymentStatus, 'paid');
      assert.ok(verifiedOrder.invoiceNumber, 'Order must have an invoice number after confirmation');

      // Verify tracking update milestone was appended
      const confirmedMilestone = verifiedOrder.trackingUpdates.find((t) => t.status === 'confirmed');
      assert.ok(confirmedMilestone, 'Tracking updates must include confirmed milestone');
      assert.ok(confirmedMilestone.message.includes('verified successfully'));

      // Verify automated notification was logged in NotificationLog
      const notif = await NotificationLog.findOne({
        recipientPhone: patientAPhone,
        templateId: 'PRODUCT_ORDER_CONFIRMED',
      });
      assert.ok(notif, 'Notification log must record confirmation alert');
      assert.ok(notif.messageBody.includes(createdOrderNumber));
    });
  });

  // ===========================================================================
  // Part 5: Patient Order Querying & Identity Isolation
  // ===========================================================================
  describe('5. Order Tracking & Patient Identity Isolation', () => {
    it('retrieves orders for authenticated patient only', async () => {
      const orders = await patientApi.getOrders();
      assert.ok(orders.length >= 1);
      assert.ok(orders.some((o) => (o.id || (o as any)._id) === createdOrderId));
      assert.ok(orders.every((o) => o.patientPhone === patientAPhone));
    });

    it('retrieves detailed order milestone timeline by order ID', async () => {
      const order = await patientApi.getOrderById(createdOrderId);
      assert.strictEqual(order.id || (order as any)._id, createdOrderId);
      assert.strictEqual(order.orderNumber, createdOrderNumber);
      assert.strictEqual(order.orderStatus, 'confirmed');
      assert.strictEqual(order.paymentStatus, 'paid');
      assert.ok(order.trackingUpdates.length >= 2, 'Should have placed and confirmed milestones');
    });

    it('prevents Patient B from viewing or accessing Patient A order (Tenant Isolation)', async () => {
      // Switch auth storage to Patient B
      await authStorage.setToken(patientBToken);
      await authStorage.setUser({
        id: patientBId,
        fullName: 'Sunita Patil',
        phone: patientBPhone,
        role: 'patient',
      });

      const ordersB = await patientApi.getOrders();
      assert.strictEqual(ordersB.length, 0, 'Patient B must not see Patient A orders');

      await assert.rejects(
        async () => {
          await patientApi.getOrderById(createdOrderId);
        },
        (err: any) => {
          return err instanceof ApiError && (err.status === 403 || err.status === 404);
        }
      );

      // Restore session to Patient A
      await authStorage.setToken(patientAToken);
      await authStorage.setUser({
        id: patientAId,
        fullName: 'Rajesh Sharma',
        phone: patientAPhone,
        role: 'patient',
      });
    });

    it('strictly forbids patient from directly altering order delivery date (RBAC)', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/orders/${createdOrderId}/delivery-estimate`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          estimatedDeliveryDate: '2026-11-15T00:00:00.000Z',
          reason: 'Patient self-update attempt',
        });
      assert.strictEqual(res.status, 403);
    });
  });

  // ===========================================================================
  // Part 6: Admin Delivery Reschedule & Delivery History Audit
  // ===========================================================================
  describe('6. Delivery Date Rescheduling with Reason Audit Log', () => {
    it('allows Admin to reschedule delivery date with mandatory reason and logs update history', async () => {
      const newTargetDate = '2026-11-05T10:00:00.000Z';
      const adminReason = 'Heavy rainfall transit delay across Mumbai-Pune expressway';

      const res = await request(app)
        .patch(`/api/v1/products/orders/${createdOrderId}/delivery-estimate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          estimatedDeliveryDate: newTargetDate,
          reason: adminReason,
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      // Verify the updated history is visible to Patient A
      const updatedOrder = await patientApi.getOrderById(createdOrderId);
      assert.strictEqual(
        new Date(updatedOrder.estimatedDeliveryDate).toISOString(),
        new Date(newTargetDate).toISOString()
      );
      assert.ok(updatedOrder.deliveryEstimateHistory.length >= 1);

      const latestRevision = updatedOrder.deliveryEstimateHistory[updatedOrder.deliveryEstimateHistory.length - 1];
      assert.strictEqual(latestRevision.reason, adminReason);
      assert.strictEqual(latestRevision.updatedByRole, 'admin');

      // Verify delivery updated notification was logged
      const deliveryNotif = await NotificationLog.findOne({
        recipientPhone: patientAPhone,
        templateId: 'PRODUCT_ORDER_DELIVERY_UPDATED',
      });
      assert.ok(deliveryNotif, 'Delivery updated notification must be logged');
      assert.ok(deliveryNotif.messageBody.includes(adminReason));
    });
  });

  // ===========================================================================
  // Part 7: In-Home Clinician Setup Scheduling
  // ===========================================================================
  describe('7. In-Home Clinician Setup Scheduling for Ordered Devices', () => {
    it('allows patient to schedule clinician setup visit for installation-eligible order', async () => {
      const setupSchedule = {
        setupDate: '2026-11-06',
        setupSlot: '11:00 AM - 01:00 PM',
        notes: 'Elderly patient requires demonstration of wheelchair brake locking mechanism.',
      };

      const scheduledOrder = await patientApi.scheduleClinicianSetup(createdOrderId, setupSchedule);
      assert.strictEqual(scheduledOrder.clinicalSetup?.setupStatus, 'scheduled');
      assert.ok(scheduledOrder.clinicalSetup?.setupDate);
    });
  });

  // ===========================================================================
  // Part 8: Order Cancellation & Inventory Restoral
  // ===========================================================================
  describe('8. Order Cancellation & Reserved Inventory Release', () => {
    it('creates a second order, cancels it, and verifies reserved stock is released back into inventory', async () => {
      // Check stock before 2nd order
      const prodBefore = await MedicalProduct.findById(productOxygenId);
      assert.ok(prodBefore);
      const stockBefore = prodBefore.stockQuantity;
      const reservedBefore = prodBefore.reservedQuantity;

      // 1. Create Order 2
      const order2 = await patientApi.createOrder({
        items: [
          {
            productId: productOxygenId,
            quantity: 2,
            installationSelected: false,
          },
        ],
        deliveryAddress: {
          street: '402 Sunset Blvd',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411007',
          contactPhone: patientAPhone,
        },
        paymentMethod: 'cod',
      });

      const order2Id = order2.id || (order2 as any)._id;
      assert.strictEqual(order2.orderStatus, 'placed');

      // Stock should have reserved 2 units
      const prodMid = await MedicalProduct.findById(productOxygenId);
      assert.ok(prodMid);
      assert.strictEqual(prodMid.stockQuantity, stockBefore - 2);
      assert.strictEqual(prodMid.reservedQuantity, reservedBefore + 2);

      // 2. Patient cancels Order 2
      const cancellationReason = 'Purchased alternative unit from hospital clinic';
      const cancelledOrder = await patientApi.cancelOrder(order2Id, cancellationReason);
      assert.strictEqual(cancelledOrder.orderStatus, 'cancelled');
      assert.strictEqual(cancelledOrder.cancellation?.cancellationReason, cancellationReason);

      // 3. Stock should be completely restored to initial values
      const prodAfter = await MedicalProduct.findById(productOxygenId);
      assert.ok(prodAfter);
      assert.strictEqual(prodAfter.stockQuantity, stockBefore, 'stockQuantity should be restored');
      assert.strictEqual(prodAfter.reservedQuantity, reservedBefore, 'reservedQuantity should be released');

      // Verify cancellation milestone was logged in trackingUpdates
      const cancelMilestone = cancelledOrder.trackingUpdates.find((t) => t.status === 'cancelled');
      assert.ok(cancelMilestone);
      assert.ok(cancelMilestone.message.includes(cancellationReason));
    });
  });
});
