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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExclamationTriangleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { redirect } from 'next/navigation';

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

  // Show expiration notice for expired tenants (grace period)
  const showExpirationNotice = tenant.status === 'expired' && accessRestriction.level === 'read-only';

  return (
    <ThemeProviderWrapper>
      <div className="min-h-screen bg-background flex flex-col">
        <StorefrontHeader />
        {showExpirationNotice && (
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950 m-4 mb-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">
                Store Temporarily Unavailable
              </p>
              <p className="text-sm mt-1">
                This store&apos;s subscription has expired. 
                {accessRestriction.daysRemaining !== undefined && (
                  <> Grace period ends in {accessRestriction.daysRemaining} day{accessRestriction.daysRemaining !== 1 ? 's' : ''}. </>
                )}
                Please check back soon or contact the store owner.
              </p>
            </AlertDescription>
          </Alert>
        )}
        <main className="flex-1">
          {children}
        </main>
        <StorefrontFooter />
      </div>
    </ThemeProviderWrapper>
  );
}
