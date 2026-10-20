'use client';

import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { 
  Settings, 
  Globe, 
  Bell, 
  Lock, 
  Activity, 
  Check, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const [selectedSport, setSelectedSport] = useState('sports-live');
  const [notifs, setNotifs] = useState({
    push: true,
    email: false,
    whatsapp: true,
    ivr: false
  });
  
  const [language, setLanguage] = useState('en');

  const toggleNotif = (key: keyof typeof notifs) => {
    setNotifs({ ...notifs, [key]: !notifs[key] });
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            App Settings
          </h1>
          <p className="text-muted-foreground font-medium text-sm mt-1">
            Configure your active gamification sports rules, notifications, and language.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* Left Column (8/12 width) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Active Sport Picker */}
          <div className="bg-card rounded-[32px] p-6 md:p-8 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-lg mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Active Sport Configuration
            </h3>
            <p className="text-xs text-muted-foreground font-medium mb-6">
              Your daily habit targets score runs, wickets, and boundaries. Adjusting your active sport picker updates your score vocabulary.
            </p>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setSelectedSport('sports-live')}
                className={`p-5 rounded-2xl border-2 text-left flex justify-between items-center transition-all ${
                  selectedSport === 'sports-live' 
                    ? 'border-primary bg-secondary/40 text-primary font-bold' 
                    : 'border-border bg-background text-foreground'
                }`}
              >
                <div>
                  <h4 className="font-extrabold text-sm">Sports Live (Cricket Rules)</h4>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                    Uses Runs, Boundaries, Wickets, Overs, and innings targets.
                  </p>
                </div>
                {selectedSport === 'sports-live' && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </button>

              <button 
                disabled
                className="p-5 rounded-2xl border-2 border-dashed border-border bg-background text-foreground opacity-50 cursor-not-allowed text-left flex justify-between items-center"
              >
                <div>
                  <h4 className="font-bold text-sm">Basketball (Locked - Q4 2026)</h4>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                    Will use Baskets, Dunks, Turnovers, and Quarter targets.
                  </p>
                </div>
                <span className="text-[9px] bg-border font-bold text-muted-foreground py-1 px-2.5 rounded-full uppercase">Locked</span>
              </button>
            </div>
          </div>

          {/* Notifications config */}
          <div className="bg-card rounded-[32px] p-6 md:p-8 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-lg mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
              Communication Preferences
            </h3>
            
            <div className="flex flex-col gap-4">
              {[
                { key: 'push', label: 'Push Notifications', desc: 'Realtime alerts for family Cheers and biometrics sync' },
                { key: 'email', label: 'Email Digest', desc: 'Weekly metabolic audit report delivery' },
                { key: 'whatsapp', label: 'WhatsApp Streaks Reminders', desc: 'Daily logs summary reminder via WhatsApp' },
                { key: 'ivr', label: 'ASHA IVR Voice logs feedback', desc: 'Sms / automated call alerts for parental missed-calls logging' },
              ].map(item => {
                const isActive = notifs[item.key as keyof typeof notifs];
                return (
                  <div key={item.key} className="flex justify-between items-center p-4 bg-background rounded-2xl border border-border/40">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{item.label}</h4>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => toggleNotif(item.key as any)}
                      className={`w-12 h-6.5 rounded-full transition-all relative p-1 shrink-0 ${
                        isActive ? 'bg-primary' : 'bg-border'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform shadow-sm ${
                        isActive ? 'translate-x-5.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column (4/12 width) - App version & Sandbox info */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* General info */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-base mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Compliance Standards
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
              VivoQuest website is compiled matching clinical data criteria. Multi-account family circles sync logs via Logical Replication with zero conflict risks.
            </p>
            <div className="w-full h-px bg-border/60 my-4" />
            <div className="flex flex-col gap-2 font-bold text-[10px] text-primary tracking-wider uppercase">
              <span>🇮🇳 Data residency: ap-south-1 (Mumbai)</span>
              <span>🔒 Encrypted transit TLS 1.3</span>
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
