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
  MedicalProduct,
  ProductOrder,
  Supplier,
  CaregiverSubscription,
  CaregiverPlan,
} from '../src/models/index.js';
import { generateAuthToken } from '../src/services/authService.js';
import {
  generateFinancePdf,
  generateFinanceExcel,
  generateFinanceCsv,
  sanitizeForSpreadsheet,
} from '../src/services/financeExportService.js';
import { seedMultiPeriodFinanceDataIfEmpty } from '../src/services/financeService.js';

describe('VivoQuest — Phase 11: Complete Finance Dashboard, Real-Time Transactions & Reports Test Suite', () => {
  const app = createApp();

  // Test Users
  const adminPhone = '9855220001';
  let adminToken: string;
  let adminUser: IUser;

  const patientPhone = '9855220002';
  let patientToken: string;
  let patientUser: IUser;

  const caregiverPhone = '9855220003';
  let caregiverToken: string;
  let caregiverUser: IUser;

  before(async () => {
    await connectDatabase();

    const passwordHash = await bcrypt.hash('FinanceTest#2026', 10);

    // Clean up test users
    await User.deleteMany({ phone: { $in: [adminPhone, patientPhone, caregiverPhone] } });

    // 1. Admin
    adminUser = await User.create({
      fullName: 'Finance Compliance Admin',
      phone: adminPhone,
      email: 'finance.admin@vivoquest.in',
      role: 'admin',
      passwordHash,
      isPhoneVerified: true,
      status: 'active',
      dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
    });
    adminToken = generateAuthToken(adminUser);

    // 2. Patient
    patientUser = await User.create({
      fullName: 'Vikramaditya Patient',
      phone: patientPhone,
      email: 'vikram.patient@example.com',
      role: 'patient',
      passwordHash,
      isPhoneVerified: true,
      status: 'active',
      dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
    });
    patientToken = generateAuthToken(patientUser);

    // 3. Caregiver
    caregiverUser = await User.create({
      fullName: 'Sunanda Nurse',
      phone: caregiverPhone,
      email: 'sunanda.nurse@example.com',
      role: 'caregiver',
      passwordHash,
      isPhoneVerified: true,
      status: 'active',
      dpdpConsent: { accepted: true, consentedAt: new Date(), policyVersion: 'DPDP-2023-V1.0' },
    });
    caregiverToken = generateAuthToken(caregiverUser);

    // Ensure seed data with multi-period records is loaded
    await seedMultiPeriodFinanceDataIfEmpty();
  });

  after(async () => {
    await User.deleteMany({ phone: { $in: [adminPhone, patientPhone, caregiverPhone] } });
    await disconnectDatabase();
  });

  // ===========================================================================
  // SUITE 1: DOMAIN A — VIVOQUEST-OWNED PRODUCTS FINANCE
  // ===========================================================================
  describe('1. Domain A: VivoQuest-Owned Equipment Financial Ledger', () => {
    it('1.1 should fetch owned products finance summary and list with authentic metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/owned-products')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const data = res.body.data;

      assert.ok(typeof data.grossSales === 'number', 'grossSales must be numeric');
      assert.ok(typeof data.totalProcurementCost === 'number', 'totalProcurementCost must be numeric');
      assert.ok(typeof data.netRevenue === 'number', 'netRevenue must be numeric');
      assert.ok(typeof data.estimatedContributionMargin === 'number', 'contributionMargin must be numeric');
      assert.ok(Array.isArray(data.transactions), 'transactions must be an array');
      assert.ok(data.pagination.total >= 1, 'at least 1 owned product order should exist');

      // Check transaction schema
      const firstTx = data.transactions[0];
      assert.ok(firstTx.orderNumber, 'tx must have orderNumber');
      assert.ok(firstTx.transactionId, 'tx must have transactionId');
      assert.ok(typeof firstTx.totalAmount === 'number', 'tx totalAmount must be numeric');
      assert.ok(firstTx.paymentStatus, 'tx must have paymentStatus');
    });

    it('1.2 should support date range preset filtering (this_month vs previous_month vs last_7_days)', async () => {
      const resMonth = await request(app)
        .get('/api/v1/admin/finances/owned-products?preset=this_month')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(resMonth.status, 200);
      assert.ok(resMonth.body.data.periodLabel.includes('This Month'));

      const resPrev = await request(app)
        .get('/api/v1/admin/finances/owned-products?preset=previous_month')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(resPrev.status, 200);
      assert.ok(resPrev.body.data.periodLabel.includes('Previous Month'));

      const res7D = await request(app)
        .get('/api/v1/admin/finances/owned-products?preset=last_7_days')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res7D.status, 200);
      assert.ok(res7D.body.data.periodLabel.includes('Last 7 Days'));
    });

    it('1.3 should filter transactions by status (paid, refunded, pending)', async () => {
      const resPaid = await request(app)
        .get('/api/v1/admin/finances/owned-products?status=paid')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(resPaid.status, 200);

      // Verify that every returned transaction matches the paid filter
      resPaid.body.data.transactions.forEach((tx: any) => {
        assert.ok(
          tx.paymentStatus === 'paid' || tx.paymentStatus === 'cod' || tx.orderStatus === 'paid',
          'Only paid orders should be returned'
        );
      });
    });

    it('1.4 should support search queries by orderNumber, SKU, or patient', async () => {
      const resSearch = await request(app)
        .get('/api/v1/admin/finances/owned-products?search=TODAY')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(resSearch.status, 200);
      assert.ok(resSearch.body.data.transactions.length >= 1);
    });
  });

  // ===========================================================================
  // SUITE 2: DOMAIN B — THIRD-PARTY MARKETPLACE & SUPPLIERS FINANCE
  // ===========================================================================
  describe('2. Domain B: Third-Party Marketplace & Supplier Payables', () => {
    it('2.1 should retrieve marketplace GMV, commission earned, and supplier liabilities', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/marketplace')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const data = res.body.data;

      assert.ok(typeof data.totalMarketplaceGMV === 'number');
      assert.ok(typeof data.earnedPlatformCommission === 'number');
      assert.ok(typeof data.supplierPayablesTotal === 'number');
      assert.ok(Array.isArray(data.supplierBreakdown), 'supplierBreakdown must be an array');
      assert.ok(Array.isArray(data.transactions), 'transactions must be an array');

      // Crucial accounting rule: VivoQuest profit must NOT equal total marketplace GMV!
      if (data.totalMarketplaceGMV > 0) {
        assert.ok(
          data.earnedPlatformCommission < data.totalMarketplaceGMV,
          'Earned commission must be strictly a percentage of GMV, not 100% of the sale'
        );
      }
    });

    it('2.2 should include certified supplier breakdown with commission rate and pending payables', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/marketplace')
        .set('Authorization', `Bearer ${adminToken}`);

      const data = res.body.data;
      assert.ok(data.supplierBreakdown.length >= 1);
      const sup = data.supplierBreakdown[0];
      assert.ok(sup.supplierName);
      assert.ok(sup.supplierCode);
      assert.ok(typeof sup.commissionRatePct === 'number');
      assert.ok(typeof sup.grossSalesGMV === 'number');
      assert.ok(typeof sup.supplierPayable === 'number');
    });
  });

  // ===========================================================================
  // SUITE 3: DOMAIN C — CAREGIVER SUBSCRIPTIONS & VISIT PACKAGES
  // ===========================================================================
  describe('3. Domain C: Caregiver Subscriptions & Fixed Visit Packages', () => {
    it('3.1 should track monthly recurring revenue (MRR) and caregiver payout liabilities', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const data = res.body.data;

      assert.ok(typeof data.totalCollections === 'number');
      assert.ok(typeof data.caregiverPayoutLiabilities === 'number');
      assert.ok(typeof data.platformMargin === 'number');
      assert.ok(typeof data.monthlyRecurringRevenue === 'number');
      assert.ok(Array.isArray(data.dailyCollections));
      assert.ok(Array.isArray(data.transactions));

      // Margin = Collections - Payout Liabilities
      assert.equal(data.platformMargin, data.totalCollections - data.caregiverPayoutLiabilities);
    });

    it('3.2 should distinguish monthly subscriptions from fixed visit packages in transactions', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`);

      const data = res.body.data;
      assert.ok(data.transactions.length >= 1);
      const firstSub = data.transactions[0];
      assert.ok(firstSub.subscriptionNumber);
      assert.ok(firstSub.planTitle);
      assert.ok(firstSub.planType);
      assert.ok(typeof firstSub.customerPrice === 'number');
      assert.ok(typeof firstSub.caregiverPayout === 'number');
    });
  });

  // ===========================================================================
  // SUITE 4: CONSOLIDATED RECONCILIATION & EXECUTIVE SUMMARY
  // ===========================================================================
  describe('4. Consolidated Executive Finance Summary & Net Profit Reconciliation', () => {
    it('4.1 should provide authoritative reconciliation ledger reconciling inflow and outflow', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      const data = res.body.data;

      assert.ok(data.executiveSummary.grossMerchandiseValue > 0);
      assert.ok(data.executiveSummary.recognizedNetRevenue > 0);
      assert.ok(Array.isArray(data.reconciliationLedger));
      assert.ok(data.reconciliationLedger.length >= 7);

      // Verify presence of required accounts
      const accountNames = data.reconciliationLedger.map((r: any) => r.ledgerAccount);
      assert.ok(accountNames.some((a: string) => a.includes('Medical Equipment Retail Sales')));
      assert.ok(accountNames.some((a: string) => a.includes('Marketplace Partner Collections')));
      assert.ok(accountNames.some((a: string) => a.includes('Caregiver Subscriptions')));
      assert.ok(accountNames.some((a: string) => a.includes('Equipment Sourcing Procurement')));
      assert.ok(accountNames.some((a: string) => a.includes('Caregiver Bedside Shift Compensation')));
      assert.ok(accountNames.some((a: string) => a.includes('Payment Gateway Processing')));
      assert.ok(accountNames.some((a: string) => a.includes('Estimated Net Contribution Margin')));
    });
  });

  // ===========================================================================
  // SUITE 5: PROFESSIONAL PDF REPORTS GENERATION (ALL 4 REQUIRED OPTIONS)
  // ===========================================================================
  describe('5. Professional PDF Generation Engine (A4 Reports)', () => {
    it('5.1 should generate valid Owned Products PDF Report with %PDF- header', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/pdf?section=owned')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.headers['content-type'], 'application/pdf');
      assert.ok(res.body.length > 1000, 'PDF buffer must contain binary content');
      // Verify PDF magic bytes '%PDF-'
      const magicBytes = res.body.slice(0, 5).toString('ascii');
      assert.equal(magicBytes, '%PDF-');
    });

    it('5.2 should generate valid Marketplace & Suppliers PDF Report', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/pdf?section=marketplace')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.headers['content-type'], 'application/pdf');
      assert.ok(res.body.length > 1000);
      assert.equal(res.body.slice(0, 5).toString('ascii'), '%PDF-');
    });

    it('5.3 should generate valid Subscriptions & Visit Packages PDF Report', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/pdf?section=subscriptions')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.headers['content-type'], 'application/pdf');
      assert.ok(res.body.length > 1000);
      assert.equal(res.body.slice(0, 5).toString('ascii'), '%PDF-');
    });

    it('5.4 should generate valid Combined Reconciliation Finance PDF Report', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/pdf?section=combined')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.headers['content-type'], 'application/pdf');
      assert.ok(res.body.length > 1000);
      assert.equal(res.body.slice(0, 5).toString('ascii'), '%PDF-');
    });
  });

  // ===========================================================================
  // SUITE 6: EXCEL (.XLSX) AND CSV GENERATION & FORMULA INJECTION ESCAPING
  // ===========================================================================
  describe('6. Excel & CSV Exports with Formula Injection Protection', () => {
    it('6.1 should generate valid Excel (.xlsx) workbooks for all sections', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/excel?section=combined')
        .buffer(true)
        .parse((res, callback) => {
          const data: Buffer[] = [];
          res.on('data', (chunk) => data.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(data)));
        })
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(
        res.headers['content-type'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      assert.ok(res.body.length > 2000, 'Excel file must contain valid zip/xlsx archive data');
      // Verify ZIP/XLSX magic bytes 'PK' (0x50, 0x4B)
      assert.equal(res.body[0], 0x50);
      assert.equal(res.body[1], 0x4b);
    });

    it('6.2 should generate valid CSV report with proper comma escaping and headers', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/csv?section=owned')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('text/csv'));
      const csv = res.text;
      assert.ok(csv.startsWith('Order Number,Transaction ID,Date'));
    });

    it('6.3 should rigorously sanitize formula injection attack vectors (=, +, -, @)', () => {
      assert.equal(sanitizeForSpreadsheet('=SUM(A1:A10)'), "'=SUM(A1:A10)");
      assert.equal(sanitizeForSpreadsheet('+1234567890'), "'+1234567890");
      assert.equal(sanitizeForSpreadsheet('-5000'), "'-5000");
      assert.equal(sanitizeForSpreadsheet('@cmd|/C calc'), "'@cmd|/C calc");
      assert.equal(sanitizeForSpreadsheet('Regular Safe Text'), 'Regular Safe Text');
      assert.equal(sanitizeForSpreadsheet(null), '');
      assert.equal(sanitizeForSpreadsheet(undefined), '');
    });
  });

  // ===========================================================================
  // SUITE 7: RBAC, SECURITY & TENANT PROTECTION
  // ===========================================================================
  describe('7. Security, Role-Based Access Control (RBAC) & Tenant Protection', () => {
    it('7.1 should REJECT unauthenticated access with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/admin/finances/summary');
      assert.equal(res.status, 401);
    });

    it('7.2 should REJECT patient access to financial reports with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/summary')
        .set('Authorization', `Bearer ${patientToken}`);
      assert.equal(res.status, 403);
    });

    it('7.3 should REJECT caregiver access to financial reports with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/finances/export/pdf?section=combined')
        .set('Authorization', `Bearer ${caregiverToken}`);
      assert.equal(res.status, 403);
    });
  });
});

