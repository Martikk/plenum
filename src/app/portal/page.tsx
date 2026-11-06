"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Wrench, Plus, ThumbsUp, ThumbsDown, Printer, LogOut, FileText, ClipboardCheck, Receipt, ArrowLeft, Check } from "lucide-react";
import { apiEnabled, logout, portal, storedUser, type PortalData } from "@/lib/api";
import { useStore } from "@/lib/store";
import { fmtDate, money2 } from "@/lib/logic";
import { Logo } from "@/components/shell";
import { Empty } from "@/components/ui";
import { Thumb } from "@/components/files";

type Tab = "requests" | "quotes" | "reports" | "invoices";

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className="text-[12px] font-medium rounded-full px-2 py-0.5" style={{ color: `var(--s-${tone})`, background: `var(--s-${tone}-bg)` }}>{children}</span>;
}

function PrintBtn({ id }: { id: string }) {
  return (
    <button className="btn btn-sm no-print" onClick={() => {
      const el = document.getElementById(id); if (!el) return;
      el.classList.add("print-target"); document.body.classList.add("print-one");
      window.print();
      el.classList.remove("print-target"); document.body.classList.remove("print-one");
    }}><Printer size={13} />Print / PDF</button>
  );
}

function Totals({ sub, gst }: { sub: number; gst: number }) {
  return (
    <div className="flex justify-end"><table className="num text-[13.5px] w-60"><tbody>
      <tr><td className="text-ink-2 py-0.5">Subtotal</td><td className="text-right">{money2(sub)}</td></tr>
      <tr><td className="text-ink-2 py-0.5">GST {(gst * 100).toFixed(0)}%</td><td className="text-right">{money2(sub * gst)}</td></tr>
      <tr className="font-semibold border-t border-line"><td className="py-1">Total CAD</td><td className="text-right">{money2(sub * (1 + gst))}</td></tr>
    </tbody></table></div>
  );
}

