#!/usr/bin/env bash
# Purpose: fail fast if this container cannot host the portal-lite toolchain. Changes nothing.
# Parameters: MSSQL_SA_PASSWORD (required); SUPPORTED_UBUNTU, MIN_RAM_MB, MIN_DISK_GB (lib/config.sh).
# Expected output: one "OK" line per check, exit 0. Any failure prints "FAIL <reason>" and exits 1.

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

check_os() {
  local id version arch
  id="$(os_release ID)"
  version="$(os_release VERSION_ID)"
  arch="$(uname -m)"
  [[ $id == ubuntu ]] || die "Ubuntu required, found $id"
  [[ " $SUPPORTED_UBUNTU " == *" $version "* ]] || die "Ubuntu $version unsupported; need one of: $SUPPORTED_UBUNTU"
  [[ $arch == x86_64 ]] || die "x86_64 required (SQL Server on Linux ships no arm64 build), found $arch"
  ok "Ubuntu $version $arch"
}

check_privilege() {
  if [[ $EUID -eq 0 ]]; then ok "running as root"; return; fi
  has_cmd sudo && sudo -n true 2>/dev/null || die "root or passwordless sudo required"
  ok "passwordless sudo available"
}

effective_ram_mb() {
  local ram_mb cgroup_bytes
  ram_mb=$(( $(awk '/^MemTotal:/ {print $2}' /proc/meminfo) / 1024 ))
  if [[ -r /sys/fs/cgroup/memory.max ]]; then
    cgroup_bytes="$(< /sys/fs/cgroup/memory.max)"
    if [[ $cgroup_bytes =~ ^[0-9]+$ ]] && (( cgroup_bytes / 1048576 < ram_mb )); then
      ram_mb=$(( cgroup_bytes / 1048576 ))
    fi
  fi
  printf '%s' "$ram_mb"
}

check_memory() {
  local ram_mb
  ram_mb="$(effective_ram_mb)"
  (( ram_mb >= MIN_RAM_MB )) || die "${ram_mb} MB RAM available; SQL Server needs ${MIN_RAM_MB} MB"
  ok "${ram_mb} MB RAM"
}

check_disk() {
  local free_gb
  free_gb="$(df -BG --output=avail "$HOME" | tail -1 | tr -dc '0-9')"
  (( free_gb >= MIN_DISK_GB )) || die "${free_gb} GB free; need ${MIN_DISK_GB} GB"
  ok "${free_gb} GB free disk"
}

check_sa_password() {
  require_env MSSQL_SA_PASSWORD
  local pw="$MSSQL_SA_PASSWORD" classes=0
  [[ $pw =~ [A-Z] ]] && classes=$(( classes + 1 ))
  [[ $pw =~ [a-z] ]] && classes=$(( classes + 1 ))
  [[ $pw =~ [0-9] ]] && classes=$(( classes + 1 ))
  [[ $pw =~ [^A-Za-z0-9] ]] && classes=$(( classes + 1 ))
  (( ${#pw} >= 8 && classes >= 3 )) \
    || die "MSSQL_SA_PASSWORD needs 8+ chars and 3 of: upper, lower, digit, symbol"
  ok "MSSQL_SA_PASSWORD meets SQL Server policy"
}

check_os
check_privilege
check_memory
check_disk
check_sa_password
