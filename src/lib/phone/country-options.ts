import { getCountries, getCountryCallingCode } from 'libphonenumber-js/max';
import type { CountryCode } from 'libphonenumber-js/max';

export type CountrySelectOption = Readonly<{
  value: CountryCode;
  label: string;
}>;

let cached: CountrySelectOption[] | null = null;

/**
 * All regions supported by libphonenumber metadata, sorted by localized name.
 * Kenya is pinned first for the current product default.
 */
export function getRegistrationCountrySelectOptions(): CountrySelectOption[] {
  if (cached) return cached;

  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const codes = getCountries() as CountryCode[];
  const list: CountrySelectOption[] = codes.map((value) => {
    const name = regionNames.of(value) || value;
    const dial = getCountryCallingCode(value);
    return {
      value,
      label: `${name} (+${dial})`,
    };
  });

  list.sort((a, b) => a.label.localeCompare(b.label, 'en'));
  const keIdx = list.findIndex((x) => x.value === 'KE');
  if (keIdx > 0) {
    const [ke] = list.splice(keIdx, 1);
    list.unshift(ke);
  }

  cached = list;
  return cached;
}
