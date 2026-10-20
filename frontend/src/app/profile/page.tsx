'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../../components/AppLayout';
import { 
  CheckCircle, 
  MapPin, 
  Key,
  Users,
  User,
  Trophy,
  Activity,
  TrendingUp,
  CreditCard,
  Sparkles,
  X
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  initials: string;
  status: string;
  location: string;
  age: number;
  joined: string;
  level: number;
  xp: number;
  streak: number;
  runs: number;
  wickets: number;
  adherence: number;
  abhaAddress: string;
  abhaRecords: number;
  abhaLastQuery: string;
  goals: string[];
  weeklyScore: number[];
  weeklySteps: number[];
}

const baseNamrataProfile: UserProfile = {
  id: 'namrata',
  name: 'Namrata Sharma',
  initials: 'NS',
  status: 'Active Championship Player (You)',
  location: 'Gopalpur Village, India',
  age: 32,
  joined: 'May 2026',
  level: 4,
  xp: 1240,
  streak: 18,
  runs: 220,
  wickets: 12,
  adherence: 88.5,
  abhaAddress: 'namrata@abha.gov.in',
  abhaRecords: 3,
  abhaLastQuery: '2 days ago by Suresh Clinic',
  goals: [
    'Regulate prediabetic glucose spikes',
    'Hit 10,000 movement steps daily',
    'Stabilize evening sleep latency',
    'Boost vegetable plate donut count to 30%'
  ],
  weeklyScore: [65, 72, 85, 60, 90, 78, 88],
  weeklySteps: [8400, 9200, 10500, 7800, 11200, 9800, 10100]
};

const familyProfiles: UserProfile[] = [
  baseNamrataProfile,
  {
    id: 'papa',
    name: 'Papa (Devendra Sharma)',
    initials: 'DS',
    status: 'Senior League Inning Supporter',
    location: 'Gopalpur Village, India',
    age: 58,
    joined: 'June 2026',
    level: 3,
    xp: 850,
    streak: 12,
    runs: 180,
    wickets: 8,
    adherence: 92.1,
    abhaAddress: 'devendra@abha.gov.in',
    abhaRecords: 5,
    abhaLastQuery: '1 week ago by District Hospital',
    goals: [
      'Reduce post-dinner sedentary glycemic index',
      'Walk 6,000 steps daily (joint conservation)',
      'Complete herbal tea replacement for late chai',
      'Ensure standard water volume threshold'
    ],
    weeklyScore: [70, 78, 80, 85, 75, 92, 94],
    weeklySteps: [5200, 6100, 5800, 6400, 7000, 5900, 6500]
  },
  {
    id: 'maa',
    name: 'Maa (Kiran Sharma)',
    initials: 'KS',
    status: 'Consistency Champion',
    location: 'Gopalpur Village, India',
    age: 54,
    joined: 'May 2026',
    level: 5,
    xp: 1680,
    streak: 21,
    runs: 260,
    wickets: 4,
    adherence: 95.8,
    abhaAddress: 'kiran@abha.gov.in',
    abhaRecords: 2,
    abhaLastQuery: '3 days ago by Apollo Clinic',
    goals: [
      'Maintain stable baseline glucose below 105 mg/dL',
      'Track 8,000 movement steps daily in village ground',
      'Ensure dinner consumption before 7:30 PM',
      'Incorporate millet roti in afternoon plates'
    ],
    weeklyScore: [88, 90, 92, 85, 96, 94, 98],
    weeklySteps: [7800, 8200, 8900, 7600, 9100, 8400, 8800]
  },
  {
    id: 'rohan',
    name: 'Rohan Sharma',
    initials: 'RS',
    status: 'Wildcard Batter (Brother)',
    location: 'Gopalpur Village, India',
    age: 26,
    joined: 'May 2026',
    level: 2,
    xp: 540,
    streak: 3,
    runs: 110,
    wickets: 15,
    adherence: 72.4,
    abhaAddress: 'rohan@abha.gov.in',
    abhaRecords: 1,
    abhaLastQuery: '2 weeks ago by Fitness Center',
    goals: [
      'Incorporate muscle recovery protein in breakfast',
      'Chase 12,000 running steps daily',
      'Track morning HIIT cardio sessions',
      'Regulate late-night snack temptations'
    ],
    weeklyScore: [55, 62, 60, 58, 70, 65, 72],
    weeklySteps: [11000, 12500, 13000, 9500, 14000, 12200, 10500]
  }
];

