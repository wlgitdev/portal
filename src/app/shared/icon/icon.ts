import { Component, input } from '@angular/core';

export type IconName =
  | 'search'
  | 'close'
  | 'filter'
  | 'group'
  | 'chevron-down'
  | 'people'
  | 'sign-out'
  | 'info';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
}
