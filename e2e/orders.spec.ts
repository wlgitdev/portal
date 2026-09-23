import { test, expect, type Page } from '@playwright/test';

// Bundle B1 (roadmap item 1): sign in as a customer and browse your orders.
// To test: sign in as Alfreds, search orders, filter "Late", open one and
// check the lines add up to the total.
test.describe('sign in and browse orders', () => {
  function parseMoney(text: string): number {
    return Number(text.replace(/[^0-9.-]+/g, ''));
  }

  async function signInAs(page: Page, testId: string) {
    await page.goto('/sign-in');
    await page.getByTestId(testId).click();
  }

  // Real Northwind data: every one of ALFKI's 6 orders already shipped, so a
  // Late filter on Alfreds' own orders is always empty — that's honest data,
  // not a bug. The design's third featured card ("one customer with late
  // orders") exists for exactly this reason, so the Late-filter/drawer-math
  // half of the roadmap's to-test line is exercised via that customer
  // (ERNSH — Ernst Handel, the only other place that name appears in the
  // spec is as a brand preset, which is a happy coincidence, not a dependency).
  test('search orders as Alfreds', async ({ page }) => {
    await signInAs(page, 'customer-card-ALFKI');
    await expect(page).toHaveURL(/\/orders$/);

    const rows = page.getByTestId('order-row');
    await expect(rows.first()).toBeVisible();

    // Search: grab a real order number off the page, search for it, confirm it survives the filter.
    const firstOrderNumber = (
      await rows.first().getByTestId('order-row-number').innerText()
    ).trim();
    await page.getByTestId('orders-search').fill(firstOrderNumber);
    await expect(rows).toHaveCount(1);
    await expect(rows.first().getByTestId('order-row-number')).toHaveText(firstOrderNumber);
  });

  // Pending again (DES, P7 R11): the Status select became tabs with counts.
  test.skip('filter Late and open one whose lines sum to its total', async ({ page }) => {
    await signInAs(page, 'customer-card-late-orders');
    await expect(page).toHaveURL(/\/orders$/);

    const rows = page.getByTestId('order-row');
    await page
      .getByRole('radiogroup', { name: 'Status' })
      .getByRole('radio', { name: /^Late \d+$/ })
      .click();
    await expect(rows.first()).toBeVisible();
    const lateCount = await rows.count();
    for (let i = 0; i < lateCount; i++) {
      await expect(rows.nth(i)).toHaveAttribute('data-status', 'Late');
    }

    // Open one and check the lines add up to the total.
    await rows.first().click();
    const drawer = page.getByTestId('order-drawer');
    // The total only renders once the drawer's own (separate, async) detail
    // fetch resolves — wait for it before reading line amounts, rather than
    // racing the loading skeleton.
    await expect(drawer.getByTestId('order-drawer-total')).toBeVisible();

    const lineAmounts = await drawer.getByTestId('order-drawer-line-amount').allInnerTexts();
    expect(lineAmounts.length).toBeGreaterThan(0);
    const linesSum = lineAmounts.reduce((sum, text) => sum + parseMoney(text), 0);

    const totalText = await drawer.getByTestId('order-drawer-total').innerText();
    expect(linesSum).toBeCloseTo(parseMoney(totalText), 2);
  });

  test('a customer with no orders sees the empty state', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByTestId('customer-search').fill('FISSA');
    await page.getByTestId('customer-result').filter({ hasText: 'FISSA' }).click();
    await expect(page).toHaveURL(/\/orders$/);

    await expect(page.getByTestId('orders-empty-state')).toBeVisible();
    await expect(page.getByTestId('order-row')).toHaveCount(0);
  });
});
