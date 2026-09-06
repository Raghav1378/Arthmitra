"use client";

import React, { useState } from 'react';
import { 
  Shield, Sparkles, PieChart, Activity, 
  Settings, HelpCircle, Info, Globe, 
  PanelLeftClose, PanelLeft, LayoutDashboard,
  X, AlertTriangle, Fingerprint, AlertCircle, RefreshCw, CheckCircle2
} from 'lucide-react';
import Chat from '../components/Chat';
import ScamShield from '../components/ScamShield';
import ExpenseTracker from '../components/ExpenseTracker';
import Sidebar from '../components/Sidebar';
import ApiStatusIndicator from '../components/ApiStatusIndicator';
import { motion, AnimatePresence } from 'framer-motion';

import { Expense } from '../components/ExpenseTracker';


export default function Home() {
  const [activeView, setActiveView] = useState("chat");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showSecurityAudit, setShowSecurityAudit] = useState(false);

  const securityMetrics = React.useMemo(() => {
    const threats = expenses.filter(e => e.riskInfo && (e.riskInfo.risk === 'HIGH_RISK' || e.riskInfo.risk === 'SUSPICIOUS'));
    const highRisk = threats.filter(e => e.riskInfo?.risk === 'HIGH_RISK').length;
    const suspicious = threats.filter(e => e.riskInfo?.risk === 'SUSPICIOUS').length;
    const totalAnalyzed = expenses.filter(e => e.riskInfo).length;
    const score = totalAnalyzed === 0 ? 100 : Math.max(0, 100 - (highRisk * 15) - (suspicious * 5));
    
    return { threats, highRisk, suspicious, totalAnalyzed, score };
  }, [expenses]);

  const handleDeleteExpense = async (id: string) => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    try {
      await fetch(`${API_BASE}/expenses/${id}`, { method: "DELETE" });
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    } catch (err) { console.error("Persistence Delete Error:", err); }
  };

  return (
    <main className="h-screen bg-vault text-parchment overflow-hidden flex relative">
      {/* Guilloche atmosphere + paper grain */}
      <div className="fixed inset-0 pointer-events-none z-0 grain">
        <div className="absolute top-[-15%] left-[-8%] w-[650px] h-[650px] rounded-full bg-gold-500/[0.04] blur-[150px]" />
        <div className="absolute bottom-[-12%] right-[-6%] w-[550px] h-[550px] rounded-full bg-ledger-green/[0.035] blur-[130px]" />
        <div className="absolute top-[35%] right-[24%] w-[420px] h-[420px] rounded-full bg-gold-300/[0.025] blur-[120px]" />
      </div>

      {/* ─── Sidebar Component (Gains Global Expenses) ─── */}
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        expenses={expenses}
        onOpenSecurityAudit={() => setShowSecurityAudit(true)}
      />

      {/* ─── Main Viewport Area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 transition-all duration-500 ease-[0.4, 0, 0.2, 1]">
        
        <header className="h-16 flex items-center justify-between px-8 border-b border-ink-900/10 bg-white/70 backdrop-blur-xl shrink-0 z-20">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-ink-900/[0.03] border border-gold-500/15 hover:bg-gold-500/10 hover:border-gold-500/35 transition-all text-parchment-faint hover:text-gold-600 overflow-hidden"
              title={isSidebarOpen ? "Retract Sidebar" : "Show Sidebar"}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-gold-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5 relative z-10" /> : <PanelLeft className="w-5 h-5 relative z-10 text-gold-600" />}
            </button>

            <div className="flex flex-col">
              <h1 className="font-mono text-[10px] font-medium tracking-[0.3em] text-parchment-faint uppercase leading-none mb-1">
                {activeView === 'chat' ? 'VIRTUAL ASSISTANT' : activeView.toUpperCase()}
              </h1>
              <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-3.5 h-3.5 text-gold-500/80" />
                    <span className="font-display text-sm font-semibold text-parchment tracking-tight">Command Center</span>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/25 mr-2">
                <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                <span className="font-mono text-[10px] font-medium text-gold-600 uppercase tracking-[0.2em] leading-none">Mitra v3.0</span>
            </div>
            <ApiStatusIndicator />
            <div className="flex items-center gap-2 pr-2 border-r border-gold-500/15 group cursor-pointer ml-2">
                <div className="text-right hidden sm:block">
                    <p className="font-display text-[12px] font-semibold text-parchment leading-none">RAGHAV</p>
                    <p className="font-mono text-[8px] text-ledger-green uppercase tracking-[0.25em] mt-1">PRO ACCOUNT</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center font-display text-[13px] font-semibold text-ink-950 shadow-lg shadow-gold-500/20 group-hover:scale-105 transition-transform border border-gold-300/40">
                R
                </div>
            </div>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gold-500/10 transition-all text-parchment-faint hover:text-gold-600 border border-transparent hover:border-gold-500/25">
                <Settings className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative p-4 lg:p-6 flex justify-center">
            <AnimatePresence mode="wait">
                {activeView === "chat" ? (
                    <motion.div 
                        key="chat-view"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="w-full max-w-7xl h-full flex flex-col shadow-2xl shadow-ink-950/15 rounded-3xl overflow-hidden glass-strong border border-ink-900/[0.05]"
                    >
                        <Chat />
                    </motion.div>
                ) : activeView === "security" ? (
                    <motion.div
                        key="security-view"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="w-full max-w-5xl h-full flex flex-col shadow-2xl shadow-ink-950/15 rounded-3xl overflow-hidden glass-strong border border-ink-900/[0.05]"
                    >
                        <ScamShield />
                    </motion.div>
                ) : activeView === "expenses" ? (
                    <motion.div
                        key="expenses-view"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="w-full h-full flex flex-col shadow-2xl shadow-ink-950/15 rounded-3xl overflow-hidden glass-strong border border-ink-900/[0.05]"
                    >
                        <ExpenseTracker expenses={expenses} setExpenses={setExpenses} onClose={() => setActiveView('chat')} onOpenSecurityAudit={() => setShowSecurityAudit(true)} />
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>

        {/* GLOBAL SECURITY AUDIT MODAL */}
        <AnimatePresence>
          {showSecurityAudit && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setShowSecurityAudit(false)}
                className="absolute inset-0 bg-ink-950/50 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-4xl max-h-[85vh] bg-white border border-gold-500/40 rounded-[2rem] shadow-[0_50px_200px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
              >
                <div className="p-8 border-b border-gold-500/[0.14] flex justify-between items-center bg-gradient-to-r from-ledger-red/[0.08] to-transparent">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-parchment tracking-tight flex items-center gap-4">
                      <Shield className="w-8 h-8 text-ledger-red" /> Security Audit Trace
                    </h3>
                    <p className="font-mono text-[10px] text-parchment-ghost tracking-[0.3em] uppercase mt-1">
                      Analyzing {securityMetrics.threats.length} Active Anomalies
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => { setShowSecurityAudit(false); setActiveView('chat'); }}
                      className="px-6 py-2 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-600 font-mono text-[10px] font-medium uppercase tracking-[0.2em] hover:bg-gold-500 hover:text-ink-950 transition-all"
                    >
                      Enter Chat
                    </button>
                    <button
                      onClick={() => setShowSecurityAudit(false)}
                      className="p-3 rounded-xl bg-ink-900/5 border border-gold-500/15 text-parchment-faint hover:text-parchment transition-all"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  {securityMetrics.threats.map((threat) => (
                    <motion.div 
                      key={threat.id}
                      layoutId={threat.id}
                      className="p-8 rounded-[2.5rem] bg-ink-900/[0.02] border border-ink-900/5 hover:border-rose-500/20 transition-all group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-6">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${threat.riskInfo?.risk === 'HIGH_RISK' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                            <AlertTriangle className="w-8 h-8" />
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-ink-950 tracking-tight uppercase">{threat.description}</h4>
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest mt-2 inline-block ${threat.riskInfo?.risk === 'HIGH_RISK' ? 'bg-rose-500/20 border-rose-500/30 text-rose-600' : 'bg-amber-500/20 border-amber-500/30 text-amber-700'}`}>
                              {threat.riskInfo?.risk.replace('_', ' ')} Found
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Risk Score</p>
                          <p className={`text-3xl font-black ${threat.riskInfo?.risk === 'HIGH_RISK' ? 'text-rose-500' : 'text-amber-500'}`}>{threat.riskInfo?.score}%</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-4">
                            <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Fingerprint className="w-4 h-4 text-cyan-700" /> Traced Artifacts
                            </h5>
                            <div className="p-6 bg-ink-900/[0.03] border border-ink-900/5 rounded-3xl space-y-4">
                              <p className="text-sm font-medium text-parchment-dim italic">"{threat.riskInfo?.reasoning}"</p>
                              {threat.riskInfo?.details && threat.riskInfo.details.length > 0 && (
                                <div className="space-y-2 mt-4 border-t border-ink-900/5 pt-4">
                                    {threat.riskInfo.details.map((detail, idx) => (
                                      <div key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                        {detail}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Shield className="w-4 h-4 text-emerald-700" /> Counter-Measures
                            </h5>
                            <div className="p-6 bg-ink-900/[0.03] border border-ink-900/5 rounded-3xl space-y-3">
                              {threat.riskInfo?.advice.map((adv, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-xs text-emerald-300">
                                    <div className="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</div>
                                    {adv}
                                </div>
                              ))}
                            </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 pt-6 border-t border-ink-900/5">
                          {threat.riskInfo?.signals?.odd_timing && (
                            <div className="px-5 py-2.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                              <Activity className="w-3.5 h-3.5" /> Suspicious Timing
                            </div>
                          )}
                          {threat.riskInfo?.signals?.suspicious_context && (
                            <div className="px-5 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                              <AlertCircle className="w-3.5 h-3.5" /> High Risk Context
                            </div>
                          )}
                          {threat.riskInfo?.signals?.repetition_pattern && threat.riskInfo.signals.repetition_pattern !== 'none' && (
                            <div className="px-5 py-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                              <RefreshCw className="w-3.5 h-3.5" /> Repeat Pattern
                          </div>
                          )}
                          <div className="flex-1" />
                          <button 
                            onClick={() => handleDeleteExpense(threat.id)}
                            className="px-6 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                          >
                            Erase Trace
                          </button>
                      </div>
                    </motion.div>
                  ))}

                  {securityMetrics.threats.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-6 opacity-40">
                      <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-ink-950 uppercase tracking-tight">Perimeter Secure</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mt-2">No active threats detected in current financial flow.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-8 bg-ink-900/[0.03] border-t border-ink-900/10 font-mono text-[10px] text-parchment-ghost uppercase tracking-[0.4em] text-center">
                  ArthMitra Security Audit Protocol • End of Trace
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
