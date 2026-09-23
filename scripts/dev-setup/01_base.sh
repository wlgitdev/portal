#!/usr/bin/env bash
# Purpose: install base tools, prove outbound access to every download host, and wire the shared shell env file.
# Parameters: EGRESS_URLS, ENV_FILE (lib/config.sh).
# Expected output: OK line per tool set, per host and for the env file; exit 0.

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

install_base_tools() {
  apt_install curl ca-certificates gnupg apt-transport-https unzip
  ok "base tools present"
}

check_egress() {
  local url
  for url in $EGRESS_URLS; do
    curl -sS -o /dev/null --max-time 15 "$url" \
      || die "no outbound access to $url; allow it in the container's network policy"
    ok "reachable: $url"
  done
}

wire_env_file() {
  local rc hook="[ -f \"$ENV_FILE\" ] && . \"$ENV_FILE\""
  persist_env_line 'export DOTNET_CLI_TELEMETRY_OPTOUT=1'
  persist_env_line 'export DOTNET_NOLOGO=1'
  persist_env_line 'export NG_CLI_ANALYTICS=false'
  for rc in "$HOME/.bashrc" "$HOME/.profile"; do
    touch "$rc"
    grep -qxF "$hook" "$rc" || printf '%s\n' "$hook" >> "$rc"
  done
  ok "env file $ENV_FILE sourced by new shells"
}

install_base_tools
check_egress
wire_env_file
