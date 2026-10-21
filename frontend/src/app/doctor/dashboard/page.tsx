'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Settings,
  Plus,
  ArrowRight,
  MapPin,
  Building2,
  Video,
  Home,
  FileText,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  TrendingUp,
  Stethoscope,
  Pill,
  Navigation,
  Search,
  Filter,
  HeartPulse,
  Activity,
  ChevronRight,
  Eye,
  CalendarClock,
  Sparkles,
  Info,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { LoadingState, EmptyState, ErrorState } from '@/components/UIStates';
import { doctorsApi, appointmentsApi, authApi, patientsApi } from '@/lib/api';

export default function DoctorDashboardPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'appointments' | 'updates'>('overview');

  // Core Data States
  const [doctorProfile, setDoctorProfile] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [healthUpdates, setHealthUpdates] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Patients Filters & Pagination
  const [patientSearch, setPatientSearch] = useState('');
  const [patientRiskFilter, setPatientRiskFilter] = useState('all');
  const [patientFollowUpFilter, setPatientFollowUpFilter] = useState('all');
  const [patientPage, setPatientPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [patientTotalPages, setPatientTotalPages] = useState(1);

  // Appointments View Sub-Filter
  const [aptView, setAptView] = useState<'today' | 'upcoming' | 'pending' | 'completed'>('today');
  const [aptModeFilter, setAptModeFilter] = useState('all');

  // Daily Updates Sub-Filter
  const [updateStatusFilter, setUpdateStatusFilter] = useState<'all' | 'new' | 'reviewed' | 'follow_up_required'>('all');

  // Consultation Completion Modal State
  const [completingApt, setCompletingApt] = useState<any | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescriptionMedicines, setPrescriptionMedicines] = useState([
    { name: 'Paracetamol 650mg', dosage: '1 tab', frequency: 'TDS (3x daily)', duration: '5 days', instructions: 'After meals' },
  ]);
  const [recommendations, setRecommendations] = useState('Maintain gentle ambulation and regular hydration.');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  // Review Health Update Modal State
  const [reviewingUpdate, setReviewingUpdate] = useState<any | null>(null);
  const [reviewStatusChoice, setReviewStatusChoice] = useState<'reviewed' | 'follow_up_required'>('reviewed');
  const [clinicianReviewNote, setClinicianReviewNote] = useState('');
  const [followUpActionText, setFollowUpActionText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Quick Demo Update Submission Modal
  const [showSimulateUpdateModal, setShowSimulateUpdateModal] = useState(false);
  const [simPatientId, setSimPatientId] = useState('');
  const [simSpO2, setSimSpO2] = useState<number>(93);
  const [simBP, setSimBP] = useState('125/82');
  const [simPulse, setSimPulse] = useState<number>(80);
  const [simSymptom, setSimSymptom] = useState('Mild breathlessness on stair climbing');
  const [simSubmitting, setSimSubmitting] = useState(false);

  // Demo Doctor Login Switcher
  const handleLoginAsDemoDoctor = async (phone = '9820011001') => {
    setIsLoading(true);
    try {
      await authApi.login({
        identifier: phone,
        password: 'Password#2026',
        role: 'professional',
      });
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Demo doctor login failed');
      setIsLoading(false);
    }
  };

  // Main Data Loader
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = authApi.getStoredUser();
      setCurrentUser(user);

      if (!user || (user.role !== 'professional' && user.role !== 'admin')) {
        setIsLoading(false);
        return;
      }

      // Parallel fetch for doctor overview data
      const [profileData, statsData, apptsData, patientsRes, updatesData] = await Promise.all([
        doctorsApi.getDoctorProfile().catch(() => null),
        doctorsApi.getDashboardStats().catch(() => null),
        doctorsApi.getDoctorAppointments({
          view: aptView === 'pending' ? 'pending_requests' : aptView,
        }).catch(() => []),
        doctorsApi.getAssignedPatients({
          search: patientSearch,
          riskLevel: patientRiskFilter,
          followUpStatus: patientFollowUpFilter,
          page: patientPage,
          limit: 10,
        }).catch(() => ({ data: [], total: 0, totalPages: 1 })),
        doctorsApi.getHealthUpdatesQueue({
          status: updateStatusFilter,
        }).catch(() => []),
      ]);

      setDoctorProfile(profileData);
      setStats(statsData);
      setAppointments(apptsData || []);
      setPatients(patientsRes?.data || []);
      setTotalPatients(patientsRes?.total || 0);
      setPatientTotalPages(patientsRes?.totalPages || 1);
      setHealthUpdates(updatesData || []);

      if (patientsRes?.data?.length > 0 && !simPatientId) {
        setSimPatientId(patientsRes.data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load doctor dashboard:', err);
      setError(err.message || 'Failed to load clinician dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [aptView, patientSearch, patientRiskFilter, patientFollowUpFilter, patientPage, updateStatusFilter]);

  // Handle Quick Status Change (Accept / Decline)
  const handleQuickStatusChange = async (aptId: string, newStatus: string) => {
    try {
      await appointmentsApi.updateStatus(aptId, { status: newStatus });
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to update appointment status');
    }
  };

  // Complete Consultation
  const handleCompleteConsultation = async () => {
    if (!completingApt) return;
    setIsUpdatingStatus(true);
    setStatusUpdateError(null);
    try {
      await appointmentsApi.updateStatus(completingApt.id || completingApt._id, {
        status: 'completed',
        doctorNotes: clinicalNotes,
        prescription: {
          medicines: prescriptionMedicines.filter((m) => m.name.trim().length > 0),
          recommendations,
        },
      });
      setCompletingApt(null);
      await loadDashboardData();
    } catch (err: any) {
      setStatusUpdateError(err.message || 'Failed to complete visit');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Review Daily Update
  const handleSubmitUpdateReview = async () => {
    if (!reviewingUpdate || !clinicianReviewNote.trim()) return;
    setIsSubmittingReview(true);
    try {
      await doctorsApi.reviewHealthUpdate(reviewingUpdate.id || reviewingUpdate._id, {
        reviewStatus: reviewStatusChoice,
        clinicianNotes: clinicianReviewNote.trim(),
        followUpAction: followUpActionText.trim() || undefined,
      });
      setReviewingUpdate(null);
      setClinicianReviewNote('');
      setFollowUpActionText('');
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Simulate Health Update Submission for demo
  const handleSimulateUpdateSubmit = async () => {
    if (!simPatientId) return;
    setSimSubmitting(true);
    try {
      await patientsApi.submitHealthUpdate({
        patientId: simPatientId,
        submitterName: 'Caregiver / Patient (Demonstration)',
        relationship: 'caregiver',
        symptoms: [simSymptom],
        vitals: {
          spO2: simSpO2,
          bloodPressure: simBP,
          pulse: simPulse,
        },
        notes: 'Recorded via home monitoring kit.',
      });
      setShowSimulateUpdateModal(false);
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Simulation submission failed');
    } finally {
      setSimSubmitting(false);
    }
  };

  // Render Risk Chip
  const renderRiskBadge = (risk: any) => {
    if (!risk || !risk.level) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          Unclassified
        </span>
      );
    }
    if (risk.level === 'high') {
      return (
        <span
          title={risk.reason || 'Critical clinical indicator flagged'}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200"
        >
          <AlertCircle size={12} className="text-red-600" />
          High Risk
        </span>
      );
    }
    if (risk.level === 'medium') {
      return (
        <span
          title={risk.reason || 'Parameter warrants active clinician monitoring'}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200"
        >
          <AlertTriangle size={12} className="text-amber-700" />
          Medium Risk
        </span>
      );
    }
    return (
      <span
        title={risk.reason || 'Parameters within baseline guidelines'}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"
      >
        <CheckCircle2 size={12} className="text-emerald-600" />
        Low Risk
      </span>
    );
  };

  // Render Follow-up Badge
  const renderFollowUpBadge = (followUp: any) => {
    if (!followUp || followUp.status === 'none') {
      return <span className="text-xs text-slate-400">None scheduled</span>;
    }
    if (followUp.status === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <CalendarClock size={11} />
          Overdue ({followUp.overdueDays}d)
        </span>
      );
    }
    if (followUp.status === 'due_soon') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock size={11} />
          Due {followUp.dueDate}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Check size={11} />
        Up to date ({followUp.dueDate})
      </span>
    );
  };

  return (
    <div className="w-full bg-[#F4F9FC] min-h-screen flex flex-col font-sans text-slate-800">
      <Navbar />

      {/* Top Clinician Hero & Profile Header */}
      <section className="w-full bg-white border-b border-slate-200 pt-6 pb-6 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1976D2]/10 border border-[#1976D2]/20 flex items-center justify-center text-[#1976D2] shrink-0 font-bold text-xl shadow-xs">
                {doctorProfile?.title === 'PT' ? 'PT' : 'MD'}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#17324D] text-white text-xs font-semibold flex items-center gap-1 shadow-2xs">
                    <Stethoscope size={11} className="text-emerald-400" />
                    Doctor &amp; Clinician Console
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                    Verified Practitioner
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17324D] tracking-tight">
                  {doctorProfile?.fullName || currentUser?.fullName || 'Clinician Portal'}
                </h1>
                <p className="text-sm text-slate-600 mt-0.5">
                  {doctorProfile?.specializations?.join(' • ') || 'Palliative Care & Supportive Oncology'}
                  {doctorProfile?.yearsOfExperience ? ` • ${doctorProfile.yearsOfExperience} Years Clinical Practice` : ''}
                  {doctorProfile?.city ? ` • ${doctorProfile.city}` : ''}
                </p>
              </div>
            </div>

            {/* Quick Actions & Navigation Links */}
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/doctor/field-visits">
                <Button variant="outline" size="sm" className="bg-white border-slate-300 text-[#17324D] hover:bg-slate-50 gap-1.5 shadow-2xs">
                  <Navigation size={14} className="text-[#1976D2]" />
                  <span>Field Visits Console</span>
                </Button>
              </Link>
              <Link href="/doctor/schedule">
                <Button variant="outline" size="sm" className="bg-white border-slate-300 text-[#17324D] hover:bg-slate-50 gap-1.5 shadow-2xs">
                  <Settings size={14} className="text-slate-600" />
                  <span>Schedule &amp; Availability</span>
                </Button>
              </Link>
              <button
                onClick={() => setShowSimulateUpdateModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2E9E6F] text-white text-xs font-semibold hover:bg-[#25825b] transition-colors shadow-2xs"
              >
                <Sparkles size={13} />
                <span>Simulate Daily Update</span>
              </button>
            </div>
          </div>

          {/* Demo Clinician Switcher for testing */}
          <div className="mt-5 p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#17324D]">
              <ShieldCheck size={16} className="text-[#1976D2] shrink-0" />
              <span>
                <strong>Demonstration Switcher:</strong> Switch between verified specialists to test authorized patient isolation, accept/decline workflows, and clinical documentation.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLoginAsDemoDoctor('9820011001')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  currentUser?.phone === '9820011001'
                    ? 'bg-[#1976D2] text-white shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Dr. Aditi Rao (Oncologist)
              </button>
              <button
                onClick={() => handleLoginAsDemoDoctor('9820011002')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  currentUser?.phone === '9820011002'
                    ? 'bg-[#1976D2] text-white shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Dr. Sandeep Kulkarni (Palliative)
              </button>
              <button
                onClick={() => handleLoginAsDemoDoctor('9820011003')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  currentUser?.phone === '9820011003'
                    ? 'bg-[#1976D2] text-white shadow-2xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Priya Deshmukh (Physio)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main SaaS Dashboard Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4 mb-8">
          {/* Card 1: Assigned Patients */}
          <button
            onClick={() => setActiveTab('patients')}
            className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#1976D2]/40 transition-all text-left flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Patients</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1976D2] flex items-center justify-center">
                <Users size={15} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#17324D]">{stats?.assignedPatientsCount ?? 0}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Assigned to me</p>
            </div>
          </button>

          {/* Card 2: Today's Appointments */}
          <button
            onClick={() => {
              setActiveTab('appointments');
              setAptView('today');
            }}
            className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#1976D2]/40 transition-all text-left flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#2E9E6F] flex items-center justify-center">
                <Calendar size={15} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#17324D]">{stats?.todayCount ?? 0}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Today's queue</p>
            </div>
          </button>

          {/* Card 3: Upcoming Visits */}
          <button
            onClick={() => {
              setActiveTab('appointments');
              setAptView('upcoming');
            }}
            className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#1976D2]/40 transition-all text-left flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp size={15} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#17324D]">{stats?.upcomingCount ?? 0}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Scheduled visits</p>
            </div>
          </button>

          {/* Card 4: Pending Requests */}
          <button
            onClick={() => {
              setActiveTab('appointments');
              setAptView('pending');
            }}
            className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#1976D2]/40 transition-all text-left flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={15} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">{stats?.pendingCount ?? 0}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Needs decision</p>
            </div>
          </button>

          {/* Card 5: Completed */}
          <button
            onClick={() => {
              setActiveTab('appointments');
              setAptView('completed');
            }}
            className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#1976D2]/40 transition-all text-left flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#17324D]">{stats?.completedCount ?? 0}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Finished visits</p>
            </div>
          </button>

          {/* Card 6: Requiring Review */}
          <button
            onClick={() => setActiveTab('updates')}
            className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-rose-300 transition-all text-left flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Review Req.</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle size={15} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-700">{stats?.requiringReviewCount ?? 0}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Vitals / updates</p>
            </div>
          </button>

          {/* Card 7: Follow-ups Overdue & Due */}
          <button
            onClick={() => {
              setActiveTab('patients');
              setPatientFollowUpFilter('overdue');
            }}
            className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all text-left flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Follow-ups</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <CalendarClock size={15} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-extrabold ${stats?.followUpsOverdueCount > 0 ? 'text-rose-600' : 'text-[#17324D]'}`}>
                {stats?.followUpsOverdueCount ?? 0}
              </span>
              <span className="text-xs text-slate-500">overdue</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{stats?.followUpsDueCount ?? 0} due this week</p>
          </button>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 mb-6 bg-white px-3 sm:px-6 py-2.5 rounded-xl shadow-2xs">
          <div className="flex items-center gap-1 sm:gap-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-[#1976D2] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-[#17324D] hover:bg-slate-100'
              }`}
            >
              <Activity size={16} />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'patients'
                  ? 'bg-[#1976D2] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-[#17324D] hover:bg-slate-100'
              }`}
            >
              <Users size={16} />
              <span>My Assigned Patients</span>
              {stats?.assignedPatientsCount ? (
                <span className={`px-1.5 py-0.2 rounded-full text-xs ${activeTab === 'patients' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {stats.assignedPatientsCount}
                </span>
              ) : null}
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'appointments'
                  ? 'bg-[#1976D2] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-[#17324D] hover:bg-slate-100'
              }`}
            >
              <Calendar size={16} />
              <span>Appointments Queue</span>
              {stats?.pendingCount ? (
                <span className="px-1.5 py-0.2 rounded-full text-xs bg-amber-500 text-white font-bold">
                  {stats.pendingCount}
                </span>
              ) : null}
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'updates'
                  ? 'bg-[#1976D2] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-[#17324D] hover:bg-slate-100'
              }`}
            >
              <HeartPulse size={16} />
              <span>Daily Updates &amp; Triage</span>
              {stats?.requiringReviewCount ? (
                <span className="px-1.5 py-0.2 rounded-full text-xs bg-rose-500 text-white font-bold">
                  {stats.requiringReviewCount}
                </span>
              ) : null}
            </button>
          </div>

          <button
            onClick={() => loadDashboardData()}
            className="p-2 rounded-lg text-slate-500 hover:text-[#1976D2] hover:bg-blue-50 transition-colors"
            title="Refresh clinical data"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Loading / Error States */}
        {isLoading && (
          <div className="py-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs">
            <LoadingState message="Synchronizing clinical records, appointments queue, and patient vitals..." />
          </div>
        )}

        {error && !isLoading && (
          <div className="mb-6">
            <ErrorState title="Data Synchronization Notice" message={error} onRetry={() => loadDashboardData()} />
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {!isLoading && activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Today's Clinical Schedule */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-[#1976D2]" />
                    <h2 className="text-lg font-bold text-[#17324D]">Today's Scheduled Consultations</h2>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('appointments');
                      setAptView('today');
                    }}
                    className="text-xs font-semibold text-[#1976D2] hover:underline flex items-center gap-1"
                  >
                    View All <ArrowRight size={12} />
                  </button>
                </div>

                {appointments.filter((a) => a.appointmentDate === stats?.todayDate).length === 0 ? (
                  <div className="py-8 text-center bg-slate-50/70 rounded-xl border border-slate-200/60 p-6">
                    <Calendar className="mx-auto text-slate-400 mb-2" size={32} />
                    <h3 className="text-sm font-bold text-slate-700">No Consultations Scheduled for Today</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Your schedule is clear for today. Patients can book available slots based on your weekly working hours.
                    </p>
                    <div className="mt-4">
                      <Link href="/doctor/schedule">
                        <Button size="sm" variant="outline" className="text-xs">
                          Adjust Working Availability
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {appointments
                      .filter((a) => a.appointmentDate === stats?.todayDate)
                      .map((apt) => (
                        <div key={apt.id || apt._id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1976D2] flex items-center justify-center shrink-0 font-bold text-xs">
                              {apt.timeSlot?.startTime || '—'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/doctor/patients/${apt.patientId?._id || apt.patientId || apt.patientId?.id || ''}`}
                                  className="text-sm font-bold text-[#17324D] hover:text-[#1976D2] transition-colors"
                                >
                                  {apt.patientDetails?.fullName || 'Patient'}
                                </Link>
                                <span className="text-xs text-slate-500">
                                  {apt.patientDetails?.age ? `(${apt.patientDetails.age}y / ${apt.patientDetails.gender || ''})` : ''}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                                {apt.clinicalReason || 'General supportive consultation'}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1 capitalize">
                                  {apt.consultationMode === 'video' ? <Video size={11} className="text-blue-500" /> : null}
                                  {apt.consultationMode === 'home_visit' ? <Home size={11} className="text-emerald-500" /> : null}
                                  {apt.consultationMode === 'in_clinic' ? <Building2 size={11} className="text-purple-500" /> : null}
                                  {apt.consultationMode?.replace('_', ' ')}
                                </span>
                                <span>•</span>
                                <span className="font-mono text-slate-400">{apt.appointmentNumber}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <Link href={`/doctor/patients/${apt.patientId?._id || apt.patientId}`}>
                              <button className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
                                Dossier
                              </button>
                            </Link>
                            {apt.status === 'confirmed' && (
                              <button
                                onClick={() => {
                                  setCompletingApt(apt);
                                  setClinicalNotes(apt.clinicalReason ? `Consultation note for: ${apt.clinicalReason}` : '');
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg text-white bg-[#1976D2] hover:bg-[#1565C0] transition-colors shadow-2xs"
                              >
                                Complete Visit
                              </button>
                            )}
                            {apt.status === 'completed' && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Priority Triage Queue Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <HeartPulse size={18} className="text-rose-600" />
                    <h2 className="text-lg font-bold text-[#17324D]">Patient Health Updates Requiring Attention</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('updates')}
                    className="text-xs font-semibold text-[#1976D2] hover:underline flex items-center gap-1"
                  >
                    View All ({healthUpdates.filter((u) => u.reviewStatus === 'new').length}) <ArrowRight size={12} />
                  </button>
                </div>

                {healthUpdates.filter((u) => u.reviewStatus === 'new').length === 0 ? (
                  <div className="py-6 text-center bg-slate-50 rounded-xl border border-slate-200/60 p-4">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
                    <p className="text-xs text-slate-600 font-medium">All patient vitals and health logs have been reviewed.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {healthUpdates
                      .filter((u) => u.reviewStatus === 'new')
                      .slice(0, 3)
                      .map((up) => (
                        <div key={up.id || up._id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#17324D]">{up.patientId?.fullName || 'Patient'}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                                New Update
                              </span>
                              {up.vitals?.spO2 && up.vitals.spO2 < 92 && (
                                <span className="text-[11px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                                  SpO2 {up.vitals.spO2}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              <strong>Symptoms:</strong> {up.symptoms?.join(', ') || 'None reported'}
                            </p>
                            {up.notes && <p className="text-xs text-slate-500 italic mt-0.5">"{up.notes}"</p>}
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                              <span>Submitted by {up.submittedBy?.name} ({up.submittedBy?.relationship})</span>
                              <span>•</span>
                              <span>{new Date(up.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setReviewingUpdate(up);
                              setClinicianReviewNote('');
                              setReviewStatusChoice('reviewed');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1976D2] text-white hover:bg-[#1565C0] transition-colors shrink-0 shadow-2xs"
                          >
                            Review &amp; Advise
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Follow-up Alerts & Clinical Safety Guardrails */}
            <div className="space-y-6">
              {/* Follow-up Due Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={18} className="text-amber-600" />
                    <h3 className="text-base font-bold text-[#17324D]">Follow-up Continuity</h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    {stats?.followUpsOverdueCount ? `${stats.followUpsOverdueCount} Overdue` : 'On Track'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  VivoQuest clinical safety protocols flag patients when documented follow-up consultation dates elapse without an active appointment.
                </p>

                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-1.5 mb-4">
                  <div className="flex justify-between font-semibold">
                    <span>Due Within 7 Days:</span>
                    <span>{stats?.followUpsDueCount ?? 0} Patients</span>
                  </div>
                  <div className="flex justify-between font-semibold text-rose-700">
                    <span>Overdue Follow-ups:</span>
                    <span>{stats?.followUpsOverdueCount ?? 0} Patients</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveTab('patients');
                    setPatientFollowUpFilter('overdue');
                  }}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-[#17324D] bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Filter Overdue Patients</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Clinical Guardrails & Safety Protocols Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={18} className="text-[#2E9E6F]" />
                  <h3 className="text-base font-bold text-[#17324D]">Clinical Safety Protocols</h3>
                </div>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  Risk badges on this console are calculated strictly using transparent, approved clinical rules:
                </p>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0"></span>
                    <span>
                      <strong>High Risk:</strong> SpO2 &lt; 92%, BP &ge; 160/100 or &lt; 90/60, Pain &ge; 8/10, acute red-flag symptoms.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0"></span>
                    <span>
                      <strong>Medium Risk:</strong> Pulse &gt; 110 or &lt; 50, Glucose &gt; 250 or &lt; 70, follow-up &gt; 7 days overdue.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 mt-1 shrink-0"></span>
                    <span>
                      <strong>No Unsupported AI Diagnosis:</strong> Alerts are explainable and cite the documented medical parameter.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY ASSIGNED PATIENTS */}
        {!isLoading && activeTab === 'patients' && (
          <div className="space-y-6">
            {/* Search and Filters Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search assigned patient by name, phone, or VQ-PT ID..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setPatientPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#1976D2] focus:ring-1 focus:ring-[#1976D2]"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-600">Risk:</span>
                  <select
                    value={patientRiskFilter}
                    onChange={(e) => {
                      setPatientRiskFilter(e.target.value);
                      setPatientPage(1);
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="high">High Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="low">Low Risk</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-600">Follow-up:</span>
                  <select
                    value={patientFollowUpFilter}
                    onChange={(e) => {
                      setPatientFollowUpFilter(e.target.value);
                      setPatientPage(1);
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
                  >
                    <option value="all">All Follow-ups</option>
                    <option value="overdue">Overdue Only</option>
                    <option value="due_soon">Due Soon (&lt;7d)</option>
                    <option value="up_to_date">Up to Date</option>
                  </select>
                </div>

                {(patientSearch || patientRiskFilter !== 'all' || patientFollowUpFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setPatientSearch('');
                      setPatientRiskFilter('all');
                      setPatientFollowUpFilter('all');
                      setPatientPage(1);
                    }}
                    className="text-xs text-[#1976D2] hover:underline font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Patients Directory Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              {patients.length === 0 ? (
                <div className="py-12 text-center p-6">
                  <Users size={36} className="mx-auto text-slate-400 mb-2" />
                  <h3 className="text-base font-bold text-slate-700">No Authorized Patients Found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Only patients assigned to you via confirmed appointments or field visits appear here. Adjust your search or filters if necessary.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-4">Patient &amp; ID</th>
                        <th className="py-3 px-4">Demographics</th>
                        <th className="py-3 px-4">Primary Condition</th>
                        <th className="py-3 px-4">Latest Vitals / Update</th>
                        <th className="py-3 px-4">Risk Category</th>
                        <th className="py-3 px-4">Follow-up Plan</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {patients.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Name & ID */}
                          <td className="py-3.5 px-4">
                            <Link href={`/doctor/patients/${p.id}`} className="font-bold text-[#17324D] hover:text-[#1976D2] transition-colors">
                              {p.fullName}
                            </Link>
                            <div className="text-[11px] text-slate-400 font-mono">{p.patientNumber}</div>
                          </td>

                          {/* Demographics */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <div>{p.age ? `${p.age} yrs` : 'Age N/A'} • {p.gender || '—'}</div>
                            <div className="text-[11px] text-slate-400">{p.phone}</div>
                          </td>

                          {/* Primary Condition */}
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-[#17324D] line-clamp-1">{p.primaryCondition}</span>
                            {p.allergies?.length > 0 && (
                              <span className="text-[10px] text-rose-600 font-medium">
                                Allergy: {p.allergies.join(', ')}
                              </span>
                            )}
                          </td>

                          {/* Latest Vitals */}
                          <td className="py-3.5 px-4">
                            {p.latestUpdate?.vitals ? (
                              <div className="space-y-0.5 text-[11px]">
                                {p.latestUpdate.vitals.spO2 && (
                                  <span className={`inline-block px-1.5 py-0.2 rounded font-semibold mr-1.5 ${p.latestUpdate.vitals.spO2 < 92 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                                    SpO2: {p.latestUpdate.vitals.spO2}%
                                  </span>
                                )}
                                {p.latestUpdate.vitals.bloodPressure && (
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                                    BP: {p.latestUpdate.vitals.bloodPressure}
                                  </span>
                                )}
                                <div className="text-[10px] text-slate-400">
                                  {new Date(p.latestUpdate.submittedAt).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">No updates logged</span>
                            )}
                          </td>

                          {/* Risk Category */}
                          <td className="py-3.5 px-4">
                            {renderRiskBadge(p.riskCategory)}
                            {p.riskCategory?.reason && (
                              <p className="text-[10px] text-slate-500 mt-1 max-w-[160px] line-clamp-1" title={p.riskCategory.reason}>
                                {p.riskCategory.reason}
                              </p>
                            )}
                          </td>

                          {/* Follow-up */}
                          <td className="py-3.5 px-4">
                            {renderFollowUpBadge(p.followUp)}
                            {p.nextAppointment && (
                              <div className="text-[10px] text-slate-500 mt-1">
                                Next: {p.nextAppointment.date}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <Link href={`/doctor/patients/${p.id}`}>
                              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1976D2]/10 text-[#1976D2] hover:bg-[#1976D2] hover:text-white transition-colors">
                                View Profile
                              </button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {patientTotalPages > 1 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Showing page {patientPage} of {patientTotalPages} ({totalPatients} total patients)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={patientPage <= 1}
                      onClick={() => setPatientPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded bg-white border border-slate-200 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      disabled={patientPage >= patientTotalPages}
                      onClick={() => setPatientPage((p) => p + 1)}
                      className="px-2.5 py-1 rounded bg-white border border-slate-200 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: APPOINTMENTS QUEUE */}
        {!isLoading && activeTab === 'appointments' && (
          <div className="space-y-6">
            {/* View Filter Pills */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setAptView('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    aptView === 'today' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today's Queue ({stats?.todayCount ?? 0})
                </button>
                <button
                  onClick={() => setAptView('upcoming')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    aptView === 'upcoming' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Upcoming ({stats?.upcomingCount ?? 0})
                </button>
                <button
                  onClick={() => setAptView('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    aptView === 'pending' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending Requests ({stats?.pendingCount ?? 0})
                </button>
                <button
                  onClick={() => setAptView('completed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    aptView === 'completed' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Completed Consultations ({stats?.completedCount ?? 0})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Mode:</span>
                <select
                  value={aptModeFilter}
                  onChange={(e) => setAptModeFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="all">All Modes</option>
                  <option value="in_clinic">In-Clinic</option>
                  <option value="video">Telehealth Video</option>
                  <option value="home_visit">Home Visit</option>
                </select>
              </div>
            </div>

            {/* Appointments Cards Grid */}
            {appointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center p-6 shadow-2xs">
                <Calendar size={36} className="mx-auto text-slate-400 mb-2" />
                <h3 className="text-base font-bold text-slate-700">No Appointments in this View</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  There are no appointments matching your current view filter. Patients booking consultations will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments
                  .filter((a) => aptModeFilter === 'all' || a.consultationMode === aptModeFilter)
                  .map((apt) => (
                    <div key={apt.id || apt._id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700">
                            {apt.appointmentNumber}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                              apt.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : apt.status === 'confirmed'
                                ? 'bg-blue-100 text-blue-800'
                                : apt.status === 'pending'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {apt.status?.replace('_', ' ')}
                          </span>
                        </div>

                        <Link
                          href={`/doctor/patients/${apt.patientId?._id || apt.patientId}`}
                          className="text-base font-bold text-[#17324D] hover:text-[#1976D2] transition-colors"
                        >
                          {apt.patientDetails?.fullName || 'Patient'}
                        </Link>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {apt.patientDetails?.phone} • {apt.patientDetails?.age ? `${apt.patientDetails.age}y` : ''}
                        </div>

                        <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-[#17324D]">
                            <Calendar size={12} className="text-[#1976D2]" />
                            <span>{apt.appointmentDate} • {apt.timeSlot?.startTime} - {apt.timeSlot?.endTime}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 capitalize">
                            {apt.consultationMode === 'video' ? <Video size={12} className="text-blue-500" /> : null}
                            {apt.consultationMode === 'home_visit' ? <Home size={12} className="text-emerald-500" /> : null}
                            {apt.consultationMode === 'in_clinic' ? <Building2 size={12} className="text-purple-500" /> : null}
                            <span>{apt.consultationMode?.replace('_', ' ')}</span>
                          </div>
                          {apt.clinicalReason && (
                            <p className="text-slate-600 italic text-[11px] pt-1">
                              "{apt.clinicalReason}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Link href={`/doctor/patients/${apt.patientId?._id || apt.patientId}`}>
                          <button className="text-xs text-[#1976D2] font-semibold hover:underline">
                            View Patient Profile
                          </button>
                        </Link>

                        <div className="flex items-center gap-2">
                          {apt.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleQuickStatusChange(apt.id || apt._id, 'confirmed')}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleQuickStatusChange(apt.id || apt._id, 'declined')}
                                className="px-3 py-1 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {apt.status === 'confirmed' && (
                            <button
                              onClick={() => {
                                setCompletingApt(apt);
                                setClinicalNotes(apt.clinicalReason ? `Consultation note for: ${apt.clinicalReason}` : '');
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1976D2] text-white hover:bg-[#1565C0] transition-colors shadow-2xs"
                            >
                              Complete Visit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DAILY HEALTH UPDATES & TRIAGE */}
        {!isLoading && activeTab === 'updates' && (
          <div className="space-y-6">
            {/* Status Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setUpdateStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    updateStatusFilter === 'all' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  All Updates
                </button>
                <button
                  onClick={() => setUpdateStatusFilter('new')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    updateStatusFilter === 'new' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  New / Unreviewed ({healthUpdates.filter((u) => u.reviewStatus === 'new').length})
                </button>
                <button
                  onClick={() => setUpdateStatusFilter('reviewed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    updateStatusFilter === 'reviewed' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Reviewed
                </button>
                <button
                  onClick={() => setUpdateStatusFilter('follow_up_required')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    updateStatusFilter === 'follow_up_required' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Follow-up Required
                </button>
              </div>

              <button
                onClick={() => setShowSimulateUpdateModal(true)}
                className="text-xs font-semibold text-[#1976D2] hover:underline flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Simulate Patient Update</span>
              </button>
            </div>

            {/* Updates List */}
            {healthUpdates.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center p-6 shadow-2xs">
                <HeartPulse size={36} className="mx-auto text-slate-400 mb-2" />
                <h3 className="text-base font-bold text-slate-700">No Patient Updates in Queue</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Assigned patients or their registered caregivers submit daily symptoms, notes, and vitals here for clinical triage.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {healthUpdates.map((up) => (
                  <div key={up.id || up._id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/doctor/patients/${up.patientId?._id || up.patientId}`}
                            className="font-bold text-sm text-[#17324D] hover:text-[#1976D2] transition-colors"
                          >
                            {up.patientId?.fullName || 'Patient'}
                          </Link>
                          <span className="text-[11px] text-slate-500">
                            • Submitted by {up.submittedBy?.name} ({up.submittedBy?.relationship})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(up.submittedAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            up.reviewStatus === 'new'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : up.reviewStatus === 'reviewed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {up.reviewStatus === 'new' ? 'New (Pending Review)' : up.reviewStatus?.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Patient-Reported
                        </span>
                      </div>
                    </div>

                    {/* Vitals Grid */}
                    {up.vitals && (
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 my-3">
                        {up.vitals.spO2 !== undefined && (
                          <div className={`p-2 rounded-lg border text-center ${up.vitals.spO2 < 92 ? 'bg-red-50 border-red-200 text-red-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                            <div className="text-[10px] uppercase font-bold text-slate-400">SpO2</div>
                            <div className="text-sm">{up.vitals.spO2}%</div>
                          </div>
                        )}
                        {up.vitals.bloodPressure && (
                          <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 text-center text-slate-700">
                            <div className="text-[10px] uppercase font-bold text-slate-400">BP</div>
                            <div className="text-sm font-semibold">{up.vitals.bloodPressure}</div>
                          </div>
                        )}
                        {up.vitals.pulse && (
                          <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 text-center text-slate-700">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Pulse</div>
                            <div className="text-sm font-semibold">{up.vitals.pulse} bpm</div>
                          </div>
                        )}
                        {up.vitals.temperature && (
                          <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 text-center text-slate-700">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Temp</div>
                            <div className="text-sm font-semibold">{up.vitals.temperature}°F</div>
                          </div>
                        )}
                        {up.vitals.glucose && (
                          <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 text-center text-slate-700">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Glucose</div>
                            <div className="text-sm font-semibold">{up.vitals.glucose} mg/dL</div>
                          </div>
                        )}
                        {up.vitals.painScale && (
                          <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 text-center text-slate-700">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Pain Scale</div>
                            <div className="text-sm font-semibold">{up.vitals.painScale}/10</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Symptoms & Notes */}
                    <div className="text-xs space-y-1.5 text-slate-700 mt-2">
                      {up.symptoms && up.symptoms.length > 0 && (
                        <div>
                          <strong>Reported Symptoms:</strong>{' '}
                          {up.symptoms.map((s: string, idx: number) => (
                            <span key={idx} className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] mr-1">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {up.notes && (
                        <p className="text-slate-600 italic">
                          "{up.notes}"
                        </p>
                      )}
                    </div>

                    {/* Risk Indicators if any */}
                    {up.riskIndicators?.length > 0 && (
                      <div className="mt-2.5 p-2 rounded-lg bg-red-50/70 border border-red-200 text-[11px] text-red-900 space-y-0.5">
                        {up.riskIndicators.map((r: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-1">
                            <AlertCircle size={12} className="text-red-600 mt-0.5 shrink-0" />
                            <span><strong>Clinical Protocol Alert:</strong> {r.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Existing Clinician Review Advice */}
                    {up.clinicianNotes && (
                      <div className="mt-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
                        <div className="font-bold text-[#1976D2] mb-0.5">
                          Doctor Review by {up.reviewedBy?.fullName || 'Clinician'} ({new Date(up.reviewedAt).toLocaleDateString()}):
                        </div>
                        <p className="text-slate-700">{up.clinicianNotes}</p>
                        {up.followUpAction && (
                          <p className="text-emerald-800 font-semibold mt-1">Action: {up.followUpAction}</p>
                        )}
                      </div>
                    )}

                    {/* Action button */}
                    <div className="mt-3 pt-2 flex items-center justify-end">
                      <button
                        onClick={() => {
                          setReviewingUpdate(up);
                          setClinicianReviewNote(up.clinicianNotes || '');
                          setFollowUpActionText(up.followUpAction || '');
                          setReviewStatusChoice(up.reviewStatus === 'follow_up_required' ? 'follow_up_required' : 'reviewed');
                        }}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1976D2] text-white hover:bg-[#1565C0] transition-colors shadow-2xs"
                      >
                        {up.reviewStatus === 'new' ? 'Review & Document Advice' : 'Update Review Advice'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: COMPLETE CONSULTATION */}
      {completingApt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#17324D]">Complete Patient Consultation</h3>
                <p className="text-xs text-slate-500">
                  Patient: {completingApt.patientDetails?.fullName} • {completingApt.appointmentNumber}
                </p>
              </div>
              <button onClick={() => setCompletingApt(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {statusUpdateError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                {statusUpdateError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Clinical Examination &amp; Assessment Notes
                </label>
                <textarea
                  rows={4}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Document clinical assessment, symptom severity, physical findings, and patient response..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#1976D2]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">Prescription Medicines</label>
                  <button
                    type="button"
                    onClick={() =>
                      setPrescriptionMedicines([
                        ...prescriptionMedicines,
                        { name: '', dosage: '1 tab', frequency: 'OD (Once daily)', duration: '7 days', instructions: 'After meals' },
                      ])
                    }
                    className="text-xs font-bold text-[#1976D2] hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Medicine
                  </button>
                </div>

                <div className="space-y-2">
                  {prescriptionMedicines.map((med, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <input
                        placeholder="Drug name & strength"
                        value={med.name}
                        onChange={(e) => {
                          const updated = [...prescriptionMedicines];
                          updated[idx].name = e.target.value;
                          setPrescriptionMedicines(updated);
                        }}
                        className="p-1.5 rounded border border-slate-300 bg-white"
                      />
                      <input
                        placeholder="Dosage (e.g. 1 tab)"
                        value={med.dosage}
                        onChange={(e) => {
                          const updated = [...prescriptionMedicines];
                          updated[idx].dosage = e.target.value;
                          setPrescriptionMedicines(updated);
                        }}
                        className="p-1.5 rounded border border-slate-300 bg-white"
                      />
                      <input
                        placeholder="Frequency (e.g. BD)"
                        value={med.frequency}
                        onChange={(e) => {
                          const updated = [...prescriptionMedicines];
                          updated[idx].frequency = e.target.value;
                          setPrescriptionMedicines(updated);
                        }}
                        className="p-1.5 rounded border border-slate-300 bg-white"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          placeholder="Duration"
                          value={med.duration}
                          onChange={(e) => {
                            const updated = [...prescriptionMedicines];
                            updated[idx].duration = e.target.value;
                            setPrescriptionMedicines(updated);
                          }}
                          className="p-1.5 rounded border border-slate-300 bg-white flex-1"
                        />
                        {prescriptionMedicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setPrescriptionMedicines(prescriptionMedicines.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supportive Care Recommendations
                </label>
                <input
                  type="text"
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="e.g. Hydration target, breathing exercises, next review in 14 days"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCompletingApt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleCompleteConsultation}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1976D2] hover:bg-[#1565C0] disabled:opacity-50"
              >
                {isUpdatingStatus ? 'Recording...' : 'Submit & Complete Consultation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CLINICIAN REVIEW FOR HEALTH UPDATE */}
      {reviewingUpdate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#17324D]">Review Patient Health Update</h3>
                <p className="text-xs text-slate-500">Patient: {reviewingUpdate.patientId?.fullName}</p>
              </div>
              <button onClick={() => setReviewingUpdate(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Review Status Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatusChoice('reviewed')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                      reviewStatusChoice === 'reviewed'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Reviewed &amp; Stable
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatusChoice('follow_up_required')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                      reviewStatusChoice === 'follow_up_required'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Follow-up Required
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Clinician Review Observations &amp; Advice *
                </label>
                <textarea
                  rows={3}
                  value={clinicianReviewNote}
                  onChange={(e) => setClinicianReviewNote(e.target.value)}
                  placeholder="e.g. Advised incentive spirometry, monitor SpO2 twice daily, continue current oral analgesia..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#1976D2]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Specific Follow-up Action (Optional)
                </label>
                <input
                  type="text"
                  value={followUpActionText}
                  onChange={(e) => setFollowUpActionText(e.target.value)}
                  placeholder="e.g. Scheduled field nurse visit for vitals check tomorrow"
                  className="w-full p-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewingUpdate(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReview || !clinicianReviewNote.trim()}
                onClick={handleSubmitUpdateReview}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#1976D2] hover:bg-[#1565C0] disabled:opacity-50"
              >
                {isSubmittingReview ? 'Submitting...' : 'Save Clinician Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SIMULATE PATIENT UPDATE (FOR DEMONSTRATION & TESTING) */}
      {showSimulateUpdateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#17324D]">Submit Patient Health Update</h3>
                <p className="text-xs text-slate-500">Simulate caregiver/patient daily health log</p>
              </div>
              <button onClick={() => setShowSimulateUpdateModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Assigned Patient</label>
                <select
                  value={simPatientId}
                  onChange={(e) => setSimPatientId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.patientNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5">SpO2 (%)</label>
                  <input
                    type="number"
                    value={simSpO2}
                    onChange={(e) => setSimSpO2(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                  <span className="text-[10px] text-slate-400">&lt;92% triggers alert</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5">Blood Pressure</label>
                  <input
                    type="text"
                    value={simBP}
                    onChange={(e) => setSimBP(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5">Pulse (bpm)</label>
                  <input
                    type="number"
                    value={simPulse}
                    onChange={(e) => setSimPulse(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Patient-Reported Symptom</label>
                <input
                  type="text"
                  value={simSymptom}
                  onChange={(e) => setSimSymptom(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSimulateUpdateModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={simSubmitting || !simPatientId}
                onClick={handleSimulateUpdateSubmit}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#2E9E6F] hover:bg-[#25825b] disabled:opacity-50"
              >
                {simSubmitting ? 'Submitting...' : 'Submit Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
