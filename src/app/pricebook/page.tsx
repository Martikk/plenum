"use client";
import { useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDate, money2 } from "@/lib/logic";
import { Field, PageHeader } from "@/components/ui";
import type { MaterialType } from "@/lib/types";

const TYPES: MaterialType[] = ["Equipment", "Materials", "Parts", "Supplies", "Tools", "Subtrade", "Truck Charge", "Other", "Filters from Stock", "Refrigerant Purchased", "Refrigerant from Stock", "Truck Stock Purchased", "Truck Stock from Stock"];

export default function PriceBook() {
  const s = useStore();
  const canEdit = ["coordinator", "manager", "ceo", "dispatcher"].includes(s.persona);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ sku: "", name: "", type: "Parts" as MaterialType, unitCost: "", vendor: "" });
  const qq = q.trim().toLowerCase();
  const list = s.priceBook.filter((p) => !qq || `${p.sku} ${p.name} ${p.vendor}`.toLowerCase().includes(qq)).sort((a, b) => a.name.localeCompare(b.name));
  const stale = (iso: string) => Date.now() - new Date(iso).getTime() > 180 * 864e5;

  return (
    <div className="space-y-4 max-w-5xl">
      <PageHeader title="Price book" sub="Purchase costs (before tax) for common parts and materials. When a tech or coordinator adds a material with a matching name, the cost fills in automatically, so quotes don't go out with missing costs." />
      <div className="card">
        <div className="p-3 border-b border-line flex items-center gap-2">
          <div className="relative flex-1 max-w-sm"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input className="field !pl-8" placeholder="Search SKU, name, vendor" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <span className="text-ink-3 text-[12.5px] ml-auto">{s.priceBook.length} items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Item</th><th>Type</th><th>Vendor</th><th className="text-right">Unit cost</th><th>Updated</th><th></th></tr></thead>
            <tbody>{list.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-[12.5px] text-ink-2">{p.sku}</td>
                <td className="font-medium">{p.name}</td>
                <td className="text-ink-2">{p.type}</td>
                <td className="text-ink-2">{p.vendor}</td>
                <td className="text-right">{canEdit
                  ? <input type="number" step="0.01" min={0} className="field !w-28 !py-1 text-right num" defaultValue={p.unitCost}
                      onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== p.unitCost) s.upsertPrice({ ...p, unitCost: v }); }} />
                  : <span className="num">{money2(p.unitCost)}</span>}</td>
                <td className="num text-[12.5px]" style={{ color: stale(p.updatedAt) ? "var(--warn)" : "var(--text-3)" }} title={stale(p.updatedAt) ? "Older than 6 months: check with supplier" : undefined}>{fmtDate(p.updatedAt)}</td>
                <td className="text-right">{canEdit && <button className="btn btn-ghost btn-sm" aria-label="Delete" onClick={() => confirm(`Remove ${p.name}?`) && s.removePrice(p.id)}><Trash2 size={14} /></button>}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <div className="p-3 border-t border-line bg-sunken/40 flex flex-wrap gap-2 items-end">
            <Field label="SKU"><input className="field !w-32 font-mono" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></Field>
            <Field label="Item" className="flex-1 min-w-56"><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Type"><select className="field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as MaterialType })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Vendor"><input className="field !w-40" value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} /></Field>
            <Field label="Unit cost"><input type="number" step="0.01" className="field !w-28 num" value={f.unitCost} onChange={(e) => setF({ ...f, unitCost: e.target.value })} /></Field>
            <button className="btn" disabled={!f.name.trim() || f.unitCost === ""} onClick={() => { s.upsertPrice({ sku: f.sku || undefined, name: f.name.trim(), type: f.type, unitCost: Number(f.unitCost), vendor: f.vendor || undefined }); setF({ ...f, sku: "", name: "", unitCost: "", vendor: "" }); }}><Plus size={15} />Add</button>
          </div>
        )}
      </div>
    </div>
  );
}
