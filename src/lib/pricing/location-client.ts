/**
 * Client-side location detection utilities
 * 
 * Detects user location on the client side using browser APIs
 */

'use client';

export interface PricingInfo {
  currency: 'KES' | 'USD';
  currencySymbol: 'Ksh' | '$';
  isKenya: boolean;
  countryCode?: string; // ISO 3166-1 alpha-2 country code (e.g., "KE", "US")
}

/**
 * Detect if user is in Kenya using browser APIs
 * Uses timezone, locale, and optional IP geolocation
 */
export function detectUserLocationClient(): PricingInfo {
  // Method 1: Check timezone (most reliable for Kenya)
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone === 'Africa/Nairobi' || timezone.includes('Nairobi')) {
      return {
        currency: 'KES',
        currencySymbol: 'Ksh',
        isKenya: true,
        countryCode: 'KE',
      };
    }
  } catch (error) {
    console.error('Error detecting timezone:', error);
  }

  // Method 2: Check locale
  try {
    const locale = navigator.language || (navigator as any).userLanguage;
    if (locale.includes('KE') || locale.includes('ke-KE') || locale.includes('sw-KE')) {
      return {
        currency: 'KES',
        currencySymbol: 'Ksh',
        isKenya: true,
        countryCode: 'KE',
      };
    }
  } catch (error) {
    console.error('Error detecting locale:', error);
  }

  // Method 3: Check language preferences
  try {
    const languages = navigator.languages || [navigator.language];
    for (const lang of languages) {
      if (lang.includes('KE') || lang.toLowerCase().includes('kenya')) {
        return {
          currency: 'KES',
          currencySymbol: 'Ksh',
          isKenya: true,
          countryCode: 'KE',
        };
      }
    }
  } catch (error) {
    console.error('Error detecting languages:', error);
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
 * Detect location using IP geolocation API (fallback)
 * Uses a free IP geolocation service
 */
export async function detectLocationByIP(): Promise<PricingInfo> {
  try {
    // Use ipapi.co free tier (1000 requests/day)
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const countryCode = data.country_code;
      
      if (countryCode === 'KE') {
        return {
          currency: 'KES',
          currencySymbol: 'Ksh',
          isKenya: true,
          countryCode: 'KE',
        };
      }
      
      // Return with detected country code
      return {
        currency: 'USD',
        currencySymbol: '$',
        isKenya: false,
        countryCode: countryCode || 'US',
      };
    }
  } catch (error) {
    console.error('Error detecting location by IP:', error);
  }

  // Fallback to browser-based detection
  return detectUserLocationClient();
}

