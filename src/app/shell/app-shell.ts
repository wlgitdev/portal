import { CdkMenuTrigger } from '@angular/cdk/menu';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CustomerSession } from '../core/auth/customer-session';
import { Icon } from '../shared/icon/icon';
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

// Nav carries only the destinations that actually exist. Overview, Spend,
// Schedule and Account land with their own bundles (B3/B4) — a link to a
// page that isn't built yet would be a dead affordance, not a shortcut.
// Icons for all five are drawn in NavIcon now (P6 R7) so those bundles only
// add an entry here.
const NAV_ITEMS: NavItem[] = [{ label: 'Orders', path: '/orders', icon: 'orders' }];

// Right edge of the trigger to the right edge of the menu, opening downward
// (design Revision 3: the account menu is right-aligned under the trigger).
const ACCOUNT_MENU_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NavIcon, Icon, Monogram, CdkMenuTrigger, AccountMenu],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  protected readonly session = inject(CustomerSession);
  protected readonly viewport = inject(Viewport);
  private readonly bottomSheet = inject(MatBottomSheet);

  protected readonly navItems = NAV_ITEMS;
  protected readonly accountMenuPositions = ACCOUNT_MENU_POSITIONS;
  protected readonly accountSheetOpen = signal(false);

  protected readonly currentCustomer = computed(() => ({
    id: this.session.customerId() ?? '',
    companyName: this.session.companyName() ?? '',
  }));

  protected openAccountSheet(): void {
    openTrackedBottomSheet(this.bottomSheet, AccountMenu, this.accountSheetOpen);
  }
}
