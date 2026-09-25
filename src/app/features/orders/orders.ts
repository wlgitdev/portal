import {
  CdkMenu,
  CdkMenuItem,
  CdkMenuItemCheckbox,
  CdkMenuItemRadio,
  CdkMenuTrigger,
} from '@angular/cdk/menu';
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import {
  Component,
  ElementRef,
  type TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DataGrid } from '../../shared/data-grid/data-grid';
import { sortRows } from '../../shared/data-grid/grid-view';
import type { CellTemplateContext, GridColumn, SortKey } from '../../shared/data-grid/grid-types';
import { formatMoney } from '../../shared/format-money';
import { Icon } from '../../shared/icon/icon';
import { END_ALIGNED_MENU_POSITION } from '../../shared/menu-position';
import { PageHeader } from '../../shared/page-header/page-header';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { StatusTracker } from '../../shared/status-tracker/status-tracker';
import { openTrackedBottomSheet } from '../../shared/tracked-bottom-sheet';
import { Viewport } from '../../shared/viewport/viewport';
import { DeveloperDetails } from '../../core/developer-details';
import { OrdersStore } from '../../core/orders/orders-store';
import { STATUS_GROUP_ORDER } from '../../core/orders/order-stats';
import { ActiveFilterChips } from './active-filter-chips/active-filter-chips';
import { OrderFilters } from './order-filters/order-filters';
import { OrderGroupHeader } from './order-group-header/order-group-header';
import { OrdersEmptyState } from './orders-empty-state/orders-empty-state';
import { OrdersFilterState } from './orders-filter-state';
import { OrdersNoMatches } from './orders-no-matches/orders-no-matches';
import { OrdersSortSheet } from './orders-sort-sheet/orders-sort-sheet';
import { GROUP_BY_OPTIONS, displayedText, plural, type GroupBy } from './order-view';
import type { OrderLineRow, OrderStatus, OrderSummary } from '../../core/api/models';

function controlValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

const STATUS_DOT_CLASS: Record<OrderStatus, string> = {
  Late: 'late',
  'Awaiting dispatch': 'await',
  Shipped: 'ship',
};

// Verbatim design Revision 4 copy — pinned by e2e/orders-table.spec.ts.
const HEADER_TOOLTIPS: Record<string, string> = {
  orderNo: "Northwind's reference number for this order.",
  orderedOn: 'The date you placed the order.',
  status:
    "Each order moves from Ordered, to Awaiting dispatch, to Shipped. Late means it hasn't shipped and is past its due date.",
  itemCount: 'How many different products are on the order.',
  total: 'Value of the goods after discounts. Freight is charged separately.',
  shipTo: 'Who the order is delivered to.',
};

// R24 contract unchanged: the phone Filters sheet's Group by radios still
// drive OrdersFilterState/the card list (Rule 3b); the desktop grid's own
// Group by pill (below) drives the grid's own groupBy instead.
const GROUP_BY_TO_COLUMN: Record<GroupBy, string | null> = {
  none: null,
  status: 'status',
  orderedMonth: 'orderedOn',
  itemCount: 'itemCount',
  shipTo: 'shipTo',
};

