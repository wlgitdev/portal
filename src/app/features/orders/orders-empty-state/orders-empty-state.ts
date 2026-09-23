import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CustomerSession } from '../../../core/auth/customer-session';
import { OrdersStore } from '../../../core/orders/orders-store';
import { Icon } from '../../../shared/icon/icon';

// "No orders at all" — the toolbar around this is hidden by Orders itself
// (controls that can't change anything are noise, R14).
@Component({
  selector: 'app-orders-empty-state',
  imports: [Icon],
  templateUrl: './orders-empty-state.html',
  styleUrl: './orders-empty-state.css',
})
export class OrdersEmptyState {
  private readonly session = inject(CustomerSession);
  private readonly store = inject(OrdersStore);
  private readonly router = inject(Router);

  protected readonly companyName = this.session.companyName;

  protected chooseAnother(): void {
    this.store.closeOrder();
    this.session.signOut();
    this.router.navigateByUrl('/sign-in');
  }
}
