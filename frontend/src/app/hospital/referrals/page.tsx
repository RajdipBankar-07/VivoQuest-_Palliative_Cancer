'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MapPin,
  HeartPulse,
  Package,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { hospitalsApi, authApi, ApiClientError } from '@/lib/api';

export default function HospitalReferralsListPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [page, setPage] = useState(1);

  const fetchReferrals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Ensure token exists
      const currentToken = localStorage.getItem('vivo_token');
      if (!currentToken) {
        const loginRes = await authApi.login({
          identifier: '9822011111',
          otp: '123456',
          role: 'hospital',
        });
        localStorage.setItem('vivo_token', loginRes.token);
        localStorage.setItem('vivo_role', 'hospital');
      }

      const res = await hospitalsApi.getReferrals({
        status: status !== 'all' ? status : undefined,
        priority: priority !== 'all' ? priority : undefined,
        search: search.trim() || undefined,
        page,
        limit: 15,
      });

      setReferrals(res.data || []);
      setPagination(res.pagination || { total: res.data?.length || 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to fetch referrals list. Please verify API server status.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [status, priority, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReferrals();
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Submitted
          </span>
        );
      case 'triaged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-primary border border-blue-200">
            Triaged
          </span>
        );
      case 'bundle_proposed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Sparkles size={11} className="text-indigo-600" />
            Bundle Ready
          </span>
        );
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
            Matched
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-secondary border border-emerald-200">
            <CheckCircle2 size={11} />
            Approved
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
            In-Home Care
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 size={11} />
            Completed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle size={11} />
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
            {st}
          </span>
        );
    }
  };

  const getPriorityBadge = (pr: string) => {
    switch (pr) {
      case 'immediate':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">Critical</span>;
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">Urgent</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-600">Routine</span>;
    }
  };

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Hospital Dashboard</span>
          </Link>
          <Button
            href="/hospital/referrals/new"
            variant="primary"
            size="sm"
            leftIcon={<PlusCircle size={15} />}
            className="shadow-primary"
          >
            New Referral
          </Button>
        </div>

        {/* Page Title */}
        <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-navy tracking-tight">
              Hospital Referral Records &amp; Patient Transitions
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Authorized audit log of post-discharge care requests, clinical bundle formulations, and provider assignments
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchReferrals}
            leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh Records
          </Button>
        </div>

        {/* Filters and Search Toolbar */}
        <div className="bg-white rounded-2xl border border-border p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by referral number, patient name, IPD number, or diagnosis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs rounded-xl bg-background border border-border text-navy focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted (Pending Triage)</option>
              <option value="triaged">Triaged</option>
              <option value="bundle_proposed">Care Bundle Proposed</option>
              <option value="matched">Providers Matched</option>
              <option value="approved">Approved &amp; Dispatched</option>
              <option value="in_progress">In-Home Care Active</option>
              <option value="completed">Completed Care</option>
              <option value="rejected">Declined</option>
            </select>

            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs rounded-xl bg-background border border-border text-navy focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Priorities</option>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent (24h)</option>
              <option value="immediate">Critical / Immediate</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchReferrals} className="text-xs font-bold underline hover:opacity-80">
              Retry
            </button>
          </div>
        )}

        {/* Referrals List Table / Cards */}
        <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center">
              <RefreshCw size={28} className="animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm font-semibold text-navy">Fetching Hospital Records...</p>
            </div>
          ) : referrals.length === 0 ? (
            <div className="py-20 text-center">
              <FileText size={40} className="text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-base font-bold text-navy">No Referrals Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                No matching referral requests found. Try adjusting search terms or status filters.
              </p>
              <Button href="/hospital/referrals/new" variant="primary" size="sm">
                Create New Referral
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background/80 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3.5 px-5">Referral No.</th>
                    <th className="py-3.5 px-5">Patient &amp; Discharge</th>
                    <th className="py-3.5 px-5">Clinical Diagnosis</th>
                    <th className="py-3.5 px-5">Requested Care &amp; DME</th>
                    <th className="py-3.5 px-5">Priority</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {referrals.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Referral Code */}
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-primary bg-primary-light px-2.5 py-1 rounded-md text-[11px]">
                          {r.referralNumber}
                        </span>
                        <span className="block text-[10px] text-muted-foreground mt-1">
                          {new Date(r.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Patient & Discharge Info */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-navy group-hover:text-primary transition-colors">
                          {r.patientName}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {r.patientAge}y • {r.patientGender} • {r.patientPhoneMasked}
                        </div>
                        <div className="text-[10px] text-muted-foreground/80 mt-0.5 flex items-center gap-1">
                          <MapPin size={10} className="text-primary" />
                          <span>Discharge: {r.dischargeDate || 'Immediate'}</span>
                        </div>
                      </td>

                      {/* Clinical Diagnosis */}
                      <td className="py-4 px-5 max-w-xs">
                        <p className="line-clamp-2 text-navy/90 font-medium">
                          {r.primaryDiagnosisSummary}
                        </p>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                          Dept: {r.referringStaff?.department || 'General'}
                        </span>
                      </td>

                      {/* Care & DME Badges */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-navy/80">
                            <HeartPulse size={12} className="text-secondary" />
                            {r.servicesCount} Service(s)
                          </span>
                          {r.equipmentList && r.equipmentList.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700">
                              <Package size={12} />
                              {r.equipmentList.length} Equipment Unit(s)
                            </span>
                          )}
                          {r.hasCareBundle && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit border border-indigo-200">
                              <Sparkles size={10} />
                              Care Bundle Formulated
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-5">
                        {getPriorityBadge(r.priority)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        {getStatusBadge(r.status)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/hospital/referrals/${r.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-navy hover:text-primary transition-colors bg-white hover:bg-background px-3 py-1.5 rounded-xl border border-border shadow-2xs"
                        >
                          <span>Manage</span>
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-background/50">
              <span>
                Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} records)
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-lg border border-border hover:bg-white disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-lg border border-border hover:bg-white disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

      </main>

      <Footer />
    </div>
  );
}
