/**
 * Track Order Page
 * 
 * Allows customers to track orders without logging in
 * Uses order number + email verification
 */

import { requireTenant } from '@/lib/tenant-context/server';
import TrackOrderClient from './track-order-client';
import StorefrontHeader from '@/components/storefront/header';
import StorefrontFooter from '@/components/storefront/footer';

export default async function TrackOrderPage() {
  const tenant = await requireTenant();

  if (!tenant) {
    return <div>Store not found</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <main className="flex-1">
        <TrackOrderClient />
      </main>
      <StorefrontFooter />
    </div>
  );
}

