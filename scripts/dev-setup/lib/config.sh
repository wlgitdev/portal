# Purpose: single source of tunable defaults for the dev-setup sequence.
# Parameters: every value below can be overridden by an environment variable of the same name.
# Expected output: none; sourced by lib/common.sh.

DOTNET_CHANNEL="${DOTNET_CHANNEL:-10.0}"
DOTNET_ROOT="${DOTNET_ROOT:-$HOME/.dotnet}"
DOTNET_INSTALL_URL="${DOTNET_INSTALL_URL:-https://dot.net/v1/dotnet-install.sh}"

NODE_MAJOR="${NODE_MAJOR:-24}"
ANGULAR_CLI_MAJOR="${ANGULAR_CLI_MAJOR:-22}"

MICROSOFT_PACKAGES_URL="${MICROSOFT_PACKAGES_URL:-https://packages.microsoft.com}"
# Must match the signed-by path inside Microsoft's published .list files.
MICROSOFT_KEYRING="${MICROSOFT_KEYRING:-/usr/share/keyrings/microsoft-prod.gpg}"

MSSQL_SERIES="${MSSQL_SERIES:-2025}"
MSSQL_PID="${MSSQL_PID:-Developer}"
MSSQL_HOST="${MSSQL_HOST:-localhost}"
MSSQL_PORT="${MSSQL_PORT:-1433}"
MSSQL_USER="${MSSQL_USER:-sa}"
MSSQL_START_TIMEOUT_SECS="${MSSQL_START_TIMEOUT_SECS:-120}"
SQLCMD_BIN="${SQLCMD_BIN:-/opt/mssql-tools18/bin/sqlcmd}"

# Must match the database name created by the script at NORTHWIND_SQL_URL.
NORTHWIND_DB="${NORTHWIND_DB:-Northwind}"
NORTHWIND_SQL_URL="${NORTHWIND_SQL_URL:-https://raw.githubusercontent.com/microsoft/sql-server-samples/master/samples/databases/northwind-pubs/instnwnd.sql}"
NORTHWIND_SHA256="${NORTHWIND_SHA256:-}"

PLAYWRIGHT_VERSION="${PLAYWRIGHT_VERSION:-latest}"
PLAYWRIGHT_CACHE_DIR="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"

SETUP_CACHE_DIR="${SETUP_CACHE_DIR:-$HOME/.cache/portal-lite-setup}"
ENGINE_LOG="${ENGINE_LOG:-$SETUP_CACHE_DIR/sqlservr.log}"
ENV_FILE="${ENV_FILE:-$HOME/.portal-lite-env}"

SUPPORTED_UBUNTU="${SUPPORTED_UBUNTU:-22.04 24.04}"
# sqlservr refuses to start below 2000 MB.
MIN_RAM_MB="${MIN_RAM_MB:-2000}"
MIN_DISK_GB="${MIN_DISK_GB:-8}"
EGRESS_URLS="${EGRESS_URLS:-https://packages.microsoft.com https://deb.nodesource.com https://registry.npmjs.org https://raw.githubusercontent.com https://dot.net https://builds.dotnet.microsoft.com https://cdn.playwright.dev}"
