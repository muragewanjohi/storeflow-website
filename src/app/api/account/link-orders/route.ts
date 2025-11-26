/**
 * Link Guest Orders API Route
 * 
 * Manually link guest orders to the current customer account
 * POST /api/account/link-orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import { linkGuestOrdersToCustomer } from '@/lib/orders/link-guest-orders';

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const customer = await getCurrentCustomer();

    if (!customer) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Link orders to customer account (matches by email + tenant_id)
    const linkedCount = await linkGuestOrdersToCustomer(
      customer.id,
      customer.email,
      tenant.id
    );

    return NextResponse.json({
      success: true,
      message: `Linked ${linkedCount} order(s) to your account`,
      linkedCount,
    });
  } catch (error: any) {
    console.error('Error linking orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link orders' },
      { status: error.status || 500 }
    );
  }
}

