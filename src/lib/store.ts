"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import * as seed from "./seed";
import type {
  Building, Contract, Equipment, HistoryItem, Invoice, InvoiceStatus, MaterialEntry, Org, Person,
  QuoteStatus, Role, RoleStatus, RoleType, TimeEntry, WorkOrder,
} from "./types";
import { applySettings, deriveStatus, DEFAULT_SETTINGS, type CalcSettings } from "./logic";
import type { MaintProfile } from "./types";

export type Persona = "dispatcher" | "coordinator" | "tech" | "manager" | "ceo";
export const PERSONAS: Record<Persona, { label: string; personId: number; blurb: string }> = {
  dispatcher: { label: "Dispatch", personId: 21, blurb: "Schedules most work orders" },
  coordinator: { label: "Service Coordinator", personId: 20, blurb: "Prices quotes, sources parts" },
  tech: { label: "Senior Tech", personId: 1, blurb: "Self-schedules, creates and sends quotes" },
  manager: { label: "Coordination Manager", personId: 22, blurb: "Reviews every invoice before it goes out" },
  ceo: { label: "CEO", personId: 23, blurb: "Advises on contentious invoices" },
};

interface Data {
  orgs: Org[]; buildings: Building[]; equipment: Equipment[]; people: Person[]; contracts: Contract[];
  workOrders: WorkOrder[]; invoices: Invoice[]; profiles: MaintProfile[]; settings: CalcSettings;
}

interface State extends Data {
  persona: Persona;
  setPersona: (p: Persona) => void;
  reset: () => void;
  setRoleStatus: (woId: number, roleId: number, s: RoleStatus) => void;
  completeAllRoles: (woId: number) => void;
  scheduleRole: (woId: number, roleId: number, personId: number, start: string, end: string) => void;
  addRole: (woId: number, type: RoleType, personId?: number) => void;
  removeRole: (woId: number, roleId: number) => void;
  addTime: (woId: number, e: Omit<TimeEntry, "id">, quoted: boolean) => void;
  addMaterial: (woId: number, e: Omit<MaterialEntry, "id">, quoted: boolean) => void;
  setMaterialCost: (woId: number, matId: number, cost: number, quoted: boolean) => void;
  removeEntry: (woId: number, id: number, list: "time" | "quotedTime" | "materials" | "quotedMaterials") => void;
  updateWO: (woId: number, patch: Partial<WorkOrder>) => void;
  setQuoteStatus: (woId: number, s: QuoteStatus) => void;
  convertQuote: (woId: number) => number;
  createQuote: (wo: Omit<WorkOrder, "id" | "name" | "history" | "createdAt">) => number;
  addNote: (woId: number, text: string) => void;
  createInvoice: (woId: number) => number;
  setInvoiceStatus: (id: number, s: InvoiceStatus, note?: string) => void;
  updateInvoice: (id: number, patch: Partial<Invoice>) => void;
  toggleHold: (woId: number) => void;
  closeWO: (woId: number) => void;
  updateProfile: (id: number, patch: Partial<MaintProfile>) => void;
  addProfile: (p: Omit<MaintProfile, "id" | "generated">) => void;
  /** Create PM work orders for every active profile due in `ym` ("YYYY-MM"). Returns created WO ids. */
  generatePM: (ym: string) => number[];
  setSettings: (s: CalcSettings) => void;
}

const fresh = (): Data => structuredClone({
  orgs: seed.orgs, buildings: seed.buildings, equipment: seed.equipment, people: seed.people,
  contracts: seed.contracts, workOrders: seed.workOrders, invoices: seed.invoices,
  profiles: seed.profiles, settings: DEFAULT_SETTINGS,
});

