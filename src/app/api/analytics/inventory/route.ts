/**
 * Inventory Analytics API Route
 * 
 * Returns inventory reports and low stock alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const { searchParams } = new URL(request.url);
    const lowStockThreshold = parseInt(searchParams.get('lowStockThreshold') || '10');

    // Parallel fetch inventory metrics
    const [
      totalProducts,
      totalVariants,
      lowStockProducts,
      lowStockVariants,
      outOfStockProducts,
      outOfStockVariants,
      inventoryValue,
      inventoryByCategory,
    ] = await Promise.all([
      // Total products
      prisma.products.count({
        where: {
          tenant_id: tenant.id,
          status: 'active',
        },
      }),
      // Total variants
      prisma.product_variants.count({
        where: {
          tenant_id: tenant.id,
        },
      }),
      // Low stock products (stock <= threshold)
      prisma.products.findMany({
        where: {
          tenant_id: tenant.id,
          status: 'active',
          stock_quantity: {
            lte: lowStockThreshold,
            gte: 1,
          },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          stock_quantity: true,
          image: true,
          price: true,
          category_id: true,
        },
        orderBy: {
          stock_quantity: 'asc',
        },
      }),
      // Low stock variants
      prisma.product_variants.findMany({
        where: {
          tenant_id: tenant.id,
          stock_quantity: {
            lte: lowStockThreshold,
            gte: 1,
          },
        },
        include: {
          products: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
        orderBy: {
          stock_quantity: 'asc',
        },
      }),
      // Out of stock products
      prisma.products.count({
        where: {
          tenant_id: tenant.id,
          status: 'active',
          OR: [
            { stock_quantity: 0 },
            { stock_quantity: null },
          ],
        },
      }),
      // Out of stock variants
      prisma.product_variants.count({
        where: {
          tenant_id: tenant.id,
          OR: [
            { stock_quantity: 0 },
            { stock_quantity: null },
          ],
        },
      }),
      // Calculate total inventory value
      prisma.products.aggregate({
        where: {
          tenant_id: tenant.id,
          status: 'active',
          stock_quantity: { not: null },
        },
        _sum: {
          stock_quantity: true,
        },
      }),
      // Inventory by category
      prisma.products.findMany({
        where: {
          tenant_id: tenant.id,
          status: 'active',
          category_id: { not: null },
        },
        select: {
          category_id: true,
          stock_quantity: true,
          price: true,
        },
      }),
    ]);

    // Calculate inventory value
    const products = await prisma.products.findMany({
      where: {
        tenant_id: tenant.id,
        status: 'active',
        stock_quantity: { not: null },
      },
      select: {
        stock_quantity: true,
        price: true,
      },
    });

    const totalInventoryValue = products.reduce((sum: number, product: typeof products[0]) => {
      const quantity = product.stock_quantity || 0;
      const price = Number(product.price);
      return sum + (quantity * price);
    }, 0);

    // Fetch categories for products
    const categoryIds = [...new Set(inventoryByCategory.map((p: any) => p.category_id).filter(Boolean))] as string[];
    const categories = categoryIds.length > 0
      ? await prisma.categories.findMany({
          where: {
            id: { in: categoryIds },
            tenant_id: tenant.id,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

    const categoryMap = new Map<string, string>(categories.map((c: any) => [c.id, c.name]));

    // Group inventory by category
    const inventoryByCategoryMap: Record<string, { name: string; quantity: number; value: number }> = {};
    
    inventoryByCategory.forEach((product: any) => {
      if (!product.category_id) return;
      
      const categoryId = product.category_id;
      const categoryName = categoryMap.get(categoryId) || 'Uncategorized';
      const quantity = product.stock_quantity || 0;
      const value = quantity * Number(product.price);
      
      if (!inventoryByCategoryMap[categoryId]) {
        inventoryByCategoryMap[categoryId] = {
          name: categoryName,
          quantity: 0,
          value: 0,
        };
      }
      
      inventoryByCategoryMap[categoryId].quantity += quantity;
      inventoryByCategoryMap[categoryId].value += value;
    });

    const inventoryByCategoryData = Object.entries(inventoryByCategoryMap)
      .map(([id, data]) => ({
        id,
        ...data,
      }))
      .sort((a: any, b: any) => b.value - a.value);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          totalVariants,
          lowStockCount: lowStockProducts.length + lowStockVariants.length,
          outOfStockCount: outOfStockProducts + outOfStockVariants,
          totalInventoryValue,
        },
        lowStock: {
          products: lowStockProducts.map((p: any) => ({
            ...p,
            price: Number(p.price),
          })),
          variants: lowStockVariants.map((v: any) => ({
            id: v.id,
            productId: v.product_id,
            productName: v.products?.name || 'Unknown',
            productSku: v.products?.sku,
            variantSku: v.sku,
            stockQuantity: v.stock_quantity,
          })),
        },
        outOfStock: {
          products: outOfStockProducts,
          variants: outOfStockVariants,
        },
        byCategory: inventoryByCategoryData,
        threshold: lowStockThreshold,
      },
    });
  } catch (error: any) {
    console.error('Error fetching inventory analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inventory analytics' },
      { status: error.status || 500 }
    );
  }
}