const corporateProfiles: UserProfile[] = [
  baseNamrataProfile,
  {
    id: 'aravind',
    name: 'Aravind Rao',
    initials: 'AR',
    status: 'Product Manager (Goal Chaser)',
    location: 'Bangalore Office, India',
    age: 29,
    joined: 'June 2026',
    level: 3,
    xp: 910,
    streak: 15,
    runs: 195,
    wickets: 7,
    adherence: 90.2,
    abhaAddress: 'aravind@abha.gov.in',
    abhaRecords: 2,
    abhaLastQuery: 'Yesterday by Apollo Clinic',
    goals: [
      'Perform post-lunch stretching',
      'Hit 8,000 steps during calls',
      'Limit coffee intake to 2 cups',
      'Complete daily posture checklist'
    ],
    weeklyScore: [72, 75, 82, 88, 80, 84, 86],
    weeklySteps: [8100, 7800, 8500, 9000, 8200, 8800, 8400]
  },
  {
    id: 'priya',
    name: 'Priya Patel',
    initials: 'PP',
    status: 'Creative Lead (Hydration Star)',
    location: 'Mumbai Branch, India',
    age: 27,
    joined: 'May 2026',
    level: 4,
    xp: 1310,
    streak: 11,
    runs: 210,
    wickets: 9,
    adherence: 85.5,
    abhaAddress: 'priya@abha.gov.in',
    abhaRecords: 4,
    abhaLastQuery: '3 days ago by Max Healthcare',
    goals: [
      'Log meals before consumption',
      'Drink 3.5 liters water daily',
      'Complete weekly step target',
      'Stabilize deep sleep ratio'
    ],
    weeklyScore: [80, 82, 78, 85, 90, 88, 92],
    weeklySteps: [9500, 10200, 9800, 10500, 11000, 9200, 10100]
  },
  {
    id: 'vikram',
    name: 'Vikram Singh',
    initials: 'VS',
    status: 'Technical Lead (Consistency Lead)',
    location: 'Bangalore Office, India',
    age: 34,
    joined: 'May 2026',
    level: 5,
    xp: 1750,
    streak: 25,
    runs: 290,
    wickets: 5,
    adherence: 94.6,
    abhaAddress: 'vikram@abha.gov.in',
    abhaRecords: 6,
    abhaLastQuery: 'Last week by Medanta',
    goals: [
      'Avoid snacking during late deploys',
      'Walk 10,000 steps daily',
      'Maintain sleep hygiene window',
      'Choose low-carb dinner alternatives'
    ],
    weeklyScore: [88, 92, 90, 94, 91, 96, 95],
    weeklySteps: [10200, 11500, 10800, 12000, 11200, 10500, 11100]
  }
];

const villageProfiles: UserProfile[] = [
  baseNamrataProfile,
  {
    id: 'gram_sevak',
    name: 'Gram Sevak (Rajesh Kumar)',
    initials: 'RK',
    status: 'Rural Inning Sponsor',
    location: 'Gopalpur Village, India',
    age: 41,
    joined: 'June 2026',
    level: 3,
    xp: 720,
    streak: 8,
    runs: 140,
    wickets: 6,
    adherence: 89.4,
    abhaAddress: 'rajesh@abha.gov.in',
    abhaRecords: 3,
    abhaLastQuery: '2 weeks ago by CHC',
    goals: [
      'Organize village walkathons',
      'Log daily walking step count',
      'Calibrate afternoon calorie intake',
      'Coordinate ASHA wellness camps'
    ],
    weeklyScore: [68, 70, 75, 78, 82, 80, 83],
    weeklySteps: [7200, 6800, 8100, 7500, 7900, 8200, 8000]
  },
  {
    id: 'sarpanch',
    name: 'Sarpanch (Hargovind Singh)',
    initials: 'HS',
    status: 'Village Council Lead',
    location: 'Gopalpur Village, India',
    age: 62,
    joined: 'May 2026',
    level: 5,
    xp: 1850,
    streak: 30,
    runs: 320,
    wickets: 2,
    adherence: 97.2,
    abhaAddress: 'hargovind@abha.gov.in',
    abhaRecords: 5,
    abhaLastQuery: 'Yesterday by District Hospital',
    goals: [
      'Walk 7,000 steps before panchayat',
      'Ensure proper hydration levels',
      'Limit tea consumption to twice daily',
      'Monitor blood pressure weekly'
    ],
    weeklyScore: [90, 94, 92, 96, 95, 98, 97],
    weeklySteps: [8100, 7900, 8500, 8200, 9000, 8800, 8400]
  },
  {
    id: 'kiran_didi',
    name: 'Kiran Didi (ASHA Worker)',
    initials: 'KD',
    status: 'Village Health Facilitator',
    location: 'Gopalpur Village, India',
    age: 39,
    joined: 'May 2026',
    level: 4,
    xp: 1420,
    streak: 22,
    runs: 240,
    wickets: 3,
    adherence: 93.8,
    abhaAddress: 'kiran.didi@abha.gov.in',
    abhaRecords: 8,
    abhaLastQuery: '4 days ago by PHC Gopalpur',
    goals: [
      'Track daily steps during home visits',
      'Maintain metabolic baseline report',
      'Promote clean drinking water habits',
      'Encourage millet-based diet plans'
    ],
    weeklyScore: [85, 89, 90, 92, 88, 94, 95],
    weeklySteps: [9200, 10500, 9800, 11000, 10200, 9500, 10400]
  }
];

