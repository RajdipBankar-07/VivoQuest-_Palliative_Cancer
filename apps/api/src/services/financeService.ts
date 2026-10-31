import mongoose from 'mongoose';
import { ProductOrder, IProductOrder } from '../models/ProductOrder.js';
import { CaregiverSubscription, ICaregiverSubscription } from '../models/CaregiverSubscription.js';
import { SupplierPurchaseOrder, ISupplierPurchaseOrder } from '../models/SupplierPurchaseOrder.js';
import { Supplier, ISupplier } from '../models/Supplier.js';
import { MedicalProduct } from '../models/MedicalProduct.js';
import { CaregiverPlan } from '../models/CaregiverPlan.js';
import { seedAdminDemoData } from './adminService.js';

// =============================================================================
// DATE RANGE HELPER & SCOPE RESOLUTION
// =============================================================================

export interface FinanceDateFilter {
  preset?:
    | 'all'
    | 'today'
    | 'yesterday'
    | 'last_7_days'
    | 'last_30_days'
    | 'this_month'
    | 'previous_month'
    | 'last_3_months'
    | 'last_6_months'
    | 'this_year'
    | 'previous_year'
    | 'custom';
  startDate?: string;
  endDate?: string;
  search?: string;
  status?: string;
  supplierId?: string;
  planType?: string;
  page?: number;
  limit?: number;
  grouping?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  category?: 'overview' | 'owned' | 'marketplace' | 'subscriptions';
}

export interface ResolvedDateRange {
  start: Date | null;
  end: Date | null;
  label: string;
}

/**
 * Returns date in YYYY-MM-DD in Asia/Kolkata timezone
 */
export const toKolkataDateString = (d: Date | string | number): string => {
  const date = new Date(d);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

export const resolveDateRange = (filter: FinanceDateFilter): ResolvedDateRange => {
  const preset = filter.preset || 'all';
  const now = new Date();

  // Helper: clone date
  const startOfDay = (d: Date) => {
    const res = new Date(d);
    res.setHours(0, 0, 0, 0);
    return res;
  };
  const endOfDay = (d: Date) => {
    const res = new Date(d);
    res.setHours(23, 59, 59, 999);
    return res;
  };

  switch (preset) {
    case 'today': {
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        label: `Today (${toKolkataDateString(now)})`,
      };
    }
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return {
        start: startOfDay(y),
        end: endOfDay(y),
        label: `Yesterday (${toKolkataDateString(y)})`,
      };
    }
    case 'last_7_days': {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 6);
      return {
        start: startOfDay(past7),
        end: endOfDay(now),
        label: `Last 7 Days (${toKolkataDateString(past7)} to ${toKolkataDateString(now)})`,
      };
    }
    case 'last_30_days': {
      const past30 = new Date(now);
      past30.setDate(past30.getDate() - 29);
      return {
        start: startOfDay(past30),
        end: endOfDay(now),
        label: `Last 30 Days (${toKolkataDateString(past30)} to ${toKolkataDateString(now)})`,
      };
    }
    case 'this_month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: startOfDay(monthStart),
        end: endOfDay(now),
        label: `This Month (${monthStart.toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })})`,
      };
    }
    case 'previous_month': {
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: startOfDay(prevMonthStart),
        end: endOfDay(prevMonthEnd),
        label: `Previous Month (${prevMonthStart.toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })})`,
      };
    }
    case 'last_3_months': {
      const past3m = new Date(now);
      past3m.setMonth(past3m.getMonth() - 3);
      return {
        start: startOfDay(past3m),
        end: endOfDay(now),
        label: `Last 3 Months (${toKolkataDateString(past3m)} to ${toKolkataDateString(now)})`,
      };
    }
    case 'last_6_months': {
      const past6m = new Date(now);
      past6m.setMonth(past6m.getMonth() - 6);
      return {
        start: startOfDay(past6m),
        end: endOfDay(now),
        label: `Last 6 Months (${toKolkataDateString(past6m)} to ${toKolkataDateString(now)})`,
      };
    }
    case 'this_year': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return {
        start: startOfDay(yearStart),
        end: endOfDay(now),
        label: `This Year (${now.getFullYear()})`,
      };
    }
    case 'previous_year': {
      const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31);
      return {
        start: startOfDay(prevYearStart),
        end: endOfDay(prevYearEnd),
        label: `Previous Year (${now.getFullYear() - 1})`,
      };
    }
    case 'custom': {
      if (filter.startDate && filter.endDate) {
        const s = new Date(filter.startDate);
        const e = new Date(filter.endDate);
        return {
          start: startOfDay(s),
          end: endOfDay(e),
          label: `Custom (${toKolkataDateString(s)} to ${toKolkataDateString(e)})`,
        };
      }
      return { start: null, end: null, label: 'All Time' };
    }
    case 'all':
    default:
      return { start: null, end: null, label: 'All Time (Historical Ledger)' };
  }
};

// =============================================================================
// SEED EXTENSION: ENSURE MULTI-DATE HISTORICAL DATA
// =============================================================================

/**
 * Ensures rich, authentic historical data exists spanning today, yesterday,
 * last 7 days, this month, and previous month for reporting and filtering tests.
 */
