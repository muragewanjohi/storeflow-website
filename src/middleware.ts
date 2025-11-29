/**
 * Next.js Middleware - Tenant Resolution
 * 
 * This middleware runs on every request and:
 * 1. Extracts hostname from request
 * 2. Resolves tenant from subdomain or custom domain
 * 3. Sets tenant context in headers
 * 4. Handles tenant not found (404)
 * 5. Caches tenant lookup for performance
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTenantFromRequest } from './lib/tenant-context';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Skip middleware for:
  // - API routes (they handle tenant resolution themselves)
  // - Static files
  // - Next.js internal routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Check if this is a marketing site hostname (www, marketing, or main domain)
  const hostnameWithoutPort = hostname.split(':')[0];
  
  // Check if DEFAULT_TENANT_SUBDOMAIN is set (not undefined, null, or empty)
  const hasDefaultTenant = process.env.DEFAULT_TENANT_SUBDOMAIN && 
                           process.env.DEFAULT_TENANT_SUBDOMAIN.trim() !== '';
  
  const isMarketingSite = 
    hostnameWithoutPort === 'www' ||
    hostnameWithoutPort === 'marketing' ||
    (hostnameWithoutPort === 'localhost' && !hasDefaultTenant) ||
    hostnameWithoutPort === '127.0.0.1' ||
    hostnameWithoutPort.includes('storeflow') ||
    hostnameWithoutPort === process.env.MARKETING_DOMAIN?.split(':')[0];

  // Allow marketing site to proceed without tenant
  if (isMarketingSite) {
    return NextResponse.next();
  }

  try {
    // Resolve tenant from hostname
    const tenant = await getTenantFromRequest(hostname);

    if (!tenant) {
      // Tenant not found - redirect to 404 page
      const url = request.nextUrl.clone();
      url.pathname = '/404';
      url.searchParams.set('reason', 'tenant-not-found');
      url.searchParams.set('hostname', hostname);
      return NextResponse.redirect(url);
    }

    // Check if tenant is active
    if (tenant.status !== 'active') {
      const url = request.nextUrl.clone();
      url.pathname = '/tenant-suspended';
      return NextResponse.redirect(url);
    }

    // Check if tenant subscription has expired
    if (tenant.expire_date && new Date(tenant.expire_date) < new Date()) {
      const url = request.nextUrl.clone();
      url.pathname = '/tenant-expired';
      return NextResponse.redirect(url);
    }

    // Clone the request headers and add tenant info
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', tenant.id);
    requestHeaders.set('x-tenant-subdomain', tenant.subdomain);
    requestHeaders.set('x-tenant-name', tenant.name);

    // Create Supabase client for session refresh
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Refresh Supabase auth session if user is authenticated
    // This ensures session stays valid across requests
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Refresh session (this updates cookies if needed)
    await supabase.auth.getSession();

    // Also set response headers (for client-side access)
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-subdomain', tenant.subdomain);

    return response;
  } catch (error) {
    console.error('Middleware error:', error);

    // On error, allow request to proceed (graceful degradation)
    // In production, you might want to redirect to error page
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes handle tenant resolution themselves)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

