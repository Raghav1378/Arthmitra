"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, Shield, PieChart, Activity, 
  Settings, HelpCircle, GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;    
  onToggle: () => void; 
}

const navItems = [
  { id: 'chat', label: 'Mitra Chat', icon: MessageSquare, color: 'text-cyan-400', active: true },
  { id: 'expenses', label: 'Expense Tracker', icon: PieChart, color: 'text-emerald-400', active: true },
  { id: 'security', label: 'Safety Check', icon: Shield, color: 'text-violet-400', active: true },
  { id: 'analytics', label: 'Net Worth', icon: Activity, color: 'text-amber-400', active: false, badge: 'Soon' },
];

const secondaryItems = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Support', icon: HelpCircle },
];

export default function Sidebar({ activeView, onViewChange, isOpen }: SidebarProps) {
  const [width, setWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const minWidth = 80;
  const maxWidth = 480;
  const collapseThreshold = 180;

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
      transition={isResizing ? { duration: 0 } : { duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen flex flex-col bg-[#0d1221]/90 backdrop-blur-3xl border-r border-white/[0.06] relative z-30 shrink-0 select-none group/sidebar overflow-hidden"
    >
      {/* ─── Resizer Handle ─── */}
      <div
        onMouseDown={startResizing}
        className={`absolute top-0 right-[-4px] w-2 h-full cursor-col-resize z-50 hover:bg-cyan-500/30 transition-colors ${isResizing ? 'bg-cyan-500/50' : ''}`}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
            {!isResizing && <GripVertical className="w-3 h-3 text-slate-500" />}
        </div>
      </div>

      {/* ─── Sidebar Content (Wrapped) ─── */}
      <div className="flex flex-col h-full min-w-[280px]">
        {/* ─── Header & Logo (Display Font) ─── */}
        <div className="p-6 flex items-center gap-4 border-b border-white/[0.06] mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0 border border-white/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col whitespace-nowrap font-display">
            <h2 className="text-xl font-black tracking-tighter text-white uppercase leading-none">
              Arth<span className="text-cyan-400">Mitra</span>
            </h2>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 opacity-60">AI Guardian</span>
          </div>
        </div>

        {/* ─── Main Navigation ─── */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 scrollbar-hide overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.badge && onViewChange(item.id)}
              className={`w-full group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden
                ${activeView === item.id 
                  ? 'bg-gradient-to-r from-white/[0.08] to-transparent text-white border border-white/[0.08] shadow-sm shadow-black/20' 
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] active:scale-[0.98]'
                }
                ${item.badge ? 'opacity-40 cursor-not-allowed' : ''}
              `}
            >
              <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${activeView === item.id ? item.color : 'text-slate-500 group-hover:text-slate-300'}`} />
              <div className="flex-1 flex items-center justify-between overflow-hidden">
                <span className="text-sm font-bold tracking-tight truncate">{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-600 font-black uppercase tracking-widest leading-none font-display">
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          ))}
        </nav>

        {/* ─── Footer Section ─── */}
        <div className="p-5 border-t border-white/[0.06] bg-black/10">
          <div className="space-y-1">
            {secondaryItems.map((item) => (
              <button
                key={item.id}
                className="w-full flex items-center gap-4 px-4 py-3 text-slate-500 hover:text-slate-200 transition-all rounded-xl hover:bg-white/[0.04]"
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold tracking-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
