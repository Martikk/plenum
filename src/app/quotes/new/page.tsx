"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PERSONAS, useStore } from "@/lib/store";
import { Field, PageHeader } from "@/components/ui";
import type { MaterialEntry, MaterialType, Urgency, Role } from "@/lib/types";

type Line = { type: MaterialType; item: string; qty: number; cost: string };

export default function NewQuote() {
  const s = useStore();
  const router = useRouter();
  const me = s.people.find((p) => p.id === PERSONAS[s.persona].personId)!;
  const [buildingId, setBuildingId] = useState<number>(s.buildings[0].id);
  const contracts = useMemo(() => s.contracts.filter((c) => c.buildingIds.includes(buildingId) && c.active), [s.contracts, buildingId]);
  const [contractId, setContractId] = useState<number | "">("");
  const cid = contractId || contracts[0]?.id;
  const [equipIds, setEquipIds] = useState<number[]>([]);
  const [request, setRequest] = useState("");
  const [recommended, setRecommended] = useState("");
  const [hours, setHours] = useState(2);
  const [techs, setTechs] = useState(1);
  const [urgency, setUrgency] = useState<Urgency>("Medium");
  const [lines, setLines] = useState<Line[]>([{ type: "Parts", item: "", qty: 1, cost: "" }]);
  const [subtrade, setSubtrade] = useState({ need: false, what: "", cost: "" });
  const [coordinator, setCoordinator] = useState<number>(20);
  const [alertDays, setAlertDays] = useState(2);

  const coordinators = s.people.filter((p) => p.title === "Service Coordinator");
  const equip = s.equipment.filter((e) => e.buildingId === buildingId);
  const missing = lines.filter((l) => l.item && l.cost === "").length + (subtrade.need && subtrade.cost === "" ? 1 : 0);
  const techId = me.group === "Office" ? 1 : me.id;

  const submit = (needsPricing: boolean) => {
    const b = s.buildings.find((b) => b.id === buildingId)!;
    const mats: MaterialEntry[] = lines.filter((l) => l.item).map((l, i) => ({ id: i + 1, type: l.type, item: l.item, qty: l.qty, unitCost: l.cost === "" ? null : Number(l.cost) }));
    if (subtrade.need) mats.push({ id: 99, type: "Subtrade", item: subtrade.what || "Subtrade", qty: 1, unitCost: subtrade.cost === "" ? null : Number(subtrade.cost) });
    const roles: Role[] = [{ id: Date.now(), type: "Primary Tech", personId: techId, status: "Complete" }];
    if (needsPricing) roles.push({ id: Date.now() + 1, type: "Service Coordinator", personId: coordinator, status: "Assigned", instruction: "Source and price missing materials / subtrade" });
    const alertAt = new Date(); alertAt.setDate(alertAt.getDate() + alertDays);
    const id = s.createQuote({
      kind: "QO", contractId: cid!, buildingId, orgId: b.orgId, equipmentIds: equipIds, urgency, billType: "Billable", estimate: "Firm Price",
      pricePending: needsPricing, customerRequest: request, workRecommended: recommended, quoteStatus: needsPricing ? "Pricing" : "Draft",
      pricingAlertAt: needsPricing ? alertAt.toISOString() : undefined,
      roles, quotedTime: Array.from({ length: techs }, (_, i) => ({ id: i + 1, personId: i === 0 ? techId : 7, hours, type: "Regular" as const })),
      time: [], quotedMaterials: mats, materials: [],
    });
    router.push(`/work-orders/${id}`);
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="New quote" sub="Tech-initiated. Fill what you know; leave unknown costs blank and the Service Coordinator will price them." />
      <div className="card p-5 space-y-5">
        <section className="grid md:grid-cols-2 gap-4">
          <Field label="Building address">
            <select className="field" value={buildingId} onChange={(e) => { setBuildingId(Number(e.target.value)); setContractId(""); setEquipIds([]); }}>
              {s.buildings.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.address}, {b.city}</option>)}
            </select>
          </Field>
          <Field label="Contract" hint={contracts.length === 0 ? "No active contract on this building" : undefined}>
            <select className="field" value={cid ?? ""} onChange={(e) => setContractId(Number(e.target.value))}>
              {contracts.map((c) => <option key={c.id} value={c.id}>{c.type}-{c.serviceType} · #{c.id}</option>)}
            </select>
          </Field>
          <Field label="Customer request" className="md:col-span-2"><textarea className="field" value={request} onChange={(e) => setRequest(e.target.value)} placeholder="What the customer reported" /></Field>
          <Field label="Equipment to be serviced" className="md:col-span-2">
            <div className="flex flex-wrap gap-2">
              {equip.length === 0 && <span className="text-ink-3">No equipment on file for this building.</span>}
              {equip.map((e) => (
                <label key={e.id} className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-line-strong cursor-pointer has-[:checked]:bg-primary-soft has-[:checked]:border-primary">
                  <input type="checkbox" checked={equipIds.includes(e.id)} onChange={(ev) => setEquipIds(ev.target.checked ? [...equipIds, e.id] : equipIds.filter((x) => x !== e.id))} />
                  <span className="font-mono text-[12px]">{e.tag}</span> {e.type}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Work recommended" className="md:col-span-2"><textarea className="field" value={recommended} onChange={(e) => setRecommended(e.target.value)} /></Field>
        </section>

        <section className="grid grid-cols-3 gap-4 max-w-md">
          <Field label="Hours per tech"><input type="number" step="0.5" className="field num" value={hours} onChange={(e) => setHours(Number(e.target.value))} /></Field>
          <Field label="Techs"><input type="number" min={1} max={4} className="field num" value={techs} onChange={(e) => setTechs(Number(e.target.value))} /></Field>
          <Field label="Urgency"><select className="field" value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}><option>High</option><option>Medium</option><option>Low</option></select></Field>
        </section>

        <section>
          <div className="label mb-1.5">Materials specification</div>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select className="field !w-36" value={l.type} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, type: e.target.value as MaterialType } : x)))}>
                  {["Equipment", "Materials", "Parts", "Supplies", "Refrigerant Purchased", "Other"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <input className="field flex-1" placeholder="Spec, size, model" value={l.item} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)))} />
                <input type="number" className="field !w-16 num" value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} />
                <input type="number" className="field !w-28 num" placeholder="Cost if known" value={l.cost} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, cost: e.target.value } : x)))} />
                <button className="btn btn-ghost !px-2" aria-label="Remove line" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
              </div>
            ))}
            <button className="btn btn-sm" onClick={() => setLines([...lines, { type: "Parts", item: "", qty: 1, cost: "" }])}><Plus size={14} />Line</button>
          </div>
        </section>

        <section className="flex flex-wrap gap-3 items-end">
          <label className="inline-flex items-center gap-2 h-8"><input type="checkbox" checked={subtrade.need} onChange={(e) => setSubtrade({ ...subtrade, need: e.target.checked })} />Subtrade required</label>
          {subtrade.need && <>
            <input className="field !w-64" placeholder="e.g. crane lift, electrician" value={subtrade.what} onChange={(e) => setSubtrade({ ...subtrade, what: e.target.value })} />
            <input type="number" className="field !w-32 num" placeholder="Cost if known" value={subtrade.cost} onChange={(e) => setSubtrade({ ...subtrade, cost: e.target.value })} />
          </>}
        </section>

        <section className="rounded-lg p-4 bg-sunken/60 border border-line grid md:grid-cols-[1fr_auto] gap-4 items-end">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Service Coordinator for pricing">
              <select className="field" value={coordinator} onChange={(e) => setCoordinator(Number(e.target.value))}>{coordinators.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </Field>
            <Field label="Alert me if pricing isn't done in" hint="Optional status alert (Option B)">
              <select className="field" value={alertDays} onChange={(e) => setAlertDays(Number(e.target.value))}>{[1, 2, 3, 5].map((d) => <option key={d} value={d}>{d} business day{d > 1 ? "s" : ""}</option>)}</select>
            </Field>
          </div>
          <div className="flex gap-2">
            <button className="btn" disabled={!request || !cid} onClick={() => submit(false)}>Save draft</button>
            <button className="btn btn-primary" disabled={!request || !cid} onClick={() => submit(true)}>Request pricing{missing ? ` (${missing})` : ""}</button>
          </div>
        </section>
      </div>
    </div>
  );
}
