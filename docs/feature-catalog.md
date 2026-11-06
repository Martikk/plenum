# Feature catalog vs Plenum: gap analysis

Status: ✅ implemented · ◐ partial · ✗ not yet. "Source" follows the catalog (Screen / Help / Changelog / Site).
Snapshot: 2026-11-06.

## Home screen
| Function | Plenum | Notes |
|---|---|---|
| My assignments | ✅ | Today queue per role + **My jobs** mobile screen |
| Quick respond | ✅ | "On my way" one tap in My jobs |
| Activity feed | ◐ | Per-record history + notifications; no global feed on home |
| Company notices | ✗ | |
| Role pool (Posted) | ◐ | Posted roles appear in dispatch backlog; no separate pool for techs to claim |
| Roles on hold | ✅ | Dispatch backlog (Holding/Posted/Declined) |
| Customer requests | ✗ | Portal has no "new request" form yet |
| Unassigned work orders | ✅ | Today tile + Work orders filter |
| Technician status | ◐ | Hours booked on dispatch + Reports tech load; no time-off/WIP per tech |
| Time totals | ◐ | Logged hours this week in Reports; no day/month breakdown per user |
| List export | ✗ | No CSV/Excel export yet |

## Customers, people, buildings, equipment
| Function | Plenum | Notes |
|---|---|---|
| Organizations | ✅ | Categories, account codes |
| Org hierarchy | ✗ | No parent/child orgs |
| Accounting codes | ◐ | Customer code only |
| Business units | ✗ | |
| Organization card | ✗ | List data only; no org detail page |
| People & titles | ✅ | Staff + customer contacts |
| Person card | ✗ | |
| Role hand-over (bulk) | ✗ | |
| Video calls | ✗ | Out of scope |
| Building search | ◐ | ⌘K search by name/address/city |
| Equipment card | ◐ | Tag, type, make/model, location; no serial/refrigerant fields |
| Equipment history | ✅ | `/equipment?id=` |
| Equipment search | ◐ | Via building pages; no dedicated search |
| Equipment reference lists | ✗ | |
| QR tags | ✗ | |

## Contracts, rates, markups
| Function | Plenum | Notes |
|---|---|---|
| Contract types | ✅ | |
| Type lock | ✅ | Server rule |
| Terms inherited by WO/quote | ✅ | Rates/markups read from contract |
| Rates template | ◐ | Flag stored; not applied to new contracts |
| Bulk rate update | ✗ | |
| Rate lock | ✅ | Server rule |
| Maintenance fee increase | ✗ | |
| Rate change log | ◐ | Generic activity log |
| PO / credit-card rules | ◐ | PO required + default + note; no CC expiry |
| Auto-roles | ✅ | Default contract people added to PM WOs |
| Statements | ✗ | |
| Project budget | ◐ | Contract revenue/cost/GM to date |
| Contract reports | ✗ | |

## Quotes, work orders, roles
| Function | Plenum | Notes |
|---|---|---|
| Quote → WO conversion | ✅ | |
| Quote preview | ✅ | PDF |
| Quote reminders | ◐ | Tech pricing alert + notification; no customer follow-up emails |
| Approval restriction by date | ✗ | |
| PM proposals | ✗ | |
| Roles | ✅ | All 11 role types |
| Role skills (+ required) | ✅ | Required skill blocks scheduling |
| Date confirmation | ✗ | |
| Status reminder emails | ✗ | Needs email service |
| Margin control | ✅ | Configurable threshold, in-app alert (no email) |
| Past work orders | ◐ | Equipment history; no "recent at this site" tab |
| WO from equipment | ◐ | "Quote for this unit" link |
| Equipment tasks/inspections | ✗ | |
| Copy record | ✗ | |
| Merge duplicates | ✗ | |
| AI assist | ✗ | |
| Role statuses (7) | ✅ | |

