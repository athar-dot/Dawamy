import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

let isDbConnected = false;
let loggedNotice = false;

/**
 * Production Safety Check:
 * Enforces that in production mode, DATABASE_URL must be defined.
 * Fails closed immediately if missing.
 */
export function assertProductionDatabaseConfigured(): void {
  if (process.env.NODE_ENV === 'production') {
    const dbUrl = process.env.DATABASE_URL?.trim();
    if (!dbUrl) {
      const errorMsg =
        '[FATAL] Production Startup Error: DATABASE_URL environment variable is missing.\n' +
        'Dawamy is an enterprise HR system requiring a persistent PostgreSQL database.\n' +
        'In-memory fallback is strictly disabled in production to prevent data loss.\n' +
        'Application startup failed closed.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
}

/**
 * Probes the PostgreSQL database connection via Prisma.
 * - In Production: If database is unreachable, returns false (FAIL CLOSED) and does not engage fallback.
 * - In Development/Preview: If DATABASE_URL is missing, logs standby notice and returns false.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  const isProd = process.env.NODE_ENV === 'production';
  const dbUrl = process.env.DATABASE_URL?.trim();

  // If DATABASE_URL is missing
  if (!dbUrl) {
    if (isProd) {
      console.error(
        '❌ [FATAL] DATABASE_URL is not set in production mode. PostgreSQL database is strictly required.'
      );
      isDbConnected = false;
      return false;
    }

    if (!loggedNotice) {
      console.log(
        'ℹ️ [Preview Mode] DATABASE_URL is not set. Operating in development/preview mode with memory fallback.'
      );
      loggedNotice = true;
    }
    isDbConnected = false;
    return false;
  }

  try {
    // Probe query with timeout
    await prisma.$queryRaw`SELECT 1`;
    isDbConnected = true;
    if (!loggedNotice) {
      console.log('✅ Connected to PostgreSQL database via Prisma successfully.');
      loggedNotice = true;
    }
    return true;
  } catch (err: any) {
    isDbConnected = false;
    if (isProd) {
      console.error(
        '❌ [Production Database Failure] Unable to connect to PostgreSQL database:',
        err?.message || err
      );
    } else {
      console.warn('⚠️ PostgreSQL database is currently unreachable:', err?.message || err);
    }
    return false;
  }
}

export { isDbConnected };
