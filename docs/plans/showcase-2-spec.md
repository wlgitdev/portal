# Showcase 2 — Angular-only controls — spec

Design: `showcase-2-design.md` (read it first; this spec does not repeat its copy or visuals). Mockup: `mockups/showcase-2.html`.
Roadmap items 6–12. Phases S1–S10. Every phase must pass `/thermo-nuclear-code-quality-review` as it's built.

```yaml
spec: Showcase 2 — Codejock-grade controls on Angular-team packages only
context:
  stack: unchanged (Angular 22 SPA + .NET 10 minimal API + local Northwind)
  goal: same features the PM saw, plus grid/calendar/form/parent-child depth, with zero non-Angular runtime packages
allowed_runtime_packages:  # package.json "dependencies" after S10 — nothing else
  angular_team: ["@angular/animations", "@angular/aria", "@angular/cdk", "@angular/common", "@angular/compiler",
                 "@angular/core", "@angular/forms", "@angular/material", "@angular/platform-browser", "@angular/router"]
  required_by_angular: ["rxjs (peer of @angular/core)", "tslib (runtime helpers in Angular's compiled output)"]
allowed_server_packages: ["Microsoft.Data.SqlClient"]  # plus the .NET SDK itself
removed: ["ag-grid-angular", "ag-grid-community", "@fullcalendar/*", "echarts", "ngx-echarts", "pdfmake", "@types/pdfmake",
          "@fontsource/*", "Dapper"]
dev_only_kept: ["@angular/build", "@angular/cli", "@angular/compiler-cli", "typescript", "@playwright/test",
                "pdfjs-dist (tests read printed PDFs)", "prettier"]
rules:
  - no new package of any kind without WL's sign-off; if a phase seems to need one, stop and hand back to DES
  - Angular Aria for grid/tree/tabs/listbox behaviour; CDK for drag-drop, overlay, a11y (LiveAnnouncer, FocusKeyManager where Aria has no pattern); Material for form controls
  - every colour, radius, space and z-index from tokens.css (item 5 themes these screens later)
  - dates DD/MM/YYYY via the existing shared ukDate; money via the existing formatMoney
```

---
```yaml
phase: S1
component: API without Dapper, plus the read endpoints the new controls need
requirements:
  - remove the Dapper PackageReference; add src/PortalLite.Api/Data/SqlQuery.cs, a small first-party helper over SqlCommand/SqlDataReader:
      ListAsync<T>(connection, sql, parameters, Func<SqlDataReader,T> map) and SingleOrDefaultAsync<T>(…), parameters as (name, value) pairs
      with explicit SqlDbType where type inference is ambiguous (nchar customer ids, dates); every query maps columns by name in a static
      per-record map function next to its record type — no reflection
  - "why-not-the-obvious-way" comment on SqlQuery: Dapper is the usual choice; it was removed so the server carries only Microsoft packages
  - existing endpoints (customers, orders, order detail, me) keep byte-identical JSON; their queries are unchanged
  - GET /api/order-lines (DemoCustomerFilter) -> every line of the caller's orders:
      [{ orderId, productId, productName, categoryName, unitPrice, quantity, discount, lineTotal }] ordered by orderId desc, productName;
      lineTotal computed exactly as OrdersQueries.DetailLines (rounded per line)
  - GET /api/shippers -> [{ id, companyName, phone }] ordered by companyName (no customer filter; reference data)
  - GET /api/products -> [{ id, name, categoryName }] ordered by name (reference data; Discontinued included and flagged: { …, discontinued: bool })
  - models.ts gains OrderLineRow, Shipper, Product types
acceptance:
  - given ALFKI, when GET /api/order-lines, then every row's orderId is one of ALFKI's orders and per-order lineTotal sums equal that order's total
  - given no X-Demo-Customer header, when GET /api/order-lines, then 401
  - given GET /api/shippers, then 3 rows incl. "Speedy Express"
  - given the API csproj, then no PackageReference other than Microsoft.*
```

