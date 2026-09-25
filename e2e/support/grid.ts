import { expect, type Locator, type Page } from '@playwright/test';

// The only file allowed to know either grid's DOM. Until bundle B6 (showcase-2
// spec S2/S4) lands, the Orders grid is AG Grid (`.ag-*` classes, `row-id` /
// `row-index` / `col-id`); afterwards it is the in-house <app-data-grid>
// (role/data-* contract in S2). Every locator matches both, so the item-1
// suite runs unchanged across the switch. After B6, DEV deletes the AG halves.

const NEW_GRID = '[data-testid="data-grid"][data-grid-id="orders"]';
const NEW_ROW = '[role="row"][data-grid-id="orders"]';
const NEW_DATA_ROW = `${NEW_ROW}[data-row-kind="data"]`;
const NEW_HEADER = '[role="columnheader"][data-grid-id="orders"]';

export type ColId = 'orderNo' | 'orderedOn' | 'status' | 'itemCount' | 'total' | 'shipTo';

export interface GridEntry {
  kind: 'group' | 'order';
  rowId: string;
}

// Tall enough that AG Grid's row virtualisation renders every row of the
// largest demo customer (SAVEA, 31 orders) plus group rows, so DOM counts are
// real counts. The in-house grid doesn't virtualise; the size is harmless there.
export const TALL_DESKTOP = { width: 1280, height: 2400 };
export const NARROW_DESKTOP = { width: 800, height: 2400 };

export function grid(page: Page): Locator {
  return page.locator(`.ag-root, ${NEW_GRID}`);
}

export async function waitForGrid(page: Page): Promise<void> {
  await expect(gridRows(page).first()).toBeVisible();
}

export function gridRows(page: Page): Locator {
  return page.locator(`.ag-root .ag-row, ${NEW_DATA_ROW}`);
}

export function orderRow(page: Page, orderId: number): Locator {
  return page.locator(
    `.ag-center-cols-container .ag-row[row-id="${orderId}"], ${NEW_DATA_ROW}[data-row-id="${orderId}"]`,
  );
}

export function cell(row: Locator, colId: ColId): Locator {
  return row.locator(
    `.ag-cell[col-id="${colId}"], :scope > [role="gridcell"][data-col-id="${colId}"]`,
  );
}

export function cellsInColumn(page: Page, colId: ColId): Locator {
  return page.locator(
    `.ag-center-cols-container .ag-cell[col-id="${colId}"], ${NEW_DATA_ROW} > [role="gridcell"][data-col-id="${colId}"]`,
  );
}

export function headerCell(page: Page, colId: ColId): Locator {
  return page.locator(`.ag-header-cell[col-id="${colId}"], ${NEW_HEADER}[data-col-id="${colId}"]`);
}

export function headerText(page: Page, colId: ColId): Locator {
  return headerCell(page, colId).locator(
    '.ag-header-cell-text, [data-testid="column-header-text"]',
  );
}

export async function headerNames(page: Page): Promise<string[]> {
  const names = await page
    .locator(
      `.ag-header-cell .ag-header-cell-text, ${NEW_HEADER} [data-testid="column-header-text"]`,
    )
    .allInnerTexts();
  return names.map((name) => name.trim());
}

export function tooltip(page: Page): Locator {
  return page.locator('.ag-tooltip:not(.ag-tooltip-hiding), [data-testid="grid-tooltip"]');
}

export async function moveMouseAway(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  await expect(page.locator('.ag-tooltip, [data-testid="grid-tooltip"]')).toHaveCount(0);
}

export async function visibleOrderIds(page: Page): Promise<number[]> {
  const ids = await page
    .locator(`.ag-center-cols-container .ag-row[row-id], ${NEW_DATA_ROW}`)
    .evaluateAll((rows) =>
      rows.map((row) => row.getAttribute('row-id') ?? row.getAttribute('data-row-id') ?? ''),
    );
  return ids.map(Number).sort((a, b) => a - b);
}

// AG Grid keeps group rows in a different container from order rows, so
// visual order comes from row-index (aria-rowindex on the new grid), not DOM order.
export async function entriesInDisplayOrder(page: Page): Promise<GridEntry[]> {
  const rows = await page
    .locator(
      `.ag-root .ag-row[row-id][row-index], ${NEW_DATA_ROW}, ${NEW_ROW}[data-row-kind="group"]`,
    )
    .evaluateAll((elements) =>
      elements.map((row) => ({
        rowId: row.getAttribute('row-id') ?? row.getAttribute('data-row-id') ?? '',
        index: Number(row.getAttribute('row-index') ?? row.getAttribute('aria-rowindex')),
      })),
    );
  const seen = new Set<string>();
  return rows
    .sort((a, b) => a.index - b.index)
    .filter((row) => !seen.has(row.rowId) && seen.add(row.rowId))
    .map(({ rowId }) => ({ kind: rowId.startsWith('group:') ? 'group' : 'order', rowId }));
}

export async function isTruncated(target: Locator): Promise<boolean> {
  return target.evaluate((element) => {
    const value = element.querySelector('.ag-cell-value, [data-testid="cell-value"]') ?? element;
    return value.scrollWidth > value.clientWidth;
  });
}

// Distance in px from the end of the rendered text to the cell's right edge;
// small for right-aligned content, large for left-aligned short values.
export async function textRightGap(target: Locator): Promise<number> {
  return target.evaluate((element) => {
    const textNode = document
      .createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
          node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
      })
      .nextNode();
    if (!textNode) return Number.POSITIVE_INFINITY;
    const range = document.createRange();
    range.selectNodeContents(textNode);
    return element.getBoundingClientRect().right - range.getBoundingClientRect().right;
  });
}
