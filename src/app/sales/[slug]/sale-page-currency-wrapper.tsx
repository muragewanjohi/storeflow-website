'use client';

import { CurrencyProvider } from '@/lib/currency/currency-context';
import type { CurrencySettings } from '@/lib/currency/currency-context';

/**
 * Wraps sale page content in CurrencyProvider with server-fetched currency
 * so prices show in the tenant's selected currency on first paint.
 */
export default function SalePageCurrencyWrapper({
  initialCurrency,
  children,
}: {
  initialCurrency: CurrencySettings | null;
  children: React.ReactNode;
}) {
  return (
    <CurrencyProvider initialCurrency={initialCurrency}>
      {children}
    </CurrencyProvider>
  );
}
