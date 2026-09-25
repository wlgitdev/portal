import { CdkDrag, type CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, input, output } from '@angular/core';
import type { GridColumn } from './grid-types';

// "Drag a column here to group by it": up to 3 chips, one per grouping
// level, reorderable by drag or Alt+←/→ on a focused chip. Only rendered
// when there's something groupable — a header cell drops onto this by data-
// testid="group-box" via document.elementFromPoint (grid-header-row.ts),
// so this component itself needs no knowledge of where the drag started.
@Component({
  selector: 'app-grid-group-box',
  imports: [CdkDropList, CdkDrag],
  templateUrl: './grid-group-box.html',
  styleUrl: './grid-group-box.css',
  host: { 'data-testid': 'group-box', class: 'grid-group-box' },
})
export class GridGroupBox<Row> {
  readonly columns = input.required<readonly GridColumn<Row>[]>();
  readonly groupBy = input.required<readonly string[]>();

  readonly groupByChanged = output<string[]>();
  readonly expandAll = output<void>();
  readonly collapseAll = output<void>();

  protected chipColumns(): GridColumn<Row>[] {
    return this.groupBy()
      .map((id) => this.columns().find((column) => column.id === id))
      .filter((column): column is GridColumn<Row> => !!column);
  }

  protected removeLevel(colId: string): void {
    this.groupByChanged.emit(this.groupBy().filter((id) => id !== colId));
  }

  protected onDrop(event: CdkDragDrop<unknown>): void {
    const next = [...this.groupBy()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.groupByChanged.emit(next);
  }

  protected onChipKeydown(colId: string, event: KeyboardEvent): void {
    if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    const order = [...this.groupBy()];
    const index = order.indexOf(colId);
    const target = event.key === 'ArrowLeft' ? index - 1 : index + 1;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    this.groupByChanged.emit(order);
  }
}
