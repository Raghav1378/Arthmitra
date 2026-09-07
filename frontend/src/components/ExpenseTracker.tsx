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
    /* Ledger — 100dvh fit: only the feed scrolls, everything else fixed to viewport */
    <div className="w-full h-full flex flex-col px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden font-sans text-parchment">

      {/* ── MASTHEAD ─────────────────────────────────────────────── */}
      <header className="shrink-0 pt-4 pb-3 flex justify-between items-end border-b border-ink-900/[0.08]">
        <div>
          <p className="font-mono text-[9px] font-medium tracking-[0.35em] text-parchment-faint uppercase mb-1 flex items-center gap-2">
            <Sparkles className="w-2.5 h-2.5 text-gold-600" /> Advanced Financial Trace Engine
          </p>
          <h2 className="font-display text-[clamp(1.5rem,3.6vh,2.2rem)] font-semibold text-ink-950 tracking-tight leading-none">
            Wealth Auditor
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onClose?.()}
            className="h-8 px-4 rounded-lg bg-ink-900/[0.04] border border-ink-900/[0.1] text-parchment-faint text-[9px] font-mono font-medium uppercase tracking-[0.2em] hover:border-gold-500/40 hover:text-gold-600 transition-all active:scale-95"
          >
            Exit Workspace
          </button>
          <button
            onClick={handleFinishSession}
            className="h-8 px-4 rounded-lg bg-ledger-red/[0.08] border border-ledger-red/25 text-ledger-red text-[9px] font-mono font-medium uppercase tracking-[0.2em] hover:bg-ledger-red hover:text-white transition-all active:scale-95"
          >
            Finish &amp; Clear
          </button>
        </div>
      </header>

      {/* ── FIGURE STRIP — passbook totals, tabular numerals ──────── */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-ink-900/[0.08] border-b border-ink-900/[0.08] bg-vault-800/40">

        {/* Security pulse */}
        <motion.div
          onClick={() => securityMetrics.threats.length > 0 && onOpenSecurityAudit?.()}
          whileHover={securityMetrics.threats.length > 0 ? { y: -3 } : undefined}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden p-4 lg:p-5 flex flex-col justify-between min-h-[11vh] ${securityMetrics.threats.length > 0 ? 'cursor-pointer' : ''}`}
        >
          <div className={`absolute -right-6 -bottom-6 opacity-[0.07] pointer-events-none ${securityMetrics.threats.length > 0 ? 'text-ledger-red' : 'text-ledger-green'}`}>
            <Shield className="w-24 h-24" />
          </div>
          <p className="font-mono text-[8px] font-medium tracking-[0.3em] uppercase text-parchment-faint flex items-center gap-1.5">
            <Activity className={`w-2.5 h-2.5 ${securityMetrics.score < 80 ? 'text-ledger-red animate-pulse' : 'text-ledger-green'}`} />
            Security Pulse
          </p>
          <div className="flex items-baseline gap-2">
            <p className={`font-display font-semibold tabular-nums tracking-tight text-[clamp(1.3rem,3.4vh,1.9rem)] ${securityMetrics.score < 80 ? 'text-ledger-red' : 'text-ledger-green'}`}>
              {securityMetrics.score}%
            </p>
            {securityMetrics.threats.length > 0 && (
              <span className="text-[7px] font-mono font-medium text-ledger-red bg-ledger-red/10 px-1.5 py-0.5 rounded border border-ledger-red/25 uppercase tracking-[0.15em]">Action Req</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < securityMetrics.highRisk ? 'bg-ledger-red' : 'bg-vault-700/40'}`} />
              ))}
            </div>
            <span className="font-mono text-[8px] text-parchment-faint uppercase tracking-[0.15em]">
              {securityMetrics.highRisk} threats &middot; {securityMetrics.totalAnalyzed} traced
            </span>
          </div>
        </motion.div>

        {/* Inflow / Outflow / Treasury */}
        {[
          { l: 'Identified Inflow', v: metrics.inflow, i: ArrowDownCircle, tone: 'text-ledger-green', tint: 'bg-ledger-green/10 border-ledger-green/25', s: 'capture' },
          { l: 'Identified Outflow', v: metrics.outflow, i: ArrowUpCircle, tone: 'text-ledger-red', tint: 'bg-ledger-red/10 border-ledger-red/25', s: 'expenditure' },
          { l: 'Live Treasury', v: metrics.net, i: IndianRupee, tone: metrics.net >= 0 ? 'text-ink-950' : 'text-ledger-red', tint: metrics.net >= 0 ? 'bg-gold-500/10 border-gold-500/25' : 'bg-ledger-amber/10 border-ledger-amber/25', s: 'asset' },
        ].map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * (idx + 1) }}
            whileHover={{ y: -3 }}
            className="p-4 lg:p-5 flex flex-col justify-between min-h-[11vh] group"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[8px] font-medium tracking-[0.3em] uppercase text-parchment-faint">{card.l}</p>
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${card.tint} ${card.tone}`}>
                <card.i className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className={`font-display font-semibold tabular-nums tracking-tight text-[clamp(1.3rem,3.4vh,1.9rem)] ${card.tone}`}>
              {card.v < 0 ? '−' : ''}₹{Math.abs(card.v).toLocaleString('en-IN')}
            </p>
            <p className="font-mono text-[8px] text-parchment-faint/80 uppercase tracking-[0.2em]">{card.s}</p>
          </motion.div>
        ))}
      </div>

      {/* ── MAIN REGISTER — feed + advisor margin ─────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_340px]">

        {/* PASSBOOK FEED */}
        <div className="min-h-0 flex flex-col border-r border-ink-900/[0.08]">
          <div className="shrink-0 py-2.5 px-1 flex items-center justify-between border-b border-ink-900/[0.08]">
            <h3 className="font-mono text-[9px] font-medium tracking-[0.3em] text-parchment-dim uppercase flex items-center gap-2">
              <History className="w-3 h-3 text-gold-600" /> Live Treasury Feed
            </h3>
            <div className="flex gap-1.5">
              <button
                onClick={handleAuditAll}
                disabled={!expenses.some(e => !e.riskInfo)}
                className="h-7 px-3 rounded-lg border flex items-center gap-1.5 text-[8px] font-mono font-medium uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-default"
                style={expenses.some(e => !e.riskInfo)
                  ? { borderColor: 'rgba(31,157,99,0.35)', background: 'rgba(31,157,99,0.08)', color: 'var(--ledger-green)' }
                  : { borderColor: 'rgba(10,31,77,0.08)', color: 'var(--parchment-faint)' }}
                title="Audit all transactions"
              >
                <Shield className="w-3 h-3" /> Run Audit
              </button>
              <button onClick={handleRefresh} className="h-7 w-7 rounded-lg border border-ink-900/[0.1] flex items-center justify-center text-parchment-faint hover:text-gold-600 hover:border-gold-500/40 transition-all active:scale-95" title="Refresh feed">
                <RefreshCw className="w-3 h-3" />
              </button>
              <button onClick={handleResetExpenses} className="h-7 w-7 rounded-lg border border-ink-900/[0.1] flex items-center justify-center text-parchment-faint hover:text-ledger-red hover:border-ledger-red/40 transition-all active:scale-95" title="Reset audit (delete all)">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 py-2 space-y-1.5">
            <AnimatePresence initial={false}>
              {expenses.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <History className="w-10 h-10 text-parchment-faint mb-3" />
                  <p className="font-mono text-[9px] text-parchment-faint uppercase tracking-[0.25em]">Awaiting first trace&hellip;</p>
                </div>
              ) : expenses.map((exp) => {
                const isInc = exp.type === 'receive';
                const cfg: any = isInc ? INCOME_CATS[exp.category as keyof typeof INCOME_CATS] : CATEGORIES[exp.category as keyof typeof CATEGORIES];
                const Icon = isInc ? (cfg?.icon || Wallet) : (cfg?.icon || Package);
                const clr = isInc ? (cfg?.color || '#1f9d63') : (cfg?.color || '#8d8672');
                return (
                  <motion.div
                    key={exp.id}
                    layout
                    initial={{ opacity: 0, y: -14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="flex items-start gap-4 p-3.5 rounded-2xl bg-vault-800/[0.35] hover:bg-vault-800/60 border border-ink-900/[0.06] hover:border-ink-900/[0.14] transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-ink-900/10 mt-0.5" style={{ backgroundColor: `${clr}14`, color: clr }}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-sans text-[13px] font-semibold text-ink-950 truncate capitalize tracking-tight">{exp.description}</h4>
                        {exp.riskInfo && (
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[7px] font-mono font-medium tracking-[0.15em] uppercase border ${
                            exp.riskInfo.risk === 'HIGH_RISK' ? 'bg-ledger-red/10 border-ledger-red/30 text-ledger-red' :
                            exp.riskInfo.risk === 'SUSPICIOUS' ? 'bg-ledger-amber/10 border-ledger-amber/30 text-ledger-amber' :
                            'bg-ledger-green/10 border-ledger-green/30 text-ledger-green'
                          }`}>
                            {exp.riskInfo.risk.replace('_', ' ')} &middot; {exp.riskInfo.score}
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[8px] text-parchment-faint font-medium tracking-[0.2em] uppercase mt-1">
                        {exp.category} &bull; {exp.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </p>
                      {exp.riskInfo && (
                        <p className="text-[10px] text-parchment-dim italic mt-1.5 line-clamp-1">“{exp.riskInfo.reasoning}”</p>
                      )}

                      {exp.riskInfo && exp.riskInfo.risk !== 'SAFE' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mt-2.5 p-3 bg-vault-900/50 border border-ink-900/[0.08] rounded-xl space-y-2 overflow-hidden"
                        >
                          <div className="flex items-center gap-1.5 text-[8px] font-mono font-medium text-parchment-faint uppercase tracking-[0.2em]">
                            <Shield className="w-3 h-3 text-gold-600" /> Security Protocol
                          </div>
                          <ul className="space-y-1.5">
                            {exp.riskInfo.advice.map((adv, idx) => (
                              <li key={idx} className="text-[10px] text-parchment-dim flex items-start gap-1.5 leading-snug">
                                <span className="text-gold-600 font-bold">•</span> {adv}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <span className={`font-display font-semibold text-[14px] tabular-nums tracking-tight ${isInc ? 'text-ledger-green' : 'text-ink-950'}`}>
                        {isInc ? '+' : '−'}₹{exp.amount.toLocaleString('en-IN')}
                      </span>
                      <button onClick={() => handleDeleteExpense(exp.id)} className="w-6 h-6 rounded-md flex items-center justify-center text-parchment-faint/50 hover:text-ledger-red hover:bg-ledger-red/10 opacity-0 group-hover:opacity-100 transition-all active:scale-90" title="Delete entry">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* ENTRY BAR — docked at the foot of the feed, no floating overlap */}
          <div className="shrink-0 border-t border-gold-500/25 bg-vault-900/70 backdrop-blur-xl px-4 py-3">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />

            {scanState !== 'idle' && (
              <div className="mb-2.5 flex items-center gap-3">
                <div className="relative w-7 h-7 shrink-0">
                  {scanState === 'complete'
                    ? <CheckCircle2 className="w-7 h-7 text-ledger-green" />
                    : <ScanSearch className="w-7 h-7 text-gold-600 animate-pulse" />}
                  {scanState !== 'complete' && (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} className="absolute inset-0 border-2 border-transparent border-t-gold-500 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-mono text-[8px] font-medium text-gold-600 uppercase tracking-[0.25em]">
                      {scanState === 'scanning' ? 'Auditing dataset…' : scanState === 'extracting' ? 'Tracking real-time…' : 'Sync synchronized'}
                    </p>
                    <span className="font-mono text-[8px] text-ink-900/40 tabular-nums">{scanProgress.current}/{scanProgress.total}</span>
                  </div>
                  <div className="w-full h-1 bg-vault-950/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: scanState === 'scanning' ? '40%' : scanState === 'extracting' ? `${(scanProgress.current / Math.max(scanProgress.total, 1)) * 100}%` : '100%' }}
                      className="h-full bg-gradient-to-r from-gold-600 to-gold-300"
                    />
                  </div>
                  <p className="font-mono text-[7px] text-parchment-faint truncate mt-1 uppercase tracking-[0.2em]">{scanProgress.lastItem || 'Awaiting trace…'}</p>
                </div>
                {scanState === 'complete' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[8px] font-mono font-medium text-ledger-green px-2.5 py-1 bg-ledger-green/10 rounded-lg border border-ledger-green/25 uppercase tracking-[0.2em]">Verified</motion.div>
                )}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="flex items-center gap-2.5">
              <div className="shrink-0 flex rounded-lg border border-ink-900/[0.1] overflow-hidden bg-ink-900/[0.02]">
                <button
                  type="button"
                  onClick={() => setInputType('spend')}
                  className={`px-3 h-8 text-[8px] font-mono font-medium tracking-[0.18em] uppercase transition-colors flex items-center ${inputType === 'spend' ? 'bg-ledger-red/15 text-ledger-red border-r border-ledger-red/25' : 'text-parchment-faint hover:text-parchment-dim'}`}
                >
                  <TrendingDown className="w-3 h-3 mr-1.5" /> Outflow
                </button>
                <button
                  type="button"
                  onClick={() => setInputType('receive')}
                  className={`px-3 h-8 text-[8px] font-mono font-medium tracking-[0.18em] uppercase transition-colors flex items-center ${inputType === 'receive' ? 'bg-ledger-green/15 text-ledger-green' : 'text-parchment-faint hover:text-parchment-dim'}`}
                >
                  <TrendingUp className="w-3 h-3 mr-1.5" /> Inflow
                </button>
              </div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={inputType === 'spend' ? '₹850 groceries or Swiggy ₹450…' : 'Freelance ₹12000 or refund +₹1200…'}
                className="flex-1 min-w-0 h-8 bg-transparent px-2 text-[12px] text-ink-950 placeholder:text-parchment-faint/60 font-medium focus:outline-none tracking-tight"
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.08, rotate: 90 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 w-8 h-8 rounded-lg border border-gold-500/40 bg-gold-500/15 text-gold-600 flex items-center justify-center transition-all"
                title="Import CSV"
              >
                {scanState !== 'idle' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </motion.button>
              <button
                type="submit"
                disabled={!input.trim()}
                className="shrink-0 h-8 px-4 rounded-lg text-[9px] font-mono font-medium uppercase tracking-[0.25em] bg-gradient-to-r from-gold-400 to-gold-500 text-ink-950 shadow-sm hover:from-gold-300 hover:to-gold-400 transition-all active:scale-95 disabled:opacity-40"
              >
                Execute
              </button>
            </form>

            <p className="font-mono text-[7px] text-parchment-faint/70 uppercase tracking-[0.2em] mt-1.5 text-center truncate">
              Try: “UPI request for ₹1 to verify account” &middot; “₹5000 transfer to unknown at 2 AM”
            </p>
          </div>
        </div>

        {/* MARGIN NOTE — allocation pie + strategist, guilloche-framed */}
        <aside className="hidden lg:flex min-h-0 flex-col bg-vault-900/40">
          <div className="shrink-0 py-2.5 px-5 border-b border-ink-900/[0.08] flex items-center justify-between">
            <h3 className="font-mono text-[9px] font-medium tracking-[0.3em] text-parchment-dim uppercase flex items-center gap-2">
              <PieIcon className="w-3 h-3 text-gold-600" /> {pieMode === 'spend' ? 'Allocation Matrix' : 'Sources Tracking'}
            </h3>
            <button onClick={() => setPieMode(prev => prev === 'spend' ? 'receive' : 'spend')} className="h-7 px-2.5 rounded-lg border border-ink-900/[0.1] flex items-center gap-1.5 text-[8px] font-mono font-medium uppercase tracking-[0.15em] text-parchment-dim hover:text-gold-600 hover:border-gold-500/40 transition-all active:scale-95">
              <Shuffle className="w-3 h-3" /> Switch
            </button>
          </div>

          {metrics.spendData.length > 0 && (
            <div className="shrink-0 p-4 border-b border-ink-900/[0.08]">
              <div className="relative h-[22vh]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieMode === 'spend' ? metrics.spendData : metrics.incomeData} cx="50%" cy="50%" innerRadius="62%" outerRadius="88%" paddingAngle={4} dataKey="value" stroke="none">
                      {(pieMode === 'spend' ? metrics.spendData : metrics.incomeData).map((e, index) => (
                        <Cell key={`cell-${index}`} fill={pieMode === 'spend' ? (CATEGORIES[e.name as keyof typeof CATEGORIES]?.color || '#c9992b') : (INCOME_CATS[e.name as keyof typeof INCOME_CATS]?.color || '#1f9d63')} style={{ transition: 'all 0.5s' }} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const tot = pieMode === 'spend' ? metrics.outflow : metrics.inflow;
                        return (
                          <div className="bg-vault-800/95 backdrop-blur-xl border border-ink-900/[0.12] p-3 rounded-xl shadow-xl">
                            <p className="text-[7px] font-mono uppercase text-parchment-faint tracking-[0.2em] mb-0.5">{d.name}</p>
                            <p className="font-display text-[14px] font-semibold text-ink-950 tabular-nums">₹{d.value.toLocaleString('en-IN')}</p>
                            <p className="text-[7px] font-mono text-parchment-faint mt-0.5 uppercase tracking-[0.15em]">{tot > 0 ? ((d.value / tot) * 100).toFixed(0) : 0}% of flow</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <p className={`font-display text-[clamp(1rem,2.4vh,1.4rem)] font-semibold tabular-nums ${pieMode === 'spend' ? 'text-ledger-red' : 'text-ledger-green'}`}>
                    ₹{((pieMode === 'spend' ? metrics.outflow : metrics.inflow) / 1000).toFixed(1)}k
                  </p>
                  <p className="font-mono text-[7px] text-parchment-faint uppercase tracking-[0.3em] mt-0.5">capacity</p>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {(pieMode === 'spend' ? metrics.spendData : metrics.incomeData).slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[8px] tracking-[0.1em] uppercase text-parchment-dim truncate">{s.name}</span>
                    <span className="font-mono text-[9px] tabular-nums text-ink-950 font-medium shrink-0">₹{s.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategist */}
          <div className="flex-1 min-h-0 flex flex-col p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center border border-gold-500/40 shadow-lg shadow-gold-500/20">
                  <Bot className="w-5 h-5 text-ink-950" />
                </div>
                {isInsightLoading && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-gold-400 rounded-xl"
                  />
                )}
              </div>
              <div>
                <h3 className="font-display text-[14px] font-semibold text-ink-950 tracking-tight leading-none">ArthMitra Strategist</h3>
                <p className="font-mono text-[7px] text-gold-600 tracking-[0.25em] uppercase mt-1">Wealth Auditor v4.2</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">
                {isInsightLoading ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-2.5 bg-vault-700/60 rounded-full animate-pulse" style={{ width: `${100 - i * 15}%` }} />
                    ))}
                    <p className="font-mono text-[8px] text-parchment-faint uppercase tracking-[0.2em] animate-pulse pt-1">Running wealth audit trace…</p>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="border-l-2 border-gold-500/60 pl-3.5 py-1">
                      <p className="font-display text-[12px] leading-[1.7] text-parchment italic">“{aiInsight}”</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="p-2.5 bg-gold-500/10 border border-gold-500/20 rounded-lg flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-gold-600" />
                        <span className="text-[8px] font-mono font-medium text-gold-600 uppercase tracking-[0.12em]">Strategy Ready</span>
                      </div>
                      <div className="p-2.5 bg-ledger-green/10 border border-ledger-green/20 rounded-lg flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-ledger-green" />
                        <span className="text-[8px] font-mono font-medium text-ledger-green uppercase tracking-[0.12em]">Audit Synced</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
