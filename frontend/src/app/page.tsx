"use client";

import React, { useState } from 'react';
import {
  Shield, Brain, MessageSquare, TrendingUp, Zap, Lock, AlertCircle,
  CheckCircle2, ArrowRight, Sparkles, BarChart3, FileText, Code2,
  Search, PenTool, ListTodo, Compass, Settings, Users, Trophy,
  HelpCircle, Star, ChevronRight, Plus
} from 'lucide-react';
import Chat from '../components/Chat';
import ApiStatusIndicator from '../components/ApiStatusIndicator';
import { motion, AnimatePresence } from 'framer-motion';

const sidebarItems = [
  { icon: Compass, label: "Explore", active: false },
  { icon: Plus, label: "Create", active: false },
  { icon: Brain, label: "AI Agents", active: false },
  { icon: ListTodo, label: "Projects", active: false },
  { icon: Trophy, label: "Leaderboard", active: false },
  { icon: Users, label: "Community", active: false },
  { icon: Settings, label: "Settings", active: false },
  { icon: HelpCircle, label: "Support", active: false },
];

const quickActions = [
  { icon: MessageSquare, label: "Chat", color: "from-violet-500 to-purple-600", active: true },
  { icon: ListTodo, label: "Tasks", color: "from-amber-500 to-orange-600", active: false },
  { icon: PenTool, label: "Design", color: "from-emerald-500 to-teal-600", active: false },
  { icon: Code2, label: "Code", color: "from-rose-500 to-pink-600", active: false },
  { icon: Search, label: "Research", color: "from-cyan-500 to-blue-600", active: false },
  { icon: FileText, label: "Writing", color: "from-indigo-500 to-violet-600", active: false },
];

export default function Home() {
  const [activeView, setActiveView] = useState("chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <main className="h-screen bg-[#0a0e1a] text-white overflow-hidden flex">
      {/* Ambient background gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-violet-600/[0.07] blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.06] blur-[130px]" />
        <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full bg-fuchsia-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-[30%] left-[30%] w-[300px] h-[300px] rounded-full bg-emerald-500/[0.03] blur-[100px]" />
      </div>

      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative z-20 h-full flex flex-col border-r border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl overflow-hidden shrink-0"
      >
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-white/[0.06]">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="overflow-hidden"
              >
                <h1 className="text-base font-extrabold tracking-tight text-white">ArthMitra</h1>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">AI Guardian</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {sidebarItems.map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                ${item.active
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
            >
              <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${item.active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ))}
        </nav>

        {/* Sidebar collapse toggle */}
        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] transition-all border border-white/[0.04]"
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? '' : 'rotate-180'}`} />
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </motion.aside>

      {/* ─── Main Content ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06] bg-white/[0.01] backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Powered by Mitra AI v3.0</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ApiStatusIndicator />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[11px] font-extrabold text-white shadow-lg shadow-violet-500/20">
              R
            </div>
          </div>
        </header>

        {/* Content Area with scroll */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

            {/* Welcome Section with iridescent orb */}
            {activeView !== "chat" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-6 py-8"
              >
                {/* Iridescent Orb */}
                <div className="flex justify-center">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-300 to-cyan-400 opacity-60 blur-xl animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-400 to-cyan-400 shadow-2xl shadow-violet-500/30 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-white/80" />
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">Welcome to ArthMitra</h2>
                  <p className="text-base text-slate-400 mt-2">Your all-in-one AI Financial Assistant!</p>
                </div>
              </motion.div>
            )}

            {/* Quick Action Grid */}
            <div className="flex justify-center gap-3 flex-wrap">
              {quickActions.map((action, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveView(action.label.toLowerCase())}
                  className={`flex flex-col items-center gap-2.5 px-6 py-5 rounded-2xl border transition-all duration-300 min-w-[100px]
                    ${activeView === action.label.toLowerCase()
                      ? 'bg-white/[0.08] border-white/[0.15] shadow-lg shadow-white/[0.03]'
                      : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1]'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={`text-xs font-bold tracking-wide ${activeView === action.label.toLowerCase() ? 'text-white' : 'text-slate-500'}`}>
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Main Chat Interface */}
            <AnimatePresence mode="wait">
              {activeView === "chat" ? (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <Chat />
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl p-16 text-center space-y-6"
                >
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center">
                      {activeView === "tasks" && <ListTodo className="w-8 h-8 text-amber-400/50" />}
                      {activeView === "design" && <PenTool className="w-8 h-8 text-emerald-400/50" />}
                      {activeView === "code" && <Code2 className="w-8 h-8 text-rose-400/50" />}
                      {activeView === "research" && <Search className="w-8 h-8 text-cyan-400/50" />}
                      {activeView === "writing" && <FileText className="w-8 h-8 text-violet-400/50" />}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white capitalize">{activeView} Mode</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                      This feature is coming soon. Switch to <button onClick={() => setActiveView("chat")} className="text-cyan-400 font-bold hover:underline">Chat</button> to start talking with Mitra AI.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Stats Bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">120ms</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Latency</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">98.2%</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Safe Score</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Multi-Agent</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">RAG Engine</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
