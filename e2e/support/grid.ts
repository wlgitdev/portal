import { expect, type Locator, type Page } from '@playwright/test';

// The only file allowed to know AG Grid's DOM: `.ag-*` classes and the
// `row-id` / `row-index` / `col-id` attributes are AG Grid's own, not ours.
// If a grid upgrade renames them, fix it here and nowhere else.

export type ColId =
  'orderNo' | 'orderedOn' | 'status' | 'progress' | 'itemCount' | 'total' | 'shipTo';

export interface GridEntry {
  kind: 'group' | 'order';
  rowId: string;
}

// Tall enough that AG Grid's row virtualisation renders every row of the
// largest demo customer (SAVEA, 31 orders) plus group rows, so DOM counts are
// real counts.
export const TALL_DESKTOP = { width: 1280, height: 2400 };
export const NARROW_DESKTOP = { width: 800, height: 2400 };

export function grid(page: Page): Locator {
  return page.locator('.ag-root');
}

export async function waitForGrid(page: Page): Promise<void> {
  await expect(grid(page).locator('.ag-row').first()).toBeVisible();
}

export function orderRow(page: Page, orderId: number): Locator {
  return grid(page).locator(`.ag-center-cols-container .ag-row[row-id="${orderId}"]`);
}

export function cell(row: Locator, colId: ColId): Locator {
  return row.locator(`.ag-cell[col-id="${colId}"]`);
}

export function cellsInColumn(page: Page, colId: ColId): Locator {
  return grid(page).locator(`.ag-center-cols-container .ag-cell[col-id="${colId}"]`);
}

export function headerCell(page: Page, colId: ColId): Locator {
  return grid(page).locator(`.ag-header-cell[col-id="${colId}"]`);
}

export async function headerNames(page: Page): Promise<string[]> {
  const names = await grid(page).locator('.ag-header-cell .ag-header-cell-text').allInnerTexts();
  return names.map((name) => name.trim());
}

export function tooltip(page: Page): Locator {
  return page.locator('.ag-tooltip:not(.ag-tooltip-hiding)');
}

export async function moveMouseAway(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  await expect(page.locator('.ag-tooltip')).toHaveCount(0);
}

export async function visibleOrderIds(page: Page): Promise<number[]> {
  const ids = await grid(page)
    .locator('.ag-center-cols-container .ag-row[row-id]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('row-id') ?? ''));
  return ids.map(Number).sort((a, b) => a - b);
}

// Group headers are full-width rows and live in a different container from
// order rows, so visual order comes from AG Grid's row-index, not DOM order.
export async function entriesInDisplayOrder(page: Page): Promise<GridEntry[]> {
  const rows = await grid(page)
    .locator('.ag-row[row-id][row-index]')
    .evaluateAll((elements) =>
      elements.map((row) => ({
        rowId: row.getAttribute('row-id') ?? '',
        index: Number(row.getAttribute('row-index')),
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
    const value = element.querySelector('.ag-cell-value') ?? element;
    return value.scrollWidth > value.clientWidth;
  });
}
