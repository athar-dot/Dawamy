#!/bin/sh
set -e

echo "=========================================================="
echo " Starting Dawamy Enterprise Application Container"
echo "=========================================================="

# Automatically run pending Prisma migrations if DATABASE_URL is configured
if [ -n "$DATABASE_URL" ]; then
  echo "[Dawamy Entrypoint] Checking and applying Prisma database migrations..."
  npx prisma migrate deploy || {
    echo "[Dawamy Entrypoint] Warning: 'prisma migrate deploy' exited with an error. Continuing server boot."
  }
else
  echo "[Dawamy Entrypoint] No DATABASE_URL provided. Skipping migrations."
fi

echo "[Dawamy Entrypoint] Starting Express & Vite Application on Port ${PORT:-3000}..."
exec "$@"
