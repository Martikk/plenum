"use client";
import { useEffect, useState } from "react";
import { Megaphone, AlertTriangle, X, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDate, relTime } from "@/lib/logic";

const KEY = "plenum-dismissed-notices";

/** Company notices on the home screen. Office posts; anyone can hide a non-alert notice for themselves. */
export function Notices() {
  const s = useStore();
  const office = s.persona !== "tech";
  const [hidden, setHidden] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ text: "", alert: false, until: "" });
  useEffect(() => { try { setHidden(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch {} }, []);
  const hide = (id: number) => { const n = [...hidden, id]; setHidden(n); try { localStorage.setItem(KEY, JSON.stringify(n.slice(-200))); } catch {} };
  const today = new Date().toISOString().slice(0, 10);
  const list = s.notices.filter((n) => (!n.until || n.until >= today) && (n.alert || !hidden.includes(n.id)))
    .sort((a, b) => Number(b.alert) - Number(a.alert) || b.createdAt.localeCompare(a.createdAt));
  if (!list.length && !office) return null;

  return (
    <section className="space-y-2">
      {list.map((n) => (
        <div key={n.id} className="card px-4 py-3 flex gap-3 items-start"
          style={n.alert ? { background: "var(--warn-bg)", borderColor: "var(--warn-border)" } : undefined}>
          <span className="mt-0.5" style={{ color: n.alert ? "var(--warn)" : "var(--primary)" }}>{n.alert ? <AlertTriangle size={16} /> : <Megaphone size={16} />}</span>
          <div className="flex-1 min-w-0">
            <p className="whitespace-pre-wrap">{n.text}</p>
            <p className="text-[12px] text-ink-3 mt-0.5">{n.by} · {relTime(n.createdAt)}{n.until ? ` · until ${fmtDate(n.until)}` : ""}</p>
          </div>
          {office && <button className="text-ink-3 hover:text-ink" title="Delete notice for everyone" onClick={() => confirm("Delete this notice for everyone?") && s.removeNotice(n.id)}><Trash2 size={14} /></button>}
          {!n.alert && <button className="text-ink-3 hover:text-ink" title="Hide for me" onClick={() => hide(n.id)}><X size={15} /></button>}
        </div>
      ))}
      {office && (adding ? (
        <div className="card p-3 space-y-2">
          <textarea className="field" placeholder="Notice for everyone (on-call schedule, safety bulletin, office closure…)" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={f.alert} onChange={(e) => setF({ ...f, alert: e.target.checked })} />Alert (can't be hidden)</label>
            <label className="inline-flex items-center gap-1.5 text-[13px]">Show until <input type="date" className="field !w-auto !py-1" value={f.until} onChange={(e) => setF({ ...f, until: e.target.value })} /></label>
            <div className="flex-1" />
            <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={!f.text.trim()} onClick={() => { s.saveNotice({ text: f.text.trim(), alert: f.alert, until: f.until || undefined }); setF({ text: "", alert: false, until: "" }); setAdding(false); }}>Post</button>
          </div>
        </div>
      ) : <button className="btn btn-ghost btn-sm text-ink-2" onClick={() => setAdding(true)}><Plus size={13} />Post a company notice</button>)}
    </section>
  );
}
