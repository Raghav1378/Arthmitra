"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Shield, AlertTriangle, CheckCircle, XCircle,
  Link as LinkIcon, Loader2, Send, Clock, RotateCcw,
  Eye, Zap, Globe, CreditCard, Briefcase,
  ChevronDown, ChevronUp, Info, IndianRupee, Hash, Lock, Gift, Wallet, Brain,
  History, Camera, Trash2, Check, ArrowRight, UserCheck, HelpCircle, AlertOctagon, Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  ScamResult, BehaviorResult, LinkResult, DecisionResult,
  HistoryData, ScanRow, TrustedContact, EvidenceItem
} from "./scam-shield/types";
import { VerdictCard } from "./scam-shield/VerdictCard";
import { EvidenceList } from "./scam-shield/EvidenceList";
import { ActionPlan } from "./scam-shield/ActionPlan";
import { ProtectionTimeline } from "./scam-shield/ProtectionTimeline";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const SCAM_TYPE_LABELS: Record<string, string> = {
  phishing: "Phishing Attempt",
  kyc: "KYC Fraud",
  upi: "UPI / QR Scam",
  job: "Employment Trap",
  lottery: "Prize & Lottery Bait",
  delivery: "Courier / Delivery Fraud",
  impersonation: "Institution Impersonation",
  extortion: "Coercion & Extortion",
  unknown: "Suspicious Activity",
};

const EXAMPLE_MESSAGES = [
  "Dear user, your SBI account will be blocked. Update KYC now at http://sbi-secure.xyz",
  "Congratulations! You won ₹25 Lakh in KBC. Click http://bit.ly/kbc-prize to claim now",
  "Earn ₹5000/day working from home! No experience needed. WhatsApp us: 9876543210",
  "Your Amazon parcel is on hold. Pay ₹50 delivery fee at: amzn-delivery.net/pay",
];

