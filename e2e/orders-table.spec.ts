import { test, expect, type Page } from '@playwright/test';
import { fetchOrdersAs, signInAs } from './support/portal';
import {
  NARROW_DESKTOP,
  TALL_DESKTOP,
  cell,
  cellsInColumn,
  entriesInDisplayOrder,
  headerCell,
  headerNames,
  isTruncated,
  moveMouseAway,
  orderRow,
  tooltip,
  visibleOrderIds,
  waitForGrid,
  type ColId,
} from './support/grid';
import type { OrderStatus, OrderSummary } from '../src/app/core/api/models';

// Bundle B1 rework (roadmap item 1, tester comments 23/09/2026): spec P6
// R1–R5, design "Revision 2". Oracles read the API, never the screen.
// Rule 3b: DEV may only remove the .skip markers, never edit the assertions.

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const STATUS_GROUP_ORDER: OrderStatus[] = ['Late', 'Awaiting dispatch', 'Shipped'];

const HEADER_TOOLTIPS: Record<ColId, string> = {
  orderNo: "Northwind's reference number for this order.",
  orderedOn: 'The date you placed the order.',
  status:
    "Each order moves from Ordered, to Awaiting dispatch, to Shipped. Late means it hasn't shipped and is past its due date.",
  itemCount: 'How many different products are on the order.',
  total: 'Value of the goods after discounts. Freight is charged separately.',
  shipTo: 'Who the order is delivered to.',
};

function ukDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function displayedColumns(order: OrderSummary): string[] {
  return [
    `#${order.id}`,
    ukDate(order.orderedOn),
    order.status,
    String(order.itemCount),
    money.format(order.total),
    order.shipTo ?? '',
  ];
}

function stripMoney(text: string): string {
  return text.replace(/[£,]/g, '');
}

// Spec P6 R3 search rule, restated independently of the app's implementation.
function matchesSearch(order: OrderSummary, term: string): boolean {
  const needle = term.trim().toLowerCase();
  const columns = displayedColumns(order);
  const moneyNeedle = stripMoney(needle);
  return (
    columns.some((text) => text.toLowerCase().includes(needle)) ||
    (moneyNeedle !== '' && stripMoney(money.format(order.total)).includes(moneyNeedle))
  );
}

function sumTotals(orders: OrderSummary[]): string {
  return money.format(Math.round(orders.reduce((sum, o) => sum + o.total, 0) * 100) / 100);
}

function groupHeaderText(label: string, orders: OrderSummary[]): string {
  const noun = orders.length === 1 ? 'order' : 'orders';
  return `${label} · ${orders.length} ${noun} · ${sumTotals(orders)}`;
}

async function searchFor(page: Page, term: string): Promise<void> {
  await page.getByTestId('orders-search').fill(term);
}

async function chooseCustomDates(page: Page): Promise<void> {
  await page
    .getByRole('radiogroup', { name: 'Ordered' })
    .getByRole('radio', { name: 'Custom dates', exact: true })
    .click();
}

async function chooseGroupBy(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: /^Group by/ }).click();
  await page
    .getByRole('menu', { name: 'Group by' })
    .getByRole('menuitemradio', { name: label, exact: true })
    .click();
}

async function openFilters(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: /^Filters/ });
  if ((await button.getAttribute('aria-expanded')) !== 'true') {
    await button.click();
  }
  await expect(button).toHaveAttribute('aria-expanded', 'true');
}

