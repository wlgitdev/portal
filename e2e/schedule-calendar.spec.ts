import { test, expect, type Locator, type Page } from '@playwright/test';
import type { OrderSummary } from '../src/app/core/api/models';
import { fetchOrdersAs, navigateTo, signInAs } from './support/portal';
import { DESKTOP, money, readPackageJson } from './support/showcase';

// Bundle B8 (roadmap item 8): plan deliveries on a richer calendar.
// Spec showcase-2 S6; design showcase-2 "Schedule — in-house calendar".
// Rule 3b: DEV may only remove the .skip marker, never edit the assertions.

type Kind = 'ordered' | 'due' | 'late' | 'shipped';
interface ExpectedEvent {
  orderId: number;
  kind: Kind;
  date: string;
}

// ERNSH has late orders and entries in the current month (see item 3's tests).
const CUSTOMER_ID = 'ERNSH';

function expectedEvents(orders: OrderSummary[]): ExpectedEvent[] {
  const events: ExpectedEvent[] = [];
  for (const order of orders) {
    events.push({ orderId: order.id, kind: 'ordered', date: order.orderedOn.slice(0, 10) });
    if (order.shippedOn) {
      events.push({ orderId: order.id, kind: 'shipped', date: order.shippedOn.slice(0, 10) });
    }
    if (order.status === 'Awaiting dispatch') {
      events.push({ orderId: order.id, kind: 'due', date: order.dueOn.slice(0, 10) });
    }
    if (order.status === 'Late') {
      events.push({ orderId: order.id, kind: 'late', date: order.dueOn.slice(0, 10) });
    }
  }
  return events;
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthTitle(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function calendar(page: Page): Locator {
  return page.getByTestId('calendar');
}

function dayCell(page: Page, iso: string): Locator {
  return calendar(page).locator(`[role="gridcell"][data-date="${iso}"]`);
}

async function chooseView(page: Page, view: 'Month' | 'Week' | 'Agenda' | 'Timeline') {
  await page
    .getByRole('radiogroup', { name: 'Calendar view' })
    .getByRole('radio', { name: view, exact: true })
    .click();
}

async function openSchedule(page: Page): Promise<void> {
  await page.setViewportSize(DESKTOP);
  await signInAs(page, 'customer-card-late-orders');
  await navigateTo(page, 'Schedule');
  await expect(calendar(page)).toBeVisible();
}

test.describe.skip('plan deliveries on a richer calendar (B8)', () => {
  test('opens on this month with today marked', async ({ page }) => {
    await openSchedule(page);
    await expect(
      page.getByRole('radiogroup', { name: 'Calendar view' }).getByRole('radio', { name: 'Month' }),
    ).toBeChecked();
    await expect(calendar(page).getByRole('heading', { level: 2 })).toHaveText(
      monthTitle(new Date()),
    );
    await expect(dayCell(page, isoDate(new Date()))).toHaveAttribute('aria-current', 'date');
  });

  test("every event this month sits on its API date, with overflow counted in '+n more'", async ({
    page,
    request,
  }) => {
    const today = new Date();
    const monthPrefix = isoDate(today).slice(0, 7);
    const events = expectedEvents(await fetchOrdersAs(request, CUSTOMER_ID)).filter((e) =>
      e.date.startsWith(monthPrefix),
    );
    expect(events.length).toBeGreaterThan(0);
    await openSchedule(page);

    for (const date of new Set(events.map((e) => e.date))) {
      const onDay = events.filter((e) => e.date === date);
      const cell = dayCell(page, date);
      const shown = await cell
        .getByTestId('schedule-event')
        .evaluateAll((elements) =>
          elements.map(
            (el) => `${el.getAttribute('data-kind')}:${el.getAttribute('data-order-id')}`,
          ),
        );
      const more = cell.getByRole('button', { name: /^\+\d+ more$/ });
      const hidden = (await more.count()) ? Number((await more.innerText()).match(/\d+/)![0]) : 0;
      expect(shown.length + hidden, `events on ${date}`).toBe(onDay.length);
      const expectedKeys = onDay.map((e) => `${e.kind}:${e.orderId}`);
      for (const key of shown) expect(expectedKeys, `${key} on ${date}`).toContain(key);
    }
  });

  test('legend counts match the API and unticking Shipped hides shipped events', async ({
    page,
    request,
  }) => {
    const events = expectedEvents(await fetchOrdersAs(request, CUSTOMER_ID));
    await openSchedule(page);
    const legend = page.getByRole('group', { name: 'Show on calendar' });

    for (const [label, kind] of [
      ['Ordered', 'ordered'],
      ['Due', 'due'],
      ['Late', 'late'],
      ['Shipped', 'shipped'],
    ] as const) {
      const item = legend.getByRole('checkbox', { name: new RegExp(`^${label}`) });
      await expect(item).toBeChecked();
      await expect(legend.locator(`[data-testid="legend-count"][data-kind="${kind}"]`)).toHaveText(
        String(events.filter((e) => e.kind === kind).length),
      );
    }

    await legend.getByRole('checkbox', { name: /^Shipped/ }).uncheck();
    await expect(
      calendar(page).locator('[data-testid="schedule-event"][data-kind="shipped"]'),
    ).toHaveCount(0);
  });

  test('Next moves a month on and Today comes back', async ({ page }) => {
    await openSchedule(page);
    const today = new Date();
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(calendar(page).getByRole('heading', { level: 2 })).toHaveText(monthTitle(next));
    await page.getByRole('button', { name: 'Today', exact: true }).click();
    await expect(calendar(page).getByRole('heading', { level: 2 })).toHaveText(monthTitle(today));
  });

  test('arrow keys move the focused day and PageDown moves a month', async ({ page }) => {
    await openSchedule(page);
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    await dayCell(page, isoDate(today)).focus();
    await page.keyboard.press('ArrowRight');
    await expect(dayCell(page, isoDate(tomorrow))).toBeFocused();

    await page.keyboard.press('PageDown');
    await expect(calendar(page).getByRole('heading', { level: 2 })).toHaveText(
      monthTitle(new Date(tomorrow.getFullYear(), tomorrow.getMonth() + 1, 1)),
    );
  });

  test('Week shows seven consecutive days including today', async ({ page }) => {
    await openSchedule(page);
    await chooseView(page, 'Week');

    const dates = await calendar(page)
      .locator('[data-testid="week-day"]')
      .evaluateAll((days) => days.map((d) => d.getAttribute('data-date')!));
    expect(dates).toHaveLength(7);
    expect(dates).toContain(isoDate(new Date()));
    for (let i = 1; i < dates.length; i++) {
      const gap = (Date.parse(dates[i]) - Date.parse(dates[i - 1])) / 86_400_000;
      expect(gap).toBe(1);
    }
  });

  test('Agenda lists days in date order, each entry naming its order', async ({ page }) => {
    await openSchedule(page);
    await chooseView(page, 'Agenda');

    const days = calendar(page).getByTestId('agenda-day');
    await expect(days.first()).toBeVisible();
    const dates = await days.evaluateAll((els) => els.map((el) => el.getAttribute('data-date')!));
    expect(dates).toEqual([...dates].sort());
    const entries = calendar(page).getByTestId('schedule-event');
    for (const entry of await entries.all()) {
      await expect(entry).toContainText(`#${await entry.getAttribute('data-order-id')}`);
    }
  });

  test('Timeline draws an overrun for every late order and one today rule', async ({
    page,
    request,
  }) => {
    const late = (await fetchOrdersAs(request, CUSTOMER_ID)).filter((o) => o.status === 'Late');
    expect(late.length).toBeGreaterThan(0);
    await openSchedule(page);
    await chooseView(page, 'Timeline');
    await expect(page.getByRole('radiogroup', { name: 'Timeline zoom' })).toBeVisible();

    for (const order of late) {
      const row = calendar(page).locator(
        `[data-testid="timeline-row"][data-order-id="${order.id}"]`,
      );
      await expect(row.getByTestId('timeline-bar')).toBeVisible();
      await expect(row.getByTestId('timeline-overrun')).toBeVisible();
    }
    await expect(calendar(page).getByTestId('timeline-today')).toHaveCount(1);
  });

  test("hovering an event previews the order's total", async ({ page, request }) => {
    const orders = await fetchOrdersAs(request, CUSTOMER_ID);
    await openSchedule(page);
    const event = calendar(page).getByTestId('schedule-event').first();
    const orderId = await event.getAttribute('data-order-id');
    const order = orders.find((o) => String(o.id) === orderId)!;

    await event.hover();
    const preview = page.getByTestId('event-preview');
    await expect(preview).toContainText(`#${order.id}`);
    await expect(preview).toContainText(money.format(order.total));
  });

  test('picking a date two months ahead in the navigator moves the calendar there', async ({
    page,
  }) => {
    await openSchedule(page);
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth() + 2, 15);
    const navigator = page.getByTestId('calendar-navigator');

    await navigator.getByRole('button', { name: 'Next month' }).click();
    await navigator.getByRole('button', { name: 'Next month' }).click();
    const label = target.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    await navigator.getByRole('button', { name: label, exact: true }).click();

    await expect(calendar(page).getByRole('heading', { level: 2 })).toHaveText(monthTitle(target));
  });

  test('no FullCalendar in the page or package.json', async ({ page }) => {
    await openSchedule(page);
    await expect(page.locator('.fc')).toHaveCount(0);
    const pkg = await readPackageJson();
    expect(Object.keys(pkg.dependencies).filter((n) => n.startsWith('@fullcalendar'))).toEqual([]);
  });
});
