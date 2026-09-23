import { Component, input, output } from '@angular/core';
import { Icon } from '../../../shared/icon/icon';
import type { FilterChip } from '../order-view';

// Shared by the toolbar (below the search/tabs row) and the no-matches
// empty state, which prepends a synthetic "Search {term}" chip (R13, R14).
@Component({
  selector: 'app-active-filter-chips',
  imports: [Icon],
  templateUrl: './active-filter-chips.html',
  styleUrl: './active-filter-chips.css',
})
export class ActiveFilterChips {
  readonly chips = input.required<FilterChip[]>();
  readonly remove = output<string>();
  readonly clearAll = output<void>();
}
