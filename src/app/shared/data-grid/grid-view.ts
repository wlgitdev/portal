import type {
  BuildVisibleRowsInput,
  GridColumn,
  GridViewState,
  SortKey,
  VisibleRow,
} from './grid-types';

// Pure derivation for <app-data-grid>: sort -> group/tree -> flatten to the
// rows the template renders, plus the CSV export shape. No Angular, no DOM —
// covered directly by e2e/data-grid.spec.ts's assertions on the numbers and
// order this produces, not by unit tests of these functions in isolation.

export function defaultViewState<Row>(columns: readonly GridColumn<Row>[]): GridViewState {
  return {
    sort: [],
    groupBy: [],
    columnOrder: columns.map((c) => c.id),
    hidden: [],
    widths: Object.fromEntries(columns.map((c) => [c.id, c.width])),
    density: 'comfortable',
    preview: false,
    collapsedGroups: [],
  };
}

function naturalCompare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function rowCompare<Row>(columns: readonly GridColumn<Row>[], sort: readonly SortKey[]) {
  const keyed = sort
    .map((key) => ({ key, column: columns.find((c) => c.id === key.colId) }))
    .filter(
      (entry): entry is { key: SortKey; column: GridColumn<Row> } => entry.column !== undefined,
    );

  return (a: Row, b: Row): number => {
    for (const { key, column } of keyed) {
      const raw = column.compare
        ? column.compare(a, b)
        : naturalCompare(column.value(a), column.value(b));
      const signed = key.dir === 'asc' ? raw : -raw;
      if (signed !== 0) return signed;
    }
    return 0;
  };
}

/** Stable multi-key sort; rows already in API order, so a no-op sort keeps it. */
export function sortRows<Row>(
  rows: readonly Row[],
  columns: readonly GridColumn<Row>[],
  sort: readonly SortKey[],
): Row[] {
  if (sort.length === 0) return [...rows];
  return [...rows]
    .map((row, index) => ({ row, index }))
    .sort((a, b) => rowCompare(columns, sort)(a.row, b.row) || a.index - b.index)
    .map((entry) => entry.row);
}

function sumBy<Row>(rows: readonly Row[], column: GridColumn<Row>): number {
  return rows.reduce((sum, row) => sum + (Number(column.value(row)) || 0), 0);
}

function aggregatesFor<Row>(
  rows: readonly Row[],
  columns: readonly GridColumn<Row>[],
): ReadonlyMap<string, number> {
  const aggregates = new Map<string, number>();
  for (const column of columns) {
    if (column.aggregate === 'sum') aggregates.set(column.id, sumBy(rows, column));
  }
  return aggregates;
}

function orderedKeys<Row>(keys: readonly string[], column: GridColumn<Row> | undefined): string[] {
  if (column?.groupOrder) return column.groupOrder([...keys]);
  return [...keys].sort((a, b) => a.localeCompare(b));
}

interface HierarchyOptions<Row> {
  columns: readonly GridColumn<Row>[];
  rowId: (row: Row) => string;
  collapsedGroups: ReadonlySet<string>;
  highlighted: ReadonlySet<string>;
}

// Recursively partitions already-sorted rows by groupBy (up to 3 levels,
// enforced by the caller that builds groupBy) or by treeChildren, emitting
// group/data VisibleRows depth-first. Rows inside a group keep the sort
// order they arrived in.
function flattenGroups<Row>(
  rows: readonly Row[],
  groupBy: readonly string[],
  parentPath: string,
  level: number,
  options: HierarchyOptions<Row>,
): VisibleRow<Row>[] {
  if (groupBy.length === 0) {
    return rows.map((row) => dataRow(row, level, options));
  }

  const [colId, ...restGroupBy] = groupBy;
  const column = options.columns.find((c) => c.id === colId);
  if (!column?.groupKey) return flattenGroups(rows, restGroupBy, parentPath, level, options);

  const byKey = new Map<string, Row[]>();
  for (const row of rows) {
    const key = column.groupKey(row);
    const members = byKey.get(key);
    if (members) members.push(row);
    else byKey.set(key, [row]);
  }

  const result: VisibleRow<Row>[] = [];
  for (const key of orderedKeys([...byKey.keys()], column)) {
    const members = byKey.get(key)!;
    const path = parentPath ? `${parentPath}/${key}` : key;
    const id = `group:${path}`;
    const expanded = !options.collapsedGroups.has(id);
    result.push({
      id,
      kind: 'group',
      level,
      label: column.groupLabel?.(key) ?? key,
      count: members.length,
      expanded,
      aggregates: aggregatesFor(members, options.columns),
    });
    if (expanded) {
      result.push(...flattenGroups(members, restGroupBy, path, level + 1, options));
    }
  }
  return result;
}

