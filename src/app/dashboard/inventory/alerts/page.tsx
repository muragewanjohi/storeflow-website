/**
 * Inventory Alerts Page
 * 
 * Shows all low stock alerts
 * 
 * Day 17: Inventory & Stock Management
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import InventoryAlertsClient from './inventory-alerts-client';

export const dynamic = 'force-dynamic';

export default async function InventoryAlertsPage({
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
  const threshold = typeof params.threshold === 'string' ? parseInt(params.threshold, 10) : 10;

  // Fetch low stock items
  const [lowStockProducts, lowStockVariants] = await Promise.all([
    prisma.products.findMany({
      where: {
        tenant_id: tenant.id,
        status: {
          in: ['active', 'draft'],
        },
        OR: [
          {
            stock_quantity: {
              lte: threshold,
            },
          },
          {
            stock_quantity: null,
          },
        ],
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
        status: true,
      },
      orderBy: {
        stock_quantity: 'asc',
      },
    }),
    prisma.product_variants.findMany({
      where: {
        tenant_id: tenant.id,
        stock_quantity: {
          lte: threshold,
        },
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            image: true,
            status: true,
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
        stock_quantity: 'asc',
      },
    }),
  ]);

  return (
    <InventoryAlertsClient
      lowStockProducts={lowStockProducts.map((p) => ({
        ...p,
        stock_quantity: p.stock_quantity || 0,
        status: p.status || 'active',
      }))}
      lowStockVariants={lowStockVariants.map((v) => ({
        id: v.id,
        product_id: v.product_id,
        product_name: v.products.name,
        product_sku: v.products.sku,
        variant_sku: v.sku,
        stock_quantity: v.stock_quantity || 0,
        attributes: v.product_variant_attributes.map((attr) => ({
          name: attr.attributes.name,
          value: attr.attribute_values.value,
          color_code: attr.attribute_values.color_code,
        })),
      }))}
      threshold={threshold}
    />
  );
}

