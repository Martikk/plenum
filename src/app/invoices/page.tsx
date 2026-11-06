"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, XCircle, Send, Undo2, UserRoundCog, Plus, Trash2 } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { economics, fmtDate, invoiceSubtotal, money2, GST, MARGIN_THRESHOLD } from "@/lib/logic";
import { Chip, Empty, InvoiceStatusBadge, MarginMeter, PageHeader } from "@/components/ui";
import type { Invoice, InvoiceLine, InvoiceStatus } from "@/lib/types";

const FILTERS: (InvoiceStatus | "queue" | "all")[] = ["queue", "Draft", "Review Reqd", "Changes Reqd", "Approved", "Sent", "Paid", "all"];

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2 items-start">
      {ok ? <CheckCircle2 size={16} style={{ color: "var(--ok)" }} className="mt-0.5 shrink-0" /> : <XCircle size={16} style={{ color: "var(--danger)" }} className="mt-0.5 shrink-0" />}
      <span className={clsx(!ok && "font-medium")}>{children}</span>
    </li>
  );
}

function Review({ inv }: { inv: Invoice }) {
  const s = useStore();
  const L = useLookups();
  const w = L.wo(inv.woId)!;
  const c = L.contract(w.contractId)!;
  const b = L.building(w.buildingId)!;
  const e = economics(w, c, s.people, s.invoices);
  const [note, setNote] = useState("");
  const sub = invoiceSubtotal(inv);
  const thisMargin = sub > 0 ? (sub - e.actual.totalCostPst) / sub : null;
  const editable = inv.status === "Draft" || inv.status === "Review Reqd" || inv.status === "Changes Reqd";
  const setLine = (i: number, patch: Partial<InvoiceLine>) => s.updateInvoice(inv.id, { lines: inv.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  const checks = [
    { ok: !c.poRequired || !!w.po, t: c.poRequired ? (w.po ? `PO ${w.po} present` : "PO required by contract — missing") : "PO not required" },
    { ok: !!w.workPerformed?.trim(), t: w.workPerformed?.trim() ? "Work performed is written" : "Work performed is empty" },
    { ok: e.actual.missingCost === 0, t: e.actual.missingCost === 0 ? "All material costs entered" : `${e.actual.missingCost} material line(s) without cost` },
    { ok: sub > 0, t: sub > 0 ? "Invoice has a non-zero amount" : "Invoice amount is $0" },
    { ok: (thisMargin ?? 0) >= MARGIN_THRESHOLD, t: `GP on this invoice ${(thisMargin == null ? 0 : thisMargin * 100).toFixed(1)}% (threshold ${MARGIN_THRESHOLD * 100}%)` },
  ];
  const failing = checks.filter((x) => !x.ok).length;

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-line flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2"><span className="num text-ink-3">Invoice</span><span className="num font-semibold text-[18px]">{inv.id}</span><InvoiceStatusBadge s={inv.status} /></div>
          <div className="text-ink-2 mt-0.5"><Link href={`/work-orders/${w.id}`} className="text-primary num">WO #{w.id}</Link> · {b.name} · {L.org(w.orgId)?.name}</div>
        </div>
        <div className="text-right">
          <div className="num text-[22px] font-semibold">{money2(sub * (1 + GST))}</div>
          <div className="text-[12px] text-ink-3 num">{money2(sub)} + GST {money2(sub * GST)}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px]">
        <div className="p-4 space-y-4 min-w-0">
          <div>
            <div className="label mb-1">Work performed (goes to customer)</div>
            <p className={clsx("rounded-md p-3 bg-sunken", !w.workPerformed && "text-ink-3 italic")}>{w.workPerformed || "Not filled in by tech"}</p>
          </div>
          <table className="tbl border border-line rounded-lg">
            <thead><tr><th>Line</th><th>Description</th><th className="text-right">Amount</th><th></th></tr></thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap">{editable ? (
                    <select className="field !py-1" value={l.kind} onChange={(ev) => setLine(i, { kind: ev.target.value as InvoiceLine["kind"] })}>
                      {["Labour", "Parts", "Per Agreement", "Retainer", "Truck Charge", "Work Noted Above"].map((k) => <option key={k}>{k}</option>)}</select>) : l.kind}</td>
                  <td>{editable ? <input className="field !py-1" value={l.description} onChange={(ev) => setLine(i, { description: ev.target.value })} /> : l.description}</td>
                  <td className="text-right">{editable ? <input type="number" className="field !py-1 !w-28 text-right num" value={l.amount} onChange={(ev) => setLine(i, { amount: Number(ev.target.value) })} /> : <span className="num">{money2(l.amount)}</span>}</td>
                  <td>{editable && <button className="btn btn-ghost btn-sm" aria-label="Remove line" onClick={() => s.updateInvoice(inv.id, { lines: inv.lines.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {editable && <button className="btn btn-sm" onClick={() => s.updateInvoice(inv.id, { lines: [...inv.lines, { kind: "Labour", description: "", amount: 0 }] })}><Plus size={14} />Line</button>}

          <div className="grid sm:grid-cols-4 gap-px bg-line rounded-lg overflow-hidden border border-line">
            {[["Hours worked", `${e.actual.hours.toFixed(1)} h`], ["Labour cost", money2(e.actual.labourCost)], ["Materials +PST", money2(e.actual.matCostPst)], ["Quoted sell", e.quote.sell ? money2(e.quote.sell) : "—"]].map(([k, v]) => (
              <div key={k} className="bg-surface p-3"><div className="label">{k}</div><div className="num font-semibold mt-0.5">{v}</div></div>
            ))}
          </div>
        </div>

        <aside className="p-4 border-t lg:border-t-0 lg:border-l border-line bg-sunken/30 space-y-4">
          <div>
            <div className="font-semibold mb-2">Pre-send checks</div>
            <ul className="space-y-1.5 text-[13px]">{checks.map((x) => <Check key={x.t} ok={x.ok}>{x.t}</Check>)}</ul>
          </div>
          <div><div className="label mb-1">Margin on this invoice</div><MarginMeter margin={thisMargin} /></div>
          {inv.reviewNote && <div className="text-[13px] rounded-md p-2 border" style={{ background: "var(--warn-bg)", borderColor: "var(--warn-border)", color: "var(--warn)" }}>Note: {inv.reviewNote}</div>}

          {inv.status === "Draft" && <button className="btn btn-primary w-full justify-center" onClick={() => s.setInvoiceStatus(inv.id, "Review Reqd")}>Submit for review</button>}
          {(inv.status === "Review Reqd" || inv.status === "Changes Reqd") && (
            <div className="space-y-2">
              <textarea className="field" placeholder="Note for tech / CEO (optional)" value={note} onChange={(ev) => setNote(ev.target.value)} />
              <button className="btn btn-primary w-full justify-center" onClick={() => s.setInvoiceStatus(inv.id, "Sent", note || undefined)}>
                <Send size={15} />Approve &amp; email customer{failing ? ` (${failing} check${failing > 1 ? "s" : ""} failing)` : ""}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn justify-center" onClick={() => s.setInvoiceStatus(inv.id, "Changes Reqd", note || "Changes requested")}><Undo2 size={15} />Changes</button>
                <button className="btn justify-center" onClick={() => s.setInvoiceStatus(inv.id, "Review Reqd", `Escalated to CEO${note ? `: ${note}` : ""}`)}><UserRoundCog size={15} />Ask CEO</button>
              </div>
              {c.poRequired && !w.po && <button className="btn w-full justify-center" onClick={() => s.setInvoiceStatus(inv.id, "PO Requested", "PO requested from customer")}>Request PO from customer</button>}
            </div>
          )}
          {inv.status === "Sent" && <button className="btn w-full justify-center" onClick={() => s.setInvoiceStatus(inv.id, "Paid")}>Mark paid</button>}
          {inv.status === "PO Requested" && <button className="btn w-full justify-center" onClick={() => s.setInvoiceStatus(inv.id, "Review Reqd")}>PO received → back to review</button>}
        </aside>
      </div>
    </div>
  );
}

function InvoicesInner() {
  const s = useStore();
  const L = useLookups();
  const params = useSearchParams();
  const [f, setF] = useState<(typeof FILTERS)[number]>("queue");
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => { const o = params.get("open"); if (o) { setSel(Number(o)); setF("all"); } }, [params]);

  const inQueue = (i: Invoice) => ["Draft", "Review Reqd", "Changes Reqd", "PO Requested"].includes(i.status);
  const list = s.invoices.filter((i) => (f === "all" ? true : f === "queue" ? inQueue(i) : i.status === f)).sort((a, b) => b.id - a.id);
  const current = s.invoices.find((i) => i.id === sel) ?? list[0];

  return (
    <div>
      <PageHeader title="Invoices" sub="Every invoice is reviewed by the Coordination Manager before it is emailed to the customer; contentious ones go to the CEO." />
      <div className="flex flex-wrap gap-2 mb-3">
        {FILTERS.map((k) => <Chip key={k} active={f === k} onClick={() => setF(k)} count={s.invoices.filter((i) => (k === "all" ? true : k === "queue" ? inQueue(i) : i.status === k)).length}>{k === "queue" ? "Review queue" : k === "all" ? "All" : k}</Chip>)}
      </div>
      <div className="grid xl:grid-cols-[380px_1fr] gap-4 items-start">
        <div className="card overflow-hidden">
          {list.length === 0 ? <Empty>Nothing here.</Empty> : list.map((i) => {
            const w = L.wo(i.woId); const b = L.building(w?.buildingId);
            return (
              <button key={i.id} onClick={() => setSel(i.id)}
                className={clsx("w-full text-left px-4 py-3 border-b border-line last:border-0 flex gap-3 items-start", current?.id === i.id ? "bg-primary-soft" : "hover:bg-sunken/60")}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="num font-semibold">{i.id}</span><InvoiceStatusBadge s={i.status} size="sm" />{i.progress && <span className="text-[11px] text-ink-3">progress</span>}</div>
                  <div className="truncate text-ink-2 mt-0.5">{b?.name} · WO {i.woId}</div>
                </div>
                <div className="text-right"><div className="num font-semibold">{money2(invoiceSubtotal(i))}</div><div className="num text-[12px] text-ink-3">{fmtDate(i.date)}</div></div>
              </button>
            );
          })}
        </div>
        {current ? <Review key={current.id} inv={current} /> : <div className="card"><Empty>Select an invoice.</Empty></div>}
      </div>
    </div>
  );
}

export default function Invoices() {
  return <Suspense><InvoicesInner /></Suspense>;
}
