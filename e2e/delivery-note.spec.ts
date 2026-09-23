import { readFile } from 'node:fs/promises';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { signInAs } from './support/portal';
import { isA4Portrait, readPdf, withoutWhitespace } from './support/pdf';

// Bundle B2 (roadmap item 2): download a delivery note for any order.
// To test: open an order, download its delivery note, check the PDF totals
// match the screen.
// Rule 3b: DEV may only remove this .skip, never edit the assertions below.
test.describe('download a delivery note', () => {
  // ALFKI's order 10643 has a 25% discount on every line, so it proves the
  // PDF carries the discounted amounts the drawer shows, not list price x qty.
  const DISCOUNTED_ORDER_ID = 10643;

  async function openOrderDrawer(page: Page, orderId: number): Promise<Locator> {
    await signInAs(page, 'customer-card-ALFKI');
    await page.getByTestId('orders-search').fill(`#${orderId}`);
    await page
      .getByTestId('order-row')
      .filter({ hasText: `#${orderId}` })
      .click();
    const drawer = page.getByTestId('order-drawer');
    await expect(drawer.getByTestId('order-drawer-total')).toBeVisible();
    return drawer;
  }

  async function downloadDeliveryNote(page: Page, drawer: Locator) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      drawer.getByRole('button', { name: 'Download delivery note', exact: true }).click(),
    ]);
    return download;
  }

  test('downloads an A4 PDF named after the order', async ({ page }) => {
    const drawer = await openOrderDrawer(page, DISCOUNTED_ORDER_ID);

    const download = await downloadDeliveryNote(page, drawer);
    expect(download.suggestedFilename()).toBe(`delivery-note-${DISCOUNTED_ORDER_ID}.pdf`);

    const pdf = await readPdf(await readFile(await download.path()));
    expect(pdf.pages.length).toBeGreaterThan(0);
    for (const size of pdf.pages) {
      expect(isA4Portrait(size), `page is ${size.widthPt} x ${size.heightPt}pt`).toBe(true);
    }
    const text = withoutWhitespace(pdf.text);
    expect(text).toContain(`#${DISCOUNTED_ORDER_ID}`);
    expect(text).toContain(withoutWhitespace('Delivery note'));
    expect(text).toContain(withoutWhitespace('Received by'));
  });

  test("the PDF's line amounts, freight and total match the drawer", async ({ page }) => {
    const drawer = await openOrderDrawer(page, DISCOUNTED_ORDER_ID);
    const lineAmounts = await drawer.getByTestId('order-drawer-line-amount').allInnerTexts();
    const freight = await drawer.getByTestId('order-drawer-freight').innerText();
    const total = await drawer.getByTestId('order-drawer-total').innerText();
    expect(lineAmounts.length).toBeGreaterThan(0);

    const download = await downloadDeliveryNote(page, drawer);
    const text = withoutWhitespace((await readPdf(await readFile(await download.path()))).text);

    for (const amount of lineAmounts) {
      expect(text).toContain(withoutWhitespace(amount));
    }
    expect(text).toContain(withoutWhitespace(freight));
    expect(text).toContain(withoutWhitespace(total));
  });

  test('works for an order whose drawer was not the first one opened', async ({ page }) => {
    await signInAs(page, 'customer-card-ALFKI');
    const rows = page.getByTestId('order-row');
    const drawer = page.getByTestId('order-drawer');

    await rows.first().click();
    await expect(drawer.getByTestId('order-drawer-total')).toBeVisible();
    await drawer.getByRole('button', { name: 'Close order detail' }).click();

    const second = rows.nth(1);
    const secondId = await second.getAttribute('data-order-id');
    await second.click();
    await expect(drawer.getByText(`#${secondId}`)).toBeVisible();
    await expect(drawer.getByTestId('order-drawer-total')).toBeVisible();
    const total = await drawer.getByTestId('order-drawer-total').innerText();

    const download = await downloadDeliveryNote(page, drawer);
    expect(download.suggestedFilename()).toBe(`delivery-note-${secondId}.pdf`);
    const text = withoutWhitespace((await readPdf(await readFile(await download.path()))).text);
    expect(text).toContain(`#${secondId}`);
    expect(text).toContain(withoutWhitespace(total));
  });
});
