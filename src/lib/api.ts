"use client";
import { create } from "zustand";
import { useStore, type Persona } from "./store";
import type { Invoice, MaintProfile, WorkOrder } from "./types";

/** When unset, the app runs in local demo mode (localStorage only). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
export const apiEnabled = !!API_URL;

const TOKEN_KEY = "plenum-token";
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const setToken = (t: string | null) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch {} };

export type Role = Persona | "customer";
export const storedUser = (): { email: string; role: Role } | null => { try { return JSON.parse(localStorage.getItem("plenum-user") ?? "null"); } catch { return null; } };

interface SyncState {
  ready: boolean; pending: number; error: string | null; user: { email: string; role: Role } | null;
  set: (p: Partial<SyncState>) => void;
}
export const useSync = create<SyncState>()((set) => ({ ready: !apiEnabled, pending: 0, error: null, user: null, set: (p) => set(p) }));

class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API_URL + path, {
    ...init,
    headers: { "content-type": "application/json", ...(getToken() ? { authorization: `Bearer ${getToken()}` } : {}), ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? `HTTP ${res.status}`);
  return body as T;
}

export async function login(email: string, password: string) {
  const r = await call<{ token: string; user: { email: string; role: Role } }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  setToken(r.token);
  try { localStorage.setItem("plenum-user", JSON.stringify(r.user)); } catch {}
  useSync.getState().set({ user: r.user });
  return r.user;
}

export function logout() {
  setToken(null);
  try { localStorage.removeItem("plenum-user"); } catch {}
  useSync.getState().set({ user: null, ready: false });
  window.location.href = "/login";
}

let applying = false;

export async function pull() {
  const data = await call<Record<string, unknown>>("/api/bootstrap");
  const user = useSync.getState().user ?? storedUser();
  applying = true;
  useStore.setState({ priceBook: [], profiles: [], notices: [], timeOff: [], ...(data as object), ...(user && user.role !== "customer" ? { persona: user.role } : {}) });
  applying = false;
  useSync.getState().set({ ready: true, user });
}

export async function resetRemote() {
  await call("/api/admin/reset", { method: "POST" });
  await pull();
}

export interface UserRow { id: number; email: string; role: Role; person_id: number; org_id: number | null }
export interface PortalData {
  org: { id: number; name: string }; gst: number;
  quotes: { id: number; status: "Sent" | "Approved" | "Declined"; sentAt?: string; building: string; address: string; request: string; recommended?: string; equipment: string[]; estimate: boolean; lines: { description: string; amount: number }[]; subtotal: number }[];
  requests: { id: number; building: string; at: string; request: string; status: string; scheduled?: string }[];
  buildings: { id: number; name: string; address: string }[];
  reports: { id: number; building: string; address: string; completedAt: string; request: string; workPerformed: string; techs: string[]; equipment: string[]; hours: number; files?: { id: number; name: string; mime: string }[] }[];
  invoices: { id: number; woId: number; date: string; status: "Sent" | "Paid"; building: string; po?: string; progress: boolean; lines: { kind: string; description: string; amount: number }[]; subtotal: number }[];
}
export const portal = {
  get: (org?: number) => call<PortalData>(`/api/portal${org ? `?org=${org}` : ""}`),
  request: (r: { buildingId: number; description: string; urgency: string; preferred: string; name: string; phone: string }) =>
    call<{ id: number }>("/api/portal/requests", { method: "POST", body: JSON.stringify(r) }),
  decide: (id: number, decision: "approve" | "decline", name: string, comment: string) =>
    call(`/api/portal/quotes/${id}/decision`, { method: "POST", body: JSON.stringify({ decision, name, comment }) }),
};

export const users = {
  list: () => call<UserRow[]>("/api/users"),
  create: (u: { email: string; password: string; personId: number; role: Role; orgId?: number }) => call<UserRow>("/api/users", { method: "POST", body: JSON.stringify(u) }),
  update: (id: number, patch: { role?: Role; password?: string }) => call<UserRow>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  remove: (id: number) => call(`/api/users/${id}`, { method: "DELETE" }),
  changeMine: (current: string, next: string) => call("/api/me/password", { method: "POST", body: JSON.stringify({ current, next }) }),
};

async function push(kind: "work-orders" | "invoices" | "profiles" | "settings" | "price" | `records/${"org" | "building" | "equipment" | "contact"}` | "simple/notices" | "simple/timeoff", item: WorkOrder | Invoice | MaintProfile | object, id?: number) {
  const s = useSync.getState();
  s.set({ pending: s.pending + 1 });
  try {
    await call(kind === "settings" ? "/api/settings" : `/api/${kind}/${id}`, { method: "PUT", body: JSON.stringify(item) });
  } catch (e) {
    const err = e as ApiError;
    if (err.status === 401) return logout();
    await pull().catch(() => {}); // server is the source of truth — roll back the optimistic change
    useSync.getState().set({ error: err.message });
  } finally {
    const n = useSync.getState().pending;
    useSync.getState().set({ pending: Math.max(0, n - 1) });
  }
}

let started = false;
/** Start syncing the local store with the API: initial pull, push on change, poll every 30 s. */
export function startSync(onAuthRequired: () => void) {
  if (!apiEnabled || started) return;
  if (!getToken()) { onAuthRequired(); return; }
  if (storedUser()?.role === "customer") { useSync.getState().set({ ready: true, user: storedUser() }); return; }
  started = true;
  pull().catch((e: ApiError) => { started = false; if (e.status === 401) logout(); else useSync.getState().set({ error: e.message }); });

  useStore.subscribe((next, prev) => {
    if (applying || !useSync.getState().ready) return;
    const diff = <T extends { id: number }>(a: T[], b: T[]) => { const m = new Map(b.map((x) => [x.id, x])); return a.filter((x) => m.get(x.id) !== x); };
    for (const w of diff(next.workOrders, prev.workOrders)) push("work-orders", w, w.id);
    for (const i of diff(next.invoices, prev.invoices)) push("invoices", i, i.id);
    for (const p of diff(next.profiles, prev.profiles)) push("profiles", p, p.id);
    if (next.settings !== prev.settings) push("settings", next.settings);
    for (const p of diff(next.priceBook, prev.priceBook)) push("price", p, p.id);
    for (const o of diff(next.orgs, prev.orgs)) push("records/org", o, o.id);
    for (const b of diff(next.buildings, prev.buildings)) push("records/building", b, b.id);
    for (const e of diff(next.equipment, prev.equipment)) push("records/equipment", e, e.id);
    for (const p of diff(next.people, prev.people)) if (p.kind === "contact") push("records/contact", p, p.id);
    for (const n of diff(next.notices, prev.notices)) push("simple/notices", n, n.id);
    for (const n of prev.notices) if (!next.notices.some((x) => x.id === n.id)) call(`/api/simple/notices/${n.id}`, { method: "DELETE" }).catch((e) => useSync.getState().set({ error: e.message }));
    for (const t of diff(next.timeOff, prev.timeOff)) push("simple/timeoff", t, t.id);
    for (const t of prev.timeOff) if (!next.timeOff.some((x) => x.id === t.id)) call(`/api/simple/timeoff/${t.id}`, { method: "DELETE" }).catch((e) => useSync.getState().set({ error: e.message }));
    for (const p of prev.priceBook) if (!next.priceBook.some((x) => x.id === p.id)) call(`/api/price/${p.id}`, { method: "DELETE" }).catch((e) => useSync.getState().set({ error: e.message }));
  });

  setInterval(() => {
    if (document.visibilityState === "visible" && useSync.getState().pending === 0) pull().catch(() => {});
  }, 30000);
}

