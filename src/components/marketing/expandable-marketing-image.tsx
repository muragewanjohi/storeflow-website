'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';

type ExpandableMarketingImageProps = Readonly<{
  src: string;
  alt: string;
  dialogTitle: string;
  children: ReactNode;
  buttonClassName?: string;
  fullWidth?: number;
  fullHeight?: number;
}>;

export function ExpandableMarketingImage({
  src,
  alt,
  dialogTitle,
  children,
  buttonClassName,
  fullWidth = 800,
  fullHeight = 3600,
}: ExpandableMarketingImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View full size: ${dialogTitle}`}
        className={cn(
          'cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B33B7] focus-visible:ring-offset-2',
          buttonClassName,
        )}
      >
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[95vh] w-[min(96vw,900px)] max-w-[900px] overflow-y-auto border-none bg-white/95 p-3 sm:p-4">
          <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
          <Image
            src={src}
            alt={alt}
            width={fullWidth}
            height={fullHeight}
            className="h-auto w-full rounded-lg"
            unoptimized
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
