'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { adminApi } from '@/lib/api';

export function FinancialSummaryView() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancials = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await adminApi.getFinancialSummary();
      setData(summary);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate financial summary from server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-500">
        <RefreshCw className="animate-spin text-teal-600 mb-3" size={32} />
        <p className="text-sm font-medium">Reconciling server-side financial ledger & accounts...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <p>{error || 'No financial summary available'}</p>
        </div>
        <button
          onClick={fetchFinancials}
          className="px-3 py-1.5 bg-white text-rose-700 font-semibold rounded-lg shadow-sm border border-rose-200 hover:bg-rose-100 text-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  const { revenue, costsAndLiabilities, profitability, settlementBreakdown } = data;

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Financial Ledger & Revenue Breakdown</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Server-Calculated
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Separated customer sales revenue, procurement liabilities, caregiver payouts, and refunds. Sourcing costs are never counted as revenue.
          </p>
        </div>
        <button
          onClick={fetchFinancials}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Reconcile Ledger</span>
        </button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Gross Sales Revenue */}
        <div className="bg-gradient-to-br from-slate-900 to-navy text-white p-6 rounded-2xl shadow-sm border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Customer Sales Revenue</span>
            <span className="p-2 rounded-xl bg-white/10 text-emerald-400">
              <DollarSign size={18} />
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">
              ₹{revenue.totalGrossSalesRevenue.toLocaleString()}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-300 border-t border-white/10 pt-2.5">
              <span>Equipment: ₹{revenue.productSalesRevenue.toLocaleString()}</span>
              <span>•</span>
              <span>Caregivers: ₹{revenue.caregiverSubscriptionRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Estimated Gross Profit</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={18} />
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-emerald-700 tracking-tight">
              ₹{profitability.estimatedGrossProfit.toLocaleString()}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <Percent size={12} />
                <span>Margin: {profitability.grossProfitMarginPct}%</span>
              </span>
              <span>After Direct Costs</span>
            </div>
          </div>
        </div>

        {/* Equipment Procurement Costs */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Equipment Procurement Cost</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Truck size={18} />
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              ₹{costsAndLiabilities.equipmentProcurementCost.toLocaleString()}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
              <span>Direct stock & received POs</span>
              <span className="text-amber-700 font-medium">COGS</span>
            </div>
          </div>
        </div>

        {/* Caregiver Payout Liabilities */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Caregiver Payout Liabilities</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <HeartPulse size={18} />
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              ₹{costsAndLiabilities.caregiverPayoutLiabilities.toLocaleString()}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
              <span>Bedside shifts committed</span>
              <span className="text-purple-700 font-medium">Payable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Financial Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <RotateCcw size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Customer Refunds Processed</p>
              <p className="text-xl font-bold text-slate-900">
                ₹{costsAndLiabilities.refundsProcessed.toLocaleString()}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400">Reconciled</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Receipt size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Supplier Payables (Pending)</p>
              <p className="text-xl font-bold text-slate-900">
                ₹{costsAndLiabilities.supplierPayablesPending.toLocaleString()}
              </p>
            </div>
          </div>
          <span className="text-xs text-amber-600 font-semibold">Net 15/30</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Gateway Fees (Razorpay ~2%)</p>
              <p className="text-xl font-bold text-slate-900">
                ₹{costsAndLiabilities.paymentGatewayFees.toLocaleString()}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400">Digital Settlements</span>
        </div>
      </div>

      {/* Ledger Reconciliation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Net Profit Reconciliation Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">Authoritative audit ledger reconciling customer inflow and supplier/labor outflow.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info size={14} className="text-teal-600" />
            <span>Digital Volume: ₹{settlementBreakdown.onlinePaymentVolume.toLocaleString()}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Ledger Account</th>
                <th className="py-3.5 px-6">Classification</th>
                <th className="py-3.5 px-6">Accounting Treatment</th>
                <th className="py-3.5 px-6 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-2">
                  <ShoppingBag size={14} className="text-teal-600" />
                  <span>Medical Equipment Retail Sales</span>
                </td>
                <td className="py-4 px-6 text-slate-600">Product Revenue Inflow</td>
                <td className="py-4 px-6 text-emerald-700 font-medium">Add (+) Gross Sales</td>
                <td className="py-4 px-6 text-right font-bold text-emerald-700">
                  +₹{revenue.productSalesRevenue.toLocaleString()}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-2">
                  <HeartPulse size={14} className="text-teal-600" />
                  <span>Caregiver Subscriptions & Visit Packs</span>
                </td>
                <td className="py-4 px-6 text-slate-600">Service Revenue Inflow</td>
                <td className="py-4 px-6 text-emerald-700 font-medium">Add (+) Gross Sales</td>
                <td className="py-4 px-6 text-right font-bold text-emerald-700">
                  +₹{revenue.caregiverSubscriptionRevenue.toLocaleString()}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-2">
                  <Truck size={14} className="text-amber-600" />
                  <span>Equipment Procurement / Sourcing Cost</span>
                </td>
                <td className="py-4 px-6 text-slate-600">Supplier Sourcing COGS</td>
                <td className="py-4 px-6 text-rose-700 font-medium">Deduct (-) Direct Sourcing Cost</td>
                <td className="py-4 px-6 text-right font-bold text-rose-700">
                  -₹{costsAndLiabilities.equipmentProcurementCost.toLocaleString()}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-2">
                  <HeartPulse size={14} className="text-purple-600" />
                  <span>Caregiver Bedside Shift Payouts</span>
                </td>
                <td className="py-4 px-6 text-slate-600">Labor Delivery Liability</td>
                <td className="py-4 px-6 text-rose-700 font-medium">Deduct (-) Caregiver Compensation</td>
                <td className="py-4 px-6 text-right font-bold text-rose-700">
                  -₹{costsAndLiabilities.caregiverPayoutLiabilities.toLocaleString()}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-2">
                  <RotateCcw size={14} className="text-rose-600" />
                  <span>Processed Customer Returns & Refunds</span>
                </td>
                <td className="py-4 px-6 text-slate-600">Contra-Revenue</td>
                <td className="py-4 px-6 text-rose-700 font-medium">Deduct (-) Customer Reimbursements</td>
                <td className="py-4 px-6 text-right font-bold text-rose-700">
                  -₹{costsAndLiabilities.refundsProcessed.toLocaleString()}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-2">
                  <CreditCard size={14} className="text-blue-600" />
                  <span>Payment Gateway Processing (Razorpay ~2%)</span>
                </td>
                <td className="py-4 px-6 text-slate-600">Transaction Fee</td>
                <td className="py-4 px-6 text-rose-700 font-medium">Deduct (-) Merchant Fee</td>
                <td className="py-4 px-6 text-right font-bold text-rose-700">
                  -₹{costsAndLiabilities.paymentGatewayFees.toLocaleString()}
                </td>
              </tr>

              <tr className="bg-emerald-50/60 font-bold text-slate-900 border-t-2 border-emerald-200">
                <td className="py-4 px-6 text-sm flex items-center gap-2 text-emerald-900">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  <span>Estimated Net Operating Profit</span>
                </td>
                <td className="py-4 px-6 text-slate-600 font-normal">Reconciled Margin</td>
                <td className="py-4 px-6 text-emerald-800">
                  Gross Sales minus All Direct Costs
                </td>
                <td className="py-4 px-6 text-right text-base text-emerald-800">
                  ₹{profitability.estimatedGrossProfit.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
