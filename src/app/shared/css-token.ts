// Canvas-rendered charts (ECharts) can't read var(--token) the way real DOM
// can, so callers that need a token's colour as a plain string (not a CSS
// rule) resolve it from the cascade once, here.
export function cssToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
