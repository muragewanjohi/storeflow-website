/**
 * Check if user can review a product
 * 
 * GET: Check if current user has purchased the product and can review it
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/products/[id]/can-review
 * 
 * Check if current user can review this product
 * Returns: { canReview: boolean, hasPurchased: boolean, hasReviewed: boolean, reason?: string }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenant();
    const { id: productId } = await params;

    // Verify product exists
    const product = await prisma.products.findFirst({
      where: {
        id: productId,
        tenant_id: tenant.id,
        status: 'active',
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get current customer
    const customer = await getCurrentCustomer();

    if (!customer) {
      return NextResponse.json({
        canReview: false,
        hasPurchased: false,
        hasReviewed: false,
        reason: 'You must be logged in to review products',
        code: 'LOGIN_REQUIRED',
      });
    }

    // Check if customer already reviewed this product
    const existingReview = await prisma.product_reviews.findFirst({
      where: {
        tenant_id: tenant.id,
        user_id: customer.id,
        product_id: productId,
      },
    });

    if (existingReview) {
      return NextResponse.json({
        canReview: false,
        hasPurchased: true,
        hasReviewed: true,
        reason: 'You have already reviewed this product',
        code: 'ALREADY_REVIEWED',
      });
    }

    // Check if customer has purchased this product
    // Check both order_products.user_id and orders.user_id (for guest orders that were later linked)
    const orderProduct = await prisma.order_products.findFirst({
      where: {
        tenant_id: tenant.id,
        product_id: productId,
        OR: [
          { user_id: customer.id }, // Direct user_id match
          { orders: { user_id: customer.id } }, // Match through order relationship
          { orders: { email: customer.email } }, // Match guest orders by email (case-insensitive)
        ],
      },
      include: {
        orders: {
          select: {
            id: true,
            status: true,
            payment_status: true,
            user_id: true,
            email: true,
          },
        },
      },
    });

    // Check if the order is paid and not cancelled/refunded
    const hasPurchased = orderProduct && 
      orderProduct.orders?.payment_status === 'paid' &&
      orderProduct.orders?.status &&
      !['cancelled', 'refunded'].includes(orderProduct.orders.status);

    if (!hasPurchased) {
      return NextResponse.json({
        canReview: false,
        hasPurchased: false,
        hasReviewed: false,
        reason: 'You can only review products you have purchased',
        code: 'PURCHASE_REQUIRED',
      });
    }

    // User can review
    return NextResponse.json({
      canReview: true,
      hasPurchased: true,
      hasReviewed: false,
    });
  } catch (error: any) {
    console.error('Error checking review eligibility:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check review eligibility' },
      { status: error.status || 500 }
    );
  }
}
