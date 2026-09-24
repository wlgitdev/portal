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

**Global:** header has a light/dark/system switch, a **Brand preview** menu and the **account menu** (Revision 3).

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
- **Session:** Account: {company name} · Switch to · Choose another customer… · Sign out (Revision 3)
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

## Revision 3 — second tester pass on item 1 (23/09/2026)

Interface: **Web**. Source: roadmap "Tester Comments", three new comments on item 1.
The spec phase that builds it is **P7** in `portal-lite-spec.md`.
Hi-fi reference: `docs/plans/mockups/orders-rev3.html` (open it from a checkout).
Frames A–G are named below.
**Revision 3 supersedes** the Revision 2 sections "Sign out (T3)", "Find orders (T5)", "Filters panel", "No matches", and the "No orders yet" copy.
Everything else in Revision 2 stands.

### Stage 1 — What went wrong (/design-expert)

| # | Tester said | Real problem | Root cause |
|---|---|---|---|
| U1 | Sign out looks bad, esp. on mobile | Raw ID in code type ("Signed in as ERNSH") next to a bare text link, squeezed into the phone top bar. It doesn't say *who* you are, and switching customer (the thing a demo actually does) takes a sign-out plus a hunt. | Revision 2 designed the action, not the identity. |
| U2 | The empty list looks bad | One grey sentence and a generic envelope icon. It doesn't say what will appear or what to do now. The no-matches version doesn't say *what* hid the orders. | Empty states were treated as an edge case, not a moment. |
| U3 | Filters are bad UX, esp. on mobile; won't impress | Eight bare inputs in an inline form. On a phone the form pushes every order off-screen. The Filters button is unstyled, dates read mm/dd/yyyy, and nothing shows which filters are on once the panel closes. | Revision 2 chose the right *model* (one panel, one filter logic) but gave it no *interaction design*. |
| — | *(found while reviewing)* Items and Total are left-aligned | Revision 2 required right-alignment; the tests didn't pin it, so it was missed | Test gap, now closed. |

**Prior art studied (the testers asked for well-loved patterns):**

| Pattern | Where it's loved | What we take |
|---|---|---|
| Filter sheet with live count | Airbnb search filters | A bottom sheet on phone. Results update live. The footer's primary button states the outcome: "Show 23 orders". |
| Price histogram + two-handle slider | Airbnb price filter | Total is chosen by **seeing where your orders' values fall**, not by typing guesses. |
| Status views with counts | Shopify admin order list, GitHub issues ("Open 12 · Closed 40") | Status becomes tabs with live counts: the most-used filter is visible and self-explaining. |
| Removable filter chips | Linear, Notion, Amazon | Active filters stay visible as plain-English chips, each with its own ×. |
| Account avatar menu | Gmail / Google account switcher | Identity lives in a monogram in the top bar; one tap opens who you are and what you can do. |
| "Who's watching?" quick switch | Netflix profiles | The demo's featured customers are one tap away: switch without going back to the sign-in page. |
| Teaching empty state | Mailchimp, Shopify first-run screens | Show what *will* be here (a ghosted voyage line), say it plainly, offer the next step. |

Options weighed:

| Decision | Options | Chosen |
|---|---|---|
| Filter surface | Inline form (today) · a sidebar that pushes the grid · **a sheet on phone and an anchored popover on desktop** | The sheet/popover, because it costs no permanent screen space and matches the prior art on both form factors |
| Apply model | "Apply" button · **live, with the count on the primary button** | Live. There's no hidden state, the grid visibly responds, and the button doubles as "done" |
| Status control | Select (today) · **tabs with counts** | Tabs. They're visible, one tap, and informative before you tap |
| Ship-to filter | "contains" text · **a checklist with counts, only when there's a real choice** | A checklist. Real data: 7 of 8 sampled customers ship to one name, so a field there would be a control that changes nothing (Rams: honest). |

### Stage 2 — Settled solution (/frontend-design)

**Direction.** It stays inside Harbour: the same palette, the same three faces, and no new colours. The one bold move is the **cargo histogram**, a Total filter drawn from this customer's own order values. Everything around it stays quiet: pills, chips and hairlines in the palette's existing tints.

