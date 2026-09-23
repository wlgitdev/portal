import { test, expect, type Page } from '@playwright/test';

// Bundle B1 (roadmap item 1): sign in as a customer and browse your orders.
// To test: sign in as Alfreds, search orders, filter "Late", open one and
// check the lines add up to the total.
//
// Pending until P1-P4 land (db/portal-lite.sql, the API's customers/orders
// endpoints, the design system shell, and the sign-in/orders/drawer screens).
// Rule 3b: DEV may only remove this .skip, never edit the assertions below.
test.describe.skip('sign in and browse orders', () => {
  function parseMoney(text: string): number {
    return Number(text.replace(/[^0-9.-]+/g, ''));
  }

  async function signInAs(page: Page, testId: string) {
    await page.goto('/sign-in');
    await page.getByTestId(testId).click();
  }

  test('search orders, filter Late, and open one whose lines sum to its total', async ({
    page,
  }) => {
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
    await page.getByTestId('orders-search').fill('');

    // Filter: Late.
    await page.getByTestId('orders-status-filter').selectOption({ label: 'Late' });
    await expect(rows.first()).toBeVisible();
    const lateCount = await rows.count();
    for (let i = 0; i < lateCount; i++) {
      await expect(rows.nth(i)).toHaveAttribute('data-status', 'Late');
    }

    // Open one and check the lines add up to the total.
    await rows.first().click();
    const drawer = page.getByTestId('order-drawer');
    await expect(drawer).toBeVisible();

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
