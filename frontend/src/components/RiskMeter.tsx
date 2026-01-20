"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface RiskMeterProps {
  score: number; // 0 to 100
  label: string;
}

export default function RiskMeter({ score, label }: RiskMeterProps) {
  const getColor = (val: number) => {
    if (val < 30) return 'text-emerald-400';
    if (val < 70) return 'text-amber-400';
    return 'text-red-500';
  };

  const getStrokeDash = (val: number) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    return circumference - (val / 100) * circumference;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/50 border border-slate-800 rounded-2xl relative overflow-hidden group">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-slate-800"
          />
          <motion.circle
            cx="64"
            cy="64"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 40}
            initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
            animate={{ strokeDashoffset: getStrokeDash(score) }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={getColor(score)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${getColor(score)}`}>{score}%</span>
        </div>
      </div>
      <h4 className="mt-4 font-semibold text-slate-200">{label}</h4>
      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
        <div className={`w-2 h-2 rounded-full animate-ping ${getColor(score).replace('text', 'bg')}`} />
      </div>
    </div>
  );
}
