'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Star,
  Video,
  Home,
  Building2,
  Stethoscope,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UserCheck,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SectionHeading } from '@/components/SectionHeading';
import { Button } from '@/components/Button';
import { LoadingState, EmptyState, ErrorState } from '@/components/UIStates';
import { doctorsApi } from '@/lib/api';

const SPECIALTY_OPTIONS = [
  { label: 'All Specialties', value: 'all' },
  { label: 'Palliative Oncology', value: 'Palliative Oncology' },
  { label: 'Palliative Medicine & Hospice', value: 'Palliative Medicine' },
  { label: 'Pain & Physical Rehab', value: 'Physiotherapy' },
  { label: 'Palliative Oncology Nursing', value: 'Nursing' },
  { label: 'Psycho-Oncology & Counseling', value: 'Counseling' },
  { label: 'Oncology Clinical Nutrition', value: 'Nutrition' },
];

const MODE_OPTIONS = [
  { label: 'All Modes', value: 'all', icon: Sparkles },
  { label: 'In-Clinic', value: 'in_clinic', icon: Building2 },
  { label: 'Video Call', value: 'video', icon: Video },
  { label: 'Home Visit', value: 'home_visit', icon: Home },
];

const CITY_OPTIONS = [
  { label: 'All Locations', value: 'all' },
  { label: 'Pune', value: 'Pune' },
  { label: 'Mumbai', value: 'Mumbai' },
  { label: 'Nagpur', value: 'Nagpur' },
];

