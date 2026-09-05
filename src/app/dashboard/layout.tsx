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
import { prisma } from '@/lib/prisma/client';

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
  console.log('[Dashboard Layout] ========================================');
  console.log('[Dashboard Layout] Checking authentication for pathname:', pathname);
  console.log('[Dashboard Layout] Request headers:', {
    pathname,
    userAgent: headersList.get('user-agent')?.substring(0, 50),
  });
  
  let user;
  try {
    user = await requireAuthOrRedirect('/dashboard/login');
    console.log('[Dashboard Layout] ✅ User authenticated:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    });
    
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/dashboard/login');
    console.log('[Dashboard Layout] ✅ Role check passed');
  } catch (error: any) {
    console.error('[Dashboard Layout] ❌ Auth check failed:', {
      error: error?.message,
      stack: error?.stack,
    });
    // The requireAuthOrRedirect will redirect, but log the error first
    throw error;
  }

  // Get tenant context
  let tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    if (!user.tenant_id) {
      redirect('/dashboard/login');
    }

    const userTenant = await prisma.tenants.findUnique({
      where: { id: user.tenant_id },
    });

    if (!userTenant) {
      redirect('/dashboard/login');
    }

    console.warn('[Dashboard Layout] Tenant mismatch recovered', {
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

  // Check tenant access restrictions
  const accessRestriction = getTenantAccessRestriction(tenant);
  const userMetadata = (user.metadata ?? {}) as Record<string, unknown>;
  const metadataName =
    typeof userMetadata.name === 'string'
      ? userMetadata.name
      : typeof userMetadata.full_name === 'string'
        ? userMetadata.full_name
        : '';
  const shouldShowProfilePrompt = userMetadata.profile_completed === false || metadataName.trim().length === 0;

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
      shouldShowProfilePrompt={shouldShowProfilePrompt}
      profileName={metadataName}
    >
      {children}
    </DashboardLayoutClient>
  );
}

