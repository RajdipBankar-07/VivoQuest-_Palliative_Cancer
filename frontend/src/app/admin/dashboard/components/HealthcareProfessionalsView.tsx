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

  // Review credential modal state
  const [selectedCred, setSelectedCred] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'expired'>('approved');
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

  // Submit single credential review
  const handleReviewCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCred) return;

    setActionLoading(true);
    setError(null);
    try {
      await adminApi.reviewCredential(selectedCred._id, {
        status: reviewStatus,
        notes: reviewNotes.trim() || undefined,
        expiryDate: reviewExpiry || undefined,
      });
      setSuccessMsg(`Credential review submitted: ${reviewStatus.toUpperCase()}`);
      setSelectedCred(null);
      setReviewNotes('');
      setReviewExpiry('');
      await loadProfessionals(pagination.page);

      // Refresh currently open profile if any
      if (selectedProfile) {
        const updated = await adminApi.getHealthcareProfessionals({
          search: selectedProfile.user.email,
          limit: 1,
        });
        if (updated?.data?.length) {
          setSelectedProfile(updated.data[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit credential review');
    } finally {
      setActionLoading(false);
    }
  };

  // Compute counts for summary cards
  const doctorCount = professionals.filter((p) => p.user?.role === 'doctor').length;
  const nurseCount = professionals.filter((p) => p.user?.role === 'nurse').length;
  const caregiverCount = professionals.filter((p) => p.user?.role === 'caregiver').length;
  const fullyVerifiedCount = professionals.filter((p) => p.isFullyVerified).length;

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
                Manage doctors, nurses, and caregivers. Review professional qualifications, state medical council licenses, and certificates.
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
        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total in View</span>
            <Users size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-extrabold text-navy mt-1.5">{pagination.total}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Clinicians & care team members</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Palliative Doctors</span>
            <Stethoscope size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-navy mt-1.5">{doctorCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Specialists on current page</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Palliative Nurses</span>
            <HeartPulse size={16} className="text-teal-500" />
          </div>
          <p className="text-2xl font-extrabold text-navy mt-1.5">{nurseCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Registered nursing staff</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Trained Caregivers</span>
            <UserCheck size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-extrabold text-navy mt-1.5">{caregiverCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Home & hospice caregivers</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
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
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Credentials & Licenses</th>
                  <th className="py-3.5 px-4">Verification</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {professionals.map((item, idx) => {
                  const user = item.user;
                  const creds = item.credentials || [];
                  const isDoctor = user.role === 'doctor';
                  const isNurse = user.role === 'nurse';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                              isDoctor
                                ? 'bg-blue-100 text-blue-700'
                                : isNurse
                                ? 'bg-teal-100 text-teal-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {user.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'HP'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{user.fullName}</div>
                            <div className="text-[11px] text-slate-400">ID: {user._id.substring(user._id.length - 8)}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isDoctor
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : isNurse
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {isDoctor && <Stethoscope size={11} />}
                          {isNurse && <HeartPulse size={11} />}
                          {!isDoctor && !isNurse && <UserCheck size={11} />}
                          {user.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium flex items-center gap-1">
                          <Mail size={12} className="text-slate-400" />
                          <span>{user.email}</span>
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
                          onClick={() => handleToggleUserStatus(user._id, user.isActive)}
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
                              {creds.map((c: any) => c.degreeName || c.credentialType).join(', ')}
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-600 italic">No certificates submitted</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.isFullyVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck size={12} />
                            Fully Verified
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
                        <button
                          onClick={() => setSelectedProfile(item)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-navy hover:bg-navy-light text-white transition inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Eye size={12} />
                          Inspect & Verify
                        </button>
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-border animate-scale-up my-8">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                  <Stethoscope size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy">{selectedProfile.user.fullName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="capitalize text-xs font-semibold text-slate-600">
                      Role: {selectedProfile.user.role}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">{selectedProfile.user.email}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Profile Overview Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-border text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Phone</span>
                <span className="font-semibold text-slate-800">{selectedProfile.user.phone || 'Not provided'}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-border text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Status</span>
                <span className={`font-bold ${selectedProfile.user.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {selectedProfile.user.isActive ? 'Active (Permitted)' : 'Inactive (Suspended)'}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-border text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Credential Verification</span>
                <span className={`font-bold ${selectedProfile.isFullyVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {selectedProfile.isFullyVerified ? 'Fully Verified' : 'Pending Verification'}
                </span>
              </div>
            </div>

            {/* Credentials List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Submitted Degrees, Licenses & Certificates ({selectedProfile.credentials?.length || 0})
                </h4>
              </div>

              {(!selectedProfile.credentials || selectedProfile.credentials.length === 0) ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-border text-xs">
                  No professional credentials or certificates uploaded yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {selectedProfile.credentials.map((cred: any) => {
                    const isApproved = cred.verificationStatus === 'approved';
                    const isRejected = cred.verificationStatus === 'rejected';

                    return (
                      <div
                        key={cred._id}
                        className="bg-white rounded-2xl p-4 border border-border shadow-xs hover:border-slate-300 transition"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Award size={18} className="text-navy shrink-0" />
                            <span className="font-bold text-slate-900 text-sm">
                              {cred.degreeName || cred.credentialType}
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
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-navy text-white hover:bg-navy-light transition"
                            >
                              Review
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Council / Body</span>
                            <span className="font-medium text-slate-800">{cred.stateCouncil || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Registration #</span>
                            <span className="font-mono text-slate-800">{cred.registrationNumber || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Institution</span>
                            <span className="font-medium text-slate-800">{cred.universityOrInstitution || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Passing Year</span>
                            <span className="font-medium text-slate-800">{cred.passingYear || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Documents attached */}
                        {cred.documents && cred.documents.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                              Attached Certificates & Documents
                            </span>
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
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-end">
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
                    {selectedCred.degreeName || selectedCred.credentialType}
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
                  <option value="approved">Approved & Verified (Document Authentic)</option>
                  <option value="rejected">Rejected (Does Not Meet Verification Standards)</option>
                  <option value="expired">Expired (Requires Resubmission)</option>
                </select>
              </div>

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
                  Review & Verification Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record verification council portal reference number or reason for rejection..."
                  rows={3}
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
