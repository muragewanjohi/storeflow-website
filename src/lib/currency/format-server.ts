export interface CurrencySettings {
  code: string;
  symbol: string;
  symbolPosition: 'left' | 'right';
  thousandSeparator: string;
  decimalSeparator: string;
  decimalPlaces: number;
}

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  code: 'USD',
  symbol: '$',
  symbolPosition: 'left',
  thousandSeparator: ',',
  decimalSeparator: '.',
  decimalPlaces: 2,
};

/**
 * Server-safe currency formatter.
 * Keep this in a non-client module so API routes and server code can import it.
 */
export function formatCurrencyServer(
  amount: number,
  settings: Partial<CurrencySettings> = {},
): string {
  const currency = { ...DEFAULT_CURRENCY_SETTINGS, ...settings };
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;

  const parts = absAmount.toFixed(currency.decimalPlaces).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandSeparator);
  const decimalPart = parts[1] || '';

  let formattedNumber = integerPart;
  if (currency.decimalPlaces > 0 && decimalPart) {
    formattedNumber += currency.decimalSeparator + decimalPart;
  }

  if (isNegative) {
    formattedNumber = '-' + formattedNumber;
  }

  if (currency.symbolPosition === 'left') {
    return currency.symbol + formattedNumber;
  }
  return formattedNumber + currency.symbol;
}

