'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // The current backend mock accepts 'email'
      const isPhone = /^\d+$/.test(identifier.replace(/\D/g, ''));
      const payload = isPhone ? { phone: identifier } : { email: identifier.toLowerCase().trim() };

      const res = await fetch('http://127.0.0.1:3001/api/auth/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to request OTP. Check your details.');
        setLoading(false);
        return;
      }

      setSuccess(data.message || 'OTP sent successfully!');
      setTimeout(() => {
        setSuccess('');
        setStep('reset');
      }, 2000);
      setLoading(false);
    } catch (err) {
      setError('Network error. Please try again later.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Mock reset logic - in a real app this would hit a /reset-password endpoint
    try {
      // We simulate a network call
      await new Promise(r => setTimeout(r, 1000));
      
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);

    } catch (err) {
      setError('Failed to reset password.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border-2 border-border rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-secondary items-center justify-center mb-4 shadow-inner">
            <KeyRound size={32} className="text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Reset Password
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">
            {step === 'request' 
              ? "Enter your email or mobile to receive an OTP." 
              : "Enter the OTP sent to your device and your new password."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-destructive/10 border-2 border-destructive/20 text-destructive rounded-xl p-4 mb-6 text-sm font-semibold">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 bg-primary/10 border-2 border-primary/20 text-primary-dark rounded-xl p-4 mb-6 text-sm font-semibold">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestOTP} className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Email or Mobile Number
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="player@example.com or 9876543210"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-background border-2 border-border rounded-xl text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !identifier}
              className="w-full py-4 mt-2 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:hover:bg-primary text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Send OTP
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                6-Digit OTP
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                className="w-full px-4 py-3.5 text-center tracking-widest text-xl bg-background border-2 border-border rounded-xl text-foreground font-bold focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-background border-2 border-border rounded-xl text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6 || !newPassword}
              className="w-full py-4 mt-2 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:hover:bg-primary text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Reset Password
                  <CheckCircle2 size={18} />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/auth/login" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
