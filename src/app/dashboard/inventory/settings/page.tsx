/**
 * Inventory Settings Page
 * 
 * Configure inventory settings like low stock threshold
 * 
 * Day 17: Inventory & Stock Management
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getLowStockThreshold } from '@/lib/inventory/threshold';
import InventorySettingsClient from './inventory-settings-client';

export const dynamic = 'force-dynamic';

export default async function InventorySettingsPage() {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Get current threshold
  const threshold = await getLowStockThreshold(tenant.id);

  return <InventorySettingsClient initialThreshold={threshold} />;
}

