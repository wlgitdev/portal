import { test, expect, type Locator, type Page } from '@playwright/test';
import { signInAs } from './support/portal';
import { isA4Portrait, readPdf, withoutWhitespace } from './support/pdf';
import { readPackageJson } from './support/showcase';

// Bundle B11 (roadmap item 11): print a delivery note or save it as PDF.
// Spec showcase-2 S9; design showcase-2 "Delivery note — print-ready page".
// Replaces item 2's download tests: the generated download is removed on
// purpose (design "Told to WL"); these pin the print-ready page instead.
// Rule 3b: DEV may only remove the .skip marker, never edit the assertions.
test.describe.skip('print a delivery note or save it as PDF (B11)', () => {
  // ALFKI's order 10643 has a 25% discount on every line, so it proves the
  // note carries the discounted amounts the drawer shows, not list price x qty.
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

  async function openDeliveryNote(page: Page, drawer: Locator): Promise<Page> {
    const [note] = await Promise.all([
      page.context().waitForEvent('page'),
      drawer.getByRole('button', { name: 'Delivery note', exact: true }).click(),
    ]);
    await note.waitForLoadState();
    await expect(note.getByTestId('delivery-note-total')).toBeVisible();
    return note;
  }

  test('the drawer opens the note in a new tab titled after the order', async ({ page }) => {
    const drawer = await openOrderDrawer(page, DISCOUNTED_ORDER_ID);
    await expect(
      drawer.getByRole('button', { name: 'Download delivery note', exact: true }),
    ).toHaveCount(0);

    const note = await openDeliveryNote(page, drawer);
    expect(new URL(note.url()).pathname).toBe(`/orders/${DISCOUNTED_ORDER_ID}/delivery-note`);
    await expect(note).toHaveTitle(`delivery-note-${DISCOUNTED_ORDER_ID}`);
  });

  test("the note's line amounts, freight and total match the drawer", async ({ page }) => {
    const drawer = await openOrderDrawer(page, DISCOUNTED_ORDER_ID);
    const lineAmounts = await drawer.getByTestId('order-drawer-line-amount').allInnerTexts();
    const freight = await drawer.getByTestId('order-drawer-freight').innerText();
    const total = await drawer.getByTestId('order-drawer-total').innerText();
    expect(lineAmounts.length).toBeGreaterThan(0);

    const note = await openDeliveryNote(page, drawer);
    await expect(note.getByTestId('delivery-note-line-amount')).toHaveText(lineAmounts);
    await expect(note.getByTestId('delivery-note-freight')).toHaveText(freight);
    await expect(note.getByTestId('delivery-note-total')).toHaveText(total);
  });

  test('"Print or save as PDF" opens the browser print dialog', async ({ page }) => {
    const drawer = await openOrderDrawer(page, DISCOUNTED_ORDER_ID);
    await page.context().addInitScript(() => {
      (window as unknown as { printCalls: number }).printCalls = 0;
      window.print = () => {
        (window as unknown as { printCalls: number }).printCalls++;
      };
    });

    const note = await openDeliveryNote(page, drawer);
    await note.getByRole('button', { name: 'Print or save as PDF', exact: true }).click();

    expect(
      await note.evaluate(() => (window as unknown as { printCalls: number }).printCalls),
    ).toBe(1);
  });

  test('printed to PDF it is A4 portrait, with the manifest and without the toolbar', async ({
    page,
  }) => {
    const drawer = await openOrderDrawer(page, DISCOUNTED_ORDER_ID);
    const total = await drawer.getByTestId('order-drawer-total').innerText();
    const note = await openDeliveryNote(page, drawer);

    await note.emulateMedia({ media: 'print' });
    const pdf = await readPdf(await note.pdf({ preferCSSPageSize: true, printBackground: true }));

    expect(pdf.pages.length).toBeGreaterThan(0);
    for (const size of pdf.pages) {
      expect(isA4Portrait(size), `page is ${size.widthPt} x ${size.heightPt}pt`).toBe(true);
    }
    const text = withoutWhitespace(pdf.text);
    expect(text).toContain(`#${DISCOUNTED_ORDER_ID}`);
    expect(text).toContain(withoutWhitespace('Delivery note'));
    expect(text).toContain(withoutWhitespace('Received by'));
    expect(text).toContain(withoutWhitespace(total));
    expect(text).not.toContain(withoutWhitespace('Print or save as PDF'));
  });

  test("another customer's order says it isn't yours", async ({ page }) => {
    await signInAs(page, 'customer-card-ALFKI');
    // 10248 belongs to VINET, not ALFKI.
    await page.goto('/orders/10248/delivery-note');
    await expect(page.getByText("This order isn't one of yours")).toBeVisible();
    await expect(page.getByTestId('delivery-note-total')).toHaveCount(0);
  });

  test('pdfmake is gone from package.json', async () => {
    const pkg = await readPackageJson();
    expect(Object.keys(pkg.dependencies)).not.toContain('pdfmake');
    expect(Object.keys(pkg.devDependencies)).not.toContain('@types/pdfmake');
  });
});
