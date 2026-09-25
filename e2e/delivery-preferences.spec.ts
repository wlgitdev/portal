import { test, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { navigateTo, signInBySearch } from './support/portal';
import { DESKTOP, turnOnDeveloperDetails } from './support/showcase';

// Bundle B10 (roadmap item 10): set your delivery preferences.
// Spec showcase-2 S8; design showcase-2 "Account → Delivery preferences".
// Rule 3b: DEV may only remove the .skip marker, never edit the assertions.

// BERGS: never a demo customer, and not BLAUS (item 4's tests write that one).
const CUSTOMER_ID = 'BERGS';
const HEADERS = { 'X-Demo-Customer': CUSTOMER_ID };

const DEFAULTS = {
  shipperId: null,
  deliveryDays: [1, 2, 3, 4, 5],
  windowFrom: '08:00',
  windowTo: '17:00',
  unloading: 'dock',
  maxPallets: 6,
  chilled: false,
  maxTempC: null,
  closedFrom: null,
  closedTo: null,
  notifyEmails: [],
  standingProductIds: [],
  invoiceFormat: 'pdf',
  instructions: '',
  siteMap: null,
};

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

function ukDate(date: Date): string {
  return date.toLocaleDateString('en-GB');
}

async function resetPreferences(request: APIRequestContext): Promise<void> {
  const response = await request.put('/api/me/delivery-preferences', {
    headers: HEADERS,
    data: DEFAULTS,
  });
  expect(response.status()).toBe(200);
}

async function openPreferences(page: Page): Promise<Locator> {
  await page.setViewportSize(DESKTOP);
  await signInBySearch(page, CUSTOMER_ID);
  await navigateTo(page, 'Account');
  await page.getByRole('tab', { name: 'Delivery preferences' }).click();
  const panel = page.getByRole('tabpanel', { name: 'Delivery preferences' });
  await expect(panel.getByRole('combobox', { name: 'Preferred carrier' })).toBeVisible();
  return panel;
}

function invoiceOption(panel: Locator, name: string): Locator {
  return panel
    .getByRole('group', { name: 'Invoice format' })
    .getByRole('radio', { name })
    .or(panel.getByRole('group', { name: 'Invoice format' }).getByRole('button', { name }));
}

async function setWindow(panel: Locator, from: string, to: string): Promise<void> {
  await panel.getByRole('textbox', { name: 'Delivery window from' }).fill(from);
  await panel.getByRole('textbox', { name: 'Delivery window to' }).fill(to);
  await panel.getByRole('textbox', { name: 'Delivery window to' }).blur();
}

test.describe('set your delivery preferences (B10)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => resetPreferences(request));
  test.afterAll(async ({ request }) => resetPreferences(request));

  test('every kind of control is there, named for what it asks', async ({ page }) => {
    const panel = await openPreferences(page);

    await panel.getByRole('combobox', { name: 'Preferred carrier' }).click();
    const options = page.getByRole('option');
    await expect(options).toHaveCount(3);
    await expect(options.filter({ hasText: 'Speedy Express' })).toHaveCount(1);
    await page.keyboard.press('Escape');

    const days = panel.getByRole('group', { name: 'Delivery days' }).getByRole('checkbox');
    await expect(days).toHaveCount(6);
    await expect(panel.getByRole('textbox', { name: 'Delivery window from' })).toHaveValue('08:00');
    await expect(panel.getByRole('textbox', { name: 'Delivery window to' })).toHaveValue('17:00');
    await expect(
      panel.getByRole('radiogroup', { name: 'Unloading' }).getByRole('radio'),
    ).toHaveText(['Loading dock', 'Tail-lift needed', 'By hand']);
    await expect(panel.getByRole('slider', { name: 'Pallets per delivery' })).toHaveValue('6');
    await expect(panel.getByRole('switch', { name: 'Chilled goods' })).not.toBeChecked();
    await expect(panel.getByRole('textbox', { name: 'Closed from' })).toBeVisible();
    await expect(panel.getByRole('textbox', { name: 'Closed to' })).toBeVisible();
    await expect(panel.getByRole('textbox', { name: 'Also notify' })).toBeVisible();
    await expect(panel.getByRole('combobox', { name: 'Standing order products' })).toBeVisible();
    await expect(invoiceOption(panel, 'PDF')).toBeVisible();
    await expect(panel.getByRole('textbox', { name: 'Delivery instructions' })).toBeVisible();
    await expect(panel.getByTestId('instructions-counter')).toHaveText('0 / 500');
    await expect(panel.getByLabel('Site map for drivers')).toBeAttached();
  });

  test('a window under 2 hours is refused, and Save sends nothing and focuses it', async ({
    page,
  }) => {
    const panel = await openPreferences(page);
    let puts = 0;
    await page.route('**/api/me/delivery-preferences', (route) => {
      if (route.request().method() === 'PUT') puts++;
      return route.continue();
    });

    await setWindow(panel, '08:00', '09:00');
    const to = panel.getByRole('textbox', { name: 'Delivery window to' });
    await expect(to).toHaveAttribute('aria-invalid', 'true');
    await expect(to).toHaveAccessibleDescription(/End the window at least 2 hours after it starts/);

    await panel.getByRole('button', { name: 'Save changes' }).click();
    await expect(to).toBeFocused();
    expect(puts).toBe(0);
  });

  test('no delivery days is refused', async ({ page }) => {
    const panel = await openPreferences(page);
    const days = panel.getByRole('group', { name: 'Delivery days' });
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) {
      await days.getByRole('checkbox', { name: day }).uncheck();
    }
    await expect(panel).toContainText('Pick at least one delivery day');
  });

  test('Chilled goods reveals Maximum temperature, which must be −25 to 8 °C', async ({ page }) => {
    const panel = await openPreferences(page);
    const temperature = panel.getByRole('spinbutton', { name: 'Maximum temperature (°C)' });
    await expect(temperature).toHaveCount(0);

    await panel.getByRole('switch', { name: 'Chilled goods' }).click();
    await expect(temperature).toBeVisible();
    await temperature.fill('12');
    await temperature.blur();
    await expect(temperature).toHaveAccessibleDescription(/Enter a temperature from −25 to 8 °C/);

    await temperature.fill('4');
    await panel.getByRole('button', { name: 'Decrease maximum temperature' }).click();
    await expect(temperature).toHaveValue('3');
  });

  test('a bad email is not added to Also notify', async ({ page }) => {
    const panel = await openPreferences(page);
    const input = panel.getByRole('textbox', { name: 'Also notify' });

    await input.fill('not-an-email');
    await input.press('Enter');
    await expect(panel.getByTestId('notify-email')).toHaveCount(0);
    await expect(panel).toContainText('Enter an email address like name@example.com');

    await input.fill('goods-in@example.com');
    await input.press('Enter');
    await expect(panel.getByTestId('notify-email')).toHaveText(['goods-in@example.com']);
  });

  test('a site map over 2 MB is refused; a small PNG is shown by name', async ({ page }) => {
    const panel = await openPreferences(page);
    const input = panel.getByLabel('Site map for drivers');

    await input.setInputFiles({
      name: 'huge.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(3 * 1024 * 1024),
    });
    await expect(panel).toContainText('Choose a file under 2 MB');

    await input.setInputFiles({
      name: 'site-map.png',
      mimeType: 'image/png',
      buffer: ONE_PIXEL_PNG,
    });
    await expect(panel.getByTestId('site-map-name')).toContainText('site-map.png');
    await expect(panel.getByRole('button', { name: 'Remove site map' })).toBeVisible();
  });

  test('saved preferences are all still there after a reload', async ({ page, request }) => {
    const now = new Date();
    const closedFrom = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const closedTo = new Date(now.getFullYear(), now.getMonth() + 1, 5);
    const panel = await openPreferences(page);

    await panel.getByRole('combobox', { name: 'Preferred carrier' }).click();
    await page.getByRole('option').filter({ hasText: 'United Package' }).click();
    const days = panel.getByRole('group', { name: 'Delivery days' });
    await days.getByRole('checkbox', { name: 'Tue' }).uncheck();
    await days.getByRole('checkbox', { name: 'Thu' }).uncheck();
    await setWindow(panel, '07:00', '10:00');
    await panel
      .getByRole('radiogroup', { name: 'Unloading' })
      .getByRole('radio', { name: 'Tail-lift needed' })
      .check();
    await panel.getByRole('slider', { name: 'Pallets per delivery' }).fill('10');
    await panel.getByRole('switch', { name: 'Chilled goods' }).click();
    await panel.getByRole('spinbutton', { name: 'Maximum temperature (°C)' }).fill('4');
    await panel.getByRole('textbox', { name: 'Closed from' }).fill(ukDate(closedFrom));
    await panel.getByRole('textbox', { name: 'Closed to' }).fill(ukDate(closedTo));
    await panel.getByRole('textbox', { name: 'Also notify' }).fill('goods-in@example.com');
    await panel.getByRole('textbox', { name: 'Also notify' }).press('Enter');
    await panel.getByRole('combobox', { name: 'Standing order products' }).fill('Chai');
    await page.getByRole('option', { name: /^Chai/ }).click();
    await invoiceOption(panel, 'Both').click();
    await panel.getByRole('textbox', { name: 'Delivery instructions' }).fill('Ring at gate B.');
    await expect(panel.getByTestId('instructions-counter')).toHaveText('15 / 500');

    await panel.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Changes saved')).toBeVisible();

    const saved = await (
      await request.get('/api/me/delivery-preferences', { headers: HEADERS })
    ).json();
    expect(saved).toMatchObject({
      deliveryDays: [1, 3, 5],
      windowFrom: '07:00',
      windowTo: '10:00',
      unloading: 'tail-lift',
      maxPallets: 10,
      chilled: true,
      maxTempC: 4,
      notifyEmails: ['goods-in@example.com'],
      invoiceFormat: 'both',
      instructions: 'Ring at gate B.',
    });
    expect(saved.standingProductIds).toHaveLength(1);
    expect(saved.shipperId).not.toBeNull();

    await page.reload();
    await page.getByRole('tab', { name: 'Delivery preferences' }).click();
    const reloaded = page.getByRole('tabpanel', { name: 'Delivery preferences' });
    await expect(reloaded.getByRole('combobox', { name: 'Preferred carrier' })).toContainText(
      'United Package',
    );
    await expect(reloaded.getByRole('checkbox', { name: 'Tue' })).not.toBeChecked();
    await expect(reloaded.getByRole('textbox', { name: 'Delivery window to' })).toHaveValue(
      '10:00',
    );
    await expect(reloaded.getByRole('slider', { name: 'Pallets per delivery' })).toHaveValue('10');
    await expect(
      reloaded.getByRole('spinbutton', { name: 'Maximum temperature (°C)' }),
    ).toHaveValue('4');
    await expect(reloaded.getByRole('textbox', { name: 'Closed to' })).toHaveValue(
      ukDate(closedTo),
    );
    await expect(reloaded.getByTestId('notify-email')).toHaveText(['goods-in@example.com']);
    await expect(reloaded.getByTestId('delivery-summary')).toContainText('United Package');
    await expect(reloaded.getByTestId('delivery-summary')).toContainText('07:00–10:00');
    await expect(reloaded.getByTestId('delivery-summary')).toContainText('10 pallets');
  });

  test('the summary flags a field that needs fixing instead of echoing it', async ({ page }) => {
    const panel = await openPreferences(page);
    await setWindow(panel, '08:00', '09:00');
    const summary = panel.getByTestId('delivery-summary');
    await expect(summary).toContainText('delivery window needs fixing');
    await expect(summary).not.toContainText('08:00–09:00');
  });

  test('the API refuses an invalid window with the field named', async ({ request }) => {
    const response = await request.put('/api/me/delivery-preferences', {
      headers: HEADERS,
      data: { ...DEFAULTS, windowFrom: '08:00', windowTo: '09:00' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(Object.keys(body.errors)).toContain('windowTo');
  });

  test('developer details show each control’s state, including its error', async ({ page }) => {
    await openPreferences(page);
    await turnOnDeveloperDetails(page);
    const panel = page.getByRole('tabpanel', { name: 'Delivery preferences' });
    await setWindow(panel, '08:00', '09:00');

    const state = page.getByTestId('form-state-panel');
    await expect(
      state.locator('[data-testid="form-state-row"][data-control="windowTo"]'),
    ).toContainText('windowTooShort');
    await expect(
      state.locator('[data-testid="form-state-row"][data-control="maxPallets"]'),
    ).toContainText('valid');
  });
});
