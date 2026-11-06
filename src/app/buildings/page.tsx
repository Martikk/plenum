"use client";
import Link from "next/link";
import { KeyRound, Wrench } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { deriveStatus, fmtDate } from "@/lib/logic";
import { PageHeader, WOStatusBadge } from "@/components/ui";

export default function Buildings() {
  const s = useStore();
  const L = useLookups();
  return (
    <div>
      <PageHeader title="Buildings" sub="Sites, access notes, equipment and recent work." />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {s.buildings.map((b) => {
          const eq = s.equipment.filter((e) => e.buildingId === b.id);
          const recent = s.workOrders.filter((w) => w.buildingId === b.id && w.kind === "WO").sort((a, c) => c.id - a.id).slice(0, 3);
          return (
            <div key={b.id} id={`b${b.id}`} className="card p-4 target:ring-2 target:ring-primary">
              <div className="font-semibold">{b.name}</div>
              <div className="text-ink-2">{b.address}, {b.city}</div>
              <div className="text-[12.5px] text-ink-3">{L.org(b.orgId)?.name}</div>
              {b.access && <div className="mt-2 text-[12.5px] rounded-md p-2 bg-sunken flex gap-2"><KeyRound size={13} className="mt-0.5 shrink-0 text-ink-3" />{b.access}</div>}
              <div className="mt-3 label flex items-center gap-1"><Wrench size={12} />Equipment ({eq.length})</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {eq.map((e) => <Link href={`/equipment?id=${e.id}`} key={e.id} className="text-[12px] px-1.5 py-0.5 rounded bg-sunken hover:bg-primary-soft hover:text-primary" title={[e.manufacturer, e.model, e.location].filter(Boolean).join(" · ")}><span className="font-mono">{e.tag}</span> {e.type}{e.lastInspected ? ` · insp. ${fmtDate(e.lastInspected)}` : ""}</Link>)}
                {eq.length === 0 && <span className="text-[12.5px] text-ink-3">None on file</span>}
              </div>
              {recent.length > 0 && (
                <ul className="mt-3 border-t border-line pt-2 space-y-1.5">
                  {recent.map((w) => <li key={w.id} className="flex items-center gap-2 text-[13px]"><Link href={`/work-orders/view?id=${w.id}`} className="num text-primary font-medium">#{w.id}</Link><span className="truncate flex-1 text-ink-2">{w.customerRequest}</span><WOStatusBadge s={deriveStatus(w)} size="sm" /></li>)}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
