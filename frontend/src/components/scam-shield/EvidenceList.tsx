"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EvidenceItem } from "./types";
import { ChevronDown, ChevronUp, AlertCircle, Terminal } from "lucide-react";

interface EvidenceListProps {
  evidence?: EvidenceItem[];
}

export function EvidenceList({ evidence = [] }: EvidenceListProps) {
  const [showAll, setShowAll] = useState(false);

  if (!evidence.length) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl border border-[#2DD4BF]/20 bg-[#2DD4BF]/5 text-xs text-[#2DD4BF]">
        <AlertCircle className="w-4 h-4 text-[#2DD4BF] shrink-0" />
        <span>No specific risk signals logged in current trace. Always maintain vigilance.</span>
      </div>
    );
  }

  const displayed = showAll ? evidence : evidence.slice(0, 5);

  const humanizeSource = (source: string) => {
    switch (source) {
      case "rule_engine":
        return "Rule Check";
      case "url_analyzer":
        return "URL Analysis";
      case "ml_classifier":
        return "Pattern Analysis";
      case "behavior_analyzer":
        return "Behavior Check";
      case "llm_analyzer":
        return "Semantic LLM";
      default:
        return source.replace(/_/g, " ");
    }
  };

  const getSeverityTag = (severity: number) => {
    if (severity > 0.7) {
      return { label: "HIGH", color: "text-[#FF4D5A] bg-[#FF4D5A]/10 border-[#FF4D5A]/30" };
    } else if (severity > 0.4) {
      return { label: "MEDIUM", color: "text-[#FB7185] bg-[#FB7185]/10 border-[#FB7185]/30" };
    }
    return { label: "WEAK", color: "text-[#2DD4BF] bg-[#2DD4BF]/10 border-[#2DD4BF]/30" };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F5F7FF]/10 pb-3">
        <div className="flex items-center gap-2 font-mono text-xs font-semibold text-[#4F6BFF] uppercase tracking-widest">
          <Terminal className="w-4 h-4 text-[#4F6BFF]" />
          <span>TRACED SIGNAL STACK</span>
        </div>
        <span className="font-mono text-[10px] px-2.5 py-0.5 rounded bg-[#0B1020] text-[#6C7A9C] border border-[#F5F7FF]/10">
          {evidence.length} SIGNALS LOGGED
        </span>
      </div>

      {/* Signal Stack Rows (Section 24) */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {displayed.map((item, idx) => {
            const tag = getSeverityTag(item.severity);
            const num = (idx + 1).toString().padStart(2, "0");

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                className="p-3.5 rounded-xl bg-[#0B1020] border border-[#F5F7FF]/08 hover:border-[#4F6BFF]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                {/* Left: Signal Number & Title */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="font-mono font-bold text-[#6C7A9C] text-xs shrink-0">
                    {num}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono font-semibold text-[#F5F7FF] uppercase tracking-wide truncate">
                      {item.signal.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-[10px] text-[#6C7A9C] uppercase">
                      {humanizeSource(item.source)}
                    </span>
                  </div>
                </div>

                {/* Right: Severity Badge & Explanation */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  {item.explanation && (
                    <span className="hidden md:inline text-[11px] text-[#AAB4D0] italic max-w-xs truncate">
                      "{item.explanation}"
                    </span>
                  )}
                  <span
                    className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded border uppercase tracking-wider ${tag.color}`}
                  >
                    {tag.label} ({Math.round(item.severity * 100)}%)
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {evidence.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#4F6BFF] hover:text-[#3B57E6] transition-colors pt-1 uppercase tracking-wider"
        >
          {showAll ? (
            <>
              Show Less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              View all {evidence.length} signals <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
