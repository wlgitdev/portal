import { AgGridAngular } from 'ag-grid-angular';
import {
  themeQuartz,
  type CellClickedEvent,
  type ColDef,
  type GetRowIdParams,
  type IRowNode,
  type IsFullWidthRowParams,
  type PostSortRowsParams,
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
import { OrderGroupHeader } from './order-group-header/order-group-header';
import {
  OrderGroupRow,
  type GroupRowData,
  type OrderGroupRowParams,
} from './order-group-row/order-group-row';
import {
  EMPTY_FILTERS,
  activeFilterCount,
  buildOrderView,
  displayedText,
  type GroupBy,
  type OrderFilters,
} from './order-view';
import type { OrderStatus, OrderSummary } from '../../core/api/models';

type ColId = 'orderNo' | 'orderedOn' | 'status' | 'progress' | 'itemCount' | 'total' | 'shipTo';

// Every order row also carries the key of the group it's currently in, so
// postSortRows (below) can re-partition rows AG Grid has just sorted flat.
type OrderRow = OrderSummary & { rowKind?: undefined; groupKey: string };
type GridRow = OrderRow | GroupRowData;

function isGroupRow(row: GridRow): row is GroupRowData {
  return row.rowKind === 'group';
}

const STATUS_OPTIONS: Array<'All' | OrderStatus> = ['All', 'Shipped', 'Awaiting dispatch', 'Late'];

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'status', label: 'Status' },
  { value: 'orderedMonth', label: 'Ordered month' },
  { value: 'itemCount', label: 'Items' },
  { value: 'shipTo', label: 'Ship to' },
];

