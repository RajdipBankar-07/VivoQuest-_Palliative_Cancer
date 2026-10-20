'use client';

import React, { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Shield,
  CheckCircle2,
  Send,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SectionHeading } from '@/components/SectionHeading';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    inquiryType: 'PATIENT_CARE',
    message: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Please enter your full name';
    }
    if (!formData.email.trim()) {
      errors.email = 'Please enter your email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Please enter your mobile number';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Please enter a valid 10-digit Indian mobile number';
    }
    if (!formData.message.trim()) {
      errors.message = 'Please provide details for your inquiry';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitted(true);
  };

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      {/* Header Banner */}
      <section className="w-full py-12 md:py-16 bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading
            badge="Care Coordination Office"
            badgeIcon={<MessageSquare size={14} />}
            badgeColor="blue"
            title="We Are Here to Assist Your Healthcare Journey"
            subtitle="Have questions about in-home diagnostic visits, medical equipment setup, or hospital discharge partnerships? Reach our coordination desk."
            align="center"
          />
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="w-full py-12 md:py-20 bg-background flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Contact Details & Office Hubs (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-7 rounded-3xl bg-white border border-border shadow-card">
                <h3 className="text-lg font-bold text-navy mb-4">
                  Healthcare Operations Desk
                </h3>
                
                <div className="space-y-4 text-sm text-navy">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <span className="font-bold block">Regional Operations Hub</span>
                      <span className="text-muted-foreground text-xs leading-relaxed block mt-0.5">
                        Sector 14, Kothrud Healthcare Cluster, Pune, Maharashtra 411038
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-secondary-light text-secondary flex items-center justify-center shrink-0">
                      <Phone size={18} />
                    </div>
                    <div>
                      <span className="font-bold block">Helpline &amp; Coordination</span>
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        +91 (020) 5550-CARE
                      </span>
                      <span className="text-[10px] text-primary block mt-0.5 font-semibold">
                        (Active Prototype Support Line • 8:00 AM – 8:00 PM IST)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                      <Mail size={18} />
                    </div>
                    <div>
                      <span className="font-bold block">Inquiries Email</span>
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        care@vivoquest.example.com
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Response within 2 business hours
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Advisory Box */}
              <div className="p-6 rounded-3xl bg-amber-50/70 border border-warning/30 text-navy">
                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-warning shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-navy">Important Clinical Notice:</p>
                    <p className="text-muted-foreground leading-relaxed">
                      VivoQuest provides <strong>scheduled preventive home care and non-emergency diagnostics</strong>. In medical emergencies (severe chest pain, stroke symptoms, uncontrolled bleeding), immediately call <strong>112 or 108</strong> or visit the nearest hospital emergency department.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Form (7 cols) */}
            <div className="lg:col-span-7">
              <div className="p-8 sm:p-10 rounded-3xl bg-white border border-border shadow-card">
                {isSubmitted ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-secondary-light text-secondary flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={36} />
                    </div>
                    <h3 className="text-2xl font-bold text-navy mb-2">Message Received</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
                      Thank you, <strong>{formData.fullName}</strong>. Your inquiry has been logged in this Phase 2 interactive prototype. A care coordinator will review your request.
                    </p>
                    <div className="p-4 rounded-xl bg-background border border-border text-xs text-left text-navy/70 max-w-md mx-auto mb-8">
                      <p><strong>Category:</strong> {formData.inquiryType}</p>
                      <p><strong>Email:</strong> {formData.email}</p>
                      <p><strong>Mobile:</strong> +91 {formData.phone}</p>
                    </div>
                    <Button
                      onClick={() => {
                        setIsSubmitted(false);
                        setFormData({
                          fullName: '',
                          email: '',
                          phone: '',
                          inquiryType: 'PATIENT_CARE',
                          message: '',
                        });
                      }}
                      variant="primary"
                      size="md"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-bold text-navy mb-2">
                      Send a Message to Our Coordination Team
                    </h3>
                    <p className="text-xs text-muted-foreground mb-6">
                      Fill out the form below and an operations specialist will respond promptly.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <FormField
                        label="Full Name"
                        id="fullName"
                        placeholder="e.g., Dr. Ananya Sharma / Vikram Patil"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        error={formErrors.fullName}
                        required
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          label="Email Address"
                          id="email"
                          type="email"
                          placeholder="name@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          error={formErrors.email}
                          required
                        />

                        <FormField
                          label="Mobile Phone (India)"
                          id="phone"
                          type="tel"
                          placeholder="9876543210"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          error={formErrors.phone}
                          required
                        />
                      </div>

                      <FormField
                        label="Inquiry Category"
                        id="inquiryType"
                        as="select"
                        value={formData.inquiryType}
                        onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                        options={[
                          { value: 'PATIENT_CARE', label: 'Patient / Family Home Care Request' },
                          { value: 'CLINICAL_JOIN', label: 'Healthcare Professional Enrollment (Phlebotomy, PT, Dietitian)' },
                          { value: 'DME_SUPPLIER', label: 'DME Equipment Supplier Depot Partnership' },
                          { value: 'HOSPITAL_PAYER', label: 'Hospital or Health Plan Care-Gap Partnership' },
                          { value: 'GENERAL', label: 'General / Media / Other Inquiry' },
                        ]}
                      />

                      <FormField
                        label="Your Message or Clinical Requirements"
                        id="message"
                        as="textarea"
                        placeholder="Please describe how we can assist you..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        error={formErrors.message}
                        rows={4}
                        required
                      />

                      <div className="pt-2">
                        <Button
                          type="submit"
                          variant="primary"
                          size="lg"
                          className="w-full sm:w-auto"
                          rightIcon={<Send size={16} />}
                        >
                          Submit Inquiry
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
