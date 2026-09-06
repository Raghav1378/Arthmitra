"use client";

import React, { useState, useCallback } from "react";
import {
  Shield, AlertTriangle, CheckCircle, XCircle,
  Link, Loader2, Send, Clock, RotateCcw,
  Eye, Zap, Globe, CreditCard, Briefcase,
  ChevronDown, ChevronUp, Info, IndianRupee, Hash, Lock, Gift, Wallet, Brain
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScamResult {
  final_decision: {
    risk: "SAFE" | "SUSPICIOUS" | "HIGH_RISK";
    confidence: number;
    risk_score: number;
    scam_type: string;
  };
  signals_detected: {
    strong: string[];
    medium: string[];
    weak: string[];
    behavioral: string[];
  };
  reasoning: {
    summary: string;
    detailed_reasons: string[];
  };
  user_advice: string[];
}

interface DecisionResult {
  type: string;
  decision: "PAY" | "VERIFY_FIRST" | "DO_NOT_PAY";
  risk: "SAFE" | "LOW" | "SUSPICIOUS" | "HIGH_RISK" | "HIGH";
  confidence: number;
  risk_score: number;
  signals_detected: {
    payment_intent?: boolean;
    urgency: boolean;
    threat: boolean;
    kyc_scam: boolean;
    reward_trap: boolean;
    unknown_receiver: boolean;
    budget_issue?: boolean;
    impulse_trigger?: boolean;
  };
  ui: {
    verdict_label: string;
    color: string;
    icon: string;
    primary_message: string;
    secondary_message: string;
  };
  reasoning: {
    summary: string;
    details: string[];
  };
  advice: string[];
}


interface BehaviorResult {
  risk: "SAFE" | "SUSPICIOUS" | "HIGH_RISK";
  confidence: number;
  risk_score: number;
  signals_detected: {
    amount_pattern: string;
    odd_timing: boolean;
    repetition_pattern: string;
  };
  reasoning: {
    summary: string;
    details: string[];
  };
  advice: string[];
}

interface LinkResult {
  type: "url" | "upi" | "unknown";
  risk: "SAFE" | "LOW" | "SUSPICIOUS" | "HIGH_RISK" | "HIGH";
  confidence: number;
  risk_score: number;
  signals_detected: {
    fake_domain: boolean;
    brand_impersonation: boolean;
    suspicious_tld: boolean;
    shortened_link: boolean;
    random_upi: boolean;
  };
  reasoning: {
    summary: string;
    details: string[];
  };
  advice: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const SCAM_TYPE_ICONS: Record<string, React.ReactNode> = {
  phishing:      <Link className="w-4 h-4" />,
  kyc:           <CreditCard className="w-4 h-4" />,
  upi:           <CreditCard className="w-4 h-4" />,
  job:           <Briefcase className="w-4 h-4" />,
  lottery:       <Zap className="w-4 h-4" />,
  delivery:      <Globe className="w-4 h-4" />,
  impersonation: <Eye className="w-4 h-4" />,
  unknown:       <AlertTriangle className="w-4 h-4" />,
};

const EXAMPLE_MESSAGES = [
  "Dear user, your SBI account will be blocked. Update KYC now at http://sbi-secure.xyz",
  "Congratulations! You won ₹25 Lakh in KBC. Click http://bit.ly/kbc-prize to claim now",
  "Earn ₹5000/day working from home! No experience needed. WhatsApp us: 9876543210",
  "Your Amazon parcel is on hold. Pay ₹50 delivery fee at: amzn-delivery.net/pay",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: string }) {
  const config: Record<string, any> = {
    SAFE:      { label: "SAFE", color: "text-emerald-700", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle className="w-5 h-5" />, glow: "shadow-emerald-500/20" },
    LOW:       { label: "LOW RISK", color: "text-emerald-700", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle className="w-5 h-5" />, glow: "shadow-emerald-500/20" },
    SUSPICIOUS:{ label: "SUSPICIOUS", color: "text-amber-700", bg: "bg-amber-500/10 border-amber-500/20", icon: <AlertTriangle className="w-5 h-5" />, glow: "shadow-amber-500/20" },
    HIGH_RISK: { label: "HIGH RISK", color: "text-red-600", bg: "bg-red-500/10 border-red-500/20", icon: <XCircle className="w-5 h-5" />, glow: "shadow-red-500/30" },
    HIGH:      { label: "HIGH RISK", color: "text-red-600", bg: "bg-red-500/10 border-red-500/20", icon: <XCircle className="w-5 h-5" />, glow: "shadow-red-500/30" },
  };

  const current = config[risk] || config.SUSPICIOUS;

  return (
    <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border ${current.bg} shadow-xl ${current.glow}`}>
      <span className={current.color}>{current.icon}</span>
      <span className={`text-base font-black tracking-widest font-display ${current.color}`}>{current.label}</span>
    </div>
  );
}

function ConfidenceBar({ value, risk }: { value: number; risk: string }) {
  const color = risk === "SAFE" ? "from-emerald-500 to-teal-500" : risk === "SUSPICIOUS" ? "from-amber-500 to-orange-500" : "from-red-500 to-rose-500";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-parchment-faint uppercase tracking-widest font-display">Confidence</span>
        <span className="text-sm font-black text-ink-950 font-display">{value}%</span>
      </div>
      <div className="h-1.5 bg-ink-900/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
        />
      </div>
    </div>
  );
}

function SignalChip({ label, active = true, icon, color = "red" }: { label: string; active?: boolean; icon: React.ReactNode; color?: "red" | "purple" | "yellow" | "orange" | "gray" }) {
  if (!active) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all bg-ink-900/[0.02] border-ink-900/[0.05] text-stone-600">
        <span className="text-stone-600">{icon}</span>
        {label}
      </div>
    );
  }

  const styles = {
    red: "bg-red-500/10 border-red-500/20 text-red-600",
    purple: "bg-amber-500/10 border-amber-500/20 text-amber-700",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-500",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    gray: "bg-ink-900/[0.04] border-ink-900/10 text-parchment-faint"
  };

  const glowStyles = {
    red: "bg-red-400 shadow-[0_0_6px_#f87171]",
    purple: "bg-amber-400 shadow-[0_0_6px_#c084fc]",
    yellow: "bg-yellow-500 shadow-[0_0_6px_#eab308]",
    orange: "bg-orange-400 shadow-[0_0_6px_#fb923c]",
    gray: "bg-stone-400 shadow-[0_0_6px_#94a3b8]"
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${styles[color]}`}>
      <span>{icon}</span>
      {label}
      <span className={`ml-auto w-1.5 h-1.5 rounded-full ${glowStyles[color]}`} />
    </div>
  );
}

