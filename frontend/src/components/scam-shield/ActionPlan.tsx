"use client";

import React from "react";
import { ShieldCheck, Ban, Eye, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface ActionPlanProps {
  risk: "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "LOW" | "HIGH";
  advice: string[];
}

export function ActionPlan({ risk, advice }: ActionPlanProps) {
  const isDanger = risk === "HIGH_RISK" || risk === "HIGH";
  const isCaution = risk === "SUSPICIOUS";

  const headerConfig = isDanger
    ? {
        title: "STOP — Do Not Proceed",
        color: "text-red-400",
        border: "border-red-500/30 bg-red-500/10",
        icon: <Ban className="w-5 h-5 text-red-400 shrink-0" />,
      }
    : isCaution
    ? {
        title: "Proceed With Extreme Caution",
        color: "text-amber-400",
        border: "border-amber-500/30 bg-amber-500/10",
        icon: <Eye className="w-5 h-5 text-amber-400 shrink-0" />,
      }
    : {
        title: "Safe Action Plan",
        color: "text-emerald-400",
        border: "border-emerald-500/30 bg-emerald-500/10",
        icon: <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />,
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="p-6 rounded-3xl bg-vault-900 border border-white/[0.08] shadow-2xl space-y-4"
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <h3 className="text-sm font-bold tracking-tight text-white font-display">
          Recommended Action Plan
        </h3>
        <span className="text-[10px] font-mono text-parchment-faint uppercase tracking-wider">
          Safety Protocol
        </span>
      </div>

      <div className={`p-4 rounded-2xl border ${headerConfig.border} flex items-center gap-3`}>
        {headerConfig.icon}
        <span className={`text-sm font-bold font-display ${headerConfig.color}`}>
          {headerConfig.title}
        </span>
      </div>

      <div className="space-y-2.5 pt-1">
        {advice.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-xl bg-vault-950 border border-white/[0.04] text-xs text-parchment-dim leading-relaxed"
          >
            <div className="w-5 h-5 rounded-lg bg-accent-500/10 border border-accent-500/20 text-accent-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </div>
            <span className="flex-1 text-parchment-dim">{item}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
