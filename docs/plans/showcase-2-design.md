# Showcase 2 — Angular-only controls — design

Interface: **Web** (tester profile: clicks a screen). Roadmap items 6–12.
Source: PM feedback relayed by WL, 25/09/2026. Builds on `portal-lite-design.md` (palette, type, status tracker, popover surface) without changing any of it.

## Stage 1 — Problem and options (/design-expert, compressed)

**Starting assumption:** the customer journey is settled and loved. What the PM now judges is *control depth* (grid, calendar, forms, parent-child layouts) against Codejock, and whether the stack is safe to adopt. The PM is a developer, so density and "show me the state" beat minimalism.

**Discover — what the feedback actually says** (from WL's message; no separate interview, interview skipped for time):

| # | Finding | Evidence |
|---|---|---|
| D1 | The PM can't tell which packages are Angular's and which aren't, and neither could WL. | "I couldn't really tell him what was angular and what wasn't" |
| D2 | Third-party packages are a trust problem, not a feature problem. Same functionality is expected without them. | "the same functionality that i showcased but without ANY third party dependencies" |
| D3 | The yardstick is Codejock ReportControl: group box, multi-level grouping, multi-column sort. | "We're used to the capabilities of the codejock report grid" |
| D4 | Forms look thin: one control type on show. | "the account page only showcases a text input" |
| D5 | Every screen is flat; one-to-many data (order → lines) has no strong representation. Yardstick is Codejock Docking Pane. | "data representations are very flat" |
| D6 | Calendar depth is also judged. | "control (e.g table, calendar, form controls) capabilities" |
| D7 | The polish must survive. The audience wants more data per screen than an average user. | "keeping the nice UI polish", "always wants to see more data" |

**Prior art checked (web search, 25/09/2026):**
- Codejock ReportControl: group-by box with multi-level drag grouping, field chooser, preview row, tree view mode, reusable layouts, multi-select ([tour](https://codejock.com/products/reportcontrol/tour.asp)).
- Codejock Docking Pane: docked, tabbed and auto-hide panes, splitter tracking, pinning, save/load layout ([tour](https://codejock.com/products/dockingpane/tour.asp)).
- Angular's own answer to "headless, accessible building blocks": **Angular Aria** (`@angular/aria`, Angular team, since v21) — Grid, Tree, Tabs, Combobox, Listbox, Menu, Toolbar, Accordion ([angular.dev/guide/aria](https://angular.dev/guide/aria/overview)). This is what makes an in-house grid realistic without a third party.
- The CDK table has no grouping ([angular/components#10660](https://github.com/angular/components/issues/10660)); every CDK-based grid with grouping builds it on top (e.g. GridEngine). So grouping is ours to build either way.
- Master-detail: split view (Windows, SAP Fiori) and nested row grid (Infragistics, ApexGrid) are the two established shapes. Both are used here.
- Print stylesheets with `@page { size: A4 }` are the standard zero-library route to a PDF: the browser's "Save as PDF".
- Angular Material ships a timepicker and a date range picker, so the forms gap needs no third party either.

**Define — themes**
1. **Provenance must be visible.** Being Angular-only is only half the job; the portal has to *show* it, so the next PM question gets answered on screen.
2. **Depth, not breadth.** One grid used everywhere, done to Codejock depth, beats three shallow ones.
3. **Hierarchy is the missing dimension.** Orders → lines → products is real Northwind data that nothing shows yet.
4. **Density on demand.** A developer wants compact rows, status bars and raw state, but the calm default must stay for everyone else.

**HMW:** How might we show a developer-PM Codejock-grade grids, calendars, forms and parent-child layouts, built only from Angular-team packages, so that the stack is judged safe *and* capable without losing the polish that won item 1?

**Develop — options**

| # | Concept | Verdict |
|---|---|---|
| A | Swap ag-grid for Angular Material `mat-table` and accept fewer features | Rejected: loses what the PM already liked |
| B | One in-house grid built on Angular Aria Grid + CDK drag-drop/overlay, used for orders, lines and products; in-house calendar and SVG chart | **Chosen** |
| C | Separate "Control gallery" page showing each control on fake data | Rejected: feels like a component catalogue, not a product; real data is the persuasive bit |
| D | Workspace of dockable panes for orders, lines, details and products, on real data | **Chosen**, alongside B |
| E | A global "Developer details" switch that shows each control's live state | **Chosen**: cheap, and aimed exactly at this audience |
| F | An "Under the hood" page that lists every package and who maintains it, and a test that keeps it honest | **Chosen**: answers D1 for good |
| G | Worst idea: a full IDE-style docking system with floating windows | Rejected: floating windows are not a web idiom and fail on touch |

**Open assumptions (unvalidated):**
- Allowed means **published by the Angular team or Microsoft** (the platform owners). `rxjs` is a required peer of `@angular/core` and `tslib` is required by Angular's compiled output, so neither can go; the Under the hood page says so plainly.
- Fonts are design assets, not code. They are copied into the repo (their OFL licence allows it) instead of installed as packages.
- Build- and test-only tools don't ship, so they are listed but not removed. Only one of them isn't Angular or Microsoft (Prettier, a code formatter), plus `pdfjs-dist` (Mozilla), which tests use to read PDFs. WL to confirm with the PM.
- The delivery note becomes a print-ready page saved via the browser's "Save as PDF" instead of a generated download. WL to confirm with the PM (item 2 gets re-tested).

## Stage 2 — Settled solution (/frontend-design)

**Subject, user, job:** unchanged: a Northwind buyer checking goods and spend. The second audience is a developer-PM who opens every menu.

### Direction
Harbour stays exactly as it is: palette, type, radius, popover surface and status tracker. Nothing gets restyled. This round adds **one** new visual device, and every new control uses it.

**Signature — the tow line.** The portal already speaks in "a line with stops" (the status tracker). Hierarchy now speaks the same language, turned vertical: a 2px fjord guide rule runs down from a parent row. Each child row hangs off it with a 6px stop dot, like a line of containers towed behind a tug. It marks:
- nested order lines under an expanded order,
- group levels in the grid (one line per level, indented 20px each),
- tree levels in Products bought,
- the resize handles between workspace panes. When dragged, the handle shows as the same line with a stop at the pointer.

Because the rule is the same everywhere, anyone who has read one hierarchy can read them all. That is the risk this round takes: hierarchy shown by one maritime metaphor rather than the usual stock chevrons and indentation.

### New tokens (derived, no new hues)
| Token | Value | Use |
|---|---|---|
| `--tow-line` | `color-mix(in oklch, var(--color-fjord) 45%, transparent)` | Tow line rule and stop dots |
| `--row-height-comfortable` | 52px | Default density (unchanged from today) |
| `--row-height-compact` | 34px | Compact density |
| `--grid-group-indent` | 20px | Per group/tree level |
| `--pane-title-height` | 36px | Workspace pane title bars |
| `--splitter-size` | 8px hit area, 2px drawn | Pane resize handles |
| `--z-pane-autohide` | 1 (inside page stacking; under `--z-drawer`) | Auto-hidden pane sliding over the workspace |

### One grid, everywhere — `<app-data-grid>`
One shared component. The orders list, the lines pane, nested lines and the products tree are all the same component with different column definitions. What it can do, mapped to Codejock ReportControl:

| Capability | How it works here | Codejock equivalent |
|---|---|---|
| Multi-column sort | Click a header: sort by it alone (asc → desc → off). **Shift+click**, or the header menu's "Add to sort", adds it as the next key. Headers show an arrow plus a small mono rank number (1, 2, 3) once 2+ keys are active. A "Sorted by Status ↑, Total ↓ · Clear" line sits in the status bar. | Multi-column sort |
| Group box | A strip above the headers: "Drag a column here to group by it". Dragging a header in adds a grouping level, up to 3. The chips can be dragged to reorder or ✕'d to remove. The header menu offers "Group by this column" for keyboard and touch users. | Group-by box |
| Multi-level groups | Group rows are nested with a tow line per level. Each shows its label, count, and a **sum under every numeric column**, aligned in that column. Expand or collapse a group on its own, or use "Expand all / Collapse all". | Multi-level grouping |
| Group by menu | The existing "Group by" menu stays as the quick, touch-friendly way in. Picking a choice replaces all levels with that one. When there are more levels, the button reads "Group by Status +1". | — |
| Column chooser | A "Columns" menu lists every column with a checkbox, drag-to-reorder and "Reset columns". | Field chooser |
| Reorder and resize | Drag a header to move a column. Drag its right edge to resize, or focus the edge and use ← → (10px steps). Double-click the edge to fit the content. | Column drag, best-fit |
| Frozen column and sticky header | Order no stays pinned on the left and the header stays pinned on top while scrolling. | Frozen columns |
| Density | A Comfortable / Compact toggle. Compact moves the status tracker into its compact dots-only form and shows ~50% more rows. | — |
| Selection and status bar | Checkbox column; Shift+click selects a range. The status bar shows "31 orders · 3 selected · Sum £2,140.50 · Avg £713.50", like Excel. | Multiple selection |
| Footer totals | A pinned footer row sums Items and Total for everything the filters leave. | Footer row |
| Preview line | "Show preview" adds a muted second line under each order: its product names, e.g. "Chai, Chang, Aniseed Syrup +2". | Preview mode |
| Master-detail rows | A chevron on each order expands its lines in place, as a nested grid hanging off a tow line. The nested grid shows Product, Unit price, Qty, Discount and Amount, with its own footer. | Tree/child rows |
| Tree data | For hierarchical data (Products bought), rows nest by level with an aggregate at every level. | Tree view mode |
| Keyboard | Angular Aria Grid: arrow keys move between cells; Home/End and PageUp/PageDown work; Enter opens the order; Space selects; Shift+F10 opens the header menu. | — |
| Cut-off text tooltip | Kept from Revision 2: only cells that are truncated show a tooltip, and numbers and dates are never cut off. | — |
| Saved view | Column order, widths, visibility, sort, grouping, density and preview are remembered in this browser. "Reset view" puts the defaults back. | Reusable layouts |
| Export | "Export CSV" exports exactly what's on screen: current columns, sort and filters. | — |

Phones (<720px) keep the card list. The card list gains the same multi-sort (a "Sort" sheet with ordered keys) and expandable lines per card. The group box and column chooser are desktop-only; the Group by menu remains on phones.

### Orders → Workspace (parent-child, Docking Pane)
A **List | Workspace** segmented toggle sits next to the page title on Orders at ≥1024px. List is today's page with the new grid. Workspace:

```
┌ Orders   [ List | Workspace ]                          [Reset layout] ┐
│┌─ Orders ───────────────── ⤢ ⇤ ┐┃┌─ Order #10643 ──────────── ⤢ ⇥ ┐ │
││ group box                      │┃│ ●───●───○  Awaiting dispatch    │ │
││ grid (compact by default)      │┃│ Ordered   25/08/2026            │ │
││   #10643  25/08  ●●○  £814.50  │┃│ Due       22/09/2026            │ │
││ ▸ #10692 …                     │┃│ Ship to   Alfreds Futterkiste   │ │
│├━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━┤┃│           Obere Str. 57, Berlin │ │
││ [ Lines (3) | Products bought ]│┃│ Freight   £29.46                │ │
││ Product      Price Qty  Amount │┃│ [ Delivery note ]               │ │
││ Rössle Sauer… 45.60 15  £513.00│┃└─────────────────────────────────┘ │
││ Σ                      £814.50 │┃                                    │
│└────────────────────────────────┘┃                                    │
└───────────────────────────────────────────────────────────────────────┘
```

Panes:
1. **Orders**: the master grid.
2. **Lines**: lines of the selected order, with a footer that must equal the order total.
3. **Order details**: a property grid with label/value rows, the large status tracker, ship-to address, freight, and the Delivery note button.
4. **Products bought**: a tree grid of Category → Product → each order line, with spend and quantity summed at every level. Selecting a product **highlights every order that contains it** in the Orders pane (linked panes), and the Orders title shows a dismissible chip: "Highlighting orders with Vegie-spread ✕".

Pane behaviour:
- **Splitters**: drag, or focus and use arrow keys. They follow the WAI-ARIA window splitter pattern (`role="separator"` with `aria-valuenow`).
- **Tabbed groups**: Lines and Products bought share one pane as tabs (Angular Aria Tabs). A tab can be dragged to another dock zone: left, right or bottom. Drop zones show as fjord-wash outlines while dragging.
- **Auto-hide**: the pin icon (⇤ / ⇥) collapses a pane to a labelled tab on the workspace edge. Clicking or focusing the tab slides the pane over the workspace (180ms, `--ease-out-sheet`). Pinning docks it back.
- **Maximise**: ⤢ or a double-click on the title fills the workspace with that pane. Esc restores it.
- **Layout saved** in this browser. "Reset layout" restores the default above.
- **Selection is shared**: selecting an order in any pane updates all panes, and the URL carries it (`/orders?view=workspace&order=10643`), so it can be shared or reloaded.
- **Empty detail**: before anything is selected, Lines and Details say "Select an order to see its lines" with a hint on the ↑ ↓ keys.

1024–1279px: the default layout drops Details to an auto-hidden pane. Below 1024px there is no Workspace toggle. List's expandable rows and the order drawer already cover parent-child there (collapsed master-detail, per Windows guidance).

### Schedule — in-house calendar
Header: title (e.g. "September 2026"), ‹ Today ›, and a view switch: **Month · Week · Agenda · Timeline**. On the left at ≥1024px: a mini-month navigator (Angular Material `mat-calendar`) and a legend whose items are also toggles (Ordered, Due, Late, Shipped), each with a live count.

- **Month**: 6×7 grid. Each day cell holds up to 3 events, then "+2 more", which opens a popover listing that day. Today is ringed in fjord. Days outside the month are muted.
- **Week**: 7 columns with events stacked as cards (the data is dates, not times, so there's no hour axis).
- **Agenda**: a day-by-day list with sticky day headers, each entry showing order no, event type, compact tracker and total.
- **Timeline** (the voyage in Gantt form): one row per order and one bar per order from Ordered to Shipped. An unshipped order's bar runs to Due. A late order's bar continues past Due to today as a harbour-red overrun segment. A vertical "Today" rule runs through it all. Zoom (Month / Quarter) sits in the header beside the view switch, shown only on Timeline. Rows can be grouped by status.
- **Every event**: hover or focus shows a preview card (order no, status tracker, items, total); click or Enter opens the order drawer. Arrow keys move the focused day (Angular Aria Grid); PageUp/PageDown change month.
- **Shipped** is a new event type, so the calendar also shows what's already arrived.

### Spend — in-house SVG chart
- Bar chart drawn as SVG by an Angular component: bars, a dashed average line with its label, and a y-axis with 4 gridlines. Colours still come from `tokens.css`.
- **12 months / 24 months** segmented toggle (built this time; see item 3's build note).
- Each bar is focusable. Hover or focus shows "August 2026 · £1,204.50 · 3 orders". **Clicking a bar opens Orders filtered to that month** (drill-down).
- **Top 5 products** horizontal bar chart below, now that order lines have an endpoint (item 3's note flagged this as blocked).
- "Show as table" is unchanged.

### Account → Delivery preferences (form controls)
Account becomes two tabs: **Contact details** (today's form, unchanged) and **Delivery preferences**. Every control is Angular Material, and each one earns its place with a real delivery question:

| Question | Control | Rule |
|---|---|---|
| Preferred carrier | Select (Northwind's own Shippers, with phone as secondary text) | Required |
| Delivery days | Checkbox group, Mon–Sat | At least one |
| Delivery window | Two timepickers (From / To) | To ≥ From + 2h |
| Unloading | Radio group: Loading dock · Tail-lift needed · By hand | Required |
| Pallets per delivery | Slider 1–26 with value label | — |
| Chilled goods | Slide toggle; when on, reveals **Maximum temperature** as a number stepper (−25 to 8 °C) | Required when on |
| Closed for deliveries | Date range picker | Start today or later; end ≥ start |
| Also notify | Chip input of email addresses | Each a valid email; max 5 |
| Standing order products | Autocomplete multi-select over Northwind's 77 products, showing category; picked ones become chips | Max 10 |
| Invoice format | Button toggle: PDF · Paper · Both | — |
| Delivery instructions | Textarea, auto-growing, with "212 / 500" counter | ≤ 500 |
| Site map for drivers | File drop zone (PNG, JPG or PDF, ≤ 2 MB) with thumbnail and Remove | Type and size |

- **Live summary card** (desktop right column; below the form on phones). It is a plain-English echo of the choices, where any invalid field shows as "(… needs fixing)" in error red rather than being echoed back as accepted, e.g. "Speedy Express, Mon–Fri 08:00–12:00, tail-lift, up to 6 pallets, chilled at 4 °C or below, closed 22/12–02/01."
- **Same patterns as Contact details**: pressing Save while there are errors moves focus to the first error; save bar, "Changes saved" toast, inline errors on blur, unsaved-changes guard. Errors say what to do, e.g. "End the window at least 2 hours after it starts."

### Developer details (global)
A switch in the account menu: **Show developer details** (remembered in this browser). When it is on:
- Grids show a "View state" panel under the status bar: live JSON of sort keys, group levels, column order and widths, selection count.
- Delivery preferences shows a "Form state" panel: each control's value, valid/invalid, touched and dirty, plus the form's errors.
- Workspace shows the saved layout JSON.

Off by default, so the customer journey is unchanged.

### Under the hood
Opened from the account menu: **About this build** → `/under-the-hood`. Page title: "What this portal is built from".
1. **Runs in your browser**: every runtime package with its version, who maintains it (Angular team · Microsoft · RxJS core team) and one line on why it's there.
2. **Runs on the server**: ASP.NET Core and Microsoft.Data.SqlClient (Microsoft).
3. **Build and test only (never shipped)**: Angular CLI/build, TypeScript, Playwright, Prettier, pdfjs-dist, each marked with its maintainer.
4. **What each screen is built from**: Orders grid → Angular Aria Grid + CDK Drag and Drop + CDK Overlay; Workspace → CDK Drag and Drop + Angular Aria Tabs; Schedule → Angular Aria Grid + Material Calendar; Spend → plain Angular + SVG; forms → Angular Material form controls + typed Reactive Forms; delivery note → a print stylesheet.

A test compares section 1 with `package.json` and fails if they differ, or if any runtime package isn't on the allowed list.

### Delivery note — print-ready page
The drawer's two buttons become one: **Delivery note**. It opens `/orders/:id/delivery-note` in a new tab: the same A4 manifest design, rendered as a page, with a slim toolbar holding **Print or save as PDF** and **Close**. The page title is `delivery-note-10643`, so "Save as PDF" suggests that filename. `@page { size: A4 portrait; margin: 16mm }`, `print-color-adjust: exact` for the letterhead, and the toolbar is hidden in print.

### Copy glossary (new)
| Say | Never |
|---|---|
| Group by / Drag a column here to group by it | Pivot, aggregate |
| Sorted by Status ↑, Total ↓ | Sort model |
| Lines | Order details (clashes with Order details pane) |
| Products bought | Product hierarchy |
| Reset view / Reset layout | Restore defaults |
| Delivery preferences | Shipping config |
| Show developer details | Debug mode |
| What this portal is built from | Dependencies |

### Angular talking points (for WL's demo)
- Every control on screen is built from Angular-team packages: Angular Aria for behaviour and accessibility, CDK for drag/overlay, and Material for form controls. Nothing is licensed from a vendor.
- One grid component serves four screens, so a fix in one place fixes all of them.
- The Under the hood page and its test make "Angular only" a checked fact, not a claim.

## Stage 3 — Review (/design-reviewer)
Run against this document and screenshots of the mockup (`docs/plans/mockups/showcase-2.html`, four 1280×780 frames). **Verdict: Needs work → Solid** once the checklist below is folded in. Each fix went back through Stage 2 and is already reflected above and in the mockup.

**Heuristics / cognitive load**
- [x] **H8, Hick's law:** the grid toolbar was heading for 8 buttons. Density, Preview, Export CSV and Reset view are folded into one **View** menu, leaving Status tabs · Filters · Group by · Columns · View.
- [x] **H6/H10 — hidden gesture:** Shift+click sort is invisible to novices. Each header menu gets "Add to sort", and the status bar's sort line says "Shift+click a header to add a sort".
- [x] **H1 — invisible cause (Workspace frame):** Orders rows were amber-highlighted because of a product picked in a tab that wasn't showing. The Orders pane title now carries a dismissible chip, "Highlighting orders with Vegie-spread ✕", and the status bar repeats the count.
- [x] **H4 — undefined pane:** the first mockup showed an "Activity" auto-hide tab that the design never defined. It was removed. The only panes are Orders, Lines, Products bought and Order details.
- [x] **H8 — control in the wrong place (Schedule frame):** the Month/Quarter zoom sat in the sidebar under the legend, far from the view it changes. It moves into the header beside the view switch and shows only on Timeline.
- [x] **H9 / Rams "honest" (form frame):** the live summary echoed an invalid delivery window as if it had been accepted. The summary now shows a field it can't trust as "(delivery window needs fixing)" in error red. Save stays enabled; pressing it with errors moves focus to the first error (GOV.UK pattern) instead of silently doing nothing.
- [x] **Consistency:** Delivery days used toggle chips, while Invoice format already used a button toggle, so the same look meant two different things. Delivery days are now plain checkboxes, which also widens the control showcase.
- [x] **Data honesty:** group sums and the footer read "Total of 12 shown", not "Total", whenever filters hide orders, so a filtered sum is never mistaken for the whole. The mockup's figures were also corrected so every group, nested footer and hover card add up.
- [x] **Error prevention:** "Reset view" and "Reset layout" can't be undone, so each shows an **Undo** action in its toast for 6s instead of a confirm dialog (lower friction, same safety).

**Accessibility**
- [x] **SC 2.5.7 (dragging):** every drag has a non-drag equivalent: header menu "Group by this column" / "Move left/right", the Columns menu, splitter arrow keys, and the pane menu "Move to → Left / Right / Bottom".
- [x] **SC 1.4.11 (non-text contrast):** the tow line (≈2.6:1 on white) is decorative only. Level is also carried by indent, `aria-level` and the group label, so it isn't the sole cue. Focus rings stay at the existing 3:1+ fjord ring.
- [x] **SC 4.1.2:** grid and tree use Angular Aria Grid / Tree roles (`grid`, `row`, `gridcell`, `columnheader` with `aria-sort`, `aria-rowindex`, `aria-expanded` on group and parent rows). Splitters use `separator` with `aria-valuenow`.
- [ ] Needs verifying in the build (a mockup can't prove it): screen-reader announcement of sort changes and group expand/collapse via a polite live region.

**Visual craft / Rams**
- [x] **As little design as possible:** the tow line draws only for expanded children and open group levels; collapsed groups show just their stop dot.
- [x] **Motion:** only the pane slide and group expand animate (transform/opacity, 180ms), and both are off under reduced motion.
- [x] **Phone:** no desktop-only affordance reaches <720px. The group box, column chooser, splitters and Workspace toggle are absent there, not disabled.
- **Keep:** the status bar. It is the single strongest "developer sees more data" move and costs one 34px strip.
- [ ] **Unvalidated:** whether the PM reads the tow line as hierarchy without being told. Check at the demo; the fallback is chevrons only, a CSS-only change.

## Persistence
- **New read endpoints** (Northwind is unchanged):
  - `GET /api/order-lines`: every line of the signed-in customer's orders, with product category.
  - `GET /api/shippers`
  - `GET /api/products`
- **New tables** in the local Northwind copy, created by an idempotent `db/portal-lite-schema.sql` that setup runs:
  - `PortalDeliveryPreferences`: one row per customer, holding the single-valued answers (carrier, window, unloading, pallets, chilled and max temperature, closed range, invoice format, instructions, site map bytes/type/name).
  - `PortalDeliveryDays` (CustomerID, DayOfWeek), `PortalNotifyEmails` (CustomerID, Email) and `PortalStandingProducts` (CustomerID, ProductID → Products): one-to-many answers get their own tables rather than packed strings, so they can be queried and constrained.
  - Rules the database enforces: foreign keys to Customers, Shippers and Products; checks on pallets 1–26, temperature −25 to 8, a temperature only when chilled, window end > start, closed end ≥ start, unloading and invoice format from their fixed lists.
- **The API writes all of the preferences in one transaction** (replacing that customer's rows), so the four tables can never disagree.
- **Browser-only state** (`localStorage`, keyed per screen): grid view, workspace layout, developer-details switch. These are conveniences, never business data.

## Deliberate deviations from the full spec
- Floating/undocked panes and in-place cell editing (Codejock has both) are not built. Floating windows don't suit the web or touch. Editing has no honest use on historic orders; it fits a future "Reorder" item.
- No row virtualisation: the largest demo customer has 31 orders and ~90 lines. A 10,000-row "stress" demo could be its own item if the PM asks.

## Told to WL
- Delivery note moves from generated download to print-ready page (confirm with the PM; item 2 gets re-tested).
- `rxjs` and `tslib` stay; Angular can't run without them. Prettier and pdfjs-dist are build/test-only. The PM decides if even those must go.
- Item 5 (brand/dark mode) is still Waiting for Dev. Every new surface here uses tokens only, so B5 themes it for free, but B5's tests will now also cover these screens.

## Pre-existing, not fixed here
- `PortalApi.searchCustomers` is still dead code (carried from item 4's note).
- The two P7 flaky tests: the grid they exercise is being replaced, so they may disappear on their own; if not, they still want their own item.
- (Resolved as a side effect, not fixed separately) the initial bundle breached its 1.50 MB budget because `main.ts` registered all of AG Grid up front. Removing AG Grid removes that.
