import { test, expect, type Locator, type Page } from '@playwright/test';
import { signInAs } from './support/portal';
import { waitForGrid } from './support/grid';

// Bundle B1, third rework (roadmap item 1, tester comments 23/09/2026):
// spec P8 R22–R24, design "Revision 4".
// Rule 3b: DEV may only remove the .skip markers, never edit the assertions.

const DESKTOP = { width: 1280, height: 800 };
const TYPE_PROPERTIES = ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight'];
const SURFACE_PROPERTIES = ['backgroundColor', 'borderTopLeftRadius', 'boxShadow'];

function filtersTrigger(page: Page): Locator {
  return page.getByRole('button', { name: /^Filters( \(\d+\))?$/ });
}

function groupByTrigger(page: Page): Locator {
  return page.getByRole('button', { name: /^Group by/ });
}

async function computed(target: Locator, properties: string[]): Promise<Record<string, string>> {
  return target.evaluate((element, names) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(
      names.map((name) => [
        name,
        style.getPropertyValue(name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)),
      ]),
    );
  }, properties);
}

async function surfaceStyle(page: Page): Promise<Record<string, string>> {
  const surface = page.getByTestId('popover-surface');
  await expect(surface).toHaveCount(1);
  return computed(surface, SURFACE_PROPERTIES);
}

test.describe.skip('orders toolbar on desktop', () => {
  test.use({ viewport: DESKTOP });

  test('Filters and Group by labels are set in the same type', async ({ page }) => {
    await signInAs(page, 'customer-card-late-orders');
    await waitForGrid(page);

    expect(await computed(filtersTrigger(page), TYPE_PROPERTIES)).toEqual(
      await computed(groupByTrigger(page), TYPE_PROPERTIES),
    );
    const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    for (const trigger of [filtersTrigger(page), groupByTrigger(page)]) {
      expect(await computed(trigger, ['fontFamily'])).toEqual({ fontFamily: bodyFont });
    }
  });

  for (const height of [520, 600, 800]) {
    test(`the Filters footer stays on screen at ${height}px high`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height });
      await signInAs(page, 'customer-card-late-orders');
      await waitForGrid(page);

      await filtersTrigger(page).click();
      const panel = page.getByRole('dialog', { name: 'Filters' });
      const show = panel.getByRole('button', { name: /^Show \d+ orders?$/ });
      const clear = panel.getByRole('button', { name: 'Clear filters', exact: true });
      await expect(show).toBeInViewport({ ratio: 1 });
      await expect(clear).toBeInViewport({ ratio: 1 });

      const lastSection = panel.getByRole('heading', { name: 'Ship to', exact: true });
      await lastSection.scrollIntoViewIfNeeded();
      await expect(lastSection).toBeInViewport();
      await expect(show).toBeInViewport({ ratio: 1 });

      await show.click();
      await expect(panel).toBeHidden();
    });
  }

  test('Group by opens a menu of choices and shows the one picked', async ({ page }) => {
    await signInAs(page, 'customer-card-late-orders');
    await waitForGrid(page);

    const trigger = groupByTrigger(page);
    await expect(trigger).toHaveText(/Group by\s*None/);
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await expect(page.locator('select#orders-group-by')).toHaveCount(0);

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = page.getByRole('menu', { name: 'Group by' });
    const items = menu.getByRole('menuitemradio');
    await expect(items).toHaveText(['None', 'Status', 'Ordered month', 'Items', 'Ship to']);
    await expect(items.filter({ hasText: 'None' })).toHaveAttribute('aria-checked', 'true');

    await items.filter({ hasText: 'Ordered month' }).click();
    await expect(menu).toBeHidden();
    await expect(trigger).toHaveText(/Group by\s*Ordered month/);
    await expect(page.getByTestId('order-group').first()).toBeVisible();

    await trigger.click();
    await expect(items.filter({ hasText: 'Ordered month' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('Group by, Filters and the account menu open on the same surface', async ({ page }) => {
    await signInAs(page, 'customer-card-late-orders');
    await waitForGrid(page);

    await groupByTrigger(page).click();
    const groupBy = await surfaceStyle(page);
    await page.keyboard.press('Escape');

    await filtersTrigger(page).click();
    const filters = await surfaceStyle(page);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Account: Ernst Handel', exact: true }).click();
    const account = await surfaceStyle(page);

    expect(groupBy).toEqual(filters);
    expect(account).toEqual(filters);
  });
});
