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
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-[#111936] border border-[#F5F7FF]/10 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#0B1020] border border-[#F5F7FF]/10 flex items-center justify-center text-[#6C7A9C]">
          <Shield className="w-6 h-6" />
        </div>
        <h4 className="text-base font-serif text-[#F5F7FF]">No Security Events Logged</h4>
        <p className="text-xs text-[#AAB4D0] max-w-sm leading-relaxed font-sans">
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
      className="p-6 sm:p-8 rounded-3xl bg-[#111936] border border-[#F5F7FF]/10 shadow-2xl space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F5F7FF]/10 pb-4">
        <div>
          <h3 className="text-2xl font-serif text-[#F5F7FF]">
            Protection Timeline & Log
          </h3>
          <p className="text-xs text-[#AAB4D0] mt-0.5 font-mono">
            Summary of all analyzed security events
          </p>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#FF4D5A]/30 hover:border-[#FF4D5A]/50 bg-[#FF4D5A]/10 text-[#FF4D5A] text-xs font-semibold hover:bg-[#FF4D5A]/20 transition-all self-start sm:self-auto font-mono"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear History
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-4 rounded-xl bg-[#0B1020] border border-[#F5F7FF]/08 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-[#6C7A9C] block">
            TOTAL CHECKS
          </span>
          <span className="text-2xl font-bold text-[#F5F7FF]">
            {stats.total}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1020] border border-[#2DD4BF]/20 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-[#2DD4BF] block">
            SAFE
          </span>
          <span className="text-2xl font-bold text-[#2DD4BF]">
            {stats.by_risk["SAFE"] || 0}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1020] border border-[#FB7185]/20 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-[#FB7185] block">
            NEEDS REVIEW
          </span>
          <span className="text-2xl font-bold text-[#FB7185]">
            {stats.by_risk["SUSPICIOUS"] || 0}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1020] border border-[#FF4D5A]/20 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-[#FF4D5A] block">
            HIGH RISK
          </span>
          <span className="text-2xl font-bold text-[#FF4D5A]">
            {stats.by_risk["HIGH_RISK"] || 0}
          </span>
        </div>
      </div>

      {/* Recent Scans List */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#4F6BFF]">
          Recent Security Events
        </h4>
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
          {scans.map((scan) => (
            <div
              key={scan.id}
              onClick={() => onSelectScan?.(scan)}
              className="p-4 rounded-xl bg-[#0B1020] border border-[#F5F7FF]/08 hover:border-[#4F6BFF]/40 transition-all flex items-center justify-between gap-4 cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {scan.risk === "SAFE" ? (
                  <CheckCircle className="w-5 h-5 text-[#2DD4BF] shrink-0" />
                ) : scan.risk === "SUSPICIOUS" ? (
                  <AlertTriangle className="w-5 h-5 text-[#FB7185] shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-[#FF4D5A] shrink-0" />
                )}
                <div className="flex flex-col min-w-0 font-sans">
                  <span className="text-xs font-medium text-[#F5F7FF] truncate">
                    {scan.message_text || "(No text content)"}
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[#6C7A9C]">
                    <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="capitalize">{scan.scam_type.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                    scan.risk === "SAFE"
                      ? "text-[#2DD4BF] bg-[#2DD4BF]/10 border-[#2DD4BF]/20"
                      : scan.risk === "SUSPICIOUS"
                      ? "text-[#FB7185] bg-[#FB7185]/10 border-[#FB7185]/20"
                      : "text-[#FF4D5A] bg-[#FF4D5A]/10 border-[#FF4D5A]/20"
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
