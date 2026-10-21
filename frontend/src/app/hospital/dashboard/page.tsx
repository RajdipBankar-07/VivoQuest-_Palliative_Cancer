'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Users,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Package,
  HeartPulse,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { hospitalsApi, authApi, ApiClientError } from '@/lib/api';

export default function HospitalDashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeHospitalPhone, setActiveHospitalPhone] = useState('9822011111');
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Check or auto-login with demo hospital credentials if no token
      const currentToken = localStorage.getItem('vivo_token');
      const currentRole = localStorage.getItem('vivo_role');

      if (!currentToken || currentRole !== 'hospital') {
        const loginRes = await authApi.login({
          identifier: activeHospitalPhone,
          otp: '123456',
          role: 'hospital',
        });
        localStorage.setItem('vivo_token', loginRes.token);
        localStorage.setItem('vivo_role', 'hospital');
        window.dispatchEvent(new Event('personalization_loaded'));
      }

      // 2. Fetch Profile, Stats, and Referrals in parallel
      const [profileData, statsData, referralsData] = await Promise.all([
        hospitalsApi.getProfile().catch(() => null),
        hospitalsApi.getDashboardStats().catch(() => null),
        hospitalsApi.getReferrals({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          search: searchQuery.trim() || undefined,
          limit: 15,
        }),
      ]);

      setProfile(profileData);
      setStats(statsData);
      setReferrals(referralsData?.data || []);
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load hospital dashboard data. Please verify the API server is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [statusFilter, priorityFilter, activeHospitalPhone]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDashboardData();
  };

  const handleSwitchHospitalOrg = async (phone: string) => {
    setIsSwitchingOrg(true);
    try {
      const loginRes = await authApi.login({
        identifier: phone,
        otp: '123456',
        role: 'hospital',
      });
      localStorage.setItem('vivo_token', loginRes.token);
      localStorage.setItem('vivo_role', 'hospital');
      window.dispatchEvent(new Event('personalization_loaded'));
      setActiveHospitalPhone(phone);
      setSearchQuery('');
      setStatusFilter('all');
    } catch (err: any) {
      setError(`Failed to switch organization: ${err.message}`);
    } finally {
      setIsSwitchingOrg(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Submitted (Pending Triage)
          </span>
        );
      case 'triaged':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-primary border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Triaged
          </span>
        );
      case 'bundle_proposed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Sparkles size={12} className="text-indigo-600" />
            Care Bundle Formulated
          </span>
        );
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
            <Users size={12} className="text-cyan-600" />
            Providers Matched
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-secondary border border-emerald-200">
            <CheckCircle2 size={12} className="text-secondary" />
            Approved &amp; Scheduled
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
            In-Home Care Active
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 size={12} />
            Care Completed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle size={12} />
            Declined / Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'immediate':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
            Critical / Immediate
          </span>
        );
      case 'urgent':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            Urgent (24h)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">
            Routine
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Header & Organization Switcher Banner */}
        <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy to-navy-light text-white flex items-center justify-center shadow-md shrink-0">
              <Building2 size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-extrabold text-navy tracking-tight">
                  {profile?.hospitalName || 'Hospital Partner Portal'}
                </h1>
                {profile?.accreditations?.map((acc: string) => (
                  <span
                    key={acc}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-light text-primary border border-primary/20"
                  >
                    <ShieldCheck size={12} />
                    {acc} Accredited
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-y-1 gap-x-3">
                <span>Reg No: <strong className="text-navy">{profile?.registrationNumber || 'MH-PUN-0012'}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-primary" />
                  {profile?.address ? `${profile.address}, ${profile.city}` : 'Pune, Maharashtra'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-secondary font-medium">
                  <HeartPulse size={13} />
                  Tier: {profile?.tier?.toUpperCase() || 'TERTIARY'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Org Switcher & Primary Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Demo Switcher Dropdown / Buttons */}
            <div className="flex items-center bg-background rounded-2xl p-1 border border-border">
              <button
                type="button"
                onClick={() => handleSwitchHospitalOrg('9822011111')}
                disabled={isSwitchingOrg}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeHospitalPhone === '9822011111'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-navy hover:text-primary'
                }`}
              >
                Ruby Hall Clinic
              </button>
              <button
                type="button"
                onClick={() => handleSwitchHospitalOrg('9822022222')}
                disabled={isSwitchingOrg}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeHospitalPhone === '9822022222'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-navy hover:text-primary'
                }`}
              >
                Sahyadri Hospital
              </button>
            </div>

            <Button
              href="/hospital/referrals/new"
              variant="primary"
              size="md"
              leftIcon={<PlusCircle size={18} />}
              className="shadow-primary justify-center"
            >
              New Discharge Referral
            </Button>
          </div>
        </div>

        {/* Operational KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Total Referrals</span>
              <FileText size={16} className="text-primary" />
            </div>
            <div className="text-2xl font-extrabold text-navy">
              {stats?.overview?.totalReferrals ?? 0}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Cumulative logged</span>
          </div>

          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-secondary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Active In-Home Care</span>
              <Activity size={16} className="text-secondary" />
            </div>
            <div className="text-2xl font-extrabold text-secondary">
              {stats?.overview?.activeInHomeCare ?? 0}
            </div>
            <span className="text-[10px] text-secondary font-medium mt-1 block">Live home visits</span>
          </div>

          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Pending Triage</span>
              <Clock size={16} className="text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-amber-600">
              {stats?.overview?.pendingTriage ?? 0}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Awaiting coordination</span>
          </div>

          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-slate-400 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Completed Care</span>
              <CheckCircle2 size={16} className="text-slate-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-700">
              {stats?.overview?.completedEpisodes ?? 0}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Transitions finished</span>
          </div>

          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-indigo-400 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Active Equipment</span>
              <Package size={16} className="text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-indigo-700">
              {stats?.overview?.totalEquipmentDeployed ?? 0}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">DME units at homes</span>
          </div>

          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Avg Turnaround</span>
              <Clock size={16} className="text-primary" />
            </div>
            <div className="text-2xl font-extrabold text-navy">
              {stats?.overview?.turnaroundAvgHours ?? 4.2}h
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Triage to dispatch</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadDashboardData}
              className="text-xs font-bold underline hover:opacity-80"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Discharge Referral Management Section */}
        <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-navy">
                Discharge &amp; Home-Care Referrals
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time tracking of post-discharge clinical services, DME rentals, and care bundles
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadDashboardData}
                leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
              >
                Refresh
              </Button>
              <Button
                href="/hospital/referrals"
                variant="outline"
                size="sm"
                rightIcon={<ChevronRight size={14} />}
              >
                View Full Archive
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none text-xs">
              {[
                { key: 'all', label: 'All Statuses' },
                { key: 'submitted', label: 'Pending Triage' },
                { key: 'bundle_proposed', label: 'Bundle Proposed' },
                { key: 'in_progress', label: 'In-Progress' },
                { key: 'completed', label: 'Completed' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-navy text-white shadow-xs'
                      : 'bg-background hover:bg-slate-100 text-navy/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 md:max-w-xs">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search referral #, patient name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </form>
          </div>

          {/* Referrals Cards Grid */}
          {isLoading ? (
            <div className="py-16 text-center">
              <RefreshCw size={28} className="animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm font-semibold text-navy">Loading Hospital Referrals...</p>
              <p className="text-xs text-muted-foreground mt-1">Fetching live patient transitions and equipment orders</p>
            </div>
          ) : referrals.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl bg-background/50">
              <FileText size={40} className="text-muted-foreground/60 mx-auto mb-3" />
              <h3 className="text-base font-bold text-navy">No Referrals Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-5">
                {searchQuery || statusFilter !== 'all'
                  ? 'No referral matched your selected criteria. Try adjusting your search query or filters.'
                  : 'Your hospital organization has not logged any patient discharge care referrals yet.'}
              </p>
              <Button href="/hospital/referrals/new" variant="primary" size="md" leftIcon={<PlusCircle size={16} />}>
                Create First Referral
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="bg-white rounded-2xl border border-border hover:border-primary/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between p-5 space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Header: Referral Number & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-primary bg-primary-light px-2.5 py-1 rounded-lg">
                        {ref.referralNumber}
                      </span>
                      {getPriorityBadge(ref.priority)}
                    </div>

                    {/* Patient & Discharge Date */}
                    <div>
                      <h3 className="text-base font-extrabold text-navy group-hover:text-primary transition-colors">
                        {ref.patientName}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{ref.patientAge} yrs • {ref.patientGender}</span>
                        <span>•</span>
                        <span>{ref.cluster || ref.city}</span>
                      </p>
                    </div>

                    {/* Primary Diagnosis */}
                    <div className="p-3 rounded-xl bg-background border border-border/80 text-xs text-navy/90 line-clamp-2">
                      <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">
                        Clinical Diagnosis:
                      </span>
                      {ref.primaryDiagnosisSummary}
                    </div>

                    {/* Services and Equipment Badges */}
                    <div className="space-y-2 pt-1">
                      {ref.servicesList && ref.servicesList.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                            Requested Services ({ref.servicesList.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {ref.servicesList.map((svc: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-primary border border-blue-100"
                              >
                                {svc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {ref.equipmentList && ref.equipmentList.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                            Equipment Units ({ref.equipmentList.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {ref.equipmentList.map((eq: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                              >
                                {eq}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer: Status Badge & CTA Link */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    {getStatusBadge(ref.status)}

                    <Link
                      href={`/hospital/referrals/${ref.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-navy hover:text-primary transition-colors"
                    >
                      <span>Track</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operational Analytics & Care Coordination Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Department Distribution */}
          <div className="bg-white rounded-3xl border border-border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                Referrals by Department
              </h3>
              <Users size={16} className="text-muted-foreground" />
            </div>

            <div className="space-y-3 pt-1">
              {stats?.departmentBreakdown && Object.keys(stats.departmentBreakdown).length > 0 ? (
                Object.entries(stats.departmentBreakdown).map(([dept, count]: any) => (
                  <div key={dept} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-navy">{dept}</span>
                      <span className="text-muted-foreground">{count} cases</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min(100, (count / (stats?.overview?.totalReferrals || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">No departmental records yet</p>
              )}
            </div>
          </div>

          {/* Requested Services Distribution */}
          <div className="bg-white rounded-3xl border border-border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                Home Services Demand
              </h3>
              <HeartPulse size={16} className="text-secondary" />
            </div>

            <div className="space-y-3 pt-1">
              {stats?.serviceTypeBreakdown && Object.keys(stats.serviceTypeBreakdown).length > 0 ? (
                Object.entries(stats.serviceTypeBreakdown).map(([svc, count]: any) => (
                  <div key={svc} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-navy truncate max-w-[200px]">{svc}</span>
                      <span className="text-muted-foreground">{count} orders</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full"
                        style={{
                          width: `${Math.min(100, (count / 10) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">No service demand data yet</p>
              )}
            </div>
          </div>

          {/* Discharge Coordinator Profile Info */}
          <div className="bg-gradient-to-br from-navy to-navy-light text-white rounded-3xl shadow-sm p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/10 text-white/90 inline-block">
                Hospital Liaison Desk
              </span>
              <h3 className="text-lg font-bold">
                {profile?.dischargeCoordinator?.name || 'Care Coordinator'}
              </h3>
              <p className="text-xs text-white/80">
                {profile?.dischargeCoordinator?.designation || 'Patient Transition Lead'}
              </p>
              
              <div className="space-y-2 pt-2 text-xs text-white/90">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-secondary-light" />
                  <span>{profile?.dischargeCoordinator?.phone || '+91 98220 11112'}</span>
                </div>
                {profile?.dischargeCoordinator?.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-secondary-light" />
                    <span>{profile.dischargeCoordinator.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/15">
              <p className="text-[11px] text-white/70">
                Need urgent assistance for ventilator or ICU home care?
              </p>
              <div className="mt-2 text-xs font-bold text-secondary-light">
                VivoQuest Clinical Hotline: 1800-VIVO-CARE
              </div>
            </div>
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
