"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis
} from 'recharts';
import { 
  Plus, IndianRupee, PieChart as PieIcon, TrendingUp,
  Coffee, Home, Zap, Car, ShoppingBag, Package, Sparkles, History, Trash2, Wallet, ArrowDownCircle, ArrowUpCircle, Shuffle, Loader2,
  BookOpen, HeartPulse, Dumbbell, Film, Leaf, ScanSearch, CheckCircle2, TrendingDown, Bot, GraduationCap, Target, RefreshCw, Shield, Activity,
  X, AlertCircle, AlertTriangle, Fingerprint, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  type: 'spend' | 'receive';
  riskInfo?: {
    risk: 'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK';
    score: number;
    reasoning: string;
    details?: string[];
    advice: string[];
    signals?: {
      amount_pattern?: string;
      odd_timing?: boolean;
      repetition_pattern?: string;
      suspicious_context?: boolean;
    };
  };
}

interface ExpenseTrackerProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  onClose?: () => void;
  onOpenSecurityAudit?: () => void;
}


const CATEGORIES = {
  Food: { icon: Coffee, color: '#f43f5e', keywords: ['zomato', 'swiggy', 'pizza', 'burger', 'food', 'restaurant', 'chai', 'coffee', 'dinner', 'lunch', 'momos', 'juice', 'cake', 'cafe'] },
  Housing: { icon: Home, color: '#8b5cf6', keywords: ['rent', 'emi', 'house', 'maintenance', 'builder'] },
  Utilities: { icon: Zap, color: '#3b82f6', keywords: ['bill', 'electricity', 'water', 'internet', 'wifi', 'recharge', 'phone', 'mobile'] },
  Transport: { icon: Car, color: '#10b981', keywords: ['petrol', 'diesel', 'cab', 'uber', 'ola', 'auto', 'metro', 'flight', 'train', 'bus', 'fuel', 'ride', 'ticket'] },
  Shopping: { icon: ShoppingBag, color: '#f59e0b', keywords: ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'gift', 'mall', 'headphones', 'speaker', 'bottle'] },
  Groceries: { icon: Leaf, color: '#10b981', keywords: ['kirana', 'groceries', 'vegetables', 'milk', 'market', 'store'] },
  Education: { icon: BookOpen, color: '#6366f1', keywords: ['book', 'course', 'fees', 'college', 'stationery', 'dsa', 'pens'] },
  Entertainment: { icon: Film, color: '#ec4899', keywords: ['movie', 'netflix', 'prime', 'subscription', 'ticket', 'popcorn'] },
  Fitness: { icon: Dumbbell, color: '#f97316', keywords: ['gym', 'protein', 'workout', 'fitness', 'shake'] },
  Health: { icon: HeartPulse, color: '#ef4444', keywords: ['medical', 'hospital', 'doctor', 'medicines', 'pharmacy'] },
  Misc: { icon: Package, color: '#64748b', keywords: [] }
};

