/**
 * Server-side currency settings
 * Used by storefront pages (e.g. sale page) to pass tenant currency on first paint
 */

import { prisma } from '@/lib/prisma/client';
import { cache } from '@/lib/cache/simple-cache';
import type { CurrencySettings } from './currency-context';

const DEFAULT_CURRENCY: CurrencySettings = {
  code: 'USD',
  symbol: '$',
  symbolPosition: 'left',
  thousandSeparator: ',',
  decimalSeparator: '.',
  decimalPlaces: 2,
};

/**
 * Get currency settings for a tenant (server-only).
 * Uses same logic and cache as /api/settings/currency.
 */
export async function getCurrencyForTenant(tenantId: string): Promise<CurrencySettings> {
  const cacheKey = `${tenantId}:currency`;
  const cached = cache.get<CurrencySettings>(cacheKey);
  if (cached) {
    return cached;
  }

  const options = await prisma.static_options.findMany({
    where: {
      tenant_id: tenantId,
      option_name: {
        in: [
          'currency_code',
          'currency_symbol',
          'currency_symbol_position',
          'currency_thousand_separator',
          'currency_decimal_separator',
          'currency_decimal_places',
        ],
      },
    },
  });

  const optionsMap: Record<string, string | null> = {};
  for (const opt of options) {
    optionsMap[opt.option_name] = opt.option_value;
  }

  const currency: CurrencySettings = {
    code: optionsMap.currency_code || DEFAULT_CURRENCY.code,
    symbol: optionsMap.currency_symbol || DEFAULT_CURRENCY.symbol,
    symbolPosition: (optionsMap.currency_symbol_position as 'left' | 'right') || DEFAULT_CURRENCY.symbolPosition,
    thousandSeparator: optionsMap.currency_thousand_separator ?? DEFAULT_CURRENCY.thousandSeparator,
    decimalSeparator: optionsMap.currency_decimal_separator ?? DEFAULT_CURRENCY.decimalSeparator,
    decimalPlaces: optionsMap.currency_decimal_places
      ? parseInt(optionsMap.currency_decimal_places, 10)
      : DEFAULT_CURRENCY.decimalPlaces,
  };

  cache.set(cacheKey, currency, 300);
  return currency;
}
