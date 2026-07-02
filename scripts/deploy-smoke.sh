#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '\n[deploy-smoke] %s\n' "$*"
}

run_step() {
  log "Running: $*"
  "$@"
}

export CI="${CI:-true}"

PNPM_BIN="${PNPM_BIN:-pnpm}"

log "Starting post-deploy smoke checks."
run_step "$PNPM_BIN" smoke:telegram
run_step "$PNPM_BIN" smoke:mvp
run_step "$PNPM_BIN" smoke:employee-self-service
log "Post-deploy smoke checks passed."