const INCOME_CATS = {
  Earnings: { color: '#10b981', keywords: ['salary', 'payout', 'earnings', 'work', 'freelance', 'internship', 'job', 'company', 'refund', 'pocket', 'received'] },
  Refunds: { color: '#34d399', keywords: ['refund', 'cashback', 'returned'] },
  Gifts: { color: '#059669', keywords: ['gift', 'birthday', 'present'] },
  Investments: { color: '#6ee7b7', keywords: ['stock', 'dividend', 'interest', 'crypto', 'profit'] },
  Other: { color: '#064e3b', keywords: [] }
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function ExpenseTracker({ expenses, setExpenses, onClose, onOpenSecurityAudit }: ExpenseTrackerProps) {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<'spend' | 'receive'>('spend');
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'extracting' | 'complete'>('idle');
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, lastItem: '' });
  const [aiInsight, setAiInsight] = useState<string>("Awaiting resource audit. Load your transactions or sync a CSV to activate the Wealth Strategist.");
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  
  const [pieMode, setPieMode] = useState<'spend' | 'receive'>('spend');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Initial Load Persistence ---
  useEffect(() => {
    const loadFromDB = async () => {
      try {
        const res = await fetch(`${API_BASE}/expenses`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setExpenses(data.map(e => ({
            ...e,
            date: new Date(e.date)
          })));
        }
      } catch (err) { console.error("Persistence Load Error:", err); }
    };
    loadFromDB();
  }, [setExpenses]);

  const handleDeleteExpense = async (id: string) => {
    try {
      await fetch(`${API_BASE}/expenses/${id}`, { method: "DELETE" });
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    } catch (err) { console.error("Persistence Delete Error:", err); }
  };

  const handleResetExpenses = async () => {
    if (!window.confirm("This will permanently delete all transaction history and reset the audit. Proceed?")) return;
    try {
      await fetch(`${API_BASE}/expenses`, { method: "DELETE" });
      setExpenses([]);
      setAiInsight("Awaiting resource audit. Load your transactions or sync a CSV to activate the Wealth Strategist.");
    } catch (err) { console.error("Persistence Reset Error:", err); }
  };

  const handleAnalyzeExpense = async (exp: Expense) => {
    try {
      const res = await fetch(`${API_BASE}/expense/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expense_text: exp.description,
          amount: exp.amount,
          time_of_transaction: exp.date.toLocaleTimeString(),
          frequency: 1
        })
      });
      const data = await res.json();
      setExpenses(prev => prev.map(e => e.id === exp.id ? {
        ...e,
        riskInfo: {
          risk: data.risk || 'SAFE',
          score: data.risk_score || 0,
          reasoning: data.reasoning?.summary || "No anomaly detected.",
          details: data.reasoning?.details || [],
          advice: data.advice || [],
          signals: data.signals_detected
        }
      } : e));
    } catch (err) { console.error("Risk Analysis Error:", err); }
  };

  const handleAuditAll = async () => {
    const unanalyzed = expenses.filter(e => !e.riskInfo);
    if (unanalyzed.length === 0) return;
    for (const exp of unanalyzed) {
      await handleAnalyzeExpense(exp);
      // Small delay to prevent rate limit and show progress
      await new Promise(r => setTimeout(r, 200));
    }
  };  const handleRefresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/expenses`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setExpenses(data.map(e => ({
          ...e,
          date: new Date(e.date)
        })));
      }
    } catch (err) { console.error("Persistence Refresh Error:", err); }
  };

  const handleFinishSession = async () => {
    if (!window.confirm("Finish Audit session? This will clear all data from the Live Treasury and return to the Command Center.")) return;
    try {
      await fetch(`${API_BASE}/expenses`, { method: "DELETE" });
      setExpenses([]);
      if (onClose) onClose();
    } catch (err) { console.error("Persistence Finish Error:", err); }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setScanState('scanning');
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/expense/extract`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.expenses && data.expenses.length > 0) {
        setScanState('extracting');
        setScanProgress({ current: 0, total: data.expenses.length, lastItem: '' });
        for (let i = 0; i < data.expenses.length; i++) {
          const e = data.expenses[i];
          setScanProgress(p => ({ ...p, current: i + 1, lastItem: e.description }));
          await new Promise(r => setTimeout(r, 100)); // Fast extraction feel
          const newExp: Expense = { ...e, date: new Date(e.date) };
          setExpenses(prev => [newExp, ...prev]);
          
          // Background analysis - doesn't block the next extraction step
          handleAnalyzeExpense(newExp);
        }
        setScanState('complete');
        setTimeout(() => setScanState('idle'), 2500);

      }
    } catch (e) { setScanState('idle'); } 
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const fetchAIInsights = useCallback(async (currentExpenses: Expense[]) => {
    if (currentExpenses.length === 0) return;
    setIsInsightLoading(true);
    try {
      const res = await fetch(`${API_BASE}/expense/insights`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses: currentExpenses.map(e => ({ category: e.category, amount: e.type === 'receive' ? e.amount : -e.amount, description: e.description }))
        })
      });
      const data = await res.json();
      setAiInsight(data.insight || "Strategy audit completed.");
    } catch (e) { setAiInsight("Analyzing global flow..."); } 
    finally { setIsInsightLoading(false); }
  }, []);

  useEffect(() => {
    if (expenses.length > 0 && (scanState === 'idle' || scanState === 'complete')) {
        const timer = setTimeout(() => fetchAIInsights(expenses), 1500);
        return () => clearTimeout(timer);
    }
  }, [expenses, fetchAIInsights, scanState]);

  const handleAddExpense = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    let amt = 0;
    const match = input.match(/(?:rs\.?|₹)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
    if (match) amt = parseFloat(match[1].replace(/,/g, ''));
    if (amt === 0) return;
    const low = input.toLowerCase();
    const isInc = ['salary', 'received', 'income', 'internship', 'job', 'work', 'credited','+'].some(k => low.includes(k));
    const typ = isInc ? 'receive' : inputType;
    let cat = 'Misc';
    const dict = typ === 'receive' ? INCOME_CATS : CATEGORIES;
    for (const [n, d] of Object.entries(dict)) { if (d.keywords?.some(k => low.includes(k))) { cat = n; break; } }
    const desc = input.replace(/(?:rs\.?|₹)?\s*\d+(?:,\d+)*(?:\.\d+)?/i, '').replace(/\+|receive|got|income|salary|credited/gi, '').trim();
    
      // Save to Persistence
      try {
        const res = await fetch(`${API_BASE}/expenses`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amt, category: cat, description: desc || cat, type: typ })
        });
        const saved = await res.json();
        const newExp: Expense = { ...saved, date: new Date(saved.date) };
        setExpenses(prev => [newExp, ...prev]);
        setInput('');
        
        // Trigger Risk Analysis
        handleAnalyzeExpense(newExp);
      } catch (err) { console.error("Persistence Save Error:", err); }
    };


  const metrics = useMemo(() => {
    let inflow = 0, outflow = 0;
    const spendS: Record<string, number> = {}, incomeS: Record<string, number> = {};
    expenses.forEach(e => {
        if (e.type === 'receive') { inflow += e.amount; incomeS[e.category] = (incomeS[e.category] || 0) + e.amount; } 
        else { outflow += e.amount; spendS[e.category] = (spendS[e.category] || 0) + e.amount; }
    });
    return { 
        inflow, outflow, net: inflow - outflow, 
        spendData: Object.entries(spendS).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value), 
        incomeData: Object.entries(incomeS).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value), 
    };
  }, [expenses]);

  const securityMetrics = useMemo(() => {
    const threats = expenses.filter(e => e.riskInfo && (e.riskInfo.risk === 'HIGH_RISK' || e.riskInfo.risk === 'SUSPICIOUS'));
    const highRisk = threats.filter(e => e.riskInfo?.risk === 'HIGH_RISK').length;
    const suspicious = threats.filter(e => e.riskInfo?.risk === 'SUSPICIOUS').length;
    const totalAnalyzed = expenses.filter(e => e.riskInfo).length;
    const score = totalAnalyzed === 0 ? 100 : Math.max(0, 100 - (highRisk * 15) - (suspicious * 5));
    
    return { threats, highRisk, suspicious, totalAnalyzed, score };
  }, [expenses]);

  return (
    <div className="w-full h-full flex flex-col pt-2 pb-6 px-4 md:px-8 max-w-7xl mx-auto overflow-y-auto custom-scrollbar font-sans text-parchment">
      
      {/* IDENTIFIED SUMMARY & HEADER */}
      <div className="flex justify-between items-end mb-4 mt-6 shrink-0">
         <div>
            <h2 className="text-2xl font-black text-ink-950 tracking-tighter uppercase">Wealth Auditor</h2>
            <p className="text-[10px] font-black text-parchment-faint tracking-[0.3em] uppercase mt-1 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-emerald-700" /> Advanced Financial Trace Engine
            </p>
         </div>
         <div className="flex gap-4">
            <button 
              onClick={() => onClose?.()}
              className="px-6 py-2.5 rounded-2xl bg-ink-900/5 border border-ink-900/10 text-parchment-faint text-[11px] font-black uppercase tracking-widest hover:bg-ink-900/10 hover:text-ink-950 transition-all shadow-lg active:scale-95"
            >
              Exit Workspace
            </button>
            <button 
              onClick={handleFinishSession}
              className="px-6 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-[11px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95"
            >
              Finish & Clear Audit
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-4 shrink-0">
        
        {/* Security Audit Pulse */}
        <motion.div 
          onClick={() => securityMetrics.threats.length > 0 && onOpenSecurityAudit?.()}
          whileHover={{ y: -6 }} 
          className={`relative overflow-hidden rounded-[2.5rem] p-7 bg-gradient-to-br from-red-500/10 to-gold-500/10 border border-ink-900/10 shadow-2xl group transition-all duration-700 backdrop-blur-xl ${securityMetrics.threats.length > 0 ? 'cursor-pointer hover:border-red-500/40 ring-1 ring-red-500/20' : ''}`}
        >
            <div className={`absolute -right-8 -bottom-8 p-4 transition-opacity ${securityMetrics.threats.length > 0 ? 'opacity-20 group-hover:opacity-40 animate-pulse' : 'opacity-10 group-hover:opacity-20'}`}>
                <Shield className={`w-32 h-32 ${securityMetrics.score < 80 ? 'text-red-600' : 'text-emerald-700'}`} />
            </div>
            <div className="relative z-10">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <Activity className="w-3 h-3 animate-pulse" /> Security Pulse
                </p>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-black text-ink-950 tracking-tighter mb-1">{securityMetrics.score}%</h2>
                    {securityMetrics.threats.length > 0 && (
                        <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 animate-bounce">ACTION REQ</span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-4">
                    <div className="flex -space-x-1">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full border border-black/20 ${i < securityMetrics.highRisk ? 'bg-red-500 shadow-[0_0_10px_#f43f5e]' : 'bg-ink-900/10'}`} />
                        ))}
                    </div>
                    <span className="text-[9px] font-bold text-parchment-faint uppercase tracking-widest pl-2">
                        {securityMetrics.highRisk} Threats • {securityMetrics.totalAnalyzed} Traced
                    </span>
                </div>
            </div>
            {securityMetrics.threats.length > 0 && (
                <div className="absolute top-4 right-4 group-hover:translate-x-1 transition-transform">
                    <div className="p-2 rounded-full bg-red-500/20 border border-red-500/30">
                        <Plus className="w-3 h-3 text-red-600 rotate-45" />
                    </div>
                </div>
            )}
        </motion.div>

        {[
          { l: "Identified Inflow", v: metrics.inflow, i: ArrowDownCircle, c: "emerald", s: "Capture" },
          { l: "Identified Outflow", v: metrics.outflow, i: ArrowUpCircle, c: "rose", s: "Expenditure" },
          { l: "Live Treasury", v: metrics.net, i: IndianRupee, c: metrics.net >= 0 ? "cyan" : "amber", s: "Asset" }
        ].map((card, i) => (
          <motion.div key={i} whileHover={{ y: -6 }} className="relative overflow-hidden rounded-[2.5rem] p-7 bg-ink-900/[0.03] border border-ink-900/[0.08] shadow-2xl group transition-all duration-700 backdrop-blur-xl">
            <div className={`absolute -right-12 -bottom-12 w-48 h-48 bg-${card.c}-500/10 blur-[80px] rounded-full group-hover:bg-${card.c}-500/20 transition-all`} />
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`p-4 bg-${card.c}-500/15 rounded-2xl border border-${card.c}-500/30 text-${card.c}-400 shadow-[0_0_20px_rgba(0,0,0,0.4)] group-hover:scale-110 transition-transform`}><card.i className="w-6 h-6" /></div>
              <span className="text-[10px] font-black text-stone-600 uppercase tracking-[0.3em] px-4 py-1.5 bg-ink-900/5 rounded-full border border-ink-900/5">{card.s}</span>
            </div>
            <div className="relative z-10">
              <h3 className="text-parchment-faint text-xs font-bold mb-1 uppercase tracking-widest">{card.l}</h3>
              <p className={`text-4xl font-black tracking-tighter ${i === 0 ? 'text-emerald-700' : i === 1 ? 'text-red-600' : 'text-ink-950'}`}>₹{card.v.toLocaleString()}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 shrink-0 md:min-h-[420px]">
        {/* Pie Breakdown */}
        <motion.div className="bg-ink-900/[0.02] border border-ink-900/[0.06] rounded-[2.5rem] p-8 shadow-2xl flex flex-col min-h-[400px] group/chart relative overflow-hidden backdrop-blur-3xl">
          <div className="flex justify-between items-center mb-10 relative z-10">
             <h3 className="text-[12px] font-black text-parchment-faint uppercase tracking-[0.25em] flex items-center gap-3">
                <PieIcon className={`w-5 h-5 ${pieMode === 'spend' ? 'text-emerald-700' : 'text-emerald-700'}`} /> 
                {pieMode === 'spend' ? 'Allocation Matrix' : 'Sources Tracking'}
             </h3>
             <button onClick={() => setPieMode(prev => prev === 'spend' ? 'receive' : 'spend')} className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${pieMode === 'spend' ? 'bg-red-500/10 border-red-500/20 text-red-600 hover:bg-red-500/25' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/25'}`}>
                <Shuffle className="w-4 h-4" /> Switch Trace
             </button>
          </div>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieMode === 'spend' ? metrics.spendData : metrics.incomeData} cx="50%" cy="50%" innerRadius={90} outerRadius={120} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={8}>
                  {(pieMode === 'spend' ? metrics.spendData : metrics.incomeData).map((e, index) => (
                    <Cell key={`cell-${index}`} fill={pieMode === 'spend' ? (CATEGORIES[e.name as keyof typeof CATEGORIES]?.color || '#8884d8') : (INCOME_CATS[e.name as keyof typeof INCOME_CATS]?.color || '#10b981')} style={{ filter: 'brightness(1.1) drop-shadow(0 0 10px currentColor)', transition: 'all 0.5s' }} />
                  ))}
                </Pie>
                <RechartsTooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const tot = pieMode === 'spend' ? metrics.outflow : metrics.inflow;
                      return <div className="bg-white/95 border border-ink-900/10 p-5 rounded-3xl shadow-xl backdrop-blur-2xl">
                          <p className="text-[10px] font-black uppercase text-parchment-faint tracking-[0.2em] mb-1">{d.name}</p>
                          <p className="text-2xl font-black text-ink-950">₹{d.value.toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-stone-600 mt-2">IDENTIFIED ({tot > 0 ? ((d.value/tot)*100).toFixed(0) : 0}%)</p>
                        </div>;
                    } return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
               <p className={`text-3xl font-black ${pieMode === 'spend' ? 'text-red-600' : 'text-emerald-700'}`}>₹{((pieMode === 'spend' ? metrics.outflow : metrics.inflow)/1000).toFixed(1)}k</p>
               <p className="text-[10px] font-black text-stone-600 uppercase tracking-[0.3em] mt-1">CAPACITY</p>
            </div>
          </div>
        </motion.div>

        {/* --- Mitra Strategist (The Advisor Bot) --- */}
        <motion.div className="bg-ink-900/[0.02] border border-ink-900/[0.1] rounded-[3rem] p-10 shadow-2xl flex flex-col h-full group/bot relative overflow-hidden backdrop-blur-3xl ring-1 ring-ink-900/10 min-h-[400px]">
           <div className="absolute top-0 right-0 p-8">
              <motion.div animate={isInsightLoading ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                 <RefreshCw className={`w-5 h-5 ${isInsightLoading ? 'text-emerald-700' : 'text-stone-700'}`} />
              </motion.div>
           </div>
           
           <div className="flex items-center gap-5 mb-12 relative z-10">
              <div className="relative">
                 <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center border border-ink-900/20 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                    <Bot className="w-8 h-8 text-ink-950" />
                 </div>
                 {isInsightLoading && (
                   <motion.div 
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                     transition={{ repeat: Infinity, duration: 2 }}
                     className="absolute inset-0 bg-emerald-400 rounded-[2rem]" 
                   />
                 )}
              </div>
              <div>
                 <h3 className="text-lg font-black text-ink-950 tracking-tight uppercase leading-none mb-1">ArthMitra Strategist</h3>
                 <p className="text-[10px] font-black text-emerald-700 tracking-[0.3em] uppercase">Wealth Auditor v4.2</p>
              </div>
           </div>

           <div className="flex-1 flex flex-col relative z-10">
              <AnimatePresence mode="wait">
                 {isInsightLoading ? (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-4 bg-ink-900/5 rounded-full animate-pulse" style={{ width: `${100 - (i * 15)}%` }} />
                      ))}
                      <p className="text-[11px] font-black text-stone-600 uppercase tracking-widest animate-pulse">Running Wealth Audit Trace...</p>
                   </motion.div>
                 ) : (
                   <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                      <div className="p-8 bg-ink-900/[0.03] border border-ink-900/10 rounded-[2.5rem] shadow-inner relative overflow-hidden backdrop-blur-md">
                         <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="w-12 h-12" /></div>
                         <p className="text-[16px] leading-[1.7] text-parchment font-medium italic">"{aiInsight}"</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4">
                            <GraduationCap className="w-5 h-5 text-emerald-700" />
                            <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">Strategy Ready</span>
                         </div>
                         <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4">
                            <Target className="w-5 h-5 text-emerald-700" />
                            <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">Audit Synced</span>
                         </div>
                      </div>
                   </motion.div>
                 )}
              </AnimatePresence>
           </div>
           
           <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        </motion.div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 mb-44 shrink-0">
        <div className="flex-1 bg-ink-900/[0.015] border border-ink-900/[0.06] rounded-[2.5rem] p-8 shadow-2xl flex flex-col backdrop-blur-lg min-h-[500px]">
          <div className="flex justify-between items-center mb-10 relative z-10">
            <h3 className="text-sm font-black text-parchment-dim uppercase tracking-[0.3em] flex items-center gap-3">
              <History className="w-6 h-6 text-emerald-700" /> Live Treasury Feed
            </h3>
            <div className="flex gap-4">
              <button 
                onClick={handleAuditAll} 
                className={`p-2.5 rounded-xl border transition-all active:scale-95 flex items-center gap-2 px-4 ${expenses.some(e => !e.riskInfo) ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20' : 'bg-ink-900/5 border-ink-900/10 text-parchment-faint cursor-default'}`} 
                title="Audit All Transactions"
              >
                <Shield className="w-4.5 h-4.5" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Run Audit</span>
              </button>
              <button onClick={handleRefresh} className="p-2.5 rounded-xl border border-ink-900/10 bg-ink-900/5 text-parchment-faint hover:text-emerald-700 hover:border-emerald-500/30 transition-all active:scale-95" title="Refresh Feed">
                <RefreshCw className="w-4.5 h-4.5" />
              </button>
              <button onClick={handleResetExpenses} className="p-2.5 rounded-xl border border-ink-900/10 bg-ink-900/5 text-parchment-faint hover:text-red-600 hover:border-red-500/30 transition-all active:scale-95" title="Reset Audit (Delete All)">
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>

          </div>

          <div className="flex-1 overflow-y-auto pr-3 space-y-4 custom-scrollbar max-h-[650px]">
             <AnimatePresence initial={false}>
                {expenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-30">
                    <History className="w-16 h-16 text-stone-600 mb-4" />
                    <p className="text-sm font-black text-stone-600 uppercase tracking-widest">Awaiting First Trace...</p>
                  </div>
                ) : expenses.map((exp) => {
                  const isInc = exp.type === 'receive';
                  const cfg: any = isInc ? INCOME_CATS[exp.category as keyof typeof INCOME_CATS] : CATEGORIES[exp.category as keyof typeof CATEGORIES];
                  const Icon = isInc ? Wallet : (cfg?.icon || Package);
                  const clr = isInc ? (cfg?.color || '#3fae7c') : (cfg?.color || '#8d8672');
                  return (
                    <motion.div key={exp.id} layout initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-6 p-6 rounded-[2rem] bg-ink-900/[0.02] hover:bg-ink-900/[0.04] border border-ink-900/[0.03] transition-all group shadow-inner">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-ink-900/10 shadow-2xl" style={{ backgroundColor: `${clr}10`, color: clr }}><Icon className="w-6 h-6" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <h4 className="text-white font-black truncate text-[16px] capitalize tracking-tight">{exp.description}</h4>
                            {exp.riskInfo && (
                                <motion.div 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                        exp.riskInfo.risk === 'HIGH_RISK' ? 'bg-red-500/20 border-red-500/30 text-red-600' :
                                        exp.riskInfo.risk === 'SUSPICIOUS' ? 'bg-amber-500/20 border-amber-500/30 text-amber-700' :
                                        'bg-emerald-500/20 border-emerald-500/30 text-emerald-700'
                                    }`}
                                >
                                    {exp.riskInfo.risk.replace('_', ' ')}
                                </motion.div>
                            )}
                        </div>
                        <div className="flex flex-col mt-2">
                            <div className="flex items-center gap-4">
                                <p className="text-[10px] text-stone-600 font-bold tracking-[0.2em] uppercase">{exp.category} • {exp.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                                {exp.riskInfo && (
                                    <span className="text-[10px] text-parchment-faint font-medium truncate max-w-[200px] border-l border-ink-900/10 pl-4 italic">"{exp.riskInfo.reasoning}"</span>
                                )}
                            </div>
                            
                            {exp.riskInfo && exp.riskInfo.risk !== 'SAFE' && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="mt-4 p-4 bg-ink-900/[0.03] border border-ink-900/5 rounded-2xl space-y-3"
                                >
                                    <div className="flex items-center gap-2 text-[10px] font-black text-parchment-faint uppercase tracking-widest">
                                        <Shield className="w-3.5 h-3.5 text-emerald-700" /> Security Protocol
                                    </div>
                                    <ul className="space-y-2">
                                        {exp.riskInfo.advice.map((adv, idx) => (
                                            <li key={idx} className="text-[11px] text-parchment-dim flex items-start gap-2">
                                                <span className="text-emerald-700 font-bold">•</span> {adv}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            )}
                        </div>
                      </div>


                      <div className="text-right flex items-center gap-8">
                        <span className={`font-black font-display text-xl ${isInc ? 'text-emerald-700' : 'text-stone-100'}`}>{isInc ? '+' : '-'}₹{exp.amount.toLocaleString()}</span>
                        <button onClick={() => handleDeleteExpense(exp.id)} className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-700 hover:text-red-600 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all active:scale-90"><Trash2 className="w-5.5 h-5.5" /></button>
                      </div>
                    </motion.div>
                  )
                })}
             </AnimatePresence>
          </div>
        </div>
      </div>

      {/* FLOATING SMART INPUT INTERFACE */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-40">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-4 whitespace-nowrap overflow-hidden">
            <span className="text-[9px] font-black text-parchment-faint uppercase tracking-[0.2em] animate-pulse">Try: "UPI request for ₹1 to verify account"</span>
            <div className="w-px h-3 bg-ink-900/10" />
            <span className="text-[9px] font-black text-parchment-faint uppercase tracking-[0.2em]">Try: "₹5000 transfer to unknown at 2 AM"</span>
        </div>
        <form onSubmit={handleAddExpense} className="relative group">
           <AnimatePresence>
             {scanState !== 'idle' && (
               <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute -top-32 left-0 right-0 flex justify-center">
                 <div className="bg-white/95 backdrop-blur-[60px] border border-emerald-500/30 p-7 rounded-[2rem] flex items-center gap-10 shadow-[0_30px_80px_rgba(16,48,110,0.15)] border-t-[1px_solid_rgba(201,153,43,0.35)] ring-1 ring-ink-900/10">
                   <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 flex items-center justify-center bg-emerald-500/5 shadow-inner">
                         {scanState === 'complete' ? <CheckCircle2 className="w-8 h-8 text-emerald-700" /> : <ScanSearch className="w-8 h-8 text-emerald-700 animate-pulse" />}
                      </div>
                      {scanState !== 'complete' && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="absolute inset-0 border-[3px] border-transparent border-t-emerald-400 rounded-full" />}
                   </div>
                   <div className="min-w-[300px]">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-[14px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                          {scanState === 'scanning' ? 'Auditing Dataset...' : scanState === 'extracting' ? 'Tracking Real-Time...' : 'Sync Synchronized'}
                        </p>
                        <span className="text-[13px] font-black text-ink-900/40 tabular-nums">{scanProgress.current}/{scanProgress.total}</span>
                      </div>
                      <div className="w-full h-2 bg-ink-900/5 rounded-full overflow-hidden relative border border-ink-900/5">
                         <motion.div 
                           initial={{ width: 0 }} 
                           animate={{ width: scanState === 'scanning' ? '40%' : scanState === 'extracting' ? `${(scanProgress.current/scanProgress.total)*100}%` : '100%' }} 
                           className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-400 shadow-[0_0_30px_#10b981]" 
                         />
                      </div>
                      <p className="text-[10px] font-bold text-parchment-faint truncate mt-3 uppercase tracking-widest">{scanProgress.lastItem || 'Awaiting Trace...'}</p>
                   </div>
                   {scanState === 'complete' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[11px] font-black text-emerald-700 px-5 py-2.5 bg-emerald-500/15 rounded-xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">VERIFIED</motion.div>}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           <div className="absolute inset-0 bg-emerald-500/30 blur-[120px] rounded-full opacity-40 transition-opacity duration-1000" />
           <div className="relative flex flex-col gap-6 bg-white/95 backdrop-blur-[80px] border border-ink-900/10 rounded-[3.5rem] p-6 shadow-[0_40px_120px_rgba(16,48,110,0.18)] focus-within:border-emerald-500/50 transition-all duration-700 transform hover:translate-y-[-8px] hover:shadow-[0_50px_150px_rgba(16,48,110,0.25)]">
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />

             <div className="flex items-center justify-between w-full">
                <div className="flex bg-ink-900/5 rounded-[1.5rem] p-2.5 gap-2.5 relative overflow-hidden backdrop-blur-3xl ring-1 ring-ink-900/5">
                    <motion.div layoutId="active-pill" className={`absolute h-[calc(100%-20px)] rounded-2xl shadow-2xl transition-all duration-700 ${inputType === 'spend' ? 'bg-red-500/15 border border-red-500/30' : 'bg-emerald-500/15 border border-emerald-500/30'}`} animate={{ x: inputType === 'spend' ? 0 : '100%', width: '50%' }} transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                    <button type="button" onClick={() => setInputType('spend')} className={`relative z-10 px-10 py-3 rounded-2xl text-[13px] font-black uppercase tracking-[0.25em] flex items-center gap-4 transition-all duration-500 ${inputType === 'spend' ? 'text-red-600' : 'text-stone-600 hover:text-parchment-faint'}`}><TrendingDown className="w-5 h-5" /> Outflow</button>
                    <button type="button" onClick={() => setInputType('receive')} className={`relative z-10 px-10 py-3 rounded-2xl text-[13px] font-black uppercase tracking-[0.25em] flex items-center gap-4 transition-all duration-500 ${inputType === 'receive' ? 'text-emerald-600' : 'text-stone-600 hover:text-parchment-faint'}`}><TrendingUp className="w-5 h-5" /> Inflow</button>
                </div>
                <motion.button 
                  type="button" 
                  whileHover={{ scale: 1.2, rotate: 90, shadow: '0 0 30px rgba(16,185,129,0.5)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center justify-center w-14 h-14 rounded-[2rem] border-2 transition-all shadow-[0_15px_40px_rgba(16,48,110,0.25)] ${inputType === 'spend' ? 'bg-red-500 text-white border-red-400/50' : 'bg-emerald-500 text-white border-emerald-400/50'}`}
                >
                  {scanState !== 'idle' ? <Loader2 className="w-7 h-7 animate-spin" /> : <Plus className="w-8 h-8" />}
                </motion.button>
             </div>

             <div className="flex items-center gap-6 px-4">
               <input 
                 value={input} 
                 onChange={(e) => setInput(e.target.value)} 
                 placeholder={inputType === 'spend' ? "₹850 Groceries or Swiggy ₹450..." : "Freelance ₹12000 or Refund +₹1200..."} 
                 className="flex-1 bg-transparent px-2 py-4 text-[20px] text-ink-950 placeholder:text-stone-700 font-bold focus:outline-none tracking-tight leading-none" 
               />
               <button 
                 type="submit" 
                 disabled={!input.trim()} 
                 className={`px-12 py-4 rounded-[1.5rem] text-[13px] font-black uppercase tracking-[0.35em] transition-all duration-700 shadow-2xl active:scale-95 disabled:opacity-40 ring-1 ring-ink-900/10 ${inputType === 'spend' ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-ink-950 hover:from-gold-300 hover:to-gold-400' : 'bg-gradient-to-r from-gold-400 to-gold-500 text-ink-950 hover:from-gold-300 hover:to-gold-400'}`}
               >
                 Execute
               </button>
             </div>
           </div>
        </form>
      </div>
    </div>
  );
}
