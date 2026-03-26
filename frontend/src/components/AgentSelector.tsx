"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Calculator, Shield, Brain, Zap } from 'lucide-react';

export interface Agent {
  id: string;
  name: string;
  model: string;
  provider: string;
  best_for: string;
  keywords: string[];
  icon: React.ReactNode;
}

const AGENTS: Agent[] = [
  {
    id: 'auditor',
    name: 'Auditor',
    model: 'deepseek-r1:7b',
    provider: 'Ollama (Local)',
    best_for: 'Math, calculations, reasoning, EMI, tax',
    keywords: ['tax', 'audit', 'math', 'spend', 'loan', 'emi', 'calculate'],
    icon: <Calculator className="w-5 h-5" />,
  },
  {
    id: 'shield',
    name: 'Shield',
    model: 'qwen2.5-coder:7b',
    provider: 'Ollama (Local)',
    best_for: 'Security analysis, fraud detection, UPI verification',
    keywords: ['scam', 'link', 'verify', 'upi', 'safe', 'url', 'phishing'],
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: 'mitra',
    name: 'Mitra',
    model: 'gemma3:latest',
    provider: 'Ollama (Local)',
    best_for: 'General chat, financial advice, explanations',
    keywords: ['(default)'],
    icon: <Brain className="w-5 h-5" />,
  },
  {
    id: 'groq',
    name: 'Groq',
    model: 'llama-3.1-8b-instant',
    provider: 'Groq (Cloud)',
    best_for: 'Quick responses, general questions',
    keywords: ['fast', 'quick', 'groq'],
    icon: <Zap className="w-5 h-5" />,
  },
];

interface AgentSelectorProps {
  selectedAgent: string | null;
  onAgentChange: (agentId: string | null) => void;
}

export default function AgentSelector({ selectedAgent, onAgentChange }: AgentSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-slate-400">
        Select Agent (Optional - Auto-routing enabled)
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {AGENTS.map((agent) => (
          <motion.button
            key={agent.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAgentChange(selectedAgent === agent.id ? null : agent.id)}
            className={`p-3 rounded-xl border transition-all ${
              selectedAgent === agent.id
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`p-2 rounded-lg ${
                selectedAgent === agent.id ? 'bg-cyan-500/30' : 'bg-slate-800'
              }`}>
                {agent.icon}
              </div>
              <span className="text-xs font-semibold">{agent.name}</span>
            </div>
          </motion.button>
        ))}
      </div>
      {selectedAgent && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-xs"
        >
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-semibold">Model:</span>
            <span className="text-slate-300">{AGENTS.find(a => a.id === selectedAgent)?.model}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 mt-1">
            <span className="font-semibold">Best for:</span>
            <span className="text-slate-300">{AGENTS.find(a => a.id === selectedAgent)?.best_for}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export { AGENTS };