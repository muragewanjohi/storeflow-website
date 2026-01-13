/**
 * Storefront Layout
 * 
 * Shared layout for all customer-facing storefront pages
 * Includes header, footer, and theme provider
 */

import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
