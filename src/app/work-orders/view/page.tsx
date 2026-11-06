"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";
import clsx from "clsx";
import {
  ArrowLeft, Building2, KeyRound, MessageSquarePlus, PauseCircle, CheckCheck, Receipt, Trash2, Plus, AlertTriangle,
  Calculator, Send, ThumbsUp, ThumbsDown, ArrowRightLeft, Check, ScrollText, Wrench, Phone, Mail,
} from "lucide-react";
import { PERSONAS, useLookups, useStore } from "@/lib/store";
import {
  deriveStatus, economics, fmtDate, fmtDateTime, invoiceSubtotal, materialSell, money, money2, pct, typeCode, MARGIN_THRESHOLD, PST,
} from "@/lib/logic";
import {
  Avatar, Empty, Field, InvoiceStatusBadge, MarginMeter, QuoteStatusBadge, RoleStatusBadge, UrgencyTag, WOStatusBadge,
} from "@/components/ui";
import type { MaterialType, QuoteStatus, RoleStatus, RoleType, TimeType, WorkOrder } from "@/lib/types";
import { TECH_ROLES } from "@/lib/types";

const ROLE_STATUSES: RoleStatus[] = ["Holding", "Posted", "Assigned", "Declined", "Responding", "Incomplete", "Complete"];
const MAT_TYPES: MaterialType[] = ["Equipment", "Materials", "Parts", "Supplies", "Tools", "Subtrade", "Quote Fee", "Truck Charge", "Other", "Filters from Stock", "Refrigerant Purchased", "Refrigerant from Stock", "Truck Stock Purchased", "Truck Stock from Stock"];
const TIME_TYPES: TimeType[] = ["Regular", "OT 1.5", "OT 2.0", "Call Out 1.5", "Call Out 2.0"];

type Tab = "overview" | "roles" | "materials" | "time" | "invoices" | "history";

export default function Page() {
  return <Suspense><WODetail /></Suspense>;
}

