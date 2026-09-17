// ArthMitra UI primitives — the one source of visual truth.
// Surfaces: vault-950 page → vault-900 panel → vault-800 raised.
// Primary = sapphire. Gold = wealth/premium only. Risk = ledger colors,
// and NEVER color alone: every risk primitive carries an icon + text label.

"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, animate, type HTMLMotionProps } from "framer-motion";
import { CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Risk tokens ─────────────────────────────────────────────────
   Every risk surface is built from one map so SAFE/SUSPICIOUS/HIGH_RISK
   are visually identical wherever they appear. `icon` guarantees the
   state is legible without color. */
export type RiskLevel = "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "UNKNOWN";

export const RISK: Record<RiskLevel, {
  label: string;
  text: string;      // text color (on dark)
  softBg: string;    // tinted surface
  border: string;
  dot: string;       // solid dot / icon fill
  icon: React.ComponentType<{ className?: string }>;
}> = {
  SAFE:      { label: "Safe",      text: "text-emerald-300", softBg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400", icon: ShieldCheck },
  SUSPICIOUS:{ label: "Suspicious",text: "text-amber-300",   softBg: "bg-amber-500/10",   border: "border-amber-500/30",   dot: "bg-amber-400",   icon: AlertTriangle },
  HIGH_RISK: { label: "High Risk", text: "text-red-300",     softBg: "bg-red-500/10",     border: "border-red-500/40",     dot: "bg-red-400",     icon: ShieldAlert },
  UNKNOWN:   { label: "Unknown",   text: "text-parchment-faint", softBg: "bg-ink-900/[0.04]", border: "border-ink-900/[0.1]", dot: "bg-parchment-ghost", icon: HelpCircle },
};

/** Normalize any backend risk string ("LOW"/"HIGH"/"SAFE"/…) into a RISK key. */
export function asRisk(r?: string | null): RiskLevel {
  if (!r) return "UNKNOWN";
  const s = r.toUpperCase();
  if (s === "SAFE" || s === "LOW") return "SAFE";
  if (s === "SUSPICIOUS" || s === "MEDIUM") return "SUSPICIOUS";
  if (s === "HIGH_RISK" || s === "HIGH") return "HIGH_RISK";
  return "UNKNOWN";
}

/** Risk verdict badge: icon + label + tint. Color is never the only cue. */
export function RiskBadge({ risk, size = "md", className }: {
  risk: RiskLevel | string; size?: "sm" | "md" | "lg"; className?: string;
}) {
  const t = RISK[asRisk(risk)];
  const sizes = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-3 py-1 gap-1.5",
    lg: "text-sm px-4 py-1.5 gap-2",
  } as const;
  const Icon = t.icon;
  return (
    <span
      role="status"
      aria-label={`Risk level: ${t.label}`}
      className={cn("inline-flex items-center font-bold uppercase tracking-wider rounded-full border", t.text, t.softBg, t.border, sizes[size], className)}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5"} />
      {t.label}
    </span>
  );
}

/** Small risk dot + label for dense lists (history rows, transaction lines). */
export function RiskDot({ risk, showLabel = false }: { risk: RiskLevel | string; showLabel?: boolean }) {
  const t = RISK[asRisk(risk)];
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Risk: ${t.label}`}>
      <span className={cn("w-2 h-2 rounded-full", t.dot)} />
      {showLabel && <span className={cn("text-[10px] font-bold uppercase tracking-wider", t.text)}>{t.label}</span>}
    </span>
  );
}

/* ── Surface — the one card. variant: flat panel / raised / glass. ── */
export function Surface({ className, interactive, ...rest }: {
  className?: string; interactive?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-900/10 bg-vault-800/60 shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
        interactive && "transition-colors duration-200 hover:border-ink-900/[0.18] cursor-pointer",
        className,
      )}
      {...rest}
    />
  );
}

/* ── Button — sapphire primary, ghost secondary, danger, gold (premium). ── */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:   "bg-sapphire-500 hover:bg-sapphire-400 text-white border-transparent",
  secondary: "bg-ink-900/[0.06] hover:bg-ink-900/[0.1] text-parchment border-ink-900/20 hover:border-ink-900/40",
  ghost:     "bg-transparent hover:bg-ink-900/[0.06] text-parchment-dim hover:text-parchment border-transparent",
  danger:    "bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/40",
  gold:      "bg-gold-500/15 hover:bg-gold-500/25 text-gold-300 border-gold-500/40",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-6 py-2.5 text-sm rounded-xl gap-2",
};

export function Button({
  variant = "primary", size = "md", className, children, ...rest
}: {
  variant?: ButtonVariant; size?: ButtonSize;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold border",
        "transition-all duration-200 active:scale-[0.98]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-sapphire-300 focus-visible:outline-offset-2",
        "disabled:opacity-40 disabled:pointer-events-none",
        BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ── Badge — neutral info chip. For risk use RiskBadge. ── */
type BadgeTone = "neutral" | "sapphire" | "gold" | "success" | "warning" | "error";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral:  "bg-ink-900/[0.05] border-ink-900/[0.12] text-parchment-dim",
  sapphire: "bg-sapphire-500/10 border-sapphire-400/30 text-sapphire-300",
  gold:     "bg-gold-500/10 border-gold-500/30 text-gold-300",
  success:  "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  warning:  "bg-amber-500/10 border-amber-500/30 text-amber-300",
  error:    "bg-red-500/10 border-red-500/30 text-red-300",
};

export function Badge({ tone = "neutral", className, children }: {
  tone?: BadgeTone; className?: string; children: React.ReactNode;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border",
      "text-[11px] font-semibold tracking-wide",
      BADGE_TONES[tone], className,
    )}>
      {children}
    </span>
  );
}

/* ── Input — labeled field. Composes .input-field token styles. ── */
export function Input({
  label, hint, id, className, ...rest
}: {
  label?: string; hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? (label ? `field-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-parchment-faint mb-1.5">
          {label}
        </label>
      )}
      <input id={inputId} aria-label={label} className={cn("input-field", className)} {...rest} />
      {hint && <p className="mt-1 text-[11px] text-parchment-ghost">{hint}</p>}
    </div>
  );
}

