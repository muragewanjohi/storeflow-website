/**
 * Storefront Header Server Wrapper
 * 
 * Server component that fetches store settings and passes them to the client header
 */

import { getTenant } from '@/lib/tenant-context/server';
import { getStaticOptions } from '@/lib/settings/static-options';
import StorefrontHeader from './header';

export default async function StorefrontHeaderServer() {
  const tenant = await getTenant();
  
  if (!tenant) {
    // Fallback to default if no tenant
    return <StorefrontHeader storeName="DukaNest" storeLogo={null} />;
  }

  // Fetch store settings
  const settings = await getStaticOptions(tenant.id, ['store_logo']);
  
  // Use tenant name as store name (from tenants table)
  // Store logo comes from static_options
  const storeName = tenant.name || tenant.subdomain || 'DukaNest';
  const storeLogo = settings.store_logo || null;

  return <StorefrontHeader storeName={storeName} storeLogo={storeLogo} />;
}

