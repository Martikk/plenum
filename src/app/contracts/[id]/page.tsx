"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { deriveStatus, economics, money, pct, typeCode } from "@/lib/logic";
import { Empty, Field, MarginMeter, QuoteStatusBadge, WOStatusBadge } from "@/components/ui";
import type { Contract } from "@/lib/types";

const RULES: [keyof Contract, string, string][] = [
  ["allInclusive", "All-Inclusive", "New PM work orders become Non-Billable"],
  ["poRequired", "PO Required", "PO is mandatory on every new work order"],
  ["lockRates", "Lock Rates", "Protected from bulk rate updates"],
  ["ratesTemplate", "Rates Template", "Template for new contracts of the same type & service"],
];

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const s = useStore();
  const L = useLookups();
  const c = L.contract(Number(id));
  if (!c) return <Empty>Contract not found.</Empty>;
  const o = L.org(c.orgId)!;
  const wos = s.workOrders.filter((w) => w.contractId === c.id);
  const totals = wos.filter((w) => w.kind === "WO").reduce((a, w) => {
    const e = economics(w, c, s.people, s.invoices);
    return { sell: a.sell + e.actual.sell, cost: a.cost + e.actual.totalCostPst, hours: a.hours + e.actual.hours };
  }, { sell: 0, cost: 0, hours: 0 });
  const gm = totals.sell > 0 ? (totals.sell - totals.cost) / totals.sell : null;

  return (
    <div>
      <Link href="/contracts" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink mb-3"><ArrowLeft size={15} />Contracts</Link>
      <div className="card p-4 mb-4">
        <div className="font-mono text-[12px] text-ink-3">{typeCode(c, "WO").replace("-WO", "")} · #{c.id}</div>
        <h1 className="text-[22px] font-semibold tracking-tight">{c.type}-{c.serviceType} | {o.name}</h1>
        <p className="text-ink-2">{c.buildingIds.map((b) => L.building(b)?.name).join(" · ")}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line rounded-lg overflow-hidden mt-4 border border-line">
          {[["Revenue to date", money(totals.sell)], ["Cost incl. PST", money(totals.cost)], ["Hours", totals.hours.toFixed(1)]].map(([k, v]) => (
            <div key={k} className="bg-surface p-3"><div className="label">{k}</div><div className="num text-[17px] font-semibold mt-1">{v}</div></div>))}
          <div className="bg-surface p-3"><div className="label">Gross margin</div><div className="mt-1.5"><MarginMeter margin={gm} /></div></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Rates & markups</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Journeyman rate"><input className="field num" disabled={c.lockRates} defaultValue={c.rates.journeyman} /></Field>
            <Field label="Apprentice rate"><input className="field num" disabled={c.lockRates} defaultValue={c.rates.apprentice} /></Field>
            <Field label="Travel rate"><input className="field num" disabled={c.lockRates} defaultValue={c.rates.travel} /></Field>
            <Field label="Travel hours cap"><input className="field num" disabled={c.lockRates} defaultValue={c.rates.travelHoursCap} /></Field>
            <Field label="Material markup" hint="Service & Maintenance"><input className="field num" defaultValue={pct(c.materialMarkup)} disabled /></Field>
            <Field label="Subtrade markup"><input className="field num" defaultValue={pct(c.subtradeMarkup)} disabled /></Field>
            <Field label="Installation markup" hint="Installation only; replaces subtrade markup"><input className="field num" defaultValue={pct(c.installationMarkup)} disabled /></Field>
            <Field label="Quote markup" hint="Quoted labour only, all contract types"><input className="field num" defaultValue={pct(c.quoteMarkup)} disabled /></Field>
          </div>
          {c.lockRates && <p className="text-[12.5px] text-ink-3 mt-3">Rates are locked on this contract.</p>}
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Rules</h2>
          <ul className="space-y-2.5">
            {RULES.map(([k, label, desc]) => (
              <li key={k} className="flex items-start gap-3">
                <span className="mt-0.5 w-8 h-[18px] rounded-full relative shrink-0" style={{ background: c[k] ? "var(--primary)" : "var(--border-strong)" }}>
                  <span className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all" style={{ left: c[k] ? 16 : 2 }} />
                </span>
                <span><span className="font-medium">{label}</span><span className="block text-[12.5px] text-ink-3">{desc}</span></span>
              </li>
            ))}
          </ul>
          {(c.poDefault || c.poNote) && <div className="mt-3 text-[13px] rounded-md bg-sunken p-2">{c.poDefault && <>PO default <span className="font-mono">{c.poDefault}</span>. </>}{c.poNote}</div>}
          <div className="mt-4">
            <div className="label mb-1">Auto-added to every new work order</div>
            {c.defaultRolePersonIds.length ? c.defaultRolePersonIds.map((p) => <div key={p}>{L.person(p)?.name} <span className="text-ink-3">· {L.person(p)?.title}</span></div>) : <span className="text-ink-3">Nobody</span>}
          </div>
        </div>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <div className="px-4 h-11 flex items-center border-b border-line font-semibold">Quotes & work orders</div>
        <table className="tbl">
          <thead><tr><th>ID</th><th>Building · request</th><th>Status</th></tr></thead>
          <tbody>{wos.map((w) => (
            <tr key={w.id}><td><Link href={`/work-orders/${w.id}`} className="num font-semibold text-primary">{w.id}</Link> <span className="text-[11.5px] text-ink-3">{w.kind}</span></td>
              <td><div className="font-medium">{L.building(w.buildingId)?.name}</div><div className="text-ink-2">{w.customerRequest}</div></td>
              <td>{w.kind === "QO" ? <QuoteStatusBadge s={w.quoteStatus!} size="sm" /> : <WOStatusBadge s={deriveStatus(w)} size="sm" />}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
