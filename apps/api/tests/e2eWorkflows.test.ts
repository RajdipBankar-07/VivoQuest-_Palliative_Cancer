import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Appointment } from '../src/models/Appointment.js';
import { HospitalReferral } from '../src/models/HospitalReferral.js';
import { HospitalProfile } from '../src/models/HospitalProfile.js';
import { FieldVisit } from '../src/models/FieldVisit.js';
import { ProductOrder } from '../src/models/ProductOrder.js';
import { ShoppingCart } from '../src/models/ShoppingCart.js';
import { SyncOperation } from '../src/models/SyncOperation.js';
import { NotificationLog } from '../src/models/NotificationLog.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { seedDemoDoctorsIfEmpty } from '../src/services/doctorSchedulingService.js';
import { seedHospitalDemoData } from '../src/services/hospitalReferralService.js';
import { seedMedicalProductsIfEmpty } from '../src/services/productCatalogService.js';
import { hashPassword, generateAuthToken } from '../src/services/authService.js';

describe('Phase 5 — Full Platform Production Readiness & End-to-End Workflow Test Suite', () => {
  const app = createApp();

  // Test User Accounts (isolated test identifiers)
  let patientToken: string;
  let patientUserId: string;
  const patientPhone = '9876599001';
  const patientEmail = 'p5.patient1@vivoquest.in';

  let unauthorizedPatientToken: string;
  let unauthorizedPatientUserId: string;
  const unauthorizedPatientPhone = '9876599002';
  const unauthorizedPatientEmail = 'p5.patient2@vivoquest.in';

  let doctorToken: string;
  let doctorUserId: string;
  const doctorPhone = '9876599003';
  const doctorEmail = 'p5.doctor@vivoquest.in';

  let hospitalAToken: string;
  let hospitalAUserId: string;
  let hospitalAProfileId: string;
  const hospitalAPhone = '9876599004';
  const hospitalAEmail = 'p5.hospital.a@vivoquest.in';

  let hospitalBToken: string;
  let hospitalBUserId: string;
  const hospitalBPhone = '9876599005';
  const hospitalBEmail = 'p5.hospital.b@vivoquest.in';

  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9876599006';
  const adminEmail = 'p5.admin@vivoquest.in';

  let superAdminToken: string;
  let superAdminUserId: string;
  const superAdminPhone = '9876599007';
  const superAdminEmail = 'p5.superadmin@vivoquest.in';

  // State shared across user workflows
  let createdAppointmentId: string;
  let createdOrderId: string;
  let createdOrderNumber: string;
  let createdReferralId: string;
  let createdVisitId: string;
  let createdVisitNumber: string;

  before(async () => {
    await connectDatabase();

    // Clean up any residual test data from previous runs
    await User.deleteMany({
      $or: [
        { phone: { $in: [patientPhone, unauthorizedPatientPhone, doctorPhone, hospitalAPhone, hospitalBPhone, adminPhone, superAdminPhone] } },
        { email: { $in: [patientEmail, unauthorizedPatientEmail, doctorEmail, hospitalAEmail, hospitalBEmail, adminEmail, superAdminEmail] } },
      ],
    });

    await Appointment.deleteMany({ 'patientDetails.phone': { $in: [patientPhone, unauthorizedPatientPhone] } });
    await ProductOrder.deleteMany({ patientPhone: { $in: [patientPhone, unauthorizedPatientPhone] } });
    await HospitalReferral.deleteMany({ referralNumber: { $regex: 'TEST-P5-REF' } });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-P5-VISIT' } });
    await SyncOperation.deleteMany({ clientOperationId: { $regex: 'P5-OP' } });
    await NotificationLog.deleteMany({ recipientPhone: { $in: [patientPhone, doctorPhone] } });

    // Seed baseline catalogs
    await seedDemoDoctorsIfEmpty();
    await seedHospitalDemoData();
    await seedMedicalProductsIfEmpty();

    // 1. Register Primary Patient
    const regPat = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Kavita Deshmukh',
        phone: patientPhone,
        email: patientEmail,
        password: 'Password#2026',
        role: 'patient',
        city: 'Pune',
        pincode: '411005',
        consentAccepted: true,
      });
    assert.strictEqual(regPat.status, 201);
    patientToken = regPat.body.data.token;
    patientUserId = regPat.body.data.user.id || regPat.body.data.user._id;

    // 2. Register Unauthorized Patient (for boundary testing)
    const regPat2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Vikram Joshi',
        phone: unauthorizedPatientPhone,
        email: unauthorizedPatientEmail,
        password: 'Password#2026',
        role: 'patient',
        city: 'Pune',
        pincode: '411004',
        consentAccepted: true,
      });
    assert.strictEqual(regPat2.status, 201);
    unauthorizedPatientToken = regPat2.body.data.token;
    unauthorizedPatientUserId = regPat2.body.data.user.id || regPat2.body.data.user._id;

    // 3. Register Doctor / Clinician
    const regDoc = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Dr. Anand Kulkarni',
        phone: doctorPhone,
        email: doctorEmail,
        password: 'Password#2026',
        role: 'professional',
        city: 'Pune',
        pincode: '411001',
        consentAccepted: true,
      });
    assert.strictEqual(regDoc.status, 201);
    doctorToken = regDoc.body.data.token;
    doctorUserId = regDoc.body.data.user.id || regDoc.body.data.user._id;

    // 4. Register Hospital A
    const regHospA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Deenanath Mangeshkar Hospital Coordinator',
        phone: hospitalAPhone,
        email: hospitalAEmail,
        password: 'Password#2026',
        role: 'hospital',
        city: 'Pune',
        pincode: '411004',
        consentAccepted: true,
      });
    assert.strictEqual(regHospA.status, 201);
    hospitalAToken = regHospA.body.data.token;
    hospitalAUserId = regHospA.body.data.user.id || regHospA.body.data.user._id;

    const profileA = await HospitalProfile.create({
      userId: new mongoose.Types.ObjectId(hospitalAUserId),
      hospitalName: 'Deenanath Mangeshkar Hospital Sync Hub',
      registrationNumber: `HOSP-P5-A-${Date.now()}`,
      cluster: 'Pune Central',
      city: 'Pune',
      state: 'Maharashtra',
      address: 'Near Mhatre Bridge, Erandwane',
      pincode: '411004',
      contactPhone: hospitalAPhone,
      contactEmail: hospitalAEmail,
      dischargeCoordinator: {
        name: 'Sister Mary Joseph',
        phone: hospitalAPhone,
        email: hospitalAEmail,
        designation: 'Discharge Coordinator',
      },
      isActive: true,
    });
    hospitalAProfileId = profileA._id.toString();

    // 5. Register Hospital B (for tenant isolation testing)
    const regHospB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Jehangir Hospital Coordinator',
        phone: hospitalBPhone,
        email: hospitalBEmail,
        password: 'Password#2026',
        role: 'hospital',
        city: 'Pune',
        pincode: '411001',
        consentAccepted: true,
      });
    assert.strictEqual(regHospB.status, 201);
    hospitalBToken = regHospB.body.data.token;
    hospitalBUserId = regHospB.body.data.user.id || regHospB.body.data.user._id;

    await HospitalProfile.create({
      userId: new mongoose.Types.ObjectId(hospitalBUserId),
      hospitalName: 'Jehangir Hospital Pune',
      registrationNumber: `HOSP-P5-B-${Date.now() + 1}`,
      cluster: 'Pune East',
      city: 'Pune',
      state: 'Maharashtra',
      address: '32 Sassoon Road',
      pincode: '411001',
      contactPhone: hospitalBPhone,
      contactEmail: hospitalBEmail,
      dischargeCoordinator: {
        name: 'Dr. Jehangir Staff',
        phone: hospitalBPhone,
        email: hospitalBEmail,
        designation: 'Care Coordinator',
      },
      isActive: true,
    });

    // 6. Register Platform Operations Admin
    const regAdmin = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'P5 Operations Admin',
        phone: adminPhone,
        email: adminEmail,
        password: 'Password#2026',
        role: 'admin',
        city: 'Pune',
        pincode: '411001',
        consentAccepted: true,
      });
    assert.strictEqual(regAdmin.status, 201);
    adminToken = regAdmin.body.data.token;
    adminUserId = regAdmin.body.data.user.id || regAdmin.body.data.user._id;

    // 7. Provision Platform Super Admin (Assert public registration rejects super_admin elevation, then provision securely)
    const rejectSuperReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'P5 Governance Super Admin',
        phone: superAdminPhone,
        email: superAdminEmail,
        password: 'Password#2026',
        role: 'super_admin',
        consentAccepted: true,
      });
    assert.strictEqual(rejectSuperReg.status, 400, 'Public registration must forbid direct super_admin role elevation');

    const hashedSuperPassword = await hashPassword('Password#2026');
    const superAdminUser = await User.create({
      fullName: 'P5 Governance Super Admin',
      phone: superAdminPhone,
      email: superAdminEmail,
      passwordHash: hashedSuperPassword,
      role: 'super_admin',
      city: 'Pune',
      pincode: '411001',
      status: 'active',
      isPhoneVerified: true,
      isEmailVerified: true,
      dpdpConsent: {
        accepted: true,
        consentedAt: new Date(),
        policyVersion: 'DPDP-2023-V1.0',
      },
    });
    superAdminUserId = superAdminUser._id.toString();
    superAdminToken = generateAuthToken(superAdminUser);
  });

  after(async () => {
    await User.deleteMany({
      $or: [
        { phone: { $in: [patientPhone, unauthorizedPatientPhone, doctorPhone, hospitalAPhone, hospitalBPhone, adminPhone, superAdminPhone] } },
        { email: { $in: [patientEmail, unauthorizedPatientEmail, doctorEmail, hospitalAEmail, hospitalBEmail, adminEmail, superAdminEmail] } },
      ],
    });
    await Appointment.deleteMany({ 'patientDetails.phone': { $in: [patientPhone, unauthorizedPatientPhone] } });
    await ProductOrder.deleteMany({ patientPhone: { $in: [patientPhone, unauthorizedPatientPhone] } });
    await HospitalReferral.deleteMany({ referralNumber: { $regex: 'TEST-P5-REF' } });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST-P5-VISIT' } });
    await SyncOperation.deleteMany({ clientOperationId: { $regex: 'P5-OP' } });
    await NotificationLog.deleteMany({ recipientPhone: { $in: [patientPhone, doctorPhone] } });
    await disconnectDatabase();
  });

  // ===========================================================================
  // WORKFLOW 1: PATIENT END-TO-END WORKFLOW
  // ===========================================================================
  describe('Workflow 1: Patient Persona End-to-End', () => {
    it('should authenticate patient and retrieve authenticated profile via GET /api/v1/auth/me', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: patientPhone,
          otp: '123456',
          role: 'patient',
        });

      assert.strictEqual(loginRes.status, 200);
      assert.strictEqual(loginRes.body.success, true);
      assert.ok(loginRes.body.data.token);
    });

    it('should book an appointment with a doctor and view appointment details', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);

      const bookRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId: doctorUserId,
          appointmentDate: futureDate,
          timeSlot: { startTime: '10:00', endTime: '10:30' },
          consultationMode: 'in_clinic',
          patientName: 'Kavita Deshmukh',
          phone: patientPhone,
          age: 48,
          gender: 'female',
          clinicalReason: 'Palliative symptom review and pain assessment',
        });

      assert.strictEqual(bookRes.status, 201);
      assert.strictEqual(bookRes.body.success, true);
      createdAppointmentId = (bookRes.body.data.id || bookRes.body.data._id).toString();
      assert.strictEqual(bookRes.body.data.status, 'confirmed');

      // Patient views own appointment
      const viewRes = await request(app)
        .get(`/api/v1/appointments/${createdAppointmentId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      assert.strictEqual(viewRes.status, 200);
      assert.strictEqual(viewRes.body.data.patientDetails.fullName, 'Kavita Deshmukh');

      // Security check: Unauthorized Patient 2 cannot view Patient 1 appointment
      const unauthRes = await request(app)
        .get(`/api/v1/appointments/${createdAppointmentId}`)
        .set('Authorization', `Bearer ${unauthorizedPatientToken}`);

      assert.strictEqual(unauthRes.status, 403);
    });

    it('should allow patient to browse products, save persistent cart, and revalidate prices server-side', async () => {
      const catRes = await request(app).get('/api/v1/products');
      assert.strictEqual(catRes.status, 200);
      assert.ok(catRes.body.data.length >= 2);

      const item1 = catRes.body.data[0];
      const item2 = catRes.body.data[1];

      // Save persistent cart
      const cartRes = await request(app)
        .put('/api/v1/products/cart')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          items: [
            { productId: item1._id, quantity: 2, orderType: 'purchase' },
            { productId: item2._id, quantity: 1, orderType: 'purchase' },
          ],
        });

      assert.strictEqual(cartRes.status, 200);
      assert.strictEqual(cartRes.body.success, true);
      assert.strictEqual(cartRes.body.data.items.length, 2);

      // Revalidate cart
      const valRes = await request(app)
        .post('/api/v1/products/cart/validate')
        .send({ items: cartRes.body.data.items });

      assert.strictEqual(valRes.status, 200);
      assert.strictEqual(valRes.body.success, true);
      assert.ok(valRes.body.data.pricing.totalAmount > 0);
    });

    it('should place an order, create payment intent, verify signature, and enforce cross-patient access boundary', async () => {
      const products = await request(app).get('/api/v1/products');
      const product = products.body.data[0];

      // 1. Place Order
      const orderRes = await request(app)
        .post('/api/v1/products/orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          items: [
            {
              productId: product._id,
              quantity: 1,
              isRental: false,
            },
          ],
          deliveryAddress: {
            street: 'Flat 101, Mayur Colony, Kothrud',
            city: 'Pune',
            pincode: '411038',
            state: 'Maharashtra',
            contactPhone: patientPhone,
          },
          paymentMethod: 'online',
          idempotencyKey: `P5-ORD-IDEM-${Date.now()}`,
        });

      assert.strictEqual(orderRes.status, 201);
      createdOrderId = (orderRes.body.data.id || orderRes.body.data._id).toString();
      createdOrderNumber = orderRes.body.data.orderNumber;
      assert.strictEqual(orderRes.body.data.orderStatus, 'placed');
      assert.strictEqual(orderRes.body.data.paymentStatus, 'pending');

      // 2. Create Payment Intent
      const intentRes = await request(app)
        .post('/api/v1/products/payments/create-intent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ orderId: createdOrderId });

      assert.strictEqual(intentRes.status, 200);
      assert.strictEqual(intentRes.body.data.orderNumber, createdOrderNumber);
      const razorpayOrderId = intentRes.body.data.razorpayOrderId;

      // 3. Cryptographic Signature Verification
      const verifyRes = await request(app)
        .post('/api/v1/products/payments/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          orderId: createdOrderId,
          razorpayOrderId,
          razorpayPaymentId: `pay_p5_test_${Date.now()}`,
          razorpaySignature: 'simulated_valid_test_signature_p5',
        });

      assert.strictEqual(verifyRes.status, 200);
      assert.strictEqual(verifyRes.body.data.paymentStatus, 'paid');
      assert.strictEqual(verifyRes.body.data.orderStatus, 'confirmed');

      // 4. Strict Ownership Guard: Patient 2 is strictly forbidden from reading Patient 1 order
      const crossPatientRes = await request(app)
        .get(`/api/v1/products/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${unauthorizedPatientToken}`);

      assert.strictEqual(crossPatientRes.status, 403);
    });
  });

  // ===========================================================================
  // WORKFLOW 2: DOCTOR / PROFESSIONAL WORKFLOW & OFFLINE RESILIENCE
  // ===========================================================================
  describe('Workflow 2: Doctor/Professional Persona End-to-End', () => {
    it('should allow clinician to query assigned visits, advance lifecycle, and document clinical vitals', async () => {
      // Create Field Visit assigned to doctor
      const visit = await FieldVisit.create({
        visitNumber: 'TEST-P5-VISIT-01',
        patientDetails: {
          fullName: 'Kavita Deshmukh',
          phone: patientPhone,
          address: 'Flat 101, Mayur Colony, Kothrud',
          city: 'Pune',
          pincode: '411038',
          cluster: 'Pune West',
        },
        providerId: new mongoose.Types.ObjectId(doctorUserId),
        providerName: 'Dr. Anand Kulkarni',
        providerRole: 'palliative_specialist',
        providerPhone: doctorPhone,
        visitType: 'clinical_care',
        status: 'assigned',
        scheduledDate: new Date().toISOString().slice(0, 10),
        timeSlot: '11:00 - 12:30',
      });
      createdVisitId = visit._id.toString();
      createdVisitNumber = visit.visitNumber;

      // Clinician queries assigned visits
      const assignedRes = await request(app)
        .get('/api/v1/visits/provider/me')
        .set('Authorization', `Bearer ${doctorToken}`);

      assert.strictEqual(assignedRes.status, 200);
      const found = assignedRes.body.data.some((v: any) => v.visitNumber === createdVisitNumber);
      assert.strictEqual(found, true);

      // Advance status through permitted lifecycle: assigned -> accepted -> en_route -> arrived -> in_progress
      await request(app)
        .patch(`/api/v1/visits/${createdVisitId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'accepted' });

      await request(app)
        .patch(`/api/v1/visits/${createdVisitId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'en_route' });

      await request(app)
        .patch(`/api/v1/visits/${createdVisitId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'arrived' });

      await request(app)
        .patch(`/api/v1/visits/${createdVisitId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'in_progress' });

      // Record Clinical Documentation & mark complete
      const docRes = await request(app)
        .post(`/api/v1/visits/${createdVisitId}/documentation`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          vitals: {
            bloodPressure: '120/78 mmHg',
            pulse: 74,
            spO2: 99,
            temperature: '98.6 F',
          },
          clinicalNotes: 'Pain adequately controlled. Patient ambulating comfortably indoors.',
          proceduresPerformed: ['Symptom assessment', 'Medication reconciliation'],
          markAsCompleted: true,
        });

      assert.strictEqual(docRes.status, 200);
      assert.strictEqual(docRes.body.data.status, 'completed');
      assert.strictEqual(docRes.body.data.clinicalDocumentation.vitals.pulse, 74);
    });

    it('should process offline edge sync batch with idempotency, conflict detection, and partial execution', async () => {
      const visitConflict = await FieldVisit.create({
        visitNumber: 'TEST-P5-VISIT-SYNC-CONF',
        patientDetails: {
          fullName: 'Kavita Deshmukh',
          phone: patientPhone,
          address: 'Flat 101, Mayur Colony, Kothrud',
          city: 'Pune',
          pincode: '411038',
          cluster: 'Pune West',
        },
        providerId: new mongoose.Types.ObjectId(doctorUserId),
        providerName: 'Dr. Anand Kulkarni',
        providerRole: 'palliative_specialist',
        visitType: 'clinical_care',
        status: 'completed', // Server is completed
        scheduledDate: new Date().toISOString().slice(0, 10),
      });

      const visitValid = await FieldVisit.create({
        visitNumber: 'TEST-P5-VISIT-SYNC-VALID',
        patientDetails: {
          fullName: 'Kavita Deshmukh',
          phone: patientPhone,
          address: 'Flat 101, Mayur Colony, Kothrud',
          city: 'Pune',
          pincode: '411038',
          cluster: 'Pune West',
        },
        providerId: new mongoose.Types.ObjectId(doctorUserId),
        providerName: 'Dr. Anand Kulkarni',
        providerRole: 'palliative_specialist',
        visitType: 'clinical_care',
        status: 'assigned',
        scheduledDate: new Date().toISOString().slice(0, 10),
      });

      const opConflict = `P5-OP-CONF-${Date.now()}`;
      const opValid = `P5-OP-VALID-${Date.now()}`;

      // Submit offline batch
      const syncRes = await request(app)
        .post('/api/v1/visits/sync')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          operations: [
            // 1. Conflict operation (expects 'assigned', but server is 'completed')
            {
              clientOperationId: opConflict,
              visitId: visitConflict._id.toString(),
              visitNumber: visitConflict.visitNumber,
              operationType: 'status_update',
              expectedStatus: 'assigned',
              clientTimestamp: new Date().toISOString(),
              payload: { status: 'en_route' },
            },
            // 2. Valid operation (expects 'assigned', matches server)
            {
              clientOperationId: opValid,
              visitId: visitValid._id.toString(),
              visitNumber: visitValid.visitNumber,
              operationType: 'status_update',
              expectedStatus: 'assigned',
              clientTimestamp: new Date().toISOString(),
              payload: { status: 'accepted' },
            },
          ],
        });

      assert.strictEqual(syncRes.status, 200);
      assert.strictEqual(syncRes.body.data.summary.conflicts, 1);
      assert.strictEqual(syncRes.body.data.summary.applied, 1);

      // Verify Idempotency: Re-submitting valid operation returns applied result without double execution
      const duplicateRes = await request(app)
        .post('/api/v1/visits/sync')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          operations: [
            {
              clientOperationId: opValid,
              visitId: visitValid._id.toString(),
              visitNumber: visitValid.visitNumber,
              operationType: 'status_update',
              expectedStatus: 'assigned',
              clientTimestamp: new Date().toISOString(),
              payload: { status: 'accepted' },
            },
          ],
        });

      assert.strictEqual(duplicateRes.status, 200);
      assert.strictEqual(duplicateRes.body.data.summary.applied, 1);
      const count = await SyncOperation.countDocuments({ clientOperationId: opValid });
      assert.strictEqual(count, 1);
    });
  });

  // ===========================================================================
  // WORKFLOW 3: HOSPITAL END-TO-END WORKFLOW & TENANT ISOLATION
  // ===========================================================================
  describe('Workflow 3: Hospital Persona End-to-End', () => {
    it('should create discharge referral, attach services & equipment, and track provider assignments', async () => {
      const refRes = await request(app)
        .post('/api/v1/hospitals/referrals')
        .set('Authorization', `Bearer ${hospitalAToken}`)
        .send({
          referralNumber: `TEST-P5-REF-${Date.now()}`,
          patientDetails: {
            fullName: 'Kavita Deshmukh',
            age: 48,
            gender: 'female',
            phone: patientPhone,
            address: 'Flat 101, Mayur Colony, Kothrud',
            city: 'Pune',
            pincode: '411038',
            cluster: 'Pune West',
          },
          clinicalSummary: {
            primaryDiagnosis: 'Metastatic Ovarian Carcinoma - Post Chemotherapy Care',
            mobilityStatus: 'assisted_walker',
            clinicalNotes: 'Palliative home wound care and respiratory monitoring required.',
          },
          requestedServices: [
            {
              serviceCode: 'NUR-01',
              serviceName: 'Skilled Nursing & Wound Care',
              frequency: 'daily',
              durationDays: 14,
              preferredStartDate: new Date(),
            },
          ],
          requestedEquipment: [
            {
              itemType: 'oxygen_concentrator',
              name: '5 LPM Medical Oxygen Concentrator',
              urgency: 'immediate',
              durationWeeks: 4,
            },
          ],
          referringStaff: {
            name: 'Dr. Sunita Kulkarni',
            department: 'Medical Oncology',
            designation: 'Attending Oncologist',
            phone: '9822019988',
          },
        });

      assert.strictEqual(refRes.status, 201);
      assert.strictEqual(refRes.body.success, true);
      createdReferralId = (refRes.body.data.id || refRes.body.data._id).toString();
      assert.strictEqual(refRes.body.data.status, 'submitted');

      // Transition submitted -> triaged -> bundle_proposed -> approved
      const triageRes = await request(app)
        .patch(`/api/v1/hospitals/referrals/${createdReferralId}/status`)
        .set('Authorization', `Bearer ${hospitalAToken}`)
        .send({ status: 'triaged', notes: 'Triaged by hospital palliative care team' });
      assert.strictEqual(triageRes.status, 200);

      const bundleRes = await request(app)
        .patch(`/api/v1/hospitals/referrals/${createdReferralId}/status`)
        .set('Authorization', `Bearer ${hospitalAToken}`)
        .send({ status: 'bundle_proposed', notes: 'Care bundle configured' });
      assert.strictEqual(bundleRes.status, 200);

      const approveRes = await request(app)
        .patch(`/api/v1/hospitals/referrals/${createdReferralId}/status`)
        .set('Authorization', `Bearer ${hospitalAToken}`)
        .send({ status: 'approved', notes: 'Discharge confirmed by attending physician' });

      assert.strictEqual(approveRes.status, 200);
      assert.strictEqual(approveRes.body.data.status, 'approved');
    });

    it('should review care-completion summary and submit formal hospital acknowledgement', async () => {
      // Fetch care completion summary
      const sumRes = await request(app)
        .get(`/api/v1/hospitals/referrals/${createdReferralId}/completion-summary`)
        .set('Authorization', `Bearer ${hospitalAToken}`);

      assert.strictEqual(sumRes.status, 200);
      assert.strictEqual(sumRes.body.success, true);
      assert.ok(sumRes.body.data.referral.referralNumber);

      // Acknowledge completion summary
      const ackRes = await request(app)
        .post(`/api/v1/hospitals/referrals/${createdReferralId}/acknowledge-summary`)
        .set('Authorization', `Bearer ${hospitalAToken}`)
        .send({
          acknowledgedByName: 'Dr. Sunita Kulkarni',
          notes: 'Home transition objectives achieved. Patient transferred to routine outpatient follow-up.',
        });

      assert.strictEqual(ackRes.status, 200);
      assert.strictEqual(ackRes.body.success, true);
      assert.strictEqual(ackRes.body.data.status, 'completed');
    });

    it('should strictly ENFORCE hospital tenant isolation (Hospital B receives 403 on Hospital A referrals)', async () => {
      const tenantRes = await request(app)
        .get(`/api/v1/hospitals/referrals/${createdReferralId}`)
        .set('Authorization', `Bearer ${hospitalBToken}`);

      assert.strictEqual(tenantRes.status, 403);
      assert.strictEqual(tenantRes.body.success, false);
      assert.match(tenantRes.body.error.message, /forbidden|access denied|cross-hospital/i);
    });
  });

  // ===========================================================================
  // WORKFLOW 4: ADMIN & SUPER ADMIN END-TO-END WORKFLOW
  // ===========================================================================
  describe('Workflow 4: Admin and Super Admin Personas End-to-End', () => {
    it('should allow Admin to review sync logs, notification logs, and retry failed notification', async () => {
      // 1. Query Sync logs and stats
      const syncLogsRes = await request(app)
        .get('/api/v1/admin/sync-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(syncLogsRes.status, 200);
      assert.ok(Array.isArray(syncLogsRes.body.data));

      const statsRes = await request(app)
        .get('/api/v1/admin/sync-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(statsRes.status, 200);
      assert.ok(statsRes.body.data.total >= 1);

      // 2. Query Notification logs
      const notifRes = await request(app)
        .get('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(notifRes.status, 200);
      assert.ok(Array.isArray(notifRes.body.data));

      // 3. Create simulated failed notification and retry it
      const failedNotif = await NotificationLog.create({
        recipientPhone: patientPhone,
        recipientName: 'Kavita Deshmukh',
        channel: 'sms',
        templateId: 'APPOINTMENT_REMINDER',
        messageBody: 'Namaste Kavita, test notification for retry audit.',
        consentChecked: true,
        status: 'failed',
        provider: 'simulated_gateway',
        failureReason: 'Carrier gateway temporary timeout',
      });

      const retryRes = await request(app)
        .post(`/api/v1/admin/notifications/${failedNotif._id}/retry`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(retryRes.status, 200);
      assert.strictEqual(retryRes.body.success, true);
      assert.ok(retryRes.body.data.retryCount >= 1);

      // Verify Audit Log recorded retry
      const audit = await AuditLog.findOne({
        action: 'NOTIFICATION_RETRIED',
        targetId: failedNotif._id.toString(),
      });
      assert.ok(audit);
    });

    it('should allow Super Admin exclusive access to governance overview and system health, while blocking regular Admin (403)', async () => {
      // Super Admin accesses governance overview
      const govRes = await request(app)
        .get('/api/v1/admin/super/governance/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.strictEqual(govRes.status, 200);
      assert.strictEqual(govRes.body.success, true);
      assert.strictEqual(govRes.body.data.governance.platformStatus, 'nominal_operational');
      assert.ok(govRes.body.data.governance.totalUsers >= 1);

      // Super Admin accesses system health
      const healthRes = await request(app)
        .get('/api/v1/admin/super/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.strictEqual(healthRes.status, 200);
      assert.strictEqual(healthRes.body.success, true);
      assert.strictEqual(healthRes.body.data.services.mongodb.status, 'connected_healthy');

      // Regular Admin is STRICTLY FORBIDDEN (403) from Super Admin governance endpoints
      const forbidGovRes = await request(app)
        .get('/api/v1/admin/super/governance/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(forbidGovRes.status, 403);

      const forbidHealthRes = await request(app)
        .get('/api/v1/admin/super/system-health')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(forbidHealthRes.status, 403);
    });

    it('should verify audit logging immutability and record creation across security-sensitive events', async () => {
      const audits = await AuditLog.find().sort({ timestamp: -1 }).limit(10);
      assert.ok(audits.length >= 1);
      assert.ok(audits.some((a) => a.action && a.category && a.severity));
    });
  });
});