---
```yaml
phase: S2
component: <app-data-grid> core — src/app/shared/data-grid/
requirements:
  api:
    - generic component DataGrid<Row>; inputs: gridId (string, also the localStorage key "grid-view:{gridId}"), rows (Row[]), columns (GridColumn<Row>[]),
      rowId ((row) => string), rowNoun (plural, e.g. "orders"; singular derived), density default, selectable (bool), detailTemplate (optional TemplateRef for master-detail rows),
      previewText (optional (row) => string), treeChildren (optional (row) => Row[] — tree mode, S3), highlighted (optional Set<string> of row ids)
    - outputs: rowActivated(row) (click or Enter), selectionChange(Row[]), viewStateChange(GridViewState)
    - GridColumn<Row>: id, header, headerTooltip, value(row) (raw — sorts/filters/aggregates), text(row) (display), align 'start'|'end',
      mono, minWidth, width, frozen, sortable, groupable, groupKey?(row) + groupLabel?(key) (e.g. Ordered -> month), aggregate?: 'sum',
      cellTemplate? (TemplateRef, e.g. the status tracker), compare?(a,b)
    - GridViewState (pure data, JSON-safe): sort [{colId, dir}], groupBy [colId] (max 3), columnOrder, hidden, widths, density, preview, collapsed group paths
    - all derivation (sort -> group -> flatten to visible rows with aggregates) lives in pure functions in data-grid/grid-view.ts, unit-free,
      covered by the e2e contract; the component only renders
    - shape (thermo-nuclear): data-grid.ts composes only; header row, group box, status bar and the Columns/View/column menus are their own
      components under data-grid/; view-state persistence is one small service; no file over ~300 lines; no boolean-flag parameters —
      a new grid behaviour is a column or input property, never an `if (gridId === …)`
  rendering_and_dom_contract:  # pinned by e2e/support/grid.ts — do not rename
    - root: data-testid="data-grid", data-grid-id="{gridId}", role grid via Angular Aria Grid; aria-rowcount; header row sticky; frozen columns sticky-left
    - every row and header cell also carries data-grid-id="{gridId}" (grids nest, so tests scope by it)
    - header cell: role columnheader, data-col-id, header text in data-testid="column-header-text"; sorted headers carry data-sort="asc|desc" and
      data-sort-rank="{n}"; aria-sort only on rank 1; rank badge data-testid="sort-rank" shown only when 2+ keys
    - header menu button: aria-label "{header} column menu" -> CdkMenu aria-label "{header} column" with items (menuitem):
      "Sort ascending", "Sort descending", "Add to sort", "Group by this column" (groupable only), "Move left", "Move right", "Hide column"
    - resize handle per header: role separator, aria-orientation vertical, aria-label "Resize {header}", aria-valuenow = width px;
      ArrowLeft/Right = ±10px (min minWidth); pointer drag; double-click fits content
    - row: role row, data-row-id, data-row-kind data|group|detail|preview|footer, aria-rowindex (1-based over rendered rows, header = 1);
      group rows aria-level (1..3) and aria-expanded; expandable data rows aria-expanded; highlighted rows data-highlighted="true"
    - cell: role gridcell, data-col-id, a direct child of its row; plain text inside data-testid="cell-value" (truncation is measured on it)
    - tooltip: one element role tooltip, data-testid="grid-tooltip", shown 400ms after hovering a header (its headerTooltip) or a cell whose
      cell-value is truncated; never for end-aligned (numbers/dates) columns, which never truncate; removed from the DOM when hidden
    - footer row (data-row-kind="footer"): first visible column reads "Total of {n} shown"; aggregate columns show their sums
  sort:
    - header click: sole sort on that column, cycling asc -> desc -> none; Shift+click or "Add to sort" appends (or flips if present) keeping earlier keys
    - stable multi-key sort using column.compare ?? natural compare of value(); ties keep API order
  selection_and_status_bar:
    - selectable grids get a first column of checkboxes (header checkbox = all visible); Shift+click selects a range
    - status bar data-testid="grid-status-bar": grid-status-count ("{n} orders" — noun from input rowNoun), grid-status-selected ("{n} selected", hidden at 0),
      grid-status-sum and grid-status-avg (over the first aggregate:'sum' column marked statusBar: true, selected rows only; hidden at 0 selected),
      grid-status-sort ("Sorted by Status ↑, Total ↓" + button "Clear sort"; else the hint "Shift+click a header to add a sort")
  view_menu_and_columns:
    - button "Columns" -> menu aria-label "Columns": one menuitemcheckbox per hideable column (header text), then menuitem "Reset columns"
    - button "View" -> menu aria-label "View": menuitemradio "Comfortable" / "Compact", menuitemcheckbox "Show preview" (only when previewText given),
      menuitem "Export CSV", menuitem "Reset view"
    - density: row block-size var(--row-height-comfortable) 52px / var(--row-height-compact) 34px on data rows; the status tracker gets size compact-dots in Compact
    - Export CSV downloads "{gridId}.csv": header row = visible column headers in order; one line per visible data row (group rows excluded) in display order;
      each cell = column.text(row) with CSV quoting per RFC 4180
    - view state saved to localStorage on change, restored on load; Reset view clears it and shows a snackbar "View reset" with action "Undo" (6s)
  keyboard:
    - Angular Aria Grid navigation: arrows, Home/End, Ctrl+Home/End, PageUp/PageDown; Enter on a data row -> rowActivated; Space toggles selection;
      Shift+F10 on a header opens its column menu
    - sort and expand/collapse changes are announced via LiveAnnouncer (polite), e.g. "Sorted by Status ascending, then Total descending"
acceptance: see S4 (S2 has no screen of its own)
```