**Tokens added to `tokens.css`** (derived, not new hues):

| Token | Value | Use |
|---|---|---|
| `--color-fjord-wash` | #EEF3F8 | Pressed/active pill fill, open account trigger |
| `--color-fjord-tint` | #D9E2EC (the existing primary-container) | Filter chips |
| `--color-line-soft` | #E1E6EA | Section dividers inside sheets and cards |
| `--radius-pill` | 999px | Pills, chips, search |
| `--shadow-float` | 0 24px 48px -16px rgb(20 32 46 / .45) | Popover, account menu |
| `--ease-out-sheet` | cubic-bezier(.2,.8,.2,1) | Sheet and popover entry |

**Monogram (identity).**
- Initials are the first letters of the company name's first two words, e.g. "Ernst Handel" → EH. A one-word name uses its first two letters.
- Big Shoulders 700, white, on a rounded square (radius 8px at 32px; 12px at 48px).
- The fill comes from a stable hash of the customer ID over four Harbour darks: fjord #1F3A5F, forest #2F5D3A, burgundy #6E2233 and deep sea #2B5D54. Each gives ≥ 7:1 with white.
- No presence dot: a customer isn't "online". It was tried in the mockup and removed as decoration.

**U1 — Account trigger and menu (frames C, G).**
- **Top bar, right side:**
  - ≥720px: a pill button with the 32px monogram, the company name (Plex Sans 500) and a chevron.
  - <720px: the monogram alone, in a 44×44 hit area.
  - Accessible name "Account: {company name}", with `aria-haspopup="menu"` and `aria-expanded`.
  - The raw ID and the bare "Sign out" link are gone from the bar.
- **Menu content (one component, two hosts):**
  - ≥720px: a menu anchored to the trigger, right-aligned, 340px wide, with `--shadow-float`.
  - <720px: a bottom sheet with a grab handle.
  - Contents, top to bottom:
    1. A header: 48px monogram, the company name (Plex Sans 600, 17px), and "Customer {ID}" (Plex Mono, 13px, secondary ink).
    2. An honesty note in a mist box with an info icon: "Demo sign-in: switch customer without a password."
    3. The group label "Switch to", then one menu item per **featured customer other than the current one**. Each shows its monogram, name, and ID right-aligned in mono.
    4. "Choose another customer…" (people icon), which opens the sign-in page.
    5. A divider, then "Sign out" (exit icon).
  - Every item is a `menuitem`. Arrow keys move between items, and Esc closes and returns focus to the trigger.
- **Switching:**
  - It signs out and back in under the hood, and drops cached orders and any open drawer. The previous customer's orders never flash (Revision 2's rule stands).
  - It lands on /orders, and a toast reads "Now viewing {company name}".
- **Sign out** goes to sign-in (replacing the history entry), with the toast "Signed out of {company name}".
- The session remembers the company name as well as the ID, taken from the card or search result the user picked, so there's no extra API call.

**U3 — Finding orders (frames A, B, F).**

*Toolbar.*
- **≥720px:**
  - Row 1 holds the "Orders" title and search. Search is a 380px pill with a magnifier icon and a clear (×) button when filled.
  - Row 2 holds the status tabs on the left, then on the right the **Filters** pill and the **Group by** pill.
- **<720px:**
  - Row 1: search (flex), plus a 44px round **Filters** button (icon only) with a count badge.
  - Row 2: status tabs, horizontally scrollable, with a fade on the right edge.
  - Group by moves into the Filters sheet.
  - Result: the first order card sits about 90px higher than in Revision 2.
- **Search:**
  - Placeholder "Search all columns", unchanged.
  - Matching is as in Revision 2 (every displayed column, money with or without £ and commas).

*Status tabs* (replaces the Status select).
- A `radiogroup` named "Status" containing All · Late · Awaiting dispatch · Shipped, in that order (urgent first, matching the group order).
- Each shows a 7px status dot (except All) and a live count in mono. Counts reflect search and filters, so the tabs preview their result.
- The selected tab is fjord 600, with a 3px underline bar.
- Accessible name is label then count, e.g. "Late 1".

