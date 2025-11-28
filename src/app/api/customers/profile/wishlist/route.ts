/**
 * Customer Wishlist API Route
 * 
 * GET: Get customer's wishlist
 * POST: Add product to wishlist
 * DELETE: Remove product from wishlist
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const addToWishlistSchema = z.object({
  product_id: z.string().uuid('Product ID must be a valid UUID'),
  customer_id: z.string().uuid('Customer ID must be a valid UUID'),
});

/**
 * GET /api/customers/profile/wishlist - Get customer's wishlist
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

    // Verify customer exists
    const customer = await prisma.customers.findFirst({
      where: {
        id: customerId,
        tenant_id: tenant.id,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get wishlist items
    const wishlistItems = await prisma.product_wishlists.findMany({
      where: {
        user_id: customerId,
        tenant_id: tenant.id,
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            sale_price: true,
            image: true,
            status: true,
            stock_quantity: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      wishlist: wishlistItems.map((item: any) => ({
        id: item.id,
        product: {
          id: item.products.id,
          name: item.products.name,
          slug: item.products.slug,
          price: Number(item.products.price),
          sale_price: item.products.sale_price ? Number(item.products.sale_price) : null,
          image: item.products.image,
          status: item.products.status,
          stock_quantity: item.products.stock_quantity,
        },
        added_at: item.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wishlist' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/customers/profile/wishlist - Add product to wishlist
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const validatedData = addToWishlistSchema.parse(body);

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

    // Check if already in wishlist
    const existingItem = await prisma.product_wishlists.findFirst({
      where: {
        tenant_id: tenant.id,
        user_id: validatedData.customer_id,
        product_id: validatedData.product_id,
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'Product already in wishlist' },
        { status: 400 }
      );
    }

    // Add to wishlist
    const wishlistItem = await prisma.product_wishlists.create({
      data: {
        tenant_id: tenant.id,
        user_id: validatedData.customer_id,
        product_id: validatedData.product_id,
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true,
            sale_price: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        wishlist_item: {
          id: wishlistItem.id,
          product: {
            id: wishlistItem.products.id,
            name: wishlistItem.products.name,
            image: wishlistItem.products.image,
            price: Number(wishlistItem.products.price),
            sale_price: wishlistItem.products.sale_price
              ? Number(wishlistItem.products.sale_price)
              : null,
          },
          added_at: wishlistItem.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding to wishlist:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to add to wishlist' },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/customers/profile/wishlist - Remove product from wishlist
 */
export async function DELETE(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const customerId = searchParams.get('customer_id');

    if (!productId || !customerId) {
      return NextResponse.json(
        { error: 'Product ID and Customer ID are required' },
        { status: 400 }
      );
    }

    // Find and delete wishlist item
    const wishlistItem = await prisma.product_wishlists.findFirst({
      where: {
        tenant_id: tenant.id,
        user_id: customerId,
        product_id: productId,
      },
    });

    if (!wishlistItem) {
      return NextResponse.json(
        { error: 'Wishlist item not found' },
        { status: 404 }
      );
    }

    await prisma.product_wishlists.delete({
      where: { id: wishlistItem.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Product removed from wishlist',
    });
  } catch (error: any) {
    console.error('Error removing from wishlist:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove from wishlist' },
      { status: error.status || 500 }
    );
  }
}