---
```yaml
phase: S3
component: grouping and tree mode in <app-data-grid>
requirements:
  - group box (data-testid="group-box") above the header row whenever any column is groupable and the viewport >= 720px:
      empty text "Drag a column here to group by it"; one chip per level data-testid="group-chip" data-col-id, showing level number + header;
      chip remove button aria-label "Remove {header} from grouping"; chips reorder by CDK drag-drop and by Alt+ArrowLeft/Right on a focused chip;
      buttons "Expand all" / "Collapse all" shown when groupBy is non-empty
  - dropping a header (CDK drag from the header cell) on the group box, or "Group by this column", appends that column (max 3; the menu item is disabled at 3)
  - group rows: data-row-kind group, data-row-id "group:{key1}/{key2}…", aria-level = depth; label element data-testid="{singular rowNoun}-group" (orders -> "order-group", the testid item 1 already uses)
      with text "{label} · {n} {noun}" and a button (aria-expanded, aria-label "Collapse {label}" / "Expand {label}");
      aggregate columns show the group's sum in their own cell
  - group order: column.groupOrder?(keys) if given (Status: Late, Awaiting dispatch, Shipped), else ascending by key; rows inside groups follow the active sort
  - tree mode (treeChildren given): rows nest by level, aria-level, expand buttons like groups; aggregate columns sum their descendants at every level
  - tow line per design (decorative, aria-hidden)
acceptance: see S4 and S5
```

---
```yaml
phase: S4
component: Orders List on <app-data-grid>; AG Grid removed (bundle B6)
requirements:
  - orders.ts: AG Grid, its renderers (StatusTrackerCellRenderer, OrderGroupRow, OrderGroupHeader) and postSortRows are deleted; the grid is
      <app-data-grid gridId="orders" rowNoun="orders" selectable> with columns orderNo (frozen), orderedOn (groupKey "YYYY-MM", groupLabel "September 2026"),
      status (cellTemplate status tracker; compare Late < Awaiting dispatch < Shipped; groupable), itemCount (sum, end), total (sum, end, statusBar), shipTo (groupable)
  - HEADER_TOOLTIPS and header names unchanged (item 1 tests pin them)
  - OrdersFilterState keeps search/status/filters; grouping moves into the grid's view state:
      the "Group by" menu (R24 contract unchanged: None, Status, Ordered month, Items, Ship to) sets groupBy to [that column] or [] for None;
      the pill label is the first level's header, plus " +{n}" when more levels exist ("Group by Status +1"); the menu ticks the first level
  - the group label copy for orders is "{label} · {n} order(s)" (the sum moves to the Total column's aggregate cell)
  - toolbar at >= 720px: status tabs · Filters · Group by · Columns · View (design Stage 3); Export CSV moves into View
  - master-detail: each order row starts with an expand button (aria-label "Show lines of order #{id}"); expanded -> a detail row
      (data-row-kind detail) holding a nested <app-data-grid gridId="order-lines-{id}" rowNoun="lines"> with columns product, unitPrice,
      quantity (sum), discount ("25%" or "—"), amount (sum); its footer total equals the order's total. Lines come from GET /api/order-lines
      (one request, cached in OrdersStore as a Map orderId -> lines, loaded on first need)
  - preview: View -> Show preview adds under each order a row data-row-kind preview, data-row-id "preview:{id}", with text = product names joined ", " (first 3 then "+{n}")
  - Developer details: account menu gets menuitemcheckbox "Show developer details" (localStorage "developer-details"); when on, below the grid's status bar
      a <details open> data-testid="grid-state-panel" shows JSON.stringify(viewState, null, 2) in a <pre>
  - phone (< 720px): cards keep every existing testid; a "Sort" button (aria-label "Sort") opens a bottom sheet (dialog "Sort") with up to 3 keys,
      each a native select "Sort key {n}" (Order no, Ordered, Status, Items, Total, Ship to) and a native select "Direction {n}" (Ascending, Descending),
      a button "Add sort key", and "Done"; changes apply live; each card gets a "Lines" disclosure button
      (aria-expanded) revealing its lines (data-testid="order-card-line", amount in data-testid="order-card-line-amount")
  - package.json: ag-grid-angular and ag-grid-community removed; main.ts registers nothing
  - playwright.config.ts comment about AG Grid virtualisation updated to the new grid (DES has already done this)
acceptance:  # e2e/data-grid.spec.ts + the existing item-1 files, all via e2e/support/grid.ts
  - given the Orders grid, when Status is clicked then Total Shift+clicked, then rows run by status rank then total ascending, headers show ranks 1 and 2, and the status bar reads "Sorted by Status ↑, Total ↑"
  - given the Total column menu, "Add to sort" does the same as Shift+click
  - given "Clear sort", then no header carries data-sort and the hint shows
  - given "Group by this column" on Status then on Ordered, then two chips (Status, Ordered), the Group by pill reads "Group by Status +1", level-1 rows are statuses in urgency order and level-2 rows are months holding only that month's orders
  - given a header dragged onto the group box, then it becomes a grouping level
  - given a chip removed, then that level disappears
  - given group by Status, then each group's Items and Total cells equal the API sums for that status
  - given Collapse all then Expand all, then no order rows then every order row shows
  - given Columns -> untick Ship to, then the header is gone, it stays gone after reload, and Reset view brings it back
  - given the Total column menu -> Move left, then Total sits before Items
  - given the Total resize handle focused, ArrowRight twice, then its width grows by 20px
  - given View -> Compact, then data rows are 34px high; Comfortable restores 52px
  - given two rows ticked, then the status bar shows "2 selected" and the Sum/Avg of their totals
  - given the Late tab, then the footer reads "Total of {n} shown" with Items and Total equal to the late orders' sums
  - given an order expanded, then its nested lines match GET /api/orders/{id} and the nested footer equals the order total
  - given View -> Show preview, then each order's preview names its products from GET /api/order-lines
  - given focus on the first cell, ArrowDown then Enter opens the second row's order in the drawer
  - given View -> Export CSV, then orders.csv has the visible headers and one line per visible order in display order
  - given Show developer details, then the grid state panel shows the current sort and groupBy as JSON
  - given a phone, the Sort sheet with Total descending then Order no orders the cards that way, and a card's Lines match the API
  - given the app, then no element carries an .ag-* class and package.json has no ag-grid package
```

