# Roadmap

Status meanings: Waiting for Planning · Waiting for Dev · In Progress · Waiting for Release (T) · In Testing (T) · Waiting for Dev (failed) · Ready for Release. Testers set only the last two, the failed status will be accompanied with comments (see "Tester Comments for Waiting for Dev (failed)" section).

## Now — Customer portal demo (23/09/2026)
Show sales and testers a customer portal they can click through. Done means every item below is Ready for Release before the demo.
**Status:** In Progress

| # | Item | Status | To test |
|---|---|---|---|
| 1 | Sign in as a customer and browse your orders | Waiting for Release (T) | Sign in as Alfreds, search orders, filter "Late", open one and check the lines add up to the total. On desktop, hover a header and a cut-off cell. Tap the status tabs, open Filters, drag the Total range and remove a chip. Switch customer from the top-right menu, then sign out. On a phone, check the Filters sheet and the account sheet. Then: drag the window from phone to desktop width and check a menu always shows; scroll to the bottom and check the top bar stays; read each order's status on its tracker; shrink the window's height and check Filters' buttons stay on screen; open Group by. |
| 2 | Download a delivery note for any order | Ready for Release | Open an order, download its delivery note, check the PDF totals match the screen. On a phone, check each bottom menu item shows a picture and its name. |
| 3 | See spending and delivery dates at a glance | Waiting for Release (T) | Open Spend and Schedule, switch Spend to table view, click a calendar entry to open the order. |
| 4 | Edit your contact details | Waiting for Release (T) | Enter letters in Phone and try saving; fix it, save, reload and check it stuck. |
| 5 | Switch brand and dark mode | Waiting for Dev | Pick each brand under Brand preview in light and dark; check everything stays readable, including on a phone. |

## Now — PM showcase round 2 (25/09/2026)
Show the PM deeper tables, calendars, forms and order-and-lines views, all built only from Angular's own parts. Done means every item below is Ready for Release.
**Status:** Waiting for Dev

| # | Item | Status | To test |
|---|---|---|---|
| 6 | Sort and group orders like a desktop grid | Waiting for Dev | On a desktop, click Status then Shift+click Total and check the order and the 1/2 marks. Drag Ship to into the grouping strip, then group by Status and Ordered and check each group's totals. Hide a column, reload, then Reset view. Switch to Compact, tick two orders and read the sum at the bottom. Expand an order to see its lines, turn on Show preview, and export to CSV. On a phone, sort by Total then Order no and open a card's lines. |
| 7 | Work with an order and its lines side by side | Waiting for Dev | On a desktop, switch Orders to Workspace and pick an order: its lines and details fill in, and survive a reload. Drag the divider, hide and pin Order details, maximise Orders and press Esc. Open Products bought, pick a product and check the matching orders light up. Move a panel, reload, then Reset layout and Undo. |
| 8 | Plan deliveries on a richer calendar | Waiting for Dev | Open Schedule and try Month, Week, Agenda and Timeline. Untick Shipped in the key. Use Today and the arrows, pick a date in the small calendar, hover an entry, and check late orders run red past their due date on Timeline. |
| 9 | Explore spending in a richer chart | Waiting for Dev | Open Spend, switch between 12 and 24 months, hover a bar, then click it and check Orders shows only that month. Check the top 5 products. |
| 10 | Set your delivery preferences | Waiting for Release (T) | Under Account, open Delivery preferences and fill in every field. Try a 1-hour window, no delivery days and a 12 °C limit, and read the messages. Save, reload and check it all stuck. |
| 11 | Print a delivery note or save it as PDF | Waiting for Dev | Open an order and press Delivery note. Check the totals match, then print or save it as PDF and check it fits A4. |
| 12 | See what the portal is built from | Waiting for Dev | From the account menu open About this build and check every part is listed with who makes it. |

## Next — if the demo is won
- Real sign-in with email and password, staying signed in safely
- Delivery notes produced by the server, not the browser
- Spend and schedule figures calculated by the database
- Portal installed on the test server with a secure address
- Add a new kind of record in under 5 minutes (the "Suppliers" demo)
- Portal keeps working when the database is switched off (layout-swap demo)
- ~~Setup guide so a colleague can run it in under 10 minutes~~ — done early, see README.md
- Confirm company turnover for the PDF library decision (carried from full spec)

## Tester Comments for Waiting for Dev (failed)
Answered by DES on 23/09/2026. Each comment is kept word for word, with the fix it leads to shown underneath. DEV builds the fixes from `portal-lite-spec.md` → phase **P6** (design: `portal-lite-design.md` → "Revision 2").

