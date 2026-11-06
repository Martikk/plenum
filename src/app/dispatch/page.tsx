"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, GripVertical, Lock, AlertTriangle, Info } from "lucide-react";
import { PERSONAS, useLookups, useStore } from "@/lib/store";
import { Avatar, RoleStatusBadge, UrgencyTag, PageHeader } from "@/components/ui";
import type { Person, Role, WorkOrder } from "@/lib/types";

const START_H = 6, END_H = 20, SPAN = END_H - START_H;
const ROW_H = 56;

type Drag = { woId: number; roleId: number; durMin: number };

function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }

export default function Dispatch() {
  const s = useStore();
  const L = useLookups();
  const [day, setDay] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<{ pid: number; min: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "warn" | "ok" } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const me = s.people.find((p) => p.id === PERSONAS[s.persona].personId)!;
  const selfOnly = s.persona === "tech";
  const readOnly = s.persona === "manager" || s.persona === "coordinator";

  const techs = s.people.filter((p) => p.kind === "staff" && (p.group === "Journeyman" || p.group === "Apprentice"));
  const groups: [string, Person[]][] = [["Journeyman", techs.filter((p) => p.group === "Journeyman")], ["Apprentice", techs.filter((p) => p.group === "Apprentice")]];

  const blocks = useMemo(() => s.workOrders.filter((w) => w.kind === "WO" && !w.closed).flatMap((w) =>
    w.roles.filter((r) => r.personId && r.start && r.end && sameDay(new Date(r.start), day)).map((r) => ({ w, r }))), [s.workOrders, day]);

  const backlog = useMemo(() => s.workOrders.filter((w) => w.kind === "WO" && !w.closed && !w.onHold).flatMap((w) =>
    w.roles.filter((r) => ["Primary Tech", "Secondary Tech", "Team Leader"].includes(r.type) && (!r.personId || !r.start || r.status === "Declined" || r.status === "Holding" || r.status === "Posted"))
      .map((r) => ({ w, r })))
    .sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.w.urgency] - { High: 0, Medium: 1, Low: 2 }[b.w.urgency])), [s.workOrders]);

  const flash = (text: string, tone: "warn" | "ok" = "ok") => {
    setToast({ text, tone }); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(null), 3800);
  };

  const conflicts = useMemo(() => {
    const set = new Set<number>();
    for (const a of blocks) for (const b of blocks) {
      if (a.r.id >= b.r.id || a.r.personId !== b.r.personId) continue;
      if (new Date(a.r.start!) < new Date(b.r.end!) && new Date(b.r.start!) < new Date(a.r.end!)) { set.add(a.r.id); set.add(b.r.id); }
    }
    return set;
  }, [blocks]);

  const canDropOn = (p: Person) => !readOnly && (!selfOnly || (me.canSelfSchedule && p.id === me.id));

  const minFromEvent = (e: React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    return Math.round((frac * SPAN * 60) / 30) * 30;
  };

  const drop = (p: Person, min: number) => {
    if (!drag) return;
    const w = L.wo(drag.woId)!; const r = w.roles.find((x) => x.id === drag.roleId)!;
    if (!canDropOn(p)) { flash(selfOnly ? "Senior techs can schedule only themselves" : "Read-only for this persona", "warn"); return; }
    if (r.skill && r.skillRequired && !p.skills?.includes(r.skill)) { flash(`${p.name} lacks required skill: ${r.skill}`, "warn"); return; }
    const start = new Date(day); start.setHours(START_H, 0, 0, 0); start.setMinutes(start.getMinutes() + Math.min(min, SPAN * 60 - 30));
    const end = new Date(start.getTime() + drag.durMin * 60000);
    s.scheduleRole(w.id, r.id, p.id, start.toISOString(), end.toISOString());
    const skillNote = r.skill && !p.skills?.includes(r.skill) ? ` · note: preferred skill ${r.skill}` : "";
    flash(`#${w.id} → ${p.name}, ${start.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false })}${skillNote}`, skillNote ? "warn" : "ok");
  };

  const pct = (iso: string) => {
    const d = new Date(iso); const m = (d.getHours() - START_H) * 60 + d.getMinutes();
    return Math.min(Math.max(m / (SPAN * 60), 0), 1) * 100;
  };
  const now = new Date();
  const nowMin = (now.getHours() - START_H) * 60 + now.getMinutes();
  const nowPct = sameDay(now, day) && nowMin >= 0 && nowMin <= SPAN * 60 ? (nowMin / (SPAN * 60)) * 100 : null;

  const shift = (n: number) => setDay((d) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; });

  const card = (w: WorkOrder, r: Role) => {
    const b = L.building(w.buildingId);
    const dur = r.start && r.end ? (new Date(r.end).getTime() - new Date(r.start).getTime()) / 60000 : 120;
    return (
      <div key={r.id} draggable={!readOnly}
        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDrag({ woId: w.id, roleId: r.id, durMin: dur }); }}
        onDragEnd={() => { setDrag(null); setHover(null); }}
        className={clsx("card !shadow-none p-2.5 flex gap-2 bg-raised", !readOnly && "cursor-grab active:cursor-grabbing hover:border-line-strong")}>
        {!readOnly && <GripVertical size={14} className="text-ink-3 mt-0.5 shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/work-orders/${w.id}`} className="num font-semibold text-primary">#{w.id}</Link>
            <UrgencyTag u={w.urgency} />
            <span className="ml-auto"><RoleStatusBadge s={r.status} size="sm" /></span>
          </div>
          <div className="font-medium truncate mt-0.5">{b?.name}</div>
          <div className="text-[12.5px] text-ink-2 line-clamp-2">{w.customerRequest}</div>
          <div className="text-[11.5px] text-ink-3 mt-1">{r.type}{r.skill ? ` · ${r.skill}${r.skillRequired ? " (req.)" : ""}` : ""}{r.status === "Declined" && r.personId ? ` · declined by ${L.person(r.personId)?.initials}` : ""}</div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Dispatch"
        sub={selfOnly ? (me.canSelfSchedule ? "Self-scheduling: drag a job onto your own row." : "Your account can't self-schedule.") : readOnly ? "Read-only view for this persona." : "Drag jobs from the backlog onto a technician's row. Drag blocks to move them."}
        actions={<div className="flex items-center gap-1">
          <button className="btn !px-2" onClick={() => shift(-1)} aria-label="Previous day"><ChevronLeft size={16} /></button>
          <button className="btn" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setDay(d); }}>Today</button>
          <button className="btn !px-2" onClick={() => shift(1)} aria-label="Next day"><ChevronRight size={16} /></button>
          <span className="ml-2 font-semibold min-w-44 text-right">{day.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}</span>
        </div>} />

      <div className="grid xl:grid-cols-[320px_1fr] gap-4 items-start">
        <aside className="card overflow-hidden xl:sticky xl:top-20">
          <div className="px-3 h-11 flex items-center justify-between border-b border-line">
            <span className="font-semibold">Backlog</span>
            <span className="num text-[12px] text-ink-3">{backlog.length} roles</span>
          </div>
          <div className="p-2 space-y-2 max-h-[70vh] overflow-auto bg-sunken/40">
            {backlog.length === 0 ? <p className="p-3 text-ink-3">Nothing waiting.</p> : backlog.map(({ w, r }) => card(w, r))}
          </div>
        </aside>

        <section className="card overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="flex border-b border-line sticky top-0 bg-surface z-10">
              <div className="w-52 shrink-0 px-3 h-10 flex items-center label">Technician</div>
              <div className="flex-1 relative h-10">
                {Array.from({ length: SPAN }).map((_, i) => (
                  <span key={i} className="absolute top-0 h-full border-l border-line pl-1.5 pt-2.5 text-[11.5px] text-ink-3 num" style={{ left: `${(i / SPAN) * 100}%` }}>
                    {String(START_H + i).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
            </div>
            {groups.map(([g, list]) => (
              <div key={g}>
                <div className="px-3 h-7 flex items-center text-[11.5px] font-semibold uppercase tracking-wide text-ink-3 bg-sunken/60 border-b border-line">{g}</div>
                {list.map((p) => {
                  const mine = blocks.filter((b) => b.r.personId === p.id);
                  const hours = mine.reduce((a, b) => a + (new Date(b.r.end!).getTime() - new Date(b.r.start!).getTime()) / 36e5, 0);
                  const allowed = canDropOn(p);
                  return (
                    <div key={p.id} className="flex border-b border-line last:border-0" style={{ height: ROW_H }}>
                      <div className="w-52 shrink-0 px-3 flex items-center gap-2 border-r border-line">
                        <Avatar initials={p.initials} size={26} />
                        <div className="min-w-0">
                          <div className="font-medium truncate flex items-center gap-1">{p.name}{!allowed && drag && <Lock size={11} className="text-ink-3" />}</div>
                          <div className="text-[11.5px] text-ink-3 num">{hours.toFixed(1)}h booked{p.canSelfSchedule ? " · self" : ""}</div>
                        </div>
                      </div>
                      <div data-lane={p.name}
                        className={clsx("flex-1 relative", drag && allowed && "bg-primary-soft/40", drag && !allowed && "bg-sunken/70")}
                        onDragOver={(e) => { if (!drag) return; e.preventDefault(); setHover({ pid: p.id, min: minFromEvent(e) }); }}
                        onDragLeave={() => setHover(null)}
                        onDrop={(e) => { e.preventDefault(); drop(p, minFromEvent(e)); setDrag(null); setHover(null); }}
                      >
                        {Array.from({ length: SPAN }).map((_, i) => (
                          <span key={i} className="absolute inset-y-0 border-l border-line/70" style={{ left: `${(i / SPAN) * 100}%` }} />
                        ))}
                        {nowPct != null && <span className="absolute inset-y-0 w-0.5 z-[2]" style={{ left: `${nowPct}%`, background: "var(--danger)" }} />}
                        {hover && hover.pid === p.id && drag && (
                          <span className="absolute top-1.5 bottom-1.5 rounded-md border-2 border-dashed z-[3]"
                            style={{ left: `${(hover.min / (SPAN * 60)) * 100}%`, width: `${(drag.durMin / (SPAN * 60)) * 100}%`, borderColor: allowed ? "var(--primary)" : "var(--danger)" }} />
                        )}
                        {mine.map(({ w, r }) => {
                          const st = r.status === "Complete" ? "complete" : r.status === "Responding" ? "responding" : r.status === "Incomplete" ? "incomplete" : "assigned";
                          const l = pct(r.start!), wd = pct(r.end!) - l;
                          const b = L.building(w.buildingId);
                          const conflict = conflicts.has(r.id);
                          return (
                            <Link key={r.id} href={`/work-orders/${w.id}`} draggable={!readOnly && (!selfOnly || p.id === me.id)}
                              onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDrag({ woId: w.id, roleId: r.id, durMin: (new Date(r.end!).getTime() - new Date(r.start!).getTime()) / 60000 }); }}
                              onDragEnd={() => { setDrag(null); setHover(null); }}
                              title={`#${w.id} ${b?.name} — ${w.customerRequest}`}
                              className={clsx("absolute top-1.5 bottom-1.5 rounded-md px-2 py-1 overflow-hidden z-[1] border-l-[3px] hover:brightness-[.97]", conflict && "ring-2 ring-[var(--danger)]")}
                              style={{ left: `${l}%`, width: `${Math.max(wd, 2)}%`, background: `var(--s-${st}-bg)`, borderColor: `var(--s-${st})` }}>
                              <div className="text-[12px] font-semibold truncate flex items-center gap-1" style={{ color: `var(--s-${st})` }}>
                                {conflict && <AlertTriangle size={11} />}#{w.id} · {r.status}
                              </div>
                              <div className="text-[12px] truncate text-ink">{b?.name}</div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="mt-3 text-[12.5px] text-ink-3 inline-flex items-center gap-1.5"><Info size={13} />
        Hybrid scheduling (Option B): Dispatch schedules most WOs; senior techs with self-scheduling rights can book only themselves. Required skills block the drop; preferred skills only warn.</p>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 card shadow-pop px-4 py-2.5 flex items-center gap-2"
          style={toast.tone === "warn" ? { background: "var(--warn-bg)", borderColor: "var(--warn-border)", color: "var(--warn)" } : undefined}>
          {toast.tone === "warn" && <AlertTriangle size={15} />} <span className="font-medium">{toast.text}</span>
        </div>
      )}
    </div>
  );
}
