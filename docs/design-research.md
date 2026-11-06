# Plenum — design research for all-day use

Dispatchers, coordinators and managers keep this screen open 8–10 hours a day. Every colour and density decision below targets that: low fatigue, fast scanning, and no ambiguity about status.

## Name

**Plenum**: in HVAC, the plenum is the chamber where many ducts meet before air is distributed. The product plays the same role: every request, quote, tech assignment and invoice passes through it. The name is short and pronounceable, and HVAC and plumbing people know the word. The logo shows three flows converging into one outlet.

Alternatives considered: *Ductline*, *Kelvin* (too many existing thermostat/IoT brands), *Coilwork*.
Check trademark and domain availability before committing (plenum.app / getplenum.com etc.).

## Colour principles and sources

| Decision | Why | Source |
|---|---|---|
| Light theme by default; dark is optional (system / light / dark toggle) | Positive polarity (dark text on light) gives better legibility and proofreading accuracy in lit offices | Piepenbrock, Mayr & Buchner (2013–2014), *Ergonomics* / *Human Factors*: positive-polarity advantage |
| Canvas `#f2f4f7`, surfaces `#fbfcfd`; no pure `#fff` page | Lowers peak luminance and glare over a full shift without losing contrast | ISO 9241-303 guidance on luminance balance; Material/Apple HIG "elevated surface" practice |
| Body text `#1a2129` on `#fbfcfd` = 15.8:1; secondary `#475260` = 7.7:1; tertiary `#636e7b` = 5.0:1 (4.7:1 on canvas). All status pills ≥ 4.7:1 | Above WCAG 2.2 AA (4.5:1) everywhere, but avoids the harsh 21:1 of pure black on white | WCAG 2.2 SC 1.4.3 |
| Low-chroma cool-grey chrome; saturated colour only for **status** and **primary action** | Saturated colour is a pre-attentive signal; if everything is colourful, nothing stands out | Ware, *Information Visualization* (pre-attentive processing); NN/g "colour as a signal" |
| One calm primary blue `#1f5f99` (6.5:1 on surface) | Blue has low arousal and is a well-established "action/link" convention; deep enough for AA on text | — |
| Status palette derived from **Okabe–Ito**, darkened for AA text; every status has **icon + label**, never colour alone | About 8% of men have red-green CVD, and the trades workforce is mostly male. Red/green-only encoding would fail for them | Okabe & Ito (2008) CUD palette; WCAG SC 1.4.1 (use of colour) |
| Dark theme uses `#111519` / `#171c21`, not black; text `#e2e7ec`, not white | Avoids halation/smearing of white text on pure black (notably for astigmatism) | Common dark-UI practice (Material dark theme guidance) |
| Warnings use amber + ⚠ icon; danger uses red + ✕; "OK" uses bluish-green + ✓ | Shape redundancy so CVD users get the same signal | WCAG SC 1.4.1 |

### Status colours

| Status | Light (fg / bg) | Meaning | Icon |
|---|---|---|---|
| Holding / Unassigned | `#5d6977` / `#eceff3` | Waiting for someone | pause / dashed circle |
| Posted | `#6845b5` / `#f0ebfa` | Offered to pool | megaphone |
| Assigned | `#0a6bb0` / `#e4f0fa` | Has a tech + time | user-check |
| Responding | `#a95400` / `#fdefdf` | Tech on the way / on site | truck |
| Incomplete | `#a1306f` / `#f9e8f1` | Needs a return visit | rotate |
| Declined | `#b42318` / `#fdeceb` | Tech declined | x-circle |
| Complete | `#00704f` / `#e1f4ec` | Done | check |

## Typography and density

- System UI stack, with Inter if installed (SF Pro on Mac). No web-font download, so nothing shifts on load.
- 14 px base. Data tables run at 14 px with 9 px vertical cell padding: dense, but not cramped.
- `font-variant-numeric: tabular-nums` on every number column, so money lines up.
- Monospace for PO numbers, equipment tags and type codes `(S-H-WO)`, which people read character by character.

## Interaction choices made against what was observed in GamePlanPro

| GPP today | Plenum |
|---|---|
| Search screens with 40+ filter fields (WO search, roles search) | One ⌘K box (also `/`) that matches ID, address, PO and text, plus quick filter chips per list |
| One long form per record; Status shown as a read-only field | Record header with derived status badge, urgency and an **estimate vs actual economics strip** always visible |
| Schedule = resource timeline, text-only blocks | Same resource timeline (people know it) + backlog panel, drag-and-drop, status-coloured blocks, conflict ring, "now" line, skill checks |
| GP% alert is a search filter (≥ / < 20%) | Margin meter everywhere, with a 20% threshold tick; a warning when costs are missing ("margin overstated") |
| Invoice status dropdown | Review panel with automatic pre-send checks (PO, work performed, costs, $0, GP%) and actions (approve & send / changes / ask CEO / request PO) |
