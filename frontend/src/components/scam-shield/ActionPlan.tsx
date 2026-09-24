"use client";

import React from "react";
import { ShieldCheck, Ban, Eye } from "lucide-react";
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
        title: "STOP — DO NOT PROCEED",
        color: "text-[#FF4D5A]",
        border: "border-[#FF4D5A]/30 bg-[#FF4D5A]/10",
        icon: <Ban className="w-5 h-5 text-[#FF4D5A] shrink-0" />,
      }
    : isCaution
    ? {
        title: "VERIFY BEFORE PROCEEDING",
        color: "text-[#FB7185]",
        border: "border-[#FB7185]/30 bg-[#FB7185]/10",
        icon: <Eye className="w-5 h-5 text-[#FB7185] shrink-0" />,
      }
    : {
        title: "SAFE PROTOCOL ACTION",
        color: "text-[#2DD4BF]",
        border: "border-[#2DD4BF]/30 bg-[#2DD4BF]/10",
        icon: <ShieldCheck className="w-5 h-5 text-[#2DD4BF] shrink-0" />,
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="p-6 rounded-3xl bg-[#111936] border border-[#F5F7FF]/10 shadow-2xl space-y-4"
    >
      <div className="flex items-center justify-between border-b border-[#F5F7FF]/10 pb-3">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-[#6C7A9C]">
          RECOMMENDED SAFETY ACTION
        </h3>
        <span className="font-mono text-[10px] text-[#AAB4D0] uppercase">
          DECISION PROTOCOL
        </span>
      </div>

      <div className={`p-4 rounded-xl border ${headerConfig.border} flex items-center gap-3 font-mono text-xs font-bold ${headerConfig.color}`}>
        {headerConfig.icon}
        <span>{headerConfig.title}</span>
      </div>

      <div className="space-y-2 pt-1">
        {advice.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0B1020] border border-[#F5F7FF]/06 text-xs text-[#AAB4D0] leading-relaxed font-sans"
          >
            <div className="w-5 h-5 rounded bg-[#4F6BFF]/10 border border-[#4F6BFF]/30 text-[#4F6BFF] font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              0{i + 1}
            </div>
            <span className="flex-1">{item}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
