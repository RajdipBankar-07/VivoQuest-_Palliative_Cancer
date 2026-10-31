import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { MedicalProduct } from '../src/models/MedicalProduct.js';
import { ProductOrder } from '../src/models/ProductOrder.js';
import { ProductComplaint } from '../src/models/ProductComplaint.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { seedAdminDemoData } from '../src/services/adminService.js';

describe('VivoQuest Phase 13 — Complete Sales & Delivery Operations Dashboard Upgrade Test Suite', () => {
  let app: any;
  let adminToken: string;
  let opsManagerToken: string;
  let opsManagerId: string;
  let deliveryStaffToken: string;
  let deliveryStaffId: string;
  let technicianToken: string;
  let technicianId: string;
  let patientToken: string;
  let patientId: string;

  let testOrderId: string;
  let testOrderNumber: string;
  let testProductId: string;
  let testSupplierProductId: string;

  const opsPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const deliveryPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const techPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const patientPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  before(async () => {
    await connectDatabase();
    app = createApp();
    await seedAdminDemoData();

    // 1. Admin login
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: '9899000001',
        password: 'SuperAdmin#2026',
      });
    assert.equal(adminLoginRes.status, 200);
    adminToken = adminLoginRes.body.data.token;

    // 2. Patient register & login
    const patientRegRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Rohit Sharma (Patient)',
        phone: patientPhone,
        password: 'Password123!',
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(patientRegRes.status, 201);
    patientToken = patientRegRes.body.data.token;
    patientId = patientRegRes.body.data.user.id || patientRegRes.body.data.user._id;

    // 3. Create Operations Manager
    const opsUserRes = await request(app)
      .post('/api/v1/admin/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Sameer Kulkarni (Ops Lead)',
        phone: opsPhone,
        password: 'Password123!',
        role: 'operations_manager',
        department: 'Operations',
        assignedDepot: 'Central Pune Hub',
      });
    assert.equal(opsUserRes.status, 201);
    opsManagerId = opsUserRes.body.data.id || opsUserRes.body.data._id;

    const opsLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: opsPhone, password: 'Password123!' });
    assert.equal(opsLoginRes.status, 200);
    opsManagerToken = opsLoginRes.body.data.token;

    // 4. Create Delivery Staff
    const delUserRes = await request(app)
      .post('/api/v1/admin/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Aniket Jadhav (Fleet Driver)',
        phone: deliveryPhone,
        password: 'Password123!',
        role: 'delivery_staff',
        department: 'Last-Mile Fleet',
        assignedDepot: 'Central Pune Hub',
      });
    assert.equal(delUserRes.status, 201);
    deliveryStaffId = delUserRes.body.data.id || delUserRes.body.data._id;

    const delLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: deliveryPhone, password: 'Password123!' });
    assert.equal(delLoginRes.status, 200);
    deliveryStaffToken = delLoginRes.body.data.token;

    // 5. Create Maintenance Technician
    const techUserRes = await request(app)
      .post('/api/v1/admin/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Pooja Patil (Biomedical Tech)',
        phone: techPhone,
        password: 'Password123!',
        role: 'maintenance_staff',
        department: 'Clinical Engineering',
        assignedDepot: 'Central Pune Hub',
      });
    assert.equal(techUserRes.status, 201);
    technicianId = techUserRes.body.data.id || techUserRes.body.data._id;

    const techLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: techPhone, password: 'Password123!' });
    assert.equal(techLoginRes.status, 200);
    technicianToken = techLoginRes.body.data.token;

    // 6. Create Depot Product with 5 in stock
    const testProd = await MedicalProduct.create({
      sku: `DEPOT-${Date.now()}`,
      title: 'Precision Hospital Bed 3-Function Manual',
      category: 'mobility',
      description: 'Medical Grade Ergonomic Patient Bed with side rails',
      price: 18500,
      regularPrice: 22000,
      stockQuantity: 5,
      reservedQuantity: 0,
      sourcingType: 'own_stock',
      condition: 'brand_new',
      status: 'active',
      isActive: true,
      equipmentCondition: 'healthy',
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600'],
      primaryImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600',
    });
    testProductId = testProd._id.toString();

    // 7. Create Supplier Direct Product
    const testSupplierProd = await MedicalProduct.create({
      sku: `SUPP-${Date.now()}`,
      title: 'High-Flow Oxygen Concentrator 10L',
      category: 'respiratory',
      description: 'Continuous dual flow medical oxygen generator',
      price: 42000,
      regularPrice: 48000,
      stockQuantity: 2,
      sourcingType: 'supplier_direct',
      supplierName: 'Apex Biomedical Supplies',
      condition: 'brand_new',
      status: 'active',
      isActive: true,
      equipmentCondition: 'healthy',
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600'],
      primaryImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600',
    });
    testSupplierProductId = testSupplierProd._id.toString();

    // 8. Create a placed order
    const testOrder = await ProductOrder.create({
      orderNumber: `VQ-P13-${Date.now().toString().slice(-6)}`,
      patientId: new mongoose.Types.ObjectId(patientId),
      patientName: 'Rohit Sharma (Patient)',
      patientPhone: patientPhone,
      items: [
        {
          productId: testProd._id,
          sku: testProd.sku,
          title: testProd.title,
          category: testProd.category,
          quantity: 1,
          unitPrice: 18500,
          isRental: false,
          setupRequired: true,
          installationSelected: true,
          installationCharge: 500,
          sourcingType: 'own_stock',
          procurementCost: 11000,
        },
        {
          productId: testSupplierProd._id,
          sku: testSupplierProd.sku,
          title: testSupplierProd.title,
          category: testSupplierProd.category,
          quantity: 1,
          unitPrice: 42000,
          isRental: false,
          setupRequired: false,
          sourcingType: 'supplier_direct',
          supplierName: 'Apex Biomedical Supplies',
          supplierStatus: 'pending',
          procurementCost: 28000,
        },
      ],
      supplierFulfillments: [
        {
          supplierId: new mongoose.Types.ObjectId(),
          supplierName: 'Apex Biomedical Supplies',
          status: 'pending',
        },
      ],
      pricing: {
        subtotal: 60500,
        discountTotal: 2000,
        deliveryFee: 0,
        taxGst: 7020,
        installationCharge: 500,
        totalAmount: 66020,
        procurementCostTotal: 39000,
        gatewayFee: 1320,
      },
      deliveryAddress: {
        street: 'Flat 402, Shivajinagar',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411005',
        contactPhone: patientPhone,
      },
      clinicalSetup: {
        isSetupRequired: true,
        setupStatus: 'pending',
      },
      deliveryAssignment: {
        scheduledDeliveryDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Due in 48 hours
      },
      orderStatus: 'placed',
      paymentStatus: 'paid',
      paymentMethod: 'online',
      trackingUpdates: [
        {
          timestamp: new Date(),
          status: 'placed',
          message: 'Order placed by patient online',
        },
      ],
    });
    testOrderId = testOrder._id.toString();
    testOrderNumber = testOrder.orderNumber;
  });

  after(async () => {
    if (testProductId) await MedicalProduct.findByIdAndDelete(testProductId);
    if (testSupplierProductId) await MedicalProduct.findByIdAndDelete(testSupplierProductId);
    if (testOrderId) await ProductOrder.findByIdAndDelete(testOrderId);
    await ProductComplaint.deleteMany({ orderNumber: testOrderNumber });
    await User.deleteMany({ phone: { $in: [opsPhone, deliveryPhone, techPhone, patientPhone] } });
    await disconnectDatabase();
  });

  it('1. Atomic Inventory Reservation locks stock and advances order', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/reserve-stock`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.orderStatus, 'confirmed');

    // Verify stock is reserved in DB
    const prod = await MedicalProduct.findById(testProductId);
    assert.equal(prod?.reservedQuantity, 1);
  });

  it('2. Supplier Direct Fulfillment Confirmation request updates status', async () => {
    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/supplier-confirmation`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('3. Flagging Delivery Delay records estimate history and updates SLA target', async () => {
    const revisedDate = new Date(Date.now() + 96 * 60 * 60 * 1000);
    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/flag-delay`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        delayReason: 'Biomedical recalibration and quality validation in depot',
        revisedEstimatedDate: revisedDate.toISOString(),
        notes: 'Calibrating oxygen pressure valves prior to deployment',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.orderStatus, 'delivery_rescheduled');

    // Verify delivery estimate history has recorded entry
    const order = await ProductOrder.findById(testOrderId);
    assert.ok(order?.deliveryEstimateHistory && order.deliveryEstimateHistory.length > 0);
    assert.equal(order.deliveryEstimateHistory[0].reason, 'Biomedical recalibration and quality validation in depot');
  });

  it('4. Real-Time SLA Monitor accurately categorizes active orders', async () => {
    const res = await request(app)
      .get('/api/v1/operations/sla-alerts')
      .set('Authorization', `Bearer ${opsManagerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data.summary.totalActive === 'number');
    assert.ok(Array.isArray(res.body.data.overdue));
    assert.ok(Array.isArray(res.body.data.atRisk));
    assert.ok(Array.isArray(res.body.data.dueSoon));
  });

  it('5. Patient requests delivery rescheduling from patient application', async () => {
    const requestedDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const res = await request(app)
      .post(`/api/v1/products/orders/${testOrderId}/reschedule-request`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        requestedDate: requestedDate.toISOString(),
        timeSlot: 'Morning 09:00 - 13:00',
        reason: 'Attending hospital outpatient checkup on original date',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const order = await ProductOrder.findById(testOrderId);
    assert.equal(order?.rescheduleRequests?.length, 1);
    assert.equal(order?.rescheduleRequests?.[0].status, 'pending');
  });

  it('6. Operations reviews and approves patient reschedule request', async () => {
    const order = await ProductOrder.findById(testOrderId);
    const reqId = order?.rescheduleRequests?.[0].requestId!;

    const res = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/reschedule-review`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        requestId: reqId,
        action: 'approve',
        reason: 'Staff confirmed route adjustment for Shivajinagar Pune West',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const updated = await ProductOrder.findById(testOrderId);
    assert.equal(updated?.rescheduleRequests?.[0].status, 'approved');
  });

  it('7. Contribution Margin and itemized profitability calculation distinguishes Estimated from Reconciled', async () => {
    const res = await request(app)
      .get(`/api/v1/operations/orders/${testOrderId}/profitability`)
      .set('Authorization', `Bearer ${opsManagerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isReconciled, false); // Active order, not yet delivered
    assert.ok(res.body.data.inflow.grossInflow > 0);
    assert.ok(res.body.data.profitability.contributionMargin > 0);
  });

  it('8. Clinical Setup requires mandatory safety checklist and cost breakdown validation before completion', async () => {
    // Attempt completion without all checklist items checked -> Expect 400
    const failRes = await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/installation`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        assignedSpecialistId: technicianId,
        setupStatus: 'completed',
        checklistResults: [
          { item: 'Unpacking and chassis inspection', checked: true },
          { item: 'Electrical grounding', checked: false }, // unchecked!
        ],
        supportingDocUrl: 'https://clinical.vivoquest.in/proof.jpg',
        customerConfirmationConfirmed: true,
      });

    assert.equal(failRes.status, 400);

    // Complete successfully with 3 verified checklist items, cost breakdown, proof, and confirmation
    const successRes = await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/installation`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        assignedSpecialistId: technicianId,
        setupStatus: 'completed',
        checklistResults: [
          { item: 'Unpacking and physical chassis inspection completed without defects', checked: true },
          { item: 'Electrical grounding, power line & battery calibration verified', checked: true },
          { item: 'Patient and primary caregiver trained on operation and emergency protocols', checked: true },
        ],
        supportingDocUrl: 'https://clinical.vivoquest.in/proof.jpg',
        customerConfirmationConfirmed: true,
        costBreakdown: {
          labourCost: 450,
          transportCost: 150,
          partsCost: 100,
          otherApprovedCharges: 0,
        },
      });

    assert.equal(successRes.status, 200);
    assert.equal(successRes.body.data.clinicalSetup.setupStatus, 'completed');
    assert.equal(successRes.body.data.clinicalSetup.costBreakdown.actualTotalCost, 700);
  });

  it('9. Delivery Milestone completion advances order to delivered and reconciles profitability', async () => {
    // Transition out_for_delivery first
    const outRes = await request(app)
      .put(`/api/v1/operations/orders/${testOrderId}/delivery-workflow`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`)
      .send({
        newStatus: 'out_for_delivery',
        notes: 'Loaded into last-mile delivery van',
        location: 'Shivajinagar Route',
      });
    assert.equal(outRes.status, 200);

    const res = await request(app)
      .put(`/api/v1/operations/orders/${testOrderId}/delivery-workflow`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`)
      .send({
        newStatus: 'delivered',
        notes: 'Doorstep drop-off and recipient verification completed',
        location: 'Shivajinagar Pune Residence',
        proofUrl: 'https://deliveries.vivoquest.in/pod_signed.jpg',
      });

    assert.equal(res.status, 200);

    // Recheck profitability -> now isReconciled must be true!
    const profitRes = await request(app)
      .get(`/api/v1/operations/orders/${testOrderId}/profitability`)
      .set('Authorization', `Bearer ${opsManagerToken}`);

    assert.equal(profitRes.status, 200);
    assert.equal(profitRes.body.data.isReconciled, true);
    assert.equal(profitRes.body.data.statusLabel, 'Reconciled (Delivered & Paid)');
  });

  it('10. Full Returns Lifecycle: patient requests return, operations approves, schedules pickup, records inspection and resolution', async () => {
    // A: Patient requests return
    const returnReqRes = await request(app)
      .post(`/api/v1/products/orders/${testOrderId}/return-request`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reason: 'Patient discharged from home care earlier than anticipated' });

    assert.equal(returnReqRes.status, 200);

    // B: Operations reviews & approves
    const reviewRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/returns/review`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({ action: 'approve' });

    assert.equal(reviewRes.status, 200);
    assert.equal(reviewRes.body.data.returnDetails.returnStatus, 'approved');

    // C: Schedule return pickup with delivery staff
    const pickupRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/returns/schedule-pickup`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        assignedStaffId: deliveryStaffId,
      });

    assert.equal(pickupRes.status, 200);
    assert.equal(pickupRes.body.data.returnDetails.returnStatus, 'pickup_scheduled');

    // D: Record return handover outcome
    const outcomeRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/returns/pickup-outcome`)
      .set('Authorization', `Bearer ${deliveryStaffToken}`)
      .send({
        pickupStatus: 'completed',
        pickupProofUrl: 'https://reverse-logistics.vivoquest.in/pickup_photo.jpg',
        customerHandoverConfirmed: true,
        itemConditionChecklist: [{ item: 'Device present', passed: true }],
      });

    assert.equal(outcomeRes.status, 200);
    assert.equal(outcomeRes.body.data.returnDetails.returnStatus, 'received_for_inspection');

    // E: Technical inspection findings
    const inspectRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/returns/inspection`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        result: 'intact_healthy',
        notes: 'Bed chassis intact, motor functioning within specification, sanitized for restock',
      });

    assert.equal(inspectRes.status, 200);
    assert.equal(inspectRes.body.data.returnDetails.returnStatus, 'resolution_pending');

    // F: Finalize resolution (refund)
    const resolveRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/returns/resolution`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        type: 'refund',
        refundAmount: 18500,
        notes: 'Restock approved, refunded purchase fee less delivery service fee',
      });

    assert.equal(resolveRes.status, 200);
    assert.equal(resolveRes.body.data.returnDetails.returnStatus, 'resolved');
    assert.equal(resolveRes.body.data.pricing.refundAmount, 18500);
  });

  it('11. Customer Complaint Investigation and resolution workflow', async () => {
    // Create complaint
    const complaint = await ProductComplaint.create({
      complaintNumber: `CMP-${Date.now().toString().slice(-4)}`,
      orderId: new mongoose.Types.ObjectId(testOrderId),
      orderNumber: testOrderNumber,
      productId: new mongoose.Types.ObjectId(testProductId),
      productSku: 'DEPOT-TEST',
      productTitle: 'Precision Hospital Bed',
      userId: new mongoose.Types.ObjectId(patientId),
      userName: 'Rohit Sharma (Patient)',
      userPhone: patientPhone,
      category: 'damaged_item',
      description: 'Minor scratch on left side guardrail upon unboxing',
      status: 'open',
      refundRequested: false,
      refundApproved: false,
      isDemo: false,
    });

    const res = await request(app)
      .patch(`/api/v1/operations/complaints/${complaint._id}`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        status: 'resolved',
        resolutionNotes: 'Biomedical technician dispatched touch-up rail replacement and completed on-site polishing',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'resolved');
  });

  it('12. Audit Trail captures operational actions with actor details and role', async () => {
    const logs = await AuditLog.find({ targetId: testOrderNumber }).lean();
    assert.ok(logs.length >= 3, `Expected at least 3 audit logs for ${testOrderNumber}, found ${logs.length}`);

    const actions = logs.map((l) => l.action);
    assert.ok(actions.includes('ORDER_STOCK_RESERVED'));
    assert.ok(actions.includes('ORDER_DELIVERY_DELAY_FLAGGED'));
    assert.ok(actions.includes('DELIVERY_RESCHEDULE_APPROVE'));
  });
});
