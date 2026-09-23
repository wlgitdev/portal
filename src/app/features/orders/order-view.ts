// Framework-free (spec P6 R3, extended P7 R11–R13): the single source of
// truth for search, filtering, grouping, chips and the Total histogram, so
// there is exactly one place that decides what an order "displays as",
// "matches" or "falls in range".
import type { OrderStatus, OrderSummary } from '../../core/api/models';

export type GroupBy = 'none' | 'status' | 'orderedMonth' | 'itemCount' | 'shipTo';

export type OrderedPreset = 'any' | '30d' | '3m' | '12m' | 'custom';

export interface OrderFilters {
  orderNoContains: string;
  orderedPreset: OrderedPreset;
  orderedFrom: string;
  orderedTo: string;
  status: 'All' | OrderStatus;
  itemsFrom: string;
  itemsTo: string;
  totalFrom: string;
  totalTo: string;
  shipTo: string[];
}

export const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'status', label: 'Status' },
  { value: 'orderedMonth', label: 'Ordered month' },
  { value: 'itemCount', label: 'Items' },
  { value: 'shipTo', label: 'Ship to' },
];

export const ORDERED_PRESET_OPTIONS: { value: OrderedPreset; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3m', label: 'Last 3 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom dates' },
];

export const EMPTY_FILTERS: OrderFilters = {
  orderNoContains: '',
  orderedPreset: 'any',
  orderedFrom: '',
  orderedTo: '',
  status: 'All',
  itemsFrom: '',
  itemsTo: '',
  totalFrom: '',
  totalTo: '',
  shipTo: [],
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

export interface FilterChip {
  key: string;
  text: string;
}

export interface HistogramBin {
  count: number;
  inRange: boolean;
}

export interface ShipToOption {
  name: string;
  count: number;
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
// Filter/chip amounts are always whole pounds (the Total slider steps by
// £50) — Intl's default currency formatting would otherwise print ".00".
const wholeMoney = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});
const STATUS_GROUP_ORDER: OrderStatus[] = ['Late', 'Awaiting dispatch', 'Shipped'];
export const HISTOGRAM_BIN_COUNT = 16;

export function plural(count: number, word: string): string {
  return `${word}${count === 1 ? '' : 's'}`;
}

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

// The local-date cutoff a preset counts back from today, or null for "any"
// and "custom" (which read orderedFrom/orderedTo directly instead).
function presetCutoff(preset: OrderedPreset, today: Date): string | null {
  const cutoff = new Date(today);
  switch (preset) {
    case '30d':
      cutoff.setDate(cutoff.getDate() - 30);
      break;
    case '3m':
      cutoff.setMonth(cutoff.getMonth() - 3);
      break;
    case '12m':
      cutoff.setMonth(cutoff.getMonth() - 12);
      break;
    default:
      return null;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`;
}

function matchesOrdered(order: OrderSummary, filters: OrderFilters, today: Date): boolean {
  const orderedDate = order.orderedOn.slice(0, 10);
  if (filters.orderedPreset === 'custom') {
    if (filters.orderedFrom && orderedDate < filters.orderedFrom) return false;
    if (filters.orderedTo && orderedDate > filters.orderedTo) return false;
    return true;
  }
  const cutoff = presetCutoff(filters.orderedPreset, today);
  return cutoff === null || orderedDate >= cutoff;
}

function matchesOrderNo(order: OrderSummary, filters: OrderFilters): boolean {
  return (
    !filters.orderNoContains || `#${order.id}`.includes(filters.orderNoContains.trim())
  );
}

function matchesStatus(order: OrderSummary, filters: OrderFilters): boolean {
  return filters.status === 'All' || order.status === filters.status;
}

function matchesItems(order: OrderSummary, filters: OrderFilters): boolean {
  if (filters.itemsFrom && order.itemCount < Number(filters.itemsFrom)) return false;
  if (filters.itemsTo && order.itemCount > Number(filters.itemsTo)) return false;
  return true;
}

function matchesTotal(order: OrderSummary, filters: OrderFilters): boolean {
  if (filters.totalFrom && order.total < Number(filters.totalFrom)) return false;
  if (filters.totalTo && order.total > Number(filters.totalTo)) return false;
  return true;
}

function matchesShipTo(order: OrderSummary, filters: OrderFilters): boolean {
  return filters.shipTo.length === 0 || filters.shipTo.includes(order.shipTo ?? '');
}

export type PredicateField = 'orderNo' | 'ordered' | 'status' | 'items' | 'total' | 'shipTo';

const PREDICATES: {
  field: PredicateField;
  test: (order: OrderSummary, filters: OrderFilters, today: Date) => boolean;
}[] = [
  { field: 'orderNo', test: matchesOrderNo },
  { field: 'ordered', test: matchesOrdered },
  { field: 'status', test: matchesStatus },
  { field: 'items', test: matchesItems },
  { field: 'total', test: matchesTotal },
  { field: 'shipTo', test: matchesShipTo },
];

