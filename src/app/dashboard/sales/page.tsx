/**
 * Sales Management Page
 * 
 * Lists all sales for the tenant with filtering and search
 * Only accessible to tenant_admin and tenant_staff
 * 
 * Phase 3: Dashboard UI - Sales Implementation
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import SalesListClient from './sales-list-client';

export const dynamic = 'force-dynamic';

export default async function SalesPage({
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
  const is_featured = typeof params.is_featured === 'string' && params.is_featured !== 'all' 
    ? params.is_featured === 'true' 
    : undefined;

  // Fetch sales directly from database
  let sales: any[] = [];
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
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { slug: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Status filter - only apply if explicitly set and not 'all'
    // If no status filter, show all statuses (draft, active, scheduled, ended)
    if (status && status !== 'all') {
      where.status = status;
    }
    // Note: If status is 'all' or undefined, we don't filter by status, showing all sales

    // Featured filter
    if (is_featured !== undefined) {
      where.is_featured = is_featured;
    }

    // Calculate pagination
    const skip = (pageNum - 1) * limitNum;

    // Fetch sales with pagination
    sales = await prisma.sales.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        banner_image: true,
        badge_text: true,
        badge_color: true,
        start_date: true,
        end_date: true,
        status: true,
        is_featured: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            product_sales: true,
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.sales.count({ where });

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
    console.error('Error fetching sales:', error);
    dbError = 'Failed to load sales. Please try again later.';
  }

  return (
    <SalesListClient
      initialSales={sales}
      initialPagination={pagination}
      dbError={dbError}
      currentSearchParams={{
        page: pageNum,
        limit: limitNum,
        search: search || '',
        status: status || 'all',
        is_featured: is_featured !== undefined ? String(is_featured) : 'all',
      }}
    />
  );
}
