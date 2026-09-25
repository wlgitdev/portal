import { expect, type Locator, type Page } from '@playwright/test';

// The only file allowed to know the grid's DOM (role/data-* contract from
// showcase-2 spec S2). Bundle B6 deleted the AG Grid half DES had paired
// every locator with here so the item-1 suite ran unchanged across the
// switch — that half is gone now; every locator below is the in-house
// <app-data-grid> contract only.

const GRID = '[data-testid="data-grid"][data-grid-id="orders"]';
const ROW = '[role="row"][data-grid-id="orders"]';
const DATA_ROW = `${ROW}[data-row-kind="data"]`;
const HEADER = '[role="columnheader"][data-grid-id="orders"]';

export type ColId = 'orderNo' | 'orderedOn' | 'status' | 'itemCount' | 'total' | 'shipTo';

export interface GridEntry {
  kind: 'group' | 'order';
  rowId: string;
}

export const TALL_DESKTOP = { width: 1280, height: 2400 };
export const NARROW_DESKTOP = { width: 800, height: 2400 };

export function grid(page: Page): Locator {
  return page.locator(GRID);
}

export async function waitForGrid(page: Page): Promise<void> {
  await expect(gridRows(page).first()).toBeVisible();
}

export function gridRows(page: Page): Locator {
  return page.locator(DATA_ROW);
}

export function orderRow(page: Page, orderId: number): Locator {
  return page.locator(`${DATA_ROW}[data-row-id="${orderId}"]`);
}

export function cell(row: Locator, colId: ColId): Locator {
  return row.locator(`:scope > [role="gridcell"][data-col-id="${colId}"]`);
}

export function cellsInColumn(page: Page, colId: ColId): Locator {
  return page.locator(`${DATA_ROW} > [role="gridcell"][data-col-id="${colId}"]`);
}

export function headerCell(page: Page, colId: ColId): Locator {
  return page.locator(`${HEADER}[data-col-id="${colId}"]`);
}

export function headerText(page: Page, colId: ColId): Locator {
  return headerCell(page, colId).locator('[data-testid="column-header-text"]');
}

export async function headerNames(page: Page): Promise<string[]> {
  const names = await page.locator(`${HEADER} [data-testid="column-header-text"]`).allInnerTexts();
  return names.map((name) => name.trim());
}

export function tooltip(page: Page): Locator {
  return page.locator('[data-testid="grid-tooltip"]');
}

export async function moveMouseAway(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  await expect(page.locator('[data-testid="grid-tooltip"]')).toHaveCount(0);
}

export async function visibleOrderIds(page: Page): Promise<number[]> {
  const ids = await page.locator(DATA_ROW).evaluateAll((rows) =>
    rows.map((row) => row.getAttribute('data-row-id') ?? ''),
  );
  return ids.map(Number).sort((a, b) => a - b);
}

export async function entriesInDisplayOrder(page: Page): Promise<GridEntry[]> {
  const rows = await page
    .locator(`${DATA_ROW}, ${ROW}[data-row-kind="group"]`)
    .evaluateAll((elements) =>
      elements.map((row) => ({
        rowId: row.getAttribute('data-row-id') ?? '',
        index: Number(row.getAttribute('aria-rowindex')),
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
    const value = element.querySelector('[data-testid="cell-value"]') ?? element;
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