function QuoteCard({ q, gst, canDecide, onDone }: { q: PortalData["quotes"][number]; gst: number; canDecide: boolean; onDone: () => void }) {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const decide = async (d: "approve" | "decline") => {
    setBusy(true); setErr(null);
    try { await portal.decide(q.id, d, name, comment); onDone(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const tone = q.status === "Sent" ? "responding" : q.status === "Approved" ? "complete" : "declined";
  return (
    <article id={`q${q.id}`} className="card p-5 bg-surface">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2"><span className="num text-ink-3">Quote #{q.id}</span><Pill tone={tone}>{q.status === "Sent" ? "Awaiting your decision" : q.status}</Pill></div>
          <h3 className="text-[17px] font-semibold mt-1">{q.building}</h3>
          <div className="text-ink-2 text-[13px]">{q.address}{q.sentAt ? ` · sent ${fmtDate(q.sentAt)}` : ""}</div>
        </div>
        <PrintBtn id={`q${q.id}`} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4 my-4 text-[13.5px]">
        <div><div className="label mb-0.5">Your request</div>{q.request}</div>
        {q.recommended && <div><div className="label mb-0.5">What we recommend</div>{q.recommended}</div>}
      </div>
      {q.equipment.length > 0 && <p className="text-[13px] text-ink-2 mb-3">Equipment: {q.equipment.join(", ")}</p>}
      <table className="w-full text-[13.5px] mb-2"><tbody>
        {q.lines.map((l, i) => <tr key={i} className="border-b border-line"><td className="py-1.5">{l.description}</td><td className="text-right num">{money2(l.amount)}</td></tr>)}
      </tbody></table>
      <Totals sub={q.subtotal} gst={gst} />
      <p className="text-[12px] text-ink-3 mt-2">{q.estimate ? "Estimate: final price based on time and materials." : "Firm price for the scope above."} Valid 30 days.</p>
      {q.status === "Sent" && canDecide && (
        <div className="mt-4 pt-4 border-t border-line grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end no-print">
          <label><span className="label">Your full name</span><input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
          <label><span className="label">Comment (optional)</span><input className="field mt-1" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. access via loading dock" /></label>
          <div className="flex gap-2">
            <button className="btn" disabled={busy || name.trim().length < 2} onClick={() => decide("decline")}><ThumbsDown size={15} />Decline</button>
            <button className="btn btn-primary" disabled={busy || name.trim().length < 2} onClick={() => decide("approve")}><ThumbsUp size={15} />Approve</button>
          </div>
          {err && <p className="sm:col-span-3 text-[13px]" style={{ color: "var(--danger)" }}>{err}</p>}
          <p className="sm:col-span-3 text-[12px] text-ink-3">Typing your name and pressing Approve authorizes the work at the price above. You can also reply by email or phone.</p>
        </div>
      )}
    </article>
  );
}

export default function Portal() {
  const user = storedUser();
  const isCustomer = user?.role === "customer";
  const { orgs } = useStore();
  const [org, setOrg] = useState<number | undefined>(isCustomer ? undefined : 5);
  const [data, setData] = useState<PortalData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("quotes");
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(() => { portal.get(isCustomer ? undefined : org).then(setData).catch((e) => setErr(e.message)); }, [isCustomer, org]);
  useEffect(() => { if (apiEnabled) load(); }, [load]);

  if (!apiEnabled) return <div className="p-8"><Empty>The customer portal needs the API backend (set NEXT_PUBLIC_API_URL).</Empty></div>;

  const pending = data?.quotes.filter((q) => q.status === "Sent").length ?? 0;
  const tabs: [Tab, string, React.ReactNode, number][] = [
    ["requests", "Service requests", <Wrench key="i" size={16} />, data?.requests.length ?? 0],
    ["quotes", "Quotes", <FileText key="i" size={16} />, data?.quotes.length ?? 0],
    ["reports", "Service reports", <ClipboardCheck key="i" size={16} />, data?.reports.length ?? 0],
    ["invoices", "Invoices", <Receipt key="i" size={16} />, data?.invoices.length ?? 0],
  ];

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-surface border-b border-line no-print">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Logo size={26} /><span className="font-semibold">Plenum Demo Mechanical</span><span className="text-ink-3 hidden sm:inline">· Customer portal</span>
          <div className="flex-1" />
          {isCustomer ? <button className="btn btn-ghost" onClick={logout}><LogOut size={15} />Sign out</button>
            : <Link href="/" className="btn btn-ghost"><ArrowLeft size={15} />Back to Plenum</Link>}
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {!isCustomer && (
          <div className="card p-3 flex items-center gap-3 text-[13px] no-print" style={{ background: "var(--s-posted-bg)" }}>
            <span className="font-medium" style={{ color: "var(--s-posted)" }}>Staff preview</span>
            <select className="field !w-auto" value={org} onChange={(e) => setOrg(Number(e.target.value))}>{orgs.filter((o) => o.category !== "Subtrade").map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
            <span className="text-ink-2">Exactly what this customer sees. Only customers can approve.</span>
          </div>
        )}
        {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
        {data && (
          <>
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight">{data.org.name}</h1>
              <p className="text-ink-2">{pending ? `${pending} quote${pending > 1 ? "s" : ""} waiting for your decision.` : "Nothing waiting for you right now."}</p>
            </div>
            {flash && <div className="card p-3 flex items-center gap-2" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}><Check size={16} />{flash}</div>}
            <nav className="flex gap-1 border-b border-line no-print">
              {tabs.map(([k, l, i, n]) => (
                <button key={k} onClick={() => setTab(k)} className={clsx("px-3 h-10 -mb-px border-b-2 font-medium inline-flex items-center gap-1.5", tab === k ? "border-primary text-primary" : "border-transparent text-ink-2")}>
                  {i}{l}<span className="num text-[12px] text-ink-3">{n}</span>
                </button>
              ))}
            </nav>
            {tab === "requests" && data && <Requests data={data} canRequest={isCustomer} onDone={(id) => { setFlash(`Request #${id} received. Our dispatcher will confirm a time.`); load(); }} />}
            {tab === "quotes" && (data.quotes.length ? data.quotes.map((q) => <QuoteCard key={q.id} q={q} gst={data.gst} canDecide={isCustomer} onDone={() => { setFlash(`Thanks — your decision on quote #${q.id} was sent to our office.`); load(); }} />) : <Empty>No quotes.</Empty>)}
            {tab === "reports" && (data.reports.length ? data.reports.map((r) => (
              <article key={r.id} id={`r${r.id}`} className="card p-5 bg-surface">
                <div className="flex items-start gap-3">
                  <div className="flex-1"><div className="num text-ink-3">Service report · WO #{r.id}</div><h3 className="text-[17px] font-semibold mt-0.5">{r.building}</h3><div className="text-ink-2 text-[13px]">{r.address} · completed {fmtDate(r.completedAt)}</div></div>
                  <PrintBtn id={`r${r.id}`} />
                </div>
                <div className="mt-3 text-[13.5px] space-y-2">
                  <div><span className="label">Request · </span>{r.request}</div>
                  <div><div className="label mb-0.5">Work performed</div><p className="whitespace-pre-wrap">{r.workPerformed}</p></div>
                  {r.files && r.files.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{r.files.map((f) => <Thumb key={f.id} id={f.id} mime={f.mime} name={f.name} portal className="w-full aspect-square" />)}</div>}
                  <div className="text-ink-2 text-[13px]">{r.techs.length ? `Technician${r.techs.length > 1 ? "s" : ""}: ${r.techs.join(", ")} · ` : ""}{r.hours ? `${r.hours.toFixed(1)} h on site` : ""}{r.equipment.length ? ` · ${r.equipment.join(", ")}` : ""}</div>
                </div>
              </article>
            )) : <Empty>No completed work yet.</Empty>)}
            {tab === "invoices" && (data.invoices.length ? data.invoices.map((i) => (
              <article key={i.id} id={`i${i.id}`} className="card p-5 bg-surface">
                <div className="flex items-start gap-3">
                  <div className="flex-1"><div className="flex items-center gap-2"><span className="num text-ink-3">{i.progress ? "Progress invoice" : "Invoice"} #{i.id}</span><Pill tone={i.status === "Paid" ? "complete" : "assigned"}>{i.status === "Paid" ? "Paid" : "Due"}</Pill></div>
                    <h3 className="text-[17px] font-semibold mt-0.5">{i.building}</h3><div className="text-ink-2 text-[13px]">{fmtDate(i.date)} · WO #{i.woId}{i.po ? ` · PO ${i.po}` : ""}</div></div>
                  <PrintBtn id={`i${i.id}`} />
                </div>
                <table className="w-full text-[13.5px] my-3"><tbody>{i.lines.map((l, k) => <tr key={k} className="border-b border-line"><td className="py-1.5 pr-3 text-ink-2">{l.kind}</td><td>{l.description}</td><td className="text-right num">{money2(l.amount)}</td></tr>)}</tbody></table>
                <Totals sub={i.subtotal} gst={data.gst} />
              </article>
            )) : <Empty>No invoices.</Empty>)}
          </>
        )}
      </main>
    </div>
  );
}

function Requests({ data, canRequest, onDone }: { data: PortalData; canRequest: boolean; onDone: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ buildingId: data.buildings[0]?.id ?? 0, description: "", urgency: "Medium", preferred: "", name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setErr(null);
    try { const r = await portal.request(f); setOpen(false); setF({ ...f, description: "", preferred: "" }); onDone(r.id); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const tone = (st: string) => st === "Completed" ? "complete" : st === "Technician on the way" ? "responding" : st === "Scheduled" ? "assigned" : st === "Follow-up needed" ? "incomplete" : "holding";
  return (
    <div className="space-y-3">
      {canRequest && !open && <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={15} />Request service</button>}
      {open && (
        <div className="card p-5 bg-surface grid sm:grid-cols-2 gap-3">
          <label className="sm:col-span-2"><span className="label">Building</span>
            <select className="field mt-1" value={f.buildingId} onChange={(e) => setF({ ...f, buildingId: Number(e.target.value) })}>{data.buildings.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.address}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="label">What's the problem?</span>
            <textarea className="field mt-1" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="e.g. No heat on floors 3–5 since this morning; boiler room alarm is on" /></label>
          <label><span className="label">How urgent?</span>
            <select className="field mt-1" value={f.urgency} onChange={(e) => setF({ ...f, urgency: e.target.value })}>
              <option value="High">Urgent: no heat, no water, leak</option><option value="Medium">Soon: this week</option><option value="Low">Whenever convenient</option></select></label>
          <label><span className="label">Preferred time / access</span><input className="field mt-1" value={f.preferred} onChange={(e) => setF({ ...f, preferred: e.target.value })} placeholder="e.g. weekdays after 9, concierge has keys" /></label>
          <label><span className="label">Your name</span><input className="field mt-1" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label><span className="label">Phone for the technician</span><input className="field mt-1" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          {err && <p className="sm:col-span-2 text-[13px]" style={{ color: "var(--danger)" }}>{err}</p>}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy || f.description.trim().length < 5 || f.name.trim().length < 2} onClick={submit}>{busy ? "Sending…" : "Send request"}</button>
          </div>
          <p className="sm:col-span-2 text-[12px] text-ink-3">For emergencies (flooding, gas smell) call us as well.</p>
        </div>
      )}
      {data.requests.length === 0 ? <Empty>No requests yet.</Empty> : data.requests.map((r) => (
        <article key={r.id} className="card p-4 bg-surface flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2"><span className="num text-ink-3">#{r.id}</span><Pill tone={tone(r.status)}>{r.status}</Pill></div>
            <div className="font-semibold mt-0.5">{r.building}</div>
            <p className="text-ink-2 text-[13.5px]">{r.request}</p>
          </div>
          <div className="text-right text-[12.5px] text-ink-3 num">{fmtDate(r.at)}{r.scheduled && <div className="text-ink-2">visit {new Date(r.scheduled).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</div>}</div>
        </article>
      ))}
    </div>
  );
}
