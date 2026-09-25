import { test, expect, type Locator, type Page } from '@playwright/test';
import { fetchOrdersAs, signInAs, signInBySearch } from './support/portal';
import {
  TALL_DESKTOP,
  cellsInColumn,
  headerCell,
  headerText,
  textRightGap,
  visibleOrderIds,
  waitForGrid,
} from './support/grid';
import type { OrderStatus, OrderSummary } from '../src/app/core/api/models';

// Bundle B1, second rework (roadmap item 1, tester comments 23/09/2026):
// spec P7 R11–R15, design "Revision 3", mockup docs/plans/mockups/orders-rev3.html.
// Oracles read the API, never the screen.
// Rule 3b: DEV may only remove the .skip markers, never edit the assertions.

const PHONE = { width: 390, height: 844 };
const STATUS_TABS: { label: string; status: OrderStatus | null }[] = [
  { label: 'All', status: null },
  { label: 'Late', status: 'Late' },
  { label: 'Awaiting dispatch', status: 'Awaiting dispatch' },
  { label: 'Shipped', status: 'Shipped' },
];

function ids(orders: OrderSummary[]): number[] {
  return orders.map((o) => o.id).sort((a, b) => a - b);
}

function ukDate(isoDay: string): string {
  const [year, month, day] = isoDay.split('-');
  return `${day}/${month}/${year}`;
}

function localIsoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return localIsoDay(date);
}

function statusRadio(page: Page, label: string): Locator {
  return page
    .getByRole('radiogroup', { name: 'Status' })
    .getByRole('radio', { name: new RegExp(`^${label} \\d+$`) });
}

function filtersSurface(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Filters' });
}

async function openFilters(page: Page): Promise<Locator> {
  const trigger = page.getByRole('button', { name: /^Filters( \(\d+\))?$/ });
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await trigger.click();
  }
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  return filtersSurface(page);
}

async function chipTexts(page: Page): Promise<string[]> {
  const names = await page
    .getByTestId('active-filters')
    .getByRole('button', { name: /^Remove filter: / })
    .evaluateAll((buttons) => buttons.map((b) => b.getAttribute('aria-label') ?? b.textContent));
  return names.map((name) => (name ?? '').replace(/^Remove filter: /, '').trim());
}

