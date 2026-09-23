import { Component } from '@angular/core';
import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import { StatusChip } from '../../shared/status-chip/status-chip';
import type { OrderSummary } from '../../core/api/models';

@Component({
  selector: 'app-status-cell',
  imports: [StatusChip],
  template: `@if (order) {
    <app-status-chip [status]="order.status" />
  }`,
})
export class StatusCellRenderer implements ICellRendererAngularComp {
  protected order?: OrderSummary;

  agInit(params: ICellRendererParams<OrderSummary>): void {
    this.order = params.data;
  }

  refresh(): boolean {
    return false;
  }
}
