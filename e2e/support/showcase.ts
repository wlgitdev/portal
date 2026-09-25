import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import type { OrderDetail, OrderSummary } from '../../src/app/core/api/models';

// Shared by the showcase-2 bundles (B6–B12). API oracles read the API
// directly so screen figures are checked against source data.

export const DESKTOP = { width: 1440, height: 1000 };

export interface OrderLineRow {
  orderId: number;
  productId: number;
  productName: string;
  categoryName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  lineTotal: number;
}

export const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function roundPence(value: number): number {
  return Math.round(value * 100) / 100;
}

export function ukDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export async function fetchOrderLinesAs(
  request: APIRequestContext,
  customerId: string,
): Promise<OrderLineRow[]> {
  const response = await request.get('/api/order-lines', {
    headers: { 'X-Demo-Customer': customerId },
  });
  expect(response.ok()).toBe(true);
  return response.json();
}

export async function fetchOrderAs(
  request: APIRequestContext,
  customerId: string,
  orderId: number,
): Promise<OrderDetail> {
  const response = await request.get(`/api/orders/${orderId}`, {
    headers: { 'X-Demo-Customer': customerId },
  });
  expect(response.ok()).toBe(true);
  return response.json();
}

export function sumTotals(orders: OrderSummary[]): number {
  return roundPence(orders.reduce((sum, order) => sum + order.total, 0));
}

// Desktop account menu (a CDK menu under the top-bar trigger).
export async function openAccountMenu(page: Page): Promise<Locator> {
  await page
    .getByRole('banner')
    .getByRole('button', { name: /^Account: / })
    .click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu;
}

export async function turnOnDeveloperDetails(page: Page): Promise<void> {
  const menu = await openAccountMenu(page);
  const item = menu.getByRole('menuitemcheckbox', { name: 'Show developer details' });
  if ((await item.getAttribute('aria-checked')) !== 'true') await item.click();
  await page.keyboard.press('Escape');
}

export async function readPackageJson(): Promise<{
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}> {
  const { readFile } = await import('node:fs/promises');
  return JSON.parse(await readFile('package.json', 'utf8'));
}
