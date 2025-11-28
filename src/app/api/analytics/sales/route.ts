/**
 * Sales Analytics API Route
 * 
 * Returns sales metrics by product and category
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
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();

    // Fetch order products with product and category info
    const orderProducts = await prisma.order_products.findMany({
      where: {
        tenant_id: tenant.id,
        orders: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
          payment_status: 'paid',
        },
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            category_id: true,
          },
        },
      },
    });

    // Calculate sales by product
    const salesByProduct: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    orderProducts.forEach((op: any) => {
      if (!op.products) return;
      
      const productId = op.product_id || 'unknown';
      const productName = op.products.name || 'Unknown Product';
      
      if (!salesByProduct[productId]) {
        salesByProduct[productId] = {
          name: productName,
          quantity: 0,
          revenue: 0,
        };
      }
      
      salesByProduct[productId].quantity += op.quantity;
      salesByProduct[productId].revenue += Number(op.total);
    });

    // Fetch categories for products
    const categoryIds = [...new Set(orderProducts.map(op => op.products?.category_id).filter(Boolean))] as string[];
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

    // Calculate sales by category
    const salesByCategory: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    orderProducts.forEach((op: any) => {
      if (!op.products?.category_id) return;
      
      const categoryId = op.products.category_id;
      const categoryName = categoryMap.get(categoryId) || 'Uncategorized';
      
      if (!salesByCategory[categoryId]) {
        salesByCategory[categoryId] = {
          name: categoryName,
          quantity: 0,
          revenue: 0,
        };
      }
      
      salesByCategory[categoryId].quantity += op.quantity;
      salesByCategory[categoryId].revenue += Number(op.total);
    });

    // Convert to arrays and sort by revenue
    const topProducts = Object.entries(salesByProduct)
      .map(([id, data]) => ({
        id,
        ...data,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 products

    const topCategories = Object.entries(salesByCategory)
      .map(([id, data]) => ({
        id,
        ...data,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue);

    // Calculate total sales
    const totalSales = orderProducts.reduce((sum: any, op: any) => sum + op.quantity, 0);
    const totalRevenue = orderProducts.reduce((sum: any, op: any) => sum + Number(op.total), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalSales,
        totalRevenue,
        byProduct: topProducts,
        byCategory: topCategories,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales analytics' },
      { status: error.status || 500 }
    );
  }
}

