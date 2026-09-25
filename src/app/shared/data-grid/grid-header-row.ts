import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { Component, input, output } from '@angular/core';
import { END_ALIGNED_MENU_POSITION } from '../menu-position';
import { nextSort, moveColumn } from './grid-view-actions';
import type { GridColumn, SortDirection, SortKey } from './grid-types';
import { GridResizeHandle } from './grid-resize-handle';
import { GridTooltipTarget } from './grid-tooltip';

// One row of column headers: sort (click / Shift+click / menu), the
// per-column menu (sort, group, move, hide), and its resize handle. How a
// header interaction changes sort/columnOrder/hidden lives here, next to
// the interactions that trigger it; the parent sets aria-rowindex (it
// numbers every row, header included).
@Component({
  selector: 'app-grid-header-row',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, GridResizeHandle, GridTooltipTarget],
  templateUrl: './grid-header-row.html',
  styleUrl: './grid-header-row.css',
  host: { role: 'row', class: 'grid-header-row', '[attr.data-grid-id]': 'gridId()' },
})
export class GridHeaderRow<Row> {
  readonly gridId = input.required<string>();
  readonly columns = input.required<readonly GridColumn<Row>[]>();
  readonly columnOrder = input.required<readonly string[]>();
  readonly sort = input.required<readonly SortKey[]>();
  readonly widths = input.required<Readonly<Record<string, number>>>();
  readonly groupByIds = input<readonly string[]>([]);

  readonly sortChanged = output<SortKey[]>();
  readonly groupByColumn = output<string>();
  readonly columnOrderChanged = output<string[]>();
  readonly columnHiddenChanged = output<string>();
  readonly columnResized = output<{ colId: string; width: number }>();
  readonly columnFitted = output<string>();

  protected readonly menuPosition = END_ALIGNED_MENU_POSITION;

  protected sortKeyFor(colId: string): SortKey | undefined {
    return this.sort().find((key) => key.colId === colId);
  }

  protected sortRank(colId: string): number {
    return this.sort().findIndex((key) => key.colId === colId) + 1;
  }

  protected onHeaderClick(colId: string, event: MouseEvent): void {
    this.sortChanged.emit(nextSort(this.sort(), colId, event.shiftKey ? 'append' : 'replace'));
  }

  protected onAddToSort(colId: string): void {
    this.sortChanged.emit(nextSort(this.sort(), colId, 'append'));
  }

  protected onSortDirect(colId: string, dir: SortDirection): void {
    this.sortChanged.emit([{ colId, dir }]);
  }

  protected onMove(colId: string, direction: 'left' | 'right'): void {
    this.columnOrderChanged.emit(moveColumn(this.columnOrder(), colId, direction));
  }

  protected canGroup(colId: string): boolean {
    const active = this.groupByIds();
    return active.length < 3 || active.includes(colId);
  }

  // Dragging a header onto the group box: the drop target can be resolved
  // with elementFromPoint at mouseup, so this needs no coordination with
  // wherever the group box actually is (a sibling of this component).
  protected onHeaderMouseDown(colId: string, groupable: boolean | undefined): void {
    if (!groupable) return;
    const onUp = (event: MouseEvent): void => {
      document.removeEventListener('mouseup', onUp);
      const target = document.elementFromPoint(event.clientX, event.clientY);
      if (target?.closest('[data-testid="group-box"]') && this.canGroup(colId)) {
        this.groupByColumn.emit(colId);
      }
    };
    document.addEventListener('mouseup', onUp);
  }
}
