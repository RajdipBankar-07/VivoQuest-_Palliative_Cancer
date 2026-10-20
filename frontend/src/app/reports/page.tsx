'use client';

import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Calendar, 
  Check, 
  Clock, 
  Activity,
  Heart,
  FileSpreadsheet
} from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'trends'>('weekly');
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadPDF = () => {
    setDownloading(true);
    setDownloadSuccess(false);
    setTimeout(() => {
      setDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 2000);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Health Reports Hub
          </h1>
          <p className="text-muted-foreground font-medium text-sm mt-1">
            Export comprehensive metabolic insights and glucose time-in-range trends for clinical consultation.
          </p>
        </div>
        <button 
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white hover:bg-accent disabled:opacity-50 transition-all font-bold text-sm shadow-md"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {downloading ? (
            <>
              <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />
              Compiling PDF...
            </>
          ) : downloadSuccess ? (
            <>
              <Check size={16} strokeWidth={3} />
              Downloaded!
            </>
          ) : (
            <>
              <Download size={16} />
              Download Clinical PDF
            </>
          )}
        </button>
      </div>

      {/* Selector */}
      <div className="flex overflow-x-auto bg-card p-1.5 rounded-2xl border border-border shadow-sm scrollbar-hide max-w-md shrink-0">
        {[
          { key: 'weekly', label: 'Weekly Summary' },
          { key: 'monthly', label: 'Monthly Audit' },
          { key: 'trends', label: 'Biometric Trends' }
        ].map((tab) => {
          const isActive = reportType === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setReportType(tab.key as any)}
              className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* Left Column (8/12 width) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* View: Weekly Report */}
          {reportType === 'weekly' && (
            <div className="bg-card rounded-[32px] p-6 md:p-8 border border-border/40 shadow-card flex flex-col gap-6">
              <div className="flex justify-between items-center pb-4 border-b border-border/40">
                <div>
                  <h3 className="font-extrabold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                    Weekly Metabolic Audit
                  </h3>
                  <span className="text-xs text-muted-foreground font-semibold">Period: Jun 01 - Jun 07, 2026</span>
                </div>
                <span className="text-xs font-black text-primary bg-secondary px-3 py-1 rounded-full uppercase tracking-wider">
                  WEEK 4 COMPLETE
                </span>
              </div>

              {/* Weekly biometrics metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-background rounded-2xl border border-border/30">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Metabolic score</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-foreground">78</span>
                    <span className="text-xs font-bold text-emerald-600">↑ +6.2%</span>
                  </div>
                </div>

                <div className="p-4 bg-background rounded-2xl border border-border/30">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Time In Range (CGM)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-foreground">84%</span>
                    <span className="text-xs font-bold text-emerald-600">↑ +4.0%</span>
                  </div>
                </div>

                <div className="p-4 bg-background rounded-2xl border border-border/30">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Habit score compliance</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-foreground">87%</span>
                    <span className="text-xs font-bold text-red-500">↓ -2.1%</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-border/60" />

              {/* Weekly details */}
              <div className="flex flex-col gap-4">
                <h4 className="font-extrabold text-base text-primary-dark" style={{ fontFamily: 'var(--font-heading)' }}>
                  Clinician Summary Notes
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed font-semibold">
                  Good compliance across Movement (100% target met) and Sleep (85% target met). Grains logs show persistent insulin triggers after dinners. Recommend substituting roti with millets to stabilize nocturnal glucose ranges. Stress levels peaked on Wednesday matching a long corporate work schedule, triggering minor biometric alerts.
                </p>
              </div>
            </div>
          )}

          {/* View: Monthly Audit */}
          {reportType === 'monthly' && (
            <div className="bg-card rounded-[32px] p-6 md:p-8 border border-border/40 shadow-card flex flex-col gap-6">
              <div className="flex justify-between items-center pb-4 border-b border-border/40">
                <div>
                  <h3 className="font-extrabold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                    Monthly Metabolic Consolidation
                  </h3>
                  <span className="text-xs text-muted-foreground font-semibold">Period: May 2026 Summary</span>
                </div>
                <span className="text-xs font-black text-primary bg-secondary px-3 py-1 rounded-full uppercase tracking-wider">
                  MAY COMPLETE
                </span>
              </div>

              <div className="flex flex-col gap-4 bg-secondary/20 p-5 rounded-2xl border border-primary/10">
                <h4 className="font-extrabold text-sm text-primary">Monthly Highlights</h4>
                <ul className="flex flex-col gap-2.5 text-xs font-semibold text-muted-foreground">
                  <li className="flex items-center gap-2"><span className="text-primary font-bold">✔</span> Average Metabolic Score increased from 68 to 76.</li>
                  <li className="flex items-center gap-2"><span className="text-primary font-bold">✔</span> Total runs scored: 1,120 runs. 4 wickets lost to lapses.</li>
                  <li className="flex items-center gap-2"><span className="text-primary font-bold">✔</span> Connected wearable steps sync rate: 98.4%.</li>
                  <li className="flex items-center gap-2"><span className="text-primary font-bold">✔</span> Completed 3 team challenges in Gopalpur village circle.</li>
                </ul>
              </div>
            </div>
          )}

          {/* View: Health Trends (Visual SVG curves) */}
          {reportType === 'trends' && (
            <div className="bg-card rounded-[32px] p-6 md:p-8 border border-border/40 shadow-card flex flex-col gap-6">
              <h3 className="font-extrabold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                Glycemic Variability Trends
              </h3>
              
              <div className="h-48 w-full bg-secondary/15 rounded-2xl border border-border relative p-4 overflow-hidden flex items-end">
                <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 500 150" preserveAspectRatio="none">
                  {/* Glucose threshold borders */}
                  <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(239,68,68,0.2)" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(26,82,41,0.2)" strokeWidth="1.5" strokeDasharray="3 3" />
                  
                  {/* Curvy trend line */}
                  <path 
                    d="M 0 100 Q 80 120, 150 90 T 300 70 T 450 60 T 500 65" 
                    fill="none" 
                    stroke="var(--primary)" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute top-2 right-4 text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  Hyperglycemia risk (&gt; 140 mg/dL)
                </div>
                <div className="absolute bottom-2 left-4 text-[9px] font-bold text-muted-foreground">Start of Month</div>
                <div className="absolute bottom-2 right-4 text-[9px] font-bold text-muted-foreground">End of Month</div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column (4/12 width) - PDF Details / Compliance */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Clinical oversight verification */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-base mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Clinical Sign-off
            </h3>
            
            <div className="flex items-center gap-3 bg-secondary/30 rounded-2xl p-4 border border-border/30 mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary text-primary flex items-center justify-center font-bold text-sm shrink-0">
                🩺
              </div>
              <div>
                <h4 className="font-extrabold text-xs">Dr. Suresh Kumar</h4>
                <p className="text-[9px] text-muted-foreground font-semibold">Chief Medical Officer, VivoQuest</p>
              </div>
            </div>
            
            <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
              All compiled metrics comply with the clinical guidelines set by the Indian Council of Medical Research (ICMR) for diabetic triage.
            </p>
          </div>

          {/* Privacy footer info */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-base mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Data Encryption Status
            </h3>
            <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
              Your telemetry logs are protected under strict Role-Based Access Control (RBAC). No third party, employer, or clinical operator can read your records without your digital OTP consent token.
            </p>
            <div className="w-full h-px bg-border/60 my-4" />
            <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              🛡️ ABHA Sandbox v2 Certified
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