---
```yaml
phase: S5
component: Orders Workspace — dockable panes (bundle B7)
requirements:
  layout_model:
    - src/app/features/orders/workspace/: a pure layout model (workspace-layout.ts) + <app-workspace> rendering it
    - model: { docks: { left: PaneGroup[], right: PaneGroup[], bottom: PaneGroup[] }, sizes: { rightWidth px, bottomHeight px }, autoHidden: PaneId[],
      maximised: PaneId|null }; PaneGroup = { panes: PaneId[], active: PaneId }; PaneId = orders | lines | products | details
    - default ≥1280: left [orders], bottom [lines, products] (tabs, lines active), right [details]; 1024–1279: same but details auto-hidden
    - saved in localStorage "workspace-layout" (version field; unknown version -> default); Reset layout -> default + snackbar "Layout reset" with "Undo"
  chrome_and_contract:
    - segmented control (radiogroup aria-label "Orders view", radios "List" / "Workspace") beside the h1, only at ≥ 1024px; URL ?view=workspace
    - each pane: role region, aria-label = pane title, data-testid="pane" data-pane-id; title bar has buttons "Maximise {title}" (or "Restore {title}"),
      "Auto-hide {title}", and a menu button "{title} options" -> menu "Move to" submenu items "Left", "Right", "Bottom"
    - tab groups use Angular Aria Tabs (role tablist/tab/tabpanel); tabs are draggable (CDK) onto drop zones data-testid="dock-zone" data-dock=left|right|bottom
    - splitters: role separator, aria-label "Resize {dock}", aria-valuenow/min/max in px, arrow keys ±16px, pointer drag; drawn as the tow line
    - auto-hidden panes: an edge tab button data-testid="autohide-tab" named by the pane title; activating it slides the pane over the workspace
      (data-testid="pane" gains data-overlay="true"); Esc or focus leaving closes it; its title bar shows "Pin {title}" instead of "Auto-hide"
    - maximise: the pane fills the workspace; Esc restores
  panes:
    - orders: <app-data-grid gridId="workspace-orders"> (Compact default), single-select; selection writes ?order={id}
    - lines: grid gridId="workspace-lines" of the selected order's lines (product, category, unit price, qty, discount, amount; qty and amount summed in footer)
      empty state "Select an order to see its lines"
    - details: data-testid="order-details-pane": large status tracker; <dl> Ordered/Shipped/Due/Ship to/Lines/Goods/Freight with values
      data-testid order-details-{ordered|shipped|due|ship-to|lines|goods|freight}; button "Delivery note" (S9 behaviour); empty state as lines
    - products: tree grid gridId="products-bought", rows Category (aria-level 1) -> Product (2) -> each order line (3: "#{orderId} · DD/MM/YYYY");
      columns name, quantity (sum), spend (sum); selecting a product row sets highlighted = orders containing it; the orders pane title shows
      chip data-testid="highlight-chip" "Highlighting orders with {product}" with button "Stop highlighting"
    - selecting a level-3 line row selects its order
    - below 1024px the Workspace option doesn't render; ?view=workspace falls back to List
acceptance:  # e2e/workspace.spec.ts
  - given ≥1024px, the Orders view switch shows List and Workspace; given 1000px it doesn't
  - given Workspace, selecting an order fills Lines (sum = order total) and Details (dates, ship-to, freight = API), and ?order= is set; reload restores it
  - given the bottom splitter focused, ArrowUp grows the bottom dock by 16px per press
  - given Auto-hide on Order details, the pane leaves the layout and an edge tab appears; activating it slides the pane in; Pin docks it back
  - given Maximise on Orders, the pane fills the workspace; Esc restores it
  - given the Products bought tab, category rows sum their products' spend and quantity and match the API; expanding shows levels 2 and 3
  - given a product selected, exactly the orders containing it are highlighted and the chip names it; Stop highlighting clears it
  - given Order details moved to Left via its menu, it renders left of Orders; the layout survives reload; Reset layout restores the default and Undo brings the moved layout back
  - given a 1100px window, Order details starts auto-hidden
```

