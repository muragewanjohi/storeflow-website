/**
 * Product Detail Page
 * 
 * Shows detailed information about a single product
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import ProductDetailClient from './product-detail-client';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;

  // Fetch product directly from database (more reliable than HTTP fetch)
  const product = await prisma.products.findFirst({
    where: {
      id,
      tenant_id: tenant.id,
    },
    include: {
      product_variants: {
        select: {
          id: true,
          attribute_id: true,
          attribute_value_id: true,
          price: true,
          stock_quantity: true,
          sku: true,
          image: true,
        },
      },
    },
  });

  if (!product) {
    redirect('/dashboard/products');
  }

  // Fetch variants with full attribute details
  const variantsRaw = await prisma.product_variants.findMany({
    where: {
      product_id: id,
      tenant_id: tenant.id,
    },
    include: {
      product_variant_attributes: {
        include: {
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
            },
          },
        },
      },
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  // Map product to ensure non-null values for required fields
  const mappedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug || '',
    sku: product.sku || '',
    description: product.description,
    short_description: product.short_description,
    price: Number(product.price),
    sale_price: product.sale_price ? Number(product.sale_price) : null,
    stock_quantity: product.stock_quantity || 0,
    status: (product.status || 'active') as 'active' | 'inactive' | 'draft' | 'archived',
    image: product.image,
    gallery: product.gallery as string[] | null,
    category_id: product.category_id,
    created_at: product.created_at?.toISOString() || new Date().toISOString(),
    updated_at: product.updated_at?.toISOString() || new Date().toISOString(),
  };

  // Map variants to ensure non-null skus and proper structure
  const variants = variantsRaw.map((v) => ({
    id: v.id,
    product_id: v.product_id,
    sku: v.sku || '',
    price: v.price ? Number(v.price) : null,
    stock_quantity: v.stock_quantity || 0,
    image: v.image,
    variant_attributes: v.product_variant_attributes.map((pva) => ({
      id: pva.id,
      attribute_id: pva.attribute_id,
      attribute_value_id: pva.attribute_value_id,
      attributes: pva.attributes,
      attribute_values: pva.attribute_values,
    })),
    created_at: v.created_at?.toISOString() || new Date().toISOString(),
    updated_at: v.updated_at?.toISOString() || new Date().toISOString(),
  }));

  return <ProductDetailClient product={mappedProduct} variants={variants} />;
}

