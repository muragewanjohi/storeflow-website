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
  const user = await requireAuthOrRedirect('/dashboard/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/dashboard/login');

  // Verify user belongs to current tenant
  let tenant = await requireTenant();
  if (user.tenant_id !== tenant.id && user.role !== 'landlord') {
    if (!user.tenant_id) {
      redirect('/dashboard/login');
    }

    const userTenant = await prisma.tenants.findUnique({
      where: { id: user.tenant_id },
    });

    if (!userTenant) {
      redirect('/dashboard/login');
    }

    console.warn('[Dashboard Page] Tenant mismatch recovered', {
      resolvedTenantId: tenant.id,
      userTenantId: user.tenant_id,
      userId: user.id,
    });

    tenant = {
      ...userTenant,
      status: userTenant.status ?? 'active',
      created_at: userTenant.created_at ?? new Date(),
      updated_at: userTenant.updated_at ?? new Date(),
      data: (userTenant.data as Record<string, unknown> | null) ?? null,
    } as typeof tenant;
  }

  // Check if tenant is newly created (within last 24 hours)
  const isNewTenant = tenant.created_at && 
    new Date(tenant.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;

  // Get tenant plan info if exists
  let planInfo: { name: string; price: number; duration_months: number; trial_days: number | null } | null = null;
  if (tenant.plan_id) {
    const plan = await prisma.price_plans.findUnique({
      where: { id: tenant.plan_id },
      select: {
        name: true,
        price: true,
        duration_months: true,
        trial_days: true,
      },
    });
    if (plan) {
      planInfo = {
        name: plan.name,
        price: Number(plan.price),
        duration_months: plan.duration_months,
        trial_days: plan.trial_days,
      };
    }
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
  const storeUrl = tenant.custom_domain
    ? `https://${tenant.custom_domain}`
    : `https://${tenant.subdomain}.${baseDomain}`;

  return (
    <DashboardClient
      tenantName={tenant.name || tenant.subdomain}
      isNewTenant={isNewTenant}
      planInfo={planInfo}
      subdomain={tenant.subdomain}
      userName={user.email}
      storeUrl={storeUrl}
      tenantStatus={tenant.status || 'active'}
      expireDate={tenant.expire_date ? (typeof tenant.expire_date === 'string' ? tenant.expire_date : tenant.expire_date.toISOString()) : null}
      startDate={tenant.start_date ? (typeof tenant.start_date === 'string' ? tenant.start_date : tenant.start_date.toISOString()) : null}
    />
  );
}

