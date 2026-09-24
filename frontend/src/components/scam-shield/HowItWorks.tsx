"use client";

import React from "react";
import { motion } from "framer-motion";
import { Filter, Search, GitMerge, ShieldCheck } from "lucide-react";

const STAGES = [
  {
    number: "01",
    title: "NORMALIZE",
    subtitle: "Input Sanitation & Signal Extraction",
    description:
      "Cleans incoming text/images, strips zero-width obfuscation, extracts domains, UPI VPAs, phone numbers, and transaction amounts.",
    icon: <Filter className="w-5 h-5 text-sky-400" />,
    borderColor: "border-sky-500/20 hover:border-sky-500/40",
    glowColor: "bg-sky-500/5",
  },
  {
    number: "02",
    title: "DETECT",
    subtitle: "Multi-Vector Signal Inspection",
    description:
      "Executes 25+ deterministic heuristic rules, punycode/spoof domain checks, behavioral timing checks, and TF-IDF ML classifiers.",
    icon: <Search className="w-5 h-5 text-amber-400" />,
    borderColor: "border-amber-500/20 hover:border-amber-500/40",
    glowColor: "bg-amber-500/5",
  },
  {
    number: "03",
    title: "CORRELATE",
    subtitle: "Semantic LLM & Context Fusion",
    description:
      "When signals are ambiguous, invokes semantic LLM analysis to evaluate social-engineering pretexts and extortion context.",
    icon: <GitMerge className="w-5 h-5 text-purple-400" />,
    borderColor: "border-purple-500/20 hover:border-purple-500/40",
    glowColor: "bg-purple-500/5",
  },
  {
    number: "04",
    title: "DECIDE",
    subtitle: "Policy Fusion & Action Formulation",
    description:
      "The Policy Engine acts as final authority—combining risk scores, confidence values, RBI guidelines, and actionable user advice.",
    icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
    glowColor: "bg-emerald-500/5",
  },
];

export function HowItWorks() {
  return (
    <section className="w-full py-10 px-2 sm:px-4" aria-label="How Scam Shield Works">
      <div className="space-y-6">
        
        {/* Header */}
        <div className="border-b border-white/[0.08] pb-4">
          <span className="text-xs font-mono uppercase tracking-widest text-accent-400 font-semibold block">
            HYBRID ARCHITECTURE
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white font-display mt-1">
            How Scam Shield Protects You
          </h2>
          <p className="text-xs text-parchment-faint mt-1 max-w-xl">
            A 4-stage pipeline that processes raw inputs into high-precision, policy-enforced safety verdicts.
          </p>
        </div>

        {/* 4 Stages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((stage, index) => (
            <motion.div
              key={stage.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`p-6 rounded-3xl bg-vault-900 border ${stage.borderColor} ${stage.glowColor} transition-all space-y-4 flex flex-col justify-between shadow-xl relative overflow-hidden group`}
            >
              {/* Top Row: Number & Icon */}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black font-mono text-white/30 group-hover:text-accent-400 transition-colors">
                  {stage.number}
                </span>
                <div className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10">
                  {stage.icon}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white tracking-tight font-display">
                  {stage.title}
                </h3>
                <p className="text-[11px] font-mono text-accent-400 font-medium">
                  {stage.subtitle}
                </p>
                <p className="text-xs text-parchment-dim leading-relaxed pt-1">
                  {stage.description}
                </p>
              </div>

              {/* Step indicator bar */}
              <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden pt-1">
                <div
                  className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full"
                  style={{ width: `${(index + 1) * 25}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
