import { Component, computed, inject } from '@angular/core';
import { ActiveFilterChips } from '../active-filter-chips/active-filter-chips';
import { OrdersFilterState } from '../orders-filter-state';
import type { FilterChip } from '../order-view';

// "Nothing matches" — unlike orders-empty-state, the toolbar around this
// stays: search, tabs and Filters are exactly what got you here, and stay
// usable to get back out (R14).
@Component({
  selector: 'app-orders-no-matches',
  imports: [ActiveFilterChips],
  templateUrl: './orders-no-matches.html',
  styleUrl: './orders-no-matches.css',
})
export class OrdersNoMatches {
  protected readonly filterState = inject(OrdersFilterState);

  // The chips row here also carries a synthetic "Search {term}" chip
  // ahead of the real filter chips, so search can be cleared the same way.
  protected readonly chips = computed<FilterChip[]>(() => {
    const search = this.filterState.search();
    const searchChip: FilterChip[] = search ? [{ key: 'search', text: `Search ${search}` }] : [];
    return [...searchChip, ...this.filterState.chips()];
  });

  protected readonly body = computed(() => {
    const total = this.filterState.totalOrderCount();
    const hasSearch = this.filterState.search() !== '';
    const filterCount = this.filterState.filterCount();
    const hasFilters = filterCount > 0;
    const cause = hasSearch
      ? hasFilters
        ? `this search and ${filterCount} filter${filterCount === 1 ? '' : 's'}`
        : 'this search'
      : 'these filters';
    return `All ${total} of your orders are hidden by ${cause}. Search looks at order no, date, status, items, total and ship to.`;
  });
}
