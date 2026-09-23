# Roadmap

Status meanings: Waiting for Planning · Waiting for Dev · In Progress · Waiting for Release (T) · In Testing (T) · Waiting for Dev (failed) · Ready for Release. Testers set only the last two.

## Now — Customer portal demo (23/09/2026)
Show sales and testers a customer portal they can click through. Done means every item below is Ready for Release before the demo.
**Status:** Waiting for Planning (spec awaiting WL sign-off)

| # | Item | Status | To test |
|---|---|---|---|
| 1 | Sign in as a customer and browse your orders | Waiting for Release (T) | Sign in as Alfreds, search orders, filter "Late", open one and check the lines add up to the total. |
| 2 | Download a delivery note for any order | Waiting for Dev | Open an order, download its delivery note, check the PDF totals match the screen. |
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
- Setup guide so a colleague can run it in under 10 minutes
- Confirm company turnover for the PDF library decision (carried from full spec)
