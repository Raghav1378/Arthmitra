"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, Sparkles, ArrowDown, UserCheck, Lock, Activity } from "lucide-react";

interface HeroSectionProps {
  onStartScan: () => void;
  onOpenContacts: () => void;
  contactsCount: number;
}

export function HeroSection({ onStartScan, onOpenContacts, contactsCount }: HeroSectionProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-vault-950 border border-white/[0.08] p-6 sm:p-10 md:p-12 mb-8 shadow-2xl">
      {/* ─── Ambient Sapphire Light Field & Grid ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-blue-600/15 via-accent-500/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03]" />
      </div>

      {/* ─── Animated Security Shield Rings & Laser Geometry ─── */}
      <div className="absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 sm:opacity-30 z-0">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full border border-dashed border-accent-400/40 animate-ring-slow" />
          {/* Middle Ring */}
          <div className="absolute inset-6 rounded-full border border-sky-400/30 animate-ring-reverse" />
          {/* Inner Ring */}
          <div className="absolute inset-12 rounded-full border border-emerald-400/20" />
          {/* Shield Core */}
          <Shield className="w-24 h-24 sm:w-32 sm:h-32 text-accent-400/50 stroke-[1.2]" />
          {/* Vertical Scanline Laser */}
          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-accent-400 to-transparent animate-scanline" />
        </div>
      </div>

      {/* ─── Floating Evidence Particles ─── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-8 left-1/4 w-1.5 h-1.5 rounded-full bg-accent-400 animate-float" style={{ animationDelay: "0s" }} />
        <div className="absolute top-1/3 left-3/4 w-2 h-2 rounded-full bg-sky-400 animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute bottom-12 left-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-float" style={{ animationDelay: "3s" }} />
      </div>

      {/* ─── Hero Content ─── */}
      <div className="relative z-10 max-w-2xl space-y-6">
        {/* Security Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/25 text-accent-400 text-xs font-mono font-medium shadow-sm backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500"></span>
          </span>
          <span className="uppercase tracking-widest text-[11px]">FINANCIAL SAFETY CHECKPOINT</span>
          <span className="text-white/20">|</span>
          <span className="text-parchment-faint text-[10px]">REAL-TIME PROTECTION ENGINE</span>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-2"
        >
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-display">
            Scam Shield
          </h1>
          <p className="text-lg sm:text-xl font-medium text-parchment-dim font-display">
            Your financial safety checkpoint.
          </p>
        </motion.div>

        {/* Quote Directive */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="p-4 sm:p-5 rounded-2xl bg-vault-900/80 border border-white/10 backdrop-blur-md space-y-1.5 shadow-xl"
        >
          <p className="text-xs font-mono uppercase tracking-widest text-accent-400 font-semibold">
            PRIMARY RULE OF PROTECTION:
          </p>
          <p className="text-sm sm:text-base font-semibold text-white tracking-wide italic">
            "Before you click. Before you pay. Before you share."
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center gap-3 pt-2"
        >
          <button
            onClick={onStartScan}
            className="px-6 py-3.5 rounded-2xl bg-accent-500 hover:bg-accent-400 active:scale-[0.98] text-ink-950 font-bold text-sm tracking-tight flex items-center gap-2.5 shadow-xl shadow-accent-500/25 transition-all group"
          >
            <Shield className="w-4.5 h-4.5 text-ink-950 group-hover:rotate-12 transition-transform" />
            <span>START SCAN</span>
            <ArrowDown className="w-4 h-4 text-ink-950 group-hover:translate-y-0.5 transition-transform" />
          </button>

          <button
            onClick={onOpenContacts}
            className="px-4 py-3.5 rounded-2xl border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-parchment-dim hover:text-white font-medium text-xs flex items-center gap-2 transition-all"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Trusted Contacts ({contactsCount})</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