function WODetail() {
  const id = useSearchParams().get("id") ?? "";
  const s = useStore();
  const L = useLookups();
  const router = useRouter();
  const w = L.wo(Number(id));
  const [tab, setTab] = useState<Tab>("overview");
  const [note, setNote] = useState("");

  if (!w) return <Empty>Work order {id} not found. <Link className="text-primary" href="/work-orders">Back to list</Link></Empty>;
  const c = L.contract(w.contractId)!;
  const b = L.building(w.buildingId)!;
  const o = L.org(w.orgId)!;
  const e = economics(w, c, s.people, s.invoices);
  const st = deriveStatus(w);
  const isQ = w.kind === "QO";
  const invs = s.invoices.filter((i) => i.woId === w.id);

  const tabs: [Tab, string, number?][] = [
    ["overview", "Overview"], ["roles", "Roles", w.roles.length],
    ["materials", "Materials", (isQ ? w.quotedMaterials : w.materials).length + (isQ ? 0 : w.quotedMaterials.length ? 0 : 0)],
    ["time", "Time", (isQ ? w.quotedTime : w.time).length], ["invoices", "Invoices", invs.length], ["history", "History", w.history.length],
  ];

  return (
    <div>
      <Link href={isQ ? "/quotes" : "/work-orders"} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink mb-3"><ArrowLeft size={15} /> {isQ ? "Quotes" : "Work orders"}</Link>

      {/* Header */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sunken text-ink-2">{isQ ? "Quote" : "Work order"}</span>
              <span className="font-mono text-[12px] text-ink-3">{typeCode(c, w.kind)}</span>
              {isQ ? w.quoteStatus && <QuoteStatusBadge s={w.quoteStatus} /> : <WOStatusBadge s={st} />}
              <UrgencyTag u={w.urgency} />
              {w.onHold && <span className="text-[12px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>On hold</span>}
              {w.billType !== "Billable" && <span className="text-[12px] text-ink-3">{w.billType}</span>}
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight mt-1.5"><span className="num text-ink-3 mr-2">#{w.id}</span>{b.name}</h1>
            <p className="text-ink-2">{b.address}, {b.city} · {o.name}{w.po ? <> · PO <span className="font-mono">{w.po}</span></> : c.poRequired ? <span style={{ color: "var(--danger)" }}> · PO required</span> : null}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn" onClick={() => s.toggleHold(w.id)}><PauseCircle size={15} />{w.onHold ? "Release hold" : "Hold"}</button>
            {!isQ && <button className="btn" onClick={() => s.completeAllRoles(w.id)}><CheckCheck size={15} />Complete all</button>}
            {!isQ && <button className="btn btn-primary" onClick={() => { s.createInvoice(w.id); setTab("invoices"); }}><Receipt size={15} />Create invoice</button>}
          </div>
        </div>

        {/* Economics strip — estimate vs actual side by side */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-line rounded-lg overflow-hidden mt-4 border border-line">
          {[
            ["Sell", e.quote.sell, isQ ? null : e.actual.sell],
            ["Labour cost", e.quote.labourCost, isQ ? null : e.actual.labourCost],
            [`Materials cost +PST`, e.quote.matCostPst, isQ ? null : e.actual.matCostPst],
            ["Hours", e.quote.hours, isQ ? null : e.actual.hours],
          ].map(([label, q, a]) => (
            <div key={label as string} className="bg-surface p-3">
              <div className="label">{label as string}</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="num text-[17px] font-semibold">{a == null ? (label === "Hours" ? (q as number).toFixed(1) : money(q as number)) : label === "Hours" ? (a as number).toFixed(1) : money(a as number)}</span>
                {a != null && <span className="num text-[12px] text-ink-3">of {label === "Hours" ? (q as number).toFixed(1) : money(q as number)} quoted</span>}
                {a == null && <span className="text-[12px] text-ink-3">estimate</span>}
              </div>
            </div>
          ))}
          <div className="bg-surface p-3">
            <div className="label">Gross margin</div>
            <div className="mt-1.5"><MarginMeter margin={isQ ? e.quote.margin : w.billType === "Billable" ? e.actual.margin : null} uncertain={(isQ ? e.quote.missingCost : e.actual.missingCost) > 0} /></div>
            <div className="text-[12px] text-ink-3 mt-1">{isQ ? "expected" : `quoted ${pct(e.quote.margin)}`} · threshold {MARGIN_THRESHOLD * 100}%</div>
          </div>
        </div>
        {(isQ ? e.quote.missingCost : e.actual.missingCost) > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-[13px] border" style={{ background: "var(--warn-bg)", color: "var(--warn)", borderColor: "var(--warn-border)" }}>
            <AlertTriangle size={15} /> {isQ ? e.quote.missingCost : e.actual.missingCost} material line(s) have no purchase cost — margin is overstated until they're filled.
            <button className="ml-auto underline font-medium" onClick={() => setTab("materials")}>Fix</button>
          </div>
        )}
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="min-w-0">
          <div className="flex gap-1 border-b border-line mb-4 overflow-x-auto">
            {tabs.map(([k, label, n]) => (
              <button key={k} onClick={() => setTab(k)}
                className={clsx("px-3 h-10 -mb-px border-b-2 font-medium whitespace-nowrap", tab === k ? "border-primary text-primary" : "border-transparent text-ink-2 hover:text-ink")}>
                {label}{n ? <span className="ml-1.5 num text-[11.5px] text-ink-3">{n}</span> : null}
              </button>
            ))}
          </div>

          {tab === "overview" && <Overview w={w} />}
          {tab === "roles" && <Roles w={w} />}
          {tab === "materials" && <Materials w={w} />}
          {tab === "time" && <Time w={w} />}
          {tab === "invoices" && (
            <div className="card overflow-hidden">
              {invs.length === 0 ? <Empty>No invoices yet.</Empty> : (
                <table className="tbl"><thead><tr><th>Invoice</th><th>Date</th><th>Type</th><th className="text-right">Subtotal</th><th>Status</th></tr></thead>
                  <tbody>{invs.map((i) => (
                    <tr key={i.id} className="cursor-pointer" onClick={() => router.push(`/invoices?open=${i.id}`)}>
                      <td className="num font-semibold text-primary">{i.id}</td><td className="num">{fmtDate(i.date)}</td>
                      <td>{i.progress ? "Progress billing" : "Final"}</td><td className="text-right num">{money2(invoiceSubtotal(i))}</td><td><InvoiceStatusBadge s={i.status} size="sm" /></td>
                    </tr>))}</tbody></table>
              )}
            </div>
          )}
          {tab === "history" && (
            <div className="card">
              <div className="p-3 border-b border-line flex gap-2">
                <input className="field" placeholder="Add a note (visible to office)" value={note} onChange={(ev) => setNote(ev.target.value)}
                  onKeyDown={(ev) => { if (ev.key === "Enter" && note.trim()) { s.addNote(w.id, note.trim()); setNote(""); } }} />
                <button className="btn" disabled={!note.trim()} onClick={() => { s.addNote(w.id, note.trim()); setNote(""); }}><MessageSquarePlus size={15} />Add</button>
              </div>
              <ol className="p-2">
                {w.history.map((h) => (
                  <li key={h.id} className="flex gap-3 px-2 py-2.5">
                    <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: h.kind === "Alert" ? "var(--danger)" : h.kind === "Status" ? "var(--primary)" : h.kind === "Note" ? "var(--s-posted)" : "var(--border-strong)" }} />
                    <div className="min-w-0 flex-1">
                      <div>{h.text}</div>
                      <div className="text-[12px] text-ink-3">{h.kind} · {h.by} · {fmtDateTime(h.at)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Context rail */}
        <aside className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center gap-2 font-semibold mb-2"><Building2 size={15} className="text-ink-3" />Site</div>
            <div className="font-medium">{b.name}</div>
            <div className="text-ink-2">{b.address}, {b.city}</div>
            {b.access && <div className="mt-2 text-[13px] rounded-md p-2 bg-sunken flex gap-2"><KeyRound size={14} className="text-ink-3 mt-0.5 shrink-0" />{b.access}</div>}
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 font-semibold mb-2"><ScrollText size={15} className="text-ink-3" />
              <Link href={`/contracts/view?id=${c.id}`} className="hover:text-primary">{c.type}-{c.serviceType} contract</Link></div>
            <dl className="grid grid-cols-2 gap-y-1 text-[13px]">
              <dt className="text-ink-3">Journeyman</dt><dd className="num text-right">{money(c.rates.journeyman)}/h</dd>
              <dt className="text-ink-3">Apprentice</dt><dd className="num text-right">{money(c.rates.apprentice)}/h</dd>
              <dt className="text-ink-3">Material markup</dt><dd className="num text-right">{pct(c.type === "Installation" ? c.installationMarkup : c.materialMarkup)}</dd>
              <dt className="text-ink-3">Subtrade markup</dt><dd className="num text-right">{pct(c.type === "Installation" ? c.installationMarkup : c.subtradeMarkup)}</dd>
              <dt className="text-ink-3">Quote markup</dt><dd className="num text-right">{pct(c.quoteMarkup)}</dd>
            </dl>
            {c.poNote && <p className="text-[12.5px] text-ink-2 mt-2">{c.poNote}</p>}
            {c.allInclusive && <p className="text-[12.5px] mt-2" style={{ color: "var(--s-posted)" }}>All-inclusive: PM visits are non-billable.</p>}
          </div>
          {w.equipmentIds.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 font-semibold mb-2"><Wrench size={15} className="text-ink-3" />Equipment</div>
              <ul className="space-y-1.5">{w.equipmentIds.map((id) => { const q = L.equip(id)!; return (
                <li key={id} className="text-[13px]"><span className="font-mono text-ink-2 mr-1.5">{q.tag}</span>{q.type}<div className="text-ink-3 text-[12px]">{[q.manufacturer, q.model, q.location].filter(Boolean).join(" · ")}</div></li>); })}</ul>
            </div>
          )}
          <div className="card p-4">
            <div className="font-semibold mb-2">Contacts</div>
            {w.roles.filter((r) => !TECH_ROLES.includes(r.type) && r.personId).map((r) => { const p = L.person(r.personId)!; return (
              <div key={r.id} className="text-[13px] mb-2 last:mb-0">
                <div className="font-medium">{p.name} <span className="text-ink-3 font-normal">· {r.type}</span></div>
                {p.phone && <div className="text-ink-2 inline-flex items-center gap-1 mr-3"><Phone size={12} />{p.phone}</div>}
                {p.email && <div className="text-ink-2 inline-flex items-center gap-1"><Mail size={12} />{p.email}</div>}
              </div>); })}
            {w.roles.every((r) => TECH_ROLES.includes(r.type) || !r.personId) && <p className="text-ink-3 text-[13px]">No contacts on this {isQ ? "quote" : "work order"}.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function QuoteFlow({ w }: { w: WorkOrder }) {
  const s = useStore();
  const L = useLookups();
  const me = L.person(PERSONAS[s.persona].personId)!;
  const e = economics(w, L.contract(w.contractId)!, s.people, s.invoices);
  const missing = e.quote.missingCost;
  const steps: QuoteStatus[] = ["Draft", "Pricing", "Sent", "Approved"];
  const cur = w.quoteStatus ?? "Draft";
  const idx = cur === "Declined" ? 2 : steps.indexOf(cur);
  const canSend = !!me.canSendQuotes;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Quote workflow</h3>
        <span className="text-[12px] text-ink-3">Option B · hybrid quote creation</span>
      </div>
      <ol className="flex items-center gap-1 mb-4">
        {steps.map((st, i) => (
          <li key={st} className="flex-1 flex items-center gap-1">
            <span className={clsx("grid place-items-center w-6 h-6 rounded-full text-[12px] font-semibold shrink-0",
              i < idx ? "bg-primary text-primary-fg" : i === idx ? "ring-2 ring-primary text-primary bg-primary-soft" : "bg-sunken text-ink-3")}>
              {i < idx ? <Check size={13} /> : i + 1}
            </span>
            <span className={clsx("text-[12.5px] font-medium", i === idx ? "text-ink" : "text-ink-3")}>{{ Draft: "Tech drafts", Pricing: "Coordinator prices", Sent: "On customer portal", Approved: "Approved", Declined: "Declined" }[st]}</span>
            {i < steps.length - 1 && <span className="flex-1 h-px bg-line mx-1" />}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2 items-center">
        {cur === "Draft" && <>
          <button className="btn" onClick={() => s.setQuoteStatus(w.id, "Pricing")}><Calculator size={15} />Request pricing from coordinator</button>
          <button className="btn btn-primary" disabled={!canSend || missing > 0} onClick={() => s.setQuoteStatus(w.id, "Sent")}><Send size={15} />Send to customer</button>
        </>}
        {cur === "Pricing" && <>
          <button className="btn btn-primary" disabled={!canSend || missing > 0} onClick={() => s.setQuoteStatus(w.id, "Sent")}><Send size={15} />Mark "Date Sent" → portal</button>
          {canSend && missing > 0 && <span className="text-[12.5px]" style={{ color: "var(--warn)" }}>Fill {missing} missing cost(s) in Materials first</span>}
        </>}
        {cur === "Sent" && <>
          <button className="btn" onClick={() => s.setQuoteStatus(w.id, "Approved")}><ThumbsUp size={15} />Record approval (email/phone)</button>
          <button className="btn" onClick={() => s.setQuoteStatus(w.id, "Declined")}><ThumbsDown size={15} />Declined</button>
          <span className="text-[12.5px] text-ink-3">Sent {fmtDateTime(w.quoteSentAt)} · customer can also approve on the portal</span>
        </>}
        {cur === "Approved" && <button className="btn btn-primary" onClick={() => s.convertQuote(w.id)}><ArrowRightLeft size={15} />Convert to work order</button>}
        {!canSend && (cur === "Draft" || cur === "Pricing") && <span className="text-[12.5px] text-ink-3">Only senior techs and office can send quotes.</span>}
        {canSend && missing > 0 && cur === "Draft" && <span className="text-[12.5px]" style={{ color: "var(--warn)" }}>{missing} material cost(s) missing — request pricing or fill them in.</span>}
      </div>
      {w.pricingAlertAt && cur === "Pricing" && (
        <p className={clsx("mt-3 text-[12.5px]")} style={{ color: new Date(w.pricingAlertAt) < new Date() ? "var(--danger)" : "var(--text-3)" }}>
          Tech status alert fires {fmtDateTime(w.pricingAlertAt)} if pricing isn't done.
        </p>
      )}
    </div>
  );
}

function Overview({ w }: { w: WorkOrder }) {
  const s = useStore();
  const L = useLookups();
  const c = L.contract(w.contractId)!;
  const up = (k: keyof WorkOrder) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => s.updateWO(w.id, { [k]: ev.target.value } as Partial<WorkOrder>);
  return (
    <div className="space-y-4">
      {w.kind === "QO" && <QuoteFlow w={w} />}
      <div className="card p-4 grid md:grid-cols-2 gap-4">
        <Field label="Customer request" className="md:col-span-2"><textarea className="field" value={w.customerRequest} onChange={up("customerRequest")} /></Field>
        {w.kind === "QO" ? (
          <Field label="Work recommended" className="md:col-span-2"><textarea className="field" value={w.workRecommended ?? ""} onChange={up("workRecommended")} /></Field>
        ) : (
          <Field label="Work performed" className="md:col-span-2" hint="Posted to the customer portal when the tech marks the role Complete."><textarea className="field" value={w.workPerformed ?? ""} onChange={up("workPerformed")} /></Field>
        )}
        <Field label="Internal instructions" className="md:col-span-2"><textarea className="field" value={w.internalInstructions ?? ""} onChange={up("internalInstructions")} /></Field>
        <Field label="PO #" hint={c.poRequired ? "Required by contract" : c.poDefault ? `Default ${c.poDefault}` : undefined}>
          <input className="field font-mono" value={w.po ?? ""} onChange={up("po")} style={c.poRequired && !w.po ? { borderColor: "var(--danger)" } : undefined} />
        </Field>
        <Field label="Caller"><input className="field" value={w.caller ?? ""} onChange={up("caller")} /></Field>
        <Field label="Bill type">
          <select className="field" value={w.billType} onChange={up("billType")}>
            {["Billable", "Non-Billable All-Inclusive", "Non-Billable Warranty", "Non-Billable Training", "Non-Billable Other"].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Urgency">
          <select className="field" value={w.urgency} onChange={up("urgency")}>{["High", "Medium", "Low"].map((x) => <option key={x}>{x}</option>)}</select>
        </Field>
        <Field label="Pricing">
          <select className="field" value={w.estimate} onChange={up("estimate")}><option>Firm Price</option><option>Estimate</option></select>
        </Field>
        <Field label="Due date"><input type="date" className="field" value={w.due ?? ""} onChange={up("due")} /></Field>
      </div>
    </div>
  );
}

function Roles({ w }: { w: WorkOrder }) {
  const s = useStore();
  const L = useLookups();
  const [type, setType] = useState<RoleType>("Secondary Tech");
  const [pid, setPid] = useState<number | "">("");
  const hasPrimary = w.roles.some((r) => r.type === "Primary Tech");
  const types: RoleType[] = (["Primary Tech", "Secondary Tech", "Team Leader", "Internal", "Service Coordinator", "Invoice Contact", "Key Contact", "Property Contact", "PO# Contact", "Quote Contact", "Copy To"] as RoleType[])
    .filter((t) => !(t === "Primary Tech" && hasPrimary));
  const staffish = TECH_ROLES.includes(type);
  const candidates = s.people.filter((p) => (staffish ? p.kind === "staff" : p.kind === "contact"));
  return (
    <div className="card overflow-hidden">
      <table className="tbl">
        <thead><tr><th>Role</th><th>Person</th><th>Scheduled</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {w.roles.map((r) => {
            const p = L.person(r.personId);
            const tech = TECH_ROLES.includes(r.type);
            return (
              <tr key={r.id}>
                <td className="font-medium whitespace-nowrap">{r.type}{r.skill && <div className="text-[12px] text-ink-3 font-normal">{r.skill}{r.skillRequired ? " · required" : ""}</div>}</td>
                <td>{p ? <span className="inline-flex items-center gap-2"><Avatar initials={p.initials} />{p.name}</span> : <span className="text-ink-3">Unassigned</span>}
                  {r.instruction && <div className="text-[12px] text-ink-3 mt-1 max-w-80">{r.instruction}</div>}</td>
                <td className="num whitespace-nowrap text-ink-2">{r.start ? <>{fmtDateTime(r.start)}<span className="text-ink-3"> – {new Date(r.end!).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false })}</span></> : tech ? <Link href="/dispatch" className="text-primary">Schedule</Link> : "—"}</td>
                <td>
                  {tech ? (
                    <div className="flex items-center gap-2">
                      <RoleStatusBadge s={r.status} size="sm" />
                      <select className="field !w-auto !py-0.5 !text-[12.5px]" value={r.status} onChange={(ev) => s.setRoleStatus(w.id, r.id, ev.target.value as RoleStatus)} aria-label="Change status">
                        {ROLE_STATUSES.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </div>
                  ) : <span className="text-ink-3 text-[12.5px]">Contact</span>}
                </td>
                <td className="text-right"><button className="btn btn-ghost btn-sm" onClick={() => s.removeRole(w.id, r.id)} aria-label="Remove role"><Trash2 size={14} /></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="p-3 border-t border-line flex flex-wrap gap-2 items-end bg-sunken/40">
        <Field label="Add role"><select className="field" value={type} onChange={(e) => { setType(e.target.value as RoleType); setPid(""); }}>{types.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Person"><select className="field" value={pid} onChange={(e) => setPid(e.target.value ? Number(e.target.value) : "")}>
          <option value="">— Leave unassigned (Holding) —</option>{candidates.map((p) => <option key={p.id} value={p.id}>{p.name}{p.title ? ` · ${p.title}` : ""}</option>)}</select></Field>
        <button className="btn" onClick={() => { s.addRole(w.id, type, pid || undefined); setPid(""); }}><Plus size={15} />Add</button>
        {hasPrimary && <span className="text-[12px] text-ink-3 pb-2">One Primary Tech per work order.</span>}
      </div>
    </div>
  );
}

function Materials({ w }: { w: WorkOrder }) {
  const s = useStore();
  const L = useLookups();
  const c = L.contract(w.contractId)!;
  const showQuoted = w.kind === "QO" || w.quotedMaterials.length > 0;
  const [form, setForm] = useState({ type: "Parts" as MaterialType, item: "", qty: 1, cost: "" as string, vendor: "" });
  const lists: [string, "quotedMaterials" | "materials"][] = w.kind === "QO" ? [["Quoted materials", "quotedMaterials"]] : [["Actual materials", "materials"], ...(showQuoted ? [["Quoted (for comparison)", "quotedMaterials"] as [string, "quotedMaterials"]] : [])];
  return (
    <div className="space-y-4">
      {lists.map(([title, key]) => {
        const quoted = key === "quotedMaterials";
        const ro = w.kind === "WO" && quoted;
        const rows = w[key];
        return (
          <div key={key} className="card overflow-hidden">
            <div className="px-4 h-11 flex items-center border-b border-line font-semibold">{title}</div>
            <table className="tbl">
              <thead><tr><th>Type</th><th>Item</th><th className="text-right">Qty</th><th className="text-right">Unit cost</th><th className="text-right">Cost +PST</th><th className="text-right">Sell</th><th></th></tr></thead>
              <tbody>
                {rows.map((m) => {
                  const missing = m.unitCost == null || m.unitCost === 0;
                  return (
                    <tr key={m.id} style={missing ? { background: "var(--warn-bg)" } : undefined}>
                      <td className="text-ink-2 whitespace-nowrap">{m.type}</td>
                      <td>{m.item}{m.vendor && <div className="text-[12px] text-ink-3">{m.vendor}</div>}</td>
                      <td className="text-right num">{m.qty}</td>
                      <td className="text-right">
                        {ro ? <span className="num">{m.unitCost == null ? "—" : money2(m.unitCost)}</span> : (
                          <input type="number" min={0} step="0.01" className="field !w-28 text-right num !py-1" defaultValue={m.unitCost ?? ""} placeholder="missing"
                            onBlur={(ev) => ev.target.value !== "" && s.setMaterialCost(w.id, m.id, Number(ev.target.value), quoted)}
                            style={missing ? { borderColor: "var(--warn)" } : undefined} />
                        )}
                      </td>
                      <td className="text-right num">{m.unitCost == null ? "—" : money2(m.unitCost * m.qty * (m.pstExempt ? 1 : 1 + PST))}</td>
                      <td className="text-right num">{money2(materialSell(m, c))}</td>
                      <td className="text-right">{!ro && <button className="btn btn-ghost btn-sm" aria-label="Remove" onClick={() => s.removeEntry(w.id, m.id, key)}><Trash2 size={14} /></button>}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={7} className="text-center text-ink-3 py-6">No entries.</td></tr>}
              </tbody>
            </table>
            {!ro && (
              <div className="p-3 border-t border-line flex flex-wrap gap-2 items-end bg-sunken/40">
                <Field label="Type"><select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MaterialType })}>{MAT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Item" className="flex-1 min-w-48"><input className="field" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} /></Field>
                <Field label="Qty"><input type="number" className="field !w-20 num" value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} /></Field>
                <Field label="Unit cost"><input type="number" className="field !w-28 num" placeholder="optional" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
                <Field label="Vendor"><input className="field !w-40" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></Field>
                <button className="btn" disabled={!form.item} onClick={() => { s.addMaterial(w.id, { type: form.type, item: form.item, qty: form.qty, unitCost: form.cost === "" ? null : Number(form.cost), vendor: form.vendor || undefined }, quoted); setForm({ ...form, item: "", cost: "", vendor: "" }); }}><Plus size={15} />Add</button>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-[12.5px] text-ink-3">Highlighted rows have no purchase cost. Sell = cost × (1 + markup) from the contract{c.type === "Installation" ? " (Installation markup replaces subtrade markup)" : ""}, unless a manual price is set.</p>
    </div>
  );
}

function Time({ w }: { w: WorkOrder }) {
  const s = useStore();
  const L = useLookups();
  const quotedMode = w.kind === "QO";
  const techs = s.people.filter((p) => p.kind === "staff" && p.group !== "Office");
  const [f, setF] = useState({ personId: techs[0].id, hours: 1, type: "Regular" as TimeType, date: new Date().toISOString().slice(0, 10), note: "" });
  const lists: [string, "quotedTime" | "time"][] = quotedMode ? [["Estimated time", "quotedTime"]] : [["Time entries", "time"], ...(w.quotedTime.length ? [["Quoted (estimate)", "quotedTime"] as [string, "quotedTime"]] : [])];
  return (
    <div className="space-y-4">
      {lists.map(([title, key]) => {
        const ro = !quotedMode && key === "quotedTime";
        return (
          <div key={key} className="card overflow-hidden">
            <div className="px-4 h-11 flex items-center justify-between border-b border-line"><span className="font-semibold">{title}</span>
              <span className="num text-ink-2">{w[key].reduce((a, t) => a + t.hours, 0).toFixed(1)} h</span></div>
            <table className="tbl">
              <thead><tr><th>Who</th><th>Date</th><th>Type</th><th className="text-right">Hours</th><th>Note</th><th></th></tr></thead>
              <tbody>
                {w[key].map((t) => { const p = L.person(t.personId)!; return (
                  <tr key={t.id}>
                    <td><span className="inline-flex items-center gap-2"><Avatar initials={p.initials} />{p.name}</span></td>
                    <td className="num text-ink-2">{t.date ? fmtDate(t.date) : <span className="text-ink-3">estimate</span>}</td>
                    <td>{t.type}</td><td className="text-right num">{t.hours.toFixed(1)}</td><td className="text-ink-2">{t.note}</td>
                    <td className="text-right">{!ro && <button className="btn btn-ghost btn-sm" aria-label="Remove" onClick={() => s.removeEntry(w.id, t.id, key)}><Trash2 size={14} /></button>}</td>
                  </tr>); })}
                {w[key].length === 0 && <tr><td colSpan={6} className="text-center text-ink-3 py-6">No entries.</td></tr>}
              </tbody>
            </table>
            {!ro && (
              <div className="p-3 border-t border-line flex flex-wrap gap-2 items-end bg-sunken/40">
                <Field label="Tech"><select className="field" value={f.personId} onChange={(e) => setF({ ...f, personId: Number(e.target.value) })}>{techs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
                {!quotedMode && <Field label="Date"><input type="date" className="field" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>}
                <Field label="Type"><select className="field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as TimeType })}>{TIME_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Hours"><input type="number" step="0.25" className="field !w-20 num" value={f.hours} onChange={(e) => setF({ ...f, hours: Number(e.target.value) })} /></Field>
                <Field label="Internal note" className="flex-1 min-w-40"><input className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
                <button className="btn" onClick={() => s.addTime(w.id, { personId: f.personId, hours: f.hours, type: f.type, date: quotedMode ? undefined : f.date, note: f.note || undefined }, quotedMode)}><Plus size={15} />Add</button>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-[12.5px] text-ink-3">An entry without a date is an estimate; with a date it's actual time (matches GPP behaviour).</p>
    </div>
  );
}
