/**
 * Blog Categories Management Page
 * 
 * Lists all blog categories for the tenant
 */

import { prisma } from '@/lib/prisma/client';
import { requireTenant } from '@/lib/tenant-context/server';
import CategoriesListClient from './categories-list-client';

export default async function BlogCategoriesPage() {
  const tenant = await requireTenant();

  // Fetch categories from database
  let categories: any[] = [];
  let dbError: string | null = null;

  try {
    categories = await prisma.blog_categories.findMany({
      where: {
        tenant_id: tenant.id,
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            blogs: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    dbError = 'Failed to load blog categories. Please try again later.';
  }

  return <CategoriesListClient initialCategories={categories} dbError={dbError} />;
}

