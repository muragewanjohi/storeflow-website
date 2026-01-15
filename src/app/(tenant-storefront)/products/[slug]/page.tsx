/**
 * Product Detail Page
 * 
 * Public-facing product detail page with images, variants, and add to cart
 * 
 * Day 30: Tenant Storefront - Product Detail
 */

import { notFound } from 'next/navigation';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import ProductDetailClient from './product-detail-client';
import { generateProductMetadata, generateProductStructuredData } from '@/lib/seo/storefront-metadata';
import { loadThemeProductDetail } from '@/lib/themes/theme-loader';
import type { Metadata } from 'next';
import Script from 'next/script';

// Enable ISR (Incremental Static Regeneration) - like Amazon/Shopify
// Pages are cached and regenerated in the background every 60 seconds
export const revalidate = 60; // Revalidate every 60 seconds

// Enable dynamic params for product slugs
export const dynamicParams = true;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const tenant = await requireTenant();

  if (!tenant) {
    return <div>Store not found</div>;
  }

  const { slug } = await params;

  // Fetch product by slug - optimized query with select instead of include
  const product = await prisma.products.findFirst({
    where: {
      slug,
      tenant_id: tenant.id,
      status: 'active',
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      short_description: true,
      price: true,
      sale_price: true,
      sku: true,
      stock_quantity: true,
      image: true,
      gallery: true,
      category_id: true,
      product_variants: {
        where: {
          tenant_id: tenant.id,
        },
        select: {
          id: true,
          price: true,
          stock_quantity: true,
          sku: true,
          image: true,
          product_variant_attributes: {
            select: {
              id: true,
              attribute_id: true,
              attribute_value_id: true,
              attributes: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
              attribute_values: {
                select: {
                  id: true,
                  value: true,
                  color_code: true,
                  image: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  // Fetch active sales for this product to get sale pricing
  const now = new Date();
  const activeProductSales = await prisma.product_sales.findFirst({
    where: {
      product_id: product.id,
      tenant_id: tenant.id,
      sales: {
        status: 'active',
        OR: [
          { start_date: null, end_date: null },
          { start_date: { lte: now }, end_date: { gte: now } },
          { start_date: { lte: now }, end_date: null },
          { start_date: null, end_date: { gte: now } },
        ],
      },
    },
    include: {
      sales: {
        select: {
          id: true,
          name: true,
          badge_text: true,
          badge_color: true,
          start_date: true,
          end_date: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc', // Get the most recent sale if product is in multiple sales
    },
  });

  // Determine the effective sale price
  // Priority: product_sales.sale_price > product.sale_price > product.price
  const regularPrice = Number(product.price);
  let effectiveSalePrice: number | null = null;
  
  if (activeProductSales?.sale_price) {
    effectiveSalePrice = Number(activeProductSales.sale_price);
  } else if (product.sale_price) {
    effectiveSalePrice = Number(product.sale_price);
  }

  // Fetch rating stats for this product
  const ratingStats = await prisma.product_reviews.aggregate({
    where: {
      product_id: product.id,
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

  // Parallel fetch: Convert product data AND fetch related products simultaneously
  // This reduces total wait time - Amazon/Shopify technique
  const [productData, relatedProducts] = await Promise.all([
    // Convert in parallel (synchronous but allows Promise.all)
    Promise.resolve({
      ...product,
      price: regularPrice,
      sale_price: effectiveSalePrice, // Use sale price from active sale or product's sale_price
      // stock_quantity is already synced with variant totals in the database
      averageRating: ratingStats._avg.rating ? Number(ratingStats._avg.rating) : undefined,
      totalReviews: ratingStats._count.rating || 0,
      product_variants: product.product_variants.map((variant: any) => ({
        ...variant,
        price: variant.price ? Number(variant.price) : null,
        // Rename product_variant_attributes to variant_attributes for client compatibility
        variant_attributes: variant.product_variant_attributes,
      })),
    }),
    // Fetch related products in parallel
    product.category_id
      ? prisma.products.findMany({
          where: {
            tenant_id: tenant.id,
            status: 'active',
            category_id: product.category_id,
            id: { not: product.id },
          },
          take: 4,
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            sale_price: true,
            image: true,
            stock_quantity: true,
          },
          orderBy: {
            created_at: 'desc',
          },
        })
      : Promise.resolve([]),
  ]);

  // Convert related products prices
  const relatedProductsData = relatedProducts.map((p: any) => ({
    ...p,
    price: Number(p.price),
    sale_price: p.sale_price ? Number(p.sale_price) : null,
  }));

  // Calculate final price for structured data
  const finalPrice = effectiveSalePrice || Number(product.price);

  // Generate structured data for SEO
  // stock_quantity is already synced with variant totals in the database
  const structuredData = generateProductStructuredData({
    tenant,
    product: {
      name: product.name,
      description: product.description || undefined,
      image: product.image || undefined,
      price: finalPrice,
      currency: 'USD',
      sku: product.sku || undefined,
      availability: (product.stock_quantity !== null && product.stock_quantity > 0) ? 'in stock' : 'out of stock',
    },
    productUrl: `/products/${slug}`,
  });

  // Load theme-specific product detail component if available
  const themeSlug = tenant.theme_slug || 'default';
  const ThemeProductDetail = loadThemeProductDetail(themeSlug);
  const ProductDetailComponent = ThemeProductDetail || ProductDetailClient;

  // Use Suspense boundaries for streaming - allows page to render progressively
  // Note: Header and Footer are provided by the (tenant-storefront) layout
  return (
    <>
      <Script
        id="product-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ProductDetailComponent
        product={productData}
        relatedProducts={relatedProductsData}
      />
    </>
  );
}

// Generate static params for popular products (optional - for pre-rendering)
// This can be enabled later for top products
// export async function generateStaticParams() {
//   // Pre-render top 100 products
//   return [];
// }

