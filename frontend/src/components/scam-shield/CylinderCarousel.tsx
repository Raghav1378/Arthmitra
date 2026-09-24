"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, Globe, IndianRupee, Lock, Zap,
  Gift, Briefcase, Truck, ArrowLeft, ArrowRight, Pause, Play, Eye
} from "lucide-react";

export interface ThreatCard {
  id: string;
  title: string;
  category: string;
  description: string;
  signals: string[];
  graphicSvg: React.ReactNode;
  accentColor: string;
  badgeColor: string;
}

const THREAT_CARDS: ThreatCard[] = [
  {
    id: "phishing",
    title: "Phishing & Spoofing",
    category: "Web & SMS Vector",
    description: "Lookalike banking portals and fake login forms designed to harvest credentials.",
    signals: ["Domain typos", "Punycode spoofing", "Urgent login demands"],
    graphicSvg: (
      <svg className="w-16 h-16 text-[#4F6BFF] opacity-90" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="32" cy="32" r="24" strokeDasharray="4 4" />
        <path d="M16 32 C 24 20, 40 44, 48 32" />
        <circle cx="48" cy="32" r="4" fill="#4F6BFF" />
      </svg>
    ),
    accentColor: "from-[#4F6BFF]/20 to-[#111936] border-[#4F6BFF]/40",
    badgeColor: "text-[#4F6BFF] bg-[#4F6BFF]/10 border-[#4F6BFF]/30",
  },
  {
    id: "upi",
    title: "UPI & QR Scams",
    category: "Payment Flow Vector",
    description: "Collect requests disguised as refunds, cashback rewards, or money transfers.",
    signals: ["PIN entry for credit", "Unverified VPA handle", "Reversed pay flow"],
    graphicSvg: (
      <svg className="w-16 h-16 text-[#2DD4BF] opacity-90" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="16" y="16" width="14" height="14" rx="2" />
        <rect x="34" y="16" width="14" height="14" rx="2" />
        <rect x="16" y="34" width="14" height="14" rx="2" />
        <circle cx="41" cy="41" r="5" fill="#2DD4BF" />
      </svg>
    ),
    accentColor: "from-[#2DD4BF]/20 to-[#111936] border-[#2DD4BF]/40",
    badgeColor: "text-[#2DD4BF] bg-[#2DD4BF]/10 border-[#2DD4BF]/30",
  },
  {
    id: "kyc",
    title: "KYC & Expiry Fraud",
    category: "Identity Bait Vector",
    description: "Panic-inducing SMS warning of imminent SIM, PAN, or bank account suspension.",
    signals: ["Unauthorized APKs", "Urgent deadline", "Third-party remote tools"],
    graphicSvg: (
      <svg className="w-16 h-16 text-[#FB7185] opacity-90" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="18" y="14" width="28" height="36" rx="4" />
        <circle cx="32" cy="26" r="6" />
        <path d="M24 42 h 16" />
      </svg>
    ),
    accentColor: "from-[#FB7185]/20 to-[#111936] border-[#FB7185]/40",
    badgeColor: "text-[#FB7185] bg-[#FB7185]/10 border-[#FB7185]/30",
  },
  {
    id: "impersonation",
    title: "Brand Impersonation",
    category: "Social Vector",
    description: "Fraudsters posing as bank executives, police, customs officials, or customer support.",
    signals: ["WhatsApp calls", "Demands for secrecy", "Off-platform payments"],
    graphicSvg: (
      <svg className="w-16 h-16 text-[#8B5CF6] opacity-90" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 44 C 20 32, 28 24, 32 24 C 36 24, 44 32, 44 44" />
        <circle cx="32" cy="18" r="8" />
        <line x1="32" y1="10" x2="32" y2="54" strokeDasharray="2 2" />
      </svg>
    ),
    accentColor: "from-[#8B5CF6]/20 to-[#111936] border-[#8B5CF6]/40",
    badgeColor: "text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/30",
  },
  {
    id: "lottery",
    title: "Prize & Lottery Bait",
    category: "Reward Trap Vector",
    description: "Fake KBC winnings or scratch card payouts requiring processing fee deposits.",
    signals: ["Processing fee upfront", "Unsolicited winnings", "Suspicious link"],
    graphicSvg: (
      <svg className="w-16 h-16 text-[#4F6BFF] opacity-90" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="32" cy="32" r="16" />
        <path d="M32 8 L 32 56 M 8 32 L 56 32 M 15 15 L 49 49 M 15 49 L 49 15" strokeDasharray="2 2" />
      </svg>
    ),
    accentColor: "from-[#4F6BFF]/20 to-[#111936] border-[#4F6BFF]/40",
    badgeColor: "text-[#4F6BFF] bg-[#4F6BFF]/10 border-[#4F6BFF]/30",
  },
  {
    id: "jobs",
    title: "Part-Time Job Traps",
    category: "Task Scam Vector",
    description: "High-paying Telegram rating tasks requiring upfront security deposits.",
    signals: ["Prepaid tasks", "Telegram grouping", "Unrealistic returns"],
    graphicSvg: (
      <svg className="w-16 h-16 text-[#2DD4BF] opacity-90" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="16" y="22" width="32" height="26" rx="3" />
        <path d="M24 22 V 16 H 40 V 22" />
        <circle cx="32" cy="35" r="4" fill="#2DD4BF" />
      </svg>
    ),
    accentColor: "from-[#2DD4BF]/20 to-[#111936] border-[#2DD4BF]/40",
    badgeColor: "text-[#2DD4BF] bg-[#2DD4BF]/10 border-[#2DD4BF]/30",
  },
  {
    id: "delivery",
    title: "Courier & Customs Fraud",
    category: "Logistics Vector",
    description: "SMS alerting of address errors or unpaid customs clearance fees on packages.",
    signals: ["Urgent micro-payments", "Fake tracking sites", "Shortened links"],
    graphicSvg: (
      <svg className="w-16 h-16 text-[#FB7185] opacity-90" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 24 L 32 16 L 48 24 L 32 32 Z" />
        <path d="M16 24 V 40 L 32 48 V 32" />
        <path d="M48 24 V 40 L 32 48" />
      </svg>
    ),
    accentColor: "from-[#FB7185]/20 to-[#111936] border-[#FB7185]/40",
    badgeColor: "text-[#FB7185] bg-[#FB7185]/10 border-[#FB7185]/30",
  },
  {
    id: "links",
    title: "Malicious Links & APKs",
    category: "Device Risk Vector",
    description: "Malware-laden APK downloads disguised as official banking or utility apps.",
    signals: ["Sideloading prompt", "SMS permission abuse", "Non-Play Store link"],
    graphicSvg: (
      <svg className="w-16 h-16 text-[#FF4D5A] opacity-90" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="24" cy="32" r="10" />
        <circle cx="40" cy="32" r="10" />
        <line x1="28" y1="32" x2="36" y2="32" stroke="#FF4D5A" strokeWidth="3" />
      </svg>
    ),
    accentColor: "from-[#FF4D5A]/20 to-[#111936] border-[#FF4D5A]/40",
    badgeColor: "text-[#FF4D5A] bg-[#FF4D5A]/10 border-[#FF4D5A]/30",
  },
];

