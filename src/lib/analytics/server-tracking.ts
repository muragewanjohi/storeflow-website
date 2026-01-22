/**
 * Server-Side Analytics Tracking
 * 
 * Utilities for tracking analytics events from server-side code
 */

import { getSessionId } from './tracking';

/**
 * Track add to cart event (server-side)
 * Called from API routes
 */
export async function trackAddToCart(tenantId: string, sessionId: string, productId: string, quantity: number) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/analytics/track/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        eventName: 'add_to_cart',
        eventCategory: 'ecommerce',
        eventLabel: 'Product Added to Cart',
        eventValue: quantity,
        productId,
        metadata: {
          quantity,
          timestamp: new Date().toISOString(),
        },
      }),
    });
  } catch (error) {
    // Silently fail - analytics tracking should not break core functionality
    console.error('Error tracking add to cart:', error);
  }
}
