"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { deriveStatus, economics, fmtDate, money, typeCode, MARGIN_THRESHOLD } from "@/lib/logic";
import { Avatar, Chip, MarginMeter, PageHeader, UrgencyTag, WOStatusBadge, Empty } from "@/components/ui";
import type { WOStatus, WorkOrder } from "@/lib/types";

type F = "open" | "Unassigned" | "active" | "Complete" | "low" | "hold" | "Closed" | "all";

export default function WorkOrders() {
  const s = useStore();
  const L = useLookups();
  const [f, setF] = useState<F>("open");
  const [q, setQ] = useState("");
  const [ctype, setCtype] = useState<string>("");

  const rows = useMemo(() => s.workOrders.filter((w) => w.kind === "WO").map((w) => {
    const c = L.contract(w.contractId)!;
    const e = economics(w, c, s.people, s.invoices);
    return { w, c, e, st: deriveStatus(w) as WOStatus };
  }), [s.workOrders, s.invoices, s.people, L]);

  const test: Record<F, (r: (typeof rows)[number]) => boolean> = {
    open: (r) => r.st !== "Closed",
    Unassigned: (r) => r.st === "Unassigned",
    active: (r) => ["Assigned", "Responding", "Incomplete"].includes(r.st),
    Complete: (r) => r.st === "Complete",
    low: (r) => r.w.billType === "Billable" && r.e.actual.sell > 0 && (r.e.actual.margin ?? 1) < MARGIN_THRESHOLD,
    hold: (r) => !!r.w.onHold,
    Closed: (r) => r.st === "Closed",
    all: () => true,
  };

  const qq = q.trim().toLowerCase();
  const list = rows.filter(test[f]).filter((r) => !ctype || r.c.type === ctype).filter((r) => {
    if (!qq) return true;
    const b = L.building(r.w.buildingId);
    return `${r.w.id} ${r.w.customerRequest} ${b?.name} ${b?.address} ${r.w.po ?? ""} ${L.org(r.w.orgId)?.name}`.toLowerCase().includes(qq);
  }).sort((a, b) => b.w.id - a.w.id);

  const count = (k: F) => rows.filter(test[k]).length;
  const techs = (w: WorkOrder) => w.roles.filter((r) => r.personId && ["Primary Tech", "Secondary Tech", "Team Leader"].includes(r.type) && r.status !== "Declined").map((r) => L.person(r.personId)!);

  return (
    <div>
      <PageHeader title="Work orders" sub="Status is derived from the roles on each work order." />
      <div className="card">
        <div className="p-3 flex flex-wrap gap-2 items-center border-b border-line">
          <Chip active={f === "open"} onClick={() => setF("open")} count={count("open")}>Open</Chip>
          <Chip active={f === "Unassigned"} onClick={() => setF("Unassigned")} count={count("Unassigned")}>Unassigned</Chip>
          <Chip active={f === "active"} onClick={() => setF("active")} count={count("active")}>In progress</Chip>
          <Chip active={f === "Complete"} onClick={() => setF("Complete")} count={count("Complete")}>Ready to invoice</Chip>
          <Chip active={f === "low"} onClick={() => setF("low")} count={count("low")}>GP &lt; 20%</Chip>
          <Chip active={f === "hold"} onClick={() => setF("hold")} count={count("hold")}>On hold</Chip>
          <Chip active={f === "all"} onClick={() => setF("all")} count={count("all")}>All</Chip>
          <div className="flex-1" />
          <select className="field !w-auto" value={ctype} onChange={(e) => setCtype(e.target.value)}>
            <option value="">All contract types</option><option>Service</option><option>Maintenance</option><option>Installation</option>
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input className="field !pl-8 !w-64" placeholder="Filter by ID, building, PO, text" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr>
              <th>WO</th><th>Building · request</th><th>Status</th><th>Techs</th><th>Urgency</th>
              <th className="text-right">Quoted</th><th className="text-right">Cost to date</th><th>GP%</th><th>Created</th>
            </tr></thead>
            <tbody>
              {list.map(({ w, c, e, st }) => {
                const b = L.building(w.buildingId);
                return (
                  <tr key={w.id} className="cursor-pointer" onClick={() => (window.location.href = `/work-orders/view?id=${w.id}`)}>
                    <td className="whitespace-nowrap">
                      <Link href={`/work-orders/view?id=${w.id}`} className="num font-semibold text-primary">{w.id}</Link>
                      <div className="text-[11.5px] text-ink-3 font-mono">{typeCode(c, "WO")}</div>
                    </td>
                    <td className="max-w-[420px]">
                      <div className="font-medium truncate">{b?.name} <span className="text-ink-3 font-normal">· {b?.city}</span></div>
                      <div className="text-ink-2 truncate">{w.customerRequest}</div>
                    </td>
                    <td><WOStatusBadge s={st} size="sm" />{w.onHold && <div className="text-[11.5px] mt-1" style={{ color: "var(--warn)" }}>On hold</div>}</td>
                    <td><div className="flex -space-x-1.5">{techs(w).map((p) => <Avatar key={p.id} initials={p.initials} title={p.name} />)}</div></td>
                    <td><UrgencyTag u={w.urgency} /></td>
                    <td className="text-right num">{e.quote.sell ? money(e.quote.sell) : "—"}</td>
                    <td className="text-right num">{e.actual.totalCostPst ? money(e.actual.totalCostPst) : "—"}</td>
                    <td>{w.billType !== "Billable" ? <span className="text-[12px] text-ink-3">Non-billable</span> : <MarginMeter margin={e.actual.margin} />}</td>
                    <td className="num text-ink-2 whitespace-nowrap">{fmtDate(w.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <Empty>No work orders match.</Empty>}
        </div>
      </div>
    </div>
  );
}
