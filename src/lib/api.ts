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

interface SyncState {
  ready: boolean; pending: number; error: string | null; user: { email: string; role: Persona } | null;
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
  const r = await call<{ token: string; user: { email: string; role: Persona } }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
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
  let user = useSync.getState().user;
  if (!user) { try { user = JSON.parse(localStorage.getItem("plenum-user") ?? "null"); } catch {} }
  applying = true;
  useStore.setState({ ...(data as object), ...(user ? { persona: user.role } : {}) });
  applying = false;
  useSync.getState().set({ ready: true, user });
}

export async function resetRemote() {
  await call("/api/admin/reset", { method: "POST" });
  await pull();
}

export interface UserRow { id: number; email: string; role: Persona; person_id: number }
export const users = {
  list: () => call<UserRow[]>("/api/users"),
  create: (u: { email: string; password: string; personId: number; role: Persona }) => call<UserRow>("/api/users", { method: "POST", body: JSON.stringify(u) }),
  update: (id: number, patch: { role?: Persona; password?: string }) => call<UserRow>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  remove: (id: number) => call(`/api/users/${id}`, { method: "DELETE" }),
  changeMine: (current: string, next: string) => call("/api/me/password", { method: "POST", body: JSON.stringify({ current, next }) }),
};

async function push(kind: "work-orders" | "invoices" | "profiles" | "settings", item: WorkOrder | Invoice | MaintProfile | object, id?: number) {
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
  started = true;
  pull().catch((e: ApiError) => { started = false; if (e.status === 401) logout(); else useSync.getState().set({ error: e.message }); });

  useStore.subscribe((next, prev) => {
    if (applying || !useSync.getState().ready) return;
    const diff = <T extends { id: number }>(a: T[], b: T[]) => { const m = new Map(b.map((x) => [x.id, x])); return a.filter((x) => m.get(x.id) !== x); };
    for (const w of diff(next.workOrders, prev.workOrders)) push("work-orders", w, w.id);
    for (const i of diff(next.invoices, prev.invoices)) push("invoices", i, i.id);
    for (const p of diff(next.profiles, prev.profiles)) push("profiles", p, p.id);
    if (next.settings !== prev.settings) push("settings", next.settings);
  });

  setInterval(() => {
    if (document.visibilityState === "visible" && useSync.getState().pending === 0) pull().catch(() => {});
  }, 30000);
}
