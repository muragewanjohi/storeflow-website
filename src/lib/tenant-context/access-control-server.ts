/**
 * Server-Side Tenant Access Control Utilities
 * 
 * Functions for checking tenant access in API routes and server components
 */

import { requireTenant } from './server';
import { getTenantAccessRestriction, canEditData, canProcessOrders, type TenantAccessRestriction } from './access-control';

/**
 * Require tenant and check if they have edit access
 * Throws error if tenant cannot edit data
 * 
 * Use this in API routes that perform write operations
 * 
 * @throws Error if tenant cannot edit data
 * 
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const tenant = await requireTenant();
 *   await requireEditAccess(tenant);
 *   // Proceed with write operation
 * }
 * ```
 */
export async function requireEditAccess(): Promise<void> {
  const tenant = await requireTenant();
  const canEdit = canEditData(tenant);
  
  if (!canEdit) {
    throw new Error('Write operations are disabled. Your subscription has expired. Please renew to restore full access.');
  }
}

/**
 * Require tenant and check if they can process orders
 * Throws error if tenant cannot process orders
 * 
 * Use this in API routes that process orders
 */
export async function requireOrderProcessingAccess(): Promise<void> {
  const tenant = await requireTenant();
  const canProcess = canProcessOrders(tenant);
  
  if (!canProcess) {
    throw new Error('Order processing is disabled. Your subscription has expired. Please renew to restore full access.');
  }
}

/**
 * Get tenant access restriction (server-side)
 * 
 * @returns Access restriction details
 */
export async function getTenantAccessRestrictionServer(): Promise<TenantAccessRestriction> {
  const tenant = await requireTenant();
  return getTenantAccessRestriction(tenant);
}

