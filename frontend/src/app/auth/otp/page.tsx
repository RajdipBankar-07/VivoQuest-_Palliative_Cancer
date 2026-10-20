'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, AlertCircle, ArrowRight, Clock } from 'lucide-react';

function OTPVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
    // Get phone from URL or sessionStorage
    const phoneParam = searchParams.get('phone');
    const sessionPhone = sessionStorage.getItem('pending_verification_phone');
    
    if (phoneParam) {
      setPhone(phoneParam);
    } else if (sessionPhone) {
      setPhone(sessionPhone);
    } else {
      // If no phone is found, push them back to signup
      router.push('/auth/signup');
    }

    // Auto focus first input
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    // Take only the last character in case they paste
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto focus next
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all filled
    if (value && index === 5 && newOtp.every(v => v !== '')) {
      verifyOtp(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      // Focus the last filled input or the next empty one
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
      
      if (pastedData.length === 6) {
        verifyOtp(pastedData);
      }
    }
  };

  const verifyOtp = async (codeStr: string) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:3001/api/auth/verify-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, code: codeStr }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid OTP code. Please try again.');
        setLoading(false);
        // Clear OTP inputs on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      // Store tokens
      if (data.tokens?.access) {
        localStorage.setItem('vivo_token', data.tokens.access);
        document.cookie = `vivo_token=${data.tokens.access}; path=/; max-age=604800`;
        const userRole = data.profile?.user?.role || data.role || 'USER';
        document.cookie = `vivo_role=${userRole}; path=/; max-age=604800`;
      }

      sessionStorage.removeItem('pending_verification_phone');
      
      // Wait for cookies
      await new Promise(r => setTimeout(r, 200));

      // Successfully verified - route to onboarding setup
      window.location.href = '/onboarding';

    } catch (err) {
      setError('Network error. Please try again later.');
      setLoading(false);
    }
  };

  const handleResend = () => {
    setCanResend(false);
    setTimeLeft(60);
    // In a real app, call the resend OTP API here
    // For now we just reset the timer.
  };

  if (!mounted || !phone) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border-2 border-border rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-secondary items-center justify-center mb-4 shadow-inner">
            <ShieldCheck size={32} className="text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Verify Mobile
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">
            We've sent a 6-digit code to <br/>
            <span className="font-bold text-foreground">+91 {phone}</span>
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-destructive/10 border-2 border-destructive/20 text-destructive rounded-xl p-4 mb-6 text-sm font-semibold">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-between gap-2 mb-8" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleOtpChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              disabled={loading}
              className="w-12 h-14 md:w-14 md:h-16 bg-background border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-center text-2xl font-extrabold text-foreground transition-all outline-none disabled:opacity-50"
            />
          ))}
        </div>

        <button
          onClick={() => verifyOtp(otp.join(''))}
          disabled={loading || otp.some(v => v === '')}
          className="w-full py-4 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:hover:bg-primary text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Verify & Continue
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <div className="mt-8 text-center">
          {canResend ? (
            <p className="text-sm font-semibold text-muted-foreground">
              Didn't receive the code?{' '}
              <button onClick={handleResend} className="text-primary font-bold hover:underline">
                Resend OTP
              </button>
            </p>
          ) : (
            <p className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1.5">
              <Clock size={14} />
              Resend code in <span className="font-bold text-foreground">00:{timeLeft.toString().padStart(2, '0')}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OTPVerificationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground">Loading verification...</div>}>
      <OTPVerificationForm />
    </Suspense>
  );
}