// Verbatim design Revision 2 copy — pinned by e2e/orders-table.spec.ts.
const HEADER_TOOLTIPS: Record<ColId, string> = {
  orderNo: "Northwind's reference number for this order.",
  orderedOn: 'The date you placed the order.',
  status:
    'Shipped: on its way to you. Awaiting dispatch: not shipped yet, still on time. Late: not shipped and past its due date.',
  progress:
    "The order's journey from ordered, through shipped, to due. The marker shows where it is today.",
  itemCount: 'How many different products are on the order.',
  total: 'Value of the goods after discounts. Freight is charged separately.',
  shipTo: 'Who the order is delivered to.',
};

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
    OrderGroupHeader,
    AgGridAngular,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  protected readonly store = inject(OrdersStore);

  protected readonly search = signal('');
  protected readonly filters = signal<OrderFilters>(EMPTY_FILTERS);
  protected readonly filtersOpen = signal(false);
  protected readonly groupBy = signal<GroupBy>('none');
  protected readonly collapsedGroups = signal<ReadonlySet<string>>(new Set());

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly groupByOptions = GROUP_BY_OPTIONS;
  protected readonly filterCount = computed(() => activeFilterCount(this.filters()));

  protected readonly orderView = computed(() =>
    buildOrderView(this.store.orders(), {
      search: this.search(),
      filters: this.filters(),
      groupBy: this.groupBy(),
    }),
  );

  protected readonly visibleOrderCount = computed(() =>
    this.orderView().groups.reduce((sum, group) => sum + group.orders.length, 0),
  );

  // groupBy 'none' -> a single unlabelled group (spec R3); no header rows.
  protected readonly gridRows = computed<GridRow[]>(() => {
    const { groups } = this.orderView();
    if (this.groupBy() === 'none') {
      return (groups[0]?.orders ?? []).map((order) => ({ ...order, groupKey: 'all' }));
    }
    const collapsed = this.collapsedGroups();
    const rows: GridRow[] = [];
    for (const group of groups) {
      rows.push({ rowKind: 'group', group });
      if (!collapsed.has(group.key)) {
        rows.push(...group.orders.map((order) => ({ ...order, groupKey: group.key })));
      }
    }
    return rows;
  });

  protected readonly columnDefs: ColDef<GridRow>[] = [
    {
      colId: 'orderNo',
      headerName: 'Order no',
      headerTooltip: HEADER_TOOLTIPS.orderNo,
      // Grid-wide tooltipShowMode: 'whenTruncated' (below) also suppresses
      // header tooltips on headers that never truncate, unless the column
      // names its headerComponent explicitly — so every column below does,
      // using the grid's own built-in header (sorting UI unchanged).
      headerComponent: 'agColumnHeader',
      // valueGetter supplies the raw value AG Grid sorts/filters by;
      // valueFormatter is display-only. Both #10643 and "£4,288.85" sort
      // wrong lexicographically, so the raw id/number must be the value.
      valueGetter: (p) => (p.data as OrderRow).id,
      valueFormatter: (p) => orderRowText(p.data).orderNo,
      tooltipValueGetter: (p) => orderRowText(p.data).orderNo,
      cellClass: 'mono',
      minWidth: 110,
      flex: 1,
    },
    {
      colId: 'orderedOn',
      headerName: 'Ordered',
      headerTooltip: HEADER_TOOLTIPS.orderedOn,
      headerComponent: 'agColumnHeader',
      // Raw ISO value: DD/MM/YYYY display text doesn't sort correctly once
      // orders span a year boundary.
      valueGetter: (p) => (p.data as OrderRow).orderedOn,
      valueFormatter: (p) => orderRowText(p.data).orderedOn,
      tooltipValueGetter: (p) => orderRowText(p.data).orderedOn,
      minWidth: 110,
      flex: 1,
    },
    {
      colId: 'status',
      headerName: 'Status',
      headerTooltip: HEADER_TOOLTIPS.status,
      headerComponent: 'agColumnHeader',
      cellRenderer: StatusCellRenderer,
      // No tooltipValueGetter: whenTruncated can't measure a renderer cell,
      // so any value here would show on every hover (spec R2).
      minWidth: 150,
      flex: 1,
    },
    {
      colId: 'progress',
      headerName: 'Progress',
      headerTooltip: HEADER_TOOLTIPS.progress,
      headerComponent: 'agColumnHeader',
      cellRenderer: VoyageCellRenderer,
      sortable: false,
      minWidth: 140,
      flex: 2,
    },
    {
      colId: 'itemCount',
      headerName: 'Items',
      headerTooltip: HEADER_TOOLTIPS.itemCount,
      headerComponent: 'agColumnHeader',
      valueGetter: (p) => (p.data as OrderRow).itemCount,
      valueFormatter: (p) => orderRowText(p.data).itemCount,
      tooltipValueGetter: (p) => orderRowText(p.data).itemCount,
      minWidth: 90,
      flex: 1,
      cellClass: 'align-right',
      headerClass: 'align-right',
    },
    {
      colId: 'total',
      headerName: 'Total',
      headerTooltip: HEADER_TOOLTIPS.total,
      headerComponent: 'agColumnHeader',
      valueGetter: (p) => (p.data as OrderRow).total,
      valueFormatter: (p) => orderRowText(p.data).total,
      tooltipValueGetter: (p) => orderRowText(p.data).total,
      minWidth: 110,
      flex: 1,
      cellClass: 'mono align-right',
      headerClass: 'align-right',
    },
    {
      colId: 'shipTo',
      headerName: 'Ship to',
      headerTooltip: HEADER_TOOLTIPS.shipTo,
      headerComponent: 'agColumnHeader',
      valueGetter: (p) => (p.data as OrderRow).shipTo ?? '',
      valueFormatter: (p) => orderRowText(p.data).shipTo,
      tooltipValueGetter: (p) => orderRowText(p.data).shipTo,
      minWidth: 120,
      flex: 1,
    },
  ];

  protected readonly formatMoney = formatMoney;
  protected readonly getRowId = (params: GetRowIdParams<GridRow>) =>
    isGroupRow(params.data) ? `group:${params.data.group.key}` : String(params.data.id);
  protected readonly gridTheme = themeQuartz;
  protected readonly tooltipShowMode = 'whenTruncated' as const;
  protected readonly tooltipShowDelay = 400;

  protected readonly isFullWidthRow = (params: IsFullWidthRowParams<GridRow>) =>
    !!params.rowNode.data && isGroupRow(params.rowNode.data);
  protected readonly fullWidthCellRenderer = OrderGroupRow;
  protected readonly fullWidthCellRendererParams: Pick<
    OrderGroupRowParams,
    'isCollapsed' | 'toggleGroup'
  > = {
    isCollapsed: (key) => this.collapsedGroups().has(key),
    toggleGroup: (key) => this.toggleGroup(key),
  };

  protected readonly postSortRows = (params: PostSortRowsParams<GridRow>) => {
    if (this.groupBy() === 'none') return;

    const order = this.orderView().groups.map((group) => group.key);
    const headerByKey = new Map<string, IRowNode<GridRow>>();
    const ordersByKey = new Map<string, IRowNode<GridRow>[]>();
    for (const node of params.nodes) {
      const data = node.data;
      if (!data) continue;
      if (isGroupRow(data)) {
        headerByKey.set(data.group.key, node);
      } else {
        const bucket = ordersByKey.get(data.groupKey) ?? [];
        bucket.push(node);
        ordersByKey.set(data.groupKey, bucket);
      }
    }

    const result: IRowNode<GridRow>[] = [];
    for (const key of order) {
      const header = headerByKey.get(key);
      if (header) result.push(header);
      result.push(...(ordersByKey.get(key) ?? []));
    }
    params.nodes.splice(0, params.nodes.length, ...result);
  };

  protected openOrder(id: number): void {
    this.store.openOrder(id);
  }

  protected onCellClicked(event: CellClickedEvent<GridRow>): void {
    if (event.data && !isGroupRow(event.data)) {
      this.openOrder(event.data.id);
    }
  }

  protected toggleGroup(key: string): void {
    const next = new Set(this.collapsedGroups());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.collapsedGroups.set(next);
  }

  protected setGroupBy(value: GroupBy): void {
    this.groupBy.set(value);
    this.collapsedGroups.set(new Set());
  }

  protected updateFilter<K extends keyof OrderFilters>(key: K, value: OrderFilters[K]): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
  }

  protected toggleFiltersPanel(): void {
    this.filtersOpen.update((open) => !open);
  }

  protected clearFilters(): void {
    this.filters.set(EMPTY_FILTERS);
  }

  protected clearSearchAndFilters(): void {
    this.search.set('');
    this.filters.set(EMPTY_FILTERS);
  }
}

// Full-width group rows never reach a column value/tooltip getter, so `data`
// here is always an order row.
function orderRowText(data: GridRow | undefined) {
  return displayedText(data as OrderRow);
}
