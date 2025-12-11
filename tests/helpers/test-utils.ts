/**
 * Test Utilities
 * Shared utilities for testing across the application
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

/**
 * Create a test Prisma client
 */
export function createTestPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  });
}

/**
 * Create a test Supabase client
 */
export function createTestSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'
  );
}

/**
 * Generate a random string for testing
 */
export function randomString(length = 10): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Generate a random email for testing
 */
export function randomEmail(): string {
  return `test-${randomString()}@example.com`;
}

/**
 * Generate a random UUID for testing
 */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Clean up test data
 */
export async function cleanupTestData(prisma: PrismaClient, tenantId: string) {
  // Delete in reverse order of dependencies
  // First get all order IDs for this tenant
  const orders = await prisma.orders.findMany({
    where: { tenant_id: tenantId },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);
  
  // Delete order_products for these orders
  if (orderIds.length > 0) {
    await prisma.order_products.deleteMany({ where: { order_id: { in: orderIds } } });
  }
  
  await prisma.orders.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.cart_items.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.products.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.customers.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.tenants.delete({ where: { id: tenantId } });
}

/**
 * Create a test tenant
 */
export async function createTestTenant(prisma: PrismaClient, data?: Partial<any>) {
  return prisma.tenants.create({
    data: {
      subdomain: `test-${randomString()}`,
      name: `Test Store ${randomString()}`,
      status: 'active',
      ...data,
    },
  });
}

/**
 * Create a test product
 */
export async function createTestProduct(
  prisma: PrismaClient,
  tenantId: string,
  data?: Partial<any>
) {
  return prisma.products.create({
    data: {
      tenant_id: tenantId,
      name: `Test Product ${randomString()}`,
      description: 'Test product description',
      price: 99.99,
      stock_quantity: 100,
      status: 'active',
      ...data,
    },
  });
}

/**
 * Mock request headers with tenant context
 */
export function createMockRequestHeaders(tenantId: string, subdomain?: string) {
  return {
    'x-tenant-id': tenantId,
    'x-tenant-subdomain': subdomain || `test-${randomString()}`,
    'x-tenant-name': 'Test Store',
    host: subdomain ? `${subdomain}.dukanest.com` : 'localhost:3000',
  };
}

