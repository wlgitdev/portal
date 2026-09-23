# portal-lite — design

Interface: **Web** (tester profile: clicks a screen).

## Stage 1 — Problem and options (Double Diamond, compressed)

**Starting assumption:** judges are sales staff and testers. They judge what they can see and click in roughly 10 minutes, against React/Flutter + DevExpress demos.

**HMW:** How might we make a sales person feel, within 5 minutes, that this is a product a Northwind customer would pay for, so that Angular is picked on sight rather than on architecture?

**Open assumptions (unvalidated — interview skipped for time):**
- Demo length is about 10 minutes, on a projector, driven by WL.
- Judges may be handed the laptop or a phone to try it themselves.
- Competitors will show dense DevExpress grids and dashboards.

**Options considered:**

| # | Concept | Verdict |
|---|---|---|
| A | Feature-parity tour: all flows, stock Material | Safe, forgettable |
| B | Signature voyage tracking + live white-label rebrand | **Chosen** |
| C | Analytics-heavy dashboard (charts everywhere) | Fights DevExpress on its home turf |
| D | Mobile-first, demoed on a phone | Folded into B as a demo beat |
| E | Worst idea: one giant grid of everything | Rejected |

## Stage 2 — Chosen solution (/frontend-design)

**Subject:** Northwind Traders, a speciality food importer.
**User:** a buyer at a customer business (e.g. Alfreds Futterkiste).
**Single job:** "Where are my goods, and what have I spent?"

### Palette — "Harbour"
Cool, maritime; deliberately not the cream/terracotta or black/acid-green defaults.

| Token | Hex | Use |
|---|---|---|
| fjord | #1F3A5F | Primary, nav, voyage line |
| deep-water | #14202E | Ink / body text (never pure black) |
| mist | #EEF2F5 | Light surface |
| night-harbour | #0F1A26 | Dark surface |
| sea-glass | #3E8E7E | Shipped |
| signal-amber | #E0A526 | Awaiting dispatch / due. **Fill only**; amber text uses #8A5A00 |
| harbour-red | #C2413B | Late, errors |

### Type
All faces self-hosted via @fontsource (OFL); no runtime Google CDN.
- **Display:** Big Shoulders Display. Freight/industrial character, used only for page titles and inline figures.
- **Body:** IBM Plex Sans.
- **Data:** IBM Plex Mono, for order numbers, dates in manifests and money columns.

### Signature — the voyage line
- A thin fjord route runs from **Ordered**, through **Shipped**, to **Due**.
- A small hull marker sits at today's position.
- It appears in three sizes:
  - mini, in grid rows;
  - large, in the order drawer;
  - hero, on Overview.
- Motion: on Overview load, the lines draw left to right with a 60ms stagger, over 600ms in total. With reduced motion, they render static.
- This is the only orchestrated animation. Route changes use a 180ms view-transition cross-fade.

### Plan critique (revision made)
- **First pass:** navy/teal dashboard with 4 KPI cards and a gradient. That is the generic SaaS answer.
- **Revised:** KPI cards replaced by a sentence header, e.g. "**3** orders on the water, **1** late. **£4,210** spent this quarter." Figures are set in Big Shoulders inline. Gradient removed.

### Brand presets (the live rebrand demo)
- Presets swap colour tokens, wordmark and corner radius only. Fonts are fixed.
- The three presets:
  1. Northwind (Harbour, as above).
  2. Alfreds Futterkiste: forest #2F5D3A, mustard #D9A21B.
  3. Ernst Handel: burgundy #6E2233, slate #4A5563.
- All are driven by overriding Angular Material M3 system variables (`--mat-sys-*`) in `tokens.css`.

### Screens

**1. Sign in**
- Left: brand panel with a slow voyage line.
- Right: "Demo sign-in — choose a customer. No password in this prototype."
- Customer search, plus 3 featured cards: ALFKI, SAVEA (biggest spender) and one customer with late orders.

**2. Overview**
- Sentence header.
- "On the water" list of unshipped and recent orders, each with a voyage line.
- 12-month spend sparkline.
- Next due date.

**3. Orders**
- Desktop (AG Grid) columns: Order no (mono), Ordered, Status chip, Progress (mini voyage line), Items, Total, Ship to. *Revised: see Revision 2.*
- Quick search, a status filter (All / Shipped / Awaiting dispatch / Late) and Export CSV. *Extended by Revision 2 with search across all columns, a Filters panel and Group by.*
- Row click opens a right-hand drawer: large voyage line, lines table, totals, **View delivery note** and **Download delivery note**.
- Below 720px: card list instead of the grid.

**4. Delivery note (PDF)**
- A4 manifest in brand colours with a letterhead wordmark.
- Order no large in mono, ship-to block, lines, totals, a "Received by" signature box.

