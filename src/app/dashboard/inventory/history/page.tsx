/**
 * Inventory History Page
 * 
 * Shows all inventory adjustment history
 * 
 * Day 17: Inventory & Stock Management
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import InventoryHistoryClient from './inventory-history-client';

export default async function InventoryHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const limit = typeof params.limit === 'string' ? parseInt(params.limit, 10) : 20;
  const productId = typeof params.product_id === 'string' ? params.product_id : undefined;
  const variantId = typeof params.variant_id === 'string' ? params.variant_id : undefined;
  const adjustmentType = typeof params.adjustment_type === 'string' ? params.adjustment_type : undefined;

  return (
    <InventoryHistoryClient
      initialPage={page}
      initialLimit={limit}
      productId={productId}
      variantId={variantId}
      adjustmentType={adjustmentType}
    />
  );
}

