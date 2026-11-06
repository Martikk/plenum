"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  LayoutDashboard, CalendarRange, ClipboardList, FileText, Receipt, ScrollText, Building2, Search, Plus,
  Sun, Moon, Monitor, RotateCcw, ChevronDown, Smartphone, CalendarClock, Settings as SettingsIcon, Globe, BarChart3, Tags,
} from "lucide-react";
import { PERSONAS, useHydrated, useStore, type Persona } from "@/lib/store";
import { deriveStatus } from "@/lib/logic";
import { Avatar } from "./ui";
import { Notifications } from "./notifications";
import { apiEnabled, logout, resetRemote, startSync, useSync } from "@/lib/api";
import { LogOut, CloudOff, Cloud, X } from "lucide-react";

export function Logo({ size = 26 }: { size?: number }) {
  // Plenum: a chamber where many ducts meet — three flows converging into one outlet.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--primary)" />
      <path d="M7 10h9.5a5.5 5.5 0 0 1 0 11H7" stroke="var(--primary-fg)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M7 15.5h13" stroke="var(--primary-fg)" strokeWidth="2.6" strokeLinecap="round" opacity=".7" />
      <path d="M22 15.5h3" stroke="var(--primary-fg)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

const NAV = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/my", label: "My jobs", icon: Smartphone },
  { href: "/dispatch", label: "Dispatch", icon: CalendarRange },
  { href: "/work-orders", label: "Work orders", icon: ClipboardList },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/contracts", label: "Contracts", icon: ScrollText },
  { href: "/buildings", label: "Buildings", icon: Building2 },
  { href: "/maintenance", label: "Maintenance", icon: CalendarClock },
  { href: "/pricebook", label: "Price book", icon: Tags },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
  { href: "/portal", label: "Customer portal", icon: Globe },
];

function useCounts() {
  const { workOrders, invoices } = useStore();
  return useMemo(() => ({
    "/dispatch": workOrders.filter((w) => w.kind === "WO" && deriveStatus(w) === "Unassigned").length,
    "/quotes": workOrders.filter((w) => w.kind === "QO" && w.quoteStatus === "Pricing").length,
    "/invoices": invoices.filter((i) => i.status === "Review Reqd").length,
  } as Record<string, number>), [workOrders, invoices]);
}

function ThemeToggle() {
  const [mode, setMode] = useState<"system" | "light" | "dark">("system");
  useEffect(() => {
    try { const m = localStorage.getItem("plenum-theme") as typeof mode | null; if (m) setMode(m); } catch {}
  }, []);
  useEffect(() => {
    const el = document.documentElement;
    if (mode === "system") el.removeAttribute("data-theme"); else el.setAttribute("data-theme", mode);
    try { localStorage.setItem("plenum-theme", mode); } catch {}
  }, [mode]);
  const next = { system: "light", light: "dark", dark: "system" } as const;
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  return (
    <button className="btn btn-ghost !px-2" title={`Theme: ${mode}`} onClick={() => setMode(next[mode])}>
      <Icon size={16} />
    </button>
  );
}