test.describe('finding orders on desktop', () => {
  test.use({ viewport: TALL_DESKTOP });

  test('status tabs count what the search leaves, and filter by status', async ({
    page,
    request,
  }) => {
    const orders = await fetchOrdersAs(request, 'ERNSH');
    const term = '/08/2026';
    const matching = orders.filter((o) => ukDate(o.orderedOn.slice(0, 10)).includes(term));
    await signInAs(page, 'customer-card-late-orders');
    await waitForGrid(page);

    for (const { label, status } of STATUS_TABS) {
      const count = orders.filter((o) => status === null || o.status === status).length;
      await expect(statusRadio(page, label)).toHaveAccessibleName(`${label} ${count}`);
    }
    await expect(statusRadio(page, 'All')).toBeChecked();

    await page.getByTestId('orders-search').fill(term);
    for (const { label, status } of STATUS_TABS) {
      const count = matching.filter((o) => status === null || o.status === status).length;
      await expect(statusRadio(page, label)).toHaveAccessibleName(`${label} ${count}`);
    }

    await page.getByTestId('orders-search').fill('');
    await statusRadio(page, 'Late').click();
    await expect(statusRadio(page, 'Late')).toBeChecked();
    await expect
      .poll(() => visibleOrderIds(page))
      .toEqual(ids(orders.filter((o) => o.status === 'Late')));
  });

  test('active filters show as plain-English chips that can each be removed', async ({
    page,
    request,
  }) => {
    const orders = await fetchOrdersAs(request, 'SAVEA');
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);

    const surface = await openFilters(page);
    await surface.getByLabel('Items from', { exact: true }).fill('4');
    await surface.getByLabel('Items to', { exact: true }).fill('5');
    await surface.getByLabel('Total from', { exact: true }).fill('1000');
    await surface.getByLabel('Order no contains', { exact: true }).fill('110');
    await page.keyboard.press('Escape');
    await expect(surface).toBeHidden();

    await expect
      .poll(() => chipTexts(page))
      .toEqual(['Total £1,000 or more', 'Items 4–5', 'Order no contains 110']);
    await expect(page.getByRole('button', { name: 'Filters (3)', exact: true })).toBeVisible();
    await expect
      .poll(() => visibleOrderIds(page))
      .toEqual(
        ids(
          orders.filter(
            (o) =>
              o.itemCount >= 4 && o.itemCount <= 5 && o.total >= 1000 && `#${o.id}`.includes('110'),
          ),
        ),
      );

    await page.getByRole('button', { name: 'Remove filter: Items 4–5', exact: true }).click();
    await expect
      .poll(() => visibleOrderIds(page))
      .toEqual(ids(orders.filter((o) => o.total >= 1000 && `#${o.id}`.includes('110'))));
    await expect(page.getByRole('button', { name: 'Filters (2)', exact: true })).toBeVisible();

    await page.getByTestId('active-filters').getByRole('button', { name: 'Clear all' }).click();
    await expect(page.getByTestId('active-filters')).toHaveCount(0);
    await expect.poll(() => visibleOrderIds(page)).toEqual(ids(orders));
    await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible();
  });

  test('chips word open-ended ranges and single values plainly', async ({ page }) => {
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);

    const surface = await openFilters(page);
    await surface.getByLabel('Items from', { exact: true }).fill('3');
    await surface.getByLabel('Items to', { exact: true }).fill('3');
    await surface.getByLabel('Total to', { exact: true }).fill('3000');
    await expect.poll(() => chipTexts(page)).toEqual(['Total up to £3,000', 'Items 3']);

    await surface.getByLabel('Items to', { exact: true }).fill('');
    await expect.poll(() => chipTexts(page)).toEqual(['Total up to £3,000', 'Items 3 or more']);
  });

  test('Ordered presets and custom dates filter by order date', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, 'SAVEA');
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);
    const surface = await openFilters(page);
    const ordered = surface.getByRole('radiogroup', { name: 'Ordered' });

    await expect(ordered.getByRole('radio', { name: 'Any time', exact: true })).toBeChecked();
    for (const [label, months, chip] of [
      ['Last 3 months', 3, 'Ordered last 3 months'],
      ['Last 12 months', 12, 'Ordered last 12 months'],
    ] as const) {
      await ordered.getByRole('radio', { name: label, exact: true }).click();
      const cutoff = monthsAgo(months);
      await expect
        .poll(() => visibleOrderIds(page), { message: label })
        .toEqual(ids(orders.filter((o) => o.orderedOn.slice(0, 10) >= cutoff)));
      await expect.poll(() => chipTexts(page)).toEqual([chip]);
    }

    await ordered.getByRole('radio', { name: 'Custom dates', exact: true }).click();
    const from = [...orders].sort((a, b) => a.orderedOn.localeCompare(b.orderedOn))[10].orderedOn;
    const fromDay = from.slice(0, 10);
    await surface.getByLabel('Ordered from', { exact: true }).fill(fromDay);
    await expect
      .poll(() => visibleOrderIds(page))
      .toEqual(ids(orders.filter((o) => o.orderedOn.slice(0, 10) >= fromDay)));
    await expect.poll(() => chipTexts(page)).toEqual([`Ordered from ${ukDate(fromDay)}`]);
  });

  test('the Total histogram shows where order values fall', async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, 'ERNSH');
    const top = Math.ceil(Math.max(...orders.map((o) => o.total)) / 500) * 500;
    const binWidth = top / 16;
    await signInAs(page, 'customer-card-late-orders');
    await waitForGrid(page);
    const surface = await openFilters(page);

    const minimum = surface.getByRole('slider', { name: 'Minimum total' });
    const maximum = surface.getByRole('slider', { name: 'Maximum total' });
    for (const slider of [minimum, maximum]) {
      await expect(slider).toHaveAttribute('min', '0');
      await expect(slider).toHaveAttribute('max', String(top));
      await expect(slider).toHaveAttribute('step', '50');
    }

    const bars = surface.getByTestId('total-histogram-bar');
    await expect(bars).toHaveCount(16);
    const expectedCounts = Array.from(
      { length: 16 },
      (_, i) => orders.filter((o) => Math.min(15, Math.floor(o.total / binWidth)) === i).length,
    );
    expect(
      await bars.evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-count')))),
    ).toEqual(expectedCounts);

    await surface.getByLabel('Total from', { exact: true }).fill('1000');
    await surface.getByLabel('Total to', { exact: true }).fill('6000');
    const inRange = orders.filter((o) => o.total >= 1000 && o.total <= 6000);
    await expect(surface).toContainText(
      `${inRange.length} of your ${orders.length} orders fall in this range.`,
    );
    await expect.poll(() => visibleOrderIds(page)).toEqual(ids(inRange));
    const expectedInRange = Array.from({ length: 16 }, (_, i) => {
      const midpoint = (i + 0.5) * binWidth;
      return String(midpoint >= 1000 && midpoint <= 6000);
    });
    expect(
      await bars.evaluateAll((els) => els.map((el) => el.getAttribute('data-in-range'))),
    ).toEqual(expectedInRange);
    await expect(minimum).toHaveValue('1000');
    await expect(maximum).toHaveValue('6000');
  });

  test('the histogram counts only orders that pass the other filters', async ({
    page,
    request,
  }) => {
    const orders = await fetchOrdersAs(request, 'SAVEA');
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);
    const surface = await openFilters(page);

    await surface.getByLabel('Items from', { exact: true }).fill('4');
    const others = orders.filter((o) => o.itemCount >= 4);
    await expect
      .poll(async () =>
        (
          await surface
            .getByTestId('total-histogram-bar')
            .evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-count'))))
        ).reduce((sum, n) => sum + n, 0),
      )
      .toBe(others.length);
  });

  test('Items steppers move by one, from Any', async ({ page }) => {
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);
    const surface = await openFilters(page);

    const itemsFrom = surface.getByLabel('Items from', { exact: true });
    await expect(itemsFrom).toHaveValue('');
    await surface.getByRole('button', { name: 'Increase Items from', exact: true }).click();
    await surface.getByRole('button', { name: 'Increase Items from', exact: true }).click();
    await expect(itemsFrom).toHaveValue('2');
    await surface.getByRole('button', { name: 'Decrease Items from', exact: true }).click();
    await expect(itemsFrom).toHaveValue('1');
    await expect.poll(() => chipTexts(page)).toEqual(['Items 1 or more']);
  });

  test('Ship to offers a real choice only when there is one', async ({ page, request }) => {
    const alfreds = await fetchOrdersAs(request, 'ALFKI');
    const names = [...new Set(alfreds.map((o) => o.shipTo ?? ''))].sort();
    expect(names.length, 'ALFKI fixture ships to 2+ names').toBeGreaterThan(1);
    await signInAs(page, 'customer-card-ALFKI');
    await waitForGrid(page);
    let surface = await openFilters(page);

    const boxes = surface.getByRole('checkbox');
    for (const name of names) {
      await expect(surface.getByRole('checkbox', { name, exact: true })).toBeVisible();
    }
    await expect(boxes).toHaveCount(names.length);
    await surface.getByRole('checkbox', { name: names[1], exact: true }).check();
    await expect
      .poll(() => visibleOrderIds(page))
      .toEqual(ids(alfreds.filter((o) => o.shipTo === names[1])));
    await expect.poll(() => chipTexts(page)).toEqual([`Ship to ${names[1]}`]);

    await page.keyboard.press('Escape');
    await page.goto('/sign-in');
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);
    surface = await openFilters(page);
    await expect(surface).toContainText('All your orders go to Save-a-lot Markets.');
    await expect(surface.getByRole('checkbox')).toHaveCount(0);
  });

  test('filters that hide everything say so and clear back to all orders', async ({
    page,
    request,
  }) => {
    const orders = await fetchOrdersAs(request, 'ERNSH');
    await signInAs(page, 'customer-card-late-orders');
    await waitForGrid(page);
    await statusRadio(page, 'Late').click();
    const surface = await openFilters(page);
    await surface.getByLabel('Items from', { exact: true }).fill('99');
    await page.keyboard.press('Escape');

    const noMatches = page.getByTestId('orders-no-matches');
    await expect(noMatches.getByRole('heading')).toHaveText('No orders match these filters');
    await expect(
      noMatches.getByRole('button', { name: 'Remove filter: Items 99 or more', exact: true }),
    ).toBeVisible();

    await noMatches.getByRole('button', { name: 'Clear search and filters', exact: true }).click();
    await expect(statusRadio(page, 'All')).toBeChecked();
    await expect.poll(() => visibleOrderIds(page)).toEqual(ids(orders));
  });

  test('Items and Total are right-aligned', async ({ page }) => {
    await signInAs(page, 'customer-card-SAVEA');
    await waitForGrid(page);

    for (const colId of ['itemCount', 'total'] as const) {
      const header = headerText(page, colId);
      expect(await textRightGap(headerCell(page, colId)), `${colId} header`).toBeLessThanOrEqual(
        40,
      );
      await expect(header).toBeVisible();
      const cells = cellsInColumn(page, colId);
      const count = await cells.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        expect(await textRightGap(cells.nth(i)), `${colId} row ${i}`).toBeLessThanOrEqual(24);
      }
    }
  });
});

