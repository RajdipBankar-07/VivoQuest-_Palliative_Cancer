import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { MedicalProduct } from '../src/models/MedicalProduct.js';
import { ProductOrder } from '../src/models/ProductOrder.js';
import { MaintenanceRequest } from '../src/models/MaintenanceRequest.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { seedAdminDemoData } from '../src/services/adminService.js';

describe('VivoQuest Phase 12 — Sales, Product & Delivery Operations Dashboard Test Suite', () => {
  let app: any;
  let adminToken: string;
  let opsManagerToken: string;
  let opsManagerId: string;
  let deliveryStaffToken: string;
  let deliveryStaffId: string;
  let patientToken: string;
  let patientId: string;

  let testOrderId: string;
  let testOrderNumber: string;
  let testProductId: string;
  let maintenanceTicketId: string;

  const employeePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const deliveryPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const patientPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  before(async () => {
    await connectDatabase();
    app = createApp();
    await seedAdminDemoData();

    // 1. Log in as Super Admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: '9899000001',
        password: 'SuperAdmin#2026',
      });
    assert.equal(adminLoginRes.status, 200);
    adminToken = adminLoginRes.body.data.token;

    // 2. Register a Patient
    const patientRegRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Ananya Deshpande',
        phone: patientPhone,
        password: 'Password123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(patientRegRes.status, 201);
    patientToken = patientRegRes.body.data.token;
    patientId = patientRegRes.body.data.user.id || patientRegRes.body.data.user._id;
  });

  after(async () => {
    // Cleanup created test records
    if (testProductId) {
      await MedicalProduct.findByIdAndDelete(testProductId);
    }
    if (testOrderId) {
      await ProductOrder.findByIdAndDelete(testOrderId);
    }
    if (maintenanceTicketId) {
      await MaintenanceRequest.findByIdAndDelete(maintenanceTicketId);
    }
    await User.deleteMany({ phone: { $in: [employeePhone, deliveryPhone, patientPhone] } });
  });

  it('1. Security: Employees must not self-register with operational privileges', async () => {
    const selfRegRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Hacker Ops',
        phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'operations_manager',
        consentAccepted: true,
      });

    assert.ok([400, 403].includes(selfRegRes.status));
    assert.equal(selfRegRes.body.success, false);
  });

  it('2. Admin creates Operations Manager and Delivery Specialist employee accounts', async () => {
    // Admin creates Operations Manager
    const createOpsRes = await request(app)
      .post('/api/v1/admin/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Sunil Gavaskar',
        phone: employeePhone,
        email: `sunil.ops.${Date.now()}@vivoquest.in`,
        password: 'OpsPassword#2026',
        role: 'operations_manager',
        department: 'Operations & Dispatch',
        assignedDepot: 'Central Pune Hub',
      });

    assert.equal(createOpsRes.status, 201);
    assert.equal(createOpsRes.body.success, true);
    opsManagerId = createOpsRes.body.data.id || createOpsRes.body.data._id;
    assert.match(createOpsRes.body.data.employeeId, /^EMP-OPS-/);

    // Admin creates Delivery Specialist
    const createDelRes = await request(app)
      .post('/api/v1/admin/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Sachin Tendulkar',
        phone: deliveryPhone,
        email: `sachin.del.${Date.now()}@vivoquest.in`,
        password: 'DelPassword#2026',
        role: 'delivery_staff',
        department: 'Last-Mile Delivery',
        assignedDepot: 'Central Pune Hub',
      });

    assert.equal(createDelRes.status, 201);
    assert.equal(createDelRes.body.success, true);
    deliveryStaffId = createDelRes.body.data.id || createDelRes.body.data._id;
  });

  it('3. Operations employee logs in and accesses operations profile & metrics', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: employeePhone,
        password: 'OpsPassword#2026',
      });

    assert.equal(loginRes.status, 200);
    opsManagerToken = loginRes.body.data.token;
    assert.equal(loginRes.body.data.user.role, 'operations_manager');

    // Fetch /api/v1/operations/me
    const meRes = await request(app)
      .get('/api/v1/operations/me')
      .set('Authorization', `Bearer ${opsManagerToken}`);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.data.role, 'operations_manager');
    assert.equal(meRes.body.data.department, 'Operations & Dispatch');

    // Fetch /api/v1/operations/metrics
    const metricsRes = await request(app)
      .get('/api/v1/operations/metrics')
      .set('Authorization', `Bearer ${opsManagerToken}`);

    assert.equal(metricsRes.status, 200);
    assert.ok(typeof metricsRes.body.data.newOrders === 'number');
    assert.ok(typeof metricsRes.body.data.scheduledToday === 'number');
    assert.ok(typeof metricsRes.body.data.inTransit === 'number');
    assert.ok(typeof metricsRes.body.data.delivered === 'number');
  });

  it('4. Employee creates and updates an owned product with image and condition tracking', async () => {
    const testSku = `DME-TEST-${Date.now()}`;
    const createProdRes = await request(app)
      .post('/api/v1/operations/products')
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        sku: testSku,
        title: 'High-Flow Oxygen Concentrator 10L',
        category: 'respiratory',
        description: 'Certified 10L medical oxygen concentrator with dual flow.',
        price: 45000,
        regularPrice: 55000,
        stockQuantity: 15,
        sourcingType: 'own_stock',
        equipmentCondition: 'healthy',
        newImageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
        installationEligible: true,
        installationServiceCharge: 750,
      });

    assert.equal(createProdRes.status, 201);
    assert.equal(createProdRes.body.success, true);
    testProductId = createProdRes.body.data.id || createProdRes.body.data._id;
    assert.equal(createProdRes.body.data.sourcingType, 'own_stock');
    assert.equal(createProdRes.body.data.stockQuantity, 15);

    // Update stock and condition
    const updateProdRes = await request(app)
      .patch(`/api/v1/operations/products/${testProductId}/condition`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        condition: 'healthy',
        conditionNotes: 'All safety valves and purity sensors verified.',
      });

    assert.equal(updateProdRes.status, 200);
    assert.equal(updateProdRes.body.data.equipmentCondition, 'healthy');
  });

  it('5. Employee registers third-party marketplace product without confusing it with owned stock', async () => {
    const supplierSku = `DME-SUP-${Date.now()}`;
    const createSuppProdRes = await request(app)
      .post('/api/v1/operations/products')
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        sku: supplierSku,
        title: 'Orthopedic Hospital Bed 3-Function Electric',
        category: 'mobility',
        description: 'Remote operated ICU electric bed with side railings.',
        price: 38000,
        regularPrice: 48000,
        stockQuantity: 5,
        sourcingType: 'supplier_direct',
        supplierName: 'Apex Healthtech Solutions Ltd',
        equipmentCondition: 'healthy',
        newImageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
      });

    assert.equal(createSuppProdRes.status, 201);
    assert.equal(createSuppProdRes.body.data.sourcingType, 'supplier_direct');
    assert.equal(createSuppProdRes.body.data.supplierName, 'Apex Healthtech Solutions Ltd');

    // Cleanup supplier product
    await MedicalProduct.findByIdAndDelete(createSuppProdRes.body.data.id || createSuppProdRes.body.data._id);
  });

  it('6. An existing paid order appears in the operations queue', async () => {
    // Create an order in MongoDB
    testOrderNumber = `VQ-ORD-${Date.now()}`;
    const order = await ProductOrder.create({
      orderNumber: testOrderNumber,
      patientId: new mongoose.Types.ObjectId(patientId),
      patientName: 'Ananya Deshpande',
      patientPhone,
      items: [
        {
          productId: new mongoose.Types.ObjectId(testProductId),
          sku: 'DME-TEST-ITEM',
          title: 'High-Flow Oxygen Concentrator 10L',
          category: 'respiratory',
          quantity: 1,
          unitPrice: 45000,
          regularPrice: 55000,
          isRental: false,
          setupRequired: true,
          sourcingType: 'own_stock',
        },
      ],
      pricing: {
        subtotal: 45000,
        deliveryFee: 0,
        taxGst: 5400,
        totalAmount: 50400,
        procurementCostTotal: 30000, // Should be redacted for operations employee
      },
      deliveryAddress: {
        street: 'Flat 402, Shanti Niketan',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411038',
      },
      clinicalSetup: {
        isSetupRequired: true,
        setupStatus: 'pending',
      },
      orderStatus: 'placed',
      paymentStatus: 'paid',
      paymentMethod: 'online',
      trackingUpdates: [
        {
          timestamp: new Date(),
          status: 'placed',
          message: 'Order placed by patient.',
        },
      ],
      isDemo: true,
    });

    testOrderId = order._id.toString();

    // Query operations orders queue as Operations Manager
    const queueRes = await request(app)
      .get(`/api/v1/operations/orders?search=${testOrderNumber}`)
      .set('Authorization', `Bearer ${opsManagerToken}`);

    assert.equal(queueRes.status, 200);
    assert.equal(queueRes.body.count, 1);
    const fetchedOrder = queueRes.body.data[0];
    assert.equal(fetchedOrder.orderNumber, testOrderNumber);
    assert.equal(fetchedOrder.patientName, 'Ananya Deshpande');

    // Verify procurement cost is redacted for operations employee
    assert.equal(fetchedOrder.pricing.procurementCostTotal, undefined);
    assert.equal(fetchedOrder.items[0].procurementCost, undefined);
  });

  it('7. Employee assigns a delivery specialist and records dispatch', async () => {
    // 1. Assign delivery staff
    const assignRes = await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/assign-delivery`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        staffId: deliveryStaffId,
        scheduledDeliveryDate: new Date().toISOString().slice(0, 10),
        deliveryNotes: 'Priority delivery. Oxygen equipment requires careful handling.',
      });

    assert.equal(assignRes.status, 200);
    assert.equal(assignRes.body.data.deliveryAssignment?.assignedStaffName, 'Sachin Tendulkar');

    // 2. Advance to confirmed -> preparing -> ready_for_dispatch -> dispatched
    await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/delivery-status`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({ newStatus: 'confirmed' });

    await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/delivery-status`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({ newStatus: 'preparing' });

    await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/delivery-status`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({ newStatus: 'ready_for_dispatch' });

    const dispatchRes = await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/delivery-status`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        newStatus: 'dispatched',
        notes: 'Dispatched from Central Pune Depot on Carrier Vehicle #7',
        location: 'Central Pune Depot',
      });

    assert.equal(dispatchRes.status, 200);
    assert.equal(dispatchRes.body.data.orderStatus, 'dispatched');
  });

  it('8. Employee updates delivery progress through in_transit, out_for_delivery and records delivery', async () => {
    // Dispatched -> in_transit
    const transitRes = await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/delivery-status`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        newStatus: 'in_transit',
        location: 'Kothrud Hub',
        notes: 'En route to local delivery zone',
      });
    assert.equal(transitRes.status, 200);

    // in_transit -> out_for_delivery
    const ofdRes = await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/delivery-status`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        newStatus: 'out_for_delivery',
        location: 'Kothrud Hub',
        notes: 'Delivery specialist Sachin Tendulkar is on the way',
      });
    assert.equal(ofdRes.status, 200);

    // out_for_delivery -> delivered
    const deliveredRes = await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/delivery-status`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        newStatus: 'delivered',
        proofUrl: 'https://vivoquest.in/proofs/POD-2026-9901.jpg',
        notes: 'Delivered and verified with patient caregiver',
        recipientConfirmed: true,
      });

    assert.equal(deliveredRes.status, 200);
    assert.equal(deliveredRes.body.data.orderStatus, 'delivered');
    assert.ok(deliveredRes.body.data.deliveryAssignment?.actualDeliveredAt);
  });

  it('9. Invalid or unauthorized status transitions are rejected with 400', async () => {
    // Attempting to transition from 'delivered' back to 'preparing' is illegal
    const invalidRes = await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/delivery-status`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        newStatus: 'preparing',
      });

    assert.equal(invalidRes.status, 400);
    assert.match(invalidRes.body.error?.message || '', /Invalid order status transition/i);
  });

  it('10. Patient order tracking reflects live delivery milestones', async () => {
    const patientOrdersRes = await request(app)
      .get('/api/v1/products/orders')
      .set('Authorization', `Bearer ${patientToken}`);

    assert.equal(patientOrdersRes.status, 200);
    const matchedOrder = patientOrdersRes.body.data.find(
      (o: any) => o.orderNumber === testOrderNumber
    );

    assert.ok(matchedOrder);
    assert.equal(matchedOrder.orderStatus, 'delivered');
    // Ensure tracking milestones are present
    assert.ok(matchedOrder.trackingUpdates?.length >= 5);
  });

  it('11. Clinical installation and maintenance tasks can be assigned and completed', async () => {
    // 1. Assign and complete installation
    const installRes = await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/installation`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        assignedSpecialistId: deliveryStaffId,
        setupStatus: 'completed',
        setupDate: new Date().toISOString().slice(0, 10),
        timeSlot: '11:00 AM - 01:00 PM',
        setupNotes: 'Oxygen concentrator calibrated to 95.4% purity. Patient demonstrated correct nasal cannula usage.',
        checklistResults: [
          { item: 'Unboxing & Inspection', checked: true },
          { item: 'Calibration & Purity Test', checked: true },
          { item: 'Caregiver Safety Training', checked: true },
        ],
      });

    assert.equal(installRes.status, 200);
    assert.equal(installRes.body.data.clinicalSetup?.setupStatus, 'completed');

    // 2. Create biomedical maintenance request
    const maintRes = await request(app)
      .post('/api/v1/operations/maintenance')
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        productId: testProductId,
        orderId: testOrderId,
        patientName: 'Ananya Deshpande',
        patientPhone,
        reportedIssue: 'Air flow filter sensor alert triggered after 48 hours of continuous operation.',
        urgency: 'high',
        flagProductCondition: true,
      });

    assert.equal(maintRes.status, 201);
    assert.equal(maintRes.body.success, true);
    maintenanceTicketId = maintRes.body.data.id || maintRes.body.data._id;
    assert.match(maintRes.body.data.ticketNumber, /^MNT-/);

    // Verify product condition was updated to under_maintenance
    const prodCheck = await MedicalProduct.findById(testProductId);
    assert.equal(prodCheck?.equipmentCondition, 'under_maintenance');

    // 3. Resolve and complete maintenance ticket
    const resolveRes = await request(app)
      .patch(`/api/v1/operations/maintenance/${maintenanceTicketId}`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        status: 'completed',
        diagnosis: 'HEPA pre-filter clogged due to room dust.',
        actionTaken: 'Replaced intake pre-filter cartridge and reset sensor timer.',
        partsUsed: [{ partName: 'HEPA Pre-Filter Cartridge', quantity: 1, cost: 450 }],
        resolutionNotes: 'Machine tested for 30 minutes. Flow steady at 10 LPM.',
      });

    assert.equal(resolveRes.status, 200);
    assert.equal(resolveRes.body.data.status, 'completed');

    // Verify product condition was restored to healthy
    const prodRestored = await MedicalProduct.findById(testProductId);
    assert.equal(prodRestored?.equipmentCondition, 'healthy');
  });

  it('12. Admin has complete visibility into employee operations and audit trail', async () => {
    // Admin lists employees
    const empListRes = await request(app)
      .get('/api/v1/admin/employees')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(empListRes.status, 200);
    assert.ok(empListRes.body.count >= 2);

    // Admin inspects audit logs for operations activities
    const auditRes = await request(app)
      .get('/api/v1/admin/audits?category=order_fulfillment')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(auditRes.status, 200);
    assert.ok(auditRes.body.data?.length > 0);
  });

  it('13. Isolation: Operations employees cannot access restricted finance dashboards', async () => {
    const financeRes = await request(app)
      .get('/api/v1/admin/finances/summary')
      .set('Authorization', `Bearer ${opsManagerToken}`);

    // Operations employees are forbidden from viewing private finance ledger
    assert.equal(financeRes.status, 403);
  });
});
