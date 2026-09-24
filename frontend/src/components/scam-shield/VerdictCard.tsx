import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface VerdictProps {
  risk: "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "LOW" | "HIGH";
  score: number;
  confidence: number;
}

export function VerdictCard({ risk, score, confidence }: VerdictProps) {
  const config: Record<string, any> = {
    SAFE: { label: "SAFE", color: "text-emerald-700", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle className="w-5 h-5" />, glow: "shadow-emerald-500/20" },
    LOW: { label: "LOW RISK", color: "text-emerald-700", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle className="w-5 h-5" />, glow: "shadow-emerald-500/20" },
    SUSPICIOUS: { label: "SUSPICIOUS", color: "text-amber-700", bg: "bg-amber-500/10 border-amber-500/20", icon: <AlertTriangle className="w-5 h-5" />, glow: "shadow-amber-500/20" },
    HIGH_RISK: { label: "HIGH RISK", color: "text-red-600", bg: "bg-red-500/10 border-red-500/20", icon: <XCircle className="w-5 h-5" />, glow: "shadow-red-500/30" },
    HIGH: { label: "HIGH RISK", color: "text-red-600", bg: "bg-red-500/10 border-red-500/20", icon: <XCircle className="w-5 h-5" />, glow: "shadow-red-500/30" },
  };

  const current = config[risk] || config.SUSPICIOUS;
  const safe_score = Math.min(100, Math.max(0, score));

  return (
    <div className="flex flex-col gap-4 p-6 rounded-3xl bg-ink-900/[0.03] border border-ink-900/[0.06] shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Verdict</p>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${current.bg} ${current.glow}`}>
          <span className={current.color}>{current.icon}</span>
          <span className={`text-[11px] font-black tracking-widest font-display ${current.color}`}>{current.label}</span>
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="text-4xl font-black font-display text-ink-950">
          {safe_score}
          <span className="text-lg text-parchment-faint">/100</span>
        </div>
        <div className="text-[10px] font-black text-stone-600 uppercase tracking-widest font-display mb-1.5">Risk Score</div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-parchment-faint uppercase tracking-widest font-display">Assessment Confidence</span>
          <span className="text-sm font-black text-ink-950 font-display" aria-label={`Confidence ${confidence} percent`}>{confidence}%</span>
        </div>
        <div role="progressbar" aria-valuenow={confidence} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`Confidence ${confidence} percent`} className="h-1.5 bg-ink-900/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
            className={`h-full rounded-full bg-gradient-to-r ${risk === "SAFE" ? "from-emerald-500 to-teal-500" : risk === "SUSPICIOUS" ? "from-amber-500 to-orange-500" : "from-red-500 to-rose-500"}`}
          />
        </div>
      </div>
    </div>
  );
}
