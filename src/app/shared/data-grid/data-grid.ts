import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Grid } from '@angular/aria/grid';
import { Viewport } from '../viewport/viewport';
import {
  Component,
  ElementRef,
  type OnInit,
  type TemplateRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { buildVisibleRows, defaultViewState, statusBarSortSummary, toCsv } from './grid-view';
import type {
  CellTemplateContext,
  Density,
  GridColumn,
  GridViewState,
  SortKey,
} from './grid-types';
import {
  fitWidthPx,
  toggleHidden,
  visibleColumns as computeVisibleColumns,
  withWidth,
} from './grid-view-actions';
import { GridViewPersistence } from './grid-view-persistence';
import { GridGroupBox } from './grid-group-box';
import { GridHeaderRow } from './grid-header-row';
import { GridRow } from './grid-row';
import { GridStatusBar } from './grid-status-bar';
import { GridTooltip } from './grid-tooltip';

// The whole grid, composed from its own pieces: this file wires state and
// events together and renders the shell; header/row rendering, the sort/
// group/flatten pipeline and view-state persistence all live in their own
// files under data-grid/. One instance is reusable for the orders list, a
// nested order's lines, and (workspace, products-bought) other rowNouns —
// nothing here names "orders" or any other caller.
@Component({
  selector: 'app-data-grid',
  imports: [Grid, GridGroupBox, GridHeaderRow, GridRow, GridStatusBar],
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.css',
  providers: [GridTooltip],
  host: { class: 'app-data-grid', '[style.--data-grid-row-height]': 'rowHeightPx()' },
})
export class DataGrid<Row> implements OnInit {
  private readonly persistence = inject(GridViewPersistence);
  private readonly snackBar = inject(MatSnackBar);
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  private readonly viewport = inject(Viewport);
  private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;

  // A nested grid (master-detail lines) reuses its ancestor grid's tooltip
  // rather than showing a second one; only the outermost instance owns it.
  private readonly inheritedTooltip = inject(GridTooltip, { optional: true, skipSelf: true });
  protected readonly tooltip = this.inheritedTooltip ?? inject(GridTooltip, { self: true });
  protected readonly ownsTooltip = !this.inheritedTooltip;

  readonly gridId = input.required<string>();
  readonly rows = input.required<readonly Row[]>();
  readonly columns = input.required<readonly GridColumn<Row>[]>();
  readonly rowId = input.required<(row: Row) => string>();
  readonly rowNoun = input.required<string>();
  readonly selectable = input(false);
  readonly detailTemplate = input<TemplateRef<CellTemplateContext<Row>> | undefined>(undefined);
  readonly detailButtonLabel = input<((row: Row) => string) | undefined>(undefined);
  readonly previewText = input<((row: Row) => string) | undefined>(undefined);
  readonly treeChildren = input<((row: Row) => Row[] | undefined) | undefined>(undefined);
  readonly highlighted = input<ReadonlySet<string> | undefined>(undefined);

  readonly rowActivated = output<Row>();
  readonly selectionChange = output<Row[]>();
  readonly viewStateChange = output<GridViewState>();

  // Placeholder until ngOnInit: required inputs (gridId, columns — the
  // localStorage key and its defaults) aren't readable before then (NG8118).
  protected readonly viewState = signal<GridViewState>(defaultViewState([]));
  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  private readonly expandedDetailIds = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    this.viewState.set(this.persistence.load(this.gridId(), this.columns()));
  }

  protected readonly visibleColumns = computed(() =>
    computeVisibleColumns(this.columns(), this.viewState()),
  );
  protected readonly showGroupBox = computed(
    () => !this.viewport.isPhone() && this.columns().some((column) => column.groupable),
  );
  protected readonly statusBarColumn = computed(() =>
    this.columns().find((column) => column.statusBar),
  );
  protected readonly rowHeightPx = computed(() =>
    this.viewState().density === 'compact'
      ? 'var(--row-height-compact)'
      : 'var(--row-height-comfortable)',
  );

  protected readonly selectedRows = computed(() => {
    const ids = this.selectedIds();
    const rowId = this.rowId();
    return this.rows().filter((row) => ids.has(rowId(row)));
  });

  protected readonly visibleRows = computed(() =>
    buildVisibleRows({
      rows: this.rows(),
      columns: this.visibleColumns(),
      viewState: this.viewState(),
      rowId: this.rowId(),
      treeChildren: this.treeChildren(),
      expandedDetails: this.expandedDetailIds(),
      highlighted: this.highlighted(),
      detailExpandable: !!this.detailTemplate(),
    }),
  );

  protected onSortChanged(sort: SortKey[]): void {
    this.setViewState({ ...this.viewState(), sort });
    void this.liveAnnouncer.announce(
      statusBarSortSummary(this.visibleColumns(), sort) ?? 'Sort cleared',
      'polite',
    );
  }

  protected onClearSort(): void {
    this.onSortChanged([]);
  }

  protected onColumnOrderChanged(columnOrder: string[]): void {
    this.setViewState({ ...this.viewState(), columnOrder });
  }

  protected onColumnResized(event: { colId: string; width: number }): void {
    this.setViewState({
      ...this.viewState(),
      widths: withWidth(this.viewState().widths, event.colId, event.width),
    });
  }

  protected onColumnFitted(colId: string): void {
    const column = this.columns().find((c) => c.id === colId);
    if (!column) return;
    const cellSelector = `.grid-row [data-col-id="${CSS.escape(colId)}"] [data-testid="cell-value"]`;
    const headerSelector = `.grid-header-row [data-col-id="${CSS.escape(colId)}"] [data-testid="column-header-text"]`;
    const cellWidths = [...this.hostElement.querySelectorAll<HTMLElement>(cellSelector)].map(
      (el) => el.scrollWidth,
    );
    const headerWidth =
      this.hostElement.querySelector<HTMLElement>(headerSelector)?.scrollWidth ?? 0;
    const width = fitWidthPx(headerWidth, cellWidths, column.minWidth);
    this.onColumnResized({ colId, width });
  }

  toggleColumnHidden(colId: string): void {
    this.setViewState({
      ...this.viewState(),
      hidden: toggleHidden(this.viewState().hidden, colId),
    });
  }

  setDensity(density: Density): void {
    this.setViewState({ ...this.viewState(), density });
  }

  togglePreview(): void {
    this.setViewState({ ...this.viewState(), preview: !this.viewState().preview });
  }

  /** Replaces the whole grouping (the toolbar's "Group by" menu: one column, or none). */
  setGroupBy(groupBy: string[]): void {
    this.setViewState({ ...this.viewState(), groupBy });
  }

  /** Appends a level (a header's "Group by this column"), up to the 3-level cap. */
  protected onGroupByColumn(colId: string): void {
    const current = this.viewState().groupBy;
    if (current.includes(colId) || current.length >= 3) return;
    this.setViewState({ ...this.viewState(), groupBy: [...current, colId] });
  }

  exportCsv(): void {
    const rowsInOrder = this.visibleRows()
      .filter((visible) => visible.kind === 'data')
      .map((visible) => visible.row!);
    const csv = toCsv(this.visibleColumns(), rowsInOrder);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.gridId()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  resetView(): void {
    const previous = this.viewState();
    this.setViewState(defaultViewState(this.columns()));
    const ref = this.snackBar.open('View reset', 'Undo', { duration: 6000 });
    ref.onAction().subscribe(() => this.setViewState(previous));
  }

  protected onSelectionToggled(event: { row: Row; shiftKey: boolean }): void {
    const rowId = this.rowId();
    const id = rowId(event.row);
    const next = new Set(this.selectedIds());
    if (event.shiftKey && this.selectedIds().size > 0) {
      this.selectRange(id, next);
    } else if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
    this.selectionChange.emit(this.rows().filter((row) => next.has(rowId(row))));
  }

  private selectRange(toId: string, next: Set<string>): void {
    const ids = this.visibleRows()
      .filter((visible) => visible.kind === 'data')
      .map((visible) => this.rowId()(visible.row!));
    const anchor = ids.findIndex((id) => next.has(id));
    const target = ids.indexOf(toId);
    if (anchor === -1 || target === -1) {
      next.add(toId);
      return;
    }
    const [start, end] = anchor < target ? [anchor, target] : [target, anchor];
    for (let i = start; i <= end; i++) next.add(ids[i]);
  }

  protected onExpandAll(): void {
    this.setViewState({ ...this.viewState(), collapsedGroups: [] });
  }

  protected onCollapseAll(): void {
    const allExpanded = buildVisibleRows({
      rows: this.rows(),
      columns: this.visibleColumns(),
      viewState: { ...this.viewState(), collapsedGroups: [] },
      rowId: this.rowId(),
    });
    const groupIds = allExpanded.filter((v) => v.kind === 'group').map((v) => v.id);
    this.setViewState({ ...this.viewState(), collapsedGroups: groupIds });
  }

  protected onGroupToggled(groupId: string): void {
    const collapsed = this.viewState().collapsedGroups;
    const next = collapsed.includes(groupId)
      ? collapsed.filter((id) => id !== groupId)
      : [...collapsed, groupId];
    this.setViewState({ ...this.viewState(), collapsedGroups: next });
    void this.liveAnnouncer.announce(
      collapsed.includes(groupId) ? 'Expanded' : 'Collapsed',
      'polite',
    );
  }

  protected onDetailToggled(row: Row): void {
    const id = this.rowId()(row);
    const next = new Set(this.expandedDetailIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.expandedDetailIds.set(next);
  }

  private setViewState(next: GridViewState): void {
    this.viewState.set(next);
    this.persistence.save(this.gridId(), next);
    this.viewStateChange.emit(next);
  }
}
