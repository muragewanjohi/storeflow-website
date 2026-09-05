/**
 * Google Analytics Utility
 * 
 * Provides functions for tracking page views and custom events
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * Check if Google Analytics is available
 */
export function isGAAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if gtag function exists
  if (typeof window.gtag !== 'function') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Google Analytics] gtag is not available. Make sure NEXT_PUBLIC_GA_MEASUREMENT_ID is set and the script has loaded.');
    }
    return false;
  }
  
  return true;
}

/**
 * Track a page view
 */
export function trackPageView(url: string, title?: string): void {
  if (!isGAAvailable()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Google Analytics] Cannot track page view - gtag not available:', url);
    }
    return;
  }

  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Google Analytics] NEXT_PUBLIC_GA_MEASUREMENT_ID is not set');
    }
    return;
  }

  try {
    window.gtag('config', measurementId, {
      page_path: url,
      page_title: title,
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Google Analytics] Page view tracked:', { url, title });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Google Analytics] Error tracking page view:', error);
    }
  }
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, unknown>
): void {
  if (!isGAAvailable()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Google Analytics] Cannot track event - gtag not available:', eventName);
    }
    return;
  }

  try {
    window.gtag('event', eventName, eventParams);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Google Analytics] Event tracked:', { eventName, eventParams });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Google Analytics] Error tracking event:', error);
    }
  }
}

/**
 * Track marketing funnel events in both GA and internal analytics DB.
 * This is used for landlord-facing acquisition reporting.
 */
export function trackMarketingFunnelEvent(
  eventName: string,
  eventParams?: Record<string, unknown>
): void {
  // Always attempt GA tracking first.
  trackEvent(eventName, eventParams);

  if (typeof window === 'undefined') return;

  // Persist event in analytics_tracking so landlord dashboard can query it.
  void storeAnalytics({
    pagePath: `${window.location.pathname}${window.location.search}`,
    pageTitle: document.title,
    eventName,
    eventCategory: 'marketing_funnel',
    metadata: eventParams,
  });
}

/**
 * Store analytics data in database
 */
async function storeAnalytics(data: {
  userId?: string;
  pagePath: string;
  pageTitle?: string;
  eventName?: string;
  eventCategory?: string;
  eventLabel?: string;
  eventValue?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  // Only run in browser
  if (typeof window === 'undefined') return;

  try {
    const response = await fetch('/api/admin/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok && process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] Failed to store analytics data');
    }
  } catch (error) {
    // Silently fail - analytics should not break the app
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] Error storing analytics:', error);
    }
  }
}

/**
 * Track admin dashboard page view
 */
export function trackAdminPageView(page: string, userId?: string): void {
  trackPageView(`/admin${page}`);
  trackEvent('admin_page_view', {
    page,
    user_id: userId,
    timestamp: new Date().toISOString(),
  });
  
  // Store in database
  storeAnalytics({
    userId,
    pagePath: `/admin${page}`,
    pageTitle: `Admin ${page}`,
    eventName: 'admin_page_view',
    eventCategory: 'admin',
    metadata: { page, user_id: userId },
  });
}

/**
 * Track admin dashboard action
 */
export function trackAdminAction(
  action: string,
  category: string = 'admin',
  label?: string,
  value?: number
): void {
  trackEvent('admin_action', {
    action,
    category,
    label,
    value,
  });
  
  // Store in database
  storeAnalytics({
    pagePath: window.location.pathname,
    eventName: 'admin_action',
    eventCategory: category,
    eventLabel: label || action,
    eventValue: value,
    metadata: { action, category, label },
  });
}

/**
 * Track admin dashboard insights
 */
export function trackAdminInsight(
  insightType: string,
  data?: Record<string, unknown>
): void {
  trackEvent('admin_insight', {
    insight_type: insightType,
    ...data,
    timestamp: new Date().toISOString(),
  });
  
  // Store in database
  storeAnalytics({
    pagePath: window.location.pathname,
    eventName: 'admin_insight',
    eventCategory: 'insight',
    eventLabel: insightType,
    metadata: { insight_type: insightType, ...data },
  });
}

