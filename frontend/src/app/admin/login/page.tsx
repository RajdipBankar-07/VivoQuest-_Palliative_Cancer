'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Phone,
  Key,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Info,
  Activity,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { authApi, ApiClientError } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('9899009900');
  const [authMethod, setAuthMethod] = useState<'otp' | 'password'>('otp');
  const [password, setPassword] = useState('Password#2026');
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'input' | 'success'>('input');
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState<any>(null);

  // If already authenticated as admin, offer instant redirect
  useEffect(() => {
    const user = authApi.getStoredUser();
    const token = authApi.getToken();
    if (token && user && ['admin', 'super_admin'].includes(user.role?.toLowerCase())) {
      setAuthenticatedAdmin(user);
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setError('');

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Please enter your administrator mobile number or email');
      return;
    }

    if (authMethod === 'otp') {
      const cleanOtp = otp.trim();
      if (!cleanOtp || cleanOtp.length !== 6) {
        setError('Please enter the valid 6-digit administrative verification code');
        return;
      }
    } else {
      if (!password || password.length < 6) {
        setError('Please enter your administrative password (minimum 6 characters)');
        return;
      }
    }

    setIsLoading(true);

    try {
      const cleanPhone = cleanIdentifier.replace(/\D/g, '');
      const loginPayload = {
        identifier: cleanPhone.length === 10 ? cleanPhone : cleanIdentifier,
        role: 'admin',
        ...(authMethod === 'otp' ? { otp: otp.trim() } : { password }),
      };

      const response = await authApi.login(loginPayload);

      // Verify role authorization: must be admin or super_admin
      const userRole = response.user.role?.toLowerCase();
      if (!['admin', 'super_admin'].includes(userRole)) {
        authApi.logout();
        throw new ApiClientError(
          `Access Denied: The account '+91 ${response.user.phone}' is registered as a '${response.user.role}', which does not have platform administrative credentials.`,
          403,
          'FORBIDDEN'
        );
      }

      setAuthenticatedAdmin(response.user);
      setStep('success');

      // Seamless redirect to Admin Dashboard
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 1000);
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setApiError(err.message);
      } else {
        setApiError(err.message || 'Administrative authentication failed. Please verify credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen flex flex-col font-sans text-navy">
      <Navbar />

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-7 sm:p-9 text-left">
          
          {/* Header Icon & Branding */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-navy text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-navy/20">
              <ShieldCheck size={28} strokeWidth={2.2} />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider mb-2">
              <Lock size={12} /> Restricted Staff Gateway
            </span>
            <h1 className="text-2xl font-black text-navy tracking-tight">Admin Portal Sign In</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Secure administrative access for operations leads, medical directors, and platform supervisors.
            </p>
          </div>

          {/* Active Session Warning / Quick Continue Banner */}
          {authenticatedAdmin && step === 'input' && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 mb-6 flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Active Admin Session Found</p>
                <p className="text-emerald-700 text-[11px] mt-0.5">
                  Signed in as <strong>{authenticatedAdmin.fullName}</strong> ({authenticatedAdmin.role}).
                </p>
                <div className="mt-2.5 flex gap-2">
                  <Button
                    href="/admin/dashboard"
                    variant="primary"
                    size="sm"
                    className="text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Open Dashboard &rarr;
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      authApi.logout();
                      setAuthenticatedAdmin(null);
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1"
                  >
                    Switch Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security & Prototype Notice */}
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 mb-6 flex items-start gap-2.5">
            <Info size={15} className="text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Supervised Staging Mode:</strong> Authorizes existing seeded administrators in MongoDB with 2FA development code (<code>123456</code>). Public self-registration for admin accounts is strictly prohibited.
            </p>
          </div>

          {/* Error Banner */}
          {apiError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 mb-6 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <div>
                <strong>Authentication Rejected:</strong> {apiError}
              </div>
            </div>
          )}

          {step === 'input' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              
              {/* Auth Method Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold text-center">
                <button
                  type="button"
                  onClick={() => setAuthMethod('otp')}
                  className={`py-2 rounded-lg transition-all ${
                    authMethod === 'otp'
                      ? 'bg-white text-navy shadow-sm'
                      : 'text-slate-500 hover:text-navy'
                  }`}
                >
                  OTP Verification
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('password')}
                  className={`py-2 rounded-lg transition-all ${
                    authMethod === 'password'
                      ? 'bg-white text-navy shadow-sm'
                      : 'text-slate-500 hover:text-navy'
                  }`}
                >
                  Password Login
                </button>
              </div>

              {/* Identifier Input */}
              <FormField
                label="Registered Admin Mobile Number"
                id="admin-identifier"
                type="text"
                placeholder="e.g. 9899009900"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                error={error}
                helperText="Enter 10-digit mobile number provisioned by platform governance"
                required
              />

              {/* Method Specific Input */}
              {authMethod === 'otp' ? (
                <FormField
                  label="Administrative Verification Code (OTP)"
                  id="admin-otp"
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  helperText="Use 123456 in development/staging environment"
                  required
                />
              ) : (
                <FormField
                  label="Administrative Password"
                  id="admin-password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Default prototype password is Password#2026"
                  required
                />
              )}

              {/* Quick-Fill Seeded Credentials */}
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Pre-Provisioned Administrative Credentials:
                </span>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('9899009900');
                      setOtp('123456');
                      setPassword('Password#2026');
                    }}
                    className="text-[11px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-left hover:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <span>
                      <strong className="text-navy font-bold">Central Operations Lead</strong> (Role: admin)
                    </span>
                    <span className="text-slate-400 text-[10px]">98990 09900</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('9899000001');
                      setOtp('123456');
                      setPassword('Password#2026');
                    }}
                    className="text-[11px] px-3 py-2 rounded-xl bg-navy/5 border border-navy/20 text-navy text-left hover:bg-navy/10 transition-colors flex items-center justify-between"
                  >
                    <span>
                      <strong className="text-navy font-bold">Platform Super Admin</strong> (Role: super_admin)
                    </span>
                    <span className="text-primary font-bold text-[10px]">98990 00001</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full justify-center py-3 bg-navy hover:bg-navy-light text-white font-bold text-sm shadow-md shadow-navy/20"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Activity size={16} className="animate-spin" /> Verifying Clearance...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Authenticate &amp; Access Dashboard <ArrowRight size={16} />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {step === 'success' && authenticatedAdmin && (
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-navy">Clearance Verified</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Welcome back, <strong>{authenticatedAdmin.fullName}</strong>.
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                  <span>Role:</span>
                  <span className="text-primary uppercase font-bold">{authenticatedAdmin.role}</span>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  href="/admin/dashboard"
                  variant="primary"
                  size="md"
                  className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Entering Operations Dashboard &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* Footer Backlink */}
          <div className="mt-8 pt-5 border-t border-slate-100 text-center text-xs text-slate-500 flex flex-col gap-2">
            <div>
              <span>Not a platform administrator? </span>
              <Link href="/sign-in" className="font-bold text-primary hover:underline">
                User &amp; Clinician Sign In &rarr;
              </Link>
            </div>
            <div>
              <span>Executive governance clearance? </span>
              <Link href="/super-admin/dashboard" className="font-semibold text-navy hover:underline">
                Super Admin Console &rarr;
              </Link>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
