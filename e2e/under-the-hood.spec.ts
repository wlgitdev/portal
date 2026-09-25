import { readFile } from 'node:fs/promises';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { navigateTo, signInAs } from './support/portal';
import { DESKTOP, openAccountMenu, readPackageJson } from './support/showcase';

// Bundle B12 (roadmap item 12): see what the portal is built from.
// Spec showcase-2 S10; design showcase-2 "Under the hood". This file is also
// the dependency gate: it fails if any runtime package isn't Angular's own
// or one Angular itself requires.
// Rule 3b: DEV may only remove the .skip marker, never edit the assertions.

const ALLOWED_RUNTIME =
  /^(@angular\/(animations|aria|cdk|common|compiler|core|forms|material|platform-browser|router)|rxjs|tslib)$/;
const RUNTIME_MAINTAINERS = ['Angular team', 'Microsoft', 'RxJS core team'];

async function openUnderTheHood(page: Page): Promise<void> {
  await page.setViewportSize(DESKTOP);
  await signInAs(page, 'customer-card-ALFKI');
  const menu = await openAccountMenu(page);
  await menu.getByRole('menuitem', { name: 'About this build' }).click();
  await expect(page).toHaveURL(/\/under-the-hood$/);
}

function section(page: Page, heading: string): Locator {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { level: 2, name: heading }) });
}

async function packageRows(scope: Locator): Promise<Record<string, string>> {
  const rows = await scope
    .getByTestId('package-row')
    .evaluateAll((els) =>
      els.map((el) => [el.getAttribute('data-package')!, el.getAttribute('data-version')!]),
    );
  return Object.fromEntries(rows);
}

test.describe.skip('see what the portal is built from (B12)', () => {
  test('"About this build" opens the page', async ({ page }) => {
    await openUnderTheHood(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'What this portal is built from',
    );
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Runs in your browser',
      'Runs on the server',
      'Build and test only (never shipped)',
      'What each screen is built from',
    ]);
  });

  test('"Runs in your browser" lists exactly package.json\'s dependencies, all Angular-maintained or required', async ({
    page,
  }) => {
    const pkg = await readPackageJson();
    await openUnderTheHood(page);
    const browser = section(page, 'Runs in your browser');

    expect(await packageRows(browser)).toEqual(pkg.dependencies);
    for (const maintainer of await browser.getByTestId('package-maintainer').allInnerTexts()) {
      expect(RUNTIME_MAINTAINERS).toContain(maintainer.trim());
    }
  });

  test('every runtime package is on the allowed list', async () => {
    const pkg = await readPackageJson();
    expect(Object.keys(pkg.dependencies).filter((name) => !ALLOWED_RUNTIME.test(name))).toEqual([]);
  });

  test('the server references only Microsoft packages', async () => {
    const csproj = await readFile('src/PortalLite.Api/PortalLite.Api.csproj', 'utf8');
    const packages = [...csproj.matchAll(/PackageReference Include="([^"]+)"/g)].map((m) => m[1]);
    expect(packages.filter((name) => !name.startsWith('Microsoft.'))).toEqual([]);
  });

  test('"Build and test only" lists exactly package.json\'s devDependencies', async ({ page }) => {
    const pkg = await readPackageJson();
    await openUnderTheHood(page);
    expect(await packageRows(section(page, 'Build and test only (never shipped)'))).toEqual(
      pkg.devDependencies,
    );
  });

  test('fonts load from the portal itself, never node_modules or a CDN', async ({ page }) => {
    const fontRequests: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'font') fontRequests.push(request.url());
    });
    await page.setViewportSize(DESKTOP);
    await signInAs(page, 'customer-card-ALFKI');
    await navigateTo(page, 'Overview');
    await page.evaluate(() => document.fonts.ready);

    expect(await page.evaluate(() => document.fonts.check('16px "IBM Plex Sans"'))).toBe(true);
    expect(fontRequests.length).toBeGreaterThan(0);
    for (const url of fontRequests) {
      expect(new URL(url).pathname, url).toMatch(/^\/fonts\/[^/]+\.woff2$/);
    }
    const pkg = await readPackageJson();
    expect(Object.keys(pkg.dependencies).filter((n) => n.startsWith('@fontsource'))).toEqual([]);
  });

  test('"What each screen is built from" covers all six screens', async ({ page }) => {
    await openUnderTheHood(page);
    await expect(
      section(page, 'What each screen is built from').getByTestId('screen-row').locator('th'),
    ).toHaveText([
      'Orders grid',
      'Workspace',
      'Schedule',
      'Spend',
      'Delivery preferences',
      'Delivery note',
    ]);
  });
});
