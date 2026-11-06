import type {
  PriceItem, MaintProfile, Building, Contract, Equipment, Invoice, Org, Person, WorkOrder, Role, MaterialEntry, TimeEntry, HistoryItem,
} from "./types";

/** All names, addresses and amounts below are fictional demo data. */

function at(dayOffset: number, hour = 9, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}
const day = (o: number) => at(o, 12).slice(0, 10);

export const orgs: Org[] = [
  { id: 1, name: "Harbourline Property Management", category: "Property Management Company", accountCode: "4101", phone: "604-555-0110", email: "service@harbourline.example", address: "200 Burrard St, Vancouver" },
  { id: 2, name: "Strata VR2210 – The Larchway", category: "Customer", accountCode: "4102", parentId: 1 },
  { id: 3, name: "Cedarpoint Living", category: "Property Management Company", accountCode: "4103", phone: "604-555-0130" },
  { id: 4, name: "North Shore School District (demo)", category: "Educational Institution", accountCode: "4104" },
  { id: 5, name: "Fraser Commons Holdings", category: "Corporation", accountCode: "4105" },
  { id: 6, name: "Pacific Sheet Metal (demo)", category: "Subtrade" },
];

export const buildings: Building[] = [
  { id: 101, name: "The Larchway", address: "1180 Larch St", city: "Vancouver", orgId: 2, access: "Lockbox at P1 gate, code from concierge", keysRequired: true },
  { id: 102, name: "Harbour View Tower", address: "455 Esplanade W", city: "North Vancouver", orgId: 1, access: "Sign in at front desk" },
  { id: 103, name: "Cedarpoint – Building A", address: "2290 Kingsway", city: "Vancouver", orgId: 3 },
  { id: 104, name: "Cedarpoint – Building B", address: "2310 Kingsway", city: "Vancouver", orgId: 3 },
  { id: 105, name: "Lynn Creek Elementary", address: "88 Mountain Hwy", city: "North Vancouver", orgId: 4, access: "Custodian on site 7–15h", keysRequired: true },
  { id: 106, name: "Fraser Commons", address: "4700 No. 3 Rd", city: "Richmond", orgId: 5 },
  { id: 107, name: "Brentwood Gardens", address: "1950 Willingdon Ave", city: "Burnaby", orgId: 1 },
  { id: 108, name: "Moody Landing", address: "120 Clarke St", city: "Port Moody", orgId: 3 },
];

export const equipment: Equipment[] = [
  { id: 501, buildingId: 101, type: "Boiler", tag: "B-1", manufacturer: "Viessmann", model: "Vitocrossal 300", location: "Mech room P1", lastInspected: day(-40), serial: "7543210-01", installedYear: 2014, areaServed: "Building heating loop" },
  { id: 502, buildingId: 101, type: "Boiler", tag: "B-2", manufacturer: "Viessmann", model: "Vitocrossal 300", location: "Mech room P1", lastInspected: day(-40), serial: "7543210-02", installedYear: 2014, areaServed: "Building heating loop" },
  { id: 503, buildingId: 101, type: "Domestic Hot Water Tank", tag: "DHW-1", manufacturer: "A.O. Smith", location: "Mech room P1" },
  { id: 504, buildingId: 102, type: "Make-up Air Unit", tag: "MUA-1", manufacturer: "Engineered Air", location: "Roof" },
  { id: 505, buildingId: 102, type: "Sump Pump", tag: "SP-1", location: "P3 parkade" },
  { id: 506, buildingId: 105, type: "Rooftop Unit", tag: "RTU-3", manufacturer: "Trane", model: "Voyager", location: "Roof – gym", serial: "21094KAL3F", refrigerant: "R-410A", refrigerantLbs: 18.5, filters: "4 × 20x25x2 MERV 8", belts: "2 × A42", areaServed: "Gymnasium", installedYear: 2026 },
  { id: 507, buildingId: 106, type: "Chiller", tag: "CH-1", manufacturer: "Daikin", location: "Roof", model: "AGZ-100", serial: "STNU180400101", refrigerant: "R-410A", refrigerantLbs: 96, areaServed: "Floors 1–6" },
  { id: 508, buildingId: 103, type: "Backflow Preventer (RP)", tag: "BF-2", location: "Water entry" },
  { id: 509, buildingId: 107, type: "Heat Pump", tag: "HP-12", manufacturer: "Mitsubishi", location: "Unit 1204", model: "MUZ-FS12", serial: "1023456T", refrigerant: "R-410A", refrigerantLbs: 2.6, filters: "Washable" },
  { id: 510, buildingId: 108, type: "Air Handling Unit", tag: "AHU-1", manufacturer: "Daikin", location: "Mech penthouse" },
];

