import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User, IUser } from '../src/models/index.js';
import { generateAuthToken } from '../src/services/authService.js';
import { seedMultiPeriodFinanceDataIfEmpty } from '../src/services/financeService.js';

describe('VivoQuest — Highcharts Profit & Loss Analytics API Verification', () => {
  const app = createApp();

  const adminPhone = '9855330011';
  let adminToken: string;
  let adminUser: IUser;

  const patientPhone = '9855330012';
  let patientToken: string;
  let patientUser: IUser;

  before(async () => {
    await connectDatabase();

    const passwordHash = await bcrypt.hash('Phase14Finance#2026', 10);
    await User.deleteMany({ phone: { $in: [adminPhone, patientPhone] } });

    adminUser = await User.create({
      fullName: 'Analytics Lead Admin',
      phone: adminPhone,
      email: 'analytics.lead@vivoquest.in',
      role: 'admin',
      passwordHash,
      isPhoneVerified: true,
      status: 'active',
      dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
    });
    adminToken = generateAuthToken(adminUser);

    patientUser = await User.create({
      fullName: 'Ordinary Patient User',
      phone: patientPhone,
      email: 'patient.analytics@example.com',
      role: 'patient',
      passwordHash,
      isPhoneVerified: true,
      status: 'active',
      dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
    });
    patientToken = generateAuthToken(patientUser);

    await seedMultiPeriodFinanceDataIfEmpty();
  });

  after(async () => {
    await User.deleteMany({ phone: { $in: [adminPhone, patientPhone] } });
    await disconnectDatabase();
  });

  it('1. GET /api/v1/admin/finances/analytics rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/admin/finances/analytics');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('2. GET /api/v1/admin/finances/analytics rejects patient role with 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/finances/analytics')
      .set('Authorization', `Bearer ${patientToken}`);
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('3. GET /api/v1/admin/finances/analytics returns 200 with KPI summary and series for authorized admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/finances/analytics?preset=all&grouping=daily&category=overview')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data, 'Expected data object in response');

    const { kpis, series, category, grouping } = res.body.data;
    assert.equal(category, 'overview');
    assert.equal(grouping, 'daily');
    assert.ok(Array.isArray(series));
    assert.ok(series.length > 0, 'Expected at least one data point in series');

    // KPI validations
    assert.equal(typeof kpis.totalRevenue, 'number');
    assert.equal(typeof kpis.totalExpenses, 'number');
    assert.equal(typeof kpis.netProfit, 'number');
    assert.equal(typeof kpis.netLoss, 'number');
    assert.equal(typeof kpis.marginPct, 'number');
    assert.ok(kpis.totalRevenue > 0, 'Total revenue should be greater than 0');
    assert.equal(kpis.netOperatingResult, kpis.totalRevenue - kpis.totalExpenses);

    // First series point structure
    const pt = series[0];
    assert.ok(pt.period, 'Period should be defined');
    assert.equal(typeof pt.revenue, 'number');
    assert.equal(typeof pt.expenses, 'number');
    assert.equal(typeof pt.netProfitOrLoss, 'number');
    assert.equal(typeof pt.isProfit, 'boolean');
    assert.equal(pt.isProfit, pt.netProfitOrLoss >= 0);
  });

  it('4. Correctly categorizes and aggregates Owned Products stream', async () => {
    const res = await request(app)
      .get('/api/v1/admin/finances/analytics?preset=all&grouping=daily&category=owned')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    const { kpis, series, category } = res.body.data;
    assert.equal(category, 'owned');
    assert.ok(kpis.totalRevenue > 0);
    assert.ok(kpis.totalExpenses > 0);
    assert.equal(kpis.netOperatingResult, kpis.totalRevenue - kpis.totalExpenses);
    assert.ok(series.length > 0);
  });

  it('5. Correctly categorizes and aggregates Marketplace Partners stream', async () => {
    const res = await request(app)
      .get('/api/v1/admin/finances/analytics?preset=all&grouping=daily&category=marketplace')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    const { kpis, category } = res.body.data;
    assert.equal(category, 'marketplace');
    // Marketplace revenue is strictly commission
    assert.ok(kpis.totalRevenue >= 0);
    assert.ok(kpis.totalExpenses >= 0);
  });

  it('6. Correctly categorizes and aggregates Caregiver Subscriptions stream', async () => {
    const res = await request(app)
      .get('/api/v1/admin/finances/analytics?preset=all&grouping=daily&category=subscriptions')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    const { kpis, series, category } = res.body.data;
    assert.equal(category, 'subscriptions');
    assert.ok(kpis.totalRevenue > 0);
    assert.ok(series.length > 0);
  });

  it('7. Supports Weekly grouping aggregation', async () => {
    const res = await request(app)
      .get('/api/v1/admin/finances/analytics?preset=all&grouping=weekly&category=overview')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    const { grouping, series } = res.body.data;
    assert.equal(grouping, 'weekly');
    assert.ok(series.length > 0);
    series.forEach((pt: any) => {
      assert.ok(pt.period.startsWith('Week of'));
    });
  });

  it('8. Supports Monthly grouping aggregation', async () => {
    const res = await request(app)
      .get('/api/v1/admin/finances/analytics?preset=all&grouping=monthly&category=overview')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    const { grouping, series } = res.body.data;
    assert.equal(grouping, 'monthly');
    assert.ok(series.length > 0);
  });

  it('9. Supports Yearly grouping aggregation', async () => {
    const res = await request(app)
      .get('/api/v1/admin/finances/analytics?preset=all&grouping=yearly&category=overview')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    const { grouping, series } = res.body.data;
    assert.equal(grouping, 'yearly');
    assert.ok(series.length >= 1);
  });

  it('10. Supports Custom date range query', async () => {
    const res = await request(app)
      .get('/api/v1/admin/finances/analytics?preset=custom&startDate=2026-10-01&endDate=2026-10-31&grouping=daily&category=overview')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    const { series } = res.body.data;
    series.forEach((pt: any) => {
      assert.ok(pt.dateKey >= '2026-10-01' && pt.dateKey <= '2026-10-31');
    });
  });

  it('11. Consolidated overview equals sum of stream revenues and expenses without double-counting', async () => {
    const [resOverview, resOwned, resMarketplace, resSubs] = await Promise.all([
      request(app).get('/api/v1/admin/finances/analytics?preset=all&grouping=daily&category=overview').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/v1/admin/finances/analytics?preset=all&grouping=daily&category=owned').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/v1/admin/finances/analytics?preset=all&grouping=daily&category=marketplace').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/v1/admin/finances/analytics?preset=all&grouping=daily&category=subscriptions').set('Authorization', `Bearer ${adminToken}`),
    ]);

    const totalRev = resOverview.body.data.kpis.totalRevenue;
    const sumStreamsRev =
      resOwned.body.data.kpis.totalRevenue +
      resMarketplace.body.data.kpis.totalRevenue +
      resSubs.body.data.kpis.totalRevenue;

    assert.equal(totalRev, sumStreamsRev, 'Consolidated revenue must match sum of streams');

    const totalExp = resOverview.body.data.kpis.totalExpenses;
    const sumStreamsExp =
      resOwned.body.data.kpis.totalExpenses +
      resMarketplace.body.data.kpis.totalExpenses +
      resSubs.body.data.kpis.totalExpenses;

    assert.equal(totalExp, sumStreamsExp, 'Consolidated expenses must match sum of streams');
  });
});