*Filters button.*
- A pill (≥720px) or round icon button (<720px) with a filter-lines icon.
- When filters are active: a fjord badge with the count, the button outline turns fjord, and it takes the wash fill.
- Accessible name "Filters" or "Filters ({n})", where **n = the number of active filter chips**. Status and search aren't counted: they're already visible.
- `aria-expanded` and `aria-controls` point at the surface.

*Filters surface (one component, two hosts).*
- **<720px:** a modal bottom sheet (`role="dialog"`, `aria-modal`, name "Filters"):
  - 20px top radius, grab handle, scrim at 42% ink;
  - a sticky head ("Filters" in Big Shoulders 600 24px, plus a round close button);
  - a scrolling body and a sticky footer;
  - closes on scrim tap, swipe down, Esc or close, returning focus to the Filters button.
- **≥720px:** a non-modal popover anchored under the Filters pill:
  - 420px wide, max 70vh, with a pointer nub;
  - closes on outside click or Esc.
- **Footer:**
  - left, the text button "Clear filters", which resets every section (not search, status or group);
  - right, the primary button **"Show {n} orders"**, which just closes the surface. The number is the live result count ("Show 1 order" when singular, "Show 0 orders" when none).
- Filters apply live as they change. The page behind updates, and the chips appear.
- **Sections**, in this order. Each has a Plex Sans 600 heading, and a "Reset" link when the section is set:
  1. **Group by** (phone only): single-choice chips None · Status · Ordered month · Items · Ship to, as a radiogroup named "Group by".
  2. **Ordered:**
     - single-choice chips Any time · Last 30 days · Last 3 months · Last 12 months · Custom dates;
     - "Custom dates" reveals two date fields, "Ordered from" and "Ordered to", both inclusive;
     - the presets count back from today in the browser's local date: 30 days, and the same day 3 or 12 months back.
  3. **Total — the signature:**
     - Hint: "{k} of your {N} orders fall in this range."
     - The histogram:
       - 16 equal bins from £0 to the customer's largest order total, rounded up to the next £500;
       - it counts orders that match everything *except* Total, so it shows what you'd get;
       - bars inside the range are fjord, outside are the line colour, and they change colour over 120ms.
     - Under it, a two-thumb slider on a £50 step, as two range inputs named "Minimum total" and "Maximum total", with 24px thumbs.
     - Under that, two money fields, "Total from" and "Total to", each with a £ prefix and mono digits, kept in step with the thumbs.
     - A thumb at its extreme means "no limit" on that side.
  4. **Items:**
     - hint "Different products on the order.";
     - two stepper rows, "Items from" and "Items to";
     - each is a numeric input showing "Any" when empty, between round − / + buttons named "Decrease Items from", "Increase Items from", and so on.
  5. **Order no:** one field, "Order no contains", with a # prefix and mono.
  6. **Ship to:**
     - when the customer's orders go to ≥2 ship-to names, a checkbox list, one per name, with its order count right-aligned in mono;
     - otherwise one sentence: "All your orders go to {name}."
- Below 720px everything stacks at full width. The popover never shows Group by: the desktop pill owns it.

*Active filter chips.*
- A wrapping row under the toolbar, shown only when at least one filter is active. The chips are fjord-tint pills in Plex Sans 500 13px, with the value in 600.
- Chip text, exactly:
  - "Ordered last 30 days", "Ordered last 3 months" or "Ordered last 12 months";
  - "Ordered 01/06/2026–31/08/2026", "Ordered from 01/06/2026" or "Ordered until 31/08/2026";
  - "Total £1,000–£6,000", "Total £1,000 or more" or "Total up to £3,000";
  - "Items 4–5", "Items 4" (from = to), "Items 4 or more" or "Items up to 4";
  - "Order no contains 110";
  - "Ship to Alfreds Futterkiste" (one ticked), or "Ship to 2 places" (several).
- Each chip has a remove button (≥28px hit area) named "Remove filter: {chip text}".
- With 2 or more chips, a trailing "Clear all" text button does the same as Clear filters.
- Chips enter with a 120ms fade and scale from .96.

*Group by pill* (≥720px).
- A native select dressed as a pill, with a visible label "Group by" in secondary ink, then the value, then a chevron.
- It's labelled "Group by", and its options are unchanged.

