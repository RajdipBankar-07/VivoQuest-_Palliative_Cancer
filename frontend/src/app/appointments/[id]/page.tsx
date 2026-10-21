'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Video,
  Home,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  ArrowLeft,
  ShieldCheck,
  User,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Pill,
  ExternalLink,
  Printer,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { LoadingState, ErrorState } from '@/components/UIStates';
import { appointmentsApi, doctorsApi } from '@/lib/api';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AppointmentDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const appointmentId = resolvedParams.id;
  const router = useRouter();

  const [appointment, setAppointment] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Reschedule state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const fetchAppointment = async () => {
    setIsLoading(true);
    setError(null);
    setIsForbidden(false);
    try {
      const data = await appointmentsApi.getAppointmentById(appointmentId);
      setAppointment(data);
    } catch (err: any) {
      console.error('Error fetching appointment:', err);
      if (err.status === 403 || err.message?.includes('Access denied') || err.message?.includes('not authorized')) {
        setIsForbidden(true);
      } else {
        setError(err.message || 'Unable to retrieve appointment record');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  // Load slots when reschedule date changes
  useEffect(() => {
    if (!showRescheduleModal || !rescheduleDate || !appointment) return;

    async function loadSlots() {
      setIsLoadingSlots(true);
      setRescheduleError(null);
      setSelectedSlot(null);
      try {
        const docId = appointment.doctorId?._id || appointment.doctorId;
        const res = await doctorsApi.getDoctorSlots(docId, rescheduleDate, appointment.consultationMode);
        setRescheduleSlots(res.slots || []);
      } catch (err: any) {
        setRescheduleError(err.message || 'Unable to fetch slots');
        setRescheduleSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    }
    loadSlots();
  }, [showRescheduleModal, rescheduleDate, appointment]);

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await appointmentsApi.cancelAppointment(appointmentId, cancelReason);
      setShowCancelModal(false);
      fetchAppointment();
    } catch (err: any) {
      setCancelError(err.message || 'Cancellation failed');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedSlot) return;
    setIsRescheduling(true);
    setRescheduleError(null);
    try {
      await appointmentsApi.rescheduleAppointment(appointmentId, {
        newDate: rescheduleDate,
        newTimeSlot: {
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        },
        reason: 'Rescheduled from patient portal',
      });
      setShowRescheduleModal(false);
      fetchAppointment();
    } catch (err: any) {
      setRescheduleError(err.message || 'Reschedule failed');
    } finally {
      setIsRescheduling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-background min-h-screen flex flex-col font-sans">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 w-full flex-1">
          <LoadingState message="Loading appointment details and verification status..." />
        </div>
        <Footer />
      </div>
    );
  }

  // Cross-patient unauthorized gate
  if (isForbidden) {
    return (
      <div className="w-full bg-background min-h-screen flex flex-col font-sans">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-20 w-full flex-1 text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-sm">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-navy">Unauthorized Access</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed">
            You do not have permission to view this appointment record. Under India&apos;s DPDP Act, health records are restricted exclusively to the authorized patient and treating clinician.
          </p>
          <Button href="/appointments" variant="primary" size="md" leftIcon={<ArrowLeft size={16} />}>
            Back to My Appointments
          </Button>
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
            <Button href="/appointments" variant="outline" size="md">
              Return to Appointments
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const doctorName = appointment.doctorId?.fullName || 'Specialist Doctor';
  const doctorSpecialty = appointment.doctorProfileId?.specializations?.[0] || 'Palliative Medicine';
  const canModify = !['completed', 'cancelled', 'declined'].includes(appointment.status);

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-border py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/appointments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Appointments</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-navy hover:bg-background transition-colors cursor-pointer"
            >
              <Printer size={13} className="text-muted-foreground" />
              <span>Print Summary</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex-1 w-full space-y-6">
        {/* Main Header Card */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary bg-primary-light/50 px-2.5 py-1 rounded-lg">
                {appointment.appointmentNumber}
              </span>
              <span className="text-xs text-muted-foreground">
                Booked on {new Date(appointment.createdAt).toLocaleDateString()}
              </span>
              {appointment.isSeededDemo && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-primary border border-blue-100 text-[10px] font-semibold">
                  Demo Visit Record
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-navy">
              {appointment.consultationMode === 'in_clinic'
                ? 'In-Clinic Specialist Consultation'
                : appointment.consultationMode === 'video'
                ? 'High-Definition Teleconsultation'
                : 'Palliative Home Care Visit'}
            </h1>
            <p className="text-xs text-muted-foreground">
              Direct clinical consultation with verified practitioner
            </p>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            {appointment.status === 'confirmed' ? (
              <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Confirmed &amp; Active</span>
              </div>
            ) : appointment.status === 'completed' ? (
              <div className="px-4 py-2 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 size={16} className="text-teal-600" />
                <span>Consultation Completed</span>
              </div>
            ) : appointment.status === 'cancelled' ? (
              <div className="px-4 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <XCircle size={16} className="text-rose-600" />
                <span>Cancelled</span>
              </div>
            ) : appointment.status === 'in_progress' ? (
              <div className="px-4 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>In Progress</span>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <Clock size={16} className="text-amber-600" />
                <span>Pending Review</span>
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Grid: Doctor & Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Doctor Card */}
          <div className="bg-white rounded-3xl border border-border p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-secondary" />
              <span>Attending Specialist</span>
            </h2>

            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-light to-secondary-light border border-border/80 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                {doctorName
                  ?.split(' ')
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-navy">{doctorName}</h3>
                <p className="text-xs font-semibold text-secondary">{doctorSpecialty}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Reg No: {appointment.doctorProfileId?.registrationNumber || 'Council Verified'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Council: {appointment.doctorProfileId?.registrationCouncil || 'Maharashtra Medical Council'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-background border border-border/80 text-xs text-navy/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-primary shrink-0" />
                <span className="font-medium">{appointment.location?.address || 'Clinical Suite, Pune'}</span>
              </div>
              {appointment.consultationMode === 'video' && appointment.location?.telehealthMeetingUrl && (
                <div className="pt-2 border-t border-border/60">
                  <a
                    href={appointment.location.telehealthMeetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-hover transition-colors shadow-sm"
                  >
                    <Video size={13} />
                    <span>Join Telehealth Consultation</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Schedule & Pricing Card */}
          <div className="bg-white rounded-3xl border border-border p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar size={14} className="text-primary" />
              <span>Schedule &amp; Billing</span>
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-background border border-border/80">
                <span className="text-[11px] text-muted-foreground block mb-0.5">Appointment Date</span>
                <span className="text-sm font-bold text-navy">{appointment.appointmentDate}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-background border border-border/80">
                <span className="text-[11px] text-muted-foreground block mb-0.5">Time Slot</span>
                <span className="text-sm font-bold text-navy">
                  {appointment.timeSlot?.startTime} – {appointment.timeSlot?.endTime}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-background border border-border/80">
                <span className="text-[11px] text-muted-foreground block mb-0.5">Mode of Care</span>
                <span className="text-sm font-bold text-navy capitalize">
                  {appointment.consultationMode?.replace('_', ' ')}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-background border border-border/80">
                <span className="text-[11px] text-muted-foreground block mb-0.5">Consultation Fee</span>
                <span className="text-sm font-bold text-navy">
                  ₹{appointment.pricing?.amount}{' '}
                  <span className="text-[10px] text-secondary font-semibold">
                    ({appointment.pricing?.paymentStatus})
                  </span>
                </span>
              </div>
            </div>

            {/* Action Bar */}
            {canModify && (
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full justify-center"
                  onClick={() => {
                    setShowRescheduleModal(true);
                    setRescheduleError(null);
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setRescheduleDate(
                      `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
                    );
                  }}
                  leftIcon={<RotateCcw size={14} />}
                >
                  Reschedule Slot
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="w-full justify-center text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel Booking
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Patient Clinical Info */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-7 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <User size={14} className="text-primary" />
            <span>Authorized Patient Demographics &amp; Reported Symptoms</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block">Patient Name:</span>
              <span className="font-bold text-navy">{appointment.patientDetails?.fullName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Contact Mobile:</span>
              <span className="font-semibold text-navy">{appointment.patientDetails?.phone}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Email:</span>
              <span className="font-medium text-navy">{appointment.patientDetails?.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Age / Gender:</span>
              <span className="font-medium text-navy">
                {appointment.patientDetails?.age || '55'} yrs •{' '}
                {appointment.patientDetails?.gender || 'Not specified'}
              </span>
            </div>
          </div>

          {appointment.clinicalReason && (
            <div className="p-4 rounded-2xl bg-background border border-border/80 text-xs">
              <span className="font-bold text-navy block mb-1">Chief Medical Complaint / Symptoms:</span>
              <p className="text-muted-foreground leading-relaxed">{appointment.clinicalReason}</p>
            </div>
          )}
        </div>

        {/* Doctor Consultation Notes & e-Prescription (if completed) */}
        {appointment.status === 'completed' && (
          <div className="bg-white rounded-3xl border border-teal-200 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider">
              <Pill size={16} />
              <span>Clinical Consultation Summary &amp; e-Prescription</span>
            </div>

            {appointment.doctorNotes && (
              <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 text-xs text-navy/90 leading-relaxed">
                <span className="font-bold block text-teal-900 mb-1">Doctor Findings &amp; Advice:</span>
                <p>{appointment.doctorNotes}</p>
              </div>
            )}

            {appointment.prescription?.medicines?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-navy block">Prescribed Medications:</span>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-background text-muted-foreground uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5 rounded-l-xl">Medicine</th>
                        <th className="p-2.5">Dosage</th>
                        <th className="p-2.5">Frequency</th>
                        <th className="p-2.5">Duration</th>
                        <th className="p-2.5 rounded-r-xl">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {appointment.prescription.medicines.map((med: any, i: number) => (
                        <tr key={i} className="text-navy">
                          <td className="p-2.5 font-bold">{med.name}</td>
                          <td className="p-2.5">{med.dosage}</td>
                          <td className="p-2.5">{med.frequency}</td>
                          <td className="p-2.5">{med.duration}</td>
                          <td className="p-2.5 text-muted-foreground">{med.instructions || 'With meals'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Booking Status History Timeline */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-7 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock size={14} className="text-primary" />
            <span>Booking Status History &amp; Audit Trail</span>
          </h2>

          <div className="space-y-4 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {appointment.statusHistory?.map((hist: any, idx: number) => (
              <div key={idx} className="relative">
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-primary border-2 border-white shadow-xs" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-bold text-navy capitalize">
                    Status: {hist.status?.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(hist.timestamp).toLocaleString()}
                  </span>
                </div>
                {hist.reason && (
                  <p className="text-xs text-muted-foreground mt-0.5">{hist.reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-navy">Cancel Appointment</h3>
            <p className="text-xs text-muted-foreground">
              Please enter the reason for cancellation. Once cancelled, this slot will be released.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Health improved, schedule conflict..."
              className="w-full p-3 rounded-xl border border-border text-xs text-navy focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none h-24"
            />
            {cancelError && <p className="text-xs text-destructive">{cancelError}</p>}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                className="w-full justify-center"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
              >
                Keep Booking
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                onClick={handleCancel}
                isLoading={isCancelling}
                disabled={cancelReason.trim().length < 3}
              >
                Confirm Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-navy">Reschedule Consultation</h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-muted-foreground hover:text-navy text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label htmlFor="detailRescheduleDateInput" className="text-xs font-semibold text-navy block mb-1">
                Select New Date:
              </label>
              <input
                id="detailRescheduleDateInput"
                type="date"
                value={rescheduleDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border text-xs text-navy font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy block mb-2">
                Select Available Slot:
              </label>
              {isLoadingSlots ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Checking live slots...</div>
              ) : rescheduleSlots.length === 0 ? (
                <div className="p-4 rounded-xl bg-background border border-border text-center text-xs text-muted-foreground">
                  Doctor not available on this date.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                  {rescheduleSlots.map((slot) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-1 text-xs rounded-xl font-semibold border transition-all text-center select-none ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : slot.isAvailable
                            ? 'bg-white text-navy border-border hover:border-primary hover:bg-primary-light/40 cursor-pointer'
                            : 'bg-background text-muted-foreground/40 border-dashed border-border cursor-not-allowed line-through'
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {rescheduleError && <p className="text-xs text-destructive">{rescheduleError}</p>}

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                className="w-full justify-center"
                onClick={() => setShowRescheduleModal(false)}
                disabled={isRescheduling}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center"
                onClick={handleReschedule}
                isLoading={isRescheduling}
                disabled={!selectedSlot}
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
