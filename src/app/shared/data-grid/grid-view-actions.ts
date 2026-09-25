import type { GridColumn, GridViewState, SortKey } from './grid-types';

// One pure reducer per menu/keyboard action: (state, ...) -> next state.
// grid-view.ts derives what to render from a GridViewState; this is how a
// GridViewState changes. Kept separate so neither file needs the other's
// concerns to stay readable.

export function nextSort(
  current: readonly SortKey[],
  colId: string,
  mode: 'replace' | 'append',
): SortKey[] {
  if (mode === 'append') {
    const index = current.findIndex((key) => key.colId === colId);
    if (index === -1) return [...current, { colId, dir: 'asc' }];
    const flipped = [...current];
    flipped[index] = { colId, dir: flipped[index].dir === 'asc' ? 'desc' : 'asc' };
    return flipped;
  }

  const isSoleKey = current.length === 1 && current[0].colId === colId;
  if (isSoleKey) return current[0].dir === 'asc' ? [{ colId, dir: 'desc' }] : [];
  return [{ colId, dir: 'asc' }];
}

export function moveColumn(
  order: readonly string[],
  colId: string,
  direction: 'left' | 'right',
): string[] {
  const index = order.indexOf(colId);
  const target = direction === 'left' ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= order.length) return [...order];

  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function toggleHidden(hidden: readonly string[], colId: string): string[] {
  return hidden.includes(colId) ? hidden.filter((id) => id !== colId) : [...hidden, colId];
}

export function withWidth(
  widths: Readonly<Record<string, number>>,
  colId: string,
  width: number,
): Record<string, number> {
  return { ...widths, [colId]: width };
}

/** Widens/narrows a column to fit its widest rendered value, clamped to minWidth. */
export function fitWidthPx(
  headerWidth: number,
  cellWidths: readonly number[],
  minWidth: number,
): number {
  const contentWidth = Math.max(headerWidth, ...cellWidths, 0);
  return Math.max(minWidth, Math.ceil(contentWidth) + FIT_PADDING_PX);
}

const FIT_PADDING_PX = 24;

export function visibleColumns<Row>(
  columns: readonly GridColumn<Row>[],
  viewState: GridViewState,
): GridColumn<Row>[] {
  const byId = new Map(columns.map((column) => [column.id, column]));
  return viewState.columnOrder
    .filter((id) => !viewState.hidden.includes(id))
    .map((id) => byId.get(id))
    .filter((column): column is GridColumn<Row> => column !== undefined);
}
