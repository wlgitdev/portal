import { Component, computed, input } from '@angular/core';
import type { OrderStatus } from '../../core/api/models';

@Component({
  selector: 'app-status-chip',
  templateUrl: './status-chip.html',
  styleUrl: './status-chip.css',
})
export class StatusChip {
  readonly status = input.required<OrderStatus>();

  protected readonly variant = computed<'shipped' | 'awaiting' | 'late'>(() => {
    switch (this.status()) {
      case 'Shipped':
        return 'shipped';
      case 'Awaiting dispatch':
        return 'awaiting';
      case 'Late':
        return 'late';
    }
  });
}