export const people: Person[] = [
  // Field — Journeyman
  { id: 1, name: "Marco Bellini", initials: "MB", kind: "staff", group: "Journeyman", title: "Senior HVAC Tech", skills: ["HVAC Journeyman", "Refrigeration Mechanic", "Gas Fitter A"], canSelfSchedule: true, canSendQuotes: true },
  { id: 2, name: "Priya Nair", initials: "PN", kind: "staff", group: "Journeyman", title: "Senior Plumber", skills: ["Plumber Journeyman", "Backflow Ticket", "Gas Fitter B"], canSelfSchedule: true, canSendQuotes: true },
  { id: 3, name: "Tomasz Kowal", initials: "TK", kind: "staff", group: "Journeyman", title: "Hydronics Tech", skills: ["Boiler / Hydronic Specialist", "Gas Fitter A"] },
  { id: 4, name: "Jordan Fraser", initials: "JF", kind: "staff", group: "Journeyman", title: "Plumber", skills: ["Plumber Journeyman", "Drainage Tech"] },
  { id: 5, name: "Kenji Watanabe", initials: "KW", kind: "staff", group: "Journeyman", title: "Controls Tech", skills: ["Controls Tech", "HVAC Journeyman"] },
  { id: 6, name: "Sofia Restrepo", initials: "SR", kind: "staff", group: "Journeyman", title: "HVAC Tech", skills: ["HVAC Journeyman", "Refrigeration Mechanic"] },
  // Field — Apprentice
  { id: 7, name: "Liam O'Connell", initials: "LO", kind: "staff", group: "Apprentice", title: "HVAC Apprentice", skills: ["HVAC Apprentice"] },
  { id: 8, name: "Ava Thompson", initials: "AT", kind: "staff", group: "Apprentice", title: "Plumbing Apprentice", skills: ["Plumber Apprentice"] },
  // Office
  { id: 20, name: "Dana Whitfield", initials: "DW", kind: "staff", group: "Office", title: "Service Coordinator", skills: ["Service Coordinator"], canSendQuotes: true },
  { id: 21, name: "Rafael Ortiz", initials: "RO", kind: "staff", group: "Office", title: "Service Coordinator", skills: ["Service Coordinator"], canSendQuotes: true },
  { id: 22, name: "Morgan Hale", initials: "MH", kind: "staff", group: "Office", title: "Coordination Manager", canSendQuotes: true },
  { id: 23, name: "Chris Lindqvist", initials: "CL", kind: "staff", group: "Office", title: "CEO", canSendQuotes: true },
  // Customer contacts
  { id: 40, name: "Helen Cho", initials: "HC", kind: "contact", title: "Strata Manager", email: "helen.cho@example.com", phone: "604-555-0141", orgId: 2 },
  { id: 41, name: "Ravi Gill", initials: "RG", kind: "contact", title: "Building Manager", email: "ravi.gill@example.com", phone: "604-555-0172", orgId: 1 },
  { id: 42, name: "Erin Walsh", initials: "EW", kind: "contact", title: "Facilities Lead", email: "erin.walsh@example.com", phone: "604-555-0188", orgId: 5 },
];

