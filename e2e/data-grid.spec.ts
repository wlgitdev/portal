import { readFile } from 'node:fs/promises';
import { test, expect, type Locator, type Page } from '@playwright/test';
import type { OrderStatus, OrderSummary } from '../src/app/core/api/models';
import { fetchOrdersAs, signInAs } from './support/portal';
import {
  cell,
  entriesInDisplayOrder,
  headerCell,
  headerNames,
  headerText,
  orderRow,
  waitForGrid,
} from './support/grid';
import {
  DESKTOP,
  fetchOrderAs,
  fetchOrderLinesAs,
  money,
  readPackageJson,
  roundPence,
  sumTotals,
  turnOnDeveloperDetails,
} from './support/showcase';

// Bundle B6 (roadmap item 6): sort and group orders like a desktop grid.
// Spec showcase-2 S1–S4; design showcase-2 "One grid, everywhere".
// Rule 3b: DEV may only remove the .skip markers, never edit the assertions.

const URGENCY: OrderStatus[] = ['Late', 'Awaiting dispatch', 'Shipped'];
const ROW = '[role="row"][data-grid-id="orders"]';
// ERNSH: the "late orders" featured customer — 30 orders across all three statuses.
const CUSTOMER_ID = 'ERNSH';

async function openOrders(page: Page): Promise<void> {
  await page.setViewportSize(DESKTOP);
  await signInAs(page, 'customer-card-late-orders');
  await waitForGrid(page);
}

async function columnMenu(page: Page, header: string): Promise<Locator> {
  await page.getByRole('button', { name: `${header} column menu`, exact: true }).click();
  const menu = page.getByRole('menu', { name: `${header} column`, exact: true });
  await expect(menu).toBeVisible();
  return menu;
}

async function viewMenu(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'View', exact: true }).click();
  return page.getByRole('menu', { name: 'View', exact: true });
}

async function displayedOrderIds(page: Page): Promise<number[]> {
  return (await entriesInDisplayOrder(page))
    .filter((entry) => entry.kind === 'order')
    .map((entry) => Number(entry.rowId));
}

// For every order row, the id of the deepest group row above it.
async function enclosingGroupByOrder(page: Page): Promise<Map<number, string>> {
  const rows = await page
    .locator(`${ROW}[data-row-kind="data"], ${ROW}[data-row-kind="group"]`)
    .evaluateAll((elements) =>
      elements
        .map((row) => ({
          id: row.getAttribute('data-row-id') ?? '',
          kind: row.getAttribute('data-row-kind'),
          index: Number(row.getAttribute('aria-rowindex')),
        }))
        .sort((a, b) => a.index - b.index),
    );
  const result = new Map<number, string>();
  let currentGroup = '';
  for (const row of rows) {
    if (row.kind === 'group') currentGroup = row.id;
    else result.set(Number(row.id), currentGroup);
  }
  return result;
}

async function dragOnto(page: Page, source: Locator, target: Locator): Promise<void> {
  const from = (await source.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
}

function urgencyThenTotal(a: OrderSummary, b: OrderSummary): number {
  return URGENCY.indexOf(a.status) - URGENCY.indexOf(b.status) || a.total - b.total;
}

function plainCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) rows.push([...row, field]);
  return rows;
}

