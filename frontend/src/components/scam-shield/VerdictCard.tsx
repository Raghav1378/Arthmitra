"use client";

import React from "react";
import { CheckCircle, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { RiskGauge } from "./RiskGauge";

interface VerdictProps {
  risk: "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "LOW" | "HIGH";
  score: number;
  confidence: number;
}

export function VerdictCard({ risk, score, confidence }: VerdictProps) {
  const isSafe = risk === "SAFE" || risk === "LOW";
  const isSuspicious = risk === "SUSPICIOUS";

  // Exact Semantic Color Rules (Section 2)
  const config = isSafe
    ? {
        label: "SAFE",
        headline: "Clean Signal — Low Risk",
        subtitle: "No high-risk scam patterns detected. Proceed with normal financial vigilance.",
        color: "text-[#35D0BA]",
        border: "border-[#35D0BA]/30 bg-[#35D0BA]/10",
        badge: "VERIFIED SAFE",
        icon: <CheckCircle className="w-5 h-5 text-[#35D0BA]" />,
        spectrumPos: Math.min(30, Math.max(5, score)),
      }
    : isSuspicious
    ? {
        label: "NEEDS REVIEW",
        headline: "Suspicious Pattern Found",
        subtitle: "Components of this input contain unusual markers. Verify caller identity before paying.",
        color: "text-[#F4B860]",
        border: "border-[#F4B860]/30 bg-[#F4B860]/10",
        badge: "VERIFY BEFORE PROCEEDING",
        icon: <AlertTriangle className="w-5 h-5 text-[#F4B860]" />,
        spectrumPos: Math.min(70, Math.max(35, score)),
      }
    : {
        label: "HIGH RISK",
        headline: "DO NOT PROCEED",
        subtitle: "Strong indicators of financial fraud detected. Do not click links, send funds, or share credentials.",
        color: "text-[#FF6B6B]",
        border: "border-[#FF6B6B]/30 bg-[#FF6B6B]/10",
        badge: "HIGH RISK THREAT DETECTED",
        icon: <XCircle className="w-5 h-5 text-[#FF6B6B]" />,
        spectrumPos: Math.min(100, Math.max(75, score)),
      };

  const safeConfidence = Math.min(100, Math.max(0, Math.round(confidence)));
  const safeScore = Math.min(100, Math.max(0, Math.round(score)));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="p-6 sm:p-7 rounded-[18px] bg-[#111A30] border border-[#263453] shadow-2xl space-y-6 relative overflow-hidden"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b border-[rgba(120,145,210,0.14)] pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#5B7CFF]" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#A8B4CC]">
            POLICY FUSION DECISION
          </span>
        </div>

        <div
          className={`flex items-center gap-2 px-3.5 py-1 rounded-full border ${config.border}`}
        >
          {config.icon}
          <span className={`font-mono text-xs font-bold tracking-wider ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Main Score & Measurement Readout */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        {/* Orbital Precision Gauge */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-5 rounded-[14px] bg-[#0D1426] border border-[#263453] relative">
          <RiskGauge score={score} risk={risk} size={140} />
        </div>

        {/* Verdict Statement */}
        <div className="sm:col-span-7 space-y-2 text-left">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#5B7CFF] font-semibold block">
            {config.badge}
          </span>
          <h3 className={`text-2xl font-serif font-bold tracking-tight ${config.color}`}>
            {config.headline}
          </h3>
          <p className="text-xs text-[#A8B4CC] leading-relaxed font-sans">
            {config.subtitle}
          </p>
        </div>
      </div>

      {/* Measurement Spectrum Bar */}
      <div className="space-y-2 pt-2 border-t border-[rgba(120,145,210,0.14)]">
        <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-[10px] text-[#A8B4CC] uppercase tracking-wider font-semibold">
            MEASUREMENT SPECTRUM
          </span>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-[#35D0BA]">SAFE</span>
            <span className="text-[#F4B860]">REVIEW</span>
            <span className="text-[#FF6B6B]">HIGH RISK</span>
          </div>
        </div>

        <div className="relative h-2.5 bg-[#080D1A] rounded-full overflow-hidden border border-[#263453]">
          {/* Spectrum gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#35D0BA]/40 via-[#F4B860]/40 to-[#FF6B6B]/50" />

          {/* Marker position */}
          <motion.div
            initial={{ left: "0%" }}
            animate={{ left: `${config.spectrumPos}%` }}
            transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
            className="absolute top-0 bottom-0 w-2.5 -ml-1.25 bg-[#F4F7FF] rounded-full shadow-lg border border-[#080D1A]"
          />
        </div>
      </div>

      {/* Assessment Confidence */}
      <div className="flex items-center justify-between text-xs font-mono pt-1 text-[#A8B4CC]">
        <span>SYSTEM CONFIDENCE:</span>
        <span className="text-[#F4F7FF] font-bold">{safeConfidence}%</span>
      </div>
    </motion.div>
  );
}
