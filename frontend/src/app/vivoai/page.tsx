'use client';

import { useState, useRef, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import MiniRing from '../../components/MiniRing';
import { 
  Bot, 
  Send, 
  Mic, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  Brain,
  Compass,
  FileSpreadsheet,
  Moon,
  Activity,
  User,
  ActivityIcon
} from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export default function VivoAIPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'nutrition' | 'sleep' | 'stress' | 'predictions'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Namaste! I am VivoAI, your metabolic health coach. Ask me anything about your nutrition, sleep, stress, or habits.', timestamp: '08:00 AM' },
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    const userMsg: Message = {
      role: 'user',
      content: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Mock AI Response
    setTimeout(() => {
      let aiContent = "I've analyzed your telemetry. Your glucose trends show a minor spike after your lunch. I recommend adding 5-10 minutes of active walking to flatten the curve.";
      if (inputText.toLowerCase().includes('sleep')) {
        aiContent = "Your sleep latency was 28 minutes yesterday, likely due to cortisol spikes from late screen-time. Consider a 10-minute digital wind-down tonight.";
      } else if (inputText.toLowerCase().includes('plate') || inputText.toLowerCase().includes('meal') || inputText.toLowerCase().includes('eat')) {
        aiContent = "Logging 30% vegetables in your meals secures your daily boundary. Keep dal or paneer as the protein core to maintain muscle preservation.";
      }

      const aiMsg: Message = {
        role: 'ai',
        content: aiContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1200);
  };

  const toggleVoiceRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        setInputText("How did my pre-lunch walk impact my score today?");
      }, 2500);
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-3" style={{ fontFamily: 'var(--font-heading)' }}>
            VivoAI Coach Portal <span className="text-xs bg-[#E4F5C4] text-primary px-3 py-1 rounded-full uppercase tracking-wider font-extrabold">Quiet AI</span>
          </h1>
          <p className="text-muted-foreground font-medium text-sm mt-1">
            Clinical-grade insights powered by your biometric telemetry. Non-intrusive, precise, and actionable.
          </p>
        </div>
      </div>

      {/* Tabs selector */}
      <div className="flex overflow-x-auto bg-card p-1.5 rounded-2xl border border-border shadow-sm scrollbar-hide max-w-2xl shrink-0">
        {[
          { key: 'chat', label: 'AI Coach Chat', icon: Bot },
          { key: 'nutrition', label: 'Nutrition Plate', icon: Sparkles },
          { key: 'sleep', label: 'Sleep Analytics', icon: Moon },
          { key: 'stress', label: 'Stress Triggers', icon: Brain },
          { key: 'predictions', label: 'Metabolic Forecast', icon: TrendingUp }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* Left Column (8/12 width) - Dynamic View based on activeTab */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full min-h-[600px]">
          
          {/* View: Chat */}
          {activeTab === 'chat' && (
            <div className="bg-card rounded-[32px] border border-border/60 shadow-sm flex flex-col h-[550px] relative overflow-hidden">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-border/40 bg-background/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                    🤖
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-foreground">Interactive AI Consultation</h4>
                    <span className="text-[10px] text-accent font-bold">Online • Listening</span>
                  </div>
                </div>
              </div>

              {/* Message log */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 scrollbar-hide">
                {messages.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`flex gap-3 max-w-[80%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                      m.role === 'user' ? 'bg-secondary text-primary' : 'bg-primary text-white'
                    }`}>
                      {m.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className={`rounded-2xl p-4 shadow-sm border ${
                      m.role === 'user' 
                        ? 'bg-primary text-white border-primary/20 rounded-tr-none' 
                        : 'bg-background border-border/40 text-foreground rounded-tl-none'
                    }`}>
                      <p className="text-sm leading-relaxed font-medium">{m.content}</p>
                      <span className={`text-[9px] mt-1.5 block text-right font-bold ${
                        m.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                      }`}>
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input box */}
              <div className="p-4 border-t border-border/40 bg-background/50 flex items-center gap-3 shrink-0">
                <button 
                  onClick={toggleVoiceRecording}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                      : 'bg-card border border-border text-primary hover:bg-secondary/40'
                  }`}
                >
                  <Mic size={20} className={isRecording ? 'animate-bounce' : ''} />
                </button>
                <input 
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isRecording ? 'Listening to voice...' : 'Ask about your sleep, meal balance, steps targets...'}
                  className="flex-1 p-3.5 rounded-xl bg-card border border-border focus:border-primary focus:outline-none text-sm font-semibold text-foreground shadow-inner"
                />
                <button 
                  onClick={handleSendMessage}
                  className="w-12 h-12 bg-primary text-white hover:bg-accent rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}

          {/* View: Nutrition Plate Details */}
          {activeTab === 'nutrition' && (
            <div className="bg-card rounded-[32px] p-8 border border-border/60 shadow-sm flex flex-col gap-6">
              <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                Indian Metabolic Plate Summary
              </h3>
              <div className="flex flex-col md:flex-row items-center gap-8 justify-center py-6">
                <div className="w-44 h-44 shrink-0 flex items-center justify-center bg-secondary/35 rounded-full border border-border">
                  <MiniRing pct={70} size={150} color="var(--primary)" trackColor="var(--secondary)" strokeWidth={16}>
                    <div className="text-center flex flex-col">
                      <span className="text-[10px] font-black uppercase text-muted-foreground">Quality Score</span>
                      <span className="text-2xl font-black text-primary">78%</span>
                    </div>
                  </MiniRing>
                </div>
                <div className="flex-1 flex flex-col gap-4">
                  <h4 className="font-extrabold text-base text-primary-dark">Nutrition Recommendations</h4>
                  <ul className="flex flex-col gap-3 font-medium text-sm text-muted-foreground">
                    <li className="flex items-start gap-2.5"><span className="text-primary mt-0.5 font-bold">✔</span> Grains average is 28% of plates (keep below 25% target to avoid insulin spikes).</li>
                    <li className="flex items-start gap-2.5"><span className="text-primary mt-0.5 font-bold">✔</span> Vegetables average is 22% (increase salad portions to hit the 30% benchmark).</li>
                    <li className="flex items-start gap-2.5"><span className="text-primary mt-0.5 font-bold">✔</span> Protein intake is locked at 20% (Excellent paneer/dal ratios this week!).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* View: Sleep Details */}
          {activeTab === 'sleep' && (
            <div className="bg-card rounded-[32px] p-8 border border-border/60 shadow-sm flex flex-col gap-6">
              <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                Biometric Sleep Analytics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-background rounded-2xl border border-border/30 text-center">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">LATENCY</span>
                  <span className="text-3xl font-extrabold text-foreground block mt-2">18 Min</span>
                  <p className="text-[10px] text-muted-foreground mt-1">Excellent fall asleep speed</p>
                </div>
                <div className="p-5 bg-background rounded-2xl border border-border/30 text-center">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">DEEP SLEEP</span>
                  <span className="text-3xl font-extrabold text-primary block mt-2">2.4 Hours</span>
                  <p className="text-[10px] text-muted-foreground mt-1">32% of total sleep time</p>
                </div>
                <div className="p-5 bg-background rounded-2xl border border-border/30 text-center">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">RESTORATION</span>
                  <span className="text-3xl font-extrabold text-accent block mt-2">92%</span>
                  <p className="text-[10px] text-muted-foreground mt-1">High heart rate variability</p>
                </div>
              </div>
              <div className="bg-secondary/35 rounded-2xl p-5 border border-primary/10">
                <h4 className="font-extrabold text-sm text-primary mb-2">Sleep Insight Summary</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                  Your sleep patterns are highly restorative when dinner occurs before 8 PM. On late dinner days (post 8:30 PM), deep sleep latency increases by +12 minutes and heart rate remains elevated for the first 2 hours of sleep.
                </p>
              </div>
            </div>
          )}

          {/* View: Stress Details */}
          {activeTab === 'stress' && (
            <div className="bg-card rounded-[32px] p-8 border border-border/60 shadow-sm flex flex-col gap-6">
              <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                Mindfulness & Stress Triggers
              </h3>
              <div className="flex flex-col md:flex-row items-center gap-8 justify-center py-4">
                <div className="w-32 h-32 shrink-0 flex items-center justify-center bg-secondary/35 rounded-full border border-border">
                  <Brain size={48} className="text-primary animate-pulse" />
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <h4 className="font-extrabold text-base">Stress level (1-5): Average 2.1</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Cortisol triggers usually peak around 3:00 PM - 4:00 PM corresponding with corporate work blocks.
                  </p>
                  <button className="py-2.5 px-5 rounded-full bg-primary text-white font-bold text-xs w-fit shadow-md hover:bg-accent transition-colors">
                    Start 5-Minute Box Breathing
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View: Predictions */}
          {activeTab === 'predictions' && (
            <div className="bg-card rounded-[32px] p-8 border border-border/60 shadow-sm flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                  Predictive Health & Glucose Trends
                </h3>
                <span className="text-xs text-muted-foreground font-semibold">AI forecast</span>
              </div>
              
              <div className="p-4 bg-background rounded-2xl border border-border/30">
                <h4 className="font-extrabold text-sm mb-2 text-primary flex items-center gap-1.5">
                  <TrendingUp size={16} /> 90-Day Metabolic Flex Score Forecast
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                  Based on your compliance rate (87.5%), we predict your HbA1c will decrease from 6.1 (pre-diabetic range) to 5.6 (normal range) by Day 90.
                </p>
              </div>

              {/* Predictions SVG Trend Chart */}
              <div className="h-44 w-full bg-secondary/15 rounded-xl border border-border flex items-end justify-center relative p-4 overflow-hidden">
                <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 500 150" preserveAspectRatio="none">
                  {/* Dotted threshold line */}
                  <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(26,82,41,0.2)" strokeWidth="2" strokeDasharray="5 5" />
                  {/* Forecast curvy path */}
                  <path 
                    d="M 0 120 C 100 100, 200 60, 300 50 C 400 45, 500 35, 500 30" 
                    fill="none" 
                    stroke="var(--primary)" 
                    strokeWidth="4" 
                  />
                  {/* Shaded projection error bounds */}
                  <path 
                    d="M 300 50 L 500 20 L 500 45 Z" 
                    fill="rgba(26,82,41,0.06)" 
                  />
                </svg>
                <div className="absolute top-2 right-4 text-[9px] font-bold text-primary bg-secondary px-2 py-0.5 rounded-full border border-primary/10">
                  Glucose stabilization zone (HbA1c &lt; 5.7)
                </div>
                <div className="absolute bottom-2 left-4 text-[9px] font-bold text-muted-foreground">Day 23 (Current)</div>
                <div className="absolute bottom-2 right-4 text-[9px] font-bold text-muted-foreground">Day 90 (Forecast)</div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column (4/12 width) - Quiet Coach Card & Telemetry */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Headline daily recommendation */}
          <div className="bg-card-lime rounded-[24px] p-6 border border-primary/10 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="text-primary-dark" size={20} />
              <h4 className="font-extrabold text-sm text-primary-dark uppercase tracking-wide">Today's Single Insight</h4>
            </div>
            <p className="text-sm font-semibold text-primary-dark leading-relaxed italic">
              "Your pre-lunch walk lifted today's metabolic score by +4 pts. Repeat tomorrow for a boundary."
            </p>
            <div className="w-full h-px bg-primary/10" />
            <div className="flex items-center justify-between text-xs font-bold text-primary-dark">
              <span>Primary Driver: Active Steps</span>
              <span className="bg-primary text-white py-0.5 px-2.5 rounded-full text-[10px]">Verified</span>
            </div>
          </div>

          {/* Wearables linked status */}
          <div className="bg-card rounded-[24px] p-6 border border-border/40 shadow-card">
            <h4 className="font-extrabold text-base mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Linked Biometrics Status
            </h4>
            
            <div className="flex flex-col gap-3.5">
              {[
                { name: 'Google Fit', status: 'Syncing', desc: 'Sync 2m ago', active: true },
                { name: 'Apple Health', status: 'Standby', desc: 'Sync 1h ago', active: true },
                { name: 'Abbott CGM Sensor', status: 'Connected', desc: 'Continuous telemetry stream', active: true, highlighted: true },
                { name: 'Fitbit Integration', status: 'Disconnected', desc: 'Authorization expired', active: false },
              ].map((wearable, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-3 rounded-2xl border ${
                    wearable.highlighted 
                      ? 'bg-secondary/40 border-primary/30' 
                      : 'bg-background border-border/30'
                  }`}
                >
                  <div>
                    <h5 className="text-xs font-bold text-foreground">{wearable.name}</h5>
                    <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">{wearable.desc}</p>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    !wearable.active 
                      ? 'bg-border text-muted-foreground' 
                      : wearable.highlighted 
                        ? 'bg-primary text-white' 
                        : 'bg-secondary text-primary'
                  }`}>
                    {wearable.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
