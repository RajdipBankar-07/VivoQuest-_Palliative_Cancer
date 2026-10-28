'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Stethoscope,
  HeartPulse,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Calendar,
  AlertCircle,
  Award,
  BookOpen,
  ChevronRight,
  Eye,
  ShieldAlert,
  Phone,
  Mail,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

export function HealthcareProfessionalsView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [professionals, setProfessionals] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  const [roleFilter, setRoleFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Selected professional modal
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [profileDetailLoading, setProfileDetailLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'credentials' | 'assignments' | 'audit'>('overview');

  // Review credential modal state
  const [selectedCred, setSelectedCred] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'expired'>('approved');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewExpiry, setReviewExpiry] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadProfessionals = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getHealthcareProfessionals({
        professionType: roleFilter === 'all' ? undefined : roleFilter,
        verificationStatus: verificationFilter === 'all' ? undefined : verificationFilter,
        search: search.trim() || undefined,
        page,
        limit: 10,
      });
      if (res) {
        setProfessionals(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load healthcare professionals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfessionals(1);
  }, [roleFilter, verificationFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProfessionals(1);
  };

  // Open full professional inspection modal with enriched data
  const handleOpenProfileDetail = async (item: any) => {
    setSelectedProfile(item);
    setActiveModalTab('overview');
    setProfileDetailLoading(true);
    try {
      const profId = item.profile?._id || item.user?._id || item.user?.id || item._id;
      if (profId) {
        const res = await adminApi.getHealthcareProfessionalById(profId);
        if (res?.data) {
          setSelectedProfile((prev: any) => ({
            ...prev,
            ...res.data,
            profile: res.data.profile || prev?.profile || {},
            user: (res.data.profile?.userId && typeof res.data.profile.userId === 'object') ? res.data.profile.userId : (prev?.user || {}),
            credentials: res.data.credentials || prev?.credentials || [],
            completion: res.data.completion || null,
            assignments: res.data.assignments || null,
            auditLogs: res.data.auditLogs || res.data.profile?.auditTrail || [],
          }));
        }
      }
    } catch (err: any) {
      console.warn('Could not load enriched details for professional, using base view', err);
    } finally {
      setProfileDetailLoading(false);
    }
  };

  // Toggle user active
  const handleToggleUserStatus = async (userId: string, currentActive: boolean) => {
    setActionLoading(true);
    try {
      await adminApi.updateUserStatus(userId, currentActive ? 'suspended' : 'active');
      setSuccessMsg(`Professional account status updated`);
      await loadProfessionals(pagination.page);
    } catch (err: any) {
      setError(err.message || 'Failed to update professional account status');
    } finally {
      setActionLoading(false);
    }
  };

  // Permanently delete healthcare professional
  const handleDeleteProfessional = async (userId: string, userName: string, role: string) => {
    if (!window.confirm(`Permanently delete healthcare staff account for "${userName}" (${role})? This will permanently remove the professional from MongoDB to reclaim storage space. This action cannot be undone.`)) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.deleteUser(userId);
      setSuccessMsg(res.message || `Professional '${userName}' permanently deleted.`);
      if (selectedProfile && (selectedProfile.user?._id === userId || selectedProfile.user?.id === userId)) {
        setSelectedProfile(null);
      }
      await loadProfessionals(pagination.page);
    } catch (err: any) {
      setError(err.message || 'Failed to delete professional account');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit credential review with mandatory rejection reason enforcement
  const handleReviewCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCred) return;

    if (reviewStatus === 'rejected' && !rejectionReason.trim()) {
      setError('A specific rejection reason is mandatory when rejecting a professional credential.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const profId = selectedProfile?.profile?._id || selectedProfile?.user?._id || selectedProfile?.user?.id || selectedProfile?._id;
      
      await adminApi.reviewProfessionalCredential(profId, selectedCred._id, {
        status: reviewStatus === 'expired' ? 'rejected' : reviewStatus,
        rejectionReason: reviewStatus === 'rejected' ? rejectionReason.trim() : undefined,
        reviewNotes: reviewNotes.trim() || undefined,
      });

      setSuccessMsg(`Credential review submitted: ${reviewStatus.toUpperCase()}`);
      setSelectedCred(null);
      setRejectionReason('');
      setReviewNotes('');
      setReviewExpiry('');
      await loadProfessionals(pagination.page);

      // Refresh currently open profile inspector
      if (profId) {
        const refreshed = await adminApi.getHealthcareProfessionalById(profId);
        if (refreshed?.data) {
          setSelectedProfile((prev: any) => ({
            ...prev,
            ...refreshed.data,
            profile: refreshed.data.profile || prev?.profile,
            user: (refreshed.data.profile?.userId && typeof refreshed.data.profile.userId === 'object') ? refreshed.data.profile.userId : (prev?.user || {}),
            credentials: refreshed.data.credentials || prev?.credentials || [],
            completion: refreshed.data.completion || null,
            assignments: refreshed.data.assignments || null,
            auditLogs: refreshed.data.auditLogs || refreshed.data.profile?.auditTrail || [],
          }));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit credential review');
    } finally {
      setActionLoading(false);
    }
  };

  // Compute counts for summary cards
  const doctorCount = professionals.filter((p) => p.user?.role === 'doctor' || p.professionType === 'doctor' || p.professionType === 'physician').length;
  const nurseCount = professionals.filter((p) => p.user?.role === 'nurse' || p.professionType === 'nurse').length;
  const caregiverCount = professionals.filter((p) => p.user?.role === 'caregiver' || p.professionType === 'caregiver').length;
  const anmCount = professionals.filter((p) => p.user?.role === 'anm' || p.professionType === 'anm').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
              <Stethoscope size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy">Healthcare Professionals Directory</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage doctors, nurses, caregivers, and ANMs/NRAs. Review verified qualifications, medical council licenses, and credentials.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => loadProfessionals(pagination.page)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Directory
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total in View</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600 shadow-2xs">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">{pagination.total}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Clinicians &amp; care team members</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50/70 to-white rounded-2xl p-4 border border-blue-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Palliative Doctors</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shadow-2xs">
              <Stethoscope size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">{doctorCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Specialists on current page</p>
        </div>

        <div className="bg-gradient-to-br from-teal-50/70 to-white rounded-2xl p-4 border border-teal-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Palliative Nurses</span>
            <div className="p-2 rounded-xl bg-teal-100 text-teal-700 shadow-2xs">
              <HeartPulse size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">{nurseCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Registered nursing staff</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50/70 to-white rounded-2xl p-4 border border-purple-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Caregivers &amp; ANMs</span>
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700 shadow-2xs">
              <UserCheck size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">{caregiverCount + anmCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Caregivers ({caregiverCount}) + ANM ({anmCount})</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, qualification, skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-navy/20 focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter size={14} />
            <span>Role:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctors</option>
            <option value="nurse">Nurses</option>
            <option value="caregiver">Caregivers</option>
            <option value="anm">ANMs / NRAs</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
            <span>Verification:</span>
          </div>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Fully Verified</option>
            <option value="pending">Pending Documents</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Professionals Directory Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-navy" />
            <span>Loading healthcare professionals directory...</span>
          </div>
        ) : professionals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <Users size={32} className="text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">No Professionals Found</p>
            <p className="text-slate-400 max-w-sm">
              No clinical profiles match the selected role or verification filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Professional</th>
                  <th className="py-3.5 px-4">Role &amp; Qualifications</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Credentials &amp; Certificates</th>
                  <th className="py-3.5 px-4">Verification</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {professionals.map((item, idx) => {
                  const user = item.user || {};
                  const prof = item.profile || item;
                  const creds = item.credentials || prof.credentials || [];
                  const isDoctor = user.role === 'doctor' || item.professionType === 'doctor' || item.professionType === 'physician';
                  const isNurse = user.role === 'nurse' || item.professionType === 'nurse';
                  const isANM = user.role === 'anm' || item.professionType === 'anm';

                  const qualificationText = prof.highestQualification || (prof.specialization ? (Array.isArray(prof.specialization) ? prof.specialization.join(', ') : prof.specialization) : null);

                  return (
                    <tr key={user?._id || user?.id || item._id || `hp-${idx}`} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                              isDoctor
                                ? 'bg-blue-100 text-blue-700'
                                : isNurse
                                ? 'bg-teal-100 text-teal-700'
                                : isANM
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'HP'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{user?.fullName || 'Healthcare Professional'}</div>
                            <div className="text-[11px] text-slate-400">ID: {(user?._id?.toString() || user?.id || item._id || '').slice(-8)}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isDoctor
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : isNurse
                                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                : isANM
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {isDoctor && <Stethoscope size={11} />}
                            {isNurse && <HeartPulse size={11} />}
                            {isANM && <ShieldCheck size={11} />}
                            {!isDoctor && !isNurse && !isANM && <UserCheck size={11} />}
                            {user.role || item.professionType || 'Professional'}
                          </span>
                          {qualificationText && (
                            <span className="text-[11px] font-medium text-slate-600 truncate max-w-xs">
                              {qualificationText}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium flex items-center gap-1">
                          <Mail size={12} className="text-slate-400" />
                          <span>{user.email || 'No email'}</span>
                        </div>
                        {user.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone size={11} className="text-slate-400" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleUserStatus(user._id || user.id, user.isActive)}
                          className="flex items-center gap-1.5 text-xs font-semibold group"
                          title="Click to toggle account access"
                        >
                          {user.isActive ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 size={12} />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <XCircle size={12} />
                              Inactive
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold text-slate-800">
                            {creds.length} {creds.length === 1 ? 'Credential' : 'Credentials'} Recorded
                          </span>
                          {creds.length > 0 ? (
                            <span className="text-[11px] text-slate-500 truncate max-w-xs">
                              {creds.map((c: any) => c.certificateTitle || c.degreeName || c.credentialType).join(', ')}
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-600 italic">No certificates submitted</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.isFullyVerified || prof.verificationStatus === 'verified' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck size={12} />
                            Fully Verified
                          </span>
                        ) : prof.verificationStatus === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle size={12} />
                            Rejected
                          </span>
                        ) : creds.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={12} />
                            Pending Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Unverified
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenProfileDetail(item)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-navy hover:bg-navy-light text-white transition inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <Eye size={12} />
                            Inspect &amp; Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProfessional(user._id || user.id, user.fullName, user.role)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                            title="Permanently delete staff account from database"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total professionals)
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadProfessionals(pagination.page - 1)}
                className="px-3 py-1 rounded-lg border border-border disabled:opacity-40 hover:bg-slate-50 transition"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadProfessionals(pagination.page + 1)}
                className="px-3 py-1 rounded-lg border border-border disabled:opacity-40 hover:bg-slate-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Full Professional Profile & Credentials Inspection */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-border animate-scale-up my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                  <Stethoscope size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-navy">{selectedProfile.user?.fullName || 'Healthcare Professional'}</h3>
                    {profileDetailLoading && (
                      <RefreshCw size={14} className="animate-spin text-teal-600" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span className="capitalize font-semibold text-slate-700">
                      Role: {selectedProfile.user?.role || selectedProfile.professionType}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>{selectedProfile.user?.email}</span>
                    {selectedProfile.user?.phone && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>{selectedProfile.user.phone}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Profile Completion Meter */}
            {selectedProfile.completion && (
              <div className="my-3 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-teal-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Profile Completion: {selectedProfile.completion.completionPercentage || 0}%
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedProfile.completion.isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedProfile.completion.isComplete ? 'Profile Complete' : 'Incomplete'}
                  </span>
                </div>
                {selectedProfile.completion.missingFields?.length > 0 && (
                  <div className="text-[11px] text-slate-500">
                    Missing: {selectedProfile.completion.missingFields.slice(0, 3).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-border mt-1 shrink-0">
              <button
                onClick={() => setActiveModalTab('overview')}
                className={`px-4 py-2 text-xs font-bold transition border-b-2 ${
                  activeModalTab === 'overview'
                    ? 'border-navy text-navy'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Profile &amp; Qualifications
              </button>
              <button
                onClick={() => setActiveModalTab('credentials')}
                className={`px-4 py-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                  activeModalTab === 'credentials'
                    ? 'border-navy text-navy'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Credentials &amp; Certificates
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                  {selectedProfile.credentials?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setActiveModalTab('assignments')}
                className={`px-4 py-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                  activeModalTab === 'assignments'
                    ? 'border-navy text-navy'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Field Workload
              </button>
              <button
                onClick={() => setActiveModalTab('audit')}
                className={`px-4 py-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                  activeModalTab === 'audit'
                    ? 'border-navy text-navy'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Audit History
              </button>
            </div>

            {/* Tab Contents: Scrollable Area */}
            <div className="overflow-y-auto flex-1 py-4 pr-1 space-y-4">
              {activeModalTab === 'overview' && (
                <div className="space-y-4">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-border text-xs">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Verification Status</span>
                      <span className={`font-bold inline-flex items-center gap-1 mt-0.5 ${
                        (selectedProfile.profile?.verificationStatus === 'verified' || selectedProfile.isFullyVerified)
                          ? 'text-emerald-600'
                          : selectedProfile.profile?.verificationStatus === 'rejected'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }`}>
                        {selectedProfile.profile?.verificationStatus || (selectedProfile.isFullyVerified ? 'verified' : 'pending_review')}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-border text-xs">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Years Experience</span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                        {selectedProfile.profile?.experienceYears ?? selectedProfile.experienceYears ?? 0} Years
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-border text-xs">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Council Registration</span>
                      <span className="font-mono text-slate-800 text-xs mt-0.5 block truncate">
                        {selectedProfile.profile?.registrationNumber || 'Not submitted'}
                      </span>
                    </div>
                  </div>

                  {/* Academic & Degree Qualifications */}
                  <div className="bg-white rounded-2xl p-4 border border-border space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen size={14} className="text-navy" />
                      Academic Qualifications &amp; Institution
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Highest Qualification</span>
                        <span className="font-semibold text-slate-900">
                          {selectedProfile.profile?.highestQualification || 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Institution / University</span>
                        <span className="font-semibold text-slate-900">
                          {selectedProfile.profile?.institution || 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">State Registration Council</span>
                        <span className="font-semibold text-slate-900">
                          {selectedProfile.profile?.registrationCouncil || 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Specialization Area</span>
                        <span className="font-semibold text-slate-900">
                          {Array.isArray(selectedProfile.profile?.specialization)
                            ? selectedProfile.profile.specialization.join(', ')
                            : (selectedProfile.profile?.specialization || 'General')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Skills & Experience Summary */}
                  <div className="bg-white rounded-2xl p-4 border border-border space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Clinical Skills &amp; Competencies
                    </h4>
                    {selectedProfile.profile?.skills && selectedProfile.profile.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProfile.profile.skills.map((skill: string, sIdx: number) => (
                          <span
                            key={sIdx}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No specific skills tagged yet.</p>
                    )}

                    {selectedProfile.profile?.experienceSummary && (
                      <div className="pt-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                          Experience Summary
                        </span>
                        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                          {selectedProfile.profile.experienceSummary}
                        </p>
                      </div>
                    )}

                    {selectedProfile.profile?.bio && (
                      <div className="pt-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                          Professional Bio
                        </span>
                        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                          {selectedProfile.profile.bio}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeModalTab === 'credentials' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Submitted Certificates, Licenses &amp; Documents ({selectedProfile.credentials?.length || 0})
                    </h4>
                  </div>

                  {(!selectedProfile.credentials || selectedProfile.credentials.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-border text-xs">
                      No professional credentials or certificates uploaded yet.
                    </div>
                  ) : (
                    selectedProfile.credentials.map((cred: any) => {
                      const isApproved = cred.verificationStatus === 'approved' || cred.verificationStatus === 'verified';
                      const isRejected = cred.verificationStatus === 'rejected';

                      return (
                        <div
                          key={cred._id}
                          className="bg-white rounded-2xl p-4 border border-border shadow-xs hover:border-slate-300 transition space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div className="flex items-center gap-2">
                              <Award size={18} className="text-navy shrink-0" />
                              <span className="font-bold text-slate-900 text-sm">
                                {cred.certificateTitle || cred.degreeName || cred.credentialType}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isApproved
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : isRejected
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {cred.verificationStatus}
                              </span>

                              <button
                                onClick={() => {
                                  setSelectedCred(cred);
                                  setReviewStatus(isApproved ? 'approved' : 'approved');
                                  setRejectionReason(cred.rejectionReason || '');
                                  setReviewNotes(cred.reviewNotes || '');
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-navy text-white hover:bg-navy-light transition shadow-2xs"
                              >
                                Review Decision
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase font-semibold">Issuing Body / Org</span>
                              <span className="font-medium text-slate-800">{cred.issuingOrganization || cred.stateCouncil || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase font-semibold">Doc / License #</span>
                              <span className="font-mono text-slate-800">{cred.documentNumber || cred.registrationNumber || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase font-semibold">Category</span>
                              <span className="font-medium text-slate-800">{cred.credentialCategory || cred.credentialType || 'General'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase font-semibold">Expiry Date</span>
                              <span className="font-medium text-slate-800">
                                {cred.expiryDate ? new Date(cred.expiryDate).toLocaleDateString() : 'Lifetime / None'}
                              </span>
                            </div>
                          </div>

                          {/* Rejection Banner if rejected */}
                          {isRejected && (cred.rejectionReason || cred.reviewNotes) && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                              <span className="font-bold block mb-0.5">Rejection Reason:</span>
                              <p>{cred.rejectionReason || cred.reviewNotes}</p>
                            </div>
                          )}

                          {/* Documents attached */}
                          {((cred.documents && cred.documents.length > 0) || cred.uploadedFileId) && (
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Stored Document (RESTRICTED_VERIFICATION_ONLY)
                              </span>
                              {cred.documents && cred.documents.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {cred.documents.map((doc: any, dIdx: number) => (
                                    <a
                                      key={dIdx}
                                      href={doc.documentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition"
                                    >
                                      <FileCheck size={12} className="text-teal-600" />
                                      <span>{doc.documentName || doc.documentType}</span>
                                      <ExternalLink size={10} className="text-slate-400" />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 font-mono">
                                  File ID: {cred.uploadedFileId?.toString() || 'Attached'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeModalTab === 'assignments' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-border">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Patient Visits</span>
                      <span className="text-2xl font-extrabold text-navy mt-1 block">
                        {selectedProfile.assignments?.totalVisits ?? 0}
                      </span>
                    </div>
                    <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80">
                      <span className="text-emerald-700 block text-[10px] uppercase font-bold">Completed Visits</span>
                      <span className="text-2xl font-extrabold text-emerald-800 mt-1 block">
                        {selectedProfile.assignments?.completedVisits ?? 0}
                      </span>
                    </div>
                    <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80">
                      <span className="text-blue-700 block text-[10px] uppercase font-bold">Active Subscriptions</span>
                      <span className="text-2xl font-extrabold text-blue-800 mt-1 block">
                        {selectedProfile.assignments?.activeSubscriptions ?? 0}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    Patient assignments and hospice visits are dynamically allocated based on verified qualifications, geographical proximity, and active operational status.
                  </p>
                </div>
              )}

              {activeModalTab === 'audit' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Profile Verification &amp; Change Audit History
                  </h4>
                  {(!selectedProfile.auditLogs || selectedProfile.auditLogs.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-border text-xs">
                      No audit history entries recorded for this profile yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedProfile.auditLogs.map((log: any, lIdx: number) => (
                        <div key={lIdx} className="p-3 rounded-xl bg-slate-50 border border-border text-xs flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-navy uppercase tracking-wide">
                              {log.action || log.event || 'Audit Event'}
                            </span>
                            <span className="text-slate-400">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            {log.details || log.notes || log.reason || JSON.stringify(log.metadata || '')}
                          </p>
                          {log.actorId && (
                            <span className="text-[10px] text-slate-400">
                              By Actor: {log.actorId.toString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() =>
                  handleDeleteProfessional(
                    selectedProfile.user?._id || selectedProfile.user?.id,
                    selectedProfile.user?.fullName || 'Professional',
                    selectedProfile.user?.role || selectedProfile.professionType
                  )
                }
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition inline-flex items-center gap-1.5"
                title="Permanently delete professional account from database"
              >
                <Trash2 size={13} />
                <span>Delete Account Permanently</span>
              </button>
              <button
                onClick={() => setSelectedProfile(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Review Specific Credential */}
      {selectedCred && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-border animate-scale-up">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy">Review Credential</h3>
                  <p className="text-xs text-slate-500">
                    {selectedCred.certificateTitle || selectedCred.degreeName || selectedCred.credentialType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCred(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleReviewCredentialSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Verification Decision
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                  required
                >
                  <option value="approved">Approved &amp; Verified (Authentic Credential)</option>
                  <option value="rejected">Rejected (Does Not Meet Standards / Unauthentic)</option>
                  <option value="expired">Expired (Requires Resubmission)</option>
                </select>
              </div>

              {/* Mandatory Rejection Reason when Rejected */}
              {reviewStatus === 'rejected' && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-1">
                    Rejection Reason (Mandatory)*
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Clearly explain reason for rejection (e.g. illegible scan, council registration expired, degree not recognized)..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-rose-300 text-xs bg-white text-rose-900 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-rose-600 mt-1 block">
                    This reason will be displayed directly to the healthcare professional in their mobile app.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  License Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={reviewExpiry}
                  onChange={(e) => setReviewExpiry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Internal Review &amp; Verification Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record council portal verification ID, checker reference, or internal observations..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedCred(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-navy hover:bg-navy-light transition disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Save Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
