"use client";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, Download, Pencil, Check, Plus, Search, Users, ScrollText, Phone, Mail } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { deriveStatus, economics, fmtDate, invoiceSubtotal, money } from "@/lib/logic";
import { downloadCSV } from "@/lib/csv";
import { Avatar, Empty, Field, InvoiceStatusBadge, PageHeader, WOStatusBadge } from "@/components/ui";
import type { Org } from "@/lib/types";

const CATEGORIES = ["Customer", "Property Management Company", "Strata Unit", "Owner", "Educational Institution", "Corporation", "Contractor", "Subtrade", "Supplier", "Business Unit", "Other"];

function OrgList() {
  const s = useStore();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [n, setN] = useState({ name: "", category: "Customer", accountCode: "" });
  const canEdit = s.persona !== "tech";
  const qq = q.trim().toLowerCase();
  const list = s.orgs.filter((o) => !qq || `${o.name} ${o.accountCode ?? ""} ${o.category}`.toLowerCase().includes(qq)).sort((a, b) => a.name.localeCompare(b.name));
  const count = (id: number) => ({ b: s.buildings.filter((b) => b.orgId === id).length, c: s.contracts.filter((c) => c.orgId === id && c.active).length, w: s.workOrders.filter((w) => w.orgId === id && w.kind === "WO" && !w.closed).length });

  return (
    <div className="space-y-4">
      <PageHeader title="Organizations" sub="Customers, management companies, subtrades and suppliers."
        actions={<>
          <button className="btn" onClick={() => downloadCSV("organizations", ["ID", "Name", "Category", "Account code", "Parent", "Phone", "Email", "Buildings", "Active contracts"],
            list.map((o) => [o.id, o.name, o.category, o.accountCode, s.orgs.find((p) => p.id === o.parentId)?.name, o.phone, o.email, count(o.id).b, count(o.id).c]))}><Download size={15} />CSV</button>
          {canEdit && <button className="btn btn-primary" onClick={() => setAdding(!adding)}><Plus size={15} />Add</button>}
        </>} />
      {adding && (
        <div className="card p-4 flex flex-wrap gap-3 items-end">
          <Field label="Name *" className="flex-1 min-w-56"><input className="field" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} /></Field>
          <Field label="Category"><select className="field" value={n.category} onChange={(e) => setN({ ...n, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Account code"><input className="field !w-32" value={n.accountCode} onChange={(e) => setN({ ...n, accountCode: e.target.value })} /></Field>
          <button className="btn btn-primary" disabled={!n.name.trim()} onClick={() => { const id = s.saveRecord("org", { name: n.name.trim(), category: n.category, accountCode: n.accountCode || undefined }); window.location.href = `/orgs?id=${id}`; }}>Save</button>
        </div>
      )}
      <div className="card">
        <div className="p-3 border-b border-line"><div className="relative max-w-sm"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input className="field !pl-8" placeholder="Name, account code, category" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
        <table className="tbl">
          <thead><tr><th>Organization</th><th>Category</th><th>Account</th><th className="text-right">Buildings</th><th className="text-right">Contracts</th><th className="text-right">Open WOs</th></tr></thead>
          <tbody>{list.map((o) => { const c = count(o.id); const parent = s.orgs.find((p) => p.id === o.parentId); return (
            <tr key={o.id} className="cursor-pointer" onClick={() => (window.location.href = `/orgs?id=${o.id}`)}>
              <td><Link href={`/orgs?id=${o.id}`} className="font-medium text-primary">{o.name}</Link>{parent && <div className="text-[12px] text-ink-3">under {parent.name}</div>}</td>
              <td className="text-ink-2">{o.category}</td><td className="font-mono text-[12.5px]">{o.accountCode ?? "—"}</td>
              <td className="text-right num">{c.b}</td><td className="text-right num">{c.c}</td><td className="text-right num">{c.w}</td>
            </tr>); })}</tbody>
        </table>
      </div>
    </div>
  );
}

function OrgCard({ id }: { id: number }) {
  const s = useStore(); const L = useLookups();
  const o = L.org(id);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState<Org | undefined>(o);
  const canEdit = s.persona !== "tech";
  const d = useMemo(() => {
    if (!o) return null;
    // descendants (for roll-up)
    const ids = new Set([id]); let grew = true;
    while (grew) { grew = false; for (const x of s.orgs) if (x.parentId && ids.has(x.parentId) && !ids.has(x.id)) { ids.add(x.id); grew = true; } }
    const wos = s.workOrders.filter((w) => ids.has(w.orgId));
    const revenue = wos.filter((w) => w.kind === "WO" && w.billType === "Billable").reduce((a, w) => { const c = L.contract(w.contractId); return a + (c ? economics(w, c, s.people, s.invoices).actual.sell : 0); }, 0);
    const invs = s.invoices.filter((i) => wos.some((w) => w.id === i.woId));
    const outstanding = invs.filter((i) => i.status === "Sent").reduce((a, i) => a + invoiceSubtotal(i), 0);
    return { ids, wos, revenue, invs, outstanding };
  }, [o, id, s.orgs, s.workOrders, s.invoices, s.people, L]);
  if (!o || !d) return <Empty>Organization not found. <Link className="text-primary" href="/orgs">All organizations</Link></Empty>;
  const subs = s.orgs.filter((x) => x.parentId === id);
  const parent = s.orgs.find((x) => x.id === o.parentId);
  const people = s.people.filter((p) => p.orgId === id);
  const buildings = s.buildings.filter((b) => d.ids.has(b.orgId));
  const contracts = s.contracts.filter((c) => d.ids.has(c.orgId));
  const openWos = d.wos.filter((w) => w.kind === "WO" && !w.closed).sort((a, b) => b.id - a.id).slice(0, 10);

  return (
    <div className="space-y-4">
      <Link href="/orgs" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink"><ArrowLeft size={15} />Organizations</Link>
      <div className="card p-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-ink-3 text-[12.5px]">{o.category}{o.accountCode ? ` · account ${o.accountCode}` : ""}{parent ? <> · under <Link className="text-primary" href={`/orgs?id=${parent.id}`}>{parent.name}</Link></> : null}</div>
            <h1 className="text-[22px] font-semibold tracking-tight">{o.name}</h1>
            <p className="text-ink-2 flex flex-wrap gap-x-4">{o.phone && <span className="inline-flex items-center gap-1"><Phone size={13} />{o.phone}</span>}{o.email && <span className="inline-flex items-center gap-1"><Mail size={13} />{o.email}</span>}{o.address && <span>{o.address}</span>}</p>
          </div>
          {canEdit && !edit && <button className="btn" onClick={() => { setF(o); setEdit(true); }}><Pencil size={14} />Edit</button>}
        </div>
        {edit && f && (
          <div className="grid sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-line">
            <Field label="Name"><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Category"><select className="field" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{[...new Set([f.category, ...CATEGORIES])].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Parent organization"><select className="field" value={f.parentId ?? ""} onChange={(e) => setF({ ...f, parentId: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">— none —</option>{s.orgs.filter((x) => !d.ids.has(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
            <Field label="Account code"><input className="field font-mono" value={f.accountCode ?? ""} onChange={(e) => setF({ ...f, accountCode: e.target.value || undefined })} /></Field>
            <Field label="Phone"><input className="field" value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value || undefined })} /></Field>
            <Field label="Email"><input className="field" type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value || undefined })} /></Field>
            <Field label="Mailing address" className="sm:col-span-2"><input className="field" value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value || undefined })} /></Field>
            <div className="flex gap-2 items-end justify-end"><button className="btn" onClick={() => setEdit(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!f.name.trim()} onClick={() => { s.saveRecord("org", f as unknown as Record<string, unknown>); setEdit(false); }}><Check size={14} />Save</button></div>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line rounded-lg overflow-hidden border border-line mt-4">
          {[["Revenue (billable WOs)", money(d.revenue)], ["Outstanding invoices", money(d.outstanding)], ["Buildings", String(buildings.length)], ["Active contracts", String(contracts.filter((c) => c.active).length)]].map(([k, v]) => (
            <div key={k} className="bg-surface p-3"><div className="label">{k}</div><div className="num text-[17px] font-semibold mt-0.5">{v}</div></div>))}
        </div>
        {subs.length > 0 && <p className="text-[12.5px] text-ink-3 mt-2">Totals include {subs.length} sub-organization{subs.length > 1 ? "s" : ""}: {subs.map((x, i) => <span key={x.id}>{i ? ", " : ""}<Link className="text-primary" href={`/orgs?id=${x.id}`}>{x.name}</Link></span>)}</p>}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <section className="card p-4">
          <h2 className="font-semibold mb-2 inline-flex items-center gap-1.5"><Users size={15} />People ({people.length})</h2>
          {people.length === 0 ? <p className="text-ink-3">No contacts linked.</p> : <ul className="space-y-2">{people.map((p) => (
            <li key={p.id}><Link href={`/people?id=${p.id}`} className="flex items-center gap-2 hover:text-primary"><Avatar initials={p.initials} /><span className="font-medium">{p.name}</span><span className="text-ink-3 text-[12.5px]">{p.title}</span></Link></li>))}</ul>}
          {canEdit && <Link href={`/people?new=1&org=${id}`} className="btn btn-sm mt-3"><Plus size={13} />Add contact</Link>}
        </section>
        <section className="card p-4">
          <h2 className="font-semibold mb-2 inline-flex items-center gap-1.5"><Building2 size={15} />Buildings ({buildings.length})</h2>
          <ul className="space-y-1.5">{buildings.map((b) => <li key={b.id}><Link className="text-primary" href={`/buildings#b${b.id}`}>{b.name}</Link> <span className="text-ink-3 text-[12.5px]">{b.address}, {b.city}</span></li>)}</ul>
        </section>
        <section className="card p-4">
          <h2 className="font-semibold mb-2 inline-flex items-center gap-1.5"><ScrollText size={15} />Contracts ({contracts.length})</h2>
          <ul className="space-y-1.5">{contracts.map((c) => <li key={c.id}><Link className="text-primary" href={`/contracts/view?id=${c.id}`}>{c.type}-{c.serviceType}</Link> <span className="text-ink-3 text-[12.5px]">#{c.id} · since {fmtDate(c.start)}{c.active ? "" : " · inactive"}</span></li>)}</ul>
        </section>
        <section className="card overflow-hidden">
          <div className="px-4 h-11 flex items-center border-b border-line font-semibold">Open work orders</div>
          {openWos.length === 0 ? <p className="p-4 text-ink-3">None.</p> : <table className="tbl"><tbody>{openWos.map((w) => (
            <tr key={w.id}><td><Link className="num text-primary font-medium" href={`/work-orders/view?id=${w.id}`}>{w.id}</Link></td><td className="truncate max-w-64">{w.customerRequest}</td><td><WOStatusBadge s={deriveStatus(w)} size="sm" /></td></tr>))}</tbody></table>}
        </section>
      </div>
      {d.invs.length > 0 && (
        <section className="card overflow-hidden">
          <div className="px-4 h-11 flex items-center border-b border-line font-semibold">Invoices</div>
          <table className="tbl"><thead><tr><th>Invoice</th><th>Date</th><th>WO</th><th className="text-right">Subtotal</th><th>Status</th></tr></thead>
            <tbody>{d.invs.sort((a, b) => b.id - a.id).map((i) => (
              <tr key={i.id}><td><Link className="num text-primary" href={`/invoices?open=${i.id}`}>{i.id}</Link></td><td className="num">{fmtDate(i.date)}</td><td className="num">{i.woId}</td><td className="text-right num">{money(invoiceSubtotal(i))}</td><td><InvoiceStatusBadge s={i.status} size="sm" /></td></tr>))}</tbody></table>
        </section>
      )}
    </div>
  );
}

function Page() {
  const id = Number(useSearchParams().get("id"));
  return id ? <OrgCard key={id} id={id} /> : <OrgList />;
}
export default function Orgs() { return <Suspense><Page /></Suspense>; }
