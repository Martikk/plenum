# Plenum

Field-service app for HVAC and plumbing: dispatch, quotes, work orders, invoice review.
Built as a clean-room re-think of the GamePlanPro workflow used at Allied (see `docs/spec-notes.md`), following the **Option B, Middle Ground** dispatch model (May 2025 decision).

> Demo build: all data is fictional and stored in your browser (localStorage). Use "Reset demo data" in the user menu.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
```

## What's in it

| Screen | What it does |
|---|---|
| **Today** | Persona-specific queue (Dispatch / Service Coordinator / Senior Tech / Coordination Manager), KPI tiles, margin alerts, today's schedule |
| **Dispatch** | Resource timeline + backlog. Drag to schedule; required skills block the drop; senior techs can only book themselves; overlap conflicts are ringed red |
| **Work orders** | Quick-filter chips + text filter; status derived from role statuses; GP% meter |
| **Work order card** | Estimate-vs-actual economics strip, missing-cost warning, tabs: Overview, Roles, Materials, Time, Invoices, History |
| **Quotes** | Tech drafts → Coordinator prices → Sent (customer portal) → Approved → Convert to WO. Sending is blocked while any cost is missing |
| **New quote** | Tech-initiated form with exactly the fields from the business model doc, plus a pricing-alert timer |
| **Invoices** | Review queue with automatic pre-send checks; approve & send, request changes, ask CEO, request PO |
| **Contracts / Buildings** | Rates, markups, rules, default roles; sites, access notes, equipment |

Switch persona from the avatar menu (top right) to see each role's view.

## Stack
Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · Zustand (persisted) · lucide-react. No backend yet.

## Docs
- `docs/design-research.md`: name, colour and density decisions, with sources
- `docs/spec-notes.md`: what was observed in the GPP TEST system, and open questions

## Next steps (not built)
Postgres + auth (roles/permissions), customer portal, maintenance profiles → auto PM work orders, PDF quote/WO/invoice, accounting sync, mobile tech view.

## Backend mode
Set `NEXT_PUBLIC_API_URL` to the plenum-api URL at build time. The app then requires sign-in, loads data from the API, pushes every change back, and rolls back if the server rejects it. Without the variable it runs in local demo mode.

## Added
- **PDF documents**: quote, field report and invoice at `/print?doc=quote|wo|invoice&id=…`, via browser "Save as PDF".
- **My jobs** (`/my`): mobile screen for techs. One-tap status (on my way / need return / complete), work-performed notes, quick time entry, materials used.
- **Maintenance profiles** (`/maintenance`): recurring PM visits; "Generate" creates the month's PM work orders (non-billable on all-inclusive contracts) straight into the dispatch backlog.
- **Customer portal** (`/portal`): customers sign in and see sent quotes (approve or decline with their name), service reports as soon as work is Complete, and sent or paid invoices, each printable. Costs and internal notes never leave the server. Staff can preview any customer.
- **Photos & files**: techs take photos from the phone (resized on device), office uploads PDFs; "Public" photos show on the customer's service report.
- **Reports** (`/reports`): revenue, GP%, request→scheduled time, quote win rate, GP by contract type, quote pipeline, tech load this week, jobs below margin threshold; 30/90/365-day ranges.
- **Import** (`/import`): migrate from GamePlanPro CSV exports (organizations → buildings → equipment, contacts, contracts). Columns auto-mapped from GPP headers, "Name [id]" references resolved, preview with skipped-row reasons, upsert by ID.
- **Notifications**: bell in the header with role-specific events (portal approvals, overdue pricing, declined roles, invoices to review, low-margin jobs, new bookings for techs).
- **Settings** (`/settings`): PST, GST, GP% threshold and internal labour cost, editable by management; user admin (create, role, password, delete) in API mode.
