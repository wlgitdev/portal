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
import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Icon } from '../../shared/icon/icon';
import { PageHeader } from '../../shared/page-header/page-header';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { StatusChip } from '../../shared/status-chip/status-chip';
import { openTrackedBottomSheet } from '../../shared/tracked-bottom-sheet';
import { Viewport } from '../../shared/viewport/viewport';
import { VoyageLine } from '../../shared/voyage-line/voyage-line';
import { OrdersStore } from '../../core/orders/orders-store';
import { ActiveFilterChips } from './active-filter-chips/active-filter-chips';
import { OrderFilters } from './order-filters/order-filters';
import { OrdersEmptyState } from './orders-empty-state/orders-empty-state';
import { OrdersFilterState } from './orders-filter-state';
import { OrdersNoMatches } from './orders-no-matches/orders-no-matches';
import { StatusCellRenderer } from './status-cell-renderer';
import { VoyageCellRenderer } from './voyage-cell-renderer';
import { OrderDrawer } from './order-drawer/order-drawer';
import { OrderGroupHeader } from './order-group-header/order-group-header';
import {
  OrderGroupRow,
  type GroupRowData,
  type OrderGroupRowParams,
} from './order-group-row/order-group-row';
import { GROUP_BY_OPTIONS, displayedText, plural, type GroupBy } from './order-view';
import type { OrderStatus, OrderSummary } from '../../core/api/models';

type ColId = 'orderNo' | 'orderedOn' | 'status' | 'progress' | 'itemCount' | 'total' | 'shipTo';

// Every order row also carries the key of the group it's currently in, so
// postSortRows (below) can re-partition rows AG Grid has just sorted flat.
type OrderRow = OrderSummary & { rowKind?: undefined; groupKey: string };
type GridRow = OrderRow | GroupRowData;

function isGroupRow(row: GridRow): row is GroupRowData {
  return row.rowKind === 'group';
}

function controlValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

const STATUS_DOT_CLASS: Record<OrderStatus, string> = {
  Late: 'late',
  'Awaiting dispatch': 'await',
  Shipped: 'ship',
};

// Right edge of the trigger to the right edge of the popover if it fits,
// left-aligned as a fallback near the viewport's right edge.
const FILTERS_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
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
    PageHeader,
    StatusChip,
    VoyageLine,
    Skeleton,
    OrderDrawer,
    OrderGroupHeader,
    AgGridAngular,
    Icon,
    ActiveFilterChips,
    OrderFilters,
    OrdersEmptyState,
    OrdersNoMatches,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    NgTemplateOutlet,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  protected readonly store = inject(OrdersStore);
  protected readonly filterState = inject(OrdersFilterState);
  protected readonly viewport = inject(Viewport);
  private readonly bottomSheet = inject(MatBottomSheet);

  protected readonly groupByOptions = GROUP_BY_OPTIONS;
  protected readonly filtersPositions = FILTERS_POSITIONS;
  protected readonly filtersOpen = signal(false);
  protected readonly filtersSheetOpen = signal(false);
  protected readonly statusDotClass = STATUS_DOT_CLASS;
  protected readonly controlValue = controlValue;
  protected readonly displayedText = displayedText;
  protected readonly plural = plural;

  private readonly filtersTriggerEl = viewChild<ElementRef<HTMLButtonElement>>('filtersTriggerEl');

  // groupBy 'none' -> a single unlabelled group (spec R3); no header rows.
  protected readonly gridRows = computed<GridRow[]>(() => {
    const { groups } = this.filterState.orderView();
    if (this.filterState.groupBy() === 'none') {
      return (groups[0]?.orders ?? []).map((order) => ({ ...order, groupKey: 'all' }));
    }
    const collapsed = this.filterState.collapsedGroups();
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
      cellClass: 'mono align-right',
      headerClass: 'mono align-right',
    },
    {
      colId: 'total',
      headerName: 'Total',
      headerTooltip: HEADER_TOOLTIPS.total,
      headerComponent: 'agColumnHeader',
      valueGetter: (p) => (p.data as OrderRow).total,
      valueFormatter: (p) => orderRowText(p.data).total,
      tooltipValueGetter: (p) => orderRowText(p.data).total,
      // Wider than the other narrow columns: now that R15 makes `mono`
      // actually reach AG Grid's DOM (see orders.css), monospace digits
      // need more room than 110px for a 5-figure total like "£12,615.05".
      minWidth: 130,
      flex: 1,
      cellClass: 'mono align-right',
      headerClass: 'mono align-right',
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
    isCollapsed: (key) => this.filterState.collapsedGroups().has(key),
    toggleGroup: (key) => this.filterState.toggleGroup(key),
  };

  protected readonly postSortRows = (params: PostSortRowsParams<GridRow>) => {
    if (this.filterState.groupBy() === 'none') return;

    const order = this.filterState.orderView().groups.map((group) => group.key);
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

  protected filtersButtonLabel(): string {
    const count = this.filterState.filterCount();
    return count > 0 ? `Filters (${count})` : 'Filters';
  }

  protected toggleFilters(): void {
    if (this.filtersOpen()) {
      this.closeFilters();
    } else {
      this.filtersOpen.set(true);
    }
  }

  protected closeFilters(): void {
    this.filtersOpen.set(false);
    this.filtersTriggerEl()?.nativeElement.focus();
  }

  protected openFiltersSheet(): void {
    openTrackedBottomSheet(this.bottomSheet, OrderFilters, this.filtersSheetOpen);
  }

  protected onGroupByChange(event: Event): void {
    this.filterState.setGroupBy(controlValue(event) as GroupBy);
  }
}

// Full-width group rows never reach a column value/tooltip getter, so `data`
// here is always an order row.
function orderRowText(data: GridRow | undefined) {
  return displayedText(data as OrderRow);
}
