import { test, expect, type Locator, type Page } from '@playwright/test';
import { fetchOrdersAs, signInAs } from './support/portal';
import {
  DESKTOP,
  fetchOrderAs,
  fetchOrderLinesAs,
  money,
  roundPence,
  ukDate,
} from './support/showcase';

// Bundle B7 (roadmap item 7): work with an order and its lines side by side.
// Spec showcase-2 S5; design showcase-2 "Orders → Workspace".
// Rule 3b: DEV may only remove the .skip marker, never edit the assertions.

const CUSTOMER_ID = 'ALFKI';

function pane(page: Page, id: 'orders' | 'lines' | 'products' | 'details'): Locator {
  return page.locator(`[data-testid="pane"][data-pane-id="${id}"]`);
}

function dataRows(scope: Locator | Page, gridId: string): Locator {
  return scope.locator(`[role="row"][data-grid-id="${gridId}"][data-row-kind="data"]`);
}

async function openWorkspace(page: Page, viewport = DESKTOP): Promise<void> {
  await page.setViewportSize(viewport);
  await signInAs(page, 'customer-card-ALFKI');
  await page
    .getByRole('radiogroup', { name: 'Orders view' })
    .getByRole('radio', { name: 'Workspace' })
    .click();
  await expect(page).toHaveURL(/view=workspace/);
  await expect(dataRows(pane(page, 'orders'), 'workspace-orders').first()).toBeVisible();
}

async function selectOrder(page: Page, orderId: number): Promise<void> {
  await pane(page, 'orders')
    .locator(`[role="row"][data-grid-id="workspace-orders"][data-row-id="${orderId}"]`)
    .click();
}

