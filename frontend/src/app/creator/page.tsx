'use client';

import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { 
  Sparkles, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Award, 
  PlusCircle, 
  CheckCircle,
  TrendingDown,
  ChevronRight
} from 'lucide-react';

export default function CreatorPortalPage() {
  const [revenueShare] = useState('₹12,400');
  const [activeSubscribers] = useState(480);
  const [retentionRate] = useState('88.5%');

  const activeInnings = [
    { id: 1, name: '30-Day Sugar-Free Innings', playersCount: 310, status: 'Active', revenue: '₹7,440' },
    { id: 2, name: '15-Day Sunrise Joggers', playersCount: 170, status: 'Active', revenue: '₹4,960' }
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-3" style={{ fontFamily: 'var(--font-heading)' }}>
            Creator Hub Workspace <span className="text-xs bg-secondary text-primary px-3 py-1 rounded-full uppercase tracking-wider font-extrabold">Partner Creator</span>
          </h1>
          <p className="text-muted-foreground font-medium text-sm mt-1">
            Design custom wellness matches, moderate your circles, and review revenue share payouts.
          </p>
        </div>
        <button className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white hover:bg-accent transition-all font-bold text-sm shadow-md">
          <PlusCircle size={16} />
          Launch New Innings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* Left Column (8/12 width) - Creator stats & Active Innings */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Main creator metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card p-6 rounded-[24px] border border-border/40 shadow-card">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Cohort size</span>
              <span className="text-3xl font-black text-foreground mt-2 block">{activeSubscribers} Players</span>
              <p className="text-[10px] text-emerald-600 mt-1 font-bold">↑ +12% growth this month</p>
            </div>

            <div className="bg-card p-6 rounded-[24px] border border-border/40 shadow-card">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Estimated Payout</span>
              <span className="text-3xl font-black text-primary mt-2 block">{revenueShare}</span>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Jun 2026 accrued balance</p>
            </div>

            <div className="bg-card p-6 rounded-[24px] border border-border/40 shadow-card">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Daily adherence</span>
              <span className="text-3xl font-black text-accent mt-2 block">{retentionRate}</span>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Cohort habit sync rate</p>
            </div>
          </div>

          {/* Active Innings list */}
          <div className="bg-card rounded-[32px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-lg mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Active Innings & Matches
            </h3>
            
            <div className="flex flex-col gap-3">
              {activeInnings.map(innings => (
                <div key={innings.id} className="flex items-center justify-between p-4 bg-background border border-border/30 rounded-2xl">
                  <div>
                    <h4 className="font-extrabold text-sm text-foreground">{innings.name}</h4>
                    <span className="text-[9px] bg-secondary text-primary font-bold px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-wider">
                      {innings.status}
                    </span>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <div>
                      <span className="text-sm font-black block text-primary">{innings.revenue}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">{innings.playersCount} players</span>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (4/12 width) - Revenue share rules & Code of Conduct */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Revenue rules summary */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-base mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Payout Guidelines
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
              Partner creators receive a 40% net revenue split on all premium challenge subscriptions purchased using their affiliate circle code.
            </p>
            <div className="w-full h-px bg-border/60 my-4" />
            <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              💼 payout cycle: 5th of each month
            </div>
          </div>

          {/* Code of conduct review status */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-base mb-3 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
              <Award className="text-primary" size={20} /> Creator Code Verified
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-semibold mb-4">
              Your circles comply with the VivoQuest creator code of conduct. Verified clinical guidelines sign-offs are active.
            </p>
            <span className="text-[9px] bg-secondary text-primary font-extrabold px-3 py-1 rounded-full uppercase tracking-wider block text-center w-full">
              CONDUCT STATUS: COMPLIANT
            </span>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
