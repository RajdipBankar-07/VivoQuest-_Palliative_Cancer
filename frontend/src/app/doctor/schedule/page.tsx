'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Building2,
  Video,
  Home,
  AlertCircle,
  Save,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { LoadingState, ErrorState } from '@/components/UIStates';
import { doctorsApi, authApi } from '@/lib/api';

const DAY_LABELS = [
  { dayOfWeek: 1, label: 'Monday' },
  { dayOfWeek: 2, label: 'Tuesday' },
  { dayOfWeek: 3, label: 'Wednesday' },
  { dayOfWeek: 4, label: 'Thursday' },
  { dayOfWeek: 5, label: 'Friday' },
  { dayOfWeek: 6, label: 'Saturday' },
  { dayOfWeek: 0, label: 'Sunday' },
];

export default function DoctorScheduleManagementPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Schedule configuration states
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(5);
  const [weeklySchedule, setWeeklySchedule] = useState<any[]>([
    { dayOfWeek: 1, isWorkingDay: true, shifts: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '18:00' }] },
    { dayOfWeek: 2, isWorkingDay: true, shifts: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '18:00' }] },
    { dayOfWeek: 3, isWorkingDay: true, shifts: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '18:00' }] },
    { dayOfWeek: 4, isWorkingDay: true, shifts: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '18:00' }] },
    { dayOfWeek: 5, isWorkingDay: true, shifts: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '18:00' }] },
    { dayOfWeek: 6, isWorkingDay: true, shifts: [{ startTime: '09:00', endTime: '14:00' }] },
    { dayOfWeek: 0, isWorkingDay: false, shifts: [] },
  ]);

  const [breakTimes, setBreakTimes] = useState<any[]>([
    { startTime: '13:00', endTime: '14:00', label: 'Lunch Break' },
  ]);

  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [newBlackoutDate, setNewBlackoutDate] = useState('');

  const [fees, setFees] = useState({
    in_clinic: 800,
    video: 500,
    home_visit: 1200,
    currency: 'INR',
  });

  const [clinicAddress, setClinicAddress] = useState('VivoQuest Clinical Center, FC Road, Pune');
  const [city, setCity] = useState('Pune');

  useEffect(() => {
    async function loadSchedule() {
      setIsLoading(true);
      try {
        const user = authApi.getStoredUser();
        setCurrentUser(user);

        if (!user) {
          setIsLoading(false);
          return;
        }

        const data = await doctorsApi.getDoctorAvailability(user.id);
        if (data) {
          if (data.slotDurationMinutes) setSlotDurationMinutes(data.slotDurationMinutes);
          if (data.bufferMinutes !== undefined) setBufferMinutes(data.bufferMinutes);
          if (data.weeklySchedule?.length) setWeeklySchedule(data.weeklySchedule);
          if (data.breakTimes?.length) setBreakTimes(data.breakTimes);
          if (data.blackoutDates) setBlackoutDates(data.blackoutDates);
          if (data.fees) setFees(data.fees);
          if (data.clinicAddress) setClinicAddress(data.clinicAddress);
          if (data.city) setCity(data.city);
        }
      } catch (err: any) {
        console.error('Failed to load doctor schedule:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadSchedule();
  }, []);

  const handleToggleDay = (dayOfWeek: number) => {
    setWeeklySchedule((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? {
              ...d,
              isWorkingDay: !d.isWorkingDay,
              shifts: !d.isWorkingDay && d.shifts.length === 0 ? [{ startTime: '09:00', endTime: '17:00' }] : d.shifts,
            }
          : d
      )
    );
  };

  const handleAddShift = (dayOfWeek: number) => {
    setWeeklySchedule((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, shifts: [...d.shifts, { startTime: '14:00', endTime: '18:00' }] }
          : d
      )
    );
  };

  const handleRemoveShift = (dayOfWeek: number, shiftIndex: number) => {
    setWeeklySchedule((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, shifts: d.shifts.filter((_: any, idx: number) => idx !== shiftIndex) }
          : d
      )
    );
  };

  const handleShiftTimeChange = (
    dayOfWeek: number,
    shiftIndex: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const updatedShifts = [...d.shifts];
        updatedShifts[shiftIndex] = { ...updatedShifts[shiftIndex], [field]: value };
        return { ...d, shifts: updatedShifts };
      })
    );
  };

  const handleAddBlackoutDate = () => {
    if (!newBlackoutDate || blackoutDates.includes(newBlackoutDate)) return;
    setBlackoutDates([...blackoutDates, newBlackoutDate]);
    setNewBlackoutDate('');
  };

  const handleRemoveBlackoutDate = (dateToRemove: string) => {
    setBlackoutDates(blackoutDates.filter((d) => d !== dateToRemove));
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        slotDurationMinutes,
        bufferMinutes,
        weeklySchedule,
        breakTimes,
        blackoutDates,
        fees,
        clinicAddress,
        city,
      };

      await doctorsApi.updateSchedule(payload);
      setSuccessMessage('Schedule and clinical availability updated successfully!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-background min-h-screen flex flex-col font-sans">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 w-full flex-1">
          <LoadingState message="Loading availability configuration..." />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-border py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/doctor/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Doctor Dashboard</span>
          </Link>
          <span className="text-xs text-muted-foreground">Doctor Availability Engine</span>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex-1 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
              Working Hours &amp; Schedule Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Configure active consultation days, daily shifts, slot intervals, and blackout dates.
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSaveSchedule} className="space-y-8">
          {/* Card 1: Slot Parameters & Consultation Fees */}
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Clock size={16} />
              <span>Consultation Slot Parameters &amp; Fees</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="font-semibold text-navy block mb-1.5">Slot Duration (Minutes):</label>
                <select
                  value={slotDurationMinutes}
                  onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-navy font-medium"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes (Recommended)</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-navy block mb-1.5">In-Clinic Fee (₹):</label>
                <input
                  type="number"
                  value={fees.in_clinic}
                  onChange={(e) => setFees({ ...fees, in_clinic: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-border text-navy font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-navy block mb-1.5">Video Call Fee (₹):</label>
                <input
                  type="number"
                  value={fees.video}
                  onChange={(e) => setFees({ ...fees, video: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-border text-navy font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-navy block mb-1.5">Home Visit Fee (₹):</label>
                <input
                  type="number"
                  value={fees.home_visit}
                  onChange={(e) => setFees({ ...fees, home_visit: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-border text-navy font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-navy block mb-1.5">Primary Clinic Address:</label>
                <input
                  type="text"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-navy"
                />
              </div>
              <div>
                <label className="font-semibold text-navy block mb-1.5">City / Operating Cluster:</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-navy"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Weekly Schedule by Day */}
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Calendar size={16} />
              <span>Weekly Working Schedule &amp; Shifts</span>
            </h2>

            <div className="space-y-4">
              {DAY_LABELS.map(({ dayOfWeek, label }) => {
                const dayConfig =
                  weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek) || {
                    dayOfWeek,
                    isWorkingDay: false,
                    shifts: [],
                  };

                return (
                  <div
                    key={dayOfWeek}
                    className={`p-4 rounded-2xl border transition-all ${
                      dayConfig.isWorkingDay
                        ? 'border-border bg-background/50'
                        : 'border-dashed border-border/80 bg-background/20 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`day-${dayOfWeek}`}
                          checked={dayConfig.isWorkingDay}
                          onChange={() => handleToggleDay(dayOfWeek)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <label
                          htmlFor={`day-${dayOfWeek}`}
                          className="text-sm font-bold text-navy cursor-pointer select-none"
                        >
                          {label}
                        </label>
                        {!dayConfig.isWorkingDay && (
                          <span className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-border/50">
                            Off
                          </span>
                        )}
                      </div>

                      {dayConfig.isWorkingDay && (
                        <button
                          type="button"
                          onClick={() => handleAddShift(dayOfWeek)}
                          className="text-xs font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Add Shift</span>
                        </button>
                      )}
                    </div>

                    {dayConfig.isWorkingDay && (
                      <div className="space-y-2 pl-7">
                        {dayConfig.shifts?.map((shift: any, sIdx: number) => (
                          <div key={sIdx} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground w-12">Shift {sIdx + 1}:</span>
                            <input
                              type="time"
                              value={shift.startTime}
                              onChange={(e) =>
                                handleShiftTimeChange(dayOfWeek, sIdx, 'startTime', e.target.value)
                              }
                              className="p-1.5 rounded-lg border border-border bg-white text-navy font-mono"
                            />
                            <span className="text-muted-foreground">to</span>
                            <input
                              type="time"
                              value={shift.endTime}
                              onChange={(e) =>
                                handleShiftTimeChange(dayOfWeek, sIdx, 'endTime', e.target.value)
                              }
                              className="p-1.5 rounded-lg border border-border bg-white text-navy font-mono"
                            />
                            {dayConfig.shifts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveShift(dayOfWeek, sIdx)}
                                className="text-muted-foreground hover:text-rose-600 p-1"
                                title="Remove shift"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Blackout Dates / Holidays */}
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Calendar size={16} />
              <span>Leaves, Holidays &amp; Blackout Dates</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Dates listed here will automatically be marked unavailable for patient booking.
            </p>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={newBlackoutDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewBlackoutDate(e.target.value)}
                className="p-2 rounded-xl border border-border text-xs text-navy"
              />
              <Button
                type="button"
                onClick={handleAddBlackoutDate}
                variant="outline"
                size="sm"
                disabled={!newBlackoutDate}
              >
                + Add Blackout Date
              </Button>
            </div>

            {blackoutDates.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {blackoutDates.map((dateStr) => (
                  <span
                    key={dateStr}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
                  >
                    <span>{dateStr}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlackoutDate(dateStr)}
                      className="hover:text-rose-900 cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              href="/doctor/dashboard"
              variant="outline"
              size="lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSaving}
              leftIcon={<Save size={16} />}
              className="px-8"
            >
              Save Schedule Settings
            </Button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
