import { test, expect, type Page } from '@playwright/test';
import { fetchOrdersAs, signInAs } from './support/portal';

// Spec P7 R8–R10 (bundle B1) and P6 R7 (bundle B2); design "Revision 3" / "Revision 2".
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

// Pending again (DES, P7 R8–R10): identity moved into an account menu.
test.describe.skip('account menu: switch customer and sign out (B1)', () => {
  const PHONE = { width: 390, height: 844 };

  async function openAccountMenu(page: Page, companyName: string) {
    const trigger = page
      .getByRole('banner')
      .getByRole('button', { name: `Account: ${companyName}`, exact: true });
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    return page.getByRole('menu');
  }

  // Records every order id the page renders from now on, so a flash of the
  // previous customer's cached orders is caught, not just the end state.
  async function recordRenderedOrderIds(page: Page): Promise<void> {
    await page.evaluate(() => {
      const seen = new Set<string>();
      (window as unknown as { seenOrderIds: Set<string> }).seenOrderIds = seen;
      new MutationObserver(() => {
        document
          .querySelectorAll('[data-order-id]')
          .forEach((el) => seen.add(el.getAttribute('data-order-id') ?? ''));
      }).observe(document.body, { subtree: true, childList: true, attributes: true });
    });
  }

  async function renderedOrderIds(page: Page): Promise<string[]> {
    return page.evaluate(() =>
      [...(window as unknown as { seenOrderIds: Set<string> }).seenOrderIds].sort(),
    );
  }

  for (const [label, viewport] of [
    ['phone', PHONE],
    ['desktop', DESKTOP],
  ] as const) {
    test(`the top bar names the customer, not their ID, on ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await signInAs(page, 'customer-card-ALFKI');

      const banner = page.getByRole('banner');
      await expect(
        banner.getByRole('button', { name: 'Account: Alfreds Futterkiste', exact: true }),
      ).toBeVisible();
      await expect(banner).not.toContainText('Signed in as');
    });

    test(`the account menu offers switching and signing out on ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await signInAs(page, 'customer-card-late-orders');

      const menu = await openAccountMenu(page, 'Ernst Handel');
      await expect(menu).toContainText('Customer ERNSH');
      await expect(menu).toContainText('Demo sign-in: switch customer without a password.');
      await expect(menu.getByRole('menuitem')).toHaveText([
        /Alfreds Futterkiste/,
        /Save-a-lot Markets/,
        'Choose another customer…',
        'Sign out',
      ]);
    });
  }

  test("switching from the menu shows only the new customer's orders", async ({
    page,
    request,
  }) => {
    await page.setViewportSize(PHONE);
    const alfredsIds = (await fetchOrdersAs(request, 'ALFKI')).map((o) => String(o.id)).sort();
    await signInAs(page, 'customer-card-late-orders');
    await expect(page.getByTestId('order-row').first()).toBeVisible();

    const menu = await openAccountMenu(page, 'Ernst Handel');
    await recordRenderedOrderIds(page);
    await menu.getByRole('menuitem', { name: /Alfreds Futterkiste/ }).click();

    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByText('Now viewing Alfreds Futterkiste', { exact: true })).toBeVisible();
    await expect(page.getByTestId('order-row')).toHaveCount(alfredsIds.length);
    for (const id of await renderedOrderIds(page)) {
      expect(alfredsIds, `order ${id} rendered after switching to ALFKI`).toContain(id);
    }
  });

  test('signing out forgets the customer and the next one sees only their own orders', async ({
    page,
    request,
  }) => {
    const ernstIds = (await fetchOrdersAs(request, 'ERNSH')).map((o) => String(o.id)).sort();
    await signInAs(page, 'customer-card-ALFKI');
    await expect(page.getByTestId('order-row').first()).toBeVisible();

    const menu = await openAccountMenu(page, 'Alfreds Futterkiste');
    await menu.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(
      page.getByText('Signed out of Alfreds Futterkiste', { exact: true }),
    ).toBeVisible();

    await page.goto('/orders');
    await expect(page).toHaveURL(/\/sign-in$/);

    await recordRenderedOrderIds(page);
    await page.getByTestId('customer-card-late-orders').click();
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByTestId('order-row')).toHaveCount(ernstIds.length);
    for (const id of await renderedOrderIds(page)) {
      expect(ernstIds, `order ${id} rendered after switching to ERNSH`).toContain(id);
    }
  });

  test('"Choose another customer…" opens the sign-in page', async ({ page }) => {
    await signInAs(page, 'customer-card-ALFKI');
    const menu = await openAccountMenu(page, 'Alfreds Futterkiste');
    await menu.getByRole('menuitem', { name: 'Choose another customer…', exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });
});

test.describe('navigation is labelled (B2)', () => {
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
