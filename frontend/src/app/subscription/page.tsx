'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { Check, ShieldCheck, CreditCard, Sparkles, Building2, Flame, X, CheckCircle } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';

const API_BASE = getApiBaseUrl();


export default function SubscriptionPage() {
  const [currentTier, setCurrentTier] = useState('FREE');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [targetPlan, setTargetPlan] = useState<any>(null);

  // Fetch current subscription status from Django backend
  const fetchSubscriptionStatus = async () => {
    const token = localStorage.getItem('vivo_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/billing/status/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentTier(data.plan);
        localStorage.setItem('vivo_tier', data.plan);
      }
    } catch (err) {
      console.error('Failed to retrieve subscription status.');
    }
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const handleUpgrade = async (plan: string) => {
    setLoading(true);
    setMessage('');
    setError('');
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
        setCurrentTier(data.plan);
        localStorage.setItem('vivo_tier', data.plan);
        document.cookie = `vivo_tier=${data.plan}; path=/; max-age=2592000`;
        if (data.plan === 'ENTERPRISE') {
          document.cookie = `vivo_role=CORP_ADMIN; path=/; max-age=2592000`;
        } else if (data.plan === 'PRO') {
          document.cookie = `vivo_role=USER; path=/; max-age=2592000`;
        }
        setMessage(`Successfully upgraded to ${data.plan}!`);
        setShowUpgradeModal(false);
      } else {
        setError(data.error || 'Failed to update subscription.');
      }
    } catch (err) {
      setError('Unable to reach payment sandbox API.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'FREE',
      name: 'Free Agent',
      price: '₹0',
      description: 'Start logging habits and scoring basic runs in regional community leagues.',
      icon: Flame,
      color: 'border-border bg-card',
      features: [
        'Indian Metabolic Plate logs',
        'Daily step innings tracking',
        'Basic local village leaderboard',
        'Standard dashboard metrics'
      ]
    },
    {
      id: 'PRO',
      name: 'Pro Player',
      price: '₹199/mo',
      description: 'Unlock continuous biometric sync, personalized AI coach insights, and private relative circles.',
      icon: Sparkles,
      color: 'border-primary bg-primary text-white',
      features: [
        'Connect wearable CGM sensor telemetry',
        'Continuous AI-Coach predictions',
        'Private family cheer circles',
        'Download weekly health PDF reports',
        'Custom metabolic target configuration'
      ]
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise Team',
      price: 'Custom Pricing',
      description: 'Engineered for corporations and clinical settings needing advanced analytics dashboards and audit trials.',
      icon: Building2,
      color: 'border-border bg-card',
      features: [
        'Multi-tier corporate wellness rosters',
        'Clinical risk monitoring console (ASHA)',
        'ESG health aggregate reports',
        'Dedicated administrative account management',
        'Full CSV/Excel metric spreadsheet exports'
      ]
    }
  ];

  const triggerUpgradeModal = (planId: string) => {
    const p = plans.find(pl => pl.id === planId);
    setTargetPlan(p);
    setShowUpgradeModal(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12 max-w-5xl mx-auto">
        {/* Title */}
        <div className="text-center border-b border-border/40 pb-6">
          <h1 className="text-4xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Choose Your League Tier
          </h1>
          <p className="text-muted-foreground font-semibold text-sm mt-2 max-w-lg mx-auto">
            Scale up from basic meal logs to a comprehensive clinical biometric telemetry interface.
          </p>
        </div>

        {/* Message alerts */}
        {message && (
          <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold text-center animate-pulse-glow">
            🎉 {message}
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-200 text-red-800 p-4 rounded-2xl text-xs font-bold text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((p) => {
            const Icon = p.icon;
            const isCurrent = currentTier === p.id;
            const isHighlight = p.id === 'PRO';

            // Determine button labels exactly matching requirements
            let btnText = 'Upgrade Plan';
            if (isCurrent) {
              btnText = p.id === 'FREE' ? 'Current Plan' : 'Active Plan';
            } else {
              if (p.id === 'FREE') {
                btnText = 'Current Plan'; // free defaults to active when free
              } else if (p.id === 'ENTERPRISE') {
                btnText = 'Contact Sales';
              }
            }
            
            return (
              <div 
                key={p.id} 
                className={`border rounded-[24px] p-6 shadow-card flex flex-col justify-between relative transition-all hover:shadow-lg ${
                  isHighlight ? 'bg-gradient-to-br from-primary to-primary-dark text-white border-primary-dark scale-[1.03]' : 'bg-card border-border/60'
                }`}
              >
                {isHighlight && (
                  <div className="absolute -top-3 right-4 bg-card-lime text-primary-dark font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow">
                    Best Value
                  </div>
                )}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      isHighlight ? 'bg-white/10 text-card-lime' : 'bg-secondary text-primary'
                    }`}>
                      {p.id}
                    </span>
                    <Icon size={20} className={isHighlight ? 'text-card-lime' : 'text-primary'} />
                  </div>
                  
                  <h3 className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>{p.name}</h3>
                  <div className="my-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black" style={{ fontFamily: 'var(--font-heading)' }}>{p.price}</span>
                  </div>
                  <p className={`text-xs leading-relaxed font-semibold mb-6 ${isHighlight ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {p.description}
                  </p>

                  <div className="h-px bg-border/60 my-4 opacity-50" />
                  
                  <ul className="flex flex-col gap-3 font-semibold text-[11px] mb-8">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2">
                        <Check size={14} className={isHighlight ? 'text-card-lime' : 'text-primary'} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  disabled={isCurrent || p.id === 'FREE'}
                  onClick={() => triggerUpgradeModal(p.id)}
                  className={`w-full py-3.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider ${
                    isCurrent 
                      ? 'bg-secondary/40 text-muted-foreground cursor-default border border-dashed border-border'
                      : isHighlight 
                        ? 'bg-card-lime text-primary-dark hover:bg-white active:scale-95 shadow-lg animate-bounce-short'
                        : 'bg-secondary text-primary hover:bg-primary hover:text-white active:scale-95'
                  }`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {btnText}
                </button>
              </div>
            );
          })}
        </div>

        {/* Data Compliance Shield */}
        <div className="bg-secondary/25 p-5 rounded-[24px] border border-border/40 flex items-center gap-4 mt-4 select-none">
          <ShieldCheck size={28} className="text-primary shrink-0" />
          <p className="text-[10px] font-semibold leading-relaxed text-muted-foreground">
            <strong>Feature-Gated Shielding:</strong> Moving down to Free restricts advanced CGM views and Clinical reports. Moving up automatically grants REST API tokens for the new scopes. Payment gateways are disabled in sandbox.
          </p>
        </div>
      </div>

      {/* Upgrade Comparison & Benefits Modal */}
      {showUpgradeModal && targetPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-scale-up">
          <div className="bg-card border border-border/50 max-w-lg w-full rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-secondary/40 rounded-full transition-all"
            >
              <X size={18} />
            </button>

            <h3 className="font-extrabold text-2xl text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
              <Sparkles className="text-primary" size={22} /> Plan Upgrade Pitch
            </h3>

            <div className="grid grid-cols-2 gap-4 bg-secondary/35 p-4 rounded-2xl border border-border/30 mb-6 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Current Plan</span>
                <strong className="text-sm font-black text-foreground block mt-1">{currentTier}</strong>
              </div>
              <div>
                <span className="text-[10px] text-primary font-black uppercase tracking-wider block">New Plan</span>
                <strong className="text-sm font-black text-primary block mt-1">{targetPlan.name} ({targetPlan.price})</strong>
              </div>
            </div>

            <h4 className="font-extrabold text-sm mb-3">Plan Benefits & Feature Comparison</h4>
            <div className="border border-border/45 rounded-2xl overflow-hidden text-[10px] mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border/30 text-primary font-bold">
                    <th className="p-3 text-left">Key Capabilities</th>
                    <th className="p-3 text-center">Free Agent</th>
                    <th className="p-3 text-center">Pro Player</th>
                    <th className="p-3 text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-semibold">
                  <tr>
                    <td className="p-3">CGM Wearable Telemetry</td>
                    <td className="p-3 text-center text-red-500">❌</td>
                    <td className="p-3 text-center text-emerald-500 font-bold">✅ Included</td>
                    <td className="p-3 text-center text-emerald-500 font-bold">✅ Included</td>
                  </tr>
                  <tr>
                    <td className="p-3">Continuous VivoAI Coaching</td>
                    <td className="p-3 text-center text-red-500">❌</td>
                    <td className="p-3 text-center text-emerald-500 font-bold">✅ Included</td>
                    <td className="p-3 text-center text-emerald-500 font-bold">✅ Included</td>
                  </tr>
                  <tr>
                    <td className="p-3">PDF Health Reports</td>
                    <td className="p-3 text-center text-red-500">❌</td>
                    <td className="p-3 text-center text-emerald-500 font-bold">✅ Included</td>
                    <td className="p-3 text-center text-emerald-500 font-bold">✅ Included</td>
                  </tr>
                  <tr>
                    <td className="p-3">Private Family Circles</td>
                    <td className="p-3 text-center text-red-500">❌</td>
                    <td className="p-3 text-center text-emerald-500 font-bold">✅ Included</td>
                    <td className="p-3 text-center text-emerald-500 font-bold">✅ Included</td>
                  </tr>
                  <tr>
                    <td className="p-3">Corporate ESG Aggregate</td>
                    <td className="p-3 text-center text-red-500">❌</td>
                    <td className="p-3 text-center text-red-500">❌</td>
                    <td className="p-3 text-center text-emerald-500 font-bold">✅ Included</td>
                  </tr>
                  <tr>
                    <td className="p-3">Spreadsheet Data Exports</td>
                    <td className="p-3 text-center text-red-500">❌</td>
                    <td className="p-3 text-center text-red-500">❌</td>
                    <td className="p-3 text-center text-emerald-500 font-bold">✅ Included</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 text-xs">
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-3 border border-border rounded-xl font-bold hover:bg-secondary/40 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (targetPlan.id === 'ENTERPRISE') {
                    alert('Request sent! An enterprise representative will reach out shortly. In the meantime, sandbox testing is enabled.');
                  }
                  handleUpgrade(targetPlan.id);
                }}
                disabled={loading}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-accent transition-all flex items-center justify-center gap-1.5 shadow"
              >
                {loading ? 'Processing...' : targetPlan.id === 'ENTERPRISE' ? 'Contact Sales / Confirm' : 'Confirm Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
