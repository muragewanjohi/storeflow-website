/**
 * Server-Side Tenant Utilities
 * 
 * Functions for getting tenant information in server components and API routes
 */

import { headers, cookies } from 'next/headers';
import { getTenantFromRequest, type Tenant } from '../tenant-context';
import { createClient } from '@supabase/supabase-js';

/**
 * Get tenant from request headers (set by middleware)
 * 
 * Use this in Server Components and API Routes
 * 
 * @returns Tenant object or null if not found
 * 
 * @example
 * ```tsx
 * // In Server Component
 * export default async function Page() {
 *   const tenant = await getTenant();
 *   if (!tenant) return <NotFound />;
 *   return <div>{tenant.name}</div>;
 * }
 * ```
 */
export async function getTenant(): Promise<Tenant | null> {
  try {
    const headersList = await headers();
    const hostname = headersList.get('host') || '';
    const hostnameWithoutPort = hostname.split(':')[0];
    
    // Check if tenant ID is already in headers (from middleware) - highest priority
    const tenantId = headersList.get('x-tenant-id');
    
    if (tenantId) {
      // Tenant already resolved by middleware
      // Fetch full tenant details to ensure we have all fields (including user_id)
      // This is important for features like email sending that need the admin email
      const fullTenant = await getTenantFromRequest(hostname, false); // Don't use cache to get fresh data
      if (fullTenant) {
        return fullTenant;
      }
      
      // Fallback: return basic info from headers if fetch fails
      return {
        id: tenantId,
        subdomain: headersList.get('x-tenant-subdomain') || '',
        name: headersList.get('x-tenant-name') || '',
        status: 'active',
      } as Tenant;
    }

    // Check if DEFAULT_TENANT_SUBDOMAIN is set (not undefined, null, or empty)
    const hasDefaultTenant = process.env.DEFAULT_TENANT_SUBDOMAIN && 
                             process.env.DEFAULT_TENANT_SUBDOMAIN.trim() !== '';
    
    // Check if this is a marketing site hostname - don't resolve tenant for these
    // Use exact root domain matches only - subdomains like shoes.dukanest.com are tenant sites
    const isMarketingSite = 
      hostnameWithoutPort === 'www' ||
      hostnameWithoutPort === 'marketing' ||
      (hostnameWithoutPort === 'localhost' && !hasDefaultTenant) ||
      hostnameWithoutPort === '127.0.0.1' ||
      hostnameWithoutPort === 'dukanest.com' ||
      hostnameWithoutPort === 'www.dukanest.com' ||
      hostnameWithoutPort === 'storeflow.com' ||
      hostnameWithoutPort === 'www.storeflow.com' ||
      hostnameWithoutPort.includes('vercel.app') ||
      hostnameWithoutPort === process.env.MARKETING_DOMAIN?.split(':')[0];

    // Primary source of truth: hostname for tenant domains.
    // This avoids stale tenant cookie causing cross-tenant mismatch redirects.
    if (!isMarketingSite) {
      return await getTenantFromRequest(hostname);
    }

    // Marketing/root domains may carry tenant context via cookie (e.g. OAuth return).
    const cookieStore = await cookies();
    const tenantSubdomainCookie = cookieStore.get('tenant-subdomain')?.value;
    if (tenantSubdomainCookie) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data: tenant, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('subdomain', tenantSubdomainCookie.toLowerCase())
            .in('status', ['active', 'expired'])
            .maybeSingle();

          if (tenant && !error) {
            return tenant as Tenant;
          }
        }
      } catch (error) {
        console.error('Error resolving tenant from cookie:', error);
      }
    }

    return null; // Marketing site without tenant context
  } catch (error) {
    console.error('Error getting tenant:', error);
    return null;
  }
}

/**
 * Get tenant ID from headers
 * 
 * @returns Tenant ID or null
 */
export async function getTenantId(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get('x-tenant-id');
  } catch (error) {
    console.error('Error getting tenant ID:', error);
    return null;
  }
}

/**
 * Require tenant - throws error if tenant not found
 * 
 * Use this when tenant is required for the page/component
 * 
 * @returns Tenant object (never null)
 * @throws Error if tenant not found
 * 
 * @example
 * ```tsx
 * export default async function Page() {
 *   const tenant = await requireTenant();
 *   // tenant is guaranteed to exist here
 *   return <div>{tenant.name}</div>;
 * }
 * ```
 */
export async function requireTenant(): Promise<Tenant> {
  const tenant = await getTenant();
  
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  
  return tenant;
}

