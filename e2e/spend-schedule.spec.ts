import { test, expect } from '@playwright/test';
import type { OrderSummary } from '../src/app/core/api/models';
import { fetchOrdersAs, navigateTo, parseMoney, signInAs, signInBySearch } from './support/portal';

// Bundle B3 (roadmap item 3): see spending and delivery dates at a glance.
// To test: open Spend and Schedule, switch Spend to table view, click a
// calendar entry to open the order.
// Rule 3b: DEV may only remove this .skip, never edit the assertions below.
test.describe.skip('see spend and schedule', () => {
  // ERNSH has late orders, and its latest order is Northwind's latest, which
  // the API's date shift lands in the current month — so its overview has
  // something late to say and its calendar has entries in the opening month.
  const LATE_CUSTOMER_ID = 'ERNSH';

  function monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function lastTwelveMonthKeys(today: Date): string[] {
    return Array.from({ length: 12 }, (_, i) =>
      monthKey(new Date(today.getFullYear(), today.getMonth() - 11 + i, 1)),
    );
  }

  function spendByMonth(orders: OrderSummary[]): Map<string, number> {
    const totals = new Map<string, number>();
    for (const order of orders) {
      const key = order.orderedOn.slice(0, 7);
      totals.set(key, (totals.get(key) ?? 0) + order.total);
    }
    return totals;
  }

  test.describe('overview', () => {
    test('greets the signed-in customer by company name', async ({ page }) => {
      await signInAs(page, 'customer-card-ALFKI');
      await navigateTo(page, 'Overview');

      await expect(page).toHaveURL(/\/overview$/);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfreds Futterkiste');
    });

    test('every late order is on the water, and the header counts them', async ({
      page,
      request,
    }) => {
      const lateIds = (await fetchOrdersAs(request, LATE_CUSTOMER_ID))
        .filter((order) => order.status === 'Late')
        .map((order) => String(order.id));
      expect(lateIds.length).toBeGreaterThan(0);

      await signInAs(page, 'customer-card-late-orders');
      await navigateTo(page, 'Overview');

      const onTheWater = page.getByTestId('on-the-water-order');
      await expect(onTheWater.first()).toBeVisible();
      const shownIds = await onTheWater.evaluateAll((items) =>
        items.map((item) => item.getAttribute('data-order-id')),
      );
      expect(shownIds).toEqual(expect.arrayContaining(lateIds));
      await expect(page.getByTestId('overview-sentence')).toContainText(`${lateIds.length} late`);
    });
  });

  test.describe('spend', () => {
    test('"Show as table" swaps the chart for the same 12 monthly figures', async ({
      page,
      request,
    }) => {
      const expected = spendByMonth(await fetchOrdersAs(request, 'ALFKI'));
      const months = lastTwelveMonthKeys(new Date());

      await signInAs(page, 'customer-card-ALFKI');
      await navigateTo(page, 'Spend');
      await expect(page).toHaveURL(/\/spend$/);
      await expect(page.getByTestId('spend-chart')).toBeVisible();

      await page.getByRole('switch', { name: 'Show as table' }).click();
      await expect(page.getByTestId('spend-chart')).toBeHidden();

      const rows = page.getByTestId('spend-table').getByTestId('spend-table-row');
      await expect(rows).toHaveCount(12);
      const shown = await rows.evaluateAll((trs) =>
        trs.map((tr) => ({
          month: tr.getAttribute('data-month'),
          amount: tr.querySelector('[data-testid="spend-table-amount"]')?.textContent ?? '',
        })),
      );
      expect(shown.map((row) => row.month)).toEqual(months);
      for (const row of shown) {
        expect(parseMoney(row.amount), `spend for ${row.month}`).toBeCloseTo(
          expected.get(row.month!) ?? 0,
          2,
        );
      }
      expect(shown.some((row) => parseMoney(row.amount) > 0)).toBe(true);
    });
  });

  test.describe('schedule', () => {
    test('clicking a calendar entry opens that order', async ({ page }) => {
      await signInAs(page, 'customer-card-late-orders');
      await navigateTo(page, 'Schedule');
      await expect(page).toHaveURL(/\/schedule$/);

      const entry = page.getByTestId('schedule-event').first();
      await expect(entry).toBeVisible();
      const orderId = await entry.getAttribute('data-order-id');
      expect(orderId).toMatch(/^\d+$/);

      await entry.click();
      const drawer = page.getByTestId('order-drawer');
      await expect(drawer.getByText(`#${orderId}`)).toBeVisible();
      await expect(drawer.getByTestId('order-drawer-total')).toBeVisible();
    });
  });

  test.describe('no orders and slow networks', () => {
    test('a customer with no orders sees the empty state on Overview and Spend', async ({
      page,
    }) => {
      await signInBySearch(page, 'FISSA');

      await navigateTo(page, 'Overview');
      await expect(page.getByTestId('overview-empty-state')).toContainText('No orders yet');

      await navigateTo(page, 'Spend');
      await expect(page.getByTestId('spend-empty-state')).toContainText('No orders yet');
      await expect(page.getByTestId('spend-chart')).toHaveCount(0);
    });

    for (const label of ['Overview', 'Spend', 'Schedule'] as const) {
      test(`${label} shows a skeleton, not a blank page or spinner, while orders load`, async ({
        page,
      }) => {
        await signInAs(page, 'customer-card-ALFKI');
        await page.route('**/api/orders', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 2_000));
          await route.continue();
        });

        await page.goto(`/${label.toLowerCase()}`);
        await expect(page.getByTestId('skeleton').first()).toBeVisible({ timeout: 1_000 });
        await expect(page.getByRole('progressbar')).toHaveCount(0);
      });
    }
  });
});