**5. Spend**
- ECharts monthly bar with an average line, and a 12/24-month toggle.
- Top 5 products as a horizontal bar.
- "Show as table" toggle.

**6. Schedule**
- FullCalendar month and list views.
- Events: Ordered (fjord dot), Due (amber outline), Late (red).
- Click opens the same order drawer.

**7. Account**
- Sections: Contact, Address, Phone.
- Company name is read-only.
- Inline errors, "Save changes" button, "Changes saved" toast, and an unsaved-changes guard.

**Global:** header has a light/dark/system switch, a **Brand preview** menu and **Sign out** (Revision 2).

### Wireframes

```
Overview (desktop ≥1024px)
┌────┬──────────────────────────────────────────────────┐
│ NW │ Good afternoon, Alfreds Futterkiste               │
│    │ 3 orders on the water, 1 late. £4,210 this quarter│
│ ▣  ├──────────────────────────────────────────────────┤
│ ≡  │ ON THE WATER                                      │
│ £  │ #11011  ●━━━━━━━━◆━━━━━━○   Awaiting dispatch     │
│ ▦  │ #10952  ●━━━━━●━━━━━━◆━○   Shipped               │
│ ☺  │ #10835  ●━━━━━━━━━━━━━━○◆  Late                   │
│    ├───────────────────────┬──────────────────────────┤
│    │ Spend, 12 months ▁▃▅▂▇│ Next due: 30/09/2026      │
└────┴───────────────────────┴──────────────────────────┘

Orders + drawer                     Mobile (360px)
┌───────────────────┬──────────┐    ┌──────────────┐
│ [search] [status] │ #10952   │    │ #10952  Shipd│
│ no  date  status ─│ ●━━●━━◆━○│    │ ●━━━●━━━◆━○  │
│ ... ... ...  ▶    │ lines... │    │ £1,204 · 3 it│
│ ... ... ...       │ total    │    ├──────────────┤
│                   │ [View][⤓]│    │ ...          │
└───────────────────┴──────────┘    └─▣──≡──£──▦──☺┘
```

### Copy glossary
One name per action, used identically everywhere.
- **Statuses:** Shipped · Awaiting dispatch · Late
- **Actions:** View delivery note · Download delivery note
- **Account form:** Save changes → toast "Changes saved"
- **Orders columns:** Order no · Ordered · Status · Progress · Items · Total · Ship to (Revision 2)
- **Orders find:** Search all columns · Filters · Clear filters · Group by · Clear search and filters
- **Session:** Signed in as {ID} · Sign out
- **Errors:** say what is wrong and how to fix it, e.g. "Phone can only contain digits, spaces, +, ( ) and -".

### Angular talking points
Each is visible in the demo:
- `@defer` with skeleton `@placeholder` for the chart and calendar;
- signals and `httpResource` for loading states;
- zoneless change detection;
- view transitions;
- standalone components;
- one `tokens.css` rebrand.

## Stage 3 — Review (/design-reviewer)

**Verdict:** needed work, now fixed in stage 2.

- [x] Status was conveyed by colour only → chip now carries text and an icon. Voyage line has an aria-label, e.g. "Ordered 02/09, shipped 05/09, due 30/09".
- [x] Amber text on white was about 2:1 → amber used only as a fill behind ink (about 7.8:1). Amber text uses #8A5A00 (about 5.8:1).
- [x] AG Grid is unusable at 360px → card list below 720px.
- [x] Brand switcher could confuse testers → labelled "Brand preview", kept separate from Account.
- [x] Sign-in honesty → explicitly labelled as demo sign-in (Rams: honest).
- [x] Chart accessibility → "Show as table".
- [x] Customers with no orders (FISSA, PARIS) → designed empty state: "No orders yet. Orders placed with Northwind appear here."
- [x] Loading → skeletons within 100ms; no bare spinners.
- [x] Motion → transform/opacity only; `prefers-reduced-motion` honoured.
- [ ] Contrast of every brand preset in light and dark → verified at P3 proof.

Rams, one edit: KPI cards deleted (done above).

## Persistence
- No new tables or objects. Reads `dbo` only.
- One write: `UPDATE dbo.Customers` from Account, on the **local throwaway copy only**.
- Status is derived in SQL:
  - ShippedDate set → Shipped;
  - otherwise shifted RequiredDate ≥ today → Awaiting dispatch;
  - otherwise → Late.
- Date shift is whole months, computed at API startup so that the latest OrderDate lands in the current month. Today that is +340. It can be overridden by `Portal:DateShiftMonths`.

## Deliberate deviations from the full spec
All reversed if the demo is won:
- Auth is a demo header, not JWT.
- Spend and Schedule are computed client-side from the orders list, not by SQL projections.
- PDF is rendered client-side with pdfmake, not server-side.
- Typed client is hand-written, not NSwag.
- No Tailwind; CSS grid plus tokens only.
## Revision 2 — tester feedback on items 1 and 2 (23/09/2026)

