import { CdkMenuTrigger } from '@angular/cdk/menu';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CustomerSession } from '../core/auth/customer-session';
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

// Nav carries only the destinations that actually exist. Overview, Spend and
// Schedule land with bundle B3 — a link to a page that isn't built yet would
// be a dead affordance, not a shortcut. Icons for all five are drawn in
// NavIcon already (P6 R7) so B3 only needs to add its entries here.
const NAV_ITEMS: NavItem[] = [
  { label: 'Orders', path: '/orders', icon: 'orders' },
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
