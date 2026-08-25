/**
 * Theme Customization Page
 * 
 * Allows tenants to customize their active theme (colors, fonts, layouts)
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import ThemeCustomizeClient from './theme-customize-client';

export const dynamic = 'force-dynamic';

export default async function ThemeCustomizePage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return null;
  }

  // Theme Track B1.4 — resolve the real plan name server-side, same
  // pattern as /dashboard/analytics, so the Custom CSS Pro-gate can render
  // correctly on first paint instead of flashing unlocked-then-locked.
  const currentPlan = tenant.plan_id
    ? await prisma.price_plans.findUnique({
        where: { id: tenant.plan_id },
        select: { name: true },
      })
    : null;

  return <ThemeCustomizeClient currentPlanName={currentPlan?.name || null} />;
}

