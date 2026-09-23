"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare, Shield, PieChart,
  Settings, HelpCircle, GripVertical, Repeat, Target, Calculator, Brain, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Expense } from './ExpenseTracker';
import { cn } from "@/lib/utils";

// Design engineering constants
const EASE_OUT = [0.23, 1, 0.32, 1];

interface NavItem {
  id: string;
  label: string;
  icon: any;
  color: string;
  active: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'chat', label: 'Mitra Chat', icon: MessageSquare, color: 'text-accent-400', active: true },
  { id: 'expenses', label: 'Ledger', icon: PieChart, color: 'text-ledger-green', active: true },
  { id: 'security', label: 'Scam Shield', icon: Shield, color: 'text-ledger-red', active: true },
  { id: 'market', label: 'Market Intel', icon: Globe, color: 'text-ledger-amber', active: true },
  { id: 'subscriptions', label: 'Subscriptions', icon: Repeat, color: 'text-accent-400', active: true },
  { id: 'goals', label: 'Goals', icon: Target, color: 'text-accent-400', active: true },
  { id: 'emi', label: 'EMI Compare', icon: Calculator, color: 'text-ledger-green', active: true },
  { id: 'advisor', label: 'Advisor', icon: Brain, color: 'text-accent-400', active: true },
];

const secondaryItems = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Support', icon: HelpCircle },
];

const CATEGORY_COLORS: Record<string, string> = {
    Food: '#e5484d',
    Housing: '#dfb25f',
    Utilities: '#7fb7a5',
    Transport: '#3fae7c',
    Shopping: '#e8a33d',
    Earnings: '#3fae7c',
    Groceries: '#3fae7c',
    Education: '#c9a0dc',
    Entertainment: '#e58ab8',
    Fitness: '#e8a33d',
    Health: '#e5484d',
    Misc: '#8d8672'
};

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  expenses?: Expense[];
  onOpenSecurityAudit?: () => void;
}

