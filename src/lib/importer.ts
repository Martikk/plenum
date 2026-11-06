/**
 * CSV import for migrating from GamePlanPro search-result exports (or any CSV with similar headers).
 * Pure functions: parse → auto-map columns → build typed records + per-row errors.
 */
import type { Building, Contract, ContractType, Equipment, Org, Person, ServiceType } from "./types";

export type ImportKind = "org" | "building" | "equipment" | "contact" | "contract";

/** RFC 4180-ish parser: quotes, escaped quotes, CR/LF, tab or comma (auto-detected). */
export function parseCSV(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const firstLine = t.slice(0, t.indexOf("\n") >>> 0 || t.length);
  const sep = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

/** Target fields per kind, with header aliases (GPP export headers first). */
export const FIELDS: Record<ImportKind, { key: string; label: string; required?: boolean; aliases: string[] }[]> = {
  org: [
    { key: "id", label: "ID", required: true, aliases: ["id", "org id"] },
    { key: "name", label: "Name", required: true, aliases: ["organization", "org name", "name", "customer"] },
    { key: "accountCode", label: "Account code", aliases: ["account code", "accnt code", "acct"] },
    { key: "category", label: "Category", aliases: ["category", "type"] },
  ],
  building: [
    { key: "id", label: "ID", required: true, aliases: ["id", "building id", "bldg id"] },
    { key: "name", label: "Name", required: true, aliases: ["bldg name", "building name", "name", "building"] },
    { key: "unit", label: "Unit", aliases: ["unit"] },
    { key: "streetNo", label: "Street #", aliases: ["street#", "street #", "street no"] },
    { key: "street", label: "Street", aliases: ["street", "address"] },
    { key: "city", label: "City", aliases: ["city"] },
    { key: "org", label: "Organization", required: true, aliases: ["org (customer)", "organization", "org", "customer"] },
    { key: "access", label: "Access notes", aliases: ["bldg access", "access", "bldg desc"] },
  ],
  equipment: [
    { key: "id", label: "ID", required: true, aliases: ["id", "equip id"] },
    { key: "tag", label: "Tag", aliases: ["tag"] },
    { key: "type", label: "Type", required: true, aliases: ["type", "equip type", "equipment"] },
    { key: "mms", label: "Mfg/Model/Serial", aliases: ["mfg/model/serial", "manufacturer", "mfg"] },
    { key: "location", label: "Location", aliases: ["location", "area served"] },
    { key: "building", label: "Building", required: true, aliases: ["building", "bldg", "building name"] },
  ],
  contact: [
    { key: "id", label: "ID", required: true, aliases: ["id", "person id"] },
    { key: "name", label: "Name", required: true, aliases: ["person", "name", "contact"] },
    { key: "email", label: "Email", aliases: ["email", "e-mail"] },
    { key: "phone", label: "Phone", aliases: ["phone", "mobile", "cell"] },
    { key: "title", label: "Title", aliases: ["title", "position", "role"] },
  ],
  contract: [
    { key: "id", label: "ID", required: true, aliases: ["id", "contract id"] },
    { key: "contract", label: "Contract name", required: true, aliases: ["contract", "name"] },
    { key: "org", label: "Customer", required: true, aliases: ["customer", "organization", "org"] },
    { key: "buildings", label: "Building(s)", aliases: ["building(s)", "buildings", "building"] },
    { key: "start", label: "Start", aliases: ["start", "start date"] },
    { key: "end", label: "End", aliases: ["end", "end date"] },
    { key: "status", label: "Status", aliases: ["status"] },
  ],
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function autoMap(kind: ImportKind, headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const used = new Set<number>();
  for (const f of FIELDS[kind]) {
    for (const a of f.aliases) {
      const i = headers.findIndex((h, j) => !used.has(j) && norm(h) === a);
      if (i >= 0) { map[f.key] = i; used.add(i); break; }
    }
  }
  return map;
}

/** "FirstService Residential [610]" → 610; otherwise exact (case-insensitive) name match. */
function resolveRef<T extends { id: number; name: string }>(raw: string, list: T[]): number | null {
  const m = raw.match(/\[(\d+)\]\s*$/);
  if (m) return list.some((x) => x.id === Number(m[1])) ? Number(m[1]) : null;
  const n = norm(raw);
  return list.find((x) => norm(x.name) === n)?.id ?? null;
}

const SERVICE: ServiceType[] = ["Consult", "Controls", "Fleet", "HVAC", "Hydronics", "Meetings", "Piping", "Plumbing", "Standby", "Tools", "Training"];
const TYPES: ContractType[] = ["Installation", "Maintenance", "Service"];

export interface Ctx { orgs: Org[]; buildings: Building[]; template: Contract }
export interface Result { items: (Org | Building | Equipment | Person | Contract)[]; errors: { row: number; message: string }[]; }

export function build(kind: ImportKind, rows: string[][], map: Record<string, number>, ctx: Ctx): Result {
  const items: Result["items"] = []; const errors: Result["errors"] = [];
  // Records created earlier in the same file can be referenced by later rows
  const orgs = [...ctx.orgs]; const buildings = [...ctx.buildings];
  rows.forEach((r, idx) => {
    const v = (k: string) => (map[k] != null ? (r[map[k]] ?? "").trim() : "");
    const rowNo = idx + 2; // 1-based + header line
    const id = Number(v("id"));
    if (!Number.isInteger(id) || id <= 0) { errors.push({ row: rowNo, message: `Bad ID "${v("id")}"` }); return; }
    for (const f of FIELDS[kind]) if (f.required && f.key !== "id" && !v(f.key)) { errors.push({ row: rowNo, message: `${f.label} is empty` }); return; }

    if (kind === "org") {
      const o: Org = { id, name: v("name"), category: v("category") || "Customer", accountCode: v("accountCode") || undefined };
      items.push(o); orgs.push(o);
    } else if (kind === "building") {
      const orgId = resolveRef(v("org"), orgs);
      if (!orgId) { errors.push({ row: rowNo, message: `Organization not found: "${v("org")}" — import organizations first` }); return; }
      const addr = [v("unit") && `${v("unit")} –`, v("streetNo"), v("street")].filter(Boolean).join(" ") || v("name");
      const b: Building = { id, name: v("name"), address: addr, city: v("city"), orgId, access: v("access") || undefined };
      items.push(b); buildings.push(b);
    } else if (kind === "equipment") {
      const buildingId = resolveRef(v("building"), buildings);
      if (!buildingId) { errors.push({ row: rowNo, message: `Building not found: "${v("building")}"` }); return; }
      const [manufacturer, model] = v("mms").split("/").map((x) => x.trim());
      items.push({ id, buildingId, type: v("type"), tag: v("tag") || "NoTag", manufacturer: manufacturer || undefined, model: model || undefined, location: v("location") || undefined } as Equipment);
    } else if (kind === "contact") {
      const name = v("name");
      const initials = name.split(/\s+/).map((x) => x[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "?";
      items.push({ id, name, initials, kind: "contact", title: v("title") || undefined, email: v("email") || undefined, phone: v("phone") || undefined } as Person);
    } else if (kind === "contract") {
      // GPP name: "Service-Plumbing | Org (S-P) | Building"
      const head = v("contract").split("|")[0].trim();
      const [t, s] = head.split("-").map((x) => x.trim());
      const type = TYPES.find((x) => x.toLowerCase() === t?.toLowerCase());
      const serviceType = SERVICE.find((x) => x.toLowerCase() === s?.toLowerCase());
      if (!type || !serviceType) { errors.push({ row: rowNo, message: `Can't read type from "${head}" (expected e.g. Service-HVAC)` }); return; }
      const orgId = resolveRef(v("org"), orgs);
      if (!orgId) { errors.push({ row: rowNo, message: `Customer not found: "${v("org")}"` }); return; }
      const buildingIds = v("buildings").split(/[;,]\s*/).map((n) => resolveRef(n, buildings)).filter((x): x is number => !!x);
      const start = v("start") || new Date().toISOString().slice(0, 10);
      items.push({
        ...ctx.template, id, type, serviceType, orgId, buildingIds, start, end: v("end") || undefined,
        active: !/inactive|closed/i.test(v("status")), lockRates: false, ratesTemplate: false, defaultRolePersonIds: [], poRequired: false, poDefault: undefined, poNote: undefined,
      } as Contract);
    }
  });
  return { items, errors };
}
