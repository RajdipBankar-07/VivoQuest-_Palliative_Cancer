'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Calendar,
  AlertCircle,
  BadgeAlert,
  ChevronRight,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

interface DocumentExpiryAlertsViewProps {
  onNavigateToCredential?: (credId: string) => void;
  onRefresh?: () => void;
}

export function DocumentExpiryAlertsView({ onNavigateToCredential, onRefresh }: DocumentExpiryAlertsViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalAlerts: 0,
    expiredCount: 0,
    expiringSoonCount: 0,
  });

  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning'>('all');
  const [filterRole, setFilterRole] = useState('all');
  const [search, setSearch] = useState('');

  // Review modal state
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'expired'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDocumentExpiryAlerts();
      if (res) {
        setAlerts(res.alerts || []);
        setSummary(res.summary || { totalAlerts: 0, expiredCount: 0, expiringSoonCount: 0 });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load document expiry surveillance alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.reviewCredential(selectedAlert.credentialId, {
        status: reviewStatus,
        notes: reviewNotes.trim() || undefined,
        expiryDate: newExpiryDate || undefined,
      });
      setActionSuccess(`Credential for ${selectedAlert.professionalName} updated to '${reviewStatus}'`);
      setSelectedAlert(null);
      setReviewNotes('');
      setNewExpiryDate('');
      await loadAlerts();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to submit credential review');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity === 'critical' && alert.severity !== 'critical') return false;
    if (filterSeverity === 'warning' && alert.severity !== 'warning') return false;
    if (filterRole !== 'all' && alert.role?.toLowerCase() !== filterRole.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = alert.professionalName?.toLowerCase().includes(q);
      const matchDoc = alert.documentName?.toLowerCase().includes(q);
      const matchReg = alert.registrationNumber?.toLowerCase().includes(q);
      const matchAuth = alert.issuingAuthority?.toLowerCase().includes(q);
      if (!matchName && !matchDoc && !matchReg && !matchAuth) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy">Document Expiry & Surveillance Alerts</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Surveillance and compliance monitoring for professional licenses, medical councils, and caregiver certifications
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadAlerts}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Surveillance
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">
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

      {/* Surveillance Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <XCircle size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Critical: Expired</span>
            <p className="text-2xl font-extrabold text-navy mt-1">{summary.expiredCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Credentials expired and legally non-compliant</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Expiring Within 30 Days</span>
            <p className="text-2xl font-extrabold text-navy mt-1">{summary.expiringSoonCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Urgent renewal / re-verification required</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <BadgeAlert size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Active Alerts</span>
            <p className="text-2xl font-extrabold text-navy mt-1">{summary.totalAlerts}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Surveillance active across doctors, nurses & caregivers</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search professional, council, license #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-navy/20 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter size={14} />
            <span>Severity:</span>
          </div>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical (Expired)</option>
            <option value="warning">Warning (Expiring Soon)</option>
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctors</option>
            <option value="nurse">Nurses</option>
            <option value="caregiver">Caregivers</option>
          </select>
        </div>
      </div>

      {/* Alerts Table / List */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-navy" />
            <span>Running compliance & expiry surveillance scan...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <CheckCircle2 size={32} className="text-emerald-500" />
            <p className="font-semibold text-slate-700 text-sm">No Compliance Expiry Alerts Found</p>
            <p className="text-slate-400 max-w-sm">
              All active clinical credentials and licenses are currently within valid registration timeframes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Severity & Status</th>
                  <th className="py-3.5 px-4">Professional</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Credential / Certificate</th>
                  <th className="py-3.5 px-4">Registration #</th>
                  <th className="py-3.5 px-4">Expiry Timeline</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAlerts.map((item, idx) => {
                  const isCritical = item.severity === 'critical';
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCritical
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isCritical ? <XCircle size={12} /> : <AlertTriangle size={12} />}
                          {isCritical ? 'Critical (Expired)' : 'Warning (Expiring)'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.professionalName}</div>
                        <div className="text-[11px] text-slate-400">{item.email}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {item.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{item.documentName || item.credentialType}</div>
                        <div className="text-[11px] text-slate-500">{item.issuingAuthority || 'Medical Council / Board'}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {item.registrationNumber || item.certificateNumber || 'N/A'}
                      </td>

                      <td className="py-3 px-4">
                        <div className={`font-semibold ${isCritical ? 'text-rose-600' : 'text-amber-600'}`}>
                          {item.daysRemaining < 0
                            ? `Expired ${Math.abs(item.daysRemaining)} days ago`
                            : item.daysRemaining === 0
                            ? 'Expires Today'
                            : `Expires in ${item.daysRemaining} days`}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(item.expiryDate).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedAlert(item);
                            setReviewStatus(isCritical ? 'expired' : 'approved');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-navy hover:bg-navy-light text-white transition inline-flex items-center gap-1.5"
                        >
                          Review & Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Review Expiring/Expired Credential */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-border animate-scale-up">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy">Review Clinical Credential</h3>
                  <p className="text-xs text-slate-500">
                    Verify renewal documents and update credential compliance status
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Professional:</span>
                <span className="font-bold text-slate-900">{selectedAlert.professionalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-semibold text-slate-800 capitalize">{selectedAlert.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Document Type:</span>
                <span className="font-semibold text-slate-800">{selectedAlert.documentName || selectedAlert.credentialType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">License / Reg #:</span>
                <span className="font-mono text-slate-700">{selectedAlert.registrationNumber || selectedAlert.certificateNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Expiry:</span>
                <span className="font-semibold text-rose-600">
                  {new Date(selectedAlert.expiryDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
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
                  <option value="approved">Approved & Renewed (Renewal verified)</option>
                  <option value="expired">Expired (Deactivate clinical privileges)</option>
                  <option value="rejected">Rejected (Invalid or unverified document)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Expiry Date (If Renewed)
                </label>
                <input
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Audit & Review Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record council verification certificate number, verification date, or reason for suspension..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-white text-slate-800 focus:ring-2 focus:ring-navy/20 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
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
                  Confirm Credential Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
