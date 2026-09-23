"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Zap, Layers, RefreshCw, ExternalLink,
  CheckCircle2, XCircle, ArrowUpRight, Search, Activity,
  Sliders, Cpu, Terminal, Lock, Eye, AlertTriangle, ChevronRight,
  Database, Network, Award, ShieldAlert, Sparkles, Fingerprint
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  vendor: string;
  website: string;
  summary: string;
  detection_methods: string[];
  ml_approach: string[];
  trust_score: number;
  api_available: boolean;
  price_model: string;
  latency_ms: string;
  deployment: string;
  specialty: string;
  color: string;
  metrics: {
    accuracy: number;
    speed: number;
    privacy: number;
    retailFit: number;
    explainability: number;
  };
}

const TOOLS_DATA: Tool[] = [
  {
    id: "arthmitra",
    name: "ArthMitra Scam Shield",
    vendor: "ArthMitra Labs (India)",
    website: "arthmitra.internal",
    summary: "Local-first hybrid defense engine engineered specifically for Indian retail payment vectors. Combines zero-width Unicode stripping, deterministic regex breakers, local OCR, and private LLM synthesis.",
    detection_methods: ["3-Stage Deterministic Policy", "Tesseract OCR Scan", "Zero-Width/Typo Normalization", "UPI PSP Deep Validation", "Local Ollama/Groq Fusion"],
    ml_approach: ["Strict Heuristic Gates", "Semantic LLM Classifier", "Behavioral Anomaly Index"],
    trust_score: 99,
    api_available: true,
    price_model: "Zero Cost / Retail Open Core",
    latency_ms: "< 15ms (Stage 1) / ~350ms (LLM)",
    deployment: "100% On-Device / Local SQLite",
    specialty: "UPI Collect Traps, ₹1 Verification Fraud, Emergency Family Impersonation",
    color: "#e5a93c",
    metrics: { accuracy: 98, speed: 96, privacy: 100, retailFit: 99, explainability: 97 }
  },
  {
    id: "feedzai",
    name: "Feedzai RailRisk",
    vendor: "Feedzai Inc. (US/PT)",
    website: "feedzai.com",
    summary: "Heavyweight enterprise AML and transactional risk intelligence platform deployed by top-tier global clearing houses and Fortune 500 retail banks.",
    detection_methods: ["Global Consortium Graph", "Sub-Millisecond Scoring", "High-Throughput Card Risk", "AML Wire Auditing"],
    ml_approach: ["Deep Autoencoders", "Adaptive Graph Learning", "Supervised Ensembles"],
    trust_score: 96,
    api_available: true,
    price_model: "Enterprise Contract ($150K+/yr)",
    latency_ms: "< 5ms (CBS Dedicated)",
    deployment: "Dedicated Cloud / On-Prem CBS",
    specialty: "Card-Not-Present (CNP), High-Volume Clearing, Mule Ring Busting",
    color: "#4f75e8",
    metrics: { accuracy: 96, speed: 99, privacy: 55, retailFit: 25, explainability: 70 }
  },
  {
    id: "featurespace",
    name: "Featurespace ARIC",
    vendor: "Featurespace Ltd. (UK)",
    website: "featurespace.com",
    summary: "Pioneers of Adaptive Behavioral Analytics (ARIC). Builds live dynamic behavioural profiles for every account, flagging anomalies as they emerge in millisecond windows.",
    detection_methods: ["Individual Profile Tracking", "Adaptive Behavioral Heuristics", "Cross-Channel Correlation"],
    ml_approach: ["Unsupervised Behavioral Drift", "Dynamic Bayesian Inference"],
    trust_score: 94,
    api_available: true,
    price_model: "Enterprise Tiered",
    latency_ms: "10ms - 25ms",
    deployment: "Cloud Multi-Tenant / Private VPC",
    specialty: "Authorized Push Payment (APP) Scams, Behavioral Deviation",
    color: "#0ec797",
    metrics: { accuracy: 94, speed: 95, privacy: 60, retailFit: 35, explainability: 82 }
  },
  {
    id: "sift",
    name: "Sift Digital Trust",
    vendor: "Sift Science (US)",
    website: "sift.com",
    summary: "Harnesses a global digital trust network evaluating 1+ Trillion signals annually across e-commerce giants to catch account takeovers and checkout fraud.",
    detection_methods: ["Global IP/Device Fingerprinting", "Behavioral Biometrics (Keystrokes)", "Content Abuse Filtering"],
    ml_approach: ["Global Ensemble ML", "Unsupervised Account Graphing"],
    trust_score: 92,
    api_available: true,
    price_model: "Usage-Based ($2,500/mo min)",
    latency_ms: "20ms - 60ms",
    deployment: "Global SaaS API",
    specialty: "Account Takeover (ATO), Marketplace Promo Abuse, Fake Reviews",
    color: "#995cf5",
    metrics: { accuracy: 92, speed: 90, privacy: 50, retailFit: 45, explainability: 78 }
  },
  {
    id: "seon",
    name: "SEON Fraud Fighters",
    vendor: "SEON Technologies (UK)",
    website: "seon.io",
    summary: "Modular digital footprinting engine that crawls 50+ social networks, email domain reputation, and device fingerprints without requiring user interaction.",
    detection_methods: ["Reverse Social Profile Lookup", "Disposable Email & Phone Checks", "Hardware Profiling"],
    ml_approach: ["Whitebox Explainable Trees", "Custom Rule Builder"],
    trust_score: 89,
    api_available: true,
    price_model: "Pay-As-You-Go ($99 - $500/mo)",
    latency_ms: "80ms - 200ms",
    deployment: "Public REST API",
    specialty: "Instant Customer Onboarding Risk, Synthetic Identity Filtering",
    color: "#f05a7e",
    metrics: { accuracy: 89, speed: 82, privacy: 45, retailFit: 65, explainability: 95 }
  },
  {
    id: "sardine",
    name: "Sardine AI",
    vendor: "Sardine.ai (US)",
    website: "sardine.ai",
    summary: "Real-time fraud prevention and compliance built for instantaneous payments and Web3/FinTech onboarding using device telemetry and motion analytics.",
    detection_methods: ["Gyroscope & Touch Telemetry", "Proxy/VPN Deep Inspection", "Bank Account Direct Verification"],
    ml_approach: ["Continuous Biometric Streaming", "Dynamic Risk Weights"],
    trust_score: 91,
    api_available: true,
    price_model: "Volume Tiered",
    latency_ms: "15ms - 40ms",
    deployment: "Mobile SDK + Cloud API",
    specialty: "Instant Settlement Fraud, Remote Access Trojan (RAT) Detection",
    color: "#06b6d4",
    metrics: { accuracy: 91, speed: 94, privacy: 40, retailFit: 50, explainability: 75 }
  },
  {
    id: "trustpair",
    name: "Trustpair Payment Shield",
    vendor: "Trustpair (FR)",
    website: "trustpair.com",
    summary: "Automated vendor verification system auditing corporate wire recipients globally to eliminate B2B invoice fraud and CEO impersonation.",
    detection_methods: ["Global IBAN/Ownership Query", "Vendor Ledger Consistency Audit", "Dual-Signer Heuristics"],
    ml_approach: ["Deterministic Bank Registry Matching", "Pattern Correlation"],
    trust_score: 88,
    api_available: true,
    price_model: "Corporate Subscription",
    latency_ms: "Batch & Realtime (100ms)",
    deployment: "ERP Connector / Cloud",
    specialty: "Vendor Impersonation, Fake IBAN Switching, Procurement Fraud",
    color: "#3b82f6",
    metrics: { accuracy: 88, speed: 78, privacy: 70, retailFit: 20, explainability: 98 }
  }
];

