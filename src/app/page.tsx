"use client";
import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, Calculator, Eye, Inbox, Send, Truck } from "lucide-react";
import { PERSONAS, useLookups, useStore } from "@/lib/store";
import { deriveStatus, economics, fmtDateTime, invoiceSubtotal, money, relTime, MARGIN_THRESHOLD } from "@/lib/logic";
import { Avatar, InvoiceStatusBadge, MarginMeter, RoleStatusBadge, UrgencyTag, WOStatusBadge } from "@/components/ui";
import type { WorkOrder } from "@/lib/types";

function Stat({ href, icon, label, value, tone }: { href: string; icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <Link href={href} className="card p-4 hover:border-line-strong transition-colors group">
      <div className="flex items-center justify-between">
        <span className="grid place-items-center w-8 h-8 rounded-lg" style={{ background: `var(--s-${tone}-bg)`, color: `var(--s-${tone})` }}>{icon}</span>
        <ArrowRight size={15} className="text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="num text-[28px] font-semibold mt-3 leading-none">{value}</div>
      <div className="text-ink-2 mt-1.5">{label}</div>
    </Link>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 h-12 border-b border-line">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function Today() {
  const s = useStore();
  const L = useLookups();
  const persona = s.persona;
  const me = PERSONAS[persona].personId;

  const d = useMemo(() => {
    const wos = s.workOrders.filter((w) => w.kind === "WO");
    const qos = s.workOrders.filter((w) => w.kind === "QO");
    const unassigned = wos.filter((w) => deriveStatus(w) === "Unassigned" && !w.onHold);
    const onsite = wos.filter((w) => deriveStatus(w) === "Responding");
    const pricing = qos.filter((q) => q.quoteStatus === "Pricing");
    const awaiting = qos.filter((q) => q.quoteStatus === "Sent");
    const review = s.invoices.filter((i) => i.status === "Review Reqd");
    const lowMargin = wos.filter((w) => {
      const c = L.contract(w.contractId); if (!c || w.billType !== "Billable") return false;
      const e = economics(w, c, s.people, s.invoices);
      return (e.actual.margin ?? 1) < MARGIN_THRESHOLD && e.actual.sell > 0;
    });
    const today = new Date().toDateString();
    const todays = wos.flatMap((w) => w.roles.filter((r) => r.start && new Date(r.start).toDateString() === today && r.personId).map((r) => ({ w, r })))
      .sort((a, b) => a.r.start!.localeCompare(b.r.start!));
    const mine = wos.filter((w) => w.roles.some((r) => r.personId === me && r.status !== "Complete" && r.status !== "Declined"));
    return { unassigned, onsite, pricing, awaiting, review, lowMargin, todays, mine };
  }, [s.workOrders, s.invoices, s.people, me, L]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = s.people.find((p) => p.id === me)?.name.split(" ")[0];

  const row = (w: WorkOrder, right?: React.ReactNode) => {
    const b = L.building(w.buildingId);
    return (
      <Link key={w.id} href={`/work-orders/view?id=${w.id}`} className="flex items-start gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-primary-soft/50">
        <span className="num font-semibold text-primary w-12 shrink-0">{w.id}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium truncate">{b?.name} <span className="text-ink-3 font-normal">· {b?.city}</span></span>
          <span className="block text-ink-2 truncate">{w.customerRequest}</span>
        </span>
        <span className="shrink-0 flex flex-col items-end gap-1">{right}</span>
      </Link>
    );
  };

  const queues: Record<Exclude<typeof persona, "ceo">, React.ReactNode> = {
    dispatcher: (
      <Section title={`Needs a tech (${d.unassigned.length})`} action={<Link href="/dispatch" className="btn btn-sm">Open dispatch board</Link>}>
        {d.unassigned.length === 0 ? <p className="p-4 text-ink-3">Everything is assigned.</p> :
          d.unassigned.sort((a, b) => (a.urgency === "High" ? -1 : 1) - (b.urgency === "High" ? -1 : 1)).map((w) =>
            row(w, <><UrgencyTag u={w.urgency} /><span className="text-[12px] text-ink-3">{relTime(w.createdAt)}</span></>))}
      </Section>
    ),
    coordinator: (
      <Section title={`Quotes waiting for your pricing (${d.pricing.length})`} action={<Link href="/quotes" className="btn btn-sm">All quotes</Link>}>
        {d.pricing.length === 0 ? <p className="p-4 text-ink-3">No pricing requests.</p> :
          d.pricing.map((w) => {
            const missing = w.quotedMaterials.filter((m) => !m.unitCost).length;
            const overdue = w.pricingAlertAt && new Date(w.pricingAlertAt) < new Date();
            return row(w, <><span className="text-[12.5px] font-medium" style={{ color: "var(--warn)" }}>{missing} cost{missing === 1 ? "" : "s"} missing</span>
              <span className="text-[12px]" style={{ color: overdue ? "var(--danger)" : "var(--text-3)" }}>Tech alert {fmtDateTime(w.pricingAlertAt)}</span></>);
          })}
      </Section>
    ),
    tech: (
      <Section title={`My open jobs (${d.mine.length})`} action={<Link href="/dispatch" className="btn btn-sm">Schedule myself</Link>}>
        {d.mine.length === 0 ? <p className="p-4 text-ink-3">Nothing assigned.</p> :
          d.mine.map((w) => {
            const r = w.roles.find((r) => r.personId === me)!;
            return row(w, <><RoleStatusBadge s={r.status} size="sm" /><span className="text-[12px] text-ink-3">{r.start ? fmtDateTime(r.start) : "Not scheduled"}</span></>);
          })}
      </Section>
    ),
    manager: (
      <Section title={`Invoices to review (${d.review.length})`} action={<Link href="/invoices" className="btn btn-sm">Review queue</Link>}>
        {d.review.length === 0 ? <p className="p-4 text-ink-3">Queue is clear.</p> :
          d.review.map((i) => { const w = L.wo(i.woId)!; return row(w, <><span className="num font-semibold">{money(invoiceSubtotal(i))}</span><InvoiceStatusBadge s={i.status} size="sm" /></>); })}
      </Section>
    ),
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">{greet}, {name}</h1>
          <p className="text-ink-2">{new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })} · viewing as {PERSONAS[persona].label}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat href="/dispatch" icon={<Inbox size={17} />} label="Unassigned work orders" value={d.unassigned.length} tone="holding" />
        <Stat href="/dispatch" icon={<Truck size={17} />} label="On site now" value={d.onsite.length} tone="responding" />
        <Stat href="/quotes" icon={<Calculator size={17} />} label="Quotes need pricing" value={d.pricing.length} tone="incomplete" />
        <Stat href="/quotes" icon={<Send size={17} />} label="Awaiting customer" value={d.awaiting.length} tone="assigned" />
        <Stat href="/invoices" icon={<Eye size={17} />} label="Invoices to review" value={d.review.length} tone="posted" />
      </div>

      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-5 items-start">
        <div className="space-y-5">
          {queues[persona === "ceo" ? "manager" : persona]}
          <Section title="Margin alerts" action={<span className="text-[12px] text-ink-3">GP below {MARGIN_THRESHOLD * 100}%</span>}>
            {d.lowMargin.length === 0 ? <p className="p-4 text-ink-3">All billable jobs at or above threshold.</p> :
              d.lowMargin.map((w) => {
                const e = economics(w, L.contract(w.contractId)!, s.people, s.invoices);
                return row(w, <><MarginMeter margin={e.actual.margin} /><span className="text-[12px] text-ink-3 num">{money(e.actual.totalCostPst)} cost · {money(e.actual.sell)} sell</span></>);
              })}
          </Section>
        </div>
        <Section title="Today's schedule" action={<Link href="/dispatch" className="text-primary text-[13px] font-medium inline-flex items-center gap-1"><CalendarClock size={14} />Board</Link>}>
          {d.todays.length === 0 ? <p className="p-4 text-ink-3">Nothing scheduled today.</p> :
            <ul>
              {d.todays.map(({ w, r }) => {
                const p = L.person(r.personId)!;
                const b = L.building(w.buildingId);
                return (
                  <li key={r.id} className="border-b border-line last:border-0">
                    <Link href={`/work-orders/view?id=${w.id}`} className="flex gap-3 px-4 py-2.5 hover:bg-primary-soft/50 items-center">
                      <span className="num text-ink-2 w-11 text-[13px]">{new Date(r.start!).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                      <Avatar initials={p.initials} title={p.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{b?.name}</span>
                        <span className="block truncate text-[12.5px] text-ink-3">{p.name} · {r.type} · #{w.id}</span>
                      </span>
                      <RoleStatusBadge s={r.status} size="sm" />
                    </Link>
                  </li>
                );
              })}
            </ul>}
        </Section>
      </div>

      {d.onsite.length > 0 && (
        <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-1.5"><AlertTriangle size={13} />
          WO status is derived from role statuses (e.g. any role <em>Responding</em> → WO <WOStatusBadge s="Responding" size="sm" />). Rule order is a hypothesis, see docs/spec-notes.md.</p>
      )}
    </div>
  );
}
