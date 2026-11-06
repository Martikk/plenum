# What was observed in the GamePlanPro TEST system (2026-11-06)

Read-only walk-through of test.allied.ucora.com. Only structure was recorded; no customer or employee data was copied into this repo (all seed data is fictional).

## Navigation (Find menu)
Work Orders/Quotes · Organizations · People · Contracts · Buildings · Equipment · Projects · Time Off · Maint Profiles · Invoices/Credits · Roles Assigned · Time Entries · Material Entries · Procedures · Saved Searches · User Activity · History.
Action menu: Refresh, Open in new tab, Day Done, **Schedule**, Your Time Summary, **Assignments Map**, Admin, Help, Ask Ucora, Log out.
URL pattern: `#?ptxModule=<WO|Bldg|Org|Inv|Person|Search|Sched>&ptxAction=s&pidObjID=<id>`.

## Home dashboard tabs
Your Assignments · Roles in Pool · Roles On Hold · Cust Requests · Unassigned Orders · Technicians. Company notices with alerts.

## Work order card tabs
Main · Fees · Roles · Equipment · Materials · Time · Invoices · Past WOs · History & Files.
Header: `Service Plumbing ● Fixed Price Work Order`, address. Type code `(S-P-WO)` = Contract type (Installation/Maintenance/Service) – Service type letter (H=HVAC, P=Plumbing, Y=Hydronics, C=Controls…) – WO/QO.

## Status vocabularies (confirmed from filters)
- **Role status:** Holding, Posted, Assigned, Declined, Responding, Incomplete, Complete.
- **WO/QO status:** Unassigned, Assigned, Responding, Incomplete, Complete, Closed (+ confirmation-request / late flags).
- **Invoice status:** Draft, Review Reqd, Changes Reqd, PO Requested, PO Required, Approved, Sent, Cancelled, Paid. Credits are a separate kind. Flags: Progress billed, Credit approved, Processed on CC, Uploaded (to accounting).
- **Invoice line items:** Labour, Parts, Per Agreement, Retainer, Truck Charge, Work Noted Above. GST 5%.
- **Bill types:** Billable, Non-Billable All-Inclusive / Other / Training / Warranty.
- **Estimate types:** Firm Price, Estimated, Not quoted; PM Proposal flag; Price Pending.
- **GP% margin filter:** at or above 20%, less than 20%, crossed above 20%, plus GP% alerted date.

## Skills (role requirement)
Backflow Ticket, Boiler Tech / Hydronic Heating Specialist, Carpentry, Controls Tech, Drainage Tech, Gas Fitter A, Gas Fitter B, HVAC Apprentice, HVAC Journeyman, Island Department, Plumber Apprentice, Plumber Journeyman, Refrigeration Mechanic, Service Coordinator, Warehouse Assistant.

## Schedule
FullCalendar resource timeline, 6am–9pm, views day / 7 days / week / month / list, "Colour by WO#". Resource groups: 1) Stat Day, 2) Other (Unassigned, …), 3) Journeyman, 5) Staff.

## Building card
Main · Extra Addr · People · Equip · Contracts · Quotes · Work Orders · Invoices · History & Files. Fields: name, parent building, short address, description, **building access**, **keys required**, belts included, structured address (unit, number, direction, street, type), GPS + nearby buildings.

## Organization card
Main · Address · People · Sub-Orgs · Contracts · Buildings · Work Orders · Projects · Invoices · History & Files. Category list includes *Property Management Company*, *Strata Unit*, *Subtrade*, *Supplier*, plus flags *No Invoice Reminder*, *No Quote Reminder*. Status: Active, Unlinkable, Inactive, Defunct.

## Business units
Allied · Island · Lower Mainland.

## Maintenance profiles
Profile, contract, start, months (e.g. "Jan, Apr, Jul, Oct"), hours, price, Tech1–3, filter change date. Drives automatic PM work order creation (not yet built here).

## Still open (needs Ucora / Allied answers)
1. Exact rule for turning several role statuses into one WO status. Plenum uses: Closed > all Complete > any Incomplete > any Responding > any Assigned > Unassigned.
2. PST application and exemptions; labour cost (burden) rates. Plenum assumes PST 7% on purchased materials, labour cost $58/h journeyman and $34/h apprentice.
3. Overtime: computed or chosen manually (Plenum: chosen).
4. Progress-billing close-out.
5. Role permissions matrix (who may change price, rates, markups, status).
