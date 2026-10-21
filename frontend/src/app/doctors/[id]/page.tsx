'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  ShieldCheck,
  Star,
  MapPin,
  Building2,
  Video,
  Home,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  User,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { LoadingState, ErrorState } from '@/components/UIStates';
import { doctorsApi, appointmentsApi, authApi } from '@/lib/api';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DoctorProfileBookingPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const doctorId = resolvedParams.id;
  const router = useRouter();

  const [doctor, setDoctor] = useState<any>(null);
  const [isLoadingDoctor, setIsLoadingDoctor] = useState(true);
  const [errorDoctor, setErrorDoctor] = useState<string | null>(null);

  // Booking selections
  const [consultationMode, setConsultationMode] = useState<'in_clinic' | 'video' | 'home_visit'>('in_clinic');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  // Patient inputs
  const [patientDetails, setPatientDetails] = useState({
    patientName: '',
    phone: '',
    email: '',
    age: '55',
    gender: 'prefer_not_to_say' as 'male' | 'female' | 'other' | 'prefer_not_to_say',
    clinicalReason: '',
    homeAddress: '',
    city: 'Pune',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Submission & Confirmation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 1. Fetch Doctor Details on mount
  useEffect(() => {
    async function loadDoctor() {
      setIsLoadingDoctor(true);
      setErrorDoctor(null);
      try {
        const data = await doctorsApi.getDoctorById(doctorId);
        setDoctor(data);

        // Pre-fill user info if logged in
        const storedUser = authApi.getStoredUser();
        if (storedUser) {
          setPatientDetails((prev) => ({
            ...prev,
            patientName: storedUser.fullName || '',
            phone: storedUser.phone || '',
            email: storedUser.email || '',
          }));
        }

        // Set default date to today or tomorrow
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`;
        setSelectedDate(tomorrowStr);
      } catch (err: any) {
        setErrorDoctor(err.message || 'Unable to load doctor profile');
      } finally {
        setIsLoadingDoctor(false);
      }
    }
    loadDoctor();
  }, [doctorId]);

  // 2. Fetch available slots whenever doctorId, selectedDate, or consultationMode changes
  useEffect(() => {
    if (!doctorId || !selectedDate) return;

    async function loadSlots() {
      setIsLoadingSlots(true);
      setSlotError(null);
      setSelectedSlot(null);
      try {
        const data = await doctorsApi.getDoctorSlots(doctorId, selectedDate, consultationMode);
        setAvailableSlots(data.slots || []);
      } catch (err: any) {
        console.error('Failed to load slots:', err);
        setSlotError(err.message || 'Unable to calculate doctor slots');
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    }

    loadSlots();
  }, [doctorId, selectedDate, consultationMode]);

  // Generate 14 upcoming date chips for the interactive date selector
  const dateChips = React.useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const isoStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();
      const isToday = i === 0;
      const isTomorrow = i === 1;

      list.push({
        isoStr,
        dayName,
        monthName,
        dayNum,
        isToday,
        isTomorrow,
        isSunday: d.getDay() === 0,
      });
    }
    return list;
  }, []);

  // Group slots into Morning, Afternoon, Evening
  const groupedSlots = React.useMemo(() => {
    const morning = [];
    const afternoon = [];
    const evening = [];

    for (const slot of availableSlots) {
      const hour = parseInt(slot.startTime.split(':')[0], 10);
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 17) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    }

    return { morning, afternoon, evening };
  }, [availableSlots]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validation
    const errors: Record<string, string> = {};
    if (!selectedSlot) {
      errors.slot = 'Please select an available time slot';
    }
    if (!patientDetails.patientName.trim()) {
      errors.patientName = 'Patient full name is required';
    }
    if (!patientDetails.phone.trim()) {
      errors.phone = '10-digit mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(patientDetails.phone.replace(/\D/g, ''))) {
      errors.phone = 'Enter a valid 10-digit Indian mobile number';
    }
    if (consultationMode === 'home_visit' && !patientDetails.homeAddress.trim()) {
      errors.homeAddress = 'Residence address is required for Home Visit';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        doctorId,
        appointmentDate: selectedDate,
        timeSlot: {
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        },
        consultationMode,
        patientName: patientDetails.patientName.trim(),
        phone: patientDetails.phone.replace(/\D/g, ''),
        email: patientDetails.email.trim() || undefined,
        age: parseInt(patientDetails.age, 10) || undefined,
        gender: patientDetails.gender,
        clinicalReason: patientDetails.clinicalReason.trim() || undefined,
        serviceLocationAddress: consultationMode === 'home_visit' ? patientDetails.homeAddress : undefined,
        serviceLocationCity: patientDetails.city,
      };

      const result = await appointmentsApi.bookAppointment(payload);
      setBookingSuccessData(result);
    } catch (err: any) {
      console.error('Booking failed:', err);
      setSubmitError(err.message || 'Unable to complete appointment booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDoctor) {
    return (
      <div className="w-full bg-background min-h-screen flex flex-col font-sans">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 w-full flex-1">
          <LoadingState message="Loading specialist profile and scheduling calendar..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (errorDoctor || !doctor) {
    return (
      <div className="w-full bg-background min-h-screen flex flex-col font-sans">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 w-full flex-1">
          <ErrorState
            title="Specialist Not Found"
            message={errorDoctor || 'Unable to find healthcare professional profile.'}
            onRetry={() => window.location.reload()}
          />
          <div className="text-center mt-6">
            <Button href="/doctors" variant="outline" size="md" leftIcon={<ArrowLeft size={16} />}>
              Back to Doctor Directory
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const inClinicFee = doctor.fees?.in_clinic || 800;
  const videoFee = doctor.fees?.video || 500;
  const homeFee = doctor.fees?.home_visit || 1200;
  const activeFee =
    consultationMode === 'in_clinic' ? inClinicFee : consultationMode === 'video' ? videoFee : homeFee;

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      {/* Top Breadcrumb Header */}
      <div className="bg-white border-b border-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/doctors"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to All Specialists</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Specialist Directory</span>
            <ChevronRight size={12} />
            <span className="text-navy font-semibold">{doctor.fullName}</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex-1 w-full">
        {/* SUCCESS CONFIRMATION MODAL / VIEW */}
        {bookingSuccessData ? (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-secondary/30 p-8 sm:p-12 shadow-2xl text-center">
            <div className="w-20 h-20 rounded-full bg-secondary-light text-secondary flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle2 size={48} />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-secondary-light text-secondary border border-secondary/20 text-xs font-bold mb-3">
              Appointment Confirmed
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight mb-2">
              Booking Reserved Successfully!
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
              Your appointment with <strong>{doctor.fullName}</strong> is officially scheduled in the VivoQuest clinical system.
            </p>

            {/* Appointment Reference Card */}
            <div className="p-6 rounded-2xl bg-background border border-border/80 text-left space-y-3 mb-8">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs text-muted-foreground">Booking Reference:</span>
                <span className="text-sm font-mono font-bold text-primary">
                  {bookingSuccessData.appointmentNumber}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Specialist:</span>
                <span className="font-semibold text-navy">{doctor.fullName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Scheduled Date:</span>
                <span className="font-semibold text-navy">{bookingSuccessData.appointmentDate}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Time Slot:</span>
                <span className="font-semibold text-navy">
                  {bookingSuccessData.timeSlot?.startTime} – {bookingSuccessData.timeSlot?.endTime}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Consultation Mode:</span>
                <span className="font-semibold capitalize text-secondary">
                  {bookingSuccessData.consultationMode?.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Consultation Fee:</span>
                <span className="font-bold text-navy">
                  ₹{bookingSuccessData.pricing?.amount} ({bookingSuccessData.pricing?.paymentStatus})
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                href={`/appointments/${bookingSuccessData.id || bookingSuccessData._id}`}
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight size={18} />}
              >
                View Appointment Details
              </Button>
              <Button href="/appointments" variant="outline" size="lg">
                Go to My Appointments
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Doctor Profile Card (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-3xl border border-border p-6 sm:p-7 shadow-sm sticky top-24 space-y-6">
              {/* Doctor Header */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-light to-secondary-light border border-border/80 flex items-center justify-center text-primary font-bold text-2xl shrink-0 shadow-inner">
                  {doctor.fullName
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-lg font-bold text-navy leading-snug">{doctor.fullName}</h1>
                    <ShieldCheck size={18} className="text-secondary shrink-0" />
                  </div>
                  <p className="text-xs font-semibold text-secondary mt-0.5">
                    {doctor.specializations?.[0]}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                      <Star size={13} className="fill-amber-400 text-amber-500" />
                      {doctor.rating ? doctor.rating.toFixed(1) : '4.9'}
                    </span>
                    <span>•</span>
                    <span>{doctor.yearsOfExperience} yrs exp</span>
                  </div>
                </div>
              </div>

              {/* Verified Badge */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-2 text-xs text-secondary-dark font-medium">
                <ShieldCheck size={16} className="text-secondary shrink-0" />
                <span>Verified by Maharashtra Medical / Allied Council</span>
              </div>

              {/* Bio */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Specialist Background
                </h3>
                <p className="text-xs text-navy/80 leading-relaxed">{doctor.bio}</p>
              </div>

              {/* Council & Qualifications */}
              <div className="space-y-2 border-t border-border/80 pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Registration ID:</span>
                  <span className="font-semibold text-navy font-mono">{doctor.registrationNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Council:</span>
                  <span className="font-medium text-navy truncate max-w-[180px]">
                    {doctor.registrationCouncil}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Location Cluster:</span>
                  <span className="font-medium text-navy">{doctor.city}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Slot Duration:</span>
                  <span className="font-medium text-navy">{doctor.slotDurationMinutes || 30} mins</span>
                </div>
              </div>

              {/* Clinic Address */}
              <div className="p-3.5 rounded-xl bg-background border border-border/80 text-xs text-navy/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-navy">
                  <MapPin size={14} className="text-primary shrink-0" />
                  <span>Clinical Center Venue</span>
                </div>
                <p className="text-[11px] text-muted-foreground pl-5">{doctor.clinicAddress}</p>
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Appointment Booking Wizard (8 cols) */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-border p-6 sm:p-9 shadow-sm">
              <form onSubmit={handleBookAppointment} className="space-y-8">
                {/* STEP 1: Consultation Mode Selector */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                        1
                      </span>
                      Choose Consultation Mode
                    </span>
                    <span className="text-xs text-muted-foreground">Select preferred visit mode</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setConsultationMode('in_clinic')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        consultationMode === 'in_clinic'
                          ? 'border-primary bg-primary-light/40 ring-2 ring-primary/20 shadow-sm'
                          : 'border-border bg-white hover:border-primary/40'
                      }`}
                    >
                      <Building2 className={`w-6 h-6 mb-2 ${consultationMode === 'in_clinic' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="font-bold text-sm text-navy">In-Clinic Visit</div>
                      <div className="text-xs text-muted-foreground mt-0.5">At doctor clinical suite</div>
                      <div className="text-sm font-extrabold text-primary mt-2">₹{inClinicFee}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConsultationMode('video')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        consultationMode === 'video'
                          ? 'border-secondary bg-secondary-light/40 ring-2 ring-secondary/20 shadow-sm'
                          : 'border-border bg-white hover:border-secondary/40'
                      }`}
                    >
                      <Video className={`w-6 h-6 mb-2 ${consultationMode === 'video' ? 'text-secondary' : 'text-muted-foreground'}`} />
                      <div className="font-bold text-sm text-navy">Video Teleconsult</div>
                      <div className="text-xs text-muted-foreground mt-0.5">High-definition telehealth</div>
                      <div className="text-sm font-extrabold text-secondary mt-2">₹{videoFee}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConsultationMode('home_visit')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        consultationMode === 'home_visit'
                          ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600/20 shadow-sm'
                          : 'border-border bg-white hover:border-purple-400'
                      }`}
                    >
                      <Home className={`w-6 h-6 mb-2 ${consultationMode === 'home_visit' ? 'text-purple-600' : 'text-muted-foreground'}`} />
                      <div className="font-bold text-sm text-navy">Home Care Visit</div>
                      <div className="text-xs text-muted-foreground mt-0.5">At patient bedside / home</div>
                      <div className="text-sm font-extrabold text-purple-700 mt-2">₹{homeFee}</div>
                    </button>
                  </div>
                </div>

                {/* STEP 2: Date Selector */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                        2
                      </span>
                      Choose Available Date
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:inline">Pick date:</span>
                      <input
                        type="date"
                        value={selectedDate}
                        min={dateChips[0]?.isoStr}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background font-medium text-navy"
                        aria-label="Select custom date"
                      />
                    </div>
                  </div>

                  {/* Horizontal Scrollable Day Chips */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {dateChips.map((chip) => {
                      const isSelected = selectedDate === chip.isoStr;
                      return (
                        <button
                          key={chip.isoStr}
                          type="button"
                          onClick={() => setSelectedDate(chip.isoStr)}
                          className={`flex flex-col items-center justify-center min-w-[72px] py-3 px-2 rounded-2xl border transition-all cursor-pointer shrink-0 select-none ${
                            isSelected
                              ? 'bg-primary text-white border-primary shadow-md ring-2 ring-primary/30'
                              : chip.isSunday
                              ? 'bg-background/50 border-dashed border-border/80 text-muted-foreground opacity-60'
                              : 'bg-white border-border text-navy hover:border-primary/50 hover:bg-background'
                          }`}
                        >
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {chip.isToday ? 'Today' : chip.isTomorrow ? 'Tmrw' : chip.dayName}
                          </span>
                          <span className="text-base font-extrabold mt-0.5">{chip.dayNum}</span>
                          <span className={`text-[9px] font-medium ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {chip.monthName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 3: Time Slot Selector */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                        3
                      </span>
                      Select Time Slot
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {availableSlots.filter((s) => s.isAvailable).length} slots available on {selectedDate}
                    </span>
                  </div>

                  {isLoadingSlots ? (
                    <div className="p-8 text-center bg-background rounded-2xl border border-border">
                      <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Checking live doctor availability...</p>
                    </div>
                  ) : slotError ? (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{slotError}</span>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="p-8 text-center bg-background rounded-2xl border border-dashed border-border">
                      <Calendar size={28} className="text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-semibold text-navy">Doctor Not Available on This Date</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Doctor is on leave or scheduled off on this day. Please pick another date above.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Morning Slots */}
                      {groupedSlots.morning.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                            Morning Slots (09:00 AM – 12:00 PM)
                          </span>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {groupedSlots.morning.map((slot) => {
                              const isSelected = selectedSlot?.startTime === slot.startTime;
                              return (
                                <button
                                  key={slot.startTime}
                                  type="button"
                                  disabled={!slot.isAvailable}
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`py-2 px-1 text-xs rounded-xl font-semibold border transition-all text-center select-none ${
                                    isSelected
                                      ? 'bg-primary text-white border-primary shadow-md ring-2 ring-primary/30'
                                      : slot.isAvailable
                                      ? 'bg-white text-navy border-border hover:border-primary hover:bg-primary-light/30 cursor-pointer'
                                      : 'bg-background/80 text-muted-foreground/50 border-dashed border-border cursor-not-allowed line-through'
                                  }`}
                                  title={slot.isAvailable ? `Available: ${slot.startTime}` : `Unavailable (${slot.reason})`}
                                >
                                  {slot.startTime}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Afternoon Slots */}
                      {groupedSlots.afternoon.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                            Afternoon Slots (12:00 PM – 05:00 PM)
                          </span>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {groupedSlots.afternoon.map((slot) => {
                              const isSelected = selectedSlot?.startTime === slot.startTime;
                              return (
                                <button
                                  key={slot.startTime}
                                  type="button"
                                  disabled={!slot.isAvailable}
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`py-2 px-1 text-xs rounded-xl font-semibold border transition-all text-center select-none ${
                                    isSelected
                                      ? 'bg-primary text-white border-primary shadow-md ring-2 ring-primary/30'
                                      : slot.isAvailable
                                      ? 'bg-white text-navy border-border hover:border-primary hover:bg-primary-light/30 cursor-pointer'
                                      : 'bg-background/80 text-muted-foreground/50 border-dashed border-border cursor-not-allowed line-through'
                                  }`}
                                  title={slot.isAvailable ? `Available: ${slot.startTime}` : `Unavailable (${slot.reason})`}
                                >
                                  {slot.startTime}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Evening Slots */}
                      {groupedSlots.evening.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                            Evening Slots (05:00 PM – 08:00 PM)
                          </span>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {groupedSlots.evening.map((slot) => {
                              const isSelected = selectedSlot?.startTime === slot.startTime;
                              return (
                                <button
                                  key={slot.startTime}
                                  type="button"
                                  disabled={!slot.isAvailable}
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`py-2 px-1 text-xs rounded-xl font-semibold border transition-all text-center select-none ${
                                    isSelected
                                      ? 'bg-primary text-white border-primary shadow-md ring-2 ring-primary/30'
                                      : slot.isAvailable
                                      ? 'bg-white text-navy border-border hover:border-primary hover:bg-primary-light/30 cursor-pointer'
                                      : 'bg-background/80 text-muted-foreground/50 border-dashed border-border cursor-not-allowed line-through'
                                  }`}
                                  title={slot.isAvailable ? `Available: ${slot.startTime}` : `Unavailable (${slot.reason})`}
                                >
                                  {slot.startTime}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {formErrors.slot && (
                    <p className="text-xs text-destructive mt-2">{formErrors.slot}</p>
                  )}
                </div>

                {/* STEP 4: Patient Details Form */}
                <div className="border-t border-border pt-6 space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                        4
                      </span>
                      Patient Demographics &amp; Symptoms
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      label="Patient Legal Name"
                      id="patientName"
                      placeholder="e.g. Ramesh Sharma"
                      value={patientDetails.patientName}
                      onChange={(e) =>
                        setPatientDetails({ ...patientDetails, patientName: e.target.value })
                      }
                      error={formErrors.patientName}
                      required
                    />

                    <FormField
                      label="Contact Mobile (10-Digit India)"
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      value={patientDetails.phone}
                      onChange={(e) =>
                        setPatientDetails({ ...patientDetails, phone: e.target.value })
                      }
                      error={formErrors.phone}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      label="Email Address (Optional)"
                      id="email"
                      type="email"
                      placeholder="patient@example.in"
                      value={patientDetails.email}
                      onChange={(e) =>
                        setPatientDetails({ ...patientDetails, email: e.target.value })
                      }
                    />

                    <FormField
                      label="Patient Age"
                      id="age"
                      type="number"
                      placeholder="55"
                      value={patientDetails.age}
                      onChange={(e) =>
                        setPatientDetails({ ...patientDetails, age: e.target.value })
                      }
                    />

                    <FormField
                      label="Gender"
                      id="gender"
                      as="select"
                      value={patientDetails.gender}
                      onChange={(e) =>
                        setPatientDetails({ ...patientDetails, gender: e.target.value as any })
                      }
                      options={[
                        { value: 'male', label: 'Male' },
                        { value: 'female', label: 'Female' },
                        { value: 'other', label: 'Other' },
                        { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                      ]}
                    />
                  </div>

                  {consultationMode === 'home_visit' && (
                    <FormField
                      label="Patient Residence Address (For Home Visit Care)"
                      id="homeAddress"
                      placeholder="Flat/House number, Apartment/Society, Landmark, Pune"
                      value={patientDetails.homeAddress}
                      onChange={(e) =>
                        setPatientDetails({ ...patientDetails, homeAddress: e.target.value })
                      }
                      error={formErrors.homeAddress}
                      required
                    />
                  )}

                  <FormField
                    label="Reason for Consultation / Current Symptoms"
                    id="clinicalReason"
                    as="textarea"
                    placeholder="Describe specific symptoms, cancer diagnosis stage, pain level, or medical concerns (e.g. severe nausea following cycle 3 chemo, breathlessness, palliative medication review)..."
                    value={patientDetails.clinicalReason}
                    onChange={(e) =>
                      setPatientDetails({ ...patientDetails, clinicalReason: e.target.value })
                    }
                  />
                </div>

                {/* STEP 5: Booking Summary & Confirmation Banner */}
                <div className="p-5 rounded-2xl bg-background border border-border/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy">Appointment Summary</span>
                    <span className="text-xs text-secondary font-semibold">
                      Mode: {consultationMode.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs text-navy/80 space-y-1">
                    <p>
                      <strong>Doctor:</strong> {doctor.fullName} ({doctor.specializations?.[0]})
                    </p>
                    <p>
                      <strong>Date &amp; Time:</strong>{' '}
                      {selectedDate || 'Select a date'} •{' '}
                      {selectedSlot
                        ? `${selectedSlot.startTime} – ${selectedSlot.endTime}`
                        : 'Select a time slot'}
                    </p>
                    <p>
                      <strong>Venue:</strong>{' '}
                      {consultationMode === 'home_visit'
                        ? 'Patient Residence'
                        : consultationMode === 'video'
                        ? 'Secure VivoQuest Telehealth Portal'
                        : doctor.clinicAddress}
                    </p>
                  </div>

                  <div className="border-t border-border pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground block">Consultation Fee</span>
                      <span className="text-xs text-muted-foreground/80">Payable at clinic / post-visit</span>
                    </div>
                    <span className="text-xl font-extrabold text-navy">₹{activeFee}</span>
                  </div>
                </div>

                {submitError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full justify-center shadow-lg hover:shadow-xl font-bold text-base"
                    isLoading={isSubmitting}
                    disabled={!selectedSlot}
                    rightIcon={<ArrowRight size={18} />}
                  >
                    Confirm &amp; Book Appointment
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground mt-2.5">
                    Free cancellation up to 2 hours prior to scheduled consultation time.
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
