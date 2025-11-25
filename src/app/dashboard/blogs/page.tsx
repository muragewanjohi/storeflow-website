/**
 * Blogs Management Page
 * 
 * Lists all blogs for the tenant with filtering and search
 * Only accessible to tenant_admin and tenant_staff
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import BlogsListClient from './blogs-list-client';

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

  // Use API route for blogs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const blogsUrl = `${baseUrl}/api/blogs?${queryParams.toString()}`;
  
  let blogs: any[] = [];
  let pagination: any = null;
  let dbError: string | null = null;

  try {
    // Check if this is a refresh request (cache busting)
    const isRefresh = typeof params.refresh === 'string';
    
    const blogsResponse = await fetch(blogsUrl, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      // Completely bypass cache on refresh, use shorter cache otherwise
      ...(isRefresh 
        ? { cache: 'no-store' as const }
        : { next: { revalidate: 5 } }
      ),
    });

    if (blogsResponse.ok) {
      const blogsData = await blogsResponse.json();
      blogs = blogsData.blogs || [];
      pagination = blogsData.pagination || null;
    } else {
      const errorData = await blogsResponse.json().catch(() => ({}));
      if (blogsResponse.status === 500 && errorData.error?.includes('database')) {
        dbError = 'Unable to connect to the database. Please check your database connection.';
      }
    }
  } catch (error) {
    console.error('Error fetching blogs:', error);
    dbError = 'Failed to load blogs. Please try again later.';
  }

  // Fetch categories for filter
  let categories: any[] = [];
  try {
    const categoriesResponse = await fetch(`${baseUrl}/api/blogs/categories`, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      next: { revalidate: 60 },
    });

    if (categoriesResponse.ok) {
      const categoriesData = await categoriesResponse.json();
      categories = categoriesData.categories || [];
    }
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
        page,
        limit,
        search: search || '',
        status: status || '',
        category_id: category_id || '',
      }}
    />
  );
}

