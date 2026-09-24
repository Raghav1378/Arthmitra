import React, { useState } from 'react';
import { EvidenceItem } from './types';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface EvidenceListProps {
  evidence?: EvidenceItem[];
}

export function EvidenceList({ evidence = [] }: EvidenceListProps) {
  const [showAll, setShowAll] = useState(false);

  if (!evidence.length) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-ink-900/[0.05] bg-ink-900/[0.02] text-xs text-parchment-faint">
        <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>No specific risk signals detected. Always maintain caution.</span>
      </div>
    );
  }

  const displayed = showAll ? evidence : evidence.slice(0, 4);

  // Humanize sources
  const humanizeSource = (source: string) => {
    switch (source) {
      case 'rule_engine': return 'Rule check';
      case 'url_analyzer': return 'URL analysis';
      case 'ml_classifier': return 'Pattern analysis';
      case 'behavior_analyzer': return 'Behavioral analysis';
      case 'llm_analyzer': return 'Semantic analysis';
      default: return source.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black tracking-wide text-ink-950 font-display">Why this was flagged</h3>
        <span className="text-[10px] text-stone-600 uppercase tracking-widest font-mono">
          {evidence.length} signals
        </span>
      </div>

      <div className="space-y-2">
        {displayed.map((item, idx) => (
          <div key={idx} className="p-3.5 rounded-2xl bg-ink-900/[0.02] border border-ink-900/[0.05] flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-bold text-xs text-ink-950 tracking-tight font-sans truncate">
                {item.signal.replace(/_/g, ' ')}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-stone-600 font-display font-medium">
                {humanizeSource(item.source)}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="w-16 h-1 bg-ink-900/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.severity > 0.7 ? 'bg-red-500' : item.severity > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.round(item.severity * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-stone-600">
                {Math.round(item.severity * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {evidence.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-accent-600 hover:text-accent-500 transition-colors uppercase tracking-wider font-display pt-1"
        >
          {showAll ? (
            <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>View all {evidence.length} signals <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
}
