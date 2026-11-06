"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { MapPin, KeyRound, Truck, CheckCircle2, RotateCcw, Clock, Package, ChevronDown, Phone, FileText } from "lucide-react";
import { PERSONAS, useLookups, useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/logic";
import { RoleStatusBadge, UrgencyTag } from "@/components/ui";
import { WOFiles } from "@/components/files";
import { findPrice } from "@/lib/price";
import type { Role, WorkOrder } from "@/lib/types";

function JobCard({ w, r }: { w: WorkOrder; r: Role }) {
  const s = useStore(); const L = useLookups();
  const [open, setOpen] = useState(r.status === "Responding");
  const [notes, setNotes] = useState(w.workPerformed ?? "");
  const [mat, setMat] = useState({ item: "", qty: 1 });
  const [custom, setCustom] = useState("");
  const b = L.building(w.buildingId)!;
  const me = r.personId!;
  const today = new Date().toISOString().slice(0, 10);
  const myHours = w.time.filter((t) => t.personId === me && t.date === today).reduce((a, t) => a + t.hours, 0);
  const contact = w.roles.map((x) => L.person(x.personId)).find((p) => p?.kind === "contact" && p.phone);
  const addHours = (h: number) => h > 0 && s.addTime(w.id, { personId: me, hours: h, type: "Regular", date: today }, false);
  const done = r.status === "Complete";

  return (
    <div className={clsx("card overflow-hidden", r.status === "Responding" && "ring-2 ring-[var(--s-responding)]")}>
      <button className="w-full text-left p-4 flex gap-3 items-start" onClick={() => setOpen(!open)}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="num font-semibold text-primary">#{w.id}</span><UrgencyTag u={w.urgency} /><RoleStatusBadge s={r.status} size="sm" />
          </div>
          <div className="text-[16px] font-semibold mt-1">{b.name}</div>
          <div className="text-ink-2">{r.start ? fmtDateTime(r.start) : "Not scheduled"} · {r.type}</div>
          <div className="text-ink-2 mt-1 line-clamp-2">{w.customerRequest}</div>
        </div>
        <ChevronDown size={18} className={clsx("text-ink-3 mt-1 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-line pt-4">
          <div className="grid grid-cols-2 gap-2">
            <a className="btn justify-center !h-11" href={`https://maps.google.com/?q=${encodeURIComponent(`${b.address}, ${b.city}`)}`} target="_blank" rel="noreferrer"><MapPin size={16} />Map</a>
            {contact ? <a className="btn justify-center !h-11" href={`tel:${contact.phone}`}><Phone size={16} />{contact.name.split(" ")[0]}</a>
              : <Link className="btn justify-center !h-11" href={`/work-orders/view?id=${w.id}`}><FileText size={16} />Full WO</Link>}
          </div>
          {b.access && <div className="rounded-md p-3 bg-sunken flex gap-2 text-[13.5px]"><KeyRound size={15} className="text-ink-3 mt-0.5 shrink-0" />{b.access}</div>}
          {r.instruction && <div className="rounded-md p-3 text-[13.5px] border" style={{ background: "var(--warn-bg)", borderColor: "var(--warn-border)" }}>{r.instruction}</div>}

          {/* One-tap status */}
          <div className="grid grid-cols-3 gap-2">
            <button className="btn justify-center !h-14 flex-col !gap-0.5 text-[12.5px]" disabled={r.status === "Responding" || done}
              style={r.status === "Responding" ? { background: "var(--s-responding-bg)", color: "var(--s-responding)" } : undefined}
              onClick={() => s.setRoleStatus(w.id, r.id, "Responding")}><Truck size={18} />On my way</button>
            <button className="btn justify-center !h-14 flex-col !gap-0.5 text-[12.5px]" disabled={done}
              onClick={() => { s.updateWO(w.id, { workPerformed: notes }); s.setRoleStatus(w.id, r.id, "Incomplete"); }}><RotateCcw size={18} />Need return</button>
            <button className="btn btn-primary justify-center !h-14 flex-col !gap-0.5 text-[12.5px]" disabled={done || !notes.trim()}
              title={!notes.trim() ? "Write what you did first" : undefined}
              onClick={() => { s.updateWO(w.id, { workPerformed: notes }); s.setRoleStatus(w.id, r.id, "Complete"); }}><CheckCircle2 size={18} />Complete</button>
          </div>

          <label className="block">
            <span className="label">Work performed (customer sees this on the portal)</span>
            <textarea className="field mt-1 !min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (w.workPerformed ?? "") && s.updateWO(w.id, { workPerformed: notes })} placeholder="What you found and what you did" />
          </label>

          <div>
            <div className="label flex items-center gap-1 mb-1.5"><Clock size={13} />Time today: <span className="num font-semibold text-ink">{myHours.toFixed(2)} h</span></div>
            <div className="flex gap-2 flex-wrap">
              {[0.5, 1, 2, 4].map((h) => <button key={h} className="btn !h-10 num" onClick={() => addHours(h)}>+{h} h</button>)}
              <input type="number" step="0.25" inputMode="decimal" className="field !w-20 !h-10 num" placeholder="h" value={custom} onChange={(e) => setCustom(e.target.value)} />
              <button className="btn !h-10" disabled={!custom} onClick={() => { addHours(Number(custom)); setCustom(""); }}>Add</button>
            </div>
          </div>

          <div>
            <div className="label mb-1.5">Photos</div>
            <WOFiles woId={w.id} compact />
          </div>

          <div>
            <div className="label flex items-center gap-1 mb-1.5"><Package size={13} />Materials used ({w.materials.length})</div>
            {w.materials.length > 0 && <ul className="text-[13.5px] mb-2 space-y-0.5">{w.materials.map((m) => <li key={m.id} className="num">{m.qty} × {m.item}</li>)}</ul>}
            <div className="flex gap-2">
              <input className="field !h-10 flex-1" list="pricebook-my" placeholder="Part / material" value={mat.item} onChange={(e) => setMat({ ...mat, item: e.target.value })} />
              <input type="number" inputMode="numeric" className="field !h-10 !w-16 num" value={mat.qty} onChange={(e) => setMat({ ...mat, qty: Number(e.target.value) })} />
              <button className="btn !h-10" disabled={!mat.item} onClick={() => { const hit = findPrice(s.priceBook, mat.item); s.addMaterial(w.id, { type: hit?.type ?? "Parts", item: hit?.name ?? mat.item, qty: mat.qty, unitCost: hit?.unitCost ?? null, vendor: hit?.vendor, personId: me }, false); setMat({ item: "", qty: 1 }); }}>Add</button>
            </div>
            <datalist id="pricebook-my">{s.priceBook.map((p) => <option key={p.id} value={p.name} />)}</datalist>
            <p className="text-[12px] text-ink-3 mt-1">Pick from the list to use the price book cost; anything else the office prices from the supplier invoice.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyJobs() {
  const s = useStore();
  const me = PERSONAS[s.persona]?.personId;
  const mine = s.workOrders.filter((w) => w.kind === "WO" && !w.closed).flatMap((w) =>
    w.roles.filter((r) => r.personId === me && r.status !== "Declined").map((r) => ({ w, r })));
  const isToday = (iso?: string) => !!iso && new Date(iso).toDateString() === new Date().toDateString();
  const today = mine.filter(({ r }) => isToday(r.start) || r.status === "Responding").sort((a, b) => (a.r.start ?? "").localeCompare(b.r.start ?? ""));
  const open = mine.filter((x) => !today.includes(x) && x.r.status !== "Complete").sort((a, b) => (a.r.start ?? "z").localeCompare(b.r.start ?? "z"));
  const name = s.people.find((p) => p.id === me)?.name;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">My jobs</h1>
        <p className="text-ink-2">{name} · {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric" })}</p>
      </div>
      <h2 className="label uppercase tracking-wide">Today ({today.length})</h2>
      {today.length === 0 && <p className="text-ink-3">Nothing scheduled today.</p>}
      {today.map(({ w, r }) => <JobCard key={r.id} w={w} r={r} />)}
      {open.length > 0 && <h2 className="label uppercase tracking-wide pt-2">Upcoming & open ({open.length})</h2>}
      {open.map(({ w, r }) => <JobCard key={r.id} w={w} r={r} />)}
    </div>
  );
}
