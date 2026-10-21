'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Video,
  Home,
  FileText,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Activity,
  Pill,
  Stethoscope,
  Plus,
  RefreshCw,
  ExternalLink,
  CalendarClock,
  FileCheck,
  ClipboardList,
  AlertOctagon,
  Sparkles,
  Info,
  Check,
  X,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { LoadingState, EmptyState, ErrorState } from '@/components/UIStates';
import { doctorsApi, authApi, ApiClientError } from '@/lib/api';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PatientDossierPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;
  const router = useRouter();

  const [dossier, setDossier] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'updates' | 'notes' | 'appointments' | 'documents' | 'followup'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // New Clinical Note Modal State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteSubjective, setNoteSubjective] = useState('');
  const [noteObjective, setNoteObjective] = useState('');
  const [noteAssessment, setNoteAssessment] = useState('');
  const [notePlan, setNotePlan] = useState('');
  const [noteFollowUpInstructions, setNoteFollowUpInstructions] = useState('');
  const [noteFollowUpDate, setNoteFollowUpDate] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Follow-up Plan Modal State
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpTargetDate, setFollowUpTargetDate] = useState('');
  const [followUpCareTasks, setFollowUpCareTasks] = useState('Check SpO2 twice daily, Wound dressing change, Pain log check');
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);

  // Review Update Modal State
  const [selectedUpdateForReview, setSelectedUpdateForReview] = useState<any | null>(null);
  const [reviewStatusChoice, setReviewStatusChoice] = useState<'reviewed' | 'follow_up_required'>('reviewed');
  const [reviewClinicianNotes, setReviewClinicianNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadPatientDossier = async () => {
    setIsLoading(true);
    setError(null);
    setIsForbidden(false);
    try {
      const data = await doctorsApi.getPatientDossier(patientId);
      setDossier(data);
      if (data?.followUpPlan?.dueDate) {
        setFollowUpTargetDate(data.followUpPlan.dueDate);
      }
    } catch (err: any) {
      console.error('Failed to load patient dossier:', err);
      if ((err instanceof ApiClientError && err.status === 403) || err?.status === 403 || err?.message?.includes('403')) {
        setIsForbidden(true);
      } else {
        setError(err.message || 'Failed to load patient clinical dossier.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatientDossier();
  }, [patientId]);

  // Handle Note Submission
  const handleSaveClinicalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteAssessment.trim() || !notePlan.trim()) return;

    setIsSubmittingNote(true);
    try {
      await doctorsApi.addClinicalNote(patientId, {
        subjective: noteSubjective.trim() || undefined,
        objective: noteObjective.trim() || undefined,
        assessment: noteAssessment.trim(),
        plan: notePlan.trim(),
        followUpInstructions: noteFollowUpInstructions.trim() || undefined,
        followUpDate: noteFollowUpDate || undefined,
      });
      setShowNoteModal(false);
      setNoteSubjective('');
      setNoteObjective('');
      setNoteAssessment('');
      setNotePlan('');
      setNoteFollowUpInstructions('');
      setNoteFollowUpDate('');
      await loadPatientDossier();
    } catch (err: any) {
      alert(err.message || 'Failed to save clinical note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Handle Follow-up Plan Update
  const handleSaveFollowUpPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpTargetDate) return;

    setIsSubmittingFollowUp(true);
    try {
      const tasks = followUpCareTasks
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await doctorsApi.updateFollowUpPlan(patientId, {
        followUpDate: followUpTargetDate,
        careTasks: tasks,
        instructions: followUpInstructions.trim() || undefined,
      });
      setShowFollowUpModal(false);
      await loadPatientDossier();
    } catch (err: any) {
      alert(err.message || 'Failed to update follow-up plan');
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  // Handle Update Review
  const handleSaveReview = async () => {
    if (!selectedUpdateForReview || !reviewClinicianNotes.trim()) return;

    setIsSubmittingReview(true);
    try {
      await doctorsApi.reviewHealthUpdate(selectedUpdateForReview.id, {
        reviewStatus: reviewStatusChoice,
        clinicianNotes: reviewClinicianNotes.trim(),
      });
      setSelectedUpdateForReview(null);
      setReviewClinicianNotes('');
      await loadPatientDossier();
    } catch (err: any) {
      alert(err.message || 'Failed to review health update');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-[#F4F9FC] min-h-screen flex flex-col font-sans">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-16 flex-1 w-full">
          <LoadingState message="Decrypting and synchronizing patient clinical dossier &amp; audit history..." />
        </main>
        <Footer />
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="w-full bg-[#F4F9FC] min-h-screen flex flex-col font-sans">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-16 flex-1 w-full">
          <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertOctagon size={28} />
            </div>
            <h2 className="text-xl font-bold text-[#17324D] mb-2">Access Restricted (403 Forbidden)</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-lg mx-auto leading-relaxed">
              You are not an authorized healthcare clinician for this patient. Under VivoQuest clinical security policies and patient privacy standards, medical records are accessible only to clinicians with an active consultation, referral, or assigned field care relationship.
            </p>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 mb-6 max-w-md mx-auto">
              This unauthorized access attempt has been logged in the platform security audit trail.
            </div>
            <Link href="/doctor/dashboard">
              <Button className="bg-[#1976D2] hover:bg-[#1565C0] text-xs font-semibold gap-1.5">
                <ArrowLeft size={14} /> Back to Doctor Dashboard
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="w-full bg-[#F4F9FC] min-h-screen flex flex-col font-sans">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-16 flex-1 w-full">
          <ErrorState
            title="Unable to Open Patient Profile"
            message={error || 'Clinical dossier record not found or inaccessible.'}
            onRetry={() => loadPatientDossier()}
          />
        </main>
        <Footer />
      </div>
    );
  }

  const { overview, medicalHistory, dailyUpdates, clinicalNotes, appointmentsAndVisits, documents, followUpPlan, riskAssessment } = dossier;

  return (
    <div className="w-full bg-[#F4F9FC] min-h-screen flex flex-col font-sans text-slate-800">
      <Navbar />

      {/* Top Breadcrumb & Profile Header */}
      <section className="w-full bg-white border-b border-slate-200 pt-5 pb-6 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-3">
            <Link
              href="/doctor/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1976D2] transition-colors"
            >
              <ArrowLeft size={14} /> Back to Clinician Dashboard
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#17324D] text-white flex items-center justify-center shrink-0 font-extrabold text-xl shadow-xs">
                {overview.fullName?.charAt(0) || 'P'}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17324D] tracking-tight">
                    {overview.fullName}
                  </h1>
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {overview.patientNumber}
                  </span>
                  {/* Risk Badge */}
                  {riskAssessment && (
                    <span
                      title={riskAssessment.primaryReason}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        riskAssessment.level === 'high'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : riskAssessment.level === 'medium'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {riskAssessment.level === 'high' && <AlertCircle size={12} />}
                      {riskAssessment.level === 'medium' && <AlertTriangle size={12} />}
                      {riskAssessment.level === 'low' && <CheckCircle2 size={12} />}
                      {riskAssessment.level?.toUpperCase()} RISK
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span>
                    <strong>Age:</strong> {overview.age ? `${overview.age} Years` : 'N/A'} • {overview.gender || '—'}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Blood Group:</strong> {overview.bloodGroup || 'Unknown'}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Phone:</strong> {overview.phone}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Primary Diagnosis:</strong> {overview.currentCarePlan || 'Palliative Assessment'}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowNoteModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1976D2] hover:bg-[#1565C0] transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <FileText size={14} />
                <span>Add Clinical Note</span>
              </button>
              <button
                onClick={() => setShowFollowUpModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#17324D] bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <CalendarClock size={14} />
                <span>Update Follow-up</span>
              </button>
            </div>
          </div>

          {/* Explainable Risk Reason Banner if flagged */}
          {riskAssessment && riskAssessment.level !== 'low' && (
            <div className="mt-4 p-3 rounded-xl bg-red-50/80 border border-red-200/80 text-xs text-red-900 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong>Active Clinical Safety Indicator:</strong> {riskAssessment.primaryReason}
                <div className="text-[11px] text-red-700 mt-0.5 font-medium">
                  Protocol: {riskAssessment.source} • Documented {new Date(riskAssessment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Container with 7 Dossier Tabs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Navigation Tabs Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 mb-6 shadow-2xs flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity size={14} /> Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList size={14} /> Medical History
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'updates' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <HeartPulse size={14} /> Daily Health Updates ({dailyUpdates.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'notes' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={14} /> Clinical Notes ({clinicalNotes.length})
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'appointments' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar size={14} /> Appointments &amp; Visits
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'documents' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileCheck size={14} /> Reports &amp; Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('followup')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'followup' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarClock size={14} /> Follow-up Plan
          </button>
        </div>

        {/* TAB A: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Patient Core Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-[#17324D] border-b border-slate-100 pb-2 flex items-center gap-2">
                <User size={16} className="text-[#1976D2]" /> Patient Profile
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Full Name</span>
                  <span className="font-bold text-[#17324D]">{overview.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Date of Birth / Age</span>
                  <span className="font-semibold text-slate-700">
                    {overview.dateOfBirth ? new Date(overview.dateOfBirth).toLocaleDateString() : 'N/A'}{' '}
                    {overview.age ? `(${overview.age} Years)` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Gender</span>
                  <span className="capitalize font-semibold text-slate-700">{overview.gender || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Blood Group</span>
                  <span className="font-bold text-rose-700">{overview.bloodGroup || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Primary Language</span>
                  <span className="font-semibold text-slate-700">{overview.primaryLanguage}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Emergency Contact</span>
                  <span className="font-semibold text-slate-700">
                    {overview.emergencyContact ? `${overview.emergencyContact.name} (${overview.emergencyContact.relationship}) - ${overview.emergencyContact.phone}` : 'None documented'}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Residence & Care Assignment */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-[#17324D] border-b border-slate-100 pb-2 flex items-center gap-2">
                <MapPin size={16} className="text-[#2E9E6F]" /> Address &amp; Care Cluster
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Residential Address</span>
                  <p className="font-semibold text-slate-700">
                    {overview.address?.street || 'Residence'}
                    {overview.address?.city ? `, ${overview.address.city}` : ''}
                    {overview.address?.pincode ? ` - ${overview.address.pincode}` : ''}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Operations Cluster</span>
                  <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-[#1976D2] font-semibold text-[11px]">
                    {overview.address?.cluster || 'Pune Central'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Assigned Specialist</span>
                  <span className="font-bold text-[#17324D]">{overview.assignedDoctor?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Current Palliative Care Plan</span>
                  <p className="font-medium text-slate-700 leading-relaxed">
                    {overview.currentCarePlan}
                  </p>
                </div>
              </div>
            </div>

            {/* Column 3: Next Booking & Consultation Status */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-[#17324D] border-b border-slate-100 pb-2 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" /> Consultation Schedule
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                  <span className="text-[11px] font-bold text-[#1976D2] uppercase tracking-wider block mb-1">
                    Next Scheduled Booking
                  </span>
                  {overview.nextAppointment ? (
                    <div>
                      <div className="font-bold text-[#17324D] text-sm">
                        {overview.nextAppointment.date}
                      </div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        Slot: {overview.nextAppointment.timeSlot?.startTime} - {overview.nextAppointment.timeSlot?.endTime}
                      </div>
                      <div className="text-slate-500 capitalize text-[11px] mt-0.5">
                        Mode: {overview.nextAppointment.consultationMode?.replace('_', ' ')}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">No upcoming appointment scheduled</span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Last Completed Consultation
                  </span>
                  {overview.lastConsultation ? (
                    <div className="text-slate-700">
                      <div className="font-bold">{overview.lastConsultation.date}</div>
                      <div className="text-[11px] text-slate-500">{overview.lastConsultation.appointmentNumber}</div>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">Initial consultation in progress</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB B: MEDICAL HISTORY (VERIFIED VS PATIENT-REPORTED) */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-[#17324D] flex items-center gap-2">
              <Info size={16} className="text-[#1976D2] shrink-0" />
              <span>
                <strong>Clinical Integrity Notice:</strong> Documented diagnoses, clinician prescriptions, and allergies are verified clinical records. Symptoms and vital signs entered in daily updates are segregated as patient/caregiver-reported.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Verified Clinical Records */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <h3 className="text-base font-bold text-[#17324D]">Verified Clinical Records</h3>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Chronic Conditions &amp; Diagnoses
                  </h4>
                  {medicalHistory.verified.diagnoses?.length === 0 ? (
                    <p className="text-xs text-slate-400">None documented</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {medicalHistory.verified.diagnoses.map((d: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-[#17324D] border border-slate-200">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Documented Allergies
                  </h4>
                  {medicalHistory.verified.allergies?.length === 0 ? (
                    <p className="text-xs text-slate-400">No known allergies documented</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {medicalHistory.verified.allergies.map((a: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Prescribed Medications History
                  </h4>
                  {medicalHistory.verified.medications?.length === 0 ? (
                    <p className="text-xs text-slate-400">No prescriptions recorded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {medicalHistory.verified.medications.map((m: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <div className="font-bold text-[#17324D] flex items-center justify-between">
                            <span>{m.name}</span>
                            <span className="text-[11px] text-slate-500 font-normal">{m.prescribedDate}</span>
                          </div>
                          <div className="text-slate-600 text-[11px] mt-0.5">
                            {m.dosage} • {m.frequency} • {m.duration}
                          </div>
                          {m.instructions && (
                            <div className="text-slate-500 italic text-[11px]">{m.instructions}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Patient-Reported Information */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User size={18} className="text-[#1976D2]" />
                  <h3 className="text-base font-bold text-[#17324D]">Patient &amp; Caregiver Reported Symptoms</h3>
                </div>

                {medicalHistory.patientReported?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">No patient-reported symptoms logged</p>
                ) : (
                  <div className="space-y-3">
                    {medicalHistory.patientReported.map((s: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span>Reported by {s.submittedBy?.name} ({s.submittedBy?.relationship})</span>
                          <span>{new Date(s.submittedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 my-1">
                          {s.symptoms?.map((sym: string, j: number) => (
                            <span key={j} className="px-2 py-0.5 rounded bg-blue-50 text-[#1976D2] font-semibold text-[11px]">
                              {sym}
                            </span>
                          ))}
                        </div>
                        {s.notes && <p className="text-slate-600 italic mt-1">"{s.notes}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB C: DAILY HEALTH UPDATES */}
        {activeTab === 'updates' && (
          <div className="space-y-4">
            {dailyUpdates.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center p-6 shadow-2xs">
                <HeartPulse size={36} className="mx-auto text-slate-400 mb-2" />
                <h3 className="text-base font-bold text-slate-700">No Daily Health Updates Recorded</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Updates submitted by the patient or their registered caregiver will appear chronologically here with vital signs, symptoms, and clinician review status.
                </p>
              </div>
            ) : (
              dailyUpdates.map((u: any) => (
                <div key={u.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="font-bold text-sm text-[#17324D]">
                        Submitted by {u.submitter?.name} ({u.submitter?.relationship})
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(u.submittedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          u.reviewStatus === 'new'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : u.reviewStatus === 'reviewed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {u.reviewStatus === 'new' ? 'Pending Review' : u.reviewStatus?.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                        Patient-Reported (Unverified)
                      </span>
                    </div>
                  </div>

                  {/* Vitals Grid */}
                  {u.vitals && (
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 my-3">
                      {u.vitals.spO2 !== undefined && (
                        <div className={`p-2 rounded-lg border text-center ${u.vitals.spO2 < 92 ? 'bg-red-50 border-red-200 text-red-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                          <div className="text-[10px] uppercase font-bold text-slate-400">SpO2</div>
                          <div className="text-sm">{u.vitals.spO2}%</div>
                        </div>
                      )}
                      {u.vitals.bloodPressure && (
                        <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 text-center text-slate-700">
                          <div className="text-[10px] uppercase font-bold text-slate-400">BP</div>
                          <div className="text-sm font-semibold">{u.vitals.bloodPressure}</div>
                        </div>
                      )}
                      {u.vitals.pulse && (
                        <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 text-center text-slate-700">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Pulse</div>
                          <div className="text-sm font-semibold">{u.vitals.pulse} bpm</div>
                        </div>
                      )}
                      {u.vitals.temperature && (
                        <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 text-center text-slate-700">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Temp</div>
                          <div className="text-sm font-semibold">{u.vitals.temperature}°F</div>
                        </div>
                      )}
                      {u.vitals.glucose && (
                        <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 text-center text-slate-700">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Glucose</div>
                          <div className="text-sm font-semibold">{u.vitals.glucose} mg/dL</div>
                        </div>
                      )}
                      {u.vitals.painScale && (
                        <div className="p-2 rounded-lg border bg-slate-50 border-slate-200 text-center text-slate-700">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Pain</div>
                          <div className="text-sm font-semibold">{u.vitals.painScale}/10</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Symptoms & Notes */}
                  <div className="text-xs space-y-1 text-slate-700 mt-2">
                    {u.symptoms?.length > 0 && (
                      <div>
                        <strong>Reported Symptoms:</strong> {u.symptoms.join(', ')}
                      </div>
                    )}
                    {u.notes && <p className="text-slate-600 italic">"{u.notes}"</p>}
                  </div>

                  {/* Clinician Advice */}
                  {u.clinicianNotes && (
                    <div className="mt-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
                      <div className="font-bold text-[#1976D2] mb-0.5">
                        Reviewed by {u.reviewedBy?.fullName || 'Clinician'}:
                      </div>
                      <p className="text-slate-700">{u.clinicianNotes}</p>
                      {u.followUpAction && <p className="text-emerald-800 font-semibold mt-1">Action: {u.followUpAction}</p>}
                    </div>
                  )}

                  <div className="mt-3 pt-2 flex items-center justify-end">
                    <button
                      onClick={() => {
                        setSelectedUpdateForReview(u);
                        setReviewClinicianNotes(u.clinicianNotes || '');
                        setReviewStatusChoice(u.reviewStatus === 'follow_up_required' ? 'follow_up_required' : 'reviewed');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1976D2] text-white hover:bg-[#1565C0] transition-colors"
                    >
                      {u.reviewStatus === 'new' ? 'Review & Advise' : 'Update Review'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB D: CLINICAL NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#17324D]">Clinician Examination &amp; Assessment Notes</h3>
                <p className="text-xs text-slate-500">Official medical audit trail of clinician observations</p>
              </div>
              <button
                onClick={() => setShowNoteModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1976D2] hover:bg-[#1565C0] transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Plus size={14} /> Record Clinical Note
              </button>
            </div>

            {clinicalNotes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center p-6 shadow-2xs">
                <FileText size={36} className="mx-auto text-slate-400 mb-2" />
                <h3 className="text-base font-bold text-slate-700">No Clinical Notes Recorded</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Document physical findings, clinical impressions, assessment, and management plans.
                </p>
                <button
                  onClick={() => setShowNoteModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1976D2]"
                >
                  Create First Clinical Note
                </button>
              </div>
            ) : (
              clinicalNotes.map((note: any) => (
                <div key={note.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <span className="font-bold text-sm text-[#17324D]">{note.doctorName}</span>
                      <span className="text-xs text-slate-500 ml-2">({note.doctorSpecialty || 'Clinician'})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock size={12} />
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {note.subjective && (
                    <div className="text-xs">
                      <strong className="text-slate-500 uppercase tracking-wider text-[11px] block">Subjective</strong>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">{note.subjective}</p>
                    </div>
                  )}

                  {note.objective && (
                    <div className="text-xs">
                      <strong className="text-slate-500 uppercase tracking-wider text-[11px] block">Objective Examination</strong>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">{note.objective}</p>
                    </div>
                  )}

                  <div className="text-xs">
                    <strong className="text-slate-500 uppercase tracking-wider text-[11px] block">Assessment</strong>
                    <p className="text-slate-800 font-semibold mt-0.5 leading-relaxed">{note.assessment}</p>
                  </div>

                  <div className="text-xs">
                    <strong className="text-slate-500 uppercase tracking-wider text-[11px] block">Management Plan</strong>
                    <p className="text-slate-700 mt-0.5 leading-relaxed">{note.plan}</p>
                  </div>

                  {note.followUpInstructions && (
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                      <strong>Follow-up Instructions:</strong> {note.followUpInstructions}
                      {note.followUpDate && <span className="block text-[11px] mt-0.5 font-bold">Target Review: {note.followUpDate}</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB E: APPOINTMENTS & VISITS */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            {/* Appointments */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
              <h3 className="text-base font-bold text-[#17324D] mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-[#1976D2]" /> Consultations &amp; Bookings
              </h3>
              {appointmentsAndVisits.appointments?.length === 0 ? (
                <p className="text-xs text-slate-400">No appointments recorded</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {appointmentsAndVisits.appointments.map((a: any) => (
                    <div key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-600">{a.appointmentNumber}</span>
                          <span className="font-semibold text-[#17324D]">{a.date} ({a.timeSlot?.startTime})</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                            {a.status}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5">{a.clinicalReason || 'General supportive consultation'}</p>
                      </div>
                      <span className="capitalize text-slate-500 text-[11px]">
                        Mode: {a.consultationMode?.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Field Visits */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
              <h3 className="text-base font-bold text-[#17324D] mb-4 flex items-center gap-2">
                <Home size={18} className="text-[#2E9E6F]" /> Home Field Visits
              </h3>
              {appointmentsAndVisits.fieldVisits?.length === 0 ? (
                <p className="text-xs text-slate-400">No field visits recorded</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {appointmentsAndVisits.fieldVisits.map((v: any) => (
                    <div key={v.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-600">{v.visitNumber}</span>
                          <span className="font-semibold text-[#17324D]">{v.scheduledDate}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                            {v.status}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5">Clinician: {v.providerName}</p>
                      </div>
                      <span className="capitalize text-slate-500 text-[11px]">
                        Type: {v.visitType?.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB F: REPORTS & DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <h3 className="text-base font-bold text-[#17324D] mb-4 flex items-center gap-2">
              <FileCheck size={18} className="text-[#1976D2]" /> Securely Stored Clinical Reports &amp; Prescriptions
            </h3>
            {documents.length === 0 ? (
              <div className="py-8 text-center">
                <FileCheck size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs text-slate-500">No clinical reports or documents uploaded yet for this patient.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#17324D]">{doc.originalFilename}</div>
                      <div className="text-[11px] text-slate-400">
                        Category: {doc.fileCategory} • Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-semibold text-[11px]">
                      Encrypted Read-Only
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB G: FOLLOW-UP PLAN */}
        {activeTab === 'followup' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs max-w-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#17324D] flex items-center gap-2">
                <CalendarClock size={18} className="text-amber-600" /> Patient Follow-up &amp; Continuity Plan
              </h3>
              <button
                onClick={() => setShowFollowUpModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#1976D2] hover:bg-[#1565C0]"
              >
                Edit Follow-up Plan
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Target Follow-up Date:</span>
                <span className="font-bold text-[#17324D] text-sm">{followUpPlan?.dueDate || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Continuity Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${
                    followUpPlan?.status === 'overdue'
                      ? 'bg-rose-100 text-rose-800'
                      : followUpPlan?.status === 'due_soon'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {followUpPlan?.status?.replace('_', ' ')}
                  {followUpPlan?.overdueDays > 0 ? ` (${followUpPlan.overdueDays} days overdue)` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Clinical Instructions:</span>
                <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  {followUpPlan?.instructions || 'Standard home monitoring.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: ADD CLINICAL NOTE */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-[#17324D]">Record Clinical Examination Note</h3>
              <button onClick={() => setShowNoteModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveClinicalNote} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subjective (Patient Reported)</label>
                <textarea
                  rows={2}
                  value={noteSubjective}
                  onChange={(e) => setNoteSubjective(e.target.value)}
                  placeholder="Patient reports pain score 4/10, mild cough on lying flat..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Objective (Examination Findings)</label>
                <textarea
                  rows={2}
                  value={noteObjective}
                  onChange={(e) => setNoteObjective(e.target.value)}
                  placeholder="Vitals: BP 124/80, SpO2 96%, Chest bilateral vesicular breath sounds..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assessment *</label>
                <textarea
                  rows={2}
                  required
                  value={noteAssessment}
                  onChange={(e) => setNoteAssessment(e.target.value)}
                  placeholder="Palliative oncology status post-chemotherapy, stable pain control..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Management Plan *</label>
                <textarea
                  rows={2}
                  required
                  value={notePlan}
                  onChange={(e) => setNotePlan(e.target.value)}
                  placeholder="Continue Fentanyl patch 25 mcg. Incentive spirometry 3x daily..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Target Follow-up Date</label>
                  <input
                    type="date"
                    value={noteFollowUpDate}
                    onChange={(e) => setNoteFollowUpDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Follow-up Instructions</label>
                  <input
                    type="text"
                    value={noteFollowUpInstructions}
                    onChange={(e) => setNoteFollowUpInstructions(e.target.value)}
                    placeholder="Review in 14 days or sooner if SpO2 drops"
                    className="w-full p-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNote}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1976D2] hover:bg-[#1565C0] disabled:opacity-50"
                >
                  {isSubmittingNote ? 'Saving...' : 'Save &amp; Sign Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPDATE FOLLOW-UP PLAN */}
      {showFollowUpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-[#17324D]">Update Follow-up Plan</h3>
              <button onClick={() => setShowFollowUpModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveFollowUpPlan} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Follow-up Date *</label>
                <input
                  type="date"
                  required
                  value={followUpTargetDate}
                  onChange={(e) => setFollowUpTargetDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Care Tasks (Comma separated)</label>
                <input
                  type="text"
                  value={followUpCareTasks}
                  onChange={(e) => setFollowUpCareTasks(e.target.value)}
                  placeholder="Check SpO2, dressing change, blood sugar log"
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instructions for Patient / Caregiver</label>
                <textarea
                  rows={3}
                  value={followUpInstructions}
                  onChange={(e) => setFollowUpInstructions(e.target.value)}
                  placeholder="Record daily vitals every morning. Contact helpline immediately if pain exceeds 6/10."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFollowUpModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFollowUp || !followUpTargetDate}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1976D2] hover:bg-[#1565C0] disabled:opacity-50"
                >
                  {isSubmittingFollowUp ? 'Updating...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REVIEW HEALTH UPDATE */}
      {selectedUpdateForReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-[#17324D]">Review Patient Daily Update</h3>
              <button onClick={() => setSelectedUpdateForReview(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Review Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatusChoice('reviewed')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                      reviewStatusChoice === 'reviewed'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
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
                        ? 'bg-amber-50 border-amber-500 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Follow-up Required
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinician Advice &amp; Response *</label>
                <textarea
                  rows={3}
                  value={reviewClinicianNotes}
                  onChange={(e) => setReviewClinicianNotes(e.target.value)}
                  placeholder="Document clinical feedback for the patient and caregiver..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedUpdateForReview(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReview || !reviewClinicianNotes.trim()}
                onClick={handleSaveReview}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1976D2] hover:bg-[#1565C0] disabled:opacity-50"
              >
                {isSubmittingReview ? 'Saving...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
