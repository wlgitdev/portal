
#!/usr/bin/env bash
# Purpose: run every numbered step in order. Run at the start of EVERY session: it is idempotent and
#          restarts SQL Server if the container was recycled.
# Parameters: MSSQL_SA_PASSWORD (required); any lib/config.sh override.
# Expected output: each step's OK/SKIP lines under a "=== <script>" banner, ending with 07's table; exit 0.
#                  The first failing step prints FAIL <reason> and stops the run with exit 1.

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

for step in "$(dirname "${BASH_SOURCE[0]}")"/[0-9][0-9]_*.sh; do
  log "=== $(basename "$step")"
  bash "$step"
done