/**
 * Tenants List Page
 * 
 * Displays all tenants for the landlord admin
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import TenantsListClient from './tenants-list-client';

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
  const phoneOptions = tenantIds.length
    ? await prisma.static_options.findMany({
        where: {
          tenant_id: { in: tenantIds },
          option_name: 'store_phone',
        },
        select: {
          tenant_id: true,
          option_value: true,
        },
      })
    : [];

  const phoneByTenantId = new Map(
    phoneOptions.map((item) => [item.tenant_id, item.option_value ?? null])
  );

  const tenants = tenantsRaw.map((tenant) => ({
    ...tenant,
    contact_phone: phoneByTenantId.get(tenant.id) ?? null,
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

