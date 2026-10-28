import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  User,
  IUser,
  MedicalProduct,
  ProductOrder,
  Supplier,
  AuditLog,
  NotificationLog,
} from '../src/models/index.js';
import { generateAuthToken } from '../src/services/authService.js';

describe('VivoQuest — Phase 15: Storefront, Product Cards, Checkout, Order Tracking & Delivery Management Test Suite', () => {
  const app = createApp();

  // Test Admin
  const adminPhone = '9855110001';
  let adminToken: string;
  let adminUser: IUser;

  // Test Patient A (Primary Shopper)
  const patientAPhone = '9855110002';
  let patientAToken: string;
  let patientAUser: IUser;

  // Test Patient B (Unauthorized snooper)
  const patientBPhone = '9855110003';
  let patientBToken: string;
  let patientBUser: IUser;

  // Test Caregiver
  const caregiverPhone = '9855110004';
  let caregiverToken: string;
  let caregiverUser: IUser;

  // Test Supplier A (Authorized for own item)
  const supplierAPhone = '9855110005';
  let supplierAToken: string;
  let supplierAUser: IUser;
  let supplierADoc: any;

  // Test Supplier B (Unassigned supplier)
  const supplierBPhone = '9855110006';
  let supplierBToken: string;
  let supplierBUser: IUser;
  let supplierBDoc: any;

  const testPhones = [adminPhone, patientAPhone, patientBPhone, caregiverPhone, supplierAPhone, supplierBPhone];
  const testSkuPrefix = 'P15-';

  let testProduct1Id: string;
  let testProduct1Sku: string;
  let testProduct2Id: string;
  let testProduct2Sku: string;
  let testSupplierProductId: string;
  let testSupplierProductSku: string;

  let activeOrderId: string;
  let activeOrderNumber: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();

    // Clean up any test artifacts from prior runs
    await User.deleteMany({ phone: { $in: testPhones } });
    await Supplier.deleteMany({ supplierCode: { $in: ['SUP-P15-A', 'SUP-P15-B'] } });
    await MedicalProduct.deleteMany({ sku: { $regex: `^${testSkuPrefix}` } });
    await ProductOrder.deleteMany({ patientPhone: { $in: [patientAPhone, patientBPhone] } });
    await AuditLog.deleteMany({ targetId: { $regex: /^ORD-P15/ } });
    await NotificationLog.deleteMany({ recipientPhone: { $in: [patientAPhone, patientBPhone] } });

    // 1. Create Admin
    adminUser = await User.create({
      fullName: 'Phase 15 Test Admin',
      phone: adminPhone,
      email: 'admin.phase15@vivoquest.in',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'admin',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'admin_ops', version: '1.0' },
    });
    adminToken = generateAuthToken(adminUser);

    // 2. Create Patient A
    const patientHash = await bcrypt.hash('Password@123', 10);
    patientAUser = await User.create({
      fullName: 'Sunita Rao',
      phone: patientAPhone,
      email: 'sunita.phase15@vivoquest.in',
      passwordHash: patientHash,
      role: 'patient',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'patient_care', version: '1.0' },
    });
    patientAToken = generateAuthToken(patientAUser);

    // 3. Create Patient B
    patientBUser = await User.create({
      fullName: 'Kishore Deshmukh',
      phone: patientBPhone,
      email: 'kishore.phase15@vivoquest.in',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'patient',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'patient_care', version: '1.0' },
    });
    patientBToken = generateAuthToken(patientBUser);

    // 4. Create Caregiver
    caregiverUser = await User.create({
      fullName: 'Sister Anita Nurse',
      phone: caregiverPhone,
      email: 'anita.phase15@vivoquest.in',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'caregiver',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'field_care', version: '1.0' },
    });
    caregiverToken = generateAuthToken(caregiverUser);

    // 5. Create Supplier A
    supplierAUser = await User.create({
      fullName: 'Apex MedTech Lead',
      phone: supplierAPhone,
      email: 'lead.apex@vivoquest.in',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'supplier',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'supplier_portal', version: '1.0' },
    });
    supplierAToken = generateAuthToken(supplierAUser);

    supplierADoc = await Supplier.create({
      supplierCode: 'SUP-P15-A',
      name: 'Apex MedTech Solutions Pvt Ltd',
      contactPerson: 'Lead Apex',
      phone: supplierAPhone,
      email: 'apex@dme.in',
      address: 'Plot 12, Pimpri Industrial Area',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411004',
      gstin: '27AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      bankDetails: {
        accountName: 'Apex MedTech Solutions',
        accountNumber: '998877665544',
        ifsc: 'HDFC0001234',
        bankName: 'HDFC Bank Pune',
      },
      sourcingType: 'supplier_direct',
      verificationStatus: 'verified',
      userId: supplierAUser._id,
      isActive: true,
    });

    // 6. Create Supplier B
    supplierBUser = await User.create({
      fullName: 'CarePlus Logistics Lead',
      phone: supplierBPhone,
      email: 'lead.careplus@vivoquest.in',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'supplier',
      isVerified: true,
      dpdpConsent: { consentGranted: true, consentTimestamp: new Date(), purpose: 'supplier_portal', version: '1.0' },
    });
    supplierBToken = generateAuthToken(supplierBUser);

    supplierBDoc = await Supplier.create({
      supplierCode: 'SUP-P15-B',
      name: 'CarePlus DME Supplies LLP',
      contactPerson: 'CarePlus Manager',
      phone: supplierBPhone,
      email: 'careplus@dme.in',
      address: 'Shop 4, Andheri Kurla Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      gstin: '27BBBBB0000B1Z6',
      pan: 'BBBBB0000B',
      bankDetails: {
        accountName: 'CarePlus DME Supplies',
        accountNumber: '112233445566',
        ifsc: 'ICIC0005678',
        bankName: 'ICICI Bank Mumbai',
      },
      sourcingType: 'supplier_direct',
      verificationStatus: 'verified',
      userId: supplierBUser._id,
      isActive: true,
    });

    // 7. Seed Test Products
    const p1 = await MedicalProduct.create({
      sku: `${testSkuPrefix}FALL-GRAB-01`,
      title: 'Phase 15 Stainless Steel Ergonomic Grab Bar',
      category: 'fall_prevention',
      description: 'Heavy duty slip-resistant bathroom grab bar with concealed mounting.',
      price: 1500,
      regularPrice: 2000,
      sellingPrice: 1500, // 25% discount
      stockQuantity: 25,
      reservedQuantity: 0,
      sourcingType: 'own_stock',
      status: 'active',
      isActive: true,
      installationEligible: true,
      installationServiceCharge: 250,
      estimatedDeliveryDays: '2-3 business days',
      images: ['/assets/images/products/grab_bar.jpg'],
      imageGallery: [
        { url: '/assets/images/products/grab_bar.jpg', altText: 'Primary Front View', isPrimary: true },
        { url: '/assets/images/products/grab_bar_blueprint.jpg', altText: 'Technical Mounting Diagram', isPrimary: false },
      ],
      specifications: { Material: 'SUS 304 Stainless Steel', MaxLoad: '150 kg', Finish: 'Brushed Satin' },
      reviewCount: 0,
    });
    testProduct1Id = p1._id.toString();
    testProduct1Sku = p1.sku;

    const p2 = await MedicalProduct.create({
      sku: `${testSkuPrefix}RESP-NEB-02`,
      title: 'Phase 15 Ultrasonic Mesh Portable Nebulizer',
      category: 'respiratory',
      description: 'Pocket-sized silent mesh nebulizer for respiratory therapies.',
      price: 2800,
      regularPrice: 3500,
      sellingPrice: 2800, // 20% discount
      stockQuantity: 10,
      reservedQuantity: 0,
      sourcingType: 'own_stock',
      status: 'active',
      isActive: true,
      installationEligible: false,
      estimatedDeliveryDays: '1-2 business days',
      images: ['/assets/images/products/nebulizer.jpg'],
      imageGallery: [
        { url: '/assets/images/products/nebulizer.jpg', altText: 'Front View', isPrimary: true },
      ],
      specifications: { ParticleSize: '3.7 um', CupCapacity: '10 ml', Battery: 'USB-C Rechargeable' },
      reviewCount: 0,
    });
    testProduct2Id = p2._id.toString();
    testProduct2Sku = p2.sku;

    const pSupp = await MedicalProduct.create({
      sku: `${testSkuPrefix}MOB-WALKER-03`,
      title: 'Phase 15 Deluxe Foldable Walker with Wheels',
      category: 'mobility',
      description: 'Lightweight aluminum folding mobility walker with smooth-glide front wheels.',
      price: 3200,
      regularPrice: 4000,
      sellingPrice: 3200,
      stockQuantity: 15,
      reservedQuantity: 0,
      sourcingType: 'supplier_direct',
      supplierId: supplierADoc._id,
      supplierName: supplierADoc.name,
      status: 'active',
      isActive: true,
      installationEligible: true,
      installationServiceCharge: 300,
      estimatedDeliveryDays: '3-5 business days',
      images: ['/assets/images/products/walker.jpg'],
      imageGallery: [
        { url: '/assets/images/products/walker.jpg', altText: 'Folded and Assembled Views', isPrimary: true },
      ],
      specifications: { Frame: 'Anodized Aircraft Aluminum', WeightCapacity: '136 kg' },
      reviewCount: 0,
    });
    testSupplierProductId = pSupp._id.toString();
    testSupplierProductSku = pSupp.sku;
  });

  after(async () => {
    // Cleanup test data safely
    await User.deleteMany({ phone: { $in: testPhones } });
    await Supplier.deleteMany({ supplierCode: { $in: ['SUP-P15-A', 'SUP-P15-B'] } });
    await MedicalProduct.deleteMany({ sku: { $regex: `^${testSkuPrefix}` } });
    await ProductOrder.deleteMany({ patientPhone: { $in: [patientAPhone, patientBPhone] } });
    await AuditLog.deleteMany({ targetId: { $regex: /^ORD-P15/ } });
    await NotificationLog.deleteMany({ recipientPhone: { $in: [patientAPhone, patientBPhone] } });
    await disconnectDatabase();
  });

  // ---------------------------------------------------------------------------
  // PART K.1: Product cards render actual product information and image fallbacks
  // ---------------------------------------------------------------------------
  describe('1. Product Cards & Catalog Real Data Verification', () => {
    it('1.1 should retrieve product catalog with authentic images, specs, and gallery data', async () => {
      const res = await request(app).get(`/api/v1/products?search=${testSkuPrefix}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 3);

      const grabBar = res.body.data.find((p: any) => p.sku === testProduct1Sku);
      assert.ok(grabBar, 'Test grab bar must be in catalog response');
      assert.equal(grabBar.title, 'Phase 15 Stainless Steel Ergonomic Grab Bar');
      assert.equal(grabBar.category, 'fall_prevention');
      assert.equal(grabBar.sourcingType, 'own_stock');
      assert.equal(grabBar.images[0], '/assets/images/products/grab_bar.jpg');
      assert.ok(grabBar.imageGallery.length >= 2, 'Should support multiple gallery images with alt text');
      assert.equal(grabBar.imageGallery[0].altText, 'Primary Front View');
      assert.equal(grabBar.specifications.Material, 'SUS 304 Stainless Steel');
    });

    it('1.2 should strictly preserve reviewCount = 0 and avoid fabricating fake star ratings', async () => {
      const res = await request(app).get(`/api/v1/products/${testProduct1Id}`);
      assert.equal(res.status, 200);
      const product = res.body.data;
      assert.equal(product.reviewCount, 0, 'Must not invent fake review counts');
    });
  });

  // ---------------------------------------------------------------------------
  // PART K.2: Price, discount, and totals calculated correctly
  // ---------------------------------------------------------------------------
  describe('2. Pricing, Discount Math & Server-Side Totals Derivation', () => {
    it('2.1 should correctly calculate discount percentages on the backend', async () => {
      const res = await request(app).get(`/api/v1/products/${testProduct1Id}`);
      assert.equal(res.status, 200);
      const prod = res.body.data;
      // regularPrice = 2000, sellingPrice = 1500 -> discount = 25%
      assert.equal(prod.regularPrice, 2000);
      assert.equal(prod.sellingPrice, 1500);
      assert.equal(prod.discountPercentage, 25);
    });

    it('2.2 should compute accurate cart subtotal, discount, 12% GST, and installation charges', async () => {
      const cartPayload = {
        items: [
          { productId: testProduct1Id, quantity: 2, isRental: false, installationSelected: true },
          { productId: testProduct2Id, quantity: 1, isRental: false, installationSelected: false },
        ],
      };

      const res = await request(app)
        .put('/api/v1/products/cart')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send(cartPayload);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const pricing = res.body.data.pricing;

      // Product 1: 2 x 1500 = 3000 (regular 2 x 2000 = 4000)
      // Product 2: 1 x 2800 = 2800 (regular 1 x 3500 = 3500)
      // Total selling subtotal = 5800. Regular subtotal = 7500. Discount = 1700.
      assert.equal(pricing.subtotal, 5800);
      assert.equal(pricing.discountTotal, 1700);

      // Installation: Product 1 has 250 fee per item (2 x 250 = 500)
      assert.equal(pricing.installationCharge, 500);

      // GST: 12% of 5800 = 696
      assert.equal(pricing.taxGst, 696);

      // Total payable = 5800 + 500 + 696 + deliveryFee(0 for >= 1000) = 6996
      assert.equal(pricing.totalAmount, 6996);
    });
  });

  // ---------------------------------------------------------------------------
  // PART K.3: Search, filters, and sorting work with real API data
  // ---------------------------------------------------------------------------
  describe('3. Product Discovery: Search, Filters & Sorting', () => {
    it('3.1 should filter catalog by category correctly', async () => {
      const res = await request(app).get(`/api/v1/products?category=fall_prevention&search=${testSkuPrefix}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.data.every((p: any) => p.category === 'fall_prevention'));
      assert.ok(res.body.data.some((p: any) => p.sku === testProduct1Sku));
    });

    it('3.2 should filter catalog by sourcing type (own_stock vs supplier_direct)', async () => {
      const resOwn = await request(app).get(`/api/v1/products?sourcingType=own_stock&search=${testSkuPrefix}`);
      assert.equal(resOwn.status, 200);
      assert.ok(resOwn.body.data.every((p: any) => p.sourcingType === 'own_stock'));

      const resSupp = await request(app).get(`/api/v1/products?sourcingType=supplier_direct&search=${testSkuPrefix}`);
      assert.equal(resSupp.status, 200);
      assert.ok(resSupp.body.data.every((p: any) => p.sourcingType === 'supplier_direct'));
      assert.ok(resSupp.body.data.some((p: any) => p.sku === testSupplierProductSku));
    });

    it('3.3 should sort catalog by price ascending and descending', async () => {
      const resAsc = await request(app).get(`/api/v1/products?search=${testSkuPrefix}&sort=price_asc`);
      assert.equal(resAsc.status, 200);
      const pricesAsc = resAsc.body.data.map((p: any) => p.sellingPrice);
      for (let i = 0; i < pricesAsc.length - 1; i++) {
        assert.ok(pricesAsc[i] <= pricesAsc[i + 1], `Ascending sort failed: ${pricesAsc[i]} > ${pricesAsc[i + 1]}`);
      }

      const resDesc = await request(app).get(`/api/v1/products?search=${testSkuPrefix}&sort=price_desc`);
      assert.equal(resDesc.status, 200);
      const pricesDesc = resDesc.body.data.map((p: any) => p.sellingPrice);
      for (let i = 0; i < pricesDesc.length - 1; i++) {
        assert.ok(pricesDesc[i] >= pricesDesc[i + 1], `Descending sort failed: ${pricesDesc[i]} < ${pricesDesc[i + 1]}`);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // PART K.4 & K.5: Guest checkout redirects & Login preserves single account
  // ---------------------------------------------------------------------------
  describe('4. Authentication & Account Preservation', () => {
    it('4.1 should login existing patient without duplicating user documents', async () => {
      const countBefore = await User.countDocuments({ phone: patientAPhone });
      assert.equal(countBefore, 1);

      const res = await request(app).post('/api/v1/auth/login').send({
        identifier: patientAPhone,
        password: 'Password@123',
        role: 'patient',
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.phone, patientAPhone);

      const countAfter = await User.countDocuments({ phone: patientAPhone });
      assert.equal(countAfter, 1, 'Duplicate user account must not be created upon logging in');
    });
  });

  // ---------------------------------------------------------------------------
  // PART K.6: Backend stock & price revalidation at checkout
  // ---------------------------------------------------------------------------
  describe('5. Backend Stock & Price Revalidation at Checkout', () => {
    it('5.1 should REJECT order creation when requested quantity exceeds available stock', async () => {
      const invalidOrder = {
        items: [
          { productId: testProduct1Id, quantity: 9999, isRental: false }, // only 25 in stock
        ],
        deliveryAddress: {
          street: '101 FC Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411004',
          contactPhone: patientAPhone,
        },
        paymentMethod: 'online',
        idempotencyKey: `idemp_oversell_${Date.now()}`,
      };

      const res = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send(invalidOrder);

      assert.equal(res.status, 400);
      assert.match(res.body.error.message, /insufficient stock/i);
    });

    it('5.2 should recalculate authentic prices on server and ignore client-submitted prices', async () => {
      const orderWithFakePrice = {
        items: [
          { productId: testProduct1Id, quantity: 1, isRental: false, unitPrice: 1 }, // Trying to buy a 1500 product for 1
        ],
        deliveryAddress: {
          street: '101 FC Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411004',
          contactPhone: patientAPhone,
        },
        paymentMethod: 'online',
        idempotencyKey: `idemp_fakeprice_${Date.now()}`,
      };

      const res = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send(orderWithFakePrice);

      assert.equal(res.status, 201);
      // Server must override unit price with 1500, plus 150 delivery fee (subtotal < 2000) and 12% GST (180) = 1830
      assert.equal(res.body.data.items[0].unitPrice, 1500);
      assert.equal(res.body.data.pricing.subtotal, 1500);
      assert.equal(res.body.data.pricing.deliveryFee, 150);
      assert.equal(res.body.data.pricing.taxGst, 180);
      assert.equal(res.body.data.pricing.totalAmount, 1830);
    });
  });

  // ---------------------------------------------------------------------------
  // PART K.7 & K.8: Payment verification confirms order and decrements stock
  // ---------------------------------------------------------------------------
  describe('6. Payment Verification & Confirmation Workflow', () => {
    let orderToPayId: string;
    let orderToPayNumber: string;

    it('6.1 should create order with pending payment and placed status (never prematurely confirmed)', async () => {
      const orderPayload = {
        items: [
          { productId: testProduct1Id, quantity: 2, isRental: false, installationSelected: false },
        ],
        deliveryAddress: {
          street: '55 Aundh High St',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411007',
          contactPhone: patientAPhone,
        },
        paymentMethod: 'online',
        idempotencyKey: `idemp_payconfirm_${Date.now()}`,
      };

      const res = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send(orderPayload);

      assert.equal(res.status, 201);
      const ord = res.body.data;
      assert.equal(ord.orderStatus, 'placed');
      assert.equal(ord.paymentStatus, 'pending');
      assert.ok(ord.estimatedDeliveryDate, 'Default estimated delivery date should be initialized');

      orderToPayId = ord.id || ord._id;
      orderToPayNumber = ord.orderNumber;
      activeOrderId = ord.id || ord._id;
      activeOrderNumber = ord.orderNumber;

      // Stock reservation check: 25 initial, 1 reserved in 5.2 + 2 reserved in 6.1 = 22 remaining, 3 reserved
      const prodCheck = await MedicalProduct.findById(testProduct1Id);
      assert.equal(prodCheck?.stockQuantity, 22);
      assert.equal(prodCheck?.reservedQuantity, 3);
    });

    it('6.2 should NOT confirm order on invalid payment signature', async () => {
      const res = await request(app)
        .post('/api/v1/products/payments/verify')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          orderId: orderToPayId,
          razorpayOrderId: 'rzp_invalid_order_id',
          razorpayPaymentId: 'pay_invalid_123',
          razorpaySignature: 'invalid_tampered_signature',
        });

      assert.equal(res.status, 400);

      // Verify order remains pending
      const ord = await ProductOrder.findById(orderToPayId);
      assert.equal(ord?.paymentStatus, 'pending');
      assert.equal(ord?.orderStatus, 'placed');
    });

    it('6.3 should confirm order, commit stock decrement, and dispatch notification on verified payment', async () => {
      const rzpOrderId = `rzp_test_ord_${orderToPayNumber}`;
      const rzpPaymentId = `pay_sim_${Date.now()}_abc`;
      const rzpSignature = `test_sig_${rzpOrderId}_${rzpPaymentId}`;

      const res = await request(app)
        .post('/api/v1/products/payments/verify')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          orderId: orderToPayId,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          razorpaySignature: rzpSignature,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.orderStatus, 'confirmed');
      assert.equal(res.body.data.paymentStatus, 'paid');

      // Stock preserved at 22 remaining (stock already decremented upon reservation, reservedQuantity stays 3 until dispatch)
      const prodCheck = await MedicalProduct.findById(testProduct1Id);
      assert.equal(prodCheck?.stockQuantity, 22);
      assert.equal(prodCheck?.reservedQuantity, 3);

      // Notification log generated
      const notif = await NotificationLog.findOne({
        recipientPhone: patientAPhone,
        templateId: 'PRODUCT_ORDER_CONFIRMED',
      });
      assert.ok(notif, 'Order confirmation notification must be stored in database');
      assert.match(notif.messageBody, new RegExp(orderToPayNumber));
    });

    it('6.4 should be idempotent: second verification call does not double decrement stock or duplicate notifications', async () => {
      const notifsBefore = await NotificationLog.countDocuments({
        recipientPhone: patientAPhone,
        templateId: 'PRODUCT_ORDER_CONFIRMED',
      });

      const rzpOrderId = `rzp_test_ord_${orderToPayNumber}`;
      const rzpPaymentId = `pay_sim_dup_${Date.now()}`;
      const rzpSignature = `test_sig_${rzpOrderId}_${rzpPaymentId}`;

      const res = await request(app)
        .post('/api/v1/products/payments/verify')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          orderId: orderToPayId,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          razorpaySignature: rzpSignature,
        });

      assert.equal(res.status, 200);

      // Stock unchanged (still 22)
      const prodCheck = await MedicalProduct.findById(testProduct1Id);
      assert.equal(prodCheck?.stockQuantity, 22);

      // No duplicate notification
      const notifsAfter = await NotificationLog.countDocuments({
        recipientPhone: patientAPhone,
        templateId: 'PRODUCT_ORDER_CONFIRMED',
      });
      assert.equal(notifsAfter, notifsBefore, 'Duplicate verification must not emit duplicate notification');
    });
  });

  // ---------------------------------------------------------------------------
  // PART K.9: Patient order history isolation
  // ---------------------------------------------------------------------------
  describe('7. Patient Order Lookup Isolation', () => {
    it('7.1 should allow Patient A to query and track their own order', async () => {
      const res = await request(app)
        .get(`/api/v1/products/orders/${activeOrderId}`)
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.orderNumber, activeOrderNumber);
    });

    it('7.2 should STRICTLY FORBID Patient B from viewing Patient A order (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/products/orders/${activeOrderId}`)
        .set('Authorization', `Bearer ${patientBToken}`);

      assert.equal(res.status, 403);
      assert.match(res.body.error.message, /access denied|forbidden/i);
    });
  });

  // ---------------------------------------------------------------------------
  // PART K.10: Stored tracking timeline events
  // ---------------------------------------------------------------------------
  describe('8. Persisted Tracking Timeline Events', () => {
    it('8.1 should contain chronological tracking events recorded in database', async () => {
      const res = await request(app)
        .get(`/api/v1/products/orders/${activeOrderId}`)
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.equal(res.status, 200);
      const updates = res.body.data.trackingUpdates;
      assert.ok(Array.isArray(updates));
      assert.ok(updates.length >= 2, 'Should have order placed and payment confirmed events');
      assert.ok(updates.some((u: any) => u.status === 'placed' || /received|placed/i.test(u.message)));
      assert.ok(updates.some((u: any) => /payment.*verified/i.test(u.message)));
    });
  });

  // ---------------------------------------------------------------------------
  // PART K.11, K.12, K.13: Delivery date management, RBAC, Audit & Notifications
  // ---------------------------------------------------------------------------
  describe('9. Delivery Date Management, RBAC & Audit Trail', () => {
    it('9.1 should allow Admin to update estimated delivery date with mandatory reason', async () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 7); // 7 days in future
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const res = await request(app)
        .patch(`/api/v1/admin/marketplace/orders/${activeOrderId}/delivery-estimate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          estimatedDeliveryDate: targetDateStr,
          reason: 'Biomedical sensor calibration and specialized temperature packaging required',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const ord = res.body.data;

      // Verify date updated
      const updatedDate = new Date(ord.estimatedDeliveryDate).toISOString().split('T')[0];
      assert.equal(updatedDate, targetDateStr);

      // Verify deliveryEstimateHistory recorded
      assert.ok(ord.deliveryEstimateHistory && ord.deliveryEstimateHistory.length > 0);
      const lastHistory = ord.deliveryEstimateHistory[ord.deliveryEstimateHistory.length - 1];
      assert.equal(lastHistory.reason, 'Biomedical sensor calibration and specialized temperature packaging required');
      assert.equal(lastHistory.updatedByRole, 'admin');

      // Verify trackingUpdate added
      const lastTrack = ord.trackingUpdates[ord.trackingUpdates.length - 1];
      assert.match(lastTrack.message, /estimated delivery date updated/i);
    });

    it('9.2 should create AuditLog record for delivery date update', async () => {
      const audit = await AuditLog.findOne({
        action: 'DELIVERY_ESTIMATE_UPDATED',
        targetId: activeOrderNumber,
      });

      assert.ok(audit, 'Audit log entry must exist for delivery date change');
      assert.equal(audit.actorRole, 'admin');
      assert.equal(audit.details?.orderNumber, activeOrderNumber);
      assert.match(audit.details?.reason, /calibration/i);
    });

    it('9.3 should dispatch delivery update notification to patient', async () => {
      const notif = await NotificationLog.findOne({
        recipientPhone: patientAPhone,
        templateId: 'PRODUCT_ORDER_DELIVERY_UPDATED',
      });

      assert.ok(notif, 'Delivery updated notification must be logged');
      assert.match(notif.messageBody, new RegExp(activeOrderNumber));
      assert.match(notif.messageBody, /calibration/i);
    });

    it('9.4 should REJECT delivery date change without a valid reason (minimum 3 chars)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/marketplace/orders/${activeOrderId}/delivery-estimate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          estimatedDeliveryDate: new Date().toISOString(),
          reason: '  ', // invalid whitespace reason
        });

      assert.equal(res.status, 400);
      assert.match(res.body.error.message, /reason/i);
    });

    it('9.5 CRITICAL RBAC: should FORBID standard patient from updating delivery dates (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/orders/${activeOrderId}/delivery-estimate`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          estimatedDeliveryDate: new Date().toISOString(),
          reason: 'Patient trying to change delivery date directly',
        });

      assert.equal(res.status, 403);
    });

    it('9.6 CRITICAL RBAC: should FORBID caregivers from updating delivery dates (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/orders/${activeOrderId}/delivery-estimate`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          estimatedDeliveryDate: new Date().toISOString(),
          reason: 'Caregiver trying to change delivery date',
        });

      assert.equal(res.status, 403);
    });

    it('9.7 CRITICAL RBAC: should FORBID unassigned Supplier B from updating delivery date (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/supplier/orders/${activeOrderId}/delivery-estimate`)
        .set('Authorization', `Bearer ${supplierBToken}`)
        .send({
          estimatedDeliveryDate: new Date().toISOString(),
          reason: 'Supplier B trying to change order with no items belonging to them',
        });

      assert.equal(res.status, 403);
    });
  });

  // ---------------------------------------------------------------------------
  // PART K.15: Regression checks
  // ---------------------------------------------------------------------------
  describe('10. Regression & Safety Integrity Verification', () => {
    it('10.1 should verify that orders API honors existing status filters', async () => {
      const res = await request(app)
        .get('/api/v1/products/orders?status=confirmed')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.every((o: any) => o.orderStatus === 'confirmed'));
    });

    it('10.2 should verify that active order details show the updated delivery date and audit history', async () => {
      const res = await request(app)
        .get(`/api/v1/products/orders/${activeOrderNumber}`)
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.equal(res.status, 200);
      const ord = res.body.data;
      assert.ok(ord.estimatedDeliveryDate);
      assert.ok(ord.deliveryEstimateHistory.length >= 1);
    });
  });
});
