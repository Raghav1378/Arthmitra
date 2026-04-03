"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis
} from 'recharts';
import { 
  Plus, IndianRupee, PieChart as PieIcon, TrendingUp,
  Coffee, Home, Zap, Car, ShoppingBag, Package, Sparkles, History, Trash2, Wallet, ArrowDownCircle, ArrowUpCircle, Shuffle, Loader2,
  BookOpen, HeartPulse, Dumbbell, Film, Leaf, ScanSearch, CheckCircle2, TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  type: 'spend' | 'receive';
}

// --- Constants & Config ---
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

const INITIAL_EXPENSES: Expense[] = [];

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<'spend' | 'receive'>('spend');
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'extracting' | 'complete'>('idle');
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, lastItem: '' });
  const [aiInsight, setAiInsight] = useState<string>("Analyzing your financial state...");
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  
  const [pieMode, setPieMode] = useState<'spend' | 'receive'>('spend');
  const [lineMode, setLineMode] = useState<'spend' | 'receive'>('spend');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteExpense = (id: string) => setExpenses(prev => prev.filter(exp => exp.id !== id));

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
        
        // MIMIC "REAL-TIME" FLOW: Inject items one by one
        for (let i = 0; i < data.expenses.length; i++) {
          const e = data.expenses[i];
          setScanProgress(p => ({ ...p, current: i + 1, lastItem: e.description }));
          
          await new Promise(r => setTimeout(r, 400)); // Mimicking real-time discovery speed
          const newExp: Expense = {
            id: Math.random().toString(36).substr(2, 9),
            amount: e.amount, category: e.category || 'Misc', description: e.description,
            date: e.date ? new Date(e.date) : new Date(), type: e.type || 'spend'
          };
          setExpenses(prev => [newExp, ...prev]);
        }
        setScanState('complete');
        setTimeout(() => setScanState('idle'), 2500);
      }
    } catch (e) {
      console.error("Extraction error:", e);
      setScanState('idle');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      setAiInsight(data.insight || "Stabilizing your treasury...");
    } catch (e) { setAiInsight("Analyzing global flow..."); } 
    finally { setIsInsightLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchAIInsights(expenses), 3000);
    return () => clearTimeout(timer);
  }, [expenses, fetchAIInsights]);

  const handleAddExpense = (e?: React.FormEvent) => {
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
    setExpenses(prev => [{ id: Math.random().toString(36).substr(2,9), amount: amt, category: cat, description: desc || cat, date: new Date(), type: typ }, ...prev]);
    setInput('');
  };

  const metrics = useMemo(() => {
    let inflow = 0, outflow = 0;
    const spendS: Record<string, number> = {}, incomeS: Record<string, number> = {};
    const dSpend: Record<string, number> = {}, dIncome: Record<string, number> = {};
    const week = new Date(Date.now() - 7 * 24*60*60*1000);

    for (let i = 6; i >= 0; i--) {
      const day = new Date(Date.now() - i*24*60*60*1000).toLocaleDateString('en-US', { weekday: 'short' });
      dSpend[day] = 0; dIncome[day] = 0;
    }

    expenses.forEach(e => {
        // GLOBAL CALCULATIONS (Session Tracking)
        if (e.type === 'receive') { 
            inflow += e.amount; 
            incomeS[e.category] = (incomeS[e.category] || 0) + e.amount; 
        } else { 
            outflow += e.amount; 
            spendS[e.category] = (spendS[e.category] || 0) + e.amount; 
        }

        // Velocity Tracking (Last 7 Days)
        const dStr = e.date.toLocaleDateString('en-US', { weekday: 'short' });
        if (e.date >= week) {
            if (e.type === 'receive') { if (dIncome[dStr] !== undefined) dIncome[dStr] += e.amount; }
            else { if (dSpend[dStr] !== undefined) dSpend[dStr] += e.amount; }
        }
    });

    return { 
        inflow, outflow, net: inflow - outflow, 
        spendData: Object.entries(spendS).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value), 
        incomeData: Object.entries(incomeS).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value), 
        lineS: Object.keys(dSpend).map(d => ({ day: d, amount: dSpend[d] })), 
        lineI: Object.keys(dIncome).map(d => ({ day: d, amount: dIncome[d] })) 
    };
  }, [expenses]);

  return (
    <div className="w-full h-full flex flex-col pt-2 pb-6 px-4 md:px-8 max-w-7xl mx-auto overflow-y-auto custom-scrollbar font-sans text-slate-200">
      
      {/* IDENTIFIED SUMMARY (REAL-TIME UPDATING) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4 shrink-0">
        {[
          { l: "Identified Inflow", v: metrics.inflow, i: ArrowDownCircle, c: "emerald", s: "Capture" },
          { l: "Identified Outflow", v: metrics.outflow, i: ArrowUpCircle, c: "rose", s: "Expenditure" },
          { l: "Live Treasury", v: metrics.net, i: IndianRupee, c: metrics.net >= 0 ? "cyan" : "amber", s: "Asset" }
        ].map((card, i) => (
          <motion.div key={i} whileHover={{ y: -6 }} className="relative overflow-hidden rounded-[2.5rem] p-7 bg-white/[0.03] border border-white/[0.08] shadow-2xl group transition-all duration-700 backdrop-blur-xl">
            <div className={`absolute -right-12 -bottom-12 w-48 h-48 bg-${card.c}-500/10 blur-[80px] rounded-full group-hover:bg-${card.c}-500/20 transition-all`} />
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`p-4 bg-${card.c}-500/15 rounded-2xl border border-${card.c}-500/30 text-${card.c}-400 shadow-[0_0_20px_rgba(0,0,0,0.4)] group-hover:scale-110 transition-transform`}><card.i className="w-6 h-6" /></div>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-4 py-1.5 bg-white/5 rounded-full border border-white/5">{card.s}</span>
            </div>
            <div className="relative z-10">
              <h3 className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-widest">{card.l}</h3>
              <p className={`text-4xl font-black tracking-tighter ${i === 0 ? 'text-emerald-400' : i === 1 ? 'text-rose-400' : 'text-white'}`}>₹{card.v.toLocaleString()}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 shrink-0 md:h-[420px]">
        {/* Pie Breakdown */}
        <motion.div className="bg-white/[0.02] border border-white/[0.06] rounded-[2.5rem] p-8 shadow-2xl flex flex-col h-full group/chart relative overflow-hidden backdrop-blur-3xl">
          <div className="flex justify-between items-center mb-10 relative z-10">
             <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.25em] flex items-center gap-3">
                <PieIcon className={`w-5 h-5 ${pieMode === 'spend' ? 'text-cyan-400' : 'text-emerald-400'}`} /> 
                {pieMode === 'spend' ? 'Allocation Matrix' : 'Sources Tracking'}
             </h3>
             <button onClick={() => setPieMode(prev => prev === 'spend' ? 'receive' : 'spend')} className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${pieMode === 'spend' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/25' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25'}`}>
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
                      return <div className="bg-[#0f172a]/95 border border-white/10 p-5 rounded-3xl shadow-2xl backdrop-blur-2xl">
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">{d.name}</p>
                          <p className="text-2xl font-black text-white">₹{d.value.toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-slate-600 mt-2">IDENTIFIED ({((d.value/tot)*100).toFixed(0)}%)</p>
                        </div>;
                    } return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
               <p className={`text-3xl font-black ${pieMode === 'spend' ? 'text-rose-400' : 'text-emerald-400'}`}>₹{((pieMode === 'spend' ? metrics.outflow : metrics.inflow)/1000).toFixed(1)}k</p>
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mt-1">CAPACITY</p>
            </div>
          </div>
        </motion.div>

        {/* Real-Time Velocity Plot */}
        <motion.div className="bg-white/[0.02] border border-white/[0.06] rounded-[2.5rem] p-8 shadow-2xl flex flex-col h-full group/line relative overflow-hidden backdrop-blur-3xl">
           <div className="flex justify-between items-center mb-10 relative z-10">
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.25em] flex items-center gap-3">
                <TrendingUp className={`w-5 h-5 ${lineMode === 'spend' ? 'text-rose-400' : 'text-emerald-400'}`} /> 
                {lineMode === 'spend' ? 'Outflow Heatmap' : 'Inflow Velocity'}
              </h3>
              <button onClick={() => setLineMode(prev => prev === 'spend' ? 'receive' : 'spend')} className={`w-11 h-11 flex items-center justify-center rounded-2xl border transition-all duration-300 ${lineMode === 'spend' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/25' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25'}`}>
                <Shuffle className="w-5 h-5" />
              </button>
           </div>
           <div className="flex-1 w-full relative">
              <AnimatePresence mode="wait">
                <motion.div key={lineMode} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full h-full absolute inset-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineMode === 'spend' ? metrics.lineS : metrics.lineI} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                      <XAxis dataKey="day" hide />
                      <RechartsTooltip content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return <div className="bg-[#0f172a]/95 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                                  <p className={`text-lg font-black ${lineMode === 'spend' ? 'text-rose-400' : 'text-emerald-400'}`}>₹{payload[0].value?.toLocaleString()}</p>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{payload[0].payload.day}</p>
                                </div>;
                            } return null;
                        }}
                      />
                      <Line type="monotone" dataKey="amount" stroke={lineMode === 'spend' ? '#f43f5e' : '#10b981'} strokeWidth={7} dot={false} strokeLinecap="round" animationDuration={1000} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
           </div>
        </motion.div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 mb-40 shrink-0">
        {/* Transaction stream */}
        <div className="flex-1 bg-white/[0.015] border border-white/[0.06] rounded-[2.5rem] p-8 shadow-2xl flex flex-col backdrop-blur-lg min-h-[500px]">
          <h3 className="text-sm font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-3 mb-10">
            <History className="w-6 h-6 text-emerald-400" /> Live Treasury Feed
          </h3>
          <div className="flex-1 overflow-y-auto pr-3 space-y-4 custom-scrollbar max-h-[650px]">
             <AnimatePresence initial={false}>
                {expenses.map((exp) => {
                  const isInc = exp.type === 'receive';
                  const cfg = isInc ? INCOME_CATS[exp.category as keyof typeof INCOME_CATS] : CATEGORIES[exp.category as keyof typeof CATEGORIES];
                  const Icon = isInc ? Wallet : (cfg?.icon || Package);
                  const clr = isInc ? (cfg?.color || '#10b981') : (cfg?.color || '#888');
                  return (
                    <motion.div key={exp.id} layout initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-6 p-6 rounded-[2rem] bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] transition-all group shadow-inner">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-2xl" style={{ backgroundColor: `${clr}10`, color: clr }}><Icon className="w-6 h-6" /></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-black truncate text-[16px] capitalize tracking-tight">{exp.description}</h4>
                        <p className="text-[10px] text-slate-600 font-bold tracking-[0.2em] uppercase mt-2">{exp.category} • {exp.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                      </div>
                      <div className="text-right flex items-center gap-8">
                        <span className={`font-black font-display text-xl ${isInc ? 'text-emerald-400' : 'text-slate-100'}`}>{isInc ? '+' : '-'}₹{exp.amount.toLocaleString()}</span>
                        <button onClick={() => handleDeleteExpense(exp.id)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all active:scale-90"><Trash2 className="w-5.5 h-5.5" /></button>
                      </div>
                    </motion.div>
                  )
                })}
             </AnimatePresence>
          </div>
        </div>

        {/* AI Analysis Sidebar */}
        <div className="w-full lg:w-[400px] shrink-0">
          <motion.div className="bg-white/[0.02] border border-white/[0.06] rounded-[3rem] p-10 h-full flex flex-col relative overflow-hidden backdrop-blur-3xl shadow-2xl">
            <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.3em] mb-12 flex items-center gap-4 relative z-10"><Sparkles className="w-5 h-5" /> Audited Intelligence</h3>
            <div className="flex-1 flex flex-col gap-12 relative z-10">
                <AnimatePresence mode="wait">
                    {isInsightLoading ? ( <div className="space-y-4">{[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-white/5 rounded-full animate-pulse" />)}</div> ) 
                    : ( <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-8 bg-cyan-500/[0.05] border border-cyan-500/10 rounded-[2.5rem] shadow-[inset_0_0_30px_rgba(34,211,238,0.05)] relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-2 h-full bg-cyan-400/50" />
                        <p className="text-[15px] leading-relaxed text-cyan-50/90 font-medium italic">"{aiInsight}"</p>
                      </motion.div> )}
                </AnimatePresence>
                <div className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] shadow-xl">
                   <div className="flex justify-between items-center mb-6">
                      <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em]">Capture Efficiency</p>
                      <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${metrics.net > 0 ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]' : 'bg-rose-400 shadow-[0_0_10px_#f43f5e]'}`} /><p className="text-xs font-black text-white">{metrics.net > 0 ? 'NOMINAL' : 'ALERT'}</p></div>
                   </div>
                   <div className="w-full h-3.5 bg-white/5 rounded-full overflow-hidden mb-6 p-[3px] border border-white/5">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, (metrics.net/metrics.inflow) * 100))}%` }} className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-emerald-400 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.4)]" />
                   </div>
                   <p className="text-[12px] text-slate-400 font-black tracking-[0.1em] text-center italic">{( (metrics.net/metrics.inflow) * 100).toFixed(0)}% Treasury Retainment</p>
                </div>
            </div>
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none" />
          </motion.div>
        </div>
      </div>

      {/* FLOATING SMART INPUT INTERFACE */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-40">
        <form onSubmit={handleAddExpense} className="relative group">
           {/* SCANNING OVERLAY HUD (HIGH-FIDELITY) */}
           <AnimatePresence>
             {scanState !== 'idle' && (
               <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, blur: 10 }} className="absolute -top-32 left-0 right-0 flex justify-center">
                 <div className="bg-[#0f172a]/95 backdrop-blur-[60px] border border-emerald-500/30 p-7 rounded-[2rem] flex items-center gap-10 shadow-[0_50px_200px_rgba(0,0,0,1)] border-t-[1px_solid_rgba(255,255,255,0.15)] ring-1 ring-white/10">
                   <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 flex items-center justify-center bg-emerald-500/5 shadow-inner">
                         {scanState === 'complete' ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <ScanSearch className="w-8 h-8 text-emerald-400 animate-pulse" />}
                      </div>
                      {scanState !== 'complete' && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="absolute inset-0 border-[3px] border-transparent border-t-emerald-400 rounded-full" />}
                   </div>
                   <div className="min-w-[300px]">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-[14px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                          {scanState === 'scanning' ? 'Auditing Dataset...' : scanState === 'extracting' ? 'Tracking Real-Time...' : 'Sync Synchronized'}
                        </p>
                        <span className="text-[13px] font-black text-white/40 tabular-nums">{scanProgress.current}/{scanProgress.total}</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                         <motion.div 
                           initial={{ width: 0 }} 
                           animate={{ width: scanState === 'scanning' ? '40%' : scanState === 'extracting' ? `${(scanProgress.current/scanProgress.total)*100}%` : '100%' }} 
                           className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-cyan-400 shadow-[0_0_30px_#10b981]" 
                         />
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 truncate mt-3 uppercase tracking-widest">{scanProgress.lastItem || 'Awaiting Trace...'}</p>
                   </div>
                   {scanState === 'complete' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[11px] font-black text-emerald-400 px-5 py-2.5 bg-emerald-500/15 rounded-xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">VERIFIED</motion.div>}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           <div className="absolute inset-0 bg-cyan-500/30 blur-[120px] rounded-full opacity-40 transition-opacity duration-1000" />
           <div className="relative flex flex-col gap-6 bg-[#0d1221]/95 backdrop-blur-[80px] border border-white/10 rounded-[3.5rem] p-6 shadow-[0_60px_180px_rgba(0,0,0,0.9)] focus-within:border-cyan-500/50 transition-all duration-700 transform hover:translate-y-[-8px] hover:shadow-[0_80px_200px_rgba(0,0,0,1)]">
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />

             <div className="flex items-center justify-between w-full">
                <div className="flex bg-white/5 rounded-[1.5rem] p-2.5 gap-2.5 relative overflow-hidden backdrop-blur-3xl ring-1 ring-white/5">
                    <motion.div layoutId="active-pill" className={`absolute h-[calc(100%-20px)] rounded-2xl shadow-2xl transition-all duration-700 ${inputType === 'spend' ? 'bg-rose-600/40 border border-rose-500/50 shadow-rose-900/40' : 'bg-emerald-600/40 border border-emerald-500/50 shadow-emerald-900/40'}`} animate={{ x: inputType === 'spend' ? 0 : '100%', width: '50%' }} transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                    <button type="button" onClick={() => setInputType('spend')} className={`relative z-10 px-10 py-3 rounded-2xl text-[13px] font-black uppercase tracking-[0.25em] flex items-center gap-4 transition-all duration-500 ${inputType === 'spend' ? 'text-rose-200' : 'text-slate-600 hover:text-slate-400'}`}><TrendingDown className="w-5 h-5" /> Outflow</button>
                    <button type="button" onClick={() => setInputType('receive')} className={`relative z-10 px-10 py-3 rounded-2xl text-[13px] font-black uppercase tracking-[0.25em] flex items-center gap-4 transition-all duration-500 ${inputType === 'receive' ? 'text-emerald-200' : 'text-slate-600 hover:text-slate-400'}`}><TrendingUp className="w-5 h-5" /> Inflow</button>
                </div>
                <motion.button 
                  type="button" 
                  whileHover={{ scale: 1.2, rotate: 90, shadow: '0 0 30px rgba(16,185,129,0.5)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center justify-center w-14 h-14 rounded-[2rem] border-2 transition-all shadow-[0_15px_40px_rgba(0,0,0,0.5)] ${inputType === 'spend' ? 'bg-rose-500 text-white border-rose-400/50' : 'bg-emerald-500 text-white border-emerald-400/50'}`}
                  title="Auditing High-Mixed CSV"
                >
                  {scanState !== 'idle' ? <Loader2 className="w-7 h-7 animate-spin" /> : <Plus className="w-8 h-8" />}
                </motion.button>
             </div>

             <div className="flex items-center gap-6 px-4">
               <input 
                 value={input} 
                 onChange={(e) => setInput(e.target.value)} 
                 placeholder={inputType === 'spend' ? "₹850 Groceries or Swiggy ₹450..." : "Freelance ₹12000 or Refund +₹1200..."} 
                 className="flex-1 bg-transparent px-2 py-4 text-[20px] text-white placeholder:text-slate-700 font-bold focus:outline-none tracking-tight leading-none" 
               />
               <button 
                 type="submit" 
                 disabled={!input.trim()} 
                 className={`px-12 py-4 rounded-[1.5rem] text-[13px] font-black uppercase tracking-[0.35em] transition-all duration-700 shadow-2xl active:scale-95 disabled:opacity-40 ring-1 ring-white/10 ${inputType === 'spend' ? 'bg-white text-black hover:bg-rose-500 hover:text-white' : 'bg-white text-black hover:bg-emerald-400 hover:text-white'}`}
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
