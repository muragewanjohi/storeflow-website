/**
 * Storefront Layout
 * 
 * Shared layout for all customer-facing storefront pages
 * Includes header, footer, and theme provider
 * Handles tenant status checks (expired/suspended)
 */

import { headers } from 'next/headers';
import { getTenant } from '@/lib/tenant-context/server';
import { getTenantAccessRestriction } from '@/lib/tenant-context/access-control';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';
import AnalyticsProvider from '@/components/analytics/analytics-provider';
import { redirect } from 'next/navigation';

// Force dynamic rendering since this layout uses headers() for tenant resolution
export const dynamic = 'force-dynamic';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenant();
  
  // If no tenant, let middleware handle it
  if (!tenant) {
    return (
      <ThemeProviderWrapper>
        <div className="min-h-screen bg-background flex flex-col">
          <StorefrontHeader />
          <main className="flex-1">
            {children}
          </main>
          <StorefrontFooter />
        </div>
      </ThemeProviderWrapper>
    );
  }

  // Check tenant access level
  const accessRestriction = getTenantAccessRestriction(tenant);
  
  // Block suspended tenants from storefront
  if (accessRestriction.level === 'restricted' && tenant.status === 'suspended') {
    redirect('/tenant-suspended');
  }

  return (
    <ThemeProviderWrapper>
      <AnalyticsProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <StorefrontHeader />
          <main className="flex-1">
            {children}
          </main>
          <StorefrontFooter />
        </div>
      </AnalyticsProvider>
    </ThemeProviderWrapper>
  );
}
