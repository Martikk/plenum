"use client";
import { useEffect, useState } from "react";
import { Trash2, KeyRound, UserPlus } from "lucide-react";
import { users, type Role, type UserRow } from "@/lib/api";
import { PERSONAS, useStore } from "@/lib/store";

const ROLE_LABEL: Record<Role, string> = { ...Object.fromEntries(Object.entries(PERSONAS).map(([k, v]) => [k, v.label])), customer: "Customer (portal)" } as Record<Role, string>;
const ROLES = Object.keys(ROLE_LABEL) as Role[];
import { Field } from "./ui";

export function Users() {
  const s = useStore();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ email: "", password: "", personId: 0, role: "tech" as Role, orgId: 0 });
  const staff = s.people.filter((p) => p.kind === (f.role === "customer" ? "contact" : "staff"));
  const load = () => users.list().then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const run = (p: Promise<unknown>) => p.then(() => { setErr(null); load(); }).catch((e) => setErr(e.message));

  return (
    <section className="card p-5">
      <h2 className="font-semibold mb-1">Users</h2>
      <p className="text-[12.5px] text-ink-3 mb-4">Each login is linked to a staff record (for scheduling and history) and a role that sets permissions.</p>
      {err && <p className="mb-3 text-[13px]" style={{ color: "var(--danger)" }}>{err}</p>}
      <table className="tbl mb-4">
        <thead><tr><th>Email</th><th>Person</th><th>Role</th><th></th></tr></thead>
        <tbody>{rows.map((u) => (
          <tr key={u.id}>
            <td>{u.email}</td>
            <td>{s.people.find((p) => p.id === u.person_id)?.name}{u.org_id ? <div className="text-[12px] text-ink-3">{s.orgs.find((o) => o.id === u.org_id)?.name}</div> : null}</td>
            <td>{u.role === "customer" ? ROLE_LABEL.customer : (
              <select className="field !w-auto !py-0.5" value={u.role} onChange={(e) => run(users.update(u.id, { role: e.target.value as Role }))}>
                {ROLES.filter((r) => r !== "customer").map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>)}</td>
            <td className="text-right whitespace-nowrap">
              <button className="btn btn-ghost btn-sm" title="Set password" onClick={() => { const pw = prompt(`New password for ${u.email} (min 10 characters)`); if (pw) run(users.update(u.id, { password: pw })); }}><KeyRound size={14} /></button>
              <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => { if (confirm(`Delete ${u.email}?`)) run(users.remove(u.id)); }}><Trash2 size={14} /></button>
            </td>
          </tr>))}
        </tbody>
      </table>
      <div className="grid sm:grid-cols-4 gap-2 items-end">
        <Field label="Email"><input className="field" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Person"><select className="field" value={f.personId} onChange={(e) => setF({ ...f, personId: Number(e.target.value) })}>
          <option value={0}>Select…</option>{staff.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.title}</option>)}</select></Field>
        <Field label="Role"><select className="field" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role, personId: 0 })}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
        {f.role === "customer" && <Field label="Organization"><select className="field" value={f.orgId} onChange={(e) => setF({ ...f, orgId: Number(e.target.value) })}>
          <option value={0}>Select…</option>{s.orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>}
        <Field label="Temporary password"><input className="field" type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      </div>
      <button className="btn mt-3" disabled={!f.email || !f.personId || f.password.length < 10 || (f.role === "customer" && !f.orgId)}
        onClick={() => run(users.create({ ...f, orgId: f.role === "customer" ? f.orgId : undefined }).then(() => setF({ email: "", password: "", personId: 0, role: "tech", orgId: 0 })))}><UserPlus size={15} />Add user</button>
      <span className="text-[12px] text-ink-3 ml-3">Password at least 10 characters. Customer accounts see only their organization on the portal.</span>
    </section>
  );
}
