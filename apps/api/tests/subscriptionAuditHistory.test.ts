import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { CaregiverPlan } from '../src/models/CaregiverPlan.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { seedAdminDemoData } from '../src/services/adminService.js';
import * as adminService from '../src/services/adminService.js';
import { suspendCaregiverSubscription } from '../src/services/caregiverPlanService.js';

describe('Milestone B — Caregiver Subscription Audit History & Timeline Test Suite', () => {
  const app = createApp();

  let adminToken: string;
  let adminUserId: string;
  let adminFullName: string;
  const adminPhone = '9899009900';

  let superAdminToken: string;
  const superAdminPhone = '9899000001';

  let patientToken: string;
  let patientUserId: string;
  const patientPhone = '9877005544';

  let secondaryPatientUserId: string;
  const secondaryPatientPhone = '9877005545';

  let caregiverUserId1: string;
  let caregiverName1: string;
  const caregiverPhone1 = '9822441122';

  let caregiverUserId2: string;
  let caregiverName2: string;
  const caregiverPhone2 = '9822334455';

  let planId: string;
  let planTitle: string;

  let testSubAId: string;
  let testSubANumber: string;

  let testSubBId: string;
  let testSubBNumber: string;

  before(async () => {
    await connectDatabase();

    // Clean up test data
    await User.deleteMany({ phone: { $in: [patientPhone, secondaryPatientPhone] } });
    await CaregiverSubscription.deleteMany({ patientPhone: { $in: [patientPhone, secondaryPatientPhone] } });

    await seedAdminDemoData();

    // 1. Admin login
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: adminPhone,
        otp: '123456',
        role: 'admin',
      });
    assert.equal(adminLoginRes.status, 200, 'Admin login should succeed');
    adminToken = adminLoginRes.body.data.token;
    adminUserId = adminLoginRes.body.data.user.id;
    adminFullName = adminLoginRes.body.data.user.fullName;

    // 2. Super Admin login
    const superLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: superAdminPhone,
        otp: '123456',
        role: 'super_admin',
      });
    assert.equal(superLoginRes.status, 200, 'Super admin login should succeed');
    superAdminToken = superLoginRes.body.data.token;

    // 3. Register primary patient
    const regPatientRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Audit History Primary Patient',
        phone: patientPhone,
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(regPatientRes.status, 201, 'Patient registration should succeed');
    patientToken = regPatientRes.body.data.token;
    patientUserId = regPatientRes.body.data.user.id;

    // 4. Register secondary patient for cross-subscription scoping isolation tests
    const regSecPatientRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Audit History Scoping Patient',
        phone: secondaryPatientPhone,
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(regSecPatientRes.status, 201, 'Secondary patient registration should succeed');
    secondaryPatientUserId = regSecPatientRes.body.data.user.id;

    // 5. Find or create caregivers
    let cg1 = await User.findOne({ phone: caregiverPhone1 });
    if (!cg1) {
      cg1 = await User.create({
        fullName: 'Sister Sunita Deshpande',
        phone: caregiverPhone1,
        email: 'sunita.deshpande@vivoquest.in',
        role: 'professional',
        passwordHash: '$2a$10$wK1W8GqjV1dE8qfS9I4PueZ.qBwT6Y1oF.5yWfB3p1Z5F9jG3.P3m',
        isPhoneVerified: true,
        status: 'active',
        dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
      });
    }
    caregiverUserId1 = cg1._id.toString();
    caregiverName1 = cg1.fullName;

    let cg2 = await User.findOne({ phone: caregiverPhone2 });
    if (!cg2) {
      cg2 = await User.create({
        fullName: 'Nurse Pratibha Joshi',
        phone: caregiverPhone2,
        email: 'pratibha.joshi@vivoquest.in',
        role: 'professional',
        passwordHash: '$2a$10$wK1W8GqjV1dE8qfS9I4PueZ.qBwT6Y1oF.5yWfB3p1Z5F9jG3.P3m',
        isPhoneVerified: true,
        status: 'active',
        dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
      });
    }
    caregiverUserId2 = cg2._id.toString();
    caregiverName2 = cg2.fullName;


    // 6. Find plan
    const plan = await CaregiverPlan.findOne({ isActive: true });
    assert.ok(plan, 'Active care plan should exist');
    planId = plan._id.toString();
    planTitle = plan.title;

    // 7. Activate Subscription A
    const activateResA = await request(app)
      .post('/api/v1/admin/caregiver-subscriptions/activate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: patientUserId,
        planId,
        assignedCaregiverId: caregiverUserId1,
        carePlanNotes: 'Subscription A for comprehensive audit timeline verification',
      });
    assert.equal(activateResA.status, 201, 'Subscription A activation should succeed');
    testSubAId = activateResA.body.data.id || activateResA.body.data._id;
    testSubANumber = activateResA.body.data.subscriptionNumber;

    // 8. Activate Subscription B (isolated scope)
    const activateResB = await request(app)
      .post('/api/v1/admin/caregiver-subscriptions/activate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: secondaryPatientUserId,
        planId,
        assignedCaregiverId: caregiverUserId2,
        carePlanNotes: 'Subscription B for scoping validation',
      });
    assert.equal(activateResB.status, 201, 'Subscription B activation should succeed');
    testSubBId = activateResB.body.data.id || activateResB.body.data._id;
    testSubBNumber = activateResB.body.data.subscriptionNumber;
  });

  after(async () => {
    await User.deleteMany({ phone: { $in: [patientPhone, secondaryPatientPhone] } });
    await CaregiverSubscription.deleteMany({ patientPhone: { $in: [patientPhone, secondaryPatientPhone] } });
    await disconnectDatabase();
  });

  describe('1. Authentication & Authorization Safeguards', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`);
      assert.equal(res.status, 401, 'Unauthenticated request must return 401');
      assert.equal(res.body.success, false);
    });

    it('should reject non-admin patient role with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${patientToken}`);
      assert.equal(res.status, 403, 'Patient role must receive 403 Forbidden');
      assert.equal(res.body.success, false);
    });

    it('should allow authorized admin to retrieve history with 200 OK', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200, 'Admin must be able to view history');
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data), 'Data should be an array of events');
      assert.ok(res.body.subscription, 'Subscription header summary must be present');
      assert.equal(res.body.subscription.subscriptionNumber, testSubANumber);
    });

    it('should allow super-admin to retrieve history with 200 OK', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(res.status, 200, 'Super admin must be able to view history');
      assert.equal(res.body.success, true);
    });

    it('should return 404 for non-existent subscription ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${fakeId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 404, 'Non-existent subscription must return 404');
    });
  });

  describe('2. Comprehensive Audit Event Trail for All Subscription Lifecycle Actions', () => {
    it('records CAREGIVER_SUBSCRIPTION_ACTIVATED event on activation', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const events = res.body.data;
      const activationEvent = events.find((e: any) => e.action === 'CAREGIVER_SUBSCRIPTION_ACTIVATED');
      assert.ok(activationEvent, 'Activation audit event should exist');
      assert.equal(activationEvent.targetId, testSubANumber);
      assert.equal(activationEvent.actorName, adminFullName);
      assert.equal(activationEvent.actorRole, 'admin');
      assert.ok(activationEvent.details.subscriptionId);
      assert.ok(activationEvent.details.patientId);
      assert.ok(activationEvent.details.planTitle);
    });

    it('records CAREGIVER_ASSIGNED_TO_SUBSCRIPTION on caregiver reassignment', async () => {
      const assignRes = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          caregiverUserId: caregiverUserId2,
          notes: 'Reassigned to specialist palliative nurse',
        });
      assert.equal(assignRes.status, 200);

      const historyRes = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      const events = historyRes.body.data;
      const assignEvent = events.find((e: any) => e.action === 'CAREGIVER_ASSIGNED_TO_SUBSCRIPTION');
      assert.ok(assignEvent, 'Reassignment event must be recorded');
      assert.equal(assignEvent.details.newCaregiverId, caregiverUserId2);
      assert.equal(assignEvent.details.newCaregiverName, caregiverName2);
      assert.equal(assignEvent.details.previousCaregiverId, caregiverUserId1);
      assert.equal(assignEvent.details.previousCaregiverName, caregiverName1);
      assert.equal(assignEvent.actorName, adminFullName);
    });

    it('records SUBSCRIPTION_VISIT_RECORDED when a visit is logged', async () => {
      const visitRes = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/record-visit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Vital signs logged, wound dressing changed',
          visitIdempotencyKey: 'VISIT-TEST-001',
        });
      assert.equal(visitRes.status, 200);

      const historyRes = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      const events = historyRes.body.data;
      const visitEvent = events.find((e: any) => e.action === 'SUBSCRIPTION_VISIT_RECORDED');
      assert.ok(visitEvent, 'Visit recorded event must be in history');
      assert.equal(visitEvent.details.correlationId, 'VISIT-TEST-001');
      assert.ok(typeof visitEvent.details.visitsRemaining === 'number');
      assert.ok(typeof visitEvent.details.visitsCompleted === 'number');
    });

    it('records CAREGIVER_SUBSCRIPTION_SUSPENDED when subscription is paused', async () => {
      const suspendRes = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Patient admitted to inpatient hospice facility',
        });
      assert.equal(suspendRes.status, 200);

      const historyRes = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      const events = historyRes.body.data;
      const suspendEvent = events.find((e: any) => e.action === 'CAREGIVER_SUBSCRIPTION_SUSPENDED');
      assert.ok(suspendEvent, 'Suspension event must be recorded');
      assert.equal(suspendEvent.details.previousStatus, 'active');
      assert.equal(suspendEvent.details.newStatus, 'suspended');
      assert.equal(suspendEvent.details.reason, 'Patient admitted to inpatient hospice facility');
      assert.equal(suspendEvent.severity, 'warning');
    });

    it('records CAREGIVER_SUBSCRIPTION_RESUMED when subscription is reactivated', async () => {
      const resumeRes = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/resume`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Patient discharged from inpatient care, resuming home shifts',
        });
      assert.equal(resumeRes.status, 200);

      const historyRes = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      const events = historyRes.body.data;
      const resumeEvent = events.find((e: any) => e.action === 'CAREGIVER_SUBSCRIPTION_RESUMED');
      assert.ok(resumeEvent, 'Resume event must be recorded');
      assert.equal(resumeEvent.details.previousStatus, 'suspended');
      assert.equal(resumeEvent.details.newStatus, 'active');
      assert.equal(resumeEvent.details.reason, 'Patient discharged from inpatient care, resuming home shifts');
    });

    it('records CAREGIVER_SUBSCRIPTION_CANCELLED when subscription is terminated', async () => {
      const cancelRes = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Patient relocated to palliative care community',
        });
      assert.equal(cancelRes.status, 200);

      const historyRes = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      const events = historyRes.body.data;
      const cancelEvent = events.find((e: any) => e.action === 'CAREGIVER_SUBSCRIPTION_CANCELLED');
      assert.ok(cancelEvent, 'Cancellation event must be recorded');
      assert.equal(cancelEvent.details.previousStatus, 'active');
      assert.equal(cancelEvent.details.newStatus, 'cancelled');
      assert.equal(cancelEvent.details.reason, 'Patient relocated to palliative care community');
    });

    it('records CAREGIVER_SUBSCRIPTION_ARCHIVED when subscription is archived', async () => {
      const archiveRes = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Quarterly compliance archival of cancelled care package',
        });
      assert.equal(archiveRes.status, 200);

      const historyRes = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      const events = historyRes.body.data;
      const archiveEvent = events.find((e: any) => e.action === 'CAREGIVER_SUBSCRIPTION_ARCHIVED');
      assert.ok(archiveEvent, 'Archival event must be recorded');
      assert.equal(archiveEvent.details.reason, 'Quarterly compliance archival of cancelled care package');
    });
  });

  describe('3. Chronological Ordering, Scoping & Pagination', () => {
    it('returns events in strictly descending chronological order (newest first)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const events = res.body.data;
      assert.ok(events.length >= 7, 'Should have recorded at least 7 events throughout lifecycle');

      // Verify descending order
      for (let i = 0; i < events.length - 1; i++) {
        const currentTimestamp = new Date(events[i].timestamp).getTime();
        const nextTimestamp = new Date(events[i + 1].timestamp).getTime();
        assert.ok(
          currentTimestamp >= nextTimestamp,
          `Event at index ${i} (${events[i].action} @ ${events[i].timestamp}) must be newer or equal to index ${i + 1} (${events[i + 1].action} @ ${events[i + 1].timestamp})`
        );
      }
    });

    it('strictly scopes audit events to the requested subscription (no cross-subscription leakage)', async () => {
      const resA = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      const resB = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubBId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(resA.status, 200);
      assert.equal(resB.status, 200);

      // Verify events in A only point to Subscription A
      for (const event of resA.body.data) {
        assert.equal(event.targetId, testSubANumber);
        assert.equal(event.details.subscriptionNumber, testSubANumber);
      }

      // Verify events in B only point to Subscription B
      for (const event of resB.body.data) {
        assert.equal(event.targetId, testSubBNumber);
        assert.equal(event.details.subscriptionNumber, testSubBNumber);
      }
    });

    it('supports pagination with page and limit parameters', async () => {
      const page1Res = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history?page=1&limit=3`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(page1Res.status, 200);
      assert.equal(page1Res.body.data.length, 3);
      assert.equal(page1Res.body.pagination.page, 1);
      assert.equal(page1Res.body.pagination.limit, 3);
      assert.ok(page1Res.body.pagination.total >= 7);
      assert.ok(page1Res.body.pagination.pages >= 3);

      const page2Res = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history?page=2&limit=3`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(page2Res.status, 200);
      assert.equal(page2Res.body.data.length, 3);
      assert.equal(page2Res.body.pagination.page, 2);

      // Verify page 2 has different events from page 1
      const page1Ids = page1Res.body.data.map((e: any) => e.id);
      const page2Ids = page2Res.body.data.map((e: any) => e.id);
      for (const id of page2Ids) {
        assert.ok(!page1Ids.includes(id), `Page 2 item ${id} should not appear on page 1`);
      }
    });

    it('validates query parameters and rejects invalid pagination with 400', async () => {
      const invalidPageRes = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history?page=-1`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(invalidPageRes.status, 400);

      const invalidLimitRes = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history?limit=999`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(invalidLimitRes.status, 400);
    });
  });

  describe('4. Append-Only Safeguards & Immutability Protections', () => {
    it('prohibits DELETE on history endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 403, 'DELETE on history endpoint must return 403');
      assert.match(res.body.message || res.body.error?.message, /strictly append-only/i);
    });

    it('prohibits PUT on history endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'FABRICATED_ACTION' });

      assert.equal(res.status, 403, 'PUT on history endpoint must return 403');
    });

    it('prohibits PATCH on history endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/caregiver-subscriptions/${testSubAId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'MODIFIED_ACTION' });

      assert.equal(res.status, 403, 'PATCH on history endpoint must return 403');
    });

    it('enforces Mongoose schema append-only pre-hook rejecting update operations on AuditLog', async () => {
      await assert.rejects(
        async () => {
          await AuditLog.updateOne(
            { targetId: testSubANumber },
            { $set: { actorName: 'Hacker Overwrite' } }
          );
        },
        /append-only/i,
        'AuditLog updateOne must be rejected by schema pre-hook'
      );
    });
  });

  describe('5. Audit Failure State-Consistency Rollback (No Silent Unaudited Transitions)', () => {
    it('rolls back subscription state transition if audit logging throws an error', async () => {
      // Create a fresh active subscription for this rollback test
      const testPatientRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Rollback Test Patient',
          phone: '9877009988',
          role: 'patient',
          consentAccepted: true,
        });
      const rollbackPatientId = testPatientRes.body.data.user.id;

      const actRes = await request(app)
        .post('/api/v1/admin/caregiver-subscriptions/activate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: rollbackPatientId,
          planId,
          assignedCaregiverId: caregiverUserId1,
          carePlanNotes: 'Initial notes before simulated audit failure',
        });
      const rollbackSubId = actRes.body.data.id || actRes.body.data._id;

      // Verify initial state is active
      const beforeDoc = await CaregiverSubscription.findById(rollbackSubId);
      assert.equal(beforeDoc?.status, 'active');

      // Stub AuditLog.create to simulate audit log database failure
      const originalAuditCreate = AuditLog.create;
      (AuditLog as any).create = async () => {
        throw new Error('SIMULATED_AUDIT_DISK_FULL_EXCEPTION');
      };

      try {
        const adminUser = await User.findById(adminUserId);
        assert.ok(adminUser);

        // Attempt suspension while audit log is failing
        await assert.rejects(
          async () => {
            await suspendCaregiverSubscription(
              rollbackSubId,
              'Suspending with simulated audit failure',
              adminUser as any
            );
          },
          /Audit logging failed.*rolled back/i,
          'Must throw 500 error reporting rollback due to audit failure'
        );

        // Verify that the subscription status was safely rolled back to 'active'
        const afterDoc = await CaregiverSubscription.findById(rollbackSubId);
        assert.equal(
          afterDoc?.status,
          'active',
          'Subscription status MUST be rolled back to active; no unaudited suspended transition permitted'
        );
        assert.equal(afterDoc?.suspendedAt, undefined);
        assert.equal(afterDoc?.suspensionReason, undefined);
      } finally {
        // Restore original AuditLog.create
        (AuditLog as any).create = originalAuditCreate;


        // Cleanup rollback test patient and subscription
        await User.deleteMany({ phone: '9877009988' });
        await CaregiverSubscription.deleteMany({ _id: rollbackSubId });
      }
    });
  });
});
