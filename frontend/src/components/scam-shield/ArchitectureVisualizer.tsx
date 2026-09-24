"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Cpu, ShieldCheck, Zap,
  Globe, IndianRupee, Brain, CheckCircle
} from "lucide-react";

interface NodeDetail {
  id: string;
  name: string;
  type: "input" | "process" | "ml" | "llm" | "policy" | "output";
  icon: React.ReactNode;
  description: string;
  technical: string;
}

const NODES: NodeDetail[] = [
  {
    id: "input",
    name: "User Input",
    type: "input",
    icon: <FileText className="w-4 h-4 text-sky-400" />,
    description: "Raw SMS text, URL, UPI VPA, screenshot image, or payment context.",
    technical: "Sanitized string or base64 image payload.",
  },
  {
    id: "rules",
    name: "Rule & Domain Engine",
    type: "process",
    icon: <Globe className="w-4 h-4 text-amber-400" />,
    description: "25+ heuristic rules, punycode check, burner TLDs, and OTP patterns.",
    technical: "Deterministic regex + threat lookup.",
  },
  {
    id: "behavior",
    name: "Behavior Engine",
    type: "process",
    icon: <IndianRupee className="w-4 h-4 text-emerald-400" />,
    description: "Transaction amount thresholds, ungodly timing, and repeat attempts.",
    technical: "Anomaly detection heuristics.",
  },
  {
    id: "ml",
    name: "Hybrid ML Model",
    type: "ml",
    icon: <Cpu className="w-4 h-4 text-purple-400" />,
    description: "TF-IDF vectorizer + XGBoost / Logistic classifier trained on synthetic & real scam data.",
    technical: "Probability score (0.0 to 1.0).",
  },
  {
    id: "llm",
    name: "Semantic LLM",
    type: "llm",
    icon: <Brain className="w-4 h-4 text-pink-400" />,
    description: "Optional Groq / Gemini semantic LLM analysis when signals are ambiguous.",
    technical: "Contextual indicator extraction.",
  },
  {
    id: "policy",
    name: "Policy Fusion",
    type: "policy",
    icon: <ShieldCheck className="w-4 h-4 text-accent-400" />,
    description: "Final decision authority. Fuses all signals with conservative safety weights & RBI guidelines.",
    technical: "Determines SAFE / SUSPICIOUS / HIGH_RISK.",
  },
];

export function ArchitectureVisualizer() {
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(NODES[4]);

  return (
    <section className="w-full py-8 px-2 sm:px-4" aria-label="Detection Architecture Diagram">
      <div className="p-6 sm:p-8 rounded-3xl bg-vault-900 border border-white/[0.08] shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-widest text-accent-400">
              <Zap className="w-4 h-4 text-accent-400" />
              <span>DETECTION PIPELINE VISUALIZATION</span>
            </div>
            <h3 className="text-xl font-bold text-white font-display mt-0.5">
              Hybrid Multi-Stage Engine Flow
            </h3>
          </div>
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 self-start sm:self-auto">
            Policy Engine is Final Authority
          </span>
        </div>

        {/* Pipeline Nodes Flow */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
          {NODES.map((node, index) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <motion.button
                key={node.id}
                onClick={() => setSelectedNode(node)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all relative overflow-hidden ${
                  isSelected
                    ? "bg-accent-500/15 border-accent-400 shadow-lg shadow-accent-500/10"
                    : "bg-vault-800/80 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10">
                    {node.icon}
                  </div>
                  <span className="text-[10px] font-mono text-parchment-faint">
                    0{index + 1}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">
                    {node.name}
                  </h4>
                  <p className="text-[10px] font-mono text-parchment-faint mt-1 truncate">
                    {node.type.toUpperCase()}
                  </p>
                </div>

                {/* Animated connecting pulse */}
                {index < NODES.length - 1 && (
                  <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <div className="w-4 h-0.5 bg-accent-400/40 animate-pulse" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Detail Inspector Card */}
        {selectedNode && (
          <motion.div
            key={selectedNode.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-vault-950 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white font-display text-sm">
                  {selectedNode.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-accent-400">
                  {selectedNode.type.toUpperCase()} STAGE
                </span>
              </div>
              <p className="text-parchment-dim leading-relaxed">
                {selectedNode.description}
              </p>
            </div>
            <div className="sm:text-right shrink-0 font-mono text-[11px] text-parchment-faint bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
              <span className="text-accent-400 block font-semibold">Technical Detail:</span>
              <span>{selectedNode.technical}</span>
            </div>
          </motion.div>
        )}

      </div>
    </section>
  );
}
