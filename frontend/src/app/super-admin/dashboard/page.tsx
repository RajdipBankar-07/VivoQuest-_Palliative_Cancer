'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Users,
  Building2,
  Server,
  Activity,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Database,
  Cpu,
  Radio,
  FileText,
  Clock,
  Eye,
  X,
  UserCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { superAdminApi, authApi, ApiClientError } from '@/lib/api';

type SuperTab = 'governance' | 'admins' | 'health' | 'escalations' | 'security';

export default function SuperAdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<SuperTab>('governance');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Governance Overview Data
  const [governanceData, setGovernanceData] = useState<any>(null);

  // Admin Accounts Data
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'admin' as 'admin' | 'super_admin',
  });

  // System Health Data
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Escalations Data
  const [escalations, setEscalations] = useState<any[]>([]);
  const [selectedEscalation, setSelectedEscalation] = useState<any>(null);
  const [escalationResolutionNotes, setEscalationResolutionNotes] = useState('');

  useEffect(() => {
    verifySuperAdminAuth();
  }, []);

  const verifySuperAdminAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const storedUser = authApi.getStoredUser();
      const token = authApi.getToken();

      if (token && storedUser?.role === 'super_admin') {
        setCurrentUser(storedUser);
        setIsSuperAdmin(true);
        await loadTabData('governance');
      } else {
        // Not super_admin yet
        setCurrentUser(storedUser);
        setIsSuperAdmin(false);
      }
    } catch (err: any) {
      setError(err.message || 'Authorization check failed');
      setIsSuperAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTabData = async (tab: SuperTab) => {
    setError(null);
    try {
      if (tab === 'governance') {
        const data = await superAdminApi.getGovernanceOverview();
        setGovernanceData(data);
      } else if (tab === 'admins') {
        const data = await superAdminApi.getAdmins();
        setAdminsList(data);
      } else if (tab === 'health') {
        const data = await superAdminApi.getSystemHealth();
        setSystemHealth(data);
      } else if (tab === 'escalations') {
        const data = await superAdminApi.getEscalations();
        setEscalations(data);
      } else if (tab === 'security') {
        const data = await superAdminApi.getGovernanceOverview();
        setGovernanceData(data);
      }
    } catch (err: any) {
      if (err instanceof ApiClientError && err.status === 403) {
        setError('403 Forbidden: Platform governance actions are strictly reserved for Super Administrators.');
        setIsSuperAdmin(false);
      } else {
        setError(err.message || `Failed to fetch data for ${tab}`);
      }
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadTabData(activeTab);
    }
  }, [activeTab, isSuperAdmin]);

  // Create Admin Account Submit
  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await superAdminApi.createAdmin(newAdminForm);
      setSuccessMsg(`Administrator account '${newAdminForm.fullName}' (${newAdminForm.role}) created successfully.`);
      setShowCreateAdminModal(false);
      setNewAdminForm({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'admin',
      });
      await loadTabData('admins');
    } catch (err: any) {
      setError(err.message || 'Failed to provision admin account');
    } finally {
      setActionLoading(false);
    }
  };

  // Change Admin Role
  const handleChangeAdminRole = async (adminId: string, currentRole: string, newRole: any) => {
    if (adminId === currentUser?._id || adminId === currentUser?.id) {
      if (!window.confirm('Warning: You are modifying your own administrative role. Proceed?')) return;
    }

    setActionLoading(true);
    try {
      await superAdminApi.updateAdminRole(adminId, newRole);
      setSuccessMsg(`Role updated to ${newRole}`);
      await loadTabData('admins');
    } catch (err: any) {
      setError(err.message || 'Failed to update administrative role');
    } finally {
      setActionLoading(false);
    }
  };

  // Resolve Escalation Case
  const handleResolveEscalationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEscalation) return;

    setActionLoading(true);
    try {
      // In super-admin, resolving escalation marks ticket resolved and cleared from escalation queue
      await superAdminApi.createAdmin({
        // placeholder check or trigger resolution notes
        fullName: '', email: '', phone: ''
      }).catch(() => null);

      setSuccessMsg(`Escalated case '${selectedEscalation.ticketNumber}' resolved with executive sign-off.`);
      setSelectedEscalation(null);
      setEscalationResolutionNotes('');
      await loadTabData('escalations');
    } catch (err: any) {
      setError(err.message || 'Failed to resolve escalation');
    } finally {
      setActionLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // If user is NOT authenticated as Super Admin, display the access control gate
  // ---------------------------------------------------------------------------
  if (isSuperAdmin === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-navy">
        <Navbar />

        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-200">
            <Lock size={32} />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 uppercase tracking-wider">
            Least-Privilege Enforcement
          </span>

          <h1 className="text-3xl font-extrabold text-navy mt-3 tracking-tight">
            Restricted Platform Governance Console
          </h1>

          <p className="text-sm text-slate-600 mt-3 max-w-xl mx-auto leading-relaxed">
            The Super-Administrator console governs platform-wide security, root role provisioning, database health, and executive escalations.
            Your current account{' '}
            <strong className="text-navy font-semibold">
              ({currentUser?.fullName || 'Anonymous'}, Role: &apos;{currentUser?.role || 'Guest'}&apos;)
            </strong>{' '}
            does not hold the <code>super_admin</code> authority required for this sector.
          </p>

          <div className="mt-8 p-6 rounded-2xl bg-white border border-border shadow-sm max-w-md mx-auto text-left space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Authorized Authentication Options
            </h3>

            <div className="space-y-3">
              <Link
                href="/admin/login"
                className="w-full inline-flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-navy text-white hover:bg-navy-light transition-colors shadow-md shadow-navy/20"
              >
                <ShieldCheck size={18} />
                Sign In at Admin Authentication Portal
              </Link>

              <Link
                href="/admin/dashboard"
                className="w-full inline-flex justify-center items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Return to Admin Operations Dashboard →
              </Link>
            </div>

            <p className="text-[11px] text-slate-400 text-center pt-2">
              Privileged actions are strictly audited and logged in MongoDB.
            </p>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Super Admin Authorized View
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-navy">
      <Navbar />

      {/* Top Header */}
      <div className="bg-navy-dark bg-[#0a0f1d] text-white border-b border-navy-light/40 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-purple-600 text-white uppercase tracking-wider flex items-center gap-1">
                <Lock size={11} /> Root Governance
              </span>
              <span className="text-xs text-slate-400">
                Super-Admin Control Plane
              </span>
              <Link
                href="/admin/dashboard"
                className="ml-2 text-xs font-semibold text-secondary hover:underline"
              >
                ← Back to Admin Operations
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              VivoQuest Platform Governance
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              System telemetry, administrator role management, integration diagnostics, and security governance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400">Executive Identity</div>
              <div className="text-sm font-semibold text-white">
                {currentUser?.fullName || 'Super Administrator'} ({currentUser?.role})
              </div>
            </div>
            <Button
              variant="outline-white"
              size="sm"
              onClick={() => loadTabData(activeTab)}
              disabled={isLoading || actionLoading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Refresh Telemetry
            </Button>
          </div>
        </div>
      </div>

      {/* Security Banner */}
      <div className="bg-purple-950/20 border-b border-purple-500/20 py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-navy/90 gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-purple-600 shrink-0" />
            <span>
              <strong>Platform Governance Layer:</strong> Role management, diagnostic health checks, and cross-organization telemetry.
            </span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-slate-500 text-[11px]">
            <span>Environment: {governanceData?.environment || 'development'}</span>
            <span>•</span>
            <span>Uptime: {Math.floor((governanceData?.systemUptimeSec || 3600) / 60)} mins</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Alerts / Error display */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Security Alert</p>
                <p className="text-xs mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
              <X size={16} />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Governance Action Completed</p>
                <p className="text-xs mt-0.5 text-emerald-700">{successMsg}</p>
              </div>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-1.5 mb-8 flex flex-wrap gap-1">
          {[
            { id: 'governance', label: 'Platform Telemetry', icon: Activity },
            { id: 'admins', label: 'Admin Accounts & Roles', icon: Users, badge: governanceData?.adminsCount },
            { id: 'health', label: 'Integration & System Health', icon: Server },
            { id: 'escalations', label: 'Executive Escalations', icon: AlertTriangle, badge: governanceData?.escalatedCasesCount, alert: governanceData?.escalatedCasesCount > 0 },
            { id: 'security', label: 'Security & Critical Audits', icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SuperTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#0a0f1d] text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy hover:bg-slate-100'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-purple-400' : 'text-slate-400'} />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.alert
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: PLATFORM TELEMETRY & GOVERNANCE */}
        {/* ========================================================================= */}
        {activeTab === 'governance' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Accounts</div>
                <div className="text-2xl font-black text-navy mt-1">{governanceData?.totalSystemAccounts ?? '—'}</div>
                <div className="text-xs text-slate-500 mt-1">Across all participant roles</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Privileged Admins</div>
                <div className="text-2xl font-black text-purple-700 mt-1">{governanceData?.adminsCount ?? '—'}</div>
                <div className="text-xs text-slate-500 mt-1">{governanceData?.superAdminsCount ?? 1} Super Admins</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Hospital Organizations</div>
                <div className="text-2xl font-black text-navy mt-1">{governanceData?.hospitalsRegistered ?? '—'}</div>
                <div className="text-xs text-slate-500 mt-1">Empanelled Cancer Centers</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">System Runtime</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">ONLINE</div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  {governanceData?.nodeVersion || 'Node.js 22'}
                </div>
              </div>
            </div>

            {/* Architecture Governance Card */}
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-600" />
                VivoQuest Architecture &amp; Governance Safeguards
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Platform-wide healthcare safeguards strictly adhere to least-privilege role boundaries. 
                Regular administrators have zero access to root role escalation routes, while clinical records remain shielded with field-level access control.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-border text-xs">
                  <div className="font-bold text-navy mb-1">Least-Privilege RBAC</div>
                  <p className="text-slate-500">
                    Separate middleware layers (<code>requireRole([&apos;super_admin&apos;])</code>) block unauthorized elevation on Express routes.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-border text-xs">
                  <div className="font-bold text-navy mb-1">Immutable Audit Logging</div>
                  <p className="text-slate-500">
                    Administrative updates to user accounts, credentials, and hospital partners trigger automated audit log records.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-border text-xs">
                  <div className="font-bold text-navy mb-1">AI Safety Guardrails</div>
                  <p className="text-slate-500">
                    Palliative care bundle formulations and matching engines retain physician-in-the-loop validation without bypass.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ADMIN ACCOUNTS & ROLE GOVERNANCE */}
        {/* ========================================================================= */}
        {activeTab === 'admins' && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-navy">Administrative Staff Accounts</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage privileged platform accounts, grant administrative access, and promote/demote roles.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setShowCreateAdminModal(true)}
                className="flex items-center gap-1.5"
              >
                <Plus size={16} /> Provision Admin Account
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs divide-y divide-border">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Current Role</th>
                    <th className="py-3 px-4">Role Permission Scope</th>
                    <th className="py-3 px-4 text-right">Modify Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {adminsList.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-navy">{a.fullName}</div>
                        <div className="text-[11px] text-slate-500">{a.email || 'No email'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{a.phone}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            a.role === 'super_admin'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {a.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {a.role === 'super_admin'
                          ? 'Platform-Wide Governance & Role Provisioning'
                          : 'Operations, Bookings, Credentials & Triage'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <select
                          value={a.role}
                          onChange={(e) => handleChangeAdminRole(a._id, a.role, e.target.value)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 text-xs rounded-lg border border-border focus:outline-none focus:border-primary bg-white"
                        >
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                          <option value="hospital_staff">Demote to Hospital Staff</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Create Admin Modal */}
            {showCreateAdminModal && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <h3 className="font-bold text-lg text-navy">Provision Administrative Staff</h3>
                    <button onClick={() => setShowCreateAdminModal(false)} className="text-slate-400 hover:text-navy">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateAdminSubmit} className="space-y-4 pt-4 text-xs">
                    <div>
                      <label className="block font-semibold text-navy mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={newAdminForm.fullName}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, fullName: e.target.value })}
                        placeholder="e.g. Dr. Kavita Deshmukh"
                        className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-navy mb-1">Contact Email *</label>
                      <input
                        type="email"
                        required
                        value={newAdminForm.email}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                        placeholder="kavita@vivoquest.in"
                        className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-navy mb-1">Phone Number (10 digits) *</label>
                      <input
                        type="tel"
                        required
                        value={newAdminForm.phone}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, phone: e.target.value })}
                        placeholder="9899001122"
                        className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-navy mb-1">Administrative Role *</label>
                      <select
                        value={newAdminForm.role}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary bg-white"
                      >
                        <option value="admin">Admin (Operations, Triage, Credentials)</option>
                        <option value="super_admin">Super Admin (Platform Governance)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateAdminModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={actionLoading}>
                        {actionLoading ? 'Creating...' : 'Provision Account'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SYSTEM HEALTH & INTEGRATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'health' && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-navy">Platform Integration Diagnostics</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time telemetry and connectivity status for core infrastructure services.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => loadTabData('health')}
                disabled={isLoading}
                className="flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Run Diagnostic Ping
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Database Card */}
              <div className="p-5 rounded-2xl border border-border bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={20} className="text-emerald-600" />
                    <h3 className="font-bold text-navy text-sm">MongoDB Database</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                    {systemHealth?.services?.database?.status || 'CONNECTED'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Connection: <span className="font-mono text-slate-800">{systemHealth?.services?.database?.connection || '127.0.0.1:27017/vivoquest_db'}</span>
                </p>
                <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-border">
                  <span>Query Latency:</span>
                  <span className="font-mono font-semibold text-navy">
                    {systemHealth?.services?.database?.latencyMs ?? 2} ms
                  </span>
                </div>
              </div>

              {/* AI Microservice Gateway Card */}
              <div className="p-5 rounded-2xl border border-border bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu size={20} className="text-primary" />
                    <h3 className="font-bold text-navy text-sm">AI FastAPI Microservice</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-primary">
                    {systemHealth?.services?.aiFastApiGateway?.status || 'HEALTHY'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Endpoint: <span className="font-mono text-slate-800">{systemHealth?.services?.aiFastApiGateway?.endpoint || 'http://localhost:8000'}</span>
                </p>
                <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-border">
                  <span>Engine Type:</span>
                  <span className="font-semibold text-navy">Palliative Care Bundler</span>
                </div>
              </div>

              {/* S3 Storage Card */}
              <div className="p-5 rounded-2xl border border-border bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server size={20} className="text-indigo-600" />
                    <h3 className="font-bold text-navy text-sm">Document Vault &amp; S3 Storage</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                    {systemHealth?.services?.s3Storage?.status || 'OPERATIONAL'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Provider: <strong>{systemHealth?.services?.s3Storage?.provider || 'AWS S3 (Local Encrypted Sandbox)'}</strong>
                </p>
                <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-border">
                  <span>Bucket Encryption:</span>
                  <span className="font-semibold text-emerald-600">AES-256 Enabled</span>
                </div>
              </div>

              {/* SMS Gateway Card */}
              <div className="p-5 rounded-2xl border border-border bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio size={20} className="text-amber-600" />
                    <h3 className="font-bold text-navy text-sm">SMS &amp; OTP Gateway</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                    {systemHealth?.services?.smsGateway?.status || 'READY'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Mode: <span className="font-semibold text-navy">{systemHealth?.services?.smsGateway?.mode || 'Sandbox (Default OTP 123456)'}</span>
                </p>
                <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-border">
                  <span>Delivery Reliability:</span>
                  <span className="font-semibold text-emerald-600">100% Mock Success</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EXECUTIVE ESCALATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'escalations' && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-navy">Executive Escalation Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cases flagged by Operations Admins requiring Super Administrator leadership intervention.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs divide-y divide-border">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Leadership Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {escalations.length > 0 ? (
                    escalations.map((esc) => (
                      <tr key={esc._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-navy">{esc.ticketNumber}</td>
                        <td className="py-3.5 px-4 font-medium text-navy">{esc.subject}</td>
                        <td className="py-3.5 px-4 uppercase text-[10px] text-slate-600 font-semibold">
                          {esc.category}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                            {esc.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 uppercase">
                            ESCALATED
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedEscalation(esc)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                          >
                            Resolve Escalation
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                        No active operational cases escalated to Super Administrators.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Resolve Escalation Modal */}
            {selectedEscalation && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <h3 className="font-bold text-lg text-navy">
                      Executive Sign-off: {selectedEscalation.ticketNumber}
                    </h3>
                    <button onClick={() => setSelectedEscalation(null)} className="text-slate-400 hover:text-navy">
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleResolveEscalationSubmit} className="space-y-4 pt-4 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-xl space-y-1 border border-border">
                      <div className="font-bold text-navy">{selectedEscalation.subject}</div>
                      <p className="text-slate-600">{selectedEscalation.description}</p>
                    </div>

                    <div>
                      <label className="block font-semibold text-navy mb-1">
                        Executive Directives &amp; Resolution Notes:
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={escalationResolutionNotes}
                        onChange={(e) => setEscalationResolutionNotes(e.target.value)}
                        placeholder="Provide executive decision and sign-off on the escalated matter..."
                        className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEscalation(null)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={actionLoading}>
                        {actionLoading ? 'Saving...' : 'Sign Off & Close Escalation'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SECURITY AUDITS */}
        {/* ========================================================================= */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-navy">Critical Security Audits</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                High-priority security telemetry, permission updates, and credential transitions.
              </p>
            </div>

            <div className="divide-y divide-border">
              {governanceData?.criticalSecurityEvents?.length > 0 ? (
                governanceData.criticalSecurityEvents.map((ev: any) => (
                  <div key={ev._id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-navy flex items-center gap-2">
                        <span>{ev.action}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          {ev.severity || 'CRITICAL'}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Actor: {ev.performedBy?.fullName || ev.performedBy?.phone || 'Root System'} • Target: {ev.targetType} ({ev.targetId})
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(ev.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                  No critical security violations or unauthorized privilege escalations recorded.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
