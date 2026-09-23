import { Component, computed, input } from '@angular/core';
import type { OrderStatus } from '../../core/api/models';

function proportion(start: Date, end: Date, at: Date): number {
  const span = end.getTime() - start.getTime();
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (at.getTime() - start.getTime()) / span));
}

// The route from Ordered through Shipped to Due, with a hull marker at
// today's position — the design's signature affordance (mini in grid rows,
// large in the drawer; hero, for Overview, lands with bundle B3).
@Component({
  selector: 'app-voyage-line',
  templateUrl: './voyage-line.html',
  styleUrl: './voyage-line.css',
})
export class VoyageLine {
  readonly size = input<'mini' | 'large'>('mini');
  readonly status = input.required<OrderStatus>();
  readonly orderedOn = input.required<string>();
  readonly shippedOn = input<string | null>(null);
  readonly dueOn = input.required<string>();

  protected readonly shippedPercent = computed(() => {
    const shipped = this.shippedOn();
    if (!shipped) return null;
    return proportion(new Date(this.orderedOn()), new Date(this.dueOn()), new Date(shipped)) * 100;
  });

  protected readonly hullPercent = computed(() => {
    const shippedAt = this.shippedPercent();
    if (shippedAt !== null) return shippedAt;
    return proportion(new Date(this.orderedOn()), new Date(this.dueOn()), new Date()) * 100;
  });

  protected readonly ariaLabel = computed(() => {
    const format = (iso: string) =>
      new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    const shipped = this.shippedOn();
    return (
      `Ordered ${format(this.orderedOn())}, ` +
      (shipped ? `shipped ${format(shipped)}, ` : 'not yet shipped, ') +
      `due ${format(this.dueOn())}`
    );
  });
}
