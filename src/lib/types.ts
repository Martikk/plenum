export type ContractType = "Installation" | "Maintenance" | "Service";
export type ServiceType =
  | "Consult" | "Controls" | "Fleet" | "HVAC" | "Hydronics" | "Meetings"
  | "Piping" | "Plumbing" | "Standby" | "Tools" | "Training";

export type BillType =
  | "Billable"
  | "Non-Billable All-Inclusive"
  | "Non-Billable Warranty"
  | "Non-Billable Training"
  | "Non-Billable Other";

export type Urgency = "High" | "Medium" | "Low";

export type RoleType =
  | "Primary Tech" | "Secondary Tech" | "Team Leader" | "Internal"
  | "Service Coordinator"
  | "Invoice Contact" | "Key Contact" | "Property Contact" | "PO# Contact" | "Quote Contact" | "Copy To";

export const TECH_ROLES: RoleType[] = ["Primary Tech", "Secondary Tech", "Team Leader", "Internal", "Service Coordinator"];

export type RoleStatus =
  | "Holding" | "Posted" | "Assigned" | "Declined" | "Responding" | "Incomplete" | "Complete";

/** Derived WO status (observed in GPP search filter "WO/QO Status"). */
export type WOStatus = "Unassigned" | "Assigned" | "Responding" | "Incomplete" | "Complete" | "Closed";

/** Quote workflow per "Business Model for Dispatch" — Option B Middle Ground. */
export type QuoteStatus =
  | "Draft"            // tech initiating
  | "Pricing"          // Service Coordinator sourcing materials / subtrade cost
  | "Sent"             // "Date Sent" → visible on Customer Portal
  | "Approved"
  | "Declined";

/** Invoice statuses observed in GPP. */
export type InvoiceStatus =
  | "Draft" | "Review Reqd" | "Changes Reqd" | "PO Requested" | "Approved" | "Sent" | "Paid" | "Cancelled";

export type MaterialType =
  | "Equipment" | "Materials" | "Parts" | "Supplies" | "Tools" | "Subtrade" | "Quote Fee"
  | "Truck Charge" | "Other" | "Filters from Stock" | "Refrigerant Purchased" | "Refrigerant from Stock"
  | "Truck Stock Purchased" | "Truck Stock from Stock";

export type TimeType = "Regular" | "OT 1.5" | "OT 2.0" | "Call Out 1.5" | "Call Out 2.0";

export type Skill =
  | "Backflow Ticket" | "Boiler / Hydronic Specialist" | "Carpentry" | "Controls Tech" | "Drainage Tech"
  | "Gas Fitter A" | "Gas Fitter B" | "HVAC Apprentice" | "HVAC Journeyman" | "Plumber Apprentice"
  | "Plumber Journeyman" | "Refrigeration Mechanic" | "Service Coordinator";

export interface Org { id: number; name: string; category: string; accountCode?: string; parentId?: number; phone?: string; email?: string; address?: string; }

export interface Building {
  id: number; name: string; address: string; city: string; orgId: number;
  access?: string; keysRequired?: boolean;
}

export interface Equipment {
  id: number; buildingId: number; type: string; tag: string; manufacturer?: string; model?: string;
  location?: string; lastInspected?: string;
  serial?: string; areaServed?: string; installedYear?: number;
  refrigerant?: string; refrigerantLbs?: number;     // e.g. R-410A, 18.5 lb
  filters?: string; belts?: string;                   // e.g. "4 × 20x25x2 MERV 8", "2 × A42"
  notes?: string;
}

export interface Person {
  id: number; name: string; initials: string; kind: "staff" | "contact";
  group?: "Journeyman" | "Apprentice" | "Office";
  title?: string; skills?: Skill[];
  /** Senior techs allowed to self-schedule and send quotes (Option B). */
  canSelfSchedule?: boolean; canSendQuotes?: boolean;
  email?: string; phone?: string;
  orgId?: number;            // customer contacts: their organization
  notes?: string;
}

