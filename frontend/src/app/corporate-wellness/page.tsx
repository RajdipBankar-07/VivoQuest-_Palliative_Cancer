'use client';

import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Calendar, 
  Download, 
  PlusCircle, 
  Award,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function CorporateWellnessPage() {
  const [employeesCount] = useState(1240);
  const [teamScore] = useState(74);
  const [activeCampaigns, setActiveCampaigns] = useState([
    { name: 'Q2 Metabolic Challenge', duration: 'Jun 01 - Jun 30', activeStaff: 840, target: 'Steps & Meal logs compliance', status: 'Active' },
    { name: 'Finance vs Engineering Match', duration: 'Jun 10 - Jun 17', activeStaff: 320, target: 'Evening screen wind-down', status: 'Upcoming' }
  ]);

  const departments = [
    { name: 'Engineering Strikers', members: 420, runs: 18400, score: 79 },
    { name: 'Finance Challengers', members: 210, runs: 9200, score: 75 },
    { name: 'Sales Warriors', members: 310, runs: 12800, score: 72 },
    { name: 'Operations Titans', members: 300, runs: 11900, score: 70 },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-3" style={{ fontFamily: 'var(--font-heading)' }}>
            Corporate Wellness Workspace <span className="text-xs bg-[#FEF3E2] text-orange-700 px-3 py-1 rounded-full uppercase tracking-wider font-extrabold">Enterprise</span>
          </h1>
          <p className="text-muted-foreground font-medium text-sm mt-1">
            Track aggregate employee health telemetry, configure wellness campaigns, and compile CSR/ESG health reports.
          </p>
        </div>
        <button className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white hover:bg-accent transition-all font-bold text-sm shadow-md">
          <PlusCircle size={16} />
          Create Team Innings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* Left Column (8/12 width) - HR Dashboard & Dept standings */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Main Wellness stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card p-6 rounded-[24px] border border-border/40 shadow-card">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Registered staff</span>
              <span className="text-3xl font-black text-foreground mt-2 block">{employeesCount} Employees</span>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold">92% active logging this week</p>
            </div>

            <div className="bg-card p-6 rounded-[24px] border border-border/40 shadow-card">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Avg Metabolic Score</span>
              <span className="text-3xl font-black text-primary mt-2 block">{teamScore} / 100</span>
              <p className="text-[10px] text-emerald-600 mt-1 font-bold">↑ +3.5 points from baseline</p>
            </div>

            <div className="bg-card p-6 rounded-[24px] border border-border/40 shadow-card">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Total runs scored</span>
              <span className="text-3xl font-black text-accent mt-2 block">52,300 Runs</span>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Aggregate department score</p>
            </div>
          </div>

          {/* Department Standings Table */}
          <div className="bg-card rounded-[32px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-lg mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Department Leaderboard Standing
            </h3>
            <div className="flex flex-col gap-3">
              {departments.map((dept, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-background border border-border/30 rounded-2xl">
                  <div>
                    <h4 className="font-extrabold text-sm text-foreground">{dept.name}</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{dept.members} active employees</p>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <div>
                      <span className="text-sm font-black block text-primary">{dept.runs} Runs</span>
                      <span className="text-[10px] text-muted-foreground font-bold">Avg Score: {dept.score}</span>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (4/12 width) - ESG/CSR and Campaign Info */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Campaigns */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-base mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Active Campaigns
            </h3>
            <div className="flex flex-col gap-4">
              {activeCampaigns.map((c, i) => (
                <div key={i} className="p-4 bg-background border border-border/30 rounded-2xl flex flex-col gap-2">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[10px] font-black text-primary bg-secondary px-2 py-0.5 rounded-full uppercase tracking-wider">{c.status}</span>
                    <span className="text-[9px] text-muted-foreground font-bold">{c.duration}</span>
                  </div>
                  <h4 className="font-extrabold text-xs text-foreground mt-1">{c.name}</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-semibold mt-0.5">{c.target}</p>
                  <span className="text-[10px] text-primary font-bold mt-1">{c.activeStaff} staff participating</span>
                </div>
              ))}
            </div>
          </div>

          {/* CSR Reports Download */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-base mb-3 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
              <ShieldCheck className="text-primary animate-pulse" size={20} /> Corporate Audit
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-semibold mb-4">
              Export aggregate de-identified employee health progress reports to verify your wellness spending and CSR/ESG compliance.
            </p>
            <button className="w-full py-3 bg-secondary text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-2">
              <Download size={14} /> Download ESG Impact Ledger
            </button>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
