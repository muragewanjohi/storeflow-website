/**
 * Subscription pricing utilities
 * 
 * Handles retrieving and formatting subscription prices with currency
 */

import { getLocalizedPrice } from '@/lib/pricing/location';

export interface SubscriptionPricing {
  price: number;
  currency: 'KES' | 'USD';
  currencySymbol: 'Ksh' | '$';
  planName: string;
}

/**
 * Get subscription pricing for a tenant
 * Uses stored pricing from tenant.data.subscription if available,
 * otherwise calculates based on plan name and location
 */
export function getTenantSubscriptionPricing(
  tenant: {
    plan_id: string | null;
    data: any;
  },
  plan: {
    name: string;
    price: any; // Prisma Decimal
  } | null,
  isKenya: boolean = false
): SubscriptionPricing | null {
  if (!tenant.plan_id || !plan) {
    return null;
  }

  // Check if tenant has stored subscription pricing
  const storedSubscription = tenant.data?.subscription;
  if (storedSubscription && storedSubscription.price && storedSubscription.currency) {
    return {
      price: storedSubscription.price,
      currency: storedSubscription.currency,
      currencySymbol: storedSubscription.currencySymbol || (storedSubscription.currency === 'KES' ? 'Ksh' : '$'),
      planName: storedSubscription.planName || plan.name,
    };
  }

  // Fallback: Calculate based on plan name and location
  const localizedPrice = getLocalizedPrice(plan.name, isKenya);
  return {
    price: localizedPrice,
    currency: isKenya ? 'KES' : 'USD',
    currencySymbol: isKenya ? 'Ksh' : '$',
    planName: plan.name,
  };
}

/**
 * Format subscription price with currency
 */
export function formatSubscriptionPrice(pricing: SubscriptionPricing | null): string {
  if (!pricing) {
    return 'N/A';
  }

  if (pricing.currencySymbol === 'Ksh') {
    return `Ksh ${pricing.price.toLocaleString('en-KE')}`;
  }
  return `${pricing.currencySymbol}${pricing.price.toFixed(2)}`;
}

