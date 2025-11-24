/**
 * Customer Export API Route
 * 
 * GET: Export customers to CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/customers/export - Export customers to CSV
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const email = searchParams.get('email');

    // Build where clause
    const where: any = {
      tenant_id: tenant.id,
    };

    if (email) {
      where.email = {
        contains: email,
        mode: 'insensitive',
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch all customers (for export, we want all matching records)
    const customers = await prisma.customers.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        mobile: true,
        company: true,
        email_verified: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Get order counts and total spent for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const [orderCount, paidOrders] = await Promise.all([
          prisma.orders.count({
            where: {
              tenant_id: tenant.id,
              email: customer.email,
            },
          }),
          prisma.orders.findMany({
            where: {
              tenant_id: tenant.id,
              email: customer.email,
              payment_status: 'paid',
            },
            select: {
              total_amount: true,
            },
          }),
        ]);

        const totalSpent = paidOrders.reduce(
          (sum, order) => sum + Number(order.total_amount),
          0
        );

        return {
          ...customer,
          order_count: orderCount,
          total_spent: totalSpent,
        };
      })
    );

    // Generate CSV
    const headers = [
      'ID',
      'Name',
      'Email',
      'Username',
      'Mobile',
      'Company',
      'Email Verified',
      'Total Orders',
      'Total Spent',
      'Created At',
    ];

    const rows = customersWithStats.map((customer) => [
      customer.id,
      customer.name,
      customer.email,
      customer.username || '',
      customer.mobile || '',
      customer.company || '',
      customer.email_verified ? 'Yes' : 'No',
      customer.order_count.toString(),
      customer.total_spent.toFixed(2),
      customer.created_at?.toISOString() || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting customers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export customers' },
      { status: error.status || 500 }
    );
  }
}

