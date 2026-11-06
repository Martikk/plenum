import type {
  Contract, MaterialEntry, Person, RoleStatus, TimeEntry, TimeType, WOStatus, WorkOrder, Invoice,
} from "./types";
import { TECH_ROLES } from "./types";

/**
 * Calculation settings. Defaults are assumptions (see docs/spec-notes.md "Still open");
 * management can change them in Settings. `export let` keeps ES live bindings, so
 * applySettings() updates every importer.
 */
export interface CalcSettings {
  pst: number; gst: number; marginThreshold: number;
  labourCost: { Journeyman: number; Apprentice: number; Office: number };
}
export const DEFAULT_SETTINGS: CalcSettings = {
  pst: 0.07, gst: 0.05, marginThreshold: 0.2, labourCost: { Journeyman: 58, Apprentice: 34, Office: 40 },
};
export let PST = DEFAULT_SETTINGS.pst;
export let GST = DEFAULT_SETTINGS.gst;
export let MARGIN_THRESHOLD = DEFAULT_SETTINGS.marginThreshold;
export let LABOUR_COST = { ...DEFAULT_SETTINGS.labourCost };
export function applySettings(s: CalcSettings | undefined) {
  if (!s) return;
  PST = s.pst; GST = s.gst; MARGIN_THRESHOLD = s.marginThreshold; LABOUR_COST = { ...s.labourCost };
}

const TIME_MULT: Record<TimeType, number> = {
  Regular: 1, "OT 1.5": 1.5, "OT 2.0": 2, "Call Out 1.5": 1.5, "Call Out 2.0": 2,
};

/**
 * WO status is derived from the statuses of tech roles (spec: "status is not set directly").
 * Precedence is a hypothesis to confirm with Ucora:
 *   Closed flag > all Complete > any Incomplete > any Responding > any Assigned > Unassigned
 */
export function deriveStatus(wo: WorkOrder): WOStatus {
  if (wo.closed) return "Closed";
  const tech = wo.roles.filter((r) => TECH_ROLES.includes(r.type) && r.type !== "Service Coordinator");
  const active = tech.filter((r) => r.status !== "Declined" && r.status !== "Holding" && r.status !== "Posted" && r.personId);
  if (active.length === 0) return "Unassigned";
  const has = (s: RoleStatus) => active.some((r) => r.status === s);
  if (active.every((r) => r.status === "Complete")) return "Complete";
  if (has("Incomplete")) return "Incomplete";
  if (has("Responding")) return "Responding";
  return "Assigned";
}

export function typeCode(c: Contract | undefined, kind: "QO" | "WO") {
  if (!c) return `(?-?-${kind})`;
  const s = c.serviceType === "Hydronics" ? "Y" : c.serviceType[0];
  return `(${c.type[0]}-${s}-${kind})`;
}

export function contractName(c: Contract, orgName: string) {
  return `${c.type}-${c.serviceType} | ${orgName}`;
}

function personCost(p: Person | undefined) {
  return LABOUR_COST[p?.group ?? "Journeyman"];
}
function personRate(p: Person | undefined, c: Contract) {
  return p?.group === "Apprentice" ? c.rates.apprentice : c.rates.journeyman;
}

export function materialSell(m: MaterialEntry, c: Contract) {
  if (m.sellPrice != null) return m.sellPrice * m.qty;
  if (m.unitCost == null) return 0;
  const mk =
    m.type === "Subtrade" ? (c.type === "Installation" ? c.installationMarkup : c.subtradeMarkup)
    : c.type === "Installation" ? c.installationMarkup
    : c.materialMarkup;
  return m.unitCost * m.qty * (1 + mk);
}
export function materialCost(m: MaterialEntry, withPst: boolean) {
  if (m.unitCost == null) return 0;
  const base = m.unitCost * m.qty;
  return withPst && !m.pstExempt ? base * (1 + PST) : base;
}

export interface Econ {
  hours: number; labourCost: number; labourSell: number;
  matCost: number; matCostPst: number; matSell: number;
  totalCostPst: number; sell: number; margin: number | null;
  missingCost: number; // count of material lines without a cost
}

