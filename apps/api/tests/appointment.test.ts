import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { HealthcareProfessionalProfile } from '../src/models/HealthcareProfessionalProfile.js';
import { DoctorAvailability } from '../src/models/DoctorAvailability.js';
import { Appointment } from '../src/models/Appointment.js';
import { seedDemoDoctorsIfEmpty } from '../src/services/doctorSchedulingService.js';

describe('Phase 5 — Patient Appointments & Doctor Scheduling Test Suite', () => {
  const app = createApp();

  // Test accounts
  let patientAToken: string;
  let patientAId: string;
  const patientAPhone = '9876540001';

  let patientBToken: string;
  let patientBId: string;
  const patientBPhone = '9876540002';

  let doctorToken: string;
  let doctorUserId: string;
  const doctorPhone = '9820011001'; // Dr. Aditi Rao (Seeded Demo Doctor)

  let createdAppointmentId: string;
  let futureWorkingDate: string; // Dynamic date 7 days from now (guaranteed weekday)
  let chosenTimeSlot = { startTime: '10:00', endTime: '10:30' };

  before(async () => {
    await connectDatabase();

    // Clean up previous test runs
    await User.deleteMany({ phone: { $in: [patientAPhone, patientBPhone] } });
    await Appointment.deleteMany({ 'patientDetails.phone': { $in: [patientAPhone, patientBPhone] } });

    // Seed demo doctors & availability
    await seedDemoDoctorsIfEmpty();

    // Register Patient A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Ramesh Sharma',
        phone: patientAPhone,
        email: 'ramesh.sharma@testpatient.in',
        password: 'Password#2026',
        role: 'patient',
        city: 'Pune',
        pincode: '411001',
        consentAccepted: true,
      });
    patientAToken = resA.body.data.token;
    patientAId = resA.body.data.user.id;

    // Register Patient B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Meena Kulkarni',
        phone: patientBPhone,
        email: 'meena.k@testpatient.in',
        password: 'Password#2026',
        role: 'patient',
        city: 'Pune',
        pincode: '411004',
        consentAccepted: true,
      });
    patientBToken = resB.body.data.token;
    patientBId = resB.body.data.user.id;

    // Login as Demo Doctor (Dr. Aditi Rao)
    const docUser = await User.findOne({ phone: doctorPhone });
    assert.ok(docUser, 'Demo doctor Dr. Aditi Rao should exist');
    doctorUserId = docUser._id.toString();

    const docLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: doctorPhone,
        password: 'Password#2026', // Uses demo prototype / default hash
      });
    doctorToken = docLoginRes.body.data.token;

    // Calculate a safe future weekday (e.g. 7 days ahead, if Sunday shift to Monday)
    const target = new Date();
    target.setDate(target.getDate() + 7);
    if (target.getDay() === 0) {
      target.setDate(target.getDate() + 1); // Shift Sunday to Monday
    }
    futureWorkingDate = `${target.getFullYear()}-${(target.getMonth() + 1).toString().padStart(2, '0')}-${target.getDate().toString().padStart(2, '0')}`;

    // Clear any existing appointments for this doctor on the test date to have a clean slate
    await Appointment.deleteMany({ doctorId: doctorUserId, appointmentDate: futureWorkingDate });
  });

  after(async () => {
    // Cleanup test records
    await User.deleteMany({ phone: { $in: [patientAPhone, patientBPhone] } });
    await Appointment.deleteMany({ 'patientDetails.phone': { $in: [patientAPhone, patientBPhone] } });
    await Appointment.deleteMany({ doctorId: doctorUserId, appointmentDate: futureWorkingDate });
    await disconnectDatabase();
  });

  // ---------------------------------------------------------------------------
  // 1. Doctor Directory & Profile Retrieval
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/doctors', () => {
    it('should list verified doctors with specialty and consultation fees', async () => {
      const res = await request(app).get('/api/v1/doctors');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 6);

      const drAditi = res.body.data.find((d: any) => d.fullName === 'Dr. Aditi Rao');
      assert.ok(drAditi, 'Dr. Aditi Rao should be in directory');
      assert.equal(drAditi.title, 'Dr.');
      assert.equal(drAditi.verificationStatus, 'verified');
      assert.ok(drAditi.specializations.includes('Palliative Oncology'));
      assert.ok(drAditi.fees.in_clinic > 0);
      assert.equal(drAditi.isSeededDemo, true);
    });

    it('should filter doctors by specialty query', async () => {
      const res = await request(app).get('/api/v1/doctors?specialty=physiotherapy');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length >= 1);
      assert.ok(
        res.body.data.every((d: any) =>
          d.specializations.some((s: string) => s.toLowerCase().includes('physiotherapy'))
        )
      );
    });

    it('should fetch single doctor details by ID', async () => {
      const res = await request(app).get(`/api/v1/doctors/${doctorUserId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.fullName, 'Dr. Aditi Rao');
      assert.ok(res.body.data.weeklySchedule);
      assert.ok(res.body.data.breakTimes);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Doctor Slot Calculation
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/doctors/:id/slots', () => {
    it('should dynamically calculate available time slots for a valid future working date', async () => {
      const res = await request(app).get(`/api/v1/doctors/${doctorUserId}/slots?date=${futureWorkingDate}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.date, futureWorkingDate);
      assert.equal(res.body.data.isWorkingDay, true);
      assert.ok(res.body.data.totalSlots > 0);
      assert.ok(res.body.data.availableCount > 0);

      // Verify lunchtime break slots are marked unavailable
      const lunchSlot = res.body.data.slots.find((s: any) => s.startTime === '13:00');
      // Lunch break is 13:00 to 14:00, so 13:00 slot must either not exist or be marked reason: 'break'
      if (lunchSlot) {
        assert.equal(lunchSlot.isAvailable, false);
        assert.equal(lunchSlot.reason, 'break');
      }
    });

    it('should return 400 when date parameter is missing or malformed', async () => {
      const res = await request(app).get(`/api/v1/doctors/${doctorUserId}/slots?date=invalid-date`);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Patient Appointment Booking (Valid Slot)
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/appointments', () => {
    it('should successfully book an appointment with valid slot and return VQ-APT number', async () => {
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          doctorId: doctorUserId,
          appointmentDate: futureWorkingDate,
          timeSlot: chosenTimeSlot,
          consultationMode: 'in_clinic',
          patientName: 'Ramesh Sharma',
          phone: patientAPhone,
          email: 'ramesh.sharma@testpatient.in',
          clinicalReason: 'Evaluation of persistent palliative neuropathic pain and nausea management',
          age: 62,
          gender: 'male',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.appointmentNumber.startsWith('VQ-APT-'));
      assert.equal(res.body.data.status, 'confirmed');
      assert.equal(res.body.data.appointmentDate, futureWorkingDate);
      assert.equal(res.body.data.timeSlot.startTime, chosenTimeSlot.startTime);
      assert.equal(res.body.data.pricing.paymentStatus, 'pending');
      assert.ok(res.body.data.statusHistory.length >= 1);

      createdAppointmentId = res.body.data.id || res.body.data._id;
    });

    it('should reject booking with past date with 400', async () => {
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          doctorId: doctorUserId,
          appointmentDate: '2020-01-01', // past date
          timeSlot: { startTime: '10:00', endTime: '10:30' },
          consultationMode: 'in_clinic',
          patientName: 'Ramesh Sharma',
          phone: patientAPhone,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Double-Booking Prevention & Concurrency Protection
  // ---------------------------------------------------------------------------
  describe('Double-Booking Prevention Guardrail', () => {
    it('should REJECT another patient trying to book the exact same doctor and slot with 409 Conflict', async () => {
      // Patient B attempts to book the slot already reserved by Patient A
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patientBToken}`)
        .send({
          doctorId: doctorUserId,
          appointmentDate: futureWorkingDate,
          timeSlot: chosenTimeSlot, // Same slot!
          consultationMode: 'video',
          patientName: 'Meena Kulkarni',
          phone: patientBPhone,
          clinicalReason: 'Second opinion on palliative chemotherapy schedule',
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.error.message, /already been reserved|collision|unavailable/i);
    });

    it('should reflect the booked slot as unavailable in slot query', async () => {
      const res = await request(app).get(`/api/v1/doctors/${doctorUserId}/slots?date=${futureWorkingDate}`);
      assert.equal(res.status, 200);

      const targetSlot = res.body.data.slots.find((s: any) => s.startTime === chosenTimeSlot.startTime);
      assert.ok(targetSlot, 'Target slot should be in returned slots');
      assert.equal(targetSlot.isAvailable, false);
      assert.equal(targetSlot.reason, 'booked');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Patient Ownership & Cross-Patient Security Guardrail
  // ---------------------------------------------------------------------------
  describe('Appointment Retrieval & Cross-Patient Authorization', () => {
    it('should allow Patient A to retrieve their own appointment details', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${createdAppointmentId}`)
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.appointmentNumber.startsWith('VQ-APT-'), true);
      assert.equal(res.body.data.patientDetails.fullName, 'Ramesh Sharma');
    });

    it('should allow assigned doctor to view the appointment', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${createdAppointmentId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    it('CRITICAL: should FORBID Patient B from viewing Patient A appointment by changing ID (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${createdAppointmentId}`)
        .set('Authorization', `Bearer ${patientBToken}`); // Patient B's token!

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.error.message, /access denied|not authorized/i);
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get(`/api/v1/appointments/${createdAppointmentId}`);
      assert.equal(res.status, 401);
    });

    it('should list Patient A appointments in GET /api/v1/appointments/me', async () => {
      const res = await request(app)
        .get('/api/v1/appointments/me')
        .set('Authorization', `Bearer ${patientAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
      assert.equal(res.body.data[0].patientDetails.phone, patientAPhone);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Rescheduling Rules
  // ---------------------------------------------------------------------------
  describe('PATCH /api/v1/appointments/:id/reschedule', () => {
    it('should allow Patient A to reschedule to another available slot on the same day', async () => {
      const newSlot = { startTime: '11:00', endTime: '11:30' };

      const res = await request(app)
        .patch(`/api/v1/appointments/${createdAppointmentId}/reschedule`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          newDate: futureWorkingDate,
          newTimeSlot: newSlot,
          reason: 'Patient requested 11:00 AM slot due to morning diagnostic test',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.timeSlot.startTime, '11:00');
      assert.ok(res.body.data.statusHistory.length >= 2);

      // Verify the old slot (10:00) is now FREED and available again
      const slotQuery = await request(app).get(`/api/v1/doctors/${doctorUserId}/slots?date=${futureWorkingDate}`);
      const oldSlot = slotQuery.body.data.slots.find((s: any) => s.startTime === chosenTimeSlot.startTime);
      assert.equal(oldSlot.isAvailable, true);
    });

    it('should reject Patient B trying to reschedule Patient A appointment (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${createdAppointmentId}/reschedule`)
        .set('Authorization', `Bearer ${patientBToken}`)
        .send({
          newDate: futureWorkingDate,
          newTimeSlot: { startTime: '14:00', endTime: '14:30' },
        });

      assert.equal(res.status, 403);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Doctor Status Transitions & Clinical Notes
  // ---------------------------------------------------------------------------
  describe('PATCH /api/v1/appointments/:id/status (Doctor Consultation Flow)', () => {
    it('should reject non-doctor / patient from updating appointment clinical status with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${createdAppointmentId}/status`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          status: 'in_progress',
        });

      assert.equal(res.status, 403);
    });

    it('should allow assigned doctor to start consultation (status -> in_progress)', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${createdAppointmentId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          status: 'in_progress',
          reason: 'Doctor initiated clinical examination',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'in_progress');
    });

    it('should allow assigned doctor to complete consultation with clinical notes and e-prescription', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${createdAppointmentId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          status: 'completed',
          doctorNotes: 'Patient reviewed for somatic palliative pain. Prescribed titrated analgesics. Recommended hydration and follow-up in 2 weeks.',
          prescription: {
            medicines: [
              {
                name: 'Paracetamol 650mg',
                dosage: '1 tablet',
                frequency: 'TDS (Three times daily)',
                duration: '5 days',
                instructions: 'Take after meals with water',
              },
              {
                name: 'Pregabalin 75mg',
                dosage: '1 capsule',
                frequency: 'HS (Bedtime)',
                duration: '14 days',
                instructions: 'Take at night before sleep',
              },
            ],
            recommendations: 'Continue gentle ambulation. Report any excessive sedation.',
          },
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'completed');
      assert.ok(res.body.data.prescription.medicines.length === 2);
      assert.ok(res.body.data.doctorNotes.includes('somatic palliative pain'));
    });

    it('should reject rescheduling or cancelling an already completed appointment', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${createdAppointmentId}/cancel`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          reason: 'Attempting cancellation of completed visit',
        });

      assert.equal(res.status, 400);
      assert.match(res.body.error.message, /cannot cancel an already completed/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Doctor Schedule & Availability Management
  // ---------------------------------------------------------------------------
  describe('Doctor Schedule Management (PUT /api/v1/doctors/schedule)', () => {
    it('should allow authenticated doctor to update working hours, slot duration, and blackout dates', async () => {
      const res = await request(app)
        .put('/api/v1/doctors/schedule')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          slotDurationMinutes: 45,
          bufferMinutes: 10,
          blackoutDates: ['2026-12-25', '2026-12-26'],
          fees: {
            in_clinic: 1000,
            video: 700,
            home_visit: 1600,
          },
          clinicAddress: 'VivoQuest Executive Care Suite, Pune',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.slotDurationMinutes, 45);
      assert.equal(res.body.data.fees.in_clinic, 1000);
      assert.ok(res.body.data.blackoutDates.includes('2026-12-25'));
    });

    it('should retrieve doctor dashboard stats for authenticated doctor', async () => {
      const res = await request(app)
        .get('/api/v1/doctors/dashboard/stats')
        .set('Authorization', `Bearer ${doctorToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.todayDate);
      assert.ok(typeof res.body.data.completedCount === 'number');
    });

    it('should retrieve doctor appointment list for authenticated doctor', async () => {
      const res = await request(app)
        .get('/api/v1/doctors/dashboard/appointments?view=completed')
        .set('Authorization', `Bearer ${doctorToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Cancellation Rules & Slot Freeing
  // ---------------------------------------------------------------------------
  describe('Cancellation Flow & Slot Freeing', () => {
    let cancelTestAptId: string;
    const cancelSlot = { startTime: '15:00', endTime: '15:30' };

    before(async () => {
      await DoctorAvailability.updateOne({ doctorId: doctorUserId }, { slotDurationMinutes: 30 });
      // Create a fresh appointment to cancel
      const bRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patientBToken}`)
        .send({
          doctorId: doctorUserId,
          appointmentDate: futureWorkingDate,
          timeSlot: cancelSlot,
          consultationMode: 'video',
          patientName: 'Meena Kulkarni',
          phone: patientBPhone,
          clinicalReason: 'Pre-consultation review',
        });
      cancelTestAptId = bRes.body.data.id || bRes.body.data._id;
    });

    it('should allow patient to cancel appointment with reason', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${cancelTestAptId}/cancel`)
        .set('Authorization', `Bearer ${patientBToken}`)
        .send({
          reason: 'Family emergency, will book later next week',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'cancelled');
      assert.equal(res.body.data.cancellationReason, 'Family emergency, will book later next week');
    });

    it('should immediately free the cancelled slot so another patient can book it', async () => {
      // Patient A now books the slot that was previously held by Patient B!
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          doctorId: doctorUserId,
          appointmentDate: futureWorkingDate,
          timeSlot: cancelSlot, // Same slot!
          consultationMode: 'video',
          patientName: 'Ramesh Sharma',
          phone: patientAPhone,
          clinicalReason: 'Follow-up consultation',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.timeSlot.startTime, cancelSlot.startTime);
    });
  });
});
