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
  
  // Default logo from public folder
  const defaultLogo = '/logo_with_name.png';
  
  if (!tenant) {
    // Fallback to default if no tenant
    return <StorefrontHeader storeName="DukaNest" storeLogo={defaultLogo} />;
  }

  // Fetch store settings
  const settings = await getStaticOptions(tenant.id, ['store_logo']);
  
  // Use tenant name as store name (from tenants table)
  // Store logo comes from static_options, fallback to default logo
  const storeName = tenant.name || tenant.subdomain || 'DukaNest';
  // Ensure logo is a valid string (not null, undefined, or empty)
  const storeLogo = (settings.store_logo && settings.store_logo.trim() !== '') 
    ? settings.store_logo.trim() 
    : defaultLogo;

  return <StorefrontHeader storeName={storeName} storeLogo={storeLogo} />;
}

