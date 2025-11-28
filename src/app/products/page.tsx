/**
 * Products Listing Page
 * 
 * Public-facing product listing with search, filters, and pagination
 * 
 * Day 30: Tenant Storefront - Product Listing
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenant-context/server';
import ProductsListingClient from './products-listing-client';
import { prisma } from '@/lib/prisma/client';
import StorefrontHeader from '@/components/storefront/header';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';
import { ErrorState } from '@/components/storefront/error-boundary';
import { generateStorefrontMetadata } from '@/lib/seo/storefront-metadata';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await requireTenant();
  return generateStorefrontMetadata({
    tenant,
    title: 'Products',
    description: `Browse our complete product catalog at ${tenant.name || tenant.subdomain}. Find the perfect products for you.`,
    url: '/products',
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const tenant = await requireTenant();

  if (!tenant) {
    return <div>Store not found</div>;
  }

  // Get initial products
  const params = await searchParams;
  const page = parseInt(params.page as string) || 1;
  const limit = 12;
  const search = (params.search as string) || '';
  const category_id = (params.category as string) || '';
  const sort_by = (params.sort as string) || 'created_at';
  const sort_order = (params.order as string) || 'desc';

  // Build where clause
  const where: any = {
    tenant_id: tenant.id,
    status: 'active', // Only show active products
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category_id) {
    where.category_id = category_id;
  }

  try {
    const [productsRaw, total, categories] = await Promise.all([
      prisma.products.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sort_by]: sort_order,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          image: true,
          stock_quantity: true, // Already synced with variant totals
          category_id: true,
        },
      }),
      prisma.products.count({ where }),
      prisma.categories.findMany({
        where: {
          tenant_id: tenant.id,
          status: 'active',
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    // Convert Decimal to number for client components
    const products = productsRaw.map((product: any) => ({
      ...product,
      price: Number(product.price),
    }));

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <StorefrontHeader />
        <main className="flex-1">
          <Suspense fallback={
            <div className="container mx-auto px-4 py-8">
              <div className="space-y-6">
                <div className="h-8 bg-muted rounded animate-pulse w-1/4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_: any, i: any) => (
                    <div key={i} className="border rounded-lg overflow-hidden">
                      <div className="aspect-square w-full bg-muted animate-pulse" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                        <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }>
            <ProductsListingClient
              initialProducts={products}
              initialTotal={total}
              initialCategories={categories}
              initialPage={page}
              initialLimit={limit}
              initialSearch={search}
              initialCategory={category_id}
              initialSortBy={sort_by}
              initialSortOrder={sort_order}
            />
          </Suspense>
        </main>
        <StorefrontFooter />
        <ThemeProviderWrapper>
          <></>
        </ThemeProviderWrapper>
      </div>
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    
    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes("Can't reach database server")) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4">Database Connection Error</h1>
            <p className="text-muted-foreground mb-4">
              Unable to connect to the database server.
            </p>
            <p className="text-sm text-muted-foreground">
              Please check your DATABASE_URL environment variable and ensure the database server is running.
            </p>
          </div>
        </div>
      );
    }

    // Generic error
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <StorefrontHeader />
        <ErrorState
          title="Error Loading Products"
          message={error instanceof Error ? error.message : 'An unexpected error occurred. Please try again later.'}
          actionLabel="Go Home"
          actionHref="/"
        />
        <StorefrontFooter />
      </div>
    );
  }
}

