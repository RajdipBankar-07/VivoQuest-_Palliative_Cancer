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

describe('Milestone A — Subscription Lifecycle Actions & State Validation Test Suite', () => {
  const app = createApp();

  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900';

  let superAdminToken: string;
  const superAdminPhone = '9899000001';

  let patientToken: string;
  let patientUserId: string;
  const patientPhone = '9877001122';

  let caregiverUserId: string;
  const caregiverPhone = '9822441122';

  let planId: string;
  let testSubId: string;
  let testSubNumber: string;

  before(async () => {
    await connectDatabase();

    // Clean up test patient and any previous test subscriptions
    await User.deleteMany({ phone: patientPhone });
    await CaregiverSubscription.deleteMany({ patientPhone });

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

    // 3. Register patient
    const regPatientRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Lifecycle Test Patient',
        phone: patientPhone,
        role: 'patient',
        consentAccepted: true,
      });
    assert.equal(regPatientRes.status, 201, 'Patient registration should succeed');
    patientToken = regPatientRes.body.data.token;
    patientUserId = regPatientRes.body.data.user.id;

    // 4. Find caregiver user
    const cgUser = await User.findOne({ phone: caregiverPhone });
    assert.ok(cgUser, 'Caregiver user should exist from demo seed');
    caregiverUserId = cgUser._id.toString();

    // 5. Find plan
    const plan = await CaregiverPlan.findOne({ isActive: true });
    assert.ok(plan, 'Active care plan should exist');
    planId = plan._id.toString();

    // 6. Create active subscription for tests
    const activateRes = await request(app)
      .post('/api/v1/admin/caregiver-subscriptions/activate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: patientUserId,
        planId,
        assignedCaregiverId: caregiverUserId,
        carePlanNotes: 'Initial care plan instructions for lifecycle testing',
      });
    assert.equal(activateRes.status, 201, 'Caregiver subscription activation should succeed');
    testSubId = activateRes.body.data.id || activateRes.body.data._id;
    testSubNumber = activateRes.body.data.subscriptionNumber;
  });

  after(async () => {
    await CaregiverSubscription.deleteMany({ patientPhone });
    await User.deleteMany({ phone: patientPhone });
    await disconnectDatabase();
  });

  // ---------------------------------------------------------------------------
  // 1. Authorization Guardrails
  // ---------------------------------------------------------------------------
  describe('1. Security & RBAC Enforcement', () => {
    it('should reject lifecycle actions when missing authentication token (401)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/suspend`)
        .send({ reason: 'Hospitalized' });
      assert.equal(res.status, 401);
    });

    it('should forbid standard patients from suspending a subscription (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/suspend`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Patient trying to suspend' });
      assert.equal(res.status, 403);
    });

    it('should forbid standard patients from resuming a subscription (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/resume`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Patient trying to resume' });
      assert.equal(res.status, 403);
    });

    it('should forbid standard patients from cancelling a subscription (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Patient trying to cancel' });
      assert.equal(res.status, 403);
    });

    it('should forbid standard patients from archiving a subscription (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/archive`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Patient trying to archive' });
      assert.equal(res.status, 403);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Suspend & Resume Lifecycle Actions
  // ---------------------------------------------------------------------------
  describe('2. Stop / Suspend & Resume Lifecycle Actions', () => {
    it('should reject suspension if reason is missing or whitespace only (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '  ' });
      assert.equal(res.status, 400);
      assert.match((res.body.message || res.body.error?.message), /reason is required/i);
    });

    it('should reject resuming an active (not suspended) subscription (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/resume`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Premature resume' });
      assert.equal(res.status, 400);
      assert.match((res.body.message || res.body.error?.message), /not currently suspended/i);
    });

    it('should successfully suspend an active subscription with reason and audit metadata', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Patient admitted to hospital for observation' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'suspended');

      // Verify DB record fields
      const doc = await CaregiverSubscription.findById(testSubId);
      assert.ok(doc);
      assert.equal(doc.status, 'suspended');
      assert.equal(doc.suspensionReason, 'Patient admitted to hospital for observation');
      assert.ok(doc.suspendedAt);
      assert.equal(doc.suspendedBy?.toString(), adminUserId);

      // Verify audit log creation
      const audit = await AuditLog.findOne({
        action: 'CAREGIVER_SUBSCRIPTION_SUSPENDED',
        targetId: testSubNumber,
      }).sort({ timestamp: -1 });
      assert.ok(audit, 'Audit log for suspension must be recorded');
      assert.equal(audit.details.newStatus, 'suspended');
      assert.equal(audit.details.reason, 'Patient admitted to hospital for observation');
    });

    it('should reject duplicate suspension request when already suspended (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Duplicate suspension call' });
      assert.equal(res.status, 400);
      assert.match((res.body.message || res.body.error?.message), /already suspended/i);
    });

    it('CRITICAL: should PREVENT recording visits while subscription is suspended (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/record-visit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Attempting to record visit while suspended' });

      assert.equal(res.status, 400);
      assert.match((res.body.message || res.body.error?.message), /currently suspended/i);

      // Verify visit balance did not decrement
      const doc = await CaregiverSubscription.findById(testSubId);
      assert.ok(doc);
      assert.equal(doc.visitsCompleted, 0);
    });

    it('should successfully resume a suspended subscription and restore active state', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/resume`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Patient discharged from hospital, home care restarted' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'active');

      const doc = await CaregiverSubscription.findById(testSubId);
      assert.ok(doc);
      assert.equal(doc.status, 'active');
      assert.equal(doc.resumeReason, 'Patient discharged from hospital, home care restarted');
      assert.ok(doc.resumedAt);

      // Verify audit log for resumption
      const audit = await AuditLog.findOne({
        action: 'CAREGIVER_SUBSCRIPTION_RESUMED',
        targetId: testSubNumber,
      }).sort({ timestamp: -1 });
      assert.ok(audit, 'Audit log for resumption must be recorded');
      assert.equal(audit.details.newStatus, 'active');
    });

    it('should ALLOW recording visits now that subscription is resumed', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/record-visit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Care visit successfully completed after resumption' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.visitsCompleted, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Cancel Subscription Lifecycle
  // ---------------------------------------------------------------------------
  describe('3. Cancellation & Integrity Preservation', () => {
    it('should reject cancellation without mandatory reason (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '' });
      assert.equal(res.status, 400);
      assert.match((res.body.message || res.body.error?.message), /reason is required/i);
    });

    it('should cancel subscription and preserve payment, visit history, and caregiver details', async () => {
      const beforeDoc = await CaregiverSubscription.findById(testSubId).lean();
      assert.ok(beforeDoc);

      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Patient relocated out of state' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'cancelled');

      const afterDoc = await CaregiverSubscription.findById(testSubId).lean();
      assert.ok(afterDoc);
      assert.equal(afterDoc.status, 'cancelled');
      assert.equal(afterDoc.cancellationReason, 'Patient relocated out of state');
      assert.ok(afterDoc.cancelledAt);

      // Verify clinical and payment integrity preserved untouched
      assert.equal(afterDoc.pricing.customerPrice, beforeDoc.pricing.customerPrice);
      assert.equal(afterDoc.pricing.paymentStatus, beforeDoc.pricing.paymentStatus);
      assert.equal(afterDoc.pricing.razorpayPaymentId, beforeDoc.pricing.razorpayPaymentId);
      assert.equal(afterDoc.visitsCompleted, beforeDoc.visitsCompleted);
      assert.equal(afterDoc.visitsRemaining, beforeDoc.visitsRemaining);
      assert.equal(afterDoc.assignedCaregiverName, beforeDoc.assignedCaregiverName);

      // Verify audit log creation
      const audit = await AuditLog.findOne({
        action: 'CAREGIVER_SUBSCRIPTION_CANCELLED',
        targetId: testSubNumber,
      }).sort({ timestamp: -1 });
      assert.ok(audit, 'Audit log for cancellation must be recorded');
      assert.equal(audit.details.newStatus, 'cancelled');
    });

    it('should reject cancelling an already cancelled subscription (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Cancelling again' });
      assert.equal(res.status, 400);
      assert.match((res.body.message || res.body.error?.message), /already cancelled/i);
    });

    it('CRITICAL: should PREVENT new visits after cancellation (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/record-visit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Visit after cancellation' });
      assert.equal(res.status, 400);
      assert.match((res.body.message || res.body.error?.message), /cancelled/i);
    });

    it('should PREVENT caregiver assignment after cancellation (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ caregiverUserId });
      assert.equal(res.status, 400);
      assert.match((res.body.message || res.body.error?.message), /cancelled/i);
    });

    it('should PREVENT suspending a cancelled subscription (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Trying to suspend cancelled sub' });
      assert.equal(res.status, 400);
      assert.match((res.body.message || res.body.error?.message), /cancelled/i);
    });

    it('should PREVENT resuming a cancelled subscription (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/resume`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Trying to resume cancelled sub' });
      assert.equal(res.status, 400);
      assert.match((res.body.message || res.body.error?.message), /not currently suspended/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Deletion Protection & Compliant Archive Workflow
  // ---------------------------------------------------------------------------
  describe('4. Deletion Protection & Compliant Archive Workflow', () => {
    it('CRITICAL: should FORBID hard deletion of subscription records (403)', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/caregiver-subscriptions/${testSubId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 403);
      assert.match((res.body.message || res.body.error?.message), /prohibited/i);
    });

    it('should REJECT archiving an active care subscription (retention guardrail: 400)', async () => {
      // Create a temporary second subscription in active status
      const activeSub = await CaregiverSubscription.create({
        subscriptionNumber: `SUB-TEST-${Date.now()}`,
        patientId: new mongoose.Types.ObjectId(patientUserId),
        patientName: 'Test Patient',
        patientPhone: '9877001199',
        planId: new mongoose.Types.ObjectId(planId),
        planTitle: 'Active Test Plan',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        totalVisitsIncluded: 10,
        visitsCompleted: 0,
        visitsRemaining: 10,
        pricing: { customerPrice: 10000, caregiverPayout: 7000, platformCommission: 3000, paymentStatus: 'paid' },
      });

      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${activeSub._id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Trying to archive active sub' });

      assert.equal(res.status, 400);
      assert.match((res.body.message || res.body.error?.message), /cannot archive an active or suspended subscription/i);

      await CaregiverSubscription.findByIdAndDelete(activeSub._id);
    });

    it('should successfully archive an eligible cancelled subscription with reason', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/caregiver-subscriptions/${testSubId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Quarterly administrative archival of discontinued care package' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.isArchived, true);

      const doc = await CaregiverSubscription.findById(testSubId);
      assert.ok(doc);
      assert.equal(doc.isArchived, true);
      assert.equal(doc.archiveReason, 'Quarterly administrative archival of discontinued care package');
      assert.ok(doc.archivedAt);

      // Verify audit log creation
      const audit = await AuditLog.findOne({
        action: 'CAREGIVER_SUBSCRIPTION_ARCHIVED',
        targetId: testSubNumber,
      });
      assert.ok(audit, 'Audit log for archival must be recorded');
    });

    it('should EXCLUDE archived subscriptions from default operational table listing', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions?search=${patientPhone}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 0, 'Archived subscription should not appear in default query');
    });

    it('should INCLUDE archived subscriptions when status=archived filter is requested', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/caregiver-subscriptions?status=archived&search=${patientPhone}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.some((s: any) => s.subscriptionNumber === testSubNumber));
    });

    it('should PERMANENTLY DELETE subscription from database when permanent confirmation is supplied', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/caregiver-subscriptions/${testSubId}?permanent=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permanent: true, reason: 'Administrative test cleanup of subscription' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.match(res.body.message, /permanently deleted/i);

      // Verify subscription is gone from MongoDB
      const doc = await CaregiverSubscription.findById(testSubId);
      assert.equal(doc, null, 'Subscription document must be permanently removed from MongoDB');

      // Verify audit trail logged the permanent deletion
      const audit = await AuditLog.findOne({
        action: 'CAREGIVER_SUBSCRIPTION_PERMANENTLY_DELETED',
        targetId: testSubNumber,
      });
      assert.ok(audit, 'Permanent deletion audit log must be recorded');
    });
  });
});

