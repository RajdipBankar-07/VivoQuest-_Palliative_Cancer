'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  HeartHandshake,
  ShieldCheck,
  MapPin,
  Clock,
  Banknote,
  FileText,
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  Info
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SectionHeading } from '@/components/SectionHeading';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';

export default function ProfessionalsPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    specialty: 'PHLEBOTOMY',
    registrationNumber: '',
    experienceYears: '3',
    city: 'Pune',
    mockFileName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full legal name is required';
    if (!formData.phone.trim()) {
      newErrors.phone = '10-digit mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit Indian mobile number';
    }
    if (!formData.registrationNumber.trim()) {
      newErrors.registrationNumber = 'Council registration or certificate ID is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSuccess(true);
  };

  const perks = [
    {
      title: 'Reliable Fractional Earnings',
      description: 'Receive competitive, predictable fees for every completed home draw, therapy session, or equipment setup, deposited directly via bank transfer.',
      icon: <Banknote className="w-6 h-6 text-secondary" />,
    },
    {
      title: 'AI Route Optimization',
      description: 'Our dynamic graph routing stacks appointments in the same neighborhood clusters, reducing road congestion travel by over 40%.',
      icon: <MapPin className="w-6 h-6 text-primary" />,
    },
    {
      title: 'Offline-First Mobile App',
      description: 'No paper forms or cumbersome EMRs. Scan barcodes, log vitals, and capture digital signatures even in low-reception basements.',
      icon: <FileText className="w-6 h-6 text-secondary" />,
    },
    {
      title: 'Full Autonomous Flexibility',
      description: 'You set your active working hours and service boundaries. Perfect for independent certified clinicians and expanding DME depots.',
      icon: <Clock className="w-6 h-6 text-primary" />,
    },
  ];

  const requiredDocuments = [
    'State Medical / Paramedical / Nursing Council Registration Certificate',
    'Degree or Diploma in your specialized healthcare field',
    'Government ID Proof (Aadhaar / Voter ID / Passport)',
    'Police Clearance or Background Verification Certificate',
  ];

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="w-full py-16 md:py-24 bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary-light text-secondary border border-secondary/20 text-xs font-semibold mb-6">
            <HeartHandshake size={14} className="text-secondary" />
            <span>Join India&apos;s Preventive Healthcare Network</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-navy tracking-tight leading-tight mb-6">
            Deliver Dignified Home Care.<br />
            <span className="text-secondary">Grow Your Independent Practice.</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8">
            VivoQuest connects certified phlebotomists, social workers, physiotherapists, dietitians, and DME equipment depots with patients needing coordinated home preventive care.
          </p>

          <Button href="#apply" variant="secondary" size="lg" rightIcon={<ArrowRight size={18} />}>
            Apply for Verification
          </Button>
        </div>
      </section>

      {/* Perks Grid */}
      <section className="w-full py-16 md:py-20 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Practitioner Advantages"
            badgeColor="green"
            title="Why Healthcare Specialists Choose VivoQuest"
            subtitle="We handle logistics, scheduling, patient communication, and billing so you can focus 100% on patient well-being."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {perks.map((p, i) => (
              <div key={i} className="p-6 sm:p-7 bg-white rounded-3xl border border-border shadow-card flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-background border border-border/80 flex items-center justify-center mb-5">
                    {p.icon}
                  </div>
                  <h3 className="text-base font-bold text-navy mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credential Verification Guardrails */}
      <section className="w-full py-16 bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-3xl bg-navy text-white border border-navy-light/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-xl">
            <div className="space-y-3 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-light">
                Safety &amp; Compliance Standards
              </span>
              <h2 className="text-2xl font-bold text-white">
                Our Patient Trust &amp; Credentialing Guardrails
              </h2>
              <p className="text-sm text-white/80 leading-relaxed">
                Before any professional is dispatched to a vulnerable patient&apos;s home, credentials and licensing are validated by our trust &amp; safety team.
              </p>

              <ul className="space-y-2 pt-2">
                {requiredDocuments.map((doc, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-white/90">
                    <span className="w-4 h-4 rounded-full bg-secondary text-white flex items-center justify-center shrink-0">
                      ✓
                    </span>
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full md:w-auto shrink-0 p-6 rounded-2xl bg-white/10 border border-white/15 text-center">
              <ShieldCheck className="w-12 h-12 text-secondary-light mx-auto mb-2" />
              <span className="text-xs font-bold text-white block">100% Background Screened</span>
              <span className="text-[10px] text-white/60 block mt-1">Zero Tolerance for Unlicensed Care</span>
            </div>
          </div>
        </div>
      </section>

      {/* Specialist Application Form */}
      <section id="apply" className="w-full py-16 md:py-24 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-3xl bg-white border border-border shadow-2xl">
            <div className="text-center mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary bg-secondary-light px-3 py-1 rounded-full inline-block mb-3">
                Professional Enrollment
              </span>
              <h2 className="text-2xl font-bold text-navy">
                Apply to Join VivoQuest Network
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Complete the preliminary application below to begin credential verification
              </p>
            </div>

            {/* Prototype Banner */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-navy/80 mb-6">
              <Info size={15} className="text-primary shrink-0 mt-0.5" />
              <p>
                <strong>Phase 2 Application Prototype:</strong> This interface validates practitioner inputs and prepares the architecture for AWS S3 presigned credential document uploads in future phases.
              </p>
            </div>

            {isSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-secondary-light text-secondary flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-bold text-navy mb-2">Application Received!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
                  Thank you, <strong>{formData.fullName}</strong>. Your credential application ({formData.specialty}) has been logged in this Phase 2 interactive prototype.
                </p>

                <div className="p-4 rounded-xl bg-background border border-border text-xs text-left text-navy/70 max-w-md mx-auto mb-6 space-y-1">
                  <p><strong>Clinical Discipline:</strong> {formData.specialty}</p>
                  <p><strong>Registration ID:</strong> {formData.registrationNumber}</p>
                  <p><strong>Working Cluster:</strong> {formData.city}</p>
                  <p><strong>Mock Document:</strong> {formData.mockFileName || 'license_document_preview.pdf'}</p>
                </div>

                <Button
                  onClick={() => {
                    setIsSuccess(false);
                    setFormData({
                      fullName: '',
                      phone: '',
                      email: '',
                      specialty: 'PHLEBOTOMY',
                      registrationNumber: '',
                      experienceYears: '3',
                      city: 'Pune',
                      mockFileName: '',
                    });
                  }}
                  variant="secondary"
                  size="md"
                >
                  Submit Another Practitioner Application
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  label="Full Name (As registered in Council/Certificate)"
                  id="fullName"
                  placeholder="e.g., Dr. Meenakshi Joshi / Phl. Sandeep Thorat"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  error={errors.fullName}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Mobile Number (India)"
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    error={errors.phone}
                    required
                  />
                  <FormField
                    label="Email Address"
                    id="email"
                    type="email"
                    placeholder="clinician@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Clinical Discipline"
                    id="specialty"
                    as="select"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    options={[
                      { value: 'PHLEBOTOMY', label: 'Phlebotomist (Blood / Diagnostic Collection)' },
                      { value: 'PHYSIOTHERAPY', label: 'Certified Physiotherapist' },
                      { value: 'DIETETICS', label: 'Clinical Nutritionist / Dietitian' },
                      { value: 'COMMUNITY_HEALTH', label: 'Community Health Worker / SDoH Specialist' },
                      { value: 'DME_TECHNICIAN', label: 'Medical Equipment (DME) Setup Specialist' },
                    ]}
                  />

                  <FormField
                    label="Years of Clinical Experience"
                    id="experienceYears"
                    as="select"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    options={[
                      { value: '1', label: '1 - 2 Years' },
                      { value: '3', label: '3 - 5 Years' },
                      { value: '6', label: '6 - 10 Years' },
                      { value: '10+', label: 'Over 10 Years' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Council Registration / Certificate Number"
                    id="registrationNumber"
                    placeholder="e.g., MMC-2018-9921 / NABL-CERT-441"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    error={errors.registrationNumber}
                    required
                  />

                  <FormField
                    label="Primary Operating Cluster"
                    id="city"
                    as="select"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    options={[
                      { value: 'Pune', label: 'Pune & Pimpri-Chinchwad' },
                      { value: 'Mumbai', label: 'Mumbai & Navi Mumbai' },
                      { value: 'Nagpur', label: 'Nagpur Urban' },
                      { value: 'Nashik', label: 'Nashik Cluster' },
                    ]}
                  />
                </div>

                {/* Mock Document Upload Slot */}
                <div className="p-4 rounded-2xl border-2 border-dashed border-border text-center bg-background/60">
                  <UploadCloud className="w-8 h-8 text-primary mx-auto mb-2" />
                  <span className="text-xs font-semibold text-navy block">
                    Upload License / Certificate (PDF / PNG, Max 15MB)
                  </span>
                  <span className="text-[10px] text-muted-foreground block mb-3">
                    Direct S3 presigned upload architecture (simulated in Phase 2)
                  </span>
                  <input
                    type="file"
                    id="mockFile"
                    className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFormData({ ...formData, mockFileName: e.target.files[0].name });
                      }
                    }}
                  />
                </div>

                <div className="pt-3">
                  <Button
                    type="submit"
                    variant="secondary"
                    size="lg"
                    className="w-full justify-center"
                    rightIcon={<ArrowRight size={16} />}
                  >
                    Submit Verification Application
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