function dataRow<Row>(row: Row, level: number, options: HierarchyOptions<Row>): VisibleRow<Row> {
  const id = options.rowId(row);
  return { id, kind: 'data', level, row, highlighted: options.highlighted.has(id) };
}

// Tree mode (treeChildren): same shape as groups, but nesting comes from the
// data itself rather than a column value, and every level is a data row
// (expandable), not a group row.
function flattenTree<Row>(
  rows: readonly Row[],
  treeChildren: (row: Row) => Row[] | undefined,
  level: number,
  options: HierarchyOptions<Row>,
): VisibleRow<Row>[] {
  const result: VisibleRow<Row>[] = [];
  for (const row of rows) {
    const id = options.rowId(row);
    const children = treeChildren(row);
    const hasChildren = !!children && children.length > 0;
    result.push({
      id,
      kind: 'data',
      level,
      row,
      expanded: hasChildren ? !options.collapsedGroups.has(id) : undefined,
      highlighted: options.highlighted.has(id),
      aggregates: hasChildren
        ? aggregatesFor(flattenLeaves(children!, treeChildren), options.columns)
        : undefined,
    });
    if (hasChildren && !options.collapsedGroups.has(id)) {
      result.push(...flattenTree(children!, treeChildren, level + 1, options));
    }
  }
  return result;
}

function flattenLeaves<Row>(
  rows: readonly Row[],
  treeChildren: (row: Row) => Row[] | undefined,
): Row[] {
  return rows.flatMap((row) => {
    const children = treeChildren(row);
    return children && children.length > 0 ? flattenLeaves(children, treeChildren) : [row];
  });
}

/** The full sort -> group/tree -> flatten -> footer pipeline the grid renders. */
export function buildVisibleRows<Row>(input: BuildVisibleRowsInput<Row>): VisibleRow<Row>[] {
  const { rows, columns, viewState, rowId, treeChildren } = input;
  const options: HierarchyOptions<Row> = {
    columns,
    rowId,
    collapsedGroups: new Set(viewState.collapsedGroups),
    highlighted: input.highlighted ?? new Set(),
  };

  const sorted = sortRows(rows, columns, viewState.sort);
  const body = treeChildren
    ? flattenTree(sorted, treeChildren, 1, options)
    : flattenGroups(sorted, viewState.groupBy, '', 1, options);

  const withDetailsAndPreview = body.flatMap((visible) => {
    if (visible.kind !== 'data' || !visible.row) return [visible];
    const id = rowId(visible.row);
    const isOpen = input.expandedDetails?.has(id) ?? false;
    const extra: VisibleRow<Row>[] = [
      input.detailExpandable ? { ...visible, expanded: isOpen } : visible,
    ];
    if (viewState.preview) {
      extra.push({ id: `preview:${id}`, kind: 'preview', level: visible.level, row: visible.row });
    }
    if (isOpen) {
      extra.push({ id: `detail:${id}`, kind: 'detail', level: visible.level, row: visible.row });
    }
    return extra;
  });

  return [
    ...withDetailsAndPreview,
    {
      id: 'footer',
      kind: 'footer',
      level: 0,
      label: `Total of ${rows.length} shown`,
      aggregates: aggregatesFor(rows, columns),
    },
  ];
}

/** rowNoun is always given plural ("orders", "lines"); singularise for a count of one. */
export function pluralize(rowNoun: string, count: number): string {
  return count === 1 && rowNoun.endsWith('s') ? rowNoun.slice(0, -1) : rowNoun;
}

export function statusBarSortSummary<Row>(
  columns: readonly GridColumn<Row>[],
  sort: readonly SortKey[],
): string | null {
  if (sort.length === 0) return null;
  const parts = sort.map((key) => {
    const header = columns.find((c) => c.id === key.colId)?.header ?? key.colId;
    return `${header} ${key.dir === 'asc' ? '↑' : '↓'}`;
  });
  return `Sorted by ${parts.join(', ')}`;
}

function csvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** RFC 4180 CSV of exactly the visible columns/rows, in display order. */
export function toCsv<Row>(columns: readonly GridColumn<Row>[], rows: readonly Row[]): string {
  const header = columns.map((c) => csvField(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvField(c.text(row))).join(','));
  return [header, ...lines].join('\r\n');
}
