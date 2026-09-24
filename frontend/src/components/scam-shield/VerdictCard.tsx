"use client";

import React from "react";
import { CheckCircle, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface VerdictProps {
  risk: "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "LOW" | "HIGH";
  score: number;
  confidence: number;
}

export function VerdictCard({ risk, score, confidence }: VerdictProps) {
  const isSafe = risk === "SAFE" || risk === "LOW";
  const isSuspicious = risk === "SUSPICIOUS";

  const config = isSafe
    ? {
        label: "SAFE",
        headline: "Clean Signal — Low Risk",
        subtitle: "No high-risk scam patterns detected. Proceed with normal financial vigilance.",
        color: "text-[#2DD4BF]",
        bg: "bg-[#2DD4BF]/10 border-[#2DD4BF]/30",
        badge: "VERIFIED SAFE",
        icon: <CheckCircle className="w-5 h-5 text-[#2DD4BF]" />,
        spectrumPos: Math.min(30, Math.max(5, score)),
      }
    : isSuspicious
    ? {
        label: "NEEDS REVIEW",
        headline: "Suspicious Pattern Found",
        subtitle: "Components of this input contain unusual markers. Verify caller identity before paying.",
        color: "text-[#FB7185]",
        bg: "bg-[#FB7185]/10 border-[#FB7185]/30",
        badge: "VERIFY BEFORE PROCEEDING",
        icon: <AlertTriangle className="w-5 h-5 text-[#FB7185]" />,
        spectrumPos: Math.min(70, Math.max(35, score)),
      }
    : {
        label: "HIGH RISK",
        headline: "DO NOT PROCEED",
        subtitle: "Strong indicators of financial fraud detected. Do not click links, send funds, or share credentials.",
        color: "text-[#FF4D5A]",
        bg: "bg-[#FF4D5A]/10 border-[#FF4D5A]/30",
        badge: "HIGH RISK THREAT DETECTED",
        icon: <XCircle className="w-5 h-5 text-[#FF4D5A]" />,
        spectrumPos: Math.min(100, Math.max(75, score)),
      };

  const safeConfidence = Math.min(100, Math.max(0, Math.round(confidence)));
  const safeScore = Math.min(100, Math.max(0, Math.round(score)));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="p-6 sm:p-8 rounded-3xl bg-[#111936] border border-[#F5F7FF]/10 shadow-2xl space-y-6 relative overflow-hidden"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b border-[#F5F7FF]/10 pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#4F6BFF]" />
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#6C7A9C]">
            POLICY FUSION DECISION
          </span>
        </div>

        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${config.bg}`}>
          {config.icon}
          <span className={`font-mono text-xs font-bold tracking-wider ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Main Score & Measurement Readout */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        {/* Large Numeric Score with Thin Orbital Ring (Section 23) */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#0B1020] border border-[#F5F7FF]/10 relative">
          {/* Orbital Ring */}
          <div className="w-24 h-24 rounded-full border border-dashed border-[#4F6BFF]/30 flex items-center justify-center relative">
            <span className="text-4xl font-mono font-bold text-[#F5F7FF] tracking-tight">
              {safeScore}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#6C7A9C] mt-3">
            RISK MEASUREMENT / 100
          </span>
        </div>

        {/* Verdict Statement */}
        <div className="sm:col-span-7 space-y-2 text-left">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#4F6BFF] font-semibold block">
            {config.badge}
          </span>
          <h3 className={`text-2xl font-serif font-bold tracking-tight ${config.color}`}>
            {config.headline}
          </h3>
          <p className="text-xs text-[#AAB4D0] leading-relaxed font-sans">
            {config.subtitle}
          </p>
        </div>
      </div>

      {/* Measurement Spectrum Bar */}
      <div className="space-y-2 pt-2 border-t border-[#F5F7FF]/08">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-[10px] text-[#6C7A9C] uppercase tracking-wider font-semibold">
            MEASUREMENT SPECTRUM
          </span>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-[#2DD4BF]">SAFE</span>
            <span className="text-[#FB7185]">REVIEW</span>
            <span className="text-[#FF4D5A]">HIGH RISK</span>
          </div>
        </div>

        <div className="relative h-2.5 bg-[#0B1020] rounded-full overflow-hidden border border-[#F5F7FF]/10">
          {/* Spectrum gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#2DD4BF]/40 via-[#FB7185]/40 to-[#FF4D5A]/50" />

          {/* Marker position */}
          <motion.div
            initial={{ left: "0%" }}
            animate={{ left: `${config.spectrumPos}%` }}
            transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
            className="absolute top-0 bottom-0 w-2.5 -ml-1.25 bg-[#F5F7FF] rounded-full shadow-lg border border-[#0B1020]"
          />
        </div>
      </div>

      {/* Assessment Confidence */}
      <div className="flex items-center justify-between text-xs font-mono pt-1 text-[#6C7A9C]">
        <span>SYSTEM CONFIDENCE:</span>
        <span className="text-[#F5F7FF] font-bold">{safeConfidence}%</span>
      </div>
    </motion.div>
  );
}
