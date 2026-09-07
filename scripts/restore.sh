#!/usr/bin/env bash
# ==============================================================================
# Dawamy - Production Database Restore Script
# Architecture: Docker Compose + PostgreSQL 16
# ==============================================================================
set -euo pipefail

CONTAINER_NAME="${DB_CONTAINER:-dawamy_db}"
SERVICE_NAME="${DB_SERVICE:-postgres}"
DB_USER="${DB_USER:-dawamy_user}"
DB_NAME="${DB_NAME:-dawamy_db}"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path-to-backup.sql.gz> [--force]"
  echo "Example: $0 ./backups/dawamy_db_backup_20260907_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
FORCE="${2:-}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "[ERROR] Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "=========================================================="
echo " Starting Dawamy Database Restore"
echo " Target DB : ${DB_NAME}"
echo " Container : ${CONTAINER_NAME}"
echo " Source    : ${BACKUP_FILE}"
echo "=========================================================="

if [ "${FORCE}" != "--force" ] && [ "${FORCE}" != "-y" ]; then
  read -r -p "WARNING: This will overwrite existing data in '${DB_NAME}'. Continue? (y/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Restore cancelled by user."
    exit 0
  fi
fi

# Stream decompressed dump into PostgreSQL
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[INFO] Restoring into container: ${CONTAINER_NAME}..."
  gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"
elif docker compose ps --services 2>/dev/null | grep -q "^${SERVICE_NAME}$"; then
  echo "[INFO] Restoring into service: ${SERVICE_NAME}..."
  gunzip -c "${BACKUP_FILE}" | docker compose exec -T "${SERVICE_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"
else
  echo "[ERROR] Database container (${CONTAINER_NAME}) is not running!" >&2
  exit 1
fi

echo "[SUCCESS] Database restored successfully from ${BACKUP_FILE}."
