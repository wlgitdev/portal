import { Injectable, computed, effect, inject, signal } from '@angular/core';
import type { OrderStatus } from '../../core/api/models';
import { CustomerSession } from '../../core/auth/customer-session';
import { OrdersStore } from '../../core/orders/orders-store';
import {
  EMPTY_FILTERS,
  activeFilterChips,
  buildOrderView,
  histogram,
  histogramTop,
  matchingOrders,
  shipToOptions,
  type FilterChip,
  type GroupBy,
  type HistogramBin,
  type OrderFilters,
  type ShipToOption,
} from './order-view';

export type StatusTabValue = OrderStatus | 'All';

export interface StatusTabCount {
  value: StatusTabValue;
  count: number;
}

const STATUS_TAB_VALUES: StatusTabValue[] = ['All', 'Late', 'Awaiting dispatch', 'Shipped'];

// Owns every piece of "what am I looking at" state for the orders find
// surface (search, filters, Group by, collapsed groups) plus everything
// derived from it (the view, chips, tab counts, the Total histogram), so
// the toolbar, the grid/cards and the Filters surface — three different
// places in the template, one of them opened in a MatBottomSheet outside
// the Orders component's own view tree — all read the same live state
// through DI instead of prop-drilling it across hosts (spec P7 R11–R13).
@Injectable({ providedIn: 'root' })
export class OrdersFilterState {
  private readonly session = inject(CustomerSession);
  private readonly store = inject(OrdersStore);

  readonly search = signal('');
  readonly filters = signal<OrderFilters>(EMPTY_FILTERS);
  readonly groupBy = signal<GroupBy>('none');
  readonly collapsedGroups = signal<ReadonlySet<string>>(new Set());

  readonly orderView = computed(() =>
    buildOrderView(this.store.orders(), {
      search: this.search(),
      filters: this.filters(),
      groupBy: this.groupBy(),
      today: new Date(),
    }),
  );

  readonly visibleOrderCount = computed(() =>
    this.orderView().groups.reduce((sum, group) => sum + group.orders.length, 0),
  );

  readonly totalOrderCount = computed(() => this.store.orders().length);

  readonly chips = computed<FilterChip[]>(() => activeFilterChips(this.filters(), new Date()));
  readonly filterCount = computed(() => this.chips().length);

  readonly statusTabs = computed<StatusTabCount[]>(() => {
    const matching = matchingOrders(this.store.orders(), {
      search: this.search(),
      filters: this.filters(),
      today: new Date(),
      exclude: 'status',
    });
    return STATUS_TAB_VALUES.map((value) => ({
      value,
      count: matching.filter((order) => value === 'All' || order.status === value).length,
    }));
  });

  readonly histogramBins = computed<HistogramBin[]>(() =>
    histogram(this.store.orders(), this.search(), this.filters(), new Date()),
  );

  // The Total slider/histogram's £0..top span.
  readonly totalRangeTop = computed(() => histogramTop(this.store.orders()));

  readonly shipToOptions = computed<ShipToOption[]>(() => shipToOptions(this.store.orders()));

  constructor() {
    // A customer switch is a fresh sign-in in all but name (R8) — the find
    // surface resets with it, exactly as a real sign-in would present it.
    effect(() => {
      this.session.customerId();
      this.search.set('');
      this.filters.set(EMPTY_FILTERS);
      this.groupBy.set('none');
      this.collapsedGroups.set(new Set());
    });
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  setStatus(value: StatusTabValue): void {
    this.updateFilter('status', value);
  }

  updateFilter<K extends keyof OrderFilters>(key: K, value: OrderFilters[K]): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
  }

  toggleShipTo(name: string): void {
    this.filters.update((current) => ({
      ...current,
      shipTo: current.shipTo.includes(name)
        ? current.shipTo.filter((existing) => existing !== name)
        : [...current.shipTo, name],
    }));
  }

  // Mirrors EMPTY_FILTERS field-by-field — the one place a chip's key maps
  // back to the filter section it clears.
  removeChip(key: string): void {
    switch (key) {
      case 'search':
        this.search.set('');
        return;
      case 'ordered':
        this.filters.update((current) => ({
          ...current,
          orderedPreset: 'any',
          orderedFrom: '',
          orderedTo: '',
        }));
        return;
      case 'total':
        this.filters.update((current) => ({ ...current, totalFrom: '', totalTo: '' }));
        return;
      case 'items':
        this.filters.update((current) => ({ ...current, itemsFrom: '', itemsTo: '' }));
        return;
      case 'orderNo':
        this.filters.update((current) => ({ ...current, orderNoContains: '' }));
        return;
      case 'shipTo':
        this.filters.update((current) => ({ ...current, shipTo: [] }));
        return;
    }
  }

  setGroupBy(value: GroupBy): void {
    this.groupBy.set(value);
    this.collapsedGroups.set(new Set());
  }

  toggleGroup(key: string): void {
    this.collapsedGroups.update((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Filters-surface footer: resets every section except search, status and
  // Group by, none of which live inside that surface (design Revision 3).
  clearFilters(): void {
    this.filters.update((current) => ({ ...EMPTY_FILTERS, status: current.status }));
  }

  // No-matches empty state: resets search, filters and status. Group by
  // stays (R14).
  clearSearchAndFilters(): void {
    this.search.set('');
    this.filters.set(EMPTY_FILTERS);
  }
}
