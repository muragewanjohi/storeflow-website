/**
 * Homepage
 * 
 * Renders the tenant's homepage using page builder sections or default content
 * 
 * Day 30: Tenant Storefront - Homepage
 */

import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { SectionRenderer } from '@/components/content/page-builder/section-templates';
import { PageBuilderData } from '@/lib/content/page-builder-types';
import HomepageClient from './homepage-client';
import StorefrontHeader from '@/components/storefront/header';
import StorefrontFooter from '@/components/storefront/footer';
import { generateStorefrontMetadata } from '@/lib/seo/storefront-metadata';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await requireTenant();
  return generateStorefrontMetadata({
    tenant,
    title: 'Home',
    description: `Welcome to ${tenant.name || tenant.subdomain}. Shop our amazing products and discover great deals.`,
    url: '/',
  });
}

export default async function HomePage() {
  const tenant = await requireTenant();

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
                .sort((a, b) => a.order - b.order)
                .map((section) => (
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
  const featuredProducts = featuredProductsRaw.map((product) => ({
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
    </div>
  );
}
