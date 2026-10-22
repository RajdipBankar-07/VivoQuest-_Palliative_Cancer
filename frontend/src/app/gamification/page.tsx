'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../components/AppLayout';
import { 
  Trophy, Target, Zap, Gift, Award, Flame, Users, Calendar, 
  Sparkles, Copy, Check, Info, Lock, User, ChevronRight, 
  UserPlus, RefreshCw, Star, Heart, Activity, Coins, ShieldCheck, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiBaseUrl } from '@/lib/api';

const API_BASE = getApiBaseUrl();


export default function GamificationPage() {
  const router = useRouter();

  // Loading & Messages
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Dashboard Stats
  const [userName, setUserName] = useState('New Player');
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpBase, setXpBase] = useState(0);
  const [xpNext, setXpNext] = useState(500);
  const [coins, setCoins] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [unlockedBadgesCount, setUnlockedBadgesCount] = useState(0);
  const [completionPct, setCompletionPct] = useState(0);

  // Daily Missions
  const [missions, setMissions] = useState<any[]>([]);

  // Challenge Calendar
  const [calendarChallenges, setCalendarChallenges] = useState<any[]>([]);
  const [calendarFilter, setCalendarFilter] = useState('ALL');

  // AI Personalized Challenges
  const [aiChallenges, setAiChallenges] = useState<any[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Custom User Challenges
  const [createdChallenges, setCreatedChallenges] = useState<any[]>([]);
  const [joinedChallenges, setJoinedChallenges] = useState<any[]>([]);
  const [publicDirectory, setPublicDirectory] = useState<any[]>([]);
  const [newChallengeName, setNewChallengeName] = useState('');
  const [newChallengeDesc, setNewChallengeDesc] = useState('');
  const [newChallengeDuration, setNewChallengeDuration] = useState('7');
  const [newChallengeXP, setNewChallengeXP] = useState('100');
  const [newChallengeVisibility, setNewChallengeVisibility] = useState('PUBLIC');
  const [newChallengeInviteUser, setNewChallengeInviteUser] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);

  // Referrals
  const [referralLink, setReferralLink] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [successfulReferrals, setSuccessfulReferrals] = useState(0);
  const [referralXpEarned, setReferralXpEarned] = useState(0);
  const [referralLeaderboard, setReferralLeaderboard] = useState<any[]>([]);
  const [inputReferralCode, setInputReferralCode] = useState('');
  const [submittingReferral, setSubmittingReferral] = useState(false);
  const [copied, setCopied] = useState(false);

  // Badges
  const [badges, setBadges] = useState<any[]>([]);
  const [badgeCollectionPct, setBadgeCollectionPct] = useState(0);

  // Rewards Shop
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);

  // Corporate Wellness
  const [topEmployees, setTopEmployees] = useState<any[]>([]);
  const [departmentRankings, setDepartmentRankings] = useState<any[]>([]);
  const [teamRankings, setTeamRankings] = useState<any[]>([]);

  // Active Tab navigation
  const [activeTab, setActiveTab] = useState<'missions' | 'calendar' | 'custom' | 'referral' | 'shop' | 'badges' | 'corporate'>('missions');

  const getHeaders = () => {
    const token = localStorage.getItem('vivo_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const showFeedback = (text: string, isErr = false) => {
    if (isErr) {
      setErr(text);
      setMsg('');
    } else {
      setMsg(text);
      setErr('');
    }
    setTimeout(() => {
      setMsg('');
      setErr('');
    }, 4000);
  };

  const loadData = async () => {
    const token = localStorage.getItem('vivo_token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      // 1. Fetch dashboard overview stats
      const dashRes = await fetch(`${API_BASE}/api/gamification/dashboard/`, { headers: getHeaders() });
      if (dashRes.ok) {
        const d = await dashRes.json();
        setUserName(d.name || 'New Player');
        setLevel(d.level);
        setXp(d.xp);
        setXpBase(d.current_lvl_xp_base);
        setXpNext(d.next_lvl_xp);
        setCoins(d.coins);
        setReferralCode(d.referral_code);
        setUnlockedBadgesCount(d.unlocked_badges_count);
        setCompletionPct(d.mission_completion_percentage);
      }

      // 2. Fetch Daily Missions
      const missionRes = await fetch(`${API_BASE}/api/gamification/missions/`, { headers: getHeaders() });
      if (missionRes.ok) {
        const m = await missionRes.json();
        setMissions(m);
      }

      // 3. Fetch Challenge Calendar
      const calRes = await fetch(`${API_BASE}/api/gamification/challenges/calendar/`, { headers: getHeaders() });
      if (calRes.ok) {
        const c = await calRes.json();
        setCalendarChallenges(c);
      }

      // 4. Fetch AI Personalized Challenges
      const aiRes = await fetch(`${API_BASE}/api/gamification/challenges/ai-generate/`, { headers: getHeaders() });
      if (aiRes.ok) {
        const a = await aiRes.json();
        setAiChallenges(a);
      }

      // 5. Fetch Custom Challenges
      const custRes = await fetch(`${API_BASE}/api/gamification/challenges/custom/`, { headers: getHeaders() });
      if (custRes.ok) {
        const cu = await custRes.json();
        setCreatedChallenges(cu.created || []);
        setJoinedChallenges(cu.joined || []);
        setPublicDirectory(cu.public_directory || []);
      }

      // Fetch Pending Challenge Invitations
      const inviteRes = await fetch(`${API_BASE}/api/gamification/challenges/invitations/`, { headers: getHeaders() });
      if (inviteRes.ok) {
        const invs = await inviteRes.json();
        setPendingInvitations(invs);
      }

      // 6. Fetch Referrals Overview
      const refRes = await fetch(`${API_BASE}/api/gamification/referrals/`, { headers: getHeaders() });
      if (refRes.ok) {
        const r = await refRes.json();
        setReferralLink(r.referral_link);
        setTotalReferrals(r.total_referrals);
        setSuccessfulReferrals(r.successful_referrals);
        setReferralXpEarned(r.xp_earned);
        setReferralLeaderboard(r.leaderboard || []);
      }

      // 7. Fetch Badges
      const badgeRes = await fetch(`${API_BASE}/api/gamification/badges/`, { headers: getHeaders() });
      if (badgeRes.ok) {
        const b = await badgeRes.json();
        setBadges(b.badges || []);
        setBadgeCollectionPct(b.collection_percentage || 0);
      }

      // 8. Fetch Rewards Shop
      const shopRes = await fetch(`${API_BASE}/api/gamification/rewards/`, { headers: getHeaders() });
      if (shopRes.ok) {
        const sh = await shopRes.json();
        setShopItems(sh);
      }

      // 9. Fetch Corporate Rankings
      const corpRes = await fetch(`${API_BASE}/api/gamification/corporate/`, { headers: getHeaders() });
      if (corpRes.ok) {
        const co = await corpRes.json();
        setTopEmployees(co.top_employees || []);
        setDepartmentRankings(co.department_rankings || []);
        setTeamRankings(co.team_rankings || []);
      }

    } catch (e) {
      console.error(e);
      showFeedback('Failed to sync network profiles.', true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Claim Daily Mission Reward
  const claimMission = async (missionId: number) => {
    setClaimingId(missionId);
    try {
      const res = await fetch(`${API_BASE}/api/gamification/missions/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action: 'claim', mission_id: missionId })
      });
      if (res.ok) {
        const data = await res.json();
        showFeedback(`Claimed! +${data.xp_earned} XP & +${data.coins_earned} Coins!`);
        if (data.leveled_up) {
          showFeedback(`🎉 LEVEL UP! You reached Level ${data.current_level}!`);
        }
        loadData();
      } else {
        const errData = await res.json();
        showFeedback(errData.error || 'Failed to claim reward.', true);
      }
    } catch (e) {
      showFeedback('Server connection timed out.', true);
    } finally {
      setClaimingId(null);
    }
  };

  // Submit friend referral code
  const submitReferral = async () => {
    if (!inputReferralCode.trim()) return;
    setSubmittingReferral(true);
    try {
      const res = await fetch(`${API_BASE}/api/gamification/referrals/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ referral_code: inputReferralCode.trim() })
      });
      if (res.ok) {
        showFeedback('Referral applied! Starter rewards loaded.');
        setInputReferralCode('');
        loadData();
      } else {
        const errData = await res.json();
        showFeedback(errData.error || 'Invalid invite code.', true);
      }
    } catch (e) {
      showFeedback('Server connection error.', true);
    } finally {
      setSubmittingReferral(false);
    }
  };

  // Generate new AI personalized challenge
  const generateAiChallenge = async () => {
    setAiGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/gamification/challenges/ai-generate/`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        showFeedback('AI customized challenge synthesized successfully!');
        loadData();
      } else {
        showFeedback('Failed to request AI cores.', true);
      }
    } catch (e) {
      showFeedback('AI model server timed out.', true);
    } finally {
      setAiGenerating(false);
    }
  };

  // Join/Leave Calendar Challenge
  const toggleCalendarChallenge = async (id: number | string, active: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/gamification/challenges/calendar/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ challenge_id: id, action: active ? 'leave' : 'join' })
      });
      if (res.ok) {
        showFeedback(active ? 'Left calendar challenge.' : 'Successfully joined challenge calendar list!');
        loadData();
      }
    } catch (e) {
      showFeedback('Network error.', true);
    }
  };

  // Create custom challenge
  const createCustomChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChallengeName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/gamification/challenges/custom/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: newChallengeName,
          description: newChallengeDesc,
          duration_days: newChallengeDuration,
          reward_xp: newChallengeXP,
          visibility: newChallengeVisibility,
          invite_user: newChallengeInviteUser
        })
      });
      if (res.ok) {
        showFeedback('Custom challenge created successfully!');
        setNewChallengeName('');
        setNewChallengeDesc('');
        setNewChallengeInviteUser('');
        loadData();
      } else {
        const errData = await res.json();
        showFeedback(errData.error || 'Failed to register challenge.', true);
      }
    } catch (e) {
      showFeedback('Connection timeout.', true);
    }
  };

  // Accept invitation
  const acceptInvitation = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/gamification/challenges/invitations/${id}/accept/`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        showFeedback('Invitation accepted successfully!');
        loadData();
      } else {
        const errData = await res.json();
        showFeedback(errData.error || 'Failed to accept invitation.', true);
      }
    } catch (e) {
      showFeedback('Network error.', true);
    }
  };

  // Decline invitation
  const declineInvitation = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/gamification/challenges/invitations/${id}/decline/`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        showFeedback('Invitation declined.');
        loadData();
      } else {
        const errData = await res.json();
        showFeedback(errData.error || 'Failed to decline invitation.', true);
      }
    } catch (e) {
      showFeedback('Network error.', true);
    }
  };

  // Join/Leave Custom User Challenge
  const toggleUserChallenge = async (id: number, active: boolean) => {
    if (active && !confirm('Are you sure you want to delete this custom challenge from your list?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/gamification/challenges/custom/${id}/join/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action: active ? 'leave' : 'join' })
      });
      if (res.ok) {
        showFeedback(active ? 'Left custom challenge.' : 'Joined custom challenge!');
        loadData();
      }
    } catch (e) {
      showFeedback('Connection error.', true);
    }
  };

  // Delete custom challenge
  const deleteCustomChallenge = async (id: number) => {
    if (!confirm('Are you sure you want to delete this custom challenge?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/gamification/challenges/custom/${id}/`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        showFeedback('Custom challenge deleted successfully!');
        loadData();
      } else {
        const errData = await res.json();
        showFeedback(errData.error || 'Failed to delete custom challenge.', true);
      }
    } catch (e) {
      showFeedback('Network error.', true);
    }
  };

  // Purchase Shop Item
  const purchaseShopItem = async (itemId: number) => {
    setPurchasingId(itemId);
    try {
      const res = await fetch(`${API_BASE}/api/gamification/rewards/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reward_id: itemId })
      });
      if (res.ok) {
        showFeedback('Reward redeemed successfully! Unlocked inside avatar studio inventory.');
        loadData();
      } else {
        const errData = await res.json();
        showFeedback(errData.error || 'Failed to purchase reward.', true);
      }
    } catch (e) {
      showFeedback('Transaction gateway timed out.', true);
    } finally {
      setPurchasingId(null);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate percentages for XP Progress Bar
  const xpNeeded = xpNext - xpBase;
  const xpCurrentProgress = xp - xpBase;
  const xpPct = Math.max(0, Math.min(100, Math.floor((xpCurrentProgress / xpNeeded) * 100)));

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-xs font-bold text-muted-foreground select-none">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          Synchronizing gamification progression data...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.2); }
          50% { box-shadow: 0 0 25px rgba(139, 92, 246, 0.4); }
        }
        .glow-card {
          animation: pulse-glow 3s infinite;
        }
      `}</style>

      {/* Top Banner: RPG Progression */}
      <div className="bg-gradient-to-r from-violet-950 via-[#0f0e24] to-indigo-950 border border-violet-500/10 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl glow-card select-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-tr from-violet-600 to-indigo-600 flex flex-col items-center justify-center border border-white/10 shadow-lg shadow-violet-600/30">
              <span className="text-[10px] uppercase font-black tracking-wider text-violet-200 leading-none">Level</span>
              <span className="text-2xl font-black text-white mt-0.5">{level}</span>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                Welcome Back, {userName}!
              </h2>
              <p className="text-xs text-violet-300 font-semibold mt-1">
                Completed {completionPct}% of daily missions today
              </p>
            </div>
          </div>

          {/* XP Bar */}
          <div className="flex-1 max-w-md w-full flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-black uppercase text-violet-200 tracking-wider">
              <span>XP Progression</span>
              <span>{xpCurrentProgress} / {xpNeeded} XP</span>
            </div>
            <div className="w-full h-3.5 bg-white/5 border border-white/10 rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" 
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold">
              Level {level + 1} unlocks at {xpNext} XP total ({xpNext - xp} XP remaining)
            </span>
          </div>

          {/* Wallet counter */}
          <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl py-3 px-5">
            <div className="flex items-center gap-2">
              <Coins className="text-amber-500 animate-bounce" size={22} />
              <div>
                <span className="block text-[8px] font-black uppercase tracking-wider text-muted-foreground leading-none">Coins</span>
                <span className="text-lg font-black text-white">{coins}</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/[0.08]" />
            <div className="flex items-center gap-2">
              <Award className="text-violet-400" size={22} />
              <div>
                <span className="block text-[8px] font-black uppercase tracking-wider text-muted-foreground leading-none">Badges</span>
                <span className="text-lg font-black text-white">{unlockedBadgesCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs and Alert Banner */}
      <div className="flex flex-col gap-6">
        {msg && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl p-4 text-xs font-bold shadow-sm animate-scale-up select-none">
            <ShieldCheck size={18} className="shrink-0 text-emerald-400" />
            <span>{msg}</span>
          </div>
        )}
        {err && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl p-4 text-xs font-bold shadow-sm animate-scale-up select-none">
            <span>⚠️ {err}</span>
          </div>
        )}

        {/* Tab Headers */}
        <div className="bg-card border border-border/30 rounded-[24px] p-1.5 shadow-sm flex flex-wrap gap-1 select-none">
          {[
            { id: 'missions', label: 'Daily Missions', icon: Target },
            { id: 'calendar', label: 'Challenge Calendar', icon: Calendar },
            { id: 'custom', label: 'Custom Challenges', icon: User },
            { id: 'referral', label: 'Referrals', icon: UserPlus },
            { id: 'shop', label: 'Rewards Shop', icon: Gift },
            { id: 'badges', label: 'Badges', icon: Award },
            { id: 'corporate', label: 'Corporate Arena', icon: Trophy }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[110px] flex items-center justify-center gap-1.5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  active 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                }`}
              >
                <Icon size={13} strokeWidth={active ? 2.5 : 2} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Tab Body */}
        <div className="bg-card border border-border/30 rounded-[32px] p-6 md:p-8 shadow-card min-h-[400px] flex flex-col gap-6 relative overflow-hidden">
          
          {/* TAB 1: DAILY MISSIONS */}
          {activeTab === 'missions' && (
            <div className="flex flex-col gap-5 h-full animate-scale-up">
              <div className="flex justify-between items-center select-none">
                <div>
                  <h3 className="font-extrabold text-lg text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                    Daily Missions Registry
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    Complete tasks daily to earn XP and coins. Reset at 00:00 local time.
                  </p>
                </div>
                <div className="text-xs bg-violet-500/10 border border-violet-500/10 text-primary px-3 py-1.5 rounded-full font-black">
                  {completionPct}% Complete
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {missions.map((m: any) => {
                  const finished = m.progress >= m.target;
                  const pct = Math.max(0, Math.min(100, Math.floor((m.progress / m.target) * 100)));
                  return (
                    <div key={m.id} className="bg-secondary/15 border border-border/30 rounded-[20px] p-5 flex flex-col justify-between gap-4 transition-all hover:bg-secondary/25 relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] font-black uppercase text-violet-400 tracking-wider">
                            {m.mission_type} Target
                          </span>
                          <h4 className="font-extrabold text-sm text-foreground mt-0.5">{m.name}</h4>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed font-semibold">
                            {m.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full shrink-0">
                            +{m.xp_reward} XP
                          </span>
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                            <Coins size={10} /> +{m.coins_reward}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                          <span>Progress</span>
                          <span>{m.progress} / {m.target}</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden p-px">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${finished ? 'bg-emerald-500' : 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Claim Button */}
                      <div className="mt-2 flex justify-end">
                        {m.claimed ? (
                          <span className="flex items-center gap-1 text-emerald-500 font-extrabold text-[10px] uppercase tracking-wider py-2">
                            <Check size={12} strokeWidth={3} /> Reward Claimed
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => claimMission(m.mission)}
                            disabled={!finished || claimingId === m.mission}
                            className={`px-5 py-2 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer select-none active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:cursor-not-allowed ${
                              finished 
                                ? 'bg-primary hover:bg-accent text-white shadow-md' 
                                : 'bg-white/5 text-muted-foreground border border-white/10'
                            }`}
                          >
                            {claimingId === m.mission ? 'Processing...' : 'Claim Reward'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CHALLENGE CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="flex flex-col gap-5 h-full animate-scale-up">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 select-none">
                <div>
                  <h3 className="font-extrabold text-lg text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                    Challenge Calendar view
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    Browse and enroll in daily, weekly, and monthly wellness challenges.
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
                  {['ALL', 'NUTRITION', 'SLEEP', 'FITNESS', 'STRESS'].map((cat: string) => (
                    <button
                      key={cat}
                      onClick={() => setCalendarFilter(cat)}
                      className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                        calendarFilter === cat 
                          ? 'bg-primary text-white shadow-md' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid lists */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {calendarChallenges
                  .filter(c => calendarFilter === 'ALL' || c.category === calendarFilter)
                  .map((c: any) => (
                    <div key={c.id} className="bg-secondary/15 border border-border/30 rounded-[20px] p-5 flex flex-col justify-between gap-5 hover:bg-secondary/25">
                      <div>
                        <div className="flex justify-between items-center select-none">
                          <span className="text-[8px] font-black uppercase text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/10">
                            {c.category}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            c.status === 'ACTIVE' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 animate-pulse'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-foreground mt-3">{c.name}</h4>
                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed font-semibold">
                          {c.description}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 border-t border-border/30 pt-3">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold select-none">
                          <span>Reward: <strong className="text-foreground">+{c.reward_xp} XP</strong></span>
                          <span>Participants: <strong className="text-foreground">{c.participants_count}</strong></span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold select-none">
                          <span>Starts: {c.start_date}</span>
                          <span>Ends: {c.end_date}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleCalendarChallenge(c.id, c.is_joined)}
                          className={`w-full py-2.5 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                            c.is_joined 
                              ? 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/25'
                              : 'bg-primary hover:bg-accent text-white shadow-md'
                          }`}
                        >
                          {c.is_joined ? 'Leave Challenge' : 'Join Challenge'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM CHALLENGES */}
          {activeTab === 'custom' && (
            <div className="flex flex-col lg:flex-row gap-8 h-full animate-scale-up">
              {/* Creator Form */}
              <div className="w-full lg:w-80 shrink-0 bg-secondary/15 border border-border/30 rounded-[24px] p-5">
                <h4 className="font-extrabold text-sm text-foreground mb-4 select-none">
                  Create Custom Challenge
                </h4>
                <form onSubmit={createCustomChallenge} className="flex flex-col gap-4 text-xs font-semibold">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Challenge Name *</label>
                    <input 
                      type="text" 
                      required
                      value={newChallengeName}
                      onChange={e => setNewChallengeName(e.target.value)}
                      placeholder="e.g. Fit Fam Steps Target"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Description</label>
                    <textarea 
                      value={newChallengeDesc}
                      onChange={e => setNewChallengeDesc(e.target.value)}
                      placeholder="Specify requirements and rules..."
                      className="w-full h-20 px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Duration (Days)</label>
                      <select 
                        value={newChallengeDuration}
                        onChange={e => setNewChallengeDuration(e.target.value)}
                        className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl cursor-pointer"
                      >
                        <option value="3">3 Days</option>
                        <option value="5">5 Days</option>
                        <option value="7">7 Days</option>
                        <option value="14">14 Days</option>
                        <option value="30">30 Days</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Visibility setting</label>
                    <select 
                      value={newChallengeVisibility}
                      onChange={e => setNewChallengeVisibility(e.target.value)}
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl cursor-pointer"
                    >
                      <option value="PUBLIC">Public Directory</option>
                      <option value="PRIVATE">Private Only</option>
                      <option value="FAMILY">Family Circle</option>
                      <option value="CORPORATE">Corporate League</option>
                      <option value="COMMUNITY">Community Only</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Invite Friends (Emails or Usernames)</label>
                    <input 
                      type="text" 
                      value={newChallengeInviteUser}
                      onChange={e => setNewChallengeInviteUser(e.target.value)}
                      placeholder="e.g. user1@email.com, username2 (comma-separated)"
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 mt-2 bg-primary hover:bg-accent text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Star size={12} /> Launch Challenge
                  </button>
                </form>
              </div>

              {/* Directory */}
              <div className="flex-1 flex flex-col gap-5">
                {pendingInvitations.length > 0 && (
                  <div className="mb-6 bg-gradient-to-r from-violet-950/40 via-indigo-950/40 to-violet-950/40 border border-violet-500/20 rounded-[24px] p-5">
                    <h4 className="font-extrabold text-sm text-violet-300 flex items-center gap-2 mb-3">
                      <UserPlus size={16} className="text-violet-400 animate-pulse" />
                      Pending Challenge Invitations ({pendingInvitations.length})
                    </h4>
                    <div className="flex flex-col gap-3">
                      {pendingInvitations.map((inv: any) => (
                        <div key={inv.id} className="bg-[#0e0c1f]/60 border border-violet-500/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-scale-up">
                          <div>
                            <span className="text-[8px] font-black uppercase text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                              Invited by {inv.invited_by_name || inv.invited_by_username}
                            </span>
                            <h5 className="font-extrabold text-sm text-white mt-1.5">{inv.challenge_name}</h5>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                              Duration: {inv.challenge_duration} Days
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => acceptInvitation(inv.id)}
                              className="px-3.5 py-1.5 bg-primary text-white text-[9px] font-black uppercase rounded-lg hover:bg-accent cursor-pointer shadow-sm"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => declineInvitation(inv.id)}
                              className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-[9px] font-black uppercase rounded-lg cursor-pointer flex items-center gap-1 transition-all"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h4 className="font-extrabold text-sm text-foreground select-none">
                  Active Custom Challenges
                </h4>

                <div className="flex flex-col gap-4 overflow-y-auto max-h-[420px] pr-2 customizer-scrollbar">
                  {[...createdChallenges, ...joinedChallenges, ...publicDirectory].length === 0 ? (
                    <div className="text-center py-16 text-xs text-muted-foreground font-semibold select-none border border-dashed border-border rounded-[24px]">
                      No custom challenges found in the directory.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Created by Me */}
                      {createdChallenges.map((c: any) => (
                        <div key={c.id} className="bg-secondary/10 border border-border/20 rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-scale-up">
                          <div>
                            <span className="text-[8px] font-black uppercase text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                              My Creation · {c.visibility}
                            </span>
                            <h5 className="font-extrabold text-sm text-foreground mt-1.5">{c.name}</h5>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{c.description}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-4 text-[10px] font-semibold text-muted-foreground select-none">
                              <span>+{c.reward_xp} XP</span>
                              <span>{c.participants_count} joined</span>
                              <span className="text-emerald-500 font-extrabold flex items-center gap-0.5">
                                <Check size={11} strokeWidth={3} /> Creator
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteCustomChallenge(c.id)}
                              className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-[9px] font-black uppercase rounded-lg cursor-pointer flex items-center gap-1 transition-all"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Joined */}
                      {joinedChallenges.map((c: any) => (
                        <div key={c.id} className="bg-secondary/10 border border-border/20 rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[8px] font-black uppercase text-violet-400">
                              Joined · By {c.creator_name}
                            </span>
                            <h5 className="font-extrabold text-sm text-foreground mt-1">{c.name}</h5>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{c.description}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-semibold text-muted-foreground">{c.participants_count} joined</span>
                            <button
                              type="button"
                              onClick={() => toggleUserChallenge(c.id, true)}
                              className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-[9px] font-black uppercase rounded-lg cursor-pointer flex items-center gap-1 transition-all"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Public Directory */}
                      {publicDirectory.map((c: any) => (
                        <div key={c.id} className="bg-secondary/10 border border-border/20 rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[8px] font-black uppercase text-muted-foreground">
                              Public · Creator: {c.creator_name}
                            </span>
                            <h5 className="font-extrabold text-sm text-foreground mt-1">{c.name}</h5>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{c.description}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-semibold text-muted-foreground">+{c.reward_xp} XP</span>
                            <button
                              type="button"
                              onClick={() => toggleUserChallenge(c.id, false)}
                              className="px-3.5 py-1.5 bg-primary text-white text-[9px] font-black uppercase rounded-lg hover:bg-accent cursor-pointer shadow-sm"
                            >
                              Join
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REFERRALS */}
          {activeTab === 'referral' && (
            <div className="flex flex-col lg:flex-row gap-8 h-full animate-scale-up select-none">
              <div className="flex-1 flex flex-col gap-6">
                <h3 className="font-extrabold text-lg text-foreground animate-scale-up" style={{ fontFamily: 'var(--font-heading)' }}>
                  Invite & Referral Program
                </h3>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-secondary/15 border border-border/30 rounded-2xl p-4">
                    <span className="block text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none">Total Invited</span>
                    <span className="block text-xl font-black text-foreground mt-1">{totalReferrals}</span>
                  </div>
                  <div className="bg-secondary/15 border border-border/30 rounded-2xl p-4">
                    <span className="block text-[8px] font-black text-emerald-400 uppercase tracking-widest leading-none">Successful</span>
                    <span className="block text-xl font-black text-emerald-400 mt-1">{successfulReferrals}</span>
                  </div>
                  <div className="bg-secondary/15 border border-border/30 rounded-2xl p-4">
                    <span className="block text-[8px] font-black text-violet-400 uppercase tracking-widest leading-none">XP Earned</span>
                    <span className="block text-xl font-black text-violet-400 mt-1">+{referralXpEarned}</span>
                  </div>
                </div>

                {/* Referral Code Box */}
                <div className="bg-gradient-to-tr from-violet-950/20 to-indigo-950/20 border border-violet-500/10 rounded-[24px] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Your Unique Referral Link</h4>
                    <p className="text-[10px] text-violet-200 mt-1 font-semibold leading-relaxed">
                      Earn 100 XP for every friend who joins VivoQuest! They also receive a Welcome XP bonus.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0e0c1f] border border-white/10 rounded-xl px-4 py-2.5 w-full md:w-auto justify-between select-all font-mono text-xs">
                    <span>{referralCode}</span>
                    <button 
                      onClick={copyToClipboard}
                      className="p-1 text-violet-400 hover:text-white transition-colors cursor-pointer ml-4"
                      title="Copy invite code"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Input referral code from friends */}
                <div className="bg-secondary/15 border border-border/30 rounded-[24px] p-5 flex flex-col gap-3">
                  <h4 className="font-extrabold text-sm text-foreground">Were you invited by a friend?</h4>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    Submit their referral code to claim an instant welcome bonus (50 XP, 20 coins, and a Starter Badge!).
                  </p>
                  <div className="flex gap-2 text-xs font-semibold mt-1">
                    <input 
                      type="text" 
                      value={inputReferralCode}
                      onChange={e => setInputReferralCode(e.target.value.toUpperCase())}
                      placeholder="e.g. RAJDIP123"
                      disabled={submittingReferral}
                      className="px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl outline-none font-bold text-foreground transition-all flex-1"
                    />
                    <button
                      type="button"
                      onClick={submitReferral}
                      disabled={submittingReferral || !inputReferralCode.trim()}
                      className="px-6 py-3 bg-primary hover:bg-accent text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {submittingReferral ? 'Applying...' : 'Apply Code'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Referral Leaderboard */}
              <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
                <h4 className="font-extrabold text-sm text-foreground">Top Referrers</h4>
                <div className="bg-[#0f0e20]/40 border border-white/[0.04] rounded-2xl p-4 flex flex-col gap-3">
                  {referralLeaderboard.length === 0 ? (
                    <div className="text-center py-8 text-[10px] text-white/30 font-mono">No entries logged</div>
                  ) : (
                    referralLeaderboard.map((item: any, idx: number) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 text-xs leading-none">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${
                            idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 
                            idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/20' :
                            'bg-white/5 text-white/40 border border-white/5'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <h5 className="font-extrabold text-white text-[11px]">{item.username}</h5>
                            <span className="text-[8px] text-white/40 font-semibold mt-1 block">Referrals: {item.successful_referrals}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-violet-400 font-mono">+{item.xp_earned} XP</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: REWARDS SHOP */}
          {activeTab === 'shop' && (
            <div className="flex flex-col gap-5 h-full animate-scale-up">
              <div className="flex justify-between items-center select-none">
                <div>
                  <h3 className="font-extrabold text-lg text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                    Rewards & Redemption Shop
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    Redeem cosmetics and vouchers using your metabolically-earned coins.
                  </p>
                </div>
                <div className="text-xs bg-amber-500/10 border border-amber-500/10 text-amber-500 px-4 py-2 rounded-full font-black flex items-center gap-1.5 shadow-sm shadow-amber-500/5">
                  <Coins size={14} className="animate-bounce" /> {coins} Coins Available
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {shopItems.map((item: any) => (
                  <div key={item.id} className="bg-secondary/15 border border-border/30 rounded-[24px] p-5 flex flex-col justify-between gap-4 hover:border-violet-500/20 transition-all">
                    <div>
                      <span className="text-[8px] font-black uppercase text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/10 select-none">
                        {item.item_type}
                      </span>
                      <h4 className="font-extrabold text-sm text-foreground mt-3">{item.name}</h4>
                      <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed font-semibold">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/30 pt-4 mt-2">
                      <div className="flex items-center gap-1 text-xs font-black text-amber-500 select-none">
                        <Coins size={13} /> {item.cost_coins}
                      </div>

                      {item.purchased ? (
                        <span className="flex items-center gap-1 text-emerald-500 font-extrabold text-[10px] uppercase tracking-wider">
                          <Check size={12} strokeWidth={3} /> Purchased
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => purchaseShopItem(item.id)}
                          disabled={coins < item.cost_coins || purchasingId === item.id}
                          className={`px-4 py-2 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:cursor-not-allowed ${
                            coins >= item.cost_coins 
                              ? 'bg-primary hover:bg-accent text-white shadow-sm' 
                              : 'bg-white/5 text-muted-foreground border border-white/10'
                          }`}
                        >
                          {purchasingId === item.id ? 'Redeeming...' : 'Purchase'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: BADGES */}
          {activeTab === 'badges' && (
            <div className="flex flex-col gap-5 h-full animate-scale-up select-none">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-lg text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                    Your Badge Collection
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    Display your achievements in running targets, hydration habits, and referral milestones.
                  </p>
                </div>
                <div className="text-xs bg-violet-500/10 border border-violet-500/10 text-primary px-3 py-1.5 rounded-full font-black">
                  {badgeCollectionPct}% Collection Complete
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {badges.map((b: any) => (
                  <div 
                    key={b.id} 
                    className={`border rounded-[24px] p-5 flex flex-col items-center text-center transition-all ${
                      b.unlocked 
                        ? 'bg-gradient-to-br from-violet-950/10 to-indigo-950/10 border-violet-500/20 hover:scale-105' 
                        : 'bg-secondary/5 border-border/10 opacity-40'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center relative overflow-hidden mb-3.5 border border-border/30 shadow-md">
                      {b.unlocked ? (
                        <Award size={28} className="text-primary animate-pulse" />
                      ) : (
                        <Lock size={20} className="text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-[7px] font-black uppercase text-violet-400 tracking-wider">
                      {b.badge_type}
                    </span>
                    <h4 className="font-extrabold text-xs text-foreground mt-1.5">{b.name}</h4>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-normal font-semibold max-w-[140px]">
                      {b.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: CORPORATE WELLNESS */}
          {activeTab === 'corporate' && (
            <div className="flex flex-col gap-6 h-full animate-scale-up select-none">
              <div>
                <h3 className="font-extrabold text-lg text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  Corporate Championship Arena
                </h3>
                <p className="text-[11px] text-muted-foreground font-semibold">
                  Live leaderboard standings for departments, teams, and employee athletes.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Employee Standings */}
                <div className="flex flex-col gap-4 bg-secondary/10 border border-border/30 rounded-[24px] p-5">
                  <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/30 pb-3">
                    <User size={16} className="text-primary" /> Top Employees
                  </h4>
                  <div className="flex flex-col gap-3.5 mt-1">
                    {topEmployees.length === 0 ? (
                      <div className="text-center py-10 text-[10px] text-muted-foreground">No records cataloged</div>
                    ) : (
                      topEmployees.map((emp: any, idx: number) => (
                        <div key={emp.id} className="flex items-center justify-between text-xs font-semibold leading-none">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center font-mono text-[9px] text-muted-foreground">
                              {idx + 1}
                            </span>
                            <div>
                              <h5 className="font-extrabold text-foreground">{emp.employee_name}</h5>
                              <span className="text-[8px] text-muted-foreground mt-0.5 block">{emp.employee_email}</span>
                            </div>
                          </div>
                          <span className="font-black text-[11px] text-primary">+{emp.xp_contributed} XP</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Team Standings */}
                <div className="flex flex-col gap-4 bg-secondary/10 border border-border/30 rounded-[24px] p-5">
                  <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/30 pb-3">
                    <Users size={16} className="text-violet-400" /> Top Teams
                  </h4>
                  <div className="flex flex-col gap-3.5 mt-1">
                    {teamRankings.length === 0 ? (
                      <div className="text-center py-10 text-[10px] text-muted-foreground">No records cataloged</div>
                    ) : (
                      teamRankings.map((team: any, idx: number) => (
                        <div key={team.id} className="flex items-center justify-between text-xs font-semibold leading-none">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center font-mono text-[9px] text-muted-foreground">
                              {idx + 1}
                            </span>
                            <div>
                              <h5 className="font-extrabold text-foreground">{team.name}</h5>
                              <span className="text-[8px] text-muted-foreground mt-0.5 block">Dept: {team.department}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-[11px] text-violet-400">+{team.total_xp} XP</span>
                            <span className="block text-[8px] text-muted-foreground mt-0.5">Runs: {team.total_runs}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Department Standings */}
                <div className="flex flex-col gap-4 bg-secondary/10 border border-border/30 rounded-[24px] p-5">
                  <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/30 pb-3">
                    <Trophy size={16} className="text-amber-500" /> Department Rankings
                  </h4>
                  <div className="flex flex-col gap-3.5 mt-1">
                    {departmentRankings.length === 0 ? (
                      <div className="text-center py-10 text-[10px] text-muted-foreground">No records cataloged</div>
                    ) : (
                      departmentRankings.map((dept: any, idx: number) => (
                        <div key={dept.id} className="flex items-center justify-between text-xs font-semibold leading-none">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center font-mono text-[9px] text-muted-foreground">
                              {idx + 1}
                            </span>
                            <h5 className="font-extrabold text-foreground">{dept.name}</h5>
                          </div>
                          <span className="font-black text-[11px] text-amber-500">+{dept.total_xp} XP</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