// Search plus every filter section except `exclude` — the one function
// behind the visible list, the status tabs' counts ("search + filters, not
// status") and the Total histogram's bars ("everything except Total").
export function matchingOrders(
  orders: OrderSummary[],
  options: { search: string; filters: OrderFilters; today: Date; exclude?: PredicateField },
): OrderSummary[] {
  const active = PREDICATES.filter((predicate) => predicate.field !== options.exclude);
  return orders.filter(
    (order) =>
      matchesSearch(order, options.search) &&
      active.every((predicate) => predicate.test(order, options.filters, options.today)),
  );
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
        label: `${order.itemCount} ${plural(order.itemCount, 'item')}`,
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
  { search, filters, groupBy, today }: { search: string; filters: OrderFilters; groupBy: GroupBy; today: Date },
): OrderView {
  const matching = matchingOrders(orders, { search, filters, today });

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

function rangeText(from: string, to: string): string {
  if (from && to) return from === to ? from : `${from}–${to}`;
  if (from) return `${from} or more`;
  return `up to ${to}`;
}

function orderedChip(filters: OrderFilters): FilterChip | null {
  switch (filters.orderedPreset) {
    case 'any':
      return null;
    case '30d':
      return { key: 'ordered', text: 'Ordered last 30 days' };
    case '3m':
      return { key: 'ordered', text: 'Ordered last 3 months' };
    case '12m':
      return { key: 'ordered', text: 'Ordered last 12 months' };
    case 'custom': {
      const { orderedFrom, orderedTo } = filters;
      if (orderedFrom && orderedTo) {
        return { key: 'ordered', text: `Ordered ${ukDate(orderedFrom)}–${ukDate(orderedTo)}` };
      }
      if (orderedFrom) return { key: 'ordered', text: `Ordered from ${ukDate(orderedFrom)}` };
      if (orderedTo) return { key: 'ordered', text: `Ordered until ${ukDate(orderedTo)}` };
      return null;
    }
  }
}

function totalChip(filters: OrderFilters): FilterChip | null {
  const { totalFrom, totalTo } = filters;
  if (!totalFrom && !totalTo) return null;
  const text = rangeText(
    totalFrom && wholeMoney.format(Number(totalFrom)),
    totalTo && wholeMoney.format(Number(totalTo)),
  );
  return { key: 'total', text: `Total ${text}` };
}

function itemsChip(filters: OrderFilters): FilterChip | null {
  const { itemsFrom, itemsTo } = filters;
  if (!itemsFrom && !itemsTo) return null;
  return { key: 'items', text: `Items ${rangeText(itemsFrom, itemsTo)}` };
}

function orderNoChip(filters: OrderFilters): FilterChip | null {
  return filters.orderNoContains
    ? { key: 'orderNo', text: `Order no contains ${filters.orderNoContains}` }
    : null;
}

function shipToChip(filters: OrderFilters): FilterChip | null {
  if (filters.shipTo.length === 0) return null;
  if (filters.shipTo.length === 1) return { key: 'shipTo', text: `Ship to ${filters.shipTo[0]}` };
  return { key: 'shipTo', text: `Ship to ${filters.shipTo.length} places` };
}

// Plain-English chips for every active filter, in the design's section
// order (Ordered, Total, Items, Order no, Ship to) — R13. `today` matches
// histogram()'s signature; no chip text is actually today-relative yet.
export function activeFilterChips(filters: OrderFilters, _today: Date): FilterChip[] {
  return [
    orderedChip(filters),
    totalChip(filters),
    itemsChip(filters),
    orderNoChip(filters),
    shipToChip(filters),
  ].filter((chip): chip is FilterChip => chip !== null);
}

// One row per distinct ship-to name across all of the customer's orders
// (unfiltered — it's what decides whether Ship to is even a real choice,
// R12), each with its own order count.
export function shipToOptions(orders: OrderSummary[]): ShipToOption[] {
  const counts = new Map<string, number>();
  for (const order of orders) {
    const name = order.shipTo ?? '';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// The Total histogram/slider range: this customer's largest order, rounded
// up to the next £500 (£500 when they have none, so a slider always has a
// sensible span).
export function histogramTop(orders: OrderSummary[]): number {
  return Math.max(500, Math.ceil(Math.max(0, ...orders.map((order) => order.total)) / 500) * 500);
}

// 16 equal £0..top bins, counting orders that match everything except
// Total, so the Total section shows what you'd get at every possible
// range — R12.
export function histogram(
  orders: OrderSummary[],
  search: string,
  filters: OrderFilters,
  today: Date,
): HistogramBin[] {
  const top = histogramTop(orders);
  const binWidth = top / HISTOGRAM_BIN_COUNT;

  const counts = new Array(HISTOGRAM_BIN_COUNT).fill(0);
  for (const order of matchingOrders(orders, { search, filters, today, exclude: 'total' })) {
    counts[Math.min(HISTOGRAM_BIN_COUNT - 1, Math.floor(order.total / binWidth))]++;
  }

  const from = filters.totalFrom ? Number(filters.totalFrom) : null;
  const to = filters.totalTo ? Number(filters.totalTo) : null;
  return counts.map((count, index) => {
    const midpoint = (index + 0.5) * binWidth;
    return {
      count,
      inRange: (from === null || midpoint >= from) && (to === null || midpoint <= to),
    };
  });
}
