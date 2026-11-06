"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { apiEnabled, users, auditLog, type AuditRow } from "@/lib/api";
import { fmtDateTime } from "@/lib/logic";
import { Field } from "./ui";

export function MyPassword() {
  const [cur, setCur] = useState(""); const [next, setNext] = useState(""); const [rep, setRep] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  if (!apiEnabled) return null;
  const save = async () => {
    if (next !== rep) return setMsg({ ok: false, t: "New passwords don't match" });
    try { await users.changeMine(cur, next); setMsg({ ok: true, t: "Password changed" }); setCur(""); setNext(""); setRep(""); }
    catch (e) { setMsg({ ok: false, t: (e as Error).message }); }
  };
  return (
    <section className="card p-5">
      <h2 className="font-semibold mb-3">My password</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Current"><input type="password" className="field" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label="New (min 10 characters)"><input type="password" className="field" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <Field label="Repeat new"><input type="password" className="field" autoComplete="new-password" value={rep} onChange={(e) => setRep(e.target.value)} /></Field>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button className="btn" disabled={!cur || next.length < 10 || !rep} onClick={save}>Change password</button>
        {msg && <span className="inline-flex items-center gap-1 text-[13px]" style={{ color: msg.ok ? "var(--ok)" : "var(--danger)" }}>{msg.ok && <Check size={14} />}{msg.t}</span>}
      </div>
    </section>
  );
}

export function AuditLog() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (apiEnabled) auditLog().then(setRows).catch((e) => setErr(e.message)); }, []);
  if (!apiEnabled) return null;
  const label: Record<string, string> = { wo: "Work order", invoice: "Invoice", contract: "Contract", profile: "PM profile", settings: "Settings", price: "Price book", file: "File", org: "Organization", building: "Building", equipment: "Equipment", person: "Contact" };
  return (
    <section className="card p-5">
      <h2 className="font-semibold mb-1">Activity log</h2>
      <p className="text-[12.5px] text-ink-3 mb-3">Last 200 changes, newest first.</p>
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      <div className="max-h-96 overflow-auto">
        <table className="tbl">
          <thead><tr><th>When</th><th>Who</th><th>What</th><th>Action</th></tr></thead>
          <tbody>{(rows ?? []).map((r) => (
            <tr key={r.id}><td className="num text-ink-2 whitespace-nowrap">{fmtDateTime(r.at)}</td><td>{r.email ?? "—"}</td>
              <td>{label[r.kind] ?? r.kind}{r.entity_id ? <span className="num text-ink-3"> #{r.entity_id}</span> : null}</td><td className="text-ink-2">{r.action}</td></tr>))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
