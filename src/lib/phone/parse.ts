import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  getCountries,
} from 'libphonenumber-js/max';
import type { CountryCode } from 'libphonenumber-js/max';

export type { CountryCode };

export function isKnownCountryCode(code: string): code is CountryCode {
  return getCountries().includes(code as CountryCode);
}

/**
 * Validates and returns E.164 digits only (no +), suitable for SMS gateways (e.g. Ujumbe).
 */
export function parseToE164Digits(
  input: string | null | undefined,
  defaultCountry: CountryCode
): string | null {
  if (input == null || !String(input).trim()) return null;
  const trimmed = String(input).trim();
  const parsed = trimmed.startsWith('+')
    ? parsePhoneNumberFromString(trimmed)
    : parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed?.isValid()) return null;
  return parsed.number.replace(/\D/g, '');
}

/** Client + server: quick validity check for a national/international string */
export function isPhoneValidForCountry(input: string, defaultCountry: CountryCode): boolean {
  if (!input?.trim()) return false;
  const trimmed = input.trim();
  try {
    return trimmed.startsWith('+')
      ? isValidPhoneNumber(trimmed)
      : isValidPhoneNumber(trimmed, defaultCountry);
  } catch {
    return false;
  }
}

/**
 * Used when `tenant.country` + raw phone from settings may be local or international.
 * Also accepts stored E.164 digit strings (no +) from the server.
 */
/**
 * Load a phone from static_options for editing (country + national digits).
 * Accepts legacy national input, full E.164 digits, or international with +.
 */
/** True if empty, or a plausible E.164 digit string (no +) for SMS gateways. */
export function isValidE164DigitsString(s: string | null | undefined): boolean {
  if (s == null || !String(s).trim()) return true;
  const d = String(s).replace(/\D/g, '');
  if (d.length < 8 || d.length > 15) return false;
  return Boolean(parsePhoneNumberFromString(`+${d}`)?.isValid());
}

export function parseStoredPhoneToParts(
  stored: string | null | undefined,
  fallbackCountry: CountryCode
): { country: CountryCode; national: string } {
  if (!stored?.trim()) {
    return { country: fallbackCountry, national: '' };
  }
  const t = stored.trim();
  const digitsOnly = t.replace(/\D/g, '');
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    const intl = parsePhoneNumberFromString(`+${digitsOnly}`);
    if (intl?.isValid()) {
      return {
        country: (intl.country ?? fallbackCountry) as CountryCode,
        national: String(intl.nationalNumber ?? ''),
      };
    }
  }
  const e164 = parseToE164Digits(t, fallbackCountry);
  if (e164) {
    const intl = parsePhoneNumberFromString(`+${e164}`);
    if (intl?.isValid()) {
      return {
        country: (intl.country ?? fallbackCountry) as CountryCode,
        national: String(intl.nationalNumber ?? ''),
      };
    }
  }
  return { country: fallbackCountry, national: t };
}

export function resolvePhoneForSms(
  countryIso2: string | null | undefined,
  raw: string | null | undefined
): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 15) {
    const intl = parsePhoneNumberFromString(`+${digits}`);
    if (intl?.isValid()) {
      return intl.number.replace(/\D/g, '');
    }
  }
  const cc = (
    countryIso2 && isKnownCountryCode(countryIso2.toUpperCase())
      ? countryIso2.toUpperCase()
      : 'KE'
  ) as CountryCode;
  return parseToE164Digits(trimmed, cc);
}
