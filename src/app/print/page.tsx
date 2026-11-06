"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { economics, fmtDate, invoiceSubtotal, materialSell, money2, GST, typeCode } from "@/lib/logic";
import { Logo } from "@/components/shell";
import type { WorkOrder } from "@/lib/types";

const COMPANY = { name: "Plenum Demo Mechanical Ltd.", addr: "100 – 1234 Example St, Vancouver BC", phone: "604-555-0100", gst: "GST # 00000 0000 RT0001" };

function Header({ title, no, date }: { title: string; no: string; date: string }) {
  return (
    <div className="flex justify-between items-start border-b-2 border-ink pb-4 mb-6">
      <div className="flex gap-3 items-center">
        <Logo size={40} />
        <div><div className="text-[17px] font-semibold">{COMPANY.name}</div><div className="text-[12px] text-ink-2">{COMPANY.addr} · {COMPANY.phone}</div></div>
      </div>
      <div className="text-right">
        <div className="text-[24px] font-semibold tracking-tight uppercase">{title}</div>
        <div className="num text-ink-2">#{no} · {date}</div>
      </div>
    </div>
  );
}

function Parties({ w }: { w: WorkOrder }) {
  const L = useLookups();
  const o = L.org(w.orgId); const b = L.building(w.buildingId);
  return (
    <div className="grid grid-cols-2 gap-6 mb-6 text-[13px]">
      <div><div className="label mb-1">Customer</div><div className="font-medium">{o?.name}</div>{o?.accountCode && <div className="text-ink-2">Account {o.accountCode}</div>}</div>
      <div><div className="label mb-1">Site</div><div className="font-medium">{b?.name}</div><div className="text-ink-2">{b?.address}, {b?.city}</div>{w.po && <div className="text-ink-2">PO <span className="font-mono">{w.po}</span></div>}</div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-5"><div className="label mb-1">{label}</div><div className="whitespace-pre-wrap">{children}</div></div>;
}

function Totals({ sub }: { sub: number }) {
  return (
    <div className="flex justify-end mt-4"><table className="text-[13px] num w-64">
      <tbody>
        <tr><td className="py-1 text-ink-2">Subtotal</td><td className="text-right">{money2(sub)}</td></tr>
        <tr><td className="py-1 text-ink-2">GST {GST * 100}%</td><td className="text-right">{money2(sub * GST)}</td></tr>
        <tr className="border-t-2 border-ink font-semibold text-[15px]"><td className="py-1.5">Total CAD</td><td className="text-right">{money2(sub * (1 + GST))}</td></tr>
      </tbody>
    </table></div>
  );
}

function Doc() {
  const q = useSearchParams();
  const doc = q.get("doc"); const id = Number(q.get("id"));
  const s = useStore(); const L = useLookups();

  if (doc === "invoice") {
    const inv = s.invoices.find((i) => i.id === id);
    if (!inv) return <p>Invoice not found.</p>;
    const w = L.wo(inv.woId)!;
    return (
      <>
        <Header title={inv.progress ? "Progress invoice" : "Invoice"} no={String(inv.id)} date={fmtDate(inv.date)} />
        <Parties w={w} />
        <Block label="Work order">#{w.id} {typeCode(L.contract(w.contractId), "WO")}</Block>
        {w.workPerformed && <Block label="Work performed">{w.workPerformed}</Block>}
        <table className="w-full text-[13px] border-collapse">
          <thead><tr className="border-b border-ink text-left"><th className="py-1.5">Item</th><th>Description</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{inv.lines.map((l, i) => <tr key={i} className="border-b border-line"><td className="py-1.5 pr-4">{l.kind}</td><td>{l.description}</td><td className="text-right num">{money2(l.amount)}</td></tr>)}</tbody>
        </table>
        <Totals sub={invoiceSubtotal(inv)} />
        <p className="mt-10 text-[12px] text-ink-2">Payment due within 30 days. {COMPANY.gst}. Thank you for your business.</p>
      </>
    );
  }

  const w = L.wo(id);
  if (!w) return <p>Record not found.</p>;
  const c = L.contract(w.contractId)!;

  if (doc === "quote") {
    const e = economics(w, c, s.people, s.invoices);
    const labourHours = w.quotedTime.reduce((a, t) => a + t.hours, 0);
    const lines = [
      { d: `Labour — ${labourHours.toFixed(1)} h`, a: e.quote.labourSell },
      ...w.quotedMaterials.map((m) => ({ d: `${m.item}${m.qty > 1 ? ` × ${m.qty}` : ""}`, a: materialSell(m, c) })),
    ];
    const sub = w.quotedSellOverride ?? lines.reduce((a, l) => a + l.a, 0);
    return (
      <>
        <Header title="Quote" no={String(w.id)} date={fmtDate(w.quoteSentAt ?? w.createdAt)} />
        <Parties w={w} />
        <Block label="Your request">{w.customerRequest}</Block>
        {w.workRecommended && <Block label="Work recommended">{w.workRecommended}</Block>}
        {w.equipmentIds.length > 0 && <Block label="Equipment">{w.equipmentIds.map((x) => { const q = L.equip(x)!; return `${q.tag} ${q.type}`; }).join(", ")}</Block>}
        <table className="w-full text-[13px] border-collapse">
          <thead><tr className="border-b border-ink text-left"><th className="py-1.5">Description</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{lines.map((l, i) => <tr key={i} className="border-b border-line"><td className="py-1.5">{l.d}</td><td className="text-right num">{money2(l.a)}</td></tr>)}</tbody>
        </table>
        <Totals sub={sub} />
        <p className="mt-6 text-[12px] text-ink-2">{w.estimate === "Estimate" ? "This is a non-binding estimate; final price is based on time and materials." : "Firm price for the scope above."} Valid 30 days. Work outside the scope above is billed at contract rates.</p>
        <div className="grid grid-cols-2 gap-10 mt-14 text-[12px]">
          <div className="border-t border-ink pt-1">Accepted by (name, signature)</div>
          <div className="border-t border-ink pt-1">Date</div>
        </div>
      </>
    );
  }

  // Field report (work order) — no prices
  const techs = w.roles.filter((r) => r.personId && ["Primary Tech", "Secondary Tech", "Team Leader"].includes(r.type)).map((r) => L.person(r.personId)!.name);
  return (
    <>
      <Header title="Field report" no={String(w.id)} date={fmtDate(new Date().toISOString())} />
      <Parties w={w} />
      <Block label="Request">{w.customerRequest}</Block>
      <Block label="Work performed">{w.workPerformed || "—"}</Block>
      {techs.length > 0 && <Block label="Technicians">{[...new Set(techs)].join(", ")}</Block>}
      {w.equipmentIds.length > 0 && <Block label="Equipment serviced">{w.equipmentIds.map((x) => { const q = L.equip(x)!; return `${q.tag} ${q.type}${q.location ? ` (${q.location})` : ""}`; }).join(", ")}</Block>}
      {w.time.length > 0 && (
        <Block label="Time on site">
          {w.time.map((t) => `${fmtDate(t.date)} — ${L.person(t.personId)?.name}: ${t.hours.toFixed(1)} h${t.type !== "Regular" ? ` (${t.type})` : ""}`).join("\n")}
        </Block>
      )}
      {w.materials.length > 0 && <Block label="Materials used">{w.materials.map((m) => `${m.qty} × ${m.item}`).join("\n")}</Block>}
      <div className="grid grid-cols-2 gap-10 mt-14 text-[12px]">
        <div className="border-t border-ink pt-1">Customer signature</div>
        <div className="border-t border-ink pt-1">Technician</div>
      </div>
    </>
  );
}

export default function Print() {
  useEffect(() => {
    // Documents are always printed in light theme
    const el = document.documentElement; const prev = el.getAttribute("data-theme");
    el.setAttribute("data-theme", "light");
    return () => { if (prev) el.setAttribute("data-theme", prev); else el.removeAttribute("data-theme"); };
  }, []);
  return (
    <div className="bg-white text-[#111] min-h-screen print:p-0 py-6">
      <div className="max-w-[800px] mx-auto px-8 py-8 bg-white print:shadow-none shadow-pop rounded-md print:rounded-none" style={{ colorScheme: "light" }}>
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <button className="btn" onClick={() => history.back()}>Back</button>
          <button className="btn btn-primary" onClick={() => window.print()}><Printer size={15} />Print / Save as PDF</button>
        </div>
        <Suspense><Doc /></Suspense>
      </div>
    </div>
  );
}
