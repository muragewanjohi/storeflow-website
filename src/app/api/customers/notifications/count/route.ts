/**
 * Customer Notifications Count API Route
 * 
 * GET: Get count of unread notifications for the current customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customers/notifications/count - Get notification count
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const customer = await getCurrentCustomer();

    if (!customer) {
      return NextResponse.json({ count: 0 });
    }

    // Count orders with pending delivery quotes
    const pendingQuotesCount = await prisma.orders.count({
      where: {
        tenant_id: tenant.id,
        OR: [
          { user_id: customer.id },
          { 
            user_id: null,
            email: {
              equals: customer.email,
              mode: 'insensitive',
            },
          },
        ],
        delivery_fee_status: 'quoted',
      },
    });

    return NextResponse.json({
      count: pendingQuotesCount,
    });
  } catch (error: any) {
    console.error('Error fetching notification count:', error);
    return NextResponse.json(
      { count: 0, error: error.message },
      { status: 500 }
    );
  }
}
