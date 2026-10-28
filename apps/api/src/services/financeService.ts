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
  preset?: 'all' | 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'previous_month' | 'custom';
  startDate?: string;
  endDate?: string;
  search?: string;
  status?: string;
  supplierId?: string;
  planType?: string;
  page?: number;
  limit?: number;
}

export interface ResolvedDateRange {
  start: Date | null;
  end: Date | null;
  label: string;
}

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
        label: `Today (${now.toISOString().split('T')[0]})`,
      };
    }
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return {
        start: startOfDay(y),
        end: endOfDay(y),
        label: `Yesterday (${y.toISOString().split('T')[0]})`,
      };
    }
    case 'last_7_days': {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 6);
      return {
        start: startOfDay(past7),
        end: endOfDay(now),
        label: `Last 7 Days (${past7.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]})`,
      };
    }
    case 'this_month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: startOfDay(monthStart),
        end: endOfDay(now),
        label: `This Month (${monthStart.toLocaleString('en-IN', { month: 'short', year: 'numeric' })})`,
      };
    }
    case 'previous_month': {
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: startOfDay(prevMonthStart),
        end: endOfDay(prevMonthEnd),
        label: `Previous Month (${prevMonthStart.toLocaleString('en-IN', { month: 'short', year: 'numeric' })})`,
      };
    }
    case 'custom': {
      if (filter.startDate && filter.endDate) {
        const s = new Date(filter.startDate);
        const e = new Date(filter.endDate);
        return {
          start: startOfDay(s),
          end: endOfDay(e),
          label: `Custom (${s.toISOString().split('T')[0]} to ${e.toISOString().split('T')[0]})`,
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

  for (const ord of allMatchingOrders) {
    const isPaid = ord.paymentStatus === 'paid' || ord.paymentStatus === 'cod';
    const isRefunded = ord.paymentStatus === 'refunded' || ord.cancellation?.refundStatus === 'processed';

    // Status counts
    if (ord.paymentStatus in paymentStatusCounts) {
      paymentStatusCounts[ord.paymentStatus as keyof typeof paymentStatusCounts]++;
    }
    orderStatusCounts[ord.orderStatus] = (orderStatusCounts[ord.orderStatus] || 0) + 1;

    // Line item analysis for owned goods
    for (const item of ord.items) {
      if (item.sourcingType === 'own_stock' || !item.supplierId) {
        if (isPaid && ord.orderStatus !== 'cancelled') {
          grossSales += item.unitPrice * item.quantity;
          totalUnitsSold += item.quantity;
          totalDiscounts += item.discountAmount || 0;
          totalProcurementCost += (item.procurementCost || 0) * item.quantity;
        }
      }
    }

    if (isPaid && ord.orderStatus !== 'cancelled') {
      totalTaxGst += ord.pricing?.taxGst || 0;
      totalDeliveryFees += ord.pricing?.deliveryFee || 0;
      totalInstallationCharges += ord.pricing?.installationCharge || 0;
      if (ord.paymentMethod === 'online') {
        totalGatewayFees += ord.pricing?.gatewayFee || Math.round((ord.pricing?.totalAmount || 0) * 0.02);
      }
    }

    if (isRefunded) {
      totalRefunds += ord.pricing?.refundAmount || ord.pricing?.totalAmount || 0;
    }
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

  for (const ord of matchingOrders) {
    const isPaid = ord.paymentStatus === 'paid' || ord.paymentStatus === 'cod';
    const isRefunded = ord.paymentStatus === 'refunded' || ord.cancellation?.refundStatus === 'processed';

    for (const item of ord.items) {
      const isSupplierItem = item.sourcingType === 'supplier_direct' || Boolean(item.supplierId);
      if (!isSupplierItem) continue;

      const supId = item.supplierId?.toString() || suppliers[0]?._id?.toString() || 'unknown';
      const supRecord = supplierMap.get(supId);
      const commissionRate = supRecord?.commissionRatePercentage || 10;
      const itemGMV = item.unitPrice * item.quantity;
      const commEarned = Math.round(itemGMV * (commissionRate / 100));
      const payable = Math.max(0, itemGMV - commEarned);

      if (isPaid && ord.orderStatus !== 'cancelled') {
        totalMarketplaceGMV += itemGMV;
        totalUnitsSold += item.quantity;
        totalCommissionEarned += commEarned;
        totalTaxGst += Math.round(itemGMV * 0.12);
        if (ord.paymentMethod === 'online') {
          totalGatewayFees += Math.round(itemGMV * 0.02);
        }

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
  const dailyCollectionsMap = new Map<string, { date: string; amount: number; subscriptionCount: number }>();

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

      totalGatewayFees += Math.round(price * 0.02);

      // Daily trend aggregation
      const dayKey = new Date(sub.createdAt).toISOString().split('T')[0];
      const existingDay = dailyCollectionsMap.get(dayKey) || { date: dayKey, amount: 0, subscriptionCount: 0 };
      existingDay.amount += price;
      existingDay.subscriptionCount++;
      dailyCollectionsMap.set(dayKey, existingDay);
    }

    if (sub.status === 'cancelled' || sub.pricing?.paymentStatus === 'refunded') {
      refundsProcessed += sub.pricing?.customerPrice || 0;
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

export interface CombinedFinanceSummary {
  periodLabel: string;
  executiveSummary: {
    grossMerchandiseValue: number;
    recognizedNetRevenue: number;
    estimatedContributionMargin: number;
    contributionMarginPct: number;
    customerCollections: number;
    totalCustomerCollections: number;
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

  return {
    periodLabel: owned.periodLabel,
    executiveSummary: {
      grossMerchandiseValue: gmv,
      recognizedNetRevenue: recognizedRevenue,
      estimatedContributionMargin,
      contributionMarginPct,
      customerCollections: gmv,
      totalCustomerCollections: gmv,
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
  };
};

