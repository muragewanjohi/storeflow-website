/**
 * Event Tracking API Route
 * 
 * Tracks custom events (add to cart, checkout start, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    
    const {
      sessionId,
      eventName,
      eventCategory,
      eventLabel,
      eventValue,
      productId,
      orderId,
      metadata,
    } = body;

    if (!sessionId || !eventName) {
      return NextResponse.json(
        { error: 'Session ID and event name are required' },
        { status: 400 }
      );
    }

    // Get customer ID if authenticated
    const customer = await getCurrentCustomer();
    const customerId = customer?.id || null;

    // Insert event
    await prisma.$executeRaw`
      INSERT INTO analytics_events (
        tenant_id,
        session_id,
        customer_id,
        event_name,
        event_category,
        event_label,
        event_value,
        product_id,
        order_id,
        metadata,
        created_at
      ) VALUES (
        ${tenant.id}::uuid,
        ${sessionId},
        ${customerId ? `${customerId}::uuid` : 'NULL'},
        ${eventName},
        ${eventCategory || null},
        ${eventLabel || null},
        ${eventValue ? parseFloat(String(eventValue)) : null},
        ${productId ? `${productId}::uuid` : 'NULL'},
        ${orderId ? `${orderId}::uuid` : 'NULL'},
        ${metadata ? JSON.stringify(metadata) : '{}'},
        NOW()
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track event' },
      { status: 500 }
    );
  }
}
