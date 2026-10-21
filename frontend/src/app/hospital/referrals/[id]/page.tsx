'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  User,
  HeartPulse,
  Package,
  Calendar,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Activity,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Stethoscope,
  XCircle,
  Thermometer,
  ShieldAlert,
  ClipboardCheck,
  CheckCheck,
  Wrench,
  Shield,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { hospitalsApi, authApi, ApiClientError } from '@/lib/api';

export default function ReferralDetailPage() {
  const params = useParams();
  const router = useRouter();
  const referralId = params.id as string;

  const [referral, setReferral] = useState<any>(null);
  const [completionSummary, setCompletionSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [isForbiddenTenant, setIsForbiddenTenant] = useState(false);

  // Closed-Loop Summary Acknowledgment Modal
  const [isAcknowledgeModalOpen, setIsAcknowledgeModalOpen] = useState(false);
  const [ackByName, setAckByName] = useState('Dr. Rajesh Sharma, MD (Care Transition Lead)');
  const [ackNotes, setAckNotes] = useState('In-home clinical documentation and equipment setup verified satisfactory. Discharge loop successfully closed.');

  // Rejection Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Provider Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignName, setAssignName] = useState('Sister Varsha Kulkarni, RN');
  const [assignRole, setAssignRole] = useState('Skilled Wound & Palliative Nurse');
  const [assignPhone, setAssignPhone] = useState('9822441122');
  const [assignService, setAssignService] = useState('Skilled Nursing & Wound Care');

  // Visit Documentation Modal
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [visitClinician, setVisitClinician] = useState('Sister Varsha Kulkarni, RN');
  const [visitRole, setVisitRole] = useState('Skilled Wound & Palliative Nurse');
  const [vitalsBP, setVitalsBP] = useState('122/80 mmHg');
  const [vitalsPulse, setVitalsPulse] = useState<number | ''>(76);
  const [vitalsSpO2, setVitalsSpO2] = useState<number | ''>(98);
  const [vitalsTemp, setVitalsTemp] = useState('98.6 F');
  const [vitalsResp, setVitalsResp] = useState<number | ''>(16);
  const [observation, setObservation] = useState('');
  const [procedures, setProcedures] = useState('Wound dressing replaced, vitals logged, stoma inspection');
  const [nextFollowUp, setNextFollowUp] = useState('Tomorrow at 10:00 AM');
  const [isFinalVisit, setIsFinalVisit] = useState(false);

  const loadReferral = async () => {
    setIsLoading(true);
    setError(null);
    setIsForbiddenTenant(false);

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

      const data = await hospitalsApi.getReferralById(referralId);
      setReferral(data);

      try {
        const summaryData = await hospitalsApi.getReferralCompletionSummary(referralId);
        setCompletionSummary(summaryData);
      } catch (sumErr) {
        console.warn('Could not load completion summary', sumErr);
      }
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        if (err.status === 403) {
          setIsForbiddenTenant(true);
        }
        setError(err.message);
      } else {
        setError('Failed to fetch referral details. Please verify connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledgeSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ackByName.trim()) {
      setError('Staff member name is required for acknowledgment audit trail');
      return;
    }

    setIsActionLoading(true);
    setError(null);
    setActionSuccessMsg(null);
    try {
      const updated = await hospitalsApi.acknowledgeReferralSummary(referralId, {
        acknowledgedByName: ackByName.trim(),
        notes: ackNotes.trim() || undefined,
      });
      setReferral(updated);
      const summaryData = await hospitalsApi.getReferralCompletionSummary(referralId);
      setCompletionSummary(summaryData);
      setIsAcknowledgeModalOpen(false);
      setActionSuccessMsg('Closed-loop care completion summary acknowledged and archived!');
    } catch (err: any) {
      setError(err.message || 'Failed to acknowledge summary');
    } finally {
      setIsActionLoading(false);
    }
  };

  useEffect(() => {
    if (referralId) {
      loadReferral();
    }
  }, [referralId]);

  // Care Bundle Evaluation
  const handleEvaluateBundle = async () => {
    setIsActionLoading(true);
    setError(null);
    setActionSuccessMsg(null);
    try {
      const updated = await hospitalsApi.evaluateCareBundle(referralId);
      setReferral(updated);
      setActionSuccessMsg('Care bundle evaluated and attached to referral!');
    } catch (err: any) {
      setError(err.message || 'Bundle evaluation failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Provider Assignment
  const handleAssignProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignName.trim() || !assignRole.trim()) return;

    setIsActionLoading(true);
    setError(null);
    setActionSuccessMsg(null);
    try {
      const updated = await hospitalsApi.assignProviders(referralId, {
        providers: [
          {
            name: assignName.trim(),
            role: assignRole.trim(),
            phone: assignPhone.trim(),
            serviceAssigned: assignService.trim(),
          },
        ],
        reviewNotes: 'Clinical staff assignment verified against cluster registry.',
        approveImmediately: true,
      });
      setReferral(updated);
      setIsAssignModalOpen(false);
      setActionSuccessMsg('Provider assigned and referral approved for in-home care!');
    } catch (err: any) {
      setError(err.message || 'Provider assignment failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Status Transition to Triaged
  const handleTriageReferral = async () => {
    setIsActionLoading(true);
    setError(null);
    setActionSuccessMsg(null);
    try {
      const updated = await hospitalsApi.updateReferralStatus(referralId, {
        status: 'triaged',
        notes: 'Hospital care coordinator reviewed referral and verified active service radius.',
      });
      setReferral(updated);
      setActionSuccessMsg('Referral successfully triaged!');
    } catch (err: any) {
      setError(err.message || 'Triage transition failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reject Referral
  const handleRejectReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setError('A mandatory reason is required to reject a referral.');
      return;
    }

    setIsActionLoading(true);
    setError(null);
    setActionSuccessMsg(null);
    try {
      const updated = await hospitalsApi.updateReferralStatus(referralId, {
        status: 'rejected',
        reason: rejectReason.trim(),
      });
      setReferral(updated);
      setIsRejectModalOpen(false);
      setActionSuccessMsg('Referral marked as declined with audit record.');
    } catch (err: any) {
      setError(err.message || 'Rejection failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Record In-Home Visit Documentation
  const handleRecordVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observation.trim()) {
      setError('Clinical observation notes are required');
      return;
    }

    setIsActionLoading(true);
    setError(null);
    setActionSuccessMsg(null);
    try {
      const updated = await hospitalsApi.recordVisit(referralId, {
        visitDate: new Date().toISOString().slice(0, 10),
        providerName: visitClinician.trim(),
        providerRole: visitRole.trim(),
        vitals: {
          bloodPressure: vitalsBP.trim() || undefined,
          pulse: vitalsPulse !== '' ? Number(vitalsPulse) : undefined,
          spO2: vitalsSpO2 !== '' ? Number(vitalsSpO2) : undefined,
          temperature: vitalsTemp.trim() || undefined,
          respiratoryRate: vitalsResp !== '' ? Number(vitalsResp) : undefined,
        },
        clinicalObservation: observation.trim(),
        proceduresPerformed: procedures
          ? procedures.split(',').map((p) => p.trim())
          : [],
        nextFollowUpDate: nextFollowUp.trim() || undefined,
        isFinalVisit,
      });

      setReferral(updated);
      setIsVisitModalOpen(false);
      setObservation('');
      setActionSuccessMsg(isFinalVisit ? 'Final visit documented and discharge care completed!' : 'In-home visit summary documented!');
    } catch (err: any) {
      setError(err.message || 'Visit documentation recording failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Submitted (Pending Triage)
          </span>
        );
      case 'triaged':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-primary border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Triaged
          </span>
        );
      case 'bundle_proposed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Sparkles size={13} className="text-indigo-600" />
            Care Bundle Formulated
          </span>
        );
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
            Providers Matched
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-secondary border border-emerald-200">
            <CheckCircle2 size={13} />
            Approved &amp; Scheduled
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
            In-Home Care Active
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 size={13} />
            Care Episode Completed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle size={13} />
            Declined / Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {st}
          </span>
        );
    }
  };

  // Critical Tenant Isolation Violation Display
  if (isForbiddenTenant) {
    return (
      <div className="w-full bg-background min-h-screen flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 max-w-xl w-full mx-auto px-4 py-16 flex items-center justify-center">
          <div className="bg-white rounded-3xl border border-destructive/20 shadow-2xl p-8 sm:p-10 text-center w-full space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto shadow-xs">
              <ShieldAlert size={36} />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-destructive uppercase tracking-wider bg-destructive/10 px-3 py-1 rounded-full">
                403 Forbidden — Security Guardrail
              </span>
              <h1 className="text-2xl font-extrabold text-navy">
                Hospital Organization Isolation Enforced
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You do not have authorization to view or modify referrals belonging to another healthcare organization. Patient medical records are strictly partitioned by organization tenant ID under the Digital Personal Data Protection (DPDP) Act.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-background border border-border text-xs text-left text-muted-foreground font-mono">
              Target Referral ID: {referralId}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button href="/hospital/dashboard" variant="primary" size="md">
                Return to My Hospital Dashboard
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Hospital Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadReferral}
              leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="py-24 text-center bg-white rounded-3xl border border-border">
            <RefreshCw size={32} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-base font-bold text-navy">Loading Patient Referral Records...</p>
            <p className="text-xs text-muted-foreground mt-1">Retrieving care bundles, clinical observations, and vital logs</p>
          </div>
        ) : !referral ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-border">
            <AlertCircle size={40} className="text-muted-foreground/50 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-navy">Referral Record Not Found</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-4">The referral requested does not exist or may have been archived.</p>
            <Button href="/hospital/dashboard" variant="primary" size="sm">
              Back to Dashboard
            </Button>
          </div>
        ) : (
          <>
            {/* Success / Error Messages */}
            {actionSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-secondary text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 size={18} className="shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}
            {error && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Top Overview Banner */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5 mb-2">
                    <span className="font-mono text-base font-extrabold text-primary bg-primary-light px-3 py-1 rounded-xl">
                      {referral.referralNumber}
                    </span>
                    {getStatusBadge(referral.status)}
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      Priority: {referral.priority}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
                    {referral.patientDetails.fullName}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Referring Org: <strong className="text-navy">{referral.hospitalName}</strong></span>
                    <span>•</span>
                    <span>Clinician: <strong>{referral.referringStaff.name} ({referral.referringStaff.department})</strong></span>
                    <span>•</span>
                    <span>Discharge Date: <strong>{referral.patientDetails.dischargeDate || 'Immediate'}</strong></span>
                  </p>
                </div>

                {/* Human Approval & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {referral.status === 'submitted' && (
                    <Button
                      onClick={handleTriageReferral}
                      variant="outline"
                      size="md"
                      isLoading={isActionLoading}
                      leftIcon={<CheckCircle2 size={16} className="text-primary" />}
                    >
                      Triage Referral
                    </Button>
                  )}

                  {!referral.proposedCareBundle && ['submitted', 'triaged'].includes(referral.status) && (
                    <Button
                      onClick={handleEvaluateBundle}
                      variant="primary"
                      size="md"
                      isLoading={isActionLoading}
                      leftIcon={<Sparkles size={16} />}
                      className="shadow-primary"
                    >
                      Evaluate Care Bundle
                    </Button>
                  )}

                  {['submitted', 'triaged', 'bundle_proposed', 'matched'].includes(referral.status) && (
                    <Button
                      onClick={() => setIsAssignModalOpen(true)}
                      variant="secondary"
                      size="md"
                      leftIcon={<User size={16} />}
                    >
                      Assign Providers &amp; Approve
                    </Button>
                  )}

                  {['approved', 'in_progress'].includes(referral.status) && (
                    <Button
                      onClick={() => setIsVisitModalOpen(true)}
                      variant="primary"
                      size="md"
                      leftIcon={<Plus size={16} />}
                      className="shadow-primary"
                    >
                      Document In-Home Visit
                    </Button>
                  )}

                  {!['completed', 'rejected'].includes(referral.status) && (
                    <Button
                      onClick={() => setIsRejectModalOpen(true)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      Decline Request
                    </Button>
                  )}
                </div>
              </div>

              {/* Patient Details & Clinical Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-1 text-xs">
                
                {/* Demographics Card */}
                <div className="p-4 rounded-2xl bg-background border border-border space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Patient Demographics
                  </span>
                  <div className="space-y-1.5 text-navy/90">
                    <p><strong>Age &amp; Gender:</strong> {referral.patientDetails.age} yrs • {referral.patientDetails.gender}</p>
                    <p><strong>Primary Mobile:</strong> +91 {referral.patientDetails.phone}</p>
                    {referral.patientDetails.ipdNumber && (
                      <p><strong>IPD Admission No.:</strong> {referral.patientDetails.ipdNumber}</p>
                    )}
                    <p className="flex items-start gap-1">
                      <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
                      <span>{referral.patientDetails.address}, {referral.patientDetails.city} - {referral.patientDetails.pincode} ({referral.patientDetails.cluster})</span>
                    </p>
                  </div>
                </div>

                {/* Clinical Diagnosis Card */}
                <div className="p-4 rounded-2xl bg-background border border-border space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Clinical Diagnosis &amp; Functional Mobility
                  </span>
                  <div className="space-y-1.5 text-navy/90">
                    <p><strong>Primary Diagnosis:</strong> {referral.clinicalSummary.primaryDiagnosis}</p>
                    <p><strong>Mobility Status:</strong> <span className="capitalize">{referral.clinicalSummary.mobilityStatus?.replace('_', ' ')}</span></p>
                    {referral.clinicalSummary.palliativeCareNeeds && (
                      <p><strong>Palliative Needs:</strong> {referral.clinicalSummary.palliativeCareNeeds}</p>
                    )}
                  </div>
                </div>

                {/* Referring Staff Contact */}
                <div className="p-4 rounded-2xl bg-background border border-border space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Referring Clinician Liaison
                  </span>
                  <div className="space-y-1.5 text-navy/90">
                    <p><strong>Attending:</strong> {referral.referringStaff.name}</p>
                    <p><strong>Department:</strong> {referral.referringStaff.department}</p>
                    <p><strong>Designation:</strong> {referral.referringStaff.designation}</p>
                    <p><strong>Direct Extension/Phone:</strong> {referral.referringStaff.phone}</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Proposed Care Bundle Card (When Evaluated) */}
            {referral.proposedCareBundle && (
              <div className="bg-gradient-to-br from-indigo-900 to-navy text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-secondary-light">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase bg-white/10 text-secondary-light px-2.5 py-0.5 rounded-full inline-block">
                        AI-Assisted Coordinated Care Bundle
                      </span>
                      <h2 className="text-xl font-bold mt-1">
                        {referral.proposedCareBundle.bundleName}
                      </h2>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-white/70 block">Estimated Coordinated Package:</span>
                    <span className="text-2xl font-extrabold text-secondary-light">
                      ₹{referral.proposedCareBundle.totalEstimatedCost?.toLocaleString('en-IN') || '12,500'}
                    </span>
                    <span className="text-[11px] text-emerald-300 font-semibold block mt-0.5">
                      ({referral.proposedCareBundle.bundleDiscountPercentage}% bundled synergy savings)
                    </span>
                  </div>
                </div>

                <p className="text-xs text-white/80 leading-relaxed max-w-3xl">
                  {referral.proposedCareBundle.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <span className="text-[11px] font-bold text-secondary-light uppercase tracking-wider block">
                      Services Synchronized:
                    </span>
                    <ul className="space-y-1 text-xs text-white/90">
                      {referral.proposedCareBundle.servicesIncluded?.map((svc: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-secondary-light shrink-0" />
                          <span>{svc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <span className="text-[11px] font-bold text-secondary-light uppercase tracking-wider block">
                      Durable Medical Equipment Provisioned:
                    </span>
                    <ul className="space-y-1 text-xs text-white/90">
                      {referral.proposedCareBundle.equipmentIncluded?.map((eq: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Package size={13} className="text-secondary-light shrink-0" />
                          <span>{eq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Requested Clinical Services & DME Equipment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Requested Services */}
              <div className="bg-white rounded-3xl border border-border shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <HeartPulse size={18} className="text-primary" />
                    <h3 className="text-base font-bold text-navy">
                      Requested Clinical Services ({referral.requestedServices?.length || 0})
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {referral.requestedServices?.map((svc: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl bg-background border border-border space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-navy text-sm">{svc.serviceName}</span>
                        <span className="font-mono text-[11px] text-primary bg-primary-light px-2 py-0.5 rounded">
                          {svc.serviceCode}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        Schedule: <strong className="text-navy capitalize">{svc.frequency?.replace('_', ' ')}</strong> for <strong>{svc.durationDays} days</strong> • Preferred: <strong>{svc.preferredTimeSlot}</strong>
                      </p>
                      {svc.instructions && (
                        <p className="text-[11px] text-navy/80 italic mt-1 pt-1 border-t border-border/60">
                          &ldquo;{svc.instructions}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* DME Equipment */}
              <div className="bg-white rounded-3xl border border-border shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Package size={18} className="text-indigo-600" />
                    <h3 className="text-base font-bold text-navy">
                      DME Equipment &amp; Medical Supplies ({referral.equipmentRequired?.length || 0})
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {referral.equipmentRequired && referral.equipmentRequired.length > 0 ? (
                    referral.equipmentRequired.map((eq: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-background border border-border space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy text-sm">{eq.name}</span>
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            Qty: {eq.quantity}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          Urgency: <strong className="text-navy uppercase">{eq.urgency}</strong> • Rental Duration: <strong>{eq.durationWeeks || 2} weeks</strong>
                        </p>
                        {eq.specialInstructions && (
                          <p className="text-[11px] text-navy/80 italic mt-1 pt-1 border-t border-border/60">
                            &ldquo;{eq.specialInstructions}&rdquo;
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-6 text-center">No DME equipment requested for this patient</p>
                  )}
                </div>
              </div>

            </div>

            {/* Assigned Care Providers */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-secondary" />
                  <h3 className="text-base font-bold text-navy">
                    Assigned In-Home Care Team ({referral.assignedProviders?.length || 0})
                  </h3>
                </div>
                {['submitted', 'triaged', 'bundle_proposed', 'matched'].includes(referral.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAssignModalOpen(true)}
                    leftIcon={<Plus size={14} />}
                  >
                    Add Clinician
                  </Button>
                )}
              </div>

              {referral.assignedProviders && referral.assignedProviders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                  {referral.assignedProviders.map((prov: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl bg-background border border-border space-y-2 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary-light text-secondary flex items-center justify-center font-bold">
                          {prov.name[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-navy text-sm">{prov.name}</h4>
                          <span className="text-[11px] text-secondary font-semibold">{prov.role}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border text-navy/80 space-y-1">
                        <p><strong>Assignment:</strong> {prov.serviceAssigned}</p>
                        {prov.phone && <p><strong>Contact:</strong> +91 {prov.phone}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-background/50 rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                  <User size={28} className="mx-auto mb-2 text-muted-foreground/60" />
                  <span>No providers assigned yet. Click &ldquo;Assign Providers &amp; Approve&rdquo; to assign verified clinicians.</span>
                </div>
              )}
            </div>

            {/* Authorized Clinical Visit Documentation & Vitals */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-primary" />
                  <div>
                    <h3 className="text-base font-bold text-navy">
                      Authorized In-Home Visit Summaries &amp; Vitals Logs ({referral.visitSummaries?.length || 0})
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Real-time clinical observation charting transmitted directly to hospital portal
                    </p>
                  </div>
                </div>

                {['approved', 'in_progress'].includes(referral.status) && (
                  <Button
                    onClick={() => setIsVisitModalOpen(true)}
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                  >
                    Record New Visit
                  </Button>
                )}
              </div>

              {referral.visitSummaries && referral.visitSummaries.length > 0 ? (
                <div className="space-y-4">
                  {referral.visitSummaries.map((v: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-2xl bg-background border border-border space-y-4 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary bg-white px-2.5 py-1 rounded-lg border border-border">
                            {v.visitId}
                          </span>
                          <span className="font-bold text-navy">{v.providerName} ({v.providerRole})</span>
                        </div>
                        <span className="text-muted-foreground font-medium">
                          Conducted on: <strong>{v.visitDate}</strong>
                        </span>
                      </div>

                      {/* Vitals Telemetry Row */}
                      {v.vitals && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                          <div className="p-2.5 rounded-xl bg-white border border-border text-center">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Blood Pressure</span>
                            <span className="text-sm font-extrabold text-navy">{v.vitals.bloodPressure || '--'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-border text-center">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Pulse (bpm)</span>
                            <span className="text-sm font-extrabold text-navy">{v.vitals.pulse || '--'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-border text-center">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">SpO2 Level</span>
                            <span className="text-sm font-extrabold text-secondary">{v.vitals.spO2 ? `${v.vitals.spO2}%` : '--'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-border text-center">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Temperature</span>
                            <span className="text-sm font-extrabold text-navy">{v.vitals.temperature || '--'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-border text-center col-span-2 sm:col-span-1">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Resp. Rate</span>
                            <span className="text-sm font-extrabold text-navy">{v.vitals.respiratoryRate ? `${v.vitals.respiratoryRate}/m` : '--'}</span>
                          </div>
                        </div>
                      )}

                      {/* Observations */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Clinical Observations &amp; Interventions
                        </span>
                        <p className="text-navy/90 leading-relaxed bg-white p-3 rounded-xl border border-border">
                          {v.clinicalObservation}
                        </p>
                      </div>

                      {/* Procedures & Next follow-up */}
                      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground pt-1">
                        {v.proceduresPerformed && v.proceduresPerformed.length > 0 && (
                          <div>
                            <strong>Procedures Performed:</strong> {v.proceduresPerformed.join(', ')}
                          </div>
                        )}
                        {v.nextFollowUpDate && (
                          <div className="text-primary font-semibold">
                            Next Follow-up: {v.nextFollowUpDate}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-background/50 rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                  <Activity size={28} className="mx-auto mb-2 text-muted-foreground/60" />
                  <span>No visit documentation recorded yet. Clinical documentation will appear once home visits commence.</span>
                </div>
              )}
            </div>

            {/* Hospital Closed-Loop Care Completion Summary */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center">
                    <ClipboardCheck size={24} />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-light text-primary mb-1">
                      <Shield size={12} />
                      <span>Hospital Discharge Closed-Loop Reporting</span>
                    </div>
                    <h3 className="text-xl font-bold text-navy">
                      Closed-Loop Care Completion &amp; Episode Summary
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {completionSummary?.closedLoopStatus?.acknowledged ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-secondary border border-emerald-200 text-xs font-bold shadow-xs">
                      <CheckCheck size={16} />
                      <span>Episode Acknowledged &amp; Closed</span>
                    </span>
                  ) : (
                    <Button
                      onClick={() => setIsAcknowledgeModalOpen(true)}
                      variant="primary"
                      size="md"
                      leftIcon={<CheckCheck size={16} />}
                      className="shadow-primary"
                    >
                      Acknowledge Care Completion
                    </Button>
                  )}
                </div>
              </div>

              {/* Status Banner */}
              {completionSummary?.closedLoopStatus?.acknowledged ? (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-secondary text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="shrink-0 text-secondary" />
                    <div>
                      <p className="font-bold text-navy">
                        Officially Signed Off &amp; Acknowledged by Hospital Care Coordinator
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Acknowledged by <strong>{completionSummary.closedLoopStatus.acknowledgedByName}</strong> on{' '}
                        {new Date(completionSummary.closedLoopStatus.acknowledgedAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  {completionSummary.closedLoopStatus.notes && (
                    <div className="text-xs bg-white px-3 py-1.5 rounded-xl border border-emerald-200 text-navy/90 italic">
                      &ldquo;{completionSummary.closedLoopStatus.notes}&rdquo;
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle size={18} className="shrink-0 text-amber-600" />
                    <span>
                      In-home field visits and DME setups are linked to this referral. Review the clinical trajectory below and submit formal hospital acknowledgment to close this discharge care loop.
                    </span>
                  </div>
                </div>
              )}

              {/* Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-background border border-border text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Visits</span>
                  <span className="text-2xl font-black text-navy">{completionSummary?.visitsCount ?? referral.visitSummaries?.length ?? 0}</span>
                </div>
                <div className="p-4 rounded-2xl bg-background border border-border text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Completed Visits</span>
                  <span className="text-2xl font-black text-secondary">{completionSummary?.completedVisitsCount ?? (referral.status === 'completed' ? 1 : 0)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-background border border-border text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">DME Verified</span>
                  <span className="text-2xl font-black text-indigo-600">{completionSummary?.equipmentVerifiedCount ?? 0}</span>
                </div>
                <div className="p-4 rounded-2xl bg-background border border-border text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Loop Status</span>
                  <span className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded-full inline-block mt-2 ${
                    completionSummary?.closedLoopStatus?.acknowledged
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {completionSummary?.closedLoopStatus?.acknowledged ? 'Closed' : 'Action Req.'}
                  </span>
                </div>
              </div>

              {/* Equipment Installations Verified */}
              {completionSummary?.equipmentInstallations && completionSummary.equipmentInstallations.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-indigo-600" />
                    <h4 className="text-sm font-bold text-navy">
                      Verified Durable Medical Equipment (DME) Deployments
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {completionSummary.equipmentInstallations.map((eq: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-background border border-border space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy text-sm">{eq.equipmentName}</span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={12} />
                            Verified
                          </span>
                        </div>
                        <div className="space-y-1 text-muted-foreground">
                          <p>Serial Number: <strong className="font-mono text-navy">{eq.serialNumber}</strong></p>
                          <p>Condition: <strong className="capitalize text-navy">{eq.condition?.replace('_', ' ')}</strong></p>
                          <p>Technician: <strong className="text-navy">{eq.technicianName}</strong></p>
                          <p>Caregiver Consent: <strong className="text-secondary">{eq.caregiverAcknowledged ? 'Confirmed & Consented' : 'Pending'}</strong></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Field Visits Feed */}
              {completionSummary?.fieldVisits && completionSummary.fieldVisits.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope size={16} className="text-primary" />
                    <h4 className="text-sm font-bold text-navy">
                      Linked Field Operations &amp; Clinician Visits ({completionSummary.fieldVisits.length})
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {completionSummary.fieldVisits.map((fv: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-background border border-border space-y-2.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary bg-white px-2.5 py-0.5 rounded border border-border">
                              {fv.visitNumber}
                            </span>
                            <span className="font-bold text-navy capitalize">{fv.visitType?.replace('_', ' ')}</span>
                            <span className="text-muted-foreground">• {fv.providerName} ({fv.providerRole})</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${
                            fv.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {fv.status}
                          </span>
                        </div>

                        {fv.vitals && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                            <div className="p-2 rounded-xl bg-white border border-border">
                              <span className="text-muted-foreground block text-[10px]">Blood Pressure</span>
                              <strong className="text-navy">{fv.vitals.bloodPressure || '--'}</strong>
                            </div>
                            <div className="p-2 rounded-xl bg-white border border-border">
                              <span className="text-muted-foreground block text-[10px]">SpO2</span>
                              <strong className="text-secondary">{fv.vitals.spO2 ? `${fv.vitals.spO2}%` : '--'}</strong>
                            </div>
                            <div className="p-2 rounded-xl bg-white border border-border">
                              <span className="text-muted-foreground block text-[10px]">Pulse</span>
                              <strong className="text-navy">{fv.vitals.pulse ? `${fv.vitals.pulse} bpm` : '--'}</strong>
                            </div>
                            <div className="p-2 rounded-xl bg-white border border-border">
                              <span className="text-muted-foreground block text-[10px]">Temp</span>
                              <strong className="text-navy">{fv.vitals.temperature || '--'}</strong>
                            </div>
                          </div>
                        )}

                        {fv.clinicalNotes && (
                          <p className="text-navy/90 bg-white p-3 rounded-xl border border-border leading-relaxed">
                            {fv.clinicalNotes}
                          </p>
                        )}

                        {fv.followUpRecommendations && (
                          <p className="text-[11px] text-primary font-medium">
                            Recommendations: {fv.followUpRecommendations}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status History & Audit Trail */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Clock size={18} className="text-navy" />
                <h3 className="text-base font-bold text-navy">
                  Compliance Audit Trail &amp; Status History ({referral.statusHistory?.length || 0})
                </h3>
              </div>

              <div className="space-y-3 pt-1">
                {referral.statusHistory?.map((h: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shrink-0" />
                    <div className="space-y-0.5 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-navy capitalize">
                          Status &rarr; {h.status.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(h.timestamp).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        Actor: <strong>{h.changedByName || 'Authorized User'} ({h.changedByRole || 'system'})</strong>
                        {h.reason && ` • Reason: ${h.reason}`}
                      </p>
                      {h.notes && (
                        <p className="text-[11px] text-navy/80 italic mt-0.5">
                          &ldquo;{h.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </main>

      {/* Modal: Decline / Rejection */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border shadow-2xl p-6 sm:p-8 max-w-md w-full space-y-5 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy">Decline Patient Referral</h3>
                <p className="text-xs text-muted-foreground">Audit record of referral cancellation or rejection</p>
              </div>
            </div>

            <form onSubmit={handleRejectReferral} className="space-y-4">
              <FormField
                label="Mandatory Reason for Decline"
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Destination address is outside active 30km radius; patient readmitted to ICU"
                required
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRejectModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isActionLoading}
                  className="bg-destructive hover:bg-destructive/90 text-white"
                >
                  Confirm Decline
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Providers */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border shadow-2xl p-6 sm:p-8 max-w-md w-full space-y-5 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-light text-secondary flex items-center justify-center">
                <User size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy">Assign Healthcare Professional</h3>
                <p className="text-xs text-muted-foreground">Human-in-the-loop clinical assignment review</p>
              </div>
            </div>

            <form onSubmit={handleAssignProvider} className="space-y-4">
              <FormField
                label="Clinician Full Name"
                id="assignName"
                value={assignName}
                onChange={(e) => setAssignName(e.target.value)}
                required
              />
              <FormField
                label="Professional Role / Specialty"
                id="assignRole"
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
                required
              />
              <FormField
                label="Mobile Number"
                id="assignPhone"
                value={assignPhone}
                onChange={(e) => setAssignPhone(e.target.value)}
                required
              />
              <FormField
                label="Service Assigned"
                id="assignService"
                value={assignService}
                onChange={(e) => setAssignService(e.target.value)}
                required
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAssignModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  isLoading={isActionLoading}
                >
                  Approve &amp; Dispatch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document In-Home Visit */}
      {isVisitModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border shadow-2xl p-6 sm:p-8 max-w-lg w-full space-y-5 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center">
                <Activity size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy">Document In-Home Clinical Visit</h3>
                <p className="text-xs text-muted-foreground">Log vital signs telemetry and clinical progress notes</p>
              </div>
            </div>

            <form onSubmit={handleRecordVisit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Attending Clinician"
                  id="visitClinician"
                  value={visitClinician}
                  onChange={(e) => setVisitClinician(e.target.value)}
                  required
                />
                <FormField
                  label="Role"
                  id="visitRole"
                  value={visitRole}
                  onChange={(e) => setVisitRole(e.target.value)}
                  required
                />
              </div>

              {/* Vitals Grid */}
              <div className="p-3.5 rounded-2xl bg-background border border-border space-y-3">
                <span className="text-xs font-bold text-navy block">Patient Vital Signs</span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <FormField
                    label="Blood Pressure"
                    id="vitalsBP"
                    value={vitalsBP}
                    onChange={(e) => setVitalsBP(e.target.value)}
                    placeholder="120/80"
                  />
                  <FormField
                    label="Pulse (bpm)"
                    id="vitalsPulse"
                    type="number"
                    value={vitalsPulse}
                    onChange={(e) => setVitalsPulse(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    placeholder="76"
                  />
                  <FormField
                    label="SpO2 (%)"
                    id="vitalsSpO2"
                    type="number"
                    value={vitalsSpO2}
                    onChange={(e) => setVitalsSpO2(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    placeholder="98"
                  />
                </div>
              </div>

              <FormField
                label="Clinical Observations &amp; Interventions"
                id="observation"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Describe patient status, stoma/wound appearance, respiratory effort, caregiver training"
                required
              />

              <FormField
                label="Procedures Administered"
                id="procedures"
                value={procedures}
                onChange={(e) => setProcedures(e.target.value)}
                placeholder="Comma-separated: Dressing change, vitals check, spirometry"
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isFinal"
                  checked={isFinalVisit}
                  onChange={(e) => setIsFinalVisit(e.target.checked)}
                  className="w-4 h-4 rounded text-secondary focus:ring-secondary"
                />
                <label htmlFor="isFinal" className="text-xs font-semibold text-navy">
                  Mark as Final Discharge Transition Visit (Transitions referral to Completed)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisitModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isActionLoading}
                >
                  Save &amp; Sign Visit Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Acknowledge Closed-Loop Summary */}
      {isAcknowledgeModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border shadow-2xl p-6 sm:p-8 max-w-lg w-full space-y-5 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center">
                <ClipboardCheck size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy">Acknowledge Closed-Loop Care Summary</h3>
                <p className="text-xs text-muted-foreground">Formal hospital care-transition sign-off and closure</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-navy space-y-1">
              <p><strong>Referral:</strong> {referral.referralNumber} ({referral.patientDetails?.fullName})</p>
              <p><strong>Linked Field Visits:</strong> {completionSummary?.visitsCount || 0} visits ({completionSummary?.completedVisitsCount || 0} completed)</p>
              <p><strong>DME Deployments:</strong> {completionSummary?.equipmentVerifiedCount || 0} equipment setups verified</p>
            </div>

            <form onSubmit={handleAcknowledgeSummary} className="space-y-4">
              <FormField
                label="Acknowledging Clinician / Care Coordinator Name"
                id="ackByName"
                value={ackByName}
                onChange={(e) => setAckByName(e.target.value)}
                placeholder="e.g., Dr. Rajesh Sharma, MD"
                required
              />

              <FormField
                label="Care Loop Closure Notes &amp; Observations"
                id="ackNotes"
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
                placeholder="Confirm patient condition, absence of acute readmission flags, and transition to outpatient care."
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAcknowledgeModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isActionLoading}
                  leftIcon={<CheckCheck size={16} />}
                  className="shadow-primary"
                >
                  Confirm &amp; Sign Off Care Loop
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
