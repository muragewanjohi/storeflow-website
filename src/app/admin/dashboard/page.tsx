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

  // Fetch tenant statistics
  const [totalTenants, activeTenants] = await Promise.all([
    prisma.tenants.count(),
    prisma.tenants.count({
      where: { status: 'active' },
    }),
  ]);

  return (
    <AdminDashboardClient 
      user={user}
      totalTenants={totalTenants}
      activeTenants={activeTenants}
    />
  );
}

