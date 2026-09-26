"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  MessageSquare, Shield, PieChart,
  Settings, HelpCircle, GripVertical, Repeat, Target, Calculator, Brain, Globe
} from "lucide-react";
import { motion } from "framer-motion";
import { Expense } from "./ExpenseTracker";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.2, 0, 0, 1];

interface NavItem {
  id: string;
  label: string;
  icon: any;
  color: string;
  active: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: "chat", label: "Mitra Chat", icon: MessageSquare, color: "text-[#4F6BFF]", active: true },
  { id: "expenses", label: "Ledger", icon: PieChart, color: "text-[#2DD4BF]", active: true },
  { id: "security", label: "Scam Shield", icon: Shield, color: "text-[#FF4D5A]", active: true },
  { id: "market", label: "Market Intel", icon: Globe, color: "text-[#FB7185]", active: true },
  { id: "subscriptions", label: "Subscriptions", icon: Repeat, color: "text-[#4F6BFF]", active: true },
  { id: "goals", label: "Goals", icon: Target, color: "text-[#4F6BFF]", active: true },
  { id: "emi", label: "EMI Compare", icon: Calculator, color: "text-[#2DD4BF]", active: true },
  { id: "advisor", label: "Advisor", icon: Brain, color: "text-[#8B5CF6]", active: true },
];

const secondaryItems = [
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help", label: "Support", icon: HelpCircle },
];

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#FF4D5A",
  Housing: "#8B5CF6",
  Utilities: "#4F6BFF",
  Transport: "#2DD4BF",
  Shopping: "#FB7185",
  Earnings: "#2DD4BF",
  Groceries: "#2DD4BF",
  Education: "#8B5CF6",
  Entertainment: "#FB7185",
  Fitness: "#4F6BFF",
  Health: "#FF4D5A",
  Misc: "#6C7A9C",
};

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  expenses?: Expense[];
  onOpenSecurityAudit?: () => void;
}

