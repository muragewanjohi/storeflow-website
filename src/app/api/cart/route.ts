/**
 * Cart API Routes
 * 
 * GET: Get cart items
 * POST: Add item to cart
 * PUT: Update cart item
 * DELETE: Remove item from cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUser } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { addToCartSchema, updateCartItemSchema } from '@/lib/orders/validation';
import { getOrCreateCustomer } from '@/lib/customers/get-customer';
import { getOrCreateSessionId, getSessionId } from '@/lib/cart/session';

/**
 * GET /api/cart - Get cart items
 * 
 * Supports both authenticated users and guest users (via session_id)
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    
    // Try to get authenticated user
    const user = await getUser();
    let customerId: string | null = null;
    let sessionId: string | null = null;
    
    if (user) {
      // Authenticated user - use customer ID
      customerId = await getOrCreateCustomer(user, tenant.id);
    } else {
      // Guest user - use session ID
      sessionId = await getOrCreateSessionId();
    }
    
    // Fetch cart items from database
    // Use select instead of include for better performance
    const cartItems = await prisma.cart_items.findMany({
      where: {
        tenant_id: tenant.id,
        user_id: customerId,
      },
      select: {
        id: true,
        product_id: true,
        variant_id: true,
        quantity: true,
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            sale_price: true,
            image: true,
            sku: true,
            slug: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Fetch variant prices for items with variants
    const variantIds = cartItems
      .filter(item => item.variant_id)
      .map(item => item.variant_id) as string[];

    const variants = variantIds.length > 0
      ? await prisma.product_variants.findMany({
          where: {
            id: { in: variantIds },
            tenant_id: tenant.id,
          },
          select: {
            id: true,
            price: true,
          },
        })
      : [];

    const variantPriceMap = new Map<string, number | null>(
      variants.map((v: any) => [v.id, v.price ? Number(v.price) : null])
    );

    // Build cart response with product details
    const items = cartItems.map((item: any) => {
      const product = item.products;
      if (!product) {
        return null;
      }

      // Get price (variant price if variant_id exists, otherwise product price)
      let price = Number(product.sale_price || product.price);
      if (item.variant_id) {
        const variantPrice = variantPriceMap.get(item.variant_id);
        if (variantPrice !== null && variantPrice !== undefined) {
          price = variantPrice;
        }
      }

      return {
        product_id: item.product_id!,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price,
        name: product.name,
        image: product.image,
        sku: product.sku,
        slug: product.slug,
      };
    }).filter(Boolean) as any[];

    const total = items.reduce((sum: number, item: typeof items[0]) => sum + item.price * item.quantity, 0);
    const item_count = items.reduce((sum: number, item: typeof items[0]) => sum + item.quantity, 0);

    const response = NextResponse.json({
      success: true,
      cart: {
        items,
        total,
        item_count,
      },
    });
    
    // Cache cart data for 5 seconds (stale-while-revalidate)
    // This reduces load on database for repeated requests
    response.headers.set('Cache-Control', 'private, s-maxage=5, stale-while-revalidate=10');
    
    return response;
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
    
    // Get or create customer record
    const customerId = await getOrCreateCustomer(user, tenant.id);
    
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
        slug: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // If variant is specified, fetch variant details
    let variant: { id: string; price: any; stock_quantity: number | null; sku: string | null } | null = null;
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

    // Check if cart item already exists
    const existingItem = await prisma.cart_items.findFirst({
      where: {
        tenant_id: tenant.id,
        user_id: customerId,
        product_id,
        variant_id: variant_id || null,
      },
    });

    if (existingItem) {
      // Update quantity
      await prisma.cart_items.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          updated_at: new Date(),
        },
      });
    } else {
      // Create new cart item
      await prisma.cart_items.create({
        data: {
          tenant_id: tenant.id,
          user_id: customerId,
          product_id,
          variant_id: variant_id || null,
          quantity,
        },
      });
    }

    // Fetch updated cart
    const cartItems = await prisma.cart_items.findMany({
      where: {
        tenant_id: tenant.id,
        user_id: customerId,
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            sale_price: true,
            image: true,
            sku: true,
            slug: true,
          },
        },
      },
    });

    // Fetch variant prices
    const variantIds = cartItems
      .filter((item: any) => item.variant_id)
      .map((item: any) => item.variant_id) as string[];

    const variants = variantIds.length > 0
      ? await prisma.product_variants.findMany({
          where: {
            id: { in: variantIds },
            tenant_id: tenant.id,
          },
          select: {
            id: true,
            price: true,
          },
        })
      : [];

    const variantPriceMap = new Map(
      variants.map((v: any) => [v.id, v.price ? Number(v.price) : null])
    );

    const items = cartItems.map((item: typeof cartItems[0]) => {
      const product = item.products;
      if (!product) return null;

      let price = Number(product.sale_price || product.price);
      if (item.variant_id) {
        const variantPrice = variantPriceMap.get(item.variant_id);
        if (variantPrice !== null && variantPrice !== undefined) {
          price = variantPrice;
        }
      }

      return {
        product_id: item.product_id!,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price,
        name: product.name,
        image: product.image,
        sku: product.sku,
        slug: product.slug,
      };
    }).filter(Boolean) as any[];

    const total = items.reduce((sum: number, item: typeof items[0]) => sum + item.price * item.quantity, 0);
    const item_count = items.reduce((sum: number, item: typeof items[0]) => sum + item.quantity, 0);

    return NextResponse.json({
      success: true,
      cart: {
        items,
        total,
        item_count,
      },
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
    
    // Get or create customer record
    const customerId = await getOrCreateCustomer(user, tenant.id);
    
    const { product_id, variant_id, quantity } = body;

    if (!product_id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const { quantity: validatedQuantity } = updateCartItemSchema.parse({ quantity });

    // Find cart item
    const cartItem = await prisma.cart_items.findFirst({
      where: {
        tenant_id: tenant.id,
        user_id: customerId,
        product_id,
        variant_id: variant_id || null,
      },
    });

    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    if (validatedQuantity <= 0) {
      // Remove item
      await prisma.cart_items.delete({
        where: { id: cartItem.id },
      });
    } else {
      // Update quantity
      await prisma.cart_items.update({
        where: { id: cartItem.id },
        data: {
          quantity: validatedQuantity,
          updated_at: new Date(),
        },
      });
    }

    // Return minimal response - client already has optimistic updates
    // This avoids expensive full cart refetch
    return NextResponse.json({
      success: true,
      message: 'Cart updated successfully',
      // Return minimal data for client to sync if needed
      updated: {
        product_id,
        variant_id: variant_id || null,
        quantity: validatedQuantity <= 0 ? 0 : validatedQuantity,
      },
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
    
    // Get or create customer record
    const customerId = await getOrCreateCustomer(user, tenant.id);
    
    const product_id = searchParams.get('product_id');
    const variant_id = searchParams.get('variant_id');

    if (!product_id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Find and delete cart item
    const cartItem = await prisma.cart_items.findFirst({
      where: {
        tenant_id: tenant.id,
        user_id: customerId,
        product_id,
        variant_id: variant_id || null,
      },
    });

    if (cartItem) {
      await prisma.cart_items.delete({
        where: { id: cartItem.id },
      });
    }

    // Return minimal response - client already has optimistic updates
    // This avoids expensive full cart refetch
    return NextResponse.json({
      success: true,
      message: 'Item removed successfully',
      removed: {
        product_id,
        variant_id: variant_id || null,
      },
    });
  } catch (error: any) {
    console.error('Error removing from cart:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove item from cart' },
      { status: error.status || 500 }
    );
  }
}

