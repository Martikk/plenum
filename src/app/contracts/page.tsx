"use client";
import Link from "next/link";
import { useLookups, useStore } from "@/lib/store";
import { fmtDate, money, pct, typeCode } from "@/lib/logic";
import { PageHeader } from "@/components/ui";
import { Lock, Download } from "lucide-react";
import { downloadCSV } from "@/lib/csv";

export default function Contracts() {
  const s = useStore();
  const L = useLookups();
  return (
    <div>
      <PageHeader title="Contracts" sub="Contracts carry the business rules: rates, markups, PO policy, default roles and buildings." actions={<button className="btn" onClick={() => downloadCSV("contracts", ["ID", "Type", "Service", "Customer", "Buildings", "Journeyman rate", "Apprentice rate", "Material markup", "Subtrade markup", "Installation markup", "Quote markup", "PO required", "All-inclusive", "Rates locked", "Start", "End", "Active"],
        s.contracts.map((c) => [c.id, c.type, c.serviceType, L.org(c.orgId)?.name, c.buildingIds.map((b) => L.building(b)?.name).join("; "), c.rates.journeyman, c.rates.apprentice, c.materialMarkup, c.subtradeMarkup, c.installationMarkup, c.quoteMarkup, c.poRequired ? "yes" : "", c.allInclusive ? "yes" : "", c.lockRates ? "yes" : "", c.start, c.end, c.active ? "yes" : "no"]))}><Download size={15} />CSV</button>} />
      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>ID</th><th>Contract</th><th>Buildings</th><th className="text-right">Journeyman</th><th className="text-right">Mat. markup</th><th>Rules</th><th>Open WOs</th><th>Start</th></tr></thead>
          <tbody>
            {s.contracts.map((c) => {
              const o = L.org(c.orgId)!;
              const open = s.workOrders.filter((w) => w.contractId === c.id && !w.closed).length;
              return (
                <tr key={c.id}>
                  <td><Link href={`/contracts/view?id=${c.id}`} className="num font-semibold text-primary">{c.id}</Link></td>
                  <td><div className="font-medium">{c.type}-{c.serviceType} <span className="font-mono text-[12px] text-ink-3">{typeCode(c, "WO").replace("-WO", "")}</span></div><div className="text-ink-2">{o.name}</div></td>
                  <td className="text-ink-2">{c.buildingIds.map((id) => L.building(id)?.name).join(", ")}</td>
                  <td className="text-right num">{money(c.rates.journeyman)}</td>
                  <td className="text-right num">{pct(c.type === "Installation" ? c.installationMarkup : c.materialMarkup)}</td>
                  <td className="text-[12.5px] space-x-1.5 whitespace-nowrap">
                    {c.poRequired && <span className="px-1.5 py-0.5 rounded bg-sunken">PO req.</span>}
                    {c.allInclusive && <span className="px-1.5 py-0.5 rounded bg-sunken">All-inclusive</span>}
                    {c.lockRates && <span className="px-1.5 py-0.5 rounded bg-sunken inline-flex items-center gap-1"><Lock size={11} />Rates locked</span>}
                    {c.ratesTemplate && <span className="px-1.5 py-0.5 rounded bg-sunken">Template</span>}
                  </td>
                  <td className="num">{open}</td>
                  <td className="num text-ink-2">{fmtDate(c.start)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
