import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { HealthcareService } from '../src/models/HealthcareService.js';
import { Booking } from '../src/models/Booking.js';
import { UploadedFile } from '../src/models/UploadedFile.js';

describe('VivoQuest Marketplace REST API Test Suite', () => {
  const app = createApp();
  let authToken: string;
  let testUserId: string;
  const testPhone = '9876500001';
  const testPassword = 'Password#2026';

  before(async () => {
    await connectDatabase();
    // Clean up test data if left over from previous runs
    await User.deleteMany({ phone: { $in: [testPhone, '9876500002'] } });
    await Booking.deleteMany({ phone: { $in: [testPhone, '9876500002'] } });
    await UploadedFile.deleteMany({ s3Key: { $regex: /9876500001/ } });
  });

  after(async () => {
    await User.deleteMany({ phone: { $in: [testPhone, '9876500002'] } });
    await Booking.deleteMany({ phone: { $in: [testPhone, '9876500002'] } });
    await disconnectDatabase();
  });

  // ---------------------------------------------------------------------------
  // 1. Health Check Endpoint
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/health', () => {
    it('should return 200 with service health, database, and storage status', async () => {
      const res = await request(app).get('/api/v1/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.service, 'vivoquest-marketplace-api');
      assert.ok(res.body.database);
      assert.ok(res.body.storage);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Healthcare Services Directory Endpoint
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/services', () => {
    it('should list active healthcare services and auto-seed if empty', async () => {
      const res = await request(app).get('/api/v1/services');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 6);

      const diagnostics = res.body.data.find((s: any) => s.serviceCode === 'home-diagnostics');
      assert.ok(diagnostics);
      assert.equal(diagnostics.title, 'Home Diagnostics & Phlebotomy');
    });

    it('should filter services by category', async () => {
      const res = await request(app).get('/api/v1/services?category=diagnostics');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.every((s: any) => s.category === 'diagnostics'));
    });

    it('should fetch single service by serviceCode', async () => {
      const res = await request(app).get('/api/v1/services/home-diagnostics');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.serviceCode, 'home-diagnostics');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Authentication & Registration Validation
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/auth/register', () => {
    it('should reject registration with invalid phone format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Test Patient',
          phone: '12345', // invalid: must be 10 digits starting with 6-9
          consentAccepted: true,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('should reject registration without DPDP consent', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Test Patient',
          phone: testPhone,
          consentAccepted: false,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('should successfully register a new patient user and return JWT token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Dr. Sunil Kulkarni',
          phone: testPhone,
          email: 'sunil.kulkarni@testvivoquest.in',
          password: testPassword,
          role: 'patient',
          city: 'Pune',
          pincode: '411001',
          consentAccepted: true,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.phone, testPhone);
      assert.equal(res.body.data.user.role, 'patient');

      authToken = res.body.data.token;
      testUserId = res.body.data.user.id;
    });

    it('should reject duplicate registration with same phone', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Duplicate User',
          phone: testPhone,
          consentAccepted: true,
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Login Endpoint
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/auth/login', () => {
    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testPhone,
          password: 'WrongPassword999',
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('should successfully login with valid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testPhone,
          password: testPassword,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.phone, testPhone);
    });

    it('should support prototype OTP verification flow', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testPhone,
          otp: '123456',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.authMode, 'OTP_DEVELOPMENT_PROTOTYPE');
      assert.ok(res.body.data.token);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. User Profile & Protected Endpoint Authorization
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/users/me', () => {
    it('should reject request without Bearer token with 401', async () => {
      const res = await request(app).get('/api/v1/users/me');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('should return user profile for authenticated request', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.id, testUserId);
      assert.equal(res.body.data.user.phone, testPhone);
      // Ensure password hash is NEVER exposed
      assert.equal(res.body.data.user.passwordHash, undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Booking Creation & Validation
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/bookings', () => {
    it('should reject booking with missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          patientName: '',
          phone: '',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('should create a valid booking and generate unique VQ number', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientName: 'Sunil Kulkarni',
          phone: testPhone,
          serviceId: 'home-diagnostics',
          city: 'Pune',
          pincode: '411001',
          preferredDate: '2026-10-25',
          clinicalNotes: 'Overnight fasting blood draw requested for lipid panel.',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.bookingNumber.startsWith('VQ-'));
      assert.equal(res.body.data.status, 'requested');
      assert.equal(res.body.data.service.title, 'Home Diagnostics & Phlebotomy');
    });

    it('should retrieve user bookings from GET /api/v1/bookings/me', async () => {
      const res = await request(app)
        .get('/api/v1/bookings/me')
        .set('Authorization', `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Secure Presigned Upload Authorization
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/uploads/presigned', () => {
    it('should reject upload intent without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/uploads/presigned')
        .send({
          filename: 'profile.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 1024 * 100,
          fileCategory: 'profile_picture',
        });

      assert.equal(res.status, 401);
    });

    it('should reject invalid MIME type for category', async () => {
      const res = await request(app)
        .post('/api/v1/uploads/presigned')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'document.txt',
          mimeType: 'text/plain', // Disallowed for profile picture
          fileSizeBytes: 1024 * 50,
          fileCategory: 'profile_picture',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('should reject file exceeding category size limit', async () => {
      const res = await request(app)
        .post('/api/v1/uploads/presigned')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'giant_image.png',
          mimeType: 'image/png',
          fileSizeBytes: 25 * 1024 * 1024, // 25MB exceeds 5MB limit
          fileCategory: 'profile_picture',
        });

      assert.equal(res.status, 400);
    });

    it('should authorize valid file upload and issue presigned PUT URL', async () => {
      const res = await request(app)
        .post('/api/v1/uploads/presigned')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'doctor_license.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 500 * 1024, // 500 KB
          fileCategory: 'credential_document',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.fileId);
      assert.ok(res.body.data.uploadUrl);
      assert.equal(res.body.data.method, 'PUT');
      assert.equal(res.body.data.accessTier, 'RESTRICTED_VERIFICATION_ONLY');

      // Verify that NO binary blob is stored in MongoDB, only metadata
      const fileRecord = await UploadedFile.findOne({ fileId: res.body.data.fileId });
      assert.ok(fileRecord);
      assert.equal(fileRecord.originalFilename, 'doctor_license.pdf');
      assert.equal(fileRecord.uploadStatus, 'pending_upload');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. AI Care Coordination & Dispatch Endpoints
  // ---------------------------------------------------------------------------
  describe('AI Care Coordination Gateway (/api/v1/ai)', () => {
    let adminToken: string;
    let createdBookingId: string;

    before(async () => {
      // Create admin user for clinical coordination
      const adminPhone = '9876500002';
      await User.deleteOne({ phone: adminPhone });
      const adminRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Dr. Pradeep Admin',
          phone: adminPhone,
          email: 'admin.pradeep@testvivoquest.in',
          password: 'AdminPassword#2026',
          role: 'admin',
          consentAccepted: true,
        });

      adminToken = adminRes.body.data.token;

      // Create a test booking to dispatch
      const bRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientName: 'Sunil Kulkarni',
          phone: testPhone,
          serviceId: 'home-diagnostics',
          city: 'Pune',
          pincode: '411001',
          clinicalNotes: 'Blood sample for lipid panel',
        });
      createdBookingId = bRes.body.data.id;
    });

    it('should reject unauthorized patient from previewing bundles with 403', async () => {
      const res = await request(app)
        .post('/api/v1/ai/bundles/preview')
        .set('Authorization', `Bearer ${authToken}`) // patient token
        .send({
          bookingIds: [createdBookingId],
        });

      assert.equal(res.status, 403);
    });

    it('should allow admin to preview service bundle', async () => {
      const res = await request(app)
        .post('/api/v1/ai/bundles/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bookingIds: [createdBookingId],
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data);
    });

    it('should find and rank eligible provider candidates for booking', async () => {
      const res = await request(app)
        .post('/api/v1/ai/matching/candidates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bookingId: createdBookingId,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.ranked_providers));
      assert.ok(res.body.data.ranked_providers.length > 0);
      assert.equal(res.body.data.requires_human_approval, true);
    });

    it('should retrieve dispatch review for booking', async () => {
      const res = await request(app)
        .get(`/api/v1/ai/dispatch/review/${createdBookingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.booking.id, createdBookingId);
      assert.ok(res.body.data.matchingRecommendations);
    });

    it('should confirm authorized human dispatch assignment', async () => {
      const res = await request(app)
        .post('/api/v1/ai/dispatch/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bookingId: createdBookingId,
          professionalUserId: testUserId,
          notes: 'Assigned to Dr. Sunil following verified council registration check.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'matched');
      assert.ok(res.body.data.assignedBy);

      // Verify in MongoDB
      const updated = await Booking.findById(createdBookingId);
      assert.equal(updated?.status, 'matched');
    });
  });
});
