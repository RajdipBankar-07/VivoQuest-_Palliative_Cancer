'use client';

import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  Calendar,
  Phone,
  Layers,
  X,
  RefreshCw,
  FileText,
  DollarSign,
  AlertCircle,
  Activity,
  User,
  Check,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

interface CaregiverSubscriptionsViewProps {
  onNavigateToAccounts?: (searchQuery?: string) => void;
}

export function CaregiverSubscriptionsView({ onNavigateToAccounts }: CaregiverSubscriptionsViewProps = {}) {
  const [subTab, setSubTab] = useState<'subscriptions' | 'plans'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subPagination, setSubPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [plans, setPlans] = useState<any[]>([]);
  const [caregiversList, setCaregiversList] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSubForAssign, setSelectedSubForAssign] = useState<any>(null);
  const [assignCaregiverUserId, setAssignCaregiverUserId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const [showRecordVisitModal, setShowRecordVisitModal] = useState(false);
  const [selectedSubForVisit, setSelectedSubForVisit] = useState<any>(null);
  const [visitNotes, setVisitNotes] = useState('');

  const [showActivateModal, setShowActivateModal] = useState(false);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [activateForm, setActivateForm] = useState({
    patientId: '',
    planId: '',
    assignedCaregiverId: '',
    carePlanNotes: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    paymentMethod: 'online',
  });

  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({
    title: '',
    planType: 'monthly_subscription' as 'monthly_subscription' | 'fixed_visit_package' | 'hourly_package',
    category: 'palliative' as 'palliative' | 'post_operative' | 'elderly_care' | 'rehabilitation',
    durationDays: 30,
    totalVisitsIncluded: 30,
    hoursPerVisit: 8,
    customerPrice: 36000,
    caregiverPayout: 25000,
    description: '',
    features: 'Daily 8-hour shift, vitals monitoring, medication assistance',
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (subTab === 'subscriptions') {
        const [res, profRes, plansRes, patientsRes] = await Promise.all([
          adminApi.getCaregiverSubscriptions({
            status: statusFilter,
            search: search.trim() || undefined,
            page: subPagination.page,
            limit: 10,
          }),
          adminApi.getHealthcareProfessionals({ limit: 50 }),
          adminApi.getCaregiverPlans(),
          adminApi.getUsers({ role: 'patient', limit: 100 }),
        ]);
        setSubscriptions(res.data);
        setSubPagination(res.pagination);
        setCaregiversList(profRes.data || []);
        setPlans(plansRes.data || []);
        setPatientsList(patientsRes.data || []);
      } else {
        const plansRes = await adminApi.getCaregiverPlans();
        setPlans(plansRes.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load caregiver subscriptions data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subTab, statusFilter]);

  const matchingRegisteredPatient = search.trim()
    ? patientsList.find((p) => {
        const q = search.trim().toLowerCase();
        const cleanDigits = q.replace(/\D/g, '');
        const pDigits = (p.phone || '').replace(/\D/g, '');
        return (
          p.fullName?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          (p.id && p.id.toLowerCase() === q) ||
          (p._id && p._id.toLowerCase() === q) ||
          (cleanDigits.length >= 5 && pDigits.includes(cleanDigits))
        );
      })
    : null;

  const handleActivateSubscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activateForm.patientId || !activateForm.planId) {
      setError('Please select both a registered patient and a care plan package.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const assignedCg =
        activateForm.assignedCaregiverId &&
        activateForm.assignedCaregiverId !== 'undefined' &&
        activateForm.assignedCaregiverId.trim()
          ? activateForm.assignedCaregiverId.trim()
          : undefined;

      await adminApi.activateCaregiverSubscription({
        patientId: activateForm.patientId.trim(),
        planId: activateForm.planId.trim(),
        assignedCaregiverId: assignedCg,
        carePlanNotes: activateForm.carePlanNotes?.trim() || undefined,
        emergencyContact: activateForm.emergencyContactName?.trim()
          ? {
              name: activateForm.emergencyContactName.trim(),
              phone: (activateForm.emergencyContactPhone || '').trim(),
              relation: (activateForm.emergencyContactRelation || '').trim(),
            }
          : undefined,
        paymentMethod: activateForm.paymentMethod || 'online',
      });
      setSuccessMsg('Caregiver subscription activated successfully for patient.');
      setShowActivateModal(false);
      setActivateForm({
        patientId: '',
        planId: '',
        assignedCaregiverId: '',
        carePlanNotes: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: '',
        paymentMethod: 'online',
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to activate caregiver subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForAssign || !assignCaregiverUserId) return;
    if (assignCaregiverUserId === 'undefined' || !assignCaregiverUserId.trim()) {
      setError('Please select a valid licensed caregiver.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.assignCaregiverToSubscription(
        selectedSubForAssign.id || selectedSubForAssign._id,
        assignCaregiverUserId.trim(),
        assignNotes?.trim() || undefined
      );
      setSuccessMsg('Caregiver successfully assigned to subscription.');
      setShowAssignModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign caregiver');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForVisit) return;
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.recordSubscriptionVisit(
        selectedSubForVisit.id || selectedSubForVisit._id,
        visitNotes
      );
      setSuccessMsg('Visit documented and subscription visit balance decremented.');
      setShowRecordVisitModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to record visit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      const featuresArray = newPlanForm.features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);

      await adminApi.createCaregiverPlan({
        ...newPlanForm,
        features: featuresArray,
      });
      setSuccessMsg('Caregiver care plan package created successfully.');
      setShowCreatePlanModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create plan');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X size={14} /></button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSubTab('subscriptions')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                subTab === 'subscriptions' ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Patient Subscriptions & Daily Care
            </button>
            <button
              onClick={() => setSubTab('plans')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                subTab === 'plans' ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Subscription Plans & Packages
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            title="Refresh subscriptions"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {subTab === 'subscriptions' && (
            <button
              onClick={() => setShowActivateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus size={14} />
              <span>Activate Patient Subscription</span>
            </button>
          )}
          {subTab === 'plans' && (
            <button
              onClick={() => setShowCreatePlanModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus size={14} />
              <span>Create Care Package</span>
            </button>
          )}
        </div>
      </div>

      {/* Informational Guidance Banner */}
      {subTab === 'subscriptions' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 bg-blue-50/70 border border-blue-100 rounded-xl px-4 py-2.5 mb-2 gap-2">
          <div className="flex items-center gap-2">
            <HeartPulse size={15} className="text-primary shrink-0" />
            <span>
              Tracking active bedside caregiver plans. Newly registered mobile patients appear in{' '}
              <strong className="text-slate-800">Accounts &amp; Users</strong> until an active caregiver subscription is enrolled.
            </span>
          </div>
          {onNavigateToAccounts && (
            <button
              onClick={() => onNavigateToAccounts()}
              className="text-primary font-semibold hover:underline shrink-0 text-xs text-left"
            >
              Open Accounts &amp; Users →
            </button>
          )}
        </div>
      )}

      {/* Main Sub-Tab Views */}
      {subTab === 'subscriptions' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by patient name, phone, subscription #, or caregiver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSubPagination((p) => ({ ...p, page: 1 }));
                    setTimeout(() => loadData(), 0);
                  }
                }}
                className="bg-transparent text-xs w-full focus:outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setSubPagination((p) => ({ ...p, page: 1 }));
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Subscriptions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Subscription # & Patient</th>
                  <th className="py-3 px-5">Plan Package</th>
                  <th className="py-3 px-5">Assigned Caregiver</th>
                  <th className="py-3 px-5">Visits Balance</th>
                  <th className="py-3 px-5">Financial Details</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="max-w-md mx-auto space-y-2">
                        {matchingRegisteredPatient ? (
                          <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-left max-w-lg mx-auto mb-3 shadow-xs">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                                <User size={18} />
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                  <span>Registered Patient Found: {matchingRegisteredPatient.fullName}</span>
                                  <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-semibold">Active Account</span>
                                </div>
                                <p className="text-slate-600 text-[11px]">
                                  Phone: <span className="font-mono font-medium">+91 {matchingRegisteredPatient.phone}</span>
                                  {matchingRegisteredPatient.email ? ` • Email: ${matchingRegisteredPatient.email}` : ''}
                                </p>
                                <p className="text-slate-500 text-[11px] leading-relaxed">
                                  This patient has registered an account on the platform, but has not yet been enrolled in an active Caregiver Plan. Subscriptions appear in this table only after plan enrollment.
                                </p>
                                <div className="pt-2 flex flex-wrap items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setActivateForm({ ...activateForm, patientId: matchingRegisteredPatient.id || matchingRegisteredPatient._id });
                                      setShowActivateModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                  >
                                    + Activate Caregiver Plan for {matchingRegisteredPatient.fullName}
                                  </button>
                                  {onNavigateToAccounts && (
                                    <button
                                      onClick={() => onNavigateToAccounts(matchingRegisteredPatient.phone || matchingRegisteredPatient.fullName)}
                                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                                    >
                                      View in Accounts &amp; Users →
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <HeartPulse size={32} className="mx-auto text-slate-300" />
                            <p className="font-semibold text-slate-700">
                              {search ? `No subscriptions found matching "${search}"` : 'No caregiver subscriptions active'}
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Note: This table exclusively lists active care subscriptions. To find newly registered patients who do not yet have an active subscription, navigate to{' '}
                              <span className="font-semibold text-slate-800">Accounts &amp; Users</span>.
                            </p>
                          </>
                        )}
                        <div className="pt-2 flex items-center justify-center gap-2">
                          {search && (
                            <button
                              onClick={() => {
                                setSearch('');
                                setSubPagination((p) => ({ ...p, page: 1 }));
                                setTimeout(() => loadData(), 0);
                              }}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                            >
                              Clear Search
                            </button>
                          )}
                          {onNavigateToAccounts && search && (
                            <button
                              onClick={() => onNavigateToAccounts(search.trim())}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-primary rounded-lg text-xs font-semibold"
                            >
                              Search in Accounts &amp; Users →
                            </button>
                          )}
                          <button
                            onClick={() => setShowActivateModal(true)}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
                          >
                            + Activate Subscription for Patient
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id || sub._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-mono font-bold text-slate-900">{sub.subscriptionNumber}</div>
                        <div className="font-medium text-slate-800">{sub.patientName}</div>
                        <div className="text-[11px] text-slate-500">{sub.patientPhone}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-slate-900 max-w-[200px] truncate">{sub.planTitle}</div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(sub.startDate).toLocaleDateString()} - {new Date(sub.endDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        {sub.assignedCaregiverName ? (
                          <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                            <UserCheck size={14} className="text-teal-600" />
                            <span>{sub.assignedCaregiverName}</span>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                            Unassigned
                          </span>
                        )}
                        {sub.carePlanNotes && (
                          <p className="text-[11px] text-slate-500 mt-0.5 max-w-[180px] truncate">{sub.carePlanNotes}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {sub.visitsRemaining}
                          </span>
                          <span className="text-slate-400">/ {sub.totalVisitsIncluded} remaining</span>
                        </div>
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-teal-600 h-full rounded-full"
                            style={{
                              width: `${(sub.visitsCompleted / sub.totalVisitsIncluded) * 100}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">₹{sub.pricing?.customerPrice?.toLocaleString()}</div>
                        <div className="text-[11px] text-slate-500">Payout: ₹{sub.pricing?.caregiverPayout?.toLocaleString()}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedSubForAssign(sub);
                            setAssignCaregiverUserId(sub.assignedCaregiverId || '');
                            setAssignNotes(sub.carePlanNotes || '');
                            setShowAssignModal(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px]"
                        >
                          Assign Staff
                        </button>
                        {sub.visitsRemaining > 0 && sub.status === 'active' && (
                          <button
                            onClick={() => {
                              setSelectedSubForVisit(sub);
                              setVisitNotes('');
                              setShowRecordVisitModal(true);
                            }}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded text-[11px]"
                          >
                            Record Visit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Subscriptions Pagination Controls */}
          {subPagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/40">
              <span>
                Showing page {subPagination.page} of {subPagination.totalPages} ({subPagination.total} total subscriptions)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={subPagination.page <= 1}
                  onClick={() => {
                    setSubPagination((prev) => ({ ...prev, page: prev.page - 1 }));
                    setTimeout(() => loadData(), 0);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white bg-white font-medium"
                >
                  Previous
                </button>
                <button
                  disabled={subPagination.page >= subPagination.totalPages}
                  onClick={() => {
                    setSubPagination((prev) => ({ ...prev, page: prev.page + 1 }));
                    setTimeout(() => loadData(), 0);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white bg-white font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div key={p.id || p._id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-700">{p.planCode}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {p.planType?.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-base mt-2">{p.title}</h4>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{p.description}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Duration</span>
                    <span className="font-semibold text-slate-800">{p.durationDays} Days</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Visits Included</span>
                    <span className="font-semibold text-slate-800">{p.totalVisitsIncluded} Visits ({p.hoursPerVisit}h each)</span>
                  </div>
                </div>

                {p.features && p.features.length > 0 && (
                  <ul className="mt-3 space-y-1 text-slate-600 text-[11px]">
                    {p.features.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <Check size={12} className="text-teal-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">Patient Price</span>
                  <span className="text-lg font-bold text-slate-900">₹{p.customerPrice?.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Caregiver Payout</span>
                  <span className="text-sm font-semibold text-purple-700">₹{p.caregiverPayout?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Caregiver Modal */}
      {showAssignModal && selectedSubForAssign && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Assign Caregiver: {selectedSubForAssign.subscriptionNumber}
            </h3>
            <p className="text-xs text-slate-500">
              Patient: {selectedSubForAssign.patientName} • Package: {selectedSubForAssign.planTitle}
            </p>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Qualified Caregiver/Nurse *</label>
                <select
                  value={assignCaregiverUserId}
                  onChange={(e) => setAssignCaregiverUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">-- Choose Caregiver --</option>
                  {caregiversList
                    .filter((c) => Boolean(c.userId))
                    .map((c) => (
                      <option key={c.userId} value={c.userId}>
                        {c.fullName} ({c.professionType}) - {c.registrationNumber || 'N/A'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Care Plan Notes & Routine Instructions</label>
                <textarea
                  rows={3}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Record patient specific requirements, vitals frequency, or family coordination notes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-navy text-white rounded-xl font-semibold shadow-sm"
                >
                  {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Visit Modal */}
      {showRecordVisitModal && selectedSubForVisit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Record Completed Care Visit
            </h3>
            <p className="text-xs text-slate-500">
              {selectedSubForVisit.patientName} • Remaining Visits: {selectedSubForVisit.visitsRemaining}
            </p>

            <form onSubmit={handleRecordVisitSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Visit Observation Notes</label>
                <textarea
                  rows={3}
                  required
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Vitals recorded, medication assisted, hygiene support completed..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-[11px]">
                Confirming will decrement remaining visits balance to {selectedSubForVisit.visitsRemaining - 1}.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecordVisitModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-sm"
                >
                  {actionLoading ? 'Recording...' : 'Record Visit & Deduct Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Plan Package Modal */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Create Care Package</h3>
              <button onClick={() => setShowCreatePlanModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreatePlanSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Package Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 15-Day Post-Surgical Recovery Bundle"
                  value={newPlanForm.title}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Plan Type</label>
                  <select
                    value={newPlanForm.planType}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, planType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="monthly_subscription">Monthly Subscription</option>
                    <option value="fixed_visit_package">Fixed Visit Package</option>
                    <option value="hourly_package">Hourly Care Package</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={newPlanForm.category}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="palliative">Palliative Care</option>
                    <option value="post_operative">Post-Operative Recovery</option>
                    <option value="elderly_care">Elderly Daily Assistance</option>
                    <option value="rehabilitation">Rehabilitation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPlanForm.durationDays}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, durationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Visits Included</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPlanForm.totalVisitsIncluded}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, totalVisitsIncluded: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hours / Visit</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPlanForm.hoursPerVisit}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, hoursPerVisit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Customer Price (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newPlanForm.customerPrice}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, customerPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Caregiver Payout (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newPlanForm.caregiverPayout}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, caregiverPayout: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={newPlanForm.description}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, description: e.target.value })}
                  placeholder="Plan clinical scope and objectives..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Features (comma separated)</label>
                <input
                  type="text"
                  value={newPlanForm.features}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, features: e.target.value })}
                  placeholder="Daily vitals check, Dressing assistance, Portal sync"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-sm"
                >
                  {actionLoading ? 'Saving...' : 'Create Plan Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activate Patient Subscription Modal */}
      {showActivateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Activate Patient Caregiver Subscription
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enroll an authorized registered patient into a home nursing and bedside support plan.
                </p>
              </div>
              <button
                onClick={() => setShowActivateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleActivateSubscriptionSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Registered Patient *</label>
                <select
                  required
                  value={activateForm.patientId}
                  onChange={(e) => setActivateForm({ ...activateForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="">-- Choose Registered Patient Account --</option>
                  {patientsList.map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>
                      {p.fullName} • +91 {p.phone} {p.email ? `(${p.email})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Patients must first create an account or be registered in Accounts &amp; Users.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Caregiver Package / Plan *</label>
                <select
                  required
                  value={activateForm.planId}
                  onChange={(e) => setActivateForm({ ...activateForm, planId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="">-- Choose Care Plan Package --</option>
                  {plans.map((pl) => (
                    <option key={pl.id || pl._id} value={pl.id || pl._id}>
                      {pl.title} — ₹{pl.customerPrice?.toLocaleString()} ({pl.totalVisitsIncluded} visits / {pl.durationDays} days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assign Licensed Caregiver (Optional)</label>
                <select
                  value={activateForm.assignedCaregiverId}
                  onChange={(e) => setActivateForm({ ...activateForm, assignedCaregiverId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="">-- Allocate Nurse / Caregiver Later (Clinical Dispatch Desk) --</option>
                  {caregiversList
                    .filter((cg) => Boolean(cg.userId))
                    .map((cg) => (
                      <option key={cg.userId} value={cg.userId}>
                        {cg.fullName} ({cg.professionType}) • Reg: {cg.registrationNumber || 'N/A'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Spouse / Sibling"
                    value={activateForm.emergencyContactName}
                    onChange={(e) => setActivateForm({ ...activateForm, emergencyContactName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="10-digit number"
                    value={activateForm.emergencyContactPhone}
                    onChange={(e) => setActivateForm({ ...activateForm, emergencyContactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Relationship</label>
                  <input
                    type="text"
                    placeholder="e.g. Daughter"
                    value={activateForm.emergencyContactRelation}
                    onChange={(e) => setActivateForm({ ...activateForm, emergencyContactRelation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Clinical Care Plan Notes</label>
                <textarea
                  rows={2}
                  placeholder="Specific palliative instructions, shift timings, or attending clinician notes..."
                  value={activateForm.carePlanNotes}
                  onChange={(e) => setActivateForm({ ...activateForm, carePlanNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowActivateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? 'Activating...' : 'Activate Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
