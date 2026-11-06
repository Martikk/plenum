"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { deriveStatus, economics, money, MARGIN_THRESHOLD } from "@/lib/logic";
import { Avatar, Chip, PageHeader } from "@/components/ui";
import type { ContractType, QuoteStatus } from "@/lib/types";

type Range = 30 | 90 | 365;

function Tile({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className="num text-[26px] font-semibold mt-1 leading-tight">{value}</div>
      {sub && <div className="text-[12.5px] text-ink-3 mt-1">{sub}</div>}
    </div>
  );
}

/** Horizontal bar, single hue; value text stays in ink tokens (dataviz rule). */
function Bar({ label, value, max, display, warn, title, threshold }: { label: React.ReactNode; value: number; max: number; display: string; warn?: boolean; title: string; threshold?: number }) {
  const w = max > 0 ? Math.max(0, value / max) : 0;
  return (
    <div className="grid grid-cols-[140px_1fr_96px] items-center gap-3 py-1.5 group" title={title}>
      <div className="truncate text-ink-2">{label}</div>
      <div className="relative h-5">
        <div className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[filter] group-hover:brightness-110"
          style={{ width: `${w * 100}%`, background: warn ? "var(--warn)" : "var(--primary)", minWidth: value > 0 ? 3 : 0 }} />
        {threshold != null && <div className="absolute -inset-y-1 w-px bg-ink-3" style={{ left: `${(threshold / max) * 100}%` }} />}
      </div>
      <div className="num text-right font-medium inline-flex items-center justify-end gap-1">{warn && <AlertTriangle size={12} style={{ color: "var(--warn)" }} />}{display}</div>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="font-semibold">{title}</h2>
      {sub && <p className="text-[12.5px] text-ink-3 mb-3">{sub}</p>}
      {children}
    </section>
  );
}

