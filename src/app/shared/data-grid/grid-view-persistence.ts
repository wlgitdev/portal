import { Injectable } from '@angular/core';
import { defaultViewState } from './grid-view';
import type { GridColumn, GridViewState } from './grid-types';

// "grid-view:{gridId}" in this browser only: column order/widths/hidden,
// sort, groupBy, density, preview and collapsed groups for one grid
// instance. Unknown or missing fields fall back to defaultViewState, so an
// older save or a changed column set degrades gracefully rather than
// breaking the grid.
@Injectable({ providedIn: 'root' })
export class GridViewPersistence {
  load<Row>(gridId: string, columns: readonly GridColumn<Row>[]): GridViewState {
    const fallback = defaultViewState(columns);
    const raw = localStorage.getItem(this.key(gridId));
    if (!raw) return fallback;

    try {
      const saved = JSON.parse(raw) as Partial<GridViewState>;
      return { ...fallback, ...saved, widths: { ...fallback.widths, ...saved.widths } };
    } catch {
      return fallback;
    }
  }

  save(gridId: string, state: GridViewState): void {
    localStorage.setItem(this.key(gridId), JSON.stringify(state));
  }

  private key(gridId: string): string {
    return `grid-view:${gridId}`;
  }
}
