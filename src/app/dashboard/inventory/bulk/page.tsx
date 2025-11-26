/**
 * Bulk Inventory Update Page
 * 
 * Form for updating multiple products/variants at once
 * 
 * Day 17: Inventory & Stock Management
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import BulkInventoryClient from './bulk-inventory-client';

export const dynamic = 'force-dynamic';

export default async function BulkInventoryPage() {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Fetch all products and variants for selection
  const [products, variants] = await Promise.all([
    prisma.products.findMany({
      where: {
        tenant_id: tenant.id,
        status: {
          in: ['active', 'draft'],
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock_quantity: true,
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
          },
        },
        variant_attributes: {
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

  return (
    <BulkInventoryClient
      products={products.map((p) => ({
        ...p,
        stock_quantity: p.stock_quantity || 0,
      }))}
      variants={variants.map((v) => ({
        id: v.id,
        product_id: v.product_id,
        product_name: v.products.name,
        product_sku: v.products.sku,
        variant_sku: v.sku,
        stock_quantity: v.stock_quantity || 0,
        attributes: v.variant_attributes.map((attr) => ({
          name: attr.attributes.name,
          value: attr.attribute_values.value,
          color_code: attr.attribute_values.color_code,
        })),
      }))}
    />
  );
}