function RiskMeterArc({ score }: { score: number }) {
  const safe_score = Math.min(100, Math.max(0, score));
  const angle = 180 + (safe_score * 1.8);
  const color = safe_score < 30 ? "#10b981" : safe_score < 65 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="160" height="90" viewBox="0 0 160 90" className="overflow-visible">
        {/* Track */}
        <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" strokeLinecap="round" />
        {/* Progress */}
        <motion.path
          d="M 15 80 A 65 65 0 0 1 145 80"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="204"
          initial={{ strokeDashoffset: 204 }}
          animate={{ strokeDashoffset: 204 - (safe_score / 100) * 204 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        {/* Needle */}
        <motion.line
          x1="80" y1="80"
          initial={{ x2: 25, y2: 80 }}
          animate={{
          x2: 80 + 55 * Math.cos((angle * Math.PI) / 180),
          y2: 80 + 55 * Math.sin((angle * Math.PI) / 180),
          }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ opacity: 0.7 }}
        />
        <circle cx="80" cy="80" r="4" fill="white" fillOpacity="0.8" />
        <text x="15" y="66" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold" letterSpacing="1">LOW</text>
        <text x="80" y="8" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold" letterSpacing="1">MID</text>
        <text x="145" y="66" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold" letterSpacing="1">HIGH</text>
      </svg>
      <div className="text-center mt-[-12px]">
        <p className="text-2xl font-black font-display flex items-baseline justify-center gap-0.5" style={{ color }}>
          {safe_score.toFixed(0)}
          <span className="text-base opacity-50 font-sans">%</span>
        </p>
        <p className="text-[9px] font-bold text-stone-600 uppercase tracking-widest mt-0.5">Risk Score</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScamShield() {
  const [activeTab, setActiveTab] = useState<"message" | "behavior" | "link" | "decision">("message");

  // Message states
  const [message, setMessage] = useState("");
  const [timeOfMessage, setTimeOfMessage] = useState("");
  const [messageResult, setMessageResult] = useState<ScamResult | null>(null);

  // Behavior states
  const [amount, setAmount] = useState("");
  const [timeOfTransaction, setTimeOfTransaction] = useState("");
  const [frequency, setFrequency] = useState("");
  const [behaviorResult, setBehaviorResult] = useState<BehaviorResult | null>(null);

  // Link states
  const [linkInput, setLinkInput] = useState("");
  const [linkResult, setLinkResult] = useState<LinkResult | null>(null);

  // Decision states
  const [decisionInput, setDecisionInput] = useState("");
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);

  // Shared states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);

  const analyze = useCallback(async () => {
    if (activeTab === "message" && !message.trim()) return;
    if (activeTab === "behavior" && !amount.trim()) return;
    if (activeTab === "link" && !linkInput.trim()) return;
    if (activeTab === "decision" && !decisionInput.trim()) return;
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);
    setShowReasoning(false);

    try {
      if (activeTab === "message") {
        setMessageResult(null);
        const res = await fetch(`${API_BASE}/scam/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message_text: message,
            time_of_message: timeOfMessage || undefined,
          }),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setMessageResult(data);
      } else if (activeTab === "behavior") {
        setBehaviorResult(null);
        const res = await fetch(`${API_BASE}/scam/behavior`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amount,
            time_of_transaction: timeOfTransaction || undefined,
            frequency: frequency || undefined,
          }),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setBehaviorResult(data);
      } else if (activeTab === "link") {
        setLinkResult(null);
        const res = await fetch(`${API_BASE}/scam/link_upi`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input_value: linkInput }),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setLinkResult(data);
      } else if (activeTab === "decision") {
        setDecisionResult(null);
        const res = await fetch(`${API_BASE}/scam/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input_value: decisionInput }),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setDecisionResult(data);
      }
      setAnalysisCount(c => c + 1);
    } catch (e: any) {
      setError(e.message || "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [message, timeOfMessage, amount, timeOfTransaction, frequency, linkInput, decisionInput, activeTab, isAnalyzing]);

  const reset = () => {
    setMessage("");
    setTimeOfMessage("");
    setAmount("");
    setTimeOfTransaction("");
    setFrequency("");
    setMessageResult(null);
    setBehaviorResult(null);
    setLinkInput("");
    setLinkResult(null);
    setDecisionInput("");
    setDecisionResult(null);
    setError(null);
    setShowReasoning(false);
  };

  const hasSignal = (word: string) => {
    if (!messageResult) return false;
    const all = [
      ...messageResult.signals_detected.strong,
      ...messageResult.signals_detected.medium,
      ...messageResult.signals_detected.weak,
      ...messageResult.signals_detected.behavioral
    ].join(" ").toLowerCase();
    return all.includes(word.toLowerCase());
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      {/* ─── Header ─── */}
      <div className="px-8 pt-6 pb-6 border-b border-ink-900/[0.06] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gold-500/20 blur-xl animate-pulse" />
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center relative z-10 border border-ink-900/20 shadow-xl shadow-gold-500/20">
                <Shield className="w-6 h-6 text-ink-950" />
              </div>
            </div>
            <div className="font-display">
              <h2 className="text-xl font-black text-ink-950 uppercase tracking-tight">Scam Shield</h2>
              <p className="text-[10px] font-bold text-parchment-faint uppercase tracking-widest mt-0.5">Dual-Mode Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {analysisCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gold-500/10 border border-gold-500/20 rounded-xl font-display">
                <Zap className="w-3.5 h-3.5 text-gold-600" />
                <span className="text-[10px] font-black text-gold-600 uppercase tracking-widest">{analysisCount} scanned</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl font-display">
              <div className="w-1.5 h-1.5 bg-red-400 rounded-full shadow-[0_0_6px_#f87171] animate-pulse" />
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">High Recall Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Scrollable Body ─── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-8 space-y-6 max-w-4xl mx-auto">

          {/* ── Tabs ── */}
          <div className="flex bg-ink-900/[0.03] border border-ink-900/[0.06] rounded-2xl p-1 shrink-0">
            <button
              onClick={() => setActiveTab("message")}
              className={`flex-1 py-3 justify-center items-center flex gap-2 rounded-xl text-xs font-black uppercase tracking-widest font-display transition-all ${activeTab === "message" ? "bg-gold-500/20 text-gold-600 shadow-lg border border-gold-500/20" : "text-parchment-faint hover:text-parchment-dim"}`}
            >
              <Send className="w-4 h-4" /> Message Scanner
            </button>
            <button
              onClick={() => setActiveTab("behavior")}
              className={`flex-1 py-3 justify-center items-center flex gap-2 rounded-xl text-xs font-black uppercase tracking-widest font-display transition-all ${activeTab === "behavior" ? "bg-emerald-500/20 text-emerald-700 shadow-lg border border-emerald-500/20" : "text-parchment-faint hover:text-parchment-dim"}`}
            >
              <IndianRupee className="w-4 h-4" /> Behavior Engine
            </button>
            <button
              onClick={() => setActiveTab("link")}
              className={`flex-1 py-3 justify-center items-center flex gap-2 rounded-xl text-xs font-black uppercase tracking-widest font-display transition-all ${activeTab === "link" ? "bg-emerald-500/20 text-emerald-700 shadow-lg border border-emerald-500/20" : "text-parchment-faint hover:text-parchment-dim"}`}
            >
              <Globe className="w-4 h-4" /> Link/UPI Shield
            </button>
            <button
              onClick={() => setActiveTab("decision")}
              className={`flex-1 py-3 justify-center items-center flex gap-2 rounded-xl text-xs font-black uppercase tracking-widest font-display transition-all ${activeTab === "decision" ? "bg-red-500/20 text-red-600 shadow-lg border border-red-500/20" : "text-parchment-faint hover:text-parchment-dim"}`}
            >
              <Wallet className="w-4 h-4" /> 💰 Payment Decision
            </button>
          </div>

          {/* ── Inputs ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              {activeTab === "message" ? (
                <>
                  <label className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Text Context</label>
                  <div className="relative">
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder={'Paste a suspicious SMS, email, link, or UPI ID here...'}
                      rows={5}
                      disabled={isAnalyzing}
                      onKeyDown={e => e.key === "Enter" && e.ctrlKey && analyze()}
                      className="w-full bg-ink-900/[0.03] border border-ink-900/[0.08] rounded-2xl px-5 py-4 text-sm text-parchment placeholder:text-stone-600 focus:outline-none focus:border-gold-500/40 focus:bg-ink-900/[0.05] transition-all resize-none font-sans leading-relaxed"
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] text-stone-600 font-display font-bold">Ctrl+Enter to analyze</div>
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-600" />
                    <input
                      type="text"
                      value={timeOfMessage}
                      onChange={e => setTimeOfMessage(e.target.value)}
                      placeholder="Time of message (e.g. 02:30 AM) — optional"
                      className="w-full bg-ink-900/[0.02] border border-ink-900/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-xs text-parchment-faint placeholder:text-stone-600 focus:outline-none focus:border-gold-500/30 transition-all font-sans"
                    />
                  </div>
                </>
              ) : activeTab === "behavior" ? (
                <>
                  <label className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Transaction Data</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-faint" />
                      <input
                        type="text"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="Amount (e.g., 5000, 1)"
                        className="w-full bg-ink-900/[0.03] border border-ink-900/[0.08] rounded-2xl pl-11 pr-5 py-4 text-sm text-parchment placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/40 focus:bg-ink-900/[0.05] transition-all font-sans"
                        disabled={isAnalyzing}
                        onKeyDown={e => e.key === "Enter" && analyze()}
                      />
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-faint" />
                      <input
                        type="text"
                        value={timeOfTransaction}
                        onChange={e => setTimeOfTransaction(e.target.value)}
                        placeholder="Time (e.g., 11:30 PM) — optional"
                        className="w-full bg-ink-900/[0.03] border border-ink-900/[0.08] rounded-2xl pl-11 pr-5 py-4 text-sm text-parchment placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/40 focus:bg-ink-900/[0.05] transition-all font-sans"
                        disabled={isAnalyzing}
                        onKeyDown={e => e.key === "Enter" && analyze()}
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-faint" />
                    <input
                      type="text"
                      value={frequency}
                      onChange={e => setFrequency(e.target.value)}
                      placeholder="Frequency (e.g., '3 attempts in 2 min') — optional"
                      className="w-full bg-ink-900/[0.03] border border-ink-900/[0.08] rounded-2xl pl-11 pr-5 py-4 text-sm text-parchment placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/40 focus:bg-ink-900/[0.05] transition-all font-sans"
                      disabled={isAnalyzing}
                      onKeyDown={e => e.key === "Enter" && analyze()}
                    />
                  </div>
                </>
              ) : activeTab === "link" ? (
                <>
                  <label className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Phishing Source (Link or UPI)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-1">
                      <Link className="w-4 h-4 text-parchment-faint" />
                      <span className="text-stone-700 font-bold">/</span>
                      <Hash className="w-4 h-4 text-parchment-faint" />
                    </div>
                    <input
                      type="text"
                      value={linkInput}
                      onChange={e => setLinkInput(e.target.value)}
                      placeholder="Enter URL (sbi-login.xyz) or UPI ID (sbi-pay@upi)"
                      className="w-full bg-ink-900/[0.03] border border-ink-900/[0.08] rounded-2xl pl-16 pr-5 py-4 text-sm text-parchment placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/40 focus:bg-ink-900/[0.05] transition-all font-sans"
                      disabled={isAnalyzing}
                      onKeyDown={e => e.key === "Enter" && analyze()}
                    />
                  </div>
                </>
              ) : (
                <>
                  <label className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Payment Situation Details</label>
                  <div className="relative">
                    <textarea
                      value={decisionInput}
                      onChange={e => setDecisionInput(e.target.value)}
                      placeholder="Ask Mitra: 'Should I send Rs 2000 to this person claiming they are from FedEx?'"
                      rows={4}
                      className="w-full bg-ink-900/[0.03] border border-ink-900/[0.08] rounded-2xl px-5 py-4 text-sm text-parchment placeholder:text-stone-600 focus:outline-none focus:border-red-500/40 focus:bg-ink-900/[0.05] transition-all font-sans resize-none"
                      disabled={isAnalyzing}
                      onKeyDown={e => e.key === "Enter" && e.ctrlKey && analyze()}
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] text-stone-600 font-display font-bold">Ctrl+Enter to analyze</div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={analyze}
                  disabled={
                    (activeTab === "message" ? !message.trim() :
                     activeTab === "behavior" ? !amount.trim() :
                     activeTab === "decision" ? !decisionInput.trim() :
                     !linkInput.trim()) || isAnalyzing
                  }
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-ink-950 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed shadow-xl font-display
                    ${activeTab === "message" ? "bg-gradient-to-r from-gold-500 to-gold-700 hover:from-gold-400 hover:to-gold-600 shadow-gold-500/20" 
                    : activeTab === "behavior" ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20" 
                    : activeTab === "decision" ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-red-500/20"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"}`}
                >
                  {isAnalyzing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
                  ) : (
                    <><Shield className="w-4 h-4" /> Scan {activeTab === "message" ? "Text" : activeTab === "behavior" ? "Behavior" : activeTab === "decision" ? "Decision" : "Link/UPI"}</>
                  )}
                </button>
                {(messageResult || behaviorResult || linkResult || decisionResult) && (
                  <button
                    onClick={reset}
                    className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.06] text-parchment-faint text-sm font-black hover:bg-ink-900/[0.07] hover:text-ink-950 transition-all font-display uppercase tracking-wider"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ── Error ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-600 font-sans"
              >
                <XCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Analyzing Skeleton ── */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-3 gap-4"
              >
                {[1,2,3].map(i => (
                  <div key={i} className="h-24 rounded-2xl bg-ink-900/[0.02] border border-ink-900/[0.05] animate-pulse" />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Results (Message) ── */}
          <AnimatePresence>
            {activeTab === "message" && messageResult && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl bg-ink-900/[0.03] border border-ink-900/[0.06] space-y-4">
                    <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Final Verdict</p>
                    <RiskBadge risk={messageResult.final_decision.risk} />
                    <ConfidenceBar value={messageResult.final_decision.confidence} risk={messageResult.final_decision.risk} />
                    <div className="flex items-center gap-2 pt-1">
                      {SCAM_TYPE_ICONS[messageResult.final_decision.scam_type] || <AlertTriangle className="w-4 h-4" />}
                      <span className="text-xs text-parchment-faint font-bold font-display uppercase tracking-wider">{messageResult.final_decision.scam_type.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-ink-900/[0.03] border border-ink-900/[0.06] flex flex-col items-center justify-center">
                    <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display mb-2">Risk Gauge</p>
                    <RiskMeterArc score={messageResult.final_decision.risk_score} />
                    <div className="flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-ink-900/[0.03] border border-ink-900/[0.05]">
                      <span className="text-[10px] font-black text-parchment-faint font-display uppercase tracking-widest">{messageResult.final_decision.risk}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-ink-900/[0.02] border border-ink-900/[0.06] flex items-start gap-4">
                  <Info className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                  <p className="text-sm text-parchment-dim leading-relaxed font-sans">{messageResult.reasoning.summary}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Detected Signals</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <SignalChip label="Urgency" active={hasSignal('urgenc') || hasSignal('act') || hasSignal('time')} icon={<Zap className="w-3.5 h-3.5" />} />
                    <SignalChip label="Threat" active={hasSignal('threat') || hasSignal('block') || hasSignal('legal')} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
                    <SignalChip label="Payment Request" active={hasSignal('payment') || hasSignal('fee') || hasSignal('upi')} icon={<CreditCard className="w-3.5 h-3.5" />} />
                    <SignalChip label="Suspicious Link" active={hasSignal('link') || hasSignal('url') || hasSignal('domain')} icon={<Link className="w-3.5 h-3.5" />} />
                    <SignalChip label="Odd Timing" active={hasSignal('odd timing') || hasSignal('late night')} icon={<Clock className="w-3.5 h-3.5" />} />
                    <SignalChip label="Repetition" active={hasSignal('repeat') || hasSignal('repetition') || hasSignal('spam')} icon={<Eye className="w-3.5 h-3.5" />} />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Your Action Plan</p>
                  <div className="space-y-2">
                    {messageResult.user_advice.map((advice, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-ink-900/[0.03] border border-ink-900/[0.05]">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5">{i + 1}</div>
                        <p className="text-sm text-parchment-dim font-sans leading-relaxed">{advice}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-ink-900/[0.06] overflow-hidden">
                  <button onClick={() => setShowReasoning(!showReasoning)} className="w-full flex items-center justify-between px-5 py-4 bg-ink-900/[0.02] hover:bg-ink-900/[0.04] transition-all">
                    <span className="text-[11px] font-black text-parchment-faint uppercase tracking-widest font-display">Detailed AI Reasoning</span>
                    {showReasoning ? <ChevronUp className="w-4 h-4 text-parchment-faint" /> : <ChevronDown className="w-4 h-4 text-parchment-faint" />}
                  </button>
                  <AnimatePresence>
                    {showReasoning && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 space-y-2 pt-2">
                          {messageResult.reasoning.detailed_reasons.map((r, i) => (
                            <div key={i} className="flex items-start gap-3 text-sm text-parchment-faint font-sans"><span className="text-gold-600 mt-0.5 shrink-0">→</span>{r}</div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Results (Behavior) ── */}
          <AnimatePresence>
            {activeTab === "behavior" && behaviorResult && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl bg-ink-900/[0.03] border border-ink-900/[0.06] space-y-4">
                    <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Behavior Verdict</p>
                    <RiskBadge risk={behaviorResult.risk} />
                    <ConfidenceBar value={behaviorResult.confidence} risk={behaviorResult.risk} />
                  </div>
                  <div className="p-6 rounded-3xl bg-ink-900/[0.03] border border-ink-900/[0.06] flex flex-col items-center justify-center">
                    <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display mb-2">Risk Gauge</p>
                    <RiskMeterArc score={behaviorResult.risk_score} />
                    <div className="flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-ink-900/[0.03] border border-ink-900/[0.05]">
                      <span className="text-[10px] font-black text-parchment-faint font-display uppercase tracking-widest">{behaviorResult.risk}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-ink-900/[0.02] border border-ink-900/[0.06] flex items-start gap-4">
                  <Info className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                  <p className="text-sm text-parchment-dim leading-relaxed font-sans">{behaviorResult.reasoning.summary}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Behavior Signals</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <SignalChip label={`Amount: ${behaviorResult.signals_detected.amount_pattern}`} active={behaviorResult.signals_detected.amount_pattern === "very_low" || behaviorResult.signals_detected.amount_pattern === "low"} icon={<IndianRupee className="w-3.5 h-3.5" />} />
                    <SignalChip label="Odd Timing" active={behaviorResult.signals_detected.odd_timing} icon={<Clock className="w-3.5 h-3.5" />} />
                    <SignalChip label={`Repetition: ${behaviorResult.signals_detected.repetition_pattern}`} active={behaviorResult.signals_detected.repetition_pattern === "moderate" || behaviorResult.signals_detected.repetition_pattern === "strong"} icon={<Hash className="w-3.5 h-3.5" />} />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Your Action Plan</p>
                  <div className="space-y-2">
                    {behaviorResult.advice.map((advice, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-ink-900/[0.03] border border-ink-900/[0.05]">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5">{i + 1}</div>
                        <p className="text-sm text-parchment-dim font-sans leading-relaxed">{advice}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-ink-900/[0.06] overflow-hidden">
                  <button onClick={() => setShowReasoning(!showReasoning)} className="w-full flex items-center justify-between px-5 py-4 bg-ink-900/[0.02] hover:bg-ink-900/[0.04] transition-all">
                    <span className="text-[11px] font-black text-parchment-faint uppercase tracking-widest font-display">Detailed AI Reasoning</span>
                    {showReasoning ? <ChevronUp className="w-4 h-4 text-parchment-faint" /> : <ChevronDown className="w-4 h-4 text-parchment-faint" />}
                  </button>
                  <AnimatePresence>
                    {showReasoning && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 space-y-2 pt-2">
                          {behaviorResult.reasoning.details.map((r, i) => (
                            <div key={i} className="flex items-start gap-3 text-sm text-parchment-faint font-sans"><span className="text-gold-600 mt-0.5 shrink-0">→</span>{r}</div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {activeTab === "link" && linkResult && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl bg-ink-900/[0.03] border border-ink-900/[0.06] space-y-4">
                    <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Analyst Verdict</p>
                    <RiskBadge risk={linkResult.risk} />
                    <ConfidenceBar value={linkResult.confidence} risk={linkResult.risk} />
                    <div className="flex items-center gap-2 pt-1">
                      <Hash className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs text-parchment-faint font-bold font-display uppercase tracking-wider">Detected as {linkResult.type.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-ink-900/[0.03] border border-ink-900/[0.06] flex flex-col items-center justify-center">
                    <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display mb-2">Internal Risk Score</p>
                    <RiskMeterArc score={linkResult.risk_score} />
                    <div className="flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-ink-900/[0.03] border border-ink-900/[0.05]">
                      <span className="text-[10px] font-black text-parchment-faint font-display uppercase tracking-widest">{linkResult.risk}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-ink-900/[0.02] border border-ink-900/[0.06] flex items-start gap-4">
                  <Info className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                  <p className="text-sm text-parchment-dim leading-relaxed font-sans">{linkResult.reasoning.summary}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Heuristic Signals</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <SignalChip label="Fake Domain" active={linkResult.signals_detected.fake_domain} icon={<Globe className="w-3.5 h-3.5" />} />
                    <SignalChip label="Impersonation" active={linkResult.signals_detected.brand_impersonation} icon={<Eye className="w-3.5 h-3.5" />} />
                    <SignalChip label="Suspicious TLD" active={linkResult.signals_detected.suspicious_tld} icon={<Globe className="w-3.5 h-3.5" />} />
                    <SignalChip label="Shortened Link" active={linkResult.signals_detected.shortened_link} icon={<Link className="w-3.5 h-3.5" />} />
                    <SignalChip label="Random UPI" active={linkResult.signals_detected.random_upi} icon={<Hash className="w-3.5 h-3.5" />} />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Cyber-Safety Advice</p>
                  <div className="space-y-2">
                    {linkResult.advice.map((advice, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-ink-900/[0.03] border border-ink-900/[0.05]">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5">{i + 1}</div>
                        <p className="text-sm text-parchment-dim font-sans leading-relaxed">{advice}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-ink-900/[0.06] overflow-hidden">
                  <button onClick={() => setShowReasoning(!showReasoning)} className="w-full flex items-center justify-between px-5 py-4 bg-ink-900/[0.02] hover:bg-ink-900/[0.04] transition-all">
                    <span className="text-[11px] font-black text-parchment-faint uppercase tracking-widest font-display">Technical Breakdown</span>
                    {showReasoning ? <ChevronUp className="w-4 h-4 text-parchment-faint" /> : <ChevronDown className="w-4 h-4 text-parchment-faint" />}
                  </button>
                  <AnimatePresence>
                    {showReasoning && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 space-y-2 pt-2">
                          {linkResult.reasoning.details.map((r, i) => (
                            <div key={i} className="flex items-start gap-3 text-sm text-parchment-faint font-sans"><span className="text-emerald-700 mt-0.5 shrink-0">→</span>{r}</div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Results (Decision) ── */}
          <AnimatePresence>
            {activeTab === "decision" && decisionResult && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl bg-ink-900/[0.03] border border-ink-900/[0.06] space-y-4">
                    <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Mitra's Decision</p>
                    <RiskBadge risk={decisionResult.risk} />
                    <ConfidenceBar value={decisionResult.confidence} risk={decisionResult.risk} />
                    <div className="flex flex-col gap-1 pt-2">
                       <span className={`text-sm font-black font-display uppercase tracking-wider ${decisionResult.ui.color === 'green' ? 'text-emerald-700' : decisionResult.ui.color === 'yellow' ? 'text-amber-700' : 'text-red-600'}`}>{decisionResult.ui.primary_message}</span>
                       <span className="text-xs text-parchment-faint">{decisionResult.ui.secondary_message}</span>
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-ink-900/[0.03] border border-ink-900/[0.06] flex flex-col items-center justify-center">
                    <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display mb-2">Decision Score</p>
                    <RiskMeterArc score={decisionResult.risk_score} />
                    <div className="flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-ink-900/[0.03] border border-ink-900/[0.05]">
                      <span className="text-[10px] font-black text-parchment-faint font-display uppercase tracking-widest">{decisionResult.decision.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-ink-900/[0.02] border border-ink-900/[0.06] flex items-start gap-4">
                  <Info className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-parchment-dim leading-relaxed font-sans">{decisionResult.reasoning.summary}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Context Signals Detected</p>
                  
                  {(!decisionResult.signals_detected.urgency && 
                    !decisionResult.signals_detected.threat && 
                    !decisionResult.signals_detected.kyc_scam && 
                    !decisionResult.signals_detected.reward_trap && 
                    !decisionResult.signals_detected.unknown_receiver && 
                    !decisionResult.signals_detected.budget_issue && 
                    !decisionResult.signals_detected.impulse_trigger) ? (
                    <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-emerald-700" />
                      <span className="text-sm text-emerald-700 font-bold">✅ No major risk signals detected</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {decisionResult.signals_detected.threat && <SignalChip color="red" label="Threat" icon={<AlertTriangle className="w-3.5 h-3.5" />} />}
                      {decisionResult.signals_detected.kyc_scam && <SignalChip color="purple" label="KYC Scam" icon={<Lock className="w-3.5 h-3.5" />} />}
                      {decisionResult.signals_detected.urgency && <SignalChip color="yellow" label="Urgency" icon={<Zap className="w-3.5 h-3.5" />} />}
                      {decisionResult.signals_detected.reward_trap && <SignalChip color="orange" label="Reward Trap" icon={<Gift className="w-3.5 h-3.5" />} />}
                      {decisionResult.signals_detected.budget_issue && <SignalChip color="orange" label="Budget Risk" icon={<IndianRupee className="w-3.5 h-3.5" />} />}
                      {decisionResult.signals_detected.impulse_trigger && <SignalChip color="yellow" label="Impulse Spending" icon={<Brain className="w-3.5 h-3.5" />} />}
                      {decisionResult.signals_detected.unknown_receiver && <SignalChip color="gray" label="Unknown Receiver" icon={<Eye className="w-3.5 h-3.5" />} />}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Recommended Actions</p>
                  <div className="space-y-2">
                    {decisionResult.advice.map((advice, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-ink-900/[0.03] border border-ink-900/[0.05]">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5">{i + 1}</div>
                        <p className="text-sm text-parchment-dim font-sans leading-relaxed">{advice}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-ink-900/[0.06] overflow-hidden">
                  <button onClick={() => setShowReasoning(!showReasoning)} className="w-full flex items-center justify-between px-5 py-4 bg-ink-900/[0.02] hover:bg-ink-900/[0.04] transition-all">
                    <span className="text-[11px] font-black text-parchment-faint uppercase tracking-widest font-display">Technical Breakdown</span>
                    {showReasoning ? <ChevronUp className="w-4 h-4 text-parchment-faint" /> : <ChevronDown className="w-4 h-4 text-parchment-faint" />}
                  </button>
                  <AnimatePresence>
                    {showReasoning && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 space-y-2 pt-2">
                          {decisionResult.reasoning.details.map((r, i) => (
                            <div key={i} className="flex items-start gap-3 text-sm text-parchment-faint font-sans"><span className="text-red-600 mt-0.5 shrink-0">→</span>{r}</div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