*Grid.* Items and Total are right-aligned, headers included, in mono, as Revision 2 required.

**U2 — Empty states (frames D, E).**
- **No orders at all.** The toolbar (search, tabs, filters, group) is **hidden**, because controls that can't change anything are noise. Below the title sits a white card, 16px radius, centred, containing:
  - A ghosted voyage line:
    - a dashed fjord-tint route with the three real stops (circle, diamond, circle) labelled Ordered · Shipped · Due in mono 12px;
    - the hull glyph sits above the Ordered stop and bobs 2px on a 3.2s loop;
    - it's static under reduced motion, and the whole drawing is `aria-hidden`.
  - The heading "No orders yet" (Big Shoulders 600, 30px).
  - The body: "When {company name} orders from Northwind, each order appears here so you can follow it from ordered, to shipped, to due."
  - A secondary button, "Choose another customer" (people icon), which goes to sign-in. It's a demo-honest next step.
  - It keeps `data-testid="orders-empty-state"`.
- **Nothing matches.** A dashed-border white card in place of the list (`data-testid="orders-no-matches"`), containing:
  - The heading:
    - "No orders match “{search}”" when search is set, with the query in mono fjord;
    - "No orders match these filters" when only filters or status are set.
  - The body: "All {N} of your orders are hidden by {this search / these filters / this search and {n} filter(s)}. Search looks at order no, date, status, items, total and ship to."
  - The same removable chips (plus a "Search {term}" chip when searching).
  - The primary button "Clear search and filters", which resets search, filters and status to All. Group by stays.

**Motion (all with transform and opacity only; none under reduced motion).**
- Sheet: rises 240ms on `--ease-out-sheet`, leaves 180ms.
- Popover and menu: fade plus a 4px rise over 160ms.
- Chips: 120ms enter.
- Hull bob: the only ambient motion, and only in the no-orders state.

**Copy glossary additions.**
- Account: {company name} · Customer {ID} · Switch to · Choose another customer… · Sign out
- Toasts: Now viewing {company name} · Signed out of {company name}
- Filters: Show {n} orders · Clear filters · Clear all · Reset · Custom dates · Any time
- Empty: No orders yet · No orders match · Clear search and filters · Choose another customer

### Stage 3 — Review (/design-reviewer), run against the mockup screenshots

- [x] **Visibility of system status:** live counts on the tabs and on "Show n orders". Chips keep active filters visible after the surface closes.
- [x] **Recognition over recall:** there are presets for dates, and the histogram shows where the values actually are instead of asking for a guess.
- [x] **User control:** every filter has its own ×. There's also a Reset per section, Clear filters, Clear all, and Esc or swipe to dismiss.
- [x] **Mobile ergonomics:**
  - the primary actions sit in the sheet footer, in thumb reach;
  - the first order is visible without scrolling;
  - every hit target is ≥ 44px, except chip removes at ≥ 28px, which WCAG 2.5.8 accepts.
- [x] **Honesty (Rams):**
  - there's no ship-to control when there's nothing to choose;
  - no toolbar when there are no orders;
  - the demo sign-in is labelled as such in the account menu;
  - no presence dot.
- [x] **Accessibility:**
  - the sheet is a modal dialog with a focus trap and the popover a non-modal dialog;
  - the tabs are a radiogroup;
  - the slider thumbs are native range inputs with names;
  - every chip remove button has a unique name;
  - monogram fills are ≥ 7:1.
- [x] **Consistency:** one surface component for sheet and popover, and one menu component for sheet and menu. Chip text uses the same vocabulary as the section headings.
- [x] **Chanel pass:** removed the presence dot and moved Group by into the sheet on phone. The mockup's first pass also had a result sentence *and* a count in the footer; that was cut to the button alone.
- [ ] Date field format follows the browser's locale (UK browsers show DD/MM/YYYY). The design can't force it on a native date input; acceptable for the demo.
- [ ] Dark-mode values for the new tokens are B5's job.

### Told to WL
- The Ship-to "contains" field from Revision 2 is gone. It's replaced by a checklist that only appears when a customer really ships to more than one name.
- Status moves from a select to tabs. The already-passing B1 test is updated to match; DES owns that change.

