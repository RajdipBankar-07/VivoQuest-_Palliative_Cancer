'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { 
  Trophy, 
  CheckCircle, 
  PlayCircle, 
  Award,
  Star,
  Gift,
  Lock,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  RefreshCw
} from 'lucide-react';

interface Milestone {
  id: number;
  day: number;
  name: string;
  status: 'completed' | 'current' | 'upcoming';
  desc: string;
  stage: 'group' | 'knockouts' | 'final';
  reward: {
    xp: number;
    title: string;
    items: string[];
    iconType: 'medal' | 'gift' | 'trophy' | 'star';
  };
}

const initialMilestones: Milestone[] = [
  { 
    id: 1, 
    day: 7, 
    name: 'First Week Inning', 
    status: 'completed', 
    desc: 'Establish metabolic baseline and complete habit induction.', 
    stage: 'group',
    reward: {
      xp: 100,
      title: 'First Innings Pack',
      items: ['Bronze Habit Badge', 'Healthy Indian Breakfast E-Book (+10 recipes)', 'Metabolic baseline report unlocked'],
      iconType: 'medal'
    }
  },
  { 
    id: 2, 
    day: 14, 
    name: 'Habit Foundations', 
    status: 'completed', 
    desc: 'Achieve daily food logging consistency and calibrate plate ratios.', 
    stage: 'group',
    reward: {
      xp: 150,
      title: 'Consistent Batter Pack',
      items: ['Silver Consistency Pin', '1-on-1 Clinical Coach Consultation (15 min)', 'Gluten-Free Flour Discount Voucher (20% off)'],
      iconType: 'gift'
    }
  },
  { 
    id: 3, 
    day: 21, 
    name: 'First 21 Neural Lock', 
    status: 'completed', 
    desc: 'Lock in new neural pathways for dietary discipline and hydration.', 
    stage: 'group',
    reward: {
      xp: 200,
      title: 'Habit Master Bundle',
      items: ['Neural Lock Trophy', 'Premium Yoga Video Course Access', 'Water intake tracker themes'],
      iconType: 'trophy'
    }
  },
  { 
    id: 4, 
    day: 30, 
    name: 'Group Stage Final', 
    status: 'current', 
    desc: 'First comprehensive clinical progress evaluation and consultation.', 
    stage: 'group',
    reward: {
      xp: 300,
      title: 'Group MVP Shield',
      items: ['Gold Group MVP Shield Badge', '15% Off Organic Spices voucher', 'Free Doctor Appointment slot (Priority)'],
      iconType: 'star'
    }
  },
  { 
    id: 5, 
    day: 45, 
    name: 'Quarter Final Clash', 
    status: 'upcoming', 
    desc: 'Advanced recovery phase & post-prandial glucose tolerance test.', 
    stage: 'knockouts',
    reward: {
      xp: 400,
      title: 'Glucose Defender Kit',
      items: ['Glucose Shield Badge', 'Free Home Blood Sugar Test Kit', 'Metabolic Cook Book (PDF)'],
      iconType: 'medal'
    }
  },
  { 
    id: 6, 
    day: 60, 
    name: 'Semi Final Peak', 
    status: 'upcoming', 
    desc: 'Hormonal and stress adaptation metrics review with clinical coach.', 
    stage: 'knockouts',
    reward: {
      xp: 500,
      title: 'Cortisol Adaptor Pack',
      items: ['Cortisol Conqueror Trophy', 'Premium Insulated Shaker Bottle (Shipped)', 'Sleep Hygiene Audio Library access'],
      iconType: 'gift'
    }
  },
  { 
    id: 7, 
    day: 75, 
    name: 'Championship Inning', 
    status: 'upcoming', 
    desc: 'Peak metabolic flexibility evaluation and dynamic fasting window trial.', 
    stage: 'knockouts',
    reward: {
      xp: 600,
      title: 'Metabolic Expert Shield',
      items: ['Metabolic Master Medal', '1-month Free Personal Coaching access', 'Customized Diet Plan v2.0'],
      iconType: 'star'
    }
  },
  { 
    id: 8, 
    day: 90, 
    name: 'The Victory Ceremony', 
    status: 'upcoming', 
    desc: 'Sustained lifestyle integration, final check-in, and trophy award.', 
    stage: 'final',
    reward: {
      xp: 1000,
      title: 'VivoQuest Grand Trophy',
      items: ['Championship Winner Ring (Physical)', 'Lifetime Premium Membership Key', 'VivoQuest Champion T-Shirt (Shipped)'],
      iconType: 'trophy'
    }
  },
];