const baseContract = {
  allInclusive: false, poRequired: false, lockRates: false, ratesTemplate: false,
  rates: { journeyman: 142, apprentice: 98, travel: 95, travelHoursCap: 1 },
  installationMarkup: 0.25, subtradeMarkup: 0.15, quoteMarkup: 0.1, materialMarkup: 0.35,
  defaultRolePersonIds: [] as number[], responseTimeHrs: 24, active: true,
};

export const contracts: Contract[] = [
  { ...baseContract, id: 1001, type: "Service", serviceType: "HVAC", orgId: 1, buildingIds: [102, 107], start: day(-400), poRequired: true, poNote: "PO from Harbourline portal, format HPM-#####", defaultRolePersonIds: [41] },
  { ...baseContract, id: 1002, type: "Maintenance", serviceType: "Hydronics", orgId: 2, buildingIds: [101], start: day(-700), allInclusive: true, defaultRolePersonIds: [40], ratesTemplate: true },
  { ...baseContract, id: 1003, type: "Service", serviceType: "Plumbing", orgId: 2, buildingIds: [101], start: day(-700), defaultRolePersonIds: [40] },
  { ...baseContract, id: 1004, type: "Service", serviceType: "Plumbing", orgId: 3, buildingIds: [103, 104, 108], start: day(-200) },
  { ...baseContract, id: 1005, type: "Installation", serviceType: "HVAC", orgId: 4, buildingIds: [105], start: day(-60), poRequired: true, poDefault: "NSSD-24-0391", lockRates: true, rates: { journeyman: 128, apprentice: 90, travel: 0, travelHoursCap: 0 }, defaultRolePersonIds: [42] },
  { ...baseContract, id: 1006, type: "Service", serviceType: "HVAC", orgId: 5, buildingIds: [106], start: day(-300) },
  { ...baseContract, id: 1007, type: "Service", serviceType: "Controls", orgId: 3, buildingIds: [108], start: day(-90) },
];

let rid = 9000, tid = 7000, mid = 8000, hid = 6000;
const role = (type: Role["type"], status: Role["status"], personId?: number, start?: string, end?: string, extra: Partial<Role> = {}): Role =>
  ({ id: rid++, type, status, personId, start, end, ...extra });
const t = (personId: number, hours: number, date?: string, type: TimeEntry["type"] = "Regular", note?: string): TimeEntry =>
  ({ id: tid++, personId, hours, date, type, note });
const m = (type: MaterialEntry["type"], item: string, qty: number, unitCost: number | null, extra: Partial<MaterialEntry> = {}): MaterialEntry =>
  ({ id: mid++, type, item, qty, unitCost, ...extra });
const h = (at: string, by: string, kind: HistoryItem["kind"], text: string): HistoryItem => ({ id: hid++, at, by, kind, text });

type WOInit = Omit<WorkOrder, "name" | "equipmentIds" | "quotedTime" | "time" | "quotedMaterials" | "materials" | "history" | "estimate" | "pricePending" | "billType"> &
  Partial<Pick<WorkOrder, "equipmentIds" | "quotedTime" | "time" | "quotedMaterials" | "materials" | "history" | "estimate" | "pricePending" | "billType">>;

function wo(x: WOInit): WorkOrder {
  const b = buildings.find((b) => b.id === x.buildingId)!;
  return {
    name: `${b.name}-${x.id}-${x.kind}`, equipmentIds: [], quotedTime: [], time: [], quotedMaterials: [], materials: [],
    history: [h(x.createdAt, "System", "Change", `${x.kind === "QO" ? "Quote" : "Work order"} created`)],
    estimate: "Firm Price", pricePending: false, billType: "Billable", ...x,
  };
}

