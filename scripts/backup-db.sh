#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[backup-db] %s\n' "$*"
}

fail() {
  printf '[backup-db] ERROR: %s\n' "$*" >&2
  exit 1
}

timestamp() {
  date -u '+%Y%m%dT%H%M%SZ'
}

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_PREFIX="${BACKUP_PREFIX:-paypoq-os}"
BACKUP_FILE="${BACKUP_FILE:-${BACKUP_DIR}/${BACKUP_PREFIX}-$(timestamp).dump}"

mkdir -p "$BACKUP_DIR"

if [[ -z "${DATABASE_URL:-}" && -z "${PG_DOCKER_CONTAINER:-}" ]]; then
  fail "Set DATABASE_URL for host pg_dump or PG_DOCKER_CONTAINER with PGUSER/PGDATABASE for Docker fallback."
fi

if [[ -n "${DATABASE_URL:-}" ]] && command -v pg_dump >/dev/null 2>&1; then
  log "Creating PostgreSQL custom-format backup with host pg_dump."
  pg_dump --format=custom --no-owner --no-privileges --file="$BACKUP_FILE" "$DATABASE_URL"
elif [[ -n "${PG_DOCKER_CONTAINER:-}" ]]; then
  [[ -n "${PGUSER:-}" ]] || fail "PGUSER is required when using PG_DOCKER_CONTAINER."
  [[ -n "${PGDATABASE:-}" ]] || fail "PGDATABASE is required when using PG_DOCKER_CONTAINER."

  log "Creating PostgreSQL custom-format backup through Docker container: ${PG_DOCKER_CONTAINER}."
  docker exec \
    -e "PGPASSWORD=${PGPASSWORD:-}" \
    "$PG_DOCKER_CONTAINER" \
    pg_dump --format=custom --no-owner --no-privileges -U "$PGUSER" -d "$PGDATABASE" > "$BACKUP_FILE"
else
  fail "pg_dump was not found. Install PostgreSQL client tools or set PG_DOCKER_CONTAINER."
fi

if [[ ! -s "$BACKUP_FILE" ]]; then
  fail "Backup file was not created or is empty: ${BACKUP_FILE}"
fi

chmod 600 "$BACKUP_FILE" 2>/dev/null || true

# This script is a dump primitive, not a full protected backup system —
# encryption-at-rest, off-host copy, retention and restore rehearsal remain
# operator responsibilities (see docs/BACKUP_AND_RECOVERY_V1.md). Setting
# BACKUP_ENCRYPTION_KEY closes the "readable on disk / in transit" part of
# that gap: the plaintext dump is encrypted and then deleted, never left on
# disk unencrypted.
if [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
  command -v openssl >/dev/null 2>&1 || fail "BACKUP_ENCRYPTION_KEY is set but openssl was not found."
  ENCRYPTED_FILE="${BACKUP_FILE}.enc"
  log "Encrypting backup (AES-256-CBC) before leaving it on disk."
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
    -pass env:BACKUP_ENCRYPTION_KEY \
    -in "$BACKUP_FILE" -out "$ENCRYPTED_FILE"
  shred -u "$BACKUP_FILE" 2>/dev/null || rm -f "$BACKUP_FILE"
  chmod 600 "$ENCRYPTED_FILE"
  BACKUP_FILE="$ENCRYPTED_FILE"
else
  log "BACKUP_ENCRYPTION_KEY not set — backup file is written unencrypted. Set it for anything beyond local development."
fi

log "Backup created: ${BACKUP_FILE}"