const schoolProfiles: UserProfile[] = [
  baseNamrataProfile,
  {
    id: 'coach_roy',
    name: 'Coach Roy (Subhash Roy)',
    initials: 'SR',
    status: 'Physical Education Mentor',
    location: 'Senior Secondary School, India',
    age: 45,
    joined: 'June 2026',
    level: 5,
    xp: 1920,
    streak: 45,
    runs: 410,
    wickets: 1,
    adherence: 98.4,
    abhaAddress: 'subhash.roy@abha.gov.in',
    abhaRecords: 7,
    abhaLastQuery: 'Last month by Sports Clinic',
    goals: [
      'Lead morning drill routines',
      'Hit 12,000 steps during sessions',
      'Instruct student hydration breaks',
      'Ensure low-sodium diet profiles'
    ],
    weeklyScore: [94, 96, 95, 98, 97, 99, 98],
    weeklySteps: [12100, 13400, 12500, 14000, 13200, 12800, 13500]
  },
  {
    id: 'ritu',
    name: 'Ritu Sen',
    initials: 'RS',
    status: 'School Captain (Topper)',
    location: 'Senior Secondary School, India',
    age: 17,
    joined: 'May 2026',
    level: 3,
    xp: 980,
    streak: 14,
    runs: 160,
    wickets: 10,
    adherence: 87.5,
    abhaAddress: 'ritu.sen@abha.gov.in',
    abhaRecords: 1,
    abhaLastQuery: '5 days ago by Child Care Hospital',
    goals: [
      'Complete active steps between lectures',
      'Manage study stress intervals',
      'Limit sweetened cafeteria drinks',
      'Track home exercise logs daily'
    ],
    weeklyScore: [75, 78, 84, 80, 85, 82, 88],
    weeklySteps: [7800, 8200, 8500, 7900, 9200, 8800, 9000]
  },
  {
    id: 'samar',
    name: 'Samar Pratap',
    initials: 'SP',
    status: 'Wildcard Pitcher',
    location: 'Senior Secondary School, India',
    age: 18,
    joined: 'May 2026',
    level: 4,
    xp: 1250,
    streak: 19,
    runs: 230,
    wickets: 8,
    adherence: 91.2,
    abhaAddress: 'samar.pratap@abha.gov.in',
    abhaRecords: 3,
    abhaLastQuery: '1 week ago by General Hospital',
    goals: [
      'Complete 10,000 daily cardio steps',
      'Log post-practice muscle recovery',
      'Calibrate afternoon carbs ratio',
      'Boost daily water logs count'
    ],
    weeklyScore: [80, 85, 82, 89, 90, 88, 93],
    weeklySteps: [10200, 11500, 10900, 12200, 11400, 10800, 11500]
  }
];

const getCommunityProfiles = (community: string): UserProfile[] => {
  switch (community) {
    case 'Private Family Circle':
      return familyProfiles;
    case 'Corporate Wellness League':
      return corporateProfiles;
    case 'Village & Local Leagues':
      return villageProfiles;
    case 'School Sports Leagues':
      return schoolProfiles;
    default:
      return corporateProfiles;
  }
};

const getCommunityShortName = (community: string): string => {
  switch (community) {
    case 'Private Family Circle':
      return 'Family Circle';
    case 'Corporate Wellness League':
      return 'Corporate League';
    case 'Village & Local Leagues':
      return 'Village League';
    case 'School Sports Leagues':
      return 'School League';
    default:
      return 'Community League';
  }
};

const playPopSound = (muted: boolean) => {
  if (muted || typeof window === 'undefined') return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.06, now + 0.012);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
};

