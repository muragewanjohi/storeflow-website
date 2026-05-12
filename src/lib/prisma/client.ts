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
  
  // During build time on Vercel, DATABASE_URL might not be available
  // Check if we're in build phase
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || 
                       (process.env.VERCEL === '1' && !databaseUrl);
  
  // Prisma 7: Create PostgreSQL connection pool for adapter
  // Prisma Client with engine type "client" REQUIRES an adapter
  // During build, use a dummy URL to create adapter (won't actually connect)
  let pool: Pool;
  let adapter: PrismaPg;
  
  try {
    if (databaseUrl && !isBuildPhase) {
      // Runtime: Use real DATABASE_URL
      pool = new Pool({
        connectionString: databaseUrl,
        max: 10, // Maximum number of clients in the pool
        // Fail fast instead of hanging the root layout / ThemeStylesServer
        connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 8_000,
      });
      adapter = new PrismaPg(pool);
    } else {
      // Build phase: Use dummy URL to satisfy Prisma Client requirement
      // The adapter will be created but won't actually connect during build
      const dummyUrl = 'postgresql://dummy:dummy@localhost:5432/dummy';
      pool = new Pool({
        connectionString: dummyUrl,
        max: 1,
        // Disable connection attempts during build
        connectionTimeoutMillis: 0,
      });
      adapter = new PrismaPg(pool);
    }
  } catch (error) {
    // If pool creation fails during build, create a minimal pool
    // This should rarely happen, but provides a fallback
    console.warn('[Prisma] Pool creation failed, using fallback:', error);
    const dummyUrl = 'postgresql://dummy:dummy@localhost:5432/dummy';
    pool = new Pool({
      connectionString: dummyUrl,
      max: 1,
      connectionTimeoutMillis: 0,
    });
    adapter = new PrismaPg(pool);
  }
  
  return new PrismaClient({
    log: logLevel,
    adapter, // Always provide adapter (required for "client" engine type)
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
