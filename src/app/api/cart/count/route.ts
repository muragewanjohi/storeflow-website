/**
 * Cart Count API Route
 * 
 * Lightweight endpoint that only returns cart item count
 * Much faster than fetching full cart data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getSessionId } from '@/lib/cart/session';

/**
 * GET /api/cart/count - Get cart item count only
 * 
 * Lightweight endpoint optimized for performance:
 * - Works without authentication (returns 0 for guests)
 * - Uses aggregate query (no joins)
 * - Returns minimal response
 * - Cache-friendly headers
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
      // Only get customer ID, don't create if doesn't exist (faster)
      const customer = await prisma.customers.findFirst({
        where: {
          tenant_id: tenant.id,
          email: user.email,
        },
        select: {
          id: true,
        },
      });
      customerId = customer?.id || null;
      
      // If no customer found, return 0 (don't create customer just for cart count)
      if (!customerId) {
        const response = NextResponse.json({
          success: true,
          count: 0,
        });
        response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
        return response;
      }
    } else {
      // Guest user - use session ID
      sessionId = await getSessionId();
      if (!sessionId) {
        // No session ID means empty cart
        const response = NextResponse.json({
          success: true,
          count: 0,
        });
        response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
        return response;
      }
    }
    
    // Only count cart items - much faster than fetching full cart
    // Aggregate query is optimized and doesn't need joins
    const count = await prisma.cart_items.aggregate({
      where: {
        tenant_id: tenant.id,
        ...(customerId ? { user_id: customerId } : { session_id: sessionId }),
      },
      _sum: {
        quantity: true,
      },
    });

    const itemCount = count._sum.quantity || 0;

    const response = NextResponse.json({
      success: true,
      count: itemCount,
    });
    
    // Cache for 10 seconds - cart count doesn't need to be real-time
    // stale-while-revalidate allows serving stale data while revalidating
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    
    return response;
  } catch (error: any) {
    console.error('Error fetching cart count:', error);
    // Return 0 on any error to prevent UI issues
    const response = NextResponse.json({
      success: true,
      count: 0,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=5');
    return response;
  }
}