## Revision 4 — third tester pass on item 1 (23/09/2026)

Interface: **Web**. Source: roadmap "Tester Comments", seven new comments on item 1 after commit 9df37be.
The spec phase that builds it is **P8** in `portal-lite-spec.md`.
**Revision 4 supersedes** the Revision 2 "Status chip (T1)" section, the Progress column and its header tooltip, the Revision 3 "Group by pill", and the grid's fixed `calc(100vh - 200px)` height.
Everything else in Revisions 2 and 3 stands.

### Stage 1 — What went wrong (/design-expert, compressed)

Evidence is the tester's comments plus a read of the shipped code; no interview was run (same as Revisions 2 and 3).

| # | Tester said | Real problem | Root cause |
|---|---|---|---|
| V1 | At a certain width the nav isn't shown at all | Between 720px and 1023px there's no way to move between pages | The bottom nav hides at ≥720px, but the side rail only appears at ≥1024px. Two breakpoints, one gap. |
| V2 | Scroll to the bottom and the top bar is gone; make it sticky or fit the screen | The account menu and brand name scroll away; on desktop the Orders page scrolls at all | The top bar scrolls with the page. The grid's height is a guess (`100vh - 200px`) that ignores the chips row and the real top-bar height. |
| V3 | The rail's "Orders" label is too close to the highlight line on its left | The indicator bar touches the label | Each rail link shrinks to the width of its label, so the 3px indicator (the link's left border) sits right against the text instead of at the rail's edge. |
| V4 | The progress dots mean nothing; merge them into Status as fixed stops on a line | Two columns say the same thing twice, and the one with the picture can't be read without a legend | The voyage line plots *dates* (the hull sits wherever today falls between ordered and due), so the dots move around and don't map to any word the buyer knows. The status column already says where the order is. |
| V5 | Filters and Group by text look different | Two pills side by side in different fonts | Browsers don't let buttons inherit the page font. The Filters pill is a `<button>` (system font); the Group by pill is a `<div>` (IBM Plex Sans). |
| V6 | Clear/Show buttons are cut off on a short desktop screen | The one way to close the panel is off-screen | The popover is capped at 70% of the window height, measured from the top of the window, but it opens ~150px down, so its footer falls off the bottom. |
| V7 | Group by no longer matches the other dropdowns | Its list is the operating system's native select list | Revision 3 dressed the *closed* select as a pill; the *open* list is still the browser's own, unlike the Filters and account surfaces. |

Also settled here: DEV's open question from the P7 build note. On a phone the account menu opens in a modal sheet, which correctly hides the rest of the app from assistive tech, so the test can't find the trigger by its role any more. The fix is in the test, not the app (see Stage 3).

Options weighed:

| Decision | Options | Chosen |
|---|---|---|
| Nav gap (V1) | Side rail from 720px · a top-bar tab row at tablet widths · **bottom nav up to 1023px** | The bottom nav. At 720–1023px a rail would squeeze the grid below its column minimums (it needs ~740px of table), forcing sideways scrolling. A bottom tab bar at tablet widths is what iPad apps do. |
| Top bar (V2) | Content scrolls inside a fixed frame · **sticky top bar, and the desktop Orders page sized to the screen** | Both halves of the tester's "either/or". Sticky keeps normal page scrolling (and the phone browser's collapsing address bar). Orders on desktop fills exactly the space left, so only the grid scrolls. |
| Status + Progress (V4) | Keep both · drop Progress · **one status tracker: fixed stops on a line, the current one lit, its name beneath** | The tracker, as the tester described. It's the parcel-tracking pattern people know (Royal Mail, Amazon, Domino's "pizza tracker"). |
| Group by (V7) | Keep native select · **menu on the same surface as Filters and account** | The menu. One pop-up surface for every pill in the header. |

### Stage 2 — Settled solution (/frontend-design)

**Direction.** Still Harbour; no new colours or faces. The status tracker takes over from the voyage line as the list's signature: a short route with three port-of-call stops. Everything else in this revision is repair and should be invisible.