/* ── AnimatedNumber — KPI figures count up once on mount. ── */
export function AnimatedNumber({ value, format }: {
  value: number; format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const controls = animate(prev.current, value, {
      type: "spring", stiffness: 90, damping: 20,
      onUpdate: (v: number) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);
  return <>{format ? format(display) : Math.round(display).toLocaleString("en-IN")}</>;
}

/* ── KPI / StatBlock — one figure + label + optional trend/suffix. ── */
export function KPI({
  label, value, format, suffix, trend, tone = "default", className,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  suffix?: React.ReactNode;
  trend?: { dir: "up" | "down"; text: string; good?: boolean };
  tone?: "default" | "gold" | "success" | "warning" | "error";
  className?: string;
}) {
  const valueTone = {
    default: "text-parchment",
    gold: "text-gold-300",
    success: "text-emerald-300",
    warning: "text-amber-300",
    error: "text-red-300",
  }[tone];
  return (
    <Surface className={cn("p-4 lg:p-5", className)}>
      <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.15em] font-display mb-1.5">
        {label}
      </p>
      <p className={cn("font-display text-2xl lg:text-3xl font-bold tnum leading-none", valueTone)}>
        <AnimatedNumber value={value} format={format} />
        {suffix && <span className="text-sm text-parchment-faint font-sans ml-1">{suffix}</span>}
      </p>
      {trend && (
        <p className={cn(
          "mt-2 text-xs font-semibold flex items-center gap-1",
          trend.good ? "text-emerald-300" : "text-red-300",
        )}>
          {trend.dir === "up" ? "▲" : "▼"} {trend.text}
        </p>
      )}
    </Surface>
  );
}

/* ── SectionHeader — eyebrow + title + optional action slot. ── */
export function SectionHeader({ eyebrow, title, action, className }: {
  eyebrow?: string; title: React.ReactNode; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-4", className)}>
      <div>
        {eyebrow && (
          <p className="text-[10px] font-black text-parchment-faint uppercase tracking-[0.2em] font-display mb-1">
            {eyebrow}
          </p>
        )}
        <h3 className="font-display text-lg font-semibold text-parchment tracking-tight">{title}</h3>
      </div>
      {action}
    </div>
  );
}

/* ── StatusIndicator — system/service health dot (API status, Ollama, etc.) ── */
export function StatusIndicator({ status, label, className }: {
  status: "ok" | "degraded" | "down" | "checking";
  label?: string;
  className?: string;
}) {
  const map = {
    ok:       { dot: "bg-emerald-400",  text: "text-emerald-300",  icon: CheckCircle2,  default: "Online" },
    degraded: { dot: "bg-amber-400",    text: "text-amber-300",    icon: AlertTriangle, default: "Degraded" },
    down:     { dot: "bg-red-400",      text: "text-red-300",      icon: ShieldAlert,   default: "Offline" },
    checking: { dot: "bg-parchment-ghost animate-pulse", text: "text-parchment-faint", icon: HelpCircle, default: "Checking" },
  } as const;
  const t = map[status];
  const Icon = t.icon;
  const text = label ?? t.default;
  return (
    <span
      role="status"
      aria-label={`Status: ${text}`}
      className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-ink-900/[0.05] border border-ink-900/[0.1] text-[11px] font-semibold", t.text, className)}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", t.dot)} aria-hidden="true" />
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {text}
    </span>
  );
}

/* ── PageTransition — standard view entrance wrapper. ── */
export function PageTransition(props: HTMLMotionProps<"div">) {
  return <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    {...props} />;
}