item 1:
 - in desktop mode the status column label height is too large for the cells.
   → The status label shrinks to fit inside its row. (P6 R1)
 - when the cells are hovered over, if the text content is larger than the column width then a tooltip is expected by the user that displays the full cell content
   → Cut-off text shows in full on hover. Numbers and dates are never cut off. (P6 R2)
 - there is no way to log out/switch users
   → A "Sign out" button sits in the top bar; you then pick another customer. (P6 R6)
 - the meaning of the 'Voyage' column is unclear, hovering over the column headers should show tooltip tooltips to explain the column
   → "Voyage" is renamed "Progress", and every header explains itself on hover. Dates now show in full as DD/MM/YYYY. (P6 R2)
 - the table should allow searching, grouping, filtering by every displayed column
   → Search now covers every column. A new "Filters" panel has a field for each column, and there's a new "Group by" choice (Status, Ordered month, Items, Ship to). A message now shows when nothing matches. (P6 R3–R5)
   → Not included, by design: grouping by Order no or Total (almost every group would hold one order), and a separate Progress filter (Ordered and Status already cover it). WL to confirm with the tester.
 - Sign out: look at prior art for this functionality at the moment it looks pretty bad, especially on mobile
   → Answered by DES on 23/09/2026. The top bar now shows the customer's initials and name. Tapping it opens an account menu (a sheet on a phone), where you can switch to another featured customer in one tap, choose another customer, or sign out. This follows the Gmail account switcher and Netflix's "Who's watching?". (P7 R8–R10)
 - List: it looks pretty bad right now when empty again look at prior art for what to display here. 
   → A customer with no orders sees a drawing of how an order's journey will look, a plain explanation, and a "Choose another customer" button; the search and filter controls are hidden. When a search or filter hides everything, the screen names what hid the orders, lets you remove each one, and offers one button to clear them all. (P7 R14)
 - Filters: it’s all pretty bad ux, esp on mobile. This won’t impress anybody again. Look at prior art that is well loved for this functionality.
   → Status becomes tabs with live counts (as in Shopify). Filters open as a sheet on a phone and a panel on desktop (as in Airbnb), and results update as you go, with a "Show 23 orders" button. Total is chosen on a bar chart of your own order values. Dates have quick picks such as "Last 3 months". Filters that are on stay visible as chips you can remove one at a time. (P7 R11–R13)
   → Also fixed: Items and Total now line up on the right. (P7 R15)
   → See the picture: `docs/plans/mockups/orders-rev3.html`.
Third pass, after commit 9df37be (answered by DES on 23/09/2026; build from `portal-lite-spec.md` → phase **P8**, design → "Revision 4"):
 - navigation: there is a certain width of screen at which the nav bar is no longer shown in any way.
   → Between tablet and small-laptop widths neither menu was showing. The bottom menu now shows on every screen narrower than 1024px, and the side menu from there up, so exactly one is always there. (P8 R17)
 - navigation: when scrolling to the bottom of the page the top nav bar is no longer visible. it should be either sticky or everything sized to fit the screen height without scroll available.
   → Both: the top bar now stays pinned on every page, and on desktop the Orders page fits the screen exactly, so only the table scrolls. (P8 R18)
 - navigation: in desktop view the left hand side nav bar orders option wording is too close to the highlight line on it's left
   → Each side-menu item now spans the full menu width, so the highlight line sits at the edge with clear space before the words. (P8 R19)
 - the orders list: the progress dots mean nothing. if they're trying to convey current status relative to the range of statuses then better off merging them with the status column as it becomes redundant i.e fixed position status icons on a line instead and progressing between the statuses on the bar by highlighting different ones as per their current status and displaying the status wording underneath. this would make the status column redundant, which means that it can then be removed.
   → Done as described. Status and Progress become one "Status" column showing three fixed stops on a line: Ordered, Awaiting dispatch (or Late), Shipped. Each stop has its own picture, the current one is lit in its status colour, and its name sits underneath, like a parcel tracker. Phone cards and the order panel use the same tracker, and the order panel now spells out the Ordered, Shipped and Due dates. Sorting Status puts Late first. (P8 R20–R21)
 - filter/group: the filters button text seems to have a different look (font/thickness/size?) to the group by button text.
   → Confirmed: the Filters button was using the computer's default font. Every button and field now uses the portal's font. (P8 R22)
 - filter/group: the clear/show buttons on the dropdown of the filter is cut off if the desktop screen height is too small
   → The Filters panel now shrinks to fit the screen; its middle scrolls while "Clear filters" and "Show n orders" stay on screen. (P8 R23)
 - filter/group: the group by drop down is no longer cohesive with the other dropdowns (filter, account setup).
   → Group by now opens the same style of panel as Filters and the account menu, with the current choice ticked. (P8 R23–R24)

