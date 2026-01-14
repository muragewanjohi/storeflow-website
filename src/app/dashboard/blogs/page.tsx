/**
 * Blogs Management Page
 * 
 * Lists all blogs for the tenant with filtering and search
 * Only accessible to tenant_admin and tenant_staff
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import BlogsListClient from './blogs-list-client';

export const dynamic = 'force-dynamic';

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    return null; // Will redirect via requireAuthOrRedirect
  }

  // Parse search params
  const params = await searchParams;
  const pageNum = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const limitNum = typeof params.limit === 'string' ? parseInt(params.limit, 10) : 20;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const category_id = typeof params.category_id === 'string' ? params.category_id : undefined;

  // Fetch blogs directly from database (matching pages pattern)
  let blogs: any[] = [];
  let pagination: any = null;
  let dbError: string | null = null;

  try {
    // Build where clause
    const where: any = {
      tenant_id: tenant.id,
    };

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { slug: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Category filter
    if (category_id) {
      where.category_id = category_id;
    }

    // Calculate pagination
    const skip = (pageNum - 1) * limitNum;

    // Fetch blogs with pagination
    blogs = await prisma.blogs.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        blog_categories: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.blogs.count({ where });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);
    pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    };
  } catch (error) {
    console.error('Error fetching blogs:', error);
    dbError = 'Failed to load blogs. Please try again later.';
  }

  // Fetch categories for filter
  let categories: any[] = [];
  try {
    categories = await prisma.blog_categories.findMany({
      where: {
        tenant_id: tenant.id,
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
  } catch (error) {
    console.error('Error fetching categories:', error);
  }

  return (
    <BlogsListClient
      initialBlogs={blogs}
      initialPagination={pagination}
      categories={categories}
      dbError={dbError}
      currentSearchParams={{
        page: pageNum,
        limit: limitNum,
        search: search || '',
        status: status || '',
        category_id: category_id || '',
      }}
    />
  );
}

