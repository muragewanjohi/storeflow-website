/**
 * Tenants List Page
 * 
 * Displays all tenants for the landlord admin
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import TenantsListClient from './tenants-list-client';

export default async function TenantsPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  // Fetch all tenants
  const tenants = await prisma.tenants.findMany({
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
    },
  });

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