export default function Reports() {
  const s = useStore(); const L = useLookups();
  const [range, setRange] = useState<Range>(90);

  const d = useMemo(() => {
    const since = Date.now() - range * 864e5;
    const wos = s.workOrders.filter((w) => w.kind === "WO" && new Date(w.createdAt).getTime() >= since);
    const rows = wos.map((w) => {
      const c = L.contract(w.contractId)!;
      return { w, c, e: economics(w, c, s.people, s.invoices), st: deriveStatus(w) };
    });
    const billable = rows.filter((r) => r.w.billType === "Billable" && r.e.actual.sell > 0);
    const revenue = billable.reduce((a, r) => a + r.e.actual.sell, 0);
    const cost = billable.reduce((a, r) => a + r.e.actual.totalCostPst, 0);

    const byType = (["Service", "Maintenance", "Installation"] as ContractType[]).map((t) => {
      const rs = billable.filter((r) => r.c.type === t);
      const sell = rs.reduce((a, r) => a + r.e.actual.sell, 0), cst = rs.reduce((a, r) => a + r.e.actual.totalCostPst, 0);
      return { t, sell, gm: sell > 0 ? (sell - cst) / sell : null, n: rs.length };
    });

    // Time from request to first scheduled visit (proxy for response time).
    const resp = rows.map((r) => {
      const starts = r.w.roles.map((x) => x.start).filter(Boolean).map((x) => new Date(x!).getTime());
      return starts.length ? (Math.min(...starts) - new Date(r.w.createdAt).getTime()) / 36e5 : null;
    }).filter((x): x is number => x != null && x >= 0);
    const median = (a: number[]) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); const m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };

    const qos = s.workOrders.filter((w) => w.kind === "QO" || w.quoteSentAt).filter((w) => new Date(w.createdAt).getTime() >= since);
    const qs = (st: QuoteStatus) => qos.filter((q) => (q.kind === "WO" ? "Approved" : q.quoteStatus) === st).length;
    const funnel: [string, number][] = [["Drafted", qos.length], ["Priced & sent", qs("Sent") + qs("Approved") + qs("Declined")], ["Approved", qs("Approved")], ["Declined", qs("Declined")]];
    const decided = qs("Approved") + qs("Declined");

    // Utilisation: booked hours this week vs 40 h
    const now = new Date(); const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday.getTime() + 7 * 864e5);
    const techs = s.people.filter((p) => p.kind === "staff" && p.group !== "Office").map((p) => {
      const booked = s.workOrders.flatMap((w) => w.roles).filter((r) => r.personId === p.id && r.start && r.end && new Date(r.start) >= monday && new Date(r.start) < sunday)
        .reduce((a, r) => a + (new Date(r.end!).getTime() - new Date(r.start!).getTime()) / 36e5, 0);
      const logged = s.workOrders.flatMap((w) => w.time).filter((t) => t.personId === p.id && t.date && new Date(t.date) >= monday && new Date(t.date) < sunday).reduce((a, t) => a + t.hours, 0);
      return { p, booked, logged };
    });

    const lowJobs = billable.filter((r) => (r.e.actual.margin ?? 1) < MARGIN_THRESHOLD).sort((a, b) => (a.e.actual.margin ?? 0) - (b.e.actual.margin ?? 0));
    const open = rows.filter((r) => r.st !== "Closed" && r.st !== "Complete").length;
    return { revenue, cost, gm: revenue > 0 ? (revenue - cost) / revenue : null, byType, respMedian: median(resp), respN: resp.length, funnel, conv: decided ? qs("Approved") / decided : null, techs, lowJobs, open, n: rows.length };
  }, [s.workOrders, s.invoices, s.people, range, L]);

  const maxType = Math.max(...d.byType.map((x) => x.gm ?? 0), MARGIN_THRESHOLD * 1.5, 0.01);
  const maxFunnel = Math.max(...d.funnel.map((x) => x[1]), 1);

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" sub="Work orders created in the selected period. Revenue = invoiced (finished jobs) or time-and-materials forecast (jobs in progress)."
        actions={<div className="flex gap-1.5">{([30, 90, 365] as Range[]).map((r) => <Chip key={r} active={range === r} onClick={() => setRange(r)}>{r === 365 ? "12 months" : `${r} days`}</Chip>)}</div>} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label="Billable revenue" value={money(d.revenue)} sub={`${d.n} work orders`} />
        <Tile label="Gross margin" value={d.gm == null ? "—" : `${(d.gm * 100).toFixed(1)}%`} sub={`Target ≥ ${(MARGIN_THRESHOLD * 100).toFixed(0)}%`} />
        <Tile label="Open work orders" value={String(d.open)} />
        <Tile label="Request → scheduled" value={d.respMedian == null ? "—" : d.respMedian < 48 ? `${d.respMedian.toFixed(1)} h` : `${(d.respMedian / 24).toFixed(1)} d`} sub={`median of ${d.respN}`} />
        <Tile label="Quote win rate" value={d.conv == null ? "—" : `${(d.conv * 100).toFixed(0)}%`} sub="approved ÷ decided" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Gross margin by contract type" sub={`Line marks the ${(MARGIN_THRESHOLD * 100).toFixed(0)}% threshold`}>
          {d.byType.map((x) => (
            <Bar key={x.t} label={`${x.t} (${x.n})`} value={x.gm ?? 0} max={maxType} threshold={MARGIN_THRESHOLD}
              display={x.gm == null ? "—" : `${(x.gm * 100).toFixed(1)}%`} warn={x.gm != null && x.gm < MARGIN_THRESHOLD}
              title={`${x.t}: ${money(x.sell)} revenue, GP ${x.gm == null ? "n/a" : (x.gm * 100).toFixed(1) + "%"}`} />
          ))}
        </Panel>
        <Panel title="Quote pipeline" sub="Quotes created in the period">
          {d.funnel.map(([k, v]) => <Bar key={k} label={k} value={v} max={maxFunnel} display={String(v)} title={`${k}: ${v}`} />)}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Technician load — this week" sub="Scheduled hours vs 40 h; logged hours from time entries">
          <table className="tbl">
            <thead><tr><th>Technician</th><th>Scheduled</th><th className="text-right">Logged</th></tr></thead>
            <tbody>{d.techs.map(({ p, booked, logged }) => (
              <tr key={p.id}>
                <td><span className="inline-flex items-center gap-2"><Avatar initials={p.initials} />{p.name}</span></td>
                <td>
                  <div className="flex items-center gap-2" title={`${booked.toFixed(1)} of 40 h scheduled`}>
                    <div className="relative h-2 w-32 rounded-full bg-sunken overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(1, booked / 40) * 100}%`, background: booked > 40 ? "var(--warn)" : "var(--primary)" }} />
                    </div>
                    <span className="num text-[12.5px]">{booked.toFixed(1)} h</span>
                  </div>
                </td>
                <td className="text-right num">{logged.toFixed(1)} h</td>
              </tr>))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Jobs below margin threshold" sub="Worst first">
          {d.lowJobs.length === 0 ? <p className="text-ink-3">None. Every billable job is at or above target.</p> : (
            <table className="tbl"><thead><tr><th>WO</th><th>Building</th><th className="text-right">Revenue</th><th className="text-right">GP%</th></tr></thead>
              <tbody>{d.lowJobs.slice(0, 8).map(({ w, e }) => (
                <tr key={w.id}>
                  <td><Link className="num text-primary font-medium" href={`/work-orders/view?id=${w.id}`}>{w.id}</Link></td>
                  <td className="truncate max-w-48">{L.building(w.buildingId)?.name}</td>
                  <td className="text-right num">{money(e.actual.sell)}</td>
                  <td className="text-right num font-medium" style={{ color: "var(--warn)" }}>{((e.actual.margin ?? 0) * 100).toFixed(1)}%</td>
                </tr>))}
              </tbody></table>
          )}
        </Panel>
      </div>
    </div>
  );
}
