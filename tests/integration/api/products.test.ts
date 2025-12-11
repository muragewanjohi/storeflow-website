/**
 * Integration Tests: Products API
 * 
 * Note: These tests require a running database or should be run with database mocks.
 * For CI/CD, use a test database or skip these tests if database is not available.
 */

import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/products/route';
import { createTestPrismaClient, createTestTenant, createTestProduct, cleanupTestData } from '../../helpers/test-utils';

// Check if database is available
const prisma = createTestPrismaClient();
let dbAvailable = false;

// Test database connection
beforeAll(async () => {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch (error) {
    console.warn('Database not available, skipping integration tests');
    dbAvailable = false;
  }
});

describe('/api/products', () => {
  let testTenant: any;

  beforeAll(async () => {
    if (!dbAvailable) {
      return;
    }
    testTenant = await createTestTenant(prisma);
  });

  afterAll(async () => {
    if (testTenant) {
      await cleanupTestData(prisma, testTenant.id);
    }
    if (dbAvailable) {
      await prisma.$disconnect();
    }
  });

  describe('GET /api/products', () => {
    (dbAvailable ? it : it.skip)('should return products for tenant', async () => {
      // Create test product
      const product = await createTestProduct(prisma, testTenant.id);

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'x-tenant-id': testTenant.id,
          'x-tenant-subdomain': testTenant.subdomain,
        },
      });

      await GET(req as any);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(Array.isArray(data.products || data)).toBe(true);
    });

    (dbAvailable ? it : it.skip)('should return 401 if tenant ID is missing', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {},
      });

      await GET(req as any);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('POST /api/products', () => {
    (dbAvailable ? it : it.skip)('should create a new product', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-tenant-id': testTenant.id,
          'x-tenant-subdomain': testTenant.subdomain,
        },
        body: {
          name: 'Test Product',
          description: 'Test description',
          price: 99.99,
          stock_quantity: 100,
          status: 'active',
        },
      });

      await POST(req as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.product || data).toHaveProperty('name', 'Test Product');
    });

    (dbAvailable ? it : it.skip)('should validate required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-tenant-id': testTenant.id,
        },
        body: {
          // Missing required fields
        },
      });

      await POST(req as any);

      expect(res._getStatusCode()).toBe(400);
    });
  });
});

