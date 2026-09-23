#!/usr/bin/env bash
# Purpose: install SQL Server MSSQL_SERIES (edition MSSQL_PID) plus sqlcmd, and start the engine if it is not accepting connections.
# Parameters: MSSQL_SA_PASSWORD (required; only takes effect on the engine's first ever start);
#             MSSQL_SERIES, MSSQL_PID, MSSQL_PORT, MSSQL_START_TIMEOUT_SECS, ENGINE_LOG (lib/config.sh).
# Expected output: "OK SQL Server ... accepting connections" (or SKIP); exit 0. Engine output goes to ENGINE_LOG.

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

install_packages() {
  local version
  version="$(os_release VERSION_ID)"
  ensure_microsoft_key
  add_apt_source "$MICROSOFT_PACKAGES_URL/config/ubuntu/$version/mssql-server-$MSSQL_SERIES.list" "mssql-server-$MSSQL_SERIES.list"
  add_apt_source "$MICROSOFT_PACKAGES_URL/config/ubuntu/$version/prod.list" "microsoft-prod.list"
  apt_install mssql-server mssql-tools18 unixodbc-dev
  ok "mssql-server and sqlcmd installed"
}

launch_engine() {
  # Why not systemctl / mssql-conf setup: cloud containers normally run without systemd, so the
  # engine is launched directly with env-var configuration, exactly as Microsoft's container image does.
  # --preserve-env keeps the password out of the process list, unlike passing it as an argument.
  export ACCEPT_EULA=Y MSSQL_PID MSSQL_SA_PASSWORD MSSQL_TCP_PORT="$MSSQL_PORT"
  mkdir -p "$SETUP_CACHE_DIR"
  if [[ $EUID -eq 0 ]]; then
    nohup runuser -u mssql -- /opt/mssql/bin/sqlservr >"$ENGINE_LOG" 2>&1 &
  else
    nohup sudo --preserve-env=ACCEPT_EULA,MSSQL_PID,MSSQL_SA_PASSWORD,MSSQL_TCP_PORT \
      runuser -u mssql -- /opt/mssql/bin/sqlservr >"$ENGINE_LOG" 2>&1 &
  fi
}

ensure_running() {
  if sql_ready; then
    skip "SQL Server already accepting connections"
    return
  fi
  pgrep -x sqlservr >/dev/null || launch_engine
  wait_until "$MSSQL_START_TIMEOUT_SECS" \
    "SQL Server login (see $ENGINE_LOG; if the engine is up, MSSQL_SA_PASSWORD differs from its first-start value)" \
    sql_ready
  ok "SQL Server $MSSQL_SERIES ($MSSQL_PID) accepting connections on $MSSQL_HOST:$MSSQL_PORT"
}

require_env MSSQL_SA_PASSWORD
install_packages
ensure_running
