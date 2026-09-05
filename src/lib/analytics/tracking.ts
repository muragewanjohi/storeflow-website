/**
 * Analytics Tracking Utilities
 * 
 * Client-side utilities for tracking page views, events, and sessions
 */

/**
 * Generate or retrieve session ID
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  const storageKey = 'analytics_session_id';
  const sessionExpiry = 30 * 60 * 1000; // 30 minutes
  
  let sessionId = sessionStorage.getItem(storageKey);
  let sessionTimestamp = sessionStorage.getItem(`${storageKey}_timestamp`);
  
  // Check if session expired
  if (sessionId && sessionTimestamp) {
    const timestamp = parseInt(sessionTimestamp, 10);
    const now = Date.now();
    
    if (now - timestamp > sessionExpiry) {
      // Session expired, create new one
      sessionId = null;
    }
  }
  
  // Create new session if needed
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(storageKey, sessionId);
    sessionStorage.setItem(`${storageKey}_timestamp`, Date.now().toString());
  }
  
  return sessionId;
}

/**
 * Parse UTM parameters from URL
 */
export function parseUTMParams(): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
} {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const utm: any = {};
  
  if (params.get('utm_source')) utm.utm_source = params.get('utm_source')!;
  if (params.get('utm_medium')) utm.utm_medium = params.get('utm_medium')!;
  if (params.get('utm_campaign')) utm.utm_campaign = params.get('utm_campaign')!;
  if (params.get('utm_term')) utm.utm_term = params.get('utm_term')!;
  if (params.get('utm_content')) utm.utm_content = params.get('utm_content')!;
  
  return utm;
}

/**
 * Get referrer (stored in session storage to persist across page loads)
 */
export function getReferrer(): string {
  if (typeof window === 'undefined') return '';
  
  const storageKey = 'analytics_referrer';
  let referrer = sessionStorage.getItem(storageKey);
  
  if (!referrer) {
    referrer = document.referrer || 'direct';
    sessionStorage.setItem(storageKey, referrer);
  }
  
  return referrer;
}

/**
 * Detect device type from user agent
 */
export function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  
  const ua = navigator.userAgent.toLowerCase();
  
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
    return 'mobile';
  }
  
  return 'desktop';
}

/**
 * Detect browser from user agent
 */
export function detectBrowser(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  
  return 'unknown';
}

/**
 * Detect OS from user agent
 */
export function detectOS(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  
  return 'unknown';
}

/**
 * Track page view
 */
export async function trackPageView(data: {
  pagePath: string;
  pageTitle?: string;
  productId?: string;
  categoryId?: string;
  timeOnPage?: number;
}) {
  try {
    const sessionId = getSessionId();
    const utm = parseUTMParams();
    const referrer = getReferrer();
    
    await fetch('/api/analytics/track/page-view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        pagePath: data.pagePath,
        pageTitle: data.pageTitle || document.title,
        productId: data.productId,
        categoryId: data.categoryId,
        referrer,
        timeOnPage: data.timeOnPage,
        ...utm,
      }),
    });
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
}

/**
 * Track event
 */
export async function trackEvent(data: {
  eventName: string;
  eventCategory?: string;
  eventLabel?: string;
  eventValue?: number;
  productId?: string;
  orderId?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const sessionId = getSessionId();
    
    await fetch('/api/analytics/track/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        eventName: data.eventName,
        eventCategory: data.eventCategory,
        eventLabel: data.eventLabel,
        eventValue: data.eventValue,
        productId: data.productId,
        orderId: data.orderId,
        metadata: data.metadata || {},
      }),
    });
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

/**
 * Initialize session (call on page load)
 */
export async function initializeSession() {
  try {
    const sessionId = getSessionId();
    const utm = parseUTMParams();
    const referrer = getReferrer();
    const deviceType = detectDeviceType();
    const browser = detectBrowser();
    const os = detectOS();
    
    await fetch('/api/analytics/track/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        referrer,
        deviceType,
        browser,
        os,
        ...utm,
      }),
    });
  } catch (error) {
    console.error('Error initializing session:', error);
  }
}
