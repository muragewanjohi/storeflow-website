/**
 * Demo Store Restrictions
 * 
 * Utilities to enforce restrictions on demo stores
 */

import { prisma } from '@/lib/prisma/client';
import { isDemoStore } from './seed-demo-data';

/**
 * Check if a tenant is a demo store and throw error if restricted action is attempted
 */
export async function requireNotDemoStore(tenantId: string, action: string = 'This action'): Promise<void> {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { data: true },
  });

  if (tenant && isDemoStore(tenant)) {
    throw new Error(`${action} is not allowed on demo stores. Demo stores are read-only for visitors.`);
  }
}

/**
 * Check if tenant is demo store (returns boolean, doesn't throw)
 */
export async function checkIsDemoStore(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { data: true },
  });

  return tenant ? isDemoStore(tenant) : false;
}

/**
 * Get demo store banner message
 */
export function getDemoStoreBannerMessage(): string {
  return 'This is a demo store. All products and content are for demonstration purposes only. No real purchases can be made.';
}

