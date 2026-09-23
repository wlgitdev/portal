import { expect, type APIRequestContext, type Page } from '@playwright/test';
import type { OrderSummary } from '../../src/app/core/api/models';

export type NavLabel = 'Overview' | 'Orders' | 'Spend' | 'Schedule' | 'Account';

export function parseMoney(text: string): number {
  return Number(text.replace(/[^0-9.-]+/g, ''));
}

export async function signInAs(page: Page, featuredCardTestId: string): Promise<void> {
  await page.goto('/sign-in');
  await page.getByTestId(featuredCardTestId).click();
  await expect(page).toHaveURL(/\/orders$/);
}

export async function signInBySearch(page: Page, customerId: string): Promise<void> {
  await page.goto('/sign-in');
  await page.getByTestId('customer-search').fill(customerId);
  await page.getByTestId('customer-result').filter({ hasText: customerId }).click();
  await expect(page).toHaveURL(/\/orders$/);
}

// The shell renders a side rail and a bottom nav, both named "Primary"; only
// one is visible at any viewport, and role queries skip the hidden one.
export async function navigateTo(page: Page, label: NavLabel): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: label, exact: true })
    .click();
}

// Test oracle: reads the API directly so screen figures are checked against
// the source data, not against other screen figures.
export async function fetchOrdersAs(
  request: APIRequestContext,
  customerId: string,
): Promise<OrderSummary[]> {
  const response = await request.get('/api/orders', {
    headers: { 'X-Demo-Customer': customerId },
  });
  expect(response.ok()).toBe(true);
  return response.json();
}