---
```yaml
phase: S6
component: <app-calendar> and Schedule without FullCalendar (bundle B8)
requirements:
  - src/app/shared/calendar/: <app-calendar> with input events (CalendarEvent[] = { id, date 'YYYY-MM-DD', end? 'YYYY-MM-DD', kind, orderId, title }),
      view model, outputs eventActivated(orderId); pure date maths in calendar-dates.ts (Monday-first weeks, 6×7 month matrix)
  - event kinds: ordered (every order, on orderedOn), due (Awaiting dispatch, on dueOn), late (Late, on dueOn), shipped (on shippedOn)
  - root data-testid="calendar" holds the header and the view; MAT_DATE_LOCALE 'en-GB' is provided app-wide (S8's pickers need it too)
  - header: h2 title (Month/Week/Agenda: "September 2026"; Timeline: "Jul – Sep 2026"), buttons "Previous" (‹), "Today", "Next" (›),
      radiogroup "Calendar view": Month, Week, Agenda, Timeline; on Timeline only, radiogroup "Timeline zoom": Month, Quarter
  - side panel (≥1024px): mat-calendar navigator (data-testid="calendar-navigator"; selecting a date moves the view there) and a legend:
      role group "Show on calendar", one checkbox per kind (Ordered, Due, Late, Shipped) whose label ends with data-testid="legend-count"
      data-kind="{kind}" = that kind's events across all the customer's orders; unchecked kinds are hidden in every view
  - Month: role grid (Angular Aria Grid), day cells role gridcell with data-date; up to 3 events then a button "+{n} more" opening a popover list;
      today's cell aria-current="date"; arrow keys move the focused day, PageUp/PageDown change month, Enter on a day with events opens its list
  - Week: 7 columns (data-testid="week-day", data-date) for the week containing the view date; events stacked
  - Agenda: days with events only, ascending, each with a heading (data-testid="agenda-day", data-date) and its entries
  - Timeline: one row per order in range (data-testid="timeline-row", data-order-id), a bar (data-testid="timeline-bar") from orderedOn to
      shippedOn ?? dueOn; Late orders add data-testid="timeline-overrun" from dueOn to today; a single data-testid="timeline-today" rule;
      rows grouped by status in urgency order; Month zoom = 13 weeks, Quarter = 26 weeks
  - every event element: data-testid="schedule-event", data-order-id, data-kind; hover or focus (after 300ms) shows data-testid="event-preview"
      (role tooltip) with #id, status tracker, items and total; click or Enter -> OrdersStore.openOrder
  - FullCalendar packages removed
acceptance:  # e2e/schedule-calendar.spec.ts (+ the existing item-3 schedule test stays green)
  - given Schedule, it opens on Month with today's month as the title and today's cell marked current
  - given ERNSH, every ordered/due/late/shipped event in the shown month sits on its API date
  - given the legend, each count equals the API count for that kind, and unticking Shipped removes every shipped event
  - given Next then Today, the title moves a month on and back
  - given a focused day, ArrowRight focuses the next date and PageDown moves the view a month
  - given Week, seven consecutive dates containing today are shown
  - given Agenda, day headings run in ascending date order and every entry names its order
  - given Timeline, each late order's bar has an overrun, and exactly one today rule exists
  - given hover on an event, its preview shows the order's total from the API
  - given the navigator, picking a date two months ahead switches the title to that month
  - given the app, no .fc element exists and package.json has no @fullcalendar package
```