## Scheduling, maintenance, field
| Function | Plenum | Notes |
|---|---|---|
| Resource calendar | ◐ | Day view with groups; no week/month/list |
| Colour by WO/city/person | ◐ | Colour by role status |
| Drag & drop | ✅ | Move; resize not yet |
| Holidays & time off | ✗ | |
| Maintenance profiles | ✅ | |
| Invoice-only profiles | ✗ | |
| Maintenance runs | ✅ | Monthly generate, duplicate-safe |
| Load balancing | ◐ | Booked hours visible per tech |
| Load in tech picker | ◐ | On dispatch rows |
| Filters | ✗ | |
| Maintenance reports | ✗ | |
| Procedures | ✗ | |
| Tech report | ✅ | Field report PDF + public photos on portal |
| Mobile | ✅ | My jobs (status, time, materials, photos) |
| Day done | ✗ | |
| Worker safety | ✗ | |
| Customer portal | ✅ | Quotes (approve/decline), service reports, invoices, PDF; no building/equipment summaries |

## Time, materials, invoices, export
| Function | Plenum | Notes |
|---|---|---|
| Time entries | ✅ | Estimate vs actual, OT/call-out types |
| Materials | ✅ | Quoted vs actual, vendor, PST, price book auto-fill |
| Materials search | ✗ | |
| Time summary | ◐ | Reports (week) |
| Invoices & credits | ◐ | Invoices yes; credits not yet |
| Invoice lifecycle | ✅ | All 8 statuses + review queue with pre-send checks |
| Invoice detail control | ✗ | |
| Progress billing | ✅ | With holdback and final invoice |
| Invoice document | ✅ | Preview/PDF; email send needs email service |
| Card payment flag | ✗ | |
| QuickBooks export | ✗ | Needs accounting decision |
| Data export (payroll etc.) | ✗ | |

## Analytics
| Function | Plenum | Notes |
|---|---|---|
| Business panel | ✅ | Revenue, GP%, open WOs, response time, win rate |
| 12-month trend | ✗ | Range selector only |
| Hours mix by type | ◐ | GP by contract type |
| WO portfolio | ◐ | Filters: in progress / ready to invoice |
| Quote funnel | ✅ | |
| Invoice funnel | ◐ | Status chips with counts |
| Tech productivity | ◐ | Weekly load |
| Service quality (callbacks) | ✗ | |
| Maintenance health | ◐ | Generated vs due per month |
| Ops queue | ✅ | Today queues + notifications |
| KPIs with drill-down | ◐ | Low-margin list links to jobs |
| AI analytics | ✗ | |

## Search, notes, documents, admin
| Function | Plenum | Notes |
|---|---|---|
| Uniform record screens | ✅ | |
| Quick search | ✅ | ⌘K / `/` |
| Advanced search | ✗ | By design: chips + text filter instead of 40-field forms |
| Search export | ✗ | |
| Saved searches | ✗ | |
| Search config | n/a | |
| History log | ✅ | Per record |
| Notes Public/Pending/Alert | ◐ | Notes yes; no visibility flags |
| Reminders & tasks | ✗ | |
| Watch record | ✗ | |
| Note templates | ✗ | |
| Emails from record | ✗ | Needs email service |
| Document templates | ✗ | Fixed PDF layouts |
| Files | ✅ | Images/PDF ≤ 4 MB (catalog: 200 MB) |
| Photos for report | ✅ | Public flag |
| Quick date entry | ✗ | |
| Keyboard shortcuts | ◐ | ⌘K, / |
| What's new on record | ✗ | |
| Access groups | ◐ | 6 fixed roles enforced server-side |
| Encrypted notes | ✗ | |
| User activity | ✅ | Activity log |
| Usage metrics | ✗ | |
| Release log | ✗ | Git history only |
| Test environment | ◐ | Local demo mode; no staging copy |
| Projects & wiki | ✗ | |

## Summary
Roughly **40 ✅, 35 ◐, 55 ✗** of ~130 catalog lines. The core path (quote → WO → schedule → field → margin → invoice → portal) is covered end-to-end. Main gaps by business value:
1. **Email** (quote follow-ups, status reminders, sending invoices). Needs an email provider.
2. **Accounting export** (QuickBooks, payroll). Needs a decision on target system and format.
3. **Scheduling depth**: week/month views, time off/holidays, resize.
4. **Record cards** for organization/person, org hierarchy, business units.
5. **Export to CSV** from lists; credits; equipment serial/refrigerant fields; QR tags.