export const workOrders: WorkOrder[] = [
  // ---- Today’s scheduled work
  wo({ id: 43012, kind: "WO", contractId: 1002, buildingId: 101, orgId: 2, createdAt: at(-3, 10), urgency: "Medium", billType: "Non-Billable All-Inclusive",
    customerRequest: "Quarterly boiler PM – B-1 and B-2, combustion analysis, check expansion tank pre-charge.", equipmentIds: [501, 502],
    roles: [role("Primary Tech", "Responding", 3, at(0, 8), at(0, 12)), role("Secondary Tech", "Assigned", 7, at(0, 8), at(0, 12)), role("Property Contact", "Assigned", 40)],
    time: [t(3, 1.5, day(0)), t(7, 1.5, day(0))], quotedTime: [t(3, 4), t(7, 4)] }),
  wo({ id: 43015, kind: "WO", contractId: 1001, buildingId: 102, orgId: 1, createdAt: at(-1, 15), urgency: "High", po: "HPM-20811",
    customerRequest: "Sump pump SP-1 alarm in P3. Water pooling near storm drain.", equipmentIds: [505],
    roles: [role("Primary Tech", "Assigned", 4, at(0, 9), at(0, 11, 30), { instruction: "Bring 1/2 HP submersible from truck stock if failed" }), role("Key Contact", "Assigned", 41)] }),
  wo({ id: 43018, kind: "WO", contractId: 1005, buildingId: 105, orgId: 4, createdAt: at(-20, 9), urgency: "Medium", po: "NSSD-24-0391", estimate: "Estimate",
    customerRequest: "Gym RTU-3 replacement – phase 2: curb adapter, controls tie-in, start-up.", equipmentIds: [506],
    roles: [role("Team Leader", "Responding", 1, at(0, 7), at(0, 15, 30)), role("Primary Tech", "Responding", 6, at(0, 7), at(0, 15, 30)), role("Secondary Tech", "Assigned", 5, at(0, 12), at(0, 15, 30), { skill: "Controls Tech", skillRequired: true })],
    quotedTime: [t(1, 32), t(6, 32), t(5, 12)],
    quotedMaterials: [m("Equipment", "Trane 12.5T RTU", 1, 18400), m("Materials", "Curb adapter (custom)", 1, 2150), m("Subtrade", "Crane lift – 4h", 1, 3200), m("Materials", "Controls – BACnet module", 1, 640)],
    time: [t(1, 24, day(-6)), t(6, 26, day(-6)), t(5, 6, day(-2)), t(1, 8, day(-1), "OT 1.5")],
    materials: [m("Equipment", "Trane 12.5T RTU", 1, 18400, { vendor: "Trane Supply" }), m("Materials", "Curb adapter (custom)", 1, 2380, { vendor: "Pacific Sheet Metal" }), m("Subtrade", "Crane lift – 4h", 1, 3600, { vendor: "Coastal Crane" }), m("Supplies", "Misc fasteners / sealant", 1, null)],
    history: [h(at(-20, 9), "System", "Change", "Work order created from quote 42990"), h(at(-1, 18), "System", "Alert", "GP% dropped below 20% after crane invoice")] }),
  wo({ id: 43021, kind: "WO", contractId: 1004, buildingId: 103, orgId: 3, createdAt: at(-2, 11), urgency: "Low",
    customerRequest: "Annual backflow test BF-2, submit test report to city.", equipmentIds: [508],
    roles: [role("Primary Tech", "Assigned", 2, at(0, 13), at(0, 14, 30), { skill: "Backflow Ticket", skillRequired: true })] }),
  wo({ id: 43024, kind: "WO", contractId: 1006, buildingId: 106, orgId: 5, createdAt: at(-1, 8), urgency: "High",
    customerRequest: "CH-1 tripping on high head pressure, tenants reporting warm suites.", equipmentIds: [507],
    roles: [role("Primary Tech", "Assigned", 6, at(0, 16), at(0, 18)), role("Secondary Tech", "Assigned", 7, at(0, 16), at(0, 18))] }),
  wo({ id: 43027, kind: "WO", contractId: 1007, buildingId: 108, orgId: 3, createdAt: at(-4, 14), urgency: "Medium",
    customerRequest: "AHU-1 not following schedule, BAS shows override stuck.", equipmentIds: [510],
    roles: [role("Primary Tech", "Assigned", 5, at(0, 8, 30), at(0, 11))] }),
  // ---- Unassigned / unscheduled
  wo({ id: 43030, kind: "WO", contractId: 1003, buildingId: 101, orgId: 2, createdAt: at(0, 7, 40), urgency: "High", due: day(0),
    customerRequest: "Unit 804 – no hot water since last night. Owner works from home.", roles: [role("Primary Tech", "Posted", undefined, undefined, undefined, { skill: "Plumber Journeyman" }), role("Property Contact", "Assigned", 40)] }),
  wo({ id: 43031, kind: "WO", contractId: 1001, buildingId: 107, orgId: 1, createdAt: at(-1, 16), urgency: "Medium", due: day(1), po: "HPM-20819",
    customerRequest: "HP-12 in unit 1204 blowing cold in heat mode.", equipmentIds: [509], roles: [role("Primary Tech", "Holding")] }),
  wo({ id: 43033, kind: "WO", contractId: 1004, buildingId: 104, orgId: 3, createdAt: at(-1, 10), urgency: "Low", due: day(3),
    customerRequest: "Slow drain in common-area washroom, 2nd floor.", roles: [role("Primary Tech", "Declined", 4)] }),
  wo({ id: 43034, kind: "WO", contractId: 1001, buildingId: 102, orgId: 1, createdAt: at(0, 8, 15), urgency: "High", due: day(0),
    customerRequest: "MUA-1 not starting – corridor pressurization alarm.", equipmentIds: [504], roles: [role("Primary Tech", "Holding")] }),
  // ---- Quotes in different stages (Option B workflow)
  wo({ id: 42990, kind: "QO", contractId: 1003, buildingId: 101, orgId: 2, createdAt: at(-2, 13), urgency: "Medium", quoteStatus: "Pricing", pricePending: true, pricingAlertAt: at(1, 12),
    customerRequest: "DHW-1 tank leaking at base.", workRecommended: "Replace 100 gal DHW tank, new expansion tank and mixing valve.", equipmentIds: [503],
    roles: [role("Primary Tech", "Complete", 2), role("Service Coordinator", "Assigned", 20, undefined, undefined, { instruction: "Source 100 gal commercial tank + mixing valve pricing" })],
    quotedTime: [t(2, 7), t(8, 7)], quotedMaterials: [m("Equipment", "100 gal commercial gas DHW tank", 1, null), m("Parts", "Thermostatic mixing valve 1-1/4\"", 1, null), m("Parts", "Expansion tank 14 gal", 1, 310)],
    history: [h(at(-2, 13), "Priya Nair", "Note", "Tank is 14 yrs old, base corroded. Photos attached."), h(at(-2, 14), "Priya Nair", "Status", "Requested pricing from Service Coordinator")] }),
  wo({ id: 42994, kind: "QO", contractId: 1006, buildingId: 106, orgId: 5, createdAt: at(-5, 9), urgency: "Medium", quoteStatus: "Sent", quoteSentAt: at(-3, 10),
    customerRequest: "Chiller CH-1 condenser coil cleaning and refrigerant leak search.", workRecommended: "Chemical coil clean, electronic leak search, repair minor leaks if found.", equipmentIds: [507],
    roles: [role("Primary Tech", "Complete", 6), role("Quote Contact", "Assigned", 42)],
    quotedTime: [t(6, 6), t(7, 6)], quotedMaterials: [m("Supplies", "Coil cleaner (4 gal)", 1, 180), m("Refrigerant Purchased", "R-410A 25 lb", 1, 520)] }),
  wo({ id: 42997, kind: "QO", contractId: 1001, buildingId: 107, orgId: 1, createdAt: at(-1, 11), urgency: "Low", quoteStatus: "Draft",
    customerRequest: "Owner asking about adding a ductless head in den.", workRecommended: "Add 9k BTU head to existing multi-zone outdoor unit.",
    roles: [role("Primary Tech", "Assigned", 1)], quotedTime: [t(1, 6)], quotedMaterials: [m("Equipment", "9k ductless wall head", 1, 1120), m("Materials", "Line set + condensate pump", 1, 240)] }),
  wo({ id: 42999, kind: "QO", contractId: 1004, buildingId: 108, orgId: 3, createdAt: at(-8, 9), urgency: "Medium", quoteStatus: "Approved", quoteSentAt: at(-6, 9),
    customerRequest: "Replace 3 failed zone valves on heating loop.", workRecommended: "Replace zone valves Z2, Z5, Z7; rebalance loop.",
    roles: [role("Primary Tech", "Complete", 3)], quotedTime: [t(3, 5)], quotedMaterials: [m("Parts", "Zone valve 3/4\" w/ actuator", 3, 265)],
    history: [h(at(-4, 16), "Customer Portal", "Status", "Quote approved by Erin Walsh on portal")] }),
  // ---- Completed, awaiting invoice review
  wo({ id: 42970, kind: "WO", contractId: 1003, buildingId: 101, orgId: 2, createdAt: at(-9, 9), urgency: "Medium",
    customerRequest: "Replace leaking PRV on domestic cold main.", workPerformed: "Isolated main, replaced 2\" PRV, set to 65 psi, verified no leaks.",
    roles: [role("Primary Tech", "Complete", 2, at(-3, 8), at(-3, 13))], time: [t(2, 5, day(-3)), t(8, 5, day(-3))],
    materials: [m("Parts", "2\" PRV Watts LF223", 1, 1180, { vendor: "Andrew Sheret" }), m("Supplies", "Fittings / dielectric unions", 1, 96)] }),
  wo({ id: 42975, kind: "WO", contractId: 1001, buildingId: 102, orgId: 1, createdAt: at(-7, 9), urgency: "High", po: "HPM-20790",
    customerRequest: "Garbage room exhaust fan seized.", workPerformed: "Replaced motor and belt, greased bearings, tested.",
    roles: [role("Primary Tech", "Complete", 6, at(-2, 13), at(-2, 16))], time: [t(6, 3, day(-2))],
    materials: [m("Parts", "1 HP motor 1725 rpm", 1, 420), m("Parts", "A-section belt", 2, 18)] }),
  wo({ id: 42978, kind: "WO", contractId: 1006, buildingId: 106, orgId: 5, createdAt: at(-6, 9), urgency: "Medium",
    customerRequest: "Thermostat replacement suites 301, 305.", workPerformed: "Replaced 2 thermostats, programmed per tenant schedule.",
    roles: [role("Primary Tech", "Complete", 7, at(-1, 9), at(-1, 11))], time: [t(7, 2, day(-1))],
    materials: [m("Parts", "Programmable thermostat", 2, 0)] }),
  // ---- Tomorrow
  wo({ id: 43036, kind: "WO", contractId: 1002, buildingId: 101, orgId: 2, createdAt: at(-1, 9), urgency: "Low", billType: "Non-Billable All-Inclusive",
    customerRequest: "Quarterly PM – DHW tank flush and anode check.", equipmentIds: [503],
    roles: [role("Primary Tech", "Assigned", 3, at(1, 8), at(1, 11))] }),
];