test.describe('finding orders on a phone', () => {
  test.use({ viewport: PHONE });

  test('Filters opens a sheet whose button shows the live result count', async ({
    page,
    request,
  }) => {
    const orders = await fetchOrdersAs(request, 'ERNSH');
    await signInAs(page, 'customer-card-late-orders');
    const trigger = page.getByRole('button', { name: 'Filters', exact: true });
    await trigger.click();

    const sheet = filtersSurface(page);
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute('aria-modal', 'true');
    await expect(
      sheet.getByRole('button', { name: `Show ${orders.length} orders`, exact: true }),
    ).toBeVisible();

    await sheet.getByLabel('Total from', { exact: true }).fill('5000');
    const kept = orders.filter((o) => o.total >= 5000);
    const show = sheet.getByRole('button', {
      name: `Show ${kept.length} ${kept.length === 1 ? 'order' : 'orders'}`,
      exact: true,
    });
    await expect(show).toBeVisible();
    await show.click();

    await expect(sheet).toBeHidden();
    await expect(trigger.or(page.getByRole('button', { name: 'Filters (1)' }))).toBeFocused();
    await expect(page.getByTestId('order-row')).toHaveCount(kept.length);
    await expect.poll(() => chipTexts(page)).toEqual(['Total £5,000 or more']);
  });

  test('the first order is visible without scrolling', async ({ page }) => {
    await signInAs(page, 'customer-card-late-orders');
    const firstCard = page.getByTestId('order-row').first();
    await expect(firstCard).toBeInViewport({ ratio: 1 });
  });
});

test.describe('customers with no orders', () => {
  test.use({ viewport: PHONE });

  test('see what will appear here and a next step, with no dead controls', async ({ page }) => {
    await signInBySearch(page, 'FISSA');

    const empty = page.getByTestId('orders-empty-state');
    await expect(empty.getByRole('heading')).toHaveText('No orders yet');
    await expect(empty).toContainText(
      'When FISSA Fabrica Inter. Salchichas S.A. orders from Northwind, each order appears here so you can follow it from ordered, to shipped, to due.',
    );
    await expect(page.getByTestId('orders-search')).toHaveCount(0);
    await expect(page.getByRole('radiogroup', { name: 'Status' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Filters/ })).toHaveCount(0);

    await empty.getByRole('button', { name: 'Choose another customer', exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });
});
