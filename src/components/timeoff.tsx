"use client";
import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/logic";
import { Field } from "./ui";
import type { TimeOff } from "@/lib/types";

const KINDS: TimeOff["kind"][] = ["Vacation", "Sick", "Training", "Stat holiday", "Other"];

/** Time off and company holidays. Scheduling onto these days is blocked. */
export function TimeOffPanel() {
  const s = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const staff = s.people.filter((p) => p.kind === "staff" && p.group !== "Office");
  const [f, setF] = useState({ personId: staff[0]?.id ?? 0, kind: "Vacation" as TimeOff["kind"], start: today, end: today, note: "" });
  const upcoming = s.timeOff.filter((t) => t.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  const who = (id: number) => (id === 0 ? "Whole company" : s.people.find((p) => p.id === id)?.name ?? `#${id}`);
  const span = (t: TimeOff) => (t.start === t.end ? fmtDate(t.start + "T12:00") : `${fmtDate(t.start + "T12:00")} – ${fmtDate(t.end + "T12:00")}`);

  return (
    <section className="card p-4 mb-4">
      <h2 className="font-semibold mb-3">Time off & holidays</h2>
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
        <div>
          {upcoming.length === 0 ? <p className="text-ink-3">Nothing upcoming.</p> : (
            <ul className="divide-y divide-[var(--border)]">
              {upcoming.map((t) => (
                <li key={t.id} className="py-1.5 flex items-center gap-3">
                  <span className="num text-ink-2 w-36 shrink-0">{span(t)}</span>
                  <span className="flex-1 min-w-0 truncate"><span className="font-medium">{who(t.personId)}</span> · {t.kind}{t.note ? ` · ${t.note}` : ""}</span>
                  <button className="text-ink-3 hover:text-ink" aria-label="Remove" onClick={() => s.removeTimeOff(t.id)}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-2 items-end content-start">
          <Field label="Who"><select className="field" value={f.personId} onChange={(e) => { const id = Number(e.target.value); setF({ ...f, personId: id, kind: id === 0 ? "Stat holiday" : f.kind === "Stat holiday" ? "Vacation" : f.kind }); }}>
            <option value={0}>Whole company (holiday)</option>{staff.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Type"><select className="field" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as TimeOff["kind"] })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="From"><input type="date" className="field" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value, end: e.target.value > f.end ? e.target.value : f.end })} /></Field>
          <Field label="To (inclusive)"><input type="date" className="field" value={f.end} min={f.start} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
          <Field label="Note" className="sm:col-span-2"><input className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="optional" /></Field>
          <button className="btn sm:col-span-2 justify-center" disabled={!f.start || f.end < f.start} onClick={() => { s.saveTimeOff({ personId: f.personId, kind: f.kind, start: f.start, end: f.end, note: f.note || undefined }); setF({ ...f, note: "" }); }}><Plus size={15} />Add</button>
        </div>
      </div>
    </section>
  );
}
