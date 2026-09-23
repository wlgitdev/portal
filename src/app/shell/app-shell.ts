import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CustomerSession } from '../core/auth/customer-session';
import { OrdersStore } from '../core/orders/orders-store';
import { NavIcon, type NavIconName } from './nav-icon/nav-icon';

interface NavItem {
  label: string;
  path: string;
  icon: NavIconName;
}

// Nav carries only the destinations that actually exist. Overview, Spend,
// Schedule and Account land with their own bundles (B3/B4) — a link to a
// page that isn't built yet would be a dead affordance, not a shortcut.
// Icons for all five are drawn in NavIcon now (P6 R7) so those bundles only
// add an entry here.
const NAV_ITEMS: NavItem[] = [{ label: 'Orders', path: '/orders', icon: 'orders' }];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NavIcon],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  protected readonly session = inject(CustomerSession);
  private readonly ordersStore = inject(OrdersStore);
  private readonly router = inject(Router);

  protected readonly navItems = NAV_ITEMS;

  protected signOut(): void {
    this.ordersStore.closeOrder();
    this.session.signOut();
    this.router.navigateByUrl('/sign-in', { replaceUrl: true });
  }
}
