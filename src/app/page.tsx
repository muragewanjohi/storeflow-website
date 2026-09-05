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
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';
import { generateStorefrontMetadata } from '@/lib/seo/storefront-metadata';
import { getStaticOptions } from '@/lib/settings/static-options';
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
      title: 'DukaNest - Multi-Tenant Ecommerce Platform',
      description: 'Start Your Store. Grow Your Business. It\'s That Simple. Build and scale your online store with DukaNest\'s powerful ecommerce platform.',
      openGraph: {
        title: 'DukaNest - Multi-Tenant Ecommerce Platform',
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
      hostnameWithoutPort === 'www.dukanest.com' ||
      hostnameWithoutPort === 'dukanest.com' ||
      (hostnameWithoutPort === 'localhost' && !hasDefaultTenant) ||
      hostnameWithoutPort === '127.0.0.1' ||
      hostnameWithoutPort === 'www.storeflow.com' ||
      hostnameWithoutPort === 'storeflow.com' ||
      hostnameWithoutPort.includes('vercel.app') ||
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

  // Fetch store settings for logo (will be used by header)
  const settings = await getStaticOptions(tenant.id, ['store_logo']);

  // Find this tenant's home page (by slug only — draft or published)
  const homePageAnyStatus = await prisma.pages.findFirst({
    where: {
      tenant_id: tenant.id,
      OR: [
        { slug: 'home' },
        { slug: '' },
      ],
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  // Helper to render homepage from parsed page builder content
  const renderHomeFromContent = (content: string | null | undefined) => {
    if (!content) return null;
    try {
      const pageData: PageBuilderData = JSON.parse(content);
      if (pageData.sections && pageData.sections.length > 0) {
        return (
          <ThemeProviderWrapper>
            <div className="min-h-screen flex flex-col">
              <StorefrontHeader />
              <main className="flex-1">
                {pageData.sections
                  .filter((s: any) => !s.hidden)
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((section: any) => (
                    <SectionRenderer key={section.id} section={section} isPreview={false} />
                  ))}
              </main>
              <StorefrontFooter />
            </div>
          </ThemeProviderWrapper>
        );
      }
    } catch {
      // If JSON parsing fails, return null
    }
    return null;
  };

  // Published home page → show current content (live version)
  if (homePageAnyStatus?.status === 'published' && homePageAnyStatus.content) {
    const rendered = renderHomeFromContent(homePageAnyStatus.content);
    if (rendered) return rendered;
  }

  // Draft home page but we have a previous published version → show that so visitors don't see "updating"
  if (homePageAnyStatus?.status === 'draft' && homePageAnyStatus.published_content) {
    const rendered = renderHomeFromContent(homePageAnyStatus.published_content);
    if (rendered) return rendered;
  }

  // Tenant has a home page in draft and no previous published version → show "updating" message
  if (homePageAnyStatus?.status === 'draft') {
    return (
      <ThemeProviderWrapper>
        <div className="min-h-screen flex flex-col">
          <StorefrontHeader />
          <main className="flex-1 flex items-center justify-center px-4 py-16">
            <div className="text-center max-w-md">
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                We&apos;re updating our homepage
              </h1>
              <p className="text-muted-foreground">
                {tenant.name || 'This store'}&apos;s homepage is being updated. Check back soon.
              </p>
            </div>
          </main>
          <StorefrontFooter />
        </div>
      </ThemeProviderWrapper>
    );
  }

  // No home page exists yet → default homepage with featured products
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
      sale_price: true,
      image: true,
      stock_quantity: true,
    },
  });

  // Fetch rating stats for featured products
  const productIds = featuredProductsRaw.map((p: any) => p.id);
  let ratingMap = new Map<string, { averageRating: number; totalReviews: number }>();
  
  if (productIds.length > 0) {
    try {
      const ratingStats = await prisma.product_reviews.groupBy({
        by: ['product_id'],
        where: {
          product_id: { in: productIds },
          tenant_id: tenant.id,
          status: 'approved',
          rating: { not: null },
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      });

      ratingMap = new Map(
        ratingStats.map((stat: any) => [
          String(stat.product_id),
          {
            averageRating: stat._avg.rating ? Number(stat._avg.rating) : 0,
            totalReviews: stat._count.rating || 0,
          },
        ])
      );
    } catch (error) {
      console.error('Error fetching rating stats for homepage:', error);
    }
  }

  // Convert Decimal to number and add rating data for client components
  const featuredProducts = featuredProductsRaw.map((product: any) => {
    const stats = ratingMap.get(product.id) || { averageRating: 0, totalReviews: 0 };
    return {
      ...product,
      price: Number(product.price),
      sale_price: product.sale_price ? Number(product.sale_price) : null,
      compareAtPrice: product.sale_price ? Number(product.sale_price) : undefined,
      averageRating: stats.averageRating > 0 ? stats.averageRating : undefined,
      totalReviews: stats.totalReviews > 0 ? stats.totalReviews : undefined,
    };
  });

  return (
    <ThemeProviderWrapper>
      <div className="min-h-screen flex flex-col">
        <StorefrontHeader />
        <main className="flex-1">
          <HomepageClient featuredProducts={featuredProducts} tenantName={tenant.name} />
        </main>
        <StorefrontFooter />
      </div>
    </ThemeProviderWrapper>
  );
}
