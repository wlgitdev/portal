import { AgGridAngular } from 'ag-grid-angular';
import {
  themeQuartz,
  type CellClickedEvent,
  type ColDef,
  type GetRowIdParams,
} from 'ag-grid-community';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { formatMoney } from '../../shared/format-money';
import { OrdersStore } from '../../core/orders/orders-store';
import { PageHeader } from '../../shared/page-header/page-header';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { StatusChip } from '../../shared/status-chip/status-chip';
import { VoyageLine } from '../../shared/voyage-line/voyage-line';
import { StatusCellRenderer } from './status-cell-renderer';
import { VoyageCellRenderer } from './voyage-cell-renderer';
import { OrderDrawer } from './order-drawer/order-drawer';
import type { OrderStatus, OrderSummary } from '../../core/api/models';

type StatusFilter = 'All' | OrderStatus;
const STATUS_OPTIONS: StatusFilter[] = ['All', 'Shipped', 'Awaiting dispatch', 'Late'];

function orderNumber(order: OrderSummary): string {
  return `#${order.id}`;
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

@Component({
  selector: 'app-orders',
  imports: [
    FormsModule,
    PageHeader,
    StatusChip,
    VoyageLine,
    Skeleton,
    EmptyState,
    OrderDrawer,
    AgGridAngular,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  protected readonly store = inject(OrdersStore);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('All');
  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly filteredOrders = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.store.orders().filter((order) => {
      const matchesStatus = status === 'All' || order.status === status;
      const matchesSearch =
        !term ||
        orderNumber(order).toLowerCase().includes(term) ||
        (order.shipTo ?? '').toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  });

  protected readonly columnDefs: ColDef<OrderSummary>[] = [
    {
      headerName: 'Order no',
      valueGetter: (p) => orderNumber(p.data!),
      cellClass: 'mono',
      flex: 1,
    },
    {
      headerName: 'Ordered',
      field: 'orderedOn',
      valueFormatter: (p) => formatDate(p.value),
      flex: 1,
    },
    { headerName: 'Status', cellRenderer: StatusCellRenderer, flex: 1 },
    { headerName: 'Voyage', cellRenderer: VoyageCellRenderer, flex: 2, sortable: false },
    { headerName: 'Items', field: 'itemCount', flex: 1 },
    {
      headerName: 'Total',
      field: 'total',
      valueFormatter: (p) => formatMoney(p.value),
      cellClass: 'mono',
      flex: 1,
    },
    { headerName: 'Ship to', field: 'shipTo', flex: 1 },
  ];

  protected orderNumber = orderNumber;
  protected formatDate = formatDate;
  protected formatMoney = formatMoney;
  protected readonly getRowId = (params: GetRowIdParams<OrderSummary>) => String(params.data.id);
  protected readonly gridTheme = themeQuartz;

  protected openOrder(id: number): void {
    this.store.openOrder(id);
  }

  protected onCellClicked(event: CellClickedEvent<OrderSummary>): void {
    if (event.data) {
      this.openOrder(event.data.id);
    }
  }
}