export const invoices: Invoice[] = [
  { id: 31010, woId: 42970, date: day(-1), status: "Review Reqd", progress: false,
    lines: [{ kind: "Labour", description: "Journeyman 5h + Apprentice 5h", amount: 1200 }, { kind: "Parts", description: "2\" PRV, fittings", amount: 1723 }, { kind: "Truck Charge", description: "Truck charge", amount: 45 }] },
  { id: 31011, woId: 42975, date: day(0), status: "Review Reqd", progress: false,
    lines: [{ kind: "Labour", description: "Journeyman 3h", amount: 426 }, { kind: "Parts", description: "Motor, belts", amount: 615 }] },
  { id: 31012, woId: 42978, date: day(0), status: "Draft", progress: false,
    lines: [{ kind: "Labour", description: "Apprentice 2h", amount: 196 }, { kind: "Parts", description: "Thermostats x2", amount: 0 }] },
  { id: 31002, woId: 43018, date: day(-10), status: "Sent", progress: true,
    lines: [{ kind: "Work Noted Above", description: "Progress billing #1 – 40% of RTU-3 replacement", amount: 14200 }] },
  { id: 30990, woId: 42999, date: day(-12), status: "Paid", progress: false,
    lines: [{ kind: "Per Agreement", description: "Deposit per approved quote", amount: 600 }] },
];

