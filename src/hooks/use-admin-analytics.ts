/**
 * Admin Analytics Hook
 * 
 * Provides tracking functions for admin dashboard pages
 */

'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { trackAdminPageView, trackAdminAction, trackAdminInsight, isGAAvailable } from '@/lib/analytics/google-analytics';
import { type AuthUser } from '@/lib/auth/types';

interface UseAdminAnalyticsOptions {
  user?: AuthUser;
  pageName?: string;
  trackOnMount?: boolean;
}

export function useAdminAnalytics(options: UseAdminAnalyticsOptions = {}) {
  const { user, pageName, trackOnMount = true } = options;
  const pathname = usePathname();
  const [gaReady, setGaReady] = useState(false);

  // Wait for GA to be available
  useEffect(() => {
    const checkGA = () => {
      if (isGAAvailable()) {
        setGaReady(true);
        return;
      }
      // Retry after a short delay
      setTimeout(checkGA, 500);
    };

    // Start checking after initial render
    const timer = setTimeout(checkGA, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!trackOnMount || !gaReady) return;

    const page = pageName || pathname.replace('/admin', '') || '/dashboard';
    
    // Small delay to ensure everything is ready
    const timer = setTimeout(() => {
      trackAdminPageView(page, user?.id);
    }, 200);

    return () => clearTimeout(timer);
  }, [pathname, pageName, user?.id, trackOnMount, gaReady]);

  return {
    trackAction: (action: string, category?: string, label?: string, value?: number) => {
      trackAdminAction(action, category, label, value);
    },
    trackInsight: (insightType: string, data?: Record<string, unknown>) => {
      trackAdminInsight(insightType, data);
    },
    trackPageView: (page?: string) => {
      const pageToTrack = page || pageName || pathname.replace('/admin', '') || '/dashboard';
      trackAdminPageView(pageToTrack, user?.id);
    },
  };
}

