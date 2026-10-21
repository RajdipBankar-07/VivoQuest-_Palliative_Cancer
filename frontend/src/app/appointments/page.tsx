'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  User,
  Filter,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { LoadingState, EmptyState, ErrorState } from '@/components/UIStates';
import { appointmentsApi, authApi, doctorsApi } from '@/lib/api';

export default function AppointmentsListPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation Modal State
  const [cancellingApt, setCancellingApt] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Reschedule Modal State
  const [reschedulingApt, setReschedulingApt] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<any | null>(null);
  const [isLoadingRescheduleSlots, setIsLoadingRescheduleSlots] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appointmentsApi.getMyAppointments();
      setAppointments(data || []);
    } catch (err: any) {
      console.error('Failed to load appointments:', err);
      setError(err.message || 'Unable to load appointments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Filter appointments according to active tab
  const filteredAppointments = React.useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    if (activeTab === 'upcoming') {
      return appointments.filter(
        (a) =>
          a.appointmentDate >= todayStr &&
          ['confirmed', 'in_progress', 'pending', 'reschedule_requested'].includes(a.status)
      );
    } else if (activeTab === 'past') {
      return appointments.filter(
        (a) =>
          (a.appointmentDate < todayStr || a.status === 'completed') &&
          a.status !== 'cancelled' &&
          a.status !== 'declined'
      );
    } else {
      // Cancelled
      return appointments.filter((a) => a.status === 'cancelled' || a.status === 'declined');
    }
  }, [appointments, activeTab]);

  // Cancel action
  const handleConfirmCancel = async () => {
    if (!cancellingApt || !cancelReason.trim()) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await appointmentsApi.cancelAppointment(cancellingApt.id || cancellingApt._id, cancelReason);
      setCancellingApt(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel appointment');
    } finally {
      setIsCancelling(false);
    }
  };

  // Open reschedule modal
  const openRescheduleModal = (apt: any) => {
    setReschedulingApt(apt);
    setRescheduleError(null);
    setSelectedRescheduleSlot(null);

    // Set tomorrow as default new date
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrowStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    setRescheduleDate(tomorrowStr);
  };

  // Fetch slots when reschedule date changes
  useEffect(() => {
    if (!reschedulingApt || !rescheduleDate) return;

    async function loadNewSlots() {
      setIsLoadingRescheduleSlots(true);
      setRescheduleError(null);
      setSelectedRescheduleSlot(null);
      try {
        const docId = reschedulingApt.doctorId?._id || reschedulingApt.doctorId;
        const res = await doctorsApi.getDoctorSlots(
          docId,
          rescheduleDate,
          reschedulingApt.consultationMode
        );
        setRescheduleSlots(res.slots || []);
      } catch (err: any) {
        setRescheduleError(err.message || 'Unable to fetch slots');
        setRescheduleSlots([]);
      } finally {
        setIsLoadingRescheduleSlots(false);
      }
    }
    loadNewSlots();
  }, [reschedulingApt, rescheduleDate]);

  // Submit reschedule
  const handleConfirmReschedule = async () => {
    if (!reschedulingApt || !selectedRescheduleSlot) return;
    setIsRescheduling(true);
    setRescheduleError(null);
    try {
      await appointmentsApi.rescheduleAppointment(
        reschedulingApt.id || reschedulingApt._id,
        {
          newDate: rescheduleDate,
          newTimeSlot: {
            startTime: selectedRescheduleSlot.startTime,
            endTime: selectedRescheduleSlot.endTime,
          },
          reason: 'Patient requested reschedule via appointments portal',
        }
      );
      setReschedulingApt(null);
      fetchAppointments();
    } catch (err: any) {
      setRescheduleError(err.message || 'Rescheduling failed. Slot may have been reserved.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} />
            <span>Confirmed</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>In Consultation</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <CheckCircle2 size={13} />
            <span>Visit Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={13} />
            <span>Cancelled</span>
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={13} />
            <span>Declined</span>
          </span>
        );
      case 'reschedule_requested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <RotateCcw size={13} />
            <span>Rescheduled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={13} />
            <span>Pending Review</span>
          </span>
        );
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'video':
        return <Video size={14} className="text-secondary" />;
      case 'home_visit':
        return <Home size={14} className="text-purple-600" />;
      default:
        return <Building2 size={14} className="text-primary" />;
    }
  };

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      {/* Header Banner */}
      <section className="w-full bg-white border-b border-border py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light text-primary border border-primary/20 text-xs font-semibold mb-2">
                <Calendar size={13} />
                <span>Patient Care Records</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
                My Healthcare Appointments
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Manage upcoming clinical sessions, review e-prescriptions, and access permitted reschedule options.
              </p>
            </div>

            <Button href="/doctors" variant="primary" size="md" leftIcon={<Plus size={16} />}>
              Book New Appointment
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-border mt-8 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'upcoming'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-navy'
              }`}
            >
              Upcoming Consultations
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'past'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-navy'
              }`}
            >
              Previous Visits
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'cancelled'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-navy'
              }`}
            >
              Cancelled Records
            </button>
          </div>
        </div>
      </section>

      {/* Main Content List */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
        {isLoading ? (
          <LoadingState message="Loading your appointments and clinical records..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAppointments} />
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            title={
              activeTab === 'upcoming'
                ? 'No Upcoming Appointments'
                : activeTab === 'past'
                ? 'No Past Consultations'
                : 'No Cancelled Appointments'
            }
            description={
              activeTab === 'upcoming'
                ? 'You do not have any scheduled consultations. Search our verified palliative specialists to book care.'
                : 'Your consultation history will appear here once visits are completed.'
            }
            actionText="Find a Doctor & Book Now"
            actionHref="/doctors"
          />
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((apt) => {
              const isPastOrCompleted =
                apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'declined';
              const doctorName =
                apt.doctorId?.fullName || apt.doctorProfileId?.userId?.fullName || 'Specialist Doctor';
              const doctorSpecialty =
                apt.doctorProfileId?.specializations?.[0] || 'Palliative Medicine';

              return (
                <div
                  key={apt.id || apt._id}
                  className="bg-white rounded-3xl border border-border/80 p-5 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  {/* Left: Doctor & Schedule Details */}
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-light to-secondary-light border border-border/80 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                      {doctorName
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {apt.appointmentNumber}
                        </span>
                        {getStatusBadge(apt.status)}
                        {apt.isSeededDemo && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-primary border border-blue-100 text-[10px] font-semibold">
                            Demo Visit
                          </span>
                        )}
                      </div>

                      <h2 className="text-base font-bold text-navy">{doctorName}</h2>
                      <p className="text-xs font-semibold text-secondary">{doctorSpecialty}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1.5">
                        <span className="flex items-center gap-1.5 font-medium text-navy">
                          <Calendar size={14} className="text-primary" />
                          <span>{apt.appointmentDate}</span>
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-navy">
                          <Clock size={14} className="text-primary" />
                          <span>
                            {apt.timeSlot?.startTime} – {apt.timeSlot?.endTime}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 capitalize font-medium text-navy">
                          {getModeIcon(apt.consultationMode)}
                          <span>{apt.consultationMode?.replace('_', ' ')}</span>
                        </span>
                      </div>

                      {apt.clinicalReason && (
                        <p className="text-xs text-muted-foreground/90 italic pt-1 line-clamp-1">
                          &ldquo;{apt.clinicalReason}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Fees & Action Buttons */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border/80">
                    <div className="text-left md:text-right">
                      <span className="text-[11px] text-muted-foreground block">Consultation Fee</span>
                      <span className="text-base font-extrabold text-navy">
                        ₹{apt.pricing?.amount}{' '}
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          ({apt.pricing?.paymentStatus})
                        </span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <Button
                        href={`/appointments/${apt.id || apt._id}`}
                        variant="primary"
                        size="sm"
                        rightIcon={<ArrowRight size={14} />}
                      >
                        View Details
                      </Button>

                      {!isPastOrCompleted && (
                        <>
                          <Button
                            type="button"
                            onClick={() => openRescheduleModal(apt)}
                            variant="outline"
                            size="sm"
                            leftIcon={<RotateCcw size={13} />}
                          >
                            Reschedule
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setCancellingApt(apt);
                              setCancelReason('');
                              setCancelError(null);
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CANCELLATION DIALOG MODAL */}
      {cancellingApt && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-navy">Cancel Appointment?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Are you sure you want to cancel booking <strong>{cancellingApt.appointmentNumber}</strong>?
                This time slot will be immediately freed for other patients.
              </p>
            </div>

            <div>
              <label htmlFor="cancelReasonInput" className="text-xs font-semibold text-navy block mb-1.5">
                Please provide reason for cancellation:
              </label>
              <textarea
                id="cancelReasonInput"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict, feeling better, relocated..."
                className="w-full p-3 rounded-xl border border-border text-xs text-navy focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none h-24"
              />
            </div>

            {cancelError && (
              <p className="text-xs text-destructive">{cancelError}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full justify-center"
                onClick={() => setCancellingApt(null)}
                disabled={isCancelling}
              >
                Keep Booking
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full justify-center bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                onClick={handleConfirmCancel}
                isLoading={isCancelling}
                disabled={cancelReason.trim().length < 3}
              >
                Confirm Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE DIALOG MODAL */}
      {reschedulingApt && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-navy">Reschedule Consultation</h3>
                <p className="text-xs text-muted-foreground">{reschedulingApt.appointmentNumber}</p>
              </div>
              <button
                onClick={() => setReschedulingApt(null)}
                className="text-muted-foreground hover:text-navy text-xs font-bold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            <div>
              <label htmlFor="rescheduleDateInput" className="text-xs font-semibold text-navy block mb-1.5">
                Select New Date:
              </label>
              <input
                id="rescheduleDateInput"
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
              {isLoadingRescheduleSlots ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Checking live slots...</div>
              ) : rescheduleSlots.length === 0 ? (
                <div className="p-4 rounded-xl bg-background border border-border text-center text-xs text-muted-foreground">
                  Doctor not available on this date. Please pick another date.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                  {rescheduleSlots.map((slot) => {
                    const isSelected = selectedRescheduleSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedRescheduleSlot(slot)}
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

            {rescheduleError && (
              <p className="text-xs text-destructive">{rescheduleError}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full justify-center"
                onClick={() => setReschedulingApt(null)}
                disabled={isRescheduling}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full justify-center"
                onClick={handleConfirmReschedule}
                isLoading={isRescheduling}
                disabled={!selectedRescheduleSlot}
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