---
```yaml
phase: S7
component: Spend without ECharts (bundle B9)
requirements:
  - src/app/shared/bar-chart/: <app-bar-chart> renders an inline SVG: bars (data-testid="spend-bar", data-month="YYYY-MM"; each a focusable
      <g role="button" tabindex="0"> with aria-label "{Month YYYY} · {£x} · {n} orders"), y-axis with 4 gridlines, average line data-testid="spend-average"
      with data-value = mean of the shown months (to 2dp) and a text label "Average {£x}"; colours via css-token.ts / CSS custom properties
  - tooltip data-testid="chart-tooltip" (role tooltip) on hover/focus with the same text as the aria-label ("1 order" when singular)
  - radiogroup "Period": "12 months" (default) / "24 months"; the table view follows the same period (existing 12-row contract holds at default)
  - activating a bar navigates to /orders?ordered=YYYY-MM; Orders reads it into the Ordered custom range (first..last day of that month) so the chip shows
  - Top 5 products: data-testid="top-products", up to 5 rows (data-testid="top-product", with top-product-name and top-product-spend) of
      { name, spend } from GET /api/order-lines, summed per product over orders placed within the shown period, descending (ties by name);
      horizontal bars in SVG
  - echarts and ngx-echarts removed; data-testid="spend-chart" stays on the chart root
acceptance:  # e2e/spend-chart.spec.ts (+ existing item-3 spend tests stay green)
  - given ALFKI, the chart is SVG with 12 bars whose labels carry each month's API spend and order count
  - given 24 months, 24 bars and 24 table rows
  - given the average line, its value is the mean of the shown months
  - given a bar focused, the tooltip shows its label
  - given a bar clicked, Orders opens with only that month's orders visible
  - given Top 5 products, names and amounts match the API ranking for the period
  - given the app, no canvas is on Spend and package.json has no echarts package
```

---
```yaml
phase: S8
component: Delivery preferences — schema, API, form (bundle B10)
requirements:
  schema:
    - db/portal-lite-schema.sql, idempotent (IF OBJECT_ID … IS NULL), creating per design "Persistence":
        PortalDeliveryPreferences(CustomerID nchar(5) PK FK Customers, ShipperID int NULL FK Shippers, WindowFrom time(0) NOT NULL, WindowTo time(0) NOT NULL,
          Unloading nvarchar(10) CHECK IN ('dock','tail-lift','by-hand'), MaxPallets tinyint CHECK 1–26, Chilled bit, MaxTempC smallint NULL CHECK -25–8,
          ClosedFrom date NULL, ClosedTo date NULL, InvoiceFormat nvarchar(5) CHECK IN ('pdf','paper','both'), Instructions nvarchar(500) NOT NULL DEFAULT '',
          SiteMapName nvarchar(255) NULL, SiteMapType nvarchar(50) NULL, SiteMap varbinary(max) NULL,
          CHECK (Chilled = 1 OR MaxTempC IS NULL), CHECK (Chilled = 0 OR MaxTempC IS NOT NULL), CHECK (DATEDIFF(minute, WindowFrom, WindowTo) >= 120),
          CHECK (ClosedFrom IS NULL AND ClosedTo IS NULL OR ClosedTo >= ClosedFrom))
        PortalDeliveryDays(CustomerID, DayOfWeek tinyint CHECK 1–6, PK both), PortalNotifyEmails(CustomerID, Email nvarchar(254), PK both),
        PortalStandingProducts(CustomerID, ProductID FK Products, PK both)
    - scripts/dev-setup/05_northwind.sh runs it after restore (and on every run, since it's idempotent); README's Windows walkthrough gains the one sqlcmd line
  api:
    - GET /api/me/delivery-preferences -> DeliveryPreferences (defaults when no row: shipperId null, deliveryDays [1,2,3,4,5], windowFrom "08:00",
      windowTo "17:00", unloading "dock", maxPallets 6, chilled false, maxTempC null, closedFrom/To null, notifyEmails [], standingProductIds [],
      invoiceFormat "pdf", instructions "", siteMap null)
    - PUT same path with the full object; siteMap { name, type, dataUrl } | null (type image/png|image/jpeg|application/pdf, decoded ≤ 2 MB);
      server validation mirrors the form rules and returns 400 ValidationProblem keyed by camelCase field; writes all four tables in one transaction
  form:
    - Account gets tabs (role tab / tabpanel, each panel named by its tab): "Contact details" (existing form, unchanged, its tests untouched) and "Delivery preferences";
      ?tab=delivery selects the second
    - typed ReactiveForms FormGroup; controls and accessible names exactly:
        mat-select "Preferred carrier" (options = shippers, phone as secondary text) · checkboxes group (role group, name "Delivery days") labelled Mon, Tue, Wed, Thu, Fri, Sat ·
        mat-timepicker inputs "Delivery window from" / "Delivery window to" · mat-radio-group "Unloading" (Loading dock, Tail-lift needed, By hand) ·
        mat-slider "Pallets per delivery" (1–26, discrete, value label) · mat-slide-toggle "Chilled goods" revealing number input "Maximum temperature (°C)"
        with −/+ buttons "Decrease maximum temperature" / "Increase maximum temperature" · mat-date-range-input "Closed from" / "Closed to" ·
        mat-chip-grid input "Also notify" (Enter/comma adds, max 5; each chip data-testid="notify-email") · mat-autocomplete multi input "Standing order products" (shows category; picked -> chips; max 10) ·
        mat-button-toggle-group aria-label "Invoice format" (PDF, Paper, Both) · textarea "Delivery instructions" (cdkTextareaAutosize) with counter
        data-testid="instructions-counter" "{n} / 500" · file input "Site map for drivers" inside a drop zone, preview name data-testid="site-map-name", button "Remove site map"
    - errors (mat-error, wired as accessible description, aria-invalid):
        no day -> "Pick at least one delivery day" · window -> "End the window at least 2 hours after it starts" ·
        temp -> "Enter a temperature from −25 to 8 °C" · closed range -> "End the closure on or after its first day" and start before today ->
        "Start the closure today or later" · bad email -> "Enter an email address like name@example.com" · file type -> "Choose a PNG, JPG or PDF" ·
        file size -> "Choose a file under 2 MB"
    - Save changes with errors: mark all touched, focus the first invalid control, no request; valid -> PUT, toast "Changes saved", form pristine
    - summary card data-testid="delivery-summary" per design (invalid fields read "({field} needs fixing)")
    - unsavedChangesGuard covers this tab too (same dialog as Contact details)
    - validator error keys (shown by the panel below): noDays, windowTooShort, tempRange, closedOrder, closedPast, email, fileType, fileSize, plus Angular's own (required, max…)
    - Developer details on -> data-testid="form-state-panel": one data-testid="form-state-row" data-control="{control name}" per control showing name,
      JSON value, and "valid" or its first error key; plus form status/dirty/touched
acceptance:  # e2e/delivery-preferences.spec.ts
  - given Account, the Delivery preferences tab shows every control by its accessible name, and Preferred carrier offers the 3 Northwind shippers
  - given To 1 hour after From, the window error shows and Save sends no request and focuses the first invalid control
  - given no delivery days, the days error shows
  - given Chilled goods on, Maximum temperature appears; 12 °C shows the temperature error
  - given a bad email typed into Also notify, it is not added and the email error shows
  - given a 3 MB file, the size error shows; a small PNG shows its name
  - given valid changes saved, "Changes saved" shows, and after reload every value is as saved (GET returns them too)
  - given the summary card, it echoes carrier, days, window, pallets and invoice format
  - given an invalid PUT straight to the API, 400 with the field's error key
  - given Show developer details, the form state panel shows windowTo's error key while the window is invalid
```