export default function Sidebar({
  activeView,
  onViewChange,
  isOpen,
  expenses = [],
  onOpenSecurityAudit,
}: SidebarProps) {
  const [width, setWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const minWidth = 80;
  const maxWidth = 480;
  const collapseThreshold = 180;

  const distribution = useMemo(() => {
    if (expenses.length === 0) return [];
    const counts: Record<string, number> = {};
    let total = 0;
    expenses.forEach((e) => {
      if (e.type === "spend") {
        counts[e.category] = (counts[e.category] || 0) + e.amount;
        total += e.amount;
      }
    });
    if (total === 0) return [];
    return Object.entries(counts)
      .map(([name, val]) => ({
        color: CATEGORY_COLORS[name] || "#6C7A9C",
        width: (val / total) * 100,
      }))
      .sort((a, b) => b.width - a.width)
      .slice(0, 5);
  }, [expenses]);

  const { monthlySpend, monthlyEarn } = useMemo(() => {
    const now = new Date();
    let spend = 0,
      earn = 0;
    expenses.forEach((e) => {
      if (
        e.date.getFullYear() !== now.getFullYear() ||
        e.date.getMonth() !== now.getMonth()
      )
        return;
      if (e.type === "spend") spend += e.amount;
      else earn += e.amount;
    });
    return { monthlySpend: spend, monthlyEarn: earn };
  }, [expenses]);

  const securityMetrics = useMemo(() => {
    const highRisk = expenses.filter((e) => e.riskInfo?.risk === "HIGH_RISK").length;
    const suspicious = expenses.filter((e) => e.riskInfo?.risk === "SUSPICIOUS").length;
    const score =
      expenses.filter((e) => e.riskInfo).length === 0
        ? 100
        : Math.max(0, 100 - highRisk * 15 - suspicious * 5);
    return { highRisk, suspicious, score };
  }, [expenses]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
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
    },
    [isResizing]
  );

  useEffect(() => {
    const syncResponsiveMode = () => {
      setIsCollapsed(window.innerWidth >= 768 && window.innerWidth < 1280);
    };

    syncResponsiveMode();
    window.addEventListener("resize", syncResponsiveMode);
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("resize", syncResponsiveMode);
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <motion.aside
      initial={false}
      animate={{
        width: !isOpen ? 0 : isCollapsed ? minWidth : width,
        opacity: isOpen ? 1 : 0,
        x: isOpen ? 0 : -20,
      }}
      transition={isResizing ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT }}
      className="h-screen flex flex-col bg-[#0B1020]/95 backdrop-blur-2xl border-r border-[#F5F7FF]/10 relative z-30 shrink-0 select-none group/sidebar overflow-hidden shadow-2xl max-[767px]:fixed max-[767px]:inset-y-0 max-[767px]:left-0 max-[767px]:z-50"
    >
      {/* Resizer handle */}
      <div
        onMouseDown={startResizing}
        className={`absolute top-0 right-[-4px] w-2 h-full cursor-col-resize z-50 hover:bg-[#4F6BFF]/40 transition-colors ${
          isResizing ? "bg-[#4F6BFF]/60" : ""
        }`}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
          {!isResizing && <GripVertical className="w-3 h-3 text-[#AAB4D0]" />}
        </div>
      </div>

      <div className={cn("flex flex-col h-full", isCollapsed ? "min-w-0 w-full" : "min-w-[280px]")}>
        {/* Brand Header */}
        <div className={cn("flex items-center border-b border-[#F5F7FF]/10 relative overflow-hidden", isCollapsed ? "justify-center p-3" : "gap-3.5 p-6")}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
             <img src="/assets/logo.png" alt="ArthMitra Logo" className="w-8 h-8 object-contain" />
          </div>
          <div className={cn("flex flex-col whitespace-nowrap", isCollapsed && "hidden")}>
            <h2 className="font-serif text-xl font-bold tracking-tight text-[#F5F7FF] leading-none">
              Arth<span className="italic text-[#4F6BFF]">Mitra</span>
            </h2>
            <span className="font-mono text-[9px] text-[#6C7A9C] uppercase tracking-widest mt-1.5">
              FINANCIAL SAFETY ENGINE
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 custom-scrollbar overflow-y-auto">
          {navItems.map((item: NavItem) => {
            const isExpenses = item.id === "expenses";
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => !item.badge && onViewChange(item.id)}
                className={cn(
                  "w-full group flex flex-col gap-2.5 px-3.5 py-3 rounded-xl transition-all duration-200 relative overflow-hidden active:scale-[0.98]",
                  isActive
                    ? "bg-[#182246] text-[#F5F7FF] border border-[#4F6BFF]/40 shadow-md"
                    : "text-[#AAB4D0] hover:text-[#F5F7FF] hover:bg-[#111936] border border-transparent",
                  item.badge && "opacity-40 cursor-not-allowed"
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#4F6BFF] rounded-r" />
                )}
                <div className="flex items-center gap-3.5 w-full">
                  <div className="relative">
                    <item.icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? item.color : "text-[#6C7A9C] group-hover:text-[#AAB4D0]"
                      }`}
                    />
                    {item.id === "expenses" && securityMetrics.highRisk > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF4D5A] rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className={cn("flex-1 flex items-center justify-between overflow-hidden font-sans", isCollapsed && "hidden")}>
                    <span className="text-xs font-medium tracking-tight truncate">
                      {item.label}
                    </span>
                    {item.id === "expenses" && securityMetrics.highRisk > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSecurityAudit?.();
                        }}
                        className="font-mono text-[9px] px-2 py-0.5 rounded bg-[#FF4D5A]/15 border border-[#FF4D5A]/30 text-[#FF4D5A] font-bold uppercase tracking-wider hover:bg-[#FF4D5A] hover:text-white transition-all"
                      >
                        {securityMetrics.highRisk} ALERT
                      </button>
                    )}
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-[#6C7A9C] font-mono uppercase">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Distribution Ribbon */}
                {isExpenses && distribution.length > 0 && !isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex w-full h-[3px] rounded-full overflow-hidden bg-white/10 mt-0.5"
                  >
                    {distribution.map((seg, idx) => (
                      <div
                        key={idx}
                        style={{ width: `${seg.width}%`, backgroundColor: seg.color }}
                        className="h-full"
                      />
                    ))}
                  </motion.div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Summary */}
        <div className={cn("border-t border-[#F5F7FF]/10 bg-[#0B1020] font-mono text-xs", isCollapsed ? "p-2" : "p-4")}>
          {(monthlySpend > 0 || monthlyEarn > 0) && (
            <div className="mb-3 p-3 rounded-xl bg-[#111936] border border-[#F5F7FF]/08 space-y-1.5">
              <span className="text-[9px] text-[#6C7A9C] uppercase tracking-wider block">
                MONTHLY FLOW
              </span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#6C7A9C]">Outflow</span>
                <span className="font-bold text-[#FB7185]">₹{monthlySpend.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#6C7A9C]">Inflow</span>
                <span className="font-bold text-[#2DD4BF]">₹{monthlyEarn.toLocaleString("en-IN")}</span>
              </div>
              <div className="pt-1.5 border-t border-[#F5F7FF]/08 flex items-center justify-between">
                <span className="font-bold text-[#F5F7FF]">Net</span>
                <span
                  className={`font-bold ${
                    monthlyEarn - monthlySpend >= 0 ? "text-[#2DD4BF]" : "text-[#FF4D5A]"
                  }`}
                >
                  ₹{(monthlyEarn - monthlySpend).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}
          <div className={cn("space-y-1", isCollapsed && "hidden")}>
            {secondaryItems.map((item) => (
              <button
                key={item.id}
                className="w-full flex items-center gap-3 px-3 py-2 text-[#6C7A9C] hover:text-[#F5F7FF] transition-all rounded-lg hover:bg-[#111936] text-xs font-sans"
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