const ym = (o: number) => { const d = new Date(); d.setMonth(d.getMonth() + o); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

export const profiles: MaintProfile[] = [
  { id: 701, name: "Quarterly boiler PM – The Larchway", contractId: 1002, buildingId: 101, months: [2, 5, 8, 11], hours: 4, techIds: [3, 7], equipmentIds: [501, 502], description: "Combustion analysis B-1/B-2, expansion tank pre-charge, glycol check.", active: true, generated: [ym(-3)] },
  { id: 702, name: "DHW flush & anode – The Larchway", contractId: 1002, buildingId: 101, months: [5, 11], hours: 3, techIds: [3], equipmentIds: [503], description: "Flush DHW-1, inspect anode, test T&P.", active: true, generated: [] },
  { id: 703, name: "Annual backflow test – Cedarpoint A", contractId: 1004, buildingId: 103, months: [4], hours: 1.5, techIds: [2], equipmentIds: [508], description: "Test BF-2, submit report to municipality.", active: true, generated: [] },
  { id: 704, name: "Semi-annual RTU PM – Lynn Creek", contractId: 1005, buildingId: 105, months: [4, 10], hours: 3, techIds: [6], equipmentIds: [506], description: "Filters, belts, coil clean, economizer check.", active: false, generated: [] },
  { id: 705, name: "Monthly sump check – Harbour View", contractId: 1001, buildingId: 102, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], hours: 1, techIds: [4], equipmentIds: [505], description: "Test float and alarm, clean pit screen.", active: true, generated: [ym(-1)] },
];

