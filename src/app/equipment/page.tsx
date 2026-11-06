"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Wrench, CalendarClock, Plus } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { deriveStatus, fmtDate } from "@/lib/logic";
import { Empty, QuoteStatusBadge, WOStatusBadge } from "@/components/ui";

const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function EquipmentView() {
  const id = Number(useSearchParams().get("id"));
  const s = useStore(); const L = useLookups();
  const e = L.equip(id);
  if (!e) return <Empty>Equipment not found. <Link className="text-primary" href="/buildings">Buildings</Link></Empty>;
  const b = L.building(e.buildingId)!;
  const history = s.workOrders.filter((w) => w.equipmentIds.includes(id)).sort((a, z) => z.createdAt.localeCompare(a.createdAt));
  const profiles = s.profiles.filter((p) => p.equipmentIds.includes(id));
  const now = new Date().getMonth() + 1;
  const nextPM = profiles.filter((p) => p.active).map((p) => { const m = p.months.find((x) => x >= now) ?? p.months[0]; return { p, m }; }).sort((a, z) => ((a.m - now + 12) % 12) - ((z.m - now + 12) % 12))[0];
  const lastService = history.find((w) => w.kind === "WO" && ["Complete", "Closed"].includes(deriveStatus(w)));
  const callbacks = history.filter((w) => w.kind === "WO" && w.billType === "Billable" && w.urgency === "High").length;

  return (
    <div className="space-y-4">
      <Link href={`/buildings#b${b.id}`} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink"><ArrowLeft size={15} />{b.name}</Link>
      <div className="card p-4">
        <div className="flex items-start gap-3 flex-wrap">
          <span className="grid place-items-center w-10 h-10 rounded-lg bg-primary-soft text-primary"><Wrench size={19} /></span>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-ink-3 text-[12.5px]">{e.tag} · #{e.id}</div>
            <h1 className="text-[22px] font-semibold tracking-tight">{e.type}</h1>
            <p className="text-ink-2">{[e.manufacturer, e.model].filter(Boolean).join(" ") || "Make/model not recorded"}{e.location ? ` · ${e.location}` : ""} · {b.name}, {b.city}</p>
          </div>
          <Link className="btn btn-primary" href="/quotes/new"><Plus size={15} />Quote for this unit</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line rounded-lg overflow-hidden border border-line mt-4">
          {[["Last inspected", e.lastInspected ? fmtDate(e.lastInspected) : "—"], ["Last service", lastService ? `#${lastService.id} · ${fmtDate(lastService.createdAt)}` : "—"],
            ["Next PM", nextPM ? `${M[nextPM.m - 1]} · ${nextPM.p.name.split("–")[0].trim()}` : "No PM profile"], ["High-urgency calls", String(callbacks)]].map(([k, v]) => (
            <div key={k} className="bg-surface p-3"><div className="label">{k}</div><div className="font-semibold mt-0.5 truncate">{v}</div></div>
          ))}
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="px-4 h-11 flex items-center border-b border-line font-semibold">Service history ({history.length})</div>
        {history.length === 0 ? <Empty>No work orders or quotes reference this unit yet.</Empty> : (
          <ol>
            {history.map((w) => (
              <li key={w.id} className="border-b border-line last:border-0">
                <Link href={`/work-orders/view?id=${w.id}`} className="flex gap-4 px-4 py-3 hover:bg-primary-soft/50">
                  <span className="num text-ink-3 w-16 shrink-0">{fmtDate(w.createdAt)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="num font-semibold text-primary">#{w.id}</span>
                      {w.kind === "QO" ? <QuoteStatusBadge s={w.quoteStatus ?? "Draft"} size="sm" /> : <WOStatusBadge s={deriveStatus(w)} size="sm" />}</span>
                    <span className="block text-ink-2">{w.customerRequest}</span>
                    {w.workPerformed && <span className="block text-[13px] mt-0.5"><span className="text-ink-3">Done: </span>{w.workPerformed}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {profiles.length > 0 && (
        <section className="card p-4">
          <h2 className="font-semibold mb-2 inline-flex items-center gap-1.5"><CalendarClock size={15} />Maintenance profiles</h2>
          <ul className="space-y-1.5">{profiles.map((p) => <li key={p.id}><Link href="/maintenance" className="text-primary">{p.name}</Link> <span className="text-ink-3">· {p.months.map((m) => M[m - 1]).join(", ")} · {p.hours} h{p.active ? "" : " · inactive"}</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}

export default function Page() { return <Suspense><EquipmentView /></Suspense>; }
