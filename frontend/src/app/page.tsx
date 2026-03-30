"use client";

import React, { useState } from 'react';
import { 
  Shield, Sparkles, PieChart, Activity, 
  Settings, HelpCircle, Info, Globe, 
  PanelLeftClose, PanelLeft, LayoutDashboard
} from 'lucide-react';
import Chat from '../components/Chat';
import ScamShield from '../components/ScamShield';
import Sidebar from '../components/Sidebar';
import ApiStatusIndicator from '../components/ApiStatusIndicator';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [activeView, setActiveView] = useState("chat");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <main className="h-screen bg-[#0a0e1a] text-white overflow-hidden flex relative">
      {/* Ambient background gradients (behind everything) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-violet-600/[0.07] blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.06] blur-[130px]" />
        <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full bg-fuchsia-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-[30%] left-[30%] w-[300px] h-[300px] rounded-full bg-emerald-500/[0.03] blur-[100px]" />
      </div>

      {/* ─── Sidebar Component ───────────────────────────────────── */}
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* ─── Main Viewport Area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 transition-all duration-500 ease-[0.4, 0, 0.2, 1]">
        
        {/* ─── Top Bar ────────────────────────────────────────────── */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/[0.06] bg-white/[0.01] backdrop-blur-xl shrink-0 z-20">
          <div className="flex items-center gap-6">
            {/* 🆕 Universal Toggle Button */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all text-slate-500 hover:text-white overflow-hidden"
              title={isSidebarOpen ? "Retract Sidebar" : "Show Sidebar"}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5 relative z-10" /> : <PanelLeft className="w-5 h-5 relative z-10 text-cyan-400" />}
            </button>

            <div className="flex flex-col font-display">
                <h1 className="text-[10px] font-black tracking-[0.25em] text-slate-500 uppercase leading-none mb-1 opacity-60">
                {activeView === 'chat' ? 'VIRTUAL ASSISTANT' : activeView.toUpperCase()}
                </h1>
                <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-3.5 h-3.5 text-cyan-500/70" />
                    <span className="text-sm font-black text-white tracking-tight">Command Center</span>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-4 font-display">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mr-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest leading-none">Mitra AI v3.0</span>
            </div>
            <ApiStatusIndicator />
            <div className="flex items-center gap-2 pr-2 border-r border-white/10 group cursor-pointer ml-2">
                <div className="text-right hidden sm:block">
                    <p className="text-[11px] font-black text-white leading-none uppercase">RAGHAV</p>
                    <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mt-1 opacity-80">PRO ACCOUNT</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[12px] font-black text-white shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform border border-white/20">
                R
                </div>
            </div>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all text-slate-500 hover:text-white border border-transparent hover:border-white/10">
                <Settings className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* ─── Flexible Viewport ──────────────────────────────────── */}
        <div className="flex-1 overflow-hidden relative p-4 lg:p-6 flex justify-center">
            <AnimatePresence mode="wait">
                {activeView === "chat" ? (
                    <motion.div 
                        key="chat-view"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="w-full max-w-7xl h-full flex flex-col shadow-2xl shadow-black/40 rounded-3xl overflow-hidden glass-strong border border-white/[0.05]"
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
                        className="w-full max-w-5xl h-full flex flex-col shadow-2xl shadow-black/40 rounded-3xl overflow-hidden glass-strong border border-white/[0.05]"
                    >
                        <ScamShield />
                    </motion.div>
                ) : (
                    <motion.div 
                        key="placeholder-view"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="w-full max-w-7xl h-full flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-3xl text-center space-y-6 font-display"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-violet-500/20 blur-3xl animate-pulse" />
                            <div className="w-24 h-24 rounded-3xl bg-white/[0.05] flex items-center justify-center relative z-10 border border-white/[0.1] shadow-2xl">
                                {activeView === 'expenses' && <PieChart className="w-12 h-12 text-emerald-400 opacity-60" />}
                                {activeView === 'analytics' && <Activity className="w-12 h-12 text-amber-400 opacity-60" />}
                            </div>
                        </div>
                        <div className="space-y-3 max-w-sm">
                            <h2 className="text-3xl font-black text-white uppercase tracking-[0.1em]">{activeView} module</h2>
                            <p className="text-sm text-slate-400 font-medium font-sans">This secure financial module is currently being finalized. Switch back to Mitra Chat for immediate assistance.</p>
                        </div>
                        <button 
                            onClick={() => setActiveView('chat')}
                            className="px-8 py-3 rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all active:scale-95 shadow-xl shadow-cyan-500/10"
                        >
                            Return to Chat
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* ─── Fixed Global Footer Overlay ─────────────────────── */}
        <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 px-8 py-2.5 flex items-center gap-8 rounded-full border border-white/[0.08] bg-black/50 backdrop-blur-3xl text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] z-30 shadow-2xl font-display">
            <div className="flex items-center gap-2 border-r border-white/10 pr-6">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span className="text-emerald-400">Secure Session</span>
            </div>
            <div className="flex items-center gap-2 border-r border-white/10 pr-6">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                <span>RAG v3.2-Stable</span>
            </div>
            <div className="flex items-center gap-3">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>India-West (Mumbai)</span>
            </div>
        </footer>
      </div>
    </main>
  );
}
