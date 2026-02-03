/**
 * Sale Page
 * 
 * Public-facing sale page with products, countdown timer, and banner
 * 
 * Phase 4: Storefront - Sales Implementation
 */

import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';
import { generateStorefrontMetadata } from '@/lib/seo/storefront-metadata';
import { getCurrencyForTenant } from '@/lib/currency/get-currency-server';
import SalePageClient from './sale-page-client';
import SalePageCurrencyWrapper from './sale-page-currency-wrapper';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const tenant = await requireTenant();
  const { slug } = await params;

  const sale = await prisma.sales.findFirst({
    where: {
      slug,
      tenant_id: tenant.id,
      status: 'active',
    },
  });

  if (!sale) {
    return generateStorefrontMetadata({
      tenant,
      title: 'Sale Not Found',
      description: 'The requested sale could not be found.',
    });
  }

  return generateStorefrontMetadata({
    tenant,
    title: sale.name,
    description: sale.description || `Shop ${sale.name} at ${tenant.name || tenant.subdomain}`,
    url: `/sales/${slug}`,
  });
}

export default async function SalePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const tenant = await requireTenant();
  const { slug } = await params;
  const queryParams = await searchParams;

  // Fetch sale with products
  const sale = await prisma.sales.findFirst({
    where: {
      slug,
      tenant_id: tenant.id,
      status: 'active',
    },
    include: {
      product_sales: {
        where: {
          products: {
            status: 'active',
          },
        },
        include: {
          products: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              sale_price: true,
              image: true,
              stock_quantity: true,
              status: true,
            },
          },
        },
        orderBy: {
          order_index: 'asc',
        },
      },
    },
  });

  if (!sale) {
    // Common typo: URL has slug ending in "s" (e.g. /sales/summer-sales) but DB slug is summer-sale
    if (slug.endsWith('s') && slug.length > 1) {
      const slugWithoutTrailingS = slug.slice(0, -1);
      const saleByAltSlug = await prisma.sales.findFirst({
        where: {
          slug: slugWithoutTrailingS,
          tenant_id: tenant.id,
          status: 'active',
        },
      });
      if (saleByAltSlug) {
        redirect(`/sales/${saleByAltSlug.slug}`);
      }
    }
    notFound();
  }

  // Check if sale is currently active based on dates
  const now = new Date();
  const startDate = sale.start_date ? new Date(sale.start_date) : null;
  const endDate = sale.end_date ? new Date(sale.end_date) : null;

  const isActive =
    (!startDate || now >= startDate) && (!endDate || now <= endDate);

  if (!isActive) {
    notFound();
  }

  // Parse pagination
  const page = parseInt((queryParams.page as string) || '1', 10);
  const limit = 12;

  // Get products for this page
  const productSales = sale.product_sales;
  const total = productSales.length;
  const skip = (page - 1) * limit;
  const paginatedProductSales = productSales.slice(skip, skip + limit);

  // Fetch tenant currency so sale page shows selected currency on first paint
  const currency = await getCurrencyForTenant(tenant.id);

  // Map products with sale pricing
  const products = paginatedProductSales.map((productSale) => {
    const product = productSale.products;
    const regularPrice = Number(product.price);
    const salePrice = productSale.sale_price
      ? Number(productSale.sale_price)
      : product.sale_price
      ? Number(product.sale_price)
      : regularPrice;

    const discountPercent = productSale.discount_percent
      ? Number(productSale.discount_percent)
      : salePrice < regularPrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : 0;

    return {
      id: String(product.id),
      name: String(product.name),
      slug: product.slug ? String(product.slug) : null,
      price: salePrice,
      compareAtPrice: salePrice < regularPrice ? regularPrice : undefined,
      image: product.image ? String(product.image) : null,
      stock_quantity: product.stock_quantity !== null ? Number(product.stock_quantity) : null,
      saleBadge: sale.badge_text || 'SALE',
      saleBadgeColor: sale.badge_color || '#EF4444',
      discountPercent,
    };
  });

  return (
    <ThemeProviderWrapper>
      <div className="min-h-screen bg-background flex flex-col">
        <StorefrontHeader />
        <main className="flex-1">
          <SalePageCurrencyWrapper initialCurrency={currency}>
            <SalePageClient
            sale={{
              id: sale.id,
              name: sale.name,
              slug: sale.slug,
              description: sale.description,
              banner_image: sale.banner_image,
              badge_text: sale.badge_text,
              badge_color: sale.badge_color,
              start_date: sale.start_date,
              end_date: sale.end_date,
              is_featured: sale.is_featured ?? false,
            }}
            products={products}
            total={total}
            page={page}
            limit={limit}
            themeSlug={tenant.theme_slug || 'default'}
          />
          </SalePageCurrencyWrapper>
        </main>
        <StorefrontFooter />
      </div>
    </ThemeProviderWrapper>
  );
}
