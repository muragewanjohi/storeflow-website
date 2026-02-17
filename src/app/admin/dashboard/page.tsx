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

  // Fetch tenant statistics (exclude demo stores)
  const demoStoreFilter = {
    NOT: {
      OR: [
        { data: { path: ['isDemo'], equals: true } },
        { data: { path: ['is_demo'], equals: true } },
      ],
    },
  };

  const [totalTenants, activeTenants] = await Promise.all([
    prisma.tenants.count({ where: demoStoreFilter }),
    prisma.tenants.count({
      where: { status: 'active', ...demoStoreFilter },
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