// Native Audio Synthesizer Chimes
const playChime = (muted: boolean) => {
  if (muted || typeof window === 'undefined') return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioCtx.currentTime;
    
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      gainNode.gain.setValueAtTime(0, start);
      gainNode.gain.linearRampToValueAtTime(0.12, start + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    
    playNote(523.25, now, 0.3); // C5
    playNote(659.25, now + 0.08, 0.35); // E5
    playNote(783.99, now + 0.16, 0.4); // G5
    playNote(1046.50, now + 0.24, 0.55); // C6
  } catch (e) {
    console.warn("Audio synthesis context failed or blocked", e);
  }
};

const playLevelUpSound = (muted: boolean) => {
  if (muted || typeof window === 'undefined') return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioCtx.currentTime;
    
    const playNote = (freq: number, start: number, duration: number, type: 'sine' | 'triangle' = 'sine') => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      
      gainNode.gain.setValueAtTime(0, start);
      gainNode.gain.linearRampToValueAtTime(0.15, start + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    
    const baseFreqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    baseFreqs.forEach((freq, idx) => {
      playNote(freq, now + idx * 0.06, 0.6, 'triangle');
    });
  } catch (e) {
    console.warn("Audio synthesis context failed or blocked", e);
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

const triggerConfetti = (options?: any) => {
  import('canvas-confetti').then((module) => {
    const confettiFn = module.default || module;
    confettiFn(options);
  }).catch((err) => console.error('Failed to load canvas-confetti', err));
};

export default function JourneyPage() {
  const [activeStage, setActiveStage] = useState<'group' | 'knockouts' | 'final'>('group');
  
  // Game States
  const [xp, setXp] = useState(1240);
  const [level, setLevel] = useState(4);
  const [claimed, setClaimed] = useState<Record<number, boolean>>({ 1: true }); // Day 7 claimed, Day 14 and 21 completed but unclaimed
  const [milestoneStatuses, setMilestoneStatuses] = useState<Record<number, 'completed' | 'current' | 'upcoming'>>({});
  const [muted, setMuted] = useState(false);
  
  // Modals state
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userName, setUserName] = useState('Namrata');

  const handleNodeClick = (m: Milestone) => {
    playPopSound(muted);
    setSelectedMilestone(m);
  };

  // Sync with Local Storage on mount
  useEffect(() => {
    const savedXp = localStorage.getItem('vivo_xp');
    const savedLevel = localStorage.getItem('vivo_level');
    const savedClaimed = localStorage.getItem('vivo_claimed_milestones');
    const savedStatuses = localStorage.getItem('vivo_milestone_statuses');
    const savedMuted = localStorage.getItem('vivo_muted');

    if (savedXp) setXp(parseInt(savedXp));
    else localStorage.setItem('vivo_xp', '1240');

    if (savedLevel) setLevel(parseInt(savedLevel));
    else localStorage.setItem('vivo_level', '4');

    if (savedClaimed) {
      setClaimed(JSON.parse(savedClaimed));
    } else {
      localStorage.setItem('vivo_claimed_milestones', JSON.stringify({ 1: true }));
    }

    if (savedMuted) {
      setMuted(savedMuted === 'true');
    }

    if (savedStatuses) {
      setMilestoneStatuses(JSON.parse(savedStatuses));
    } else {
      const initialStatuses: Record<number, 'completed' | 'current' | 'upcoming'> = {};
      initialMilestones.forEach(m => {
        initialStatuses[m.id] = m.status;
      });
      setMilestoneStatuses(initialStatuses);
      localStorage.setItem('vivo_milestone_statuses', JSON.stringify(initialStatuses));
    }

    const storedName = localStorage.getItem('vivo_name') || 'Namrata';
    setUserName(storedName);
    
    setIsLoaded(true);
  }, []);

  const updateXpAndLevel = (newXp: number, newLevel: number) => {
    setXp(newXp);
    setLevel(newLevel);
    localStorage.setItem('vivo_xp', newXp.toString());
    localStorage.setItem('vivo_level', newLevel.toString());
  };

  const updateClaimed = (newClaimed: Record<number, boolean>) => {
    setClaimed(newClaimed);
    localStorage.setItem('vivo_claimed_milestones', JSON.stringify(newClaimed));
  };

  const updateStatuses = (newStatuses: Record<number, 'completed' | 'current' | 'upcoming'>) => {
    setMilestoneStatuses(newStatuses);
    localStorage.setItem('vivo_milestone_statuses', JSON.stringify(newStatuses));
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    localStorage.setItem('vivo_muted', nextMuted ? 'true' : 'false');
  };

  const resetProgress = () => {
    localStorage.removeItem('vivo_xp');
    localStorage.removeItem('vivo_level');
    localStorage.removeItem('vivo_claimed_milestones');
    localStorage.removeItem('vivo_milestone_statuses');
    
    setXp(1240);
    setLevel(4);
    setClaimed({ 1: true });
    
    const initialStatuses: Record<number, 'completed' | 'current' | 'upcoming'> = {};
    initialMilestones.forEach(m => {
      initialStatuses[m.id] = m.status;
    });
    setMilestoneStatuses(initialStatuses);
    setSelectedMilestone(null);
    setShowLevelUp(null);
    
    // Play sound on reset
    if (!muted) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } catch(e){}
    }
  };

  // Compile active milestones
  const milestones = initialMilestones.map(m => ({
    ...m,
    status: milestoneStatuses[m.id] || m.status
  }));

  // Winding SVG path helper
  const generatePathD = (tStart: number, tEnd: number) => {
    let points = [];
    const steps = 100;
    const startStep = Math.floor(tStart * steps);
    const endStep = Math.ceil(tEnd * steps);
    for (let i = startStep; i <= endStep; i++) {
      const t = i / steps;
      const x = 300 + Math.sin(t * Math.PI * 4.5) * 160;
      const y = 30 + t * 740;
      points.push(`${x} ${y}`);
    }
    return points.length > 0 ? `M ${points.join(' L ')}` : '';
  };

  // Stage ranges on the 0-1 path scale
  const stageRanges = {
    group: { start: 0, end: 3/7 },
    knockouts: { start: 3/7, end: 6/7 },
    final: { start: 6/7, end: 1.0 }
  };

  const activeRange = stageRanges[activeStage];

  // Dynamic completed progress line
  const currentMilestoneIndex = milestones.findIndex(m => m.status === 'current');
  const tLimit = currentMilestoneIndex !== -1 
    ? currentMilestoneIndex / (milestones.length - 1) 
    : 1.0;

  // Claim Reward logic
  const claimReward = (milestoneId: number) => {
    const m = milestones.find(item => item.id === milestoneId);
    if (!m) return;
    
    // Play sound and trigger confetti
    playChime(muted);
    triggerConfetti({
      particleCount: 140,
      spread: 75,
      origin: { y: 0.6 }
    });

    const newClaimed = { ...claimed, [milestoneId]: true };
    updateClaimed(newClaimed);

    const addedXp = m.reward.xp;
    let nextXp = xp + addedXp;
    let nextLevel = level;
    let leveledUp = false;

    if (nextXp >= 2000) {
      nextXp = nextXp - 2000;
      nextLevel = level + 1;
      leveledUp = true;
    }

    updateXpAndLevel(nextXp, nextLevel);

    // Update local modal view state
    setSelectedMilestone({
      ...m,
      status: 'completed'
    });

    if (leveledUp) {
      setTimeout(() => {
        playLevelUpSound(muted);
        triggerConfetti({
          particleCount: 180,
          spread: 100,
          origin: { y: 0.5 }
        });
        setShowLevelUp(nextLevel);
      }, 700);
    }
  };

  // Simulation controls
  const simulateInningCompletion = (milestoneId: number) => {
    const updatedStatuses = { ...milestoneStatuses };
    updatedStatuses[milestoneId] = 'completed';
    
    const nextMilestone = milestones.find(m => m.id === milestoneId + 1);
    if (nextMilestone) {
      updatedStatuses[nextMilestone.id] = 'current';
    }
    
    updateStatuses(updatedStatuses);
    
    const currentMObj = milestones.find(m => m.id === milestoneId);
    if (currentMObj) {
      setSelectedMilestone({
        ...currentMObj,
        status: 'completed'
      });
    }

    playChime(muted);
    triggerConfetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.6 }
    });
  };

  // Dynamic user achievements list
  const claimedAchievements = milestones
    .filter(m => claimed[m.id])
    .map(m => ({
      name: m.reward.title,
      rank: `Day ${m.day} Milestone`,
      desc: `Unlocked: ${m.reward.items.slice(0, 2).join(', ')}`,
      xp: `+${m.reward.xp} XP`
    }));

  const staticAchievements = [
    { name: 'Boundary Hit', rank: 'Adherence Milestone', desc: 'Scored 8 runs or more in a single plate log', xp: '+25 XP' },
    { name: 'Family Shield Cheer', rank: 'Community Milestone', desc: 'Cheered circle members for 7 consecutive days', xp: '+50 XP' },
  ];

  const allAchievements = [...claimedAchievements, ...staticAchievements];

  const renderRewardIcon = (type: 'medal' | 'gift' | 'trophy' | 'star', size: number) => {
    switch (type) {
      case 'medal': return <Award size={size} />;
      case 'gift': return <Gift size={size} />;
      case 'trophy': return <Trophy size={size} />;
      case 'star': return <Star size={size} />;
    }
  };

  if (!isLoaded) {
    return (
      <AppLayout>
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-8deg) scale(1); }
          50% { transform: rotate(8deg) scale(1.15); }
        }
        .animate-wiggle {
          animation: wiggle 1.2s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes pathFlow {
          to { stroke-dashoffset: -24; }
        }
        .animate-path-flow {
          animation: pathFlow 1.6s linear infinite;
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 9s linear infinite;
        }
        @keyframes sparkleFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(-4px, -6px) scale(1.3); opacity: 1; }
        }
        @keyframes sparkleFloat2 {
          0%, 100% { transform: translate(0, 0) scale(0.9); opacity: 0.5; }
          50% { transform: translate(4px, 6px) scale(1.2); opacity: 0.95; }
        }
        .animate-sparkle-float-1 {
          animation: sparkleFloat1 2.2s ease-in-out infinite;
        }
        .animate-sparkle-float-2 {
          animation: sparkleFloat2 2.8s ease-in-out infinite;
        }
        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(25px, -35px) scale(1.1); }
        }
        .animate-blob {
          animation: blobFloat 14s ease-in-out infinite;
        }
        
        /* Premium Hover Tooltip Transition */
        .tooltip-container {
          opacity: 0;
          transform: translateX(12px) translateY(-50%);
          pointer-events: none;
          transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .group:hover .tooltip-container {
          opacity: 1;
          transform: translateX(0) translateY(-50%);
          pointer-events: auto;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground animate-float" style={{ fontFamily: 'var(--font-heading)' }}>
            Your 90-Day Journey
          </h1>
          <p className="text-muted-foreground font-medium text-sm mt-1">
            Every daily innings builds towards the Championship. Track milestones, unlock rewards, and level up.
          </p>
        </div>
        
        {/* Controls and Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-card p-1.5 rounded-2xl border border-border shadow-sm">
            <button 
              onClick={() => setActiveStage('group')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeStage === 'group' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Group Stage (Days 1-30)
            </button>
            <button 
              onClick={() => setActiveStage('knockouts')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeStage === 'knockouts' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Knockouts (Days 31-75)
            </button>
            <button 
              onClick={() => setActiveStage('final')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeStage === 'final' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              The Final (Days 76-90)
            </button>
          </div>

          {/* Sound Mute Toggle */}
          <button 
            onClick={toggleMute}
            className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-primary hover:bg-secondary/40 shadow-sm transition-all"
            title={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Reset Progress Button */}
          <button 
            onClick={resetProgress}
            className="w-10 h-10 rounded-xl bg-card border border-red-200 flex items-center justify-center text-red-600 hover:bg-red-50 shadow-sm transition-all"
            title="Reset Journey Progress (Demo)"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* Left Column - SVG Tournament Path (8/12 width) */}
        <div className="lg:col-span-8 bg-card rounded-[32px] p-8 border border-border shadow-sm overflow-x-auto relative min-h-[900px]">
          
          {/* Floating Background Glow Blobs */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-[80px] animate-blob pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-card-lime/10 rounded-full blur-[80px] animate-blob pointer-events-none" style={{ animationDelay: '-7s' }} />

          <div className="absolute top-6 left-8 flex items-center gap-1.5 text-xs font-black text-primary uppercase bg-secondary px-3 py-1 rounded-full border border-primary/10 select-none">
            🚩 START
          </div>
          <div className="absolute bottom-6 right-8 flex items-center gap-1.5 text-xs font-black text-primary-dark uppercase bg-card-lime px-3 py-1 rounded-full border border-primary/10 select-none">
            🏆 CHAMPION TROPHY
          </div>

          {/* Vertical Winding SVG Path */}
          <div className="w-full min-w-[500px] flex justify-center py-12">
            <div className="relative w-[600px] h-[800px]">
              
              {/* Dynamic Path lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                {/* Background dotted line */}
                <path 
                  d={generatePathD(0, 1.0)} 
                  fill="none" 
                  stroke="var(--border)" 
                  strokeWidth={5} 
                  strokeDasharray="6 6"
                  opacity={0.3}
                />
                
                {/* Completed Solid Green line */}
                <path 
                  d={generatePathD(0, tLimit)} 
                  fill="none" 
                  stroke="var(--accent)" 
                  strokeWidth={6} 
                  strokeLinecap="round"
                  opacity={0.65}
                />

                {/* Active Stage Highlight Line */}
                <path 
                  d={generatePathD(activeRange.start, activeRange.end)} 
                  fill="none" 
                  stroke="var(--card-lime)" 
                  strokeWidth={12} 
                  strokeLinecap="round"
                  opacity={0.7}
                  className="animate-pulse"
                />
                <path 
                  d={generatePathD(activeRange.start, activeRange.end)} 
                  fill="none" 
                  stroke="var(--primary)" 
                  strokeWidth={5} 
                  strokeLinecap="round"
                  strokeDasharray="12 12"
                  className="animate-path-flow"
                />
              </svg>

              {/* Milestone Nodes */}
              {milestones.map((m) => {
                const t = (m.id - 1) / (milestones.length - 1);
                const xPos = 300 + Math.sin(t * Math.PI * 4.5) * 160;
                const yPos = 30 + t * 740;

                const isClaimed = claimed[m.id];
                const isActiveStage = m.stage === activeStage;

                return (
                  <div 
                    key={m.id}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 group z-10 transition-all duration-500 ${
                      isActiveStage 
                        ? 'scale-100 opacity-100' 
                        : 'scale-90 opacity-35 filter grayscale-[30%] hover:opacity-75'
                    }`}
                    style={{ left: `${xPos}px`, top: `${yPos}px` }}
                  >
                    {/* Interactive Node Ball */}
                    <div 
                      onClick={() => handleNodeClick(m)}
                      className="relative flex items-center justify-center cursor-pointer"
                    >
                      {/* Completed Nodes */}
                      {m.status === 'completed' && (
                        <>
                          {isClaimed ? (
                            // Claimed completed node
                            <div className="w-12 h-12 rounded-full bg-emerald-600 border-4 border-secondary shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform relative">
                              <CheckCircle size={22} strokeWidth={3} className="text-emerald-50" />
                              <span className="absolute -bottom-6 bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-200 uppercase whitespace-nowrap shadow-sm z-20">
                                Claimed
                              </span>
                            </div>
                          ) : (
                            // Unclaimed completed node (Attractive glowing box!)
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-4 border-amber-100 shadow-xl flex items-center justify-center text-white hover:scale-110 transition-transform relative">
                              {/* Orbit Ring */}
                              <div className="absolute w-[68px] h-[68px] rounded-full border border-dashed border-amber-400/80 animate-spin-slow pointer-events-none" />
                              
                              {/* Floating Sparkles */}
                              <Sparkles size={12} className="absolute -top-3.5 -left-3.5 text-amber-400 animate-sparkle-float-1 pointer-events-none fill-amber-300" />
                              <Sparkles size={10} className="absolute -bottom-3.5 -right-3.5 text-amber-500 animate-sparkle-float-2 pointer-events-none fill-amber-400" />

                              <span className="absolute -top-7 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white uppercase tracking-wider animate-bounce shadow-md flex items-center gap-0.5 z-20">
                                <Sparkles size={8} className="fill-white" /> Claim!
                              </span>
                              <Gift size={26} strokeWidth={2.5} className="animate-wiggle text-amber-50" />
                              
                              <div className="absolute -inset-2.5 rounded-full border-2 border-amber-400 animate-ping opacity-75 pointer-events-none" />
                              <div className="absolute -inset-4 rounded-full border border-orange-300 opacity-30 animate-pulse pointer-events-none" />
                              <span className="absolute -bottom-6 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-300 uppercase whitespace-nowrap shadow-sm z-20">
                                +{m.reward.xp} XP
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Current Node */}
                      {m.status === 'current' && (
                        <div className="w-14 h-14 rounded-full bg-card-lime border-4 border-primary shadow-xl flex items-center justify-center text-primary-dark hover:scale-110 transition-transform relative">
                          <span className="absolute -top-7 bg-primary text-card-lime text-[9px] font-black px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-wider shadow-sm">
                            Day {m.day} Inning
                          </span>
                          <PlayCircle size={26} strokeWidth={2.5} className="text-primary-dark" />
                          <div className="absolute -inset-2.5 rounded-full border-2 border-card-lime animate-ping opacity-60 pointer-events-none" />
                          <span className="absolute -bottom-6 bg-primary text-card-lime text-[9px] font-black px-1.5 py-0.5 rounded border border-primary/20 uppercase whitespace-nowrap shadow-sm">
                            In Play
                          </span>
                        </div>
                      )}

                      {/* Upcoming locked nodes */}
                      {m.status === 'upcoming' && (
                        <div className="w-10 h-10 rounded-full bg-white border-4 border-border shadow-sm flex items-center justify-center text-muted-foreground font-bold text-xs select-none relative group/locked hover:scale-105 transition-all">
                          <span className="group-hover/locked:hidden">{m.day}</span>
                          <Lock size={14} className="hidden group-hover/locked:block text-muted-foreground" />
                          <span className="absolute -bottom-6 bg-white text-muted-foreground text-[8px] font-bold px-1 py-0.5 rounded border border-border uppercase whitespace-nowrap shadow-inner">
                            Locked
                          </span>
                        </div>
                      )}

                      {/* Tooltip Hover Cards */}
                      <div className="absolute left-16 bg-card border border-border p-4 rounded-2xl shadow-xl w-60 z-50 flex flex-col gap-1 text-left tooltip-container">
                        <span className="text-[10px] text-primary font-black uppercase tracking-wider">
                          Day {m.day} • {m.status} {isClaimed && "• Claimed"}
                        </span>
                        <h5 className="font-extrabold text-sm text-foreground">{m.name}</h5>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{m.desc}</p>
                        <div className="mt-2 pt-1 border-t border-border/40 flex items-center gap-1.5 text-[10px] font-black text-amber-600">
                          {renderRewardIcon(m.reward.iconType, 12)}
                          <span>GIFT: {m.reward.title} (+{m.reward.xp} XP)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

        </div>

        {/* Right Column - Cohort Analytics / Overview (4/12 width) */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Journey Status overview */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-base mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Championship Standing
            </h3>
            
            <div className="flex flex-col gap-4 bg-secondary/30 rounded-2xl p-4 border border-border/30 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0">
                  <Trophy size={24} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">Level {level} Match Player</h4>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    {xp} / 2,000 XP to Level {level + 1}
                  </p>
                </div>
              </div>

              {/* Graphical XP Progress Bar */}
              <div className="w-full flex flex-col gap-1">
                <div className="w-full h-2.5 bg-card/60 rounded-full overflow-hidden p-0.5 border border-border/20">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{ width: `${(xp / 2000) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-black text-primary/70 px-0.5">
                  <span>{(xp / 2000 * 100).toFixed(0)}% PROGRESS</span>
                  <span>{2000 - xp} XP LEFT</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span>Completed Innings: {Object.keys(claimed).length * 7 + 1} Days</span>
                <span className="text-primary font-extrabold">{Object.keys(claimed).length * 70 + 80} runs logged</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span>Wickets Avoided: 12 Wickets</span>
                <span className="text-accent font-extrabold">88.5% adherence</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span>Active Rank: #3 In Village</span>
                <span className="text-primary-dark font-extrabold">Gopalpur League</span>
              </div>
            </div>
          </div>

          {/* Active Level Rewards unlocked */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h3 className="font-extrabold text-base mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Unlocked Achievements
            </h3>
            
            <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-hide">
              {allAchievements.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center font-bold py-6">
                  No milestones claimed yet. Clear day goals to claim gifts!
                </p>
              ) : (
                allAchievements.map((r, i) => (
                  <div key={i} className="flex items-start gap-3.5 p-3 rounded-xl bg-background border border-border/30 animate-scale-up">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary shrink-0 mt-0.5 shadow-sm">
                      <Award size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-1.5 w-full">
                        <h5 className="text-xs font-extrabold text-foreground truncate">{r.name}</h5>
                        <span className="text-[10px] font-black text-accent shrink-0">{r.xp}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-bold">{r.rank}</span>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-1 font-medium truncate">{r.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Milestone Claiming Modal */}
      {selectedMilestone && (
        <div 
          className="fixed inset-0 bg-black/55 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          onClick={() => setSelectedMilestone(null)}
        >
          <div 
            className="bg-card w-full max-w-lg rounded-[32px] border border-border overflow-hidden shadow-2xl animate-scale-up text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-border/40 flex justify-between items-center bg-background">
              <div>
                <span className="text-[10px] text-primary font-black uppercase tracking-wider">
                  Day {selectedMilestone.day} Inning • {selectedMilestone.stage.toUpperCase()} STAGE
                </span>
                <h3 className="font-extrabold text-lg text-primary-dark mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                  {selectedMilestone.name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedMilestone(null)}
                className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors shadow-sm"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-6">
              <div>
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-1.5">Description</h4>
                <p className="text-xs text-foreground leading-relaxed font-semibold">
                  {selectedMilestone.desc}
                </p>
              </div>

              {/* Rewards Checklist */}
              <div>
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-3">Milestone Gift Contents:</h4>
                <div className="flex flex-col gap-3">
                  
                  {/* XP Reward card */}
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl shadow-inner">
                    <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Star className="fill-white" size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-700 font-black uppercase tracking-wider block">XP Reward</span>
                      <strong className="text-md font-black text-amber-900">+{selectedMilestone.reward.xp} Experience Points</strong>
                    </div>
                  </div>

                  {/* Items List */}
                  {selectedMilestone.reward.items.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-secondary/15 border border-border/20 rounded-2xl">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-primary shrink-0 shadow-inner">
                        {renderRewardIcon(selectedMilestone.reward.iconType, 14)}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-foreground leading-tight mt-0.5">{item}</h5>
                        <span className="text-[9px] text-muted-foreground font-bold">Guaranteed Unlocked Reward</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer CTA */}
            <div className="px-6 py-5 bg-background border-t border-border/40 flex flex-col items-center gap-3">
              {/* Claim Button Logic */}
              {selectedMilestone.status === 'completed' && (
                <>
                  {claimed[selectedMilestone.id] ? (
                    <button 
                      disabled
                      className="w-full py-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-black text-xs flex items-center justify-center gap-2 select-none"
                    >
                      <CheckCircle size={16} /> REWARDS CLAIMED SUCCESSFULLY
                    </button>
                  ) : (
                    <button 
                      onClick={() => claimReward(selectedMilestone.id)}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-accent hover:opacity-90 active:scale-95 transition-all text-white font-black text-xs shadow-lg flex items-center justify-center gap-2"
                    >
                      <Gift size={16} className="animate-wiggle" /> CLAIM MILESTONE REWARDS
                    </button>
                  )}
                </>
              )}

              {selectedMilestone.status === 'current' && (
                <div className="w-full flex flex-col gap-2">
                  <button 
                    onClick={() => simulateInningCompletion(selectedMilestone.id)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-dark to-primary hover:opacity-90 active:scale-95 text-white font-black text-xs shadow-md flex items-center justify-center gap-2"
                  >
                    <Sparkles size={14} /> SIMULATE DAY COMPLETION
                  </button>
                  <p className="text-[9px] text-center text-muted-foreground font-bold">
                    Mark this day's innings as completed to unlock the reward claim!
                  </p>
                </div>
              )}

              {selectedMilestone.status === 'upcoming' && (
                <div className="w-full flex flex-col gap-2">
                  <button 
                    onClick={() => simulateInningCompletion(selectedMilestone.id)}
                    className="w-full py-3.5 rounded-2xl bg-secondary text-primary hover:bg-primary hover:text-white transition-all font-black text-xs flex items-center justify-center gap-2 border border-primary/20"
                  >
                    <Sparkles size={14} /> DEBUG: UNLOCK MILESTONE
                  </button>
                  <p className="text-[9px] text-center text-muted-foreground font-bold">
                    Currently Locked. Reach Day {selectedMilestone.day} or use the override simulation above!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Level Up Splash Overlay */}
      {showLevelUp !== null && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-[32px] border border-primary/20 p-8 text-center shadow-2xl relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/10 rounded-full blur-[40px] pointer-events-none" />
            
            <div className="w-20 h-20 rounded-full bg-secondary text-primary mx-auto flex items-center justify-center shadow-lg mb-6 relative">
              <Trophy size={44} className="text-primary animate-bounce" />
              <Sparkles size={24} className="absolute -top-1 -right-1 text-amber-500 fill-amber-500 animate-pulse" />
            </div>
            
            <span className="text-[11px] bg-primary/15 text-primary font-black px-3 py-1 rounded-full uppercase tracking-widest">
              Level Up! 🌟
            </span>
            
            <h2 className="text-3xl font-black text-foreground mt-4 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Level {showLevelUp} Reached
            </h2>
            
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
              Congratulations, {userName.split(' ')[0]}! You are now a
            </p>
            <p className="text-base font-black text-primary mt-1 mb-6">
              Level {showLevelUp} Champion Match Player
            </p>
            
            <div className="bg-secondary/20 border border-border/30 rounded-2xl p-4 text-left mb-6">
              <h4 className="text-xs font-black text-primary uppercase tracking-wide mb-2">Unlocked Benefits:</h4>
              <ul className="text-xs text-muted-foreground font-semibold flex flex-col gap-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Advanced fasting window metrics unlocked in VivoAI Coach
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Championship Village League score multiplier +1.2x
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Priority booking for clinical consultant check-ins
                </li>
              </ul>
            </div>
            
            <button
              onClick={() => setShowLevelUp(null)}
              className="w-full py-4 rounded-2xl bg-primary text-white hover:bg-accent active:scale-95 transition-all font-black text-sm shadow-xl"
            >
              Keep Chasing Boundaries
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

