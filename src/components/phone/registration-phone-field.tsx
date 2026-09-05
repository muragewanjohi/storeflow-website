'use client';

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getRegistrationCountrySelectOptions } from '@/lib/phone/country-options';
import type { CountryCode } from '@/lib/phone/parse';

export type RegistrationPhoneFieldProps = Readonly<{
  countryCode: string;
  nationalNumber: string;
  onCountryCodeChange: (code: string) => void;
  onNationalNumberChange: (value: string) => void;
  onNationalBlur?: () => void;
  error?: string | null;
  disabled?: boolean;
  idPrefix?: string;
  /** When true, the number input is required (HTML + copy). Default true. */
  required?: boolean;
  /** Overrides default "Store phone number" label */
  label?: string;
  /** Overrides default helper text under the label */
  description?: string;
}>;

/**
 * Country (ISO2) + local/international phone; validation is done by the parent (same rules as server via libphonenumber).
 */
export function RegistrationPhoneField({
  countryCode,
  nationalNumber,
  onCountryCodeChange,
  onNationalNumberChange,
  onNationalBlur,
  error,
  disabled,
  idPrefix = 'admin-phone',
  required = true,
  label = 'Store phone number',
  description = 'Receive SMS alerts when customers place orders so you never miss a sale. You can add or change this anytime in settings.',
}: RegistrationPhoneFieldProps) {
  const options = useMemo(() => getRegistrationCountrySelectOptions(), []);
  const cc = (countryCode || 'KE') as CountryCode;

  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-country`} className="text-sm font-bold text-[#101828]">
        {label}
      </Label>
      <p className="text-xs text-[#6a7282]">{description}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <Select
          value={countryCode || 'KE'}
          onValueChange={onCountryCodeChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={`${idPrefix}-country`}
            className="h-[56px] w-full rounded-2xl border-[#e5e7eb] bg-[#f9fafb] sm:max-w-[200px]"
            aria-label="Country"
          >
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent className="max-h-[min(320px,70vh)]">
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={`${idPrefix}-national`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={nationalNumber}
          onChange={(e) => onNationalNumberChange(e.target.value)}
          onBlur={() => onNationalBlur?.()}
          disabled={disabled}
          placeholder={cc === 'KE' ? '712 345 678' : 'Local number'}
          required={required}
          className={`h-[56px] flex-1 rounded-2xl border-[#e5e7eb] bg-[#f9fafb] ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${idPrefix}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${idPrefix}-error`} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
