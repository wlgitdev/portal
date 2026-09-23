# Roadmap

Status meanings: Waiting for Planning · Waiting for Dev · In Progress · Waiting for Release (T) · In Testing (T) · Waiting for Dev (failed) · Ready for Release. Testers set only the last two, the failed status will be accompanied with comments (see "Tester Comments for Waiting for Dev (failed)" section).

## Now — Customer portal demo (23/09/2026)
Show sales and testers a customer portal they can click through. Done means every item below is Ready for Release before the demo.
**Status:** In Progress

| # | Item | Status | To test |
|---|---|---|---|
| 1 | Sign in as a customer and browse your orders | Waiting for Dev (failed) | Sign in as Alfreds, search orders, filter "Late", open one and check the lines add up to the total. On desktop, hover a header and a cut-off cell. Tap the status tabs, open Filters, drag the Total range and remove a chip. Switch customer from the top-right menu, then sign out. On a phone, check the Filters sheet and the account sheet. |
| 2 | Download a delivery note for any order | Ready for Release | Open an order, download its delivery note, check the PDF totals match the screen. On a phone, check each bottom menu item shows a picture and its name. |
| 3 | See spending and delivery dates at a glance | Waiting for Dev | Open Spend and Schedule, switch Spend to table view, click a calendar entry to open the order. |
| 4 | Edit your contact details | Waiting for Dev | Enter letters in Phone and try saving; fix it, save, reload and check it stuck. |
| 5 | Switch brand and dark mode | Waiting for Dev | Pick each brand under Brand preview in light and dark; check everything stays readable, including on a phone. |

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
Item 2:
 - in mobile mode, the orders option just shows as a dot. it's unclear to the user what it's supposed to be.
   → Every menu item shows a picture and its name, on phone and desktop. (P6 R7)

## DEV next step
**Item 1 (second rework, 23/09/2026).**
Build spec phase **P7** (`portal-lite-spec.md`), matching design "Revision 3" and the mockup `docs/plans/mockups/orders-rev3.html`. Fix item 1 only; item 2's menu fix passed, so leave it alone.

Remove `.skip` from these, and don't change any assertion:
- `e2e/orders-find.spec.ts`: every block;
- `e2e/shell.spec.ts`: "account menu: switch customer and sign out (B1)";
- `e2e/orders-table.spec.ts`: the four tests marked "Pending again (DES, P7 …)";
- `e2e/orders.spec.ts`: "filter Late and open one whose lines sum to its total".

Every other test must keep passing unchanged. If a test looks wrong, stop and hand back to DES.