---
```yaml
phase: S9
component: Print-ready delivery note; pdfmake removed (bundle B11)
requirements:
  - route /orders/:id/delivery-note (outside the shell, authGuard) rendering the manifest from GET /api/orders/{id}: letterhead wordmark, "Delivery note",
      "#{id}" large mono, ship-to block, lines table (amount testid delivery-note-line-amount), freight (delivery-note-freight), total (delivery-note-total),
      "Received by" signature box; document.title = "delivery-note-{id}"
  - toolbar (hidden in print): button "Print or save as PDF" -> window.print(); link "Back to orders"
  - print CSS: @page { size: A4 portrait; margin: 16mm }, print-color-adjust: exact on the letterhead; no shell, no toolbar
  - 404 from the API -> "This order isn't one of yours" + link back
  - drawer: the two buttons become one "Delivery note" (opens the route in a new tab, rel noopener); workspace details pane uses the same
  - pdfmake, @types/pdfmake and delivery-note.ts (the pdfmake builder) removed
acceptance:  # e2e/delivery-note.spec.ts (rewritten; replaces the download tests)
  - given an order drawer, there is one "Delivery note" button and no "Download delivery note"; it opens /orders/{id}/delivery-note in a new tab titled delivery-note-{id}
  - given the page, its line amounts, freight and total equal the drawer's
  - given "Print or save as PDF", window.print is called once
  - given the page printed to PDF (print media), it is A4 portrait and contains #{id}, "Delivery note", "Received by" and the total, and not the toolbar text
  - given another customer's order id, the page says it isn't yours
  - given package.json, no pdfmake
```

