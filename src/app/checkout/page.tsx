/**
 * Checkout Page
 * 
 * Multi-step checkout flow for completing orders
 * 
 * Day 31: Tenant Storefront - Checkout Flow
 */

import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import { requireTenant } from '@/lib/tenant-context/server';
import CheckoutClient from './checkout-client';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const tenant = await requireTenant();

  if (!tenant) {
    return <div>Store not found</div>;
  }

  // Allow both authenticated and guest checkout
  // Guest checkout will require email during checkout process
  // Use getCurrentCustomer to check customer authentication (not tenant admin auth)
  const customer = await getCurrentCustomer();

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <main className="flex-1">
        <CheckoutClient isAuthenticated={!!customer} />
      </main>
      <StorefrontFooter />
    </div>
  );
}

