import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { Component, computed, inject, output } from '@angular/core';
import { Icon } from '../../../shared/icon/icon';
import { Viewport } from '../../../shared/viewport/viewport';
import { OrdersFilterState } from '../orders-filter-state';
import { GROUP_BY_OPTIONS, ORDERED_PRESET_OPTIONS, plural } from '../order-view';

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

type ItemsBound = 'itemsFrom' | 'itemsTo';

// Content only, used both as a >=720px CDK connected-overlay popover and a
// <720px MatBottomSheet (design Revision 3, spec P7 R12) — like AccountMenu,
// it reads OrdersFilterState directly so neither host has to wire it up.
@Component({
  selector: 'app-order-filters',
  imports: [Icon],
  templateUrl: './order-filters.html',
  styleUrl: './order-filters.css',
  host: {
    role: 'dialog',
    'aria-label': 'Filters',
    // Modal on phone (MatBottomSheet), non-modal on desktop (CDK connected
    // overlay) — spec P7 R12. MatBottomSheetConfig has no public way to set
    // role/aria-modal on its own container, so the component declares its
    // own dialog semantics instead, correct for either host.
    '[attr.aria-modal]': "viewport.isPhone() ? 'true' : null",
  },
})
export class OrderFilters {
  protected readonly filterState = inject(OrdersFilterState);
  protected readonly viewport = inject(Viewport);
  private readonly bottomSheetRef = inject(MatBottomSheetRef, { optional: true });

  readonly closed = output<void>();

  protected readonly groupByOptions = GROUP_BY_OPTIONS;
  protected readonly orderedPresetOptions = ORDERED_PRESET_OPTIONS;
  protected readonly inputValue = inputValue;
  protected readonly plural = plural;

  protected readonly maxBinCount = computed(() =>
    Math.max(1, ...this.filterState.histogramBins().map((bin) => bin.count)),
  );

  protected barHeightPercent(count: number): number {
    return (count / this.maxBinCount()) * 100;
  }

  protected sliderPercent(value: string, emptyValue: number): number {
    const top = this.filterState.totalRangeTop();
    return top > 0 ? (Number(value || emptyValue) / top) * 100 : 0;
  }

  protected close(): void {
    this.closed.emit();
    this.bottomSheetRef?.dismiss();
  }

  protected setMinTotal(event: Event): void {
    const value = Number(inputValue(event));
    this.filterState.updateFilter('totalFrom', value <= 0 ? '' : String(value));
  }

  protected setMaxTotal(event: Event): void {
    const value = Number(inputValue(event));
    this.filterState.updateFilter('totalTo', value >= this.filterState.totalRangeTop() ? '' : String(value));
  }

  protected increaseItems(bound: ItemsBound): void {
    const current = this.filterState.filters()[bound];
    this.filterState.updateFilter(bound, String((current === '' ? 0 : Number(current)) + 1));
  }

  protected decreaseItems(bound: ItemsBound): void {
    const current = this.filterState.filters()[bound];
    if (current === '') return;
    const next = Number(current) - 1;
    this.filterState.updateFilter(bound, next <= 0 ? '' : String(next));
  }
}
