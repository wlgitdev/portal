import { Component, computed, input, output } from '@angular/core';
import { formatMoney } from '../format-money';
import { statusBarSortSummary } from './grid-view';
import type { GridColumn, SortKey } from './grid-types';

// "31 orders · 3 selected · Sum £2,140.50 · Avg £713.50 · Sorted by Status
// ↑, Total ↓ · Clear" — the one line the grid always keeps on screen.
@Component({
  selector: 'app-grid-status-bar',
  templateUrl: './grid-status-bar.html',
  styleUrl: './grid-status-bar.css',
  host: { 'data-testid': 'grid-status-bar', class: 'grid-status-bar' },
})
export class GridStatusBar<Row> {
  readonly rowNoun = input.required<string>();
  readonly totalCount = input.required<number>();
  readonly selectedRows = input<readonly Row[]>([]);
  readonly statusBarColumn = input<GridColumn<Row> | undefined>(undefined);
  readonly columns = input.required<readonly GridColumn<Row>[]>();
  readonly sort = input.required<readonly SortKey[]>();

  readonly clearSort = output<void>();

  protected readonly sortSummary = computed(() =>
    statusBarSortSummary(this.columns(), this.sort()),
  );

  protected readonly sum = computed(() => {
    const column = this.statusBarColumn();
    const rows = this.selectedRows();
    if (!column || rows.length === 0) return null;
    return rows.reduce((total, row) => total + (Number(column.value(row)) || 0), 0);
  });

  protected readonly average = computed(() => {
    const sum = this.sum();
    const count = this.selectedRows().length;
    return sum === null ? null : sum / count;
  });

  protected readonly formatMoney = formatMoney;
}
