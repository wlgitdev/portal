import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { Component, type WritableSignal, inject, signal } from '@angular/core';
import type { SortDirection, SortKey } from '../../../shared/data-grid/grid-types';

interface SortOption {
  colId: string;
  label: string;
}

// Values are the visible label itself: Playwright's selectOption(string)
// matches an <option> by its value attribute, and the pinned test selects
// by the words a phone user actually reads ("Total", "Descending").
const SORT_OPTIONS: SortOption[] = [
  { colId: 'orderNo', label: 'Order no' },
  { colId: 'orderedOn', label: 'Ordered' },
  { colId: 'status', label: 'Status' },
  { colId: 'itemCount', label: 'Items' },
  { colId: 'total', label: 'Total' },
  { colId: 'shipTo', label: 'Ship to' },
];

const MAX_KEYS = 3;

// Up to 3 sort keys as native selects, sorting the phone card list (design:
// the desktop grid gets its own header-click/Shift+click sort — this is the
// card list's equivalent, not a view onto the grid, since phone never
// renders one). The caller's WritableSignal<SortKey[]> is passed in as
// bottom-sheet data and written to directly, so "changes apply live" (spec)
// means exactly that: every select change re-sorts the cards immediately.
@Component({
  selector: 'app-orders-sort-sheet',
  templateUrl: './orders-sort-sheet.html',
  styleUrl: './orders-sort-sheet.css',
  host: { role: 'dialog', 'aria-label': 'Sort' },
})
export class OrdersSortSheet {
  private readonly sortSignal = inject<WritableSignal<SortKey[]>>(MAT_BOTTOM_SHEET_DATA);
  private readonly sheetRef = inject(MatBottomSheetRef<OrdersSortSheet>);

  protected readonly options = SORT_OPTIONS;
  protected readonly keys = signal<(SortKey | null)[]>(
    this.sortSignal().length > 0 ? [...this.sortSignal()] : [null],
  );

  protected labelFor(colId: string | undefined): string {
    return this.options.find((option) => option.colId === colId)?.label ?? '';
  }

  protected addKey(): void {
    this.keys.update((current) => [...current, null]);
  }

  protected canAddKey(): boolean {
    return this.keys().length < MAX_KEYS;
  }

  protected setColumn(index: number, label: string): void {
    const colId = this.options.find((option) => option.label === label)?.colId;
    if (!colId) return;
    this.keys.update((current) => {
      const next = [...current];
      next[index] = { colId, dir: next[index]?.dir ?? 'asc' };
      return next;
    });
    this.apply();
  }

  protected setDirection(index: number, label: string): void {
    const dir: SortDirection = label === 'Descending' ? 'desc' : 'asc';
    this.keys.update((current) => {
      const next = [...current];
      const existing = next[index];
      if (existing) next[index] = { ...existing, dir };
      return next;
    });
    this.apply();
  }

  protected done(): void {
    this.sheetRef.dismiss();
  }

  private apply(): void {
    this.sortSignal.set(this.keys().filter((key): key is SortKey => key !== null));
  }
}
