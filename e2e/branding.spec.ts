import { test, expect, type Page } from '@playwright/test';
import {
  controlsWithoutFocusRing,
  findLowContrastText,
  findPureBlackOrWhite,
  peakVoyageAnimations,
  unreachableByTab,
  visibleControls,
} from './support/a11y';
import { signInAs } from './support/portal';

// Bundle B5 (roadmap item 5): switch brand and dark mode.
// To test: pick each brand under Brand preview in light and dark; check
// everything stays readable, including on a phone.
// Rule 3b: DEV may only remove this .skip, never edit the assertions below.
test.describe.skip('switch brand and dark mode', () => {
  type Theme = 'Light' | 'Dark';

  interface Brand {
    name: string;
    attribute: string;
    lightPrimary: string;
  }

  // Primary colours are the design doc's brand presets (fjord, forest,
  // burgundy); dark mode may lighten them for contrast, so only light is pinned.
  const BRANDS: Brand[] = [
    { name: 'Northwind', attribute: 'northwind', lightPrimary: 'rgb(31, 58, 95)' },
    { name: 'Alfreds Futterkiste', attribute: 'alfreds', lightPrimary: 'rgb(47, 93, 58)' },
    { name: 'Ernst Handel', attribute: 'ernst', lightPrimary: 'rgb(110, 34, 51)' },
  ];
  const THEMES: Theme[] = ['Light', 'Dark'];
  const SIGNED_IN_PAGES = [
    '/overview',
    '/orders',
    '/spend',
    '/schedule',
    '/account',
    '/styleguide',
  ];
  const MIN_CONTRAST = 4.5;

  async function chooseBrand(page: Page, brand: Brand): Promise<void> {
    await page.getByRole('button', { name: 'Brand preview', exact: true }).click();
    await page.getByRole('menuitemradio', { name: brand.name, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-brand', brand.attribute);
  }

  async function chooseTheme(page: Page, theme: Theme | 'System'): Promise<void> {
    await page
      .getByRole('radiogroup', { name: 'Theme' })
      .getByRole('radio', { name: theme, exact: true })
      .click();
  }

  // Custom properties come back from getComputedStyle as authored text
  // ("var(--color-fjord)", "#1F3A5F"); applying one to a probe element makes
  // the browser resolve it to a comparable rgb()/px value.
  async function resolvedToken(page: Page, property: string, token: string): Promise<string> {
    return page.evaluate(
      ([cssProperty, cssToken]) => {
        const probe = document.createElement('div');
        probe.style.setProperty(cssProperty, `var(${cssToken})`);
        document.body.append(probe);
        const value = getComputedStyle(probe).getPropertyValue(cssProperty);
        probe.remove();
        return value;
      },
      [property, token],
    );
  }

  test.describe('brand preview', () => {
    test('each brand changes colours, wordmark and corners without a reload', async ({ page }) => {
      await signInAs(page, 'customer-card-ALFKI');
      await chooseTheme(page, 'Light');
      await page.evaluate(() => Object.assign(window, { sameDocument: true }));

      const radii = new Set<string>();
      const wordmarks = new Set<string>();
      for (const brand of BRANDS) {
        await chooseBrand(page, brand);
        expect(await resolvedToken(page, 'background-color', '--mat-sys-primary')).toBe(
          brand.lightPrimary,
        );
        radii.add(await resolvedToken(page, 'border-radius', '--mat-sys-corner-medium'));
        const wordmark = page.getByTestId('wordmark');
        await expect(wordmark).toContainText(brand.name);
        wordmarks.add(await wordmark.innerText());
      }
      expect(radii.size).toBe(BRANDS.length);
      expect(wordmarks.size).toBe(BRANDS.length);
      expect(await page.evaluate(() => 'sameDocument' in window), 'page reloaded').toBe(true);
    });

    test('the menu marks the brand currently shown', async ({ page }) => {
      await signInAs(page, 'customer-card-ALFKI');
      await chooseBrand(page, BRANDS[2]);

      await page.getByRole('button', { name: 'Brand preview', exact: true }).click();
      await expect(
        page.getByRole('menuitemradio', { name: BRANDS[2].name, exact: true }),
      ).toHaveAttribute('aria-checked', 'true');
      await expect(
        page.getByRole('menuitemradio', { name: BRANDS[0].name, exact: true }),
      ).toHaveAttribute('aria-checked', 'false');
    });
  });

  test.describe('theme', () => {
    test('Light and Dark set the theme; System follows the device', async ({ page }) => {
      await signInAs(page, 'customer-card-ALFKI');
      const html = page.locator('html');

      await chooseTheme(page, 'Dark');
      await expect(html).toHaveAttribute('data-theme', 'dark');
      await chooseTheme(page, 'Light');
      await expect(html).toHaveAttribute('data-theme', 'light');

      await page.emulateMedia({ colorScheme: 'dark' });
      await chooseTheme(page, 'System');
      await expect(html).toHaveAttribute('data-theme', 'dark');
      await page.emulateMedia({ colorScheme: 'light' });
      await expect(html).toHaveAttribute('data-theme', 'light');
    });
  });

  test.describe('readability', () => {
    for (const brand of BRANDS) {
      for (const theme of THEMES) {
        test(`${brand.name} in ${theme}: all text meets ${MIN_CONTRAST}:1 on every page`, async ({
          page,
        }) => {
          test.slow();
          await signInAs(page, 'customer-card-late-orders');
          for (const path of SIGNED_IN_PAGES) {
            await page.goto(path);
            await chooseBrand(page, brand);
            await chooseTheme(page, theme);
            await expect(page.getByTestId('skeleton')).toHaveCount(0);

            // Polled so a colour transition mid-switch isn't read as a failure.
            await expect
              .poll(() => page.evaluate(findLowContrastText, MIN_CONTRAST), {
                message: `low-contrast text on ${path}`,
              })
              .toEqual([]);
            if (theme === 'Dark') {
              await expect
                .poll(() => page.evaluate(findPureBlackOrWhite), {
                  message: `pure #000/#FFF on ${path}`,
                })
                .toEqual([]);
            }
          }
        });
      }
    }
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 360, height: 780 } });

    test('no page scrolls sideways at 360px', async ({ page }) => {
      await page.goto('/sign-in');
      const overflow = () =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth;
      expect(await page.evaluate(overflow), 'sideways overflow on /sign-in').toBeLessThanOrEqual(0);

      await signInAs(page, 'customer-card-late-orders');
      for (const path of SIGNED_IN_PAGES) {
        await page.goto(path);
        await expect(page.getByTestId('skeleton')).toHaveCount(0);
        expect(await page.evaluate(overflow), `sideways overflow on ${path}`).toBeLessThanOrEqual(
          0,
        );
      }
    });
  });

  test.describe('motion', () => {
    test('Overview voyage lines draw in by default', async ({ page }) => {
      await signInAs(page, 'customer-card-late-orders');
      await page.goto('/overview', { waitUntil: 'commit' });
      expect(await peakVoyageAnimations(page)).toBeGreaterThan(0);
    });

    test('with reduced motion they appear without animating', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await signInAs(page, 'customer-card-late-orders');
      await page.goto('/overview', { waitUntil: 'commit' });
      expect(await peakVoyageAnimations(page)).toBe(0);
      await expect(page.getByTestId('voyage-line').first()).toBeVisible();
    });
  });

  test.describe('keyboard', () => {
    for (const path of ['/orders', '/account']) {
      test(`every control on ${path} is reachable by Tab with a visible focus ring`, async ({
        page,
      }) => {
        test.slow();
        await signInAs(page, 'customer-card-ALFKI');
        await page.goto(path);
        await expect(page.getByTestId('skeleton')).toHaveCount(0);

        const controls = await visibleControls(page);
        expect(controls.length).toBeGreaterThan(0);
        expect(await unreachableByTab(page, controls), 'never reached by Tab').toEqual([]);
        expect(await controlsWithoutFocusRing(page, controls), 'no visible focus ring').toEqual([]);
      });
    }
  });
});
