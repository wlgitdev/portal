import { test, expect, type Locator } from '@playwright/test';
import { fetchOrdersAs, signInAs } from './support/portal';
import { TALL_DESKTOP, entriesInDisplayOrder, headerCell, waitForGrid } from './support/grid';
import type { OrderStatus, OrderSummary } from '../src/app/core/api/models';

// Bundle B1, third rework (roadmap item 1, tester comments 23/09/2026):
// spec P8 R20–R21, design "Revision 4". Oracles read the API, never the screen.
// Rule 3b: DEV may only remove the .skip markers, never edit the assertions.

const PHONE = { width: 390, height: 844 };
const URGENCY: OrderStatus[] = ['Late', 'Awaiting dispatch', 'Shipped'];
const STOP_STATES: Record<OrderStatus, string[]> = {
  Late: ['done', 'current', 'todo'],
  'Awaiting dispatch': ['done', 'current', 'todo'],
  Shipped: ['done', 'done', 'current'],
};

function ukDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

async function expectTracker(tracker: Locator, order: OrderSummary): Promise<void> {
  await expect(tracker).toHaveAttribute('data-status', order.status);
  await expect(tracker.getByTestId('status-tracker-label')).toHaveText(order.status);
  const stops = tracker.getByTestId('status-tracker-stop');
  await expect(stops).toHaveCount(3);
  for (const [i, state] of STOP_STATES[order.status].entries()) {
    await expect(stops.nth(i), `order ${order.id} stop ${i + 1}`).toHaveAttribute(
      'data-state',
      state,
    );
  }
}

test.describe('status tracker', () => {
  test('grid: each stop reflects the order status, highlighting the current one', async ({
    page,
    request,
  }) => {
    await page.setViewportSize(TALL_DESKTOP);
    const orders = await fetchOrdersAs(request, 'ERNSH');
    await signInAs(page, 'customer-card-late-orders');
    await waitForGrid(page);

    for (const status of URGENCY) {
      const order = orders.find((o) => o.status === status);
      if (!order) continue;
      const row = page.locator(`.ag-center-cols-container .ag-row[row-id="${order.id}"]`);
      await expectTracker(row.getByTestId('status-tracker'), order);
    }
  });

  test('grid: sorting Status puts the most urgent first', async ({ page, request }) => {
    await page.setViewportSize(TALL_DESKTOP);
    const orders = await fetchOrdersAs(request, 'ERNSH');
    const statusById = new Map(orders.map((o) => [String(o.id), o.status]));
    await signInAs(page, 'customer-card-late-orders');
    await waitForGrid(page);

    await headerCell(page, 'status').click();

    const ranks = (await entriesInDisplayOrder(page)).map((entry) =>
      URGENCY.indexOf(statusById.get(entry.rowId)!),
    );
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  test('phone: each card shows the tracker in place of the chip and route line', async ({
    page,
    request,
  }) => {
    await page.setViewportSize(PHONE);
    const orders = await fetchOrdersAs(request, 'ERNSH');
    await signInAs(page, 'customer-card-late-orders');

    const cards = page.getByTestId('order-row');
    await expect(cards).toHaveCount(orders.length);
    for (const order of orders) {
      const card = cards.and(page.locator(`[data-order-id="${order.id}"]`));
      await expectTracker(card.getByTestId('status-tracker'), order);
      await expect(card.locator('app-status-chip, app-voyage-line')).toHaveCount(0);
    }
  });

  test('drawer: the tracker and the order dates', async ({ page, request }) => {
    await page.setViewportSize(PHONE);
    const orders = await fetchOrdersAs(request, 'ERNSH');
    await signInAs(page, 'customer-card-late-orders');

    for (const status of URGENCY) {
      const order = orders.find((o) => o.status === status);
      if (!order) continue;
      await page.locator(`[data-testid="order-row"][data-order-id="${order.id}"]`).click();
      const drawer = page.getByTestId('order-drawer');

      await expectTracker(drawer.getByTestId('status-tracker'), order);
      await expect(drawer.getByTestId('order-drawer-ordered')).toHaveText(ukDate(order.orderedOn));
      await expect(drawer.getByTestId('order-drawer-shipped')).toHaveText(
        order.shippedOn ? ukDate(order.shippedOn) : 'Not yet',
      );
      await expect(drawer.getByTestId('order-drawer-due')).toHaveText(ukDate(order.dueOn));
      await expect(drawer.locator('app-voyage-line')).toHaveCount(0);

      await page.getByRole('button', { name: 'Close order detail' }).click();
      await expect(drawer).toBeHidden();
    }
  });
});
