/**
 * Tenant Subscription Management Page
 * 
 * Allows tenants to view their current subscription, usage, and upgrade options
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import TenantSubscriptionClient from './tenant-subscription-client';

export const dynamic = 'force-dynamic';

export default async function TenantSubscriptionPage() {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Fetch tenant with scheduled plan fields
  const tenantWithScheduled = await prisma.tenants.findUnique({
    where: { id: tenant.id },
    select: {
      id: true,
      scheduled_plan_id: true,
      scheduled_plan_change_date: true,
    },
  });

  // Fetch current plan, scheduled plan (if downgrade scheduled), and available plans
  const [currentPlanData, scheduledPlanData, availablePlansData, usage] = await Promise.all([
    tenant.plan_id
      ? prisma.price_plans.findUnique({
          where: { id: tenant.plan_id },
        })
      : null,
    tenantWithScheduled?.scheduled_plan_id
      ? prisma.price_plans.findUnique({
          where: { id: tenantWithScheduled.scheduled_plan_id },
        })
      : null,
    prisma.price_plans.findMany({
      where: { status: 'active' },
      orderBy: { price: 'asc' },
    }),
    // Get usage statistics
    Promise.all([
      prisma.products.count({ where: { tenant_id: tenant.id } }),
      prisma.orders.count({ where: { tenant_id: tenant.id } }),
      prisma.pages.count({ where: { tenant_id: tenant.id } }),
      prisma.blogs.count({ where: { tenant_id: tenant.id } }),
      prisma.customers.count({ where: { tenant_id: tenant.id } }),
    ]),
  ]);

  // Convert Prisma Decimal to number for client component
  const currentPlan = currentPlanData
    ? {
        ...currentPlanData,
        price: Number(currentPlanData.price),
      }
    : null;

  const availablePlans = availablePlansData.map((plan: any) => ({
    ...plan,
    price: Number(plan.price),
  }));

  const scheduledPlan = scheduledPlanData
    ? {
        ...scheduledPlanData,
        price: Number(scheduledPlanData.price),
      }
    : null;

  const usageStats = {
    products: usage[0],
    orders: usage[1],
    pages: usage[2],
    blogs: usage[3],
    customers: usage[4],
  };

  // Get plan limits
  let planLimits: any = {};
  if (currentPlan?.features) {
    const features = currentPlan.features as any;
    planLimits = {
      max_products: features.max_products ?? features.product_permission_feature ?? null,
      max_orders: features.max_orders ?? null,
      max_pages: features.max_pages ?? features.page_permission_feature ?? null,
      max_blogs: features.max_blogs ?? features.blog_permission_feature ?? null,
      max_customers: features.max_customers ?? null,
      max_storage_mb: features.max_storage_mb ?? features.storage_permission_feature ?? null,
    };
  }

  return (
    <TenantSubscriptionClient
      tenant={tenant}
      currentPlan={currentPlan}
      scheduledPlan={scheduledPlan}
      scheduledPlanChangeDate={tenantWithScheduled?.scheduled_plan_change_date || null}
      availablePlans={availablePlans}
      usageStats={usageStats}
      planLimits={planLimits}
    />
  );
}

