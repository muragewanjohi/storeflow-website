/**
 * Products Management Page
 * 
 * Lists all products for the tenant with filtering and search
 * Only accessible to tenant_admin and tenant_staff
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import ProductsListClient from './products-list-client';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
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
    redirect('/dashboard/login');
  }

  // Parse search params
  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const limit = typeof params.limit === 'string' ? parseInt(params.limit, 10) : 20;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const category_id = typeof params.category_id === 'string' ? params.category_id : undefined;

  // Fetch products and categories directly from database (same pattern as categories page)
  let products: any[] = [];
  let pagination: any = null;
  let categories: any[] = [];
  let dbError: string | null = null;

  try {
    // Build where clause for products
    const where: any = {
      tenant_id: tenant.id,
    };

    // Search filter - Use full-text search if available, fallback to ILIKE
    let useFullTextSearch = false;
    let searchProductIds: string[] = [];
    
    if (search) {
      try {
        // Try full-text search first
        const searchResults = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM products
          WHERE 
            tenant_id = ${tenant.id}::uuid
            AND status = 'active'
            AND search_vector @@ plainto_tsquery('english', ${search})
          ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${search})) DESC
          LIMIT 1000
        `;

        if (searchResults && searchResults.length > 0) {
          searchProductIds = searchResults.map((r: any) => r.id);
          useFullTextSearch = true;
          where.id = { in: searchProductIds };
        } else {
          // Fallback to ILIKE
          where.OR = [
            { name: { contains: search.trim(), mode: 'insensitive' } },
            { description: { contains: search.trim(), mode: 'insensitive' } },
            { sku: { contains: search.trim(), mode: 'insensitive' } },
          ];
        }
      } catch (error) {
        // If full-text search fails, fallback to ILIKE
        console.warn('Full-text search not available, using ILIKE:', error);
        where.OR = [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { description: { contains: search.trim(), mode: 'insensitive' } },
          { sku: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }
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
    const skip = (page - 1) * limit;

    // Fetch products and categories in parallel
    const [productsData, totalCount, categoriesData] = await Promise.all([
      prisma.products.findMany({
        where,
        skip: useFullTextSearch ? 0 : skip,
        take: useFullTextSearch ? 1000 : limit,
        orderBy: {
          created_at: 'desc',
        },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          image: true,
          stock_quantity: true,
          category_id: true,
          status: true,
          created_at: true,
        },
      }),
      prisma.products.count({ where }),
      // Fetch categories directly from database
      prisma.categories.findMany({
        where: {
          tenant_id: tenant.id,
          parent_id: null,
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
    ]);

    // If using full-text search, sort by relevance (order in searchProductIds)
    if (useFullTextSearch && searchProductIds.length > 0) {
      const productMap = new Map(productsData.map((p: any) => [p.id, p]));
      products = searchProductIds
        .map(id => productMap.get(id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .slice(skip, skip + limit);
    } else {
      products = productsData;
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    pagination = {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    categories = categoriesData.map((c: any) => ({
      ...c,
      slug: c.slug || '',
    }));
  } catch (error) {
    console.error('Error fetching products or categories:', error);
    dbError = 'Failed to load products. Please try again later.';
  }

  return (
    <ProductsListClient
      initialProducts={products}
      initialPagination={pagination}
      categories={categories}
      dbError={dbError}
      currentSearchParams={{
        page,
        limit,
        search: search || '',
        status: status || '',
        category_id: category_id || '',
      }}
    />
  );
}

