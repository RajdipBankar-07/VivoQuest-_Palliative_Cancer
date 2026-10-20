'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Phone, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!terms) {
      setError('You must accept the Terms & Conditions.');
      return;
    }
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:3001/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          phone,
          email: email.toLowerCase().trim(),
          password
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Email or phone might already be in use.');
        setLoading(false);
        return;
      }

      // Registration is successful!
      // Send the user to OTP verification before letting them proceed to Onboarding.
      // We pass the phone number securely via session storage or URL parameters.
      sessionStorage.setItem('pending_verification_phone', phone);
      router.push(`/auth/otp?phone=${phone}`);

    } catch (err) {
      setError('Network error. Please ensure the backend server is running.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border-2 border-border rounded-3xl p-8 shadow-xl my-8">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4 shadow-lg">
            <div className="w-8 h-8 border-4 border-white rounded-full opacity-90" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Join the League
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">
            Create your account to start playing Metabolic Health.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-destructive/10 border-2 border-destructive/20 text-destructive rounded-xl p-4 mb-6 text-sm font-semibold">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Namrata Sharma"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-background border-2 border-border rounded-xl text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Mobile Number
              </label>
              <div className="relative flex gap-2">
                <div className="bg-background border-2 border-border rounded-xl px-4 py-3.5 font-bold text-sm text-muted-foreground flex items-center justify-center shrink-0">
                  +91
                </div>
                <div className="relative w-full">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-background border-2 border-border rounded-xl text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="player@example.com"
                required
                className="w-full pl-11 pr-4 py-3.5 bg-background border-2 border-border rounded-xl text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-12 py-3.5 bg-background border-2 border-border rounded-xl text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-background border-2 border-border rounded-xl text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="mt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={terms}
                onChange={e => setTerms(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-2 border-border text-primary focus:ring-primary accent-primary" 
              />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                I agree to the <span className="text-primary font-bold">Terms & Conditions</span>, <span className="text-primary font-bold">Privacy Policy</span>, and consent to receiving health-related communication via SMS/WhatsApp.
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name || !email || !password || !confirmPassword || !phone}
            className="w-full py-4 mt-4 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:hover:bg-primary text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-sm font-semibold text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary hover:text-primary-dark font-extrabold underline decoration-2 underline-offset-4">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