test.describe.skip('work with an order and its lines side by side (B7)', () => {
  test('the Workspace view is offered only from 1024px up', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await signInAs(page, 'customer-card-ALFKI');
    await expect(
      page
        .getByRole('radiogroup', { name: 'Orders view' })
        .getByRole('radio', { name: 'Workspace' }),
    ).toBeVisible();

    await page.setViewportSize({ width: 1000, height: 800 });
    await expect(page.getByRole('radiogroup', { name: 'Orders view' })).toHaveCount(0);
  });

  test('selecting an order fills Lines and Details, and survives a reload', async ({
    page,
    request,
  }) => {
    const [order] = await fetchOrdersAs(request, CUSTOMER_ID);
    const detail = await fetchOrderAs(request, CUSTOMER_ID, order.id);
    await openWorkspace(page);

    await expect(pane(page, 'lines')).toContainText('Select an order to see its lines');
    await selectOrder(page, order.id);
    await expect(page).toHaveURL(new RegExp(`order=${order.id}`));

    const lineRows = dataRows(pane(page, 'lines'), 'workspace-lines');
    await expect(lineRows).toHaveCount(detail.lines.length);
    await expect(
      pane(page, 'lines').locator(
        '[role="row"][data-grid-id="workspace-lines"][data-row-kind="footer"] [data-col-id="amount"]',
      ),
    ).toHaveText(money.format(order.total));

    const details = page.getByTestId('order-details-pane');
    await expect(details.getByTestId('order-details-ordered')).toHaveText(ukDate(detail.orderedOn));
    await expect(details.getByTestId('order-details-due')).toHaveText(ukDate(detail.dueOn));
    await expect(details.getByTestId('order-details-freight')).toHaveText(
      money.format(detail.freight),
    );
    await expect(details.getByTestId('order-details-ship-to')).toContainText(detail.shipTo.name!);

    await page.reload();
    await expect(dataRows(pane(page, 'lines'), 'workspace-lines')).toHaveCount(detail.lines.length);
  });

  test('the bottom splitter grows the bottom dock with the arrow keys', async ({ page }) => {
    await openWorkspace(page);
    const splitter = page.getByRole('separator', { name: 'Resize bottom', exact: true });
    const before = Number(await splitter.getAttribute('aria-valuenow'));
    const heightBefore = (await pane(page, 'lines').boundingBox())!.height;

    await splitter.focus();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');

    await expect(splitter).toHaveAttribute('aria-valuenow', String(before + 32));
    expect((await pane(page, 'lines').boundingBox())!.height - heightBefore).toBeCloseTo(32, 0);
  });

  test('Auto-hide moves a pane to an edge tab that slides it back in; Pin docks it', async ({
    page,
  }) => {
    await openWorkspace(page);
    const details = pane(page, 'details');

    await details.getByRole('button', { name: 'Auto-hide Order details' }).click();
    await expect(details).toBeHidden();
    const edgeTab = page.getByTestId('autohide-tab').filter({ hasText: 'Order details' });
    await expect(edgeTab).toBeVisible();

    await edgeTab.click();
    await expect(details).toBeVisible();
    await expect(details).toHaveAttribute('data-overlay', 'true');

    await details.getByRole('button', { name: 'Pin Order details' }).click();
    await expect(details).not.toHaveAttribute('data-overlay', 'true');
    await expect(page.getByTestId('autohide-tab')).toHaveCount(0);
  });

  test('Maximise fills the workspace and Esc restores', async ({ page }) => {
    await openWorkspace(page);
    const orders = pane(page, 'orders');
    const before = (await orders.boundingBox())!;

    await orders.getByRole('button', { name: 'Maximise Orders' }).click();
    const maximised = (await orders.boundingBox())!;
    expect(maximised.width).toBeGreaterThan(before.width);
    expect(maximised.height).toBeGreaterThan(before.height);
    await expect(pane(page, 'details')).toBeHidden();

    await page.keyboard.press('Escape');
    expect((await orders.boundingBox())!.width).toBeCloseTo(before.width, 0);
    await expect(pane(page, 'details')).toBeVisible();
  });

  test('Products bought sums spend and quantity at every level', async ({ page, request }) => {
    const lines = await fetchOrderLinesAs(request, CUSTOMER_ID);
    await openWorkspace(page);
    await page.getByRole('tab', { name: /^Products bought/ }).click();

    const tree = pane(page, 'products');
    const categories = [...new Set(lines.map((l) => l.categoryName))];
    const level1 = tree.locator('[role="row"][data-grid-id="products-bought"][aria-level="1"]');
    await expect(level1).toHaveCount(categories.length);

    for (const category of categories) {
      const inCategory = lines.filter((l) => l.categoryName === category);
      const row = level1.filter({ hasText: category });
      await expect(row.locator('[data-col-id="spend"]')).toHaveText(
        money.format(roundPence(inCategory.reduce((s, l) => s + l.lineTotal, 0))),
      );
      await expect(row.locator('[data-col-id="quantity"]')).toHaveText(
        String(inCategory.reduce((s, l) => s + l.quantity, 0)),
      );
    }

    const first = level1.first();
    await first.getByRole('button', { name: /^Expand/ }).click();
    const product = tree
      .locator('[role="row"][data-grid-id="products-bought"][aria-level="2"]')
      .first();
    await expect(product).toBeVisible();
    await product.getByRole('button', { name: /^Expand/ }).click();
    await expect(
      tree.locator('[role="row"][data-grid-id="products-bought"][aria-level="3"]').first(),
    ).toHaveText(/#\d+ · \d{2}\/\d{2}\/\d{4}/);
  });

  test('selecting a product highlights exactly the orders that contain it', async ({
    page,
    request,
  }) => {
    const lines = await fetchOrderLinesAs(request, CUSTOMER_ID);
    const target = lines[0];
    const expected = [
      ...new Set(lines.filter((l) => l.productId === target.productId).map((l) => l.orderId)),
    ].sort();
    await openWorkspace(page);
    await page.getByRole('tab', { name: /^Products bought/ }).click();
    const tree = pane(page, 'products');
    await tree
      .locator('[role="row"][data-grid-id="products-bought"][aria-level="1"]')
      .filter({ hasText: target.categoryName })
      .getByRole('button', { name: /^Expand/ })
      .click();

    await tree
      .locator('[role="row"][data-grid-id="products-bought"][aria-level="2"]')
      .filter({ hasText: target.productName })
      .click();

    const highlighted = await pane(page, 'orders')
      .locator('[role="row"][data-grid-id="workspace-orders"][data-highlighted="true"]')
      .evaluateAll((rows) => rows.map((r) => Number(r.getAttribute('data-row-id'))));
    expect(highlighted.sort()).toEqual(expected);
    const chip = page.getByTestId('highlight-chip');
    await expect(chip).toContainText(`Highlighting orders with ${target.productName}`);

    await chip.getByRole('button', { name: 'Stop highlighting' }).click();
    await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);
  });

  test('a moved pane survives reload; Reset layout restores it and Undo reverts', async ({
    page,
  }) => {
    await openWorkspace(page);
    const details = pane(page, 'details');

    await details.getByRole('button', { name: 'Order details options' }).click();
    await page.getByRole('menuitem', { name: 'Move to' }).click();
    await page.getByRole('menuitem', { name: 'Left', exact: true }).click();
    const isLeftOfOrders = async () =>
      (await details.boundingBox())!.x < (await pane(page, 'orders').boundingBox())!.x;
    expect(await isLeftOfOrders()).toBe(true);

    await page.reload();
    await expect(details).toBeVisible();
    expect(await isLeftOfOrders()).toBe(true);

    await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
    expect(await isLeftOfOrders()).toBe(false);
    const snackbar = page.locator('.mat-mdc-snack-bar-container');
    await expect(snackbar).toContainText('Layout reset');
    await snackbar.getByRole('button', { name: 'Undo' }).click();
    expect(await isLeftOfOrders()).toBe(true);
  });

  test('on a 1100px window Order details starts auto-hidden', async ({ page }) => {
    await openWorkspace(page, { width: 1100, height: 800 });
    await expect(pane(page, 'details')).toBeHidden();
    await expect(
      page.getByTestId('autohide-tab').filter({ hasText: 'Order details' }),
    ).toBeVisible();
  });
});
