/**
 * Analytics Dashboard Page
 * 
 * Main analytics dashboard with overview metrics, charts, and reports
 * 
 * Day 33: Admin Dashboard - Analytics Dashboard Foundation
 */

import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import AnalyticsDashboardClient from './analytics-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AnalyticsDashboardPage() {
  const user = await requireAuth();
  const tenant = await requireTenant();

  // Fetch tenant's current plan to determine analytics access
  const currentPlan = tenant.plan_id
    ? await prisma.price_plans.findUnique({
        where: { id: tenant.plan_id },
        select: {
          id: true,
          name: true,
          price: true,
        },
      })
    : null;

  return (
    <AnalyticsDashboardClient 
      currentPlanName={currentPlan?.name || null}
    />
  );
}

