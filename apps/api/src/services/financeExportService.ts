import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import {
  FinanceDateFilter,
  getOwnedProductsFinance,
  getMarketplaceFinance,
  getSubscriptionsFinance,
  getCombinedFinanceSummary,
  OwnedProductsFinanceSummary,
  MarketplaceFinanceSummary,
  SubscriptionsFinanceSummary,
  CombinedFinanceSummary,
} from './financeService.js';

// =============================================================================
// FORMULA INJECTION ESCAPING UTILITY
// =============================================================================

export const sanitizeForSpreadsheet = (val: any): string => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // If first character is risky formula starter, prepend single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
};

const formatINR = (amount: number): string => {
  return `₹${(amount || 0).toLocaleString('en-IN')}`;
};

// =============================================================================
// PDF GENERATION ENGINE
// =============================================================================

export type FinanceExportSection = 'owned' | 'marketplace' | 'subscriptions' | 'combined';

export const generateFinancePdf = async (
  section: FinanceExportSection,
  filter: FinanceDateFilter
): Promise<Buffer> => {
  // Landscape A4 for wide financial tables: [841.89, 595.28]
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 36,
    bufferPages: true,
    info: {
      Title: `VivoQuest Financial Report - ${section.toUpperCase()}`,
      Author: 'VivoQuest Platform Governance',
      Subject: 'Executive Finance & Reconciliation Audit',
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const pdfPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const primaryNavy = '#17324D';
  const tealAccent = '#0D9488';
  const slateDark = '#0F172A';
  const slateMuted = '#64748B';
  const borderLight = '#E2E8F0';
  const bgSubtle = '#F8FAFC';

  // Helper: Draw Report Header
  const drawReportHeader = (title: string, periodLabel: string) => {
    // Top banner bar
    doc.rect(36, 36, doc.page.width - 72, 54).fill(primaryNavy);

    // Brand Name
    doc.fontSize(16).fillColor('#FFFFFF').font('Helvetica-Bold')
      .text('VivoQuest Care Marketplace', 50, 48);

    doc.fontSize(8).fillColor('#94A3B8').font('Helvetica')
      .text('Care at Kitchen Table • Authoritative Financial Ledger', 50, 68);

    // Title & Period Right-Aligned
    doc.fontSize(12).fillColor('#FFFFFF').font('Helvetica-Bold')
      .text(title, doc.page.width - 350, 46, { width: 300, align: 'right' });

    doc.fontSize(8).fillColor(tealAccent).font('Helvetica-Bold')
      .text(`Period: ${periodLabel} • Generated: ${new Date().toLocaleString('en-IN')}`, doc.page.width - 350, 64, {
        width: 300,
        align: 'right',
      });

    doc.y = 105;
  };

  // Helper: Draw KPI Card Strip
  const drawKpiCards = (
    cards: Array<{ label: string; value: string; sub?: string; highlight?: boolean }>
  ) => {
    const startY = doc.y;
    const cardWidth = (doc.page.width - 72 - (cards.length - 1) * 10) / cards.length;
    const cardHeight = 52;

    cards.forEach((c, idx) => {
      const x = 36 + idx * (cardWidth + 10);
      doc.roundedRect(x, startY, cardWidth, cardHeight, 6)
        .fillAndStroke(c.highlight ? '#ECFDF5' : bgSubtle, c.highlight ? '#A7F3D0' : borderLight);

      doc.fontSize(7.5).fillColor(slateMuted).font('Helvetica')
        .text(c.label.toUpperCase(), x + 8, startY + 8, { width: cardWidth - 16, lineBreak: false });

      doc.fontSize(12).fillColor(c.highlight ? '#065F46' : slateDark).font('Helvetica-Bold')
        .text(c.value, x + 8, startY + 22, { width: cardWidth - 16, lineBreak: false });

      if (c.sub) {
        doc.fontSize(6.5).fillColor(slateMuted).font('Helvetica')
          .text(c.sub, x + 8, startY + 38, { width: cardWidth - 16, lineBreak: false });
      }
    });

    doc.y = startY + cardHeight + 15;
  };

  // Helper: Draw Table
  const drawTable = (
    headers: Array<{ label: string; width: number; align?: 'left' | 'right' | 'center' }>,
    rows: string[][],
    emptyMsg = 'No transactions found in this reporting window.'
  ) => {
    const tableWidth = doc.page.width - 72;
    const rowHeight = 20;
    const headerHeight = 22;

    const renderHeader = (y: number) => {
      doc.rect(36, y, tableWidth, headerHeight).fill('#1E293B');
      let curX = 42;
      headers.forEach((h) => {
        doc.fontSize(7.5).fillColor('#FFFFFF').font('Helvetica-Bold')
          .text(h.label, curX, y + 6, {
            width: h.width,
            align: h.align || 'left',
            lineBreak: false,
          });
        curX += h.width;
      });
      return y + headerHeight;
    };

    let curY = renderHeader(doc.y);

    if (rows.length === 0) {
      doc.rect(36, curY, tableWidth, 36).fillAndStroke('#FFFFFF', borderLight);
      doc.fontSize(8.5).fillColor(slateMuted).font('Helvetica-Oblique')
        .text(emptyMsg, 36, curY + 12, { width: tableWidth, align: 'center', lineBreak: false });
      doc.y = curY + 45;
      return;
    }

    rows.forEach((row, rIdx) => {
      // Check page break: if next row exceeds bottom threshold, add new page
      if (curY + rowHeight > doc.page.height - 45) {
        doc.addPage();
        curY = renderHeader(36);
      }

      const isEven = rIdx % 2 === 0;
      doc.rect(36, curY, tableWidth, rowHeight).fill(isEven ? '#FFFFFF' : '#F8FAFC');
      doc.rect(36, curY, tableWidth, rowHeight).stroke(borderLight);

      let curX = 42;
      row.forEach((cell, cIdx) => {
        const h = headers[cIdx];
        doc.fontSize(7).fillColor(slateDark).font('Helvetica')
          .text(String(cell || '-'), curX, curY + 6, {
            width: h.width,
            align: h.align || 'left',
            lineBreak: false,
            ellipsis: true,
          });
        curX += h.width;
      });

      curY += rowHeight;
    });

    doc.y = curY + 12;
  };

  // ---------------------------------------------------------------------------
  // RENDER BASED ON SECTION
  // ---------------------------------------------------------------------------
  if (section === 'owned') {
    const data: OwnedProductsFinanceSummary = await getOwnedProductsFinance(filter);
    drawReportHeader('VivoQuest-Owned Equipment Finance Ledger', data.periodLabel);

    drawKpiCards([
      { label: 'Gross Sales', value: formatINR(data.grossSales), sub: `${data.totalOrders} Orders • ${data.totalUnitsSold} Units` },
      { label: 'Net Revenue', value: formatINR(data.netRevenue), sub: 'After discounts & refunds' },
      { label: 'Procurement COGS', value: formatINR(data.totalProcurementCost), sub: 'Direct Stock Sourcing' },
      { label: 'Customer Refunds', value: formatINR(data.totalRefunds), sub: 'Returns processed' },
      { label: 'Gateway Fees (~2%)', value: formatINR(data.totalGatewayFees), sub: 'Razorpay digital' },
      {
        label: 'Contribution Margin',
        value: formatINR(data.estimatedContributionMargin),
        sub: `Margin: ${data.contributionMarginPct}%`,
        highlight: true,
      },
    ]);

    const headers = [
      { label: 'Date', width: 75 },
      { label: 'Order / Ref ID', width: 95 },
      { label: 'Patient Name', width: 90 },
      { label: 'Product & SKU', width: 180 },
      { label: 'Qty', width: 35, align: 'center' as const },
      { label: 'Procurement', width: 75, align: 'right' as const },
      { label: 'Tax (GST)', width: 60, align: 'right' as const },
      { label: 'Amount', width: 75, align: 'right' as const },
      { label: 'Pay Status', width: 55, align: 'center' as const },
      { label: 'Order Status', width: 60, align: 'center' as const },
    ];

    const rows = data.transactions.map((tx) => [
      tx.date.split('T')[0],
      tx.orderNumber,
      tx.patientName,
      tx.itemsSummary,
      String(tx.quantity),
      formatINR(tx.procurementCost),
      formatINR(tx.taxGst),
      formatINR(tx.totalAmount),
      tx.paymentStatus.toUpperCase(),
      tx.orderStatus.toUpperCase(),
    ]);

    drawTable(headers, rows);
  } else if (section === 'marketplace') {
    const data: MarketplaceFinanceSummary = await getMarketplaceFinance(filter);
    drawReportHeader('Third-Party Marketplace & Supplier Payables', data.periodLabel);

    drawKpiCards([
      { label: 'Customer Collections (GMV)', value: formatINR(data.totalMarketplaceGMV), sub: `${data.totalUnitsSold} Units Sold` },
      {
        label: 'Earned Commission',
        value: formatINR(data.earnedPlatformCommission),
        sub: `Avg Rate: ${data.averageCommissionRatePct}%`,
        highlight: true,
      },
      { label: 'Supplier Payables (Total)', value: formatINR(data.supplierPayablesTotal), sub: 'Accrued liabilities' },
      { label: 'Settled Payouts', value: formatINR(data.supplierPayablesSettled), sub: 'Disbursed to suppliers' },
      { label: 'Pending Settlement', value: formatINR(data.supplierPayablesPending), sub: 'Net 15/30 terms' },
      { label: 'Marketplace Net Margin', value: formatINR(data.marketplaceNetRevenue), sub: 'Commission minus fees' },
    ]);

    // Supplier Breakdown Mini-Table
    doc.fontSize(9).fillColor(primaryNavy).font('Helvetica-Bold')
      .text('Certified Supplier Settlement Breakdown', 36, doc.y);
    doc.y += 8;

    const supplierHeaders = [
      { label: 'Supplier Name', width: 170 },
      { label: 'Code', width: 70 },
      { label: 'Commission %', width: 75, align: 'center' as const },
      { label: 'Units', width: 45, align: 'center' as const },
      { label: 'Customer GMV', width: 100, align: 'right' as const },
      { label: 'VivoQuest Comm.', width: 100, align: 'right' as const },
      { label: 'Net Supplier Due', width: 105, align: 'right' as const },
      { label: 'Settled', width: 90, align: 'right' as const },
    ];

    const supRows = data.supplierBreakdown.map((s) => [
      s.supplierName,
      s.supplierCode,
      `${s.commissionRatePct}%`,
      String(s.unitsSold),
      formatINR(s.grossSalesGMV),
      formatINR(s.platformCommission),
      formatINR(s.supplierPayable),
      formatINR(s.settledAmount),
    ]);

    drawTable(supplierHeaders, supRows, 'No supplier settlements in this period.');

    // Transactions Table
    doc.fontSize(9).fillColor(primaryNavy).font('Helvetica-Bold')
      .text('Fulfilled Marketplace Transactions', 36, doc.y);
    doc.y += 8;

    const txHeaders = [
      { label: 'Date', width: 70 },
      { label: 'Order #', width: 95 },
      { label: 'Supplier Partner', width: 130 },
      { label: 'Product Item', width: 160 },
      { label: 'Qty', width: 35, align: 'center' as const },
      { label: 'Customer Paid', width: 85, align: 'right' as const },
      { label: 'Comm. Earned', width: 80, align: 'right' as const },
      { label: 'Supplier Payable', width: 85, align: 'right' as const },
      { label: 'Settlement', width: 65, align: 'center' as const },
    ];

    const txRows = data.transactions.map((tx) => [
      tx.date.split('T')[0],
      tx.orderNumber,
      tx.supplierName,
      tx.productTitle,
      String(tx.quantity),
      formatINR(tx.customerCollection),
      formatINR(tx.platformCommission),
      formatINR(tx.supplierPayable),
      tx.settlementStatus.toUpperCase(),
    ]);

    drawTable(txHeaders, txRows);
  } else if (section === 'subscriptions') {
    const data: SubscriptionsFinanceSummary = await getSubscriptionsFinance(filter);
    drawReportHeader('Caregiver Subscriptions & Visit Packages', data.periodLabel);

    drawKpiCards([
      { label: 'Total Collections', value: formatINR(data.totalCollections), sub: `${data.totalSubscriptionsCount} Total Subscriptions` },
      { label: 'Monthly Recurring (MRR)', value: formatINR(data.monthlyRecurringRevenue), sub: `${data.activeSubscriptionsCount} Active Plans` },
      { label: 'Caregiver Payout Liability', value: formatINR(data.caregiverPayoutLiabilities), sub: 'Bedside shift allocation' },
      { label: 'Platform Care Margin', value: formatINR(data.platformMargin), sub: 'Retained gross margin', highlight: true },
      { label: 'Customer Refunds', value: formatINR(data.refundsProcessed), sub: 'Plan cancellations' },
      { label: 'Gateway Fees (~2%)', value: formatINR(data.totalGatewayFees), sub: 'Razorpay processing' },
    ]);

    const headers = [
      { label: 'Date', width: 75 },
      { label: 'Subscription #', width: 100 },
      { label: 'Patient Name', width: 110 },
      { label: 'Plan Package', width: 140 },
      { label: 'Duration', width: 60, align: 'center' as const },
      { label: 'Visits', width: 55, align: 'center' as const },
      { label: 'Customer Paid', width: 80, align: 'right' as const },
      { label: 'Caregiver Pay', width: 80, align: 'right' as const },
      { label: 'Platform Margin', width: 75, align: 'right' as const },
      { label: 'Status', width: 60, align: 'center' as const },
    ];

    const rows = data.transactions.map((sub) => [
      sub.createdAt.split('T')[0],
      sub.subscriptionNumber,
      sub.patientName,
      sub.planTitle,
      `${sub.durationDays}d`,
      `${sub.visitsCompleted}/${sub.totalVisitsIncluded}`,
      formatINR(sub.customerPrice),
      formatINR(sub.caregiverPayout),
      formatINR(sub.platformCommission),
      sub.status.toUpperCase(),
    ]);

    drawTable(headers, rows);
  } else {
    // COMBINED FINANCE REPORT
    const data: CombinedFinanceSummary = await getCombinedFinanceSummary(filter);
    drawReportHeader('VivoQuest Simplified Financial Statement & Reconciliation', data.periodLabel);

    drawKpiCards([
      { label: 'Total Money Received', value: formatINR(data.primaryKpis?.totalMoneyReceived ?? data.executiveSummary.grossMerchandiseValue), sub: 'Verified Inflow' },
      { label: 'Product Sales Revenue', value: formatINR(data.primaryKpis?.productSalesRevenue ?? data.sectionSummaries.ownedProducts.grossSales), sub: 'Owned Equipment Sales' },
      { label: 'Marketplace Volume', value: formatINR(data.primaryKpis?.marketplaceSales?.gmv ?? data.sectionSummaries.marketplace.gmv), sub: `Own Rev: ${formatINR(data.primaryKpis?.marketplaceSales?.vivoquestRevenue ?? data.sectionSummaries.marketplace.earnedCommission)}` },
      { label: 'Subscription Revenue', value: formatINR(data.primaryKpis?.subscriptionRevenue ?? data.sectionSummaries.subscriptions.collections), sub: `${data.primaryKpis?.activeSubscriptions ?? data.sectionSummaries.subscriptions.activeCount} Active Plans` },
      { label: 'Refunds & Contra', value: formatINR(data.primaryKpis?.refundsAndCancellations?.completedRefundsAmount ?? data.executiveSummary.completedRefunds), sub: 'Completed Reimbursements' },
      {
        label: 'Net Operating Result',
        value: formatINR(data.primaryKpis?.netOperatingResult?.amount ?? data.executiveSummary.estimatedContributionMargin),
        sub: `Margin: ${data.primaryKpis?.netOperatingResult?.marginPct ?? data.executiveSummary.contributionMarginPct}% (${data.primaryKpis?.netOperatingResult?.costDataStatus ?? 'Reconciled'})`,
        highlight: true,
      },
    ]);

    // Section 1: Consolidated Reconciliation Table
    doc.fontSize(10).fillColor(primaryNavy).font('Helvetica-Bold')
      .text('Authoritative Net Operating Margin Reconciliation Ledger', 36, doc.y);
    doc.fontSize(7.5).fillColor(slateMuted).font('Helvetica')
      .text('Statutory separation of fiduciary customer collections, supplier trade payables, labor delivery, and platform profit.', 36, doc.y + 12);
    doc.y += 24;

    const ledgerHeaders = [
      { label: 'Ledger Account', width: 220 },
      { label: 'Classification', width: 170 },
      { label: 'Accounting Treatment', width: 230 },
      { label: 'Amount (INR)', width: 140, align: 'right' as const },
    ];

    const ledgerRows = data.reconciliationLedger.map((r) => [
      r.ledgerAccount,
      r.classification,
      r.treatment,
      `${r.amount >= 0 ? '+' : ''}${formatINR(r.amount)}`,
    ]);

    drawTable(ledgerHeaders, ledgerRows);

    // Section Summaries Breakdown Strip
    doc.fontSize(10).fillColor(primaryNavy).font('Helvetica-Bold')
      .text('Segment Performance Overview', 36, doc.y);
    doc.y += 10;

    const segmentHeaders = [
      { label: 'Business Segment', width: 180 },
      { label: 'Primary Activity Metric', width: 180 },
      { label: 'Gross Volume (INR)', width: 140, align: 'right' as const },
      { label: 'Direct Cost / Liability', width: 140, align: 'right' as const },
      { label: 'VivoQuest Retained (INR)', width: 130, align: 'right' as const },
    ];

    const segmentRows = [
      [
        'VivoQuest-Owned Medical Equipment',
        `${data.sectionSummaries.ownedProducts.ordersCount} Customer Orders Fulfilled`,
        formatINR(data.sectionSummaries.ownedProducts.grossSales),
        formatINR(data.sectionSummaries.ownedProducts.cogs),
        formatINR(data.sectionSummaries.ownedProducts.netMargin),
      ],
      [
        'Third-Party Marketplace & Suppliers',
        `${data.sectionSummaries.marketplace.ordersCount} Verified Supplier Orders`,
        formatINR(data.sectionSummaries.marketplace.gmv),
        formatINR(data.sectionSummaries.marketplace.supplierPayablesPending),
        formatINR(data.sectionSummaries.marketplace.earnedCommission),
      ],
      [
        'Caregiver Subscriptions & Visit Packages',
        `${data.sectionSummaries.subscriptions.activeCount} Active Clinical Subscriptions (MRR: ${formatINR(data.sectionSummaries.subscriptions.mrr)})`,
        formatINR(data.sectionSummaries.subscriptions.collections),
        formatINR(data.sectionSummaries.subscriptions.caregiverPayoutLiabilities),
        formatINR(data.sectionSummaries.subscriptions.collections - data.sectionSummaries.subscriptions.caregiverPayoutLiabilities),
      ],
    ];

    drawTable(segmentHeaders, segmentRows);
  }

  // ---------------------------------------------------------------------------
  // FOOTER & AUTOMATIC PAGE NUMBERS (Post-processing)
  // ---------------------------------------------------------------------------
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  for (let i = range.start; i < range.start + totalPages; i++) {
    doc.switchToPage(i);
    const prevBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // Prevent auto-pagination when writing in footer region

    // Bottom rule
    doc.strokeColor(borderLight).lineWidth(0.5)
      .moveTo(36, doc.page.height - 30)
      .lineTo(doc.page.width - 36, doc.page.height - 30)
      .stroke();

    // Footer text
    doc.fontSize(7).fillColor(slateMuted).font('Helvetica')
      .text(
        'VivoQuest Technologies Pvt. Ltd. • ISO 27001 & DPDP Act Compliant Healthcare Ledger • Sandbox Simulation Mode',
        36,
        doc.page.height - 22,
        { lineBreak: false }
      );

    doc.fontSize(7).fillColor(slateMuted).font('Helvetica-Bold')
      .text(`Page ${i + 1} of ${totalPages}`, doc.page.width - 150, doc.page.height - 22, {
        width: 114,
        align: 'right',
        lineBreak: false,
      });

    doc.page.margins.bottom = prevBottom;
  }

  doc.end();
  return pdfPromise;
};

// =============================================================================
// EXCEL (.XLSX) GENERATION ENGINE
// =============================================================================

export const generateFinanceExcel = async (
  section: FinanceExportSection,
  filter: FinanceDateFilter
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VivoQuest Platform Governance';
  workbook.created = new Date();

  const applyHeaderStyle = (row: ExcelJS.Row) => {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    row.alignment = { vertical: 'middle' };
  };

  if (section === 'owned' || section === 'combined') {
    const data: OwnedProductsFinanceSummary = await getOwnedProductsFinance(filter);
    const sheet = workbook.addWorksheet('Owned Equipment');

    sheet.columns = [
      { header: 'Order Number', key: 'orderNumber', width: 20 },
      { header: 'Transaction ID', key: 'transactionId', width: 24 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Patient Name', key: 'patientName', width: 22 },
      { header: 'Items Summary', key: 'itemsSummary', width: 34 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Subtotal (INR)', key: 'subtotal', width: 16 },
      { header: 'Tax GST (INR)', key: 'taxGst', width: 14 },
      { header: 'Total Collected (INR)', key: 'totalAmount', width: 20 },
      { header: 'Procurement COGS (INR)', key: 'procurementCost', width: 22 },
      { header: 'Gateway Fee (INR)', key: 'gatewayFee', width: 18 },
      { header: 'Refund Amount (INR)', key: 'refundAmount', width: 18 },
      { header: 'Payment Status', key: 'paymentStatus', width: 16 },
      { header: 'Order Status', key: 'orderStatus', width: 16 },
    ];

    applyHeaderStyle(sheet.getRow(1));

    data.transactions.forEach((tx) => {
      sheet.addRow({
        orderNumber: sanitizeForSpreadsheet(tx.orderNumber),
        transactionId: sanitizeForSpreadsheet(tx.transactionId),
        date: tx.date.split('T')[0],
        patientName: sanitizeForSpreadsheet(tx.patientName),
        itemsSummary: sanitizeForSpreadsheet(tx.itemsSummary),
        quantity: tx.quantity,
        subtotal: tx.subtotal,
        taxGst: tx.taxGst,
        totalAmount: tx.totalAmount,
        procurementCost: tx.procurementCost,
        gatewayFee: tx.gatewayFee,
        refundAmount: tx.refundAmount,
        paymentStatus: sanitizeForSpreadsheet(tx.paymentStatus.toUpperCase()),
        orderStatus: sanitizeForSpreadsheet(tx.orderStatus.toUpperCase()),
      });
    });
  }

  if (section === 'marketplace' || section === 'combined') {
    const data: MarketplaceFinanceSummary = await getMarketplaceFinance(filter);
    const sheet = workbook.addWorksheet('Marketplace & Suppliers');

    sheet.columns = [
      { header: 'Order Number', key: 'orderNumber', width: 20 },
      { header: 'Transaction ID', key: 'transactionId', width: 24 },
      { header: 'Supplier Name', key: 'supplierName', width: 26 },
      { header: 'Product Item', key: 'productTitle', width: 30 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Customer GMV (INR)', key: 'customerCollection', width: 20 },
      { header: 'Commission Rate %', key: 'commissionRatePct', width: 18 },
      { header: 'Platform Commission (INR)', key: 'platformCommission', width: 24 },
      { header: 'Supplier Payable (INR)', key: 'supplierPayable', width: 22 },
      { header: 'Settlement Status', key: 'settlementStatus', width: 18 },
      { header: 'Payment Status', key: 'paymentStatus', width: 16 },
    ];

    applyHeaderStyle(sheet.getRow(1));

    data.transactions.forEach((tx) => {
      sheet.addRow({
        orderNumber: sanitizeForSpreadsheet(tx.orderNumber),
        transactionId: sanitizeForSpreadsheet(tx.transactionId),
        supplierName: sanitizeForSpreadsheet(tx.supplierName),
        productTitle: sanitizeForSpreadsheet(tx.productTitle),
        sku: sanitizeForSpreadsheet(tx.sku),
        quantity: tx.quantity,
        customerCollection: tx.customerCollection,
        commissionRatePct: tx.commissionRatePct,
        platformCommission: tx.platformCommission,
        supplierPayable: tx.supplierPayable,
        settlementStatus: sanitizeForSpreadsheet(tx.settlementStatus.toUpperCase()),
        paymentStatus: sanitizeForSpreadsheet(tx.paymentStatus.toUpperCase()),
      });
    });
  }

  if (section === 'subscriptions' || section === 'combined') {
    const data: SubscriptionsFinanceSummary = await getSubscriptionsFinance(filter);
    const sheet = workbook.addWorksheet('Caregiver Plans');

    sheet.columns = [
      { header: 'Subscription Number', key: 'subscriptionNumber', width: 24 },
      { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
      { header: 'Patient Name', key: 'patientName', width: 22 },
      { header: 'Plan Package', key: 'planTitle', width: 26 },
      { header: 'Plan Type', key: 'planType', width: 22 },
      { header: 'Duration (Days)', key: 'durationDays', width: 16 },
      { header: 'Visits (Done/Total)', key: 'visits', width: 18 },
      { header: 'Customer Paid (INR)', key: 'customerPrice', width: 20 },
      { header: 'Caregiver Payout (INR)', key: 'caregiverPayout', width: 22 },
      { header: 'Platform Margin (INR)', key: 'platformCommission', width: 22 },
      { header: 'Payment Status', key: 'paymentStatus', width: 16 },
      { header: 'Plan Status', key: 'status', width: 16 },
    ];

    applyHeaderStyle(sheet.getRow(1));

    data.transactions.forEach((sub) => {
      sheet.addRow({
        subscriptionNumber: sanitizeForSpreadsheet(sub.subscriptionNumber),
        invoiceNumber: sanitizeForSpreadsheet(sub.invoiceNumber),
        patientName: sanitizeForSpreadsheet(sub.patientName),
        planTitle: sanitizeForSpreadsheet(sub.planTitle),
        planType: sanitizeForSpreadsheet(sub.planType),
        durationDays: sub.durationDays,
        visits: `${sub.visitsCompleted}/${sub.totalVisitsIncluded}`,
        customerPrice: sub.customerPrice,
        caregiverPayout: sub.caregiverPayout,
        platformCommission: sub.platformCommission,
        paymentStatus: sanitizeForSpreadsheet(sub.paymentStatus.toUpperCase()),
        status: sanitizeForSpreadsheet(sub.status.toUpperCase()),
      });
    });
  }

  // Combined Executive Ledger Sheet
  if (section === 'combined') {
    const combinedData: CombinedFinanceSummary = await getCombinedFinanceSummary(filter);
    const summarySheet = workbook.addWorksheet('Reconciliation Ledger', { properties: { tabColor: { argb: 'FF0D9488' } } });

    summarySheet.columns = [
      { header: 'Ledger Account', key: 'account', width: 36 },
      { header: 'Classification', key: 'classification', width: 28 },
      { header: 'Accounting Treatment', key: 'treatment', width: 36 },
      { header: 'Amount (INR)', key: 'amount', width: 22 },
    ];

    applyHeaderStyle(summarySheet.getRow(1));

    combinedData.reconciliationLedger.forEach((r) => {
      summarySheet.addRow({
        account: sanitizeForSpreadsheet(r.ledgerAccount),
        classification: sanitizeForSpreadsheet(r.classification),
        treatment: sanitizeForSpreadsheet(r.treatment),
        amount: r.amount,
      });
    });
  }

  const rawBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(rawBuffer);
};

// =============================================================================
// CSV GENERATION ENGINE (WITH FORMULA INJECTION ESCAPING)
// =============================================================================

export const generateFinanceCsv = async (
  section: FinanceExportSection,
  filter: FinanceDateFilter
): Promise<string> => {
  const escapeCsvCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    const safeStr = sanitizeForSpreadsheet(val);
    if (safeStr.includes(',') || safeStr.includes('"') || safeStr.includes('\n')) {
      return `"${safeStr.replace(/"/g, '""')}"`;
    }
    return safeStr;
  };

  const rows: string[][] = [];

  if (section === 'owned') {
    const data = await getOwnedProductsFinance(filter);
    rows.push([
      'Order Number',
      'Transaction ID',
      'Date',
      'Patient Name',
      'Items Summary',
      'Quantity',
      'Subtotal',
      'Tax GST',
      'Total Amount',
      'Procurement COGS',
      'Gateway Fee',
      'Refund Amount',
      'Payment Status',
      'Order Status',
    ]);
    data.transactions.forEach((tx) => {
      rows.push([
        tx.orderNumber,
        tx.transactionId,
        tx.date.split('T')[0],
        tx.patientName,
        tx.itemsSummary,
        String(tx.quantity),
        String(tx.subtotal),
        String(tx.taxGst),
        String(tx.totalAmount),
        String(tx.procurementCost),
        String(tx.gatewayFee),
        String(tx.refundAmount),
        tx.paymentStatus,
        tx.orderStatus,
      ]);
    });
  } else if (section === 'marketplace') {
    const data = await getMarketplaceFinance(filter);
    rows.push([
      'Order Number',
      'Transaction ID',
      'Supplier Name',
      'Product Item',
      'SKU',
      'Quantity',
      'Customer GMV',
      'Commission Rate Pct',
      'Platform Commission',
      'Supplier Payable',
      'Settlement Status',
      'Payment Status',
    ]);
    data.transactions.forEach((tx) => {
      rows.push([
        tx.orderNumber,
        tx.transactionId,
        tx.supplierName,
        tx.productTitle,
        tx.sku,
        String(tx.quantity),
        String(tx.customerCollection),
        String(tx.commissionRatePct),
        String(tx.platformCommission),
        String(tx.supplierPayable),
        tx.settlementStatus,
        tx.paymentStatus,
      ]);
    });
  } else if (section === 'subscriptions') {
    const data = await getSubscriptionsFinance(filter);
    rows.push([
      'Subscription Number',
      'Invoice Number',
      'Patient Name',
      'Plan Package',
      'Plan Type',
      'Duration Days',
      'Visits Done',
      'Visits Total',
      'Customer Paid',
      'Caregiver Payout',
      'Platform Margin',
      'Payment Status',
      'Status',
    ]);
    data.transactions.forEach((sub) => {
      rows.push([
        sub.subscriptionNumber,
        sub.invoiceNumber,
        sub.patientName,
        sub.planTitle,
        sub.planType,
        String(sub.durationDays),
        String(sub.visitsCompleted),
        String(sub.totalVisitsIncluded),
        String(sub.customerPrice),
        String(sub.caregiverPayout),
        String(sub.platformCommission),
        sub.paymentStatus,
        sub.status,
      ]);
    });
  } else {
    // Combined Reconciliation CSV
    const data = await getCombinedFinanceSummary(filter);
    rows.push(['Ledger Account', 'Classification', 'Accounting Treatment', 'Amount (INR)']);
    data.reconciliationLedger.forEach((r) => {
      rows.push([r.ledgerAccount, r.classification, r.treatment, String(r.amount)]);
    });
  }

  return rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
};

