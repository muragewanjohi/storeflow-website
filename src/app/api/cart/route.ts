/**
 * Cart API Routes
 * 
 * GET: Get cart items
 * POST: Add item to cart
 * PUT: Update cart item
 * DELETE: Remove item from cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { addToCartSchema, updateCartItemSchema } from '@/lib/orders/validation';
import { getCart, addToCart, updateCartItem, removeFromCart, generateCartId } from '@/lib/orders/cart';

/**
 * GET /api/cart - Get cart items
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    
    const cartId = generateCartId(user.id);
    const cart = getCart(cartId);

    return NextResponse.json({
      success: true,
      cart,
    });
  } catch (error: any) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cart' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/cart - Add item to cart
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();
    
    const { product_id, variant_id, quantity } = addToCartSchema.parse(body);

    // Fetch product details
    const product = await prisma.products.findFirst({
      where: {
        id: product_id,
        tenant_id: tenant.id,
      },
      select: {
        id: true,
        name: true,
        price: true,
        sale_price: true,
        image: true,
        sku: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // If variant is specified, fetch variant details
    let variant = null;
    let finalPrice = Number(product.sale_price || product.price);
    let finalSku = product.sku;

    if (variant_id) {
      variant = await prisma.product_variants.findFirst({
        where: {
          id: variant_id,
          product_id: product_id,
          tenant_id: tenant.id,
        },
        select: {
          id: true,
          price: true,
          sku: true,
          stock_quantity: true,
        },
      });

      if (!variant) {
        return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
      }

      // Check stock availability
      if (variant.stock_quantity !== null && variant.stock_quantity < quantity) {
        return NextResponse.json(
          { error: `Insufficient stock. Available: ${variant.stock_quantity}` },
          { status: 400 }
        );
      }

      finalPrice = variant.price ? Number(variant.price) : finalPrice;
      finalSku = variant.sku || finalSku;
    } else {
      // Check product stock if no variant
      const productStock = await prisma.products.findFirst({
        where: { id: product_id, tenant_id: tenant.id },
        select: { stock_quantity: true },
      });

      if (productStock && productStock.stock_quantity !== null && productStock.stock_quantity < quantity) {
        return NextResponse.json(
          { error: `Insufficient stock. Available: ${productStock.stock_quantity}` },
          { status: 400 }
        );
      }
    }

    const cartId = generateCartId(user.id);
    const cart = addToCart(cartId, {
      product_id,
      variant_id: variant_id || null,
      quantity,
      price: finalPrice,
      name: product.name,
      image: product.image,
      sku: finalSku,
    });

    return NextResponse.json({
      success: true,
      cart,
    });
  } catch (error: any) {
    console.error('Error adding to cart:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to add item to cart' },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/cart - Update cart item quantity
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();
    
    const { product_id, variant_id, quantity } = body;

    if (!product_id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const { quantity: validatedQuantity } = updateCartItemSchema.parse({ quantity });

    const cartId = generateCartId(user.id);
    const cart = updateCartItem(cartId, product_id, variant_id || null, validatedQuantity);

    return NextResponse.json({
      success: true,
      cart,
    });
  } catch (error: any) {
    console.error('Error updating cart:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update cart' },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/cart - Remove item from cart
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    
    const product_id = searchParams.get('product_id');
    const variant_id = searchParams.get('variant_id');

    if (!product_id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const cartId = generateCartId(user.id);
    const cart = removeFromCart(cartId, product_id, variant_id || null);

    return NextResponse.json({
      success: true,
      cart,
    });
  } catch (error: any) {
    console.error('Error removing from cart:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove item from cart' },
      { status: error.status || 500 }
    );
  }
}

