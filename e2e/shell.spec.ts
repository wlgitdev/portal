import { test, expect, type Page } from '@playwright/test';
import { fetchOrdersAs, signInAs } from './support/portal';

// Spec P6 R6 (bundle B1) and R7 (bundle B2), design "Revision 2".
// Rule 3b: DEV may only remove the .skip markers, never edit the assertions.

const DESKTOP = { width: 1280, height: 800 };

function primaryNav(page: Page) {
  return page.getByRole('navigation', { name: 'Primary' });
}

async function expectLabelledNavLinks(page: Page, minHeight: number): Promise<void> {
  const links = primaryNav(page).getByRole('link');
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const link = links.nth(i);
    const name = await link.evaluate(
      (element) => element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '',
    );
    expect(name, `link ${i} has an accessible name`).not.toBe('');
    await expect(link, `link "${name}" shows its label as text`).toHaveText(name);

    const icon = link.locator('svg');
    await expect(icon, `link "${name}" shows an icon`).toBeVisible();
    const iconBox = (await icon.boundingBox())!;
    expect(iconBox.width).toBeGreaterThanOrEqual(16);

    const linkBox = (await link.boundingBox())!;
    expect(linkBox.height, `link "${name}" tap target`).toBeGreaterThanOrEqual(minHeight);
  }
}

test.describe.skip('sign out (B1)', () => {
  for (const [label, viewport] of [
    ['phone', { width: 390, height: 844 }],
    ['desktop', DESKTOP],
  ] as const) {
    test(`Sign out is in the top bar on ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await signInAs(page, 'customer-card-ALFKI');

      const banner = page.getByRole('banner');
      await expect(banner).toContainText('Signed in as ALFKI');
      await expect(banner.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    });
  }

  test('signing out forgets the customer and the next one sees only their own orders', async ({
    page,
    request,
  }) => {
    const ernstIds = (await fetchOrdersAs(request, 'ERNSH')).map((o) => String(o.id)).sort();
    await signInAs(page, 'customer-card-ALFKI');
    await expect(page.getByTestId('order-row').first()).toBeVisible();

    await page.getByRole('banner').getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.goto('/orders');
    await expect(page).toHaveURL(/\/sign-in$/);

    // Records every order id the page ever renders from here on, so a brief
    // flash of the previous customer's cached orders is caught, not just the
    // settled end state.
    await page.evaluate(() => {
      const seen = new Set<string>();
      (window as unknown as { seenOrderIds: Set<string> }).seenOrderIds = seen;
      new MutationObserver(() => {
        document
          .querySelectorAll('[data-order-id]')
          .forEach((el) => seen.add(el.getAttribute('data-order-id') ?? ''));
      }).observe(document.body, { subtree: true, childList: true, attributes: true });
    });

    await page.getByTestId('customer-card-late-orders').click();
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByTestId('order-row')).toHaveCount(ernstIds.length);

    const shown = (
      await page
        .getByTestId('order-row')
        .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-order-id') ?? ''))
    ).sort();
    expect(shown).toEqual(ernstIds);

    const everSeen = await page.evaluate(() =>
      [...(window as unknown as { seenOrderIds: Set<string> }).seenOrderIds].sort(),
    );
    for (const id of everSeen) {
      expect(ernstIds, `order ${id} rendered after switching to ERNSH`).toContain(id);
    }
  });
});

test.describe.skip('navigation is labelled (B2)', () => {
  test('on a phone, every bottom-nav item shows an icon and its name', async ({ page }) => {
    await signInAs(page, 'customer-card-ALFKI');
    await expectLabelledNavLinks(page, 48);
  });

  test('on desktop, every side-rail item shows an icon and its name', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signInAs(page, 'customer-card-ALFKI');
    await expectLabelledNavLinks(page, 0);
  });
});
