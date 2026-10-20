'use client';

import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { 
  Users, 
  Trophy, 
  Medal, 
  Share2, 
  ChevronRight, 
  Check, 
  Calendar,
  Sparkles,
  Award
} from 'lucide-react';

interface LeagueTeam {
  rank: number;
  name: string;
  members: number;
  runs: number;
  delta: string;
  isUserTeam?: boolean;
}

export default function CommunityPage() {
  const [activeLeague, setActiveLeague] = useState<'village' | 'school' | 'corporate' | 'family'>('village');
  
  // Rankings state
  const villageTeams: LeagueTeam[] = [
    { rank: 1, name: 'Anandgram Warriors', members: 42, runs: 1240, delta: '🔥 +140 today' },
    { rank: 2, name: 'Pipli Challengers', members: 38, runs: 1120, delta: '👍 +85 today' },
    { rank: 3, name: 'Gopalpur Titans (You)', members: 40, runs: 1085, delta: '⚡ +120 today', isUserTeam: true },
    { rank: 4, name: 'Balarampur Kings', members: 35, runs: 940, delta: '+45 today' },
    { rank: 5, name: 'Ramgarh Strikers', members: 45, runs: 890, delta: '+10 today' },
  ];

  const schoolTeams: LeagueTeam[] = [
    { rank: 1, name: 'St. Xavier Class 10-A', members: 32, runs: 980, delta: '🔥 +110 today' },
    { rank: 2, name: 'DAV Public Section B', members: 28, runs: 890, delta: '+60 today' },
    { rank: 3, name: 'KV Cantt Blue Birds', members: 30, runs: 850, delta: '+40 today' },
  ];

  const corporateTeams: LeagueTeam[] = [
    { rank: 1, name: 'TCS Health Ninjas', members: 120, runs: 4320, delta: '🔥 +340 today' },
    { rank: 2, name: 'Infosys Pulse', members: 95, runs: 3980, delta: '+210 today' },
    { rank: 3, name: 'Wipro Active', members: 110, runs: 3760, delta: '+190 today' },
  ];

  const [cheeredMembers, setCheeredMembers] = useState<string[]>(['Maa']);

  const toggleCheerMember = (name: string) => {
    if (cheeredMembers.includes(name)) {
      setCheeredMembers(cheeredMembers.filter(item => item !== name));
    } else {
      setCheeredMembers([...cheeredMembers, name]);
    }
  };

  const getActiveTeams = () => {
    switch (activeLeague) {
      case 'village': return villageTeams;
      case 'school': return schoolTeams;
      case 'corporate': return corporateTeams;
      default: return [];
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Community Leagues
          </h1>
          <p className="text-muted-foreground font-medium text-sm mt-1">
            Compete, collaborate, and cheer. Your habits score runs for your team on active leaderboards.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto bg-card p-1.5 rounded-2xl border border-border shadow-sm scrollbar-hide max-w-2xl shrink-0">
        {[
          { key: 'village', label: 'Village Leagues', count: '42 Active' },
          { key: 'school', label: 'School Leagues', count: '80 Active' },
          { key: 'corporate', label: 'Corporate Leagues', count: '15 Active' },
          { key: 'family', label: 'Family Circles', count: ' Sharma Parivar' }
        ].map((tab) => {
          const isActive = activeLeague === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveLeague(tab.key as any)}
              className={`flex flex-col items-center px-5 py-2.5 text-xs font-bold rounded-xl transition-all ${
                isActive 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[9px] mt-0.5 font-bold ${isActive ? 'text-card-lime' : 'text-muted-foreground/80'}`}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* Left Column (8/12 width) - Rankings and Tournament Brackets */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Rankings Table */}
          {activeLeague !== 'family' ? (
            <div className="bg-card rounded-[32px] p-6 border border-border/40 shadow-card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-extrabold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                  Live Rankings Table
                </h3>
                <span className="text-xs text-muted-foreground font-bold">Round 3 Ends in 2d 14h</span>
              </div>

              <div className="flex flex-col gap-3">
                {getActiveTeams().map((t) => (
                  <div 
                    key={t.rank}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      t.isUserTeam 
                        ? 'bg-secondary/40 border-primary/30 text-primary font-bold shadow-sm' 
                        : 'bg-background border-border/30 hover:border-primary/20 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-black text-sm w-6 text-center">{t.rank}</span>
                      <div>
                        <h4 className="font-extrabold text-sm">{t.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                          {t.members} players active
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 text-right shrink-0">
                      <div>
                        <span className="text-sm font-black block">{t.runs} R</span>
                        <span className="text-[10px] font-bold text-accent">{t.delta}</span>
                      </div>
                      <button 
                        disabled={t.isUserTeam}
                        className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          t.isUserTeam 
                            ? 'bg-primary/10 text-primary/40' 
                            : 'bg-secondary text-primary hover:bg-primary hover:text-white'
                        }`}
                      >
                        {t.isUserTeam ? 'Your Team' : 'Cheer'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Family Circle display */
            <div className="bg-card rounded-[32px] p-6 border border-border/40 shadow-card">
              <h3 className="font-extrabold text-lg mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                Sharma Parivar Circle
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6 font-medium">
                Private family board. Connect immediate family members, track health scores collectively, and send missed-call IVR logging invites.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { name: 'Papa', runs: '48 Runs logged', streak: '12d Streak', role: 'IVR Log active' },
                  { name: 'Maa', runs: '56 Runs logged', streak: '21d Streak', role: 'CGM Connected' },
                  { name: 'Rohan (Brother)', runs: '22 Runs logged', streak: '3d Streak', role: 'Google Fit active' },
                ].map((member, idx) => {
                  const isCheered = cheeredMembers.includes(member.name);
                  return (
                    <div key={idx} className="bg-background rounded-2xl p-5 border border-border/40 text-center flex flex-col justify-between items-center gap-4">
                      <div>
                        <span className="w-10 h-10 rounded-full bg-secondary text-primary flex items-center justify-center font-bold text-sm mb-3">👤</span>
                        <h4 className="font-extrabold text-sm text-foreground">{member.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-1">{member.runs}</p>
                        <span className="text-[9px] text-primary bg-secondary px-2 py-0.5 rounded-full inline-block mt-2 font-bold">{member.streak}</span>
                      </div>
                      <button 
                        onClick={() => toggleCheerMember(member.name)}
                        className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          isCheered 
                            ? 'bg-primary text-white' 
                            : 'bg-secondary text-primary hover:bg-primary hover:text-white'
                        }`}
                      >
                        {isCheered ? 'Cheered!' : 'Cheer Member'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tournament brackets matching Cricket championship playoff format */}
          <div className="bg-card rounded-[32px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-lg mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
              Group Stage Playoff Bracket
            </h3>

            {/* Bracket columns layout */}
            <div className="flex flex-col md:flex-row items-center gap-8 justify-between relative">
              
              {/* Column 1: Quarter Finals */}
              <div className="flex flex-col gap-6 w-full md:w-1/3">
                <div className="text-[10px] text-muted-foreground font-black px-1 uppercase tracking-wider mb-1">Quarter Finals</div>
                <div className="bg-background border border-border/50 rounded-2xl p-3 flex flex-col gap-2 shadow-sm">
                  <div className="flex justify-between items-center text-xs font-bold text-primary">
                    <span>Anandgram Warriors</span>
                    <span>1,240 R</span>
                  </div>
                  <div className="w-full h-px bg-border/40" />
                  <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                    <span>Ramgarh Strikers</span>
                    <span>890 R</span>
                  </div>
                </div>

                <div className="bg-background border border-border/50 rounded-2xl p-3 flex flex-col gap-2 shadow-sm">
                  <div className="flex justify-between items-center text-xs font-bold text-primary">
                    <span>Gopalpur Titans</span>
                    <span>1,085 R</span>
                  </div>
                  <div className="w-full h-px bg-border/40" />
                  <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                    <span>Balarampur Kings</span>
                    <span>940 R</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Semi Finals */}
              <div className="flex flex-col gap-6 w-full md:w-1/3 relative">
                <div className="text-[10px] text-muted-foreground font-black px-1 uppercase tracking-wider mb-1">Semi Finals</div>
                <div className="bg-background border-2 border-primary/20 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
                  <div className="text-[8px] bg-secondary text-primary font-black py-0.5 px-2 rounded-full w-fit uppercase tracking-widest mb-1">Live Match</div>
                  <div className="flex justify-between items-center text-xs font-bold text-foreground">
                    <span>Anandgram Warriors</span>
                    <span className="text-primary font-black">---</span>
                  </div>
                  <div className="w-full h-px bg-border/40" />
                  <div className="flex justify-between items-center text-xs font-bold text-foreground">
                    <span>Gopalpur Titans (You)</span>
                    <span className="text-primary font-black">---</span>
                  </div>
                </div>
              </div>

              {/* Column 3: The Finals */}
              <div className="flex flex-col gap-6 w-full md:w-1/3 text-center items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-card-lime flex items-center justify-center text-primary-dark shadow-lg animate-bounce mb-2">
                  <Trophy size={22} />
                </div>
                <h5 className="font-extrabold text-sm text-foreground">Championship Final</h5>
                <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[120px] font-semibold mt-1">
                  Winner unlocks custom regional challenge privileges.
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column (4/12 width) - Stats teaser & rewards info */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Active Tournament details */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-base mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Tournament Overview
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-background rounded-2xl border border-border/30">
                <h4 className="font-extrabold text-xs text-primary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  🏆 Season 1 Championship
                </h4>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Top 8 villages progress from regional group stages into Knockouts starting on Day 30.
                </p>
              </div>

              <div className="flex flex-col gap-2 text-xs font-medium text-muted-foreground px-1">
                <div className="flex justify-between items-center">
                  <span>Your Village Adherence:</span>
                  <strong className="text-primary font-extrabold">87.5%</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average daily runs:</span>
                  <strong className="text-foreground font-extrabold">42 runs / member</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active streak players:</span>
                  <strong className="text-accent font-extrabold">12 members (flame on)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Special League Badges info */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-base mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              League Badges Unlocked
            </h3>
            
            <div className="flex flex-col gap-3">
              {[
                { name: 'Village Centurion', desc: 'Own team logged 100+ runs in a single innings match day', icon: '🏆' },
                { name: 'ASHA Honor Roll', desc: 'Onboarded 10 family members under one village profile', icon: '🏅' }
              ].map((badge, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-background border border-border/30 rounded-xl items-center">
                  <span className="text-2xl shrink-0">{badge.icon}</span>
                  <div>
                    <h5 className="text-xs font-extrabold text-foreground">{badge.name}</h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-relaxed">{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
