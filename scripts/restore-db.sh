#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[restore-db] %s\n' "$*"
}

fail() {
  printf '[restore-db] ERROR: %s\n' "$*" >&2
  exit 1
}

BACKUP_FILE="${1:-${BACKUP_FILE:-}}"

[[ -n "$BACKUP_FILE" ]] || fail "Usage: scripts/restore-db.sh path/to/backup.dump"
[[ -f "$BACKUP_FILE" ]] || fail "Backup file not found: ${BACKUP_FILE}"
[[ "${ALLOW_DB_RESTORE:-}" == "true" ]] || fail "Refusing restore. Set ALLOW_DB_RESTORE=true."

# Mirrors backup-db.sh's BACKUP_ENCRYPTION_KEY: decrypt to a private temp file
# that is always removed on exit, so the plaintext dump never lingers on disk.
if [[ "$BACKUP_FILE" == *.enc ]]; then
  [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]] || fail "${BACKUP_FILE} looks encrypted. Set BACKUP_ENCRYPTION_KEY to decrypt it."
  command -v openssl >/dev/null 2>&1 || fail "BACKUP_ENCRYPTION_KEY is set but openssl was not found."

  DECRYPTED_FILE="$(mktemp "${TMPDIR:-/tmp}/paypoq-restore-XXXXXX.dump")"
  cleanup_decrypted() { shred -u "$DECRYPTED_FILE" 2>/dev/null || rm -f "$DECRYPTED_FILE"; }
  trap cleanup_decrypted EXIT

  log "Decrypting backup before restore."
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
    -pass env:BACKUP_ENCRYPTION_KEY \
    -in "$BACKUP_FILE" -out "$DECRYPTED_FILE"
  BACKUP_FILE="$DECRYPTED_FILE"
fi

if [[ "${NODE_ENV:-development}" == "production" && "${CONFIRM_PRODUCTION_RESTORE:-}" != "I_UNDERSTAND_THIS_RESTORES_PRODUCTION_DATA" ]]; then
  fail "Production restore requires CONFIRM_PRODUCTION_RESTORE=I_UNDERSTAND_THIS_RESTORES_PRODUCTION_DATA."
fi

if [[ -n "${RESTORE_DATABASE_URL:-}" && "${RESTORE_DATABASE_URL}" == *"paypoq_os"* && "${ALLOW_RESTORE_TO_PAYPOQ_OS:-}" != "true" ]]; then
  fail "RESTORE_DATABASE_URL appears to target paypoq_os. Set ALLOW_RESTORE_TO_PAYPOQ_OS=true if this is intentional."
fi

if [[ -n "${RESTORE_DATABASE_URL:-}" ]] && command -v pg_restore >/dev/null 2>&1; then
  log "Restoring backup with host pg_restore."
  pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$RESTORE_DATABASE_URL" "$BACKUP_FILE"
elif [[ -n "${PG_DOCKER_CONTAINER:-}" ]]; then
  [[ -n "${PGUSER:-}" ]] || fail "PGUSER is required when using PG_DOCKER_CONTAINER."
  [[ -n "${PGDATABASE:-}" ]] || fail "PGDATABASE is required when using PG_DOCKER_CONTAINER."

  log "Restoring backup through Docker container: ${PG_DOCKER_CONTAINER}."
  docker exec -i \
    -e "PGPASSWORD=${PGPASSWORD:-}" \
    "$PG_DOCKER_CONTAINER" \
    pg_restore --clean --if-exists --no-owner --no-privileges -U "$PGUSER" -d "$PGDATABASE" < "$BACKUP_FILE"
else
  fail "pg_restore was not found. Install PostgreSQL client tools or set PG_DOCKER_CONTAINER."
fi

log "Restore completed from: ${BACKUP_FILE}"
