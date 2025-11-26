import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  // Only log queries if explicitly enabled via environment variable
  const logLevel: Prisma.LogLevel[] = process.env.PRISMA_LOG_QUERIES === 'true' 
    ? ['query', 'error', 'warn'] 
    : process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error'];
  
  return new PrismaClient({
    log: logLevel,
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pool optimization - like Amazon/Shopify
    // These settings help with connection reuse and performance
    // Note: Supabase connection pooling is handled at the URL level
  }).$extends({
    query: {
      $allOperations: async ({ operation, model, args, query }) => {
        const start = Date.now();
        const result = await query(args);
        const end = Date.now();
        if (end - start > 1000) {
          console.warn(`[Prisma] Slow query on ${model}.${operation}: ${end - start}ms`);
        }
        return result;
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

