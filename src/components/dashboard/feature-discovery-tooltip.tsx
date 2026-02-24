'use client';

import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface FeatureDiscoveryTooltipProps {
  featureKey: string;
  title: string;
  description: string;
}

export default function FeatureDiscoveryTooltip({
  featureKey,
  title,
  description,
}: Readonly<FeatureDiscoveryTooltipProps>) {
  const storageKey = `feature-discovery:${featureKey}`;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const seen = window.localStorage.getItem(storageKey) === '1';
      if (!seen) {
        setOpen(true);
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  const dismiss = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      try {
        window.localStorage.setItem(storageKey, '1');
      } catch {
        // ignore storage errors
      }
    }
  };

  if (!mounted) return null;

  return (
    <Popover open={open} onOpenChange={dismiss}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 hover:bg-emerald-200 transition-colors"
          aria-label={`New feature: ${title}`}
        >
          New
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </PopoverContent>
    </Popover>
  );
}