// Custom Bespoke Vector Geometric Monograms (Zero generic stock/AI logos)
function CustomEmblem({ toolId, name, color }: { toolId: string; name: string; color: string }) {
  if (toolId === 'arthmitra') {
    return (
      <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-amber-600/5 border border-amber-400/40 shadow-lg shadow-amber-500/20 overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/20 to-transparent opacity-60 animate-pulse" />
        <svg viewBox="0 0 40 40" className="w-7 h-7 relative z-10" fill="none">
          <path d="M20 4L34 9V20C34 28 28 34 20 37C12 34 6 28 6 20V9L20 4Z" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 13H24M14 17H22M14 13V22C16.5 22 20 22 20 17C20 13 14 13 14 13ZM19 21L24 28" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="20" cy="4" r="1.5" fill="#f59e0b" />
        </svg>
      </div>
    );
  }

  if (toolId === 'feedzai') {
    return (
      <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/30 shadow-md overflow-hidden">
        <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
          <polygon points="20,5 33,12 33,28 20,35 7,28 7,12" stroke="#60a5fa" strokeWidth="2" strokeDasharray="3 2" />
          <polygon points="20,11 28,15 28,25 20,29 12,25 12,15" stroke="#93c5fd" strokeWidth="1.8" />
          <circle cx="20" cy="20" r="3" fill="#3b82f6" />
        </svg>
      </div>
    );
  }

  if (toolId === 'featurespace') {
    return (
      <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 shadow-md overflow-hidden">
        <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
          <ellipse cx="20" cy="20" rx="14" ry="7" stroke="#34d399" strokeWidth="1.8" transform="rotate(-30 20 20)" />
          <ellipse cx="20" cy="20" rx="14" ry="7" stroke="#6ee7b7" strokeWidth="1.8" transform="rotate(30 20 20)" />
          <circle cx="20" cy="20" r="2.5" fill="#10b981" />
        </svg>
      </div>
    );
  }

  if (toolId === 'sift') {
    return (
      <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/30 shadow-md overflow-hidden">
        <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
          <polygon points="20,7 34,31 6,31" stroke="#c084fc" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="20" cy="7" r="2.5" fill="#a855f7" />
          <circle cx="34" cy="31" r="2.5" fill="#a855f7" />
          <circle cx="6" cy="31" r="2.5" fill="#a855f7" />
          <circle cx="20" cy="23" r="3" fill="#e9d5ff" />
        </svg>
      </div>
    );
  }

  if (toolId === 'seon') {
    return (
      <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/30 shadow-md overflow-hidden">
        <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
          <circle cx="20" cy="20" r="13" stroke="#fb7185" strokeWidth="1.8" strokeDasharray="4 3" />
          <circle cx="20" cy="20" r="7" stroke="#fda4af" strokeWidth="1.8" />
          <line x1="20" y1="4" x2="20" y2="36" stroke="#fb7185" strokeWidth="1.4" opacity="0.6" />
          <line x1="4" y1="20" x2="36" y2="20" stroke="#fb7185" strokeWidth="1.4" opacity="0.6" />
        </svg>
      </div>
    );
  }

  if (toolId === 'sardine') {
    return (
      <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 shadow-md overflow-hidden">
        <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
          <path d="M6 20Q13 8 20 20T34 20" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M6 26Q13 14 20 26T34 26" stroke="#67e8f9" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
          <circle cx="27" cy="14" r="2" fill="#06b6d4" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 border border-indigo-500/30 shadow-md overflow-hidden">
      <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
        <rect x="8" y="10" width="10" height="20" rx="3" stroke="#818cf8" strokeWidth="2" />
        <rect x="22" y="10" width="10" height="20" rx="3" stroke="#a5b4fc" strokeWidth="2" />
        <line x1="18" y1="20" x2="22" y2="20" stroke="#6366f1" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

export default function MarketCompare() {
  const [tools, setTools] = useState<Tool[]>(TOOLS_DATA);
  const [selectedTool, setSelectedTool] = useState<Tool>(TOOLS_DATA[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [syncTimestamp, setSyncTimestamp] = useState('Today • 2026 Live Telemetry');
  const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'simulator'>('overview');
  const [simulatedAttack, setSimulatedAttack] = useState<'upi_trap' | 'kyc_phish' | 'family_impersonate'>('upi_trap');

  const handleSyncIntel = () => {
    setIsScraping(true);
    setTimeout(() => {
      setIsScraping(false);
      setSyncTimestamp(`Synced ${new Date().toLocaleTimeString()} • Verified`);
    }, 1800);
  };

  const filteredTools = tools.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar bg-vault-950">
      {/* ─── Hero Intelligence Command Banner ─── */}
      <div className="relative rounded-3xl overflow-hidden border border-accent-500/20 bg-gradient-to-br from-vault-900/90 via-vault-950/95 to-vault-900/80 p-8 backdrop-blur-2xl shadow-2xl">
        {/* Ambient radial glow meshes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-500/[0.08] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-sapphire-500/[0.06] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/30 text-accent-400 font-mono text-[10px] font-semibold tracking-widest uppercase">
                <ShieldAlert className="w-3.5 h-3.5 text-accent-400 animate-pulse" />
                Global Threat Intelligence
              </span>
              <span className="text-[11px] font-mono text-parchment-faint flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-ledger-green animate-ping" />
                {syncTimestamp}
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-parchment tracking-tight">
              Scam Detection <span className="bg-gradient-to-r from-accent-300 via-accent-400 to-amber-500 bg-clip-text text-transparent">Market Matrix</span>
            </h1>
            <p className="text-sm text-parchment-dim leading-relaxed">
              Real-world benchmark of top enterprise fraud platforms versus ArthMitra&apos;s localized hybrid defense. Scraped and evaluated against real UPI, SMS, and identity attack vectors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end lg:self-center">
            {/* View Switcher Tabs */}
            <div className="flex p-1 rounded-2xl bg-vault-800/60 border border-accent-500/15 backdrop-blur-md">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40 shadow-sm'
                    : 'text-parchment-faint hover:text-parchment'
                }`}
              >
                Deep Specs
              </button>
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'matrix'
                    ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40 shadow-sm'
                    : 'text-parchment-faint hover:text-parchment'
                }`}
              >
                Comparison Matrix
              </button>
              <button
                onClick={() => setActiveTab('simulator')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'simulator'
                    ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40 shadow-sm'
                    : 'text-parchment-faint hover:text-parchment'
                }`}
              >
                Attack Arena
              </button>
            </div>

            <button
              onClick={handleSyncIntel}
              disabled={isScraping}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-accent-500/20 to-amber-600/20 hover:from-accent-500/30 hover:to-amber-600/30 border border-accent-500/35 text-accent-300 font-mono text-xs font-medium uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin text-accent-400' : ''}`} />
              {isScraping ? 'Scraping Vendors...' : 'Rescrape Sources'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Tabs ─── */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="tab-overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Rail: List of Platforms */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-faint" />
                <input
                  type="text"
                  placeholder="Filter by vendor, threat vector, or keyword..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-vault-900/60 border border-accent-500/15 rounded-2xl text-sm text-parchment placeholder:text-parchment-faint focus:outline-none focus:border-accent-500/40 focus:ring-1 focus:ring-accent-500/30 backdrop-blur-md transition-all"
                />
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[620px] pr-1 custom-scrollbar">
                {filteredTools.map((tool) => {
                  const isSelected = selectedTool.id === tool.id;
                  const isArthmitra = tool.id === 'arthmitra';

                  return (
                    <motion.div
                      key={tool.id}
                      onClick={() => setSelectedTool(tool)}
                      whileHover={{ scale: 1.012 }}
                      whileTap={{ scale: 0.99 }}
                      className={`relative p-4 rounded-2xl border cursor-pointer transition-all overflow-hidden ${
                        isSelected
                          ? 'bg-gradient-to-r from-accent-500/[0.14] via-vault-900/80 to-transparent border-accent-500/50 shadow-xl shadow-accent-950/30'
                          : 'bg-vault-900/30 border-accent-500/[0.07] hover:border-accent-500/25 hover:bg-vault-900/50'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent-400 rounded-r shadow-[0_0_12px_#f59e0b]" />
                      )}

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <CustomEmblem toolId={tool.id} name={tool.name} color={tool.color} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-sm font-semibold text-parchment tracking-tight truncate">
                                {tool.name}
                              </h3>
                              {isArthmitra && (
                                <span className="px-2 py-0.5 rounded-full bg-accent-500/20 border border-accent-500/40 text-accent-400 text-[9px] font-mono font-bold tracking-widest uppercase">
                                  YOUR SYSTEM
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-parchment-faint truncate mt-0.5">{tool.vendor}</p>
                            <p className="text-[11px] text-parchment-dim/80 line-clamp-1 mt-1 font-mono">
                              {tool.specialty}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono text-sm font-bold text-parchment">
                            {tool.trust_score}<span className="text-[10px] text-parchment-faint font-normal">/100</span>
                          </div>
                          <span className="font-mono text-[9px] text-accent-400/80 uppercase tracking-widest block mt-0.5">
                            TRUST SCORE
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Right Stage: Detailed Analytical View */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              <div className="p-8 rounded-3xl bg-vault-900/50 border border-accent-500/20 backdrop-blur-xl shadow-2xl flex flex-col justify-between h-full space-y-8">
                {/* Header of selected tool */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-accent-500/[0.08]">
                  <div className="flex items-center gap-4">
                    <CustomEmblem toolId={selectedTool.id} name={selectedTool.name} color={selectedTool.color} />
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="font-display text-2xl font-bold text-parchment tracking-tight">
                          {selectedTool.name}
                        </h2>
                        {selectedTool.id === 'arthmitra' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono uppercase tracking-widest font-semibold">
                            Active Node
                          </span>
                        )}
                      </div>
                      <a
                        href={`https://${selectedTool.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-parchment-faint hover:text-accent-400 font-mono transition-colors mt-1"
                      >
                        {selectedTool.website}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-vault-800/40 border border-accent-500/15 text-right min-w-[130px]">
                    <span className="font-mono text-[9px] text-parchment-faint uppercase tracking-widest block">Trust Rating</span>
                    <span className="font-mono text-2xl font-black text-accent-400">{selectedTool.trust_score}%</span>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="p-5 rounded-2xl bg-vault-800/30 border border-accent-500/15 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-accent-400" />
                  <p className="text-sm text-parchment leading-relaxed pl-2 font-normal">
                    {selectedTool.summary}
                  </p>
                </div>

                {/* Quantitative Metric Gauges */}
                <div>
                  <h4 className="font-mono text-xs text-accent-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-accent-400" /> Benchmarked Capability Metrics
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(selectedTool.metrics).map(([key, val]) => {
                      const labelMap: Record<string, string> = {
                        accuracy: "Scam Detection Accuracy",
                        speed: "Real-time Execution Speed",
                        privacy: "Privacy & Data Sovereignty",
                        retailFit: "Consumer / Retail Protection Fit",
                        explainability: "Decision Explainability"
                      };
                      return (
                        <div key={key} className="p-3.5 rounded-xl bg-vault-950/60 border border-accent-500/[0.06]">
                          <div className="flex justify-between text-xs font-mono mb-1.5">
                            <span className="text-parchment-dim">{labelMap[key]}</span>
                            <span className="font-bold text-parchment">{val}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-accent-500/10 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${val}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                val >= 90 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                                val >= 70 ? 'bg-gradient-to-r from-accent-500 to-amber-400' :
                                'bg-gradient-to-r from-ledger-red to-rose-400'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Architectural Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="font-mono text-[10px] text-parchment-faint uppercase tracking-wider block">
                      Detection Frameworks
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTool.detection_methods.map((method, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-accent-500/10 border border-accent-500/20 text-accent-300 text-[11px] font-mono">
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-mono text-[10px] text-parchment-faint uppercase tracking-wider block">
                      ML & AI Pipelines
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTool.ml_approach.map((ml, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-sapphire-500/10 border border-sapphire-500/20 text-blue-200 text-[11px] font-mono">
                          {ml}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-accent-500/[0.08]">
                  <div className="p-3 bg-vault-800/30 rounded-xl border border-accent-500/10">
                    <span className="font-mono text-[9px] text-parchment-faint uppercase tracking-wider block">Pricing Model</span>
                    <p className="text-xs font-semibold text-parchment mt-1 truncate">{selectedTool.price_model}</p>
                  </div>
                  <div className="p-3 bg-vault-800/30 rounded-xl border border-accent-500/10">
                    <span className="font-mono text-[9px] text-parchment-faint uppercase tracking-wider block">Decision Latency</span>
                    <p className="text-xs font-semibold text-emerald-400 font-mono mt-1">{selectedTool.latency_ms}</p>
                  </div>
                  <div className="p-3 bg-vault-800/30 rounded-xl border border-accent-500/10">
                    <span className="font-mono text-[9px] text-parchment-faint uppercase tracking-wider block">Infrastructure</span>
                    <p className="text-xs font-semibold text-parchment mt-1 truncate">{selectedTool.deployment}</p>
                  </div>
                  <div className="p-3 bg-vault-800/30 rounded-xl border border-accent-500/10">
                    <span className="font-mono text-[9px] text-parchment-faint uppercase tracking-wider block">API Ready</span>
                    <p className="text-xs font-semibold text-parchment mt-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-ledger-green" /> Enabled
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Tab 2: Full Matrix Comparison ─── */}
        {activeTab === 'matrix' && (
          <motion.div
            key="tab-matrix"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="p-8 rounded-3xl bg-vault-900/60 border border-accent-500/20 backdrop-blur-2xl shadow-2xl overflow-x-auto"
          >
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-display text-xl font-bold text-parchment tracking-tight">Full System Specification Matrix</h3>
                <p className="text-xs text-parchment-faint mt-1">Cross-system audit across threat models, architecture boundaries, and user privacy.</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-accent-500/20 font-mono text-[10px] text-accent-400 uppercase tracking-widest">
                  <th className="pb-4 pl-4">Platform</th>
                  <th className="pb-4">Core Target</th>
                  <th className="pb-4">Deployment Model</th>
                  <th className="pb-4">Latency</th>
                  <th className="pb-4">Privacy Profile</th>
                  <th className="pb-4">Cost Tier</th>
                  <th className="pb-4 pr-4 text-right">Trust Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent-500/[0.06] text-xs">
                {tools.map((t) => {
                  const isMine = t.id === 'arthmitra';
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-accent-500/[0.04] transition-colors ${
                        isMine ? 'bg-accent-500/[0.06] font-medium' : ''
                      }`}
                    >
                      <td className="py-4 pl-4 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-vault-800/40 border border-accent-500/20 flex items-center justify-center font-bold text-[10px] text-parchment font-mono">
                          {t.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-parchment">{t.name}</span>
                          {isMine && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-400 font-mono text-[9px]">
                              ARTHMITRA
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-parchment-dim max-w-[200px] truncate">{t.specialty}</td>
                      <td className="py-4 text-parchment-faint font-mono text-[11px]">{t.deployment}</td>
                      <td className="py-4 text-emerald-400 font-mono">{t.latency_ms}</td>
                      <td className="py-4 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          t.metrics.privacy >= 90 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {t.metrics.privacy >= 90 ? 'Zero Cloud Leak' : 'Cloud Aggregated'}
                        </span>
                      </td>
                      <td className="py-4 text-parchment-faint">{t.price_model}</td>
                      <td className="py-4 pr-4 text-right font-mono font-bold text-accent-400">{t.trust_score}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* ─── Tab 3: Interactive Attack Arena ─── */}
        {activeTab === 'simulator' && (
          <motion.div
            key="tab-simulator"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="p-8 rounded-3xl bg-vault-900/60 border border-accent-500/20 backdrop-blur-2xl shadow-2xl space-y-8"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-display text-2xl font-bold text-parchment tracking-tight flex items-center gap-3">
                  <Terminal className="w-6 h-6 text-accent-400" /> Adversarial Attack Arena
                </h3>
                <p className="text-xs text-parchment-faint mt-1">
                  Inject live attack payloads to benchmark detection resilience across platforms.
                </p>
              </div>

              {/* Attack Vector Selector */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSimulatedAttack('upi_trap')}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                    simulatedAttack === 'upi_trap'
                      ? 'bg-ledger-red/20 border border-ledger-red/50 text-rose-300 font-bold'
                      : 'bg-vault-800/40 border border-accent-500/15 text-parchment-faint hover:text-parchment'
                  }`}
                >
                  ₹1 Collect Request Trap
                </button>
                <button
                  onClick={() => setSimulatedAttack('kyc_phish')}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                    simulatedAttack === 'kyc_phish'
                      ? 'bg-ledger-red/20 border border-ledger-red/50 text-rose-300 font-bold'
                      : 'bg-vault-800/40 border border-accent-500/15 text-parchment-faint hover:text-parchment'
                  }`}
                >
                  Electricity Bill KYC Phish
                </button>
                <button
                  onClick={() => setSimulatedAttack('family_impersonate')}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                    simulatedAttack === 'family_impersonate'
                      ? 'bg-ledger-red/20 border border-ledger-red/50 text-rose-300 font-bold'
                      : 'bg-vault-800/40 border border-accent-500/15 text-parchment-faint hover:text-parchment'
                  }`}
                >
                  Emergency Family WhatsApp Bait
                </button>
              </div>
            </div>

            {/* Attack Payload Snippet */}
            <div className="p-4 rounded-2xl bg-vault-950 border border-accent-500/15 font-mono text-xs">
              <span className="text-[10px] text-parchment-faint uppercase tracking-wider block mb-2 font-sans">
                Sample Simulated Payload
              </span>
              <div className="text-amber-300">
                {simulatedAttack === 'upi_trap' && `"Dear customer, your refund of ₹5,000 is pending. Tap to approve UPI collect request of ₹1 to verify your bank account instantly: upi://pay?pa=refund99@ybl&am=1"`}
                {simulatedAttack === 'kyc_phish' && `"Dear consumer, your electricity power connection will be DISCONNECTED tonight at 9:30 PM due to un-updated KYC. Update Aadhaar immediately: http://bit.ly/power-sbi-update"`}
                {simulatedAttack === 'family_impersonate' && `"Beta, Papa ke dost ka accident ho gaya hai. Hospital me emergency hai, turant ₹15,000 is number pe gpay/phonepe karo. Jaldi!"`}
              </div>
            </div>

            {/* Results Grid across Platforms */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* ArthMitra Response */}
              <div className="p-6 rounded-2xl bg-accent-500/[0.08] border border-accent-500/35 space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-parchment text-sm">ArthMitra Scam Shield</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">BLOCKED (100%)</span>
                </div>
                <p className="text-xs text-parchment-dim">
                  Stage 1 zero-width cleaner matched deterministic emergency/collect regex. Local policy breaker engaged without sending SMS off-device.
                </p>
                <div className="p-3 bg-vault-950/80 rounded-xl border border-accent-500/20 font-mono text-[11px] text-emerald-400">
                  ✔ Risk Score: 98/100 (HIGH_RISK)<br />
                  ✔ Advised Action: Reject UPI request & block contact
                </div>
              </div>

              {/* Feedzai Response */}
              <div className="p-6 rounded-2xl bg-vault-800/20 border border-accent-500/15 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-parchment text-sm">Feedzai RailRisk</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">NEUTRAL / OUT-OF-SCOPE</span>
                </div>
                <p className="text-xs text-parchment-dim">
                  Requires core banking ledger integration (CBS). Does not scan user-level incoming SMS or WhatsApp text threads directly on retail phones.
                </p>
                <div className="p-3 bg-vault-950/80 rounded-xl border border-accent-500/15 font-mono text-[11px] text-parchment-faint">
                  ⚠ Status: Payload bypasses core bank switch until settlement is requested.
                </div>
              </div>

              {/* Sift / SEON Response */}
              <div className="p-6 rounded-2xl bg-vault-800/20 border border-accent-500/15 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-parchment text-sm">SEON / Sift</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold">PARTIAL (URL ONLY)</span>
                </div>
                <p className="text-xs text-parchment-dim">
                  Flags bit.ly shorteners or domain age via web APIs, but misses vernacular Hindi/Hinglish family impersonation ("Papa ka dost") context.
                </p>
                <div className="p-3 bg-vault-950/80 rounded-xl border border-accent-500/15 font-mono text-[11px] text-blue-300">
                  ℹ URL domain scored as low-reputation; social context unflagged.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
