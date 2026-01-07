/**
 * Dashboard Layout
 * 
 * Provides consistent navigation and layout for all dashboard pages
 * Note: Login page has its own layout in /dashboard/login/layout.tsx
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getTenantAccessRestriction } from '@/lib/tenant-context/access-control';
import DashboardLayoutClient from '@/components/dashboard/layout-client';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if we're on the login or account recovery page - skip auth check if so
  // These pages have their own layouts, but Next.js still processes parent layouts
  // So we need to check the pathname here to prevent redirect loops
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // If we're on the login or account recovery page, just render children without auth check
  // The child layouts will handle it
  if (pathname === '/dashboard/login' || pathname.startsWith('/dashboard/login') ||
      pathname === '/dashboard/account-recovery' || pathname.startsWith('/dashboard/account-recovery')) {
    return <>{children}</>;
  }

  // Require authentication and tenant admin/staff role for all other dashboard pages
  console.log('[Dashboard Layout] Checking authentication for pathname:', pathname);
  const user = await requireAuthOrRedirect('/dashboard/login');
  console.log('[Dashboard Layout] User authenticated:', {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id,
  });
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/dashboard/login');
  console.log('[Dashboard Layout] Role check passed');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/dashboard/login');
  }

  // Check tenant access restrictions
  const accessRestriction = getTenantAccessRestriction(tenant);

  // Block access if completely restricted (suspended or deleted)
  // Allow read-only access during grace period
  if (accessRestriction.level === 'blocked' || 
      (accessRestriction.level === 'restricted' && tenant.status === 'suspended')) {
    // Allow access to subscription/renewal page even when suspended
    if (pathname !== '/dashboard/subscription' && !pathname.startsWith('/dashboard/subscription/')) {
      redirect('/tenant-suspended');
    }
  }

  return (
    <DashboardLayoutClient 
      user={user} 
      tenant={tenant}
      accessRestriction={accessRestriction}
    >
      {children}
    </DashboardLayoutClient>
  );
}

