'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Truck,
  ShieldCheck,
  Lock,
  Phone,
  AlertCircle,
  ArrowRight,
  PackageCheck,
  Wrench,
  Boxes,
  Shield,
  Activity,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { authApi } from '@/lib/api';

export default function OperationsLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ALLOWED_ROLES = [
    'operations_manager',
    'delivery_staff',
    'sales_manager',
    'maintenance_staff',
    'admin',
    'super_admin',
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.login({ identifier, password });
      if (res && res.user) {
        const user = res.user;
        const role = user.role?.toLowerCase();

        if (!ALLOWED_ROLES.includes(role)) {
          setError(
            'Access Denied: This portal is reserved for authorized Sales, Delivery, and Maintenance employees. Please use the Patient Mobile App or public portal.'
          );
          setLoading(false);
          return;
        }

        // Redirect admin accounts to Admin Dashboard if preferred, or operations dashboard
        if (role === 'admin' || role === 'super_admin') {
          router.push('/operations/dashboard');
        } else {
          router.push('/operations/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid employee credentials. Please verify your phone/email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (phone: string, pass: string) => {
    setIdentifier(phone);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen flex flex-col font-sans text-navy">
      <Navbar />

      <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-border shadow-2xl p-7 sm:p-9 text-left">
          
          {/* Header Icon & Branding */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto mb-3 shadow-md shadow-teal-500/10">
              <Truck size={28} strokeWidth={2.2} />
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span>Dedicated Employee Operations Portal (Recommended)</span>
            </div>

            <h1 className="text-2xl font-black text-navy tracking-tight">
              Sales, Inventory &amp; Last-Mile Delivery Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Secure role-based workspace for inventory dispatchers, field delivery specialists, biomedical technicians, and operations supervisors.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-navy mb-1.5">
                Registered Mobile Number or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9899110001 or 9899009900"
                  required
                  className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-slate-50 border border-border text-navy placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:bg-white"
                />
                <Phone size={15} className="absolute left-3.5 top-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy mb-1.5">
                Password
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
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-navy hover:bg-navy-light text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-navy/20 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Activity size={15} className="animate-spin" /> Verifying Clearance...
                  </span>
                ) : (
                  <>
                    <span>Sign In to Operations Workspace</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Staff Logins */}
          <div className="mt-8 pt-6 border-t border-border">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
              1-Click Test Credentials (Username &amp; Password):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Operations Manager */}
              <button
                type="button"
                onClick={() => handleQuickFill('9899110001', 'Ops#2026')}
                className="text-left p-2.5 rounded-xl bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/80 transition flex items-center justify-between text-xs group"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-600/10 text-teal-700">
                    <Boxes size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-teal-950 group-hover:text-teal-900">Operations Manager</div>
                    <div className="text-[10px] text-teal-800 font-mono">9899110001 • Ops#2026</div>
                  </div>
                </div>
                <span className="text-[10px] text-teal-700 font-semibold group-hover:underline">Fill &rarr;</span>
              </button>

              {/* Delivery Specialist */}
              <button
                type="button"
                onClick={() => handleQuickFill('9899110002', 'Ops#2026')}
                className="text-left p-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/80 transition flex items-center justify-between text-xs group"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-700">
                    <PackageCheck size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-950 group-hover:text-emerald-900">Delivery Specialist</div>
                    <div className="text-[10px] text-emerald-800 font-mono">9899110002 • Ops#2026</div>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold group-hover:underline">Fill &rarr;</span>
              </button>

              {/* Biomedical Technician */}
              <button
                type="button"
                onClick={() => handleQuickFill('9899110003', 'Ops#2026')}
                className="text-left p-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/80 transition flex items-center justify-between text-xs group"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-600/10 text-amber-700">
                    <Wrench size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-amber-950 group-hover:text-amber-900">Biomedical Tech</div>
                    <div className="text-[10px] text-amber-800 font-mono">9899110003 • Ops#2026</div>
                  </div>
                </div>
                <span className="text-[10px] text-amber-700 font-semibold group-hover:underline">Fill &rarr;</span>
              </button>

              {/* Operations Admin Lead */}
              <button
                type="button"
                onClick={() => handleQuickFill('9899009900', 'Admin#2026')}
                className="text-left p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/80 transition flex items-center justify-between text-xs group"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-700">
                    <ShieldCheck size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-blue-950 group-hover:text-blue-900">Operations Admin Lead</div>
                    <div className="text-[10px] text-blue-800 font-mono">9899009900 • Admin#2026</div>
                  </div>
                </div>
                <span className="text-[10px] text-blue-700 font-semibold group-hover:underline">Fill &rarr;</span>
              </button>

              {/* Super Admin Director */}
              <button
                type="button"
                onClick={() => handleQuickFill('9899000001', 'SuperAdmin#2026')}
                className="text-left p-2.5 rounded-xl bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200/80 transition flex items-center justify-between text-xs group sm:col-span-2"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-600/10 text-purple-700">
                    <Shield size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-purple-950 group-hover:text-purple-900">Super Administrator Director</div>
                    <div className="text-[10px] text-purple-800 font-mono">9899000001 • SuperAdmin#2026</div>
                  </div>
                </div>
                <span className="text-[10px] text-purple-700 font-semibold group-hover:underline">Fill &rarr;</span>
              </button>
            </div>
          </div>

          {/* Footer Backlinks */}
          <div className="mt-6 pt-5 border-t border-border flex items-center justify-between text-xs text-slate-500">
            <Link href="/sign-in" className="hover:text-navy transition font-medium">
              &larr; User &amp; Clinician Sign In
            </Link>
            <Link href="/admin/login" className="text-navy hover:underline font-semibold flex items-center gap-1">
              <span>Admin Portal Login</span>
              <ExternalLink size={12} />
            </Link>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