function monthLabel(yearMonth: string): string {
  return new Date(`${yearMonth}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// Below the trigger, end-aligned then start-aligned; above as a fallback in
// the same two alignments for a short window (R23 "opens upward only if
// there's more room above" — cdkConnectedOverlayFlexibleDimensions, bound
// in the template, then shrinks whichever of these actually gets used).
const FILTERS_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
];

@Component({
  selector: 'app-orders',
  imports: [
    PageHeader,
    StatusTracker,
    Skeleton,
    OrderGroupHeader,
    DataGrid,
    Icon,
    ActiveFilterChips,
    OrderFilters,
    OrdersEmptyState,
    OrdersNoMatches,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    CdkMenu,
    CdkMenuItem,
    CdkMenuItemRadio,
    CdkMenuItemCheckbox,
    CdkMenuTrigger,
    NgTemplateOutlet,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  protected readonly store = inject(OrdersStore);
  protected readonly filterState = inject(OrdersFilterState);
  protected readonly viewport = inject(Viewport);
  protected readonly developerDetails = inject(DeveloperDetails);
  private readonly bottomSheet = inject(MatBottomSheet);

  protected readonly groupByOptions = GROUP_BY_OPTIONS;
  protected readonly filtersPositions = FILTERS_POSITIONS;
  protected readonly menuPosition = END_ALIGNED_MENU_POSITION;
  protected readonly filtersOpen = signal(false);
  protected readonly filtersSheetOpen = signal(false);
  protected readonly statusDotClass = STATUS_DOT_CLASS;
  protected readonly controlValue = controlValue;
  protected readonly displayedText = displayedText;
  protected readonly plural = plural;

  private readonly filtersTriggerEl = viewChild<ElementRef<HTMLButtonElement>>('filtersTriggerEl');
  private readonly statusCellTpl =
    viewChild<TemplateRef<CellTemplateContext<OrderSummary>>>('statusCellTpl');
  private readonly linesTpl = viewChild<TemplateRef<CellTemplateContext<OrderSummary>>>('linesTpl');
  protected readonly ordersGrid = viewChild<DataGrid<OrderSummary>>('ordersGrid');

  protected readonly detailTemplate = computed(() => this.linesTpl());

  protected readonly columns = computed<GridColumn<OrderSummary>[]>(() => [
    {
      id: 'orderNo',
      header: 'Order no',
      headerTooltip: HEADER_TOOLTIPS['orderNo'],
      value: (order) => order.id,
      text: (order) => `#${order.id}`,
      mono: true,
      frozen: true,
      sortable: true,
      minWidth: 110,
      width: 140,
    },
    {
      id: 'orderedOn',
      header: 'Ordered',
      headerTooltip: HEADER_TOOLTIPS['orderedOn'],
      value: (order) => order.orderedOn,
      text: (order) => displayedText(order).orderedOn,
      sortable: true,
      groupable: true,
      groupKey: (order) => order.orderedOn.slice(0, 7),
      groupLabel: monthLabel,
      groupOrder: (keys) => [...keys].sort((a, b) => b.localeCompare(a)),
      minWidth: 110,
      width: 140,
    },
    {
      id: 'status',
      header: 'Status',
      headerTooltip: HEADER_TOOLTIPS['status'],
      value: (order) => order.status,
      text: (order) => order.status,
      sortable: true,
      groupable: true,
      compare: (a, b) => STATUS_GROUP_ORDER.indexOf(a.status) - STATUS_GROUP_ORDER.indexOf(b.status),
      groupKey: (order) => order.status,
      groupLabel: (key) => key,
      groupOrder: (keys) => STATUS_GROUP_ORDER.filter((status) => keys.includes(status)),
      cellTemplate: this.statusCellTpl(),
      minWidth: 168,
      width: 210,
    },
    {
      id: 'itemCount',
      header: 'Items',
      headerTooltip: HEADER_TOOLTIPS['itemCount'],
      value: (order) => order.itemCount,
      text: (order) => String(order.itemCount),
      align: 'end',
      mono: true,
      sortable: true,
      groupable: true,
      groupKey: (order) => String(order.itemCount),
      groupLabel: (key) => `${key} ${plural(Number(key), 'item')}`,
      groupOrder: (keys) => [...keys].sort((a, b) => Number(a) - Number(b)),
      aggregate: 'sum',
      minWidth: 90,
      width: 90,
    },
    {
      id: 'total',
      header: 'Total',
      headerTooltip: HEADER_TOOLTIPS['total'],
      value: (order) => order.total,
      text: (order) => displayedText(order).total,
      align: 'end',
      mono: true,
      sortable: true,
      aggregate: 'sum',
      formatAggregate: formatMoney,
      statusBar: true,
      minWidth: 130,
      width: 150,
    },
    {
      id: 'shipTo',
      header: 'Ship to',
      headerTooltip: HEADER_TOOLTIPS['shipTo'],
      value: (order) => order.shipTo ?? '',
      text: (order) => order.shipTo ?? '',
      sortable: true,
      groupable: true,
      groupKey: (order) => order.shipTo ?? '',
      groupLabel: (key) => key,
      minWidth: 120,
      width: 160,
    },
  ]);

  protected readonly lineColumns: GridColumn<OrderLineRow>[] = [
    {
      id: 'product',
      header: 'Product',
      value: (line) => line.productName,
      text: (line) => line.productName,
      sortable: true,
      minWidth: 160,
      width: 240,
    },
    {
      id: 'unitPrice',
      header: 'Unit price',
      value: (line) => line.unitPrice,
      text: (line) => formatMoney(line.unitPrice),
      align: 'end',
      mono: true,
      sortable: true,
      minWidth: 90,
      width: 110,
    },
    {
      id: 'quantity',
      header: 'Qty',
      value: (line) => line.quantity,
      text: (line) => String(line.quantity),
      align: 'end',
      mono: true,
      sortable: true,
      aggregate: 'sum',
      minWidth: 70,
      width: 80,
    },
    {
      id: 'discount',
      header: 'Discount',
      value: (line) => line.discount,
      text: (line) => (line.discount > 0 ? `${Math.round(line.discount * 100)}%` : '—'),
      align: 'end',
      mono: true,
      sortable: true,
      minWidth: 80,
      width: 90,
    },
    {
      id: 'amount',
      header: 'Amount',
      value: (line) => line.lineTotal,
      text: (line) => formatMoney(line.lineTotal),
      align: 'end',
      mono: true,
      sortable: true,
      aggregate: 'sum',
      formatAggregate: formatMoney,
      minWidth: 100,
      width: 120,
    },
  ];

  protected readonly currentGroupByLabel = computed(
    () => this.groupByOptions.find((option) => option.value === this.filterState.groupBy())!.label,
  );

  protected readonly gridGroupByLabel = computed(() => {
    const groupBy = this.ordersGrid()?.viewState().groupBy ?? [];
    if (groupBy.length === 0) return 'None';
    const header = this.columns().find((column) => column.id === groupBy[0])?.header ?? groupBy[0];
    return groupBy.length > 1 ? `${header} +${groupBy.length - 1}` : header;
  });

  protected readonly gridGroupByChecked = computed<GroupBy>(() => {
    const first = this.ordersGrid()?.viewState().groupBy[0];
    const match = (Object.keys(GROUP_BY_TO_COLUMN) as GroupBy[]).find(
      (value) => GROUP_BY_TO_COLUMN[value] === (first ?? null),
    );
    return match ?? 'none';
  });

  protected readonly orderRowId = (order: OrderSummary): string => String(order.id);
  protected readonly lineRowId = (line: OrderLineRow): string => String(line.productId);
  protected readonly detailButtonLabel = (order: OrderSummary): string =>
    `Show lines of order #${order.id}`;

  protected readonly previewText = (order: OrderSummary): string => {
    const names = (this.store.linesByOrder().get(order.id) ?? [])
      .map((line) => line.productName)
      .sort((a, b) => a.localeCompare(b));
    return names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '');
  };

  protected linesFor(order: OrderSummary): OrderLineRow[] {
    return this.store.linesByOrder().get(order.id) ?? [];
  }

  protected readonly formatMoney = formatMoney;
  protected readonly expandedCardLines = signal<ReadonlySet<number>>(new Set());

  protected toggleCardLines(orderId: number): void {
    this.store.needLines();
    this.expandedCardLines.update((current) => {
      const next = new Set(current);
      next.has(orderId) ? next.delete(orderId) : next.add(orderId);
      return next;
    });
  }

  protected openOrder(id: number): void {
    this.store.openOrder(id);
  }

  protected onDetailToggled(): void {
    this.store.needLines();
  }

  protected readonly gridStateJson = computed(() => {
    const grid = this.ordersGrid();
    return grid ? JSON.stringify(grid.viewState(), null, 2) : '';
  });

  protected onGroupBySelected(value: GroupBy): void {
    const colId = GROUP_BY_TO_COLUMN[value];
    this.ordersGrid()?.setGroupBy(colId ? [colId] : []);
  }

  protected toggleColumn(colId: string): void {
    this.ordersGrid()?.toggleColumnHidden(colId);
  }

  protected togglePreview(): void {
    this.store.needLines();
    this.ordersGrid()?.togglePreview();
  }

  // Phone-only: the card list's own sort, independent of the desktop grid
  // (which never renders on phone) and of OrdersFilterState's grouping —
  // cards stay grouped as they already are, sorted within each group.
  protected readonly phoneSort = signal<SortKey[]>([]);

  protected sortedOrders(orders: OrderSummary[]): OrderSummary[] {
    return sortRows(orders, this.columns(), this.phoneSort());
  }

  protected openSortSheet(): void {
    this.bottomSheet.open(OrdersSortSheet, { data: this.phoneSort });
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
}