**V1 — Nav at every width.**
- Below 1024px: the bottom nav (unchanged look). At ≥1024px: the side rail. Exactly one shows at any width.
- The 720px breakpoint keeps everything else it controls (sheets vs popovers, cards vs grid). Only the nav moves to 1024px.
- The page leaves room for the bottom nav whenever it shows.

**V2 — Top bar always in view.**
- The top bar is sticky at the top of the window at every width, 64px high (new token `--top-bar-height`), above page content but below overlays, sheets and the order drawer.
- The side rail is sticky too and runs the full window height.
- **Desktop Orders fits the screen** (≥720px): the Orders page fills exactly the window height minus the top bar (and minus the bottom nav when it shows). The title, toolbar and chips take what they need and the grid takes the rest, scrolling inside itself. The page never scrolls. On a very short window the grid keeps at least 240px and the page may scroll; the sticky top bar still holds.
- Phone: unchanged, the page scrolls under the sticky top bar.

**V3 — Rail spacing.**
- Each rail link spans the full rail width (88px). The 3px indicator runs down the rail's left edge; the icon and label stay centred in the link.
- That leaves at least 12px between the indicator and the label (about 20px for "Orders").

**V4 — Status tracker (replaces the Status chip and the Progress column).**

```
 Awaiting dispatch          Late                       Shipped
 (■)━━━━(◷)────(⛴)        (■)━━━━(!)────(⛴)        (■)━━━━(◷)━━━━(✓⛴)
     Awaiting dispatch           Late                          Shipped
```

- Three fixed stops, evenly spaced at the start, middle and end of the line. Each has its own icon:
  1. **Ordered** — a receipt;
  2. **Dispatch** — a clock (a warning triangle when Late);
  3. **Shipped** — a ship.
- Each stop is `done`, `current` or `to do`:

| Status | Stop 1 | Stop 2 | Stop 3 | Name shown beneath |
|---|---|---|---|---|
| Awaiting dispatch | done | **current** (amber) | to do | "Awaiting dispatch", centred under stop 2 |
| Late | done | **current** (red, warning icon) | to do | "Late", centred under stop 2 |
| Shipped | done | done | **current** (sea-glass) | "Shipped", right-aligned under stop 3 |

- Look:
  - *Done:* fjord fill, white icon.
  - *Current:* Awaiting — signal-amber fill, icon and name in amber text #8A5A00. Late — harbour-red fill, white icon, red name. Shipped — sea-glass fill, white icon, name in the existing shipped-text colour.
  - *To do:* surface fill, 1.5px outline-variant ring, outline-coloured icon.
  - Line segments leading into a done or current stop are fjord; into a to-do stop, outline-variant. 2px thick.
- Sizes:
  - *Compact* (grid and phone cards): 20px stops, 12px icons; the name in Plex Sans 600 12px, line-height 1.25, 4px under the line.
  - *Large* (order drawer): 32px stops, 18px icons, the name at 14px.
- The status name is real text (search, sort and screen readers read it). The drawing is decorative (`aria-hidden`); colour is never the only signal, because every stop has its own icon and the current one is named.
- No motion. It's a list; it should be calm.
- **Grid:** one "Status" column holds the tracker (min width 168px). The Progress column is removed. Rows grow to 52px to fit the line and the name. Sorting Status sorts by urgency: Late, then Awaiting dispatch, then Shipped (the same order as Group by Status).
- **Status header tooltip (new copy):** "Each order moves from Ordered, to Awaiting dispatch, to Shipped. Late means it hasn't shipped and is past its due date."
- **Phone cards:** the tracker replaces both the chip and the route line: order no on the left of the top row, the tracker full width in the middle, items and total along the bottom (as now).
- **Order drawer:** the large tracker replaces the large voyage line. Under it, a row of three facts: **Ordered** {DD/MM/YYYY} · **Shipped** {DD/MM/YYYY, or "Not yet"} · **Due** {DD/MM/YYYY}. The dates the voyage line used to imply are now written down.
- The status *filter tabs* keep their coloured dots: they're a legend for the tracker's current-stop colours.
- The voyage line stays only where it's decoration (the sign-in page) and where B3's Overview is specified to use it. See "Told to WL".

