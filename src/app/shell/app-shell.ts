import { CdkMenuTrigger } from '@angular/cdk/menu';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CustomerSession } from '../core/auth/customer-session';
import { OrderDrawer } from '../features/orders/order-drawer/order-drawer';
import { Icon } from '../shared/icon/icon';
import { END_ALIGNED_MENU_POSITION } from '../shared/menu-position';
import { Monogram } from '../shared/monogram/monogram';
import { openTrackedBottomSheet } from '../shared/tracked-bottom-sheet';
import { Viewport } from '../shared/viewport/viewport';
import { AccountMenu } from './account-menu/account-menu';
import { NavIcon, type NavIconName } from './nav-icon/nav-icon';

interface NavItem {
  label: string;
  path: string;
  icon: NavIconName;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', path: '/overview', icon: 'overview' },
  { label: 'Orders', path: '/orders', icon: 'orders' },
  { label: 'Spend', path: '/spend', icon: 'spend' },
  { label: 'Schedule', path: '/schedule', icon: 'schedule' },
  { label: 'Account', path: '/account', icon: 'account' },
];

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NavIcon,
    Icon,
    Monogram,
    CdkMenuTrigger,
    AccountMenu,
    OrderDrawer,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  protected readonly session = inject(CustomerSession);
  protected readonly viewport = inject(Viewport);
  private readonly bottomSheet = inject(MatBottomSheet);

  protected readonly navItems = NAV_ITEMS;
  protected readonly accountMenuPositions = END_ALIGNED_MENU_POSITION;
  protected readonly accountSheetOpen = signal(false);

  protected readonly currentCustomer = computed(() => ({
    id: this.session.customerId() ?? '',
    companyName: this.session.companyName() ?? '',
  }));

  protected openAccountSheet(): void {
    openTrackedBottomSheet(this.bottomSheet, AccountMenu, this.accountSheetOpen);
  }
}
