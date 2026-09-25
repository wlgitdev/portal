import { NgTemplateOutlet } from '@angular/common';
import { Component, type TemplateRef, computed, input, output } from '@angular/core';
import { GridCell } from '@angular/aria/grid';
import type { CellTemplateContext, Density, GridColumn, VisibleRow } from './grid-types';
import { pluralize } from './grid-view';
import { GridTooltipTarget } from './grid-tooltip';

// Renders one row of any kind (data/group/detail/preview/footer) generically
// over columns — the only thing that changes between rowNouns (orders,
// lines, …) is the data passed in, never a branch here. Group/footer/
// preview "cells" are a single spanned block, not one gridcell per column,
// so only data-row cells (and the header row, separately) opt into
// ngGridCell's keyboard navigation.
@Component({
  selector: 'app-grid-row',
  imports: [GridCell, GridTooltipTarget, NgTemplateOutlet],
  templateUrl: './grid-row.html',
  styleUrl: './grid-row.css',
  host: {
    class: 'grid-row',
    '[attr.data-grid-id]': 'gridId()',
    '[attr.data-row-id]': 'visible().id',
    '[attr.data-row-kind]': 'visible().kind',
    '[attr.data-highlighted]': 'visible().highlighted ? "true" : null',
    '[style.padding-inline-start.px]': '(visible().level - 1) * groupIndentPx',
    '[attr.aria-level]': 'visible().kind === "group" ? visible().level : null',
    '[attr.aria-expanded]': 'visible().expanded === undefined ? null : visible().expanded',
  },
})
export class GridRow<Row> {
  protected readonly groupIndentPx = 20;

  readonly gridId = input.required<string>();
  readonly visible = input.required<VisibleRow<Row>>();
  readonly columns = input.required<readonly GridColumn<Row>[]>();
  readonly widths = input.required<Readonly<Record<string, number>>>();
  readonly rowNoun = input.required<string>();
  readonly selectable = input(false);
  readonly selected = input(false);
  readonly density = input.required<Density>();
  readonly detailTemplate = input<TemplateRef<CellTemplateContext<Row>> | undefined>(undefined);
  readonly detailButtonLabel = input<((row: Row) => string) | undefined>(undefined);
  readonly previewText = input<((row: Row) => string) | undefined>(undefined);

  readonly rowActivated = output<Row>();
  readonly selectionToggled = output<{ row: Row; shiftKey: boolean }>();
  readonly groupToggled = output<string>();
  readonly detailToggled = output<Row>();

  protected readonly groupLabelText = computed(() => {
    const visible = this.visible();
    if (visible.kind !== 'group') return '';
    return `${visible.label} · ${visible.count} ${pluralize(this.rowNoun(), visible.count ?? 0)}`;
  });

  protected cellContext(row: Row): CellTemplateContext<Row> {
    return { $implicit: row, row, density: this.density() };
  }

  protected widthOf(column: GridColumn<Row>): number {
    return this.widths()[column.id] ?? column.width;
  }

  /** First column index carrying an aggregate; a group/footer row's label spans everything before it. */
  protected firstAggregateIndex(): number {
    const index = this.columns().findIndex((column) => column.aggregate === 'sum');
    return index === -1 ? this.columns().length : index;
  }

  protected labelSpanWidth(): number {
    return this.columns()
      .slice(0, this.firstAggregateIndex())
      .reduce((sum, column) => sum + this.widthOf(column), 0);
  }

  protected aggregateText(column: GridColumn<Row>): string {
    const value = this.visible().aggregates?.get(column.id);
    if (value === undefined) return '';
    return column.formatAggregate ? column.formatAggregate(value) : String(value);
  }

  protected onEnter(): void {
    const visible = this.visible();
    if (visible.kind === 'data' && visible.row) this.rowActivated.emit(visible.row);
  }

  protected onSpace(event: Event): void {
    const visible = this.visible();
    if (this.selectable() && visible.kind === 'data' && visible.row) {
      event.preventDefault();
      this.selectionToggled.emit({ row: visible.row, shiftKey: false });
    }
  }

  protected onSelectClick(event: MouseEvent): void {
    const row = this.visible().row;
    if (row) this.selectionToggled.emit({ row, shiftKey: event.shiftKey });
  }
}
