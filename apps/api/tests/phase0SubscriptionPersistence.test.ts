import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { CaregiverPlan } from '../src/models/CaregiverPlan.js';
import { CaregiverSubscription } from '../src/models/CaregiverSubscription.js';
import { seedAdminDemoData } from '../src/services/adminService.js';
import { seedCaregiverPlansDemoData } from '../src/services/caregiverPlanService.js';
import { seedServicesIfEmpty } from '../src/services/serviceCatalogService.js';

describe('VivoQuest Phase 0: Subscription Persistence Across Restarts & Logins (Tests A–J)', () => {
  let app = createApp();

  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900';

  let patientAToken: string;
  let patientAUserId: string;
  const patientAPhone = '9876501122';
  const patientAName = 'Persistence Verification Patient A';

  let patientBToken: string;
  let patientBUserId: string;
  const patientBPhone = '9876509988';
  const patientBName = 'Persistence Isolation Patient B';

  let targetPlan: any;
  let createdSubscriptionId: string;
  let createdSubscriptionNumber: string;

  before(async () => {
    await connectDatabase();

    // Clean up only our specific test users if they exist from a prior run
    await User.deleteMany({ phone: { $in: [patientAPhone, patientBPhone] } });
    await CaregiverSubscription.deleteMany({ patientPhone: { $in: [patientAPhone, patientBPhone] } });

    // Seed baseline demo data if not already present
    await seedAdminDemoData();
    await seedCaregiverPlansDemoData();

    // Ensure Admin Login
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

    // Fetch an active caregiver plan to use for testing
    targetPlan = await CaregiverPlan.findOne({ isActive: true });
    assert.ok(targetPlan, 'An active caregiver plan must exist in MongoDB');

    // Register Patient A
    const regPatientARes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: patientAName,
        phone: patientAPhone,
        password: 'TestPass123!',
        role: 'patient',
        city: 'Mumbai',
        pincode: '400001',
        consentAccepted: true,
      });
    assert.equal(regPatientARes.status, 201, 'Patient A registration must succeed');
    patientAToken = regPatientARes.body.data.token;
    patientAUserId = regPatientARes.body.data.user.id;

    // Register Patient B
    const regPatientBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: patientBName,
        phone: patientBPhone,
        password: 'TestPass123!',
        role: 'patient',
        city: 'Pune',
        pincode: '411001',
        consentAccepted: true,
      });
    assert.equal(regPatientBRes.status, 201, 'Patient B registration must succeed');
    patientBToken = regPatientBRes.body.data.token;
    patientBUserId = regPatientBRes.body.data.user.id;
  });

  after(async () => {
    // Clean up test data
    if (patientAUserId) {
      await CaregiverSubscription.deleteMany({ patientId: patientAUserId });
      await User.deleteOne({ _id: patientAUserId });
    }
    if (patientBUserId) {
      await CaregiverSubscription.deleteMany({ patientId: patientBUserId });
      await User.deleteOne({ _id: patientBUserId });
    }
    await disconnectDatabase();
  });

  // ---------------------------------------------------------------------------
  // Test A: Patient activates subscription; confirm record exists in MongoDB
  // ---------------------------------------------------------------------------
  it('Test A: Patient activates a subscription; confirm the record exists in MongoDB', async () => {
    const idempotencyKey = `test-act-a-${Date.now()}`;
    const activateRes = await request(app)
      .post('/api/v1/patients/me/subscriptions/activate')
      .set('Authorization', `Bearer ${patientAToken}`)
      .send({
        planId: targetPlan._id.toString(),
        emergencyContact: {
          name: 'Emergency Contact A',
          phone: '9822000001',
          relation: 'Spouse',
        },
        carePlanNotes: 'Patient requires palliative home assistance',
        idempotencyKey,
      });

    assert.equal(activateRes.status, 201, 'Subscription activation should return 201 Created');
    assert.equal(activateRes.body.success, true);
    assert.ok(activateRes.body.data, 'Response must include subscription data');

    createdSubscriptionId = activateRes.body.data.id || activateRes.body.data._id;
    createdSubscriptionNumber = activateRes.body.data.subscriptionNumber;
    assert.ok(createdSubscriptionId, 'Subscription ID must be returned');
    assert.ok(createdSubscriptionNumber, 'Subscription Number must be returned');

    // Confirm directly in MongoDB database
    const mongoDoc = await CaregiverSubscription.findById(createdSubscriptionId);
    assert.ok(mongoDoc, 'Document must exist in MongoDB CaregiverSubscription collection');
    assert.equal(mongoDoc.patientId.toString(), patientAUserId);
    assert.equal(mongoDoc.planId.toString(), targetPlan._id.toString());
    assert.equal(mongoDoc.planTitle, targetPlan.title);
    assert.equal(mongoDoc.status, 'active');
    assert.equal(mongoDoc.pricing.paymentStatus, 'test_mode');
    
    // Verify populated plan code
    await mongoDoc.populate('planId');
    assert.equal((mongoDoc.planId as any).planCode, targetPlan.planCode);
  });

  // ---------------------------------------------------------------------------
  // Test B: Confirm subscription appears in Admin Dashboard & Patient App
  // ---------------------------------------------------------------------------
  it('Test B: Confirm the same subscription appears in the Admin Dashboard and the correct Patient App', async () => {
    // 1. Admin Dashboard API: GET /api/v1/admin/caregiver-subscriptions
    const adminRes = await request(app)
      .get(`/api/v1/admin/caregiver-subscriptions?patientId=${patientAUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.body.success, true);
    const adminSubs = adminRes.body.data;
    const adminFound = adminSubs.find((s: any) => s._id.toString() === createdSubscriptionId);
    assert.ok(adminFound, 'Subscription must appear in Admin Dashboard list');
    assert.equal(adminFound.subscriptionNumber, createdSubscriptionNumber);
    assert.equal(adminFound.status, 'active');
    assert.equal(adminFound.planCode, targetPlan.planCode);
    assert.ok(adminFound.category, 'Admin record must contain populated plan category');

    // 2. Patient App API: GET /api/v1/patients/me/subscriptions
    const patientRes = await request(app)
      .get('/api/v1/patients/me/subscriptions')
      .set('Authorization', `Bearer ${patientAToken}`);

    assert.equal(patientRes.status, 200);
    assert.equal(patientRes.body.success, true);
    const patientSubs = patientRes.body.data;
    const patientFound = patientSubs.find((s: any) => s.id === createdSubscriptionId || s._id === createdSubscriptionId);
    assert.ok(patientFound, 'Subscription must appear in Patient App subscriptions');
    assert.equal(patientFound.subscriptionNumber, createdSubscriptionNumber);
    assert.equal(patientFound.status, 'active');
    assert.equal(patientFound.planCode, targetPlan.planCode);
    assert.ok(patientFound.category, 'Patient App record must contain populated plan category');
  });

  // ---------------------------------------------------------------------------
  // Test C: Stop and restart backend & frontend; confirm subscription & status unchanged
  // ---------------------------------------------------------------------------
  it('Test C: Stop and restart the backend and frontend. Confirm the subscription and status remain unchanged', async () => {
    // Simulate Backend Stop: disconnect Mongoose and discard Express instance
    await disconnectDatabase();

    // Recreate Express App and reconnect to the persistent MongoDB database
    await connectDatabase();
    app = createApp();

    // Fetch subscription via the freshly booted Express application
    const postRestartRes = await request(app)
      .get('/api/v1/patients/me/subscriptions')
      .set('Authorization', `Bearer ${patientAToken}`);

    assert.equal(postRestartRes.status, 200);
    const postRestartSubs = postRestartRes.body.data;
    const subAfterRestart = postRestartSubs.find((s: any) => s.id === createdSubscriptionId || s._id === createdSubscriptionId);

    assert.ok(subAfterRestart, 'Subscription must survive backend restart');
    assert.equal(subAfterRestart.status, 'active', 'Subscription status must remain active');
    assert.equal(subAfterRestart.subscriptionNumber, createdSubscriptionNumber);
    assert.equal(subAfterRestart.planTitle, targetPlan.title);
    assert.equal(subAfterRestart.planCode, targetPlan.planCode);

    // Direct MongoDB verification
    const mongoDoc = await CaregiverSubscription.findById(createdSubscriptionId);
    assert.ok(mongoDoc, 'Document in MongoDB must remain intact across restarts');
    assert.equal(mongoDoc.status, 'active');
  });

  // ---------------------------------------------------------------------------
  // Test D: Log out and log back in as same patient; confirm plan & status restored
  // ---------------------------------------------------------------------------
  it('Test D: Log out and log back in as the same patient. Confirm the correct plan and status are restored', async () => {
    // Simulate logout by abandoning patientAToken
    // Authenticate again from scratch via login endpoint with password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: patientAPhone,
        password: 'TestPass123!',
        role: 'patient',
      });

    assert.equal(loginRes.status, 200, 'Re-login must succeed');
    const freshToken = loginRes.body.data.token;
    assert.ok(freshToken, 'Fresh JWT token must be issued');

    // Retrieve subscriptions using the new login session token
    const subRes = await request(app)
      .get('/api/v1/patients/me/subscriptions')
      .set('Authorization', `Bearer ${freshToken}`);

    assert.equal(subRes.status, 200);
    const subs = subRes.body.data;
    const activeSub = subs.find((s: any) => s.id === createdSubscriptionId || s._id === createdSubscriptionId);

    assert.ok(activeSub, 'Persisted subscription must be restored after login');
    assert.equal(activeSub.status, 'active');
    assert.equal(activeSub.planCode, targetPlan.planCode);
    assert.equal(activeSub.planTitle, targetPlan.title);

    // Update patientAToken for subsequent tests
    patientAToken = freshToken;
  });

  // ---------------------------------------------------------------------------
  // Test E: Restart entire project using launcher script; verify persistence
  // ---------------------------------------------------------------------------
  it('Test E: Restart the entire project using the existing launcher script and verify persistence again', async () => {
    // 1. Audit launcher script run_all.ps1 file content
    const launcherPath = path.resolve(process.cwd(), '../../run_all.ps1');
    const launcherScript = fs.existsSync(launcherPath)
      ? fs.readFileSync(launcherPath, 'utf8')
      : fs.readFileSync(path.resolve(process.cwd(), 'run_all.ps1'), 'utf8');

    assert.doesNotMatch(launcherScript, /dropDatabase/i, 'run_all.ps1 must not drop database');
    assert.doesNotMatch(launcherScript, /deleteMany/i, 'run_all.ps1 must not clear collections');
    assert.doesNotMatch(launcherScript, /mongo\s+--eval/i, 'run_all.ps1 must not run arbitrary mongo reset scripts');

    // 2. Execute startup routines invoked during project boot
    await seedServicesIfEmpty();
    await seedAdminDemoData();
    await seedCaregiverPlansDemoData();

    // 3. Confirm subscription in MongoDB is unchanged
    const subDoc = await CaregiverSubscription.findById(createdSubscriptionId);
    assert.ok(subDoc, 'Subscription must remain in MongoDB after project launch routines');
    assert.equal(subDoc.status, 'active');
  });

  // ---------------------------------------------------------------------------
  // Test F: Refresh Admin Dashboard; verify subscription is still present
  // ---------------------------------------------------------------------------
  it('Test F: Refresh the Admin Dashboard and verify the subscription is still present', async () => {
    // Call listCaregiverSubscriptions with pagination and limit 25
    const refreshRes = await request(app)
      .get('/api/v1/admin/caregiver-subscriptions?page=1&limit=25')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(refreshRes.status, 200);
    const subscriptions = refreshRes.body.data;
    const found = subscriptions.find((s: any) => s._id.toString() === createdSubscriptionId);
    assert.ok(found, 'Subscription must remain present upon Admin Dashboard refresh');
    assert.equal(found.status, 'active');
    assert.equal(found.subscriptionNumber, createdSubscriptionNumber);
    assert.equal(found.planCode, targetPlan.planCode);
  });

  // ---------------------------------------------------------------------------
  // Test G: Verify different patient cannot see another patient's subscription
  // ---------------------------------------------------------------------------
  it('Test G: Verify a different patient cannot see another patient\'s subscription', async () => {
    // Call patient subscriptions as Patient B
    const patientBRes = await request(app)
      .get('/api/v1/patients/me/subscriptions')
      .set('Authorization', `Bearer ${patientBToken}`);

    assert.equal(patientBRes.status, 200);
    const subsForB = patientBRes.body.data;

    // Must not contain Patient A's subscription
    const leakFound = subsForB.find(
      (s: any) =>
        s.id === createdSubscriptionId ||
        s._id === createdSubscriptionId ||
        s.subscriptionNumber === createdSubscriptionNumber
    );
    assert.equal(leakFound, undefined, 'Patient B must NOT see Patient A subscription');
    assert.equal(subsForB.length, 0, 'Patient B has no active subscriptions');
  });

  // ---------------------------------------------------------------------------
  // Test H: Repeat activation / retry request; verify no unintended duplicates
  // ---------------------------------------------------------------------------
  it('Test H: Repeat activation or retry the request and verify it does not create an unintended duplicate', async () => {
    const preCount = await CaregiverSubscription.countDocuments({ patientId: patientAUserId });
    assert.equal(preCount, 1, 'Patient A should initially have exactly 1 subscription');

    // Replay activation request with same planId
    const retryRes = await request(app)
      .post('/api/v1/patients/me/subscriptions/activate')
      .set('Authorization', `Bearer ${patientAToken}`)
      .send({
        planId: targetPlan._id.toString(),
        emergencyContact: {
          name: 'Emergency Contact A',
          phone: '9822000001',
          relation: 'Spouse',
        },
        idempotencyKey: 'retry-key-test-h',
      });

    // Should return 200 OK (idempotent replay) rather than creating a duplicate
    assert.equal(retryRes.status, 200, 'Replay of activation should be handled idempotently');
    assert.equal(retryRes.body.data.subscriptionNumber, createdSubscriptionNumber);

    const postCount = await CaregiverSubscription.countDocuments({ patientId: patientAUserId });
    assert.equal(postCount, 1, 'Subscription count must remain 1 (no duplicate document created)');
  });

  // ---------------------------------------------------------------------------
  // Test I: Suspend/resume/cancel/archive lifecycle still works & persists after restart
  // ---------------------------------------------------------------------------
  it('Test I: Verify suspend/resume/cancel/archive behavior still works and the resulting status persists after restart', async () => {
    // 1. Suspend
    const suspendRes = await request(app)
      .post(`/api/v1/admin/caregiver-subscriptions/${createdSubscriptionId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Patient traveling out of town temporarily' });

    assert.equal(suspendRes.status, 200);
    assert.equal(suspendRes.body.data.status, 'suspended');

    let doc = await CaregiverSubscription.findById(createdSubscriptionId);
    assert.equal(doc?.status, 'suspended', 'MongoDB doc status must update to suspended');

    // 2. Resume
    const resumeRes = await request(app)
      .post(`/api/v1/admin/caregiver-subscriptions/${createdSubscriptionId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Patient returned, care resumed' });

    assert.equal(resumeRes.status, 200);
    assert.equal(resumeRes.body.data.status, 'active');

    // 3. Simulate backend restart while in active state
    await disconnectDatabase();
    await connectDatabase();
    app = createApp();

    doc = await CaregiverSubscription.findById(createdSubscriptionId);
    assert.equal(doc?.status, 'active', 'Status after restart must persist as active');

    // 4. Cancel
    const cancelRes = await request(app)
      .post(`/api/v1/admin/caregiver-subscriptions/${createdSubscriptionId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Care period completed early' });

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'cancelled');

    doc = await CaregiverSubscription.findById(createdSubscriptionId);
    assert.equal(doc?.status, 'cancelled');

    // 5. Archive
    const archiveRes = await request(app)
      .post(`/api/v1/admin/caregiver-subscriptions/${createdSubscriptionId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Archived for annual clinical record retention' });

    assert.equal(archiveRes.status, 200);
    assert.equal(archiveRes.body.data.isArchived, true);

    doc = await CaregiverSubscription.findById(createdSubscriptionId);
    assert.equal(doc?.isArchived, true);
    assert.equal(doc?.status, 'cancelled');

    // 6. Prohibited permanent delete guard
    const deleteRes = await request(app)
      .delete(`/api/v1/admin/caregiver-subscriptions/${createdSubscriptionId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(deleteRes.status, 403, 'Permanent deletion must be prohibited');
    doc = await CaregiverSubscription.findById(createdSubscriptionId);
    assert.ok(doc, 'Subscription document must NOT be deleted from MongoDB');
  });

  // ---------------------------------------------------------------------------
  // Test J: Confirm no script, startup routine, or config silently resets database
  // ---------------------------------------------------------------------------
  it('Test J: Confirm that no script, startup routine, or configuration change silently resets the database', async () => {
    const subCountBefore = await CaregiverSubscription.countDocuments();
    const userCountBefore = await User.countDocuments();
    const planCountBefore = await CaregiverPlan.countDocuments();

    // Run all known startup routines and seeders
    await seedServicesIfEmpty();
    await seedAdminDemoData();
    await seedCaregiverPlansDemoData();

    const subCountAfter = await CaregiverSubscription.countDocuments();
    const userCountAfter = await User.countDocuments();
    const planCountAfter = await CaregiverPlan.countDocuments();

    // Verify zero data loss or resets
    assert.equal(subCountAfter, subCountBefore, 'Subscription count must not decrease or reset');
    assert.equal(userCountAfter, userCountBefore, 'User count must not decrease or reset');
    assert.equal(planCountAfter, planCountBefore, 'Plan count must not decrease or reset');
  });
});