export default function ProfilePage() {
  const [selectedCommunity, setSelectedCommunity] = useState<string>('Corporate Wellness League');
  const [activeProfile, setActiveProfile] = useState<UserProfile>(baseNamrataProfile);
  const [viewMode, setViewMode] = useState<'individual' | 'family'>('individual');
  const [muted, setMuted] = useState(false);
  const [animateChartKey, setAnimateChartKey] = useState(0);

  // Subscription management states
  const [subscription, setSubscription] = useState<any>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [subLoading, setSubLoading] = useState(true);
  const [detailedProfile, setDetailedProfile] = useState<any>(null);

  const fetchSubscription = async () => {
    const token = localStorage.getItem('vivo_token');
    if (!token) return;
    try {
      const res = await fetch(`http://127.0.0.1:3001/api/billing/status/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
        localStorage.setItem('vivo_tier', data.plan);
      }
    } catch (err) {
      console.error('Failed to fetch subscription status');
    } finally {
      setSubLoading(false);
    }
  };

  const fetchBillingHistory = async () => {
    const token = localStorage.getItem('vivo_token');
    if (!token) return;
    try {
      const res = await fetch(`http://127.0.0.1:3001/api/billing/history/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBillingHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch billing history');
    }
  };

  useEffect(() => {
    const savedCommunity = localStorage.getItem('vivo_selected_community') || 'Corporate Wellness League';
    setSelectedCommunity(savedCommunity);

    const savedMuted = localStorage.getItem('vivo_muted');
    if (savedMuted) setMuted(savedMuted === 'true');

    const savedXp = localStorage.getItem('vivo_xp');
    const savedLevel = localStorage.getItem('vivo_level');
    const savedClaimed = localStorage.getItem('vivo_claimed_milestones');

    const localXp = savedXp ? parseInt(savedXp) : 1240;
    const localLevel = savedLevel ? parseInt(savedLevel) : 4;
    const claimedObject = savedClaimed ? JSON.parse(savedClaimed) : { 1: true };
    const claimedCount = Object.keys(claimedObject).length;
    
    const savedName = localStorage.getItem('vivo_name') || 'Namrata Sharma';
    const savedEmail = localStorage.getItem('vivo_email') || 'namrata@abha.gov.in';
    const savedState = localStorage.getItem('vivo_state') || 'Delhi';
    const rawStreak = localStorage.getItem('vivo_streak');
    const savedStreak = rawStreak ? parseInt(rawStreak, 10) : 18;
    const rawTotalRuns = localStorage.getItem('vivo_total_runs');
    const savedTotalRuns = rawTotalRuns ? parseInt(rawTotalRuns, 10) : 220;

    const initials = savedName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

    baseNamrataProfile.name = savedName;
    baseNamrataProfile.initials = initials;
    baseNamrataProfile.location = `${savedState}, India`;
    baseNamrataProfile.streak = savedStreak;
    baseNamrataProfile.runs = savedTotalRuns;
    baseNamrataProfile.xp = localXp;
    baseNamrataProfile.level = localLevel;
    baseNamrataProfile.abhaAddress = savedEmail ? (savedEmail.split('@')[0] + '@abha.gov.in') : 'namrata@abha.gov.in';
    
    setActiveProfile({ ...baseNamrataProfile });

    // Fetch subscription details
    fetchSubscription();
    fetchBillingHistory();

    const fetchDetailedProfile = async () => {
      const token = localStorage.getItem('vivo_token');
      if (!token) return;
      try {
        const res = await fetch(`http://127.0.0.1:3001/api/auth/profile/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDetailedProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch detailed profile:', err);
      }
    };
    fetchDetailedProfile();
  }, []);

  const activeProfiles = getCommunityProfiles(selectedCommunity);
  const communityShortName = getCommunityShortName(selectedCommunity);

  const handleProfileSwitch = (profile: UserProfile) => {
    playPopSound(muted);
    setActiveProfile(profile);
    setAnimateChartKey(prev => prev + 1);
  };

  const handleViewModeChange = (mode: 'individual' | 'family') => {
    playPopSound(muted);
    setViewMode(mode);
    if (mode === 'individual') {
      setActiveProfile({ ...baseNamrataProfile });
      setAnimateChartKey(prev => prev + 1);
    }
  };

  const getLinePath = (scores: number[]) => {
    const width = 500;
    const height = 150;
    const padding = 20;
    const maxVal = 100;
    
    const points = scores.map((score, idx) => {
      const x = padding + (idx / (scores.length - 1)) * (width - 2 * padding);
      const y = height - padding - (score / maxVal) * (height - 2 * padding);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  const getAreaPath = (scores: number[]) => {
    const width = 500;
    const height = 150;
    const padding = 20;
    const maxVal = 100;
    
    const points = scores.map((score, idx) => {
      const x = padding + (idx / (scores.length - 1)) * (width - 2 * padding);
      const y = height - padding - (score / maxVal) * (height - 2 * padding);
      return `${x},${y}`;
    });
    
    const startX = padding;
    const endX = width - padding;
    const baseY = height - padding;
    
    return `M ${startX},${baseY} L ${points.join(' L ')} L ${endX},${baseY} Z`;
  };

  const getChartDots = (scores: number[]) => {
    const width = 500;
    const height = 150;
    const padding = 20;
    const maxVal = 100;
    
    return scores.map((score, idx) => {
      const x = padding + (idx / (scores.length - 1)) * (width - 2 * padding);
      const y = height - padding - (score / maxVal) * (height - 2 * padding);
      return { x, y, val: score, label: ['M','T','W','T','F','S','S'][idx] };
    });
  };

  const getBarData = (steps: number[], goal: number = 10000) => {
    const width = 500;
    const height = 150;
    const padding = 20;
    const maxVal = Math.max(...steps, goal) * 1.1;
    
    return steps.map((val, idx) => {
      const barWidth = 26;
      const spacing = (width - 2 * padding) / steps.length;
      const x = padding + idx * spacing + (spacing - barWidth) / 2;
      const barHeight = (val / maxVal) * (height - 2 * padding);
      const y = height - padding - barHeight;
      const isTargetMet = val >= goal;
      
      return {
        x,
        y,
        width: barWidth,
        height: barHeight,
        val,
        isTargetMet,
        label: ['M','T','W','T','F','S','S'][idx]
      };
    });
  };

  const stepsMaxVal = Math.max(...activeProfile.weeklySteps, 10000) * 1.1;
  const targetY = 150 - 20 - (10000 / stepsMaxVal) * (150 - 40);

  return (
    <AppLayout>
      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes chartDraw {
          from { stroke-dashoffset: 600; }
          to { stroke-dashoffset: 0; }
        }
        .animate-chart-draw {
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: chartDraw 1.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @keyframes barGrow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        .animate-bar-grow {
          transform-origin: bottom;
          animation: barGrow 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-float {
          animation: float 2.8s ease-in-out infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(58, 171, 85, 0.15); }
          50% { box-shadow: 0 0 20px rgba(58, 171, 85, 0.35); }
        }
        .animate-pulse-glow {
          animation: pulseGlow 3s ease-in-out infinite;
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/10 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground animate-float" style={{ fontFamily: 'var(--font-heading)' }}>
            Your Profile
          </h1>
          <p className="text-muted-foreground font-medium text-sm mt-1">
            Manage your personal data, connected sensors, and health consent registries.
          </p>
        </div>
        
        {/* Toggle Mode & Edit Profile */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0 select-none">
          <Link 
            href="/profile/avatar-studio"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 w-full sm:w-auto text-center border border-violet-500/10"
          >
            <Sparkles size={14} />
            Avatar Studio
          </Link>
          <Link 
            href="/profile/edit"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-accent text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 w-full sm:w-auto text-center"
          >
            Edit Profile
          </Link>
          <div className="flex bg-secondary/40 p-1.5 rounded-2xl border border-border/20 w-full sm:w-auto shrink-0">
            <button
              onClick={() => handleViewModeChange('individual')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-300 ${
                viewMode === 'individual'
                  ? 'bg-primary text-white shadow-md font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User size={14} />
              Individual
            </button>
            <button
              onClick={() => handleViewModeChange('family')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-300 ${
                viewMode === 'family'
                  ? 'bg-primary text-white shadow-md font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users size={14} />
              {communityShortName}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {viewMode === 'family' && (
            <div className="bg-card rounded-[24px] p-4 border border-border/40 shadow-sm flex items-center justify-between gap-4 overflow-x-auto select-none transition-all duration-500 animate-scale-up">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-primary shrink-0 px-2">
                <Users size={16} /> View Profile:
              </div>
              
              <div className="flex items-center gap-3">
                {activeProfiles.map(p => {
                  const isSelected = activeProfile.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProfileSwitch(p)}
                      className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border transition-all duration-300 ${
                        isSelected 
                          ? 'bg-primary border-primary text-white scale-105 shadow-md font-bold' 
                          : 'bg-background border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-inner ${
                        isSelected ? 'bg-card-lime text-primary-dark' : 'bg-secondary text-primary'
                      }`}>
                        {p.initials}
                      </div>
                      <div className="text-left hidden sm:block">
                        <h4 className="text-xs font-black leading-none">{p.name.split(' ')[0]}</h4>
                        <span className="text-[9px] opacity-75">Level {p.level}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-card rounded-[32px] p-6 md:p-8 border border-border/40 shadow-card flex flex-col sm:flex-row gap-6 items-center animate-pulse-glow">
            {activeProfile.id === 'namrata' && detailedProfile?.profile_picture ? (
              <img 
                src={detailedProfile.profile_picture} 
                alt={activeProfile.name} 
                className="w-20 h-20 rounded-full object-cover shrink-0 shadow-md border-2 border-primary bg-secondary" 
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-secondary text-primary flex items-center justify-center font-extrabold text-3xl shrink-0 shadow-inner">
                {activeProfile.initials}
              </div>
            )}
            
            <div className="flex-1 flex flex-col sm:flex-row justify-between items-center sm:items-start w-full gap-4">
              <div className="text-center sm:text-left">
                <h3 className="font-extrabold text-2xl text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  {activeProfile.name}
                </h3>
                <span className="text-xs text-primary font-bold bg-secondary px-3 py-1 rounded-full inline-block mt-1.5 shadow-sm">
                  {activeProfile.status}
                </span>
                
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 text-xs font-semibold text-muted-foreground mt-4">
                  <span className="flex items-center gap-1.5"><MapPin size={14} /> {activeProfile.location}</span>
                  <span className="flex items-center gap-1.5">Age: {activeProfile.age} Years</span>
                  <span className="flex items-center gap-1.5">Joined: {activeProfile.joined}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expanded Profile Information Card */}
          {viewMode === 'individual' && detailedProfile && (
            <div className="bg-card rounded-[32px] p-6 md:p-8 border border-border/40 shadow-card flex flex-col gap-6 animate-scale-up select-none">
              <h3 className="font-extrabold text-lg text-primary flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                <User size={20} /> Personal Profile Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                {/* Account details */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground font-semibold">Username</span>
                    <span className="font-extrabold text-foreground">{detailedProfile.username || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground font-semibold">Email Address</span>
                    <span className="font-extrabold text-foreground">{detailedProfile.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground font-semibold">Mobile Number</span>
                    <span className="font-extrabold text-foreground">{detailedProfile.mobile_number ? `+91 ${detailedProfile.mobile_number}` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground font-semibold">Occupation</span>
                    <span className="font-extrabold text-foreground">{detailedProfile.occupation || 'Student / Professional'}</span>
                  </div>
                  {detailedProfile.company && (
                    <div className="flex justify-between border-b border-border/30 pb-2">
                      <span className="text-muted-foreground font-semibold">Company Name</span>
                      <span className="font-extrabold text-foreground">{detailedProfile.company}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground font-semibold">Gender / DOB</span>
                    <span className="font-extrabold text-foreground">{detailedProfile.gender} {detailedProfile.date_of_birth ? `(${detailedProfile.date_of_birth})` : ''}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground font-semibold">Profile Privacy</span>
                    <span className="font-black text-primary uppercase">{detailedProfile.privacy_level}</span>
                  </div>
                </div>

                {/* Location & Biometrics */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground font-semibold">Country / City</span>
                    <span className="font-extrabold text-foreground">{detailedProfile.country || 'India'} / {detailedProfile.city || 'Delhi'}</span>
                  </div>
                  {detailedProfile.address && (
                    <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                      <span className="text-muted-foreground font-semibold">Address</span>
                      <span className="font-extrabold text-foreground truncate max-w-xs">{detailedProfile.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground font-semibold">Height / Weight</span>
                    <span className="font-extrabold text-foreground">{detailedProfile.height ? `${detailedProfile.height} cm` : 'N/A'} / {detailedProfile.weight ? `${detailedProfile.weight} kg` : 'N/A'}</span>
                  </div>
                  {detailedProfile.bmi && (
                    <div className="flex justify-between border-b border-border/30 pb-2">
                      <span className="text-muted-foreground font-semibold">Body Mass Index (BMI)</span>
                      <span className="font-extrabold text-primary">{detailedProfile.bmi}</span>
                    </div>
                  )}
                  {detailedProfile.blood_group && (
                    <div className="flex justify-between border-b border-border/30 pb-2">
                      <span className="text-muted-foreground font-semibold">Blood Group</span>
                      <span className="font-extrabold text-foreground">{detailedProfile.blood_group}</span>
                    </div>
                  )}
                  {detailedProfile.blood_pressure && (
                    <div className="flex justify-between border-b border-border/30 pb-2">
                      <span className="text-muted-foreground font-semibold">Blood Pressure</span>
                      <span className="font-extrabold text-foreground">{detailedProfile.blood_pressure}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-[20px] bg-card border border-border/20 shadow-sm animate-scale-up">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Match Streak</span>
              <strong className="text-xl font-black text-primary block mt-1">{activeProfile.streak} Days</strong>
            </div>
            <div className="text-center p-4 rounded-[20px] bg-card border border-border/20 shadow-sm animate-scale-up" style={{ animationDelay: '0.08s' }}>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Runs Chased</span>
              <strong className="text-xl font-black text-primary block mt-1">{activeProfile.runs} runs</strong>
            </div>
            <div className="text-center p-4 rounded-[20px] bg-card border border-border/20 shadow-sm animate-scale-up" style={{ animationDelay: '0.16s' }}>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Wickets Saved</span>
              <strong className="text-xl font-black text-accent block mt-1">{20 - activeProfile.wickets} / 20</strong>
            </div>
            <div className="text-center p-4 rounded-[20px] bg-card border border-border/20 shadow-sm animate-scale-up" style={{ animationDelay: '0.24s' }}>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Adherence Rate</span>
              <strong className="text-xl font-black text-primary-dark block mt-1">{activeProfile.adherence}%</strong>
            </div>
          </div>

          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-primary" />
                <h4 className="font-extrabold text-base text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  Weekly Metabolic Score Trend
                </h4>
              </div>
              <span className="text-xs bg-secondary text-primary font-bold px-2 py-0.5 rounded-md uppercase">
                AVG: {(activeProfile.weeklyScore.reduce((a, b) => a + b, 0) / 7).toFixed(0)} Pts
              </span>
            </div>

            <div className="w-full h-44 flex items-center justify-center">
              <svg 
                key={`line-chart-${animateChartKey}`} 
                viewBox="0 0 500 150" 
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
                  const y = 20 + ratio * 110;
                  return (
                    <line 
                      key={i} 
                      x1="20" 
                      y1={y} 
                      x2="480" 
                      y2={y} 
                      stroke="var(--border)" 
                      strokeWidth={1} 
                      strokeDasharray="4 4" 
                      opacity={0.3}
                    />
                  );
                })}

                <path 
                  d={getAreaPath(activeProfile.weeklyScore)} 
                  fill="url(#lineGrad)" 
                />

                <path 
                  d={getLinePath(activeProfile.weeklyScore)} 
                  fill="none" 
                  stroke="var(--primary)" 
                  strokeWidth={3.5} 
                  strokeLinecap="round"
                  className="animate-chart-draw"
                />

                {getChartDots(activeProfile.weeklyScore).map((pt, i) => (
                  <g key={i} className="group/dot cursor-pointer">
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r={5} 
                      fill="var(--background)" 
                      stroke="var(--primary)" 
                      strokeWidth={3} 
                      className="transition-all duration-300 group-hover/dot:r-7"
                    />
                    <text 
                      x={pt.x} 
                      y={pt.y - 12} 
                      textAnchor="middle" 
                      fill="var(--color-primary-dark)" 
                      className="text-[10px] font-black opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none"
                    >
                      {pt.val} Pts
                    </text>
                    <text 
                      x={pt.x} 
                      y={145} 
                      textAnchor="middle" 
                      fill="var(--muted-foreground)" 
                      className="text-[10px] font-bold"
                    >
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" />
                <h4 className="font-extrabold text-base text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  Movement Steps vs Target (10k)
                </h4>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md uppercase">
                Goal Met: {activeProfile.weeklySteps.filter(s => s >= 10000).length} / 7 Days
              </span>
            </div>

            <div className="w-full h-44 flex items-center justify-center">
              <svg 
                key={`bar-chart-${animateChartKey}`} 
                viewBox="0 0 500 150" 
                className="w-full h-full overflow-visible"
              >
                {[0, 0.5, 1.0].map((ratio, i) => {
                  const y = 20 + ratio * 110;
                  return (
                    <line 
                      key={i} 
                      x1="20" 
                      y1={y} 
                      x2="480" 
                      y2={y} 
                      stroke="var(--border)" 
                      strokeWidth={1} 
                      opacity={0.15}
                    />
                  );
                })}

                <line 
                  x1="20" 
                  y1={targetY} 
                  x2="480" 
                  y2={targetY} 
                  stroke="var(--destructive)" 
                  strokeWidth={1.5} 
                  strokeDasharray="4 4" 
                  opacity={0.8}
                />
                <text 
                  x="480" 
                  y={targetY - 5} 
                  textAnchor="end" 
                  fill="var(--destructive)" 
                  className="text-[9px] font-black uppercase tracking-wider opacity-85"
                >
                  Target: 10,000 steps
                </text>

                {getBarData(activeProfile.weeklySteps, 10000).map((bar, i) => (
                  <g key={i} className="group/bar cursor-pointer">
                    <rect 
                      x={bar.x} 
                      y={bar.y} 
                      width={bar.width} 
                      height={bar.height} 
                      rx={6}
                      fill={bar.isTargetMet ? 'var(--primary)' : 'var(--card-lime)'}
                      className="animate-bar-grow transition-all duration-300 group-hover/bar:opacity-90 shadow-sm"
                      style={{ animationDelay: `${i * 0.08}s` }}
                    />
                    <text 
                      x={bar.x + bar.width / 2} 
                      y={bar.y - 8} 
                      textAnchor="middle" 
                      fill="var(--color-primary-dark)" 
                      className="text-[9px] font-black opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none"
                    >
                      {(bar.val / 1000).toFixed(1)}k
                    </text>
                    <text 
                      x={bar.x + bar.width / 2} 
                      y={145} 
                      textAnchor="middle" 
                      fill="var(--muted-foreground)" 
                      className="text-[10px] font-bold"
                    >
                      {bar.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="bg-card rounded-[32px] p-6 md:p-8 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-lg mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Metabolic Goals Priority
            </h3>
            
            <div className="flex flex-col gap-3">
              {activeProfile.goals.map((goal, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 bg-background border border-border/30 rounded-2xl hover:scale-[1.01] transition-transform duration-300">
                  <CheckCircle size={18} className="text-primary shrink-0" />
                  <span className="text-sm text-foreground font-semibold">{goal}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="lg:col-span-4 flex flex-col gap-8 lg:sticky lg:top-8 z-10">
          
          <div className="bg-card border border-border/30 rounded-[24px] p-6 shadow-card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[35px] pointer-events-none" />
            <h4 className="font-extrabold text-base mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
              <Trophy className="text-primary" size={20} /> Current Level Progress
            </h4>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black text-primary-dark">Level {activeProfile.level} Match Player</span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                {activeProfile.xp} / 2,000 XP
              </span>
            </div>
            
            <div className="w-full h-3 bg-secondary/35 rounded-full overflow-hidden p-0.5 border border-border/20 shadow-inner">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-sm"
                style={{ width: `${(activeProfile.xp / 2000) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground block mt-2 text-right font-bold uppercase">
              {2000 - activeProfile.xp} XP remaining to Level {activeProfile.level + 1}
            </span>
          </div>

          {/* Subscription details card */}
          <div className="bg-card border border-border/30 rounded-[24px] p-6 shadow-card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[35px] pointer-events-none" />
            <h4 className="font-extrabold text-base mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
              <CreditCard className="text-primary" size={20} /> Subscription & Plan
            </h4>

            {subLoading ? (
              <div className="text-center py-4 text-xs font-bold text-muted-foreground">Loading subscription...</div>
            ) : subscription ? (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Current Plan</span>
                    <span className={`text-sm font-black px-2.5 py-0.5 rounded-full mt-1 w-fit text-white ${
                      subscription.plan === 'PRO' ? 'bg-primary' : subscription.plan === 'ENTERPRISE' ? 'bg-accent' : 'bg-muted-foreground'
                    }`}>
                      {subscription.plan}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Plan Status</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${
                      subscription.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {subscription.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] font-semibold text-muted-foreground mt-2 border-t border-border/10 pt-3">
                  <div>
                    <span>Started:</span>
                    <strong className="text-foreground block mt-0.5">{subscription.startDate || 'N/A'}</strong>
                  </div>
                  <div>
                    <span>Expires:</span>
                    <strong className="text-foreground block mt-0.5">{subscription.endDate || 'Never'}</strong>
                  </div>
                </div>

                {subscription.plan !== 'FREE' && (
                  <div className="mt-2 border-t border-border/10 pt-3">
                    <div className="flex justify-between text-[10px] font-bold mb-1">
                      <span className="text-muted-foreground">Remaining Days:</span>
                      <span className="text-primary">{subscription.remainingDays} Days</span>
                    </div>
                    <div className="w-full h-2.5 bg-secondary/35 rounded-full overflow-hidden p-0.5 border border-border/20 shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          subscription.remainingDays < 5 ? 'bg-destructive' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, (subscription.remainingDays / 30) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1.5 block">
                      Auto Renewal: <strong>{subscription.autoRenew ? 'Enabled' : 'Disabled'}</strong>
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-4">
                  {subscription.plan === 'FREE' ? (
                    <a 
                      href="/subscription" 
                      className="py-2.5 px-4 bg-primary hover:bg-accent text-white font-bold text-center rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
                    >
                      <Sparkles size={14} /> Upgrade Plan
                    </a>
                  ) : (
                    <div className="flex gap-2">
                      <a 
                        href="/subscription" 
                        className="flex-1 py-2.5 px-3 bg-secondary hover:bg-secondary/80 text-primary font-bold text-center rounded-xl text-xs transition-all"
                      >
                        Change / Upgrade
                      </a>
                      <button 
                        onClick={() => {
                          fetchSubscription();
                          alert('Future payment ready. Integration with Stripe/Razorpay will extend plan dates automatically.');
                        }}
                        className="flex-1 py-2.5 px-3 bg-primary hover:bg-accent text-white font-bold text-center rounded-xl text-xs transition-all"
                      >
                        Renew Now
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={() => setShowBillingModal(true)}
                    className="py-2 px-3 border border-border/40 hover:bg-secondary/40 text-muted-foreground hover:text-foreground font-semibold rounded-xl text-xs transition-all"
                  >
                    View Billing History
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs font-bold text-muted-foreground">Error loading subscription status.</div>
            )}
          </div>

          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h4 className="font-extrabold text-base mb-4 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
              <Key size={18} className="text-primary" /> ABHA Health Locker
            </h4>
            
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-background border border-border/30 rounded-2xl text-center shadow-inner relative overflow-hidden">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">ABHA ADDRESS / ID</span>
                <strong className="text-sm font-black text-foreground block mt-1.5">{activeProfile.abhaAddress}</strong>
                <span className="text-[9px] text-primary bg-secondary px-2 py-0.5 rounded-full inline-block mt-2 font-bold shadow-sm">
                  VERIFIED SANDBOX RECORD
                </span>
              </div>

              <div className="flex flex-col gap-2.5 text-[10px] font-semibold text-muted-foreground px-1">
                <div className="flex justify-between items-center">
                  <span>Linked health records:</span>
                  <strong className="text-primary">{activeProfile.abhaRecords} medical files</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Last e-Consent query:</span>
                  <strong className="text-foreground">{activeProfile.abhaLastQuery}</strong>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Billing History Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-card border border-border/50 max-w-md w-full rounded-[32px] p-6 shadow-2xl relative overflow-hidden animate-scale-up">
            <button 
              onClick={() => setShowBillingModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-secondary/40 rounded-full transition-all"
            >
              <X size={18} />
            </button>
            <h3 className="font-extrabold text-xl mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
              <CreditCard className="text-primary" size={20} /> Billing History
            </h3>
            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
              {billingHistory.length === 0 ? (
                <div className="text-center py-8 text-xs font-bold text-muted-foreground">No billing transactions recorded.</div>
              ) : (
                billingHistory.map(item => (
                  <div key={item.id} className="p-3 bg-background border border-border/20 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-foreground">{item.description}</h4>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">{item.timestamp}</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowBillingModal(false)}
                className="py-2.5 px-6 bg-primary text-white font-bold rounded-xl text-xs hover:bg-accent transition-all"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