Item 2:
 - in mobile mode, the orders option just shows as a dot. it's unclear to the user what it's supposed to be.
   → Every menu item shows a picture and its name, on phone and desktop. (P6 R7)

## DEV next step
Showcase round 2 (items 6–12): `showcase-2-spec.md` phases S1–S10 (design `showcase-2-design.md`, picture `mockups/showcase-2.html`). Item 6 (S1–S4, bundle B6) is coded but not green — see item 10's build note below — so it correctly stays **Waiting for Dev**; wants a pass to fix its own failures before it's trusted. Item 10 (S8) was pulled forward out of turn (WL, 25/09/2026, time-crunch): S1 was its only real technical prerequisite and was already in place from item 6's work, so it built cleanly on its own without 7, 8 or 9. Still outstanding, untouched this round: items 7, 8, 9, 11, 12 (S5, S6, S7, S9, S10) and item 5 (brand/dark mode, bundle B5) — all still **Waiting for Dev**. Item 11 replaces item 2's download with a print-ready page, so item 2 goes back to testing once item 11 lands.

Previous build note (P7, 23/09/2026), kept for the record: two tests were reported flaky, independent of the build: `e2e/orders-table.spec.ts` "a cut-off cell shows its full text on hover" and `e2e/orders.spec.ts` "filter Late and open one whose lines sum to its total". The first is still flaky as of this round (below); not fixed, wants its own item.

## DEV build note — item 4 (23/09/2026)
WL pulled item 4 forward out of turn (time-crunch); item 1's P8 rework above is still unbuilt and untouched. `portal-lite-spec.md` P2/P4 and `portal-lite-design.md`'s Account screen already fully specced bundle B4, so no new spec/design doc was needed. Built `GET`/`PUT /api/me` and the Account screen (Contact/Address/Phone sections per the design) straight from those. Added the `db/portal-lite.sql` CustomerProfile query P1 called for but never got written.

`.skip` removed from `e2e/account.spec.ts` only, assertions unchanged; all 7 pass. Full suite re-run clean otherwise: everything still pending for items 1/3/5 is still correctly pending, and the two P7 flaky tests above are still just flaky (pass on their own).

