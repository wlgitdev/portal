import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

// The one breakpoint every P6/P7 surface splits on: a sheet + tabs-scroll
// layout below it, a popover + wider grid at and above it.
export const PHONE_QUERY = '(max-width: 719px)';

@Injectable({ providedIn: 'root' })
export class Viewport {
  private readonly breakpoints = inject(BreakpointObserver);

  readonly isPhone = toSignal(
    this.breakpoints.observe(PHONE_QUERY).pipe(map((state) => state.matches)),
    { initialValue: this.breakpoints.isMatched(PHONE_QUERY) },
  );
}
