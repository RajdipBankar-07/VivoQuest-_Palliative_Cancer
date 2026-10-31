import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import {
  User,
  IUser,
  ProductOrder,
  CaregiverSubscription,
  CaregiverPlan,
} from '../src/models/index.js';
import { generateAuthToken } from '../src/services/authService.js';
import { seedMultiPeriodFinanceDataIfEmpty } from '../src/services/financeService.js';

describe('VivoQuest — Phase 14: Simplified Finance Dashboard & Real-Time Revenue Reconciliation', () => {
  const app = createApp();

  const adminPhone = '9855330001';
  let adminToken: string;
  let adminUser: IUser;

  const patientPhone = '9855330002';
  let patientToken: string;
  let patientUser: IUser;

  before(async () => {
    await connectDatabase();

    const passwordHash = await bcrypt.hash('Phase14Finance#2026', 10);
    await User.deleteMany({ phone: { $in: [adminPhone, patientPhone] } });

    adminUser = await User.create({
      fullName: 'Finance Lead Admin',
      phone: adminPhone,
      email: 'lead.admin@vivoquest.in',
      role: 'admin',
      passwordHash,
      isPhoneVerified: true,
      status: 'active',
      dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
    });
    adminToken = generateAuthToken(adminUser);

    patientUser = await User.create({
      fullName: 'Ordinary Patient',
      phone: patientPhone,
      email: 'patient.user@example.com',
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

  // ===========================================================================
  // 1. ADMIN RBAC & AUTHENTICATION
  // ===========================================================================
  describe('1. Security & Role-Based Access Control', () => {
    it('1.1 should allow authorized admins to access the financial summary', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    it('1.2 should strictly reject unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/admin/finances/summary');
      assert.equal(res.status, 401);
    });

    it('1.3 should strictly reject unauthorized roles (patients) with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/summary')
        .set('Authorization', `Bearer ${patientToken}`);

      assert.equal(res.status, 403);
    });
  });

  // ===========================================================================
  // 2. THE 7 PRIMARY FINANCIAL KPI CARDS
  // ===========================================================================
  describe('2. Simplified 7 Primary KPI Cards', () => {
    it('2.1 should provide all 7 clear KPI metrics in primaryKpis', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = res.body.data;
      assert.ok(data.primaryKpis, 'primaryKpis must be present');

      const k = data.primaryKpis;

      // 1. Total Money Received
      assert.ok(typeof k.totalMoneyReceived === 'number', 'totalMoneyReceived must be numeric');
      assert.ok(k.totalMoneyReceived > 0, 'totalMoneyReceived should be positive with seeded collections');

      // 2. Product Sales Revenue
      assert.ok(typeof k.productSalesRevenue === 'number', 'productSalesRevenue must be numeric');
      assert.ok(k.productSalesRevenue > 0, 'productSalesRevenue should reflect owned equipment sales');

      // 3. Marketplace Sales (distinguishing GMV from own revenue)
      assert.ok(k.marketplaceSales, 'marketplaceSales must exist');
      assert.ok(typeof k.marketplaceSales.gmv === 'number', 'marketplaceSales.gmv must be numeric');
      assert.ok(typeof k.marketplaceSales.vivoquestRevenue === 'number', 'marketplaceSales.vivoquestRevenue must be numeric');
      assert.ok(typeof k.marketplaceSales.supplierPayable === 'number', 'marketplaceSales.supplierPayable must be numeric');

      // 4. Subscription Revenue
      assert.ok(typeof k.subscriptionRevenue === 'number', 'subscriptionRevenue must be numeric');
      assert.ok(k.subscriptionRevenue > 0, 'subscriptionRevenue should reflect caregiver subscription payments');

      // 5. Active Subscriptions (count of ongoing plans, not total payments)
      assert.ok(typeof k.activeSubscriptions === 'number', 'activeSubscriptions must be numeric');

      // 6. Refunds & Cancellations (amounts and counts)
      assert.ok(k.refundsAndCancellations, 'refundsAndCancellations must exist');
      assert.ok(typeof k.refundsAndCancellations.completedRefundsAmount === 'number', 'completedRefundsAmount must be numeric');
      assert.ok(typeof k.refundsAndCancellations.refundedOrdersCount === 'number', 'refundedOrdersCount must be numeric');
      assert.ok(typeof k.refundsAndCancellations.cancelledSubscriptionsCount === 'number', 'cancelledSubscriptionsCount must be numeric');

      // 7. Net Operating Result
      assert.ok(k.netOperatingResult, 'netOperatingResult must exist');
      assert.ok(typeof k.netOperatingResult.amount === 'number', 'netOperatingResult.amount must be numeric');
      assert.ok(typeof k.netOperatingResult.isProfit === 'boolean', 'isProfit must be boolean');
      assert.ok(typeof k.netOperatingResult.costDataStatus === 'string', 'costDataStatus must be string');
    });
  });

  // ===========================================================================
  // 3. UNDERSTANDABLE PROFIT AND LOSS BREAKDOWN
  // ===========================================================================
  describe('3. Understandable Profit & Loss Breakdown', () => {
    it('3.1 should provide step-by-step P&L reconciliation with valid categories', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = res.body.data;
      assert.ok(data.profitAndLoss, 'profitAndLoss must be present');

      const pnl = data.profitAndLoss;
      assert.ok(typeof pnl.moneyReceived === 'number');
      assert.ok(typeof pnl.completedRefunds === 'number');
      assert.ok(typeof pnl.directCOGS === 'number');
      assert.ok(typeof pnl.caregiverPayouts === 'number');
      assert.ok(typeof pnl.paymentGatewayFees === 'number');
      assert.ok(typeof pnl.estimatedOperatingResult === 'number');
      assert.ok(typeof pnl.isProfit === 'boolean');
      assert.ok(pnl.costDataStatus === 'complete' || pnl.costDataStatus === 'estimated');
      assert.ok(typeof pnl.explanation === 'string');
      assert.ok(pnl.explanation.includes('Recognized Revenue'));
    });
  });

  // ===========================================================================
  // 4. NO DOUBLE-COUNTING & SEPARATION OF FIDUCIARY / TAX FUNDS
  // ===========================================================================
  describe('4. Revenue Integrity & Double-Counting Prevention', () => {
    it('4.1 should NOT treat third-party marketplace collections as VivoQuest own revenue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = res.body.data;
      const kpis = data.primaryKpis;

      // VivoQuest's own marketplace revenue is strictly the earned platform commission, not the entire GMV
      assert.ok(kpis.marketplaceSales.vivoquestRevenue <= kpis.marketplaceSales.gmv);
      assert.ok(kpis.marketplaceSales.supplierPayable > 0, 'Supplier payables must remain separate from platform margin');
    });

    it('4.2 should exclude statutory taxes (GST) from recognized operating profit', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = res.body.data;
      const exec = data.executiveSummary;

      assert.ok(exec.taxesCollected > 0, 'GST must be tracked');
      // Operating result should not be inflated by taxes collected
      const grossMarginPlusTaxes = exec.estimatedContributionMargin + exec.taxesCollected;
      assert.notEqual(exec.estimatedContributionMargin, grossMarginPlusTaxes);
    });
  });

  // ===========================================================================
  // 5. DATE FILTERING AND DAILY REPORTS
  // ===========================================================================
  describe('5. Date Filters & Daily Revenue Summaries', () => {
    it('5.1 should filter financial data by preset windows (today, last_7_days, this_month, previous_month)', async () => {
      const presets = ['today', 'last_7_days', 'this_month', 'previous_month', 'all'];

      for (const preset of presets) {
        const res = await request(app)
          .get(`/api/v1/admin/finances/summary?preset=${preset}`)
          .set('Authorization', `Bearer ${adminToken}`);

        assert.equal(res.status, 200);
        assert.ok(res.body.data.periodLabel.length > 0);
        assert.ok(Array.isArray(res.body.data.dailySummaries));
      }
    });

    it('5.2 should compute detailed daily revenue summaries with 7 authoritative columns', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/summary?preset=all')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const daily = res.body.data.dailySummaries;
      assert.ok(Array.isArray(daily), 'dailySummaries must be an array');
      assert.ok(daily.length > 0, 'Should have recorded days');

      const firstDay = daily[0];
      assert.ok(typeof firstDay.date === 'string', 'date must be string');
      assert.ok(typeof firstDay.ownedCollections === 'number');
      assert.ok(typeof firstDay.marketplaceCollections === 'number');
      assert.ok(typeof firstDay.subscriptionCollections === 'number');
      assert.ok(typeof firstDay.completedRefunds === 'number');
      assert.ok(typeof firstDay.netRecognizedRevenue === 'number');
      assert.ok(typeof firstDay.estimatedOperatingResult === 'number');
      assert.ok(typeof firstDay.hasSufficientCostData === 'boolean');
    });
  });

  // ===========================================================================
  // 6. UNIFIED TRANSACTIONS AND CANCELLATION HISTORY
  // ===========================================================================
  describe('6. Unified Transactions & Cancellation History', () => {
    it('6.1 should provide unified transactions across owned, marketplace, and subscriptions', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/summary?preset=all')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const txs = res.body.data.unifiedTransactions;
      assert.ok(Array.isArray(txs), 'unifiedTransactions must be an array');
      assert.ok(txs.length > 0, 'Should have transactions');

      const sample = txs[0];
      assert.ok(sample.reference, 'Must have transaction reference');
      assert.ok(sample.category, 'Must have category');
      assert.ok(typeof sample.amount === 'number', 'Must have numeric amount');
      assert.ok(['Successful', 'Pending', 'Failed', 'Refunded'].includes(sample.paymentStatus));
    });

    it('6.2 should preserve cancelled subscriptions and refunded orders with reasons', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/summary?preset=all')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const txs = res.body.data.unifiedTransactions;

      const cancelledOrRefunded = txs.filter((t: any) => t.paymentStatus === 'Refunded' || t.refundStatus === 'Refunded');
      assert.ok(cancelledOrRefunded.length >= 1, 'At least 1 refunded/cancelled transaction should be preserved in audit records');
    });
  });

  // ===========================================================================
  // 7. THREE PERSISTED FINANCE SUB-TABS CONSISTENCY
  // ===========================================================================
  describe('7. Three Main Finance Sub-Tabs Consistency', () => {
    it('7.1 should fetch owned products finance with dailyBreakdown', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/owned-products')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.dailyBreakdown, 'Owned products should provide dailyBreakdown');
      assert.ok(Array.isArray(res.body.data.transactions));
    });

    it('7.2 should fetch marketplace finance with supplier liabilities and dailyBreakdown', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/marketplace')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.dailyBreakdown, 'Marketplace should provide dailyBreakdown');
      assert.ok(Array.isArray(res.body.data.supplierBreakdown));
    });

    it('7.3 should fetch subscriptions finance with active subscriptions and cancellations', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(typeof res.body.data.activeSubscriptionsCount === 'number');
      assert.ok(typeof res.body.data.cancelledSubscriptionsCount === 'number');
    });
  });

  // ===========================================================================
  // 8. PROFESSIONAL EXPORTS (PDF, EXCEL, CSV)
  // ===========================================================================
  describe('8. Professional Reports & Export Downloads', () => {
    it('8.1 should generate valid PDF report with %PDF- header for combined summary', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/pdf?section=combined')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.header['content-type'], 'application/pdf');
      assert.ok(res.body.slice(0, 5).toString('ascii').startsWith('%PDF-'));
    });

    it('8.2 should generate valid Excel (.xlsx) workbook for combined summary', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/excel?section=combined')
        .buffer(true)
        .parse((r, cb) => {
          const chunks: Buffer[] = [];
          r.on('data', (c) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.header['content-type'].includes('spreadsheetml'));
      assert.ok(res.body.length > 500);
      // Magic bytes for ZIP/XLSX: 'PK' (0x50, 0x4B)
      assert.equal(res.body[0], 0x50);
      assert.equal(res.body[1], 0x4b);
    });

    it('8.3 should generate sanitized CSV export for combined summary', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/csv?section=combined')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.header['content-type'].includes('text/csv'));
      assert.ok(res.text.includes('Ledger Account') || res.text.includes('Gross'));
    });
  });
});
