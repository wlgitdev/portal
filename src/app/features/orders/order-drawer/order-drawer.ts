import { Component, inject } from '@angular/core';
import { OrdersStore } from '../../../core/orders/orders-store';
import { Skeleton } from '../../../shared/skeleton/skeleton';
import { VoyageLine } from '../../../shared/voyage-line/voyage-line';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

@Component({
  selector: 'app-order-drawer',
  imports: [VoyageLine, Skeleton],
  templateUrl: './order-drawer.html',
  styleUrl: './order-drawer.css',
})
export class OrderDrawer {
  protected readonly store = inject(OrdersStore);
  protected readonly formatMoney = (value: number) => money.format(value);

  protected close(): void {
    this.store.closeOrder();
  }
}
