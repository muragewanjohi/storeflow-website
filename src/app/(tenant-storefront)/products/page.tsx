/**
 * Products Listing Page
 * 
 * Public-facing product listing with search, filters, and pagination
 * 
 * Day 30: Tenant Storefront - Product Listing
 */

import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenant-context/server';
import ProductsListingClient from './products-listing-client';
import { prisma } from '@/lib/prisma/client';
import { ErrorState } from '@/components/storefront/error-boundary';
import { generateStorefrontMetadata } from '@/lib/seo/storefront-metadata';

/**
 * Caching Strategy: Dynamic Rendering with Response Caching
 * 
 * - Must be dynamic because tenant resolution requires headers (hostname)
 * - Cannot use ISR because tenant is request-specific
 * - Caching is handled via:
 *   1. API route cache headers (30s cache, 60s stale-while-revalidate)
 *   2. Next.js automatic request deduplication
 *   3. CDN caching via Vercel Edge Network
 * 
 * This provides good performance while maintaining tenant-specific content.
 */
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
  console.log('[Products Page] ===== PAGE COMPONENT CALLED =====', {
    timestamp: new Date().toISOString()
  });
  
  let tenant;
  try {
    tenant = await requireTenant();
    console.log('[Products Page] Tenant loaded successfully:', {
      tenantId: tenant.id,
      tenantName: tenant.name
    });
  } catch (error) {
    console.error('[Products Page] Error getting tenant:', error);
    return (
      <ErrorState
        title="Store Not Found"
        message="Unable to load the store. Please check the URL and try again."
        actionLabel="Go Home"
        actionHref="/"
      />
    );
  }

  // Ensure we always return something, even if there's an error
  let products: any[] = [];
  let total = 0;
  let categories: any[] = [];

  // Get initial products
  const params = await searchParams;
  const page = parseInt(params.page as string) || 1;
  const limit = 12;
  const search = (params.search as string) || '';
  const categoryParam = (params.category as string) || '';
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

  // Resolve category slugs to IDs
  let categoryIds: string[] = [];
  let currentCategory = null;
  
  if (categoryParam && typeof categoryParam === 'string') {
    // Split by comma and clean up each param - be very explicit about splitting
    const rawParams = categoryParam.split(',');
    const categoryParams: string[] = [];
    
    for (const rawParam of rawParams) {
      const trimmed = rawParam.trim();
      // Only add if it's non-empty and doesn't contain a comma (shouldn't happen after split, but be safe)
      if (trimmed.length > 0 && !trimmed.includes(',')) {
        categoryParams.push(trimmed);
      }
    }
    
    // Check if params are UUIDs or slugs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    for (const param of categoryParams) {
      // Final validation: ensure param is a single value
      if (!param || param.length === 0 || param.includes(',')) {
        console.warn('[Products Page] Skipping invalid category param:', param);
        continue;
      }
      
      if (uuidRegex.test(param)) {
        // It's a valid UUID, add to array (double-check it's a single UUID)
        if (param.split(',').length === 1 && !param.includes(',')) {
          categoryIds.push(param);
        } else {
          console.warn('[Products Page] Rejecting UUID with comma:', param);
        }
      } else {
        // It's a slug, look up the category
        try {
          const category = await prisma.categories.findFirst({
            where: {
              tenant_id: tenant.id,
              slug: param,
              status: 'active',
            },
            select: {
              id: true,
              name: true,
              slug: true,
            },
          });
          
          if (category && category.id) {
            // Ensure category.id is a valid single UUID before adding
            if (uuidRegex.test(category.id) && 
                !category.id.includes(',') && 
                category.id.split(',').length === 1) {
              categoryIds.push(category.id);
              // Set currentCategory to the first matching category (for breadcrumbs)
              if (!currentCategory) {
                currentCategory = category;
              }
            } else {
              console.warn('[Products Page] Rejecting category.id with invalid format:', category.id);
            }
          }
        } catch (error) {
          console.error('[Products Page] Error looking up category by slug:', param, error);
        }
      }
    }
  }

  // Apply category filter
  if (categoryIds.length > 0) {
    if (categoryIds.length === 1) {
      where.category_id = categoryIds[0];
    } else {
      where.category_id = { in: categoryIds };
    }
  }

  // Handle attribute filters
  const attributeFilters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof key === 'string' && key.startsWith('attr_')) {
      const attributeId = key.replace('attr_', '');
      const valueIds = (value as string).split(',').filter(id => id.trim());
      if (valueIds.length > 0) {
        attributeFilters[attributeId] = valueIds;
      }
    }
  }

  // Apply attribute filters if any
  if (Object.keys(attributeFilters).length > 0) {
    const productIdsWithAttributes: string[] = [];
    
    for (const [attributeId, valueIds] of Object.entries(attributeFilters)) {
      const variants = await prisma.product_variant_attributes.findMany({
        where: {
          tenant_id: tenant.id,
          attribute_id: attributeId,
          attribute_value_id: { in: valueIds },
        },
        include: {
          product_variants: {
            select: {
              product_id: true,
            },
          },
        },
      });

      const productIds = variants
        .map(v => v.product_variants?.product_id)
        .filter((id): id is string => !!id);

      if (productIdsWithAttributes.length === 0) {
        productIdsWithAttributes.push(...productIds);
      } else {
        // Intersection: products must match ALL attribute filters
        productIdsWithAttributes.splice(0, productIdsWithAttributes.length, 
          ...productIdsWithAttributes.filter(id => productIds.includes(id))
        );
      }
    }

      if (productIdsWithAttributes.length > 0) {
        if (where.id) {
          const existingIds = Array.isArray(where.id.in) ? where.id.in : [where.id];
          where.id = { in: existingIds.filter((id: string) => productIdsWithAttributes.includes(id)) };
        } else {
          where.id = { in: productIdsWithAttributes };
        }
      } else {
        // No products match the attribute filters
        where.id = { in: [] };
      }
  }

  try {
    // Fetch categories list (for filters)
    categories = await prisma.categories.findMany({
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
    });

    // If currentCategory wasn't set from slug lookup, try to get it from first categoryId
    // Only do this if we have valid categoryIds (safety check)
    if (!currentCategory && categoryIds.length > 0) {
      // Filter categoryIds to ensure they're all valid single UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validCategoryIds = categoryIds.filter(id => {
        return id && 
               typeof id === 'string' && 
               !id.includes(',') &&
               id.split(',').length === 1 &&
               uuidRegex.test(id);
      });
      
      // Only proceed if we have valid IDs
      if (validCategoryIds.length > 0) {
        try {
          currentCategory = await prisma.categories.findUnique({
            where: { id: validCategoryIds[0] },
            select: { id: true, name: true, slug: true },
          });
        } catch (error) {
          console.error('[Products Page] Error looking up category by ID:', validCategoryIds[0], error);
          // Don't throw, just log the error
        }
      } else {
        console.warn('[Products Page] No valid category IDs found after filtering');
      }
    }

    console.log('[Products Page] Fetching products', {
      tenantId: tenant.id,
      where,
      page,
      limit,
      sort_by,
      sort_order,
    });

    const [productsRaw, totalCountResult] = await Promise.all([
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
          sale_price: true, // Include sale_price for compareAtPrice mapping
          image: true,
          stock_quantity: true, // Already synced with variant totals
          category_id: true,
        },
      }),
      prisma.products.count({ where }),
    ]);
    
    total = totalCountResult || 0;

    console.log('[Products Page] Products fetched', {
      productsCount: productsRaw.length,
      total,
      page,
      limit,
    });

    // Simplified: Skip rating stats for now - will add back later
    // This ensures products page loads quickly without complex queries

    // Convert Decimal to number for client components and map sale_price correctly
    // When sale_price exists: price = sale_price (discounted), compareAtPrice = price (original)
    // When no sale_price: price = price (normal), compareAtPrice = undefined
    console.log('[Products Page] Mapping products', {
      rawProductsCount: productsRaw.length,
    });
    
    products = productsRaw.map((product: any) => {
      try {
        // Ensure price is converted to number (handle Prisma Decimal)
        const regularPrice = typeof product.price === 'object' && product.price !== null 
          ? Number(product.price.toString()) 
          : Number(product.price) || 0;
        
        // Ensure sale_price is converted to number if it exists
        const salePrice = product.sale_price 
          ? (typeof product.sale_price === 'object' && product.sale_price !== null
              ? Number(product.sale_price.toString())
              : Number(product.sale_price))
          : null;
        
        if (salePrice && salePrice < regularPrice && salePrice > 0) {
          // Product is on sale: use sale_price as price, regular price as compareAtPrice
          return {
            id: String(product.id),
            name: String(product.name || ''),
            slug: product.slug ? String(product.slug) : null,
            price: Number(salePrice),
            compareAtPrice: Number(regularPrice),
            image: product.image ? String(product.image) : null,
            stock_quantity: product.stock_quantity !== null ? Number(product.stock_quantity) : null,
            category_id: product.category_id ? String(product.category_id) : null,
          };
        } else {
          // No sale: use regular price as price
          return {
            id: String(product.id),
            name: String(product.name || ''),
            slug: product.slug ? String(product.slug) : null,
            price: Number(regularPrice),
            image: product.image ? String(product.image) : null,
            stock_quantity: product.stock_quantity !== null ? Number(product.stock_quantity) : null,
            category_id: product.category_id ? String(product.category_id) : null,
          };
        }
      } catch (error) {
        console.error('[Products Page] Error mapping product:', product?.id, error);
        // Fallback to simple mapping if price conversion fails
        return {
          id: String(product?.id || ''),
          name: String(product?.name || ''),
          slug: product?.slug ? String(product.slug) : null,
          price: 0,
          image: product?.image ? String(product.image) : null,
          stock_quantity: product?.stock_quantity !== null ? Number(product.stock_quantity) : null,
          category_id: product?.category_id ? String(product.category_id) : null,
        };
      }
    });

    console.log('[Products Page] Products mapped, rendering', {
      finalProductsCount: products.length,
      total,
      themeSlug: tenant.theme_slug || 'default',
      firstProduct: products[0] ? {
        id: products[0].id,
        name: products[0].name,
        price: products[0].price,
        hasImage: !!products[0].image,
      } : null,
    });

    console.log('[Products Page] Rendering page with products', {
      productsCount: products.length,
      total,
      categoriesCount: categories.length,
      tenantId: tenant.id,
      tenantName: tenant.name,
    });

    console.log('[Products Page] ===== ABOUT TO RETURN JSX =====', {
      productsCount: products.length,
      total,
      categoriesCount: categories.length,
    });

    // Always return the component, even if products array is empty
    return (
      <ProductsListingClient
        initialProducts={products || []}
        initialTotal={total || 0}
        initialCategories={categories || []}
        initialPage={page}
        initialLimit={limit}
        initialSearch={search}
        initialCategory={categoryParam}
        initialSortBy={sort_by}
        initialSortOrder={sort_order}
        currentCategory={currentCategory}
        themeSlug={tenant.theme_slug || 'default'}
      />
    );
  } catch (error) {
    console.error('[Products Page] Error fetching products:', error);
    
    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes("Can't reach database server")) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
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

    // Generic error - still try to render with empty products so user sees something
    console.error('[Products Page] Rendering with empty products due to error');
    return (
      <ProductsListingClient
        initialProducts={[]}
        initialTotal={0}
        initialCategories={[]}
        initialPage={1}
        initialLimit={12}
        initialSearch=""
        initialCategory=""
        initialSortBy="created_at"
        initialSortOrder="desc"
        currentCategory={null}
        themeSlug={tenant?.theme_slug || 'default'}
      />
    );
  }
}

