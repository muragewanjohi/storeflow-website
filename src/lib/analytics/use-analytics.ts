/**
 * Analytics Hook
 * 
 * React hook for tracking analytics events
 */

import { useCallback } from 'react';
import { trackEvent } from './tracking';

/**
 * Hook to track analytics events
 */
export function useAnalytics() {
  const track = useCallback(async (
    eventName: string,
    data?: {
      eventCategory?: string;
      eventLabel?: string;
      eventValue?: number;
      productId?: string;
      orderId?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    await trackEvent({
      eventName,
      eventCategory: data?.eventCategory,
      eventLabel: data?.eventLabel,
      eventValue: data?.eventValue,
      productId: data?.productId,
      orderId: data?.orderId,
      metadata: data?.metadata,
    });
  }, []);

  return { track };
}
