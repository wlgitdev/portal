#!/usr/bin/env bash
# Purpose: install Playwright's Chromium and its OS dependencies for the pending e2e tests.
# Parameters: PLAYWRIGHT_VERSION (latest), PLAYWRIGHT_BROWSERS_PATH (~/.cache/ms-playwright) (lib/config.sh).
# Expected output: "OK Playwright Chromium installed" or "SKIP ..."; exit 0.
# Note: if the repo later pins a different @playwright/test, run `npx playwright install chromium` in the repo.

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

if playwright_chromium_cached; then
  skip "Playwright Chromium already installed"
else
  npx -y "playwright@$PLAYWRIGHT_VERSION" install --with-deps chromium >/dev/null
  ok "Playwright Chromium installed"
fi
