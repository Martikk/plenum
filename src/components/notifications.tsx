"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Bell, ThumbsUp, ThumbsDown, Calculator, XCircle, Eye, AlertTriangle, CalendarPlus } from "lucide-react";
import { PERSONAS, useStore } from "@/lib/store";
import { deriveStatus, economics, relTime, MARGIN_THRESHOLD } from "@/lib/logic";

interface Note { id: string; at: string; icon: React.ReactNode; tone: string; text: string; href: string }

const KEY = "plenum-seen";
const readSeen = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch { return new Set(); } };

/** Notifications are derived from current data per role; "seen" is remembered per browser. */
export function Notifications() {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  useEffect(() => setSeen(readSeen()), []);

  const notes = useMemo(() => {
    const out: Note[] = [];
    const persona = s.persona; const me = PERSONAS[persona]?.personId;
    const office = persona !== "tech";
    const week = Date.now() - 7 * 864e5;
    const bname = (id: number) => s.buildings.find((b) => b.id === id)?.name ?? "";

    for (const w of s.workOrders) {
      const href = `/work-orders/view?id=${w.id}`;
      if (office) for (const h of w.history) {
        if (h.by === "Customer Portal" && new Date(h.at).getTime() > week) {
          const ok = /approved/i.test(h.text);
          out.push({ id: `p${h.id}`, at: h.at, icon: ok ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />, tone: ok ? "complete" : "declined", text: `Quote #${w.id} ${ok ? "approved" : "declined"} on portal · ${bname(w.buildingId)}`, href });
        }
      }
      if (persona === "dispatcher" && w.requestedOnline && deriveStatus(w) === "Unassigned") {
        out.push({ id: `rq${w.id}`, at: w.requestedOnline.at, icon: <CalendarPlus size={14} />, tone: "posted", text: `New portal request #${w.id} · ${bname(w.buildingId)} (${w.urgency})`, href });
      }
      if ((persona === "coordinator" || persona === "manager") && w.kind === "QO" && w.quoteStatus === "Pricing" && w.pricingAlertAt && new Date(w.pricingAlertAt) < new Date()) {
        out.push({ id: `pa${w.id}-${w.pricingAlertAt}`, at: w.pricingAlertAt, icon: <Calculator size={14} />, tone: "responding", text: `Pricing overdue on quote #${w.id} · ${bname(w.buildingId)}`, href });
      }
      if (persona === "dispatcher" && w.kind === "WO") for (const r of w.roles) if (r.status === "Declined") {
        out.push({ id: `d${r.id}`, at: w.createdAt, icon: <XCircle size={14} />, tone: "declined", text: `${r.type} declined on #${w.id} · reassign`, href: "/dispatch" });
      }
      if (persona === "tech" && w.kind === "WO" && !w.closed) for (const r of w.roles) if (r.personId === me && r.status === "Assigned" && r.start && new Date(r.start) > new Date(Date.now() - 864e5)) {
        out.push({ id: `a${r.id}-${r.start}`, at: r.start, icon: <CalendarPlus size={14} />, tone: "assigned", text: `You're booked: #${w.id} ${bname(w.buildingId)}, ${new Date(r.start).toLocaleString("en-CA", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })}`, href: "/my" });
      }
      if ((persona === "manager" || persona === "ceo") && w.kind === "WO" && w.billType === "Billable" && deriveStatus(w) !== "Closed") {
        const c = s.contracts.find((c) => c.id === w.contractId);
        if (c) { const e = economics(w, c, s.people, s.invoices); if (e.actual.sell > 0 && (e.actual.margin ?? 1) < MARGIN_THRESHOLD) out.push({ id: `m${w.id}`, at: w.createdAt, icon: <AlertTriangle size={14} />, tone: "responding", text: `GP ${((e.actual.margin ?? 0) * 100).toFixed(1)}% on #${w.id} · ${bname(w.buildingId)}`, href }); }
      }
    }
    if (persona === "manager" || persona === "ceo") for (const i of s.invoices) if (i.status === "Review Reqd") {
      out.push({ id: `i${i.id}-rr`, at: i.date, icon: <Eye size={14} />, tone: "posted", text: `Invoice ${i.id} waiting for your review`, href: `/invoices?open=${i.id}` });
    }
    return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
  }, [s.workOrders, s.invoices, s.contracts, s.people, s.buildings, s.persona]);

  const unread = notes.filter((n) => !seen.has(n.id)).length;
  const markAll = () => { const next = new Set([...seen, ...notes.map((n) => n.id)]); setSeen(next); try { localStorage.setItem(KEY, JSON.stringify([...next].slice(-500))); } catch {} };

  return (
    <div className="relative">
      <button className="btn btn-ghost !px-2 relative" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`} onClick={() => setOpen(!open)}>
        <Bell size={17} />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 num text-[10.5px] font-semibold rounded-full min-w-4 h-4 px-1 grid place-items-center" style={{ background: "var(--danger)", color: "#fff" }}>{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-[360px] max-w-[calc(100vw-24px)] card shadow-pop z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 h-10 border-b border-line">
              <span className="font-semibold">Notifications</span>
              {unread > 0 && <button className="text-[12.5px] text-primary" onClick={markAll}>Mark all read</button>}
            </div>
            <div className="max-h-[60vh] overflow-auto">
              {notes.length === 0 && <p className="p-4 text-ink-3">Nothing needs your attention.</p>}
              {notes.map((n) => (
                <Link key={n.id} href={n.href} onClick={() => { setOpen(false); const next = new Set(seen).add(n.id); setSeen(next); try { localStorage.setItem(KEY, JSON.stringify([...next].slice(-500))); } catch {} }}
                  className={clsx("flex gap-2.5 px-3 py-2.5 border-b border-line last:border-0 hover:bg-sunken/60", !seen.has(n.id) && "bg-primary-soft/40")}>
                  <span className="mt-0.5 grid place-items-center w-6 h-6 rounded-full shrink-0" style={{ background: `var(--s-${n.tone}-bg)`, color: `var(--s-${n.tone})` }}>{n.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className={clsx("block text-[13px]", !seen.has(n.id) && "font-medium")}>{n.text}</span>
                    <span className="block text-[11.5px] text-ink-3">{relTime(n.at)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
