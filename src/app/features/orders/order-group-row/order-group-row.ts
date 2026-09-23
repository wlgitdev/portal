import { Component } from '@angular/core';
import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import { OrderGroupHeader } from '../order-group-header/order-group-header';
import type { OrderGroup } from '../order-view';

export interface GroupRowData {
  rowKind: 'group';
  group: OrderGroup;
}

export interface OrderGroupRowParams extends ICellRendererParams<GroupRowData> {
  isCollapsed: (key: string) => boolean;
  toggleGroup: (key: string) => void;
}

// The grid's full-width row for a group header; delegates to the same
// OrderGroupHeader the card list uses (P6 R4/R5) so both render identically.
@Component({
  selector: 'app-order-group-row',
  imports: [OrderGroupHeader],
  template: `
    @if (group; as g) {
      <app-order-group-header [group]="g" [collapsed]="collapsed" (toggled)="toggle()" />
    }
  `,
})
export class OrderGroupRow implements ICellRendererAngularComp {
  protected group?: OrderGroup;
  protected collapsed = false;

  private key = '';
  private toggleGroup: (key: string) => void = () => {};

  agInit(params: OrderGroupRowParams): void {
    this.apply(params);
  }

  refresh(params: OrderGroupRowParams): boolean {
    this.apply(params);
    return true;
  }

  private apply(params: OrderGroupRowParams): void {
    const { group } = params.data!;
    this.key = group.key;
    this.group = group;
    this.collapsed = params.isCollapsed(group.key);
    this.toggleGroup = params.toggleGroup;
  }

  protected toggle(): void {
    this.toggleGroup(this.key);
  }
}