### Pre-existing, not fixed here
- `PortalApi.searchCustomers` (P4's "typed PortalApi service") has never actually been called — sign-in and OrdersStore both fetch via `httpResource` directly instead. `updateMe` was added to `PortalApi` here since a one-shot PUT needs an imperative call anyway; the dead `searchCustomers` method and the sign-in/orders drift are untouched. Wants its own item if it's worth resolving.
- This session's cloud sandbox needed a local Node bump (22.22.2 → a `/usr/bin` 24.x install ahead of the pinned `/opt/node22` on `PATH`) before `ng serve`/Playwright's webServer would start at all — same root cause as the P6 note above, just hit again. Nothing in the repo changed for this; flagging in case the sandbox image itself is worth fixing so the next session doesn't repeat it.

## DEV build note — item 1, P8 rework (23/09/2026)
Built `portal-lite-spec.md` phase **P8** (R17–R25, design → "Revision 4") straight from the spec and design doc; no gaps found. Nav now splits bottom-nav/side-rail at 1024px (was two different breakpoints with a gap between them); top bar and side rail are sticky with a new small z-index scale in `tokens.css`; Orders' own height is capped to exactly what's left under the chrome at ≥720px so only the grid scrolls (the old `calc(100vh - 200px)` guess is gone). New `src/app/shared/status-tracker/` replaces the status chip, the voyage line in the grid/cards/drawer, and the Progress column with one component (compact in the grid and phone cards, large in the drawer); `StatusChip`, `StatusCellRenderer` and `VoyageCellRenderer` are deleted, now nothing imports them (`VoyageLine` itself stays — sign-in still uses it). Group by is now a button + menu on the same shared `.popover-surface` as Filters and the account menu (new `src/app/shared/menu-position.ts` so the account menu and Group by share one `ConnectedPosition`), and the Filters popover no longer runs off a short screen (`cdkConnectedOverlayFlexibleDimensions`).

One fix beyond the R-items: the account-menu "switch customer" test (`e2e/shell.spec.ts`) failed on a genuine bug, not a test problem — Sign out was fine, but "Switch to" left a beat where the outgoing customer's orders were still the ones on screen. Root cause: `httpResource` (`OrdersStore.ordersResource`) doesn't notice a changed `X-Demo-Customer` synchronously with the signal write, so `reset()`'s old `.set(undefined)` was landing before the switch's other effects (the toast, the menu closing) had already painted — those are imperative Material calls, not signal-driven, so they don't wait for Angular's next tick the way the order list does. Fixed in `OrdersStore`: a `reset()`-owned `awaitingFreshOrders` flag now gates `orders()` directly (never trusting `ordersResource`'s own timing), and `reset()` forces a synchronous `ApplicationRef.tick()` so the order list is already empty before `switchTo()`'s other calls run. Confirmed with the test at `--repeat-each=8`.

`.skip` removed from: `e2e/shell-layout.spec.ts`, `e2e/status-tracker.spec.ts`, `e2e/orders-toolbar.spec.ts`, the six P8 tests in `e2e/orders-table.spec.ts`, and the `e2e/shell.spec.ts` account-menu describe block — assertions unchanged throughout. Full suite green: items 2 and 4 unaffected (delivery-note, nav-labels, account all still pass), items 3 and 5 still correctly pending, the two P7 flaky tests are still just flaky (independent of this build, each passes alone).

### Pre-existing, not fixed here
- Nothing new found this round beyond the two items already listed above.

## DEV build note — item 3 (24/09/2026)
Built `portal-lite-spec.md` phase **P4**'s Overview/Spend/Schedule (bundle B3) straight from the spec and design doc. One open call the spec didn't settle: design Revision 4 flagged Overview's "on the water" list as still specified with the voyage line, recommended the new status tracker instead for one status language across the portal, and left the choice for "when B3 is planned" — that's now, so WL was asked and chose the status tracker; built that way.

New `src/app/core/orders/order-stats.ts` (`onTheWaterOrders`, `quarterSpend`, `monthlySpend`) and `src/app/shared/dates.ts`/`css-token.ts` hold logic now shared by more than one page: `STATUS_GROUP_ORDER` and `ukDate` moved there from `features/orders/order-view.ts` (Overview needed both too), and `css-token.ts` reads a CSS custom property's resolved value for ECharts, which renders to canvas and can't read `var(--token)` the way real DOM/CSS can — so Spend's bar/average-line colours still come from `tokens.css`, not a hardcoded duplicate, ready for B5 to theme. `<app-order-drawer>` moved from Orders' own template up to the shell: Overview and Schedule both open orders now too, so one shared instance replaced what would have been three copies. Added `echarts` + `ngx-echarts` (Spend) and `@fullcalendar/angular` + `core`/`daygrid`/`list`/`interaction` (Schedule), both MIT/Apache-2.0 per the spec's licence rule, both lazy-loaded with their routes same as `pdfmake`.

One fix beyond P4 itself: the shared `Skeleton` component (built at P3) never actually carried `data-testid="skeleton"`, even though B3's own test contract already named it as one of the shared hooks — nothing had asserted on it directly until this bundle's loading-state tests did. Added the host binding rather than flagging it, since B3 couldn't pass without it.

`.skip` removed from `e2e/spend-schedule.spec.ts` only, assertions unchanged; all 8 pass. Full suite re-run clean otherwise (twice): items 1/2/4 unaffected, item 5 still correctly pending, the two P7 flaky tests are still just flaky (each passes alone, independent of this build).

PR: https://github.com/wlgitdev/portal/pull/6

Same Node-version gotcha as the P6/P7 notes below (`ng serve`/Playwright's webServer need ≥22.22.3, the sandbox pins 22.22.2) — fixed at the session level this time (`/usr/bin`'s 24.x first on `PATH`, via `/root/.portal-lite-env`) rather than a one-off workaround, so it should hold for the rest of this session.

### Pre-existing, not fixed here
- The two P7 flaky tests (above) are still just flaky, unrelated to this build.
- Design's Spend screen also named a "Top 5 products" bar and a 12/24-month toggle. Neither is in B3's finalised test contract (which fixes Spend at one 12-month window), and Top 5 products has no reachable data source without a new endpoint — `GET /api/orders` returns order summaries, never line items. Left both unbuilt; wants its own item if WL still wants them.
- The initial bundle-size budget (1.50 MB) was already breached before this round (1.56 MB). B3's own new dependencies are lazy per-route, so they don't add to it, but hoisting the order drawer into the shell's chunk added it to a bundle Orders no longer carries alone, taking the total to 1.58 MB. Not fixed here — would mean dieting the existing main bundle, which nothing in this issue touches.

## DEV build note — item 10 (25/09/2026)
Pulled forward out of turn (WL, time-crunch): built `showcase-2-spec.md` phase **S8** (bundle B10) straight from the spec. S1 (API without Dapper) is the only phase B10 actually depends on — the form is entirely inside Account and never touches the grid, workspace, calendar or spend chart — and S1 was already in place from item 6, so items 7/8/9 weren't needed to make this work.

New `db/portal-lite-schema.sql` (`PortalDeliveryPreferences` + 3 child tables), wired into `05_northwind.sh` and the Windows README step. New `GET`/`PUT /api/me/delivery-preferences` (`DeliveryPreferencesQueries.cs`, `DeliveryPreferencesEndpoints.cs`), a transactional multi-table write via a new optional-transaction overload on `SqlQuery.ExecuteAsync`, server validation mirroring the form. Account gains a "Delivery preferences" tab (hand-rolled tablist, `?tab=delivery`, both tabpanels stay mounted so switching never drops edits), typed Reactive Forms + Material controls per the design table.

Three controls (delivery window, unloading, invoice format) are hand-rolled instead of `mat-timepicker`/`mat-radio-group`/`mat-button-toggle-group` directly: their real rendered ARIA role or DOM text didn't match the pinned e2e contract (`role=combobox` not `textbox`; `role=radiogroup` not `group`; a radio's own label sits in a sibling `<label>`, outside the `role=radio` element) — checked against Material's compiled source and live accessibility snapshots, not assumed. Same reasoning the existing DataGrid already used. Two more bugs found and fixed along the way, both would have hit any future bundle using the same patterns: `toSignal(merge(form.valueChanges, form.statusChanges))` stopped notifying its dependents after the form's first couple of emissions (replaced with a plain signal bumped from a manual subscription); `NativeDateAdapter.parse()` ignores `MAT_DATE_LOCALE` entirely and reads a typed "01/10/2026" as US MM/DD/YYYY (new `src/app/shared/uk-date-adapter.ts`, a first-party override — Moment/Luxon aren't on this bundle's allowed-package list).

`.skip` removed from `e2e/delivery-preferences.spec.ts` only, assertions unchanged; all 10 pass.

Also fixed, raised mid-session by WL and out of B10's own scope but touching shared/adjacent code: Orders' grid columns stopped short of the page's full width past their fixed pixel widths (Ship To was truncating with the rest of the row sitting empty) — the last visible column now grows via CSS to fill leftover row width (column widths and the resize/minWidth floor are otherwise unchanged; the resize handle now reads the cell's actual rendered width rather than the stored one, since CSS can now legitimately grow it past that). Account's two tabs were also capped well under the available width with nothing using the rest of it — widened both and turned Address's two field-pairs into one responsive 4-up grid.

