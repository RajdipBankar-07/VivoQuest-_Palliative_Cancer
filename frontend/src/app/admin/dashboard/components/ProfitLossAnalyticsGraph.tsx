'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Calendar,
  Layers,
  ShoppingBag,
  Building2,
  HeartPulse,
  RefreshCw,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

export type AnalyticsCategory = 'overview' | 'owned' | 'marketplace' | 'subscriptions';
export type AnalyticsGrouping = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type AnalyticsDatePreset =
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
  | 'all'
  | 'custom';

interface ProfitLossDataPoint {
  period: string;
  dateKey: string;
  timestamp: number;
  revenue: number;
  expenses: number;
  netProfitOrLoss: number;
  isProfit: boolean;
  revenueChangePct: number | null;
  profitChangePct: number | null;
  expenseChangePct: number | null;
}

interface ProfitLossKpis {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  netLoss: number;
  netOperatingResult: number;
  marginPct: number;
  isOverallProfit: boolean;
  costDataStatus: 'complete' | 'partial' | 'simulated' | 'none';
  hasSufficientCostData: boolean;
}

interface ProfitLossAnalyticsData {
  periodLabel: string;
  category: AnalyticsCategory;
  grouping: AnalyticsGrouping;
  kpis: ProfitLossKpis;
  series: ProfitLossDataPoint[];
}

interface ProfitLossAnalyticsGraphProps {
  initialData?: ProfitLossAnalyticsData;
  activeTab?: string;
  onRefreshParent?: () => void;
}

const DATE_PRESET_OPTIONS: { id: AnalyticsDatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'previous_month', label: 'Previous Month' },
  { id: 'last_3_months', label: 'Last 3 Months' },
  { id: 'last_6_months', label: 'Last 6 Months' },
  { id: 'this_year', label: 'This Year' },
  { id: 'previous_year', label: 'Previous Year' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom Range' },
];

const GROUPING_OPTIONS: { id: AnalyticsGrouping; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

const CATEGORY_TABS: { id: AnalyticsCategory; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'All Streams (Consolidated)', icon: Layers },
  { id: 'owned', label: 'Owned Products', icon: ShoppingBag },
  { id: 'marketplace', label: 'Marketplace Partners', icon: Building2 },
  { id: 'subscriptions', label: 'Caregiver Plans', icon: HeartPulse },
];

// Helper to format currency in Indian format
function formatInr(val: number | null | undefined): string {
  const num = typeof val === 'number' && !isNaN(val) ? Math.round(val) : 0;
  return `₹${num.toLocaleString('en-IN')}`;
}

// Compact currency for chart Y-axis
function formatInrCompact(val: number): string {
  if (Math.abs(val) >= 10000000) {
    return `₹${(val / 10000000).toFixed(1)}Cr`;
  }
  if (Math.abs(val) >= 100000) {
    return `₹${(val / 100000).toFixed(1)}L`;
  }
  if (Math.abs(val) >= 1000) {
    return `₹${(val / 1000).toFixed(0)}k`;
  }
  return `₹${val}`;
}

