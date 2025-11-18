/**
 * Products Management Page
 * 
 * Lists all products for the tenant with filtering and search
 * Only accessible to tenant_admin and tenant_staff
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import ProductsListClient from './products-list-client';

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
    redirect('/login');
  }

  // Parse search params
  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const limit = typeof params.limit === 'string' ? parseInt(params.limit, 10) : 20;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const category_id = typeof params.category_id === 'string' ? params.category_id : undefined;

  // Build query string
  const queryParams = new URLSearchParams();
  if (page > 1) queryParams.set('page', page.toString());
  if (limit !== 20) queryParams.set('limit', limit.toString());
  if (search) queryParams.set('search', search);
  if (status) queryParams.set('status', status);
  if (category_id) queryParams.set('category_id', category_id);

  // Fetch products
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const productsUrl = `${baseUrl}/api/products?${queryParams.toString()}`;
  
  let products: any[] = [];
  let pagination: any = null;
  let categories: any[] = [];
  let dbError: string | null = null;

  try {
    // Fetch products
    const productsResponse = await fetch(productsUrl, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      cache: 'no-store',
    });

    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      products = productsData.products || [];
      pagination = productsData.pagination || null;
    } else {
      const errorData = await productsResponse.json().catch(() => ({}));
      if (productsResponse.status === 500 && errorData.error?.includes('database')) {
        dbError = 'Unable to connect to the database. Please check your database connection.';
      }
    }

    // Fetch categories for filter dropdown
    const categoriesResponse = await fetch(`${baseUrl}/api/categories`, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      cache: 'no-store',
    });

    if (categoriesResponse.ok) {
      const categoriesData = await categoriesResponse.json();
      categories = categoriesData.categories || [];
    }
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

