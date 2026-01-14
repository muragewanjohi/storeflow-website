/**
 * Tenant Storefront Layout
 * 
 * Shared layout for tenant-facing storefront pages
 * Includes header, footer, and theme provider
 */

import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';

export default function TenantStorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProviderWrapper>
      <div className="min-h-screen flex flex-col bg-white">
        <StorefrontHeader />
        <main className="flex-1">
          {children}
        </main>
        <StorefrontFooter />
      </div>
    </ThemeProviderWrapper>
  );
}
