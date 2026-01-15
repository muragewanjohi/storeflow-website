/**
 * Product Reviews API Route (Alternative endpoint)
 * 
 * POST: Create a review for a product
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { getProductCachePatterns } from '@/lib/cache/product-cache-keys';
import { deleteCachePattern } from '@/lib/cache/redis';

const createReviewSchema = z.object({
  product_id: z.string().uuid('Product ID must be a valid UUID'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000, 'Comment must be less than 1000 characters').optional().or(z.literal('')),
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional(),
});

/**
 * POST /api/products/reviews
 * 
 * Create a review for a product
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = createReviewSchema.parse(body);

    // Verify product exists
    const product = await prisma.products.findFirst({
      where: {
        id: validatedData.product_id,
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

    // Try to get current customer
    const customer = await getCurrentCustomer();
    let userId: string | null = null;

    if (customer) {
      // Authenticated customer
      userId = customer.id;

      // Check if customer already reviewed this product
      const existingReview = await prisma.product_reviews.findFirst({
        where: {
          tenant_id: tenant.id,
          user_id: userId,
          product_id: validatedData.product_id,
        },
      });

      if (existingReview) {
        return NextResponse.json(
          { error: 'You have already reviewed this product' },
          { status: 400 }
        );
      }

      // Verify customer has purchased this product (e-commerce best practice)
      // Check if user has a completed order with this product
      // First, find order_products for this user and product
      const orderProduct = await prisma.order_products.findFirst({
        where: {
          tenant_id: tenant.id,
          user_id: userId,
          product_id: validatedData.product_id,
        },
        include: {
          orders: {
            select: {
              id: true,
              status: true,
              payment_status: true,
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
        return NextResponse.json(
          { 
            error: 'You can only review products you have purchased',
            code: 'PURCHASE_REQUIRED',
          },
          { status: 403 }
        );
      }
    } else {
      // Guest reviews are not allowed (must be logged in to review)
      // This ensures purchase verification works properly
      return NextResponse.json(
        { 
          error: 'You must be logged in to submit a review. Please login to review products you have purchased.',
          code: 'LOGIN_REQUIRED',
        },
        { status: 401 }
      );
    }

    // Create review (comment is optional)
    // Reviews are published immediately (no approval needed)
    const review = await prisma.product_reviews.create({
      data: {
        tenant_id: tenant.id,
        product_id: validatedData.product_id,
        user_id: userId,
        rating: validatedData.rating,
        comment: validatedData.comment?.trim() || null, // Allow empty comment
        status: 'approved', // Reviews are published immediately
      },
    });

    // Invalidate product caches to show new rating immediately
    try {
      // Invalidate Next.js cache tags
      revalidateTag(`products-ratings-${tenant.id}`);
      revalidateTag(`product-${validatedData.product_id}`);
      
      // Invalidate Redis cache patterns
      const cachePatterns = getProductCachePatterns(tenant.id);
      await Promise.all(
        cachePatterns.map(pattern => deleteCachePattern(pattern))
      );
    } catch (cacheError) {
      // Don't fail the review creation if cache invalidation fails
      console.warn('Error invalidating cache after review creation:', cacheError);
    }

    return NextResponse.json(
      {
        success: true,
        review: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          status: review.status,
          created_at: review.created_at,
        },
        message: 'Review submitted successfully!',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating review:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create review' },
      { status: error.status || 500 }
    );
  }
}
