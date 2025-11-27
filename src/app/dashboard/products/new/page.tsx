/**
 * Create Product Page
 * 
 * Form for creating a new product
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import ProductFormClient from '../product-form-client';

export const dynamic = 'force-dynamic';

export default async function CreateProductPage() {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Fetch categories for dropdown using direct database query
  const categories = await prisma.categories.findMany({
    where: {
      tenant_id: tenant.id,
      parent_id: null, // Only top-level categories for dropdown
    },
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return <ProductFormClient categories={categories} />;
}

