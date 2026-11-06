"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { economics, fmtDate, money, typeCode, relTime } from "@/lib/logic";
import { Avatar, Chip, Empty, MarginMeter, PageHeader, QuoteStatusBadge, UrgencyTag } from "@/components/ui";
import type { QuoteStatus } from "@/lib/types";

const ORDER: QuoteStatus[] = ["Draft", "Pricing", "Sent", "Approved", "Declined"];

export default function Quotes() {
  const s = useStore();
  const L = useLookups();
  const [f, setF] = useState<QuoteStatus | "all">(s.persona === "coordinator" ? "Pricing" : "all");
  const qs = s.workOrders.filter((w) => w.kind === "QO");
  const list = qs.filter((q) => f === "all" || q.quoteStatus === f).sort((a, b) => ORDER.indexOf(a.quoteStatus!) - ORDER.indexOf(b.quoteStatus!) || b.id - a.id);
  return (
    <div>
      <PageHeader title="Quotes" sub="Techs initiate · Service Coordinator fills missing costs · sending posts the quote to the customer portal."
        actions={<Link href="/quotes/new" className="btn btn-primary"><Plus size={15} />New quote</Link>} />
      <div className="card">
        <div className="p-3 flex flex-wrap gap-2 border-b border-line">
          <Chip active={f === "all"} onClick={() => setF("all")} count={qs.length}>All</Chip>
          {ORDER.map((st) => <Chip key={st} active={f === st} onClick={() => setF(st)} count={qs.filter((q) => q.quoteStatus === st).length}>{st === "Pricing" ? "Needs pricing" : st === "Sent" ? "Awaiting customer" : st}</Chip>)}
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Quote</th><th>Building · work recommended</th><th>Stage</th><th>By</th><th>Urgency</th><th className="text-right">Sell</th><th>Expected GP</th><th>Age</th></tr></thead>
            <tbody>
              {list.map((q) => {
                const c = L.contract(q.contractId)!; const b = L.building(q.buildingId);
                const e = economics(q, c, s.people, s.invoices);
                const tech = L.person(q.roles.find((r) => r.type === "Primary Tech")?.personId);
                return (
                  <tr key={q.id}>
                    <td><Link href={`/work-orders/view?id=${q.id}`} className="num font-semibold text-primary">{q.id}</Link><div className="text-[11.5px] text-ink-3 font-mono">{typeCode(c, "QO")}</div></td>
                    <td className="max-w-[420px]"><div className="font-medium truncate">{b?.name}</div><div className="text-ink-2 truncate">{q.workRecommended || q.customerRequest}</div></td>
                    <td><QuoteStatusBadge s={q.quoteStatus!} size="sm" />{e.quote.missingCost > 0 && <div className="text-[11.5px] mt-1" style={{ color: "var(--warn)" }}>{e.quote.missingCost} cost(s) missing</div>}</td>
                    <td>{tech && <span className="inline-flex items-center gap-1.5"><Avatar initials={tech.initials} />{tech.name.split(" ")[0]}</span>}</td>
                    <td><UrgencyTag u={q.urgency} /></td>
                    <td className="text-right num">{money(e.quote.sell)}</td>
                    <td><MarginMeter margin={e.quote.margin} uncertain={e.quote.missingCost > 0} /></td>
                    <td className="text-ink-2 num whitespace-nowrap" title={fmtDate(q.createdAt)}>{relTime(q.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <Empty>No quotes in this stage.</Empty>}
        </div>
      </div>
    </div>
  );
}
