/**
 * Adjust Stock Page
 * 
 * Form for adjusting product or variant stock
 * 
 * Day 17: Inventory & Stock Management
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import AdjustStockClient from './adjust-stock-client';

export const dynamic = 'force-dynamic';

export default async function AdjustStockPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  const params = await searchParams;
  const productId = typeof params.product_id === 'string' ? params.product_id : undefined;
  const variantId = typeof params.variant_id === 'string' ? params.variant_id : undefined;

  let product: any = null;
  let variant: any = null;
  let products: any[] = [];
  let variants: any[] = [];

  // Fetch product or variant if IDs are provided
  if (productId) {
    product = await prisma.products.findFirst({
      where: {
        id: productId,
        tenant_id: tenant.id,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock_quantity: true,
        image: true,
      },
    });
  }

  if (variantId) {
    variant = await prisma.product_variants.findFirst({
      where: {
        id: variantId,
        tenant_id: tenant.id,
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            image: true,
          },
        },
        product_variant_attributes: {
          include: {
            attributes: {
              select: {
                name: true,
              },
            },
            attribute_values: {
              select: {
                value: true,
                color_code: true,
              },
            },
          },
        },
      },
    });
  }

  // If no product or variant is selected, fetch all for selection
  if (!product && !variant) {
    [products, variants] = await Promise.all([
      prisma.products.findMany({
        where: {
          tenant_id: tenant.id,
          status: {
            in: ['active', 'draft'],
          },
          product_variants: {
            none: {},
          },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          stock_quantity: true,
          image: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.product_variants.findMany({
        where: {
          tenant_id: tenant.id,
        },
        include: {
          products: {
            select: {
              id: true,
              name: true,
              sku: true,
              image: true,
            },
          },
          product_variant_attributes: {
            include: {
              attributes: {
                select: {
                  name: true,
                },
              },
              attribute_values: {
                select: {
                  value: true,
                  color_code: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);
  }

  return (
    <AdjustStockClient
      product={product ? {
        ...product,
        stock_quantity: product.stock_quantity || 0,
      } : null}
      variant={variant ? {
        id: variant.id,
        product_id: variant.product_id,
        product_name: variant.products.name,
        product_sku: variant.products.sku,
        variant_sku: variant.sku,
        stock_quantity: variant.stock_quantity || 0,
        attributes: variant.product_variant_attributes.map((attr: any) => ({
          name: attr.attributes.name,
          value: attr.attribute_values.value,
          color_code: attr.attribute_values.color_code,
        })),
      } : null}
      products={products.map((p: any) => ({
        ...p,
        stock_quantity: p.stock_quantity || 0,
      }))}
      variants={variants.map((v: any) => ({
        id: v.id,
        product_id: v.product_id,
        product_name: v.products.name,
        product_sku: v.products.sku,
        variant_sku: v.sku || null,
        stock_quantity: v.stock_quantity || 0,
        attributes: v.product_variant_attributes.map((attr: any) => ({
          name: attr.attributes.name,
          value: attr.attribute_values.value,
          color_code: attr.attribute_values.color_code,
        })),
      }))}
    />
  );
}

