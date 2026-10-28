import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  User,
  IUser,
  MedicalProduct,
  ProductOrder,
  Supplier,
  ProductReview,
  ProductComplaint,
} from '../src/models/index.js';
import { generateAuthToken } from '../src/services/authService.js';

describe('VivoQuest — Phase 14: Healthcare Marketplace, Supplier Portal & Operations Test Suite', () => {
  const app = createApp();

  // Test Admin
  const adminPhone = '9855009901';
  let adminToken: string;
  let adminUser: IUser;

  // Test Patient A
  const patientAPhone = '9855009902';
  let patientAToken: string;
  let patientAUser: IUser;

  // Test Patient B
  const patientBPhone = '9855009903';
  let patientBToken: string;
  let patientBUser: IUser;

  // Test Supplier A (Apex MedTech)
  const supplierUserAPhone = '9855009904';
  let supplierAToken: string;
  let supplierAUser: IUser;
  let supplierADoc: any;

  // Test Supplier B (CarePlus DME)
  const supplierUserBPhone = '9855009905';
  let supplierBToken: string;
  let supplierBUser: IUser;
  let supplierBDoc: any;

  const testPhones = [adminPhone, patientAPhone, patientBPhone, supplierUserAPhone, supplierUserBPhone];
  const testSkuPrefix = 'P14-';

  // Shared test fixture references
  let ownProductId: string;
  let ownProductSku: string;
  let supplierAProductId: string;
  let supplierAProductSku: string;
  let supplierBProductId: string;
  let supplierBProductSku: string;
  let pricingProductId: string;
  let stockCheckProductId: string;
  let idemProductId: string;
  let deliveredOrderId: string;
  let createdComplaintId: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();

    // Clean up test data from prior runs
    await User.deleteMany({ phone: { $in: testPhones } });
    await Supplier.deleteMany({ supplierCode: { $in: ['SUP-P14-A', 'SUP-P14-B'] } });
    await MedicalProduct.deleteMany({ sku: { $regex: `^${testSkuPrefix}` } });
    await ProductOrder.deleteMany({ patientPhone: { $in: [patientAPhone, patientBPhone] } });
    await ProductReview.deleteMany({ productSku: { $regex: `^${testSkuPrefix}` } });
    await ProductComplaint.deleteMany({ productSku: { $regex: `^${testSkuPrefix}` } });

    // 1. Create Admin
    adminUser = await User.create({
      fullName: 'Phase 14 Test Admin Lead',
      phone: adminPhone,
      email: 'admin.phase14@vivoquest.in',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'admin',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'admin_ops', version: '1.0' },
    });
    adminToken = generateAuthToken(adminUser);

    // 2. Create Patient A
    patientAUser = await User.create({
      fullName: 'Phase 14 Patient Meera',
      phone: patientAPhone,
      email: 'meera.phase14@vivoquest.in',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'patient',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'patient_care', version: '1.0' },
    });
    patientAToken = generateAuthToken(patientAUser);

    // 3. Create Patient B
    patientBUser = await User.create({
      fullName: 'Phase 14 Patient Rohan',
      phone: patientBPhone,
      email: 'rohan.phase14@vivoquest.in',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'patient',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'patient_care', version: '1.0' },
    });
    patientBToken = generateAuthToken(patientBUser);

    // 4. Create Supplier User A & Supplier Company Record
    supplierAUser = await User.create({
      fullName: 'Apex MedTech Lead Anil',
      phone: supplierUserAPhone,
      email: 'anil.apex@vivoquest.in',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'supplier',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'supplier_portal', version: '1.0' },
    });
    supplierAToken = generateAuthToken(supplierAUser);

    supplierADoc = await Supplier.create({
      supplierCode: 'SUP-P14-A',
      name: 'Apex MedTech Solutions Pvt Ltd',
      contactPerson: 'Anil Deshmukh',
      phone: supplierUserAPhone,
      email: 'anil.apex@vivoquest.in',
      address: 'Plot 12, Pimpri Industrial Estate',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411018',
      gstin: '27AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      bankDetails: {
        accountName: 'Apex MedTech Solutions',
        accountNumber: '998877665544',
        ifsc: 'HDFC0001234',
        bankName: 'HDFC Bank Pimpri Branch',
      },
      sourcingType: 'supplier_direct',
      verificationStatus: 'verified',
      rating: 4.8,
      userId: supplierAUser._id,
      commissionRatePercentage: 10,
      settlementCycleDays: 15,
      isActive: true,
      isDemo: true,
    });

    // 5. Create Supplier User B & Supplier Company Record
    supplierBUser = await User.create({
      fullName: 'CarePlus Logistics Lead Suresh',
      phone: supplierUserBPhone,
      email: 'suresh.careplus@vivoquest.in',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'supplier',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'supplier_portal', version: '1.0' },
    });
    supplierBToken = generateAuthToken(supplierBUser);

    supplierBDoc = await Supplier.create({
      supplierCode: 'SUP-P14-B',
      name: 'CarePlus DME Supplies LLP',
      contactPerson: 'Suresh Kumar',
      phone: supplierUserBPhone,
      email: 'suresh.careplus@vivoquest.in',
      address: 'Shop 4, Andheri Kurla Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400072',
      gstin: '27BBBBB1111B1Z6',
      pan: 'BBBBB1111B',
      bankDetails: {
        accountName: 'CarePlus DME Supplies',
        accountNumber: '112233445566',
        ifsc: 'ICIC0005678',
        bankName: 'ICICI Bank Andheri Branch',
      },
      sourcingType: 'supplier_direct',
      verificationStatus: 'verified',
      rating: 4.5,
      userId: supplierBUser._id,
      commissionRatePercentage: 12,
      settlementCycleDays: 15,
      isActive: true,
      isDemo: true,
    });
  });

  after(async () => {
    try {
      await User.deleteMany({ phone: { $in: testPhones } });
      await Supplier.deleteMany({ supplierCode: { $in: ['SUP-P14-A', 'SUP-P14-B'] } });
      await MedicalProduct.deleteMany({ sku: { $regex: `^${testSkuPrefix}` } });
      await ProductOrder.deleteMany({ patientPhone: { $in: [patientAPhone, patientBPhone] } });
      await ProductReview.deleteMany({ productSku: { $regex: `^${testSkuPrefix}` } });
      await ProductComplaint.deleteMany({ productSku: { $regex: `^${testSkuPrefix}` } });
    } finally {
      await disconnectDatabase();
    }
  });

  // ===========================================================================
  // Area 1: Admin Product CRUD, Alt Text, Specifications & Soft Archive
  // ===========================================================================
  describe('Area 1: Admin Product CRUD, Alt Text, Specifications & Soft Archive', () => {
    it('1.1 should create a new product via admin marketplace API with image alt text and specs', async () => {
      const payload = {
        title: '5-Function Electric ICU Hospital Bed Pro',
        sku: `${testSkuPrefix}OWN-BED-01`,
        category: 'icu_home_setup',
        description: 'Heavy-duty motorized bed with linear actuators and remote control',
        price: 45000,
        regularPrice: 50000,
        sellingPrice: 45000,
        stockQuantity: 10,
        sourcingType: 'own_stock',
        hsnCode: '9402',
        gstRate: 12,
        installationEligible: true,
        installationServiceCharge: 1200,
        installationDescription: 'Certified biomedical technician white-glove setup',
        imageGallery: [
          {
            url: '/assets/images/products/icu-bed-main.jpg',
            altText: 'Full view of 5-function electric ICU hospital bed with safety rails',
            isPrimary: true,
          },
          {
            url: '/assets/images/products/icu-bed-remote.jpg',
            altText: 'Wired remote control handset with one-touch Trendelenburg',
            isPrimary: false,
          },
        ],
        specifications: {
          Actuators: 'Dewert Medical grade',
          SafeWorkingLoad: '220 kg',
          BatteryBackup: 'Integrated 24V DC',
        },
      };

      const res = await request(app)
        .post('/api/v1/admin/marketplace/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.sku, `${testSkuPrefix}OWN-BED-01`);
      assert.equal(res.body.data.discountPercentage, 10);
      assert.equal(res.body.data.imageGallery.length, 2);
      assert.equal(res.body.data.imageGallery[0].altText, 'Full view of 5-function electric ICU hospital bed with safety rails');
      assert.equal(res.body.data.specifications.Actuators, 'Dewert Medical grade');

      ownProductId = res.body.data.id || res.body.data._id;
      ownProductSku = res.body.data.sku;
    });

    it('1.2 should update product details via admin marketplace API', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/marketplace/products/${ownProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '5-Function Electric ICU Hospital Bed Pro (2026 Edition)',
          stockQuantity: 12,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.title, '5-Function Electric ICU Hospital Bed Pro (2026 Edition)');
      assert.equal(res.body.data.stockQuantity, 12);
    });

    it('1.3 should soft archive product (status=archived, isActive=false) and preserve DB record', async () => {
      // Create a temporary product to soft-archive
      const tempRes = await request(app)
        .post('/api/v1/admin/marketplace/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Discontinued Nebulizer Kit',
          sku: `${testSkuPrefix}TEMP-ARCHIVE-01`,
          category: 'respiratory',
          description: 'Model being phased out',
          price: 1500,
          regularPrice: 1500,
          sellingPrice: 1500,
          stockQuantity: 5,
          sourcingType: 'own_stock',
        });
      assert.equal(tempRes.status, 201);
      const tempId = tempRes.body.data.id || tempRes.body.data._id;

      // Soft archive
      const archiveRes = await request(app)
        .delete(`/api/v1/admin/marketplace/products/${tempId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(archiveRes.status, 200);
      assert.equal(archiveRes.body.success, true);

      // Verify record still exists in MongoDB with status=archived and isActive=false
      const doc = await MedicalProduct.findById(tempId);
      assert.ok(doc, 'Product document must still exist in database for historical order preservation');
      assert.equal(doc.status, 'archived');
      assert.equal(doc.isActive, false);
    });
  });

  // ===========================================================================
  // Area 2: Regular Price, Selling Price & Discount Calculations
  // ===========================================================================
  describe('Area 2: Regular Price, Selling Price & Discount Calculations', () => {
    it('2.1 should derive discount percentage correctly at product creation', async () => {
      const res = await request(app)
        .post('/api/v1/admin/marketplace/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'High-Flow Oxygen Concentrator 10L',
          sku: `${testSkuPrefix}PRICING-DME-01`,
          category: 'respiratory',
          description: 'Continuous dual flow medical oxygen concentrator',
          price: 36000,
          regularPrice: 48000,
          sellingPrice: 36000,
          stockQuantity: 15,
          sourcingType: 'own_stock',
          installationEligible: true,
          installationServiceCharge: 800,
        });

      assert.equal(res.status, 201);
      // (48000 - 36000) / 48000 * 100 = 25%
      assert.equal(res.body.data.discountPercentage, 25);
      pricingProductId = res.body.data.id || res.body.data._id;
    });

    it('2.2 should calculate item discounts and optional installation charges in customer cart', async () => {
      // Update cart with installationSelected: true via PUT /api/v1/products/cart
      const updateCartRes = await request(app)
        .put('/api/v1/products/cart')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          items: [
            {
              productId: pricingProductId,
              quantity: 2,
              fulfillmentType: 'buy',
              installationSelected: true,
            },
          ],
        });

      assert.equal(updateCartRes.status, 200);

      // Retrieve cart and inspect pricing breakdown
      const cartRes = await request(app)
        .get('/api/v1/products/cart')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.equal(cartRes.status, 200);
      assert.equal(cartRes.body.success, true);
      const pricing = cartRes.body.data.pricing;
      // Selling price 36000 * 2 = 72000
      assert.equal(pricing.subtotal, 72000);
      // Discount = (48000 - 36000) * 2 = 24000
      assert.equal(pricing.discountTotal, 24000);
      // Installation = 800 * 2 = 1600
      assert.equal(pricing.installationCharge, 1600);
      // Total = subtotal 72000 + installation 1600 + tax (72000 * 0.12 = 8640) = 82240
      assert.equal(pricing.totalAmount, 72000 + 8640 + 1600);
    });
  });

  // ===========================================================================
  // Area 3: Inventory Reservation, Out-of-Stock Prevention & Confirmation
  // ===========================================================================
  describe('Area 3: Inventory Reservation, Out-of-Stock Prevention & Confirmation', () => {
    it('3.1 should reject order creation when requested quantity exceeds available stock', async () => {
      // Create product with only 2 units in stock
      const prodRes = await request(app)
        .post('/api/v1/admin/marketplace/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Portable Pulse Oximeter Pro',
          sku: `${testSkuPrefix}STOCK-CHECK-01`,
          category: 'monitoring_diagnostics',
          description: 'Hospital grade fingertip oximeter',
          price: 1200,
          regularPrice: 1500,
          sellingPrice: 1200,
          stockQuantity: 2,
          sourcingType: 'own_stock',
        });
      assert.equal(prodRes.status, 201);
      stockCheckProductId = prodRes.body.data.id || prodRes.body.data._id;

      // Attempt to place order for 5 units
      const failOrderRes = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          idempotencyKey: 'IDEM-P14-STOCK-FAIL-01',
          items: [
            {
              productId: stockCheckProductId,
              quantity: 5,
              fulfillmentType: 'buy',
            },
          ],
          deliveryAddress: {
            street: 'Flat 301, Palliative Care Society, Kothrud',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411038',
            contactPhone: patientAPhone,
          },
        });

      assert.equal(failOrderRes.status, 400);
      const errMsg = failOrderRes.body.error?.message || failOrderRes.body.message || '';
      assert.match(errMsg, /Insufficient available stock|stock/i);
    });

    it('3.2 should reserve inventory on order placement and commit decrement on payment verification', async () => {
      // Place order for 1 unit
      const orderRes = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          idempotencyKey: 'IDEM-P14-STOCK-PASS-01',
          items: [
            {
              productId: stockCheckProductId,
              quantity: 1,
              fulfillmentType: 'buy',
            },
          ],
          deliveryAddress: {
            street: 'Flat 302, Palliative Care Society, Kothrud',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411038',
            contactPhone: patientAPhone,
          },
        });

      assert.equal(orderRes.status, 201);
      const placedOrder = orderRes.body.data;
      assert.equal(placedOrder.orderStatus, 'placed');

      // Verify reservedQuantity is now 1 and stockQuantity becomes 1 (2 - 1 = 1)
      let prodDoc = await MedicalProduct.findById(stockCheckProductId);
      assert.equal(prodDoc?.reservedQuantity, 1);
      assert.equal(prodDoc?.stockQuantity, 1);

      // Verify payment
      const verifyRes = await request(app)
        .post('/api/v1/products/payments/verify')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          orderId: placedOrder.id || placedOrder._id,
          razorpayPaymentId: 'pay_test_p14_res_9988',
          razorpayOrderId: 'order_test_p14_res_9988',
          razorpaySignature: 'mock_valid_signature_p14',
        });

      assert.equal(verifyRes.status, 200);
      assert.equal(verifyRes.body.data.orderStatus, 'confirmed');
      assert.equal(verifyRes.body.data.paymentStatus, 'paid');

      // Verify stock: stockQuantity is 1, reservedQuantity is held at 1 pending dispatch/completion
      prodDoc = await MedicalProduct.findById(stockCheckProductId);
      assert.equal(prodDoc?.stockQuantity, 1);
      assert.equal(prodDoc?.reservedQuantity, 1);
    });
  });

  // ===========================================================================
  // Area 4: Supplier Product Creation & Isolated Inventory Management
  // ===========================================================================
  describe('Area 4: Supplier Product Creation & Isolated Inventory Management', () => {
    it('4.1 should allow verified supplier to create product bound to supplier profile', async () => {
      const res = await request(app)
        .post('/api/v1/supplier/products')
        .set('Authorization', `Bearer ${supplierAToken}`)
        .send({
          title: 'Lightweight Folding Transport Wheelchair',
          sku: `${testSkuPrefix}SUPA-WHEEL-01`,
          category: 'mobility',
          description: 'Aircraft aluminum alloy wheelchair with attendant handbrakes',
          price: 8500,
          regularPrice: 10000,
          sellingPrice: 8500,
          stockQuantity: 20,
          shippingCharge: 0,
          estimatedDeliveryDays: '3 business days',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.sourcingType, 'supplier_direct');
      assert.equal(res.body.data.supplierId.toString(), supplierADoc._id.toString());
      assert.equal(res.body.data.supplierName, supplierADoc.name);

      supplierAProductId = res.body.data.id || res.body.data._id;
      supplierAProductSku = res.body.data.sku;
    });

    it('4.2 should allow supplier to update their own product inventory', async () => {
      const res = await request(app)
        .patch(`/api/v1/supplier/products/${supplierAProductId}/inventory`)
        .set('Authorization', `Bearer ${supplierAToken}`)
        .send({ stockQuantity: 25 });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.stockQuantity, 25);
    });

    it('4.3 should block Supplier B from modifying Supplier A product inventory', async () => {
      const res = await request(app)
        .patch(`/api/v1/supplier/products/${supplierAProductId}/inventory`)
        .set('Authorization', `Bearer ${supplierBToken}`)
        .send({ stockQuantity: 99 });

      // Must be 404 Not Found (scoped strictly to authenticated supplier)
      assert.equal(res.status, 404);
    });
  });

  // ===========================================================================
  // Area 5: Supplier Routing: Accept & Reject Order Items
  // ===========================================================================
  describe('Area 5: Supplier Routing: Accept & Reject Order Items', () => {
    let routedOrderId: string;
    let acceptItemId: string;
    let rejectItemId: string;

    it('5.1 should route supplier product order to supplier fulfillment queue', async () => {
      // Create a second product for Supplier A
      const secondProd = await request(app)
        .post('/api/v1/supplier/products')
        .set('Authorization', `Bearer ${supplierAToken}`)
        .send({
          title: 'Anti-Decubitus Alternating Air Mattress',
          sku: `${testSkuPrefix}SUPA-MATT-02`,
          category: 'fall_prevention',
          description: 'Medical air pump with bubble pad overlay for pressure sore prevention',
          price: 3200,
          regularPrice: 4000,
          sellingPrice: 3200,
          stockQuantity: 15,
        });
      assert.equal(secondProd.status, 201);
      const prod2Id = secondProd.body.data.id || secondProd.body.data._id;

      // Patient A places order for both supplier products
      const orderRes = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          idempotencyKey: 'IDEM-P14-SUP-ROUTE-01',
          items: [
            { productId: supplierAProductId, quantity: 1, fulfillmentType: 'buy' },
            { productId: prod2Id, quantity: 1, fulfillmentType: 'buy' },
          ],
          deliveryAddress: {
            street: 'Flat 501, Supplier Wing A, Kothrud',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411038',
            contactPhone: patientAPhone,
          },
        });

      assert.equal(orderRes.status, 201);
      routedOrderId = orderRes.body.data.id || orderRes.body.data._id;
      const items = orderRes.body.data.items;
      acceptItemId = items[0]._id;
      rejectItemId = items[1]._id;

      // Supplier A queries orders
      const supplierOrdersRes = await request(app)
        .get('/api/v1/supplier/orders')
        .set('Authorization', `Bearer ${supplierAToken}`);

      assert.equal(supplierOrdersRes.status, 200);
      assert.ok(supplierOrdersRes.body.data.length > 0);
      const match = supplierOrdersRes.body.data.find(
        (o: any) => o.orderId === routedOrderId || o._id === routedOrderId
      );
      assert.ok(match, 'Order must appear in Supplier A fulfillment queue');
    });

    it('5.2 should allow supplier to accept order items', async () => {
      const res = await request(app)
        .post(`/api/v1/supplier/orders/${routedOrderId}/accept`)
        .set('Authorization', `Bearer ${supplierAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify item status in DB
      const order = await ProductOrder.findById(routedOrderId);
      const supplierItems = order?.items.filter(
        (i) => i.supplierId?.toString() === supplierADoc._id.toString()
      );
      assert.ok(supplierItems && supplierItems.length > 0);
      assert.ok(supplierItems.every((i) => i.supplierStatus === 'accepted'));
    });

    it('5.3 should allow supplier to reject order items with mandatory reason', async () => {
      const res = await request(app)
        .post(`/api/v1/supplier/orders/${routedOrderId}/reject`)
        .set('Authorization', `Bearer ${supplierAToken}`)
        .send({ reason: 'Out of stock at regional fulfillment warehouse' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify item status in DB
      const order = await ProductOrder.findById(routedOrderId);
      const supplierItems = order?.items.filter(
        (i) => i.supplierId?.toString() === supplierADoc._id.toString()
      );
      assert.ok(supplierItems && supplierItems.length > 0);
      assert.ok(supplierItems.every((i) => i.supplierStatus === 'rejected'));
    });
  });

  // ===========================================================================
  // Area 6: Dispatch Tracking with Carrier & Tracking Number
  // ===========================================================================
  describe('Area 6: Dispatch Tracking with Carrier & Tracking Number', () => {
    let dispatchOrderId: string;

    it('6.1 should allow supplier to dispatch accepted order with carrier and tracking details', async () => {
      // Create new clean order for dispatch
      const orderRes = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          idempotencyKey: 'IDEM-P14-DISPATCH-01',
          items: [{ productId: supplierAProductId, quantity: 1, fulfillmentType: 'buy' }],
          deliveryAddress: {
            street: 'Flat 601, Dispatch Lane, Kothrud',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411038',
            contactPhone: patientAPhone,
          },
        });
      assert.equal(orderRes.status, 201);
      dispatchOrderId = orderRes.body.data.id || orderRes.body.data._id;
      const itemId = orderRes.body.data.items[0]._id;

      // Accept item first
      await request(app)
        .post(`/api/v1/supplier/orders/${dispatchOrderId}/items/${itemId}/accept`)
        .set('Authorization', `Bearer ${supplierAToken}`);

      // Dispatch order
      const dispatchRes = await request(app)
        .post(`/api/v1/supplier/orders/${dispatchOrderId}/dispatch`)
        .set('Authorization', `Bearer ${supplierAToken}`)
        .send({
          carrierName: 'Blue Dart Healthcare Express',
          trackingNumber: 'BD-MED-992211',
          notes: 'Packed in reinforced crating for medical transit',
        });

      assert.equal(dispatchRes.status, 200);
      assert.equal(dispatchRes.body.success, true);

      // Verify order record has been updated
      const order = await ProductOrder.findById(dispatchOrderId);
      assert.ok(order);
      assert.equal(order.orderStatus, 'dispatched');

      // Check supplier fulfillment group
      const group = order.supplierFulfillments?.find(
        (g) => g.supplierId?.toString() === supplierADoc._id.toString()
      );
      assert.ok(group);
      assert.equal(group.status, 'dispatched');
      assert.equal(group.carrierName, 'Blue Dart Healthcare Express');
      assert.equal(group.trackingNumber, 'BD-MED-992211');

      // Check tracking event timeline
      const dispatchEvent = order.trackingUpdates.find((t) => t.status === 'dispatched');
      assert.ok(dispatchEvent, 'Order tracking timeline must include dispatch event');
      assert.match(dispatchEvent.message, /Blue Dart Healthcare Express/);
    });
  });

  // ===========================================================================
  // Area 7: Mixed Cart Fulfillment Routing (Own Stock + Supplier Direct)
  // ===========================================================================
  describe('Area 7: Mixed Cart Fulfillment Routing', () => {
    it('7.1 should generate distinct fulfillment groups for own stock and supplier direct items', async () => {
      const orderRes = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          idempotencyKey: 'IDEM-P14-MIX-01',
          items: [
            { productId: ownProductId, quantity: 1, fulfillmentType: 'buy' },
            { productId: supplierAProductId, quantity: 1, fulfillmentType: 'buy' },
          ],
          deliveryAddress: {
            street: 'Flat 701, Mixed Group Road, Kothrud',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411038',
            contactPhone: patientAPhone,
          },
        });

      assert.equal(orderRes.status, 201);
      const order = orderRes.body.data;
      assert.equal(order.items.length, 2);

      // Verify routing groups: Supplier direct products create supplierFulfillments groups
      assert.ok(order.supplierFulfillments, 'Order must include supplierFulfillments groups');
      assert.equal(order.supplierFulfillments.length, 1);
      assert.equal(
        order.supplierFulfillments[0].supplierId.toString(),
        supplierADoc._id.toString()
      );

      // Verify sourcingType on item level distinguishes own vs supplier direct
      const ownItem = order.items.find((i: any) => i.sku === ownProductSku);
      const supplierItem = order.items.find((i: any) => i.sku === supplierAProductSku);
      assert.equal(ownItem?.sourcingType, 'own_stock');
      assert.equal(supplierItem?.sourcingType, 'supplier_direct');
    });
  });

  // ===========================================================================
  // Area 8: Idempotency Keys Preventing Double Charge & Double Decrement
  // ===========================================================================
  describe('Area 8: Idempotency Keys & Duplicate Order Prevention', () => {
    it('8.1 should return existing order and prevent double stock decrement on identical idempotencyKey', async () => {
      // Create product with 10 units
      const prodRes = await request(app)
        .post('/api/v1/admin/marketplace/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Portable Oxygen Cylinder 5L',
          sku: `${testSkuPrefix}IDEM-01`,
          category: 'respiratory',
          description: 'Filled medical oxygen cylinder with regulator',
          price: 4500,
          regularPrice: 5000,
          sellingPrice: 4500,
          stockQuantity: 10,
          sourcingType: 'own_stock',
        });
      assert.equal(prodRes.status, 201);
      idemProductId = prodRes.body.data.id || prodRes.body.data._id;

      const idempotencyKey = `P14-IDEM-TOKEN-${Date.now()}`;
      const payload = {
        idempotencyKey,
        items: [{ productId: idemProductId, quantity: 2, fulfillmentType: 'buy' }],
        deliveryAddress: {
          street: 'Flat 801, Idempotency Hub, Kothrud',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411038',
          contactPhone: patientAPhone,
        },
      };

      // First submission
      const firstRes = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send(payload);

      assert.equal(firstRes.status, 201);
      const firstOrderNumber = firstRes.body.data.orderNumber;

      // Second submission with exact same idempotency key
      const secondRes = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send(payload);

      assert.equal(secondRes.status, 200); // 200 idempotent return
      assert.equal(secondRes.body.data.orderNumber, firstOrderNumber);

      // Verify stock reserved is exactly 2, NOT 4
      const prodDoc = await MedicalProduct.findById(idemProductId);
      assert.equal(prodDoc?.reservedQuantity, 2, 'Stock must only be reserved once despite repeated checkout call');
    });
  });

  // ===========================================================================
  // Area 9: Patient Order Lookup Isolation & Timeline Tracking
  // ===========================================================================
  describe('Area 9: Patient Order Lookup Isolation & Timeline Tracking', () => {
    let patientAOrderId: string;

    before(async () => {
      // Ensure Patient A has an order
      const res = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          idempotencyKey: 'IDEM-P14-LOOKUP-01',
          items: [{ productId: ownProductId, quantity: 1, fulfillmentType: 'buy' }],
          deliveryAddress: {
            street: 'Flat 901, Order Lookup Colony, Kothrud',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411038',
            contactPhone: patientAPhone,
          },
        });
      patientAOrderId = res.body.data.id || res.body.data._id;
    });

    it('9.1 should allow Patient A to query their own orders and verify timeline accuracy', async () => {
      const res = await request(app)
        .get(`/api/v1/products/orders/${patientAOrderId}`)
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.patientPhone, patientAPhone);
      assert.ok(Array.isArray(res.body.data.trackingUpdates));
      assert.ok(res.body.data.trackingUpdates.length > 0);
    });

    it('9.2 should prevent Patient B from accessing Patient A order details', async () => {
      const res = await request(app)
        .get(`/api/v1/products/orders/${patientAOrderId}`)
        .set('Authorization', `Bearer ${patientBToken}`);

      assert.equal(res.status, 403);
    });
  });

  // ===========================================================================
  // Area 10: Verified Review Eligibility & Average Rating Recalculation
  // ===========================================================================
  describe('Area 10: Verified Review Eligibility & Average Rating Recalculation', () => {
    it('10.1 should reject review submission if user has not had a delivered order for that product', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${ownProductId}/reviews`)
        .set('Authorization', `Bearer ${patientBToken}`)
        .send({
          orderId: new mongoose.Types.ObjectId().toString(),
          rating: 5,
          title: 'Unverified Review',
          comment: 'Looks good in pictures',
        });

      // Must be 404 or 400 because Patient B never had this product delivered
      assert.ok([400, 404].includes(res.status));
    });

    it('10.2 should allow review submission on delivered order and update product averageRating', async () => {
      // Create and complete order for Patient A with both own and supplier items
      const order = await ProductOrder.create({
        orderNumber: `ORD-P14-REV-${Date.now()}`,
        invoiceNumber: `INV-PRD-P14-${Date.now()}`,
        patientId: patientAUser._id,
        patientName: patientAUser.fullName,
        patientPhone: patientAUser.phone,
        items: [
          {
            productId: new mongoose.Types.ObjectId(ownProductId),
            sku: ownProductSku,
            title: '5-Function Electric ICU Hospital Bed Pro',
            category: 'icu_home_setup',
            quantity: 1,
            unitPrice: 45000,
            regularPrice: 50000,
            discountAmount: 5000,
            totalPrice: 45000,
            fulfillmentType: 'buy',
            fulfillmentMethod: 'own_stock',
          },
          {
            productId: new mongoose.Types.ObjectId(supplierAProductId),
            sku: supplierAProductSku,
            title: 'Lightweight Folding Transport Wheelchair',
            category: 'mobility',
            quantity: 1,
            unitPrice: 8500,
            regularPrice: 10000,
            discountAmount: 1500,
            totalPrice: 8500,
            fulfillmentType: 'buy',
            fulfillmentMethod: 'supplier_direct',
            supplierId: supplierADoc._id,
            supplierName: supplierADoc.name,
          },
        ],
        deliveryAddress: {
          street: 'Flat 1001, Verified Review Suite, Kothrud',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411038',
          contactPhone: patientAPhone,
        },
        pricing: {
          subtotal: 53500,
          discountTotal: 6500,
          deliveryFee: 0,
          taxGst: 6420,
          installationCharge: 0,
          totalAmount: 59920,
        },
        orderStatus: 'delivered', // Delivered status enables review
        paymentStatus: 'paid',
        paymentMethod: 'online',
        trackingUpdates: [
          {
            timestamp: new Date(),
            status: 'delivered',
            message: 'Equipment delivered and installed at residence',
            location: 'Patient Home',
          },
        ],
      });

      deliveredOrderId = order._id.toString();

      // Submit verified review
      const reviewRes = await request(app)
        .post(`/api/v1/products/${ownProductId}/reviews`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          orderId: deliveredOrderId,
          rating: 5,
          title: 'Lifesaving ICU bed for home palliative care',
          comment: 'Very smooth elevation transitions and ultra-quiet motors. Exceptional quality.',
        });

      assert.equal(reviewRes.status, 201);
      assert.equal(reviewRes.body.success, true);
      assert.equal(reviewRes.body.data.isVerifiedPurchase, true);
      assert.equal(reviewRes.body.data.rating, 5);

      // Verify product averageRating was updated to 5.0 and reviewCount to 1
      const product = await MedicalProduct.findById(ownProductId);
      assert.equal(product?.averageRating, 5.0);
      assert.equal(product?.reviewCount, 1);
    });
  });

  // ===========================================================================
  // Area 11: Product Complaint Lifecycle (Create, Supplier Respond, Admin Resolve)
  // ===========================================================================
  describe('Area 11: Product Complaint Lifecycle', () => {
    it('11.1 should allow patient to file a complaint against delivered order item', async () => {
      const res = await request(app)
        .post(`/api/v1/products/orders/${deliveredOrderId}/complaints`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          productId: supplierAProductId,
          category: 'damaged_item',
          description: 'Attendant brake cable had small tension fraying during transit',
          refundRequested: true,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'open');
      assert.equal(res.body.data.refundRequested, true);

      createdComplaintId = res.body.data.id || res.body.data._id;
    });

    it('11.2 should allow supplier to view complaint and submit response', async () => {
      // Supplier A lists complaints
      const listRes = await request(app)
        .get('/api/v1/supplier/complaints')
        .set('Authorization', `Bearer ${supplierAToken}`);

      assert.equal(listRes.status, 200);
      assert.ok(listRes.body.data.length > 0);
      const target = listRes.body.data.find((c: any) => c._id === createdComplaintId);
      assert.ok(target, 'Complaint must be listed in Supplier A portal');

      // Supplier A responds
      const respondRes = await request(app)
        .post(`/api/v1/supplier/complaints/${createdComplaintId}/respond`)
        .set('Authorization', `Bearer ${supplierAToken}`)
        .send({ responseMessage: 'Replacement brake cable and adjustment tool dispatched via BlueDart today.' });

      assert.equal(respondRes.status, 200);
      assert.equal(respondRes.body.success, true);
      assert.equal(respondRes.body.data.status, 'supplier_contacted');
    });

    it('11.3 should allow admin to view complaints and resolve with refund approval', async () => {
      // Admin lists complaints
      const listRes = await request(app)
        .get('/api/v1/admin/marketplace/complaints')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(listRes.status, 200);
      assert.ok(listRes.body.data.length > 0);

      // Admin resolves complaint with ₹500 courtesy refund
      const resolveRes = await request(app)
        .put(`/api/v1/admin/marketplace/complaints/${createdComplaintId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolutionNotes: 'Supplier sent replacement cable and ₹500 courtesy goodwill credit approved',
          refundApproved: true,
          refundAmount: 500,
        });

      assert.equal(resolveRes.status, 200);
      assert.equal(resolveRes.body.success, true);
      assert.equal(resolveRes.body.data.status, 'resolved');
      assert.equal(resolveRes.body.data.refundApproved, true);
      assert.equal(resolveRes.body.data.refundAmount, 500);

      // Verify complaint record in DB
      const comp = await ProductComplaint.findById(createdComplaintId);
      assert.equal(comp?.status, 'resolved');
      assert.equal(comp?.refundApproved, true);
    });
  });

  // ===========================================================================
  // Area 12: Supplier Portal Strict Data Isolation
  // ===========================================================================
  describe('Area 12: Supplier Portal Strict Data Isolation', () => {
    before(async () => {
      // Create a product for Supplier B
      const res = await request(app)
        .post('/api/v1/supplier/products')
        .set('Authorization', `Bearer ${supplierBToken}`)
        .send({
          title: 'CarePlus Standard Stretcher',
          sku: `${testSkuPrefix}SUPB-STR-01`,
          category: 'mobility',
          description: 'Emergency home evacuation stretcher',
          price: 5500,
          regularPrice: 6000,
          sellingPrice: 5500,
          stockQuantity: 10,
        });
      assert.equal(res.status, 201);
      supplierBProductId = res.body.data.id || res.body.data._id;
      supplierBProductSku = res.body.data.sku;
    });

    it('12.1 should ensure Supplier A catalog lists only Supplier A products', async () => {
      const res = await request(app)
        .get('/api/v1/supplier/products')
        .set('Authorization', `Bearer ${supplierAToken}`);

      assert.equal(res.status, 200);
      const skus = res.body.data.map((p: any) => p.sku);
      assert.ok(skus.includes(supplierAProductSku));
      assert.ok(!skus.includes(supplierBProductSku), 'Supplier A catalog must NOT contain Supplier B products');
      assert.ok(!skus.includes(ownProductSku), 'Supplier A catalog must NOT contain VivoQuest own stock products');
    });

    it('12.2 should ensure Supplier B catalog lists only Supplier B products', async () => {
      const res = await request(app)
        .get('/api/v1/supplier/products')
        .set('Authorization', `Bearer ${supplierBToken}`);

      assert.equal(res.status, 200);
      const skus = res.body.data.map((p: any) => p.sku);
      assert.ok(skus.includes(supplierBProductSku));
      assert.ok(!skus.includes(supplierAProductSku), 'Supplier B catalog must NOT contain Supplier A products');
    });

    it('12.3 should isolate settlements so Supplier B only sees their own payable calculation', async () => {
      const res = await request(app)
        .get('/api/v1/supplier/settlements')
        .set('Authorization', `Bearer ${supplierBToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.supplierCode, 'SUP-P14-B');
      assert.equal(res.body.data.commissionRatePercentage, 12);
    });
  });

  // ===========================================================================
  // Area 13: Admin Marketplace Metrics & Separation of GMV vs Net Revenue
  // ===========================================================================
  describe('Area 13: Admin Marketplace Metrics & Separation of GMV vs Net Revenue', () => {
    it('13.1 should return comprehensive marketplace metrics with own vs supplier sales breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/admin/marketplace/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const data = res.body.data;
      assert.ok(data.sales, 'Metrics must include sales block');
      assert.ok(typeof data.sales.ownProductSalesGross === 'number');
      assert.ok(typeof data.sales.supplierProductSalesGross === 'number');
      assert.ok(typeof data.sales.grossProductSalesRevenue === 'number');
      assert.ok(typeof data.sales.installationServicesRevenue === 'number');

      // Assert mathematical consistency: total gross = own gross + supplier gross
      assert.equal(
        data.sales.grossProductSalesRevenue,
        data.sales.ownProductSalesGross + data.sales.supplierProductSalesGross
      );

      // Verify catalog metrics
      assert.ok(data.catalogAndInventory, 'Metrics must include catalog and inventory');
      assert.ok(typeof data.catalogAndInventory.ownProductsCount === 'number');
      assert.ok(typeof data.catalogAndInventory.supplierProductsCount === 'number');

      // Verify quality metrics
      assert.ok(data.qualityAndCustomerCare, 'Metrics must include quality metrics');
      assert.ok(typeof data.qualityAndCustomerCare.totalReviews === 'number');
      assert.ok(typeof data.qualityAndCustomerCare.averageReviewRating === 'number');

      // Verify supplier settlements metrics
      assert.ok(data.supplierSettlements, 'Metrics must include supplier settlements');
      assert.ok(typeof data.supplierSettlements.supplierPayablesPending === 'number');
      assert.ok(typeof data.supplierSettlements.supplierPayablesSettled === 'number');
    });
  });
});
