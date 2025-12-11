/**
 * Account Layout
 * 
 * Shared layout for customer account pages with navigation
 */

import { redirect } from 'next/navigation';
import { requireTenant } from '@/lib/tenant-context/server';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import AccountNav from './account-nav';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await requireTenant();
  
  // Check for customer-specific authentication (cookie-based)
  // NOT Supabase auth - only customers who registered and logged in can access
  const customer = await getCurrentCustomer();

  if (!customer) {
    // Redirect to customer login (not tenant login)
    redirect('/customer-login?redirect=/account');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-1">
              <AccountNav />
            </aside>
            
            {/* Main Content */}
            <div className="lg:col-span-3">
              {children}
            </div>
          </div>
        </div>
      </main>
      <StorefrontFooter />
    </div>
  );
}

