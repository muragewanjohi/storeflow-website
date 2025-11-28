/**
 * Edit Product Page
 * 
 * Form for editing an existing product
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import ProductFormClient from '../../product-form-client';

export default async function EditProductPage({
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

  // Fetch product, variants, and categories in parallel using direct database queries
  try {
    const [product, variants, categories] = await Promise.all([
      // Fetch product
      prisma.products.findFirst({
        where: {
          id,
          tenant_id: tenant.id,
        },
      }),
      // Fetch variants with attributes
      prisma.product_variants.findMany({
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
      }),
      // Fetch categories
      prisma.categories.findMany({
        where: {
          tenant_id: tenant.id,
          parent_id: null, // Only top-level categories for dropdown
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
    ]);

    if (!product) {
      redirect('/dashboard/products');
    }

    // Transform Prisma types to component types
    const productData = {
      ...product,
      slug: product.slug || '',
      sku: product.sku || '',
      price: Number(product.price),
      sale_price: product.sale_price ? Number(product.sale_price) : null,
    } as any;

    const variantsData = variants.map((v: any) => ({
      ...v,
      price: v.price ? Number(v.price) : null,
      stock_quantity: v.stock_quantity ?? 0,
      // Rename product_variant_attributes to variant_attributes for client compatibility
      variant_attributes: v.product_variant_attributes,
    })) as any[];

    const categoriesData = categories.map((c: any) => ({
      ...c,
      slug: c.slug || '',
    })) as any[];

    return <ProductFormClient product={productData} variants={variantsData} categories={categoriesData} />;
  } catch (error) {
    console.error('Error fetching product, variants, or categories:', error);
    redirect('/dashboard/products');
  }
}

