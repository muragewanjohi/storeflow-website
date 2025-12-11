/**
 * Location-based pricing utilities
 * 
 * Detects user location and returns appropriate currency and pricing
 */

export interface PricingInfo {
  currency: 'KES' | 'USD';
  currencySymbol: 'Ksh' | '$';
  isKenya: boolean;
}

/**
 * Detect if user is in Kenya based on request headers
 * Checks Vercel geo headers, Cloudflare headers, or Accept-Language
 */
export function detectUserLocation(headers: Headers): PricingInfo {
  // Check Vercel geo header (x-vercel-ip-country)
  const vercelCountry = headers.get('x-vercel-ip-country');
  if (vercelCountry) {
    return {
      currency: vercelCountry === 'KE' ? 'KES' : 'USD',
      currencySymbol: vercelCountry === 'KE' ? 'Ksh' : '$',
      isKenya: vercelCountry === 'KE',
    };
  }

  // Check Cloudflare geo header (cf-ipcountry)
  const cloudflareCountry = headers.get('cf-ipcountry');
  if (cloudflareCountry) {
    return {
      currency: cloudflareCountry === 'KE' ? 'KES' : 'USD',
      currencySymbol: cloudflareCountry === 'KE' ? 'Ksh' : '$',
      isKenya: cloudflareCountry === 'KE',
    };
  }

  // Check Accept-Language header as fallback
  const acceptLanguage = headers.get('accept-language');
  if (acceptLanguage) {
    // Check if language includes Swahili or timezone hints for Kenya
    const isKenya = acceptLanguage.includes('sw-KE') || 
                    acceptLanguage.includes('en-KE') ||
                    acceptLanguage.toLowerCase().includes('kenya');
    
    return {
      currency: isKenya ? 'KES' : 'USD',
      currencySymbol: isKenya ? 'Ksh' : '$',
      isKenya,
    };
  }

  // Default to USD
  return {
    currency: 'USD',
    currencySymbol: '$',
    isKenya: false,
  };
}

/**
 * Convert USD price to KES price
 * Basic: $10 -> Ksh 1,000
 * Pro: $30 -> Ksh 3,000
 */
export function getLocalizedPrice(planName: string, isKenya: boolean): number {
  if (!isKenya) {
    // USD prices
    if (planName.toLowerCase().includes('basic')) {
      return 10;
    } else if (planName.toLowerCase().includes('pro')) {
      return 30;
    }
    return 0;
  } else {
    // KES prices
    if (planName.toLowerCase().includes('basic')) {
      return 1000;
    } else if (planName.toLowerCase().includes('pro')) {
      return 3000;
    }
    return 0;
  }
}

/**
 * Format price with currency symbol
 */
export function formatPrice(price: number, currencySymbol: 'Ksh' | '$'): string {
  if (currencySymbol === 'Ksh') {
    return `Ksh ${price.toLocaleString('en-KE')}`;
  }
  return `${currencySymbol}${price.toFixed(2)}`;
}

