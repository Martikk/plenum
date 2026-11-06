"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Pencil, Check, Plus, Search, Phone, Mail } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/logic";
import { downloadCSV } from "@/lib/csv";
import { Avatar, Chip, Empty, Field, PageHeader, RoleStatusBadge } from "@/components/ui";
import type { Person } from "@/lib/types";

const initialsOf = (name: string) => name.split(/\s+/).map((x) => x[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "?";

function PeopleList() {
  const s = useStore(); const L = useLookups();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "staff" | "contact">("all");
  const qq = q.trim().toLowerCase();
  const list = s.people.filter((p) => kind === "all" || p.kind === kind)
    .filter((p) => !qq || `${p.name} ${p.title ?? ""} ${p.email ?? ""} ${p.phone ?? ""} ${L.org(p.orgId)?.name ?? ""}`.toLowerCase().includes(qq))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="space-y-4">
      <PageHeader title="People" sub="Staff and customer contacts."
        actions={<>
          <button className="btn" onClick={() => downloadCSV("people", ["ID", "Name", "Kind", "Title", "Organization", "Email", "Phone", "Skills"], list.map((p) => [p.id, p.name, p.kind, p.title, L.org(p.orgId)?.name, p.email, p.phone, p.skills?.join("; ")]))}><Download size={15} />CSV</button>
          {s.persona !== "tech" && <Link href="/people?new=1" className="btn btn-primary"><Plus size={15} />Add contact</Link>}
        </>} />
      <div className="card">
        <div className="p-3 border-b border-line flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-56 max-w-sm"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input className="field !pl-8" placeholder="Name, title, email, phone, organization" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {(["all", "staff", "contact"] as const).map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)} count={s.people.filter((p) => k === "all" || p.kind === k).length}>{k === "all" ? "All" : k === "staff" ? "Staff" : "Customer contacts"}</Chip>)}
        </div>
        <table className="tbl">
          <thead><tr><th>Name</th><th>Title</th><th>Organization</th><th>Email</th><th>Phone</th></tr></thead>
          <tbody>{list.map((p) => (
            <tr key={p.id} className="cursor-pointer" onClick={() => (window.location.href = `/people?id=${p.id}`)}>
              <td><Link href={`/people?id=${p.id}`} className="inline-flex items-center gap-2 font-medium text-primary"><Avatar initials={p.initials} />{p.name}</Link></td>
              <td className="text-ink-2">{p.title}</td>
              <td>{p.kind === "staff" ? <span className="text-ink-3">Staff · {p.group}</span> : L.org(p.orgId) ? <Link className="text-primary" href={`/orgs?id=${p.orgId}`}>{L.org(p.orgId)!.name}</Link> : "—"}</td>
              <td className="text-ink-2">{p.email}</td><td className="text-ink-2 num">{p.phone}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

function PersonCard({ id, isNew, orgPreset }: { id: number; isNew: boolean; orgPreset?: number }) {
  const s = useStore(); const L = useLookups();
  const p = L.person(id);
  const blank: Person = { id: 0, name: "", initials: "", kind: "contact", orgId: orgPreset };
  const [edit, setEdit] = useState(isNew);
  const [f, setF] = useState<Person>(p ?? blank);
  const canEdit = s.persona !== "tech" && (isNew || p?.kind === "contact");
  if (!isNew && !p) return <Empty>Person not found. <Link className="text-primary" href="/people">People</Link></Empty>;

  const roles = p ? s.workOrders.flatMap((w) => w.roles.filter((r) => r.personId === p.id).map((r) => ({ w, r }))) : [];
  const active = roles.filter(({ w, r }) => !w.closed && r.status !== "Complete" && r.status !== "Declined").sort((a, b) => b.w.id - a.w.id);
  const save = () => {
    const nid = s.saveRecord("contact", { ...f, id: isNew ? undefined : f.id, initials: initialsOf(f.name), kind: "contact" } as unknown as Record<string, unknown>);
    setEdit(false);
    if (isNew) window.location.href = `/people?id=${nid}`;
  };

  return (
    <div className="space-y-4">
      <Link href="/people" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink"><ArrowLeft size={15} />People</Link>
      <div className="card p-4">
        {!edit && p && (
          <div className="flex items-start gap-3 flex-wrap">
            <Avatar initials={p.initials} size={44} />
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-semibold tracking-tight">{p.name}</h1>
              <p className="text-ink-2">{p.title}{p.kind === "staff" ? ` · ${p.group}` : L.org(p.orgId) ? <> · <Link className="text-primary" href={`/orgs?id=${p.orgId}`}>{L.org(p.orgId)!.name}</Link></> : null}</p>
              <p className="text-ink-2 flex flex-wrap gap-x-4 mt-1">{p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone size={13} />{p.phone}</a>}{p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail size={13} />{p.email}</a>}</p>
              {p.skills && p.skills.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{p.skills.map((k) => <span key={k} className="text-[12px] px-1.5 py-0.5 rounded bg-sunken">{k}</span>)}</div>}
              {p.notes && <p className="mt-2 text-[13px] rounded-md bg-sunken p-2">{p.notes}</p>}
            </div>
            {canEdit && <button className="btn" onClick={() => { setF(p); setEdit(true); }}><Pencil size={14} />Edit</button>}
          </div>
        )}
        {edit && (
          <div className="grid sm:grid-cols-3 gap-3">
            <h1 className="sm:col-span-3 text-[18px] font-semibold">{isNew ? "New customer contact" : "Edit contact"}</h1>
            <Field label="Full name *"><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Title"><input className="field" value={f.title ?? ""} onChange={(e) => setF({ ...f, title: e.target.value || undefined })} placeholder="e.g. Strata Manager" /></Field>
            <Field label="Organization"><select className="field" value={f.orgId ?? ""} onChange={(e) => setF({ ...f, orgId: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">— none —</option>{s.orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
            <Field label="Email"><input className="field" type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value || undefined })} /></Field>
            <Field label="Phone"><input className="field" value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value || undefined })} /></Field>
            <Field label="Notes" className="sm:col-span-3"><textarea className="field" value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value || undefined })} placeholder="Access, preferred contact hours…" /></Field>
            <div className="sm:col-span-3 flex justify-end gap-2">
              {!isNew && <button className="btn" onClick={() => setEdit(false)}>Cancel</button>}
              <button className="btn btn-primary" disabled={f.name.trim().length < 2} onClick={save}><Check size={14} />Save</button>
            </div>
          </div>
        )}
      </div>
      {p && (
        <section className="card overflow-hidden">
          <div className="px-4 h-11 flex items-center border-b border-line font-semibold">Active assignments ({active.length})</div>
          {active.length === 0 ? <p className="p-4 text-ink-3">None.</p> : (
            <table className="tbl"><thead><tr><th>WO</th><th>Building</th><th>Role</th><th>Scheduled</th><th>Status</th></tr></thead>
              <tbody>{active.map(({ w, r }) => (
                <tr key={r.id}><td><Link className="num text-primary font-medium" href={`/work-orders/view?id=${w.id}`}>{w.id}</Link></td><td>{L.building(w.buildingId)?.name}</td><td className="text-ink-2">{r.type}</td>
                  <td className="num text-ink-2">{r.start ? fmtDateTime(r.start) : "—"}</td><td><RoleStatusBadge s={r.status} size="sm" /></td></tr>))}</tbody></table>
          )}
        </section>
      )}
    </div>
  );
}

function Page() {
  const q = useSearchParams();
  const id = Number(q.get("id")); const isNew = q.get("new") === "1"; const org = Number(q.get("org")) || undefined;
  return id || isNew ? <PersonCard key={id || "new"} id={id} isNew={isNew} orgPreset={org} /> : <PeopleList />;
}
export default function People() { return <Suspense><Page /></Suspense>; }
