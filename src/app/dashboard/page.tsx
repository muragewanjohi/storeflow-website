/**
 * Tenant Dashboard (Protected Route)
 * 
 * Modern e-commerce dashboard - similar to Shopify
 * Shows key metrics, charts, recent orders, and alerts
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import DashboardClient from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function TenantDashboardPage() {
  // Redirect to login if not authenticated or not tenant admin/staff
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Verify user belongs to current tenant
  const tenant = await requireTenant();
  if (user.tenant_id !== tenant.id && user.role !== 'landlord') {
    redirect('/login');
  }

  // Check if tenant is newly created (within last 24 hours)
  const isNewTenant = tenant.created_at && 
    new Date(tenant.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;

  // Get tenant plan info if exists
  let planInfo: { name: string; price: number; duration_months: number } | null = null;
  if (tenant.plan_id) {
    const plan = await prisma.price_plans.findUnique({
      where: { id: tenant.plan_id },
      select: {
        name: true,
        price: true,
        duration_months: true,
      },
    });
    if (plan) {
      planInfo = {
        name: plan.name,
        price: Number(plan.price),
        duration_months: plan.duration_months,
      };
    }
  }

  return (
    <DashboardClient
      tenantName={tenant.name || tenant.subdomain}
      isNewTenant={isNewTenant}
      planInfo={planInfo}
      subdomain={tenant.subdomain}
      userName={user.email}
    />
  );
}

