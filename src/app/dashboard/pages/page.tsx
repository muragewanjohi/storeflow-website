/**
 * Pages Management Page
 * 
 * Lists all pages for the tenant with filtering and search
 * Only accessible to tenant_admin and tenant_staff
 */

import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import PagesListClient from './pages-list-client';

export default async function PagesPage({
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

  // Build query string
  const queryParams = new URLSearchParams();
  if (page > 1) queryParams.set('page', page.toString());
  if (limit !== 20) queryParams.set('limit', limit.toString());
  if (search) queryParams.set('search', search);
  if (status) queryParams.set('status', status);

  // Use API route for pages
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const pagesUrl = `${baseUrl}/api/pages?${queryParams.toString()}`;
  
  let pages: any[] = [];
  let pagination: any = null;
  let dbError: string | null = null;

  try {
    // Check if this is a refresh request (cache busting)
    const isRefresh = typeof params.refresh === 'string';
    
    const pagesResponse = await fetch(pagesUrl, {
      headers: {
        'Cookie': `tenant-subdomain=${tenant.subdomain}`,
      },
      // Completely bypass cache on refresh, use shorter cache otherwise
      ...(isRefresh 
        ? { cache: 'no-store' as const }
        : { next: { revalidate: 5 } }
      ),
    });

    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      pages = pagesData.pages || [];
      pagination = pagesData.pagination || null;
    } else {
      const errorData = await pagesResponse.json().catch(() => ({}));
      if (pagesResponse.status === 500 && errorData.error?.includes('database')) {
        dbError = 'Unable to connect to the database. Please check your database connection.';
      }
    }
  } catch (error) {
    console.error('Error fetching pages:', error);
    dbError = 'Failed to load pages. Please try again later.';
  }

  return (
    <PagesListClient
      initialPages={pages}
      initialPagination={pagination}
      dbError={dbError}
      currentSearchParams={{
        page,
        limit,
        search: search || '',
        status: status || '',
      }}
    />
  );
}

