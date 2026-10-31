'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  HeartPulse,
  Truck,
  RefreshCw,
  AlertCircle,
  CreditCard,
  Receipt,
  RotateCcw,
  Percent,
  CheckCircle2,
  Info,
  Download,
  FileText,
  FileSpreadsheet,
  Search,
  Calendar,
  Filter,
  Eye,
  X,
  Building2,
  Clock,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  HelpCircle,
  Check,
  Activity,
  Wallet,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { ProfitLossAnalyticsGraph } from './ProfitLossAnalyticsGraph';

type FinanceTab = 'overview' | 'owned' | 'marketplace' | 'subscriptions';
type DatePreset = 'all' | 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'previous_month' | 'custom';

const RECORDS_PER_PAGE = 10;

export function FinancialSummaryView() {
  const [activeSubTab, setActiveSubTab] = useState<FinanceTab>('overview');

  // Shared Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Independent Pagination States (10 records per page)
  const [ownedPage, setOwnedPage] = useState(1);
  const [marketplacePage, setMarketplacePage] = useState(1);
  const [subscriptionsPage, setSubscriptionsPage] = useState(1);

  // Overview Unified Transactions & Secondary Sections
  const [overviewTxPage, setOverviewTxPage] = useState(1);
  const [overviewCategoryFilter, setOverviewCategoryFilter] = useState('all');
  const [overviewStatusFilter, setOverviewStatusFilter] = useState('all');
  const [overviewTxSearch, setOverviewTxSearch] = useState('');
  const [showSecondaryTaxRecords, setShowSecondaryTaxRecords] = useState(false);

  // Tab-specific data
  const [overviewData, setOverviewData] = useState<any>(null);
  const [ownedData, setOwnedData] = useState<any>(null);
  const [marketplaceData, setMarketplaceData] = useState<any>(null);
  const [subscriptionsData, setSubscriptionsData] = useState<any>(null);

  // Loading, Errors & Notifications
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Transaction Deletion / Archive Confirmation Modal
  const [txToDelete, setTxToDelete] = useState<any | null>(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);

  // Reset pagination to page 1 whenever any filter or search query changes
  useEffect(() => {
    setOwnedPage(1);
    setMarketplacePage(1);
    setSubscriptionsPage(1);
    setOverviewTxPage(1);
  }, [datePreset, customStart, customEnd, searchQuery, statusFilter]);

  const getFilterParams = (pageOverride?: number) => {
    const params: Record<string, string> = {
      preset: datePreset,
      limit: String(RECORDS_PER_PAGE),
    };
    if (pageOverride) {
      params.page = String(pageOverride);
    }
    if (datePreset === 'custom' && customStart && customEnd) {
      params.startDate = customStart;
      params.endDate = customEnd;
    }
    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    return params;
  };

  const fetchCurrentTabData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeSubTab === 'overview') {
        const res = await adminApi.getFinancialSummary(getFilterParams());
        setOverviewData(res);
      } else if (activeSubTab === 'owned') {
        const res = await adminApi.getOwnedProductsFinance(getFilterParams(ownedPage));
        setOwnedData(res);
      } else if (activeSubTab === 'marketplace') {
        const res = await adminApi.getMarketplaceFinance(getFilterParams(marketplacePage));
        setMarketplaceData(res);
      } else if (activeSubTab === 'subscriptions') {
        const res = await adminApi.getSubscriptionsFinance(getFilterParams(subscriptionsPage));
        setSubscriptionsData(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch financial data from server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentTabData();
  }, [activeSubTab, datePreset, statusFilter, ownedPage, marketplacePage, subscriptionsPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOwnedPage(1);
    setMarketplacePage(1);
    setSubscriptionsPage(1);
    fetchCurrentTabData();
  };

  const handleDownload = async (format: 'pdf' | 'excel' | 'csv') => {
    const sectionMap: Record<FinanceTab, 'owned' | 'marketplace' | 'subscriptions' | 'combined'> = {
      overview: 'combined',
      owned: 'owned',
      marketplace: 'marketplace',
      subscriptions: 'subscriptions',
    };
    const section = sectionMap[activeSubTab];
    setDownloadingFormat(format);
    try {
      await adminApi.downloadFinanceReport(format, section, getFilterParams());
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  // Transaction Delete / Archive Handler
  const handleDeleteTransaction = async () => {
    if (!txToDelete) return;
    try {
      setIsDeletingTx(true);
      const res = await adminApi.deleteOrArchiveFinanceTransaction(txToDelete.orderId || txToDelete.orderNumber);
      setSuccessMsg(res.message || 'Transaction processed successfully.');
      setTxToDelete(null);
      fetchCurrentTabData();
    } catch (err: any) {
      setError(err.message || 'Failed to process transaction deletion.');
    } finally {
      setIsDeletingTx(false);
    }
  };

  // Safely slice records if backend returned full set
  const paginatedOwnedTransactions = useMemo(() => {
    if (!ownedData?.transactions) return [];
    if (ownedData.pagination && ownedData.transactions.length <= RECORDS_PER_PAGE) {
      return ownedData.transactions;
    }
    const startIdx = (ownedPage - 1) * RECORDS_PER_PAGE;
    return ownedData.transactions.slice(startIdx, startIdx + RECORDS_PER_PAGE);
  }, [ownedData, ownedPage]);

  const paginatedMarketplaceTransactions = useMemo(() => {
    if (!marketplaceData?.transactions) return [];
    if (marketplaceData.pagination && marketplaceData.transactions.length <= RECORDS_PER_PAGE) {
      return marketplaceData.transactions;
    }
    const startIdx = (marketplacePage - 1) * RECORDS_PER_PAGE;
    return marketplaceData.transactions.slice(startIdx, startIdx + RECORDS_PER_PAGE);
  }, [marketplaceData, marketplacePage]);

  // Overview Tab Unified Transactions filtering & pagination
  const filteredOverviewTransactions = useMemo(() => {
    const list: any[] = overviewData?.unifiedTransactions || [];
    return list.filter((tx) => {
      // Category filter
      if (overviewCategoryFilter !== 'all') {
        if (overviewCategoryFilter === 'owned' && tx.category !== 'Owned Product') return false;
        if (overviewCategoryFilter === 'marketplace' && tx.category !== 'Marketplace Partner') return false;
        if (overviewCategoryFilter === 'subscription' && !tx.category.includes('Subscription')) return false;
        if (overviewCategoryFilter === 'package' && !tx.category.includes('Package')) return false;
      }
      // Status filter
      if (overviewStatusFilter !== 'all') {
        if (overviewStatusFilter === 'successful' && tx.paymentStatus !== 'Successful') return false;
        if (overviewStatusFilter === 'pending' && tx.paymentStatus !== 'Pending') return false;
        if (overviewStatusFilter === 'failed' && tx.paymentStatus !== 'Failed') return false;
        if (overviewStatusFilter === 'refunded' && tx.paymentStatus !== 'Refunded') return false;
      }
      // Search query
      if (overviewTxSearch.trim()) {
        const q = overviewTxSearch.toLowerCase();
        const matchesRef = (tx.reference || '').toLowerCase().includes(q);
        const matchesPatient = (tx.patientName || '').toLowerCase().includes(q);
        const matchesSummary = (tx.itemsSummary || '').toLowerCase().includes(q);
        const matchesReason = (tx.cancellationReason || '').toLowerCase().includes(q);
        if (!matchesRef && !matchesPatient && !matchesSummary && !matchesReason) return false;
      }
      return true;
    });
  }, [overviewData, overviewCategoryFilter, overviewStatusFilter, overviewTxSearch]);

  const totalOverviewTxCount = filteredOverviewTransactions.length;
  const totalOverviewTxPages = Math.ceil(totalOverviewTxCount / RECORDS_PER_PAGE) || 1;
  const paginatedOverviewTransactions = useMemo(() => {
    const startIdx = (overviewTxPage - 1) * RECORDS_PER_PAGE;
    return filteredOverviewTransactions.slice(startIdx, startIdx + RECORDS_PER_PAGE);
  }, [filteredOverviewTransactions, overviewTxPage]);

  const totalOwnedCount = ownedData?.pagination?.total ?? ownedData?.transactions?.length ?? 0;
  const totalOwnedPages = Math.ceil(totalOwnedCount / RECORDS_PER_PAGE) || 1;

  const totalMarketplaceCount = marketplaceData?.pagination?.total ?? marketplaceData?.transactions?.length ?? 0;
  const totalMarketplacePages = Math.ceil(totalMarketplaceCount / RECORDS_PER_PAGE) || 1;

  // Overview Executive & Simplified Calculations
  const exec = overviewData?.executiveSummary || {};
  const primaryKpis = overviewData?.primaryKpis || {
    totalMoneyReceived: exec.totalCustomerCollections ?? exec.grossMerchandiseValue ?? 0,
    productSalesRevenue: overviewData?.sectionSummaries?.ownedProducts?.grossSales ?? 0,
    marketplaceSales: {
      gmv: overviewData?.sectionSummaries?.marketplace?.gmv ?? 0,
      vivoquestRevenue: overviewData?.sectionSummaries?.marketplace?.earnedCommission ?? 0,
      supplierPayable: exec.pendingSupplierPayments ?? 0,
    },
    subscriptionRevenue: overviewData?.sectionSummaries?.subscriptions?.collections ?? 0,
    activeSubscriptions: overviewData?.sectionSummaries?.subscriptions?.activeCount ?? 0,
    refundsAndCancellations: {
      completedRefundsAmount: exec.completedRefunds ?? 0,
      refundedOrdersCount: 0,
      cancelledOrdersCount: 0,
      cancelledSubscriptionsCount: 0,
    },
    netOperatingResult: {
      amount: exec.netProfitOrLoss ?? exec.estimatedContributionMargin ?? 0,
      isProfit: (exec.netProfitOrLoss ?? exec.estimatedContributionMargin ?? 0) >= 0,
      marginPct: exec.contributionMarginPct ?? 0,
      costDataStatus: exec.costDataStatus ?? 'complete',
    },
  };
  const pnl = overviewData?.profitAndLoss || {};
  const isProfit = (primaryKpis.netOperatingResult?.amount ?? exec.netProfitOrLoss ?? 0) >= 0;
  const netProfitOrLossValue = Math.abs(primaryKpis.netOperatingResult?.amount ?? exec.netProfitOrLoss ?? 0);

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Banner & Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Finance &amp; Invoices
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Server-Authoritative
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                Razorpay Sandbox
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Plain-language financial tracking: collections, direct expenses, supplier liabilities, and net profit.
            </p>
          </div>

          {/* Export Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleDownload('pdf')}
              disabled={Boolean(downloadingFormat)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              title="Download Audit-Ready A4 PDF Report"
            >
              <FileText size={14} />
              <span>{downloadingFormat === 'pdf' ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={() => handleDownload('excel')}
              disabled={Boolean(downloadingFormat)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              title="Download Structured Excel Workbook"
            >
              <FileSpreadsheet size={14} />
              <span>{downloadingFormat === 'excel' ? 'Exporting...' : 'Export Excel'}</span>
            </button>

            <button
              onClick={() => handleDownload('csv')}
              disabled={Boolean(downloadingFormat)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              title="Download CSV"
            >
              <Download size={14} />
              <span>{downloadingFormat === 'csv' ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            <button
              onClick={fetchCurrentTabData}
              disabled={isLoading}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              title="Refresh Real-Time Data"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* 4 Financial Sub-Tabs */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pt-2">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'overview'
                ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} />
            <span>Overall Financial Summary</span>
          </button>

          <button
            onClick={() => setActiveSubTab('owned')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'owned'
                ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag size={14} />
            <span>VivoQuest-Owned Products</span>
          </button>

          <button
            onClick={() => setActiveSubTab('marketplace')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'marketplace'
                ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={14} />
            <span>Third-Party Products &amp; Suppliers</span>
          </button>

          <button
            onClick={() => setActiveSubTab('subscriptions')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'subscriptions'
                ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartPulse size={14} />
            <span>Caregiver Subscriptions &amp; Plans</span>
          </button>
        </div>

        {/* Global Filter Bar: Date Presets & Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'last_7_days', label: 'Last 7 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'previous_month', label: 'Previous Month' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id as DatePreset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  datePreset === p.id
                    ? 'bg-navy text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search & Custom Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            {datePreset === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl text-xs">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs focus:outline-none"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs focus:outline-none"
                />
                <button
                  onClick={fetchCurrentTabData}
                  className="px-2 py-0.5 bg-teal-600 text-white rounded text-[10px] font-bold"
                >
                  Apply
                </button>
              </div>
            )}

            {/* Status Filter */}
            {activeSubTab !== 'overview' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid / Confirmed</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded / Cancelled</option>
              </select>
            )}

            {/* Search Box */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search size={14} className="absolute left-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Order, SKU, Patient..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 w-48 sm:w-56"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-slate-500">
          <RefreshCw className="animate-spin text-teal-600 mb-3" size={32} />
          <p className="text-sm font-semibold text-slate-700">Loading Authoritative Financial Data...</p>
          <p className="text-xs text-slate-400 mt-1">Aggregating customer collections, supplier liabilities, and net profit.</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <p>{error}</p>
          </div>
          <button
            onClick={fetchCurrentTabData}
            className="px-3 py-1.5 bg-white text-rose-700 font-semibold rounded-lg shadow-sm border border-rose-200 hover:bg-rose-100 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 1: SIMPLIFIED OVERALL FINANCIAL SUMMARY (FOR NON-TECHNICAL ADMINS) */}
      {/* ===================================================================== */}
      {!isLoading && !error && activeSubTab === 'overview' && overviewData && (
        <div className="space-y-6 animate-in fade-in">
          {/* Plain-Language Profit / Loss Health Banner */}
          <div
            className={`p-6 rounded-3xl border shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${
              isProfit
                ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-emerald-200'
                : 'bg-gradient-to-br from-rose-50 via-red-50/40 to-white border-rose-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  isProfit ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}
              >
                {isProfit ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                      isProfit ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {isProfit ? '▲ Net Operating Profit' : '▼ Net Operating Loss'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-700 border border-slate-200">
                    {primaryKpis.netOperatingResult?.costDataStatus === 'complete' ? 'Reconciled Data' : 'Estimated Data'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Period: {overviewData.periodLabel}
                  </span>
                </div>
                <h3 className={`text-3xl font-black mt-2 tracking-tight ${isProfit ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {isProfit ? '+' : '-'}₹{netProfitOrLossValue.toLocaleString('en-IN')}
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  <strong>How this was calculated:</strong>{' '}
                  {pnl.explanation || exec.calculationExplanation ||
                    'Customer Collections minus Direct Equipment Procurement Costs, Caregiver Bedside Payouts, Payment Gateway Fees, and Customer Refunds.'}
                </p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 text-xs space-y-1.5 shrink-0 w-full lg:w-80 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Core Principle</div>
              <div className="font-semibold text-slate-800">
                Recognized Revenue − Direct Costs = Net Operating Margin
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Third-party supplier GMV and statutory GST are held in trust and never counted as platform profit.
              </p>
            </div>
          </div>

          {/* 7 PRIMARY FINANCIAL KPI CARDS (Responsive: ~4 cards per row) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Money Received */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-teal-300 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">1. Total Money Received</span>
                  <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
                    <Wallet size={16} />
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">
                  ₹{(primaryKpis.totalMoneyReceived || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                <span>Successful, verified customer collections for selected period</span>
              </div>
            </div>

            {/* 2. Product Sales Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">2. Product Sales Revenue</span>
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                    <ShoppingBag size={16} />
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">
                  ₹{(primaryKpis.productSalesRevenue || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                <span>VivoQuest-owned medical equipment retail sales</span>
              </div>
            </div>

            {/* 3. Marketplace Sales */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-300 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">3. Marketplace Sales</span>
                  <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                    <Building2 size={16} />
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">
                  ₹{(primaryKpis.marketplaceSales?.gmv || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Third-party GMV</span>
                <span className="font-bold text-amber-800">Own Share: ₹{(primaryKpis.marketplaceSales?.vivoquestRevenue || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* 4. Subscription Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">4. Subscription Revenue</span>
                  <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                    <HeartPulse size={16} />
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">
                  ₹{(primaryKpis.subscriptionRevenue || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                <span>Caregiver subscriptions and visit package payments</span>
              </div>
            </div>

            {/* 5. Active Subscriptions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">5. Active Subscriptions</span>
                  <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
                    <Activity size={16} />
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">
                  {primaryKpis.activeSubscriptions || 0}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                <span>Active caregiver plans as of selected date (not payment count)</span>
              </div>
            </div>

            {/* 6. Refunds & Cancellations */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-rose-300 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">6. Refunds &amp; Cancellations</span>
                  <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
                    <RotateCcw size={16} />
                  </span>
                </div>
                <p className="text-2xl font-black text-rose-700 mt-2">
                  ₹{(primaryKpis.refundsAndCancellations?.completedRefundsAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                <span>{primaryKpis.refundsAndCancellations?.refundedOrdersCount || 0} refunded orders • {primaryKpis.refundsAndCancellations?.cancelledSubscriptionsCount || 0} cancelled plans</span>
              </div>
            </div>

            {/* 7. Net Operating Result (Spans 2 columns on desktop) */}
            <div
              className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between sm:col-span-2 ${
                isProfit
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-rose-50/50 border-rose-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    7. Net Operating Result
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isProfit ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {isProfit ? 'Estimated Profit' : 'Operating Loss'} ({primaryKpis.netOperatingResult?.costDataStatus === 'complete' ? 'Reconciled' : 'Estimated'})
                  </span>
                </div>
                <div className="flex items-baseline gap-3 mt-2">
                  <p className={`text-2xl font-black ${isProfit ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {isProfit ? '+' : '-'}₹{netProfitOrLossValue.toLocaleString('en-IN')}
                  </p>
                  <span className="text-xs font-bold text-slate-500">
                    Margin: {primaryKpis.netOperatingResult?.marginPct || 0}%
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-600">
                <span>Recognized revenue minus wholesale equipment procurement, caregiver shift payouts, and payment processing fees</span>
              </div>
            </div>
          </div>

          {/* UNDERSTANDABLE PROFIT AND LOSS BREAKDOWN */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Profit &amp; Loss Financial Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clear step-by-step reconciliation from customer collections to net operating profit.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700">
                Period: {overviewData.periodLabel}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Row 1: Money Received */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>Money received from successful payments</span>
                </div>
                <span className="font-extrabold text-emerald-800 text-sm">
                  +₹{(pnl.moneyReceived || primaryKpis.totalMoneyReceived || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Row 2: Completed Refunds */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-4 text-center font-bold text-rose-500">−</span>
                  <span>Less: Completed customer refunds</span>
                </div>
                <span className="font-bold text-rose-700 text-sm">
                  −₹{(pnl.completedRefunds || primaryKpis.refundsAndCancellations?.completedRefundsAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Row 3: Product Procurement Costs */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-4 text-center font-bold text-amber-600">−</span>
                  <span>Less: Direct product procurement costs (Owned Equipment)</span>
                </div>
                <span className="font-bold text-amber-800 text-sm">
                  −₹{(pnl.directCOGS || exec.directCOGS || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Row 4: Caregiver Payouts */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-4 text-center font-bold text-amber-600">−</span>
                  <span>Less: Recorded caregiver &amp; clinical service payouts</span>
                </div>
                <span className="font-bold text-amber-800 text-sm">
                  −₹{(pnl.caregiverPayouts || exec.laborLiabilities || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Row 5: Payment Gateway Fees */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-4 text-center font-bold text-slate-500">−</span>
                  <span>Less: Recorded payment gateway fees (Razorpay ~2%)</span>
                </div>
                <span className="font-bold text-slate-700 text-sm">
                  −₹{(pnl.paymentGatewayFees || exec.paymentGatewayFees || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Summary / Result Row */}
              <div
                className={`flex items-center justify-between p-4 rounded-2xl border-2 font-bold ${
                  isProfit
                    ? 'bg-emerald-100/60 border-emerald-300 text-emerald-950'
                    : 'bg-rose-100/60 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-black">=</span>
                  <div>
                    <span className="text-sm font-black">Estimated Operating Result</span>
                    <span className="ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                      {primaryKpis.netOperatingResult?.costDataStatus === 'complete' ? 'Reconciled Operational Margin' : 'Estimated Result'}
                    </span>
                  </div>
                </div>
                <span className="text-lg font-black tracking-tight">
                  {isProfit ? '+' : '-'}₹{netProfitOrLossValue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Plain-Language Admin Explanation */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info size={14} className="text-teal-600" />
                <span>How This Breakdown Works for Administrators</span>
              </div>
              <p className="leading-relaxed">
                {pnl.explanation || exec.calculationExplanation}
              </p>
              <p className="text-[11px] text-slate-500 italic mt-1">
                Note: Third-party marketplace collections (₹{(primaryKpis.marketplaceSales?.gmv || 0).toLocaleString('en-IN')}) are collected on behalf of external suppliers and are not treated as VivoQuest revenue. GST amounts are held in statutory escrow and are excluded from operating profit.
              </p>
            </div>
          </div>

          {/* PROFIT & LOSS ANALYTICS GRAPH (HIGHCHARTS) */}
          <ProfitLossAnalyticsGraph
            initialData={overviewData?.profitLossAnalytics}
            activeTab={activeSubTab}
            onRefreshParent={fetchCurrentTabData}
          />

          {/* UNIFIED TRANSACTIONS AND CANCELLATION HISTORY */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Recent Financial Transactions &amp; Cancellation History
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unified audit log with plain-language status labels and cancellation preservation.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={overviewCategoryFilter}
                  onChange={(e) => {
                    setOverviewCategoryFilter(e.target.value);
                    setOverviewTxPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                >
                  <option value="all">All Categories</option>
                  <option value="owned">Owned Equipment</option>
                  <option value="marketplace">Marketplace Partners</option>
                  <option value="subscription">Subscriptions</option>
                  <option value="package">Visit Packages</option>
                </select>

                <select
                  value={overviewStatusFilter}
                  onChange={(e) => {
                    setOverviewStatusFilter(e.target.value);
                    setOverviewTxPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="successful">Successful</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded / Cancelled</option>
                </select>

                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={overviewTxSearch}
                    onChange={(e) => {
                      setOverviewTxSearch(e.target.value);
                      setOverviewTxPage(1);
                    }}
                    placeholder="Search Reference, Patient..."
                    className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 w-44"
                  />
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            {paginatedOverviewTransactions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-700">No matching transactions found</p>
                <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting "All Categories".</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Patient / Recipient</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                      <th className="py-3 px-4 text-center">Payment Status</th>
                      <th className="py-3 px-4 text-center">Refund Status</th>
                      <th className="py-3 px-4 text-center">Plan / Order Status</th>
                      <th className="py-3 px-4">Cancellation Reason</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedOverviewTransactions.map((tx: any, idx: number) => {
                      const isRefunded = tx.paymentStatus === 'Refunded' || tx.refundStatus === 'Refunded';
                      const isSuccess = tx.paymentStatus === 'Successful';
                      const isPending = tx.paymentStatus === 'Pending';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {tx.reference}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              {tx.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {tx.patientName || 'Healthcare Recipient'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            ₹{(tx.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isSuccess
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : isRefunded
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-slate-100 text-slate-800 border border-slate-200'
                              }`}
                            >
                              {tx.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {tx.refundStatus === 'Refunded' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Refunded (₹{(tx.refundAmount || tx.amount || 0).toLocaleString('en-IN')})
                              </span>
                            ) : tx.refundStatus === 'Refund Pending' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Refund Pending
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                              {tx.orderOrSubscriptionStatus || 'Active'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={tx.cancellationReason || ''}>
                            {tx.cancellationReason ? (
                              <span className="text-rose-700 font-medium">
                                {tx.cancellationReason} {tx.cancellationDate ? `(${new Date(tx.cancellationDate).toLocaleDateString('en-IN')})` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedTx(tx)}
                              className="px-2 py-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalOverviewTxPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Showing {(overviewTxPage - 1) * RECORDS_PER_PAGE + 1} to {Math.min(overviewTxPage * RECORDS_PER_PAGE, totalOverviewTxCount)} of {totalOverviewTxCount} records
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setOverviewTxPage((p) => Math.max(1, p - 1))}
                    disabled={overviewTxPage === 1}
                    className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-lg text-slate-700">
                    {overviewTxPage} / {totalOverviewTxPages}
                  </span>
                  <button
                    onClick={() => setOverviewTxPage((p) => Math.min(totalOverviewTxPages, p + 1))}
                    disabled={overviewTxPage === totalOverviewTxPages}
                    className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECONDARY ACCOUNTING & REGULATORY TAX RECORDS (COLLAPSIBLE AUDIT SECTION) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowSecondaryTaxRecords(!showSecondaryTaxRecords)}
              className="w-full p-5 text-left flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                  <Receipt size={18} />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Secondary Accounting &amp; Regulatory Tax Records (GST Audit)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Preserved statutory escrow, 12% &amp; 18% GST collections, and trade settlement liabilities.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>{showSecondaryTaxRecords ? 'Hide Accounting Details' : 'Show Accounting Details'}</span>
                {showSecondaryTaxRecords ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {showSecondaryTaxRecords && (
              <div className="p-6 border-t border-slate-100 space-y-4 bg-slate-50/50 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total GST Held in Trust</p>
                    <p className="text-xl font-black text-purple-900 mt-1">
                      ₹{(exec.taxesCollected || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Statutory escrow (excluded from profit)</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Payment Gateway Fees</p>
                    <p className="text-xl font-black text-slate-900 mt-1">
                      ₹{(exec.paymentGatewayFees || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Razorpay ~2% processing fee</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Supplier Payables (Pending)</p>
                    <p className="text-xl font-black text-amber-800 mt-1">
                      ₹{(exec.supplierLiabilitiesPending || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Marketplace trade liabilities due</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Supplier Payables (Settled)</p>
                    <p className="text-xl font-black text-emerald-800 mt-1">
                      ₹{(exec.supplierLiabilitiesSettled || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Disbursed to certified vendors</p>
                  </div>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-start gap-2">
                  <ShieldCheck size={16} className="text-purple-700 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Regulatory Compliance Note:</strong> Statutory taxes and fiduciary collections are recorded in real-time according to Indian GST DME (12%) and clinical healthcare guidelines (18%). These records remain fully accessible for statutory filings and audit exports.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2A: VIVOQUEST-OWNED PRODUCTS (WITH 10-PER-PAGE PAGINATION) */}
      {/* ===================================================================== */}
      {!isLoading && !error && activeSubTab === 'owned' && ownedData && (
        <div className="space-y-6 animate-in fade-in">
          {/* Explanation Callout */}
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-teal-900 flex items-start gap-3 shadow-sm">
            <Info size={18} className="text-teal-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">VivoQuest-Owned Product Sourcing &amp; Revenue</p>
              <p className="mt-0.5 leading-relaxed text-teal-800">
                Shows sales, procurement cost, 12% GST, and contribution margin for products owned and stored at the VivoQuest central depot.
                Formula: <span className="font-semibold underline">Gross Sales − Discounts − Refunds − Procurement COGS − Gateway Fees = Contribution Margin</span>.
              </p>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Gross Sales</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">₹{ownedData.grossSales.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{ownedData.totalOrders} Orders • {ownedData.totalUnitsSold} Units</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Net Sales</p>
              <p className="text-xl font-extrabold text-teal-700 mt-1">₹{ownedData.netRevenue.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Discounts: ₹{ownedData.totalDiscounts.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Procurement Cost</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">₹{ownedData.totalProcurementCost.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Direct Wholesale COGS</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Tax GST (12%)</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">₹{ownedData.totalTaxGst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Statutory Trust</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Completed Refunds</p>
              <p className="text-xl font-extrabold text-rose-600 mt-1">₹{ownedData.totalRefunds.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Returns &amp; Cancellations</p>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-emerald-800">Estimated Contribution</p>
              <p className="text-xl font-extrabold text-emerald-800 mt-1">₹{ownedData.estimatedContributionMargin.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-emerald-700 mt-0.5 font-bold">Margin: {ownedData.contributionMarginPct}%</p>
            </div>
          </div>

          {/* Transactions Table with Pagination */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Owned Equipment Transactions ({totalOwnedCount})
                </h3>
                <p className="text-xs text-slate-500">
                  Showing 10 records per page • Period: {ownedData.periodLabel}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Equipment &amp; SKU</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Procurement</th>
                    <th className="py-3 px-4 text-right">Tax (GST)</th>
                    <th className="py-3 px-4 text-right">Final Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Payment</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedOwnedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        No transactions found matching your selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedOwnedTransactions.map((tx: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">{tx.date.split('T')[0]}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{tx.orderNumber}</td>
                        <td className="py-3 px-4 font-medium">{tx.patientName}</td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={tx.itemsSummary}>
                          {tx.itemsSummary}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">{tx.quantity}</td>
                        <td className="py-3 px-4 text-right text-slate-500">₹{tx.procurementCost.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right text-slate-500">₹{tx.taxGst.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">₹{tx.totalAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tx.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.paymentStatus === 'refunded'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tx.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
                            {tx.orderStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedTx({ ...tx, type: 'owned' })}
                              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => setTxToDelete(tx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete or Archive Order"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (10 records per page) */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-500">
                {totalOwnedCount === 0
                  ? 'Showing 0–0 of 0 records'
                  : `Showing ${(ownedPage - 1) * RECORDS_PER_PAGE + 1}–${Math.min(ownedPage * RECORDS_PER_PAGE, totalOwnedCount)} of ${totalOwnedCount} records`}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={ownedPage <= 1}
                  onClick={() => setOwnedPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold disabled:opacity-40 transition flex items-center gap-1"
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>

                {Array.from({ length: totalOwnedPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setOwnedPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                      ownedPage === pg
                        ? 'bg-teal-700 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  disabled={ownedPage >= totalOwnedPages}
                  onClick={() => setOwnedPage((p) => Math.min(totalOwnedPages, p + 1))}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold disabled:opacity-40 transition flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2B: THIRD-PARTY PRODUCTS & SUPPLIERS (WITH 10-PER-PAGE) */}
      {/* ===================================================================== */}
      {!isLoading && !error && activeSubTab === 'marketplace' && marketplaceData && (
        <div className="space-y-6 animate-in fade-in">
          {/* Explanation Callout */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-sm">
            <Info size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Third-Party Marketplace Fiduciary Rules</p>
              <p className="mt-0.5 leading-relaxed text-amber-800">
                Customer payments for supplier products are pass-through fiduciary collections and are <strong>never</strong> counted as VivoQuest operating revenue.
                Only earned platform commissions (e.g. 10%) are recognized as company revenue.
              </p>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Marketplace GMV</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">₹{marketplaceData.totalMarketplaceGMV.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{marketplaceData.totalUnitsSold} Units Sold</p>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-emerald-800">Earned Commission</p>
              <p className="text-xl font-extrabold text-emerald-800 mt-1">₹{marketplaceData.earnedPlatformCommission.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-emerald-700 mt-0.5 font-bold">Avg Rate: {marketplaceData.averageCommissionRatePct}%</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Supplier Payables (Total)</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">₹{marketplaceData.supplierPayablesTotal.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Supplier Gross Dues</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Settled Payouts</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">₹{marketplaceData.supplierPayablesSettled.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Disbursed to Suppliers</p>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-amber-800">Pending Settlement</p>
              <p className="text-xl font-extrabold text-amber-800 mt-1">₹{marketplaceData.supplierPayablesPending.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-amber-700 mt-0.5">Net 15/30 terms liability</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Net Commission Margin</p>
              <p className="text-xl font-extrabold text-teal-700 mt-1">₹{marketplaceData.marketplaceNetRevenue.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Commission minus fees</p>
            </div>
          </div>

          {/* Supplier Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Certified Supplier Settlement Breakdown</h3>
              <p className="text-xs text-slate-500">Separated customer collections, platform commission, and net payables.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Supplier Partner</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4 text-center">Comm. Rate</th>
                    <th className="py-3 px-4 text-center">Units Sold</th>
                    <th className="py-3 px-4 text-right">Customer GMV</th>
                    <th className="py-3 px-4 text-right">Platform Commission</th>
                    <th className="py-3 px-4 text-right">Supplier Due</th>
                    <th className="py-3 px-4 text-right">Settled Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {marketplaceData.supplierBreakdown.map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.supplierName}</td>
                      <td className="py-3 px-4 text-slate-500">{s.supplierCode}</td>
                      <td className="py-3 px-4 text-center font-bold text-teal-700">{s.commissionRatePct}%</td>
                      <td className="py-3 px-4 text-center">{s.unitsSold}</td>
                      <td className="py-3 px-4 text-right font-semibold">₹{s.grossSalesGMV.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">+₹{s.platformCommission.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-bold text-amber-700">₹{s.supplierPayable.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-slate-500">₹{s.settledAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transactions Table with Independent Pagination */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Fulfilled Marketplace Orders ({totalMarketplaceCount})
                </h3>
                <p className="text-xs text-slate-500">
                  Showing 10 records per page • Period: {marketplaceData.periodLabel}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Product Item</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Customer Paid</th>
                    <th className="py-3 px-4 text-right">Comm. Earned</th>
                    <th className="py-3 px-4 text-right">Supplier Payable</th>
                    <th className="py-3 px-4 text-center">Settlement</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedMarketplaceTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No marketplace orders found matching your selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedMarketplaceTransactions.map((tx: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 text-slate-500">{tx.date.split('T')[0]}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{tx.orderNumber}</td>
                        <td className="py-3 px-4 font-medium">{tx.supplierName}</td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600">{tx.productTitle}</td>
                        <td className="py-3 px-4 text-center font-bold">{tx.quantity}</td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">₹{tx.customerCollection.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">+₹{tx.platformCommission.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-semibold text-amber-700">₹{tx.supplierPayable.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tx.settlementStatus === 'settled'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tx.settlementStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedTx({ ...tx, type: 'marketplace' })}
                              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => setTxToDelete(tx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete or Archive Order"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (10 records per page) */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-500">
                {totalMarketplaceCount === 0
                  ? 'Showing 0–0 of 0 records'
                  : `Showing ${(marketplacePage - 1) * RECORDS_PER_PAGE + 1}–${Math.min(marketplacePage * RECORDS_PER_PAGE, totalMarketplaceCount)} of ${totalMarketplaceCount} records`}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={marketplacePage <= 1}
                  onClick={() => setMarketplacePage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold disabled:opacity-40 transition flex items-center gap-1"
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>

                {Array.from({ length: totalMarketplacePages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setMarketplacePage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                      marketplacePage === pg
                        ? 'bg-teal-700 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  disabled={marketplacePage >= totalMarketplacePages}
                  onClick={() => setMarketplacePage((p) => Math.min(totalMarketplacePages, p + 1))}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold disabled:opacity-40 transition flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2C: CAREGIVER SUBSCRIPTIONS & PLANS */}
      {/* ===================================================================== */}
      {!isLoading && !error && activeSubTab === 'subscriptions' && subscriptionsData && (
        <div className="space-y-6 animate-in fade-in">
          {/* Explanation Callout */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-xs text-purple-900 flex items-start gap-3 shadow-sm">
            <Info size={18} className="text-purple-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Bedside Caregiver Plans &amp; Labor Compensation</p>
              <p className="mt-0.5 leading-relaxed text-purple-800">
                Tracks active subscriptions, monthly recurring revenue (MRR), and committed caregiver bedside shift payouts.
                Formula: <span className="font-semibold underline">Customer Collections − Caregiver Payouts − Gateway Fees = Retained Platform Margin</span>.
              </p>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Collections</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">₹{subscriptionsData.totalCollections.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{subscriptionsData.totalSubscriptionsCount} Total Subscriptions</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Monthly Recurring (MRR)</p>
              <p className="text-xl font-extrabold text-teal-700 mt-1">₹{subscriptionsData.monthlyRecurringRevenue.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{subscriptionsData.activeSubscriptionsCount} Active Subscriptions</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Caregiver Liabilities</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">₹{subscriptionsData.caregiverPayoutLiabilities.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Bedside shift pay</p>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-emerald-800">Platform Margin</p>
              <p className="text-xl font-extrabold text-emerald-800 mt-1">₹{subscriptionsData.platformMargin.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-emerald-700 mt-0.5 font-bold">Retained Gross Margin</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Customer Refunds</p>
              <p className="text-xl font-extrabold text-rose-600 mt-1">₹{subscriptionsData.refundsProcessed.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Plan cancellations</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400">Gateway Fees (~2%)</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">₹{subscriptionsData.totalGatewayFees.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Razorpay digital</p>
            </div>
          </div>

          {/* Simple Visual Collections Trend */}
          {subscriptionsData.dailyCollections && subscriptionsData.dailyCollections.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Daily Care Plan Collections Trend</h4>
                  <p className="text-xs text-slate-500">Real-time daily collection volume for bedside clinical care.</p>
                </div>
              </div>

              <div className="flex items-end gap-3 h-28 pt-4 overflow-x-auto pb-2 border-b border-slate-100">
                {subscriptionsData.dailyCollections.map((d: any, idx: number) => {
                  const maxAmt = Math.max(...subscriptionsData.dailyCollections.map((x: any) => x.amount || 1));
                  const heightPct = Math.max(15, Math.round((d.amount / maxAmt) * 100));

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5 min-w-[50px]">
                      <span className="text-[10px] font-bold text-slate-700">₹{(d.amount / 1000).toFixed(0)}k</span>
                      <div className="w-8 bg-indigo-600/80 rounded-t-lg transition hover:bg-indigo-600" style={{ height: `${heightPct}%` }} />
                      <span className="text-[9px] text-slate-400 whitespace-nowrap">{d.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subscriptions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Clinical Care Subscriptions &amp; Packages ({subscriptionsData.pagination?.total || subscriptionsData.transactions?.length || 0})
                </h3>
                <p className="text-xs text-slate-500">Period: {subscriptionsData.periodLabel}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Sub #</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Plan Package</th>
                    <th className="py-3 px-4 text-center">Type</th>
                    <th className="py-3 px-4 text-center">Duration</th>
                    <th className="py-3 px-4 text-center">Visits</th>
                    <th className="py-3 px-4 text-right">Customer Paid</th>
                    <th className="py-3 px-4 text-right">Caregiver Pay</th>
                    <th className="py-3 px-4 text-right">Platform Margin</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {subscriptionsData.transactions.map((sub: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-500">{sub.createdAt.split('T')[0]}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{sub.subscriptionNumber}</td>
                      <td className="py-3 px-4 font-medium">{sub.patientName}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{sub.planTitle}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {sub.planType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{sub.durationDays}d</td>
                      <td className="py-3 px-4 text-center font-bold">{sub.visitsCompleted}/{sub.totalVisitsIncluded}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">₹{sub.customerPrice.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-purple-700 font-semibold">₹{sub.caregiverPayout.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-bold">+₹{sub.platformCommission.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            sub.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedTx({ ...sub, type: 'subscription' })}
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TRANSACTION PERMANENT DELETE / ARCHIVE CONFIRMATION MODAL */}
      {/* ===================================================================== */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Financial Order?</h3>
                <span className="text-[11px] font-mono text-slate-400">Order: {txToDelete.orderNumber}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{txToDelete.patientName}</p>
              <p className="text-slate-600">{txToDelete.itemsSummary || txToDelete.productTitle}</p>
              <p className="text-slate-500 font-semibold">
                Amount: ₹{(txToDelete.totalAmount || txToDelete.customerCollection || 0).toLocaleString('en-IN')} • Payment: {txToDelete.paymentStatus}
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>🛡️</span> Financial Audit Protection
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                If this order contains <strong>settled payments, delivered goods, or invoices</strong>, statutory financial regulations strictly prohibit destroying the record. It will be <strong>safely archived and hidden from default operational views</strong> while preserving ledger audit history. Unsettled test orders will be permanently deleted.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setTxToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                disabled={isDeletingTx}
                onClick={handleDeleteTransaction}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {isDeletingTx ? 'Processing...' : 'Yes, Confirm Deletion / Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TRANSACTION DETAIL DRAWER / MODAL */}
      {/* ===================================================================== */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt className="text-teal-600" size={18} />
                <h3 className="text-sm font-bold text-slate-900">
                  Transaction Audit Detail — {selectedTx.orderNumber || selectedTx.subscriptionNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <p className="text-slate-400 font-medium">Patient Customer</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedTx.patientName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Transaction Date</p>
                  <p className="font-bold text-slate-900 mt-0.5">{(selectedTx.date || selectedTx.createdAt || '').split('T')[0]}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Reference ID</p>
                  <p className="font-mono text-[11px] font-bold text-slate-700 mt-0.5">{selectedTx.transactionId || selectedTx.subscriptionNumber}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Payment Status</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                    {selectedTx.paymentStatus || selectedTx.status}
                  </span>
                </div>
              </div>

              {/* Items / Plan Description */}
              <div>
                <p className="font-bold text-slate-700 mb-1">Purchased Medical Equipment / Plan</p>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedTx.itemsSummary || selectedTx.productTitle || selectedTx.planTitle}
                </p>
              </div>

              {/* Financial Decomposition */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Customer Inflow</span>
                  <span className="font-bold text-slate-900">
                    ₹{(selectedTx.totalAmount || selectedTx.customerCollection || selectedTx.customerPrice || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                {selectedTx.procurementCost !== undefined && (
                  <div className="flex justify-between text-slate-500">
                    <span>Direct Procurement COGS</span>
                    <span className="text-rose-600">-₹{(selectedTx.procurementCost || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}

                {selectedTx.caregiverPayout !== undefined && (
                  <div className="flex justify-between text-slate-500">
                    <span>Caregiver Bedside Compensation</span>
                    <span className="text-rose-600">-₹{(selectedTx.caregiverPayout || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}

                {selectedTx.supplierPayable !== undefined && (
                  <div className="flex justify-between text-slate-500">
                    <span>Trade Supplier Payable</span>
                    <span className="text-amber-600">-₹{(selectedTx.supplierPayable || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}

                {selectedTx.gatewayFee !== undefined && (
                  <div className="flex justify-between text-slate-500">
                    <span>Payment Gateway Fee (Razorpay ~2%)</span>
                    <span className="text-rose-600">-₹{(selectedTx.gatewayFee || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}

                {selectedTx.refundAmount > 0 && (
                  <div className="flex justify-between text-rose-700 bg-rose-50 p-2 rounded-lg font-semibold">
                    <span>Refunded Amount</span>
                    <span>-₹{(selectedTx.refundAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Close Audit Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
