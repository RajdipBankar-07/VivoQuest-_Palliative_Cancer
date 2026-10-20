'use client';

import React, { useState } from 'react';
import {
  Activity,
  Video,
  UserCheck,
  Apple,
  Heart,
  Package,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Phone,
  Clock,
  Shield,
  ArrowRight,
  Info,
  AlertCircle
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { SectionHeading } from '@/components/SectionHeading';
import { FormField } from '@/components/FormField';
import { bookingsApi, ApiClientError } from '@/lib/api';

interface ServiceItem {
  id: string;
  category: 'diagnostics' | 'therapy' | 'equipment';
  title: string;
  badge: string;
  description: string;
  turnaround: string;
  requirements: string[];
  includes: string[];
  samplePriceEstimate?: string;
  icon: React.ReactNode;
}

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'diagnostics' | 'therapy' | 'equipment'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<ServiceItem | null>(null);

  // Form state for real booking API
  const [formData, setFormData] = useState({
    patientName: '',
    phone: '',
    city: 'Pune',
    pincode: '',
    preferredDate: '',
    notes: '',
  });
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const services: ServiceItem[] = [
    {
      id: 'home-diagnostics',
      category: 'diagnostics',
      title: 'Home Diagnostics & Phlebotomy',
      badge: 'NABL Accredited Labs',
      description: 'Certified phlebotomist visit to collect blood, urine, or swab samples at the patient kitchen table. Strict cold-chain vial transport to NABL-accredited diagnostic labs.',
      turnaround: 'Digital reports in 12–24 hours via SMS & WhatsApp',
      requirements: ['Overnight fasting required for lipid & glucose panels', 'Doctor prescription optional for routine wellness'],
      includes: ['HbA1c Blood Glucose', 'Lipid Profile', 'Kidney & Liver Function (KFT/LFT)', 'Thyroid Panel (TSH)', 'Complete Blood Count (CBC)'],
      samplePriceEstimate: 'Starts at ₹499 (Sample collection included)',
      icon: <Activity className="w-6 h-6 text-primary" />,
    },
    {
      id: 'teleconsultation',
      category: 'therapy',
      title: 'Physician & Specialist Teleconsultation',
      badge: 'Registered Medical Council Doctors',
      description: 'High-definition video consultations with certified internal medicine physicians, geriatricians, and endocrinologists. Follow-up reviews and verified e-prescriptions.',
      turnaround: 'Instant or scheduled 30-minute consultation slots',
      requirements: ['Prior discharge summary or lab records recommended', 'Smartphone or browser with camera'],
      includes: ['Comprehensive Symptom Review', 'Medication Reconciliation', 'Digital e-Prescription', 'Lab Test Guidance'],
      samplePriceEstimate: '₹400 – ₹800 per consultation',
      icon: <Video className="w-6 h-6 text-primary" />,
    },
    {
      id: 'physiotherapy',
      category: 'therapy',
      title: 'In-Home Physiotherapy & Rehabilitation',
      badge: 'Certified Physiotherapists',
      description: 'One-on-one physiotherapy sessions at home for post-stroke recovery, joint replacements (knee/hip), fracture recovery, geriatric mobility, and chest physiotherapy.',
      turnaround: 'Daily or alternate-day home sessions (45–60 mins)',
      requirements: ['Orthopedic or physician referral if post-surgical', 'Adequate floor space at home'],
      includes: ['Range of Motion Exercises', 'Gait & Balance Training', 'Pain Management Protocols', 'Caregiver Assisted Mobility Techniques'],
      samplePriceEstimate: '₹600 – ₹1,000 per session',
      icon: <UserCheck className="w-6 h-6 text-secondary" />,
    },
    {
      id: 'nutrition-wellness',
      category: 'therapy',
      title: 'Clinical Nutrition & Dietetics',
      badge: 'Qualified Clinical Dietitians',
      description: 'Personalized nutritional management tailored to Indian diets and chronic metabolic conditions (Type 2 diabetes, chronic kidney disease, hypertension, cardiovascular recovery).',
      turnaround: 'Detailed meal plan delivery in 24 hours post-consult',
      requirements: ['Recent lipid and glucose panels helpful', 'Inventory of typical household meal preferences'],
      includes: ['Indian Plate Carb Calibration', 'Renal / Cardiac Sodium Restrictions', 'Nutritional Supplements Advice', 'Weekly WhatsApp Progress Check-ins'],
      samplePriceEstimate: '₹750 for initial consult + diet chart',
      icon: <Apple className="w-6 h-6 text-secondary" />,
    },
    {
      id: 'preventive-home-care',
      category: 'diagnostics',
      title: 'Preventive Home Care & SDoH Audits',
      badge: 'Community Health Workers',
      description: 'Holistic in-home health evaluations assessing vital signs, bathroom fall hazards, food security, medication adherence, and caregiver strain.',
      turnaround: 'Comprehensive home safety scorecard within 2 hours of visit',
      requirements: ['Caregiver presence requested during the audit', 'Access to patient living spaces for safety check'],
      includes: ['Vitals Check (BP, Pulse Oximeter, Temperature)', 'Bathroom & Floor Fall Hazard Audit', 'Medication Inventory Review', 'Emergency Contact Verification'],
      samplePriceEstimate: '₹350 per preventive visit',
      icon: <Heart className="w-6 h-6 text-primary" />,
    },
    {
      id: 'medical-equipment',
      category: 'equipment',
      title: 'Durable Medical Equipment (DME) Delivery',
      badge: 'Doorstep Setup & Calibration',
      description: 'Rapid home delivery, assembly, and sanitization of hospital beds, oxygen concentrators, CPAP/BiPAP units, suction machines, wheelchairs, and foldable walkers.',
      turnaround: 'Same-day or next-day delivery in metro clusters',
      requirements: ['Prescription required for oxygen & BiPAP devices', 'Available power outlet for electrical equipment'],
      includes: ['Doorstep Assembly & Testing', 'Family Safety Operation Training', 'Sterilization Certificate', '24/7 Equipment Breakdown Support'],
      samplePriceEstimate: 'Rentals starting ₹800/month (Walkers) to ₹3,500/month (O2 Concentrators)',
      icon: <Package className="w-6 h-6 text-secondary" />,
    },
  ];

  const filteredServices = services.filter((svc) => {
    const matchesCategory = selectedCategory === 'all' || svc.category === selectedCategory;
    const matchesQuery =
      searchQuery === '' ||
      svc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      svc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      svc.includes.some((inc) => inc.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const handleOpenModal = (service: ServiceItem) => {
    setSelectedServiceForModal(service);
    setConfirmedBooking(null);
    setBookingError(null);
    setFormErrors({});
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    const errors: Record<string, string> = {};

    if (!formData.patientName.trim()) {
      errors.patientName = 'Patient full name is required';
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone) {
      errors.phone = '10-digit mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errors.phone = 'Please enter a valid 10-digit Indian mobile number';
    }
    if (!formData.pincode.trim()) {
      errors.pincode = '6-digit postal pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      errors.pincode = 'Please enter a valid 6-digit postal pincode';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!selectedServiceForModal) return;

    setFormErrors({});
    setIsBookingLoading(true);

    try {
      const response = await bookingsApi.createBooking({
        patientName: formData.patientName.trim(),
        phone: cleanPhone,
        serviceId: selectedServiceForModal.id,
        city: formData.city,
        pincode: formData.pincode.trim(),
        preferredDate: formData.preferredDate || undefined,
        clinicalNotes: formData.notes.trim() || undefined,
      });

      setConfirmedBooking(response);
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setBookingError(err.message);
      } else {
        setBookingError('Unable to create booking request. Please ensure the backend server is active.');
      }
    } finally {
      setIsBookingLoading(false);
    }
  };

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      {/* Header Banner */}
      <section className="w-full py-12 md:py-16 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Healthcare Directory"
            badgeColor="blue"
            title="Coordinated Healthcare Services Directory"
            subtitle="Explore qualified in-home clinical care, laboratory diagnostics, and medical equipment options. All services are performed by verified independent practitioners."
            align="center"
          />

          {/* Search and Category Filters */}
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 mt-6">
            <div className="relative w-full sm:flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services (e.g., HbA1c, walker, physio, oxygen)..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border text-sm text-navy bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                aria-label="Search healthcare services"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background border border-border shrink-0 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-navy hover:text-primary'
                }`}
              >
                All Services ({services.length})
              </button>
              <button
                onClick={() => setSelectedCategory('diagnostics')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === 'diagnostics'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-navy hover:text-primary'
                }`}
              >
                Diagnostics
              </button>
              <button
                onClick={() => setSelectedCategory('therapy')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === 'therapy'
                    ? 'bg-secondary text-white shadow-sm'
                    : 'text-navy hover:text-secondary'
                }`}
              >
                Therapy &amp; Consults
              </button>
              <button
                onClick={() => setSelectedCategory('equipment')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === 'equipment'
                    ? 'bg-secondary text-white shadow-sm'
                    : 'text-navy hover:text-secondary'
                }`}
              >
                Equipment (DME)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="w-full py-12 md:py-16 bg-background flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-border max-w-lg mx-auto shadow-card">
              <Info className="w-12 h-12 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-bold text-navy mb-1">No Matching Services Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We couldn&apos;t find services matching &quot;{searchQuery}&quot;. Try resetting your filters.
              </p>
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                variant="outline"
                size="sm"
              >
                Reset Search Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredServices.map((svc) => (
                <div
                  key={svc.id}
                  id={svc.id}
                  className="bg-white rounded-3xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between"
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center shrink-0">
                          {svc.icon}
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                            {svc.badge}
                          </span>
                          <h2 className="text-xl font-bold text-navy">
                            {svc.title}
                          </h2>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      {svc.description}
                    </p>

                    {/* Includes Checklist */}
                    <div className="mb-6 p-4 rounded-2xl bg-background border border-border/80">
                      <span className="text-xs font-bold text-navy uppercase tracking-wider block mb-2.5">
                        What&apos;s Included in this Home Visit:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {svc.includes.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-navy/80 font-medium">
                            <span className="w-4 h-4 rounded-full bg-secondary-light text-secondary flex items-center justify-center shrink-0">
                              <CheckCircle2 size={12} />
                            </span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Turnaround & Guidance */}
                    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground mb-6">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-primary shrink-0" />
                        <span><strong>Turnaround:</strong> {svc.turnaround}</span>
                      </div>
                      {svc.samplePriceEstimate && (
                        <div className="flex items-center gap-2 text-navy font-semibold">
                          <span className="text-secondary font-bold">₹</span>
                          <span><strong>Estimate:</strong> {svc.samplePriceEstimate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      *Prescription verified before clinical dispatch
                    </span>
                    <Button
                      onClick={() => handleOpenModal(svc)}
                      variant="primary"
                      size="md"
                      rightIcon={<ArrowRight size={16} />}
                      className="w-full sm:w-auto"
                    >
                      Request Consultation
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Prototype Service Request Modal */}
      {selectedServiceForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-border relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
              <div>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                  Healthcare Service Request
                </span>
                <h3 id="modal-title" className="text-lg font-bold text-navy">
                  {selectedServiceForModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedServiceForModal(null)}
                className="text-muted-foreground hover:text-navy p-1.5 rounded-lg hover:bg-background"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {bookingError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs text-destructive mb-5 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <strong>Request Failed:</strong> {bookingError}
                </div>
              </div>
            )}

            {confirmedBooking ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-secondary-light text-secondary flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-lg font-bold text-navy mb-1">Service Request Confirmed!</h4>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                  Thank you, <strong>{confirmedBooking.patientName}</strong>. Your request has been registered in the VivoQuest database and assigned to our clinical coordination queue.
                </p>

                <div className="p-4 rounded-2xl bg-background border border-border text-xs text-navy/80 text-left mb-6 space-y-2">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">Booking Reference:</span>
                    <strong className="text-primary font-mono text-sm">{confirmedBooking.bookingNumber}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-light text-secondary font-bold uppercase text-[10px]">
                      {confirmedBooking.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Service:</span>
                    <span className="font-semibold">{confirmedBooking.service.title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estimated Fee:</span>
                    <span className="font-bold text-navy">₹{confirmedBooking.pricing.estimatedAmount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{confirmedBooking.serviceLocation.city} (PIN: {confirmedBooking.serviceLocation.pincode})</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => setSelectedServiceForModal(null)}
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <FormField
                  label="Patient Full Name"
                  id="patientName"
                  placeholder="e.g., Ramesh Kulkarni"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  error={formErrors.patientName}
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
                    error={formErrors.phone}
                    required
                  />
                  <FormField
                    label="City / Cluster"
                    id="city"
                    as="select"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    options={[
                      { value: 'Pune', label: 'Pune (Operational Hub)' },
                      { value: 'Mumbai', label: 'Mumbai Metro' },
                      { value: 'Nagpur', label: 'Nagpur Cluster' },
                      { value: 'Nashik', label: 'Nashik Cluster' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Postal Pincode"
                    id="pincode"
                    type="text"
                    maxLength={6}
                    placeholder="411001"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    error={formErrors.pincode}
                    required
                  />
                  <FormField
                    label="Preferred Date"
                    id="preferredDate"
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                  />
                </div>

                <FormField
                  label="Special Instructions or Discharge Notes"
                  id="notes"
                  as="textarea"
                  placeholder="e.g., Patient is on post-op knee recovery; needs gentle blood draw fasting."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />

                <div className="pt-2 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    onClick={() => setSelectedServiceForModal(null)}
                    variant="outline"
                    size="md"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    size="md"
                    isLoading={isBookingLoading}
                  >
                    Submit Request
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
