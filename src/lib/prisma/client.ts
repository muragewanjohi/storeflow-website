import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
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

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

