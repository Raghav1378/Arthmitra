"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Cpu, ShieldCheck, Zap,
  Globe, IndianRupee, Brain, Terminal
} from "lucide-react";

interface NodeDetail {
  id: string;
  name: string;
  type: "INPUT" | "HEURISTIC" | "ML" | "SEMANTIC" | "POLICY";
  icon: React.ReactNode;
  status: string;
  technical: string;
  findings: string;
}

const NODES: NodeDetail[] = [
  {
    id: "input",
    name: "INPUT PARSER",
    type: "INPUT",
    icon: <FileText className="w-4 h-4 text-[#4F6BFF]" />,
    status: "COMPLETE",
    technical: "Sanitized text payload / OCR image buffer",
    findings: "Extracted URLs, VPAs, amounts & timestamp markers",
  },
  {
    id: "rules",
    name: "RULE ENGINE",
    type: "HEURISTIC",
    icon: <Globe className="w-4 h-4 text-[#FB7185]" />,
    status: "25 RULES ACTIVE",
    technical: "Deterministic regex pattern matcher & threat lists",
    findings: "Heuristic indicators & spoof checks evaluated",
  },
  {
    id: "behavior",
    name: "BEHAVIOR ENGINE",
    type: "HEURISTIC",
    icon: <IndianRupee className="w-4 h-4 text-[#2DD4BF]" />,
    status: "CHECKED",
    technical: "Frequency, transaction amount & odd timing analysis",
    findings: "Contextual anomaly parameters evaluated",
  },
  {
    id: "ml",
    name: "HYBRID ML ENGINE",
    type: "ML",
    icon: <Cpu className="w-4 h-4 text-[#8B5CF6]" />,
    status: "CLASSIFIED",
    technical: "TF-IDF vectorizer + XGBoost / Logistic classifier",
    findings: "Calculated ML probability vector",
  },
  {
    id: "llm",
    name: "SEMANTIC LLM",
    type: "SEMANTIC",
    icon: <Brain className="w-4 h-4 text-[#FB7185]" />,
    status: "OPTIONAL RUN",
    technical: "Groq / Gemini semantic LLM analysis",
    findings: "Social engineering pretext & extortion evaluation",
  },
  {
    id: "policy",
    name: "POLICY FUSION",
    type: "POLICY",
    icon: <ShieldCheck className="w-4 h-4 text-[#4F6BFF]" />,
    status: "FINAL AUTHORITY",
    technical: "Conservative policy fusion & RBI advisory map",
    findings: "Enforces final risk score, confidence & user advice",
  },
];

export function ArchitectureVisualizer() {
  const [selectedNode, setSelectedNode] = useState<NodeDetail>(NODES[5]);

  return (
    <section className="w-full py-8 px-2 sm:px-4" aria-label="Intelligence Console & Pipeline Status">
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111936] border border-[#F5F7FF]/10 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F5F7FF]/10 pb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#4F6BFF]">
              <Terminal className="w-4 h-4 text-[#4F6BFF]" />
              <span>DETECTION PIPELINE CONSOLE</span>
            </div>
            <h3 className="text-xl font-serif font-normal text-[#F5F7FF] mt-1">
              Intelligence Flow Console
            </h3>
          </div>
          <span className="font-mono text-[10px] px-3 py-1 rounded bg-[#0B1020] text-[#2DD4BF] border border-[#2DD4BF]/30 self-start sm:self-auto">
            POLICY ENGINE IS FINAL AUTHORITY
          </span>
        </div>

        {/* Signal Pipeline Flow Map (Section 27) */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
          {NODES.map((node, index) => {
            const isSelected = selectedNode.id === node.id;
            return (
              <motion.button
                key={node.id}
                onClick={() => setSelectedNode(node)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-32 transition-all relative ${
                  isSelected
                    ? "bg-[#182246] border-[#4F6BFF] shadow-lg shadow-[#4F6BFF]/15"
                    : "bg-[#0B1020] border-[#F5F7FF]/08 hover:border-[#F5F7FF]/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-[#111936] border border-[#F5F7FF]/10">
                    {node.icon}
                  </div>
                  <span className="font-mono text-[9px] text-[#6C7A9C]">
                    0{index + 1}
                  </span>
                </div>

                <div>
                  <h4 className="font-mono text-xs font-bold text-[#F5F7FF] leading-tight">
                    {node.name}
                  </h4>
                  <p className="font-mono text-[9px] text-[#4F6BFF] mt-1 font-semibold uppercase">
                    {node.status}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Console Inspector Surface (Section 26) */}
        <motion.div
          key={selectedNode.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-[#0B1020] border border-[#F5F7FF]/10 font-mono text-xs text-[#AAB4D0] space-y-3"
        >
          <div className="flex items-center justify-between border-b border-[#F5F7FF]/08 pb-2">
            <span className="text-[#F5F7FF] font-bold text-sm">
              [{selectedNode.name}] INSPECTOR
            </span>
            <span className="text-[10px] text-[#4F6BFF] uppercase">
              TYPE: {selectedNode.type}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <span className="text-[#6C7A9C] block text-[10px] uppercase font-semibold">TECHNICAL SPECIFICATION:</span>
              <span className="text-[#F5F7FF] font-sans text-xs mt-0.5 block">{selectedNode.technical}</span>
            </div>
            <div>
              <span className="text-[#6C7A9C] block text-[10px] uppercase font-semibold">OUTPUT / FINDINGS:</span>
              <span className="text-[#2DD4BF] font-sans text-xs mt-0.5 block">{selectedNode.findings}</span>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