export const seedMultiPeriodFinanceDataIfEmpty = async (): Promise<void> => {
  await seedAdminDemoData();

  const todayExists = await ProductOrder.findOne({ orderNumber: 'VQ-ORD-TODAY-01' });
  if (todayExists) return;

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);

  const sampleProducts = await MedicalProduct.find().limit(5);
  const sampleSuppliers = await Supplier.find().limit(3);

  if (sampleProducts.length === 0 || sampleSuppliers.length === 0) return;

  const ownProduct1 = sampleProducts[0];
  const ownProduct2 = sampleProducts[1] || sampleProducts[0];
  const supplierProduct = sampleProducts[2] || sampleProducts[0];
  const sup1 = sampleSuppliers[0];

  // Seed orders across historical windows
  const historicalOrders = [
    {
      orderNumber: 'VQ-ORD-TODAY-01',
      invoiceNumber: 'INV-2026-TODAY-01',
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Arjun Rao',
      patientPhone: '9822011111',
      patientEmail: 'arjun.rao@example.com',
      items: [
        {
          productId: ownProduct1._id,
          sku: ownProduct1.sku,
          title: ownProduct1.title,
          category: ownProduct1.category,
          quantity: 1,
          unitPrice: ownProduct1.price,
          procurementCost: ownProduct1.procurementCost || Math.round(ownProduct1.price * 0.65),
          sourcingType: 'own_stock' as const,
          isRental: false,
          setupRequired: false,
        },
      ],
      pricing: {
        subtotal: ownProduct1.price,
        deliveryFee: 150,
        taxGst: Math.round(ownProduct1.price * 0.12),
        totalAmount: Math.round(ownProduct1.price * 1.12) + 150,
        procurementCostTotal: ownProduct1.procurementCost || Math.round(ownProduct1.price * 0.65),
        gatewayFee: Math.round((Math.round(ownProduct1.price * 1.12) + 150) * 0.02),
      },
      deliveryAddress: { street: 'FC Road', city: 'Pune', state: 'Maharashtra', pincode: '411004' },
      clinicalSetup: { isSetupRequired: false, setupStatus: 'not_required' as const },
      paymentMethod: 'online' as const,
      paymentStatus: 'paid' as const,
      paymentDetails: { razorpayPaymentId: 'pay_live_today_01', paidAt: now, isTestMode: true },
      orderStatus: 'confirmed' as const,
      trackingUpdates: [{ timestamp: now, status: 'confirmed' as const, message: 'Order verified and confirmed' }],
      createdAt: now,
      updatedAt: now,
    },
    {
      orderNumber: 'VQ-ORD-YESTERDAY-02',
      invoiceNumber: 'INV-2026-YEST-02',
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Sunita Joshi',
      patientPhone: '9822022222',
      patientEmail: 'sunita.joshi@example.com',
      items: [
        {
          productId: ownProduct2._id,
          sku: ownProduct2.sku,
          title: ownProduct2.title,
          category: ownProduct2.category,
          quantity: 2,
          unitPrice: ownProduct2.price,
          procurementCost: ownProduct2.procurementCost || Math.round(ownProduct2.price * 0.65),
          sourcingType: 'own_stock' as const,
          isRental: false,
          setupRequired: false,
        },
      ],
      pricing: {
        subtotal: ownProduct2.price * 2,
        deliveryFee: 0,
        taxGst: Math.round(ownProduct2.price * 2 * 0.12),
        totalAmount: Math.round(ownProduct2.price * 2 * 1.12),
        procurementCostTotal: (ownProduct2.procurementCost || Math.round(ownProduct2.price * 0.65)) * 2,
        gatewayFee: Math.round(Math.round(ownProduct2.price * 2 * 1.12) * 0.02),
      },
      deliveryAddress: { street: 'Baner Road', city: 'Pune', state: 'Maharashtra', pincode: '411045' },
      clinicalSetup: { isSetupRequired: false, setupStatus: 'not_required' as const },
      paymentMethod: 'online' as const,
      paymentStatus: 'paid' as const,
      paymentDetails: { razorpayPaymentId: 'pay_live_yest_02', paidAt: yesterday, isTestMode: true },
      orderStatus: 'dispatched' as const,
      trackingUpdates: [{ timestamp: yesterday, status: 'dispatched' as const, message: 'Dispatched from depot' }],
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      orderNumber: 'VQ-ORD-MARKETPLACE-7D',
      invoiceNumber: 'INV-2026-MKT-03',
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Vikram Mehta',
      patientPhone: '9822033333',
      patientEmail: 'vikram.mehta@example.com',
      items: [
        {
          productId: supplierProduct._id,
          sku: supplierProduct.sku,
          title: supplierProduct.title,
          category: supplierProduct.category,
          quantity: 1,
          unitPrice: supplierProduct.price,
          procurementCost: Math.round(supplierProduct.price * 0.8),
          sourcingType: 'supplier_direct' as const,
          supplierId: sup1._id,
          supplierName: sup1.name,
          supplierStatus: 'dispatched' as const,
          isRental: false,
          setupRequired: false,
        },
      ],
      pricing: {
        subtotal: supplierProduct.price,
        deliveryFee: 200,
        taxGst: Math.round(supplierProduct.price * 0.12),
        totalAmount: Math.round(supplierProduct.price * 1.12) + 200,
        procurementCostTotal: Math.round(supplierProduct.price * 0.8),
        gatewayFee: Math.round((Math.round(supplierProduct.price * 1.12) + 200) * 0.02),
      },
      deliveryAddress: { street: 'Aundh', city: 'Pune', state: 'Maharashtra', pincode: '411007' },
      clinicalSetup: { isSetupRequired: false, setupStatus: 'not_required' as const },
      paymentMethod: 'online' as const,
      paymentStatus: 'paid' as const,
      paymentDetails: { razorpayPaymentId: 'pay_live_7d_03', paidAt: fourDaysAgo, isTestMode: true },
      orderStatus: 'delivered' as const,
      trackingUpdates: [{ timestamp: fourDaysAgo, status: 'delivered' as const, message: 'Delivered by supplier' }],
      createdAt: fourDaysAgo,
      updatedAt: fourDaysAgo,
    },
    {
      orderNumber: 'VQ-ORD-REFUNDED-MONTH',
      invoiceNumber: 'INV-2026-RFND-04',
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Kavita Patel',
      patientPhone: '9822044444',
      items: [
        {
          productId: ownProduct1._id,
          sku: ownProduct1.sku,
          title: ownProduct1.title,
          category: ownProduct1.category,
          quantity: 1,
          unitPrice: 1500,
          procurementCost: 900,
          sourcingType: 'own_stock' as const,
          isRental: false,
          setupRequired: false,
        },
      ],
      pricing: {
        subtotal: 1500,
        deliveryFee: 100,
        taxGst: 180,
        totalAmount: 1780,
        refundAmount: 1780,
        procurementCostTotal: 900,
        gatewayFee: 36,
      },
      deliveryAddress: { street: 'Kothrud', city: 'Pune', state: 'Maharashtra', pincode: '411038' },
      clinicalSetup: { isSetupRequired: false, setupStatus: 'not_required' as const },
      paymentMethod: 'online' as const,
      paymentStatus: 'refunded' as const,
      cancellation: {
        isCancelled: true,
        cancelledAt: twoWeeksAgo,
        cancelledBy: 'Operations Admin Lead',
        cancellationReason: 'Patient size incompatibility requested return',
        refundStatus: 'processed' as const,
      },
      orderStatus: 'cancelled' as const,
      trackingUpdates: [{ timestamp: twoWeeksAgo, status: 'cancelled' as const, message: 'Refund of ₹1,780 processed' }],
      createdAt: twoWeeksAgo,
      updatedAt: twoWeeksAgo,
    },
    {
      orderNumber: 'VQ-ORD-PREVMONTH-05',
      invoiceNumber: 'INV-2026-PREV-05',
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Devendra Kulkarni',
      patientPhone: '9822055555',
      items: [
        {
          productId: ownProduct2._id,
          sku: ownProduct2.sku,
          title: ownProduct2.title,
          category: ownProduct2.category,
          quantity: 1,
          unitPrice: 4500,
          procurementCost: 2800,
          sourcingType: 'own_stock' as const,
          isRental: false,
          setupRequired: false,
        },
      ],
      pricing: {
        subtotal: 4500,
        deliveryFee: 0,
        taxGst: 540,
        totalAmount: 5040,
        procurementCostTotal: 2800,
        gatewayFee: 101,
      },
      deliveryAddress: { street: 'Deccan', city: 'Pune', state: 'Maharashtra', pincode: '411004' },
      clinicalSetup: { isSetupRequired: false, setupStatus: 'not_required' as const },
      paymentMethod: 'online' as const,
      paymentStatus: 'paid' as const,
      paymentDetails: { razorpayPaymentId: 'pay_prev_month_05', paidAt: thirtyFiveDaysAgo, isTestMode: true },
      orderStatus: 'completed' as const,
      trackingUpdates: [{ timestamp: thirtyFiveDaysAgo, status: 'completed' as const, message: 'Order completed' }],
      createdAt: thirtyFiveDaysAgo,
      updatedAt: thirtyFiveDaysAgo,
    },
  ];

  for (const o of historicalOrders) {
    const exists = await ProductOrder.findOne({ orderNumber: o.orderNumber });
    if (!exists) {
      await ProductOrder.create(o);
    }
  }

  // Also seed a previous-month caregiver subscription if needed
  const plan = await CaregiverPlan.findOne();
  if (plan) {
    const prevSubNumber = 'SUB-2026-PREVMONTH';
    const subExists = await CaregiverSubscription.findOne({ subscriptionNumber: prevSubNumber });
    if (!subExists) {
      await CaregiverSubscription.create({
        subscriptionNumber: prevSubNumber,
        invoiceNumber: 'INV-SUB-PREV-01',
        patientId: new mongoose.Types.ObjectId(),
        patientName: 'Nalini Sengupta',
        patientPhone: '9822066666',
        planId: plan._id,
        planTitle: plan.title,
        status: 'completed',
        startDate: thirtyFiveDaysAgo,
        endDate: new Date(thirtyFiveDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
        totalVisitsIncluded: plan.totalVisitsIncluded || 15,
        visitsCompleted: plan.totalVisitsIncluded || 15,
        visitsRemaining: 0,
        pricing: {
          customerPrice: plan.customerPrice || 25000,
          caregiverPayout: plan.caregiverPayout || 17000,
          platformCommission: (plan.customerPrice || 25000) - (plan.caregiverPayout || 17000),
          paymentStatus: 'paid',
          paymentMethod: 'online',
          razorpayPaymentId: 'pay_sub_prev_month',
        },
        isDemo: true,
        createdAt: thirtyFiveDaysAgo,
        updatedAt: thirtyFiveDaysAgo,
      });
    }
  }

  // Ensure a cancelled subscription with refund details exists for cancellation audit tracking
  const cancelledSubExists = await CaregiverSubscription.findOne({ status: 'cancelled' });
  if (!cancelledSubExists && plan) {
    const cancelledDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    await CaregiverSubscription.create({
      subscriptionNumber: 'SUB-2026-CANCELLED-01',
      invoiceNumber: 'INV-SUB-CANC-01',
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Kishore Deshmukh',
      patientPhone: '9822077777',
      planId: plan._id,
      planTitle: `${plan.title} (Cancelled Plan)`,
      status: 'cancelled',
      startDate: new Date(cancelledDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      endDate: cancelledDate,
      totalVisitsIncluded: 15,
      visitsCompleted: 2,
      visitsRemaining: 13,
      pricing: {
        customerPrice: 15000,
        caregiverPayout: 10000,
        platformCommission: 5000,
        paymentStatus: 'refunded',
        paymentMethod: 'online',
        razorpayPaymentId: 'pay_sub_cancelled_01',
      },
      isDemo: true,
      createdAt: cancelledDate,
      updatedAt: cancelledDate,
    });
  }
};

// =============================================================================
// DOMAIN A: VIVOQUEST-OWNED PRODUCTS FINANCE
// =============================================================================

export interface OwnedProductsFinanceSummary {
  periodLabel: string;
  grossSales: number;
  totalOrders: number;
  totalUnitsSold: number;
  totalDiscounts: number;
  totalTaxGst: number;
  totalDeliveryFees: number;
  totalInstallationCharges: number;
  totalProcurementCost: number;
  totalRefunds: number;
  totalGatewayFees: number;
  netRevenue: number;
  estimatedContributionMargin: number;
  contributionMarginPct: number;
  paymentStatusCounts: {
    paid: number;
    pending: number;
    cod: number;
    refunded: number;
  };
  orderStatusCounts: Record<string, number>;
  transactions: Array<{
    transactionId: string;
    orderId: string;
    orderNumber: string;
    date: string;
    patientName: string;
    itemsSummary: string;
    skuList: string[];
    quantity: number;
    subtotal: number;
    taxGst: number;
    totalAmount: number;
    procurementCost: number;
    gatewayFee: number;
    refundAmount: number;
    paymentStatus: string;
    orderStatus: string;
    paymentMethod: string;
    isRental: boolean;
    refundDetails?: {
      refundAmount: number;
      refundReason?: string;
      refundDate?: string;
    };
  }>;
  dailyBreakdown?: Array<{
    date: string;
    grossSales: number;
    refunds: number;
    cogs: number;
    gatewayFees: number;
    ordersCount: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getOwnedProductsFinance = async (
  filter: FinanceDateFilter
): Promise<OwnedProductsFinanceSummary> => {
  await seedMultiPeriodFinanceDataIfEmpty();

  const { start, end, label } = resolveDateRange(filter);
  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
  const skip = (page - 1) * limit;

  // Build Query: Owned products are those with items sourcingType === 'own_stock' or no supplierId
  const andClauses: any[] = [
    { 'items.sourcingType': { $in: ['own_stock', null, undefined] } },
    { isArchived: { $ne: true } },
  ];

  if (start || end) {
    const dateClause: any = {};
    if (start) dateClause.$gte = start;
    if (end) dateClause.$lte = end;
    andClauses.push({ createdAt: dateClause });
  }

  if (filter.status && filter.status !== 'all') {
    andClauses.push({
      $or: [
        { paymentStatus: filter.status },
        { orderStatus: filter.status },
      ],
    });
  }

  if (filter.search && filter.search.trim()) {
    const regex = new RegExp(filter.search.trim(), 'i');
    andClauses.push({
      $or: [
        { orderNumber: regex },
        { invoiceNumber: regex },
        { patientName: regex },
        { patientPhone: regex },
        { 'items.sku': regex },
        { 'items.title': regex },
        { 'paymentDetails.razorpayPaymentId': regex },
      ],
    });
  }

  const matchQuery = andClauses.length > 1 ? { $and: andClauses } : andClauses[0];

  // Fetch all matching orders for accurate aggregate calculation
  const allMatchingOrders = await ProductOrder.find(matchQuery).sort({ createdAt: -1 }).lean();

  let grossSales = 0;
  let totalUnitsSold = 0;
  let totalDiscounts = 0;
  let totalTaxGst = 0;
  let totalDeliveryFees = 0;
  let totalInstallationCharges = 0;
  let totalProcurementCost = 0;
  let totalRefunds = 0;
  let totalGatewayFees = 0;

  const paymentStatusCounts = { paid: 0, pending: 0, cod: 0, refunded: 0 };
  const orderStatusCounts: Record<string, number> = {};
  const dailyMap = new Map<string, { date: string; grossSales: number; refunds: number; cogs: number; gatewayFees: number; ordersCount: number }>();

  for (const ord of allMatchingOrders) {
    const isPaid = (ord.paymentStatus === 'paid' || ord.paymentStatus === 'cod') && ord.orderStatus !== 'cancelled';
    const isRefunded = ord.paymentStatus === 'refunded' || ord.cancellation?.refundStatus === 'processed';

    // Status counts
    if (ord.paymentStatus in paymentStatusCounts) {
      paymentStatusCounts[ord.paymentStatus as keyof typeof paymentStatusCounts]++;
    }
    orderStatusCounts[ord.orderStatus] = (orderStatusCounts[ord.orderStatus] || 0) + 1;

    let orderOwnedGross = 0;
    let orderOwnedProcurement = 0;

    // Line item analysis for owned goods
    for (const item of ord.items) {
      if (item.sourcingType === 'own_stock' || !item.supplierId) {
        if (isPaid) {
          const itemTotal = item.unitPrice * item.quantity;
          grossSales += itemTotal;
          orderOwnedGross += itemTotal;
          totalUnitsSold += item.quantity;
          totalDiscounts += item.discountAmount || 0;
          const itemCogs = (item.procurementCost || 0) * item.quantity;
          totalProcurementCost += itemCogs;
          orderOwnedProcurement += itemCogs;
        }
      }
    }

    let orderGw = 0;
    if (isPaid) {
      totalTaxGst += ord.pricing?.taxGst || 0;
      totalDeliveryFees += ord.pricing?.deliveryFee || 0;
      totalInstallationCharges += ord.pricing?.installationCharge || 0;
      if (ord.paymentMethod === 'online') {
        orderGw = ord.pricing?.gatewayFee || Math.round((ord.pricing?.totalAmount || 0) * 0.02);
        totalGatewayFees += orderGw;
      }
    }

    let orderRefund = 0;
    if (isRefunded) {
      orderRefund = ord.pricing?.refundAmount || ord.pricing?.totalAmount || 0;
      totalRefunds += orderRefund;
    }

    // Daily breakdown aggregation
    const dayKey = toKolkataDateString(ord.paymentDetails?.paidAt || ord.createdAt);
    const existing = dailyMap.get(dayKey) || { date: dayKey, grossSales: 0, refunds: 0, cogs: 0, gatewayFees: 0, ordersCount: 0 };
    if (isPaid) {
      existing.grossSales += orderOwnedGross;
      existing.cogs += orderOwnedProcurement;
      existing.gatewayFees += orderGw;
      existing.ordersCount++;
    }
    if (isRefunded) {
      existing.refunds += orderRefund;
    }
    dailyMap.set(dayKey, existing);
  }

  // Net Recognized Revenue = Gross Sales - Discounts - Refunds (Taxes are held in trust, not operating revenue)
  const netRevenue = Math.max(0, grossSales - totalDiscounts - totalRefunds);
  const estimatedContributionMargin = netRevenue - totalProcurementCost - totalGatewayFees;
  const contributionMarginPct = netRevenue > 0
    ? Number(((estimatedContributionMargin / netRevenue) * 100).toFixed(1))
    : 0;

  // Paginated records
  const paginatedOrders = allMatchingOrders.slice(skip, skip + limit);

  const transactions = paginatedOrders.map((ord) => {
    const ownedItems = ord.items.filter((i) => i.sourcingType === 'own_stock' || !i.supplierId);
    const itemQuantity = ownedItems.reduce((acc, i) => acc + i.quantity, 0);
    const itemSubtotal = ownedItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
    const itemProcurement = ownedItems.reduce((acc, i) => acc + (i.procurementCost || 0) * i.quantity, 0);
    const hasRental = ownedItems.some((i) => i.isRental);

    return {
      transactionId: ord.paymentDetails?.razorpayPaymentId || ord.orderNumber,
      orderId: ord._id.toString(),
      orderNumber: ord.orderNumber,
      date: (ord.paymentDetails?.paidAt || ord.createdAt).toISOString(),
      patientName: ord.patientName,
      itemsSummary: ownedItems.map((i) => `${i.title} (x${i.quantity})`).join(', ') || 'Medical Equipment Item',
      skuList: ownedItems.map((i) => i.sku),
      quantity: itemQuantity,
      subtotal: itemSubtotal,
      taxGst: ord.pricing?.taxGst || 0,
      totalAmount: ord.pricing?.totalAmount || itemSubtotal,
      procurementCost: itemProcurement,
      gatewayFee: ord.pricing?.gatewayFee || (ord.paymentMethod === 'online' ? Math.round((ord.pricing?.totalAmount || itemSubtotal) * 0.02) : 0),
      refundAmount: ord.pricing?.refundAmount || (ord.paymentStatus === 'refunded' ? ord.pricing?.totalAmount || 0 : 0),
      paymentStatus: ord.paymentStatus,
      orderStatus: ord.orderStatus,
      paymentMethod: ord.paymentMethod || 'online',
      isRental: hasRental,
      refundDetails: ord.paymentStatus === 'refunded' || ord.cancellation?.refundStatus === 'processed' ? {
        refundAmount: ord.pricing?.refundAmount || ord.pricing?.totalAmount || 0,
        refundReason: ord.cancellation?.cancellationReason || 'Order cancellation / return',
        refundDate: ord.cancellation?.cancelledAt ? new Date(ord.cancellation.cancelledAt).toISOString() : undefined,
      } : undefined,
    };
  });

  return {
    periodLabel: label,
    grossSales,
    totalOrders: allMatchingOrders.length,
    totalUnitsSold,
    totalDiscounts,
    totalTaxGst,
    totalDeliveryFees,
    totalInstallationCharges,
    totalProcurementCost,
    totalRefunds,
    totalGatewayFees,
    netRevenue,
    estimatedContributionMargin,
    contributionMarginPct,
    paymentStatusCounts,
    orderStatusCounts,
    dailyBreakdown: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    transactions,
    pagination: {
      page,
      limit,
      total: allMatchingOrders.length,
      pages: Math.ceil(allMatchingOrders.length / limit) || 1,
    },
  };
};

// =============================================================================
// DOMAIN B: THIRD-PARTY MARKETPLACE & SUPPLIERS FINANCE
// =============================================================================

export interface MarketplaceFinanceSummary {
  periodLabel: string;
  totalMarketplaceGMV: number;
  totalUnitsSold: number;
  totalSupplierOrders: number;
  earnedPlatformCommission: number;
  averageCommissionRatePct: number;
  supplierPayablesTotal: number;
  supplierPayablesSettled: number;
  supplierPayablesPending: number;
  totalTaxGst: number;
  totalRefunds: number;
  totalGatewayFees: number;
  marketplaceNetRevenue: number;
  supplierBreakdown: Array<{
    supplierId: string;
    supplierName: string;
    supplierCode: string;
    commissionRatePct: number;
    unitsSold: number;
    grossSalesGMV: number;
    platformCommission: number;
    supplierPayable: number;
    settledAmount: number;
    pendingPayable: number;
  }>;
  transactions: Array<{
    transactionId: string;
    orderNumber: string;
    supplierId: string;
    supplierName: string;
    productTitle: string;
    sku: string;
    quantity: number;
    customerCollection: number;
    commissionRatePct: number;
    platformCommission: number;
    supplierPayable: number;
    settlementStatus: 'settled' | 'pending';
    paymentStatus: string;
    orderStatus: string;
    date: string;
    refundAmount?: number;
  }>;
  dailyBreakdown?: Array<{
    date: string;
    gmv: number;
    commission: number;
    supplierPayable: number;
    refunds: number;
    gatewayFees: number;
    ordersCount: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getMarketplaceFinance = async (
  filter: FinanceDateFilter
): Promise<MarketplaceFinanceSummary> => {
  await seedMultiPeriodFinanceDataIfEmpty();

  const { start, end, label } = resolveDateRange(filter);
  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
  const skip = (page - 1) * limit;

  // 1. Fetch Suppliers Map
  const suppliers = await Supplier.find().lean();
  const supplierMap = new Map<string, any>();
  for (const s of suppliers) {
    supplierMap.set(s._id.toString(), s);
  }

  // 2. Fetch Supplier Purchase Orders (for PO settled/pending tracking)
  const poQuery: any = {};
  if (start || end) {
    poQuery.createdAt = {};
    if (start) poQuery.createdAt.$gte = start;
    if (end) poQuery.createdAt.$lte = end;
  }
  const purchaseOrders = await SupplierPurchaseOrder.find(poQuery).lean();

  // 3. Fetch Orders with supplier direct items
  const andClauses: any[] = [
    {
      $or: [
        { 'items.sourcingType': 'supplier_direct' },
        { 'items.supplierId': { $ne: null } },
      ],
    },
    { isArchived: { $ne: true } },
  ];

  if (start || end) {
    const dateClause: any = {};
    if (start) dateClause.$gte = start;
    if (end) dateClause.$lte = end;
    andClauses.push({ createdAt: dateClause });
  }

  if (filter.supplierId && filter.supplierId !== 'all') {
    andClauses.push({ 'items.supplierId': new mongoose.Types.ObjectId(filter.supplierId) });
  }

  if (filter.status && filter.status !== 'all') {
    andClauses.push({ paymentStatus: filter.status });
  }

  if (filter.search && filter.search.trim()) {
    const regex = new RegExp(filter.search.trim(), 'i');
    andClauses.push({
      $or: [
        { orderNumber: regex },
        { 'items.supplierName': regex },
        { 'items.sku': regex },
        { 'items.title': regex },
        { patientName: regex },
      ],
    });
  }

  const matchQuery = andClauses.length > 1 ? { $and: andClauses } : andClauses[0];

  const matchingOrders = await ProductOrder.find(matchQuery).sort({ createdAt: -1 }).lean();

  let totalMarketplaceGMV = 0;
  let totalUnitsSold = 0;
  let totalCommissionEarned = 0;
  let totalTaxGst = 0;
  let totalRefunds = 0;
  let totalGatewayFees = 0;

  // Supplier Breakdown Accumulator
  const supplierAgg = new Map<string, {
    supplierId: string;
    supplierName: string;
    supplierCode: string;
    commissionRatePct: number;
    unitsSold: number;
    grossSalesGMV: number;
    platformCommission: number;
    supplierPayable: number;
    settledAmount: number;
    pendingPayable: number;
  }>();

  // Initialize all known suppliers
  for (const s of suppliers) {
    supplierAgg.set(s._id.toString(), {
      supplierId: s._id.toString(),
      supplierName: s.name,
      supplierCode: s.supplierCode,
      commissionRatePct: s.commissionRatePercentage || 10,
      unitsSold: 0,
      grossSalesGMV: 0,
      platformCommission: 0,
      supplierPayable: 0,
      settledAmount: 0,
      pendingPayable: 0,
    });
  }

  // Tally POs
  for (const po of purchaseOrders) {
    const sId = po.supplierId?.toString();
    const agg = supplierAgg.get(sId);
    if (agg) {
      agg.settledAmount += po.paidAmount || 0;
      const pending = Math.max(0, (po.totalProcurementCost || 0) - (po.paidAmount || 0));
      agg.pendingPayable += pending;
    }
  }

  // Flattened line items for transaction view
  const allTransactions: Array<{
    transactionId: string;
    orderNumber: string;
    supplierId: string;
    supplierName: string;
    productTitle: string;
    sku: string;
    quantity: number;
    customerCollection: number;
    commissionRatePct: number;
    platformCommission: number;
    supplierPayable: number;
    settlementStatus: 'settled' | 'pending';
    paymentStatus: string;
    orderStatus: string;
    date: string;
    refundAmount?: number;
  }> = [];

  const dailyMktMap = new Map<string, { date: string; gmv: number; commission: number; supplierPayable: number; refunds: number; gatewayFees: number; ordersCount: number }>();

  for (const ord of matchingOrders) {
    const isPaid = (ord.paymentStatus === 'paid' || ord.paymentStatus === 'cod') && ord.orderStatus !== 'cancelled';
    const isRefunded = ord.paymentStatus === 'refunded' || ord.cancellation?.refundStatus === 'processed';

    const dayKey = toKolkataDateString(ord.paymentDetails?.paidAt || ord.createdAt);
    const dayEntry = dailyMktMap.get(dayKey) || { date: dayKey, gmv: 0, commission: 0, supplierPayable: 0, refunds: 0, gatewayFees: 0, ordersCount: 0 };

    for (const item of ord.items) {
      const isSupplierItem = item.sourcingType === 'supplier_direct' || Boolean(item.supplierId);
      if (!isSupplierItem) continue;

      const supId = item.supplierId?.toString() || suppliers[0]?._id?.toString() || 'unknown';
      const supRecord = supplierMap.get(supId);
      const commissionRate = supRecord?.commissionRatePercentage || 10;
      const itemGMV = item.unitPrice * item.quantity;
      const commEarned = Math.round(itemGMV * (commissionRate / 100));
      const payable = Math.max(0, itemGMV - commEarned);

      if (isPaid) {
        totalMarketplaceGMV += itemGMV;
        totalUnitsSold += item.quantity;
        totalCommissionEarned += commEarned;
        totalTaxGst += Math.round(itemGMV * 0.12);
        let gw = 0;
        if (ord.paymentMethod === 'online') {
          gw = Math.round(itemGMV * 0.02);
          totalGatewayFees += gw;
        }

        dayEntry.gmv += itemGMV;
        dayEntry.commission += commEarned;
        dayEntry.supplierPayable += payable;
        dayEntry.gatewayFees += gw;
        dayEntry.ordersCount++;

        const agg = supplierAgg.get(supId);
        if (agg) {
          agg.grossSalesGMV += itemGMV;
          agg.unitsSold += item.quantity;
          agg.platformCommission += commEarned;
          agg.supplierPayable += payable;
          agg.pendingPayable += payable; // Default direct order liability
        }
      }

      if (isRefunded) {
        totalRefunds += itemGMV;
        dayEntry.refunds += itemGMV;
      }

      allTransactions.push({
        transactionId: ord.paymentDetails?.razorpayPaymentId || ord.orderNumber,
        orderNumber: ord.orderNumber,
        supplierId: supId,
        supplierName: item.supplierName || supRecord?.name || 'Authorized Supplier Partner',
        productTitle: item.title,
        sku: item.sku,
        quantity: item.quantity,
        customerCollection: itemGMV,
        commissionRatePct: commissionRate,
        platformCommission: commEarned,
        supplierPayable: payable,
        settlementStatus: item.supplierStatus === 'dispatched' ? 'settled' : 'pending',
        paymentStatus: ord.paymentStatus,
        orderStatus: ord.orderStatus,
        date: ord.createdAt.toISOString(),
        refundAmount: isRefunded ? itemGMV : 0,
      });
    }

    if (dayEntry.gmv > 0 || dayEntry.refunds > 0) {
      dailyMktMap.set(dayKey, dayEntry);
    }
  }

  // Calculate totals from supplier aggregations
  let supplierPayablesTotal = 0;
  let supplierPayablesSettled = 0;
  let supplierPayablesPending = 0;
  for (const val of supplierAgg.values()) {
    supplierPayablesTotal += val.supplierPayable;
    supplierPayablesSettled += val.settledAmount;
    supplierPayablesPending += val.pendingPayable;
  }

  // Marketplace Net Revenue: Only platform commission earned, minus gateway fees and returns
  const marketplaceNetRevenue = Math.max(0, totalCommissionEarned - totalGatewayFees);
  const averageCommissionRatePct = totalMarketplaceGMV > 0
    ? Number(((totalCommissionEarned / totalMarketplaceGMV) * 100).toFixed(1))
    : 10;

  const paginatedTransactions = allTransactions.slice(skip, skip + limit);

  return {
    periodLabel: label,
    totalMarketplaceGMV,
    totalUnitsSold,
    totalSupplierOrders: matchingOrders.length,
    earnedPlatformCommission: totalCommissionEarned,
    averageCommissionRatePct,
    supplierPayablesTotal,
    supplierPayablesSettled,
    supplierPayablesPending,
    totalTaxGst,
    totalRefunds,
    totalGatewayFees,
    marketplaceNetRevenue,
    supplierBreakdown: Array.from(supplierAgg.values()),
    dailyBreakdown: Array.from(dailyMktMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    transactions: paginatedTransactions,
    pagination: {
      page,
      limit,
      total: allTransactions.length,
      pages: Math.ceil(allTransactions.length / limit) || 1,
    },
  };
};

// =============================================================================
// DOMAIN C: CAREGIVER SUBSCRIPTIONS & VISIT PACKAGES FINANCE
// =============================================================================

export interface SubscriptionsFinanceSummary {
  periodLabel: string;
  totalCollections: number;
  totalSubscriptionsCount: number;
  monthlySubscriptionsCount: number;
  fixedVisitPackagesCount: number;
  activeSubscriptionsCount: number;
  expiredSubscriptionsCount: number;
  cancelledSubscriptionsCount: number;
  caregiverPayoutLiabilities: number;
  platformMargin: number;
  monthlyRecurringRevenue: number;
  totalGatewayFees: number;
  refundsProcessed: number;
  paymentStatusCounts: {
    paid: number;
    pending: number;
    refunded: number;
  };
  dailyCollections: Array<{
    date: string;
    amount: number;
    subscriptionCount: number;
    caregiverPayouts?: number;
    refunds?: number;
    gatewayFees?: number;
  }>;
  transactions: Array<{
    subscriptionNumber: string;
    invoiceNumber: string;
    patientName: string;
    patientPhone: string;
    planTitle: string;
    planType: string;
    durationDays: number;
    startDate: string;
    endDate: string;
    totalVisitsIncluded: number;
    visitsCompleted: number;
    visitsRemaining: number;
    customerPrice: number;
    caregiverPayout: number;
    platformCommission: number;
    paymentStatus: string;
    status: string;
    paymentMethod: string;
    razorpayPaymentId?: string;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getSubscriptionsFinance = async (
  filter: FinanceDateFilter
): Promise<SubscriptionsFinanceSummary> => {
  await seedMultiPeriodFinanceDataIfEmpty();

  const { start, end, label } = resolveDateRange(filter);
  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
  const skip = (page - 1) * limit;

  const andClauses: any[] = [];

  if (start || end) {
    const dateClause: any = {};
    if (start) dateClause.$gte = start;
    if (end) dateClause.$lte = end;
    andClauses.push({ createdAt: dateClause });
  }

  if (filter.status && filter.status !== 'all') {
    andClauses.push({ status: filter.status });
  }

  if (filter.search && filter.search.trim()) {
    const regex = new RegExp(filter.search.trim(), 'i');
    andClauses.push({
      $or: [
        { subscriptionNumber: regex },
        { invoiceNumber: regex },
        { patientName: regex },
        { patientPhone: regex },
        { planTitle: regex },
        { 'pricing.razorpayPaymentId': regex },
      ],
    });
  }

  const matchQuery = andClauses.length > 1 ? { $and: andClauses } : (andClauses[0] || {});

  const allSubs = await CaregiverSubscription.find(matchQuery).sort({ createdAt: -1 }).lean();

  let totalCollections = 0;
  let caregiverPayoutLiabilities = 0;
  let platformMargin = 0;
  let monthlyRecurringRevenue = 0;
  let totalGatewayFees = 0;
  let refundsProcessed = 0;
  let monthlySubscriptionsCount = 0;
  let fixedVisitPackagesCount = 0;
  let activeSubscriptionsCount = 0;
  let expiredSubscriptionsCount = 0;
  let cancelledSubscriptionsCount = 0;

  const paymentStatusCounts = { paid: 0, pending: 0, refunded: 0 };
  const dailyCollectionsMap = new Map<string, {
    date: string;
    amount: number;
    subscriptionCount: number;
    caregiverPayouts: number;
    refunds: number;
    gatewayFees: number;
  }>();

  for (const sub of allSubs) {
    const isPaid = sub.pricing?.paymentStatus === 'paid';
    const isMonthly = sub.totalVisitsIncluded >= 20 || (sub.planTitle || '').toLowerCase().includes('monthly');

    if (isMonthly) {
      monthlySubscriptionsCount++;
    } else {
      fixedVisitPackagesCount++;
    }

    if (sub.status === 'active') activeSubscriptionsCount++;
    else if (sub.status === 'expired' || sub.status === 'completed') expiredSubscriptionsCount++;
    else if (sub.status === 'cancelled') cancelledSubscriptionsCount++;

    if (sub.pricing?.paymentStatus === 'paid') paymentStatusCounts.paid++;
    else if (sub.pricing?.paymentStatus === 'pending') paymentStatusCounts.pending++;
    else if (sub.pricing?.paymentStatus === 'refunded') paymentStatusCounts.refunded++;

    const dayKey = toKolkataDateString(sub.createdAt);
    const existingDay = dailyCollectionsMap.get(dayKey) || {
      date: dayKey,
      amount: 0,
      subscriptionCount: 0,
      caregiverPayouts: 0,
      refunds: 0,
      gatewayFees: 0,
    };

    if (isPaid && sub.status !== 'cancelled') {
      const price = sub.pricing?.customerPrice || 0;
      const payout = sub.pricing?.caregiverPayout || 0;
      const margin = price - payout;

      totalCollections += price;
      caregiverPayoutLiabilities += payout;
      platformMargin += margin;

      if (isMonthly && sub.status === 'active') {
        monthlyRecurringRevenue += price;
      }

      const gw = Math.round(price * 0.02);
      totalGatewayFees += gw;

      // Daily trend aggregation
      existingDay.amount += price;
      existingDay.caregiverPayouts += payout;
      existingDay.gatewayFees += gw;
      existingDay.subscriptionCount++;
      dailyCollectionsMap.set(dayKey, existingDay);
    }

    if (sub.status === 'cancelled' || sub.pricing?.paymentStatus === 'refunded') {
      const rf = sub.pricing?.customerPrice || 0;
      refundsProcessed += rf;
      existingDay.refunds += rf;
      dailyCollectionsMap.set(dayKey, existingDay);
    }
  }

  const paginatedSubs = allSubs.slice(skip, skip + limit);

  const transactions = paginatedSubs.map((sub) => {
    const isMonthly = sub.totalVisitsIncluded >= 20 || (sub.planTitle || '').toLowerCase().includes('monthly');
    return {
      subscriptionNumber: sub.subscriptionNumber,
      invoiceNumber: sub.invoiceNumber || `INV-${sub.subscriptionNumber}`,
      patientName: sub.patientName,
      patientPhone: sub.patientPhone,
      planTitle: sub.planTitle,
      planType: isMonthly ? 'Monthly Subscription' : 'Fixed Visit Package',
      durationDays: Math.round((new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 30,
      startDate: new Date(sub.startDate).toISOString(),
      endDate: new Date(sub.endDate).toISOString(),
      totalVisitsIncluded: sub.totalVisitsIncluded,
      visitsCompleted: sub.visitsCompleted,
      visitsRemaining: sub.visitsRemaining,
      customerPrice: sub.pricing?.customerPrice || 0,
      caregiverPayout: sub.pricing?.caregiverPayout || 0,
      platformCommission: sub.pricing?.platformCommission || (sub.pricing?.customerPrice || 0) - (sub.pricing?.caregiverPayout || 0),
      paymentStatus: sub.pricing?.paymentStatus || 'pending',
      status: sub.status,
      paymentMethod: sub.pricing?.paymentMethod || 'online',
      razorpayPaymentId: sub.pricing?.razorpayPaymentId,
      createdAt: sub.createdAt.toISOString(),
    };
  });

  return {
    periodLabel: label,
    totalCollections,
    totalSubscriptionsCount: allSubs.length,
    monthlySubscriptionsCount,
    fixedVisitPackagesCount,
    activeSubscriptionsCount,
    expiredSubscriptionsCount,
    cancelledSubscriptionsCount,
    caregiverPayoutLiabilities,
    platformMargin,
    monthlyRecurringRevenue,
    totalGatewayFees,
    refundsProcessed,
    paymentStatusCounts,
    dailyCollections: Array.from(dailyCollectionsMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    transactions,
    pagination: {
      page,
      limit,
      total: allSubs.length,
      pages: Math.ceil(allSubs.length / limit) || 1,
    },
  };
};

// =============================================================================
// COMBINED FINANCE OVERVIEW & RECONCILIATION
// =============================================================================

export interface DailyRevenueSummary {
  date: string;
  ownedCollections: number;
  marketplaceCollections: number;
  subscriptionCollections: number;
  completedRefunds: number;
  netRecognizedRevenue: number;
  estimatedOperatingResult: number;
  hasSufficientCostData: boolean;
}

export interface UnifiedFinanceTransaction {
  id: string;
  date: string;
  reference: string;
  category: 'Owned Product' | 'Marketplace Partner' | 'Caregiver Subscription' | 'Visit Package';
  amount: number;
  paymentStatus: 'Successful' | 'Pending' | 'Failed' | 'Refunded';
  refundStatus: 'None' | 'Refund Pending' | 'Refunded';
  refundAmount?: number;
  orderOrSubscriptionStatus: string;
  cancellationDate?: string;
  cancellationReason?: string;
  patientName?: string;
  itemsSummary?: string;
}

export interface SimplifiedProfitAndLoss {
  moneyReceived: number;
  completedRefunds: number;
  directCOGS: number;
  caregiverPayouts: number;
  paymentGatewayFees: number;
  estimatedOperatingResult: number;
  isProfit: boolean;
  costDataStatus: 'complete' | 'estimated';
  explanation: string;
}

export interface ProfitLossDataPoint {
  period: string;
  dateKey: string;
  timestamp: number;
  revenue: number;
  expenses: number;
  netProfitOrLoss: number;
  isProfit: boolean;
  revenueChangePct?: number | null;
  profitChangePct?: number | null;
  expenseChangePct?: number | null;
}

export interface ProfitLossAnalyticsSummary {
  periodLabel: string;
  category: 'overview' | 'owned' | 'marketplace' | 'subscriptions';
  grouping: 'daily' | 'weekly' | 'monthly' | 'yearly';
  kpis: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    netLoss: number;
    netOperatingResult: number;
    marginPct: number;
    isOverallProfit: boolean;
    costDataStatus: 'complete' | 'estimated';
    hasSufficientCostData: boolean;
  };
  series: ProfitLossDataPoint[];
}

export interface CombinedFinanceSummary {
  periodLabel: string;
  primaryKpis: {
    totalMoneyReceived: number;
    productSalesRevenue: number;
    marketplaceSales: {
      gmv: number;
      vivoquestRevenue: number;
      supplierPayable: number;
    };
    subscriptionRevenue: number;
    activeSubscriptions: number;
    refundsAndCancellations: {
      completedRefundsAmount: number;
      refundedOrdersCount: number;
      cancelledOrdersCount: number;
      cancelledSubscriptionsCount: number;
    };
    netOperatingResult: {
      amount: number;
      isProfit: boolean;
      marginPct: number;
      costDataStatus: 'complete' | 'estimated';
    };
  };
  profitAndLoss: SimplifiedProfitAndLoss;
  dailySummaries: DailyRevenueSummary[];
  unifiedTransactions: UnifiedFinanceTransaction[];
  profitLossAnalytics?: ProfitLossAnalyticsSummary;
  executiveSummary: {
    grossMerchandiseValue: number;
    recognizedNetRevenue: number;
    estimatedContributionMargin: number;
    contributionMarginPct: number;
    customerCollections: number;
    totalCustomerCollections: number;
    totalMoneyReceived: number;
    totalExpenses: number;
    netProfitOrLoss: number;
    isProfit: boolean;
    calculationExplanation: string;
    pendingCustomerPayments: number;
    pendingSupplierPayments: number;
    completedRefunds: number;
    pendingRefunds: number;
    taxesCollected: number;
    paymentGatewayFees: number;
    directCOGS: number;
    laborLiabilities: number;
    supplierLiabilitiesPending: number;
    supplierLiabilitiesSettled: number;
    gatewayFees: number;
    refundsTotal: number;
    onlineSettlementsVolume: number;
    costDataStatus: 'complete' | 'estimated';
  };
  sectionSummaries: {
    ownedProducts: {
      grossSales: number;
      ordersCount: number;
      cogs: number;
      netMargin: number;
    };
    marketplace: {
      gmv: number;
      ordersCount: number;
      earnedCommission: number;
      supplierPayablesPending: number;
    };
    subscriptions: {
      collections: number;
      activeCount: number;
      caregiverPayoutLiabilities: number;
      mrr: number;
    };
  };
  reconciliationLedger: Array<{
    ledgerAccount: string;
    classification: string;
    treatment: string;
    amount: number;
    type: 'add' | 'deduct' | 'total';
  }>;
}

export const getCombinedFinanceSummary = async (
  filter: FinanceDateFilter
): Promise<CombinedFinanceSummary> => {
  const [owned, marketplace, subs] = await Promise.all([
    getOwnedProductsFinance(filter),
    getMarketplaceFinance(filter),
    getSubscriptionsFinance(filter),
  ]);

  // Gross Merchandise Value across platform
  const gmv = owned.grossSales + marketplace.totalMarketplaceGMV + subs.totalCollections;

  // VivoQuest Recognized Revenue = Owned Net Sales + Marketplace Earned Commission + Subscription Collections
  const recognizedRevenue = owned.netRevenue + marketplace.earnedPlatformCommission + subs.totalCollections;

  // Total Direct Outflows
  const totalCOGS = owned.totalProcurementCost;
  const totalLabor = subs.caregiverPayoutLiabilities;
  const totalGatewayFees = owned.totalGatewayFees + marketplace.totalGatewayFees + subs.totalGatewayFees;
  const totalRefunds = owned.totalRefunds + marketplace.totalRefunds + subs.refundsProcessed;

  // Estimated Contribution Margin = Recognized Revenue - Direct Outflows
  const estimatedContributionMargin = recognizedRevenue - totalCOGS - totalLabor - totalGatewayFees - totalRefunds;
  const contributionMarginPct = recognizedRevenue > 0
    ? Number(((estimatedContributionMargin / recognizedRevenue) * 100).toFixed(1))
    : 0;

  // Statutory taxes collected (held in trust, not recognized operating revenue)
  const totalTaxGst = owned.totalTaxGst + marketplace.totalTaxGst + Math.round(subs.totalCollections * 0.18);

  // Total direct expenses
  const totalExpenses = totalCOGS + totalLabor + totalGatewayFees;
  const netProfitOrLoss = estimatedContributionMargin;
  const isProfit = netProfitOrLoss >= 0;

  // Plain business language explanation
  const calculationExplanation = `Recognized Revenue (₹${recognizedRevenue.toLocaleString('en-IN')}) − Direct Product COGS (₹${totalCOGS.toLocaleString('en-IN')}) − Caregiver Payouts (₹${totalLabor.toLocaleString('en-IN')}) − Payment Gateway Fees (₹${totalGatewayFees.toLocaleString('en-IN')}) − Completed Refunds (₹${totalRefunds.toLocaleString('en-IN')}) = ${isProfit ? 'Net Profit' : 'Net Loss'} of ₹${Math.abs(netProfitOrLoss).toLocaleString('en-IN')}`;

  // 1. Build Daily Revenue Summaries across all three streams
  const allDateSet = new Set<string>();
  (owned.dailyBreakdown || []).forEach((d) => allDateSet.add(d.date));
  (marketplace.dailyBreakdown || []).forEach((d) => allDateSet.add(d.date));
  (subs.dailyCollections || []).forEach((d) => allDateSet.add(d.date));

  const sortedDates = Array.from(allDateSet).sort();
  const ownedDayMap = new Map((owned.dailyBreakdown || []).map((d) => [d.date, d]));
  const mktDayMap = new Map((marketplace.dailyBreakdown || []).map((d) => [d.date, d]));
  const subDayMap = new Map((subs.dailyCollections || []).map((d) => [d.date, d]));

  const dailySummaries: DailyRevenueSummary[] = sortedDates.map((date) => {
    const o = ownedDayMap.get(date) || { grossSales: 0, refunds: 0, cogs: 0, gatewayFees: 0 };
    const m = mktDayMap.get(date) || { gmv: 0, commission: 0, supplierPayable: 0, refunds: 0, gatewayFees: 0 };
    const s = subDayMap.get(date) || { amount: 0, caregiverPayouts: 0, refunds: 0, gatewayFees: 0 };

    const ownedCollections = o.grossSales;
    const marketplaceCollections = m.gmv;
    const subscriptionCollections = s.amount;
    const completedRefunds = o.refunds + m.refunds + (s.refunds || 0);
    const netRecognizedRevenue = Math.max(0, (ownedCollections - o.refunds) + m.commission + (subscriptionCollections - (s.refunds || 0)));
    const estimatedOperatingResult = netRecognizedRevenue - o.cogs - (s.caregiverPayouts || 0) - o.gatewayFees - m.gatewayFees - (s.gatewayFees || 0);

    return {
      date,
      ownedCollections,
      marketplaceCollections,
      subscriptionCollections,
      completedRefunds,
      netRecognizedRevenue,
      estimatedOperatingResult,
      hasSufficientCostData: true,
    };
  });

  // 2. Primary 7 KPI Cards (Clean, unambiguous, server-authoritative)
  const primaryKpis = {
    totalMoneyReceived: gmv,
    productSalesRevenue: owned.netRevenue,
    marketplaceSales: {
      gmv: marketplace.totalMarketplaceGMV,
      vivoquestRevenue: marketplace.earnedPlatformCommission,
      supplierPayable: marketplace.supplierPayablesPending,
    },
    subscriptionRevenue: subs.totalCollections,
    activeSubscriptions: subs.activeSubscriptionsCount,
    refundsAndCancellations: {
      completedRefundsAmount: totalRefunds,
      refundedOrdersCount: (owned.paymentStatusCounts.refunded || 0) + (marketplace.totalRefunds > 0 ? 1 : 0),
      cancelledOrdersCount: (owned.orderStatusCounts['cancelled'] || 0),
      cancelledSubscriptionsCount: subs.cancelledSubscriptionsCount,
    },
    netOperatingResult: {
      amount: estimatedContributionMargin,
      isProfit,
      marginPct: contributionMarginPct,
      costDataStatus: 'complete' as const,
    },
  };

  // 3. Simplified Understandable Profit and Loss Statement
  const profitAndLoss: SimplifiedProfitAndLoss = {
    moneyReceived: gmv,
    completedRefunds: totalRefunds,
    directCOGS: totalCOGS,
    caregiverPayouts: totalLabor,
    paymentGatewayFees: totalGatewayFees,
    estimatedOperatingResult: estimatedContributionMargin,
    isProfit,
    costDataStatus: 'complete',
    explanation: calculationExplanation,
  };

  // 4. Unified Financial Transactions across all domains
  const unifiedTransactions: UnifiedFinanceTransaction[] = [];

  for (const tx of owned.transactions) {
    const isPaid = tx.paymentStatus === 'paid' || tx.paymentStatus === 'cod';
    const isRefunded = tx.paymentStatus === 'refunded' || tx.refundAmount > 0;
    unifiedTransactions.push({
      id: tx.orderId || tx.orderNumber,
      date: tx.date,
      reference: tx.orderNumber,
      category: 'Owned Product',
      amount: tx.totalAmount,
      paymentStatus: isRefunded ? 'Refunded' : isPaid ? 'Successful' : tx.paymentStatus === 'pending' ? 'Pending' : 'Failed',
      refundStatus: isRefunded ? 'Refunded' : 'None',
      refundAmount: tx.refundAmount || 0,
      orderOrSubscriptionStatus: tx.orderStatus,
      cancellationDate: tx.refundDetails?.refundDate,
      cancellationReason: tx.refundDetails?.refundReason,
      patientName: tx.patientName,
      itemsSummary: tx.itemsSummary,
    });
  }

  for (const tx of marketplace.transactions) {
    const isPaid = tx.paymentStatus === 'paid' || tx.paymentStatus === 'cod';
    const isRefunded = tx.paymentStatus === 'refunded' || (tx.refundAmount && tx.refundAmount > 0);
    unifiedTransactions.push({
      id: tx.transactionId || tx.orderNumber,
      date: tx.date,
      reference: tx.orderNumber,
      category: 'Marketplace Partner',
      amount: tx.customerCollection,
      paymentStatus: isRefunded ? 'Refunded' : isPaid ? 'Successful' : tx.paymentStatus === 'pending' ? 'Pending' : 'Failed',
      refundStatus: isRefunded ? 'Refunded' : 'None',
      refundAmount: tx.refundAmount || 0,
      orderOrSubscriptionStatus: tx.orderStatus,
      patientName: tx.supplierName,
      itemsSummary: `${tx.productTitle} (${tx.supplierName})`,
    });
  }

  for (const sub of subs.transactions) {
    const isPaid = sub.paymentStatus === 'paid';
    const isCancelled = sub.status === 'cancelled';
    const isRefunded = isCancelled || sub.paymentStatus === 'refunded';
    unifiedTransactions.push({
      id: sub.subscriptionNumber,
      date: sub.createdAt,
      reference: sub.subscriptionNumber,
      category: sub.planType === 'Monthly Subscription' ? 'Caregiver Subscription' : 'Visit Package',
      amount: sub.customerPrice,
      paymentStatus: isRefunded ? 'Refunded' : isPaid ? 'Successful' : sub.paymentStatus === 'pending' ? 'Pending' : 'Failed',
      refundStatus: isRefunded ? 'Refunded' : 'None',
      refundAmount: isRefunded ? sub.customerPrice : 0,
      orderOrSubscriptionStatus: sub.status,
      cancellationDate: isCancelled ? sub.endDate : undefined,
      cancellationReason: isCancelled ? 'Customer requested plan cancellation' : undefined,
      patientName: sub.patientName,
      itemsSummary: sub.planTitle,
    });
  }

  unifiedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    periodLabel: owned.periodLabel,
    primaryKpis,
    profitAndLoss,
    dailySummaries,
    unifiedTransactions,
    executiveSummary: {
      grossMerchandiseValue: gmv,
      recognizedNetRevenue: recognizedRevenue,
      estimatedContributionMargin,
      contributionMarginPct,
      customerCollections: gmv,
      totalCustomerCollections: gmv,
      totalMoneyReceived: gmv,
      costDataStatus: 'complete',
      totalExpenses,
      netProfitOrLoss,
      isProfit,
      calculationExplanation,
      pendingCustomerPayments: (owned.paymentStatusCounts.pending || 0) * 1299, // estimated uncollected value
      pendingSupplierPayments: marketplace.supplierPayablesPending,
      completedRefunds: totalRefunds,
      pendingRefunds: 0,
      taxesCollected: totalTaxGst,
      paymentGatewayFees: totalGatewayFees,
      directCOGS: totalCOGS,
      laborLiabilities: totalLabor,
      supplierLiabilitiesPending: marketplace.supplierPayablesPending,
      supplierLiabilitiesSettled: marketplace.supplierPayablesSettled,
      gatewayFees: totalGatewayFees,
      refundsTotal: totalRefunds,
      onlineSettlementsVolume: gmv,
    },
    sectionSummaries: {
      ownedProducts: {
        grossSales: owned.grossSales,
        ordersCount: owned.totalOrders,
        cogs: owned.totalProcurementCost,
        netMargin: owned.estimatedContributionMargin,
      },
      marketplace: {
        gmv: marketplace.totalMarketplaceGMV,
        ordersCount: marketplace.totalSupplierOrders,
        earnedCommission: marketplace.earnedPlatformCommission,
        supplierPayablesPending: marketplace.supplierPayablesPending,
      },
      subscriptions: {
        collections: subs.totalCollections,
        activeCount: subs.activeSubscriptionsCount,
        caregiverPayoutLiabilities: subs.caregiverPayoutLiabilities,
        mrr: subs.monthlyRecurringRevenue,
      },
    },
    reconciliationLedger: [
      {
        ledgerAccount: 'Medical Equipment Retail Sales (Owned)',
        classification: 'Product Revenue Inflow',
        treatment: 'Add (+) Gross Sales',
        amount: owned.grossSales,
        type: 'add',
      },
      {
        ledgerAccount: 'Marketplace Partner Collections (GMV)',
        classification: 'Third-Party Product Flow',
        treatment: 'Non-Operating Inflow (Fiduciary)',
        amount: marketplace.totalMarketplaceGMV,
        type: 'add',
      },
      {
        ledgerAccount: 'Caregiver Subscriptions & Visit Packages',
        classification: 'Clinical Care Service Inflow',
        treatment: 'Add (+) Service Revenue',
        amount: subs.totalCollections,
        type: 'add',
      },
      {
        ledgerAccount: 'Equipment Sourcing Procurement (COGS)',
        classification: 'Direct Inventory Expense',
        treatment: 'Deduct (-) Direct Procurement',
        amount: -totalCOGS,
        type: 'deduct',
      },
      {
        ledgerAccount: 'Caregiver Bedside Shift Compensation',
        classification: 'Clinical Labor Liability',
        treatment: 'Deduct (-) Caregiver Payouts',
        amount: -totalLabor,
        type: 'deduct',
      },
      {
        ledgerAccount: 'Third-Party Supplier Payables Accrued',
        classification: 'Trade Supplier Liability',
        treatment: 'Deduct (-) Net Supplier Payout',
        amount: -marketplace.supplierPayablesPending,
        type: 'deduct',
      },
      {
        ledgerAccount: 'Customer Returns & Cancelled Refunds',
        classification: 'Contra-Revenue',
        treatment: 'Deduct (-) Customer Reimbursements',
        amount: -totalRefunds,
        type: 'deduct',
      },
      {
        ledgerAccount: 'Payment Gateway Processing (Razorpay ~2%)',
        classification: 'Financial Transaction Fee',
        treatment: 'Deduct (-) Merchant Fee',
        amount: -totalGatewayFees,
        type: 'deduct',
      },
      {
        ledgerAccount: 'Estimated Net Contribution Margin',
        classification: 'Reconciled Operational Margin',
        treatment: 'Gross Recognized Revenue minus Direct Outflows',
        amount: estimatedContributionMargin,
        type: 'total',
      },
    ],
    profitLossAnalytics: await getProfitLossAnalytics({
      ...filter,
      category: 'overview',
      grouping: filter.grouping || 'daily',
    }),
  };
};

/**
 * Interactive Profit & Loss Analytics for Highcharts
 * Computes time-series data points (Revenue, Expenses, Net Profit/Loss) and 4 summary KPIs
 * across Daily, Weekly, Monthly, and Yearly groupings with previous-period delta percentages.
 */
export const getProfitLossAnalytics = async (
  filter: FinanceDateFilter
): Promise<ProfitLossAnalyticsSummary> => {
  await seedMultiPeriodFinanceDataIfEmpty();
  const dateRange = resolveDateRange(filter);
  const category = (filter.category as any) || 'overview';
  const grouping = (filter.grouping as any) || 'daily';

  interface RawDailyPoint {
    date: string;
    revenue: number;
    expenses: number;
    netProfitOrLoss: number;
  }
  let rawDaily: RawDailyPoint[] = [];

  if (category === 'owned') {
    const owned = await getOwnedProductsFinance(filter);
    rawDaily = (owned.dailyBreakdown || []).map((d) => {
      const revenue = Math.max(0, d.grossSales - d.refunds);
      const expenses = d.cogs + d.gatewayFees;
      const netProfitOrLoss = revenue - expenses;
      return {
        date: d.date,
        revenue,
        expenses,
        netProfitOrLoss,
      };
    });
  } else if (category === 'marketplace') {
    const mkt = await getMarketplaceFinance(filter);
    rawDaily = (mkt.dailyBreakdown || []).map((d) => {
      // Platform commission earned is recognized operating revenue; GMV is third-party fiduciary flow
      const revenue = Math.max(0, d.commission);
      const expenses = d.gatewayFees;
      const netProfitOrLoss = revenue - expenses;
      return {
        date: d.date,
        revenue,
        expenses,
        netProfitOrLoss,
      };
    });
  } else if (category === 'subscriptions') {
    const subs = await getSubscriptionsFinance(filter);
    rawDaily = (subs.dailyCollections || []).map((d) => {
      const revenue = Math.max(0, d.amount - (d.refunds || 0));
      const expenses = (d.caregiverPayouts || 0) + (d.gatewayFees || 0);
      const netProfitOrLoss = revenue - expenses;
      return {
        date: d.date,
        revenue,
        expenses,
        netProfitOrLoss,
      };
    });
  } else {
    // Consolidated 'overview'
    const [owned, marketplace, subs] = await Promise.all([
      getOwnedProductsFinance(filter),
      getMarketplaceFinance(filter),
      getSubscriptionsFinance(filter),
    ]);

    const allDateSet = new Set<string>();
    (owned.dailyBreakdown || []).forEach((d) => allDateSet.add(d.date));
    (marketplace.dailyBreakdown || []).forEach((d) => allDateSet.add(d.date));
    (subs.dailyCollections || []).forEach((d) => allDateSet.add(d.date));

    const sortedDates = Array.from(allDateSet).sort();
    const ownedDayMap = new Map((owned.dailyBreakdown || []).map((d) => [d.date, d]));
    const mktDayMap = new Map((marketplace.dailyBreakdown || []).map((d) => [d.date, d]));
    const subDayMap = new Map((subs.dailyCollections || []).map((d) => [d.date, d]));

    rawDaily = sortedDates.map((date) => {
      const o = ownedDayMap.get(date) || { grossSales: 0, refunds: 0, cogs: 0, gatewayFees: 0 };
      const m = mktDayMap.get(date) || { gmv: 0, commission: 0, supplierPayable: 0, refunds: 0, gatewayFees: 0 };
      const s = subDayMap.get(date) || { amount: 0, caregiverPayouts: 0, refunds: 0, gatewayFees: 0 };

      const ownedNet = Math.max(0, o.grossSales - o.refunds);
      const mktNet = Math.max(0, m.commission);
      const subsNet = Math.max(0, s.amount - (s.refunds || 0));

      const dayRevenue = ownedNet + mktNet + subsNet;
      const dayExpenses = o.cogs + (s.caregiverPayouts || 0) + o.gatewayFees + m.gatewayFees + (s.gatewayFees || 0);
      const dayNetProfitOrLoss = dayRevenue - dayExpenses;

      return {
        date,
        revenue: dayRevenue,
        expenses: dayExpenses,
        netProfitOrLoss: dayNetProfitOrLoss,
      };
    });
  }

  // Sort raw daily points chronologically
  rawDaily.sort((a, b) => a.date.localeCompare(b.date));

  // Grouping: daily, weekly, monthly, yearly
  const groupedMap = new Map<string, {
    period: string;
    dateKey: string;
    timestamp: number;
    revenue: number;
    expenses: number;
    netProfitOrLoss: number;
  }>();

  for (const item of rawDaily) {
    let groupKey: string;
    let periodLabel: string;
    let timestamp: number;

    const [yStr, mStr, dStr] = item.date.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const day = parseInt(dStr, 10);

    if (grouping === 'weekly') {
      const dt = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      const dayOfWeek = dt.getUTCDay();
      const diffToMonday = dt.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), diffToMonday));
      const monStr = monday.toISOString().split('T')[0];
      groupKey = monStr;
      periodLabel = `Week of ${monStr}`;
      timestamp = monday.getTime();
    } else if (grouping === 'monthly') {
      groupKey = `${yStr}-${mStr}`;
      const dt = new Date(Date.UTC(year, month - 1, 1));
      periodLabel = dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
      timestamp = dt.getTime();
    } else if (grouping === 'yearly') {
      groupKey = `${yStr}`;
      const dt = new Date(Date.UTC(year, 0, 1));
      periodLabel = `${year}`;
      timestamp = dt.getTime();
    } else {
      // Default daily
      groupKey = item.date;
      periodLabel = item.date;
      timestamp = new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).getTime();
    }

    const existing = groupedMap.get(groupKey) || {
      period: periodLabel,
      dateKey: groupKey,
      timestamp,
      revenue: 0,
      expenses: 0,
      netProfitOrLoss: 0,
    };

    existing.revenue += item.revenue;
    existing.expenses += item.expenses;
    existing.netProfitOrLoss += item.netProfitOrLoss;
    groupedMap.set(groupKey, existing);
  }

  const sortedKeys = Array.from(groupedMap.keys()).sort();
  const series: ProfitLossDataPoint[] = [];

  sortedKeys.forEach((k, idx) => {
    const entry = groupedMap.get(k)!;
    const isProfit = entry.netProfitOrLoss >= 0;

    const pt: ProfitLossDataPoint = {
      period: entry.period,
      dateKey: entry.dateKey,
      timestamp: entry.timestamp,
      revenue: Math.round(entry.revenue),
      expenses: Math.round(entry.expenses),
      netProfitOrLoss: Math.round(entry.netProfitOrLoss),
      isProfit,
      revenueChangePct: null,
      profitChangePct: null,
      expenseChangePct: null,
    };

    if (idx > 0) {
      const prev = series[idx - 1];
      if (prev.revenue > 0) {
        pt.revenueChangePct = Number((((pt.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1));
      }
      if (prev.netProfitOrLoss !== 0) {
        pt.profitChangePct = Number((((pt.netProfitOrLoss - prev.netProfitOrLoss) / Math.abs(prev.netProfitOrLoss)) * 100).toFixed(1));
      }
      if (prev.expenses > 0) {
        pt.expenseChangePct = Number((((pt.expenses - prev.expenses) / prev.expenses) * 100).toFixed(1));
      }
    }

    series.push(pt);
  });

  const totalRevenue = series.reduce((sum, p) => sum + p.revenue, 0);
  const totalExpenses = series.reduce((sum, p) => sum + p.expenses, 0);
  const netOperatingResult = totalRevenue - totalExpenses;
  const isOverallProfit = netOperatingResult >= 0;
  const netProfit = isOverallProfit ? netOperatingResult : 0;
  const netLoss = !isOverallProfit ? Math.abs(netOperatingResult) : 0;
  const marginPct = totalRevenue > 0 ? Number(((netOperatingResult / totalRevenue) * 100).toFixed(1)) : 0;

  return {
    periodLabel: dateRange.label,
    category,
    grouping,
    kpis: {
      totalRevenue,
      totalExpenses,
      netProfit,
      netLoss,
      netOperatingResult,
      marginPct,
      isOverallProfit,
      costDataStatus: 'complete',
      hasSufficientCostData: series.length > 0,
    },
    series,
  };
};