export default function ScamShield() {
  const [activeTab, setActiveTab] = useState<"message" | "link" | "decision" | "behavior" | "history">("message");

  // Inputs
  const [message, setMessage] = useState("");
  const [timeOfMessage, setTimeOfMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [timeOfTransaction, setTimeOfTransaction] = useState("");
  const [frequency, setFrequency] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [decisionInput, setDecisionInput] = useState("");

  // Scan outputs
  const [messageResult, setMessageResult] = useState<ScamResult | null>(null);
  const [behaviorResult, setBehaviorResult] = useState<BehaviorResult | null>(null);
  const [linkResult, setLinkResult] = useState<LinkResult | null>(null);
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);

  // States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<"scam" | "legit" | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);

  // Expandable sections
  const [showDetectionDetails, setShowDetectionDetails] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showRbiGuidance, setShowRbiGuidance] = useState(false);
  const [showDisagreementDetails, setShowDisagreementDetails] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);

  // History & Contacts
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [contactInput, setContactInput] = useState("");
  const [contactLabel, setContactLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/scam/contacts`);
      if (res.ok) setContacts(await res.json());
    } catch { /* graceful fallback */ }
  }, []);

  const addContact = useCallback(async () => {
    const value = contactInput.trim();
    if (!value) return;
    try {
      const res = await fetch(`${API_BASE}/scam/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, label: contactLabel.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed to register contact");
      setContactInput("");
      setContactLabel("");
      loadContacts();
    } catch (e: any) {
      setError(e.message || "Could not add trusted contact");
    }
  }, [contactInput, contactLabel, loadContacts]);

  const removeContact = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/scam/contacts/${id}`, { method: "DELETE" });
      loadContacts();
    } catch { /* ignore */ }
  }, [loadContacts]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/scam/history`);
      if (res.ok) setHistory(await res.json());
    } catch { /* graceful fallback */ }
  }, []);

  useEffect(() => {
    if (activeTab === "history") loadHistory();
    loadContacts();
  }, [activeTab, loadHistory, loadContacts]);

  const clearHistory = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/scam/history`, { method: "DELETE" });
      loadHistory();
    } catch { /* ignore */ }
  }, [loadHistory]);

  const resetAll = () => {
    setMessage("");
    setTimeOfMessage("");
    setAmount("");
    setTimeOfTransaction("");
    setFrequency("");
    setLinkInput("");
    setDecisionInput("");
    setMessageResult(null);
    setBehaviorResult(null);
    setLinkResult(null);
    setDecisionResult(null);
    setError(null);
    setFeedbackSent(null);
    setShowDetectionDetails(false);
    setShowDiagnostics(false);
  };

  const analyze = useCallback(async () => {
    if (activeTab === "message" && !message.trim()) return;
    if (activeTab === "link" && !linkInput.trim()) return;
    if (activeTab === "decision" && !decisionInput.trim()) return;
    if (activeTab === "behavior" && !amount.trim()) return;
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);
    setFeedbackSent(null);

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
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        setMessageResult(data);
      } else if (activeTab === "link") {
        setLinkResult(null);
        const res = await fetch(`${API_BASE}/scam/link_upi`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input_value: linkInput }),
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        setLinkResult(await res.json());
      } else if (activeTab === "decision") {
        setDecisionResult(null);
        const res = await fetch(`${API_BASE}/scam/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input_value: decisionInput }),
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        setDecisionResult(await res.json());
      } else if (activeTab === "behavior") {
        setBehaviorResult(null);
        const res = await fetch(`${API_BASE}/scam/behavior`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            time_of_transaction: timeOfTransaction || undefined,
            frequency: frequency || undefined,
          }),
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        setBehaviorResult(await res.json());
      }
      setAnalysisCount(c => c + 1);
    } catch (e: any) {
      setError(e.message || "Analysis request failed. Please check your connection.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [message, timeOfMessage, linkInput, decisionInput, amount, timeOfTransaction, frequency, activeTab, isAnalyzing]);

  const scanScreenshot = useCallback(async (file: File) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/scam/scan_image`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "OCR scan failed");
      setMessage(data.ocr_text || "");
      setMessageResult(data);
      setActiveTab("message");
      setAnalysisCount(c => c + 1);
    } catch (e: any) {
      setError(e.message || "Failed to process image screenshot.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  const sendFeedback = useCallback(async (feedback: "scam" | "legit") => {
    const scanId = messageResult?.scan_id;
    if (!scanId) return;
    try {
      const res = await fetch(`${API_BASE}/scam/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_id: scanId, feedback }),
      });
      if (res.ok) setFeedbackSent(feedback);
    } catch { /* silent */ }
  }, [messageResult]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden text-parchment">
      {/* ─── Header ─── */}
      <header className="px-6 py-5 border-b border-white/[0.08] bg-vault-950/60 backdrop-blur-md shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400 shadow-lg shadow-accent-500/10">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
              Scam Shield
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 font-medium">v2.0</span>
            </h1>
            <p className="text-xs text-parchment-faint mt-0.5">Your financial safety checkpoint before you click, pay or share</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowContactsModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.03] text-xs text-parchment-dim hover:text-white transition-all"
            title="Manage Trusted Contacts"
          >
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">People you trust</span>
            <span className="font-mono text-[11px] text-parchment-faint font-medium">({contacts.length})</span>
          </button>
        </div>
      </header>

      {/* ─── Main Viewport ─── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* ─── Mode Selector (Segmented Navigation) ─── */}
          <div className="flex flex-wrap p-1.5 rounded-2xl bg-vault-900 border border-white/[0.08] gap-1 shadow-sm">
            <button
              onClick={() => { setActiveTab("message"); resetAll(); }}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold tracking-tight transition-all ${activeTab === "message" ? "bg-accent-500 text-ink-950 font-bold shadow-md shadow-accent-500/20" : "text-parchment-dim hover:text-white hover:bg-white/[0.04]"}`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Check Message</span>
            </button>
            <button
              onClick={() => { setActiveTab("link"); resetAll(); }}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold tracking-tight transition-all ${activeTab === "link" ? "bg-accent-500 text-ink-950 font-bold shadow-md shadow-accent-500/20" : "text-parchment-dim hover:text-white hover:bg-white/[0.04]"}`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Link / UPI Shield</span>
            </button>
            <button
              onClick={() => { setActiveTab("decision"); resetAll(); }}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold tracking-tight transition-all ${activeTab === "decision" ? "bg-accent-500 text-ink-950 font-bold shadow-md shadow-accent-500/20" : "text-parchment-dim hover:text-white hover:bg-white/[0.04]"}`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Payment Decision</span>
            </button>
            <button
              onClick={() => { setActiveTab("behavior"); resetAll(); }}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold tracking-tight transition-all ${activeTab === "behavior" ? "bg-accent-500 text-ink-950 font-bold shadow-md shadow-accent-500/20" : "text-parchment-dim hover:text-white hover:bg-white/[0.04]"}`}
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Behavior Engine</span>
            </button>
            <button
              onClick={() => { setActiveTab("history"); resetAll(); }}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-tight transition-all ${activeTab === "history" ? "bg-accent-500 text-ink-950 font-bold shadow-md shadow-accent-500/20" : "text-parchment-dim hover:text-white hover:bg-white/[0.04]"}`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          </div>

          {/* ─── Scanner Inputs ─── */}
          {activeTab !== "history" && (
            <div className="p-5 md:p-6 rounded-3xl bg-vault-900 border border-white/[0.08] shadow-xl space-y-4">
              {activeTab === "message" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-parchment">Paste Suspicious Message, SMS, or Email</label>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-accent-400 hover:text-accent-300 flex items-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Screenshot</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) scanScreenshot(file);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="e.g. 'Dear Customer, your SBI account KYC has expired. Update immediately at http://sbi-verify.top or access will be blocked.'"
                    rows={4}
                    disabled={isAnalyzing}
                    className="w-full bg-vault-800 border border-white/10 rounded-2xl p-4 text-sm text-parchment placeholder:text-parchment-ghost focus:outline-none focus:border-accent-400 transition-all resize-none leading-relaxed"
                  />

                  {/* Progressive Disclosure: Optional Details */}
                  <div className="pt-1">
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-faint" />
                      <input
                        type="text"
                        value={timeOfMessage}
                        onChange={e => setTimeOfMessage(e.target.value)}
                        placeholder="Time received (e.g. 02:30 AM) — optional contextual check"
                        className="w-full bg-vault-800 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-parchment placeholder:text-parchment-ghost focus:outline-none focus:border-accent-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Empty state examples */}
                  {!message && (
                    <div className="pt-2 flex flex-wrap gap-2 items-center">
                      <span className="text-[11px] text-parchment-faint">Try sample:</span>
                      {EXAMPLE_MESSAGES.map((sample, i) => (
                        <button
                          key={i}
                          onClick={() => setMessage(sample)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-parchment-dim hover:text-white transition-all truncate max-w-[200px]"
                        >
                          {sample}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "link" && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-parchment">Enter Web Link (URL) or UPI ID to Inspect</label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-faint" />
                    <input
                      type="text"
                      value={linkInput}
                      onChange={e => setLinkInput(e.target.value)}
                      placeholder="e.g. http://sbi-secure.xyz/login or sbi-support@okaxis"
                      className="w-full bg-vault-800 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-parchment placeholder:text-parchment-ghost focus:outline-none focus:border-accent-400 transition-all font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-parchment-faint leading-normal">
                    Checks known phishing databases, punycode spoofing, burner domains, brand impersonation, and unverified UPI handles.
                  </p>
                </div>
              )}

              {activeTab === "decision" && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-parchment">Describe the Payment Request Situation</label>
                  <textarea
                    value={decisionInput}
                    onChange={e => setDecisionInput(e.target.value)}
                    placeholder="e.g. 'Someone claiming to be from FedEx called asking for Rs 2000 customs clearance fee before releasing my delivery. Should I pay?'"
                    rows={4}
                    className="w-full bg-vault-800 border border-white/10 rounded-2xl p-4 text-sm text-parchment placeholder:text-parchment-ghost focus:outline-none focus:border-accent-400 transition-all resize-none leading-relaxed"
                  />
                  <p className="text-[11px] text-parchment-faint">
                    Mitra evaluates social-engineering pretexts, unknown recipient risks, urgency, and institutional impersonation.
                  </p>
                </div>
              )}

              {activeTab === "behavior" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-parchment">Behavioral Anomaly Engine</h3>
                    <p className="text-xs text-parchment-faint mt-0.5">Advanced check for transaction amounts, timing, and repeated request tactics.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-parchment-dim font-medium">Transaction Amount (₹)</label>
                      <input
                        type="text"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full bg-vault-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-parchment placeholder:text-parchment-ghost focus:outline-none focus:border-accent-400 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-parchment-dim font-medium">Time of Transaction</label>
                      <input
                        type="text"
                        value={timeOfTransaction}
                        onChange={e => setTimeOfTransaction(e.target.value)}
                        placeholder="e.g. 02:30 AM"
                        className="w-full bg-vault-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-parchment placeholder:text-parchment-ghost focus:outline-none focus:border-accent-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-parchment-dim font-medium">Frequency / Attempts</label>
                      <input
                        type="text"
                        value={frequency}
                        onChange={e => setFrequency(e.target.value)}
                        placeholder="e.g. 4 attempts in 10m"
                        className="w-full bg-vault-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-parchment placeholder:text-parchment-ghost focus:outline-none focus:border-accent-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={analyze}
                  disabled={isAnalyzing}
                  className="flex-1 py-3 px-6 rounded-xl bg-accent-500 hover:bg-accent-400 active:scale-[0.99] text-ink-950 font-bold text-sm tracking-tight flex items-center justify-center gap-2.5 shadow-lg shadow-accent-500/20 transition-all disabled:opacity-40"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-ink-950" />
                      <span>Analyzing with Scam Shield...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 text-ink-950" />
                      <span>Analyze with Scam Shield</span>
                    </>
                  )}
                </button>

                {(message || linkInput || decisionInput || amount || messageResult || linkResult || decisionResult || behaviorResult) && (
                  <button
                    onClick={resetAll}
                    disabled={isAnalyzing}
                    className="p-3 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.04] text-parchment-faint hover:text-white transition-all"
                    title="Reset scanner"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── Error Notification ─── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3"
              >
                <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-red-300">Scanner Error</p>
                  <p className="text-red-400/90">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Results View (Message Scanner) ─── */}
          {activeTab === "message" && messageResult && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Mixed Evidence Banner (if engine disagreement exists) */}
              {messageResult.engine_disagreement?.disagreement && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Mixed Evidence Detected</span>
                    </div>
                    <button
                      onClick={() => setShowDisagreementDetails(!showDisagreementDetails)}
                      className="text-[11px] underline text-amber-400 hover:text-amber-300"
                    >
                      {showDisagreementDetails ? "Hide technical details" : "Technical details"}
                    </button>
                  </div>
                  <p className="text-parchment-dim text-[11px] leading-relaxed">
                    Our detection methods generated conflicting signals. The policy engine applied conservative safety rules. Please review the specific evidence below before proceeding.
                  </p>
                  {showDisagreementDetails && (
                    <div className="pt-2 border-t border-amber-500/20 text-[11px] font-mono text-amber-200/90 space-y-1">
                      <p>• {messageResult.engine_disagreement.reason}</p>
                      <p>• {messageResult.engine_disagreement.policy_resolution}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Two-Column Primary Result Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Column: Verdict & Action */}
                <div className="space-y-5">
                  <VerdictCard
                    risk={messageResult.final_decision.risk}
                    score={messageResult.final_decision.risk_score}
                    confidence={messageResult.final_decision.confidence}
                  />

                  <ActionPlan
                    risk={messageResult.final_decision.risk}
                    advice={messageResult.user_advice}
                  />
                </div>

                {/* Right Column: Evidence & Analysis */}
                <div className="space-y-5">
                  <div className="p-6 rounded-3xl bg-vault-900 border border-white/[0.08] shadow-xl space-y-4">
                    <EvidenceList evidence={messageResult.evidence} />

                    {/* Semantic Analysis (Only when LLM actually ran) */}
                    {messageResult.llm_stage === "used" && messageResult.ai_analysis && (
                      <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-accent-400" />
                          <h4 className="text-xs font-semibold text-white">Semantic Context Analysis</h4>
                        </div>
                        <p className="text-xs text-parchment-dim leading-relaxed">
                          {messageResult.ai_analysis.brief_reason}
                        </p>
                        {messageResult.ai_analysis.semantic_indicators.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {messageResult.ai_analysis.semantic_indicators.map((ind, i) => (
                              <span key={i} className="text-[10px] px-2.5 py-0.5 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-300 font-mono">
                                {ind.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Official RBI Guidance (Subtle Expandable) */}
              {messageResult.rbi_guideline && (
                <div className="rounded-2xl border border-white/[0.08] bg-vault-900 overflow-hidden">
                  <button
                    onClick={() => setShowRbiGuidance(!showRbiGuidance)}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-semibold text-parchment-dim hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <span>Official Regulatory Advisory (RBI)</span>
                    </span>
                    {showRbiGuidance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showRbiGuidance && (
                    <div className="px-5 pb-4 text-xs text-parchment-faint leading-relaxed border-t border-white/[0.06] pt-3">
                      {messageResult.rbi_guideline}
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Loop */}
              <div className="p-4 rounded-2xl bg-vault-900 border border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-parchment-faint">Was this security assessment helpful?</span>
                {feedbackSent ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Thank you for your feedback
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => sendFeedback("scam")}
                      className="px-3 py-1.5 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 font-medium transition-colors"
                    >
                      Report as Scam
                    </button>
                    <button
                      onClick={() => sendFeedback("legit")}
                      className="px-3 py-1.5 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 font-medium transition-colors"
                    >
                      This is Legit
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible Detection Details */}
              <div className="rounded-2xl border border-white/[0.08] bg-vault-900 overflow-hidden">
                <button
                  onClick={() => setShowDetectionDetails(!showDetectionDetails)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-medium text-parchment-faint hover:text-parchment transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span>Detection details</span>
                  </span>
                  {showDetectionDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showDetectionDetails && (
                  <div className="px-5 pb-5 pt-2 border-t border-white/[0.06] space-y-2 text-xs text-parchment-dim">
                    <p className="font-semibold text-white">Summary of analysis:</p>
                    <p className="leading-relaxed">{messageResult.reasoning.summary}</p>
                    <ul className="list-disc list-inside space-y-1 text-parchment-faint pt-1">
                      {messageResult.reasoning.detailed_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Advanced Diagnostics (For Judges & Developers) */}
              <div className="rounded-2xl border border-white/[0.06] bg-vault-950 overflow-hidden">
                <button
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="w-full px-5 py-3 flex items-center justify-between text-[11px] font-mono text-parchment-ghost hover:text-parchment-faint transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Advanced diagnostics</span>
                  </span>
                  {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showDiagnostics && (
                  <div className="p-4 border-t border-white/[0.06] bg-black/40 font-mono text-[11px] text-parchment-faint overflow-x-auto space-y-1">
                    <p className="text-emerald-400">{"// Stage 3 Policy Engine Concordance State"}</p>
                    <p>Scam Type: {messageResult.final_decision.scam_type}</p>
                    <p>Risk Score: {messageResult.final_decision.risk_score} / 100</p>
                    <p>Confidence Value: {messageResult.final_decision.confidence}%</p>
                    <p>LLM Stage: {messageResult.llm_stage}</p>
                    <p>Active Rule Signals: {JSON.stringify(messageResult.signals_detected)}</p>
                    {messageResult.engine_disagreement && (
                      <p>Engine Disagreement: {JSON.stringify(messageResult.engine_disagreement)}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── Results View (Link / UPI Shield) ─── */}
          {activeTab === "link" && linkResult && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <VerdictCard
                  risk={linkResult.risk === "LOW" ? "SAFE" : linkResult.risk === "HIGH" ? "HIGH_RISK" : (linkResult.risk as any)}
                  score={linkResult.risk_score}
                  confidence={linkResult.confidence}
                />
                <div className="p-6 rounded-3xl bg-vault-900 border border-white/[0.08] shadow-xl space-y-3">
                  <h3 className="text-sm font-semibold text-white">Heuristic Inspection</h3>
                  <p className="text-xs text-parchment-dim leading-relaxed">{linkResult.reasoning.summary}</p>
                  <ul className="text-xs text-parchment-faint space-y-1 list-disc list-inside pt-2">
                    {linkResult.reasoning.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <ActionPlan
                risk={linkResult.risk === "LOW" ? "SAFE" : linkResult.risk === "HIGH" ? "HIGH_RISK" : (linkResult.risk as any)}
                advice={linkResult.advice}
              />
            </motion.div>
          )}

          {/* ─── Results View (Payment Decision) ─── */}
          {activeTab === "decision" && decisionResult && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <VerdictCard
                  risk={decisionResult.risk === "LOW" ? "SAFE" : decisionResult.risk === "HIGH" ? "HIGH_RISK" : (decisionResult.risk as any)}
                  score={decisionResult.risk_score}
                  confidence={decisionResult.confidence}
                />
                <div className="p-6 rounded-3xl bg-vault-900 border border-white/[0.08] shadow-xl space-y-3">
                  <h3 className="text-sm font-semibold text-white">Mitra's Evaluation</h3>
                  <p className="text-xs text-parchment-dim leading-relaxed">{decisionResult.reasoning.summary}</p>
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-accent-400">{decisionResult.ui.primary_message}</p>
                    <p className="text-[11px] text-parchment-faint mt-0.5">{decisionResult.ui.secondary_message}</p>
                  </div>
                </div>
              </div>
              <ActionPlan
                risk={decisionResult.risk === "LOW" ? "SAFE" : decisionResult.risk === "HIGH" ? "HIGH_RISK" : (decisionResult.risk as any)}
                advice={decisionResult.advice}
              />
            </motion.div>
          )}

          {/* ─── Results View (Behavior Engine) ─── */}
          {activeTab === "behavior" && behaviorResult && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <VerdictCard
                  risk={behaviorResult.risk}
                  score={behaviorResult.risk_score}
                  confidence={behaviorResult.confidence}
                />
                <div className="p-6 rounded-3xl bg-vault-900 border border-white/[0.08] shadow-xl space-y-3">
                  <h3 className="text-sm font-semibold text-white">Pattern Heuristics</h3>
                  <p className="text-xs text-parchment-dim leading-relaxed">{behaviorResult.reasoning.summary}</p>
                  <ul className="text-xs text-parchment-faint space-y-1 list-disc list-inside pt-2">
                    {behaviorResult.reasoning.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <ActionPlan risk={behaviorResult.risk} advice={behaviorResult.advice} />
            </motion.div>
          )}

          {/* ─── History View (Protection Timeline) ─── */}
          {activeTab === "history" && (
            <ProtectionTimeline data={history} onClear={clearHistory} />
          )}

        </div>
      </div>

      {/* ─── Trusted Contacts Modal ─── */}
      <AnimatePresence>
        {showContactsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-vault-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-semibold text-white">People you trust</h3>
                </div>
                <button
                  onClick={() => setShowContactsModal(false)}
                  className="p-1.5 rounded-lg text-parchment-faint hover:text-white hover:bg-white/10 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-parchment-faint leading-relaxed">
                Add phone numbers or UPI handles of family members, landlords, or colleagues. Scam Shield will not flag emergency transfers or communications from these known contacts as unknown recipient risks.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={contactInput}
                  onChange={e => setContactInput(e.target.value)}
                  placeholder="Phone (9876543210) or UPI (name@okaxis)"
                  className="flex-1 bg-vault-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-parchment placeholder:text-parchment-ghost focus:outline-none focus:border-accent-400 font-mono"
                />
                <input
                  type="text"
                  value={contactLabel}
                  onChange={e => setContactLabel(e.target.value)}
                  placeholder="Label (e.g. Papa)"
                  className="sm:w-32 bg-vault-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-parchment placeholder:text-parchment-ghost focus:outline-none focus:border-accent-400"
                />
                <button
                  onClick={addContact}
                  disabled={!contactInput.trim()}
                  className="px-4 py-2.5 bg-accent-500 hover:bg-accent-400 text-ink-950 font-bold text-xs rounded-xl transition-all disabled:opacity-30"
                >
                  Add
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pt-1">
                {contacts.length === 0 ? (
                  <p className="text-xs text-parchment-ghost py-4 text-center">No trusted contacts added yet.</p>
                ) : (
                  contacts.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-vault-800 border border-white/[0.06] text-xs">
                      <div>
                        <span className="font-semibold text-white">{c.label ? `${c.label} · ` : ""}</span>
                        <span className="font-mono text-parchment-dim">{c.value}</span>
                      </div>
                      <button
                        onClick={() => removeContact(c.id)}
                        className="text-parchment-ghost hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
