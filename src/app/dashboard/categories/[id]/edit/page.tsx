/**
 * Edit Category Page
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import CategoryFormClient from '../../category-form-client';

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  const tenant = await requireTenant();

  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch category directly from database (more reliable than HTTP fetch)
  const category = await prisma.categories.findFirst({
    where: {
      id,
      tenant_id: tenant.id,
    },
    include: {
      other_categories: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent_id: true,
          status: true,
        },
      },
      categories: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!category) {
    redirect('/dashboard/categories');
  }

  // Fetch parent categories (excluding current category to prevent self-reference)
  const parentCategoriesRaw = await prisma.categories.findMany({
    where: {
      tenant_id: tenant.id,
      id: { not: id }, // Exclude current category
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
  const mappedCategory = {
    id: category.id,
    name: category.name,
    slug: category.slug || '',
    parent_id: category.parent_id,
    image: category.image,
    status: category.status,
  };

  const parentCategories = parentCategoriesRaw.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug || '',
    status: cat.status,
  }));

  return <CategoryFormClient category={mappedCategory} parentCategories={parentCategories} />;
}

