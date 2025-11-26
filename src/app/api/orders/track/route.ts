/**
 * Order Tracking API Route
 * 
 * Allows customers to look up orders using order number and email
 * No authentication required (guest order tracking)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const trackOrderSchema = z.object({
  order_number: z.string().min(1, 'Order number is required'),
  email: z.string().email('Invalid email address'),
});

/**
 * GET /api/orders/track - Track order by order number and email
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    
    const order_number = searchParams.get('order_number');
    const email = searchParams.get('email');

    // Validate input
    const validation = trackOrderSchema.safeParse({ order_number, email });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid order number or email', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { order_number: validatedOrderNumber, email: validatedEmail } = validation.data;

    // Find order by order number and email (case-insensitive email match)
    const order = await prisma.orders.findFirst({
      where: {
        tenant_id: tenant.id,
        order_number: validatedOrderNumber,
        email: {
          equals: validatedEmail,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        order_number: true,
        status: true,
        payment_status: true,
        total_amount: true,
        created_at: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found. Please check your order number and email address.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        total_amount: Number(order.total_amount),
        created_at: order.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error tracking order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track order' },
      { status: error.status || 500 }
    );
  }
}

