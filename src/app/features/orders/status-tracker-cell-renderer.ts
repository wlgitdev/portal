import { Component } from '@angular/core';
import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import { StatusTracker } from '../../shared/status-tracker/status-tracker';
import type { OrderSummary } from '../../core/api/models';

@Component({
  selector: 'app-status-tracker-cell',
  imports: [StatusTracker],
  template: `@if (order) {
    <app-status-tracker [status]="order.status" />
  }`,
})
export class StatusTrackerCellRenderer implements ICellRendererAngularComp {
  protected order?: OrderSummary;

  agInit(params: ICellRendererParams<OrderSummary>): void {
    this.order = params.data;
  }

  refresh(): boolean {
    return false;
  }
}
