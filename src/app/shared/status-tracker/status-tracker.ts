import { Component, computed, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';
import type { OrderStatus } from '../../core/api/models';

const STOP_ICONS: IconName[] = ['receipt', 'clock', 'ship'];

interface Stop {
  icon: IconName;
  state: 'done' | 'current' | 'todo';
}

// The parcel-tracker replacing the status chip and the Progress column
// (design Revision 4, spec P8 R20): three fixed stops — Ordered, Dispatch,
// Shipped — with the current one lit by the order's own status colour.
@Component({
  selector: 'app-status-tracker',
  imports: [Icon],
  templateUrl: './status-tracker.html',
  styleUrl: './status-tracker.css',
  host: {
    'data-testid': 'status-tracker',
    '[attr.data-status]': 'status()',
    '[class.large]': "size() === 'large'",
    '[class.dots]': "size() === 'compact-dots'",
  },
})
export class StatusTracker {
  readonly status = input.required<OrderStatus>();
  readonly size = input<'compact' | 'compact-dots' | 'large'>('compact');

  protected readonly iconSize = computed(() => (this.size() === 'large' ? 18 : 12));

  protected readonly stops = computed<Stop[]>(() => {
    const status = this.status();
    const current = status === 'Shipped' ? 2 : 1;
    return STOP_ICONS.map((icon, index) => ({
      // Dispatch shows a warning triangle instead of a clock once the order
      // is actually Late, rather than just running behind (design Rev. 4).
      icon: index === 1 && status === 'Late' ? 'warning' : icon,
      state: index < current ? 'done' : index === current ? 'current' : 'todo',
    }));
  });
}
