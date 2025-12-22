import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Minimal logging in development, none in production for performance
  const logLevel: Array<'query' | 'error' | 'warn'> = process.env.PRISMA_LOG_QUERIES === 'true' 
    ? ['query', 'error', 'warn']
    : ['error'];
  
  // Prisma 7: Connection URLs
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Prisma 7: Create PostgreSQL connection pool for adapter
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10, // Maximum number of clients in the pool
  });
  
  // Prisma 7: Use PostgreSQL adapter (required for "client" engine type)
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    log: logLevel,
    adapter,
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

