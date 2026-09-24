"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, Globe, IndianRupee, Lock, Zap,
  Gift, Briefcase, Truck, ArrowLeft, ArrowRight, ShieldCheck, Pause, Play
} from "lucide-react";

export interface ThreatCard {
  id: string;
  title: string;
  category: string;
  description: string;
  signals: string[];
  icon: React.ReactNode;
  accentColor: string;
}

const THREAT_CARDS: ThreatCard[] = [
  {
    id: "phishing",
    title: "Phishing & Spoofing",
    category: "Web & SMS",
    description: "Lookalike banking portals and fake login forms designed to steal credentials.",
    signals: ["Domain typos", "Punycode spoofing", "Urgent login demands"],
    icon: <Globe className="w-6 h-6 text-sky-400" />,
    accentColor: "from-sky-500/20 to-blue-600/10 border-sky-500/30",
  },
  {
    id: "upi",
    title: "UPI & QR Scams",
    category: "Payment Fraud",
    description: "Fake collect requests disguised as refunds, money transfers, or cashbacks.",
    signals: ["PIN entry for credit", "Unverified VPA handle", "Reversed pay flow"],
    icon: <IndianRupee className="w-6 h-6 text-emerald-400" />,
    accentColor: "from-emerald-500/20 to-teal-600/10 border-emerald-500/30",
  },
  {
    id: "kyc",
    title: "KYC & Expiry Fraud",
    category: "Identity Trap",
    description: "Panic-inducing SMS warning of imminent SIM, PAN, or bank account blocking.",
    signals: ["Unauthorized APKs", "Urgent deadline", "Third-party remote tools"],
    icon: <Lock className="w-6 h-6 text-amber-400" />,
    accentColor: "from-amber-500/20 to-orange-600/10 border-amber-500/30",
  },
  {
    id: "impersonation",
    title: "Brand Impersonation",
    category: "Social Engineering",
    description: "Fraudsters posing as bank officers, police, customs officials, or customer care.",
    signals: ["WhatsApp calls", "Demands for secrecy", "Off-platform payments"],
    icon: <ShieldAlert className="w-6 h-6 text-rose-400" />,
    accentColor: "from-rose-500/20 to-red-600/10 border-rose-500/30",
  },
  {
    id: "lottery",
    title: "Prize & Lottery Bait",
    category: "Reward Scams",
    description: "Fake KBC winnings, scratch card rewards, or lottery payouts requiring fee deposits.",
    signals: ["Processing fee upfront", "Unsolicited winnings", "Suspicious link"],
    icon: <Gift className="w-6 h-6 text-purple-400" />,
    accentColor: "from-purple-500/20 to-indigo-600/10 border-purple-500/30",
  },
  {
    id: "jobs",
    title: "Part-Time Job Traps",
    category: "Employment Scams",
    description: "High-paying Telegram 'YouTube view' or rating tasks that require security deposits.",
    signals: ["Prepaid tasks", "Telegram grouping", "Unrealistic returns"],
    icon: <Briefcase className="w-6 h-6 text-yellow-400" />,
    accentColor: "from-yellow-500/20 to-amber-600/10 border-yellow-500/30",
  },
  {
    id: "delivery",
    title: "Courier & Customs Fraud",
    category: "Delivery Scams",
    description: "SMS alerting of address issues or unpaid customs fees on unexpected packages.",
    signals: ["Urgent micro-payments", "Fake tracking sites", "Shortened links"],
    icon: <Truck className="w-6 h-6 text-teal-400" />,
    accentColor: "from-teal-500/20 to-cyan-600/10 border-teal-500/30",
  },
  {
    id: "links",
    title: "Malicious Links & APKs",
    category: "Device Risk",
    description: "Malware-laden APK downloads disguised as official bank apps or rewards apps.",
    signals: ["Sideloading prompt", "SMS permission abuse", "Non-Play Store link"],
    icon: <Zap className="w-6 h-6 text-red-400" />,
    accentColor: "from-red-500/20 to-rose-600/10 border-red-500/30",
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
  // Radius of the cylinder
  const radius = 340; // px

  // Auto rotation
  useEffect(() => {
    if (isPaused || isDragging) return;

    const timer = setInterval(() => {
      setRotationY((prev) => prev - 0.4);
    }, 30);

    return () => clearInterval(timer);
  }, [isPaused, isDragging]);

  // Mouse & Touch Drag Handlers
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
      } catch {
        /* ignore */
      }
    }
  };

  const rotateNext = useCallback(() => {
    setRotationY((prev) => Math.round((prev - angleStep) / angleStep) * angleStep);
  }, [angleStep]);

  const rotatePrev = useCallback(() => {
    setRotationY((prev) => Math.round((prev + angleStep) / angleStep) * angleStep);
  }, [angleStep]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      rotatePrev();
    } else if (e.key === "ArrowRight") {
      rotateNext();
    }
  };

  return (
    <section className="w-full py-12 px-4 sm:px-6 relative overflow-hidden" aria-label="Threat Surface Protection Showcase">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-widest text-accent-400">
              <ShieldCheck className="w-4 h-4 text-accent-400" />
              <span>THREAT SURFACE ANALYSIS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display mt-1">
              What ArthMitra Protects You From
            </h2>
            <p className="text-xs text-parchment-faint mt-1 max-w-xl">
              Our hybrid engine continuously monitors and flags multi-vector financial threats in real time.
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-vault-900 text-parchment-dim hover:text-white transition-all text-xs flex items-center gap-1.5"
              title={isPaused ? "Play Carousel" : "Pause Carousel"}
              aria-label={isPaused ? "Play Carousel" : "Pause Carousel"}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span className="hidden md:inline font-mono text-[11px]">{isPaused ? "Resume" : "Pause"}</span>
            </button>
            <button
              onClick={rotatePrev}
              className="p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-vault-900 text-parchment-dim hover:text-white transition-all"
              aria-label="Previous Threat"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={rotateNext}
              className="p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-vault-900 text-parchment-dim hover:text-white transition-all"
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
          className="hidden sm:block relative h-[380px] w-full perspective-1000 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-accent-500/50 rounded-3xl"
        >
          {/* Subtle Ambient Shield Spotlight */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
            <div className="w-[500px] h-[300px] bg-accent-500/[0.04] blur-[100px] rounded-full" />
          </div>

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
                    className={`h-full w-full p-6 rounded-3xl bg-vault-900/90 border bg-gradient-to-b ${card.accentColor} shadow-2xl backdrop-blur-md flex flex-col justify-between transition-all hover:scale-[1.02]`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10">
                          {card.icon}
                        </div>
                        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-parchment-faint uppercase tracking-wider">
                          {card.category}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {card.title}
                      </h3>
                      <p className="text-xs text-parchment-dim mt-2 leading-relaxed">
                        {card.description}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-white/[0.08]">
                      <span className="text-[10px] font-mono text-accent-400 font-semibold uppercase tracking-wider block">
                        Traced Signals:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {card.signals.map((sig, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-parchment-faint"
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
              className="snap-center shrink-0 w-[270px] p-5 rounded-2xl bg-vault-900 border border-white/10 bg-gradient-to-b ${card.accentColor} flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10">
                    {card.icon}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-parchment-faint">
                    {card.category}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{card.title}</h3>
                <p className="text-xs text-parchment-dim mt-1.5 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-white/[0.08] space-y-1">
                <span className="text-[10px] font-mono text-accent-400 font-semibold uppercase block">
                  Traced Signals:
                </span>
                <div className="flex flex-wrap gap-1">
                  {card.signals.map((sig, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-parchment-faint"
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