test.describe('orders table at desktop width', () => {
  test.use({ viewport: TALL_DESKTOP });

  // Pending (DES, P8 R20): the status tracker replaces the status chip.
  test('every status tracker names its status and fits inside its cell', async ({
    page,
    request,
  }) => {
    const orders = await fetchOrdersAs(request, 'SAVEA');
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);

    for (const order of orders) {
      const statusCell = cell(orderRow(page, order.id), 'status');
      const tracker = statusCell.getByTestId('status-tracker');
      await expect(tracker).toHaveCount(1);
      await expect(tracker).toHaveAttribute('data-status', order.status);
      await expect(tracker.getByTestId('status-tracker-label')).toHaveText(order.status);

      const cellBox = (await statusCell.boundingBox())!;
      const trackerBox = (await tracker.boundingBox())!;
      expect(trackerBox.y, `order ${order.id} tracker top`).toBeGreaterThanOrEqual(cellBox.y - 0.5);
      expect(
        trackerBox.y + trackerBox.height,
        `order ${order.id} tracker bottom`,
      ).toBeLessThanOrEqual(cellBox.y + cellBox.height + 0.5);
      expect(await isTruncated(statusCell), `order ${order.id} label cut off`).toBe(false);
    }
  });

  // Pending (DES, P8 R20): Status and Progress merge into one Status column.
  test('columns are named plainly, with no "Voyage" or "Progress"', async ({ page }) => {
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);

    expect(await headerNames(page)).toEqual([
      'Order no',
      'Ordered',
      'Status',
      'Items',
      'Total',
      'Ship to',
    ]);
  });

  // Pending (DES, P8 R20): new Status header copy; Progress header removed.
  test('hovering each column header explains the column', async ({ page }) => {
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);

    for (const [colId, copy] of Object.entries(HEADER_TOOLTIPS) as [ColId, string][]) {
      await moveMouseAway(page);
      await headerCell(page, colId).hover();
      await expect(tooltip(page), `${colId} header tooltip`).toHaveText(copy);
    }
  });

  test('Ordered shows the full date as DD/MM/YYYY', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, 'SAVEA');
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);

    for (const order of orders) {
      await expect(cell(orderRow(page, order.id), 'orderedOn')).toHaveText(ukDate(order.orderedOn));
    }
  });

  test('search matches every displayed column', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, 'ERNSH');
    const source = orders[3];
    const terms = [
      ukDate(source.orderedOn),
      money.format(source.total),
      source.total.toFixed(2),
      'late',
      (source.shipTo ?? '').toUpperCase(),
      String(source.itemCount),
      `#${source.id}`,
    ];
    await signInAs(page, 'customer-card-late-orders');
    await waitForGrid(page);

    for (const term of terms) {
      await searchFor(page, term);
      const expected = orders
        .filter((order) => matchesSearch(order, term))
        .map((order) => order.id)
        .sort((a, b) => a - b);
      await expect
        .poll(() => visibleOrderIds(page), { message: `search "${term}"` })
        .toEqual(expected);
    }
  });

  test('each Filters field narrows the rows by its column', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, 'SAVEA');
    const byDate = [...orders].sort((a, b) => a.orderedOn.localeCompare(b.orderedOn));
    const from = byDate[5].orderedOn.slice(0, 10);
    const to = byDate[20].orderedOn.slice(0, 10);
    const cases: {
      label: string;
      value: string;
      keep: (o: OrderSummary) => boolean;
      before?: (page: Page) => Promise<void>;
    }[] = [
      { label: 'Order no contains', value: '110', keep: (o) => `#${o.id}`.includes('110') },
      {
        label: 'Ordered from',
        value: from,
        keep: (o) => o.orderedOn.slice(0, 10) >= from,
        before: chooseCustomDates,
      },
      {
        label: 'Ordered to',
        value: to,
        keep: (o) => o.orderedOn.slice(0, 10) <= to,
        before: chooseCustomDates,
      },
      { label: 'Items from', value: '4', keep: (o) => o.itemCount >= 4 },
      { label: 'Items to', value: '4', keep: (o) => o.itemCount <= 4 },
      { label: 'Total from', value: '1000', keep: (o) => o.total >= 1000 },
      { label: 'Total to', value: '3000', keep: (o) => o.total <= 3000 },
    ];
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);
    const allIds = orders.map((o) => o.id).sort((a, b) => a - b);

    for (const { label, value, keep, before } of cases) {
      await openFilters(page);
      await before?.(page);
      await page.getByLabel(label, { exact: true }).fill(value);
      const expected = orders
        .filter(keep)
        .map((o) => o.id)
        .sort((a, b) => a - b);
      await expect.poll(() => visibleOrderIds(page), { message: label }).toEqual(expected);
      await expect(page.getByRole('button', { name: 'Filters (1)', exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
      await expect.poll(() => visibleOrderIds(page)).toEqual(allIds);
      await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible();
    }
  });

  test('filters combine, and the Filters button counts them', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, 'SAVEA');
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);

    await openFilters(page);
    await page.getByLabel('Items from', { exact: true }).fill('4');
    await page.getByLabel('Items to', { exact: true }).fill('5');
    await page.getByLabel('Total from', { exact: true }).fill('1000');
    const expected = orders
      .filter((o) => o.itemCount >= 4 && o.itemCount <= 5 && o.total >= 1000)
      .map((o) => o.id)
      .sort((a, b) => a - b);
    await expect.poll(() => visibleOrderIds(page)).toEqual(expected);
    await expect(page.getByRole('button', { name: 'Filters (2)', exact: true })).toBeVisible();
  });

  // Pending (DES, showcase-2 S4): the group label reads "Late · 2 orders" and
  // the group's sum moves into its own Total cell, aligned under the column.
  test('group by Status shows urgent groups first, with counts and totals', async ({
    page,
    request,
  }) => {
    const orders = await fetchOrdersAs(request, 'ERNSH');
    const groups = STATUS_GROUP_ORDER.map((status) => ({
      status,
      orders: orders.filter((o) => o.status === status),
    })).filter((group) => group.orders.length > 0);
    await signInAs(page, 'customer-card-late-orders');
    await waitForGrid(page);

    await chooseGroupBy(page, 'Status');

    const headers = page.getByTestId('order-group').filter({ visible: true });
    await expect(headers).toHaveText(
      groups.map(
        (g) => `${g.status} · ${g.orders.length} order${g.orders.length === 1 ? '' : 's'}`,
      ),
    );
    for (const group of groups) {
      const groupRow = page.locator(
        `[role="row"][data-grid-id="orders"][data-row-kind="group"][data-row-id="group:${group.status}"]`,
      );
      await expect(cell(groupRow, 'total')).toHaveText(sumTotals(group.orders));
    }

    const statusById = new Map(orders.map((o) => [String(o.id), o.status]));
    const entries = await entriesInDisplayOrder(page);
    let currentGroup = -1;
    for (const entry of entries) {
      if (entry.kind === 'group') {
        currentGroup++;
      } else {
        expect(statusById.get(entry.rowId), `order ${entry.rowId}`).toBe(
          groups[currentGroup].status,
        );
      }
    }
    expect(currentGroup).toBe(groups.length - 1);
  });

  // Pending (DES, P8 R24): Group by is a menu, not a native select.
  test('collapsing a group hides its orders', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, 'ERNSH');
    const late = orders.filter((o) => o.status === 'Late');
    await signInAs(page, 'customer-card-late-orders');
    await waitForGrid(page);
    await chooseGroupBy(page, 'Status');

    const lateHeader = page
      .getByTestId('order-group')
      .filter({ visible: true })
      .filter({ hasText: /^Late ·/ });
    const toggle = lateHeader.getByRole('button');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    const expected = orders
      .filter((o) => o.status !== 'Late')
      .map((o) => o.id)
      .sort((a, b) => a - b);
    await expect.poll(() => visibleOrderIds(page)).toEqual(expected);
    for (const order of late) {
      await expect(orderRow(page, order.id)).toHaveCount(0);
    }
  });

  // Pending (DES, P8 R24): Group by is a menu, not a native select.
  test('sorting a column keeps rows inside their groups', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, 'ERNSH');
    await signInAs(page, 'customer-card-late-orders');
    await waitForGrid(page);
    await chooseGroupBy(page, 'Status');

    await headerCell(page, 'total').click();

    const byId = new Map(orders.map((o) => [String(o.id), o]));
    const expectedGroups = STATUS_GROUP_ORDER.filter((s) => orders.some((o) => o.status === s));
    const entries = await entriesInDisplayOrder(page);
    let groupIndex = -1;
    let previousTotal = -Infinity;
    for (const entry of entries) {
      if (entry.kind === 'group') {
        groupIndex++;
        previousTotal = -Infinity;
        continue;
      }
      const order = byId.get(entry.rowId)!;
      expect(order.status, `order ${order.id} stays in its group`).toBe(expectedGroups[groupIndex]);
      expect(order.total, `order ${order.id} sorted by total`).toBeGreaterThanOrEqual(
        previousTotal,
      );
      previousTotal = order.total;
    }
    expect(groupIndex).toBe(expectedGroups.length - 1);
  });

  test('a search that matches nothing says so, and can be cleared', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, 'SAVEA');
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);

    await searchFor(page, 'zzzz');
    const noMatches = page.getByTestId('orders-no-matches');
    await expect(noMatches).toBeVisible();
    await expect(noMatches.getByRole('heading')).toHaveText('No orders match “zzzz”');
    await expect(page.getByTestId('orders-empty-state')).toHaveCount(0);

    await noMatches.getByRole('button', { name: 'Clear search and filters', exact: true }).click();
    await expect(page.getByTestId('orders-search')).toHaveValue('');
    await expect
      .poll(() => visibleOrderIds(page))
      .toEqual(orders.map((o) => o.id).sort((a, b) => a - b));
  });
});

