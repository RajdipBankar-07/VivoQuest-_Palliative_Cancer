'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Trophy, FileText, Settings, Bell, Activity, AlertTriangle,
  Plus, Check, X, Sliders, Search, Filter, Shield, Trash2, Lock,
  Building, RefreshCw, TrendingUp, MapPin, Globe, LogOut, Eye,
  UserCheck, Wifi, WifiOff, BarChart3, Send, ChevronDown, ChevronUp,
  UserX, Star, Calendar, Clock, Cpu, Database, ArrowUpRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'http://127.0.0.1:3001/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('analytics');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // ── Analytics States ────────────────────────────────────────────
  const [stats, setStats] = useState<any>({
    total_users: 0, active_users: 0, suspended_users: 0, new_today: 0,
    total_communities: 0, total_challenges: 0, ai_usage_events: 0, admin_actions_logged: 0,
    subscription_breakdown: { free: 0, pro: 0, enterprise: 0, expired: 0 },
    growth_7_days: [],
  });
  const [legacyMetrics, setLegacyMetrics] = useState<any>({ total_revenue: '₹0' });

  // ── User Management States ──────────────────────────────────────
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAge, setFilterAge] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Community States ────────────────────────────────────────────
  const [communitiesList, setCommunitiesList] = useState<any[]>([]);
  const [showCommunityForm, setShowCommunityForm] = useState(false);
  const [newCommName, setNewCommName] = useState('');
  const [newCommType, setNewCommType] = useState('CORPORATE');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [editingComm, setEditingComm] = useState<any>(null);

  // ── Subscription States ─────────────────────────────────────────
  const [subRegistryList, setSubRegistryList] = useState<any[]>([]);
  const [subMetrics, setSubMetrics] = useState<any>({
    active_subscribers: 0, expiring_30_days: 0, expiring_7_days: 0, expired_subscribers: 0,
  });

  // ── Notifications States ────────────────────────────────────────
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('IN_APP');
  const [notifTarget, setNotifTarget] = useState('ALL');
  const [notifResult, setNotifResult] = useState<any>(null);

  // ── Audit Log States ────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditFilter, setAuditFilter] = useState('');

  // ── Challenges & Rewards States ──────────────────────────────────
  const [challengeStats, setChallengeStats] = useState<any>({
    total_challenges: 0, active_challenges: 0, completed_challenges: 0,
    total_participants: 0, xp_distributed: 0, coins_distributed: 0, rewards_distributed: 0
  });
  const [challengesList, setChallengesList] = useState<any[]>([]);
  const [pendingApprovalsList, setPendingApprovalsList] = useState<any[]>([]);
  
  // Catalog options
  const [catalog, setCatalog] = useState<any>({ badges: [], avatar_rewards: [], profile_frames: [] });

  // Form states
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<any>(null);
  
  // Form Fields
  const [challengeName, setChallengeName] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');
  const [challengeType, setChallengeType] = useState('WEEKLY');
  const [challengeCategory, setChallengeCategory] = useState('FITNESS');
  const [difficulty, setDifficulty] = useState('EASY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(1000);
  const [challengeRules, setChallengeRules] = useState('');
  const [challengeStatus, setChallengeStatus] = useState('DRAFT');
  
  // Target config
  const [targetType, setTargetType] = useState('STEPS');
  const [targetValue, setTargetValue] = useState(10000);
  
  // Rewards Config
  const [customRewards, setCustomRewards] = useState(false);
  const [xpReward, setXpReward] = useState(50);
  const [coinReward, setCoinReward] = useState(20);
  const [badgeReward, setBadgeReward] = useState('');
  const [avatarReward, setAvatarReward] = useState('');
  const [profileFrameReward, setProfileFrameReward] = useState('');
  const [specialReward, setSpecialReward] = useState('');
  
  // Leaderboard rewards config
  const [top1Xp, setTop1Xp] = useState(1000);
  const [top1Coin, setTop1Coin] = useState(500);
  const [top1Badge, setTop1Badge] = useState('');
  
  const [top2Xp, setTop2Xp] = useState(750);
  const [top2Coin, setTop2Coin] = useState(300);
  const [top2Badge, setTop2Badge] = useState('');
  
  const [top3Xp, setTop3Xp] = useState(500);
  const [top3Coin, setTop3Coin] = useState(200);
  const [top3Badge, setTop3Badge] = useState('');


  // ── API Helpers ─────────────────────────────────────────────────
  const getHeaders = () => {
    const token = localStorage.getItem('vivo_token') || '';
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const showFeedback = (message: string, isErr = false) => {
    if (isErr) { setErr(message); setMsg(''); }
    else { setMsg(message); setErr(''); }
    setTimeout(() => { setMsg(''); setErr(''); }, 4000);
  };

  // ── Fetch Functions ─────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const [statsRes, metricsRes] = await Promise.all([
        fetch(`${API}/auth/admin/stats/`, { headers: getHeaders() }),
        fetch(`${API}/auth/admin/metrics/`, { headers: getHeaders() }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (metricsRes.ok) setLegacyMetrics(await metricsRes.json());
    } catch (e) { console.error('Stats fetch error:', e); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (filterAge) params.append('age_group', filterAge);
      if (filterGender) params.append('gender', filterGender);
      if (filterPlan) params.append('plan', filterPlan);
      if (filterRole) params.append('role', filterRole);
      const res = await fetch(`${API}/auth/admin/users/?${params}`, { headers: getHeaders() });
      if (res.ok) setUsersList(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchUserDetail = async (userId: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/auth/admin/users/${userId}/detail/`, { headers: getHeaders() });
      if (res.ok) setUserDetail(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingDetail(false); }
  };

  const fetchCommunities = async () => {
    try {
      const res = await fetch(`${API}/auth/admin/communities/`, { headers: getHeaders() });
      if (res.ok) setCommunitiesList(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchSubRegistry = async () => {
    try {
      const res = await fetch(`${API}/billing/admin/subscriptions/`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSubRegistryList(data.subscriptions || []);
        setSubMetrics(data.metrics || {});
      }
    } catch (e) { console.error(e); }
  };

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (auditFilter) params.append('action', auditFilter);
      const res = await fetch(`${API}/auth/admin/audit-logs/?${params}`, { headers: getHeaders() });
      if (res.ok) setAuditLogs(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchChallengesData = async () => {
    try {
      const [statsRes, challengesRes, approvalsRes, catalogRes] = await Promise.all([
        fetch(`${API}/gamification/admin/challenges/stats/`, { headers: getHeaders() }),
        fetch(`${API}/gamification/admin/challenges/`, { headers: getHeaders() }),
        fetch(`${API}/gamification/admin/approvals/`, { headers: getHeaders() }),
        fetch(`${API}/gamification/admin/challenges/catalog/`, { headers: getHeaders() }),
      ]);
      if (statsRes.ok) setChallengeStats(await statsRes.json());
      if (challengesRes.ok) setChallengesList(await challengesRes.json());
      if (approvalsRes.ok) setPendingApprovalsList(await approvalsRes.json());
      if (catalogRes.ok) setCatalog(await catalogRes.json());
    } catch (e) { console.error('Challenges fetch error:', e); }
  };

  useEffect(() => {
    document.body.classList.add('admin-theme-active');
    
    // Check if logged in as SUPER_ADMIN
    const role = document.cookie.split(';').find(c => c.trim().startsWith('vivo_role='))?.split('=')[1];
    const token = document.cookie.split(';').find(c => c.trim().startsWith('vivo_token='))?.split('=')[1];
    
    if (role !== 'SUPER_ADMIN' || !token) {
      router.push('/auth/login');
    }

    return () => {
      document.body.classList.remove('admin-theme-active');
    };
  }, [router]);

  useEffect(() => {
    setMsg(''); setErr('');
    if (activeTab === 'analytics') fetchStats();
    else if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'communities') fetchCommunities();
    else if (activeTab === 'subscriptions') fetchSubRegistry();
    else if (activeTab === 'challenges') fetchChallengesData();
    else if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [searchQuery, filterAge, filterGender, filterPlan, filterRole]);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs();
  }, [auditFilter]);

  // ── Action Handlers ─────────────────────────────────────────────
  const handleCreateChallenge = async () => {
    if (!challengeName || !startDate || !endDate) {
      showFeedback('Name, Start Date, and End Date are required.', true);
      return;
    }
    
    let finalXp = xpReward;
    let finalCoin = coinReward;
    if (!customRewards) {
      if (difficulty === 'EASY') { finalXp = 50; finalCoin = 20; }
      else if (difficulty === 'MEDIUM') { finalXp = 150; finalCoin = 50; }
      else if (difficulty === 'HARD') { finalXp = 500; finalCoin = 150; }
      else if (difficulty === 'EXPERT') { finalXp = 1000; finalCoin = 500; }
    }

    const payload: any = {
      name: challengeName,
      description: challengeDesc,
      challenge_type: challengeType,
      category: challengeCategory,
      difficulty,
      start_date: startDate,
      end_date: endDate,
      max_participants: maxParticipants,
      rules: challengeRules,
      status: challengeStatus,
      target_type: targetType,
      target_value: targetValue,
      xp_reward: finalXp,
      coin_reward: finalCoin,
      special_reward: specialReward,
      top_1_xp: top1Xp,
      top_1_coin: top1Coin,
      top_2_xp: top2Xp,
      top_2_coin: top2Coin,
      top_3_xp: top3Xp,
      top_3_coin: top3Coin,
    };

    if (badgeReward) payload.badge_reward = parseInt(badgeReward);
    if (avatarReward) payload.avatar_reward = parseInt(avatarReward);
    if (profileFrameReward) payload.profile_frame_reward = parseInt(profileFrameReward);
    if (top1Badge) payload.top_1_badge = parseInt(top1Badge);
    if (top2Badge) payload.top_2_badge = parseInt(top2Badge);
    if (top3Badge) payload.top_3_badge = parseInt(top3Badge);

    try {
      const res = await fetch(`${API}/gamification/admin/challenges/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showFeedback('Challenge created successfully!');
        resetChallengeForm();
        fetchChallengesData();
      } else {
        const errData = await res.json();
        showFeedback(JSON.stringify(errData) || 'Failed to create challenge.', true);
      }
    } catch (e) {
      showFeedback('Network error.', true);
    }
  };

  const handleUpdateChallenge = async (challengeId: number, updatedFields: any) => {
    try {
      const res = await fetch(`${API}/gamification/admin/challenges/${challengeId}/`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updatedFields),
      });
      if (res.ok) {
        showFeedback('Challenge updated successfully!');
        fetchChallengesData();
      } else {
        const errData = await res.json();
        showFeedback(errData.error || 'Failed to update challenge.', true);
      }
    } catch (e) {
      showFeedback('Network error.', true);
    }
  };

  const handleDeleteChallenge = async (challengeId: number) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;
    try {
      const res = await fetch(`${API}/gamification/admin/challenges/${challengeId}/`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        showFeedback('Challenge deleted successfully!');
        fetchChallengesData();
      } else {
        const errData = await res.json();
        showFeedback(errData.error || 'Failed to delete challenge.', true);
      }
    } catch (e) {
      showFeedback('Network error.', true);
    }
  };

  const handleApproveReward = async (participantId: number) => {
    try {
      const res = await fetch(`${API}/gamification/admin/approvals/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ participant_id: participantId }),
      });
      if (res.ok) {
        showFeedback('Reward approved and distributed successfully!');
        fetchChallengesData();
      } else {
        const errData = await res.json();
        showFeedback(errData.error || 'Failed to approve reward.', true);
      }
    } catch (e) {
      showFeedback('Network error.', true);
    }
  };

  const resetChallengeForm = () => {
    setChallengeName('');
    setChallengeDesc('');
    setChallengeType('WEEKLY');
    setChallengeCategory('FITNESS');
    setDifficulty('EASY');
    setStartDate('');
    setEndDate('');
    setMaxParticipants(1000);
    setChallengeRules('');
    setChallengeStatus('DRAFT');
    setTargetType('STEPS');
    setTargetValue(10000);
    setCustomRewards(false);
    setXpReward(50);
    setCoinReward(20);
    setBadgeReward('');
    setAvatarReward('');
    setProfileFrameReward('');
    setSpecialReward('');
    setTop1Xp(1000);
    setTop1Coin(500);
    setTop1Badge('');
    setTop2Xp(750);
    setTop2Coin(300);
    setTop2Badge('');
    setTop3Xp(500);
    setTop3Coin(200);
    setTop3Badge('');
    setShowChallengeForm(false);
    setEditingChallenge(null);
  };

  const handleUserAction = async (userId: number, action: string, extra: any = {}) => {
    try {
      const res = await fetch(`${API}/auth/admin/users/${userId}/action/`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (res.ok) { showFeedback(data.message); fetchUsers(); if (userDetail) fetchUserDetail(userId); }
      else showFeedback(data.error || 'Action failed.', true);
    } catch (e) { showFeedback('Network error.', true); }
  };

  const handleForceLogout = async (userId: number, email: string) => {
    if (!confirm(`Force logout all sessions for ${email}?`)) return;
    try {
      const res = await fetch(`${API}/auth/admin/users/${userId}/force-logout/`, {
        method: 'POST', headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) showFeedback(data.message);
      else showFeedback(data.error || 'Force logout failed.', true);
    } catch (e) { showFeedback('Network error.', true); }
  };

  const handleCommunityAction = async (action: string, extra: any = {}) => {
    try {
      const res = await fetch(`${API}/auth/admin/communities/action/`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (res.ok) { showFeedback(data.message); fetchCommunities(); setShowCommunityForm(false); setEditingComm(null); }
      else showFeedback(data.error || 'Community operation failed.', true);
    } catch (e) { showFeedback('Network error.', true); }
  };

  const triggerExpiryCheck = async () => {
    try {
      const res = await fetch(`${API}/billing/admin/trigger-expiry-check/`, {
        method: 'POST', headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) { showFeedback(`Scan complete! Updated: ${data.status_updates}, Alerts: ${data.notifications_sent}`); fetchSubRegistry(); }
      else showFeedback(data.error, true);
    } catch (e) { showFeedback('Error triggering check.', true); }
  };

  const handleSubAction = async (subId: number, action: string, extra: any = {}) => {
    try {
      const res = await fetch(`${API}/billing/admin/subscriptions/action/`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ subscription_id: subId, action, ...extra }),
      });
      const data = await res.json();
      if (res.ok) { showFeedback(data.message); fetchSubRegistry(); }
      else showFeedback(data.error || 'Action failed.', true);
    } catch (e) { showFeedback('Network error.', true); }
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifMessage) { showFeedback('Title and message are required.', true); return; }
    try {
      const res = await fetch(`${API}/auth/admin/notifications/send/`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({
          title: notifTitle, message: notifMessage,
          notification_type: notifType, target: notifTarget,
        }),
      });
      const data = await res.json();
      if (res.ok) { setNotifResult(data); showFeedback(data.message); setNotifTitle(''); setNotifMessage(''); }
      else showFeedback(data.error || 'Send failed.', true);
    } catch (e) { showFeedback('Network error.', true); }
  };

  const handleLogout = () => {
    document.cookie = 'vivo_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'vivo_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'vivo_tier=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('vivo_token');
    router.push('/auth/login');
  };

  const triggerPasswordReset = (userId: number, email: string) => {
    const newPass = prompt(`Set new password for ${email}:`, 'VivoQuest@2026');
    if (newPass) handleUserAction(userId, 'RESET_PASSWORD', { password: newPass });
  };

  // ── Tab Config ──────────────────────────────────────────────────
  const TABS = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'communities', label: 'Communities', icon: Building },
    { id: 'challenges', label: 'Challenges & Rewards', icon: Trophy },
    { id: 'subscriptions', label: 'Subscriptions', icon: Sliders },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
  ];

  const maxGrowth = Math.max(...(stats.growth_7_days?.map((d: any) => d.new_users) || [1]), 1);

  return (
    <div className="relative min-h-screen bg-[#080711] text-white overflow-hidden font-sans">
      {/* ── Background Glowing Orbs ──────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[140px] animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[140px] animate-pulse duration-[10000ms]" />
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] rounded-full bg-fuchsia-600/5 blur-[120px]" />
      </div>

      {/* ── Admin Topbar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-[#080711]/60 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-[1440px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight">VivoQuest</span>
              <span className="ml-2.5 text-violet-400 text-[10px] font-black uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/10">
                Super Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-black px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              Session Active
            </div>
            <button
              id="admin-logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/40 hover:text-red-400 text-xs font-bold px-4 py-2 rounded-2xl hover:bg-red-500/10 border border-white/[0.04] hover:border-red-500/10 transition-all duration-300"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-8 py-10 relative z-10">
        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-violet-300 tracking-tight">
              Super Admin Console
            </h1>
            <p className="text-white/40 text-xs mt-2 font-semibold tracking-wide uppercase">
              Full platform control · User management · Analytics · Security
            </p>
          </div>
          <div className="text-right text-[10px] text-white/30 font-mono">
            System time: {new Date().toLocaleDateString()} · VIVOQUEST CORE V2.0
          </div>
        </div>

        {/* ── Global Feedback ──────────────────────────────────────── */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl p-4.5 mb-8 text-xs font-bold shadow-lg shadow-emerald-950/20"
            >
              <Check size={16} className="shrink-0" /> {msg}
            </motion.div>
          )}
          {err && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl p-4.5 mb-8 text-xs font-bold shadow-lg shadow-red-950/20"
            >
              <AlertTriangle size={16} className="shrink-0" /> {err}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tab Navigation ────────────────────────────────────────── */}
        <div className="relative flex gap-2 bg-white/[0.02] border border-white/[0.05] rounded-3xl p-1.5 mb-10 w-fit flex-wrap">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`admin-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2.5 py-3 px-6 rounded-2xl font-bold text-xs transition-all duration-300 z-10 select-none ${
                  active ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl shadow-lg shadow-violet-600/30 -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={14} className={active ? "text-white animate-pulse" : "text-white/40"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Content Render Area (Animated Tab Transitions) ───────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex flex-col gap-8"
          >
            {/* ══════════════════════════════════════════════════════════
                TAB 1: ANALYTICS DASHBOARD
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Users', value: stats.total_users, sub: `${stats.new_today} new today`, icon: Users, color: 'from-violet-500 to-indigo-500', glow: 'shadow-violet-600/5 hover:border-violet-500/30' },
                    { label: 'Active Users', value: stats.active_users, sub: `${stats.suspended_users} suspended`, icon: UserCheck, color: 'from-emerald-500 to-teal-500', glow: 'shadow-emerald-600/5 hover:border-emerald-500/30' },
                    { label: 'Communities', value: stats.total_communities, sub: `${stats.total_challenges} challenges`, icon: Building, color: 'from-cyan-500 to-blue-500', glow: 'shadow-cyan-600/5 hover:border-cyan-500/30' },
                    { label: 'AI Events', value: stats.ai_usage_events, sub: `${stats.admin_actions_logged} admin actions`, icon: Cpu, color: 'from-amber-500 to-orange-500', glow: 'shadow-amber-600/5 hover:border-amber-500/30' },
                  ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <motion.div
                        whileHover={{ y: -4, scale: 1.01 }}
                        key={i}
                        className={`relative overflow-hidden bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 shadow-2xl transition-all duration-300 ${card.glow}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{card.label}</span>
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg shadow-black/25`}>
                            <Icon size={14} className="text-white" />
                          </div>
                        </div>
                        <div className="text-4xl font-extrabold text-white tracking-tight mb-1">{card.value}</div>
                        <div className="text-white/30 text-xs font-semibold">{card.sub}</div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Revenue & Subscription Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue Card */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-[#1c1547] to-[#0f0b29] border border-violet-500/20 rounded-3xl p-8 shadow-2xl group flex flex-col justify-between min-h-[200px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-600/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="relative z-10 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
                      <span className="text-violet-400 text-[10px] font-black uppercase tracking-widest">Projected Revenue</span>
                    </div>
                    <div className="relative z-10 mt-6 mb-4">
                      <div className="text-5xl font-black text-white tracking-tight">{legacyMetrics.total_revenue}</div>
                      <p className="text-white/30 text-xs font-semibold mt-2">Based on active PRO & Enterprise subscriptions</p>
                    </div>
                  </div>

                  {/* Subscription Breakdown */}
                  <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 shadow-2xl">
                    <h3 className="text-white font-bold text-sm mb-5">Subscription Breakdown</h3>
                    <div className="flex flex-col gap-4">
                      {[
                        { label: 'Free Plan', value: stats.subscription_breakdown?.free || 0, color: 'from-white/10 to-white/20', pct: stats.total_users },
                        { label: 'Pro Plan', value: stats.subscription_breakdown?.pro || 0, color: 'from-violet-600 to-indigo-600', pct: stats.total_users },
                        { label: 'Enterprise', value: stats.subscription_breakdown?.enterprise || 0, color: 'from-cyan-500 to-blue-500', pct: stats.total_users },
                        { label: 'Expired', value: stats.subscription_breakdown?.expired || 0, color: 'from-red-500 to-pink-500', pct: stats.total_users },
                      ].map((item, i) => {
                        const pct = item.pct > 0 ? Math.round((item.value / item.pct) * 100) : 0;
                        return (
                          <div key={i} className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-white/50">{item.label}</span>
                              <span className="text-white font-bold">{item.value} <span className="text-white/30">({pct}%)</span></span>
                            </div>
                            <div className="h-2 bg-white/[0.03] border border-white/[0.04] rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                                className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 7-Day Growth Chart */}
                <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-white font-bold text-sm">User Growth</h3>
                      <p className="text-white/30 text-xs mt-0.5">New registration stats for the last 7 days</p>
                    </div>
                    <button
                      onClick={fetchStats}
                      className="flex items-center gap-1.5 text-white/40 hover:text-violet-400 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all"
                    >
                      <RefreshCw size={13} className="hover:rotate-180 transition-transform duration-500" /> Refresh
                    </button>
                  </div>
                  <div className="flex items-end gap-4 h-40 pt-4 relative">
                    <div className="absolute inset-x-0 top-4 border-t border-white/[0.02]" />
                    <div className="absolute inset-x-0 top-16 border-t border-white/[0.02]" />
                    <div className="absolute inset-x-0 top-28 border-t border-white/[0.02]" />
                    
                    {(stats.growth_7_days || []).map((d: any, i: number) => {
                      const pct = maxGrowth > 0 ? (d.new_users / maxGrowth) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative z-10">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-violet-600 text-white text-[9px] font-bold py-1 px-2.5 rounded-lg absolute bottom-[85px] shadow-lg shadow-violet-600/30 pointer-events-none whitespace-nowrap">
                            {d.new_users} users
                          </span>
                          <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.max(pct, 5)}%` }}
                              transition={{ duration: 0.8, delay: i * 0.05, ease: 'backOut' }}
                              className="w-full max-w-[24px] bg-gradient-to-t from-violet-600/20 via-violet-500/80 to-violet-400 rounded-t-full group-hover:to-fuchsia-400 transition-colors shadow-[0_-2px_12px_rgba(124,58,237,0.2)] relative"
                            >
                              <div className="absolute top-0 inset-x-0 h-1 rounded-t-full bg-white/60 shadow-[0_0_8px_#fff]" />
                            </motion.div>
                          </div>
                          <span className="text-white/30 group-hover:text-white/60 text-[9px] font-bold mt-1 transition-colors">{d.date}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Demographics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      title: 'Age Personalization Tiers', icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10',
                      items: [
                        { label: 'Teenagers (13-19)', pct: '18%' },
                        { label: 'Adults (20-50)', pct: '62%' },
                        { label: 'Healthy Aging (50-80)', pct: '15%' },
                        { label: 'Sports Enthusiasts', pct: '5%' },
                      ]
                    },
                    {
                      title: 'Active States', icon: MapPin, color: 'text-emerald-400', bg: 'bg-emerald-500/10',
                      items: [
                        { label: 'Delhi', pct: '38%' },
                        { label: 'West Bengal', pct: '24%' },
                        { label: 'Maharashtra', pct: '21%' },
                        { label: 'Others', pct: '17%' },
                      ]
                    },
                    {
                      title: 'Community Types', icon: Globe, color: 'text-cyan-400', bg: 'bg-cyan-500/10',
                      items: [
                        { label: 'Corporate Wellness', pct: '45%' },
                        { label: 'Village Leagues', pct: '25%' },
                        { label: 'School Sports', pct: '20%' },
                        { label: 'Private Circles', pct: '10%' },
                      ]
                    },
                  ].map((section, si) => {
                    const Icon = section.icon;
                    return (
                      <div key={si} className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 shadow-2xl">
                        <h4 className="flex items-center gap-2 text-white/50 text-[10px] font-black uppercase tracking-wider mb-5">
                          <div className={`w-6 h-6 rounded-lg ${section.bg} flex items-center justify-center`}>
                            <Icon size={12} className={section.color} />
                          </div>
                          {section.title}
                        </h4>
                        <div className="flex flex-col gap-2.5">
                          {section.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center bg-white/[0.01] border border-white/[0.03] rounded-2xl px-4 py-3 text-xs font-semibold hover:bg-white/[0.03] transition-colors duration-300">
                              <span className="text-white/60">{item.label}</span>
                              <span className={`${section.color} font-black`}>{item.pct}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 2: USER MANAGEMENT
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'users' && (
              <>
                {/* Filters */}
                <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-5 flex flex-col lg:flex-row gap-4 items-center shadow-2xl">
                  <div className="relative flex-1 w-full">
                    <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      id="user-search"
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full pl-11 pr-4 py-3.5 bg-white/[0.02] border border-white/10 rounded-2xl text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 hover:bg-white/[0.04] transition-all duration-300"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs w-full lg:w-auto">
                    {[
                      { value: filterAge, set: setFilterAge, opts: [['', 'All Age Groups'], ['TEEN', 'Teen (13-19)'], ['ADULT', 'Adult (20-50)'], ['ELDER', 'Elder (50-80)'], ['ATHLETE', 'Athlete']] },
                      { value: filterGender, set: setFilterGender, opts: [['', 'All Genders'], ['MALE', 'Male'], ['FEMALE', 'Female'], ['OTHER', 'Other']] },
                      { value: filterRole, set: setFilterRole, opts: [['', 'All Roles'], ['USER', 'User'], ['LEADER', 'Leader'], ['CORP_ADMIN', 'Corp Admin'], ['CLINICAL_OP', 'Clinical Op']] },
                      { value: filterPlan, set: setFilterPlan, opts: [['', 'All Plans'], ['FREE', 'Free'], ['PRO', 'Pro'], ['ENTERPRISE', 'Enterprise']] },
                    ].map((sel, i) => (
                      <select
                        key={i}
                        value={sel.value}
                        onChange={e => sel.set(e.target.value)}
                        className="flex-1 lg:flex-none bg-white/[0.02] border border-white/10 text-white/70 rounded-2xl px-4 py-3 focus:outline-none focus:border-violet-500/50 hover:bg-white/[0.04] transition-all duration-300"
                      >
                        {sel.opts.map(([v, l]) => <option key={v} value={v} className="bg-[#0f0e20]">{l}</option>)}
                      </select>
                    ))}
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.05] text-white/40 uppercase tracking-wider text-[10px] font-black bg-white/[0.01]">
                          <th className="px-6 py-5">User</th>
                          <th className="px-6 py-5">Profile</th>
                          <th className="px-6 py-5">Role</th>
                          <th className="px-6 py-5">Plan</th>
                          <th className="px-6 py-5">Status</th>
                          <th className="px-6 py-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {loading ? (
                          <tr><td colSpan={6} className="py-16 text-center text-white/30 font-semibold tracking-wider">Loading users registry...</td></tr>
                        ) : usersList.length === 0 ? (
                          <tr><td colSpan={6} className="py-16 text-center text-white/30 font-semibold tracking-wider">No users match query.</td></tr>
                        ) : usersList.map(u => (
                          <tr key={u.id} className="hover:bg-white/[0.02] transition-colors duration-300">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                {u.profile_picture ? (
                                  <img src={u.profile_picture} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0 select-none" alt="" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-violet-600/20 text-violet-400 border border-violet-500/10 flex items-center justify-center font-bold text-[10px] uppercase shrink-0 select-none">
                                    {u.name ? u.name.substring(0, 2) : 'VQ'}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-white text-[13px]">{u.name}</div>
                                  <div className="text-white/40 text-[10px] mt-0.5 font-mono">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="text-white/60 text-[10px] font-bold">{u.age_group} · {u.gender}</div>
                              <div className="text-white/30 text-[10px] mt-0.5">{u.state}</div>
                            </td>
                            <td className="px-6 py-5">
                              <select
                                value={u.role}
                                onChange={e => handleUserAction(u.id, 'CHANGE_ROLE', { role: e.target.value })}
                                disabled={u.email === 'admin@vivoquest.com'}
                                className="bg-white/[0.02] border border-white/10 text-white/80 rounded-xl px-3 py-2 text-[10px] focus:outline-none w-32 disabled:opacity-30 hover:border-white/20 transition-colors cursor-pointer"
                              >
                                <option value="USER" className="bg-[#0f0e20]">User</option>
                                <option value="LEADER" className="bg-[#0f0e20]">Leader</option>
                                <option value="CORP_ADMIN" className="bg-[#0f0e20]">Corp Admin</option>
                                <option value="CLINICAL_OP" className="bg-[#0f0e20]">Clinical Op</option>
                                <option value="SUPER_ADMIN" className="bg-[#0f0e20]">Super Admin</option>
                              </select>
                            </td>
                            <td className="px-6 py-5">
                              <select
                                value={u.plan}
                                onChange={e => handleUserAction(u.id, 'CHANGE_PLAN', { plan: e.target.value })}
                                disabled={u.email === 'admin@vivoquest.com'}
                                className="bg-white/[0.02] border border-white/10 text-violet-400 rounded-xl px-3 py-2 text-[10px] focus:outline-none font-bold w-28 disabled:opacity-30 hover:border-white/20 transition-colors cursor-pointer"
                              >
                                <option value="FREE" className="bg-[#0f0e20]">Free</option>
                                <option value="PRO" className="bg-[#0f0e20]">Pro</option>
                                <option value="ENTERPRISE" className="bg-[#0f0e20]">Enterprise</option>
                              </select>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                u.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-red-500/10 text-red-400 border border-red-500/10'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                {u.is_active ? 'Active' : 'Suspended'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex justify-end gap-2">
                                <button
                                  id={`view-user-${u.id}`}
                                  onClick={() => { setSelectedUser(u); fetchUserDetail(u.id); }}
                                  className="p-2.5 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/10 rounded-xl transition-all"
                                  title="View Details"
                                >
                                  <Eye size={13} />
                                </button>
                                {u.is_active ? (
                                  <button onClick={() => handleUserAction(u.id, 'SUSPEND')}
                                    disabled={u.email === 'admin@vivoquest.com'}
                                    className="p-2.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/10 rounded-xl transition-all disabled:opacity-20" title="Suspend">
                                    <Lock size={13} />
                                  </button>
                                ) : (
                                  <button onClick={() => handleUserAction(u.id, 'ACTIVATE')}
                                    disabled={u.email === 'admin@vivoquest.com'}
                                    className="p-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/10 rounded-xl transition-all disabled:opacity-20" title="Activate">
                                    <Check size={13} />
                                  </button>
                                )}
                                <button onClick={() => handleForceLogout(u.id, u.email)}
                                  disabled={u.email === 'admin@vivoquest.com'}
                                  className="p-2.5 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/10 rounded-xl transition-all disabled:opacity-20" title="Force Logout">
                                  <WifiOff size={13} />
                                </button>
                                <button onClick={() => triggerPasswordReset(u.id, u.email)}
                                  disabled={u.email === 'admin@vivoquest.com'}
                                  className="py-1 px-3 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all text-[10px] font-extrabold disabled:opacity-20">
                                  Reset Pass
                                </button>
                                <button
                                  onClick={() => { if (confirm(`Delete user account ${u.email}?`)) handleUserAction(u.id, 'DELETE'); }}
                                  disabled={u.email === 'admin@vivoquest.com'}
                                  className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 rounded-xl transition-all disabled:opacity-20" title="Delete Account">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 3: COMMUNITY MANAGEMENT
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'communities' && (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-white font-black text-xl tracking-tight">League Communities & Circles</h3>
                    <p className="text-white/30 text-xs mt-0.5">Manage user-organized activity groups and corporate circles</p>
                  </div>
                  <button
                    id="create-community-btn"
                    onClick={() => { setShowCommunityForm(!showCommunityForm); setEditingComm(null); }}
                    className="flex items-center gap-2 py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-violet-600/20 transition-all duration-300"
                  >
                    <Plus size={14} /> Create Community
                  </button>
                </div>

                {/* Create / Edit Form */}
                <AnimatePresence>
                  {(showCommunityForm || editingComm) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 max-w-xl flex flex-col gap-5 shadow-2xl">
                        <h4 className="text-white font-extrabold text-sm tracking-tight">{editingComm ? 'Edit Community Circle' : 'Create New Community Circle'}</h4>
                        <div className="flex flex-col gap-4 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-white/40 font-bold uppercase tracking-wider block mb-2">Circle Name</label>
                              <input
                                type="text"
                                value={editingComm ? editingComm.name : newCommName}
                                onChange={e => editingComm ? setEditingComm({ ...editingComm, name: e.target.value }) : setNewCommName(e.target.value)}
                                placeholder="e.g. Reliance Corporate Sports Division"
                                className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.04] transition-all"
                              />
                            </div>
                            {!editingComm && (
                              <div>
                                <label className="text-white/40 font-bold uppercase tracking-wider block mb-2">League Type</label>
                                <select
                                  value={newCommType}
                                  onChange={e => setNewCommType(e.target.value)}
                                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-violet-500/50 hover:bg-white/[0.04] transition-all cursor-pointer"
                                >
                                  <option value="CORPORATE" className="bg-[#0f0e20]">Corporate Wellness League</option>
                                  <option value="VILLAGE" className="bg-[#0f0e20]">Village League</option>
                                  <option value="SCHOOL" className="bg-[#0f0e20]">School Sports League</option>
                                  <option value="FAMILY" className="bg-[#0f0e20]">Private Family Circle</option>
                                </select>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-white/40 font-bold uppercase tracking-wider block mb-2">Description</label>
                            <textarea
                              value={editingComm ? editingComm.description : newCommDesc}
                              onChange={e => editingComm ? setEditingComm({ ...editingComm, description: e.target.value }) : setNewCommDesc(e.target.value)}
                              placeholder="Describe metabolic target goals or wellness focus..."
                              rows={3}
                              className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.04] transition-all resize-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowCommunityForm(false); setEditingComm(null); }}
                            className="py-3 px-6 bg-white/[0.03] text-white/60 hover:bg-white/[0.08] border border-white/10 rounded-2xl text-xs font-bold transition-all"
                          >Cancel</button>
                          <button
                            onClick={() => {
                              if (editingComm) {
                                handleCommunityAction('EDIT', { community_id: editingComm.id, name: editingComm.name, description: editingComm.description });
                              } else {
                                handleCommunityAction('CREATE', { name: newCommName, community_type: newCommType, description: newCommDesc });
                                setNewCommName(''); setNewCommDesc('');
                              }
                            }}
                            className="py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-violet-600/20 transition-all"
                          >{editingComm ? 'Save Changes' : 'Create Community'}</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Communities Table */}
                <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.05] text-white/40 uppercase tracking-wider text-[10px] font-black bg-white/[0.01]">
                          <th className="px-6 py-5">Name</th>
                          <th className="px-6 py-5">Type</th>
                          <th className="px-6 py-5">Description</th>
                          <th className="px-6 py-5">Created</th>
                          <th className="px-6 py-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {communitiesList.length === 0 ? (
                          <tr><td colSpan={5} className="py-16 text-center text-white/30 font-semibold tracking-wider">No communities registered yet.</td></tr>
                        ) : communitiesList.map(c => (
                          <tr key={c.id} className="hover:bg-white/[0.02] transition-colors duration-300">
                            <td className="px-6 py-5 font-bold text-white text-[13px]">{c.name}</td>
                            <td className="px-6 py-5">
                              <span className="bg-violet-500/10 text-violet-400 border border-violet-500/10 font-bold px-3 py-1 rounded-full text-[9px] uppercase tracking-wider">
                                {c.community_type}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-white/40 max-w-xs truncate">{c.description || 'No description provided'}</td>
                            <td className="px-6 py-5 text-white/40 font-mono">{c.created_at}</td>
                            <td className="px-6 py-5">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => { setEditingComm(c); setShowCommunityForm(false); }}
                                  className="p-2.5 bg-white/[0.03] text-white/60 hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all"
                                  title="Edit Community"
                                ><Settings size={13} /></button>
                                <button
                                  onClick={() => { if (confirm(`Delete community circle ${c.name}?`)) handleCommunityAction('DELETE', { community_id: c.id }); }}
                                  className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 rounded-xl transition-all"
                                  title="Delete Community"
                                ><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB: CHALLENGES & REWARDS
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'challenges' && (
              <>
                {/* ── Challenge KPI Cards ───────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Challenges', value: challengeStats.total_challenges || 0, sub: `${challengeStats.active_challenges || 0} active`, icon: Trophy, color: 'from-violet-500 to-indigo-500', glow: 'shadow-violet-600/5 hover:border-violet-500/30' },
                    { label: 'Total Participants', value: challengeStats.total_participants || 0, sub: 'Engaged users', icon: Users, color: 'from-emerald-500 to-teal-500', glow: 'shadow-emerald-600/5 hover:border-emerald-500/30' },
                    { label: 'XP Distributed', value: challengeStats.xp_distributed || 0, sub: 'Points awarded', icon: Star, color: 'from-amber-500 to-orange-500', glow: 'shadow-amber-600/5 hover:border-amber-500/30' },
                    { label: 'Coins Distributed', value: challengeStats.coins_distributed || 0, sub: 'Wallet credits', icon: Sliders, color: 'from-cyan-500 to-blue-500', glow: 'shadow-cyan-600/5 hover:border-cyan-500/30' },
                  ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <motion.div
                        whileHover={{ y: -4, scale: 1.01 }}
                        key={i}
                        className={`relative overflow-hidden bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 shadow-2xl transition-all duration-300 ${card.glow}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{card.label}</span>
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg shadow-black/25`}>
                            <Icon size={14} className="text-white" />
                          </div>
                        </div>
                        <div className="text-4xl font-extrabold text-white tracking-tight mb-1">{card.value}</div>
                        <div className="text-white/30 text-xs font-semibold">{card.sub}</div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* ── Left Column: Creator / Editor Form (5 Cols) ────── */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 shadow-2xl">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white font-black text-lg tracking-tight">
                          {editingChallenge ? 'Edit Challenge' : 'Create Challenge'}
                        </h3>
                        {editingChallenge && (
                          <button
                            onClick={resetChallengeForm}
                            className="text-xs text-white/40 hover:text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl transition-all"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-4 text-xs">
                        <div>
                          <label className="text-white/40 font-bold uppercase tracking-wider block mb-1.5">Challenge Name *</label>
                          <input
                            type="text"
                            value={challengeName}
                            onChange={e => setChallengeName(e.target.value)}
                            placeholder="e.g. Hyderabad Walkathon League"
                            className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.04] transition-all"
                          />
                        </div>

                        <div>
                          <label className="text-white/40 font-bold uppercase tracking-wider block mb-1.5">Description</label>
                          <textarea
                            value={challengeDesc}
                            onChange={e => setChallengeDesc(e.target.value)}
                            placeholder="Briefly explain target metabolic goals and participation guidelines..."
                            rows={3}
                            className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.04] transition-all resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-white/40 font-bold uppercase tracking-wider block mb-1.5">Frequency Type</label>
                            <select
                              value={challengeType}
                              onChange={e => setChallengeType(e.target.value)}
                              className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-violet-500/50 hover:bg-white/[0.04] transition-all cursor-pointer"
                            >
                              <option value="DAILY" className="bg-[#0f0e20]">Daily Challenge</option>
                              <option value="WEEKLY" className="bg-[#0f0e20]">Weekly Challenge</option>
                              <option value="MONTHLY" className="bg-[#0f0e20]">Monthly Challenge</option>
                              <option value="CORPORATE" className="bg-[#0f0e20]">Corporate Challenge</option>
                              <option value="COMMUNITY" className="bg-[#0f0e20]">Community Challenge</option>
                              <option value="FAMILY" className="bg-[#0f0e20]">Family Challenge</option>
                              <option value="AI" className="bg-[#0f0e20]">AI Challenge</option>
                              <option value="SEASONAL" className="bg-[#0f0e20]">Seasonal Challenge</option>
                              <option value="FESTIVAL" className="bg-[#0f0e20]">Festival Challenge</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-white/40 font-bold uppercase tracking-wider block mb-1.5">Category</label>
                            <select
                              value={challengeCategory}
                              onChange={e => setChallengeCategory(e.target.value)}
                              className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-violet-500/50 hover:bg-white/[0.04] transition-all cursor-pointer"
                            >
                              <option value="FITNESS" className="bg-[#0f0e20]">Fitness</option>
                              <option value="NUTRITION" className="bg-[#0f0e20]">Nutrition</option>
                              <option value="SLEEP" className="bg-[#0f0e20]">Sleep</option>
                              <option value="STRESS" className="bg-[#0f0e20]">Stress</option>
                              <option value="COMMUNITY" className="bg-[#0f0e20]">Community</option>
                              <option value="CORPORATE" className="bg-[#0f0e20]">Corporate</option>
                              <option value="FAMILY" className="bg-[#0f0e20]">Family</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-white/40 font-bold uppercase tracking-wider block mb-1.5">Target Type</label>
                            <select
                              value={targetType}
                              onChange={e => setTargetType(e.target.value)}
                              className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-violet-500/50 hover:bg-white/[0.04] transition-all cursor-pointer"
                            >
                              <option value="STEPS" className="bg-[#0f0e20]">Walk Steps</option>
                              <option value="SLEEP" className="bg-[#0f0e20]">Sleep Hours</option>
                              <option value="WATER" className="bg-[#0f0e20]">Water Intake</option>
                              <option value="MEALS" className="bg-[#0f0e20]">Meals Logged</option>
                              <option value="WEIGHT" className="bg-[#0f0e20]">Weight Goal</option>
                              <option value="EXERCISE" className="bg-[#0f0e20]">Exercise Minutes</option>
                              <option value="COMMUNITY" className="bg-[#0f0e20]">Community Participation</option>
                              <option value="REFERRAL" className="bg-[#0f0e20]">Referral Count</option>
                              <option value="XP" className="bg-[#0f0e20]">XP Goal</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-white/40 font-bold uppercase tracking-wider block mb-1.5">Target Value</label>
                            <input
                              type="number"
                              value={targetValue}
                              onChange={e => setTargetValue(parseInt(e.target.value) || 0)}
                              className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.04] transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-white/40 font-bold uppercase tracking-wider block mb-1.5">Difficulty</label>
                            <select
                              value={difficulty}
                              onChange={e => setDifficulty(e.target.value)}
                              className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-violet-500/50 hover:bg-white/[0.04] transition-all cursor-pointer"
                            >
                              <option value="EASY" className="bg-[#0f0e20]">Easy</option>
                              <option value="MEDIUM" className="bg-[#0f0e20]">Medium</option>
                              <option value="HARD" className="bg-[#0f0e20]">Hard</option>
                              <option value="EXPERT" className="bg-[#0f0e20]">Expert</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-white/40 font-bold uppercase tracking-wider block mb-1.5">Max Participants</label>
                            <input
                              type="number"
                              value={maxParticipants}
                              onChange={e => setMaxParticipants(parseInt(e.target.value) || 0)}
                              className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.04] transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-white/40 font-bold uppercase tracking-wider block mb-1.5">Start Date *</label>
                            <input
                              type="date"
                              value={startDate}
                              onChange={e => setStartDate(e.target.value)}
                              className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.04] transition-all cursor-pointer"
                            />
                          </div>

                          <div>
                            <label className="text-white/40 font-bold uppercase tracking-wider block mb-1.5">End Date *</label>
                            <input
                              type="date"
                              value={endDate}
                              onChange={e => setEndDate(e.target.value)}
                              className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.04] transition-all cursor-pointer"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-white/40 font-bold uppercase tracking-wider block mb-1.5">Challenge Rules</label>
                          <textarea
                            value={challengeRules}
                            onChange={e => setChallengeRules(e.target.value)}
                            placeholder="Enter challenge safety or verification rules..."
                            rows={2}
                            className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.04] transition-all resize-none"
                          />
                        </div>

                        <div>
                          <label className="text-white/40 font-bold uppercase tracking-wider block mb-1.5">Status</label>
                          <select
                            value={challengeStatus}
                            onChange={e => setChallengeStatus(e.target.value)}
                            className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-violet-500/50 hover:bg-white/[0.04] transition-all cursor-pointer"
                          >
                            <option value="DRAFT" className="bg-[#0f0e20]">Draft</option>
                            <option value="ACTIVE" className="bg-[#0f0e20]">Active</option>
                            <option value="COMPLETED" className="bg-[#0f0e20]">Completed</option>
                            <option value="CANCELLED" className="bg-[#0f0e20]">Cancelled</option>
                          </select>
                        </div>

                        {/* Custom Rewards Toggle */}
                        <div className="flex items-center gap-2.5 bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-2xl hover:bg-white/[0.03] transition-colors mt-2">
                          <input
                            type="checkbox"
                            id="custom-rewards-chk"
                            checked={customRewards}
                            onChange={e => setCustomRewards(e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 bg-white/[0.02] text-violet-600 focus:ring-violet-500 cursor-pointer"
                          />
                          <label htmlFor="custom-rewards-chk" className="font-bold text-white/80 cursor-pointer select-none">
                            Configure Custom Rewards
                          </label>
                        </div>

                        {/* Custom Rewards Section */}
                        {customRewards && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="flex flex-col gap-4 border border-violet-500/10 bg-violet-600/5 p-4.5 rounded-2xl mt-1 text-xs"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-violet-400 font-bold uppercase tracking-wider block mb-1">XP Reward</label>
                                <input
                                  type="number"
                                  value={xpReward}
                                  onChange={e => setXpReward(parseInt(e.target.value) || 0)}
                                  className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-white focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-violet-400 font-bold uppercase tracking-wider block mb-1">Coin Reward</label>
                                <input
                                  type="number"
                                  value={coinReward}
                                  onChange={e => setCoinReward(parseInt(e.target.value) || 0)}
                                  className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-white focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-violet-400 font-bold uppercase tracking-wider block mb-1">Badge Reward</label>
                                <select
                                  value={badgeReward}
                                  onChange={e => setBadgeReward(e.target.value)}
                                  className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-white focus:outline-none cursor-pointer"
                                >
                                  <option value="" className="bg-[#0f0e20]">None</option>
                                  {catalog.badges?.map((b: any) => (
                                    <option key={b.id} value={b.id} className="bg-[#0f0e20]">{b.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-violet-400 font-bold uppercase tracking-wider block mb-1">Avatar Outfit</label>
                                <select
                                  value={avatarReward}
                                  onChange={e => setAvatarReward(e.target.value)}
                                  className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-white focus:outline-none cursor-pointer"
                                >
                                  <option value="" className="bg-[#0f0e20]">None</option>
                                  {catalog.avatar_rewards?.map((a: any) => (
                                    <option key={a.id} value={a.id} className="bg-[#0f0e20]">{a.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-violet-400 font-bold uppercase tracking-wider block mb-1">Profile Frame</label>
                                <select
                                  value={profileFrameReward}
                                  onChange={e => setProfileFrameReward(e.target.value)}
                                  className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-white focus:outline-none cursor-pointer"
                                >
                                  <option value="" className="bg-[#0f0e20]">None</option>
                                  {catalog.profile_frames?.map((p: any) => (
                                    <option key={p.id} value={p.id} className="bg-[#0f0e20]">{p.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-violet-400 font-bold uppercase tracking-wider block mb-1">Special Reward</label>
                                <input
                                  type="text"
                                  value={specialReward}
                                  onChange={e => setSpecialReward(e.target.value)}
                                  placeholder="e.g. Free Hydro Flask"
                                  className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-white focus:outline-none"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Leaderboard Tier Rewards */}
                        <div className="border border-white/[0.04] bg-white/[0.005] p-4.5 rounded-2xl mt-1 text-xs">
                          <h4 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
                            <Trophy size={11} className="text-yellow-400" /> Leaderboard Rank Rewards
                          </h4>
                          
                          <div className="flex flex-col gap-4">
                            {/* Top 1 */}
                            <div className="flex flex-col gap-2 border-b border-white/[0.03] pb-3">
                              <span className="font-extrabold text-yellow-400">Rank 1 (Top 1)</span>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[9px] text-white/30 font-bold block mb-0.5">XP</label>
                                  <input type="number" value={top1Xp} onChange={e => setTop1Xp(parseInt(e.target.value) || 0)} className="w-full px-2.5 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg text-white" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-white/30 font-bold block mb-0.5">Coins</label>
                                  <input type="number" value={top1Coin} onChange={e => setTop1Coin(parseInt(e.target.value) || 0)} className="w-full px-2.5 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg text-white" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-white/30 font-bold block mb-0.5">Badge</label>
                                  <select value={top1Badge} onChange={e => setTop1Badge(e.target.value)} className="w-full px-2 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg text-white cursor-pointer">
                                    <option value="" className="bg-[#0f0e20]">None</option>
                                    {catalog.badges?.map((b: any) => <option key={b.id} value={b.id} className="bg-[#0f0e20]">{b.name}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Top 2 */}
                            <div className="flex flex-col gap-2 border-b border-white/[0.03] pb-3">
                              <span className="font-extrabold text-slate-300">Rank 2 (Top 2)</span>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[9px] text-white/30 font-bold block mb-0.5">XP</label>
                                  <input type="number" value={top2Xp} onChange={e => setTop2Xp(parseInt(e.target.value) || 0)} className="w-full px-2.5 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg text-white" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-white/30 font-bold block mb-0.5">Coins</label>
                                  <input type="number" value={top2Coin} onChange={e => setTop2Coin(parseInt(e.target.value) || 0)} className="w-full px-2.5 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg text-white" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-white/30 font-bold block mb-0.5">Badge</label>
                                  <select value={top2Badge} onChange={e => setTop2Badge(e.target.value)} className="w-full px-2 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg text-white cursor-pointer">
                                    <option value="" className="bg-[#0f0e20]">None</option>
                                    {catalog.badges?.map((b: any) => <option key={b.id} value={b.id} className="bg-[#0f0e20]">{b.name}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Top 3 */}
                            <div className="flex flex-col gap-2">
                              <span className="font-extrabold text-amber-600">Rank 3 (Top 3)</span>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[9px] text-white/30 font-bold block mb-0.5">XP</label>
                                  <input type="number" value={top3Xp} onChange={e => setTop3Xp(parseInt(e.target.value) || 0)} className="w-full px-2.5 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg text-white" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-white/30 font-bold block mb-0.5">Coins</label>
                                  <input type="number" value={top3Coin} onChange={e => setTop3Coin(parseInt(e.target.value) || 0)} className="w-full px-2.5 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg text-white" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-white/30 font-bold block mb-0.5">Badge</label>
                                  <select value={top3Badge} onChange={e => setTop3Badge(e.target.value)} className="w-full px-2 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg text-white cursor-pointer">
                                    <option value="" className="bg-[#0f0e20]">None</option>
                                    {catalog.badges?.map((b: any) => <option key={b.id} value={b.id} className="bg-[#0f0e20]">{b.name}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={editingChallenge ? () => {
                            let finalXp = xpReward;
                            let finalCoin = coinReward;
                            if (!customRewards) {
                              if (difficulty === 'EASY') { finalXp = 50; finalCoin = 20; }
                              else if (difficulty === 'MEDIUM') { finalXp = 150; finalCoin = 50; }
                              else if (difficulty === 'HARD') { finalXp = 500; finalCoin = 150; }
                              else if (difficulty === 'EXPERT') { finalXp = 1000; finalCoin = 500; }
                            }
                            const upd: any = {
                              name: challengeName,
                              description: challengeDesc,
                              challenge_type: challengeType,
                              category: challengeCategory,
                              difficulty,
                              start_date: startDate,
                              end_date: endDate,
                              max_participants: maxParticipants,
                              rules: challengeRules,
                              status: challengeStatus,
                              target_type: targetType,
                              target_value: targetValue,
                              xp_reward: finalXp,
                              coin_reward: finalCoin,
                              special_reward: specialReward,
                              top_1_xp: top1Xp,
                              top_1_coin: top1Coin,
                              top_2_xp: top2Xp,
                              top_2_coin: top2Coin,
                              top_3_xp: top3Xp,
                              top_3_coin: top3Coin,
                              badge_reward: badgeReward ? parseInt(badgeReward) : null,
                              avatar_reward: avatarReward ? parseInt(avatarReward) : null,
                              profile_frame_reward: profileFrameReward ? parseInt(profileFrameReward) : null,
                              top_1_badge: top1Badge ? parseInt(top1Badge) : null,
                              top_2_badge: top2Badge ? parseInt(top2Badge) : null,
                              top_3_badge: top3Badge ? parseInt(top3Badge) : null,
                            };
                            handleUpdateChallenge(editingChallenge.id, upd);
                          } : handleCreateChallenge}
                          className="flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-violet-600/10 cursor-pointer"
                        >
                          <Check size={14} /> {editingChallenge ? 'Save Changes' : 'Create Challenge'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Right Column: Lists of Challenges & Approvals (7 Cols) ─ */}
                  <div className="lg:col-span-7 flex flex-col gap-8">
                    {/* Active/All Challenges Table */}
                    <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 shadow-2xl">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-white font-black text-lg tracking-tight">Active & All Challenges</h3>
                          <p className="text-white/30 text-xs mt-0.5">Admin-managed corporate and community championships</p>
                        </div>
                        <button
                          onClick={fetchChallengesData}
                          className="flex items-center gap-1.5 text-white/40 hover:text-violet-400 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all"
                        >
                          <RefreshCw size={12} className="hover:rotate-180 transition-transform duration-500" /> Refresh
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/[0.05] text-white/40 uppercase tracking-wider text-[10px] font-black bg-white/[0.01]">
                              <th className="px-4 py-4">Challenge Info</th>
                              <th className="px-4 py-4">Metrics & Target</th>
                              <th className="px-4 py-4">Dates</th>
                              <th className="px-4 py-4">Status</th>
                              <th className="px-4 py-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {challengesList.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-white/30 font-semibold tracking-wider">
                                  No challenges configured yet.
                                </td>
                              </tr>
                            ) : (
                              challengesList.map(ch => (
                                <tr key={ch.id} className="hover:bg-white/[0.01] transition-colors">
                                  <td className="px-4 py-4">
                                    <div className="font-bold text-white text-[13px]">{ch.name}</div>
                                    <div className="flex gap-2 items-center mt-1">
                                      <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/10 font-bold uppercase">
                                        {ch.challenge_type}
                                      </span>
                                      <span className="text-[10px] text-white/40">{ch.category}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="font-bold text-white/80">{ch.target_type}: {ch.target_value}</div>
                                    <div className="text-white/30 text-[10px] mt-0.5">
                                      Reward: {ch.xp_reward} XP · {ch.coin_reward} Coins
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-white/40 font-mono">
                                    {ch.start_date} <span className="text-white/20">to</span> {ch.end_date}
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                      ch.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                                      ch.status === 'DRAFT' ? 'bg-white/10 text-white/60 border border-white/10' :
                                      ch.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10' :
                                      'bg-red-500/10 text-red-400 border border-red-500/10'
                                    }`}>
                                      {ch.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingChallenge(ch);
                                          setChallengeName(ch.name);
                                          setChallengeDesc(ch.description || '');
                                          setChallengeType(ch.challenge_type);
                                          setChallengeCategory(ch.category);
                                          setDifficulty(ch.difficulty);
                                          setStartDate(ch.start_date);
                                          setEndDate(ch.end_date);
                                          setMaxParticipants(ch.max_participants);
                                          setChallengeRules(ch.rules || '');
                                          setChallengeStatus(ch.status);
                                          setTargetType(ch.target_type);
                                          setTargetValue(ch.target_value);
                                          setCustomRewards(true);
                                          setXpReward(ch.xp_reward);
                                          setCoinReward(ch.coin_reward);
                                          setBadgeReward(ch.badge_reward ? ch.badge_reward.toString() : '');
                                          setAvatarReward(ch.avatar_reward ? ch.avatar_reward.toString() : '');
                                          setProfileFrameReward(ch.profile_frame_reward ? ch.profile_frame_reward.toString() : '');
                                          setSpecialReward(ch.special_reward || '');
                                          setTop1Xp(ch.top_1_xp);
                                          setTop1Coin(ch.top_1_coin);
                                          setTop1Badge(ch.top_1_badge ? ch.top_1_badge.toString() : '');
                                          setTop2Xp(ch.top_2_xp);
                                          setTop2Coin(ch.top_2_coin);
                                          setTop2Badge(ch.top_2_badge ? ch.top_2_badge.toString() : '');
                                          setTop3Xp(ch.top_3_xp);
                                          setTop3Coin(ch.top_3_coin);
                                          setTop3Badge(ch.top_3_badge ? ch.top_3_badge.toString() : '');
                                        }}
                                        className="py-1.5 px-2.5 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/10 rounded-xl transition-all"
                                        title="Edit Challenge"
                                      >
                                        Edit
                                      </button>
                                      {ch.status === 'ACTIVE' ? (
                                        <button
                                          onClick={() => handleUpdateChallenge(ch.id, { status: 'CANCELLED' })}
                                          className="py-1.5 px-2.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/10 rounded-xl transition-all"
                                          title="Suspend Challenge"
                                        >
                                          Suspend
                                        </button>
                                      ) : ch.status === 'DRAFT' ? (
                                        <button
                                          onClick={() => handleUpdateChallenge(ch.id, { status: 'ACTIVE' })}
                                          className="py-1.5 px-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/10 rounded-xl transition-all"
                                          title="Activate Challenge"
                                        >
                                          Publish
                                        </button>
                                      ) : null}
                                      <button
                                        onClick={() => handleDeleteChallenge(ch.id)}
                                        className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 rounded-xl transition-all"
                                        title="Delete Challenge"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pending Approvals Section */}
                    <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 shadow-2xl">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-white font-black text-lg tracking-tight">Reward Approval Queue</h3>
                          <p className="text-white/30 text-xs mt-0.5">Manually release or audit rewards for completed participants</p>
                        </div>
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                          {pendingApprovalsList.length} Pending
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/[0.05] text-white/40 uppercase tracking-wider text-[10px] font-black bg-white/[0.01]">
                              <th className="px-4 py-4">User</th>
                              <th className="px-4 py-4">Challenge</th>
                              <th className="px-4 py-4">Progress / Target</th>
                              <th className="px-4 py-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {pendingApprovalsList.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-12 text-center text-white/30 font-semibold tracking-wider">
                                  No rewards pending approval.
                                </td>
                              </tr>
                            ) : (
                              pendingApprovalsList.map(app => (
                                <tr key={app.id} className="hover:bg-white/[0.01] transition-colors">
                                  <td className="px-4 py-4">
                                    <div className="font-bold text-white">{app.username}</div>
                                    <div className="text-white/40 text-[10px] mt-0.5 font-mono">{app.email}</div>
                                  </td>
                                  <td className="px-4 py-4 font-bold text-white/80">
                                    {app.challenge_name}
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className="text-emerald-400 font-bold">{app.progress_value}</span>
                                    <span className="text-white/30"> / {app.target_value} ({app.target_type})</span>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex justify-end">
                                      <button
                                        onClick={() => handleApproveReward(app.id)}
                                        className="py-1.5 px-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/10 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider"
                                      >
                                        Approve & Release
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 4: SUBSCRIPTION MANAGEMENT
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'subscriptions' && (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-white font-black text-xl tracking-tight">Subscription Registry & Controls</h3>
                    <p className="text-white/30 text-xs mt-0.5">Control pricing tiers, monitor payments, scan for expiry triggers</p>
                  </div>
                  <button
                    onClick={triggerExpiryCheck}
                    className="flex items-center gap-2 py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-violet-600/20 transition-all duration-300"
                  >
                    <RefreshCw size={14} className="hover:rotate-180 transition-transform duration-500" /> Scan & Trigger Expiry Check
                  </button>
                </div>

                {/* Sub Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Active Subs', value: subMetrics.active_subscribers, color: 'emerald', border: 'border-emerald-500/10 bg-emerald-500/5 text-emerald-400' },
                    { label: 'Expiring 30d', value: subMetrics.expiring_30_days, color: 'amber', border: 'border-amber-500/10 bg-amber-500/5 text-amber-400' },
                    { label: 'Expiring 7d', value: subMetrics.expiring_7_days, color: 'orange', border: 'border-orange-500/10 bg-orange-500/5 text-orange-400' },
                    { label: 'Expired', value: subMetrics.expired_subscribers, color: 'red', border: 'border-red-500/10 bg-red-500/5 text-red-400' },
                  ].map((card, i) => (
                    <div key={i} className={`border rounded-3xl p-6 text-center shadow-xl ${card.border}`}>
                      <div className="text-white/40 text-[10px] font-black uppercase tracking-wider mb-2">{card.label}</div>
                      <div className="text-4xl font-extrabold tracking-tight">{card.value}</div>
                    </div>
                  ))}
                </div>

                {/* Sub Table */}
                <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.05] text-white/40 uppercase tracking-wider text-[10px] font-black bg-white/[0.01]">
                          <th className="px-6 py-5">User</th>
                          <th className="px-6 py-5">Plan</th>
                          <th className="px-6 py-5">Status</th>
                          <th className="px-6 py-5">Remaining</th>
                          <th className="px-6 py-5">Expires</th>
                          <th className="px-6 py-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {subRegistryList.length === 0 ? (
                          <tr><td colSpan={6} className="py-16 text-center text-white/30 font-semibold tracking-wider">No subscriptions registered.</td></tr>
                        ) : subRegistryList.map(s => (
                          <tr key={s.id} className="hover:bg-white/[0.02] transition-colors duration-300">
                            <td className="px-6 py-5">
                              <div className="font-bold text-white text-[13px]">{s.email}</div>
                              <div className="text-white/40 text-[10px] mt-0.5 font-mono">{s.name}</div>
                            </td>
                            <td className="px-6 py-5">
                              <select
                                value={s.plan}
                                onChange={e => handleSubAction(s.id, 'CHANGE_PLAN', { plan: e.target.value })}
                                className="bg-white/[0.02] border border-white/10 text-violet-400 rounded-xl px-3 py-2 text-[10px] font-extrabold focus:outline-none hover:border-white/20 transition-all cursor-pointer"
                              >
                                <option value="FREE" className="bg-[#0f0e20]">Free</option>
                                <option value="PRO" className="bg-[#0f0e20]">Pro</option>
                                <option value="ENTERPRISE" className="bg-[#0f0e20]">Enterprise</option>
                              </select>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                s.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-red-500/10 text-red-400 border border-red-500/10'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                {s.status}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-white/60 font-bold font-mono">
                              {s.plan === 'FREE' ? '∞ Unlimited' : `${s.remaining_days} days`}
                            </td>
                            <td className="px-6 py-5 text-white/40 font-mono">{s.end_date || 'Never'}</td>
                            <td className="px-6 py-5">
                              <div className="flex justify-end gap-2">
                                {s.status === 'ACTIVE' ? (
                                  <button onClick={() => handleSubAction(s.id, 'SUSPEND')}
                                    className="py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-extrabold border border-red-500/10 rounded-xl text-[10px] transition-all">
                                    Suspend
                                  </button>
                                ) : (
                                  <button onClick={() => handleSubAction(s.id, 'ACTIVATE')}
                                    className="py-2 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-extrabold border border-emerald-500/10 rounded-xl text-[10px] transition-all">
                                    Activate
                                  </button>
                                )}
                                <button onClick={() => handleSubAction(s.id, 'EXTEND', { days: 7 })}
                                  className="py-2 px-3 bg-white/[0.03] hover:bg-white/[0.08] text-white/60 font-bold border border-white/10 rounded-xl text-[10px] transition-all">
                                  +7d
                                </button>
                                <button onClick={() => handleSubAction(s.id, 'EXTEND', { days: 30 })}
                                  className="py-2 px-3 bg-white/[0.03] hover:bg-white/[0.08] text-white/60 font-bold border border-white/10 rounded-xl text-[10px] transition-all">
                                  +30d
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 5: NOTIFICATIONS CENTER
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'notifications' && (
              <>
                <div>
                  <h3 className="text-white font-black text-xl tracking-tight">Platform Broadcast Center</h3>
                  <p className="text-white/30 text-xs mt-0.5">Send custom alert messages, newsletter campaigns, or system updates</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Send Form */}
                  <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-6 shadow-2xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Bell size={14} className="text-violet-400" />
                      </div>
                      <h4 className="text-white font-extrabold text-sm tracking-tight">Dispatch Notification</h4>
                    </div>

                    <div className="flex flex-col gap-5 text-xs">
                      <div>
                        <label className="text-white/40 font-bold uppercase tracking-wider block mb-2">Notification Title *</label>
                        <input
                          id="notif-title"
                          type="text"
                          value={notifTitle}
                          onChange={e => setNotifTitle(e.target.value)}
                          placeholder="e.g. Version 2.0 Dynamic Scoring Engine is Live!"
                          className="w-full px-4 py-3.5 bg-white/[0.02] border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.04] transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-white/40 font-bold uppercase tracking-wider block mb-2">Message Body *</label>
                        <textarea
                          id="notif-message"
                          value={notifMessage}
                          onChange={e => setNotifMessage(e.target.value)}
                          placeholder="Compose your broadcast notification details here..."
                          rows={4}
                          className="w-full px-4 py-3.5 bg-white/[0.02] border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.04] transition-all resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-white/40 font-bold uppercase tracking-wider block mb-2">Delivery Channel</label>
                          <select
                            id="notif-type"
                            value={notifType}
                            onChange={e => setNotifType(e.target.value)}
                            className="w-full px-4 py-3.5 bg-white/[0.02] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-violet-500/50 hover:bg-white/[0.04] cursor-pointer"
                          >
                            <option value="IN_APP" className="bg-[#0f0e20]">In-App Drawer Only</option>
                            <option value="PUSH" className="bg-[#0f0e20]">Mobile Push Notification</option>
                            <option value="EMAIL" className="bg-[#0f0e20]">Direct Email Newsletter</option>
                            <option value="ALL" className="bg-[#0f0e20]">All Delivery Channels</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-white/40 font-bold uppercase tracking-wider block mb-2">Target Segment</label>
                          <select
                            id="notif-target"
                            value={notifTarget}
                            onChange={e => setNotifTarget(e.target.value)}
                            className="w-full px-4 py-3.5 bg-white/[0.02] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-violet-500/50 hover:bg-white/[0.04] cursor-pointer"
                          >
                            <option value="ALL" className="bg-[#0f0e20]">All Registered Users</option>
                            <option value="PLAN:FREE" className="bg-[#0f0e20]">Free Trial Plan Users</option>
                            <option value="PLAN:PRO" className="bg-[#0f0e20]">Pro Scoring Tier Subscribers</option>
                            <option value="PLAN:ENTERPRISE" className="bg-[#0f0e20]">Enterprise Workspace Members</option>
                          </select>
                        </div>
                      </div>

                      <button
                        id="send-notification-btn"
                        onClick={handleSendNotification}
                        disabled={!notifTitle || !notifMessage}
                        className="flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-violet-600/10 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Send size={15} /> Dispatch Broadcast
                      </button>
                    </div>
                  </div>

                  {/* Info Panel */}
                  <div className="flex flex-col gap-6">
                    {/* Last Dispatch Details */}
                    <AnimatePresence>
                      {notifResult && (
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-emerald-500/5 border border-emerald-500/15 rounded-3xl p-6 shadow-xl"
                        >
                          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm mb-4">
                            <Check size={16} /> Dispatch Succeeded!
                          </div>
                          <div className="flex flex-col gap-3 text-xs">
                            <div className="flex justify-between border-b border-white/[0.03] pb-2">
                              <span className="text-white/40">Recipients Count:</span>
                              <span className="text-white font-bold">{notifResult.recipients_count} active accounts</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/40">Total Notifications Ingested:</span>
                              <span className="text-white font-bold font-mono">{notifResult.notifications_created} items</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Segment Details */}
                    <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 shadow-2xl">
                      <h4 className="text-white font-bold text-sm mb-4">Audience Segmentation</h4>
                      <div className="flex flex-col gap-3 text-xs">
                        {[
                          { target: 'All Users', desc: 'Sends message to every active non-admin user on the platform', color: 'text-violet-400', bg: 'bg-violet-500/5' },
                          { target: 'Free Plan', desc: 'Target users currently running on the default free scoreboard', color: 'text-white/60', bg: 'bg-white/5' },
                          { target: 'Pro Plan', desc: 'Target active Pro subscribers to announce telemetry details', color: 'text-violet-400', bg: 'bg-violet-500/5' },
                          { target: 'Enterprise', desc: 'Target Enterprise workspace accounts with specific templates', color: 'text-cyan-400', bg: 'bg-cyan-500/5' },
                        ].map((item, i) => (
                          <div key={i} className={`rounded-2xl px-4 py-3 border border-white/[0.02] ${item.bg}`}>
                            <div className={`font-black mb-0.5 ${item.color}`}>{item.target}</div>
                            <div className="text-white/30 text-[11px] leading-relaxed">{item.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 6: AUDIT LOGS
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'audit' && (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-white font-black text-xl tracking-tight">System Audit Logs</h3>
                    <p className="text-white/30 text-xs mt-0.5">Real-time telemetry audit trails of all critical administrator and client actions</p>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      id="audit-filter"
                      type="text"
                      value={auditFilter}
                      onChange={e => setAuditFilter(e.target.value)}
                      placeholder="Filter by action (e.g. LOGIN, ADMIN)"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 hover:bg-white/[0.04] transition-all"
                    />
                  </div>
                </div>

                <div className="bg-[#121124]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-white/[0.05] text-white/40 uppercase tracking-wider text-[10px] font-black font-sans bg-white/[0.01]">
                          <th className="px-6 py-5">Timestamp</th>
                          <th className="px-6 py-5">User</th>
                          <th className="px-6 py-5">Action</th>
                          <th className="px-6 py-5">IP Address</th>
                          <th className="px-6 py-5">User Agent</th>
                          <th className="px-6 py-5">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {auditLogs.length === 0 ? (
                          <tr><td colSpan={6} className="py-16 text-center text-white/30 font-semibold font-sans tracking-wide">No audit logs registered.</td></tr>
                        ) : auditLogs.map(l => (
                          <tr key={l.id} className="hover:bg-white/[0.02] transition-colors duration-300">
                            <td className="px-6 py-4 text-violet-400 text-[10px] whitespace-nowrap">[{l.timestamp}]</td>
                            <td className="px-6 py-4 text-white font-extrabold text-[11px] font-sans whitespace-nowrap">{l.email}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black font-sans border tracking-wide uppercase ${
                                l.action.startsWith('ADMIN_') ? 'bg-violet-500/10 text-violet-400 border-violet-500/15' :
                                l.action.includes('LOGIN') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' :
                                l.action.includes('FAIL') || l.action.includes('SUSP') ? 'bg-red-500/10 text-red-400 border-red-500/15' :
                                'bg-white/5 text-white/60 border-white/10'
                              }`}>
                                {l.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-white/40 text-[11px] font-semibold">{l.ip_address || '127.0.0.1'}</td>
                            <td className="px-6 py-4 text-white/30 text-[10px] max-w-[200px] truncate font-sans" title={l.user_agent}>
                              {l.user_agent}
                            </td>
                            <td className="px-6 py-4 text-white/50 text-[10px] max-w-[220px] truncate font-sans" title={JSON.stringify(l.details)}>
                              {l.details ? JSON.stringify(l.details) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── User Detail Modal (Animated Popup) ────────────────────── */}
        <AnimatePresence>
          {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setSelectedUser(null); setUserDetail(null); }}
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
              />
              
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-[#0f0e20] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative z-10 scrollbar-hide"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {userDetail?.profile?.profile_picture ? (
                      <img src={userDetail.profile.profile_picture} className="w-14 h-14 rounded-full object-cover border-2 border-violet-500/30 shadow-lg select-none" alt="" />
                    ) : selectedUser.profile_picture ? (
                      <img src={selectedUser.profile_picture} className="w-14 h-14 rounded-full object-cover border-2 border-violet-500/30 shadow-lg select-none" alt="" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-violet-600/20 text-violet-400 border-2 border-violet-500/20 flex items-center justify-center font-bold text-sm uppercase shrink-0 select-none">
                        {selectedUser.name ? selectedUser.name.substring(0, 2) : 'VQ'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-extrabold text-lg tracking-tight">{selectedUser.name}</h3>
                      <p className="text-white/40 text-xs mt-0.5 font-mono">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedUser(null); setUserDetail(null); }}
                    className="p-2 text-white/40 hover:text-white rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {loadingDetail ? (
                  <div className="p-16 text-center text-white/30 font-semibold tracking-wider">Retrieving profile metadata...</div>
                ) : userDetail ? (
                  <div className="p-6 flex flex-col gap-6">
                    {/* General Metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      {[
                        { label: 'Role', value: userDetail.user.role, color: 'text-violet-400' },
                        { label: 'Status', value: userDetail.user.is_active ? 'Active' : 'Suspended', color: userDetail.user.is_active ? 'text-emerald-400' : 'text-red-400' },
                        { label: 'Registration Date', value: userDetail.user.date_joined, color: 'text-white' },
                        { label: 'Failed Logins', value: userDetail.user.failed_login_attempts, color: 'text-white' },
                      ].map((f, i) => (
                        <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl px-4 py-3">
                          <div className="text-white/40 font-bold uppercase tracking-wider text-[9px] mb-1.5">{f.label}</div>
                          <div className={`font-extrabold ${f.color}`}>{f.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Expanded Profile Details */}
                    <div>
                      <h4 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-3">Metabolic Scorecard</h4>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        {[
                          { label: 'Experience XP', value: userDetail.profile.xp },
                          { label: 'Metabolic Level', value: userDetail.profile.level },
                          { label: 'Current Streak', value: `${userDetail.profile.streak} days` },
                          { label: 'Total Score Runs', value: userDetail.profile.total_runs },
                          { label: 'Age Personalization', value: userDetail.profile.persona_type },
                          { label: 'Circle League', value: userDetail.profile.community_type },
                        ].map((f, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                            <div className="text-white/30 text-[9px] font-bold mb-1">{f.label}</div>
                            <div className="text-violet-400 text-lg font-black">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-3">Account & Personal Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        {[
                          { label: 'Full Name', value: userDetail.profile.full_name || 'N/A' },
                          { label: 'Username', value: userDetail.profile.username || 'N/A' },
                          { label: 'Email Address', value: userDetail.profile.email || 'N/A' },
                          { label: 'Mobile Number', value: userDetail.profile.mobile_number || 'N/A' },
                          { label: 'Date of Birth', value: userDetail.profile.date_of_birth || 'N/A' },
                          { label: 'Age', value: userDetail.profile.age || 'N/A' },
                          { label: 'Gender', value: userDetail.profile.gender || 'N/A' },
                          { label: 'Marital Status', value: userDetail.profile.marital_status || 'N/A' },
                          { label: 'Education', value: userDetail.profile.education || 'N/A' },
                          { label: 'Privacy Level', value: userDetail.profile.privacy_level || 'N/A' },
                        ].map((f, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                            <div className="text-white/30 text-[9px] font-bold mb-1">{f.label}</div>
                            <div className="text-white text-xs font-semibold">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-3">Avatar & Frame Customizer</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {[
                          { label: 'Selected Avatar', value: userDetail.profile.avatar || 'N/A' },
                          { label: 'Avatar Frame', value: userDetail.profile.avatar_frame || 'N/A' },
                        ].map((f, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                            <div className="text-white/30 text-[9px] font-bold mb-1">{f.label}</div>
                            <div className="text-violet-400 text-xs font-bold">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-3">Address & Location</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        {[
                          { label: 'Country', value: userDetail.profile.country || 'N/A' },
                          { label: 'State', value: userDetail.profile.state || 'N/A' },
                          { label: 'City', value: userDetail.profile.city || 'N/A' },
                          { label: 'District', value: userDetail.profile.district || 'N/A' },
                          { label: 'Village', value: userDetail.profile.village || 'N/A' },
                          { label: 'Postal Code', value: userDetail.profile.postal_code || 'N/A' },
                          { label: 'Timezone', value: userDetail.profile.timezone || 'N/A' },
                        ].map((f, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                            <div className="text-white/30 text-[9px] font-bold mb-1">{f.label}</div>
                            <div className="text-white text-xs font-semibold">{f.value}</div>
                          </div>
                        ))}
                      </div>
                      {userDetail.profile.address && (
                        <div className="mt-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 text-xs">
                          <div className="text-white/30 text-[9px] font-bold mb-1">Street Address</div>
                          <div className="text-white text-xs font-semibold leading-relaxed">{userDetail.profile.address}</div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-3">Health & Biometrics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {[
                          { label: 'Height', value: userDetail.profile.height || 'N/A' },
                          { label: 'Weight', value: userDetail.profile.weight || 'N/A' },
                          { label: 'BMI', value: userDetail.profile.bmi || 'N/A' },
                          { label: 'Blood Group', value: userDetail.profile.blood_group || 'N/A' },
                          { label: 'Diabetes Status', value: userDetail.profile.diabetes_status || 'N/A' },
                          { label: 'Prediabetes Status', value: userDetail.profile.prediabetes_status || 'N/A' },
                          { label: 'Blood Pressure', value: userDetail.profile.blood_pressure || 'N/A' },
                          { label: 'Cholesterol', value: userDetail.profile.cholesterol || 'N/A' },
                        ].map((f, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                            <div className="text-white/30 text-[9px] font-bold mb-1">{f.label}</div>
                            <div className="text-emerald-400 text-xs font-extrabold">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-3">Occupation & Work</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        {[
                          { label: 'Occupation', value: userDetail.profile.occupation || 'N/A' },
                          { label: 'Company', value: userDetail.profile.company || 'N/A' },
                          { label: 'Work Type', value: userDetail.profile.work_type || 'N/A' },
                          { label: 'Working Hours', value: userDetail.profile.working_hours || 'N/A' },
                          { label: 'Industry', value: userDetail.profile.industry || 'N/A' },
                          { label: 'Organization', value: userDetail.profile.organization || 'N/A' },
                        ].map((f, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                            <div className="text-white/30 text-[9px] font-bold mb-1">{f.label}</div>
                            <div className="text-white text-xs font-semibold">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-3">Activity & Health Goals</h4>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        {[
                          { label: 'Sleep Goal', value: userDetail.profile.sleep_goal || 'N/A' },
                          { label: 'Water Goal', value: userDetail.profile.water_goal || 'N/A' },
                          { label: 'Activity Goal', value: userDetail.profile.activity_goal || 'N/A' },
                        ].map((f, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                            <div className="text-white/30 text-[9px] font-bold mb-1">{f.label}</div>
                            <div className="text-cyan-400 text-xs font-extrabold">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Subscription */}
                    <div className="bg-[#1b1547]/20 border border-violet-500/10 rounded-3xl p-5">
                      <h4 className="text-violet-400 text-[10px] font-black uppercase tracking-widest mb-3">Pricing Tier Registry</h4>
                      <div className="flex gap-4 flex-wrap text-xs">
                        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-2">
                          <span className="text-white/40">Tier Plan: </span>
                          <span className="text-violet-400 font-extrabold">{userDetail.subscription.plan}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2">
                          <span className="text-white/40">Billing Status: </span>
                          <span className="text-white font-extrabold">{userDetail.subscription.status}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2 font-mono">
                          <span className="text-white/40">Days Remaining: </span>
                          <span className="text-white font-extrabold">{userDetail.subscription.remaining_days} days</span>
                        </div>
                      </div>
                    </div>

                    {/* Active Devices */}
                    {userDetail.devices.length > 0 && (
                      <div>
                        <h4 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-3">Registered Session Devices</h4>
                        <div className="flex flex-col gap-2">
                          {userDetail.devices.map((d: any) => (
                            <div key={d.id} className="bg-white/[0.01] border border-white/[0.03] rounded-2xl px-4 py-3 text-xs flex justify-between items-center">
                              <span className="text-white/60 font-bold">{d.device_name || 'Generic Web Device'}</span>
                              <span className="text-white/30 font-mono text-[10px]">IP: {d.ip_address} · Active: {d.last_active}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Login History */}
                    {userDetail.login_history.length > 0 && (
                      <div>
                        <h4 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-3">Audit Logs (Latest)</h4>
                        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto scrollbar-hide border border-white/[0.03] rounded-2xl p-2 bg-white/[0.005]">
                          {userDetail.login_history.map((log: any, i: number) => (
                            <div key={i} className="bg-white/[0.01] border border-white/[0.02] rounded-xl px-4 py-2 text-[10px] flex justify-between items-center font-mono">
                              <span className={`font-sans font-black ${log.action === 'USER_LOGIN' ? 'text-emerald-400' : 'text-orange-400'}`}>{log.action}</span>
                              <span className="text-white/30 font-semibold">{log.ip_address} · {log.timestamp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Actions */}
                    {selectedUser.email !== 'admin@vivoquest.com' && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.05]">
                        <button onClick={() => handleForceLogout(selectedUser.id, selectedUser.email)}
                          className="flex items-center gap-2 py-3 px-5 bg-orange-500/10 text-orange-400 border border-orange-500/10 hover:bg-orange-500/20 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                          <WifiOff size={13} /> Force Logout sessions
                        </button>
                        <button onClick={() => triggerPasswordReset(selectedUser.id, selectedUser.email)}
                          className="flex items-center gap-2 py-3 px-5 bg-white/[0.02] border border-white/10 text-white/70 hover:bg-white/[0.06] rounded-2xl text-xs font-bold transition-all cursor-pointer">
                          <Lock size={13} /> Force Reset Password
                        </button>
                        {userDetail.user.is_active ? (
                          <button onClick={() => handleUserAction(selectedUser.id, 'SUSPEND')}
                            className="flex items-center gap-2 py-3 px-5 bg-amber-500/10 text-amber-400 border border-amber-500/10 hover:bg-amber-500/20 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                            <Lock size={13} /> Suspend user account
                          </button>
                        ) : (
                          <button onClick={() => handleUserAction(selectedUser.id, 'ACTIVATE')}
                            className="flex items-center gap-2 py-3 px-5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 hover:bg-emerald-500/20 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                            <Check size={13} /> Activate user account
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
