import { Component, computed, inject } from '@angular/core';
import { CustomerSession } from '../../core/auth/customer-session';
import { onTheWaterOrders, quarterSpend } from '../../core/orders/order-stats';
import { OrdersStore } from '../../core/orders/orders-store';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { formatMoney } from '../../shared/format-money';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { StatusTracker } from '../../shared/status-tracker/status-tracker';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

@Component({
  selector: 'app-overview',
  imports: [EmptyState, Skeleton, StatusTracker],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  protected readonly store = inject(OrdersStore);
  private readonly session = inject(CustomerSession);

  protected readonly formatMoney = formatMoney;
  protected readonly companyName = this.session.companyName;
  protected readonly greeting = greeting(new Date().getHours());

  protected readonly onTheWater = computed(() => onTheWaterOrders(this.store.orders(), new Date()));
  protected readonly lateCount = computed(
    () => this.store.orders().filter((order) => order.status === 'Late').length,
  );
  protected readonly quarterSpend = computed(() => quarterSpend(this.store.orders(), new Date()));

  protected openOrder(id: number): void {
    this.store.openOrder(id);
  }
}
