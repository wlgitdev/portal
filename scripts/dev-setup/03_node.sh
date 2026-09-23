#!/usr/bin/env bash
# Purpose: install Node.js NODE_MAJOR (NodeSource) and the Angular CLI ANGULAR_CLI_MAJOR globally.
# Parameters: NODE_MAJOR (24), ANGULAR_CLI_MAJOR (22) (lib/config.sh).
# Expected output: "OK Node vX" and "OK Angular CLI X" (or SKIP lines); exit 0.

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

node_major() {
  if has_cmd node; then node -p 'process.versions.node.split(".")[0]'; else echo 0; fi
}

ensure_node() {
  if (( $(node_major) >= NODE_MAJOR )); then
    skip "Node $(node --version) already installed"
    return
  fi
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | as_root bash - >/dev/null
  as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
  ok "Node $(node --version)"
}

ensure_angular_cli() {
  if [[ "$(angular_cli_major)" == "$ANGULAR_CLI_MAJOR" ]]; then
    skip "Angular CLI $ANGULAR_CLI_MAJOR already installed"
    return
  fi
  as_root npm install -g "@angular/cli@${ANGULAR_CLI_MAJOR}" --no-fund --no-audit --loglevel=error
  ok "Angular CLI $(angular_cli_major)"
}

ensure_node
ensure_angular_cli
