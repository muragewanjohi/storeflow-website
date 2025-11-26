/**
 * Checkout Page
 * 
 * Multi-step checkout flow for completing orders
 * 
 * Day 31: Tenant Storefront - Checkout Flow
 */

import { getUser } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import CheckoutClient from './checkout-client';
import StorefrontHeader from '@/components/storefront/header';
import StorefrontFooter from '@/components/storefront/footer';

export default async function CheckoutPage() {
  const tenant = await requireTenant();

  if (!tenant) {
    return <div>Store not found</div>;
  }

  // Allow both authenticated and guest checkout
  // Guest checkout will require email during checkout process
  const user = await getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <main className="flex-1">
        <CheckoutClient isAuthenticated={!!user} />
      </main>
      <StorefrontFooter />
    </div>
  );
}

