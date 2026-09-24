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
  const config: Record<string, any> = {
    SAFE: {
      label: "SAFE",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
      glow: "shadow-emerald-500/20",
      badgeText: "LOW RISK DETECTED",
    },
    LOW: {
      label: "SAFE",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
      glow: "shadow-emerald-500/20",
      badgeText: "LOW RISK DETECTED",
    },
    SUSPICIOUS: {
      label: "SUSPICIOUS",
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30",
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      glow: "shadow-amber-500/20",
      badgeText: "EXERCISING CAUTION RECOMMENDED",
    },
    HIGH_RISK: {
      label: "HIGH RISK",
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/30",
      icon: <XCircle className="w-5 h-5 text-red-400" />,
      glow: "shadow-red-500/30",
      badgeText: "STRONG SCAM SIGNALS DETECTED",
    },
    HIGH: {
      label: "HIGH RISK",
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/30",
      icon: <XCircle className="w-5 h-5 text-red-400" />,
      glow: "shadow-red-500/30",
      badgeText: "STRONG SCAM SIGNALS DETECTED",
    },
  };

  const current = config[risk] || config.SUSPICIOUS;
  const safeConfidence = Math.min(100, Math.max(0, Math.round(confidence)));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6 p-6 sm:p-8 rounded-3xl bg-vault-900 border border-white/[0.08] shadow-2xl relative overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent-400" />
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-parchment-faint">
            VERDICT
          </span>
        </div>

        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${current.bg} ${current.glow} backdrop-blur-md`}
        >
          {current.icon}
          <span className={`text-xs font-bold font-mono tracking-wider ${current.color}`}>
            {current.label}
          </span>
        </div>
      </div>

      {/* Main Score & Gauge Layout */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
        <RiskGauge score={score} risk={risk} size={150} />

        <div className="flex-1 space-y-2 text-center sm:text-left">
          <span className="text-[11px] font-mono uppercase tracking-widest text-accent-400 font-semibold block">
            {current.badgeText}
          </span>
          <h3 className={`text-2xl font-black font-display tracking-tight ${current.color}`}>
            {current.label === "SAFE"
              ? "Clean Signal"
              : current.label === "SUSPICIOUS"
              ? "Exercise Caution"
              : "High Risk — Do Not Proceed"}
          </h3>
          <p className="text-xs text-parchment-dim leading-relaxed">
            {current.label === "SAFE"
              ? "No immediate high-risk scam patterns detected. Proceed with normal vigilance."
              : current.label === "SUSPICIOUS"
              ? "Components of this message or transaction contain unusual patterns. Verify caller identity."
              : "Strong indicators of financial fraud detected. Do not click links, send funds, or share OTPs."}
          </p>
        </div>
      </div>

      {/* Assessment Confidence Bar */}
      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
        <div className="flex justify-between items-center text-xs">
          <span className="font-mono text-parchment-faint uppercase text-[10px] tracking-wider font-semibold">
            ASSESSMENT CONFIDENCE
          </span>
          <span className="font-mono font-bold text-white text-xs">
            {safeConfidence}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={safeConfidence}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Confidence ${safeConfidence}%`}
          className="h-2 bg-vault-800 rounded-full overflow-hidden border border-white/[0.06]"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${safeConfidence}%` }}
            transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
            className={`h-full rounded-full bg-gradient-to-r ${
              risk === "SAFE" || risk === "LOW"
                ? "from-emerald-500 to-teal-400"
                : risk === "SUSPICIOUS"
                ? "from-amber-500 to-orange-400"
                : "from-red-600 to-rose-500"
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
}
