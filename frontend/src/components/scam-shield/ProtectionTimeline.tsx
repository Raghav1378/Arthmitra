import React from 'react';
import { HistoryData, ScanRow } from './types';
import { CheckCircle, AlertTriangle, XCircle, Trash2, Calendar, Shield } from 'lucide-react';

interface ProtectionTimelineProps {
  data: HistoryData | null;
  onClear: () => void;
  onSelectScan?: (scan: ScanRow) => void;
}

export function ProtectionTimeline({ data, onClear, onSelectScan }: ProtectionTimelineProps) {
  if (!data || data.stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-ink-900/[0.02] border border-ink-900/[0.05]">
        <Shield className="w-8 h-8 text-stone-600 mb-3" />
        <h4 className="text-sm font-bold text-ink-950 font-display">No checks recorded yet</h4>
        <p className="text-xs text-parchment-faint mt-1 max-w-sm">
          Scans you perform will appear here as a safety timeline to help track suspicious activities.
        </p>
      </div>
    );
  }

  const { stats, scans } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black tracking-wide text-ink-950 font-display uppercase">Protection Overview</h3>
          <p className="text-[10px] text-stone-600 uppercase tracking-widest font-mono mt-0.5">Summary of all security events</p>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-600 text-[10px] font-bold uppercase tracking-wider font-display hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Clear History
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.05]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-stone-600 font-display">Total Checks</span>
          <div className="text-2xl font-black font-display text-ink-950 mt-1">{stats.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.05]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 font-display">Low Risk</span>
          <div className="text-2xl font-black font-display text-emerald-700 mt-1">{stats.by_risk['SAFE'] || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.05]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-700 font-display">Needs Review</span>
          <div className="text-2xl font-black font-display text-amber-700 mt-1">{stats.by_risk['SUSPICIOUS'] || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.05]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-red-600 font-display">High Risk</span>
          <div className="text-2xl font-black font-display text-red-600 mt-1">{stats.by_risk['HIGH_RISK'] || 0}</div>
        </div>
      </div>

      <div className="space-y-2.5">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-600 font-display">Recent Checks</h4>
        <div className="space-y-2">
          {scans.map((scan) => (
            <div
              key={scan.id}
              onClick={() => onSelectScan?.(scan)}
              className="p-4 rounded-2xl bg-ink-900/[0.02] border border-ink-900/[0.05] flex items-center justify-between gap-4 cursor-pointer hover:bg-ink-900/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {scan.risk === 'SAFE' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : scan.risk === 'SUSPICIOUS' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-ink-950 truncate font-sans">
                    {scan.message_text || '(No text content)'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[9px] text-stone-600 uppercase tracking-wider font-mono">
                    <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{scan.scam_type.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-bold font-mono ${scan.risk === 'SAFE' ? 'text-emerald-700' : scan.risk === 'SUSPICIOUS' ? 'text-amber-700' : 'text-red-600'}`}>
                  {scan.risk_score}/100
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
