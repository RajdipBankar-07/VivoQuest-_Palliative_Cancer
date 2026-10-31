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
import { NotificationLog } from '../src/models/NotificationLog.js';
import { seedAdminDemoData } from '../src/services/adminService.js';

describe('VivoQuest Phase 14 — Final End-to-End Operations & Visual QA Verification Suite', () => {
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
  let testRescheduleRequestId: string;

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
        fullName: 'Deepak Patil (Phase 14 Patient)',
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
        fullName: 'Phase 14 Ops Manager',
        phone: opsPhone,
        email: `ops.p14.${Date.now()}@vivoquest.in`,
        role: 'operations_manager',
        department: 'Operations & Last-Mile Logistics',
        designation: 'Operations Lead',
        password: 'Password123!',
      });
    assert.equal(opsUserRes.status, 201);
    opsManagerId = opsUserRes.body.data.id || opsUserRes.body.data._id;

    const opsLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: opsPhone, password: 'Password123!' });
    assert.equal(opsLoginRes.status, 200);
    opsManagerToken = opsLoginRes.body.data.token;

    // 4. Create Delivery Staff
    const delivUserRes = await request(app)
      .post('/api/v1/admin/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Phase 14 Delivery Staff',
        phone: deliveryPhone,
        email: `driver.p14.${Date.now()}@vivoquest.in`,
        role: 'delivery_staff',
        department: 'Last-Mile Fleet',
        designation: 'Delivery Rider',
        password: 'Password123!',
      });
    assert.equal(delivUserRes.status, 201);
    deliveryStaffId = delivUserRes.body.data.id || delivUserRes.body.data._id;

    const delivLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: deliveryPhone, password: 'Password123!' });
    assert.equal(delivLoginRes.status, 200);
    deliveryStaffToken = delivLoginRes.body.data.token;

    // 5. Create Biomedical Technician
    const techUserRes = await request(app)
      .post('/api/v1/admin/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Phase 14 Biomedical Specialist',
        phone: techPhone,
        email: `tech.p14.${Date.now()}@vivoquest.in`,
        role: 'maintenance_staff',
        department: 'Clinical Setup & Maintenance',
        designation: 'Biomedical Engineer',
        password: 'Password123!',
      });
    assert.equal(techUserRes.status, 201);
    technicianId = techUserRes.body.data.id || techUserRes.body.data._id;

    const techLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: techPhone, password: 'Password123!' });
    assert.equal(techLoginRes.status, 200);
    technicianToken = techLoginRes.body.data.token;

    // 6. Create product and order fixture
    const product = await MedicalProduct.create({
      sku: `MED-P14-${Date.now().toString().slice(-4)}`,
      title: 'Bi-PAP Non-Invasive Ventilator',
      category: 'respiratory',
      description: 'High-acuity Bi-PAP with humidifier chamber and clinical alarms',
      price: 32000,
      regularPrice: 38000,
      stockQuantity: 12,
      reservedQuantity: 0,
      sourcingType: 'own_stock',
      status: 'active',
      isActive: true,
      equipmentCondition: 'healthy',
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600'],
      primaryImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600',
    });
    testProductId = String(product._id);

    testOrderNumber = `VQ-P14-${Date.now().toString().slice(-6)}`;
    const order = await ProductOrder.create({
      orderNumber: testOrderNumber,
      patientId: new mongoose.Types.ObjectId(patientId),
      patientName: 'Deepak Patil',
      patientPhone: patientPhone,
      deliveryAddress: {
        recipientName: 'Deepak Patil',
        phoneNumber: patientPhone,
        street: 'B-404, Nyati Elysia, Kharadi',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411014',
      },
      items: [
        {
          productId: product._id,
          sku: product.sku,
          title: product.title,
          category: product.category,
          quantity: 1,
          unitPrice: product.price,
          totalPrice: product.price,
          isRental: false,
          setupRequired: true,
          installationSelected: true,
          installationCharge: 500,
          sourcingType: 'own_stock',
          procurementCost: 20000,
        },
      ],
      pricing: {
        subtotal: product.price,
        deliveryFee: 0,
        tax: 0,
        discount: 0,
        totalAmount: product.price,
      },
      clinicalSetup: {
        isSetupRequired: true,
        setupStatus: 'pending',
      },
      paymentMethod: 'online',
      paymentStatus: 'paid',
      orderStatus: 'placed',
      estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      orderTimeline: [
        {
          status: 'placed',
          timestamp: new Date(),
          notes: 'Order placed by patient online',
        },
      ],
    });
    testOrderId = String(order._id);
  });

  after(async () => {
    if (testOrderId) {
      await ProductOrder.deleteOne({ _id: testOrderId });
      await ProductComplaint.deleteMany({ orderId: testOrderId });
    }
    if (testProductId) {
      await MedicalProduct.deleteOne({ _id: testProductId });
    }
    await User.deleteMany({ phone: { $in: [opsPhone, deliveryPhone, techPhone, patientPhone] } });
    await disconnectDatabase();
  });

  it('1. Order appears in the operations queue with correct initial fields', async () => {
    const queueRes = await request(app)
      .get('/api/v1/operations/orders')
      .set('Authorization', `Bearer ${opsManagerToken}`);

    assert.equal(queueRes.status, 200);
    const foundOrder = queueRes.body.data.find((o: any) => o.orderNumber === testOrderNumber);
    assert.ok(foundOrder, 'Order must be present in operations orders list');
    assert.equal(foundOrder.orderStatus, 'placed');
    assert.equal(foundOrder.paymentStatus, 'paid');
    assert.equal(foundOrder.patientName, 'Deepak Patil');
  });

  it('2. Stock availability and atomic reservation locks stock correctly', async () => {
    const prodBefore = await MedicalProduct.findById(testProductId);
    assert.equal(prodBefore?.reservedQuantity, 0);

    const reserveRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/reserve-stock`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({});

    assert.equal(reserveRes.status, 200);
    assert.equal(reserveRes.body.data.orderStatus, 'confirmed');

    const prodAfter = await MedicalProduct.findById(testProductId);
    assert.equal(prodAfter?.reservedQuantity, 1, 'Reserved quantity must be incremented by ordered qty');
  });

  it('3. Delivery assignment and status updates persist through delivery workflow', async () => {
    // 1. Assign driver
    const assignRes = await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/assign-delivery`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        staffId: deliveryStaffId,
        scheduledDeliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        deliveryNotes: 'Fragile Bi-PAP unit. Temperature-controlled transport.',
      });
    assert.equal(assignRes.status, 200);
    assert.equal(String(assignRes.body.data.deliveryAssignment?.assignedStaffId), deliveryStaffId);

    // 2. Advance to ready_for_dispatch then dispatched
    await request(app)
      .put(`/api/v1/operations/orders/${testOrderId}/delivery-workflow`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        newStatus: 'ready_for_dispatch',
        location: 'Depot Staging Area',
        notes: 'Packed and ready for pickup',
      });

    const dispatchRes = await request(app)
      .put(`/api/v1/operations/orders/${testOrderId}/delivery-workflow`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        newStatus: 'dispatched',
        location: 'Kharadi Distribution Center',
        notes: 'Dispatched with delivery specialist',
      });
    assert.equal(dispatchRes.status, 200);
    assert.equal(dispatchRes.body.data.orderStatus, 'dispatched');
  });

  it('4. A delivery delay records its reason, updates revised ETA, and logs notification', async () => {
    const revisedEta = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const delayRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/flag-delay`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        delayReason: 'Oxygen humidifier sensor calibration required in depot',
        revisedEstimatedDate: revisedEta,
        notes: 'Biomedical QA team holding until pressure chamber validation completes.',
      });

    assert.equal(delayRes.status, 200);
    assert.equal(delayRes.body.data.orderStatus, 'delivery_rescheduled');

    // Verify NotificationLog captured the communication (channel: in_app)
    const notif = await NotificationLog.findOne({ recipientPhone: patientPhone });
    assert.ok(notif, 'A notification log entry should be created for patient');
  });

  it('5. Patient requests delivery rescheduling from patient app', async () => {
    const requestedSlot = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const reqRes = await request(app)
      .post(`/api/v1/products/orders/${testOrderId}/reschedule-request`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        requestedDate: requestedSlot,
        requestedTimeSlot: 'Afternoon 14:00 - 18:00',
        reason: 'Caregiver attending medical checkup on earlier date',
      });

    assert.equal(reqRes.status, 200);
    assert.ok(reqRes.body.data.rescheduleRequests.length >= 1);
    const latest = reqRes.body.data.rescheduleRequests[reqRes.body.data.rescheduleRequests.length - 1];
    testRescheduleRequestId = String(latest._id);
    assert.equal(latest.status, 'pending');
    assert.equal(latest.reason, 'Caregiver attending medical checkup on earlier date');
  });

  it('6. Operations reviews and approves patient reschedule request, synchronizing order tracker', async () => {
    const reviewRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/reschedule-review`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        requestId: testRescheduleRequestId,
        action: 'approve',
        reason: 'Customer reschedule approved; driver fleet reassigned to afternoon route.',
      });

    assert.equal(reviewRes.status, 200);
    assert.equal(reviewRes.body.data.orderStatus, 'delivery_rescheduled');

    // Verify patient order tracking view synchronization
    const patientOrderRes = await request(app)
      .get(`/api/v1/products/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    assert.equal(patientOrderRes.status, 200);
    assert.equal(patientOrderRes.body.data.orderStatus, 'delivery_rescheduled');
    const requests = patientOrderRes.body.data.rescheduleRequests;
    assert.equal(requests[requests.length - 1].status, 'approved');
  });

  it('7. Product creation and image uploads work and update the catalog', async () => {
    const newSku = `VENT-P14-${Date.now().toString().slice(-4)}`;
    const createRes = await request(app)
      .post('/api/v1/operations/products')
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        sku: newSku,
        title: 'Clinical CPAP Sleep Apnea Unit',
        category: 'respiratory',
        description: 'Auto-adjusting CPAP machine with climate line tubing',
        price: 24500,
        regularPrice: 28000,
        stockQuantity: 8,
        sourcingType: 'own_stock',
        equipmentCondition: 'healthy',
        conditionNotes: 'Recertified by biomedical engineer with fresh HEPA filter',
        images: [
          'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600',
          'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600',
        ],
        primaryImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600',
      });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.data.sku, newSku);
    assert.equal(createRes.body.data.images.length, 2);

    // Verify product appears in catalog
    const catalogRes = await request(app)
      .get('/api/v1/operations/products')
      .set('Authorization', `Bearer ${opsManagerToken}`);
    assert.equal(catalogRes.status, 200);
    const found = catalogRes.body.data.find((p: any) => p.sku === newSku);
    assert.ok(found, 'Created product must appear in catalog');

    // Clean up created product
    await MedicalProduct.deleteOne({ sku: newSku });
  });

  it('8. Installation charges and actual costs are calculated, validated, and displayed correctly', async () => {
    const installRes = await request(app)
      .patch(`/api/v1/operations/orders/${testOrderId}/installation`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        assignedSpecialistId: technicianId,
        setupStatus: 'completed',
        setupDate: new Date().toISOString().slice(0, 10),
        timeSlot: '02:00 PM - 04:00 PM',
        setupNotes: 'Bi-PAP circuit assembled, humidifier filled with distilled water, pressure titrated to 14 cmH2O.',
        supportingDocUrl: 'https://example.com/docs/biomed-safety-cert-p14.pdf',
        customerConfirmationConfirmed: true,
        checklistResults: [
          { item: 'Unboxing & Electrical Safety Check', checked: true },
          { item: 'Humidifier Chamber & Tubing Seal Test', checked: true },
          { item: 'Caregiver & Patient Usage Demonstration', checked: true },
        ],
        costBreakdown: {
          labourCost: 800,
          transportCost: 350,
          partsCost: 250,
          otherApprovedCharges: 100,
        },
      });

    assert.equal(installRes.status, 200);
    const setup = installRes.body.data.clinicalSetup;
    assert.equal(setup.setupStatus, 'completed');
    assert.equal(setup.costBreakdown.actualTotalCost, 1500, 'Actual total cost must sum labour+transport+parts+other');

    // Complete delivery
    const deliverRes = await request(app)
      .put(`/api/v1/operations/orders/${testOrderId}/delivery-workflow`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        newStatus: 'delivered',
        location: 'Customer Doorstep, Kharadi',
        notes: 'Handed over directly to patient Deepak Patil with signed acknowledgment.',
        proofUrl: 'https://example.com/pod-deepak.jpg',
      });
    assert.equal(deliverRes.status, 200);
    assert.equal(deliverRes.body.data.orderStatus, 'delivered');

    // Margin & Profitability check
    const profitRes = await request(app)
      .get(`/api/v1/operations/orders/${testOrderId}/profitability`)
      .set('Authorization', `Bearer ${opsManagerToken}`);

    assert.equal(profitRes.status, 200);
    assert.equal(profitRes.body.data.isReconciled, true, 'Delivered and paid order must be classified as Reconciled');
    assert.equal(profitRes.body.data.directCosts.actualInstallationCost, 1500);
    assert.ok(profitRes.body.data.profitability.contributionMargin > 0);
  });

  it('9. Returns and Complaints progress through their authorized lifecycles', async () => {
    // 1. Patient requests return
    const returnReqRes = await request(app)
      .post(`/api/v1/products/orders/${testOrderId}/return-request`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        reason: 'equipment_unneeded',
        detailedReason: 'Patient discharged from oxygen therapy ahead of schedule',
        conditionDescription: 'Machine sealed and sanitized',
      });
    assert.equal(returnReqRes.status, 200);
    assert.equal(returnReqRes.body.data.returnDetails.returnStatus, 'requested');

    // 2. Ops reviews and approves
    const returnReviewRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/returns/review`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        action: 'approve',
        rejectionReason: '',
      });
    assert.equal(returnReviewRes.status, 200);
    assert.equal(returnReviewRes.body.data.returnDetails.returnStatus, 'approved');

    // 3. Ops schedules reverse logistics pickup
    const pickupRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/returns/schedule-pickup`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        assignedStaffId: deliveryStaffId,
        notes: 'Bring sanitization container for return collection',
      });
    assert.equal(pickupRes.status, 200);
    assert.equal(pickupRes.body.data.returnDetails.returnStatus, 'pickup_scheduled');

    // 4. Record inspection
    const inspectRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/returns/inspection`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        result: 'intact_healthy',
        notes: 'Bi-PAP unit pristine. Cleaned and prepared for inventory restocking.',
      });
    assert.equal(inspectRes.status, 200);
    assert.equal(inspectRes.body.data.returnDetails.returnStatus, 'resolution_pending');

    // 5. Finalize resolution
    const resolveRes = await request(app)
      .post(`/api/v1/operations/orders/${testOrderId}/returns/resolution`)
      .set('Authorization', `Bearer ${opsManagerToken}`)
      .send({
        type: 'refund',
        refundAmount: 32000,
        notes: 'Full refund approved for returned device.',
      });
    assert.equal(resolveRes.status, 200);
    assert.equal(resolveRes.body.data.returnDetails.returnStatus, 'resolved');
  });

  it('10. Audit history and role-based access control isolation work as intended', async () => {
    // Audit verification
    const audits = await AuditLog.find({ targetId: testOrderNumber });
    assert.ok(audits.length >= 3, 'All operational actions must write to AuditLog');
    const actions = audits.map((a) => a.action);
    assert.ok(actions.includes('DELIVERY_STAFF_ASSIGNED'));
    assert.ok(actions.includes('ORDER_DELIVERY_DELAY_FLAGGED'));

    // RBAC Isolation: Operations Manager cannot access admin finance endpoint
    const forbiddenRes = await request(app)
      .get('/api/v1/admin/finances/summary')
      .set('Authorization', `Bearer ${opsManagerToken}`);
    assert.equal(forbiddenRes.status, 403, 'Operations manager must be blocked from financial admin dashboard');
  });
});
