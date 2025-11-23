/**
 * Inventory Threshold Utilities
 * 
 * Helper functions for managing low stock threshold settings
 */

import { prisma } from '@/lib/prisma/client';

const DEFAULT_THRESHOLD = 10;

/**
 * Get low stock threshold for a tenant
 * Retrieves from tenant settings, defaults to 10 if not set
 */
export async function getLowStockThreshold(tenantId: string): Promise<number> {
  try {
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { data: true },
    });

    if (tenant?.data && typeof tenant.data === 'object') {
      const settings = tenant.data as any;
      if (typeof settings.lowStockThreshold === 'number') {
        return settings.lowStockThreshold;
      }
    }

    return DEFAULT_THRESHOLD;
  } catch (error) {
    console.error('Error getting low stock threshold:', error);
    return DEFAULT_THRESHOLD;
  }
}

/**
 * Set low stock threshold for a tenant
 */
export async function setLowStockThreshold(
  tenantId: string,
  threshold: number
): Promise<void> {
  try {
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { data: true },
    });

    const currentSettings = (tenant?.data as any) || {};
    const updatedSettings = {
      ...currentSettings,
      lowStockThreshold: threshold,
    };

    await prisma.tenants.update({
      where: { id: tenantId },
      data: { data: updatedSettings },
    });
  } catch (error) {
    console.error('Error setting low stock threshold:', error);
    throw error;
  }
}

