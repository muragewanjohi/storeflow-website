'use client';

/**
 * Generic filterable/searchable single-select dropdown — a Popover + search
 * Input + button list, extracted from @/components/address/country-select.tsx
 * so it can be reused anywhere a plain <Select> isn't enough because the
 * option list is long enough to want search (e.g. register/page.tsx's
 * Business Type and Category fields — user-requested: "let's go back to
 * drop down, user selects business type and category... let both of them
 * be filterable").
 */

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type FilterableSelectOption = Readonly<{
  value: string;
  label: string;
  description?: string;
}>;

export type FilterableSelectProps = Readonly<{
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}>;

function matchesSearch(option: FilterableSelectOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.label.toLowerCase().includes(q) ||
    (option.description?.toLowerCase().includes(q) ?? false)
  );
}

export function FilterableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  required = false,
  disabled = false,
  className,
  triggerClassName,
  ...ariaProps
}: FilterableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((option) => matchesSearch(option, search));
  }, [options, search]);

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
          aria-invalid={ariaProps['aria-invalid']}
          aria-describedby={ariaProps['aria-describedby']}
          disabled={disabled || options.length === 0}
          className={cn(
            'h-[60px] w-full justify-between rounded-2xl border-[#e5e7eb] bg-[#f9fafb] font-normal',
            !selected && 'text-muted-foreground',
            className,
            triggerClassName,
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
            aria-label={searchPlaceholder}
          />
        </div>
        <div className="max-h-[min(320px,50vh)] overflow-y-auto p-1">
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    isSelected && 'bg-accent/60',
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check className={cn('mt-0.5 h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-[#6a7282]">{option.description}</span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