function PersonaSwitch() {
  const { persona, setPersona, people } = useStore();
  const [open, setOpen] = useState(false);
  const p = people.find((x) => x.id === PERSONAS[persona]?.personId);
  return (
    <div className="relative">
      <button className="btn btn-ghost !h-9 !pl-1.5" onClick={() => setOpen(!open)}>
        {p && <Avatar initials={p.initials} size={26} />}
        <span className="text-left leading-tight hidden sm:block">
          <span className="block text-[13px] font-semibold">{p?.name}</span>
          <span className="block text-[11.5px] text-ink-3">{PERSONAS[persona]?.label}</span>
        </span>
        <ChevronDown size={14} className="text-ink-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-72 card shadow-pop z-50 p-1">
            <div className="px-3 py-2 label">View as (demo)</div>
            {apiEnabled ? (
              <div className="px-3 pb-2 text-[13px] text-ink-2">Signed in as {useSync.getState().user?.email ?? "—"}</div>
            ) : (Object.keys(PERSONAS) as Persona[]).map((k) => (
              <button key={k} onClick={() => { setPersona(k); setOpen(false); }}
                className={clsx("w-full text-left px-3 py-2 rounded-md hover:bg-sunken", persona === k && "bg-primary-soft")}>
                <div className="font-medium">{PERSONAS[k].label}</div>
                <div className="text-[12px] text-ink-3">{PERSONAS[k].blurb}</div>
              </button>
            ))}
            <div className="border-t border-line mt-1 pt-1">
              {(!apiEnabled || persona === "manager" || persona === "ceo") && (
                <button className="w-full text-left px-3 py-2 rounded-md hover:bg-sunken text-ink-2 inline-flex items-center gap-2"
                  onClick={() => { if (apiEnabled) { if (confirm("Reset shared demo data for everyone?")) resetRemote(); } else useStore.getState().reset(); setOpen(false); }}>
                  <RotateCcw size={14} /> Reset demo data
                </button>
              )}
              {apiEnabled && (
                <button className="w-full text-left px-3 py-2 rounded-md hover:bg-sunken text-ink-2 inline-flex items-center gap-2" onClick={logout}>
                  <LogOut size={14} /> Sign out
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { workOrders, buildings, contracts, orgs } = useStore();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => inputRef.current?.focus(), 10); } }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const out: { href: string; title: string; sub: string; kind: string }[] = [];
    for (const w of workOrders) {
      const b = buildings.find((b) => b.id === w.buildingId);
      const hay = `${w.id} ${w.name} ${w.customerRequest} ${b?.address} ${b?.name} ${w.po ?? ""}`.toLowerCase();
      if (hay.includes(s)) out.push({ href: `/work-orders/view?id=${w.id}`, title: `${w.id} · ${b?.name}`, sub: w.customerRequest, kind: w.kind === "QO" ? "Quote" : "WO" });
    }
    for (const b of buildings) if (`${b.name} ${b.address} ${b.city}`.toLowerCase().includes(s)) out.push({ href: `/buildings#b${b.id}`, title: b.name, sub: `${b.address}, ${b.city}`, kind: "Building" });
    for (const c of contracts) {
      const o = orgs.find((o) => o.id === c.orgId);
      if (`${c.id} ${c.type} ${c.serviceType} ${o?.name}`.toLowerCase().includes(s)) out.push({ href: `/contracts/view?id=${c.id}`, title: `${c.type}-${c.serviceType} | ${o?.name}`, sub: `Contract ${c.id}`, kind: "Contract" });
    }
    return out.slice(0, 12);
  }, [q, workOrders, buildings, contracts, orgs]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 w-full min-w-0 max-w-md px-3 rounded-lg border border-line bg-raised text-ink-3 hover:border-line-strong">
        <Search size={15} />
        <span className="flex-1 text-left truncate whitespace-nowrap"><span className="sm:hidden">Search</span><span className="hidden sm:inline">Search WO #, address, PO, contract…</span></span>
        <span className="kbd hidden sm:inline">⌘K</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-[12vh] px-4" onClick={() => setOpen(false)}>
          <div className="card shadow-pop w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 border-b border-line">
              <Search size={16} className="text-ink-3" />
              <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
                  if (e.key === "Enter" && results[idx]) go(results[idx].href);
                }}
                placeholder="Type a WO number, building, address, PO…" className="flex-1 h-12 bg-transparent outline-none focus-visible:outline-none text-[15px]" />
              <span className="kbd">esc</span>
            </div>
            <div className="max-h-[50vh] overflow-auto p-1">
              {q && results.length === 0 && <div className="p-6 text-center text-ink-3">No matches</div>}
              {!q && <div className="p-4 text-ink-3 text-[13px]">One box instead of a 40-field search form. Matches IDs, names, addresses, PO numbers and request text.</div>}
              {results.map((r, i) => (
                <button key={r.href + i} onMouseEnter={() => setIdx(i)} onClick={() => go(r.href)}
                  className={clsx("w-full text-left px-3 py-2 rounded-md flex gap-3 items-start", i === idx && "bg-primary-soft")}>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3 w-20 shrink-0 pt-0.5">{r.kind}</span>
                  <span className="min-w-0">
                    <span className="block font-medium truncate">{r.title}</span>
                    <span className="block text-[12.5px] text-ink-3 truncate">{r.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const hydrated = useHydrated();
  const counts = useCounts();
  const [woId, setWoId] = useState<string | null>(null);
  useEffect(() => { setWoId(path === "/work-orders/view" ? new URLSearchParams(window.location.search).get("id") : null); });
  const isQuotePath = !!woId && useStore.getState().workOrders.find((w) => w.id === Number(woId))?.kind === "QO";
  const router = useRouter();
  const sync = useSync();
  const isLogin = path === "/login";
  useEffect(() => { if (hydrated && !isLogin) startSync(() => router.replace("/login")); }, [hydrated, isLogin, router]);
  const ready = hydrated && (isLogin || sync.ready);
  const isCustomer = sync.user?.role === "customer";
  useEffect(() => { if (isCustomer && path !== "/portal" && path !== "/login") router.replace("/portal"); }, [isCustomer, path, router]);
  if (path === "/print" || path === "/portal" || isCustomer) return ready ? <>{children}</> : <div className="p-6 text-ink-3">Loading…</div>;
  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-line bg-surface sticky top-0 h-screen">
        <Link href="/" className="flex items-center gap-2.5 px-4 h-14 border-b border-line">
          <Logo />
          <span className="text-[17px] font-semibold tracking-tight">Plenum</span>
        </Link>
        <nav className="p-2 flex-1 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href) || (href === "/quotes" && isQuotePath) || false;
            const suppress = href === "/work-orders" && isQuotePath;
            const c = hydrated ? counts[href] : undefined;
            return (
              <Link key={href} href={href}
                className={clsx("flex items-center gap-2.5 h-9 px-3 rounded-md font-medium",
                  active && !suppress ? "bg-primary-soft text-primary" : "text-ink-2 hover:bg-sunken hover:text-ink")}>
                <Icon size={17} strokeWidth={active && !suppress ? 2.2 : 1.8} />
                <span className="flex-1">{label}</span>
                {!!c && <span className="num text-[11.5px] font-semibold rounded-full px-1.5 min-w-5 text-center"
                  style={{ background: "var(--s-responding-bg)", color: "var(--s-responding)" }}>{c}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 text-[11.5px] text-ink-3 border-t border-line inline-flex items-center gap-1.5">
          {apiEnabled ? <><Cloud size={13} />{sync.pending ? "Saving…" : "Synced"} · fictional data</> : <><CloudOff size={13} />Local demo · fictional data</>}
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-line flex items-center gap-3 px-4">
          <Link href="/" className="md:hidden"><Logo /></Link>
          <CommandSearch />
          <div className="flex-1" />
          <Link href="/quotes/new" className="btn btn-primary !px-2.5 sm:!px-3" aria-label="New quote"><Plus size={16} /><span className="hidden sm:inline">New quote</span></Link>
          {hydrated && <Notifications />}
          <ThemeToggle />
          {hydrated && <PersonaSwitch />}
        </header>
        <nav className="md:hidden flex gap-1 overflow-x-auto px-2 py-1.5 border-b border-line bg-surface">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className={clsx("px-3 h-8 inline-flex items-center rounded-md whitespace-nowrap text-[13px] font-medium",
              (href === "/" ? path === "/" : path.startsWith(href)) ? "bg-primary-soft text-primary" : "text-ink-2")}>{label}</Link>
          ))}
        </nav>
        <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">{ready ? children : <div className="text-ink-3">Loading…</div>}</main>
        {sync.error && (
          <div className="fixed bottom-5 right-5 z-50 card shadow-pop px-4 py-3 flex items-start gap-2 max-w-md" style={{ background: "var(--danger-bg)", color: "var(--danger)", borderColor: "var(--danger)" }}>
            <span className="font-medium flex-1">{sync.error}</span>
            <button aria-label="Dismiss" onClick={() => sync.set({ error: null })}><X size={15} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