const pi = (id: number, sku: string, name: string, type: PriceItem["type"], unitCost: number, vendor: string): PriceItem => ({ id, sku, name, type, unitCost, vendor, updatedAt: day(-20) });
export const priceBook: PriceItem[] = [
  pi(1, "WAT-LF223-2", "2\" PRV Watts LF223", "Parts", 1180, "Andrew Sheret"),
  pi(2, "TMV-125", "Thermostatic mixing valve 1-1/4\"", "Parts", 640, "Emco"),
  pi(3, "EXP-14", "Expansion tank 14 gal", "Parts", 310, "Andrew Sheret"),
  pi(4, "DHW-100G", "100 gal commercial gas DHW tank", "Equipment", 7850, "Emco"),
  pi(5, "ZV-075", "Zone valve 3/4\" w/ actuator", "Parts", 265, "Emco"),
  pi(6, "MTR-1HP", "1 HP motor 1725 rpm", "Parts", 420, "Wolseley"),
  pi(7, "BLT-A", "A-section belt", "Parts", 18, "Wolseley"),
  pi(8, "TSTAT-PRG", "Programmable thermostat", "Parts", 145, "Wolseley"),
  pi(9, "R410A-25", "R-410A 25 lb", "Refrigerant Purchased", 520, "Refrigerative Supply"),
  pi(10, "COIL-CLN-4", "Coil cleaner (4 gal)", "Supplies", 180, "Refrigerative Supply"),
  pi(11, "FLT-20x25x2", "Pleated filter 20x25x2 MERV 8", "Filters from Stock", 9.5, "Stock"),
  pi(12, "PMP-SUB-05", "1/2 HP submersible sump pump", "Parts", 465, "Andrew Sheret"),
  pi(13, "DUCT-9K", "9k ductless wall head", "Equipment", 1120, "Mitsubishi Electric"),
  pi(14, "LINESET-25", "Line set 1/4 x 3/8, 25 ft + condensate pump", "Materials", 240, "Refrigerative Supply"),
  pi(15, "TRUCK", "Truck charge", "Truck Charge", 0, "Internal"),
];
