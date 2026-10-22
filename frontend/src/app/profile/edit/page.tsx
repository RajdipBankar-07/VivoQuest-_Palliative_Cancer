'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../../components/AppLayout';
import { 
  ChevronLeft, 
  Check, 
  Sparkles, 
  Lock, 
  Upload, 
  Shield, 
  User, 
  Heart, 
  Briefcase, 
  MapPin, 
  Activity, 
  Save, 
  Star,
  Award,
  ArrowRight,
  TrendingUp,
  X
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';

const API_BASE = getApiBaseUrl();


export default function EditProfilePage() {
  const router = useRouter();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'personal' | 'location' | 'health' | 'work' | 'privacy'>('personal');
  
  // Loading & Toast States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [avatar, setAvatar] = useState('Sports Champion');
  const [avatarFrame, setAvatarFrame] = useState('None');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('MALE');
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [education, setEducation] = useState('None');
  
  // Location fields
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('Delhi');
  const [city, setCity] = useState('Delhi');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  
  // Health fields
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmi, setBmi] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [diabetesStatus, setDiabetesStatus] = useState('None');
  const [prediabetesStatus, setPrediabetesStatus] = useState('None');
  const [bloodPressure, setBloodPressure] = useState('');
  const [cholesterol, setCholesterol] = useState('');
  const [sleepGoal, setSleepGoal] = useState('8 hours');
  const [waterGoal, setWaterGoal] = useState('3 Liters');
  const [activityGoal, setActivityGoal] = useState('10000 steps');
  
  // Work fields
  const [occupation, setOccupation] = useState('');
  const [company, setCompany] = useState('');
  const [workType, setWorkType] = useState('Full-time');
  const [workingHours, setWorkingHours] = useState('8 hours');
  const [industry, setIndustry] = useState('Tech');
  const [organization, setOrganization] = useState('');
  
  // Privacy
  const [privacyLevel, setPrivacyLevel] = useState('PRIVATE');
  
  // Extra fields stored in local storage / fetched
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [totalRuns, setTotalRuns] = useState(0);
  const [role, setRole] = useState('USER');
  const [plan, setPlan] = useState('FREE');

  // Inline upgrade modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [upiId, setUpiId] = useState('');

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('vivo_token');
      if (!token) {
        router.push('/');
        return;
      }
      
      try {
        const res = await fetch(`${API_BASE}/api/auth/personalization/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          // Set extra stats
          setXp(data.xp || 0);
          setLevel(data.level || 1);
          setStreak(data.streak || 0);
          setTotalRuns(data.total_runs || 0);
          setRole(data.role || 'USER');
          setPlan(data.plan || 'FREE');
        }
        
        // Fetch detailed profile model
        const detailRes = await fetch(`${API_BASE}/api/auth/profile/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (detailRes.ok) {
          const profile = await detailRes.json();
          
          setFullName(profile.full_name || profile.name || '');
          setUsername(profile.username || '');
          setEmail(profile.email || '');
          setMobileNumber(profile.mobile_number || '');
          setAvatar(profile.avatar || 'Sports Champion');
          setAvatarFrame(profile.avatar_frame || 'None');
          setDateOfBirth(profile.date_of_birth || '');
          setGender(profile.gender || 'MALE');
          setMaritalStatus(profile.marital_status || 'Single');
          setEducation(profile.education || 'None');
          
          setCountry(profile.country || 'India');
          setState(profile.state || 'Delhi');
          setCity(profile.city || 'Delhi');
          setDistrict(profile.district || '');
          setVillage(profile.village || '');
          setAddress(profile.address || '');
          setPostalCode(profile.postal_code || '');
          setTimezone(profile.timezone || 'Asia/Kolkata');
          
          setHeight(profile.height || '');
          setWeight(profile.weight || '');
          setBmi(profile.bmi || '');
          setBloodGroup(profile.blood_group || '');
          setDiabetesStatus(profile.diabetes_status || 'None');
          setPrediabetesStatus(profile.prediabetes_status || 'None');
          setBloodPressure(profile.blood_pressure || '');
          setCholesterol(profile.cholesterol || '');
          setSleepGoal(profile.sleep_goal || '8 hours');
          setWaterGoal(profile.water_goal || '3 Liters');
          setActivityGoal(profile.activity_goal || '10000 steps');
          
          setOccupation(profile.occupation || '');
          setCompany(profile.company || '');
          setWorkType(profile.work_type || 'Full-time');
          setWorkingHours(profile.working_hours || '8 hours');
          setIndustry(profile.industry || 'Tech');
          setOrganization(profile.organization || '');
          
          setPrivacyLevel(profile.privacy_level || 'PRIVATE');
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [router]);

  // Auto calculate BMI when height & weight change
  useEffect(() => {
    if (height && weight) {
      const hMeters = parseFloat(height) / 100;
      const wKg = parseFloat(weight);
      if (hMeters > 0 && wKg > 0) {
        const calculatedBmi = (wKg / (hMeters * hMeters)).toFixed(1);
        setBmi(calculatedBmi);
      }
    }
  }, [height, weight]);

  // Profile Completion logic
  const calculateCompletion = () => {
    let score = 0;
    
    // Name added
    if (fullName) score += 10;
    // Avatar / Photo Added
    if (avatar) score += 10;
    // Address added
    if (address && country && city) score += 10;
    // Mobile Verified (present)
    if (mobileNumber) score += 10;
    // Email verified (present)
    if (email) score += 10;
    // Health data added
    if (height || weight || bmi || bloodGroup) score += 20;
    // Goals Added
    if (sleepGoal || waterGoal || activityGoal) score += 20;
    // Occupation Added
    if (occupation) score += 10;
    
    return score;
  };

  const completionPct = calculateCompletion();

  // Handle profile save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    
    const token = localStorage.getItem('vivo_token');
    const payload = {
      full_name: fullName,
      name: fullName, // legacy fallback sync
      username,
      email,
      mobile_number: mobileNumber,
      avatar,
      avatar_frame: avatarFrame,
      date_of_birth: dateOfBirth || null,
      gender,
      marital_status: maritalStatus,
      education,
      country,
      state,
      city,
      district,
      village,
      address,
      postal_code: postalCode,
      timezone,
      height,
      weight,
      bmi,
      blood_group: bloodGroup,
      diabetes_status: diabetesStatus,
      prediabetes_status: prediabetesStatus,
      blood_pressure: bloodPressure,
      cholesterol,
      sleep_goal: sleepGoal,
      water_goal: waterGoal,
      activity_goal: activityGoal,
      occupation,
      company,
      work_type: workType,
      working_hours: workingHours,
      industry,
      organization,
      privacy_level: privacyLevel
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
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage('Profile updated and synchronized successfully!');
        
        // Sync layout fields
        localStorage.setItem('vivo_name', fullName);
        localStorage.setItem('vivo_email', email);
        localStorage.setItem('vivo_gender', gender);
        localStorage.setItem('vivo_state', state);
        
        // Trigger personalization update event
        window.dispatchEvent(new Event('personalization_loaded'));
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        // Handle sync errors nicely
        const errDetail = Object.values(data).flat().join(' ');
        setError(errDetail || 'Failed to update profile settings.');
      }
    } catch (err) {
      setError('Connection failure. Please check if the servers are active.');
    } finally {
      setSaving(false);
    }
  };

  // Handle inline simulated Razorpay upgrade
  const handleUpgrade = async () => {
    if (!upiId) {
      setPaymentError('Please enter a valid UPI ID');
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
        body: JSON.stringify({ plan: 'PRO' })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('vivo_plan', 'PRO');
        localStorage.setItem('vivo_tier', 'PRO');
        document.cookie = `vivo_tier=PRO; path=/; max-age=2592000`;
        setPlan('PRO');
        
        setPaymentSuccess(true);
        setTimeout(() => {
          setShowUpgradeModal(false);
          setPaymentSuccess(false);
          setUpiId('');
          // Refresh personalization to unlock sidebar items
          window.dispatchEvent(new Event('personalization_loaded'));
        }, 1500);
      } else {
        setPaymentError(data.error || 'Failed to authorize checkout.');
        setPaymentProcessing(false);
      }
    } catch (err) {
      setPaymentError('Backend payment gateway sandbox unavailable.');
      setPaymentProcessing(false);
    }
  };

  const isLocked = plan === 'FREE';

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-xs font-bold text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          Loading secure account details...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header Back Button */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/10 select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/profile')}
            className="w-10 h-10 rounded-2xl bg-card hover:bg-secondary/40 border border-border flex items-center justify-center text-primary hover:text-foreground transition-all shadow-sm active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              Edit My Profile
            </h1>
            <p className="text-muted-foreground text-xs font-semibold">
              Complete your biometric profile to score additional championship points.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* Left Side: Tabs Selection & Completion Meter */}
        <div className="lg:col-span-4 flex flex-col gap-6 select-none">
          
          {/* Profile Completion Meter */}
          <div className="bg-gradient-to-br from-primary-dark via-primary to-accent text-white rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full opacity-[0.03] -translate-y-1/3 translate-x-1/3 pointer-events-none" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-card-lime mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Profile Setup Score
            </h3>
            
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-black">{completionPct}%</span>
              <span className="text-xs opacity-75">Complete</span>
            </div>
            
            <div className="w-full h-3.5 bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
              <div 
                className="h-full bg-card-lime rounded-full transition-all duration-1000 ease-out shadow-sm"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            
            <div className="mt-4 bg-black/15 border border-white/10 rounded-2xl p-3 text-[10px] leading-relaxed opacity-90 font-medium">
              🌟 Complete your profile info to score health runs. A 100% complete profile unlocks unique badges and +500 League XP points.
            </div>
          </div>

          {/* User Gamification Stats Summary */}
          <div className="bg-card border border-border/30 rounded-[28px] p-5 shadow-card">
            <h4 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Award size={14} className="text-primary" /> League Statistics
            </h4>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-secondary/35 border border-border/20 rounded-2xl">
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Level</span>
                <span className="block text-lg font-black text-primary mt-0.5">{level}</span>
              </div>
              <div className="p-3 bg-secondary/35 border border-border/20 rounded-2xl">
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">League XP</span>
                <span className="block text-lg font-black text-primary mt-0.5">{xp}</span>
              </div>
              <div className="p-3 bg-secondary/35 border border-border/20 rounded-2xl">
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Streak</span>
                <span className="block text-lg font-black text-orange-500 mt-0.5">{streak} Match</span>
              </div>
              <div className="p-3 bg-secondary/35 border border-border/20 rounded-2xl">
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Total Runs</span>
                <span className="block text-lg font-black text-primary-dark mt-0.5">{totalRuns} R</span>
              </div>
            </div>
          </div>

          {/* Form Tabs */}
          <div className="bg-card border border-border/30 rounded-[28px] p-2.5 shadow-card flex flex-col gap-1.5">
            {[
              { id: 'personal', label: 'Personal Details', icon: User },
              { id: 'location', label: 'Location & Address', icon: MapPin },
              { id: 'health', label: 'Health & Biometrics', icon: Activity },
              { id: 'work', label: 'Occupation & Job', icon: Briefcase },
              { id: 'privacy', label: 'Privacy Visibility', icon: Shield }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    isActive 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  {tab.label}
                </button>
              );
            })}
          </div>

        </div>

        {/* Right Side: Active Form Panel */}
        <form onSubmit={handleSave} className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Action Feedback alerts */}
          {message && (
            <div className="flex items-center gap-3 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs font-bold shadow-sm animate-scale-up select-none">
              <Check size={18} className="shrink-0 text-emerald-800" strokeWidth={3} />
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl p-4 text-xs font-bold shadow-sm animate-scale-up select-none">
              <span>⚠️ {error}</span>
            </div>
          )}

          <div className="bg-card border border-border/30 rounded-[32px] p-6 md:p-8 shadow-card flex flex-col gap-6 min-h-[460px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-44 h-44 bg-primary/5 rounded-full blur-[40px] pointer-events-none" />

            {/* TAB 1: PERSONAL DETAILS */}
            {activeTab === 'personal' && (
              <div className="flex flex-col gap-5 animate-scale-up">
                <h3 className="font-extrabold text-lg text-primary-dark" style={{ fontFamily: 'var(--font-heading)' }}>
                  Personal Identity Info
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Full Name *</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. Namrata Sharma"
                      required
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Username *</label>
                    <input 
                      type="text" 
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="e.g. namrata_sharma"
                      required
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Date of Birth</label>
                    <input 
                      type="date" 
                      value={dateOfBirth}
                      onChange={e => setDateOfBirth(e.target.value)}
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Age Group Profile</label>
                    <select 
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all cursor-pointer"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Marital Status</label>
                    <select 
                      value={maritalStatus}
                      onChange={e => setMaritalStatus(e.target.value)}
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all cursor-pointer"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <label className="text-muted-foreground font-bold uppercase tracking-wider">Education Level</label>
                  <input 
                    type="text" 
                    value={education}
                    onChange={e => setEducation(e.target.value)}
                    placeholder="e.g. Master of Business Administration (MBA)"
                    className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                  />
                </div>

                {/* Secure Contact synchronization block */}
                <div className="w-full h-px bg-border/60 my-2" />
                <h4 className="font-extrabold text-sm text-foreground">Secure Credentials & Device Sync</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
                  These fields identify your secure account access. Edits here update your login credentials and immediately synchronise across all authenticated devices.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="namrata@example.com"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Mobile Number (+91)</label>
                    <input 
                      type="text" 
                      value={mobileNumber}
                      onChange={e => setMobileNumber(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            )}



            {/* TAB 3: LOCATION & ADDRESS */}
            {activeTab === 'location' && (
              <div className="flex flex-col gap-5 animate-scale-up">
                <h3 className="font-extrabold text-lg text-primary-dark" style={{ fontFamily: 'var(--font-heading)' }}>
                  Location & Address Registry
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Country</label>
                    <input 
                      type="text" 
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      placeholder="e.g. India"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">State / Province</label>
                    <input 
                      type="text" 
                      value={state}
                      onChange={e => setState(e.target.value)}
                      placeholder="e.g. West Bengal"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">City / Town</label>
                    <input 
                      type="text" 
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="e.g. Kolkata"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">District</label>
                    <input 
                      type="text" 
                      value={district}
                      onChange={e => setDistrict(e.target.value)}
                      placeholder="e.g. Hooghly"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Village (Rural Programs)</label>
                    <input 
                      type="text" 
                      value={village}
                      onChange={e => setVillage(e.target.value)}
                      placeholder="e.g. Gopalpur"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <label className="text-muted-foreground font-bold uppercase tracking-wider">Postal Street Address</label>
                  <textarea 
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Enter complete house number, street, ward..."
                    rows={2}
                    className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Postal PIN Code</label>
                    <input 
                      type="text" 
                      value={postalCode}
                      onChange={e => setPostalCode(e.target.value)}
                      placeholder="e.g. 712203"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Operating Timezone</label>
                    <input 
                      type="text" 
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      placeholder="e.g. Asia/Kolkata"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: HEALTH & BIOMETRICS */}
            {activeTab === 'health' && (
              <div className="flex flex-col gap-5 animate-scale-up">
                <h3 className="font-extrabold text-lg text-primary-dark" style={{ fontFamily: 'var(--font-heading)' }}>
                  Biometrics & Clinical Parameters
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Height (cm)</label>
                    <input 
                      type="text" 
                      value={height}
                      onChange={e => setHeight(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 170"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Weight (kg)</label>
                    <input 
                      type="text" 
                      value={weight}
                      onChange={e => setWeight(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 70"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">BMI (Auto)</label>
                    <input 
                      type="text" 
                      value={bmi}
                      readOnly
                      placeholder="Auto"
                      className="w-full px-4 py-3 bg-secondary/35 border-2 border-border rounded-xl font-bold text-primary outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Blood Group</label>
                    <input 
                      type="text" 
                      value={bloodGroup}
                      onChange={e => setBloodGroup(e.target.value.toUpperCase())}
                      placeholder="e.g. O+"
                      maxLength={3}
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Diabetes Status</label>
                    <select 
                      value={diabetesStatus}
                      onChange={e => setDiabetesStatus(e.target.value)}
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all cursor-pointer"
                    >
                      <option value="None">Non-Diabetic</option>
                      <option value="Type 1">Type 1 Diabetic</option>
                      <option value="Type 2">Type 2 Diabetic</option>
                      <option value="Gestational">Gestational Diabetes</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Prediabetes Risk</label>
                    <select 
                      value={prediabetesStatus}
                      onChange={e => setPrediabetesStatus(e.target.value)}
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all cursor-pointer"
                    >
                      <option value="None">None</option>
                      <option value="Borderline HBA1C">Borderline HbA1c (5.7 - 6.4%)</option>
                      <option value="High Risk">High Risk (Familial History)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Blood Pressure (SYS/DIA)</label>
                    <input 
                      type="text" 
                      value={bloodPressure}
                      onChange={e => setBloodPressure(e.target.value)}
                      placeholder="e.g. 120/80"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Cholesterol (mg/dL)</label>
                    <input 
                      type="text" 
                      value={cholesterol}
                      onChange={e => setCholesterol(e.target.value)}
                      placeholder="e.g. 190"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="w-full h-px bg-border/60 my-2" />
                <h4 className="font-extrabold text-sm text-foreground">Lifestyle & Scoreboard Targets</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Daily Sleep Target</label>
                    <input 
                      type="text" 
                      value={sleepGoal}
                      onChange={e => setSleepGoal(e.target.value)}
                      placeholder="e.g. 8 hours"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Daily Water Intake</label>
                    <input 
                      type="text" 
                      value={waterGoal}
                      onChange={e => setWaterGoal(e.target.value)}
                      placeholder="e.g. 3.5 Liters"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Daily Innings steps</label>
                    <input 
                      type="text" 
                      value={activityGoal}
                      onChange={e => setActivityGoal(e.target.value)}
                      placeholder="e.g. 10000 steps"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: OCCUPATION & WORK */}
            {activeTab === 'work' && (
              <div className="flex flex-col gap-5 animate-scale-up">
                <h3 className="font-extrabold text-lg text-primary-dark" style={{ fontFamily: 'var(--font-heading)' }}>
                  Occupational Profile & Workplace
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Primary Occupation</label>
                    <select 
                      value={occupation}
                      onChange={e => setOccupation(e.target.value)}
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all cursor-pointer font-bold text-foreground"
                    >
                      <option value="">Select Occupation...</option>
                      <option value="Student">Student</option>
                      <option value="Software Engineer">Software Engineer</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Farmer">Farmer</option>
                      <option value="Business Owner">Business Owner</option>
                      <option value="Athlete">Athlete</option>
                      <option value="Other Professional">Other Professional</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Employer / Company</label>
                    <input 
                      type="text" 
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      placeholder="e.g. Tata Consultancy Services"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Work Type Mode</label>
                    <select 
                      value={workType}
                      onChange={e => setWorkType(e.target.value)}
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all cursor-pointer"
                    >
                      <option value="Full-time">Full-time Desk Job</option>
                      <option value="Part-time">Part-time Shift</option>
                      <option value="Remote">100% Remote / Hybrid</option>
                      <option value="Manual Labor">Active / Field Labor</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Working Hours Range</label>
                    <input 
                      type="text" 
                      value={workingHours}
                      onChange={e => setWorkingHours(e.target.value)}
                      placeholder="e.g. 9:00 AM - 6:00 PM"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Industry Domain</label>
                    <input 
                      type="text" 
                      value={industry}
                      onChange={e => setIndustry(e.target.value)}
                      placeholder="e.g. Information Technology"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Corporate Wellness Organization</label>
                    <input 
                      type="text" 
                      value={organization}
                      onChange={e => setOrganization(e.target.value)}
                      placeholder="e.g. Delhi Health League"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: PRIVACY SETTINGS */}
            {activeTab === 'privacy' && (
              <div className="flex flex-col gap-5 animate-scale-up">
                <h3 className="font-extrabold text-lg text-primary-dark" style={{ fontFamily: 'var(--font-heading)' }}>
                  Data Visibility & Privacy Rules
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                  Control who can see your biometrics, daily walking steps, and scoreboard.
                </p>

                <div className="flex flex-col gap-4 mt-2">
                  {[
                    { id: 'PUBLIC', label: 'Public Profile Visibility', desc: 'Anyone on VivoQuest can discover your metrics, profile photo, and cheer you on in public leagues.' },
                    { id: 'COMMUNITY', label: 'Community & League Teammates Only', desc: 'Limit details visibility exclusively to members of your local Village, School class, or Corporate roster.' },
                    { id: 'PRIVATE', label: 'Private Mode (Restricted)', desc: 'Only you and your verified clinical doctor can inspect biometric data. You remain anonymous on league scoreboard.' }
                  ].map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setPrivacyLevel(option.id)}
                      className={`p-5 rounded-2xl border-2 text-left flex justify-between items-center transition-all ${
                        privacyLevel === option.id 
                          ? 'border-primary bg-secondary/25' 
                          : 'border-border bg-background hover:bg-secondary/10'
                      }`}
                    >
                      <div className="max-w-[85%] text-xs">
                        <h4 className="font-extrabold text-base text-foreground">{option.label}</h4>
                        <p className="text-muted-foreground mt-1.5 font-medium leading-relaxed">{option.desc}</p>
                      </div>
                      {privacyLevel === option.id && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-sm">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Action Row */}
          <div className="flex justify-between items-center bg-card border border-border/30 rounded-[28px] p-5 shadow-card select-none">
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="py-3 px-8 rounded-2xl bg-primary text-white font-extrabold text-xs uppercase tracking-widest shadow-md hover:bg-accent hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save size={14} /> Save Profile</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* simulated Razorpay checkout for Avatar locks */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-card border border-border/50 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-border/45 flex justify-between items-center bg-background">
              <div>
                <span className="text-[9px] text-primary font-black uppercase tracking-wider">SECURE CHECKOUT</span>
                <h3 className="font-extrabold text-base text-primary-dark" style={{ fontFamily: 'var(--font-heading)' }}>Razorpay Payment Gateway</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowUpgradeModal(false);
                  setPaymentError('');
                }}
                className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all shadow-sm"
              >
                <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-5">
              {paymentSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner animate-pulse">
                    <Check size={32} strokeWidth={3} className="text-emerald-800" />
                  </div>
                  <h4 className="text-lg font-extrabold text-emerald-800">Plan Upgraded!</h4>
                  <p className="text-xs text-muted-foreground font-semibold">
                    You have unlocked all premium avatar frames, custom designs, and AI coach features!
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center bg-secondary/35 p-4 rounded-2xl border border-border/20 text-xs font-bold">
                    <span className="text-muted-foreground">Order: Pro Player Premium Upgrades</span>
                    <span className="text-primary">₹199.00</span>
                  </div>

                  {paymentError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-[11px] font-bold">
                      ⚠️ {paymentError}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 text-xs">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider">Enter UPI ID</label>
                    <input 
                      type="text" 
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      placeholder="namrata@okaxis"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-medium outline-none transition-all"
                    />
                    <span className="text-[10px] text-muted-foreground/60 font-semibold mt-0.5">Simulate payment verification with instant provision check.</span>
                  </div>

                  <button 
                    type="button"
                    onClick={handleUpgrade}
                    disabled={paymentProcessing || !upiId}
                    className="w-full py-4 bg-primary hover:bg-accent text-white font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {paymentProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Pay ₹199 & Upgrade</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
