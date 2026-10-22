'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { getApiBaseUrl } from '@/lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('performance');
  const [isAging, setIsAging] = useState(false);

  useEffect(() => {
    // Check if token exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('vivo_token') : null;
    if (!token) {
      router.push('/');
      return;
    }

    // Fetch personalization details from API
    fetch(`${getApiBaseUrl()}/api/auth/personalization/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (res.status === 401) {
        localStorage.removeItem('vivo_token');
        router.push('/');
        throw new Error('Unauthorized');
      }
      return res.json();
    })
    .then(data => {
      // Save personalization data to localStorage for components to read
      localStorage.setItem('vivo_name', data.name || 'New Player');
      localStorage.setItem('vivo_email', data.email || '');
      localStorage.setItem('vivo_gender', data.gender || 'MALE');
      localStorage.setItem('vivo_state', data.state || 'Delhi');
      localStorage.setItem('vivo_language', data.language || 'en');
      localStorage.setItem('vivo_xp', (data.xp !== undefined ? data.xp : 0).toString());
      localStorage.setItem('vivo_level', (data.level !== undefined ? data.level : 1).toString());
      localStorage.setItem('vivo_total_runs', (data.total_runs !== undefined ? data.total_runs : 0).toString());
      localStorage.setItem('vivo_streak', (data.streak !== undefined ? data.streak : 0).toString());
      localStorage.setItem('vivo_persona', data.persona);
      localStorage.setItem('vivo_sport', data.sport);
      localStorage.setItem('vivo_community_type', data.community_type);
      localStorage.setItem('vivo_plan', data.plan);
      localStorage.setItem('vivo_role', data.role);
      localStorage.setItem('vivo_theme', data.theme);
      localStorage.setItem('vivo_challenges', JSON.stringify(data.challenges));
      localStorage.setItem('vivo_ai_insight', data.ai_insight);
      localStorage.setItem('vivo_reports', JSON.stringify(data.reports));
      
      setTheme(data.theme);
      setIsAging(data.persona === 'ELDER');
      setLoading(false);
      
      // Dispatch load event
      window.dispatchEvent(new Event('personalization_loaded'));
    })
    .catch(err => {
      console.error('Failed to load personalization engine settings:', err);
      // Fallback to cache
      const cachedTheme = localStorage.getItem('vivo_theme') || 'performance';
      const cachedPersona = localStorage.getItem('vivo_persona') || 'ADULT';
      setTheme(cachedTheme);
      setIsAging(cachedPersona === 'ELDER');
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] absolute animate-pulse pointer-events-none" />
        <div className="flex flex-col items-center z-10">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg mb-6 animate-spin">
            <div className="w-6 h-6 border-4 border-white rounded-full border-t-transparent opacity-90" />
          </div>
          <h1 className="text-primary text-3xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            VivoQuest
          </h1>
          <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
            Loading your personalized experience...
          </p>
        </div>
      </div>
    );
  }

  const themeClass = `theme-${theme}`;
  const fontClass = isAging ? 'large-text' : '';

  return (
    <div className={`w-full h-[100dvh] bg-background text-foreground flex flex-col lg:flex-row overflow-hidden relative ${themeClass} ${fontClass}`}>
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Subtle radial lime glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-card-lime rounded-full mix-blend-screen filter blur-[150px] opacity-[0.02] pointer-events-none z-0" />
        
        {/* Scrollable container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 scrollbar-hide">
          <div className="w-full max-w-7xl mx-auto flex flex-col gap-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

