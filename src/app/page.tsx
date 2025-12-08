/**
 * Homepage
 * 
 * Renders either:
 * - Marketing landing page (if no tenant or marketing site)
 * - Tenant's homepage using page builder sections or default content
 * 
 * Day 30: Tenant Storefront - Homepage
 */

import { getTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { SectionRenderer } from '@/components/content/page-builder/section-templates';
import { PageBuilderData } from '@/lib/content/page-builder-types';
import HomepageClient from './homepage-client';
import StorefrontHeader from '@/components/storefront/header';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';
import { generateStorefrontMetadata } from '@/lib/seo/storefront-metadata';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
// Lazy load marketing landing page (large component) - using client wrapper
import MarketingLandingPageWrapper from '@/components/marketing/landing-page-wrapper';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  
  // If no tenant, show marketing site metadata
  if (!tenant) {
    return {
      title: 'StoreFlow - Multi-Tenant Ecommerce Platform',
      description: 'Start Your Store. Grow Your Business. It\'s That Simple. Build and scale your online store with StoreFlow\'s powerful ecommerce platform.',
      openGraph: {
        title: 'StoreFlow - Multi-Tenant Ecommerce Platform',
        description: 'Start Your Store. Grow Your Business. It\'s That Simple.',
        type: 'website',
      },
    };
  }
  
  return generateStorefrontMetadata({
    tenant,
    title: 'Home',
    description: `Welcome to ${tenant.name || tenant.subdomain}. Shop our amazing products and discover great deals.`,
    url: '/',
  });
}

export default async function HomePage() {
  // Check if this is a marketing site by checking if tenant headers were set
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id');
  const hostname = headersList.get('host') || '';
  
  // If no tenant ID in headers, check if it's a marketing site hostname
  if (!tenantId) {
    const hostnameWithoutPort = hostname.split(':')[0];
    
    // Check if DEFAULT_TENANT_SUBDOMAIN is set (not undefined, null, or empty)
    const hasDefaultTenant = process.env.DEFAULT_TENANT_SUBDOMAIN && 
                             process.env.DEFAULT_TENANT_SUBDOMAIN.trim() !== '';
    
    const isMarketingSite = 
      hostnameWithoutPort === 'www' ||
      hostnameWithoutPort === 'marketing' ||
      (hostnameWithoutPort === 'localhost' && !hasDefaultTenant) ||
      hostnameWithoutPort === '127.0.0.1' ||
      hostnameWithoutPort.includes('storeflow') ||
      hostnameWithoutPort === process.env.MARKETING_DOMAIN?.split(':')[0];
    
    // If it's a marketing site, show marketing landing page
    if (isMarketingSite) {
      return <MarketingLandingPageWrapper />;
    }
    
    // If not marketing site and no tenant, show not found
    return <div>Store not found</div>;
  }
  
  // Get tenant if tenant ID exists in headers
  const tenant = await getTenant();
  
  if (!tenant) {
    return <div>Store not found</div>;
  }

  // Try to find a homepage page (could be marked as homepage or slug = 'home')
  const homepage = await prisma.pages.findFirst({
    where: {
      tenant_id: tenant.id,
      status: 'published',
      OR: [
        { slug: 'home' },
        { slug: '' },
      ],
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  // If homepage exists and has page builder content, render it
  if (homepage?.content) {
    try {
      const pageData: PageBuilderData = JSON.parse(homepage.content);
      if (pageData.sections && pageData.sections.length > 0) {
        return (
          <div className="min-h-screen flex flex-col">
            <StorefrontHeader />
            <main className="flex-1">
              {pageData.sections
                .sort((a: any, b: any) => a.order - b.order)
                .map((section: any) => (
                  <SectionRenderer key={section.id} section={section} isPreview={false} />
                ))}
            </main>
            <StorefrontFooter />
          </div>
        );
      }
    } catch {
      // If JSON parsing fails, fall back to default homepage
    }
  }

  // Default homepage with featured products
  const featuredProductsRaw = await prisma.products.findMany({
    where: {
      tenant_id: tenant.id,
      status: 'active',
    },
    take: 8,
    orderBy: {
      created_at: 'desc',
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      image: true,
      stock_quantity: true,
    },
  });

  // Convert Decimal to number for client components
  const featuredProducts = featuredProductsRaw.map((product: any) => ({
    ...product,
    price: Number(product.price),
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <main className="flex-1">
        <HomepageClient featuredProducts={featuredProducts} tenantName={tenant.name} />
      </main>
      <StorefrontFooter />
      <ThemeProviderWrapper>
        <></>
      </ThemeProviderWrapper>
    </div>
  );
}
