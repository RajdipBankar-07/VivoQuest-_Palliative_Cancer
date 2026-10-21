'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Video,
  Home,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  FileText,
  Pill,
  Save,
  Printer,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { LoadingState, ErrorState } from '@/components/UIStates';
import { appointmentsApi, doctorsApi, authApi } from '@/lib/api';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DoctorAppointmentDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const appointmentId = resolvedParams.id;
  const router = useRouter();

  const [appointment, setAppointment] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clinical documentation state
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescriptionMedicines, setPrescriptionMedicines] = useState<any[]>([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);
  const [recommendations, setRecommendations] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchAppointment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appointmentsApi.getAppointmentById(appointmentId);
      setAppointment(data);
      if (data.doctorNotes) setDoctorNotes(data.doctorNotes);
      if (data.prescription?.medicines?.length) {
        setPrescriptionMedicines(data.prescription.medicines);
      }
      if (data.prescription?.recommendations) {
        setRecommendations(data.prescription.recommendations);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load appointment record');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  const handleStatusTransition = async (newStatus: string) => {
    try {
      await appointmentsApi.updateStatus(appointmentId, { status: newStatus });
      fetchAppointment();
    } catch (err: any) {
      alert(err.message || 'Failed to update appointment status');
    }
  };

  const handleSaveClinicalNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNotes(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const filteredMedicines = prescriptionMedicines.filter((m) => m.name.trim().length > 0);
      await appointmentsApi.updateStatus(appointmentId, {
        status: appointment.status === 'in_progress' ? 'completed' : appointment.status,
        doctorNotes,
        prescription: {
          medicines: filteredMedicines,
          recommendations,
        },
      });
      setSaveSuccess(true);
      fetchAppointment();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save clinical notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-background min-h-screen flex flex-col font-sans">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 w-full flex-1">
          <LoadingState message="Loading patient chart and consultation details..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="w-full bg-background min-h-screen flex flex-col font-sans">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 w-full flex-1">
          <ErrorState message={error || 'Appointment record not found'} onRetry={fetchAppointment} />
          <div className="text-center mt-6">
            <Button href="/doctor/dashboard" variant="outline" size="md">
              Return to Doctor Dashboard
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const patient = appointment.patientDetails || {};

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-border py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/doctor/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Doctor Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-navy hover:bg-background transition-colors cursor-pointer"
            >
              <Printer size={13} className="text-muted-foreground" />
              <span>Print Medical Chart</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex-1 w-full space-y-6">
        {/* Header Bar */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary bg-primary-light/50 px-2.5 py-1 rounded-lg">
                {appointment.appointmentNumber}
              </span>
              <span className="text-xs text-muted-foreground">
                Visit Scheduled on {appointment.appointmentDate}
              </span>
              <span className="capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold bg-background border border-border text-navy">
                {appointment.consultationMode?.replace('_', ' ')}
              </span>
            </div>

            <h1 className="text-2xl font-extrabold text-navy">
              Patient Consultation Chart: {patient.fullName}
            </h1>
            <p className="text-xs text-muted-foreground">
              Clinical review and authorized health summary
            </p>
          </div>

          {/* Quick Action Status Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {appointment.status === 'pending' && (
              <>
                <Button
                  type="button"
                  onClick={() => handleStatusTransition('confirmed')}
                  variant="secondary"
                  size="md"
                  leftIcon={<CheckCircle2 size={16} />}
                >
                  Accept Request
                </Button>
                <Button
                  type="button"
                  onClick={() => handleStatusTransition('declined')}
                  variant="ghost"
                  size="md"
                  className="text-rose-600 hover:bg-rose-50"
                >
                  Decline
                </Button>
              </>
            )}

            {appointment.status === 'confirmed' && (
              <Button
                type="button"
                onClick={() => handleStatusTransition('in_progress')}
                variant="primary"
                size="md"
              >
                Start Clinical Consultation
              </Button>
            )}

            {appointment.status === 'in_progress' && (
              <span className="px-4 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Visit In Progress</span>
              </span>
            )}

            {appointment.status === 'completed' && (
              <span className="px-4 py-2 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Consultation Completed</span>
              </span>
            )}
          </div>
        </div>

        {/* Patient Demographics & Complaint */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-7 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <User size={14} className="text-primary" />
            <span>Patient Profile &amp; Chief Complaint</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block">Full Name:</span>
              <span className="font-bold text-navy text-sm">{patient.fullName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Contact Mobile:</span>
              <span className="font-semibold text-navy text-sm">{patient.phone}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Age / Gender:</span>
              <span className="font-medium text-navy text-sm">
                {patient.age || '55'} yrs • {patient.gender || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Email:</span>
              <span className="font-medium text-navy">{patient.email || 'N/A'}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-background border border-border/80 text-xs space-y-1">
            <span className="font-bold text-navy block">Patient Chief Complaint / Symptoms:</span>
            <p className="text-navy/90 leading-relaxed">
              {appointment.clinicalReason || 'No preliminary notes provided.'}
            </p>
          </div>

          {appointment.consultationMode === 'video' && appointment.location?.telehealthMeetingUrl && (
            <div className="pt-2">
              <a
                href={appointment.location.telehealthMeetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-hover shadow-sm"
              >
                <Video size={14} />
                <span>Open Video Telehealth Room</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Doctor Clinical Documentation & Prescription Form */}
        <form onSubmit={handleSaveClinicalNotes} className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <FileText size={16} />
              <span>Doctor Clinical Notes &amp; e-Prescription</span>
            </h2>
            <span className="text-xs text-muted-foreground">Document clinical outcome</span>
          </div>

          <div>
            <label htmlFor="doctorNotesInput" className="text-xs font-semibold text-navy block mb-1.5">
              Clinical Assessment &amp; Doctor Findings:
            </label>
            <textarea
              id="doctorNotesInput"
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Record clinical examination, vitals, oncology review, palliative pain score (1-10), and care plan..."
              className="w-full p-3 rounded-xl border border-border text-xs text-navy focus:outline-none focus:ring-2 focus:ring-primary/40 h-32 resize-none"
            />
          </div>

          {/* Medicines Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                <Pill size={14} className="text-primary" />
                <span>e-Prescription Medications</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setPrescriptionMedicines([
                    ...prescriptionMedicines,
                    { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
                  ])
                }
                className="text-xs font-bold text-primary hover:text-primary-hover"
              >
                + Add Medication
              </button>
            </div>

            <div className="space-y-2">
              {prescriptionMedicines.map((med, index) => (
                <div key={index} className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Medicine Name"
                    value={med.name}
                    onChange={(e) => {
                      const updated = [...prescriptionMedicines];
                      updated[index].name = e.target.value;
                      setPrescriptionMedicines(updated);
                    }}
                    className="p-2 rounded-lg border border-border col-span-2 sm:col-span-1"
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 500mg)"
                    value={med.dosage}
                    onChange={(e) => {
                      const updated = [...prescriptionMedicines];
                      updated[index].dosage = e.target.value;
                      setPrescriptionMedicines(updated);
                    }}
                    className="p-2 rounded-lg border border-border"
                  />
                  <input
                    type="text"
                    placeholder="Frequency (e.g. BD)"
                    value={med.frequency}
                    onChange={(e) => {
                      const updated = [...prescriptionMedicines];
                      updated[index].frequency = e.target.value;
                      setPrescriptionMedicines(updated);
                    }}
                    className="p-2 rounded-lg border border-border"
                  />
                  <input
                    type="text"
                    placeholder="Duration (e.g. 7 days)"
                    value={med.duration}
                    onChange={(e) => {
                      const updated = [...prescriptionMedicines];
                      updated[index].duration = e.target.value;
                      setPrescriptionMedicines(updated);
                    }}
                    className="p-2 rounded-lg border border-border"
                  />
                  <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
                    <input
                      type="text"
                      placeholder="Instructions"
                      value={med.instructions || ''}
                      onChange={(e) => {
                        const updated = [...prescriptionMedicines];
                        updated[index].instructions = e.target.value;
                        setPrescriptionMedicines(updated);
                      }}
                      className="p-2 rounded-lg border border-border w-full"
                    />
                    {prescriptionMedicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPrescriptionMedicines(
                            prescriptionMedicines.filter((_, idx) => idx !== index)
                          )
                        }
                        className="text-muted-foreground hover:text-rose-600 p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="generalRecommendationsInput" className="text-xs font-semibold text-navy block mb-1.5">
              Dietary &amp; General Recommendations:
            </label>
            <input
              id="generalRecommendationsInput"
              type="text"
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="e.g. High protein oral sips, monitor blood pressure daily, review in 2 weeks..."
              className="w-full p-2.5 rounded-xl border border-border text-xs text-navy"
            />
          </div>

          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>Clinical notes and prescription saved successfully!</span>
            </div>
          )}

          {saveError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              isLoading={isSavingNotes}
              leftIcon={<Save size={16} />}
            >
              Save &amp; Complete Consultation
            </Button>
          </div>
        </form>

        {/* Status History Timeline */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-7 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock size={14} className="text-primary" />
            <span>Audit Trail &amp; Status Transitions</span>
          </h2>

          <div className="space-y-3 pl-4 border-l-2 border-border text-xs">
            {appointment.statusHistory?.map((hist: any, idx: number) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy capitalize">
                    {hist.status?.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(hist.timestamp).toLocaleString()}
                  </span>
                </div>
                {hist.reason && <p className="text-muted-foreground">{hist.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