test.describe('orders table when space is tight', () => {
  test.use({ viewport: NARROW_DESKTOP });

  test('a cut-off cell shows its full text on hover; others show nothing', async ({ page }) => {
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);

    const shipToCells = cellsInColumn(page, 'shipTo');
    let truncatedIndex = -1;
    for (let i = 0; i < (await shipToCells.count()); i++) {
      if (await isTruncated(shipToCells.nth(i))) {
        truncatedIndex = i;
        break;
      }
    }
    expect(truncatedIndex, 'a Ship to cell is cut off at 800px').toBeGreaterThanOrEqual(0);

    const truncatedCell = shipToCells.nth(truncatedIndex);
    const fullText = (await truncatedCell.textContent())!.trim();
    await truncatedCell.hover();
    await expect(tooltip(page)).toHaveText(fullText, { timeout: 1500 });

    await moveMouseAway(page);
    await cellsInColumn(page, 'itemCount').first().hover();
    await page.waitForTimeout(1000);
    await expect(tooltip(page)).toHaveCount(0);
  });

  test('numbers and dates are never cut off', async ({ page }) => {
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);

    for (const colId of ['orderNo', 'orderedOn', 'status', 'itemCount', 'total'] as ColId[]) {
      const cells = cellsInColumn(page, colId);
      const count = await cells.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        expect(await isTruncated(cells.nth(i)), `${colId} row ${i}`).toBe(false);
      }
    }
  });
});

test.describe('orders card list grouping on a phone', () => {
  test('group by Status shows the same group headers as the table', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, 'ERNSH');
    const expected = STATUS_GROUP_ORDER.map((status) => ({
      status,
      orders: orders.filter((o) => o.status === status),
    }))
      .filter((group) => group.orders.length > 0)
      .map((group) => groupHeaderText(group.status, group.orders));
    await signInAs(page, 'customer-card-late-orders');

    await page.getByRole('button', { name: /^Filters/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Filters' });
    await sheet
      .getByRole('radiogroup', { name: 'Group by' })
      .getByRole('radio', { name: 'Status', exact: true })
      .click();
    await sheet.getByRole('button', { name: /^Show \d+ orders?$/ }).click();
    await expect(sheet).toBeHidden();

    await expect(page.getByTestId('order-group').filter({ visible: true })).toHaveText(expected);
  });
});