Interface: **Web**. Source: roadmap "Tester Comments", items 1 and 2 failed.
Each finding below is traced to its root cause, then settled.
The spec phase that builds it is **P6** in `portal-lite-spec.md`.

### Stage 1 — What went wrong (/design-expert)

| # | Tester said | Real problem | Root cause |
|---|---|---|---|
| T1 | Status label too tall for the cells (desktop) | The chip fills the whole row height | The grid gives each cell a line-height equal to the row height. The chip has no line-height of its own, so it inherits that. |
| T2 | Expect a tooltip on hover when text is cut off | Cut-off text (e.g. long ship-to names) can't be read | No tooltip was designed |
| T3 | No way to log out or switch users | A demo can't change customer without clearing browser storage | Sign-out was never designed. The top bar shows only the customer ID. |
| T4 | "Voyage" column meaning unclear; wants header tooltips | Headers don't explain themselves. "Voyage" is our brand metaphor, not the buyer's word. | The design named the column after the signature graphic, not what it tells the buyer |
| T5 | Search, group and filter by every displayed column | Search covers 2 of 7 columns. Filtering covers only status. There's no grouping. | The scope was set at "quick search + status filter" |
| T6 | Mobile: the Orders option is just a dot | The bottom nav has no words and no icon | The shell stub's placeholder dot shipped as final. The wireframe's icons (▣ ≡ £ ▦ ☺) were never drawn. |
| — | *(found while settling T5)* Ordered shows "02 Sep" with no year | Orders span more than a year, so the date is ambiguous. Date filtering and grouping can't be explained without the year. | The short date format was chosen for space |
| — | *(found while settling T5)* Filtering everything away shows "No orders yet…" | The screen claims the customer has no orders when they do | One empty state serves two situations |

Options for T5 grouping, weighed against the licence rule (MIT/Apache only):

| Option | Verdict |
|---|---|
| AG Grid row grouping | **Rejected.** It's Enterprise-only, so it breaks the zero-licence-cost promise (demo beat 8). |
| Our own grouping, drawn as full-width group rows in the grid and headed sections in the card list | **Chosen.** Community-only, and the same logic serves both views. |
| Swap the grid library | Rejected. Too big a change for rework, and it discards B1's work. |

Options for T5 column filters:

| Option | Verdict |
|---|---|
| AG Grid floating filters in the header | **Rejected.** Status needs the Set Filter (Enterprise), so it would be a custom component. The built-in filters would also hide our group rows, and none of it reaches the phone card list. |
| One "Filters" panel with a labelled field per column, feeding the same filter logic for grid and cards | **Chosen.** Single source of truth, works at 360px, and every field has a real label. |

### Stage 2 — Settled solution (/frontend-design)

**Status chip (T1).**
- The chip sets its own line-height (1.25), so it's the same height in a grid cell, a card and the drawer.
- In a grid cell it's vertically centred.
- Height ≤ 24px, and it stays fully inside its cell.

**Tooltips on cut-off cells (T2).**
- Uses the grid's own tooltip, set to show **only when the text is truncated**, after a 400ms delay.
- The tooltip shows the full text exactly as the cell displays it.
- Applies to every text column: Order no, Ordered, Items, Total, Ship to.
- Status never truncates: the column gets a minimum width that fits "Awaiting dispatch".
- Progress is a graphic, so it doesn't get a truncation tooltip.
- Header tooltips always show on hover, whether or not the header is cut off. The spec settles how the grid does this.
- Numbers never truncate. Order no, Ordered, Items and Total each get a minimum width that fits their widest value, and Items and Total are right-aligned, as figures conventionally are. When space is short, Ship to is the column that gives way. (Found while probing: at 800px, "£12,615.05" was being cut off.)

**Sign out (T3).**
- The top bar's right side reads `Signed in as ALFKI` followed by a text button, **Sign out**. It's visible at every width.
- Sign out does four things:
  1. forgets the customer;
  2. drops the cached order list and any open order;
  3. goes to the sign-in page, replacing the history entry so Back doesn't return into the portal;
  4. makes sure the next customer never sees the previous customer's orders, not even for a moment.
- Switching customer means Sign out, then pick again. There's one path, and the sign-in page already says "choose a customer".
- There's no confirm dialog. Nothing is unsaved in B1/B2. B4's leave-guard covers Account, because sign-out is a route change.

**Column names and header tooltips (T4).**
- "Voyage" becomes **Progress**. The voyage line stays as the picture; the brand name stays out of the UI copy.
- Every header shows a tooltip on hover, with this copy (added to the glossary):

