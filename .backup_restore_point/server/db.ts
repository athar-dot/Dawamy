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

export async function checkDatabaseConnection(): Promise<boolean> {
  if (isDbConnected) return true;
  try {
    // Quick probe query to check if PostgreSQL is reachable
    await prisma.$queryRaw`SELECT 1`;
    isDbConnected = true;
    console.log('✅ Connected to PostgreSQL database via Prisma successfully.');
    return true;
  } catch (err: any) {
    console.warn('⚠️ PostgreSQL database is currently unreachable or starting up:', err?.message || err);
    isDbConnected = false;
    return false;
  }
}

export { isDbConnected };
