/**
 * Customer Reviews API Route
 * 
 * GET: Get customer reviews
 * POST: Create product review
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const createReviewSchema = z.object({
  product_id: z.string().uuid('Product ID must be a valid UUID'),
  customer_id: z.string().uuid('Customer ID must be a valid UUID'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1, 'Comment is required').max(1000, 'Comment must be less than 1000 characters'),
});

/**
 * GET /api/customers/reviews - Get customer reviews
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID required' },
        { status: 400 }
      );
    }

    // Get customer reviews
    const reviews = await prisma.product_reviews.findMany({
      where: {
        user_id: customerId,
        tenant_id: tenant.id,
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            image: true,
            slug: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      reviews: reviews.map((review) => ({
        id: review.id,
        product: {
          id: review.products.id,
          name: review.products.name,
          image: review.products.image,
          slug: review.products.slug,
        },
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        created_at: review.created_at,
        updated_at: review.updated_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching customer reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/customers/reviews - Create product review
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = createReviewSchema.parse(body);

    // Verify customer exists
    const customer = await prisma.customers.findFirst({
      where: {
        id: validatedData.customer_id,
        tenant_id: tenant.id,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Verify product exists
    const product = await prisma.products.findFirst({
      where: {
        id: validatedData.product_id,
        tenant_id: tenant.id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if customer already reviewed this product
    const existingReview = await prisma.product_reviews.findFirst({
      where: {
        tenant_id: tenant.id,
        user_id: validatedData.customer_id,
        product_id: validatedData.product_id,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 400 }
      );
    }

    // Create review
    const review = await prisma.product_reviews.create({
      data: {
        tenant_id: tenant.id,
        user_id: validatedData.customer_id,
        product_id: validatedData.product_id,
        rating: validatedData.rating,
        comment: validatedData.comment,
        status: 'pending', // Reviews may need approval
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        review: {
          id: review.id,
          product: {
            id: review.products.id,
            name: review.products.name,
            image: review.products.image,
          },
          rating: review.rating,
          comment: review.comment,
          status: review.status,
          created_at: review.created_at,
        },
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

