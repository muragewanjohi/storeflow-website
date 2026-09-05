/**
 * Comprehensive country-to-currency mapping
 *
 * Maps ISO 3166-1 alpha-2 country codes to their default currency settings.
 * Used to auto-set store currency during registration based on detected location.
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  symbolPosition: 'left' | 'right';
  thousandSeparator: string;
  decimalSeparator: string;
  decimalPlaces: number;
}

/**
 * Map of country codes to their default currency.
 * Covers all major economies and African markets.
 */
const COUNTRY_CURRENCY_MAP: Record<string, CurrencyInfo> = {
  // --- Africa ---
  KE: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  NG: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  ZA: { code: 'ZAR', symbol: 'R', name: 'South African Rand', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  GH: { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  UG: { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 0 },
  TZ: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 0 },
  ET: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  RW: { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 0 },
  EG: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  MA: { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  SN: { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 0 },
  CI: { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 0 },
  CM: { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 0 },
  CD: { code: 'CDF', symbol: 'FC', name: 'Congolese Franc', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  AO: { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  MZ: { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  ZM: { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  ZW: { code: 'ZWL', symbol: 'Z$', name: 'Zimbabwean Dollar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  BW: { code: 'BWP', symbol: 'P', name: 'Botswana Pula', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  MW: { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  SD: { code: 'SDG', symbol: 'SDG', name: 'Sudanese Pound', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  TN: { code: 'TND', symbol: 'DT', name: 'Tunisian Dinar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 3 },
  DZ: { code: 'DZD', symbol: 'DA', name: 'Algerian Dinar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  LY: { code: 'LYD', symbol: 'LD', name: 'Libyan Dinar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 3 },

  // --- Americas ---
  US: { code: 'USD', symbol: '$', name: 'US Dollar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  CA: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  MX: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  BR: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', symbolPosition: 'left', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  AR: { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', symbolPosition: 'left', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  CO: { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', symbolPosition: 'left', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 0 },
  CL: { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso', symbolPosition: 'left', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 0 },
  PE: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  JM: { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  TT: { code: 'TTD', symbol: 'TT$', name: 'Trinidad Dollar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },

  // --- Europe ---
  GB: { code: 'GBP', symbol: '£', name: 'British Pound', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  DE: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'right', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  FR: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'right', thousandSeparator: ' ', decimalSeparator: ',', decimalPlaces: 2 },
  IT: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'right', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  ES: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'right', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  NL: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'left', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  BE: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'left', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  AT: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'left', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  PT: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'right', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  IE: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  FI: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'right', thousandSeparator: ' ', decimalSeparator: ',', decimalPlaces: 2 },
  GR: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'right', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  CH: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', symbolPosition: 'left', thousandSeparator: "'", decimalSeparator: '.', decimalPlaces: 2 },
  SE: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', symbolPosition: 'right', thousandSeparator: ' ', decimalSeparator: ',', decimalPlaces: 2 },
  NO: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', symbolPosition: 'left', thousandSeparator: ' ', decimalSeparator: ',', decimalPlaces: 2 },
  DK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', symbolPosition: 'right', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  PL: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', symbolPosition: 'right', thousandSeparator: ' ', decimalSeparator: ',', decimalPlaces: 2 },
  CZ: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', symbolPosition: 'right', thousandSeparator: ' ', decimalSeparator: ',', decimalPlaces: 2 },
  HU: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', symbolPosition: 'right', thousandSeparator: ' ', decimalSeparator: ',', decimalPlaces: 0 },
  RO: { code: 'RON', symbol: 'lei', name: 'Romanian Leu', symbolPosition: 'right', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  BG: { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', symbolPosition: 'right', thousandSeparator: ' ', decimalSeparator: ',', decimalPlaces: 2 },
  HR: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'right', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },
  RU: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', symbolPosition: 'right', thousandSeparator: ' ', decimalSeparator: ',', decimalPlaces: 2 },
  UA: { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', symbolPosition: 'right', thousandSeparator: ' ', decimalSeparator: ',', decimalPlaces: 2 },
  TR: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', symbolPosition: 'left', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 2 },

  // --- Asia & Oceania ---
  IN: { code: 'INR', symbol: '₹', name: 'Indian Rupee', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  CN: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  JP: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 0 },
  KR: { code: 'KRW', symbol: '₩', name: 'South Korean Won', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 0 },
  AU: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  NZ: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  SG: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  HK: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  TW: { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 0 },
  MY: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  TH: { code: 'THB', symbol: '฿', name: 'Thai Baht', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  PH: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  ID: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', symbolPosition: 'left', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 0 },
  VN: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', symbolPosition: 'right', thousandSeparator: '.', decimalSeparator: ',', decimalPlaces: 0 },
  PK: { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  BD: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  LK: { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  NP: { code: 'NPR', symbol: 'Rs', name: 'Nepalese Rupee', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },

  // --- Middle East ---
  AE: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  SA: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  QA: { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  KW: { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 3 },
  BH: { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 3 },
  OM: { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 3 },
  IL: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 2 },
  JO: { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', symbolPosition: 'left', thousandSeparator: ',', decimalSeparator: '.', decimalPlaces: 3 },
};

/**
 * Default currency info (USD) used when country is not recognized
 */
const DEFAULT_CURRENCY: CurrencyInfo = {
  code: 'USD',
  symbol: '$',
  name: 'US Dollar',
  symbolPosition: 'left',
  thousandSeparator: ',',
  decimalSeparator: '.',
  decimalPlaces: 2,
};

/**
 * Get currency information for a given ISO 3166-1 alpha-2 country code.
 * Falls back to USD if the country is not in the mapping.
 */
export function getCurrencyForCountry(countryCode: string | null | undefined): CurrencyInfo {
  if (!countryCode) {
    return DEFAULT_CURRENCY;
  }
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || DEFAULT_CURRENCY;
}
