"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Plus, Trash2, TrendingDown, TrendingUp, CheckCircle2, Flag } from "lucide-react";
import { getApiBaseUrl } from "@/lib/utils";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  target_date: string;
  created_at: string;
}

const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

const monthsLeft = (iso: string): number | null => {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return Math.max(0, (d.getFullYear() - new Date().getFullYear()) * 12
    + d.getMonth() - new Date().getMonth());
};

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [error, setError] = useState<string | null>(null);
  // form
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
  // quick contribute inputs per goal
  const [contrib, setContrib] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/goals`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setGoals(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e.message || "Could not load goals.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!title.trim() || !target) return;
    setSaving(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, target_amount: parseFloat(target),
          saved_amount: saved ? parseFloat(saved) : 0,
          target_date: targetDate || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || `Server error: ${res.status}`);
      setTitle(""); setTarget(""); setSaved(""); setTargetDate("");
      await load();
    } catch (e: any) {
      setError(e.message || "Could not add goal.");
    } finally {
      setSaving(false);
    }
  };

  const contribute = async (id: string) => {
    const amt = parseFloat(contrib[id] || "");
    if (!amt) return;
    await fetch(`${getApiBaseUrl()}/goals/${id}/contribute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amt }),
    });
    setContrib(c => ({ ...c, [id]: "" }));
    load();
  };

  const remove = async (id: string) => {
    await fetch(`${getApiBaseUrl()}/goals/${id}`, { method: "DELETE" });
    load();
  };

  const totalTarget = goals.reduce((a, g) => a + g.target_amount, 0);
  const totalSaved = goals.reduce((a, g) => a + g.saved_amount, 0);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gold-500/15 border border-gold-500/25">
          <Target className="w-6 h-6 text-gold-600" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-parchment tracking-tight">Savings Goals</h2>
          <p className="text-xs text-parchment-faint">Sankalp — every goal needs a plan</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {/* Summary */}
      {goals.length > 0 && (
        <div className="p-5 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.06]">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
            <div>
              <p className="text-[10px] font-black text-parchment-faint uppercase tracking-widest font-display mb-1">Total Progress</p>
              <p className="font-display text-3xl font-bold text-parchment">
                {inr(totalSaved)} <span className="text-base text-parchment-faint">/ {inr(totalTarget)}</span>
              </p>
            </div>
            <span className="font-display text-2xl font-bold text-ledger-green">
              {Math.round((totalSaved / totalTarget) * 100)}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-ink-900/[0.06] overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              initial={{ width: 0 }} animate={{ width: `${(totalSaved / totalTarget) * 100}%` }} transition={{ duration: 0.8 }} />
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="p-5 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.06] space-y-4">
        <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">New Goal</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="input-field" placeholder="Goal (Emergency fund, Bike…)" value={title}
            onChange={e => setTitle(e.target.value)} disabled={saving} />
          <input className="input-field" placeholder="Target (₹)" type="number" min="1" value={target}
            onChange={e => setTarget(e.target.value)} disabled={saving} />
          <input className="input-field" placeholder="Already saved (₹)" type="number" min="0" value={saved}
            onChange={e => setSaved(e.target.value)} disabled={saving} />
          <input className="input-field" placeholder="Target date" type="date" value={targetDate}
            onChange={e => setTargetDate(e.target.value)} disabled={saving} />
        </div>
        <button onClick={add} disabled={saving || !title.trim() || !target}
          className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto px-6">
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      </div>

      {/* Goal cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {goals.map(g => {
            const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
            const remaining = g.target_amount - g.saved_amount;
            const mLeft = monthsLeft(g.target_date);
            const perMonth = mLeft && mLeft > 0 ? remaining / mLeft : null;
            const done = g.saved_amount >= g.target_amount;
            return (
              <motion.div key={g.id} layout
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
                className="p-5 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.06] space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {done
                      ? <CheckCircle2 className="w-6 h-6 text-ledger-green shrink-0" />
                      : <Flag className="w-5 h-5 text-gold-600 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-parchment truncate">{g.title}</p>
                      <p className="text-xs text-parchment-faint">
                        {inr(g.saved_amount)} / {inr(g.target_amount)}{g.target_date && !done ? ` · by ${g.target_date}` : ""}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => remove(g.id)} className="text-parchment-faint hover:text-red-500 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-2.5 rounded-full bg-ink-900/[0.06] overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${done ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-gold-400 to-gold-600"}`}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-lg font-bold text-parchment">{pct}%</span>
                  {done ? (
                    <span className="text-[10px] font-black uppercase tracking-widest text-ledger-green">Goal reached 🎉</span>
                  ) : perMonth !== null ? (
                    <span className={`flex items-center gap-1 text-xs font-bold ${perMonth > 0 ? "text-gold-600" : "text-red-600"}`}>
                      {perMonth > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {perMonth > 0 ? `Save ${inr(perMonth)}/mo to stay on track` : "Deadline passed"}
                    </span>
                  ) : (
                    <span className="text-xs text-parchment-faint">{inr(remaining)} to go</span>
                  )}
                </div>

                {!done && (
                  <div className="flex gap-2">
                    <input className="input-field flex-1" placeholder="Add savings (₹)" type="number" min="1"
                      value={contrib[g.id] || ""} onChange={e => setContrib(c => ({ ...c, [g.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && contribute(g.id)} />
                    <button onClick={() => contribute(g.id)}
                      className="px-4 rounded-xl bg-ledger-green/15 border border-ledger-green/30 text-ledger-green text-xs font-black uppercase tracking-wider hover:bg-ledger-green/25 transition-all">
                      Add
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {goals.length === 0 && !error && (
        <div className="p-12 text-center text-parchment-faint space-y-3">
          <Target className="w-10 h-10 mx-auto opacity-40" />
          <p className="text-sm">No goals yet. Start an emergency fund — 3 months of expenses is the classic first goal.</p>
        </div>
      )}
    </div>
  );
}
