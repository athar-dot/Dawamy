#!/bin/sh
set -e

echo "=========================================================="
echo " Starting Dawamy Enterprise Application Container"
echo " Production Architecture: Express + React + PostgreSQL 16"
echo " Environment Mode: ${NODE_ENV:-development}"
echo "=========================================================="

is_prod=0
if [ "$NODE_ENV" = "production" ]; then
  is_prod=1
fi

# 1. DATABASE_URL Availability Validation
if [ -z "$DATABASE_URL" ]; then
  if [ "$is_prod" -eq 1 ]; then
    echo "[FATAL ERROR - FAIL CLOSED] In production mode (NODE_ENV=production), DATABASE_URL is strictly mandatory." >&2
    echo "[FATAL ERROR - FAIL CLOSED] Operating with In-Memory store is prohibited in production to prevent data loss." >&2
    echo "[FATAL ERROR - FAIL CLOSED] Application startup aborted." >&2
    exit 1
  else
    echo "[Dawamy Entrypoint] Notice: No DATABASE_URL provided. Running in development/preview fallback mode."
  fi
fi

# 2. Database Connection Test and Migration (Sequential Flow)
if [ -n "$DATABASE_URL" ]; then
  echo "[Dawamy Entrypoint] Testing PostgreSQL connection readiness..."
  node -e "
    const { Client } = require('pg');
    let retries = 30;
    const isProd = process.env.NODE_ENV === 'production';
    async function check() {
      while (retries > 0) {
        let testClient;
        try {
          testClient = new Client({
            connectionString: process.env.DATABASE_URL,
            connectionTimeoutMillis: 3000,
          });
          await testClient.connect();
          await testClient.query('SELECT 1');
          await testClient.end();
          console.log('[Dawamy Entrypoint] ✅ PostgreSQL is connected, healthy, and accepting queries.');
          process.exit(0);
        } catch (e) {
          if (testClient) {
            try { await testClient.end(); } catch (_) {}
          }
          retries--;
          console.log('[Dawamy Entrypoint] Waiting for PostgreSQL to be ready... (' + retries + ' retries remaining)');
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      if (isProd) {
        console.error('[FATAL ERROR - FAIL CLOSED] PostgreSQL connection failed after 30 retries in production mode.');
        console.error('[FATAL ERROR - FAIL CLOSED] Refusing to start application in an unready state without database.');
        process.exit(1);
      } else {
        console.warn('[Dawamy Entrypoint] Warning: PostgreSQL check timed out in development/preview. Proceeding in fallback mode.');
        process.exit(0);
      }
    }
    check();
  "

  echo "[Dawamy Entrypoint] Applying Prisma database migrations (prisma migrate deploy)..."
  if [ "$is_prod" -eq 1 ]; then
    npx prisma migrate deploy || {
      echo "[FATAL ERROR - FAIL CLOSED] Prisma database migration failed in production!" >&2
      echo "[FATAL ERROR - FAIL CLOSED] Halting container startup." >&2
      exit 1
    }
    echo "[Dawamy Entrypoint] ✅ Prisma migrations deployed successfully."
  else
    npx prisma migrate deploy || {
      echo "[Dawamy Entrypoint] Notice: 'prisma migrate deploy' skipped or returned warning in preview."
    }
  fi
fi

echo "[Dawamy Entrypoint] Launching Dawamy server on port ${PORT:-3000}..."
exec "$@"
