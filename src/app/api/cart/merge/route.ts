/**
 * Cart Merge API Route
 * 
 * Merges guest cart (session_id) with user cart (user_id) when user logs in
 * 
 * POST /api/cart/merge - Merge guest cart into user cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getOrCreateCustomer } from '@/lib/customers/get-customer';
import { getSessionId, clearSessionId } from '@/lib/cart/session';

/**
 * POST /api/cart/merge - Merge guest cart into user cart
 * 
 * This should be called after user logs in to merge their guest cart
 * with their authenticated cart
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    
    // Get customer ID
    const customerId = await getOrCreateCustomer(user, tenant.id);
    
    // Get guest session ID
    const sessionId = await getSessionId();
    
    if (!sessionId) {
      // No guest cart to merge
      return NextResponse.json({
        success: true,
        message: 'No guest cart to merge',
      });
    }
    
    // Fetch guest cart items
    const guestCartItems = await prisma.cart_items.findMany({
      where: {
        tenant_id: tenant.id,
        session_id: sessionId,
      },
    });
    
    if (guestCartItems.length === 0) {
      // No items in guest cart
      await clearSessionId();
      return NextResponse.json({
        success: true,
        message: 'No items in guest cart',
      });
    }
    
    // Fetch user's existing cart items
    const userCartItems = await prisma.cart_items.findMany({
      where: {
        tenant_id: tenant.id,
        user_id: customerId,
      },
    });
    
    // Create a map of user's existing cart items by product_id + variant_id
    const userCartMap = new Map<string, typeof userCartItems[0]>(
      userCartItems.map((item: any) => [
        `${item.product_id}-${item.variant_id || 'base'}`,
        item,
      ])
    );
    
    // Merge guest cart items into user cart
    const mergeResults = {
      merged: 0,
      updated: 0,
      skipped: 0,
    };
    
    for (const guestItem of guestCartItems) {
      const itemKey = `${guestItem.product_id}-${guestItem.variant_id || 'base'}`;
      const existingUserItem = userCartMap.get(itemKey);
      
      if (existingUserItem) {
        // Item already exists in user cart - update quantity
        await prisma.cart_items.update({
          where: { id: existingUserItem.id },
          data: {
            quantity: existingUserItem.quantity + guestItem.quantity,
            updated_at: new Date(),
          },
        });
        mergeResults.updated++;
      } else {
        // New item - transfer to user cart
        await prisma.cart_items.update({
          where: { id: guestItem.id },
          data: {
            user_id: customerId,
            session_id: null, // Remove session_id
            updated_at: new Date(),
          },
        });
        mergeResults.merged++;
      }
    }
    
    // Clear session ID after merge
    await clearSessionId();
    
    return NextResponse.json({
      success: true,
      message: 'Cart merged successfully',
      results: mergeResults,
    });
  } catch (error: any) {
    console.error('Error merging cart:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to merge cart' },
      { status: error.status || 500 }
    );
  }
}