| Column | Header tooltip |
|---|---|
| Order no | Northwind's reference number for this order. |
| Ordered | The date you placed the order. |
| Status | Shipped: on its way to you. Awaiting dispatch: not shipped yet, still on time. Late: not shipped and past its due date. |
| Progress | The order's journey from ordered, through shipped, to due. The marker shows where it is today. |
| Items | How many different products are on the order. |
| Total | Value of the goods after discounts. Freight is charged separately. |
| Ship to | Who the order is delivered to. |

**Ordered date.** Shown as DD/MM/YYYY (e.g. 02/09/2026), in the grid and anywhere else the order date appears in a list.

**Find orders (T5).** The page header holds, left to right:
1. **Search**, with the placeholder "Search all columns".
   - It matches the displayed text of Order no, Ordered, Status, Items, Total and Ship to.
   - It ignores case and surrounding spaces. Money matches with or without the "£" and thousands commas, so "1204.5" finds £1,204.50.
2. **Status** select: All / Shipped / Awaiting dispatch / Late. Unchanged from B1; it stays one tap away because it's the most-used filter.
3. **Filters** button, with a count when active, e.g. "Filters (2)". It opens a panel below the header, with `aria-expanded`.
4. **Group by** select: None / Status / Ordered month / Items / Ship to.

**Filters panel.** One labelled field per column:

| Column | Field(s) — exact labels |
|---|---|
| Order no | "Order no contains" (text) |
| Ordered | "Ordered from", "Ordered to" (dates, inclusive) |
| Status | the header Status select (above) |
| Items | "Items from", "Items to" (whole numbers, inclusive) |
| Total | "Total from", "Total to" (£, inclusive) |
| Ship to | "Ship to contains" (text) |
| Progress | none — see note below |

Notes on the Filters panel:
- **Progress** has no field. It's a picture of the order date, status and due date. You filter it through Ordered and Status.
- There's a **Clear filters** button, which resets the panel fields and the Status select. Search and Group by are left alone.
- Filters combine with AND.
- Below 720px the panel stacks one field per row.

**Group by.**
- Group order:
  - Status: Late, Awaiting dispatch, Shipped (urgent first).
  - Ordered month: newest first, labelled "September 2026".
  - Items: ascending, labelled "3 items".
  - Ship to: A–Z.
- Order no and Total aren't offered. Every order number is unique, and totals are continuous amounts, so a group would almost always hold one order. This is deliberate; see "Told to WL" below.
- Each group header reads `{label} · {n} order(s) · {sum of totals}`, e.g. "Late · 3 orders · £1,234.50". It's a button that collapses and expands the group, with `aria-expanded`. Every group starts expanded, and they all expand again when Group by changes.
- In the grid, the header is a full-width row. In the card list, it's a section heading.
- Column sorting still works while grouped: rows sort **within** each group, and groups keep their order.

**No matches.**
- When a search or filter hides every order, the screen says "No orders match your search or filters." and shows a **Clear search and filters** button.
- The existing "No orders yet…" state stays for customers with no orders at all.

**Navigation labels (T6).**
- Every nav item, in both the bottom nav (<720px) and the side rail (≥1024px), shows a 20px line icon **and** its text label, which is always visible.
- Icons follow the wireframe glyphs: Overview ▣ grid, Orders ≡ list, Spend £, Schedule ▦ calendar, Account ☺ person.
- Icons are inline SVG with `aria-hidden`, so no icon-font dependency. The label is the accessible name.
- Tap target is at least 48px high.
- The active item shows its label in the primary colour plus a 3px indicator bar.
- Only nav items whose pages exist are shown, as now. The icons for later items are drawn now so B3/B4 only add entries.

### Stage 3 — Review (/design-reviewer)

- [x] Recognition over recall: headers explain themselves, and nav shows words, not dots.
- [x] Honest states: the no-matches state is separate from no-orders, and sign-out never shows the previous customer's data.
- [x] Consistency: one filter model, one grouping model, and the same glossary words in both views.
- [x] Accessibility:
  - every filter field has a visible label;
  - group toggles and the Filters button expose `aria-expanded`;
  - the chip keeps text plus icon;
  - nav labels are the accessible names.
- [x] Licence: no Enterprise grid feature is used (grouping and filtering are our own).
- [x] Cognitive load: the rarely-used filters sit behind one button with a count; Status stays one tap away.
- [ ] Hover tooltips don't exist on touch. That's acceptable: the grid is desktop-only, and cards wrap rather than truncate. Re-check if cards ever truncate.
- [ ] Grid tooltip colours in dark mode are B5's check, not this rework's.

### Told to WL
- Grouping by Order no and Total is deliberately not offered; see the Group by notes above. Progress has no filter of its own, because it's filtered through Ordered and Status. If the tester reads "every column" literally, this is a design call for WL to confirm.

### Pre-existing, not fixed here
- `e2e/orders.spec.ts` still duplicates the `parseMoney`/`signInAs` helpers (already noted in the spec).