let seq = Date.now() % 100000;
const nid = () => ++seq;

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const me = () => get().people.find((p) => p.id === PERSONAS[get().persona].personId)!.name;
      const hist = (kind: HistoryItem["kind"], text: string): HistoryItem => ({ id: nid(), at: new Date().toISOString(), by: me(), kind, text });
      const patchWO = (woId: number, fn: (w: WorkOrder) => WorkOrder) =>
        set((s) => ({ workOrders: s.workOrders.map((w) => (w.id === woId ? fn(w) : w)) }));
      const withStatusLog = (before: WorkOrder, after: WorkOrder): WorkOrder => {
        const a = deriveStatus(before), b = deriveStatus(after);
        return a === b ? after : { ...after, history: [hist("Status", `WO status ${a} → ${b}`), ...after.history] };
      };
      return {
        ...fresh(),
        persona: "dispatcher",
        setPersona: (persona) => set({ persona }),
        reset: () => set({ ...fresh() }),

        setRoleStatus: (woId, roleId, st) => patchWO(woId, (w) => {
          const r = w.roles.find((r) => r.id === roleId)!;
          const next = { ...w, roles: w.roles.map((r) => (r.id === roleId ? { ...r, status: st } : r)),
            history: [hist("Change", `${r.type} → ${st}`), ...w.history] };
          return withStatusLog(w, next);
        }),
        completeAllRoles: (woId) => patchWO(woId, (w) => withStatusLog(w, {
          ...w, roles: w.roles.map((r) => (r.personId && r.status !== "Declined" ? { ...r, status: "Complete" } : r)),
          history: [hist("Change", "All assignments set to Complete"), ...w.history],
        })),
        scheduleRole: (woId, roleId, personId, start, end) => patchWO(woId, (w) => {
          const p = get().people.find((p) => p.id === personId)!;
          return withStatusLog(w, {
            ...w,
            roles: w.roles.map((r) => (r.id === roleId ? { ...r, personId, start, end, status: r.status === "Responding" ? r.status : "Assigned" } : r)),
            history: [hist("Change", `Scheduled ${p.name} ${new Date(start).toLocaleString("en-CA", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })}`), ...w.history],
          });
        }),
        addRole: (woId, type, personId) => patchWO(woId, (w) => ({
          ...w, roles: [...w.roles, { id: nid(), type, personId, status: personId ? "Assigned" : "Holding" } as Role],
          history: [hist("Change", `Added role ${type}`), ...w.history],
        })),
        removeRole: (woId, roleId) => patchWO(woId, (w) => withStatusLog(w, { ...w, roles: w.roles.filter((r) => r.id !== roleId) })),
        addTime: (woId, e, quoted) => patchWO(woId, (w) => quoted
          ? { ...w, quotedTime: [...w.quotedTime, { ...e, id: nid() }] }
          : { ...w, time: [...w.time, { ...e, id: nid() }] }),
        addMaterial: (woId, e, quoted) => patchWO(woId, (w) => quoted
          ? { ...w, quotedMaterials: [...w.quotedMaterials, { ...e, id: nid() }] }
          : { ...w, materials: [...w.materials, { ...e, id: nid() }] }),
        setMaterialCost: (woId, matId, cost, quoted) => patchWO(woId, (w) => {
          const k = quoted ? "quotedMaterials" : "materials";
          return { ...w, [k]: w[k].map((m) => (m.id === matId ? { ...m, unitCost: cost } : m)) };
        }),
        removeEntry: (woId, id, list) => patchWO(woId, (w) => ({ ...w, [list]: (w[list] as { id: number }[]).filter((x) => x.id !== id) })),
        updateWO: (woId, patch) => patchWO(woId, (w) => ({ ...w, ...patch })),
        setQuoteStatus: (woId, st) => patchWO(woId, (w) => ({
          ...w, quoteStatus: st, pricePending: st === "Draft" || st === "Pricing",
          quoteSentAt: st === "Sent" ? new Date().toISOString() : w.quoteSentAt,
          history: [hist("Status", st === "Sent" ? "Quote sent – posted to Customer Portal" : `Quote → ${st}`), ...w.history],
        })),
        convertQuote: (woId) => {
          patchWO(woId, (w) => ({
            ...w, kind: "WO", name: w.name.replace(/-QO$/, "-WO"),
            roles: [...w.roles.filter((r) => r.type !== "Service Coordinator").map((r) => (r.type === "Primary Tech" ? { ...r, status: "Holding" as RoleStatus, start: undefined, end: undefined } : r))],
            history: [hist("Change", "Approved quote converted to work order"), ...w.history],
          }));
          return woId;
        },
        createQuote: (input) => {
          const id = Math.max(...get().workOrders.map((w) => w.id)) + 1;
          const b = get().buildings.find((b) => b.id === input.buildingId)!;
          set((s) => ({ workOrders: [{ ...input, id, name: `${b.name}-${id}-QO`, createdAt: new Date().toISOString(), history: [hist("Change", "Quote created")] }, ...s.workOrders] }));
          return id;
        },
        addNote: (woId, text) => patchWO(woId, (w) => ({ ...w, history: [hist("Note", text), ...w.history] })),
        createInvoice: (woId) => {
          const id = Math.max(...get().invoices.map((i) => i.id)) + 1;
          set((s) => ({ invoices: [{ id, woId, date: new Date().toISOString().slice(0, 10), status: "Draft", progress: false, lines: [{ kind: "Work Noted Above", description: "Per work performed", amount: 0 }] }, ...s.invoices] }));
          patchWO(woId, (w) => ({ ...w, history: [hist("Change", `Invoice ${id} created`), ...w.history] }));
          return id;
        },
        setInvoiceStatus: (id, st, note) => {
          set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, status: st, reviewNote: note ?? i.reviewNote } : i)) }));
          // Not mirrored into WO history: the invoice change may be rejected by the server; the API keeps an audit log.
        },
        updateInvoice: (id, patch) => set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
        toggleHold: (woId) => patchWO(woId, (w) => ({ ...w, onHold: !w.onHold, history: [hist("Change", w.onHold ? "Released from hold" : "Put on hold"), ...w.history] })),
        closeWO: (woId) => patchWO(woId, (w) => withStatusLog(w, { ...w, closed: true })),
        updateProfile: (id, patch) => set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
        addProfile: (p) => set((s) => ({ profiles: [...s.profiles, { ...p, id: Math.max(700, ...s.profiles.map((x) => x.id)) + 1, generated: [] }] })),
        generatePM: (ym) => {
          const month = Number(ym.slice(5, 7));
          const st = get();
          const due = st.profiles.filter((p) => p.active && p.months.includes(month) && !p.generated.includes(ym));
          let id = Math.max(...st.workOrders.map((w) => w.id));
          const created: WorkOrder[] = due.map((p) => {
            const c = st.contracts.find((c) => c.id === p.contractId)!;
            const b = st.buildings.find((b) => b.id === p.buildingId)!;
            id += 1;
            const dueDate = `${ym}-${month === 2 ? "28" : "30"}`;
            return {
              id, kind: "WO", name: `${b.name}-${id}-WO`, contractId: c.id, buildingId: b.id, orgId: c.orgId,
              equipmentIds: p.equipmentIds, createdAt: new Date().toISOString(), due: dueDate, urgency: "Low",
              billType: c.allInclusive ? "Non-Billable All-Inclusive" : "Billable", estimate: "Firm Price", pricePending: false,
              customerRequest: `PM: ${p.name}. ${p.description}`, internalInstructions: `Generated from maintenance profile #${p.id} for ${ym}`,
              roles: [
                { id: nid(), type: "Primary Tech", personId: p.techIds[0], status: p.techIds[0] ? "Assigned" : "Holding" },
                ...c.defaultRolePersonIds.map((pid) => ({ id: nid(), type: "Property Contact" as RoleType, personId: pid, status: "Assigned" as RoleStatus })),
              ],
              quotedTime: p.techIds.length ? [{ id: nid(), personId: p.techIds[0], hours: p.hours, type: "Regular" }] : [],
              time: [], quotedMaterials: [], materials: [],
              history: [hist("Change", `PM work order generated from profile "${p.name}" (${ym})`)],
            };
          });
          set((s) => ({
            workOrders: [...created, ...s.workOrders],
            profiles: s.profiles.map((p) => (due.some((d) => d.id === p.id) ? { ...p, generated: [...p.generated, ym] } : p)),
          }));
          return created.map((w) => w.id);
        },
        setSettings: (settings) => { applySettings(settings); set({ settings }); },
      };
    },
    {
      name: "plenum-demo-v1",
      // Older saved states lack newer collections — fill them from seed.
      merge: (persisted, current) => ({ ...current, ...(persisted as object), ...(!(persisted as State)?.profiles ? { profiles: current.profiles } : {}), ...(!(persisted as State)?.settings ? { settings: current.settings } : {}) }),
      onRehydrateStorage: () => (st) => applySettings(st?.settings),
    },
  ),
);

/** Avoid SSR/localStorage mismatch: render data views only after hydration. */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export function useLookups() {
  const s = useStore();
  return {
    person: (id?: number) => s.people.find((p) => p.id === id),
    org: (id?: number) => s.orgs.find((o) => o.id === id),
    building: (id?: number) => s.buildings.find((b) => b.id === id),
    contract: (id?: number) => s.contracts.find((c) => c.id === id),
    equip: (id?: number) => s.equipment.find((e) => e.id === id),
    wo: (id?: number) => s.workOrders.find((w) => w.id === id),
  };
}

// Keep calculation settings in sync whenever state is replaced (e.g. API pull).
useStore.subscribe((s, prev) => { if (s.settings !== prev.settings) applySettings(s.settings); });
