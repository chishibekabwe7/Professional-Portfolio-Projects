#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-terralink_db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F)"
OUTPUT_FILE="${BACKUP_DIR}/daily_${DB_NAME}_${STAMP}.sql"

MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  "$DB_NAME" bookings transactions > "$OUTPUT_FILE" || {
    rm -f "$OUTPUT_FILE"
    echo "Daily SQL dump failed"
    exit 1
  }

echo "Daily SQL dump created: $OUTPUT_FILE"
