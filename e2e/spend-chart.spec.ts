import { test, expect, type Page } from '@playwright/test';
import type { OrderSummary } from '../src/app/core/api/models';
import { fetchOrdersAs, navigateTo, signInAs } from './support/portal';
import { visibleOrderIds, waitForGrid } from './support/grid';
import { DESKTOP, fetchOrderLinesAs, money, readPackageJson, roundPence } from './support/showcase';

// Bundle B9 (roadmap item 9): explore spending in a richer chart.
// Spec showcase-2 S7; design showcase-2 "Spend — in-house SVG chart".
// Rule 3b: DEV may only remove the .skip marker, never edit the assertions.

const CUSTOMER_ID = 'ALFKI';

function monthKeys(count: number, today = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (count - 1) + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

function monthName(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function barLabel(key: string, orders: OrderSummary[]): string {
  const inMonth = orders.filter((o) => o.orderedOn.startsWith(key));
  const spend = roundPence(inMonth.reduce((s, o) => s + o.total, 0));
  const noun = inMonth.length === 1 ? 'order' : 'orders';
  return `${monthName(key)} · ${money.format(spend)} · ${inMonth.length} ${noun}`;
}

async function openSpend(page: Page): Promise<void> {
  await page.setViewportSize(DESKTOP);
  await signInAs(page, 'customer-card-ALFKI');
  await navigateTo(page, 'Spend');
  await expect(page.getByTestId('spend-chart')).toBeVisible();
}

test.describe.skip('explore spending in a richer chart (B9)', () => {
  test('the chart is SVG with a labelled bar for each of 12 months', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, CUSTOMER_ID);
    await openSpend(page);

    const bars = page.getByTestId('spend-chart').locator('svg [data-testid="spend-bar"]');
    await expect(bars).toHaveCount(12);
    const keys = monthKeys(12);
    const shown = await bars.evaluateAll((els) =>
      els.map((el) => ({
        month: el.getAttribute('data-month')!,
        label: el.getAttribute('aria-label')!,
      })),
    );
    expect(shown.map((b) => b.month)).toEqual(keys);
    for (const bar of shown) expect(bar.label).toBe(barLabel(bar.month, orders));
  });

  test('24 months shows 24 bars and 24 table rows', async ({ page }) => {
    await openSpend(page);
    await page
      .getByRole('radiogroup', { name: 'Period' })
      .getByRole('radio', { name: '24 months' })
      .click();

    await expect(page.getByTestId('spend-bar')).toHaveCount(24);
    await page.getByRole('switch', { name: 'Show as table' }).click();
    await expect(page.getByTestId('spend-table-row')).toHaveCount(24);
  });

  test('the average line sits at the mean of the months shown', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, CUSTOMER_ID);
    await openSpend(page);
    const totals = monthKeys(12).map((key) =>
      orders.filter((o) => o.orderedOn.startsWith(key)).reduce((s, o) => s + o.total, 0),
    );
    const mean = roundPence(totals.reduce((s, t) => s + t, 0) / 12);

    const average = page.getByTestId('spend-average');
    expect(Number(await average.getAttribute('data-value'))).toBeCloseTo(mean, 2);
    await expect(page.getByTestId('spend-chart')).toContainText(`Average ${money.format(mean)}`);
  });

  test('a focused bar shows its figures in a tooltip', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, CUSTOMER_ID);
    await openSpend(page);
    const last = page.getByTestId('spend-bar').last();

    await last.focus();
    await expect(page.getByTestId('chart-tooltip')).toHaveText(barLabel(monthKeys(12)[11], orders));
  });

  test("clicking a bar opens Orders showing only that month's orders", async ({
    page,
    request,
  }) => {
    const orders = await fetchOrdersAs(request, CUSTOMER_ID);
    const key = monthKeys(12).find((k) => orders.some((o) => o.orderedOn.startsWith(k)))!;
    await openSpend(page);

    await page.locator(`[data-testid="spend-bar"][data-month="${key}"]`).click();

    await expect(page).toHaveURL(new RegExp(`/orders\\?ordered=${key}$`));
    await waitForGrid(page);
    await expect
      .poll(() => visibleOrderIds(page))
      .toEqual(
        orders
          .filter((o) => o.orderedOn.startsWith(key))
          .map((o) => o.id)
          .sort((a, b) => a - b),
      );
  });

  test('Top 5 products rank the period’s spend by product', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, CUSTOMER_ID);
    const lines = await fetchOrderLinesAs(request, CUSTOMER_ID);
    const keys = new Set(monthKeys(12));
    const inPeriod = new Set(
      orders.filter((o) => keys.has(o.orderedOn.slice(0, 7))).map((o) => o.id),
    );
    const byProduct = new Map<string, number>();
    for (const line of lines.filter((l) => inPeriod.has(l.orderId))) {
      byProduct.set(line.productName, (byProduct.get(line.productName) ?? 0) + line.lineTotal);
    }
    const expected = [...byProduct]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5);
    await openSpend(page);

    const rows = page.getByTestId('top-products').getByTestId('top-product');
    await expect(rows.getByTestId('top-product-name')).toHaveText(expected.map(([name]) => name));
    await expect(rows.getByTestId('top-product-spend')).toHaveText(
      expected.map(([, spend]) => money.format(roundPence(spend))),
    );
  });

  test('no canvas on Spend and no ECharts in package.json', async ({ page }) => {
    await openSpend(page);
    await expect(page.locator('canvas')).toHaveCount(0);
    const pkg = await readPackageJson();
    expect(Object.keys(pkg.dependencies).filter((n) => n.includes('echarts'))).toEqual([]);
  });
});
