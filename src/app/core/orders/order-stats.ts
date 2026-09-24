// Pure derivations over OrdersStore's one order list, shared by Overview,
// Spend and Schedule (and, for urgency order, Orders' own grid/grouping).
import { localIsoDate } from '../../shared/dates';
import type { OrderStatus, OrderSummary } from '../api/models';

export const STATUS_GROUP_ORDER: OrderStatus[] = ['Late', 'Awaiting dispatch', 'Shipped'];

const RECENT_DAYS = 30;

// Design: "unshipped and recent orders" — still moving, or shipped
// recently enough to still matter. Most urgent first, then most recent.
export function onTheWaterOrders(orders: OrderSummary[], today: Date): OrderSummary[] {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS);
  const recentSince = localIsoDate(cutoff);

  return orders
    .filter((order) => order.status !== 'Shipped' || (order.shippedOn ?? '') >= recentSince)
    .sort(
      (a, b) =>
        STATUS_GROUP_ORDER.indexOf(a.status) - STATUS_GROUP_ORDER.indexOf(b.status) ||
        b.orderedOn.localeCompare(a.orderedOn),
    );
}

function yearAndMonth(iso: string): [year: number, month: number] {
  const [year, month] = iso.slice(0, 7).split('-').map(Number);
  return [year, month];
}

// Calendar-quarter spend for the Overview sentence, not a rolling 90 days.
export function quarterSpend(orders: OrderSummary[], today: Date): number {
  const todayYear = today.getFullYear();
  const quarterStart = Math.floor(today.getMonth() / 3) * 3 + 1;
  const quarterEnd = quarterStart + 2;

  return orders
    .filter((order) => {
      const [year, month] = yearAndMonth(order.orderedOn);
      return year === todayYear && month >= quarterStart && month <= quarterEnd;
    })
    .reduce((sum, order) => sum + order.total, 0);
}

export interface MonthlySpend {
  month: string; // YYYY-MM
  total: number;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// The current calendar month plus the 11 before it (B3's settled test
// contract) — empty months show £0 rather than being dropped.
export function monthlySpend(orders: OrderSummary[], today: Date): MonthlySpend[] {
  const totals = new Map<string, number>();
  for (const order of orders) {
    const key = order.orderedOn.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + order.total);
  }

  return Array.from({ length: 12 }, (_, i) => {
    const month = monthKey(new Date(today.getFullYear(), today.getMonth() - 11 + i, 1));
    return { month, total: Math.round((totals.get(month) ?? 0) * 100) / 100 };
  });
}