---
```yaml
phase: S10
component: Under the hood; fonts vendored; the dependency gate (bundle B12)
requirements:
  - fonts: copy the 7 woff2 files angular.json uses today into public/fonts/ with OFL.txt; src/styles/fonts.css declares @font-face for each
      (font-display: swap); angular.json styles drop every @fontsource entry; @fontsource/* removed; the mockups' font paths already look in public/fonts first
  - route /under-the-hood inside the shell (not in the nav); account menu item "About this build" links to it
  - page h1 "What this portal is built from"; four sections (h2): "Runs in your browser", "Runs on the server", "Build and test only (never shipped)",
      "What each screen is built from"
  - each section is a <section> with its h2; package tables: rows data-testid="package-row" with data-package="{name}" and
      data-version="{version exactly as written in package.json / the csproj, e.g. ^22.1.7}"; cells: name, version (as in package.json / csproj), maintainer
      (data-testid="package-maintainer": "Angular team" | "Microsoft" | "RxJS core team" | "Mozilla" | "Prettier team"), purpose (one line)
  - the tables are generated at build time from package.json and the csproj by a small Node script scripts/build-inventory.mjs (run via an npm
      "prebuild"/"prestart" hook) into src/app/features/under-the-hood/inventory.generated.json, merged with a hand-written maintainer/purpose map
      (inventory-notes.ts); a package with no note fails the script — so a new dependency can't appear silently
  - screens table rows data-testid="screen-row" (screen name in the row's <th>) for: Orders grid, Workspace, Schedule, Spend, Delivery preferences, Delivery note (texts per design)
  - README: toolchain section notes that fonts live in public/fonts; nothing else changes
acceptance:  # e2e/under-the-hood.spec.ts
  - given the account menu, "About this build" opens the page
  - given "Runs in your browser", its rows equal package.json dependencies (names and versions) and every maintainer is Angular team, Microsoft or RxJS core team
  - given package.json, every dependency is on the allowed list above (the gate)
  - given the csproj, every PackageReference starts with Microsoft.
  - given "Build and test only", its rows equal package.json devDependencies
  - given any signed-in page, IBM Plex Sans has loaded from /fonts/ and no request goes to node_modules or a font CDN
  - given "What each screen is built from", it names all six screens
```

## Bundles (tester-testable units → roadmap items)

| Item | Bundle | Phases | Test files (Playwright, pending) |
|---|---|---|---|
| 6 | B6 Sort and group orders like a desktop grid | S1, S2, S3, S4 | `e2e/data-grid.spec.ts` + the item-1 files (must stay green) |
| 7 | B7 Work with an order and its lines side by side | S5 | `e2e/workspace.spec.ts` |
| 8 | B8 Plan deliveries on a richer calendar | S6 | `e2e/schedule-calendar.spec.ts` |
| 9 | B9 Explore spending in a richer chart | S7 | `e2e/spend-chart.spec.ts` |
| 10 | B10 Set your delivery preferences | S8 | `e2e/delivery-preferences.spec.ts` |
| 11 | B11 Print a delivery note or save it as PDF | S9 | `e2e/delivery-note.spec.ts` (rewritten) |
| 12 | B12 See what the portal is built from | S10 | `e2e/under-the-hood.spec.ts` |

**Build order.** B6 → B7 (Workspace reuses the grid and lines cache) → B8, B9, B10, B11 in any order → B12 last (its gate fails until every removal has landed).

## Rule 3b — what DES changed in existing tests
- `e2e/support/grid.ts`: every locator now matches **both** AG Grid's DOM and the new grid's contract (S2), so the item-1 suite passes before and after B6. After B6, DEV deletes the `.ag-*` halves (selectors only, no assertions). This is the only edit DEV may make to a test support file, and only in that file.
- `e2e/shell-layout.spec.ts`, `e2e/orders-find.spec.ts`, `e2e/status-tracker.spec.ts`: the four raw `.ag-*` selectors now go through `grid.ts`. Assertions unchanged.
- `e2e/orders-table.spec.ts`: the group header copy moves from "Late · 2 orders · £x" to label "Late · 2 orders" with the sum in the Total cell (S4). The two tests that read it now expect the new contract and are pending (`test.skip`) until B6.
- `e2e/delivery-note.spec.ts`: rewritten for S9 and pending. The download tests it replaces pinned behaviour that S9 removes on purpose (design "Told to WL").

DEV removes only `.skip` markers (plus the grid.ts clean-up above). Every other test stays green.

## Pre-existing, not fixed here
- `PortalApi.searchCustomers` dead code (item 4 note).
- The two P7 flaky tests (item 1). They run on the grid being replaced, so B6 may cure them; if not, they still want their own item.
- `scripts/dev-setup` still leaves the sandbox on Node 22.22.2 on `PATH` and doesn't run `npm ci`, and the API's user secret isn't set by setup, so Playwright's webServer can't start on a fresh cloud session without three manual steps. DES worked around all three this session.