export default function FindDoctorPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedMode, setSelectedMode] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');

  const fetchDoctors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await doctorsApi.getDoctors({
        search: search.trim() || undefined,
        specialty: selectedSpecialty,
        consultationMode: selectedMode,
        city: selectedCity,
      });
      setDoctors(data || []);
    } catch (err: any) {
      console.error('Failed to load doctors:', err);
      setError(err.message || 'Unable to load doctors. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctors();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedSpecialty, selectedMode, selectedCity]);

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      {/* Hero Search Header */}
      <section className="w-full bg-white border-b border-border py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-light text-primary border border-primary/20 text-xs font-semibold mb-3">
                <Stethoscope size={14} />
                <span>Verified Healthcare Specialists</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-navy tracking-tight leading-tight">
                Find Palliative Doctors &amp; Specialists
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
                Connect with verified palliative oncologists, physicians, oncology nurses, physiotherapists, and clinical counselors. Book In-Clinic, Video Teleconsultation, or dignified Home Visits.
              </p>
            </div>

            {/* Quick Link to My Appointments */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/appointments"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border text-navy text-xs font-semibold hover:border-primary hover:text-primary transition-all shadow-sm"
              >
                <Calendar size={15} className="text-primary" />
                <span>My Appointments</span>
              </Link>
              <Link
                href="/doctor/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy text-white text-xs font-semibold hover:bg-navy-dark transition-all shadow-sm"
              >
                <UserCheck size={15} className="text-secondary-light" />
                <span>Doctor Portal</span>
              </Link>
            </div>
          </div>

          {/* Search Bar & Filters Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-background border border-border/80 shadow-sm space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search by doctor name, specialty, clinical condition (e.g. pain management, palliative chemo, oncology nursing)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-border text-navy text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-inner"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-navy px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Secondary Filter Rows */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Consultation Modes Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-xs font-semibold text-muted-foreground mr-1 hidden sm:inline">Mode:</span>
                {MODE_OPTIONS.map((m) => {
                  const Icon = m.icon;
                  const isActive = selectedMode === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setSelectedMode(m.value)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-primary text-white shadow-sm font-semibold'
                          : 'bg-white text-navy/80 border border-border hover:border-primary/40'
                      }`}
                    >
                      <Icon size={13} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dropdowns */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {/* Specialty Dropdown */}
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-border text-navy text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-label="Filter by specialty"
                >
                  {SPECIALTY_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                {/* City Dropdown */}
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-border text-navy text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-label="Filter by city"
                >
                  {CITY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Results Listing */}
      <main className="w-full py-10 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">
            Showing <strong className="text-navy">{doctors.length}</strong> available healthcare specialists
          </p>
          {(search || selectedSpecialty !== 'all' || selectedMode !== 'all' || selectedCity !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedSpecialty('all');
                setSelectedMode('all');
                setSelectedCity('all');
              }}
              className="text-xs text-primary hover:text-primary-hover font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Content States */}
        {isLoading ? (
          <LoadingState message="Finding available doctors and schedules..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDoctors} />
        ) : doctors.length === 0 ? (
          <EmptyState
            title="No Doctors Found"
            description="No specialists match your search criteria. Try removing or broadening your filters."
            actionText="View All Specialists"
            onAction={() => {
              setSearch('');
              setSelectedSpecialty('all');
              setSelectedMode('all');
              setSelectedCity('all');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => {
              const inClinicFee = doctor.fees?.in_clinic || 800;
              const videoFee = doctor.fees?.video || 500;
              const homeFee = doctor.fees?.home_visit || 1200;

              return (
                <div
                  key={doctor.id}
                  className="bg-white rounded-3xl border border-border/90 p-6 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between group hover:border-primary/40 relative"
                >
                  {/* Seeded Demo Ribbon */}
                  {doctor.isSeededDemo && (
                    <div className="absolute top-4 right-4">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-primary border border-blue-200 text-[10px] font-semibold tracking-wide">
                        Demo Specialist
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Top Row: Avatar & Badges */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-light to-secondary-light border border-border/80 flex items-center justify-center text-primary font-bold text-xl shadow-inner">
                          {doctor.fullName
                            ?.split(' ')
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-secondary border-2 border-white flex items-center justify-center shadow-xs" title="Available for appointments">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 pr-16">
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-base font-bold text-navy truncate group-hover:text-primary transition-colors">
                            {doctor.fullName}
                          </h2>
                          <span title="Verified Medical Practitioner">
                            <ShieldCheck size={16} className="text-secondary shrink-0" />
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-secondary mt-0.5">
                          {doctor.specializations?.[0] || 'Palliative Medicine'}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                            <Star size={12} className="fill-amber-400 text-amber-500" />
                            {doctor.rating ? doctor.rating.toFixed(1) : '4.9'}
                          </span>
                          <span>•</span>
                          <span>{doctor.yearsOfExperience} yrs exp</span>
                          <span>•</span>
                          <span>{doctor.totalVisitsCompleted}+ visits</span>
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                      {doctor.bio}
                    </p>

                    {/* Registration & Council */}
                    <div className="p-2.5 rounded-xl bg-background border border-border/60 text-[11px] text-navy/80 space-y-1 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Reg Number:</span>
                        <span className="font-semibold text-navy">{doctor.registrationNumber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Council:</span>
                        <span className="font-medium text-navy/90 truncate max-w-[170px]">
                          {doctor.registrationCouncil}
                        </span>
                      </div>
                    </div>

                    {/* Consultation Modes & Fees */}
                    <div className="space-y-1.5 mb-5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Consultation Modes &amp; Fees
                      </span>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100 flex flex-col items-center">
                          <Building2 size={13} className="text-primary mb-1" />
                          <span className="text-[10px] font-medium text-navy/70">Clinic</span>
                          <span className="text-xs font-bold text-navy">₹{inClinicFee}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 flex flex-col items-center">
                          <Video size={13} className="text-secondary mb-1" />
                          <span className="text-[10px] font-medium text-navy/70">Video</span>
                          <span className="text-xs font-bold text-navy">₹{videoFee}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-purple-50/60 border border-purple-100 flex flex-col items-center">
                          <Home size={13} className="text-purple-600 mb-1" />
                          <span className="text-[10px] font-medium text-navy/70">Home</span>
                          <span className="text-xs font-bold text-navy">₹{homeFee}</span>
                        </div>
                      </div>
                    </div>

                    {/* Clinic Address Callout */}
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate mb-5">
                      <MapPin size={13} className="text-primary shrink-0" />
                      <span className="truncate">{doctor.clinicAddress || doctor.city}</span>
                    </div>
                  </div>

                  {/* Action CTA */}
                  <div className="pt-2">
                    <Button
                      href={`/doctors/${doctor.id}`}
                      variant="primary"
                      size="md"
                      className="w-full justify-center group-hover:bg-primary-hover shadow-sm"
                      rightIcon={<ArrowRight size={16} />}
                    >
                      Book Appointment
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
