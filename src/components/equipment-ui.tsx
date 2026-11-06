"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Plus, Search, AlertTriangle, Pencil, Check } from "lucide-react";
import { useLookups, useStore } from "@/lib/store";
import { downloadCSV } from "@/lib/csv";
import { Chip, Field, PageHeader } from "./ui";
import type { Equipment } from "@/lib/types";

const REFRIGERANTS = ["", "R-410A", "R-32", "R-454B", "R-22", "R-134a", "R-407C", "R-404A", "R-290"];

/** Editable spec sheet for one unit. Techs may edit (field data); everyone else office. */
export function EquipmentSpecs({ e }: { e: Equipment }) {
  const s = useStore();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState<Equipment>(e);
  const rows: [keyof Equipment, string, "text" | "number" | "refrigerant"][] = [
    ["tag", "Tag", "text"], ["type", "Type", "text"], ["manufacturer", "Manufacturer", "text"], ["model", "Model", "text"],
    ["serial", "Serial #", "text"], ["installedYear", "Installed (year)", "number"], ["location", "Location", "text"], ["areaServed", "Area served", "text"],
    ["refrigerant", "Refrigerant", "refrigerant"], ["refrigerantLbs", "Charge (lb)", "number"], ["filters", "Filters", "text"], ["belts", "Belts", "text"],
  ];
  const save = () => { s.saveRecord("equipment", { ...f, installedYear: f.installedYear ? Number(f.installedYear) : undefined, refrigerantLbs: f.refrigerantLbs ? Number(f.refrigerantLbs) : undefined } as unknown as Record<string, unknown>); setEdit(false); };
  return (
    <section className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Specifications</h2>
        {s.persona !== "customer" as string && (edit
          ? <div className="flex gap-2"><button className="btn btn-sm" onClick={() => { setF(e); setEdit(false); }}>Cancel</button><button className="btn btn-primary btn-sm" disabled={!f.tag || !f.type} onClick={save}><Check size={13} />Save</button></div>
          : <button className="btn btn-sm" onClick={() => { setF(e); setEdit(true); }}><Pencil size={13} />Edit</button>)}
      </div>
      <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
        {rows.map(([k, label, kind]) => (
          <div key={k}>
            <dt className="label">{label}</dt>
            <dd className="mt-0.5">{edit
              ? kind === "refrigerant"
                ? <select className="field" value={String(f[k] ?? "")} onChange={(ev) => setF({ ...f, [k]: ev.target.value || undefined })}>{REFRIGERANTS.map((r) => <option key={r} value={r}>{r || "—"}</option>)}</select>
                : <input className={`field ${kind === "number" ? "num" : ""} ${k === "serial" || k === "tag" ? "font-mono" : ""}`} type={kind === "number" ? "number" : "text"} step="0.1" value={String(f[k] ?? "")} onChange={(ev) => setF({ ...f, [k]: ev.target.value === "" ? undefined : ev.target.value })} />
              : <span className={k === "serial" || k === "tag" ? "font-mono" : ""}>{e[k] != null && e[k] !== "" ? String(e[k]) + (k === "refrigerantLbs" ? " lb" : "") : <span className="text-ink-3">—</span>}</span>}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Equipment register: search across fields, filters, duplicate serials, CSV, add. */
export function EquipmentList() {
  const s = useStore(); const L = useLookups();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [ref, setRef] = useState("");
  const [dupOnly, setDupOnly] = useState(false);
  const [adding, setAdding] = useState(false);
  const [n, setN] = useState({ buildingId: s.buildings[0]?.id ?? 0, type: "", tag: "", manufacturer: "", model: "", serial: "", location: "" });

  const serialCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of s.equipment) if (e.serial) { const k = e.serial.trim().toUpperCase(); m.set(k, (m.get(k) ?? 0) + 1); }
    return m;
  }, [s.equipment]);
  const isDup = (e: Equipment) => !!e.serial && (serialCount.get(e.serial.trim().toUpperCase()) ?? 0) > 1;
  const types = [...new Set(s.equipment.map((e) => e.type))].sort();
  const refs = [...new Set(s.equipment.map((e) => e.refrigerant).filter(Boolean))].sort() as string[];
  const qq = q.trim().toLowerCase();
  const list = s.equipment.filter((e) => {
    if (type && e.type !== type) return false;
    if (ref && e.refrigerant !== ref) return false;
    if (dupOnly && !isDup(e)) return false;
    if (!qq) return true;
    const b = L.building(e.buildingId);
    return [e.tag, e.type, e.manufacturer, e.model, e.serial, e.location, e.areaServed, e.refrigerant, e.filters, e.belts, b?.name, b?.address].join(" ").toLowerCase().includes(qq);
  }).sort((a, b) => (L.building(a.buildingId)?.name ?? "").localeCompare(L.building(b.buildingId)?.name ?? "") || a.tag.localeCompare(b.tag));
  const dups = s.equipment.filter(isDup).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Equipment" sub="Every unit across all buildings. Search by tag, model, serial, refrigerant, filter size or address."
        actions={<>
          <button className="btn" onClick={() => downloadCSV("equipment", ["ID", "Building", "Tag", "Type", "Manufacturer", "Model", "Serial", "Installed", "Location", "Area served", "Refrigerant", "Charge lb", "Filters", "Belts", "Last inspected"],
            list.map((e) => [e.id, L.building(e.buildingId)?.name, e.tag, e.type, e.manufacturer, e.model, e.serial, e.installedYear, e.location, e.areaServed, e.refrigerant, e.refrigerantLbs, e.filters, e.belts, e.lastInspected]))}><Download size={15} />CSV</button>
          {s.persona !== "tech" && <button className="btn btn-primary" onClick={() => setAdding(!adding)}><Plus size={15} />Add unit</button>}
        </>} />
      {adding && (
        <div className="card p-4 grid sm:grid-cols-4 gap-3 items-end">
          <Field label="Building"><select className="field" value={n.buildingId} onChange={(e) => setN({ ...n, buildingId: Number(e.target.value) })}>{s.buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Type *"><input className="field" list="eq-types" value={n.type} onChange={(e) => setN({ ...n, type: e.target.value })} /><datalist id="eq-types">{types.map((t) => <option key={t} value={t} />)}</datalist></Field>
          <Field label="Tag *"><input className="field font-mono" value={n.tag} onChange={(e) => setN({ ...n, tag: e.target.value })} /></Field>
          <Field label="Location"><input className="field" value={n.location} onChange={(e) => setN({ ...n, location: e.target.value })} /></Field>
          <Field label="Manufacturer"><input className="field" value={n.manufacturer} onChange={(e) => setN({ ...n, manufacturer: e.target.value })} /></Field>
          <Field label="Model"><input className="field" value={n.model} onChange={(e) => setN({ ...n, model: e.target.value })} /></Field>
          <Field label="Serial #"><input className="field font-mono" value={n.serial} onChange={(e) => setN({ ...n, serial: e.target.value })} /></Field>
          <button className="btn btn-primary" disabled={!n.type || !n.tag} onClick={() => {
            const id = s.saveRecord("equipment", { ...n, manufacturer: n.manufacturer || undefined, model: n.model || undefined, serial: n.serial || undefined, location: n.location || undefined });
            setAdding(false); window.location.href = `/equipment?id=${id}`;
          }}>Save unit</button>
        </div>
      )}
      <div className="card">
        <div className="p-3 border-b border-line flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-56 max-w-md"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input className="field !pl-8" placeholder="Tag, model, serial, refrigerant, filter size, address" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="field !w-auto" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{types.map((t) => <option key={t}>{t}</option>)}</select>
          <select className="field !w-auto" value={ref} onChange={(e) => setRef(e.target.value)}><option value="">Any refrigerant</option>{refs.map((r) => <option key={r}>{r}</option>)}</select>
          {dups > 0 && <Chip active={dupOnly} onClick={() => setDupOnly(!dupOnly)} count={dups}>Duplicate serials</Chip>}
          <span className="text-ink-3 text-[12.5px] ml-auto">{list.length} of {s.equipment.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Tag</th><th>Type</th><th>Make / model</th><th>Serial</th><th>Building · location</th><th>Refrigerant</th><th>Filters</th></tr></thead>
            <tbody>{list.map((e) => (
              <tr key={e.id} className="cursor-pointer" onClick={() => (window.location.href = `/equipment?id=${e.id}`)}>
                <td><Link href={`/equipment?id=${e.id}`} className="font-mono text-primary font-medium">{e.tag}</Link></td>
                <td>{e.type}</td>
                <td className="text-ink-2">{[e.manufacturer, e.model].filter(Boolean).join(" ") || "—"}</td>
                <td className="font-mono text-[12.5px]">{e.serial ?? "—"}{isDup(e) && <span title="Same serial on another unit" className="inline-flex ml-1 align-middle" style={{ color: "var(--warn)" }}><AlertTriangle size={12} /></span>}</td>
                <td><div>{L.building(e.buildingId)?.name}</div><div className="text-[12px] text-ink-3">{e.location}</div></td>
                <td className="text-ink-2 num">{e.refrigerant ? `${e.refrigerant}${e.refrigerantLbs ? ` · ${e.refrigerantLbs} lb` : ""}` : "—"}</td>
                <td className="text-ink-2 text-[12.5px]">{e.filters ?? "—"}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
