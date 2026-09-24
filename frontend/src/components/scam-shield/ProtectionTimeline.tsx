"use client";

import React from "react";
import { HistoryData, ScanRow } from "./types";
import { CheckCircle, AlertTriangle, XCircle, Trash2, Shield, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface ProtectionTimelineProps {
  data: HistoryData | null;
  onClear: () => void;
  onSelectScan?: (scan: ScanRow) => void;
}

export function ProtectionTimeline({ data, onClear, onSelectScan }: ProtectionTimelineProps) {
  if (!data || data.stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-vault-900 border border-white/[0.08] space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-parchment-faint">
          <Shield className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white font-display">No Protection Checks Recorded Yet</h4>
        <p className="text-xs text-parchment-faint max-w-sm leading-relaxed">
          Scans you perform will appear here as a safety timeline to help track suspicious activities.
        </p>
      </div>
    );
  }

  const { stats, scans } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 sm:p-8 rounded-3xl bg-vault-900 border border-white/[0.08] shadow-2xl space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <h3 className="text-base font-bold text-white font-display">
            Protection Timeline & Overview
          </h3>
          <p className="text-xs text-parchment-faint mt-0.5 font-mono">
            Summary of all analyzed security events
          </p>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-500/30 hover:border-red-500/50 bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all self-start sm:self-auto"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear History
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-vault-950 border border-white/[0.06] space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-parchment-faint block">
            TOTAL CHECKS
          </span>
          <span className="text-2xl font-bold font-mono text-white">
            {stats.total}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-vault-950 border border-emerald-500/20 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
            SAFE
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {stats.by_risk["SAFE"] || 0}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-vault-950 border border-amber-500/20 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block">
            SUSPICIOUS
          </span>
          <span className="text-2xl font-bold font-mono text-amber-400">
            {stats.by_risk["SUSPICIOUS"] || 0}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-vault-950 border border-red-500/20 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 block">
            HIGH RISK
          </span>
          <span className="text-2xl font-bold font-mono text-red-400">
            {stats.by_risk["HIGH_RISK"] || 0}
          </span>
        </div>
      </div>

      {/* Recent Scans List */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-accent-400">
          Recent Security Scans
        </h4>
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
          {scans.map((scan) => (
            <div
              key={scan.id}
              onClick={() => onSelectScan?.(scan)}
              className="p-4 rounded-2xl bg-vault-950 border border-white/[0.06] hover:border-white/20 transition-all flex items-center justify-between gap-4 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                {scan.risk === "SAFE" ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : scan.risk === "SUSPICIOUS" ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-white truncate">
                    {scan.message_text || "(No text content)"}
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-parchment-faint">
                    <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="capitalize">{scan.scam_type.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                    scan.risk === "SAFE"
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : scan.risk === "SUSPICIOUS"
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : "text-red-400 bg-red-500/10 border-red-500/20"
                  }`}
                >
                  {scan.risk_score} / 100
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
