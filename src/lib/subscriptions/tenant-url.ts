/**
 * Tenant URL utilities
 * 
 * Builds tenant storefront URLs for payment links and other tenant-specific pages
 */

import type { Tenant } from '@/lib/tenant-context';

/**
 * Get tenant storefront URL (subdomain or custom domain)
 * 
 * @param tenant - Tenant object with subdomain and custom_domain
 * @param path - Path to append (e.g., '/dashboard/subscription')
 * @returns Full URL to tenant's store
 */
export function getTenantStoreUrl(tenant: Tenant, path: string = ''): string {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  
  // Check if tenant has custom domain
  if (tenant.custom_domain) {
    // Use custom domain if available
    return `${protocol}://${tenant.custom_domain}${path}`;
  }
  
  // Use subdomain
  if (tenant.subdomain) {
    // Handle localhost with port for development
    if (process.env.NODE_ENV !== 'production') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const url = new URL(appUrl);
      const port = url.port ? `:${url.port}` : '';
      return `${protocol}://${tenant.subdomain}.${url.hostname}${port}${path}`;
    }
    return `${protocol}://${tenant.subdomain}.${baseDomain}${path}`;
  }
  
  // Fallback to main app URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${appUrl}${path}`;
}

/**
 * Get tenant payment/subscription page URL
 * Points to tenant's store subscription page
 */
export function getTenantPaymentUrl(tenant: Tenant): string {
  return getTenantStoreUrl(tenant, '/dashboard/subscription');
}
