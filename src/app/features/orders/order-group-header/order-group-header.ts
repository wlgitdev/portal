import { Component, input, output } from '@angular/core';
import { formatMoney } from '../../../shared/format-money';
import type { OrderGroup } from '../order-view';

// Shared by the grid's full-width group row and the card list's section
// heading (P6 R4/R5) so the two views render one identical header.
@Component({
  selector: 'app-order-group-header',
  templateUrl: './order-group-header.html',
  styleUrl: './order-group-header.css',
})
export class OrderGroupHeader {
  readonly group = input.required<OrderGroup>();
  readonly collapsed = input(false);
  readonly toggled = output<void>();

  protected readonly formatMoney = formatMoney;
}
