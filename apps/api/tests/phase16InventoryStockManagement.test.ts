import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { MedicalProduct } from '../src/models/MedicalProduct.js';
import { ProductOrder } from '../src/models/ProductOrder.js';
import { SupplierPurchaseOrder } from '../src/models/SupplierPurchaseOrder.js';
import { StockMovement } from '../src/models/StockMovement.js';
import { Supplier } from '../src/models/Supplier.js';
import { createProductOrder, cancelPatientOrder } from '../src/services/productCatalogService.js';
import { updateOrderDeliveryWorkflow } from '../src/services/operationsService.js';

describe('VivoQuest Phase 16 — Inventory Visibility, Low-Stock Alerts & Reorder Management', () => {
  let app: any;
  let adminToken: string;
  let adminUser: any;
  let testSupplier: any;
  let ownedProduct: any;
  let supplierProduct: any;
  let testPO: any;

  before(async () => {
    try {
      await (await import('../src/config/database.js')).connectDatabase();
      app = createApp();
      await (await import('../src/services/adminService.js')).seedAdminDemoData();

      // 1. Admin login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: '9899000001',
          password: 'SuperAdmin#2026',
        });
      assert.equal(loginRes.status, 200, 'Admin login failed');
      adminToken = loginRes.body.data.token;
      adminUser = loginRes.body.data.user;

      // 2. Fetch or create a test Supplier
      testSupplier = await Supplier.findOne({ isActive: true });
      if (!testSupplier) {
        testSupplier = await Supplier.create({
          supplierCode: `SUP-${Date.now().toString().slice(-4)}`,
          name: `MedEquip Supplies Test ${Date.now()}`,
          contactPerson: 'Suresh Patil',
          email: `suresh_${Date.now()}@medequip.in`,
          phone: '9876543299',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411026',
          address: 'Plot 45, Bhosari MIDC',
          categoriesSupplied: ['mobility', 'respiratory'],
          sourcingType: 'supplier_direct',
          verificationStatus: 'verified',
          isActive: true,
          leadTimeDays: 4,
          pan: 'AAACM1234F',
          gstin: '27AAACM1234F1Z5',
          bankDetails: {
            accountName: 'MedEquip Supplies',
            accountNumber: '123456789012',
            ifsc: 'HDFC0001234',
            bankName: 'HDFC Bank',
          },
        });
      }

      // 3. Create a VivoQuest Depot Product
      ownedProduct = await MedicalProduct.create({
        sku: `P16-DEPOT-${Date.now().toString().slice(-5)}`,
        title: 'VivoQuest High-Flow Pediatric Oxygen Concentrator',
        category: 'respiratory',
        description: 'Medical-grade oxygen concentrator for continuous clinical therapy.',
        price: 32000,
        regularPrice: 38000,
        sellingPrice: 32000,
        stockQuantity: 20,
        reservedQuantity: 0,
        reorderThreshold: 5,
        reorderQuantity: 15,
        sourcingType: 'own_stock',
        procurementCost: 22000,
        images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'],
        status: 'active',
        isActive: true,
        lastStockUpdateAt: new Date(),
      });

      // 4. Create a Supplier Direct Product
      supplierProduct = await MedicalProduct.create({
        sku: `P16-SUPPLIER-${Date.now().toString().slice(-5)}`,
        title: 'Advanced Electric Recline ICU Bed',
        category: 'icu_home_setup',
        description: 'Multi-functional 4-motor ICU hospital bed with cardiac chair positioning.',
        price: 85000,
        regularPrice: 95000,
        sellingPrice: 85000,
        stockQuantity: 4,
        reservedQuantity: 0,
        reorderThreshold: 3,
        reorderQuantity: 10,
        sourcingType: 'supplier_direct',
        supplierId: testSupplier._id,
        supplierName: testSupplier.name,
        supplierAvailabilityStatus: 'confirmed',
        supplierLeadTimeDays: 4,
        procurementCost: 65000,
        images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'],
        status: 'active',
        isActive: true,
        lastStockUpdateAt: new Date(),
      });

      // 5. Create an open purchase order representing incoming stock
      testPO = await SupplierPurchaseOrder.create({
        poNumber: `PO-P16-${Date.now().toString().slice(-4)}`,
        supplierId: testSupplier._id,
        supplierName: testSupplier.name,
        items: [
          {
            productId: ownedProduct._id,
            sku: ownedProduct.sku,
            title: ownedProduct.title,
            quantity: 12,
            procurementCostPerUnit: 22000,
            totalCost: 12 * 22000,
            receivedQuantity: 2, // 10 units incoming
          },
        ],
        totalProcurementCost: 12 * 22000,
        paymentStatus: 'pending',
        paidAmount: 0,
        deliveryStatus: 'ordered',
        createdBy: new mongoose.Types.ObjectId(adminUser.id),
        createdByName: adminUser.fullName,
        isDemo: false,
      });
    } catch (err) {
      console.error('SETUP ERROR in before hook:', err);
      throw err;
    }
  });

  after(async () => {
    if (ownedProduct) await MedicalProduct.findByIdAndDelete(ownedProduct._id);
    if (supplierProduct) await MedicalProduct.findByIdAndDelete(supplierProduct._id);
    if (testSupplier && testSupplier.name?.startsWith('MedEquip Supplies Test')) await Supplier.findByIdAndDelete(testSupplier._id);
    if (testPO) await SupplierPurchaseOrder.findByIdAndDelete(testPO._id);
    await StockMovement.deleteMany({ sku: { $regex: /^P16-/ } });
  });

  // =========================================================================
  // 1. Authoritative Inventory KPI Summary
  // =========================================================================
  it('GET /api/v1/operations/inventory/summary calculates authoritative KPIs from DB', async () => {
    const res = await request(app)
      .get('/api/v1/operations/inventory/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const summary = res.body.data;

    assert.ok(summary.totalActiveSkus > 0, 'Must report active SKUs');
    assert.ok(summary.totalOnHandUnits > 0, 'Must report on-hand units');
    assert.ok(typeof summary.totalReservedUnits === 'number');
    assert.ok(summary.totalAvailableUnits > 0, 'Must report available units');
    assert.ok(summary.incomingUnitsFromPOs >= 10, 'Must include incoming units from open PO');
  });

  // =========================================================================
  // 2. Product Stock Table with 10 Items/Page Pagination & Filters
  // =========================================================================
  it('GET /api/v1/operations/inventory/products enforces 10 items/page, ATS, and filters', async () => {
    const res = await request(app)
      .get('/api/v1/operations/inventory/products?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length <= 10, 'Default page limit must be 10');
    assert.equal(res.body.pagination.limit, 10);
    assert.ok(res.body.pagination.total > 0);

    // Verify fields on product
    const prod = res.body.data.find((p: any) => p.sku === ownedProduct.sku);
    assert.ok(prod, 'Owned product must be returned');
    assert.equal(prod.stockQuantity, 20);
    assert.equal(prod.reservedQuantity, 0);
    assert.equal(prod.availableToSell, 20);
    assert.equal(prod.incomingPoQuantity, 10, 'Incoming units from PO must match');
    assert.equal(prod.stockStatus, 'in_stock');
    assert.equal(prod.sourcingType, 'own_stock');
    assert.ok(prod.procurementCost, 'Procurement cost must be visible to admin');
  });

  // =========================================================================
  // 3. Confidentiality of Procurement Cost (Public Endpoints Must Redact It)
  // =========================================================================
  it('Public catalog /api/v1/products strictly redacts confidential procurement cost', async () => {
    const res = await request(app)
      .get(`/api/v1/products/${ownedProduct.sku}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.sku, ownedProduct.sku);
    assert.equal(res.body.data.availableToSell, 20);
    assert.equal(res.body.data.procurementCost, undefined, 'Confidential procurementCost MUST NOT be exposed on public endpoints');
  });

  // =========================================================================
  // 4. Accurate Available-to-Sell (ATS) and Atomic Reservation During Checkout
  // =========================================================================
  it('Checkout atomically reserves stock, decrements ATS without deducting physical units', async () => {
    const initialProduct = await MedicalProduct.findById(ownedProduct._id);
    assert.equal(initialProduct?.stockQuantity, 20);
    assert.equal(initialProduct?.reservedQuantity, 0);

    // Create an order for 3 units
    const order = await createProductOrder(adminUser.id, {
      items: [
        {
          productId: ownedProduct._id.toString(),
          quantity: 3,
        },
      ],
      deliveryAddress: {
        street: 'Flat 402, Greenfield Apts, Senapati Bapat Road',
        city: 'Pune',
        pincode: '411016',
        contactPhone: '9822001122',
      },
      paymentMethod: 'cod',
    });

    assert.ok(order);
    assert.equal(order.items[0].quantity, 3);

    // Verify product stock in DB
    const updatedProd = await MedicalProduct.findById(ownedProduct._id);
    assert.equal(updatedProd?.stockQuantity, 20, 'Physical on-hand stock MUST NOT be deducted at order placement');
    assert.equal(updatedProd?.reservedQuantity, 3, 'Reserved quantity must be incremented atomically');
    const ats = Math.max(0, (updatedProd?.stockQuantity || 0) - (updatedProd?.reservedQuantity || 0));
    assert.equal(ats, 17, 'Available-to-sell must be physical - reserved = 17');

    // Clean cancellation releases reservation
    await cancelPatientOrder(order._id.toString(), adminUser.id, 'Test cancellation');
    const restoredProd = await MedicalProduct.findById(ownedProduct._id);
    assert.equal(restoredProd?.stockQuantity, 20, 'Physical stock unchanged');
    assert.equal(restoredProd?.reservedQuantity, 0, 'Reservation released to 0');
    assert.equal(Math.max(0, (restoredProd?.stockQuantity || 0) - (restoredProd?.reservedQuantity || 0)), 20);
  });

  // =========================================================================
  // 5. Concurrency & Oversell Protection
  // =========================================================================
  it('Rejects order when requested quantity exceeds available-to-sell stock', async () => {
    // Current stock: 20, reserved: 0
    await assert.rejects(
      async () => {
        await createProductOrder(adminUser.id, {
          items: [
            {
              productId: ownedProduct._id.toString(),
              quantity: 25, // Exceeds 20 available units
            },
          ],
          deliveryAddress: {
            street: '101 FC Road',
            city: 'Pune',
            pincode: '411004',
          },
        });
      },
      (err: any) => {
        assert.ok(err.message.includes('exceeds available inventory'));
        return true;
      }
    );
  });

  // =========================================================================
  // 6. Physical Stock Deduction Exactly Once at Fulfillment Milestone
  // =========================================================================
  it('Deducts physical stock and clears reservation at delivery milestone exactly once', async () => {
    // Place order for 2 units
    const order = await createProductOrder(adminUser.id, {
      items: [
        {
          productId: ownedProduct._id.toString(),
          quantity: 2,
        },
      ],
      deliveryAddress: {
        street: 'Building 5, Kalyani Nagar',
        city: 'Pune',
        pincode: '411006',
        contactPhone: '9822334455',
      },
      paymentMethod: 'cod',
    });

    const preFulfillProd = await MedicalProduct.findById(ownedProduct._id);
    assert.equal(preFulfillProd?.stockQuantity, 20);
    assert.equal(preFulfillProd?.reservedQuantity, 2);

    // Transition order through delivery workflow
    const staffUser = await User.findById(adminUser.id);
    await updateOrderDeliveryWorkflow(order._id.toString(), { newStatus: 'confirmed' }, staffUser as any);
    await updateOrderDeliveryWorkflow(order._id.toString(), { newStatus: 'dispatched' }, staffUser as any);
    await updateOrderDeliveryWorkflow(order._id.toString(), { newStatus: 'out_for_delivery' }, staffUser as any);

    // Complete delivery
    const deliveredOrder = await updateOrderDeliveryWorkflow(
      order._id.toString(),
      { newStatus: 'delivered', notes: 'Handed over in pristine condition' },
      staffUser as any
    );

    assert.equal(deliveredOrder.orderStatus, 'delivered');
    assert.equal(deliveredOrder.isStockDeducted, true);

    const postDeliveredProd = await MedicalProduct.findById(ownedProduct._id);
    assert.equal(postDeliveredProd?.stockQuantity, 18, 'Physical units on-hand must be deducted to 18');
    assert.equal(postDeliveredProd?.reservedQuantity, 0, 'Reservation must be cleared to 0');
    assert.equal(Math.max(0, (postDeliveredProd?.stockQuantity || 0) - (postDeliveredProd?.reservedQuantity || 0)), 18);

    // Verify StockMovement audit log of type dispatch_deduction
    const movement = await StockMovement.findOne({
      productId: ownedProduct._id,
      movementType: 'dispatch_deduction',
      orderNumber: order.orderNumber,
    });
    assert.ok(movement, 'Must create immutable dispatch_deduction StockMovement record');
    assert.equal(movement.quantityChanged, -2);
  });

  // =========================================================================
  // 7. Auditable Stock Adjustment Validation & Non-Negative Enforcement
  // =========================================================================
  it('Rejects negative stock adjustments or adjustments below active reservations', async () => {
    // 1. Negative quantity rejection
    const negRes = await request(app)
      .post(`/api/v1/operations/inventory/products/${ownedProduct._id}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newQuantity: -5,
        reason: 'Invalid negative count',
      });
    assert.equal(negRes.status, 400);
    assert.ok(negRes.body.error.message.includes('non-negative integer'));

    // 2. Mandatory reason rejection
    const noReasonRes = await request(app)
      .post(`/api/v1/operations/inventory/products/${ownedProduct._id}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newQuantity: 15,
        reason: '',
      });
    assert.equal(noReasonRes.status, 400);
    assert.ok(noReasonRes.body.error.message.includes('mandatory'));

    // 3. Valid adjustment writes immutable audit trail
    const validRes = await request(app)
      .post(`/api/v1/operations/inventory/products/${ownedProduct._id}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newQuantity: 25,
        reason: 'Monthly physical inventory cycle count intake',
        movementType: 'audit_reconciliation',
      });
    assert.equal(validRes.status, 200);
    assert.equal(validRes.body.data.product.stockQuantity, 25);
    assert.ok(validRes.body.data.movement.quantityChanged > 0);
  });

  // =========================================================================
  // 8. Low-Stock and Out-of-Stock Status Calculation
  // =========================================================================
  it('Accurately flags Low Stock and Out of Stock based on reorder threshold', async () => {
    // Set stock to 3 (below reorderThreshold: 5)
    await request(app)
      .post(`/api/v1/operations/inventory/products/${ownedProduct._id}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newQuantity: 3,
        reason: 'Cycle count update to test low-stock flag',
        movementType: 'audit_reconciliation',
      });

    const lowStockCheck = await request(app)
      .get(`/api/v1/operations/inventory/products?search=${ownedProduct.sku}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(lowStockCheck.status, 200);
    const lowProd = lowStockCheck.body.data.find((p: any) => p.sku === ownedProduct.sku);
    assert.ok(lowProd, 'Must find updated product');
    assert.equal(lowProd.stockStatus, 'low_stock');
    assert.equal(lowProd.availableToSell, 3);
    assert.ok(lowProd.suggestedReorderQuantity > 0, 'Must compute suggested reorder quantity');

    // Set stock to 0 (Out of Stock)
    await request(app)
      .post(`/api/v1/operations/inventory/products/${ownedProduct._id}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newQuantity: 0,
        reason: 'Depot stock depleted',
        movementType: 'audit_reconciliation',
      });

    const oosCheck = await request(app)
      .get(`/api/v1/operations/inventory/products?search=${ownedProduct.sku}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(oosCheck.status, 200);
    const oosProd = oosCheck.body.data.find((p: any) => p.sku === ownedProduct.sku);
    assert.ok(oosProd, 'Must find depleted product');
    assert.equal(oosProd.stockStatus, 'out_of_stock');
    assert.equal(oosProd.availableToSell, 0);
  });

  // =========================================================================
  // 9. Third-Party Supplier Availability Confirmation
  // =========================================================================
  it('POST /confirm-supplier updates availability status and writes StockMovement', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/inventory/products/${supplierProduct._id}/confirm-supplier`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'confirmed',
        leadTimeDays: 2,
        notes: 'Confirmed stock on vendor warehouse call',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.product.supplierAvailabilityStatus, 'confirmed');
    assert.equal(res.body.data.product.supplierLeadTimeDays, 2);

    // Verify StockMovement
    const movement = await StockMovement.findOne({
      productId: supplierProduct._id,
      movementType: 'supplier_confirmation_update',
    });
    assert.ok(movement, 'Must create supplier_confirmation_update StockMovement');
  });

  // =========================================================================
  // 10. Purchase Order Creation for Low-Stock Product (No Auto-Commit)
  // =========================================================================
  it('POST /create-reorder-po creates a draft PO in pending review status', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/inventory/products/${ownedProduct._id}/create-reorder-po`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        quantity: 15,
        unitCost: 21500,
        notes: 'Restock batch for Pune Depot',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const po = res.body.data;
    assert.ok(po.poNumber.startsWith('VQ-PO-2026-'));
    assert.equal(po.paymentStatus, 'pending', 'Must be pending review without automated charge');
    assert.equal(po.deliveryStatus, 'ordered');
    assert.equal(po.items[0].quantity, 15);
    assert.equal(po.totalProcurementCost, 15 * 21500);

    // Clean up created PO
    await SupplierPurchaseOrder.findByIdAndDelete(po._id);
  });
});
