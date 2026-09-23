#!/usr/bin/env bash
# Purpose: restore stock Northwind if absent or broken, then assert the row counts portal-lite's P1 fixtures rely on.
#          Destructive only when the Orders count is wrong: the broken database is dropped and restored.
# Parameters: MSSQL_SA_PASSWORD (required); NORTHWIND_DB, NORTHWIND_SQL_URL, NORTHWIND_SHA256 (optional) (lib/config.sh).
# Expected output: "OK Northwind restored" or "SKIP ...", then one "OK <fixture> = <n>" per fixture; exit 0.

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

readonly FIXTURES=(
  "Customers|SELECT COUNT(*) FROM [$NORTHWIND_DB].dbo.Customers|91"
  "Orders|SELECT COUNT(*) FROM [$NORTHWIND_DB].dbo.Orders|830"
  "Order lines|SELECT COUNT(*) FROM [$NORTHWIND_DB].dbo.[Order Details]|2155"
  "Products|SELECT COUNT(*) FROM [$NORTHWIND_DB].dbo.Products|77"
  "ALFKI orders|SELECT COUNT(*) FROM [$NORTHWIND_DB].dbo.Orders WHERE CustomerID = 'ALFKI'|6"
  "FISSA orders (empty state)|SELECT COUNT(*) FROM [$NORTHWIND_DB].dbo.Orders WHERE CustomerID = 'FISSA'|0"
  "Unshipped orders|SELECT COUNT(*) FROM [$NORTHWIND_DB].dbo.Orders WHERE ShippedDate IS NULL|21"
)

northwind_intact() {
  [[ "$(sql_int "SELECT COUNT(*) FROM [$NORTHWIND_DB].dbo.Orders" 2>/dev/null || true)" == 830 ]]
}

fetch_script() {
  local file="$SETUP_CACHE_DIR/instnwnd.sql"
  mkdir -p "$SETUP_CACHE_DIR"
  if [[ ! -s $file ]]; then
    curl -fsSL "$NORTHWIND_SQL_URL" -o "$file.partial"
    mv "$file.partial" "$file"
  fi
  if [[ -n $NORTHWIND_SHA256 ]]; then
    printf '%s  %s\n' "$NORTHWIND_SHA256" "$file" | sha256sum -c --quiet - >&2 \
      || die "instnwnd.sql checksum mismatch; delete $file and re-run"
  fi
  printf '%s' "$file"
}

restore() {
  local script
  script="$(fetch_script)"
  # instnwnd.sql deliberately doesn't create a database (see its header comment) — it expects
  # to be run against an already-selected one, so -d is required or its objects land in whatever
  # database the connection defaults to.
  sqlcmd_run -Q "IF DB_ID(N'$NORTHWIND_DB') IS NOT NULL BEGIN ALTER DATABASE [$NORTHWIND_DB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$NORTHWIND_DB]; END; CREATE DATABASE [$NORTHWIND_DB]" >/dev/null
  sqlcmd_run -d "$NORTHWIND_DB" -i "$script" >/dev/null
  ok "Northwind restored from $NORTHWIND_SQL_URL"
}

assert_fixtures() {
  local fixture label query expected actual
  for fixture in "${FIXTURES[@]}"; do
    IFS='|' read -r label query expected <<< "$fixture"
    actual="$(sql_int "$query")"
    [[ $actual == "$expected" ]] || die "$label: expected $expected, got $actual"
    ok "$label = $actual"
  done
}

if northwind_intact; then skip "Northwind already restored"; else restore; fi
assert_fixtures
