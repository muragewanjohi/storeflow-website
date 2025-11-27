'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CurrencySettings {
  code: string;
  symbol: string;
  symbolPosition: 'left' | 'right';
  thousandSeparator: string;
  decimalSeparator: string;
  decimalPlaces: number;
}

const DEFAULT_CURRENCY: CurrencySettings = {
  code: 'USD',
  symbol: '$',
  symbolPosition: 'left',
  thousandSeparator: ',',
  decimalSeparator: '.',
  decimalPlaces: 2,
};

interface CurrencyContextType {
  currency: CurrencySettings;
  formatCurrency: (amount: number) => string;
  formatPrice: (amount: number, showSymbol?: boolean) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencySettings>(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCurrencySettings() {
      try {
        const response = await fetch('/api/settings/currency');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.currency) {
            setCurrency({
              code: data.currency.code || DEFAULT_CURRENCY.code,
              symbol: data.currency.symbol || DEFAULT_CURRENCY.symbol,
              symbolPosition: data.currency.symbolPosition || DEFAULT_CURRENCY.symbolPosition,
              thousandSeparator: data.currency.thousandSeparator || DEFAULT_CURRENCY.thousandSeparator,
              decimalSeparator: data.currency.decimalSeparator || DEFAULT_CURRENCY.decimalSeparator,
              decimalPlaces: data.currency.decimalPlaces ?? DEFAULT_CURRENCY.decimalPlaces,
            });
          }
        }
      } catch (error) {
        console.error('Failed to load currency settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCurrencySettings();
  }, []);

  const formatPrice = (amount: number, showSymbol = true): string => {
    const absAmount = Math.abs(amount);
    const isNegative = amount < 0;
    
    // Format the number
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
    
    if (!showSymbol) {
      return formattedNumber;
    }
    
    // Add symbol
    if (currency.symbolPosition === 'left') {
      return currency.symbol + formattedNumber;
    } else {
      return formattedNumber + currency.symbol;
    }
  };

  const formatCurrency = (amount: number): string => {
    return formatPrice(amount, true);
  };

  return (
    <CurrencyContext.Provider value={{ currency, formatCurrency, formatPrice, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    // Return default values if used outside provider (for SSR or edge cases)
    return {
      currency: DEFAULT_CURRENCY,
      formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
      formatPrice: (amount: number) => `$${amount.toFixed(2)}`,
      isLoading: false,
    };
  }
  return context;
}

// Server-side utility for formatting currency (requires settings to be passed)
export function formatCurrencyServer(
  amount: number,
  settings: Partial<CurrencySettings> = {}
): string {
  const currency = { ...DEFAULT_CURRENCY, ...settings };
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
  } else {
    return formattedNumber + currency.symbol;
  }
}

