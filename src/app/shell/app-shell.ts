import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CustomerSession } from '../core/auth/customer-session';

interface NavItem {
  label: string;
  path: string;
}

// Nav carries only the destinations that actually exist. Overview, Spend,
// Schedule and Account land with their own bundles (B3/B4) — a link to a
// page that isn't built yet would be a dead affordance, not a shortcut.
const NAV_ITEMS: NavItem[] = [{ label: 'Orders', path: '/orders' }];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  protected readonly session = inject(CustomerSession);
  protected readonly navItems = NAV_ITEMS;
}
