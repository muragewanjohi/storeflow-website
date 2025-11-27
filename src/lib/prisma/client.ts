import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Minimal logging in development, none in production for performance
  const logLevel: Prisma.LogLevel[] = process.env.PRISMA_LOG_QUERIES === 'true' 
    ? ['query', 'error', 'warn'] 
    : ['error'];
  
  return new PrismaClient({
    log: logLevel,
    // Optimize connection settings for Supabase serverless
    // The connection pool is managed by Supabase PgBouncer
  });
}

// Use singleton pattern to reuse connections
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper for measuring query performance (optional - call explicitly)
export async function measureQuery<T>(
  name: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  const result = await queryFn();
  const duration = Date.now() - start;
  if (duration > 500) {
    console.warn(`[Prisma] Slow query "${name}": ${duration}ms`);
  }
  return result;
}

