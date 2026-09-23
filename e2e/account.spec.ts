import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { navigateTo, signInBySearch } from './support/portal';

// Bundle B4 (roadmap item 4): edit your contact details.
// To test: enter letters in Phone and try saving; fix it, save, reload and
// check it stuck.
// Rule 3b: DEV may only remove this .skip, never edit the assertions below.
test.describe('edit account details', () => {
  // These tests write to dbo.Customers. BLAUS is used so the demo customers
  // (ALFKI, SAVEA, ERNSH) are never touched, and serial mode stops two tests
  // racing on the same row.
  test.describe.configure({ mode: 'serial' });
  const CUSTOMER_ID = 'BLAUS';
  const PHONE_ERROR = 'Phone can only contain digits, spaces, +, ( ) and -';

  let originalProfile: Record<string, unknown>;

  async function getProfile(request: APIRequestContext) {
    const response = await request.get('/api/me', { headers: { 'X-Demo-Customer': CUSTOMER_ID } });
    expect(response.status()).toBe(200);
    return response.json();
  }

  async function openAccount(page: Page) {
    await signInBySearch(page, CUSTOMER_ID);
    await navigateTo(page, 'Account');
    await expect(page).toHaveURL(/\/account$/);
    const phone = page.getByLabel('Phone', { exact: true });
    await expect(phone).not.toHaveValue('');
    return phone;
  }

  test.beforeAll(async ({ request }) => {
    originalProfile = await getProfile(request);
  });

  test.afterAll(async ({ request }) => {
    const response = await request.put('/api/me', {
      headers: { 'X-Demo-Customer': CUSTOMER_ID },
      data: originalProfile,
    });
    expect(response.status()).toBe(200);
  });

  test('company name is shown but cannot be edited', async ({ page }) => {
    await openAccount(page);
    const companyName = page.getByLabel('Company name', { exact: true });
    await expect(companyName).toHaveValue(String(originalProfile['companyName']));
    await expect(companyName).not.toBeEditable();
  });

  test('letters in Phone show an inline error and nothing is saved', async ({ page }) => {
    const phone = await openAccount(page);
    const before = await phone.inputValue();
    const writes: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'PUT' && req.url().includes('/api/me')) writes.push(req.url());
    });

    await phone.fill('abc');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();

    await expect(phone).toHaveAttribute('aria-invalid', 'true');
    await expect(phone).toHaveAccessibleDescription(new RegExp(escapeRegExp(PHONE_ERROR)));
    await expect(page.getByText('Changes saved')).toHaveCount(0);
    expect(writes).toEqual([]);

    await page.reload();
    await expect(page.getByLabel('Phone', { exact: true })).toHaveValue(before);
  });

  test('a valid phone saves, confirms, and survives a reload', async ({ page }) => {
    const phone = await openAccount(page);
    const newPhone = `030-${Date.now() % 10_000_000}`;

    await phone.fill(newPhone);
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByText('Changes saved')).toBeVisible();
    await expect(phone).not.toHaveAttribute('aria-invalid', 'true');

    await page.reload();
    await expect(page.getByLabel('Phone', { exact: true })).toHaveValue(newPhone);
  });

  test('leaving with unsaved edits asks first, and can keep or discard them', async ({ page }) => {
    const phone = await openAccount(page);
    const before = await phone.inputValue();
    await phone.fill('030-0000000');

    const confirm = page.getByRole('dialog', { name: 'Discard unsaved changes?' });
    await navigateTo(page, 'Orders');
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Keep editing', exact: true }).click();
    await expect(confirm).toBeHidden();
    await expect(page).toHaveURL(/\/account$/);
    await expect(phone).toHaveValue('030-0000000');

    await navigateTo(page, 'Orders');
    await confirm.getByRole('button', { name: 'Discard changes', exact: true }).click();
    await expect(page).toHaveURL(/\/orders$/);

    await navigateTo(page, 'Account');
    await expect(page.getByLabel('Phone', { exact: true })).toHaveValue(before);
  });

  test('leaving with no edits does not ask', async ({ page }) => {
    await openAccount(page);
    await navigateTo(page, 'Orders');
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  // The screen blocks bad input before it is sent, so these can only be
  // reached by calling the API directly. They are the spec's P2 acceptance
  // lines; the server must not trust the screen's validation.
  test.describe('API guards', () => {
    test('rejects a phone with letters with a field error', async ({ request }) => {
      const response = await request.put('/api/me', {
        headers: { 'X-Demo-Customer': CUSTOMER_ID },
        data: { ...originalProfile, phone: 'abc' },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.errors?.phone?.length).toBeGreaterThan(0);
    });

    test('refuses a profile request with no customer header', async ({ request }) => {
      const response = await request.get('/api/me');
      expect(response.status()).toBe(401);
    });
  });
});

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
