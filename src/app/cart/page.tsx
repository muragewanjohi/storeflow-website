/**
 * Shopping Cart Page
 * 
 * Public-facing shopping cart with item management and checkout
 * 
 * Day 31: Tenant Storefront - Shopping Cart
 */

import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import CartClient from './cart-client';
import StorefrontHeader from '@/components/storefront/header';
import StorefrontFooter from '@/components/storefront/footer';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const tenant = await requireTenant();

  if (!tenant) {
    return <div>Store not found</div>;
  }

  // Allow both authenticated and guest users
  // Guest users can view their cart, but will be prompted to login at checkout
  const user = await getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <main className="flex-1">
        <CartClient isAuthenticated={!!user} />
      </main>
      <StorefrontFooter />
    </div>
  );
}