### Pre-existing, not fixed here
- **Item 6 (bundle B6) is not actually green.** While confirming the grid width fix above didn't regress anything, ran the full suite and found 7 failures in item 6's own tests, none caused by this session's changes (confirmed by reverting the grid CSS/resize-handle change and re-running — identical failures persist): `e2e/data-grid.spec.ts` "developer details show the grid's live view state as JSON"; `e2e/orders-find.spec.ts` "Items and Total are right-aligned"; `e2e/orders-table.spec.ts` "hovering each column header explains the column", "collapsing a group hides its orders", "sorting a column keeps rows inside their groups"; `e2e/orders-toolbar.spec.ts` "Group by opens a menu of choices and shows the one picked"; `e2e/status-tracker.spec.ts` "grid: sorting Status puts the most urgent first". This is presumably why item 6's row was never moved off Waiting for Dev and no build note exists for it — but it's real work still needed, not just bookkeeping. Wants a dedicated pass before item 6 is trusted as done.
- `PortalApi.searchCustomers` dead code (item 4 note, still unresolved).
- The two P7 flaky tests: one still flaky this round (above); the other passed cleanly.
- `scripts/dev-setup` still leaves the sandbox on Node 22.22.2 on `PATH` (fixed session-side again this round, same as every prior note) and the API's user secret isn't set by setup — same three gaps DES flagged when showcase-2 was speced. Worth fixing in the script itself so the next session doesn't repeat the workaround a fourth time.
