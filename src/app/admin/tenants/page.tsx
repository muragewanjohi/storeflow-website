/**
 * Tenants List Page
 * 
 * Displays all tenants for the landlord admin
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import TenantsListClient from './tenants-list-client';
import {
  buildGettingStartedProgress,
  GETTING_STARTED_OPTION_NAMES,
} from '@/lib/onboarding/getting-started-progress';

export const dynamic = 'force-dynamic';

export default async function TenantsPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  // Fetch all tenants
  const tenantsRaw = await prisma.tenants.findMany({
    orderBy: {
      created_at: 'desc',
    },
    select: {
      id: true,
      name: true,
      subdomain: true,
      custom_domain: true,
      status: true,
      created_at: true,
      expire_date: true,
      data: true, // Include data field to check for isDemo flag
    },
  });

  const tenantIds = tenantsRaw.map((tenant) => tenant.id);
  const allSettings = tenantIds.length
    ? await prisma.static_options.findMany({
        where: {
          tenant_id: { in: tenantIds },
          option_name: { in: [...GETTING_STARTED_OPTION_NAMES] },
        },
        select: {
          tenant_id: true,
          option_name: true,
          option_value: true,
        },
      })
    : [];

  const productCountsRaw = tenantIds.length
    ? await prisma.products.groupBy({
        by: ['tenant_id'],
        where: {
          tenant_id: { in: tenantIds },
          status: 'active',
          created_by: { not: null },
        },
        _count: { _all: true },
      })
    : [];

  const deliveryZoneCountsRaw = tenantIds.length
    ? await prisma.delivery_zones.groupBy({
        by: ['tenant_id'],
        where: {
          tenant_id: { in: tenantIds },
          is_active: true,
        },
        _count: { _all: true },
      })
    : [];

  const settingsByTenantId = new Map<string, Record<string, string | null>>();
  for (const item of allSettings) {
    const current = settingsByTenantId.get(item.tenant_id) ?? {};
    current[item.option_name] = item.option_value ?? null;
    settingsByTenantId.set(item.tenant_id, current);
  }

  const productCountByTenantId = new Map(
    productCountsRaw.map((item) => [item.tenant_id, item._count._all] as const),
  );

  const deliveryZoneCountByTenantId = new Map(
    deliveryZoneCountsRaw.map((item) => [item.tenant_id, item._count._all] as const),
  );

  const tenants = tenantsRaw.map((tenant) => ({
    ...tenant,
    contact_phone: settingsByTenantId.get(tenant.id)?.store_phone ?? null,
    onboarding_progress_percent: buildGettingStartedProgress({
      productCount: productCountByTenantId.get(tenant.id) ?? 0,
      deliveryZoneCount: deliveryZoneCountByTenantId.get(tenant.id) ?? 0,
      settings: settingsByTenantId.get(tenant.id) ?? {},
    }).progressPercent,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
        <p className="text-muted-foreground mt-2">
          Manage all tenants on the platform
        </p>
      </div>
      <TenantsListClient tenants={tenants} />
    </div>
  );
}

