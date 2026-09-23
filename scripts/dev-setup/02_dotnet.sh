#!/usr/bin/env bash
# Purpose: install the .NET SDK for DOTNET_CHANNEL into DOTNET_ROOT and put it on PATH for new shells.
# Parameters: DOTNET_CHANNEL (10.0), DOTNET_ROOT (~/.dotnet), DOTNET_INSTALL_URL (lib/config.sh).
# Expected output: "OK .NET SDK <version>" or "SKIP ... already installed"; exit 0.

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

sdk_present() {
  [[ -x $DOTNET_ROOT/dotnet ]] && [[ "$("$DOTNET_ROOT/dotnet" --list-sdks)" == *"$DOTNET_CHANNEL."* ]]
}

install_sdk() {
  # Why not apt: Ubuntu's dotnet packages conflict with the packages.microsoft.com feed that
  # 04_sqlserver.sh adds for sqlcmd, so the distro-agnostic installer is used instead.
  apt_install libicu-dev
  mkdir -p "$SETUP_CACHE_DIR"
  curl -fsSL "$DOTNET_INSTALL_URL" -o "$SETUP_CACHE_DIR/dotnet-install.sh"
  bash "$SETUP_CACHE_DIR/dotnet-install.sh" --channel "$DOTNET_CHANNEL" --install-dir "$DOTNET_ROOT" >/dev/null
}

if sdk_present; then
  skip ".NET SDK $DOTNET_CHANNEL already installed"
else
  install_sdk
fi
persist_env_line "export DOTNET_ROOT=\"$DOTNET_ROOT\""
persist_env_line 'export PATH="$DOTNET_ROOT:$DOTNET_ROOT/tools:$PATH"'
ok ".NET SDK $("$DOTNET_ROOT/dotnet" --version)"