// ---- Files (photos / PDFs)
export interface FileRow { id: number; wo_id: number; name: string; mime: string; size: number; public: boolean; created_at: string; uploaded_by: string | null }

/** Downscale photos on the device so uploads stay fast on mobile data (max 1600 px, JPEG 0.82). */
async function prepare(file: File): Promise<{ name: string; mime: string; data: string }> {
  const toB64 = (b: Blob) => new Promise<string>((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = bad; r.readAsDataURL(b); });
  if (!file.type.startsWith("image/") || file.type === "image/heic") return { name: file.name, mime: file.type || "application/octet-stream", data: await toB64(file) };
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob = await new Promise((ok) => c.toBlob((b) => ok(b!), "image/jpeg", 0.82));
  return { name: file.name.replace(/\.[^.]+$/, "") + ".jpg", mime: "image/jpeg", data: await toB64(blob) };
}

const blobCache = new Map<string, string>();
export const files = {
  list: (woId: number) => call<FileRow[]>(`/api/work-orders/${woId}/files`),
  upload: async (woId: number, f: File, isPublic: boolean) => {
    const body = await prepare(f);
    return call<{ id: number }>(`/api/work-orders/${woId}/files`, { method: "POST", body: JSON.stringify({ ...body, public: isPublic }) });
  },
  setPublic: (id: number, pub: boolean) => call(`/api/files/${id}`, { method: "PATCH", body: JSON.stringify({ public: pub }) }),
  remove: (id: number) => call(`/api/files/${id}`, { method: "DELETE" }),
  /** Object URL for an authenticated download (img src can't send headers). */
  url: async (id: number, portalScope = false) => {
    const key = `${portalScope ? "p" : "s"}${id}`;
    if (blobCache.has(key)) return blobCache.get(key)!;
    const res = await fetch(`${API_URL}/api/${portalScope ? "portal/files" : "files"}/${id}`, { headers: { authorization: `Bearer ${getToken()}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const u = URL.createObjectURL(await res.blob());
    blobCache.set(key, u);
    return u;
  },
};

export const importItems = (kind: string, items: { id: number }[]) =>
  call<{ count: number }>("/api/import", { method: "POST", body: JSON.stringify({ kind, items }) });

export interface AuditRow { id: number; at: string; user_id: number | null; kind: string; entity_id: number; action: string; email: string | null }
export const auditLog = () => call<AuditRow[]>("/api/audit");
