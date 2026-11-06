"use client";
import clsx from "clsx";
import {
  CircleDashed, PauseCircle, Megaphone, UserCheck, XCircle, Truck, RotateCcw, CheckCircle2, Lock,
  FileEdit, Calculator, Send, ThumbsUp, ThumbsDown, AlertTriangle, Eye, Clock, Banknote, Ban, FileWarning,
  ArrowUp, ArrowRight, ArrowDown,
} from "lucide-react";
import type { InvoiceStatus, QuoteStatus, RoleStatus, Urgency, WOStatus } from "@/lib/types";
import type { ReactNode } from "react";

type Tone = "holding" | "posted" | "assigned" | "responding" | "incomplete" | "declined" | "complete";

const toneStyle = (t: Tone) => ({ color: `var(--s-${t})`, background: `var(--s-${t}-bg)` });

function Pill({ tone, icon, children, size = "md" }: { tone: Tone; icon: ReactNode; children: ReactNode; size?: "sm" | "md" }) {
  return (
    <span
      style={toneStyle(tone)}
      className={clsx("inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "px-1.5 py-px text-[11.5px]" : "px-2 py-0.5 text-[12.5px]")}
    >
      {icon}
      {children}
    </span>
  );
}

const I = 13;

export function RoleStatusBadge({ s, size }: { s: RoleStatus; size?: "sm" | "md" }) {
  const map: Record<RoleStatus, [Tone, ReactNode]> = {
    Holding: ["holding", <PauseCircle key="i" size={I} />],
    Posted: ["posted", <Megaphone key="i" size={I} />],
    Assigned: ["assigned", <UserCheck key="i" size={I} />],
    Declined: ["declined", <XCircle key="i" size={I} />],
    Responding: ["responding", <Truck key="i" size={I} />],
    Incomplete: ["incomplete", <RotateCcw key="i" size={I} />],
    Complete: ["complete", <CheckCircle2 key="i" size={I} />],
  };
  const [tone, icon] = map[s];
  return <Pill tone={tone} icon={icon} size={size}>{s}</Pill>;
}

export function WOStatusBadge({ s, size }: { s: WOStatus; size?: "sm" | "md" }) {
  const map: Record<WOStatus, [Tone, ReactNode]> = {
    Unassigned: ["holding", <CircleDashed key="i" size={I} />],
    Assigned: ["assigned", <UserCheck key="i" size={I} />],
    Responding: ["responding", <Truck key="i" size={I} />],
    Incomplete: ["incomplete", <RotateCcw key="i" size={I} />],
    Complete: ["complete", <CheckCircle2 key="i" size={I} />],
    Closed: ["holding", <Lock key="i" size={I} />],
  };
  const [tone, icon] = map[s];
  return <Pill tone={tone} icon={icon} size={size}>{s}</Pill>;
}

export function QuoteStatusBadge({ s, size }: { s: QuoteStatus; size?: "sm" | "md" }) {
  const map: Record<QuoteStatus, [Tone, ReactNode, string]> = {
    Draft: ["holding", <FileEdit key="i" size={I} />, "Draft"],
    Pricing: ["responding", <Calculator key="i" size={I} />, "Needs pricing"],
    Sent: ["assigned", <Send key="i" size={I} />, "Sent · on portal"],
    Approved: ["complete", <ThumbsUp key="i" size={I} />, "Approved"],
    Declined: ["declined", <ThumbsDown key="i" size={I} />, "Declined"],
  };
  const [tone, icon, label] = map[s];
  return <Pill tone={tone} icon={icon} size={size}>{label}</Pill>;
}

export function InvoiceStatusBadge({ s, size }: { s: InvoiceStatus; size?: "sm" | "md" }) {
  const map: Record<InvoiceStatus, [Tone, ReactNode]> = {
    Draft: ["holding", <FileEdit key="i" size={I} />],
    "Review Reqd": ["responding", <Eye key="i" size={I} />],
    "Changes Reqd": ["incomplete", <FileWarning key="i" size={I} />],
    "PO Requested": ["posted", <Clock key="i" size={I} />],
    Approved: ["assigned", <ThumbsUp key="i" size={I} />],
    Sent: ["assigned", <Send key="i" size={I} />],
    Paid: ["complete", <Banknote key="i" size={I} />],
    Cancelled: ["declined", <Ban key="i" size={I} />],
  };
  const [tone, icon] = map[s];
  return <Pill tone={tone} icon={icon} size={size}>{s}</Pill>;
}

export function UrgencyTag({ u }: { u: Urgency }) {
  const cfg = {
    High: { c: "var(--danger)", i: <ArrowUp size={12} strokeWidth={2.5} /> },
    Medium: { c: "var(--text-2)", i: <ArrowRight size={12} strokeWidth={2.5} /> },
    Low: { c: "var(--text-3)", i: <ArrowDown size={12} strokeWidth={2.5} /> },
  }[u];
  return <span className="inline-flex items-center gap-0.5 text-[12.5px] font-medium" style={{ color: cfg.c }}>{cfg.i}{u}</span>;
}

export function Avatar({ initials, size = 24, title }: { initials: string; size?: number; title?: string }) {
  // Deterministic, low-chroma hue per person so lanes are distinguishable without shouting
  const hue = [...initials].reduce((a, c) => a + c.charCodeAt(0) * 37, 0) % 360;
  return (
    <span title={title} className="inline-grid place-items-center rounded-full font-semibold shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.4, background: `oklch(0.9 0.04 ${hue})`, color: `oklch(0.38 0.08 ${hue})` }}>
      {initials}
    </span>
  );
}

export function MarginMeter({ margin, threshold = 0.2, uncertain }: { margin: number | null; threshold?: number; uncertain?: boolean }) {
  if (margin == null) return <span className="text-ink-3">—</span>;
  const low = margin < threshold || !!uncertain;
  const neg = margin < 0;
  const w = Math.max(0, Math.min(1, margin / 0.6));
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative h-1.5 w-16 rounded-full bg-sunken overflow-hidden">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${w * 100}%`, background: neg ? "var(--danger)" : low ? "var(--warn)" : "var(--ok)" }} />
        <span className="absolute inset-y-0 w-px bg-ink-3" style={{ left: `${(threshold / 0.6) * 100}%` }} />
      </span>
      <span className="num font-medium inline-flex items-center gap-1" style={{ color: neg ? "var(--danger)" : low ? "var(--warn)" : "var(--text)" }}>
        {low && <AlertTriangle size={12} />}{(margin * 100).toFixed(1)}%{uncertain && "?"}
      </span>
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-10 text-center text-ink-3">{children}</div>;
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {sub && <p className="text-ink-2 mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="label block mb-1">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}

export function Chip({ active, onClick, children, count }: { active?: boolean; onClick?: () => void; children: ReactNode; count?: number }) {
  return (
    <button onClick={onClick}
      className={clsx("inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[13px] font-medium transition-colors",
        active ? "bg-primary-soft border-primary text-primary" : "border-line-strong text-ink-2 hover:bg-sunken")}>
      {children}
      {count != null && <span className={clsx("num text-[11.5px] rounded-full px-1.5", active ? "bg-primary text-primary-fg" : "bg-sunken text-ink-3")}>{count}</span>}
    </button>
  );
}