export interface Contract {
  id: number; type: ContractType; serviceType: ServiceType; orgId: number; buildingIds: number[];
  start: string; end?: string; active: boolean;
  allInclusive: boolean; poRequired: boolean; poDefault?: string; poNote?: string;
  rates: { journeyman: number; apprentice: number; travel: number; travelHoursCap: number };
  installationMarkup: number; subtradeMarkup: number; quoteMarkup: number; materialMarkup: number;
  responseTimeHrs?: number; lockRates: boolean; ratesTemplate: boolean;
  defaultRolePersonIds: number[];
}

export interface Role {
  id: number; type: RoleType; personId?: number; status: RoleStatus;
  start?: string; end?: string; instruction?: string; skill?: Skill; skillRequired?: boolean;
  remindIfNotStatus?: { status: RoleStatus; by: string };
}

export interface TimeEntry {
  id: number; personId: number; date?: string; hours: number; type: TimeType; note?: string;
}

export interface MaterialEntry {
  id: number; type: MaterialType; item: string; qty: number;
  unitCost: number | null; // purchase cost pre-tax; null = missing
  sellPrice?: number;      // manual sell price per unit; otherwise derived
  vendor?: string; pstExempt?: boolean; personId?: number; received?: string;
}

export interface InvoiceLine { kind: "Labour" | "Parts" | "Per Agreement" | "Retainer" | "Truck Charge" | "Work Noted Above" | "Progress" | "Holdback" | "Less previous billing" | "Holdback release"; description: string; amount: number; }

export interface Invoice {
  id: number; woId: number; date: string; status: InvoiceStatus; progress: boolean;
  lines: InvoiceLine[]; reviewNote?: string;
  credit?: boolean; creditFor?: number; // credit note against invoice `creditFor`
}

export interface HistoryItem { id: number; at: string; by: string; kind: "Note" | "Change" | "Email Sent" | "Alert" | "File" | "Status"; text: string; }

export interface WorkOrder {
  id: number; kind: "QO" | "WO"; name: string;
  contractId: number; buildingId: number; orgId: number; equipmentIds: number[];
  createdAt: string; due?: string; urgency: Urgency; billType: BillType;
  estimate: "Firm Price" | "Estimate"; pricePending: boolean;
  po?: string; caller?: string; previousWoId?: number;
  customerRequest: string; workRecommended?: string; internalInstructions?: string; workPerformed?: string;
  quoteStatus?: QuoteStatus; quoteSentAt?: string; pricingAlertAt?: string;
  closed?: boolean; onHold?: boolean;
  requestedOnline?: { by: string; phone?: string; preferred?: string; at: string };
  roles: Role[];
  quotedTime: TimeEntry[]; time: TimeEntry[];
  quotedMaterials: MaterialEntry[]; materials: MaterialEntry[];
  quotedSellOverride?: number;
  history: HistoryItem[];
}

/** Maintenance profile → generates PM work orders in the listed months (GPP "Maint Profiles"). */
export interface MaintProfile {
  id: number; name: string; contractId: number; buildingId: number;
  months: number[];            // 1–12
  hours: number;               // estimated hours per visit
  techIds: number[];           // preferred techs, first becomes Primary Tech
  equipmentIds: number[];
  description: string;
  active: boolean;
  generated: string[];         // "YYYY-MM" periods already generated
}

/** Price book entry: purchase cost used to fill material lines automatically. */
export interface PriceItem {
  id: number; sku?: string; name: string; type: MaterialType; unitCost: number; vendor?: string; updatedAt: string;
}

/** Company notice shown on everyone's home screen. */
export interface Notice { id: number; text: string; alert: boolean; by: string; createdAt: string; until?: string }

/** Time off / stat holiday. personId 0 = whole company (stat holiday). Dates inclusive, YYYY-MM-DD. */
export interface TimeOff { id: number; personId: number; start: string; end: string; kind: "Vacation" | "Sick" | "Training" | "Stat holiday" | "Other"; note?: string }
