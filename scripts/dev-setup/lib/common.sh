# Purpose: shared helpers for the numbered dev-setup scripts: logging, privilege, apt, waits, SQL, tool probes.
# Parameters: everything in lib/config.sh; MSSQL_SA_PASSWORD (SQL helpers only).
# Expected output: none; sourced by every numbered script.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
if [[ -f $ENV_FILE ]]; then source "$ENV_FILE"; fi

log()  { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
ok()   { log "OK   $*"; }
skip() { log "SKIP $*"; }
die()  { log "FAIL $*" >&2; exit 1; }

has_cmd() { command -v "$1" >/dev/null 2>&1; }

as_root() {
  if [[ $EUID -eq 0 ]]; then "$@"; else sudo "$@"; fi
}

os_release() { (. /etc/os-release && printf '%s' "${!1}"); }

require_env() {
  [[ -n "${!1:-}" ]] || die "environment variable $1 is not set"
}

wait_until() {
  local timeout_secs="$1" description="$2"
  shift 2
  local deadline=$(( SECONDS + timeout_secs ))
  until "$@" >/dev/null 2>&1; do
    (( SECONDS < deadline )) || die "timed out after ${timeout_secs}s waiting for $description"
    sleep 2
  done
}

persist_env_line() {
  touch "$ENV_FILE"
  grep -qxF "$1" "$ENV_FILE" || printf '%s\n' "$1" >> "$ENV_FILE"
}

APT_INDEX_FRESH=0

apt_install() {
  local pkg missing=()
  for pkg in "$@"; do
    dpkg -s "$pkg" >/dev/null 2>&1 || missing+=("$pkg")
  done
  (( ${#missing[@]} > 0 )) || return 0
  if (( APT_INDEX_FRESH == 0 )); then
    as_root apt-get update -qq
    APT_INDEX_FRESH=1
  fi
  as_root env DEBIAN_FRONTEND=noninteractive ACCEPT_EULA=Y apt-get install -y -qq "${missing[@]}"
}

ensure_microsoft_key() {
  [[ -s $MICROSOFT_KEYRING ]] && return 0
  curl -fsSL "$MICROSOFT_PACKAGES_URL/keys/microsoft.asc" | as_root gpg --dearmor -o "$MICROSOFT_KEYRING"
}

add_apt_source() {
  local list_url="$1" target="/etc/apt/sources.list.d/$2"
  [[ -s $target ]] && return 0
  curl -fsSL "$list_url" | as_root tee "$target" >/dev/null
  APT_INDEX_FRESH=0
}

sqlcmd_run() {
  require_env MSSQL_SA_PASSWORD
  # -I (QUOTED_IDENTIFIER ON) is not sqlcmd's default, but instnwnd.sql relies on it for "Order Details".
  SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" "$SQLCMD_BIN" \
    -S "$MSSQL_HOST,$MSSQL_PORT" -U "$MSSQL_USER" -C -I -b -l 5 "$@"
}

sql_int()   { sqlcmd_run -h -1 -W -Q "SET NOCOUNT ON; $1" | tr -d '[:space:]'; }
sql_ready() { [[ -x $SQLCMD_BIN ]] && sqlcmd_run -Q "SELECT 1" >/dev/null 2>&1; }

angular_cli_major() {
  { npm ls -g --depth=0 @angular/cli 2>/dev/null || true; } \
    | grep -o '@angular/cli@[0-9]*' | cut -d@ -f3 || true
}

playwright_chromium_cached() { compgen -G "$PLAYWRIGHT_CACHE_DIR/chromium-*" >/dev/null; }