**V5 — Same type in every control.**
- Every button, input, select and textarea inherits the page's font (a one-line base rule). This fixes the Filters pill and stops the same bug recurring anywhere else.
- Filters and Group by pills then match exactly: Plex Sans 500, 14px.

**V6 and V7 — One pop-up surface.**
- Filters (desktop), Group by and the account menu (desktop) all open on one shared surface: white, 14px radius, `--shadow-float`, the 160ms fade-and-rise entry (none under reduced motion).
- The surface never runs off the screen. It keeps a 16px margin from the window edges; if the room below the trigger is too short, it shrinks to fit. It opens upward only if there's more room above.
- When shrunk, a surface's own header and footer stay put and only the middle scrolls. For Filters that means "Clear filters" and "Show {n} orders" are always visible.

**V7 — Group by menu (≥720px).**
- The pill is a button, styled like the Filters pill: group icon, "Group by" in secondary ink, the current choice in 600 (e.g. "Group by **Status**"), then a chevron that turns when open.
- It opens a menu named "Group by" on the shared surface, right-aligned under the pill, at least 200px wide. The choices are None, Status, Ordered month, Items, Ship to; the current one is checked, with a tick icon (not colour alone).
- Picking a choice applies it and closes the menu. Esc closes it and returns focus to the pill. Arrow keys move between choices.
- Phone: unchanged, Group by stays in the Filters sheet.

**Copy glossary changes.**
- Orders columns: Order no · Ordered · Status · Items · Total · Ship to ("Progress" retired).
- Tracker stops: Ordered · Awaiting dispatch / Late · Shipped. Drawer facts: Ordered · Shipped · Due · Not yet.

### Stage 3 — Review (/design-reviewer)

**Verdict:** solid after the changes below.

- [x] **Visibility (H1):** the top bar and nav are reachable at every width and scroll position; the status is readable at a glance without a legend.
- [x] **Match with the real world (H2):** the tracker is the parcel-tracker pattern; the drawer states dates in words instead of implying them by position.
- [x] **Consistency (H4):** one pop-up surface, one control font, one status picture in grid, cards and drawer.
- [x] **Minimalism (H8, Rams 10):** one column instead of two; no motion in the list.
- [x] **Found in review and fixed:** a side rail from 720px would push the grid into sideways scrolling at tablet widths. Changed to the bottom nav up to 1023px.
- [x] **Found in review and fixed:** the "Shipped" name centred under the last stop would overflow the cell. It's right-aligned to the line's end.
- [x] **Accessibility:**
  - the tracker's name is text, and each stop has a distinct icon, so meaning never rests on colour;
  - red name on white ≈ 4.9:1 and amber text on white ≈ 5.8:1; white icons on the fills are graphics (≥ 3:1);
  - the Group by menu uses menu/menuitemradio roles with `aria-checked`, with arrow keys and Esc;
  - the Filters footer is always reachable, so the panel can always be closed without Esc.
- [x] **The phone account-menu test (DEV's P7 question):** the modal sheet correctly hides the rest of the app from assistive tech, as Angular's dialog always does. The test now finds the trigger by its label instead of its role; the assertion itself (`aria-expanded="true"`) is unchanged.
- [ ] Row height grows from ~42px to 52px, so fewer orders fit on screen. Acceptable for the demo's order counts (≤ 31); re-check if real customers have hundreds.
- [ ] Dark-mode values for the tracker's fills are B5's check, as before.

### Told to WL
- The Overview page (B3, not built yet) is still specified with the voyage line as its hero. Recommend it adopts the status tracker too, so the portal speaks one status language. That's a decision for when B3 is planned.
  → Settled 24/09/2026, when B3 was built: WL chose the status tracker. See roadmap.md's item 3 build note.
- The bottom nav now shows up to 1023px, not just on phones. That's a deliberate change from Revision 2's "phone only".

### Pre-existing, not fixed here
- `e2e/orders.spec.ts` still duplicates `parseMoney`/`signInAs` (noted since P6).
- DEV reported `e2e/orders-table.spec.ts` "a cut-off cell shows its full text on hover" and `e2e/orders.spec.ts` "filter Late and open one whose lines sum to its total" as flaky (font-loading and render timing). Not reproduced or fixed here; wants its own issue.
