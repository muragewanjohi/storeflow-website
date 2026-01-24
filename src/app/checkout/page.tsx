/**
 * Checkout Page
 * 
 * Multi-step checkout flow for completing orders
 * 
 * Day 31: Tenant Storefront - Checkout Flow
 */

import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import { requireTenant } from '@/lib/tenant-context/server';
import { getTenantAccessRestriction } from '@/lib/tenant-context/access-control';
import { getStaticOption } from '@/lib/settings/static-options';
import { redirect } from 'next/navigation';
import CheckoutClient from './checkout-client';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const tenant = await requireTenant();

  if (!tenant) {
    return <div>Store not found</div>;
  }

  // Check tenant access level - block checkout for suspended tenants
  const accessRestriction = getTenantAccessRestriction(tenant);
  
  // Redirect suspended tenants to suspension page
  if (accessRestriction.level === 'restricted' && tenant.status === 'suspended') {
    redirect('/tenant-suspended');
  }

  // Allow both authenticated and guest checkout
  // Guest checkout will require email during checkout process
  // Use getCurrentCustomer to check customer authentication (not tenant admin auth)
  const customer = await getCurrentCustomer();
  
  // Fetch default estimated delivery days for the tenant
  const defaultDeliveryDays = await getStaticOption(tenant.id, 'default_estimated_delivery_days');

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <main className="flex-1">
        <CheckoutClient 
          isAuthenticated={!!customer}
          canProcessOrders={accessRestriction.canProcessOrders}
          accessRestriction={accessRestriction}
          defaultEstimatedDeliveryDays={defaultDeliveryDays ? parseInt(defaultDeliveryDays, 10) : null}
        />
      </main>
      <StorefrontFooter />
    </div>
  );
}

