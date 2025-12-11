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
import DashboardLayoutClient from '@/components/dashboard/layout-client';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if we're on the login page - skip auth check if so
  // The login page has its own layout, but Next.js still processes parent layouts
  // So we need to check the pathname here to prevent redirect loops
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // If we're on the login page, just render children without auth check
  // The child layout will handle it
  if (pathname === '/dashboard/login' || pathname.startsWith('/dashboard/login')) {
    return <>{children}</>;
  }

  // Require authentication and tenant admin/staff role for all other dashboard pages
  const user = await requireAuthOrRedirect('/dashboard/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/dashboard/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/dashboard/login');
  }

  return <DashboardLayoutClient user={user} tenant={tenant}>{children}</DashboardLayoutClient>;
}