export function CylinderCarousel() {
  const [rotationY, setRotationY] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number>(0);
  const startRotationRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const cardCount = THREAT_CARDS.length;
  const angleStep = 360 / cardCount;
  const radius = 350; // px

  useEffect(() => {
    if (isPaused || isDragging) return;
    const timer = setInterval(() => {
      setRotationY((prev) => prev - 0.35);
    }, 30);
    return () => clearInterval(timer);
  }, [isPaused, isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    startRotationRef.current = rotationY;
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    setRotationY(startRotationRef.current + deltaX * 0.4);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (containerRef.current) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch { /* ignore */ }
    }
  };

  const rotateNext = useCallback(() => {
    setRotationY((prev) => Math.round((prev - angleStep) / angleStep) * angleStep);
  }, [angleStep]);

  const rotatePrev = useCallback(() => {
    setRotationY((prev) => Math.round((prev + angleStep) / angleStep) * angleStep);
  }, [angleStep]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") rotatePrev();
    if (e.key === "ArrowRight") rotateNext();
  };

  return (
    <section className="w-full py-12 px-2 sm:px-4 relative overflow-hidden" aria-label="3D Threat Atlas">
      <div className="space-y-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#F5F7FF]/10 pb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-[#4F6BFF] uppercase tracking-widest">
              <Eye className="w-4 h-4 text-[#4F6BFF]" />
              <span>3D THREAT ATLAS</span>
            </div>
            <h2 className="text-3xl font-serif font-normal text-[#F5F7FF] mt-1">
              THE THREATS WE WATCH
            </h2>
            <p className="text-xs text-[#AAB4D0] mt-1 max-w-xl font-sans">
              Our policy engine correlates multi-vector signals to intercept financial scam attempts before execution.
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2.5 rounded-xl border border-[#F5F7FF]/10 hover:border-[#F5F7FF]/20 bg-[#111936] text-[#AAB4D0] hover:text-[#F5F7FF] transition-all text-xs flex items-center gap-1.5"
              aria-label={isPaused ? "Play Carousel" : "Pause Carousel"}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span className="hidden md:inline font-mono text-[11px]">{isPaused ? "Resume" : "Pause"}</span>
            </button>
            <button
              onClick={rotatePrev}
              className="p-2.5 rounded-xl border border-[#F5F7FF]/10 hover:border-[#F5F7FF]/20 bg-[#111936] text-[#AAB4D0] hover:text-[#F5F7FF] transition-all"
              aria-label="Previous Threat"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={rotateNext}
              className="p-2.5 rounded-xl border border-[#F5F7FF]/10 hover:border-[#F5F7FF]/20 bg-[#111936] text-[#AAB4D0] hover:text-[#F5F7FF] transition-all"
              aria-label="Next Threat"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3D Cylinder Container (Desktop & Tablet) */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className="hidden sm:block relative h-[380px] w-full perspective-1000 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-[#4F6BFF]/50 rounded-3xl"
        >
          <div
            className="w-full h-full relative transform-style-3d transition-transform duration-75 ease-out"
            style={{
              transform: `translateZ(-${radius}px) rotateY(${rotationY}deg)`,
            }}
          >
            {THREAT_CARDS.map((card, index) => {
              const cardAngle = index * angleStep;
              return (
                <div
                  key={card.id}
                  className="absolute top-1/2 left-1/2 -mt-[140px] -ml-[140px] w-[280px] h-[280px] backface-hidden"
                  style={{
                    transform: `rotateY(${cardAngle}deg) translateZ(${radius}px)`,
                  }}
                >
                  <div
                    className={`h-full w-full p-6 rounded-2xl bg-[#111936] border bg-gradient-to-b ${card.accentColor} shadow-2xl backdrop-blur-md flex flex-col justify-between transition-all hover:scale-[1.02]`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-mono px-2.5 py-1 rounded border uppercase tracking-wider ${card.badgeColor}`}>
                          {card.category}
                        </span>
                      </div>

                      {/* Abstract Graphic SVG Composition */}
                      <div className="flex items-center justify-center my-3">
                        {card.graphicSvg}
                      </div>

                      <h3 className="text-base font-bold text-[#F5F7FF] tracking-tight font-sans">
                        {card.title}
                      </h3>
                      <p className="text-xs text-[#AAB4D0] mt-1 leading-relaxed font-sans">
                        {card.description}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-[#F5F7FF]/08">
                      <span className="text-[10px] font-mono text-[#4F6BFF] font-semibold uppercase tracking-wider block">
                        Traced Markers:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {card.signals.map((sig, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B1020] text-[#6C7A9C] border border-[#F5F7FF]/08"
                          >
                            {sig}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Horizontal Carousel Fallback */}
        <div className="sm:hidden flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x snap-mandatory">
          {THREAT_CARDS.map((card) => (
            <div
              key={card.id}
              className={`snap-center shrink-0 w-[270px] p-5 rounded-2xl bg-[#111936] border bg-gradient-to-b ${card.accentColor} flex flex-col justify-between`}
            >
              <div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${card.badgeColor}`}>
                  {card.category}
                </span>

                <div className="flex items-center justify-center my-3">
                  {card.graphicSvg}
                </div>

                <h3 className="text-sm font-bold text-[#F5F7FF]">{card.title}</h3>
                <p className="text-xs text-[#AAB4D0] mt-1 leading-relaxed font-sans">
                  {card.description}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-[#F5F7FF]/08 space-y-1">
                <span className="text-[10px] font-mono text-[#4F6BFF] font-semibold uppercase block">
                  Traced Markers:
                </span>
                <div className="flex flex-wrap gap-1">
                  {card.signals.map((sig, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B1020] text-[#6C7A9C]"
                    >
                      {sig}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
