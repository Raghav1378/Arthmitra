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
      "Cleans raw SMS payloads, strips zero-width obfuscation, extracts domains, UPI VPAs, phone numbers, and transaction amounts.",
    icon: <Filter className="w-5 h-5 text-[#4F6BFF]" />,
    borderColor: "border-[#4F6BFF]/30",
    accentColor: "text-[#4F6BFF]",
  },
  {
    number: "02",
    title: "DETECT",
    subtitle: "Multi-Vector Signal Inspection",
    description:
      "Executes 25+ deterministic heuristic rules, punycode domain checks, behavioral timing checks, and TF-IDF ML classifiers.",
    icon: <Search className="w-5 h-5 text-[#FB7185]" />,
    borderColor: "border-[#FB7185]/30",
    accentColor: "text-[#FB7185]",
  },
  {
    number: "03",
    title: "CORRELATE",
    subtitle: "Semantic LLM & Context Fusion",
    description:
      "When signals are ambiguous, invokes semantic LLM analysis to evaluate social-engineering pretexts and extortion context.",
    icon: <GitMerge className="w-5 h-5 text-[#8B5CF6]" />,
    borderColor: "border-[#8B5CF6]/30",
    accentColor: "text-[#8B5CF6]",
  },
  {
    number: "04",
    title: "DECIDE",
    subtitle: "Policy Fusion & Action Formulation",
    description:
      "The Policy Engine acts as final authority—combining risk scores, confidence values, RBI guidelines, and actionable user advice.",
    icon: <ShieldCheck className="w-5 h-5 text-[#2DD4BF]" />,
    borderColor: "border-[#2DD4BF]/30",
    accentColor: "text-[#2DD4BF]",
  },
];

export function HowItWorks() {
  return (
    <section className="w-full py-10 px-2 sm:px-4" aria-label="Detection Pipeline Architecture">
      <div className="space-y-8">
        
        {/* Editorial Section Header */}
        <div className="border-b border-[#F5F7FF]/10 pb-4">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#4F6BFF] block">
            THE SAFETY PIPELINE
          </span>
          <h2 className="text-3xl font-serif font-normal text-[#F5F7FF] mt-1">
            How Scam Shield Decides
          </h2>
          <p className="text-xs text-[#AAB4D0] mt-1 max-w-xl font-sans">
            A deterministic 4-stage pipeline that transforms raw inputs into policy-enforced financial safety verdicts.
          </p>
        </div>

        {/* Asymmetric Stage Composition (Section 28) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STAGES.map((stage, index) => (
            <motion.div
              key={stage.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
              className={`p-6 rounded-2xl bg-[#111936] border ${stage.borderColor} flex flex-col justify-between h-[280px] shadow-2xl relative overflow-hidden group hover:border-[#4F6BFF]/60 transition-all`}
            >
              {/* Top Row: Oversized Number & Stage Icon */}
              <div className="flex items-start justify-between">
                <span className="font-serif text-5xl font-normal text-[#6C7A9C]/30 group-hover:text-[#F5F7FF] transition-colors leading-none">
                  {stage.number}
                </span>
                <div className="p-2.5 rounded-xl bg-[#0B1020] border border-[#F5F7FF]/10">
                  {stage.icon}
                </div>
              </div>

              {/* Stage Description */}
              <div className="space-y-1.5 pt-4">
                <h3 className="text-lg font-serif font-bold text-[#F5F7FF] tracking-tight">
                  {stage.title}
                </h3>
                <p className={`font-mono text-[10px] font-semibold ${stage.accentColor} uppercase tracking-wider`}>
                  {stage.subtitle}
                </p>
                <p className="text-xs text-[#AAB4D0] leading-relaxed pt-1 font-sans">
                  {stage.description}
                </p>
              </div>

              {/* Directional Progress bar */}
              <div className="w-full h-1 rounded-full bg-[#0B1020] overflow-hidden">
                <div
                  className="h-full bg-[#4F6BFF] rounded-full"
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
