// Framework-free (spec P6 R3): the single source of truth for search,
// filtering and grouping, shared by the grid, the card list and their
// tooltips/search so there is exactly one place that decides what an order
// "displays as" or "matches".
import type { OrderStatus, OrderSummary } from '../../core/api/models';

export type GroupBy = 'none' | 'status' | 'orderedMonth' | 'itemCount' | 'shipTo';

export interface OrderFilters {
  orderNoContains: string;
  orderedFrom: string;
  orderedTo: string;
  status: 'All' | OrderStatus;
  itemsFrom: string;
  itemsTo: string;
  totalFrom: string;
  totalTo: string;
  shipToContains: string;
}

export const EMPTY_FILTERS: OrderFilters = {
  orderNoContains: '',
  orderedFrom: '',
  orderedTo: '',
  status: 'All',
  itemsFrom: '',
  itemsTo: '',
  totalFrom: '',
  totalTo: '',
  shipToContains: '',
};

export interface OrderGroup {
  key: string;
  label: string;
  orders: OrderSummary[];
  total: number;
}

export interface OrderView {
  groups: OrderGroup[];
}

export interface DisplayedText {
  orderNo: string;
  orderedOn: string;
  status: OrderStatus;
  itemCount: string;
  total: string;
  shipTo: string;
}

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const STATUS_GROUP_ORDER: OrderStatus[] = ['Late', 'Awaiting dispatch', 'Shipped'];

function ukDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function displayedText(order: OrderSummary): DisplayedText {
  return {
    orderNo: `#${order.id}`,
    orderedOn: ukDate(order.orderedOn),
    status: order.status,
    itemCount: String(order.itemCount),
    total: money.format(order.total),
    shipTo: order.shipTo ?? '',
  };
}

function stripMoney(text: string): string {
  return text.replace(/[£,]/g, '');
}

function matchesSearch(order: OrderSummary, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  const text = displayedText(order);
  const columns = [
    text.orderNo,
    text.orderedOn,
    text.status,
    text.itemCount,
    text.total,
    text.shipTo,
  ];
  const moneyNeedle = stripMoney(needle);
  return (
    columns.some((value) => value.toLowerCase().includes(needle)) ||
    (moneyNeedle !== '' && stripMoney(text.total).includes(moneyNeedle))
  );
}

function matchesFilters(order: OrderSummary, filters: OrderFilters): boolean {
  const orderNo = `#${order.id}`;
  const orderedDate = order.orderedOn.slice(0, 10);
  const shipTo = (order.shipTo ?? '').toLowerCase();

  if (filters.orderNoContains && !orderNo.includes(filters.orderNoContains.trim())) return false;
  if (filters.orderedFrom && orderedDate < filters.orderedFrom) return false;
  if (filters.orderedTo && orderedDate > filters.orderedTo) return false;
  if (filters.status !== 'All' && order.status !== filters.status) return false;
  if (filters.itemsFrom && order.itemCount < Number(filters.itemsFrom)) return false;
  if (filters.itemsTo && order.itemCount > Number(filters.itemsTo)) return false;
  if (filters.totalFrom && order.total < Number(filters.totalFrom)) return false;
  if (filters.totalTo && order.total > Number(filters.totalTo)) return false;
  if (filters.shipToContains && !shipTo.includes(filters.shipToContains.trim().toLowerCase()))
    return false;
  return true;
}

// The Status select (header) plus every Filters-panel field that's set.
export function activeFilterCount(filters: OrderFilters): number {
  const panelFields = [
    filters.orderNoContains,
    filters.orderedFrom,
    filters.orderedTo,
    filters.itemsFrom,
    filters.itemsTo,
    filters.totalFrom,
    filters.totalTo,
    filters.shipToContains,
  ];
  const panelActive = panelFields.filter((value) => value !== '').length;
  return panelActive + (filters.status !== 'All' ? 1 : 0);
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

interface GroupKey {
  key: string;
  label: string;
  sortKey: string | number;
}

function groupKeyFor(order: OrderSummary, groupBy: GroupBy): GroupKey {
  switch (groupBy) {
    case 'status':
      return {
        key: order.status,
        label: order.status,
        sortKey: STATUS_GROUP_ORDER.indexOf(order.status),
      };
    case 'orderedMonth': {
      const yearMonth = order.orderedOn.slice(0, 7);
      return { key: yearMonth, label: monthLabel(order.orderedOn), sortKey: yearMonth };
    }
    case 'itemCount':
      return {
        key: String(order.itemCount),
        label: `${order.itemCount} item${order.itemCount === 1 ? '' : 's'}`,
        sortKey: order.itemCount,
      };
    case 'shipTo': {
      const name = order.shipTo ?? '';
      return { key: name, label: name, sortKey: name };
    }
    case 'none':
      return { key: 'all', label: '', sortKey: 0 };
  }
}

function compareGroups(groupBy: GroupBy, a: GroupKey, b: GroupKey): number {
  switch (groupBy) {
    case 'status':
    case 'itemCount':
      return (a.sortKey as number) - (b.sortKey as number);
    case 'orderedMonth':
      return (b.sortKey as string).localeCompare(a.sortKey as string); // newest first
    case 'shipTo':
      return (a.sortKey as string).localeCompare(b.sortKey as string);
    case 'none':
      return 0;
  }
}

export function buildOrderView(
  orders: OrderSummary[],
  { search, filters, groupBy }: { search: string; filters: OrderFilters; groupBy: GroupBy },
): OrderView {
  const matching = orders.filter(
    (order) => matchesSearch(order, search) && matchesFilters(order, filters),
  );

  const byKey = new Map<string, { group: GroupKey; orders: OrderSummary[] }>();
  for (const order of matching) {
    const group = groupKeyFor(order, groupBy);
    const existing = byKey.get(group.key);
    if (existing) {
      existing.orders.push(order);
    } else {
      byKey.set(group.key, { group, orders: [order] });
    }
  }

  const groups = [...byKey.values()]
    .sort((a, b) => compareGroups(groupBy, a.group, b.group))
    .map(({ group, orders: groupOrders }) => ({
      key: group.key,
      label: group.label,
      orders: groupOrders,
      // Rounded once here so grid/card headers never show a sum a cent off
      // from adding the same already-rounded money figures by eye.
      total: Math.round(groupOrders.reduce((sum, order) => sum + order.total, 0) * 100) / 100,
    }));

  return { groups };
}
