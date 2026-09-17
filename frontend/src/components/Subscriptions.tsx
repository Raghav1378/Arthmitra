"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Repeat, Plus, XCircle, Trash2, CalendarClock, Flame, Wallet, TrendingUp,
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/utils";

interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "yearly";
  category: string;
  next_due: string;
  active: number;
  created_at: string;
}

interface SubsData {
  subscriptions: Subscription[];
  stats: { monthly_burn: number; yearly_burn: number; active_count: number };
}

const CATEGORY_COLORS: Record<string, string> = {
  streaming: "#e58ab8", utility: "#7fb7a5", fitness: "#e8a33d",
  music: "#c9a0dc", software: "#3fae7c", education: "#dfb25f",
  other: "#8d8672",
};

const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

// Due within N days (negative = overdue)
const dueInDays = (iso: string): number | null => {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
};

export default function Subscriptions() {
  const [data, setData] = useState<SubsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // form
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "yearly">("monthly");
  const [category, setCategory] = useState("streaming");
  const [nextDue, setNextDue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/subscriptions`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e.message || "Could not load subscriptions.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim() || !amount) return;
    setSaving(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, amount: parseFloat(amount), frequency, category, next_due: nextDue || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || `Server error: ${res.status}`);
      setName(""); setAmount(""); setNextDue("");
      await load();
    } catch (e: any) {
      setError(e.message || "Could not add subscription.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`${getApiBaseUrl()}/subscriptions/${id}`, { method: "DELETE" });
    load();
  };

  const subs = data?.subscriptions ?? [];
  const active = subs.filter(s => s.active);
  const stats = data?.stats;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gold-500/15 border border-gold-500/25">
          <Repeat className="w-6 h-6 text-gold-600" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-parchment tracking-tight">Subscriptions</h2>
          <p className="text-xs text-parchment-faint">Recurring payments — find the money you forgot about</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.06]">
            <div className="flex items-center gap-2 mb-2 text-ledger-red">
              <Flame className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest font-display">Monthly Burn</span>
            </div>
            <p className="font-display text-3xl font-bold text-parchment">{inr(stats.monthly_burn)}</p>
          </div>
          <div className="p-5 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.06]">
            <div className="flex items-center gap-2 mb-2 text-gold-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest font-display">Yearly Burn</span>
            </div>
            <p className="font-display text-3xl font-bold text-parchment">{inr(stats.yearly_burn)}</p>
          </div>
          <div className="p-5 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.06]">
            <div className="flex items-center gap-2 mb-2 text-ledger-green">
              <Wallet className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest font-display">Active Subscriptions</span>
            </div>
            <p className="font-display text-3xl font-bold text-parchment">{stats.active_count}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {/* Add form */}
      <div className="p-5 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.06] space-y-4">
        <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display">Add Recurring Payment</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className="input-field" placeholder="Name (Netflix, Gym, Jio…)" value={name}
            onChange={e => setName(e.target.value)} disabled={saving} />
          <input className="input-field" placeholder="Amount (₹)" type="number" min="1" value={amount}
            onChange={e => setAmount(e.target.value)} disabled={saving} />
          <select className="input-field" value={frequency} onChange={e => setFrequency(e.target.value as any)} disabled={saving}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select className="input-field" value={category} onChange={e => setCategory(e.target.value)} disabled={saving}>
            {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
          </select>
          <input className="input-field" placeholder="Next due" type="date" value={nextDue}
            onChange={e => setNextDue(e.target.value)} disabled={saving} />
        </div>
        <button onClick={add} disabled={saving || !name.trim() || !amount}
          className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto px-6">
          <Plus className="w-4 h-4" /> Add Subscription
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence>
          {active.map(s => {
            const days = dueInDays(s.next_due);
            const dueSoon = days !== null && days <= 7;
            const overdue = days !== null && days < 0;
            return (
              <motion.div key={s.id} layout
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-ink-900/[0.03] border border-ink-900/[0.06] hover:border-ink-900/[0.12] transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[s.category] || CATEGORY_COLORS.other }}>
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-parchment truncate">{s.name}</p>
                  <p className="text-xs text-parchment-faint">
                    {s.category} · {inr(s.amount)}/{s.frequency === "monthly" ? "mo" : "yr"}
                  </p>
                </div>
                {days !== null && (
                  <span className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border
                    ${overdue ? "bg-red-500/10 border-red-500/30 text-red-600"
                      : dueSoon ? "bg-amber-500/10 border-amber-500/30 text-amber-700"
                      : "bg-ink-900/[0.03] border-ink-900/[0.08] text-parchment-faint"}`}>
                    <CalendarClock className="w-3 h-3" />
                    {overdue ? `${-days}d overdue` : dueSoon ? `due in ${days}d` : `due ${s.next_due}`}
                  </span>
                )}
                <span className="font-display font-bold text-parchment text-lg shrink-0">
                  {inr(s.frequency === "yearly" ? s.amount / 12 : s.amount)}
                  <span className="text-[10px] text-parchment-faint font-sans">/mo</span>
                </span>
                <button onClick={() => remove(s.id)} title="Remove"
                  className="text-parchment-faint hover:text-red-500 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {subs.length === 0 && !error && (
          <div className="p-12 text-center text-parchment-faint space-y-3">
            <Repeat className="w-10 h-10 mx-auto opacity-40" />
            <p className="text-sm">No subscriptions yet. Add Netflix, gym, EMI — everything that auto-charges you.</p>
          </div>
        )}
      </div>

      {/* Insight */}
      {stats && stats.active_count > 0 && (
        <div className="flex items-start gap-3 p-5 rounded-2xl bg-gold-500/[0.06] border border-gold-500/20">
          <XCircle className="w-5 h-5 text-gold-600 shrink-0 mt-0.5" />
          <p className="text-sm text-parchment-dim leading-relaxed">
            You spend <span className="font-bold text-parchment">{inr(stats.yearly_burn)}/year</span> on recurring payments.
            Cancel one ₹500/month subscription you barely use and you save <span className="font-bold text-ledger-green">{inr(6000)}/year</span>.
          </p>
        </div>
      )}
    </div>
  );
}
