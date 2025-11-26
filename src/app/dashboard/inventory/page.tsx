/**
 * Inventory Dashboard Page
 * 
 * Shows inventory overview, low stock alerts, and quick actions
 * 
 * Day 17: Inventory & Stock Management
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getLowStockThreshold } from '@/lib/inventory/threshold';
import InventoryDashboardClient from './inventory-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Get low stock threshold from tenant settings (defaults to 10)
  const threshold = await getLowStockThreshold(tenant.id);

  // Fetch inventory summary data in parallel
  const [lowStockProducts, lowStockVariants, recentHistory, allProducts, allVariants] = await Promise.all([
    // Get products with low stock
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
      },
      take: 10,
      orderBy: {
        stock_quantity: 'asc',
      },
    }),
    // Get variants with low stock
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
      take: 10,
      orderBy: {
        stock_quantity: 'asc',
      },
    }),
    // Get recent inventory history
    prisma.inventory_history.findMany({
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
        product_variants: {
          select: {
            id: true,
            sku: true,
          },
        },
      },
      take: 20,
      orderBy: {
        created_at: 'desc',
      },
    }),
    // Get all products for search (limited to 100 for performance)
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
      take: 100,
      orderBy: {
        name: 'asc',
      },
    }),
    // Get all variants for search (limited to 200 for performance)
    prisma.product_variants.findMany({
      where: {
        tenant_id: tenant.id,
      },
      include: {
        products: {
          select: {
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
              },
            },
          },
        },
      },
      take: 200,
      orderBy: {
        created_at: 'desc',
      },
    }),
  ]);

  // Get total inventory stats
  const [totalProducts, totalVariants, totalStockValue] = await Promise.all([
    prisma.products.count({
      where: {
        tenant_id: tenant.id,
        status: {
          in: ['active', 'draft'],
        },
      },
    }),
    prisma.product_variants.count({
      where: {
        tenant_id: tenant.id,
      },
    }),
    prisma.products.aggregate({
      where: {
        tenant_id: tenant.id,
        status: {
          in: ['active', 'draft'],
        },
      },
      _sum: {
        stock_quantity: true,
      },
    }),
  ]);

  return (
    <InventoryDashboardClient
      lowStockProducts={lowStockProducts.map((p) => ({
        ...p,
        stock_quantity: p.stock_quantity || 0,
      }))}
      lowStockVariants={lowStockVariants.map((v) => ({
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
      recentHistory={recentHistory.map((h) => ({
        ...h,
        quantity_before: h.quantity_before,
        quantity_after: h.quantity_after,
        quantity_change: h.quantity_change,
        created_at: h.created_at instanceof Date ? h.created_at : h.created_at ? new Date(h.created_at) : new Date(),
      }))}
      allProducts={allProducts.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock_quantity: p.stock_quantity || 0,
      }))}
      allVariants={allVariants.map((v) => ({
        id: v.id,
        product_id: v.product_id,
        product_name: v.products.name,
        product_sku: v.products.sku,
        variant_sku: v.sku,
        stock_quantity: v.stock_quantity || 0,
        attributes: v.variant_attributes.map((attr) => ({
          name: attr.attributes.name,
          value: attr.attribute_values.value,
        })),
      }))}
      stats={{
        totalProducts,
        totalVariants,
        totalStock: totalStockValue._sum.stock_quantity || 0,
        lowStockCount: lowStockProducts.length + lowStockVariants.length,
        threshold,
      }}
    />
  );
}

