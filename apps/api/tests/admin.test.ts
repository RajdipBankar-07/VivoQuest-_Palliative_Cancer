import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { ProfessionalCredentials } from '../src/models/ProfessionalCredentials.js';
import { HospitalProfile } from '../src/models/HospitalProfile.js';
import { HealthcareService } from '../src/models/HealthcareService.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { SupportTicket } from '../src/models/SupportTicket.js';
import { seedAdminDemoData } from '../src/services/adminService.js';

describe('Phase 7 — Admin and Super Admin Dashboards & Governance Test Suite', () => {
  const app = createApp();

  // Test accounts
  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9899009900'; // Operations Admin Lead

  let superAdminToken: string;
  let superAdminUserId: string;
  const superAdminPhone = '9899000001'; // Super Admin Director

  let patientToken: string;
  const patientPhone = '9877998811';

  let testCredentialId: string;
  let testHospitalId: string;
  let testServiceId: string;
  let testSupportTicketId: string;
  let createdHospitalId: string;

  before(async () => {
    await connectDatabase();

    // Clean up test-specific patient account
    await User.deleteMany({ phone: patientPhone });

    // Seed admin demo data, super admin, demo credentials, support tickets, and audit logs
    await seedAdminDemoData();

    // 1. Admin Login (Operations Admin Lead)
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

    // 2. Super Admin Login (Super Admin Director)
    const superLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: superAdminPhone,
        otp: '123456',
        role: 'super_admin',
      });
    assert.equal(superLoginRes.status, 200, 'Super Admin login should succeed');
    superAdminToken = superLoginRes.body.data.token;
    superAdminUserId = superLoginRes.body.data.user.id;

    // 3. Register Standard Patient User
    const regPatientRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Test Patient Suman',
        phone: patientPhone,
        role: 'patient',
        consentAccepted: true,
      });
    patientToken = regPatientRes.body.data.token;

    // Find sample credential, hospital, and service IDs for testing
    const cred = await ProfessionalCredentials.findOne({ verificationStatus: 'pending' });
    if (cred) testCredentialId = cred._id.toString();

    const hosp = await HospitalProfile.findOne();
    if (hosp) testHospitalId = hosp._id.toString();

    const svc = await HealthcareService.findOne();
    if (svc) testServiceId = svc._id.toString();

    const tkt = await SupportTicket.findOne();
    if (tkt) testSupportTicketId = tkt._id.toString();
  });

  after(async () => {
    await User.deleteMany({ phone: patientPhone });
    await disconnectDatabase();
  });

  describe('1. Admin Dashboard Overview & Access Control', () => {
    it('should allow authenticated Admin to access operational overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(typeof res.body.data.overview.totalUsers === 'number');
      assert.ok(typeof res.body.data.overview.totalBookings === 'number');
      assert.ok(typeof res.body.data.overview.totalReferrals === 'number');
      assert.ok(typeof res.body.data.overview.pendingCredentialsCount === 'number');
      assert.ok(Array.isArray(res.body.data.recentAuditLogs));
    });

    it('should allow Super Admin to access admin dashboard overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard/overview');
      assert.equal(res.status, 401);
    });

    it('should reject standard patient user with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/overview')
        .set('Authorization', `Bearer ${patientToken}`);

      assert.equal(res.status, 403);
    });
  });

  describe('2. User & Account Management', () => {
    it('should list platform accounts with search, role filters, and pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?role=patient')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.pagination);
      res.body.data.forEach((u: any) => {
        assert.ok(['patient', 'caregiver'].includes(u.role));
        assert.ok(!u.passwordHash, 'Password hash must never be exposed');
      });
    });

    it('should allow admin to suspend and reactivate a user account and record audit log', async () => {
      const patient = await User.findOne({ phone: patientPhone });
      assert.ok(patient);

      // Suspend
      const suspendRes = await request(app)
        .patch(`/api/v1/admin/users/${patient._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' });

      assert.equal(suspendRes.status, 200);
      assert.equal(suspendRes.body.data.status, 'suspended');

      // Reactivate
      const activateRes = await request(app)
        .patch(`/api/v1/admin/users/${patient._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });

      assert.equal(activateRes.status, 200);
      assert.equal(activateRes.body.data.status, 'active');

      // Verify audit log generated
      const audit = await AuditLog.findOne({
        action: 'user_status_changed',
        targetId: patient._id.toString(),
      });
      assert.ok(audit, 'Audit log entry must be created for user status change');
    });

    it('CRITICAL: should FORBID regular admin from modifying or suspending a Super Admin account (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${superAdminUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`) // Admin trying to suspend Super Admin!
        .send({ status: 'suspended' });

      assert.equal(res.status, 403, 'Regular admin cannot modify Super Admin');
    });
  });

  describe('3. Professional Credential Review Workflow', () => {
    it('should list professional credentials with verification statuses', async () => {
      const res = await request(app)
        .get('/api/v1/admin/credentials')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.count > 0);
    });

    it('should reject credential review without mandatory reason on rejection (400 Bad Request)', async () => {
      if (!testCredentialId) return;

      const res = await request(app)
        .patch(`/api/v1/admin/credentials/${testCredentialId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
          // Missing reason
        });

      assert.equal(res.status, 400);
      assert.ok(res.body.error.message.includes('valid reason is required'));
    });

    it('should successfully approve a credential and record audit log', async () => {
      if (!testCredentialId) return;

      const res = await request(app)
        .patch(`/api/v1/admin/credentials/${testCredentialId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          notes: 'Medical Council registration verified against online state registry.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.verificationStatus, 'approved');
      assert.equal(res.body.data.reviewNotes, 'Medical Council registration verified against online state registry.');

      // Check audit log
      const audit = await AuditLog.findOne({
        action: 'credential_reviewed',
        targetId: testCredentialId,
      });
      assert.ok(audit);
      assert.equal(audit.category, 'credential_review');
    });

    it('should allow marking a credential as expired', async () => {
      if (!testCredentialId) return;

      const res = await request(app)
        .patch(`/api/v1/admin/credentials/${testCredentialId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'expired',
          notes: 'Annual license lapsed. Renewal proof requested from provider.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.verificationStatus, 'expired');
    });
  });

  describe('4. Hospital Organization Onboarding & Management', () => {
    it('should list hospital organizations with referral metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/hospitals')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.count >= 2);
    });

    it('should onboard a new hospital partner organization and record audit log', async () => {
      const uniqueSuffix = Date.now().toString().slice(-4);
      const testPhone = `98220${Math.floor(10000 + Math.random() * 90000)}`;
      const newHospPayload = {
        hospitalName: `Deenanath Mangeshkar Hospital & Research Center ${uniqueSuffix}`,
        registrationNumber: `MH-PUN-DMH-${uniqueSuffix}`,
        tier: 'quaternary',
        cluster: 'Kothrud',
        address: 'Erandwane, Near Mhatre Bridge',
        pincode: '411004',
        contactPhone: testPhone,
        contactEmail: `discharge-${uniqueSuffix}@dmhospital.org`,
        accreditations: ['NABH', 'NABL'],
        departments: ['Oncology', 'Cardiology', 'Palliative Care', 'Neurology'],
        dischargeCoordinator: {
          name: 'Dr. Priya Ranade',
          phone: testPhone,
          email: `priya.ranade-${uniqueSuffix}@dmhospital.org`,
          designation: 'Head of Patient Continuity',
        },
      };

      const res = await request(app)
        .post('/api/v1/admin/hospitals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newHospPayload);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.hospitalName, newHospPayload.hospitalName);

      createdHospitalId = res.body.data.id || res.body.data._id;

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'hospital_onboarded',
        targetId: createdHospitalId,
      });
      assert.ok(audit);
    });

    it('should toggle hospital organization active/suspended status', async () => {
      const targetHospId = createdHospitalId || testHospitalId;
      if (!targetHospId) return;

      const res = await request(app)
        .patch(`/api/v1/admin/hospitals/${targetHospId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.isActive, false);

      // Re-activate
      const resActive = await request(app)
        .patch(`/api/v1/admin/hospitals/${targetHospId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      assert.equal(resActive.status, 200);
      assert.equal(resActive.body.data.isActive, true);
    });
  });

  describe('5. Service Availability & Operational Exceptions', () => {
    it('should list services and toggle service availability', async () => {
      if (!testServiceId) return;

      const toggleRes = await request(app)
        .patch(`/api/v1/admin/services/${testServiceId}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      assert.equal(toggleRes.status, 200);
      assert.equal(toggleRes.body.data.isActive, false);

      // Restore
      await request(app)
        .patch(`/api/v1/admin/services/${testServiceId}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });
    });

    it('should list operational booking and referral exceptions', async () => {
      const res = await request(app)
        .get('/api/v1/admin/exceptions')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.bookingExceptions !== undefined);
      assert.ok(res.body.data.referralExceptions !== undefined);
    });

    it('should list support requests and update status', async () => {
      if (!testSupportTicketId) return;

      const res = await request(app)
        .patch(`/api/v1/admin/support-tickets/${testSupportTicketId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'investigating',
          resolutionNotes: 'Operations coordinator investigating replacement unit.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'investigating');
    });

    it('should retrieve audit logs with category and severity filters', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.count > 0);
    });
  });

  describe('6. CRITICAL SUPER-ADMIN GOVERNANCE GUARDRAILS', () => {
    it('CRITICAL: should FORBID regular Admin from accessing Super-Admin governance overview (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/super/governance/overview')
        .set('Authorization', `Bearer ${adminToken}`); // Admin attempting super_admin route!

      assert.equal(res.status, 403, 'Admin must be forbidden from super-admin route');
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('super_admin'));
    });

    it('CRITICAL: should FORBID regular Admin from accessing Super-Admin admins list (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/super/admins')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 403);
    });

    it('CRITICAL: should FORBID regular Admin from creating privileged admin accounts (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/super/admins')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Unauthorized Admin Attempt',
          phone: '9899112233',
          role: 'admin',
        });

      assert.equal(res.status, 403);
    });

    it('should ALLOW Super Admin to access platform-wide governance overview (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/super/governance/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.governance.platformStatus, 'nominal_operational');
      assert.ok(typeof res.body.data.governance.totalAdmins === 'number');
      assert.ok(typeof res.body.data.governance.totalSuperAdmins === 'number');
    });

    it('should ALLOW Super Admin to list privileged administrative staff', async () => {
      const res = await request(app)
        .get('/api/v1/admin/super/admins')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.count >= 2);
    });

    it('should ALLOW Super Admin to create a new administrative account with audit record', async () => {
      const uniquePhone = `9899${Math.floor(100000 + Math.random() * 900000)}`;
      const res = await request(app)
        .post('/api/v1/admin/super/admins')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          fullName: 'Regional Clinical Admin Kothrud',
          phone: uniquePhone,
          email: `admin.${uniquePhone}@vivoquest.in`,
          role: 'admin',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.role, 'admin');

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'admin_account_created',
        targetId: res.body.data.id,
      });
      assert.ok(audit);
      assert.equal(audit.category, 'security_governance');
    });

    it('should ALLOW Super Admin to retrieve system health & integration telemetry', async () => {
      const res = await request(app)
        .get('/api/v1/admin/super/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.services.mongodb.status, 'connected_healthy');
      assert.ok(res.body.data.services.aiCoordinationGateway);
      assert.ok(res.body.data.services.objectStorage);
    });

    it('should ALLOW Super Admin to list escalated operational cases', async () => {
      const res = await request(app)
        .get('/api/v1/admin/super/escalations')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });
  });
});
