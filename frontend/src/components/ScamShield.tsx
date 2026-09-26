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
import { HeroSection } from "./scam-shield/HeroSection";
import { CylinderCarousel } from "./scam-shield/CylinderCarousel";
import { HowItWorks } from "./scam-shield/HowItWorks";
import { ArchitectureVisualizer } from "./scam-shield/ArchitectureVisualizer";

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

const SCAN_STAGES = [
  "SANITIING INPUT PAYLOAD",
  "CHECKING HEURISTIC RULES",
  "INSPECTING LINKS & DOMAINS",
  "EVALUATING ML PATTERNS",
  "FINALIZING POLICY DECISION",
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
  const [scanStageIndex, setScanStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<"scam" | "legit" | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);

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

  const scannerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToScanner = () => {
    scannerRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  useEffect(() => {
    if (!isAnalyzing) {
      setScanStageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setScanStageIndex((prev) => (prev + 1) % SCAN_STAGES.length);
    }, 450);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

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
      setAnalysisCount((c) => c + 1);
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
      setAnalysisCount((c) => c + 1);
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
    <div className="flex min-w-0 flex-col h-full bg-signal overflow-hidden text-[#F5F7FF]">
      {/* ─── Header ─── */}
      <header className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#F5F7FF]/10 bg-[#0B1020]/90 backdrop-blur-md shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#111936] border border-[#4F6BFF]/30 flex items-center justify-center text-[#4F6BFF] shadow-lg shadow-[#4F6BFF]/15">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-serif font-bold tracking-tight text-[#F5F7FF] flex items-center gap-2">
              ArthMitra Scam Shield
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#4F6BFF]/10 border border-[#4F6BFF]/30 text-[#4F6BFF]">SIGNAL UI</span>
            </h1>
            <p className="hidden sm:block text-xs text-[#AAB4D0] mt-0.5 font-sans">Financial decision instrument & safety network</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowContactsModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#F5F7FF]/10 hover:border-[#F5F7FF]/20 bg-[#111936] text-xs text-[#AAB4D0] hover:text-[#F5F7FF] transition-all"
            title="Manage Trusted Contacts"
          >
            <UserCheck className="w-4 h-4 text-[#2DD4BF]" />
            <span className="hidden sm:inline font-sans">Trusted Contacts</span>
            <span className="font-mono text-[11px] text-[#6C7A9C]">({contacts.length})</span>
          </button>
        </div>
      </header>

      {/* ─── Scrollable Main Viewport ─── */}
      <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
        <div className="w-full max-w-5xl min-w-0 mx-auto space-y-6 md:space-y-8">

          {/* ─── Editorial Hero Section ─── */}
          <HeroSection
            onStartScan={scrollToScanner}
            onOpenContacts={() => setShowContactsModal(true)}
            contactsCount={contacts.length}
          />

          {/* ─── Primary Scanner Instrument (Section 15, 16, 17) ─── */}
          <div ref={scannerRef} id="scanner-input" className="scroll-mt-6 space-y-4">
            
            {/* Mode Rail */}
            <div className="flex flex-nowrap overflow-x-auto custom-scrollbar p-1.5 rounded-2xl bg-[#111936] border border-[#F5F7FF]/10 gap-1 shadow-2xl">
              <button
                onClick={() => { setActiveTab("message"); resetAll(); }}
                className={`shrink-0 min-w-[130px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-mono font-semibold tracking-tight transition-all ${
                  activeTab === "message"
                    ? "bg-[#4F6BFF] text-[#F5F7FF] font-bold shadow-lg shadow-[#4F6BFF]/25"
                    : "text-[#AAB4D0] hover:text-[#F5F7FF] hover:bg-[#182246]"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Check Message</span>
              </button>
              <button
                onClick={() => { setActiveTab("link"); resetAll(); }}
                className={`shrink-0 min-w-[130px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-mono font-semibold tracking-tight transition-all ${
                  activeTab === "link"
                    ? "bg-[#4F6BFF] text-[#F5F7FF] font-bold shadow-lg shadow-[#4F6BFF]/25"
                    : "text-[#AAB4D0] hover:text-[#F5F7FF] hover:bg-[#182246]"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Link / UPI Shield</span>
              </button>
              <button
                onClick={() => { setActiveTab("decision"); resetAll(); }}
                className={`shrink-0 min-w-[130px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-mono font-semibold tracking-tight transition-all ${
                  activeTab === "decision"
                    ? "bg-[#4F6BFF] text-[#F5F7FF] font-bold shadow-lg shadow-[#4F6BFF]/25"
                    : "text-[#AAB4D0] hover:text-[#F5F7FF] hover:bg-[#182246]"
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Payment Decision</span>
              </button>
              <button
                onClick={() => { setActiveTab("behavior"); resetAll(); }}
                className={`shrink-0 min-w-[130px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-mono font-semibold tracking-tight transition-all ${
                  activeTab === "behavior"
                    ? "bg-[#4F6BFF] text-[#F5F7FF] font-bold shadow-lg shadow-[#4F6BFF]/25"
                    : "text-[#AAB4D0] hover:text-[#F5F7FF] hover:bg-[#182246]"
                }`}
              >
                <IndianRupee className="w-3.5 h-3.5" />
                <span>Behavior Engine</span>
              </button>
              <button
                onClick={() => { setActiveTab("history"); resetAll(); }}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-mono font-semibold tracking-tight transition-all ${
                  activeTab === "history"
                    ? "bg-[#4F6BFF] text-[#F5F7FF] font-bold shadow-lg shadow-[#4F6BFF]/25"
                    : "text-[#AAB4D0] hover:text-[#F5F7FF] hover:bg-[#182246]"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
              </button>
            </div>

            {/* Instrument Scanner Surface */}
            {activeTab !== "history" && (
              <div
                className={`p-6 md:p-8 rounded-3xl bg-[#111936] border transition-all duration-300 shadow-2xl space-y-5 relative ${
                  isInputFocused ? "border-[#4F6BFF] shadow-[#4F6BFF]/15" : "border-[#F5F7FF]/10"
                }`}
              >
                {activeTab === "message" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-semibold uppercase tracking-widest text-[#4F6BFF]">
                        INPUT SUSPICIOUS MESSAGE, SMS OR EMAIL
                      </label>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-mono text-[#4F6BFF] hover:underline flex items-center gap-1.5 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Upload Screenshot</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) scanScreenshot(file);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    <textarea
                      value={message}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. 'Dear user, your SBI account KYC has expired. Update immediately at http://sbi-verify.top or access will be blocked.'"
                      rows={4}
                      disabled={isAnalyzing}
                      className="w-full bg-[#0B1020] border border-[#F5F7FF]/10 rounded-xl p-4 text-sm text-[#F5F7FF] placeholder:text-[#6C7A9C] focus:outline-none focus:border-[#4F6BFF] transition-all resize-none leading-relaxed font-sans"
                    />

                    {/* Optional contextual details */}
                    <div className="pt-1">
                      <div className="relative">
                        <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C7A9C]" />
                        <input
                          type="text"
                          value={timeOfMessage}
                          onChange={(e) => setTimeOfMessage(e.target.value)}
                          placeholder="Time received (e.g. 02:30 AM) — optional contextual check"
                          className="w-full bg-[#0B1020] border border-[#F5F7FF]/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F7FF] placeholder:text-[#6C7A9C] focus:outline-none focus:border-[#4F6BFF] font-sans"
                        />
                      </div>
                    </div>

                    {/* Sample Message Triggers */}
                    {!message && (
                      <div className="pt-2 flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-mono text-[#6C7A9C] uppercase">Try sample:</span>
                        {EXAMPLE_MESSAGES.map((sample, i) => (
                          <button
                            key={i}
                            onClick={() => setMessage(sample)}
                            className="text-[11px] font-mono px-3 py-1 rounded bg-[#0B1020] border border-[#F5F7FF]/08 hover:border-[#4F6BFF]/40 text-[#AAB4D0] hover:text-[#F5F7FF] transition-all truncate max-w-[220px]"
                          >
                            {sample}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "link" && (
                  <div className="space-y-4 font-sans">
                    <label className="text-xs font-mono font-semibold text-[#4F6BFF] uppercase tracking-widest">
                      ENTER WEB LINK (URL) OR UPI ID TO INSPECT
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C7A9C]" />
                      <input
                        type="text"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="e.g. http://sbi-secure.xyz/login or sbi-support@okaxis"
                        className="w-full bg-[#0B1020] border border-[#F5F7FF]/10 rounded-xl pl-10 pr-4 py-3.5 text-sm text-[#F5F7FF] placeholder:text-[#6C7A9C] focus:outline-none focus:border-[#4F6BFF] transition-all font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-[#6C7A9C] leading-normal font-mono">
                      Inspects punycode spoofing, burner domains, brand impersonation, and unverified VPAs.
                    </p>
                  </div>
                )}

                {activeTab === "decision" && (
                  <div className="space-y-4 font-sans">
                    <label className="text-xs font-mono font-semibold text-[#4F6BFF] uppercase tracking-widest">
                      DESCRIBE THE PAYMENT REQUEST SITUATION
                    </label>
                    <textarea
                      value={decisionInput}
                      onChange={(e) => setDecisionInput(e.target.value)}
                      placeholder="e.g. 'Someone claiming to be from FedEx called asking for Rs 2000 customs clearance fee before releasing my delivery. Should I pay?'"
                      rows={4}
                      className="w-full bg-[#0B1020] border border-[#F5F7FF]/10 rounded-xl p-4 text-sm text-[#F5F7FF] placeholder:text-[#6C7A9C] focus:outline-none focus:border-[#4F6BFF] transition-all resize-none leading-relaxed"
                    />
                  </div>
                )}

                {activeTab === "behavior" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-[#4F6BFF]">
                        BEHAVIORAL ANOMALY PARAMETERS
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-[#6C7A9C]">AMOUNT (₹)</label>
                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="e.g. 5000"
                          className="w-full bg-[#0B1020] border border-[#F5F7FF]/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F7FF] placeholder:text-[#6C7A9C] font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-[#6C7A9C]">TIME OF DAY</label>
                        <input
                          type="text"
                          value={timeOfTransaction}
                          onChange={(e) => setTimeOfTransaction(e.target.value)}
                          placeholder="e.g. 02:30 AM"
                          className="w-full bg-[#0B1020] border border-[#F5F7FF]/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F7FF] placeholder:text-[#6C7A9C] font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-[#6C7A9C]">REPEAT FREQUENCY</label>
                        <input
                          type="text"
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value)}
                          placeholder="e.g. 4 in 10m"
                          className="w-full bg-[#0B1020] border border-[#F5F7FF]/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F7FF] placeholder:text-[#6C7A9C] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Indicator (Section 18) */}
                {isAnalyzing && (
                  <div className="p-4 rounded-xl bg-[#4F6BFF]/10 border border-[#4F6BFF]/30 text-[#4F6BFF] text-xs flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2.5 font-mono font-bold">
                      <Loader2 className="w-4 h-4 animate-spin text-[#4F6BFF]" />
                      <span>{SCAN_STAGES[scanStageIndex]}</span>
                    </div>
                    <span className="text-[10px] text-[#6C7A9C] font-mono">
                      STAGE 0{scanStageIndex + 1} / 05
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={analyze}
                    disabled={isAnalyzing}
                    className="flex-1 py-3.5 px-6 rounded-xl bg-[#4F6BFF] hover:bg-[#3B57E6] active:scale-[0.99] text-[#F5F7FF] font-bold text-sm tracking-tight font-mono flex items-center justify-center gap-2.5 shadow-xl shadow-[#4F6BFF]/25 transition-all disabled:opacity-40 uppercase"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#F5F7FF]" />
                        <span>PROCESSING SIGNALS...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4.5 h-4.5 text-[#F5F7FF]" />
                        <span>EXECUTE SIGNAL SCAN</span>
                      </>
                    )}
                  </button>

                  {(message || linkInput || decisionInput || amount || messageResult || linkResult || decisionResult || behaviorResult) && (
                    <button
                      onClick={resetAll}
                      disabled={isAnalyzing}
                      className="p-3.5 rounded-xl border border-[#F5F7FF]/10 hover:border-[#F5F7FF]/20 bg-[#0B1020] text-[#6C7A9C] hover:text-[#F5F7FF] transition-all"
                      title="Reset scanner"
                    >
                      <RotateCcw className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── Error Notification ─── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-4 rounded-xl bg-[#FF4D5A]/10 border border-[#FF4D5A]/30 text-[#FF4D5A] text-xs flex items-start gap-3 shadow-lg font-mono"
              >
                <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">SCANNER INSTRUMENT ERROR</p>
                  <p className="text-[#FF4D5A]/90 font-sans">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Results View (Message Scanner) ─── */}
          {activeTab === "message" && messageResult && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              {/* Mixed Evidence Banner (Engine Disagreement) */}
              {messageResult.engine_disagreement?.disagreement && (
                <div className="p-4 rounded-xl bg-[#FB7185]/10 border border-[#FB7185]/30 text-[#FB7185] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono font-bold">
                      <AlertTriangle className="w-4 h-4 text-[#FB7185] shrink-0" />
                      <span>MIXED EVIDENCE SIGNAL DETECTED</span>
                    </div>
                    <button
                      onClick={() => setShowDisagreementDetails(!showDisagreementDetails)}
                      className="text-[11px] underline text-[#FB7185] font-mono"
                    >
                      {showDisagreementDetails ? "Hide technical details" : "Technical details"}
                    </button>
                  </div>
                  <p className="text-[#AAB4D0] text-[11px] leading-relaxed font-sans">
                    Our detection methods generated conflicting signals. The policy engine applied conservative safety rules. Please review the specific evidence below before proceeding.
                  </p>
                  {showDisagreementDetails && (
                    <div className="pt-2 border-t border-[#FB7185]/20 text-[11px] font-mono text-[#FB7185] space-y-1">
                      <p>• {messageResult.engine_disagreement.reason}</p>
                      <p>• {messageResult.engine_disagreement.policy_resolution}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Verdict, compact evidence, action, then detailed evidence */}
              <VerdictCard
                risk={messageResult.final_decision.risk}
                score={messageResult.final_decision.risk_score}
                confidence={messageResult.final_decision.confidence}
              />

              <div className="p-5 rounded-2xl bg-[#111936] border border-[#F5F7FF]/10 shadow-xl">
                <EvidenceList evidence={messageResult.evidence} compact />
              </div>

              <ActionPlan
                risk={messageResult.final_decision.risk}
                advice={messageResult.user_advice}
              />

              <div className="p-6 rounded-3xl bg-[#111936] border border-[#F5F7FF]/10 shadow-2xl space-y-5">
                <EvidenceList evidence={messageResult.evidence} />

                {/* Semantic Analysis (Only when LLM actually ran) */}
                {messageResult.llm_stage === "used" && messageResult.ai_analysis && (
                  <div className="pt-4 border-t border-[#F5F7FF]/08 space-y-2.5 font-sans">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-[#4F6BFF]" />
                      <h4 className="text-xs font-mono font-bold text-[#F5F7FF] uppercase">Semantic Context Analysis</h4>
                    </div>
                    <p className="text-xs text-[#AAB4D0] leading-relaxed">
                      {messageResult.ai_analysis.brief_reason}
                    </p>
                    {messageResult.ai_analysis.semantic_indicators.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {messageResult.ai_analysis.semantic_indicators.map((ind, i) => (
                          <span key={i} className="text-[10px] px-2.5 py-0.5 rounded bg-[#4F6BFF]/10 border border-[#4F6BFF]/30 text-[#4F6BFF] font-mono">
                            {ind.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RBI Regulatory Guidance */}
              {messageResult.rbi_guideline && (
                <div className="rounded-2xl border border-[#F5F7FF]/10 bg-[#111936] overflow-hidden">
                  <button
                    onClick={() => setShowRbiGuidance(!showRbiGuidance)}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-mono font-semibold text-[#AAB4D0] hover:text-[#F5F7FF] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#2DD4BF]" />
                      <span>OFFICIAL REGULATORY ADVISORY (RBI)</span>
                    </span>
                    {showRbiGuidance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showRbiGuidance && (
                    <div className="px-5 pb-4 text-xs text-[#AAB4D0] leading-relaxed border-t border-[#F5F7FF]/08 pt-3 font-sans">
                      {messageResult.rbi_guideline}
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Loop */}
              <div className="p-4 rounded-xl bg-[#111936] border border-[#F5F7FF]/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <span className="text-[#6C7A9C]">Was this security assessment helpful?</span>
                {feedbackSent ? (
                  <span className="text-[#2DD4BF] font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Thank you for your feedback
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => sendFeedback("scam")}
                      className="px-3.5 py-1.5 rounded border border-[#FF4D5A]/30 hover:bg-[#FF4D5A]/10 text-[#FF4D5A] transition-colors"
                    >
                      Report as Scam
                    </button>
                    <button
                      onClick={() => sendFeedback("legit")}
                      className="px-3.5 py-1.5 rounded border border-[#2DD4BF]/30 hover:bg-[#2DD4BF]/10 text-[#2DD4BF] transition-colors"
                    >
                      This is Legit
                    </button>
                  </div>
                )}
              </div>

              {/* Advanced Diagnostics (For Judges & Developers) */}
              <div className="rounded-2xl border border-[#F5F7FF]/08 bg-[#0B1020] overflow-hidden">
                <button
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="w-full px-5 py-3 flex items-center justify-between text-[11px] font-mono text-[#A8B4CC] hover:text-[#F4F7FF] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>ADVANCED DIAGNOSTICS & SYSTEM CONCORDANCE</span>
                  </span>
                  {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showDiagnostics && (
                  <div className="p-4 border-t border-[#F5F7FF]/08 bg-[#0B1020] font-mono text-[11px] text-[#AAB4D0] overflow-x-auto space-y-1">
                    <p className="text-[#2DD4BF]">{"// Stage 3 Policy Engine Concordance State"}</p>
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
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <VerdictCard
                  risk={linkResult.risk === "LOW" ? "SAFE" : linkResult.risk === "HIGH" ? "HIGH_RISK" : (linkResult.risk as any)}
                  score={linkResult.risk_score}
                  confidence={linkResult.confidence}
                />
                <div className="p-6 rounded-3xl bg-[#111936] border border-[#F5F7FF]/10 shadow-2xl space-y-3 font-sans">
                  <h3 className="text-xs font-mono font-semibold text-[#4F6BFF] uppercase tracking-widest">Heuristic Inspection</h3>
                  <p className="text-xs text-[#AAB4D0] leading-relaxed">{linkResult.reasoning.summary}</p>
                  <ul className="text-xs text-[#6C7A9C] space-y-1.5 list-disc list-inside pt-2 font-mono">
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
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <VerdictCard
                  risk={decisionResult.risk === "LOW" ? "SAFE" : decisionResult.risk === "HIGH" ? "HIGH_RISK" : (decisionResult.risk as any)}
                  score={decisionResult.risk_score}
                  confidence={decisionResult.confidence}
                />
                <div className="p-6 rounded-3xl bg-[#111936] border border-[#F5F7FF]/10 shadow-2xl space-y-3 font-sans">
                  <h3 className="text-xs font-mono font-semibold text-[#4F6BFF] uppercase tracking-widest">Mitra's Evaluation</h3>
                  <p className="text-xs text-[#AAB4D0] leading-relaxed">{decisionResult.reasoning.summary}</p>
                  <div className="pt-2 border-t border-[#F5F7FF]/08 font-mono">
                    <p className="text-xs font-bold text-[#4F6BFF]">{decisionResult.ui.primary_message}</p>
                    <p className="text-[11px] text-[#6C7A9C] mt-0.5">{decisionResult.ui.secondary_message}</p>
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
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <VerdictCard
                  risk={behaviorResult.risk}
                  score={behaviorResult.risk_score}
                  confidence={behaviorResult.confidence}
                />
                <div className="p-6 rounded-3xl bg-[#111936] border border-[#F5F7FF]/10 shadow-2xl space-y-3 font-sans">
                  <h3 className="text-xs font-mono font-semibold text-[#4F6BFF] uppercase tracking-widest">Pattern Heuristics</h3>
                  <p className="text-xs text-[#AAB4D0] leading-relaxed">{behaviorResult.reasoning.summary}</p>
                  <ul className="text-xs text-[#6C7A9C] space-y-1.5 list-disc list-inside pt-2 font-mono">
                    {behaviorResult.reasoning.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <ActionPlan risk={behaviorResult.risk} advice={behaviorResult.advice} />
            </motion.div>
          )}

          {/* ─── 3D Threat Atlas (Cylinder Carousel) ─── */}
          <CylinderCarousel />

          {/* ─── Safety Pipeline (How It Works) ─── */}
          <HowItWorks />

          {/* ─── Detection Pipeline Console (Architecture Visualizer) ─── */}
          <ArchitectureVisualizer />

          {/* ─── History View (Protection Timeline) ─── */}
          {activeTab === "history" && (
            <ProtectionTimeline data={history} onClear={clearHistory} />
          )}

        </div>
      </div>

      {/* ─── Trusted Contacts Modal ─── */}
      <AnimatePresence>
        {showContactsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1020]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#111936] border border-[#F5F7FF]/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F5F7FF]/10">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-[#2DD4BF]" />
                  <h3 className="text-lg font-serif font-bold text-[#F5F7FF]">People You Trust</h3>
                </div>
                <button
                  onClick={() => setShowContactsModal(false)}
                  className="p-1.5 rounded-lg text-[#6C7A9C] hover:text-[#F5F7FF] hover:bg-[#F5F7FF]/10 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#AAB4D0] leading-relaxed font-sans">
                Add phone numbers or UPI handles of family members, landlords, or colleagues. Scam Shield will not flag emergency transfers or communications from these known contacts as unknown recipient risks.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  placeholder="Phone (9876543210) or UPI (name@okaxis)"
                  className="flex-1 bg-[#0B1020] border border-[#F5F7FF]/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F7FF] placeholder:text-[#6C7A9C] font-mono focus:outline-none focus:border-[#4F6BFF]"
                />
                <input
                  type="text"
                  value={contactLabel}
                  onChange={(e) => setContactLabel(e.target.value)}
                  placeholder="Label (e.g. Papa)"
                  className="sm:w-32 bg-[#0B1020] border border-[#F5F7FF]/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F7FF] placeholder:text-[#6C7A9C] focus:outline-none focus:border-[#4F6BFF]"
                />
                <button
                  onClick={addContact}
                  disabled={!contactInput.trim()}
                  className="px-4 py-2.5 bg-[#4F6BFF] hover:bg-[#3B57E6] text-[#F5F7FF] font-mono font-bold text-xs rounded-xl transition-all disabled:opacity-30 uppercase"
                >
                  Add
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pt-1 pr-1">
                {contacts.length === 0 ? (
                  <p className="text-xs font-mono text-[#6C7A9C] py-4 text-center">No trusted contacts added yet.</p>
                ) : (
                  contacts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0B1020] border border-[#F5F7FF]/08 text-xs font-mono">
                      <div>
                        <span className="font-bold text-[#F5F7FF]">{c.label ? `${c.label} · ` : ""}</span>
                        <span className="text-[#AAB4D0]">{c.value}</span>
                      </div>
                      <button
                        onClick={() => removeContact(c.id)}
                        className="text-[#6C7A9C] hover:text-[#FF4D5A] transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
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