export default function Sidebar({ activeView, onViewChange, isOpen, expenses = [], onOpenSecurityAudit }: SidebarProps) {
  const [width, setWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const minWidth = 80;
  const maxWidth = 480;
  const collapseThreshold = 180;

  // Mini-Distribution Logic (The "Ribbon")
  const distribution = useMemo(() => {
      if (expenses.length === 0) return [];
      const counts: Record<string, number> = {};
      let total = 0;
      expenses.forEach(e => {
        if (e.type === 'spend') {
          counts[e.category] = (counts[e.category] || 0) + e.amount;
          total += e.amount;
        }
      });
      if (total === 0) return [];
      return Object.entries(counts).map(([name, val]) => ({
          color: CATEGORY_COLORS[name] || '#8d8672',
          width: (val / total) * 100
      })).sort((a,b) => b.width - a.width).slice(0, 5);
  }, [expenses]);

  // This-month outflow/inflow/net for the footer summary
  const { monthlySpend, monthlyEarn } = useMemo(() => {
    const now = new Date();
    let spend = 0, earn = 0;
    expenses.forEach(e => {
      if (e.date.getFullYear() !== now.getFullYear() || e.date.getMonth() !== now.getMonth()) return;
      if (e.type === 'spend') spend += e.amount; else earn += e.amount;
    });
    return { monthlySpend: spend, monthlyEarn: earn };
  }, [expenses]);

  const securityMetrics = useMemo(() => {
    const highRisk = expenses.filter(e => e.riskInfo?.risk === 'HIGH_RISK').length;
    const suspicious = expenses.filter(e => e.riskInfo?.risk === 'SUSPICIOUS').length;
    const score = expenses.filter(e => e.riskInfo).length === 0 ? 100 : Math.max(0, 100 - (highRisk * 15) - (suspicious * 5));
    return { highRisk, suspicious, score };
  }, [expenses]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      let newWidth = e.clientX;
      if (newWidth < collapseThreshold) {
        setIsCollapsed(true);
        setWidth(minWidth);
      } else {
        setIsCollapsed(false);
        if (newWidth > maxWidth) newWidth = maxWidth;
        setWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <motion.aside
      initial={false}
      animate={{
        width: !isOpen ? 0 : (isCollapsed ? minWidth : width),
        opacity: isOpen ? 1 : 0,
        x: isOpen ? 0 : -20
      }}
      transition={isResizing ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT }}
      className="h-screen flex flex-col bg-vault-950/95 backdrop-blur-[60px] border-r border-accent-500/[0.14] relative z-30 shrink-0 select-none group/sidebar overflow-hidden shadow-2xl"
    >
      {/* ─── Resizer Handle ─── */}
      <div
        onMouseDown={startResizing}
        className={`absolute top-0 right-[-4px] w-2 h-full cursor-col-resize z-50 hover:bg-accent-500/30 transition-colors ${isResizing ? 'bg-accent-500/50' : ''}`}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
            {!isResizing && <GripVertical className="w-3 h-3 text-blue-100/70" />}
        </div>
      </div>

      <div className="flex flex-col h-full min-w-[280px]">
        {/* ─── Brand Header — engraved seal ─── */}
        <div className="p-6 flex items-center gap-4 border-b border-accent-500/[0.14] mb-4 relative overflow-hidden">
          {/* guilloche corner engraving */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full border border-accent-500/[0.08]" />
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full border border-accent-500/[0.06] mt-4 ml-4" />
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/25 shrink-0 border border-accent-300/30">
            <Shield className="w-5 h-5 text-ink-950" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col whitespace-nowrap">
            <h2 className="font-display text-xl font-semibold tracking-tight text-white leading-none">
              Arth<span className="text-accent-400">Mitra</span>
            </h2>
            <span className="font-mono text-[9px] text-blue-100/60 uppercase tracking-[0.28em] mt-1.5">अर्थ · मित्र · Ledger</span>
          </div>
        </div>

        {/* ─── Main Navigation ─── */}
        <nav className="flex-1 px-4 py-2 space-y-2 scrollbar-hide overflow-y-auto">
          {navItems.map((item: NavItem) => {
            const isExpenses = item.id === 'expenses';
            return (
              <button
                key={item.id}
                onClick={() => !item.badge && onViewChange(item.id)}
                className={cn(
                  "w-full group flex flex-col gap-3 px-4 py-4 rounded-xl transition-all duration-200 relative overflow-hidden active:scale-[0.97]",
                  activeView === item.id
                    ? "bg-gradient-to-r from-accent-500/[0.12] to-transparent text-white border border-accent-500/30 shadow-sm shadow-black/30"
                    : "text-blue-100/70 hover:text-white hover:bg-white/[0.08] border border-transparent",
                  item.badge && "opacity-40 cursor-not-allowed active:scale-100"
                )}
              >
                {/* active engraved left notch */}
                {activeView === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-accent-400 rounded-r" />
                )}
                <div className="flex items-center gap-4 w-full">
                  <div className="relative">
                    <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${activeView === item.id ? item.color : 'text-blue-200/50 group-hover:text-blue-100/80'}`} />
                    {item.id === 'expenses' && securityMetrics.highRisk > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-ledger-red rounded-full border-2 border-vault-950/95 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="text-sm font-medium tracking-tight truncate">{item.label}</span>
                    {item.id === 'expenses' && securityMetrics.highRisk > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenSecurityAudit?.(); }}
                        className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-ledger-red/15 border border-ledger-red/40 text-ledger-red font-semibold uppercase tracking-widest leading-none hover:bg-ledger-red hover:text-white transition-all shadow-lg active:scale-95"
                      >
                        {securityMetrics.highRisk} ALERT
                      </button>
                    )}
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-blue-100/70 font-semibold uppercase tracking-widest leading-none font-mono">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* --- LIVE CATEGORY RIBBON (Mini-Distribution) --- */}
                {isExpenses && distribution.length > 0 && !isCollapsed && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex w-full h-[3px] rounded-full overflow-hidden bg-white/10 mt-1">
                        {distribution.map((seg, idx) => (
                            <div key={idx} style={{ width: `${seg.width}%`, backgroundColor: seg.color }} className="h-full transition-all duration-1000" />
                        ))}
                    </motion.div>
                )}
              </button>
            )
          })}
        </nav>

        {/* ─── Footer ─── */}
        <div className="p-5 border-t border-accent-500/[0.14] bg-vault-900/55">
          {(monthlySpend > 0 || monthlyEarn > 0) && (
            <div className="mb-3 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 space-y-1.5">
              <p className="font-mono text-[8px] text-blue-100/60 uppercase tracking-[0.3em]">This Month</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-blue-100/70">Outflow</span>
                <span className="font-mono text-[11px] font-bold text-rose-300 tabular-nums">₹{monthlySpend.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-blue-100/70">Inflow</span>
                <span className="font-mono text-[11px] font-bold text-emerald-300 tabular-nums">₹{monthlyEarn.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white">Net</span>
                <span className={`font-mono text-[12px] font-black tabular-nums ${monthlyEarn - monthlySpend >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  ₹{(monthlyEarn - monthlySpend).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
          <div className="space-y-1">
            {secondaryItems.map((item) => (
              <button
                key={item.id}
                className="w-full flex items-center gap-4 px-4 py-3 text-blue-100/70 hover:text-white transition-all rounded-xl hover:bg-white/[0.06]"
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium tracking-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
