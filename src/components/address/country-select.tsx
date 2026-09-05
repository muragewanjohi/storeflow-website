'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type CountryOption = Readonly<{
  id: string;
  name: string;
  code: string | null;
}>;

export type CountrySelectProps = Readonly<{
  id?: string;
  value: string;
  onChange: (countryName: string) => void;
  countries: CountryOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}>;

function formatCountryLabel(country: CountryOption): string {
  return country.code ? `${country.name} (${country.code})` : country.name;
}

function matchesCountrySearch(country: CountryOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    country.name.toLowerCase().includes(q) ||
    (country.code?.toLowerCase().includes(q) ?? false)
  );
}

function resolveSelectedCountry(
  value: string,
  countries: CountryOption[],
): CountryOption | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const exact = countries.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exact) return exact;

  const byCode = countries.find(
    (c) => c.code?.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byCode) return byCode;

  return null;
}

export function CountrySelect({
  id,
  value,
  onChange,
  countries,
  placeholder = 'Select a country',
  required = false,
  disabled = false,
  className,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = useMemo(
    () => resolveSelectedCountry(value, countries),
    [value, countries],
  );

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return countries;
    return countries.filter((country) => matchesCountrySearch(country, search));
  }, [countries, search]);

  const displayValue = selected
    ? formatCountryLabel(selected)
    : value.trim() || placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-required={required}
          disabled={disabled || countries.length === 0}
          className={cn(
            'h-9 w-full justify-between font-normal',
            !selected && !value.trim() && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <div className="border-b p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search countries..."
            autoFocus
            aria-label="Search countries"
          />
        </div>
        <div className="max-h-[min(320px,50vh)] overflow-y-auto p-1">
          {filteredCountries.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No countries found.
            </p>
          ) : (
            filteredCountries.map((country) => {
              const isSelected =
                selected?.id === country.id ||
                value.trim().toLowerCase() === country.name.toLowerCase();
              return (
                <button
                  key={country.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    isSelected && 'bg-accent/60',
                  )}
                  onClick={() => {
                    onChange(country.name);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      isSelected ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{formatCountryLabel(country)}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
