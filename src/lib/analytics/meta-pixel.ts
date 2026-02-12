/**
 * Meta Pixel Utility
 *
 * Provides type declarations and helper for Meta (Facebook) Pixel tracking.
 */

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

/**
 * Track a custom Meta Pixel event (e.g. Purchase, AddToCart, Lead)
 */
export function trackMetaPixelEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === 'undefined' || !window.fbq) return;

  try {
    window.fbq('track', eventName, params);
    if (process.env.NODE_ENV === 'development') {
      console.log('[Meta Pixel] Event tracked:', eventName, params);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Meta Pixel] Error tracking event:', error);
    }
  }
}
