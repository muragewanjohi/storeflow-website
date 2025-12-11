/**
 * Performance Tests: API Response Times
 */

import { performance } from 'perf_hooks';
import { createMocks } from 'node-mocks-http';
import { GET } from '@/app/api/products/route';
import { createTestPrismaClient, createTestTenant, cleanupTestData } from '../helpers/test-utils';

const prisma = createTestPrismaClient();
let dbAvailable = false;

describe('API Performance', () => {
  let testTenant: any;

  beforeAll(async () => {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      dbAvailable = true;
      testTenant = await createTestTenant(prisma);
    } catch (error) {
      console.warn('Database not available, skipping performance tests');
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      if (testTenant) {
        await cleanupTestData(prisma, testTenant.id);
      }
      await prisma.$disconnect();
    }
  });

  describe('Products API Performance', () => {
    (dbAvailable ? it : it.skip)('should respond within 200ms for product list', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'x-tenant-id': testTenant.id,
          'x-tenant-subdomain': testTenant.subdomain,
        },
      });

      const startTime = performance.now();
      await GET(req as any);
      const endTime = performance.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(200); // 200ms threshold
    });

    (dbAvailable ? it : it.skip)('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, () =>
        createMocks({
          method: 'GET',
          headers: {
            'x-tenant-id': testTenant.id,
            'x-tenant-subdomain': testTenant.subdomain,
          },
        })
      );

      const startTime = performance.now();
      await Promise.all(requests.map(({ req }) => GET(req as any)));
      const endTime = performance.now();

      const avgResponseTime = (endTime - startTime) / requests.length;
      expect(avgResponseTime).toBeLessThan(300); // 300ms average for concurrent requests
    });
  });
});

