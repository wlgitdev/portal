import { httpResource } from '@angular/common/http';
import { ApplicationRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { CustomerSession } from '../auth/customer-session';
import type { OrderDetail, OrderSummary } from '../api/models';

// One fetch per session: Orders, Overview, Spend and Schedule all read the
// same order list from here rather than each calling the API themselves.
// Overview/Spend/Schedule land in later bundles; only `orders` is consumed today.
@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private readonly session = inject(CustomerSession);
  private readonly appRef = inject(ApplicationRef);

  private readonly ordersResource = httpResource<OrderSummary[]>(() =>
    this.session.customerId() ? '/api/orders' : undefined,
  );

  // httpResource notices a customerId change and starts reloading on its
  // own schedule, not synchronously with the write that changed it — so for
  // a beat after reset() `value()` is still the outgoing customer's fully
  // resolved orders. awaitingFreshOrders closes that gap directly instead
  // of guessing at the resource's internal timing: set the instant a switch
  // or sign-out is requested, cleared only once a fetch has genuinely
  // resolved a value, so `orders` can never surface a stale customer's rows.
  private readonly awaitingFreshOrders = signal(false);

  readonly orders = computed(() =>
    this.awaitingFreshOrders() ? [] : (this.ordersResource.value() ?? []),
  );
  readonly ordersLoading = this.ordersResource.isLoading;

  readonly selectedOrderId = signal<number | null>(null);
  private readonly orderDetailResource = httpResource<OrderDetail>(() =>
    this.selectedOrderId() !== null ? `/api/orders/${this.selectedOrderId()}` : undefined,
  );
  readonly selectedOrder = computed(() => this.orderDetailResource.value());
  readonly selectedOrderLoading = this.orderDetailResource.isLoading;

  constructor() {
    effect(() => {
      if (this.ordersResource.value() !== undefined) {
        this.awaitingFreshOrders.set(false);
      }
    });
  }

  openOrder(id: number): void {
    this.selectedOrderId.set(id);
  }

  closeOrder(): void {
    this.selectedOrderId.set(null);
  }

  // Called before a customer switch changes CustomerSession's id, so the
  // next customer's first render never shows the previous one's orders.
  // Flushed synchronously: the switch's other effects (navigation, the
  // toast, the account menu closing) are imperative calls that paint
  // immediately, so without forcing this one to keep pace too, the order
  // list would still be the outgoing customer's for a paint (P8 rework).
  reset(): void {
    this.closeOrder();
    this.awaitingFreshOrders.set(true);
    this.appRef.tick();
  }
}
