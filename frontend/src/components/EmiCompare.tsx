"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Scale, Trophy } from "lucide-react";

interface LoanInput {
  label: string;
  principal: string;
  rate: string;    // % per annum
  years: string;
}

const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

// Standard EMI formula: P*r*(1+r)^n / ((1+r)^n - 1), r = monthly rate
function emi(principal: number, annualRate: number, months: number) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return principal * r * f / (f - 1);
}

function calc(input: LoanInput) {
  const p = parseFloat(input.principal);
  const rate = parseFloat(input.rate);
  const months = parseFloat(input.years) * 12;
  if (!p || !rate || !months) return null;
  const e = emi(p, rate, months);
  const total = e * months;
  return { emi: e, total, interest: total - p };
}

function LoanForm({ loan, onChange, accent }: {
  loan: LoanInput;
  onChange: (l: LoanInput) => void;
  accent: string;
}) {
  const set = (k: keyof LoanInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...loan, [k]: e.target.value });

  return (
    <div className="p-5 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.06] space-y-3">
      <input className="input-field" placeholder="Offer name (HDFC, SBI…)" value={loan.label} onChange={set("label")} />
      <div className="grid grid-cols-3 gap-2">
        <input className="input-field" placeholder="Loan (₹)" type="number" min="1" value={loan.principal} onChange={set("principal")} />
        <input className="input-field" placeholder="Rate %/yr" type="number" min="0.1" step="0.1" value={loan.rate} onChange={set("rate")} />
        <input className="input-field" placeholder="Years" type="number" min="0.5" step="0.5" value={loan.years} onChange={set("years")} />
      </div>
      <p className={`text-[10px] font-black uppercase tracking-widest font-display ${accent}`}>
        {loan.label || "Offer"}
      </p>
    </div>
  );
}

export default function EmiCompare() {
  const [a, setA] = useState<LoanInput>({ label: "Bank A", principal: "500000", rate: "9.5", years: "5" });
  const [b, setB] = useState<LoanInput>({ label: "Bank B", principal: "500000", rate: "10.5", years: "3" });

  const ra = calc(a);
  const rb = calc(b);
  const winner = ra && rb ? (ra.total <= rb.total ? "a" : "b") : null;
  const saving = ra && rb ? Math.abs(ra.total - rb.total) : null;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gold-500/15 border border-gold-500/25">
          <Calculator className="w-6 h-6 text-gold-600" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-parchment tracking-tight">EMI Compare</h2>
          <p className="text-xs text-parchment-faint">Two loan offers side by side — see the real cost, not the rate</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LoanForm loan={a} onChange={setA} accent="text-gold-600" />
        <LoanForm loan={b} onChange={setB} accent="text-ledger-green" />
      </div>

      {/* Results */}
      {ra && rb ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([["a", a, ra, "text-gold-600"], ["b", b, rb, "text-ledger-green"]] as const).map(([key, loan, r, accent]) => (
              <motion.div key={key} layout
                className={`p-5 rounded-2xl border space-y-4 transition-all ${
                  winner === key
                    ? "bg-ledger-green/[0.07] border-ledger-green/40"
                    : "bg-ink-900/[0.03] border-ink-900/[0.06]"}`}>
                <div className="flex items-center justify-between">
                  <p className={`text-[10px] font-black uppercase tracking-widest font-display ${accent}`}>
                    {loan.label || `Offer ${key.toUpperCase()}`}
                  </p>
                  {winner === key && (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-ledger-green">
                      <Trophy className="w-3.5 h-3.5" /> Cheaper
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-display text-3xl font-bold text-parchment">{inr(r.emi)}<span className="text-sm text-parchment-faint">/mo</span></p>
                  <p className="text-xs text-parchment-faint mt-1">
                    Total {inr(r.total)} · Interest {inr(r.interest)} ({Math.round((r.interest / parseFloat(loan.principal)) * 100)}% of loan)
                  </p>
                </div>
                {/* Interest share bar */}
                <div className="flex h-2.5 rounded-full overflow-hidden bg-ink-900/[0.06]">
                  <div className="h-full bg-ledger-green/70" style={{ width: `${(parseFloat(loan.principal) / r.total) * 100}%` }} />
                  <div className="h-full bg-red-400/70" style={{ width: `${(r.interest / r.total) * 100}%` }} />
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-ledger-green">Principal {inr(parseFloat(loan.principal))}</span>
                  <span className="text-red-400">Interest {inr(r.interest)}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Verdict */}
          <div className="flex items-start gap-3 p-5 rounded-2xl bg-gold-500/[0.06] border border-gold-500/20">
            <Scale className="w-5 h-5 text-gold-600 shrink-0 mt-0.5" />
            <p className="text-sm text-parchment-dim leading-relaxed">
              <span className="font-bold text-parchment">{winner === "a" ? a.label : b.label}</span> costs you{" "}
              <span className="font-bold text-ledger-green">{inr(saving!)}</span> less in total.
              But check the EMI fits your budget — the cheaper total often means the higher monthly bite.
            </p>
          </div>
        </>
      ) : (
        <div className="p-12 text-center text-parchment-faint space-y-3">
          <Calculator className="w-10 h-10 mx-auto opacity-40" />
          <p className="text-sm">Enter loan amount, rate and tenure for both offers to compare.</p>
        </div>
      )}

      <p className="text-[10px] text-parchment-faint font-mono uppercase tracking-widest text-center">
        EMI = P·r·(1+r)ⁿ / ((1+r)ⁿ−1) · r = monthly rate · n = months
      </p>
    </div>
  );
}
