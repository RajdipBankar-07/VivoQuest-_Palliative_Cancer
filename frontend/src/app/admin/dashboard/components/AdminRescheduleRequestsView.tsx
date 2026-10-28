'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  User,
  Stethoscope,
  ArrowRight,
  Shield,
  Check,
  X,
  AlertCircle,
  Phone,
  FileText,
  CalendarCheck2,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

interface RescheduleRequest {
  _id: string;
  id?: string;
  visitId: string;
  visitNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  providerId: string;
  providerName: string;
  providerRole?: string;
  providerPhone?: string;
  requestedBy: string;
  requesterRole: string;
  requesterName: string;
  originalSchedule: {
    scheduledDate: string;
    timeSlot: string;
  };
  requestedSchedule: {
    scheduledDate: string;
    timeSlot: string;
  };
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  rejectionReason?: string;
  resolvedBy?: string;
  resolverRole?: string;
  resolverName?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function AdminRescheduleRequestsView() {
  const [requests, setRequests] = useState<RescheduleRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selection & Bulk/Range Delete States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modal States
  const [approvingRequest, setApprovingRequest] = useState<RescheduleRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<RescheduleRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async (status = statusFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getRescheduleRequests(status);
      setRequests(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve reschedule requests from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(statusFilter);
    setCurrentPage(1);
  }, [statusFilter]);

  const handleApprove = async () => {
    if (!approvingRequest) return;
    setActionLoading(true);
    setError(null);
    try {
      const reqId = approvingRequest.id || approvingRequest._id;
      const res = await adminApi.approveRescheduleRequest(reqId);
      setSuccessMsg(`Reschedule approved for Visit #${approvingRequest.visitNumber}. New schedule has been synchronized across all platforms.`);
      setApprovingRequest(null);
      await fetchRequests(statusFilter);
    } catch (err: any) {
      setError(err.message || 'Failed to approve reschedule request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      setError('Please provide a meaningful rejection reason (at least 3 characters).');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const reqId = rejectingRequest.id || rejectingRequest._id;
      await adminApi.rejectRescheduleRequest(reqId, rejectionReason.trim());
      setSuccessMsg(`Reschedule request for Visit #${rejectingRequest.visitNumber} rejected. Original visit schedule remains confirmed.`);
      setRejectingRequest(null);
      setRejectionReason('');
      await fetchRequests(statusFilter);
    } catch (err: any) {
      setError(err.message || 'Failed to reject reschedule request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete single request
  const handleDeleteSingle = async (requestId: string, visitNumber: string) => {
    if (!window.confirm(`Permanently delete reschedule request for Visit #${visitNumber}? This will free up storage.`)) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminApi.deleteRescheduleRequest(requestId, true);
      setSuccessMsg(`Reschedule request for Visit #${visitNumber} permanently deleted.`);
      setSelectedIds((prev) => prev.filter((id) => id !== requestId));
      await fetchRequests(statusFilter);
    } catch (err: any) {
      setError(err.message || 'Failed to delete request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk delete selected requests
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedIds.length} selected reschedule request(s)? This will reclaim storage space.`)) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.bulkDeleteRescheduleRequests(selectedIds, true);
      setSuccessMsg(`Successfully deleted ${res.data?.deletedCount ?? selectedIds.length} reschedule request(s).`);
      setSelectedIds([]);
      await fetchRequests(statusFilter);
    } catch (err: any) {
      setError(err.message || 'Failed to bulk delete requests.');
    } finally {
      setActionLoading(false);
    }
  };

  // Clear all resolved requests (approved, rejected, cancelled)
  const handleClearResolved = async () => {
    const resolvedCount = requests.filter((r) => r.status !== 'pending').length;
    if (resolvedCount === 0) {
      setError('No resolved (approved/rejected/cancelled) requests to clear.');
      return;
    }
    if (!window.confirm(`Permanently purge all ${resolvedCount} resolved reschedule requests (approved, rejected, cancelled)? Only active pending requests will be kept.`)) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.clearResolvedRescheduleRequests(true);
      setSuccessMsg(`Successfully cleared ${res.data?.deletedCount ?? resolvedCount} resolved requests to free storage.`);
      setSelectedIds([]);
      await fetchRequests(statusFilter);
    } catch (err: any) {
      setError(err.message || 'Failed to clear resolved requests.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete requests in date range ("this time to this time")
  const handleDeleteDateRange = async () => {
    if (!startDateFilter || !endDateFilter) {
      setError('Please select both a start date and an end date.');
      return;
    }
    if (!window.confirm(`Permanently delete all non-pending reschedule requests between ${startDateFilter} and ${endDateFilter}?`)) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.deleteRescheduleRequestsByDateRange(startDateFilter, endDateFilter, true);
      setSuccessMsg(`Successfully deleted ${res.data?.deletedCount ?? 0} requests between ${startDateFilter} and ${endDateFilter}.`);
      setShowDateRangeModal(false);
      setSelectedIds([]);
      await fetchRequests(statusFilter);
    } catch (err: any) {
      setError(err.message || 'Failed to delete requests by date range.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter requests locally by search query
  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.patientName?.toLowerCase().includes(q) ||
      r.patientPhone?.includes(q) ||
      r.visitNumber?.toLowerCase().includes(q) ||
      r.providerName?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Calculate quick metrics
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-100 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Visit Reschedule Requests &amp; Clinical Dispatch Governance</h2>
          </div>
          <p className="text-sm text-slate-500">
            Review, authorize, or reject visit reschedule requests. Approved schedules synchronize authoritatively across Patient, Caregiver, and Dispatch operations.
          </p>
        </div>

        <button
          onClick={() => fetchRequests(statusFilter)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          Refresh Requests
        </button>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === 'pending'
              ? 'bg-gradient-to-br from-amber-50 to-white border-amber-300 shadow-sm ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Care Review</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{pendingCount}</div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Awaiting operational decision</p>
        </div>

        <div
          onClick={() => { setStatusFilter('approved'); setCurrentPage(1); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === 'approved'
              ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-300 shadow-sm ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Approved &amp; Synced</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shadow-xs">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{approvedCount}</div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Confirmed &amp; rescheduled</p>
        </div>

        <div
          onClick={() => { setStatusFilter('rejected'); setCurrentPage(1); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === 'rejected'
              ? 'bg-gradient-to-br from-rose-50 to-white border-rose-300 shadow-sm ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200/90 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Rejected Requests</span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shadow-xs">
              <CalendarX2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{rejectedCount}</div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Original schedule kept</p>
        </div>

        <div
          onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === 'all'
              ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-300 shadow-sm ring-2 ring-indigo-400/20'
              : 'bg-white border-slate-200/90 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">All Requests</span>
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{requests.length}</div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Total platform volume</p>
        </div>
      </div>

      {/* Filter, Search, and Storage Pruning Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {[
              { id: 'pending', label: 'Pending Review' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'cancelled', label: 'Cancelled' },
              { id: 'all', label: 'All Requests' },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Field */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, visit #, or nurse..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Storage Management & Selection Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs">
          {/* Selection Control */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 font-semibold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={paginatedRequests.length > 0 && paginatedRequests.every((r) => selectedIds.includes(r._id || r.id || ''))}
                onChange={(e) => {
                  const pageIds = paginatedRequests.map((r) => r._id || r.id || '').filter(Boolean);
                  if (e.target.checked) {
                    setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
                  } else {
                    setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                  }
                }}
                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <span>Select All on Page</span>
            </label>
            {selectedIds.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px]">
                {selectedIds.length} selected
              </span>
            )}
          </div>

          {/* Delete & Pruning Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition disabled:opacity-50"
                title="Permanently delete selected requests to free storage"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClearResolved}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition disabled:opacity-50"
              title="Permanently remove all approved, rejected, and cancelled requests"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Resolved ({requests.filter((r) => r.status !== 'pending').length})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDateRangeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
              title="Delete non-pending requests between specific dates"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Delete by Date Range...</span>
            </button>
          </div>
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
          <p className="text-sm font-medium">Loading reschedule requests from clinical operations...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Reschedule Requests Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? `No requests match "${searchQuery}". Try clearing your search.`
              : `There are currently no ${statusFilter !== 'all' ? statusFilter : ''} rescheduling requests in the system.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {paginatedRequests.map((req, idx) => {
            const reqId = req.id || req._id || `resched-${(currentPage - 1) * pageSize + idx}`;
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';
            const isRejected = req.status === 'rejected';
            const isCancelled = req.status === 'cancelled';

            return (
              <div
                key={reqId}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-4"
              >
                {/* Header Row: Visit & Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(req._id || req.id || '')}
                      onChange={(e) => {
                        const id = req._id || req.id || '';
                        if (e.target.checked) {
                          setSelectedIds((prev) => [...prev, id]);
                        } else {
                          setSelectedIds((prev) => prev.filter((x) => x !== id));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-mono text-xs font-bold rounded-md">
                      Visit #{req.visitNumber}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ID: {req.visitId}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      Requested on: {new Date(req.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                        <Clock className="w-3 h-3" /> Pending Review
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Approved & Rescheduled
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                        <XCircle className="w-3 h-3" /> Rejected
                      </span>
                    )}
                    {isCancelled && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                        Cancelled by Patient
                      </span>
                    )}

                    {/* Specific Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteSingle(req._id || req.id || '', req.visitNumber)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                      title="Permanently delete this request record to reclaim storage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Patient & Caregiver Info Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Patient Details */}
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient (Requester)</div>
                      <div className="text-sm font-bold text-slate-900">{req.patientName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> +91 {req.patientPhone}
                      </div>
                    </div>
                  </div>

                  {/* Caregiver Details */}
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-teal-700 shrink-0">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Caregiver / Nurse</div>
                      <div className="text-sm font-bold text-slate-900">{req.providerName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <span className="capitalize">{req.providerRole || 'Clinical Caregiver'}</span>
                        {req.providerPhone && ` • Tel: +91 ${req.providerPhone}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule Comparison Box */}
                <div className="p-3.5 bg-gradient-to-r from-slate-50 to-teal-50/40 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-1 w-full sm:w-auto">
                    <span className="text-xs font-semibold text-slate-500">Current Confirmed Schedule:</span>
                    <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{req.originalSchedule.scheduledDate}</span>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-xs font-mono">
                        {req.originalSchedule.timeSlot}
                      </span>
                    </div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-teal-600 shrink-0 hidden sm:block" />

                  <div className="space-y-1 w-full sm:w-auto">
                    <span className="text-xs font-bold text-teal-700">Requested Reschedule Slot:</span>
                    <div className="text-sm font-bold text-teal-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      <span>{req.requestedSchedule.scheduledDate}</span>
                      <span className="px-2 py-0.5 bg-teal-600 text-white rounded text-xs font-mono shadow-sm">
                        {req.requestedSchedule.timeSlot}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stated Reason */}
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs">
                  <span className="font-bold text-amber-900">Patient's Reason:</span>{' '}
                  <span className="text-amber-800 italic">"{req.reason}"</span>
                </div>

                {/* Decision / Resolution Section */}
                {(isApproved || isRejected) && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      isApproved ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50/80 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="font-bold mb-1">
                      {isApproved ? '✓ Decision: Approved & Synchronized' : '✕ Decision: Request Rejected'}
                    </div>
                    <div>
                      Resolved by: <span className="font-semibold">{req.resolverName || 'Admin Desk'}</span> (
                      {req.resolverRole || 'Operational Governance'}) on{' '}
                      {req.resolvedAt
                        ? new Date(req.resolvedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recorded in audit log'}
                    </div>
                    {isRejected && req.rejectionReason && (
                      <div className="mt-1 text-rose-800">
                        <span className="font-bold">Rejection Reason:</span> "{req.rejectionReason}"
                      </div>
                    )}
                  </div>
                )}

                {/* Actions for Pending Requests */}
                {isPending && (
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setRejectingRequest(req);
                        setRejectionReason('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition"
                    >
                      <X className="w-3.5 h-3.5" /> Reject Request
                    </button>

                    <button
                      onClick={() => setApprovingRequest(req)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve New Schedule
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Universal 10-Item Pagination Controls */}
      {!isLoading && filteredRequests.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-900 font-bold">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-900 font-bold">{Math.min(currentPage * pageSize, filteredRequests.length)}</strong> of{' '}
            <strong className="text-slate-900 font-bold">{filteredRequests.length}</strong> reschedule requests
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
              10 per page
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 shadow-2xs"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                      currentPage === pg
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 shadow-2xs"
                title="Next page"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: APPROVE CONFIRMATION ================= */}
      {approvingRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Confirm Reschedule Approval</h3>
              <button
                onClick={() => setApprovingRequest(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              You are about to authorize the reschedule request for{' '}
              <span className="font-bold text-slate-900">{approvingRequest.patientName}</span> (Visit #{approvingRequest.visitNumber}).
            </p>

            <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 space-y-2 text-xs">
              <div className="text-slate-500">
                Original:{' '}
                <span className="font-semibold text-slate-800">
                  {approvingRequest.originalSchedule.scheduledDate} ({approvingRequest.originalSchedule.timeSlot})
                </span>
              </div>
              <div className="text-teal-900 font-bold">
                New Confirmed Schedule:{' '}
                <span>
                  {approvingRequest.requestedSchedule.scheduledDate} ({approvingRequest.requestedSchedule.timeSlot})
                </span>
              </div>
              <div className="text-slate-500">
                Assigned Caregiver:{' '}
                <span className="font-semibold text-slate-800">{approvingRequest.providerName}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              ⚡ The authoritative visit schedule will be updated immediately. Patient and Caregiver will receive real-time notifications.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setApprovingRequest(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Update Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REJECT CONFIRMATION ================= */}
      {rejectingRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Reject Reschedule Request</h3>
              <button
                onClick={() => setRejectingRequest(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Rejecting request for <span className="font-bold text-slate-900">{rejectingRequest.patientName}</span> (Visit #{rejectingRequest.visitNumber}).
              The original visit schedule ({rejectingRequest.originalSchedule.scheduledDate}, {rejectingRequest.originalSchedule.timeSlot}) will remain confirmed.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Caregiver has conflicting acute emergency clinical duty on the requested day..."
                rows={3}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
              <p className="text-[11px] text-slate-400">
                This reason will be recorded in audit logs and sent directly to the patient via in-app notification.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingRequest(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition disabled:opacity-50"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Date Range Purge Modal ("This time to this time") */}
      {showDateRangeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Requests by Date Range</h3>
                  <p className="text-xs text-slate-500">Permanently delete requests created within this time window</p>
                </div>
              </div>
              <button
                onClick={() => setShowDateRangeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  From Date (Start) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  To Date (End) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Storage Reclaim Notice</span>
                </div>
                <p>
                  This will permanently delete resolved (approved, rejected, cancelled) requests created between these dates. Active pending requests are protected and will be preserved.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDateRangeModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDateRange}
                disabled={actionLoading || !startDateFilter || !endDateFilter}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition disabled:opacity-50"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete in Date Range</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
