"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface RiskGaugeProps {
  score: number;
  risk: "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "LOW" | "HIGH";
  size?: number;
}

export function RiskGauge({ score, risk, size = 160 }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  const safeScore = Math.min(100, Math.max(0, Math.round(score)));

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1000;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(easedProgress * safeScore));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [safeScore]);

  const strokeWidth = 8; // Thin precision ring (Section 10)
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcPercentage = 0.72;
  const arcLength = circumference * arcPercentage;
  const dashOffset = arcLength - (arcLength * animatedScore) / 100;

  const isSafe = risk === "SAFE" || risk === "LOW";
  const isSuspicious = risk === "SUSPICIOUS";
  
  // Exact Color Semantics (Section 2)
  const strokeColor = isSafe
    ? "#35D0BA" // Mint
    : isSuspicious
    ? "#F4B860" // Amber
    : "#FF6B6B"; // Coral

  const glowFilterId = `glow-${risk}`;

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Risk score ${safeScore} out of 100`}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-[130deg] overflow-visible"
      >
        <defs>
          <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(120, 145, 210, 0.14)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />

        {/* Value Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          filter={`url(#${glowFilterId})`}
          style={{ transition: "stroke-dashoffset 0.1s linear" }}
        />
      </svg>

      {/* Center Score Readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-1">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-4xl font-mono font-bold tracking-tight text-[#F4F7FF]"
        >
          {animatedScore}
        </motion.span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#7F8DA8] mt-0.5">
          / 100 RISK
        </span>
      </div>
    </div>
  );
}
