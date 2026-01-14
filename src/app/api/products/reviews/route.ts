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

const createReviewSchema = z.object({
  product_id: z.string().uuid('Product ID must be a valid UUID'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1, 'Comment is required').max(1000, 'Comment must be less than 1000 characters'),
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
    } else {
      // Guest review - require name and email
      if (!validatedData.customer_name || !validatedData.customer_email) {
        return NextResponse.json(
          { error: 'Name and email are required for guest reviews. Please login or provide your details.' },
          { status: 400 }
        );
      }
    }

    // Create review
    const review = await prisma.product_reviews.create({
      data: {
        tenant_id: tenant.id,
        product_id: validatedData.product_id,
        user_id: userId,
        rating: validatedData.rating,
        comment: validatedData.comment,
        status: 'pending', // Reviews need approval
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
        message: 'Review submitted successfully. It will be visible after approval.',
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
