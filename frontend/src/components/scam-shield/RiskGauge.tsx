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
    const duration = 1200; // ms

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutCubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(easedProgress * safeScore));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [safeScore]);

  // Gauge calculations
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Use a 260-degree arc (leave 100 degrees empty at bottom)
  const arcPercentage = 0.72;
  const arcLength = circumference * arcPercentage;
  const dashOffset = arcLength - (arcLength * animatedScore) / 100;

  // Colors
  const isSafe = risk === "SAFE" || risk === "LOW";
  const isSuspicious = risk === "SUSPICIOUS";
  const strokeColor = isSafe
    ? "#10b981" // emerald-500
    : isSuspicious
    ? "#f59e0b" // amber-500
    : "#ef4444"; // red-500

  const glowColor = isSafe
    ? "rgba(16, 185, 129, 0.25)"
    : isSuspicious
    ? "rgba(245, 158, 11, 0.25)"
    : "rgba(239, 68, 68, 0.3)";

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
        {/* Glow Filter */}
        <defs>
          <filter id={`glow-${risk}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
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
          filter={`url(#glow-${risk})`}
          style={{ transition: "stroke-dashoffset 0.1s linear" }}
        />
      </svg>

      {/* Center Score Readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-2">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-4xl font-black font-mono tracking-tight text-white"
        >
          {animatedScore}
        </motion.span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-parchment-faint mt-0.5">
          / 100 RISK
        </span>
      </div>
    </div>
  );
}
