import { Component, input } from '@angular/core';

export type NavIconName = 'overview' | 'orders' | 'spend' | 'schedule' | 'account';

@Component({
  selector: 'app-nav-icon',
  templateUrl: './nav-icon.html',
})
export class NavIcon {
  readonly name = input.required<NavIconName>();
}
