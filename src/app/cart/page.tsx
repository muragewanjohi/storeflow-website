/**
 * Shopping Cart Page
 * 
 * Public-facing shopping cart with item management and checkout
 * 
 * Day 31: Tenant Storefront - Shopping Cart
 */

import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { getTenant } from '@/lib/tenant-context/server';
import CartClient from './cart-client';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const tenant = await getTenant();
  if (!tenant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Store not found</h1>
        <p className="text-muted-foreground">The store you&apos;re looking for doesn&apos;t exist or is no longer available.</p>
      </div>
    );
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

