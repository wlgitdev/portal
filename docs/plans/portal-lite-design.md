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
- Desktop (AG Grid) columns: Order no (mono), Ordered, Status chip, mini voyage, Items, Total, Ship to.
- Quick search, a status filter (All / Shipped / Awaiting dispatch / Late) and Export CSV.
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

**Global:** header has a light/dark/system switch and a **Brand preview** menu.

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