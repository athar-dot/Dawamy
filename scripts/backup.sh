#!/usr/bin/env bash
# ==============================================================================
# Dawamy - Production Database Backup Script
# Architecture: Docker Compose + PostgreSQL 16
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER_NAME="${DB_CONTAINER:-dawamy_db}"
SERVICE_NAME="${DB_SERVICE:-postgres}"
DB_USER="${DB_USER:-dawamy_user}"
DB_NAME="${DB_NAME:-dawamy_db}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/dawamy_db_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "=========================================================="
echo " Starting Dawamy Database Backup"
echo " Timestamp : ${TIMESTAMP}"
echo " Database  : ${DB_NAME}"
echo " Container : ${CONTAINER_NAME}"
echo " Destination: ${BACKUP_FILE}"
echo "=========================================================="

# Check if Docker compose or container is active
if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[INFO] Using running container: ${CONTAINER_NAME}"
    docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"
  elif docker compose ps --services 2>/dev/null | grep -q "^${SERVICE_NAME}$"; then
    echo "[INFO] Using docker compose service: ${SERVICE_NAME}"
    docker compose exec -T "${SERVICE_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"
  else
    echo "[ERROR] PostgreSQL container (${CONTAINER_NAME}) or service (${SERVICE_NAME}) is not running!" >&2
    exit 1
  fi
else
  echo "[ERROR] Docker command not found on host." >&2
  exit 1
fi

# Verification
if [ -s "${BACKUP_FILE}" ]; then
  FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "[SUCCESS] Backup created successfully: ${BACKUP_FILE} (${FILE_SIZE})"
  echo "[INFO] Note on Encryption: The compressed dump is unencrypted. To encrypt at rest for compliance:"
  echo "       gpg -c ${BACKUP_FILE}"
  
  # Retention policy: retain files for 30 days
  echo "[INFO] Cleaning backups older than 30 days..."
  find "${BACKUP_DIR}" -name "dawamy_db_backup_*.sql.gz" -type f -mtime +30 -delete || true
else
  echo "[ERROR] Backup failed or generated empty file." >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi
