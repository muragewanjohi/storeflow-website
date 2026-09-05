/**
 * Admin Dashboard (Protected Route)
 * 
 * Landlord admin dashboard - requires landlord role
 */

import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BuildingOfficeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import AdminDashboardClient from './admin-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  // Fetch all tenants and filter out demo stores in JS
  // (Prisma JSON path filtering on the `data` column is unreliable across DB engines)
  const allTenants = await prisma.tenants.findMany({
    select: { status: true, data: true },
  });

  const regularTenants = allTenants.filter((t) => {
    const d = t.data as Record<string, unknown> | null;
    return !(d?.is_demo === true || d?.isDemo === true);
  });

  const totalTenants = regularTenants.length;
  const activeTenants = regularTenants.filter((t) => t.status === 'active').length;

  return (
    <AdminDashboardClient 
      user={user}
      totalTenants={totalTenants}
      activeTenants={activeTenants}
    />
  );
}