test.describe('sort and group orders like a desktop grid (B6)', () => {
  test.describe('sorting', () => {
    test('Shift+click adds a second sort key, ranked in the headers and status bar', async ({
      page,
      request,
    }) => {
      const orders = await fetchOrdersAs(request, CUSTOMER_ID);
      await openOrders(page);

      await headerText(page, 'status').click();
      await headerText(page, 'total').click({ modifiers: ['Shift'] });

      expect(await displayedOrderIds(page)).toEqual(
        [...orders].sort(urgencyThenTotal).map((o) => o.id),
      );
      await expect(headerCell(page, 'status')).toHaveAttribute('data-sort', 'asc');
      await expect(headerCell(page, 'status')).toHaveAttribute('data-sort-rank', '1');
      await expect(headerCell(page, 'status')).toHaveAttribute('aria-sort', 'ascending');
      await expect(headerCell(page, 'total').getByTestId('sort-rank')).toHaveText('2');
      await expect(headerCell(page, 'total')).not.toHaveAttribute('aria-sort', /.+/);
      await expect(page.getByTestId('grid-status-sort')).toContainText(
        'Sorted by Status ↑, Total ↑',
      );
    });

    test('"Add to sort" in a column menu does what Shift+click does', async ({ page, request }) => {
      const orders = await fetchOrdersAs(request, CUSTOMER_ID);
      await openOrders(page);

      await headerText(page, 'status').click();
      await (
        await columnMenu(page, 'Total')
      )
        .getByRole('menuitem', { name: 'Add to sort' })
        .click();

      expect(await displayedOrderIds(page)).toEqual(
        [...orders].sort(urgencyThenTotal).map((o) => o.id),
      );
      await expect(headerCell(page, 'total')).toHaveAttribute('data-sort-rank', '2');
    });

    test('Clear sort removes every key and brings back the hint', async ({ page, request }) => {
      const orders = await fetchOrdersAs(request, CUSTOMER_ID);
      await openOrders(page);
      await headerText(page, 'status').click();
      await headerText(page, 'total').click({ modifiers: ['Shift'] });

      await page
        .getByTestId('grid-status-bar')
        .getByRole('button', { name: 'Clear sort', exact: true })
        .click();

      await expect(
        page.locator('[role="columnheader"][data-grid-id="orders"][data-sort]'),
      ).toHaveCount(0);
      await expect(page.getByTestId('grid-status-sort')).toContainText(
        'Shift+click a header to add a sort',
      );
      expect(await displayedOrderIds(page)).toEqual(orders.map((o) => o.id));
    });
  });

  test.describe('grouping', () => {
    test('two grouping levels from column menus nest months inside statuses', async ({
      page,
      request,
    }) => {
      const orders = await fetchOrdersAs(request, CUSTOMER_ID);
      await openOrders(page);

      await (
        await columnMenu(page, 'Status')
      )
        .getByRole('menuitem', { name: 'Group by this column' })
        .click();
      await (
        await columnMenu(page, 'Ordered')
      )
        .getByRole('menuitem', { name: 'Group by this column' })
        .click();

      const chips = page.getByTestId('group-box').getByTestId('group-chip');
      await expect(chips).toHaveCount(2);
      await expect(chips.nth(0)).toHaveAttribute('data-col-id', 'status');
      await expect(chips.nth(1)).toHaveAttribute('data-col-id', 'orderedOn');
      await expect(page.getByRole('button', { name: /^Group by/ })).toHaveText(
        /Group by\s*Status \+1/,
      );

      const present = URGENCY.filter((status) => orders.some((o) => o.status === status));
      await expect(
        page.locator(`${ROW}[data-row-kind="group"][aria-level="1"]`).getByTestId('order-group'),
      ).toHaveText(
        present.map((status) => {
          const n = orders.filter((o) => o.status === status).length;
          return `${status} · ${n} order${n === 1 ? '' : 's'}`;
        }),
      );

      const groups = await enclosingGroupByOrder(page);
      for (const order of orders) {
        expect(groups.get(order.id), `order ${order.id}`).toBe(
          `group:${order.status}/${order.orderedOn.slice(0, 7)}`,
        );
      }
    });

    test('dragging a header onto the group box groups by that column', async ({ page }) => {
      await openOrders(page);

      await dragOnto(page, headerText(page, 'shipTo'), page.getByTestId('group-box'));

      const chips = page.getByTestId('group-box').getByTestId('group-chip');
      await expect(chips).toHaveCount(1);
      await expect(chips.first()).toHaveAttribute('data-col-id', 'shipTo');
      await expect(page.locator(`${ROW}[data-row-kind="group"]`).first()).toBeVisible();
    });

    test('removing a chip removes that level', async ({ page }) => {
      await openOrders(page);
      await (
        await columnMenu(page, 'Status')
      )
        .getByRole('menuitem', { name: 'Group by this column' })
        .click();
      await (
        await columnMenu(page, 'Ordered')
      )
        .getByRole('menuitem', { name: 'Group by this column' })
        .click();

      await page.getByRole('button', { name: 'Remove Ordered from grouping', exact: true }).click();

      await expect(page.getByTestId('group-chip')).toHaveCount(1);
      await expect(page.locator(`${ROW}[data-row-kind="group"][aria-level="2"]`)).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Group by/ })).toHaveText(
        /Group by\s*Status$/,
      );
    });

    test('each status group sums its Items and Total under those columns', async ({
      page,
      request,
    }) => {
      const orders = await fetchOrdersAs(request, CUSTOMER_ID);
      await openOrders(page);
      await page.getByRole('button', { name: /^Group by/ }).click();
      await page
        .getByRole('menu', { name: 'Group by' })
        .getByRole('menuitemradio', { name: 'Status', exact: true })
        .click();

      for (const status of URGENCY) {
        const members = orders.filter((o) => o.status === status);
        if (members.length === 0) continue;
        const groupRow = page.locator(
          `${ROW}[data-row-kind="group"][data-row-id="group:${status}"]`,
        );
        await expect(cell(groupRow, 'itemCount')).toHaveText(
          String(members.reduce((sum, o) => sum + o.itemCount, 0)),
        );
        await expect(cell(groupRow, 'total')).toHaveText(money.format(sumTotals(members)));
      }
    });

    test('Collapse all hides every order; Expand all shows them again', async ({
      page,
      request,
    }) => {
      const orders = await fetchOrdersAs(request, CUSTOMER_ID);
      await openOrders(page);
      await (
        await columnMenu(page, 'Status')
      )
        .getByRole('menuitem', { name: 'Group by this column' })
        .click();

      await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
      await expect(page.locator(`${ROW}[data-row-kind="data"]`)).toHaveCount(0);

      await page.getByRole('button', { name: 'Expand all', exact: true }).click();
      await expect(page.locator(`${ROW}[data-row-kind="data"]`)).toHaveCount(orders.length);
    });
  });

  test.describe('columns and view', () => {
    test('a column hidden from Columns stays hidden after reload until Reset view', async ({
      page,
    }) => {
      await openOrders(page);
      await page.getByRole('button', { name: 'Columns', exact: true }).click();
      await page
        .getByRole('menu', { name: 'Columns' })
        .getByRole('menuitemcheckbox', { name: 'Ship to', exact: true })
        .click();
      await page.keyboard.press('Escape');
      expect(await headerNames(page)).toEqual(['Order no', 'Ordered', 'Status', 'Items', 'Total']);

      await page.reload();
      await waitForGrid(page);
      expect(await headerNames(page)).not.toContain('Ship to');

      await (await viewMenu(page)).getByRole('menuitem', { name: 'Reset view' }).click();
      expect(await headerNames(page)).toContain('Ship to');
      const snackbar = page.locator('.mat-mdc-snack-bar-container');
      await expect(snackbar).toContainText('View reset');
      await expect(snackbar.getByRole('button', { name: 'Undo' })).toBeVisible();
    });

    test('Move left in a column menu moves the column', async ({ page }) => {
      await openOrders(page);

      await (await columnMenu(page, 'Total')).getByRole('menuitem', { name: 'Move left' }).click();

      const names = await headerNames(page);
      expect(names.indexOf('Total')).toBeLessThan(names.indexOf('Items'));
    });

    test('a resize handle widens its column 10px per arrow key', async ({ page }) => {
      await openOrders(page);
      const handle = page.getByRole('separator', { name: 'Resize Total', exact: true });
      const before = Number(await handle.getAttribute('aria-valuenow'));
      const boxBefore = (await headerCell(page, 'total').boundingBox())!;

      await handle.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');

      await expect(handle).toHaveAttribute('aria-valuenow', String(before + 20));
      const boxAfter = (await headerCell(page, 'total').boundingBox())!;
      expect(boxAfter.width - boxBefore.width).toBeCloseTo(20, 0);
    });

    test('Compact rows are 34px high and Comfortable rows 52px', async ({ page }) => {
      await openOrders(page);
      const firstRow = page.locator(`${ROW}[data-row-kind="data"]`).first();

      await (await viewMenu(page)).getByRole('menuitemradio', { name: 'Compact' }).click();
      expect((await firstRow.boundingBox())!.height).toBeCloseTo(34, 0);

      await (await viewMenu(page)).getByRole('menuitemradio', { name: 'Comfortable' }).click();
      expect((await firstRow.boundingBox())!.height).toBeCloseTo(52, 0);
    });

    test('Export CSV downloads exactly the visible columns and rows, in order', async ({
      page,
      request,
    }) => {
      const orders = await fetchOrdersAs(request, CUSTOMER_ID);
      await openOrders(page);
      await headerText(page, 'total').click();

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        (await viewMenu(page)).getByRole('menuitem', { name: 'Export CSV' }).click(),
      ]);
      expect(download.suggestedFilename()).toBe('orders.csv');

      const rows = plainCsv(await readFile(await download.path(), 'utf8'));
      expect(rows[0]).toEqual(['Order no', 'Ordered', 'Status', 'Items', 'Total', 'Ship to']);
      const expected = [...orders].sort((a, b) => a.total - b.total);
      expect(rows.slice(1).map((row) => row[0])).toEqual(expected.map((o) => `#${o.id}`));
      expect(rows[1][4]).toBe(money.format(expected[0].total));
    });
  });

  test.describe('selection, footer and status bar', () => {
    test('ticking two rows shows their count, sum and average', async ({ page, request }) => {
      const orders = await fetchOrdersAs(request, CUSTOMER_ID);
      await openOrders(page);
      const [first, second] = orders;

      await orderRow(page, first.id).getByRole('checkbox').check();
      await orderRow(page, second.id).getByRole('checkbox').check();

      await expect(page.getByTestId('grid-status-selected')).toHaveText('2 selected');
      await expect(page.getByTestId('grid-status-sum')).toContainText(
        money.format(roundPence(first.total + second.total)),
      );
      await expect(page.getByTestId('grid-status-avg')).toContainText(
        money.format(roundPence((first.total + second.total) / 2)),
      );
    });

    test('the footer totals only what the Late tab leaves', async ({ page, request }) => {
      const late = (await fetchOrdersAs(request, CUSTOMER_ID)).filter((o) => o.status === 'Late');
      await openOrders(page);

      await page
        .getByRole('radiogroup', { name: 'Status' })
        .getByRole('radio', { name: /^Late \d+$/ })
        .click();

      const footer = page.locator(`${ROW}[data-row-kind="footer"]`);
      await expect(footer).toContainText(`Total of ${late.length} shown`);
      await expect(cell(footer, 'itemCount')).toHaveText(
        String(late.reduce((sum, o) => sum + o.itemCount, 0)),
      );
      await expect(cell(footer, 'total')).toHaveText(money.format(sumTotals(late)));
      await expect(page.getByTestId('grid-status-count')).toHaveText(`${late.length} orders`);
    });
  });

  test.describe('parent-child rows', () => {
    test("expanding an order shows its lines, whose footer equals the order's total", async ({
      page,
      request,
    }) => {
      const [order] = await fetchOrdersAs(request, CUSTOMER_ID);
      const detail = await fetchOrderAs(request, CUSTOMER_ID, order.id);
      await openOrders(page);

      await page
        .getByRole('button', { name: `Show lines of order #${order.id}`, exact: true })
        .click();

      const lines = page.locator(
        `[data-testid="data-grid"][data-grid-id="order-lines-${order.id}"]`,
      );
      const lineRows = lines.locator(
        `[role="row"][data-grid-id="order-lines-${order.id}"][data-row-kind="data"]`,
      );
      await expect(lineRows).toHaveCount(detail.lines.length);
      await expect(
        lineRows.locator('[data-col-id="product"] [data-testid="cell-value"]'),
      ).toHaveText(detail.lines.map((line) => line.productName));
      await expect(
        lineRows.locator('[data-col-id="amount"] [data-testid="cell-value"]'),
      ).toHaveText(detail.lines.map((line) => money.format(line.lineTotal)));
      await expect(
        lines.locator(
          `[role="row"][data-grid-id="order-lines-${order.id}"][data-row-kind="footer"] [data-col-id="amount"]`,
        ),
      ).toHaveText(money.format(order.total));
    });

    test('Show preview lists each order’s products under it', async ({ page, request }) => {
      const orders = await fetchOrdersAs(request, CUSTOMER_ID);
      const lines = await fetchOrderLinesAs(request, CUSTOMER_ID);
      await openOrders(page);

      await (await viewMenu(page)).getByRole('menuitemcheckbox', { name: 'Show preview' }).click();

      for (const order of orders.slice(0, 5)) {
        const names = lines
          .filter((line) => line.orderId === order.id)
          .map((line) => line.productName)
          .sort((a, b) => a.localeCompare(b));
        const expected =
          names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '');
        await expect(
          page.locator(`${ROW}[data-row-kind="preview"][data-row-id="preview:${order.id}"]`),
        ).toHaveText(expected);
      }
    });
  });

  test('arrow keys move between rows and Enter opens the focused order', async ({
    page,
    request,
  }) => {
    const [first, second] = await fetchOrdersAs(request, CUSTOMER_ID);
    await openOrders(page);

    await cell(orderRow(page, first.id), 'orderNo').focus();
    await page.keyboard.press('ArrowDown');
    await expect(cell(orderRow(page, second.id), 'orderNo')).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('order-drawer').getByText(`#${second.id}`)).toBeVisible();
  });

  test('developer details show the grid’s live view state as JSON', async ({ page }) => {
    await openOrders(page);
    await turnOnDeveloperDetails(page);
    await headerText(page, 'total').click();
    await (
      await columnMenu(page, 'Status')
    )
      .getByRole('menuitem', { name: 'Group by this column' })
      .click();

    const panel = page.getByTestId('grid-state-panel');
    await expect(panel).toBeVisible();
    expect(JSON.parse(await panel.locator('pre').innerText())).toMatchObject({
      sort: [{ colId: 'total', dir: 'asc' }],
      groupBy: ['status'],
    });
  });

  test.describe('on a phone', () => {
    test('the Sort sheet orders cards by several keys, and a card shows its lines', async ({
      page,
      request,
    }) => {
      const orders = await fetchOrdersAs(request, CUSTOMER_ID);
      await page.setViewportSize({ width: 390, height: 844 });
      await signInAs(page, 'customer-card-late-orders');

      await page.getByRole('button', { name: 'Sort', exact: true }).click();
      const sheet = page.getByRole('dialog', { name: 'Sort' });
      await sheet.getByRole('combobox', { name: 'Sort key 1' }).selectOption('Total');
      await sheet.getByRole('combobox', { name: 'Direction 1' }).selectOption('Descending');
      await sheet.getByRole('button', { name: 'Add sort key' }).click();
      await sheet.getByRole('combobox', { name: 'Sort key 2' }).selectOption('Order no');
      await sheet.getByRole('button', { name: 'Done' }).click();

      const expected = [...orders]
        .sort((a, b) => b.total - a.total || a.id - b.id)
        .map((o) => String(o.id));
      await expect
        .poll(() =>
          page
            .getByTestId('order-row')
            .evaluateAll((cards) => cards.map((c) => c.getAttribute('data-order-id'))),
        )
        .toEqual(expected);

      const first = orders.find((o) => String(o.id) === expected[0])!;
      const detail = await fetchOrderAs(request, CUSTOMER_ID, first.id);
      const card = page.locator(`[data-testid="order-row"][data-order-id="${first.id}"]`);
      await card.getByRole('button', { name: 'Lines' }).click();
      await expect(card.getByTestId('order-card-line-amount')).toHaveText(
        detail.lines.map((line) => money.format(line.lineTotal)),
      );
    });
  });

  test.describe('built on Angular only', () => {
    test('no AG Grid in the page or in package.json', async ({ page }) => {
      await openOrders(page);
      await expect(page.locator('[class^="ag-"], [class*=" ag-"]')).toHaveCount(0);
      const pkg = await readPackageJson();
      expect(Object.keys(pkg.dependencies).filter((name) => name.startsWith('ag-grid'))).toEqual(
        [],
      );
    });

    test('the API carries no Dapper', async () => {
      const csproj = await readFile('src/PortalLite.Api/PortalLite.Api.csproj', 'utf8');
      const packages = [...csproj.matchAll(/PackageReference Include="([^"]+)"/g)].map((m) => m[1]);
      expect(packages.filter((name) => !name.startsWith('Microsoft.'))).toEqual([]);
    });
  });

  test.describe('order lines API', () => {
    test("lines belong only to the caller's orders and add up to each order's total", async ({
      request,
    }) => {
      const orders = await fetchOrdersAs(request, 'ALFKI');
      const lines = await fetchOrderLinesAs(request, 'ALFKI');
      const byOrder = new Map<number, number>();
      for (const line of lines) {
        byOrder.set(line.orderId, roundPence((byOrder.get(line.orderId) ?? 0) + line.lineTotal));
      }
      expect([...byOrder.keys()].sort()).toEqual(orders.map((o) => o.id).sort());
      for (const order of orders) expect(byOrder.get(order.id)).toBeCloseTo(order.total, 2);
      expect(lines.every((line) => line.categoryName.length > 0)).toBe(true);
    });

    test('lines need a signed-in customer', async ({ request }) => {
      expect((await request.get('/api/order-lines')).status()).toBe(401);
    });

    test('shippers are Northwind’s three', async ({ request }) => {
      const shippers: { companyName: string }[] = await (await request.get('/api/shippers')).json();
      expect(shippers).toHaveLength(3);
      expect(shippers.map((s) => s.companyName)).toContain('Speedy Express');
    });
  });
});
