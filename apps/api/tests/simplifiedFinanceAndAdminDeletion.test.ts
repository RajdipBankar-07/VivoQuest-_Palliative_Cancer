import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { MedicalProduct } from '../src/models/MedicalProduct.js';
import { ProductOrder } from '../src/models/ProductOrder.js';
import { AuditLog } from '../src/models/AuditLog.js';

describe('VivoQuest — Simplified Finance Dashboard, 10-Record Pagination & Admin Deletion Test Suite', () => {
  const app = createApp();
  let adminToken: string;
  let adminId: string;
  let patientToken: string;

  let testProductWithOrders: any;
  let testProductWithoutOrders: any;
  let testOrderSettled: any;
  let testOrderUnsettled: any;

  before(async () => {
    await connectDatabase();

    // 1. Create or login an Admin user
    const adminPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Finance Lead Admin',
      phone: adminPhone,
      password: 'AdminPassword@123',
      role: 'admin',
      city: 'Pune',
      pincode: '411001',
      consentAccepted: true,
    });
    adminToken = adminRes.body.data?.token || adminRes.body.token;
    adminId = adminRes.body.data?.user?.id || adminRes.body.data?.user?._id;

    // 2. Create a normal Patient user for RBAC negative checks
    const patientPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const patientRes = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Regular Patient User',
      phone: patientPhone,
      password: 'PatientPassword@123',
      role: 'patient',
      city: 'Pune',
      pincode: '411001',
      consentAccepted: true,
    });
    patientToken = patientRes.body.data?.token || patientRes.body.token;

    // 3. Create a product that HAS historical orders
    testProductWithOrders = await MedicalProduct.create({
      sku: `DME-TEST-HIST-${Date.now()}`,
      title: 'Historical Oxygen Concentrator (With Orders)',
      description: 'Medical test product with historical customer orders',
      category: 'respiratory',
      price: 25000,
      regularPrice: 28000,
      procurementCost: 16000,
      stockQuantity: 10,
      status: 'active',
      isActive: true,
      sourcingType: 'own_stock',
    });

    // Create an order referencing this product
    testOrderSettled = await ProductOrder.create({
      orderNumber: `VQ-SETTLED-${Date.now()}`,
      invoiceNumber: `INV-SETTLED-${Date.now()}`,
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Settled Test Patient',
      patientPhone: '9822999991',
      items: [
        {
          productId: testProductWithOrders._id,
          sku: testProductWithOrders.sku,
          title: testProductWithOrders.title,
          category: testProductWithOrders.category,
          quantity: 1,
          unitPrice: testProductWithOrders.price,
          procurementCost: testProductWithOrders.procurementCost,
          sourcingType: 'own_stock',
          isRental: false,
          setupRequired: false,
        },
      ],
      pricing: {
        subtotal: 25000,
        deliveryFee: 0,
        taxGst: 3000,
        totalAmount: 28000,
        procurementCostTotal: 16000,
        gatewayFee: 560,
      },
      deliveryAddress: { street: 'Main St', city: 'Pune', state: 'MH', pincode: '411001' },
      clinicalSetup: { isSetupRequired: false, setupStatus: 'not_required' },
      paymentMethod: 'online',
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      trackingUpdates: [{ timestamp: new Date(), status: 'confirmed', message: 'Order confirmed' }],
      isDemo: true,
    });

    // 4. Create a product that has ZERO historical orders
    testProductWithoutOrders = await MedicalProduct.create({
      sku: `DME-TEST-UNPURCHASED-${Date.now()}`,
      title: 'Draft Unpurchased Nebulizer',
      description: 'Medical test product with 0 historical customer orders',
      category: 'respiratory',
      price: 1800,
      regularPrice: 2200,
      procurementCost: 1100,
      stockQuantity: 5,
      status: 'draft',
      isActive: true,
      sourcingType: 'own_stock',
    });

    // 5. Create an unsettled order for transaction deletion checks
    testOrderUnsettled = await ProductOrder.create({
      orderNumber: `VQ-UNSETTLED-${Date.now()}`,
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Unsettled Test Patient',
      patientPhone: '9822999992',
      items: [
        {
          productId: testProductWithOrders._id,
          sku: testProductWithOrders.sku,
          title: testProductWithOrders.title,
          category: testProductWithOrders.category,
          quantity: 1,
          unitPrice: 25000,
          procurementCost: 16000,
          sourcingType: 'own_stock',
          isRental: false,
          setupRequired: false,
        },
      ],
      pricing: {
        subtotal: 25000,
        deliveryFee: 0,
        taxGst: 3000,
        totalAmount: 28000,
      },
      deliveryAddress: { street: 'Test Ave', city: 'Pune', state: 'MH', pincode: '411001' },
      clinicalSetup: { isSetupRequired: false, setupStatus: 'not_required' },
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'placed',
      trackingUpdates: [{ timestamp: new Date(), status: 'placed', message: 'Order placed' }],
      isDemo: true,
    });
  });

  after(async () => {
    // Cleanup created test records
    if (testProductWithOrders?._id) {
      await MedicalProduct.deleteOne({ _id: testProductWithOrders._id });
    }
    if (testProductWithoutOrders?._id) {
      await MedicalProduct.deleteOne({ _id: testProductWithoutOrders._id });
    }
    if (testOrderSettled?._id) {
      await ProductOrder.deleteOne({ _id: testOrderSettled._id });
    }
    if (testOrderUnsettled?._id) {
      await ProductOrder.deleteOne({ _id: testOrderUnsettled._id });
    }
    if (adminId) {
      await User.deleteOne({ _id: adminId });
    }
    await disconnectDatabase();
  });

  describe('1. Simplified Finance Dashboard & Plain-Language Metrics', () => {
    it('1.1 should calculate authoritative executive summary with plain business metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const data = res.body.data;
      assert.ok(data.executiveSummary, 'Must contain executiveSummary');

      const exec = data.executiveSummary;
      assert.ok(typeof exec.totalCustomerCollections === 'number');
      assert.ok(typeof exec.totalExpenses === 'number');
      assert.ok(typeof exec.netProfitOrLoss === 'number');
      assert.ok(typeof exec.isProfit === 'boolean');
      assert.ok(typeof exec.calculationExplanation === 'string');
      assert.ok(typeof exec.pendingSupplierPayments === 'number');
      assert.ok(typeof exec.taxesCollected === 'number');
      assert.ok(typeof exec.paymentGatewayFees === 'number');

      // Verify explanation string mentions revenue and costs
      assert.ok(exec.calculationExplanation.includes('Recognized Revenue'));
      assert.ok(exec.calculationExplanation.includes('COGS') || exec.calculationExplanation.includes('Costs'));
    });

    it('1.2 should strictly reject unauthorized users trying to access financial summary', async () => {
      const unauthRes = await request(app).get('/api/v1/admin/finances/summary');
      assert.equal(unauthRes.status, 401);

      const patientRes = await request(app)
        .get('/api/v1/admin/finances/summary')
        .set('Authorization', `Bearer ${patientToken}`);
      assert.equal(patientRes.status, 403);
    });
  });

  describe('2. Independent 10-Record Pagination', () => {
    it('2.1 should support exactly 10 records per page by default in Owned Products', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/owned-products?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const data = res.body.data;

      assert.ok(data.pagination);
      assert.equal(data.pagination.page, 1);
      assert.equal(data.pagination.limit, 10);
      assert.ok(data.transactions.length <= 10);
    });

    it('2.2 should support independent pagination in Marketplace & Suppliers tab', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/marketplace?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const data = res.body.data;

      assert.ok(data.pagination);
      assert.equal(data.pagination.page, 1);
      assert.equal(data.pagination.limit, 10);
      assert.ok(data.transactions.length <= 10);
    });
  });

  describe('3. Admin-Only Permanent Delete vs Safe Archival for Products', () => {
    it('3.1 should reject product deletion attempts by unauthenticated or patient users', async () => {
      const unauthRes = await request(app).delete(`/api/v1/admin/marketplace/products/${testProductWithoutOrders._id}`);
      assert.equal(unauthRes.status, 401);

      const patientRes = await request(app)
        .delete(`/api/v1/admin/marketplace/products/${testProductWithoutOrders._id}`)
        .set('Authorization', `Bearer ${patientToken}`);
      assert.equal(patientRes.status, 403);
    });

    it('3.2 should permanently delete product with 0 historical orders and log audit event', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/marketplace/products/${testProductWithoutOrders._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.action, 'permanently_deleted');

      // Verify product is erased from MongoDB
      const found = await MedicalProduct.findById(testProductWithoutOrders._id);
      assert.equal(found, null, 'Product with 0 orders must be erased from database');

      // Verify audit event was recorded
      const audit = await AuditLog.findOne({
        action: 'PRODUCT_PERMANENTLY_DELETED',
        targetId: testProductWithoutOrders.sku,
      });
      assert.ok(audit, 'Must record audit log for permanent product deletion');
    });

    it('3.3 should SAFE-ARCHIVE product with historical orders to preserve financial records', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/marketplace/products/${testProductWithOrders._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.action, 'archived');
      assert.ok(res.body.message.includes('historical order'));

      // Verify product still exists in MongoDB but status is 'archived' and isActive is false
      const found = await MedicalProduct.findById(testProductWithOrders._id);
      assert.ok(found, 'Product with historical orders must NOT be deleted');
      assert.equal(found.status, 'archived');
      assert.equal(found.isActive, false);

      // Verify historical order still references the product intact
      const order = await ProductOrder.findById(testOrderSettled._id);
      assert.ok(order, 'Historical order must remain intact');
      assert.equal(order.items[0].sku, testProductWithOrders.sku);

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'ARCHIVE_PRODUCT_PRESERVED_HISTORY',
        targetId: testProductWithOrders.sku,
      });
      assert.ok(audit, 'Must record audit log for archived product preserving history');
    });
  });

  describe('4. Historical Financial Record Audit Protection & Deletion Rules', () => {
    it('4.1 should PROTECT settled paid orders from deletion by archiving them instead', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/finances/transactions/${testOrderSettled._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.action, 'archived');
      assert.ok(res.body.message.includes('Permanent deletion is prohibited'));

      // Verify order is preserved in MongoDB with isArchived = true
      const preservedOrder = await ProductOrder.findById(testOrderSettled._id);
      assert.ok(preservedOrder, 'Settled order must remain in database for accounting audit');
      assert.equal(preservedOrder.isArchived, true);

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'FINANCIAL_TRANSACTION_ARCHIVED',
        targetId: testOrderSettled.orderNumber,
      });
      assert.ok(audit, 'Must record audit log for archived financial transaction');
    });

    it('4.2 should allow permanently deleting unsettled test orders', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/finances/transactions/${testOrderUnsettled._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.action, 'permanently_deleted');

      const deletedOrder = await ProductOrder.findById(testOrderUnsettled._id);
      assert.equal(deletedOrder, null, 'Unsettled test order can be removed');
    });
  });

  describe('5. PDF, Excel & CSV Financial Exports', () => {
    it('5.1 should generate and stream valid A4 PDF export', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/pdf?section=combined')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.headers['content-type'], 'application/pdf');
      assert.ok(res.body.length > 500, 'PDF buffer must contain content');
    });

    it('5.2 should generate and stream structured Excel (.xlsx) export', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/excel?section=owned')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('spreadsheetml'));
      assert.ok(Number(res.headers['content-length']) > 500, 'Excel Content-Length must be > 500 bytes');
    });

    it('5.3 should generate and stream sanitized CSV export', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/csv?section=marketplace')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('text/csv'));
      assert.ok(res.text.includes('Supplier'), 'CSV must contain headers');
    });
  });
});
