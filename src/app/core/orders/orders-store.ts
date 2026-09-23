import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CustomerSession } from '../auth/customer-session';
import type { OrderDetail, OrderSummary } from '../api/models';

// One fetch per session: Orders, Overview, Spend and Schedule all read the
// same order list from here rather than each calling the API themselves.
// Overview/Spend/Schedule land in later bundles; only `orders` is consumed today.
@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private readonly session = inject(CustomerSession);

  private readonly ordersResource = httpResource<OrderSummary[]>(() =>
    this.session.customerId() ? '/api/orders' : undefined,
  );
  readonly orders = computed(() => this.ordersResource.value() ?? []);
  readonly ordersLoading = this.ordersResource.isLoading;

  readonly selectedOrderId = signal<number | null>(null);
  private readonly orderDetailResource = httpResource<OrderDetail>(() =>
    this.selectedOrderId() !== null ? `/api/orders/${this.selectedOrderId()}` : undefined,
  );
  readonly selectedOrder = computed(() => this.orderDetailResource.value());
  readonly selectedOrderLoading = this.orderDetailResource.isLoading;

  openOrder(id: number): void {
    this.selectedOrderId.set(id);
  }

  closeOrder(): void {
    this.selectedOrderId.set(null);
  }
}
