/**
 * Location-based pricing utilities
 * 
 * Detects user location and returns appropriate currency and pricing
 */

export interface PricingInfo {
  currency: 'KES' | 'USD';
  currencySymbol: 'Ksh' | '$';
  isKenya: boolean;
  countryCode?: string; // ISO 3166-1 alpha-2 country code (e.g., "KE", "US")
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
      countryCode: vercelCountry,
    };
  }

  // Check Cloudflare geo header (cf-ipcountry)
  const cloudflareCountry = headers.get('cf-ipcountry');
  if (cloudflareCountry) {
    return {
      currency: cloudflareCountry === 'KE' ? 'KES' : 'USD',
      currencySymbol: cloudflareCountry === 'KE' ? 'Ksh' : '$',
      isKenya: cloudflareCountry === 'KE',
      countryCode: cloudflareCountry,
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
      countryCode: isKenya ? 'KE' : 'US',
    };
  }

  // Default to USD
  return {
    currency: 'USD',
    currencySymbol: '$',
    isKenya: false,
    countryCode: 'US',
  };
}

/**
 * Get localized price based on plan name and location
 * For Kenya: Fixed KES prices (no conversion)
 * For others: USD prices
 */
export function getLocalizedPrice(planName: string, isKenya: boolean, usdPrice?: number): number {
  if (!isKenya) {
    // Return USD prices as-is
    if (usdPrice !== undefined) {
      return usdPrice;
    }
    // Fallback to hardcoded USD prices
    if (planName.toLowerCase().includes('basic')) {
      return 10;
    } else if (planName.toLowerCase().includes('pro') || planName.toLowerCase().includes('standard')) {
      return 30;
    } else if (planName.toLowerCase().includes('premium')) {
      return 60;
    }
    return 0;
  } else {
    // Fixed KES prices for Kenya (no conversion)
    if (planName.toLowerCase().includes('basic')) {
      return 1000; // KES 1,000
    } else if (planName.toLowerCase().includes('pro') || planName.toLowerCase().includes('standard')) {
      return 3000; // KES 3,000
    } else if (planName.toLowerCase().includes('premium')) {
      return 6000; // KES 6,000
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

