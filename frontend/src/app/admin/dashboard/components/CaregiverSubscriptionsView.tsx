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
  PauseCircle,
  PlayCircle,
  Ban,
  Archive,
  ShieldAlert,
  History,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Mail,
  MapPin,
  Stethoscope,
  Thermometer,
  Heart,
  ChevronRight,
  Shield,
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

  // Lifecycle Modals
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedSubForSuspend, setSelectedSubForSuspend] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const [showResumeModal, setShowResumeModal] = useState(false);
  const [selectedSubForResume, setSelectedSubForResume] = useState<any>(null);
  const [resumeReason, setResumeReason] = useState('');

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedSubForCancel, setSelectedSubForCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedSubForArchive, setSelectedSubForArchive] = useState<any>(null);
  const [archiveReason, setArchiveReason] = useState('');

  // Audit History & Timeline State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSubForHistory, setSelectedSubForHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Schedule Visit Modal State (Phase 1)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSubForSchedule, setSelectedSubForSchedule] = useState<any>(null);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledDate: '',
    timeSlot: '09:00 - 11:00',
    visitType: 'clinical_care',
    providerId: '',
    instructions: '',
  });

  // Patient Profile & Details Modal State (Milestone C)
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [patientActiveTab, setPatientActiveTab] = useState<
    'account' | 'subscriptions' | 'caregiver' | 'clinical' | 'history'
  >('account');

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

  const openHistoryModal = async (sub: any, page = 1) => {
    setSelectedSubForHistory(sub);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const subId = sub.id || sub._id;
      const res = await adminApi.getCaregiverSubscriptionHistory(subId, { page, limit: 10 });
      if (res && res.success) {
        setHistoryEvents(res.data || []);
        if (res.pagination) {
          setHistoryPagination(res.pagination);
        }
      } else {
        setHistoryError('Unable to load subscription audit trail');
      }
    } catch (err: any) {
      setHistoryError(err.message || 'Failed to retrieve subscription audit history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openScheduleModal = (sub: any) => {
    setSelectedSubForSchedule(sub);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const currentCaregiver =
      sub.assignedCaregiverId ||
      (caregiversList.length > 0 ? (caregiversList[0].userId || caregiversList[0]._id || caregiversList[0].id) : '');

    setScheduleForm({
      scheduledDate: tomorrowStr,
      timeSlot: '09:00 - 11:00',
      visitType: 'clinical_care',
      providerId: currentCaregiver ? String(currentCaregiver) : '',
      instructions: sub.carePlanNotes || '',
    });
    setShowScheduleModal(true);
  };

  const handleScheduleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForSchedule) return;
    if (!scheduleForm.scheduledDate) {
      setError('Please choose a valid scheduled date.');
      return;
    }
    if (!scheduleForm.providerId) {
      setError('Please select an authorized caregiver/nurse.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const subId = selectedSubForSchedule.id || selectedSubForSchedule._id;
      await adminApi.scheduleVisit({
        subscriptionId: subId,
        scheduledDate: scheduleForm.scheduledDate,
        timeSlot: scheduleForm.timeSlot,
        visitType: scheduleForm.visitType,
        providerId: scheduleForm.providerId,
        instructions: scheduleForm.instructions.trim() || undefined,
        idempotencyKey: `sched-${subId}-${scheduleForm.scheduledDate}-${scheduleForm.timeSlot}`,
      });
      setSuccessMsg(
        `Visit successfully scheduled and assigned for subscription ${selectedSubForSchedule.subscriptionNumber || ''}.`
      );
      setShowScheduleModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule visit');
    } finally {
      setActionLoading(false);
    }
  };

  const resolvePatientId = (subOrPatient: any): string | null => {
    if (!subOrPatient) return null;
    if (typeof subOrPatient === 'string') return subOrPatient;
    if (subOrPatient.patientId) {
      if (typeof subOrPatient.patientId === 'object') {
        return (subOrPatient.patientId._id || subOrPatient.patientId.id || subOrPatient.patientId.toString()).toString();
      }
      return String(subOrPatient.patientId);
    }
    if (subOrPatient.patientUserId) {
      return String(subOrPatient.patientUserId);
    }
    if (subOrPatient.id || subOrPatient._id) {
      return String(subOrPatient.id || subOrPatient._id);
    }
    if (subOrPatient.patientPhone || subOrPatient.patientName) {
      const cleanSubPhone = (subOrPatient.patientPhone || '').replace(/\D/g, '');
      const matched = patientsList.find(
        (p) =>
          (cleanSubPhone && (p.phone || '').replace(/\D/g, '') === cleanSubPhone) ||
          (p.fullName && subOrPatient.patientName && p.fullName.toLowerCase() === subOrPatient.patientName.toLowerCase())
      );
      if (matched) {
        return (matched.id || matched._id)?.toString();
      }
    }
    return null;
  };

  const openPatientProfile = async (
    patientIdentifier: string,
    initialTab: 'account' | 'subscriptions' | 'caregiver' | 'clinical' | 'history' = 'account'
  ) => {
    if (!patientIdentifier) {
      setError('Patient record identifier is missing');
      return;
    }
    setSelectedPatientId(patientIdentifier);
    setShowPatientModal(true);
    setPatientLoading(true);
    setPatientError(null);
    setPatientActiveTab(initialTab);
    try {
      const res = await adminApi.getPatientProfile(patientIdentifier);
      if (res && res.success) {
        setPatientData(res.data);
      } else {
        setPatientError(res?.message || 'Unable to retrieve authorized patient profile');
      }
    } catch (err: any) {
      setPatientError(err.message || 'Failed to retrieve authorized patient profile');
    } finally {
      setPatientLoading(false);
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
      if (showHistoryModal && selectedSubForHistory && (selectedSubForHistory.id === selectedSubForAssign.id || selectedSubForHistory._id === selectedSubForAssign._id)) {
        openHistoryModal(selectedSubForHistory, historyPagination.page);
      }
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
      if (showHistoryModal && selectedSubForHistory && (selectedSubForHistory.id === selectedSubForVisit.id || selectedSubForHistory._id === selectedSubForVisit._id)) {
        openHistoryModal(selectedSubForHistory, historyPagination.page);
      }
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

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForSuspend || !suspendReason.trim()) {
      setError('Please provide a reason for suspending this care package.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.suspendCaregiverSubscription(
        selectedSubForSuspend.id || selectedSubForSuspend._id,
        suspendReason.trim()
      );
      setSuccessMsg(`Subscription ${selectedSubForSuspend.subscriptionNumber} has been suspended. Bedside care visits are paused.`);
      setShowSuspendModal(false);
      setSuspendReason('');
      loadData();
      if (showHistoryModal && selectedSubForHistory && (selectedSubForHistory.id === selectedSubForSuspend.id || selectedSubForHistory._id === selectedSubForSuspend._id)) {
        openHistoryModal(selectedSubForHistory, historyPagination.page);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to suspend subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForResume) return;
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.resumeCaregiverSubscription(
        selectedSubForResume.id || selectedSubForResume._id,
        resumeReason.trim() || undefined
      );
      setSuccessMsg(`Subscription ${selectedSubForResume.subscriptionNumber} has been reactivated. Staff can resume recording visits.`);
      setShowResumeModal(false);
      setResumeReason('');
      loadData();
      if (showHistoryModal && selectedSubForHistory && (selectedSubForHistory.id === selectedSubForResume.id || selectedSubForHistory._id === selectedSubForResume._id)) {
        openHistoryModal(selectedSubForHistory, historyPagination.page);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resume subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForCancel || !cancelReason.trim()) {
      setError('Please provide a cancellation reason.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.cancelCaregiverSubscription(
        selectedSubForCancel.id || selectedSubForCancel._id,
        cancelReason.trim()
      );
      setSuccessMsg(`Subscription ${selectedSubForCancel.subscriptionNumber} was cancelled. Clinical and payment records preserved.`);
      setShowCancelModal(false);
      setCancelReason('');
      loadData();
      if (showHistoryModal && selectedSubForHistory && (selectedSubForHistory.id === selectedSubForCancel.id || selectedSubForHistory._id === selectedSubForCancel._id)) {
        openHistoryModal(selectedSubForHistory, historyPagination.page);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForArchive || !archiveReason.trim()) {
      setError('Please provide an archive reason.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.archiveCaregiverSubscription(
        selectedSubForArchive.id || selectedSubForArchive._id,
        archiveReason.trim()
      );
      setSuccessMsg(`Subscription ${selectedSubForArchive.subscriptionNumber} archived safely to audit compliance records.`);
      setShowArchiveModal(false);
      setArchiveReason('');
      loadData();
      if (showHistoryModal && selectedSubForHistory && (selectedSubForHistory.id === selectedSubForArchive.id || selectedSubForHistory._id === selectedSubForArchive._id)) {
        openHistoryModal(selectedSubForHistory, historyPagination.page);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to archive subscription');
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
              <option value="suspended">Suspended / Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="archived">Compliance Archived</option>
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
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const pId = resolvePatientId(matchingRegisteredPatient);
                                      if (pId) openPatientProfile(pId);
                                    }}
                                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                                  >
                                    <User size={13} className="text-teal-600" />
                                    <span>View Patient Profile</span>
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
                  subscriptions.map((sub) => {
                    const resolvedId = resolvePatientId(sub);
                    return (
                      <tr
                        key={sub.id || sub._id}
                        onClick={() => {
                          if (resolvedId) openPatientProfile(resolvedId);
                        }}
                        className="hover:bg-teal-50/30 transition cursor-pointer group/row"
                        title="Click to view verified patient profile & full details"
                      >
                        <td className="py-3.5 px-5">
                          <div className="font-mono font-bold text-slate-900">{sub.subscriptionNumber}</div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (resolvedId) openPatientProfile(resolvedId);
                            }}
                            className="font-semibold text-slate-900 hover:text-teal-700 hover:underline inline-flex items-center gap-1.5 transition text-left cursor-pointer group/btn"
                            title="View verified patient details, subscriptions, visits, and clinical records"
                          >
                            <span>{sub.patientName}</span>
                            <ExternalLink size={12} className="text-teal-600 opacity-60 group-hover/btn:opacity-100 transition shrink-0" />
                          </button>
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
                          {sub.isArchived ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <Archive size={11} />
                              <span>Archived</span>
                            </span>
                          ) : sub.status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              <span>Active</span>
                            </span>
                          ) : sub.status === 'paused' || sub.status === 'suspended' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <PauseCircle size={11} className="text-amber-700" />
                              <span>Suspended</span>
                            </span>
                          ) : sub.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              <CheckCircle2 size={11} />
                              <span>Completed</span>
                            </span>
                          ) : sub.status === 'cancelled' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <Ban size={11} />
                              <span>Cancelled</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {sub.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right space-x-1.5 whitespace-nowrap">
                          {!sub.isArchived && sub.status !== 'cancelled' && sub.status !== 'completed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubForAssign(sub);
                                setAssignCaregiverUserId(sub.assignedCaregiverId || '');
                                setAssignNotes(sub.carePlanNotes || '');
                                setShowAssignModal(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] transition"
                              title="Assign or reassign qualified bedside nurse/caregiver"
                            >
                              Assign Staff
                            </button>
                          )}

                          {sub.visitsRemaining > 0 && sub.status === 'active' && !sub.isArchived && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openScheduleModal(sub);
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded text-[11px] transition shadow-xs inline-flex items-center gap-1"
                              title="Schedule and assign visits for this active subscription"
                            >
                              <Calendar size={11} />
                              <span>Schedule Visits</span>
                            </button>
                          )}

                          {sub.visitsRemaining > 0 && sub.status === 'active' && !sub.isArchived && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubForVisit(sub);
                                setVisitNotes('');
                                setShowRecordVisitModal(true);
                              }}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded text-[11px] transition shadow-xs"
                              title="Document completed bedside care shift"
                            >
                              Record Visit
                            </button>
                          )}

                          {sub.status === 'active' && !sub.isArchived && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubForSuspend(sub);
                                setSuspendReason('');
                                setShowSuspendModal(true);
                              }}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold rounded text-[11px] transition"
                              title="Temporarily pause visits and caregiver service"
                            >
                              Suspend
                            </button>
                          )}

                          {(sub.status === 'paused' || sub.status === 'suspended') && !sub.isArchived && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubForResume(sub);
                                setResumeReason('');
                                setShowResumeModal(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] transition shadow-xs"
                              title="Reactivate caregiver service and resume visits"
                            >
                              Resume
                            </button>
                          )}

                          {!sub.isArchived && sub.status !== 'cancelled' && sub.status !== 'completed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubForCancel(sub);
                                setCancelReason('');
                                setShowCancelModal(true);
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold rounded text-[11px] transition"
                              title="Permanently terminate care subscription"
                            >
                              Cancel
                            </button>
                          )}

                          {!sub.isArchived && (sub.status === 'cancelled' || sub.status === 'completed') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubForArchive(sub);
                                setArchiveReason('');
                                setShowArchiveModal(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded text-[11px] transition"
                              title="Move to compliance archive"
                            >
                              Archive
                            </button>
                          )}

                          {sub.isArchived && (
                            <span className="text-[11px] text-slate-400 italic mr-1.5">
                              Archived Record
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openHistoryModal(sub);
                            }}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold rounded text-[11px] transition inline-flex items-center gap-1 shadow-2xs"
                            title="View authorized audit history and timeline"
                          >
                            <History size={11} />
                            <span>History</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
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

      {/* Suspend Subscription Modal */}
      {showSuspendModal && selectedSubForSuspend && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-700">
                <PauseCircle size={20} />
                <h3 className="font-bold text-slate-900 text-sm">Suspend Subscription</h3>
              </div>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3 space-y-1">
              <p className="font-semibold">
                {selectedSubForSuspend.subscriptionNumber} • {selectedSubForSuspend.patientName}
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Bedside care visits and caregiver dispatches will be <strong>paused</strong> immediately. Visits cannot be recorded while suspended.
              </p>
            </div>

            <form onSubmit={handleSuspendSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason for Suspension *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Patient hospitalized temporarily, family travelling, medical pause..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Keep Active
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? 'Suspending...' : 'Confirm Suspension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resume Subscription Modal */}
      {showResumeModal && selectedSubForResume && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <PlayCircle size={20} />
                <h3 className="font-bold text-slate-900 text-sm">Resume Subscription</h3>
              </div>
              <button
                onClick={() => setShowResumeModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl p-3 space-y-1">
              <p className="font-semibold">
                {selectedSubForResume.subscriptionNumber} • {selectedSubForResume.patientName}
              </p>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Reactivates the care plan. Staff and bedside caregivers will be able to record care shifts and daily visits again.
              </p>
            </div>

            <form onSubmit={handleResumeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reactivation Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Patient returned home, attending physician approved home care resumption..."
                  value={resumeReason}
                  onChange={(e) => setResumeReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResumeModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? 'Reactivating...' : 'Confirm Reactivation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && selectedSubForCancel && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <ShieldAlert size={20} />
                <h3 className="font-bold text-slate-900 text-sm">Cancel Subscription</h3>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl p-3 space-y-1.5">
              <p className="font-semibold">
                {selectedSubForCancel.subscriptionNumber} • {selectedSubForCancel.patientName}
              </p>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Cancelling terminates this care subscription. No further visits can be scheduled or recorded.
              </p>
              <div className="text-[10px] text-rose-700 bg-white/70 rounded p-1.5 border border-rose-100">
                ✓ Financial records, payments, past visit history, and audit logs will remain securely preserved.
              </div>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Cancellation Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Patient moved to hospice, family requested discontinuation, medical discharge..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Keep Subscription
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Subscription Modal */}
      {showArchiveModal && selectedSubForArchive && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Archive size={20} />
                <h3 className="font-bold text-slate-900 text-sm">Archive Subscription</h3>
              </div>
              <button
                onClick={() => setShowArchiveModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl p-3 space-y-1">
              <p className="font-semibold text-slate-900">
                {selectedSubForArchive.subscriptionNumber} • {selectedSubForArchive.patientName}
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Archives this record out of active operations into compliance records. Permanent deletion is prohibited; data remains accessible for compliance and regulatory reporting.
              </p>
            </div>

            <form onSubmit={handleArchiveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason for Archival *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. End-of-quarter administrative cleanup, test record retirement, completed care retention..."
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? 'Archiving...' : 'Confirm Archival'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Audit History & Timeline Modal */}
      {showHistoryModal && selectedSubForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
            {/* Modal Header */}
            <div className="p-4 md:px-6 md:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                  <History size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">Subscription Audit History</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Append-Only Log
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedSubForHistory.subscriptionNumber} • <span className="font-sans font-medium text-slate-700">{selectedSubForHistory.patientName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openHistoryModal(selectedSubForHistory, historyPagination.page)}
                  disabled={historyLoading}
                  className="p-2 rounded-lg hover:bg-slate-200/60 text-slate-600 transition disabled:opacity-50"
                  title="Refresh audit history"
                >
                  <RefreshCw size={16} className={historyLoading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Context Summary Bar */}
            <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200/60 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Plan:</span>
                <span className="font-semibold text-slate-800">{selectedSubForHistory.planTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Visits:</span>
                <span className="font-bold text-slate-900">
                  {selectedSubForHistory.visitsRemaining} / {selectedSubForHistory.totalVisitsIncluded} remaining
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Staff:</span>
                <span className="font-medium text-slate-800">
                  {selectedSubForHistory.assignedCaregiverName || 'Unassigned'}
                </span>
              </div>
              <div>
                {selectedSubForHistory.isArchived ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">Archived</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                    {selectedSubForHistory.status}
                  </span>
                )}
              </div>
            </div>

            {/* Timeline Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {historyLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    Loading verified audit trail from immutable compliance log...
                  </p>
                </div>
              ) : historyError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
                  <AlertCircle size={24} className="mx-auto text-rose-600" />
                  <p className="text-xs font-semibold text-rose-800">{historyError}</p>
                  <button
                    onClick={() => openHistoryModal(selectedSubForHistory, historyPagination.page)}
                    className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : historyEvents.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <Clock size={32} className="mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No audit events recorded</p>
                  <p className="text-xs text-slate-400">
                    No historical transitions or visit milestones recorded for this subscription.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {historyEvents.map((event, idx) => {
                    const action = event.action || event.details?.eventType || '';
                    const isActivated = action === 'CAREGIVER_SUBSCRIPTION_ACTIVATED';
                    const isAssigned = action === 'CAREGIVER_ASSIGNED_TO_SUBSCRIPTION';
                    const isSuspended = action === 'CAREGIVER_SUBSCRIPTION_SUSPENDED';
                    const isResumed = action === 'CAREGIVER_SUBSCRIPTION_RESUMED';
                    const isCancelled = action === 'CAREGIVER_SUBSCRIPTION_CANCELLED';
                    const isArchived = action === 'CAREGIVER_SUBSCRIPTION_ARCHIVED';
                    const isVisit = action === 'SUBSCRIPTION_VISIT_RECORDED';

                    let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                    let nodeColor = 'bg-slate-500 text-white';
                    let icon = <Activity size={14} />;
                    let actionTitle = action.replace(/_/g, ' ');

                    if (isActivated) {
                      badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                      nodeColor = 'bg-emerald-600 text-white';
                      icon = <CheckCircle2 size={14} />;
                      actionTitle = 'Subscription Activated';
                    } else if (isAssigned) {
                      badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                      nodeColor = 'bg-blue-600 text-white';
                      icon = <UserCheck size={14} />;
                      actionTitle = event.details?.previousCaregiverName && event.details?.previousCaregiverName !== 'Unassigned'
                        ? 'Caregiver Reassigned'
                        : 'Caregiver Assigned';
                    } else if (isSuspended) {
                      badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                      nodeColor = 'bg-amber-500 text-white';
                      icon = <PauseCircle size={14} />;
                      actionTitle = 'Subscription Suspended';
                    } else if (isResumed) {
                      badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                      nodeColor = 'bg-emerald-600 text-white';
                      icon = <PlayCircle size={14} />;
                      actionTitle = 'Subscription Resumed';
                    } else if (isCancelled) {
                      badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
                      nodeColor = 'bg-rose-600 text-white';
                      icon = <Ban size={14} />;
                      actionTitle = 'Subscription Cancelled';
                    } else if (isArchived) {
                      badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
                      nodeColor = 'bg-slate-700 text-white';
                      icon = <Archive size={14} />;
                      actionTitle = 'Subscription Archived';
                    } else if (isVisit) {
                      badgeColor = 'bg-teal-50 text-teal-800 border-teal-200';
                      nodeColor = 'bg-teal-600 text-white';
                      icon = <Check size={14} />;
                      actionTitle = 'Bedside Care Visit Recorded';
                    }

                    const eventTime = event.timestamp ? new Date(event.timestamp) : null;
                    const formattedDate = eventTime
                      ? eventTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
                        ' at ' +
                        eventTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : 'Unknown Time';

                    return (
                      <div key={event.id || idx} className="relative group">
                        {/* Timeline Node Marker */}
                        <div
                          className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-xs ${nodeColor}`}
                        >
                          {icon}
                        </div>

                        {/* Event Card */}
                        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2.5 transition">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                                {actionTitle}
                              </span>
                              {event.details?.previousStatus && event.details?.newStatus && (
                                <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  <span>{event.details.previousStatus}</span>
                                  <ArrowRight size={10} className="text-slate-400" />
                                  <span className="font-bold text-slate-800">{event.details.newStatus}</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">{formattedDate}</span>
                          </div>

                          {/* Actor context */}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-700">Actor:</span>
                            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-800">
                              {event.actorName} ({event.actorRole})
                            </span>
                            {event.details?.correlationId && (
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                Ref: {event.details.correlationId}
                              </span>
                            )}
                          </div>

                          {/* Specific contextual details */}
                          {isVisit && (
                            <div className="text-[11px] bg-teal-50/60 border border-teal-100 rounded-lg p-2 text-teal-900 flex items-center justify-between">
                              <span>
                                Visit completed. Balance remaining:{' '}
                                <strong>{event.details?.visitsRemaining}</strong> visits
                              </span>
                              {event.details?.totalVisitsIncluded && (
                                <span className="text-teal-600 text-[10px]">
                                  Package Total: {event.details.totalVisitsIncluded}
                                </span>
                              )}
                            </div>
                          )}

                          {isAssigned && event.details?.newCaregiverName && (
                            <div className="text-[11px] bg-blue-50/60 border border-blue-100 rounded-lg p-2 text-blue-900">
                              Assigned Staff:{' '}
                              <strong>{event.details.newCaregiverName}</strong>
                              {event.details.previousCaregiverName && event.details.previousCaregiverName !== 'Unassigned' && (
                                <span className="text-blue-600 text-[10px] ml-1">
                                  (Replaced: {event.details.previousCaregiverName})
                                </span>
                              )}
                            </div>
                          )}

                          {isActivated && (
                            <div className="text-[11px] bg-emerald-50/60 border border-emerald-100 rounded-lg p-2 text-emerald-900 flex items-center justify-between">
                              <span>Plan: <strong>{event.details?.planTitle}</strong> ({event.details?.visitsIncluded} visits)</span>
                              <span>Payment: <strong className="uppercase">{event.details?.paymentStatus || 'PAID'}</strong></span>
                            </div>
                          )}

                          {/* Reason / Notes */}
                          {(event.details?.reason || event.details?.notes) && (
                            <div className="text-[11px] bg-white border border-slate-200 rounded-lg p-2 text-slate-700">
                              <span className="font-semibold text-slate-600 block mb-0.5">Reason / Instructions:</span>
                              <p className="italic text-slate-800 whitespace-pre-wrap">
                                &ldquo;{event.details.reason || event.details.notes}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer with Pagination */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {historyPagination.total > 0 && (
                  <span>
                    Showing page {historyPagination.page} of {historyPagination.pages} ({historyPagination.total} total events)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {historyPagination.pages > 1 && (
                  <div className="flex items-center gap-1 mr-2">
                    <button
                      onClick={() => openHistoryModal(selectedSubForHistory, historyPagination.page - 1)}
                      disabled={historyPagination.page <= 1 || historyLoading}
                      className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => openHistoryModal(selectedSubForHistory, historyPagination.page + 1)}
                      disabled={historyPagination.page >= historyPagination.pages || historyLoading}
                      className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
                    >
                      Next
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* =========================================================================
          Milestone C: Patient Details & Profile Modal
          ========================================================================= */}
      {showPatientModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowPatientModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-4 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">
                      {patientLoading
                        ? 'Loading Patient Dossier...'
                        : patientData?.patient?.fullName || 'Patient Profile & Details'}
                    </h3>
                    {patientData?.patient?.status && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          patientData.patient.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {patientData.patient.status.toUpperCase()}
                      </span>
                    )}
                    {patientData?.patient?.isPhoneVerified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck size={11} /> Verified Phone
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Account ID: {patientData?.patient?.id || selectedPatientId || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => selectedPatientId && openPatientProfile(selectedPatientId, patientActiveTab)}
                  disabled={patientLoading}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
                  title="Refresh Patient Dossier"
                >
                  <RefreshCw size={16} className={patientLoading ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowPatientModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
                  title="Close Modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 gap-2 shrink-0 overflow-x-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPatientActiveTab('account')}
                className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                  patientActiveTab === 'account'
                    ? 'border-teal-600 text-teal-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <User size={14} />
                <span>Account &amp; Demographics</span>
              </button>
              <button
                type="button"
                onClick={() => setPatientActiveTab('subscriptions')}
                className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                  patientActiveTab === 'subscriptions'
                    ? 'border-teal-600 text-teal-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <HeartPulse size={14} />
                <span>Subscriptions</span>
                {patientData?.subscriptionsCount !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px]">
                    {patientData.subscriptionsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPatientActiveTab('caregiver')}
                className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                  patientActiveTab === 'caregiver'
                    ? 'border-teal-600 text-teal-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck size={14} />
                <span>Caregiver &amp; Visits</span>
                {patientData?.visits?.totalCount !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px]">
                    {patientData.visits.totalCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPatientActiveTab('clinical')}
                className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                  patientActiveTab === 'clinical'
                    ? 'border-teal-600 text-teal-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Stethoscope size={14} />
                <span>Care Reports &amp; Vitals</span>
                {patientData?.careReports?.totalCount !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px]">
                    {patientData.careReports.totalCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPatientActiveTab('history')}
                className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                  patientActiveTab === 'history'
                    ? 'border-teal-600 text-teal-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History size={14} />
                <span>Audit &amp; Activity</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Loading State */}
              {patientLoading && (
                <div className="py-16 text-center space-y-3">
                  <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">Loading authorized patient dossier...</p>
                  <p className="text-xs text-slate-400">Querying healthcare registry and patient records</p>
                </div>
              )}

              {/* Error State with Retry */}
              {patientError && !patientLoading && (
                <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
                  <AlertCircle size={32} className="text-rose-600 mx-auto" />
                  <h4 className="font-bold text-slate-900 text-sm">Failed to Load Patient Information</h4>
                  <p className="text-xs text-rose-700 max-w-md mx-auto">{patientError}</p>
                  <button
                    type="button"
                    onClick={() => selectedPatientId && openPatientProfile(selectedPatientId, patientActiveTab)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                  >
                    Retry Loading
                  </button>
                </div>
              )}

              {/* Data Content */}
              {!patientLoading && !patientError && patientData && (
                <>
                  {/* TAB 1: Account Information & Verified Demographics */}
                  {patientActiveTab === 'account' && (
                    <div className="space-y-6">
                      {/* Account Summary Banner */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                            Patient Account ID
                          </span>
                          <div className="font-mono font-bold text-slate-900 text-xs break-all">
                            {patientData.patient.id}
                          </div>
                          <div className="text-[11px] text-slate-500 pt-1">
                            Role: <span className="font-semibold text-slate-700 capitalize">{patientData.patient.role}</span>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                            Contact Information
                          </span>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                            <Phone size={13} className="text-teal-600" />
                            <span>+91 {patientData.patient.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                            <Mail size={13} className="text-teal-600 shrink-0" />
                            <span className="truncate">{patientData.patient.email || 'No email on record'}</span>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                            Registration &amp; Security
                          </span>
                          <div className="text-xs text-slate-700">
                            Registered:{' '}
                            <span className="font-semibold text-slate-900">
                              {new Date(patientData.patient.memberSince).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Last Active:{' '}
                            {patientData.patient.lastLoginAt
                              ? new Date(patientData.patient.lastLoginAt).toLocaleString()
                              : 'No recorded web session'}
                          </div>
                        </div>
                      </div>

                      {/* Verified Clinical Demographics */}
                      <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-teal-600" />
                            <span>Verified Patient Profile &amp; Demographics</span>
                          </h4>
                          {patientData.patient.profile ? (
                            <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-semibold border border-teal-100">
                              Verified Registry Record
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                              Basic Account Only
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Gender</span>
                            <span className="font-semibold text-slate-800 capitalize">
                              {patientData.patient.profile?.gender || 'Not specified'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Date of Birth / Age</span>
                            <span className="font-semibold text-slate-800">
                              {patientData.patient.profile?.dateOfBirth
                                ? new Date(patientData.patient.profile.dateOfBirth).toLocaleDateString()
                                : 'Not specified'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Blood Group</span>
                            <span className="font-semibold text-slate-800">
                              {patientData.patient.profile?.bloodGroup || 'Not recorded'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Primary Language</span>
                            <span className="font-semibold text-slate-800 capitalize">
                              {patientData.patient.profile?.primaryLanguage || 'English'}
                            </span>
                          </div>
                        </div>

                        {/* Residential Address */}
                        <div className="border-t border-slate-100 pt-3 text-xs">
                          <span className="text-slate-400 block text-[11px] mb-1 flex items-center gap-1">
                            <MapPin size={12} className="text-teal-600" />
                            <span>Residential Address</span>
                          </span>
                          <p className="text-slate-700">
                            {patientData.patient.profile?.address?.street ||
                            patientData.patient.profile?.address?.city ||
                            patientData.patient.profile?.address?.state ? (
                              <span>
                                {[
                                  patientData.patient.profile.address.street,
                                  patientData.patient.profile.address.city,
                                  patientData.patient.profile.address.state,
                                  patientData.patient.profile.address.postalCode,
                                ]
                                  .filter(Boolean)
                                  .join(', ')}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No verified residential address recorded</span>
                            )}
                          </p>
                        </div>

                        {/* Emergency Contact */}
                        <div className="border-t border-slate-100 pt-3 text-xs">
                          <span className="text-slate-400 block text-[11px] mb-1.5 flex items-center gap-1">
                            <AlertCircle size={12} className="text-amber-600" />
                            <span>Emergency Contact Information</span>
                          </span>
                          {patientData.patient.profile?.emergencyContact?.name ||
                          patientData.patient.profile?.emergencyContact?.phone ? (
                            <div className="flex flex-wrap items-center gap-4 text-slate-800">
                              <div>
                                Name:{' '}
                                <strong className="text-slate-900">
                                  {patientData.patient.profile.emergencyContact.name}
                                </strong>
                              </div>
                              {patientData.patient.profile.emergencyContact.relation && (
                                <div>
                                  Relation:{' '}
                                  <span className="text-slate-600 font-medium">
                                    {patientData.patient.profile.emergencyContact.relation}
                                  </span>
                                </div>
                              )}
                              <div>
                                Phone:{' '}
                                <strong className="font-mono text-slate-900">
                                  +91 {patientData.patient.profile.emergencyContact.phone}
                                </strong>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No emergency contact recorded</span>
                          )}
                        </div>

                        {/* Chronic Conditions & Allergies */}
                        <div className="border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[11px] mb-1.5 font-medium">
                              Chronic Health Conditions
                            </span>
                            {patientData.patient.profile?.chronicConditions?.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {patientData.patient.profile.chronicConditions.map((cond: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded-md text-[11px] font-medium border border-teal-200"
                                  >
                                    {cond}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">None documented</span>
                            )}
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[11px] mb-1.5 font-medium">
                              Known Allergies &amp; Contraindications
                            </span>
                            {patientData.patient.profile?.allergies?.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {patientData.patient.profile.allergies.map((allergy: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded-md text-[11px] font-medium border border-rose-200"
                                  >
                                    {allergy}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No known drug or environmental allergies</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Subscriptions Overview */}
                  {patientActiveTab === 'subscriptions' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-1">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">Caregiver Plans &amp; Subscriptions</h4>
                          <p className="text-xs text-slate-500">
                            Showing all active, suspended, completed, and archived packages for this patient
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPatientModal(false);
                            setActivateForm({
                              ...activateForm,
                              patientId: patientData.patient.id,
                            });
                            setShowActivateModal(true);
                          }}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                        >
                          + Enroll in Care Plan
                        </button>
                      </div>

                      {/* Empty Subscriptions State */}
                      {patientData.subscriptionsCount === 0 ? (
                        <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3">
                          <HeartPulse size={36} className="text-slate-300 mx-auto" />
                          <h5 className="font-bold text-slate-800 text-sm">No Subscriptions Yet</h5>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            This patient is registered on the VivoQuest platform, but has not yet been enrolled in any
                            caregiver plan or daily care subscription package.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPatientModal(false);
                              setActivateForm({
                                ...activateForm,
                                patientId: patientData.patient.id,
                              });
                              setShowActivateModal(true);
                            }}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                          >
                            + Activate First Caregiver Subscription
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {patientData.subscriptions.map((sub: any) => (
                            <div
                              key={sub.id}
                              className={`p-5 rounded-2xl border transition ${
                                sub.status === 'active' && !sub.isArchived
                                  ? 'bg-teal-50/20 border-teal-200 shadow-xs'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              {/* Subscription Card Header */}
                              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-900 text-sm">
                                      {sub.subscriptionNumber}
                                    </span>
                                    {sub.isArchived ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                                        <Archive size={10} /> Archived
                                      </span>
                                    ) : sub.status === 'active' ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                        Active
                                      </span>
                                    ) : sub.status === 'paused' || sub.status === 'suspended' ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                        <PauseCircle size={10} /> Suspended
                                      </span>
                                    ) : sub.status === 'completed' ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 inline-flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Completed
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 inline-flex items-center gap-1">
                                        <Ban size={10} /> {sub.status}
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="font-bold text-slate-900 text-sm mt-0.5">{sub.planTitle}</h5>
                                </div>

                                <div className="flex items-center gap-2">
                                  {sub.visitsRemaining > 0 && sub.status === 'active' && !sub.isArchived && (
                                    <button
                                      type="button"
                                      onClick={() => openScheduleModal(sub)}
                                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition inline-flex items-center gap-1 shadow-2xs"
                                      title="Schedule and assign visits for this active subscription"
                                    >
                                      <Calendar size={12} />
                                      <span>Schedule Visits</span>
                                    </button>
                                  )}
                                  {/* View Audit History Button linking to Milestone B */}
                                  <button
                                    type="button"
                                    onClick={() => openHistoryModal(sub)}
                                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold rounded-lg text-xs transition inline-flex items-center gap-1 shadow-2xs"
                                    title="Open append-only audit history timeline for this subscription"
                                  >
                                    <History size={12} />
                                    <span>View Audit History</span>
                                  </button>
                                </div>
                              </div>

                              {/* Subscription Metrics Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 text-xs border-b border-slate-100">
                                <div>
                                  <span className="text-slate-400 block text-[11px]">Validity Duration</span>
                                  <span className="font-medium text-slate-800">
                                    {new Date(sub.startDate).toLocaleDateString()} -{' '}
                                    {new Date(sub.endDate).toLocaleDateString()}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-slate-400 block text-[11px]">Visits Progress</span>
                                  <div className="font-semibold text-slate-900 flex items-center gap-1">
                                    <span>{sub.visitsRemaining} remaining</span>
                                    <span className="text-slate-400 font-normal">/ {sub.totalVisitsIncluded}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                                    <div
                                      className="bg-teal-600 h-full rounded-full"
                                      style={{
                                        width: `${(sub.visitsCompleted / sub.totalVisitsIncluded) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <span className="text-slate-400 block text-[11px]">Assigned Caregiver</span>
                                  {sub.assignedCaregiver ? (
                                    <span className="font-semibold text-teal-800 flex items-center gap-1">
                                      <UserCheck size={12} className="text-teal-600" />
                                      {sub.assignedCaregiver.name}
                                    </span>
                                  ) : (
                                    <span className="text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded text-[10px]">
                                      Unassigned
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <span className="text-slate-400 block text-[11px]">Payment Summary</span>
                                  <span className="font-bold text-slate-900">
                                    ₹{sub.pricing?.customerPrice?.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-slate-500 uppercase ml-1.5 font-semibold">
                                    ({sub.pricing?.paymentStatus || 'PAID'})
                                  </span>
                                </div>
                              </div>

                              {/* Additional Notes or Reasons */}
                              {(sub.carePlanNotes ||
                                sub.suspensionReason ||
                                sub.cancellationReason ||
                                sub.archiveReason) && (
                                <div className="pt-3 text-xs space-y-1.5 text-slate-600">
                                  {sub.carePlanNotes && (
                                    <div>
                                      <span className="font-semibold text-slate-700">Care Plan Instructions: </span>
                                      <span>{sub.carePlanNotes}</span>
                                    </div>
                                  )}
                                  {sub.suspensionReason && (
                                    <div className="text-amber-800 bg-amber-50/80 p-2 rounded-lg border border-amber-200/80 text-[11px]">
                                      <strong className="block font-semibold">Suspension Record:</strong>
                                      <span>&ldquo;{sub.suspensionReason}&rdquo;</span>
                                      {sub.suspendedAt && (
                                        <span className="text-amber-600 ml-1">
                                          ({new Date(sub.suspendedAt).toLocaleString()})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {sub.cancellationReason && (
                                    <div className="text-rose-800 bg-rose-50/80 p-2 rounded-lg border border-rose-200/80 text-[11px]">
                                      <strong className="block font-semibold">Cancellation Record:</strong>
                                      <span>&ldquo;{sub.cancellationReason}&rdquo;</span>
                                      {sub.cancelledAt && (
                                        <span className="text-rose-600 ml-1">
                                          ({new Date(sub.cancelledAt).toLocaleString()})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {sub.archiveReason && (
                                    <div className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px]">
                                      <strong className="block font-semibold">Archival Record:</strong>
                                      <span>&ldquo;{sub.archiveReason}&rdquo;</span>
                                      {sub.archivedAt && (
                                        <span className="text-slate-500 ml-1">
                                          ({new Date(sub.archivedAt).toLocaleString()})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: Caregiver and Upcoming / Past Visits */}
                  {patientActiveTab === 'caregiver' && (
                    <div className="space-y-6">
                      {/* Primary Assigned Caregiver Card */}
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <UserCheck size={14} className="text-teal-600" />
                          <span>Primary Bedside Caregiver</span>
                        </h4>
                        {patientData.assignedCaregiver ? (
                          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                                <UserCheck size={20} />
                              </div>
                              <div>
                                <h5 className="font-bold text-slate-900 text-sm">
                                  {patientData.assignedCaregiver.name}
                                </h5>
                                <p className="text-xs text-slate-500">{patientData.assignedCaregiver.role}</p>
                              </div>
                            </div>
                            <div className="text-xs text-slate-700">
                              <span className="text-slate-400 block text-[11px]">Authorized Phone</span>
                              <span className="font-mono font-bold text-slate-900">
                                {patientData.assignedCaregiver.phone ? `+91 ${patientData.assignedCaregiver.phone}` : '—'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                            <AlertCircle size={16} className="text-amber-600 shrink-0" />
                            <span>
                              No primary bedside caregiver assigned yet. Assign a nurse/caregiver from the subscriptions table.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Upcoming Scheduled Field Visits */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar size={14} className="text-teal-600" />
                            <span>Upcoming &amp; In-Progress Visits ({patientData.visits.upcoming.length})</span>
                          </h4>
                        </div>

                        {patientData.visits.upcoming.length === 0 ? (
                          <div className="p-5 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                            No upcoming field visits currently scheduled.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {patientData.visits.upcoming.map((v: any) => (
                              <div
                                key={v.id}
                                className="p-3.5 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-900">{v.visitNumber}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">
                                      {v.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <div className="text-slate-600 font-medium mt-0.5">
                                    {new Date(v.scheduledDate).toLocaleDateString()} • {v.timeSlot || 'Standard Shift'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[11px] text-slate-400">Assigned Provider</div>
                                  <div className="font-semibold text-slate-800">
                                    {v.provider ? v.provider.name : 'Pending Provider'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Previous Completed Visits */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-500" />
                          <span>Previous Visits History ({patientData.visits.past.length})</span>
                        </h4>

                        {patientData.visits.past.length === 0 ? (
                          <div className="p-5 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                            No previous visits on record.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {patientData.visits.past.map((v: any) => (
                              <div
                                key={v.id}
                                className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-800">{v.visitNumber}</span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        v.status === 'completed'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {v.status.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="text-slate-500 text-[11px] mt-0.5">
                                    {new Date(v.scheduledDate).toLocaleDateString()} • {v.timeSlot || 'Shift'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[11px] text-slate-400">Attending Specialist</div>
                                  <div className="font-medium text-slate-700">
                                    {v.provider ? v.provider.name : 'Unassigned'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Care Reports and Vitals (Clinical Section) */}
                  {patientActiveTab === 'clinical' && (
                    <div className="space-y-6">
                      {/* Clinical Governance Banner */}
                      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                        <Shield size={16} className="text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Authorized Clinical Dossier</strong>
                          <span className="text-blue-800 text-[11px]">
                            Protected healthcare records. Displayed under clinical administrative privileges in compliance
                            with digital healthcare privacy policies.
                          </span>
                        </div>
                      </div>

                      {/* Latest Vitals Dashboard */}
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Thermometer size={14} className="text-teal-600" />
                          <span>Latest Recorded Patient Vitals</span>
                        </h4>

                        {patientData.careReports.latestVitals ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">BP</span>
                              <span className="font-bold text-slate-900 text-sm">
                                {patientData.careReports.latestVitals.bloodPressure || '—'}
                              </span>
                              <span className="text-[9px] text-slate-400 block">mmHg</span>
                            </div>

                            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pulse</span>
                              <span className="font-bold text-slate-900 text-sm">
                                {patientData.careReports.latestVitals.pulseRate || '—'}
                              </span>
                              <span className="text-[9px] text-slate-400 block">bpm</span>
                            </div>

                            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">SpO2</span>
                              <span className="font-bold text-slate-900 text-sm">
                                {patientData.careReports.latestVitals.oxygenSaturation
                                  ? `${patientData.careReports.latestVitals.oxygenSaturation}%`
                                  : '—'}
                              </span>
                              <span className="text-[9px] text-slate-400 block">Oxygen</span>
                            </div>

                            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Temp</span>
                              <span className="font-bold text-slate-900 text-sm">
                                {patientData.careReports.latestVitals.temperature
                                  ? `${patientData.careReports.latestVitals.temperature}°F`
                                  : '—'}
                              </span>
                              <span className="text-[9px] text-slate-400 block">Fahrenheit</span>
                            </div>

                            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Glucose</span>
                              <span className="font-bold text-slate-900 text-sm">
                                {patientData.careReports.latestVitals.bloodGlucose || '—'}
                              </span>
                              <span className="text-[9px] text-slate-400 block">mg/dL</span>
                            </div>

                            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pain</span>
                              <span className="font-bold text-slate-900 text-sm">
                                {patientData.careReports.latestVitals.painScale !== undefined
                                  ? `${patientData.careReports.latestVitals.painScale}/10`
                                  : '—'}
                              </span>
                              <span className="text-[9px] text-slate-400 block">Scale</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                            No vitals observations recorded yet for this patient.
                          </div>
                        )}
                      </div>

                      {/* Clinical Shift Reports & Health Updates */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <FileText size={14} className="text-teal-600" />
                            <span>Shift Logs &amp; Daily Health Updates ({patientData.careReports.totalCount})</span>
                          </h4>
                        </div>

                        {patientData.careReports.reports.length === 0 ? (
                          <div className="p-6 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                            No clinical reports or nursing documentation submitted yet.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {patientData.careReports.reports.map((report: any) => (
                              <div
                                key={report.id}
                                className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">
                                      {new Date(report.date).toLocaleDateString()}
                                    </span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-600 capitalize">
                                      {report.source === 'field_visit' ? 'Bedside Shift Report' : 'Daily Health Update'}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    By: {report.recordedBy?.name || 'Healthcare Provider'}
                                  </span>
                                </div>

                                {report.vitals && (
                                  <div className="flex flex-wrap gap-3 text-[11px] bg-slate-50 p-2 rounded-lg text-slate-700">
                                    {report.vitals.bloodPressure && (
                                      <span>BP: <strong>{report.vitals.bloodPressure}</strong></span>
                                    )}
                                    {report.vitals.pulseRate && (
                                      <span>Pulse: <strong>{report.vitals.pulseRate} bpm</strong></span>
                                    )}
                                    {report.vitals.oxygenSaturation && (
                                      <span>SpO2: <strong>{report.vitals.oxygenSaturation}%</strong></span>
                                    )}
                                    {report.vitals.temperature && (
                                      <span>Temp: <strong>{report.vitals.temperature}°F</strong></span>
                                    )}
                                  </div>
                                )}

                                {report.observations && (
                                  <p className="text-slate-700 italic leading-relaxed">
                                    &ldquo;{report.observations}&rdquo;
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: Activity & Subscription History */}
                  {patientActiveTab === 'history' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-1">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">Account &amp; Lifecycle Activity</h4>
                          <p className="text-xs text-slate-500">
                            Authorized chronological audit log of patient registration and administrative operations
                          </p>
                        </div>
                      </div>

                      {patientData.recentActivity.length === 0 ? (
                        <div className="p-8 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                          No audit activity recorded yet.
                        </div>
                      ) : (
                        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                          {patientData.recentActivity.map((act: any) => (
                            <div key={act.id} className="relative group text-xs">
                              <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-teal-600 border-2 border-white shadow-xs" />
                              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900 font-mono text-[11px]">
                                    {act.action}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {new Date(act.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-slate-600 text-[11px]">
                                  Actor: <strong className="text-slate-800">{act.actorName}</strong> (
                                  <span className="capitalize">{act.actorRole}</span>)
                                </div>
                                {act.details && Object.keys(act.details).length > 0 && (
                                  <div className="pt-1 text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/60 mt-1">
                                    {act.details.reason && (
                                      <div>
                                        Reason: <em>&ldquo;{act.details.reason}&rdquo;</em>
                                      </div>
                                    )}
                                    {act.details.planTitle && (
                                      <div>Package: <strong>{act.details.planTitle}</strong></div>
                                    )}
                                    {act.details.newCaregiverName && (
                                      <div>Assigned Staff: <strong>{act.details.newCaregiverName}</strong></div>
                                    )}
                                    {act.details.registrationMethod && (
                                      <div>Method: {act.details.registrationMethod}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400">
                VivoQuest Clinical Management • Authorized Admin Access
              </span>
              <button
                type="button"
                onClick={() => setShowPatientModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Visit Modal */}
      {showScheduleModal && selectedSubForSchedule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-600" />
                  <span>Schedule &amp; Assign Field Visit</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Subscription: <strong className="font-mono text-slate-800">{selectedSubForSchedule.subscriptionNumber}</strong> • Patient: <strong className="text-slate-800">{selectedSubForSchedule.patientName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Read-Only Subscription Plan Info */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-slate-500 block text-[11px]">Package</span>
                <span className="font-bold text-slate-800">{selectedSubForSchedule.planTitle}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Remaining Visits</span>
                <span className="font-bold text-indigo-700">{selectedSubForSchedule.visitsRemaining} / {selectedSubForSchedule.totalVisitsIncluded}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Duration/Shift</span>
                <span className="font-semibold text-slate-800">{selectedSubForSchedule.hoursPerVisit || 8} Hours</span>
              </div>
            </div>

            <form onSubmit={handleScheduleVisitSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Visit Date *</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={scheduleForm.scheduledDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Time Slot *</label>
                  <select
                    value={scheduleForm.timeSlot}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, timeSlot: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="08:00 - 10:00">08:00 - 10:00 (Morning)</option>
                    <option value="09:00 - 11:00">09:00 - 11:00 (Morning)</option>
                    <option value="10:00 - 12:00">10:00 - 12:00 (Late Morning)</option>
                    <option value="12:00 - 14:00">12:00 - 14:00 (Midday)</option>
                    <option value="14:00 - 16:00">14:00 - 16:00 (Afternoon)</option>
                    <option value="16:00 - 18:00">16:00 - 18:00 (Late Afternoon)</option>
                    <option value="18:00 - 20:00">18:00 - 20:00 (Evening)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Service / Visit Type *</label>
                <select
                  value={scheduleForm.visitType}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, visitType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="clinical_care">Clinical Care &amp; Bedside Monitoring</option>
                  <option value="nursing_procedure">Nursing Procedure / Wound Dressing</option>
                  <option value="physiotherapy">Physiotherapy &amp; Mobility Support</option>
                  <option value="palliative_assessment">Palliative Care Assessment</option>
                  <option value="equipment_installation">Equipment Installation &amp; Setup</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Nurse / Caregiver *</label>
                <select
                  value={scheduleForm.providerId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, providerId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Select Qualified Provider --</option>
                  {caregiversList
                    .filter((c) => Boolean(c.userId))
                    .map((c) => (
                      <option key={c.userId} value={c.userId}>
                        {c.fullName} ({c.professionType || 'Nurse/Caregiver'}) - {c.registrationNumber || 'Verified Staff'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Authorized Care Instructions &amp; Notes</label>
                <textarea
                  rows={2}
                  value={scheduleForm.instructions}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, instructions: e.target.value })}
                  placeholder="Clinical instructions, vitals monitoring protocols, dietary checks, or family coordination notes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading ? 'Scheduling...' : 'Confirm & Schedule Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

