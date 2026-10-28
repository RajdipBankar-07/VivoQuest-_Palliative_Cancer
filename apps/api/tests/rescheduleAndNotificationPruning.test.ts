import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { NotificationLog } from '../src/models/NotificationLog.js';
import { VisitRescheduleRequest } from '../src/models/VisitRescheduleRequest.js';
import { FieldVisit } from '../src/models/FieldVisit.js';
import { User } from '../src/models/User.js';
import {
  bulkDeleteNotificationLogs,
  deleteNotificationLogsByDateRange,
} from '../src/services/notificationService.js';
import {
  deleteRescheduleRequest,
  bulkDeleteRescheduleRequests,
  clearResolvedRescheduleRequests,
  deleteRescheduleRequestsByDateRange,
} from '../src/services/visitRescheduleService.js';

describe('Reschedule Requests & Notification Logs Permanent Storage Pruning', () => {
  let adminUser: any;
  let testPatient: any;
  let testCaregiver: any;
  let testVisit: any;

  before(async () => {
    await connectDatabase();

    // Create test admin
    adminUser = await User.create({
      phone: '9899112233',
      fullName: 'Storage Prune Admin',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'admin',
      isVerified: true,
      dpdpConsent: {
        consentGranted: true,
        consentTimestamp: new Date(),
        purpose: 'healthcare_services',
        version: '1.0',
      },
    });

    testPatient = await User.create({
      phone: '9899112244',
      fullName: 'Storage Prune Patient',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'patient',
      isVerified: true,
      dpdpConsent: {
        consentGranted: true,
        consentTimestamp: new Date(),
        purpose: 'healthcare_services',
        version: '1.0',
      },
    });

    testCaregiver = await User.create({
      phone: '9899112255',
      fullName: 'Storage Prune Caregiver',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      role: 'caregiver',
      isVerified: true,
      dpdpConsent: {
        consentGranted: true,
        consentTimestamp: new Date(),
        purpose: 'healthcare_services',
        version: '1.0',
      },
    });

    testVisit = await FieldVisit.create({
      visitNumber: 'VQ-PRUNE-001',
      visitType: 'clinical_care',
      status: 'assigned',
      patientId: testPatient._id,
      patientDetails: {
        fullName: testPatient.fullName,
        phone: testPatient.phone,
        address: 'Bandra West, Mumbai',
        city: 'Mumbai',
        pincode: '400050',
      },
      providerId: testCaregiver._id,
      providerName: testCaregiver.fullName,
      providerRole: 'caregiver',
      providerPhone: testCaregiver.phone,
      scheduledDate: '2026-11-01',
      timeSlot: '10:00 - 12:00',
    });
  });

  after(async () => {
    // Cleanup
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    if (testPatient) await User.deleteOne({ _id: testPatient._id });
    if (testCaregiver) await User.deleteOne({ _id: testCaregiver._id });
    if (testVisit) await FieldVisit.deleteOne({ _id: testVisit._id });
    await NotificationLog.deleteMany({ recipientPhone: '9899112244' });
    await VisitRescheduleRequest.deleteMany({ patientId: testPatient?._id });
    await disconnectDatabase();
  });

  describe('Notification Logs Storage Pruning', () => {
    it('1. bulkDeleteNotificationLogs should permanently delete specified logs by IDs', async () => {
      const log1 = await NotificationLog.create({
        recipientPhone: '9899112244',
        recipientName: 'Test Patient',
        channel: 'sms',
        templateId: 'VISIT_STARTED',
        messageBody: 'Bulk delete test 1',
        status: 'sent',
      });
      const log2 = await NotificationLog.create({
        recipientPhone: '9899112244',
        recipientName: 'Test Patient',
        channel: 'whatsapp',
        templateId: 'VISIT_STARTED',
        messageBody: 'Bulk delete test 2',
        status: 'sent',
      });
      const log3 = await NotificationLog.create({
        recipientPhone: '9899112244',
        recipientName: 'Test Patient',
        channel: 'sms',
        templateId: 'VISIT_STARTED',
        messageBody: 'Bulk delete test 3 (keep)',
        status: 'sent',
      });

      const res = await bulkDeleteNotificationLogs([log1._id.toString(), log2._id.toString()]);
      assert.equal(res.deletedCount, 2, 'Should delete exactly 2 logs');

      const found1 = await NotificationLog.findById(log1._id);
      const found2 = await NotificationLog.findById(log2._id);
      const found3 = await NotificationLog.findById(log3._id);

      assert.equal(found1, null, 'Log 1 must be deleted from MongoDB');
      assert.equal(found2, null, 'Log 2 must be deleted from MongoDB');
      assert.ok(found3 !== null, 'Log 3 must remain intact');
    });

    it('2. deleteNotificationLogsByDateRange should delete logs within the start and end range', async () => {
      const oldDate = new Date('2026-05-10T10:00:00Z');
      const inRangeDate = new Date('2026-06-15T10:00:00Z');
      const futureDate = new Date('2026-07-20T10:00:00Z');

      const logOld = await NotificationLog.create({
        recipientPhone: '9899112244',
        recipientName: 'Range Recipient',
        channel: 'sms',
        templateId: 'VISIT_STARTED',
        messageBody: 'Old message',
        status: 'sent',
        createdAt: oldDate,
      });

      const logInRange = await NotificationLog.create({
        recipientPhone: '9899112244',
        recipientName: 'Range Recipient',
        channel: 'sms',
        templateId: 'VISIT_STARTED',
        messageBody: 'In-range message',
        status: 'sent',
        createdAt: inRangeDate,
      });

      const logFuture = await NotificationLog.create({
        recipientPhone: '9899112244',
        recipientName: 'Range Recipient',
        channel: 'sms',
        templateId: 'VISIT_STARTED',
        messageBody: 'Future message',
        status: 'sent',
        createdAt: futureDate,
      });

      const res = await deleteNotificationLogsByDateRange('2026-06-01', '2026-06-30');
      assert.ok(res.deletedCount >= 1, 'Should delete in-range log');

      const checkOld = await NotificationLog.findById(logOld._id);
      const checkInRange = await NotificationLog.findById(logInRange._id);
      const checkFuture = await NotificationLog.findById(logFuture._id);

      assert.ok(checkOld !== null, 'Old log before date range must be preserved');
      assert.equal(checkInRange, null, 'In-range log must be deleted');
      assert.ok(checkFuture !== null, 'Future log after date range must be preserved');
    });
  });

  describe('Visit Reschedule Requests Storage Pruning', () => {
    it('3. deleteRescheduleRequest should permanently delete single request when permanent=true', async () => {
      const req = await VisitRescheduleRequest.create({
        visitId: testVisit._id,
        visitNumber: testVisit.visitNumber,
        patientId: testPatient._id,
        patientName: testPatient.fullName,
        patientPhone: testPatient.phone,
        providerId: testCaregiver._id,
        providerName: testCaregiver.fullName,
        requestedBy: testPatient._id,
        requesterRole: 'patient',
        requesterName: testPatient.fullName,
        originalSchedule: { scheduledDate: '2026-11-01', timeSlot: '10:00 - 12:00' },
        requestedSchedule: { scheduledDate: '2026-11-02', timeSlot: '14:00 - 16:00' },
        reason: 'Single delete test',
        status: 'approved',
      });

      const res = await deleteRescheduleRequest(req._id.toString(), { id: adminUser._id.toString(), role: 'admin' }, true);
      assert.equal(res.success, true);

      const found = await VisitRescheduleRequest.findById(req._id);
      assert.equal(found, null, 'Document must be removed from MongoDB collection');
    });

    it('4. bulkDeleteRescheduleRequests should delete multiple selected requests', async () => {
      const req1 = await VisitRescheduleRequest.create({
        visitId: testVisit._id,
        visitNumber: testVisit.visitNumber,
        patientId: testPatient._id,
        patientName: testPatient.fullName,
        patientPhone: testPatient.phone,
        providerId: testCaregiver._id,
        providerName: testCaregiver.fullName,
        requestedBy: testPatient._id,
        requesterRole: 'patient',
        requesterName: testPatient.fullName,
        originalSchedule: { scheduledDate: '2026-11-01', timeSlot: '10:00 - 12:00' },
        requestedSchedule: { scheduledDate: '2026-11-02', timeSlot: '14:00 - 16:00' },
        reason: 'Bulk delete test 1',
        status: 'rejected',
      });

      const req2 = await VisitRescheduleRequest.create({
        visitId: testVisit._id,
        visitNumber: testVisit.visitNumber,
        patientId: testPatient._id,
        patientName: testPatient.fullName,
        patientPhone: testPatient.phone,
        providerId: testCaregiver._id,
        providerName: testCaregiver.fullName,
        requestedBy: testPatient._id,
        requesterRole: 'patient',
        requesterName: testPatient.fullName,
        originalSchedule: { scheduledDate: '2026-11-01', timeSlot: '10:00 - 12:00' },
        requestedSchedule: { scheduledDate: '2026-11-03', timeSlot: '14:00 - 16:00' },
        reason: 'Bulk delete test 2',
        status: 'cancelled',
      });

      const res = await bulkDeleteRescheduleRequests(
        [req1._id.toString(), req2._id.toString()],
        { id: adminUser._id.toString(), role: 'admin' },
        true
      );
      assert.equal(res.deletedCount, 2, 'Should delete 2 selected requests');

      const found1 = await VisitRescheduleRequest.findById(req1._id);
      const found2 = await VisitRescheduleRequest.findById(req2._id);
      assert.equal(found1, null);
      assert.equal(found2, null);
    });

    it('5. clearResolvedRescheduleRequests should purge resolved requests but preserve pending ones', async () => {
      const pendingReq = await VisitRescheduleRequest.create({
        visitId: testVisit._id,
        visitNumber: testVisit.visitNumber,
        patientId: testPatient._id,
        patientName: testPatient.fullName,
        patientPhone: testPatient.phone,
        providerId: testCaregiver._id,
        providerName: testCaregiver.fullName,
        requestedBy: testPatient._id,
        requesterRole: 'patient',
        requesterName: testPatient.fullName,
        originalSchedule: { scheduledDate: '2026-11-01', timeSlot: '10:00 - 12:00' },
        requestedSchedule: { scheduledDate: '2026-11-04', timeSlot: '14:00 - 16:00' },
        reason: 'Pending active clinical request - MUST NOT BE PURGED',
        status: 'pending',
      });

      const approvedReq = await VisitRescheduleRequest.create({
        visitId: testVisit._id,
        visitNumber: testVisit.visitNumber,
        patientId: testPatient._id,
        patientName: testPatient.fullName,
        patientPhone: testPatient.phone,
        providerId: testCaregiver._id,
        providerName: testCaregiver.fullName,
        requestedBy: testPatient._id,
        requesterRole: 'patient',
        requesterName: testPatient.fullName,
        originalSchedule: { scheduledDate: '2026-11-01', timeSlot: '10:00 - 12:00' },
        requestedSchedule: { scheduledDate: '2026-11-05', timeSlot: '14:00 - 16:00' },
        reason: 'Resolved request to purge',
        status: 'approved',
      });

      const res = await clearResolvedRescheduleRequests(true);
      assert.ok(res.deletedCount >= 1, 'Should delete approved/resolved requests');

      const checkApproved = await VisitRescheduleRequest.findById(approvedReq._id);
      assert.equal(checkApproved, null, 'Approved request must be purged');

      const checkPending = await VisitRescheduleRequest.findById(pendingReq._id);
      assert.ok(checkPending !== null, 'Active pending request MUST be safely preserved');

      // Cleanup pending
      await VisitRescheduleRequest.deleteOne({ _id: pendingReq._id });
    });

    it('6. deleteRescheduleRequestsByDateRange should purge resolved requests within date window but protect pending ones', async () => {
      const inRangeDate = new Date('2026-04-15T12:00:00Z');

      const resolvedInRange = await VisitRescheduleRequest.create({
        visitId: testVisit._id,
        visitNumber: testVisit.visitNumber,
        patientId: testPatient._id,
        patientName: testPatient.fullName,
        patientPhone: testPatient.phone,
        providerId: testCaregiver._id,
        providerName: testCaregiver.fullName,
        requestedBy: testPatient._id,
        requesterRole: 'patient',
        requesterName: testPatient.fullName,
        originalSchedule: { scheduledDate: '2026-11-01', timeSlot: '10:00 - 12:00' },
        requestedSchedule: { scheduledDate: '2026-11-06', timeSlot: '14:00 - 16:00' },
        reason: 'Old resolved in range',
        status: 'rejected',
        createdAt: inRangeDate,
      });

      const pendingInRange = await VisitRescheduleRequest.create({
        visitId: testVisit._id,
        visitNumber: testVisit.visitNumber,
        patientId: testPatient._id,
        patientName: testPatient.fullName,
        patientPhone: testPatient.phone,
        providerId: testCaregiver._id,
        providerName: testCaregiver.fullName,
        requestedBy: testPatient._id,
        requesterRole: 'patient',
        requesterName: testPatient.fullName,
        originalSchedule: { scheduledDate: '2026-11-01', timeSlot: '10:00 - 12:00' },
        requestedSchedule: { scheduledDate: '2026-11-07', timeSlot: '14:00 - 16:00' },
        reason: 'Pending in range - must be preserved',
        status: 'pending',
        createdAt: inRangeDate,
      });

      const res = await deleteRescheduleRequestsByDateRange('2026-04-01', '2026-04-30', true);
      assert.ok(res.deletedCount >= 1, 'Should delete resolved requests in range');

      const checkResolved = await VisitRescheduleRequest.findById(resolvedInRange._id);
      assert.equal(checkResolved, null, 'Resolved in-range request must be purged');

      const checkPending = await VisitRescheduleRequest.findById(pendingInRange._id);
      assert.ok(checkPending !== null, 'Pending in-range request must be preserved');

      // Cleanup
      await VisitRescheduleRequest.deleteOne({ _id: pendingInRange._id });
    });
  });
});
