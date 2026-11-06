"use client";
import { useMemo, useState } from "react";
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { useStore } from "@/lib/store";
import { apiEnabled, importItems, pull } from "@/lib/api";
import { autoMap, build, FIELDS, parseCSV, type ImportKind } from "@/lib/importer";
import { Chip, PageHeader } from "@/components/ui";

const KINDS: [ImportKind, string, string][] = [
  ["org", "Organizations", "GPP: Find → Organizations → export"],
  ["building", "Buildings", "GPP: Find → Buildings → export"],
  ["equipment", "Equipment", "GPP: Find → Equipment → export"],
  ["contact", "Contacts", "GPP: Find → People → export (customer contacts)"],
  ["contract", "Contracts", "GPP: Find → Contracts → export"],
];

export default function Import() {
  const s = useStore();
  const canImport = s.persona === "manager" || s.persona === "ceo";
  const [kind, setKind] = useState<ImportKind>("org");
  const [table, setTable] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [map, setMap] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const headers = table?.[0] ?? [];
  const body = useMemo(() => table?.slice(1) ?? [], [table]);
  const result = useMemo(() => table ? build(kind, body, map, { orgs: s.orgs, buildings: s.buildings, template: s.contracts[0] }) : null, [table, kind, body, map, s.orgs, s.buildings, s.contracts]);
  const existing = (kind === "org" ? s.orgs : kind === "building" ? s.buildings : kind === "equipment" ? s.equipment : kind === "contact" ? s.people : s.contracts).map((x) => x.id);
  const updates = result?.items.filter((i) => existing.includes(i.id)).length ?? 0;

  const load = async (f: File) => {
    setDone(null); setErr(null); setFileName(f.name);
    const t = parseCSV(await f.text());
    setTable(t); setMap(autoMap(kind, t[0] ?? []));
  };
  const switchKind = (k: ImportKind) => { setKind(k); setDone(null); if (table) setMap(autoMap(k, table[0] ?? [])); };

  const run = async () => {
    if (!result?.items.length) return;
    setBusy(true); setErr(null);
    try {
      if (apiEnabled) { const r = await importItems(kind, result.items); await pull(); setDone(`Imported ${r.count} record(s).`); }
      else { s.importItems(kind, result.items); setDone(`Imported ${result.items.length} record(s) into the local demo.`); }
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  if (!canImport) return <div><PageHeader title="Import" /><p className="text-ink-2">Only the Coordination Manager or CEO can import data.</p></div>;

  return (
    <div className="space-y-4 max-w-5xl">
      <PageHeader title="Import from GamePlanPro" sub="Upload a CSV export. Columns are matched automatically; import in order: organizations → buildings → equipment, contacts, contracts. Rows with the same ID are updated." />
      <div className="flex flex-wrap gap-2">{KINDS.map(([k, l]) => <Chip key={k} active={kind === k} onClick={() => switchKind(k)}>{l}</Chip>)}</div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <label className="btn btn-primary cursor-pointer"><Upload size={15} />Choose CSV<input type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} /></label>
        <span className="text-ink-2 inline-flex items-center gap-1.5"><FileSpreadsheet size={15} />{fileName || "No file"}{table ? ` · ${body.length} rows` : ""}</span>
        <span className="text-[12.5px] text-ink-3 ml-auto">{KINDS.find((k) => k[0] === kind)![2]}</span>
      </div>

      {table && (
        <>
          <section className="card p-4">
            <h2 className="font-semibold mb-3">Column mapping</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FIELDS[kind].map((f) => (
                <label key={f.key} className="block">
                  <span className="label">{f.label}{f.required && <span style={{ color: "var(--danger)" }}> *</span>}</span>
                  <select className="field mt-1" value={map[f.key] ?? ""} onChange={(e) => setMap({ ...map, [f.key]: e.target.value === "" ? (undefined as unknown as number) : Number(e.target.value) })}
                    style={f.required && map[f.key] == null ? { borderColor: "var(--danger)" } : undefined}>
                    <option value="">— not mapped —</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>

          {result && (
            <section className="card p-4">
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <span className="inline-flex items-center gap-1.5" style={{ color: "var(--ok)" }}><CheckCircle2 size={16} />{result.items.length} ready ({result.items.length - updates} new, {updates} update)</span>
                {result.errors.length > 0 && <span className="inline-flex items-center gap-1.5" style={{ color: "var(--warn)" }}><AlertTriangle size={16} />{result.errors.length} row(s) skipped</span>}
                <div className="flex-1" />
                <button className="btn btn-primary" disabled={busy || !result.items.length} onClick={run}>{busy ? "Importing…" : `Import ${result.items.length}`}</button>
              </div>
              {done && <p className="mb-3" style={{ color: "var(--ok)" }}>{done}</p>}
              {err && <p className="mb-3" style={{ color: "var(--danger)" }}>{err}</p>}
              {result.errors.length > 0 && (
                <details className="mb-3"><summary className="cursor-pointer text-ink-2">Skipped rows</summary>
                  <ul className="mt-2 text-[13px] max-h-48 overflow-auto">{result.errors.slice(0, 200).map((e, i) => <li key={i}><span className="num text-ink-3">Row {e.row}:</span> {e.message}</li>)}</ul>
                </details>
              )}
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead><tr>{Object.keys(result.items[0] ?? {}).slice(0, 8).map((k) => <th key={k}>{k}</th>)}</tr></thead>
                  <tbody>{result.items.slice(0, 8).map((it) => (
                    <tr key={it.id}>{Object.values(it).slice(0, 8).map((x, i) => <td key={i} className="max-w-56 truncate">{typeof x === "object" ? JSON.stringify(x) : String(x ?? "")}</td>)}</tr>
                  ))}</tbody>
                </table>
                {result.items.length > 8 && <p className="text-[12.5px] text-ink-3 mt-2">Showing 8 of {result.items.length}.</p>}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
