import { test, expect, type Page } from '@playwright/test';
import { signInAs } from './support/portal';
import { waitForGrid } from './support/grid';

// Bundle B1, third rework (roadmap item 1, tester comments 23/09/2026):
// spec P8 R17–R19, design "Revision 4".
// Rule 3b: DEV may only remove the .skip markers, never edit the assertions.

function visiblePrimaryNavs(page: Page) {
  return page.getByRole('navigation', { name: 'Primary' }).filter({ visible: true });
}

async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

test.describe.skip('navigation is always reachable', () => {
  for (const width of [390, 719, 720, 800, 900, 1023, 1024, 1280]) {
    test(`exactly one primary nav shows Orders at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await signInAs(page, 'customer-card-ALFKI');

      await expect(visiblePrimaryNavs(page)).toHaveCount(1);
      await expect(
        visiblePrimaryNavs(page).getByRole('link', { name: 'Orders', exact: true }),
      ).toBeVisible();
    });
  }

  for (const [label, viewport] of [
    ['phone', { width: 390, height: 600 }],
    ['tablet', { width: 800, height: 600 }],
    ['desktop', { width: 1280, height: 600 }],
  ] as const) {
    test(`the top bar stays in view after scrolling to the bottom on ${label}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await signInAs(page, 'customer-card-late-orders');
      await expect(page.getByTestId('order-row').or(page.locator('.ag-row')).first()).toBeVisible();

      await scrollToBottom(page);

      const banner = page.getByRole('banner');
      await expect(banner).toBeInViewport({ ratio: 1 });
      expect((await banner.boundingBox())!.y).toBeLessThanOrEqual(0.5);
      await expect(visiblePrimaryNavs(page)).toBeInViewport();
    });
  }

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 1280, height: 600 },
    { width: 800, height: 700 },
  ]) {
    test(`the desktop orders page fits the screen without page scroll at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await signInAs(page, 'customer-card-late-orders');
      await waitForGrid(page);
      await page
        .getByRole('radiogroup', { name: 'Status' })
        .getByRole('radio', { name: /^Late \d+$/ })
        .click();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      await expect(page.locator('.ag-root')).toBeInViewport({ ratio: 1 });

      const gridBox = (await page.locator('.ag-root').boundingBox())!;
      const navBox = (await visiblePrimaryNavs(page).boundingBox())!;
      const overlaps =
        gridBox.x < navBox.x + navBox.width &&
        navBox.x < gridBox.x + gridBox.width &&
        gridBox.y < navBox.y + navBox.height &&
        navBox.y < gridBox.y + gridBox.height;
      expect(overlaps, 'grid sits clear of the nav').toBe(false);
    });
  }
});

test.describe.skip('side rail spacing on desktop', () => {
  test('the active link label keeps clear of its indicator', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInAs(page, 'customer-card-ALFKI');

    const rail = visiblePrimaryNavs(page);
    const link = rail.getByRole('link', { name: 'Orders', exact: true });
    const railBox = (await rail.boundingBox())!;
    const linkBox = (await link.boundingBox())!;
    const labelBox = (await link.getByText('Orders', { exact: true }).boundingBox())!;
    const indicatorWidth = await link.evaluate((element) =>
      parseFloat(getComputedStyle(element).borderInlineStartWidth),
    );

    expect(indicatorWidth).toBe(3);
    expect(linkBox.x).toBeCloseTo(railBox.x, 0);
    expect(linkBox.width).toBeCloseTo(railBox.width, 0);
    expect(labelBox.x - (linkBox.x + indicatorWidth)).toBeGreaterThanOrEqual(12);
  });
});