export function ProfitLossAnalyticsGraph({
  initialData,
  activeTab = 'overview',
  onRefreshParent,
}: ProfitLossAnalyticsGraphProps) {
  const [isMounted, setIsMounted] = useState(false);
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Filter State
  const [preset, setPreset] = useState<AnalyticsDatePreset>('all');
  const [grouping, setGrouping] = useState<AnalyticsGrouping>('daily');
  const [category, setCategory] = useState<AnalyticsCategory>(
    (['overview', 'owned', 'marketplace', 'subscriptions'].includes(activeTab)
      ? activeTab
      : 'overview') as AnalyticsCategory
  );
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Data & Loading State
  const [data, setData] = useState<ProfitLossAnalyticsData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync category if parent activeTab changes
  useEffect(() => {
    if (activeTab && ['overview', 'owned', 'marketplace', 'subscriptions'].includes(activeTab)) {
      setCategory(activeTab as AnalyticsCategory);
    }
  }, [activeTab]);

  // Fetch analytics from backend
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        preset,
        grouping,
        category,
      };
      if (preset === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
      const res = await adminApi.getProfitLossAnalytics(params);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load P&L analytics:', err);
      setError(err?.message || 'Failed to load Profit & Loss analytics from server');
    } finally {
      setIsLoading(false);
    }
  }, [preset, grouping, category, customStartDate, customEndDate]);

  // Initial and subsequent fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // KPIs shorthand
  const kpis: ProfitLossKpis = data?.kpis || {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    netLoss: 0,
    netOperatingResult: 0,
    marginPct: 0,
    isOverallProfit: true,
    costDataStatus: 'complete',
    hasSufficientCostData: true,
  };

  const seriesData = data?.series || [];

  // Prepare Highcharts series and categories
  const chartOptions: Highcharts.Options = useMemo(() => {
    const categories = seriesData.map((d) => d.period);
    const revenuePoints = seriesData.map((d) => ({
      y: d.revenue,
      changePct: d.revenueChangePct,
      period: d.period,
    }));
    const expensePoints = seriesData.map((d) => ({
      y: d.expenses,
      changePct: d.expenseChangePct,
      period: d.period,
    }));
    const netPoints = seriesData.map((d) => ({
      y: d.netProfitOrLoss,
      changePct: d.profitChangePct,
      isProfit: d.isProfit,
      revenue: d.revenue,
      expenses: d.expenses,
      period: d.period,
    }));

    return {
      chart: {
        type: 'areaspline',
        backgroundColor: 'transparent',
        height: 420,
        zooming: {
          type: 'x',
        },
        panning: {
          enabled: true,
          type: 'x',
        },
        panKey: 'shift',
        style: {
          fontFamily: 'inherit',
        },
      },
      title: {
        text: undefined,
      },
      credits: {
        enabled: false,
      },
      legend: {
        enabled: true,
        align: 'right',
        verticalAlign: 'top',
        layout: 'horizontal',
        itemStyle: {
          fontSize: '12px',
          fontWeight: '600',
          color: '#334155',
        },
        itemHoverStyle: {
          color: '#0F172A',
        },
      },
      xAxis: {
        categories,
        crosshair: {
          color: '#E2E8F0',
          dashStyle: 'ShortDash',
        },
        labels: {
          style: {
            color: '#64748B',
            fontSize: '11px',
            fontWeight: '500',
          },
          rotation: categories.length > 10 ? -45 : 0,
        },
        lineColor: '#CBD5E1',
        tickColor: '#CBD5E1',
      },
      yAxis: {
        title: {
          text: undefined,
        },
        labels: {
          formatter: function () {
            return formatInrCompact(Number(this.value));
          },
          style: {
            color: '#64748B',
            fontSize: '11px',
            fontWeight: '500',
          },
        },
        gridLineColor: '#F1F5F9',
        plotLines: [
          {
            value: 0,
            color: '#94A3B8',
            width: 1.5,
            dashStyle: 'ShortDash',
            zIndex: 4,
            label: {
              text: 'Break-even (₹0)',
              align: 'right',
              style: {
                color: '#64748B',
                fontSize: '10px',
                fontWeight: '700',
              },
            },
          },
        ],
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderRadius: 14,
        shadow: {
          color: 'rgba(15, 23, 42, 0.08)',
          offsetX: 0,
          offsetY: 8,
          opacity: 0.1,
          width: 16,
        },
        padding: 12,
        formatter: function () {
          // Format period label
          const xLabel = this.x;
          let html = `<div style="min-width: 210px; font-family: system-ui, -apple-system, sans-serif;">`;
          html += `<div style="font-size: 12px; font-weight: 700; color: #0F172A; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px; margin-bottom: 8px;">Period: ${xLabel}</div>`;

          this.points?.forEach((point: any) => {
            const seriesName = point.series.name;
            const seriesColor = point.series.color;
            const val = point.y;
            const customData = point.point.options;
            const change = customData?.changePct;

            let changeBadge = '';
            if (change !== null && change !== undefined) {
              const isPositiveChange = change >= 0;
              const badgeBg = isPositiveChange ? '#DCFCE7' : '#FEE2E2';
              const badgeColor = isPositiveChange ? '#15803D' : '#B91C1C';
              const sign = isPositiveChange ? '+' : '';
              changeBadge = `<span style="font-size: 10px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; padding: 1px 5px; border-radius: 4px; margin-left: 6px;">${sign}${change}%</span>`;
            }

            html += `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; font-size: 11px;">`;
            html += `<span style="display: flex; align-items: center; gap: 5px; color: #475569;">`;
            html += `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${seriesColor};"></span>`;
            html += `<span>${seriesName}:</span>`;
            html += `</span>`;
            html += `<span style="font-weight: 800; color: #0F172A;">${formatInr(val)}${changeBadge}</span>`;
            html += `</div>`;
          });

          // Add margin for period if net point exists
          const netPt: any = this.points?.find((p) => p.series.name.includes('Net Profit'));
          if (netPt && netPt.point && netPt.point.options) {
            const r = netPt.point.options.revenue || 0;
            const net = netPt.point.options.y || 0;
            const margin = r > 0 ? ((net / r) * 100).toFixed(1) : '0.0';
            const isProfit = net >= 0;
            html += `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #F1F5F9; font-size: 10px; display: flex; justify-content: space-between; color: #64748B;">`;
            html += `<span>Operating Margin:</span>`;
            html += `<span style="font-weight: 700; color: ${isProfit ? '#16A34A' : '#DC2626'};">${margin}%</span>`;
            html += `</div>`;
          }

          html += `</div>`;
          return html;
        },
      },
      plotOptions: {
        areaspline: {
          fillOpacity: 0.12,
          lineWidth: 2.5,
          marker: {
            enabled: seriesData.length <= 31,
            radius: 3.5,
            symbol: 'circle',
          },
          states: {
            hover: {
              lineWidth: 3.5,
            },
          },
        },
      },
      series: [
        {
          name: 'Total Revenue',
          type: 'areaspline',
          data: revenuePoints,
          color: '#2563EB',
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'rgba(37, 99, 235, 0.28)'],
              [1, 'rgba(37, 99, 235, 0.01)'],
            ],
          },
        },
        {
          name: 'Total Expenses',
          type: 'areaspline',
          data: expensePoints,
          color: '#F59E0B',
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'rgba(245, 158, 11, 0.24)'],
              [1, 'rgba(245, 158, 11, 0.01)'],
            ],
          },
        },
        {
          name: 'Net Profit / Loss',
          type: 'areaspline',
          data: netPoints,
          threshold: 0,
          color: '#16A34A', // Positive profit in emerald green
          negativeColor: '#DC2626', // Negative loss in crimson red
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'rgba(22, 163, 74, 0.30)'],
              [1, 'rgba(22, 163, 74, 0.01)'],
            ],
          },
          negativeFillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, 'rgba(220, 38, 38, 0.01)'],
              [1, 'rgba(220, 38, 38, 0.30)'],
            ],
          },
          lineWidth: 3,
        },
      ],
    };
  }, [seriesData]);

  const handleResetZoom = () => {
    if (chartRef.current?.chart) {
      chartRef.current.chart.zoomOut();
    }
  };

  const categoryName = CATEGORY_TABS.find((c) => c.id === category)?.label || 'All Streams';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* 1. SECTION HEADER & STREAM CATEGORY TABS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <TrendingUp size={18} />
            </span>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Profit &amp; Loss Analytics
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
              Highcharts Interactive
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-stream financial performance: recognized revenue, direct procurement &amp; payout expenses, and net profit margins.
          </p>
        </div>

        {/* Stream Category Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = category === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCategory(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  isSelected
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 4 COMPACT FINANCIAL KPI CARDS DIRECTLY ABOVE THE GRAPH */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: TOTAL REVENUE */}
        <div className="bg-gradient-to-br from-blue-50/60 to-slate-50/50 p-4 rounded-2xl border border-blue-100/80 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700">
              Total Revenue
            </span>
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <TrendingUp size={14} />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatInr(kpis.totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Recognized inflow collections for {categoryName}
          </p>
        </div>

        {/* KPI 2: TOTAL EXPENSES */}
        <div className="bg-gradient-to-br from-amber-50/60 to-slate-50/50 p-4 rounded-2xl border border-amber-100/80 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700">
              Total Expenses
            </span>
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <TrendingDown size={14} />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatInr(kpis.totalExpenses)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            COGS, provider payouts &amp; processing costs
          </p>
        </div>

        {/* KPI 3: NET PROFIT */}
        <div className="bg-gradient-to-br from-emerald-50/60 to-slate-50/50 p-4 rounded-2xl border border-emerald-100/80 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">
              Net Profit
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
              {kpis.marginPct >= 0 ? `+${kpis.marginPct}% Margin` : `${kpis.marginPct}% Margin`}
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-2">
            {formatInr(kpis.netProfit)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-600" />
            <span>Operating profit after direct expenses</span>
          </p>
        </div>

        {/* KPI 4: NET LOSS */}
        <div
          className={`p-4 rounded-2xl border shadow-sm transition hover:shadow ${
            kpis.netLoss > 0
              ? 'bg-gradient-to-br from-rose-50/80 to-slate-50/50 border-rose-200'
              : 'bg-gradient-to-br from-slate-50/80 to-slate-100/50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] uppercase font-bold tracking-wider ${
                kpis.netLoss > 0 ? 'text-rose-700' : 'text-slate-500'
              }`}
            >
              Net Loss
            </span>
            <span
              className={`p-1.5 rounded-lg ${
                kpis.netLoss > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
              }`}
            >
              <AlertCircle size={14} />
            </span>
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              kpis.netLoss > 0 ? 'text-rose-700' : 'text-slate-700'
            }`}
          >
            {kpis.netLoss > 0 ? formatInr(kpis.netLoss) : '₹0'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {kpis.netLoss > 0
              ? `Expenses exceeded revenue (${Math.abs(kpis.marginPct)}% deficit)`
              : 'No net loss • Break-even achieved'}
          </p>
        </div>
      </div>

      {/* 3. DATE PRESETS & TIME GROUPING CONTROLS */}
      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar size={12} />
              <span>Range:</span>
            </span>
            {DATE_PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPreset(opt.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                  preset === opt.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Grouping Selector & Refresh */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Group By:
            </span>
            <div className="flex items-center bg-white rounded-xl border border-slate-200/80 p-0.5">
              {GROUPING_OPTIONS.map((grp) => (
                <button
                  key={grp.id}
                  onClick={() => setGrouping(grp.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    grouping === grp.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {grp.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                fetchAnalytics();
                if (onRefreshParent) onRefreshParent();
              }}
              disabled={isLoading}
              title="Refresh Analytics"
              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 transition"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-teal-600' : ''} />
            </button>
          </div>
        </div>

        {/* Custom Date Inputs if Custom selected */}
        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 animate-in fade-in">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-semibold">Start:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-800"
              />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-semibold">End:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-800"
              />
            </div>
            <button
              onClick={fetchAnalytics}
              disabled={!customStartDate || !customEndDate || isLoading}
              className="px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-teal-700 disabled:opacity-50 transition"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* 4. HIGHCHARTS GRAPH CONTAINER */}
      <div className="relative bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
        {/* Graph Subheader & Zoom Controls */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-bold text-slate-800">
              {data?.periodLabel || 'Selected Range'}
            </span>
            <span>•</span>
            <span className="text-slate-500">
              {seriesData.length} data {seriesData.length === 1 ? 'point' : 'points'} ({grouping})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleResetZoom}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-[11px] font-semibold transition"
              title="Reset Zoom"
            >
              <RotateCcw size={12} />
              <span>Reset Zoom</span>
            </button>
            <span className="text-[10px] text-slate-400 italic hidden sm:inline">
              (Drag to zoom horizontally, Shift+Drag to pan)
            </span>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10 transition">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-teal-600" />
              <span className="text-xs font-bold text-slate-700">Updating analytics...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-8 text-center bg-rose-50/50 rounded-xl border border-rose-200 my-4">
            <AlertCircle size={28} className="mx-auto text-rose-500 mb-2" />
            <p className="text-sm font-bold text-rose-800">Failed to load analytics</p>
            <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="mt-3 px-3 py-1 bg-white border border-rose-300 text-rose-700 text-xs font-bold rounded-lg shadow-sm hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && seriesData.length === 0 && (
          <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200 my-4">
            <Calendar size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-bold text-slate-700">No financial data for this period</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no transactions or recognized activities within the selected date preset for {categoryName}.
              Try selecting <strong>"All Time"</strong>, <strong>"Last 30 Days"</strong>, or switching categories.
            </p>
            <button
              onClick={() => {
                setPreset('all');
                setGrouping('daily');
              }}
              className="mt-4 px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-teal-700 transition"
            >
              View All Time
            </button>
          </div>
        )}

        {/* Highcharts Render */}
        {isMounted && !error && seriesData.length > 0 && (
          <div className="w-full">
            <HighchartsReact
              highcharts={Highcharts}
              options={chartOptions}
              ref={chartRef}
              containerProps={{ style: { width: '100%' } }}
            />
          </div>
        )}
      </div>

      {/* 5. FOOTER NOTES & EXPLANATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>Green line &amp; fill = Profitable period</span>
          <span className="mx-1">•</span>
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
          <span>Red line &amp; fill = Deficit/Loss period</span>
        </div>
        <div className="text-slate-400 italic">
          Data source: Live MongoDB transactions (orders, caregiver payouts &amp; supplier settlements)
        </div>
      </div>
    </div>
  );
}
