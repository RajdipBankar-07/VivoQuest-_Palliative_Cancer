'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  CheckCircle2,
  Shield,
  ArrowRight,
  Info,
  AlertCircle
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { authApi, ApiClientError } from '@/lib/api';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    role: 'patient',
    city: 'Pune',
    pincode: '',
    consentAccepted: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [registeredData, setRegisteredData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Please enter your full name';
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      newErrors.phone = 'Please enter a valid 10-digit Indian mobile number';
    }
    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Postal pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Enter a valid 6-digit pincode';
    }
    if (!formData.consentAccepted) {
      newErrors.consent = 'You must acknowledge the terms and DPDP data policy';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await authApi.register({
        fullName: formData.fullName.trim(),
        phone: cleanPhone,
        email: formData.email.trim() || undefined,
        role: formData.role.toLowerCase(),
        city: formData.city,
        pincode: formData.pincode.trim(),
        consentAccepted: formData.consentAccepted,
      });

      setRegisteredData(response);
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setApiError(err.message);
      } else {
        setApiError('An error occurred during registration. Please verify the API server is active.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-border shadow-2xl p-7 sm:p-10 text-left">
          
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-secondary text-white flex items-center justify-center mx-auto mb-3 shadow-secondary">
              <Activity size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-navy">
              Create Your Vivo<span className="text-secondary">Quest</span> Account
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Join India&apos;s coordinated preventive healthcare network
            </p>
          </div>

          {/* Compliance & API Connected Banner */}
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5 text-xs text-navy/80 mb-6">
            <Shield size={16} className="text-secondary shrink-0 mt-0.5" />
            <p>
              <strong>DPDP Act Compliant Onboarding:</strong> Your credentials are encrypted and stored in MongoDB with secure password hashing and authenticated token management.
            </p>
          </div>

          {/* API Error Alert */}
          {apiError && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs text-destructive mb-6 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <strong>Registration Failed:</strong> {apiError}
              </div>
            </div>
          )}

          {registeredData ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-secondary-light text-secondary flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-xl font-bold text-navy mb-2">Account Created Successfully!</h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Welcome, <strong>{registeredData.user.fullName}</strong>. Your account has been registered in the VivoQuest database and your session token has been securely issued.
              </p>

              <div className="p-4 rounded-xl bg-background border border-border text-xs text-left text-navy/70 mb-6 space-y-1.5">
                <p><strong>Account ID:</strong> <code className="text-primary">{registeredData.user.id}</code></p>
                <p><strong>Role:</strong> {registeredData.user.role.toUpperCase()}</p>
                <p><strong>Mobile Number:</strong> +91 {registeredData.user.phone}</p>
                {registeredData.user.email && <p><strong>Email:</strong> {registeredData.user.email}</p>}
                <p><strong>Security Status:</strong> Active &bull; DPDP Consent Logged</p>
              </div>

              <div className="flex gap-3">
                <Button href="/services" variant="primary" size="md" className="flex-1 justify-center">
                  Explore Services
                </Button>
                <Button href="/sign-in" variant="outline" size="md" className="flex-1 justify-center">
                  Sign In Portal
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                label="Full Legal Name"
                id="fullName"
                placeholder="e.g., Rajeshwari Iyer"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                error={errors.fullName}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Indian Mobile Number"
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  error={errors.phone}
                  required
                />
                <FormField
                  label="Email (Optional)"
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Account Type"
                  id="role"
                  as="select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  options={[
                    { value: 'patient', label: 'Patient / Family Caregiver' },
                    { value: 'professional', label: 'Healthcare Specialist (Clinician)' },
                    { value: 'supplier', label: 'Medical Equipment Supplier' },
                    { value: 'hospital', label: 'Hospital / Care Organization' },
                  ]}
                />
                <FormField
                  label="Cluster / City"
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

              <FormField
                label="Postal Pincode"
                id="pincode"
                type="text"
                maxLength={6}
                placeholder="411001"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                error={errors.pincode}
                required
              />

              {/* Consent Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.consentAccepted}
                    onChange={(e) => setFormData({ ...formData, consentAccepted: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground leading-normal">
                    I agree to the <Link href="/about#terms" className="text-primary underline">Terms of Service</Link> and consent to the processing of personal data in accordance with India&apos;s <Link href="/about#safety" className="text-primary underline">Digital Personal Data Protection (DPDP) Act</Link>.
                  </span>
                </label>
                {errors.consent && (
                  <p className="text-xs text-destructive mt-1 font-medium">{errors.consent}</p>
                )}
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full justify-center"
                  rightIcon={<ArrowRight size={16} />}
                >
                  Create Account
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted-foreground">
            <span>Already registered? </span>
            <Link href="/sign-in" className="font-bold text-primary hover:underline">
              Sign In
            </Link>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
