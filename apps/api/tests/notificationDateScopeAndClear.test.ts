import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { NotificationLog } from '../src/models/NotificationLog.js';
import {
  listNotificationLogs,
  clearPastNotificationLogs,
  clearAllNotificationLogs,
} from '../src/services/notificationService.js';

describe('Notification Logs Date Scope & Pruning Test Suite', () => {
  before(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vivoquest_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  after(async () => {
    // Clean up test documents
    await NotificationLog.deleteMany({ recipientPhone: { $in: ['9999000001', '9999000002'] } });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test('1. Should correctly partition notifications into today vs. past', async () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Create a past notification
    const pastLog = await NotificationLog.create({
      recipientPhone: '9999000001',
      recipientName: 'Test Past Recipient',
      channel: 'sms',
      templateId: 'VISIT_COMPLETED',
      messageBody: 'Past visit completed notification',
      status: 'simulated',
      provider: 'simulated_gateway',
      createdAt: twoDaysAgo,
    });

    // Create a today notification
    const todayLog = await NotificationLog.create({
      recipientPhone: '9999000002',
      recipientName: 'Test Today Recipient',
      channel: 'sms',
      templateId: 'VISIT_STARTED',
      messageBody: 'Today visit started notification',
      status: 'simulated',
      provider: 'simulated_gateway',
      createdAt: now,
    });

    // Verify 'today' scope only retrieves today's log
    const todayResult = await listNotificationLogs({
      dateScope: 'today',
      search: '999900000',
    });
    const todayIds = todayResult.logs.map((l: any) => l._id.toString());
    assert.ok(todayIds.includes(todayLog._id.toString()), 'Today scope must include today notification');
    assert.ok(!todayIds.includes(pastLog._id.toString()), 'Today scope must NOT include past notification');

    // Verify 'past' scope only retrieves past log
    const pastResult = await listNotificationLogs({
      dateScope: 'past',
      search: '999900000',
    });
    const pastIds = pastResult.logs.map((l: any) => l._id.toString());
    assert.ok(pastIds.includes(pastLog._id.toString()), 'Past scope must include past notification');
    assert.ok(!pastIds.includes(todayLog._id.toString()), 'Past scope must NOT include today notification');

    // Verify 'all' scope retrieves both
    const allResult = await listNotificationLogs({
      dateScope: 'all',
      search: '999900000',
    });
    const allIds = allResult.logs.map((l: any) => l._id.toString());
    assert.ok(allIds.includes(todayLog._id.toString()), 'All scope must include today notification');
    assert.ok(allIds.includes(pastLog._id.toString()), 'All scope must include past notification');
  });

  test('2. clearPastNotificationLogs should permanently delete logs older than today while keeping today intact', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 26 * 60 * 60 * 1000);

    // Create past notification
    const pastLog = await NotificationLog.create({
      recipientPhone: '9999000001',
      recipientName: 'Past Auto Delete Test',
      channel: 'whatsapp',
      templateId: 'VISIT_STARTED',
      messageBody: 'Yesterday notification',
      status: 'sent',
      createdAt: yesterday,
    });

    // Create today notification
    const todayLog = await NotificationLog.create({
      recipientPhone: '9999000002',
      recipientName: 'Today Keep Test',
      channel: 'whatsapp',
      templateId: 'VISIT_STARTED',
      messageBody: 'Today notification',
      status: 'sent',
      createdAt: now,
    });

    // Run clearPastNotificationLogs
    const clearResult = await clearPastNotificationLogs();
    assert.ok(clearResult.deletedCount >= 1, 'Should have deleted at least the past log');

    // Verify past log is gone
    const checkPast = await NotificationLog.findById(pastLog._id);
    assert.equal(checkPast, null, 'Past log must be permanently deleted from database');

    // Verify today log is still intact
    const checkToday = await NotificationLog.findById(todayLog._id);
    assert.ok(checkToday !== null, 'Today log must remain intact');
  });

  test('3. clearAllNotificationLogs should permanently delete all notification logs', async () => {
    // Create a new log
    const testLog = await NotificationLog.create({
      recipientPhone: '9999000002',
      recipientName: 'Wipe All Test',
      channel: 'in_app',
      templateId: 'DAILY_CARE_REPORT_SUBMITTED',
      messageBody: 'Report submitted test',
      status: 'sent',
    });

    const purgeResult = await clearAllNotificationLogs();
    assert.ok(purgeResult.deletedCount >= 1, 'Should delete all logs');

    const remainingCount = await NotificationLog.countDocuments({});
    assert.equal(remainingCount, 0, 'Database collection must have 0 notification logs after clearAll');
  });
});
