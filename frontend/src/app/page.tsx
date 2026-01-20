"use client";

import React from 'react';
import { Shield, Brain, Calculator, TrendingUp } from 'lucide-react';
import PanicButton from '../components/PanicButton';
import RiskMeter from '../components/RiskMeter';
import Chat from '../components/Chat';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                ArthMitra
              </h1>
              <p className="text-slate-400 text-sm font-medium">AI Financial Guardian</p>
            </div>
          </div>
          <PanicButton />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Analytics & Risk */}
          <div className="lg:col-span-1 space-y-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Safety Dashboard
            </h2>
            
            <RiskMeter score={85} label="UPI Link Integrity" />
            <RiskMeter score={12} label="Spending Anomaly" />
            
            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-400" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors">
                  Calculated GST Savings
                </button>
                <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors">
                  Check Loan Eligibility
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Chat interface */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              Mitra Orchestrator
            </h2>
            <Chat />
          </div>
        </div>

        <section className="bg-slate-900/30 border border-slate-800 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500" />
          <h2 className="text-2xl font-semibold mb-4">Phase 1 & 2 Deployment Success</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            The LangGraph orchestrator is now synchronized with the frontend. Security checks use The Shield (Groq), 
            while auditing is handled by The Auditor (DeepSeek). Your Mitra assistant is ready for Hinglish support.
          </p>
        </section>
      </div>
    </main>
  );
}
