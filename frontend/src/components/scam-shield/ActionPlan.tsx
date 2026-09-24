import React from 'react';
import { ShieldCheck, Ban, Eye, Lock, Check } from 'lucide-react';

interface ActionPlanProps {
  risk: "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "LOW" | "HIGH";
  advice: string[];
}

export function ActionPlan({ risk, advice }: ActionPlanProps) {
  const isDanger = risk === "HIGH_RISK" || risk === "HIGH";
  const isCaution = risk === "SUSPICIOUS" || risk === "LOW";

  const icon = isDanger ? (
    <Ban className="w-5 h-5 text-red-500 shrink-0" />
  ) : isCaution ? (
    <Eye className="w-5 h-5 text-amber-500 shrink-0" />
  ) : (
    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
  );

  return (
    <div className="space-y-3">
      <h3 className="text-[13px] font-black tracking-tight text-ink-950 font-display">What to do next</h3>
      <div className={`rounded-2xl p-5 border ${isDanger ? 'bg-red-500/[0.03] border-red-500/20' : isCaution ? 'bg-amber-500/[0.03] border-amber-500/20' : 'bg-emerald-500/[0.03] border-emerald-500/20'}`}>
        <div className="flex gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-ink-950 flex items-center justify-center shrink-0 shadow-md shadow-ink-900/20">
            {icon}
          </div>
          <h4 className={`text-sm font-black tracking-tight font-display mt-1.5 ${isDanger ? 'text-red-600' : isCaution ? 'text-amber-700' : 'text-emerald-700'}`}>
            {isDanger ? 'STOP — Do not proceed' : isCaution ? 'Proceed with caution' : 'No major risk detected'}
          </h4>
        </div>
        <div className="pl-12 space-y-2">
          {advice.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-parchment-dim font-sans leading-snug">
              <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
