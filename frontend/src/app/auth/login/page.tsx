'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(''); // Email or Mobile
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const token = document.cookie.split(';').find(c => c.trim().startsWith('vivo_token='))?.split('=')[1];
    const role = document.cookie.split(';').find(c => c.trim().startsWith('vivo_role='))?.split('=')[1];

    if (!token) return; // No cookie — show login form normally

    // Validate the token against the backend before redirecting
    fetch(`${getApiBaseUrl()}/api/auth/profile/`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include',
    })
      .then(res => {
        if (res.ok) {
          // Token is valid — redirect to the right place
          if (role === 'SUPER_ADMIN') {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
        } else {
          // Token is expired or invalid — clear all stale cookies and stay on login
          document.cookie = 'vivo_token=; path=/; max-age=0';
          document.cookie = 'vivo_role=; path=/; max-age=0';
          document.cookie = 'vivo_tier=; path=/; max-age=0';
          document.cookie = 'access_token=; path=/; max-age=0';
          document.cookie = 'refresh_token=; path=/; max-age=0';
          localStorage.removeItem('vivo_token');
        }
      })
      .catch(() => {
        // Backend not reachable — clear cookies and show login form
        document.cookie = 'vivo_token=; path=/; max-age=0';
        document.cookie = 'vivo_role=; path=/; max-age=0';
        document.cookie = 'vivo_tier=; path=/; max-age=0';
        document.cookie = 'access_token=; path=/; max-age=0';
        document.cookie = 'refresh_token=; path=/; max-age=0';
        localStorage.removeItem('vivo_token');
      });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Basic check: if it's purely digits, it's a mobile number, otherwise assume email
      const isPhone = /^\d+$/.test(identifier.replace(/\D/g, ''));
      const payload = isPhone 
        ? { phone: identifier.replace(/\D/g, ''), password }
        : { email: identifier.toLowerCase().trim(), password };

      const res = await fetch(`${getApiBaseUrl()}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials. Please try again.');
        setLoading(false);
        return;
      }

      // Store tokens
      let userRole = 'USER';
      if (data.tokens?.access) {
        localStorage.setItem('vivo_token', data.tokens.access);
        document.cookie = `vivo_token=${data.tokens.access}; path=/; max-age=604800`;
        userRole = data.profile?.role || data.role || 'USER';
        document.cookie = `vivo_role=${userRole}; path=/; max-age=604800`;
      }

      // Briefly wait for cookies to settle
      await new Promise(r => setTimeout(r, 200));

      if (userRole === 'SUPER_ADMIN') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError('Network error. Please ensure the backend server is running.');
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border-2 border-border rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4 shadow-lg">
            <div className="w-8 h-8 border-4 border-white rounded-full opacity-90" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Welcome Back
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">
            Sign in to continue your metabolic journey
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-destructive/10 border-2 border-destructive/20 text-destructive rounded-xl p-4 mb-6 text-sm font-semibold">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Email or Mobile */}
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
                placeholder="••••••••••••"
                required
                className="w-full pl-11 pr-12 py-3.5 bg-background border-2 border-border rounded-xl text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between mt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-primary accent-primary" defaultChecked />
              <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
            </label>
            <Link href="/auth/forgot-password" className="text-sm font-bold text-primary hover:text-primary-dark transition-colors">
              Forgot Password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !identifier || !password}
            className="w-full py-4 mt-2 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:hover:bg-primary text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-border" />
          </div>
          <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider">
            <span className="bg-card px-4 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <button className="w-full mt-6 py-3.5 bg-background border-2 border-border hover:border-primary/50 hover:bg-secondary/30 text-foreground font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <p className="text-center mt-8 text-sm font-semibold text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-primary hover:text-primary-dark font-extrabold underline decoration-2 underline-offset-4">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
