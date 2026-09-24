"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Zap, Lock, AlertTriangle, CheckCircle, Globe } from "lucide-react";

interface NodePoint {
  id: string;
  label: string;
  type: "safe" | "threat" | "process" | "hub";
  x: number; // percentage
  y: number; // percentage
  status: string;
}

const INITIAL_NODES: NodePoint[] = [
  { id: "hub", label: "POLICY HUB", type: "hub", x: 50, y: 50, status: "ACTIVE" },
  { id: "sms", label: "SMS PAYLOAD", type: "process", x: 18, y: 25, status: "EXTRACTING" },
  { id: "domain", label: "sbi-secure.top", type: "threat", x: 82, y: 22, status: "FLAGGED" },
  { id: "upi", label: "vpa@okaxis", type: "safe", x: 22, y: 75, status: "VERIFIED" },
  { id: "kyc", label: "PAN UPDATE", type: "threat", x: 78, y: 78, status: "HIGH_RISK" },
  { id: "behavior", label: "TIMING ANOMALY", type: "process", x: 50, y: 15, status: "CORRELATING" },
];

export function SignalField() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x: x * 20, y: y * 20 });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-full h-[360px] sm:h-[420px] rounded-3xl bg-[#0B1020] border border-[#F5F7FF]/10 overflow-hidden select-none p-4 shadow-2xl flex items-center justify-center"
      aria-label="Interactive Financial Signal Network Visualizer"
    >
      {/* ── Ambient Radial Lighting Fields ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#4F6BFF]/10 blur-[90px] rounded-full transition-transform duration-500 ease-out"
          style={{ transform: `translate(calc(-50% + ${mousePos.x * 0.5}px), calc(-50% + ${mousePos.y * 0.5}px))` }}
        />
        <div className="absolute bottom-4 right-4 w-[250px] h-[250px] bg-[#8B5CF6]/10 blur-[80px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(#F5F7FF_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.04]" />
      </div>

      {/* ── Connecting Trajectory Lines (SVG) ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {/* Draw paths from outer nodes to central hub */}
        <line x1="18%" y1="25%" x2="50%" y2="50%" stroke="rgba(79, 107, 255, 0.25)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="82%" y1="22%" x2="50%" y2="50%" stroke="rgba(255, 77, 90, 0.35)" strokeWidth="1.5" />
        <line x1="22%" y1="75%" x2="50%" y2="50%" stroke="rgba(45, 212, 191, 0.3)" strokeWidth="1.5" />
        <line x1="78%" y1="78%" x2="50%" y2="50%" stroke="rgba(255, 77, 90, 0.35)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="50%" y1="15%" x2="50%" y2="50%" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1.5" />

        {/* Outer Orbit Ring */}
        <circle cx="50%" cy="50%" r="35%" fill="none" stroke="rgba(245, 247, 255, 0.05)" strokeWidth="1" strokeDasharray="6 6" />
      </svg>

      {/* ── Interactive Signal Nodes ── */}
      <div
        className="relative w-full h-full z-10 transition-transform duration-300 ease-out"
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      >
        {INITIAL_NODES.map((node) => {
          const isHub = node.type === "hub";
          const isThreat = node.type === "threat";
          const isSafe = node.type === "safe";

          const nodeColor = isHub
            ? "border-[#4F6BFF] bg-[#111936] text-[#4F6BFF] shadow-[#4F6BFF]/30"
            : isThreat
            ? "border-[#FF4D5A]/40 bg-[#111936] text-[#FF4D5A]"
            : isSafe
            ? "border-[#2DD4BF]/40 bg-[#111936] text-[#2DD4BF]"
            : "border-[#8B5CF6]/40 bg-[#111936] text-[#8B5CF6]";

          return (
            <motion.div
              key={node.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 group cursor-pointer"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {/* Node Pulse Core */}
              <div className={`p-3 rounded-2xl border ${nodeColor} shadow-xl backdrop-blur-md transition-transform group-hover:scale-110`}>
                {isHub ? (
                  <Shield className="w-6 h-6 animate-pulse" />
                ) : isThreat ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : isSafe ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
              </div>

              {/* Node Label Block */}
              <div className="flex flex-col items-center text-center">
                <span className="font-mono text-[10px] font-bold tracking-wider text-[#F5F7FF] uppercase">
                  {node.label}
                </span>
                <span
                  className={`font-mono text-[9px] uppercase tracking-widest ${
                    isThreat ? "text-[#FF4D5A]" : isSafe ? "text-[#2DD4BF]" : "text-[#AAB4D0]"
                  }`}
                >
                  {node.status}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
