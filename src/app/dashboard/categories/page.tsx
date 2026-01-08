/**
 * Categories Management Page
 * 
 * Lists all categories for the tenant
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import CategoriesListClient from './categories-list-client';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Fetch categories directly from database (matching blog categories pattern)
  let categories: any[] = [];
  let dbError: string | null = null;

  try {
    categories = await prisma.categories.findMany({
      where: {
        tenant_id: tenant.id,
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        other_categories: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent_id: true,
            status: true,
            image: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    dbError = 'Failed to load categories. Please try again later.';
  }

  return <CategoriesListClient initialCategories={categories} dbError={dbError} />;
}

