# Roadmap

Status meanings: Waiting for Planning · Waiting for Dev · In Progress · Waiting for Release (T) · In Testing (T) · Waiting for Dev (failed) · Ready for Release. Testers set only the last two, the failed status will be accompanied with comments (see "Tester Comments for Waiting for Dev (failed)" section).

## Now — Customer portal demo (23/09/2026)
Show sales and testers a customer portal they can click through. Done means every item below is Ready for Release before the demo.
**Status:** In Progress

| # | Item | Status | To test |
|---|---|---|---|
| 1 | Sign in as a customer and browse your orders | Waiting for Dev (failed) | Sign in as Alfreds, search orders, filter "Late", open one and check the lines add up to the total. |
| 2 | Download a delivery note for any order | Waiting for Dev (failed) | Open an order, download its delivery note, check the PDF totals match the screen. |
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
item 1: 
 - in desktop mode the status column label height is too large for the cells.
 - when the cells are hovered over, if the text content is larger than the column width then a tooltip is expected by the user that displays the full cell content
 - there is no way to log out/switch users
 - the meaning of the 'Voyage' column is unclear, hovering over the column headers should show tooltip tooltips to explain the column 
 - the table should allow searching, grouping, filtering by every displayed column
Item 2:
 - in mobile mode, the orders option just shows as a dot. it's unclear to the user what it's supposed to be.