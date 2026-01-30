/**
 * Storefront Header Server Wrapper
 *
 * Server component that fetches store settings and passes them to the client header.
 * When the tenant is a demo store (data.is_demo or data.isDemo), also renders DemoBanner.
 */

import { getTenant } from '@/lib/tenant-context/server';
import { getStaticOptions } from '@/lib/settings/static-options';
import StorefrontHeader from './header';
import DemoBanner from './demo-banner';

export default async function StorefrontHeaderServer() {
  const tenant = await getTenant();

  // Default logo from public folder
  const defaultLogo = '/logo_with_name.png';

  if (!tenant) {
    return (
      <>
        <StorefrontHeader storeName="DukaNest" storeLogo={defaultLogo} />
      </>
    );
  }

  // Fetch store settings
  const settings = await getStaticOptions(tenant.id, ['store_logo']);

  const storeName = tenant.name || tenant.subdomain || 'DukaNest';
  const storeLogo =
    settings.store_logo && settings.store_logo.trim() !== ''
      ? settings.store_logo.trim()
      : defaultLogo;

  const tenantData = tenant as { data?: { is_demo?: boolean; isDemo?: boolean } };
  const isDemoTenant =
    tenantData.data?.is_demo === true || tenantData.data?.isDemo === true;

  return (
    <>
      <StorefrontHeader storeName={storeName} storeLogo={storeLogo} />
      {isDemoTenant && <DemoBanner />}
    </>
  );
}

