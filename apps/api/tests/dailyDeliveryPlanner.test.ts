import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { ProductOrder } from '../src/models/ProductOrder.js';
import { MedicalProduct } from '../src/models/MedicalProduct.js';
import { NotificationLog } from '../src/models/NotificationLog.js';

describe('VivoQuest — Operations API Integration & Daily Delivery Planner Test Suite', () => {
  let app: any;
  let opsManagerToken: string;
  let opsManagerId: string;
  let testOrderId: string;
  let testOrderNumber: string;
  let overdueOrderId: string;
  let todayOrderId: string;
  let notificationId: string;

  before(async () => {
    try {
      await (await import('../src/config/database.js')).connectDatabase();
      app = createApp();
      await (await import('../src/services/adminService.js')).seedAdminDemoData();

      // 1. Ops Manager login
      const seededLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: '9899000001',
          password: 'SuperAdmin#2026',
        });
      assert.equal(seededLogin.status, 200, 'Admin login failed');
      opsManagerToken = seededLogin.body.data.token;
      opsManagerId = seededLogin.body.data.user.id;

    // 2. Create seed orders for testing planner & IST bounds
    const now = new Date();
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(now.getTime() + IST_OFFSET_MS);

    // Order 1: Due Today
    const todayTarget = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate(), 10, 0, 0) - IST_OFFSET_MS);
    const order1 = await ProductOrder.create({
      orderNumber: `VQ-TEST-TODAY-${Date.now()}`,
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Kavita Joshi',
      patientPhone: '9876543210',
      deliveryAddress: {
        street: 'Flat 402, Shivajinagar',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411005',
      },
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          title: 'Oxygen Concentrator 5L',
          price: 35000,
          unitPrice: 35000,
          quantity: 1,
          category: 'respiratory',
          sku: `VQ-OXY-5L-${Date.now()}`,
          sourcingType: 'own_stock',
        },
      ],
      pricing: { subtotal: 35000, gst: 4200, deliveryFee: 0, totalAmount: 39200 },
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      deliveryAssignment: {
        scheduledDeliveryDate: todayTarget,
        assignedStaffName: 'Ramesh Powar',
        assignedStaffPhone: '9822001122',
      },
      deliveryPreferences: {
        preferredDate: todayTarget,
        preferredSlot: 'Morning (09:00 - 13:00)',
      },
    });
    todayOrderId = order1._id.toString();

    // Order 2: Overdue (Promised 2 days ago, not completed)
    const overdueTarget = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() - 2, 10, 0, 0) - IST_OFFSET_MS);
    const order2 = await ProductOrder.create({
      orderNumber: `VQ-TEST-OVERDUE-${Date.now()}`,
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Anil Shinde',
      patientPhone: '9876543211',
      deliveryAddress: {
        street: 'Bungalow 7, Kothrud',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411038',
      },
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          title: 'Hospital Bed Electric 3-Function',
          price: 45000,
          unitPrice: 45000,
          quantity: 1,
          category: 'mobility',
          sku: `VQ-BED-3F-${Date.now()}`,
          sourcingType: 'supplier',
        },
      ],
      pricing: { subtotal: 45000, gst: 5400, deliveryFee: 0, totalAmount: 50400 },
      paymentStatus: 'paid',
      orderStatus: 'dispatched',
      deliveryAssignment: {
        scheduledDeliveryDate: overdueTarget,
        assignedStaffName: 'Suresh Patil',
        assignedStaffPhone: '9822003344',
        failureReason: 'Road block on highway delayed transit',
      },
      deliveryPreferences: {
        preferredDate: overdueTarget,
        preferredSlot: 'Afternoon (14:00 - 18:00)',
      },
    });
    overdueOrderId = order2._id.toString();

    // 3. Create a test notification for operations
    const notif = await NotificationLog.create({
      channel: 'in_app',
      recipient: 'operations_manager',
      recipientName: 'Operations Staff',
      recipientPhone: '+919876543210',
      recipientModel: 'User',
      templateId: 'OPERATIONAL_ALERT',
      messageBody: 'Order VQ-TEST-TODAY has been placed and requires dispatch staging.',
      subject: 'New Medical Equipment Order Placed',
      content: 'Order VQ-TEST-TODAY has been placed and requires dispatch staging.',
      status: 'simulated',
      metadata: {
        orderId: todayOrderId,
        orderNumber: order1.orderNumber,
        category: 'operations',
      },
    });
    notificationId = notif._id.toString();
    } catch (err) {
      console.error('ERROR IN BEFORE HOOK:', err);
      throw err;
    }
  });

  // ---------------------------------------------------------------------------
  // SECTION 1: COMPLETED DELIVERIES ENDPOINT (FIX VERIFICATION)
  // ---------------------------------------------------------------------------
  describe('1. Completed Deliveries Endpoint Verification', () => {
    it('1.1 should reject unauthenticated requests with HTTP 401', async () => {
      const res = await request(app).get('/api/v1/operations/completed-deliveries?page=1&limit=10');
      assert.equal(res.status, 401, 'Unauthenticated request should return 401');
      assert.equal(res.body.success, false);
      assert.ok(res.body.message || res.body.error);
    });

    it('1.2 should return HTTP 200 with completed deliveries archive and summary', async () => {
      const res = await request(app)
        .get('/api/v1/operations/completed-deliveries?page=1&limit=10')
        .set('Authorization', `Bearer ${opsManagerToken}`);

      assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data), 'data should be an array');
      assert.ok(res.body.pagination, 'pagination object should be present');
      assert.equal(res.body.pagination.limit, 10, 'limit should default to 10');
      assert.ok(typeof res.body.pagination.total === 'number');

      // Verify summary metrics
      assert.ok(res.body.summary, 'summary object should be present');
      assert.ok(typeof res.body.summary.totalDelivered === 'number');
      assert.ok(typeof res.body.summary.otpVerifiedCount === 'number');
      assert.ok(typeof res.body.summary.managerOverrideCount === 'number');
      assert.ok(typeof res.body.summary.avgDeliveryRating === 'number');
    });

    it('1.3 should respect verificationMethod and dateRange query filters', async () => {
      const res = await request(app)
        .get('/api/v1/operations/completed-deliveries?verificationMethod=customer_otp&dateRange=all')
        .set('Authorization', `Bearer ${opsManagerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: DAILY DELIVERY PLANNER & IST BUSINESS TIMEZONE
  // ---------------------------------------------------------------------------
  describe('2. Daily Delivery Planner Engine & IST Bounds', () => {
    it('2.1 should return HTTP 200 with summary and timezone set to Asia/Kolkata', async () => {
      const res = await request(app)
        .get('/api/v1/operations/delivery-planner?dateRange=today')
        .set('Authorization', `Bearer ${opsManagerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data, 'data should be present');
      assert.equal(res.body.data.summary.timezone, 'Asia/Kolkata');
      assert.equal(res.body.data.summary.dateRange, 'today');

      // Verify KPI structure
      const kpis = res.body.data.summary.kpis;
      assert.ok(typeof kpis.newOrConfirmed === 'number');
      assert.ok(typeof kpis.awaitingDispatch === 'number');
      assert.ok(typeof kpis.inTransit === 'number');
      assert.ok(typeof kpis.delivered === 'number');
      assert.ok(typeof kpis.overdue === 'number');
      assert.ok(typeof kpis.rescheduleRequests === 'number');

      // Verify Alert structure
      const alerts = res.body.data.summary.alerts;
      assert.ok(typeof alerts.dueToday === 'number');
      assert.ok(typeof alerts.dueSoon === 'number');
      assert.ok(typeof alerts.atRisk === 'number');
      assert.ok(typeof alerts.overdue === 'number');
    });

    it('2.2 should include today order in dateRange=today query', async () => {
      const res = await request(app)
        .get('/api/v1/operations/orders?dateRange=today&limit=10')
        .set('Authorization', `Bearer ${opsManagerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));

      const foundToday = res.body.data.find((o: any) => o._id === todayOrderId);
      assert.ok(foundToday, 'Today order should be present in dateRange=today results');
      assert.ok(['due_today', 'at_risk'].includes(foundToday.riskStatus));
    });

    it('2.3 should correctly detect overdue orders and calculate overdue delay', async () => {
      const res = await request(app)
        .get('/api/v1/operations/orders?dateRange=all&riskFilter=overdue&limit=10')
        .set('Authorization', `Bearer ${opsManagerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const foundOverdue = res.body.data.find((o: any) => o._id === overdueOrderId);
      assert.ok(foundOverdue, 'Overdue order should be present in riskFilter=overdue results');
      assert.equal(foundOverdue.isOverdue, true);
      assert.equal(foundOverdue.riskStatus, 'overdue');
      assert.ok(foundOverdue.overdueDelay.includes('overdue'));
      assert.equal(foundOverdue.riskReason, 'Road block on highway delayed transit');
    });

    it('2.4 should enrich orders with all 10 required row fields', async () => {
      const res = await request(app)
        .get('/api/v1/operations/orders?limit=5')
        .set('Authorization', `Bearer ${opsManagerToken}`);

      assert.equal(res.status, 200);
      const orders = res.body.data;
      assert.ok(orders.length > 0);

      for (const ord of orders) {
        assert.ok(ord.intendedDeliveryDate, 'intendedDeliveryDate missing');
        assert.ok(ord.deliverySlot, 'deliverySlot missing');
        assert.ok(['own_stock', 'supplier_direct'].includes(ord.sourcingType), 'sourcingType invalid');
        assert.ok(ord.addressSummary, 'addressSummary missing');
        assert.ok(typeof ord.isOverdue === 'boolean', 'isOverdue missing');
        assert.ok(typeof ord.overdueDelay === 'string', 'overdueDelay missing');
        assert.ok(ord.riskStatus, 'riskStatus missing');
        assert.ok(typeof ord.riskReason === 'string', 'riskReason missing');
        assert.ok(ord.nextAction, 'nextAction missing');
      }
    });

    it('2.5 should support dateRange presets: tomorrow, next_3_days, next_7_days, and custom', async () => {
      for (const range of ['tomorrow', 'next_3_days', 'next_7_days']) {
        const res = await request(app)
          .get(`/api/v1/operations/orders?dateRange=${range}&limit=10`)
          .set('Authorization', `Bearer ${opsManagerToken}`);

        assert.equal(res.status, 200, `Failed for range ${range}`);
        assert.equal(res.body.success, true);
        assert.ok(res.body.plannerSummary, `plannerSummary missing for range ${range}`);
      }

      // Test custom range
      const customRes = await request(app)
        .get('/api/v1/operations/orders?dateRange=custom&startDate=2026-10-01&endDate=2026-11-01&limit=10')
        .set('Authorization', `Bearer ${opsManagerToken}`);

      assert.equal(customRes.status, 200);
      assert.equal(customRes.body.success, true);
      assert.ok(customRes.body.data.length > 0);
    });

    it('2.6 should sort orders by earliest delivery deadline when sortBy=deliveryDate', async () => {
      const res = await request(app)
        .get('/api/v1/operations/orders?sortBy=deliveryDate&limit=10')
        .set('Authorization', `Bearer ${opsManagerToken}`);

      assert.equal(res.status, 200);
      const orders = res.body.data;
      assert.ok(orders.length >= 2);

      // Verify that intendedDeliveryDate is ascending
      for (let i = 0; i < orders.length - 1; i++) {
        const t1 = new Date(orders[i].intendedDeliveryDate).getTime();
        const t2 = new Date(orders[i + 1].intendedDeliveryDate).getTime();
        assert.ok(t1 <= t2, `Order at index ${i} (${orders[i].intendedDeliveryDate}) should be <= order at index ${i + 1} (${orders[i + 1].intendedDeliveryDate})`);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: OPERATIONAL NOTIFICATIONS
  // ---------------------------------------------------------------------------
  describe('3. Operational Notifications & Alerts', () => {
    it('3.1 should fetch operations notifications with unread count', async () => {
      const res = await request(app)
        .get('/api/v1/operations/notifications?limit=10')
        .set('Authorization', `Bearer ${opsManagerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(typeof res.body.unreadCount === 'number');
      assert.ok(res.body.unreadCount >= 1, 'Should have at least 1 unread notification');
    });

    it('3.2 should mark an individual notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/operations/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${opsManagerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.isRead, true);
      assert.ok(res.body.data.readAt);
    });

    it('3.3 should mark all operations notifications as read', async () => {
      const res = await request(app)
        .post('/api/v1/operations/notifications/mark-all-read')
        .set('Authorization', `Bearer ${opsManagerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify unread count is now 0
      const checkRes = await request(app)
        .get('/api/v1/operations/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${opsManagerToken}`);

      assert.equal(checkRes.status, 200);
      assert.equal(checkRes.body.unreadCount, 0);
      assert.equal(checkRes.body.data.length, 0);
    });
  });

  after(async () => {
    await mongoose.disconnect();
  });
});
