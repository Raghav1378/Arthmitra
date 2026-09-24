"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EvidenceItem } from "./types";
import { ChevronDown, ChevronUp, AlertCircle, ShieldAlert } from "lucide-react";

interface EvidenceListProps {
  evidence?: EvidenceItem[];
}

export function EvidenceList({ evidence = [] }: EvidenceListProps) {
  const [showAll, setShowAll] = useState(false);

  if (!evidence.length) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-300">
        <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>No specific high-risk scam signals detected. Always maintain financial vigilance.</span>
      </div>
    );
  }

  const displayed = showAll ? evidence : evidence.slice(0, 4);

  // Humanize sources
  const humanizeSource = (source: string) => {
    switch (source) {
      case "rule_engine":
        return "Rule check";
      case "url_analyzer":
        return "URL / Domain analysis";
      case "ml_classifier":
        return "Pattern classification";
      case "behavior_analyzer":
        return "Behavioral analysis";
      case "llm_analyzer":
        return "Semantic analysis";
      default:
        return source.replace(/_/g, " ");
    }
  };

  const getSeverityBadge = (severity: number) => {
    if (severity > 0.7) {
      return { label: "HIGH", color: "text-red-400 bg-red-500/10 border-red-500/20" };
    } else if (severity > 0.4) {
      return { label: "MEDIUM", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    return { label: "WEAK", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-accent-400" />
          <h3 className="text-sm font-bold tracking-tight text-white font-display">
            Why This Was Flagged
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.06] text-parchment-faint">
          {evidence.length} {evidence.length === 1 ? "Signal" : "Signals"} Detected
        </span>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {displayed.map((item, idx) => {
            const sevBadge = getSeverityBadge(item.severity);
            const severityPercent = Math.round(item.severity * 100);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="p-4 rounded-2xl bg-vault-950 border border-white/[0.08] hover:border-white/20 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <span className="font-semibold text-xs text-white capitalize block truncate">
                      {item.signal.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-parchment-faint block">
                      Source: {humanizeSource(item.source)}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${sevBadge.color}`}
                  >
                    {sevBadge.label} ({severityPercent}%)
                  </span>
                </div>

                {item.explanation && (
                  <p className="text-xs text-parchment-dim leading-relaxed pt-1 border-t border-white/[0.04]">
                    "{item.explanation}"
                  </p>
                )}

                {/* Progress bar */}
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.severity > 0.7
                        ? "bg-red-500"
                        : item.severity > 0.4
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${severityPercent}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {evidence.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent-400 hover:text-accent-300 transition-colors pt-1"
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
