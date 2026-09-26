"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, ArrowDown, UserCheck, Zap, Lock } from "lucide-react";
import { SignalField } from "./SignalField";

interface HeroSectionProps {
  onStartScan: () => void;
  onOpenContacts: () => void;
  contactsCount: number;
}

export function HeroSection({ onStartScan, onOpenContacts, contactsCount }: HeroSectionProps) {
  return (
    <div className="relative w-full min-w-0 rounded-3xl bg-[#0B1020] border border-[#F5F7FF]/10 p-4 sm:p-10 lg:p-12 mb-6 md:mb-8 shadow-2xl overflow-hidden">
      {/* ── Background Atmosphere Light ── */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#4F6BFF]/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#8B5CF6]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Asymmetric 60/40 Composition ── */}
      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center relative z-10">
        
        {/* ── Left Column: Editorial Composition (7 Cols) ── */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Step 1: System Tag */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111936] border border-[#4F6BFF]/30 text-[#4F6BFF] font-mono text-[11px] font-semibold tracking-widest uppercase"
          >
            <span className="w-2 h-2 rounded-full bg-[#4F6BFF] animate-pulse" />
            <span>SCAM SHIELD / FINANCIAL SAFETY ENGINE</span>
          </motion.div>

          {/* Step 2 & 3: Large Editorial Serif Composition */}
          <div className="space-y-3">
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[clamp(2.3rem,11vw,3.5rem)] sm:text-6xl font-normal font-serif tracking-tight text-[#F5F7FF] leading-[1.05]"
            >
              SCAM <span className="italic text-[#4F6BFF]">SHIELD</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-1 font-serif text-lg sm:text-2xl text-[#AAB4D0] leading-snug"
            >
              <p>Before you <span className="text-[#F5F7FF] font-medium underline decoration-[#4F6BFF]/40">click</span>.</p>
              <p>Before you <span className="text-[#F5F7FF] font-medium underline decoration-[#4F6BFF]/40">pay</span>.</p>
              <p>Before you <span className="text-[#F5F7FF] font-medium underline decoration-[#4F6BFF]/40">trust</span>.</p>
            </motion.div>
          </div>

          {/* Step 4: Clean Sans Explanation */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-xs sm:text-sm text-[#AAB4D0] leading-relaxed max-w-xl font-sans"
          >
            ArthMitra evaluates incoming SMS messages, links, UPI VPAs, payment requests, and transaction timing against deterministic heuristic rules, multi-layer ML, and official RBI safety directives.
          </motion.p>

          {/* Step 5: CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center gap-3 pt-2"
          >
            <button
              onClick={onStartScan}
              className="px-6 py-3.5 rounded-xl bg-[#4F6BFF] hover:bg-[#3B57E6] active:scale-[0.98] text-[#F5F7FF] font-bold text-sm tracking-tight flex items-center gap-2.5 shadow-xl shadow-[#4F6BFF]/25 transition-all group"
            >
              <Shield className="w-4.5 h-4.5 text-[#F5F7FF] group-hover:rotate-12 transition-transform" />
              <span>ANALYZE SOMETHING</span>
              <ArrowDown className="w-4 h-4 text-[#F5F7FF] group-hover:translate-y-0.5 transition-transform" />
            </button>

            <button
              onClick={onOpenContacts}
              className="px-4 py-3.5 rounded-xl border border-[#F5F7FF]/10 hover:border-[#F5F7FF]/20 bg-[#111936] text-[#AAB4D0] hover:text-[#F5F7FF] font-medium text-xs flex items-center gap-2 transition-all"
            >
              <UserCheck className="w-4 h-4 text-[#2DD4BF]" />
              <span>Trusted Contacts ({contactsCount})</span>
            </button>
          </motion.div>
        </div>

        {/* ── Right Column: Interactive Signal Field (5 Cols) ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-5"
        >
          <SignalField />
        </motion.div>

      </div>
    </div>
  );
}
