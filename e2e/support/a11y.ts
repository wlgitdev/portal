import type { Locator, Page } from '@playwright/test';

export interface ContrastFailure {
  text: string;
  ratio: number;
}

// WCAG 2.x contrast of every visible text node against the background it
// actually sits on (ancestor backgrounds alpha-composited). Colours are
// normalised through a 1px canvas so oklch()/color-mix() tokens compare the
// same as hex. Disabled controls are exempt, as in WCAG 1.4.3.
export function findLowContrastText(minRatio: number): ContrastFailure[] {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  const toRgba = (css: string): [number, number, number, number] => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top: number[], bottom: number[]) =>
    [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3])).concat(1);
  const luminance = ([r, g, b]: number[]) => {
    const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const backgroundBehind = (el: Element): number[] => {
    const layers: number[][] = [];
    for (let node: Element | null = el; node; node = node.parentElement) {
      const bg = toRgba(getComputedStyle(node).backgroundColor);
      if (bg[3] > 0) layers.push(bg);
      if (bg[3] === 1) break;
    }
    return layers.reduceRight((below, layer) => over(layer, below), [255, 255, 255, 1]);
  };

  const failures: ContrastFailure[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    const text = node.textContent?.trim();
    if (!el || !text || el.closest('svg, [aria-hidden="true"], :disabled')) continue;
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const bg = backgroundBehind(el);
    const fg = over(toRgba(getComputedStyle(el).color), bg);
    const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
    const ratio = (l1 + 0.05) / (l2 + 0.05);
    if (ratio < minRatio) failures.push({ text: text.slice(0, 40), ratio: +ratio.toFixed(2) });
  }
  return failures;
}

export function findPureBlackOrWhite(): string[] {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  const isPure = (css: string) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return a === 255 && ((r === 0 && g === 0 && b === 0) || (r === 255 && g === 255 && b === 255));
  };
  const offenders: string[] = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!el.checkVisibility()) continue;
    const style = getComputedStyle(el);
    // Every element computes a default black fill, but only SVG shapes paint it.
    const painted =
      el instanceof SVGGeometryElement || el instanceof SVGTextContentElement
        ? ['fill', 'stroke']
        : ['color', 'background-color'];
    for (const property of painted) {
      const value = style.getPropertyValue(property);
      if (value && value !== 'none' && isPure(value)) {
        offenders.push(`<${el.tagName.toLowerCase()}> ${property}: ${value}`);
      }
    }
  }
  return offenders;
}

// Samples every frame from navigation until 1.2s after the first voyage
// line appears (or 10s if none does), so it sees the draw-in whether it is
// a CSS animation, a transition or Web Animations. Returns the most
// animations seen at once.
export async function peakVoyageAnimations(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let peak = 0;
        let firstSeenAt: number | null = null;
        const startedAt = performance.now();
        const sample = (now: number) => {
          const lines = document.querySelectorAll('[data-testid="voyage-line"]');
          if (lines.length && firstSeenAt === null) firstSeenAt = now;
          let running = 0;
          lines.forEach((line) => (running += line.getAnimations({ subtree: true }).length));
          peak = Math.max(peak, running);
          const settled = firstSeenAt !== null && now - firstSeenAt > 1_200;
          if (settled || now - startedAt > 10_000) resolve(peak);
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
  );
}

// tabindex="-1" is excluded everywhere: composite widgets (the Theme
// radiogroup, menus) use a roving tabindex, so only their active item is a
// Tab stop and the rest are reached with arrow keys, per WAI-ARIA.
const CONTROLS = ['a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]']
  .map((selector) => `${selector}:not([disabled]):not([tabindex="-1"])`)
  .join(', ');

export async function visibleControls(page: Page): Promise<Locator[]> {
  const all = await page.locator(CONTROLS).all();
  const visible: Locator[] = [];
  for (const control of all) if (await control.isVisible()) visible.push(control);
  return visible;
}

// Tabs through the page, tagging each element that receives focus, then
// reports which visible controls never did.
export async function unreachableByTab(page: Page, controls: Locator[]): Promise<string[]> {
  for (let i = 0; i < controls.length * 2 + 10; i++) {
    await page.keyboard.press('Tab');
    await page.evaluate(() => document.activeElement?.setAttribute('data-was-focused', ''));
  }
  const missed: string[] = [];
  for (const control of controls) {
    if ((await control.getAttribute('data-was-focused')) === null) {
      missed.push(await control.evaluate((el) => el.outerHTML.slice(0, 80)));
    }
  }
  return missed;
}

// A focus ring is "visible" if the pixels around the control differ
// between focused and unfocused. Checking outline/box-shadow styles
// instead would miss Material fields, whose ring is drawn by a wrapper.
export async function controlsWithoutFocusRing(page: Page, controls: Locator[]): Promise<string[]> {
  const RING_MARGIN_PX = 6;
  const missing: string[] = [];
  for (const control of controls) {
    await control.scrollIntoViewIfNeeded();
    const box = (await control.boundingBox())!;
    const clip = {
      x: Math.max(0, box.x - RING_MARGIN_PX),
      y: Math.max(0, box.y - RING_MARGIN_PX),
      width: box.width + RING_MARGIN_PX * 2,
      height: box.height + RING_MARGIN_PX * 2,
    };
    await control.focus();
    // A bare keypress puts Chromium in keyboard modality, so programmatic
    // focus shows the same :focus-visible ring a Tab would.
    await page.keyboard.press('Shift');
    const focused = await page.screenshot({ clip, animations: 'disabled' });
    await control.blur();
    const blurred = await page.screenshot({ clip, animations: 'disabled' });
    if (focused.equals(blurred)) {
      missing.push(await control.evaluate((el) => el.outerHTML.slice(0, 80)));
    }
  }
  return missing;
}
