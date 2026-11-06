"use client";
import { useState } from "react";
import { Logo } from "@/components/shell";
import { Field } from "@/components/ui";
import { apiEnabled, login } from "@/lib/api";

const DEMO = [
  ["dispatch@plenum.demo", "Dispatch"],
  ["coordinator@plenum.demo", "Service Coordinator"],
  ["tech@plenum.demo", "Senior Tech"],
  ["manager@plenum.demo", "Coordination Manager"],
  ["ceo@plenum.demo", "CEO"],
];

export default function Login() {
  const [email, setEmail] = useState(DEMO[0][0]);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!apiEnabled) return <p className="text-ink-2">Running in local demo mode: no sign-in needed.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await login(email, password); window.location.href = "/"; }
    catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <form onSubmit={submit} className="card p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2.5"><Logo size={30} /><span className="text-[19px] font-semibold tracking-tight">Plenum</span></div>
        <Field label="Account">
          <select className="field" value={email} onChange={(e) => setEmail(e.target.value)}>
            {DEMO.map(([e, l]) => <option key={e} value={e}>{l} · {e}</option>)}
          </select>
        </Field>
        <Field label="Password"><input type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus /></Field>
        {err && <p className="text-[13px]" style={{ color: "var(--danger)" }}>{err}</p>}
        <button className="btn btn-primary w-full justify-center" disabled={busy || !password}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
