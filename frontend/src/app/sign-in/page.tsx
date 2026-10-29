'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  AlertCircle,
  Sparkles,
  Truck,
  ShieldCheck,
  Boxes,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { authApi, ApiClientError } from '@/lib/api';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [role, setRole] = useState<'patient' | 'professional' | 'hospital' | 'operations'>('patient');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [opsAuthRole, setOpsAuthRole] = useState<'employee' | 'admin'>('employee');
  const [step, setStep] = useState<'enter_phone' | 'enter_otp' | 'success'>('enter_phone');
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authResponse, setAuthResponse] = useState<any>(null);

  // If redirect points to operations or admin, auto-select operations tab
  useEffect(() => {
    if (redirectUrl && (redirectUrl.includes('/operations') || redirectUrl.includes('/admin'))) {
      setRole('operations');
    }
  }, [redirectUrl]);

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
        role: role === 'operations' ? undefined : role,
      });

      setAuthResponse(response);
      setStep('success');

      // If redirect URL is provided and safe (relative path), navigate automatically
      if (redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1200);
      }
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

  // Operations Employee & Admin Password Sign-In
  const handleOperationsPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setError('');

    const cleanIdentifier = phone.trim();
    if (!cleanIdentifier) {
      setError('Please enter your registered mobile number or email');
      return;
    }

    if (!password || password.length < 4) {
      setError('Please enter your valid password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.login({
        identifier: cleanIdentifier,
        password,
      });

      setAuthResponse(response);
      setStep('success');

      // Auto redirect based on employee role vs admin role
      const userRole = response.user.role?.toLowerCase();
      const isOpsStaff = ['operations_manager', 'delivery_staff', 'sales_manager', 'maintenance_staff'].includes(userRole);
      const isAdminStaff = ['admin', 'super_admin'].includes(userRole);

      const targetUrl = redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')
        ? redirectUrl
        : isOpsStaff
        ? '/operations/dashboard'
        : isAdminStaff
        ? '/admin/dashboard'
        : '/';

      setTimeout(() => {
        router.push(targetUrl);
      }, 1000);
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setApiError(err.message);
      } else {
        setApiError(err.message || 'Authentication failed. Please verify employee or admin credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFillOps = (loginPhone: string, loginPass: string, roleType: 'employee' | 'admin') => {
    setPhone(loginPhone);
    setPassword(loginPass);
    setOpsAuthRole(roleType);
    setError('');
    setApiError(null);
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen flex flex-col font-sans text-navy">
      <Navbar />

      <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-border shadow-2xl p-7 sm:p-9 text-left">
          
          {/* Logo & Heading */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto mb-3 shadow-primary">
              <Activity size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black text-navy">
              Sign In to Vivo<span className="text-secondary">Quest</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Secure, authenticated access for patients, clinicians, operations staff &amp; administrators
            </p>
          </div>

          {/* Checkout Redirection Notice */}
          {redirectUrl && (
            <div className="mb-5 p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-950">
              <Shield size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Continuing to Destination</p>
                <p className="text-blue-900/80 mt-0.5">
                  Sign in to authenticate your session. Your navigation to <strong>{redirectUrl}</strong> will resume automatically.
                </p>
              </div>
            </div>
          )}

          {/* Role Selector Tabs (Now includes Operations & Admin) */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-100 border border-border mb-6">
            <button
              type="button"
              onClick={() => { setRole('patient'); setStep('enter_phone'); setError(''); setApiError(null); }}
              className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all flex flex-col items-center gap-1 ${
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
              className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all flex flex-col items-center gap-1 ${
                role === 'professional'
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-navy hover:text-secondary'
              }`}
            >
              <Stethoscope size={14} />
              <span>Doctor</span>
            </button>
            <button
              type="button"
              onClick={() => { setRole('hospital'); setStep('enter_phone'); setError(''); setApiError(null); }}
              className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all flex flex-col items-center gap-1 ${
                role === 'hospital'
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-navy hover:text-navy-dark'
              }`}
            >
              <Building size={14} />
              <span>Hospital</span>
            </button>
            <button
              type="button"
              onClick={() => { setRole('operations'); setStep('enter_phone'); setError(''); setApiError(null); }}
              className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex flex-col items-center gap-1 relative ${
                role === 'operations'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-teal-800 hover:text-teal-900 bg-teal-50/60'
              }`}
            >
              <div className="flex items-center gap-1">
                <Truck size={14} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-[11px] leading-tight">Operations</span>
            </button>
          </div>

          {/* Prototype / Staging Notice */}
          {role !== 'operations' ? (
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-navy/80 mb-6">
              <Info size={15} className="text-primary shrink-0 mt-0.5" />
              <p>
                <strong>Live Backend Connected:</strong> Development mock OTP is strictly restricted to designated test accounts. Other registered accounts authenticate using their secure credentials.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900 mb-6">
              <div className="flex items-center gap-2 font-bold text-teal-950 mb-1">
                <Truck size={16} className="text-teal-700" />
                <span>Dedicated Employee Operations Portal (Recommended)</span>
              </div>
              <p className="text-[11px] text-teal-800 leading-relaxed">
                Direct role-based sign in for Sales, Product Inventory, Last-Mile Delivery, Biomedical Maintenance, and Platform Administrators.
              </p>
            </div>
          )}

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

          {/* OPERATIONAL / ADMIN LOGIN TAB */}
          {role === 'operations' && step === 'enter_phone' && (
            <form onSubmit={handleOperationsPasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy mb-1.5">
                  Registered Mobile Number or Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9899110001 or 9899009900"
                    required
                    className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-slate-50 border border-border text-navy placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:bg-white"
                  />
                  <Phone size={15} className="absolute left-3.5 top-3 text-slate-400" />
                </div>
                {error && !password && <p className="text-[11px] text-destructive mt-1">{error}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-slate-50 border border-border text-navy placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:bg-white"
                  />
                  <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                </div>
                {error && password && <p className="text-[11px] text-destructive mt-1">{error}</p>}
              </div>

              {/* 1-Click Fast Fill Test Credentials */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  1-Click Test Credentials (Username &amp; Password):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Ops Manager */}
                  <button
                    type="button"
                    onClick={() => handleQuickFillOps('9899110001', 'Ops#2026', 'employee')}
                    className="text-left p-2.5 rounded-xl bg-teal-50/60 hover:bg-teal-100/70 border border-teal-200/80 transition flex items-center justify-between text-xs group"
                  >
                    <div>
                      <div className="font-bold text-teal-950 flex items-center gap-1.5">
                        <Boxes size={13} className="text-teal-600" />
                        <span>Operations Manager</span>
                      </div>
                      <div className="text-[10px] text-teal-700 font-mono mt-0.5">
                        9899110001 • Ops#2026
                      </div>
                    </div>
                    <span className="text-[10px] text-teal-800 font-semibold group-hover:underline">Fill &rarr;</span>
                  </button>

                  {/* Delivery Specialist */}
                  <button
                    type="button"
                    onClick={() => handleQuickFillOps('9899110002', 'Ops#2026', 'employee')}
                    className="text-left p-2.5 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/80 transition flex items-center justify-between text-xs group"
                  >
                    <div>
                      <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <Truck size={13} className="text-emerald-600" />
                        <span>Delivery Specialist</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                        9899110002 • Ops#2026
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-800 font-semibold group-hover:underline">Fill &rarr;</span>
                  </button>

                  {/* Operations Admin Lead */}
                  <button
                    type="button"
                    onClick={() => handleQuickFillOps('9899009900', 'Admin#2026', 'admin')}
                    className="text-left p-2.5 rounded-xl bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200/80 transition flex items-center justify-between text-xs group"
                  >
                    <div>
                      <div className="font-bold text-blue-950 flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-blue-600" />
                        <span>Operations Admin Lead</span>
                      </div>
                      <div className="text-[10px] text-blue-700 font-mono mt-0.5">
                        9899009900 • Admin#2026
                      </div>
                    </div>
                    <span className="text-[10px] text-blue-800 font-semibold group-hover:underline">Fill &rarr;</span>
                  </button>

                  {/* Super Admin Director */}
                  <button
                    type="button"
                    onClick={() => handleQuickFillOps('9899000001', 'SuperAdmin#2026', 'admin')}
                    className="text-left p-2.5 rounded-xl bg-purple-50/60 hover:bg-purple-100/70 border border-purple-200/80 transition flex items-center justify-between text-xs group"
                  >
                    <div>
                      <div className="font-bold text-purple-950 flex items-center gap-1.5">
                        <Shield size={13} className="text-purple-600" />
                        <span>Super Administrator</span>
                      </div>
                      <div className="text-[10px] text-purple-700 font-mono mt-0.5">
                        9899000001 • SuperAdmin#2026
                      </div>
                    </div>
                    <span className="text-[10px] text-purple-800 font-semibold group-hover:underline">Fill &rarr;</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full justify-center bg-navy hover:bg-navy-light text-white font-bold shadow-md shadow-navy/20"
                  rightIcon={<ArrowRight size={16} />}
                >
                  {opsAuthRole === 'admin' ? 'Sign In to Admin Dashboard' : 'Sign In to Operations Portal'}
                </Button>
              </div>

              {/* Dedicated portals direct access shortcuts */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Link
                  href="/operations/login"
                  className="flex-1 p-2 rounded-xl bg-teal-50/80 hover:bg-teal-100 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <span>Operations Portal Login Page</span>
                  <ExternalLink size={12} />
                </Link>
                <Link
                  href="/admin/login"
                  className="flex-1 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-navy text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <span>Admin Portal Login Page</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </form>
          )}

          {/* STANDARD PATIENT / DOCTOR / HOSPITAL FLOW */}
          {role !== 'operations' && step === 'enter_phone' && (
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
                helperText="Enter 6-digit verification code (Development mock: 123456)"
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
                {redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? (
                  <>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2 mb-2">
                      <Sparkles size={14} className="text-emerald-600 animate-spin" />
                      <span>Redirecting you to destination...</span>
                    </div>
                    <Button href={redirectUrl} variant="primary" size="md" className="w-full justify-center shadow-md">
                      Proceed Now &rarr;
                    </Button>
                  </>
                ) : ['operations_manager', 'delivery_staff', 'sales_manager', 'maintenance_staff'].includes(authResponse.user.role) ? (
                  <Button href="/operations/dashboard" variant="primary" size="md" className="w-full justify-center bg-teal-600 hover:bg-teal-700">
                    Open Operations Command Center &rarr;
                  </Button>
                ) : ['admin', 'super_admin'].includes(authResponse.user.role) ? (
                  <Button href="/admin/dashboard" variant="primary" size="md" className="w-full justify-center bg-navy hover:bg-navy-light">
                    Open Admin Portal Dashboard &rarr;
                  </Button>
                ) : authResponse.user.role === 'professional' ? (
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

                <Button
                  onClick={() => {
                    authApi.logout();
                    setStep('enter_phone');
                    setPhone('');
                    setOtp('');
                    setPassword('');
                    setAuthResponse(null);
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-xs"
                >
                  Sign Out / Switch User
                </Button>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted-foreground flex flex-col gap-2">
            <div>
              <span>New to VivoQuest? </span>
              <Link
                href={redirectUrl ? `/register?redirect=${encodeURIComponent(redirectUrl)}` : '/register'}
                className="font-bold text-primary hover:underline"
              >
                Create an Account
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[11px]">
              <Link href="/operations/login" className="font-semibold text-teal-700 hover:underline flex items-center gap-1">
                <Truck size={12} />
                <span>Dedicated Operations Portal &rarr;</span>
              </Link>
              <span className="text-slate-300">•</span>
              <Link href="/admin/login" className="font-semibold text-navy hover:underline flex items-center gap-1">
                <ShieldCheck size={12} />
                <span>Admin Portal &rarr;</span>
              </Link>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignInContent />
    </Suspense>
  );
}
