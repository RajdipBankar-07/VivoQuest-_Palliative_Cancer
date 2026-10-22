'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Shield,
  Phone,
  Lock,
  ArrowRight,
  CheckCircle2,
  Users,
  Stethoscope,
  Building,
  Info,
  AlertCircle
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { authApi, ApiClientError } from '@/lib/api';

export default function SignInPage() {
  const [role, setRole] = useState<'patient' | 'professional' | 'hospital'>('patient');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'enter_phone' | 'enter_otp' | 'success'>('enter_phone');
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authResponse, setAuthResponse] = useState<any>(null);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const cleanPhone = phone.replace(/\D/g, '');

    if (!cleanPhone) {
      setError('Please enter your mobile number');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setError('');
    setStep('enter_otp');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError('OTP must be exactly 6 digits');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const response = await authApi.login({
        identifier: cleanPhone,
        otp: cleanOtp,
        role,
      });

      setAuthResponse(response);
      setStep('success');
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setApiError(err.message);
      } else {
        setApiError('Authentication request failed. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-3xl border border-border shadow-2xl p-7 sm:p-9 text-left">
          
          {/* Logo & Heading */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto mb-3 shadow-primary">
              <Activity size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-navy">
              Sign In to Vivo<span className="text-secondary">Quest</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Secure, authenticated access for patients and clinicians
            </p>
          </div>

          {/* Role Selector Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-background border border-border mb-6">
            <button
              type="button"
              onClick={() => { setRole('patient'); setStep('enter_phone'); setError(''); setApiError(null); }}
              className={`py-2 px-2 text-xs font-semibold rounded-xl transition-all flex flex-col items-center gap-1 ${
                role === 'patient'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-navy hover:text-primary'
              }`}
            >
              <Users size={14} />
              <span>Patient</span>
            </button>
            <button
              type="button"
              onClick={() => { setRole('professional'); setStep('enter_phone'); setError(''); setApiError(null); }}
              className={`py-2 px-2 text-xs font-semibold rounded-xl transition-all flex flex-col items-center gap-1 ${
                role === 'professional'
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-navy hover:text-secondary'
              }`}
            >
              <Stethoscope size={14} />
              <span>Professional</span>
            </button>
            <button
              type="button"
              onClick={() => { setRole('hospital'); setStep('enter_phone'); setError(''); setApiError(null); }}
              className={`py-2 px-2 text-xs font-semibold rounded-xl transition-all flex flex-col items-center gap-1 ${
                role === 'hospital'
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-navy hover:text-navy-dark'
              }`}
            >
              <Building size={14} />
              <span>Hospital</span>
            </button>
          </div>

          {/* Prototype Notice / Transparency Notice */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-navy/80 mb-6">
            <Info size={15} className="text-primary shrink-0 mt-0.5" />
            <p>
              <strong>Live Backend Connected:</strong> Development mock OTP is strictly restricted to designated test accounts. Other registered accounts authenticate using their secure password.
            </p>
          </div>

          {/* Error Banner */}
          {apiError && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs text-destructive mb-6 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <strong>Authentication Failed:</strong> {apiError}
                {apiError.includes('register') && (
                  <div className="mt-1">
                    <Link href="/register" className="font-bold underline">
                      Click here to create a new account &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'enter_phone' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <FormField
                label="Registered Indian Mobile Number"
                id="phone"
                type="tel"
                placeholder="e.g., 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={error}
                helperText="Enter the 10-digit mobile number linked to your VivoQuest account"
                required
              />

              {/* Quick Fill Demo Chips */}
              <div className="pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Demo Test Accounts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {role === 'hospital' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPhone('9822011111')}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-navy/5 border border-navy/15 text-navy font-medium hover:bg-navy/10 transition-colors"
                      >
                        Ruby Hall Clinic (+91 98220 11111)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhone('9822022222')}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-navy/5 border border-navy/15 text-navy font-medium hover:bg-navy/10 transition-colors"
                      >
                        Sahyadri Hospital (+91 98220 22222)
                      </button>
                    </>
                  ) : role === 'professional' ? (
                    <button
                      type="button"
                      onClick={() => setPhone('9820011001')}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary font-medium hover:bg-secondary/20 transition-colors"
                    >
                      Dr. Aditi Rao (+91 98200 11001)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPhone('9876543210')}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium hover:bg-primary/20 transition-colors"
                    >
                      Demo Patient (+91 98765 43210)
                    </button>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                variant={role === 'professional' ? 'secondary' : role === 'hospital' ? 'navy' : 'primary'}
                size="lg"
                className="w-full justify-center mt-2"
                rightIcon={<ArrowRight size={16} />}
              >
                Continue to Verification
              </Button>
            </form>
          )}

          {step === 'enter_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Code sent to <strong>+91 {phone}</strong></span>
                <button
                  type="button"
                  onClick={() => { setStep('enter_phone'); setApiError(null); }}
                  className="text-primary hover:underline font-semibold"
                >
                  Change
                </button>
              </div>

              <FormField
                label="Enter 6-Digit Verification Code"
                id="otp"
                type="text"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                error={error}
                helperText="Enter 6-digit verification code"
                required
              />

              <Button
                type="submit"
                variant={role === 'professional' ? 'secondary' : role === 'hospital' ? 'navy' : 'primary'}
                size="lg"
                isLoading={isLoading}
                className="w-full justify-center"
              >
                Verify &amp; Sign In
              </Button>
            </form>
          )}

          {step === 'success' && authResponse && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-secondary-light text-secondary flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-navy mb-1">
                Authentication Successful!
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Welcome back, <strong>{authResponse.user.fullName}</strong>. Your session token has been securely generated.
              </p>

              <div className="p-3.5 rounded-xl bg-background border border-border text-xs text-left text-navy/80 mb-6 space-y-1">
                <p><strong>User ID:</strong> <code className="text-primary">{authResponse.user.id}</code></p>
                <p><strong>Role:</strong> {authResponse.user.role.toUpperCase()}</p>
                <p><strong>Mobile:</strong> +91 {authResponse.user.phone}</p>
                <p><strong>Verification Mode:</strong> {authResponse.authMode}</p>
              </div>

              <div className="space-y-2">
                {authResponse.user.role === 'professional' ? (
                  <Button href="/doctor/dashboard" variant="secondary" size="md" className="w-full justify-center">
                    Go to Doctor Schedule Portal
                  </Button>
                ) : authResponse.user.role === 'hospital' ? (
                  <Button href="/hospital/dashboard" variant="primary" size="md" className="w-full justify-center">
                    Go to Hospital Referral Dashboard
                  </Button>
                ) : (
                  <Button href="/doctors" variant="primary" size="md" className="w-full justify-center">
                    Find a Doctor &amp; Book Appointment
                  </Button>
                )}
                {authResponse.user.role === 'hospital' ? (
                  <Button href="/hospital/referrals/new" variant="outline" size="md" className="w-full justify-center">
                    + Create New Discharge Referral
                  </Button>
                ) : (
                  <Button href="/appointments" variant="outline" size="md" className="w-full justify-center">
                    View My Appointments
                  </Button>
                )}
                <Button
                  onClick={() => {
                    authApi.logout();
                    setStep('enter_phone');
                    setPhone('');
                    setOtp('');
                    setAuthResponse(null);
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-xs"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          )}

          {/* Footer Registration Link */}
          <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted-foreground flex flex-col gap-2">
            <div>
              <span>New to VivoQuest? </span>
              <Link href="/register" className="font-bold text-primary hover:underline">
                Create an Account
              </Link>
            </div>
            <div className="text-[11px] text-muted-foreground/80">
              <span>Platform Operator or Administrator? </span>
              <Link href="/admin/login" className="font-semibold text-navy hover:underline">
                Admin Portal Login &rarr;
              </Link>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
