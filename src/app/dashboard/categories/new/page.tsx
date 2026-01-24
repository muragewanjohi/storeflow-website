/**
 * Create Category Page
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import CategoryFormClient from '../category-form-client';

export const dynamic = 'force-dynamic';

export default async function CreateCategoryPage() {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Fetch parent categories directly from database (more reliable than HTTP fetch)
  const parentCategoriesRaw = await prisma.categories.findMany({
    where: {
      tenant_id: tenant.id,
      parent_id: null, // Only top-level categories as potential parents
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Map to ensure non-null slugs for the client component
  const parentCategories = parentCategoriesRaw.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug || '',
    status: cat.status,
  }));

  return <CategoryFormClient parentCategories={parentCategories} />;
}

