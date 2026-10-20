'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import TickGauge from '../../components/TickGauge';
import MiniRing from '../../components/MiniRing';
import { 
  Bot, 
  ChevronRight, 
  Check, 
  Sparkles, 
  Flame, 
  Bell, 
  Trophy, 
  X,
  Target,
  TrendingUp,
  Activity,
  Users,
  Award,
  Heart
} from 'lucide-react';
import Link from 'next/link';

interface Habit {
  id: number;
  label: string;
  icon: string;
  val: string;
  logged: boolean;
  score: number;
}

export default function DashboardPage() {
  const [streak, setStreak] = useState(18);
  const [score, setScore] = useState(78);
  const [runs, setRuns] = useState(42);
  const [targetRuns] = useState(60);
  const [wickets, setWickets] = useState(4);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  // Personalization states
  const [persona, setPersona] = useState('ADULT');
  const [sport, setSport] = useState('CRICKET');
  const [communityType, setCommunityType] = useState('CORPORATE');
  const [userName, setUserName] = useState('Namrata');
  const [aiInsight, setAiInsight] = useState('Consistency is the key to metabolic fitness!');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [dbLeaderboards, setDbLeaderboards] = useState<any[]>([]);
  
  // Subscription & notification states
  const [subscription, setSubscription] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Interactive Meal modal state
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealPlate, setMealPlate] = useState({
    grains: true,
    vegetables: true,
    protein: false,
    dairy: false,
    fats: false,
  });

  const [habits, setHabits] = useState<Habit[]>([
    { id: 1, label: 'Meals', icon: '🍽️', val: '1 Logged', logged: true, score: 12 },
    { id: 2, label: 'Sleep', icon: '😴', val: '7.2 hr', logged: true, score: 10 },
    { id: 3, label: 'Steps', icon: '👟', val: '8,400', logged: true, score: 10 },
    { id: 4, label: 'Water', icon: '💧', val: '1.2 L', logged: false, score: 5 },
    { id: 5, label: 'Meds', icon: '💊', val: 'Pending', logged: false, score: 5 },
  ]);

  // Load personalization config on mount & on update
  useEffect(() => {
    const loadPersonalization = () => {
      const storedPersona = localStorage.getItem('vivo_persona') || 'ADULT';
      const storedSport = localStorage.getItem('vivo_sport') || 'CRICKET';
      const storedCommunity = localStorage.getItem('vivo_community_type') || 'CORPORATE';
      const storedInsight = localStorage.getItem('vivo_ai_insight') || 'Consistency is the key to metabolic fitness!';
      
      setPersona(storedPersona);
      setSport(storedSport);
      setCommunityType(storedCommunity);
      setAiInsight(storedInsight);

      // Load active challenges
      const storedChallenges = localStorage.getItem('vivo_challenges');
      if (storedChallenges) {
        try {
          setChallenges(JSON.parse(storedChallenges));
        } catch (e) {
          console.error('Error parsing challenges', e);
        }
      }

      // Load username from localStorage
      const storedName = localStorage.getItem('vivo_name') || 'Player';
      setUserName(storedName);
    };

    loadPersonalization();
    window.addEventListener('personalization_loaded', loadPersonalization);
    return () => {
      window.removeEventListener('personalization_loaded', loadPersonalization);
    };
  }, []);

  // Fetch subscription status & notifications
  useEffect(() => {
    const fetchSubscription = async () => {
      const token = localStorage.getItem('vivo_token');
      if (!token) return;
      try {
        const res = await fetch('http://127.0.0.1:3001/api/billing/status/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSubscription(data);
        }
      } catch (err) {
        console.error('Failed to fetch subscription status on dashboard:', err);
      }
    };
    
    const fetchNotifications = async () => {
      const token = localStorage.getItem('vivo_token');
      if (!token) return;
      try {
        const res = await fetch('http://127.0.0.1:3001/api/billing/notifications/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
          setUnreadNotifs(data.some((n: any) => !n.is_read));
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchSubscription();
    fetchNotifications();
  }, []);

  const markNotificationsRead = async () => {
    const token = localStorage.getItem('vivo_token');
    if (!token) return;
    try {
      await fetch('http://127.0.0.1:3001/api/billing/notifications/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUnreadNotifs(false);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const toggleNotifications = () => {
    const nextShow = !showNotifDropdown;
    setShowNotifDropdown(nextShow);
    if (nextShow) {
      markNotificationsRead();
    }
  };

  // Fetch community rankings matching context
  useEffect(() => {
    const token = localStorage.getItem('vivo_token');
    if (!token) return;

    fetch(`http://127.0.0.1:3001/api/community/leaderboard/?type=${communityType}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setDbLeaderboards(data);
      }
    })
    .catch(err => {
      console.error('Failed to load community leaderboard', err);
    });
  }, [communityType]);

  // Custom Sports Terminology Mapping
  const getSportTerm = (term: 'runs' | 'boundaries' | 'wickets' | 'innings' | 'runs_chased' | 'active_today') => {
    if (sport === 'BASKETBALL') {
      switch (term) {
        case 'runs': return 'Points';
        case 'boundaries': return 'Dunks';
        case 'wickets': return 'Turnovers';
        case 'innings': return 'Quarter';
        case 'runs_chased': return 'Points Scored';
        case 'active_today': return 'TODAY\'S MATCH';
      }
    } else if (sport === 'F1') {
      switch (term) {
        case 'runs': return 'Laps';
        case 'boundaries': return 'Podiums';
        case 'wickets': return 'Pit Stops';
        case 'innings': return 'Stint';
        case 'runs_chased': return 'Laps Completed';
        case 'active_today': return 'GRAND PRIX';
      }
    } else {
      // Default: CRICKET
      switch (term) {
        case 'runs': return 'Runs';
        case 'boundaries': return 'Boundaries';
        case 'wickets': return 'Wickets';
        case 'innings': return 'Innings';
        case 'runs_chased': return 'Runs Chased';
        case 'active_today': return 'TODAY\'S INNINGS';
      }
    }
  };

  // Custom Greeting per Age Group / Persona
  const getPersonalizedGreeting = () => {
    if (persona === 'TEEN') return `Hey, ${userName.split(' ')[0]}! ⚡`;
    if (persona === 'ELDER') return `Namaste, ${userName.split(' ')[0]}-ji 🙏`;
    if (persona === 'ATHLETE') return `Welcome back, Champ ${userName.split(' ')[0]}! 🏆`;
    return `Hello, ${userName.split(' ')[0]}`;
  };

  // Dynamic Subtitle per Persona
  const getPersonalizedSubtitle = () => {
    if (persona === 'TEEN') return 'Log your screen time balance tips & school challenges to stay ahead.';
    if (persona === 'ELDER') return 'Track your longevity exercises, medication safety logs, and family alerts.';
    if (persona === 'ATHLETE') return 'CGM Sync active • Recovery telemetry and sports nutrition targets configured.';
    return 'Day 23 of 90 Journey • Productivity & stress analytics active.';
  };

  const toggleHabit = (id: number) => {
    if (id === 1) {
      setShowMealModal(true);
      return;
    }
    setHabits(habits.map(h => {
      if (h.id === id) {
        const nextLogged = !h.logged;
        if (nextLogged) {
          setRuns(prev => Math.min(prev + h.score, targetRuns));
          setScore(prev => Math.min(prev + 3, 100));
        } else {
          setRuns(prev => Math.max(prev - h.score, 0));
          setScore(prev => Math.max(prev - 3, 0));
        }
        return { 
          ...h, 
          logged: nextLogged,
          val: nextLogged ? 'Logged' : 'Pending'
        };
      }
      return h;
    }));
  };

  const handleLogMeal = () => {
    let mealScore = 0;
    if (mealPlate.grains) mealScore += 3;
    if (mealPlate.vegetables) mealScore += 4;
    if (mealPlate.protein) mealScore += 3;
    if (mealPlate.dairy) mealScore += 1;
    if (mealPlate.fats) mealScore += 1;

    setRuns(prev => Math.min(prev + mealScore, targetRuns));
    setScore(prev => Math.min(prev + 4, 100));

    setHabits(habits.map(h => {
      if (h.id === 1) {
        return {
          ...h,
          logged: true,
          val: `${mealScore} ${getSportTerm('runs')}`
        };
      }
      return h;
    }));

    setShowMealModal(false);
  };

  const weeklyData = [
    { day: 'M', score: 65 }, 
    { day: 'T', score: 72 }, 
    { day: 'W', score: 85 },
    { day: 'T', score: 60 }, 
    { day: 'F', score: 90 }, 
    { day: 'S', score: 40 }, 
    { day: 'S', score: 78 }
  ];

  // Default rankings fallback if DB is empty
  const defaultRankings = {
    CORPORATE: [
      { rank: 1, name: 'Adani Power Ops', runs: 1200, delta: '+120' },
      { rank: 2, name: 'Tata Steel Strikers', runs: 1140, delta: '+95' },
      { rank: 3, name: 'Infosys Health squad', runs: 980, delta: '+40' },
      { rank: 4, name: 'Reliance Life (You)', runs: 950, delta: '+110', highlight: true },
    ],
    VILLAGE: [
      { rank: 1, name: 'Anandgram Warriors', runs: 340, delta: '+45' },
      { rank: 2, name: 'Pipli Challengers', runs: 310, delta: '+30' },
      { rank: 3, name: 'Gopalpur Titans (You)', runs: 298, delta: '+42', highlight: true },
      { rank: 4, name: 'Balarampur Kings', runs: 280, delta: '+12' },
    ],
    SCHOOL: [
      { rank: 1, name: 'DPS RK Puram Class 9A', runs: 650, delta: '+45' },
      { rank: 2, name: 'DAV Public School Roster', runs: 590, delta: '+60' },
      { rank: 3, name: 'Don Bosco Strikers', runs: 510, delta: '+20' },
      { rank: 4, name: 'Kendriya Vidyalaya (You)', runs: 480, delta: '+35', highlight: true },
    ],
    FAMILY: [
      { rank: 1, name: 'Kiran Sharma (Maa)', runs: 260, delta: '+40' },
      { rank: 2, name: `${userName} (You)`, runs: 220, delta: '+70', highlight: true },
      { rank: 3, name: 'Devendra Sharma (Papa)', runs: 180, delta: '+12' },
      { rank: 4, name: 'Rohan Sharma (Brother)', runs: 110, delta: '+0' },
    ]
  };

  const getRankings = () => {
    if (dbLeaderboards.length > 0) return dbLeaderboards;
    return defaultRankings[communityType as keyof typeof defaultRankings] || defaultRankings.CORPORATE;
  };

  return (
    <AppLayout>
      {/* Premium Plan Banner */}
      {subscription && subscription.plan !== 'FREE' && (
        <div className="bg-primary/10 border border-primary/25 rounded-2xl p-4 flex items-center justify-between text-xs font-semibold text-primary mb-6 animate-scale-up select-none">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary animate-pulse" />
            <span>Active Subscription: <strong>{subscription.plan === 'PRO' ? 'Pro Player' : 'Enterprise Team'} Plan</strong>. You have <strong>{subscription.remainingDays} days remaining</strong>.</span>
          </div>
          <Link href="/profile" className="text-primary-dark font-black underline hover:opacity-80 transition-opacity">
            Manage Plan
          </Link>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            {getPersonalizedGreeting()}
          </h1>
          <p className="text-muted-foreground font-medium text-sm mt-1">
            {getPersonalizedSubtitle()}
          </p>
        </div>
        <div className="flex items-center gap-3 relative">
          <div className="flex items-center gap-1.5 bg-secondary text-primary font-bold px-4 py-2 rounded-2xl shadow-sm border border-primary/10 select-none">
            <Flame className="text-orange-500 fill-orange-500" size={18} />
            <span>{streak} Match Streak</span>
          </div>
          <button 
            onClick={toggleNotifications}
            className="w-11 h-11 rounded-2xl bg-card border border-border flex items-center justify-center text-primary hover:bg-secondary/40 shadow-sm relative transition-all active:scale-95"
          >
            <Bell size={20} />
            {unreadNotifs && (
              <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-accent rounded-full border-2 border-card" />
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 top-14 w-80 bg-card border border-border rounded-2xl shadow-xl p-4 z-50 flex flex-col gap-3 animate-scale-up select-none">
              <div className="flex justify-between items-center border-b border-border/40 pb-2">
                <span className="text-xs font-black uppercase text-primary tracking-wider">Notifications</span>
                <button 
                  type="button"
                  onClick={() => setShowNotifDropdown(false)}
                  className="text-muted-foreground hover:text-foreground text-[10px] font-bold"
                >
                  Close
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto scrollbar-hide">
                {notifications.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground font-bold text-center py-4">No notifications yet.</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-3 bg-secondary/15 rounded-xl border border-border/20 text-left flex flex-col gap-1">
                      <span className="text-[10px] font-black text-primary-dark">{n.title}</span>
                      <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">{n.message}</p>
                      <span className="text-[8px] text-muted-foreground/60 text-right mt-1">{n.created_at}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* Left Columns */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Headline Scoreboard Hero Card */}
          <div className="bg-gradient-to-br from-primary-dark via-primary to-accent rounded-[32px] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full opacity-[0.03] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-white rounded-full opacity-[0.02] translate-y-1/4 -translate-x-1/4 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 z-10 relative mb-8">
              <div>
                <span className="text-[10px] bg-card-lime text-primary-dark font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  {getSportTerm('active_today')} • LIVE
                </span>
                <h2 className="mt-3 text-card-lime font-black text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
                  {getSportTerm('innings')} vs Yesterday
                </h2>
                <p className="opacity-80 text-sm font-medium mt-1">
                  Keep hitting daily {getSportTerm('boundaries').toLowerCase()} to preserve your {getSportTerm('wickets').toLowerCase()} and levels.
                </p>
              </div>
              <button 
                onClick={() => setShowMealModal(true)}
                className="bg-card-lime text-primary-dark hover:bg-white px-5 py-3 rounded-2xl active:scale-95 transition-all shadow-lg font-bold text-sm shrink-0"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Log {persona === 'ATHLETE' ? 'Sports Fuel' : 'Metabolic Plate'}
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-10 z-10 relative">
              <div className="w-48 shrink-0 flex justify-center">
                <TickGauge score={score} label="Metabolic Score" />
              </div>
              
              <div className="w-full flex-1 flex flex-col gap-4">
                <div className="flex justify-between items-center text-sm font-bold opacity-90 px-1">
                  <span>Match {getSportTerm('runs')}: {runs} / {targetRuns} Target</span>
                  <span className="text-card-lime">{wickets} {getSportTerm('wickets')} Remaining</span>
                </div>
                <div className="w-full h-4 bg-black/20 rounded-full relative overflow-hidden p-0.5 border border-white/5 shadow-inner">
                  <div 
                    className="h-full bg-card-lime rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(runs / targetRuns) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 bg-black/20 rounded-2xl p-4 border border-white/10 text-center gap-2 mt-2">
                  <div>
                    <div className="text-xl md:text-2xl font-black" style={{ fontFamily: 'var(--font-heading)' }}>420</div>
                    <div className="opacity-70 text-[10px] uppercase font-bold tracking-wider mt-0.5">Calories Active</div>
                  </div>
                  <div className="w-px h-8 bg-white/20 self-center mx-auto" />
                  <div>
                    <div className="text-xl md:text-2xl font-black text-card-lime" style={{ fontFamily: 'var(--font-heading)' }}>+{runs}</div>
                    <div className="opacity-70 text-[10px] uppercase font-bold tracking-wider mt-0.5">{getSportTerm('runs_chased')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Innings Daily logs */}
          <div>
            <h3 className="text-xl font-bold mb-5 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
              {getSportTerm('innings')} Log Book <span className="text-xs text-muted-foreground font-semibold">({habits.filter(h => h.logged).length} of {habits.length} logged)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {habits.map(h => (
                <button
                  key={h.id}
                  onClick={() => toggleHabit(h.id)}
                  className={`p-5 rounded-[24px] border border-border/80 flex flex-col items-center justify-center text-center relative transition-all group hover:shadow-md ${
                    h.logged 
                      ? 'bg-secondary border-primary/40 text-primary font-bold' 
                      : 'bg-card border-border hover:border-primary/20 text-foreground'
                  }`}
                >
                  <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">{h.icon}</span>
                  <span className="text-sm font-bold leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>{h.label}</span>
                  <span className={`text-[10px] mt-1 font-medium ${h.logged ? 'text-primary' : 'text-muted-foreground'}`}>{h.val}</span>
                  
                  {h.logged && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white shadow-sm">
                      <Check size={11} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Active Challenges board */}
          <div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                Active Challenges
              </h3>
              <Link href="/journey" className="text-primary hover:text-accent font-bold text-sm flex items-center gap-1">
                View Championship Path <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {challenges.length > 0 ? (
                challenges.map((c, i) => (
                  <div key={i} className="bg-card rounded-[24px] p-6 border border-border/50 shadow-card hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] bg-secondary text-primary font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {c.type || 'STREAK'}
                        </span>
                        <span className="text-xs text-muted-foreground font-semibold">Active challenge</span>
                      </div>
                      <h4 className="font-extrabold text-base mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                        {c.title}
                      </h4>
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed mb-4">
                        Target: {c.target}. Earns +{c.runs} runs in your league scoreboard!
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-xs font-bold text-foreground mb-1.5 px-0.5">
                        <span>Progress Tracker</span>
                        <span className="text-primary">In Progress</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: '45%' }} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 bg-card border border-dashed border-border rounded-3xl text-muted-foreground font-bold">
                  No active challenges found for your personalization profile.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Sticky Column */}
        <div className="lg:col-span-4 flex flex-col gap-8 lg:sticky lg:top-8 z-10">
          
          {/* Sticky AI Insight Panel */}
          <div className="bg-card-lime rounded-[24px] p-6 flex flex-col gap-4 shadow-sm border border-primary/10 select-none">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-primary-dark rounded-full flex items-center justify-center shrink-0 shadow-md">
                <Bot size={22} className="text-card-lime" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-primary-dark uppercase tracking-wide">
                  {persona === 'TEEN' ? 'Youth AI Coach' : 'Athletic AI Coach'}
                </h3>
                <span className="text-[10px] bg-primary/15 text-primary font-bold px-2 py-0.5 rounded-full inline-block mt-0.5">Clinically attributions verified</span>
              </div>
            </div>
            <p className="italic leading-relaxed text-primary-dark text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
              "{aiInsight}"
            </p>
            <Link 
              href="/vivoai" 
              className="mt-2 text-xs font-black text-primary-dark hover:opacity-80 transition-opacity flex items-center gap-1 w-fit"
            >
              Consult VivoAI Coach <ChevronRight size={14} />
            </Link>
          </div>

          {/* Weekly SVG Chart */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-base" style={{ fontFamily: 'var(--font-heading)' }}>
                Weekly Progress
              </h3>
              <span className="text-xs text-muted-foreground font-semibold">Average: 70</span>
            </div>
            
            <div className="flex items-end justify-between h-40 relative px-2">
              {weeklyData.map((data, idx) => {
                const isSelected = selectedDay === idx;
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 relative w-full px-1">
                    <button
                      onClick={() => setSelectedDay(idx === selectedDay ? null : idx)}
                      className={`w-full max-w-[30px] rounded-t-lg transition-all ${
                        isSelected ? 'bg-card-lime scale-105' : 'bg-secondary hover:bg-secondary/70'
                      }`}
                      style={{
                        height: `${data.score}%`,
                        minHeight: '15%'
                      }}
                    />
                    <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                      {data.day}
                    </span>
                    {isSelected && (
                      <div className="absolute -top-10 bg-primary-dark text-white px-2 py-1 rounded-md text-[10px] font-bold z-10 whitespace-nowrap">
                        {data.score} Pts
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Squad Ranks / Leaderboard and Community Custom Panels */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card flex flex-col gap-6">
            <div>
              <h3 className="font-extrabold text-base mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                <Trophy size={18} className="text-accent" />
                {communityType === 'CORPORATE' && 'Corporate League'}
                {communityType === 'VILLAGE' && 'Village League'}
                {communityType === 'SCHOOL' && 'School Sports League'}
                {communityType === 'FAMILY' && 'Private Family Circle'}
              </h3>
              
              <div className="flex flex-col gap-3">
                {getRankings().map((v: any, index: number) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-2xl border ${
                      v.highlight 
                        ? 'bg-secondary/50 border-primary/30 text-primary font-bold' 
                        : 'bg-background border-border/40 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-black text-sm w-5">{v.rank || index + 1}</span>
                      <span className="text-xs font-bold leading-tight truncate max-w-[120px]">{v.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-right shrink-0">
                      <span className="text-xs font-black">{v.runs} {getSportTerm('runs').charAt(0)}</span>
                      <span className="text-[10px] font-bold text-accent">{v.delta || '+25'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full h-px bg-border/60" />

            {/* Custom Community Layer Panel */}
            <div>
              {communityType === 'CORPORATE' && (
                <div>
                  <h4 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Activity size={14} /> Department Analytics
                  </h4>
                  <div className="flex flex-col gap-2">
                    {[
                      { name: 'Engineering Strikers', rate: '92% Active', score: '310 R' },
                      { name: 'Sales Pacers', rate: '84% Active', score: '240 R' },
                      { name: 'Marketing (You)', rate: '95% Active', score: '298 R' },
                    ].map((dept, i) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-background text-xs font-bold text-foreground">
                        <span>{dept.name}</span>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">{dept.rate}</span>
                          <span className="text-primary">{dept.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {communityType === 'VILLAGE' && (
                <div>
                  <h4 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Users size={14} /> ASHA Rural Programs
                  </h4>
                  <div className="flex flex-col gap-2">
                    {[
                      { name: 'Village Walkathon Aggregate', value: '62,800 / 100k Steps', pct: '62.8%' },
                      { name: 'Maternal Nutrition Logging', value: '18 / 20 Registered', pct: '90%' },
                      { name: 'ASHA Immunization Outreach', value: '4 Campaigns Done', pct: '100%' },
                    ].map((prog, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-background text-xs border border-border/30">
                        <div className="flex justify-between font-bold text-foreground mb-1">
                          <span>{prog.name}</span>
                          <span className="text-primary">{prog.pct}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold">{prog.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {communityType === 'SCHOOL' && (
                <div>
                  <h4 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Award size={14} /> Classroom Streaks
                  </h4>
                  <div className="flex flex-col gap-2">
                    {[
                      { name: 'Class 9A (Strikers)', streak: '24 Days', rank: '#1' },
                      { name: 'Class 10B (Pacers)', streak: '18 Days', rank: '#2' },
                      { name: 'Class 9C (Your class)', streak: '15 Days', rank: '#3' },
                    ].map((cls, i) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-background text-xs font-bold text-foreground">
                        <span>{cls.name}</span>
                        <span className="text-primary">{cls.streak} streak ({cls.rank})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {communityType === 'FAMILY' && (
                <div>
                  <h4 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Heart size={14} /> Family Monitoring
                  </h4>
                  <div className="flex flex-col gap-2">
                    {[
                      { name: 'Kiran Sharma (Maa)', status: 'Active steps logged today' },
                      { name: 'Devendra Sharma (Papa)', status: 'Medication logged 💊' },
                      { name: 'Rohan (Brother)', status: 'Streak pending today' },
                    ].map((f, i) => (
                      <div key={i} className="p-2 rounded-xl bg-background text-xs border border-border/20 flex flex-col">
                        <span className="font-bold text-foreground">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground font-medium mt-0.5">{f.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Meal Log Modal Overlay */}
      {showMealModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center select-none">
          <div className="bg-card w-full max-w-xl rounded-t-[32px] border-t border-border overflow-hidden shadow-2xl transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-border/40 flex justify-between items-center bg-background">
              <div>
                <h3 className="font-extrabold text-lg text-primary-dark" style={{ fontFamily: 'var(--font-heading)' }}>
                  Log {persona === 'ATHLETE' ? 'Sports Fuel' : 'Lunch Plate'}
                </h3>
                <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                  Tap to add meal segments. A balanced plate scores a bonus!
                </p>
              </div>
              <button 
                onClick={() => setShowMealModal(false)}
                className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors shadow-sm"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col md:flex-row items-center gap-8 justify-center">
              
              {/* Donut representation of plate */}
              <div className="w-44 h-44 shrink-0 flex items-center justify-center relative bg-secondary/20 rounded-full border border-border/40">
                <MiniRing pct={
                  (mealPlate.grains ? 25 : 0) + 
                  (mealPlate.vegetables ? 30 : 0) + 
                  (mealPlate.protein ? 20 : 0) + 
                  (mealPlate.dairy ? 15 : 0) + 
                  (mealPlate.fats ? 10 : 0)
                } size={150} color="var(--primary)" trackColor="var(--secondary)" strokeWidth={16}>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs font-black uppercase text-muted-foreground">Log Bonus</span>
                    <span className="text-xl font-black text-primary">
                      +{
                        (mealPlate.grains ? 3 : 0) + 
                        (mealPlate.vegetables ? 4 : 0) + 
                        (mealPlate.protein ? 3 : 0) + 
                        (mealPlate.dairy ? 1 : 0) + 
                        (mealPlate.fats ? 1 : 0)
                      } R
                    </span>
                  </div>
                </MiniRing>
              </div>

              {/* Toggles */}
              <div className="w-full flex-1 flex flex-col gap-3.5">
                {[
                  { key: 'grains', label: 'Grains (25%)', sub: 'Roti, Rice, Millet', score: `+3 ${getSportTerm('runs')}`, activeColor: 'bg-primary' },
                  { key: 'vegetables', label: 'Vegetables (30%)', sub: 'Salad, Sabzi', score: `+4 ${getSportTerm('runs')}`, activeColor: 'bg-emerald-600' },
                  { key: 'protein', label: 'Proteins (20%)', sub: 'Dal, Paneer, Sprouts', score: `+3 ${getSportTerm('runs')}`, activeColor: 'bg-amber-600' },
                  { key: 'dairy', label: 'Dairy (15%)', sub: 'Curd, Chaas, Milk', score: `+1 ${getSportTerm('runs')}`, activeColor: 'bg-indigo-600' },
                  { key: 'fats', label: 'Good Fats (10%)', sub: 'Ghee, Nuts, Seeds', score: `+1 ${getSportTerm('runs')}`, activeColor: 'bg-rose-600' },
                ].map(segment => {
                  const isChecked = mealPlate[segment.key as keyof typeof mealPlate];
                  return (
                    <button
                      key={segment.key}
                      onClick={() => setMealPlate({
                        ...mealPlate,
                        [segment.key]: !isChecked
                      })}
                      className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isChecked 
                          ? 'bg-secondary border-primary/30 text-primary font-bold' 
                          : 'bg-background border-border/40 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3.5 h-3.5 rounded-full ${isChecked ? segment.activeColor : 'bg-muted-foreground/35'}`} />
                        <div>
                          <h5 className="text-xs font-bold leading-tight">{segment.label}</h5>
                          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{segment.sub}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-primary shrink-0">{segment.score}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                          isChecked 
                            ? 'bg-primary border-primary text-white' 
                            : 'border-border'
                        }`}>
                          {isChecked && <Check size={11} strokeWidth={4} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Modal Action CTA */}
            <div className="p-6 bg-background border-t border-border/40 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setShowMealModal(false)}
                className="py-3 px-6 rounded-xl border-2 border-border text-muted-foreground hover:text-foreground font-bold text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogMeal}
                className="py-3 px-8 rounded-xl bg-primary text-white hover:bg-accent font-bold text-xs shadow-lg"
              >
                Log Meal & Score
              </button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
