/**
 * Product Reviews API Route
 * 
 * Public API for product reviews
 * GET: Get reviews for a product
 * POST: Create a review (authenticated or guest)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000, 'Comment must be less than 1000 characters').optional().or(z.literal('')),
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional(),
});

/**
 * GET /api/products/[id]/reviews
 * 
 * Get all approved reviews for a product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenant();
    const { id: productId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

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

    // Get approved reviews
    const [reviews, total] = await Promise.all([
      prisma.product_reviews.findMany({
        where: {
          product_id: productId,
          tenant_id: tenant.id,
          status: 'approved', // Only show approved reviews
        },
        include: {
          customers: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.product_reviews.count({
        where: {
          product_id: productId,
          tenant_id: tenant.id,
          status: 'approved',
        },
      }),
    ]);

    // Calculate average rating
    const ratingStats = await prisma.product_reviews.aggregate({
      where: {
        product_id: productId,
        tenant_id: tenant.id,
        status: 'approved',
        rating: { not: null },
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    return NextResponse.json({
      reviews: reviews.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        customer: review.customers
          ? {
              name: review.customers.name,
              email: review.customers.email,
              image: review.customers.image,
            }
          : null,
        created_at: review.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        averageRating: ratingStats._avg.rating || 0,
        totalReviews: ratingStats._count.rating || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products/[id]/reviews
 * 
 * Create a review for a product (authenticated or guest)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenant();
    const { id: productId } = await params;
    const body = await request.json();
    const validatedData = createReviewSchema.parse(body);

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
          product_id: productId,
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
          product_id: productId,
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
        product_id: productId,
        user_id: userId,
        rating: validatedData.rating,
        comment: validatedData.comment?.trim() || null, // Allow empty comment
        status: 'approved', // Reviews are published immediately
      },
    });

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
