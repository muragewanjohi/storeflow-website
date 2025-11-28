/**
 * Analytics Export API Route
 * 
 * Exports analytics data as CSV or JSON
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
    const format = searchParams.get('format') || 'csv'; // 'csv' or 'json'
    const type = searchParams.get('type') || 'overview'; // 'overview', 'revenue', 'sales', 'customers', 'inventory'
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();

    let data: any = {};
    let filename = '';

    switch (type) {
      case 'revenue': {
        const orders = await prisma.orders.findMany({
          where: {
            tenant_id: tenant.id,
            payment_status: 'paid',
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            order_number: true,
            total_amount: true,
            created_at: true,
          },
          orderBy: {
            created_at: 'asc',
          },
        });

        data = orders.map((order: any) => ({
          Date: order.created_at?.toISOString().split('T')[0] || '',
          'Order Number': order.order_number,
          Amount: Number(order.total_amount),
        }));
        filename = `revenue-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
        break;
      }

      case 'sales': {
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
                name: true,
                sku: true,
              },
            },
            orders: {
              select: {
                order_number: true,
                created_at: true,
              },
            },
          },
        });

        data = orderProducts.map((op: any) => ({
          Date: op.orders?.created_at?.toISOString().split('T')[0] || '',
          'Order Number': op.orders?.order_number || '',
          Product: op.products?.name || 'Unknown',
          SKU: op.products?.sku || '',
          Quantity: op.quantity,
          'Unit Price': Number(op.price),
          Total: Number(op.total),
        }));
        filename = `sales-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
        break;
      }

      case 'customers': {
        const customers = await prisma.customers.findMany({
          where: {
            tenant_id: tenant.id,
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            created_at: true,
          },
        });

        // Get orders for these customers
        const customerIds = customers.map(c => c.id);
        const orders = await prisma.orders.findMany({
          where: {
            tenant_id: tenant.id,
            user_id: { in: customerIds },
            payment_status: 'paid',
          },
          select: {
            user_id: true,
            total_amount: true,
          },
        });

        // Group orders by customer
        const ordersByCustomer = new Map<string, { count: number; revenue: number }>();
        orders.forEach((order: any) => {
          if (!order.user_id) return;
          const existing = ordersByCustomer.get(order.user_id) || { count: 0, revenue: 0 };
          ordersByCustomer.set(order.user_id, {
            count: existing.count + 1,
            revenue: existing.revenue + Number(order.total_amount),
          });
        });

        data = customers.map((customer: any) => {
          const orderStats = ordersByCustomer.get(customer.id) || { count: 0, revenue: 0 };
          return {
            'Registration Date': customer.created_at?.toISOString().split('T')[0] || '',
            Name: customer.name || '',
            Email: customer.email,
            'Total Orders': orderStats.count,
            'Total Revenue': orderStats.revenue,
          };
        });
        filename = `customers-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
        break;
      }

      case 'inventory': {
        const products = await prisma.products.findMany({
          where: {
            tenant_id: tenant.id,
            status: 'active',
          },
          select: {
            name: true,
            sku: true,
            stock_quantity: true,
            price: true,
            category_id: true,
          },
        });

        // Get categories for products
        const categoryIds = [...new Set(products.map(p => p.category_id).filter(Boolean))] as string[];
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

        const categoryMap = new Map(categories.map(c => [c.id, c.name]));

        data = products.map((product: any) => ({
          Product: product.name,
          SKU: product.sku || '',
          Category: product.category_id ? (categoryMap.get(product.category_id) || 'Uncategorized') : 'Uncategorized',
          'Stock Quantity': product.stock_quantity || 0,
          'Unit Price': Number(product.price),
          'Total Value': (product.stock_quantity || 0) * Number(product.price),
        }));
        filename = `inventory-${new Date().toISOString().split('T')[0]}`;
        break;
      }

      default: {
        // Overview - combine multiple metrics
        const [orders, customers, products] = await Promise.all([
          prisma.orders.count({
            where: {
              tenant_id: tenant.id,
              created_at: {
                gte: startDate,
                lte: endDate,
              },
            },
          }),
          prisma.customers.count({
            where: {
              tenant_id: tenant.id,
              created_at: {
                gte: startDate,
                lte: endDate,
              },
            },
          }),
          prisma.products.count({
            where: {
              tenant_id: tenant.id,
              status: 'active',
            },
          }),
        ]);

        const revenue = await prisma.orders.aggregate({
          where: {
            tenant_id: tenant.id,
            payment_status: 'paid',
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            total_amount: true,
          },
        });

        data = {
          Period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
          'Total Orders': orders,
          'Total Revenue': Number(revenue._sum.total_amount || 0),
          'New Customers': customers,
          'Active Products': products,
        };
        filename = `overview-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
        break;
      }
    }

    if (format === 'json') {
      return NextResponse.json(data, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      });
    }

    // CSV format
    let csv = '';
    
    if (Array.isArray(data)) {
      if (data.length > 0) {
        // Get headers from first object
        const headers = Object.keys(data[0]);
        csv += headers.join(',') + '\n';
        
        // Add rows
        data.forEach((row: any) => {
          csv += headers.map((header: any) => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',') + '\n';
        });
      }
    } else {
      // Single object - convert to key-value pairs
      csv += 'Metric,Value\n';
      Object.entries(data).forEach(([key, value]) => {
        csv += `${key},${value}\n`;
      });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export analytics' },
      { status: error.status || 500 }
    );
  }
}

