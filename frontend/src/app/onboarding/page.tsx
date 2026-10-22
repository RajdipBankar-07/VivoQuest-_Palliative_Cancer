'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Check, 
  Play, 
  ShieldCheck, 
  Lock, 
  Sparkles,
  Globe,
  Activity,
  User,
  Heart,
  ChevronRight,
  Plus,
  X
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';

const API_BASE = getApiBaseUrl();


const STEPS = [
  'welcome',
  'premium-pick',
  'ready'
];

export default function OnboardingPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  // Form states
  const [language, setLanguage] = useState('English');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(24);
  const [consentApproved, setConsentApproved] = useState(false);
  const [selectedSport, setSelectedSport] = useState('Sports (LIVE)');
  const [selectedPersona, setSelectedPersona] = useState('Adult 20-50');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['Metabolic Score Optimization']);
  
  // Lifestyle questionnaire
  const [sleepHours, setSleepHours] = useState('7-8 hours');
  const [activityLevel, setActivityLevel] = useState('Moderate (5k-8k steps)');
  
  const [selectedCommunity, setSelectedCommunity] = useState('Corporate Wellness League');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  
  // Premium & checkout states
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'PRO'>('FREE');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  
  // Email Auth mode
  const [authMode, setAuthMode] = useState<'otp' | 'login' | 'register'>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP focus refs
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // OTP Timer countdown
  useEffect(() => {
    if (step === 'otp' && otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, otpTimer]);

  // Handle Ready Step Confetti
  useEffect(() => {
    if (step === 'ready') {
      import('canvas-confetti').then((module) => {
        const confettiFn = module.default || module;
        confettiFn({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#1A5229', '#3AAB55', '#C8E882', '#FFFFFF']
        });
      }).catch(err => console.error('Failed to load canvas-confetti', err));
    }
  }, [step]);

  const nextStep = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(s => s + 1);
    } else {
      // Set default demo cookies if not set by API
      if (!document.cookie.includes('vivo_token')) {
        document.cookie = "vivo_token=demo-token-123; path=/; max-age=604800";
        document.cookie = "vivo_role=SUPER_ADMIN; path=/; max-age=604800";
        document.cookie = "vivo_tier=ENTERPRISE; path=/; max-age=604800";
      }
      router.push('/dashboard');
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) setStepIndex(s => s - 1);
  };

  // OTP Input navigation
  const handleOtpChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return;
    const newOtp = [...otp];
    newOtp[index] = val.substring(val.length - 1);
    setOtp(newOtp);

    // Auto-advance
    if (val && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const toggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  // Removed auth & otp logic as it's now handled in dedicated pages.

  // Push user profile updates to backend before entering dashboard
  const submitProfilePayload = async () => {
    setLoading(true);
    const token = localStorage.getItem('vivo_token');
    
    // Map goals/personas to values
    const payload = {
      language,
      sport_preference: selectedSport,
      persona_type: selectedPersona === 'Teenager (13-19)' ? 'TEEN' : 
                    selectedPersona === 'Adult 50-80' ? 'ELDER' : 
                    selectedPersona === 'Sports Enthusiast' ? 'ATHLETE' : 'ADULT',
      connected_wearables: ['Google Fit', 'Apple Health'], // default
    };

    try {
      const res = await fetch(`${API_BASE}/api/auth/profile/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setLoading(false);
        nextStep();
      } else {
        setLoading(false);
        // Fail gracefully, allow proceeding in demo
        nextStep();
      }
    } catch (err) {
      setLoading(false);
      nextStep();
    }
  };

  const handleOnboardingUpgrade = async (plan: 'FREE' | 'PRO') => {
    if (plan === 'FREE') {
      nextStep();
      return;
    }
    
    setPaymentProcessing(true);
    setPaymentError('');
    const token = localStorage.getItem('vivo_token');
    
    try {
      const res = await fetch(`${API_BASE}/api/billing/upgrade/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('vivo_tier', data.plan);
        document.cookie = `vivo_tier=${data.plan}; path=/; max-age=2592000`;
        
        // Show payment success details
        setPaymentSuccess(true);
        setTimeout(() => {
          setPaymentOpen(false);
          setPaymentSuccess(false);
          nextStep();
        }, 1500);
      } else {
        setPaymentError(data.error || 'Failed to process sandbox payment.');
        setPaymentProcessing(false);
      }
    } catch (err) {
      setPaymentError('Unable to reach payment sandbox API.');
      setPaymentProcessing(false);
    }
  };

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { x: -50, opacity: 0, transition: { duration: 0.3 } }
  };

  const renderProgressHeader = (title: string, subtitle: string) => (
    <div className="pt-12 pb-6 px-8 relative border-b border-border/40 shrink-0">
      <div className="flex items-center mb-6">
        <button 
          onClick={prevStep} 
          className="text-muted-foreground hover:text-foreground active:scale-95 transition-all p-2 rounded-full hover:bg-secondary shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <div 
          className="mx-auto text-primary font-bold tracking-widest uppercase text-xs" 
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Step {stepIndex + 1} of {STEPS.length}
        </div>
        <div className="w-10" />
      </div>
      <h1 
        className="text-foreground mb-2 text-center text-3xl font-extrabold" 
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {title}
      </h1>
      <p 
        className="text-muted-foreground text-center text-sm font-medium" 
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {subtitle}
      </p>
      
      {/* Dynamic progress bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-secondary w-full">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 bg-background flex w-full h-[100dvh] overflow-hidden select-none">
      
      {/* Left Branding Panel */}
      <div className="hidden lg:flex flex-col w-2/5 bg-gradient-to-br from-primary-dark via-primary to-accent p-10 justify-center relative overflow-hidden shadow-2xl z-10">
        <div className="z-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
              <div className="w-5 h-5 border-[3px] border-primary rounded-full opacity-90" />
            </div>
            <span className="text-white text-2xl font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>
              VivoQuest
            </span>
          </div>
          
          <h2 className="text-white text-4xl font-extrabold leading-tight mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Play the game of <br/>
            <span className="text-card-lime">Metabolic Health.</span>
          </h2>
          <p className="text-white/80 text-base max-w-md leading-relaxed font-medium" style={{ fontFamily: 'var(--font-body)' }}>
            Daily habit targets score runs. Health risks avoid wickets. Compete together with family, friends, and villages to boost your scores.
          </p>
        </div>

        {/* Floating circles */}
        <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-white rounded-full blur-[120px] opacity-10 pointer-events-none" />
        <div className="absolute top-32 -right-32 w-[500px] h-[500px] bg-card-lime rounded-full blur-[100px] opacity-20 pointer-events-none" />
      </div>

      {/* Right Content Panel */}
      <div className="flex-1 flex flex-col h-full bg-background relative z-0">
        <div className="flex-1 flex flex-col h-full w-full max-w-2xl mx-auto overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex-1 flex flex-col h-full w-full justify-between"
            >
              
              {/* Step 1: Splash Screen */}
              {step === 'splash' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-background to-secondary/30">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-2xl mb-6 animate-pulse">
                    <Activity size={40} className="text-white" />
                  </div>
                  <h1 className="text-4xl font-black text-primary mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                    VivoQuest
                  </h1>
                  <p className="text-muted-foreground text-base max-w-sm font-medium mb-10">
                    Indian Multigenerational Metabolic League. Score runs for your health and community.
                  </p>
                  <button 
                    onClick={nextStep}
                    className="py-4 px-12 rounded-full bg-primary text-white font-bold hover:bg-accent transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 text-base"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Enter League Arena
                  </button>
                </div>
              )}

              {/* Step 2: Language Selection */}
              {step === 'language' && (
                <>
                  {renderProgressHeader('Select Language', 'Choose your preferred local language')}
                  <div className="flex-1 p-8 overflow-y-auto flex flex-col justify-center gap-4">
                    {[
                      { code: 'en', label: 'English', desc: 'Default system language' },
                      { code: 'hi', label: 'हिन्दी (Hindi)', desc: 'हिंदी भाषा विकल्प' },
                      { code: 'te', label: 'తెలుగు (Telugu)', desc: 'తెలుగు భాషా ఎంపిక' },
                      { code: 'ta', label: 'தமிழ் (Tamil)', desc: 'தமிழ் மொழி விருப்பம்' },
                      { code: 'mr', label: 'मराठी (Marathi)', desc: 'मराठी भाषा पर्याय' },
                    ].map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.label)}
                        className={`p-5 rounded-2xl border-2 text-left flex justify-between items-center transition-all ${
                          language === lang.label 
                            ? 'border-primary bg-secondary' 
                            : 'border-border bg-card hover:bg-secondary/20'
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-base text-foreground">{lang.label}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{lang.desc}</p>
                        </div>
                        {language === lang.label && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="p-8 border-t border-border/40 bg-card flex justify-end">
                    <button 
                      onClick={nextStep}
                      className="py-4 px-8 rounded-full bg-primary text-white font-bold text-sm w-full md:w-auto shadow-lg hover:opacity-95"
                    >
                      Next: Welcome Pitch
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Welcome Pitch */}
              {step === 'welcome' && (
                <div className="flex-1 p-8 flex flex-col items-center justify-center text-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-primary shadow-inner">
                    <Sparkles size={32} />
                  </div>
                  <h2 className="text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                    Your Health is a Team Match!
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-md leading-relaxed font-semibold">
                    No strict calorie counters. Instead, we play like sports. Log meals inside the Metabolic Plate segments, perform walking innings, and earn trophies for your village, school, or corporate team.
                  </p>
                  <div className="flex flex-col gap-3 w-full max-w-sm mt-4">
                    <button 
                      onClick={nextStep}
                      className="py-4 px-8 rounded-full bg-primary text-white font-bold hover:bg-accent transition-all shadow-md"
                    >
                      Get My Player Cap
                    </button>
                    {stepIndex > 0 && (
                      <button 
                        onClick={prevStep}
                        className="text-xs text-muted-foreground font-bold hover:text-primary transition-colors"
                      >
                        Go Back
                      </button>
                    )}
                  </div>
                </div>
              )}



              {/* Step 6: DPDP Compliance Consent */}
              {step === 'compliance' && (
                <>
                  {renderProgressHeader('Regulatory Consent', 'Your health data is protected under India DPDP Act')}
                  <div className="flex-1 p-8 overflow-y-auto flex flex-col justify-center gap-6">
                    <div className="bg-card border border-border p-6 rounded-[24px] flex flex-col gap-4 max-w-md mx-auto">
                      <div className="flex gap-3 text-primary">
                        <ShieldCheck size={28} className="shrink-0" />
                        <h4 className="font-extrabold text-base text-foreground">Data Privacy Commitments</h4>
                      </div>
                      <ul className="text-xs text-muted-foreground font-semibold list-disc pl-5 flex flex-col gap-2.5">
                        <li>All biometric data resides physically inside Indian AWS servers (Mumbai Region).</li>
                        <li>Fully compliant with the Digital Personal Data Protection (DPDP) Act 2023.</li>
                        <li>Interoperable with ABHA (Ayushman Bharat Health Account) guidelines.</li>
                        <li>Your data is never shared with third parties or advertisers without explicit consent.</li>
                      </ul>
                      <label className="flex items-center gap-3 mt-4 select-none cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={consentApproved}
                          onChange={e => setConsentApproved(e.target.checked)}
                          className="w-5 h-5 accent-primary border border-border rounded"
                        />
                        <span className="text-xs text-foreground font-bold">I authorize data sync and accept terms</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-8 border-t border-border/40 bg-card flex justify-end shrink-0">
                    <button 
                      onClick={nextStep}
                      disabled={!consentApproved}
                      className="py-4 px-8 rounded-full bg-primary text-white font-bold text-sm w-full md:w-auto shadow-lg disabled:opacity-50 hover:bg-accent transition-all"
                    >
                      Agree & Proceed
                    </button>
                  </div>
                </>
              )}

              {/* Step 7: Sport Selector */}
              {step === 'sport-pick' && (
                <>
                  {renderProgressHeader('Choose Your Sport', 'Your daily logs and goals will score like your favorite sport')}
                  <div className="flex-1 p-8 overflow-y-auto flex flex-col justify-center gap-4">
                    {[
                      { name: 'Sports (LIVE)', tag: 'Cricket themed rules, runs, boundaries & wickets', fan: '1.3B Players Active', live: true },
                      { name: 'Basketball (Q4 2026)', tag: 'Baskets, dunks, points & turnovers. Launching Q4', fan: '400M Fans Registered', live: false },
                      { name: 'Formula 1 (2027)', tag: 'Laps, podium finishes, pit stops & penalties. Launching 2027', fan: '750M Fans Registered', live: false },
                    ].map(sport => (
                      <button
                        key={sport.name}
                        disabled={!sport.live}
                        onClick={() => setSelectedSport(sport.name)}
                        className={`p-6 rounded-[24px] border-2 text-left flex flex-col gap-2 relative transition-all ${
                          !sport.live ? 'opacity-50 cursor-not-allowed bg-secondary/10 border-dashed border-border' :
                          selectedSport === sport.name 
                            ? 'border-primary bg-secondary' 
                            : 'border-border bg-card hover:bg-secondary/20'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <h4 className="font-extrabold text-lg text-foreground">{sport.name}</h4>
                          {sport.live ? (
                            <span className="text-[10px] font-black text-primary bg-card-lime px-2.5 py-1 rounded-full uppercase tracking-wider">LIVE</span>
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground bg-border px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1"><Lock size={10} /> LOCKED</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">{sport.tag}</p>
                        <span className="text-xs text-primary font-bold">{sport.fan}</span>
                      </button>
                    ))}
                  </div>

                  <div className="p-8 border-t border-border/40 bg-card flex justify-end shrink-0">
                    <button 
                      onClick={nextStep}
                      className="py-4 px-8 rounded-full bg-primary text-white font-bold text-sm w-full md:w-auto shadow-lg hover:bg-accent transition-all"
                    >
                      Next: Select Persona
                    </button>
                  </div>
                </>
              )}

              {/* Step 8: Persona Selector */}
              {step === 'persona' && (
                <>
                  {renderProgressHeader('Select Your Persona', 'Personalize the journey based on your demographic profile')}
                  <div className="flex-1 p-8 overflow-y-auto flex flex-col justify-center gap-4">
                    {[
                      { name: 'Teenager (13-19)', tag: 'Lifelong habits, movement streaks, school wellness challenges' },
                      { name: 'Adult 20-50', tag: 'Weight regulation, sleep quality, corporate league performance' },
                      { name: 'Adult 50-80', tag: 'Longevity, strength preservation, voice logs, large-text UI' },
                      { name: 'Sports Enthusiast', tag: 'CGM tracking, metabolic thresholds, recovery optimization' }
                    ].map(persona => (
                      <button
                        key={persona.name}
                        onClick={() => setSelectedPersona(persona.name)}
                        className={`p-5 rounded-2xl border-2 text-left flex justify-between items-center transition-all ${
                          selectedPersona === persona.name 
                            ? 'border-primary bg-secondary' 
                            : 'border-border bg-card hover:bg-secondary/20'
                        }`}
                      >
                        <div className="max-w-[85%]">
                          <h4 className="font-extrabold text-base text-foreground">{persona.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">{persona.tag}</p>
                        </div>
                        {selectedPersona === persona.name && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-8 border-t border-border/40 bg-card flex justify-end shrink-0">
                    <button 
                      onClick={nextStep}
                      className="py-4 px-8 rounded-full bg-primary text-white font-bold text-sm w-full md:w-auto shadow-lg hover:bg-accent transition-all"
                    >
                      Next: Choose Health Goals
                    </button>
                  </div>
                </>
              )}

              {/* Step 9: Goals Selector */}
              {step === 'goals' && (
                <>
                  {renderProgressHeader('Your Health Targets', 'Choose what metabolic markers you wish to focus on')}
                  <div className="flex-1 p-8 overflow-y-auto flex flex-col justify-center gap-3">
                    {[
                      'Metabolic Score Optimization',
                      'Weight Management & Fat Loss',
                      'Glucose Control & Prediabetes Triage',
                      'Stress Reduction & Mindfulness',
                      'Deep Sleep Adherence',
                      'Daily Movement Streaks & Fitness'
                    ].map(goal => {
                      const isSelected = selectedGoals.includes(goal);
                      return (
                        <button
                          key={goal}
                          onClick={() => toggleGoal(goal)}
                          className={`p-5 rounded-2xl border-2 text-left flex justify-between items-center transition-all ${
                            isSelected 
                              ? 'border-primary bg-secondary' 
                              : 'border-border bg-card hover:bg-secondary/20'
                          }`}
                        >
                          <span className="font-bold text-sm text-foreground">{goal}</span>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                            isSelected 
                              ? 'bg-primary border-primary text-white' 
                              : 'border-border'
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-8 border-t border-border/40 bg-card flex justify-end shrink-0">
                    <button 
                      onClick={nextStep}
                      disabled={selectedGoals.length === 0}
                      className="py-4 px-8 rounded-full bg-primary text-white font-bold text-sm w-full md:w-auto shadow-lg disabled:opacity-50 hover:bg-accent transition-all"
                    >
                      Next: Lifestyle Profile
                    </button>
                  </div>
                </>
              )}

              {/* Step 10: Lifestyle Profiling */}
              {step === 'lifestyle' && (
                <>
                  {renderProgressHeader('Lifestyle Profiling', 'Let us map your baseline sleep and activity rates')}
                  <div className="flex-1 p-8 overflow-y-auto flex flex-col justify-center gap-6 max-w-md mx-auto w-full">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">Average Nightly Sleep</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['Under 6 hrs', '7-8 hours', 'Over 8 hrs'].map(hr => (
                          <button
                            key={hr}
                            type="button"
                            onClick={() => setSleepHours(hr)}
                            className={`py-3 rounded-xl border-2 font-bold text-xs text-center transition-all ${
                              sleepHours === hr ? 'border-primary bg-secondary text-primary' : 'border-border bg-card text-muted-foreground'
                            }`}
                          >
                            {hr}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">Daily Step Baseline</label>
                      <div className="flex flex-col gap-3">
                        {[
                          'Sedentary (< 5,000 steps)',
                          'Moderate (5,000 - 8,000 steps)',
                          'Active (> 8,000 steps)'
                        ].map(act => (
                          <button
                            key={act}
                            type="button"
                            onClick={() => setActivityLevel(act)}
                            className={`p-4 rounded-xl border-2 text-left text-xs font-bold transition-all ${
                              activityLevel === act ? 'border-primary bg-secondary text-primary' : 'border-border bg-card text-muted-foreground'
                            }`}
                          >
                            {act}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-8 border-t border-border/40 bg-card flex justify-end shrink-0">
                    <button 
                      onClick={nextStep}
                      className="py-4 px-8 rounded-full bg-primary text-white font-bold text-sm w-full md:w-auto shadow-lg hover:bg-accent transition-all"
                    >
                      Next: Choose League
                    </button>
                  </div>
                </>
              )}

              {/* Step 11: Community Selector */}
              {step === 'community-pick' && (
                <>
                  {renderProgressHeader('Choose Your Community', 'Join a league and score for your local squad')}
                  <div className="flex-1 p-8 overflow-y-auto flex flex-col justify-center gap-4">
                    {[
                      { name: 'Corporate Wellness League', tag: 'Compete in department rosters and employer scoreboards', members: '150 active teams' },
                      { name: 'Village & Local Leagues', tag: 'ASHA-led rural wellness tournaments and municipal ranking tables', members: '42 villages competing' },
                      { name: 'School Sports Leagues', tag: 'Classroom matches, student streaks, and parent cheer circles', members: '80 schools active' },
                      { name: 'Private Family Circle', tag: 'Private room with immediate relatives. Cheer on Maa and Papa', members: 'Invites ready' }
                    ].map(c => (
                      <button
                        key={c.name}
                        onClick={() => setSelectedCommunity(c.name)}
                        className={`p-5 rounded-2xl border-2 text-left flex justify-between items-center transition-all ${
                          selectedCommunity === c.name 
                            ? 'border-primary bg-secondary' 
                            : 'border-border bg-card hover:bg-secondary/20'
                        }`}
                      >
                        <div className="max-w-[80%]">
                          <h4 className="font-extrabold text-sm text-foreground">{c.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">{c.tag}</p>
                          <span className="text-[10px] text-primary bg-secondary px-2 py-0.5 rounded-full inline-block mt-2 font-bold">{c.members}</span>
                        </div>
                        {selectedCommunity === c.name && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-8 border-t border-border/40 bg-card flex justify-end shrink-0">
                    <button 
                      onClick={submitProfilePayload}
                      className="py-4 px-8 rounded-full bg-primary text-white font-bold text-sm w-full md:w-auto shadow-lg hover:bg-accent transition-all"
                    >
                      Next: Meet VivoAI
                    </button>
                  </div>
                </>
              )}

              {/* Step 12: AI Intro */}
              {step === 'ai-intro' && (
                <>
                  <div className="flex-1 p-12 flex flex-col items-center justify-center gap-8 text-center">
                    <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-xl animate-bounce relative">
                      <div className="w-16 h-16 rounded-full border-4 border-dashed border-white/40 absolute animate-spin" />
                      <span className="text-5xl">🤖</span>
                    </div>
                    <h2 
                      className="text-4xl font-extrabold text-primary"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Meet VivoAI Coach
                    </h2>
                    <p 
                      className="text-muted-foreground text-base max-w-md leading-relaxed font-semibold"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      "Namaste! I am your quiet AI coach. I will read your metabolic data, meals, and wearable telemetry to deliver exactly one high-impact insight per day. No clutter, just boundaries."
                    </p>
                    <div className="inline-flex gap-2 items-center text-xs font-bold text-primary bg-secondary px-4 py-2 rounded-full border border-primary/10">
                      ✨ Clinical-grade feedback engine
                    </div>
                  </div>
                  <div className="p-8 border-t border-border/40 bg-card flex justify-end shrink-0">
                    <button 
                      onClick={nextStep}
                      className="py-4 px-8 rounded-full bg-primary text-white font-bold text-sm w-full md:w-auto shadow-lg hover:bg-accent transition-all"
                    >
                      Proceed to Scoreboard
                    </button>
                  </div>
                </>
              )}

              {/* Step 13: Premium Plan Selection */}
              {step === 'premium-pick' && (
                <>
                  {renderProgressHeader('Choose Your League Tier', 'Select a plan to unlock advanced clinical features')}
                  <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-center gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Free Tier */}
                      <button
                        type="button"
                        onClick={() => setSelectedPlan('FREE')}
                        className={`p-6 rounded-[24px] border-2 text-left flex flex-col justify-between relative transition-all ${
                          selectedPlan === 'FREE'
                            ? 'border-primary bg-secondary/35'
                            : 'border-border bg-card hover:bg-secondary/10'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-primary bg-secondary px-2.5 py-1 rounded-full uppercase">FREE</span>
                            <span className="text-xl font-bold">₹0</span>
                          </div>
                          <h4 className="font-extrabold text-lg text-foreground">Free Agent</h4>
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-semibold">
                            Basic metabolic logging, step tracking, and public regional community leaderboards.
                          </p>
                          <ul className="text-[10px] text-muted-foreground mt-4 flex flex-col gap-2 list-inside list-disc font-medium">
                            <li>Indian Metabolic Plate logs</li>
                            <li>Daily step innings tracking</li>
                            <li>Basic local village leaderboard</li>
                          </ul>
                        </div>
                      </button>

                      {/* Pro Tier */}
                      <button
                        type="button"
                        onClick={() => setSelectedPlan('PRO')}
                        className={`p-6 rounded-[24px] border-2 text-left flex flex-col justify-between relative transition-all ${
                          selectedPlan === 'PRO'
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card hover:bg-secondary/10'
                        }`}
                      >
                        <div className="absolute -top-3 right-4 bg-card-lime text-primary-dark font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
                          RECOMMENDED
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-primary-dark bg-card-lime px-2.5 py-1 rounded-full uppercase">PRO</span>
                            <span className="text-xl font-black text-primary">₹199<span className="text-xs font-semibold text-muted-foreground">/mo</span></span>
                          </div>
                          <h4 className="font-extrabold text-lg text-foreground">Pro Player</h4>
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-semibold">
                            Continuous biometric sync, personalized AI coach insights, and private relative circles.
                          </p>
                          <ul className="text-[10px] text-primary-dark mt-4 flex flex-col gap-2 list-inside list-disc font-bold">
                            <li>Connect wearable CGM telemetry</li>
                            <li>Continuous AI-Coach predictions</li>
                            <li>Private family cheer circles</li>
                          </ul>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="p-8 border-t border-border/40 bg-card flex justify-between items-center shrink-0">
                    <button 
                      type="button"
                      onClick={() => handleOnboardingUpgrade('FREE')}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground"
                    >
                      Skip Plan selection (Keep Free)
                    </button>
                    {selectedPlan === 'PRO' ? (
                      <button 
                        type="button"
                        onClick={() => setPaymentOpen(true)}
                        className="py-4 px-8 rounded-full bg-primary text-white font-bold text-sm shadow-lg hover:bg-accent transition-all"
                      >
                        Upgrade & Pay ₹199
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => handleOnboardingUpgrade('FREE')}
                        className="py-4 px-8 rounded-full bg-primary text-white font-bold text-sm shadow-lg hover:bg-accent transition-all"
                      >
                        Continue with Free
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Step 14: Ready */}
              {step === 'ready' && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 bg-primary-dark w-full h-full relative overflow-hidden text-center justify-between text-white">
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-card-lime rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none" />
                  
                  <div className="my-auto flex flex-col items-center gap-8">
                    <div className="w-24 h-24 rounded-full bg-card-lime flex items-center justify-center shadow-2xl animate-pulse">
                      <Check size={48} className="text-primary-dark" strokeWidth={3} />
                    </div>
                    <h1 
                      className="text-white text-5xl font-extrabold leading-tight z-10" 
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      You are in the match!
                    </h1>
                    <p 
                      className="text-card-lime text-xl font-medium max-w-md z-10" 
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Your metabolic scoring engine is wired. Compete in {selectedCommunity} using {selectedSport} guidelines.
                    </p>
                  </div>

                  <button 
                    onClick={submitProfilePayload}
                    disabled={loading}
                    className="w-full py-5 rounded-full bg-card-lime text-primary-dark flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl hover:bg-white hover:scale-[1.02] z-10 font-black text-xl disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-primary-dark/30 border-t-primary-dark rounded-full animate-spin" />
                    ) : (
                      <>Enter Dashboard <Play size={20} fill="currentColor" /></>
                    )}
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Onboarding Payment Gateway Checkout Overlay */}
      {paymentOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-card border border-border/50 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-border/45 flex justify-between items-center bg-background">
              <div>
                <span className="text-[9px] text-primary font-black uppercase tracking-wider">SECURE CHECKOUT</span>
                <h3 className="font-extrabold text-base text-primary-dark" style={{ fontFamily: 'var(--font-heading)' }}>Razorpay Payment Gateway</h3>
              </div>
              <button 
                type="button"
                onClick={() => setPaymentOpen(false)}
                className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors shadow-sm"
              >
                <X size={14} />
              </button>
            </div>

            {/* Payment Content */}
            <div className="p-6 flex flex-col gap-5">
              
              {paymentSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner animate-pulse">
                    <Check size={32} strokeWidth={3} className="text-emerald-800" />
                  </div>
                  <h4 className="text-lg font-extrabold text-emerald-800">Payment Successful!</h4>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Your Pro Player features have been unlocked. Preparing your scoreboard...
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center bg-secondary/35 p-4 rounded-2xl border border-border/20 text-xs font-bold">
                    <span className="text-muted-foreground">Order: Pro Player Tier</span>
                    <span className="text-primary">₹199.00</span>
                  </div>

                  {paymentError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-[11px] font-bold">
                      ⚠️ {paymentError}
                    </div>
                  )}

                  {/* Payment Methods tabs */}
                  <div className="flex gap-2 p-1 bg-secondary/35 rounded-xl border border-border/25">
                    <button 
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                        paymentMethod === 'upi' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      UPI (GPay / PhonePe)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                        paymentMethod === 'card' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      Credit / Debit Card
                    </button>
                  </div>

                  {/* UPI Inputs */}
                  {paymentMethod === 'upi' && (
                    <div className="flex flex-col gap-1.5 text-xs">
                      <label className="text-muted-foreground font-bold uppercase tracking-wide">Enter UPI ID</label>
                      <input 
                        type="text"
                        value={upiId}
                        onChange={e => setUpiId(e.target.value)}
                        placeholder="rajdipbankar@okaxis"
                        className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                      />
                      <span className="text-[10px] text-muted-foreground font-medium mt-0.5">Format: username@bankname</span>
                    </div>
                  )}

                  {/* Card Inputs */}
                  {paymentMethod === 'card' && (
                    <div className="flex flex-col gap-4 text-xs">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-muted-foreground font-bold uppercase tracking-wide">Card Number</label>
                        <input 
                          type="text"
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value)}
                          placeholder="4111 2222 3333 4444"
                          className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-muted-foreground font-bold uppercase tracking-wide">Expiry Date</label>
                          <input 
                            type="text"
                            value={cardExpiry}
                            onChange={e => setCardExpiry(e.target.value)}
                            placeholder="MM/YY"
                            className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-muted-foreground font-bold uppercase tracking-wide">CVV</label>
                          <input 
                            type="password"
                            value={cardCvv}
                            onChange={e => setCardCvv(e.target.value)}
                            placeholder="•••"
                            maxLength={3}
                            className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <button 
                    type="button"
                    onClick={() => handleOnboardingUpgrade('PRO')}
                    disabled={paymentProcessing || (paymentMethod === 'upi' && !upiId) || (paymentMethod === 'card' && (!cardNumber || !cardExpiry || !cardCvv))}
                    className="w-full py-4 bg-primary hover:bg-accent text-white font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {paymentProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Pay ₹199 & Unlock Pro</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
