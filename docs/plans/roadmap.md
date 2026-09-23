# Roadmap

Status meanings: Waiting for Planning · Waiting for Dev · In Progress · Waiting for Release (T) · In Testing (T) · Waiting for Dev (failed) · Ready for Release. Testers set only the last two, the failed status will be accompanied with comments (see "Tester Comments for Waiting for Dev (failed)" section).

## Now — Customer portal demo (23/09/2026)
Show sales and testers a customer portal they can click through. Done means every item below is Ready for Release before the demo.
**Status:** In Progress

| # | Item | Status | To test |
|---|---|---|---|
| 1 | Sign in as a customer and browse your orders | Waiting for Dev (failed) | Sign in as Alfreds, search orders, filter "Late", open one and check the lines add up to the total. On desktop, hover a header and a cut-off cell; try Filters and Group by; then Sign out and pick another customer. |
| 2 | Download a delivery note for any order | Waiting for Dev (failed) | Open an order, download its delivery note, check the PDF totals match the screen. On a phone, check each bottom menu item shows a picture and its name. |
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

Item 2:
 - in mobile mode, the orders option just shows as a dot. it's unclear to the user what it's supposed to be.
   → Every menu item shows a picture and its name, on phone and desktop. (P6 R7)

## DEV next step
Re-enter items 1 and 2 at **Waiting for Dev (failed)** via the DEV playbook. Fix only these two items; don't touch items 3–5.
Remove `.skip` from the new pending tests, and don't change any assertion:
- item 1: `e2e/orders-table.spec.ts`, `e2e/shell.spec.ts` → "sign out (B1)"
- item 2: `e2e/shell.spec.ts` → "navigation is labelled (B2)"

`e2e/orders.spec.ts` and `e2e/delivery-note.spec.ts` must keep passing unchanged. If a test looks wrong, stop and hand back to DES.