function econ(time: TimeEntry[], mats: MaterialEntry[], c: Contract, people: Person[], quoted: boolean, sellOverride?: number): Econ {
  const pm = new Map(people.map((p) => [p.id, p]));
  let hours = 0, labourCost = 0, labourSell = 0;
  for (const t of time) {
    const p = pm.get(t.personId);
    hours += t.hours;
    labourCost += t.hours * personCost(p) * TIME_MULT[t.type];
    labourSell += t.hours * personRate(p, c) * TIME_MULT[t.type];
  }
  if (quoted) labourSell *= 1 + c.quoteMarkup;
  let matCost = 0, matCostPst = 0, matSell = 0, missingCost = 0;
  for (const m of mats) {
    matCost += materialCost(m, false);
    matCostPst += materialCost(m, true);
    matSell += materialSell(m, c);
    if (m.unitCost == null || m.unitCost === 0) missingCost++;
  }
  const totalCostPst = labourCost + matCostPst;
  const sell = sellOverride ?? labourSell + matSell;
  return {
    hours, labourCost, labourSell, matCost, matCostPst, matSell, totalCostPst, sell,
    margin: sell > 0 ? (sell - totalCostPst) / sell : null, missingCost,
  };
}

export function economics(wo: WorkOrder, c: Contract, people: Person[], invoices: Invoice[]) {
  const quote = econ(wo.quotedTime, wo.quotedMaterials, c, people, true, wo.quotedSellOverride);
  const actual = econ(wo.time, wo.materials, c, people, false);
  const invoiced = invoices.filter((i) => i.woId === wo.id && i.status !== "Cancelled")
    .reduce((s, i) => s + invoiceSubtotal(i), 0);
  const billable = wo.billType === "Billable";
  // Finished jobs: invoiced amount is the truth. Jobs in progress (incl. progress billing): forecast at T&M sell.
  const done = wo.closed || deriveStatus(wo) === "Complete";
  const actualSell = !billable ? 0 : done && invoiced > 0 ? invoiced : Math.max(actual.sell, invoiced);
  const actualMargin = actualSell > 0 ? (actualSell - actual.totalCostPst) / actualSell : null;
  const wip = Math.max(0, actual.totalCostPst - (invoiced > 0 ? actual.totalCostPst : 0));
  return { quote, actual: { ...actual, sell: actualSell, margin: actualMargin }, invoiced, wip };
}

export const invoiceSubtotal = (i: Invoice) => i.lines.reduce((s, l) => s + l.amount, 0);

export const money = (n: number) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
export const money2 = (n: number) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 });
export const pct = (n: number | null) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);

export function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}
export function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}
export function relTime(iso: string, now = new Date()) {
  const diff = (now.getTime() - new Date(iso).getTime()) / 36e5;
  if (diff < 0) { const f = -diff; return f < 1 ? `in ${Math.max(1, Math.round(f * 60))}m` : f < 24 ? `in ${Math.round(f)}h` : `in ${Math.round(f / 24)}d`; }
  if (diff < 1) return `${Math.max(1, Math.round(diff * 60))}m ago`;
  if (diff < 24) return `${Math.round(diff)}h ago`;
  return `${Math.round(diff / 24)}d ago`;
}

/**
 * Progress billing position for a work order.
 * value: firm-price → quoted sell; estimate → max(quoted, T&M actual).
 * gross: sum of "Progress"/"Work Noted Above"/labour/parts lines on non-cancelled invoices (before holdback).
 */
export function billing(wo: WorkOrder, c: Contract, people: Person[], invoices: Invoice[]) {
  const e = economics(wo, c, people, invoices);
  const quoted = e.quote.sell;
  const value = wo.estimate === "Estimate" ? Math.max(quoted, e.actual.sell) : quoted || e.actual.sell;
  const live = invoices.filter((i) => i.woId === wo.id && i.status !== "Cancelled");
  let gross = 0, held = 0, released = 0;
  for (const i of live) for (const l of i.lines) {
    if (l.kind === "Holdback") held += -l.amount;
    else if (l.kind === "Holdback release") released += l.amount;
    else if (l.kind === "Less previous billing") gross += l.amount; // negative: offsets the full-value line on a final invoice
    else gross += l.amount;
  }
  return { value, gross, held, released, outstandingHoldback: held - released, remaining: Math.max(0, value - gross), pct: value > 0 ? gross / value : 0, count: live.filter((i) => i.progress).length };
}

/** Time off covering `date` (YYYY-MM-DD) for a person, including company-wide stat holidays (personId 0). */
export function offOn(timeOff: { personId: number; start: string; end: string; kind: string; note?: string }[], personId: number, date: string) {
  return timeOff.find((t) => (t.personId === personId || t.personId === 0) && t.start <= date && date <= t.end);
}
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
