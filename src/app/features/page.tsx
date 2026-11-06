"use client";
import Link from "next/link";
import { ClipboardList, TrendingUp, Building2, CalendarClock, Receipt, Gauge, Smartphone, Globe, ShieldCheck, Check } from "lucide-react";
import { Logo } from "@/components/shell";

/** Public capabilities page. Lists only features that are implemented in this build. */
const SECTIONS: { icon: React.ReactNode; title: string; body: string; points: string[] }[] = [
  {
    icon: <ClipboardList size={20} />, title: "Everything starts with the work order",
    body: "Every job carries its building, contract, equipment, team, time, materials and billing. Your team sees the same record, so handoffs stop depending on phone calls and memory.",
    points: ["Quotes and work orders in one workflow", "Roles for technicians, coordinators and customer contacts", "Live status from the work happening on each job"],
  },
  {
    icon: <TrendingUp size={20} />, title: "Know the margin before the job is finished",
    body: "Track estimated and actual labour, materials and costs as work moves forward. Set a margin threshold that flags jobs needing attention before they become write-offs.",
    points: ["Estimate vs actual on every job", "Contract rates and markups applied automatically", "Price book fills material costs, so quotes don't go out unpriced", "Low-margin alerts for managers"],
  },
  {
    icon: <Building2 size={20} />, title: "Keep every building's history in reach",
    body: "Connect customers, buildings and equipment so your team can see what is installed, what has been done and what is due next.",
    points: ["Equipment records with location, make and model", "Full service history per unit, with the next planned maintenance", "Site access notes on every job"],
  },
  {
    icon: <CalendarClock size={20} />, title: "Plan maintenance before it becomes a service call",
    body: "Build recurring maintenance profiles, generate the month's work in one step and schedule it across your technicians.",
    points: ["Recurring maintenance plans by month", "Drag-and-drop dispatch board with skill checks", "Booked hours per technician at a glance"],
  },
  {
    icon: <Smartphone size={20} />, title: "Built for the technician's phone",
    body: "Technicians see today's jobs, site access and contacts, then update status, time, materials and photos from the field.",
    points: ["One-tap status: on my way, needs return, complete", "Quick time entry and materials from the price book", "Photos resized on the device for fast upload"],
  },
  {
    icon: <Globe size={20} />, title: "A customer portal your clients will use",
    body: "Customers approve quotes, read service reports with photos and download invoices, without calling the office.",
    points: ["Online quote approval with name and comment", "Service reports published when work is complete", "Costs and internal notes never leave the office"],
  },
  {
    icon: <Receipt size={20} />, title: "Get from completed work to paid invoice",
    body: "Move finished work into review and invoicing with fewer manual steps and fewer surprises.",
    points: ["Invoice status tracking from draft to paid", "Review queue with automatic pre-send checks", "Progress billing with holdback, and invoice PDFs"],
  },
  {
    icon: <Gauge size={20} />, title: "See what needs attention today",
    body: "Turn daily activity into a clear view of quotes, backlog, invoicing and margin.",
    points: ["Queues and notifications tailored to each role", "Quote pipeline and win rate", "Margin and workload reports that open the jobs behind the numbers"],
  },
  {
    icon: <ShieldCheck size={20} />, title: "Built to fit how your team works",
    body: "Consistent screens, fast search, role-based access and complete record history across the business.",
    points: ["One search box for work orders, buildings, POs and contracts", "Roles and permissions enforced on the server", "Activity log and history on every record", "Import from your current system's CSV exports"],
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-surface border-b border-line">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2.5">
          <Logo size={26} /><span className="text-[17px] font-semibold tracking-tight">Plenum</span>
          <div className="flex-1" />
          <Link href="/login" className="btn btn-ghost">Sign in</Link>
          <a href="mailto:hello@example.com?subject=Plenum%20walkthrough" className="btn btn-primary">Book a walkthrough</a>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12">
        <p className="label uppercase tracking-wide">Field service for commercial HVAC & plumbing</p>
        <h1 className="text-[34px] sm:text-[44px] leading-[1.08] font-semibold tracking-tight max-w-3xl mt-3">Run commercial mechanical service from one connected system.</h1>
        <p className="text-[17px] text-ink-2 max-w-2xl mt-4">Plenum gives service, maintenance and installation teams one place to manage customers, equipment, work orders, quotes, schedules and invoices, without losing the details between the field and the office.</p>
        <div className="flex flex-wrap gap-2 mt-6">
          <a href="mailto:hello@example.com?subject=Plenum%20walkthrough" className="btn btn-primary !h-10 !px-4">Book a walkthrough</a>
          <Link href="/login" className="btn !h-10 !px-4">Try the demo</Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <article key={s.title} className="card p-5">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-primary-soft text-primary">{s.icon}</span>
            <h2 className="text-[17px] font-semibold mt-3 leading-snug">{s.title}</h2>
            <p className="text-ink-2 mt-2">{s.body}</p>
            <ul className="mt-3 space-y-1.5">
              {s.points.map((p) => <li key={p} className="flex gap-2 text-[13.5px]"><Check size={15} className="mt-0.5 shrink-0" style={{ color: "var(--ok)" }} />{p}</li>)}
            </ul>
          </article>
        ))}
      </section>

      <section className="bg-surface border-t border-line">
        <div className="max-w-6xl mx-auto px-4 py-12 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <h2 className="text-[22px] font-semibold tracking-tight">See how Plenum fits your operation.</h2>
            <p className="text-ink-2 mt-1">Book a walkthrough with your current workflow.</p>
          </div>
          <a href="mailto:hello@example.com?subject=Plenum%20walkthrough" className="btn btn-primary !h-10 !px-4">Book a walkthrough</a>
        </div>
      </section>
      <footer className="max-w-6xl mx-auto px-4 py-6 text-[12.5px] text-ink-3">© {new Date().getFullYear()} Plenum · Made in Vancouver, BC</footer>
    </div>
  );
}
