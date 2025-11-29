/**
 * Server-Side Tenant Utilities
 * 
 * Functions for getting tenant information in server components and API routes
 */

import { headers } from 'next/headers';
import { getTenantFromRequest, type Tenant } from '../tenant-context';

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
    
    // Check if DEFAULT_TENANT_SUBDOMAIN is set (not undefined, null, or empty)
    const hasDefaultTenant = process.env.DEFAULT_TENANT_SUBDOMAIN && 
                             process.env.DEFAULT_TENANT_SUBDOMAIN.trim() !== '';
    
    // Check if this is a marketing site hostname - don't resolve tenant for these
    const isMarketingSite = 
      hostnameWithoutPort === 'www' ||
      hostnameWithoutPort === 'marketing' ||
      (hostnameWithoutPort === 'localhost' && !hasDefaultTenant) ||
      hostnameWithoutPort === '127.0.0.1' ||
      hostnameWithoutPort.includes('storeflow') ||
      hostnameWithoutPort === process.env.MARKETING_DOMAIN?.split(':')[0];
    
    if (isMarketingSite) {
      return null; // Marketing site - no tenant
    }
    
    // Check if tenant ID is already in headers (from middleware)
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

    // Fallback: resolve tenant from hostname (only if not marketing site)
    return await getTenantFromRequest(hostname);
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

