#!/usr/bin/env bash
# Purpose: print the ready toolchain and the connection-string shape the API will need in P2. Changes nothing.
# Parameters: MSSQL_SA_PASSWORD (required, used only to query the server; never printed).
# Expected output: a version table, then the connection-string template with the password redacted; exit 0.

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

report() { printf '  %-14s %s\n' "$1" "$2"; }

sql_version() {
  sqlcmd_run -h -1 -W -Q "SET NOCOUNT ON; SELECT CAST(SERVERPROPERTY('ProductVersion') AS varchar(20)) + ' ' + CAST(SERVERPROPERTY('Edition') AS varchar(60))"
}

log "Toolchain ready"
report ".NET SDK" "$(dotnet --version)"
report "Node" "$(node --version)"
report "Angular CLI" "$(angular_cli_major)"
report "SQL Server" "$(sql_version)"
report "Northwind" "[$NORTHWIND_DB] on $MSSQL_HOST,$MSSQL_PORT"
report "Chromium" "$(playwright_chromium_cached && echo installed || echo MISSING)"

log "P2 connection string (set via: dotnet user-secrets set ConnectionStrings:Northwind \"...\")"
report "" "Server=$MSSQL_HOST,$MSSQL_PORT;Database=$NORTHWIND_DB;User Id=$MSSQL_USER;Password=<MSSQL_SA_PASSWORD>;Encrypt=True;TrustServerCertificate=True"
log "Open a new shell (or: source $ENV_FILE) to pick up PATH changes."


