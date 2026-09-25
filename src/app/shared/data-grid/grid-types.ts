import type { TemplateRef } from '@angular/core';

// The shapes <app-data-grid> is built from. grid-view.ts derives what to
// render from these; grid-view-actions.ts changes them; the components
// render them. Kept separate from both so a reader can see the whole data
// model in one place.

export type SortDirection = 'asc' | 'desc';
export interface SortKey {
  colId: string;
  dir: SortDirection;
}

export type Density = 'comfortable' | 'compact';

// JSON-safe and localStorage-persisted (grid-view-persistence.ts); anything
// a session shouldn't remember (master-detail expansion, highlighted rows)
// stays out of this and lives as plain component state instead.
export interface GridViewState {
  sort: SortKey[];
  groupBy: string[];
  columnOrder: string[];
  hidden: string[];
  widths: Record<string, number>;
  density: Density;
  preview: boolean;
  collapsedGroups: string[];
}

export interface CellTemplateContext<Row> {
  $implicit: Row;
  row: Row;
  density: Density;
}

export interface GridColumn<Row> {
  id: string;
  header: string;
  headerTooltip?: string;
  value: (row: Row) => unknown;
  text: (row: Row) => string;
  align?: 'start' | 'end';
  mono?: boolean;
  minWidth: number;
  width: number;
  frozen?: boolean;
  sortable?: boolean;
  groupable?: boolean;
  groupKey?: (row: Row) => string;
  groupLabel?: (key: string) => string;
  /** Sibling group order at this column's level; default is ascending by key. */
  groupOrder?: (keys: string[]) => string[];
  aggregate?: 'sum';
  /** How an aggregate cell (group/footer) displays its sum; defaults to the plain number. */
  formatAggregate?: (sum: number) => string;
  /** Marks the one aggregate column the status bar sums/averages over the selection. */
  statusBar?: boolean;
  compare?: (a: Row, b: Row) => number;
  cellTemplate?: TemplateRef<CellTemplateContext<Row>>;
}

export type RowKind = 'data' | 'group' | 'detail' | 'preview' | 'footer';

export interface VisibleRow<Row> {
  readonly id: string;
  readonly kind: RowKind;
  readonly level: number;
  readonly row?: Row;
  readonly label?: string;
  readonly count?: number;
  readonly expanded?: boolean;
  readonly highlighted?: boolean;
  readonly aggregates?: ReadonlyMap<string, number>;
}

export interface BuildVisibleRowsInput<Row> {
  rows: readonly Row[];
  columns: readonly GridColumn<Row>[];
  viewState: GridViewState;
  rowId: (row: Row) => string;
  treeChildren?: (row: Row) => Row[] | undefined;
  expandedDetails?: ReadonlySet<string>;
  highlighted?: ReadonlySet<string>;
  /** Whether data rows should carry an expand/collapse affordance for a detail row at all. */
  detailExpandable?: boolean;
}
