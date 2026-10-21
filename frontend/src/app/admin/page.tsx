'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, Activity, Lock } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the full responsive Admin Dashboard
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-navy">
      <Navbar />

      <div className="max-w-xl mx-auto px-4 py-24 text-center flex-1 flex flex-col justify-center items-center">
        <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center mb-4">
          <Activity size={28} className="animate-pulse" />
        </div>
        <h1 className="text-2xl font-extrabold text-navy">Redirecting to Admin Operations Dashboard...</h1>
        <p className="text-sm text-slate-500 mt-2">
          If you are not automatically redirected, please choose an administrative console:
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Link
            href="/admin/dashboard"
            className="px-5 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <ShieldCheck size={18} />
            Operations Dashboard
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/super-admin/dashboard"
            className="px-5 py-3 rounded-xl bg-navy text-white font-semibold text-sm hover:bg-navy-light transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Lock size={16} />
            Super-Admin Governance
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
