/**
 * Location-based pricing utilities
 *
 * Plan amounts: `price_plans.price` (USD) and `price_plans.price_kes` (Kenya).
 * Managed in Admin → Price Plans.
 */

export interface PricingInfo {
  currency: 'KES' | 'USD';
  currencySymbol: 'Ksh' | '$';
  isKenya: boolean;
  countryCode?: string;
}

/** Prisma Decimal and other numeric DB types */
export type PlanPriceInput = {
  price: unknown;
  price_kes?: unknown;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof (value as { toNumber: () => number }).toNumber === 'function'
  ) {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isNaN(n) ? null : n;
  }
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** Build input for {@link resolvePlanMonthlyPrice} from a price_plans row */
export function planPriceInputFromRow(row: {
  price: unknown;
  price_kes?: unknown | null;
}): PlanPriceInput {
  return { price: row.price, price_kes: row.price_kes };
}

/**
 * Monthly charge for a plan based on tenant/visitor region.
 * Kenya uses `price_kes` when set; otherwise USD `price`.
 */
export function resolvePlanMonthlyPrice(
  plan: PlanPriceInput,
  isKenya: boolean
): number {
  const usd = toNumber(plan.price);
  if (isKenya) {
    const kes = toNumber(plan.price_kes);
    if (kes !== null) return kes;
  }
  return usd ?? 0;
}

/** ISO 3166-1 alpha-2, uppercase */
export function normalizeCountryCode(code: string | null | undefined): string | null {
  if (!code || typeof code !== 'string') return null;
  const trimmed = code.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : null;
}

export function isKenyaCountry(country: string | null | undefined): boolean {
  return normalizeCountryCode(country) === 'KE';
}

export function getPricingInfoForCountry(countryCode: string): PricingInfo {
  const normalized = normalizeCountryCode(countryCode) ?? 'US';
  const isKenya = normalized === 'KE';
  return {
    currency: isKenya ? 'KES' : 'USD',
    currencySymbol: isKenya ? 'Ksh' : '$',
    isKenya,
    countryCode: normalized,
  };
}

/**
 * Pick tenant billing country at registration (explicit choice > client geo > server geo > phone).
 */
export function resolveTenantBillingCountry(input: {
  billingCountry?: string | null;
  clientCountry?: string | null;
  geoCountry?: string | null;
  adminPhoneCountry?: string | null;
}): string {
  for (const candidate of [
    input.billingCountry,
    input.clientCountry,
    input.geoCountry,
    input.adminPhoneCountry,
  ]) {
    const normalized = normalizeCountryCode(candidate);
    if (normalized) return normalized;
  }
  return 'US';
}

export function detectUserLocation(headers: Headers): PricingInfo {
  const vercelCountry = headers.get('x-vercel-ip-country');
  if (vercelCountry) {
    return {
      currency: vercelCountry === 'KE' ? 'KES' : 'USD',
      currencySymbol: vercelCountry === 'KE' ? 'Ksh' : '$',
      isKenya: vercelCountry === 'KE',
      countryCode: vercelCountry,
    };
  }

  const cloudflareCountry = headers.get('cf-ipcountry');
  if (cloudflareCountry) {
    return {
      currency: cloudflareCountry === 'KE' ? 'KES' : 'USD',
      currencySymbol: cloudflareCountry === 'KE' ? 'Ksh' : '$',
      isKenya: cloudflareCountry === 'KE',
      countryCode: cloudflareCountry,
    };
  }

  const acceptLanguage = headers.get('accept-language');
  if (acceptLanguage) {
    const isKenya =
      acceptLanguage.includes('sw-KE') ||
      acceptLanguage.includes('en-KE') ||
      acceptLanguage.toLowerCase().includes('kenya');

    return {
      currency: isKenya ? 'KES' : 'USD',
      currencySymbol: isKenya ? 'Ksh' : '$',
      isKenya,
      countryCode: isKenya ? 'KE' : 'US',
    };
  }

  return {
    currency: 'USD',
    currencySymbol: '$',
    isKenya: false,
    countryCode: 'US',
  };
}

/**
 * @deprecated Prefer `resolvePlanMonthlyPrice({ price, price_kes }, isKenya)`.
 */
export function getLocalizedPrice(
  _planName: string,
  isKenya: boolean,
  priceUsd?: number,
  _isDemoStore?: boolean,
  priceKes?: number | null
): number {
  return resolvePlanMonthlyPrice(
    { price: priceUsd, price_kes: priceKes },
    isKenya
  );
}

export function formatPrice(price: number, currencySymbol: 'Ksh' | '$'): string {
  if (currencySymbol === 'Ksh') {
    return `Ksh ${price.toLocaleString('en-KE')}`;
  }
  return `${currencySymbol}${price.toFixed(2)}`;
}
