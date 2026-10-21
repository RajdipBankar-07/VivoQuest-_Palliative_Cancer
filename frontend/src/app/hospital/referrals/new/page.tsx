'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Plus,
  Trash2,
  Activity,
  Sparkles,
  Phone,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { hospitalsApi, ApiClientError, authApi } from '@/lib/api';

export default function NewReferralPage() {
  const router = useRouter();

  const [catalog, setCatalog] = useState<{ services: any[]; equipment: any[] }>({
    services: [],
    equipment: [],
  });
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReferral, setSuccessReferral] = useState<any>(null);

  // Form State
  const [staffName, setStaffName] = useState('Dr. Cyrus Poonawalla');
  const [staffDepartment, setStaffDepartment] = useState('Oncology');
  const [staffDesignation, setStaffDesignation] = useState('Attending Medical Oncologist');
  const [staffPhone, setStaffPhone] = useState('9822011113');
  const [staffEmail, setStaffEmail] = useState('c.poonawalla@rubyhall.com');

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientAge, setPatientAge] = useState<number | ''>(65);
  const [patientGender, setPatientGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>('male');
  const [ipdNumber, setIpdNumber] = useState('');
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().slice(0, 10));
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Pune');
  const [pincode, setPincode] = useState('411001');
  const [cluster, setCluster] = useState('Pune Central');

  const [primaryDiagnosis, setPrimaryDiagnosis] = useState('');
  const [secondaryConditions, setSecondaryConditions] = useState<string[]>([]);
  const [mobilityStatus, setMobilityStatus] = useState<'ambulatory' | 'assisted_walker' | 'wheelchair_bound' | 'bedbound'>('assisted_walker');
  const [palliativeCareNeeds, setPalliativeCareNeeds] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Selected Services
  const [selectedServices, setSelectedServices] = useState<
    Array<{
      serviceCode: string;
      serviceName: string;
      frequency: 'daily' | 'alternate_days' | 'weekly' | 'as_needed' | 'one_time';
      durationDays: number;
      preferredStartDate: string;
      preferredTimeSlot: 'morning' | 'afternoon' | 'evening' | 'any';
      instructions: string;
    }>
  >([]);

  // Selected Equipment
  const [selectedEquipment, setSelectedEquipment] = useState<
    Array<{
      itemType: string;
      name: string;
      quantity: number;
      urgency: 'routine' | 'urgent' | 'immediate';
      deliveryDate: string;
      durationWeeks: number;
      specialInstructions: string;
    }>
  >([]);

  const [priority, setPriority] = useState<'routine' | 'urgent' | 'immediate'>('urgent');
  const [consentAccepted, setConsentAccepted] = useState(true);

  // Load catalog on mount
  useEffect(() => {
    const initData = async () => {
      try {
        const [catData, profData] = await Promise.all([
          hospitalsApi.getServicesCatalog().catch(() => null),
          hospitalsApi.getProfile().catch(() => null),
        ]);

        if (catData) {
          setCatalog(catData);
          // Default pre-select skilled nursing as common baseline
          const defaultSvc = catData.services?.[0];
          if (defaultSvc) {
            setSelectedServices([
              {
                serviceCode: defaultSvc.serviceCode,
                serviceName: defaultSvc.name,
                frequency: defaultSvc.defaultFrequency || 'daily',
                durationDays: 14,
                preferredStartDate: new Date().toISOString().slice(0, 10),
                preferredTimeSlot: 'morning',
                instructions: 'Daily vital checks and wound dressing management',
              },
            ]);
          }
        }

        if (profData) {
          setProfile(profData);
          if (profData.authorizedStaff?.[0]) {
            setStaffName(profData.authorizedStaff[0].name);
            setStaffDepartment(profData.authorizedStaff[0].department);
            setStaffDesignation(profData.authorizedStaff[0].designation);
            setStaffPhone(profData.authorizedStaff[0].phone);
            setStaffEmail(profData.authorizedStaff[0].email || '');
          }
          if (profData.cluster) setCluster(profData.cluster);
        }
      } catch (err) {
        console.warn('Catalog loading notice:', err);
      }
    };

    initData();
  }, []);

  const handleToggleService = (svc: any) => {
    const exists = selectedServices.find((s) => s.serviceCode === svc.serviceCode);
    if (exists) {
      setSelectedServices(selectedServices.filter((s) => s.serviceCode !== svc.serviceCode));
    } else {
      setSelectedServices([
        ...selectedServices,
        {
          serviceCode: svc.serviceCode,
          serviceName: svc.name,
          frequency: svc.defaultFrequency || 'daily',
          durationDays: 14,
          preferredStartDate: dischargeDate || new Date().toISOString().slice(0, 10),
          preferredTimeSlot: 'morning',
          instructions: '',
        },
      ]);
    }
  };

  const handleToggleEquipment = (eq: any) => {
    const exists = selectedEquipment.find((e) => e.name === eq.name);
    if (exists) {
      setSelectedEquipment(selectedEquipment.filter((e) => e.name !== eq.name));
    } else {
      setSelectedEquipment([
        ...selectedEquipment,
        {
          itemType: eq.itemType,
          name: eq.name,
          quantity: 1,
          urgency: eq.urgency || 'routine',
          deliveryDate: dischargeDate || new Date().toISOString().slice(0, 10),
          durationWeeks: eq.defaultWeeks || 4,
          specialInstructions: '',
        },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!patientName.trim()) {
      setError('Patient full name is required');
      return;
    }
    const cleanPhone = patientPhone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please provide a valid 10-digit Indian mobile number for the patient/caregiver');
      return;
    }
    if (!address.trim() || !pincode.trim()) {
      setError('Patient discharge residence address and 6-digit PIN code are required');
      return;
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      setError('PIN code must be a valid 6-digit Indian postal code');
      return;
    }
    if (!primaryDiagnosis.trim()) {
      setError('Primary clinical diagnosis or surgical history is required');
      return;
    }
    if (selectedServices.length === 0 && selectedEquipment.length === 0) {
      setError('Please select at least one clinical home service or medical equipment item');
      return;
    }
    if (!consentAccepted) {
      setError('DPDP Act data processing authorization consent is required');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        referringStaff: {
          name: staffName.trim(),
          department: staffDepartment.trim(),
          designation: staffDesignation.trim(),
          phone: staffPhone.trim(),
          email: staffEmail.trim() || undefined,
        },
        patientDetails: {
          fullName: patientName.trim(),
          phone: cleanPhone,
          email: patientEmail.trim() || undefined,
          age: Number(patientAge) || 50,
          gender: patientGender,
          ipdNumber: ipdNumber.trim() || undefined,
          dischargeDate,
          address: address.trim(),
          city,
          pincode: pincode.trim(),
          cluster,
        },
        clinicalSummary: {
          primaryDiagnosis: primaryDiagnosis.trim(),
          secondaryConditions,
          mobilityStatus,
          palliativeCareNeeds: palliativeCareNeeds.trim() || undefined,
          clinicalNotes: clinicalNotes.trim() || undefined,
        },
        requestedServices: selectedServices,
        equipmentRequired: selectedEquipment,
        priority,
      };

      const result = await hospitalsApi.createReferral(payload);
      setSuccessReferral(result);
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Referral creation failed. Please verify connection to the API.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Success Screen
  if (successReferral) {
    return (
      <div className="w-full bg-background min-h-screen flex flex-col font-sans">
        <Navbar />

        <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 flex items-center justify-center">
          <div className="bg-white rounded-3xl border border-border shadow-xl p-8 sm:p-10 text-center w-full space-y-6 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-secondary-light text-secondary flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <span className="text-[11px] font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-wider">
                Referral Logged &amp; Transmitted
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy mt-3">
                Discharge Referral Created Successfully!
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
                Patient <strong>{successReferral.patientDetails.fullName}</strong> has been registered in the VivoQuest clinical triage queue.
              </p>
            </div>

            {/* Referral Info Card */}
            <div className="p-5 rounded-2xl bg-background border border-border text-left space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <span className="text-xs text-muted-foreground">Unique Referral Code:</span>
                <span className="font-mono text-base font-bold text-primary bg-white px-3 py-1 rounded-lg border border-border shadow-xs">
                  {successReferral.referralNumber}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-navy/80">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Patient Contact:</span>
                  <strong>+91 {successReferral.patientDetails.phone}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Discharge Date:</span>
                  <strong>{successReferral.patientDetails.dischargeDate}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Services Requested:</span>
                  <strong>{successReferral.requestedServices?.length || 0} Clinical Services</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">DME Equipment:</span>
                  <strong>{successReferral.equipmentRequired?.length || 0} Items</strong>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                href={`/hospital/referrals/${successReferral.id || successReferral._id}`}
                variant="primary"
                size="lg"
                className="w-full sm:w-auto shadow-primary"
              >
                Track Referral &amp; Evaluate Care Bundle
              </Button>
              <Button
                href="/hospital/dashboard"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                Return to Dashboard
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

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Hospital Dashboard</span>
          </Link>
          <span className="text-xs font-medium text-navy/70">
            Organization: <strong>{profile?.hospitalName || 'Ruby Hall Clinic'}</strong>
          </span>
        </div>

        {/* Header Title */}
        <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-primary shrink-0">
              <Layers size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy tracking-tight">
                Create Patient Discharge Care Referral
              </h1>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                Submit an authorized post-discharge home care request with clinical rehabilitation services and durable medical equipment (DME) requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Intake Form */}
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Section 1: Referring Staff Information */}
          <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <User size={18} className="text-primary" />
              <h2 className="text-base font-bold text-navy">
                1. Referring Hospital Clinician / Liaison
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                label="Attending Staff Full Name"
                id="staffName"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Dr. Full Name"
                required
              />
              <FormField
                label="Department / Unit"
                id="staffDepartment"
                value={staffDepartment}
                onChange={(e) => setStaffDepartment(e.target.value)}
                placeholder="e.g., Oncology, Cardiology"
                required
              />
              <FormField
                label="Clinical Designation"
                id="staffDesignation"
                value={staffDesignation}
                onChange={(e) => setStaffDesignation(e.target.value)}
                placeholder="e.g., Senior Consultant"
                required
              />
              <FormField
                label="Direct Contact Mobile / Ext"
                id="staffPhone"
                value={staffPhone}
                onChange={(e) => setStaffPhone(e.target.value)}
                placeholder="9822011113"
                required
              />
              <FormField
                label="Official Hospital Email"
                id="staffEmail"
                type="email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="staff@hospital.com"
              />
            </div>
          </div>

          {/* Section 2: Patient Demographics & Hospital Stay */}
          <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <HeartPulse size={18} className="text-secondary" />
              <h2 className="text-base font-bold text-navy">
                2. Patient Demographics &amp; Discharge Plan
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                label="Patient Full Name"
                id="patientName"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Enter patient full name"
                required
              />
              <FormField
                label="Primary Contact Mobile (Patient / Family)"
                id="patientPhone"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="10-digit Indian number"
                helperText="Must be a valid 10-digit Indian number for coordination"
                required
              />
              <FormField
                label="Contact Email (Optional)"
                id="patientEmail"
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                placeholder="family@example.com"
              />
              <div>
                <label className="text-xs font-semibold text-navy block mb-1.5">
                  Age (Years)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-navy text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-navy block mb-1.5">
                  Gender
                </label>
                <select
                  value={patientGender}
                  onChange={(e: any) => setPatientGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-navy text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <FormField
                label="IPD / Inpatient Admission No."
                id="ipdNumber"
                value={ipdNumber}
                onChange={(e) => setIpdNumber(e.target.value)}
                placeholder="e.g., RH-IPD-89104"
              />
              <div>
                <label className="text-xs font-semibold text-navy block mb-1.5">
                  Planned Discharge Date
                </label>
                <input
                  type="date"
                  value={dischargeDate}
                  onChange={(e) => setDischargeDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-navy text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-navy block mb-1.5">
                  Service Cluster
                </label>
                <select
                  value={cluster}
                  onChange={(e) => setCluster(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-navy text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="Pune Central">Pune Central (Shivajinagar, Camp, Sassoon)</option>
                  <option value="Kothrud">Kothrud / Karve Road</option>
                  <option value="Pune West">Pune West (Aundh, Baner, Wakad)</option>
                  <option value="Hadapsar">Hadapsar / Magarpatta</option>
                  <option value="Deccan Gymkhana">Deccan Gymkhana / Prabhat Rd</option>
                </select>
              </div>
              <FormField
                label="PIN Code"
                id="pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="411001"
                required
              />
            </div>

            <FormField
              label="Discharge Destination Home Address"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Building, Flat No., Street, Landmark"
              required
            />
          </div>

          {/* Section 3: Clinical Diagnosis & Condition */}
          <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Activity size={18} className="text-navy" />
              <h2 className="text-base font-bold text-navy">
                3. Clinical Diagnosis &amp; Functional Status
              </h2>
            </div>

            <FormField
              label="Primary Clinical Diagnosis / Post-Op Summary"
              id="primaryDiagnosis"
              value={primaryDiagnosis}
              onChange={(e) => setPrimaryDiagnosis(e.target.value)}
              placeholder="e.g., Post-CABG recovery with sternal precautions; Stage IV lung adenocarcinoma palliative care"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-navy block mb-1.5">
                  Patient Mobility Status
                </label>
                <select
                  value={mobilityStatus}
                  onChange={(e: any) => setMobilityStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-navy text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="ambulatory">Ambulatory (Walks independently)</option>
                  <option value="assisted_walker">Assisted with Walker / Caregiver support</option>
                  <option value="wheelchair_bound">Wheelchair-Bound</option>
                  <option value="bedbound">Bedbound (Requires 2-person assist)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-navy block mb-1.5">
                  Referral Urgency / Priority
                </label>
                <select
                  value={priority}
                  onChange={(e: any) => setPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-navy text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="routine">Routine (Standard home transition 48h)</option>
                  <option value="urgent">Urgent (Service &amp; DME setup within 24h)</option>
                  <option value="immediate">Critical / Immediate (Within 4-6h for O2/vent)</option>
                </select>
              </div>
            </div>

            <FormField
              label="Palliative Care &amp; Symptom Relief Directives"
              id="palliativeCareNeeds"
              value={palliativeCareNeeds}
              onChange={(e) => setPalliativeCareNeeds(e.target.value)}
              placeholder="e.g., Pain titration protocol, stoma bag hygiene, catheterization schedule, seizure precautions"
            />

            <FormField
              label="Special Hospital Discharge Notes / Family Instructions"
              id="clinicalNotes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Additional clinical context, dietary restrictions, or medication management directives"
            />
          </div>

          {/* Section 4: Requested Home Healthcare Services */}
          <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <HeartPulse size={18} className="text-primary" />
                <h2 className="text-base font-bold text-navy">
                  4. Requested Clinical Home Services ({selectedServices.length} Selected)
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">Select all that apply</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {catalog.services.map((svc) => {
                const isSelected = selectedServices.some((s) => s.serviceCode === svc.serviceCode);
                return (
                  <div
                    key={svc.serviceCode}
                    onClick={() => handleToggleService(svc)}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all text-left flex items-start gap-3 ${
                      isSelected
                        ? 'border-primary bg-primary-light/50 ring-2 ring-primary/20 shadow-xs'
                        : 'border-border bg-background/50 hover:border-border hover:bg-background'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-primary text-white' : 'border border-border bg-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 size={14} />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-navy">{svc.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground bg-white px-1.5 py-0.5 rounded border border-border">
                          {svc.serviceCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {svc.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Medical Equipment & Supplies (DME) */}
          <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-indigo-600" />
                <h2 className="text-base font-bold text-navy">
                  5. Medical Equipment &amp; DME Requirements ({selectedEquipment.length} Selected)
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">Pre-tested depot delivery</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {catalog.equipment.map((eq) => {
                const isSelected = selectedEquipment.some((e) => e.name === eq.name);
                return (
                  <div
                    key={eq.name}
                    onClick={() => handleToggleEquipment(eq)}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all text-left flex items-start gap-3 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-border bg-background/50 hover:border-border hover:bg-background'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'border border-border bg-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 size={14} />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-navy">{eq.name}</span>
                        <span className="text-[10px] font-semibold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                          {eq.urgency?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {eq.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 6: Review & DPDP Compliance Authorization */}
          <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consent"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="w-4 h-4 rounded text-primary mt-0.5 focus:ring-primary"
              />
              <label htmlFor="consent" className="text-xs text-navy/90 leading-relaxed">
                <strong>DPDP Act &amp; Clinical Safety Attestation:</strong> I confirm that this discharge care referral has been authorized by the attending clinical team. Patient and caregiver consent has been obtained for continuous home healthcare coordination, durable equipment installation, and vital signs monitoring under the Digital Personal Data Protection (DPDP) Act 2023.
              </label>
            </div>

            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                All referral assignments require human-in-the-loop review by the VivoQuest operations team.
              </span>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full sm:w-auto shadow-primary"
              >
                Submit Discharge Referral
              </Button>
            </div>
          </div>

        </form>

      </main>

      <Footer />
    </div>
  );
}
