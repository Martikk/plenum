"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { CalendarPlus, Plus } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { Avatar, Chip, Field, PageHeader } from "@/components/ui";

const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ymOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export default function Maintenance() {
  const s = useStore(); const L = useLookups();
  const office = s.persona !== "tech";
  const [ym, setYm] = useState(() => ymOf(new Date()));
  const [result, setResult] = useState<number[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", contractId: s.contracts[0].id, buildingId: s.contracts[0].buildingIds[0], months: [] as number[], hours: 2, techId: 0, description: "" });

  const month = Number(ym.slice(5));
  const due = s.profiles.filter((p) => p.active && p.months.includes(month));
  const pending = due.filter((p) => !p.generated.includes(ym));
  const techs = s.people.filter((p) => p.kind === "staff" && p.group !== "Office");
  const contract = L.contract(f.contractId)!;

  return (
    <div>
      <PageHeader title="Maintenance profiles" sub="Recurring PM visits per contract and building. Generate the month's work orders in one click; they land in the dispatch backlog."
        actions={office ? <button className="btn" onClick={() => setAdding(!adding)}><Plus size={15} />New profile</button> : undefined} />

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-4">
        <Field label="Period"><input type="month" className="field" value={ym} onChange={(e) => { setYm(e.target.value); setResult(null); }} /></Field>
        <div className="text-ink-2 pb-1.5"><span className="num font-semibold text-ink">{due.length}</span> profile(s) due in {M[month - 1]} · <span className="num font-semibold text-ink">{pending.length}</span> not generated yet</div>
        <div className="flex-1" />
        {office && <button className="btn btn-primary" disabled={!pending.length} onClick={() => setResult(s.generatePM(ym))}><CalendarPlus size={15} />Generate {pending.length} work order{pending.length === 1 ? "" : "s"}</button>}
      </div>
      {result && (
        <div className="card p-3 mb-4 text-[13.5px]" style={{ background: "var(--ok-bg)", borderColor: "var(--ok)", color: "var(--ok)" }}>
          Created {result.length} work order(s): {result.map((id) => <Link key={id} className="underline num mr-2" href={`/work-orders/view?id=${id}`}>#{id}</Link>)} · <Link className="underline" href="/dispatch">open dispatch</Link>
        </div>
      )}

      {adding && (
        <div className="card p-4 mb-4 grid md:grid-cols-3 gap-3">
          <Field label="Name" className="md:col-span-2"><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Annual boiler cleaning" /></Field>
          <Field label="Hours per visit"><input type="number" step="0.5" className="field num" value={f.hours} onChange={(e) => setF({ ...f, hours: Number(e.target.value) })} /></Field>
          <Field label="Contract"><select className="field" value={f.contractId} onChange={(e) => { const c = L.contract(Number(e.target.value))!; setF({ ...f, contractId: c.id, buildingId: c.buildingIds[0] }); }}>
            {s.contracts.map((c) => <option key={c.id} value={c.id}>{c.type}-{c.serviceType} | {L.org(c.orgId)?.name}</option>)}</select></Field>
          <Field label="Building"><select className="field" value={f.buildingId} onChange={(e) => setF({ ...f, buildingId: Number(e.target.value) })}>
            {contract.buildingIds.map((b) => <option key={b} value={b}>{L.building(b)?.name}</option>)}</select></Field>
          <Field label="Preferred tech"><select className="field" value={f.techId} onChange={(e) => setF({ ...f, techId: Number(e.target.value) })}>
            <option value={0}>— unassigned —</option>{techs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Months" className="md:col-span-3">
            <div className="flex flex-wrap gap-1.5">{M.map((m, i) => <Chip key={m} active={f.months.includes(i + 1)} onClick={() => setF({ ...f, months: f.months.includes(i + 1) ? f.months.filter((x) => x !== i + 1) : [...f.months, i + 1].sort((a, b) => a - b) })}>{m}</Chip>)}</div>
          </Field>
          <Field label="Scope" className="md:col-span-3"><textarea className="field" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div className="md:col-span-3 flex gap-2 justify-end">
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={!f.name || !f.months.length} onClick={() => {
              s.addProfile({ name: f.name, contractId: f.contractId, buildingId: f.buildingId, months: f.months, hours: f.hours, techIds: f.techId ? [f.techId] : [], equipmentIds: [], description: f.description, active: true });
              setAdding(false); setF({ ...f, name: "", months: [], description: "" });
            }}>Save profile</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Profile</th><th>Contract · building</th><th>Months</th><th className="text-right">Hours</th><th>Tech</th><th>{M[month - 1]}</th><th>Active</th></tr></thead>
          <tbody>
            {s.profiles.map((p) => {
              const c = L.contract(p.contractId); const b = L.building(p.buildingId); const t = L.person(p.techIds[0]);
              const isDue = p.months.includes(month); const done = p.generated.includes(ym);
              return (
                <tr key={p.id} className={clsx(!p.active && "opacity-55")}>
                  <td><div className="font-medium">{p.name}</div><div className="text-[12.5px] text-ink-3 max-w-80 truncate">{p.description}</div></td>
                  <td><div>{c?.type}-{c?.serviceType}</div><div className="text-ink-2">{b?.name}</div></td>
                  <td><div className="flex gap-0.5 whitespace-nowrap">{M.map((m, i) => <span key={m} className={clsx("text-[11px] px-1 rounded", p.months.includes(i + 1) ? "bg-primary-soft text-primary font-semibold" : "text-ink-3")}>{m[0]}</span>)}</div></td>
                  <td className="text-right num">{p.hours}</td>
                  <td>{t ? <span className="inline-flex items-center gap-1.5"><Avatar initials={t.initials} />{t.name.split(" ")[0]}</span> : <span className="text-ink-3">—</span>}</td>
                  <td className="text-[12.5px]">{!isDue ? <span className="text-ink-3">—</span> : done ? <span style={{ color: "var(--ok)" }}>Generated</span> : <span style={{ color: "var(--warn)" }}>Due</span>}</td>
                  <td><input type="checkbox" checked={p.active} disabled={!office} onChange={(e) => s.updateProfile(p.id, { active: e.target.checked })} aria-label="Active" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
