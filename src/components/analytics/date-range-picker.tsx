/**
 * Date Range Picker Component
 * 
 * Allows users to select a date range for analytics
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const PRESET_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year', days: 365 },
];

export default function DateRangePicker({
  value,
  onChange,
  className,
}: Readonly<DateRangePickerProps>) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetClick = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onChange({ from, to });
    setIsOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[280px] justify-start text-left font-normal',
              !value.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value.from ? (
              value.to ? (
                <>
                  {format(value.from, 'LLL dd, y')} -{' '}
                  {format(value.to, 'LLL dd, y')}
                </>
              ) : (
                format(value.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            <div className="space-y-1">
              <div className="text-sm font-medium mb-2">Quick Select</div>
              {PRESET_RANGES.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left"
                  onClick={() => handlePresetClick(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium mb-2">Custom Range</div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">From</label>
                  <input
                    type="date"
                    value={value.from ? format(value.from, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      onChange({ ...value, from: date });
                    }}
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">To</label>
                  <input
                    type="date"
                    value={value.to ? format(value.to, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      onChange({ ...value, to: date });
                      if (value.from && date) {
                        setIsOpen(false);
                      }
                    }}
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

