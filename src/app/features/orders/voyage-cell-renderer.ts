import { Component } from '@angular/core';
import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import { VoyageLine } from '../../shared/voyage-line/voyage-line';
import type { OrderSummary } from '../../core/api/models';

@Component({
  selector: 'app-voyage-cell',
  imports: [VoyageLine],
  template: `@if (order) {
    <app-voyage-line
      [status]="order.status"
      [orderedOn]="order.orderedOn"
      [shippedOn]="order.shippedOn"
      [dueOn]="order.dueOn"
    />
  }`,
})
export class VoyageCellRenderer implements ICellRendererAngularComp {
  protected order?: OrderSummary;

  agInit(params: ICellRendererParams<OrderSummary>): void {
    this.order = params.data;
  }

  refresh(): boolean {
    return false;
  }
}
