import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  User,
  FieldVisit,
  HospitalReferral,
  ProductOrder,
  AuditLog,
} from '../src/models/index.js';

describe('Phase 3 — Field Operations & Clinician Visit Workflow Test Suite', () => {
  const app = createApp();

  let providerAToken: string;
  let providerAUserId: string;
  const providerAPhone = '9876543201';

  let providerBToken: string;
  let providerBUserId: string;
  const providerBPhone = '9876543202';

  let hospitalAToken: string;
  let hospitalAUserId: string;
  const hospitalAPhone = '9876543203';

  let hospitalBToken: string;
  let hospitalBUserId: string;
  const hospitalBPhone = '9876543204';

  let adminToken: string;
  let adminUserId: string;
  const adminPhone = '9876543209';

  let testReferralId: string;
  let testOrderId: string;
  let clinicalVisitId: string;
  let installationVisitId: string;

  before(async () => {
    await connectDatabase();

    // Clean up test-specific users and data
    await User.deleteMany({
      phone: { $in: [providerAPhone, providerBPhone, hospitalAPhone, hospitalBPhone, adminPhone] },
    });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST' } });
    await HospitalReferral.deleteMany({ referralNumber: { $regex: 'TEST' } });
    await ProductOrder.deleteMany({ orderNumber: { $regex: 'TEST' } });

    // 1. Register Provider A (Clinician)
    const regProvA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sister Sunita Rao, RN',
        phone: providerAPhone,
        email: 'sunita.prov@vivoquest.in',
        password: 'Password#2026',
        role: 'professional',
        consentAccepted: true,
      });
    assert.strictEqual(regProvA.status, 201);
    providerAToken = regProvA.body.data.token;
    providerAUserId = regProvA.body.data.user.id || regProvA.body.data.user._id;

    // 2. Register Provider B (Other Clinician)
    const regProvB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Dr. Vikram Joshi',
        phone: providerBPhone,
        email: 'vikram.prov@vivoquest.in',
        password: 'Password#2026',
        role: 'professional',
        consentAccepted: true,
      });
    assert.strictEqual(regProvB.status, 201);
    providerBToken = regProvB.body.data.token;
    providerBUserId = regProvB.body.data.user.id || regProvB.body.data.user._id;

    // 3. Register Hospital A
    const regHospA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Ruby Hall Clinic A',
        phone: hospitalAPhone,
        email: 'ruby.hall.a@vivoquest.in',
        password: 'Password#2026',
        role: 'hospital',
        consentAccepted: true,
      });
    assert.strictEqual(regHospA.status, 201);
    hospitalAToken = regHospA.body.data.token;
    hospitalAUserId = regHospA.body.data.user.id || regHospA.body.data.user._id;

    // 4. Register Hospital B (Tenant isolation check)
    const regHospB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sahyadri Hospital B',
        phone: hospitalBPhone,
        email: 'sahyadri.b@vivoquest.in',
        password: 'Password#2026',
        role: 'hospital',
        consentAccepted: true,
      });
    assert.strictEqual(regHospB.status, 201);
    hospitalBToken = regHospB.body.data.token;
    hospitalBUserId = regHospB.body.data.user.id || regHospB.body.data.user._id;

    // 5. Register Admin
    const regAdmin = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Central Operations Admin',
        phone: adminPhone,
        email: 'central.admin@vivoquest.in',
        password: 'Password#2026',
        role: 'admin',
        consentAccepted: true,
      });
    assert.strictEqual(regAdmin.status, 201);
    adminToken = regAdmin.body.data.token;
    adminUserId = regAdmin.body.data.user.id || regAdmin.body.data.user._id;

    // 6. Create a test Hospital Referral for Hospital A
    const testReferral = await HospitalReferral.create({
      referralNumber: 'VQ-REF-TEST-9001',
      hospitalId: new mongoose.Types.ObjectId(hospitalAUserId),
      hospitalName: 'Ruby Hall Clinic A',
      referringStaff: {
        name: 'Dr. Test Coordinator',
        department: 'Oncology',
        designation: 'Senior Registrar',
        phone: '9822000001',
      },
      patientDetails: {
        fullName: 'Mrs. Anandita Sen',
        phone: '9822000002',
        age: 72,
        gender: 'female',
        address: '101, Nilgiri Towers',
        city: 'Pune',
        pincode: '411001',
        cluster: 'Pune Central',
      },
      clinicalSummary: {
        primaryDiagnosis: 'Metastatic Breast Cancer on palliative maintenance',
        mobilityStatus: 'assisted_walker',
        clinicalNotes: 'Requires regular palliative wound care and drain monitoring',
      },
      requestedServices: [
        {
          serviceCode: 'NUR-01',
          serviceName: 'Skilled Nursing & Wound Care',
          frequency: 'daily',
          durationDays: 7,
          preferredStartDate: '2026-10-22',
        },
      ],
      equipmentRequired: [
        {
          itemType: 'bipap_cpap',
          name: 'BiPAP VPAP ST Device',
          quantity: 1,
          urgency: 'urgent',
        },
      ],
      priority: 'urgent',
      status: 'approved',
      assignedProviders: [
        {
          professionalId: new mongoose.Types.ObjectId(providerAUserId),
          name: 'Sister Sunita Rao, RN',
          role: 'Palliative Care Nurse',
          phone: providerAPhone,
          serviceAssigned: 'Skilled Nursing',
          assignedAt: new Date(),
        },
      ],
      isSeededDemo: false,
    });
    testReferralId = testReferral._id.toString();

    // 7. Create a test ProductOrder with clinical setup required
    const testOrder = await ProductOrder.create({
      orderNumber: 'VQ-ORD-TEST-8801',
      patientId: new mongoose.Types.ObjectId(hospitalAUserId), // arbitrary valid id
      patientName: 'Mrs. Anandita Sen',
      patientPhone: '9822000002',
      hospitalReferralId: testReferral._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          sku: 'RESP-BIPAP-AUTO-ST',
          title: 'ResMed Lumis 150 VPAP ST',
          category: 'respiratory',
          quantity: 1,
          unitPrice: 45000,
          isRental: false,
          setupRequired: true,
        },
      ],
      pricing: {
        subtotal: 45000,
        deliveryFee: 0,
        taxGst: 5400,
        totalAmount: 50400,
      },
      deliveryAddress: {
        street: '101, Nilgiri Towers',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
      clinicalSetup: {
        isSetupRequired: true,
        assignedSpecialistId: new mongoose.Types.ObjectId(providerAUserId),
        assignedSpecialistName: 'Sister Sunita Rao, RN',
        setupStatus: 'scheduled',
        setupDate: new Date(),
      },
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'online',
      trackingUpdates: [],
      isDemo: false,
    });
    testOrderId = testOrder._id.toString();

    // 8. Create a test Clinical Field Visit assigned to Provider A
    const clinicalVisit = await FieldVisit.create({
      visitNumber: 'VQ-VST-TEST-001',
      visitType: 'nursing_procedure',
      status: 'assigned',
      providerId: new mongoose.Types.ObjectId(providerAUserId),
      providerName: 'Sister Sunita Rao, RN',
      providerRole: 'Palliative Care Nurse',
      providerPhone: providerAPhone,
      patientDetails: {
        fullName: 'Mrs. Anandita Sen',
        phone: '9822000002',
        address: '101, Nilgiri Towers',
        city: 'Pune',
        pincode: '411001',
        cluster: 'Pune Central',
        instructions: 'Elevator operational, 1st floor',
      },
      scheduledDate: new Date().toISOString().slice(0, 10),
      timeSlot: '10:00 - 11:30',
      timestamps: { assignedAt: new Date() },
      hospitalReferralId: testReferral._id,
      hospitalId: new mongoose.Types.ObjectId(hospitalAUserId),
      hospitalName: 'Ruby Hall Clinic A',
      statusHistory: [{ status: 'assigned', timestamp: new Date() }],
      isDemo: false,
    });
    clinicalVisitId = clinicalVisit._id.toString();

    // 9. Create a test Equipment Installation Field Visit assigned to Provider A
    const installVisit = await FieldVisit.create({
      visitNumber: 'VQ-VST-TEST-002',
      visitType: 'equipment_installation',
      status: 'assigned',
      providerId: new mongoose.Types.ObjectId(providerAUserId),
      providerName: 'Sister Sunita Rao, RN',
      providerRole: 'Clinical Bio-Technician',
      providerPhone: providerAPhone,
      patientDetails: {
        fullName: 'Mrs. Anandita Sen',
        phone: '9822000002',
        address: '101, Nilgiri Towers',
        city: 'Pune',
        pincode: '411001',
        cluster: 'Pune Central',
      },
      scheduledDate: new Date().toISOString().slice(0, 10),
      timeSlot: '14:00 - 15:30',
      timestamps: { assignedAt: new Date() },
      productOrderId: testOrder._id,
      orderNumber: testOrder.orderNumber,
      installationVerification: {
        isEquipmentInstallation: true,
        equipmentItems: [
          {
            sku: 'RESP-BIPAP-AUTO-ST',
            name: 'ResMed Lumis 150 VPAP ST',
            serialNumber: 'PENDING',
            condition: 'functional_tested',
            checklistPassed: false,
          },
        ],
        barcodeScanVerified: false,
        patientAcknowledged: false,
        consentObtained: false,
      },
      statusHistory: [{ status: 'assigned', timestamp: new Date() }],
      isDemo: false,
    });
    installationVisitId = installVisit._id.toString();
  });

  after(async () => {
    await User.deleteMany({
      phone: { $in: [providerAPhone, providerBPhone, hospitalAPhone, hospitalBPhone, adminPhone] },
    });
    await FieldVisit.deleteMany({ visitNumber: { $regex: 'TEST' } });
    await HospitalReferral.deleteMany({ referralNumber: { $regex: 'TEST' } });
    await ProductOrder.deleteMany({ orderNumber: { $regex: 'TEST' } });
    await disconnectDatabase();
  });

  // ---------------------------------------------------------------------------
  // 1. Provider Field Visit Access & Authorization
  // ---------------------------------------------------------------------------
  describe('1. Provider Visit Listing & Tenant Access Control', () => {
    it('should allow Provider A to list their assigned field visits', async () => {
      const res = await request(app)
        .get('/api/v1/visits/provider/me')
        .set('Authorization', `Bearer ${providerAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(Array.isArray(res.body.data));
      assert(res.body.data.length >= 2);
      // All returned visits must belong to Provider A
      res.body.data.forEach((v: any) => {
        assert.strictEqual(v.providerId, providerAUserId);
      });
    });

    it('should return empty list for Provider B who has no visits assigned yet', async () => {
      const res = await request(app)
        .get('/api/v1/visits/provider/me')
        .set('Authorization', `Bearer ${providerBToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 0);
    });

    it('CRITICAL: should FORBID Provider B from retrieving Provider A visit details (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/visits/${clinicalVisitId}`)
        .set('Authorization', `Bearer ${providerBToken}`);

      assert.strictEqual(res.status, 403);
      assert.match(res.body.error.message, /Forbidden/i);
    });

    it('should allow Provider A to retrieve details of their own visit', async () => {
      const res = await request(app)
        .get(`/api/v1/visits/${clinicalVisitId}`)
        .set('Authorization', `Bearer ${providerAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.visitNumber, 'VQ-VST-TEST-001');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Visit Lifecycle State Machine & Timestamp Enforcement
  // ---------------------------------------------------------------------------
  describe('2. Visit Status Progression & State Machine', () => {
    it('should reject invalid status jump (assigned -> in_progress directly) with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/visits/${clinicalVisitId}/status`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ status: 'in_progress' });

      assert.strictEqual(res.status, 400);
      assert.match(res.body.error.message, /Invalid field visit status transition/i);
    });

    it('should advance status: assigned -> accepted', async () => {
      const res = await request(app)
        .patch(`/api/v1/visits/${clinicalVisitId}/status`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ status: 'accepted', notes: 'Accepted by nurse' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'accepted');
      assert(res.body.data.timestamps.acceptedAt);
    });

    it('should advance status: accepted -> en_route', async () => {
      const res = await request(app)
        .patch(`/api/v1/visits/${clinicalVisitId}/status`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ status: 'en_route', location: 'Swargate, Pune' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'en_route');
      assert(res.body.data.timestamps.enRouteAt);
    });

    it('should advance status: en_route -> arrived', async () => {
      const res = await request(app)
        .patch(`/api/v1/visits/${clinicalVisitId}/status`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ status: 'arrived', notes: 'Arrived at patient residence' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'arrived');
      assert(res.body.data.timestamps.arrivedAt);
    });

    it('should advance status: arrived -> in_progress', async () => {
      const res = await request(app)
        .patch(`/api/v1/visits/${clinicalVisitId}/status`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ status: 'in_progress' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'in_progress');
      assert(res.body.data.timestamps.startedAt);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Clinical Documentation & Hospital Referral Auto-Linkage
  // ---------------------------------------------------------------------------
  describe('3. Clinical Documentation & Referral Auto-Linkage', () => {
    it('should record vitals, clinical observations, and complete the visit', async () => {
      const res = await request(app)
        .post(`/api/v1/visits/${clinicalVisitId}/documentation`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({
          vitals: {
            bloodPressure: '120/80 mmHg',
            pulse: 76,
            spO2: 99,
            temperature: '98.6 F',
            respiratoryRate: 16,
          },
          clinicalNotes: 'Wound dressing intact. Performed drain site flushing with saline. Patient comfortable.',
          proceduresPerformed: ['Wound dressing', 'Drain site cleaning'],
          medicationsAdministered: ['Betadine solution'],
          recommendations: 'Continue current analgesia schedule. Keep dressing dry.',
          followUpDate: '2026-10-24',
          markAsCompleted: true,
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'completed');
      assert(res.body.data.timestamps.completedAt);
      assert.strictEqual(res.body.data.clinicalDocumentation.vitals.bloodPressure, '120/80 mmHg');

      // Verify automatic sync to HospitalReferral.visitSummaries
      const updatedReferral = await HospitalReferral.findById(testReferralId);
      assert(updatedReferral);
      assert(updatedReferral.visitSummaries.length > 0);
      const syncedSummary = updatedReferral.visitSummaries.find(
        (s) => s.visitId === 'VQ-VST-TEST-001'
      );
      assert(syncedSummary);
      assert.strictEqual(syncedSummary.vitals?.bloodPressure, '120/80 mmHg');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Visit Exception & Cancellation Reporting
  // ---------------------------------------------------------------------------
  describe('4. Visit Exception Handling', () => {
    let exceptionVisitId: string;

    before(async () => {
      const v = await FieldVisit.create({
        visitNumber: 'VQ-VST-TEST-EXC',
        visitType: 'palliative_assessment',
        status: 'en_route',
        providerId: new mongoose.Types.ObjectId(providerAToken ? providerAUserId : undefined),
        providerName: 'Sister Sunita Rao, RN',
        providerRole: 'Palliative Care Nurse',
        patientDetails: {
          fullName: 'Mr. Test Patient',
          phone: '9822999999',
          address: '404, Camp, Pune',
          city: 'Pune',
          pincode: '411001',
          cluster: 'Pune Central',
        },
        scheduledDate: new Date().toISOString().slice(0, 10),
        timeSlot: '16:00 - 17:00',
        timestamps: { assignedAt: new Date(), acceptedAt: new Date(), enRouteAt: new Date() },
        statusHistory: [{ status: 'assigned', timestamp: new Date() }],
        isDemo: false,
      });
      exceptionVisitId = v._id.toString();
    });

    it('should record visit exception with mandatory reason and set status to failed', async () => {
      const res = await request(app)
        .post(`/api/v1/visits/${exceptionVisitId}/exception`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({
          exceptionType: 'patient_unavailable',
          reason: 'Patient was taken to emergency clinic by family for severe acute cough',
          notes: 'Caregiver called to postpone home visit',
          rescheduleDate: '2026-10-25',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'failed');
      assert.strictEqual(res.body.data.exceptionDetails.hasException, true);
      assert.strictEqual(res.body.data.exceptionDetails.exceptionType, 'patient_unavailable');

      // Verify audit log entry
      const audit = await AuditLog.findOne({
        targetId: exceptionVisitId,
        action: 'FIELD_VISIT_EXCEPTION_REPORTED',
      });
      assert(audit);
      assert.strictEqual(audit.category, 'field_operations');
      assert.strictEqual(audit.severity, 'warning');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Medical Equipment Installation Verification
  // ---------------------------------------------------------------------------
  describe('5. Medical Equipment Installation Verification', () => {
    it('should reject verification if serial number is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/visits/${installationVisitId}/installation-verify`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({
          equipmentItems: [
            {
              sku: 'RESP-BIPAP-AUTO-ST',
              name: 'ResMed Lumis 150 VPAP ST',
              serialNumber: '', // Missing
              condition: 'functional_tested',
              checklistPassed: true,
            },
          ],
          barcodeScanVerified: false,
          patientAcknowledged: true,
          patientOrCaregiverName: 'Mr. Arvind Sen',
          consentObtained: true,
        });

      assert.strictEqual(res.status, 400);
      assert.match(res.body.error.message, /Missing verified serial number/i);
    });

    it('should successfully complete installation verification with serial number & caregiver acknowledgement', async () => {
      const res = await request(app)
        .post(`/api/v1/visits/${installationVisitId}/installation-verify`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({
          equipmentItems: [
            {
              sku: 'RESP-BIPAP-AUTO-ST',
              name: 'ResMed Lumis 150 VPAP ST',
              serialNumber: 'SN-BIPAP-2026-99014-X',
              condition: 'functional_tested',
              checklistPassed: true,
            },
          ],
          barcodeScanVerified: true,
          barcodeRawData: 'QR-RESMED-LUMIS-150-VPAP-ST-99014',
          patientAcknowledged: true,
          patientOrCaregiverName: 'Mr. Arvind Sen (Caregiver)',
          consentObtained: true,
          evidenceNotes: 'Tested mask seal at IPAP 14 / EPAP 6; electrical grounded socket verified.',
          installationNotes: 'Device fully calibrated and operational.',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'completed');
      assert.strictEqual(res.body.data.installationVerification.barcodeScanVerified, true);
      assert.strictEqual(res.body.data.installationVerification.patientAcknowledged, true);
      assert.strictEqual(
        res.body.data.installationVerification.equipmentItems[0].serialNumber,
        'SN-BIPAP-2026-99014-X'
      );

      // Verify auto-sync to ProductOrder.clinicalSetup.setupStatus
      const updatedOrder = await ProductOrder.findById(testOrderId);
      assert(updatedOrder);
      assert.strictEqual(updatedOrder.clinicalSetup.setupStatus, 'completed');
    });

    it('should record installation failure and escalation to admin', async () => {
      const failVisit = await FieldVisit.create({
        visitNumber: 'VQ-VST-TEST-FAIL-DME',
        visitType: 'equipment_installation',
        status: 'in_progress',
        providerId: new mongoose.Types.ObjectId(providerAUserId),
        providerName: 'Sister Sunita Rao, RN',
        providerRole: 'Clinical Bio-Technician',
        patientDetails: {
          fullName: 'Mr. Test Patient 2',
          phone: '9822888888',
          address: 'Camp, Pune',
          city: 'Pune',
          pincode: '411001',
          cluster: 'Pune Central',
        },
        scheduledDate: new Date().toISOString().slice(0, 10),
        timeSlot: '12:00 - 13:00',
        timestamps: { assignedAt: new Date() },
        statusHistory: [{ status: 'assigned', timestamp: new Date() }],
        isDemo: false,
      });

      const res = await request(app)
        .post(`/api/v1/visits/${failVisit._id}/installation-fail`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({
          failedReason: 'Heated humidifier chamber cracked in transit, mask fitting leak detected',
          escalatedToAdmin: true,
          rescheduledToDate: '2026-10-25',
          notes: 'Replacement humidifier unit requested from regional depot',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'failed');
      assert.strictEqual(res.body.data.installationVerification.escalatedToAdmin, true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Hospital Closed-Loop Reporting & Tenant Isolation
  // ---------------------------------------------------------------------------
  describe('6. Hospital Closed-Loop Reporting & Tenant Isolation', () => {
    it('CRITICAL: should FORBID Hospital B from viewing Hospital A referral completion summary (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/hospitals/referrals/${testReferralId}/completion-summary`)
        .set('Authorization', `Bearer ${hospitalBToken}`);

      assert.strictEqual(res.status, 403);
      assert.match(res.body.error.message, /Forbidden/i);
    });

    it('should allow Hospital A to retrieve the care completion summary', async () => {
      const res = await request(app)
        .get(`/api/v1/hospitals/referrals/${testReferralId}/completion-summary`)
        .set('Authorization', `Bearer ${hospitalAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.referral.referralNumber, 'VQ-REF-TEST-9001');
      assert(res.body.data.summaryMetrics.totalVisitsScheduled >= 1);
      assert(res.body.data.summaryMetrics.totalVisitsCompleted >= 1);
      assert(Array.isArray(res.body.data.vitalsProgression));
    });

    it('should allow Hospital A to formally acknowledge the care completion summary', async () => {
      const res = await request(app)
        .post(`/api/v1/hospitals/referrals/${testReferralId}/acknowledge-summary`)
        .set('Authorization', `Bearer ${hospitalAToken}`)
        .send({
          acknowledgedByName: 'Dr. Cyrus Poonawalla (Chief Oncologist)',
          notes: 'Care goals fully met. Stable vital signs and excellent stoma recovery reported.',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'completed');

      // Verify audit log
      const audit = await AuditLog.findOne({
        targetId: testReferralId,
        action: 'HOSPITAL_CLOSED_LOOP_ACKNOWLEDGED',
      });
      assert(audit);
      assert.strictEqual(audit.category, 'field_operations');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Admin Operations & Reassignment
  // ---------------------------------------------------------------------------
  describe('7. Admin Operations, Reassignment & Audit Trail', () => {
    it('should allow Admin to list all platform field visits', async () => {
      const res = await request(app)
        .get('/api/v1/admin/field-visits')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(Array.isArray(res.body.data));
      assert(res.body.data.length >= 2);
    });

    it('should allow Admin to retrieve operational statistics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/field-visits/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert('totalVisits' in res.body.data);
      assert('todayCount' in res.body.data);
      assert('exceptionsCount' in res.body.data);
    });

    it('should allow Admin to reassign a field visit to Provider B', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/field-visits/${clinicalVisitId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          providerId: providerBUserId,
          notes: 'Reassigned to Dr. Vikram Joshi due to schedule adjustment',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.providerId, providerBUserId);
      assert.strictEqual(res.body.data.providerName, 'Dr. Vikram Joshi');

      // Verify audit log
      const audit = await AuditLog.findOne({
        targetId: clinicalVisitId,
        action: 'FIELD_VISIT_PROVIDER_REASSIGNED',
      });
      assert(audit);
      assert.strictEqual(audit.category, 'field_operations');
    });

    it('should forbid non-admin provider from calling admin reassignment endpoint (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/field-visits/${clinicalVisitId}/assign`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({
          providerId: providerBUserId,
        });

      assert.strictEqual(res.status, 403);
    });
  });
});
